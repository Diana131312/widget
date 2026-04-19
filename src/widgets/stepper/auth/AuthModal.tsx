import React, { useMemo, useState } from "react";
import type { WidgetApiClient, WidgetMessenger } from "../../../api";
import { formatPhoneMask, isPhoneMaskComplete, toApiPhone } from "./auth.utils";

type Props = {
  open: boolean;
  api: WidgetApiClient;
  onClose: () => void;
  onAuthSuccess: (args: {
    token: string | null;
    userInfo: Awaited<ReturnType<WidgetApiClient["getUserInfo"]>>;
  }) => void;
};

type MessengerOption = {
  id: WidgetMessenger;
  label: string;
};

const MESSENGERS: MessengerOption[] = [
  { id: "telegram", label: "Telegram" },
  { id: "max", label: "MAX" },
];

export const AuthModal: React.FC<Props> = ({
  open,
  api,
  onClose,
  onAuthSuccess,
}) => {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+7");
  const [messenger, setMessenger] = useState<WidgetMessenger>("telegram");
  const [isPrivacyAccepted, setPrivacyAccepted] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botVerificationLink, setBotVerificationLink] = useState<string | null>(null);

  const canSendCode = useMemo(
    () => isPhoneMaskComplete(phone) && isPrivacyAccepted && !isLoading,
    [phone, isPrivacyAccepted, isLoading]
  );
  const canConfirmCode = code.length === 4 && !isLoading;

  if (!open) return null;

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    onClose();
  };

  const handleSendCode = async () => {
    setError(null);
    setBotVerificationLink(null);
    setLoading(true);
    try {
      const number = toApiPhone(phone);
      const response = await api.sendSms({ number, messenger });
      if (!response.success && response.needBotVerification) {
        setError("⚠️ Не удалось отправить код");
        setBotVerificationLink(response.botLink);
        return;
      }
      setStep("code");
      setCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось отправить код";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const number = toApiPhone(phone);
      const authResult = await api.auth({
        phone: number,
        code,
      });
      if (authResult?.token) {
        api.setToken(authResult.token);
      }
      const userInfo = await api.getUserInfo();
      onAuthSuccess({
        token: authResult?.token ?? null,
        userInfo,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось подтвердить код";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget-modal-overlay" role="dialog" aria-modal="true">
      <div className="widget-modal-card">
        <div className="widget-modal-header">
          <h4 className="widget-modal-title">
            {step === "phone" ? "Вход в личный кабинет" : "Подтверждение кода"}
          </h4>
          <button
            type="button"
            className="stepper-widget__btn stepper-widget__btn--ghost"
            onClick={handleClose}
          >
            Закрыть
          </button>
        </div>

        {step === "phone" ? (
          <div className="widget-modal-body">
            <label className="widget-field">
              <span className="widget-field__label">Телефон</span>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                placeholder="+7 (___) ___-__-__"
                className="widget-field__input"
              />
            </label>

            <div>
              <p className="widget-field__label">Куда отправить код</p>
              <div className="widget-radio-group">
                {MESSENGERS.map((option) => (
                  <label key={option.id} className="widget-radio-item">
                    <input
                      type="radio"
                      checked={messenger === option.id}
                      onChange={() => setMessenger(option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="widget-checkbox">
              <input
                type="checkbox"
                checked={isPrivacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <span>Принимаю условия конфиденциальности</span>
            </label>

            {error && <p className="stepper-widget__error">{error}</p>}
            {botVerificationLink && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p>Для получения доступа необходимо подтверждение через Telegram-бота.</p>
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

            <button
              type="button"
              className="stepper-widget__btn stepper-widget__btn--primary"
              disabled={!canSendCode}
              onClick={handleSendCode}
            >
              {isLoading ? "Отправляем..." : "Получить код"}
            </button>
          </div>
        ) : (
          <div className="widget-modal-body">
            <p className="widget-note">Введите 4-значный код, отправленный на {phone}</p>
            <input
              className="widget-otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
            />

            {error && <p className="stepper-widget__error">{error}</p>}

            <div className="widget-actions-row">
              <button
                type="button"
                className="stepper-widget__btn"
                onClick={() => setStep("phone")}
                disabled={isLoading}
              >
                Назад
              </button>
              <button
                type="button"
                className="stepper-widget__btn stepper-widget__btn--primary"
                disabled={!canConfirmCode}
                onClick={handleConfirmCode}
              >
                {isLoading ? "Проверяем..." : "Подтвердить"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
