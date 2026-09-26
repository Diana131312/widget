import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { BookingToast } from "./Toast";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function BookingToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((next: string) => {
    setMessage(next);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <BookingToast message={message} onClose={() => setMessage(null)} />
      )}
    </ToastContext.Provider>
  );
}

export function useBookingToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg: string) => {
        // fallback без провайдера
        // eslint-disable-next-line no-console
        console.warn("[booking toast]", msg);
      },
    };
  }
  return ctx;
}
