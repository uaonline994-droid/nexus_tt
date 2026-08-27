/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Shield, User, AtSign, Check, Hash, AlertCircle, Loader2, X } from 'lucide-react';
import { UserProfile, SecurityAuditInfo } from '../types';
import { generateRandomProfileId, collectDeviceSecurityAudit, saveUserProfile } from '../userService';
import { soundService } from '../soundService';
import { isMasterAdmin } from '../securityService';

interface UserRegistrationModalProps {
  isOpen: boolean;
  userAuth: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
  };
  onClose?: () => void;
  onComplete: (profile: UserProfile) => void;
}

export const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({
  isOpen,
  userAuth,
  onClose,
  onComplete
}) => {
  const defaultNick = userAuth.displayName || userAuth.email.split('@')[0];
  const defaultUsername = userAuth.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

  const [nickname, setNickname] = useState(defaultNick);
  const [username, setUsername] = useState(defaultUsername);
  const [randomId] = useState(() => generateRandomProfileId());
  const [avatar, setAvatar] = useState(
    userAuth.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Будь ласка, введіть ваш нікнейм.');
      return;
    }
    if (!username.trim()) {
      setError('Будь ласка, введіть юзернейм (@імʼя).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    soundService.playClickSound();

    try {
      // 1. Silent Device & Security Audit scan (Phone model, IP, Location, Email)
      const audit: SecurityAuditInfo = await collectDeviceSecurityAudit(userAuth.email);

      const newProfile: UserProfile = {
        uid: userAuth.uid,
        profileId: randomId,
        nickname: nickname.trim(),
        username: username.trim().toLowerCase().replace(/^@/, ''),
        email: userAuth.email,
        avatar: avatar.trim(),
        isAdmin: isMasterAdmin(userAuth.email),
        securityAudit: audit,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 2. Save directly into Firestore & RTDB database
      await saveUserProfile(newProfile);

      soundService.playMessageSound();
      onComplete(newProfile);
    } catch (err: any) {
      console.warn('Registration profile creation notice:', err);
      setError('Сталася помилка при збереженні профілю. Спробуйте ще раз.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="user-registration-modal"
        className="relative w-full max-w-md rounded-[32px] bg-white/95 backdrop-blur-xl p-6 sm:p-7 border border-white/90 shadow-2xl space-y-5 text-slate-800"
      >
        {/* Close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Закрити"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header (Clean White / Light Style) */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3 shadow-sm">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center justify-center gap-1.5 tracking-tight">
            Створення профілю учасника
            <Sparkles className="w-4 h-4 text-amber-500" />
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto font-medium">
            Придумайте свій нікнейм та юзернейм для спілкування в чаті та участі у веб-кімнатах.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Random System ID Badge */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ваш унікальний ID</div>
                <div className="text-sm font-mono font-black text-indigo-600">{randomId}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
              Видано системою
            </span>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-600 tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Нікнейм (Відображуване ім'я):
            </label>
            <div className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-2xs">
              <input
                type="text"
                required
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Наприклад: Alex_Master або Стрімер"
                className="w-full bg-transparent text-xs sm:text-sm font-bold outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Username / Handle Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-600 tracking-wider flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-indigo-600" />
              Юзернейм (@бер нейм):
            </label>
            <div className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 flex items-center focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-2xs">
              <span className="text-slate-400 text-sm font-mono font-bold mr-1.5">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="alex_master"
                className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Email Info */}
          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate font-medium">
              Привʼязана пошта: <span className="text-slate-900 font-mono font-bold">{userAuth.email}</span>
            </div>
          </div>

          {/* Submit Button (White Theme matching gradient button) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] transition-all shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Створення профілю...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Зберегти профіль та перейти до чату
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
