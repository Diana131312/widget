import React, { useMemo } from "react";
import type { CategoryDefinition } from "../types";
import type { StepProps } from "./stepTypes";
import { useBookingFlow } from "../booking/BookingFlowContext";

export const StepCategory: React.FC<StepProps> = ({ state, goTo }) => {
  const { categoryId, setCategoryId } = useBookingFlow();
  // Строим категории из данных API (state.data.config)
  const availableCategories = useMemo<CategoryDefinition[]>(() => {
    const config = state.data.config;
    if (!config) return [];

    const cats: CategoryDefinition[] = [];

    // Если rooms.length > 0 → показывать категорию "Баня"
    if (config.rooms && Array.isArray(config.rooms) && config.rooms.length > 0) {
      cats.push({ id: "banya", label: "Баня" });
    }

    // Если dailyRooms.length > 0 → показывать категорию "Дома"
    if (
      config.dailyRooms &&
      Array.isArray(config.dailyRooms) &&
      config.dailyRooms.length > 0
    ) {
      cats.push({ id: "homes", label: "Дома" });
    }

    return cats;
  }, [state.data.config]);

  const isLoading = !state.data.config;

  const getCategoryImage = (categoryId: string): string => {
    // Заглушки для изображений (пока нет API)
    if (categoryId === "banya") {
      return "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"; // Оранжевый градиент
    }
    return "linear-gradient(135deg, #5a6b5a 0%, #485548 100%)";
  };

  return (
    <div>
      <h3 className="stepper-widget__title">Добро пожаловать</h3>
      <p className="stepper-widget__sub">
        Выберите категорию, чтобы продолжить бронирование.
      </p>

      {isLoading ? (
        <div className="stepper-widget__note">Загрузка категорий...</div>
      ) : availableCategories.length === 0 ? (
        <div className="stepper-widget__note">
          Нет доступных категорий для бронирования.
        </div>
      ) : (
        <div className="stepper-widget__categories-grid">
          {availableCategories.map((c) => (
            <button
              key={c.id}
              className="stepper-widget__category-card"
              type="button"
              onClick={() => {
                setCategoryId(c.id);

                if (c.id === "banya") {
                  goTo("banyaObject");
                  return;
                }

                // Категория "Дома" — шаги появятся позже
                // Пока оставляем пользователя на текущем шаге.
              }}
            >
              <div
                className="stepper-widget__category-card-bg"
                style={{ background: getCategoryImage(c.id) }}
              />
              <div className="stepper-widget__category-card-gradient" />
              <div className="stepper-widget__category-card-content">
                <span className="stepper-widget__category-card-title">
                  {c.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {categoryId === "homes" && (
        <div className="stepper-widget__note">
          Категория «Дома» будет добавлена в следующих шагах.
        </div>
      )}
    </div>
  );
};

