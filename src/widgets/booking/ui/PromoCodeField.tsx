import React from "react";

export type CodeMark = "idle" | "ok" | "bad";

type Props = {
  id: string;
  name: string;
  value: string;
  mark: CodeMark;
  percent?: number | null;
  error?: string | null;
  checking?: boolean;
  checkDisabled?: boolean;
  onChange: (value: string) => void;
  onCheck: () => void;
};

/** Одно поле промокода для сертификатов, бань и домов. */
export const PromoCodeField: React.FC<Props> = ({
  id,
  name,
  value,
  mark,
  percent = null,
  error = null,
  checking = false,
  checkDisabled = false,
  onChange,
  onCheck,
}) => {
  const promo = value.trim();
  const showOk = mark === "ok" && percent != null;
  const showBad = mark === "bad";

  return (
    <div className="booking-checkout__field">
      <label className="booking-checkout__label" htmlFor={id}>
        Промокод
      </label>
      <div className="booking-certificate__promo-row">
        <input
          id={id}
          className="booking-checkout__input"
          name={name}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {showOk ? (
          <span
            className="booking-certificate__promo-mark booking-certificate__promo-mark--ok"
            role="img"
            aria-label={`Скидка ${percent}%`}
          >
            ✓ {percent}%
          </span>
        ) : showBad ? (
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
            disabled={!promo || checkDisabled || checking}
            onClick={onCheck}
          >
            {checking ? "…" : "проверить"}
          </button>
        )}
      </div>
      {error ? (
        <p className="booking-certificate__promo-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
