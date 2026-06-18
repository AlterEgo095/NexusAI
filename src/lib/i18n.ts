/* ═══════════════════════════════════════════════════════════════
   NexusAI — Lightweight i18n System (client-side)
   Supports: fr (default), en, es, de, ar, zh
   ═══════════════════════════════════════════════════════════════ */

import fr from './translations/fr'
import en from './translations/en'
import es from './translations/es'
import de from './translations/de'
import ar from './translations/ar'
import zh from './translations/zh'

export type Locale = 'fr' | 'en' | 'es' | 'de' | 'ar' | 'zh'

export const LOCALES: Array<{ code: Locale; label: string; flag: string; dir?: 'ltr' | 'rtl' }> = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
]

const translations: Record<Locale, Record<string, string>> = { fr, en, es, de, ar, zh }

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] || translations.fr[key] || key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return text
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function getLocaleFromStorage(): Locale {
  if (typeof window === 'undefined') return 'fr'
  const stored = localStorage.getItem('nexusai-locale')
  if (stored && stored in translations) return stored as Locale
  return 'fr'
}