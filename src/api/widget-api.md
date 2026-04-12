# Widget API — `/api/widget`

Публичный API виджета бронирования. Все эндпоинты доступны без авторизации администратора.
Идентификация тенанта происходит через параметр `alias`.

**Base URL:** `https://app.gettime.online/api/widget`

---

## Конфигурация и настройки

### GET `/settings/{alias}` — Тема виджета

**Response:**
```json
{ "defaultTheme": 0 }
```

---

### GET `/get/{alias}` — Полная конфигурация виджета

Возвращает всё необходимое для инициализации виджета: настройки, залы, программы, товары, сертификаты, посуточные залы.

Если пользователь аутентифицирован (JWT) — учитывается VIP-статус контакта.

**Response:**
```json
{
  "settings": { ... },
  "company": { ... },
  "rooms": [
    {
      "id": "guid",
      "name": "string",
      "images": ["url"],
      "description": "string",
      "capacity": 10,
      "maxCapacity": 15,
      "durationType": 0,
      "minDuration": 1,
      "isHalfHour": false,
      "groupName": "string",
      "pricePeriod": { ... }
    }
  ],
  "commons": [ ... ],
  "programs": [ ... ],
  "programsRooms": [ ... ],
  "products": [ ... ],
  "certificates": [ ... ],
  "isOnlineEnabled": true,
  "chatPushSession": { ... },
  "dailyRooms": [
    {
      "id": "guid",
      "name": "string",
      "description": "string",
      "images": ["url"],
      "capacity": 2,
      "maxCapacity": 4,
      "checkInTime": "14:00",
      "checkOutTime": "12:00",
      "minNights": 1,
      "maxNights": null,
      "pricePeriod": {
        "weekDayPrice": 3000,
        "weekEndPrice": 5000,
        "preWeekEndPrice": 4000,
        "extraGuestWeekDay": 500,
        "extraGuestWeekEnd": 700,
        "extraGuestPreWeekEnd": 600
      }
    }
  ]
}
```

---

## Доступность и тайм-слоты

### GET `/times/{alias}/{roomId}/{date}` — Слоты зала

**Параметры:** `roomId` (Guid), `date` (LocalDate, формат `yyyy-MM-dd`)

**Response:**
```json
{
  "discounts": [ ... ],
  "times": [
    { "time": "10:00", "isFree": true, ... }
  ],
  "period": { ... },
  "prevPeriod": { ... }
}
```

---

### GET `/times-program/{alias}/{programId}/{roomId}/{date}` — Слоты программы

**Параметры:** `programId` (Guid), `roomId` (Guid), `date` (LocalDate)

**Response:**
```json
{
  "discounts": [ ... ],
  "times": [
    { "from": "10:00", "to": "12:00", ... }
  ]
}
```

---

### GET `/availability/{alias}/{roomId}?from=...&to=...` — Доступность зала за период

**Query:** `from`, `to` (LocalDate)

**Response:**
```json
{ "days": [ ... ] }
```

---

### GET `/availability-program/{alias}/{programId}/{roomId}?from=...&to=...` — Доступность программы

**Query:** `from`, `to` (LocalDate)

**Response:**
```json
{ "days": [ ... ] }
```

---

### GET `/slots/{alias}/{commonId}/{date}` — Слоты общего зала (билеты)

**Параметры:** `commonId` (Guid), `date` (LocalDate)

Аутентификация опциональна — VIP-контакты видят VIP-цены.

**Response:**
```json
[
  {
    "id": "guid",
    "name": "Утренний сеанс",
    "time": "10:00",
    "restTickets": 15,
    "prices": [
      { "name": "Взрослый", "price": 500, "isVip": false }
    ]
  }
]
```

---

## Аутентификация

### POST `/sendSms` — Отправка кода

**Request:**
```json
{
  "number": "+79001234567",
  "alias": "my-company",
  "messenger": "whatsapp"
}
```

`messenger`: `"whatsapp"` | `"telegram"` | `"max"` | `null` (SMS)

