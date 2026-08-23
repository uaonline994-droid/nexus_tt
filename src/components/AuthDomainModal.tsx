import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';

interface AuthDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPinSuccess: () => void;
}

export const AuthDomainModal: React.FC<AuthDomainModalProps> = ({
  isOpen,
  onClose,
  onPinSuccess
}) => {
  const [copied, setCopied] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseConsoleUrl = "https://console.firebase.google.com/project/fir-50300/authentication/settings";

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    if (navigator.clipboard && currentDomain) {
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toLowerCase();
    // Default master codes for owner
    if (cleanPin === 'nexus2026' || cleanPin === '2026' || cleanPin === 'admin' || cleanPin === 'chak') {
      onPinSuccess();
      onClose();
    } else {
      setPinError('Невірний PIN-код. Спробуйте nexus2026 або 2026');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#e0e5ec] rounded-[32px] shadow-[20px_20px_60px_#bec4cf,-20px_-20px_60px_#ffffff] p-5 sm:p-7 border border-white/60 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-[#bec4cf]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#2d3748]">
                Авторизація Google (Firebase)
              </h2>
              <p className="text-xs text-[#64748b] font-medium">
                Потрібно додати домен або використати PIN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-[#64748b] hover:text-[#2d3748] flex items-center justify-center transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Domain Authorization Instructions */}
        <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-xs text-[#475569] space-y-3">
          <p className="font-semibold text-[#1e293b] leading-relaxed">
            Помилка <span className="text-rose-600 font-mono text-[11px]">auth/unauthorized-domain</span> виникає, оскільки поточний домен ще не додано до дозволених у вашому проекті Firebase.
          </p>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
              Ваш поточний домен:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentDomain}
                className="w-full py-1.5 px-3 rounded-xl bg-white/70 text-[#1e293b] font-mono text-xs border border-[#cbd5e1] select-all outline-none"
              />
              <button
                type="button"
                onClick={handleCopyDomain}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 shrink-0 text-xs shadow-[2px_2px_4px_#bec4cf] transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопійовано' : 'Копіювати'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-[#64748b]">
            <p className="font-bold text-[#334155]">Як дозволити в Firebase Console:</p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1">
              <li>Відкрийте налаштування аутентифікації Firebase</li>
              <li>Перейдіть у вкладку <b>«Settings»</b> → <b>«Authorized domains»</b></li>
              <li>Натисніть <b>«Add domain»</b> і вставте скопійований домен</li>
            </ol>
          </div>

          <a
            href={firebaseConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl bg-[#e0e5ec] shadow-[3px_3px_6px_#bec4cf,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bec4cf,inset_-2px_-2px_4px_#ffffff] text-blue-600 font-bold flex items-center justify-center gap-1.5 text-xs transition-all"
          >
            <span>Відкрити Firebase Settings</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Section 2: Quick Master PIN Login */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#e0e5ec] shadow-[5px_5px_10px_#bec4cf,-5px_-5px_10px_#ffffff] border border-white/50">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2d3748]">
              Швидкий вхід за PIN-кодом адміністратора
            </h3>
          </div>
          <p className="text-[11px] text-[#64748b] mb-3">
            Ви можете увійти до адмін-панелі миттєво за кодом: <code className="bg-white/60 px-1.5 py-0.5 rounded text-blue-600 font-bold">nexus2026</code> або <code className="bg-white/60 px-1.5 py-0.5 rounded text-blue-600 font-bold">2026</code>
          </p>

          <form onSubmit={handlePinSubmit} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Введіть PIN (nexus2026)"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec4cf,inset_-3px_-3px_6px_#ffffff] text-[#2d3748] placeholder-[#94a3b8] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shrink-0 shadow-[3px_3px_6px_#bec4cf] flex items-center gap-1 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Увійти</span>
              </button>
            </div>
            {pinError && (
              <p className="text-[11px] text-rose-500 font-bold">{pinError}</p>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};
