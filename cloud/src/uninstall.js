// What a driver says when they uninstall Pitlane HQ from their PC: the uninstaller (installer/PitlaneHQ.iss) opens
// /uninstalled?v=<version>&lang=<es|en|pt> in the browser once the files are gone, never in a silent uninstall.
//
// GET  /uninstalled            the page: why they uninstalled (any of the reasons), an optional text box and Send
// POST /community/feedback/uninstall/shown {v}  sent once by the page's own script (not again when it is reloaded,
//   never by a link checker that does not run it): one uninstall in the admin Analytics (pc_days, pcstats.js)
// POST /community/feedback/uninstall (anyone, no sign-in)  {reasons: ["bugs", …], text, v}
//   kept as a feedback answer of kind "uninstall" (`feedback`, the reason codes in `style`), emailed to support@ and
//   posted in the Discord feedback forum like the others. With no account, it is counted per network and day (a hash
//   that changes every day, never the address), 3 a day each and 200 a day in all.
import { isBot } from "./sourceslib.js";
import { FEEDBACK_MAX } from "./usagelib.js";
import { pcCount } from "./pcstats.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const UNINSTALL_PER_DAY = 3, UNINSTALL_ALL_DAY = 200;

// the reasons, in the order the page shows them; the admin page, the email and Discord read the English names
export const REASONS = {
  game: { en: "It does not work with my game", es: "No funciona con mi juego", pt: "Não funciona com o meu jogo" },
  bugs: { en: "Bugs or crashes", es: "Errores o cierres", pt: "Erros ou travamentos" },
  slow: { en: "It slows down my PC or my game", es: "Hace ir lento mi PC o mi juego", pt: "Deixa meu PC ou meu jogo lento" },
  missing: { en: "It is missing something I need", es: "Le falta algo que necesito", pt: "Falta algo de que eu preciso" },
  hard: { en: "Hard to use", es: "Difícil de usar", pt: "Difícil de usar" },
  other_app: { en: "I use another app", es: "Uso otra app", pt: "Uso outro app" },
  little: { en: "I do not race enough", es: "No corro lo suficiente", pt: "Não corro o suficiente" },
  reinstall: { en: "I am going to install it again", es: "Lo voy a volver a instalar", pt: "Vou instalar de novo" },
  other: { en: "Something else", es: "Otra cosa", pt: "Outra coisa" },
};

const TXT = {
  en: { title: "Why did you uninstall Pitlane HQ?", more: "Anything else you want to tell us", send: "Send", thanks: "Thank you. We read every answer.", pick: "Choose a reason or write something first.", fail: "It could not be sent. Try again in a minute.", again: "Download Pitlane HQ" },
  es: { title: "¿Por qué has desinstalado Pitlane HQ?", more: "Algo más que quieras contarnos", send: "Enviar", thanks: "Gracias. Leemos todas las respuestas.", pick: "Elige un motivo o escribe algo primero.", fail: "No se pudo enviar. Prueba otra vez en un minuto.", again: "Descargar Pitlane HQ" },
  pt: { title: "Por que você desinstalou o Pitlane HQ?", more: "Algo mais que queira nos contar", send: "Enviar", thanks: "Obrigado. Lemos todas as respostas.", pick: "Escolha um motivo ou escreva algo primeiro.", fail: "Não foi possível enviar. Tente de novo em um minuto.", again: "Baixar o Pitlane HQ" },
};

/** The page's language: ?lang= (the uninstaller's), else the browser's, else English (no German). */
export function uninstallLang(req, url) {
  const q = (url.searchParams.get("lang") || "").slice(0, 2).toLowerCase();
  if (TXT[q]) return q;
  for (const part of (req.headers.get("accept-language") || "").toLowerCase().split(",")) { const l = part.trim().slice(0, 2); if (TXT[l]) return l; }
  return "en";
}

const cleanV = (v) => String(v == null ? "" : v).replace(/[^0-9a-z.+-]/gi, "").slice(0, 20);

/** The answer as the page sends it, or {error}: the known reasons (each once, in the page's order), the text, the version. */
export function cleanUninstall(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const got = Array.isArray(b.reasons) ? b.reasons.map((x) => String(x)) : [];
  const reasons = Object.keys(REASONS).filter((k) => got.includes(k));
  const text = String(b.text == null ? "" : b.text).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (text.length > FEEDBACK_MAX) return { error: "too long (" + FEEDBACK_MAX + " characters at most)" };
  if (!reasons.length && !text) return { error: "choose a reason or write something first" };
  // what the admin page, the email and Discord show: the reasons on the first line, then what they wrote
  const said = [reasons.map((k) => REASONS[k].en).join(" · "), text].filter(Boolean).join("\n\n");
  return { reasons, text: said, rating: null, kind: "uninstall", style: reasons.join(",").slice(0, 100) || null, device: "pc", v: cleanV(b.v), view: "uninstall" };
}

