# PromptCard Google OAuth Branding Verification Implementation Plan

## Goal

Correct the three Google branding findings for **PromptCard AI - Image to Prompt**, prove ownership of the production homepage, and submit a truthful re-verification request. Google controls the final review result and timing; implementation is complete when the request is accepted for review and its resulting status is recorded.

## Implementation checklist

- [ ] Capture the current Google Auth Platform branding state before changing it
  - Open the existing Branding page for Google Cloud project `promptcard-504011`.
  - Close the findings dialog temporarily and record the current app name, homepage URL, privacy-policy URL, authorized domains, support email, developer contact email, logo status, publishing status, and verification status.
  - Open the Data Access page and record every configured OAuth scope.
  - Confirm that the Google provider is used only for authentication through the Supabase authorization flow in [`startGoogleAuth()`](../popup.js:422).
  - Treat any scope beyond basic identity as a blocker: remove it when safe or update the public disclosure before resubmission.

- [ ] Make the canonical name exact and crawler-visible on the homepage
  - In [`index.html`](../index.html:4), change the document title to include the exact name **PromptCard AI - Image to Prompt**.
  - In [`index.html`](../index.html:23), replace the shortened visible header brand with the exact canonical name while retaining the existing icon.
  - In [`index.html`](../index.html:53), identify the product explicitly as a Chrome extension in static English HTML, not only in client-rendered translations.
  - In [`index.html`](../index.html:296), replace the shortened footer brand with the exact canonical name.
  - Preserve existing navigation, animation hooks, accessibility attributes, and responsive structure.

- [ ] Add an explicit homepage purpose and Google Sign-In disclosure
  - Add a new semantic section in [`index.html`](../index.html:286), before the final call to action or immediately before the footer.
  - State that **PromptCard AI - Image to Prompt** converts images or user-selected screen regions into detailed AI prompts.
  - State that analysis occurs only after an explicit user action and may use integrated credits or a user-configured compatible AI API.
  - State that Google Sign-In authenticates the PromptCard account and supports session access, integrated credits, prompt history, and billing status.
  - State that Google Sign-In does not grant access to Gmail, Google Drive, contacts, or unrelated Google data, provided the scope review confirms that claim.
  - Add a visible link to [`privacy.html`](../privacy.html) using the production URL `https://promptcard.hopto.org/privacy.html`.
  - Keep the English disclosure in initial HTML so Google can evaluate it without running [`landing.js`](../landing.js:1).

- [ ] Integrate the disclosure into the existing visual system
  - Add focused disclosure-section styles in [`landing.css`](../landing.css) using the existing spacing, panel, typography, border, and color tokens.
  - Ensure the section remains readable and does not resemble hidden verification-only copy.
  - Add mobile rules at the project’s existing responsive breakpoints.
  - Preserve visible focus states and adequate text/link contrast.
  - Add a static reduced-motion state only if the section introduces motion; otherwise keep it non-animated.
  - Increment the stylesheet cache-busting query in [`index.html`](../index.html:14) if [`landing.css`](../landing.css) changes.

- [ ] Keep localized content equivalent without weakening the static English disclosure
  - Add translation keys for the new section to every language object in [`landing.js`](../landing.js:5): English, Turkish, German, French, and Spanish.
  - Attach the matching translation attributes in [`index.html`](../index.html:286).
  - Keep product names, URLs, and the Google-product names exact rather than translating them.
  - Verify that changing language and returning to English restores the approved disclosure accurately.
  - Increment the script cache-busting query in [`index.html`](../index.html:306) if [`landing.js`](../landing.js) changes.

- [ ] Align the privacy policy with the canonical identity and authentication disclosure
  - In [`privacy.html`](../privacy.html:7), change the page title to **PromptCard AI - Image to Prompt Privacy Policy**.
  - In [`privacy.html`](../privacy.html:92), use the exact canonical product name in the visible brand and policy heading.
  - Add or refine a Google Sign-In paragraph that distinguishes identity/session data from image-analysis data.
  - Describe only data and purposes supported by the implementation and configured OAuth scopes.
  - Add a clear link back to `https://promptcard.hopto.org/`.
  - Do not remove existing disclosures about service providers, storage, deletion, security, or contact information.

