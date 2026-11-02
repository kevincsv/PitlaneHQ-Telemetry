// Makes the app's code hard to read where it leaves for people's devices: minifies and mangles every script of web/dist
// (and the scripts inside index.html) in place, without comments, with one copyright line on top. Only the builds run it,
// on their own checkout (cloud.yml before the deploy, windows.yml before the agent embeds web/dist): the repository keeps
// the readable source. pdf.js (pitwall-pdf*.js) is someone else's code under its own licence and stays as it is.
//
//   node tools/protect-web.mjs [web/dist]       (needs `npm ci` in cloud/, which has terser)
//   node tools/protect-web.mjs --file <in.js> <out.js>   one file (the phones' copy of pitwall-analysis.js)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { minify } = createRequire(path.join(here, "../cloud/package.json"))("terser");

const YEAR = new Date().getUTCFullYear();
const BANNER = `/*! Pitlane HQ (c) ${YEAR} Pitlane HQ. All rights reserved. Copying, modifying or reusing this code is not allowed. https://pitlanehq.app/terms */`;
const SKIP = /^(pitwall-pdf|pitwall-games\.js$)/;

// globals stay as they are (the page's onclick="…" and the other files call them by name); everything inside is renamed
const OPTS = { ecma: 2020, compress: { passes: 2 }, mangle: true, format: { comments: false } };

export async function protectJs(src, name) {
  const out = await minify(src, { ...OPTS, module: false });
  let code = out.code;
  // the phones keep a downloaded pitwall-analysis.js only when it says which shape it gives (AnalysisJs: "VERSION = n")
  const v = /\bconst\s+VERSION\s*=\s*(\d+)\b/.exec(src);
  const extra = name === "pitwall-analysis.js" && v ? ` /* PW_ANALYSIS VERSION = ${v[1]} */` : "";
  return BANNER + extra + "\n" + code + "\n";
}

async function protectHtml(html) {
  const parts = [];
  let last = 0;
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  for (let m; (m = re.exec(html)); ) {
    const attrs = m[1] || "";
    const body = m[2];
    if (/\bsrc\s*=/.test(attrs) || /\btype\s*=\s*["']?(?!text\/javascript)/i.test(attrs) || !body.trim()) continue;
    const out = await minify(body, { ...OPTS, module: false });
    parts.push(html.slice(last, m.index), `<script${attrs}>`, out.code.replace(/<\/script/gi, "<\\/script"), "</script>");
    last = m.index + m[0].length;
  }
  parts.push(html.slice(last));
  return parts.join("").replace(/<!--(?!\[if)[\s\S]*?-->/g, "");
}

async function main(argv) {
  if (argv[0] === "--file") {
    const [, inp, out] = argv;
    fs.writeFileSync(out, await protectJs(fs.readFileSync(inp, "utf8"), path.basename(inp)));
    return;
  }
  const noHtml = argv[0] === "--no-html";
  if (noHtml) argv = argv.slice(1);
  const dir = path.resolve(argv[0] || path.join(here, "../web/dist"));
  let before = 0, after = 0;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (!fs.statSync(p).isFile() || SKIP.test(f)) continue;
    let src, out;
    if (f.endsWith(".js")) { src = fs.readFileSync(p, "utf8"); out = await protectJs(src, f); }
    else if (f === "index.html" && !noHtml) { src = fs.readFileSync(p, "utf8"); out = await protectHtml(src); }
    else continue;
    fs.writeFileSync(p, out);
    before += src.length; after += out.length;
    console.log(`${f}: ${src.length} -> ${out.length}`);
  }
  console.log(`protect-web: ${before} -> ${after} bytes`);
}

main(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
