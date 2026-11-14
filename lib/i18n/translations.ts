import type { SampleId } from '../samples';
import type { LanguageCode } from './languages';

export interface LocalizedSampleCopy {
  title: string;
  subtitle: string;
  identifiersSummary: string;
}

export interface UIStrings {
  // Header & shell
  appSubtitle: string;
  appTagline: string;
  languageSwitcherLabel: string;
  highContrastLabel: string;
  largeTextLabel: string;
  inspectPayloadLabel: string;
  clearSessionLabel: string;
  footerSessionPrefix: string;
  footerNoDocLoaded: string;
  footerPrivacySummary: string;

  // Three-step how handled strip
  howHandledHeading: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;

  // Upload & samples
  uploadHeading: string;
  uploadLead: string;
  dropzonePrompt: string;
  dropzoneFormats: string;
  chooseFileButton: string;
  takePhotoButton: string;
  samplesHeading: string;
  samples: Record<SampleId, LocalizedSampleCopy>;

  // Privacy score bar
  statusNotSent: string;
  statusSent: string;
  privacyScoreLabel: string;
  privacyScoreTooltipHelp: string;
  highRiskRemainingWarning: string;
  noIdentifiersDetected: string;
  removedSingleSummary: string;
  removedListSummary: string;

  // Split workspace
  originalPaneTitle: string;
  staysOnDeviceLabel: string;
  redactedPaneTitle: string;
  mobileTabOriginal: string;
  mobileTabRedacted: string;
  charsSuffix: string;

  // Findings table
  findingsHeading: string;
  noFindingsMessage: string;
  colCategory: string;
  colCount: string;
  colTokens: string;
  colConfidence: string;
  colSeverity: string;
  severityHigh: string;
  severityMedium: string;

  // Explain controls & results
  chooseLanguageHeading: string;
  confirmExplainPrefix: string;
  explainingButton: string;
  retryButton: string;
  networkErrorFallback: string;
  errorByCode: Record<
    | 'RATE_LIMITED'
    | 'MODEL_UNAVAILABLE'
    | 'AUTH_FAILED'
    | 'UPSTREAM_ERROR'
    | 'TIMEOUT'
    | 'BAD_MODEL_OUTPUT',
    string
  >;
  showRealDetailsLabel: string;
  sampleTag: string;
  liveTag: string;
  runLiveApiLabel: string;
  runningLiveApiLabel: string;
  noAmountsFound: string;
  noDeadlinesFound: string;
  disclaimerText: string;
  whatsappNote: string;

  // Existing section & action strings
  sectionSummary: string;
  sectionKeyFacts: string;
  sectionAmounts: string;
  sectionDeadlines: string;
  sectionWatchOuts: string;
  sectionNextSteps: string;
  sectionDraftReply: string;
  listenLabel: string;
  stopAudioLabel: string;
  voiceUnavailable: string;
  copyReplyLabel: string;
  copiedReplyLabel: string;
  shareWhatsappLabel: string;
}

