# PromptCard Landing, Welcome, and Hover Prompt Design

## Objective

Deliver a cohesive Product Theater experience across the public landing page, first-install onboarding, and in-page image interaction while preserving the current dark orange PromptCard identity.

The release adds three connected capabilities:

1. A premium, animated, multi-section landing page.
2. A localized welcome page opened once after a fresh installation.
3. A localized Get Prompt action shown over eligible images, alongside the existing context-menu flow.

## Confirmed Product Decisions

- Preserve the dark orange visual identity.
- Use the Product Theater design direction.
- Localize landing, welcome, and hover UI in Turkish, English, German, French, and Spanish.
- Fall back to English for unsupported languages.
- Open the welcome page only after a fresh install, not after updates or extension reloads.
- Use a three-step welcome flow with an interactive example image.
- Show the hover action only for visible image elements measuring at least 160 by 120 CSS pixels.
- Position the action in the image's upper-right corner.
- Send hover clicks through the same analysis pipeline used by the context menu.
- Add a persistent popup setting named hoverPromptEnabled, enabled by default.
- Keep the current generic Chrome Web Store URL in one easily replaceable constant.
- Limit the initial hover release to real image elements; CSS background images are out of scope.

## Experience Design

### Landing Page

The current single-viewport page becomes a responsive scrolling experience with the following sequence:

1. A translucent, sticky navigation bar with brand, section links, language selector, and install CTA.
2. A hero area containing a live-feeling image-to-prompt product demonstration.
3. A compact trust and capability strip.
4. A three-step workflow explaining hover, context menu, and prompt output.
5. A side-by-side interaction demonstration comparing hover and right-click entry points.
6. A feature grid covering image analysis, region capture, multilingual UI, result history, and integrated or custom AI service options.
7. A prompt/result showcase that animates from image input to structured output.
8. A strong final installation CTA and complete footer.

Animation uses entrance choreography, restrained ambient motion, scroll reveals, prompt typing simulation, and interactive demo states. Runtime animation relies primarily on opacity and transform. The experience becomes static when reduced motion is requested.

### Welcome Page

The welcome page is an extension-owned document using the same color, typography, spacing, card, and motion language as the landing page.

It contains:

1. A welcome hero confirming installation.
2. Three localized steps:
   - Hover over a supported image.
   - Click Get Prompt or use the PromptCard context-menu command.
   - Review and copy the generated prompt.
3. An interactive sample image that demonstrates the hover control without spending credits or calling the production API.
4. A final Start button that closes or navigates away from onboarding as browser behavior permits.

The example is instructional simulation only. It must not imply that credits were consumed or an actual image analysis occurred.

### Hover Control

A single extension-owned control is reused for the active image rather than injecting a button into every image container.

Eligibility requirements:

- The target is a real image element.
- Its rendered dimensions are at least 160 by 120 CSS pixels.
- It is visible in the viewport and not hidden by basic visibility checks.
- It is not inside PromptCard-owned UI.
- It has a resolvable current source.

The control appears at the target image's top-right edge and remains available while the pointer moves from image to control. A short dismissal tolerance prevents flicker. Focusing an eligible image via keyboard also exposes the action when practical.

The control tracks scroll, resize, zoom-related layout updates, responsive source changes, and dynamic image insertion. Position updates are throttled with requestAnimationFrame. Event delegation avoids continuously attaching listeners to every image.

## Localization

A shared language contract uses these codes:

- tr
- en
- de
- fr
- es

Unsupported or missing language values resolve to en. New strings include:

- Get Prompt button text and accessible label.
- Persistent popup setting label and help text.
- Complete welcome content.
- Complete landing content, navigation, demonstrations, feature copy, CTA copy, and accessibility labels.
- Hover source and fetch failure messages where an existing generic message is insufficient.

Language selection continues to use uiLanguage first and targetLang only as a compatibility fallback. Changing the UI language updates the context menu, popup, in-page action, and subsequently loaded extension pages.

## Technical Architecture

### Installation Lifecycle

The service worker extends its existing installation listener:

- On a fresh install, initialize hoverPromptEnabled to true with the other defaults.
- Open chrome.runtime.getURL for welcome.html in a new tab.
- Do not open welcome.html for update, browser restart, service-worker restart, or manual extension reload.
- Preserve existing side-panel setup, context-menu initialization, and history cleanup behavior.

### Shared Analysis Entry Point

The hover control sends a message containing the resolved image URL to the service worker. The service worker validates sender/tab context and invokes the existing analyzeImageSource path.

Both input routes therefore share:

- Content-script injection checks.
- Image download and conversion.
- Authentication and credit checks.
- Language selection.
- Progress events.
- Result rendering.
- Account-scoped history.
- Error handling.

An in-flight guard prevents repeated hover clicks from starting duplicate analysis for the same tab and source while a request is active. The UI communicates its busy state without blocking unrelated context-menu behavior longer than necessary.

### Persistent Setting

The popup adds a localized toggle bound to hoverPromptEnabled in chrome.storage.local.

Behavior:

