// node tools/og-image.js: renders web/dist/og.png, og-es.png, og-pt.png (1200x630) in the app's current look
const { chromium } = require("playwright");
const path = require("path"), R = path.join(__dirname, ".."), D = R + "/web/dist/", F = R + "/ovfonts/";
const T = {
  en: ["Telemetry, overlays and a coach", "for iRacing and Le Mans Ultimate", "PC · Web · Android · iOS"],
  es: ["Telemetría, overlays y un coach", "para iRacing y Le Mans Ultimate", "PC · Web · Android · iOS"],
  pt: ["Telemetria, overlays e um coach", "para iRacing e Le Mans Ultimate", "PC · Web · Android · iOS"],
};
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [l, t] of Object.entries(T)) {
    const html = `<html><head><style>
@font-face{font-family:B;src:url(file://${F}BarlowCondensed-Bold.ttf)}@font-face{font-family:P;src:url(file://${F}IBMPlexSans-Medium.ttf)}@font-face{font-family:M;src:url(file://${F}JetBrainsMono-Bold.ttf)}
body{margin:0;width:1200px;height:630px;background:radial-gradient(900px 600px at 85% 20%,#1b2430,#0D1116);overflow:hidden;font-family:P;color:#e7ebf1;position:relative}
.l{position:absolute;left:72px;top:118px;width:600px}.lg{display:flex;align-items:center;gap:18px}.lg img{width:88px;height:88px}
h1{font-family:B;font-size:78px;white-space:nowrap;letter-spacing:.02em;margin:0;line-height:1}h1 b{color:#FFB02E}
p{font-size:34px;line-height:1.3;color:#aab4c3;margin:34px 0 0}.d{font-family:B;font-size:26px;letter-spacing:.12em;color:#8a96a8;margin-top:30px;text-transform:uppercase}
.u{font-family:M;font-size:26px;color:#FFB02E;margin-top:26px}
.ph{position:absolute;width:280px;border-radius:30px;border:6px solid #263140;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.a{right:230px;top:80px;transform:rotate(-6deg)}.b{right:40px;top:120px;transform:rotate(5deg)}
.bar{position:absolute;left:0;top:0;bottom:0;width:10px;background:#FFB02E}
</style></head><body><i class="bar"></i><div class="l"><div class="lg"><img src="file://${D}logo.svg"><h1>PITLANE <b>HQ</b></h1></div>
<p>${t[0]}<br>${t[1]}</p><div class="d">${t[2]}</div><div class="u">pitlanehq.app</div></div>
<img class="ph a" src="file://${D}landing/${l}/m-analysis-0.png"><img class="ph b" src="file://${D}landing/${l}/m-live.png"></body></html>`;
    require("fs").writeFileSync(require("os").tmpdir() + "/pitlanehq-og.html", html);
    await p.goto("file://" + require("os").tmpdir() + "/pitlanehq-og.html", { waitUntil: "load" });
    await p.waitForTimeout(300);
    await p.screenshot({ path: D + (l === "en" ? "og.png" : `og-${l}.png`) });
  }
  await b.close();
})();
