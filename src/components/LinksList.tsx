import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Sparkles, Youtube, Instagram, Send, Globe, Music, ShoppingBag, Mail, Twitter, Plus } from 'lucide-react';
import { BioLink } from '../types';
import { sanitizeUrl } from '../security';
import { soundService } from '../soundService';

interface LinksListProps {
  links: BioLink[];
  onLinkClick?: (linkId: string) => void;
  onAddLinkClick?: () => void;
}

export const LinksList: React.FC<LinksListProps> = ({ links, onLinkClick, onAddLinkClick }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getLinkMeta = (iconName?: string, url?: string) => {
    const target = (iconName || url || '').toLowerCase();
    
    if (target.includes('tiktok') || target.includes('chak.tt') || target.includes('music')) {
      return {
        icon: <Music className="w-4 h-4 text-cyan-600" />,
        badgeBg: 'bg-slate-900 text-cyan-400 border-slate-700',
        borderHover: 'hover:border-cyan-400',
      };
    }
    if (target.includes('t.me') || target.includes('telegram') || target.includes('tele')) {
      return {
        icon: <Send className="w-4 h-4 text-white" />,
        badgeBg: 'bg-[#229ED9] text-white border-transparent',
        borderHover: 'hover:border-sky-400',
      };
    }
    if (target.includes('youtube') || target.includes('youtu.be')) {
      return {
        icon: <Youtube className="w-4 h-4 text-white" />,
        badgeBg: 'bg-[#FF0000] text-white border-transparent',
        borderHover: 'hover:border-rose-400',
      };
    }
    if (target.includes('instagram') || target.includes('inst')) {
      return {
        icon: <Instagram className="w-4 h-4 text-white" />,
        badgeBg: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white border-transparent',
        borderHover: 'hover:border-pink-400',
      };
    }
    if (target.includes('shop') || target.includes('store')) {
      return {
        icon: <ShoppingBag className="w-4 h-4 text-white" />,
        badgeBg: 'bg-emerald-600 text-white border-transparent',
        borderHover: 'hover:border-emerald-400',
      };
    }
    if (target.includes('twitter') || target.includes('x.com')) {
      return {
        icon: <Twitter className="w-4 h-4 text-white" />,
        badgeBg: 'bg-slate-900 text-white border-transparent',
        borderHover: 'hover:border-slate-500',
      };
    }
    if (target.includes('mail') || target.includes('@')) {
      return {
        icon: <Mail className="w-4 h-4 text-white" />,
        badgeBg: 'bg-amber-500 text-white border-transparent',
        borderHover: 'hover:border-amber-400',
      };
    }
    return {
      icon: <Globe className="w-4 h-4 text-white" />,
      badgeBg: 'bg-indigo-600 text-white border-transparent',
      borderHover: 'hover:border-indigo-400',
    };
  };

  const handleCopy = (e: React.MouseEvent, link: BioLink) => {
    e.preventDefault();
    e.stopPropagation();
    soundService.playClickSound();
    const safeUrl = sanitizeUrl(link.url);
    navigator.clipboard.writeText(safeUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClick = (link: BioLink) => {
    soundService.playClickSound();
    if (onLinkClick) {
      onLinkClick(link.id);
    }
    const safeUrl = sanitizeUrl(link.url);
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full flex flex-col gap-2.5 my-2">
      {links && links.map((link) => {
        const isCopied = copiedId === link.id;
        const meta = getLinkMeta(link.icon, link.url);

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
            className={`group relative w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl cursor-pointer select-none bg-white/90 hover:bg-white border border-slate-200/90 shadow-sm hover:shadow-md sleek-button transition-all duration-200 ${meta.borderHover} ${
              link.highlighted ? 'ring-1 ring-amber-300/60 border-amber-300 bg-gradient-to-r from-amber-500/10 via-white to-amber-500/5' : ''
            }`}
          >
            {/* Left icon & title */}
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className={`w-9 h-9 rounded-xl ${meta.badgeBg} border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs`}>
                {meta.icon}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                    {link.title || 'Посилання'}
                  </span>
                  {link.highlighted && (
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0 fill-amber-400" />
                  )}
                </div>
                <span className="text-[10.5px] text-slate-400 truncate max-w-[190px] sm:max-w-[240px]">
                  {link.url}
                </span>
              </div>
            </div>

            {/* Actions: Copy & Open */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => handleCopy(e, link)}
                title="Скопіювати посилання"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white border border-slate-200 flex items-center justify-center text-slate-500 transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        );
      })}

      {/* Direct Add Link Button at the bottom */}
      {onAddLinkClick && (
        <button
          id="btn-add-link-bottom"
          type="button"
          onClick={() => {
            soundService.playClickSound();
            onAddLinkClick();
          }}
          className="w-full h-11 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer mt-1 sleek-button shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Додати посилання</span>
        </button>
      )}
    </div>
  );
};

