/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Phone, MessageSquare, ShieldCheck, Copy, Check, Sparkles, Smartphone, Mail, Hash, User } from 'lucide-react';
import { UserProfile } from '../types';
import { soundService } from '../soundService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    username?: string;
    profileId?: string;
    isAdmin?: boolean;
    deviceModel?: string;
  } | null;
  onStartDirectChat: (target: { id: string; name: string; email: string; avatar: string }) => void;
  onStartCall: (target: { id: string; name: string; email: string }) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onStartDirectChat,
  onStartCall
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  if (!isOpen || !targetUser) return null;

  const usernameDisplay = targetUser.username 
    ? (targetUser.username.startsWith('@') ? targetUser.username : `@${targetUser.username}`)
    : `@${targetUser.email.split('@')[0]}`;

  const profileIdDisplay = targetUser.profileId || `#${targetUser.id.substring(0, 6)}`;

  const handleCopyId = () => {
    soundService.playClickSound();
    navigator.clipboard.writeText(profileIdDisplay);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyUsername = () => {
    soundService.playClickSound();
    navigator.clipboard.writeText(usernameDisplay);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95">
        
        {/* Header Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-sky-500 via-[#2481cc] to-indigo-600 opacity-90" />

        {/* Close Button */}
        <button
          onClick={() => {
            soundService.playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Avatar & Profile Card */}
        <div className="relative pt-6 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <img
              src={targetUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={targetUser.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg bg-slate-100"
            />
            {targetUser.isAdmin && (
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-md" title="Адміністратор NEXUS">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
            {targetUser.name}
            {targetUser.isAdmin && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">
                ADMIN
              </span>
            )}
          </h3>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleCopyUsername}
              className="text-xs text-[#2481cc] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              title="Скопіювати юзернейм"
            >
              <span>{usernameDisplay}</span>
              {copiedUsername ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={handleCopyId}
              className="text-xs text-slate-500 hover:text-slate-800 font-mono flex items-center gap-1 cursor-pointer bg-slate-100 px-2 py-0.5 rounded-md"
              title="Скопіювати ID"
            >
              <Hash className="w-3 h-3 text-slate-400" />
              <span>{profileIdDisplay}</span>
              {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Action Buttons: Message & Call */}
        <div className="grid grid-cols-2 gap-3 mt-6 mb-4">
          <button
            onClick={() => {
              soundService.playClickSound();
              onClose();
              onStartDirectChat({
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                avatar: targetUser.avatar
              });
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#2481cc] hover:bg-[#1e72b5] active:scale-95 text-white font-bold text-xs shadow-md shadow-[#2481cc]/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Приватний чат</span>
          </button>

          <button
            onClick={() => {
              soundService.playClickSound();
              onClose();
              onStartCall({
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email
              });
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>Зателефонувати</span>
          </button>
        </div>

        {/* Details Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Mail className="w-3.5 h-3.5" />
              <span>Електронна пошта:</span>
            </div>
            <span className="font-medium text-slate-700 truncate max-w-[150px]">
              {targetUser.email}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Hash className="w-3.5 h-3.5" />
              <span>ID акаунта:</span>
            </div>
            <span className="font-mono font-bold text-slate-700">
              {profileIdDisplay}
            </span>
          </div>

          {targetUser.deviceModel && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Пристрій:</span>
              </div>
              <span className="font-medium text-slate-700 truncate max-w-[150px]">
                {targetUser.deviceModel}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
