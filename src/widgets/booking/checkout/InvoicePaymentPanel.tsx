import React, { useEffect, useState } from "react";
import {
  formatInvoiceDate,
  invoiceBuyerError,
  invoicePdfHref,
  issueInvoice,
  suggestInvoiceParties,
  type InvoiceDocument,
  type InvoiceParty,
  type InvoiceScope,
} from "./invoiceApi";

type Props = {
  bookingId: string;
  daily: boolean;
  scope?: InvoiceScope;
  phone: string;
  email: string;
  disabled?: boolean;
  onIssued?: (document: InvoiceDocument) => void;
};

/** Реквизиты покупателя и отправка счёта. Подсказки подставляют ИНН, КПП и адрес. */
export const InvoicePaymentPanel: React.FC<Props> = ({
  bookingId,
  daily,
  scope,
  phone,
  email,
  disabled = false,
  onIssued,
}) => {
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const [kpp, setKpp] = useState("");
  const [address, setAddress] = useState("");
  const [picked, setPicked] = useState(false);
  const [anchor, setAnchor] = useState<"name" | "inn" | null>(null);
  const [query, setQuery] = useState("");
  const [parties, setParties] = useState<InvoiceParty[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<InvoiceDocument | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || picked) {
      setParties([]);
      setSuggesting(false);
      return;
    }
    let cancelled = false;
    setSuggesting(true);
    const timer = window.setTimeout(() => {
      void suggestInvoiceParties(q)
        .then((found) => {
          if (!cancelled) setParties(found);
        })
        .catch(() => {
          if (!cancelled) setParties([]);
        })
        .finally(() => {
          if (!cancelled) setSuggesting(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, picked]);

  const buyer = { name, inn, kpp, address, email };
  const buyerError = picked ? invoiceBuyerError(buyer) : "Выберите организацию из списка";

  const edit = (field: "name" | "inn", value: string) => {
    if (field === "name") setName(value);
    else setInn(value);
    setPicked(false);
    setKpp("");
    setAddress("");
    setAnchor(field);
    setQuery(value);
    setError(null);
  };

  const pick = (party: InvoiceParty) => {
    setName(party.name);
    setInn(party.inn);
    setKpp(party.kpp);
    setAddress(party.address);
    setPicked(true);
    setParties([]);
    setQuery("");
    setAnchor(null);
    setError(null);
  };

  const suggestions =
    parties.length > 0 ? (
      <ul
        className={[
          "booking-invoice__suggest",
          anchor === "inn" && "booking-invoice__suggest--inn",
        ]
          .filter(Boolean)
          .join(" ")}
        role="listbox"
        aria-label="Найденные компании"
      >
        {parties.map((party) => (
          <li key={`${party.inn}-${party.kpp}`}>
            <button type="button" role="option" onClick={() => pick(party)}>
              <span className="booking-invoice__suggest-name">{party.name}</span>
              <span className="booking-invoice__suggest-meta">
                {`ИНН ${party.inn}`}
                {party.kpp ? ` · КПП ${party.kpp}` : ""}
                {party.address ? ` · ${party.address}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  const send = async () => {
    if (buyerError || sending || disabled) return;
    setSending(true);
    setError(null);
    try {
      const document = await issueInvoice({
        bookingId,
        daily,
        scope,
        phone,
        buyer,
      });
      if (!document.pdfUrl) {
        throw new Error("Не получили ссылку на счёт");
      }
      setIssued(document);
      onIssued?.(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выставить счёт");
    } finally {
      setSending(false);
    }
  };

  if (issued) {
    const href = invoicePdfHref(issued.pdfUrl);
    return (
      <div className="booking-invoice">
        <p className="booking-checkout__success-text">
          Счёт №{issued.number || "—"} отправлен на {email}
          {issued.dueDate
            ? `. Оплатить не позднее ${formatInvoiceDate(issued.dueDate)}`
            : ""}
          .
        </p>
        <a
          className="booking-checkout__submit booking-invoice__pdf"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          Скачать счёт
        </a>
      </div>
    );
  }

  return (
    <div className="booking-invoice">
      <div className="booking-invoice__row">
        <div className="booking-checkout__field booking-invoice__anchor">
          <label className="booking-checkout__label" htmlFor="bk-invoice-name">
            Покупатель (наименование юр. лица или ИП)
          </label>
          <input
            id="bk-invoice-name"
            className="booking-checkout__input"
            name="invoice-buyer"
            autoComplete="organization"
            placeholder="ООО «Компания» — начните вводить"
            value={name}
            disabled={disabled || sending}
            onChange={(event) => edit("name", event.target.value)}
          />
          {anchor === "name" ? suggestions : null}
        </div>
        <div className="booking-checkout__field booking-invoice__anchor">
          <label className="booking-checkout__label" htmlFor="bk-invoice-inn">
            ИНН покупателя
          </label>
          <input
            id="bk-invoice-inn"
            className="booking-checkout__input"
            name="invoice-inn"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1234567890"
            value={inn}
            disabled={disabled || sending}
            onChange={(event) => edit("inn", event.target.value)}
          />
          {anchor === "inn" ? suggestions : null}
        </div>
      </div>
      {suggesting && parties.length === 0 ? (
        <p className="booking-checkout__hint">Ищем организацию…</p>
      ) : null}
      {error ? (
        <p className="booking-certificate__promo-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="booking-checkout__submit"
        disabled={Boolean(buyerError) || sending || disabled}
        onClick={() => void send()}
      >
        {sending ? "Отправляем счёт…" : "Отправить счёт"}
      </button>
    </div>
  );
};
