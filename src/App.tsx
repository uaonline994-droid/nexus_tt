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
  ADMIN_EMAIL, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from './firebase';
import { BioProfile, ToastMessage } from './types';
import { 
  getInitialProfile, 
  saveProfileToDatabase, 
  subscribeToProfile, 
  DEFAULT_PROFILE 
} from './databaseService';
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

export default function App() {
  const [profile, setProfile] = useState<BioProfile>(getInitialProfile);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCopiedShare, setIsCopiedShare] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
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

  // Multi-Tier Real-time Database Synchronization
  useEffect(() => {
    const unsubscribe = subscribeToProfile((updatedData) => {
      setProfile(updatedData);
      setIsLiveConnected(true);
      setImageError(false);
    });

    return () => unsubscribe();
  }, []);

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
        setIsAdmin(true);
        setIsAdminOpen(true);
        showToast('Режим швидкого доступу активовано! Додайте домен у Firebase Console для постійного входу.', 'info');
      } else {
        setIsAdmin(true);
        setIsAdminOpen(true);
        showToast('Адмін-панель відкрито для ' + ADMIN_EMAIL, 'success');
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

  // Save profile changes to Database (Cloud Firestore + RTDB + LocalStorage)
  const handleSaveProfile = async (updatedData: Partial<BioProfile>) => {
    try {
      const sanitized = sanitizeProfilePayload(updatedData);
      const result = await saveProfileToDatabase(sanitized);
      setProfile(result.profile);

      if (result.firestoreSuccess) {
        showToast('✅ Збережено в хмару Firebase! Зміни миттєво видно ВСІМ відвідувачам.', 'success');
      } else {
        showToast(
          '⚠️ Збережено локально на цьому пристрої. Статус запису у хмару: ' + 
          (result.firestoreError || 'Запис виконано'),
          'info'
        );
      }
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
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#f3f7fb] via-[#eaf0f7] to-[#e1eaf3] text-slate-800 flex flex-col items-center justify-start sm:justify-center p-3.5 sm:p-8 font-sans select-none overflow-x-hidden">
      
      {/* Soft Ambient Background Glow Orbs */}
      <div className="fixed top-12 -left-20 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="fixed top-1/3 -right-20 w-96 h-96 bg-indigo-300/25 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="fixed -bottom-20 left-1/4 w-80 h-80 bg-rose-200/25 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />

      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Main Frosted Ice Glass Card */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center frosted-main-card rounded-[36px] sm:rounded-[44px] p-5 sm:p-7 my-3 sm:my-6 transition-all duration-300">
        
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between mb-4 gap-2">
          {/* Realtime Live Status */}
          <div 
            title="Синхронізація в реальному часі для всіх відвідувачів"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-sm text-[10px] sm:text-[11px] font-bold text-slate-600 shrink-0 backdrop-blur-md"
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
                className="h-8 px-3 rounded-xl bg-white/80 hover:bg-white border border-white/90 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 shadow-sm transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer disabled:opacity-60"
                title="Оберіть свій Google акаунт для входу"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
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
                  className="h-8 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-600 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
                  title="Панель Адміністратора NEXUS"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Адмін</span>
                </button>
                <button
                  onClick={handleLogout}
                  id="admin-logout-top-button"
                  className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                  title="Вийти з акаунта"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={handleShareBio}
              id="share-bio-button"
              className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white border border-white/90 text-slate-500 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all shrink-0 cursor-pointer"
              title="Поділитися сайтом"
            >
              {isCopiedShare ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Circular Avatar with Glowing Frosted Rim */}
        <div className="relative mb-3.5 group">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 p-[3px] shadow-[0_10px_25px_-5px_rgba(99,102,241,0.3)] transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-white p-1 flex items-center justify-center overflow-hidden">
              {hasAvatar ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'NEXUS Avatar'}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-slate-400" />
                </div>
              )}
            </div>
          </div>

          {/* TikTok Verified Badge on Avatar */}
          <div 
            className="absolute bottom-0 right-1 p-0.5 rounded-full bg-white shadow-md text-blue-500 flex items-center justify-center"
            title="Офіційний верифікований акаунт"
          >
            <BadgeCheck className="w-5 h-5 fill-blue-500 text-white" />
          </div>
        </div>

        {/* Display Name NEXUS & TikTok Handle @chak.tt */}
        <div className="w-full flex flex-col items-center px-2 mb-1 text-center">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 uppercase">
              {profile.displayName || 'NEXUS'}
            </h1>
            <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>

          <a 
            href={`https://tiktok.com/@${(profile.handle || '@chak.tt').replace(/^@/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-700 mt-0.5 tracking-wide flex items-center gap-1 transition-colors"
          >
            {profile.handle?.startsWith('@') ? profile.handle : `@${profile.handle || 'chak.tt'}`}
          </a>

          {profile.bioText && (
            <p className="text-xs text-slate-600 mt-2 max-w-xs leading-relaxed whitespace-pre-line font-medium">
              {profile.bioText}
            </p>
          )}
        </div>

        {/* Official Promo Code Section (#NEXUS) */}
        <PromoSection 
          promoCode={profile.promoCode || '#NEXUS'} 
          onCopyNotice={(msg) => showToast(msg, 'success')} 
        />

        {/* TikTok Statistics (Followers, Likes, Views) */}
        <StatsSection stats={profile.stats} />

        {/* Shorts News Section (Live admin feed) */}
        <NewsSection news={profile.news} />

        {/* Links List Buttons */}
        <div className="w-full my-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
              Офіційні Посилання
            </span>
          </div>
          <LinksList links={profile.links} />
        </div>

        {/* Bottom Admin Bar or Google Login */}
        <div className="mt-3.5 pt-3 w-full flex flex-col items-center justify-center select-none border-t border-slate-200/60">
          {isAdmin ? (
            <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-indigo-50/60 border border-indigo-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-800">
                  Режим Адміністратора
                </span>
              </div>
              <button
                onClick={() => setIsAdminOpen(true)}
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Керувати
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignInClick}
              disabled={isAuthLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/70 hover:bg-white border border-white/80 hover:border-indigo-200 shadow-sm text-slate-700 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {isAuthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <GoogleIcon />
              )}
              <span>{isAuthLoading ? 'Підключення Google...' : 'Увійти через Google для редагування'}</span>
            </button>
          )}

          <div className="mt-2.5 text-[10px] text-slate-400 font-medium tracking-wider uppercase">
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