**Response:**
```json
{ "success": true }
```

Или (для Telegram, если нужна верификация через бота):
```json
{ "success": false, "needBotVerification": true, "botLink": "https://t.me/..." }
```

---

### POST `/auth` — Проверка кода и получение JWT

**Request:**
```json
{
  "alias": "my-company",
  "phone": "+79001234567",
  "code": "1234"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "expiresAt": "2026-03-07T12:00:00Z",
  "contact": {
    "id": "guid",
    "displayName": "Иван",
    "phone": "+79001234567",
    "deposit": 1500,
    "discount": 10,
    ...
  }
}
```

Токен живёт 5 дней. Передаётся в `Authorization: Bearer <token>`.

---

### GET `/user/info` — Информация о пользователе

**Авторизация:** JWT (обязательна)

**Response:** `ContactWidgetModel` — данные контакта, депозит, скидка и т.д.

---

### POST `/user/history` — История бронирований

**Авторизация:** опциональна

**Request:**
```json
{
  "phone": "+79001234567",
  "isShowPast": false
}
```

**Response:** массив бронирований (текущие или прошедшие)

---

## Промокоды и расчёт цены

### POST `/promo-code/check` — Проверка промокода

**Request:** `CheckPromoCodeRequest`

**Response:** `int` — процент скидки (0 если невалидный)

---

### POST `/calculate/{alias}` — Расчёт цены зала

**Request:**
```json
{
  "roomId": "guid",
  "date": "2026-03-15",
  "time": "14:00",
  "duration": 2.0,
  "discounts": [1, 3],
  "personCount": 5,
  "promoCode": "PROMO10",
  "contactDiscount": 10,
  "discountContactType": 0,
  "manualDiscount": null
}
```

**Response:** объект с разбивкой цены (total, basePrice, discountAmount, ...)

---

### POST `/calculate-program/{alias}` — Расчёт цены программы

Аналогично `calculate`, но с `programId` в теле запроса.

---

## Создание бронирований

### POST `/save` — Бронирование зала

**Request:**
```json
{
  "alias": "my-company",
  "date": "2026-03-15",
  "time": "14:00",
  "duration": 2.0,
  "name": "Иван",
  "lastName": "Петров",
  "email": "ivan@mail.ru",
  "phone": "+79001234567",
  "messenger": "whatsapp",
  "roomId": "guid",
  "promoCode": "PROMO10",
  "discounts": [1],
  "products": [
    { "id": "guid", "name": "Напиток", "price": 200, "count": 2, ... }
  ],
  "personCount": 5,
  "checkCode": "1234",
  "comment": "ДР"
}
```

`checkCode` — SMS-код, нужен если включено подтверждение и пользователь не аутентифицирован.

**Response:**
```json
{
  "bookingId": "guid",
  "amount": 5000,
  "paymentLink": "https://...",
  "token": "jwt-token",
  "tokenExpiresAt": "2026-03-20T14:00:00Z"
}
```

`token` возвращается только если SMS-верификация прошла (автологин после бронирования).

---

### POST `/save-program` — Бронирование программы

Тело аналогично `/save`, дополнительно `programId` (Guid).

**Response:** аналогично `/save`.

---

### POST `/save-tickets` — Покупка билетов

**Request:**
```json
{
  "alias": "my-company",
  "slotId": "guid",
  "date": "2026-03-15",
  "name": "Иван",
  "phone": "+79001234567",
  "email": "ivan@mail.ru",
  "messenger": "whatsapp",
  "promoCode": "PROMO10",
  "checkCode": "1234",
  "tickets": [
    { "priceName": "Взрослый", "priceAmount": 500 },
    { "priceName": "Детский", "priceAmount": 300 }
  ]
}
```

**Response:**
```json
{
  "amount": 800,
  "paymentLink": "https://...",
  "token": "jwt-token",
  "tokenExpiresAt": "..."
}
```

---

### POST `/save-certificates` — Покупка сертификатов

