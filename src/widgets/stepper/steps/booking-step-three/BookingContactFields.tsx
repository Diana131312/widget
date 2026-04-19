import React from "react";
import { cn } from "../../../../lib/utils";
import { isRuPhoneComplete } from "./utils";

const inputClassDefault =
  "flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const inputClassPlain =
  "flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#485548] placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#485548]/25";

const labelClassDefault = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500";

const labelClassPlain = "mb-1.5 block text-sm font-medium text-[#485548]";

type Props = {
  fullName: string;
  phoneDisplay: string;
  comment: string;
  onFullNameChange: (v: string) => void;
  onPhoneChange: (rawInput: string) => void;
  onCommentChange: (v: string) => void;
  className?: string;
  /** Внешний вид полей: «plain» — без карточного shadcn-акцента, в тон виджета */
  variant?: "default" | "plain";
};

export const BookingContactFields: React.FC<Props> = ({
  fullName,
  phoneDisplay,
  comment,
  onFullNameChange,
  onPhoneChange,
  onCommentChange,
  className,
  variant = "default",
}) => {
  const phoneOk = isRuPhoneComplete(phoneDisplay);
  const nameOk = fullName.trim().length >= 2;
  const inputClass = variant === "plain" ? inputClassPlain : inputClassDefault;
  const labelClass = variant === "plain" ? labelClassPlain : labelClassDefault;
  const fieldGap = variant === "plain" ? "gap-5" : "gap-3";

  return (
    <div className={cn("flex min-w-0 flex-col", fieldGap, className)}>
      <div>
        <label className={labelClass} htmlFor="booking-fullname">
          ФИО
        </label>
        <input
          id="booking-fullname"
          className={cn(inputClass, variant === "plain" && "h-11")}
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Иванов Иван"
          autoComplete="name"
        />
        {!nameOk && fullName.length > 0 ? (
          <p className="mt-0.5 text-[10px] text-amber-700">Укажите имя</p>
        ) : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="booking-phone">
          Телефон
        </label>
        <input
          id="booking-phone"
          className={cn(inputClass, variant === "plain" && "h-11")}
          type="tel"
          inputMode="numeric"
          value={phoneDisplay}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+7 (900) 000-00-00"
          autoComplete="tel"
        />
        {!phoneOk && phoneDisplay.length > 0 ? (
          <p className="mt-0.5 text-[10px] text-amber-700">Полный номер</p>
        ) : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="booking-comment">
          Комментарий
        </label>
        <textarea
          id="booking-comment"
          className={cn(inputClass, "min-h-[88px] resize-y md:min-h-[96px]")}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Пожелания к бронированию…"
        />
      </div>
    </div>
  );
};
