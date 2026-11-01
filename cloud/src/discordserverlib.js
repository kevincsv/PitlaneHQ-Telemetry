// Builds the Pitlane HQ community server on Discord with the bot's own token (DISCORD_BOT_TOKEN), from the admin page
// (Server → Discord server). The bot must be in that server with Administrator. Nothing is ever deleted: channels and
// roles of the same name are reused and updated, so it can run again. It runs in three steps (roles, channels, then
// Community, the forums, the posts and onboarding), each a request of its own so none goes over the Worker's
// subrequest limit; every step reads the server again, so a step can be repeated. apply false only lists what it would do.

export const API = "https://discord.com/api/v10";
const b = (n) => 1n << BigInt(n);
export const P = {
  INVITE: b(0), KICK: b(1), BAN: b(2), ADMIN: b(3), REACT: b(6), AUDIT: b(7), STREAM: b(9), VIEW: b(10), SEND: b(11),
  MANAGE_MESSAGES: b(13), EMBED: b(14), ATTACH: b(15), HISTORY: b(16), MENTION_ALL: b(17), EXT_EMOJI: b(18), CONNECT: b(20),
  SPEAK: b(21), MUTE: b(22), MOVE: b(24), VAD: b(25), NICK: b(26), MANAGE_NICKS: b(27), APP_CMDS: b(31), MANAGE_THREADS: b(34),
  PUB_THREADS: b(35), PRIV_THREADS: b(36), EXT_STICKERS: b(37), SEND_THREADS: b(38), TIMEOUT: b(40), VOICE_MSG: b(46), POLLS: b(49),
};
const or = (...a) => a.reduce((x, y) => x | y, 0n);
const EVERYONE_BASE = or(P.INVITE, P.REACT, P.STREAM, P.VIEW, P.SEND, P.EMBED, P.ATTACH, P.HISTORY, P.EXT_EMOJI, P.CONNECT, P.SPEAK,
  P.VAD, P.NICK, P.APP_CMDS, P.PUB_THREADS, P.EXT_STICKERS, P.SEND_THREADS, P.VOICE_MSG, P.POLLS);
const NO_POST = or(P.SEND, P.PUB_THREADS, P.PRIV_THREADS, P.POLLS, P.SEND_THREADS);
const MOD = or(P.KICK, P.BAN, P.MANAGE_MESSAGES, P.MANAGE_THREADS, P.TIMEOUT, P.MUTE, P.MOVE, P.MANAGE_NICKS, P.AUDIT, P.MENTION_ALL);

