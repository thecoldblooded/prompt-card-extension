// Service Worker: Background Vision Engine with Clean Dynamic Injection & Error Guard

const CONTEXT_MENU_TITLES = {
  tr: 'PromptCard ile Analiz Et',
  en: 'Analyze with PromptCard',
  de: 'Mit PromptCard analysieren',
  fr: 'Analyser avec PromptCard',
  es: 'Analizar con PromptCard'
};

let contextMenuSyncQueue = Promise.resolve();

function createContextMenu(language) {
  const selectedLanguage = CONTEXT_MENU_TITLES[language] ? language : 'en';

  return new Promise((resolve, reject) => {
    chrome.contextMenus.create({
      id: 'analyzeImagePromptCard',
      title: CONTEXT_MENU_TITLES[selectedLanguage],
      contexts: ['image', 'page', 'selection']
    }, () => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

function syncContextMenu(language) {
  const sync = async () => {
    await chrome.contextMenus.removeAll();
    await createContextMenu(language);
  };

  contextMenuSyncQueue = contextMenuSyncQueue.then(sync, sync);
  return contextMenuSyncQueue;
}

async function initializeContextMenu() {
  const storedLanguage = await chrome.storage.local.get(['uiLanguage', 'targetLang']);
  await syncContextMenu(storedLanguage.uiLanguage || storedLanguage.targetLang || 'en');
}

// Manifest V3 service workers can start without firing onInstalled, so always restore the menu.
initializeContextMenu().catch((error) => {
  console.error('[PromptCard] Context menu initialization failed:', error);
});

// Open the persistent Side Panel from the extension toolbar action.
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => { });
chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.sidePanel?.setOptions({ path: 'popup.html', enabled: true }).catch(() => { });
  if (details.reason === 'install') {
    // Fresh installations start in English and never inherit or expose a provider configuration.
    await chrome.storage.local.set({
      baseUrl: '',
      apiKey: '',
      modelName: '',
      uiLanguage: 'en',
      targetLang: 'en',
      hoverPromptEnabled: true
    });

    // onInstalled can also run for updates, but onboarding is strictly install-only.
    await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
  // Remove the legacy shared history so it can never appear under another account.
  await chrome.storage.local.remove('promptHistory');
  await initializeContextMenu();
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'OPEN_SIDE_PANEL' && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  const language = changes.uiLanguage?.newValue || changes.targetLang?.newValue;

  if (language) {
    syncContextMenu(language).catch((error) => {
      console.error('[PromptCard] Context menu update failed:', error);
    });
  }
});

// Safe Message Sender (Swallows Chrome port disconnected errors)
function safeSendMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        // Silently swallow disconnected port errors
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

// Clean Dynamic Content Script Injector without Uncaught Exception Logs
async function ensureContentScriptInjected(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => !!window.__PROMPTCARD_INJECTED__
    }).catch(() => null);

    const isInjected = results?.[0]?.result;

    if (!isInjected) {
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['content.css']
      }).catch(() => { });

      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).catch(() => { });
    }
  } catch (e) {
    // Ignore uninjectable pages (e.g. chrome://, chromewebstore)
  }
}

// Context Menu Click Listener
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'analyzeImagePromptCard' && tab?.id) {
    await ensureContentScriptInjected(tab.id);

    let imageUrl = info.srcUrl;

    if (!imageUrl) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const el = document.activeElement || document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
            if (!el) return null;
            if (el.tagName === 'IMG') return el.src;
            const bg = window.getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none') {
              const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
              if (match) return match[1];
            }
            const imgInside = el.querySelector('img');
            if (imgInside) return imgInside.src;
            return null;
          }
        });
        imageUrl = results?.[0]?.result;
      } catch (e) { }
    }

    if (imageUrl) {
      analyzeImageSource(imageUrl, tab.id);
    } else {
      safeSendMessage(tab.id, { action: 'START_AREA_CROP' });
    }
  }
});

const hoverAnalysisInFlight = new Map();
const MAX_HOVER_DATA_URL_LENGTH = 20_000_000;
const MAX_HOVER_REMOTE_URL_LENGTH = 16_384;

