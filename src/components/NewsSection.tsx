import React, { useState } from 'react';
import { Newspaper, Pin, Calendar, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';
import { NewsPost } from '../types';

interface NewsSectionProps {
  news?: NewsPost[];
}

export const NewsSection: React.FC<NewsSectionProps> = ({ news = [] }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getTagColor = (tag?: string) => {
    const t = (tag || '').toLowerCase();
    if (t.includes('hot') || t.includes('вогонь') || t.includes('важливо')) {
      return 'bg-rose-500/10 text-rose-600 border-rose-200/80';
    }
    if (t.includes('промо') || t.includes('знижк') || t.includes('бонус')) {
      return 'bg-amber-500/10 text-amber-700 border-amber-200/80';
    }
    if (t.includes('стрім') || t.includes('ефір') || t.includes('tiktok')) {
      return 'bg-purple-500/10 text-purple-600 border-purple-200/80';
    }
    return 'bg-blue-500/10 text-blue-600 border-blue-200/80';
  };

  if (!news || news.length === 0) {
    return (
      <div className="w-full my-3 p-4 rounded-2xl bg-white/40 backdrop-blur-md border border-slate-200/50 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          <Newspaper className="w-4 h-4 text-indigo-600" />
          <span>Шортс Новини & Оновлення</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Поки що новин немає. Адміністратор може публікувати оголошення в адмін-панелі.
        </p>
      </div>
    );
  }

  // Pinned first, then by date descending
  const sortedNews = [...news].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div className="w-full my-3.5 flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-200/50 flex items-center justify-center text-indigo-600">
            <Newspaper className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            Шортс Новини ({sortedNews.length})
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
          Live Feed
        </span>
      </div>

      {/* News list */}
      <div className="space-y-2.5">
        {sortedNews.map((item) => {
          const isExpanded = expandedId === item.id;
          const isLongContent = item.content && item.content.length > 110;

          return (
            <div
              key={item.id}
              id={`news-card-${item.id}`}
              onClick={() => toggleExpand(item.id)}
              className={`w-full p-3.5 sm:p-4 rounded-2xl backdrop-blur-md border transition-all duration-200 cursor-pointer shadow-sm ${
                item.isPinned 
                  ? 'bg-gradient-to-br from-amber-50/70 via-white/80 to-amber-50/40 border-amber-300/60 ring-1 ring-amber-300/30' 
                  : 'bg-white/70 border-white/80 hover:border-slate-300 hover:-translate-y-0.5'
              }`}
            >
              {/* Top metadata: tags, pin, date */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.isPinned && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-300/60 text-amber-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
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
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
                {item.title}
              </h4>

              {/* Optional image preview */}
              {item.imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/60 max-h-48 shadow-sm">
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
              <p className={`text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line ${
                !isExpanded && isLongContent ? 'line-clamp-2' : ''
              }`}>
                {item.content}
              </p>

              {/* Expand indicator if long content */}
              {isLongContent && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-1.5">
                  <span>{isExpanded ? 'Згорнути' : 'Читати далі'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
