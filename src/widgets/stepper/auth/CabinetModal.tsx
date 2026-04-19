import React, { useEffect, useState } from "react";
import type { UserHistoryItem, UserInfoResponse, WidgetApiClient } from "../../../api";

type Props = {
  user: UserInfoResponse;
  api: WidgetApiClient;
  onBack: () => void;
  onLogout: () => void;
  onShowToast?: (message: string) => void;
};

function formatBookingStatus(status: number): string {
  switch (status) {
    case 0:
      return "Черновик";
    case 1:
      return "Ожидание";
    case 2:
      return "Требуется оплата";
    case 3:
      return "Завершено";
    case 4:
      return "Отменено";
    default:
      return `Статус: ${status}`;
  }
}

function toStartDate(booking: UserHistoryItem): Date {
  const fallback = `${booking.date}T${booking.time}:00`;
  return new Date(booking.timeStartForDuration ?? fallback);
}

function toEndDate(booking: UserHistoryItem): Date {
  if (booking.timeEndForDuration) return new Date(booking.timeEndForDuration);
  const start = toStartDate(booking);
  return new Date(start.getTime() + booking.duration * 60 * 60 * 1000);
}

function formatDateRu(booking: UserHistoryItem): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toStartDate(booking));
}

function formatTimeRangeRu(booking: UserHistoryItem): string {
  const start = toStartDate(booking);
  const end = toEndDate(booking);
  const fmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(start)} — ${fmt.format(end)}`;
}

export const CabinetModal: React.FC<Props> = ({ user, api, onBack, onLogout, onShowToast }) => {
  const [isShowPast, setShowPast] = useState(false);
  const [bookings, setBookings] = useState<UserHistoryItem[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<UserHistoryItem | null>(null);
  const [isCancelling, setCancelling] = useState(false);

  useEffect(() => {
    let isAlive = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getUserHistory({
          isShowPast,
          phone: user.phone ?? undefined,
        });
        if (!isAlive) return;
        setBookings(response.allBookings ?? []);
      } catch (err) {
        if (!isAlive) return;
        const message = err instanceof Error ? err.message : "Не удалось загрузить историю";
        setError(message);
      } finally {
        if (isAlive) setLoading(false);
      }
    };

    void load();
    return () => {
      isAlive = false;
    };
  }, [api, isShowPast, user.phone]);

  const sortedBookings = React.useMemo(() => {
    const now = Date.now();
    const list = [...bookings];
    list.sort((a, b) => toStartDate(a).getTime() - toStartDate(b).getTime());
    if (!isShowPast) return list;
    const upcoming = list.filter((b) => toEndDate(b).getTime() >= now);
    const past = list.filter((b) => toEndDate(b).getTime() < now);
    return [...upcoming, ...past];
  }, [bookings, isShowPast]);

  const reloadHistory = async () => {
    const response = await api.getUserHistory({
      isShowPast,
      phone: user.phone ?? undefined,
    });
    setBookings(response.allBookings ?? []);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelling(true);
    try {
      await api.cancelBooking(bookingToCancel.id, { confirmed: true });
      setBookingToCancel(null);
      onShowToast?.("Бронирование отменено");
      await reloadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось отменить бронирование";
      onShowToast?.(message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="widget-cabinet-page">

      <div className="widget-cabinet-page__body">
        <div className="widget-profile">
          <h4 className="widget-section-title">Персональная информация</h4>
          <p><strong>Имя:</strong> {user.displayName ?? "Пользователь"}</p>
          <p><strong>Телефон:</strong>  {user.phone ?? "Телефон не указан"}</p>
          {/* <p>Посещений: {user.visitCount ?? 0}</p>
          <p>Скидка: {user.discount ?? 0}</p>
          <p>VIP: {user.isVip ? "Да" : "Нет"}</p> */}
        </div>

        

        <div className="widget-bookings">
          <h4 className="widget-section-title">История бронирований</h4>

          <label className="widget-switch">
          <span className="widget-switch__label">Показывать прошедшие бронирования</span>
          <input
            type="checkbox"
            className="widget-switch__input"
            checked={isShowPast}
            onChange={(e) => setShowPast(e.target.checked)}
          />
          <span className="widget-switch__track" aria-hidden="true">
            <span className="widget-switch__thumb" />
          </span>
        </label>
        
          {isLoading ? (
            <p className="widget-note">Загрузка истории...</p>
          ) : error ? (
            <p className="stepper-widget__error">{error}</p>
          ) : bookings.length === 0 ? (
            <p className="widget-note">Бронирования не найдены</p>
          ) : (
            sortedBookings.map((booking) => (
              <div key={booking.id} className="widget-booking-card">
                <div className="widget-booking-card__top">
                  <p><strong>{booking.roomName}</strong></p>
                  <span className="widget-booking-status">{formatBookingStatus(booking.status)}</span>
                </div>
                <p>Дата: {formatDateRu(booking)}</p>
                <p>Время: {formatTimeRangeRu(booking)}</p>
                <div className="widget-booking-card__actions">
                  <button
                    type="button"
                    className="widget-booking-cancel-btn"
                    onClick={() => setBookingToCancel(booking)}
                    disabled={booking.status === 4}
                  >
                    🗑 Отменить бронирование
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        
      </div>

      {isLogoutConfirmOpen && (
        <div className="widget-modal-overlay widget-modal-overlay--inner" role="dialog" aria-modal="true">
          <div className="widget-modal-card">
            <div className="widget-modal-body">
              <h5 className="widget-modal-title">Вы уверены, что хотите выйти?</h5>
              <div className="widget-actions-row">
                <button
                  type="button"
                  className="stepper-widget__btn"
                  onClick={() => setLogoutConfirmOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="stepper-widget__btn stepper-widget__btn--primary"
                  onClick={onLogout}
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bookingToCancel && (
        <div className="widget-modal-overlay widget-modal-overlay--inner" role="dialog" aria-modal="true">
          <div className="widget-modal-card">
            <div className="widget-modal-header">
              <h5 className="widget-modal-title">Отмена записи</h5>
              <button
                type="button"
                className="stepper-widget__btn stepper-widget__btn--ghost"
                onClick={() => setBookingToCancel(null)}
                disabled={isCancelling}
              >
                ×
              </button>
            </div>
            <div className="widget-modal-body">
              <p>Вы отменяете бронирование</p>
              <p>
                {formatDateRu(bookingToCancel)}, {formatTimeRangeRu(bookingToCancel)} - {bookingToCancel.roomName}
              </p>
              <div className="widget-actions-row">
                <button
                  type="button"
                  className="stepper-widget__btn"
                  onClick={() => setBookingToCancel(null)}
                  disabled={isCancelling}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="stepper-widget__btn stepper-widget__btn--primary"
                  onClick={() => void handleConfirmCancel()}
                  disabled={isCancelling}
                >
                  Подтвердить отмену
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
