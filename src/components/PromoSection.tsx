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
      className="group relative w-full my-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#e0e5ec] shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] border border-blue-400/30 flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff]"
    >
      {/* Left icon and labels */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
          <Tag className="w-5 h-5" />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#7a818e]">
              Офіційний Промокод
            </span>
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400 animate-pulse" />
          </div>
          <span className="text-base sm:text-lg font-black tracking-wider text-[#2d3748] font-mono group-hover:text-blue-600 transition-colors">
            {codeToDisplay}
          </span>
        </div>
      </div>

      {/* Right copy button / badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
          copied 
            ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
            : 'bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
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
