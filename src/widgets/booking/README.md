# Booking widget (MVP)

Чистая пересборка виджета бронирования под бренд [LES](https://les174.com/).

- Работать только в этой папке
- Старый `../stepper` не менять — только читать/импортировать при необходимости
- Стили — только локальные файлы здесь (`booking.css`), корень `.bk-widget`
- Alias API жёстко: `les` (`BOOKING_ALIAS`)

## Дизайн-токены (с les174.com)

| Токен | Значение |
|-------|----------|
| Шрифт | Georgia |
| Бренд / primary | `#485548` |
| Текст тёмный | `#293329` |
| Акцент | `#c9c928` |
| Крем (лого) | `#fffddd` |
| Фон | `#f3f3f3` |
| Поверхность | `#ffffff` |
| Календарь: свободно | `--bk-cal-free` (`#6b8f71`) |
| Календарь: занято | `--bk-cal-busy` (`#b85c5c`) |

## Запуск

| Команда | Что открывается |
|---------|-----------------|
| `pnpm dev` / `pnpm dev:booking` | этот виджет |
| `pnpm dev:stepper` | старый stepper |
| `pnpm build` | только booking |
| `pnpm test` | автотесты booking |

## Структура

- `BookingWidget.tsx` — оркестратор (корень `.bk-widget`)
- `useBookingFlow.ts` — UI-состояние шагов + sync в URL
- `url/` — parse/write/validate deep link
- `session/` — legacy sessionStorage (не используется виджетом)
- `bootstrap/` — загрузка `getConfig`, гибкие `STEP_DATA_NEEDS`
- `categories.ts` — конфиг категорий
- `layout/BookingLayout.tsx` — карточка-каркас
- `header/BookingHeader.tsx` — степпер без корзины/авторизации
- `steps/StepCategory.tsx` — шаг 1
- `steps/StepObject.tsx` — шаг 2 (список домов/бань)
- `steps/StepSetup.tsx` — шаг 3 (каталог допов + расчёт + гости)
- `steps/StepCheckout.tsx` — шаг 4 (контакт + save; extras временно пропущен)
- `setup/` — groupProducts, каталог A, calculate, isExtraGuestProduct
- `checkout/` — phone utils, contact fields, save payload
- `cards/ObjectCard.tsx` — общая настраиваемая карточка
- `media/` — карусель, модалка, кеш изображений
- `calendar/` — календари домов/бань, слоты, rangeLogic
- `hooks/useNearViewport.ts` — lazy occupancy (±200px)
- `booking.css` — токены и стили

## Bootstrap и URL

- **`useBookingBootstrap`** — `createWidgetApi({ alias: "les" }).getConfig()` в фоне. Лоадер только если шагу нужен `config` (`STEP_DATA_NEEDS`).
- **Deep link (query)** — источник правды прогресса:
  - `?bk_step=category`
  - `?bk_step=object&bk_cat=homes|banya`
  - `?bk_step=setup&bk_cat=homes&bk_room=…&bk_in=YYYY-MM-DD&bk_out=YYYY-MM-DD`
  - `?bk_step=setup&bk_cat=banya&bk_room=…&bk_date=YYYY-MM-DD&bk_from=HH:mm&bk_to=HH:mm`
- При загрузке setup-ссылки проверяются объект, даты/слот и занятость; при невалидности — откат на category/object + toast.
- Гости / qty товаров в URL не пишутся (только локальный flow-state).

## Потенциальные проблемы (не блокер MVP)

- [ ] Узкие экраны (≤360px): заголовок может наезжать на «Шаг N из 5»

## Следующий выпуск (фичи)

- [ ] Корзина в хедере
- [ ] Авторизация / «Войти» в хедере

## TODO — открыто

Сделано: шаги 1–3 + checkout (extras/мультикорзина временно пропущен: setup → checkout).

### P0 — чинить отдельно (см. обсуждение)

- [x] Deep-link/hydrate: после validate слота прокидывать `slotDuration`/`slotPrice` в flow
- [x] `canProceed`: не пускать Далее при `basePrice <= 0` (пустой API ≠ бесплатно)
- [ ] Доп. гости: `min(EXTRA_GUEST_HARD_LIMIT, maxGuests − guestCount)` + админские max qty

### Остальное (P1/P2)

- [ ] **Прод-блокер админки:** выставить корректные лимиты (max qty) для товаров «доп. гость» по объектам; убрать хардкод `EXTRA_GUEST_HARD_LIMIT`
- [ ] Стейл breakdown при debounce (350ms): сразу loading / clear calc при смене гостей
- [ ] Явная ошибка / не монтировать setup без дат или слота (не silent early-return)
- [ ] `slotPrice` fallback только при надёжных условиях; не открывать Next на угаданной цене
- [ ] Доп. гость по флагу/типу из конфига, не только по имени
- [ ] Итого доп. товаров — UI-only; на checkout серверный total
- [ ] Выровнять семантику пустых `roomIds` / `dailyRoomIds` в `groupProducts`
- [ ] Тесты: hydrate без slot meta; total=0 без fallback блокирует Next; clamp extras к вместимости
- [ ] Локальные копии `calendar/services` вместо re-export из stepper — см. ниже
- [ ] Шаг `extras` (мультикорзина / cross-sell) между setup и checkout
- [x] Шаг `checkout` (контакт + saveRoomBooking / dailySave)
- [ ] При новых данных экрана — дописать `STEP_DATA_NEEDS`

## Почему `calendar/services` ↔ stepper — риск

`src/widgets/booking/calendar/services.ts` сейчас **не содержит своей логики** — только реэкспорт из `src/widgets/stepper/...` (`dailyOccupiedService`, `availabilityService`, `slotsService`, константы рабочего дня).

Чем это плохо для MVP-изоляции:

1. **Тихая поломка booking при правках stepper.** Любой рефактор/смена сигнатуры в старом виджете ломает booking без явного диффа в `booking/`.
2. **Нельзя безопасно удалить stepper.** Пока booking зависит от этих модулей, stepper нельзя выкинуть даже после полной замены UI.
3. **Смешение контрактов.** Stepper может начать тащить UI-специфику или другие зависимости — они протекут в booking через re-export.

Что делать позже: скопировать нужные функции в `booking/calendar/` (или тонкие локальные обёртки над API), покрыть тестами, убрать импорты из `stepper/`. Пока не трогаем — только зафиксированный долг.
