import React, { useEffect } from "react";

export type BookingToastProps = {
  message: string;
  onClose: () => void;
  durationMs?: number;
};

export const BookingToast: React.FC<BookingToastProps> = ({
  message,
  onClose,
  durationMs = 4000,
}) => {
  useEffect(() => {
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onClose, message]);

  return (
    <div role="status" aria-live="polite" className="booking-toast">
      <div className="booking-toast__inner">
        <div className="booking-toast__text">{message}</div>
        <button
          type="button"
          className="booking-toast__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
    </div>
  );
};
