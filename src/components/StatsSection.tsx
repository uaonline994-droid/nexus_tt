import React from 'react';
import { Users, Heart, Play } from 'lucide-react';
import { TikTokStats } from '../types';

interface StatsSectionProps {
  stats?: TikTokStats;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  const followersDisplay = stats?.followers !== undefined && stats.followers.trim() !== '' ? stats.followers : '0';
  const likesDisplay = stats?.likes !== undefined && stats.likes.trim() !== '' ? stats.likes : '0';
  const viewsDisplay = stats?.views !== undefined && stats.views.trim() !== '' ? stats.views : '0';

  const statItems = [
    {
      id: 'stat-followers',
      label: 'Підписники',
      sublabel: 'Followers',
      value: followersDisplay,
      icon: Users,
      badgeColor: 'text-blue-600 bg-blue-500/10 border-blue-200/60',
      cardBg: 'bg-gradient-to-b from-blue-50/70 to-indigo-50/30 border-blue-200/50 hover:border-blue-300',
      glowColor: 'group-hover:shadow-[0_8px_20px_-4px_rgba(59,130,246,0.18)]',
      textColor: 'text-blue-950',
    },
    {
      id: 'stat-likes',
      label: 'Вподобайки',
      sublabel: 'Likes',
      value: likesDisplay,
      icon: Heart,
      badgeColor: 'text-rose-600 bg-rose-500/10 border-rose-200/60',
      cardBg: 'bg-gradient-to-b from-rose-50/70 to-pink-50/30 border-rose-200/50 hover:border-rose-300',
      glowColor: 'group-hover:shadow-[0_8px_20px_-4px_rgba(244,63,94,0.18)]',
      textColor: 'text-rose-950',
    },
    {
      id: 'stat-views',
      label: 'Перегляди',
      sublabel: 'Views',
      value: viewsDisplay,
      icon: Play,
      badgeColor: 'text-emerald-600 bg-emerald-500/10 border-emerald-200/60',
      cardBg: 'bg-gradient-to-b from-emerald-50/70 to-teal-50/30 border-emerald-200/50 hover:border-emerald-300',
      glowColor: 'group-hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.18)]',
      textColor: 'text-emerald-950',
    }
  ];

  return (
    <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 my-3">
      {statItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <div
            key={item.id}
            id={item.id}
            className={`group relative flex flex-col items-center justify-center py-3 px-1 rounded-2xl backdrop-blur-md border ${item.cardBg} ${item.glowColor} transition-all duration-200 hover:-translate-y-0.5 shadow-sm`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${item.badgeColor}`}>
                <IconComponent className="w-2.5 h-2.5" />
              </div>
              <span className={`text-base sm:text-lg font-black tracking-tight ${item.textColor}`}>
                {item.value}
              </span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
