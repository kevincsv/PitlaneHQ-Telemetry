// Live telemetry relay: PitlaneHQ.exe sends, your browsers and phones watch.
// One room (Durable Object) per account. Everything the PC sends is sealed with
// the account's data key (AES-GCM), which the server never has: the room only
// passes the sealed text along. The PC only streams while someone is watching.
import { DurableObject } from "cloudflare:workers";
import { sessionAccount } from "./accounts.js";
import { teamRoomMember } from "./team.js";

const MAX_MSG = 512 * 1024;

const jerr = (msg, status) => new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });

// GET /live?role=pc|view|idle (WebSocket). Browsers cannot set headers on a
// WebSocket, so the session token may also come as the second subprotocol:
// new WebSocket(url, ["pitlane", token]).
// idle: a screen that only wants to know whether the PC is there (it gets no telemetry and the PC does
// not count it as watching), until you press Connect.
// share=<room>: the room of a live share code. The PC that shares is signed in; the viewers only need the
// code (the room is a hash of it, the key another one the server never sees).
// team=<room>: a team's room (team.js, docs/spec/team.md): only the team's members, several PCs (one per account).
export async function live(req, env) {
  if (!env.LIVE) return jerr("live telemetry is not set up on this server", 404);
  if ((req.headers.get("upgrade") || "").toLowerCase() !== "websocket") return jerr("expected a WebSocket", 426);
  const url = new URL(req.url);
  const r0 = url.searchParams.get("role");
  const role = r0 === "pc" ? "pc" : r0 === "idle" ? "idle" : "view";
  const share = url.searchParams.get("share") || "";
  if (share && !/^[0-9a-f]{32}$/.test(share)) return jerr("bad share code", 400);
  const team = share ? "" : url.searchParams.get("team") || "";
  if (team && !/^[0-9a-f]{32}$/.test(team)) return jerr("bad team room", 400);
  const protos = (req.headers.get("sec-websocket-protocol") || "").split(",").map((x) => x.trim()).filter(Boolean);
  let auth = req.headers.get("authorization") || "";
  if (!auth && protos[0] === "pitlane" && protos[1]) auth = "Bearer " + protos[1];
  const acc = auth ? await sessionAccount(new Request(req.url, { headers: { authorization: auth } }), env) : null;
  if (!acc && (!share || role === "pc")) return jerr("sign in again", 401);
  if (team && !(await teamRoomMember(env, team, acc.id))) return jerr("you are not in this team", 403);
  const room = env.LIVE.get(env.LIVE.idFromName(share ? "share:" + share : team ? "team:" + team : acc.id));
  const h = new Headers(req.headers);
  h.set("x-live-role", role);
  h.set("x-live-proto", protos[0] === "pitlane" ? "pitlane" : "");
  h.delete("authorization");
  h.delete("sec-websocket-protocol");
  h.delete("x-live-nudge"); // only the worker itself nudges a room
  // who is connecting, in a team's room (the name URI-encoded: a header carries no other characters)
  for (const k of ["x-live-team", "x-live-acct", "x-live-name", "x-live-kick"]) h.delete(k);
  if (team) {
    h.set("x-live-team", "1");
    h.set("x-live-acct", acc.id);
    h.set("x-live-name", encodeURIComponent(String(acc.display || "Driver").slice(0, 60)));
  }
  return room.fetch(new Request(req.url, { headers: h }));
}

