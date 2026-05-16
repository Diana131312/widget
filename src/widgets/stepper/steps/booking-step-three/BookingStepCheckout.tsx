import React from "react";
import { Button } from "../../../../components/ui/button";
import { createWidgetApi } from "../../../../api";
import { toApiPhone } from "../../auth/auth.utils";
import type { StepProps } from "../stepTypes";
import { BookingContactFields } from "./BookingContactFields";
import { CartItemSummary } from "./CartItemSummary";
import { formatRuPhoneMask, isRuPhoneComplete, normalizeRuPhoneDigits } from "./utils";
import { useWidgetAuth } from "../../auth/AuthContext";
import { useBookingCart } from "../../cart";
import type { CartBookingItem } from "../../cart";

export const BookingStepCheckout: React.FC<StepProps> = ({
  state,
  goTo,
  onShowToast,
  alias,
  onAuthResolved,
  onOpenCabinet,
}) => {
  const cart = useBookingCart();
  const { user, token } = useWidgetAuth();
  const api = React.useMemo(() => createWidgetApi({ alias: alias ?? "" }), [alias]);

  const [contactFullName, setContactFullName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [messenger, setMessenger] = React.useState<"telegram" | "max">("telegram");
  const [isPrivacyAccepted, setPrivacyAccepted] = React.useState(false);
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [otpOpen, setOtpOpen] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [pendingPhone, setPendingPhone] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [botVerificationLink, setBotVerificationLink] = React.useState<string | null>(null);

  const productsById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of state.data.config?.products ?? []) {
      map.set(p.id, p.name);
    }
    return map;
  }, [state.data.config?.products]);

  React.useEffect(() => {
    api.setToken(token);
  }, [api, token]);

  React.useEffect(() => {
    if (!user) return;
    if (!contactFullName.trim()) setContactFullName(user.displayName ?? "");
    if (!contactPhone.trim()) setContactPhone(formatRuPhoneMask(user.phone ?? ""));
  }, [user, contactFullName, contactPhone]);

  const normalizeDigits = (value: string) => normalizeRuPhoneDigits(value);

  const isPhoneChangedForAuthorized = (): boolean => {
    if (!user?.phone || !contactPhone) return false;
    return normalizeDigits(user.phone) !== normalizeDigits(contactPhone);
  };

  const buildProducts = (item: CartBookingItem) => {
    return Object.entries(item.productQuantities ?? {})
      .map(([id, count]) => {
        const product = state.data.config?.products.find((p) => p.id === id);
        if (!product || count <= 0) return null;
        return { id: product.id, name: product.name, price: product.price, count };
      })
      .filter(Boolean) as Array<{ id: string; name: string; price: number; count: number }>;
  };

  const submitCartItem = async (item: CartBookingItem) => {
    const fullNameParts = contactFullName.trim().split(/\s+/).filter(Boolean);
    const firstName = fullNameParts[0] ?? "";
    const lastName = fullNameParts.slice(1).join(" ");
    const products = buildProducts(item);

    if (item.categoryId === "homes") {
      if (!item.checkInDate || !item.checkOutDate) return;
      await api.dailySave({
        dailyRoomId: item.roomId,
        checkInDate: item.checkInDate,
        checkOutDate: item.checkOutDate,
        personCount: item.guestCount,
        name: firstName,
        lastName: lastName || undefined,
        phone: formatRuPhoneMask(contactPhone),
        messenger,
        comment: comment.trim() || undefined,
        products,
      });
      return;
    }

    if (!item.date || !item.timeFrom || !item.timeTo) return;
    const [fromH, fromM] = item.timeFrom.split(":").map(Number);
    const [toH, toM] = item.timeTo.split(":").map(Number);
    const from = fromH * 60 + (fromM || 0);
    const to = toH * 60 + (toM || 0);
    const durationHours =
      item.slotDuration ?? (to - from > 0 ? (to - from) / 60 : 1);

    await api.saveRoomBooking({
      roomId: item.roomId,
      date: item.date,
      time: item.timeFrom,
      duration: durationHours,
      personCount: Math.max(1, item.guestCount),
      name: firstName,
      lastName: lastName || undefined,
      phone: formatRuPhoneMask(contactPhone),
      messenger,
      comment: comment.trim(),
      discounts: [],
      promoCode: null,
      price: item.total,
      products,
    });
  };

  const submitAll = async () => {
    for (const item of cart.items) {
      await submitCartItem(item);
    }
    const raw = state.data.config?.settings?.confirmMessage ?? "Спасибо! Ваша заявка принята.";
    setSuccessMessage(raw.replace(/\\n/g, "\n"));
    cart.clearCart();
  };

  const handleSubmit = () => {
    if (cart.items.length === 0) return;
    const fullNameOk = contactFullName.trim().length >= 2;
    const phoneOk = isRuPhoneComplete(contactPhone);
    if (!fullNameOk || !phoneOk || !isPrivacyAccepted) return;

    alert("Пока не реализовано, ожидание API бека");
  };

  const handleOtpConfirm = () => {
    alert("Пока не реализовано, ожидание API бека");
    setOtpOpen(false);
  };

  if (cart.items.length === 0 && !successMessage) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">Корзина пуста. Добавьте бронирование.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => goTo("addServices")}>
          Мультикорзина
        </Button>
      </div>
    );
  }

  const phoneOk = isRuPhoneComplete(contactPhone);
  const nameOk = contactFullName.trim().length >= 2;
  const formValid = nameOk && phoneOk && isPrivacyAccepted;

  if (successMessage) {
    return (
      <div className="booking-step-three booking-step-three--natural-scroll relative flex w-full flex-col">
        <div className="booking-step-three__scroll-main">
          <div className="mt-4 space-y-3 text-[#485548]">
            <p className="text-base font-semibold leading-snug">Заявки на бронирование приняты.</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {successMessage}
            </p>
          </div>
          <div className="mt-8">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl sm:w-auto"
              onClick={() => {
                if (user && onOpenCabinet) onOpenCabinet();
                else goTo("category");
              }}
            >
              {user && onOpenCabinet ? "В личный кабинет" : "К началу"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-step-three booking-step-three--natural-scroll booking-step-three--checkout relative flex w-full flex-col">
      <div className="booking-step-three__scroll-main booking-step-three__scroll-main--checkout-pad">
        <ul className="multi-cart-checkout__list multi-cart-checkout__list--compact">
          {cart.items.map((item, index) => (
            <li key={item.id} className="multi-cart-checkout__card multi-cart-checkout__card--compact">
              <span className="multi-cart-checkout__card-num">Бронирование {index + 1}</span>
              <CartItemSummary item={item} productNames={productsById} variant="compact" />
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-0">
          <BookingContactFields
            variant="plain"
            fullName={contactFullName}
            phoneDisplay={contactPhone}
            comment={comment}
            onFullNameChange={setContactFullName}
            onPhoneChange={setContactPhone}
            onCommentChange={setComment}
          />
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-[#485548]">Куда отправить код подтверждения</p>
            <div className="widget-radio-group">
              <label className="widget-radio-item">
                <input
                  type="radio"
                  checked={messenger === "telegram"}
                  onChange={() => setMessenger("telegram")}
                />
                <span>Telegram</span>
              </label>
              <label className="widget-radio-item">
                <input
                  type="radio"
                  checked={messenger === "max"}
                  onChange={() => setMessenger("max")}
                />
                <span>MAX</span>
              </label>
            </div>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-[#485548]">
            <input
              type="checkbox"
              checked={isPrivacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
            />
            <span>Принимаю условия конфиденциальности</span>
          </label>
          {botVerificationLink && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>⚠️ Не удалось отправить код</p>
              <a
                className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium"
                href={botVerificationLink}
                target="_blank"
                rel="noreferrer"
              >
                Открыть Telegram-бота
              </a>
            </div>
          )}
        </div>
      </div>

      <footer className="booking-step-three__footer booking-step-three__footer--sticky-checkout">
        <p className="text-base font-semibold tabular-nums text-[#485548]">
          Итого к оплате {cart.cartTotal.toLocaleString("ru-RU")} ₽
        </p>
        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-xl bg-[#485548] text-sm font-medium text-white hover:bg-[#485548]/90 disabled:opacity-50"
          disabled={!formValid || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? "Отправка..." : "Забронировать всё"}
        </Button>
      </footer>

      {otpOpen && (
        <div className="widget-modal-overlay" role="dialog" aria-modal="true">
          <div className="widget-modal-card">
            <div className="widget-modal-header">
              <h4 className="widget-modal-title">Подтвердите номер</h4>
              <button
                type="button"
                className="stepper-widget__btn stepper-widget__btn--ghost"
                onClick={() => setOtpOpen(false)}
                disabled={isSubmitting}
              >
                Закрыть
              </button>
            </div>
            <div className="widget-modal-body">
              <p className="widget-note">Код отправлен на {pendingPhone}</p>
              <input
                className="widget-otp-input"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
              />
              <button
                type="button"
                className="stepper-widget__btn stepper-widget__btn--primary"
                disabled={otpCode.length !== 4 || isSubmitting}
                onClick={() => void handleOtpConfirm()}
              >
                Подтвердить и забронировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
