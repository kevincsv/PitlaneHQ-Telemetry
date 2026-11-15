// Downloads and release notes served from our own storage (an R2 bucket, binding DL): the
// Windows build and the phone apps are uploaded there by the build workflows, with version.json
// (PC) and phones.json (apps) beside them and the changelogs. Nothing points at GitHub.
//   /dl/<file>            a file (PitlaneHQ-Setup.exe, PitlaneHQ-windows.zip, the APK, the IPA…)
//   /dl/version.json      the PC version, build and minimum version (the updater reads it)
//   /dl/phones.json       the phone apps' version and files
//   /dl/beta/<file>       the same files of the test builds (testers and admins), promoted to /dl/ once they pass
//   /downloads            the downloads page
//   /changelog[/phones]   the release notes, one anchor per version (#062-beta)
import { VISIT_JS, isBot, downloadVisit, dlKey, SQL_DL_ADD } from "./sourceslib.js";
import { pcCount } from "./pcstats.js";
const H = { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "referrer-policy": "no-referrer", vary: "Accept-Language" }; // English or Spanish by the browser's language
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const TYPES = { exe: "application/vnd.microsoft.portable-executable", zip: "application/zip", apk: "application/vnd.android.package-archive", aab: "application/octet-stream", ipa: "application/octet-stream", json: "application/json; charset=utf-8", md: "text/markdown; charset=utf-8" };

// the Microsoft Store listing (apps.microsoft.com/detail/<Store ID>): "Coming soon" until it is set, the same address as
// MS_STORE in web/dist/index.html and pitwall-tour.js
export const MS_STORE = "https://apps.microsoft.com/detail/9P3642QCS9ZG";

export async function downloads(req, env, url) {
  const p = url.pathname;
  if (!env.DL) return new Response(JSON.stringify({ error: "downloads are not set up on this server (R2 bucket DL)" }), { status: 404, headers: { "content-type": "application/json" } });
  if (p.startsWith("/dl/")) {
    // /dl/beta/<file>: the test builds testers' PCs and phones take before everyone (windows.yml and the phone builds
    // with channel "beta"); the downloads page never lists them
    const key = decodeURIComponent(p.slice(4));
    const beta = key.startsWith("beta/"), name = beta ? key.slice(5) : key;
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(name)) return new Response("not found", { status: 404 });
    const o = await env.DL.get(key);
    if (!o) return new Response("not found", { status: 404 });
    if (name === "version.json") return pcVersion(await o.text());
    // the installer downloaded (not a resumed piece of it): one install for the admin Analytics (pcstats.js)
    // and where it came from, for an account the agent makes from the same connection (sourceslib.js appSignupSrc)
    if (name === "PitlaneHQ-Setup.exe" && req.method === "GET" && !isBot(req.headers.get("user-agent")) && !/^bytes=[1-9]/.test(req.headers.get("range") || "")) {
      await pcCount(env, "download", beta ? "beta" : "");
      const v = downloadVisit(url.searchParams, req.headers.get("referer"));
      await env.DB.prepare(SQL_DL_ADD).bind(await dlKey(env.DATA_KEY, req.headers.get("cf-connecting-ip")), Date.now(), v.src, v.page, v.campaign).run().catch(() => {});
    }
    const ext = name.split(".").pop().toLowerCase();
    const h = new Headers({ "content-type": TYPES[ext] || "application/octet-stream", "cache-control": ext === "json" || ext === "md" ? "no-cache" : "public, max-age=300", "x-content-type-options": "nosniff", "access-control-allow-origin": "*" });
    if (o.httpEtag) h.set("etag", o.httpEtag);
    if (!["json", "md"].includes(ext)) h.set("content-disposition", `attachment; filename="${name}"`);
    h.set("content-length", String(o.size));
    return new Response(o.body, { headers: h });
  }
  const read = async (n) => { const o = await env.DL.get(n); return o ? o.text() : null; };
  const json = async (n) => { try { return JSON.parse((await read(n)) || "null"); } catch (e) { return null; } };
  const es = (req.headers.get("accept-language") || "").toLowerCase().startsWith("es");
  if (p === "/downloads/" || p === "/changelog/") return Response.redirect("https://pitlanehq.app" + p.slice(0, -1), 301); // one address per page
  if (p === "/downloads") {
    const pc = (await json("version.json")) || {}, ph = (await json("phones.json")) || {};
    const t = (en, s) => (es ? s : en);
    const row = (title, sub, file) => `<a class="c" href="/dl/${esc(file)}"><b>${esc(title)}</b><span>${esc(sub)}</span></a>`;
    const body = `<h1>${t("Download Pitlane HQ", "Descargar Pitlane HQ")}</h1><p>${t("Free. One account for the PC, the web and the phone apps.", "Gratis. Una cuenta para el PC, la web y las apps de móvil.")}</p>
<h2>Windows ${pc.version ? `<small>v${esc(pc.version)} beta</small>` : ""}</h2><div class="g">
${row(t("Pitlane HQ for Windows", "Pitlane HQ para Windows"), t("Records your laps and uploads them so you can analyse them", "Graba tus vueltas y las sube para que las analices"), "PitlaneHQ-Setup.exe")}${MS_STORE ? `<a class="c" href="${esc(MS_STORE)}" rel="noopener"><b>Microsoft Store</b><span>${t("The same app, updated by the Store", "La misma app, actualizada por la Store")}</span></a>` : `<div class="c off"><b>Microsoft Store</b><span>${t("Coming soon", "Próximamente")}</span></div>`}<div class="c off"><b>Steam</b><span>${t("Coming soon", "Próximamente")}</span></div></div>
<h2>${t("Phones", "Móviles")} ${ph.version ? `<small>v${esc(String(ph.version).replace(/^v/, "").replace(/-?beta$/i, ""))} beta</small>` : ""}</h2><div class="g">
${ph.apk ? row("Android", t("App (APK). Google Play soon", "App (APK). Pronto en Google Play"), ph.apk) : ""}<div class="c off"><b>iPhone</b><span>${t("Coming to the App Store", "Pronto en la App Store")}</span></div></div>
<p class="n"><a href="/changelog">${t("What changed in each version", "Qué cambió en cada versión")}</a> · <a href="${es ? "/es/precios" : "/pricing"}">${t("Pricing", "Precios")}</a> · <a href="/">${t("Open the web app", "Abrir la app web")}</a></p>`;
    return new Response(page(body, { lang: es ? "es" : "en", ld: dlLd(pc) }), { headers: H });
  }
  if (p === "/changelog" || p === "/changelog/phones") {
    // the short notes for people (web/dist/whats-new.json), the same ones the apps show
    let vs = [];
    try { vs = (await (await env.ASSETS.fetch(new Request(new URL("/whats-new.json", url.origin)))).json()).versions || []; } catch (e) { /* none yet */ }
    const l = es ? "es" : "en";
    const body = `<h1>${es ? "Novedades" : "What's new"}</h1>` + vs.map((x) => `<h2 id="${esc(String(x.v).replace(/\./g, ""))}-beta">${esc(x.v)} <small>${esc(x.date || "")}</small></h2><ul>${(x[l] || x.en || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`).join("");
    return new Response(page(body + `<p class="n"><a href="/downloads">${es ? "Descargas" : "Downloads"}</a> · <a href="/">${es ? "Abrir la app" : "Open the app"}</a></p>`,
      { lang: es ? "es" : "en", path: p, title: "What's new in Pitlane HQ · Changelog", desc: "What changed in each version of Pitlane HQ, the iRacing and Le Mans Ultimate telemetry app for Windows, the web and Android." }), { headers: H });
  }
  return new Response("not found", { status: 404 });
}

