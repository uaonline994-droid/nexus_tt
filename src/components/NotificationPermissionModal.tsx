/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bell, Check, X, ShieldAlert, Sparkles, Smartphone, ArrowRight, ExternalLink } from 'lucide-react';
import { webNotificationService } from '../notificationService';
import { soundService } from '../soundService';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionChanged?: (permission: NotificationPermission) => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionChanged
}) => {
  const [status, setStatus] = useState<NotificationPermission>(webNotificationService.permission);
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const isGranted = status === 'granted';
  const isDenied = status === 'denied';

  const handleRequestPermission = async () => {
    soundService.playClickSound();
    setIsRequesting(true);
    const result = await webNotificationService.requestPermission();
    setStatus(result);
    setIsRequesting(false);
    if (onPermissionChanged) onPermissionChanged(result);

    if (result === 'granted') {
      webNotificationService.sendNotification({
        title: '🔔 Сповіщення NEXUS активовано!',
        body: 'Ви будете миттєво дізнаватися про приватні повідомлення, згадки (@ви) та дзвінки у веб-кімнату.'
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={() => {
            soundService.playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isGranted 
              ? 'bg-emerald-100 text-emerald-600' 
              : isDenied 
              ? 'bg-amber-100 text-amber-600' 
              : 'bg-[#2481cc]/15 text-[#2481cc]'
          }`}>
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Сповіщення на телефоні та ПК
            </h3>
            <p className="text-xs text-slate-500">
              Миттєві сповіщення про дзвінки та смс
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 my-4 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-[#2481cc] flex items-center justify-center font-bold text-[11px] shrink-0">💬</span>
            <span>Приватні повідомлення та згадування <strong className="text-[#2481cc]">(@ви)</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[11px] shrink-0">📞</span>
            <span>Вхідні виклики та запрошення у <strong className="text-emerald-700">Веб-кімнату</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-[11px] shrink-0">⚡</span>
            <span>Працює у фоні навіть при закритій вкладці</span>
          </div>
        </div>

        {/* Status Guide for Mobile (iOS Safari / Android Chrome) */}
        {isDenied ? (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1 mb-4">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Дозвіл заблоковано в налаштуваннях браузера</span>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Натисніть на значок <strong>замка 🔒</strong> або налаштувань біля адреси сайту вгорі браузера та оберіть «Дозволити сповіщення».
            </p>
          </div>
        ) : isGranted ? (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 mb-4 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Push-сповіщення успішно дозволено та працюють!</span>
          </div>
        ) : null}

        {/* Action Button */}
        <div className="mt-2">
          {!isGranted ? (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full py-3 px-4 rounded-2xl bg-[#2481cc] hover:bg-[#1e72b5] active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#2481cc]/25 transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>{isRequesting ? 'Запитуємо дозвіл...' : 'Увімкнути Push-сповіщення'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                soundService.playClickSound();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Закрити
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
