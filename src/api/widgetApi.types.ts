/**
 * Типы для публичного Widget API.
 * Источник: `src/api/widget-api.md`
 *
 * Base URL: https://app.gettime.online/api/widget
 */

export type Guid = string;
export type LocalDate = string; // yyyy-MM-dd
export type LocalTime = string; // HH:mm
export type IsoDateTime = string; // e.g. 2026-03-07T12:00:00Z

export type WidgetMessenger = "whatsapp" | "telegram" | "max" | "sms" | null;

/** Универсальный JSON-объект для полей, не описанных в документации. */
export type UnknownRecord = Record<string, unknown>;

// -----------------------------
// Settings / Config
// -----------------------------

export type WidgetThemeSettingsResponse = {
  defaultTheme: number;
};

export type WidgetCompany = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  whatsApp?: string | null;
  /** Иногда приходит строкой (например лимит MAX), не только числом */
  max?: string | number | null;
  timeZone?: string | null;
  onboarding?: boolean;
  logo?: string | null;
  defaultPhoneCode?: string | null;
  requireLastName?: boolean;
} & UnknownRecord;

/** Блок тарифов по типу дня (будни / предвыходные / выходные) без слотов */
export type WidgetTariffDayPrices = {
  morningPrice: number | null;
  dayPrice: number | null;
  eveningPrice: number | null;
  startTime: LocalTime;
  duration: number;
  minDuration: number;
  minDurationPrice: number | null;
  minDurationPriceEvening: number | null;
  timeChange: LocalTime;
  timeBefore: LocalTime;
} & UnknownRecord;

/** Фиксированный слот из прайса комнаты (weekDaySlots / preWeekEndSlots / weekEndSlots) */
export type WidgetWeekDaySlot = {
  timeFrom: LocalTime;
  timeTo: LocalTime;
  price: number;
  comment: string;
} & UnknownRecord;

export type WidgetRoomPricesInner = {
  weekDays: WidgetTariffDayPrices;
  preWeekEnds: WidgetTariffDayPrices;
  weekEnds: WidgetTariffDayPrices;
  weekDaySlots: WidgetWeekDaySlot[];
  preWeekEndSlots: WidgetWeekDaySlot[];
  weekEndSlots: WidgetWeekDaySlot[];
} & UnknownRecord;

export type WidgetPauseDaySettings = {
  startTime: LocalTime;
  duration: number;
  isActive: boolean;
} & UnknownRecord;

export type WidgetPricePeriodProduct = {
  productId: Guid;
  name: string;
  price: number;
  stockId: Guid;
  stockName: string;
} & UnknownRecord;

/** Период ценообразования комнаты (как в ответе GET /widget/get/{alias}) */
export type WidgetRoomPricePeriod = {
  id: Guid;
  roomId: Guid;
  weekDays: number[];
  workType: number;
  startTime: LocalTime;
  duration: number;
  dateFrom: LocalDate | null;
  dateTo: LocalDate | null;
  prices: WidgetRoomPricesInner;
  includedCapacity: number;
  extraValue: number;
  extraType: number;
  pauseSettings: {
    weekDays: WidgetPauseDaySettings;
    preWeekEnds: WidgetPauseDaySettings;
    weekEnds: WidgetPauseDaySettings;
  };
  isNeedPauseSettings: boolean;
  discounts: number[];
  allowContactDiscount: boolean;
  priceMode: number;
  products: WidgetPricePeriodProduct[];
} & UnknownRecord;

export type WidgetRoom = {
  id: Guid;
  name: string;
  isHalfHour?: boolean;
  dayPrice?: number | null;
  nightPrice?: number | null;
  holidayPrice?: number | null;
  images: string[];
  discountsText?: string[];
  discounts?: number[];
  description?: string | null;
  capacity?: number | null;
  maxCapacity?: number | null;
  durationType?: number;
  minDuration?: number;
  groupName?: string | null;
  pricePeriod?: WidgetRoomPricePeriod | null;
} & UnknownRecord;

/** Комната в блоке programsRooms: та же форма, что rooms, но pricePeriod часто null */
export type WidgetProgramRoom = Omit<WidgetRoom, "pricePeriod"> & {
  pricePeriod: WidgetRoomPricePeriod | null;
};

export type WidgetCancellationPenalty = {
  selfCancellationPeriodHours: number;
  autoDeductPenalty: boolean;
  freeCancellationPeriodHours: number;
  penaltyType: number;
  penaltyAmount: number | null;
  cancellationInfoMessage: string | null;
} & UnknownRecord;

