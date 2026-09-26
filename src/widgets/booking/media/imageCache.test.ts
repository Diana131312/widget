import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  __resetBookingImageCacheForTests,
  isBookingImageCached,
  preloadBookingImage,
  resolveBookingImageUrls,
} from "./imageCache";

describe("booking imageCache", () => {
  it("resolves http urls as-is", () => {
    expect(
      resolveBookingImageUrls(["https://cdn.example/a.jpg"], null, 800)
    ).toEqual(["https://cdn.example/a.jpg"]);
  });

  it("marks url cached after preload", async () => {
    __resetBookingImageCacheForTests();
    const url = "https://cdn.example/cached.jpg";

    // jsdom Image: simulate load
    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    } as unknown as typeof Image;

    await preloadBookingImage(url);
    expect(isBookingImageCached(url)).toBe(true);

    globalThis.Image = OriginalImage;
  });
});
