// Where the drivers come from (the admin page's Analytics; migration 0089): the pure part, so cloud/test/sources.test.mjs
// runs it without the server.
//
// A visit is counted once per browser session by the landing, the web app and the public pages (POST /community/visit
// {ref, page, us, um, uc}: document.referrer, the path, utm_source/utm_medium/utm_campaign or ?ref=). The server keeps
// only the site it came from as a short name (google, reddit, discord…, "direct" without one), the country Cloudflare
// gives and the page, added into one row per day, source, country and page. The first visit of a browser is also kept on
// it (localStorage) and goes with the sign-up, so every new account says where it came from.

export const SRC_RE = /^[a-z0-9._-]{1,40}$/;
export const PAGE_RE = /^[a-z0-9/_-]{1,60}$/;

// the sites that matter, by their address (the end of the host); the first that fits names it
const SITES = [
  [/(^|\.)google\.[a-z.]+$/, "google"], [/(^|\.)bing\.com$/, "bing"], [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)yahoo\.[a-z.]+$/, "yahoo"], [/(^|\.)yandex\.[a-z.]+$/, "yandex"], [/(^|\.)baidu\.com$/, "baidu"],
  [/(^|\.)ecosia\.org$/, "ecosia"], [/(^|\.)search\.brave\.com$/, "brave"], [/(^|\.)qwant\.com$/, "qwant"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "chatgpt"], [/(^|\.)perplexity\.ai$/, "perplexity"], [/(^|\.)claude\.ai$/, "claude"],
  [/(^|\.)gemini\.google\.com$/, "gemini"], [/(^|\.)copilot\.microsoft\.com$/, "copilot"],
  [/(^|\.)(reddit\.com|redd\.it)$/, "reddit"], [/(^|\.)(discord\.com|discordapp\.com|discord\.gg)$/, "discord"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"], [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"], [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)twitch\.tv$/, "twitch"], [/(^|\.)(iracing\.com)$/, "iracing"], [/(^|\.)(steamcommunity\.com|steampowered\.com)$/, "steam"],
  [/(^|\.)(overtake\.gg|racedepartment\.com)$/, "overtake"], [/(^|\.)simhubdash\.com$/, "simhub"], [/(^|\.)github\.com$/, "github"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"], [/(^|\.)(t\.me|telegram\.org)$/, "telegram"], [/(^|\.)linkedin\.com$/, "linkedin"],
];
// what kind of place each one is, for the groups of the admin page
export const SRC_KIND = {
  google: "search", bing: "search", duckduckgo: "search", yahoo: "search", yandex: "search", baidu: "search", ecosia: "search", brave: "search", qwant: "search",
  chatgpt: "ai", perplexity: "ai", claude: "ai", gemini: "ai", copilot: "ai",
  reddit: "community", discord: "community", iracing: "community", overtake: "community", steam: "community", simhub: "community", github: "community",
  youtube: "social", facebook: "social", instagram: "social", x: "social", tiktok: "social", twitch: "social", whatsapp: "social", telegram: "social", linkedin: "social",
  direct: "direct", invite: "community", msstore: "store",
};
export const kindOf = (src) => SRC_KIND[src] || (/-app$/.test(src) ? "app" : src === "unknown" ? "unknown" : "other");

// the hosts that are Pitlane HQ itself: moving from one of its pages to another is not a new visit from somewhere
const SELF = /(^|\.)pitlanehq\.app$|^localhost$|^127\.0\.0\.1$/;

const cleanSrc = (s) => String(s == null ? "" : s).toLowerCase().trim().replace(/^www\./, "").replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** The short name of a referrer's host (google, reddit…), the host itself for any other site, "" for Pitlane HQ's own. */
export function siteOf(ref) {
  let host = "";
  const s = String(ref == null ? "" : ref).trim();
  if (!s) return "direct";
  // Android's apps pass themselves as android-app://com.google.android.gm
  const app = /^android-app:\/\/([a-z0-9._]+)/i.exec(s);
  if (app) {
    const id = app[1].toLowerCase();
    if (id === "com.google.android.googlequicksearchbox") return "google";
    if (id === "com.reddit.frontpage") return "reddit";
    if (id === "com.discord") return "discord";
    if (id === "com.google.android.gm") return "gmail";
    return cleanSrc("app-" + id.split(".").pop());
  }
  try { host = new URL(s).hostname.toLowerCase(); } catch { return "direct"; }
  if (!host) return "direct";
  if (SELF.test(host)) return "";
  for (const [re, name] of SITES) if (re.test(host)) return name;
  if (/(^|\.)mail\.google\.com$/.test(host)) return "gmail";
  return cleanSrc(host.replace(/^(m|l|lm|old|new|mobile)\./, "")) || "direct";
}

