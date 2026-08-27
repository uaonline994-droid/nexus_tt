/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Send, Sparkles, Shield, Radio, AtSign, Clock, 
  Trash2, VolumeX, Ban, User, MoreVertical, Check, MessageSquare, 
  Video, CornerDownRight, Volume2, ChevronDown, PhoneCall, PhoneOff, Lock
} from 'lucide-react';
import { ChatMessage, WebRoomSettings, ChatSettings, ChatModerationState } from '../types';
import { 
  sendChatMessage, 
  deleteChatMessage, 
  clearAllChatMessages, 
  setModerationStatus,
  getUserCooldownRemaining,
  CHAT_COOLDOWN_SECONDS,
  subscribeToChatSettings,
  subscribeToModerationState,
  checkUserChatAccess,
  DEFAULT_CHAT_SETTINGS
} from '../chatService';
import { isMasterAdmin, MASTER_ADMIN_EMAIL } from '../securityService';
import { soundService } from '../soundService';

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

  const userEmailLower = currentUser?.email?.toLowerCase().trim() || '';
  const isAdmin = Boolean(currentUser && isMasterAdmin(currentUser.email));

  // Check real-time access
  const accessCheck = useMemo(() => {
    return checkUserChatAccess(currentUser?.email, isAdmin, chatSettings, moderationState);
  }, [currentUser?.email, isAdmin, chatSettings, moderationState]);

  // Filter messages: Private room invites are ONLY visible to creator, target, and admin!
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
    return visibleMessages.filter((msg) => {
      if (msg.senderEmail.toLowerCase() === userEmailLower) return false;
      const textLower = msg.text.toLowerCase();
      if (isAdmin && (textLower.includes('@nexus') || textLower.includes('@chak.tt'))) {
        return true;
      }
      if (myName && textLower.includes(`@${myName}`)) {
        return true;
      }
      return false;
    });
  }, [visibleMessages, currentUser, userEmailLower, isAdmin]);

  // Find active incoming private room call for current user
  const activeIncomingCall = useMemo(() => {
    if (!currentUser) return null;
    return visibleMessages.slice(-5).reverse().find((msg) => {
      if (msg.type === 'web_room_invite' && msg.roomData?.isPrivate && msg.roomData.active) {
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
  }, [visibleMessages, currentUser, userEmailLower]);

  // Sound triggers on new messages
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && (!currentUser || latestMsg.senderEmail.toLowerCase() !== userEmailLower)) {
        // Check if mentioned
        const textLower = latestMsg.text.toLowerCase();
        const isMentioned = (isAdmin && (textLower.includes('@nexus') || textLower.includes('@chak.tt'))) ||
          (currentUser && textLower.includes(`@${currentUser.name.toLowerCase()}`));

        if (latestMsg.type === 'web_room_invite' && latestMsg.roomData?.targetEmail?.toLowerCase() === userEmailLower) {
          soundService.playInviteSound();
        } else if (isMentioned) {
          soundService.playMentionSound();
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

  // Scroll directly to Telegram-style @ mention message
  const handleScrollToMention = () => {
    if (mentionMessages.length === 0) return;
    soundService.playClickSound();
    const targetMsg = mentionMessages[mentionMessages.length - 1];
    if (targetMsg) {
      const el = document.getElementById(`chat-msg-${targetMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(targetMsg.id);
        setTimeout(() => setHighlightedMsgId(null), 3000);
      }
    }
  };

  // Track cooldown timer every second
  useEffect(() => {
    if (!currentUser || isAdmin) {
      setCooldownSeconds(0);
      return;
    }

    const checkCooldown = () => {
      const remaining = getUserCooldownRemaining(currentUser.email);
      setCooldownSeconds(remaining);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [currentUser, isAdmin]);

  // Toggle audio sound effects
  const handleToggleSound = () => {
    const muted = soundService.toggleMute();
    setIsSoundMuted(muted);
    if (!muted) soundService.playClickSound();
  };

  // Insert @nexus tag
  const handleTagNexus = () => {
    soundService.playClickSound();
    if (!currentUser) {
      onLoginGoogle();
      return;
    }
    setInputText((prev) => {
      if (prev.includes('@nexus')) return prev;
      return `@nexus ${prev}`.trimStart();
    });
    inputRef.current?.focus();
  };

  // Mention a specific user
  const handleMentionUser = (userName: string) => {
    soundService.playClickSound();
    setInputText((prev) => `${prev} @${userName} `.trimStart());
    setActiveMenuMsgId(null);
    inputRef.current?.focus();
  };

  // Send standard text message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      onLoginGoogle();
      return;
    }

    if (!currentUser.profileId && onRequireRegistration) {
      onRequireRegistration();
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
        setCooldownSeconds(CHAT_COOLDOWN_SECONDS);
      }
      setTimeout(scrollToBottom, 100);
    } else if (result.error) {
      setErrorMessage(result.error);
    }
    setIsSending(false);
  };

  // Suggest PRIVATE Web Room invite (Only sender and target see this!)
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

  // Admin: Delete Message
  const handleDeleteMsg = async (msgId: string) => {
    if (!isAdmin) return;
    soundService.playClickSound();
    await deleteChatMessage(msgId);
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
    <div className="relative w-full max-w-xl mx-auto h-[92vh] sm:h-[88vh] flex flex-col rounded-[28px] bg-[#e6ebee] border border-slate-300/80 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
      
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

      {/* Incoming Call Notification Banner */}
      {activeIncomingCall && (
        <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between gap-2 text-xs font-medium shrink-0 z-20 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <PhoneCall className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {activeIncomingCall.senderName} викликає вас у приватну кімнату
            </span>
          </div>
          <button
            onClick={() => onOpenWebRoom(
              activeIncomingCall.roomData?.roomId || 'room_private', 
              activeIncomingCall.roomData?.roomName || 'Приватна кімната',
              true
            )}
            className="px-2.5 py-1 rounded-full bg-white text-emerald-700 text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs"
          >
            Прийняти
          </button>
        </div>
      )}

      {/* Telegram Chat Wallpaper Messages Feed */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5 relative bg-[#8fa4b8]/15"
        style={{
          backgroundImage: `radial-gradient(#2481cc12 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
        onClick={() => setActiveMenuMsgId(null)}
      >
        {visibleMessages.map((msg) => {
          const isMyMsg = currentUser && (msg.senderEmail.toLowerCase() === userEmailLower);
          const isNexusAdmin = msg.isAdmin || msg.senderEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
          const isRoomInvite = msg.type === 'web_room_invite';
          const isPrivateRoom = msg.roomData?.isPrivate;
          const isHighlighted = highlightedMsgId === msg.id;

          return (
            <div
              key={msg.id}
              id={`chat-msg-${msg.id}`}
              className={`flex flex-col ${isMyMsg ? 'items-end' : 'items-start'} transition-all`}
            >
              <div className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 text-slate-800 transition-all ${
                isHighlighted 
                  ? 'ring-2 ring-amber-400 bg-amber-50' 
                  : isRoomInvite
                  ? 'bg-white border border-indigo-200 shadow-sm'
                  : isMyMsg
                  ? 'bg-[#effdde] border border-[#d2f0b7] rounded-tr-xs shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'bg-white border border-slate-200/70 rounded-tl-xs shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              }`}>

                {/* Reply context if exists (Telegram Style Quote) */}
                {msg.replyTo && (
                  <div className="mb-1.5 px-2 py-1 rounded-md bg-black/5 border-l-2 border-[#2481cc] text-[11px] text-slate-700 truncate">
                    <span className="font-bold text-[#2481cc] block text-[10px]">{msg.replyTo.senderName}</span>
                    <span className="opacity-80 truncate block">{msg.replyTo.text}</span>
                  </div>
                )}

                {/* Sender Header */}
                {!isMyMsg && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <img
                      src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={msg.senderName}
                      className="w-3.5 h-3.5 rounded-full object-cover border border-slate-200"
                    />
                    <span className={`text-xs font-bold tracking-tight truncate ${
                      isNexusAdmin ? 'text-[#2481cc]' : 'text-slate-800'
                    }`}>
                      {msg.senderName}
                    </span>

                    {isNexusAdmin && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 text-[8.5px] font-bold flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        ADMIN
                      </span>
                    )}

                    {msg.mentionsAdmin && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-100 text-[#2481cc] text-[8.5px] font-bold">
                        @NEXUS
                      </span>
                    )}

                    {isPrivateRoom && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[8.5px] font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        Приватно
                      </span>
                    )}
                  </div>
                )}

                {/* Message Body */}
                {isRoomInvite ? (
                  /* Web Room Invitation Card (Telegram Audio/Video Call Style) */
                  <div className="mt-0.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>{msg.roomData?.roomName || msg.text}</span>
                    </div>

                    {isPrivateRoom && msg.roomData?.targetName && (
                      <div className="text-[11px] text-slate-500">
                        Дзвінок між: <span className="font-semibold text-slate-700">{msg.roomData.creatorName}</span> та <span className="font-semibold text-emerald-700">{msg.roomData.targetName}</span>
                      </div>
                    )}

                    <button
                      onClick={() => onOpenWebRoom(
                        msg.roomData?.roomId || 'room_default', 
                        msg.roomData?.roomName || 'Веб-кімната',
                        isPrivateRoom
                      )}
                      className={`w-full h-8 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isPrivateRoom 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : 'bg-[#2481cc] hover:bg-[#1f74b8]'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{isPrivateRoom ? 'Увійти в приватний дзвінок' : 'Приєднатися до дзвінка'}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                )}

                {/* Message Footer: Telegram Timestamp & Action dots */}
                <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-slate-400 select-none">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {isMyMsg && (
                    <Check className="w-3 h-3 text-[#4fae4e]" />
                  )}

                  {/* Action Dropdown Trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundService.playClickSound();
                      setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-0.5"
                    title="Меню"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>

                {/* Action Popup Menu (Telegram style popup) */}
                {activeMenuMsgId === msg.id && (
                  <div 
                    className="absolute right-0 bottom-full mb-1 z-30 w-52 rounded-xl bg-white border border-slate-200 shadow-xl p-1 space-y-0.5 text-slate-700 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        soundService.playClickSound();
                        setReplyingTo(msg);
                        setActiveMenuMsgId(null);
                        inputRef.current?.focus();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <CornerDownRight className="w-3.5 h-3.5 text-[#2481cc]" />
                      <span>Відповісти</span>
                    </button>

                    <button
                      onClick={() => handleMentionUser(msg.senderName)}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <AtSign className="w-3.5 h-3.5 text-[#2481cc]" />
                      <span>Згадати @{msg.senderName}</span>
                    </button>

                    {/* Private room invite */}
                    <button
                      onClick={() => handleSuggestPrivateWebRoom(msg)}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Приватний дзвінок</span>
                    </button>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <>
                        <div className="h-px bg-slate-100 my-1" />
                        <button
                          onClick={() => handleDeleteMsg(msg.id)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Видалити</span>
                        </button>
                        <button
                          onClick={() => handleMuteUser(msg.senderEmail, 15)}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-700 flex items-center gap-2 text-left cursor-pointer"
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

      {/* FLOATING TELEGRAM-STYLE "@" BUTTON (Bottom Right Mention Jump Button) */}
      {mentionMessages.length > 0 && (
        <button
          onClick={handleScrollToMention}
          className="absolute right-4 bottom-22 z-20 w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-[#2481cc] font-bold shadow-md border border-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 group"
          title="Перейти до повідомлення, де вас тегнули"
        >
          <div className="flex items-center justify-center">
            <span className="text-sm font-bold">@</span>
            <span className="ml-0.5 px-1 py-0.2 rounded-full bg-[#2481cc] text-white text-[9px] font-bold">
              {mentionMessages.length}
            </span>
          </div>
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
      <div className="p-2.5 bg-white border-t border-slate-200 shrink-0 z-10">
        
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
