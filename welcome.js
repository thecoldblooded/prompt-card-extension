const SUPPORTED_LANGUAGES = ['tr', 'en', 'de', 'fr', 'es'];
const translations = {
    en: { title: 'PromptCard — Welcome', skip: 'Skip to onboarding', languageLabel: 'Language', installed: 'INSTALLATION CONFIRMED', headline: 'Your visual shortcut is ready.', lede: 'PromptCard now lives in your browser. Learn the three-move flow, then try it safely below.', confirmation: 'PromptCard was added successfully', stepsTitle: 'Three moves from image to prompt.', stepOneTitle: 'Hover over an image', stepOneText: 'On supported images, PromptCard places a small action in the upper-right corner.', stepTwoTitle: 'Choose Get Prompt', stepTwoText: 'Click the action, or right-click the image and choose the PromptCard command.', stepThreeTitle: 'Review and copy', stepThreeText: 'PromptCard returns structured creative language you can copy and refine.', practiceKicker: 'NO API · NO CREDITS · JUST PRACTICE', practiceTitle: 'Try the gesture before the work begins.', practiceText: 'Move your pointer over the sample—or focus it with the keyboard—then choose Get Prompt. This is a local simulation only.', safety: 'This example never uploads an image, calls an AI service, or uses credits.', safe: 'SAFE', sampleAria: 'Practice image. Focus or hover to reveal the simulated Get Prompt action.', getPrompt: 'Get Prompt', simulatedResult: 'SIMULATED RESULT', credits: 'CREDITS', samplePrompt: 'Minimal architectural portrait beneath a monumental rust-colored arch, solitary figure, low afternoon sun, warm concrete texture, precise negative space, editorial stillness, 35mm perspective...', copy: 'Copy sample', copied: 'Copied', startTitle: 'Ready when the next image appears.', startText: 'Pin PromptCard for easy access, then continue browsing and create from what catches your eye.', start: 'Start using PromptCard', startNote: 'This tab will close when your browser allows it.', footer: 'Installed. Local demo ready.' },
    tr: { title: 'PromptCard — Hoş geldin', skip: 'Tanıtıma geç', languageLabel: 'Dil', installed: 'KURULUM ONAYLANDI', headline: 'Görsel kısayolun hazır.', lede: 'PromptCard artık tarayıcında. Üç hareketlik akışı öğren, sonra aşağıda güvenle dene.', confirmation: 'PromptCard başarıyla eklendi', stepsTitle: 'Görselden prompta üç hareket.', stepOneTitle: 'Görselin üzerine gel', stepOneText: 'PromptCard, desteklenen görsellerin sağ üst köşesine küçük bir eylem yerleştirir.', stepTwoTitle: 'Prompt Al’ı seç', stepTwoText: 'Eyleme tıkla veya görsele sağ tıklayıp PromptCard komutunu seç.', stepThreeTitle: 'İncele ve kopyala', stepThreeText: 'PromptCard, kopyalayıp geliştirebileceğin yapılandırılmış yaratıcı bir dil sunar.', practiceKicker: 'API YOK · KREDİ YOK · SADECE PRATİK', practiceTitle: 'İşe başlamadan önce hareketi dene.', practiceText: 'İmleci örneğin üzerine getir—veya klavyeyle odakla—sonra Prompt Al’ı seç. Bu yalnızca yerel bir simülasyondur.', safety: 'Bu örnek hiçbir zaman görsel yüklemez, yapay zekâ servisi çağırmaz veya kredi kullanmaz.', safe: 'GÜVENLİ', sampleAria: 'Pratik görseli. Simüle edilen Prompt Al eylemini göstermek için odaklan veya üzerine gel.', getPrompt: 'Prompt Al', simulatedResult: 'SİMÜLE EDİLEN SONUÇ', credits: 'KREDİ', samplePrompt: 'Anıtsal pas rengi bir kemerin altında minimal mimari portre, yalnız figür, alçak öğleden sonra güneşi, sıcak beton dokusu, hassas negatif alan, editoryal dinginlik, 35mm perspektif...', copy: 'Örneği kopyala', copied: 'Kopyalandı', startTitle: 'Sıradaki görsel belirdiğinde hazırsın.', startText: 'Kolay erişim için PromptCard’ı sabitle, sonra gezinmeye ve gözüne takılanlardan üretmeye devam et.', start: 'PromptCard’ı kullanmaya başla', startNote: 'Tarayıcın izin verirse bu sekme kapanır.', footer: 'Kuruldu. Yerel demo hazır.' },
    de: { title: 'PromptCard — Willkommen', skip: 'Zum Onboarding springen', languageLabel: 'Sprache', installed: 'INSTALLATION BESTÄTIGT', headline: 'Dein visueller Kurzbefehl ist bereit.', lede: 'PromptCard ist jetzt in deinem Browser. Lerne den Ablauf in drei Schritten und probiere ihn unten sicher aus.', confirmation: 'PromptCard wurde erfolgreich hinzugefügt', stepsTitle: 'Drei Schritte vom Bild zum Prompt.', stepOneTitle: 'Über ein Bild fahren', stepOneText: 'Bei unterstützten Bildern platziert PromptCard oben rechts eine kleine Aktion.', stepTwoTitle: 'Prompt erstellen wählen', stepTwoText: 'Klicke auf die Aktion oder mit der rechten Maustaste auf das Bild und wähle den PromptCard-Befehl.', stepThreeTitle: 'Prüfen und kopieren', stepThreeText: 'PromptCard liefert strukturierte kreative Sprache zum Kopieren und Verfeinern.', practiceKicker: 'KEINE API · KEINE CREDITS · NUR ÜBUNG', practiceTitle: 'Probiere die Geste vor der Arbeit.', practiceText: 'Bewege den Zeiger über das Beispiel—oder fokussiere es per Tastatur—und wähle Prompt erstellen. Dies ist nur eine lokale Simulation.', safety: 'Dieses Beispiel lädt kein Bild hoch, ruft keinen KI-Dienst auf und verbraucht keine Credits.', safe: 'SICHER', sampleAria: 'Übungsbild. Fokussieren oder darüber fahren, um die simulierte Prompt-Aktion zu zeigen.', getPrompt: 'Prompt erstellen', simulatedResult: 'SIMULIERTES ERGEBNIS', credits: 'CREDITS', samplePrompt: 'Minimales Architekturporträt unter einem monumentalen rostfarbenen Bogen, einzelne Figur, tiefe Nachmittagssonne, warme Betonstruktur, präziser Negativraum, redaktionelle Stille, 35-mm-Perspektive...', copy: 'Beispiel kopieren', copied: 'Kopiert', startTitle: 'Bereit, wenn das nächste Bild erscheint.', startText: 'Hefte PromptCard für schnellen Zugriff an und gestalte weiter mit allem, was dir ins Auge fällt.', start: 'PromptCard verwenden', startNote: 'Dieser Tab wird geschlossen, wenn dein Browser es erlaubt.', footer: 'Installiert. Lokale Demo bereit.' },
    fr: { title: 'PromptCard — Bienvenue', skip: 'Aller à la prise en main', languageLabel: 'Langue', installed: 'INSTALLATION CONFIRMÉE', headline: 'Votre raccourci visuel est prêt.', lede: 'PromptCard vit maintenant dans votre navigateur. Découvrez le parcours en trois gestes, puis essayez-le sans risque ci-dessous.', confirmation: 'PromptCard a bien été ajouté', stepsTitle: 'Trois gestes de l’image au prompt.', stepOneTitle: 'Survolez une image', stepOneText: 'Sur les images compatibles, PromptCard place une petite action dans le coin supérieur droit.', stepTwoTitle: 'Choisissez Obtenir le prompt', stepTwoText: 'Cliquez sur l’action, ou faites un clic droit et choisissez la commande PromptCard.', stepThreeTitle: 'Relisez et copiez', stepThreeText: 'PromptCard renvoie un langage créatif structuré que vous pouvez copier et affiner.', practiceKicker: 'SANS API · SANS CRÉDIT · JUSTE UN ESSAI', practiceTitle: 'Essayez le geste avant de commencer.', practiceText: 'Survolez l’exemple—ou placez-y le focus au clavier—puis choisissez Obtenir le prompt. Il s’agit uniquement d’une simulation locale.', safety: 'Cet exemple n’envoie aucune image, n’appelle aucun service IA et n’utilise aucun crédit.', safe: 'SÛR', sampleAria: 'Image d’exercice. Placez le focus ou survolez-la pour révéler l’action simulée.', getPrompt: 'Obtenir le prompt', simulatedResult: 'RÉSULTAT SIMULÉ', credits: 'CRÉDITS', samplePrompt: 'Portrait architectural minimal sous une arche monumentale couleur rouille, silhouette solitaire, soleil bas de l’après-midi, texture de béton chaude, espace négatif précis, calme éditorial, perspective 35 mm...', copy: 'Copier l’exemple', copied: 'Copié', startTitle: 'Prêt pour la prochaine image.', startText: 'Épinglez PromptCard pour y accéder facilement, puis continuez à naviguer et à créer avec ce qui attire votre regard.', start: 'Commencer avec PromptCard', startNote: 'Cet onglet se fermera si votre navigateur le permet.', footer: 'Installé. Démo locale prête.' },
    es: { title: 'PromptCard — Bienvenido', skip: 'Ir a la introducción', languageLabel: 'Idioma', installed: 'INSTALACIÓN CONFIRMADA', headline: 'Tu atajo visual está listo.', lede: 'PromptCard ya vive en tu navegador. Aprende el flujo de tres movimientos y pruébalo con seguridad abajo.', confirmation: 'PromptCard se añadió correctamente', stepsTitle: 'Tres movimientos de imagen a prompt.', stepOneTitle: 'Pasa sobre una imagen', stepOneText: 'En imágenes compatibles, PromptCard coloca una pequeña acción en la esquina superior derecha.', stepTwoTitle: 'Elige Obtener prompt', stepTwoText: 'Pulsa la acción o haz clic derecho en la imagen y elige el comando de PromptCard.', stepThreeTitle: 'Revisa y copia', stepThreeText: 'PromptCard devuelve lenguaje creativo estructurado que puedes copiar y refinar.', practiceKicker: 'SIN API · SIN CRÉDITOS · SOLO PRÁCTICA', practiceTitle: 'Prueba el gesto antes de empezar.', practiceText: 'Mueve el puntero sobre la muestra—o enfócala con el teclado—y elige Obtener prompt. Es solo una simulación local.', safety: 'Este ejemplo nunca sube una imagen, llama a un servicio de IA ni usa créditos.', safe: 'SEGURO', sampleAria: 'Imagen de práctica. Enfócala o pasa por encima para mostrar la acción simulada.', getPrompt: 'Obtener prompt', simulatedResult: 'RESULTADO SIMULADO', credits: 'CRÉDITOS', samplePrompt: 'Retrato arquitectónico minimalista bajo un arco monumental color óxido, figura solitaria, sol bajo de tarde, textura cálida de hormigón, espacio negativo preciso, quietud editorial, perspectiva de 35 mm...', copy: 'Copiar muestra', copied: 'Copiado', startTitle: 'Listo cuando aparezca la siguiente imagen.', startText: 'Fija PromptCard para acceder fácilmente y sigue navegando y creando con lo que llame tu atención.', start: 'Empezar a usar PromptCard', startNote: 'Esta pestaña se cerrará cuando el navegador lo permita.', footer: 'Instalado. Demo local lista.' }
};

