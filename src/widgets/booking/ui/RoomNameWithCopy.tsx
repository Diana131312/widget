import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { BookingCategoryId } from "../types";
import { buildObjectFocusUrl } from "../url/bookingUrl";

type Props = {
  name: string;
  categoryId: BookingCategoryId;
  roomId: string;
  /** h4 внутри карточки */
  as?: "h4" | "span";
};

/** Название объекта + кнопка копирования deep-link на эту баню/дом. */
export const RoomNameWithCopy: React.FC<Props> = ({
  name,
  categoryId,
  roomId,
  as = "h4",
}) => {
  const [copied, setCopied] = useState(false);
  const TitleTag = as;

  const handleCopy = async () => {
    const href = buildObjectFocusUrl(categoryId, roomId);
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = href;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="booking-object-card__name-row">
      <TitleTag className="booking-object-card__name">{name}</TitleTag>
      <button
        type="button"
        className={[
          "booking-object-card__copy",
          copied ? "booking-object-card__copy--done" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleCopy}
        aria-label={
          copied ? "Ссылка скопирована" : "Скопировать ссылку на объект"
        }
        title={copied ? "Скопировано" : "Скопировать ссылку"}
      >
        {copied ? (
          <Check size={18} aria-hidden strokeWidth={2.25} />
        ) : (
          <Copy size={18} aria-hidden strokeWidth={2.25} />
        )}
      </button>
    </div>
  );
};
