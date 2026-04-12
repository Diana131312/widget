# Календари занятости бань

Реализация двух типов календарей для отображения занятости бань.

## Структура

- `types.ts` - типы данных (TimeRange, DayOccupancy, RoomOccupancy и т.д.)
- `mockBookingData.ts` - генерация фейковых данных занятости для разработки
- `OccupancyBar.tsx` - компонент прогресс-бара занятости (красный = занято, зеленый = свободно)
- `WeeklyCalendar.tsx` - недельный календарь для режима "Все бани"
- `MonthlyCalendar.tsx` - месячный календарь для режима "Конкретная баня"
- `CalendarDemo.tsx` - демо-компонент для тестирования

## Использование

### Недельный календарь (режим "Все бани")

```tsx
import { WeeklyCalendar, generateMockWeeklyData } from "./calendar";
import { startOfWeek } from "date-fns";

const rooms = [...]; // массив WidgetRoom
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
const data = generateMockWeeklyData(rooms, weekStart);

<WeeklyCalendar data={data} />
```

### Месячный календарь (режим "Конкретная баня")

```tsx
import { MonthlyCalendar, generateMockMonthlyData } from "./calendar";
import { startOfMonth } from "date-fns";

const room = {...}; // WidgetRoom
const monthStart = startOfMonth(new Date());
const data = generateMockMonthlyData(room, monthStart);

<MonthlyCalendar data={data} roomName={room.name} />
```

## Особенности

- **Рабочий день**: 9:00 - 23:00 (14 часов)
- **Визуализация**: прогресс-бары под каждым днем (красный = занято, зеленый = свободно)
- **Навигация**: стрелки для переключения между неделями/месяцами
- **Мок-данные**: случайная генерация 0-3 занятых слотов в день (1-4 часа каждый)

## Интеграция с реальным API

В будущем `generateMockWeeklyData` и `generateMockMonthlyData` можно заменить на запросы к API:
- `GET /availability/{alias}/{roomId}?from=...&to=...` для получения реальных данных занятости
