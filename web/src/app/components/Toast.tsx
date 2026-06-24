'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const iconMap: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
};

const bgMap: Record<ToastType, string> = {
  success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/20 border-red-500/30 text-red-400',
  info: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  const toast = useCallback(
    (message: string, type?: ToastType) => addToast(message, type),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl text-sm shadow-lg ${bgMap[item.type]} ${item.exiting ? 'toast-exit' : 'toast-enter'}`}
          >
            <span className="text-base">{iconMap[item.type]}</span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