const languageSelect = document.querySelector('#languageSelect');
const demoFrame = document.querySelector('#demoFrame');
const simulateButton = document.querySelector('#simulateButton');
const simResult = document.querySelector('#simResult');
const copySample = document.querySelector('#copySample');
const startButton = document.querySelector('#startButton');
let activeLanguage = 'en';

function resolveLanguage(value) {
    const code = String(value || '').toLowerCase().split('-')[0];
    return SUPPORTED_LANGUAGES.includes(code) ? code : 'en';
}

function setLanguage(language) {
    activeLanguage = resolveLanguage(language);
    const content = translations[activeLanguage] || translations.en;
    document.documentElement.lang = activeLanguage;
    document.title = content.title;
    languageSelect.value = activeLanguage;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
        const value = content[element.dataset.i18n] ?? translations.en[element.dataset.i18n];
        if (value) element.textContent = value;
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
        const value = content[element.dataset.i18nAriaLabel] ?? translations.en[element.dataset.i18nAriaLabel];
        if (value) element.setAttribute('aria-label', value);
    });
    localStorage.setItem('promptcard-language', activeLanguage);
}

function runSimulation() {
    demoFrame.classList.remove('is-running');
    simResult.hidden = true;
    void demoFrame.offsetWidth;
    demoFrame.classList.add('is-running');
    window.setTimeout(() => { simResult.hidden = false; copySample.focus(); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700);
}

languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));
simulateButton.addEventListener('click', runSimulation);
copySample.addEventListener('click', async () => {
    const prompt = translations[activeLanguage].samplePrompt;
    try { await navigator.clipboard.writeText(prompt); } catch { /* Clipboard can be unavailable on extension/local pages. */ }
    copySample.textContent = translations[activeLanguage].copied;
    window.setTimeout(() => { copySample.textContent = translations[activeLanguage].copy; }, 1300);
});
startButton.addEventListener('click', () => {
    window.close();
    window.setTimeout(() => { window.location.href = 'index.html'; }, 120);
});

setLanguage(localStorage.getItem('promptcard-language') || navigator.language || 'en');
