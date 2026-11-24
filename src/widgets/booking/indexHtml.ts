const FRESH_MARK = "bk-fresh-check";

/**
 * Обычный скрипт в index.html. Он стартует даже если модуль со старым хешем
 * уже не скачивается. Картинки и файлы /assets/ этот скрипт не трогает.
 */
/** Vite помечает подгрузку скрипта как CORS. На iPhone без заголовка сервера такая подгрузка срывает запуск. */
export function stripRuntimeCrossOrigin(code: string): string {
  return code.replace(/[A-Za-z$_][\w$]*\.crossOrigin\s*=\s*""\s*[,;]?/g, "");
}

export function bookingIndexFreshCheckSource(): string {
  return `(function () {
  /* ${FRESH_MARK} */
  function showBootError(text) {
    var root = document.getElementById("root");
    if (!root || root.firstElementChild) return;
    root.setAttribute("data-boot-error", "1");
    root.textContent = text;
    root.style.cssText = "white-space:pre-wrap;padding:16px;color:#1c1c1c;background:#fff;font:16px/1.45 -apple-system,sans-serif";
  }
  window.addEventListener("error", function (event) {
    var msg = (event && event.message) || "Ошибка";
    if (event && event.filename) msg += "\\n" + event.filename;
    showBootError("Не удалось открыть виджет\\n" + msg);
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason;
    var msg = (reason && (reason.stack || reason.message)) || String(reason || "Ошибка");
    showBootError("Не удалось открыть виджет\\n" + msg);
  });
  setTimeout(function () {
    var root = document.getElementById("root");
    if (root && !root.getAttribute("data-boot-error") && !root.firstChild) {
      showBootError("Не удалось открыть виджет\\nСкрипт страницы не запустился");
    }
  }, 4000);
  var meta = document.querySelector('meta[name="bk-build"]');
  var localId = meta && (meta.getAttribute("content") || "").trim();
  if (!localId) return;
  var guard = "bk-build-reload";
  var versionUrl = new URL("version.json", document.baseURI);
  versionUrl.searchParams.set("t", String(Date.now()));
  fetch(versionUrl.href, { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      var remoteId = data && typeof data.id === "string" ? data.id.trim() : "";
      if (!remoteId || remoteId === localId) return;
      var current = new URL(location.href);
      if (current.searchParams.get("_v") === remoteId) return;
      var tried = null;
      try { tried = sessionStorage.getItem(guard); } catch (e) { return; }
      if (tried === remoteId) return;
      try { sessionStorage.setItem(guard, remoteId); } catch (e) { return; }
      current.searchParams.set("_v", remoteId);
      var parts = [];
      current.searchParams.forEach(function (value, key) {
        parts.push(value === "" ? key : key + "=" + encodeURIComponent(value));
      });
      var search = parts.length ? "?" + parts.join("&") : "";
      location.replace(current.origin + current.pathname + search + current.hash);
    })
    .catch(function () {});
})();`;
}

/** Свой домен не нуждается в CORS-режиме. На iPhone он ломает повторную загрузку модуля. */
export function stripSameOriginCrossorigin(html: string): string {
  return html.replace(/<(script|link)\b[^>]*>/gi, (tag) =>
    tag.replace(/\s+crossorigin(?:="[^"]*")?/gi, "")
  );
}

/** Готовый index.html: без crossorigin и с проверкой сборки до модуля. */
export function prepareBookingIndexHtml(html: string): string {
  const stripped = stripSameOriginCrossorigin(html);
  if (stripped.includes(FRESH_MARK)) return stripped;
  const metaMatch = stripped.match(/[ \t]*<meta name="bk-build"[^>]*>\r?\n?/i);
  let body = stripped;
  let meta = "";
  if (metaMatch && metaMatch.index != null) {
    meta = metaMatch[0].trimStart();
    if (!meta.endsWith("\n")) meta += "\n    ";
    body =
      stripped.slice(0, metaMatch.index) +
      stripped.slice(metaMatch.index + metaMatch[0].length);
  }
  const inline = `<script>${bookingIndexFreshCheckSource()}</script>\n    `;
  const moduleAt = body.search(/<script type="module"/i);
  const injection = `${meta}${inline}`;
  if (moduleAt === -1) return `${body}${injection}`;
  return `${body.slice(0, moduleAt)}${injection}${body.slice(moduleAt)}`;
}
