import { describe, expect, it, vi, beforeEach } from "vitest";
import { BOOKING_SESSION_STORAGE_KEY } from "../constants";
import {
  clearBookingSession,
  readBookingSession,
  writeBookingSession,
} from "./session.storage";

describe("booking session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns defaults when empty", () => {
    const session = readBookingSession();
    expect(session.stepId).toBe("category");
    expect(session.categoryId).toBeNull();
    expect(session.version).toBe(1);
  });

  it("merges patch and persists", () => {
    writeBookingSession({ stepId: "object", categoryId: "homes" });
    const raw = sessionStorage.getItem(BOOKING_SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const session = readBookingSession();
    expect(session.stepId).toBe("object");
    expect(session.categoryId).toBe("homes");
  });

  it("falls back on corrupt json", () => {
    sessionStorage.setItem(BOOKING_SESSION_STORAGE_KEY, "{not-json");
    const session = readBookingSession();
    expect(session.stepId).toBe("category");
  });

  it("clears storage", () => {
    writeBookingSession({ stepId: "object", categoryId: "banya" });
    clearBookingSession();
    expect(sessionStorage.getItem(BOOKING_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("ignores unknown stepId", () => {
    sessionStorage.setItem(
      BOOKING_SESSION_STORAGE_KEY,
      JSON.stringify({ version: 1, stepId: "nope", categoryId: "homes" })
    );
    expect(readBookingSession().stepId).toBe("category");
  });
});