- Missing value is treated as true for upgrade compatibility.
- Changes persist across browser sessions.
- Content scripts subscribe to storage changes and show or remove the hover control immediately.
- Disabling the feature does not disable context-menu analysis, crop selection, or analysis result overlays.

### DOM and Styling Isolation

The hover action is mounted in extension-owned overlay UI with maximum practical isolation from host-page styles. It uses a dedicated naming prefix and the existing high-z-index overlay strategy. Pointer events are enabled only on the button, not across a full-screen blocking layer.

The implementation must avoid:

- Reparenting page images.
- Changing host image positioning.
- Adding wrappers around images.
- Mutating host-page class names or inline styles.
- Obscuring page controls unnecessarily.

### Error Handling and Edge Cases

- If currentSrc and src cannot provide a usable source, hide or disable the action.
- Data URLs continue through the existing analysis path.
- Blob URLs are attempted within their available context; failures produce a localized, recoverable error instead of crashing the content script.
- Cross-origin fetch failures surface through the existing result/error experience.
- Iframe content is handled only where the declared content-script permissions and browser security model allow injection.
- Images below the threshold, hidden images, icons, and PromptCard-owned images do not show the action.
- The initial release does not inspect CSS background images.

## Accessibility and Performance

- All controls have visible keyboard focus.
- The hover action has localized accessible text.
- Decorative animation is excluded from the accessibility tree.
- Color contrast meets normal text and control requirements.
- Layout remains usable from 320 CSS pixels upward.
- prefers-reduced-motion removes typing, parallax, continuous ambient movement, and nonessential reveal transitions.
- No heavy animation framework or remote runtime script is introduced.
- Scroll and pointer handlers remain passive where possible and visual updates are frame-throttled.
- The hover implementation maintains one active control and avoids page-wide mutation scanning loops.

## File-Level Change Map

- manifest.json: declare any welcome assets that require extension access and update version only if release policy requires it.
- background.js: open welcome on fresh install, initialize the hover setting, receive hover analysis messages, and reuse analyzeImageSource.
- content.js: implement delegated image eligibility, active-image tracking, localized hover control, storage synchronization, and analysis dispatch.
- content.css: style hover states, busy state, focus state, transitions, and reduced-motion behavior without conflicting with the existing analysis overlay.
- popup.html: add the persistent hover setting in the appropriate settings section.
- popup.js: add translations, storage initialization, toggle binding, and storage-change synchronization.
- popup.css: style the new setting consistently with existing controls.
- index.html: replace the single-screen composition with the approved multi-section Product Theater structure.
- landing.css: implement the responsive design system and motion layers.
- landing.js: expand to five languages, preserve one store URL constant, and manage language, demo, reveal, and reduced-motion behavior.
- welcome.html: add the extension onboarding document.
- welcome.css: add responsive onboarding and demo styling.
- welcome.js: add five-language rendering and simulated demo interactions.
- assets: add only locally packaged, optimized images or SVGs needed by landing and welcome.

## Validation and Acceptance Criteria

### Installation

- A clean installation opens welcome exactly once.
- Updating or reloading the extension does not open welcome.
- hoverPromptEnabled is true after clean installation.

### Hover Interaction

- Eligible images at and above 160 by 120 show the localized control in the correct location.
- Smaller, hidden, and PromptCard-owned images do not show it.
- The control remains correctly positioned through scrolling, resizing, common zoom levels, lazy loading, responsive source changes, and SPA updates.
- Clicking the control starts one analysis and renders the same progress/result/history behavior as context-menu analysis.
- Moving between the image and button does not cause visible flicker.

### Settings and Languages

- The popup toggle updates open tabs promptly and persists after browser restart.
- Disabling hover leaves context-menu and crop analysis functional.
- Landing, welcome, popup setting, and hover control render complete TR, EN, DE, FR, and ES text.
- Unsupported language values fall back to English.

### Landing and Welcome Quality

- No horizontal overflow occurs at supported widths.
- Primary controls are keyboard accessible.
- Reduced-motion mode removes nonessential animation.
- The interactive welcome demo never calls the production analysis API or consumes credits.
- Chrome extension CSP is respected; no remote script execution or inline-script dependency is introduced.

### Regression

- Context-menu analysis remains functional.
- Crop selection remains functional.
- Popup and side panel continue to work.
- Authentication, built-in credits, custom API mode, localization, and account-scoped history remain functional.
- No recurring console errors or page-level pointer blocking is introduced.

## Manual Test Matrix

Test on representative pages with:

- Standard image URLs.
- Responsive srcset/currentSrc images.
- Data URL images.
- Blob URL images.
- Dynamically inserted and lazy-loaded images.
- Long scrolling pages.
- Images near the eligibility threshold.
- Nested links and clickable image cards.
- Same-origin and permitted iframe contexts.
- Multiple browser zoom levels.
- Each supported language.
- Hover enabled and disabled.
- Reduced motion enabled and disabled.

## Out of Scope

- CSS background-image analysis from hover.
- Automatic translation beyond the five supported languages.
- A new backend analysis protocol.
- Replacing the current authentication, credit, history, or custom API systems.
- Replacing the generic Chrome Web Store target before the final listing URL is provided.
