import { describe, expect, it } from "vitest";
import {
  bookingIndexFreshCheckSource,
  prepareBookingIndexHtml,
  stripRuntimeCrossOrigin,
  stripSameOriginCrossorigin,
} from "./indexHtml";

const built = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <script type="module" crossorigin src="/assets/index-CsCfgzPx.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-Df79dxTK.css">
    <meta name="bk-build" content="2026-11-21T08:05:59.398Z" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

describe("stripSameOriginCrossorigin", () => {
  it("drops crossorigin from the page script and stylesheet", () => {
    const html = stripSameOriginCrossorigin(built);
    expect(html).toContain('src="/assets/index-CsCfgzPx.js"');
    expect(html).toContain('href="/assets/index-Df79dxTK.css"');
    expect(html).not.toMatch(/<(script|link)\b[^>]*\scrossorigin/i);
  });

  it("leaves an image tag alone", () => {
    const html = stripSameOriginCrossorigin(
      '<img crossorigin src="/assets/cert-abc.jpg">'
    );
    expect(html).toContain("<img crossorigin");
  });
});

describe("prepareBookingIndexHtml", () => {
  it("checks the published build before the module and keeps asset names", () => {
    const html = prepareBookingIndexHtml(built);
    const metaAt = html.indexOf('name="bk-build"');
    const checkAt = html.indexOf("bk-fresh-check");
    const moduleAt = html.indexOf('<script type="module"');
    expect(metaAt).toBeGreaterThan(-1);
    expect(checkAt).toBeGreaterThan(metaAt);
    expect(moduleAt).toBeGreaterThan(checkAt);
    expect(html).toContain("<script>(function () {");
    expect(html).toContain('src="/assets/index-CsCfgzPx.js"');
    expect(html).toContain('href="/assets/index-Df79dxTK.css"');
    expect(html).not.toMatch(/<(script|link)\b[^>]*\scrossorigin/i);
    expect(html).not.toMatch(/cache-control/i);
  });

  it("keeps a bare certificate flag when it asks for a fresh page", () => {
    const source = bookingIndexFreshCheckSource();
    expect(source).toContain('cache: "no-store"');
    expect(source).toContain("version.json");
    expect(source).toContain('value === "" ? key');
    expect(source).toContain("Не удалось открыть виджет");
    expect(source).not.toContain("assets/");
  });
});

describe("stripRuntimeCrossOrigin", () => {
  it("drops the CORS flag Vite adds when it preloads the script", () => {
    const source =
      'j.rel=re?"stylesheet":Of,re||(j.as="script"),j.crossOrigin="",j.href=X';
    expect(stripRuntimeCrossOrigin(source)).toBe(
      'j.rel=re?"stylesheet":Of,re||(j.as="script"),j.href=X'
    );
  });
});