- [ ] Run local consistency and regression checks
  - Search [`index.html`](../index.html), [`privacy.html`](../privacy.html), [`manifest.json`](../manifest.json:3), and relevant visible extension surfaces for inconsistent public names.
  - Confirm the exact canonical name is present in the homepage, privacy policy, and [`manifest.json`](../manifest.json:3).
  - Confirm app-purpose and Google Sign-In copy exists directly in static homepage HTML.
  - Validate translation-key completeness across all supported languages in [`landing.js`](../landing.js:5).
  - Check HTML structure, duplicate identifiers, broken internal links, and missing referenced assets.
  - Load the local page at desktop, tablet, and mobile widths and verify no horizontal overflow or regression in the existing animated demonstrations.

- [ ] Obtain a real Search Console verification token
  - Open Google Search Console in an owned authenticated browser tab.
  - Add the URL-prefix property `https://promptcard.hopto.org/`.
  - Select the HTML meta-tag verification method and copy the exact token generated by Google.
  - Never insert a placeholder or inferred token.
  - If the meta-tag method is unavailable, use Google’s unchanged HTML verification file at the production web root.
  - Use DNS verification only if the user demonstrably controls the required DNS zone and the first two methods cannot work.

- [ ] Add the ownership proof locally
  - For meta-tag verification, insert Google’s exact verification tag in the document head of [`index.html`](../index.html:4).
  - For HTML-file verification, create only the exact filename and content supplied by Google at the workspace root for deployment.
  - Keep the ownership proof in place after successful verification so ownership remains valid during review.
  - Confirm the local source contains the token exactly once.

- [ ] Back up and deploy the corrected public pages
  - Reconnect to the existing production server and confirm `/var/www/promptcard/` remains the active document root before writing.
  - Create a timestamped backup containing the current production homepage, privacy policy, stylesheet, script, and any existing Google verification file.
  - Upload the changed [`index.html`](../index.html), [`privacy.html`](../privacy.html), [`landing.css`](../landing.css), [`landing.js`](../landing.js), and verification file only when each one actually changed.
  - Preserve production ownership and permissions.
  - Compare local and production SHA-256 hashes for every deployed file.
  - Confirm HTTPS returns successful responses for the homepage, privacy policy, styles, scripts, icons, and verification file when used.

- [ ] Verify the live remediation before asking Google to re-review
  - Inspect raw live homepage HTML and confirm the ownership token, canonical name, purpose disclosure, Google Sign-In purpose, and privacy-policy link are publicly retrievable.
  - Inspect the rendered homepage in a clean browser context at desktop and mobile widths.
  - Verify the privacy-policy page contains the exact canonical name and authentication disclosure.
  - Confirm no console errors, broken assets, layout overflow, or language-switching regressions.
  - Recheck that the disclosure accurately matches the configured OAuth scopes.

- [ ] Complete Search Console ownership verification
  - Return to the pending Search Console property and run verification only after the token is live.
  - Record the successful ownership status for `https://promptcard.hopto.org/`.
  - If verification fails, inspect the public source, redirects, cache behavior, and exact token before changing verification methods.

- [ ] Update Google Auth Platform branding consistently
  - Set the OAuth app name to the exact value **PromptCard AI - Image to Prompt**.
  - Set the homepage URL to `https://promptcard.hopto.org/`.
  - Set the privacy-policy URL to `https://promptcard.hopto.org/privacy.html`.
  - Confirm the support email and developer contact email are correct and accessible.
  - Confirm the authorized-domain entry accepted by Google matches the production configuration.
  - Save changes and reload the Branding page to ensure the values persisted.
  - Reopen Data Access and confirm scopes remain minimal and consistent with the public disclosure.

- [ ] Submit the corrected branding for re-verification
  - Reopen the previous verification findings dialog.
  - Map each finding to its completed evidence: Search Console ownership, live app-purpose disclosure, and exact app-name match.
  - Select **I have fixed the issues** rather than claiming the original findings were incorrect.
  - Proceed with the re-verification request and complete any final confirmation presented by Google.
  - Capture the resulting submission state and any review reference or follow-up instructions.

- [ ] Report the final state accurately
  - Report deployed files and live URLs.
  - Report successful Search Console ownership verification.
  - Report the saved OAuth app name, homepage URL, privacy-policy URL, and reviewed scopes.
  - Report whether Google shows **submitted/pending review**, **verified**, or a new blocking issue.
  - Do not represent a pending manual review as final Google approval.

## Execution constraints

- Do not submit re-verification until all three original findings are visibly resolved.
- Do not broaden OAuth scopes.
- Do not deploy an invented Search Console token.
- Do not remove the verification token after ownership succeeds.
- Back up production files before modification.
- Keep the exact canonical name consistent across every reviewer-visible surface.
- Preserve the existing landing-page interactions, accessibility behavior, and reduced-motion support.
