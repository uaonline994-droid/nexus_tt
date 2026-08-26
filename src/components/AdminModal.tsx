import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  BarChart3, 
  Tag, 
  LogOut, 
  Check, 
  Database, 
  Newspaper, 
  Pin, 
  ShieldCheck, 
  Lock, 
  Key, 
  Activity, 
  Cpu, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  AlertCircle,
  Users,
  Video,
  MessageSquare,
  VolumeX,
  Volume2,
  Ban,
  Unlock,
  Clock,
  Radio,
  UserPlus,
  ShieldAlert
} from 'lucide-react';
import { BioProfile, BioLink, TikTokStats, NewsPost, WebRoomSettings, ChatSettings, ChatModerationState } from '../types';
import { checkFirestoreConnection } from '../databaseService';
import { 
  subscribeToWebRoomSettings, 
  saveWebRoomSettings, 
  subscribeToChatSettings, 
  saveChatSettings, 
  subscribeToModerationState, 
  setModerationStatus, 
  clearAllChatMessages,
  DEFAULT_CHAT_SETTINGS,
  DEFAULT_WEB_ROOM_SETTINGS
} from '../chatService';
import { 
  isMasterAdmin, 
  subscribeToSecurityIncidents, 
  reportSecurityIntrusion, 
  SecurityIncident, 
  MASTER_ADMIN_EMAIL 
} from '../securityService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BioProfile;
  onSaveProfile: (profile: Partial<BioProfile>) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'profile' | 'news' | 'links' | 'stats' | 'access' | 'database' | 'security'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ loading: boolean; connected: boolean | null; message: string }>({
    loading: false,
    connected: null,
    message: ''
  });

  // Access & Moderation State
  const [webRoomSettings, setWebRoomSettings] = useState<WebRoomSettings>(DEFAULT_WEB_ROOM_SETTINGS);
  const [newWebRoomEmail, setNewWebRoomEmail] = useState('');
  
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [newChatEmail, setNewChatEmail] = useState('');

  const [moderationState, setModerationState] = useState<ChatModerationState>({ mutedUsers: {}, bannedUsers: {} });
  const [modTargetEmail, setModTargetEmail] = useState('');
  const [modActionType, setModActionType] = useState<'mute_15' | 'mute_60' | 'mute_1440' | 'ban'>('mute_60');
  const [modReason, setModReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Security Incident Audit Logs
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>([]);

  // Guard: Auto-eject non-master-admins if modal is somehow opened
  useEffect(() => {
    if (isOpen && !isMasterAdmin(adminEmail)) {
      onClose();
    }
  }, [isOpen, adminEmail, onClose]);

  // Subscribe to real-time settings and security incidents when opened
  useEffect(() => {
    if (!isOpen) return;
    const unsubWeb = subscribeToWebRoomSettings((ws) => setWebRoomSettings(ws));
    const unsubChat = subscribeToChatSettings((cs) => setChatSettings(cs));
    const unsubMod = subscribeToModerationState((ms) => setModerationState(ms));
    const unsubSec = subscribeToSecurityIncidents((incidents) => setSecurityIncidents(incidents));
    return () => {
      unsubWeb();
      unsubChat();
      unsubMod();
      unsubSec();
    };
  }, [isOpen]);

  const flashFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Web Room handlers
  const handleToggleBetaTest = async (enabled: boolean) => {
    const updated = { ...webRoomSettings, betaTestForAll: enabled };
    setWebRoomSettings(updated);
    await saveWebRoomSettings(updated);
    flashFeedback(enabled ? '🌐 Веб-кімнату відкрито для ВСІХ користувачів!' : '🔒 Веб-кімнату закрито (доступ лише за білим списком)');
  };

  const handleAddWebRoomEmail = async () => {
    if (!newWebRoomEmail.trim()) return;
    const email = newWebRoomEmail.trim().toLowerCase();
    const current = webRoomSettings.allowedEmails || [];
    if (current.map(e => e.toLowerCase()).includes(email)) {
      flashFeedback(`Email ${email} вже є в списку доступу`);
      return;
    }
    const updated = {
      ...webRoomSettings,
      allowedEmails: [...current, email]
    };
    setWebRoomSettings(updated);
    setNewWebRoomEmail('');
    await saveWebRoomSettings(updated);
    flashFeedback(`✅ Доступ до веб-кімнати надано для ${email}`);
  };

  const handleRemoveWebRoomEmail = async (emailToRemove: string) => {
    if (emailToRemove.toLowerCase() === adminEmail.toLowerCase()) {
      flashFeedback('Неможливо видалити головного адміністратора');
      return;
    }
    const updated = {
      ...webRoomSettings,
      allowedEmails: (webRoomSettings.allowedEmails || []).filter(e => e.toLowerCase() !== emailToRemove.toLowerCase())
    };
    setWebRoomSettings(updated);
    await saveWebRoomSettings(updated);
    flashFeedback(`🗑️ Доступ до веб-кімнати відкликано для ${emailToRemove}`);
  };

  // Chat Access handlers
  const handleSetChatMode = async (mode: 'open' | 'whitelist' | 'readonly') => {
    const updated: ChatSettings = {
      ...chatSettings,
      isChatOpenForAll: mode === 'open',
      whitelistOnly: mode === 'whitelist',
      isReadOnly: mode === 'readonly'
    };
    setChatSettings(updated);
    await saveChatSettings(updated);
    if (mode === 'open') flashFeedback('🟢 Чат відкрито для ВСІХ глядачів!');
    else if (mode === 'whitelist') flashFeedback('🟡 Чат доступний ТІЛЬКИ для користувачів із білого списку!');
    else flashFeedback('🔴 Чат закрито (Режим "Тільки читання")!');
  };

  const handleAddChatEmail = async () => {
    if (!newChatEmail.trim()) return;
    const email = newChatEmail.trim().toLowerCase();
    const current = chatSettings.allowedChatEmails || [];
    if (current.map(e => e.toLowerCase()).includes(email)) {
      flashFeedback(`Email ${email} вже є в білому списку чату`);
      return;
    }
    const updated: ChatSettings = {
      ...chatSettings,
      allowedChatEmails: [...current, email]
    };
    setChatSettings(updated);
    setNewChatEmail('');
    await saveChatSettings(updated);
    flashFeedback(`✅ Доступ до чату надано для ${email}`);
  };

  const handleRemoveChatEmail = async (emailToRemove: string) => {
    if (emailToRemove.toLowerCase() === adminEmail.toLowerCase()) {
      flashFeedback('Неможливо видалити головного адміністратора');
      return;
    }
    const updated: ChatSettings = {
      ...chatSettings,
      allowedChatEmails: (chatSettings.allowedChatEmails || []).filter(e => e.toLowerCase() !== emailToRemove.toLowerCase())
    };
    setChatSettings(updated);
    await saveChatSettings(updated);
    flashFeedback(`🗑️ Доступ до чату відкликано для ${emailToRemove}`);
  };

  const handleSetSlowmode = async (seconds: number) => {
    const updated: ChatSettings = {
      ...chatSettings,
      slowmodeSeconds: seconds
    };
    setChatSettings(updated);
    await saveChatSettings(updated);
    flashFeedback(seconds === 0 ? '⚡ Антиспам вимкнено (0s)' : `⏱️ Антиспам таймер: ${seconds} сек`);
  };

  // Moderation handlers
  const handleApplyModeration = async () => {
    if (!modTargetEmail.trim()) return;
    const target = modTargetEmail.trim().toLowerCase();
    if (target === adminEmail.toLowerCase()) {
      flashFeedback('Неможливо накласти обмеження на адміністратора');
      return;
    }

    if (modActionType === 'ban') {
      await setModerationStatus(target, 'ban', 0, modReason.trim() || 'Порушення правил чату');
      flashFeedback(`⛔ Користувача ${target} повністю заблоковано в чаті.`);
    } else {
      const minutes = modActionType === 'mute_15' ? 15 : modActionType === 'mute_60' ? 60 : 1440;
      await setModerationStatus(target, 'mute', minutes, modReason.trim() || 'Тимчасовий мут');
      flashFeedback(`🔇 Користувачу ${target} видано мут на ${minutes} хв.`);
    }
    setModTargetEmail('');
    setModReason('');
  };

  const handleUnbanUser = async (email: string) => {
    await setModerationStatus(email, 'unban');
    flashFeedback(`🔓 Користувача ${email} розблоковано.`);
  };

  const handleUnmuteUser = async (email: string) => {
    await setModerationStatus(email, 'unmute');
    flashFeedback(`🔊 З користувача ${email} знято мут.`);
  };

  const handleClearAllChat = async () => {
    if (window.confirm('Ви впевнені, що хочете видалити всі повідомлення в чаті для всіх?')) {
      await clearAllChatMessages();
      flashFeedback('🧹 Всі повідомлення чату успішно видалено.');
    }
  };

  // Profile fields
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [displayName, setDisplayName] = useState(profile.displayName || 'NEXUS');
  const [handle, setHandle] = useState(profile.handle || '@chak.tt');
  const [bioText, setBioText] = useState(profile.bioText || '');
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
        news: news
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new link
  const handleAddLink = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const newLink: BioLink = {
      id: 'link_' + Date.now(),
      title: newTitle.trim(),
      url: newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`,
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

  // Delete a link
  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  // Move a link up or down
  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    const newLinks = [...links];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;
    setLinks(newLinks);
  };

  // Update an existing link in the state
  const handleUpdateLink = (id: string, updates: Partial<BioLink>) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  // Add news post
  const handleAddNews = () => {
    if (!newNewsTitle.trim() || !newNewsContent.trim()) return;
    const newPost: NewsPost = {
      id: 'news_' + Date.now(),
      title: newNewsTitle.trim(),
      content: newNewsContent.trim(),
      tag: newNewsTag.trim(),
      imageUrl: newNewsImage.trim() || undefined,
      isPinned: newNewsPinned,
      date: 'Сьогодні',
      createdAt: Date.now()
    };
    setNews([newPost, ...news]);
    setNewNewsTitle('');
    setNewNewsContent('');
    setNewNewsImage('');
    setNewNewsPinned(false);
  };

  // Delete news post
  const handleDeleteNews = (id: string) => {
    setNews(news.filter((n) => n.id !== id));
  };

  // Toggle pin news
  const handleTogglePinNews = (id: string) => {
    setNews(news.map((n) => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  // Preset Template Helper
  const handleApplyNexusTemplate = () => {
    setDisplayName('NEXUS');
    setHandle('@chak.tt');
    setBioText('🚀 Офіційний акаунт NEXUS | Трендовий контент, стріми та промокод #NEXUS ✨');
    setPromoCode('#NEXUS');
    setAvatarUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80');
    setStats({
      followers: '0',
      likes: '0',
      views: '0'
    });
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
        clicks: 210
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="admin-panel-container"
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[32px] bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden border border-white/90"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              NEXUS Admin Panel
            </h2>
            <span className="hidden sm:inline-block text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
              Адміністратор
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyNexusTemplate}
              title="Застосувати фірмовий стиль NEXUS"
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-indigo-600 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span className="hidden sm:inline">Шаблон NEXUS</span>
            </button>

            <button
              onClick={onLogout}
              title="Вийти з акаунта"
              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 sm:px-8 py-3 border-b border-slate-200/60 bg-white/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Профіль & Промокод
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'news' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            Шортс Новини ({news.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'links' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Посилання ({links.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stats' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            TikTok Статистика
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'access' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Доступ & Чат
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'database' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            База Даних & Хмара
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'security' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Безпека
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-white/40">
          {/* TAB 1: PROFILE & PROMO */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Promo code field */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <label className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Фірмовий Промокод (1-клік копіювання)
                </label>
                <div className="w-full h-11 rounded-xl bg-white border border-amber-200 px-3.5 flex items-center shadow-xs">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="#NEXUS"
                    className="bg-transparent w-full text-base font-mono font-bold outline-none text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase ml-1 tracking-wider block">
                    Назва Акаунту
                  </label>
                  <div className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-colors">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="NEXUS"
                      className="bg-transparent w-full text-sm font-bold outline-none text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase ml-1 tracking-wider block">
                    TikTok Юзернейм (Handle)
                  </label>
                  <div className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-colors">
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@chak.tt"
                      className="bg-transparent w-full text-sm font-bold outline-none text-indigo-600 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase ml-1 tracking-wider block">
                  Аватар URL (Посилання на фото)
                </label>
                <div className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-colors">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-transparent w-full text-sm outline-none text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase ml-1 tracking-wider block">
                  Опис Профілю (Bio)
                </label>
                <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 focus-within:border-indigo-500 focus-within:bg-white transition-colors">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    rows={3}
                    placeholder="Опис профілю NEXUS..."
                    className="bg-transparent w-full text-sm outline-none text-slate-800 placeholder-slate-400 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHORTS NEWS (CRUD) */}
          {activeTab === 'news' && (
            <div className="space-y-5">
              {/* Add News Post Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-3.5 shadow-xs">
                <h3 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Створити Шортс Новину / Оголошення
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 ml-1">Заголовок новини</label>
                    <div className="w-full h-10 rounded-xl bg-white border border-slate-200 px-3 flex items-center shadow-2xs">
                      <input
                        type="text"
                        value={newNewsTitle}
                        onChange={(e) => setNewNewsTitle(e.target.value)}
                        placeholder="наприклад: Стрім сьогодні о 19:00!"
                        className="bg-transparent w-full text-xs font-bold outline-none text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 ml-1">Тег / Бейдж</label>
                    <select
                      value={newNewsTag}
                      onChange={(e) => setNewNewsTag(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-2xs"
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
                  <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 ml-1">Текст новини</label>
                  <div className="w-full rounded-xl bg-white border border-slate-200 p-2.5 shadow-2xs">
                    <textarea
                      value={newNewsContent}
                      onChange={(e) => setNewNewsContent(e.target.value)}
                      rows={2}
                      placeholder="Опишіть новину або новинки у TikTok для глядачів..."
                      className="bg-transparent w-full text-xs outline-none text-slate-800 placeholder-slate-400 resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase font-bold text-slate-600">
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
                    className="w-full sm:w-auto h-9 px-4 rounded-xl bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Опублікувати Новину
                  </button>
                </div>
              </div>

              {/* Existing News List */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase ml-1 block">
                  Активні Новини ({news.length})
                </label>

                {news.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                    Ще немає опублікованих новин.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {news.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            <span className="text-xs font-bold text-slate-800 truncate">{item.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 line-clamp-1">{item.content}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePinNews(item.id)}
                            title={item.isPinned ? 'Відкріпити' : 'Закріпити'}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer ${
                              item.isPinned 
                                ? 'bg-amber-50 border-amber-200 text-amber-600' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNews(item.id)}
                            title="Видалити"
                            className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 hover:text-rose-700 cursor-pointer"
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
            <div className="space-y-5">
              {/* Add New Link Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-3.5 shadow-xs">
                <h3 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Додати Нову Кнопку / Посилання
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 ml-1">Назва кнопки</label>
                    <div className="w-full h-10 rounded-xl bg-white border border-slate-200 px-3 flex items-center shadow-2xs">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="наприклад: Мій YouTube Канал"
                        className="bg-transparent w-full text-xs outline-none text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 ml-1">Посилання (URL)</label>
                    <div className="w-full h-10 rounded-xl bg-white border border-slate-200 px-3 flex items-center shadow-2xs">
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-transparent w-full text-xs outline-none text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] uppercase font-bold text-slate-600">Іконка:</label>
                    <select
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none cursor-pointer font-medium shadow-2xs"
                    >
                      <option value="tiktok">TikTok</option>
                      <option value="telegram">Telegram</option>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="globe">Веб-сайт</option>
                      <option value="shop">Магазин / Мерч</option>
                      <option value="mail">Email / Співпраця</option>
                    </select>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase font-bold text-slate-600 ml-2">
                      <input
                        type="checkbox"
                        checked={newHighlighted}
                        onChange={(e) => setNewHighlighted(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      Виділити ✨
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={!newTitle.trim() || !newUrl.trim()}
                    className="w-full sm:w-auto h-9 px-4 rounded-xl bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Додати
                  </button>
                </div>
              </div>

              {/* Existing Links List */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase ml-1 block">
                  Список Кнопок ({links.length})
                </label>

                {links.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                    Немає доданих посилань.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {links.map((link, idx) => (
                      <div
                        key={link.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) => handleUpdateLink(link.id, { title: e.target.value })}
                            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 font-bold outline-none"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => handleUpdateLink(link.id, { url: e.target.value })}
                            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateLink(link.id, { highlighted: !link.highlighted })}
                            title="Виділити"
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs cursor-pointer ${
                              link.highlighted ? 'bg-amber-50 border-amber-200 text-amber-600 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveLink(idx, 'up')}
                            className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === links.length - 1}
                            onClick={() => handleMoveLink(idx, 'down')}
                            className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLink(link.id)}
                            className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 cursor-pointer"
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
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-600 leading-relaxed">
                💡 Введіть показники статистики TikTok для відображення в кольорових плашках:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-blue-700 uppercase ml-1 tracking-wider block">
                    Followers
                  </label>
                  <div className="w-full h-11 rounded-xl bg-blue-50/40 border border-blue-200 px-3.5 flex items-center focus-within:border-blue-500 focus-within:bg-white transition-colors">
                    <input
                      type="text"
                      value={stats.followers}
                      onChange={(e) => setStats({ ...stats, followers: e.target.value })}
                      placeholder="120K"
                      className="bg-transparent w-full text-sm font-bold outline-none text-blue-950 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-rose-700 uppercase ml-1 tracking-wider block">
                    Likes
                  </label>
                  <div className="w-full h-11 rounded-xl bg-rose-50/40 border border-rose-200 px-3.5 flex items-center focus-within:border-rose-500 focus-within:bg-white transition-colors">
                    <input
                      type="text"
                      value={stats.likes}
                      onChange={(e) => setStats({ ...stats, likes: e.target.value })}
                      placeholder="1.8M"
                      className="bg-transparent w-full text-sm font-bold outline-none text-rose-950 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-emerald-700 uppercase ml-1 tracking-wider block">
                    Views
                  </label>
                  <div className="w-full h-11 rounded-xl bg-emerald-50/40 border border-emerald-200 px-3.5 flex items-center focus-within:border-emerald-500 focus-within:bg-white transition-colors">
                    <input
                      type="text"
                      value={stats.views}
                      onChange={(e) => setStats({ ...stats, views: e.target.value })}
                      placeholder="5.2M"
                      className="bg-transparent w-full text-sm font-bold outline-none text-emerald-950 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCESS & MODERATION (WEB ROOM & CHAT) */}
          {activeTab === 'access' && (
            <div className="space-y-6">
              {/* Feedback toast banner */}
              {actionFeedback && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900 flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{actionFeedback}</span>
                </div>
              )}

              {/* 1. WEB ROOM ACCESS CARD */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        1. Доступ до Веб-кімнати (Голос / Відео)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Виберіть: відкрити веб-кімнату для всіх або надавати доступ окремим людям
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    webRoomSettings.betaTestForAll 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {webRoomSettings.betaTestForAll ? '🌐 Для Всіх' : '🔒 За Списком'}
                  </span>
                </div>

                {/* Mode switch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleBetaTest(true)}
                    className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                      webRoomSettings.betaTestForAll
                        ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      webRoomSettings.betaTestForAll ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">🌐 Відкрити для всіх</div>
                      <div className="text-[10px] text-slate-500">Будь-який глядач може заходити в кімнату</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleBetaTest(false)}
                    className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                      !webRoomSettings.betaTestForAll
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      !webRoomSettings.betaTestForAll ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">🔒 Тільки за білим списком</div>
                      <div className="text-[10px] text-slate-500">Доступ лише для обраних Email-адрес</div>
                    </div>
                  </button>
                </div>

                {/* Add single user to Web Room whitelist */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
                    Надати персональний доступ користувачу (по Email):
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <input
                        type="email"
                        value={newWebRoomEmail}
                        onChange={(e) => setNewWebRoomEmail(e.target.value)}
                        placeholder="наприклад: user@gmail.com"
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWebRoomEmail}
                      disabled={!newWebRoomEmail.trim()}
                      className="w-full sm:w-auto h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      + Надати доступ до кімнати
                    </button>
                  </div>

                  {/* List of Allowed Web Room Users */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      Список дозволених адрес ({(webRoomSettings.allowedEmails || []).length}):
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {(webRoomSettings.allowedEmails || []).map((email) => {
                        const isMainAdmin = email.toLowerCase() === adminEmail.toLowerCase();
                        return (
                          <div
                            key={email}
                            className="p-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                          >
                            <span className="font-mono text-slate-800 truncate">{email}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {isMainAdmin ? (
                                <span className="text-[9.5px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                                  👑 Головний Адмін
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWebRoomEmail(email)}
                                  className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Відкликати доступ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. CHAT ACCESS & PERMISSIONS CARD */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        2. Доступ до Загального Чату
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Керуйте режимами чату (відкрито для всіх, білий список або тільки читання)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 Chat Modes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetChatMode('open')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      chatSettings.isChatOpenForAll && !chatSettings.isReadOnly && !chatSettings.whitelistOnly
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Для всіх
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Всі авторизовані можуть писати</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetChatMode('whitelist')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      chatSettings.whitelistOnly
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Білий список
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Лише обрані користувачі</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetChatMode('readonly')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      chatSettings.isReadOnly
                        ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Тільки читання
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Чат закрито для відправки</div>
                  </button>
                </div>

                {/* Add to Chat Whitelist */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
                    Додати користувача в білий список чату:
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="email"
                      value={newChatEmail}
                      onChange={(e) => setNewChatEmail(e.target.value)}
                      placeholder="наприклад: user@gmail.com"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddChatEmail}
                      disabled={!newChatEmail.trim()}
                      className="w-full sm:w-auto h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      + Додати в білий список
                    </button>
                  </div>

                  {/* Whitelist items */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      Користувачі з дозволом на чат ({(chatSettings.allowedChatEmails || []).length}):
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                      {(chatSettings.allowedChatEmails || []).map((email) => {
                        const isMainAdmin = email.toLowerCase() === adminEmail.toLowerCase();
                        return (
                          <div
                            key={email}
                            className="p-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                          >
                            <span className="font-mono text-slate-800 truncate">{email}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {isMainAdmin ? (
                                <span className="text-[9.5px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                                  👑 Адмін
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChatEmail(email)}
                                  className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Видалити з білого списку"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Slowmode cooldown selection */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] font-bold uppercase text-slate-700">Антиспам кулдаун (Slowmode):</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { sec: 0, label: 'Вимкнено' },
                      { sec: 30, label: '30 сек' },
                      { sec: 60, label: '1 хв' },
                      { sec: 300, label: '5 хв' }
                    ].map((item) => (
                      <button
                        key={item.sec}
                        type="button"
                        onClick={() => handleSetSlowmode(item.sec)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          chatSettings.slowmodeSeconds === item.sec
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. INDIVIDUAL BAN / MUTE MODERATION CARD */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      3. Персональний Бан або Мут (Закрити доступ 1 користувачу)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Введіть Email користувача, щоб заборонити йому писати в чат тимчасово або назавжди
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 ml-1">Email порушника</label>
                    <input
                      type="email"
                      value={modTargetEmail}
                      onChange={(e) => setModTargetEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 ml-1">Дія / Покарання</label>
                    <select
                      value={modActionType}
                      onChange={(e) => setModActionType(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="mute_15">🔇 Мут на 15 хв</option>
                      <option value="mute_60">🔇 Мут на 1 год</option>
                      <option value="mute_1440">🔇 Мут на 24 год</option>
                      <option value="ban">⛔ Повний Бан</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    value={modReason}
                    onChange={(e) => setModReason(e.target.value)}
                    placeholder="Причина покарання (наприклад: Спам / Неповага)..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyModeration}
                    disabled={!modTargetEmail.trim()}
                    className="w-full sm:w-auto h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Застосувати санкцію
                  </button>
                </div>

                {/* Lists of currently banned and muted users */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  {/* Banned Users */}
                  <div className="space-y-1.5">
                    <span className="text-[10.5px] font-bold text-rose-700 uppercase flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Заблоковані (Бан):
                    </span>
                    {Object.entries(moderationState.bannedUsers || {}).length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-400 italic text-center">
                        Немає заблокованих
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {Object.entries(moderationState.bannedUsers || {}).map(([key, rawData]) => {
                          const data = rawData as { email?: string; reason?: string; bannedAt?: number };
                          const email = data.email || key.replace(/_/g, '.');
                          return (
                            <div key={key} className="p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                              <div className="truncate">
                                <div className="font-mono font-bold text-rose-900 truncate">{email}</div>
                                {data.reason && <div className="text-[10px] text-rose-600">{data.reason}</div>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnbanUser(email)}
                                className="px-2 py-1 bg-white border border-rose-300 rounded text-[10px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer shrink-0 ml-1"
                              >
                                🔓 Розблокувати
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Muted Users */}
                  <div className="space-y-1.5">
                    <span className="text-[10.5px] font-bold text-amber-700 uppercase flex items-center gap-1">
                      <VolumeX className="w-3 h-3" /> У муті:
                    </span>
                    {Object.entries(moderationState.mutedUsers || {}).length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-400 italic text-center">
                        Немає користувачів у муті
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {Object.entries(moderationState.mutedUsers || {}).map(([key, rawData]) => {
                          const data = rawData as { email?: string; mutedUntil: number; reason?: string };
                          const email = data.email || key.replace(/_/g, '.');
                          const remainingMin = Math.max(0, Math.ceil((data.mutedUntil - Date.now()) / 60000));
                          return (
                            <div key={key} className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                              <div className="truncate">
                                <div className="font-mono font-bold text-amber-900 truncate">{email}</div>
                                <div className="text-[10px] text-amber-700">Залишилось: {remainingMin} хв</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnmuteUser(email)}
                                className="px-2 py-1 bg-white border border-amber-300 rounded text-[10px] font-bold text-amber-700 hover:bg-amber-100 cursor-pointer shrink-0 ml-1"
                              >
                                🔊 Зняти мут
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. CLEAR CHAT HISTORY CARD */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    🧹 Очистити історію чату
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Видалити всі повідомлення з чату для всіх глядачів
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllChat}
                  className="w-full sm:w-auto h-9 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Очистити всі повідомлення
                </button>
              </div>
            </div>
          )}

          {/* TAB 4.5: DATABASE & CLOUD SYNC */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              {/* Firestore Cloud Status & Diagnostics Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                      Хмара Firebase Firestore (Проєкт fir-50300)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setCloudStatus({ loading: true, connected: null, message: 'Перевірка з\'єднання...' });
                      const res = await checkFirestoreConnection();
                      setCloudStatus({ loading: false, connected: res.connected, message: res.message });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-600 flex items-center gap-1.5 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cloudStatus.loading ? 'animate-spin' : ''}`} />
                    <span>Перевірити Хмару</span>
                  </button>
                </div>

                {cloudStatus.connected === null && !cloudStatus.loading && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-[11px] text-slate-600 leading-relaxed">
                    💡 Статус бази даних готовий до синхронізації. Натисніть <strong>«Перевірити Хмару»</strong> для повної діагностики зв'язку.
                  </div>
                )}

                {cloudStatus.connected === true && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{cloudStatus.message}</span>
                  </div>
                )}

                {cloudStatus.connected === false && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Помилка доступу до хмари:
                    </div>
                    <p className="text-[10.5px] leading-relaxed font-mono">{cloudStatus.message}</p>
                  </div>
                )}
              </div>

              {/* JSON Database Export / Download */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <span className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  Прямий Експорт Файлу Бази Даних
                </span>
                <p className="text-[11px] text-slate-500">
                  Ви можете завантажити повний файл <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">nexus_database.json</code> з усіма актуальними даними:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const currentData = {
                      displayName: displayName.trim() || 'NEXUS',
                      handle: handle.trim() || '@chak.tt',
                      bioText: bioText.trim(),
                      avatarUrl: avatarUrl.trim(),
                      promoCode: promoCode.trim() || '#NEXUS',
                      stats: stats,
                      links: links,
                      news: news,
                      updatedAt: Date.now()
                    };
                    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'nexus_database.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Завантажити nexus_database.json
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & ENCRYPTION SHIELD */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Багаторівневий Захист NEXUS & Автобан
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                    Active Shield 2.0
                  </span>
                </div>
                <p className="text-[11px] text-emerald-950/80 leading-relaxed">
                  Будь-яка спроба несанкціонованого доступу або виклику функцій адмін-панелі користувачем, відмінним від <strong className="text-emerald-900">{MASTER_ADMIN_EMAIL}</strong>, миттєво блокується автоматичною системою безпеки з довічним баном та записом у журнал інцидентів.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      1. Master Admin Email
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                      Strict Pass
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Права адміна закріплено суворо за: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">{MASTER_ADMIN_EMAIL}</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      2. Intrusion Auto-Ban
                    </span>
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase">
                      Enabled
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Автоматичний бан при спробі зламу, модифікації бази чи підробки прав.
                  </p>
                </div>
              </div>

              {/* SECURITY INCIDENTS AUDIT LOG TABLE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Журнал Спроб Несанкціонованого Доступу ({securityIncidents.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Realtime Security Feed
                  </span>
                </div>

                {securityIncidents.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center space-y-1">
                    <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">Жодних інцидентів або спроб зламу не виявлено</p>
                    <p className="text-[10.5px] text-slate-400">Система захисту активна і контролює всі точки входу.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {securityIncidents.map((incident) => (
                      <div 
                        key={incident.id}
                        className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1.5 font-sans"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="font-bold text-rose-900 font-mono text-[11px]">{incident.intruderEmail}</span>
                            {incident.intruderName && incident.intruderName !== incident.intruderEmail && (
                              <span className="text-[10px] text-slate-500 font-normal">({incident.intruderName})</span>
                            )}
                          </div>
                          <span className="text-[9.5px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full">
                            AUTO-BANNED
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px] text-slate-700 bg-white/80 p-2 rounded-lg border border-rose-100 font-mono">
                          <div>
                            <span className="text-slate-400">📍 Місце спроби:</span> <span className="font-semibold text-slate-800">{incident.location}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">⚡ Дія:</span> <span className="font-semibold text-rose-700">{incident.attemptedAction}</span>
                          </div>
                          <div className="col-span-full">
                            <span className="text-slate-400">🛑 Причина:</span> <span className="text-slate-800">{incident.reason}</span>
                          </div>
                          <div className="col-span-full text-[10px] text-slate-500">
                            <span className="text-slate-400">🕒 Час:</span> {new Date(incident.timestamp).toLocaleString('uk-UA')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Publish Button */}
        <div className="p-5 sm:p-6 pt-3 border-t border-slate-200/80 bg-slate-50/80 backdrop-blur-md">
          {saveSuccess && (
            <div className="mb-2 text-center text-xs font-bold text-emerald-600 animate-in fade-in flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" /> Зміни збережено в базі даних та опубліковано для всіх!
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
            >
              Закрити
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex-1 h-11 sm:h-12 rounded-xl bg-indigo-600 text-white font-bold uppercase tracking-widest text-xs sm:text-sm hover:bg-indigo-700 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
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
