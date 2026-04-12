import React, { useState } from "react";

export type BookingWidgetProps = {
  /** Заголовок виджета (например, название отеля/услуги) */
  title?: string;
  /** Минимальная дата заезда */
  minCheckInDate?: string; // формат YYYY-MM-DD
  /** Максимальная дата выезда */
  maxCheckOutDate?: string; // формат YYYY-MM-DD
  /** Минимальное количество гостей */
  minGuests?: number;
  /** Максимальное количество гостей */
  maxGuests?: number;
  /** Начальное значение даты заезда */
  defaultCheckIn?: string;
  /** Начальное значение даты выезда */
  defaultCheckOut?: string;
  /** Начальное количество гостей */
  defaultGuests?: number;
  /** Колбэк при отправке формы бронирования */
  onSubmit?: (payload: {
    checkIn: string;
    checkOut: string;
    guests: number;
  }) => void;
};

export const BookingWidget: React.FC<BookingWidgetProps> = ({
  title = "Бронирование",
  minCheckInDate,
  maxCheckOutDate,
  minGuests = 1,
  maxGuests = 10,
  defaultCheckIn = "",
  defaultCheckOut = "",
  defaultGuests = 2,
  onSubmit,
}) => {
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(defaultGuests);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!checkIn || !checkOut) {
      setError("Выберите даты заезда и выезда.");
      return;
    }

    if (checkOut <= checkIn) {
      setError("Дата выезда должна быть позже даты заезда.");
      return;
    }

    if (guests < minGuests || guests > maxGuests) {
      setError(
        `Количество гостей должно быть от ${minGuests} до ${maxGuests}.`
      );
      return;
    }

    onSubmit?.({ checkIn, checkOut, guests });
  };

  return (
    <div className="booking-widget">
      <form className="booking-widget__card" onSubmit={handleSubmit}>
        <div className="booking-widget__header">
          <h3 className="booking-widget__title">{title}</h3>
        </div>

        <div className="booking-widget__row">
          <label className="booking-widget__field">
            <span className="booking-widget__label">Заезд</span>
            <input
              type="date"
              className="booking-widget__input"
              value={checkIn}
              min={minCheckInDate}
              max={maxCheckOutDate}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>

          <label className="booking-widget__field">
            <span className="booking-widget__label">Выезд</span>
            <input
              type="date"
              className="booking-widget__input"
              value={checkOut}
              min={checkIn || minCheckInDate}
              max={maxCheckOutDate}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>
        </div>

        <div className="booking-widget__row">
          <label className="booking-widget__field booking-widget__field--full">
            <span className="booking-widget__label">Гости</span>
            <div className="booking-widget__guests">
              <button
                type="button"
                className="booking-widget__counter-btn"
                onClick={() =>
                  setGuests((prev) => Math.max(minGuests, prev - 1))
                }
              >
                −
              </button>
              <input
                type="number"
                className="booking-widget__input booking-widget__input--center"
                min={minGuests}
                max={maxGuests}
                value={guests}
                onChange={(e) =>
                  setGuests(
                    Math.min(
                      maxGuests,
                      Math.max(minGuests, Number(e.target.value) || minGuests)
                    )
                  )
                }
              />
              <button
                type="button"
                className="booking-widget__counter-btn"
                onClick={() =>
                  setGuests((prev) => Math.min(maxGuests, prev + 1))
                }
              >
                +
              </button>
            </div>
          </label>
        </div>

        {error && <div className="booking-widget__error">{error}</div>}

        <button type="submit" className="booking-widget__submit">
          Забронировать
        </button>
      </form>
    </div>
  );
};

