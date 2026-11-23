import { create } from 'zustand';
import en from './en.json';
import ne from './ne.json';
import { AppLanguage } from '../types';

interface I18nState {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: 'en',
  setLanguage: (language) => set({ language }),
  toggleLanguage: () =>
    set((state) => ({ language: state.language === 'en' ? 'ne' : 'en' })),
}));

const translations = {
  en: en as Record<string, string>,
  ne: ne as Record<string, string>,
};

export function useT() {
  const { language, setLanguage, toggleLanguage } = useI18nStore();

  const t = (key: string): string => {
    const dict = translations[language] || translations.en;
    if (dict[key]) {
      return dict[key];
    }
    // Fallback to English if missing in current dictionary
    if (translations.en[key]) {
      return translations.en[key];
    }
    return key;
  };

  return {
    t,
    language,
    setLanguage,
    toggleLanguage,
  };
}
