import { describe, expect, it } from "vitest";
import { formatDailyRangeLabel } from "./DailyRangeCalendar";
import {
  applyRangeDayClick,
  draftToSelectedRange,
  hasOccupiedNightsBetween,
  isCompleteRange,
} from "./rangeLogic";
import { countNights, rangeHasOccupiedNights } from "./services";

describe("formatDailyRangeLabel", () => {
  it("formats same month compactly", () => {
    expect(formatDailyRangeLabel("2026-09-10", "2026-09-12")).toMatch(
      /10\s*—\s*12/
    );
  });

  it("formats across months", () => {
    const label = formatDailyRangeLabel("2026-09-28", "2026-10-02");
    expect(label).toContain("—");
    expect(label.toLowerCase()).toMatch(/сентябр|октябр/);
  });
});

describe("countNights / rangeHasOccupiedNights", () => {
  it("counts nights between check-in and check-out", () => {
    expect(countNights("2026-09-10", "2026-09-12")).toBe(2);
    expect(countNights("2026-09-10", "2026-09-11")).toBe(1);
    expect(countNights("2026-09-10", "2026-09-10")).toBe(0);
  });

  it("detects occupied nights inside range", () => {
    const occupied = new Set(["2026-09-11"]);
    expect(
      rangeHasOccupiedNights("2026-09-10", "2026-09-12", occupied)
    ).toBe(true);
    expect(
      rangeHasOccupiedNights("2026-09-12", "2026-09-14", occupied)
    ).toBe(false);
  });
});

describe("applyRangeDayClick", () => {
  it("starts a new range on first click", () => {
    expect(
      applyRangeDayClick({ start: null, end: null }, "2026-09-10", new Set())
    ).toEqual({
      draft: { start: "2026-09-10", end: null },
      rangeError: null,
    });
  });

  it("completes range on second click", () => {
    expect(
      applyRangeDayClick(
        { start: "2026-09-10", end: null },
        "2026-09-12",
        new Set()
      )
    ).toEqual({
      draft: { start: "2026-09-10", end: "2026-09-12" },
      rangeError: null,
    });
  });

  it("swaps ends when second click is before start", () => {
    expect(
      applyRangeDayClick(
        { start: "2026-09-12", end: null },
        "2026-09-10",
        new Set()
      ).draft
    ).toEqual({ start: "2026-09-10", end: "2026-09-12" });
  });

  it("restarts range from last click when occupied night is inside", () => {
    const result = applyRangeDayClick(
      { start: "2026-09-10", end: null },
      "2026-09-13",
      new Set(["2026-09-11"])
    );
    expect(result.draft).toEqual({ start: "2026-09-13", end: null });
    expect(result.rangeError).toBeNull();
  });

  it("rejects range shorter than minNights", () => {
    const result = applyRangeDayClick(
      { start: "2026-09-10", end: null },
      "2026-09-11",
      new Set(),
      { minNights: 2 }
    );
    expect(result.draft).toEqual({ start: "2026-09-11", end: null });
    expect(result.rangeError).toMatch(/Минимум 2/);
  });

  it("rejects range longer than maxNights", () => {
    const result = applyRangeDayClick(
      { start: "2026-09-10", end: null },
      "2026-09-20",
      new Set(),
      { maxNights: 3 }
    );
    expect(result.draft).toEqual({ start: "2026-09-20", end: null });
    expect(result.rangeError).toMatch(/Максимум 3/);
  });

  it("resets when clicking after a completed range", () => {
    expect(
      applyRangeDayClick(
        { start: "2026-09-10", end: "2026-09-12" },
        "2026-09-20",
        new Set()
      )
    ).toEqual({
      draft: { start: "2026-09-20", end: null },
      rangeError: null,
    });
  });
});

describe("draftToSelectedRange / isCompleteRange", () => {
  it("returns null until both ends are set", () => {
    expect(
      draftToSelectedRange({ start: "2026-09-10", end: null }, new Set())
    ).toBeNull();
  });

  it("returns range when valid", () => {
    expect(
      draftToSelectedRange(
        { start: "2026-09-10", end: "2026-09-12" },
        new Set()
      )
    ).toEqual({
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
      nights: 2,
    });
  });

  it("returns null on occupied conflict", () => {
    expect(
      draftToSelectedRange(
        { start: "2026-09-10", end: "2026-09-12" },
        new Set(["2026-09-11"])
      )
    ).toBeNull();
  });

  it("treats check-out night as free", () => {
    expect(
      hasOccupiedNightsBetween(
        "2026-09-10",
        "2026-09-12",
        new Set(["2026-09-12"])
      )
    ).toBe(false);
  });

  it("isCompleteRange mirrors draftToSelectedRange", () => {
    expect(
      isCompleteRange({ start: "2026-09-10", end: "2026-09-12" }, new Set())
    ).toBe(true);
    expect(
      isCompleteRange({ start: "2026-09-10", end: null }, new Set())
    ).toBe(false);
  });
});
