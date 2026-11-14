# Team mode

How this part of Pitlane HQ behaves. Read it before changing this area; keep it up to date when the behaviour changes.
Team mode is in the beta (the owner's choice, 2026-11-14): every tester and every admin can use it, admin mode or not
(`teamOk()` in index.html, `betaAllowed()` in Go, `realAdmin || tester` on the phones), with a "Beta" pill; on
beta.pitlanehq.app the server's `/team` routes are for testers and admins (beta.js). Never in a changelog while it is
in the beta.

## What it is

For endurance races with friends. A team is a small group of accounts (up to 12). Whoever of the team is in the car
streams their live telemetry to the team, and everyone in the team sees it live, with the stints, the fuel, the next
driver change and every driver's lap times side by side. Teammates join with an invite link.

## The team secret

- Each team has a secret made by the device that creates it: 20 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
  The server never has it. Everything else comes from it:
  - room = hex(SHA-256("pitlanehq-team-room|" + secret)) first 16 bytes (32 hex characters)
  - join = hex(SHA-256("pitlanehq-team-join|" + secret)) (64 hex characters)
  - key = PBKDF2-SHA256(secret, salt "pitlanehq-team-key-v1", 100 000 iterations, 32 bytes): the team key
- The invite is `<teamId>.<secret>`; the invite link is `https://pitlanehq.app/app#team=<teamId>.<secret>` (the
  fragment never reaches the server). Join takes the link or the bare invite.
- Each member keeps the secret on the server sealed with their own data key (`sealed`: the account's AES-GCM sealing,
  `sealAES`/`openAES` in placcount.go, `cpSeal`/`cpOpen` in index.html, the phones' Crypto, additional data
  "pitlanehq-v1"), so every device of the member opens it.
- The team's live messages and log entries are sealed with the team key: live messages exactly like a share code's
  (`liveSeal`/`liveOpen`), log entries with the same AES-GCM sealing as `sealAES` (additional data "pitlanehq-v1").

## Server (`cloud/src/team.js`, migration `0101_teams.sql`)

Tables: `teams(id, name, owner, room UNIQUE, join_hash, created)`, `team_members(team, account, role, sealed, joined,
PK(team, account))`, `team_log(id, team, account, key, at, sealed, UNIQUE(team, account, key))`.

All routes need the account's session (Bearer); answers are JSON, errors `{error}` with plain short sentences.

| Route | Body / query | Answer |
| --- | --- | --- |
| `GET /team` | | `{teams:[{id, name, role, owner, sealed, members:[{id, name, role, joined}]}]}` |
| `POST /team/create` | `{name, room, join, sealed}` | `{id}` (name 2 to 40 characters, at most 5 teams per account) |
| `POST /team/join` | `{id, join, sealed}` | `{id, name}` (403 when `join` is wrong, 409 when the team has 12 members) |
| `POST /team/leave` | `{id}` | `{ok}`; an owner who leaves passes the team to the oldest member; the last one deletes it |
| `POST /team/remove` | `{id, member}` | `{ok}`, owner only; the driver cannot join again with the invite link (`team_bans`, 403) |
| `POST /team/rename` | `{id, name}` | `{ok}`, owner only |
| `POST /team/log` | `{id, key, sealed}` | `{ok}`: upserts the member's entry `key` (at most 48 KB, members only) |
| `GET /team/log?id=&since=` | | `{log:[{id, account, name, key, at, sealed}]}`, the last 30 days, at most 300, newest first |

`id` is 12 lowercase hex characters made by the server. Deleting an account removes its memberships and log entries.
The server keeps only a SHA-256 of `join` (`join_hash`). At most 5 teams per account also holds when joining (409). A
member who leaves or is removed is put out of the team's live room at once (the worker tells the room, which closes
their sockets with 4003).

### The team's live room

`GET /live?role=pc|view&team=<room>` (WebSocket, session in the header or the second subprotocol like the account's
room): only members of the team whose `room` it is. The Durable Object is `"team:" + room`. Unlike the other rooms
it takes several PCs, one per account (a new one of the same account replaces the old), up to 12, and 16 viewers.

- PC → viewers: every "e:" message goes to all viewers as `"f:" + accountId + ":" + message`.
- Viewers → PCs: every "e:" message goes to all PCs.
- `role=idle` works as in the account's room: it gets the `pcs` and `pc` notices, no telemetry, and does not count as
  watching.
- To the viewers: `{ctl:"pcs", list:[{id, name}]}` whenever a PC comes or goes (also `{ctl:"pc", on}`); to the PCs:
  `{ctl:"viewers", n}`.

