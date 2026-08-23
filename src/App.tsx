/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Share2, 
  Check, 
  Radio, 
  BadgeCheck, 
  Zap, 
  LogOut, 
  Sliders,
  Loader2
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  db, 
  ADMIN_EMAIL, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  onSnapshot 
} from './firebase';
import { BioProfile, ToastMessage } from './types';
import { sanitizeProfilePayload } from './security';
import { StatsSection } from './components/StatsSection';
import { PromoSection } from './components/PromoSection';
import { NewsSection } from './components/NewsSection';
import { LinksList } from './components/LinksList';
import { AdminModal } from './components/AdminModal';
import { Toast } from './components/Toast';

// Google G-Logo SVG Component
const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const DEFAULT_NEXUS_PROFILE: BioProfile = {
  avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
  displayName: 'NEXUS',
  handle: '@chak.tt',
  bioText: '🚀 Офіційний акаунт NEXUS | Трендовий контент, стріми та промокод #NEXUS ✨',
  promoCode: '#NEXUS',
  stats: {
    followers: '0',
    likes: '0',
    views: '0'
  },
  links: [
    {
      id: 'nexus_tt_1',
      title: 'TikTok @chak.tt (Офіційний)',
      url: 'https://tiktok.com/@chak.tt',
      icon: 'tiktok',
      highlighted: true,
      clicks: 0
    },
    {
      id: 'nexus_tg_2',
      title: 'Telegram Канал NEXUS',
      url: 'https://t.me',
      icon: 'telegram',
      highlighted: true,
      clicks: 0
    },
    {
      id: 'nexus_yt_3',
      title: 'YouTube Канал',
      url: 'https://youtube.com',
      icon: 'youtube',
      highlighted: false,
      clicks: 0
    },
    {
      id: 'nexus_inst_4',
      title: 'Instagram Профіль',
      url: 'https://instagram.com',
      icon: 'instagram',
      highlighted: false,
      clicks: 0
    }
  ],
  news: [
    {
      id: 'news_init_1',
      title: '🔥 Активуйте офіційний промокод #NEXUS!',
      content: 'Отримуйте ексклюзивні бонуси та знижки за нашим фірмовим промокодом #NEXUS. Тисніть на плашку промокоду, щоб скопіювати!',
      tag: '🎁 ПРОМОКОД',
      isPinned: true,
      date: 'Сьогодні',
      createdAt: Date.now()
    },
    {
      id: 'news_init_2',
      title: '🎬 Нове відео вже на TikTok @chak.tt',
      content: 'Свіжий ролик уже опубліковано! Залітайте, ставте лайки та залишайте коментарі під відео.',
      tag: '🔥 HOT',
      isPinned: false,
      date: 'Вчора',
      createdAt: Date.now() - 86400000
    }
  ]
};

