import React from "react";

type Props = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

/** Блок после невалидного deep-link (занятый слот / даты). */
export const DeepLinkIssue: React.FC<Props> = ({
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="booking-bootstrap-error" role="alert">
      <h3 className="booking-bootstrap-error__title">{message}</h3>
      <button type="button" className="booking-retry" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
};