export const UI_TRANSLATIONS: Record<LanguageCode, UIStrings> = {
  en: {
    appSubtitle: 'Official Document Reader',
    appTagline:
      'Plain-language explanations for bills, bank notices, and letters. Identifiers are removed on this device.',
    languageSwitcherLabel: 'Choose interface and explanation language',
    highContrastLabel: 'High contrast',
    largeTextLabel: 'Large text',
    inspectPayloadLabel: 'Inspect payload',
    clearSessionLabel: 'Clear session',
    footerSessionPrefix: 'Samjho · Identifiers stay in browser memory for this session only',
    footerNoDocLoaded: 'no document loaded',
    footerPrivacySummary: 'Memory only · No localStorage · No tracking',

    howHandledHeading: 'How your document is handled',
    step1Title: '1. Read on this device',
    step1Body: 'PDF text or photo OCR runs locally in your browser.',
    step2Title: '2. Remove identifiers on this device',
    step2Body: 'Aadhaar, PAN, phone, account numbers, and names are masked before leaving.',
    step3Title: '3. Only redacted text is sent',
    step3Body:
      'Only redacted text is sent for explanation, and your real details are restored locally.',

    uploadHeading: 'Upload your document',
    uploadLead: 'Open a PDF or camera photo to scan and redact personal details.',
    dropzonePrompt: 'Drop a PDF or photo here, or choose from your device',
    dropzoneFormats: 'Digital or scanned PDF, PNG, JPG, WEBP (up to 15 MB)',
    chooseFileButton: 'Choose PDF or image',
    takePhotoButton: 'Take a photo',
    samplesHeading: 'No document handy? Try a sample.',
    samples: {
      'electricity-bill': {
        title: 'Electricity bill with arrears',
        subtitle: 'PDF · Dakshin Bharat Power',
        identifiersSummary:
          'Contains consumer name, consumer number, Aadhaar, mobile, email, UPI ID, and address.',
      },
      'bank-loan-notice': {
        title: 'Bank overdue loan notice',
        subtitle: 'PDF · Bharatiya Cooperative Bank',
        identifiersSummary:
          'Contains borrower name, loan account, PAN, date of birth, IFSC, mobile, and address.',
      },
      'rental-agreement': {
        title: 'Rental agreement excerpt',
        subtitle: 'PDF · Residential Leave & License',
        identifiersSummary:
          'Contains landlord and tenant names, two Aadhaar numbers, PAN, passport, mobile, email, and address.',
      },
      'government-notice': {
        title: 'Scholarship notice (photo)',
        subtitle: 'PNG photo · On-device OCR',
        identifiersSummary:
          'Contains applicant name, application ID, Aadhaar, date of birth, mobile, bank account, IFSC, and address.',
      },
    },

    statusNotSent: 'Nothing has been sent yet.',
    statusSent: 'Only redacted text was sent. Real details stay on this device.',
    privacyScoreLabel: 'Privacy score',
    privacyScoreTooltipHelp: 'How the privacy score is calculated',
    highRiskRemainingWarning:
      'One or more high-severity identifiers remain unredacted in the outgoing text. Re-enable redaction before sending.',
    noIdentifiersDetected: 'No personal identifiers were detected.',
    removedSingleSummary: 'removed on this device before anything is sent.',
    removedListSummary: 'removed on this device before anything is sent.',

    originalPaneTitle: 'Original document (click any word to toggle)',
    staysOnDeviceLabel: 'stays on device',
    redactedPaneTitle: 'What the AI will see',
    mobileTabOriginal: 'Original (tap to edit)',
    mobileTabRedacted: 'What the AI will see',
    charsSuffix: 'chars',

    findingsHeading: 'Identifiers detected and masked on device',
    noFindingsMessage:
      'No personal identifiers are currently marked for redaction. Click any word in the original document above to mask it manually.',
    colCategory: 'Category',
    colCount: 'Count',
    colTokens: 'Session tokens',
    colConfidence: 'Confidence',
    colSeverity: 'Severity',
    severityHigh: 'High',
    severityMedium: 'Medium',

    chooseLanguageHeading: 'Explanation language',
    confirmExplainPrefix: 'Confirm and explain in',
    explainingButton: 'Explaining document…',
    retryButton: 'Retry',
    networkErrorFallback:
      'Unable to reach the explanation service. Check your connection and try again.',
    errorByCode: {
      RATE_LIMITED: 'The service is busy. Try again in a minute.',
      MODEL_UNAVAILABLE:
        'The explanation model is currently unavailable. Please try again shortly.',
      AUTH_FAILED: 'The explanation service could not authenticate with the AI provider.',
      UPSTREAM_ERROR: 'The explanation service encountered an upstream error. Please try again.',
      TIMEOUT: 'The explanation request timed out. Please try again.',
      BAD_MODEL_OUTPUT: 'The AI returned an incomplete or unreadable response. Please try again.',
    },
    showRealDetailsLabel: 'Show real details locally',
    sampleTag: 'sample, pre-generated',
    liveTag: 'live AI response',
    runLiveApiLabel: 'Run live API instead',
    runningLiveApiLabel: 'Running live API…',
    noAmountsFound: 'No monetary amounts mentioned.',
    noDeadlinesFound: 'No specific deadlines found.',
    disclaimerText:
      'Samjho explains paperwork in plain language and helps organize next steps. It does not provide legal, medical, or financial advice.',
    whatsappNote:
      'Includes only the summary, amounts, and next steps. Never includes redacted identifiers.',

    sectionSummary: 'Plain-language summary',
    sectionKeyFacts: 'Key facts',
    sectionAmounts: 'Amounts mentioned',
    sectionDeadlines: 'Deadlines & important dates',
    sectionWatchOuts: 'What to check carefully',
    sectionNextSteps: 'Recommended next steps',
    sectionDraftReply: 'Draft reply letter',
    listenLabel: 'Listen to summary',
    stopAudioLabel: 'Stop reading',
    voiceUnavailable:
      'No browser speech voice is installed for this language on your device. You can still read the full explanation below.',
    copyReplyLabel: 'Copy draft reply',
    copiedReplyLabel: 'Copied to clipboard',
    shareWhatsappLabel: 'Share safe summary on WhatsApp',
  },

  hi: {
    appSubtitle: 'सरकारी व आधिकारिक दस्तावेज़ रीडर',
    appTagline:
      'बिजली बिल, बैंक नोटिस और पत्रों की सरल व्याख्या। व्यक्तिगत पहचान इस डिवाइस पर हटा दी जाती है।',
    languageSwitcherLabel: 'भाषा चुनें',
    highContrastLabel: 'उच्च कंट्रास्ट',
    largeTextLabel: 'बड़ा फ़ॉन्ट',
    inspectPayloadLabel: 'डेटा जाँचें',
    clearSessionLabel: 'सत्र साफ़ करें',
    footerSessionPrefix: 'समझो · आपकी पहचान केवल इसी ब्राउज़र मेमोरी में रहती है',
    footerNoDocLoaded: 'कोई दस्तावेज़ नहीं चुना गया',
    footerPrivacySummary: 'केवल मेमोरी · कोई localStorage नहीं · कोई ट्रैकिंग नहीं',

    howHandledHeading: 'आपका दस्तावेज़ कैसे संभाला जाता है',
    step1Title: '1. इसी डिवाइस पर पढ़ाई',
    step1Body: 'PDF टेक्स्ट या फ़ोटो OCR आपके ब्राउज़र में ही चलता है।',
    step2Title: '2. डिवाइस पर पहचान हटाना',
    step2Body: 'नाम, आधार, पैन, फ़ोन और खाता संख्या इस डिवाइस पर ही छिपाए जाते हैं।',
    step3Title: '3. केवल संशोधित पाठ भेजना',
    step3Body: 'व्याख्या के लिए केवल संशोधित पाठ भेजा जाता है और विवरण यहीं वापस जोड़ा जाता है।',

    uploadHeading: 'अपना दस्तावेज़ अपलोड करें',
    uploadLead: 'व्यक्तिगत विवरण छिपाने और समझने के लिए PDF या फ़ोटो चुनें।',
    dropzonePrompt: 'यहाँ PDF या फ़ोटो छोड़ें, या डिवाइस से चुनें',
    dropzoneFormats: 'डिजिटल या स्कैन PDF, PNG, JPG, WEBP (15 MB तक)',
    chooseFileButton: 'PDF या फ़ोटो चुनें',
    takePhotoButton: 'फ़ोटो खींचें',
    samplesHeading: 'दस्तावेज़ पास नहीं है? नमूना आज़माएँ।',
    samples: {
      'electricity-bill': {
        title: 'बकाया राशि वाला बिजली बिल',
        subtitle: 'PDF · दक्षिण भारत पावर',
        identifiersSummary: 'इसमें नाम, उपभोक्ता संख्या, आधार, मोबाइल, ईमेल, UPI आईडी और पता शामिल है।',
      },
      'bank-loan-notice': {
        title: 'बैंक ऋण बकाया नोटिस',
        subtitle: 'PDF · भारतीय कोऑपरेटिव बैंक',
        identifiersSummary: 'इसमें नाम, लोन खाता संख्या, पैन, जन्म तिथि, IFSC, मोबाइल और पता शामिल है।',
      },
      'rental-agreement': {
        title: 'किराया अनुबंध अंश',
        subtitle: 'PDF · आवासीय लीव एंड लाइसेंस',
        identifiersSummary:
          'इसमें मकान मालिक व किरायेदार के नाम, दो आधार, पैन, पासपोर्ट, मोबाइल, ईमेल और पता है।',
      },
      'government-notice': {
        title: 'छात्रवृत्ति सत्यापन नोटिस (फ़ोटो)',
        subtitle: 'PNG फ़ोटो · डिवाइस पर OCR',
        identifiersSummary:
          'इसमें आवेदक का नाम, आवेदन संख्या, आधार, जन्म तिथि, मोबाइल, बैंक खाता, IFSC और पता है।',
      },
    },

    statusNotSent: 'अभी तक कुछ भी बाहर नहीं भेजा गया है।',
    statusSent: 'केवल संशोधित पाठ भेजा गया। असली विवरण इस डिवाइस पर ही रहे।',
    privacyScoreLabel: 'गोपनीयता स्कोर',
    privacyScoreTooltipHelp: 'गोपनीयता स्कोर की गणना कैसे होती है',
    highRiskRemainingWarning:
      'बाहर जाने वाले पाठ में उच्च-जोखिम वाली पहचान अभी भी खुली है। भेजने से पहले फिर से छिपाएँ।',
    noIdentifiersDetected: 'कोई व्यक्तिगत पहचान नहीं मिली।',
    removedSingleSummary: 'भेजने से पहले इस डिवाइस पर हटा दिया गया है।',
    removedListSummary: 'भेजने से पहले इस डिवाइस पर हटा दिए गए हैं।',

    originalPaneTitle: 'मूल दस्तावेज़ (बदलने के लिए किसी शब्द पर क्लिक करें)',
    staysOnDeviceLabel: 'डिवाइस पर ही रहता है',
    redactedPaneTitle: 'AI को क्या दिखाई देगा',
    mobileTabOriginal: 'मूल पाठ (टैप करें)',
    mobileTabRedacted: 'AI को क्या दिखेगा',
    charsSuffix: 'अक्षर',

    findingsHeading: 'डिवाइस पर पहचानी और छिपाई गई जानकारी',
    noFindingsMessage:
      'अभी कोई व्यक्तिगत पहचान छिपाई नहीं गई है। किसी शब्द को छिपाने के लिए ऊपर मूल पाठ में उस पर क्लिक करें।',
    colCategory: 'श्रेणी',
    colCount: 'संख्या',
    colTokens: 'सत्र टोकन',
    colConfidence: 'सटीकता',
    colSeverity: 'जोखिम',
    severityHigh: 'उच्च',
    severityMedium: 'मध्यम',

    chooseLanguageHeading: 'व्याख्या की भाषा',
    confirmExplainPrefix: 'पुष्टि करें और समझाएँ:',
    explainingButton: 'दस्तावेज़ समझाया जा रहा है…',
    retryButton: 'फिर कोशिश करें',
    networkErrorFallback: 'व्याख्या सेवा से संपर्क नहीं हो सका। कृपया फिर प्रयास करें।',
    errorByCode: {
      RATE_LIMITED: 'सेवा अभी व्यस्त है। एक मिनट बाद फिर कोशिश करें।',
      MODEL_UNAVAILABLE: 'व्याख्या मॉडल अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें।',
      AUTH_FAILED: 'व्याख्या सेवा AI प्रदाता से प्रमाणित नहीं हो सकी।',
      UPSTREAM_ERROR: 'व्याख्या सेवा में तकनीकी त्रुटि आई। कृपया फिर प्रयास करें।',
      TIMEOUT: 'व्याख्या अनुरोध की समय-सीमा समाप्त हो गई। कृपया फिर प्रयास करें।',
      BAD_MODEL_OUTPUT: 'AI से अधूरा या अस्पष्ट उत्तर मिला। कृपया फिर प्रयास करें।',
    },
    showRealDetailsLabel: 'असली विवरण यहीं दिखाएँ',
    sampleTag: 'नमूना, पूर्व-जनित',
    liveTag: 'लाइव AI उत्तर',
    runLiveApiLabel: 'लाइव API से चलाएँ',
    runningLiveApiLabel: 'लाइव API चल रहा है…',
    noAmountsFound: 'कोई धनराशि उल्लिखित नहीं है।',
    noDeadlinesFound: 'कोई निश्चित अंतिम तिथि नहीं मिली।',
    disclaimerText: 'समझो दस्तावेज़ को सरल भाषा में समझाता है। यह कानूनी, चिकित्सा या वित्तीय सलाह नहीं देता।',
    whatsappNote: 'इसमें केवल सारांश, राशियाँ और अगले कदम शामिल हैं—छिपाई गई पहचान कभी नहीं भेजी जाती।',

    sectionSummary: 'सरल भाषा में सारांश',
    sectionKeyFacts: 'मुख्य तथ्य',
    sectionAmounts: 'उल्लिखित राशियाँ',
    sectionDeadlines: 'अंतिम तिथियाँ और महत्वपूर्ण दिनांक',
    sectionWatchOuts: 'ध्यान देने योग्य बातें',
    sectionNextSteps: 'अगले कदम',
    sectionDraftReply: 'उत्तर पत्र का प्रारूप',
    listenLabel: 'सारांश सुनें',
    stopAudioLabel: 'पढ़ना रोकें',
    voiceUnavailable: 'आपके डिवाइस के ब्राउज़र में हिन्दी आवाज़ उपलब्ध नहीं है। आप नीचे पूरा विवरण पढ़ सकते हैं।',
    copyReplyLabel: 'प्रारूप कॉपी करें',
    copiedReplyLabel: 'क्लिपबोर्ड पर कॉपी हो गया',
    shareWhatsappLabel: 'WhatsApp पर सुरक्षित सारांश साझा करें',
  },

  kn: {
    appSubtitle: 'ಅಧಿಕೃತ ದಾಖಲೆ ಓದುಗ',
    appTagline:
      'ಬಿಲ್‌ಗಳು, ಬ್ಯಾಂಕ್ ನೋಟಿಸ್‌ಗಳು ಮತ್ತು ಪತ್ರಗಳ ಸರಳ ವಿವರಣೆ. ವೈಯಕ್ತಿಕ ವಿವರಗಳನ್ನು ಈ ಸಾಧನದಲ್ಲೇ ಮರೆಮಾಡಲಾಗುತ್ತದೆ.',
    languageSwitcherLabel: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    highContrastLabel: 'ಹೆಚ್ಚಿನ ಕಾಂಟ್ರಾಸ್ಟ್',
    largeTextLabel: 'ದೊಡ್ಡ ಅಕ್ಷರ',
    inspectPayloadLabel: 'ಕಳುಹಿಸುವ ಡೇಟಾ ನೋಡಿ',
    clearSessionLabel: 'ಸೆಷನ್ ಅಳಿಸಿ',
    footerSessionPrefix: 'ಸಂಝೋ · ಗುರುತಿನ ವಿವರಗಳು ಈ ಬ್ರೌಸರ್ ಮೆಮೊರಿಯಲ್ಲಿ ಮಾತ್ರ ಇರುತ್ತವೆ',
    footerNoDocLoaded: 'ಯಾವುದೇ ದಾಖಲೆ ತೆರೆದಿಲ್ಲ',
    footerPrivacySummary: 'ಮೆಮೊರಿ ಮಾತ್ರ · localStorage ಇಲ್ಲ · ಟ್ರ್ಯಾಕಿಂಗ್ ಇಲ್ಲ',

    howHandledHeading: 'ನಿಮ್ಮ ದಾಖಲೆಯನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ',
    step1Title: '1. ಈ ಸಾಧನದಲ್ಲೇ ಓದುವಿಕೆ',
    step1Body: 'PDF ಪಠ್ಯ ಅಥವಾ ಫೋಟೋ OCR ನಿಮ್ಮ ಬ್ರೌಸರ್ ಒಳಗೇ ನಡೆಯುತ್ತದೆ.',
    step2Title: '2. ಸಾಧನದಲ್ಲೇ ಗುರುತು ಮರೆಮಾಚುವಿಕೆ',
    step2Body: 'ಹೆಸರು, ಆಧಾರ್, ಪ್ಯಾನ್, ಫೋನ್ ಮತ್ತು ಖಾತೆ ಸಂಖ್ಯೆಗಳನ್ನು ಈ ಸಾಧನದಲ್ಲೇ ತೆಗೆದುಹಾಕಲಾಗುತ್ತದೆ.',
    step3Title: '3. ಮರೆಮಾಚಿದ ಪಠ್ಯ ಮಾತ್ರ ಕಳುಹಿಸಲಾಗುತ್ತದೆ',
    step3Body:
      'ವಿವರಣೆಗಾಗಿ ಮರೆಮಾಚಿದ ಪಠ್ಯವನ್ನು ಮಾತ್ರ ಕಳುಹಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ನಿಜವಾದ ವಿವರಗಳನ್ನು ಇಲ್ಲಿಯೇ ಮರುಸ್ಥಾಪಿಸಲಾಗುತ್ತದೆ.',

    uploadHeading: 'ನಿಮ್ಮ ದಾಖಲೆಯನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    uploadLead: 'ವೈಯಕ್ತಿಕ ವಿವರಗಳನ್ನು ಮರೆಮಾಡಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು PDF ಅಥವಾ ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ.',
    dropzonePrompt: 'ಇಲ್ಲಿ PDF ಅಥವಾ ಫೋಟೋ ಹಾಕಿ, ಅಥವಾ ಸಾಧನದಿಂದ ಆಯ್ಕೆಮಾಡಿ',
    dropzoneFormats: 'ಡಿಜಿಟಲ್ ಅಥವಾ ಸ್ಕ್ಯಾನ್ PDF, PNG, JPG, WEBP (15 MB ವರೆಗೆ)',
    chooseFileButton: 'PDF ಅಥವಾ ಚಿತ್ರ ಆಯ್ಕೆಮಾಡಿ',
    takePhotoButton: 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    samplesHeading: 'ದಾಖಲೆ ಕೈಯಲ್ಲಿ ಇಲ್ಲವೇ? ಮಾದರಿಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.',
    samples: {
      'electricity-bill': {
        title: 'ಬಾಕಿ ಮೊತ್ತವಿರುವ ವಿದ್ಯುತ್ ಬಿಲ್',
        subtitle: 'PDF · ದಕ್ಷಿಣ ಭಾರತ್ ಪವರ್',
        identifiersSummary: 'ಹೆಸರು, ಗ್ರಾಹಕ ಸಂಖ್ಯೆ, ಆಧಾರ್, ಮೊಬೈಲ್, ಇಮೇಲ್, UPI ಐಡಿ ಮತ್ತು ವಿಳಾಸವನ್ನು ಒಳಗೊಂಡಿದೆ.',
      },
      'bank-loan-notice': {
        title: 'ಬ್ಯಾಂಕ್ ಸಾಲದ ಬಾಕಿ ನೋಟಿಸ್',
        subtitle: 'PDF · ಭಾರತೀಯ ಕೋಆಪರೇಟಿವ್ ಬ್ಯಾಂಕ್',
        identifiersSummary:
          'ಸಾಲಗಾರರ ಹೆಸರು, ಸಾಲದ ಖಾತೆ, PAN, ಹುಟ್ಟಿದ ದಿನಾಂಕ, IFSC, ಮೊಬೈಲ್ ಮತ್ತು ವಿಳಾಸವನ್ನು ಒಳಗೊಂಡಿದೆ.',
      },
      'rental-agreement': {
        title: 'ಬಾಡಿಗೆ ಒಪ್ಪಂದದ ಭಾಗ',
        subtitle: 'PDF · ವಸತಿ ಬಾಡಿಗೆ ಕರಾರು',
        identifiersSummary:
          'ಮಾಲೀಕ ಮತ್ತು ಬಾಡಿಗೆದಾರರ ಹೆಸರುಗಳು, ಎರಡು ಆಧಾರ್ ಸಂಖ್ಯೆಗಳು, PAN, ಪಾಸ್‌ಪೋರ್ಟ್, ಮೊಬೈಲ್, ಇಮೇಲ್ ಮತ್ತು ವಿಳಾಸವಿದೆ.',
      },
      'government-notice': {
        title: 'ವಿದ್ಯಾರ್ಥಿವೇತನ ನೋಟಿಸ್ (ಫೋಟೋ)',
        subtitle: 'PNG ಫೋಟೋ · ಸಾಧನದಲ್ಲೇ OCR',
        identifiersSummary:
          'ಅರ್ಜಿದಾರರ ಹೆಸರು, ಅರ್ಜಿ ಸಂಖ್ಯೆ, ಆಧಾರ್, ಹುಟ್ಟಿದ ದಿನಾಂಕ, ಮೊಬೈಲ್, ಬ್ಯಾಂಕ್ ಖಾತೆ, IFSC ಮತ್ತು ವಿಳಾಸವಿದೆ.',
      },
    },

    statusNotSent: 'ಇನ್ನೂ ಯಾವುದನ್ನೂ ಕಳುಹಿಸಲಾಗಿಲ್ಲ.',
    statusSent: 'ಮರೆಮಾಚಿದ ಪಠ್ಯವನ್ನು ಮಾತ್ರ ಕಳುಹಿಸಲಾಗಿದೆ. ನಿಜವಾದ ವಿವರಗಳು ಇದೇ ಸಾಧನದಲ್ಲಿವೆ.',
    privacyScoreLabel: 'ಗೌಪ್ಯತೆ ಸ್ಕೋರ್',
    privacyScoreTooltipHelp: 'ಗೌಪ್ಯತೆ ಸ್ಕೋರ್ ಹೇಗೆ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ',
    highRiskRemainingWarning:
      'ಹೊರಹೋಗುವ ಪಠ್ಯದಲ್ಲಿ ಹೆಚ್ಚಿನ ಅಪಾಯದ ಗುರುತುಗಳು ಇನ್ನೂ ಕಾಣಿಸುತ್ತಿವೆ. ಕಳುಹಿಸುವ ಮೊದಲು ಮರೆಮಾಡಿ.',
    noIdentifiersDetected: 'ಯಾವುದೇ ವೈಯಕ್ತಿಕ ಗುರುತುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
    removedSingleSummary: 'ಹೊರಗೆ ಕಳುಹಿಸುವ ಮೊದಲು ಈ ಸಾಧನದಲ್ಲೇ ತೆಗೆದುಹಾಕಲಾಗಿದೆ.',
    removedListSummary: 'ಹೊರಗೆ ಕಳುಹಿಸುವ ಮೊದಲು ಈ ಸಾಧನದಲ್ಲೇ ತೆಗೆದುಹಾಕಲಾಗಿದೆ.',

    originalPaneTitle: 'ಮೂಲ ದಾಖಲೆ (ಬದಲಾಯಿಸಲು ಪದವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ)',
    staysOnDeviceLabel: 'ಸಾಧನದಲ್ಲೇ ಉಳಿಯುತ್ತದೆ',
    redactedPaneTitle: 'AI ಗೆ ಕಾಣಿಸುವ ಪಠ್ಯ',
    mobileTabOriginal: 'ಮೂಲ (ತಿದ್ದುಪಡಿ ಮಾಡಿ)',
    mobileTabRedacted: 'AI ಗೆ ಕಾಣಿಸುವ ಪಠ್ಯ',
    charsSuffix: 'ಅಕ್ಷರಗಳು',

    findingsHeading: 'ಸಾಧನದಲ್ಲಿ ಗುರುತಿಸಿ ಮರೆಮಾಡಿದ ವಿವರಗಳು',
    noFindingsMessage:
      'ಪ್ರಸ್ತುತ ಯಾವುದೇ ವೈಯಕ್ತಿಕ ಗುರುತನ್ನು ಮರೆಮಾಡಲಾಗಿಲ್ಲ. ಮರೆಮಾಡಲು ಮೇಲಿನ ಮೂಲ ಪಠ್ಯದಲ್ಲಿನ ಪದವನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ.',
    colCategory: 'ವರ್ಗ',
    colCount: 'ಸಂಖ್ಯೆ',
    colTokens: 'ಸೆಷನ್ ಟೋಕನ್‌ಗಳು',
    colConfidence: 'ನಿಖರತೆ',
    colSeverity: 'ತೀವ್ರತೆ',
    severityHigh: 'ಹೆಚ್ಚು',
    severityMedium: 'ಮಧ್ಯಮ',

    chooseLanguageHeading: 'ವಿವರಣೆಯ ಭಾಷೆ',
    confirmExplainPrefix: 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ವಿವರಿಸಿ:',
    explainingButton: 'ದಾಖಲೆಯನ್ನು ವಿವರಿಸಲಾಗುತ್ತಿದೆ…',
    retryButton: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    networkErrorFallback: 'ವಿವರಣೆ ಸೇವೆಯನ್ನು ತಲುಪಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    errorByCode: {
      RATE_LIMITED: 'ಸೇವೆ ಈಗ ಕಾರ್ಯನಿರತವಾಗಿದೆ. ಒಂದು ನಿಮಿಷದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      MODEL_UNAVAILABLE: 'ವಿವರಣೆ ಮಾದರಿ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      AUTH_FAILED: 'ವಿವರಣೆ ಸೇವೆಯು AI ಪೂರೈಕೆದಾರರೊಂದಿಗೆ ದೃಢೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
      UPSTREAM_ERROR: 'ವಿವರಣೆ ಸೇವೆಯಲ್ಲಿ ತಾಂತ್ರಿಕ ದೋಷ ಉಂಟಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      TIMEOUT: 'ವಿವರಣೆ ವಿನಂತಿಯ ಸಮಯ ಮೀರಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      BAD_MODEL_OUTPUT: 'AI ಅಪೂರ್ಣ ಅಥವಾ ಅಸ್ಪಷ್ಟ ಉತ್ತರವನ್ನು ನೀಡಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    },
    showRealDetailsLabel: 'ನಿಜವಾದ ವಿವರಗಳನ್ನು ಇಲ್ಲಿಯೇ ತೋರಿಸಿ',
    sampleTag: 'ಮಾದರಿ, ಪೂರ್ವ-ರಚಿತ',
    liveTag: 'ನೇರ AI ಉತ್ತರ',
    runLiveApiLabel: 'ನೇರ API ಚಲಾಯಿಸಿ',
    runningLiveApiLabel: 'ನೇರ API ಚಾಲನೆಯಲ್ಲಿದೆ…',
    noAmountsFound: 'ಯಾವುದೇ ಹಣದ ಮೊತ್ತ ಕಂಡುಬಂದಿಲ್ಲ.',
    noDeadlinesFound: 'ಯಾವುದೇ ನಿಗದಿತ ಕೊನೆಯ ದಿನಾಂಕ ಕಂಡುಬಂದಿಲ್ಲ.',
    disclaimerText: 'ಸಂಝೋ ದಾಖಲೆಗಳನ್ನು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ವಿವರಿಸುತ್ತದೆ. ಇದು ಕಾನೂನು, ವೈದ್ಯಕೀಯ ಅಥವಾ ಹಣಕಾಸು ಸಲಹೆಯಲ್ಲ.',
    whatsappNote:
      'ಇದು ಕೇವಲ ಸಾರಾಂಶ, ಮೊತ್ತಗಳು ಮತ್ತು ಮುಂದಿನ ಕ್ರಮಗಳನ್ನು ಒಳಗೊಂಡಿದೆ. ಮರೆಮಾಡಿದ ಗುರುತುಗಳನ್ನು ಎಂದಿಗೂ ಸೇರಿಸುವುದಿಲ್ಲ.',

    sectionSummary: 'ಸರಳ ಭಾಷೆಯಲ್ಲಿ ಸಾರಾಂಶ',
    sectionKeyFacts: 'ಮುಖ್ಯ ಸಂಗತಿಗಳು',
    sectionAmounts: 'ಉಲ್ಲೇಖಿಸಲಾದ ಮೊತ್ತಗಳು',
    sectionDeadlines: 'ಕೊನೆಯ ದಿನಾಂಕಗಳು ಮತ್ತು ಪ್ರಮುಖ ದಿನಗಳು',
    sectionWatchOuts: 'ಎಚ್ಚರಿಕೆಯಿಂದ ಗಮನಿಸಬೇಕಾದ ಅಂಶಗಳು',
    sectionNextSteps: 'ಮುಂದಿನ ಕ್ರಮಗಳು',
    sectionDraftReply: 'ಉತ್ತರ ಪತ್ರದ ಕರಡು',
    listenLabel: 'ಸಾರಾಂಶವನ್ನು ಆಲಿಸಿ',
    stopAudioLabel: 'ಓದುವುದನ್ನು ನಿಲ್ಲಿಸಿ',
    voiceUnavailable: 'ನಿಮ್ಮ ಸಾಧನದ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ನೀವು ಕೆಳಗಿನ ಸಂಪೂರ್ಣ ವಿವರಣೆಯನ್ನು ಓದಬಹುದು.',
    copyReplyLabel: 'ಕರಡು ಪತ್ರ ಕಾಪಿ ಮಾಡಿ',
    copiedReplyLabel: 'ಕ್ಲಿಪ್‌ಬೋರ್ಡ್‌ಗೆ ಕಾಪಿ ಮಾಡಲಾಗಿದೆ',
    shareWhatsappLabel: 'WhatsApp ನಲ್ಲಿ ಸುರಕ್ಷಿತ ಸಾರಾಂಶ ಹಂಚಿಕೊಳ್ಳಿ',
  },

  ta: {
    appSubtitle: 'அதிகாரப்பூர்வ ஆவண வாசிப்பாளர்',
    appTagline:
      'பில்கள், வங்கி அறிவிப்புகள் மற்றும் கடிதங்களுக்கான எளிய விளக்கம். தனிப்பட்ட அடையாளங்கள் இந்தச் சாதனத்திலேயே நீக்கப்படும்.',
    languageSwitcherLabel: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    highContrastLabel: 'உயர் மாறுபாடு',
    largeTextLabel: 'பெரிய எழுத்து',
    inspectPayloadLabel: 'தரவைப் பார்',
    clearSessionLabel: 'அமர்வை அழி',
    footerSessionPrefix: 'சம்ஜோ · அடையாள விவரங்கள் இந்த உலாவி நினைவகத்தில் மட்டுமே இருக்கும்',
    footerNoDocLoaded: 'ஆவணம் எதுவும் இல்லை',
    footerPrivacySummary: 'நினைவகம் மட்டும் · localStorage இல்லை · கண்காணிப்பு இல்லை',

    howHandledHeading: 'உங்கள் ஆவணம் எவ்வாறு கையாளப்படுகிறது',
    step1Title: '1. சாதனத்திலேயே படித்தல்',
    step1Body: 'PDF உரை அல்லது புகைப்பட OCR உங்கள் உலாவியிலேயே இயங்கும்.',
    step2Title: '2. அடையாளங்களை நீக்குதல்',
    step2Body: 'ஆதார், பான், தொலைபேசி, கணக்கு எண் மற்றும் பெயர்கள் இந்தச் சாதனத்திலேயே மறைக்கப்படும்.',
    step3Title: '3. மறைக்கப்பட்ட உரை மட்டுமே அனுப்பப்படும்',
    step3Body: 'விளக்கத்திற்காக மறைக்கப்பட்ட உரை மட்டுமே அனுப்பப்படும்; உண்மை விவரங்கள் இங்கேயே மீட்கப்படும்.',

    uploadHeading: 'ஆவணத்தைப் பதிவேற்றவும்',
    uploadLead: 'தனிப்பட்ட விவரங்களை மறைத்துப் புரிந்துகொள்ள PDF அல்லது புகைப்படத்தைத் தேர்ந்தெடுக்கவும்.',
    dropzonePrompt: 'PDF அல்லது புகைப்படத்தை இங்கே விடவும், அல்லது சாதனத்திலிருந்து தேர்ந்தெடுக்கவும்',
    dropzoneFormats: 'டிஜிட்டல் அல்லது ஸ்கேன் PDF, PNG, JPG, WEBP (15 MB வரை)',
    chooseFileButton: 'PDF அல்லது படத்தைத் தேர்ந்தெடு',
    takePhotoButton: 'புகைப்படம் எடு',
    samplesHeading: 'கையில் ஆவணம் இல்லையா? மாதிரியை முயற்சிக்கவும்.',
    samples: {
      'electricity-bill': {
        title: 'நிலுவைத் தொகையுள்ள மின்சார பில்',
        subtitle: 'PDF · தக்ஷிண் பாரத் பவர்',
        identifiersSummary: 'பெயர், நுகர்வோர் எண், ஆதார், கைபேசி, மின்னஞ்சல், UPI ஐடி மற்றும் முகவரி உள்ளது.',
      },
      'bank-loan-notice': {
        title: 'வங்கிக் கடன் நிலுவை அறிவிப்பு',
        subtitle: 'PDF · பாரதீய கூட்டுறவு வங்கி',
        identifiersSummary:
          'கடனாளர் பெயர், கடன் கணக்கு, பான், பிறந்த தேதி, IFSC, கைபேசி மற்றும் முகவரி உள்ளது.',
      },
      'rental-agreement': {
        title: 'வாடகை ஒப்பந்தப் பகுதி',
        subtitle: 'PDF · குடியிருப்பு வாடகை ஒப்பந்தம்',
        identifiersSummary:
          'வீட்டு உரிமையாளர் மற்றும் குத்தகைதாரர் பெயர்கள், இரண்டு ஆதார் எண்கள், பான், பாஸ்போர்ட், கைபேசி, மின்னஞ்சல் மற்றும் முகவரி உள்ளது.',
      },
      'government-notice': {
        title: 'உதவித்தொகை அறிவிப்பு (புகைப்படம்)',
        subtitle: 'PNG படம் · சாதனத்தில் OCR',
        identifiersSummary:
          'விண்ணப்பதாரர் பெயர், விண்ணப்ப எண், ஆதார், பிறந்த தேதி, கைபேசி, வங்கிக் கணக்கு, IFSC மற்றும் முகவரி உள்ளது.',
      },
    },

    statusNotSent: 'இதுவரை எதுவும் அனுப்பப்படவில்லை.',
    statusSent: 'மறைக்கப்பட்ட உரை மட்டுமே அனுப்பப்பட்டது. உண்மை விவரங்கள் சாதனத்திலேயே உள்ளன.',
    privacyScoreLabel: 'தனியுரிமை மதிப்பெண்',
    privacyScoreTooltipHelp: 'தனியுரிமை மதிப்பெண் எவ்வாறு கணக்கிடப்படுகிறது',
    highRiskRemainingWarning:
      'வெளியே செல்லும் உரையில் அதிக ஆபத்துள்ள அடையாளம் இன்னும் உள்ளது. அனுப்புவதற்கு முன் மீண்டும் மறைக்கவும்.',
    noIdentifiersDetected: 'தனிப்பட்ட அடையாளங்கள் எதுவும் கண்டறியப்படவில்லை.',
    removedSingleSummary: 'அனுப்பப்படுவதற்கு முன்பு இந்தச் சாதனத்திலேயே நீக்கப்பட்டது.',
    removedListSummary: 'அனுப்பப்படுவதற்கு முன்பு இந்தச் சாதனத்திலேயே நீக்கப்பட்டன.',

    originalPaneTitle: 'அசல் ஆவணம் (மாற்ற சொல்லைக் கிளிக் செய்யவும்)',
    staysOnDeviceLabel: 'சாதனத்திலேயே இருக்கும்',
    redactedPaneTitle: 'AI பார்க்கும் உரை',
    mobileTabOriginal: 'அசல் (மாற்றத் தட்டவும்)',
    mobileTabRedacted: 'AI பார்க்கும் உரை',
    charsSuffix: 'எழுத்துக்கள்',

    findingsHeading: 'சாதனத்தில் கண்டறிந்து மறைக்கப்பட்ட அடையாளங்கள்',
    noFindingsMessage:
      'தற்போது தனிப்பட்ட அடையாளங்கள் எதுவும் மறைக்கப்படவில்லை. மறைக்க மேலே உள்ள அசல் உரையில் சொல்லைக் கிளிக் செய்யவும்.',
    colCategory: 'வகை',
    colCount: 'எண்ணிக்கை',
    colTokens: 'டோக்கன்கள்',
    colConfidence: 'நம்பகத்தன்மை',
    colSeverity: 'தீவிரம்',
    severityHigh: 'அதிகம்',
    severityMedium: 'நடுத்தரம்',

    chooseLanguageHeading: 'விளக்க மொழி',
    confirmExplainPrefix: 'உறுதிப்படுத்தி விளக்கவும்:',
    explainingButton: 'விளக்கம் உருவாக்கப்படுகிறது…',
    retryButton: 'மீண்டும் முயற்சி செய்',
    networkErrorFallback:
      'விளக்கச் சேவையைத் தொடர்புகொள்ள முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    errorByCode: {
      RATE_LIMITED: 'சேவை இப்போது பரபரப்பாக உள்ளது. ஒரு நிமிடத்தில் மீண்டும் முயற்சிக்கவும்.',
      MODEL_UNAVAILABLE: 'விளக்க மாதிரி தற்போது கிடைக்கவில்லை. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.',
      AUTH_FAILED: 'விளக்கச் சேவையால் AI வழங்குநருடன் அங்கீகாரம் பெற முடியவில்லை.',
      UPSTREAM_ERROR: 'விளக்கச் சேவையில் பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
      TIMEOUT: 'விளக்கக் கோரிக்கை நேரம் முடிந்தது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
      BAD_MODEL_OUTPUT: 'AI முழுமையற்ற அல்லது தெளிவற்ற பதிலை வழங்கியது. மீண்டும் முயற்சிக்கவும்.',
    },
    showRealDetailsLabel: 'உண்மை விவரங்களை இங்கேயே காட்டு',
    sampleTag: 'மாதிரி, முன்-உருவாக்கியது',
    liveTag: 'நேரடி AI பதில்',
    runLiveApiLabel: 'நேரடி API இயக்கு',
    runningLiveApiLabel: 'நேரடி API இயங்குகிறது…',
    noAmountsFound: 'பணத் தொகைகள் எதுவும் இல்லை.',
    noDeadlinesFound: 'குறிப்பிட்ட கடைசி தேதிகள் எதுவும் இல்லை.',
    disclaimerText:
      'சம்ஜோ ஆவணங்களை எளிய மொழியில் விளக்குகிறது. இது சட்ட, மருத்துவ அல்லது நிதி ஆலோசனை அல்ல.',
    whatsappNote:
      'சுருக்கம், தொகைகள் மற்றும் அடுத்த படிகள் மட்டுமே சேர்க்கப்படும்; மறைக்கப்பட்ட அடையாளங்கள் ஒருபோதும் சேர்க்கப்படாது.',

    sectionSummary: 'எளிய மொழியில் சுருக்கம்',
    sectionKeyFacts: 'முக்கிய விவரங்கள்',
    sectionAmounts: 'குறிப்பிடப்பட்ட தொகைகள்',
    sectionDeadlines: 'கடைசி தேதிகள் மற்றும் முக்கிய நாட்கள்',
    sectionWatchOuts: 'கவனமாகச் சரிபார்க்க வேண்டியவை',
    sectionNextSteps: 'அடுத்த நடவடிக்கைகள்',
    sectionDraftReply: 'பதில் கடித வரைவு',
    listenLabel: 'சுருக்கத்தைக் கேளுங்கள்',
    stopAudioLabel: 'வாசிப்பை நிறுத்து',
    voiceUnavailable:
      'உங்கள் சாதனத்தின் உலாவியில் தமிழ் குரல் இல்லை. கீழே உள்ள முழு விளக்கத்தையும் நீங்கள் படிக்கலாம்.',
    copyReplyLabel: 'பதில் வரைவை நகலெடு',
    copiedReplyLabel: 'நகலெடுக்கப்பட்டது',
    shareWhatsappLabel: 'WhatsApp இல் பாதுகாப்பான சுருக்கத்தைப் பகிரவும்',
  },

  te: {
    appSubtitle: 'అధికారిక పత్రాల రీడర్',
    appTagline: 'బిల్లులు, బ్యాంక్ నోటీసులు మరియు లేఖలకు సరళమైన వివరణ. వ్యక్తిగత గుర్తింపులు ఈ పరికరంలోనే తొలగించబడతాయి.',
    languageSwitcherLabel: 'భాషను ఎంచుకోండి',
    highContrastLabel: 'అధిక కాంట్రాస్ట్',
    largeTextLabel: 'పెద్ద అక్షరాలు',
    inspectPayloadLabel: 'పంపే డేటా చూడండి',
    clearSessionLabel: 'సెషన్ క్లియర్ చేయండి',
    footerSessionPrefix: 'సంఝో · వ్యక్తిగత వివరాలు ఈ బ్రౌజర్ మెమరీలో మాత్రమే ఉంటాయి',
    footerNoDocLoaded: 'పత్రం లోడ్ చేయబడలేదు',
    footerPrivacySummary: 'మెమరీ మాత్రమే · localStorage లేదు · ట్రాకింగ్ లేదు',

    howHandledHeading: 'మీ పత్రాన్ని ఎలా నిర్వహిస్తారు',
    step1Title: '1. ఈ పరికరంలోనే చదవడం',
    step1Body: 'PDF టెక్స్ట్ లేదా ఫోటో OCR మీ బ్రౌజర్‌లోనే రన్ అవుతుంది.',
    step2Title: '2. పరికరంలోనే గుర్తింపుల తొలగింపు',
    step2Body: 'ఆధార్, పాన్, ఫోన్, ఖాతా నంబర్లు మరియు పేర్లు ఈ పరికరంలోనే దాచబడతాయి.',
    step3Title: '3. దాచిన పాఠ్యం మాత్రమే పంపబడుతుంది',
    step3Body: 'వివరణ కోసం దాచిన పాఠ్యం మాత్రమే పంపబడుతుంది మరియు అసలు వివరాలు ఇక్కడే పునరుద్ధరించబడతాయి.',

    uploadHeading: 'మీ పత్రాన్ని అప్‌లోడ్ చేయండి',
    uploadLead: 'వ్యక్తిగత వివరాలను దాచి అర్థం చేసుకోవడానికి PDF లేదా ఫోటోను ఎంచుకోండి.',
    dropzonePrompt: 'ఇక్కడ PDF లేదా ఫోటోను వదలండి, లేదా పరికరం నుండి ఎంచుకోండి',
    dropzoneFormats: 'డిజిటల్ లేదా స్కాన్ PDF, PNG, JPG, WEBP (15 MB వరకు)',
    chooseFileButton: 'PDF లేదా చిత్రాన్ని ఎంచుకోండి',
    takePhotoButton: 'ఫోటో తీయండి',
    samplesHeading: 'పత్రం దగ్గర లేదా? నమూనాను ప్రయత్నించండి.',
    samples: {
      'electricity-bill': {
        title: 'బకాయి ఉన్న విద్యుత్ బిల్లు',
        subtitle: 'PDF · దక్షిణ్ భారత్ పవర్',
        identifiersSummary: 'పేరు, వినియోగదారు సంఖ్య, ఆధార్, మొబైల్, ఇమెయిల్, UPI ఐడి మరియు చిరునామా ఉన్నాయి.',
      },
      'bank-loan-notice': {
        title: 'బ్యాంక్ రుణ బకాయి నోటీసు',
        subtitle: 'PDF · భారతీయ కోఆపరేటివ్ బ్యాంక్',
        identifiersSummary: 'రుణగ్రహీత పేరు, లోన్ ఖాతా, పాన్, పుట్టిన తేదీ, IFSC, మొబైల్ మరియు చిరునామా ఉన్నాయి.',
      },
      'rental-agreement': {
        title: 'అద్దె ఒప్పందం భాగం',
        subtitle: 'PDF · నివాస అద్దె కరారు',
        identifiersSummary:
          'యజమాని మరియు అద్దెదారు పేర్లు, రెండు ఆధార్ నంబర్లు, పాన్, పాస్‌పోర్ట్, మొబైల్, ఇమెయిల్ మరియు చిరునామా ఉన్నాయి.',
      },
      'government-notice': {
        title: 'స్కాలర్‌షిప్ నోటీసు (ఫోటో)',
        subtitle: 'PNG ఫోటో · పరికరంలో OCR',
        identifiersSummary:
          'దరఖాస్తుదారు పేరు, దరఖాస్తు సంఖ్య, ఆధార్, పుట్టిన తేదీ, మొబైల్, బ్యాంక్ ఖాతా, IFSC మరియు చిరునామా ఉన్నాయి.',
      },
    },

    statusNotSent: 'ఇంకా ఏమీ బయటకు పంపబడలేదు.',
    statusSent: 'దాచిన పాఠ్యం మాత్రమే పంపబడింది. అసలు వివరాలు ఈ పరికరంలోనే ఉన్నాయి.',
    privacyScoreLabel: 'గోప్యతా స్కోర్',
    privacyScoreTooltipHelp: 'గోప్యతా స్కోర్ ఎలా లెక్కించబడుతుంది',
    highRiskRemainingWarning: 'బయటకు పంపే పాఠ్యంలో అధిక-ప్రమాద గుర్తింపులు ఇంకా ఉన్నాయి. పంపే ముందు మళ్లీ దాచండి.',
    noIdentifiersDetected: 'వ్యక్తిగత గుర్తింపులు ఏవీ కనుగొనబడలేదు.',
    removedSingleSummary: 'పంపడానికి ముందే ఈ పరికరంలో తొలగించబడింది.',
    removedListSummary: 'పంపడానికి ముందే ఈ పరికరంలో తొలగించబడ్డాయి.',

    originalPaneTitle: 'అసలు పత్రం (మార్చడానికి పదాన్ని క్లిక్ చేయండి)',
    staysOnDeviceLabel: 'పరికరంలోనే ఉంటుంది',
    redactedPaneTitle: 'AI చూసే పాఠ్యం',
    mobileTabOriginal: 'అసలు (మార్చడానికి నొక్కండి)',
    mobileTabRedacted: 'AI చూసే పాఠ్యం',
    charsSuffix: 'అక్షరాలు',

    findingsHeading: 'పరికరంలో గుర్తించి దాచిన వివరాలు',
    noFindingsMessage: 'ప్రస్తుతం వ్యక్తిగత వివరాలు ఏవీ దాచబడలేదు. దాచడానికి పైన అసలు పత్రంలోని పదాన్ని క్లిక్ చేయండి.',
    colCategory: 'వర్గం',
    colCount: 'సంఖ్య',
    colTokens: 'సెషన్ టోకెన్లు',
    colConfidence: 'ఖచ్చితత్వం',
    colSeverity: 'తీవ్రత',
    severityHigh: 'ఎక్కువ',
    severityMedium: 'మధ్యస్థం',

    chooseLanguageHeading: 'వివరణ భాష',
    confirmExplainPrefix: 'నిర్ధారించి వివరించండి:',
    explainingButton: 'పత్రాన్ని వివరిస్తోంది…',
    retryButton: 'మళ్లీ ప్రయత్నించండి',
    networkErrorFallback: 'వివరణ సేవను చేరుకోలేకపోయాము. కనెక్షన్‌ని తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
    errorByCode: {
      RATE_LIMITED: 'సేవ ప్రస్తుతం బిజీగా ఉంది. ఒక నిమిషం తర్వాత మళ్లీ ప్రయత్నించండి.',
      MODEL_UNAVAILABLE: 'వివరణ మోడల్ ప్రస్తుతం అందుబాటులో లేదు. కొంతసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.',
      AUTH_FAILED: 'వివరణ సేవ AI ప్రదాతతో ప్రామాణీకరించలేకపోయింది.',
      UPSTREAM_ERROR: 'వివరణ సేవలో లోపం ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
      TIMEOUT: 'వివరణ అభ్యర్థన సమయం ముగిసింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
      BAD_MODEL_OUTPUT: 'AI అసంపూర్ణమైన లేదా చదవలేని సమాధానం ఇచ్చింది. మళ్లీ ప్రయత్నించండి.',
    },
    showRealDetailsLabel: 'అసలు వివరాలను ఇక్కడే చూపించు',
    sampleTag: 'నమూనా, ముందస్తుగా తయారుచేసినది',
    liveTag: 'లైవ్ AI సమాధానం',
    runLiveApiLabel: 'లైవ్ API తో నడపండి',
    runningLiveApiLabel: 'లైవ్ API నడుస్తోంది…',
    noAmountsFound: 'డబ్బు మొత్తాలు ఏవీ లేవు.',
    noDeadlinesFound: 'నిర్దిష్ట చివరి తేదీలు ఏవీ లేవు.',
    disclaimerText: 'సంఝో పత్రాలను సరళమైన భాషలో వివరిస్తుంది. ఇది చట్టపరమైన, వైద్య లేదా ఆర్థిక సలహా కాదు.',
    whatsappNote: 'సారాంశం, మొత్తాలు మరియు తదుపరి చర్యలు మాత్రమే ఉంటాయి; దాచిన వివరాలు ఎప్పుడూ పంపబడవు.',

    sectionSummary: 'సరళమైన భాషలో సారాంశం',
    sectionKeyFacts: 'ముఖ్యమైన వివరాలు',
    sectionAmounts: 'పేర్కొన్న మొత్తాలు',
    sectionDeadlines: 'చివరి తేదీలు మరియు ముఖ్యమైన రోజులు',
    sectionWatchOuts: 'జాగ్రత్తగా గమనించాల్సిన అంశాలు',
    sectionNextSteps: 'తదుపరి చర్యలు',
    sectionDraftReply: 'సమాధాన లేఖ నమూనా',
    listenLabel: 'సారాంశాన్ని వినండి',
    stopAudioLabel: 'చదవడం ఆపండి',
    voiceUnavailable: 'మీ పరికరంలోని బ్రౌజర్‌లో తెలుగు వాయిస్ అందుబాటులో లేదు. మీరు క్రింది పూర్తి వివరణను చదువవచ్చు.',
    copyReplyLabel: 'నమూనాను కాపీ చేయండి',
    copiedReplyLabel: 'క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది',
    shareWhatsappLabel: 'WhatsApp లో సురక్షిత సారాంశాన్ని షేర్ చేయండి',
  },
};
