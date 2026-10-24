import React from "react";
import type { BookingCategoryId } from "../types";

type Props = {
  name: string;
  categoryId: BookingCategoryId;
  roomId: string;
  /** h4 внутри карточки */
  as?: "h4" | "span";
};

/** Название объекта (кнопка копирования ссылки убрана). */
export const RoomNameWithCopy: React.FC<Props> = ({
  name,
  as = "h4",
}) => {
  const TitleTag = as;
  return <TitleTag className="booking-object-card__name">{name}</TitleTag>;
};