export type WidgetPrepaymentTimeout = {
  roomsTimeoutMinutes: number;
  dailyRoomsTimeoutMinutes: number;
  programsTimeoutMinutes: number;
  commonRoomsTimeoutMinutes: number;
} & UnknownRecord;

/** Настройки виджета из GET /widget/get/{alias} → settings */
export type WidgetSettings = {
  alias: string;
  tenantId: Guid;
  companyName: string;
  needSmsConfirm: boolean;
  needCalculation: boolean;
  sendToEmail: string | null;
  lastStepMessage: string | null;
  confirmMessage: string | null;
  chooseRoomType: number;
  bookingSectionName: string;
  chooseRoomPlaceholder: string;
  hoursBeforeBooking: number;
  commonSectionName: string;
  chooseCommonPlaceholder: string;
  programSectionName: string;
  chooseProgramPlaceholder: string;
  programFieldPlaceholder: string;
  shopSectionName: string;
  shopFieldPlaceholder: string;
  shopAdditionalInformation: string | null;
  hoursBeforePrograms: number;
  personCountMessage: string | null;
  dailySectionName: string;
  chooseDailyPlaceholder: string;
  defaultTheme: number;
  requireLastName: boolean;
  cancellationPenalty: WidgetCancellationPenalty;
  prepaymentTimeout: WidgetPrepaymentTimeout;
  yandexMetrikaId: string | null;
  widgetViewMode: number;
  waitlistEnabled: boolean;
  showAvailabilityColors: boolean;
} & UnknownRecord;

export type WidgetDailyRoomPricePeriod = {
  weekDayPrice: number;
  weekEndPrice: number;
  preWeekEndPrice: number;
  extraGuestWeekDay: number;
  extraGuestWeekEnd: number;
  extraGuestPreWeekEnd: number;
} & UnknownRecord;

export type WidgetDailyRoom = {
  id: Guid;
  name: string;
  description?: string | null;
  images: string[];
  capacity?: number | null;
  maxCapacity?: number | null;
  checkInTime: LocalTime;
  checkOutTime: LocalTime;
  minNights: number;
  maxNights: number | null;
  pricePeriod: WidgetDailyRoomPricePeriod;
} & UnknownRecord;

/** Цена билета внутри слота клубного дня (config) */
export type WidgetCommonEmbeddedSlotPrice = {
  name: string;
  price: number;
  isVip: boolean;
} & UnknownRecord;

/** Слот клубного дня в конфиге (отличается от ответа getCommonSlots) */
export type WidgetCommonEmbeddedSlot = {
  id: Guid;
  name: string;
  timeStart: LocalTime;
  timeEnd: LocalTime;
  capacity: number;
  availableStart: LocalDate;
  availableEnd: LocalDate;
  isPublic: boolean;
  allowContactDiscount: boolean;
  weekDays: number[];
  prices: WidgetCommonEmbeddedSlotPrice[];
  isDisabled: boolean;
} & UnknownRecord;

export type WidgetCommon = {
  id: Guid;
  groupName: string;
  name: string;
  description: string;
  roomOrder: string;
  images: string[];
  slots: WidgetCommonEmbeddedSlot[];
  isPublic: boolean;
} & UnknownRecord;

export type WidgetProgramSimplePrice = {
  price: number;
} & UnknownRecord;

export type WidgetProgramPricesBlock = {
  weekDays: WidgetProgramSimplePrice;
  preWeekEnds: WidgetProgramSimplePrice;
  weekEnds: WidgetProgramSimplePrice;
} & UnknownRecord;

export type WidgetProgramPricePeriod = {
  id: Guid;
  programId: Guid;
  startTime: LocalTime;
  duration: number;
  dateFrom: LocalDate | null;
  dateTo: LocalDate | null;
  prices: WidgetProgramPricesBlock;
  discounts: number[];
  allowContactDiscount: boolean;
  products: WidgetPricePeriodProduct[];
  roomPrices: unknown[];
} & UnknownRecord;

export type WidgetProgram = {
  id: Guid;
  roomIds: Guid[];
  name: string;
  description: string;
  priority: number;
  duration: number;
  maxCapacity: number;
  images: string[];
  programPricePeriod: WidgetProgramPricePeriod;
} & UnknownRecord;

