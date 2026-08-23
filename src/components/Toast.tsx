import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl nm-flat text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-4"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isError && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              {!isError && !isSuccess && <Info className="w-5 h-5 text-sky-500 shrink-0" />}
              <span className={`truncate text-sm ${isError ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}>
                {toast.text}
              </span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-300/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
