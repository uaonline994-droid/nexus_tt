import React from 'react';
import { Users, Heart, Eye, Edit3 } from 'lucide-react';
import { TikTokStats } from '../types';
import { soundService } from '../soundService';

interface StatsSectionProps {
  stats?: TikTokStats;
  isAdmin?: boolean;
  onStatClick?: (statKey: 'followers' | 'likes' | 'views') => void;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ 
  stats, 
  isAdmin = false, 
  onStatClick 
}) => {
  const followersDisplay = stats?.followers !== undefined && stats.followers.trim() !== '' ? stats.followers : '0';
  const likesDisplay = stats?.likes !== undefined && stats.likes.trim() !== '' ? stats.likes : '0';
  const viewsDisplay = stats?.views !== undefined && stats.views.trim() !== '' ? stats.views : '0';

  const statItems: Array<{
    key: 'followers' | 'likes' | 'views';
    id: string;
    label: string;
    value: string;
    icon: typeof Users;
    iconColor: string;
    cardBg: string;
    borderColor: string;
  }> = [
    {
      key: 'followers',
      id: 'stat-followers',
      label: 'Підписники',
      value: followersDisplay,
      icon: Users,
      iconColor: 'text-blue-600',
      cardBg: 'bg-white/90 hover:bg-white',
      borderColor: 'border-slate-200/90 hover:border-blue-300 shadow-sm hover:shadow-md',
    },
    {
      key: 'likes',
      id: 'stat-likes',
      label: 'Вподобайки',
      value: likesDisplay,
      icon: Heart,
      iconColor: 'text-rose-600',
      cardBg: 'bg-white/90 hover:bg-white',
      borderColor: 'border-slate-200/90 hover:border-rose-300 shadow-sm hover:shadow-md',
    },
    {
      key: 'views',
      id: 'stat-views',
      label: 'Перегляди',
      value: viewsDisplay,
      icon: Eye,
      iconColor: 'text-emerald-600',
      cardBg: 'bg-white/90 hover:bg-white',
      borderColor: 'border-slate-200/90 hover:border-emerald-300 shadow-sm hover:shadow-md',
    }
  ];

  return (
    <div className="w-full grid grid-cols-3 gap-2.5 my-3">
      {statItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            id={item.id}
            type="button"
            onClick={() => {
              soundService.playClickSound();
              if (onStatClick) onStatClick(item.key);
            }}
            title="Натисніть для зміни статистики"
            className={`group relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl ${item.cardBg} border ${item.borderColor} sleek-button cursor-pointer select-none transition-all duration-200`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <IconComponent className={`w-3.5 h-3.5 ${item.iconColor} shrink-0`} />
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 font-mono">
                {item.value}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                {item.label}
              </span>
              <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-indigo-600 transition-opacity" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

