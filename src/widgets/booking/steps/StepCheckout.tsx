import React, { useMemo, useState } from "react";
import type { WidgetGetResponse } from "../../../api";
import type {
  BookingCalcMeta,
  CheckoutContactDraft,
  VerifyChannel,
} from "../checkout/checkoutDraft";
import { CheckoutSummary } from "../checkout/CheckoutSummary";
import { ContactFields } from "../checkout/ContactFields";
import {
  formatRuPhoneMask,
  isRuPhoneComplete,
} from "../checkout/phone";
import { buildCheckoutProducts } from "../checkout/buildSavePayload";
import type { BookingCategoryId } from "../types";

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
  calcMeta?: BookingCalcMeta | null;
  initialContact?: CheckoutContactDraft | null;
  onContinue: (contact: CheckoutContactDraft) => void;
};

/** Шаг 4: контакты, канал подтверждения, согласие. */
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
  calcMeta = null,
  initialContact = null,
  onContinue,
}) => {
  const [firstName, setFirstName] = useState(initialContact?.firstName ?? "");
  const [lastName, setLastName] = useState(initialContact?.lastName ?? "");
  const [phone, setPhone] = useState(initialContact?.phone ?? "");
  const [comment, setComment] = useState(initialContact?.comment ?? "");
  const [verifyChannel, setVerifyChannel] = useState<VerifyChannel>(
    initialContact?.verifyChannel ?? "telegram"
  );
  const [privacyAccepted, setPrivacyAccepted] = useState(
    Boolean(initialContact)
  );

  const roomName = useMemo(() => {
    if (categoryId === "homes") {
      return config.dailyRooms?.find((r) => r.id === roomId)?.name ?? "Дом";
    }
    return config.rooms?.find((r) => r.id === roomId)?.name ?? "Баня";
  }, [categoryId, config, roomId]);

  const telegramBotHref = useMemo(() => {
    const raw = config.company?.telegram?.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("tg://")) return raw;
    const user = raw.replace(/^@/, "");
    return user ? `https://t.me/${user}` : null;
  }, [config.company?.telegram]);

  const products = useMemo(
    () => buildCheckoutProducts(config, productQuantities),
    [config, productQuantities]
  );
  const productLines = products.map((p) => ({
    id: p.id,
    name: p.name,
    qty: p.count,
    unitPrice: p.price,
    lineTotal: p.price * p.count,
  }));
  const productsSubtotal = productLines.reduce((s, l) => s + l.lineTotal, 0);
  const total = basePrice + productsSubtotal;

  const formValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    isRuPhoneComplete(phone) &&
    privacyAccepted;

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
          prepaymentAmount={calcMeta?.prepay ?? null}
          prepayIncludesProducts={calcMeta?.prepayIncludesProducts ?? null}
          extraValueForDate={calcMeta?.extraValueForDate ?? null}
        />

        <ContactFields
          firstName={firstName}
          lastName={lastName}
          phoneDisplay={phone}
          comment={comment}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onPhoneChange={(raw) => setPhone(formatRuPhoneMask(raw))}
          onCommentChange={setComment}
        />

        <fieldset className="booking-checkout__messenger">
          <legend className="booking-checkout__label">
            Как подтвердить номер
          </legend>
          <div className="booking-checkout__radio-group">
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-verify"
                checked={verifyChannel === "telegram"}
                onChange={() => setVerifyChannel("telegram")}
              />
              <span>Telegram</span>
            </label>
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-verify"
                checked={verifyChannel === "max"}
                onChange={() => setVerifyChannel("max")}
              />
              <span>MAX</span>
            </label>
            <label className="booking-checkout__radio">
              <input
                type="radio"
                name="bk-verify"
                checked={verifyChannel === "call"}
                onChange={() => setVerifyChannel("call")}
              />
              <span>По телефону</span>
            </label>
          </div>
          {verifyChannel === "telegram" ? (
            <p className="booking-checkout__channel-note">
              Внимание! Важно, чтобы бот
              {telegramBotHref ? (
                <>
                  {" "}
                  (
                  <a
                    className="booking-checkout__channel-note-link"
                    href={telegramBotHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ссылка на бота
                  </a>
                  )
                </>
              ) : null}{" "}
              был не заблокирован
            </p>
          ) : null}
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
        <button
          type="button"
          className="booking-checkout__submit"
          disabled={!formValid}
          onClick={() =>
            onContinue({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone,
              comment,
              verifyChannel,
            })
          }
        >
          Далее →
        </button>
      </div>
    </div>
  );
};
