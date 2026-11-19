import { describe, expect, it } from "vitest";
import { freshDocumentUrl, planFreshReload } from "./freshBuild";

const href = "http://127.0.0.1:5173/?cert_only";

describe("planFreshReload", () => {
  it("reloads once when the published build is newer", () => {
    const next = planFreshReload({
      localId: "2026-11-19T10:00:00.000Z",
      remoteId: "2026-11-19T12:00:00.000Z",
      href,
      alreadyTried: null,
    });
    expect(next).toBe(
      "http://127.0.0.1:5173/?cert_only&_v=2026-11-19T12%3A00%3A00.000Z"
    );
  });

  it("stays when the page already matches the published build", () => {
    expect(
      planFreshReload({
        localId: "same",
        remoteId: "same",
        href,
        alreadyTried: null,
      })
    ).toBeNull();
  });

  it("does not loop after one attempt", () => {
    expect(
      planFreshReload({
        localId: "old",
        remoteId: "new",
        href: freshDocumentUrl(href, "new") ?? href,
        alreadyTried: "new",
      })
    ).toBeNull();
  });
});