export class LiveRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // keepalives are answered without waking the room
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  socks(role, except) {
    return this.ctx.getWebSockets(role).filter((w) => w !== except && w.readyState === 1);
  }

  tell(list, obj) {
    const s = JSON.stringify(obj);
    for (const w of list) {
      try {
        w.send(s);
      } catch (e) {}
    }
  }

  // the PC needs to know whether anybody watches; the viewers (and the idle screens) whether the PC is there
  announce(except) {
    const pcs = this.socks("pc", except), views = this.socks("view", except);
    this.tell(pcs, { ctl: "viewers", n: views.length });
    this.tell([...views, ...this.socks("idle", except)], { ctl: "pc", on: pcs.length > 0 });
  }

  // a team's room: several PCs (one per account), each socket tagged [role, account] and carrying {acct, name, team}
  // across hibernation; an account's sockets of the old rooms carry nothing
  teamOf(ws) {
    try {
      const a = ws.deserializeAttachment();
      return a && a.team ? a : null;
    } catch (e) {
      return null;
    }
  }

  // the viewers (and the idle screens) learn which PCs are there, the PCs how many watch
  teamAnnounce(except) {
    const pcs = this.socks("pc", except), views = this.socks("view", except);
    const list = pcs.map((w) => this.teamOf(w)).filter(Boolean).map((a) => ({ id: a.acct, name: a.name }));
    this.tell(pcs, { ctl: "viewers", n: views.length });
    const watch = [...views, ...this.socks("idle", except)];
    this.tell(watch, { ctl: "pcs", list });
    this.tell(watch, { ctl: "pc", on: pcs.length > 0 });
  }

  teamAccept(req, role) {
    const acct = req.headers.get("x-live-acct") || "";
    let name = "Driver";
    try { name = decodeURIComponent(req.headers.get("x-live-name") || "") || "Driver"; } catch (e) {}
    if (!acct) return jerr("sign in again", 401);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (role === "pc") {
      // one PC per account: a new connection replaces that account's old one; up to 12 PCs
      for (const w of this.socks("pc")) {
        if (this.ctx.getTags(w)[1] !== acct) continue;
        try {
          w.close(4000, "replaced");
        } catch (e) {}
      }
      if (this.socks("pc").length >= 12) return jerr("too many PCs in this team", 429);
    } else if (this.socks(role).length >= 16) {
      return jerr("too many screens watching", 429);
    }
    this.ctx.acceptWebSocket(server, [role, acct]);
    server.serializeAttachment({ team: 1, acct, name });
    this.teamAnnounce();
    const h = new Headers();
    if (req.headers.get("x-live-proto")) h.set("sec-websocket-protocol", "pitlane");
    return new Response(null, { status: 101, webSocket: client, headers: h });
  }

  async fetch(req) {
    // a member who left or was removed from a team: out of its room at once
    const kick = req.headers.get("x-live-kick");
    if (kick) {
      for (const w of this.ctx.getWebSockets(kick)) {
        try {
          w.close(4003, "removed");
        } catch (e) {}
      }
      this.teamAnnounce();
      return new Response(null, { status: 204 });
    }
    // a nudge from the worker (another device uploaded the account): the PC and the screens sync at once
    if (req.headers.get("x-live-nudge") === "sync") {
      this.tell([...this.socks("pc"), ...this.socks("view"), ...this.socks("idle")], { ctl: "sync", version: Number(req.headers.get("x-live-version") || 0) });
      return new Response(null, { status: 204 });
    }
    const r0 = req.headers.get("x-live-role"), role = r0 === "pc" ? "pc" : r0 === "idle" ? "idle" : "view";
    if (req.headers.get("x-live-team") === "1") return this.teamAccept(req, role);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (role === "pc") {
      // one PC at a time: a new connection replaces the old one
      for (const w of this.socks("pc")) {
        try {
          w.close(4000, "replaced");
        } catch (e) {}
      }
    } else if (this.socks(role).length >= (role === "idle" ? 16 : 8)) {
      return jerr("too many screens watching", 429);
    }
    this.ctx.acceptWebSocket(server, [role]);
    this.announce();
    const h = new Headers();
    if (req.headers.get("x-live-proto")) h.set("sec-websocket-protocol", "pitlane");
    return new Response(null, { status: 101, webSocket: client, headers: h });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== "string" || msg.length > MAX_MSG) return;
    const role = this.ctx.getTags(ws)[0];
    // only sealed messages travel between the PC and the viewers (an idle screen sends nothing)
    if (!msg.startsWith("e:") || role === "idle") return;
    const t = this.teamOf(ws);
    if (t) {
      // a team's room: each PC's message goes to the viewers with whose it is, a viewer's to every PC
      const out = role === "pc" ? "f:" + t.acct + ":" + msg : msg;
      for (const w of this.socks(role === "pc" ? "view" : "pc")) {
        try {
          w.send(out);
        } catch (e) {}
      }
      return;
    }
    const to = this.socks(role === "pc" ? "view" : "pc");
    for (const w of to) {
      try {
        w.send(msg);
      } catch (e) {}
    }
  }

  async webSocketClose(ws, code) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye");
    } catch (e) {}
    if (this.teamOf(ws)) this.teamAnnounce(ws);
    else this.announce(ws);
  }

  async webSocketError(ws) {
    if (this.teamOf(ws)) this.teamAnnounce(ws);
    else this.announce(ws);
  }
}
