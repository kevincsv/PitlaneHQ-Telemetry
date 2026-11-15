// The admin Analytics' Payments (paymentslib.js): who paid, what it unlocked, the totals and the supporters
import assert from "node:assert/strict";
import { paymentsOf, sourceOf } from "../src/paymentslib.js";

const D = 86400e3, now = Date.parse("2026-11-15T15:00:00Z");
assert.deepEqual(sourceOf("stripe:don:cs_1"), { src: "stripe", what: "donation" });
assert.deepEqual(sourceOf("order:9"), { src: "lemon", what: "lifetime" });
const orders = [
  { id: "stripe:don:a", account_id: "acc1", kind: "supporter", status: "on", at: now - 3 * 3600e3, amount: 213, currency: "usd", ref: "pi_a" },
  { id: "stripe:don:b", account_id: "acc1", kind: "supporter", status: "on", at: now - 3600e3, amount: 100, currency: "usd", ref: "pi_b" },
  { id: "stripe:don:c", account_id: "acc2", kind: "supporter", status: "refunded", at: now - 40 * D, amount: 500, currency: "usd" },
  { id: "stripe:don:t", account_id: "adm", kind: "supporter", status: "test", at: now - 14 * D, amount: 129, currency: "usd" },
  { id: "stripe:don:d", account_id: null, email_hash: "h", kind: "supporter", status: "on", at: now - 10 * D, amount: 300, currency: "eur" },
];
const accounts = [
  { id: "acc1", display: "Brez", created: now - 5 * 3600e3, supporter: 1, supporter_src: "stripe", founder: 1 },
  { id: "acc2", display: "Two", created: now - 60 * D, supporter: 1, supporter_src: "stripe", founder: 0 },
  { id: "acc3", display: "Hand", created: now - 30 * D, supporter: 1, supporter_src: "manual", founder: 1 },
];
const r = paymentsOf({ orders, accounts, clicks: [{ account_id: "acc1", day: "2026-11-15", key: "act:donate_bar", n: 1 }], seen: [{ account_id: "acc1", last_seen: now }], min: 3, now });
assert.equal(r.payments.length, 4, "a test is never shown");
assert.equal(r.payments[0].id, "stripe:don:b", "newest first");
assert.deepEqual(r.payments[1].unlocked, ["badge"], "the first donation gives the badge");
assert.deepEqual(r.payments[0].unlocked, ["founder"], "the one that reaches $3 gives the offer");
assert.deepEqual(r.payments[0].via, ["bar"]);
assert.equal(r.payments[1].firstDay, true);
assert.deepEqual(r.totals.all.sort((a, b) => a.currency < b.currency ? -1 : 1), [{ currency: "eur", amount: 300 }, { currency: "usd", amount: 313 }], "refunds left out");
assert.deepEqual(r.totals.d7, [{ currency: "usd", amount: 313 }]);
assert.equal(r.totals.n, 3); assert.equal(r.totals.refunded, 1); assert.equal(r.totals.waiting, 1);
assert.equal(r.totals.supporters, 3); assert.equal(r.totals.founders, 2); assert.equal(r.totals.repeat, 1);
assert.equal(r.months[0].key, "2026-11"); assert.equal(r.months[0].n, 3);
assert.equal(r.weeks[0].key, "2026-11-09"); assert.equal(r.weeks[0].donors, 1);
const s1 = r.supporters.find((s) => s.id === "acc1"), s3 = r.supporters.find((s) => s.id === "acc3");
assert.equal(s1.donations, 2); assert.equal(s1.founderNoFloor, false);
assert.equal(s3.founderNoFloor, true, "a founder by hand, without $3 in donations");
assert.ok(!r.supporters.some((s) => s.id === "adm"));
console.log("payments ok");

// the thank-you email after a donation: the badge, and the founding offer or how to reach it
{
  const { thanksMail, langOf } = await import("../src/email.js");
  const f = { min: 3, off: 50, lifetime: 29.99, months: 2 };
  const a = thanksMail({ l: "en", founder: true, f }), b = thanksMail({ l: "es", founder: false, f }), c = thanksMail({ l: "pt", founder: false, account: false, f });
  assert.match(a.text, /founding supporter\. When Pro arrives with version 1\.0, you keep it at 50% off/);
  assert.match(a.text, /first two months you can get Pro for life for \$29\.99/);
  assert.match(b.text, /suman \$3 o más/); assert.doesNotMatch(b.text, /Además eres/);
  assert.match(c.text, /Quando você criar sua conta/);
  assert.doesNotMatch(a.text + b.text + c.text, /donation bar|barra de/);
  assert.equal(a.link, "https://pitlanehq.app/app");
  assert.equal(langOf(null, "NL"), "en"); assert.equal(langOf(null, "MX"), "es"); assert.equal(langOf(null, "BR"), "pt"); assert.equal(langOf("es", "BR"), "es");
  console.log("thank-you email ok");
}
