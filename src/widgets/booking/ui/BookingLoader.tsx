import React from "react";

type BookingLoaderProps = {
  label?: string;
};

export const BookingLoader: React.FC<BookingLoaderProps> = ({
  label = "Загрузка…",
}) => {
  return (
    <div className="booking-loader" role="status" aria-live="polite">
      <div className="booking-loader__spinner" aria-hidden />
      <p className="booking-loader__label">{label}</p>
    </div>
  );
};
