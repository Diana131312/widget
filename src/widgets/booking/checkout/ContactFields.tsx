import React from "react";
import { isRuPhoneComplete } from "./phone";

type Props = {
  firstName: string;
  lastName: string;
  phoneDisplay: string;
  comment: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (rawInput: string) => void;
  onCommentChange: (v: string) => void;
};

export const ContactFields: React.FC<Props> = ({
  firstName,
  lastName,
  phoneDisplay,
  comment,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onCommentChange,
}) => {
  const phoneOk = isRuPhoneComplete(phoneDisplay);
  const firstOk = firstName.trim().length >= 1;
  const lastOk = lastName.trim().length >= 1;

  return (
    <div className="booking-checkout__fields">
      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-checkout-last">
          Фамилия
        </label>
        <input
          id="bk-checkout-last"
          className="booking-checkout__input"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          placeholder="Иванов"
          autoComplete="family-name"
        />
        {!lastOk && lastName.length > 0 ? (
          <p className="booking-checkout__hint">Укажите фамилию</p>
        ) : null}
      </div>

      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-checkout-first">
          Имя
        </label>
        <input
          id="bk-checkout-first"
          className="booking-checkout__input"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          placeholder="Иван"
          autoComplete="given-name"
        />
        {!firstOk && firstName.length > 0 ? (
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
