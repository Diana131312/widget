import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WidgetApiClient } from "../../../api";
import { useSetupCalculate } from "./useSetupCalculate";

const banyaInput = {
  categoryId: "banya" as const,
  roomId: "b1",
  guestCount: 2,
  checkIn: null,
  checkOut: null,
  banyaDate: "2026-10-07",
  banyaTimeFrom: "12:00",
  banyaTimeTo: "15:00",
  slotDuration: 3,
  slotPrice: 4500,
};

describe("useSetupCalculate", () => {
  it("parses string totals from API (regression: price looked broken)", async () => {
    const calculateRoom = vi.fn().mockResolvedValue({
      total: "4 500",
      basePrice: "4500",
    });
    const api = {
      calculateRoom,
      dailyCalculate: vi.fn(),
    } as unknown as WidgetApiClient;
    const onPriceResolved = vi.fn();

    const { result } = renderHook(() =>
      useSetupCalculate({
        api,
        input: banyaInput,
        onPriceResolved,
      })
    );

    await waitFor(() => {
      expect(result.current.hasCalculation).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.banyaCalc?.total).toBe(4500);
    expect(onPriceResolved).toHaveBeenCalledWith(4500);
    expect(calculateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 3, personCount: 2 })
    );
  });

  it("falls back to slotPrice when API total is empty", async () => {
    const api = {
      calculateRoom: vi.fn().mockResolvedValue({ total: 0 }),
      dailyCalculate: vi.fn(),
    } as unknown as WidgetApiClient;
    const onPriceResolved = vi.fn();

    const { result } = renderHook(() =>
      useSetupCalculate({
        api,
        input: { ...banyaInput, slotPrice: 3200 },
        onPriceResolved,
      })
    );

    await waitFor(() => {
      expect(result.current.hasCalculation).toBe(true);
    });

    expect(result.current.banyaCalc?.total).toBe(3200);
    expect(onPriceResolved).toHaveBeenCalledWith(3200);
  });

  it("errors when API total is empty and no slotPrice (do not unlock Next)", async () => {
    const api = {
      calculateRoom: vi.fn().mockResolvedValue({}),
      dailyCalculate: vi.fn(),
    } as unknown as WidgetApiClient;
    const onPriceResolved = vi.fn();

    const { result } = renderHook(() =>
      useSetupCalculate({
        api,
        input: { ...banyaInput, slotPrice: null },
        onPriceResolved,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toMatch(/пустую стоимость/i);
    });

    expect(result.current.hasCalculation).toBe(false);
    expect(onPriceResolved).not.toHaveBeenCalled();
  });

  it("does not restart calc when onPriceResolved identity changes", async () => {
    const calculateRoom = vi.fn().mockResolvedValue({ total: 4500 });
    const api = {
      calculateRoom,
      dailyCalculate: vi.fn(),
    } as unknown as WidgetApiClient;
    let resolved = 0;

    const { rerender, result } = renderHook(
      ({ onPrice }: { onPrice: (n: number) => void }) =>
        useSetupCalculate({
          api,
          input: banyaInput,
          onPriceResolved: onPrice,
        }),
      {
        initialProps: {
          onPrice: (n: number) => {
            resolved = n;
          },
        },
      }
    );

    await waitFor(() => {
      expect(result.current.hasCalculation).toBe(true);
    });
    expect(calculateRoom).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(4500);

    rerender({
      onPrice: (n: number) => {
        resolved = n + 1;
      },
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(calculateRoom).toHaveBeenCalledTimes(1);
  });

  it("shows friendly network error copy", async () => {
    const api = {
      calculateRoom: vi
        .fn()
        .mockRejectedValue(new TypeError("Failed to fetch")),
      dailyCalculate: vi.fn(),
    } as unknown as WidgetApiClient;

    const { result } = renderHook(() =>
      useSetupCalculate({
        api,
        input: banyaInput,
        onPriceResolved: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(result.current.error).toMatch(/интернет/i);
    });
    expect(result.current.hasCalculation).toBe(false);
  });
});
