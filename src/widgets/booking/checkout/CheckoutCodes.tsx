import React from "react";

export type CodeMark = "idle" | "ok" | "bad";

type Props = {
  promoCode: string;
  promoMark: CodeMark;
  promoPercent: number | null;
  promoError: string | null;
  busy: boolean;
  onPromoChange: (value: string) => void;
  onCheckPromo: () => void;
};

export const CheckoutCodes: React.FC<Props> = ({
  promoCode,
  promoMark,
  promoPercent,
  promoError,
  busy,
  onPromoChange,
  onCheckPromo,
}) => {
  const promo = promoCode.trim();

  return (
    <>
      <div className="booking-checkout__field">
        <label className="booking-checkout__label" htmlFor="bk-promo">
          Промокод
        </label>
        <div className="booking-certificate__promo-row">
          <input
            id="bk-promo"
            className="booking-checkout__input"
            name="booking-promo"
            autoComplete="off"
            placeholder="Если есть"
            value={promoCode}
            disabled={busy}
            onChange={(event) => onPromoChange(event.target.value)}
          />
          {promoMark === "ok" && promoPercent != null ? (
            <span
              className="booking-certificate__promo-mark booking-certificate__promo-mark--ok"
              role="img"
              aria-label={`Скидка ${promoPercent}%`}
            >
              ✓ {promoPercent}%
            </span>
          ) : promoMark === "bad" ? (
            <span
              className="booking-certificate__promo-mark booking-certificate__promo-mark--bad"
              role="img"
              aria-label="Промокод не подошёл"
            >
              ✕
            </span>
          ) : (
            <button
              type="button"
              className={[
                "booking-certificate__promo-check",
                promo && "booking-certificate__promo-check--ready",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!promo || busy}
              onClick={onCheckPromo}
            >
              Проверить
            </button>
          )}
        </div>
        {promoError ? (
          <p className="booking-certificate__promo-error" role="alert">
            {promoError}
          </p>
        ) : null}
      </div>
    </>
  );
};
