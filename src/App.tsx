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
  BadgeCheck, 
  Zap, 
  LogOut, 
  Sliders,
  Loader2,
  MessageCircle,
  Video,
  Sparkles,
  Edit2
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  ADMIN_EMAIL, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from './firebase';
import { BioProfile, ToastMessage, ChatMessage, WebRoomSettings, BioLink, NewsPost, BioUser, UserProfile } from './types';
import { 
  getInitialProfile, 
  saveProfileToDatabase, 
  subscribeToProfile, 
  DEFAULT_PROFILE 
} from './databaseService';
import { 
  subscribeToChatMessages, 
  subscribeToWebRoomSettings, 
  saveWebRoomSettings, 
  checkUserWebRoomAccess,
  seedInitialMessagesToFirebase,
  DEFAULT_WEB_ROOM_SETTINGS
} from './chatService';
import { isMasterAdmin, reportSecurityIntrusion, MASTER_ADMIN_EMAIL } from './securityService';
import { fetchUserProfile, getLocalUserProfile, seedAdminUserProfile } from './userService';
import { sanitizeProfilePayload } from './security';
import { soundService } from './soundService';
import { StatsSection } from './components/StatsSection';
import { PromoSection } from './components/PromoSection';
import { NewsSection } from './components/NewsSection';
import { LinksList } from './components/LinksList';
import { AdminModal } from './components/AdminModal';
import { GeneralChat } from './components/GeneralChat';
import { WebRoomModal } from './components/WebRoomModal';
import { UserRegistrationModal } from './components/UserRegistrationModal';
import { QuickStatModal } from './components/QuickStatModal';
import { QuickAddNewsModal } from './components/QuickAddNewsModal';
import { QuickAddLinkModal } from './components/QuickAddLinkModal';
import { QuickAvatarModal } from './components/QuickAvatarModal';
import { Toast } from './components/Toast';
import { UserProfileModal } from './components/UserProfileModal';
import { DirectChat } from './components/DirectChat';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';

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
  // Navigation View: 'bio' | 'chat' | 'direct_chat'
  const [currentView, setCurrentView] = useState<'bio' | 'chat' | 'direct_chat'>('bio');

  // Direct 1-on-1 Chat Partner
  const [activeDirectChatPartner, setActiveDirectChatPartner] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string;
    username?: string;
    profileId?: string;
    isAdmin?: boolean;
    deviceModel?: string;
  } | null>(null);

  // User Profile Modal
  const [selectedUserProfile, setSelectedUserProfile] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string;
    username?: string;
    profileId?: string;
    isAdmin?: boolean;
    deviceModel?: string;
  } | null>(null);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState<boolean>(false);

  // Push Notification Permission Modal (especially for mobile)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);

  // Main Profile State
  const [profile, setProfile] = useState<BioProfile>(getInitialProfile);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string;
    isAdmin: boolean;
    profileId?: string;
    username?: string;
    deviceModel?: string;
  } | null>(null);

  // User Registration State (Only opens when user interacts with chat)
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState<boolean>(false);
  const [pendingAuthUser, setPendingAuthUser] = useState<{
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
  } | null>(null);

  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCopiedShare, setIsCopiedShare] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Quick Edit Modals State
  const [quickStatKey, setQuickStatKey] = useState<'followers' | 'likes' | 'views' | null>(null);
  const [isQuickAddNewsOpen, setIsQuickAddNewsOpen] = useState<boolean>(false);
  const [isQuickAddLinkOpen, setIsQuickAddLinkOpen] = useState<boolean>(false);
  const [isQuickAvatarOpen, setIsQuickAvatarOpen] = useState<boolean>(false);

  // General Chat & Web Room State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [webRoomSettings, setWebRoomSettings] = useState<WebRoomSettings>(DEFAULT_WEB_ROOM_SETTINGS);
  const [isWebRoomOpen, setIsWebRoomOpen] = useState<boolean>(false);
  const [activeWebRoomId, setActiveWebRoomId] = useState<string>('room_main');
  const [activeWebRoomName, setActiveWebRoomName] = useState<string>('Веб-кімната NEXUS');
  const [isWebRoomPrivate, setIsWebRoomPrivate] = useState<boolean>(false);

  // Toast helper
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

  // Cloud Database Seeder on Startup
  useEffect(() => {
    seedInitialMessagesToFirebase().catch(() => {});
    seedAdminUserProfile().catch(() => {});
  }, []);

  // 1. Firebase Auth State Listener & Profile Loader
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const userIsAdmin = isMasterAdmin(user.email);
        
        // Check if user already has a saved profile in Database
        const existingProfile = await fetchUserProfile(user.uid);
        if (existingProfile) {
          setCurrentUser({
            id: user.uid,
            name: existingProfile.nickname || user.displayName || user.email.split('@')[0],
            email: user.email,
            avatar: existingProfile.avatar || user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            isAdmin: userIsAdmin,
            profileId: existingProfile.profileId,
            username: existingProfile.username
          });
        } else {
          // If no profile exists yet, prompt registration modal
          setPendingAuthUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
          setCurrentUser({
            id: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            isAdmin: userIsAdmin
          });
        }
      } else {
        setCurrentUser(null);
        setPendingAuthUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Profile Sync Listener
  useEffect(() => {
    const unsubscribe = subscribeToProfile((updatedData) => {
      setProfile(updatedData);
      setImageError(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Chat Messages Sync Listener
  useEffect(() => {
    const unsubscribeChat = subscribeToChatMessages((msgs) => {
      setChatMessages(msgs);
    });

    return () => unsubscribeChat();
  }, []);

  // 4. Web Room Settings Sync Listener
  useEffect(() => {
    const unsubscribeSettings = subscribeToWebRoomSettings((settings) => {
      setWebRoomSettings(settings);
    });

    return () => unsubscribeSettings();
  }, []);

  // Google Sign In via Firebase Auth
  const handleGoogleSignInClick = async (openChatAfterAuth = false) => {
    setIsAuthLoading(true);
    soundService.playClickSound();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user && user.email) {
        const userIsAdmin = isMasterAdmin(user.email);
        const existingProfile = await fetchUserProfile(user.uid);

        if (existingProfile) {
          setCurrentUser({
            id: user.uid,
            name: existingProfile.nickname || user.displayName || user.email.split('@')[0],
            email: user.email,
            avatar: existingProfile.avatar || user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            isAdmin: userIsAdmin,
            profileId: existingProfile.profileId,
            username: existingProfile.username
          });
          if (openChatAfterAuth) {
            setCurrentView('chat');
          }
        } else {
          // If no profile exists yet, trigger Registration Modal
          setPendingAuthUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
          setCurrentUser({
            id: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            isAdmin: userIsAdmin
          });
          setIsRegistrationModalOpen(true);
        }

        if (userIsAdmin) {
          showToast('👑 Ласкаво просимо, Головний Адміністратор (NEXUS)! Повний доступ активовано.', 'success');
        } else {
          showToast(`Ви увійшли як ${user.displayName || user.email}. Доступ до чату та кімнат надано.`, 'success');
        }
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        showToast('Вхід скасовано (вікно закрито)', 'info');
      } else if (code === 'auth/cancelled-popup-request') {
        // Suppress duplicate popup request errors
      } else if (code === 'auth/popup-blocked') {
        showToast('Спливаюче вікно входу було заблоковане браузером. Дозвольте спливаючі вікна для цього сайту.', 'error');
      } else {
        console.error('Firebase Auth unexpected error:', err);
        showToast('Помилка авторизації: ' + (err?.message || 'Спробуйте ще раз'), 'error');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    soundService.playClickSound();
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAdminOpen(false);
      showToast('Ви успішно вийшли з акаунта', 'info');
    } catch (e: any) {
      setCurrentUser(null);
    }
  };

  // Save profile changes (Cloud Firestore + RTDB + LocalStorage)
  const handleSaveProfile = async (updatedData: Partial<BioProfile>) => {
    // Strict Security Guard: Only MASTER_ADMIN can modify profile data in the database
    if (!isMasterAdmin(currentUser?.email)) {
      await reportSecurityIntrusion(
        currentUser || { email: 'unauthorized_intruder@blocked.net', name: 'Intruder' },
        {
          location: 'Database Security Shield (handleSaveProfile)',
          attemptedAction: 'Несанкціонована спроба запису / модифікації бази даних',
          reason: `Користувач (${currentUser?.email || 'неавторизований'}) спробував зберегти дані в базу, не будучи головним адміністратором (${MASTER_ADMIN_EMAIL})`,
          vulnerabilityAnalysis: 'Спроба модифікації бази даних в обхід прав адміністратора. Спробу заблоковано, акаунт внесено в бан.'
        }
      );
      showToast('⛔ Спроба несанкціонованої модифікації бази заблокована! Користувача заблоковано.', 'error');
      throw new Error('Unauthorized profile modification attempt detected.');
    }

    try {
      const sanitized = sanitizeProfilePayload(updatedData);
      const result = await saveProfileToDatabase(sanitized);
      setProfile(result.profile);

      if (result.firestoreSuccess) {
        showToast('✅ Збережено в хмару Firebase! Зміни миттєво видно ВСІМ.', 'success');
      } else {
        showToast('✅ Збережено локально. Оновлення застосовано.', 'success');
      }
    } catch (err: any) {
      console.error('Database save error:', err);
      showToast('Помилка збереження даних: ' + (err?.message || 'Невідома помилка'), 'error');
      throw err;
    }
  };

  // Quick Stat Edit Handler
  const handleQuickStatClick = (statKey: 'followers' | 'likes' | 'views') => {
    if (!isMasterAdmin(currentUser?.email)) {
      showToast(`Тільки головний адміністратор (${MASTER_ADMIN_EMAIL}) може змінювати статистику.`, 'info');
      return;
    }
    setQuickStatKey(statKey);
  };

  const handleSaveQuickStat = async (statKey: 'followers' | 'likes' | 'views', newValue: string) => {
    if (!isMasterAdmin(currentUser?.email)) return;
    const updatedStats = {
      ...profile.stats,
      [statKey]: newValue
    };
    await handleSaveProfile({ stats: updatedStats });
  };

  // Quick News Add Handler
  const handleQuickAddNewsClick = () => {
    if (!isMasterAdmin(currentUser?.email)) {
      showToast(`Тільки головний адміністратор (${MASTER_ADMIN_EMAIL}) може додавати новини.`, 'info');
      return;
    }
    setIsQuickAddNewsOpen(true);
  };

  const handleSaveQuickNews = async (newsItem: NewsPost) => {
    if (!isMasterAdmin(currentUser?.email)) return;
    const currentNews = profile.news || [];
    const updatedNews = [newsItem, ...currentNews];
    await handleSaveProfile({ news: updatedNews });
  };

  // Quick Link Add Handler
  const handleQuickAddLinkClick = () => {
    if (!isMasterAdmin(currentUser?.email)) {
      showToast(`Тільки головний адміністратор (${MASTER_ADMIN_EMAIL}) може додавати посилання.`, 'info');
      return;
    }
    setIsQuickAddLinkOpen(true);
  };

  const handleSaveQuickLink = async (linkItem: BioLink) => {
    if (!isMasterAdmin(currentUser?.email)) return;
    const currentLinks = profile.links || [];
    const updatedLinks = [...currentLinks, linkItem];
    await handleSaveProfile({ links: updatedLinks });
  };

  // Quick Avatar Click Handler
  const handleAvatarClick = () => {
    if (!isMasterAdmin(currentUser?.email)) {
      showToast('Тільки головний адміністратор (NEXUS) може змінювати аватарку.', 'info');
      return;
    }
    soundService.playClickSound();
    setIsQuickAvatarOpen(true);
  };

  const handleSaveAvatar = async (newUrl: string) => {
    if (!isMasterAdmin(currentUser?.email)) return;
    await handleSaveProfile({ avatarUrl: newUrl });
  };

  // Web Room Join / Open Handler
  const handleOpenWebRoom = (roomId: string, roomName: string, isPrivate: boolean = false) => {
    setActiveWebRoomId(roomId);
    setActiveWebRoomName(roomName);
    setIsWebRoomPrivate(isPrivate);
    setIsWebRoomOpen(true);
  };

  // Update Web Room Settings
  const handleUpdateWebRoomSettings = async (newSettings: WebRoomSettings) => {
    await saveWebRoomSettings(newSettings);
    setWebRoomSettings(newSettings);
    showToast('Налаштування доступу до веб-кімнат оновлено!', 'success');
  };

  const handleShareBio = () => {
    soundService.playClickSound();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopiedShare(true);
      showToast('Посилання на NEXUS скопійовано!', 'success');
      setTimeout(() => setIsCopiedShare(false), 2000);
    }
  };

  const hasAvatar = Boolean(profile.avatarUrl && profile.avatarUrl.trim() && !imageError);
  const isAdmin = Boolean(currentUser?.isAdmin);
  const hasWebRoomAccess = isWebRoomPrivate ? true : checkUserWebRoomAccess(currentUser?.email, webRoomSettings);

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 text-slate-800 flex flex-col items-center justify-start sm:justify-center p-3 sm:p-8 font-sans select-none overflow-x-hidden">
      
      {/* Soft Ambient Light Glow Accents */}
      <div className="fixed top-12 -left-20 w-80 h-80 bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-1/3 -right-20 w-96 h-96 bg-cyan-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-20 left-1/4 w-80 h-80 bg-purple-200/30 rounded-full blur-[100px] pointer-events-none" />

      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* VIEW 1: DIRECT 1-ON-1 CHAT (TELEGRAM-STYLE) */}
      {currentView === 'direct_chat' && currentUser && activeDirectChatPartner ? (
        <div className="w-full max-w-2xl h-[92vh] sm:h-[88vh] rounded-[32px] sm:rounded-[36px] bg-white shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col relative animate-in fade-in">
          <DirectChat
            currentUser={currentUser}
            partner={activeDirectChatPartner}
            onBack={() => {
              soundService.playClickSound();
              setCurrentView('chat');
            }}
            onOpenProfile={(user) => {
              setSelectedUserProfile(user);
              setIsUserProfileModalOpen(true);
            }}
            onStartCall={(partner) => {
              const directRoomId = 'room_p2p_' + [currentUser.id, partner.id].sort().join('_');
              handleOpenWebRoom(directRoomId, `Приватний дзвінок: ${partner.name}`, true);
            }}
          />
        </div>
      ) : currentView === 'chat' ? (
        /* VIEW 2: GENERAL CHAT (TELEGRAM-STYLE VIEW) */
        <GeneralChat
          onBack={() => {
            soundService.playClickSound();
            setCurrentView('bio');
          }}
          messages={chatMessages}
          currentUser={currentUser}
          onLoginGoogle={handleGoogleSignInClick}
          onRequireRegistration={() => {
            if (pendingAuthUser) {
              setIsRegistrationModalOpen(true);
            } else {
              handleGoogleSignInClick();
            }
          }}
          webRoomSettings={webRoomSettings}
          onOpenWebRoom={handleOpenWebRoom}
          onOpenDirectChat={(targetUser) => {
            if (!currentUser) {
              handleGoogleSignInClick();
              return;
            }
            setActiveDirectChatPartner(targetUser);
            setCurrentView('direct_chat');
          }}
          onOpenUserProfile={(targetUser) => {
            setSelectedUserProfile(targetUser);
            setIsUserProfileModalOpen(true);
          }}
          onOpenNotificationModal={() => {
            setIsNotificationModalOpen(true);
          }}
        />
      ) : (
        /* VIEW 3: MAIN BIO PROFILE PAGE (Frosted Clean Light Aesthetic) */
        <div className="relative z-10 w-full max-w-[450px] flex flex-col items-center frosted-main-card rounded-[36px] sm:rounded-[44px] p-5 sm:p-7 my-3 sm:my-6 transition-all duration-300 animate-in fade-in">
          
          {/* Top Control Bar */}
          <div className="w-full flex items-center justify-between mb-4 gap-2">
            
            {/* Left: TikTok Brand / Verified Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-black text-slate-800 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-wide">NEXUS OFFICIAL</span>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              {!currentUser ? (
                <button
                  onClick={handleGoogleSignInClick}
                  disabled={isAuthLoading}
                  id="google-login-button"
                  className="h-8 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-slate-900 shadow-2xs transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer disabled:opacity-60 sleek-button"
                  title="Увійти через Google"
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
                  {isAdmin && (
                    <button
                      onClick={() => {
                        soundService.playClickSound();
                        setIsAdminOpen(true);
                      }}
                      id="admin-settings-top-button"
                      className="h-8 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs sleek-button"
                      title="Панель Адміністратора NEXUS"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Адмін</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    id="admin-logout-top-button"
                    className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs sleek-button"
                    title="Вийти з акаунта"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                onClick={handleShareBio}
                id="share-bio-button"
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs flex items-center justify-center transition-all shrink-0 cursor-pointer sleek-button"
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

          {/* Circular Avatar with Glowing Border Rim & Quick Edit */}
          <div 
            className="relative mb-3 group cursor-pointer"
            onClick={handleAvatarClick}
            title={isAdmin ? "Натисніть для зміни аватарки" : undefined}
          >
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-[3px] shadow-lg shadow-indigo-500/20 transition-transform duration-300 group-hover:scale-105">
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

            {/* TikTok Verified Badge */}
            <div 
              className="absolute bottom-0 right-1 p-0.5 rounded-full bg-white shadow-md text-cyan-600 flex items-center justify-center ring-2 ring-white"
              title="Офіційний верифікований акаунт"
            >
              <BadgeCheck className="w-5 h-5 fill-cyan-500 text-white" />
            </div>

            {/* Subtle Edit Overlay for Admin on hover */}
            {isAdmin && (
              <div className="absolute inset-0 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Edit2 className="w-6 h-6 drop-shadow" />
              </div>
            )}
          </div>

          {/* Display Name NEXUS & TikTok Handle @chak.tt */}
          <div className="w-full flex flex-col items-center px-2 mb-1 text-center">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase font-mono">
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

          {/* TikTok Statistics (Followers, Likes, Views with Direct Click-to-Edit) */}
          <StatsSection 
            stats={profile.stats} 
            isAdmin={isAdmin}
            onStatClick={handleQuickStatClick}
          />

          {/* CENTRAL GENERAL CHAT BUTTON (Telegram Blue Theme) */}
          <div className="w-full my-2">
            <button
              id="btn-general-chat-center"
              onClick={async () => {
                soundService.playClickSound();
                if (!currentUser) {
                  await handleGoogleSignInClick(true);
                  return;
                }
                if (!currentUser.profileId || !currentUser.username) {
                  setPendingAuthUser({
                    uid: currentUser.id,
                    email: currentUser.email,
                    displayName: currentUser.name,
                    photoURL: currentUser.avatar
                  });
                  setIsRegistrationModalOpen(true);
                } else {
                  setCurrentView('chat');
                }
              }}
              className="group relative w-full h-12 rounded-2xl bg-[#2481cc] hover:bg-[#1f74b8] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between px-4 shadow-md shadow-[#2481cc]/25 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden sleek-button"
            >
              <div className="flex items-center gap-2.5 z-10">
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white animate-bounce" />
                </div>
                <span className="text-sm font-black tracking-tight">
                  💬 Загальний чат
                </span>
              </div>

              <div className="flex items-center gap-2 z-10">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  {chatMessages.length} пов.
                </span>
                <span className="text-white/90 group-hover:translate-x-1 transition-transform font-bold">
                  ➔
                </span>
              </div>
            </button>
          </div>

          {/* Shorts News Section with Direct "➕ Додати новину" Button */}
          <NewsSection 
            news={profile.news} 
            isAdmin={isAdmin}
            onAddNewsClick={handleQuickAddNewsClick}
          />

          {/* Links List Buttons with Direct "➕ Додати посилання" Button */}
          <div className="w-full my-2">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                Офіційні Посилання
              </span>
            </div>
            <LinksList 
              links={profile.links} 
              onAddLinkClick={handleQuickAddLinkClick}
            />
          </div>

          {/* Bottom Admin Status / Google Access Bar */}
          <div className="mt-3.5 pt-3 w-full flex flex-col items-center justify-center select-none border-t border-slate-200/80">
            {isAdmin ? (
              <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-800">
                    Режим Адміністратора
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundService.playClickSound();
                    setIsAdminOpen(true);
                  }}
                  className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  Керувати
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignInClick}
                disabled={isAuthLoading}
                className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-400 shadow-2xs text-slate-700 hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer disabled:opacity-60 sleek-button"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{isAuthLoading ? 'Підключення Google...' : 'Увійти через Google'}</span>
              </button>
            )}

            <div className="mt-2.5 text-[10px] text-slate-400 font-medium tracking-wider uppercase font-mono">
              NEXUS Bio © 2026 • Realtime WebRTC & Firebase
            </div>
          </div>
        </div>
      )}

      {/* USER REGISTRATION & SECURITY PROFILE AUDIT MODAL (White Theme) */}
      {pendingAuthUser && (
        <UserRegistrationModal
          isOpen={isRegistrationModalOpen && Boolean(pendingAuthUser)}
          userAuth={pendingAuthUser}
          onClose={() => setIsRegistrationModalOpen(false)}
          onComplete={(newProfile) => {
            setCurrentUser({
              id: newProfile.uid,
              name: newProfile.nickname,
              email: newProfile.email,
              avatar: newProfile.avatar,
              isAdmin: newProfile.isAdmin,
              profileId: newProfile.profileId,
              username: newProfile.username
            });
            setIsRegistrationModalOpen(false);
            setPendingAuthUser(null);
            setCurrentView('chat');
            showToast(`🎉 Профіль @${newProfile.username} (${newProfile.profileId}) створено та збережено в базу!`, 'success');
          }}
        />
      )}

      {/* QUICK STAT EDIT MODAL */}
      <QuickStatModal
        isOpen={Boolean(quickStatKey)}
        onClose={() => setQuickStatKey(null)}
        statKey={quickStatKey}
        currentStats={profile.stats}
        onSaveStat={handleSaveQuickStat}
      />

      {/* QUICK ADD NEWS MODAL */}
      <QuickAddNewsModal
        isOpen={isQuickAddNewsOpen}
        onClose={() => setIsQuickAddNewsOpen(false)}
        onAddNews={handleSaveQuickNews}
      />

      {/* QUICK ADD LINK MODAL */}
      <QuickAddLinkModal
        isOpen={isQuickAddLinkOpen}
        onClose={() => setIsQuickAddLinkOpen(false)}
        onAddLink={handleSaveQuickLink}
      />

      {/* QUICK AVATAR MODAL */}
      <QuickAvatarModal
        isOpen={isQuickAvatarOpen}
        onClose={() => setIsQuickAvatarOpen(false)}
        currentAvatarUrl={profile.avatarUrl}
        onSaveAvatar={handleSaveAvatar}
      />

      {/* DISCORD-LIKE WEB ROOM (VOICE & VIDEO) */}
      <WebRoomModal
        isOpen={isWebRoomOpen}
        onClose={() => setIsWebRoomOpen(false)}
        roomId={activeWebRoomId}
        roomName={activeWebRoomName}
        isPrivate={isWebRoomPrivate}
        currentUser={
          currentUser || {
            id: 'guest',
            name: 'Гість',
            email: 'guest@nexus.tt',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            isAdmin: false
          }
        }
        settings={webRoomSettings}
        onUpdateSettings={handleUpdateWebRoomSettings}
        hasAccess={hasWebRoomAccess}
      />

      {/* USER PROFILE MODAL (Click on Avatar in Chat or Direct Chat) */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        targetUser={selectedUserProfile}
        onStartDirectChat={(target) => {
          if (!currentUser) {
            handleGoogleSignInClick();
            return;
          }
          setActiveDirectChatPartner(target);
          setCurrentView('direct_chat');
        }}
        onStartCall={(target) => {
          if (!currentUser) {
            handleGoogleSignInClick();
            return;
          }
          const directRoomId = 'room_p2p_' + [currentUser.id, target.id].sort().join('_');
          handleOpenWebRoom(directRoomId, `Приватний дзвінок: ${target.name}`, true);
        }}
      />

      {/* NOTIFICATION PERMISSION MODAL (Especially for mobile devices) */}
      <NotificationPermissionModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onPermissionGranted={() => {
          showToast('🔔 Push-сповіщення успішно дозволено!', 'success');
        }}
      />

      {/* FULL ADMIN MODAL */}
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
