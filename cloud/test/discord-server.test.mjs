// node cloud/test/discord-server.test.mjs: the admin page's Discord server tool (discordserverlib.js) against a fake Discord:
// a preview changes nothing, the three steps build every role and channel once, a second run reuses them (nothing is
// created twice or deleted), and a bot without Administrator is refused
import assert from "node:assert/strict";
import { buildServer, ROLES, LAYOUT } from "../src/discordserverlib.js";

const G = "111111111111111111";
function fake({ admin = true } = {}) {
  let n = 200;
  const s = { roles: [{ id: G, name: "@everyone", position: 0, permissions: "0" }, { id: "9", name: "Pitlane HQ", position: 1, permissions: admin ? "8" : "0" }],
    channels: [], features: [], msgs: {}, calls: [] };
  const fetchFn = async (url, o) => {
    const p = url.replace("https://discord.com/api/v10", ""), m = o.method, b = o.body ? JSON.parse(o.body) : null;
    s.calls.push(m + " " + p);
    const J = (x) => ({ ok: true, status: 200, text: async () => JSON.stringify(x), json: async () => x });
    if (p === "/users/@me") return J({ id: "5" });
    if (p === `/guilds/${G}` && m === "GET") return J({ id: G, name: "Test", roles: s.roles, features: s.features, verification_level: 0 });
    if (p === `/guilds/${G}` && m === "PATCH") { if (b.features) s.features = b.features; return J({}); }
    if (p.includes("/members/")) return J({ roles: ["9"] });
    if (p === `/guilds/${G}/channels` && m === "GET") return J(s.channels);
    if (p === `/guilds/${G}/channels` && m === "POST") { const c = { ...b, id: String(n++) }; s.channels.push(c); return J(c); }
    if (p === `/guilds/${G}/roles` && m === "POST") { const r = { ...b, id: String(n++), position: 1 }; s.roles.push(r); return J(r); }
    if (/^\/channels\/\d+$/.test(p) && m === "PATCH") { const c = s.channels.find((x) => x.id === p.split("/")[2]); if (c && b.type != null) c.type = b.type; return J(c || {}); }
    if (p.endsWith("/messages") && m === "POST") { const id = p.split("/")[2]; (s.msgs[id] ||= []).push({ author: { id: "5" }, content: b.content }); return J({}); }
    if (p.includes("/messages") && m === "GET") return J(s.msgs[p.split("/")[2]] || []);
    if (p.endsWith("/onboarding")) { assert.ok(b.default_channel_ids.every((x) => /^\d+$/.test(x)), "onboarding gets real channel ids"); return J(b); }
    return J({});
  };
  return { s, fetchFn };
}
const all = async (f, apply) => { for (const step of [1, 2, 3]) { const r = await buildServer({ token: "x", guild: G, step, apply, fetchFn: f.fetchFn, notes: ["## 1.0 beta", "- A thing."] }); assert.equal(r.ok, true, r.error); } };

{ // preview: only reads
  const f = fake(); await all(f, false);
  assert.ok(f.s.calls.every((c) => c.startsWith("GET")), "a preview never writes");
}
{ // build, then build again
  const f = fake(); await all(f, true);
  const nCh = LAYOUT.reduce((a, g) => a + 1 + g.channels.length, 0);
  assert.equal(f.s.channels.length, nCh);
  assert.equal(f.s.roles.length, 2 + ROLES.length);
  assert.ok(f.s.features.includes("COMMUNITY"));
  assert.equal(f.s.channels.find((c) => c.name.endsWith("announcements")).type, 5);
  assert.equal(f.s.channels.filter((c) => c.type === 15).length, 2);
  const posted = Object.values(f.s.msgs).flat().map((m) => m.content).join("\n");
  assert.match(posted, /Welcome to Pitlane HQ/); assert.match(posted, /# Rules/); assert.match(posted, /1\.0 beta/);
  assert.doesNotMatch(posted, /<#new-/, "the posts link real channels");
  assert.doesNotMatch(posted.toLowerCase(), /drinks|encrypt|github/);
  await all(f, true);
  assert.equal(f.s.channels.length, nCh, "a second run creates no channel");
  assert.equal(f.s.roles.length, 2 + ROLES.length, "a second run creates no role");
  assert.equal(Object.values(f.s.msgs).flat().length, 3, "each post once");
  assert.ok(!f.s.calls.some((c) => c.startsWith("DELETE")), "nothing is deleted");
}
{ // no Administrator
  const f = fake({ admin: false });
  const r = await buildServer({ token: "x", guild: G, step: 1, apply: true, fetchFn: f.fetchFn });
  assert.equal(r.ok, false);
}
console.log("discord-server ok");
