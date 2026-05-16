import React, { useCallback } from "react";
import { createWidgetApi } from "../../../../api";
import { Button } from "../../../../components/ui/button";
import type { StepProps } from "../stepTypes";
import { getObjectStepId } from "../../utils/stepNavigation";
import { ProductGroupAccordion } from "./ProductGroupAccordion";
import { BookingMiniCard } from "./BookingMiniCard";
import { SetupPriceBreakdown } from "./SetupPriceBreakdown";
import { useBookingCatalog } from "./useBookingCatalog";
import { useBookingCalculate } from "./useBookingCalculate";
import type { MiniCardSlotPick } from "./MiniCardTimeSlots";

export const BookingStepSetup: React.FC<StepProps> = ({ state, goTo, alias = "les" }) => {
  const api = React.useMemo(() => createWidgetApi({ alias }), [alias]);

  const {
    categoryId,
    setupDraft: draft,
    config,
    patchDraft,
    setProductQty,
    groupedForRoom,
    productLines,
    productsSubtotal,
    total,
    maxGuests,
  } = useBookingCatalog(state);

  const onPriceResolved = useCallback(
    (totalPrice: number) => {
      patchDraft({ basePrice: totalPrice });
    },
    [patchDraft]
  );

  const { isLoading, error, banyaCalc, homesCalc, hasCalculation } = useBookingCalculate({
    api,
    categoryId,
    draft,
    onPriceResolved,
  });

  const objectStepId = getObjectStepId(categoryId);

  if (!draft || !categoryId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">
          Сначала выберите{" "}
          {categoryId === "homes"
            ? "дом и даты"
            : categoryId === "banyaTest"
              ? "баню и дату"
              : "баню, дату и время"}
          .
        </p>
        {objectStepId && (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => goTo(objectStepId)}
          >
            Вернуться к выбору
          </Button>
        )}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  const guestCount = draft.guestCount ?? 0;
  const hasTimeSlot = Boolean(draft.timeFrom && draft.timeTo);
  const needsTimeOnSetup = categoryId === "banyaTest";
  const canProceed =
    guestCount >= 1 &&
    hasCalculation &&
    !isLoading &&
    !error &&
    draft.basePrice != null &&
    (!needsTimeOnSetup || hasTimeSlot);

  const setGuestCount = (next: number) => {
    const clamped = Math.max(0, Math.min(next, maxGuests));
    patchDraft({
      guestCount: clamped,
      ...(clamped === 0 ? { basePrice: undefined } : {}),
    });
  };

  const handleBanyaTestSlotPick = (slot: MiniCardSlotPick | null) => {
    if (!slot) {
      patchDraft({
        timeFrom: undefined,
        timeTo: undefined,
        slotDuration: undefined,
        slotPrice: undefined,
        slotLabel: undefined,
        basePrice: undefined,
      });
      return;
    }
    patchDraft({
      timeFrom: slot.timeFrom,
      timeTo: slot.timeTo,
      slotDuration: slot.duration,
      slotPrice: slot.price,
      slotLabel: slot.label,
      basePrice: undefined,
    });
  };

  return (
    <div className="booking-step-three booking-step-three--natural-scroll relative flex w-full flex-col">
      <div className="booking-step-three__scroll-main space-y-6 px-1 pb-6 pt-1 sm:space-y-8 sm:px-0">
        <BookingMiniCard
          categoryId={categoryId}
          draft={draft}
          maxGuests={maxGuests}
          guestCount={guestCount}
          onGuestCountChange={setGuestCount}
          api={categoryId === "banyaTest" ? api : undefined}
          onSlotPick={categoryId === "banyaTest" ? handleBanyaTestSlotPick : undefined}
        />

        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Дополнительные товары
          </h4>
          {groupedForRoom.groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-[#FAFAF8] px-6 py-10 text-center text-sm text-gray-600">
              Нет доступных дополнительных товаров в каталоге.
            </div>
          ) : (
            <ProductGroupAccordion
              groups={groupedForRoom.groups}
              quantities={draft.productQuantities ?? {}}
              onSetQuantity={setProductQty}
              tenantId={config.settings.tenantId}
            />
          )}
        </div>

        <SetupPriceBreakdown
          categoryId={categoryId}
          draft={draft}
          banyaCalc={banyaCalc}
          homesCalc={homesCalc}
          productLines={productLines}
          productsSubtotal={productsSubtotal}
          total={total}
          isLoading={isLoading}
          error={error}
        />
      </div>

      <div className="booking-step-three__footer space-y-4 border-t border-gray-200 pt-5">
        <Button
          type="button"
          className="h-11 w-full rounded-xl bg-[#485548] text-sm font-medium text-white hover:bg-[#485548]/90 disabled:opacity-50"
          disabled={!canProceed}
          onClick={() => goTo("bookingStepFour")}
        >
          Далее
        </Button>
      </div>
    </div>
  );
};
