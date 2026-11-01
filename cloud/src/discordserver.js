// The admin page's Discord server tool (Server → Discord server): the route; what it builds is in discordserverlib.js
import { sessionAccount, isAdmin } from "./accounts.js";
import { buildServer, API, P } from "./discordserverlib.js";

// GET /community/admin/discord-server: the servers the bot is in, and whether it has Administrator there
// POST /community/admin/discord-server {guild, step 1-3, apply}: one step
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
      return json({ guilds: gs.map((g) => ({ id: g.id, name: g.name, members: g.approximate_member_count || 0, admin: !!(BigInt(g.permissions || "0") & P.ADMIN) })) });
    }
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));
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
