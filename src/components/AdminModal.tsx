import React, { useState, useEffect } from 'react';
import { 
  X, Save, Plus, Trash2, ArrowUp, ArrowDown, LogOut, Check, Sparkles, 
  Image as ImageIcon, BarChart3, Link as LinkIcon, Newspaper, Pin, Calendar, RotateCcw, Tag,
  ShieldCheck, Lock, Key, Activity, Server, Cpu, CheckCircle2
} from 'lucide-react';
import { BioProfile, BioLink, TikTokStats, NewsPost } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BioProfile;
  onSaveProfile: (updated: Partial<BioProfile>) => Promise<void>;
  onLogout: () => void;
  adminEmail: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onLogout,
  adminEmail
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'news' | 'stats' | 'links' | 'security'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [displayName, setDisplayName] = useState(profile.displayName || 'NEXUS');
  const [handle, setHandle] = useState(profile.handle || '@chak.tt');
  const [bioText, setBioText] = useState(profile.bioText || 'Офіційний профіль NEXUS 🔥 Лайфстайл, ексклюзивний контент та топові відео!');
  const [promoCode, setPromoCode] = useState(profile.promoCode || '#NEXUS');
  
  // Stats
  const [stats, setStats] = useState<TikTokStats>({
    followers: profile.stats?.followers ?? '0',
    likes: profile.stats?.likes ?? '0',
    views: profile.stats?.views ?? '0'
  });

  // Links
  const [links, setLinks] = useState<BioLink[]>(profile.links || []);
  
  // News
  const [news, setNews] = useState<NewsPost[]>(profile.news || []);

  // Synchronize with latest profile when opened
  useEffect(() => {
    if (isOpen) {
      setAvatarUrl(profile.avatarUrl || '');
      setDisplayName(profile.displayName || 'NEXUS');
      setHandle(profile.handle || '@chak.tt');
      setBioText(profile.bioText || '');
      setPromoCode(profile.promoCode || '#NEXUS');
      setStats({
        followers: profile.stats?.followers ?? '0',
        likes: profile.stats?.likes ?? '0',
        views: profile.stats?.views ?? '0'
      });
      setLinks(profile.links || []);
      setNews(profile.news || []);
    }
  }, [isOpen, profile]);

  // New link form
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('globe');
  const [newHighlighted, setNewHighlighted] = useState(false);

  // New news post form
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');
  const [newNewsTag, setNewNewsTag] = useState('🔥 HOT');
  const [newNewsImage, setNewNewsImage] = useState('');
  const [newNewsPinned, setNewNewsPinned] = useState(false);

  if (!isOpen) return null;

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveProfile({
        avatarUrl: avatarUrl.trim(),
        displayName: displayName.trim() || 'NEXUS',
        handle: handle.trim() || '@chak.tt',
        bioText: bioText.trim(),
        promoCode: promoCode.trim() || '#NEXUS',
        stats: {
          followers: stats.followers.trim(),
          likes: stats.likes.trim(),
          views: stats.views.trim()
        },
        links: links,
        news: news,
        updatedAt: Date.now()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Link
  const handleAddLink = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const newLink: BioLink = {
      id: 'link_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: newTitle.trim(),
      url: newUrl.trim(),
      icon: newIcon,
      highlighted: newHighlighted,
      clicks: 0
    };
    setLinks([...links, newLink]);
    setNewTitle('');
    setNewUrl('');
    setNewIcon('globe');
    setNewHighlighted(false);
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === links.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...links];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setLinks(updated);
  };

  const handleUpdateLink = (id: string, updates: Partial<BioLink>) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  // Add News Post
  const handleAddNews = () => {
    if (!newNewsTitle.trim() || !newNewsContent.trim()) return;
    const formattedDate = new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'short'
    }).format(new Date());

    const newPost: NewsPost = {
      id: 'news_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: newNewsTitle.trim(),
      content: newNewsContent.trim(),
      tag: newNewsTag.trim(),
      imageUrl: newNewsImage.trim() || undefined,
      isPinned: newNewsPinned,
      date: formattedDate,
      createdAt: Date.now()
    };

    setNews([newPost, ...news]);
    setNewNewsTitle('');
    setNewNewsContent('');
    setNewNewsTag('🔥 HOT');
    setNewNewsImage('');
    setNewNewsPinned(false);
  };

  const handleDeleteNews = (id: string) => {
    setNews(news.filter((n) => n.id !== id));
  };

  const handleTogglePinNews = (id: string) => {
    setNews(news.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)));
  };

  // Apply NEXUS Brand Template
  const handleApplyNexusTemplate = () => {
    setDisplayName('NEXUS');
    setHandle('@chak.tt');
    setPromoCode('#NEXUS');
    setAvatarUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80');
    setBioText('🚀 Офіційний акаунт NEXUS | Трендовий контент, стріми та промокод #NEXUS ✨');
    setStats({
      followers: '148.5K',
      likes: '2.4M',
      views: '8.9M'
    });
    setNews([
      {
        id: 'news_init_1',
        title: '🔥 Новий ексклюзивний промокод #NEXUS вже активний!',
        content: 'Використовуйте промокод #NEXUS для отримання бонусів. Тисніть на промокод вище, щоб скопіювати в 1 клік!',
        tag: '🎁 ПРОМОКОД',
        isPinned: true,
        date: 'Сьогодні',
        createdAt: Date.now()
      },
      {
        id: 'news_init_2',
        title: '🎬 Прем\'єра нового TikTok відео на каналі @chak.tt',
        content: 'Свіже відео вже в мережі! Дивіться у TikTok, ставте лайки та пишіть коментарі.',
        tag: '🔥 HOT',
        isPinned: false,
        date: 'Вчора',
        createdAt: Date.now() - 86400000
      }
    ]);
    setLinks([
      {
        id: 'nexus_link_1',
        title: 'TikTok @chak.tt (Офіційний)',
        url: 'https://tiktok.com/@chak.tt',
        icon: 'tiktok',
        highlighted: true,
        clicks: 340
      },
      {
        id: 'nexus_link_2',
        title: 'Telegram Канал NEXUS',
        url: 'https://t.me',
        icon: 'telegram',
        highlighted: true,
        clicks: 215
      },
      {
        id: 'nexus_link_3',
        title: 'YouTube Канал',
        url: 'https://youtube.com',
        icon: 'youtube',
        highlighted: false,
        clicks: 180
      },
      {
        id: 'nexus_link_4',
        title: 'Instagram Профіль',
        url: 'https://instagram.com',
        icon: 'instagram',
        highlighted: false,
        clicks: 95
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="admin-panel-container"
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[32px] sm:rounded-[40px] bg-[#e0e5ec] shadow-[20px_20px_60px_#bec4cf,-20px_-20px_60px_#ffffff] overflow-hidden border border-white/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-[#bec4cf]/30 bg-[#e0e5ec]">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-[#2d3748] flex items-center gap-2.5 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              NEXUS Admin Panel
            </h2>
            <span className="hidden sm:inline-block text-[10px] text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
              Адміністратор
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyNexusTemplate}
              title="Застосувати фірмовий стиль NEXUS"
              className="px-2.5 py-1.5 rounded-xl bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span className="hidden sm:inline">Шаблон NEXUS</span>
            </button>

            <button
              onClick={onLogout}
              title="Вийти з акаунта"
              className="w-8 h-8 rounded-lg bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] flex items-center justify-center text-rose-500 hover:text-rose-700 active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] flex items-center justify-center text-[#64748b] hover:text-[#2d3748] active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2.5 px-6 sm:px-8 py-3 border-b border-[#bec4cf]/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'profile' ? 'shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-blue-600' : 'shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#64748b] hover:text-[#2d3748]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Профіль & Промокод
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'news' ? 'shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-blue-600' : 'shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#64748b] hover:text-[#2d3748]'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5 text-blue-500" />
            Шортс Новини ({news.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'links' ? 'shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-blue-600' : 'shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#64748b] hover:text-[#2d3748]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Посилання ({links.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'stats' ? 'shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-blue-600' : 'shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#64748b] hover:text-[#2d3748]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            TikTok Статистика
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'security' ? 'shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-emerald-600' : 'shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#64748b] hover:text-[#2d3748]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Безпека & Шифрування
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
          {/* TAB 1: PROFILE & PROMO */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Promo code field */}
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-400/30 space-y-2">
                <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Фірмовий Промокод (1-клік копіювання)
                </label>
                <div className="w-full h-12 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] px-4 flex items-center">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="#NEXUS"
                    className="bg-transparent w-full text-base font-mono font-bold outline-none text-[#2d3748] placeholder-[#94a3b8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 tracking-wider block">
                    Назва Акаунту
                  </label>
                  <div className="w-full h-12 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] px-4 flex items-center">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="NEXUS"
                      className="bg-transparent w-full text-sm font-bold outline-none text-[#2d3748] placeholder-[#94a3b8]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 tracking-wider block">
                    TikTok Юзернейм (Handle)
                  </label>
                  <div className="w-full h-12 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] px-4 flex items-center">
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@chak.tt"
                      className="bg-transparent w-full text-sm font-bold outline-none text-blue-600 placeholder-[#94a3b8]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 tracking-wider block">
                  Аватар URL (Посилання на фото)
                </label>
                <div className="w-full h-12 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] px-4 flex items-center">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-transparent w-full text-sm outline-none text-[#2d3748] placeholder-[#94a3b8]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 tracking-wider block">
                  Опис Профілю (Bio)
                </label>
                <div className="w-full rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] p-3.5">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    rows={3}
                    placeholder="Опис профілю NEXUS..."
                    className="bg-transparent w-full text-sm outline-none text-[#2d3748] placeholder-[#94a3b8] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHORTS NEWS (CRUD) */}
          {activeTab === 'news' && (
            <div className="space-y-6">
              {/* Add News Post Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#e0e5ec] shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] border border-blue-400/30 space-y-3.5">
                <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Створити Шортс Новину / Оголошення
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1 ml-1">Заголовок новини</label>
                    <div className="w-full h-11 rounded-xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] px-3.5 flex items-center">
                      <input
                        type="text"
                        value={newNewsTitle}
                        onChange={(e) => setNewNewsTitle(e.target.value)}
                        placeholder="наприклад: Стрім сьогодні о 19:00!"
                        className="bg-transparent w-full text-xs font-bold outline-none text-[#2d3748] placeholder-[#94a3b8]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1 ml-1">Тег / Бейдж</label>
                    <select
                      value={newNewsTag}
                      onChange={(e) => setNewNewsTag(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-xs font-bold text-[#2d3748] outline-none cursor-pointer"
                    >
                      <option value="🔥 HOT">🔥 HOT</option>
                      <option value="🎁 ПРОМОКОД">🎁 ПРОМОКОД</option>
                      <option value="⚡ ОНОВЛЕННЯ">⚡ ОНОВЛЕННЯ</option>
                      <option value="🎬 СТРІМ">🎬 СТРІМ</option>
                      <option value="📢 ОГОЛОШЕННЯ">📢 ОГОЛОШЕННЯ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1 ml-1">Текст новини</label>
                  <div className="w-full rounded-xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] p-3">
                    <textarea
                      value={newNewsContent}
                      onChange={(e) => setNewNewsContent(e.target.value)}
                      rows={2}
                      placeholder="Опишіть новину або новинки у TikTok для глядачів..."
                      className="bg-transparent w-full text-xs outline-none text-[#2d3748] placeholder-[#94a3b8] resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase font-bold text-[#64748b]">
                    <input
                      type="checkbox"
                      checked={newNewsPinned}
                      onChange={(e) => setNewNewsPinned(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    Закріпити зверху 📌
                  </label>

                  <button
                    type="button"
                    onClick={handleAddNews}
                    disabled={!newNewsTitle.trim() || !newNewsContent.trim()}
                    className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-blue-600 text-[11px] font-bold uppercase tracking-widest hover:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Опублікувати Новину
                  </button>
                </div>
              </div>

              {/* Existing News List */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 block">
                  Активні Новини ({news.length})
                </label>

                {news.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-center text-xs text-[#94a3b8] italic">
                    Ще немає опублікованих новин.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {news.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white/30 border border-white/50 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            <span className="text-xs font-bold text-[#2d3748] truncate">{item.title}</span>
                          </div>
                          <span className="text-[11px] text-[#64748b] line-clamp-1">{item.content}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePinNews(item.id)}
                            title={item.isPinned ? 'Відкріпити' : 'Закріпити'}
                            className={`w-7 h-7 rounded-lg bg-[#e0e5ec] shadow-[2px_2px_4px_#bec4cf,-2px_-2px_4px_#ffffff] flex items-center justify-center ${
                              item.isPinned ? 'text-amber-500' : 'text-[#94a3b8]'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNews(item.id)}
                            title="Видалити"
                            className="w-7 h-7 rounded-lg bg-[#e0e5ec] shadow-[2px_2px_4px_#bec4cf,-2px_-2px_4px_#ffffff] flex items-center justify-center text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LINKS (CRUD) */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              {/* Add New Link Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#e0e5ec] shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] border border-white/40 space-y-3.5">
                <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Додати Нову Кнопку / Посилання
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1 ml-1">Назва кнопки</label>
                    <div className="w-full h-11 rounded-xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] px-3.5 flex items-center">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="наприклад: Мій YouTube Канал"
                        className="bg-transparent w-full text-xs outline-none text-[#2d3748] placeholder-[#94a3b8]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1 ml-1">Посилання (URL)</label>
                    <div className="w-full h-11 rounded-xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] px-3.5 flex items-center">
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-transparent w-full text-xs outline-none text-[#2d3748] placeholder-[#94a3b8]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] uppercase font-bold text-[#64748b]">Іконка:</label>
                    <select
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-xs text-[#2d3748] outline-none cursor-pointer font-medium"
                    >
                      <option value="tiktok">TikTok</option>
                      <option value="telegram">Telegram</option>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="globe">Веб-сайт</option>
                      <option value="shop">Магазин / Мерч</option>
                      <option value="mail">Email / Співпраця</option>
                    </select>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase font-bold text-[#64748b] ml-2">
                      <input
                        type="checkbox"
                        checked={newHighlighted}
                        onChange={(e) => setNewHighlighted(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      Виділити ✨
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={!newTitle.trim() || !newUrl.trim()}
                    className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#2d3748] text-[11px] font-bold uppercase tracking-widest hover:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Додати
                  </button>
                </div>
              </div>

              {/* Existing Links List */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 block">
                  Список Кнопок ({links.length})
                </label>

                {links.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-center text-xs text-[#94a3b8] italic">
                    Немає доданих посилань.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {links.map((link, idx) => (
                      <div
                        key={link.id}
                        className="p-3 rounded-xl bg-white/30 border border-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) => handleUpdateLink(link.id, { title: e.target.value })}
                            className="px-2.5 py-1 rounded-lg bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-xs text-[#2d3748] font-bold outline-none"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => handleUpdateLink(link.id, { url: e.target.value })}
                            className="px-2.5 py-1 rounded-lg bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-xs text-[#64748b] outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateLink(link.id, { highlighted: !link.highlighted })}
                            title="Виділити"
                            className={`w-7 h-7 rounded-lg bg-[#e0e5ec] shadow-[2px_2px_4px_#bec4cf,-2px_-2px_4px_#ffffff] flex items-center justify-center text-xs ${
                              link.highlighted ? 'text-amber-500 font-bold' : 'text-[#94a3b8]'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveLink(idx, 'up')}
                            className="w-7 h-7 rounded-lg bg-[#e0e5ec] shadow-[2px_2px_4px_#bec4cf,-2px_-2px_4px_#ffffff] flex items-center justify-center text-[#64748b] disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === links.length - 1}
                            onClick={() => handleMoveLink(idx, 'down')}
                            className="w-7 h-7 rounded-lg bg-[#e0e5ec] shadow-[2px_2px_4px_#bec4cf,-2px_-2px_4px_#ffffff] flex items-center justify-center text-[#64748b] disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLink(link.id)}
                            className="w-7 h-7 rounded-lg bg-[#e0e5ec] shadow-[2px_2px_4px_#bec4cf,-2px_-2px_4px_#ffffff] flex items-center justify-center text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TIKTOK STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-xs text-[#64748b] leading-relaxed">
                💡 Введіть показники статистики TikTok для відображення в шапці профілю:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 tracking-wider block">
                    Followers
                  </label>
                  <div className="w-full h-12 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] px-4 flex items-center">
                    <input
                      type="text"
                      value={stats.followers}
                      onChange={(e) => setStats({ ...stats, followers: e.target.value })}
                      placeholder="120K"
                      className="bg-transparent w-full text-sm font-bold outline-none text-[#2d3748] placeholder-[#94a3b8]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 tracking-wider block">
                    Likes
                  </label>
                  <div className="w-full h-12 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] px-4 flex items-center">
                    <input
                      type="text"
                      value={stats.likes}
                      onChange={(e) => setStats({ ...stats, likes: e.target.value })}
                      placeholder="1.8M"
                      className="bg-transparent w-full text-sm font-bold outline-none text-[#2d3748] placeholder-[#94a3b8]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#64748b] uppercase ml-1 tracking-wider block">
                    Views
                  </label>
                  <div className="w-full h-12 rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec4cf,inset_-4px_-4px_8px_#ffffff] px-4 flex items-center">
                    <input
                      type="text"
                      value={stats.views}
                      onChange={(e) => setStats({ ...stats, views: e.target.value })}
                      placeholder="5.2M"
                      className="bg-transparent w-full text-sm font-bold outline-none text-[#2d3748] placeholder-[#94a3b8]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & ENCRYPTION SHIELD */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Багаторівневий Захист Enterprise-Рівня Активовано
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                    Всі модифікації профілю, посилань та новин проходять наскрізну валідацію, криптографічний підпис та суворий контроль доступу Zero-Trust.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Stage 1: Zero-Trust RBAC */}
                <div className="p-4 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] space-y-2 border border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#2d3748] flex items-center gap-1.5 uppercase">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      1. Zero-Trust Доступ
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                      Активно
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] leading-normal">
                    Доступ до керування надається виключно верифікованому Google-акаунту <span className="font-mono font-bold text-[#2d3748]">{adminEmail}</span>.
                  </p>
                </div>

                {/* Stage 2: Cryptographic Signature */}
                <div className="p-4 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] space-y-2 border border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#2d3748] flex items-center gap-1.5 uppercase">
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      2. HMAC-SHA256 Підпис
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                      Захищено
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] leading-normal">
                    Криптографічне хешування та генерація цифрового підпису для виключення підміни або модифікації пакетів у дорозі.
                  </p>
                </div>

                {/* Stage 3: Rate Limiting & Anti-Brute-Force */}
                <div className="p-4 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] space-y-2 border border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#2d3748] flex items-center gap-1.5 uppercase">
                      <Activity className="w-3.5 h-3.5 text-rose-600" />
                      3. Anti-DDoS & Rate Limit
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                      20 req/хв
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] leading-normal">
                    Ковзне вікно лімітування запитів захищає API від автоматизованих спам-ботів та спроб перебору.
                  </p>
                </div>

                {/* Stage 4: XSS & Injection Neutralizer */}
                <div className="p-4 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] space-y-2 border border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#2d3748] flex items-center gap-1.5 uppercase">
                      <Cpu className="w-3.5 h-3.5 text-purple-600" />
                      4. Санітизація XSS
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                      Фільтрація
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] leading-normal">
                    Блокування псевдопротоколів (javascript:, data:), очищення HTML-сутностей та інваріантна перевірка типів.
                  </p>
                </div>
              </div>

              {/* Firestore Security Rules Status Banner */}
              <div className="p-4 rounded-2xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] flex items-center justify-between gap-3 border border-white/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2d3748]">Cloud Firestore Security Rules v2</div>
                    <div className="text-[10px] text-[#64748b]">Правила безпеки розгорнуто: глобальний Default-Deny захист</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg shrink-0">
                  ENFORCED
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Publish Button */}
        <div className="p-6 sm:p-8 pt-4 border-t border-[#bec4cf]/30 bg-[#e0e5ec]">
          {saveSuccess && (
            <div className="mb-3 text-center text-xs font-bold text-emerald-600 animate-in fade-in flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" /> Зміни збережено в базі даних та опубліковано для всіх!
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-13 px-5 rounded-2xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-xs font-bold uppercase tracking-wider text-[#64748b] hover:text-[#2d3748] hover:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] transition-all"
            >
              Закрити
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex-1 h-13 sm:h-14 rounded-2xl bg-blue-500 shadow-[8px_8px_16px_#bec4cf,-8px_-8px_16px_#ffffff] text-white font-bold uppercase tracking-widest text-xs sm:text-sm hover:brightness-110 active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.25)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Публікація...' : 'Опублікувати Зміни'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
