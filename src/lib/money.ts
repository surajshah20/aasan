import { AppLanguage } from '../types';

export function formatPrice(amount: number, lang: AppLanguage = 'en'): string {
  try {
    const formatted = new Intl.NumberFormat('en-NP', {
      maximumFractionDigits: 0,
    }).format(amount);

    if (lang === 'ne') {
      return `रू ${formatted}`;
    }
    return `NPR ${formatted}`;
  } catch {
    return lang === 'ne' ? `रू ${amount}` : `NPR ${amount}`;
  }
}