/** A small Markdown subset: headings (with an anchor like the app's links use: "## 0.6.2 beta" → #062-beta), bold, lists, paragraphs. */
function renderMd(md) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
  let out = "", list = false, para = [];
  const flush = () => { if (para.length) { out += `<p>${inline(para.join(" "))}</p>`; para = []; } if (list) { out += "</ul>"; list = false; } };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { flush(); const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/beta$/, "-beta"); out += `<h${h[1].length} id="${id}">${inline(h[2])}</h${h[1].length}>`; continue; }
    if (/^\s*-\s+/.test(line)) { if (para.length) { out += `<p>${inline(para.join(" "))}</p>`; para = []; } if (!list) { out += "<ul>"; list = true; } out += `<li>${inline(line.replace(/^\s*-\s+/, ""))}</li>`; continue; }
    if (/^\s+\S/.test(line) && list) { out = out.replace(/<\/li>$/, " " + inline(line.trim()) + "</li>"); continue; }
    if (!line.trim()) { flush(); continue; }
    para.push(line.trim());
  }
  flush();
  return out;
}

// each page names itself (its own canonical address), never another one
// the head every robot reads: title, description, canonical, Open Graph and Twitter cards, and the JSON-LD of the page
const DL_TITLE = "Download Pitlane HQ · iRacing and LMU telemetry for Windows";
const DL_DESC = "Download Pitlane HQ Agent for Windows, here or on the Microsoft Store, to record your iRacing and Le Mans Ultimate laps, and the Android app. Free.";
function head(o) {
  const title = esc(o.title || DL_TITLE), desc = esc(o.desc || DL_DESC), url = "https://pitlanehq.app" + (o.path || "/downloads");
  const ld = o.ld ? `<script type="application/ld+json">${JSON.stringify(o.ld).replace(/</g, "\\u003c")}</script>` : "";
  return `<title>${title}</title><meta name="description" content="${desc}"><link rel="canonical" href="${url}"><meta name="robots" content="index,follow,max-image-preview:large">`
    + `<meta property="og:type" content="website"><meta property="og:site_name" content="Pitlane HQ"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${url}">`
    + `<meta property="og:image" content="https://pitlanehq.app/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`
    + `<meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${desc}"><meta name="twitter:image" content="https://pitlanehq.app/og.png">${ld}`;
}
// the app on the downloads page, with the version the PCs have now (version.json)
export const dlLd = (pc) => ({ "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": "https://pitlanehq.app/#app", name: "Pitlane HQ",
  alternateName: ["PitlaneHQ", "Pitlane HQ Agent"], url: "https://pitlanehq.app/", applicationCategory: "SportsApplication", applicationSubCategory: "Sim racing telemetry",
  operatingSystem: "Windows, Android, Web", ...(pc && pc.version ? { softwareVersion: String(pc.version).replace(/^v/, "") } : {}),
  downloadUrl: "https://pitlanehq.app/downloads", installUrl: MS_STORE, sameAs: [MS_STORE], isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, image: "https://pitlanehq.app/og.png", publisher: { "@type": "Organization", name: "Pitlane HQ", url: "https://pitlanehq.app/" } });