export const ROLES = [
  { key: "admin", name: "Admin", color: 0xffb02e, hoist: true, perms: P.ADMIN },
  { key: "tester", name: "Tester", color: 0xa970ff, hoist: true, perms: 0n },
  { key: "supporter", name: "♥ Supporter", color: 0xff6b9a, hoist: true, perms: 0n },
  { key: "driver", name: "Driver", color: 0x4fc3f7, hoist: false, perms: 0n },
  { key: "iracing", name: "iRacing", color: 0, hoist: false, perms: 0n },
  { key: "lmu", name: "Le Mans Ultimate", color: 0, hoist: false, perms: 0n },
];
const T = { text: 0, voice: 2, cat: 4, news: 5, forum: 15 };
// kind: read = everyone reads, Admin and the bot post; open = everyone talks; staff = Admin only;
// testers = Tester + Admin; supporters = Supporter + Tester + Admin
export const LAYOUT = [
  { cat: "START HERE", kind: "read", channels: [
    { key: "welcome", name: "👋・welcome", type: T.text },
    { key: "rules", name: "📜・rules", type: T.text },
    { key: "announcements", name: "📣・announcements", type: T.news, topic: "News about Pitlane HQ." },
    { key: "changelog", name: "🆕・changelog", type: T.text, topic: "What is new in each version." },
  ] },
  { cat: "PITLANE HQ", kind: "open", channels: [
    { key: "general", name: "💬・general", type: T.text, topic: "Talk about anything sim racing." },
    { key: "support", name: "🛟・support", type: T.text, topic: "Questions about the agent, the web or the phone apps." },
    { key: "bugs", name: "🐞・bug-reports", type: T.forum, topic: "One post per bug. Say the device (Windows agent, web, Android, iOS), the game, what you did and what happened. Screenshots help.",
      tags: ["Windows agent", "Web", "Android", "iOS", "Overlays", "Coach", "iRacing", "Le Mans Ultimate", { name: "Fixed", moderated: true }, { name: "Known", moderated: true }] },
    { key: "feedback", name: "💡・feedback", type: T.forum, topic: "One post per idea. React to the ideas you want.",
      tags: ["Coach", "Overlays", "Analysis", "Phones", "Community", "Discord bot", { name: "Planned", moderated: true }, { name: "Done", moderated: true }] },
    { key: "laps", name: "🏆・laps-and-records", type: T.text, kind: "read", topic: "New best laps and records from this server's drivers." },
    { key: "bot", name: "🤖・bot-commands", type: T.text, topic: "Try /record, /driver, /track and /board here." },
  ] },
  { cat: "SIM RACING", kind: "open", channels: [
    { key: "setups", name: "🔧・setups-and-telemetry", type: T.text, topic: "Setups, data and driving technique." },
    { key: "iracing", name: "🏁・iracing", type: T.text, topic: "iRacing talk, series and races." },
    { key: "lmu", name: "🏎️・le-mans-ultimate", type: T.text, topic: "Le Mans Ultimate talk, series and races." },
    { key: "showcase", name: "📸・screenshots-and-clips", type: T.text, topic: "Your best moments on track." },
  ] },
  { cat: "SUPPORTERS", kind: "supporters", channels: [{ key: "supporters", name: "♥・supporters-lounge", type: T.text, topic: "Thank you for keeping Pitlane HQ going." }] },
  { cat: "TESTERS", kind: "testers", channels: [{ key: "testers", name: "🧪・tester-chat", type: T.text, topic: "Features in development, before everyone gets them." }] },
  { cat: "STAFF", kind: "staff", channels: [
    { key: "staff", name: "🛠️・staff", type: T.text },
    { key: "modlog", name: "📋・discord-updates", type: T.text, topic: "Discord's messages for the server's moderators." },
  ] },
  { cat: "VOICE", kind: "open", channels: [
    { key: "v1", name: "🔊 Lounge", type: T.voice },
    { key: "v2", name: "🏁 Race night", type: T.voice },
    { key: "v3", name: "🏎️ Endurance", type: T.voice },
  ] },
];

const welcomeText = (ch) => [
  "# Welcome to Pitlane HQ 🏁",
  "Pitlane HQ records your laps in iRacing and Le Mans Ultimate and shows you where the time is. The coach, the overlays and your whole history, on your PC, on the web and on your phone. Everything is free during the beta.",
  "",
  "## Get started",
  "1. Download Pitlane HQ at https://pitlanehq.app",
  "2. Drive. Your laps show up in the app by themselves.",
  `3. Link your Discord in Account → Discord to use the bot here. Your best laps then show up in ${ch("laps")}.`,
  "",
  "## Where to go",
  `📜 ${ch("rules")} first.`,
  `📣 ${ch("announcements")} and 🆕 ${ch("changelog")} for news.`,
  `🛟 Questions go in ${ch("support")}. Something broken goes in ${ch("bugs")}. Ideas go in ${ch("feedback")}.`,
  `🤖 Try \`/record\`, \`/driver\` and \`/track\` in ${ch("bot")}.`,
].join("\n");
const rulesText = (ch) => [
  "# Rules",
  "**1.** Be respectful. No harassment, hate or personal attacks. Racing incidents are discussed, not fought over.",
  "**2.** Keep it clean. No NSFW, piracy, cheats or exploits.",
  "**3.** No spam or ads. Leagues and streams are welcome in the right channel.",
  `**4.** Use the right channel. One bug per post in ${ch("bugs")}, one idea per post in ${ch("feedback")}.`,
  "**5.** Never post your password, codes or tokens, nor anyone else's private details. Staff will never ask for your password.",
  "**6.** English is the main language here. Español y português também são bem-vindos.",
  "**7.** Follow Discord's Terms of Service and Community Guidelines. Admins have the final word.",
  "",
  "Breaking the rules can get you a warning, a timeout or a ban.",
].join("\n");

const strip = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const ow = (id, type, allow, deny) => ({ id, type, allow: String(allow || 0n), deny: String(deny || 0n) });

