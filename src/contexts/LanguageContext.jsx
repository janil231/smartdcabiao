import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, languages } from '../i18n'

const STORAGE_KEY = 'smartdcabiao:lang'

const LanguageContext = createContext(null)

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj)
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && (stored === 'en' || stored === 'fil')) {
        return stored
      }
    }
    return 'en'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])

  const changeLanguage = useCallback((newLang) => {
    if (newLang === 'en' || newLang === 'fil') {
      setLang(newLang)
    }
  }, [])

  const t = useCallback((path, params = {}) => {
    const selectedTranslations = translations[lang] || translations.en
    
    let value = getNestedValue(selectedTranslations, path)
    
    if (value === undefined) {
      value = getNestedValue(translations.en, path)
    }
    
    if (value === undefined) {
      return path
    }
    
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (_, key) => {
        return params[key] !== undefined ? params[key] : `{${key}}`
      })
    }
    
    return value
  }, [lang])

  const formatDate = useCallback((date) => {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    const locale = lang === 'fil' ? 'fil-PH' : 'en-US'
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  }, [lang])

  const formatDateTime = useCallback((date) => {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    const locale = lang === 'fil' ? 'fil-PH' : 'en-US'
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }, [lang])

  const formatNumber = useCallback((num) => {
    if (num === undefined || num === null) return '0'
    const locale = lang === 'fil' ? 'fil-PH' : 'en-US'
    return new Intl.NumberFormat(locale).format(num)
  }, [lang])

  const value = {
    lang,
    changeLanguage,
    t,
    formatDate,
    formatDateTime,
    formatNumber,
    languages,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
