import React, { useEffect } from "react";
import { X } from "lucide-react";
import {
  EXTRA_GUEST_INFO_TEXT,
  EXTRA_GUEST_INFO_TITLE,
} from "./extraGuestInfoText";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Модалка «Доплата за гостей» (текст из FAQ сайта). */
export const ExtraGuestInfoModal: React.FC<Props> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="booking-modal-overlay booking-modal-overlay--offer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-extra-guest-info-title"
      onClick={onClose}
    >
      <div
        className="booking-modal-card booking-modal-card--offer"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="booking-modal-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={20} strokeWidth={2} />
        </button>
        <h2
          id="booking-extra-guest-info-title"
          className="booking-modal-title booking-offer-modal__title"
        >
          {EXTRA_GUEST_INFO_TITLE}
        </h2>
        <div className="booking-offer-modal__body">{EXTRA_GUEST_INFO_TEXT}</div>
      </div>
    </div>
  );
};
