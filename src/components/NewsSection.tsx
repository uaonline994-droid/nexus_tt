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
      return 'bg-rose-500/10 text-rose-600 border-rose-400/30';
    }
    if (t.includes('промо') || t.includes('знижк') || t.includes('бонус')) {
      return 'bg-amber-500/10 text-amber-600 border-amber-400/30';
    }
    if (t.includes('стрім') || t.includes('ефір') || t.includes('tiktok')) {
      return 'bg-purple-500/10 text-purple-600 border-purple-400/30';
    }
    return 'bg-blue-500/10 text-blue-600 border-blue-400/30';
  };

  if (!news || news.length === 0) {
    return (
      <div className="w-full my-4 p-5 rounded-2xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7a818e] mb-1">
          <Newspaper className="w-4 h-4 text-blue-600" />
          <span>Шортс Новини & Оновлення</span>
        </div>
        <p className="text-[11px] text-[#a3b1c6] mt-1">
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
    <div className="w-full my-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center text-blue-600">
            <Newspaper className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#2d3748] flex items-center gap-1.5">
            Шортс Новини ({sortedNews.length})
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block" />
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-[#7a818e] tracking-widest">
          Live Feed
        </span>
      </div>

      {/* News list */}
      <div className="space-y-3">
        {sortedNews.map((item) => {
          const isExpanded = expandedId === item.id;
          const isLongContent = item.content && item.content.length > 120;

          return (
            <div
              key={item.id}
              id={`news-card-${item.id}`}
              onClick={() => toggleExpand(item.id)}
              className={`w-full p-4 rounded-2xl bg-[#e0e5ec] shadow-[6px_6px_12px_#bec4cf,-6px_-6px_12px_#ffffff] border transition-all duration-200 cursor-pointer ${
                item.isPinned ? 'border-amber-400/50 ring-1 ring-amber-400/20' : 'border-white/30 hover:-translate-y-0.5'
              }`}
            >
              {/* Top metadata: tags, pin, date */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.isPinned && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5 fill-amber-500" />
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
                  <span className="text-[10px] font-semibold text-[#a3b1c6] flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-[#2d3748] tracking-tight leading-snug">
                {item.title}
              </h4>

              {/* Optional image preview */}
              {item.imageUrl && (
                <div className="mt-2.5 rounded-xl overflow-hidden shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] max-h-48">
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
              <p className={`text-xs text-[#64748b] mt-1.5 leading-relaxed whitespace-pre-line ${
                !isExpanded && isLongContent ? 'line-clamp-2' : ''
              }`}>
                {item.content}
              </p>

              {/* Expand indicator if long content */}
              {isLongContent && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-2">
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
