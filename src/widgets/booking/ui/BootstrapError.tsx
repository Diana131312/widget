import React from "react";
import { getBootstrapErrorCopy } from "./errorMessages";

type Props = {
  error: unknown;
  onRetry: () => void;
};

export const BootstrapError: React.FC<Props> = ({ error, onRetry }) => {
  const { title, detail } = getBootstrapErrorCopy(error);

  return (
    <div className="booking-bootstrap-error" role="alert">
      <h3 className="booking-bootstrap-error__title">{title}</h3>
      <p className="booking-bootstrap-error__detail">{detail}</p>
      <button type="button" className="booking-retry" onClick={onRetry}>
        Попробовать снова
      </button>
    </div>
  );
};
