import React from "react";
import { BedDouble, Home } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { StepProps } from "./stepTypes";
import { useBookingCart } from "../cart";
import { MultiCartItemAccordion } from "../cart/MultiCartItemAccordion";
import { CrossSellHomeBlock } from "./add-services/CrossSellHomeBlock";
import { CrossSellBanyaBlock } from "./add-services/CrossSellBanyaBlock";

export const StepAddServices: React.FC<StepProps> = ({ goTo, state, alias = "les" }) => {
  const cart = useBookingCart();
  const config = state.data.config;
  const tenantId = config?.settings?.tenantId ?? null;
  const dailyRooms = config?.dailyRooms ?? [];
  const rooms = config?.rooms ?? [];
  const hasBanya = rooms.length > 0;
  const hasHomes = dailyRooms.length > 0;

  const productNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of config?.products ?? []) {
      map.set(p.id, p.name);
    }
    return map;
  }, [config?.products]);

  const handleAddBanya = () => {
    const stepId = cart.startNewBooking("banyaTest");
    goTo(stepId);
  };

  const handleAddHome = () => {
    const stepId = cart.startNewBooking("homes");
    goTo(stepId);
  };

  return (
    <div className="step-add-services">
      <p className="stepper-widget__sub">
        Бронирования сохранены в корзине. Добавьте услуги или перейдите к оформлению.
      </p>

      {cart.items.length > 0 && (
        <MultiCartItemAccordion
          items={cart.items}
          productNames={productNames}
          onEdit={(id) => {
            const step = cart.startEditItem(id);
            if (step) goTo(step);
          }}
          onRemove={(id) => cart.removeItem(id)}
        />
      )}

      {hasHomes && (
        <CrossSellHomeBlock
          alias={alias}
          dailyRooms={dailyRooms}
          tenantId={tenantId}
          goTo={goTo}
        />
      )}

      {hasBanya && (
        <CrossSellBanyaBlock
          alias={alias}
          rooms={rooms}
          tenantId={tenantId}
          goTo={goTo}
        />
      )}

      <section className="cross-sell-manual">
        <h4 className="cross-sell-manual__title">Добавить вручную</h4>
        <div className="step-add-services__actions">
          {hasBanya && (
            <button
              type="button"
              className="step-add-services__card"
              onClick={handleAddBanya}
            >
              <BedDouble size={22} aria-hidden />
              <span>Добавить любую баню</span>
            </button>
          )}
          {hasHomes && (
            <button
              type="button"
              className="step-add-services__card"
              onClick={handleAddHome}
            >
              <Home size={22} aria-hidden />
              <span>Добавить любой дом</span>
            </button>
          )}
        </div>
      </section>

      {cart.items.length > 0 && (
        <div className="step-add-services__footer">
          <p className="step-add-services__total">
            В корзине {cart.cartCount}{" "}
            {cart.cartCount === 1
              ? "бронирование"
              : cart.cartCount < 5
                ? "бронирования"
                : "бронирований"}
            · {cart.cartTotal.toLocaleString("ru-RU")} ₽
          </p>
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-[#485548] text-sm font-medium text-white hover:bg-[#485548]/90"
            onClick={() => goTo("bookingStepFive")}
          >
            Перейти к оформлению
          </Button>
        </div>
      )}
    </div>
  );
};