function validateHoverImageSource(source) {
  if (typeof source !== 'string') return null;
  const normalizedSource = source.trim();
  if (!normalizedSource) return null;

  const isImageDataUrl = normalizedSource.startsWith('data:image/');
  const maxLength = isImageDataUrl ? MAX_HOVER_DATA_URL_LENGTH : MAX_HOVER_REMOTE_URL_LENGTH;
  if (normalizedSource.length > maxLength) return null;

  try {
    const parsed = new URL(normalizedSource);
    if (!['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol)) return null;
    if (parsed.protocol === 'data:' && !isImageDataUrl) return null;
    return normalizedSource;
  } catch (_) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.action === 'START_GOOGLE_AUTH') {
    handleGoogleAuth()
      .then((res) => sendResponse({ ok: true, session: res.session }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (request?.action === 'ANALYZE_CROPPED_IMAGE' && request.dataUrl) {
    const tabId = sender.tab?.id;
    if (Number.isInteger(tabId)) {
      ensureContentScriptInjected(tabId).then(() => analyzeImageSource(request.dataUrl, tabId));
    }
    return;
  }

  if (request?.action !== 'ANALYZE_HOVER_IMAGE') return;

  const tabId = sender.tab?.id;
  const imageSource = validateHoverImageSource(request.imageSource);
  if (sender.id !== chrome.runtime.id || !Number.isInteger(tabId) || !imageSource) {
    sendResponse({ ok: false, code: 'INVALID_REQUEST' });
    return;
  }

  const requestKey = `${tabId}\n${imageSource}`;
  if (hoverAnalysisInFlight.has(requestKey)) {
    sendResponse({ ok: false, code: 'ALREADY_IN_FLIGHT' });
    return;
  }

  const analysis = analyzeImageSource(imageSource, tabId)
    .then((result) => ({
      ok: Boolean(result?.ok),
      code: result?.ok ? 'COMPLETED' : 'ANALYSIS_FAILED'
    }))
    .catch(() => ({ ok: false, code: 'ANALYSIS_FAILED' }))
    .finally(() => hoverAnalysisInFlight.delete(requestKey));

  hoverAnalysisInFlight.set(requestKey, analysis);
  analysis.then(sendResponse);
  return true;
});

const SUPABASE_URL = 'https://promptcard.supabase.umutdogan.space';
const BUILT_IN_API_URL = 'https://api.promptcard.umutdogan.space';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1MDY3Mjg4LCJleHAiOjE5NDI3NDcyODh9.9SurqvyAEXfIIm4qNODHJRn7BGStAYz9t8bHU3Zs_4k';

function handleGoogleAuth() {
  const redirectUrl = chrome.identity.getRedirectURL();
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&flow_type=implicit&redirect_to=${encodeURIComponent(redirectUrl)}`;
  console.log('[PromptCard Auth Log Background] Redirect URL:', redirectUrl);
  console.log('[PromptCard Auth Log Background] Auth URL:', authUrl);

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, async (responseUrl) => {
      const error = chrome.runtime.lastError;
      console.log('[PromptCard Auth Log Background] Response URL:', responseUrl);
      if (error) {
        console.error('[PromptCard Auth Log Background] launchWebAuthFlow Error:', error.message || String(error));
      }
      if (error || !responseUrl) {
        return reject(new Error(error?.message || 'Google ile giriş iptal edildi.'));
      }

      try {
        let hashParams = new URLSearchParams();
        let queryParams = new URLSearchParams();

        if (responseUrl.includes('#')) {
          hashParams = new URLSearchParams(responseUrl.substring(responseUrl.indexOf('#') + 1));
        }
        if (responseUrl.includes('?')) {
          const queryString = responseUrl.substring(responseUrl.indexOf('?') + 1).split('#')[0];
          queryParams = new URLSearchParams(queryString);
        }

        let accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        let refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = queryParams.get('code') || hashParams.get('code');

        if ((!accessToken || !refreshToken) && code) {
          const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
            method: 'POST',
            headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_code: code })
          }).catch(() => null);
          if (tokenRes && tokenRes.ok) {
            const tokenData = await tokenRes.json();
            accessToken = tokenData.access_token;
            refreshToken = tokenData.refresh_token;
          }
        }

        if (!accessToken || !refreshToken) {
          throw new Error('OAuth yanıtından token alınamadı.');
        }

        const params = { ...Object.fromEntries(hashParams), ...Object.fromEntries(queryParams) };
        const now = Math.floor(Date.now() / 1000);
        const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`
          }
        });
        const user = await userResponse.json().catch(() => ({}));
        if (!userResponse.ok || !user?.id) {
          throw new Error(user?.msg || user?.message || `Kullanıcı bilgisi alınamadı (HTTP ${userResponse.status})`);
        }

        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: Number(params.expires_in || 3600),
          expires_at: Number(params.expires_at || now + Number(params.expires_in || 3600)),
          token_type: params.token_type || 'bearer',
          provider_token: params.provider_token || undefined,
          user
        };

        await chrome.storage.local.set({ promptcardSession: session, promptcardMode: 'builtin', pendingOtpVisible: false });
        console.log('[PromptCard Auth Log Background] Google Auth Success! Session saved.');
        resolve({ ok: true, session });
      } catch (err) {
        console.error('[PromptCard Auth Log Background] Error parsing auth response:', err.message || err);
        reject(err);
      }
    });
  });
}
const HISTORY_LIMIT = 5;
const HISTORY_KEY_PREFIX = 'promptHistory:';
let historyWriteQueue = Promise.resolve();

