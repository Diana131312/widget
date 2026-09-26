import React, { useMemo, useState } from "react";
import type { WidgetGetResponse } from "../../../api";
import { buildCheckoutProducts } from "../checkout/buildSavePayload";
import { CheckoutSummary } from "../checkout/CheckoutSummary";
import { ContactFields } from "../checkout/ContactFields";
import { formatRuPhoneMask, isRuPhoneComplete } from "../checkout/phone";
import type { BookingCategoryId } from "../types";
import { useBookingToast } from "../ui/ToastContext";

type Props = {
  categoryId: BookingCategoryId;
  config: WidgetGetResponse;
  roomId: string;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  guestCount: number;
  productQuantities: Record<string, number>;
  basePrice: number;
  onStartOver: () => void;
};

export const StepCheckout: React.FC<Props> = ({
  categoryId,
  config,
  roomId,
  checkIn,
  checkOut,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  guestCount,
  productQuantities,
  basePrice,
  onStartOver,
}) => {
  const { showToast } = useBookingToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [messenger, setMessenger] = useState<"telegram" | "max">("telegram");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const roomName = useMemo(() => {
    if (categoryId === "homes") {
      return config.dailyRooms?.find((r) => r.id === roomId)?.name ?? "Дом";
    }
    return config.rooms?.find((r) => r.id === roomId)?.name ?? "Баня";
  }, [categoryId, config, roomId]);

  const products = useMemo(
    () => buildCheckoutProducts(config, productQuantities),
    [config, productQuantities]
  );
  const productLines = products.map((p) => ({
    id: p.id,
    name: p.name,
    qty: p.count,
    lineTotal: p.price * p.count,
  }));
  const productsSubtotal = productLines.reduce((s, l) => s + l.lineTotal, 0);
  const total = basePrice + productsSubtotal;

  const formValid =
    fullName.trim().length >= 2 &&
    isRuPhoneComplete(phone) &&
    privacyAccepted;

  const handleSubmit = () => {
    if (!formValid || submitted) return;
    setSubmitted(true);
    showToast("Далее будет страница оплаты");
  };

  if (submitted) {
    return (
      <div className="booking-checkout booking-checkout--success">
        <p className="booking-checkout__success-title">Почти готово</p>
        <p className="booking-checkout__success-text">
          Данные для бронирования собраны. Далее будет страница оплаты.
        </p>
        <div className="booking-checkout__success-actions">
          <button
            type="button"
            className="booking-checkout__secondary"
            onClick={onStartOver}
          >
            К началу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-checkout">
      <div className="booking-checkout__main">
        <CheckoutSummary
          categoryId={categoryId}
          roomName={roomName}
          guestCount={guestCount}
          basePrice={basePrice}
          productLines={productLines}
          total={total}
          banyaDate={banyaDate}
          banyaTimeFrom={banyaTimeFrom}
          banyaTimeTo={banyaTimeTo}
          checkIn={checkIn}
          checkOut={checkOut}
        />

        <ContactFields
          fullName={fullName}
          phoneDisplay={phone}
          comment={comment}
          onFullNameChange={setFullName}
          onPhoneChange={(raw) => setPhone(formatRuPhoneMask(raw))}
          onCommentChange={setComment}
        />

        <fieldset className="booking-checkout__messenger">
          <legend className="booking-checkout__label">
            Куда отправить подтверждение
          </legend>
          <div className="booking-checkout__radio-group">
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-messenger"
                checked={messenger === "telegram"}
                onChange={() => setMessenger("telegram")}
              />
              <span>Telegram</span>
            </label>
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-messenger"
                checked={messenger === "max"}
                onChange={() => setMessenger("max")}
              />
              <span>MAX</span>
            </label>
          </div>
        </fieldset>

        <label className="booking-checkout__privacy">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
          />
          <span>Принимаю условия конфиденциальности</span>
        </label>
      </div>

      <div className="booking-checkout__footer">
        <p className="booking-checkout__total">
          Итого к оплате{" "}
          <span className="booking-checkout__total-num">
            {total.toLocaleString("ru-RU")} ₽
          </span>
        </p>
        <button
          type="button"
          className="booking-checkout__submit"
          disabled={!formValid}
          onClick={handleSubmit}
        >
          Забронировать
        </button>
      </div>
    </div>
  );
};
