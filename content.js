// PromptCard In-Page Overlay Script

(function () {
  // Flag to avoid duplicate injection check errors in background.js
  window.__PROMPTCARD_INJECTED__ = true;

  let hostContainer = null;
  let activeWrapper = null;
  let cropCanvas = null;

  let isMinimized = false;
  let currentCardData = null;
  let currentImageUrl = '';
  let currentProgress = 15;
  let currentStatusText = 'Loading image...';
  let currentHistoryCount = 1;
  let isOverlayEnabled = true;
  let storedHistory = [];
  let activeHistoryStorageKey = null;
  let currentLanguage = 'en';
  const HISTORY_LIMIT = 5;
  const HISTORY_KEY_PREFIX = 'promptHistory:';
  const HOVER_HOST_ID = 'promptcard-hover-action-host';
  const HOVER_DISMISS_DELAY_MS = 140;
  const HOVER_MIN_WIDTH = 160;
  const HOVER_MIN_HEIGHT = 120;
  const HOVER_COPY = {
    tr: { action: 'Prompt Al', busy: 'Analiz ediliyor…' },
    en: { action: 'Get Prompt', busy: 'Analyzing…' },
    de: { action: 'Prompt abrufen', busy: 'Wird analysiert…' },
    fr: { action: 'Obtenir le prompt', busy: 'Analyse…' },
    es: { action: 'Obtener prompt', busy: 'Analizando…' }
  };
  let hoverPromptEnabled = true;
  let hoverHost = null;
  let hoverButton = null;
  let activeHoverImage = null;
  let hoverDismissTimer = 0;
  let hoverPositionFrame = 0;
  let hoverRequestPending = false;
  const hoverResizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => scheduleHoverPosition())
    : null;

  const overlayTranslations = {
    tr: { overlay: 'Kaplama ve analiz', close: 'Kapat', expand: 'Genişlet', minimize: 'Küçült', mainPrompt: 'Ana Prompt', copyPrompt: '📋 Promptu Kopyala', copied: '✓ Kopyalandı!', subject: 'Özne', style: 'Stil & Medyum', composition: 'Kompozisyon & Açı', lighting: 'Işık & Renk', details: 'Detaylar', history: 'GEÇMİŞ', clear: 'Temizle', reset: 'Sıfırla', analyze: 'Görseli analiz et', cleared: 'Geçmiş temizlendi.', error: 'HATA', thumbnail: 'Görsel küçük resmi', croppedRegion: 'Kırpılan Alan' },
    en: { overlay: 'Overlay and analysis', close: 'Close', expand: 'Expand', minimize: 'Minimize', mainPrompt: 'Main Prompt', copyPrompt: '📋 Copy Prompt', copied: '✓ Copied!', subject: 'Subject', style: 'Style & Medium', composition: 'Composition & Angle', lighting: 'Lighting & Color', details: 'Details', history: 'HISTORY', clear: 'Clear', reset: 'Reset', analyze: 'Analyze image', cleared: 'History cleared.', error: 'ERROR', thumbnail: 'Image thumbnail', croppedRegion: 'Cropped Region' },
    de: { overlay: 'Overlay und Analyse', close: 'Schließen', expand: 'Erweitern', minimize: 'Minimieren', mainPrompt: 'Haupt-Prompt', copyPrompt: '📋 Prompt kopieren', copied: '✓ Kopiert!', subject: 'Motiv', style: 'Stil & Medium', composition: 'Komposition & Winkel', lighting: 'Licht & Farbe', details: 'Details', history: 'VERLAUF', clear: 'Löschen', reset: 'Zurücksetzen', analyze: 'Bild analysieren', cleared: 'Verlauf gelöscht.', error: 'FEHLER', thumbnail: 'Bildvorschau', croppedRegion: 'Zugeschnittener Bereich' },
    fr: { overlay: 'Superposition et analyse', close: 'Fermer', expand: 'Agrandir', minimize: 'Réduire', mainPrompt: 'Prompt principal', copyPrompt: '📋 Copier le prompt', copied: '✓ Copié !', subject: 'Sujet', style: 'Style et médium', composition: 'Composition et angle', lighting: 'Lumière et couleur', details: 'Détails', history: 'HISTORIQUE', clear: 'Effacer', reset: 'Réinitialiser', analyze: 'Analyser l’image', cleared: 'Historique effacé.', error: 'ERREUR', thumbnail: 'Miniature de l’image', croppedRegion: 'Zone recadrée' },
    es: { overlay: 'Superposición y análisis', close: 'Cerrar', expand: 'Expandir', minimize: 'Minimizar', mainPrompt: 'Prompt principal', copyPrompt: '📋 Copiar prompt', copied: '✓ ¡Copiado!', subject: 'Sujeto', style: 'Estilo y medio', composition: 'Composición y ángulo', lighting: 'Luz y color', details: 'Detalles', history: 'HISTORIAL', clear: 'Borrar', reset: 'Restablecer', analyze: 'Analizar imagen', cleared: 'Historial borrado.', error: 'ERROR', thumbnail: 'Miniatura de la imagen', croppedRegion: 'Área recortada' }
  };

  function ot(key) {
    return overlayTranslations[currentLanguage]?.[key] || overlayTranslations.en[key] || key;
  }

  function stopPageEvent(event) {
    event.stopPropagation();
  }

  function isolateOverlayEvents(host) {
    if (host.dataset.promptcardEventsIsolated === 'true') return;
    host.dataset.promptcardEventsIsolated = 'true';

    [
      'pointerdown', 'pointerup', 'pointermove',
      'mousedown', 'mouseup', 'mousemove',
      'click', 'dblclick', 'contextmenu',
      'touchstart', 'touchmove', 'touchend',
      'dragstart', 'drag', 'dragend', 'drop',
      'wheel'
    ].forEach((eventName) => {
      host.addEventListener(eventName, stopPageEvent, { passive: false });
    });
  }

  function getHost() {
    if (!hostContainer) {
      hostContainer = document.createElement('div');
      hostContainer.id = 'promptcard-overlay-host';
      isolateOverlayEvents(hostContainer);
      document.body.appendChild(hostContainer);
    }
    return hostContainer;
  }

  function closeOverlay() {
    if (activeWrapper) {
      activeWrapper.remove();
      activeWrapper = null;
    }
  }

  // Draggable Listener
  function makeDraggable(element) {
    let offsetX = 0, offsetY = 0, mouseX = 0, mouseY = 0, isDragging = false;

    element.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.target.closest('button, input, label, a, .pc-copy-main-btn, .pc-pill-btn, .pc-history-scroll-container, .pc-result-body')) return;

      e.preventDefault();
      isDragging = true;
      element.classList.add('is-dragging');
      mouseX = e.clientX;
      mouseY = e.clientY;

      const rect = element.getBoundingClientRect();
      element.style.bottom = 'auto';
      element.style.right = 'auto';
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;

      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      offsetX = mouseX - e.clientX;
      offsetY = mouseY - e.clientY;
      mouseX = e.clientX;
      mouseY = e.clientY;

      let newTop = element.offsetTop - offsetY;
      let newLeft = element.offsetLeft - offsetX;

      const maxLeft = window.innerWidth - element.offsetWidth - 10;
      const maxTop = window.innerHeight - element.offsetHeight - 10;

      newLeft = Math.max(10, Math.min(newLeft, maxLeft));
      newTop = Math.max(10, Math.min(newTop, maxTop));

      element.style.top = `${newTop}px`;
      element.style.left = `${newLeft}px`;
    }

    function onMouseUp(e) {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
      isDragging = false;
      element.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
    }
  }

  // Prevent Trackpad Scroll Propagation to Webpage
  function enableTrackpadScroll(container) {
    if (!container) return;
    container.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });
  }

  function getHistoryStorageKey(session) {
    const userId = String(session?.user?.id || '').trim();
    return userId ? `${HISTORY_KEY_PREFIX}${userId}` : null;
  }

  // Load only the active account's latest five prompts from local storage.
  async function refreshStoredHistory() {
    try {
      const settings = await chrome.storage.local.get(['promptcardSession', 'uiLanguage', 'targetLang']);
      const historyKey = getHistoryStorageKey(settings.promptcardSession);
      activeHistoryStorageKey = historyKey;
      const stored = historyKey ? await chrome.storage.local.get(historyKey) : {};
      const history = historyKey && Array.isArray(stored[historyKey]) ? stored[historyKey] : [];
      storedHistory = history.slice(0, HISTORY_LIMIT);
      currentHistoryCount = storedHistory.length;
      const storedLanguage = settings.uiLanguage || settings.targetLang;
      currentLanguage = overlayTranslations[storedLanguage] ? storedLanguage : currentLanguage;
    } catch (e) {
      activeHistoryStorageKey = null;
      storedHistory = [];
      currentHistoryCount = 0;
    }
  }

  function resolveUiLanguage(language) {
    return HOVER_COPY[language] ? language : 'en';
  }

  function isExtensionOwnedPage() {
    return location.protocol === 'chrome-extension:' || location.protocol === 'moz-extension:';
  }

  function isPromptCardOwnedElement(element) {
    return Boolean(element?.closest?.(`#${HOVER_HOST_ID}, #promptcard-overlay-host, #pc-crop-canvas-overlay, [data-promptcard-owned]`));
  }

  function getEligibleImage(element) {
    if (!hoverPromptEnabled || isExtensionOwnedPage()) return null;
    const image = element instanceof Element ? element.closest('img') : null;
    if (!(image instanceof HTMLImageElement) || isPromptCardOwnedElement(image)) return null;

    const source = String(image.currentSrc || image.src || '').trim();
    if (!source || !image.isConnected) return null;

    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    const visible = rect.width >= HOVER_MIN_WIDTH
      && rect.height >= HOVER_MIN_HEIGHT
      && rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number.parseFloat(style.opacity || '1') > 0;
    return visible ? image : null;
  }

  function ensureHoverButton() {
    if (hoverButton?.isConnected) return hoverButton;

    hoverHost = document.createElement('div');
    hoverHost.id = HOVER_HOST_ID;
    hoverHost.dataset.promptcardOwned = 'true';
    Object.assign(hoverHost.style, {
      all: 'initial',
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      pointerEvents: 'none',
      display: 'none'
    });

    const shadow = hoverHost.attachShadow({ mode: 'closed' });
    const hoverStyles = document.createElement('style');
    hoverStyles.textContent = `
      :host { pointer-events: none; }
      button {
        all: initial;
        position: fixed;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        padding: 8px 13px;
        border: 1px solid rgba(255, 153, 69, .72);
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(35, 31, 29, .98), rgba(18, 18, 20, .98));
        color: #fff8f2;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255, 255, 255, .1);
        cursor: pointer;
        font: 700 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: .01em;
        white-space: nowrap;
        pointer-events: auto;
        opacity: 1;
        transform: translateY(0) scale(1);
        transition: opacity 160ms ease, transform 160ms cubic-bezier(.2, .8, .2, 1), border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        -webkit-font-smoothing: antialiased;
      }
      button:hover:not(:disabled) {
        border-color: rgba(255, 177, 105, .96);
        background: linear-gradient(180deg, #ff7b18, #e95308);
        box-shadow: 0 12px 30px rgba(255, 95, 12, .3), inset 0 1px 0 rgba(255, 255, 255, .24);
        transform: translateY(-1px) scale(1.015);
      }
      button:focus-visible {
        outline: 3px solid rgba(255, 183, 112, .52);
        outline-offset: 3px;
        border-color: #ffad66;
      }
      button:active:not(:disabled) { transform: translateY(0) scale(.98); }
      button:disabled {
        cursor: wait;
        opacity: .72;
        transform: translateY(0) scale(.985);
      }
      @media (prefers-reduced-motion: reduce) {
        button { transition: none; }
        button:hover:not(:disabled), button:active:not(:disabled), button:disabled { transform: none; }
      }
    `;
    hoverButton = document.createElement('button');
    hoverButton.type = 'button';
    shadow.append(hoverStyles, hoverButton);
    (document.documentElement || document.body).appendChild(hoverHost);

    hoverButton.addEventListener('pointerenter', cancelHoverDismiss);
    hoverButton.addEventListener('pointerleave', scheduleHoverDismiss);
    hoverButton.addEventListener('focus', cancelHoverDismiss);
    hoverButton.addEventListener('blur', scheduleHoverDismiss);
    hoverButton.addEventListener('click', requestHoverAnalysis);
    updateHoverButtonCopy();
    return hoverButton;
  }

  function updateHoverButtonCopy() {
    if (!hoverButton) return;
    const copy = HOVER_COPY[resolveUiLanguage(currentLanguage)];
    hoverButton.textContent = hoverRequestPending ? copy.busy : copy.action;
    hoverButton.setAttribute('aria-label', hoverButton.textContent);
    hoverButton.setAttribute('aria-busy', String(hoverRequestPending));
    hoverButton.disabled = hoverRequestPending;
  }

  function cancelHoverDismiss() {
    if (hoverDismissTimer) clearTimeout(hoverDismissTimer);
    hoverDismissTimer = 0;
  }

  function hideHoverButton() {
    cancelHoverDismiss();
    hoverResizeObserver?.disconnect();
    activeHoverImage = null;
    if (hoverHost) hoverHost.style.display = 'none';
  }

  function scheduleHoverDismiss() {
    cancelHoverDismiss();
    hoverDismissTimer = window.setTimeout(() => {
      const imageFocused = activeHoverImage === document.activeElement;
      const buttonFocused = hoverButton === hoverButton?.getRootNode()?.activeElement;
      if (!imageFocused && !buttonFocused && !hoverRequestPending) hideHoverButton();
    }, HOVER_DISMISS_DELAY_MS);
  }

  function positionHoverButton() {
    hoverPositionFrame = 0;
    if (!activeHoverImage || !getEligibleImage(activeHoverImage)) {
      if (!hoverRequestPending) hideHoverButton();
      return;
    }

    const button = ensureHoverButton();
    hoverHost.style.display = 'block';
    const rect = activeHoverImage.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const top = Math.max(8, Math.min(window.innerHeight - buttonRect.height - 8, rect.top + 8));
    const left = Math.max(8, Math.min(window.innerWidth - buttonRect.width - 8, rect.right - buttonRect.width - 8));
    button.style.top = `${Math.round(top)}px`;
    button.style.left = `${Math.round(left)}px`;
  }

  function scheduleHoverPosition() {
    if (!hoverPositionFrame) hoverPositionFrame = requestAnimationFrame(positionHoverButton);
  }

  function showHoverButton(image) {
    cancelHoverDismiss();
    if (activeHoverImage !== image) {
      hoverResizeObserver?.disconnect();
      hoverResizeObserver?.observe(image);
    }
    activeHoverImage = image;
    ensureHoverButton();
    scheduleHoverPosition();
  }

  async function requestHoverAnalysis(event) {
    event.preventDefault();
    event.stopPropagation();
    const image = activeHoverImage;
    const imageSource = String(image?.currentSrc || image?.src || '').trim();
    if (!image || !getEligibleImage(image) || !imageSource || hoverRequestPending) return;

    hoverRequestPending = true;
    updateHoverButtonCopy();
    try {
      await chrome.runtime.sendMessage({ action: 'ANALYZE_HOVER_IMAGE', imageSource });
    } catch (_) {
      // The shared analysis route renders recoverable failures in the existing overlay.
    } finally {
      hoverRequestPending = false;
      updateHoverButtonCopy();
      scheduleHoverDismiss();
    }
  }

  function handleDelegatedPointerOver(event) {
    const image = getEligibleImage(event.target);
    if (image) showHoverButton(image);
  }

  function handleDelegatedPointerOut(event) {
    if (!activeHoverImage || event.target !== activeHoverImage) return;
    if (hoverHost && event.relatedTarget === hoverHost) return;
    scheduleHoverDismiss();
  }

  function handleDelegatedFocusIn(event) {
    const image = getEligibleImage(event.target);
    if (image) showHoverButton(image);
  }

  function handleDelegatedFocusOut(event) {
    if (event.target === activeHoverImage) scheduleHoverDismiss();
  }

  function initializeHoverPrompt() {
    if (isExtensionOwnedPage()) return;
    chrome.storage.local.get(['hoverPromptEnabled', 'uiLanguage', 'targetLang']).then((settings) => {
      hoverPromptEnabled = settings.hoverPromptEnabled !== false;
      currentLanguage = resolveUiLanguage(settings.uiLanguage || settings.targetLang);
      updateHoverButtonCopy();
      if (!hoverPromptEnabled) hideHoverButton();
    }).catch(() => { });

    document.addEventListener('pointerover', handleDelegatedPointerOver, { passive: true, capture: true });
    document.addEventListener('pointerout', handleDelegatedPointerOut, { passive: true, capture: true });
    document.addEventListener('focusin', handleDelegatedFocusIn, true);
    document.addEventListener('focusout', handleDelegatedFocusOut, true);
    document.addEventListener('load', (event) => {
      if (event.target === activeHoverImage) scheduleHoverPosition();
    }, true);
    window.addEventListener('scroll', scheduleHoverPosition, { passive: true, capture: true });
    window.addEventListener('resize', scheduleHoverPosition, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleHoverPosition, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleHoverPosition, { passive: true });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.hoverPromptEnabled) {
      hoverPromptEnabled = changes.hoverPromptEnabled.newValue !== false;
      if (!hoverPromptEnabled) hideHoverButton();
    }
    const language = changes.uiLanguage?.newValue || changes.targetLang?.newValue;
    if (language) {
      currentLanguage = resolveUiLanguage(language);
      updateHoverButtonCopy();
      scheduleHoverPosition();
    }
  });

  initializeHoverPrompt();

  // Listen for Messages
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'PING') {
      sendResponse({ status: 'PONG' });
      return true;
    }

    if (!isOverlayEnabled && msg.action !== 'START_AREA_CROP') return;

    refreshStoredHistory().then(() => {
      if (msg.action === 'SHOW_ANALYZING_PROGRESS') {
        currentLanguage = overlayTranslations[msg.language] ? msg.language : currentLanguage;
        currentImageUrl = msg.imageUrl;
        currentProgress = msg.progress;
        currentStatusText = msg.statusText;
        currentCardData = null;
        renderCurrentState();
      } else if (msg.action === 'UPDATE_PROGRESS') {
        currentLanguage = overlayTranslations[msg.language] ? msg.language : currentLanguage;
        currentProgress = msg.progress;
        currentStatusText = msg.statusText;
        updateProgressUI(msg.progress, msg.statusText);
      } else if (msg.action === 'SHOW_PROMPTCARD_RESULT') {
        currentLanguage = overlayTranslations[msg.language] ? msg.language : currentLanguage;
        currentCardData = msg.cardData;
        currentHistoryCount = Math.min(HISTORY_LIMIT, Number(msg.historyCount) || storedHistory.length);
        currentProgress = 100;
        renderCurrentState();
      } else if (msg.action === 'SHOW_ERROR_CARD') {
        currentLanguage = overlayTranslations[msg.language] ? msg.language : currentLanguage;
        renderErrorCard(msg.error);
      } else if (msg.action === 'START_AREA_CROP') {
        startScreenAreaCrop();
      }
    });

    return true;
  });

  // Render History Items inside Side Panel
  function renderSideHistoryContent() {
    if (!storedHistory || storedHistory.length === 0) {
      return `
        <div class="pc-history-card-item">
          <img class="pc-thumbnail-preview" src="${currentImageUrl || ''}" alt="${ot('thumbnail')}" />
        </div>
      `;
    }

    return storedHistory.slice(0, HISTORY_LIMIT).map((item, idx) => `
      <div class="pc-history-card-item" data-idx="${idx}">
        <img class="pc-thumbnail-preview" src="${item.imageUrl || currentImageUrl || ''}" alt="${ot('thumbnail')}" />
        <div class="pc-history-item-prompt">${escapeHtml(item.fullPrompt || item.subject || '')}</div>
      </div>
    `).join('');
  }

  // Render Based on Current State
  function renderCurrentState() {
    closeOverlay();
    const host = getHost();

    const wrapper = document.createElement('div');
    wrapper.className = 'pc-wrapper';
    makeDraggable(wrapper);

    if (isMinimized) {
      wrapper.innerHTML = `
        <div class="pc-minimized-pill">
          <div class="pc-pill-label-wrapper">
            <span class="pc-pill-text">${ot('overlay')}</span>
            <label class="pc-switch">
              <input type="checkbox" id="pcOverlayToggle" ${isOverlayEnabled ? 'checked' : ''}>
              <span class="pc-slider"></span>
            </label>
          </div>
          <button class="pc-pill-btn-icon red" id="pcPillClose" title="${ot('close')}">✕</button>
          <button class="pc-pill-btn-icon expand" id="pcPillExpand" title="${ot('expand')}">˅</button>
        </div>
      `;

      wrapper.querySelector('#pcPillClose').addEventListener('click', closeOverlay);
      wrapper.querySelector('#pcPillExpand').addEventListener('click', () => {
        isMinimized = false;
        renderCurrentState();
      });
      wrapper.querySelector('#pcOverlayToggle').addEventListener('change', (e) => {
        isOverlayEnabled = e.target.checked;
      });

    } else {
      // Full Card Modal Mode
      if (currentCardData) {
        // Result Render
        const subject = escapeHtml(currentCardData.subject || ot('subject'));
        const style = escapeHtml(currentCardData.style || ot('style'));
        const composition = escapeHtml(currentCardData.composition || ot('composition'));
        const lighting = escapeHtml(currentCardData.lighting || ot('lighting'));
        const details = escapeHtml(currentCardData.details || ot('details'));
        const fullPrompt = escapeHtml(currentCardData.fullPrompt || `${subject}, ${style}, ${composition}, ${lighting}`);

        wrapper.innerHTML = `
          <div class="pc-card-main">
            <div class="pc-card-header">
              <span class="pc-card-tag" style="color: #ffb000;">PROMPTCARD - V${chrome.runtime.getManifest().version}</span>
              <div class="pc-header-controls">
                <button class="pc-btn-icon-sm" id="pcMinimize" title="${ot('minimize')}">˅</button>
                <button class="pc-btn-icon-sm" id="pcMainClose" title="${ot('close')}">✕</button>
              </div>
            </div>

            <div class="pc-result-body" id="pcResultBody">
              <div class="pc-full-prompt-box">
                <span class="pc-box-label" style="color: #ff7b18;">${ot('mainPrompt')}</span>
                <div style="font-size: 13.5px; line-height: 1.5; color: #ffffff; user-select: text; word-break: break-word;">${fullPrompt}</div>
                <button class="pc-copy-main-btn" id="pcCopyMain">
                  ${ot('copyPrompt')}
                </button>
              </div>

              <div class="pc-result-box">
                <span class="pc-box-label">${ot('subject')}</span>
                <div class="pc-box-content">${subject}</div>
              </div>

              <div class="pc-result-box">
                <span class="pc-box-label">${ot('style')}</span>
                <div class="pc-box-content">${style}</div>
              </div>

              <div class="pc-result-box">
                <span class="pc-box-label">${ot('composition')}</span>
                <div class="pc-box-content">${composition}</div>
              </div>

              <div class="pc-result-box">
                <span class="pc-box-label">${ot('lighting')}</span>
                <div class="pc-box-content">${lighting}</div>
              </div>

              <div class="pc-result-box">
                <span class="pc-box-label">${ot('details')}</span>
                <div class="pc-box-content">${details}</div>
              </div>
            </div>
          </div>

          <div class="pc-card-side">
            <div class="pc-side-header">
              <span class="pc-side-title">${ot('history')}</span>
              <div class="pc-side-actions">
                <button class="pc-pill-btn clear" id="pcSideClear">${ot('clear')}</button>
                <button class="pc-pill-btn reset" id="pcSideReset">${ot('reset')}</button>
              </div>
              <button class="pc-btn-icon-sm" id="pcSideClose" title="${ot('close')}" style="width: 22px; height: 22px; font-size: 11px;">✕</button>
            </div>
            <div class="pc-side-count">${currentHistoryCount}/${HISTORY_LIMIT}</div>
            <div class="pc-history-scroll-container" id="pcHistoryContainer">
              ${renderSideHistoryContent()}
            </div>
          </div>
        `;

        const btnCopy = wrapper.querySelector('#pcCopyMain');
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText(currentCardData.fullPrompt || fullPrompt);
          btnCopy.textContent = ot('copied');
          btnCopy.style.background = '#22c55e';
          setTimeout(() => {
            btnCopy.textContent = ot('copyPrompt');
            btnCopy.style.background = '';
          }, 2000);
        });

      } else {
        // Analyzing Progress State
        wrapper.innerHTML = `
          <div class="pc-card-main">
            <div class="pc-card-header">
              <span class="pc-card-tag">PROMPTCARD - V${chrome.runtime.getManifest().version}</span>
              <div class="pc-header-controls">
                <button class="pc-btn-icon-sm" id="pcMinimize" title="${ot('minimize')}">˅</button>
                <button class="pc-btn-icon-sm" id="pcMainClose" title="${ot('close')}">✕</button>
              </div>
            </div>
            <div class="pc-analyze-heading">${ot('analyze')}</div>
            <div class="pc-progress-row">
              <div class="pc-progress-track">
                <div class="pc-progress-fill" id="pcProgressFill" style="width: ${currentProgress}%;"></div>
              </div>
              <span class="pc-progress-percent" id="pcProgressPercent">${currentProgress}%</span>
            </div>
            <div class="pc-status-subtext" id="pcStatusSubtext">${escapeHtml(currentStatusText)}</div>
          </div>

          <div class="pc-card-side">
            <div class="pc-side-header">
              <span class="pc-side-title">${ot('history')}</span>
              <div class="pc-side-actions">
                <button class="pc-pill-btn clear" id="pcSideClear">${ot('clear')}</button>
                <button class="pc-pill-btn reset" id="pcSideReset">${ot('reset')}</button>
              </div>
              <button class="pc-btn-icon-sm" id="pcSideClose" title="${ot('close')}" style="width: 22px; height: 22px; font-size: 11px;">✕</button>
            </div>
            <div class="pc-side-count">${currentHistoryCount}/${HISTORY_LIMIT}</div>
            <div class="pc-history-scroll-container" id="pcHistoryContainer">
              ${renderSideHistoryContent()}
            </div>
          </div>
        `;
      }

      wrapper.querySelector('#pcMainClose').addEventListener('click', closeOverlay);
      wrapper.querySelector('#pcMinimize').addEventListener('click', () => {
        isMinimized = true;
        renderCurrentState();
      });

      const sideClose = wrapper.querySelector('#pcSideClose');
      if (sideClose) sideClose.addEventListener('click', closeOverlay);

      const sideClear = wrapper.querySelector('#pcSideClear');
      if (sideClear) sideClear.addEventListener('click', async () => {
        if (!activeHistoryStorageKey) return;
        await chrome.storage.local.remove(activeHistoryStorageKey);
        storedHistory = [];
        currentHistoryCount = 0;
        const container = wrapper.querySelector('#pcHistoryContainer');
        if (container) container.innerHTML = `<div style="font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; padding: 20px 0;">${ot('cleared')}</div>`;
        const count = wrapper.querySelector('.pc-side-count');
        if (count) count.textContent = `0/${HISTORY_LIMIT}`;
      });

      const historyContainer = wrapper.querySelector('#pcHistoryContainer');
      enableTrackpadScroll(historyContainer);

      const resultBody = wrapper.querySelector('#pcResultBody');
      enableTrackpadScroll(resultBody);

      if (historyContainer) {
        historyContainer.querySelectorAll('.pc-history-card-item').forEach(el => {
          el.addEventListener('click', () => {
            const idx = el.dataset.idx;
            if (storedHistory[idx]) {
              currentCardData = storedHistory[idx];
              renderCurrentState();
            }
          });
        });
      }
    }

    host.appendChild(wrapper);
    activeWrapper = wrapper;
  }

  function updateProgressUI(progress, statusText) {
    if (!activeWrapper) return;
    const fill = activeWrapper.querySelector('#pcProgressFill');
    const percent = activeWrapper.querySelector('#pcProgressPercent');
    const subtext = activeWrapper.querySelector('#pcStatusSubtext');

    if (fill) fill.style.width = `${progress}%`;
    if (percent) percent.textContent = `${progress}%`;
    if (subtext && statusText) subtext.textContent = statusText;
  }

  function renderErrorCard(errorMsg) {
    closeOverlay();
    const host = getHost();

    const wrapper = document.createElement('div');
    wrapper.className = 'pc-wrapper';
    makeDraggable(wrapper);

    wrapper.innerHTML = `
      <div class="pc-card-main">
        <div class="pc-card-header">
          <span class="pc-card-tag" style="color: #ef4444;">⚠️ PROMPTCARD ${ot('error')} (v${chrome.runtime.getManifest().version})</span>
          <button class="pc-btn-icon-sm" id="pcMainClose" title="${ot('close')}">✕</button>
        </div>
        <div style="margin-top: 16px; padding: 14px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 16px; font-size: 13px; color: #fca5a5; line-height: 1.45; word-break: break-word;">
          ${escapeHtml(errorMsg)}
        </div>
      </div>
    `;

    host.appendChild(wrapper);
    activeWrapper = wrapper;
    wrapper.querySelector('#pcMainClose').addEventListener('click', closeOverlay);
  }

  // Screen Crop Selector
  function startScreenAreaCrop() {
    if (cropCanvas) cropCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.id = 'pc-crop-canvas-overlay';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    cropCanvas = canvas;

    const ctx = canvas.getContext('2d');
    let startX = 0, startY = 0, isDragging = false;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function onMouseDown(e) {
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;
    }

    function onMouseMove(e) {
      if (!isDragging) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = e.clientX - startX;
      const height = e.clientY - startY;

      ctx.clearRect(startX, startY, width, height);
      ctx.strokeStyle = '#ff7b18';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(startX, startY, width, height);
    }

    function onMouseUp(e) {
      if (!isDragging) return;
      isDragging = false;
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);

      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);

      if (width > 20 && height > 20) {
        const dummySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#1a1c23"/><text x="50%" y="50%" fill="#ff7b18" font-size="16" text-anchor="middle" dominant-baseline="middle">${escapeHtml(ot('croppedRegion'))}</text></svg>`;
        const dataUrl = `data:image/svg+xml;base64,${btoa(dummySvg)}`;

        chrome.runtime.sendMessage({
          action: 'ANALYZE_CROPPED_IMAGE',
          dataUrl: dataUrl
        });
      }
      canvas.remove();
    }

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
