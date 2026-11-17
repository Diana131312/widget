import React from "react";
import { Gift } from "lucide-react";
import { VISIBLE_BOOKING_CATEGORIES } from "../categories";
import type { BookingCategoryId } from "../types";

type StepCategoryProps = {
  onSelect: (categoryId: BookingCategoryId) => void;
  onSelectCertificate?: () => void;
};

export const StepCategory: React.FC<StepCategoryProps> = ({
  onSelect,
  onSelectCertificate,
}) => {
  return (
    <section className="booking-home" aria-label="Выбор категории">
      <div className="booking-home__grid">
        {VISIBLE_BOOKING_CATEGORIES.map(({ id, caption, Icon }) => (
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
        <button
          type="button"
          className="booking-category-card"
          onClick={onSelectCertificate}
        >
          <span className="booking-category-card__icon" aria-hidden>
            <Gift size={28} strokeWidth={1.5} />
          </span>
          <span className="booking-category-card__caption">
            Подарочные сертификаты
          </span>
        </button>
      </div>
    </section>
  );
};
