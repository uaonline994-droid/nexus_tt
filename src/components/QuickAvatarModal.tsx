import React, { useState } from 'react';
import { X, Check, Image as ImageIcon, Sparkles, RefreshCw } from 'lucide-react';

interface QuickAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string;
  onSaveAvatar: (newUrl: string) => Promise<void>;
}

const AVATAR_PRESETS = [
  { label: 'Cyberpunk Nexus', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80' },
  { label: 'Neon Abstract', url: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=400&auto=format&fit=crop&q=80' },
  { label: 'Minimalist Gradient', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=80' },
  { label: 'Dark Aura', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&auto=format&fit=crop&q=80' }
];

export const QuickAvatarModal: React.FC<QuickAvatarModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSaveAvatar
}) => {
  const [url, setUrl] = useState(currentAvatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setUrl(currentAvatarUrl || '');
  }, [currentAvatarUrl, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveAvatar(url.trim());
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
        id="quick-avatar-modal"
        className="w-full max-w-sm rounded-[28px] bg-white/95 backdrop-blur-xl p-5 sm:p-6 border border-white/90 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Змінити Аватарку
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="flex justify-center my-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 p-0.5 shadow-md overflow-hidden">
            <img
              src={url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'}
              alt="Avatar preview"
              className="w-full h-full rounded-full object-cover bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';
              }}
            />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider block">
              Посилання на зображення (URL):
            </label>
            <div className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-colors shadow-2xs">
              <input
                type="url"
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="bg-transparent w-full text-xs outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider block">
              Швидкі пресети:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setUrl(preset.url)}
                  className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold text-left truncate transition-all cursor-pointer ${
                    url === preset.url
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {preset.label}
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
              disabled={isSaving || !url.trim()}
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
