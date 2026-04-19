import type {
  AuthRequest,
  AuthResponse,
  AvailabilityResponse,
  CalculateProgramRequest,
  CalculateProgramResponse,
  CalculateRoomRequest,
  CalculateRoomResponse,
  CancelPreviewResponse,
  CancelRequest,
  CancelResponse,
  CheckPromoCodeRequest,
  CheckPromoCodeResponse,
  CommonSlot,
  DailyCalculateRequest,
  DailyCalculateResponse,
  DailyOccupiedResponse,
  DailySaveRequest,
  DailySaveResponse,
  Guid,
  LocalDate,
  PaymentLinkResponse,
  PayWithDepositRequest,
  PayWithDepositResponse,
  ProgramTimesResponse,
  RoomTimesResponse,
  SaveBookingResponse,
  SaveCertificatesRequest,
  SaveCertificatesResponse,
  SaveProgramBookingRequest,
  SaveRoomBookingRequest,
  SaveTicketsRequest,
  SaveTicketsResponse,
  SendSmsRequest,
  SendSmsResponse,
  UserHistoryRequest,
  UserHistoryResponse,
  UserInfoResponse,
  WidgetGetResponse,
  WidgetThemeSettingsResponse,
} from "./widgetApi.types";

export class WidgetApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly body: unknown;

  constructor(args: {
    message: string;
    status: number;
    statusText: string;
    url: string;
    body: unknown;
  }) {
    super(args.message);
    this.name = "WidgetApiError";
    this.status = args.status;
    this.statusText = args.statusText;
    this.url = args.url;
    this.body = args.body;
  }
}

export type WidgetApiClientConfig = {
  /** tenant alias */
  alias: string;
  /** Base URL, по умолчанию: https://app.gettime.online/api/widget */
  baseUrl?: string;
  /** JWT токен (опционально). Можно менять через setToken() */
  token?: string | null;
  /** Кастомный fetch (например, для SSR/тестов). */
  fetcher?: typeof fetch;
};

export type WidgetApiClient = {
  /** Текущий alias */
  readonly alias: string;
  /** Установить/обновить токен */
  setToken: (token: string | null) => void;

  // Settings / config
  getThemeSettings: () => Promise<WidgetThemeSettingsResponse>;
  getConfig: () => Promise<WidgetGetResponse>;

  // Availability / times
  getRoomTimes: (roomId: Guid, date: LocalDate) => Promise<RoomTimesResponse>;
  getProgramTimes: (args: {
    programId: Guid;
    roomId: Guid;
    date: LocalDate;
  }) => Promise<ProgramTimesResponse>;
  getAvailability: (args: {
    roomId: Guid;
    from: LocalDate;
    to: LocalDate;
  }) => Promise<AvailabilityResponse>;
  getAvailabilityProgram: (args: {
    programId: Guid;
    roomId: Guid;
    from: LocalDate;
    to: LocalDate;
  }) => Promise<AvailabilityResponse>;
  getCommonSlots: (commonId: Guid, date: LocalDate) => Promise<CommonSlot[]>;

  // Auth / user
  sendSms: (args: Omit<SendSmsRequest, "alias">) => Promise<SendSmsResponse>;
  auth: (args: Omit<AuthRequest, "alias">) => Promise<AuthResponse>;
  getUserInfo: () => Promise<UserInfoResponse>;
  getUserHistory: (args: UserHistoryRequest) => Promise<UserHistoryResponse>;

  // Promo / price
  checkPromoCode: (args: CheckPromoCodeRequest) => Promise<CheckPromoCodeResponse>;
  calculateRoom: (args: CalculateRoomRequest) => Promise<CalculateRoomResponse>;
  calculateProgram: (
    args: CalculateProgramRequest
  ) => Promise<CalculateProgramResponse>;

  // Save
  saveRoomBooking: (
    args: Omit<SaveRoomBookingRequest, "alias">
  ) => Promise<SaveBookingResponse>;
  saveProgramBooking: (
    args: Omit<SaveProgramBookingRequest, "alias">
  ) => Promise<SaveBookingResponse>;
  saveTickets: (args: Omit<SaveTicketsRequest, "alias">) => Promise<SaveTicketsResponse>;
  saveCertificates: (
    args: Omit<SaveCertificatesRequest, "alias">
  ) => Promise<SaveCertificatesResponse>;

  // Pay
  payWithDeposit: (
    args: PayWithDepositRequest
  ) => Promise<PayWithDepositResponse>;
  getPaymentLink: (bookingId: Guid) => Promise<PaymentLinkResponse>;

  // Cancel
  cancelPreview: (bookingId: Guid) => Promise<CancelPreviewResponse>;
  cancelBooking: (bookingId: Guid, args: CancelRequest) => Promise<CancelResponse>;

  // Daily rooms
  getDailyOccupied: (args: {
    roomId: Guid;
    from: LocalDate;
    to: LocalDate;
  }) => Promise<DailyOccupiedResponse>;
  dailyCalculate: (args: DailyCalculateRequest) => Promise<DailyCalculateResponse>;
  dailySave: (args: Omit<DailySaveRequest, "alias">) => Promise<DailySaveResponse>;
};