export type WidgetProduct = {
  id: Guid;
  name: string;
  description: string;
  barcode: string | null;
  image: string | null;
  price: number;
  productGroupId: Guid | null;
  isPublic: boolean;
  roomIds: Guid[];
  dailyRoomIds: Guid[];
} & UnknownRecord;

export type WidgetProductGroup = {
  id: Guid;
  name: string;
  image: string | null;
} & UnknownRecord;

export type WidgetChatPushSession = {
  whatsappSessionActive: boolean;
  telegramSessionActive: boolean;
  maxSessionActive: boolean;
  telegramClientActive: boolean;
  tdLibActive: boolean;
} & UnknownRecord;

/** Полный конфиг виджета: GET https://app.gettime.online/api/widget/get/{alias} */
export type WidgetGetResponse = {
  settings: WidgetSettings;
  company: WidgetCompany;
  rooms: WidgetRoom[];
  commons: WidgetCommon[];
  programs: WidgetProgram[];
  programsRooms: WidgetProgramRoom[];
  products: WidgetProduct[];
  productGroups: WidgetProductGroup[];
  productKits: UnknownRecord[];
  certificates: UnknownRecord[];
  isOnlineEnabled: boolean;
  chatPushSession: WidgetChatPushSession;
  dailyRooms: WidgetDailyRoom[];
} & UnknownRecord;

// -----------------------------
// Availability / Timeslots
// -----------------------------

export type RoomTimeslot = {
  time: LocalTime;
  isFree: boolean;
} & UnknownRecord;

export type RoomTimeSlot = {
  timeFrom: LocalTime;
  timeTo: LocalTime;
  duration: number;
  price: number;
  comment?: string | null;
  isAvailable: boolean;
} & UnknownRecord;

export type RoomTimesResponse = {
  discounts: UnknownRecord[];
  times: RoomTimeslot[] | null;
  slots?: RoomTimeSlot[];
  period: UnknownRecord | null;
  prevPeriod: UnknownRecord | null;
  priceMode?: number;
} & UnknownRecord;

export type ProgramTimeslot = {
  from: LocalTime;
  to: LocalTime;
} & UnknownRecord;

export type ProgramTimesResponse = {
  discounts: UnknownRecord[];
  times: ProgramTimeslot[];
} & UnknownRecord;

export type AvailabilityDayData = {
  hasAvailable: boolean;
  hours: boolean[]; // 24 элемента (0-23 часа), true = свободен, false = занят
} & UnknownRecord;

export type AvailabilityResponse = {
  days: Record<string, AvailabilityDayData>; // ключ = дата "YYYY-MM-DD"
} & UnknownRecord;

export type CommonSlotPrice = {
  name: string;
  price: number;
  isVip: boolean;
} & UnknownRecord;

export type CommonSlot = {
  id: Guid;
  name: string;
  time: LocalTime;
  restTickets: number;
  prices: CommonSlotPrice[];
} & UnknownRecord;

// -----------------------------
// Auth
// -----------------------------

export type SendSmsRequest = {
  number: string;
  alias: string;
  messenger: WidgetMessenger;
};

export type SendSmsResponse =
  | { success: true }
  | { success: false; needBotVerification: true; botLink: string };

export type AuthRequest = {
  alias: string;
  phone: string;
  code: string;
};

export type ContactWidgetModel = {
  id: Guid;
  displayName?: string | null;
  phone?: string | null;
  deposit?: number | null;
  discount?: number | null;
} & UnknownRecord;

export type AuthResponse = {
  token: string;
  expiresAt: IsoDateTime;
  contact: ContactWidgetModel;
} & UnknownRecord;

export type UserInfoResponse = ContactWidgetModel & {
  lastVisit?: string | null;
  visitCount?: number;
  discountType?: number;
  isVip?: boolean;
};

export type UserHistoryRequest = {
  phone?: string;
  isShowPast: boolean;
};

export type UserHistoryItem = {
  id: Guid;
  date: LocalDate;
  time: LocalTime;
  duration: number;
  roomName: string;
  status: number;
  price: number;
  timeStartForDuration?: string;
  timeEndForDuration?: string;
} & UnknownRecord;

export type UserHistoryResponse = {
  allBookings: UserHistoryItem[];
} & UnknownRecord;

// -----------------------------
// Promo / Calculate
// -----------------------------

export type CheckPromoCodeRequest = UnknownRecord;
export type CheckPromoCodeResponse = number; // percent, 0 if invalid