/** The page the uninstaller opens. */
export function uninstallPage(l, v) {
  const t = TXT[l] || TXT.en;
  const chips = Object.entries(REASONS).map(([k, n]) => `<label class="c"><input type="checkbox" value="${k}"><span>${esc(n[l] || n.en)}</span></label>`).join("");
  return `<!doctype html><html lang="${l === "pt" ? "pt-BR" : l}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(t.title)} · Pitlane HQ</title><link rel="icon" href="/favicon.ico" sizes="any">
<style>*{box-sizing:border-box}body{margin:0;background:#0d1116;color:#e7ebf1;font:16px/1.5 system-ui,sans-serif}main{max-width:640px;margin:0 auto;padding:28px 16px 48px}h1{font-size:24px;margin:0 0 18px}.top{display:flex;align-items:center;gap:10px;margin-bottom:22px}.top b{font-size:15px;letter-spacing:.06em}.top img{width:28px;height:28px;border-radius:7px}
.cs{display:flex;flex-wrap:wrap;gap:8px}.c{cursor:pointer}.c input{position:absolute;opacity:0;pointer-events:none}.c span{display:inline-block;padding:9px 14px;border-radius:999px;background:#151c25;border:1px solid #263140;color:#c9d2de;font-size:14px}.c input:checked+span{background:#2a2112;border-color:#ffb02e;color:#ffb02e}.c input:focus-visible+span{outline:2px solid #ffb02e;outline-offset:2px}
textarea{width:100%;min-height:110px;margin-top:16px;padding:12px;border-radius:12px;border:1px solid #263140;background:#151c25;color:#e7ebf1;font:inherit;resize:vertical}textarea:focus{outline:none;border-color:#ffb02e}
button{margin-top:14px;padding:11px 22px;border:0;border-radius:10px;background:#ffb02e;color:#0d1116;font:600 15px system-ui,sans-serif;cursor:pointer}button:disabled{opacity:.6;cursor:default}#e{color:#ff7a6b;font-size:14px;min-height:20px;margin:10px 0 0}#ok{font-size:18px}a{color:#ffb02e}.m{color:#8a97a9;font-size:14px;margin-top:22px}</style>
<main><div class="top"><img src="/icon-192.png" alt=""><b>PITLANE HQ</b></div>
<form id="f"><h1>${esc(t.title)}</h1><div class="cs">${chips}</div><textarea id="t" maxlength="${FEEDBACK_MAX}" placeholder="${esc(t.more)}"></textarea><button id="s" type="submit">${esc(t.send)}</button><p id="e" role="alert"></p></form>
<div id="done" hidden><p id="ok">${esc(t.thanks)}</p><p class="m"><a href="/downloads">${esc(t.again)}</a></p></div></main>
<script>(()=>{const f=document.getElementById("f"),e=document.getElementById("e"),s=document.getElementById("s"),V=${JSON.stringify(cleanV(v))};
try{if(!sessionStorage.getItem("pwUn")){sessionStorage.setItem("pwUn","1");fetch("/community/feedback/uninstall/shown",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({v:V}),keepalive:true}).catch(()=>{})}}catch(x){}
f.onsubmit=async(ev)=>{ev.preventDefault();const reasons=[...f.querySelectorAll("input:checked")].map(x=>x.value),text=document.getElementById("t").value.trim();
if(!reasons.length&&!text){e.textContent=${JSON.stringify(t.pick)};return}e.textContent="";s.disabled=true;
try{const r=await fetch("/community/feedback/uninstall",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reasons,text,v:V})});if(!r.ok)throw 0;f.hidden=true;document.getElementById("done").hidden=false}
catch(x){e.textContent=${JSON.stringify(t.fail)};s.disabled=false}}})()</script></html>`;
}

async function netKey(req, now) {
  const raw = "uninstall|" + new Date(now).toISOString().slice(0, 10) + "|" + (req.headers.get("cf-connecting-ip") || "");
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)));
  return "uninstall:" + [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** GET /uninstalled, POST /community/feedback/uninstall and …/shown, or null for any other address. `send` emails the answer
 *  (email.js sendFeedback) and `discord` posts it (discord.js discordFeedback): the worker passes them, the test its own. */
export async function uninstallRoute(req, env, url, { send = async () => false, discord = async () => 0 } = {}) {
  const p = url.pathname.replace(/\/+$/, "");
  if (p === "/uninstalled" && req.method === "GET") {
    return new Response(uninstallPage(uninstallLang(req, url), url.searchParams.get("v")), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", vary: "Accept-Language" } });
  }
  if (p === "/community/feedback/uninstall/shown" && req.method === "POST") {
    // counted for the admin Analytics (pcstats.js): one uninstall, by the version removed
    let b = null;
    try { b = JSON.parse((await req.text()).slice(0, 500)); } catch { b = null; }
    if (!isBot(req.headers.get("user-agent"))) await pcCount(env, "uninstall", cleanV(b && b.v));
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  if (p !== "/community/feedback/uninstall" || req.method !== "POST") return null;
  if (isBot(req.headers.get("user-agent"))) return json({ ok: true });
  let b = null;
  try { b = JSON.parse((await req.text()).slice(0, 20000)); } catch { b = null; }
  const f = cleanUninstall(b);
  if (f.error) return json({ error: f.error }, 400);
  const now = Date.now(), who = await netKey(req, now);
  const c = await env.DB.prepare("SELECT SUM(account_id=?1) AS mine, COUNT(*) AS n FROM feedback WHERE kind='uninstall' AND created>?2").bind(who, now - 86400e3).first();
  if (c && (c.mine >= UNINSTALL_PER_DAY || c.n >= UNINSTALL_ALL_DAY)) return json({ error: "thank you, that is enough for today" }, 429);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO feedback (id, account_id, created, device, v, rating, text, view, kind, style) VALUES (?1,?2,?3,?4,?5,NULL,?6,?7,?8,?9)").bind(id, who, now, f.device, f.v, f.text, f.view, f.kind, f.style).run();
  const mailed = await send(env, { ...f, nick: "", accountId: "" }).catch(() => false);
  if ((await discord(env, f).catch(() => 0)) > 0) await env.DB.prepare("UPDATE feedback SET discord_at=?2 WHERE id=?1").bind(id, now).run().catch(() => {});
  return json({ ok: true, mailed });
}
