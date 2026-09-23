import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, message };

      setToasts((prev) => [...prev.slice(-2), newToast]); // max 3 stacked

      if (type !== 'error') {
        setTimeout(() => {
          removeToast(id);
        }, 4000);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container at bottom center */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-toast flex flex-col items-center gap-2 pointer-events-none max-w-[90vw] sm:max-w-md w-full px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto w-full bg-ink text-white rounded-lg px-4 py-3 shadow-3 flex items-center justify-between gap-3 text-[13px] font-sans animate-[fade-up_250ms_ease-out_both]"
          >
            <div className="flex items-center gap-2.5 truncate">
              {toast.type === 'success' && (
                <Check className="w-4 h-4 text-teal-on-dark shrink-0" strokeWidth={2} />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-diff-del-text shrink-0" strokeWidth={2} />
              )}
              {toast.type === 'info' && (
                <Info className="w-4 h-4 text-indigo-on-dark shrink-0" strokeWidth={2} />
              )}
              <span className="truncate">{toast.message}</span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full text-header-muted hover:text-white transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
