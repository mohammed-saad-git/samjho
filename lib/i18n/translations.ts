import type { LanguageCode } from './languages';

export interface UIStrings {
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
