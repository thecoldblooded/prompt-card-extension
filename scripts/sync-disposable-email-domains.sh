#!/usr/bin/env bash
set -euo pipefail

SOURCE_URL="${DISPOSABLE_EMAIL_SOURCE_URL:-https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf}"
DB_CONTAINER="supabase-db"
CONTAINER_FILE="/tmp/promptcard-disposable-email-domains.$$"
LOCK_FILE="/var/lock/promptcard-disposable-email-sync.lock"
TEMP_DIR="$(mktemp -d)"
RAW_FILE="$TEMP_DIR/raw"
NORMALIZED_FILE="$TEMP_DIR/domains"

cleanup() {
  docker exec "$DB_CONTAINER" rm -f "$CONTAINER_FILE" >/dev/null 2>&1 || true
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Disposable-email synchronization is already running."
  exit 0
fi

curl --fail --silent --show-error --location --max-time 60 "$SOURCE_URL" --output "$RAW_FILE"

awk '
function invalid(message) {
  print "Invalid disposable-email domain list: " message > "/dev/stderr"
  exit 1
}
{
  sub(/\r$/, "")
  gsub(/^[[:space:]]+|[[:space:]]+$/, "")
  if ($0 == "") next

  domain = tolower($0)
  if (length(domain) > 253) invalid("domain exceeds 253 characters")
  if (domain !~ /^[a-z0-9.-]+$/) invalid("unsupported character in " domain)
  if (domain ~ /^\./ || domain ~ /\.$/ || domain ~ /\.\./) invalid("empty label in " domain)

  count = split(domain, labels, ".")
  if (count < 2) invalid("domain needs at least two labels: " domain)
  for (i = 1; i <= count; i++) {
    label = labels[i]
    if (length(label) > 63) invalid("label exceeds 63 characters in " domain)
    if (label !~ /^[a-z0-9]/ || label !~ /[a-z0-9]$/) invalid("label begins or ends with a hyphen in " domain)
  }

  print domain
}
' "$RAW_FILE" | LC_ALL=C sort -u > "$NORMALIZED_FILE"

DOMAIN_COUNT="$(wc -l < "$NORMALIZED_FILE" | tr -d '[:space:]')"
if (( DOMAIN_COUNT < 1000 )); then
  echo "Disposable-email domain list is suspiciously small: $DOMAIN_COUNT entries." >&2
  exit 1
fi
chmod 0644 "$NORMALIZED_FILE"

docker cp "$NORMALIZED_FILE" "$DB_CONTAINER:$CONTAINER_FILE"
docker exec -i "$DB_CONTAINER" psql -X --set=ON_ERROR_STOP=1 --username=postgres --dbname=postgres <<SQL
begin;
create temporary table disposable_email_domains_staging (
  domain text primary key
) on commit drop;
copy disposable_email_domains_staging (domain) from '$CONTAINER_FILE';
do \$\$
begin
  if (select count(*) from disposable_email_domains_staging) < 1000 then
    raise exception 'Disposable-email staging list is suspiciously small';
  end if;
end;
\$\$;
truncate public.disposable_email_domains;
insert into public.disposable_email_domains (domain, synced_at)
select domain, transaction_timestamp()
from disposable_email_domains_staging;
commit;
SQL

echo "Synchronized $DOMAIN_COUNT disposable-email domains."
