import React from "react";
import { Button } from "../../../../components/ui/button";
import { createWidgetApi } from "../../../../api";
import { toApiPhone } from "../../auth/auth.utils";
import type { StepProps } from "../stepTypes";
import { BookingContactFields } from "./BookingContactFields";
import { CheckoutPlainSummary } from "./CheckoutPlainSummary";
import { formatRuPhoneMask, isRuPhoneComplete, normalizeRuPhoneDigits } from "./utils";
import { useBookingCatalog } from "./useBookingCatalog";
import { useWidgetAuth } from "../../auth/AuthContext";

export const BookingStepCheckout: React.FC<StepProps> = ({
  state,
  goTo,
  onShowToast,
  alias,
  onAuthResolved,
  onOpenCabinet,
}) => {
  const { draft, patchDraft, productsSubtotal, total } = useBookingCatalog(state);
  const { user, token } = useWidgetAuth();
  const api = React.useMemo(() => createWidgetApi({ alias: alias ?? "" }), [alias]);
  const [messenger, setMessenger] = React.useState<"telegram" | "max">("telegram");
  const [isPrivacyAccepted, setPrivacyAccepted] = React.useState(false);
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [otpOpen, setOtpOpen] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [pendingPhone, setPendingPhone] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [botVerificationLink, setBotVerificationLink] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.setToken(token);
  }, [api, token]);

  React.useEffect(() => {
    if (!draft || !user) return;
    const nextName = draft.contactFullName?.trim() ? draft.contactFullName : user.displayName ?? "";
    const nextPhone = draft.contactPhone?.trim()
      ? draft.contactPhone
      : formatRuPhoneMask(user.phone ?? "");

    if (nextName !== draft.contactFullName || nextPhone !== draft.contactPhone) {
      patchDraft({
        contactFullName: nextName,
        contactPhone: nextPhone,
      });
    }
  }, [draft, patchDraft, user]);

  const handlePhoneChange = (raw: string) => {
    patchDraft({ contactPhone: formatRuPhoneMask(raw) });
  };

  const normalizeDigits = (value: string) => normalizeRuPhoneDigits(value);

  const isPhoneChangedForAuthorized = (): boolean => {
    if (!user?.phone || !draft?.contactPhone) return false;
    return normalizeDigits(user.phone) !== normalizeDigits(draft.contactPhone);
  };

  const buildBookingPayload = () => {
    if (!draft) return null;
    const fullNameParts = (draft.contactFullName ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const firstName = fullNameParts[0] ?? "";
    const lastName = fullNameParts.slice(1).join(" ");

    const products = Object.entries(draft.productQuantities ?? {})
      .map(([id, count]) => {
        const product = state.data.config?.products.find((p) => p.id === id);
        if (!product || count <= 0) return null;
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          count,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; price: number; count: number }>;

    const durationHours = (() => {
      const [fromH, fromM] = draft.timeFrom.split(":").map(Number);
      const [toH, toM] = draft.timeTo.split(":").map(Number);
      const from = fromH * 60 + fromM;
      const to = toH * 60 + toM;
      const diff = to - from;
      return diff > 0 ? diff / 60 : 1;
    })();

    return {
      roomId: draft.roomId,
      date: draft.date,
      time: draft.timeFrom,
      duration: durationHours,
      personCount: Math.max(1, draft.guestCount || 1),
      name: firstName,
      lastName: lastName || undefined,
      phone: formatRuPhoneMask(draft.contactPhone ?? ""),
      messenger,
      comment: (draft.comment ?? "").trim(),
      discounts: [],
      promoCode: null,
      price: total,
      products,
    } as const;
  };

  const submitBooking = async () => {
    const payload = buildBookingPayload();
    if (!payload) return;
    await api.saveRoomBooking(payload);
    const raw = state.data.config?.settings?.confirmMessage ?? "Спасибо! Ваша заявка принята.";
    setSuccessMessage(raw.replace(/\\n/g, "\n"));
  };

  const handleSubmit = async () => {
    if (!draft) return;
    if (!alias) {
      onShowToast?.("Alias не передан в виджет");
      return;
    }
    const fullNameOk = (draft.contactFullName ?? "").trim().length >= 2;
    const phoneOk = isRuPhoneComplete(draft.contactPhone ?? "");
    if (!fullNameOk || !phoneOk || !isPrivacyAccepted) return;

    const mustVerifyBySms = !user || isPhoneChangedForAuthorized();
    setSubmitting(true);
    setBotVerificationLink(null);
    try {
      if (mustVerifyBySms) {
        const phone = toApiPhone(draft.contactPhone ?? "");
        const smsResponse = await api.sendSms({
          number: phone,
          messenger,
        });
        if (!smsResponse.success && smsResponse.needBotVerification) {
          onShowToast?.("⚠️ Не удалось отправить код");
          setBotVerificationLink(smsResponse.botLink);
          return;
        }
        setPendingPhone(phone);
        setOtpCode("");
        setOtpOpen(true);
        return;
      }
      await submitBooking();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось выполнить бронирование";
      onShowToast?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpConfirm = async () => {
    if (otpCode.length !== 4 || !pendingPhone) return;
    setSubmitting(true);
    try {
      const authResult = await api.auth({
        phone: pendingPhone,
        code: otpCode,
      });
      api.setToken(authResult.token);
      const userInfo = await api.getUserInfo();
      onAuthResolved?.({
        token: authResult.token,
        userInfo,
      });
      setOtpOpen(false);
      await submitBooking();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось подтвердить код";
      onShowToast?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">Сначала выберите баню, дату и время слота.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => goTo("banyaObject")}>
          Вернуться к выбору
        </Button>
      </div>
    );
  }

  const fullName = draft.contactFullName ?? "";
  const phoneDisplay = draft.contactPhone ?? "";
  const comment = draft.comment ?? "";
  const phoneOk = isRuPhoneComplete(phoneDisplay);
  const nameOk = fullName.trim().length >= 2;
  const formValid = nameOk && phoneOk && isPrivacyAccepted;

  if (successMessage) {
    return (
      <div className="booking-step-three booking-step-three--natural-scroll relative flex w-full flex-col">
        <div className="booking-step-three__scroll-main">
          <div className="mt-4 space-y-3 text-[#485548]">
            <p className="text-base font-semibold leading-snug">Заявка на бронирование принята.</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{successMessage}</p>
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
              {user && onOpenCabinet
                ? "В личный кабинет — все бронирования"
                : "К началу"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-step-three booking-step-three--natural-scroll booking-step-three--checkout relative flex w-full flex-col">
      <div className="booking-step-three__scroll-main booking-step-three__scroll-main--checkout-pad">
        <div className="mt-4 flex flex-col gap-0">
          <BookingContactFields
            variant="plain"
            fullName={fullName}
            phoneDisplay={phoneDisplay}
            comment={comment}
            onFullNameChange={(v) => patchDraft({ contactFullName: v })}
            onPhoneChange={handlePhoneChange}
            onCommentChange={(v) => patchDraft({ comment: v })}
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
              <p className="mt-1">
                Для получения доступа необходимо подтверждение через Telegram-бота.
              </p>
              <p className="mt-1">Нажмите на кнопку ниже, чтобы перейти в бота, и следуйте инструкциям.</p>
              <a
                className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900"
                href={botVerificationLink}
                target="_blank"
                rel="noreferrer"
              >
                Открыть Telegram-бота
              </a>
            </div>
          )}
        </div>

        <div className="mt-10">
          <CheckoutPlainSummary
            draft={draft}
            productsSubtotal={productsSubtotal}
            total={total}
            omitTotal
          />
        </div>
      </div>

      <footer className="booking-step-three__footer booking-step-three__footer--sticky-checkout">
        <p className="text-base font-semibold tabular-nums text-[#485548]">
          Итого к оплате {total.toLocaleString("ru-RU")} ₽
        </p>
        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-xl bg-[#485548] text-sm font-medium text-white hover:bg-[#485548]/90 disabled:opacity-50"
          disabled={!formValid || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? "Отправка..." : "Забронировать"}
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
              <p className="widget-note">Введите 4-значный код, отправленный на {pendingPhone}</p>
              <input
                className="widget-otp-input"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="0000"
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