function getHistoryStorageKey(session) {
  const userId = String(session?.user?.id || '').trim();
  return userId ? `${HISTORY_KEY_PREFIX}${userId}` : null;
}

async function appendPromptHistory(session, cardData) {
  const historyKey = getHistoryStorageKey(session);
  if (!historyKey) return [];

  const write = async () => {
    const stored = await chrome.storage.local.get(historyKey);
    const existing = Array.isArray(stored[historyKey]) ? stored[historyKey] : [];
    const history = [cardData, ...existing].slice(0, HISTORY_LIMIT);
    await chrome.storage.local.set({ [historyKey]: history });
    return history;
  };

  historyWriteQueue = historyWriteQueue.then(write, write);
  return historyWriteQueue;
}

async function getValidSession() {
  const { promptcardSession: session } = await chrome.storage.local.get('promptcardSession');
  if (!session?.access_token) return null;

  const expiresAt = Number(session.expires_at || 0);
  const shouldRefresh = Boolean(session.refresh_token)
    && (!expiresAt || expiresAt <= Math.floor(Date.now() / 1000) + 60);
  if (!shouldRefresh) return session;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    const refreshedSession = await response.json().catch(() => ({}));
    if (!response.ok || !refreshedSession.access_token) throw new Error('Session refresh failed');
    await chrome.storage.local.set({ promptcardSession: refreshedSession });
    return refreshedSession;
  } catch (_) {
    await chrome.storage.local.remove('promptcardSession');
    return null;
  }
}

const MAX_VISION_IMAGE_DIMENSION = 1600;
const MAX_VISION_IMAGE_BYTES = 1_800_000;
const MIN_VISION_IMAGE_DIMENSION = 640;
const VISION_JPEG_QUALITY = 0.84;
const MIN_VISION_JPEG_QUALITY = 0.44;

