import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBookingBootstrap } from "./useBookingBootstrap";

describe("useBookingBootstrap", () => {
  it("does not block category while loading", async () => {
    let resolveConfig!: (v: unknown) => void;
    const getConfig = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveConfig = resolve;
        })
    );

    const { result } = renderHook(() =>
      useBookingBootstrap({
        stepId: "category",
        getConfig: getConfig as never,
      })
    );

    expect(result.current.isBlocking).toBe(false);
    expect(result.current.status).toBe("loading");

    resolveConfig({ rooms: [], dailyRooms: [] });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.isBlocking).toBe(false);
  });

  it("blocks object step until config is ready", async () => {
    let resolveConfig!: (v: unknown) => void;
    const getConfig = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveConfig = resolve;
        })
    );

    const { result } = renderHook(() =>
      useBookingBootstrap({
        stepId: "object",
        getConfig: getConfig as never,
      })
    );

    expect(result.current.isBlocking).toBe(true);

    resolveConfig({ rooms: [], dailyRooms: [] });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.isBlocking).toBe(false);
  });
});
