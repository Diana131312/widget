import React from "react";
import { BOOKING_CATEGORIES } from "../categories";
import type { BookingCategoryId } from "../types";

type StepCategoryProps = {
  onSelect: (categoryId: BookingCategoryId) => void;
};

export const StepCategory: React.FC<StepCategoryProps> = ({ onSelect }) => {
  return (
    <section className="booking-home" aria-label="Выбор категории">
      <div className="booking-home__grid">
        {BOOKING_CATEGORIES.map(({ id, caption, Icon }) => (
          <button
            key={id}
            type="button"
            className="booking-category-card"
            onClick={() => onSelect(id)}
          >
            <span className="booking-category-card__icon" aria-hidden>
              <Icon size={28} strokeWidth={1.5} />
            </span>
            <span className="booking-category-card__caption">{caption}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
