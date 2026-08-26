import React, { useState } from 'react';
import { X, Check, Link as LinkIcon, Plus, Sparkles } from 'lucide-react';
import { BioLink } from '../types';

interface QuickAddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLink: (linkItem: BioLink) => Promise<void>;
}

export const QuickAddLinkModal: React.FC<QuickAddLinkModalProps> = ({
  isOpen,
  onClose,
  onAddLink
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('globe');
  const [highlighted, setHighlighted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setIsSubmitting(true);
    try {
      const cleanUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
      const newLink: BioLink = {
        id: 'link_' + Date.now(),
        title: title.trim(),
        url: cleanUrl,
        icon,
        highlighted,
        clicks: 0
      };
      await onAddLink(newLink);
      setTitle('');
      setUrl('');
      setIcon('globe');
      setHighlighted(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="quick-add-link-modal"
        className="w-full max-w-md rounded-[28px] bg-white/95 backdrop-blur-xl p-5 sm:p-6 border border-white/90 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <LinkIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Додати Нове Посилання
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider block">
              Назва кнопки:
            </label>
            <div className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-colors shadow-2xs">
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="наприклад: Мій Telegram Канал"
                className="bg-transparent w-full text-xs font-bold outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider block">
              Адреса сайту (URL):
            </label>
            <div className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-colors shadow-2xs">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://t.me/..."
                className="bg-transparent w-full text-xs outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Соціальна мережа:
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="telegram">Telegram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="instagram">Instagram</option>
                <option value="globe">Веб-сайт</option>
                <option value="shop">Магазин / Мерч</option>
                <option value="mail">Email / Співпраця</option>
              </select>
            </div>

            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={highlighted}
                  onChange={(e) => setHighlighted(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                Виділити
              </label>
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
              disabled={isSubmitting || !title.trim() || !url.trim()}
              className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Додавання...' : 'Додати кнопку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
