import React, { useEffect, useMemo, useState } from "react";
import { createWidgetApi } from "../../../../api";
import type { WidgetRoom } from "../../../../api";
import { useBookingCart } from "../../cart";
import { isBanyaCartItem, isHomeCartItem } from "../../cart/cartTypes";
import {
  buildSlotLabel,
  collectDatesFromHomeCart,
  fetchBanyaRoomsAvailability,
  type BanyaRoomAvailability,
} from "./crossSellService";
import { SuggestedBanyaCard } from "./SuggestedBanyaCard";

type Props = {
  alias: string;
  rooms: WidgetRoom[];
  tenantId: string | null;
  goTo: (stepId: import("../../types").StepId) => void;
};

export const CrossSellBanyaBlock: React.FC<Props> = ({ alias, rooms, tenantId, goTo }) => {
  const cart = useBookingCart();
  const api = React.useMemo(() => createWidgetApi({ alias }), [alias]);
  const [roomOffers, setRoomOffers] = useState<BanyaRoomAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const homeItems = useMemo(
    () => cart.items.filter(isHomeCartItem),
    [cart.items]
  );
  const homeStayDatesKey = useMemo(
    () => collectDatesFromHomeCart(homeItems).join(","),
    [homeItems]
  );
  const roomIdsKey = useMemo(() => rooms.map((r) => r.id).join(","), [rooms]);

  const hasHomeInCart = homeItems.length > 0;
  const hasBanyaInCart = cart.items.some(isBanyaCartItem);
  const showBlock = hasHomeInCart && !hasBanyaInCart;

  useEffect(() => {
    if (!showBlock) {
      setRoomOffers([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    fetchBanyaRoomsAvailability(api, rooms, homeItems, 3)
      .then((data) => {
        if (!cancelled) setRoomOffers(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
          setRoomOffers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, rooms, roomIdsKey, homeStayDatesKey, showBlock, homeItems]);

  if (!showBlock) return null;

  return (
    <section className="cross-sell-block">
      <h4 className="cross-sell-block__title">К дому — баня</h4>
      <p className="cross-sell-block__sub">
        Баня в дни вашего проживания — выберите дату и слот в карточке бани.
      </p>

      {isLoading && (
        <div className="cross-sell-block__loading">Ищем свободные бани…</div>
      )}

      {hasError && !isLoading && (
        <div className="cross-sell-block__empty">
          Не удалось загрузить предложения. Попробуйте позже.
        </div>
      )}

      {!isLoading && !hasError && roomOffers.length === 0 && (
        <div className="cross-sell-block__empty">
          Нет свободных слотов бани на даты вашего проживания.
        </div>
      )}

      {!isLoading && roomOffers.length > 0 && (
        <div className="cross-sell-block__cards">
          {roomOffers.map((item) => (
            <SuggestedBanyaCard
              key={item.room.id}
              room={item.room}
              tenantId={tenantId}
              availableDates={item.availableDates}
              slotsByDate={item.slotsByDate}
              onAdd={({ date, slot }) => {
                cart.startPrefilledBooking("banyaTest", {
                  roomId: item.room.id,
                  roomName: item.room.name,
                  date,
                  timeFrom: slot.timeFrom,
                  timeTo: slot.timeTo,
                  slotDuration: slot.duration,
                  slotPrice: slot.price,
                  slotLabel: buildSlotLabel(slot),
                  guestCount: 0,
                  basePrice: undefined,
                });
                goTo("bookingStepThree");
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};