function dataUrlByteLength(dataUrl) {
  const base64 = String(dataUrl || '').split(',', 2)[1] || '';
  return Math.max(0, Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0));
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressVisionImage(blob) {
  if (typeof globalThis.createImageBitmap !== 'function' || typeof globalThis.OffscreenCanvas !== 'function') {
    throw new Error('Required image compression APIs are unavailable. Reload the extension and retry.');
  }

  const bitmap = await createImageBitmap(blob);
  try {
    const sourceMaxDimension = Math.max(bitmap.width, bitmap.height);
    let dimension = Math.min(MAX_VISION_IMAGE_DIMENSION, sourceMaxDimension);
    let compressedBlob = null;
    let width = 0;
    let height = 0;
    let quality = VISION_JPEG_QUALITY;
    let attempts = 0;

    while (dimension >= MIN_VISION_IMAGE_DIMENSION) {
      const scale = Math.min(1, dimension / sourceMaxDimension);
      width = Math.max(1, Math.round(bitmap.width * scale));
      height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Could not create an OffscreenCanvas 2D context.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      quality = VISION_JPEG_QUALITY;
      while (quality >= MIN_VISION_JPEG_QUALITY) {
        attempts += 1;
        compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
        if (compressedBlob.size <= MAX_VISION_IMAGE_BYTES) {
          return {
            dataUrl: await blobToDataUrl(compressedBlob),
            sourceBytes: blob.size,
            outputBytes: compressedBlob.size,
            sourceWidth: bitmap.width,
            sourceHeight: bitmap.height,
            outputWidth: width,
            outputHeight: height,
            quality: Number(quality.toFixed(2)),
            attempts
          };
        }
        quality -= 0.08;
      }
      dimension = Math.floor(dimension * 0.8);
    }

    throw new Error(`Unable to compress image below ${MAX_VISION_IMAGE_BYTES} bytes; smallest result was ${compressedBlob?.size || 0} bytes at ${width}x${height}.`);
  } finally {
    bitmap.close();
  }
}

// Never silently send the original image after a normalization failure. Doing so
// conceals stale extension workers and creates oversized upstream requests.
async function imageUrlToBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load image for compression (HTTP ${response.status}).`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error(`Unsupported image MIME type: ${blob.type || 'unknown'}.`);
  return compressVisionImage(blob);
}

function extractCompletedJsonString(jsonText, propertyName) {
  const propertyPattern = new RegExp(`"${propertyName}"\\s*:\\s*"`);
  const match = propertyPattern.exec(jsonText);
  if (!match) return null;

  let value = '';
  let escaped = false;

  for (let index = match.index + match[0].length; index < jsonText.length; index += 1) {
    const character = jsonText[index];

    if (escaped) {
      value += `\\${character}`;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '"') {
      try {
        return JSON.parse(`"${value}"`);
      } catch (_) {
        return null;
      }
    }

    value += character;
  }

  return null;
}

function isCompletePrompt(prompt) {
  const normalized = String(prompt || '').trim();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const hasNegativeConstraint = /\b(?:do not|don't|without|avoid|exclude|prevent|no (?:additional|extra|unobserved|unwanted))\b/i.test(normalized);

  return normalized.length >= 1800
    && wordCount >= 280
    && wordCount <= 420
    && hasNegativeConstraint
    && /[.!?…]$/.test(normalized);
}

// Stream / JSON Unified Parser
function parseOpenAIResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) { }
  }

  if (trimmed.includes('data:')) {
    const lines = trimmed.split('\n');
    let combinedContent = '';
    let firstJson = null;

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('data:') && !cleanLine.includes('[DONE]')) {
        const jsonStr = cleanLine.replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(jsonStr);
          if (!firstJson) firstJson = parsed;
          const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
          combinedContent += delta;
        } catch (e) { }
      }
    }

    if (firstJson) {
      if (firstJson.choices?.[0]) {
        firstJson.choices[0].message = { role: 'assistant', content: combinedContent || 'OK' };
      }
      return firstJson;
    }
  }

  throw new SyntaxError(`The response could not be parsed: ${trimmed.slice(0, 100)}`);
}

