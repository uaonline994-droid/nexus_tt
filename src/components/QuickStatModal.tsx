import React, { useState } from 'react';
import { X, Check, BarChart2, Users, Heart, Play } from 'lucide-react';
import { TikTokStats } from '../types';

interface QuickStatModalProps {
  isOpen: boolean;
  onClose: () => void;
  statKey: 'followers' | 'likes' | 'views' | null;
  currentStats: TikTokStats;
  onSaveStat: (key: 'followers' | 'likes' | 'views', newValue: string) => Promise<void>;
}

export const QuickStatModal: React.FC<QuickStatModalProps> = ({
  isOpen,
  onClose,
  statKey,
  currentStats,
  onSaveStat
}) => {
  const [value, setValue] = useState(
    statKey ? (currentStats[statKey] || '') : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync value when statKey changes
  React.useEffect(() => {
    if (statKey) {
      setValue(currentStats[statKey] || '');
    }
  }, [statKey, currentStats]);

  if (!isOpen || !statKey) return null;

  const statConfig = {
    followers: {
      title: 'Змінити кількість підписників',
      label: 'Підписники (Followers)',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50/80 border-blue-200/80',
      placeholder: 'наприклад: 125K або 1.2M',
      quickSuggestions: ['10K', '50K', '100K', '250K', '500K', '1M', '2.5M']
    },
    likes: {
      title: 'Змінити кількість вподобайок',
      label: 'Вподобайки (Likes)',
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-50/80 border-rose-200/80',
      placeholder: 'наприклад: 1.8M або 500K',
      quickSuggestions: ['100K', '500K', '1M', '2M', '5M', '10M', '25M']
    },
    views: {
      title: 'Змінити кількість переглядів',
      label: 'Перегляди (Views)',
      icon: Play,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/80 border-emerald-200/80',
      placeholder: 'наприклад: 5.4M або 10M',
      quickSuggestions: ['500K', '1M', '3M', '5M', '10M', '20M', '50M']
    }
  }[statKey];

  const IconComponent = statConfig.icon;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setIsSaving(true);
    try {
      await onSaveStat(statKey, value.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="quick-stat-modal"
        className="w-full max-w-sm rounded-[28px] bg-white/95 backdrop-blur-xl p-5 sm:p-6 border border-white/90 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl ${statConfig.bg} border flex items-center justify-center ${statConfig.color}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              {statConfig.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider block">
              Нове значення для {statConfig.label}:
            </label>
            <div className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-colors shadow-2xs">
              <input
                type="text"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={statConfig.placeholder}
                className="bg-transparent w-full text-base font-bold outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Quick presets buttons */}
          <div className="space-y-1">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider block">
              Швидкий вибір:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {statConfig.quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setValue(suggestion)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    value === suggestion 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600 transition-all cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSaving || !value.trim()}
              className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
