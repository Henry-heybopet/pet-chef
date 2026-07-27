import React, { createContext, useContext, useState, useEffect } from 'react';

const LANGS = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

const LanguageContext = createContext();
const normalizeLang = value => LANGS.some(item => item.code === value) ? value : 'zh';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => normalizeLang(localStorage.getItem('heybo_lang')));
  const setLang = (value) => { const next = normalizeLang(value); setLangState(next); localStorage.setItem('heybo_lang', next); };
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang; }, [lang]);
  return <LanguageContext.Provider value={{ lang, setLang, LANGS }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
export { LANGS };
