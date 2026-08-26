import React, { useState } from 'react';
import { Newspaper, Pin, Calendar, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { NewsPost } from '../types';
import { soundService } from '../soundService';

interface NewsSectionProps {
  news?: NewsPost[];
  isAdmin?: boolean;
  onAddNewsClick?: () => void;
}

export const NewsSection: React.FC<NewsSectionProps> = ({ 
  news = [], 
  isAdmin = false, 
  onAddNewsClick 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    soundService.playClickSound();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getTagColor = (tag?: string) => {
    const t = (tag || '').toLowerCase();
    if (t.includes('hot') || t.includes('вогонь') || t.includes('важливо')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (t.includes('промо') || t.includes('знижк') || t.includes('бонус')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (t.includes('стрім') || t.includes('ефір') || t.includes('tiktok')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const sortedNews = [...news].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div className="w-full my-3 flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Newspaper className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            Шортс Новини ({sortedNews.length})
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
          Live Feed
        </span>
      </div>

      {sortedNews.length === 0 ? (
        <div className="w-full p-4 rounded-2xl bg-white/70 border border-slate-200/80 text-center shadow-2xs">
          <p className="text-xs text-slate-500">
            Новин поки немає. Використайте кнопку нижче для створення першої публікації.
          </p>
        </div>
      ) : (
        /* News list */
        <div className="space-y-2.5">
          {sortedNews.map((item) => {
            const isExpanded = expandedId === item.id;
            const isLongContent = item.content && item.content.length > 110;

            return (
              <div
                key={item.id}
                id={`news-card-${item.id}`}
                onClick={() => toggleExpand(item.id)}
                className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md sleek-button ${
                  item.isPinned 
                    ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/40' 
                    : 'bg-white/90 hover:bg-white border-slate-200/90'
                }`}
              >
                {/* Top metadata: tags, pin, date */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.isPinned && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                        Закріплено
                      </span>
                    )}
                    {item.tag && (
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getTagColor(item.tag)}`}>
                        {item.tag}
                      </span>
                    )}
                  </div>

                  {item.date && (
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 shrink-0 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {item.date}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                  {item.title}
                </h4>

                {/* Optional image preview */}
                {item.imageUrl && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 max-h-48 shadow-2xs">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <p className={`text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line ${
                  !isExpanded && isLongContent ? 'line-clamp-2' : ''
                }`}>
                  {item.content}
                </p>

                {/* Expand indicator if long content */}
                {isLongContent && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-2">
                    <span>{isExpanded ? 'Згорнути' : 'Читати далі'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Add News Button at the bottom */}
      {onAddNewsClick && (
        <button
          id="btn-add-news-bottom"
          type="button"
          onClick={() => {
            soundService.playClickSound();
            onAddNewsClick();
          }}
          className="w-full h-11 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer sleek-button shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Додати новину</span>
        </button>
      )}
    </div>
  );
};

