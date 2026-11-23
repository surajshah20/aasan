import React from 'react';
import { useT } from '../i18n/useT';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useT();

  return (
    <footer className="w-full border-t border-white/5 bg-[#07080c] py-8 px-4 sm:px-8 text-center text-xs text-muted transition-colors">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-crimson animate-pulse" />
          <span className="font-semibold text-text">Aasan (आसन)</span>
          <span className="text-white/30">•</span>
          <span>{t('app_tagline')}</span>
        </div>

        <div className="flex items-center gap-2 text-muted/80 bg-white/[0.03] px-3.5 py-1.5 rounded-pill border border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-crimson" />
          <span>{t('demo_notice')}</span>
        </div>
      </div>
    </footer>
  );
};