/** The page a visit landed on: "landing" for the home page, "app" for the web app, the path of any other page. */
export function pageOf(p) {
  let s = String(p == null ? "" : p).toLowerCase().split(/[?#]/)[0].replace(/\/+$/, "");
  if (!s || s === "/" || s === "/index.html") return "landing";
  if (s === "/app" || s.startsWith("/app/")) return "app";
  s = s.replace(/^\/+/, "").replace(/[^a-z0-9/_-]+/g, "-").slice(0, 60);
  return PAGE_RE.test(s) ? s : "other";
}

/** A visit or a sign-up's first visit as the server keeps it: {src, page, campaign}. A campaign tag (utm_source or ?ref=)
 *  wins over the referrer, so links we post say where they were posted. src "" means it came from Pitlane HQ itself. */
export function visitOf(b) {
  if (!b || typeof b !== "object") return { src: "direct", page: "landing", campaign: "" };
  const tag = cleanSrc(b.us);
  const campaign = cleanSrc(b.uc).slice(0, 40);
  // a tag is a short name (utm_source=reddit) or a site's address (utm_source=reddit.com, which reads as reddit)
  const src = tag ? (SRC_KIND[tag] ? tag : SITES.some(([re]) => re.test(tag)) ? siteOf("https://" + tag + "/") : tag) : siteOf(b.ref);
  // "Invite a friend" (?ref=invite-<the inviter's account id>): one source, "invite", and who sent it
  const inv = /^invite-([0-9a-z]{8,32})$/.exec(src);
  if (inv) return { src: "invite", page: pageOf(b.page), campaign, inviter: inv[1] };
  return { src: src === "" || SRC_RE.test(src) ? src : "direct", page: pageOf(b.page), campaign };
}

/** The country Cloudflare gives (two letters), "XX" when it gives none or Tor's "T1". */
export const countryOf = (cf) => {
  const c = String((cf && cf.country) || "").toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== "T1" ? c : "XX";
};

/** Where an account made without a first visit came from: the app it was made in (pc-app, android-app, ios-app), from
 *  X-Pitlane-Client, or "unknown". */
export function appSrc(client) {
  const k = String(client || "").trim().toLowerCase().split("/")[0];
  return k === "pc" || k === "desktop" ? "pc-app" : k === "android" || k === "ios" ? k + "-app" : "unknown";
}

/** Where a download of the installer came from (downloads.js): the first visit of the browser that downloaded it, which
 *  the site's download buttons add to the link (fr, fu, fc, fp: VISIT_JS), else the link itself (its utm_source or ?ref=
 *  and the site it was clicked on), as {src, page, campaign}. A download from Pitlane HQ's own pages with nothing more is
 *  "direct". */
export function downloadVisit(q, referer) {
  const g = (k) => (q && q.get(k)) || "";
  const v = q && (q.has("fr") || q.has("fu") || q.has("fp"))
    ? visitOf({ ref: g("fr"), us: g("fu"), uc: g("fc"), page: g("fp") })
    : visitOf({ ref: referer || "", us: g("utm_source") || g("ref"), uc: g("utm_campaign"), page: "dl" });
  return { src: v.src || "direct", page: v.page, campaign: v.campaign };
}

/** The key of a connection's downloads: a hash of its address with the server's own secret, never the address. */
export const dlKey = async (secret, ip) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dl-src|" + (secret || "") + "|" + (ip || "")));
  return [...new Uint8Array(d)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
};
// a download stays matchable for 14 days (the hourly job drops older ones)
export const DL_DAYS = 14;
export const SQL_DL_ADD = "INSERT INTO dl_src (ip, created, src, page, campaign) VALUES (?1,?2,?3,?4,?5)";
export const SQL_DL_FIND = "SELECT src, page FROM dl_src WHERE ip=?1 AND created>?2 ORDER BY created DESC LIMIT 1";

/** Where an account made in an app came from, when the browser's first visit is not there: the installer downloaded
 *  from the same connection in the last DL_DAYS (dl, a row of SQL_DL_FIND), else the Microsoft Store for an agent the
 *  Store installed (X-Pitlane-Install: store), else the app (appSrc). {src, page}. */
export function appSignupSrc(client, install, dl) {
  const app = appSrc(client);
  if (app === "pc-app" && dl && dl.src) return { src: dl.src, page: dl.page || null };
  if (app === "pc-app" && String(install || "").trim().toLowerCase() === "store") return { src: "msstore", page: null };
  return { src: app, page: null };
}

/** A browser that says it is a robot: never counted. */
export const isBot = (ua) => !ua || /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|curl|wget|python|httpclient|go-http/i.test(ua);

// the statements of the visit route (the test runs them on SQLite too)
export const SQL_VISIT_ADD = "INSERT INTO visits_days (day, src, country, page, n) VALUES (?1,?2,?3,?4,1) ON CONFLICT(day, src, country, page) DO UPDATE SET n=MIN(visits_days.n+1, 1000000)";
export const SQL_ACCOUNT_SRC = "UPDATE accounts SET src=?2, src_page=?3, country=?4 WHERE id=?1 AND src IS NULL";

/** Where the drivers come from, from the grouped rows of the period and the one before: the visits per source, per
 *  country and per page, and the accounts made per source and country (pure, so the test can run it). */
export function sourcesOf(visits, prevVisits, signups, prevSignups) {
  const sum = (rows, key) => {
    const m = new Map();
    for (const r of rows) m.set(r[key], (m.get(r[key]) || 0) + (r.n || 0));
    return m;
  };
  const vSrc = sum(visits, "src"), vCountry = sum(visits, "country"), vPage = sum(visits, "page"), pSrc = sum(prevVisits, "src");
  const sSrc = new Map(), sCountry = new Map();
  for (const a of signups) {
    const s = a.src || "unknown", c = a.country || "XX";
    sSrc.set(s, (sSrc.get(s) || 0) + 1);
    sCountry.set(c, (sCountry.get(c) || 0) + 1);
  }
  const pAcc = new Map();
  for (const a of prevSignups) { const s = a.src || "unknown"; pAcc.set(s, (pAcc.get(s) || 0) + 1); }
  const srcs = new Set([...vSrc.keys(), ...sSrc.keys()]);
  const total = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  return {
    visits: total(vSrc), prevVisits: total(pSrc), signups: signups.length, prevSignups: prevSignups.length,
    bySource: [...srcs].map((src) => ({ src, kind: kindOf(src), visits: vSrc.get(src) || 0, prevVisits: pSrc.get(src) || 0, signups: sSrc.get(src) || 0, prevSignups: pAcc.get(src) || 0 }))
      .sort((a, b) => b.visits + b.signups * 20 - (a.visits + a.signups * 20)).slice(0, 40),
    byCountry: [...new Set([...vCountry.keys(), ...sCountry.keys()])].map((country) => ({ country, visits: vCountry.get(country) || 0, signups: sCountry.get(country) || 0 }))
      .sort((a, b) => b.visits + b.signups * 20 - (a.visits + a.signups * 20)).slice(0, 40),
    byPage: [...vPage].map(([page, n]) => ({ page, visits: n })).sort((a, b) => b.visits - a.visits).slice(0, 25),
  };
}

/** The few lines every public page and the landing run: once per browser session, where the visit came from goes to
 *  POST /community/visit, and the browser's first visit is kept (pw.src0) for the sign-up. */
export const VISIT_JS = `<script>(function(){try{var q=new URLSearchParams(location.search),v={ref:document.referrer,page:location.pathname,us:q.get("utm_source")||q.get("ref")||"",um:q.get("utm_medium")||"",uc:q.get("utm_campaign")||""};if(!/(^|\\.)pitlanehq\\.app$/.test(location.hostname))return;try{if(!localStorage.getItem("pw.src0"))localStorage.setItem("pw.src0",JSON.stringify(v))}catch(e){}document.addEventListener("click",function(e){try{var a=e.target&&e.target.closest&&e.target.closest('a[href*="PitlaneHQ-Setup.exe"]');if(!a)return;var u=new URL(a.href,location.href);if(!/(^|\\.)pitlanehq\\.app$/.test(u.hostname))return;var f=v;try{f=JSON.parse(localStorage.getItem("pw.src0")||"null")||v}catch(x){}u.searchParams.set("fr",f.ref||"");u.searchParams.set("fu",f.us||"");u.searchParams.set("fc",f.uc||"");u.searchParams.set("fp",f.page||"");a.href=u.href}catch(x){}},true);if(sessionStorage.getItem("pw.v"))return;sessionStorage.setItem("pw.v","1");var b=JSON.stringify(v);if(navigator.sendBeacon)navigator.sendBeacon("/community/visit",new Blob([b],{type:"text/plain"}));else fetch("/community/visit",{method:"POST",body:b,keepalive:true})}catch(e){}})()</script>`;
