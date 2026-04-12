import React, { useEffect } from "react";

export type ToastProps = {
  message: string;
  onClose: () => void;
  durationMs?: number;
};

export const Toast: React.FC<ToastProps> = ({
  message,
  onClose,
  durationMs = 4000,
}) => {
  useEffect(() => {
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onClose]);

  return (
    <div role="status" aria-live="polite" className="stepper-widget__toast">
      <div className="stepper-widget__toast-inner">
        <div className="stepper-widget__toast-text">{message}</div>
        <button
          type="button"
          className="stepper-widget__toast-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
    </div>
  );
};

