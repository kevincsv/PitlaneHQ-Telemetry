// The light landing of https://pitlanehq.app/ (web/dist/landing.html): what a visitor sees on "/" without the whole web
// app. It opens the web app of this working copy as a visitor (web/dist served in place of pitlanehq.app, its server
// answering the rest), in English, Spanish and Portuguese, and keeps what the landing needs: the <html> and <body>
// attributes, the header and the sign-in panel of each language. The server (cloud/src/landing.js) fills in the rest
// when it serves "/": index.html's <head>, its styles and <noscript>, and pitwall-tour.js, so they never fall behind.
// Run it again when the header or the sign-in panel change: node tools/landing-build.js (needs Playwright).
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const DIST = path.join(__dirname, "..", "web", "dist");
const SITE = "https://pitlanehq.app";

async function grab(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem("pw.lang", JSON.stringify(l)); } catch (e) {} }, lang);
  // the working copy's files in place of the server's; its API (sign-in state, leagues) from the server itself
  await ctx.route(SITE + "/**", (route) => {
    const u = new URL(route.request().url()), f = u.pathname === "/" ? "index.html" : u.pathname.slice(1);
    const file = path.join(DIST, f);
    if (route.request().method() === "GET" && /^[\w./-]+$/.test(f) && !f.includes("..") && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    return route.continue();
  });
  const p = await ctx.newPage();
  await p.goto(SITE + "/", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("#tour .tr-auth .me-auth", { timeout: 60000 });
  const r = await p.evaluate(() => {
    const attrs = (el) => [...el.attributes].filter((a) => a.name !== "lang").map((a) => ` ${a.name}="${a.value.replace(/"/g, "&quot;").replace(/\btour-on\b/, "").trim()}"`).join("");
    const auth = document.querySelector("#tour .tr-auth .me-auth").cloneNode(true);
    auth.querySelectorAll("input").forEach((i) => { i.value = ""; i.removeAttribute("value"); });
    // the page's frame: the header (without the tour's buttons, which it draws again) and the "me" view, empty
    const wrap = document.querySelector("#v-me").closest(".wrap").cloneNode(true);
    wrap.querySelectorAll(".tr-nav, #tour, nav.tabs, script").forEach((x) => x.remove());
    for (const kid of [...wrap.children]) if (!kid.matches("header.top, #donBar, #v-me")) kid.remove();
    const db = wrap.querySelector("#donBar"); if (db) { db.innerHTML = ""; db.hidden = true; db.removeAttribute("data-lang"); }
    wrap.querySelectorAll("header.top > :not(.brand):not(.version-badge)").forEach((x) => x.remove());
    const vb = wrap.querySelector(".version-badge"); if (vb) { vb.removeAttribute("title"); vb.textContent = "VERSION"; }
    const drop = (n) => { for (const c of [...n.childNodes]) { if (c.nodeType === 8 || (c.nodeType === 3 && !c.textContent.trim())) c.remove(); else if (c.nodeType === 1) drop(c); } };
    drop(wrap);
    const vme = wrap.querySelector("#v-me"); for (const kid of [...vme.children]) if (kid.id !== "meBody") kid.remove();
    vme.querySelector("#meBody").innerHTML = "<!--AUTH-->";
    return { html: attrs(document.documentElement), body: attrs(document.body), wrap: wrap.outerHTML.replace(">VERSION<", "><!--VERSION--><"), auth: auth.outerHTML };
  });
  await ctx.close();
  return r;
}

(async () => {
  const browser = await chromium.launch();
  const got = {};
  for (const l of ["en", "es", "pt"]) got[l] = await grab(browser, l);
  await browser.close();
  const en = got.en;
  const out = `<html lang="en"${en.html}>
<!-- The light landing of "/" (tools/landing-build.js). The server (cloud/src/landing.js) puts index.html's head, styles and
     noscript, pitwall-landing.js and pitwall-tour.js, where the markers are. -->
<!--INDEX-HEAD-->
<body${en.body}>
<!--INDEX-NOSCRIPT-->
${en.wrap}
${["en", "es", "pt"].map((l) => `<template id="lpAuth-${l}">${got[l].auth}</template>`).join("\n")}
<script><!--LANDING-JS--></script>
<script><!--TOUR-JS--></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(DIST, "landing.html"), out);
  console.log("web/dist/landing.html", out.length, "bytes");
})();
