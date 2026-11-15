// The light landing of "/" (cloud/src/landing.js, web/dist/landing.html, web/dist/pitwall-landing.js): made from the
// app's own files, it carries index.html's head and noscript, the tour, the sign-in panel in three languages and no app
// script; the app's parameters keep "/" the app.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeLanding, isLanding } from "../src/landing.js";

const D = new URL("../../web/dist/", import.meta.url);
const rd = (f) => readFileSync(new URL(f, D), "utf8");
const index = rd("index.html"), tpl = rd("landing.html"), lj = rd("pitwall-landing.js"), tj = rd("pitwall-tour.js");
const h = makeLanding(index, tpl, lj, tj);
assert.ok(h, "the landing is made");
assert.ok(h.startsWith("<!doctype html>\n<html "), "doctype and html first");
assert.ok(!/<!--(INDEX-HEAD|INDEX-NOSCRIPT|LANDING-JS|TOUR-JS|VERSION)-->/.test(h), "every marker is filled");
const pick = (s, re) => (re.exec(s) || [])[1];
for (const re of [/<title>([^<]+)<\/title>/, /<link rel="canonical" href="([^"]+)">/, /<meta name="description" content="([^"]+)">/])
  assert.equal(pick(h, re), pick(index, re), "the head of index.html: " + re);
assert.equal(pick(h, /<link rel="canonical" href="([^"]+)">/), "https://pitlanehq.app/");
assert.ok(h.includes('<script type="application/ld+json">'), "its JSON-LD");
assert.ok(h.includes(index.match(/<noscript>[\s\S]*?<\/noscript>/)[0]), "its noscript links");
// every style of the app, in the head (the same look), and none of the app's scripts
for (const m of index.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) assert.ok(h.indexOf(m[1]) > 0 && h.indexOf(m[1]) < h.indexOf("</head>"), "a style of the app is missing from the head");
assert.ok(!/<script src=/.test(h), "no script file of the app");
assert.ok(h.length < index.length / 3, `the landing is light (${h.length} of ${index.length})`);
assert.ok(h.includes(tj.slice(0, 200)) && h.includes("var COMPANION = true, LANDING = true"), "the tour and the landing's script");
assert.ok(/pw\.sec\.account[\s\S]*location\.replace\("\/app"/.test(h.slice(0, h.indexOf("</head>"))), "someone signed in goes to /app from the head");
const ver = pick(index, /WEB_VERSION="([^"]+)"/);
assert.ok(h.includes(`>v${ver} beta<`) || h.includes(`>v${ver}<`), "the app's version in the header");
for (const l of ["en", "es", "pt"]) assert.match(h, new RegExp(`<template id="lpAuth-${l}"><div class="panel me-auth">`), "the sign-in panel in " + l);
assert.ok(h.includes('id="mlE"') && h.includes('id="meToReg"'), "the panel's fields and buttons the app opens on");
assert.equal(pick(lj, /DONATE_URL = "([^"]+)"/), pick(index, /DONATE_URL="([^"]+)"/), "the same donation link as the app");
assert.ok(h.includes("/community/visit"), "the visit is counted");
// which "/" is the landing
const u = (s) => new URL("https://pitlanehq.app" + s);
for (const s of ["/", "/?utm_source=reddit&utm_medium=post", "/?ref=abc", "/?gclid=1"]) assert.ok(isLanding(u(s)), s);
for (const s of ["/?steamLogin=1", "/?league=abc", "/?league-post=1", "/?embed=1", "/?companion=1", "/app", "/records"]) assert.ok(!isLanding(u(s)), s);
console.log("landing ok:", h.length, "bytes, the app", index.length);
