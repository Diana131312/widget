import React, { useEffect, useState } from "react";
import { createWidgetApi } from "../../../../api";
import type { WidgetDailyRoom } from "../../../../api";
import { useBookingCart } from "../../cart";
import { isBanyaCartItem, isHomeCartItem } from "../../cart/cartTypes";
import {
  collectBanyaDatesFromCart,
  fetchSuggestedHomes,
  type SuggestedHomeOffer,
} from "./crossSellService";
import { SuggestedHouseCard } from "./SuggestedHouseCard";

type Props = {
  alias: string;
  dailyRooms: WidgetDailyRoom[];
  tenantId: string | null;
  goTo: (stepId: import("../../types").StepId) => void;
};

export const CrossSellHomeBlock: React.FC<Props> = ({
  alias,
  dailyRooms,
  tenantId,
  goTo,
}) => {
  const cart = useBookingCart();
  const api = React.useMemo(() => createWidgetApi({ alias }), [alias]);
  const [offers, setOffers] = useState<SuggestedHomeOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const hasBanyaInCart = cart.items.some(isBanyaCartItem);
  const hasHomeInCart = cart.items.some(isHomeCartItem);
  const showBlock = hasBanyaInCart && !hasHomeInCart;

  useEffect(() => {
    if (!showBlock) {
      setOffers([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    const banyaDates = collectBanyaDatesFromCart(cart.items);

    fetchSuggestedHomes(api, dailyRooms, banyaDates, 3)
      .then((data) => {
        if (!cancelled) setOffers(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
          setOffers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, dailyRooms, cart.items, showBlock]);

  if (!showBlock) return null;

  return (
    <section className="cross-sell-block">
      <h4 className="cross-sell-block__title">К бане — дом</h4>
      <p className="cross-sell-block__sub">
        Ночлег накануне дня бани: заезд за день до визита в баню, выезд в день бани.
      </p>

      {isLoading && (
        <div className="cross-sell-block__loading">Подбираем доступные дома…</div>
      )}

      {hasError && !isLoading && (
        <div className="cross-sell-block__empty">
          Не удалось загрузить предложения. Попробуйте позже.
        </div>
      )}

      {!isLoading && !hasError && offers.length === 0 && (
        <div className="cross-sell-block__empty">
          Нет свободных домов на даты рядом с вашей баней.
        </div>
      )}

      {!isLoading && offers.length > 0 && (
        <div className="cross-sell-block__cards">
          {offers.map((offer) => (
            <SuggestedHouseCard
              key={`${offer.room.id}-${offer.checkIn}`}
              offer={offer}
              tenantId={tenantId}
              onAdd={() => {
                cart.startPrefilledBooking("homes", {
                  roomId: offer.room.id,
                  roomName: offer.room.name,
                  checkInDate: offer.checkIn,
                  checkOutDate: offer.checkOut,
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