// Core Vision Handler
async function analyzeImageSource(imageUrl, tabId) {
  await ensureContentScriptInjected(tabId);

  let currentProgress = 0;

  const languageConfig = {
    tr: { name: 'Türkçe', loading: 'Görsel yükleniyor...', analyzing: 'Görsel analiz ediliyor...', sending: 'Yapay zekaya gönderiliyor...', building: 'Prompt oluşturuluyor...', preparing: 'Prompt kartı hazırlanıyor...', completing: 'Prompt kartı tamamlanıyor...', login: 'Oturumunuzun süresi doldu. Built-in service için yeniden giriş yapın.', baseUrl: 'Custom API Base URL alanını doldurmalısınız.', model: 'Custom API model alanını doldurmalısınız.', fallback: ['Görsel Öznesi', 'Yapay Zeka Sanat Stili', 'Kompozisyon', 'Ortam Işığı', 'Detaylar'], incomplete: 'Yapay zekâ yanıtı tamamlanamadı. Eksik prompt kaydedilmedi; lütfen analizi yeniden deneyin.', error: 'Görsel analiz edilirken bir hata oluştu.' },
    en: { name: 'English', loading: 'Loading image...', analyzing: 'Analyzing image...', sending: 'Sending to AI...', building: 'Building your prompt...', preparing: 'Preparing prompt card...', completing: 'Completing prompt card...', login: 'Your session has expired. Sign in again to use the Built-in service.', baseUrl: 'Enter your Custom API Base URL.', model: 'Enter your Custom API model.', fallback: ['Image Subject', 'AI Art Style', 'Composition', 'Ambient Lighting', 'Details'], incomplete: 'The AI response was incomplete. The partial prompt was not saved; please run the analysis again.', error: 'An error occurred while analyzing the image.' },
    de: { name: 'Deutsch', loading: 'Bild wird geladen...', analyzing: 'Bild wird analysiert...', sending: 'Wird an die KI gesendet...', building: 'Prompt wird erstellt...', preparing: 'Prompt-Karte wird vorbereitet...', completing: 'Prompt-Karte wird fertiggestellt...', login: 'Ihre Sitzung ist abgelaufen. Melden Sie sich erneut für den integrierten Dienst an.', baseUrl: 'Geben Sie die Base URL Ihrer eigenen API ein.', model: 'Geben Sie das Modell Ihrer eigenen API ein.', fallback: ['Bildmotiv', 'KI-Kunststil', 'Komposition', 'Umgebungslicht', 'Details'], incomplete: 'Die KI-Antwort war unvollständig. Der Teil-Prompt wurde nicht gespeichert; führen Sie die Analyse erneut aus.', error: 'Bei der Bildanalyse ist ein Fehler aufgetreten.' },
    fr: { name: 'Français', loading: 'Chargement de l’image...', analyzing: 'Analyse de l’image...', sending: 'Envoi à l’IA...', building: 'Création du prompt...', preparing: 'Préparation de la carte de prompt...', completing: 'Finalisation de la carte de prompt...', login: 'Votre session a expiré. Reconnectez-vous pour utiliser le service intégré.', baseUrl: 'Saisissez la Base URL de votre API personnalisée.', model: 'Saisissez le modèle de votre API personnalisée.', fallback: ['Sujet de l’image', 'Style artistique IA', 'Composition', 'Éclairage ambiant', 'Détails'], incomplete: 'La réponse de l’IA était incomplète. Le prompt partiel n’a pas été enregistré; relancez l’analyse.', error: 'Une erreur est survenue pendant l’analyse de l’image.' },
    es: { name: 'Español', loading: 'Cargando imagen...', analyzing: 'Analizando imagen...', sending: 'Enviando a la IA...', building: 'Creando el prompt...', preparing: 'Preparando la tarjeta de prompt...', completing: 'Finalizando la tarjeta de prompt...', login: 'Tu sesión ha caducado. Inicia sesión de nuevo para usar el servicio integrado.', baseUrl: 'Introduce la Base URL de tu API personalizada.', model: 'Introduce el modelo de tu API personalizada.', fallback: ['Sujeto de la imagen', 'Estilo de arte IA', 'Composición', 'Iluminación ambiental', 'Detalles'], incomplete: 'La respuesta de la IA quedó incompleta. El prompt parcial no se guardó; vuelve a ejecutar el análisis.', error: 'Se produjo un error al analizar la imagen.' }
  };
  const storedLanguage = (await chrome.storage.local.get(['uiLanguage', 'targetLang']));
  const lang = languageConfig[storedLanguage.uiLanguage] ? storedLanguage.uiLanguage : (languageConfig[storedLanguage.targetLang] ? storedLanguage.targetLang : 'en');
  const copy = languageConfig[lang];

  safeSendMessage(tabId, {
    action: 'SHOW_ANALYZING_PROGRESS',
    imageUrl: imageUrl,
    progress: currentProgress,
    statusText: copy.loading,
    language: lang
  });

  const analysisStartedAt = Date.now();
  const reportProgress = (progress, statusText, stage) => {
    currentProgress = progress;
    const elapsedMs = Date.now() - analysisStartedAt;

    console.info('[PromptCard diagnostic] progress stage', {
      stage,
      progress,
      elapsedMs
    });

    safeSendMessage(tabId, {
      action: 'UPDATE_PROGRESS',
      progress,
      statusText,
      language: lang
    });
  };

  try {
    const originalImagePayloadBytes = imageUrl.startsWith('data:image/') ? dataUrlByteLength(imageUrl) : null;
    const compressedImage = await imageUrlToBase64(imageUrl);
    const base64DataUrl = compressedImage.dataUrl;
    const imagePayloadBytes = dataUrlByteLength(base64DataUrl);
    console.info('[PromptCard diagnostic] image payload normalized', {
      workerVersion: 'compression-v2',
      originalImagePayloadBytes,
      sourceBlobBytes: compressedImage.sourceBytes,
      imagePayloadBytes,
      sourceDimensions: `${compressedImage.sourceWidth}x${compressedImage.sourceHeight}`,
      outputDimensions: `${compressedImage.outputWidth}x${compressedImage.outputHeight}`,
      jpegQuality: compressedImage.quality,
      compressionAttempts: compressedImage.attempts,
      compressionRatio: originalImagePayloadBytes
        ? Number((imagePayloadBytes / originalImagePayloadBytes).toFixed(3))
        : null,
      withinTarget: imagePayloadBytes <= MAX_VISION_IMAGE_BYTES
    });
    if (imagePayloadBytes > MAX_VISION_IMAGE_BYTES) {
      throw new Error(`Compressed image exceeds the ${MAX_VISION_IMAGE_BYTES}-byte safety limit.`);
    }
    reportProgress(20, copy.analyzing, 'image-ready');

    const settings = await chrome.storage.local.get(['baseUrl', 'apiKey', 'modelName', 'promptcardMode']);
    const isBuiltIn = settings.promptcardMode === 'builtin';
    const customBaseUrl = (settings.baseUrl || '').trim().replace(/\/+$/, '');
    const apiKey = isBuiltIn ? '' : (settings.apiKey || '').trim();
    const model = isBuiltIn ? '' : (settings.modelName || '').trim();
    // Custom API analyses also use the active account identity for isolated history.
    const session = await getValidSession();
    const sessionToken = session?.access_token || '';
    reportProgress(35, copy.sending, 'session-ready');
    if (isBuiltIn && !sessionToken) throw new Error(copy.login);
    if (!isBuiltIn && !customBaseUrl) throw new Error(copy.baseUrl);
    if (!isBuiltIn && !model) throw new Error(copy.model);
    const targetLanguageName = copy.name;

    const systemPrompt = `You are PromptCard AI, an expert visual reverse-prompt engineer. Inspect the supplied image meticulously and reconstruct it as a highly detailed image-generation prompt in ${targetLanguageName}.

PRIMARY GOAL:
Write a prompt that prioritizes faithful reconstruction of the reference image over creativity. Capture every reproducible visual cue so a capable image model can produce the closest practical match. Aim for approximately 95% perceptual similarity as a quality target, while never claiming that an exact percentage can be guaranteed because generation models remain stochastic.

ANALYSIS REQUIREMENTS:
- Describe only visible or strongly inferable characteristics. Do not invent people, objects, text, scenery, colors, or narrative elements absent from the image.
- Identify every important subject and its count, type, pose/orientation, physical appearance, clothing/material/texture, relative size, and exact placement in the frame.
- Reconstruct spatial relationships: foreground, middle ground, background, overlap, spacing, scale, horizon position, negative space, symmetry/asymmetry, and dominant visual-weight distribution.
- Specify composition precisely: orientation, aspect ratio, crop, framing, camera position, camera height, viewpoint, angle, perspective, focal-length look, depth of field, and focus plane.
- Specify lighting precisely: direction, source, softness/hardness, intensity, time-of-day cues, exposure, shadows, highlights, haze, reflections, contrast, and white balance.
- Specify the complete color palette, saturation, tonal range, dominant and accent colors, atmosphere, and mood.
- Identify medium and rendering characteristics: photograph/illustration/3D/etc., realism level, lens or film look when visually supported, grain, texture, sharpness, post-processing, and era/aesthetic.
- Include small but similarity-critical details such as edges, silhouettes, surface imperfections, background objects, weather, particles, and empty areas.
- If visible text exists, transcribe it exactly when legible and describe its location, font characteristics, scale, color, and alignment. Never guess illegible text.
- Avoid generic filler such as “beautiful,” “stunning,” or “high quality” unless it communicates a specific visible property.

OUTPUT QUALITY AND ORDER:
- Write fullPrompt FIRST and finish it completely before generating any breakdown field. This ordering is mandatory.
- MANDATORY LENGTH: fullPrompt must be a self-contained, information-dense production prompt of 280–420 words AND at least 1800 characters in ${targetLanguageName}. A shorter fullPrompt is invalid. Never exceed 420 words. Before returning JSON, silently verify both limits.
- Traverse the image systematically from overall medium and scene to foreground, middle ground, background, then left-to-right and top-to-bottom. Mention every visually meaningful subject, object, edge detail, surface, shadow, reflection, mark, text-like element, atmospheric cue, and empty-space relationship that affects reconstruction.
- For every significant element, state count, appearance, color, material, texture, orientation, relative scale, frame region, overlap, distance, and relation to nearby elements whenever visible.
- Include composition/camera geometry, likely lens behavior, depth layering, light direction and softness, local contrast, palette relationships, surface micro-texture, rendering or photographic character, and imperfections. Prefer measurable relative descriptions over vague adjectives.
- Resolve uncertainty conservatively: describe ambiguous details by visible shape, color, and position rather than inventing identity or narrative.
- End fullPrompt with one concise negative-constraint sentence in ${targetLanguageName}. It must prevent unobserved extra subjects/objects/text, altered counts, changed placement, changed camera geometry, and unwanted stylistic reinterpretation.
- Keep each remaining breakdown field to one complete sentence of no more than 35 words. Do not repeat the full prompt verbatim.
- Never stop mid-sentence or return partial JSON. Shorten secondary breakdown fields if necessary, but always finish fullPrompt and close the JSON object.
- Do not include model-specific command flags, aspect-ratio flags, JSON comments, Markdown, explanations, confidence scores, or similarity claims.

Output ONLY valid raw JSON in this exact property order, with exactly these string keys:
{
  "fullPrompt": "A complete 280–420 word reconstruction prompt ending with a negative-constraint sentence",
  "subject": "One complete sentence covering subjects, counts, appearance, positions, scale, and spatial relationships",
  "style": "One complete sentence covering medium, realism, texture, processing, and aesthetic",
  "composition": "One complete sentence covering framing, viewpoint, perspective, focus, negative space, and geometry",
  "lighting": "One complete sentence covering light, exposure, palette, contrast, atmosphere, and mood",
  "details": "One complete sentence covering similarity-critical background, materials, small details, text, and exclusions"
}`;

    const endpointUrl = isBuiltIn
      ? `${BUILT_IN_API_URL}/v1/analyze`
      : (customBaseUrl.endsWith('/chat/completions') ? customBaseUrl : `${customBaseUrl}/chat/completions`);

    const requestBody = {
      ...(isBuiltIn ? {} : { model }),
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Reverse-engineer this reference image in ${targetLanguageName}. Produce an exhaustive, high-fidelity reconstruction prompt targeting approximately 95% perceptual similarity. Systematically account for every visible subject, object, count, pose, shape, edge, placement, overlap, proportion, foreground/middle-ground/background relationship, camera geometry, lighting transition, shadow, reflection, color relationship, material, micro-texture, background feature, atmosphere, imperfection, and meaningful negative space. The fullPrompt must contain 280–420 words and at least 1800 characters; never return a concise caption. Describe uncertainty visually without inventing details. Prioritize reference fidelity over creative interpretation and return only the required raw JSON.` },
            { type: 'image_url', image_url: { url: base64DataUrl } }
          ]
        }
      ],
      temperature: 0.15,
      max_tokens: 3200
    };
    const serializedBody = JSON.stringify(requestBody);
    reportProgress(45, copy.building, 'request-ready');

    console.info('[PromptCard diagnostic] analyze request', {
      mode: isBuiltIn ? 'builtin' : 'custom',
      endpointOrigin: new URL(endpointUrl).origin,
      endpointPath: new URL(endpointUrl).pathname,
      imagePayloadBytes,
      requestBodyBytes: new TextEncoder().encode(serializedBody).length,
      imageDataUrl: base64DataUrl.startsWith('data:image/'),
      imageMime: base64DataUrl.match(/^data:([^;,]+)/)?.[1] || 'remote-url',
      hasSessionToken: Boolean(sessionToken),
      model: isBuiltIn ? '(server-selected)' : model
    });

    const upstreamStartedAt = Date.now();
    console.info('[PromptCard diagnostic] awaiting model response', {
      mode: isBuiltIn ? 'builtin' : 'custom',
      progress: currentProgress
    });

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isBuiltIn ? { 'Authorization': `Bearer ${sessionToken}` } : (apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}))
      },
      body: serializedBody
    });

    console.info('[PromptCard diagnostic] model response headers received', {
      status: response.status,
      elapsedMs: Date.now() - upstreamStartedAt
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[PromptCard diagnostic] analyze response rejected', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        responseBody: errText.slice(0, 2000)
      });
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 150)}`);
    }

    const resText = await response.text();
    console.info('[PromptCard diagnostic] model response body received', {
      elapsedMs: Date.now() - upstreamStartedAt,
      responseBytes: new TextEncoder().encode(resText).length
    });
    reportProgress(80, copy.preparing, 'response-received');

    const parsedResponse = parseOpenAIResponse(resText);
    const choice = parsedResponse?.choices?.[0] || {};
    const contentText = choice.message?.content || '';
    const finishReason = choice.finish_reason || null;
    const cleanJsonText = contentText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let cardData = null;
    let promptValidationFailed = false;

    try {
      cardData = JSON.parse(cleanJsonText);
    } catch (parseError) {
      const recoveredPrompt = extractCompletedJsonString(cleanJsonText, 'fullPrompt');

      if (!isCompletePrompt(recoveredPrompt)) {
        promptValidationFailed = true;
        console.error('[PromptCard diagnostic] incomplete structured response', {
          finishReason,
          contentLength: contentText.length,
          responseTail: contentText.slice(-300)
        });
      } else {
        cardData = {
          fullPrompt: recoveredPrompt,
          subject: extractCompletedJsonString(cleanJsonText, 'subject') || copy.fallback[0],
          style: extractCompletedJsonString(cleanJsonText, 'style') || copy.fallback[1],
          composition: extractCompletedJsonString(cleanJsonText, 'composition') || copy.fallback[2],
          lighting: extractCompletedJsonString(cleanJsonText, 'lighting') || copy.fallback[3],
          details: extractCompletedJsonString(cleanJsonText, 'details') || copy.fallback[4]
        };
      }

    }

    if (!promptValidationFailed && !isCompletePrompt(cardData?.fullPrompt)) {
      promptValidationFailed = true;
      console.error('[PromptCard diagnostic] rejected incomplete prompt', {
        finishReason,
        promptLength: String(cardData?.fullPrompt || '').length
      });
    }

    if (promptValidationFailed) {
      throw new Error(copy.incomplete);
    }

    cardData.imageUrl = imageUrl;
    cardData.createdAt = new Date().toISOString();
    reportProgress(95, copy.completing, 'response-validated');

    const currentHistory = await appendPromptHistory(session, cardData);

    safeSendMessage(tabId, {
      action: 'SHOW_PROMPTCARD_RESULT',
      cardData: cardData,
      historyCount: currentHistory.length,
      language: lang
    });
    return { ok: true };

  } catch (err) {
    console.error('PromptCard Error:', err);
    safeSendMessage(tabId, {
      action: 'SHOW_ERROR_CARD',
      error: err.message || copy.error,
      language: lang
    });
    return { ok: false, error: err.message || copy.error };
  }
}