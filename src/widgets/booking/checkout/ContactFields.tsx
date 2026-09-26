import React from "react";
import { isRuPhoneComplete } from "./phone";

type Props = {
  fullName: string;
  phoneDisplay: string;
  comment: string;
  onFullNameChange: (v: string) => void;
  onPhoneChange: (rawInput: string) => void;
  onCommentChange: (v: string) => void;
};

export const ContactFields: React.FC<Props> = ({
  fullName,
  phoneDisplay,
  comment,
  onFullNameChange,
  onPhoneChange,
  onCommentChange,
}) => {
  const phoneOk = isRuPhoneComplete(phoneDisplay);
  const nameOk = fullName.trim().length >= 2;

  return (
    <div className="booking-checkout__fields">
      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-checkout-name">
          ФИО
        </label>
        <input
          id="bk-checkout-name"
          className="booking-checkout__input"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Иванов Иван"
          autoComplete="name"
        />
        {!nameOk && fullName.length > 0 ? (
          <p className="booking-checkout__hint">Укажите имя</p>
        ) : null}
      </div>

      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-checkout-phone">
          Телефон
        </label>
        <input
          id="bk-checkout-phone"
          className="booking-checkout__input"
          type="tel"
          inputMode="numeric"
          value={phoneDisplay}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+7 (900) 000-00-00"
          autoComplete="tel"
        />
        {!phoneOk && phoneDisplay.length > 0 ? (
          <p className="booking-checkout__hint">Укажите полный номер</p>
        ) : null}
      </div>

      <div className="booking-checkout__field">
        <label
          className="booking-checkout__label"
          htmlFor="bk-checkout-comment"
        >
          Комментарий
        </label>
        <textarea
          id="bk-checkout-comment"
          className="booking-checkout__input booking-checkout__textarea"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Пожелания к бронированию…"
        />
      </div>
    </div>
  );
};
