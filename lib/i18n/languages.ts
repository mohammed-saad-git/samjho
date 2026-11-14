export type LanguageCode = 'en' | 'hi' | 'kn' | 'ta' | 'te';

export interface LanguageConfig {
  code: LanguageCode;
  englishName: string;
  nativeName: string;
  speechLang: string;
  speechPrefixes: readonly string[];
  fontClass: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageConfig[] = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    speechLang: 'en-IN',
    speechPrefixes: ['en-in', 'en-gb', 'en-us', 'en'],
    fontClass: 'font-sans',
  },
  {
    code: 'hi',
    englishName: 'Hindi',
    nativeName: 'हिन्दी',
    speechLang: 'hi-IN',
    speechPrefixes: ['hi-in', 'hi'],
    fontClass: 'font-indic-hi',
  },
  {
    code: 'kn',
    englishName: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    speechLang: 'kn-IN',
    speechPrefixes: ['kn-in', 'kn'],
    fontClass: 'font-indic-kn',
  },
  {
    code: 'ta',
    englishName: 'Tamil',
    nativeName: 'தமிழ்',
    speechLang: 'ta-IN',
    speechPrefixes: ['ta-in', 'ta-lk', 'ta-sg', 'ta'],
    fontClass: 'font-indic-ta',
  },
  {
    code: 'te',
    englishName: 'Telugu',
    nativeName: 'తెలుగు',
    speechLang: 'te-IN',
    speechPrefixes: ['te-in', 'te'],
    fontClass: 'font-indic-te',
  },
];

export function getLanguageConfig(code: LanguageCode): LanguageConfig {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0]!;
}
