/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Send, Sparkles, Shield, Radio, AtSign, Clock, 
  Trash2, VolumeX, Ban, User, MoreVertical, Check, MessageSquare, 
  Video, CornerDownRight, Volume2, ChevronDown, PhoneCall, PhoneOff, Lock,
  Bell, BellOff
} from 'lucide-react';
import { ChatMessage, WebRoomSettings, ChatSettings, ChatModerationState } from '../types';
import { 
  sendChatMessage, 
  deleteChatMessage, 
  clearAllChatMessages, 
  setModerationStatus,
  getUserCooldownRemaining,
  subscribeToChatSettings,
  subscribeToModerationState,
  checkUserChatAccess,
  DEFAULT_CHAT_SETTINGS
} from '../chatService';
import { isMasterAdmin, MASTER_ADMIN_EMAIL } from '../securityService';
import { soundService } from '../soundService';
import { webNotificationService } from '../notificationService';

interface GeneralChatProps {
  onBack: () => void;
  messages: ChatMessage[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    isAdmin: boolean;
    profileId?: string;
    username?: string;
  } | null;
  onLoginGoogle: () => Promise<void>;
  onRequireRegistration?: () => void;
  webRoomSettings: WebRoomSettings;
  onOpenWebRoom: (roomId: string, roomName: string, isPrivate?: boolean) => void;
}

