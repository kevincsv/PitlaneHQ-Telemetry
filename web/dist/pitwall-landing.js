/* The light landing of https://pitlanehq.app/ (landing.html, cloud/src/landing.js): the visitor's page without the whole
   web app. It gives pitwall-tour.js what it reads from the app (COMPANION, LANG, the language window), puts the sign-in
   panel of the page's language in place, and hands every step that needs the app to it at /app: a click or a tap in the
   sign-in panel opens the app with that same field or button (pw.landAuth, read by pitwall-tour.js there). Someone
   already signed in never sees it: the server's script in the head sends them to /app first. */
var COMPANION = true, LANDING = true;
var store = { get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
// the app's own choice (index.html): English, Spanish or Portuguese, English until one is picked
var LANG = (function () { var v = store.get("pw.lang", "en"); return v === "both" ? "es" : /^(en|es|pt)$/.test(v) ? v : "en"; })();
// the donation link (DONATE_URL in index.html), for the bar and the landing's pricing
var DONATE_URL = "https://buy.stripe.com/fZu00beDP64g0fK5LKcwg01";
function donateUrl() { return DONATE_URL; }
var LANGS = [["en", "English", "English"], ["es", "Español", "Spanish"], ["pt", "Português", "Portuguese (Brazil)"]];
(function () {
  var root = document.documentElement;
  root.lang = LANG === "pt" ? "pt-BR" : LANG;
  // the sign-in panel in the page's language (the tour moves it into the hero)
  function putAuth() {
    var t = document.getElementById("lpAuth-" + LANG), me = document.getElementById("meBody");
    if (!t || !me) return;
    var old = document.querySelector(".me-auth"), pn = t.content.firstElementChild.cloneNode(true);
    if (old) old.replaceWith(pn); else me.appendChild(pn);
  }
  putAuth();
  // the language window, as the app shows it the first time and from the header's language button
  window.chooseLanguage = function (first) {
    var m = document.getElementById("langPick");
    if (!m) { m = document.createElement("div"); m.id = "langPick"; m.className = "langpick"; document.body.appendChild(m); }
    m.innerHTML = '<div class="lp-card" role="dialog" aria-modal="true" aria-labelledby="lpT"><div class="lp-brand"><i aria-hidden="true"></i>Pitlane HQ</div>' +
      '<h2 id="lpT">Choose your language · Elige tu idioma · Escolha seu idioma</h2><div class="lp-list">' +
      LANGS.map(function (x) { return '<button type="button" data-lp="' + x[0] + '" aria-pressed="' + (x[0] === LANG && !first) + '"><b>' + x[1] + "</b><small>" + x[2] + "</small></button>"; }).join("") +
      "</div><p>" + (first ? "You can change it later in Settings." : "") + "</p></div>";
    m.hidden = false;
    m.querySelectorAll("[data-lp]").forEach(function (b) {
      b.onclick = function () { LANG = b.dataset.lp; store.set("pw.lang", LANG); m.hidden = true; root.lang = LANG === "pt" ? "pt-BR" : LANG; putAuth(); donBar(); };
    });
    var f = m.querySelector("button"); if (f) f.focus();
  };
  var picked = true; try { picked = localStorage.getItem("pw.lang") != null; } catch (e) {}
  if (!picked) setTimeout(function () { window.chooseLanguage(true); }, 1200);
  // anything in the sign-in panel needs the app: open it on the same field or button
  function toApp(id) { try { sessionStorage.setItem("pw.landAuth", id || "mlE"); } catch (e) {} location.assign("/app"); }
  document.addEventListener("focusin", function (ev) { var i = ev.target.closest && ev.target.closest(".me-auth input"); if (i) { i.blur(); toApp(i.id); } }, true);
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".me-auth button, .me-auth a[href='#']");
    if (b) { ev.preventDefault(); ev.stopPropagation(); toApp(b.id || (b.type === "submit" ? "mlE" : "")); }
  }, true);
  // (the tour's "Create account" buttons press the panel's switch, #meToReg, so they open the app's form too)
  // the donation bar, as the app shows it to everyone who is not a supporter: every day, until Donate or "Not now"
  // (pw.donHide, local midnight); "Send feedback" is the app's feedback window
  function donBar() {
    var b = document.getElementById("donBar"); if (!b) return;
    if (Date.now() < store.get("pw.donHide", 0)) { b.hidden = true; return; }
    var T = function (en, es, pt) { return LANG === "es" ? es : LANG === "pt" ? pt : en; };
    var e = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg><p>' +
      e(T("Enjoying Pitlane HQ? If it helps you drive faster, consider a donation to keep it growing.", "¿Te gusta Pitlane HQ? Si te ayuda a ir más rápido, considera hacer una donación para que siga creciendo.", "Está gostando do Pitlane HQ? Se ele ajuda você a andar mais rápido, considere fazer uma doação para ele continuar crescendo.")) +
      '</p><button type="button" class="btn small primary db-go">' + e(T("Donate", "Donar", "Doar")) + '</button><button type="button" class="btn small db-fb">' + e(T("Send feedback", "Enviar tu opinión", "Enviar sua opinião")) +
      '</button><button type="button" class="db-no">' + e(T("Not now", "Ahora no", "Agora não")) + "</button>";
    b.hidden = false;
    var hide = function () { var t = new Date(); t.setHours(24, 0, 0, 0); store.set("pw.donHide", t.getTime()); b.hidden = true; };
    b.querySelector(".db-go").onclick = function () { window.open(DONATE_URL, "_blank", "noopener"); hide(); };
    b.querySelector(".db-fb").onclick = function () { toApp("feedback"); };
    b.querySelector(".db-no").onclick = hide;
  }
  donBar();
  // the app's files, fetched while the visitor reads, so opening it is quick
  function warm() { ["/app", "pitwall-ui-v1.js", "pitwall-my-laps-v2.js", "pitwall-analysis.js"].forEach(function (h) { var l = document.createElement("link"); l.rel = "prefetch"; l.href = h; document.head.appendChild(l); }); }
  addEventListener("load", function () { setTimeout(function () { if (window.requestIdleCallback) requestIdleCallback(warm); else warm(); }, 3000); });
})();