**Request:**
```json
{
  "alias": "my-company",
  "name": "Иван",
  "phone": "+79001234567",
  "messenger": "whatsapp",
  "email": "ivan@mail.ru",
  "recipientName": "Анна",
  "certificates": [
    { "id": "guid", "count": 2 }
  ]
}
```

**Response:**
```json
{
  "amount": 5000,
  "paymentLink": "https://..."
}
```

---

## Оплата

### POST `/pay-with-deposit` — Оплата депозитом

**Авторизация:** JWT (обязательна)

**Request:**
```json
{ "bookingId": "guid" }
```

**Response (депозит покрыл всё):**
```json
{ "success": true, "paidFully": true, "depositUsed": 5000 }
```

**Response (нужна доплата):**
```json
{
  "success": true,
  "paidFully": false,
  "depositUsed": 3000,
  "remainingAmount": 2000,
  "paymentLink": "https://..."
}
```

---

### GET `/payment-link/{alias}/{bookingId}` — Ссылка на оплату

**Авторизация:** JWT (обязательна). Проверяется принадлежность бронирования контакту.

**Response:** строка — URL ссылки на оплату.

---

## Отмена бронирований

### GET `/cancel-preview/{alias}/{bookingId}` — Предпросмотр отмены

**Авторизация:** JWT (обязательна)

**Response:**
```json
{
  "canCancel": true,
  "hasPenalty": true,
  "penaltyAmount": 1000,
  "message": "Внимание! Бесплатная отмена возможна не менее чем за 24 часа...",
  "freeCancellationHours": 24,
  "hoursUntilBooking": 12,
  "infoMessage": "Правила отмены..."
}
```

Или если отмена запрещена:
```json
{
  "canCancel": false,
  "message": "Самостоятельная отмена недоступна...",
  "infoMessage": "..."
}
```

---

### POST `/cancel/{alias}/{bookingId}` — Отмена бронирования

**Авторизация:** JWT (обязательна)

**Request:**
```json
{ "confirmed": true }
```

**Response:**
```json
{
  "success": true,
  "penaltyAmount": 1000,
  "refundToDeposit": 4000
}
```

Логика: штраф удерживается, остаток возвращается на депозит контакта.

---

## Посуточные залы

### GET `/daily-occupied/{alias}/{roomId}?from=...&to=...` — Занятые даты

**Query:** `from`, `to` (LocalDate)

**Response:** массив занятых диапазонов дат.

---

### POST `/daily-calculate/{alias}` — Расчёт стоимости проживания

**Request:**
```json
{
  "roomId": "guid",
  "checkInDate": "2026-03-15",
  "checkOutDate": "2026-03-18",
  "personCount": 3
}
```

**Response:**
```json
{
  "nights": 3,
  "nightPrices": [
    { "date": "2026-03-15", "price": 3000 },
    { "date": "2026-03-16", "price": 5000 },
    { "date": "2026-03-17", "price": 5000 }
  ],
  "totalPrice": 13000,
  "periodMessage": null
}
```

`periodMessage` — если для каких-то дат нет настроенного периода цен.

---

### POST `/daily-save` — Бронирование посуточного зала

**Request:**
```json
{
  "alias": "my-company",
  "dailyRoomId": "guid",
  "checkInDate": "2026-03-15",
  "checkOutDate": "2026-03-18",
  "personCount": 3,
  "name": "Иван",
  "lastName": "Петров",
  "phone": "+79001234567",
  "messenger": "whatsapp",
  "comment": "Поздний заезд",
  "promoCode": null,
  "checkCode": "1234",
  "products": []
}
```

**Response:**
```json
{
  "bookingId": "guid",
  "amount": 13000,
  "paymentLink": "https://...",
  "token": "jwt-token",
  "tokenExpiresAt": "..."
}
```

---

## Устаревшие эндпоинты

### POST `/checkSms` ⚠️ Deprecated

Используйте `/auth` вместо этого.

**Request:**
```json
{ "number": "+79001234567", "code": "1234" }
```

**Response:** `true` / `false`
