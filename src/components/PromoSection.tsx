import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';
import { soundService } from '../soundService';

interface PromoSectionProps {
  promoCode?: string;
  onCopyNotice?: (text: string) => void;
}

export const PromoSection: React.FC<PromoSectionProps> = ({ 
  promoCode = '#NEXUS', 
  onCopyNotice 
}) => {
  const [copied, setCopied] = useState(false);
  const codeToDisplay = promoCode?.trim() || '#NEXUS';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundService.playClickSound();
    navigator.clipboard.writeText(codeToDisplay.replace(/^#/, ''));
    setCopied(true);
    if (onCopyNotice) {
      onCopyNotice(`Промокод ${codeToDisplay} скопійовано!`);
    }
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button 
      type="button"
      onClick={handleCopy}
      id="promo-code-card"
      title="Натисніть, щоб скопіювати промокод"
      className="group relative w-full my-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-300/80 hover:border-amber-400 bg-white/90 shadow-sm hover:shadow-md flex items-center justify-between cursor-pointer sleek-button text-left transition-all duration-200"
    >
      {/* Left icon and labels */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
          <Tag className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">
              Офіційний Промокод
            </span>
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400 animate-pulse" />
          </div>
          <span className="text-base sm:text-lg font-black tracking-wider text-slate-900 font-mono group-hover:text-amber-700 transition-colors">
            {codeToDisplay}
          </span>
        </div>
      </div>

      {/* Right copy button / badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
          copied 
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
            : 'bg-amber-100 text-amber-800 border border-amber-300/80 group-hover:bg-amber-500 group-hover:text-white'
        }`}>
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Скопійовано!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Скопіювати</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
};

