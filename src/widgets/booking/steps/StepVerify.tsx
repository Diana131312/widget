import React, { useEffect, useMemo, useRef, useState } from "react";
import { createWidgetApi, type SaveBookingResponse } from "../../../api";
import { BOOKING_ALIAS } from "../constants";
import { pollAuthCall, startAuthCall } from "../checkout/authCall";
import {
  buildCheckoutProducts,
  buildSaveBodies,
  toApiMessenger,
} from "../checkout/buildSavePayload";
import type {
  BookingResultDraft,
  CheckoutContactDraft,
} from "../checkout/checkoutDraft";
import {
  formatRuPhoneMask,
  toApiPhone,
} from "../checkout/phone";
import type { BookingCategoryId } from "../types";
import { getAuthErrorCopy, getWidgetApiErrorDetail } from "../ui/errorMessages";
import { useBookingToast } from "../ui/ToastContext";

type Props = {
  categoryId: BookingCategoryId;
  config: import("../../../api").WidgetGetResponse;
  roomId: string;
  checkIn: string | null;
  checkOut: string | null;
  banyaDate: string | null;
  banyaTimeFrom: string | null;
  banyaTimeTo: string | null;
  slotDuration: number | null;
  guestCount: number;
  productQuantities: Record<string, number>;
  basePrice: number;
  contact: CheckoutContactDraft;
  onComplete: (result: BookingResultDraft) => void;
  onBackToCheckout: () => void;
};

type Mode = "boot" | "otp" | "call";

const BOT_VERIFY_HINT =
  "Откройте бота, нажмите Старт и поделитесь контактом — бот пришлёт код";

function readSaveMeta(
  res: SaveBookingResponse,
  totalFallback: number,
  confirmMessage: string
): BookingResultDraft {
  const o = res as Record<string, unknown>;
  const price =
    typeof o.price === "number" && Number.isFinite(o.price) ? o.price : null;
  const timeout =
    typeof o.timeoutMinutes === "number" && Number.isFinite(o.timeoutMinutes)
      ? o.timeoutMinutes
      : null;
  const link =
    typeof res.paymentLink === "string" && res.paymentLink.trim()
      ? res.paymentLink.trim()
      : null;
  return {
    bookingId: String(res.bookingId ?? ""),
    price,
    prepayment: Number(res.amount) || 0,
    paymentLink: link,
    timeoutMinutes: timeout,
    message: confirmMessage,
    totalFallback,
  };
}

