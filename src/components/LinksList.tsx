import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Sparkles, Youtube, Instagram, Send, Globe, Music, ShoppingBag, Mail, Twitter } from 'lucide-react';
import { BioLink } from '../types';
import { sanitizeUrl } from '../security';

interface LinksListProps {
  links: BioLink[];
  onLinkClick?: (linkId: string) => void;
}

export const LinksList: React.FC<LinksListProps> = ({ links, onLinkClick }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getIcon = (iconName?: string, url?: string) => {
    const target = (iconName || url || '').toLowerCase();
    if (target.includes('youtube') || target.includes('youtu.be')) return <Youtube className="w-4 h-4 text-red-500" />;
    if (target.includes('instagram') || target.includes('inst')) return <Instagram className="w-4 h-4 text-pink-500" />;
    if (target.includes('t.me') || target.includes('telegram') || target.includes('tele')) return <Send className="w-4 h-4 text-sky-500" />;
    if (target.includes('tiktok') || target.includes('music')) return <Music className="w-4 h-4 text-[#444]" />;
    if (target.includes('shop') || target.includes('store')) return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
    if (target.includes('twitter') || target.includes('x.com')) return <Twitter className="w-4 h-4 text-[#444]" />;
    if (target.includes('mail') || target.includes('@')) return <Mail className="w-4 h-4 text-amber-500" />;
    return <Globe className="w-4 h-4 text-blue-500" />;
  };

  const handleCopy = (e: React.MouseEvent, link: BioLink) => {
    e.preventDefault();
    e.stopPropagation();
    const safeUrl = sanitizeUrl(link.url);
    navigator.clipboard.writeText(safeUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClick = (link: BioLink) => {
    if (onLinkClick) {
      onLinkClick(link.id);
    }
    const safeUrl = sanitizeUrl(link.url);
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  if (!links || links.length === 0) {
    return (
      <div className="w-full space-y-4 my-2">
        <div className="w-full h-14 rounded-2xl bg-[#e0e5ec] shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] flex items-center justify-center border border-white/20 opacity-50 select-none">
          <span className="text-[#a3b1c6] font-medium italic text-xs sm:text-sm">Empty link slot</span>
        </div>
        <div className="w-full h-14 rounded-2xl bg-[#e0e5ec] shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] flex items-center justify-center border border-white/20 opacity-50 select-none">
          <span className="text-[#a3b1c6] font-medium italic text-xs sm:text-sm">Empty link slot</span>
        </div>
        <div className="w-full h-14 rounded-2xl bg-[#e0e5ec] shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] flex items-center justify-center border border-white/20 opacity-50 select-none">
          <span className="text-[#a3b1c6] font-medium italic text-xs sm:text-sm">Empty link slot</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 my-2">
      {links.map((link) => {
        const isCopied = copiedId === link.id;

        return (
          <div
            key={link.id}
            id={`link-item-${link.id}`}
            onClick={() => handleClick(link)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(link);
              }
            }}
            className={`group relative w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer select-none bg-[#e0e5ec] shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] border border-white/20 transition-all duration-200 hover:-translate-y-0.5 active:shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] ${
              link.highlighted ? 'ring-2 ring-blue-400/50' : ''
            }`}
          >
            {/* Left icon & title */}
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-9 h-9 rounded-xl bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                {getIcon(link.icon, link.url)}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#444] tracking-tight truncate group-hover:text-blue-600 transition-colors">
                    {link.title || 'Посилання'}
                  </span>
                  {link.highlighted && (
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0 fill-amber-400" />
                  )}
                </div>
                <span className="text-[11px] text-[#a3b1c6] truncate max-w-[180px] sm:max-w-[240px]">
                  {link.url}
                </span>
              </div>
            </div>

            {/* Actions: Copy & Open */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => handleCopy(e, link)}
                title="Скопіювати посилання"
                className="w-8 h-8 rounded-lg bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] flex items-center justify-center text-[#7a818e] hover:text-blue-600 active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] transition-all"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <div className="w-8 h-8 rounded-lg bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] flex items-center justify-center text-[#7a818e] group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
