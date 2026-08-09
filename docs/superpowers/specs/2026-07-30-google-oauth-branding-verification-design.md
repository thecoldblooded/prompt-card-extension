# Google OAuth Branding Verification Remediation Design

**Date:** July 30, 2026  
**Project:** PromptCard Chrome extension and public website  
**Google Cloud project:** `promptcard-504011`

## Objective

Resolve all findings from the previous Google OAuth branding verification attempt and submit the application for re-verification. The remediation must make domain ownership, application purpose, product identity, Google Sign-In usage, and public policy links unambiguous to both reviewers and automated crawlers.

Google controls final approval and review timing. Success for this work means that all identified findings are corrected, ownership is verified, the corrected branding configuration is saved, and a re-verification request is submitted.

## Existing Findings

Google reported three issues:

1. The homepage URL `https://promptcard.hopto.org/` is not registered to the application owner.
2. The homepage does not explain the purpose of the application.
3. The OAuth app name `promptcard` does not match the app name displayed on the homepage.

## Canonical Product Identity

The exact canonical public application name will be:

**PromptCard AI - Image to Prompt**

This name will appear consistently in:

- Google Auth Platform Branding.
- The homepage document title and visible product branding.
- The homepage application-purpose and Google Sign-In disclosure.
- The homepage footer.
- The privacy-policy title, visible brand, and policy copy.
- The Chrome extension manifest, where this exact name already exists.

Decorative all-uppercase treatment may be applied with CSS, but the underlying visible text and accessible name must preserve the exact canonical wording.

## Homepage Remediation

### Product purpose

The homepage will include persistent, crawler-visible HTML that explicitly identifies PromptCard AI - Image to Prompt as a Chrome extension. It will state that users deliberately select an image or screen region and the application converts that visual reference into a detailed, structured AI prompt.

The disclosure will describe the two supported processing modes without overstating functionality:

- PromptCard's integrated analysis service using account credits.
- A compatible custom AI API configured by the user.

### Google Sign-In purpose

A dedicated subsection will explain why Google Sign-In is offered. It will state that Google Sign-In is used to authenticate the user's PromptCard account and provide account-related features such as session access, integrated credits, prompt history, and billing status.

It will also state that signing in does not grant PromptCard access to Gmail, Google Drive, contacts, or unrelated Google data. The wording must stay consistent with the OAuth scopes actually configured in Google Auth Platform; if the configured scopes exceed basic identity scopes, those scopes must be reduced or disclosed before submission.

### Public links

The disclosure area or adjacent footer will visibly link to the public privacy policy at `https://promptcard.hopto.org/privacy.html`. The homepage URL and privacy-policy URL in Google Auth Platform will use lowercase production paths and HTTPS.

### Localization

The English disclosure will exist directly in the initial HTML so Google can read it without executing JavaScript. Existing client-side translations may translate the section for users, but language switching must not remove or weaken the original disclosure's meaning.

## Domain Ownership Verification

A Google Search Console URL-prefix property will be created for:

`https://promptcard.hopto.org/`

The preferred ownership method is Google's HTML meta tag because the website files are directly deployable. The exact token supplied by Search Console will be added to the homepage `<head>` without modification, deployed to production, and verified over HTTPS before the Search Console verification action is completed.

If Search Console does not offer or accept the meta-tag method, the fallback is Google's verification HTML file deployed unchanged at the web root. DNS verification is a secondary fallback because the `hopto.org` hostname may be managed through a dynamic-DNS provider and DNS control must not be assumed.

The verification meta tag or file must remain deployed after successful verification so ownership stays valid during Google's review.

## Google Auth Platform Configuration

After the live website is updated and Search Console ownership succeeds, Google Auth Platform Branding will be updated with:

- App name: `PromptCard AI - Image to Prompt`
- Homepage: `https://promptcard.hopto.org/`
- Privacy policy: `https://promptcard.hopto.org/privacy.html`
- Authorized domain: the value accepted by Google for the deployed hostname/domain configuration
- Existing support and developer contact emails, after confirming they are accessible

The configured OAuth scopes will be reviewed before submission. PromptCard's current Google flow is intended only for account authentication, so scopes should be limited to the minimum identity scopes required by the authentication provider.

## Data and Authentication Flow

1. A user initiates Google Sign-In from the PromptCard Chrome extension.
2. The extension opens the Supabase Google authorization endpoint.
3. Google authenticates the user and returns the permitted identity information to the authentication provider.
4. PromptCard receives and stores the resulting application session according to its privacy policy.
5. The session enables PromptCard account features such as integrated credit access, prompt history, and billing status.
6. Image or screen-region analysis occurs only after a separate, explicit user action and is not implied by Google Sign-In.

The homepage and privacy policy will keep authentication data handling distinct from visual-content analysis.

## Deployment Safety

Before deployment, the existing production homepage and privacy policy will be backed up on the server. Updated files will be uploaded only after local review. Cache-busting versions will be incremented when stylesheet or script content changes.

The production response will be checked for:

- HTTP success over HTTPS.
- Exact canonical app-name text.
- Explicit app-purpose text.
- Explicit Google Sign-In purpose text.
- Working privacy-policy link.
- Search Console verification token or file.
- No horizontal layout overflow at supported desktop and mobile widths.

Local and production file hashes will be compared for deployed assets where practical.

## Error Handling and Fallbacks

- If the Search Console token is unavailable, no placeholder token will be deployed; the token will first be obtained from the authenticated Search Console flow.
- If meta-tag verification fails, the live HTML source and caching behavior will be inspected before switching to the HTML-file method.
- If Google Auth Platform rejects the long canonical name, the rejection will be recorded and product identity will be reconsidered before changing only one surface. Name consistency must not be broken to bypass validation.
- If the OAuth scopes include access beyond basic identity, re-verification will not be submitted until the scopes and public disclosures agree.
- If Google reports additional findings during submission, they will be treated as blockers and corrected before proceeding.
- If Google accepts the request but leaves the app in review, the work will be reported as submitted and pending rather than falsely reported as approved.

## Validation

### Local checks

- Verify the exact canonical name appears in the homepage, privacy policy, and extension manifest.
- Verify disclosure text exists in static HTML.
- Validate HTML structure and internal links.
- Confirm existing landing interactions and language switching still work.

### Live checks

- Load the homepage and privacy policy in a clean browser context.
- Inspect rendered text and raw HTML for required disclosures.
- Confirm the verification token is publicly retrievable.
- Complete Search Console ownership verification.
- Confirm Google Auth Platform shows the intended app name and URLs after saving.

### Submission check

Open the previous-verification findings dialog, select **I have fixed the issues**, and proceed with the re-verification request only after all three findings have corresponding verified remediations.

## Out of Scope

- Guaranteeing Google's approval date or final decision.
- Redesigning unrelated landing-page sections.
- Adding new OAuth scopes or Google API integrations.
- Changing the extension's authentication provider architecture.
- Migrating away from the existing production hostname.

## Acceptance Criteria

The remediation is complete when:

1. Search Console confirms ownership of `https://promptcard.hopto.org/`.
2. The live homepage explicitly explains the extension's purpose.
3. The live homepage explicitly explains why Google Sign-In is used and what it does not access.
4. The exact name `PromptCard AI - Image to Prompt` is consistent across the homepage, privacy policy, extension manifest, and OAuth branding.
5. Homepage and privacy-policy URLs are valid and saved in Google Auth Platform.
6. OAuth scopes are consistent with the public disclosure and limited to authentication needs.
7. Google Auth Platform accepts a new branding verification request.
8. The final status is accurately reported as approved or pending Google review.