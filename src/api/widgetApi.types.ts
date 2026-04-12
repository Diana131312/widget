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

export type WidgetMessenger = "whatsapp" | "telegram" | "max" | null;

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
  timeZone?: string | null;
  onboarding?: boolean;
  logo?: string | null;
  defaultPhoneCode?: string | null;
  requireLastName?: boolean;
} & UnknownRecord;

export type WidgetRoom = {
  id: Guid;
  name: string;
  images: string[];
  description?: string | null;
  capacity?: number | null;
  maxCapacity?: number | null;
  durationType?: number;
  minDuration?: number;
  isHalfHour?: boolean;
  groupName?: string | null;
  pricePeriod?: UnknownRecord | null;
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

export type WidgetGetResponse = {
  settings: UnknownRecord;
  company: WidgetCompany;
  rooms: WidgetRoom[];
  commons: UnknownRecord[];
  programs: UnknownRecord[];
  programsRooms: UnknownRecord[];
  products: UnknownRecord[];
  certificates: UnknownRecord[];
  isOnlineEnabled: boolean;
  chatPushSession: UnknownRecord;
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

export type UserInfoResponse = ContactWidgetModel;

export type UserHistoryRequest = {
  phone: string;
  isShowPast: boolean;
};

export type UserHistoryResponse = UnknownRecord[];

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

