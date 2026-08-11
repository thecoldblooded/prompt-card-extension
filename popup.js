const PROMPTCARD_API_URL = 'https://api.promptcard.umutdogan.space';
const SUPABASE_URL = 'https://promptcard.supabase.umutdogan.space';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1MDY3Mjg4LCJleHAiOjE5NDI3NDcyODh9.9SurqvyAEXfIIm4qNODHJRn7BGStAYz9t8bHU3Zs_4k';

const SUPPORTED_LANGUAGES = ['tr', 'en', 'de', 'fr', 'es'];
const TRANSLATIONS = {
  tr: {
    languageTitle: 'Uygulama dili', sidePanelTitle: 'Yan Panelde Aç (OTP girişi için önerilir)', cropTitle: 'Ekranda Alan Seç / Kırp', historyTitle: 'Geçmiş Analizler', hoverPromptTitle: 'Görsel üzerine gelme eylemi', hoverPromptDescription: 'Uygun görsellerde Prompt Al düğmesini göster.',
    userStatus: 'Kullanıcı / Durum', builtInService: 'Yerleşik Servis', customApi: 'Özel API', registrationRequired: 'Kayıt gerekli',
    welcomeTitle: 'PromptCard’a Hoş Geldiniz', welcomeDescription: 'Devam etmek için önce kayıt olun veya giriş yapın.', registerEmail: 'Email ile kayıt ol', continueGoogle: 'Google ile devam et',
    email: 'Email', sendOtp: 'Email OTP Gönder', otpCode: 'OTP Kodu', signIn: 'Giriş Yap', activeAccount: 'Aktif hesap', sessionOpen: 'Oturum açık',
    freeCredits: 'Yerleşik krediler', creditDescription: 'Yerleşik yapay zekâ ile her görsel analizi 1 kredi kullanır.', creditProgressLabel: 'Kalan yerleşik kredi', refreshCreditsTitle: 'Kredileri yenile', refresh: 'Yenile', creditsUnit: 'kredi',
    creditsUnavailable: 'Kullanım bilgisi alınamadı.', creditsExhausted: 'Yerleşik kredileriniz tükendi.', creditsRemaining: '{count} krediniz kaldı.', creditsLoading: 'Kullanım bilgisi yenileniyor...', buyMoreCredits: 'Daha fazla kredi al', billingTriggerHint: 'Tek seferlik paket veya aylık plan seçin', billingTitle: 'Yerleşik kredi alın', billingSubtitle: 'Lemon Squeezy ile güvenli ödeme', testMode: 'TEST MODU', oneTimePacks: 'Tek seferlik paketler', creditsNeverExpire: 'Kredilerin süresi dolmaz', monthlyPlan: 'Aylık plan', forFrequentUse: 'Sık kullanım için', creditPack: 'kredi', save20: '%20 indirim', save47: '%47 indirim', bestValue: 'En avantajlı · %75 indirim', monthlyCredits: 'her ay kredi', monthlyTerms: 'Her ay sıfırlanır; kullanılmayan krediler devretmez.', buyNow: 'Satın al', subscribe: 'Abone ol', checkPayment: 'Ödeme durumunu yenile', manageSubscription: 'Aboneliği yönet', paymentPending: 'Ödeme sayfası açıldı. Ödeme sonrası durumu yenileyin.', billingNotConfigured: 'Ödeme sistemi test yapılandırması bekliyor.', freeBreakdown: 'Ücretsiz: {count}', purchasedBreakdown: 'Satın alınan: {count}', subscriptionBreakdown: 'Aylık: {count}', resetsAt: 'Yenileme: {date}',
    howToUse: 'Nasıl kullanılır?', usageGuide: 'Bir görsele sağ tıklayıp “PromptCard ile Analiz Et” seçeneğine basın.', signOut: 'Hesaptan çıkış yap',
    model: 'Model', modelPlaceholder: 'Model adını girin', promptLanguage: 'Prompt ve Uygulama Dili', testApi: 'API Bağlantısını Test Et', testing: 'Test Ediliyor...',
    historyPrompts: 'Geçmiş Promptlar', clear: 'Temizle', emptyHistory: 'Henüz kaydedilmiş bir prompt kartı yok.', copy: 'Kopyala', copied: 'Kopyalandı! ✓',
    emailRequired: 'Email gerekli.', otpSent: 'OTP gönderildi. Yan paneli açık tutarak kodu girin.', emailFirst: 'Önce email adresinizi girin.', otpInvalid: '6 haneli OTP kodunu girin.', signedIn: 'Giriş başarılı.', googleOpened: 'Google giriş penceresi açıldı.', signedOut: 'Çıkış yapıldı.',
    baseUrlRequired: 'Lütfen geçerli bir Base URL girin.', apiTesting: 'API bağlantısı test ediliyor...', connectionSuccessful: 'Bağlantı Başarılı!', serverReply: '✅ Bağlantı Başarılı! Sunucu Yanıtı: “{reply}”', testFailed: '❌ Test Başarısız: {error}', sidePanelUnsupported: 'Bu tarayıcı sürümü Yan Panel desteklemiyor.', sidePanelFailed: 'Yan panel açılamadı: {error}'
  },
  en: {
    languageTitle: 'Application language', sidePanelTitle: 'Open in Side Panel (recommended for OTP)', cropTitle: 'Select / Crop Screen Area', historyTitle: 'Analysis History', hoverPromptTitle: 'Image hover action', hoverPromptDescription: 'Show Get Prompt on eligible images.',
    userStatus: 'User / Status', builtInService: 'Built-in service', customApi: 'Custom API', registrationRequired: 'Registration required',
    welcomeTitle: 'Welcome to PromptCard', welcomeDescription: 'Register or sign in to continue.', registerEmail: 'Register with email', continueGoogle: 'Continue with Google',
    email: 'Email', sendOtp: 'Send Email OTP', otpCode: 'OTP Code', signIn: 'Sign In', activeAccount: 'Active account', sessionOpen: 'Session active',
    freeCredits: 'Your free analyses', creditDescription: 'Each Built-in AI image analysis uses 1 credit.', creditProgressLabel: 'Remaining free analysis credits', refreshCreditsTitle: 'Refresh credits', refresh: 'Refresh', creditsUnit: 'credits',
    creditsUnavailable: 'Usage information is unavailable.', creditsExhausted: 'Your free credits are exhausted.', creditsRemaining: '{count} free analysis credits remaining.', creditsLoading: 'Refreshing usage information...', buyMoreCredits: 'Buy more credits', billingTriggerHint: 'Choose a one-time pack or monthly plan', billingTitle: 'Get built-in credits', billingSubtitle: 'Secure checkout by Lemon Squeezy', testMode: 'TEST MODE', oneTimePacks: 'One-time packs', creditsNeverExpire: 'Credits never expire', monthlyPlan: 'Monthly plan', forFrequentUse: 'For frequent use', creditPack: 'credits', save20: 'Save 20%', save47: 'Save 47%', bestValue: 'Best value · Save 75%', monthlyCredits: 'credits every month', monthlyTerms: 'Resets monthly; unused credits do not roll over.', buyNow: 'Buy now', subscribe: 'Subscribe', checkPayment: 'Refresh payment status', manageSubscription: 'Manage subscription', paymentPending: 'Checkout opened. Refresh status after payment.', billingNotConfigured: 'Billing test configuration is pending.', freeBreakdown: 'Free: {count}', purchasedBreakdown: 'Purchased: {count}', subscriptionBreakdown: 'Subscription: {count}', resetsAt: 'Renews: {date}',
    howToUse: 'How to use', usageGuide: 'Right-click an image and choose “Analyze with PromptCard”.', signOut: 'Sign out',
    model: 'Model', modelPlaceholder: 'Enter model name', promptLanguage: 'Prompt and Application Language', testApi: 'Test API Connection', testing: 'Testing...',
    historyPrompts: 'Prompt History', clear: 'Clear', emptyHistory: 'No prompt cards have been saved yet.', copy: 'Copy', copied: 'Copied! ✓',
    emailRequired: 'Email is required.', otpSent: 'OTP sent. Keep the Side Panel open and enter the code.', emailFirst: 'Enter your email first.', otpInvalid: 'Enter the 6-digit OTP code.', signedIn: 'Signed in successfully.', googleOpened: 'Google sign-in window opened.', signedOut: 'Signed out.',
    baseUrlRequired: 'Enter a valid Base URL.', apiTesting: 'Testing API connection...', connectionSuccessful: 'Connection successful!', serverReply: '✅ Connection successful! Server response: “{reply}”', testFailed: '❌ Test failed: {error}', sidePanelUnsupported: 'This browser version does not support the Side Panel.', sidePanelFailed: 'Could not open the Side Panel: {error}'
  },
  de: {
    languageTitle: 'Anwendungssprache', sidePanelTitle: 'Im Seitenpanel öffnen (für OTP empfohlen)', cropTitle: 'Bildschirmbereich auswählen / zuschneiden', historyTitle: 'Analyseverlauf', hoverPromptTitle: 'Aktion beim Bild-Hover', hoverPromptDescription: '„Prompt abrufen“ auf geeigneten Bildern anzeigen.',
    userStatus: 'Benutzer / Status', builtInService: 'Integrierter Dienst', customApi: 'Eigene API', registrationRequired: 'Registrierung erforderlich',
    welcomeTitle: 'Willkommen bei PromptCard', welcomeDescription: 'Registrieren Sie sich oder melden Sie sich an, um fortzufahren.', registerEmail: 'Mit E-Mail registrieren', continueGoogle: 'Mit Google fortfahren',
    email: 'E-Mail', sendOtp: 'E-Mail-OTP senden', otpCode: 'OTP-Code', signIn: 'Anmelden', activeAccount: 'Aktives Konto', sessionOpen: 'Sitzung aktiv',
    freeCredits: 'Ihre kostenlosen Analysen', creditDescription: 'Jede Bildanalyse mit der integrierten KI verbraucht 1 Guthaben.', creditProgressLabel: 'Verbleibende kostenlose Analysen', refreshCreditsTitle: 'Guthaben aktualisieren', refresh: 'Aktualisieren', creditsUnit: 'Guthaben',
    creditsUnavailable: 'Nutzungsinformationen sind nicht verfügbar.', creditsExhausted: 'Ihr kostenloses Guthaben ist aufgebraucht.', creditsRemaining: '{count} kostenlose Analysen verbleiben.', creditsLoading: 'Nutzungsinformationen werden aktualisiert...', buyMoreCredits: 'Mehr Guthaben kaufen', billingTriggerHint: 'Einmalpaket oder Monatsabo auswählen', billingTitle: 'Integriertes Guthaben kaufen', billingSubtitle: 'Sichere Zahlung über Lemon Squeezy', testMode: 'TESTMODUS', oneTimePacks: 'Einmalpakete', creditsNeverExpire: 'Guthaben verfällt nicht', monthlyPlan: 'Monatsabo', forFrequentUse: 'Für häufige Nutzung', creditPack: 'Guthaben', save20: '20 % sparen', save47: '47 % sparen', bestValue: 'Bestes Angebot · 75 % sparen', monthlyCredits: 'Guthaben pro Monat', monthlyTerms: 'Wird monatlich zurückgesetzt; ungenutztes Guthaben wird nicht übertragen.', buyNow: 'Jetzt kaufen', subscribe: 'Abonnieren', checkPayment: 'Zahlungsstatus aktualisieren', manageSubscription: 'Abonnement verwalten', paymentPending: 'Checkout geöffnet. Status nach der Zahlung aktualisieren.', billingNotConfigured: 'Die Testkonfiguration für die Abrechnung steht noch aus.', freeBreakdown: 'Kostenlos: {count}', purchasedBreakdown: 'Gekauft: {count}', subscriptionBreakdown: 'Abonnement: {count}', resetsAt: 'Verlängert sich: {date}',
    howToUse: 'So funktioniert es', usageGuide: 'Klicken Sie mit der rechten Maustaste auf ein Bild und wählen Sie „Mit PromptCard analysieren“.', signOut: 'Abmelden',
    model: 'Modell', modelPlaceholder: 'Modellnamen eingeben', promptLanguage: 'Prompt- und Anwendungssprache', testApi: 'API-Verbindung testen', testing: 'Test läuft...',
    historyPrompts: 'Prompt-Verlauf', clear: 'Löschen', emptyHistory: 'Noch keine Prompt-Karten gespeichert.', copy: 'Kopieren', copied: 'Kopiert! ✓',
    emailRequired: 'E-Mail ist erforderlich.', otpSent: 'OTP wurde gesendet. Lassen Sie das Seitenpanel geöffnet und geben Sie den Code ein.', emailFirst: 'Geben Sie zuerst Ihre E-Mail-Adresse ein.', otpInvalid: 'Geben Sie den 6-stelligen OTP-Code ein.', signedIn: 'Erfolgreich angemeldet.', googleOpened: 'Google-Anmeldefenster wurde geöffnet.', signedOut: 'Abgemeldet.',
    baseUrlRequired: 'Geben Sie eine gültige Base URL ein.', apiTesting: 'API-Verbindung wird getestet...', connectionSuccessful: 'Verbindung erfolgreich!', serverReply: '✅ Verbindung erfolgreich! Serverantwort: „{reply}“', testFailed: '❌ Test fehlgeschlagen: {error}', sidePanelUnsupported: 'Diese Browserversion unterstützt das Seitenpanel nicht.', sidePanelFailed: 'Seitenpanel konnte nicht geöffnet werden: {error}'
  },
  fr: {
    languageTitle: 'Langue de l’application', sidePanelTitle: 'Ouvrir dans le panneau latéral (recommandé pour l’OTP)', cropTitle: 'Sélectionner / recadrer une zone', historyTitle: 'Historique des analyses', hoverPromptTitle: 'Action au survol des images', hoverPromptDescription: 'Afficher Obtenir le prompt sur les images compatibles.',
    userStatus: 'Utilisateur / Statut', builtInService: 'Service intégré', customApi: 'API personnalisée', registrationRequired: 'Inscription requise',
    welcomeTitle: 'Bienvenue sur PromptCard', welcomeDescription: 'Inscrivez-vous ou connectez-vous pour continuer.', registerEmail: 'S’inscrire par e-mail', continueGoogle: 'Continuer avec Google',
    email: 'E-mail', sendOtp: 'Envoyer l’OTP par e-mail', otpCode: 'Code OTP', signIn: 'Se connecter', activeAccount: 'Compte actif', sessionOpen: 'Session active',
    freeCredits: 'Vos analyses gratuites', creditDescription: 'Chaque analyse d’image avec l’IA intégrée utilise 1 crédit.', creditProgressLabel: 'Analyses gratuites restantes', refreshCreditsTitle: 'Actualiser les crédits', refresh: 'Actualiser', creditsUnit: 'crédits',
    creditsUnavailable: 'Les informations d’utilisation sont indisponibles.', creditsExhausted: 'Vos crédits gratuits sont épuisés.', creditsRemaining: '{count} analyses gratuites restantes.', creditsLoading: 'Actualisation des informations d’utilisation...', buyMoreCredits: 'Acheter plus de crédits', billingTriggerHint: 'Choisissez un pack unique ou un abonnement mensuel', billingTitle: 'Obtenir des crédits intégrés', billingSubtitle: 'Paiement sécurisé par Lemon Squeezy', testMode: 'MODE TEST', oneTimePacks: 'Packs uniques', creditsNeverExpire: 'Les crédits n’expirent jamais', monthlyPlan: 'Abonnement mensuel', forFrequentUse: 'Pour une utilisation fréquente', creditPack: 'crédits', save20: 'Économisez 20 %', save47: 'Économisez 47 %', bestValue: 'Meilleure offre · Économisez 75 %', monthlyCredits: 'crédits chaque mois', monthlyTerms: 'Réinitialisé chaque mois ; les crédits inutilisés ne sont pas reportés.', buyNow: 'Acheter', subscribe: 'S’abonner', checkPayment: 'Actualiser le statut du paiement', manageSubscription: 'Gérer l’abonnement', paymentPending: 'Paiement ouvert. Actualisez le statut après le paiement.', billingNotConfigured: 'La configuration de test de la facturation est en attente.', freeBreakdown: 'Gratuits : {count}', purchasedBreakdown: 'Achetés : {count}', subscriptionBreakdown: 'Abonnement : {count}', resetsAt: 'Renouvellement : {date}',
    howToUse: 'Mode d’emploi', usageGuide: 'Faites un clic droit sur une image et choisissez « Analyser avec PromptCard ».', signOut: 'Se déconnecter',
    model: 'Modèle', modelPlaceholder: 'Saisissez le nom du modèle', promptLanguage: 'Langue du prompt et de l’application', testApi: 'Tester la connexion API', testing: 'Test en cours...',
    historyPrompts: 'Historique des prompts', clear: 'Effacer', emptyHistory: 'Aucune carte de prompt enregistrée.', copy: 'Copier', copied: 'Copié ! ✓',
    emailRequired: 'L’e-mail est requis.', otpSent: 'OTP envoyé. Gardez le panneau latéral ouvert et saisissez le code.', emailFirst: 'Saisissez d’abord votre e-mail.', otpInvalid: 'Saisissez le code OTP à 6 chiffres.', signedIn: 'Connexion réussie.', googleOpened: 'Fenêtre de connexion Google ouverte.', signedOut: 'Déconnecté.',
    baseUrlRequired: 'Saisissez une Base URL valide.', apiTesting: 'Test de la connexion API...', connectionSuccessful: 'Connexion réussie !', serverReply: '✅ Connexion réussie ! Réponse du serveur : « {reply} »', testFailed: '❌ Échec du test : {error}', sidePanelUnsupported: 'Cette version du navigateur ne prend pas en charge le panneau latéral.', sidePanelFailed: 'Impossible d’ouvrir le panneau latéral : {error}'
  },
  es: {
    languageTitle: 'Idioma de la aplicación', sidePanelTitle: 'Abrir en el panel lateral (recomendado para OTP)', cropTitle: 'Seleccionar / recortar área de pantalla', historyTitle: 'Historial de análisis', hoverPromptTitle: 'Acción al pasar sobre imágenes', hoverPromptDescription: 'Mostrar Obtener prompt en imágenes compatibles.',
    userStatus: 'Usuario / Estado', builtInService: 'Servicio integrado', customApi: 'API personalizada', registrationRequired: 'Registro obligatorio',
    welcomeTitle: 'Bienvenido a PromptCard', welcomeDescription: 'Regístrate o inicia sesión para continuar.', registerEmail: 'Registrarse con email', continueGoogle: 'Continuar con Google',
    email: 'Email', sendOtp: 'Enviar OTP por email', otpCode: 'Código OTP', signIn: 'Iniciar sesión', activeAccount: 'Cuenta activa', sessionOpen: 'Sesión activa',
    freeCredits: 'Tus análisis gratuitos', creditDescription: 'Cada análisis de imagen con la IA integrada utiliza 1 crédito.', creditProgressLabel: 'Análisis gratuitos restantes', refreshCreditsTitle: 'Actualizar créditos', refresh: 'Actualizar', creditsUnit: 'créditos',
    creditsUnavailable: 'La información de uso no está disponible.', creditsExhausted: 'Tus créditos gratuitos se han agotado.', creditsRemaining: 'Quedan {count} análisis gratuitos.', creditsLoading: 'Actualizando información de uso...', buyMoreCredits: 'Comprar más créditos', billingTriggerHint: 'Elige un paquete único o un plan mensual', billingTitle: 'Obtén créditos integrados', billingSubtitle: 'Pago seguro con Lemon Squeezy', testMode: 'MODO DE PRUEBA', oneTimePacks: 'Paquetes de un solo pago', creditsNeverExpire: 'Los créditos no caducan', monthlyPlan: 'Plan mensual', forFrequentUse: 'Para uso frecuente', creditPack: 'créditos', save20: 'Ahorra un 20 %', save47: 'Ahorra un 47 %', bestValue: 'Mejor opción · Ahorra un 75 %', monthlyCredits: 'créditos cada mes', monthlyTerms: 'Se restablece mensualmente; los créditos no utilizados no se acumulan.', buyNow: 'Comprar ahora', subscribe: 'Suscribirse', checkPayment: 'Actualizar estado del pago', manageSubscription: 'Gestionar suscripción', paymentPending: 'Pago abierto. Actualiza el estado después de pagar.', billingNotConfigured: 'La configuración de prueba de facturación está pendiente.', freeBreakdown: 'Gratis: {count}', purchasedBreakdown: 'Comprados: {count}', subscriptionBreakdown: 'Suscripción: {count}', resetsAt: 'Renovación: {date}',
    howToUse: 'Cómo se usa', usageGuide: 'Haz clic derecho en una imagen y elige «Analizar con PromptCard».', signOut: 'Cerrar sesión',
    model: 'Modelo', modelPlaceholder: 'Introduce el nombre del modelo', promptLanguage: 'Idioma del prompt y la aplicación', testApi: 'Probar conexión API', testing: 'Probando...',
    historyPrompts: 'Historial de prompts', clear: 'Borrar', emptyHistory: 'Aún no hay tarjetas de prompt guardadas.', copy: 'Copiar', copied: '¡Copiado! ✓',
    emailRequired: 'El email es obligatorio.', otpSent: 'OTP enviado. Mantén abierto el panel lateral e introduce el código.', emailFirst: 'Introduce primero tu email.', otpInvalid: 'Introduce el código OTP de 6 dígitos.', signedIn: 'Sesión iniciada correctamente.', googleOpened: 'Se abrió la ventana de inicio de sesión de Google.', signedOut: 'Sesión cerrada.',
    baseUrlRequired: 'Introduce una Base URL válida.', apiTesting: 'Probando la conexión API...', connectionSuccessful: '¡Conexión correcta!', serverReply: '✅ ¡Conexión correcta! Respuesta del servidor: «{reply}»', testFailed: '❌ Error en la prueba: {error}', sidePanelUnsupported: 'Esta versión del navegador no admite el panel lateral.', sidePanelFailed: 'No se pudo abrir el panel lateral: {error}'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const baseUrlInput = document.getElementById('baseUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const modelNameInput = document.getElementById('modelName');
  const targetLangSelect = document.getElementById('targetLang');
  const uiLanguageSelect = document.getElementById('uiLanguage');
  const hoverPromptToggle = document.getElementById('hoverPromptEnabled');
  const btnToggleKey = document.getElementById('btnToggleKey');
  const btnTestApi = document.getElementById('btnTestApi');
  const testBtnText = document.getElementById('testBtnText');
  const testSpinner = document.getElementById('testSpinner');
  const statusBanner = document.getElementById('statusBanner');
  const tabBuiltIn = document.getElementById('tabBuiltIn');
  const tabCustomApi = document.getElementById('tabCustomApi');
  const viewWelcome = document.getElementById('viewWelcome');
  const viewBuiltIn = document.getElementById('viewBuiltIn');
  const btnWelcomeEmail = document.getElementById('btnWelcomeEmail');
  const btnWelcomeGoogle = document.getElementById('btnWelcomeGoogle');
  const btnSidePanel = document.getElementById('btnSidePanel');
  const accountName = document.getElementById('accountName');
  const authEmail = document.getElementById('authEmail');
  const authOtp = document.getElementById('authOtp');
  const otpGroup = document.getElementById('otpGroup');
  const otpAction = document.getElementById('otpAction');
  const authSignedOut = document.getElementById('authSignedOut');
  const authSignedIn = document.getElementById('authSignedIn');
  const authUserEmail = document.getElementById('authUserEmail');
  const creditCount = document.getElementById('creditCount');
  const creditProgress = document.querySelector('.credit-progress');
  const creditProgressBar = document.getElementById('creditProgressBar');
  const creditStatusText = document.getElementById('creditStatusText');
  const creditBreakdown = document.getElementById('creditBreakdown');
  const btnRefreshCredits = document.getElementById('btnRefreshCredits');
  const btnShowBilling = document.getElementById('btnShowBilling');
  const billingPanel = document.getElementById('billingPanel');
  const billingStatus = document.getElementById('billingStatus');
  const btnCheckPayment = document.getElementById('btnCheckPayment');
  const btnManageSubscription = document.getElementById('btnManageSubscription');
  const authStatus = document.getElementById('authStatus');
  const btnHistory = document.getElementById('btnHistory');
  const viewSettings = document.getElementById('viewSettings');
  const viewHistory = document.getElementById('viewHistory');
  const historyList = document.getElementById('historyList');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const presetChips = document.querySelectorAll('.preset-chip');
  const HISTORY_LIMIT = 5;
  const HISTORY_KEY_PREFIX = 'promptHistory:';
  let activeMode = 'custom';
  let pendingOtpEmail = '';
  let isAuthenticated = false;
  let currentLanguage = 'en';
  let lastCreditValue = null;
  let currentHistoryItems = [];
  let activeHistoryStorageKey = null;
  let showingHistory = false;

  function getHistoryStorageKey(session) {
    const userId = String(session?.user?.id || '').trim();
    return userId ? `${HISTORY_KEY_PREFIX}${userId}` : null;
  }

  async function loadHistoryForSession(session) {
    const historyKey = getHistoryStorageKey(session);
    activeHistoryStorageKey = historyKey;

    if (!historyKey) {
      renderHistory([]);
      return;
    }

    const stored = await chrome.storage.local.get(historyKey);
    if (activeHistoryStorageKey !== historyKey) return;

    const allItems = Array.isArray(stored[historyKey]) ? stored[historyKey] : [];
    const latestItems = allItems.slice(0, HISTORY_LIMIT);
    renderHistory(latestItems);

    if (allItems.length > HISTORY_LIMIT) {
      await chrome.storage.local.set({ [historyKey]: latestItems });
    }
  }

  function t(key, replacements = {}) {
    const template = TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    return Object.entries(replacements).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template
    );
  }

  function applyLanguage(language) {
    currentLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
    document.documentElement.lang = currentLanguage;
    uiLanguageSelect.value = currentLanguage;
    targetLangSelect.value = currentLanguage;
    uiLanguageSelect.parentElement.title = t('languageTitle');
    uiLanguageSelect.setAttribute('aria-label', t('languageTitle'));
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.title = t(element.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });
    renderCredits(lastCreditValue);
    renderHistory(currentHistoryItems);
    if (!isAuthenticated) accountName.textContent = t('registrationRequired');
  }

  async function restoreOAuthSessionFromHash() {
    // Check hash fragment and query string (standard OAuth redirect)
    let hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    let queryParams = new URLSearchParams(window.location.search);

    let accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

    // Merge params for expires_in, token_type, provider_token (can be in either hash or query)
    const params = { ...Object.fromEntries(hashParams), ...Object.fromEntries(queryParams) };

    console.info('[PromptCard][OAuth] Callback payload', {
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
      hasProviderToken: Boolean(params.provider_token)
    });
    if (!accessToken || !refreshToken) return null;

    const now = Math.floor(Date.now() / 1000);
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`
      }
    });
    const user = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok || !user?.id) {
      throw new Error(user?.msg || user?.message || `Unable to load OAuth user (HTTP ${userResponse.status})`);
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
    console.info('[PromptCard][OAuth] Callback session persisted', {
      hasAccessToken: true,
      hasUser: true
    });
    history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    return session;
  }

  // Load saved settings and authentication draft. chrome.storage keeps OTP state when the popup closes.
  chrome.storage.local.get(['baseUrl', 'apiKey', 'modelName', 'targetLang', 'uiLanguage', 'hoverPromptEnabled', 'promptcardSession', 'promptcardMode', 'pendingOtpEmail', 'pendingOtpVisible'], async (res) => {
    const oauthSession = await restoreOAuthSessionFromHash().catch((error) => {
      console.error('[PromptCard][OAuth] Callback restore failed', error);
      return null;
    });
    if (oauthSession) {
      res.promptcardSession = oauthSession;
      res.promptcardMode = 'builtin';
    }
    if (res.baseUrl) baseUrlInput.value = res.baseUrl;
    if (res.apiKey) apiKeyInput.value = res.apiKey;
    if (res.modelName) modelNameInput.value = res.modelName;
    hoverPromptToggle.checked = res.hoverPromptEnabled !== false;
    const storedLanguage = SUPPORTED_LANGUAGES.includes(res.uiLanguage)
      ? res.uiLanguage
      : (SUPPORTED_LANGUAGES.includes(res.targetLang) ? res.targetLang : 'en');
    applyLanguage(storedLanguage);
    activeMode = res.promptcardMode || (res.promptcardSession ? 'builtin' : 'custom');
    pendingOtpEmail = res.pendingOtpEmail || '';
    authEmail.value = pendingOtpEmail;
    if (res.pendingOtpVisible) {
      otpGroup.classList.remove('hidden');
      otpAction.classList.remove('hidden');
    }
    setMode(activeMode);
    const session = await getSession();
    console.info('[PromptCard][OAuth] Session ready for UI', {
      hasAccessToken: Boolean(session?.access_token),
      hasUser: Boolean(session?.user)
    });
    renderAuth(session);
  });

  function setMode(mode, showAuth = false) {
    activeMode = mode === 'builtin' ? 'builtin' : 'custom';
    const builtin = activeMode === 'builtin';
    showingHistory = false;
    viewHistory.classList.add('hidden');
    btnHistory.style.borderColor = '';
    tabBuiltIn.classList.toggle('active', builtin);
    tabCustomApi.classList.toggle('active', !builtin);
    // The built-in auth form must be visible immediately after clicking the welcome CTA.
    viewWelcome.classList.toggle('hidden', isAuthenticated || showAuth);
    viewBuiltIn.classList.toggle('hidden', !builtin || (!isAuthenticated && !showAuth));
    viewSettings.classList.toggle('hidden', builtin || !isAuthenticated);
    tabBuiltIn.classList.toggle('hidden', !isAuthenticated);
    tabCustomApi.classList.toggle('hidden', !isAuthenticated);
    btnHistory.classList.toggle('hidden', !isAuthenticated);
    accountName.textContent = isAuthenticated ? (builtin ? t('builtInService') : t('customApi')) : t('registrationRequired');
    chrome.storage.local.set({ promptcardMode: activeMode });
    if (builtin && isAuthenticated) refreshCredits();
  }

  function renderAuth(session) {
    const user = session?.user;
    isAuthenticated = Boolean(user);
    loadHistoryForSession(session);
    authSignedOut.classList.toggle('hidden', Boolean(user));
    authSignedIn.classList.toggle('hidden', !user);
    if (user) {
      authUserEmail.textContent = user.email || '';
      accountName.textContent = user.email || t('builtInService');
      refreshCredits();
      setMode(activeMode);
    } else if (viewWelcome.classList.contains('hidden')) {
      // Keep the email/OTP form visible after the welcome CTA is clicked.
      setMode('builtin', true);
    } else {
      setMode(activeMode);
    }
  }

  function showAuthStatus(message, type = 'info') {
    authStatus.className = `status-banner ${type}`;
    authStatus.textContent = message;
  }

  async function supabaseRequest(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.msg || body.error_description || body.message || `HTTP ${response.status}`);
    return body;
  }

  async function getSession() {
    const session = (await chrome.storage.local.get('promptcardSession')).promptcardSession;
    if (!session?.access_token) return null;

    const expiresAt = Number(session.expires_at || 0);
    const shouldRefresh = Boolean(session.refresh_token)
      && (!expiresAt || expiresAt <= Math.floor(Date.now() / 1000) + 60);
    if (!shouldRefresh) return session;

    try {
      const refreshedSession = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      await chrome.storage.local.set({ promptcardSession: refreshedSession });
      return refreshedSession;
    } catch (_) {
      await chrome.storage.local.remove('promptcardSession');
      return null;
    }
  }

  function renderCredits(value) {
    const snapshot = value && typeof value === 'object' ? value : { total_remaining: value };
    const rawTotal = snapshot.total_remaining ?? snapshot.remaining_uses;
    const hasCreditValue = rawTotal !== null && rawTotal !== undefined && rawTotal !== '' && Number.isFinite(Number(rawTotal));
    const credits = hasCreditValue ? Math.max(0, Number(rawTotal)) : null;
    lastCreditValue = snapshot;
    const progressMax = Math.max(5, credits || 0, Number(snapshot.subscription_remaining) || 0);
    const progress = credits === null ? 0 : Math.min(100, (credits / progressMax) * 100);

    creditCount.textContent = credits ?? '-';
    creditProgressBar.style.width = `${progress}%`;
    creditProgress.setAttribute('aria-valuemax', String(progressMax));
    creditProgress.setAttribute('aria-valuenow', String(credits ?? 0));
    creditStatusText.textContent = credits === null ? t('creditsUnavailable') : credits === 0 ? t('creditsExhausted') : t('creditsRemaining', { count: credits });

    const hasBreakdown = ['free_remaining', 'purchased_remaining', 'subscription_remaining'].some((key) => snapshot[key] !== undefined);
    creditBreakdown.classList.toggle('hidden', !hasBreakdown);
    if (hasBreakdown) {
      const pieces = [
        t('freeBreakdown', { count: snapshot.free_remaining || 0 }),
        t('purchasedBreakdown', { count: snapshot.purchased_remaining || 0 }),
        t('subscriptionBreakdown', { count: snapshot.subscription_remaining || 0 })
      ];
      if (snapshot.subscription_period_end) pieces.push(t('resetsAt', { date: new Date(snapshot.subscription_period_end).toLocaleDateString(currentLanguage) }));
      creditBreakdown.textContent = pieces.join(' · ');
    }
    billingPanel.classList.toggle('billing-panel--required', credits === 0);
    if (credits === 0) billingPanel.classList.remove('hidden');
    btnManageSubscription.classList.toggle('hidden', !snapshot.subscription_status);
    const testBadge = billingPanel.querySelector('.test-badge');
    if (testBadge) testBadge.classList.toggle('hidden', snapshot.test_mode !== true);
    if (snapshot.billing_configured === false) {
      billingStatus.textContent = t('billingNotConfigured');
    } else if (snapshot.billing_configured === true && billingStatus.textContent === t('billingNotConfigured')) {
      billingStatus.textContent = '';
    }
  }

  async function refreshCredits() {
    const session = await getSession();
    if (!session?.access_token) {
      renderCredits(null);
      return;
    }

    btnRefreshCredits.disabled = true;
    btnRefreshCredits.classList.add('is-loading');
    creditStatusText.textContent = t('creditsLoading');

    try {
      const response = await fetch(`${PROMPTCARD_API_URL}/v1/credits`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error?.message || `HTTP ${response.status}`);
      renderCredits(body);
    } catch (_) {
      renderCredits(null);
      const currentSession = await getSession();
      if (!currentSession) renderAuth(null);
    } finally {
      btnRefreshCredits.disabled = false;
      btnRefreshCredits.classList.remove('is-loading');
    }
  }

  async function authenticatedBillingRequest(path, options = {}) {
    const session = await getSession();
    if (!session?.access_token) throw new Error(t('registrationRequired'));
    const response = await fetch(`${PROMPTCARD_API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(options.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || `HTTP ${response.status}`);
    return body;
  }

  async function openCheckout(offerKey, button) {
    button.disabled = true;
    billingStatus.textContent = t('creditsLoading');
    try {
      const body = await authenticatedBillingRequest('/v1/billing/checkout', { method: 'POST', body: JSON.stringify({ offer: offerKey }) });
      await chrome.tabs.create({ url: body.checkout_url });
      billingStatus.textContent = t('paymentPending');
    } catch (error) {
      billingStatus.textContent = error.message;
    } finally { button.disabled = false; }
  }

  btnShowBilling.addEventListener('click', () => billingPanel.classList.toggle('hidden'));
  billingPanel.querySelectorAll('[data-offer]').forEach((button) => button.addEventListener('click', () => openCheckout(button.dataset.offer, button)));
  btnCheckPayment.addEventListener('click', refreshCredits);
  btnManageSubscription.addEventListener('click', async () => {
    try {
      const body = await authenticatedBillingRequest('/v1/billing/portal');
      await chrome.tabs.create({ url: body.url });
    } catch (error) { billingStatus.textContent = error.message; }
  });

  async function startEmailAuth() {
    pendingOtpEmail = authEmail.value.trim();
    if (!pendingOtpEmail) return showAuthStatus(t('emailRequired'), 'error');
    await chrome.storage.local.set({ pendingOtpEmail });
    try {
      await supabaseRequest('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email: pendingOtpEmail, create_user: true }) });
      otpGroup.classList.remove('hidden'); otpAction.classList.remove('hidden');
      await chrome.storage.local.set({ pendingOtpVisible: true });
      showAuthStatus(t('otpSent'), 'success');
    } catch (error) { showAuthStatus(error.message, 'error'); }
  }

  document.getElementById('btnSendOtp').addEventListener('click', startEmailAuth);
  btnWelcomeEmail.addEventListener('click', () => {
    setMode('builtin', true);
    authEmail.focus();
  });

  document.getElementById('btnVerifyOtp').addEventListener('click', async () => {
    const email = authEmail.value.trim() || pendingOtpEmail;
    const token = authOtp.value.trim();
    if (!email) return showAuthStatus(t('emailFirst'), 'error');
    if (!/^\d{6}$/.test(token)) return showAuthStatus(t('otpInvalid'), 'error');
    try {
      // GoTrue verifies email OTP codes through /verify; grant_type=otp is not supported by /token.
      const session = await supabaseRequest('/auth/v1/verify', {
        method: 'POST',
        body: JSON.stringify({ type: 'email', email, token })
      });
      pendingOtpEmail = '';
      authOtp.value = '';
      await chrome.storage.local.set({ promptcardSession: session, pendingOtpVisible: false });
      await chrome.storage.local.remove('pendingOtpEmail');
      renderAuth(session);
      showAuthStatus(t('signedIn'), 'success');
    } catch (error) { showAuthStatus(error.message, 'error'); }
  });

  function startGoogleAuth() {
    showAuthStatus(t('googleOpened'), 'info');

    chrome.runtime.sendMessage({ action: 'START_GOOGLE_AUTH' }, async (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('[PromptCard Auth Log] Runtime sendMessage Error:', error);
        showAuthStatus(error.message || 'Google ile giriş başarısız.', 'error');
        return;
      }
      if (response && response.ok && response.session) {
        renderAuth(response.session);
        showAuthStatus(t('signedIn'), 'success');
      } else if (response && response.error) {
        showAuthStatus(response.error, 'error');
      }
    });
  }

  document.getElementById('btnGoogleAuth').addEventListener('click', startGoogleAuth);
  btnWelcomeGoogle.addEventListener('click', startGoogleAuth);

  btnRefreshCredits.addEventListener('click', refreshCredits);

  document.getElementById('btnSignOut').addEventListener('click', async () => {
    const session = await getSession();
    if (session?.access_token) await supabaseRequest('/auth/v1/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => { });
    await chrome.storage.local.remove('promptcardSession'); renderAuth(null); showAuthStatus(t('signedOut'), 'success');
  });

  tabBuiltIn.addEventListener('click', () => setMode('builtin'));
  tabCustomApi.addEventListener('click', () => setMode('custom'));

  // Auto-save settings on change
  const saveSettings = () => {
    chrome.storage.local.set({
      baseUrl: baseUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
      modelName: modelNameInput.value.trim(),
      targetLang: currentLanguage,
      uiLanguage: currentLanguage
    });
  };

  baseUrlInput.addEventListener('input', saveSettings);
  apiKeyInput.addEventListener('input', saveSettings);
  modelNameInput.addEventListener('input', saveSettings);
  targetLangSelect.addEventListener('change', () => {
    applyLanguage(targetLangSelect.value);
    saveSettings();
  });
  uiLanguageSelect.addEventListener('change', () => {
    applyLanguage(uiLanguageSelect.value);
    saveSettings();
  });
  hoverPromptToggle.addEventListener('change', () => {
    chrome.storage.local.set({ hoverPromptEnabled: hoverPromptToggle.checked });
  });

  // Toggle Password Visibility
  btnToggleKey.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      btnToggleKey.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      btnToggleKey.textContent = '👁️';
    }
  });

  // Preset Model Chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      modelNameInput.value = chip.dataset.model;
      saveSettings();
    });
  });

  // History is an exclusive view. Closing it restores only the previously active mode.
  btnHistory.addEventListener('click', () => {
    if (!showingHistory) {
      showingHistory = true;
      viewWelcome.classList.add('hidden');
      viewBuiltIn.classList.add('hidden');
      viewSettings.classList.add('hidden');
      viewHistory.classList.remove('hidden');
      btnHistory.style.borderColor = 'var(--orange-primary)';
      return;
    }

    setMode(activeMode);
  });

  // Helper: Robust JSON & SSE Dual Parser (OmniRoute Stream Fix)
  function parseOpenAIResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    const trimmed = rawText.trim();

    // Case 1: Standard non-stream JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Continue to fallback
      }
    }

    // Case 2: SSE Event Stream (data: {"id"...})
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
          } catch (e) {
            // Ignore malformed lines
          }
        }
      }

      if (firstJson) {
        // Inject aggregated content into unified JSON response structure
        if (firstJson.choices?.[0]) {
          firstJson.choices[0].message = { role: 'assistant', content: combinedContent || 'OK' };
        }
        return firstJson;
      }
    }

    throw new SyntaxError(`Response parsing failed. Raw response: ${trimmed.slice(0, 80)}`);
  }

  // Test API Connection
  btnTestApi.addEventListener('click', async () => {
    const baseUrl = baseUrlInput.value.trim().replace(/\/+$/, '');
    const apiKey = apiKeyInput.value.trim();
    const model = modelNameInput.value.trim();

    if (!baseUrl) {
      showStatus(t('baseUrlRequired'), 'error');
      return;
    }

    showStatus(t('apiTesting'), 'info');
    testSpinner.classList.remove('hidden');
    testBtnText.textContent = t('testing');

    const targetUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: 'Ping test. Reply with PONG' }],
          max_tokens: 15
        })
      });

      const resText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${resText.slice(0, 100)}`);
      }

      // Dual Parse SSE & JSON
      const parsedData = parseOpenAIResponse(resText);
      const reply = parsedData?.choices?.[0]?.message?.content || t('connectionSuccessful');

      showStatus(t('serverReply', { reply: reply.trim() }), 'success');
    } catch (err) {
      showStatus(t('testFailed', { error: err.message }), 'error');
    } finally {
      testSpinner.classList.add('hidden');
      testBtnText.textContent = t('testApi');
    }
  });

  // Side Panel Trigger: the panel survives popup closure and tab switching.
  // chrome.sidePanel.open() must be called synchronously inside the user-gesture handler.
  function openSidePanel() {
    if (!chrome.sidePanel?.open) {
      showAuthStatus(t('sidePanelUnsupported'), 'error');
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab) return;
      chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId }).catch((error) => {
        showAuthStatus(t('sidePanelFailed', { error: error.message }), 'error');
      });
    });
  }
  btnSidePanel.addEventListener('click', openSidePanel);

  // Show current extension version from manifest in the header badge.
  const appVersionEl = document.getElementById('appVersion');
  if (appVersionEl) appVersionEl.textContent = chrome.runtime.getManifest().version;

  // Status Banner display helper
  function showStatus(msg, type) {
    statusBanner.classList.remove('hidden', 'success', 'error', 'info');
    statusBanner.classList.add(type === 'info' ? 'success' : type);
    statusBanner.textContent = msg;
  }

  // History Helper Functions
  function renderHistory(items) {
    currentHistoryItems = items || [];
    if (currentHistoryItems.length === 0) {
      historyList.innerHTML = `<div class="empty-history">${escapeHtml(t('emptyHistory'))}</div>`;
      return;
    }
    historyList.innerHTML = currentHistoryItems.map((item, idx) => `
      <div class="history-item">
        <div class="history-prompt">${escapeHtml(item.prompt || item.fullPrompt || '')}</div>
        <button class="history-copy-btn" data-index="${idx}">${escapeHtml(t('copy'))}</button>
      </div>
    `).join('');

    historyList.querySelectorAll('.history-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.dataset.index;
        const text = currentHistoryItems[idx]?.prompt || currentHistoryItems[idx]?.fullPrompt || '';
        navigator.clipboard.writeText(text);
        e.target.textContent = t('copied');
        setTimeout(() => { e.target.textContent = t('copy'); }, 1500);
      });
    });
  }

  btnClearHistory.addEventListener('click', async () => {
    if (!activeHistoryStorageKey) return;
    await chrome.storage.local.remove(activeHistoryStorageKey);
    renderHistory([]);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !activeHistoryStorageKey) return;
    const historyChange = changes[activeHistoryStorageKey];
    if (!historyChange) return;
    const latestItems = Array.isArray(historyChange.newValue)
      ? historyChange.newValue.slice(0, HISTORY_LIMIT)
      : [];
    renderHistory(latestItems);
  });

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
});
