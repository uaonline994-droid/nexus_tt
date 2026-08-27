/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Send, Phone, MoreVertical, Trash2, Copy, Check, 
  User, ShieldCheck, Clock, MessageSquare, Sparkles, Smile
} from 'lucide-react';
import { DirectMessage, UserProfile } from '../types';
import { 
  getDirectChatId, 
  sendDirectMessage, 
  deleteDirectMessage, 
  subscribeToDirectChat 
} from '../directChatService';
import { webNotificationService } from '../notificationService';
import { soundService } from '../soundService';

interface DirectChatProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    isAdmin: boolean;
    username?: string;
    profileId?: string;
  };
  partner: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    username?: string;
    profileId?: string;
    isAdmin?: boolean;
    deviceModel?: string;
  };
  onBack: () => void;
  onOpenProfile: (user: any) => void;
  onStartCall: (partner: { id: string; name: string; email: string }) => void;
}

export const DirectChat: React.FC<DirectChatProps> = ({
  currentUser,
  partner,
  onBack,
  onOpenProfile,
  onStartCall
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatId = getDirectChatId(currentUser.id, partner.id);

  // Subscribe to real-time messages for this 1-on-1 chat
  useEffect(() => {
    const unsubscribe = subscribeToDirectChat(chatId, (updatedMessages) => {
      setMessages(updatedMessages);
    });
    return () => unsubscribe();
  }, [chatId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close message action menu on outside click
  useEffect(() => {
    const handleOutside = () => setActiveMenuMessageId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const newMsg: DirectMessage = {
      id: 'dm_msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      chatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      senderAvatar: currentUser.avatar,
      recipientId: partner.id,
      recipientName: partner.name,
      recipientEmail: partner.email,
      text,
      timestamp: Date.now()
    };

    setInputText('');
    await sendDirectMessage(newMsg);
  };

  const handleDelete = async (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundService.playClickSound();
    setActiveMenuMessageId(null);
    await deleteDirectMessage(chatId, messageId);
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundService.playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setActiveMenuMessageId(null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const partnerUsername = partner.username 
    ? (partner.username.startsWith('@') ? partner.username : `@${partner.username}`)
    : `@${partner.email.split('@')[0]}`;

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb] text-slate-800 relative select-none">
      
      {/* Telegram-style Header */}
      <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-20 shrink-0">
        
        {/* Back Button + Partner Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              soundService.playClickSound();
              onBack();
            }}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-colors cursor-pointer"
            title="Повернутися до загального чату"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Clickable Header for Profile */}
          <div
            onClick={() => {
              soundService.playClickSound();
              onOpenProfile(partner);
            }}
            className="flex items-center gap-3 cursor-pointer p-1 rounded-xl hover:bg-slate-50 transition-colors min-w-0"
            title="Відкрити профіль користувача"
          >
            <div className="relative shrink-0">
              <img
                src={partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                alt={partner.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800 truncate">
                <span className="truncate">{partner.name}</span>
                {partner.isAdmin && (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
              </div>
              <div className="text-[11px] text-[#2481cc] font-medium truncate">
                {partnerUsername} {partner.profileId ? `• ${partner.profileId}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Action: Direct Call */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundService.playClickSound();
              onStartCall(partner);
            }}
            className="w-10 h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-sm"
            title="Зателефонувати у веб-кімнату"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        
        {/* Encryption / Privacy Notice */}
        <div className="flex justify-center my-2">
          <div className="bg-white/80 backdrop-blur-xs border border-slate-200/80 px-3.5 py-1.5 rounded-full text-[11px] text-slate-500 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Приватний чат 1-на-1. Повідомлення бачите тільки ви та співрозмовник.</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="w-16 h-16 rounded-full bg-sky-50 text-[#2481cc] flex items-center justify-center mb-3">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Немає повідомлень</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Напишіть перше повідомлення {partner.name}, щоб розпочати спілкування!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id || msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase();
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <img
                    src={msg.senderAvatar || partner.avatar}
                    alt={msg.senderName}
                    onClick={() => onOpenProfile(partner)}
                    className="w-7 h-7 rounded-full object-cover mb-0.5 cursor-pointer hover:opacity-80 shrink-0"
                    title="Відкрити профіль"
                  />
                )}

                <div className="relative group max-w-[82%] sm:max-w-[70%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs relative ${
                      isMe
                        ? 'bg-[#2481cc] text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? 'text-sky-100' : 'text-slate-400'
                    }`}>
                      <span>{timeStr}</span>
                      {isMe && <Check className="w-3 h-3 text-sky-200" />}
                    </div>
                  </div>

                  {/* 3-dots Menu Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuMessageId(activeMenuMessageId === msg.id ? null : msg.id);
                    }}
                    className={`absolute top-1 ${
                      isMe ? '-left-6' : '-right-6'
                    } opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity cursor-pointer`}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Popup Actions Menu */}
                  {activeMenuMessageId === msg.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute top-6 ${
                        isMe ? 'right-0' : 'left-0'
                      } z-30 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95`}
                    >
                      <button
                        onClick={(e) => handleCopy(msg.text, msg.id, e)}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Копіювати</span>
                      </button>
                      
                      {(isMe || currentUser.isAdmin) && (
                        <button
                          onClick={(e) => handleDelete(msg.id, e)}
                          className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Видалити</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200 z-20 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Повідомлення для ${partner.name}...`}
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-full bg-[#2481cc] hover:bg-[#1e72b5] disabled:opacity-40 disabled:hover:bg-[#2481cc] text-white flex items-center justify-center transition-all shadow-md shadow-[#2481cc]/25 active:scale-95 shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>

    </div>
  );
};
