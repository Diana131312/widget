import React from "react";

/** Зелёная и красная точки под календарём: свободно / занято. */
export const OccupancyLegend: React.FC = () => {
  return (
    <ul className="booking-cal__legend" aria-label="Обозначения">
      <li>
        <span
          className="booking-cal__legend-dot booking-cal__legend-dot--free"
          aria-hidden
        />
        свободно
      </li>
      <li>
        <span
          className="booking-cal__legend-dot booking-cal__legend-dot--busy"
          aria-hidden
        />
        занято
      </li>
    </ul>
  );
};
