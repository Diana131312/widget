## Виджет бронирования на React

Обособленный виджет бронирования, который можно встроить в любое React-приложение.

### Установка зависимостей

```bash
npm install
```

### Использование в коде

```tsx
import React from "react";
import { BookingWidget } from "./src/BookingWidget";
import "./src/styles.css";

export const App = () => {
  return (
    <div>
      <BookingWidget
        title="Бронирование номера"
        minCheckInDate="2026-03-10"
        maxCheckOutDate="2026-12-31"
        defaultGuests={2}
        onSubmit={(data) => {
          console.log("Бронь:", data);
        }}
      />
    </div>
  );
};
```

### Пропсы `BookingWidget`

- **title**?: `string` — заголовок виджета.
- **minCheckInDate**?: `string` — минимальная дата заезда (формат `YYYY-MM-DD`).
- **maxCheckOutDate**?: `string` — максимальная дата выезда (формат `YYYY-MM-DD`).
- **minGuests**?: `number` — минимальное количество гостей (по умолчанию `1`).
- **maxGuests**?: `number` — максимальное количество гостей (по умолчанию `10`).
- **defaultCheckIn**?: `string` — начальная дата заезда.
- **defaultCheckOut**?: `string` — начальная дата выезда.
- **defaultGuests**?: `number` — начальное количество гостей (по умолчанию `2`).
- **onSubmit?**: `(payload: { checkIn: string; checkOut: string; guests: number }) => void` — вызывается при успешной отправке формы.