const page = (body, o = {}) => `<!doctype html><html lang="${o.lang || "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head(o)}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/logo.svg" type="image/svg+xml">
<style>body{margin:0;background:#11151b;color:#e7ebf1;font:16px/1.55 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:28px 16px 48px}h1{font-size:26px;letter-spacing:.04em;text-transform:uppercase;margin:0 0 6px}h2{font-size:18px;margin:26px 0 10px;letter-spacing:.03em}h2 small{color:#8a97a9;font-weight:600;font-size:12px;margin-left:8px}
h3{font-size:14px;color:#ffb02e;margin:18px 0 4px}p{color:#a9b4c3;margin:6px 0}ul{padding-left:20px;color:#c9d2de}li{margin:4px 0}code{background:#19202a;padding:1px 5px;border-radius:4px;font-size:13px}a{color:#ffb02e}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.c{display:grid;gap:3px;padding:14px;border:1px solid #2b3542;border-radius:12px;background:#19202a;text-decoration:none;color:#e7ebf1}.c:hover{border-color:#ffb02e}.c span{color:#8a97a9;font-size:13px}.n{margin-top:26px;font-size:14px}
.top{display:flex;align-items:center;gap:10px;margin-bottom:18px}.top b{font-size:15px;letter-spacing:.06em}.top img{width:28px;height:28px;border-radius:7px}.c.off{border-style:dashed;background:transparent}</style></head><body>
<main><div class="top"><img src="/icon-192.png" alt=""><b>PITLANE HQ</b></div>${body}</main>${VISIT_JS}</body></html>`;

// PC_MIN: the oldest PitlaneHQ.exe the server still lets run, whatever version.json says. A PC older than the "min" it
// reads updates as soon as the car is not on the track and its update notice has no "later" (update.go), so raising
// this makes every older PC update without a new Windows build. Kept equal to appMinVersion in main.go.
export const PC_MIN = "0.10.0";
const vparts = (v) => String(v || "0").replace(/^v/, "").split("+")[0].split(".").map((x) => parseInt(x, 10) || 0);
export function versionLess(a, b) {
  const x = vparts(a), y = vparts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  return false;
}
// version.json as the updater reads it, its "min" never below PC_MIN
export function pcVersion(text) {
  let body = text;
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && versionLess(v.min, PC_MIN)) body = JSON.stringify({ ...v, min: PC_MIN });
  } catch (e) {}
  return new Response(body, { headers: { "content-type": TYPES.json, "cache-control": "no-cache", "x-content-type-options": "nosniff", "access-control-allow-origin": "*" } });
}

// latestBuild: the Windows build's commit in version.json, read from the bucket at most once a minute per isolate:
// the server tells it to every PC (X-Pitlane-Build on the account's answers) so a PC behind checks for its update
// at once instead of at its next look
let buildCache = { at: 0, build: "" };
export async function latestBuild(env) {
  const now = Date.now();
  if (now - buildCache.at < 60e3) return buildCache.build;
  buildCache.at = now;
  try {
    const o = env.DL && (await env.DL.get("version.json"));
    const v = o ? JSON.parse(await o.text()) : null;
    buildCache.build = v && typeof v.build === "string" ? v.build : "";
  } catch (e) { buildCache.build = ""; }
  return buildCache.build;
}
