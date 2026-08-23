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

  const getLinkMeta = (iconName?: string, url?: string) => {
    const target = (iconName || url || '').toLowerCase();
    
    if (target.includes('tiktok') || target.includes('chak.tt') || target.includes('music')) {
      return {
        icon: <Music className="w-4 h-4 text-white" />,
        badgeBg: 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 shadow-slate-900/20 text-white',
        borderHover: 'hover:border-slate-400',
        glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)]',
        chipColor: 'text-slate-800'
      };
    }
    if (target.includes('t.me') || target.includes('telegram') || target.includes('tele')) {
      return {
        icon: <Send className="w-4 h-4 text-white" />,
        badgeBg: 'bg-gradient-to-tr from-sky-400 to-blue-500 shadow-blue-500/25 text-white',
        borderHover: 'hover:border-sky-300',
        glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(14,165,233,0.18)]',
        chipColor: 'text-sky-700'
      };
    }
    if (target.includes('youtube') || target.includes('youtu.be')) {
      return {
        icon: <Youtube className="w-4 h-4 text-white" />,
        badgeBg: 'bg-gradient-to-tr from-red-500 to-rose-600 shadow-red-500/25 text-white',
        borderHover: 'hover:border-rose-300',
        glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(239,68,68,0.18)]',
        chipColor: 'text-red-700'
      };
    }
    if (target.includes('instagram') || target.includes('inst')) {
      return {
        icon: <Instagram className="w-4 h-4 text-white" />,
        badgeBg: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 shadow-pink-500/25 text-white',
        borderHover: 'hover:border-pink-300',
        glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(236,72,153,0.18)]',
        chipColor: 'text-pink-700'
      };
    }
    if (target.includes('shop') || target.includes('store')) {
      return {
        icon: <ShoppingBag className="w-4 h-4 text-white" />,
        badgeBg: 'bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-emerald-500/25 text-white',
        borderHover: 'hover:border-emerald-300',
        glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.18)]',
        chipColor: 'text-emerald-700'
      };
    }
    if (target.includes('twitter') || target.includes('x.com')) {
      return {
        icon: <Twitter className="w-4 h-4 text-white" />,
        badgeBg: 'bg-slate-900 shadow-slate-900/20 text-white',
        borderHover: 'hover:border-slate-400',
        glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)]',
        chipColor: 'text-slate-800'
      };
    }
    if (target.includes('mail') || target.includes('@')) {
      return {
        icon: <Mail className="w-4 h-4 text-white" />,
        badgeBg: 'bg-gradient-to-tr from-amber-400 to-orange-500 shadow-orange-500/25 text-white',
        borderHover: 'hover:border-amber-300',
        glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.18)]',
        chipColor: 'text-amber-700'
      };
    }
    return {
      icon: <Globe className="w-4 h-4 text-white" />,
      badgeBg: 'bg-gradient-to-tr from-indigo-500 to-blue-600 shadow-indigo-500/25 text-white',
      borderHover: 'hover:border-indigo-300',
      glowHover: 'hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.18)]',
      chipColor: 'text-indigo-700'
    };
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
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-3 my-2">
      {links.map((link) => {
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
            className={`group relative w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl cursor-pointer select-none bg-white/70 backdrop-blur-md border border-white/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${meta.borderHover} ${meta.glowHover} ${
              link.highlighted ? 'ring-2 ring-indigo-400/40 bg-gradient-to-r from-indigo-50/40 via-white/80 to-blue-50/40' : ''
            }`}
          >
            {/* Left icon & title */}
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className={`w-9 h-9 rounded-xl ${meta.badgeBg} shadow-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                {meta.icon}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                    {link.title || 'Посилання'}
                  </span>
                  {link.highlighted && (
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0 fill-amber-400" />
                  )}
                </div>
                <span className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">
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
                className="w-8 h-8 rounded-xl bg-slate-100/70 hover:bg-slate-200/80 border border-slate-200/50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <div className="w-8 h-8 rounded-xl bg-slate-100/70 hover:bg-indigo-600 hover:text-white border border-slate-200/50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
