import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import zh from '../locales/zh.json'

export type Language = 'en' | 'zh'

const STORAGE_KEY = 'language'

function readSavedLanguage(): Language {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'en' || v === 'zh') return v
  // First run: pick zh if browser locale starts with 'zh', else en.
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: readSavedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: Language): void {
  localStorage.setItem(STORAGE_KEY, lang)
  i18n.changeLanguage(lang)
}

export function getCurrentLanguage(): Language {
  return (i18n.language as Language) ?? 'en'
}

export default i18n