## The agent (PC)

- Page actions (`/api/sync`, the web's `cpAction` and the phones' repositories do the same with their own calls):
  `{action:"team", op}` with op `list`, `create {name}`, `join {invite}`, `leave {id}`, `remove {id, member}`,
  `rename {id, name}`, `log {id}`, `active {id}`. `list` answers `{teams:[{…the server's team, invite, room}], active}`
  with the opened `invite`; `log` answers `{log:[{account, name, key, at, entry}]}` with each entry opened.
- The PC streams to one team, the active one (`active`, kept in the config; the first team by default), while it is
  signed in and Live is on (`liveTeamRelay`, like `liveShareRelay`). Teammates watching only watch, as with a code.
- The live telemetry goes out only while this PC's driver is in the car (on track in the driver's seat). Every second,
  while somebody watches, it sends the event `team` (below), also when not in the car (`inCar:false`).
- At the end of each lap in the car it upserts its stint in the team log (`key` = session + stint start).
- Details of the agent (`team.go`): every op answers `{error}` unless `wipOpen()` (admins in admin mode and testers).
  `list` leaves `sealed` out of each team. `create` answers `{id, name, invite}`; `create` and `join` make that team
  the active one, `leave` of the active one goes back to the first. `active {id}` (`""`: the first) answers `{active}`.
  `log` takes an optional `since`. "In the car" is the game's `IsOnTrack` (iRacing's player in the car; the Le Mans
  Ultimate and ACC readers make it too): a teammate driving the same car in iRacing reads false on this PC. A stint is
  the time in the car within one session; out of the car more than 90 s (a tow, a long stop) starts a new one. `sid`
  is the lap recorder's session id (`ir-<subsession>-<session number>` in iRacing, the same on every teammate's PC).
  `fuelPerLap` is the average of the stint's last five laps that used fuel, else the game's use an hour over the last
  lap; `fuelPerLap` 0 and `lapsLeft`, `pitLap` -1 when unknown. The voice chat is not in a team's room.

`team` live event: `{driver, inCar, sid, game, track, config, car, kind, lap, stintStart, stintLaps, fuel, fuelPerLap,
lapsLeft, pitLap, sessionLeft, lastLap, best}` (fuel in litres, times in seconds, `stintStart` in ms, `pitLap` the lap
the fuel lasts to, `sessionLeft` -1 when unknown).

Log entry (opened): `{v:1, driver, sid, game, track, config, car, kind, started, stint:{from, to, lapFrom, lapTo},
laps:[{n, t, valid}], best, fuelPerLap}`.

## The Team screen (every device)

A sub-tab "Team" in Telemetry after Strategy (`team` in `GROUPS.race`, `v-team`); on the phones a "Team" sub-tab after
Tyres in Live. No team yet: Create a team (name) and Join a team (paste the invite link). With a team (a picker when
there are several):

- Members, with a dot for whoever is in the car now, Invite link (Copy; Share on the phones), Leave; the owner removes.
- In the car: the driver, track and car, lap, laps in the stint, fuel, laps of fuel left and the lap of the next stop,
  and Watch live (the Telemetry screens follow that driver, as with a share code, "Watching · Team" with Disconnect).
- Stints: who drove, from which lap to which, how many laps, best and average.
- Lap times: one column per driver side by side (laps, best, average, the last laps), for the session chosen.

The PC streams to the active team; Settings is not needed (the team picker on the Team screen sets it).

### In index.html

- `cpTeam` is the web's side of the action (the agent's on the PC): the same answers; `active` is kept per browser
  (`pw.teamActive`), since the browser only watches.
- An invite link is read on load and taken out of the address at once (`pw.teamJoin` for the tab); the Team screen
  opens after the sign-in with the Join form filled in.
- Watch live on the web is the live mode `team` (`liveMode("team")`): it follows the PC whose latest `team` event says
  `inCar` (switching at a driver change; the one picked with Watch live when two are), and the bar reads
  "Watching · Team · <driver>". On the PC page, Watch live opens `https://pitlanehq.app/app#teamwatch=<teamId>` in the
  browser (the fragment starts watching that team there): the PC page's own telemetry is the game's. While the Team
  screen is open (PC page and web), it listens to the team's room by itself for the `team` events only (`teamWsTick`,
  with the agent's session on the PC).
- A live socket closed with 4003 means the account is no longer in the team: the list is read again.
- Average lap: the valid laps within 107 % of that driver's best (out and in laps left out).
- Demo data: `PITLANE_DEMO.team`/`teamLive` in pitwall-demo.js (a team of four, a race at Spa going on).
