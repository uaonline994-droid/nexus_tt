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
      color: 'text-blue-600',
    },
    {
      id: 'stat-likes',
      label: 'Вподобайки',
      sublabel: 'Likes',
      value: likesDisplay,
      icon: Heart,
      color: 'text-rose-500',
    },
    {
      id: 'stat-views',
      label: 'Перегляди',
      sublabel: 'Views',
      value: viewsDisplay,
      icon: Play,
      color: 'text-purple-600',
    }
  ];

  return (
    <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3.5 my-3">
      {statItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <div
            key={item.id}
            id={item.id}
            className="flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-[#e0e5ec] shadow-[6px_6px_12px_#bec4cf,-6px_-6px_12px_#ffffff] transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <IconComponent className={`w-3 h-3 ${item.color}`} />
              <span className="text-base sm:text-lg font-black text-[#2d3748] tracking-tight">
                {item.value}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#94a3b8] font-bold">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
