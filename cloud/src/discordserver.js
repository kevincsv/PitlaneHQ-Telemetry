// The admin page's Discord server tool (Server → Discord server): the route; what it builds is in discordserverlib.js
import { sessionAccount, isAdmin } from "./accounts.js";
import { buildServer, API, P } from "./discordserverlib.js";
import { discordRecords } from "./discord.js";

// GET /community/admin/discord-server: the servers the bot is in, and whether it has Administrator there
// POST /community/admin/discord-server {guild, step 1-3, apply}: one step; {guild, everyone}: every driver's laps there or not
export async function discordServerRoute(req, env, url) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const acc = await sessionAccount(req, env);
  if (!acc || !isAdmin(env, acc.id)) return json({ error: "only the admins of this server can do this" }, 403);
  if (!env.DISCORD_BOT_TOKEN) return json({ error: "The bot's token is not set on this server" }, 503);
  const token = env.DISCORD_BOT_TOKEN;
  try {
    if (req.method === "GET") {
      const r = await fetch(API + "/users/@me/guilds?with_counts=true", { headers: { authorization: "Bot " + token } });
      if (!r.ok) return json({ error: "Discord answered " + r.status }, 502);
      const gs = await r.json();
      const rows = (await env.DB.prepare("SELECT guild_id, everyone, alerts_channel, records_channel, feedback_channel FROM discord_guilds").all().catch(() => ({ results: [] }))).results || [];
      const by = new Map(rows.map((x) => [x.guild_id, x]));
      return json({ guilds: gs.map((g) => { const d = by.get(g.id) || {};
        return { id: g.id, name: g.name, members: g.approximate_member_count || 0, admin: !!(BigInt(g.permissions || "0") & P.ADMIN), everyone: !!d.everyone, feedback: !!d.feedback_channel, channel: !!(d.alerts_channel || d.records_channel) }; }) });
    }
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));
    // every driver's new best laps and records in this server's alerts channels (discordLapAlert), or only its own drivers'
    // the current records posted in that server's records channel, 30 per request from `from` (discord.js)
    if (body.records === true) {
      if (!/^\d{15,22}$/.test(String(body.guild || ""))) return json({ error: "bad request" }, 400);
      return json(await discordRecords(env, String(body.guild), Number(body.from) || 0));
    }
    if (typeof body.everyone === "boolean") {
      if (!/^\d{15,22}$/.test(String(body.guild || ""))) return json({ error: "bad request" }, 400);
      await env.DB.prepare("INSERT INTO discord_guilds (guild_id, set_by, updated, everyone) VALUES (?1,?2,?3,?4) ON CONFLICT(guild_id) DO UPDATE SET everyone=excluded.everyone, updated=excluded.updated")
        .bind(String(body.guild), acc.id, Date.now(), body.everyone ? 1 : 0).run();
      return json({ ok: true, everyone: body.everyone });
    }
    // the apps' feedback posted in this server's feedback forum (the channel named "feedback", discordFeedback), or not
    if (typeof body.feedback === "boolean") {
      if (!/^\d{15,22}$/.test(String(body.guild || ""))) return json({ error: "bad request" }, 400);
      let ch = null;
      if (body.feedback) {
        const r = await fetch(`${API}/guilds/${body.guild}/channels`, { headers: { authorization: "Bot " + token } });
        if (!r.ok) return json({ error: "Discord answered " + r.status }, 502);
        const cs = (await r.json()).filter((c) => (c.type === 15 || c.type === 0) && /feedback/i.test(c.name));
        const c = cs.find((x) => x.type === 15) || cs[0];
        if (!c) return json({ error: "This server has no feedback channel. Build the server first." }, 400);
        ch = c.id;
      }
      await env.DB.prepare("INSERT INTO discord_guilds (guild_id, set_by, updated, feedback_channel) VALUES (?1,?2,?3,?4) ON CONFLICT(guild_id) DO UPDATE SET feedback_channel=excluded.feedback_channel, updated=excluded.updated")
        .bind(String(body.guild), acc.id, Date.now(), ch).run();
      return json({ ok: true, feedback: !!ch });
    }
    const step = Number(body.step);
    if (!/^\d{15,22}$/.test(String(body.guild || "")) || ![1, 2, 3].includes(step)) return json({ error: "bad request" }, 400);
    let notes = [];
    if (step === 3) {
      try {
        const v = ((await (await env.ASSETS.fetch(new Request(new URL("/whats-new.json", url.origin)))).json()).versions || [])[0];
        if (v && v.en) notes = [`## ${v.v} beta`, ...v.en.map((x) => "- " + x), "", "Download at https://pitlanehq.app"];
      } catch (e) { /* no notes */ }
    }
    return json(await buildServer({ token, guild: String(body.guild), step, apply: !!body.apply, notes }));
  } catch (e) { return json({ error: String(e.message || e) }, 502); }
}
