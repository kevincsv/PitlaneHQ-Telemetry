// How well the PC recorded a lap, as its trace says it (h, cloud.go lapHealth).
// a lap's trace has a hole (worker.js addLap): the PC says how well it recorded the lap (h: the longest stretch
// without telemetry in metres and the share of points seen); over 40 m, or under 90 % seen, the live recording lost part
// of it. A trace of before says nothing of it: a hole is believed when the lap has no Off Track, the one thing that makes
// a whole lap not valid that the game's telemetry file could miss
export function traceHole(tr) {
  if (!tr || !Array.isArray(tr.d)) return true;
  if (tr.h && typeof tr.h === "object") return (+tr.h.gap || 0) > 40 || (+tr.h.seen || 0) < 0.9;
  return !(Array.isArray(tr.incK) && tr.incK.includes("off"));
}