/** Шаг 5: подтверждение выбранным на шаге 4 способом (код или звонок). */
export const StepVerify: React.FC<Props> = ({
  categoryId,
  config,
  roomId,
  checkIn,
  checkOut,
  banyaDate,
  banyaTimeFrom,
  banyaTimeTo,
  slotDuration,
  guestCount,
  productQuantities,
  basePrice,
  contact,
  onComplete,
  onBackToCheckout,
}) => {
  const { showToast } = useBookingToast();
  const api = useMemo(() => createWidgetApi({ alias: BOOKING_ALIAS }), []);

  const [mode, setMode] = useState<Mode>("boot");
  const [otpCode, setOtpCode] = useState("");
  const [botLink, setBotLink] = useState<string | null>(null);
  const [dialNumber, setDialNumber] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callPollStopRef = useRef(false);
  const startedRef = useRef(false);

  const products = useMemo(
    () => buildCheckoutProducts(config, productQuantities),
    [config, productQuantities]
  );
  const productsSubtotal = products.reduce(
    (s, p) => s + p.price * p.count,
    0
  );
  const total = basePrice + productsSubtotal;

  const confirmMessage =
    (config.settings?.confirmMessage ?? "Спасибо! Ваша заявка принята.").replace(
      /\\n/g,
      "\n"
    );

  const messenger = toApiMessenger(contact.verifyChannel);

  useEffect(() => {
    return () => {
      callPollStopRef.current = true;
    };
  }, []);

  const createBooking = async (checkCode?: string) => {
    const built = buildSaveBodies(
      {
        categoryId,
        roomId,
        guestCount,
        productQuantities,
        total,
        checkIn,
        checkOut,
        banyaDate,
        banyaTimeFrom,
        banyaTimeTo,
        slotDuration,
      },
      contact,
      products,
      checkCode
    );
    if (built.kind === "invalid") {
      throw new Error(built.reason);
    }

    if (checkCode) {
      try {
        await api.auth({
          phone: toApiPhone(contact.phone),
          code: checkCode,
        });
      } catch (err) {
        const authErr = new Error(getAuthErrorCopy(err).detail);
        (authErr as Error & { cause?: unknown }).cause = err;
        throw authErr;
      }
    }

    if (built.kind === "homes") {
      return api.dailySave(built.body);
    }
    return api.saveRoomBooking(built.body);
  };

  const sendCode = async () => {
    setError(null);
    setBotLink(null);
    setBusy(true);
    try {
      const response = await api.sendSms({
        number: toApiPhone(contact.phone),
        messenger,
      });

      if (
        response &&
        typeof response === "object" &&
        "success" in response &&
        response.success === false
      ) {
        if (
          "needBotVerification" in response &&
          response.needBotVerification === true &&
          "botLink" in response &&
          typeof response.botLink === "string"
        ) {
          setBotLink(response.botLink);
          setError(BOT_VERIFY_HINT);
          setMode("otp");
          return;
        }
        setError("Не удалось отправить код. Вернитесь и выберите другой способ");
        return;
      }

      setMode("otp");
      setOtpCode("");
      showToast(
        messenger === "max" ? "Код отправляется в MAX" : "Код отправлен в Telegram"
      );
    } catch (err) {
      setError(getWidgetApiErrorDetail(err));
      setMode("otp");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (otpCode.trim().length < 4 || isBusy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createBooking(otpCode.trim());
      onComplete(readSaveMeta(res, total, confirmMessage));
    } catch (err) {
      if (err instanceof Error && err.cause) {
        setError(err.message);
      } else {
        setError(getWidgetApiErrorDetail(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const startCallVerify = async () => {
    setError(null);
    setBusy(true);
    callPollStopRef.current = true;
    try {
      const started = await startAuthCall(toApiPhone(contact.phone));
      if (!started.dialNumber) {
        setError("Не удалось получить номер для звонка. Попробуйте позже");
        setMode("call");
        return;
      }
      setDialNumber(started.dialNumber);
      setMode("call");
      callPollStopRef.current = false;

      while (!callPollStopRef.current) {
        await new Promise((r) => window.setTimeout(r, 3000));
        if (callPollStopRef.current) break;
        try {
          const poll = await pollAuthCall(toApiPhone(contact.phone));
          if (poll.confirmed) {
            setBusy(true);
            const res = await createBooking(undefined);
            onComplete(readSaveMeta(res, total, confirmMessage));
            return;
          }
        } catch (err) {
          setError(getWidgetApiErrorDetail(err));
          return;
        }
      }
    } catch (err) {
      setError(getWidgetApiErrorDetail(err));
      setMode("call");
    } finally {
      setBusy(false);
    }
  };

  // Старт подтверждения сразу по выбору с шага 4
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (contact.verifyChannel === "call") {
      void startCallVerify();
    } else {
      void sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  if (mode === "call" || (mode === "boot" && contact.verifyChannel === "call")) {
    return (
      <div className="booking-checkout">
        <div className="booking-checkout__main">
          <p className="booking-checkout__otp-title">Подтверждение звонком</p>
          <p className="booking-checkout__otp-hint">
            Позвоните с вашего номера {formatRuPhoneMask(contact.phone)}, звонок
            сбросится автоматически.
          </p>
          {dialNumber ? (
            <a
              className="booking-checkout__dial"
              href={`tel:${dialNumber.replace(/\s/g, "")}`}
            >
              Позвонить на {dialNumber}
            </a>
          ) : (
            <p className="booking-checkout__prepay-note">
              {isBusy ? "Получаем номер…" : "Подготовка…"}
            </p>
          )}
          {dialNumber ? (
            <p className="booking-checkout__prepay-note">Ожидаем подтверждение…</p>
          ) : null}
          {error ? (
            <p className="booking-checkout__hint" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="booking-checkout__footer">
          <button
            type="button"
            className="booking-checkout__secondary"
            onClick={() => {
              callPollStopRef.current = true;
              onBackToCheckout();
            }}
          >
            Назад к оформлению
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-checkout">
      <div className="booking-checkout__main">
        <p className="booking-checkout__otp-title">Код из сообщения</p>
        <p className="booking-checkout__otp-hint">
          {mode === "boot" || isBusy
            ? `Отправляем код в ${messenger === "max" ? "MAX" : "Telegram"}…`
            : `Введите 4-значный код для ${formatRuPhoneMask(contact.phone)}`}
        </p>
        {contact.verifyChannel === "max" ? (
          <p className="booking-checkout__channel-note">
            Если нет аккаунта в MAX, ссылка с кодом придёт через Telegram
          </p>
        ) : null}
        <label className="booking-checkout__label" htmlFor="bk-otp">
          Код
        </label>
        <input
          id="bk-otp"
          className="booking-checkout__input booking-checkout__input--otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otpCode}
          onChange={(e) =>
            setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          disabled={isBusy && mode === "boot"}
        />
        {error || botLink ? (
          <p className="booking-checkout__hint" role="alert">
            {error}
            {botLink ? (
              <>
                {error ? " " : null}
                <a
                  className="booking-checkout__bot-link"
                  href={botLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть бота
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="booking-checkout__footer">
        <button
          type="button"
          className="booking-checkout__submit"
          disabled={otpCode.trim().length < 4 || isBusy}
          onClick={() => void handleConfirmOtp()}
        >
          {isBusy && mode === "otp" ? "Создаём бронь…" : "Подтвердить и забронировать"}
        </button>
        <button
          type="button"
          className="booking-checkout__secondary"
          disabled={isBusy}
          onClick={onBackToCheckout}
        >
          Назад к оформлению
        </button>
        <button
          type="button"
          className="booking-checkout__linkish"
          disabled={isBusy}
          onClick={() => void sendCode()}
        >
          Отправить код ещё раз
        </button>
      </div>
    </div>
  );
};