export type CalculateRoomRequest = {
  roomId: Guid;
  date: LocalDate;
  time: LocalTime;
  duration: number; // e.g. 2.0
  discounts: number[];
  personCount: number;
  promoCode: string | null;
  contactDiscount: number;
  discountContactType: number;
  manualDiscount: number | null;
} & UnknownRecord;

export type CalculateRoomResponse = UnknownRecord;

export type CalculateProgramRequest = {
  programId: Guid;
} & CalculateRoomRequest;

export type CalculateProgramResponse = UnknownRecord;

// -----------------------------
// Save bookings / tickets / certificates
// -----------------------------

export type SaveProductItem = {
  id: Guid;
  name: string;
  price: number;
  count: number;
} & UnknownRecord;

export type SaveRoomBookingRequest = {
  alias: string;
  date: LocalDate;
  time: LocalTime;
  duration: number;
  name: string;
  lastName?: string;
  email?: string;
  phone: string;
  messenger: WidgetMessenger;
  roomId: Guid;
  promoCode?: string | null;
  discounts?: number[];
  products?: SaveProductItem[];
  personCount: number;
  checkCode?: string;
  comment?: string;
} & UnknownRecord;

export type SaveBookingResponse = {
  bookingId: Guid;
  amount: number;
  paymentLink: string;
  token?: string;
  tokenExpiresAt?: IsoDateTime;
} & UnknownRecord;

export type SaveProgramBookingRequest = {
  programId: Guid;
} & SaveRoomBookingRequest;

export type TicketItem = {
  priceName: string;
  priceAmount: number;
} & UnknownRecord;

export type SaveTicketsRequest = {
  alias: string;
  slotId: Guid;
  date: LocalDate;
  name: string;
  phone: string;
  email?: string;
  messenger: WidgetMessenger;
  promoCode?: string | null;
  checkCode?: string;
  tickets: TicketItem[];
} & UnknownRecord;

export type SaveTicketsResponse = {
  amount: number;
  paymentLink: string;
  token?: string;
  tokenExpiresAt?: IsoDateTime;
} & UnknownRecord;

export type SaveCertificatesRequest = {
  alias: string;
  name: string;
  phone: string;
  messenger: WidgetMessenger;
  email?: string;
  recipientName: string;
  certificates: { id: Guid; count: number }[];
} & UnknownRecord;

export type SaveCertificatesResponse = {
  amount: number;
  paymentLink: string;
} & UnknownRecord;

// -----------------------------
// Pay
// -----------------------------

export type PayWithDepositRequest = {
  bookingId: Guid;
};

export type PayWithDepositResponse =
  | { success: true; paidFully: true; depositUsed: number }
  | {
      success: true;
      paidFully: false;
      depositUsed: number;
      remainingAmount: number;
      paymentLink: string;
    };

export type PaymentLinkResponse = string;

// -----------------------------
// Cancel
// -----------------------------

export type CancelPreviewResponse =
  | {
      canCancel: true;
      hasPenalty: boolean;
      penaltyAmount: number;
      message: string;
      freeCancellationHours: number;
      hoursUntilBooking: number;
      infoMessage: string;
    }
  | { canCancel: false; message: string; infoMessage: string };

export type CancelRequest = {
  confirmed: boolean;
};

export type CancelResponse = {
  success: boolean;
  penaltyAmount?: number;
  refundToDeposit?: number;
} & UnknownRecord;

// -----------------------------
// Daily rooms
// -----------------------------

export type DailyOccupiedResponse = UnknownRecord[];

export type DailyCalculateRequest = {
  roomId: Guid;
  checkInDate: LocalDate;
  checkOutDate: LocalDate;
  personCount: number;
} & UnknownRecord;

export type DailyCalculateResponse = {
  nights: number;
  nightPrices: { date: LocalDate; price: number }[];
  totalPrice: number;
  periodMessage: string | null;
} & UnknownRecord;

export type DailySaveRequest = {
  alias: string;
  dailyRoomId: Guid;
  checkInDate: LocalDate;
  checkOutDate: LocalDate;
  personCount: number;
  name: string;
  lastName?: string;
  phone: string;
  messenger: WidgetMessenger;
  comment?: string;
  promoCode?: string | null;
  checkCode?: string;
  products?: SaveProductItem[];
} & UnknownRecord;

export type DailySaveResponse = SaveBookingResponse;