function joinUrl(baseUrl: string, path: string) {
  const b = baseUrl.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createWidgetApi(config: WidgetApiClientConfig): WidgetApiClient {
  const baseUrl = config.baseUrl ?? "https://app.gettime.online/api/widget";
  const fetcher = config.fetcher ?? fetch;
  const alias = config.alias;
  let token: string | null = config.token ?? null;

  const request = async <TResponse>(args: {
    method: "GET" | "POST";
    path: string;
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: unknown;
    auth?: "jwt" | "none";
  }): Promise<TResponse> => {
    const url = new URL(joinUrl(baseUrl, args.path));
    if (args.query) {
      for (const [k, v] of Object.entries(args.query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (args.method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    if (args.auth === "jwt" && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetcher(url.toString(), {
      method: args.method,
      headers,
      credentials: "include",
      body: args.method === "POST" ? JSON.stringify(args.body ?? {}) : undefined,
    });

    if (!res.ok) {
      const body = await parseJsonSafe(res);
      throw new WidgetApiError({
        message: `Widget API request failed: ${res.status} ${res.statusText}`,
        status: res.status,
        statusText: res.statusText,
        url: url.toString(),
        body,
      });
    }

    return (await parseJsonSafe(res)) as TResponse;
  };

  return {
    alias,
    setToken(next) {
      token = next;
    },

    // Settings / config
    getThemeSettings() {
      return request<WidgetThemeSettingsResponse>({
        method: "GET",
        path: `/settings/${alias}`,
        auth: "none",
      });
    },

    getConfig() {
      return request<WidgetGetResponse>({
        method: "GET",
        path: `/get/${alias}`,
        auth: "jwt", // JWT опционален; просто добавим если есть
      });
    },

    // Availability / times
    getRoomTimes(roomId, date) {
      return request<RoomTimesResponse>({
        method: "GET",
        path: `/times/${alias}/${roomId}/${date}`,
        auth: "none",
      });
    },

    getProgramTimes({ programId, roomId, date }) {
      return request<ProgramTimesResponse>({
        method: "GET",
        path: `/times-program/${alias}/${programId}/${roomId}/${date}`,
        auth: "none",
      });
    },

    getAvailability({ roomId, from, to }) {
      return request<AvailabilityResponse>({
        method: "GET",
        path: `/availability/${alias}/${roomId}`,
        query: { from, to },
        auth: "none",
      });
    },

    getAvailabilityProgram({ programId, roomId, from, to }) {
      return request<AvailabilityResponse>({
        method: "GET",
        path: `/availability-program/${alias}/${programId}/${roomId}`,
        query: { from, to },
        auth: "none",
      });
    },

    getCommonSlots(commonId, date) {
      return request<CommonSlot[]>({
        method: "GET",
        path: `/slots/${alias}/${commonId}/${date}`,
        auth: "jwt", // VIP цены возможны, JWT опционален
      });
    },

    // Auth / user
    sendSms(args) {
      return request<SendSmsResponse>({
        method: "POST",
        path: `/sendSms`,
        body: { ...args, alias } satisfies SendSmsRequest,
        auth: "none",
      });
    },

    async auth(args) {
      const res = await request<AuthResponse>({
        method: "POST",
        path: `/auth`,
        body: { ...args, alias } satisfies AuthRequest,
        auth: "none",
      });
      // удобство: если получили токен — сохраним
      if (res?.token) token = res.token;
      return res;
    },

    getUserInfo() {
      return request<UserInfoResponse>({
        method: "GET",
        path: `/user/info`,
        auth: "jwt",
      });
    },

    getUserHistory(args) {
      return request<UserHistoryResponse>({
        method: "POST",
        path: `/user/history`,
        body: args,
        auth: "jwt",
      });
    },

    // Promo / price
    checkPromoCode(args) {
      return request<CheckPromoCodeResponse>({
        method: "POST",
        path: `/promo-code/check`,
        body: args,
        auth: "none",
      });
    },

    calculateRoom(args) {
      return request<CalculateRoomResponse>({
        method: "POST",
        path: `/calculate/${alias}`,
        body: args,
        auth: "none",
      });
    },

    calculateProgram(args) {
      return request<CalculateProgramResponse>({
        method: "POST",
        path: `/calculate-program/${alias}`,
        body: args,
        auth: "none",
      });
    },

    // Save
    saveRoomBooking(args) {
      return request<SaveBookingResponse>({
        method: "POST",
        path: `/save`,
        body: { ...args, alias } satisfies SaveRoomBookingRequest,
        auth: "jwt",
      });
    },

    saveProgramBooking(args) {
      return request<SaveBookingResponse>({
        method: "POST",
        path: `/save-program`,
        body: { ...args, alias } satisfies SaveProgramBookingRequest,
        auth: "none",
      });
    },

    saveTickets(args) {
      return request<SaveTicketsResponse>({
        method: "POST",
        path: `/save-tickets`,
        body: { ...args, alias } satisfies SaveTicketsRequest,
        auth: "none",
      });
    },

    saveCertificates(args) {
      return request<SaveCertificatesResponse>({
        method: "POST",
        path: `/save-certificates`,
        body: { ...args, alias } satisfies SaveCertificatesRequest,
        auth: "none",
      });
    },

    // Pay
    payWithDeposit(args) {
      return request<PayWithDepositResponse>({
        method: "POST",
        path: `/pay-with-deposit`,
        body: args,
        auth: "jwt",
      });
    },

    getPaymentLink(bookingId) {
      return request<PaymentLinkResponse>({
        method: "GET",
        path: `/payment-link/${alias}/${bookingId}`,
        auth: "jwt",
      });
    },

    // Cancel
    cancelPreview(bookingId) {
      return request<CancelPreviewResponse>({
        method: "GET",
        path: `/cancel-preview/${alias}/${bookingId}`,
        auth: "jwt",
      });
    },

    cancelBooking(bookingId, args) {
      return request<CancelResponse>({
        method: "POST",
        path: `/cancel/${alias}/${bookingId}`,
        body: args,
        auth: "jwt",
      });
    },

    // Daily rooms
    getDailyOccupied({ roomId, from, to }) {
      return request<DailyOccupiedResponse>({
        method: "GET",
        path: `/daily-occupied/${alias}/${roomId}`,
        query: { from, to },
        auth: "none",
      });
    },

    dailyCalculate(args) {
      return request<DailyCalculateResponse>({
        method: "POST",
        path: `/daily-calculate/${alias}`,
        body: args,
        auth: "none",
      });
    },

    dailySave(args) {
      return request<DailySaveResponse>({
        method: "POST",
        path: `/daily-save`,
        body: { ...args, alias } satisfies DailySaveRequest,
        auth: "none",
      });
    },
  };
}

