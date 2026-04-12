import React, { useMemo } from "react";
import { startOfWeek, startOfMonth } from "date-fns";
import type { WidgetRoom } from "../../../api";
import {
  WeeklyCalendar,
  MonthlyCalendar,
  generateMockWeeklyData,
  generateMockMonthlyData,
} from "./index";

type Props = {
  mode: "all" | "single";
  rooms: WidgetRoom[];
  selectedRoom?: WidgetRoom;
};

/**
 * Демо-компонент для тестирования календарей
 */
export const CalendarDemo: React.FC<Props> = ({
  mode,
  rooms,
  selectedRoom,
}) => {
  const weeklyData = useMemo(() => {
    if (mode !== "all" || rooms.length === 0) return [];
    return generateMockWeeklyData(rooms, startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, [mode, rooms]);

  const monthlyData = useMemo(() => {
    if (mode !== "single" || !selectedRoom) return [];
    return generateMockMonthlyData(selectedRoom, startOfMonth(new Date()));
  }, [mode, selectedRoom]);

  if (mode === "all") {
    if (weeklyData.length === 0) {
      return <div>Нет данных для отображения</div>;
    }
    return <WeeklyCalendar data={weeklyData} />;
  }

  if (mode === "single") {
    if (!selectedRoom || monthlyData.length === 0) {
      return <div>Выберите баню для отображения календаря</div>;
    }
    return <MonthlyCalendar data={monthlyData} roomName={selectedRoom.name} />;
  }

  return null;
};