// one step; fetchFn is fetch (tests pass their own)
export async function buildServer({ token, guild: gid, step, apply, fetchFn = fetch, notes = [] }) {
  const log = [];
  const api = async (method, path, body) => {
    for (let i = 0; i < 4; i++) {
      const r = await fetchFn(API + path, { method, headers: { authorization: "Bot " + token, "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)) });
      if (r.status === 429) { const j = await r.json().catch(() => ({})); await new Promise((s) => setTimeout(s, Math.min(5, j.retry_after || 1) * 1000 + 200)); continue; }
      const t = await r.text();
      if (!r.ok) throw new Error(`${method} ${path.replace(/\d{15,}/g, "…")} → ${r.status} ${t.slice(0, 300)}`);
      return t ? JSON.parse(t) : null;
    }
    throw new Error("Discord keeps saying too many requests, try again in a minute");
  };
  const act = async (what, fn) => { log.push(what); if (apply) return fn(); };
  const soft = async (what, fn) => { try { return await act(what, fn); } catch (e) { log.push("  ⚠ " + e.message); } };

  const me = await api("GET", "/users/@me");
  const guild = await api("GET", `/guilds/${gid}`);
  const member = await api("GET", `/guilds/${gid}/members/${me.id}`);
  const mine = guild.roles.filter((r) => member.roles.includes(r.id));
  if (!mine.some((r) => BigInt(r.permissions) & P.ADMIN)) return { ok: false, error: "The bot does not have Administrator in this server. Invite it again with Administrator first." };
  const R = {};
  for (const w of ROLES) R[w.key] = guild.roles.find((r) => r.id !== guild.id && strip(r.name) === strip(w.name)) || { id: "new-" + w.key };
  const existing = await api("GET", `/guilds/${gid}/channels`);
  const find = (name, type) => existing.find((c) => strip(c.name) === strip(name) && (c.type === type || ((type === T.news || type === T.text) && (c.type === T.news || c.type === T.text))));
  const C = {};
  for (const g of LAYOUT) for (const c of g.channels) C[c.key] = find(c.name, c.type) || { id: "new-" + c.key };
  const isCommunity = guild.features.includes("COMMUNITY");
  const overwrites = (kind) => {
    const bot = ow(me.id, 1, or(P.VIEW, P.SEND, P.EMBED, P.HISTORY, P.ATTACH), 0n);
    const admin = ow(R.admin.id, 0, or(P.VIEW, P.SEND, P.SEND_THREADS, P.PUB_THREADS, MOD), 0n);
    if (kind === "read") return [ow(guild.id, 0, or(P.VIEW, P.HISTORY, P.REACT), NO_POST), admin, bot];
    if (kind === "staff") return [ow(guild.id, 0, 0n, P.VIEW), admin, bot];
    if (kind === "testers") return [ow(guild.id, 0, 0n, P.VIEW), ow(R.tester.id, 0, P.VIEW, 0n), admin, bot];
    if (kind === "supporters") return [ow(guild.id, 0, 0n, P.VIEW), ow(R.supporter.id, 0, P.VIEW, 0n), ow(R.tester.id, 0, P.VIEW, 0n), admin, bot];
    return [admin, bot];
  };

  if (step === 1) {
    for (const w of ROLES) {
      const body = { name: w.name, color: w.color, hoist: w.hoist, mentionable: false, permissions: w.perms };
      if (!R[w.key].id.startsWith("new-")) await act(`Update the role ${w.name}`, () => api("PATCH", `/guilds/${gid}/roles/${R[w.key].id}`, body));
      else R[w.key] = (await act(`Create the role ${w.name}`, () => api("POST", `/guilds/${gid}/roles`, body))) || R[w.key];
    }
    await act("Set what everyone can do (chat, voice, threads, the bot's commands, no @everyone)", () => api("PATCH", `/guilds/${gid}/roles/${guild.id}`, { permissions: EVERYONE_BASE }));
    const top = Math.max(...mine.map((r) => r.position));
    await soft("Order the roles Admin, Tester, ♥ Supporter, Driver, iRacing, Le Mans Ultimate", () =>
      api("PATCH", `/guilds/${gid}/roles`, ROLES.map((w, i) => ({ id: R[w.key].id, position: Math.max(1, top - 1 - i) }))));
  }

  if (step === 2) {
    let pos = 0;
    for (const g of LAYOUT) {
      let cat = find(g.cat, T.cat);
      if (cat) await act(`Update the category ${g.cat}`, () => api("PATCH", `/channels/${cat.id}`, { position: pos, permission_overwrites: overwrites(g.kind) }));
      else cat = (await act(`Create the category ${g.cat}`, () => api("POST", `/guilds/${gid}/channels`, { name: g.cat, type: T.cat, position: pos, permission_overwrites: overwrites(g.kind) }))) || { id: "new-cat" };
      pos++;
      for (const c of g.channels) {
        if (c.type === T.forum) { pos++; continue; } // step 3, after Community
        const type = c.type === T.news && !isCommunity ? T.text : c.type;
        const body = { name: c.name, parent_id: cat.id, position: pos++, permission_overwrites: overwrites(c.kind || g.kind) };
        if (c.topic && type !== T.voice) body.topic = c.topic;
        const have = C[c.key];
        if (!have.id.startsWith("new-")) await act(`Update #${c.name}`, () => api("PATCH", `/channels/${have.id}`, body));
        else await act(`Create #${c.name}`, () => api("POST", `/guilds/${gid}/channels`, { ...body, type }));
      }
    }
  }

  if (step === 3) {
    if (apply && (C.rules.id.startsWith("new-") || C.modlog.id.startsWith("new-"))) return { ok: false, error: "Run step 2 first, the channels are not there yet." };
    if (!isCommunity) await act("Turn on Community (rules channel, updates channel, email verification, media filter)", () =>
      api("PATCH", `/guilds/${gid}`, { features: [...guild.features, "COMMUNITY"], rules_channel_id: C.rules.id, public_updates_channel_id: C.modlog.id,
        verification_level: Math.max(1, guild.verification_level), explicit_content_filter: 2 }));
    await soft("Notify only on mentions, join messages in #general, English", () => api("PATCH", `/guilds/${gid}`, {
      default_message_notifications: 1, system_channel_id: C.general.id, preferred_locale: "en-US", rules_channel_id: C.rules.id, public_updates_channel_id: C.modlog.id }));
    if (C.announcements.type === T.text) await soft("Make #announcements an announcement channel", () => api("PATCH", `/channels/${C.announcements.id}`, { type: T.news }));
    for (const g of LAYOUT) for (const c of g.channels) {
      if (c.type !== T.forum) continue;
      const cat = find(g.cat, T.cat);
      const body = { name: c.name, topic: c.topic, parent_id: cat && cat.id, permission_overwrites: overwrites(c.kind || g.kind),
        available_tags: c.tags.map((t) => (typeof t === "string" ? { name: t } : t)), default_reaction_emoji: { emoji_name: c.key === "feedback" ? "👍" : "➕" } };
      if (C[c.key].id.startsWith("new-")) C[c.key] = (await act(`Create the forum #${c.name}`, () => api("POST", `/guilds/${gid}/channels`, { ...body, type: T.forum }))) || C[c.key];
      else await act(`Update the forum #${c.name}`, () => api("PATCH", `/channels/${C[c.key].id}`, { ...body, available_tags: undefined }));
    }
    const ch = (k) => `<#${C[k].id}>`;
    const postOnce = async (key, content) => {
      if (apply && !C[key].id.startsWith("new-")) {
        const msgs = await api("GET", `/channels/${C[key].id}/messages?limit=50`).catch(() => []);
        if (msgs.some((m) => m.author && m.author.id === me.id)) { log.push(`#${key} already has the bot's post, kept`); return; }
      }
      await soft(`Post the ${key} message`, () => api("POST", `/channels/${C[key].id}/messages`, { content: content.slice(0, 1990), allowed_mentions: { parse: [] } }));
    };
    await postOnce("welcome", welcomeText(ch));
    await postOnce("rules", rulesText(ch));
    if (notes.length) await postOnce("changelog", notes.join("\n").slice(0, 1990));
    let sf = BigInt(Date.now() - 1420070400000) << 22n;
    const nid = () => String(sf += 1n);
    await soft("Onboarding asks \"What do you drive?\" and gives Driver plus iRacing or Le Mans Ultimate", () => api("PUT", `/guilds/${gid}/onboarding`, {
      enabled: true, mode: 0,
      default_channel_ids: ["welcome", "rules", "announcements", "changelog", "general", "support", "bugs", "feedback", "laps", "bot", "setups", "showcase"].map((k) => C[k].id),
      prompts: [{ id: nid(), type: 0, title: "What do you drive?", single_select: false, required: true, in_onboarding: true, options: [
        { id: nid(), title: "iRacing", emoji: { name: "🏁" }, role_ids: [R.driver.id, R.iracing.id], channel_ids: [C.iracing.id] },
        { id: nid(), title: "Le Mans Ultimate", emoji: { name: "🏎️" }, role_ids: [R.driver.id, R.lmu.id], channel_ids: [C.lmu.id] },
        { id: nid(), title: "Something else", emoji: { name: "🎮" }, role_ids: [R.driver.id], channel_ids: [] },
      ] }],
    }));
  }
  return { ok: true, guild: guild.name, step, apply: !!apply, log };
}