export const GeneralChat: React.FC<GeneralChatProps> = ({
  onBack,
  messages,
  currentUser,
  onLoginGoogle,
  onRequireRegistration,
  webRoomSettings,
  onOpenWebRoom
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(soundService.isMuted);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [moderationState, setModerationState] = useState<ChatModerationState>({ mutedUsers: {}, bannedUsers: {} });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(webNotificationService.permission);

  const userEmailLower = currentUser?.email?.toLowerCase().trim() || '';
  const isAdmin = Boolean(currentUser && isMasterAdmin(currentUser.email));

  // Persist visited mentions in localStorage so [@ X] doesn't reset when leaving and returning
  const [visitedMentionIds, setVisitedMentionIds] = useState<Set<string>>(() => {
    if (!userEmailLower) return new Set();
    try {
      const raw = localStorage.getItem(`nexus_visited_mentions_${userEmailLower}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Persist dismissed private room calls
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nexus_dismissed_calls');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesCountRef = useRef(messages.length);

  // Subscribe to real-time chat settings & moderation
  useEffect(() => {
    const unsubChat = subscribeToChatSettings((cs) => setChatSettings(cs));
    const unsubMod = subscribeToModerationState((ms) => setModerationState(ms));
    return () => {
      unsubChat();
      unsubMod();
    };
  }, []);

  // Update visited mentions cache when currentUser changes
  useEffect(() => {
    if (!userEmailLower) return;
    try {
      const raw = localStorage.getItem(`nexus_visited_mentions_${userEmailLower}`);
      if (raw) {
        setVisitedMentionIds(new Set(JSON.parse(raw)));
      }
    } catch (e) {}
  }, [userEmailLower]);

  // Check real-time access
  const accessCheck = useMemo(() => {
    return checkUserChatAccess(currentUser?.email, isAdmin, chatSettings, moderationState);
  }, [currentUser?.email, isAdmin, chatSettings, moderationState]);

  // Filter messages: Private room invites are ONLY visible to creator, target, and admin
  const visibleMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (msg.type === 'web_room_invite' && msg.roomData?.isPrivate) {
        if (isAdmin) return true;
        const creator = msg.roomData.creatorEmail?.toLowerCase().trim();
        const target = msg.roomData.targetEmail?.toLowerCase().trim();
        if (userEmailLower && (userEmailLower === creator || userEmailLower === target)) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [messages, userEmailLower, isAdmin]);

  // Find all messages mentioning current user
  const mentionMessages = useMemo(() => {
    if (!currentUser) return [];
    const myName = currentUser.name.toLowerCase();
    const myUsername = currentUser.username ? currentUser.username.toLowerCase() : '';
    return visibleMessages.filter((msg) => {
      if (msg.senderEmail.toLowerCase() === userEmailLower) return false;
      const textLower = msg.text.toLowerCase();
      if (isAdmin && (textLower.includes('@nexus') || textLower.includes('@chak.tt'))) {
        return true;
      }
      if (myUsername && textLower.includes(`@${myUsername}`)) {
        return true;
      }
      if (myName && textLower.includes(`@${myName}`)) {
        return true;
      }
      return false;
    });
  }, [visibleMessages, currentUser, userEmailLower, isAdmin]);

  // Unvisited mentions for brackets counter [@ 1], [@ 2]
  const unvisitedMentions = useMemo(() => {
    return mentionMessages.filter((msg) => !visitedMentionIds.has(msg.id));
  }, [mentionMessages, visitedMentionIds]);

  // Find active incoming private room call for current user
  const activeIncomingCall = useMemo(() => {
    if (!currentUser) return null;
    return visibleMessages.slice(-10).reverse().find((msg) => {
      if (msg.type === 'web_room_invite' && msg.roomData?.isPrivate && msg.roomData.active) {
        if (dismissedCallIds.has(msg.id)) return false;
        const target = msg.roomData.targetEmail?.toLowerCase().trim();
        const creator = msg.roomData.creatorEmail?.toLowerCase().trim();
        if (target === userEmailLower && creator !== userEmailLower) {
          // Call within last 5 minutes
          if (Date.now() - msg.timestamp < 5 * 60 * 1000) {
            return msg;
          }
        }
      }
      return null;
    });
  }, [visibleMessages, currentUser, userEmailLower, dismissedCallIds]);

  // Sound & Push Notification triggers on new messages
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && (!currentUser || latestMsg.senderEmail.toLowerCase() !== userEmailLower)) {
        // Check if mentioned
        const textLower = latestMsg.text.toLowerCase();
        const isMentioned = (isAdmin && (textLower.includes('@nexus') || textLower.includes('@chak.tt'))) ||
          (currentUser && (
            (currentUser.username && textLower.includes(`@${currentUser.username.toLowerCase()}`)) ||
            textLower.includes(`@${currentUser.name.toLowerCase()}`)
          ));

        if (latestMsg.type === 'web_room_invite' && latestMsg.roomData?.targetEmail?.toLowerCase() === userEmailLower) {
          soundService.playInviteSound();
          webNotificationService.notifyRoomInvite(latestMsg.senderName, latestMsg.roomData.roomName || 'Приватний дзвінок', true);
        } else if (isMentioned) {
          soundService.playMentionSound();
          webNotificationService.notifyMention(latestMsg.senderName, latestMsg.text);
        } else {
          soundService.playMessageSound();
        }
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, currentUser, userEmailLower, isAdmin]);

  // Scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isScrolledUp);
  };

  const scrollToBottom = () => {
    soundService.playClickSound();
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll directly to Telegram-style @ mention message & persist visited state
  const handleScrollToMention = () => {
    if (unvisitedMentions.length === 0) return;
    soundService.playClickSound();
    const targetMsg = unvisitedMentions[0];
    if (targetMsg) {
      const el = document.getElementById(`chat-msg-${targetMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(targetMsg.id);
        setTimeout(() => setHighlightedMsgId(null), 3000);
      }
      setVisitedMentionIds((prev) => {
        const next = new Set(prev);
        next.add(targetMsg.id);
        try {
          if (userEmailLower) {
            localStorage.setItem(`nexus_visited_mentions_${userEmailLower}`, JSON.stringify(Array.from(next)));
          }
        } catch (e) {}
        return next;
      });
    }
  };

  // Decline incoming call
  const handleDeclineIncomingCall = (callMsgId: string) => {
    soundService.playClickSound();
    setDismissedCallIds((prev) => {
      const next = new Set(prev);
      next.add(callMsgId);
      try {
        localStorage.setItem('nexus_dismissed_calls', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  // Track cooldown timer every second with automatic live decrement
  useEffect(() => {
    if (!currentUser || isAdmin) {
      setCooldownSeconds(0);
      return;
    }

    const checkCooldown = () => {
      const remaining = getUserCooldownRemaining(currentUser.email, chatSettings.slowmodeSeconds);
      setCooldownSeconds(remaining);
      if (remaining <= 0) {
        setErrorMessage((prev) => (prev && prev.includes('Зачекайте ще') ? null : prev));
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.email, isAdmin, chatSettings.slowmodeSeconds]);

  // Toggle audio sound effects
  const handleToggleSound = () => {
    const muted = soundService.toggleMute();
    setIsSoundMuted(muted);
    if (!muted) soundService.playClickSound();
  };

  // Request Web Push Notification Permission
  const handleRequestPushNotification = async () => {
    soundService.playClickSound();
    const granted = await webNotificationService.requestPermission();
    setNotifPermission(webNotificationService.permission);
    if (granted) {
      webNotificationService.sendNotification({
        title: '🔔 Сповіщення NEXUS активовано',
        body: 'Ви будете миттєво отримувати сповіщення про згадки в чаті та дзвінки у кімнату!'
      });
    }
  };

  // Insert @nexus tag
  const handleTagNexus = () => {
    soundService.playClickSound();
    if (!currentUser) {
      onLoginGoogle();
      return;
    }
    const mention = '@nexus ';
    setInputText((prev) => {
      if (!prev.includes('@nexus')) {
        return prev ? `${prev} ${mention}` : mention;
      }
      return prev;
    });
    inputRef.current?.focus();
  };

  // Click on username or tag in message
  const handleMentionUser = (name: string) => {
    soundService.playClickSound();
    const clean = name.replace(/\s+/g, '_');
    const tag = `@${clean} `;
    setInputText((prev) => (prev.includes(tag) ? prev : `${prev} ${tag}`));
    setActiveMenuMsgId(null);
    inputRef.current?.focus();
  };

  // Submit chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLoginGoogle();
      return;
    }

    if (!inputText.trim() || isSending) return;

    if (!isAdmin && cooldownSeconds > 0) {
      setErrorMessage(`Зачекайте ще ${cooldownSeconds} сек перед наступним повідомленням.`);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    soundService.playClickSound();

    const replyData = replyingTo ? {
      id: replyingTo.id,
      senderName: replyingTo.senderName,
      text: replyingTo.text
    } : null;

    const result = await sendChatMessage(
      {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar
      },
      inputText,
      replyData
    );

    if (result.success) {
      setInputText('');
      setReplyingTo(null);
      if (!isAdmin) {
        setCooldownSeconds(chatSettings.slowmodeSeconds || 0);
      }
      setTimeout(scrollToBottom, 100);
    } else if (result.error) {
      setErrorMessage(result.error);
    }
    setIsSending(false);
  };

  // Suggest PRIVATE Web Room invite
  const handleSuggestPrivateWebRoom = async (targetMsg: ChatMessage) => {
    if (!currentUser) {
      onLoginGoogle();
      return;
    }
    soundService.playClickSound();

    const roomId = `private_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roomName = `🔒 Приватна кімната: ${currentUser.name} ↔ ${targetMsg.senderName}`;

    await sendChatMessage(
      {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar
      },
      `🔒 Приватний дзвінок для @${targetMsg.senderName}`,
      null,
      'web_room_invite',
      {
        roomId,
        roomName,
        creatorEmail: currentUser.email,
        creatorName: currentUser.name,
        targetEmail: targetMsg.senderEmail,
        targetName: targetMsg.senderName,
        active: true,
        isPrivate: true
      }
    );

    setActiveMenuMsgId(null);
    onOpenWebRoom(roomId, roomName, true);
  };

  // Open GENERAL Public Room
  const handleOpenGeneralWebRoom = () => {
    soundService.playClickSound();
    onOpenWebRoom('room_main', '🌐 Загальна Веб-кімната NEXUS', false);
  };

  // Delete Message (Sender or Admin)
  const handleDeleteMsg = async (msgId: string) => {
    soundService.playClickSound();
    await deleteChatMessage(msgId, currentUser?.email);
    setActiveMenuMsgId(null);
  };

  // Admin: Mute User
  const handleMuteUser = async (userEmail: string, durationMinutes: number) => {
    if (!isAdmin) return;
    soundService.playClickSound();
    await setModerationStatus(userEmail, 'mute', durationMinutes);
    setActiveMenuMsgId(null);
  };

  return (
    <div className="fixed inset-0 sm:relative sm:inset-auto z-40 w-full sm:max-w-xl mx-auto h-[100dvh] sm:h-[88vh] flex flex-col sm:rounded-[28px] bg-[#e6ebee] border-0 sm:border border-slate-300/80 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300 select-none">
      
      {/* Telegram Top Header Bar */}
      <div className="h-14 px-3.5 bg-[#2481cc] text-white flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              soundService.playClickSound();
              onBack();
            }}
            className="w-8 h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80"
              alt="NEXUS"
              className="w-9 h-9 rounded-full object-cover border border-white/40 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#2481cc]" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight truncate">
                NEXUS Чат
              </h3>
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[9px] font-bold tracking-wide shrink-0">
                @chak.tt
              </span>
            </div>
            <span className="text-[11px] text-white/80 leading-none truncate">
              {visibleMessages.length} повідомлень • в мережі
            </span>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Push Notification Button */}
          <button
            onClick={handleRequestPushNotification}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              notifPermission === 'granted'
                ? 'bg-white/20 text-emerald-300 hover:bg-white/30'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
            title={notifPermission === 'granted' ? 'Push-сповіщення увімкнено' : 'Увімкнути браузерні Push-сповіщення'}
          >
            {notifPermission === 'granted' ? <Bell className="w-4 h-4 text-emerald-300" /> : <BellOff className="w-4 h-4 opacity-75" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isSoundMuted 
                ? 'bg-black/20 text-white/60' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isSoundMuted ? 'Увімкнути звуки' : 'Вимкнути звуки'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* General Public Web Room Button */}
          <button
            onClick={handleOpenGeneralWebRoom}
            className="h-8 px-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Загальна кімната"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Кімната</span>
          </button>
        </div>
      </div>

      {/* Incoming Call Notification Banner with Accept & Decline */}
      {activeIncomingCall && (
        <div className="bg-emerald-600 text-white px-3.5 py-2 flex items-center justify-between gap-2 text-xs font-medium shrink-0 z-20 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <PhoneCall className="w-4 h-4 shrink-0 animate-bounce text-emerald-200" />
            <span className="truncate">
              <strong className="font-bold">{activeIncomingCall.senderName}</strong> викликає вас у приватну кімнату
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                soundService.playClickSound();
                onOpenWebRoom(
                  activeIncomingCall.roomData?.roomId || 'room_private', 
                  activeIncomingCall.roomData?.roomName || 'Приватна кімната',
                  true
                );
              }}
              className="px-3 py-1 rounded-full bg-white text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-xs hover:bg-emerald-50 active:scale-95"
            >
              Прийняти
            </button>
            <button
              onClick={() => handleDeclineIncomingCall(activeIncomingCall.id)}
              className="px-2.5 py-1 rounded-full bg-black/25 hover:bg-black/40 text-white text-xs font-medium transition-all cursor-pointer"
              title="Відхилити дзвінок"
            >
              Відхилити
            </button>
          </div>
        </div>
      )}

      {/* Telegram Message List */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 relative"
        style={{
          backgroundImage: `radial-gradient(#c8d6e5 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      >
        {visibleMessages.map((msg) => {
          const isMyMsg = Boolean(userEmailLower && msg.senderEmail.toLowerCase() === userEmailLower);
          const isHighlighted = highlightedMsgId === msg.id;
          const isInvite = msg.type === 'web_room_invite';
          const isTargetOfInvite = isInvite && msg.roomData?.targetEmail?.toLowerCase() === userEmailLower;
          const isCreatorOfInvite = isInvite && msg.roomData?.creatorEmail?.toLowerCase() === userEmailLower;

          // Parse text for @mentions
          const renderFormattedText = (text: string) => {
            const parts = text.split(/(@[\w.-]+)/g);
            return parts.map((part, i) => {
              if (part.startsWith('@')) {
                const tag = part.toLowerCase();
                const isMyTag = (tag === '@nexus' && isAdmin) || (userEmailLower && tag.includes(userEmailLower.split('@')[0]));
                return (
                  <span 
                    key={i} 
                    className={`font-semibold cursor-pointer px-0.5 rounded transition-colors ${
                      isMyTag 
                        ? 'bg-amber-400/30 text-amber-900 font-bold' 
                        : 'text-[#2481cc] hover:underline'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMentionUser(part.substring(1));
                    }}
                  >
                    {part}
                  </span>
                );
              }
              return part;
            });
          };

          return (
            <div
              id={`chat-msg-${msg.id}`}
              key={msg.id}
              className={`flex items-end gap-2 group transition-all duration-300 ${
                isMyMsg ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar on Left for other users */}
              {!isMyMsg && (
                <img
                  src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={msg.senderName}
                  onClick={() => handleMentionUser(msg.senderName)}
                  className="w-7 h-7 rounded-full object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity mb-0.5 shadow-xs"
                  title={`Клікніть, щоб тегнути @${msg.senderName}`}
                />
              )}

              {/* Message Bubble */}
              <div 
                className={`relative max-w-[82%] sm:max-w-[75%] rounded-2xl p-2.5 px-3 shadow-xs text-[13px] leading-relaxed transition-all ${
                  isHighlighted 
                    ? 'ring-2 ring-[#2481cc] scale-[1.02] shadow-md' 
                    : ''
                } ${
                  isInvite 
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 text-slate-800' 
                    : isMyMsg
                    ? 'bg-[#eef7fe] border border-[#d6e9f8] text-slate-800 rounded-br-xs'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                }`}
              >
                {/* Sender Name & Role */}
                {!isMyMsg && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span 
                      onClick={() => handleMentionUser(msg.senderName)}
                      className="font-bold text-xs text-[#2481cc] cursor-pointer hover:underline truncate"
                    >
                      {msg.senderName}
                    </span>
                    {msg.isAdmin && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-extrabold text-amber-700 uppercase tracking-tight flex items-center gap-0.5 shrink-0">
                        <Shield className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                )}

                {/* Replying banner */}
                {msg.replyTo && (
                  <div className="mb-1.5 pl-2 border-l-2 border-[#2481cc] text-[11px] text-slate-600 bg-slate-50/80 py-0.5 pr-2 rounded-r">
                    <span className="font-semibold text-[#2481cc] block truncate">
                      {msg.replyTo.senderName}
                    </span>
                    <span className="truncate block opacity-80">
                      {msg.replyTo.text}
                    </span>
                  </div>
                )}

                {/* Invite Card Content */}
                {isInvite && msg.roomData ? (
                  <div className="space-y-2 py-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 leading-tight">
                          {msg.roomData.roomName || 'Веб-кімната NEXUS'}
                        </h4>
                        <span className="text-[10px] text-emerald-700 font-medium">
                          {msg.roomData.isPrivate ? '🔒 Приватний голосовий/відео зв\'язок' : '🌐 Загальна кімната'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700">
                      {msg.text}
                    </p>

                    <button
                      onClick={() => onOpenWebRoom(
                        msg.roomData?.roomId || 'room_main',
                        msg.roomData?.roomName || 'Веб-кімната',
                        msg.roomData?.isPrivate
                      )}
                      className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>{isTargetOfInvite ? 'Прийняти та увійти в кімнату' : 'Увійти в кімнату'}</span>
                    </button>
                  </div>
                ) : (
                  /* Standard Text Message */
                  <div className="break-words whitespace-pre-wrap">
                    {renderFormattedText(msg.text)}
                  </div>
                )}

                {/* Footer Timestamp & 3-dot Menu trigger */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 select-none">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMyMsg && (
                    <Check className="w-3 h-3 text-[#2481cc]" />
                  )}
                  
                  {/* 3-dots Menu Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-0.5"
                    title="Меню"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>

                {/* Action Popup Menu (Positioned safely within chat bounds) */}
                {activeMenuMsgId === msg.id && (
                  <div 
                    className={`absolute ${isMyMsg ? 'right-0' : 'left-0'} bottom-full mb-1 z-40 w-48 max-w-[calc(100vw-3rem)] rounded-xl bg-white border border-slate-200/90 shadow-2xl p-1 space-y-0.5 text-slate-700 text-xs`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        soundService.playClickSound();
                        setReplyingTo(msg);
                        setActiveMenuMsgId(null);
                        inputRef.current?.focus();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer font-medium"
                    >
                      <CornerDownRight className="w-3.5 h-3.5 text-[#2481cc]" />
                      <span>Відповісти</span>
                    </button>

                    <button
                      onClick={() => handleMentionUser(msg.senderName)}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer font-medium"
                    >
                      <AtSign className="w-3.5 h-3.5 text-[#2481cc]" />
                      <span>Згадати @{msg.senderName}</span>
                    </button>

                    {/* Private room invite */}
                    {!isMyMsg && (
                      <button
                        onClick={() => handleSuggestPrivateWebRoom(msg)}
                        className="w-full px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 text-left cursor-pointer font-medium"
                      >
                        <Video className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Приватний дзвінок</span>
                      </button>
                    )}

                    {/* Delete Message for Author or Admin */}
                    {(isMyMsg || isAdmin) && (
                      <>
                        <div className="h-px bg-slate-100 my-0.5" />
                        <button
                          onClick={() => handleDeleteMsg(msg.id)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 text-left cursor-pointer font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Видалити {isMyMsg ? 'моє повідомлення' : 'повідомлення'}</span>
                        </button>
                      </>
                    )}

                    {/* Admin Moderation */}
                    {isAdmin && !isMyMsg && (
                      <>
                        <div className="h-px bg-slate-100 my-0.5" />
                        <button
                          onClick={() => handleMuteUser(msg.senderEmail, 15)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-700 flex items-center gap-2 text-left cursor-pointer font-medium"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Мут на 15 хв</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* FLOATING TELEGRAM-STYLE "@" BUTTON WITH PERSISTENT BRACKETS [ @ 2 ] */}
      {unvisitedMentions.length > 0 && (
        <button
          onClick={handleScrollToMention}
          className="absolute right-4 bottom-22 z-20 h-10 px-3.5 rounded-full bg-white hover:bg-slate-50 text-[#2481cc] font-bold shadow-lg border border-slate-200/90 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 group animate-bounce"
          title={`Перейти до повідомлення, де вас тегнули (${unvisitedMentions.length})`}
        >
          <span className="text-sm font-bold">@</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#2481cc] text-white text-[10px] font-mono font-bold tracking-tight">
            [{unvisitedMentions.length}]
          </span>
        </button>
      )}

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute right-4 bottom-34 z-20 w-8 h-8 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Прокрутити вниз"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Reply Banner if active */}
      {replyingTo && (
        <div className="px-3.5 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="w-3.5 h-3.5 text-[#2481cc] shrink-0" />
            <span className="font-bold text-[#2481cc]">{replyingTo.senderName}:</span>
            <span className="truncate opacity-80">{replyingTo.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error / Cooldown Notice */}
      {errorMessage && (
        <div className="px-4 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-600 text-[11px] text-center font-medium">
          {errorMessage}
        </div>
      )}

      {/* Telegram Style Bottom Input Area */}
      <div className="p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-200 shrink-0 z-10">
        
        {/* Quick Tag @nexus & Slowmode indicator */}
        <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
          <button
            type="button"
            onClick={handleTagNexus}
            className="px-2 py-0.5 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#2481cc] text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#2481cc]" />
            <span>Тегнути @nexus</span>
          </button>

          {/* Slowmode countdown */}
          {!isAdmin && cooldownSeconds > 0 ? (
            <div className="flex items-center gap-1 text-[10.5px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-mono">
              <Clock className="w-3 h-3 animate-spin" />
              <span>{Math.floor(cooldownSeconds / 60)}хв {cooldownSeconds % 60}с</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">
              {isAdmin ? 'Адмін (без ліміту)' : (chatSettings.slowmodeSeconds === 0 ? 'Без затримки' : `Ліміт: 1 пов. / ${chatSettings.slowmodeSeconds} сек`)}
            </span>
          )}
        </div>

        {/* Input bar or Login Prompt or Access Restitution */}
        {!currentUser ? (
          <button
            onClick={onLoginGoogle}
            className="w-full h-10 rounded-full bg-[#2481cc] hover:bg-[#1f74b8] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>Увійти через Google, щоб писати</span>
          </button>
        ) : !accessCheck.allowed ? (
          <div className="w-full h-10 px-4 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">{accessCheck.error || 'Доступ до відправки повідомлень обмежено'}</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="flex-1 h-10 rounded-full bg-[#f1f5f9] border border-slate-200/80 px-3.5 flex items-center focus-within:border-[#2481cc] focus-within:bg-white transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  cooldownSeconds > 0 && !isAdmin
                    ? `Зачекайте ${cooldownSeconds}с...`
                    : "Повідомлення..."
                }
                className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none"
              />
            </div>

            {/* Telegram Circular Send Button */}
            <button
              type="submit"
              disabled={isSending || !inputText.trim() || (!isAdmin && cooldownSeconds > 0)}
              className="w-10 h-10 rounded-full bg-[#2481cc] hover:bg-[#1f74b8] disabled:opacity-40 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0"
              title="Надіслати"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        )}

      </div>

    </div>
  );
};