export default function App() {
  const [profile, setProfile] = useState<BioProfile>(DEFAULT_NEXUS_PROFILE);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCopiedShare, setIsCopiedShare] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Toast notification helper
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to normalize and update profile state
  const updateProfileState = useCallback((data: Partial<BioProfile>) => {
    setProfile({
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : DEFAULT_NEXUS_PROFILE.avatarUrl,
      displayName: data.displayName || 'NEXUS',
      handle: data.handle || '@chak.tt',
      bioText: data.bioText !== undefined ? data.bioText : DEFAULT_NEXUS_PROFILE.bioText,
      promoCode: data.promoCode || '#NEXUS',
      stats: {
        followers: data.stats?.followers ?? '0',
        likes: data.stats?.likes ?? '0',
        views: data.stats?.views ?? '0'
      },
      links: Array.isArray(data.links) ? data.links : DEFAULT_NEXUS_PROFILE.links,
      news: Array.isArray(data.news) ? data.news : DEFAULT_NEXUS_PROFILE.news
    });
    setImageError(false);
  }, []);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email && user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time Database Synchronization (Firebase Firestore + Server Backup Sync)
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    try {
      const docRef = doc(db, 'nexus_profile', 'main');
      unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data) {
            updateProfileState(data as BioProfile);
            setIsLiveConnected(true);
          }
        }
      }, (err) => {
        console.warn('Firestore snapshot notice, connecting backup:', err);
      });
    } catch (e) {
      console.warn('Firestore listener setup notice:', e);
    }

    // Server API Sync as secondary real-time fallback
    const fetchServerProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.profile) {
            updateProfileState(json.profile);
            setIsLiveConnected(true);
          }
        }
      } catch (err) {
        console.warn('Server profile fetch notice:', err);
      }
    };

    fetchServerProfile();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/profile/events');
      eventSource.onopen = () => setIsLiveConnected(true);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data) {
            updateProfileState(data);
            setIsLiveConnected(true);
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (eventSource) eventSource.close();
    };
  }, [updateProfileState]);

  // 1-Click Google Sign In with Firebase Auth
  const handleGoogleSignInClick = async () => {
    if (isAdmin) {
      setIsAdminOpen(true);
      return;
    }

    setIsAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user && user.email && user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
        setIsAdmin(true);
        setIsAdminOpen(true);
        showToast('Успішний вхід через Google!', 'success');
      } else {
        await signOut(auth);
        setIsAdmin(false);
        showToast('У доступі відмовлено: цей Google акаунт не має прав адміністратора', 'error');
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Вікно авторизації було закрите', 'info');
      } else if (err.code === 'auth/unauthorized-domain') {
        showToast('Домен не авторизовано у Firebase Console. Додайте домен у Firebase Authentication Settings -> Authorized Domains.', 'error');
      } else {
        showToast('Помилка авторизації Google: ' + (err?.message || 'Спробуйте ще раз'), 'error');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
      setIsAdminOpen(false);
      showToast('Ви успішно вийшли з акаунта адміністратора', 'info');
    } catch (e: any) {
      setIsAdmin(false);
      setIsAdminOpen(false);
    }
  };

  // Save profile changes to Firebase Firestore + Server
  const handleSaveProfile = async (updatedData: Partial<BioProfile>) => {
    try {
      const sanitized = sanitizeProfilePayload(updatedData);

      // 1. Save to Firebase Firestore
      try {
        const docRef = doc(db, 'nexus_profile', 'main');
        await setDoc(docRef, sanitized, { merge: true });
      } catch (firestoreErr) {
        console.warn('Firestore write warning:', firestoreErr);
      }

      // 2. Save to Server DB backup
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized)
      });

      if (!res.ok) {
        throw new Error('Помилка сервера: код ' + res.status);
      }

      const json = await res.json();
      if (json.success && json.profile) {
        updateProfileState(json.profile);
      }

      showToast('Всі зміни збережено у Firebase та оновлено для всіх відвідувачів!', 'success');
    } catch (err: any) {
      console.error('Database save error:', err);
      showToast('Помилка збереження даних: ' + (err?.message || 'Невідома помилка'), 'error');
      throw err;
    }
  };

  const handleShareBio = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopiedShare(true);
      showToast('Посилання на NEXUS Bio скопійовано!', 'success');
      setTimeout(() => setIsCopiedShare(false), 2000);
    }
  };

  const hasAvatar = Boolean(profile.avatarUrl && profile.avatarUrl.trim() && !imageError);

  return (
    <div className="min-h-screen w-full bg-[#e0e5ec] text-[#2d3748] flex flex-col items-center justify-start sm:justify-center p-3.5 sm:p-8 font-sans select-none overflow-x-hidden">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Main NEXUS Card */}
      <div className="w-full max-w-[440px] flex flex-col items-center bg-[#e0e5ec] rounded-[36px] sm:rounded-[48px] shadow-[20px_20px_60px_#bec4cf,-20px_-20px_60px_#ffffff] p-5 sm:p-8 relative my-3 sm:my-6 border border-white/40">
        
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between mb-5 gap-2">
          {/* Realtime Live Status */}
          <div 
            title="Синхронізація в реальному часі для всіх відвідувачів"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-[10px] sm:text-[11px] font-bold text-[#64748b] shrink-0"
          >
            <Radio className={`w-3 h-3 ${isLiveConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
            <span>{isLiveConnected ? 'REALTIME LIVE' : 'Підключення...'}</span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {!isAdmin ? (
              <button
                onClick={handleGoogleSignInClick}
                disabled={isAuthLoading}
                id="google-login-button"
                className="h-8 px-3 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#2d3748] hover:text-blue-600 active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer disabled:opacity-60"
                title="Оберіть свій Google акаунт для входу"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{isAuthLoading ? 'Вхід...' : 'Гугл Вхід'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsAdminOpen(true)}
                  id="admin-settings-top-button"
                  className="h-8 px-3 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-blue-600 hover:text-blue-700 active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Панель Адміністратора NEXUS"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Адмін</span>
                </button>
                <button
                  onClick={handleLogout}
                  id="admin-logout-top-button"
                  className="w-8 h-8 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-rose-500 hover:text-rose-600 active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center transition-all cursor-pointer"
                  title="Вийти з акаунта"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={handleShareBio}
              id="share-bio-button"
              className="w-8 h-8 rounded-xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] text-[#64748b] hover:text-[#2d3748] active:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center transition-all shrink-0 cursor-pointer"
              title="Поділитися сайтом"
            >
              {isCopiedShare ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Circular Avatar with Neumorphic Rim */}
        <div className="relative mb-4 group">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#e0e5ec] shadow-[10px_10px_24px_#bec4cf,-10px_-10px_24px_#ffffff] p-1 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            {hasAvatar ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName || 'NEXUS Avatar'}
                className="w-full h-full rounded-full object-cover border-2 border-white/60"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#e0e5ec] shadow-[inset_6px_6px_12px_#bec4cf,inset_-6px_-6px_12px_#ffffff] flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-[#94a3b8]" />
              </div>
            )}
          </div>

          {/* TikTok Verified Badge on Avatar */}
          <div 
            className="absolute bottom-0 right-1 p-1 rounded-full bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] text-blue-500 flex items-center justify-center"
            title="Офіційний верифікований акаунт"
          >
            <BadgeCheck className="w-5 h-5 fill-blue-500 text-white" />
          </div>
        </div>

        {/* Display Name NEXUS & TikTok Handle @chak.tt */}
        <div className="w-full flex flex-col items-center px-2 mb-1 text-center">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#2d3748] uppercase">
              {profile.displayName || 'NEXUS'}
            </h1>
            <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
          </div>

          <a 
            href={`https://tiktok.com/@${(profile.handle || '@chak.tt').replace(/^@/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 mt-0.5 tracking-wide flex items-center gap-1 transition-colors"
          >
            {profile.handle?.startsWith('@') ? profile.handle : `@${profile.handle || 'chak.tt'}`}
          </a>

          {profile.bioText && (
            <p className="text-xs text-[#64748b] mt-2 max-w-xs leading-relaxed whitespace-pre-line font-medium">
              {profile.bioText}
            </p>
          )}
        </div>

        {/* Official Promo Code Section (#NEXUS) */}
        <PromoSection 
          promoCode={profile.promoCode || '#NEXUS'} 
          onCopyNotice={(msg) => showToast(msg, 'success')} 
        />

        {/* TikTok Statistics (Followers, Likes, Views - defaults to 0) */}
        <StatsSection stats={profile.stats} />

        {/* Shorts News Section (Live admin feed) */}
        <NewsSection news={profile.news} />

        {/* Links List Buttons */}
        <div className="w-full my-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-widest">
              Офіційні Посилання
            </span>
          </div>
          <LinksList links={profile.links} />
        </div>

        {/* Bottom Admin Bar or Google Login */}
        <div className="mt-4 pt-3 w-full flex flex-col items-center justify-center select-none border-t border-[#bec4cf]/30">
          {isAdmin ? (
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-bold text-[#2d3748]">
                  Режим Адміністратора
                </span>
              </div>
              <button
                onClick={() => setIsAdminOpen(true)}
                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all shadow-[2px_2px_4px_#bec4cf] cursor-pointer"
              >
                Керувати
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignInClick}
              disabled={isAuthLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#e0e5ec] shadow-[4px_4px_8px_#bec4cf,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-[#2d3748] hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {isAuthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <GoogleIcon />
              )}
              <span>{isAuthLoading ? 'Підключення Google...' : 'Увійти через Google для редагування'}</span>
            </button>
          )}

          <div className="mt-2 text-[10px] text-[#94a3b8] font-medium tracking-wider uppercase">
            NEXUS Bio © 2026 • Realtime Firebase
          </div>
        </div>
      </div>

      {/* Admin Panel Modal */}
      {isAdminOpen && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          profile={profile}
          onSaveProfile={handleSaveProfile}
          onLogout={handleLogout}
          adminEmail={ADMIN_EMAIL}
        />
      )}
    </div>
  );
}
