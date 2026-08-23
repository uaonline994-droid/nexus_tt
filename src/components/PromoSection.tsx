import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';

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
    navigator.clipboard.writeText(codeToDisplay.replace(/^#/, ''));
    setCopied(true);
    if (onCopyNotice) {
      onCopyNotice(`Промокод ${codeToDisplay} скопійовано в буфер!`);
    }
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div 
      onClick={handleCopy}
      id="promo-code-card"
      role="button"
      tabIndex={0}
      title="Натисніть, щоб скопіювати промокод"
      className="group relative w-full my-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-indigo-500/[0.05] to-blue-500/[0.08] backdrop-blur-md border border-amber-300/40 hover:border-amber-400/70 shadow-sm hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.15)] flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Left icon and labels */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.3)] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
          <Tag className="w-5 h-5" />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">
              Офіційний Промокод
            </span>
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400 animate-pulse" />
          </div>
          <span className="text-base sm:text-lg font-black tracking-wider text-slate-800 font-mono group-hover:text-amber-600 transition-colors">
            {codeToDisplay}
          </span>
        </div>
      </div>

      {/* Right copy button / badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
          copied 
            ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)]' 
            : 'bg-white/80 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-200/80 shadow-sm'
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
    </div>
  );
};
