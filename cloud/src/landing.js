// The light landing of https://pitlanehq.app/: what a visitor sees on "/" without downloading the whole web app (about
// 2 MB). web/dist/landing.html (tools/landing-build.js) holds the frame of the page and the sign-in panel in the three
// languages; the server puts in index.html's head (title, description, JSON-LD), all its styles and its <noscript>
// links, pitwall-landing.js and pitwall-tour.js, so the landing always matches the app it opens. Someone signed in is
// sent to the app (/app) by a short script before anything shows. Any address of "/" with the app's own parameters
// (a sign-in coming back, a league, ?embed) is the app, as before.
import { VISIT_JS } from "./sourceslib.js";

// the parameters a link to the landing may carry (campaigns, referrals): anything else is for the app
const LANDING_Q = /^(utm_[a-z]+|ref|fbclid|gclid|msclkid)$/;
export const isLanding = (url) => url.pathname === "/" && [...url.searchParams.keys()].every((k) => LANDING_Q.test(k));

// someone already signed in on this browser (the app keeps the account in pw.sec.account), or an address with a
// #section: the app, at once
const TO_APP = `<script>try{if(localStorage.getItem("pw.sec.account")||location.hash.length>1){document.documentElement.style.visibility="hidden";location.replace("/app"+location.search+location.hash)}}catch(e){}</script>`;

/** The landing page made from the app's files, or null when one of them is missing. */
export function makeLanding(index, tpl, landingJs, tourJs) {
  const h = index.indexOf("</head>"), at = index.indexOf("<html"), gt = index.indexOf(">", at);
  if (h < 0 || at < 0 || !tpl.startsWith("<html")) return null;
  // the head as the app has it, with every style of the app's body after its own (the same order, so the same look)
  const body = index.slice(h);
  const styles = (body.match(/<style\b[^>]*>[\s\S]*?<\/style>/g) || []).join("\n");
  const head = index.slice(gt + 1, h) + "\n" + styles + "\n" + TO_APP + "\n</head>";
  const ns = (body.match(/<noscript>[\s\S]*?<\/noscript>/) || [""])[0];
  const htmlTag = tpl.slice(0, tpl.indexOf(">") + 1), rest = tpl.slice(htmlTag.length);
  // the version the app shows in its header (WEB_VERSION and APP_STAGE in index.html)
  const ver = (index.match(/WEB_VERSION="([^"]+)"/) || [])[1] || "", stage = (index.match(/APP_STAGE="([^"]*)"/) || [])[1] || "";
  const safe = (js) => js.replace(/<\/script/gi, "<\\/script");
  return "<!doctype html>\n" + htmlTag + rest.replace("<!--INDEX-HEAD-->", () => head).replace("<!--INDEX-NOSCRIPT-->", () => ns).replace("<!--VERSION-->", () => (ver ? "v" + ver + (stage ? " " + stage : "") : ""))
    .replace("<!--LANDING-JS-->", () => safe(landingJs)).replace("<!--TOUR-JS-->", () => safe(tourJs)).replace("</body>", () => VISIT_JS + "\n</body>");
}

let MEMO = { key: "", html: null, tag: "" };
/** GET "/" for a visitor: the light landing, or null to serve the app as before. */
export async function landingPage(env, req, url) {
  if (!env.ASSETS) return null;
  const get = (p) => env.ASSETS.fetch(new Request(new URL(p, url.origin), { method: "GET" }));
  const rs = await Promise.all(["/", "/landing", "/pitwall-landing.js", "/pitwall-tour.js"].map(get));
  if (rs.some((r) => !r.ok)) return null;
  const key = rs.map((r) => r.headers.get("etag") || "").join("|");
  if (MEMO.key !== key || !MEMO.html || key === "|||") {
    const [index, tpl, lj, tj] = await Promise.all(rs.map((r) => r.text()));
    const html = makeLanding(index, tpl, lj, tj);
    const d = html ? new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html))) : [];
    MEMO = { key, html, tag: '"l' + [...d.slice(0, 8)].map((x) => x.toString(16).padStart(2, "0")).join("") + '"' };
  } else rs.forEach((r) => r.body && r.body.cancel().catch(() => {}));
  if (!MEMO.html) return null;
  const h = { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", etag: MEMO.tag, "referrer-policy": "no-referrer", "x-frame-options": "DENY", "x-content-type-options": "nosniff" };
  const inm = req.headers.get("if-none-match");
  if (inm && inm.split(/\s*,\s*/).includes(MEMO.tag)) return new Response(null, { status: 304, headers: h });
  return new Response(req.method === "HEAD" ? null : MEMO.html, { headers: h });
}
