import { useCallback, useState } from "react";
import { getCategoryConfig } from "./categories";
import type { BookingCategoryId, BookingStepId } from "./types";

const ROOT_TITLE = "Бронирование";

export function useBookingFlow() {
  const [stepId, setStepId] = useState<BookingStepId>("category");
  const [categoryId, setCategoryId] = useState<BookingCategoryId | null>(null);

  const title =
    stepId === "category"
      ? ROOT_TITLE
      : (categoryId && getCategoryConfig(categoryId)?.title) || ROOT_TITLE;

  const canGoBack = stepId !== "category";

  const selectCategory = useCallback((id: BookingCategoryId) => {
    setCategoryId(id);
    setStepId("object");
  }, []);

  const back = useCallback(() => {
    if (stepId === "object") {
      setStepId("category");
      setCategoryId(null);
    }
  }, [stepId]);

  return {
    stepId,
    categoryId,
    title,
    canGoBack,
    selectCategory,
    back,
  };
}
