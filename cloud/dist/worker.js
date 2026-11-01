var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target2, value) => __defProp(target2, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target2) => (target2 = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target2, "default", { value: mod, enumerable: true }) : target2,
  mod
));

// ../web/dist/pitwall-analysis.js
var require_pitwall_analysis = __commonJS({
  "../web/dist/pitwall-analysis.js"(exports, module) {
    (function(root) {
      "use strict";
      const VERSION = 1, BIN3 = 5;
      const langOf2 = /* @__PURE__ */ __name((ctx) => {
        const l = ctx && ctx.lang;
        return l === "es" || l === "pt" ? l : "en";
      }, "langOf");
      const txOf = /* @__PURE__ */ __name((ctx) => {
        const l = langOf2(ctx), post2 = ctx && typeof ctx.post === "function" ? ctx.post : (s) => s;
        return (en, es, pt) => post2(l === "es" ? es : l === "pt" ? pt != null ? pt : en : en);
      }, "txOf");
      const unitsOf = /* @__PURE__ */ __name((ctx) => {
        const imp = !!(ctx && ctx.units === "imperial");
        return { spd: /* @__PURE__ */ __name((ms) => imp ? ms * 2.23694 : ms * 3.6, "spd"), spdU: /* @__PURE__ */ __name(() => imp ? "mph" : "km/h", "spdU") };
      }, "unitsOf");
      const turnsOf = /* @__PURE__ */ __name((ctx) => ctx && Array.isArray(ctx.turns) ? ctx.turns : null, "turnsOf");
      const sgn = /* @__PURE__ */ __name((d, n = 3) => d == null || isNaN(d) ? "\u2013" : (d >= 0 ? "+" : "\u2212") + Math.abs(d).toFixed(n), "sgn");
      function coachOf(ctx) {
        const W2 = ctx && ctx.weights || {}, ME = ctx && ctx.me || {}, w = W2.w || {}, b = W2.b || {}, mw = ME.w || {};
        const off = W2.off instanceof Set ? W2.off : new Set(Array.isArray(W2.off) ? W2.off : []);
        return {
          weight: /* @__PURE__ */ __name((c) => c && c.kind ? (w[c.kind + "|" + c.cls] || 1) * (mw[c.kind + "|" + c.cls] || 1) : 1, "weight"),
          ask: /* @__PURE__ */ __name((k, cls) => {
            const x = b[k + "|" + cls];
            return x && x.ask > 0 ? x.ask : null;
          }, "ask"),
          off: /* @__PURE__ */ __name((k, cls) => off.has(k + "|" + cls), "off"),
          habits: Array.isArray(ME.habits) ? ME.habits : [],
          // the drivers' 👍/👎 on the plan's steps (/community/coach/weights plan: a step's id, or its kind before the colon)
          plan: /* @__PURE__ */ __name((id2) => {
            const pw = W2.plan || {};
            return id2 ? pw[id2] || pw[String(id2).split(":")[0]] || 1 : 1;
          }, "plan")
        };
      }
      __name(coachOf, "coachOf");
      function hintOf(ctx) {
        if (ctx && typeof ctx.hint === "function") return ctx.hint;
        const cs = ctx && Array.isArray(ctx.cards) ? ctx.cards : null;
        if (!cs || !cs.length) return () => null;
        const mx = Math.max(0, ...cs.map((c) => c.spread || 0));
        return (apex) => {
          if (!(apex >= 0)) return null;
          let b = null;
          for (const c of cs) {
            const g = Math.abs(c.apex - apex);
            if (g <= 60 && (!b || g < Math.abs(b.apex - apex))) b = c;
          }
          return b ? { ...b, spreadMax: b.spreadMax != null ? b.spreadMax : mx } : null;
        };
      }
      __name(hintOf, "hintOf");
      function failedOf(ctx) {
        const T3 = ctx && ctx.progress && Array.isArray(ctx.progress.tried) ? ctx.progress.tried : null;
        if (!T3 || !T3.length) return () => null;
        return (apex) => {
          const by = {};
          for (const x of T3) {
            if (!x || !x.kind || !(Math.abs(x.apex - apex) <= 60)) continue;
            const a = by[x.kind] = by[x.kind] || [];
            if (a.length < 2) a.push(x.ok > 0);
          }
          const out = new Set(Object.entries(by).filter(([, a]) => a.length >= 2 && !a.some(Boolean)).map(([k]) => k));
          return out.size ? out : null;
        };
      }
      __name(failedOf, "failedOf");
      const estOf = /* @__PURE__ */ __name((B, ctx) => !!(ctx && ctx.estB || B && (B.est || B.field)), "estOf");
      function lapSeries(l) {
        const out = [];
        let last = null;
        const lim = Math.min(l.bins.length, (l.maxBin || l.bins.length - 1) + 1);
        for (let i = 0; i < lim; i++) {
          const b = l.bins[i] || last;
          if (!l.bins[i] && !last) continue;
          out[i] = b;
          last = b;
        }
        const end = out.length;
        return { arr: out, end };
      }
      __name(lapSeries, "lapSeries");
      function serOf(l) {
        if (!l._ser || l._serN !== l.bins.length) {
          l._ser = lapSeries(l).arr;
          l._serN = l.bins.length;
        }
        return l._ser;
      }
      __name(serOf, "serOf");
      const lapShape = /* @__PURE__ */ __name((l) => l && l.xy && l.xy.x.length > 10 ? { x: l.xy.x, y: l.xy.y, N: l.xy.x.length, g: l.xy.g || null, lap: true } : null, "lapShape");
      function sameFrame2(a, b) {
        if (!a || !b || !!a.g !== !!b.g) return null;
        if (!a.g || a.g[0] === b.g[0] && a.g[1] === b.g[1]) return b;
        const dx = (b.g[1] - a.g[1]) * 111320 * Math.cos(a.g[0] * Math.PI / 180), dy = (b.g[0] - a.g[0]) * 110540;
        return { ...b, x: b.x.map((v) => v + dx), y: b.y.map((v) => v + dy) };
      }
      __name(sameFrame2, "sameFrame");
      function lineOffsets2(A, B) {
        const a = lapShape(A), b = sameFrame2(a, lapShape(B));
        if (!a || !b) return null;
        const n = Math.min(a.N, b.N);
        if (n < 60) return null;
        const lat = new Array(n), lon = new Array(n);
        for (let i = 0; i < n; i++) {
          const i0 = Math.max(0, i - 2), i1 = Math.min(n - 1, i + 2);
          let tx = b.x[i1] - b.x[i0], ty = b.y[i1] - b.y[i0];
          const tm = Math.hypot(tx, ty) || 1;
          tx /= tm;
          ty /= tm;
          const dx = a.x[i] - b.x[i], dy = a.y[i] - b.y[i];
          lat[i] = -ty * dx + tx * dy;
          lon[i] = tx * dx + ty * dy;
        }
        const W2 = 80, sm = /* @__PURE__ */ __name((v) => {
          const pre = [0];
          v.forEach((x, i) => pre.push(pre[i] + x));
          return v.map((x, i) => {
            const lo = Math.max(0, i - W2), hi = Math.min(n - 1, i + W2);
            return x - (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
          });
        }, "sm");
        const lc = sm(lat), oc = sm(lon), ab = oc.map(Math.abs).sort((p, q2) => p - q2);
        if (ab[n >> 1] > 6) return null;
        return lc.map((v, i) => Math.abs(oc[i]) > 20 || Math.abs(v) > 25 ? NaN : v);
      }
      __name(lineOffsets2, "lineOffsets");
      function cornerLine(lat, B, brake, apex) {
        const b = lapShape(B);
        if (!lat || !b) return null;
        const n = Math.min(lat.length, b.N);
        if (apex <= 0 || apex >= n - 1) return null;
        const tan = /* @__PURE__ */ __name((i) => {
          const i0 = Math.max(0, i - 2), i1 = Math.min(n - 1, i + 2), tx = b.x[i1] - b.x[i0], ty = b.y[i1] - b.y[i0], m = Math.hypot(tx, ty) || 1;
          return [tx / m, ty / m];
        }, "tan");
        const t1 = tan(Math.max(0, apex - 8)), t2 = tan(Math.min(n - 1, apex + 8)), cr = t1[0] * t2[1] - t1[1] * t2[0];
        if (Math.abs(cr) < 0.05) return null;
        const sg = cr < 0 ? -1 : 1;
        const at2 = /* @__PURE__ */ __name((i) => {
          let s = 0, c = 0;
          for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) if (!isNaN(lat[k])) {
            s += lat[k];
            c++;
          }
          return c ? s / c * sg : NaN;
        }, "at");
        const r4 = { entry: at2(brake), apex: at2(apex), exit: at2(Math.min(n - 1, apex + 16)) };
        return isNaN(r4.entry) || isNaN(r4.apex) || isNaN(r4.exit) ? null : r4;
      }
      __name(cornerLine, "cornerLine");
      function lineTip(c, sameBrake) {
        if (!c) return null;
        const f = /* @__PURE__ */ __name((v) => Math.abs(v).toFixed(1), "f"), o = [];
        if (c.entry >= 1.5) o.push([
          c.entry,
          sameBrake ? `You brake where the reference does but ${f(c.entry)} m more to the inside. Turn in from the outside` : `You turn in ${f(c.entry)} m more to the inside. Start the corner from the outside`,
          sameBrake ? `Frenas donde la referencia pero ${f(c.entry)} m m\xE1s por dentro. Entra a la curva desde fuera` : `Entras ${f(c.entry)} m m\xE1s por dentro. Empieza la curva desde fuera`,
          sameBrake ? "line_same_brake" : "line_turnin",
          sameBrake ? `Voc\xEA freia onde a refer\xEAncia freia, mas ${f(c.entry)} m mais por dentro. Entre na curva por fora` : `Voc\xEA entra na curva ${f(c.entry)} m mais por dentro. Comece a curva por fora`
        ]);
        if (c.apex <= -1.5) o.push([-c.apex, `You pass ${f(c.apex)} m away from the apex. Get closer to the inside`, `Pasas a ${f(c.apex)} m del v\xE9rtice. Ac\xE9rcate m\xE1s por dentro`, "line_apex", `Voc\xEA passa a ${f(c.apex)} m do \xE1pice. Chegue mais perto da parte de dentro`]);
        if (c.exit >= 1.5) o.push([c.exit, `You use ${f(c.exit)} m less track on exit. Let the car run out to the outside`, `Usas ${f(c.exit)} m menos de pista a la salida. Deja correr el coche hacia fuera`, "line_exit", `Voc\xEA usa ${f(c.exit)} m a menos de pista na sa\xEDda. Deixe o carro abrir at\xE9 a parte de fora`]);
        if (!o.length) return null;
        o.sort((p, q2) => q2[0] - p[0]);
        return [o[0][1], o[0][2], o[0][3], o[0][4]];
      }
      __name(lineTip, "lineTip");
      const OVAL_KINDS = ["superspeedway", "intermediate", "mile", "short", "dirt"];
      const fullShare = /* @__PURE__ */ __name((s) => {
        let f = 0, c = 0;
        for (const b of s) {
          if (!b) continue;
          c++;
          if (b[2] > 0.95) f++;
        }
        return c ? f / c : 0;
      }, "fullShare");
      function ovalOf(A, B, ctx) {
        const o = ctx && ctx.oval;
        if (o === false) return null;
        if (OVAL_KINDS.includes(o)) return o;
        const T3 = ctx && ctx.track || {}, has = /* @__PURE__ */ __name((x, k) => x && x[k] != null && x[k] !== "", "has"), get = /* @__PURE__ */ __name((k) => has(T3, k) ? T3[k] : has(A, k) ? A[k] : has(B, k) ? B[k] : "", "get");
        const cat = String(get("cat")).toLowerCase().replace(/[^a-z]/g, ""), name2 = String(get("track")), cfg = String(get("track_config")), type = String(get("trackType")).toLowerCase(), car = String(get("car"));
        if (/road|roval|infield|rallycross/i.test(cfg) || /road/.test(type) || ["sportscar", "formulacar", "formula", "dirtroad", "road"].includes(cat)) return null;
        const dirt = cat === "dirtoval" || /dirt/.test(type) || !cat && /\bdirt\b|sprint car|midget/i.test(car);
        if (!dirt && cat !== "oval" && !/oval|speedway/.test(type) && !(!cat && /\boval\b|superspeedway/i.test(name2 + " " + cfg))) return null;
        if (dirt) return "dirt";
        const L = +get("len") || (A && Array.isArray(A.bins) ? ((A.maxBin || A.bins.length - 1) + 1) * BIN3 : 0);
        if (/super ?speedway/.test(type) || /daytona|talladega/i.test(name2)) return "superspeedway";
        if (L >= 3e3 && B && Array.isArray(B.bins) && fullShare(serOf(B)) >= 0.97) return "superspeedway";
        return L > 0 && L < 1450 ? "short" : L > 0 && L < 2100 ? "mile" : "intermediate";
      }
      __name(ovalOf, "ovalOf");
      function catGroup(A, B, ctx) {
        const T3 = ctx && ctx.track || {}, c = String(T3.cat || A && A.cat || B && B.cat || "").toLowerCase().replace(/[^a-z]/g, "");
        if (c === "oval") return "oval";
        if (c === "dirtoval") return "dirt_oval";
        if (c === "dirtroad") return "dirt_road";
        if (c) return "road";
        const ov = ovalOf(A, B, ctx);
        return ov === "dirt" ? "dirt_oval" : ov ? "oval" : "";
      }
      __name(catGroup, "catGroup");
      function liftZones(s) {
        const out = [];
        for (let i = 1; i < s.length; i++) {
          const a = s[i], b = s[i - 1];
          if (!a || !b || !(a[2] < 0.9 && b[2] >= 0.9 && a[3] <= 0.12)) continue;
          let k = i, vmin = a[0], imin = i, brk = false;
          while (k < s.length && k < i + 160 && s[k] && s[k][2] < 0.9) {
            if (s[k][0] < vmin) {
              vmin = s[k][0];
              imin = k;
            }
            if (s[k][3] > 0.12) brk = true;
            k++;
          }
          for (let q2 = k; q2 < Math.min(s.length, k + 6); q2++) if (s[q2] && s[q2][0] < vmin) {
            vmin = s[q2][0];
            imin = q2;
          }
          if (!brk && b[0] - vmin > 1.5) out.push({ i, v: b[0], vmin, imin, lift: true });
          i = k;
        }
        return out;
      }
      __name(liftZones, "liftZones");
      function ovalZones(s) {
        const zb = brakeZones2(s);
        return zb.concat(liftZones(s).filter((l) => !zb.some((z) => l.i <= z.imin && z.i <= l.imin + 10))).sort((a, b) => a.i - b.i);
      }
      __name(ovalZones, "ovalZones");
      function dirtLineTip(c) {
        if (!c || !(Math.abs(c.apex) >= 2)) return null;
        const f = Math.abs(c.apex).toFixed(1);
        return c.apex < 0 ? [`You run ${f} m higher than the reference through the middle of the corner. Try its lower groove`, `Vas ${f} m m\xE1s arriba que la referencia en mitad de la curva. Prueba su l\xEDnea m\xE1s baja`, "dirt_groove", `Voc\xEA passa ${f} m mais alto que a refer\xEAncia no meio da curva. Experimente a linha mais baixa dela`] : [`The reference runs ${f} m higher through the middle of the corner. Try its groove higher up`, `La referencia va ${f} m m\xE1s arriba en mitad de la curva. Prueba su l\xEDnea m\xE1s alta`, "dirt_groove", `A refer\xEAncia passa ${f} m mais alto no meio da curva. Experimente a linha mais alta dela`];
      }
      __name(dirtLineTip, "dirtLineTip");
      const lineTipOf = /* @__PURE__ */ __name((c, sameBrake, oval) => oval === "dirt" ? dirtLineTip(c) : oval === "superspeedway" ? null : lineTip(c, sameBrake), "lineTipOf");
      function brakeZones2(s) {
        const out = [];
        for (let i = 1; i < s.length; i++) {
          const a = s[i], b = s[i - 1];
          if (!a || !b) continue;
          if (a[3] > 0.12 && b[3] <= 0.12) {
            let k = i, vmin = a[0], imin = i;
            while (k < s.length && k < i + 120 && s[k] && !(s[k][2] > 0.6 && s[k][3] < 0.05)) {
              if (s[k][0] < vmin) {
                vmin = s[k][0];
                imin = k;
              }
              k++;
            }
            if (a[0] - vmin > 4) out.push({ i, v: a[0], vmin, imin });
            i = k;
          }
        }
        return out;
      }
      __name(brakeZones2, "brakeZones");
      const PHASES = [["brake", "Braking", "Frenada", "Frenagem"], ["entry", "Entry", "Entrada", "Entrada"], ["apex", "Apex", "V\xE9rtice", "\xC1pice"], ["exit", "Exit", "Salida", "Sa\xEDda"]];
      const phaseName = /* @__PURE__ */ __name((k, ctx) => {
        const p = PHASES.find((x) => x[0] === k);
        return p ? txOf(ctx)(p[1], p[2], p[3]) : "";
      }, "phaseName");
      function turnNo(turns, d, L, fb) {
        const t = turns;
        if (!t || !t.length || !(L > 0)) return fb;
        const f = (d / L % 1 + 1) % 1;
        let bi = 0, bd = 2;
        t.forEach((x, i) => {
          let dd = Math.abs(x - f);
          dd = Math.min(dd, 1 - dd);
          if (dd < bd) {
            bd = dd;
            bi = i;
          }
        });
        return bi + 1;
      }
      __name(turnNo, "turnNo");
      const COACH_GEN = ["brake_generic", "entry_speed", "apex_line", "full_throttle", "brake_same", "entry_before", "apex_longer"];
      const cornerClass = /* @__PURE__ */ __name((v) => v < 22 ? "slow" : v < 42 ? "medium" : "fast", "cornerClass");
      function cornerZones(sb, n, turns, oval) {
        const zb = oval ? ovalZones(sb) : brakeZones2(sb), t = turns;
        if (!t || !t.length || !(n > 0)) return zb;
        const ap = t.map((f) => Math.round(f * n)).filter((i) => i > 0 && i < n - 1), near = /* @__PURE__ */ __name((i) => {
          let b = -1, bd = 1e9;
          ap.forEach((a, k) => {
            const d = Math.abs(a - i);
            if (d < bd) {
              bd = d;
              b = k;
            }
          });
          return bd <= 30 ? b : -1;
        }, "near");
        const by = /* @__PURE__ */ new Map();
        zb.forEach((z) => {
          const k = near(z.imin);
          if (k < 0) {
            by.set("z" + z.i, z);
            return;
          }
          const o = by.get(k);
          if (!o) by.set(k, { ...z, turn: k });
          else {
            if (!z.lift) delete o.lift;
            if (z.vmin < o.vmin) {
              o.vmin = z.vmin;
              o.imin = z.imin;
            }
            o.i = Math.min(o.i, z.i);
            o.v = Math.max(o.v, z.v);
          }
        });
        ap.forEach((a, k) => {
          if (by.has(k)) return;
          let i0 = Math.max(0, a - 20);
          for (let i = a; i > Math.max(0, a - 40); i--) if (sb[i] && sb[i][2] > 0.9) {
            i0 = i;
            break;
          }
          let imin = a, vmin = sb[a] ? sb[a][0] : 0;
          for (let i = i0; i < Math.min(n, a + 10); i++) if (sb[i] && sb[i][0] < vmin) {
            vmin = sb[i][0];
            imin = i;
          }
          const v = sb[i0] ? sb[i0][0] : vmin;
          if (v - vmin > 2) by.set(k, { i: i0, v, vmin, imin, turn: k, lift: true });
        });
        return [...by.values()].sort((a, b) => a.i - b.i);
      }
      __name(cornerZones, "cornerZones");
      function coachCompare(A, B, ctx) {
        const { spd, spdU } = unitsOf(ctx), C = coachOf(ctx), tipAsk = C.ask, tipOff = C.off, turns = turnsOf(ctx);
        const oval = ovalOf(A, B, ctx), est = estOf(B, ctx), sa = serOf(A), sb = serOf(B), n = Math.min(sa.length, sb.length), zb = cornerZones(sb, n, turns, oval), za = oval ? ovalZones(sa) : brakeZones2(sa), lat = lineOffsets2(A, B);
        if (oval) za.forEach((q2) => {
          if (q2.imin >= n || !sb[q2.i] || !sb[q2.imin] || zb.some((z) => q2.imin >= z.i - 20 && q2.i <= z.imin + 30)) return;
          for (let k = q2.i; k <= q2.imin; k++) if (sb[k] && sb[k][2] < 0.9) return;
          zb.push({ i: q2.i, imin: q2.imin, v: sb[q2.i][0], vmin: sb[q2.imin][0], lift: true, flatB: true });
        });
        if (oval) zb.sort((a, b) => a.i - b.i);
        const failed = failedOf(ctx);
        const T3 = /* @__PURE__ */ __name((s, i) => s[i] && s[i][1], "T"), seg = /* @__PURE__ */ __name((x, y) => x < y && sa[x] && sa[y] && sb[x] && sb[y] ? T3(sa, y) - T3(sa, x) - (T3(sb, y) - T3(sb, x)) : 0, "seg");
        const peak = /* @__PURE__ */ __name((s, x, y) => {
          let p = 0, ip = x;
          for (let k = x; k <= y && k < s.length; k++) if (s[k] && s[k][3] > p) {
            p = s[k][3];
            ip = k;
          }
          return [p, ip];
        }, "peak");
        const release = /* @__PURE__ */ __name((s, from, to) => {
          for (let k = from; k <= to && k < s.length; k++) if (s[k] && s[k][3] < 0.05) return k;
          return to;
        }, "release");
        const coast = /* @__PURE__ */ __name((s, x, y) => {
          let c = 0;
          for (let k = x; k <= y && k < s.length; k++) if (s[k] && s[k][2] < 0.05 && s[k][3] < 0.05) c++;
          return c * BIN3;
        }, "coast");
        const pickup = /* @__PURE__ */ __name((s, from, to) => {
          for (let k = from; k <= to && k < s.length; k++) if (s[k] && s[k][2] > 0.5) return k;
          return null;
        }, "pickup");
        return zb.map((z, k) => {
          const m = za.filter((q2) => Math.abs(q2.i - z.i) <= 20).sort((p, q2) => Math.abs(p.i - z.i) - Math.abs(q2.i - z.i))[0];
          const i0 = Math.max(0, z.i - 10), i1 = Math.min(n - 1, z.imin + 30);
          if (!sa[i0] || !sa[i1] || !sb[i0] || !sb[i1]) return null;
          const lost = sa[i1][1] - sa[i0][1] - (sb[i1][1] - sb[i0][1]);
          const dd = m ? (m.i - z.i) * BIN3 : null, dmin = m ? spd(m.vmin) - spd(z.vmin) : null;
          const [pb, ipb] = peak(sb, z.i, z.imin), rel = Math.min(release(sb, ipb, z.imin), z.imin), a0 = Math.max(rel, z.imin - 4), a1 = Math.min(i1, z.imin + 4);
          const ph = { brake: seg(i0, rel), entry: seg(rel, a0), apex: seg(a0, a1), exit: seg(a1, i1) };
          const worst = Object.entries(ph).sort((p, q2) => q2[1] - p[1])[0];
          const [pa, ipa] = m ? peak(sa, m.i, m.imin) : [0, 0], relA = m ? release(sa, ipa, m.imin) : 0;
          const trailA = m ? (relA - ipa) * BIN3 : null, trailB = (rel - ipb) * BIN3, coastA = coast(sa, i0, i1), coastB = coast(sb, i0, i1);
          const ramp = /* @__PURE__ */ __name((s, from, to) => {
            let a = null;
            for (let k2 = from; k2 <= to && k2 < s.length; k2++) {
              if (!s[k2]) continue;
              if (a == null && s[k2][2] > 0.05) a = k2;
              if (a != null && s[k2][2] > 0.95) return (k2 - a) * BIN3;
            }
            return null;
          }, "ramp"), rampA = m ? ramp(sa, m.imin, i1) : null, rampB = ramp(sb, z.imin, i1);
          const puA = m ? pickup(sa, m.imin, i1) : null, puB = pickup(sb, z.imin, i1), late = puA != null && puB != null ? (puA - puB) * BIN3 : null;
          const gearAt = /* @__PURE__ */ __name((s, i) => s[i] && isFinite(s[i][4]) ? Math.round(s[i][4]) : 0, "gearAt"), apexA = m ? m.imin : z.imin, gA = gearAt(sa, apexA), gB = gearAt(sb, z.imin);
          const lifts = /* @__PURE__ */ __name((s, from, to) => {
            let n2 = 0, prev = -1;
            for (let k2 = from; k2 <= to && k2 < s.length; k2++) {
              if (!s[k2]) continue;
              const t = s[k2][2];
              if (prev >= 0 && prev > 0.8 && t < 0.5) n2++;
              prev = t;
            }
            return n2;
          }, "lifts"), lA = lifts(sa, apexA, i1), lB = lifts(sb, z.imin, i1);
          const revs = /* @__PURE__ */ __name((s, from, to) => {
            let n2 = 0, prevD = 0, last = null, has = false;
            for (let k2 = from; k2 <= to && k2 < s.length; k2++) {
              if (!s[k2] || !isFinite(s[k2][5])) continue;
              const v = s[k2][5];
              if (v !== 0) has = true;
              if (last != null) {
                const d = v - last;
                if (Math.abs(d) > 4e-3) {
                  if (prevD !== 0 && Math.sign(d) !== Math.sign(prevD)) n2++;
                  prevD = d;
                }
              }
              last = v;
            }
            return [n2, has];
          }, "revs"), [rA, hasA] = revs(sa, i0, i1), [rB, hasB] = revs(sb, i0, i1);
          let en = "", es = "", pt = "", phase = null, kind = "", alt = null;
          const say2 = /* @__PURE__ */ __name((k2, a, b, c) => {
            kind = k2;
            en = a;
            es = b;
            pt = c;
          }, "say");
          const cls = cornerClass(z.vmin);
          if (lost > 0.03) {
            const decide = /* @__PURE__ */ __name((p0) => {
              en = "";
              es = "";
              pt = "";
              kind = "";
              phase = p0;
              if (z.lift && phase === "brake") phase = "entry";
              const r4 = Math.round;
              const askA = tipAsk("brake_late_apex", cls), askE = tipAsk("brake_earlier", cls), askL = tipAsk("brake_later", cls);
              if (m && dd != null && dd > 6 && dmin != null && dmin < -2) say2("brake_late_apex", `You brake ${r4(dd)} m later than the reference and lose ${r4(-dmin)} ${spdU()} at the apex. Brake ${askA && askA < r4(dd) ? askA + " m" : "a little"} earlier and carry the speed`, `Frenas ${r4(dd)} m m\xE1s tarde que la referencia y pierdes ${r4(-dmin)} ${spdU()} en el v\xE9rtice. Frena ${askA && askA < r4(dd) ? askA + " m" : "un poco"} antes y conserva la velocidad`, `Voc\xEA freia ${r4(dd)} m depois da refer\xEAncia e perde ${r4(-dmin)} ${spdU()} no \xE1pice. Freie ${askA && askA < r4(dd) ? askA + " m" : "um pouco"} antes e leve a velocidade`);
              else if (phase === "brake") {
                if (dd != null && dd < -6) {
                  const mv = askL && askL < r4(-dd) ? askL : r4(-dd);
                  say2("brake_later", `Brake ${mv} m later`, `Frena ${mv} m m\xE1s tarde`, `Freie ${mv} m depois`);
                } else if (!est && m && pa < pb - 0.05) say2("brake_harder", `Brake harder at first (${r4(pa * 100)} % vs ${r4(pb * 100)} %)`, `Pisa m\xE1s fuerte al empezar a frenar (${r4(pa * 100)} % frente a ${r4(pb * 100)} %)`, `Freie mais forte no in\xEDcio (${r4(pa * 100)} % contra ${r4(pb * 100)} %)`);
                else if (dd != null && dd > 6) say2("brake_earlier", `You braked ${r4(dd)} m too late and lost the corner. Brake ${askE && askE < r4(dd) ? askE + " m" : ""} earlier`.replace("  ", " "), `Frenaste ${r4(dd)} m demasiado tarde y perdiste la curva. Frena ${askE && askE < r4(dd) ? askE + " m " : ""}antes`, `Voc\xEA freou ${r4(dd)} m tarde demais e perdeu a curva. Freie ${askE && askE < r4(dd) ? askE + " m " : ""}antes`);
                else if (!est && trailA != null && trailB - trailA >= 15) say2("trail", `Release the brake more gradually into the turn (trail braking ${r4(trailA)} m vs ${r4(trailB)} m)`, `Suelta el freno m\xE1s progresivamente al entrar (trail braking ${r4(trailA)} m frente a ${r4(trailB)} m)`, `Solte o freio de forma mais gradual ao entrar na curva (trail braking ${r4(trailA)} m contra ${r4(trailB)} m)`);
                else if (est && dd != null) say2("brake_speed", "You brake where the reference does but it carries more speed through the braking zone. Brake a touch less and roll more speed in", "Frenas donde la referencia pero ella lleva m\xE1s velocidad en la frenada. Frena un poco menos y deja correr m\xE1s velocidad", "Voc\xEA freia onde a refer\xEAncia freia, mas ela leva mais velocidade na zona de frenagem. Freie um pouco menos e leve mais velocidade para dentro");
                else if (dd != null) say2("brake_same", "Same braking point but slower through the braking zone. Brake hard at once, then release progressively", "Mismo punto de frenada pero m\xE1s lento en la frenada. Pisa fuerte de golpe y suelta progresivamente", "Mesmo ponto de frenagem, mas mais lento na zona de frenagem. Freie forte de uma vez e depois solte aos poucos");
                else say2("brake_generic", "Brake a little later and harder", "Frena un poco m\xE1s tarde y m\xE1s fuerte", "Freie um pouco depois e mais forte");
              } else if (phase === "entry") {
                if (!est && trailA != null && trailB - trailA >= 15) say2("trail", `Release the brake more gradually into the turn (trail braking ${r4(trailA)} m vs ${r4(trailB)} m)`, `Suelta el freno m\xE1s progresivamente al entrar (trail braking ${r4(trailA)} m frente a ${r4(trailB)} m)`, `Solte o freio de forma mais gradual ao entrar na curva (trail braking ${r4(trailA)} m contra ${r4(trailB)} m)`);
                else if (!est && coastA - coastB >= 10) say2("coast", `Do not coast before the apex. ${r4(coastA)} m without throttle or brake (reference ${r4(coastB)} m)`, `No vayas sin gas ni freno antes del v\xE9rtice. ${r4(coastA)} m (referencia ${r4(coastB)} m)`, `N\xE3o v\xE1 no embalo antes do \xE1pice. ${r4(coastA)} m sem acelerador nem freio (refer\xEAncia ${r4(coastB)} m)`);
                else if (dmin != null && dmin >= 0) say2("entry_before", "You reach the apex as fast as the reference, so the time goes before it. Release the brake more gradually as you turn in", "Llegas al v\xE9rtice tan r\xE1pido como la referencia, as\xED que el tiempo se va antes. Suelta el freno m\xE1s progresivamente al girar", "Voc\xEA chega ao \xE1pice t\xE3o r\xE1pido quanto a refer\xEAncia, ent\xE3o o tempo se perde antes. Solte o freio de forma mais gradual ao entrar na curva");
                else say2("entry_speed", "Carry more speed into the turn", "Entra con m\xE1s velocidad en la curva", "Leve mais velocidade para dentro da curva");
              } else if (phase === "apex") {
                if (dmin != null && dmin < -2) say2("apex_speed", `Carry ${r4(-dmin)} ${spdU()} more through the apex`, `Pasa ${r4(-dmin)} ${spdU()} m\xE1s r\xE1pido por el v\xE9rtice`, `Passe pelo \xE1pice com ${r4(-dmin)} ${spdU()} a mais`);
                else if (dmin != null && dmin >= 0) say2("apex_longer", "As fast at the slowest point but slow for longer. Shorten the slow part of the corner (turn in later, later apex)", "Igual de r\xE1pido en el punto m\xE1s lento, pero lento durante m\xE1s metros. Acorta la parte lenta de la curva (gira m\xE1s tarde, v\xE9rtice m\xE1s tard\xEDo)", "T\xE3o r\xE1pido no ponto mais lento, mas lento por mais tempo. Encurte a parte lenta da curva (entre mais tarde, \xE1pice mais tardio)");
                else say2("apex_line", "A rounder, faster line through the apex", "Una trazada m\xE1s redonda y r\xE1pida por el v\xE9rtice", "Uma linha mais redonda e r\xE1pida pelo \xE1pice");
              } else {
                if (late != null && late >= 8) say2("throttle", `Get on the throttle ${r4(late)} m earlier`, `Acelera ${r4(late)} m antes`, `Acelere ${r4(late)} m antes`);
                else if (!est && rampA != null && rampB != null && rampB - rampA >= 15 && (lA >= 1 && lA > lB || hasA && hasB && rA > rB + 1)) say2("throttle_rough", `You open the throttle faster than the reference and then have to correct. Open it more progressively (${Math.round(rampA)} m to full vs ${Math.round(rampB)} m)`, `Abres el gas m\xE1s r\xE1pido que la referencia y luego tienes que corregir. \xC1brelo m\xE1s progresivo (${Math.round(rampA)} m hasta el fondo frente a ${Math.round(rampB)} m)`, `Voc\xEA abre o acelerador mais r\xE1pido que a refer\xEAncia e depois precisa corrigir. Abra de forma mais progressiva (${Math.round(rampA)} m at\xE9 o fundo contra ${Math.round(rampB)} m)`);
                else if (!est && rampA != null && rampB != null && rampA - rampB >= 15) say2("throttle_slow", `You take ${Math.round(rampA)} m to reach full throttle (reference ${Math.round(rampB)} m). Squeeze it to full sooner`, `Tardas ${Math.round(rampA)} m en llegar a fondo (referencia ${Math.round(rampB)} m). Llega al 100 % antes`, `Voc\xEA leva ${Math.round(rampA)} m para chegar ao acelerador a fundo (refer\xEAncia ${Math.round(rampB)} m). Pise at\xE9 o fundo mais cedo`);
                else if (!est && coastA - coastB >= 10) say2("no_wait", "Do not wait between the brake and the throttle", "No esperes entre el freno y el acelerador", "N\xE3o espere entre o freio e o acelerador");
                else if (late != null && late <= -8 && dmin != null && dmin < -1) say2("exit_speed", `You pick up the throttle ${r4(-late)} m earlier but leave the apex ${r4(-dmin)} ${spdU()} slower. Carry the speed through the apex and the exit follows`, `Aceleras ${r4(-late)} m antes pero sales del v\xE9rtice ${r4(-dmin)} ${spdU()} m\xE1s lento. Conserva la velocidad en el v\xE9rtice y la salida vendr\xE1 sola`, `Voc\xEA acelera ${r4(-late)} m antes, mas sai do \xE1pice ${r4(-dmin)} ${spdU()} mais lento. Leve a velocidade pelo \xE1pice e a sa\xEDda vem junto`);
                else say2("full_throttle", "Full throttle sooner on exit", "Acelerador a fondo antes en la salida", "Acelerador a fundo mais cedo na sa\xEDda");
              }
              if (COACH_GEN.includes(kind)) {
                if (est) {
                } else if (gA >= 1 && gB >= 1 && gB > gA) say2("gear_up", `Take this corner in gear ${gB} like the reference (you use gear ${gA})`, `Toma esta curva en ${gB}\xAA como la referencia (t\xFA vas en ${gA}\xAA)`, `Fa\xE7a esta curva em ${gB}\xAA marcha como a refer\xEAncia (voc\xEA usa a ${gA}\xAA)`);
                else if (gA >= 1 && gB >= 1 && gB < gA) say2("gear_down", `Drop to gear ${gB} for the apex like the reference (you stay in gear ${gA})`, `Baja a ${gB}\xAA en el v\xE9rtice como la referencia (t\xFA te quedas en ${gA}\xAA)`, `Reduza para a ${gB}\xAA marcha no \xE1pice como a refer\xEAncia (voc\xEA fica na ${gA}\xAA)`);
                else if (phase === "exit" && lA >= 2 && lA > lB + 1) say2("lifts", `Smoother throttle on exit. You lifted ${lA} times after the apex (reference ${lB})`, `Acelera m\xE1s progresivo a la salida. Levantaste ${lA} veces tras el v\xE9rtice (referencia ${lB})`, `Acelerador mais suave na sa\xEDda. Voc\xEA aliviou ${lA} vezes depois do \xE1pice (refer\xEAncia ${lB})`);
                else if (oval !== "dirt" && hasA && hasB && rA >= 3 && rA > rB + 2) say2("steer", `${rA} steering corrections in this corner (reference ${rB}). Turn in once, smoothly`, `${rA} correcciones de volante en esta curva (referencia ${rB}). Gira una vez, suave`, `${rA} corre\xE7\xF5es de volante nesta curva (refer\xEAncia ${rB}). Gire uma vez, com suavidade`);
              }
              if (oval && (z.lift || z.flatB)) {
                const x0 = Math.max(0, z.i - 30), pc = /* @__PURE__ */ __name((v) => Math.round(v * 100) + " %", "pc"), u = spdU();
                const thrMin = /* @__PURE__ */ __name((s) => {
                  let t = 1;
                  for (let q2 = x0; q2 <= i1 && q2 < s.length; q2++) if (s[q2] && s[q2][2] < t) t = s[q2][2];
                  return t;
                }, "thrMin");
                const offFull = /* @__PURE__ */ __name((s) => {
                  let c = 0;
                  for (let q2 = x0; q2 <= i1 && q2 < s.length; q2++) if (s[q2] && s[q2][2] < 0.9) c++;
                  return c * BIN3;
                }, "offFull");
                const mA = thrMin(sa), mB = thrMin(sb), oA = offFull(sa), oB = offFull(sb), bA = peak(sa, x0, i1)[0], bB = peak(sb, x0, i1)[0];
                if (z.flatB) say2("oval_flat", `The reference stays flat out here and you lift for ${r4(oA)} m (down to ${pc(mA)}). Stay flat out`, `La referencia va a fondo aqu\xED y t\xFA levantas durante ${r4(oA)} m (hasta el ${pc(mA)}). Mant\xE9n el pie a fondo`, `A refer\xEAncia vai de p\xE9 no fundo aqui e voc\xEA alivia por ${r4(oA)} m (at\xE9 ${pc(mA)}). Mantenha o p\xE9 no fundo`);
                else if (!est && bA > 0.12 && bB <= 0.12) say2("oval_no_brake", `The reference only lifts here (down to ${pc(mB)}) and you brake. Lift instead and roll the speed into the corner`, `La referencia solo levanta aqu\xED (hasta el ${pc(mB)}) y t\xFA frenas. Levanta en vez de frenar y deja correr la velocidad en la curva`, `A refer\xEAncia s\xF3 alivia aqui (at\xE9 ${pc(mB)}) e voc\xEA freia. Alivie em vez de frear e leve a velocidade para dentro da curva`);
                else if (m && dd != null && dd < -8) say2("oval_lift_later", `You lift ${r4(-dd)} m before the reference. Lift later`, `Levantas ${r4(-dd)} m antes que la referencia. Levanta m\xE1s tarde`, `Voc\xEA alivia ${r4(-dd)} m antes da refer\xEAncia. Alivie mais tarde`);
                else if (m && dd != null && dd > 8 && dmin != null && dmin < -2) say2("oval_lift_early", `You lift ${r4(dd)} m later than the reference and lose ${r4(-dmin)} ${u} in the middle of the corner. Lift a touch earlier and carry the speed through the center`, `Levantas ${r4(dd)} m m\xE1s tarde que la referencia y pierdes ${r4(-dmin)} ${u} en mitad de la curva. Levanta un poco antes y conserva la velocidad en el centro`, `Voc\xEA alivia ${r4(dd)} m depois da refer\xEAncia e perde ${r4(-dmin)} ${u} no meio da curva. Alivie um pouco antes e leve a velocidade pelo centro`);
                else if (!est && mA < mB - 0.15) say2("oval_lift_less", `You lift to ${pc(mA)} (reference ${pc(mB)}). A lighter lift is enough here`, `Levantas hasta el ${pc(mA)} (referencia ${pc(mB)}). Aqu\xED basta con levantar menos`, `Voc\xEA alivia at\xE9 ${pc(mA)} (refer\xEAncia ${pc(mB)}). Aqui basta aliviar menos`);
                else if (!est && oA - oB >= 15) say2("oval_back_flat", `You stay off full throttle for ${r4(oA)} m (reference ${r4(oB)} m). Back to flat out sooner`, `Vas sin el gas a fondo durante ${r4(oA)} m (referencia ${r4(oB)} m). Vuelve a fondo antes`, `Voc\xEA fica sem o acelerador a fundo por ${r4(oA)} m (refer\xEAncia ${r4(oB)} m). Volte ao fundo mais cedo`);
                else if (dmin != null && dmin < -2) say2("oval_center", `Carry ${r4(-dmin)} ${u} more through the middle of the corner`, `Pasa ${r4(-dmin)} ${u} m\xE1s r\xE1pido por el centro de la curva`, `Passe pelo meio da curva com ${r4(-dmin)} ${u} a mais`);
                else if (/^(brake|trail|entry_|apex_)/.test(kind)) say2("oval_roll", "Roll more speed into the corner with one smooth, lighter lift", "Deja correr m\xE1s velocidad en la curva con un solo levant\xF3n suave y m\xE1s corto", "Leve mais velocidade para dentro da curva com um s\xF3 al\xEDvio, suave e mais leve");
              }
            }, "decide");
            decide(worst[0]);
            const bad = failed(z.imin * BIN3);
            if (bad && bad.has(kind)) {
              const was = kind, order2 = Object.entries(ph).sort((p, q2) => q2[1] - p[1]).slice(1);
              for (const [p2, v] of order2) {
                if (v < 0.02) break;
                decide(p2);
                if (kind && kind !== was && !bad.has(kind)) {
                  alt = was;
                  break;
                }
              }
              if (!alt) decide(worst[0]);
            }
            if (tipOff(kind, cls)) {
              const G = { brake: ["brake_generic", "Brake a little later and harder", "Frena un poco m\xE1s tarde y m\xE1s fuerte", "Freie um pouco depois e mais forte"], entry: ["entry_speed", "Carry more speed into the turn", "Entra con m\xE1s velocidad en la curva", "Leve mais velocidade para dentro da curva"], apex: ["apex_line", "A rounder, faster line through the apex", "Una trazada m\xE1s redonda y r\xE1pida por el v\xE9rtice", "Uma linha mais redonda e r\xE1pida pelo \xE1pice"], exit: ["full_throttle", "Full throttle sooner on exit", "Acelerador a fondo antes en la salida", "Acelerador a fundo mais cedo na sa\xEDda"] };
              say2(...G[phase] || G.brake);
            }
          }
          const line = cornerLine(lat, B, z.i, z.imin), lt = lost > 0.03 ? lineTipOf(line, m && dd != null && Math.abs(dd) <= 6, oval) : null;
          if (lt) {
            const generic = COACH_GEN.includes(kind) || kind === "oval_roll";
            if (generic || phase === "brake" && m && Math.abs(dd) <= 6) {
              en = lt[0];
              es = lt[1];
              kind = lt[2];
              pt = lt[3];
            } else {
              en += ". " + lt[0];
              es += ". " + lt[1];
              pt += ". " + lt[3];
            }
          }
          const ta = sa[i1][1] - sa[i0][1], tb = sb[i1][1] - sb[i0][1];
          return { n: z.turn != null ? z.turn + 1 : turnNo(turns, z.imin * BIN3, n * BIN3, k + 1), d: z.i * BIN3, apex: z.imin * BIN3, dd, ve: m ? spd(m.v) : null, vr: spd(z.v), vmin: m ? spd(m.vmin) : null, vminr: spd(z.vmin), lost, ph, phase, coastA, coastB, trailA, trailB, late, line, tip: [en, es, pt], kind, cls, ta, tb, gA, gB, lift: !!z.lift, pua: puA != null ? puA * BIN3 : null, pur: puB != null ? puB * BIN3 : null, stA: hasA && hasB ? steerMax(sa, i0, i1) : null, stB: hasA && hasB ? steerMax(sb, i0, i1) : null, rA, rB, lA, lB, ...alt ? { alt } : {}, ...oval ? { oval, flatB: !!z.flatB } : {}, ...est ? { est: true } : {} };
        }).filter(Boolean);
      }
      __name(coachCompare, "coachCompare");
      function steerMax(s, x, y) {
        let m = 0;
        for (let k = x; k <= y && k < s.length; k++) if (s[k] && isFinite(s[k][5]) && Math.abs(s[k][5]) > m) m = Math.abs(s[k][5]);
        return m;
      }
      __name(steerMax, "steerMax");
      function cornerConsistency(laps, R, turns, oval) {
        const sb = serOf(R), zb = cornerZones(sb, sb.length, turns, oval);
        if (laps.length < 3) return null;
        const per = zb.map((z) => {
          const ts = laps.map((L) => {
            const s = serOf(L), i0 = Math.max(0, z.i - 10), i1 = Math.min(s.length - 1, z.imin + 30);
            return s[i0] && s[i1] ? s[i1][1] - s[i0][1] : null;
          }).filter((x) => x != null);
          if (ts.length < 3) return null;
          const mu = ts.reduce((a, b) => a + b, 0) / ts.length;
          return Math.sqrt(ts.reduce((a, b) => a + (b - mu) * (b - mu), 0) / ts.length);
        });
        return per.map((sd2, i) => ({ n: zb[i].turn != null ? zb[i].turn + 1 : i + 1, sd: sd2 })).filter((x) => x.sd != null).sort((a, b) => b.sd - a.sd);
      }
      __name(cornerConsistency, "cornerConsistency");
      function pairSecs(A, B, sa, sb, n) {
        const third = Math.floor(n / 3), tAt2 = /* @__PURE__ */ __name((s, i) => {
          for (let k = Math.min(i, n - 1); k >= 0; k--) if (s.arr[k]) return s.arr[k][1];
          return 0;
        }, "tAt");
        const gameSecs = /* @__PURE__ */ __name((L) => Array.isArray(L.sectors) && L.sectors.length >= 2 && L.sectors.every((v) => v > 0) && Math.abs(L.sectors.reduce((p, v) => p + v, 0) - L.time) < 1 ? L.sectors : null, "gameSecs");
        const traceSecs = /* @__PURE__ */ __name((s, L) => {
          const c1 = tAt2(s, third), c2 = tAt2(s, 2 * third), ok = c1 > 0 && c2 > c1 && c2 < L.time;
          return ok ? [c1, c2 - c1, L.time - c2] : null;
        }, "traceSecs");
        const ga = gameSecs(A), gb = gameSecs(B), useGame = ga && gb && ga.length === gb.length, qa = useGame ? ga : traceSecs(sa, A), qb = useGame ? gb : traceSecs(sb, B);
        return qa && qb ? qa.map((v, k) => [v, qb[k]]) : [];
      }
      __name(pairSecs, "pairSecs");
      function lapDriving(sa, sb, n, ctx) {
        const Tx = txOf(ctx);
        const m = /* @__PURE__ */ __name((s) => {
          let full = 0, coast = 0, c = 0, lifts = 0, steer = 0, rev = 0, hasS = false, prevT = null, prevD = 0, lastS = null;
          for (let i = 0; i < n; i++) {
            const b2 = s.arr[i];
            if (!b2) continue;
            c++;
            const t = b2[2], k = b2[3];
            if (t > 0.95) full++;
            if (t < 0.05 && k < 0.05) coast++;
            if (prevT != null && prevT > 0.9 && t < 0.6 && k < 0.05) lifts++;
            prevT = t;
            if (isFinite(b2[5])) {
              hasS = true;
              if (lastS != null) {
                const d = b2[5] - lastS;
                steer += Math.abs(d);
                if (Math.abs(d) > 4e-3 && Math.sign(d) !== Math.sign(prevD) && prevD !== 0) rev++;
                if (Math.abs(d) > 4e-3) prevD = d;
              }
              lastS = b2[5];
            }
          }
          return { full: c ? full / c : 0, coast: c ? coast / c : 0, lifts, steer, rev, hasS };
        }, "m");
        if (estOf(null, ctx)) return [];
        const a = m(sa), b = m(sb), out = [], pc = /* @__PURE__ */ __name((v) => Math.round(v * 100) + "%", "pc");
        if (b.full - a.full > 0.03) out.push("\u{1F9B6} " + Tx(`A is flat out ${pc(a.full)} of the lap, B ${pc(b.full)}. Get back on the throttle sooner on the corner exits.`, `A va a fondo el ${pc(a.full)} de la vuelta, B el ${pc(b.full)}. Vuelve al acelerador antes a la salida de las curvas.`, `A vai de p\xE9 no fundo ${pc(a.full)} da volta, B ${pc(b.full)}. Volte ao acelerador antes na sa\xEDda das curvas.`));
        if (a.coast - b.coast > 0.02) out.push("\u{1F4A4} " + Tx(`A spends ${pc(a.coast)} of the lap with no pedal (B ${pc(b.coast)}). Go from brake to throttle without waiting in between.`, `A pasa el ${pc(a.coast)} de la vuelta sin pisar ning\xFAn pedal (B el ${pc(b.coast)}). Pasa del freno al acelerador sin esperar entre medias.`, `A passa ${pc(a.coast)} da volta sem pedal (B ${pc(b.coast)}). V\xE1 do freio ao acelerador sem esperar.`));
        if (a.lifts > b.lifts + 1) out.push("\u2195\uFE0F " + Tx(`A lifts off the throttle ${a.lifts} times in the middle of a corner (B ${b.lifts}). A smoother entry lets you stay on the throttle.`, `A levanta el pie del acelerador ${a.lifts} veces en mitad de curva (B ${b.lifts}). Una entrada m\xE1s suave te deja mantener el gas.`, `A tira o p\xE9 ${a.lifts} vezes no meio da curva (B ${b.lifts}). Uma entrada mais suave deixa voc\xEA manter o acelerador.`));
        if (ovalOf(null, null, ctx) !== "dirt" && a.hasS && b.hasS && b.steer > 0 && a.steer > b.steer * 1.15) out.push("\u{1F3AF} " + Tx(`A turns the wheel ${Math.round((a.steer / b.steer - 1) * 100)}% more than B and corrects it ${a.rev} times (B ${b.rev}). The car is sliding or you go in too fast. Smoother hands, a little less speed at the turn-in.`, `A gira el volante un ${Math.round((a.steer / b.steer - 1) * 100)} % m\xE1s que B y lo corrige ${a.rev} veces (B ${b.rev}). El coche desliza o entras demasiado r\xE1pido. Manos m\xE1s suaves y un poco menos de velocidad al girar.`, `A gira o volante ${Math.round((a.steer / b.steer - 1) * 100)}% mais que B e corrige ${a.rev} vezes (B ${b.rev}). O carro est\xE1 escorregando ou voc\xEA entra r\xE1pido demais. M\xE3os mais suaves, um pouco menos de velocidade na entrada.`));
        return out;
      }
      __name(lapDriving, "lapDriving");
      const KIND_NAMES2 = {
        brake_late_apex: ["Brakes later and loses the apex", "Frena m\xE1s tarde y pierde el v\xE9rtice", "Freia depois e perde o \xE1pice"],
        brake_later: ["Brake later", "Frenar m\xE1s tarde", "Frear depois"],
        brake_harder: ["Brake harder at first", "Pisar m\xE1s fuerte al empezar", "Frear mais forte no in\xEDcio"],
        brake_earlier: ["Braked too late", "Fren\xF3 demasiado tarde", "Freou tarde demais"],
        trail: ["Trail braking", "Trail braking", "Trail braking"],
        brake_same: ["Same point, slower braking zone", "Mismo punto, frenada m\xE1s lenta", "Mesmo ponto, frenagem mais lenta"],
        brake_generic: ["Brake later and harder", "Frenar m\xE1s tarde y fuerte", "Frear depois e mais forte"],
        brake_speed: ["More speed through the braking zone", "M\xE1s velocidad en la frenada", "Mais velocidade na frenagem"],
        coast: ["Coasting before the apex", "Inercia antes del v\xE9rtice", "Embalo antes do \xE1pice"],
        entry_before: ["Time before the apex", "Tiempo antes del v\xE9rtice", "Tempo antes do \xE1pice"],
        entry_speed: ["More speed into the turn", "M\xE1s velocidad al entrar", "Mais velocidade na entrada"],
        apex_speed: ["More speed at the apex", "M\xE1s velocidad en el v\xE9rtice", "Mais velocidade no \xE1pice"],
        apex_longer: ["Slow for longer", "Lento durante m\xE1s metros", "Lento por mais tempo"],
        apex_line: ["Rounder line", "Trazada m\xE1s redonda", "Linha mais redonda"],
        throttle: ["Throttle earlier", "Acelerar antes", "Acelerar antes"],
        no_wait: ["Wait between brake and throttle", "Espera entre freno y acelerador", "Espera entre freio e acelerador"],
        exit_speed: ["Throttle early, slow apex", "Acelera pronto, v\xE9rtice lento", "Acelera cedo, \xE1pice lento"],
        full_throttle: ["Full throttle sooner", "A fondo antes", "Acelerador a fundo mais cedo"],
        gear_up: ["Higher gear", "Marcha m\xE1s alta", "Marcha mais alta"],
        gear_down: ["Lower gear", "Marcha m\xE1s baja", "Marcha mais baixa"],
        lifts: ["Throttle lifts on exit", "Levanta el gas a la salida", "Al\xEDvios do acelerador na sa\xEDda"],
        throttle_slow: ["Slow to full throttle", "Tarda en ir a fondo", "Demora para acelerar a fundo"],
        throttle_rough: ["Throttle too abrupt", "Gas demasiado brusco", "Acelerador brusco demais"],
        steer: ["Steering corrections", "Correcciones de volante", "Corre\xE7\xF5es de volante"],
        line_same_brake: ["Line \xB7 turn in from the outside", "Trazada \xB7 entrar desde fuera", "Linha \xB7 entre por fora"],
        line_turnin: ["Line \xB7 turn-in too inside", "Trazada \xB7 giro muy por dentro", "Linha \xB7 entrada por dentro demais"],
        line_apex: ["Line \xB7 away from the apex", "Trazada \xB7 lejos del v\xE9rtice", "Linha \xB7 longe do \xE1pice"],
        line_exit: ["Line \xB7 track unused on exit", "Trazada \xB7 pista sin usar a la salida", "Linha \xB7 pista sem usar na sa\xEDda"],
        oval_flat: ["Lifts where the reference is flat out", "Levanta donde la referencia va a fondo", "Alivia onde a refer\xEAncia vai no fundo"],
        oval_no_brake: ["Brakes where a lift is enough", "Frena donde basta levantar", "Freia onde basta aliviar"],
        oval_lift_later: ["Lifts too early", "Levanta demasiado pronto", "Alivia cedo demais"],
        oval_lift_early: ["Lifts late and loses the center", "Levanta tarde y pierde el centro", "Alivia tarde e perde o centro"],
        oval_lift_less: ["Lifts too much", "Levanta demasiado", "Alivia demais"],
        oval_back_flat: ["Slow back to flat out", "Tarda en volver a fondo", "Demora a voltar ao fundo"],
        oval_center: ["More speed in the center", "M\xE1s velocidad en el centro", "Mais velocidade no centro"],
        oval_roll: ["Roll more speed in", "Dejar correr m\xE1s velocidad", "Levar mais velocidade"],
        dirt_groove: ["Groove on dirt", "L\xEDnea en tierra", "Linha na terra"]
      };
      const STEP_NAMES = {
        plan: ["The whole plan", "El plan entero", "O plano inteiro"],
        corner: ["Corner", "Curva", "Curva"],
        phase: ["Phase", "Fase", "Fase"],
        habit: ["Habit", "H\xE1bito", "H\xE1bito"],
        oval: ["Oval", "\xD3valo", "Oval"],
        straight: ["Outside the corners", "Fuera de las curvas", "Fora das curvas"],
        cons: ["Corner taken differently every lap", "Curva distinta cada vuelta", "Curva diferente a cada volta"],
        style: ["How the lap is driven", "C\xF3mo se conduce la vuelta", "Como a volta \xE9 pilotada"],
        trail: ["Trail braking", "Trail braking", "Trail braking"],
        rotate: ["The car pushes wide", "El coche se va de morro", "O carro sai de frente"],
        loose: ["The rear steps out", "La trasera se escapa", "A traseira escapa"],
        gears: ["Gears", "Marchas", "Marchas"],
        like: ["From other tracks", "De otros circuitos", "De outras pistas"],
        tyres: ["Pace fading over a run", "Ritmo que cae en la tanda", "Ritmo que cai na sequ\xEAncia"],
        pace: ["Usual lap against the best", "Vuelta habitual frente a la mejor", "Volta habitual contra a melhor"]
      };
      function stepName(id2, ctx) {
        const Tx = txOf(ctx), [k, sub] = String(id2 || "").split(":"), N2 = STEP_NAMES[k], base2 = N2 ? Tx(N2[0], N2[1], N2[2]) : k;
        if (!sub) return base2;
        const PH = { brake: 0, entry: 1, apex: 2, exit: 3 }, sn = k === "phase" && sub in PH ? phaseName(sub, ctx) : k === "oval" ? OVAL_NAMES[sub] ? Tx(...OVAL_NAMES[sub]) : sub : kindName(sub, ctx);
        return base2 + " \xB7 " + sn;
      }
      __name(stepName, "stepName");
      const OVAL_NAMES = { superspeedway: ["Superspeedway", "Super\xF3valo", "Superspeedway"], intermediate: ["Intermediate", "Intermedio", "Intermedi\xE1rio"], mile: ["Flat mile", "Una milla", "Uma milha"], short: ["Short track", "\xD3valo corto", "Pista curta"], dirt: ["Dirt", "Tierra", "Terra"] };
      function kindName(k, ctx) {
        const N2 = KIND_NAMES2[k];
        return N2 ? txOf(ctx)(N2[0], N2[1], N2[2]) : k;
      }
      __name(kindName, "kindName");
      function tipMain(c) {
        const t = c && c.tip || [], lt = /^(line_|dirt_groove)/.test(String(c && c.kind || "")) ? null : lineTipOf(c && c.line, c && c.dd != null && Math.abs(c.dd) <= 6, c && c.oval);
        if (!lt) return t;
        const cut = /* @__PURE__ */ __name((s, x) => s && x && s.endsWith(". " + x) ? s.slice(0, -(x.length + 2)) : s, "cut");
        return [cut(t[0], lt[0]), cut(t[1], lt[1]), cut(t[2], lt[3])];
      }
      __name(tipMain, "tipMain");
      function tipShort(t) {
        const q2 = String(t || "").replace(/\s*\([^)]*\)/g, "").trim().split(/\.\s+/).map((x) => x.replace(/\.$/, "").trim()).filter(Boolean);
        if (q2.length < 2) return q2[0] || "";
        const last = q2[q2.length - 1], first = q2[0], num4 = /\d/;
        return num4.test(last) && !num4.test(first) ? first : last;
      }
      __name(tipShort, "tipShort");
      function tipTodo(c, ctx) {
        if (!c || !(c.lost > 0.03) || !c.tip || !c.tip[0]) return "";
        const t = tipMain(c);
        return tipShort(txOf(ctx)(t[0], t[1], t[2]));
      }
      __name(tipTodo, "tipTodo");
      const FAMILY = {
        brake_late_apex: "late",
        brake_earlier: "late",
        oval_lift_early: "late",
        brake_later: "early",
        oval_lift_later: "early",
        brake_harder: "hard",
        trail: "trail",
        brake_same: "trail",
        entry_before: "trail",
        brake_generic: "trail",
        coast: "coast",
        no_wait: "coast",
        entry_speed: "speed",
        brake_speed: "speed",
        apex_speed: "speed",
        apex_line: "speed",
        oval_center: "speed",
        oval_roll: "speed",
        apex_longer: "long",
        throttle: "exit",
        full_throttle: "exit",
        throttle_slow: "exit",
        exit_speed: "exit",
        throttle_rough: "rough",
        lifts: "rough",
        gear_up: "gear",
        gear_down: "gear",
        steer: "steer",
        cons: "cons",
        oval_flat: "lift",
        oval_no_brake: "lift",
        oval_lift_less: "lift",
        oval_back_flat: "lift"
      };
      const familyOf = /* @__PURE__ */ __name((k) => FAMILY[k] || (/^(line_|dirt_)/.test(k || "") ? "line" : "speed"), "familyOf");
      const COST = {
        late: ["Braking too deep makes the car scrub speed while it is already turning, so it reaches the apex slower and every metre after the apex is slower too. The exit is worth more than the entry.", "Frenar demasiado tarde hace que el coche pierda velocidad cuando ya est\xE1 girando, as\xED que llega m\xE1s lento al v\xE9rtice y cada metro despu\xE9s tambi\xE9n es m\xE1s lento. La salida vale m\xE1s que la entrada.", "Frear fundo demais faz o carro perder velocidade quando j\xE1 est\xE1 virando, ent\xE3o ele chega mais lento ao \xE1pice e cada metro depois tamb\xE9m \xE9 mais lento. A sa\xEDda vale mais do que a entrada."],
        early: ["Every metre you brake before the reference is a metre at lower speed than it. It is a small loss each time, but it comes in every lap.", "Cada metro que frenas antes que la referencia es un metro a menos velocidad que ella. Es poco cada vez, pero se repite en cada vuelta.", "Cada metro que voc\xEA freia antes da refer\xEAncia \xE9 um metro a menos velocidade. \xC9 pouco a cada vez, mas se repete em toda volta."],
        early_lift: ["Every metre you lift before the reference is a metre at lower speed than it, and on an oval that speed is carried down the whole straight.", "Cada metro que levantas antes que la referencia es un metro a menos velocidad que ella, y en un \xF3valo esa velocidad se arrastra por toda la recta.", "Cada metro que voc\xEA alivia antes da refer\xEAncia \xE9 um metro a menos velocidade, e num oval essa velocidade vai pela reta inteira."],
        late_lift: ["Lifting late makes you slow the car in the middle of the corner, where it is already loaded. It loses more speed there than an earlier, lighter lift would.", "Levantar tarde te obliga a frenar el coche en mitad de la curva, donde ya va cargado. Ah\xED pierde m\xE1s velocidad que con un levant\xF3n antes y m\xE1s suave.", "Aliviar tarde obriga voc\xEA a segurar o carro no meio da curva, onde ele j\xE1 est\xE1 carregado. Ali ele perde mais velocidade do que com um al\xEDvio mais cedo e mais leve."],
        hard: ["A soft first press makes the braking zone longer. The car slows best in the first metres, when it has the most speed and grip.", "Pisar suave al principio alarga la frenada. El coche frena mejor en los primeros metros, cuando tiene m\xE1s velocidad y m\xE1s agarre.", "Pisar suave no in\xEDcio deixa a frenagem mais longa. O carro freia melhor nos primeiros metros, quando tem mais velocidade e ader\xEAncia."],
        trail: ["Letting go of the brake at once takes the weight off the front tyres just as you turn in. The car pushes wide and you wait before you can turn it.", "Soltar el freno de golpe quita peso a las ruedas delanteras justo cuando giras. El coche se va de morro y tienes que esperar para girarlo.", "Soltar o freio de uma vez tira peso dos pneus dianteiros bem quando voc\xEA entra na curva. O carro sai de frente e voc\xEA espera para conseguir vir\xE1-lo."],
        coast: ["With neither pedal pressed the car is not slowing down well and not speeding up either, and its balance is loose. Those metres are time given away.", "Sin pisar ning\xFAn pedal el coche ni frena bien ni acelera, y queda suelto de equilibrio. Esos metros son tiempo regalado.", "Sem nenhum pedal o carro nem freia bem nem acelera, e fica solto de equil\xEDbrio. Esses metros s\xE3o tempo dado de gra\xE7a."],
        speed: ["The speed at the slowest point sets the whole exit. A few km/h less there are carried all the way down the next straight.", "La velocidad en el punto m\xE1s lento marca toda la salida. Unos pocos km/h menos ah\xED se arrastran por toda la recta siguiente.", "A velocidade no ponto mais lento define toda a sa\xEDda. Alguns km/h a menos ali s\xE3o carregados por toda a reta seguinte."],
        long: ["You are as fast as the reference at the slowest point but you stay slow for more metres. A longer slow part costs time even at the same minimum speed.", "Vas tan r\xE1pido como la referencia en el punto m\xE1s lento, pero te quedas lento durante m\xE1s metros. Una parte lenta m\xE1s larga cuesta tiempo aunque la velocidad m\xEDnima sea la misma.", "Voc\xEA \xE9 t\xE3o r\xE1pido quanto a refer\xEAncia no ponto mais lento, mas fica lento por mais metros. Uma parte lenta mais longa custa tempo mesmo com a mesma velocidade m\xEDnima."],
        exit: ["The exit sets your speed for the whole straight after it. Time lost there keeps growing until the next braking point.", "La salida marca tu velocidad en toda la recta siguiente. El tiempo perdido ah\xED sigue creciendo hasta la pr\xF3xima frenada.", "A sa\xEDda define sua velocidade em toda a reta seguinte. O tempo perdido ali continua crescendo at\xE9 a pr\xF3xima frenagem."],
        rough: ["Opening the throttle too fast makes the rear slide and forces you to lift or correct. That costs more than a slower, steady squeeze.", "Abrir el gas demasiado r\xE1pido hace deslizar la trasera y te obliga a levantar o corregir. Eso cuesta m\xE1s que apretarlo despacio y constante.", "Abrir o acelerador r\xE1pido demais faz a traseira escorregar e obriga voc\xEA a aliviar ou corrigir. Isso custa mais do que apertar devagar e constante."],
        gear: ["In the wrong gear the engine is out of its best revs. Too low and the rear steps out on exit, too high and the car is slow to pull out of the corner.", "En la marcha equivocada el motor est\xE1 fuera de sus mejores revoluciones. Muy corta y la trasera se escapa a la salida, muy larga y el coche tarda en salir de la curva.", "Na marcha errada o motor fica fora da sua melhor rota\xE7\xE3o. Curta demais e a traseira escapa na sa\xEDda, longa demais e o carro demora a sair da curva."],
        steer: ["Every correction means the car is sliding. A sliding tyre slows the car and heats up, so it grips less in the next corners too.", "Cada correcci\xF3n significa que el coche est\xE1 deslizando. Un neum\xE1tico que desliza frena el coche y se calienta, as\xED que agarra menos tambi\xE9n en las curvas siguientes.", "Cada corre\xE7\xE3o significa que o carro est\xE1 escorregando. Um pneu que escorrega freia o carro e esquenta, ent\xE3o agarra menos tamb\xE9m nas pr\xF3ximas curvas."],
        line: ["The line sets how tight the corner is. A tighter arc forces a lower speed, so a few metres away from the reference's line cost speed in the whole corner.", "La trazada marca lo cerrada que es la curva. Un arco m\xE1s cerrado obliga a ir m\xE1s lento, as\xED que unos metros fuera de la trazada de la referencia cuestan velocidad en toda la curva.", "A linha define o quanto a curva \xE9 fechada. Um arco mais fechado obriga a ir mais devagar, ent\xE3o alguns metros fora da linha da refer\xEAncia custam velocidade na curva toda."],
        cons: ["A different braking point every lap means a different corner every lap, so you cannot build on what worked.", "Un punto de frenada distinto cada vuelta es una curva distinta cada vuelta, as\xED que no puedes construir sobre lo que funcion\xF3.", "Um ponto de frenagem diferente a cada volta \xE9 uma curva diferente a cada volta, ent\xE3o voc\xEA n\xE3o consegue evoluir a partir do que deu certo."],
        lift: ["On an oval the car runs close to its top speed, so every lift costs speed that takes the whole straight to win back.", "En un \xF3valo el coche va cerca de su velocidad punta, as\xED que cada levant\xF3n cuesta una velocidad que tarda toda la recta en recuperarse.", "Num oval o carro anda perto da velocidade m\xE1xima, ent\xE3o cada al\xEDvio custa uma velocidade que leva a reta inteira para recuperar."]
      };
      function howOf(f, c, Tx, u) {
        const r4 = Math.round, d = r4(c.d), vr = c.vminr != null ? r4(c.vminr) : null, lift = c.oval && c.lift;
        switch (f) {
          case "late":
            return lift ? Tx(`Start the lift where the reference does, at B on the map (${d} m from the line), and keep the speed up through the middle of the corner (${vr} ${u}).`, `Empieza a levantar donde la referencia, en B en el mapa (a ${d} m de la l\xEDnea), y mant\xE9n la velocidad por el centro de la curva (${vr} ${u}).`, `Comece a aliviar onde a refer\xEAncia alivia, em B no mapa (a ${d} m da linha), e mantenha a velocidade pelo meio da curva (${vr} ${u}).`) : Tx(`Brake at the reference's point, B on the map (${d} m from the line), a little before your own at A. Press hard at first, then release into the apex so you reach it at ${vr} ${u}.`, `Frena en el punto de la referencia, B en el mapa (a ${d} m de la l\xEDnea), un poco antes que tu punto A. Pisa fuerte al principio y suelta hasta el v\xE9rtice para llegar a ${vr} ${u}.`, `Freie no ponto da refer\xEAncia, B no mapa (a ${d} m da linha), um pouco antes do seu ponto A. Pise forte no in\xEDcio e solte at\xE9 o \xE1pice para chegar a ${vr} ${u}.`);
          case "early":
            return lift ? Tx("Move your lift towards B on the map a few metres at a time, until the car starts to feel loose on entry. Then keep that point.", "Lleva tu levant\xF3n hacia B en el mapa unos metros cada vez, hasta que el coche empiece a moverse a la entrada. Luego mant\xE9n ese punto.", "Leve seu al\xEDvio em dire\xE7\xE3o a B no mapa alguns metros por vez, at\xE9 o carro come\xE7ar a ficar solto na entrada. Depois mantenha esse ponto.") : Tx(`Pick a marker by the track (a board, a kerb, a shadow) near B on the map, ${d} m from the line, and move your braking towards it 5 m a lap until the entry starts to feel nervous. Then keep that marker.`, `Elige una referencia junto a la pista (un cartel, un piano, una sombra) cerca de B en el mapa, a ${d} m de la l\xEDnea, y acerca tu frenada 5 m por vuelta hasta que la entrada se ponga nerviosa. Luego mant\xE9n esa referencia.`, `Escolha uma refer\xEAncia ao lado da pista (uma placa, uma zebra, uma sombra) perto de B no mapa, a ${d} m da linha, e aproxime sua frenagem 5 m por volta at\xE9 a entrada ficar nervosa. Depois mantenha essa refer\xEAncia.`);
          case "hard":
            return Tx("Hit the brake hard at once, close to full pressure, and ease off as the car slows. Most of the braking is done in the first metres.", "Pisa el freno fuerte de golpe, cerca de la presi\xF3n m\xE1xima, y afloja seg\xFAn el coche se frena. Casi toda la frenada se hace en los primeros metros.", "Pise o freio forte de uma vez, perto da press\xE3o m\xE1xima, e alivie conforme o carro desacelera. Quase toda a frenagem acontece nos primeiros metros.");
          case "trail":
            return Tx("Keep a little brake on as you turn in and let it out slowly until the apex. The front stays loaded and the car turns in when you ask.", "Mant\xE9n un poco de freno al girar y su\xE9ltalo despacio hasta el v\xE9rtice. El delantero sigue cargado y el coche gira cuando se lo pides.", "Mantenha um pouco de freio ao entrar na curva e solte devagar at\xE9 o \xE1pice. A dianteira continua carregada e o carro vira quando voc\xEA pede.");
          case "coast":
            return Tx("Go straight from the brake to the throttle. As soon as the brake is off, a touch of throttle keeps the car balanced.", "Pasa directamente del freno al acelerador. En cuanto sueltas el freno, un toque de gas mantiene el coche equilibrado.", "Passe direto do freio para o acelerador. Assim que soltar o freio, um toque no acelerador mant\xE9m o carro equilibrado.");
          case "speed":
            return Tx(`Aim for ${vr} ${u} at the slowest point. Brake a touch less, turn in smoothly and let the car roll through the middle of the corner.`, `Busca ${vr} ${u} en el punto m\xE1s lento. Frena un poco menos, gira con suavidad y deja rodar el coche por el centro de la curva.`, `Busque ${vr} ${u} no ponto mais lento. Freie um pouco menos, entre com suavidade e deixe o carro rolar pelo meio da curva.`);
          case "long":
            return Tx("Turn in a little later and put the apex later, so you can straighten the wheel and pick up the throttle sooner.", "Gira un poco m\xE1s tarde y retrasa el v\xE9rtice, as\xED puedes enderezar el volante y acelerar antes.", "Entre um pouco mais tarde e atrase o \xE1pice, assim voc\xEA endireita o volante e acelera mais cedo.");
          case "exit":
            return c.pur != null ? Tx(`Pick up the throttle where the reference does (the green mark on the map, ${r4(c.pur)} m from the line) and squeeze it to full as you unwind the wheel.`, `Acelera donde la referencia (la marca verde en el mapa, a ${r4(c.pur)} m de la l\xEDnea) y llega a fondo mientras abres el volante.`, `Acelere onde a refer\xEAncia acelera (a marca verde no mapa, a ${r4(c.pur)} m da linha) e chegue ao fundo enquanto desfaz o volante.`) : Tx("Pick up the throttle at the apex and squeeze it to full as you unwind the wheel.", "Acelera en el v\xE9rtice y llega a fondo mientras abres el volante.", "Acelere no \xE1pice e chegue ao fundo enquanto desfaz o volante.");
          case "rough":
            return Tx("Open the throttle in one smooth movement and straighten the wheel before full throttle. If the rear steps out, you opened it too fast.", "Abre el gas en un solo movimiento suave y endereza el volante antes de ir a fondo. Si la trasera se escapa, lo abriste demasiado r\xE1pido.", "Abra o acelerador num s\xF3 movimento suave e endireite o volante antes de ir ao fundo. Se a traseira escapar, voc\xEA abriu r\xE1pido demais.");
          case "gear":
            return c.gB > c.gA ? Tx(`Use gear ${c.gB} here. The engine pulls well enough and the rear stays calmer on exit.`, `Usa la ${c.gB}\xAA aqu\xED. El motor tira lo suficiente y la trasera va m\xE1s tranquila a la salida.`, `Use a ${c.gB}\xAA marcha aqui. O motor puxa o bastante e a traseira fica mais calma na sa\xEDda.`) : Tx(`Shift down to gear ${c.gB} before you turn in, so the engine is in its best revs for the exit.`, `Baja a ${c.gB}\xAA antes de girar, as\xED el motor est\xE1 en sus mejores revoluciones para la salida.`, `Reduza para a ${c.gB}\xAA marcha antes de entrar, assim o motor fica na melhor rota\xE7\xE3o para a sa\xEDda.`);
          case "steer":
            return Tx("Turn the wheel once, to the angle the corner needs, and hold it. If you have to correct, you came in too fast, so brake a touch earlier.", "Gira el volante una vez, lo que pide la curva, y mantenlo. Si tienes que corregir es que entraste demasiado r\xE1pido, as\xED que frena un poco antes.", "Gire o volante uma vez, o quanto a curva pede, e segure. Se precisar corrigir, voc\xEA entrou r\xE1pido demais, ent\xE3o freie um pouco antes.");
          case "line":
            return Tx("Use the whole track. Start the corner from the outside edge, touch the apex and let the car run out to the edge on exit.", "Usa toda la pista. Empieza la curva desde el borde exterior, toca el v\xE9rtice y deja que el coche salga hasta el borde.", "Use a pista toda. Comece a curva pela borda de fora, toque o \xE1pice e deixe o carro sair at\xE9 a borda.");
          case "cons":
            return Tx("Pick one braking marker and one turn-in point and hit them every lap. Only move them once you hit them every time.", "Elige una referencia de frenada y un punto de giro y cl\xE1valos cada vuelta. Mu\xE9velos solo cuando los clavas siempre.", "Escolha uma refer\xEAncia de frenagem e um ponto de entrada e acerte-os em toda volta. S\xF3 mude quando acertar sempre.");
          case "lift":
            return c.flatB ? Tx("Keep your foot down here. If the car feels loose, lift earlier in the corner before so you arrive here straight.", "Mant\xE9n el pie a fondo aqu\xED. Si el coche se mueve, levanta antes en la curva anterior para llegar aqu\xED recto.", "Mantenha o p\xE9 no fundo aqui. Se o carro ficar solto, alivie antes na curva anterior para chegar aqui reto.") : Tx("Copy the reference's lift, which starts at B on the map. One smooth lift, and back to full throttle as soon as the car points down the straight.", "Copia el levant\xF3n de la referencia, que empieza en B en el mapa. Un solo levant\xF3n suave, y a fondo otra vez en cuanto el coche apunta a la recta.", "Copie o al\xEDvio da refer\xEAncia, que come\xE7a em B no mapa. Um s\xF3 al\xEDvio suave, e de volta ao fundo assim que o carro apontar para a reta.");
        }
        return "";
      }
      __name(howOf, "howOf");
      const PHASE_WHERE = { brake: ["under braking", "en la frenada", "na frenagem"], entry: ["on the way into the corner", "al entrar en la curva", "na entrada da curva"], apex: ["around the apex", "en el v\xE9rtice", "no \xE1pice"], exit: ["on the exit", "a la salida", "na sa\xEDda"] };
      function whatOf(c, Tx, u) {
        const r4 = Math.round, r22 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2"), ph = c.phase || "brake", pl = c.ph && c.ph[ph] > 0 ? r22(c.ph[ph]) : null, W2 = PHASE_WHERE[ph] || PHASE_WHERE.brake, lift = c.oval && c.lift, out = [];
        out.push(pl != null && pl < r22(c.lost) ? Tx(`You lose ${r22(c.lost)} s in T${c.n}, ${pl} s of it ${W2[0]}.`, `Pierdes ${r22(c.lost)} s en T${c.n}, ${pl} s de ellos ${W2[1]}.`, `Voc\xEA perde ${r22(c.lost)} s na T${c.n}, ${pl} s deles ${W2[2]}.`) : Tx(`You lose ${r22(c.lost)} s in T${c.n}, ${W2[0]}.`, `Pierdes ${r22(c.lost)} s en T${c.n}, ${W2[1]}.`, `Voc\xEA perde ${r22(c.lost)} s na T${c.n}, ${W2[2]}.`));
        if (c.flatB) out.push(Tx("The reference stays flat out here.", "La referencia va a fondo aqu\xED.", "A refer\xEAncia vai de p\xE9 no fundo aqui."));
        else if (c.dd != null && Math.abs(c.dd) >= 5) {
          const m = r4(Math.abs(c.dd));
          out.push(lift ? Tx(`You lift ${m} m ${c.dd > 0 ? "later" : "earlier"} than the reference (A and B on the map).`, `Levantas ${m} m ${c.dd > 0 ? "m\xE1s tarde" : "antes"} que la referencia (A y B en el mapa).`, `Voc\xEA alivia ${m} m ${c.dd > 0 ? "depois" : "antes"} da refer\xEAncia (A e B no mapa).`) : Tx(`You brake ${m} m ${c.dd > 0 ? "later" : "earlier"} than the reference (A and B on the map).`, `Frenas ${m} m ${c.dd > 0 ? "m\xE1s tarde" : "antes"} que la referencia (A y B en el mapa).`, `Voc\xEA freia ${m} m ${c.dd > 0 ? "depois" : "antes"} da refer\xEAncia (A e B no mapa).`));
        } else if (c.dd != null) out.push(lift ? Tx("You lift at the same point as the reference.", "Levantas en el mismo punto que la referencia.", "Voc\xEA alivia no mesmo ponto da refer\xEAncia.") : Tx("You brake at the same point as the reference.", "Frenas en el mismo punto que la referencia.", "Voc\xEA freia no mesmo ponto da refer\xEAncia."));
        if (c.vmin != null && c.vminr != null) {
          const a = r4(c.vmin), b = r4(c.vminr);
          out.push(a === b ? Tx(`At the slowest point you match it, ${a} ${u}.`, `En el punto m\xE1s lento vas igual, ${a} ${u}.`, `No ponto mais lento voc\xEA empata, ${a} ${u}.`) : Tx(`At the slowest point you are at ${a} ${u} and the reference at ${b}.`, `En el punto m\xE1s lento vas a ${a} ${u} y la referencia a ${b}.`, `No ponto mais lento voc\xEA est\xE1 a ${a} ${u} e a refer\xEAncia a ${b}.`));
        }
        if (c.kind === "trail" && c.trailA != null) out.push(Tx(`You hold the brake ${r4(c.trailA)} m into the turn and the reference ${r4(c.trailB)} m.`, `Mantienes el freno ${r4(c.trailA)} m dentro de la curva y la referencia ${r4(c.trailB)} m.`, `Voc\xEA segura o freio ${r4(c.trailA)} m dentro da curva e a refer\xEAncia ${r4(c.trailB)} m.`));
        if (!c.est && c.coastA - c.coastB >= 10) out.push(Tx(`${r4(c.coastA)} m with no pedal pressed (reference ${r4(c.coastB)} m).`, `${r4(c.coastA)} m sin pisar ning\xFAn pedal (referencia ${r4(c.coastB)} m).`, `${r4(c.coastA)} m sem nenhum pedal (refer\xEAncia ${r4(c.coastB)} m).`));
        if (c.late != null && Math.abs(c.late) >= 8) out.push(Tx(`You pick up the throttle ${r4(Math.abs(c.late))} m ${c.late > 0 ? "later" : "earlier"}.`, `Aceleras ${r4(Math.abs(c.late))} m ${c.late > 0 ? "m\xE1s tarde" : "antes"}.`, `Voc\xEA acelera ${r4(Math.abs(c.late))} m ${c.late > 0 ? "depois" : "antes"}.`));
        if (!c.est && c.gA >= 1 && c.gB >= 1 && c.gA !== c.gB) out.push(Tx(`Gear ${c.gA} at the apex (reference ${c.gB}).`, `${c.gA}\xAA en el v\xE9rtice (referencia ${c.gB}\xAA).`, `${c.gA}\xAA marcha no \xE1pice (refer\xEAncia ${c.gB}\xAA).`));
        return out.join(" ");
      }
      __name(whatOf, "whatOf");
      function cornerMarks(c, L) {
        const w = /* @__PURE__ */ __name((d) => L > 0 ? (d % L + L) % L : d, "w"), out = [], lift = !!c.lift;
        if (c.flatB) out.push({ d: w(c.d), k: "a", lift: true });
        else {
          if (c.dd != null) out.push({ d: w(c.d + c.dd), k: "a", lift });
          out.push({ d: w(c.d), k: "b", lift });
        }
        out.push({ d: w(c.apex), k: "apex", n: c.n });
        if (c.pur != null && /^(exit|rough)$/.test(familyOf(c.kind))) {
          out.push({ d: w(c.pur), k: "thr" });
          if (c.pua != null) out.push({ d: w(c.pua), k: "thra" });
        }
        return out;
      }
      __name(cornerMarks, "cornerMarks");
      const cornerSpan = /* @__PURE__ */ __name((c) => [Math.max(0, c.d - 50), c.apex + 150], "cornerSpan");
      function cornerStep(c, Tx, u, L, w) {
        const f = familyOf(c.kind), what = whatOf(c, Tx, u), cf = c.oval && c.lift && COST[f + "_lift"] ? f + "_lift" : f, cost = Tx(...COST[cf] || COST.speed), how = howOf(f, c, Tx, u);
        return { k: "corner", id: "corner:" + (c.kind || ""), kind: c.kind, turns: [c.n], gain: c.lost, w, t: `T${c.n} \xB7 ${Tx(c.tip[0], c.tip[1], c.tip[2])}`, what, cost, why: what + " " + cost, how, marks: cornerMarks(c, L), spans: [cornerSpan(c)] };
      }
      __name(cornerStep, "cornerStep");
      const turnMarks = /* @__PURE__ */ __name((list) => list.map((c) => ({ d: c.apex, k: "apex", n: c.n })), "turnMarks");
      const turnSpans = /* @__PURE__ */ __name((list) => list.map(cornerSpan), "turnSpans");
      const tNames = /* @__PURE__ */ __name((list) => list.map((c) => "T" + c.n).join(", "), "tNames");
      const lapClock = /* @__PURE__ */ __name((t) => {
        if (!(t > 0)) return "\u2013";
        const m = Math.floor(t / 60), s = t - m * 60;
        return (m ? m + ":" + (s < 10 ? "0" : "") : "") + s.toFixed(3);
      }, "lapClock");
      const lapTimeOf = /* @__PURE__ */ __name((l) => {
        if (l && l.time > 0) return l.time;
        const b = l && l.bins, lim = b ? Math.min(b.length - 1, l.maxBin != null ? l.maxBin : b.length - 1) : -1;
        for (let i = lim; i >= 0; i--) if (b[i] && b[i][1] > 0) return b[i][1];
        return null;
      }, "lapTimeOf");
      const medianOf = /* @__PURE__ */ __name((a) => {
        const v = a.slice().sort((x, y) => x - y), h = v.length >> 1;
        return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
      }, "medianOf");
      function lapSteps(cs, ov, A, LP, Tx, u) {
        const P = [], r4 = Math.round, r22 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2"), sum = /* @__PURE__ */ __name((l, f) => l.reduce((q2, c) => q2 + f(c), 0), "sum"), lostOf = /* @__PURE__ */ __name((l) => sum(l, (c) => Math.max(0, c.lost)), "lostOf"), dirt = ov === "dirt", ss = ov === "superspeedway";
        const T3 = /* @__PURE__ */ __name((a) => Tx(a[0], a[1], a[2]), "T"), step = /* @__PURE__ */ __name((k, list, gain, t, what, cost, how) => P.push({ k, id: k, turns: list.map((c) => c.n), gain, t, what, cost, why: (what + " " + cost).trim(), how, marks: turnMarks(list), spans: turnSpans(list) }), "step");
        const tr2 = cs.filter((c) => !c.est && !c.lift && c.lost > 0.03 && c.trailA != null && c.trailB - c.trailA >= 12);
        const gTr = sum(tr2, (c) => Math.max(0, (c.ph.brake || 0) + (c.ph.entry || 0)));
        if (tr2.length >= 2 && !ss && gTr > 0.06) {
          const mA = r4(sum(tr2, (c) => c.trailA) / tr2.length), mB = r4(sum(tr2, (c) => c.trailB) / tr2.length), nm = tNames(tr2);
          step(
            "trail",
            tr2,
            gTr * 0.8,
            Tx(`Trail braking in ${nm}`, `Trail braking en ${nm}`, `Trail braking em ${nm}`),
            Tx(`In these corners you let go of the brake about ${mA} m into the turn and the reference about ${mB} m.`, `En estas curvas sueltas el freno unos ${mA} m dentro de la curva y la referencia unos ${mB} m.`, `Nestas curvas voc\xEA solta o freio uns ${mA} m dentro da curva e a refer\xEAncia uns ${mB} m.`),
            T3(COST.trail),
            Tx("Brake hard in a straight line, then let the pedal out slowly as you turn the wheel, like letting out a spring. The brake is fully off at the apex, not before.", "Frena fuerte en l\xEDnea recta y suelta el pedal despacio mientras giras el volante, como quien suelta un muelle. El freno queda suelto del todo en el v\xE9rtice, no antes.", "Freie forte em linha reta e solte o pedal devagar enquanto gira o volante, como quem solta uma mola. O freio fica totalmente solto no \xE1pice, n\xE3o antes.")
          );
        }
        const us = dirt ? [] : cs.filter((c) => c.lost > 0.03 && c.stA > 0 && c.stB > 0 && c.stA > c.stB * 1.12 && c.vmin != null && c.vmin < c.vminr - 1);
        if (us.length >= 2) {
          const pc = r4(sum(us, (c) => c.stA / c.stB - 1) / us.length * 100), nm = tNames(us);
          step(
            "rotate",
            us,
            lostOf(us) * 0.6,
            Tx(`The car pushes wide in ${nm}`, `El coche se va de morro en ${nm}`, `O carro sai de frente em ${nm}`),
            Tx(`In these corners you turn the wheel about ${pc} % more than the reference and still pass the slowest point slower.`, `En estas curvas giras el volante un ${pc} % m\xE1s que la referencia y aun as\xED pasas m\xE1s lento por el punto m\xE1s lento.`, `Nestas curvas voc\xEA gira o volante uns ${pc} % mais que a refer\xEAncia e ainda passa mais lento no ponto mais lento.`),
            Tx("That is understeer. The front tyres are past their grip and slide instead of turning the car, so it runs wide and you wait for it before the throttle.", "Eso es subviraje. Las ruedas delanteras han pasado su l\xEDmite y deslizan en vez de girar el coche, as\xED que se abre y tienes que esperar para acelerar.", "Isso \xE9 sair de frente. Os pneus dianteiros passaram do limite e escorregam em vez de virar o carro, ent\xE3o ele abre e voc\xEA espera para acelerar."),
            ov ? Tx("Roll in with a little less speed and less wheel, and let the car take a set before you go back to the throttle. If it is tight in every corner, the setup helps. Take a little wedge out (less cross weight) or soften the front.", "Entra con un poco menos de velocidad y menos volante, y deja que el coche se asiente antes de volver al gas. Si va duro de morro en todas las curvas, el reglaje ayuda. Quita un poco de cu\xF1a (menos peso cruzado) o ablanda el delantero.", "Entre com um pouco menos de velocidade e menos volante, e deixe o carro assentar antes de voltar ao acelerador. Se sair de frente em todas as curvas, o acerto ajuda. Tire um pouco de cunha (menos peso cruzado) ou amacie a dianteira.") : Tx("Brake a touch earlier, keep a little brake on into the turn to load the front, and turn the wheel less, not more. If it pushes in every corner, the setup helps. A softer front anti-roll bar, a little more front wing or a touch less front tyre pressure.", "Frena un poco antes, mant\xE9n algo de freno al girar para cargar el delantero y gira menos el volante, no m\xE1s. Si se va de morro en todas las curvas, el reglaje ayuda. Una barra estabilizadora delantera m\xE1s blanda, algo m\xE1s de aler\xF3n delantero o un poco menos de presi\xF3n delante.", "Freie um pouco antes, mantenha um pouco de freio ao entrar para carregar a dianteira e gire menos o volante, n\xE3o mais. Se sair de frente em todas as curvas, o acerto ajuda. Uma barra estabilizadora dianteira mais macia, um pouco mais de asa dianteira ou um pouco menos de press\xE3o na frente.")
          );
        }
        const os = dirt ? [] : cs.filter((c) => c.lost > 0.03 && (/^(steer|lifts|throttle_rough)$/.test(c.kind || "") || !c.est && c.lA >= 1 && c.lA > c.lB && c.rA > c.rB + 1));
        if (os.length >= 2) {
          const nm = tNames(os);
          step(
            "loose",
            os,
            lostOf(os) * 0.6,
            Tx(`The rear steps out on exit in ${nm}`, `La trasera se escapa a la salida en ${nm}`, `A traseira escapa na sa\xEDda em ${nm}`),
            Tx("In these corners you lift or correct the wheel after the apex more than the reference.", "En estas curvas levantas el gas o corriges el volante tras el v\xE9rtice m\xE1s que la referencia.", "Nestas curvas voc\xEA alivia o acelerador ou corrige o volante depois do \xE1pice mais que a refer\xEAncia."),
            Tx("That is oversteer. A rear that slides makes you wait with the throttle and heats the rear tyres, so they grip less as the run goes on.", "Eso es sobreviraje. Una trasera que desliza te obliga a esperar con el gas y calienta las ruedas traseras, que agarran menos seg\xFAn avanza la tanda.", "Isso \xE9 sair de traseira. Uma traseira que escorrega obriga voc\xEA a esperar com o acelerador e esquenta os pneus traseiros, que agarram menos conforme a sequ\xEAncia avan\xE7a."),
            ov ? Tx("Squeeze the throttle off the corner and keep the wheel still. If it is loose in every corner, the setup helps. Add a little wedge (more cross weight) or a touch more rear grip.", "Aprieta el gas progresivamente a la salida y mant\xE9n el volante quieto. Si va suelto en todas las curvas, el reglaje ayuda. Pon un poco m\xE1s de cu\xF1a (m\xE1s peso cruzado) o algo m\xE1s de agarre detr\xE1s.", "Aperte o acelerador aos poucos na sa\xEDda e mantenha o volante parado. Se ficar solto em todas as curvas, o acerto ajuda. Ponha um pouco mais de cunha (mais peso cruzado) ou um pouco mais de ader\xEAncia atr\xE1s.") : Tx("Straighten the wheel before full throttle and squeeze it, never stab it. If it steps out in every corner, the setup helps. A softer rear anti-roll bar, a little more rear wing or one more step of traction control.", "Endereza el volante antes de ir a fondo y aprieta el gas, nunca de golpe. Si la trasera se escapa en todas las curvas, el reglaje ayuda. Una barra estabilizadora trasera m\xE1s blanda, algo m\xE1s de aler\xF3n trasero o un punto m\xE1s de control de tracci\xF3n.", "Endireite o volante antes de ir ao fundo e aperte o acelerador, nunca de uma vez. Se a traseira escapar em todas as curvas, o acerto ajuda. Uma barra estabilizadora traseira mais macia, um pouco mais de asa traseira ou um n\xEDvel a mais de controle de tra\xE7\xE3o.")
          );
        }
        const gs = cs.filter((c) => !c.est && c.lost > 0.03 && c.gA >= 1 && c.gB >= 1 && c.gA !== c.gB);
        if (gs.length >= 2) {
          const nm = tNames(gs), ls = gs.map((c) => Tx(`T${c.n} in gear ${c.gA} (reference ${c.gB})`, `T${c.n} en ${c.gA}\xAA (referencia ${c.gB}\xAA)`, `T${c.n} em ${c.gA}\xAA (refer\xEAncia ${c.gB}\xAA)`)).join(", ");
          step(
            "gears",
            gs,
            lostOf(gs) * 0.6,
            Tx(`Gears in ${nm}`, `Marchas en ${nm}`, `Marchas em ${nm}`),
            Tx(`You take ${ls}.`, `Tomas ${ls}.`, `Voc\xEA faz ${ls}.`),
            T3(COST.gear),
            Tx("Copy the reference's gear in these corners. Shift down before you turn in, never in the middle of the corner, and shift up as soon as the revs reach the top of the band.", "Copia la marcha de la referencia en estas curvas. Reduce antes de girar, nunca en mitad de la curva, y sube en cuanto las revoluciones lleguen arriba.", "Copie a marcha da refer\xEAncia nestas curvas. Reduza antes de entrar, nunca no meio da curva, e suba assim que a rota\xE7\xE3o chegar ao topo.")
          );
        }
        const same6 = (LP || []).filter((l) => l && l.valid !== false && (!A || !A.sessionId || !l.sessionId || l.sessionId === A.sessionId)).map((l, i) => ({ t: lapTimeOf(l), n: l.n != null ? l.n : i })).filter((x) => x.t > 0).sort((a, b) => a.n - b.n);
        if (same6.length >= 8) {
          const ts = same6.map((x) => x.t), first = medianOf(ts.slice(1, 4)), last = medianOf(ts.slice(-3)), fall = last - first;
          if (fall > 0.4 && fall > first * 3e-3) P.push({
            k: "tyres",
            id: "tyres",
            gain: fall * 0.4,
            t: Tx(`Your pace fades ${r22(fall)} s over the run`, `Tu ritmo cae ${r22(fall)} s a lo largo de la tanda`, `Seu ritmo cai ${r22(fall)} s ao longo da sequ\xEAncia`),
            what: Tx(`Your first laps are around ${lapClock(first)} and the last ones around ${lapClock(last)}.`, `Tus primeras vueltas rondan ${lapClock(first)} y las \xFAltimas ${lapClock(last)}.`, `Suas primeiras voltas ficam em torno de ${lapClock(first)} e as \xFAltimas de ${lapClock(last)}.`),
            cost: Tx("Tyres that slide get hot and wear, and lose grip lap after lap. In a race the laps at the end of a run matter more than the fastest one.", "Los neum\xE1ticos que deslizan se calientan y se gastan, y pierden agarre vuelta tras vuelta. En carrera las vueltas del final de una tanda importan m\xE1s que la m\xE1s r\xE1pida.", "Pneus que escorregam esquentam e se gastam, e perdem ader\xEAncia volta ap\xF3s volta. Na corrida as voltas do fim de uma sequ\xEAncia importam mais do que a mais r\xE1pida."),
            how: dirt ? Tx("On dirt the track and the tyres change every lap. Move up or down the track to find the grip, and be gentle with the throttle so the rears do not overheat.", "En tierra la pista y los neum\xE1ticos cambian cada vuelta. Sube o baja en la pista para buscar agarre y s\xE9 suave con el gas para que las traseras no se sobrecalienten.", "Na terra a pista e os pneus mudam a cada volta. Suba ou des\xE7a na pista para achar ader\xEAncia e seja suave no acelerador para os traseiros n\xE3o superaquecerem.") : ov ? Tx("On an oval the right-side tyres go first. As the run goes on, lift a little earlier and lighter and do not let the car slide up the track.", "En un \xF3valo los neum\xE1ticos del lado derecho caen primero. Seg\xFAn avanza la tanda, levanta un poco antes y menos y no dejes que el coche resbale hacia arriba.", "Num oval os pneus do lado direito caem primeiro. Conforme a sequ\xEAncia avan\xE7a, alivie um pouco antes e mais leve e n\xE3o deixe o carro escorregar para cima.") : Tx("Be smoother with the wheel and the throttle on the exits and do not let the car slide. Late in the run, brake a touch earlier and give up a little entry speed to keep the rear tyres alive.", "S\xE9 m\xE1s suave con el volante y el gas a la salida y no dejes deslizar el coche. Al final de la tanda, frena un poco antes y sacrifica algo de velocidad de entrada para cuidar las traseras.", "Seja mais suave no volante e no acelerador nas sa\xEDdas e n\xE3o deixe o carro escorregar. No fim da sequ\xEAncia, freie um pouco antes e abra m\xE3o de um pouco de velocidade de entrada para poupar os traseiros."),
            marks: [],
            spans: []
          });
        }
        if (same6.length >= 5) {
          const ts = same6.map((x) => x.t), best = Math.min(...ts), med = medianOf(ts), gap2 = med - best;
          if (gap2 > 0.5 && gap2 > best * 5e-3) P.push({
            k: "pace",
            id: "pace",
            gain: gap2 * 0.5,
            t: Tx(`Your usual lap is ${r22(gap2)} s slower than your best`, `Tu vuelta habitual es ${r22(gap2)} s m\xE1s lenta que la mejor`, `Sua volta habitual \xE9 ${r22(gap2)} s mais lenta que a melhor`),
            what: Tx(`Over ${ts.length} laps your best is ${lapClock(best)} and your middle lap ${lapClock(med)}.`, `En ${ts.length} vueltas tu mejor es ${lapClock(best)} y tu vuelta media ${lapClock(med)}.`, `Em ${ts.length} voltas sua melhor \xE9 ${lapClock(best)} e sua volta m\xE9dia ${lapClock(med)}.`),
            cost: Tx(`A race is won on the usual lap, not the best one. ${r22(gap2)} s every lap is ${r4(gap2 * 20)} s over 20 laps.`, `Una carrera se gana con la vuelta habitual, no con la mejor. ${r22(gap2)} s cada vuelta son ${r4(gap2 * 20)} s en 20 vueltas.`, `Uma corrida se ganha com a volta habitual, n\xE3o com a melhor. ${r22(gap2)} s por volta s\xE3o ${r4(gap2 * 20)} s em 20 voltas.`),
            how: Tx("Drive at about 98 %. Use the same markers every lap, brake a touch early rather than late, and after a mistake take the next corner calmly instead of trying to win the time back. In traffic, plan the pass a corner ahead and make it on the exit.", "Conduce al 98 %. Usa las mismas referencias cada vuelta, frena un poco antes mejor que tarde y, despu\xE9s de un error, toma la siguiente curva con calma en vez de intentar recuperar el tiempo. En tr\xE1fico, prepara el adelantamiento una curva antes y hazlo a la salida.", "Pilote a uns 98 %. Use as mesmas refer\xEAncias em toda volta, freie um pouco antes em vez de tarde e, depois de um erro, fa\xE7a a pr\xF3xima curva com calma em vez de tentar recuperar o tempo. No tr\xE1fego, prepare a ultrapassagem uma curva antes e fa\xE7a-a na sa\xEDda."),
            marks: [],
            spans: []
          });
        }
        return P;
      }
      __name(lapSteps, "lapSteps");
      function ovalStep(ov, A, R, sa, sb, n, cs, lapD, Tx) {
        const fA = fullShare(sa.arr.slice(0, n)), fB = fullShare(sb.arr.slice(0, n)), pc = /* @__PURE__ */ __name((v) => Math.round(v * 100) + " %", "pc"), r22 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2");
        const lA = liftZones(sa.arr).length, lB = liftZones(sb.arr).length, bA = brakeZones2(sa.arr).length, bB = brakeZones2(sb.arr).length;
        const flat = Tx(`Flat out ${pc(fA)} of the lap (reference ${pc(fB)}).`, `A fondo el ${pc(fA)} de la vuelta (referencia ${pc(fB)}).`, `De p\xE9 no fundo ${pc(fA)} da volta (refer\xEAncia ${pc(fB)}).`), turns = cs.filter((c) => c.lost > 0.05).map((c) => c.n);
        if (ov === "superspeedway" && fA >= 0.97 && fB >= 0.97 && lapD > 0.05) return {
          k: "oval",
          gain: lapD,
          t: Tx(`Flat out all lap like the reference, so the ${r22(lapD)} s are the draft`, `A fondo toda la vuelta como la referencia, as\xED que los ${r22(lapD)} s son el rebufo`, `De p\xE9 no fundo a volta toda como a refer\xEAncia, ent\xE3o os ${r22(lapD)} s s\xE3o o v\xE1cuo`),
          why: Tx("On a superspeedway the lap time comes from the cars around you more than from the corners.", "En un super\xF3valo el tiempo de vuelta sale de los coches que te rodean m\xE1s que de las curvas.", "Num superspeedway o tempo de volta vem dos carros ao seu redor mais do que das curvas."),
          how: Tx("Work in the pack. Stay in line with a partner, make your moves on the straights and keep the wheel still, because every correction scrubs speed.", "Trabaja en el pelot\xF3n. Ponte en fila con un compa\xF1ero, haz tus movimientos en las rectas y mant\xE9n el volante quieto, porque cada correcci\xF3n frena el coche.", "Trabalhe no pelot\xE3o. Fique em fila com um parceiro, fa\xE7a seus movimentos nas retas e mantenha o volante parado, porque cada corre\xE7\xE3o tira velocidade.")
        };
        const S3 = {
          superspeedway: [
            `Superspeedway \xB7 flat out ${pc(fA)} of the lap (reference ${pc(fB)})`,
            `Super\xF3valo \xB7 a fondo el ${pc(fA)} de la vuelta (referencia ${pc(fB)})`,
            `Superspeedway \xB7 de p\xE9 no fundo ${pc(fA)} da volta (refer\xEAncia ${pc(fB)})`,
            Tx(`You lift in ${lA} corners and the reference in ${lB}.`, `Levantas en ${lA} curvas y la referencia en ${lB}.`, `Voc\xEA alivia em ${lA} curvas e a refer\xEAncia em ${lB}.`),
            ["Here the car goes flat out all lap. Lift only to stay out of trouble in the pack, keep the wheel still and let the draft do the work.", "Aqu\xED el coche va a fondo toda la vuelta. Levanta solo para evitar problemas en el pelot\xF3n, mant\xE9n el volante quieto y deja que el rebufo haga el trabajo.", "Aqui o carro vai de p\xE9 no fundo a volta toda. Alivie s\xF3 para evitar problemas no pelot\xE3o, mantenha o volante parado e deixe o v\xE1cuo fazer o trabalho."]
          ],
          intermediate: [
            `Intermediate oval \xB7 lifts in ${lA} corners (reference ${lB})`,
            `\xD3valo intermedio \xB7 levantas en ${lA} curvas (referencia ${lB})`,
            `Oval intermedi\xE1rio \xB7 al\xEDvios em ${lA} curvas (refer\xEAncia ${lB})`,
            flat,
            ["Lift once, early and lightly, roll the middle of the corner and squeeze back to full throttle as the car straightens. The tyres fade over a long run, so lift a little earlier as the laps go by.", "Levanta una vez, pronto y poco, deja rodar el centro de la curva y vuelve a fondo progresivamente cuando el coche se endereza. Los neum\xE1ticos caen en una tanda larga, as\xED que levanta un poco antes seg\xFAn pasan las vueltas.", "Alivie uma vez, cedo e pouco, deixe o carro rolar no meio da curva e volte ao fundo aos poucos quando o carro endireitar. Os pneus caem numa sequ\xEAncia longa, ent\xE3o alivie um pouco antes conforme as voltas passam."]
          ],
          mile: [
            `Flat mile \xB7 ${bA} braking zones and ${lA} lifts (reference ${bB} and ${lB})`,
            `\xD3valo de una milla \xB7 ${bA} frenadas y ${lA} levantones (referencia ${bB} y ${lB})`,
            `Oval de uma milha \xB7 ${bA} frenagens e ${lA} al\xEDvios (refer\xEAncia ${bB} e ${lB})`,
            flat,
            ["A lift and a light touch of the brake set the car for the corner. Get it turned in the middle and squeeze the throttle so the rear stays planted, because the exit is where the lap is won.", "Un levant\xF3n y un toque suave de freno preparan el coche para la curva. Hazlo girar en el centro y aprieta el gas progresivamente para que la trasera no se mueva, porque la vuelta se gana en la salida.", "Um al\xEDvio e um toque leve no freio preparam o carro para a curva. Fa\xE7a-o virar no meio e aperte o acelerador aos poucos para a traseira ficar plantada, porque a volta se ganha na sa\xEDda."]
          ],
          short: [
            `Short track \xB7 ${bA} braking zones (reference ${bB})`,
            `\xD3valo corto \xB7 ${bA} frenadas (referencia ${bB})`,
            `Pista curta \xB7 ${bA} frenagens (refer\xEAncia ${bB})`,
            flat,
            ["Brake in a straight line, come off the brake before the middle of the corner and pick up the throttle gently. Wheelspin off the corner costs the whole straight, and in the race a clean exit is how you pass.", "Frena en l\xEDnea recta, suelta el freno antes del centro de la curva y acelera con suavidad. Patinar a la salida te cuesta toda la recta, y en carrera una salida limpia es como se adelanta.", "Freie em linha reta, solte o freio antes do meio da curva e acelere com suavidade. Patinar na sa\xEDda custa a reta inteira, e na corrida uma sa\xEDda limpa \xE9 como se ultrapassa."]
          ],
          dirt: [
            `Dirt oval \xB7 flat out ${pc(fA)} of the lap (reference ${pc(fB)})`,
            `\xD3valo de tierra \xB7 a fondo el ${pc(fA)} de la vuelta (referencia ${pc(fB)})`,
            `Oval de terra \xB7 de p\xE9 no fundo ${pc(fA)} da volta (refer\xEAncia ${pc(fB)})`,
            Tx(`You brake in ${bA} corners and the reference in ${bB}.`, `Frenas en ${bA} curvas y la referencia en ${bB}.`, `Voc\xEA freia em ${bA} curvas e a refer\xEAncia em ${bB}.`),
            ["Slow the car early and turn it on entry, then steer it with the throttle. The grip moves during the race, so look for the groove from the bottom to the cushion.", "Frena el coche pronto y hazlo girar a la entrada, y luego dir\xEDgelo con el acelerador. El agarre cambia durante la carrera, as\xED que busca la l\xEDnea desde abajo hasta el cushion.", "Segure o carro cedo e fa\xE7a-o virar na entrada, e depois guie-o com o acelerador. A ader\xEAncia muda durante a corrida, ent\xE3o procure a linha de baixo at\xE9 o cushion."]
          ]
        }[ov];
        return S3 ? { k: "oval", turns, gain: 0, t: Tx(S3[0], S3[1], S3[2]), why: S3[3], how: Tx(S3[4][0], S3[4][1], S3[4][2]) } : null;
      }
      __name(ovalStep, "ovalStep");
      function coachPlan(A, R, LP, ctx) {
        const Tx = txOf(ctx), { spdU } = unitsOf(ctx), C = coachOf(ctx), tipWeight = C.weight, turns = turnsOf(ctx), cornerHint = hintOf(ctx), pn = /* @__PURE__ */ __name((k) => phaseName(k, ctx), "pn");
        const ov = ovalOf(A, R, ctx), est = estOf(R, ctx), cx = ov || est ? { ...ctx, ...ov ? { oval: ov } : {}, ...est ? { estB: true } : {} } : ctx;
        const cs = coachCompare(A, R, cx), sa = lapSeries(A), sb = lapSeries(R), n = Math.min(sa.end, sb.end), lapD = A.time - R.time;
        const lost = cs.reduce((s, c) => s + Math.max(0, c.lost), 0), gained = cs.reduce((s, c) => s + Math.min(0, c.lost), 0), inCorners = cs.reduce((s, c) => s + c.lost, 0), straight = lapD - inCorners;
        const ph = { brake: 0, entry: 0, apex: 0, exit: 0 }, phN = { brake: 0, entry: 0, apex: 0, exit: 0 };
        cs.forEach((c) => {
          if (Object.values(c.ph).some((v) => Math.abs(v) > 1)) return;
          Object.keys(ph).forEach((k) => {
            const v = c.ph[k] || 0;
            if (v > 0) {
              ph[k] += v;
              if (v > 0.02) phN[k]++;
            }
          });
        });
        const secs = pairSecs(A, R, sa, sb, n).map(([a, b], k) => ({ n: k + 1, a, b, d: a - b }));
        const driving = lapDriving(sa, sb, n, cx), cons = cornerConsistency((LP || []).filter((l) => l.valid !== false), R, turns, ov) || [];
        const dif = /* @__PURE__ */ __name((c) => {
          const h = cornerHint(c.apex);
          return h && h.spread > 0 && h.spreadMax > 0 ? 0.9 + 0.3 * Math.min(1, h.spread / h.spreadMax) : 1;
        }, "dif");
        cs.forEach((c) => {
          const cz = cons.find((x) => x.n === c.n);
          if (cz && cz.sd > 0.08 && cz.sd > 2 * c.lost && /^brake/.test(c.kind || "")) {
            c.kind = "cons";
            c.tip = ["Same braking point every lap, before anything else", "El mismo punto de frenada cada vuelta, antes que nada", "O mesmo ponto de frenagem em toda volta, antes de qualquer outra coisa"];
          }
        });
        const P = [], r22 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2"), L = n * BIN3, T3 = /* @__PURE__ */ __name((a) => Tx(a[0], a[1], a[2]), "T3");
        cs.filter((c) => c.lost > 0.05).sort((a, b) => b.lost * tipWeight(b) * dif(b) - a.lost * tipWeight(a) * dif(a)).slice(0, 3).forEach((c) => P.push(cornerStep(c, Tx, spdU(), L, tipWeight(c) * dif(c))));
        const worst = Object.entries(ph).sort((a, b) => b[1] - a[1])[0];
        const avg = /* @__PURE__ */ __name((a) => a.length ? a.reduce((q2, v) => q2 + v, 0) / a.length : null, "avg"), mdd = avg(cs.filter((c) => c.dd != null).map((c) => c.dd)), mdmin = avg(cs.filter((c) => c.vmin != null).map((c) => c.vmin - c.vminr)), mlate = avg(cs.filter((c) => c.late != null).map((c) => c.late));
        if (worst && worst[1] > 0.12 && phN[worst[0]] >= 3) {
          const HOW = {
            brake: mdd != null && mdd > 4 ? ["You go in deeper than the reference in most corners. Brake a touch earlier and harder, and release the brake into the apex. A later braking point is not buying time here.", "Entras m\xE1s profundo que la referencia en casi todas las curvas. Frena un poco antes y m\xE1s fuerte, y suelta el freno hasta el v\xE9rtice. Frenar m\xE1s tarde no te est\xE1 dando tiempo.", "Voc\xEA entra mais fundo que a refer\xEAncia em quase todas as curvas. Freie um pouco antes e mais forte, e solte o freio at\xE9 o \xE1pice. Frear mais tarde n\xE3o est\xE1 te dando tempo."] : mdd != null && mdd < -4 ? ["Pick a fixed braking marker in every corner and brake 5 m later each lap until the entry gets nervous. Press hard at first, then ease off.", "Elige una referencia fija de frenada en cada curva y frena 5 m m\xE1s tarde cada vuelta hasta que la entrada se ponga nerviosa. Pisa fuerte al principio y luego afloja.", "Escolha uma refer\xEAncia fixa de frenagem em cada curva e freie 5 m mais tarde a cada volta at\xE9 a entrada ficar nervosa. Pise forte no in\xEDcio e depois alivie."] : est ? ["Your braking points match the reference and it carries more speed through the braking zones. Brake a touch less and roll more speed to the apex.", "Tus puntos de frenada coinciden con la referencia y ella lleva m\xE1s velocidad en las frenadas. Frena un poco menos y deja correr m\xE1s velocidad hasta el v\xE9rtice.", "Seus pontos de frenagem coincidem com os da refer\xEAncia e ela leva mais velocidade nas frenagens. Freie um pouco menos e leve mais velocidade at\xE9 o \xE1pice."] : ["Your braking points match the reference, so the time goes in how you brake. Press hard at once, then release progressively as you turn in (trail braking).", "Tus puntos de frenada coinciden con la referencia, as\xED que el tiempo se va en c\xF3mo frenas. Pisa fuerte de golpe y suelta progresivamente mientras giras (trail braking).", "Seus pontos de frenagem coincidem com os da refer\xEAncia, ent\xE3o o tempo se perde na forma de frear. Pise forte de uma vez e solte aos poucos enquanto entra na curva (trail braking)."],
            entry: est ? ["Carry more speed into the corners. The reference reaches the turn-in faster and loses less speed before the apex.", "Lleva m\xE1s velocidad a las curvas. La referencia llega m\xE1s r\xE1pida al punto de giro y pierde menos velocidad antes del v\xE9rtice.", "Leve mais velocidade para as curvas. A refer\xEAncia chega mais r\xE1pida ao ponto de entrada e perde menos velocidade antes do \xE1pice."] : ["Release the brake gradually as you turn in (trail braking) instead of letting go at once, and do not coast. Brake or throttle, never neither.", "Suelta el freno poco a poco mientras giras (trail braking) en vez de soltarlo de golpe, y no vayas en punto muerto. Freno o acelerador, nunca ninguno.", "Solte o freio aos poucos enquanto entra na curva (trail braking) em vez de soltar de uma vez, e n\xE3o v\xE1 no embalo. Freio ou acelerador, nunca nenhum dos dois."],
            apex: mdmin != null && mdmin >= 0 ? ["You are as fast as the reference at the slowest point but slow for longer. Turn in later and put the apex later, so the slow part of the corner gets shorter.", "Vas tan r\xE1pido como la referencia en el punto m\xE1s lento, pero lento durante m\xE1s metros. Gira m\xE1s tarde y retrasa el v\xE9rtice para acortar la parte lenta de la curva.", "Voc\xEA \xE9 t\xE3o r\xE1pido quanto a refer\xEAncia no ponto mais lento, mas lento por mais tempo. Entre mais tarde e atrase o \xE1pice para encurtar a parte lenta da curva."] : ["Turn in a little later and look at the exit. A rounder line lets you keep more speed at the slowest point.", "Gira un poco m\xE1s tarde y mira a la salida. Una trazada m\xE1s redonda te deja m\xE1s velocidad en el punto m\xE1s lento.", "Entre na curva um pouco mais tarde e olhe para a sa\xEDda. Uma linha mais redonda deixa voc\xEA levar mais velocidade no ponto mais lento."],
            exit: mlate != null && mlate <= -5 && mdmin != null && mdmin < -1 ? ["You pick up the throttle earlier than the reference but leave the corners slower. The exit starts at the apex, carry the speed there and the throttle will follow.", "Aceleras antes que la referencia pero sales de las curvas m\xE1s lento. La salida empieza en el v\xE9rtice, conserva la velocidad ah\xED y el acelerador vendr\xE1 solo.", "Voc\xEA acelera antes da refer\xEAncia, mas sai das curvas mais lento. A sa\xEDda come\xE7a no \xE1pice, leve a velocidade ali e o acelerador vem junto."] : ["Unwind the steering sooner and open the throttle progressively from the apex, and use all the track on the way out.", "Abre el volante antes y acelera progresivamente desde el v\xE9rtice, y usa toda la pista a la salida.", "Desfa\xE7a o volante mais cedo e abra o acelerador aos poucos desde o \xE1pice, e use toda a pista na sa\xEDda."]
          };
          if (ov && ov !== "short") HOW.entry = ["Lift once, a little earlier and lighter, and roll the speed into the corner instead of slowing the car at the last moment.", "Levanta una sola vez, un poco antes y menos, y deja correr la velocidad en la curva en vez de frenar el coche en el \xFAltimo momento.", "Alivie uma s\xF3 vez, um pouco antes e mais leve, e leve a velocidade para dentro da curva em vez de segurar o carro no \xFAltimo momento."];
          if (ov) HOW.apex = ["Keep the car rolling through the middle of the corner. A smoother entry with less steering keeps more speed at the slowest point.", "Mant\xE9n el coche rodando por el centro de la curva. Una entrada m\xE1s suave y con menos volante deja m\xE1s velocidad en el punto m\xE1s lento.", "Mantenha o carro rolando pelo meio da curva. Uma entrada mais suave e com menos volante deixa mais velocidade no ponto mais lento."];
          if (ov) HOW.exit = ov === "dirt" ? ["Feed the throttle in on exit instead of stabbing it. Wheelspin on dirt costs you the whole straight.", "Dosifica el gas a la salida en vez de pisarlo de golpe. En tierra, el patinazo te cuesta toda la recta.", "Dose o acelerador na sa\xEDda em vez de pisar de uma vez. Na terra, a patinada custa a reta inteira."] : ["Back to full throttle as soon as the car stops turning and let it run up towards the wall on exit. The speed off the corner is carried down the whole straight.", "Vuelve a fondo en cuanto el coche deja de girar y d\xE9jalo subir hacia el muro a la salida. La velocidad de salida se lleva toda la recta.", "Volte ao fundo assim que o carro parar de virar e deixe-o subir em dire\xE7\xE3o ao muro na sa\xEDda. A velocidade de sa\xEDda vai pela reta inteira."];
          P.push({ k: "phase", ph0: worst[0], gain: worst[1], t: Tx(`${pn(worst[0])} phase \xB7 ${r22(worst[1])} s over the lap`, `Fase de ${pn(worst[0]).toLowerCase()} \xB7 ${r22(worst[1])} s en la vuelta`, `Fase de ${pn(worst[0]).toLowerCase()} \xB7 ${r22(worst[1])} s na volta`), why: Tx(`It shows in ${phN[worst[0]]} corners, so it is a habit rather than one mistake.`, `Aparece en ${phN[worst[0]]} curvas, as\xED que es un h\xE1bito m\xE1s que un error puntual.`, `Aparece em ${phN[worst[0]]} curvas, ent\xE3o \xE9 mais um h\xE1bito do que um erro isolado.`), how: Tx(...HOW[worst[0]]) });
        }
        if (straight > 0.08 && ov) P.push({ k: "straight", gain: straight, t: Tx(`${r22(straight)} s outside the corners`, `${r22(straight)} s fuera de las curvas`, `${r22(straight)} s fora das curvas`), why: Tx("On an oval the straights are won in the corner before them, in the speed you carry off it and how soon you are back flat out.", "En un \xF3valo las rectas se ganan en la curva anterior, con la velocidad que sacas de ella y lo pronto que vuelves a ir a fondo.", "Num oval as retas se ganham na curva anterior, com a velocidade que voc\xEA leva dela e o quanto antes volta ao fundo."), how: ov === "superspeedway" ? Tx("Here the draft decides most of it. A lap on your own is slower than one behind another car.", "Aqu\xED el rebufo decide casi todo. Una vuelta en solitario es m\xE1s lenta que una detr\xE1s de otro coche.", "Aqui o v\xE1cuo decide quase tudo. Uma volta sozinho \xE9 mais lenta do que uma atr\xE1s de outro carro.") : Tx("Get the car turned early in the corner so you can be flat out sooner, and let it run up to the wall on exit.", "Haz girar el coche pronto en la curva para ir a fondo antes, y d\xE9jalo subir hasta el muro a la salida.", "Fa\xE7a o carro virar cedo na curva para ir ao fundo mais cedo, e deixe-o subir at\xE9 o muro na sa\xEDda.") });
        else if (straight > 0.08) P.push({ k: "straight", gain: straight, t: Tx(`${r22(straight)} s outside the braking zones`, `${r22(straight)} s fuera de las zonas de frenada`, `${r22(straight)} s fora das zonas de frenagem`), why: Tx("Time lost on the straights comes from the corner exits before them (less speed at the apex and a later throttle) and from the gears.", "El tiempo que se pierde en las rectas viene de las salidas de las curvas anteriores (menos velocidad en el v\xE9rtice y el acelerador m\xE1s tarde) y de las marchas.", "O tempo perdido nas retas vem das sa\xEDdas das curvas anteriores (menos velocidade no \xE1pice e o acelerador mais tarde) e das marchas."), how: Tx("Finish each corner with the throttle fully open as early as you can and check you shift at the right revs.", "Termina cada curva con el acelerador a fondo lo antes posible y comprueba que cambias a las revoluciones correctas.", "Termine cada curva com o acelerador a fundo o quanto antes e confira se voc\xEA troca de marcha na rota\xE7\xE3o certa.") });
        const wob = cons.filter((x) => x.sd > 0.08).slice(0, 2);
        wob.forEach((x) => P.push({ k: "cons", turns: [x.n], gain: x.sd * 0.6, t: Tx(`T${x.n} changes \xB1${r22(x.sd)} s from lap to lap`, `T${x.n} cambia \xB1${r22(x.sd)} s de una vuelta a otra`, `T${x.n} muda \xB1${r22(x.sd)} s de uma volta para outra`), why: Tx("Over the session you take this corner differently every lap. The time spread is the gap between your best and your usual lap.", "A lo largo de la sesi\xF3n tomas esta curva distinto cada vuelta. La dispersi\xF3n es la diferencia entre tu mejor vuelta y la habitual.", "Ao longo da sess\xE3o voc\xEA faz esta curva de um jeito diferente a cada volta. A dispers\xE3o \xE9 a diferen\xE7a entre sua melhor volta e a volta habitual."), how: Tx("Same braking marker, same turn-in point, same line, every lap. Consistency first, speed after.", "La misma referencia de frenada, el mismo punto de giro, la misma trazada, cada vuelta. Primero regularidad, luego velocidad.", "A mesma refer\xEAncia de frenagem, o mesmo ponto de entrada, a mesma linha, em toda volta. Primeiro regularidade, depois velocidade.") }));
        driving.forEach((d) => P.push({ k: "style", gain: 0, t: d.replace(/^\S+\s/, ""), why: "", how: "" }));
        lapSteps(cs, ov, A, LP, Tx, spdU()).forEach((x) => P.push(x));
        likeSteps(likeOf(A, cx, cs), Tx).forEach((x) => P.push(x));
        const PCOST = { brake: ["The braking zones are where the speed changes the most, so a few metres there are worth more than anywhere else on the lap.", "Las frenadas son donde m\xE1s cambia la velocidad, as\xED que unos metros ah\xED valen m\xE1s que en cualquier otra parte de la vuelta.", "As frenagens s\xE3o onde a velocidade mais muda, ent\xE3o alguns metros ali valem mais do que em qualquer outra parte da volta."], entry: ov && ov !== "short" ? COST.lift : est ? COST.speed : COST.trail, apex: COST.speed, exit: COST.exit };
        const sorted = cs.slice().sort((a, b) => a.d - b.d), tAt2 = /* @__PURE__ */ __name((s, d) => {
          for (let k = Math.max(0, Math.min(n - 1, Math.round(d / BIN3))); k >= 0; k--) if (s.arr[k]) return s.arr[k][1];
          return null;
        }, "tAt");
        const stretch = /* @__PURE__ */ __name((a0, a1) => {
          const x = [tAt2(sa, a0), tAt2(sa, a1), tAt2(sb, a0), tAt2(sb, a1)];
          return x.some((v) => v == null) ? null : x[1] - x[0] - (x[3] - x[2]);
        }, "stretch");
        const strs = [];
        sorted.forEach((c, j) => {
          const a0 = c.apex + 150, a1 = j + 1 < sorted.length ? sorted[j + 1].d - 50 : L;
          if (a1 - a0 >= 60) {
            const v = stretch(a0, a1);
            if (v != null) strs.push({ after: c.n, spans: [[a0, a1]], v });
          }
        });
        if (sorted.length && sorted[0].d - 50 >= 60) {
          const v = stretch(0, sorted[0].d - 50), lt = sorted[sorted.length - 1], o = strs.find((x) => x.after === lt.n && x.spans[0][1] === L);
          if (v != null) {
            if (o) {
              o.v += v;
              o.spans.push([0, sorted[0].d - 50]);
            } else strs.push({ after: lt.n, spans: [[0, sorted[0].d - 50]], v });
          }
        }
        P.forEach((p) => {
          if (p.k === "phase") {
            const ph0 = p.ph0, list = cs.filter((c) => !Object.values(c.ph).some((v) => Math.abs(v) > 1) && (c.ph[ph0] || 0) > 0.02);
            p.id = "phase:" + ph0;
            p.what = Tx(`It shows in ${tNames(list)}, so it is a habit rather than one mistake.`, `Aparece en ${tNames(list)}, as\xED que es un h\xE1bito m\xE1s que un error puntual.`, `Aparece em ${tNames(list)}, ent\xE3o \xE9 mais um h\xE1bito do que um erro isolado.`);
            p.cost = T3(PCOST[ph0] || COST.speed);
            p.why = p.what + " " + p.cost;
            p.turns = list.map((c) => c.n);
            p.marks = turnMarks(list);
            p.spans = turnSpans(list);
            delete p.ph0;
          } else if (p.k === "straight") {
            const top = strs.filter((x) => x.v > 0.02).sort((a, b) => b.v - a.v).slice(0, 2), nm = top.map((x) => Tx(`after T${x.after} (${r22(x.v)} s)`, `despu\xE9s de T${x.after} (${r22(x.v)} s)`, `depois da T${x.after} (${r22(x.v)} s)`)).join(Tx(" and ", " y ", " e "));
            p.id = "straight";
            p.what = top.length ? Tx(`Most of it is on the straight ${nm}.`, `La mayor parte est\xE1 en la recta ${nm}.`, `A maior parte est\xE1 na reta ${nm}.`) : "";
            p.cost = p.why;
            p.why = (p.what + " " + p.cost).trim();
            p.spans = top.flatMap((x) => x.spans);
            p.marks = top.map((x) => {
              const [a0, a1] = x.spans[0];
              return { d: (a0 + a1) / 2, k: "str", n: x.after };
            });
          } else if (p.k === "cons") {
            const c = cs.find((x) => x.n === p.turns[0]);
            p.id = "cons";
            p.what = p.why;
            p.cost = T3(COST.cons);
            p.why = p.what + " " + p.cost;
            p.marks = c ? turnMarks([c]) : [];
            p.spans = c ? turnSpans([c]) : [];
          } else if (p.k === "style") {
            p.id = "style";
            p.what = "";
            p.cost = "";
          }
        });
        P.sort((a, b) => b.gain * (b.w || 1) * C.plan(b.id) - a.gain * (a.w || 1) * C.plan(a.id));
        const OI = ov ? ovalStep(ov, A, R, sa, sb, n, cs, lapD, Tx) : null;
        if (OI) {
          const list = cs.filter((c) => c.lost > 0.05);
          P.unshift({ ...OI, id: "oval:" + ov, what: OI.why, cost: "", marks: turnMarks(list), spans: turnSpans(list) });
        }
        const H3 = C.habits[0];
        if (H3 && H3.tracks >= 3) {
          const inLap = cs.filter((c) => c.kind === H3.kind && c.lost > 0.03), names = inLap.map((c) => "T" + c.n).join(", ");
          P.unshift({ k: "habit", turns: inLap.map((c) => c.n), gain: inLap.reduce((q2, c) => q2 + c.lost, 0), t: Tx(`${kindName(H3.kind, ctx)} \xB7 a habit of yours`, `${kindName(H3.kind, ctx)} \xB7 un h\xE1bito tuyo`, `${kindName(H3.kind, ctx)} \xB7 um h\xE1bito seu`), why: Tx(`It shows on ${H3.tracks} tracks and ${H3.sessions} sessions${names ? `. In this lap in ${names}` : ""}.`, `Lo arrastras en ${H3.tracks} circuitos y ${H3.sessions} sesiones${names ? `. En esta vuelta en ${names}` : ""}.`, `Aparece em ${H3.tracks} pistas e ${H3.sessions} sess\xF5es${names ? `. Nesta volta em ${names}` : ""}.`), how: "" });
          const hp = P[0], f = familyOf(H3.kind);
          hp.id = "habit:" + H3.kind;
          hp.what = hp.why;
          hp.cost = T3(COST[f] || COST.speed);
          hp.why = hp.what + " " + hp.cost;
          hp.how = inLap[0] ? howOf(f, inLap[0], Tx, spdU()) : "";
          hp.marks = turnMarks(inLap);
          hp.spans = turnSpans(inLap);
        }
        P.forEach((p) => {
          p.id = p.id || p.k;
          p.what = p.what || "";
          p.cost = p.cost || "";
          p.marks = (p.marks || []).filter((m) => m.d >= 0 && m.d <= L).map((m) => ({ ...m, d: Math.round(m.d) }));
          p.spans = (p.spans || []).map(([a, b]) => [Math.round(Math.max(0, a)), Math.round(Math.min(L, b))]).filter(([a, b]) => b > a);
        });
        const areas = [["brake", ph.brake], ["entry", ph.entry], ["apex", ph.apex], ["exit", ph.exit], ["straight", Math.max(0, straight)]];
        return { cs, lapD, lost, gained, straight, ph, phN, secs, driving, cons, plan: P, areas, focus: areas.slice().sort((a, b) => b[1] - a[1])[0] };
      }
      __name(coachPlan, "coachPlan");
      function stepText(step, A, ctx) {
        if (!Array.isArray(step) || !step.length || !A) return "";
        const n = A.bins ? A.bins.length : 0, turns = turnsOf(ctx), names = step.map((x, k) => "T" + turnNo(turns, x.apex, n * BIN3, k + 1)).join(", ");
        return " \xB7 " + txOf(ctx)(`the drivers at your pace make the step in ${names}`, `los pilotos de tu ritmo dan el salto en ${names}`, `os pilotos do seu ritmo d\xE3o o salto em ${names}`);
      }
      __name(stepText, "stepText");
      function analyzerFacts(A, B, ctx) {
        const Tx = txOf(ctx), sa = lapSeries(A), sb = lapSeries(B), n = Math.min(sa.end, sb.end), ad = A.time - B.time;
        let peak = 0, peakI = 0, gain = 0, gainI = 0;
        for (let i = 0; i < n; i++) {
          const a = sa.arr[i], b = sb.arr[i];
          if (a && b) {
            const d = a[1] - b[1];
            if (d > peak) {
              peak = d;
              peakI = i;
            }
            if (d < gain) {
              gain = d;
              gainI = i;
            }
          }
        }
        const all = coachCompare(A, B, ctx), cz = all.filter((c) => c.lost > 0.03).sort((x, y) => y.lost - x.lost), items = [];
        if (cz[0]) {
          const t = Tx(cz[0].tip[0], cz[0].tip[1], cz[0].tip[2]);
          items.push(["bad", "T" + cz[0].n, Tx(`Corner ${cz[0].n} costs the most (${sgn(cz[0].lost, 3)} s) \xB7 ${t}`, `La curva ${cz[0].n} es la que m\xE1s cuesta (${sgn(cz[0].lost, 3)} s) \xB7 ${t}`, `A curva ${cz[0].n} \xE9 a que mais custa (${sgn(cz[0].lost, 3)} s) \xB7 ${t}`)]);
        }
        if (peak > 0.05) items.push(["warn", sgn(peak, 3) + " s", Tx(`A is furthest behind at ${Math.round(peakI * BIN3)} m (${sgn(peak, 3)} s)`, `A va m\xE1s atr\xE1s en ${Math.round(peakI * BIN3)} m (${sgn(peak, 3)} s)`, `A fica mais atr\xE1s em ${Math.round(peakI * BIN3)} m (${sgn(peak, 3)} s)`)]);
        if (gain < -0.05) items.push(["good", sgn(gain, 3) + " s", Tx(`A gains most around ${Math.round(gainI * BIN3)} m (${sgn(gain, 3)} s)`, `A gana m\xE1s alrededor de ${Math.round(gainI * BIN3)} m (${sgn(gain, 3)} s)`, `A ganha mais por volta de ${Math.round(gainI * BIN3)} m (${sgn(gain, 3)} s)`)]);
        const inC = all.reduce((q2, c) => q2 + c.lost, 0), straight = ad - inC, nL = all.filter((c) => c.lost > 0.02).length, nG = all.filter((c) => c.lost < -0.02).length;
        if (all.length) items.push([Math.abs(straight) > 0.08 && straight > 0 ? "warn" : "muted", sgn(inC, 2) + " s", Tx(`Corners ${sgn(inC, 2)} s (A loses in ${nL}, gains in ${nG}) \xB7 straights ${sgn(straight, 2)} s`, `Curvas ${sgn(inC, 2)} s (A pierde en ${nL}, gana en ${nG}) \xB7 rectas ${sgn(straight, 2)} s`, `Curvas ${sgn(inC, 2)} s (A perde em ${nL}, ganha em ${nG}) \xB7 retas ${sgn(straight, 2)} s`)]);
        return { ad, items, corners: all };
      }
      __name(analyzerFacts, "analyzerFacts");
      function followUp(prev, cs, ctx) {
        if (!Array.isArray(prev) || !prev.length || !Array.isArray(cs) || !cs.length) return [];
        const Tx = txOf(ctx), r22 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2"), seen2 = /* @__PURE__ */ new Set();
        return prev.filter((p) => p && p.kind && p.lost > 0.05 && p.tbest > 0 && p.apex >= 0).sort((a, b) => b.lost - a.lost).map((p) => {
          const c = cs.filter((x) => x.ta > 0 && Math.abs(x.apex - p.apex) <= 60).sort((x, y) => Math.abs(x.apex - p.apex) - Math.abs(y.apex - p.apex))[0];
          if (!c || seen2.has(c.n)) return null;
          seen2.add(c.n);
          const d = p.tbest - c.ta, ok = d >= 0.05 ? 1 : d <= -0.05 ? -1 : 0, nm = kindName(p.kind, ctx), left = c.lost > 0.05 ? c.lost : 0;
          const how = ok > 0 ? Tx(`${r22(d)} s faster than your best lap there last time`, `${r22(d)} s m\xE1s r\xE1pido que tu mejor vuelta ah\xED la \xFAltima vez`, `${r22(d)} s mais r\xE1pido que sua melhor volta ali da \xFAltima vez`) : ok < 0 ? Tx(`${r22(-d)} s slower than your best lap there last time`, `${r22(-d)} s m\xE1s lento que tu mejor vuelta ah\xED la \xFAltima vez`, `${r22(-d)} s mais lento que sua melhor volta ali da \xFAltima vez`) : Tx("the same as your best lap there last time", "igual que tu mejor vuelta ah\xED la \xFAltima vez", "igual \xE0 sua melhor volta ali da \xFAltima vez");
          const still = left ? " \xB7 " + Tx(`still ${r22(left)} s to the reference`, `a\xFAn ${r22(left)} s frente a la referencia`, `ainda ${r22(left)} s para a refer\xEAncia`) : "";
          return { n: c.n, apex: Math.round(c.apex), kind: p.kind, name: nm, was: Math.round(p.lost * 1e3) / 1e3, d: Math.round(d * 1e3) / 1e3, ok, left: Math.round(left * 1e3) / 1e3, t: `T${c.n} \xB7 ${nm}`, text: how + still };
        }).filter(Boolean).slice(0, 5);
      }
      __name(followUp, "followUp");
      function trackGuide(md2, ctx) {
        const cs = md2 && Array.isArray(md2.corners) ? md2.corners.filter((c) => c && c.apex >= 0) : [];
        if (!cs.length) return null;
        const Tx = txOf(ctx), { spd, spdU } = unitsOf(ctx), turns = turnsOf(ctx), L = md2.nb > 0 ? md2.nb * BIN3 : Math.max(...cs.map((c) => c.apex)) + 200, r4 = Math.round, r22 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2");
        const mx = Math.max(0, ...cs.map((c) => c.spread || 0)), imp = Array.isArray(md2.improve) ? md2.improve : [], u = spdU();
        const out = cs.slice().sort((a, b) => a.apex - b.apex).map((c, k) => {
          const n = turnNo(turns, c.apex, L, k + 1), dif = mx > 0 && c.spread > 0 ? c.spread / mx : 0, lines = [];
          const level = dif >= 0.66 ? "hard" : dif >= 0.33 ? "medium" : "easy";
          const brake = c.b0 != null && c.b1 != null ? Tx(`Brake between ${r4(c.b0)} and ${r4(c.b1)} m`, `Frena entre ${r4(c.b0)} y ${r4(c.b1)} m`, `Freie entre ${r4(c.b0)} e ${r4(c.b1)} m`) : "";
          const g = Array.isArray(c.g) && c.g[0] >= 1 ? c.g : null, gear = g ? g[0] === g[1] ? Tx(`gear ${g[0]}`, `${g[0]}\xAA`, `${g[0]}\xAA marcha`) : Tx(`gear ${g[0]} or ${g[1]}`, `${g[0]}\xAA o ${g[1]}\xAA`, `${g[0]}\xAA ou ${g[1]}\xAA marcha`) : "";
          const apex = c.v0 != null && c.v1 != null ? r4(spd(c.v0)) === r4(spd(c.v1)) ? `${r4(spd(c.v0))} ${u}` : `${r4(spd(c.v0))}\u2013${r4(spd(c.v1))} ${u}` : "";
          if (brake) lines.push(brake + (gear ? Tx(`, ${gear} at the apex`, `, ${gear} en el v\xE9rtice`, `, ${gear} no \xE1pice`) : "") + (apex ? Tx(` at ${apex}`, ` a ${apex}`, ` a ${apex}`) : "") + ".");
          const ln = c.line && Array.isArray(c.line.at) ? c.line.at : null;
          if (ln && (ln[0] >= 1 || ln[1] <= -1)) lines.push(ln[0] >= 1 ? Tx("The fast drivers pass the apex a little inside the record's line.", "Los r\xE1pidos pasan el v\xE9rtice un poco por dentro de la trazada del r\xE9cord.", "Os r\xE1pidos passam o \xE1pice um pouco por dentro da linha do recorde.") : Tx("The fast drivers pass the apex a little outside the record's line.", "Los r\xE1pidos pasan el v\xE9rtice un poco por fuera de la trazada del r\xE9cord.", "Os r\xE1pidos passam o \xE1pice um pouco por fora da linha do recorde."));
          const mk = c.mistake && c.mistake.kind ? c.mistake : null, mistake = mk ? Tx(`The most common tip here \xB7 ${kindName(mk.kind, ctx)} (${mk.n} drivers)`, `El consejo m\xE1s com\xFAn aqu\xED \xB7 ${kindName(mk.kind, ctx)} (${mk.n} pilotos)`, `A dica mais comum aqui \xB7 ${kindName(mk.kind, ctx)} (${mk.n} pilotos)`) : "";
          if (mistake) lines.push(mistake);
          const im = imp.filter((x) => Math.abs(x.apex - c.apex) <= 60).sort((a, b) => b.gain - a.gain)[0], improve = im ? Tx(`The drivers who improved here found ${r22(im.gain)} s in this corner (${im.n} drivers)`, `Los pilotos que mejoraron aqu\xED encontraron ${r22(im.gain)} s en esta curva (${im.n} pilotos)`, `Os pilotos que melhoraram aqui acharam ${r22(im.gain)} s nesta curva (${im.n} pilotos)`) : "";
          if (improve) lines.push(improve);
          const score = dif + (im ? Math.min(1, im.gain / 0.2) : 0) + (mk ? Math.min(0.6, mk.n / 10) : 0);
          return { n, d: Math.round(c.d), apex: Math.round(c.apex), b: c.b0 != null ? [Math.round(c.b0), Math.round(c.b1)] : null, g, v: c.v0 != null ? [r4(spd(c.v0)), r4(spd(c.v1))] : null, dif: Math.round(dif * 100) / 100, level, levelText: level === "hard" ? Tx("Hard", "Dif\xEDcil", "Dif\xEDcil") : level === "medium" ? Tx("Medium", "Media", "M\xE9dia") : Tx("Easy", "F\xE1cil", "F\xE1cil"), brake, gear, apexSpeed: apex, mistake, improve, lines, drivers: c.n || 0, score: Math.round(score * 100) / 100 };
        });
        const brief = out.slice().sort((a, b) => b.score - a.score).slice(0, 3).filter((x) => x.score > 0).map((c) => ({ n: c.n, apex: c.apex, t: `T${c.n} \xB7 ${c.levelText}`, text: c.lines[0] || "" }));
        return { corners: out, brief, drivers: Math.max(0, ...cs.map((c) => c.n || 0)), L: Math.round(L) };
      }
      __name(trackGuide, "trackGuide");
      function cornerRanks(A, md2, ctx) {
        const R = md2 && Array.isArray(md2.ranks) ? md2.ranks : [];
        if (!A || !Array.isArray(A.bins) || !R.length) return [];
        const s = serOf(A), turns = turnsOf(ctx), L = md2.nb > 0 ? md2.nb * BIN3 : s.length * BIN3, tAt2 = /* @__PURE__ */ __name((d) => {
          for (let k = Math.min(s.length - 1, Math.round(d / BIN3)); k >= 0; k--) if (s[k]) return s[k][1];
          return null;
        }, "tAt");
        return R.slice().sort((a, b) => a.apex - b.apex).map((c, k) => {
          const q2 = Array.isArray(c.q) ? c.q : [];
          if (q2.length < 3) return null;
          const t0 = tAt2(c.i0), t1 = tAt2(c.i1);
          if (t0 == null || t1 == null || !(t1 > t0)) return null;
          const t = t1 - t0, faster = q2.filter((x) => x < t - 5e-3).length, top = Math.max(1, Math.round((faster + 1) / (q2.length + 1) * 100));
          return { n: turnNo(turns, c.apex, L, k + 1), apex: Math.round(c.apex), t: Math.round(t * 1e3) / 1e3, best: q2[0], top, drivers: c.n || q2.length };
        }).filter(Boolean);
      }
      __name(cornerRanks, "cornerRanks");
      function clsLines(byCls, ctx) {
        const Tx = txOf(ctx), N2 = { slow: ["Slow corners", "Curvas lentas", "Curvas lentas"], medium: ["Medium corners", "Curvas medias", "Curvas m\xE9dias"], fast: ["Fast corners", "Curvas r\xE1pidas", "Curvas r\xE1pidas"] };
        return (Array.isArray(byCls) ? byCls : []).filter((x) => N2[x.cls] && x.n >= 5).sort((a, b) => b.avg - a.avg).map((x) => ({ cls: x.cls, avg: x.avg, n: x.n, t: Tx(...N2[x.cls]), text: Tx(`${Math.round(x.avg * 100) / 100} s lost on average (${x.n} corners)`, `${Math.round(x.avg * 100) / 100} s perdidos de media (${x.n} curvas)`, `${Math.round(x.avg * 100) / 100} s perdidos em m\xE9dia (${x.n} curvas)`) }));
      }
      __name(clsLines, "clsLines");
      function progressLines(prog, cs, ctx) {
        const P = prog && Array.isArray(prog.corners) ? prog.corners : [];
        if (!P.length) return [];
        const Tx = txOf(ctx), r22 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2"), rank = { worse: 0, stuck: 1, better: 2 };
        return P.filter((c) => c && rank[c.trend] != null && c.sessions >= 2).map((c) => {
          const m = (cs || []).filter((x) => Math.abs(x.apex - c.apex) <= 60).sort((x, y) => Math.abs(x.apex - c.apex) - Math.abs(y.apex - c.apex))[0], n = m ? m.n : c.n, k = c.sessions;
          const text2 = c.trend === "better" ? Tx(`${r22(c.gain)} s faster over your last ${k} sessions`, `${r22(c.gain)} s m\xE1s r\xE1pido en tus \xFAltimas ${k} sesiones`, `${r22(c.gain)} s mais r\xE1pido nas suas \xFAltimas ${k} sess\xF5es`) : c.trend === "worse" ? Tx(`${r22(-c.gain)} s slower than ${k} sessions ago`, `${r22(-c.gain)} s m\xE1s lento que hace ${k} sesiones`, `${r22(-c.gain)} s mais lento que h\xE1 ${k} sess\xF5es`) : Tx(`No faster in your last ${k} sessions`, `Sin mejorar en tus \xFAltimas ${k} sesiones`, `Sem melhorar nas suas \xFAltimas ${k} sess\xF5es`);
          return { n, apex: c.apex, trend: c.trend, gain: c.gain, sessions: k, t: `T${n}`, text: text2, tone: c.trend === "better" ? "good" : "bad" };
        }).sort((a, b) => rank[a.trend] - rank[b.trend] || Math.abs(b.gain) - Math.abs(a.gain)).slice(0, 6);
      }
      __name(progressLines, "progressLines");
      function edgeUse(A, map, ctx) {
        ctx = ctx || {};
        const e = map && map.edges, a = lapShape(A);
        if (!e || !Array.isArray(e.l) || !Array.isArray(e.r) || !a || !a.g || !map.g || !Array.isArray(map.x) || e.l.length !== map.x.length) return [];
        const nb = map.x.length, b = { x: map.x, y: map.y, g: map.g }, p = sameFrame2(b, { x: a.x, y: a.y, g: a.g }), na = p.x.length;
        if (na < 60 || nb < 60) return [];
        const off = new Array(nb).fill(NaN);
        for (let i = 0; i < nb; i++) {
          const i0 = (i - 2 + nb) % nb, i1 = (i + 2) % nb;
          let tx = b.x[i1] - b.x[i0], ty = b.y[i1] - b.y[i0];
          const tm = Math.hypot(tx, ty) || 1;
          tx /= tm;
          ty /= tm;
          const j0 = Math.round(i * na / nb);
          let bj = -1, bd = 1e18;
          for (let k = -30; k <= 30; k++) {
            const j = ((j0 + k) % na + na) % na, dx2 = p.x[j] - b.x[i], dy2 = p.y[j] - b.y[i], d2 = dx2 * dx2 + dy2 * dy2;
            if (d2 < bd) {
              bd = d2;
              bj = j;
            }
          }
          if (bj < 0 || bd > 1600) continue;
          const dx = p.x[bj] - b.x[i], dy = p.y[bj] - b.y[i];
          if (Math.abs(tx * dx + ty * dy) > 6) continue;
          off[i] = -ty * dx + tx * dy;
        }
        const Tx = txOf(ctx), turns = Array.isArray(ctx.turns) && ctx.turns.length ? ctx.turns : null, at2 = /* @__PURE__ */ __name((i) => (i % nb + nb) % nb, "at");
        let apexes = turns ? turns.map((f) => Math.round(f * nb)) : [];
        if (!apexes.length) {
          const s = serOf(A);
          apexes = brakeZones2(s).map((z) => Math.round(z.imin / s.length * nb));
        }
        const out = [];
        apexes.forEach((i, k) => {
          const P = /* @__PURE__ */ __name((q2) => [b.x[at2(q2)], b.y[at2(q2)]], "P"), p0 = P(i - 8), p1 = P(i), p2 = P(i + 8), cr = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]);
          if (Math.abs(cr) < 1) return;
          const left = cr > 0;
          let mn = Infinity, seen2 = 0;
          for (let j = i + 6; j <= i + 30; j++) {
            const q2 = at2(j), o = off[q2], l = e.l[q2], r4 = e.r[q2];
            if (!isFinite(o) || !(l - r4 >= 6)) continue;
            seen2++;
            mn = Math.min(mn, left ? o - r4 : l - o);
          }
          if (seen2 < 10 || !(mn >= 1.5)) return;
          const n = turns ? k + 1 : turnNo(ctx.turns, i * BIN3, nb * BIN3, k + 1), m = Math.round(mn * 2) / 2, ms = m.toFixed(1), msEs = ms.replace(".", ",");
          out.push({ n, apex: i * BIN3, m, text: Tx(`You leave ${ms} m of track unused on the exit of T${n}`, `Dejas ${msEs} m de pista sin usar a la salida de T${n}`, `Voc\xEA deixa ${msEs} m de pista sem usar na sa\xEDda da T${n}`) });
        });
        return out.sort((x, y) => y.m - x.m).slice(0, 3);
      }
      __name(edgeUse, "edgeUse");
      function racePace(r4, ctx) {
        ctx = ctx || {};
        const Tx = txOf(ctx), PACE_MIN = 4, rr = /* @__PURE__ */ __name((x) => Math.round(x * 1e3) / 1e3, "rr");
        const stats = /* @__PURE__ */ __name((ts) => {
          ts = ts.filter((t) => t > 0);
          if (ts.length < PACE_MIN) return null;
          const m = ts.slice().sort((a, b) => a - b)[Math.floor(ts.length / 2)];
          const c = ts.filter((t) => t <= m * 1.03);
          if (c.length < PACE_MIN) return null;
          const avg = c.reduce((a, t) => a + t, 0) / c.length, sd2 = Math.sqrt(c.reduce((a, t) => a + (t - avg) ** 2, 0) / c.length);
          const h = Math.floor(c.length / 2), mean = /* @__PURE__ */ __name((x) => x.reduce((a, t) => a + t, 0) / x.length, "mean");
          return { avg, sd: sd2, early: mean(c.slice(0, h)), late: mean(c.slice(h)), n: c.length };
        }, "stats");
        const mine = stats((r4.laps || []).filter((l) => l.n > 1 && !l.pit && !l.cut).map((l) => l.t));
        if (!mine) return null;
        const res = r4.results || [], rows = [];
        res.forEach((x, i) => {
          const s = x.me ? mine : stats((x.pace || []).filter((l, k) => k > 0 && !l.x).map((l) => l.t));
          if (!s) return;
          rows.push({ pos: x.cpos || i + 1, name: x.name || "", me: !!x.me, avg: rr(s.avg), sd: rr(s.sd), gap: x.me ? 0 : rr(s.avg - mine.avg), late: x.me ? 0 : rr(s.late - mine.late), fade: rr(s.late - s.early), n: s.n });
        });
        if (rows.length < 2) return null;
        const lines = [], others = rows.filter((x) => !x.me);
        const fast = others.slice().sort((a, b) => a.late - b.late)[0];
        if (fast && fast.late <= -0.1) lines.push({ good: false, t: Tx(`P${fast.pos} was ${(-fast.late).toFixed(2)} s a lap faster than you in the second half`, `P${fast.pos} fue ${(-fast.late).toFixed(2)} s por vuelta m\xE1s r\xE1pido que t\xFA en la segunda mitad`, `P${fast.pos} foi ${(-fast.late).toFixed(2)} s por volta mais r\xE1pido que voc\xEA na segunda metade`) });
        const slow = others.slice().sort((a, b) => b.late - a.late)[0];
        if (slow && slow.late >= 0.1) lines.push({ good: true, t: Tx(`You were ${slow.late.toFixed(2)} s a lap faster than P${slow.pos} in the second half`, `Fuiste ${slow.late.toFixed(2)} s por vuelta m\xE1s r\xE1pido que P${slow.pos} en la segunda mitad`, `Voc\xEA foi ${slow.late.toFixed(2)} s por volta mais r\xE1pido que P${slow.pos} na segunda metade`) });
        const me2 = rows.find((x) => x.me), fades = others.map((x) => x.fade).sort((a, b) => a - b), fm = fades.length ? fades[Math.floor(fades.length / 2)] : null;
        if (me2 && fm != null && me2.fade - fm >= 0.15) lines.push({ good: false, t: Tx(`Your pace dropped ${(me2.fade - fm).toFixed(2)} s a lap more than theirs from the first half to the second`, `Tu ritmo cay\xF3 ${(me2.fade - fm).toFixed(2)} s por vuelta m\xE1s que el suyo de la primera mitad a la segunda`, `Seu ritmo caiu ${(me2.fade - fm).toFixed(2)} s por volta mais que o deles da primeira metade para a segunda`) });
        const sds = others.map((x) => x.sd).sort((a, b) => a - b), sm = sds.length ? sds[Math.floor(sds.length / 2)] : null;
        if (me2 && sm != null && me2.sd - sm >= 0.15) lines.push({ good: false, t: Tx(`Your laps spread ${me2.sd.toFixed(2)} s against ${sm.toFixed(2)} s for the cars around you`, `Tus vueltas var\xEDan ${me2.sd.toFixed(2)} s frente a ${sm.toFixed(2)} s de los coches de tu alrededor`, `Suas voltas variam ${me2.sd.toFixed(2)} s contra ${sm.toFixed(2)} s dos carros ao seu redor`) });
        else if (me2 && sm != null && sm - me2.sd >= 0.1) lines.push({ good: true, t: Tx(`More consistent than the cars around you, ${me2.sd.toFixed(2)} s against ${sm.toFixed(2)} s`, `M\xE1s regular que los coches de tu alrededor, ${me2.sd.toFixed(2)} s frente a ${sm.toFixed(2)} s`, `Mais regular que os carros ao seu redor, ${me2.sd.toFixed(2)} s contra ${sm.toFixed(2)} s`) });
        return { rows, lines };
      }
      __name(racePace, "racePace");
      const LIKE_OVALS = { superspeedway: ["superspeedways", "super\xF3valos", "superspeedways"], intermediate: ["intermediate ovals", "\xF3valos intermedios", "ovais intermedi\xE1rios"], mile: ["one-mile ovals", "\xF3valos de una milla", "ovais de uma milha"], short: ["short tracks", "\xF3valos cortos", "pistas curtas"], dirt: ["dirt ovals", "\xF3valos de tierra", "ovais de terra"] };
      const LIKE_MIN = 4;
      function likeOf(A, ctx, cs) {
        const Lk = ctx && ctx.like;
        if (!Lk || !A || !Array.isArray(A.bins)) return null;
        const Tx = txOf(ctx), { spd, spdU } = unitsOf(ctx), hint = hintOf(ctx), turns = turnsOf(ctx), s = serOf(A), n = s.length, L = n * BIN3;
        const cz = Array.isArray(Lk.cz) ? Lk.cz.filter((x) => Array.isArray(x) && x.length >= 7) : [];
        const med = /* @__PURE__ */ __name((a) => medianOf(a), "med"), r0 = /* @__PURE__ */ __name((v) => Math.round(spd(v)), "r0"), tracksOf = /* @__PURE__ */ __name((a) => new Set(a.map((x) => x[0])).size, "tracksOf");
        const out = [];
        ovalZones(s).forEach((z, k) => {
          const apex = z.imin * BIN3, d = z.i * BIN3, a = s[z.imin];
          if (!a || hint(apex)) return;
          const c = (cs || []).filter((x) => Math.abs(x.apex - apex) <= 60).sort((p, q2) => Math.abs(p.apex - apex) - Math.abs(q2.apex - apex))[0];
          const no = c ? c.n : turnNo(turns, apex, L, k + 1), lift = z.lift ? 1 : 0, vIn = z.v, vmin = z.vmin, dist = (z.imin - z.i) * BIN3, gear = Math.round(a[4] || 0);
          const lines = [], kinds = [];
          let gain = 0;
          const same6 = cz.filter((x) => x[6] === lift && Math.abs(x[1] - vIn) <= Math.max(2.5, vIn * 0.06) && Math.abs(x[2] - vmin) <= Math.max(2, vmin * 0.06));
          if (same6.length >= LIKE_MIN && tracksOf(same6) >= 2) {
            const md2 = Math.round(med(same6.map((x) => x[3])));
            if (dist > md2 * 1.25 && dist - md2 >= 12) {
              const ex = dist - md2, g = Math.max(0, ex / ((vIn + vmin) / 2) - ex / vIn);
              gain += g;
              kinds.push("brake");
              lines.push(lift ? Tx(`In this car the fast drivers lift from ${r0(vIn)} to ${r0(vmin)} ${spdU()} in about ${md2} m on other tracks. You lifted ${dist} m before the slowest point here. Lift later and shorter.`, `En este coche los r\xE1pidos levantan de ${r0(vIn)} a ${r0(vmin)} ${spdU()} en unos ${md2} m en otros circuitos. Aqu\xED levantaste ${dist} m antes del punto m\xE1s lento. Levanta m\xE1s tarde y menos rato.`, `Neste carro os r\xE1pidos aliviam de ${r0(vIn)} para ${r0(vmin)} ${spdU()} em cerca de ${md2} m em outras pistas. Aqui voc\xEA aliviou ${dist} m antes do ponto mais lento. Alivie mais tarde e por menos tempo.`) : Tx(`In this car the fast drivers slow from ${r0(vIn)} to ${r0(vmin)} ${spdU()} in about ${md2} m on other tracks. You took ${dist} m here. Brake later and harder.`, `En este coche los r\xE1pidos bajan de ${r0(vIn)} a ${r0(vmin)} ${spdU()} en unos ${md2} m en otros circuitos. Aqu\xED usaste ${dist} m. Frena m\xE1s tarde y m\xE1s fuerte.`, `Neste carro os r\xE1pidos reduzem de ${r0(vIn)} para ${r0(vmin)} ${spdU()} em cerca de ${md2} m em outras pistas. Aqui voc\xEA usou ${dist} m. Freie mais tarde e mais forte.`));
            }
            const gs = same6.map((x) => x[4]).filter((g) => g >= 1), gF = gs.length >= LIKE_MIN ? Math.round(med(gs)) : 0;
            if (gear >= 1 && gF >= 1 && gear >= gF + 1) {
              kinds.push("gear");
              gain += 0.02;
              lines.push(Tx(`At these speeds the fast drivers in this car take the slowest point in gear ${gF}. You were in ${gear}.`, `A estas velocidades los r\xE1pidos en este coche pasan el punto m\xE1s lento en ${gF}\xAA. T\xFA ibas en ${gear}\xAA.`, `Nessas velocidades os r\xE1pidos neste carro passam o ponto mais lento em ${gF}\xAA. Voc\xEA estava em ${gear}\xAA.`));
            }
          }
          const st = steerMax(s, z.i, Math.min(n - 1, z.imin + 6));
          if (st > 0) {
            const tight = cz.filter((x) => x[6] === lift && x[5] != null && Math.abs(x[1] - vIn) <= Math.max(3, vIn * 0.08) && Math.abs(x[5] - st) <= Math.max(0.02, st * 0.2));
            if (tight.length >= LIKE_MIN && tracksOf(tight) >= 2) {
              const vs = tight.map((x) => x[2]).sort((p, q2) => p - q2), vF = med(vs), q1 = vs[Math.floor(vs.length / 4)], q3 = vs[Math.floor(vs.length * 3 / 4)];
              if (vF - vmin >= 1.2 && vF < vmin * 1.25 && q3 <= q1 * 1.15) {
                kinds.push("apex");
                gain += Math.max(0, 60 / vmin - 60 / vF) * 0.5;
                lines.push(Tx(`In corners like this one (the same speed in, the same steering) the fast drivers in this car keep ${r0(vF)} ${spdU()} at the slowest point. You were at ${r0(vmin)}. Carry more speed through the middle.`, `En curvas como esta (la misma velocidad de entrada, el mismo giro de volante) los r\xE1pidos en este coche mantienen ${r0(vF)} ${spdU()} en el punto m\xE1s lento. T\xFA ibas a ${r0(vmin)}. Lleva m\xE1s velocidad por el centro.`, `Em curvas como esta (a mesma velocidade de entrada, o mesmo giro de volante) os r\xE1pidos neste carro mant\xEAm ${r0(vF)} ${spdU()} no ponto mais lento. Voc\xEA estava a ${r0(vmin)}. Leve mais velocidade pelo meio.`));
              }
            }
          }
          if (lines.length) out.push({ n: no, d: Math.round(d), apex: Math.round(apex), lift: !!lift, kinds, kind: kinds[0], gain: Math.round(gain * 1e3) / 1e3, lines, tracks: tracksOf(same6.length ? same6 : cz) });
        });
        let oval = null;
        const ov = ovalOf(A, A, ctx);
        if (ov && LIKE_OVALS[ov]) {
          const mine = (Array.isArray(Lk.ot) ? Lk.ot : []).filter((o) => o && o.k === ov), all = Lk.kinds && Lk.kinds[ov], fA = fullShare(s), pc = /* @__PURE__ */ __name((v) => Math.round(v * 100), "pc");
          const nm = Tx(...LIKE_OVALS[ov]), zs = ovalZones(s), braked = zs.filter((z) => !z.lift), tn = /* @__PURE__ */ __name((z) => {
            const ap = z.imin * BIN3, c = (cs || []).find((x) => Math.abs(x.apex - ap) <= 60);
            return "T" + (c ? c.n : turnNo(turns, ap, L, zs.indexOf(z) + 1));
          }, "tn");
          let f = null, lf = null, line = "";
          if (mine.length) {
            f = med(mine.map((o) => o.f));
            const l2 = mine.map((o) => o.lf).filter((v) => v != null);
            lf = l2.length ? med(l2) : null;
            line = Tx(`On ${nm} the fast drivers in this car are flat out ${pc(f)} % of the lap (${mine.length} ${mine.length === 1 ? "track" : "tracks"}). This lap ${pc(fA)} %.`, `En ${nm} los r\xE1pidos en este coche van a fondo el ${pc(f)} % de la vuelta (${mine.length} ${mine.length === 1 ? "circuito" : "circuitos"}). Esta vuelta el ${pc(fA)} %.`, `Em ${nm} os r\xE1pidos neste carro v\xE3o no fundo ${pc(f)} % da volta (${mine.length} ${mine.length === 1 ? "pista" : "pistas"}). Esta volta ${pc(fA)} %.`);
          } else if (all && Array.isArray(all.f) && all.f[1] != null) {
            f = all.f[1];
            lf = all.lf != null ? all.lf : null;
            line = Tx(`On ${nm} the fast drivers are flat out ${pc(all.f[0])}\u2013${pc(all.f[2])} % of the lap (${all.cars} cars). This lap ${pc(fA)} %.`, `En ${nm} los r\xE1pidos van a fondo entre el ${pc(all.f[0])} y el ${pc(all.f[2])} % de la vuelta (${all.cars} coches). Esta vuelta el ${pc(fA)} %.`, `Em ${nm} os r\xE1pidos v\xE3o no fundo ${pc(all.f[0])}\u2013${pc(all.f[2])} % da volta (${all.cars} carros). Esta volta ${pc(fA)} %.`);
          }
          if (f != null) {
            const lines = [line], gap2 = Math.max(0, f - fA);
            if (lf != null && lf >= 0.5 && braked.length) lines.push(Tx(`They take ${pc(lf)} % of the turns there with a lift and no brake. You braked in ${braked.map(tn).join(", ")}.`, `Ah\xED toman el ${pc(lf)} % de las curvas levantando, sin freno. T\xFA frenaste en ${braked.map(tn).join(", ")}.`, `Ali eles fazem ${pc(lf)} % das curvas aliviando, sem freio. Voc\xEA freou em ${braked.map(tn).join(", ")}.`));
            if (gap2 >= 0.05 || lines.length > 1) oval = { kind: ov, f: Math.round(f * 1e3) / 1e3, fA: Math.round(fA * 1e3) / 1e3, lf, own: !!mine.length, lines, braked: braked.map((z) => Math.round(z.imin * BIN3)), gain: Math.round((gap2 * 0.5 + (lines.length > 1 ? 0.05 : 0)) * 1e3) / 1e3 };
          }
        }
        return out.length || oval ? { corners: out.sort((p, q2) => q2.gain - p.gain), oval } : null;
      }
      __name(likeOf, "likeOf");
      function likeSteps(lk, Tx) {
        if (!lk) return [];
        const P = lk.corners.slice(0, 2).map((c) => {
          const f = c.kind === "apex" ? "speed" : c.kind === "gear" ? "gear" : c.lift ? "early_lift" : "early";
          return { k: "like", id: "like:" + c.kind, kind: c.kind, turns: [c.n], gain: c.gain, t: `T${c.n} \xB7 ` + Tx("From other tracks", "De otros circuitos", "De outras pistas"), what: c.lines.join(" "), cost: Tx(...COST[f]), how: "", marks: [{ d: c.d, k: "a", n: c.n }, { d: c.apex, k: "apex", n: c.n }], spans: [[c.d - 50, c.apex + 150]] };
        });
        if (lk.oval) P.push({ k: "like", id: "like:oval", kind: "oval", turns: [], gain: lk.oval.gain, t: Tx(...LIKE_OVALS[lk.oval.kind]) + " \xB7 " + Tx("From other tracks", "De otros circuitos", "De outras pistas"), what: lk.oval.lines.join(" "), cost: Tx(...COST.lift), how: "", marks: lk.oval.braked.map((d) => ({ d, k: "apex" })), spans: [] });
        P.forEach((p) => {
          p.why = (p.what + " " + p.cost).trim();
        });
        return P;
      }
      __name(likeSteps, "likeSteps");
      function notesOf(o, ctx) {
        const Tx = txOf(ctx), out = [];
        if (o.followup && o.followup.length) out.push({ k: "followup", title: Tx("Your last session's plan", "El plan de tu \xFAltima sesi\xF3n", "O plano da sua \xFAltima sess\xE3o"), items: o.followup.map((x) => ({ t: (x.ok > 0 ? "\u2713 " : x.ok < 0 ? "\u2717 " : "= ") + x.t, text: x.text, tone: x.ok > 0 ? "good" : x.ok < 0 ? "bad" : "" })) });
        const st = [...(o.ranks || []).map((x) => ({ t: `T${x.n}`, text: Tx(`top ${x.top} % among ${x.drivers} drivers`, `top ${x.top} % entre ${x.drivers} pilotos`, `top ${x.top} % entre ${x.drivers} pilotos`), tone: x.top <= 25 ? "good" : x.top >= 60 ? "bad" : "" })), ...(o.cls || []).map((x) => ({ t: x.t, text: x.text, tone: "" }))];
        if (st.length) out.push({ k: "stand", title: Tx("Strengths and weaknesses", "Puntos fuertes y d\xE9biles", "Pontos fortes e fracos"), items: st });
        if (o.progress && o.progress.length) out.push({ k: "progress", title: Tx("Your corners over time", "Tus curvas con el tiempo", "Suas curvas ao longo do tempo"), items: o.progress.map((x) => ({ t: x.t, text: x.text, tone: x.tone })) });
        if (o.edges && o.edges.length) out.push({ k: "edges", title: Tx("Track left unused", "Pista sin usar", "Pista sem usar"), items: o.edges.map((x) => ({ t: `T${x.n}`, text: x.text, tone: "bad" })) });
        if (o.like) {
          const it = [...o.like.oval ? [{ t: Tx(...LIKE_OVALS[o.like.oval.kind]), text: o.like.oval.lines.join(" "), tone: "" }] : [], ...o.like.corners.map((c) => ({ t: `T${c.n}`, text: c.lines.join(" "), tone: "" }))];
          if (it.length) out.push({ k: "like", title: Tx("From other tracks", "De otros circuitos", "De outras pistas"), items: it });
        }
        if (o.guide && o.guide.corners.length) out.push({ k: "guide", title: Tx("Track guide", "Gu\xEDa del circuito", "Guia da pista"), items: guideItems(o.guide) });
        return out;
      }
      __name(notesOf, "notesOf");
      function guideItems(g) {
        const tone = /* @__PURE__ */ __name((c) => c.level === "hard" ? "bad" : c.level === "easy" ? "good" : "", "tone");
        return g.corners.map((c) => ({ t: `T${c.n} \xB7 ${c.levelText}`, text: c.lines.join(" "), tone: tone(c) }));
      }
      __name(guideItems, "guideItems");
      function analyse(A, B, ctx, opts) {
        ctx = ctx || {};
        const Tx = txOf(ctx), withText = /* @__PURE__ */ __name((c) => ({ ...c, text: c.tip[0] ? Tx(c.tip[0], c.tip[1], c.tip[2]) : "", todo: tipTodo(c, ctx) }), "withText");
        const facts = analyzerFacts(A, B, ctx), plan = coachPlan(A, B, Array.isArray(ctx.laps) ? ctx.laps : [], ctx);
        const out = { v: VERSION, gap: A.time - B.time, corners: facts.corners.map(withText), facts: { ad: facts.ad, items: facts.items }, coach: { ...plan, cs: plan.cs.map(withText) } };
        if (Array.isArray(ctx.step)) out.step = stepText(ctx.step, A, ctx);
        if (Array.isArray(ctx.prev)) out.followup = followUp(ctx.prev, plan.cs, ctx);
        if (ctx.model) {
          const g = trackGuide(ctx.model, ctx), rk = cornerRanks(A, ctx.model, ctx);
          if (g) out.guide = g;
          if (rk.length) out.ranks = rk;
        }
        if (Array.isArray(ctx.byCls)) out.cls = clsLines(ctx.byCls, ctx);
        if (ctx.like) {
          const lk = likeOf(A, ctx, plan.cs);
          if (lk) out.like = lk;
        }
        if (ctx.progress) {
          const pg = progressLines(ctx.progress, plan.cs, ctx);
          if (pg.length) out.progress = pg;
        }
        if (ctx.map && ctx.map.edges) {
          const eu = edgeUse(A, ctx.map, ctx);
          if (eu.length) out.edges = eu;
        }
        out.notes = notesOf(out, ctx);
        return opts && opts.json ? JSON.stringify(out) : out;
      }
      __name(analyse, "analyse");
      const meanOf = /* @__PURE__ */ __name((a) => a.reduce((p, v) => p + v, 0) / a.length, "meanOf");
      const sdOf = /* @__PURE__ */ __name((a) => {
        const m = meanOf(a);
        return Math.sqrt(a.reduce((p, v) => p + (v - m) * (v - m), 0) / a.length);
      }, "sdOf");
      const r33 = /* @__PURE__ */ __name((x) => Math.round(x * 1e3) / 1e3, "r3"), r1 = /* @__PURE__ */ __name((x) => Math.round(x * 10) / 10, "r1");
      const cleanLaps2 = /* @__PURE__ */ __name((laps) => (laps || []).filter((l) => l && l.valid !== false && !l.pit && !l.drv && l.time > 0 && Array.isArray(l.bins) && l.bins.length > 20), "cleanLaps");
      function lapSpread(laps) {
        const ts = (laps || []).filter((l) => l && l.valid !== false && !l.drv && l.time > 0).map((l) => l.time);
        if (!ts.length) return null;
        const best = Math.min(...ts), c = ts.filter((t) => t <= best * 1.03);
        return c.length < 5 ? null : { sd: r33(sdOf(c)), n: c.length, avg: r33(meanOf(c)), best: r33(best) };
      }
      __name(lapSpread, "lapSpread");
      function cornerSpread(laps, ctx) {
        const Tx = txOf(ctx), U = unitsOf(ctx), L = cleanLaps2(laps);
        if (L.length < 3) return null;
        const ref = L.reduce((a, l) => l.time < a.time ? l : a), sb = serOf(ref), n = sb.length, turns = turnsOf(ctx);
        const zs = cornerZones(sb, n, turns, ctx && ctx.oval);
        const rows = [];
        zs.forEach((z, k) => {
          const i0 = Math.max(0, z.i - 10), i1 = Math.min(n - 1, z.imin + 30), ts = [], vs = [];
          L.forEach((l) => {
            const s = serOf(l);
            if (!s[i0] || !s[i1]) return;
            const t = s[i1][1] - s[i0][1];
            if (!(t > 0 && t < 60)) return;
            ts.push(t);
            let vm = Infinity;
            for (let i = z.i; i <= Math.min(s.length - 1, z.imin + 10); i++) if (s[i] && s[i][0] < vm) vm = s[i][0];
            if (isFinite(vm)) vs.push(U.spd(vm));
          });
          if (ts.length < 3) return;
          const best = Math.min(...ts), avg = meanOf(ts), sd2 = sdOf(ts), cost = avg - best, num4 = z.turn != null ? z.turn + 1 : turnNo(turns, z.imin * BIN3, n * BIN3, k + 1);
          rows.push({
            n: num4,
            d: z.i * BIN3,
            apex: z.imin * BIN3,
            sd: r33(sd2),
            best: r33(best),
            avg: r33(avg),
            worst: r33(Math.max(...ts)),
            cost: r33(cost),
            vsd: vs.length >= 3 ? r1(sdOf(vs)) : null,
            laps: ts.length,
            text: Tx(
              `T${num4} changes \xB1${sd2.toFixed(2)} s from lap to lap and costs you ${cost.toFixed(2)} s a lap on average against your best there`,
              `T${num4} cambia \xB1${sd2.toFixed(2)} s de una vuelta a otra y te cuesta ${cost.toFixed(2)} s por vuelta de media frente a tu mejor paso por ella`,
              `T${num4} muda \xB1${sd2.toFixed(2)} s de uma volta para outra e custa ${cost.toFixed(2)} s por volta em m\xE9dia contra sua melhor passagem nela`
            )
          });
        });
        rows.sort((a, b) => b.cost - a.cost);
        return { rows, laps: L.length, unit: U.spdU() };
      }
      __name(cornerSpread, "cornerSpread");
      function offsExplained(laps, ctx) {
        const Tx = txOf(ctx), U = unitsOf(ctx), turns = turnsOf(ctx), all = (laps || []).filter((l) => l && Array.isArray(l.bins) && l.bins.length > 20), clean2 = cleanLaps2(all), out = [];
        all.forEach((L) => {
          const a = L.incAt || [], ks = L.incK || [];
          for (let i = 0; i + 1 < a.length; i += 2) {
            const pts = a[i + 1], k = ks[i / 2] || (pts >= 4 ? "contact" : pts >= 2 ? "loss" : "off");
            if (k !== "off" && k !== "loss") continue;
            const R = clean2.filter((x) => x !== L).reduce((p, x) => !p || x.time < p.time ? x : p, null);
            if (!R) continue;
            const o = offWhy(L, R, a[i], ctx);
            const n = o.n || turnNo(turns, a[i], serOf(R).length * BIN3, 0);
            const at2 = n ? `T${n}` : `${Math.round(a[i])} m`, v = o.v, sp = /* @__PURE__ */ __name((x) => Math.round(x) + " " + U.spdU(), "sp");
            const text2 = o.why === "lock" ? Tx(`${at2} \xB7 lock-up. You braked harder than on your best lap there (${Math.round(v * 100)} % against ${Math.round(o.r * 100)} %)`, `${at2} \xB7 bloqueo. Frenaste m\xE1s fuerte que en tu mejor vuelta ah\xED (${Math.round(v * 100)} % frente a ${Math.round(o.r * 100)} %)`, `${at2} \xB7 travamento. Voc\xEA freou mais forte que na sua melhor volta ali (${Math.round(v * 100)} % contra ${Math.round(o.r * 100)} %)`) : o.why === "late" ? Tx(`${at2} \xB7 braked ${Math.round(v)} m later than on your best lap`, `${at2} \xB7 frenaste ${Math.round(v)} m m\xE1s tarde que en tu mejor vuelta`, `${at2} \xB7 freou ${Math.round(v)} m mais tarde que na sua melhor volta`) : o.why === "fast" ? Tx(`${at2} \xB7 too fast at turn-in, ${sp(v)} more than on your best lap`, `${at2} \xB7 demasiado r\xE1pido al girar, ${sp(v)} m\xE1s que en tu mejor vuelta`, `${at2} \xB7 r\xE1pido demais na entrada, ${sp(v)} a mais que na sua melhor volta`) : o.why === "throttle" ? Tx(`${at2} \xB7 early throttle, ${Math.round(v)} m before your best lap`, `${at2} \xB7 acelerador pronto, ${Math.round(v)} m antes que en tu mejor vuelta`, `${at2} \xB7 acelerador cedo, ${Math.round(v)} m antes da sua melhor volta`) : Tx(`${at2} \xB7 speed and pedals like your best lap there, so the line took you off`, `${at2} \xB7 velocidad y pedales como en tu mejor vuelta ah\xED, as\xED que fue la trazada`, `${at2} \xB7 velocidade e pedais como na sua melhor volta ali, ent\xE3o foi o tra\xE7ado`);
            out.push({ lap: L.n, d: Math.round(a[i]), k, pts, n, why: o.why, v: Math.round(v * 10) / 10, text: text2 });
          }
        });
        return out;
      }
      __name(offsExplained, "offsExplained");
      function offWhy(L, R, d, ctx) {
        const U = unitsOf(ctx), sl = serOf(L), sr = serOf(R), n = Math.min(sl.length, sr.length), j = Math.min(n - 1, Math.max(0, Math.round(d / BIN3)));
        const all = cornerZones(sr, sr.length, turnsOf(ctx), ctx && ctx.oval);
        let zi = -1;
        all.forEach((q2, k) => {
          if (q2.i <= j + 2 && j - q2.i <= 60) zi = k;
        });
        const z = zi >= 0 ? all[zi] : null, num4 = z ? z.turn != null ? z.turn + 1 : zi + 1 : 0;
        const at2 = /* @__PURE__ */ __name((s, i, c2) => s[i] ? s[i][c2] : null, "at");
        const c = [];
        if (z) {
          const apex = z.imin, from = Math.max(1, z.i - 30), to = Math.min(apex, j);
          const onset = /* @__PURE__ */ __name((s) => {
            for (let i = from; i <= to; i++) if (at2(s, i, 3) > 0.1) return i;
            return -1;
          }, "onset");
          const oL = onset(sl), oR = onset(sr);
          if (oL >= 0 && oR >= 0) c.push({ why: "late", v: (oL - oR) * BIN3, s: (oL - oR) * BIN3 / 10 });
          const peak = /* @__PURE__ */ __name((s, a, b) => {
            let m = 0;
            for (let i = a; i <= b; i++) m = Math.max(m, at2(s, i, 3) || 0);
            return m;
          }, "peak");
          if (oL >= 0) {
            const pL = peak(sl, oL, to), pR = peak(sr, Math.max(from, oR), to);
            if (pL >= 0.9) c.push({ why: "lock", v: pL, r: pR, s: (pL - pR) / 0.1 });
          }
          let ti = Math.max(z.i, apex - 6);
          for (let i = z.i; i < apex; i++) if (at2(sr, i, 3) != null && at2(sr, i, 3) < 0.1 && i > (oR >= 0 ? oR : z.i)) {
            ti = i;
            break;
          }
          ti = Math.min(ti, j);
          if (at2(sl, ti, 0) != null && at2(sr, ti, 0) != null) {
            const dv = U.spd(at2(sl, ti, 0)) - U.spd(at2(sr, ti, 0));
            c.push({ why: "fast", v: dv, s: dv / 4 });
          }
          if (j >= apex - 4) {
            const thr = /* @__PURE__ */ __name((s) => {
              for (let i = Math.max(0, apex - 10); i <= Math.min(n - 1, apex + 40); i++) if (at2(s, i, 2) > 0.5 && !(at2(s, i, 3) > 0.1)) return i;
              return -1;
            }, "thr");
            const tL = thr(sl), tR = thr(sr);
            if (tL >= 0 && tR >= 0 && tL <= j) c.push({ why: "throttle", v: (tR - tL) * BIN3, s: (tR - tL) * BIN3 / 15 });
          }
        } else {
          const q2 = Math.max(0, j - 10);
          if (at2(sl, q2, 0) != null && at2(sr, q2, 0) != null) {
            const dv = U.spd(at2(sl, q2, 0)) - U.spd(at2(sr, q2, 0));
            c.push({ why: "fast", v: dv, s: dv / 4 });
          }
        }
        const top = c.filter((x) => x.s >= 1).sort((a, b) => b.s - a.s)[0];
        return top ? { ...top, n: num4 } : { why: "line", v: 0, n: num4 };
      }
      __name(offWhy, "offWhy");
      function ggOf(l) {
        const g = ggRaw(l);
        return g ? { pts: g.pts, max: g.max } : null;
      }
      __name(ggOf, "ggOf");
      function ggRaw(l) {
        const s = serOf(l), n = s.length, xy = l && l.xy;
        if (!xy || !Array.isArray(xy.x) || xy.x.length < 20 || n < 20) return null;
        const N2 = xy.x.length, P = /* @__PURE__ */ __name((i) => {
          const q2 = Math.max(0, Math.min(N2 - 1, Math.round(i * N2 / n)));
          return [xy.x[q2], xy.y[q2]];
        }, "P");
        const pts = [], idx = [];
        let mLat = 0, mBr = 0, mAc = 0;
        for (let i = 4; i < n - 4; i += 2) {
          const a = s[i - 2], b = s[i + 2], m = s[i];
          if (!a || !b || !m) continue;
          const dt = b[1] - a[1], v = m[0];
          if (!(dt > 0.01 && dt < 5) || !(v > 5)) continue;
          const lg = (b[0] - a[0]) / dt / 9.81;
          const p0 = P(i - 4), p1 = P(i), p2 = P(i + 4);
          const ax = p1[0] - p0[0], ay = p1[1] - p0[1], bx = p2[0] - p1[0], by = p2[1] - p1[1], cx = p2[0] - p0[0], cy = p2[1] - p0[1];
          const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by), lc = Math.hypot(cx, cy);
          if (!(la > 1 && lb > 1 && lc > 1)) continue;
          const k = 2 * (ax * by - ay * bx) / (la * lb * lc), lat = v * v * k / 9.81;
          if (!isFinite(lat) || !isFinite(lg) || Math.abs(lat) > 5 || Math.abs(lg) > 5) continue;
          pts.push([Math.round(lat * 100) / 100, Math.round(lg * 100) / 100]);
          idx.push(i);
          mLat = Math.max(mLat, Math.abs(lat));
          mBr = Math.max(mBr, -lg);
          mAc = Math.max(mAc, lg);
        }
        const r22 = /* @__PURE__ */ __name((x) => Math.round(x * 100) / 100, "r2");
        return pts.length < 20 ? null : { pts, idx, max: { lat: r22(mLat), brake: r22(mBr), acc: r22(mAc) } };
      }
      __name(ggRaw, "ggRaw");
      function steerOf(l, ctx) {
        const U = unitsOf(ctx), s = serOf(l), out = [];
        for (let i = 0; i < s.length; i += 2) {
          const b = s[i];
          if (!b || !(b[0] > 5) || !isFinite(b[5])) continue;
          const deg = Math.abs(b[5]) * 180 / Math.PI;
          if (deg > 3) out.push([Math.round(U.spd(b[0])), Math.round(deg * 10) / 10]);
        }
        return out;
      }
      __name(steerOf, "steerOf");
      function understeer(A, B, ctx) {
        const Tx = txOf(ctx), per = /* @__PURE__ */ __name((l) => {
          const g = ggRaw(l), s = serOf(l), xs = [];
          if (!g) return null;
          g.idx.forEach((i, q2) => {
            const m = s[i], lat = Math.abs(g.pts[q2][0]);
            if (m && lat > 0.5 && isFinite(m[5]) && m[5] !== 0) xs.push(Math.abs(m[5]) * 180 / Math.PI / lat);
          });
          return xs.length >= 10 ? xs.sort((x, y) => x - y)[Math.floor(xs.length / 2)] : null;
        }, "per");
        const a = per(A), b = B ? per(B) : null;
        if (a == null) return null;
        const out = { a: r1(a), b: b == null ? null : r1(b) };
        if (b != null && b > 0) {
          const f = a / b - 1;
          out.text = f >= 0.1 ? Tx(`A needs ${Math.round(f * 100)} % more steering than B for the same grip, so A pushes (understeer)`, `A necesita un ${Math.round(f * 100)} % m\xE1s de volante que B para el mismo agarre, as\xED que A empuja (subviraje)`, `A precisa de ${Math.round(f * 100)} % mais volante que B para a mesma ader\xEAncia, ent\xE3o A empurra (subester\xE7o)`) : f <= -0.1 ? Tx(`A needs ${Math.round(-f * 100)} % less steering than B for the same grip, so the rear moves more (oversteer)`, `A necesita un ${Math.round(-f * 100)} % menos de volante que B para el mismo agarre, as\xED que la trasera se mueve m\xE1s (sobreviraje)`, `A precisa de ${Math.round(-f * 100)} % menos volante que B para a mesma ader\xEAncia, ent\xE3o a traseira se mexe mais (sobrester\xE7o)`) : Tx("A and B need the same steering for the same grip", "A y B necesitan el mismo volante para el mismo agarre", "A e B precisam do mesmo volante para a mesma ader\xEAncia");
        }
        return out;
      }
      __name(understeer, "understeer");
      function tyreLaps(laps) {
        return (laps || []).filter((l) => l && Array.isArray(l.tt) && l.tt.length === 12).map((l) => ({ n: l.n, tt: l.tt, avg: [0, 1, 2, 3].map((w) => r1((l.tt[w * 3] + l.tt[w * 3 + 1] + l.tt[w * 3 + 2]) / 3)) }));
      }
      __name(tyreLaps, "tyreLaps");
      function fuelUse(laps, ctx) {
        const ls = (laps || []).filter((l) => l && l.fuel > 0 && !l.pit && l.time > 0);
        if (ls.length < 2) return null;
        const best = Math.min(...ls.map((l) => l.time)), ok = ls.filter((l) => l.time <= best * 1.07);
        if (ok.length < 2) return null;
        const tank = ctx && ctx.tank > 0 ? ctx.tank : null;
        return { perLap: r33(meanOf(ok.map((l) => l.fuel))), maxLap: r33(Math.max(...ok.map((l) => l.fuel))), lapTime: r33(meanOf(ok.map((l) => l.time))), laps: ok.length, tank };
      }
      __name(fuelUse, "fuelUse");
      function fuelPlan(u, race) {
        if (!u || !(u.perLap > 0)) return null;
        const tank = race && race.tank > 0 ? race.tank : u.tank, spare = race && race.spare != null ? race.spare : 1;
        let laps = race && race.laps > 0 ? Math.ceil(race.laps) : 0;
        if (!laps && race && race.min > 0 && u.lapTime > 0) laps = Math.floor(race.min * 60 / u.lapTime) + 1;
        if (!laps) return null;
        const need = (laps + spare) * u.perLap, perTank = tank ? Math.floor(tank / u.perLap) : null;
        const stops = tank ? Math.max(0, Math.ceil(need / tank) - 1) : null;
        const add = stops ? (need - tank) / stops : 0;
        return { laps, need: r1(need), perTank, stops, add: r1(add), start: r1(stops ? tank : need), stint: stops != null ? Math.ceil(laps / (stops + 1)) : null, tank: tank || null };
      }
      __name(fuelPlan, "fuelPlan");
      function insights(A, B, ctx) {
        ctx = ctx || {};
        const laps = Array.isArray(ctx.laps) ? ctx.laps : [];
        return {
          spread: cornerSpread(laps, ctx),
          lapSpread: lapSpread(laps),
          offs: offsExplained(laps, ctx),
          gg: { a: A ? ggOf(A) : null, b: B ? ggOf(B) : null },
          steer: { a: A ? steerOf(A, ctx) : [], b: B ? steerOf(B, ctx) : [] },
          us: A ? understeer(A, B, ctx) : null,
          tyres: tyreLaps(laps),
          fuel: fuelUse(laps, ctx)
        };
      }
      __name(insights, "insights");
      const api2 = {
        VERSION,
        BIN: BIN3,
        lapSeries,
        serOf,
        lapShape,
        sameFrame: sameFrame2,
        lineOffsets: lineOffsets2,
        cornerLine,
        lineTip,
        brakeZones: brakeZones2,
        PHASES,
        phaseName,
        turnNo,
        COACH_GEN,
        cornerClass,
        cornerZones,
        OVAL_KINDS,
        ovalOf,
        liftZones,
        ovalZones,
        dirtLineTip,
        coachCompare,
        cornerConsistency,
        pairSecs,
        lapDriving,
        kindName,
        stepName,
        tipMain,
        tipShort,
        tipTodo,
        coachPlan,
        stepText,
        analyzerFacts,
        analyse,
        estOf,
        failedOf,
        progressLines,
        followUp,
        trackGuide,
        cornerRanks,
        clsLines,
        racePace,
        edgeUse,
        notesOf,
        guideItems,
        likeOf,
        likeSteps,
        catGroup,
        lapSpread,
        cornerSpread,
        offsExplained,
        ggOf,
        steerOf,
        understeer,
        tyreLaps,
        fuelUse,
        fuelPlan,
        insights
      };
      root.PW_ANALYSIS = api2;
      if (typeof module !== "undefined" && module.exports) module.exports = api2;
    })(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : exports);
  }
});

// src/voiceice.js
var STUN = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];
var json = /* @__PURE__ */ __name((o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" } }), "json");
async function voiceIce(env) {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return json({ iceServers: STUN });
  try {
    const r4 = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { authorization: "Bearer " + env.TURN_KEY_TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ ttl: 86400 })
    });
    const j = await r4.json();
    const got = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
    return json({ iceServers: got.length ? got : STUN });
  } catch (e) {
    return json({ iceServers: STUN });
  }
}
__name(voiceIce, "voiceIce");

// src/sourceslib.js
var SRC_RE = /^[a-z0-9._-]{1,40}$/;
var PAGE_RE = /^[a-z0-9/_-]{1,60}$/;
var SITES = [
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)yahoo\.[a-z.]+$/, "yahoo"],
  [/(^|\.)yandex\.[a-z.]+$/, "yandex"],
  [/(^|\.)baidu\.com$/, "baidu"],
  [/(^|\.)ecosia\.org$/, "ecosia"],
  [/(^|\.)search\.brave\.com$/, "brave"],
  [/(^|\.)qwant\.com$/, "qwant"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
  [/(^|\.)claude\.ai$/, "claude"],
  [/(^|\.)gemini\.google\.com$/, "gemini"],
  [/(^|\.)copilot\.microsoft\.com$/, "copilot"],
  [/(^|\.)(reddit\.com|redd\.it)$/, "reddit"],
  [/(^|\.)(discord\.com|discordapp\.com|discord\.gg)$/, "discord"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)(iracing\.com)$/, "iracing"],
  [/(^|\.)(steamcommunity\.com|steampowered\.com)$/, "steam"],
  [/(^|\.)(overtake\.gg|racedepartment\.com)$/, "overtake"],
  [/(^|\.)simhubdash\.com$/, "simhub"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(t\.me|telegram\.org)$/, "telegram"],
  [/(^|\.)linkedin\.com$/, "linkedin"]
];
var SRC_KIND = {
  google: "search",
  bing: "search",
  duckduckgo: "search",
  yahoo: "search",
  yandex: "search",
  baidu: "search",
  ecosia: "search",
  brave: "search",
  qwant: "search",
  chatgpt: "ai",
  perplexity: "ai",
  claude: "ai",
  gemini: "ai",
  copilot: "ai",
  reddit: "community",
  discord: "community",
  iracing: "community",
  overtake: "community",
  steam: "community",
  simhub: "community",
  github: "community",
  youtube: "social",
  facebook: "social",
  instagram: "social",
  x: "social",
  tiktok: "social",
  twitch: "social",
  whatsapp: "social",
  telegram: "social",
  linkedin: "social",
  direct: "direct"
};
var kindOf = /* @__PURE__ */ __name((src) => SRC_KIND[src] || (/-app$/.test(src) ? "app" : src === "unknown" ? "unknown" : "other"), "kindOf");
var SELF = /(^|\.)pitlanehq\.app$|^localhost$|^127\.0\.0\.1$/;
var cleanSrc = /* @__PURE__ */ __name((s) => String(s == null ? "" : s).toLowerCase().trim().replace(/^www\./, "").replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40), "cleanSrc");
function siteOf(ref) {
  let host = "";
  const s = String(ref == null ? "" : ref).trim();
  if (!s) return "direct";
  const app = /^android-app:\/\/([a-z0-9._]+)/i.exec(s);
  if (app) {
    const id2 = app[1].toLowerCase();
    if (id2 === "com.google.android.googlequicksearchbox") return "google";
    if (id2 === "com.reddit.frontpage") return "reddit";
    if (id2 === "com.discord") return "discord";
    if (id2 === "com.google.android.gm") return "gmail";
    return cleanSrc("app-" + id2.split(".").pop());
  }
  try {
    host = new URL(s).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  if (!host) return "direct";
  if (SELF.test(host)) return "";
  for (const [re, name2] of SITES) if (re.test(host)) return name2;
  if (/(^|\.)mail\.google\.com$/.test(host)) return "gmail";
  return cleanSrc(host.replace(/^(m|l|lm|old|new|mobile)\./, "")) || "direct";
}
__name(siteOf, "siteOf");
function pageOf(p) {
  let s = String(p == null ? "" : p).toLowerCase().split(/[?#]/)[0].replace(/\/+$/, "");
  if (!s || s === "/" || s === "/index.html") return "landing";
  if (s === "/app" || s.startsWith("/app/")) return "app";
  s = s.replace(/^\/+/, "").replace(/[^a-z0-9/_-]+/g, "-").slice(0, 60);
  return PAGE_RE.test(s) ? s : "other";
}
__name(pageOf, "pageOf");
function visitOf(b) {
  if (!b || typeof b !== "object") return { src: "direct", page: "landing", campaign: "" };
  const tag3 = cleanSrc(b.us);
  const campaign = cleanSrc(b.uc).slice(0, 40);
  const src = tag3 ? SRC_KIND[tag3] ? tag3 : SITES.some(([re]) => re.test(tag3)) ? siteOf("https://" + tag3 + "/") : tag3 : siteOf(b.ref);
  return { src: src === "" || SRC_RE.test(src) ? src : "direct", page: pageOf(b.page), campaign };
}
__name(visitOf, "visitOf");
var countryOf = /* @__PURE__ */ __name((cf) => {
  const c = String(cf && cf.country || "").toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== "T1" ? c : "XX";
}, "countryOf");
function appSrc(client) {
  const k = String(client || "").trim().toLowerCase().split("/")[0];
  return k === "pc" || k === "desktop" ? "pc-app" : k === "android" || k === "ios" ? k + "-app" : "unknown";
}
__name(appSrc, "appSrc");
var isBot = /* @__PURE__ */ __name((ua) => !ua || /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|curl|wget|python|httpclient|go-http/i.test(ua), "isBot");
var SQL_VISIT_ADD = "INSERT INTO visits_days (day, src, country, page, n) VALUES (?1,?2,?3,?4,1) ON CONFLICT(day, src, country, page) DO UPDATE SET n=MIN(visits_days.n+1, 1000000)";
var SQL_ACCOUNT_SRC = "UPDATE accounts SET src=?2, src_page=?3, country=?4 WHERE id=?1 AND src IS NULL";
function sourcesOf(visits, prevVisits, signups, prevSignups) {
  const sum = /* @__PURE__ */ __name((rows, key2) => {
    const m = /* @__PURE__ */ new Map();
    for (const r4 of rows) m.set(r4[key2], (m.get(r4[key2]) || 0) + (r4.n || 0));
    return m;
  }, "sum");
  const vSrc = sum(visits, "src"), vCountry = sum(visits, "country"), vPage = sum(visits, "page"), pSrc = sum(prevVisits, "src");
  const sSrc = /* @__PURE__ */ new Map(), sCountry = /* @__PURE__ */ new Map();
  for (const a of signups) {
    const s = a.src || "unknown", c = a.country || "XX";
    sSrc.set(s, (sSrc.get(s) || 0) + 1);
    sCountry.set(c, (sCountry.get(c) || 0) + 1);
  }
  const pAcc = /* @__PURE__ */ new Map();
  for (const a of prevSignups) {
    const s = a.src || "unknown";
    pAcc.set(s, (pAcc.get(s) || 0) + 1);
  }
  const srcs = /* @__PURE__ */ new Set([...vSrc.keys(), ...sSrc.keys()]);
  const total = /* @__PURE__ */ __name((m) => [...m.values()].reduce((a, b) => a + b, 0), "total");
  return {
    visits: total(vSrc),
    prevVisits: total(pSrc),
    signups: signups.length,
    prevSignups: prevSignups.length,
    bySource: [...srcs].map((src) => ({ src, kind: kindOf(src), visits: vSrc.get(src) || 0, prevVisits: pSrc.get(src) || 0, signups: sSrc.get(src) || 0, prevSignups: pAcc.get(src) || 0 })).sort((a, b) => b.visits + b.signups * 20 - (a.visits + a.signups * 20)).slice(0, 40),
    byCountry: [.../* @__PURE__ */ new Set([...vCountry.keys(), ...sCountry.keys()])].map((country) => ({ country, visits: vCountry.get(country) || 0, signups: sCountry.get(country) || 0 })).sort((a, b) => b.visits + b.signups * 20 - (a.visits + a.signups * 20)).slice(0, 40),
    byPage: [...vPage].map(([page4, n]) => ({ page: page4, visits: n })).sort((a, b) => b.visits - a.visits).slice(0, 25)
  };
}
__name(sourcesOf, "sourcesOf");
var VISIT_JS = `<script>(function(){try{var q=new URLSearchParams(location.search),v={ref:document.referrer,page:location.pathname,us:q.get("utm_source")||q.get("ref")||"",um:q.get("utm_medium")||"",uc:q.get("utm_campaign")||""};if(!/(^|\\.)pitlanehq\\.app$/.test(location.hostname))return;try{if(!localStorage.getItem("pw.src0"))localStorage.setItem("pw.src0",JSON.stringify(v))}catch(e){}if(sessionStorage.getItem("pw.v"))return;sessionStorage.setItem("pw.v","1");var b=JSON.stringify(v);if(navigator.sendBeacon)navigator.sendBeacon("/community/visit",new Blob([b],{type:"text/plain"}));else fetch("/community/visit",{method:"POST",body:b,keepalive:true})}catch(e){}})()<\/script>`;

// src/downloads.js
var H = { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "referrer-policy": "no-referrer", vary: "Accept-Language" };
var esc = /* @__PURE__ */ __name((s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]), "esc");
var TYPES = { exe: "application/vnd.microsoft.portable-executable", zip: "application/zip", apk: "application/vnd.android.package-archive", aab: "application/octet-stream", ipa: "application/octet-stream", json: "application/json; charset=utf-8", md: "text/markdown; charset=utf-8" };
async function downloads(req, env, url) {
  const p = url.pathname;
  if (!env.DL) return new Response(JSON.stringify({ error: "downloads are not set up on this server (R2 bucket DL)" }), { status: 404, headers: { "content-type": "application/json" } });
  if (p.startsWith("/dl/")) {
    const name2 = decodeURIComponent(p.slice(4));
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(name2)) return new Response("not found", { status: 404 });
    const o = await env.DL.get(name2);
    if (!o) return new Response("not found", { status: 404 });
    if (name2 === "version.json") return pcVersion(await o.text());
    const ext = name2.split(".").pop().toLowerCase();
    const h = new Headers({ "content-type": TYPES[ext] || "application/octet-stream", "cache-control": ext === "json" || ext === "md" ? "no-cache" : "public, max-age=300", "x-content-type-options": "nosniff", "access-control-allow-origin": "*" });
    if (o.httpEtag) h.set("etag", o.httpEtag);
    if (!["json", "md"].includes(ext)) h.set("content-disposition", `attachment; filename="${name2}"`);
    h.set("content-length", String(o.size));
    return new Response(o.body, { headers: h });
  }
  const read = /* @__PURE__ */ __name(async (n) => {
    const o = await env.DL.get(n);
    return o ? o.text() : null;
  }, "read");
  const json16 = /* @__PURE__ */ __name(async (n) => {
    try {
      return JSON.parse(await read(n) || "null");
    } catch (e) {
      return null;
    }
  }, "json");
  const es = (req.headers.get("accept-language") || "").toLowerCase().startsWith("es");
  if (p === "/downloads/" || p === "/changelog/") return Response.redirect("https://pitlanehq.app" + p.slice(0, -1), 301);
  if (p === "/downloads") {
    const pc = await json16("version.json") || {}, ph = await json16("phones.json") || {};
    const t = /* @__PURE__ */ __name((en, s) => es ? s : en, "t");
    const row = /* @__PURE__ */ __name((title, sub, file) => `<a class="c" href="/dl/${esc(file)}"><b>${esc(title)}</b><span>${esc(sub)}</span></a>`, "row");
    const body = `<h1>${t("Download Pitlane HQ", "Descargar Pitlane HQ")}</h1><p>${t("Free. One account for the PC, the web and the phone apps.", "Gratis. Una cuenta para el PC, la web y las apps de m\xF3vil.")}</p>
<h2>Windows ${pc.version ? `<small>v${esc(pc.version)} beta</small>` : ""}</h2><div class="g">
${row(t("Pitlane HQ for Windows", "Pitlane HQ para Windows"), t("Records your laps and uploads them so you can analyse them", "Graba tus vueltas y las sube para que las analices"), "PitlaneHQ-Setup.exe")}</div>
<h2>${t("Phones", "M\xF3viles")} ${ph.version ? `<small>v${esc(String(ph.version).replace(/^v/, "").replace(/-?beta$/i, ""))} beta</small>` : ""}</h2><div class="g">
${ph.apk ? row("Android", t("App (APK). Google Play soon", "App (APK). Pronto en Google Play"), ph.apk) : ""}<div class="c" style="opacity:.7"><b>iPhone</b><span>${t("Coming to the App Store", "Pronto en la App Store")}</span></div></div>
<p class="n"><a href="/changelog">${t("What changed in each version", "Qu\xE9 cambi\xF3 en cada versi\xF3n")}</a> \xB7 <a href="/">${t("Open the web app", "Abrir la app web")}</a></p>`;
    return new Response(page(body, { lang: es ? "es" : "en" }), { headers: H });
  }
  if (p === "/changelog" || p === "/changelog/phones") {
    let vs = [];
    try {
      vs = (await (await env.ASSETS.fetch(new Request(new URL("/whats-new.json", url.origin)))).json()).versions || [];
    } catch (e) {
    }
    const l = es ? "es" : "en";
    const body = `<h1>${es ? "Novedades" : "What's new"}</h1>` + vs.map((x) => `<h2 id="${esc(String(x.v).replace(/\./g, ""))}-beta">${esc(x.v)} <small>${esc(x.date || "")}</small></h2><ul>${(x[l] || x.en || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`).join("");
    return new Response(page(
      body + `<p class="n"><a href="/downloads">${es ? "Descargas" : "Downloads"}</a> \xB7 <a href="/">${es ? "Abrir la app" : "Open the app"}</a></p>`,
      { lang: es ? "es" : "en", path: p, title: "What's new in Pitlane HQ \xB7 Changelog", desc: "What changed in each version of Pitlane HQ, the iRacing and Le Mans Ultimate telemetry app for Windows, the web and Android." }
    ), { headers: H });
  }
  return new Response("not found", { status: 404 });
}
__name(downloads, "downloads");
var page = /* @__PURE__ */ __name((body, o = {}) => `<!doctype html><html lang="${o.lang || "en"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${o.title || "Download Pitlane HQ \xB7 iRacing and LMU telemetry for Windows"}</title><meta name="description" content="${o.desc || "Download Pitlane HQ Agent for Windows, which records your iRacing and Le Mans Ultimate laps, and the Android app. Free."}"><link rel="canonical" href="https://pitlanehq.app${o.path || "/downloads"}"><meta property="og:image" content="https://pitlanehq.app/og.png"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/logo.svg" type="image/svg+xml">
<style>body{margin:0;background:#11151b;color:#e7ebf1;font:16px/1.55 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:28px 16px 48px}h1{font-size:26px;letter-spacing:.04em;text-transform:uppercase;margin:0 0 6px}h2{font-size:18px;margin:26px 0 10px;letter-spacing:.03em}h2 small{color:#8a97a9;font-weight:600;font-size:12px;margin-left:8px}
h3{font-size:14px;color:#ffb02e;margin:18px 0 4px}p{color:#a9b4c3;margin:6px 0}ul{padding-left:20px;color:#c9d2de}li{margin:4px 0}code{background:#19202a;padding:1px 5px;border-radius:4px;font-size:13px}a{color:#ffb02e}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.c{display:grid;gap:3px;padding:14px;border:1px solid #2b3542;border-radius:12px;background:#19202a;text-decoration:none;color:#e7ebf1}.c:hover{border-color:#ffb02e}.c span{color:#8a97a9;font-size:13px}.n{margin-top:26px;font-size:14px}
.top{display:flex;align-items:center;gap:10px;margin-bottom:18px}.top b{font-size:15px;letter-spacing:.06em}.top img{width:28px;height:28px;border-radius:7px}</style>
<main><div class="top"><img src="/icon-192.png" alt=""><b>PITLANE HQ</b></div>${body}</main>${VISIT_JS}</html>`, "page");
var PC_MIN = "0.9.0";
var vparts = /* @__PURE__ */ __name((v) => String(v || "0").replace(/^v/, "").split("+")[0].split(".").map((x) => parseInt(x, 10) || 0), "vparts");
function versionLess(a, b) {
  const x = vparts(a), y = vparts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  return false;
}
__name(versionLess, "versionLess");
function pcVersion(text2) {
  let body = text2;
  try {
    const v = JSON.parse(text2);
    if (v && typeof v === "object" && versionLess(v.min, PC_MIN)) body = JSON.stringify({ ...v, min: PC_MIN });
  } catch (e) {
  }
  return new Response(body, { headers: { "content-type": TYPES.json, "cache-control": "no-cache", "x-content-type-options": "nosniff", "access-control-allow-origin": "*" } });
}
__name(pcVersion, "pcVersion");
var buildCache = { at: 0, build: "" };
async function latestBuild(env) {
  const now = Date.now();
  if (now - buildCache.at < 6e4) return buildCache.build;
  buildCache.at = now;
  try {
    const o = env.DL && await env.DL.get("version.json");
    const v = o ? JSON.parse(await o.text()) : null;
    buildCache.build = v && typeof v.build === "string" ? v.build : "";
  } catch (e) {
    buildCache.build = "";
  }
  return buildCache.build;
}
__name(latestBuild, "latestBuild");

// src/carfamily.js
var CAR_FAMILIES = [
  { key: "sf23", name: "Super Formula SF23", re: /^Super Formula SF23\b/i },
  { key: "cup-nextgen", name: "NASCAR Cup Series Next Gen", re: /^NASCAR Cup Series Next Gen\b/i },
  { key: "cup-gen6", name: "NASCAR Cup Series Gen 6", re: /^NASCAR (Cup|Monster Energy Cup) Series (Chevrolet|Ford|Toyota)\b/i },
  { key: "xfinity", name: "NASCAR Xfinity Series", re: /^NASCAR Xfinity\b/i },
  { key: "truck", name: "NASCAR Truck Series", re: /^NASCAR (Craftsman |Camping World |Gander (RV & )?Outdoors )?Truck\b/i },
  { key: "arca", name: "ARCA Menards Series", re: /^ARCA Menards\b/i },
  { key: "supercars-gen3", name: "Supercars Gen3", re: /^Supercars?\b.*\bGen ?3\b/i },
  { key: "supercars-gen2", name: "Supercars Gen2", re: /^Supercars? (Ford Mustang GT|Holden ZB Commodore)\b/i },
  { key: "v8supercars", name: "V8 Supercars", re: /^V8 Supercars?\b/i }
];
var famRule = /* @__PURE__ */ __name((name2) => CAR_FAMILIES.find((f) => f.re.test(String(name2 || "").trim())) || null, "famRule");
var famName = /* @__PURE__ */ __name((game, carId, name2) => {
  const f = famRule(name2);
  return f ? f.name : name2;
}, "famName");
var cache = /* @__PURE__ */ new Map();
var TTL = 5 * 6e4;
async function famId(env, game, carId) {
  const c = Math.trunc(+carId) || 0, g = game || "iracing";
  if (!c) return 0;
  const k = g + ":" + c, hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.fam;
  const row = await env.DB.prepare("SELECT fam_id FROM car_families WHERE game=?1 AND car_id=?2").bind(g, c).first().catch(() => null);
  const fam = row ? row.fam_id : c;
  cache.set(k, { fam, at: Date.now() });
  return fam;
}
__name(famId, "famId");
async function famIds(env, game, carId) {
  const fam = await famId(env, game, carId);
  if (!fam) return [];
  const r4 = await env.DB.prepare("SELECT car_id FROM car_families WHERE game=?1 AND fam_id=?2").bind(game || "iracing", fam).all().catch(() => null);
  const ids = /* @__PURE__ */ new Set([fam, ...(r4 && r4.results || []).map((x) => x.car_id)]);
  return [...ids];
}
__name(famIds, "famIds");
var famSql = /* @__PURE__ */ __name(async (env, game, carId) => (await famIds(env, game, carId)).map((n) => String(Math.trunc(n) || 0)).join(","), "famSql");
async function famGroups(env, game) {
  const r4 = await env.DB.prepare("SELECT car_id, fam_id FROM car_families WHERE game=?1").bind(game || "iracing").all().catch(() => null);
  const by = /* @__PURE__ */ new Map();
  for (const x of r4 && r4.results || []) {
    if (!by.has(x.fam_id)) by.set(x.fam_id, /* @__PURE__ */ new Set([x.fam_id]));
    by.get(x.fam_id).add(x.car_id);
  }
  return by;
}
__name(famGroups, "famGroups");
async function noteCar(env, game, carId, name2) {
  const c = Math.trunc(+carId) || 0, g = game || "iracing", f = famRule(name2);
  if (!c || !f || c >= 9e8) return famId(env, g, c);
  const k = g + ":" + c, hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL && hit.known) return hit.fam;
  const row = await env.DB.prepare("SELECT fam_id FROM car_families WHERE game=?1 AND car_id=?2").bind(g, c).first();
  if (row) {
    cache.set(k, { fam: row.fam_id, at: Date.now(), known: true });
    return row.fam_id;
  }
  const head = await env.DB.prepare("SELECT fam_id FROM car_families WHERE game=?1 AND fam=?2 ORDER BY created LIMIT 1").bind(g, f.key).first();
  const fam = head ? head.fam_id : c;
  await env.DB.prepare("INSERT OR IGNORE INTO car_families (game, car_id, fam_id, fam, created) VALUES (?1,?2,?3,?4,?5)").bind(g, c, fam, f.key, Date.now()).run();
  if (fam !== c) await joinCar(env, g, c, fam);
  cache.set(k, { fam, at: Date.now(), known: true });
  return fam;
}
__name(noteCar, "noteCar");
async function joinCar(env, game, carId, fam) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM community_laps WHERE game=?1 AND car_id=?3 AND EXISTS (SELECT 1 FROM community_laps o WHERE o.game=?1 AND o.car_id=?2
      AND o.user_id=community_laps.user_id AND o.track_id=community_laps.track_id AND o.time<community_laps.time)`).bind(game, carId, fam),
    env.DB.prepare("UPDATE OR IGNORE community_laps SET car_id=?3 WHERE game=?1 AND car_id=?2").bind(game, carId, fam),
    env.DB.prepare("DELETE FROM community_laps WHERE game=?1 AND car_id=?2").bind(game, carId),
    env.DB.prepare("UPDATE OR IGNORE model_laps SET car_id=?3 WHERE game=?1 AND car_id=?2").bind(game, carId, fam),
    env.DB.prepare("DELETE FROM model_laps WHERE game=?1 AND car_id=?2").bind(game, carId),
    env.DB.prepare("DELETE FROM model_cache WHERE game=?1 AND car_id IN (?2, ?3)").bind(game, carId, fam),
    env.DB.prepare("DELETE FROM car_cards WHERE game=?1 AND car_id IN (?2, ?3)").bind(game, carId, fam)
  ]);
}
__name(joinCar, "joinCar");

// src/trackgeo.js
var TURN_RADIUS = 300;
var TURN_MIN_M = 20;
var TURN_GAP_M = 60;
var SMOOTH = 3;
function curvature(x, y, step = 5) {
  const n = Math.min(x.length, y.length), k = new Array(n).fill(0);
  if (n < 20) return k;
  const at2 = /* @__PURE__ */ __name((i) => (i % n + n) % n, "at");
  const head = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = at2(i - SMOOTH), b = at2(i + SMOOTH);
    head[i] = Math.atan2(y[b] - y[a], x[b] - x[a]);
  }
  for (let i = 0; i < n; i++) {
    let d = head[at2(i + 1)] - head[at2(i - 1)];
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    k[i] = d / (2 * step);
  }
  return k;
}
__name(curvature, "curvature");
function cornersOf(x, y, step = 5, want = 0, slows = []) {
  const n = Math.min(x.length, y.length);
  if (n < 20) return [];
  const k = curvature(x, y, step), slow = slowTest(slows, n, step);
  let cs = want > 0 && want <= 60 ? fitCount(k, n, step, want, slows) : cornersAt(k, n, step, TURN_RADIUS);
  if (!(want > 0) && slow) cs = addDriven(cs, k, n, step, slows);
  return cs.map(({ pts, ...c }) => c);
}
__name(cornersOf, "cornersOf");
var SLOW_NEAR_M = 60;
var slowAt = /* @__PURE__ */ __name((slows, n) => slows.filter((f) => isFinite(f) && f >= 0 && f < 1).map((f) => Math.round(f * n) % n), "slowAt");
var ringD = /* @__PURE__ */ __name((a, b, n) => {
  const d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
}, "ringD");
function slowTest(slows, n, step) {
  const s = Array.isArray(slows) ? slowAt(slows, n) : [];
  if (!s.length) return null;
  const near = Math.round(SLOW_NEAR_M / step);
  return (c) => s.some((i) => ringD(i, c.i, n) <= near || c.from <= i && i <= c.to);
}
__name(slowTest, "slowTest");
function addDriven(cs, k, n, step, slows) {
  const wide = cornersAt(k, n, step, RELAX[RELAX.length - 1]), near = Math.round(SLOW_NEAR_M / step), out = cs.slice();
  for (const i of slowAt(slows, n)) {
    if (out.some((c) => ringD(c.i, i, n) <= near || c.from <= i && i <= c.to)) continue;
    const w = wide.filter((c) => ringD(c.i, i, n) <= near).sort((a, b) => ringD(a.i, i, n) - ringD(b.i, i, n))[0];
    if (w && !out.includes(w)) out.push(w);
  }
  return order(out);
}
__name(addDriven, "addDriven");
function cornersAt(k, n, step, radius) {
  const lim = 1 / radius, minPts = Math.max(2, Math.round(TURN_MIN_M / step)), gapPts = Math.round(TURN_GAP_M / step);
  const runs = [];
  let start = 0;
  while (start < n && Math.abs(k[start]) > lim) start++;
  if (start >= n) return [];
  for (let c = 0; c < n; c++) {
    const i = (start + c) % n;
    const s = Math.abs(k[i]) > lim ? Math.sign(k[i]) : 0;
    const last = runs[runs.length - 1];
    if (s && last && last.dir === s && last.open) last.pts.push(i);
    else if (s) {
      if (last) last.open = false;
      runs.push({ dir: s, pts: [i], open: true });
    } else if (last && last.open) {
      last.open = false;
    }
  }
  const merged = [];
  for (const r4 of runs) {
    const last = merged[merged.length - 1];
    const gap2 = last ? (r4.pts[0] - last.pts[last.pts.length - 1] + n) % n : 1e9;
    if (last && last.dir === r4.dir && gap2 <= gapPts) last.pts.push(...r4.pts);
    else merged.push({ dir: r4.dir, pts: r4.pts.slice() });
  }
  return order(merged.filter((r4) => r4.pts.length >= minPts).map((r4) => corner(k, r4.dir, r4.pts)));
}
__name(cornersAt, "cornersAt");
function corner(k, dir, pts) {
  let apex = pts[0];
  for (const p of pts) if (Math.abs(k[p]) > Math.abs(k[apex])) apex = p;
  return { i: apex, from: pts[0], to: pts[pts.length - 1], dir, r: Math.round(1 / Math.max(Math.abs(k[apex]), 1e-6)), pts };
}
__name(corner, "corner");
var order = /* @__PURE__ */ __name((cs) => cs.sort((a, b) => a.i - b.i), "order");
var MERGE_GAP_M = 100;
var SPLIT_MIN_M = 30;
var SPLIT_DIP = 0.6;
var RELAX = [TURN_RADIUS, 400, 550, 750, 1e3];
function fitCount(k, n, step, want, slows = []) {
  let best = [];
  const slow = slowTest(slows, n, step);
  for (const radius of RELAX) {
    let cs = splitTo(cornersAt(k, n, step, radius), k, want, step);
    if (slow) cs = addDriven(cs, k, n, step, slows);
    if (cs.length >= want) return reduceTo(cs, want, n, step, k, slow);
    if (cs.length > best.length) best = cs;
  }
  return best;
}
__name(fitCount, "fitCount");
function splitTo(cs, k, want, step) {
  cs = cs.slice();
  const minPts = Math.round(SPLIT_MIN_M / step), w = 3;
  while (cs.length < want) {
    let pick = null;
    cs.forEach((c2, ci) => {
      const a = c2.pts.map((p) => Math.abs(k[p])), m = a.length;
      if (m < 2 * minPts) return;
      const peaks = [];
      for (let j = 0; j < m; j++) {
        let top = true;
        for (let d = -w; d <= w && top; d++) if (d && j + d >= 0 && j + d < m && a[j + d] > a[j]) top = false;
        if (top) peaks.push(j);
      }
      peaks.sort((p, q2) => a[q2] - a[p]);
      const p1 = peaks[0], p2 = peaks.find((p) => Math.abs(p - p1) >= minPts);
      if (p1 == null || p2 == null) return;
      const lo = Math.min(p1, p2), hi = Math.max(p1, p2);
      let dip = lo;
      for (let j = lo; j <= hi; j++) if (a[j] < a[dip]) dip = j;
      const ratio = a[dip] / Math.min(a[p1], a[p2]);
      if (ratio < SPLIT_DIP && (!pick || ratio < pick.ratio)) pick = { ci, dip, ratio };
    });
    if (!pick) break;
    const c = cs[pick.ci];
    cs.splice(pick.ci, 1, corner(k, c.dir, c.pts.slice(0, pick.dip + 1)), corner(k, c.dir, c.pts.slice(pick.dip + 1)));
    order(cs);
  }
  return cs;
}
__name(splitTo, "splitTo");
function reduceTo(cs, want, n, step, k, slow = null) {
  cs = order(cs.slice());
  const gapMax = Math.round(MERGE_GAP_M / step);
  while (cs.length > want && cs.length > 1) {
    let pick = -1, best = 1e9;
    for (let j = 0; j < cs.length; j++) {
      const a = cs[j], b = cs[(j + 1) % cs.length];
      if (a === b || a.dir !== b.dir) continue;
      const gap2 = (b.from - a.to + n) % n;
      if (gap2 <= gapMax && gap2 < best) {
        best = gap2;
        pick = j;
      }
    }
    if (pick >= 0) {
      const a = cs[pick], j2 = (pick + 1) % cs.length, b = cs[j2];
      const joined = corner(k, a.dir, a.pts.concat(b.pts));
      cs = cs.filter((c, j) => j !== pick && j !== j2);
      cs.push(joined);
    } else {
      let g = -1;
      const pool = slow && cs.some((c) => !slow(c)) ? (c) => !slow(c) : () => true;
      cs.forEach((c, j) => {
        if (pool(c) && (g < 0 || c.r > cs[g].r)) g = j;
      });
      cs.splice(g, 1);
    }
    order(cs);
  }
  return cs;
}
__name(reduceTo, "reduceTo");
function turnsFromPath(x, y, want = 0, slows = []) {
  const n = Math.min(x.length, y.length);
  return cornersOf(x, y, 5, want, slows).map((c) => Math.round(c.i / n * 1e5) / 1e5);
}
__name(turnsFromPath, "turnsFromPath");
function lineOffsets(ax, ay, bx, by) {
  const n = Math.min(ax.length, ay.length, bx.length, by.length);
  if (n < 60) return null;
  const lat = new Array(n), lon = new Array(n);
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 2), i1 = Math.min(n - 1, i + 2);
    let tx = bx[i1] - bx[i0], ty = by[i1] - by[i0];
    const tm = Math.hypot(tx, ty) || 1;
    tx /= tm;
    ty /= tm;
    const dx = ax[i] - bx[i], dy = ay[i] - by[i];
    lat[i] = -ty * dx + tx * dy;
    lon[i] = tx * dx + ty * dy;
  }
  const W2 = 80, sm = /* @__PURE__ */ __name((v) => {
    const pre = [0];
    v.forEach((x, i) => pre.push(pre[i] + x));
    return v.map((x, i) => {
      const lo = Math.max(0, i - W2), hi = Math.min(n - 1, i + W2);
      return x - (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
    });
  }, "sm");
  const lc = sm(lat), oc = sm(lon), ab = oc.map(Math.abs).sort((p, q2) => p - q2);
  if (ab[n >> 1] > 6) return null;
  return lc.map((v, i) => Math.abs(oc[i]) > 20 || Math.abs(v) > 25 ? NaN : v);
}
__name(lineOffsets, "lineOffsets");
function sameFrame(a, b) {
  if (!a || !b || !!a.g !== !!b.g) return null;
  if (!a.g || a.g[0] === b.g[0] && a.g[1] === b.g[1]) return b;
  const dx = (b.g[1] - a.g[1]) * 111320 * Math.cos(a.g[0] * Math.PI / 180), dy = (b.g[0] - a.g[0]) * 110540;
  return { ...b, x: b.x.map((v) => v + dx), y: b.y.map((v) => v + dy) };
}
__name(sameFrame, "sameFrame");
function insideSign(bx, by, apex) {
  const n = Math.min(bx.length, by.length);
  if (apex <= 0 || apex >= n - 1) return 0;
  const tan = /* @__PURE__ */ __name((i) => {
    const i0 = Math.max(0, i - 2), i1 = Math.min(n - 1, i + 2), tx = bx[i1] - bx[i0], ty = by[i1] - by[i0], m = Math.hypot(tx, ty) || 1;
    return [tx / m, ty / m];
  }, "tan");
  const t1 = tan(Math.max(0, apex - 8)), t2 = tan(Math.min(n - 1, apex + 8)), cr = t1[0] * t2[1] - t1[1] * t2[0];
  if (Math.abs(cr) < 0.05) return 0;
  return cr < 0 ? -1 : 1;
}
__name(insideSign, "insideSign");

// src/crypt.js
var enc = new TextEncoder();
var dec = new TextDecoder();
var b64 = /* @__PURE__ */ __name((b) => btoa(String.fromCharCode(...new Uint8Array(b))), "b64");
var unb64 = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)), "unb64");
var keyCache = null;
async function dataKey(env) {
  if (!env.DATA_KEY) return null;
  if (keyCache && keyCache.src === env.DATA_KEY) return keyCache.key;
  const raw = await crypto.subtle.digest("SHA-256", enc.encode("trackiq-data-v1:" + env.DATA_KEY));
  const key2 = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  keyCache = { src: env.DATA_KEY, key: key2 };
  return key2;
}
__name(dataKey, "dataKey");
async function sealData(env, s) {
  if (s == null) return s;
  const key2 = await dataKey(env);
  if (!key2) return s;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode("trackiq-data") }, key2, enc.encode(String(s)));
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), 12);
  return "enc:" + b64(out);
}
__name(sealData, "sealData");
async function openData(env, s) {
  if (typeof s !== "string" || !s.startsWith("enc:")) return s;
  const key2 = await dataKey(env);
  if (!key2) throw new Error("DATA_KEY is not set on this server: sealed data cannot be read");
  const all = unb64(s.slice(4));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.subarray(0, 12), additionalData: enc.encode("trackiq-data") }, key2, all.subarray(12));
  return dec.decode(pt);
}
__name(openData, "openData");
var B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(bytes) {
  let bits = 0, val = 0, out = "";
  for (const b of bytes) {
    val = val << 8 | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[val >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[val << 5 - bits & 31];
  return out;
}
__name(base32, "base32");
function unbase32(s) {
  const clean2 = String(s || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, val = 0;
  const out = [];
  for (const c of clean2) {
    val = val << 5 | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push(val >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
__name(unbase32, "unbase32");
var newTotpSecret = /* @__PURE__ */ __name(() => base32(crypto.getRandomValues(new Uint8Array(20))), "newTotpSecret");
async function hotp(secret, counter) {
  const key2 = await crypto.subtle.importKey("raw", unbase32(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    msg[i] = counter & 255;
    counter = Math.floor(counter / 256);
  }
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key2, msg));
  const o = h[19] & 15;
  const code = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6;
  return String(code).padStart(6, "0");
}
__name(hotp, "hotp");
async function totpOK(secret, code) {
  const c = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(c)) return false;
  const now = Math.floor(Date.now() / 3e4);
  for (const d of [0, -1, 1]) if (await hotp(secret, now + d) === c) return true;
  return false;
}
__name(totpOK, "totpOK");
var otpauthURL = /* @__PURE__ */ __name((secret, label, issuer = "Pitlane HQ") => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`, "otpauthURL");
function newRecoveryCodes() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => {
    const r4 = crypto.getRandomValues(new Uint8Array(8));
    const s = [...r4].map((x) => a[x % a.length]).join("");
    return s.slice(0, 4) + "-" + s.slice(4);
  });
}
__name(newRecoveryCodes, "newRecoveryCodes");

// src/trackmaps.js
var STATE = "trackmaps_rebuild";
var PER_RUN = 3;
var PER_TRACK = 6;
async function turnCount(env, game, trackId) {
  const r4 = await env.DB.prepare("SELECT nturns FROM track_info WHERE game=?1 AND track_id=?2").bind(game, trackId).first().catch(() => null);
  return r4 && r4.nturns > 0 ? r4.nturns : 0;
}
__name(turnCount, "turnCount");
async function noteTurnCount(env, game, trackId, track2, nturns) {
  const n = Number(nturns);
  if (!trackId || !Number.isInteger(n) || n < 1 || n > 60) return false;
  const old = await env.DB.prepare("SELECT nturns, track FROM track_info WHERE game=?1 AND track_id=?2").bind(game, trackId).first().catch(() => null);
  if (old && old.nturns === n && (old.track || "") === (track2 || old.track || "")) return false;
  await env.DB.prepare(`INSERT INTO track_info (game, track_id, track, nturns, updated) VALUES (?1,?2,?3,?4,?5)
     ON CONFLICT(game, track_id) DO UPDATE SET nturns=excluded.nturns, track=COALESCE(excluded.track, track_info.track), updated=excluded.updated`).bind(game, trackId, track2 ? String(track2).slice(0, 120) : null, n, Date.now()).run();
  return true;
}
__name(noteTurnCount, "noteTurnCount");
var LAYOUT_TOL = 0.06;
function traceLen(tr2) {
  if (!tr2 || !Array.isArray(tr2.d) || tr2.d.length < 20) return 0;
  const b = +tr2.bin > 0 ? +tr2.bin : 5;
  return tr2.d.length * b;
}
__name(traceLen, "traceLen");
function fitsLayout(lapLen, layN) {
  if (!(lapLen > 0) || !(layN >= 100)) return true;
  const L = layN * 5;
  return Math.abs(lapLen - L) / L <= LAYOUT_TOL;
}
__name(fitsLayout, "fitsLayout");
async function layoutN(env, game, trackId) {
  const r4 = await env.DB.prepare("SELECT n FROM track_maps WHERE game=?1 AND track_id=?2").bind(game, trackId).first().catch(() => null);
  return r4 && r4.n > 0 ? r4.n : 0;
}
__name(layoutN, "layoutN");
function geoPath(tr2) {
  if (!tr2 || !Array.isArray(tr2.g) || tr2.g.length !== 2 || !tr2.g.every((v) => typeof v === "number" && isFinite(v))) return null;
  const x = tr2.x, y = tr2.y;
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 100 || x.length > 3e3) return null;
  const ok = /* @__PURE__ */ __name((v) => typeof v === "number" && isFinite(v) && Math.abs(v) < 3e4, "ok");
  if (!x.every(ok) || !y.every(ok)) return null;
  const r1 = /* @__PURE__ */ __name((v) => Math.round(v * 10) / 10, "r1");
  return { x: x.map(r1), y: y.map(r1), g: tr2.g.map((v) => Math.round(v * 1e5) / 1e5) };
}
__name(geoPath, "geoPath");
async function rebuildTrackMaps(env, { all = false } = {}) {
  const st = await env.DB.prepare("SELECT v FROM app_state WHERE k=?1").bind(STATE).first().catch(() => null);
  let state = { done: false, seen: [] };
  try {
    if (st && st.v) state = { done: false, seen: [], ...JSON.parse(st.v) };
  } catch (e) {
  }
  if (all || state.done && Date.now() - (state.at || 0) > 864e5) state = { done: false, seen: [] };
  if (state.done) return { checked: 0, rebuilt: 0, left: 0, done: true };
  const rows = (await env.DB.prepare("SELECT game, track_id, time FROM track_maps WHERE geo IS NULL").all()).results || [];
  const seen2 = new Set(state.seen), todo = rows.filter((r4) => !seen2.has(r4.game + ":" + r4.track_id));
  const now = todo.slice(0, all ? 40 : PER_RUN);
  let rebuilt = 0;
  for (const t of now) {
    seen2.add(t.game + ":" + t.track_id);
    const laps = (await env.DB.prepare(
      `SELECT a.trace, a.time FROM sessions s JOIN laps a ON a.session_id=s.id
       WHERE s.track_id=?1 AND s.game=?2 AND a.valid=1 AND a.trace IS NOT NULL AND (instr(a.trace,'"g":[')>0 OR substr(a.trace,1,4)='enc:')
         AND COALESCE(s.kind,'') NOT LIKE '%test%' ORDER BY a.time LIMIT ${PER_TRACK}`
    ).bind(t.track_id, t.game).all().catch(() => ({ results: [] }))).results || [];
    for (const l of laps) {
      let path = null;
      try {
        path = geoPath(JSON.parse(await openData(env, l.trace)));
      } catch (e) {
        path = null;
      }
      if (!path) continue;
      await env.DB.prepare("UPDATE track_maps SET n=?3, pts=?4, time=?5, geo=?6, created=?7 WHERE game=?1 AND track_id=?2 AND geo IS NULL").bind(t.game, t.track_id, path.x.length, JSON.stringify({ x: path.x, y: path.y }), l.time, JSON.stringify(path.g), Date.now()).run();
      rebuilt++;
      break;
    }
  }
  const left = todo.length - now.length;
  state = { done: left <= 0, seen: [...seen2].slice(-500), at: left <= 0 ? Date.now() : 0 };
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(STATE, JSON.stringify(state), Date.now()).run();
  return { checked: now.length, rebuilt, left, done: state.done, withoutGeo: rows.length - rebuilt };
}
__name(rebuildTrackMaps, "rebuildTrackMaps");
var EDGE_LAPS = 40;
var EDGE_MIN = 8;
var EDGE_PER_RUN = 2;
var EDGE_AGE = 7 * 864e5;
var EDGE_Q = 0.03;
function inFrame(a, b) {
  if (!a.g || !b.g) return null;
  if (a.g[0] === b.g[0] && a.g[1] === b.g[1]) return a;
  const dx = (a.g[1] - b.g[1]) * 111320 * Math.cos(b.g[0] * Math.PI / 180), dy = (a.g[0] - b.g[0]) * 110540;
  return { x: a.x.map((v) => v + dx), y: a.y.map((v) => v + dy), g: b.g };
}
__name(inFrame, "inFrame");
function lateral(a, b) {
  const p = inFrame(a, b);
  if (!p) return null;
  const na = p.x.length, nb = b.x.length, out = new Array(nb).fill(NaN);
  if (na < 60 || nb < 60) return null;
  for (let i = 0; i < nb; i++) {
    const i0 = (i - 2 + nb) % nb, i1 = (i + 2) % nb;
    let tx = b.x[i1] - b.x[i0], ty = b.y[i1] - b.y[i0];
    const tm = Math.hypot(tx, ty) || 1;
    tx /= tm;
    ty /= tm;
    const j0 = Math.round(i * na / nb);
    let bj = -1, bd = 1e18;
    for (let k = -30; k <= 30; k++) {
      const j = ((j0 + k) % na + na) % na, dx2 = p.x[j] - b.x[i], dy2 = p.y[j] - b.y[i], d2 = dx2 * dx2 + dy2 * dy2;
      if (d2 < bd) {
        bd = d2;
        bj = j;
      }
    }
    if (bj < 0 || bd > 40 * 40) continue;
    const dx = p.x[bj] - b.x[i], dy = p.y[bj] - b.y[i];
    if (Math.abs(tx * dx + ty * dy) > 6) continue;
    out[i] = -ty * dx + tx * dy;
  }
  return out;
}
__name(lateral, "lateral");
function edgesOf(offs, nb) {
  const l = new Array(nb).fill(null), r4 = new Array(nb).fill(null);
  let have = 0;
  for (let i = 0; i < nb; i++) {
    const v = offs.map((o) => o[i]).filter((x) => isFinite(x)).sort((a, b) => a - b);
    if (v.length < EDGE_MIN) continue;
    const q2 = /* @__PURE__ */ __name((f) => v[Math.min(v.length - 1, Math.max(0, Math.round(f * (v.length - 1))))], "q");
    l[i] = Math.max(0, q2(1 - EDGE_Q));
    r4[i] = Math.min(0, q2(EDGE_Q));
    have++;
  }
  if (have < nb * 0.7) return null;
  const fill2 = /* @__PURE__ */ __name((a) => {
    for (let i = 0; i < nb; i++) {
      if (a[i] != null) continue;
      let lo = i, hi = i;
      while (a[(lo - 1 + nb) % nb] == null && hi - lo < nb) lo--;
      while (a[(hi + 1) % nb] == null && hi - lo < nb) hi++;
      const va = a[(lo - 1 + nb) % nb], vb = a[(hi + 1) % nb];
      for (let k = lo; k <= hi; k++) a[(k + nb) % nb] = va + (vb - va) * (k - lo + 1) / (hi - lo + 2);
    }
    return a.map((_, i) => {
      let s = 0;
      for (let k = -2; k <= 2; k++) s += a[(i + k + nb) % nb];
      return Math.round(s / 5 * 10) / 10;
    });
  }, "fill");
  return { l: fill2(l), r: fill2(r4) };
}
__name(edgesOf, "edgesOf");
async function rebuildEdges(env) {
  const rows = (await env.DB.prepare(
    `SELECT m.game, m.track_id, m.n, m.pts, m.geo FROM track_maps m LEFT JOIN track_edges e ON e.game=m.game AND e.track_id=m.track_id
     WHERE m.geo IS NOT NULL AND (e.updated IS NULL OR e.updated<?1 OR e.n<>m.n) ORDER BY e.updated LIMIT ${EDGE_PER_RUN}`
  ).bind(Date.now() - EDGE_AGE).all().catch(() => ({ results: [] }))).results || [];
  let built = 0;
  for (const t of rows) {
    let lay = null;
    try {
      const q2 = JSON.parse(t.pts);
      lay = { x: q2.x, y: q2.y, g: JSON.parse(t.geo) };
    } catch (e2) {
      lay = null;
    }
    if (!lay) continue;
    const laps = (await env.DB.prepare(
      `SELECT a.trace FROM sessions s JOIN laps a ON a.session_id=s.id
       WHERE s.track_id=?1 AND s.game=?2 AND a.valid=1 AND a.trace IS NOT NULL AND (instr(a.trace,'"g":[')>0 OR substr(a.trace,1,4)='enc:')
       ORDER BY a.id DESC LIMIT ${EDGE_LAPS * 2}`
    ).bind(t.track_id, t.game).all().catch(() => ({ results: [] }))).results || [];
    const offs = [];
    for (const l of laps) {
      if (offs.length >= EDGE_LAPS) break;
      let path = null;
      try {
        path = geoPath(JSON.parse(await openData(env, l.trace)));
      } catch (e2) {
        path = null;
      }
      if (!path || !fitsLayout(path.x.length * 5, t.n)) continue;
      const o = lateral(path, lay);
      if (o && o.filter((v) => isFinite(v)).length > t.n * 0.8) offs.push(o);
    }
    const e = offs.length >= EDGE_MIN ? edgesOf(offs, t.n) : null;
    await env.DB.prepare(`INSERT INTO track_edges (game, track_id, n, laps, data, updated) VALUES (?1,?2,?3,?4,?5,?6)
       ON CONFLICT(game, track_id) DO UPDATE SET n=excluded.n, laps=excluded.laps, data=excluded.data, updated=excluded.updated`).bind(t.game, t.track_id, t.n, offs.length, e ? JSON.stringify(e) : "{}", Date.now()).run();
    if (e) built++;
  }
  return { checked: rows.length, built };
}
__name(rebuildEdges, "rebuildEdges");

// src/pedals.js
var BIN = 5;
var VSTEP = 5;
var BANDS = 18;
var MIN_SAMPLES = 8;
var band = /* @__PURE__ */ __name((v) => Math.max(0, Math.min(BANDS - 1, Math.floor(v / VSTEP))), "band");
var clamp01 = /* @__PURE__ */ __name((x) => x < 0 ? 0 : x > 1 ? 1 : x, "clamp01");
var q = /* @__PURE__ */ __name((a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
}, "q");
function smooth(v, w) {
  const n = v.length, out = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, k = 0;
    for (let j = i - w; j <= i + w; j++) if (j >= 0 && j < n) {
      s += v[j];
      k++;
    }
    out[i] = Math.max(1, s / k);
  }
  return out;
}
__name(smooth, "smooth");
function accel(v, span) {
  const n = v.length, a = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(0, i - span), r4 = Math.min(n - 1, i + span);
    a[i] = r4 > p ? (v[r4] * v[r4] - v[p] * v[p]) / (2 * BIN * (r4 - p)) : 0;
  }
  return a;
}
__name(accel, "accel");
function fill(arr) {
  const idx = arr.map((x, i) => x == null ? -1 : i).filter((i) => i >= 0);
  if (!idx.length) return null;
  return arr.map((x, i) => {
    if (x != null) return x;
    const lo = idx.filter((j) => j < i).pop(), hi = idx.find((j) => j > i);
    if (lo == null) return arr[hi];
    if (hi == null) return arr[lo];
    return arr[lo] + (arr[hi] - arr[lo]) * (i - lo) / (hi - lo);
  });
}
__name(fill, "fill");
function pedalEnvelope(laps) {
  const full = Array.from({ length: BANDS }, () => []), coast = Array.from({ length: BANDS }, () => []), brake = Array.from({ length: BANDS }, () => []);
  for (const bins of laps) {
    if (!Array.isArray(bins) || bins.length < 60) continue;
    const v = smooth(bins.map((b2) => +b2[0] || 0), 1), a = accel(v, 2);
    for (let i = 2; i < bins.length - 2; i++) {
      const thr = +bins[i][2] || 0, brk = +bins[i][3] || 0, b2 = band(v[i]);
      let steady = true;
      for (let j = i - 2; j <= i + 2; j++) if (Math.abs((+bins[j][2] || 0) - thr) > 0.1 || Math.abs(j - i) < 2 && Math.abs((+bins[j][3] || 0) - brk) > 0.15) steady = false;
      if (!steady) continue;
      if (thr >= 0.97 && brk < 0.02) full[b2].push(a[i]);
      else if (thr < 0.03 && brk < 0.02) coast[b2].push(a[i]);
      else if (brk >= 0.7 && thr < 0.03) brake[b2].push(-a[i] / brk);
    }
  }
  const pick = /* @__PURE__ */ __name((arr, p) => arr.map((s) => s.length >= MIN_SAMPLES ? q(s, p) : null), "pick");
  const f = fill(pick(full, 0.6)), c = fill(pick(coast, 0.5)), b = fill(pick(brake, 0.8));
  if (!f || !b) return null;
  const r22 = /* @__PURE__ */ __name((x) => Math.round(x * 100) / 100, "r2");
  return { full: f.map(r22), coast: (c || GUESS_COAST).map(r22), brake: b.map(r22) };
}
__name(pedalEnvelope, "pedalEnvelope");
var GUESS_COAST = Array.from({ length: BANDS }, (_, k) => -(0.6 + 5e-4 * (k * VSTEP + VSTEP / 2) ** 2));
function ownEnvelope(v, a) {
  const up = Array.from({ length: BANDS }, () => []), dn = Array.from({ length: BANDS }, () => []);
  for (let i = 0; i < v.length; i++) (a[i] >= 0 ? up : dn)[band(v[i])].push(Math.abs(a[i]));
  const f = fill(up.map((s) => s.length >= 3 ? q(s, 0.9) : null)) || new Array(BANDS).fill(4);
  const b = fill(dn.map((s) => s.length >= 3 ? q(s, 0.95) : null)) || new Array(BANDS).fill(10);
  return { full: f, coast: GUESS_COAST, brake: b.map((x) => Math.max(x, 4)) };
}
__name(ownEnvelope, "ownEnvelope");
function at(env, v) {
  const x = v / VSTEP - 0.5, i = Math.max(0, Math.min(BANDS - 2, Math.floor(x))), f = Math.max(0, Math.min(1, x - i));
  return env[i] + (env[i + 1] - env[i]) * f;
}
__name(at, "at");
function estimatePedals(bins, pe, shifts) {
  if (!Array.isArray(bins) || bins.length < 20) return bins;
  const raw = bins.map((b) => +b[0] || 0);
  const v = smooth(raw, 2), a = accel(v, 3), vb = smooth(raw, 1), ab = accel(vb, 2);
  const env = pe && Array.isArray(pe.full) && pe.full.length === BANDS ? pe : ownEnvelope(v, a);
  const n = bins.length, thr = new Array(n), brk = new Array(n);
  for (let i = 0; i < n; i++) {
    const f = Math.max(0.3, at(env.full, v[i])), c = Math.min(f - 0.2, at(env.coast, v[i])), b = Math.max(2, at(env.brake, v[i]));
    if (ab[i] < c - 1.5 && a[i] < c - 0.4) {
      brk[i] = clamp01((c - ab[i]) / (b + c));
      thr[i] = 0;
    } else if (a[i] > c + 0.2) {
      thr[i] = clamp01((a[i] - c) / (f - c));
      brk[i] = 0;
    } else {
      thr[i] = 0;
      brk[i] = 0;
    }
    if (thr[i] > 0.92) thr[i] = 1;
  }
  const sm = /* @__PURE__ */ __name((x) => x.map((_, i) => (x[Math.max(0, i - 1)] + x[i] + x[Math.min(n - 1, i + 1)]) / 3), "sm");
  const T3 = sm(thr), B = brk;
  const ups = (Array.isArray(shifts) ? shifts : []).filter((s) => Array.isArray(s) && s[1] > 0).sort((x, y) => x[0] - y[0]);
  return bins.map((x, i) => {
    let g = +x[4] || 0;
    if (ups.length) {
      g = 1;
      for (const [gear, sp] of ups) if (v[i] > sp) g = gear + 1;
    }
    return [x[0], x[1], Math.round(T3[i] * 100) / 100, Math.round(B[i] * 100) / 100, g, x[5] || 0];
  });
}
__name(estimatePedals, "estimatePedals");
function estimateTrace(tr2, pe, shifts) {
  if (!tr2 || tr2.src !== "field" || !Array.isArray(tr2.d)) return tr2;
  const bins = tr2.d.map((x) => [+x[0], +x[5], +x[1] || 0, +x[2] || 0, +x[3] || 0, +x[4] || 0]);
  const est = estimatePedals(bins, pe, shifts);
  return { ...tr2, d: tr2.d.map((x, i) => [x[0], est[i][2], est[i][3], est[i][4], x[4], x[5]]), est: 2 };
}
__name(estimateTrace, "estimateTrace");

// src/categories.js
var CATS = ["oval", "sports_car", "formula_car", "dirt_oval", "dirt_road"];
var LICS = ["R", "D", "C", "B", "A", "P"];
var MEMO = { stamp: -1, map: { tc: {}, c: {} } };
async function catMap(env) {
  const c = await env.DB.prepare("SELECT updated, chunks FROM season_cache WHERE k='current'").first().catch(() => null);
  if (!c) return MEMO.map;
  if (MEMO.stamp === c.updated) return MEMO.map;
  let season = null;
  try {
    const r4 = await env.DB.prepare("SELECT data FROM season_chunks WHERE k='current' AND idx<?1 ORDER BY idx").bind(c.chunks).all();
    season = JSON.parse((r4.results || []).map((x) => x.data).join(""));
  } catch (e) {
  }
  const norm = /* @__PURE__ */ __name((x) => x === "road" ? "sports_car" : x, "norm");
  const classes = {};
  for (const k of season && season.classes || []) classes[k.car_class_id] = (k.cars_in_class || []).map((x) => x.car_id);
  const tc = {}, votes = {};
  for (const s of season && season.seasons || []) {
    const cars = (s.car_class_ids || []).flatMap((id2) => classes[id2] || []);
    for (const w of s.schedules || []) {
      const cat = norm(w.category);
      if (!CATS.includes(cat)) continue;
      const wc = (w.race_week_cars || []).map((x) => x.car_id);
      const t = w.track && w.track.track_id;
      for (const car of wc.length ? wc : cars) {
        if (t) tc[t + ":" + car] = cat;
        const v = votes[car] = votes[car] || {};
        v[cat] = (v[cat] || 0) + 1;
      }
    }
  }
  for (const car of season && season.cars || []) {
    const cs = (car.categories || []).map(norm).filter((x) => CATS.includes(x));
    if (cs.length && !votes[car.car_id]) votes[car.car_id] = { [cs[0]]: 1 };
  }
  const cm = {};
  for (const [car, v] of Object.entries(votes)) cm[car] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];
  MEMO = { stamp: c.updated, map: { tc, c: cm } };
  return MEMO.map;
}
__name(catMap, "catMap");
function guessCat(track2, car) {
  const t = String(track2 || ""), c = String(car || "");
  if (/dirt/i.test(t + " " + c) || /sprint ?car|midget|\bpro ?[24]\b|rallycross|stadium truck|\blites?\b/i.test(c))
    return /rallycross|road|\brx\b/i.test(t) || /rallycross|pro ?[24]\b|\blites?\b|stadium/i.test(c) ? "dirt_road" : "dirt_oval";
  if (/nascar|cup series|next gen|xfinity|craftsman|\btrucks?\b|\barca\b|late model|modified|legends|street stock|silver crown|stock ?car|super late/i.test(c)) return "oval";
  if (/\boval\b|superspeedway/i.test(t)) return "oval";
  if (/p217|lmp|\bgtp\b|\bdpi?\b|prototype|hypercar/i.test(c)) return "sports_car";
  if (/formula|\bf[1-4]\b|super ?formula|dallara|indy|\bir-?\d+|skip barber|ff1600|pro mazda|\busf\b|lotus (18|49|79)|williams|mercedes-amg w1|tatuus|\bvee\b|\bfr ?[23]\.|renault/i.test(c)) return "formula_car";
  return "sports_car";
}
__name(guessCat, "guessCat");
function catOf(map, trackId, carId, hint, track2, car) {
  const h = String(hint || "").toLowerCase().replace(/[^a-z]/g, "");
  const sure = { oval: "oval", dirtoval: "dirt_oval", dirtroad: "dirt_road", formulacar: "formula_car", formula: "formula_car", sportscar: "sports_car" }[h];
  const x = map.tc[trackId + ":" + carId] || sure || map.c[carId] || guessCat(track2, car);
  if (h === "road" && !["sports_car", "formula_car"].includes(x)) {
    const g = guessCat("", car);
    return g === "formula_car" ? g : "sports_car";
  }
  return x;
}
__name(catOf, "catOf");
var licOf = /* @__PURE__ */ __name((v) => {
  const s = String(v || "").trim().toUpperCase();
  if (s.startsWith("WC") || s.startsWith("PRO")) return "P";
  return LICS.includes(s[0]) ? s[0] : null;
}, "licOf");
var groupOf = /* @__PURE__ */ __name((cat) => cat === "oval" || cat === "dirt_oval" || cat === "dirt_road" ? cat : "road", "groupOf");
async function groupFor(env, game, trackId, carId, hint, track2, car) {
  if (game && game !== "iracing") return "road";
  if (!trackId && !carId && !hint && !track2 && !car) return "";
  return groupOf(catOf(await catMap(env), trackId || 0, carId || 0, hint, track2 || "", car || ""));
}
__name(groupFor, "groupFor");

// src/model.js
var import_pitwall_analysis = __toESM(require_pitwall_analysis(), 1);
var MODEL_VERSION = 12;
var CARD_VERSION = 3;
var SEG_M = 250;
var MAX_LAPS = 80;
var LEARN_PER_RUN = 120;
var LADDER_STEP = 4e-3;
var LADDER_SPAN = 0.08;
var LEVEL_BIN = 2;
var CMP_MIN = 5;
var CMP_DRIVERS = 3;
var BAND_MIN = 5;
var BAND_DRIVERS = 3;
var IMPROVE_DRIVERS = 30;
var IMPROVE_MIN = 3;
var RANK_Q = 41;
var median = /* @__PURE__ */ __name((a) => {
  const v = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}, "median");
var r = /* @__PURE__ */ __name((v, d) => v == null || !isFinite(v) ? 0 : Math.round(v * d) / d, "r");
var tAt = /* @__PURE__ */ __name((l, i) => {
  const b = l.bins[Math.min(i, l.bins.length - 1)];
  return b ? b[1] : null;
}, "tAt");
function segTimes(l, M, n) {
  const out = [], step = n / M;
  for (let k = 0; k < M; k++) {
    const s = Math.round(k * step), e = k === M - 1 ? n - 1 : Math.round((k + 1) * step);
    const a = tAt(l, s), b = k === M - 1 ? l.time : tAt(l, e);
    out.push(a != null && b != null && b > a ? b - a : null);
  }
  return out;
}
__name(segTimes, "segTimes");
function goodLap(time, tr2) {
  if (!tr2 || !Array.isArray(tr2.d) || tr2.d.length < 60) return null;
  if (Array.isArray(tr2.f) && tr2.f.includes("traffic")) return null;
  if (Array.isArray(tr2.f) && tr2.f.includes("wet")) return null;
  if (tr2.h && typeof tr2.h === "object" && ((+tr2.h.gap || 0) > 40 || (+tr2.h.seen || 1) < 0.9)) return null;
  const bins = tr2.d.map((x) => [+x[0], +x[5], Math.min(1, Math.max(0, +x[1] || 0)), Math.min(1, Math.max(0, +x[2] || 0)), +x[3], +x[4]]);
  let back2 = 0, jumps = 0, prev = -1, prevV = null;
  for (const b of bins) {
    if (!(b[0] >= 0 && b[0] < 130) || !isFinite(b[1])) return null;
    if (b[1] < prev - 0.05) back2++;
    prev = b[1];
    if (prevV != null && Math.abs(b[0] - prevV) > 10) jumps++;
    prevV = b[0];
  }
  if (back2 > 2 || jumps > 2) return null;
  if (bins[bins.length - 1][1] > time + 2) return null;
  return { time, bins, field: tr2.src === "field", rival: tr2.src === "real" };
}
__name(goodLap, "goodLap");
function lapCompound(tr2) {
  const f = tr2 && Array.isArray(tr2.f) ? tr2.f.find((x) => typeof x === "string" && /^cmp:\d+$/.test(x)) : null;
  if (f) return +f.slice(4);
  return tr2 && (tr2.src === "field" || tr2.src === "real") ? -1 : 0;
}
__name(lapCompound, "lapCompound");
var sha = /* @__PURE__ */ __name(async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 24), "sha");
async function adoptOldSessions(env, game, trackId, carId) {
  const names = await env.DB.prepare(
    `SELECT track, car FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3
     UNION SELECT track, car FROM community_reports WHERE track_id=?1 AND car_id=?2 AND game=?3 LIMIT 20`
  ).bind(trackId, carId, game).all();
  const full = [];
  for (const n of names.results || []) {
    if (!n.track || !n.car) continue;
    full.push(n.track);
    await env.DB.prepare(
      `UPDATE sessions SET track_id=?1, car_id=?2 WHERE (track_id IS NULL OR car_id IS NULL) AND game=?3 AND car=?4
         AND ((track||' \xB7 '||COALESCE(track_config,''))=?5 OR (track=?5 AND COALESCE(track_config,'')=''))`
    ).bind(trackId, carId, game, n.car, n.track).run().catch(() => {
    });
  }
  if (full.length) {
    const ph = full.map((_, i) => "?" + (i + 4)).join(",");
    await env.DB.prepare(
      `UPDATE sessions SET track_id=NULL, car_id=NULL WHERE track_id=?1 AND car_id=?2 AND game=?3 AND COALESCE(track_config,'')<>''
         AND (track||' \xB7 '||track_config) NOT IN (${ph})`
    ).bind(trackId, carId, game, ...full).run().catch(() => {
    });
  }
}
__name(adoptOldSessions, "adoptOldSessions");
async function learnNewLaps(env, game, trackId, carId) {
  const known = new Map(((await env.DB.prepare("SELECT k, cmp FROM model_laps WHERE game=?1 AND track_id=?2 AND car_id=?3").bind(game, trackId, carId).all()).results || []).map((x) => [x.k, x.cmp]));
  const a = await env.DB.prepare(
    `SELECT s.uploader AS up, a.time, a.trace, s.track_temp AS temp FROM laps a JOIN sessions s ON s.id=a.session_id
     WHERE s.track_id=?1 AND (s.car_id=?2 OR s.car_id IN (${await famSql(env, game, carId)})) AND s.game=?3 AND s.uploader LIKE 'acct:%' AND a.valid=1 AND a.time>10 AND a.trace IS NOT NULL
       AND LOWER(COALESCE(s.kind,'')) NOT LIKE '%test%' AND (COALESCE(s.official,1)<>0 OR s.ai=1)
     ORDER BY a.time LIMIT 3000`
  ).bind(trackId, carId, game).all();
  const c = await env.DB.prepare(
    `SELECT 'acct:'||user_id AS up, time, trace, NULL AS temp FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3 AND trace IS NOT NULL AND (COALESCE(official,1)<>0 OR ai=1) ORDER BY time LIMIT 800`
  ).bind(trackId, carId, game).all();
  const out = await env.DB.prepare(
    `SELECT s.uploader AS up, a.time FROM laps a JOIN sessions s ON s.id=a.session_id
     WHERE s.track_id=?1 AND (s.car_id=?2 OR s.car_id IN (${await famSql(env, game, carId)})) AND s.game=?3 AND s.uploader LIKE 'acct:%' AND a.valid=1 AND a.time>10 AND a.trace IS NOT NULL
       AND (LOWER(COALESCE(s.kind,'')) LIKE '%test%' OR (s.official=0 AND COALESCE(s.ai,0)=0)) LIMIT 3000`
  ).bind(trackId, carId, game).all();
  for (const x of out.results || []) {
    const k = await sha(x.up + ":" + x.time.toFixed(3));
    if (!known.has(k)) continue;
    known.delete(k);
    await env.DB.prepare("DELETE FROM model_laps WHERE game=?1 AND track_id=?2 AND car_id=?3 AND k=?4").bind(game, trackId, carId, k).run();
  }
  let added = 0, read = 0;
  const layN = await layoutN(env, game, trackId);
  for (const x of [...a.results || [], ...c.results || []]) {
    const k = await sha(x.up + ":" + x.time.toFixed(3));
    const old = known.has(k);
    if (old && known.get(k) != null) continue;
    if (added + read >= LEARN_PER_RUN) return { added, more: true };
    let tr2 = null;
    try {
      tr2 = JSON.parse(await openData(env, x.trace));
    } catch (e) {
      tr2 = null;
    }
    if (old) {
      read++;
      const cmp = tr2 ? lapCompound(tr2) : -1;
      known.set(k, cmp);
      await env.DB.prepare("UPDATE model_laps SET cmp=?5 WHERE game=?1 AND track_id=?2 AND car_id=?3 AND k=?4").bind(game, trackId, carId, k, cmp).run();
      continue;
    }
    if (!tr2) {
      known.set(k, -1);
      continue;
    }
    known.set(k, -1);
    if (!fitsLayout(traceLen(tr2), layN) || !goodLap(x.time, tr2)) continue;
    await env.DB.prepare("INSERT INTO model_laps (game, track_id, car_id, k, drv, time, data, created, temp, cmp) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10) ON CONFLICT DO NOTHING").bind(game, trackId, carId, k, await sha("drv:" + x.up), x.time, await gz(JSON.stringify(tr2.src === "field" || tr2.src === "real" ? { d: tr2.d, src: tr2.src } : tr2.d)), Date.now(), typeof x.temp === "number" && isFinite(x.temp) ? x.temp : null, lapCompound(tr2)).run();
    added++;
  }
  return { added, more: false };
}
__name(learnNewLaps, "learnNewLaps");
async function lapPath(env, game, trackId, carId, time) {
  const ok = /* @__PURE__ */ __name((tr2) => tr2 && Array.isArray(tr2.x) && Array.isArray(tr2.y) && tr2.x.length > 10 && tr2.x.length === tr2.y.length, "ok");
  const open = /* @__PURE__ */ __name(async (row) => {
    if (!row || !row.trace) return null;
    try {
      const tr2 = JSON.parse(await openData(env, row.trace));
      return ok(tr2) ? { x: tr2.x, y: tr2.y, g: Array.isArray(tr2.g) && tr2.g.length === 2 ? tr2.g : null } : null;
    } catch (e) {
      return null;
    }
  }, "open");
  const c = await env.DB.prepare("SELECT trace FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3 AND abs(time-?4)<0.0006 AND trace IS NOT NULL LIMIT 3").bind(trackId, carId, game, time).all();
  for (const row of c.results || []) {
    const p = await open(row);
    if (p) return p;
  }
  const a = await env.DB.prepare(
    `SELECT a.trace FROM laps a JOIN sessions s ON s.id=a.session_id
     WHERE s.track_id=?1 AND (s.car_id=?2 OR s.car_id IN (${await famSql(env, game, carId)})) AND s.game=?3 AND abs(a.time-?4)<0.0006 AND a.trace IS NOT NULL LIMIT 3`
  ).bind(trackId, carId, game, time).all();
  for (const row of a.results || []) {
    const p = await open(row);
    if (p) return p;
  }
  return null;
}
__name(lapPath, "lapPath");
var memTrace = /* @__PURE__ */ __name((v) => Array.isArray(v) ? { d: v } : { d: v.d, src: v.src }, "memTrace");
function pickLaps(rows) {
  const drivers = new Set(rows.map((x) => x.drv)).size;
  const cap3 = drivers < 3 ? 10 : 3;
  const per = /* @__PURE__ */ new Map();
  for (const x of rows) {
    const l = per.get(x.drv) || [];
    if (l.length >= cap3) continue;
    l.push(x);
    per.set(x.drv, l);
  }
  const rounds = Array.from({ length: cap3 }, () => []);
  for (const l of per.values()) l.forEach((x, i) => rounds[i].push(x));
  const pick = [];
  for (const rd of rounds) for (const x of rd.sort((p, q2) => p.time - q2.time)) if (pick.length < MAX_LAPS) pick.push(x);
  return pick;
}
__name(pickLaps, "pickLaps");
function compoundsOf(rows) {
  const n = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map();
  for (const x of rows) {
    if (typeof x.cmp !== "number" || x.cmp < 0) continue;
    n.set(x.cmp, (n.get(x.cmp) || 0) + 1);
    if (!d.has(x.cmp)) d.set(x.cmp, /* @__PURE__ */ new Set());
    d.get(x.cmp).add(x.drv);
  }
  if (n.size < 2) return [];
  return [...n.entries()].filter(([c, k]) => k >= CMP_MIN && d.get(c).size >= CMP_DRIVERS).map(([c]) => c).sort((p, q2) => p - q2);
}
__name(compoundsOf, "compoundsOf");
function bandsOf(rows) {
  const n = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map();
  for (const x of rows) {
    const b = bandOf(x.temp);
    if (!b) continue;
    n.set(b, (n.get(b) || 0) + 1);
    if (!d.has(b)) d.set(b, /* @__PURE__ */ new Set());
    d.get(b).add(x.drv);
  }
  if (n.size < 2) return [];
  return BANDS2.filter((b) => (n.get(b) || 0) >= BAND_MIN && d.get(b).size >= BAND_DRIVERS);
}
__name(bandsOf, "bandsOf");
function progressPairs(rows) {
  const per = /* @__PURE__ */ new Map();
  for (const x of rows) {
    if (!per.has(x.drv)) per.set(x.drv, []);
    per.get(x.drv).push(x);
  }
  const out = [];
  for (const l of per.values()) {
    if (l.length < 2) continue;
    const best = l.reduce((a, b) => b.time < a.time ? b : a);
    const older = l.filter((x) => x !== best && (x.created || 0) < (best.created || 0) && x.time > best.time * 1.003);
    if (!older.length) continue;
    const first = older.reduce((a, b) => (b.created || 0) < (a.created || 0) ? b : a);
    out.push([first, best, first.time - best.time]);
  }
  return out.sort((a, b) => b[2] - a[2]).slice(0, IMPROVE_DRIVERS).map(([a, b]) => [a, b]);
}
__name(progressPairs, "progressPairs");
function improveSteps(pairs, zones, n) {
  const out = [];
  for (const z of zones) {
    const g = [];
    for (const { old, now } of pairs) {
      const a = cornerTime(old.bins, z, Math.min(n, old.bins.length)), b = cornerTime(now.bins, z, Math.min(n, now.bins.length));
      if (a != null && b != null) g.push(a - b);
    }
    if (g.length < IMPROVE_MIN) continue;
    g.sort((p, q2) => p - q2);
    const gain = g[g.length >> 1];
    if (gain > 0.02) out.push({ apex: z.imin * 5, gain: r(gain, 1e3), n: g.length });
  }
  return out.sort((a, b) => b.gain - a.gain).slice(0, 3);
}
__name(improveSteps, "improveSteps");
function cornerRanksOf(sorted, zones, n) {
  const best = [], seen2 = /* @__PURE__ */ new Set();
  for (const l of sorted) {
    if (seen2.has(l.up)) continue;
    seen2.add(l.up);
    best.push(l);
  }
  if (best.length < 3) return [];
  return zones.map((z) => {
    const ts = best.map((l) => cornerTime(l.bins, z, n)).filter((t) => t != null && t > 0).sort((a, b) => a - b);
    if (ts.length < 3) return null;
    const q2 = ts.length <= RANK_Q ? ts : Array.from({ length: RANK_Q }, (_, k) => ts[Math.round(k * (ts.length - 1) / (RANK_Q - 1))]);
    return { apex: z.imin * 5, i0: Math.max(0, z.i - 10) * 5, i1: Math.min(n - 1, z.imin + 30) * 5, n: ts.length, q: q2.map((t) => r(t, 1e3)) };
  }).filter(Boolean);
}
__name(cornerRanksOf, "cornerRanksOf");
async function candidates(env, game, trackId, carId) {
  await adoptOldSessions(env, game, trackId, carId);
  const learnt = await learnNewLaps(env, game, trackId, carId);
  const rows = (await env.DB.prepare("SELECT drv, time, data, temp, cmp, created FROM model_laps WHERE game=?1 AND track_id=?2 AND car_id=?3 ORDER BY time LIMIT 5000").bind(game, trackId, carId).all()).results || [];
  const drivers = new Set(rows.map((x) => x.drv)).size;
  const open = /* @__PURE__ */ new Map();
  let card;
  const lapsOf = /* @__PURE__ */ __name(async (pick) => {
    const out = [];
    for (const x of pick) {
      if (!open.has(x)) {
        let g2 = null;
        try {
          g2 = goodLap(x.time, memTrace(JSON.parse(await gunz(x.data))));
        } catch (e) {
        }
        if (g2) {
          g2.up = x.drv;
          g2.temp = typeof x.temp === "number" ? x.temp : null;
          g2.cmp = typeof x.cmp === "number" && x.cmp >= 0 ? x.cmp : null;
          if (g2.field) {
            if (card === void 0) card = await getCarCard(env, game, carId).catch(() => null);
            g2.bins = estimatePedals(g2.bins, card && card.pedals, card && card.shifts);
          }
        }
        open.set(x, g2);
      }
      const g = open.get(x);
      if (g) out.push(g);
    }
    return out;
  }, "lapsOf");
  const laps = await lapsOf(pickLaps(rows));
  const byCmp = /* @__PURE__ */ new Map();
  for (const c of compoundsOf(rows)) byCmp.set(c, await lapsOf(pickLaps(rows.filter((x) => x.cmp === c))));
  const byBand = /* @__PURE__ */ new Map();
  for (const b of bandsOf(rows)) byBand.set(b, await lapsOf(pickLaps(rows.filter((x) => bandOf(x.temp) === b))));
  const pairs = [];
  for (const [o, nw] of progressPairs(rows)) {
    const [a, b] = await lapsOf([o, nw]);
    if (a && b && a !== b) pairs.push({ old: a, now: b });
  }
  return { laps, byCmp, byBand, pairs, drivers, more: learnt.more, added: learnt.added };
}
__name(candidates, "candidates");
var CORNER_FAST = 0.3;
var CORNER_MIN = 3;
var CORNER_MAX = 12;
var SAME_ZONE = 20;
function brakeZones(bins, n) {
  const out = [];
  for (let i = 1; i < n; i++) {
    const a = bins[i], b = bins[i - 1];
    if (!a || !b) continue;
    if (a[3] > 0.12 && b[3] <= 0.12) {
      let k = i, vmin = a[0], imin = i;
      while (k < n && k < i + 120 && bins[k] && !(bins[k][2] > 0.6 && bins[k][3] < 0.05)) {
        if (bins[k][0] < vmin) {
          vmin = bins[k][0];
          imin = k;
        }
        k++;
      }
      if (a[0] - vmin > 4) out.push({ i, vmin, imin });
      i = k;
    }
  }
  return out;
}
__name(brakeZones, "brakeZones");
var BANDS2 = ["cold", "mild", "hot"];
var bandOf = /* @__PURE__ */ __name((t) => typeof t === "number" && isFinite(t) ? t < 25 ? "cold" : t > 35 ? "hot" : "mild" : null, "bandOf");
var cornerTime = /* @__PURE__ */ __name((bins, z, n) => {
  const i0 = Math.max(0, z.i - 10), i1 = Math.min(n - 1, z.imin + 30);
  return bins[i0] && bins[i1] ? bins[i1][1] - bins[i0][1] : null;
}, "cornerTime");
var sd = /* @__PURE__ */ __name((a) => {
  if (a.length < 3) return null;
  const mu = a.reduce((p, q2) => p + q2, 0) / a.length;
  return Math.sqrt(a.reduce((p, q2) => p + (q2 - mu) * (q2 - mu), 0) / a.length);
}, "sd");
function fastPicks(sorted) {
  const seen2 = /* @__PURE__ */ new Set(), fast = [];
  for (const l of sorted) {
    if (seen2.has(l.up)) continue;
    seen2.add(l.up);
    fast.push(l);
  }
  return fast.slice(0, Math.min(CORNER_MAX, Math.max(CORNER_MIN, Math.round(fast.length * CORNER_FAST))));
}
__name(fastPicks, "fastPicks");
function cornerCard(sorted, fastest, n) {
  const pick = fastPicks(sorted);
  if (pick.length < CORNER_MIN) return [];
  const zones = pick.map((l) => brakeZones(l.bins, n)), out = [];
  const range = /* @__PURE__ */ __name((ls, zs, z) => {
    const bp = [], va = [];
    zs.forEach((q2, k) => {
      if (!ls[k]) return;
      const m = q2.filter((x) => Math.abs(x.i - z.i) <= SAME_ZONE).sort((p, w) => Math.abs(p.i - z.i) - Math.abs(w.i - z.i))[0];
      if (m) {
        bp.push(m.i * 5);
        va.push(m.vmin);
      }
    });
    if (bp.length < CORNER_MIN) return null;
    bp.sort((a, b) => a - b);
    va.sort((a, b) => a - b);
    return { b0: bp[0], b1: bp[bp.length - 1], v0: r(va[0], 10), v1: r(va[va.length - 1], 10), n: bp.length };
  }, "range");
  for (const z of brakeZones(fastest.bins, n)) {
    const all = range(pick.map(() => true), zones, z);
    if (!all) continue;
    const c = { d: z.i * 5, apex: z.imin * 5, ...all };
    const gs = [];
    zones.forEach((q2, k) => {
      const l = pick[k];
      if (l.field) return;
      const mm = q2.filter((x) => Math.abs(x.i - z.i) <= SAME_ZONE).sort((p, w) => Math.abs(p.i - z.i) - Math.abs(w.i - z.i))[0];
      const g = mm && l.bins[mm.imin] ? Math.round(l.bins[mm.imin][4] || 0) : 0;
      if (g >= 1) gs.push(g);
    });
    if (gs.length >= 2) {
      gs.sort((a, b) => a - b);
      c.g = [gs[Math.floor(gs.length * 0.2)], gs[Math.ceil(gs.length * 0.8) - 1]];
    }
    const bands = {};
    for (const b of BANDS2) {
      const rg = range(pick.map((l) => bandOf(l.temp) === b), zones, z);
      if (rg) bands[b] = rg;
    }
    if (Object.keys(bands).length) c.bands = bands;
    const ts = sorted.map((l) => cornerTime(l.bins, z, n)).filter((t) => t != null);
    const spread = sd(ts);
    if (spread != null) c.spread = r(spread, 1e3);
    out.push(c);
  }
  return out;
}
__name(cornerCard, "cornerCard");
function levelStep(pick, laps, zones, n) {
  const G = laps.filter((l) => l !== pick && l.time > pick.time && l.time <= pick.time * 1.03);
  if (G.length < 2) return [];
  const out = [];
  for (const z of zones) {
    const tp = cornerTime(pick.bins, z, n);
    if (tp == null) continue;
    const d = G.map((l) => cornerTime(l.bins, z, n)).filter((t) => t != null).map((t) => t - tp).sort((a, b) => a - b);
    if (d.length < 2) continue;
    const gain = d[d.length >> 1];
    if (gain > 0.03) out.push({ apex: z.imin * 5, gain: r(gain, 1e3) });
  }
  return out.sort((a, b) => b.gain - a.gain).slice(0, 3);
}
__name(levelStep, "levelStep");
function lineRanges(record2, recPath2, picks, zones, n) {
  if (!recPath2 || recPath2.x.length < n) return [];
  const offs = [];
  for (const { lap, path } of picks) {
    if (lap === record2) continue;
    const p = sameFrame(recPath2, path);
    if (!p || p.x.length < n) continue;
    const o = lineOffsets(p.x.slice(0, n), p.y.slice(0, n), recPath2.x.slice(0, n), recPath2.y.slice(0, n));
    if (o) offs.push(o);
  }
  if (offs.length < CORNER_MIN) return [];
  const out = [];
  for (const z of zones) {
    const sg = insideSign(recPath2.x, recPath2.y, z.imin);
    if (!sg) continue;
    const at2 = /* @__PURE__ */ __name((i) => {
      const v = [];
      for (const o of offs) {
        let s = 0, c2 = 0;
        for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) if (!isNaN(o[k])) {
          s += o[k];
          c2++;
        }
        if (c2) v.push(s / c2 * sg);
      }
      return v;
    }, "at");
    const rg = /* @__PURE__ */ __name((v) => {
      if (v.length < CORNER_MIN) return null;
      v.sort((a2, b2) => a2 - b2);
      return [r(v[0], 10), r(v[v.length - 1], 10)];
    }, "rg");
    const a = rg(at2(z.i)), b = rg(at2(z.imin)), c = rg(at2(Math.min(n - 1, z.imin + 16)));
    if (a && b && c) out.push({ apex: z.imin * 5, in: a, at: b, out: c, n: offs.length });
  }
  return out;
}
__name(lineRanges, "lineRanges");
function cleanLaps(raw) {
  if (raw.length < 2) return raw.slice();
  const len = median(raw.map((l) => l.bins.length));
  let laps = raw.filter((l) => Math.abs(l.bins.length - len) <= len * 0.03);
  laps = laps.filter((l) => {
    let t = 0, n = 0;
    for (const b of l.bins) if (b[0] > 0.5) {
      t += 5 / b[0];
      n++;
    }
    return n >= l.bins.length * 0.9 && Math.abs(t - l.time) / l.time < 0.04;
  });
  const tMed = median(laps.map((l) => l.time));
  laps = laps.filter((l) => l.time <= tMed * 1.12);
  if (laps.length >= 3) {
    const nb = Math.min(...laps.map((l) => l.bins.length)), prof = [];
    for (let i = 0; i < nb; i++) prof.push(median(laps.map((l) => l.bins[i][0])));
    const M0 = Math.max(8, Math.round(nb * 5 / SEG_M));
    laps.forEach((l) => {
      l.seg0 = segTimes(l, M0, nb);
    });
    const segMed = [];
    for (let k = 0; k < M0; k++) segMed.push(median(laps.map((l) => l.seg0[k])));
    laps = laps.filter((l) => {
      let dev = 0;
      for (let i = 0; i < nb; i++) dev += Math.abs(l.bins[i][0] - prof[i]) / Math.max(prof[i], 5);
      if (dev / nb > 0.2) return false;
      return l.seg0.every((v, k) => v == null || segMed[k] == null || v >= segMed[k] * 0.88);
    });
  }
  return laps;
}
__name(cleanLaps, "cleanLaps");
async function refsOf(laps, pathFor) {
  const n = Math.min(...laps.map((l) => l.bins.length)), M = Math.max(8, Math.round(n * 5 / SEG_M));
  laps.forEach((l) => {
    l.seg = segTimes(l, M, n);
  });
  const fastest = laps.reduce((a, b) => b.time < a.time ? b : a);
  const record2 = fastest.bins.slice(0, n).map((b) => [r(b[0], 10), r(b[1], 1e3), r(b[2], 100), r(b[3], 100), Math.round(b[4] || 0), r(b[5], 100)]);
  const compact = /* @__PURE__ */ __name((l) => {
    const out2 = [];
    for (let i = 0; i < n; i += LEVEL_BIN) {
      const b = l.bins[i];
      out2.push([r(b[0], 10), r(b[1], 1e3), r(b[2], 100), r(b[3], 100), Math.round(b[4] || 0)]);
    }
    return out2;
  }, "compact");
  const sorted = laps.slice().sort((a, b) => a.time - b.time);
  const corners = cornerCard(sorted, fastest, n);
  const zr = brakeZones(fastest.bins, n);
  const ladder = [];
  for (let j = 0; j * LADDER_STEP <= LADDER_SPAN; j++) {
    const t = fastest.time * (1 + j * LADDER_STEP);
    let g = sorted.filter((l) => l.time < t * 0.997 && l.time > t * 0.97);
    if (!g.length) g = sorted.filter((l) => l.time < t * 0.997);
    const real = g.filter((l) => !l.field);
    const pick = real.length ? real[real.length - 1] : g.length ? g[g.length - 1] : fastest;
    if (ladder.length && ladder[ladder.length - 1].lap === pick) {
      ladder[ladder.length - 1].upTo = t;
      continue;
    }
    ladder.push({ lap: pick, upTo: t, time: r(pick.time, 1e3), n: 1, field: !!pick.field, seg: pick.seg.map((x) => r(x, 1e3)), bins: compact(pick) });
  }
  const fp = await pathFor(fastest);
  const out = [];
  for (const { lap, ...x } of ladder) {
    const p = await pathFor(lap), e = { ...x, upTo: r(x.upTo, 1e3) };
    if (p && p.x.length >= n) {
      e.x = [];
      e.y = [];
      for (let i = 0; i < n; i += LEVEL_BIN) {
        e.x.push(r(p.x[i], 10));
        e.y.push(r(p.y[i], 10));
      }
      if (p.g) e.g = p.g;
    }
    e.step = levelStep(lap, laps, zr, n);
    out.push(e);
  }
  if (fp && fp.x.length >= n) {
    const pp = [];
    for (const l of fastPicks(sorted)) {
      const p = await pathFor(l);
      if (p) pp.push({ lap: l, path: p });
    }
    for (const q2 of lineRanges(fastest, fp, pp, zr, n)) {
      const c = corners.find((x) => x.apex === q2.apex);
      if (c) c.line = { in: q2.in, at: q2.at, out: q2.out, n: q2.n };
    }
  }
  let lineXY = null;
  if (!(fp && fp.x.length >= n)) {
    for (const l of sorted.slice(0, 40)) {
      const p = await pathFor(l);
      if (p && p.x.length >= n) {
        lineXY = { time: r(l.time, 1e3), x: p.x.slice(0, n).map((v) => r(v, 10)), y: p.y.slice(0, n).map((v) => r(v, 10)), ...p.g ? { g: p.g } : {} };
        break;
      }
    }
  }
  return {
    n: laps.length,
    M,
    nb: n,
    pool: laps.length,
    idealTime: r(fastest.time, 1e3),
    fastest: r(fastest.time, 1e3),
    lineXY,
    ranks: cornerRanksOf(sorted, zr, n),
    ideal: record2,
    idealField: !!fastest.field,
    corners,
    idealXY: fp && fp.x.length >= n ? { x: fp.x.slice(0, n).map((v) => r(v, 10)), y: fp.y.slice(0, n).map((v) => r(v, 10)), ...fp.g ? { g: fp.g } : {} } : null,
    ladder: out
  };
}
__name(refsOf, "refsOf");
async function buildModel(env, game, trackId, carId) {
  carId = await famId(env, game, carId);
  const { laps: raw, byCmp: rawCmp, byBand: rawBand, pairs, drivers, more, added } = await candidates(env, game, trackId, carId);
  if (added) await markCar(env, game, carId);
  const shared = await env.DB.prepare(
    `SELECT COUNT(*) AS n, MIN(time) AS best FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3 AND COALESCE(shown,'')<>'model'`
  ).bind(trackId, carId, game).first();
  const base2 = { v: MODEL_VERSION, game, trackId, carId, built: Date.now(), more: !!more, drivers, shared: shared && shared.n || 0 };
  if (raw.length < 2) return { ...base2, n: raw.length };
  const laps = cleanLaps(raw);
  const timed = await env.DB.prepare("SELECT user_id, MIN(time) AS t FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3 AND time>10 AND (COALESCE(official,1)<>0 OR ai=1) GROUP BY user_id").bind(trackId, carId, game).all();
  const byDrv = /* @__PURE__ */ new Map();
  for (const l of laps) if (!byDrv.has(l.up) || l.time < byDrv.get(l.up)) byDrv.set(l.up, l.time);
  for (const x of timed.results || []) {
    const k = await sha("drv:acct:" + x.user_id);
    if (!byDrv.has(k) || x.t < byDrv.get(k)) byDrv.set(k, x.t);
  }
  const times = [...byDrv.values()].sort((a, b) => a - b).map((t) => r(t, 1e3));
  if (laps.length < 2) return { ...base2, n: laps.length, drivers: Math.max(drivers, times.length), times };
  const paths = /* @__PURE__ */ new Map();
  const pathFor = /* @__PURE__ */ __name(async (l) => {
    if (!paths.has(l)) paths.set(l, await lapPath(env, game, trackId, carId, l.time).catch(() => null));
    return paths.get(l);
  }, "pathFor");
  const model = { ...base2, drivers: Math.max(drivers, times.length), times, ...await refsOf(laps, pathFor) };
  const cmps = {};
  for (const [c, ls] of rawCmp) {
    const cl = cleanLaps(ls);
    if (cl.length >= 2) cmps[c] = await refsOf(cl, pathFor);
  }
  if (Object.keys(cmps).length) model.byCmp = cmps;
  const bands = {};
  for (const [b, ls] of rawBand || []) {
    const cl = cleanLaps(ls);
    if (cl.length >= 2) {
      const x = await refsOf(cl, async () => null);
      bands[b] = { n: x.n, ladder: x.ladder.map(({ x: _x, y: _y, g: _g, ...e }) => e) };
    }
  }
  if (Object.keys(bands).length) model.byBand = bands;
  const nb = model.nb || 0, fastest = laps.reduce((a, b) => b.time < a.time ? b : a);
  model.improve = improveSteps(pairs || [], brakeZones(fastest.bins, nb), nb);
  await usualTips(env, game, trackId, carId, model.corners || []).catch(() => {
  });
  return model;
}
__name(buildModel, "buildModel");
var MISTAKE_MIN = 3;
async function usualTips(env, game, trackId, carId, corners) {
  if (!corners.length) return;
  const rows = (await env.DB.prepare("SELECT apex, kind, account FROM coach_tips WHERE game=?1 AND track_id=?2 AND car_id=?3 AND kind<>'' AND lost>0.05 LIMIT 5000").bind(game, trackId, carId).all()).results || [];
  for (const c of corners) {
    const by = /* @__PURE__ */ new Map();
    for (const x of rows) {
      if (Math.abs(x.apex - c.apex) > 60) continue;
      if (!by.has(x.kind)) by.set(x.kind, /* @__PURE__ */ new Set());
      by.get(x.kind).add(x.account);
    }
    const top = [...by.entries()].map(([kind, s]) => ({ kind, n: s.size })).sort((a, b) => b.n - a.n)[0];
    if (top && top.n >= MISTAKE_MIN) c.mistake = top;
  }
}
__name(usualTips, "usualTips");
function forCompound(md2, cmp, temp) {
  if (!md2) return md2;
  const { byCmp, byBand, ...m } = md2;
  const list = byCmp ? Object.keys(byCmp).map(Number).sort((p, q2) => p - q2) : [];
  const one = byCmp && Number.isInteger(cmp) && cmp >= 0 ? byCmp[cmp] : null;
  const b = bandOf(temp), bb = !one && b && byBand ? byBand[b] : null;
  return { ...m, ...list.length ? { cmps: list } : {}, ...one ? { ...one, cmp } : {}, ...bb ? { ladder: bb.ladder, band: b } : {} };
}
__name(forCompound, "forCompound");
var CARD_TRACKS = 12;
var CARD_PER_TRACK = 8;
var CARD_PER_DRIVER = 2;
var pct = /* @__PURE__ */ __name((a, q2) => {
  const v = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y);
  return v.length ? v[Math.min(v.length - 1, Math.floor(q2 * (v.length - 1) + 0.5))] : null;
}, "pct");
function lapFacts(bins) {
  const dec2 = [], shifts = {};
  let vmax = 0, geared = false;
  for (let i = 0; i + 1 < bins.length; i++) {
    const a = bins[i], b = bins[i + 1];
    if (a[0] > vmax) vmax = a[0];
    if (a[4] >= 1) geared = true;
    const dt = b[1] - a[1];
    if (dt > 0.01 && dt < 2 && a[3] >= 0.5 && a[0] > 12 && a[0] > b[0]) dec2.push((a[0] - b[0]) / dt);
    if (a[4] >= 1 && b[4] === a[4] + 1 && a[0] > 5) shifts[a[4]] = Math.max(shifts[a[4]] || 0, a[0]);
  }
  return { brake: dec2.length >= 5 ? pct(dec2, 0.95) : null, shifts: geared ? shifts : null, vmax };
}
__name(lapFacts, "lapFacts");
function cardOf(laps) {
  const f = laps.map((l) => ({ ...lapFacts(l.bins), trackId: l.trackId, drv: l.drv, field: !!l.field || !!l.rival }));
  const brakes = f.map((x) => x.brake).filter((x) => x != null);
  const shifts = [];
  for (let g = 1; g <= 8; g++) {
    const v = f.filter((x) => !x.field).map((x) => x.shifts && x.shifts[g]).filter((x) => x > 0);
    if (v.length >= 3) shifts.push([g, r(pct(v, 0.8), 10)]);
  }
  let vmax = 0, vmaxAt = 0;
  for (const x of f) if (x.vmax > vmax) {
    vmax = x.vmax;
    vmaxAt = x.trackId;
  }
  return {
    n: laps.length,
    tracks: new Set(laps.map((l) => l.trackId)).size,
    drivers: new Set(laps.map((l) => l.drv)).size,
    brake: brakes.length >= 3 ? r(pct(brakes, 0.8), 100) : null,
    shifts,
    vmax: r(vmax, 10),
    vmaxAt,
    // what the car does at every speed with full throttle, no pedal and full brake: rivals' pedals from their speed
    pedals: pedalEnvelope(laps.filter((l) => !l.field && !l.rival).map((l) => l.bins))
  };
}
__name(cardOf, "cardOf");
async function buildCarCard(env, game, carId) {
  carId = await famId(env, game, carId);
  const all = (await env.DB.prepare("SELECT track_id, drv, time, data FROM model_laps WHERE game=?1 AND car_id=?2 ORDER BY time LIMIT 4000").bind(game, carId).all()).results || [];
  const byTrack = /* @__PURE__ */ new Map();
  for (const x of all) {
    const t = byTrack.get(x.track_id) || [];
    t.push(x);
    byTrack.set(x.track_id, t);
  }
  const pick = [];
  for (const [, rows] of [...byTrack.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, CARD_TRACKS)) {
    const per = /* @__PURE__ */ new Map();
    let n = 0;
    for (const x of rows) {
      const c = per.get(x.drv) || 0;
      if (c >= CARD_PER_DRIVER || n >= CARD_PER_TRACK) continue;
      per.set(x.drv, c + 1);
      n++;
      pick.push(x);
    }
  }
  const laps = [];
  for (const x of pick) {
    try {
      const g = goodLap(x.time, memTrace(JSON.parse(await gunz(x.data))));
      if (g) laps.push({ trackId: x.track_id, drv: x.drv, time: x.time, bins: g.bins, field: g.field, rival: g.rival });
    } catch (e) {
    }
  }
  const card = { v: CARD_VERSION, game, carId, built: Date.now(), ...cardOf(laps) };
  const info = {};
  for (const t of new Set(laps.map((l) => l.trackId))) info[t] = await trackInfo(env, game, t, carId).catch(() => ({ g: "road" }));
  card.cz = cornerSamples(laps, info);
  card.ot = ovalProfile(laps, info);
  card.tg = Object.fromEntries(Object.entries(info).map(([t, x]) => [t, x.g || "road"]));
  if (card.vmaxAt) {
    const t = await env.DB.prepare("SELECT track, track_config FROM sessions WHERE game=?1 AND track_id=?2 AND track IS NOT NULL LIMIT 1").bind(game, card.vmaxAt).first().catch(() => null) || await env.DB.prepare("SELECT track, NULL AS track_config FROM community_laps WHERE game=?1 AND track_id=?2 LIMIT 1").bind(game, card.vmaxAt).first().catch(() => null);
    if (t && t.track) card.vmaxTrack = t.track + (t.track_config ? " \xB7 " + t.track_config : "");
  }
  await env.DB.prepare(
    `INSERT INTO car_cards (game, car_id, dirty, built, data) VALUES (?1,?2,0,?3,?4)
     ON CONFLICT(game, car_id) DO UPDATE SET dirty=0, built=excluded.built, data=excluded.data`
  ).bind(game, carId, card.built, await gz(JSON.stringify(card))).run();
  return card;
}
__name(buildCarCard, "buildCarCard");
async function markCar(env, game, carId) {
  carId = await famId(env, game, carId);
  if (!carId) return;
  await env.DB.prepare(
    `INSERT INTO car_cards (game, car_id, dirty, built, data) VALUES (?1,?2,1,0,NULL)
     ON CONFLICT(game, car_id) DO UPDATE SET dirty=1`
  ).bind(game, carId).run().catch(() => {
  });
}
__name(markCar, "markCar");
async function getCarCard(env, game, carId, full = false) {
  carId = await famId(env, game, carId);
  if (!carId) return null;
  const out = /* @__PURE__ */ __name((c) => {
    if (!c || !c.n) return null;
    if (full) return c;
    const { cz, ot, tg, ...rest } = c;
    return rest;
  }, "out");
  const row = await env.DB.prepare("SELECT dirty, data FROM car_cards WHERE game=?1 AND car_id=?2").bind(game, carId).first().catch(() => null);
  if (row && row.data && !row.dirty) {
    const c = JSON.parse(await gunz(row.data));
    if (c.v === CARD_VERSION) return out(c);
  }
  try {
    return out(await buildCarCard(env, game, carId));
  } catch (e) {
    if (row && row.data) return out(JSON.parse(await gunz(row.data)));
    return null;
  }
}
__name(getCarCard, "getCarCard");
var LIKE_FAST = 0.03;
var LIKE_MAX = 900;
var PWA = /* @__PURE__ */ __name(() => globalThis.PW_ANALYSIS, "PWA");
async function trackInfo(env, game, trackId, carId) {
  const s = await env.DB.prepare("SELECT track, track_config, cat FROM sessions WHERE game=?1 AND track_id=?2 AND track IS NOT NULL ORDER BY started DESC LIMIT 1").bind(game, trackId).first().catch(() => null);
  const cat = game === "iracing" ? catOf(await catMap(env), trackId, carId, s && s.cat, s && s.track || "", "") : "sports_car";
  return { cat, g: groupOf(cat), track: s && s.track || "", cfg: s && s.track_config || "" };
}
__name(trackInfo, "trackInfo");
var fastOf = /* @__PURE__ */ __name((laps) => {
  const best = {};
  for (const l of laps) if (!l.field && !l.rival) best[l.trackId] = Math.min(best[l.trackId] || 1e9, l.time);
  return laps.filter((l) => !l.field && !l.rival && l.time <= best[l.trackId] * (1 + LIKE_FAST));
}, "fastOf");
function cornerSamples(laps, info = {}) {
  const P = PWA(), out = [];
  if (!P) return out;
  for (const l of fastOf(laps)) {
    const s = l.bins;
    for (const z of P.ovalZones(s)) {
      const a = s[z.imin];
      if (!a) continue;
      let st = 0, has = false;
      for (let k = z.i; k <= Math.min(s.length - 1, z.imin + 6); k++) {
        const v = s[k] && s[k][5];
        if (typeof v === "number" && isFinite(v)) {
          if (v !== 0) has = true;
          st = Math.max(st, Math.abs(v));
        }
      }
      out.push([l.trackId, r(z.v, 10), r(z.vmin, 10), (z.imin - z.i) * 5, Math.round(a[4] || 0), has ? r(st, 1e3) : null, z.lift ? 1 : 0]);
    }
  }
  const per = {};
  return out.filter((x) => (per[x[0]] = (per[x[0]] || 0) + 1) <= Math.ceil(LIKE_MAX / Math.max(1, new Set(out.map((y) => y[0])).size)));
}
__name(cornerSamples, "cornerSamples");
function ovalProfile(laps, info = {}) {
  const P = PWA(), by = {};
  if (!P) return [];
  for (const l of fastOf(laps)) {
    const ti = info[l.trackId] || {};
    if (ti.g !== "oval" && ti.g !== "dirt_oval") continue;
    const A = { bins: l.bins, maxBin: l.bins.length - 1 };
    const k = P.ovalOf(A, A, { track: { cat: ti.cat, track: ti.track, track_config: ti.cfg, len: l.bins.length * 5 } });
    if (!k) continue;
    let full = 0, c = 0;
    for (const b of l.bins) {
      if (!b) continue;
      c++;
      if (b[2] > 0.95) full++;
    }
    const zs = P.ovalZones(l.bins), o = by[l.trackId] = by[l.trackId] || { t: l.trackId, k, g: ti.g, f: [], lf: [] };
    if (c) o.f.push(full / c);
    if (zs.length) o.lf.push(zs.filter((z) => z.lift).length / zs.length);
  }
  const med = /* @__PURE__ */ __name((a) => {
    if (!a.length) return null;
    const v = a.slice().sort((x, y) => x - y);
    return v[v.length >> 1];
  }, "med");
  return Object.values(by).map((o) => ({ t: o.t, k: o.k, g: o.g, f: r(med(o.f) || 0, 1e3), lf: o.lf.length ? r(med(o.lf), 100) : null, n: o.f.length }));
}
__name(ovalProfile, "ovalProfile");
var KIND_MIN = 3;
async function buildOvalKinds(env) {
  const r0 = await env.DB.prepare("SELECT game, car_id, data FROM car_cards WHERE data IS NOT NULL AND game='iracing' LIMIT 3000").all().catch(() => ({ results: [] }));
  const by = {};
  for (const x of r0.results || []) {
    let c = null;
    try {
      c = JSON.parse(await gunz(x.data));
    } catch (e) {
      continue;
    }
    for (const o of c && c.ot || []) {
      const b = by[o.k] = by[o.k] || { f: [], lf: [], cars: /* @__PURE__ */ new Set() };
      b.f.push(o.f);
      if (o.lf != null) b.lf.push(o.lf);
      b.cars.add(x.car_id);
    }
  }
  const q2 = /* @__PURE__ */ __name((a, p) => {
    const v = a.slice().sort((x, y) => x - y);
    return v.length ? v[Math.min(v.length - 1, Math.floor(p * (v.length - 1) + 0.5))] : null;
  }, "q");
  const kinds = {};
  for (const [k, b] of Object.entries(by)) if (b.f.length >= KIND_MIN && b.cars.size >= 2) kinds[k] = { f: [q2(b.f, 0.25), q2(b.f, 0.5), q2(b.f, 0.75)], lf: b.lf.length >= KIND_MIN ? q2(b.lf, 0.5) : null, n: b.f.length, cars: b.cars.size };
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('coach_ovals', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(JSON.stringify(kinds), Date.now()).run();
  return kinds;
}
__name(buildOvalKinds, "buildOvalKinds");
async function likeFor(env, game, trackId, carId, grp) {
  const card = await getCarCard(env, game, carId, true).catch(() => null);
  const dirt = /^dirt/.test(grp || ""), same6 = /* @__PURE__ */ __name((g) => !grp || /^dirt/.test(g || "road") === dirt, "same");
  const ot = (card && card.ot || []).filter((o) => o.t !== trackId && same6(o.g));
  const tg = card && card.tg || {};
  const cz = (card && card.cz || []).filter((x) => x[0] !== trackId && same6(tg[x[0]]));
  let kinds = {};
  if (game === "iracing") {
    const a = await env.DB.prepare("SELECT v FROM app_state WHERE k='coach_ovals'").first().catch(() => null);
    try {
      kinds = a && a.v ? JSON.parse(a.v) : {};
    } catch (e) {
    }
  }
  return { v: 1, carId: card ? card.carId : carId, tracks: new Set(cz.map((x) => x[0])).size, cz, ot, kinds, shifts: card && card.shifts || [] };
}
__name(likeFor, "likeFor");
var PSEUDO_MIN = 9e8;
var normName = /* @__PURE__ */ __name((v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ""), "normName");
async function pseudoId(kind, game, name2) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(kind + "|" + game + "|" + normName(name2)));
  const n = new DataView(b).getUint32(0);
  return PSEUDO_MIN + n % 99999999;
}
__name(pseudoId, "pseudoId");
async function reconcileIds(env, game, track2, trackConfig, car, trackId, carId) {
  if (!trackId || !carId || trackId >= PSEUDO_MIN || carId >= PSEUDO_MIN) return;
  const full = track2 + (trackConfig ? " \xB7 " + trackConfig : "");
  const pt = await pseudoId("t", game, full), pc = await pseudoId("c", game, car);
  const hit = await env.DB.prepare("SELECT 1 FROM sessions WHERE game=?1 AND (track_id=?2 OR car_id=?3) LIMIT 1").bind(game, pt, pc).first() || await env.DB.prepare("SELECT 1 FROM community_laps WHERE game=?1 AND (track_id=?2 OR car_id=?3) LIMIT 1").bind(game, pt, pc).first() || await env.DB.prepare("SELECT 1 FROM community_reports WHERE game=?1 AND (track_id=?2 OR car_id=?3) LIMIT 1").bind(game, pt, pc).first();
  if (!hit) return;
  const fix3 = /* @__PURE__ */ __name((t) => [
    env.DB.prepare(`UPDATE OR IGNORE ${t} SET track_id=CASE WHEN track_id=?1 THEN ?2 ELSE track_id END, car_id=CASE WHEN car_id=?3 THEN ?4 ELSE car_id END WHERE game=?5 AND (track_id=?1 OR car_id=?3)`).bind(pt, trackId, pc, carId, game),
    env.DB.prepare(`DELETE FROM ${t} WHERE game=?1 AND (track_id=?2 OR car_id=?3)`).bind(game, pt, pc)
    // a row the real combo already had wins
  ], "fix");
  await env.DB.batch([
    env.DB.prepare("UPDATE sessions SET track_id=CASE WHEN track_id=?1 THEN ?2 ELSE track_id END, car_id=CASE WHEN car_id=?3 THEN ?4 ELSE car_id END WHERE game=?5 AND (track_id=?1 OR car_id=?3)").bind(pt, trackId, pc, carId, game),
    ...fix3("community_laps"),
    ...fix3("community_reports"),
    ...fix3("model_laps"),
    env.DB.prepare("UPDATE OR IGNORE car_cards SET car_id=?2, dirty=1 WHERE game=?3 AND car_id=?1").bind(pc, carId, game),
    env.DB.prepare("DELETE FROM car_cards WHERE game=?2 AND car_id=?1").bind(pc, game),
    env.DB.prepare("DELETE FROM model_cache WHERE game=?1 AND (track_id=?2 OR car_id=?3)").bind(game, pt, pc)
  ]);
  await markModel(env, game, trackId, carId);
}
__name(reconcileIds, "reconcileIds");
var gz = /* @__PURE__ */ __name(async (s) => new Uint8Array(await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer()), "gz");
var gunz = /* @__PURE__ */ __name(async (b) => await new Response(new Blob([b instanceof ArrayBuffer || ArrayBuffer.isView(b) ? b : new Uint8Array(b)]).stream().pipeThrough(new DecompressionStream("gzip"))).text(), "gunz");
async function moveDriver(env, fromUp, toUp, game) {
  const from = await sha("drv:" + fromUp), to = await sha("drv:" + toUp);
  const rows = (await env.DB.prepare("SELECT game, track_id, car_id, k, time FROM model_laps WHERE drv=?1" + (game ? " AND game=?2" : "")).bind(...game ? [from, game] : [from]).all()).results || [];
  for (const r4 of rows) {
    await env.DB.prepare("UPDATE OR IGNORE model_laps SET drv=?5, k=?6 WHERE game=?1 AND track_id=?2 AND car_id=?3 AND k=?4").bind(r4.game, r4.track_id, r4.car_id, r4.k, to, await sha(toUp + ":" + r4.time.toFixed(3))).run();
  }
  await env.DB.prepare("DELETE FROM model_laps WHERE drv=?1" + (game ? " AND game=?2" : "")).bind(...game ? [from, game] : [from]).run();
  return rows;
}
__name(moveDriver, "moveDriver");
async function moveDriverBack(env, rows, fromUp, toUp) {
  const from = await sha("drv:" + fromUp), to = await sha("drv:" + toUp);
  for (const x of rows || []) {
    if (!x || typeof x.time !== "number") continue;
    await env.DB.prepare("UPDATE OR IGNORE model_laps SET drv=?5, k=?6 WHERE game=?1 AND track_id=?2 AND car_id=?3 AND k=?4 AND drv=?7").bind(x.game, x.track_id, x.car_id, await sha(fromUp + ":" + x.time.toFixed(3)), to, await sha(toUp + ":" + x.time.toFixed(3)), from).run();
  }
}
__name(moveDriverBack, "moveDriverBack");
async function forgetLap(env, game, trackId, carId, uploader, time) {
  carId = await famId(env, game, carId);
  if (!trackId || !carId) return;
  await env.DB.prepare("DELETE FROM model_laps WHERE game=?1 AND track_id=?2 AND car_id=?3 AND k=?4").bind(game, trackId, carId, await sha(uploader + ":" + Number(time).toFixed(3))).run();
  await markModel(env, game, trackId, carId);
}
__name(forgetLap, "forgetLap");
async function markModel(env, game, trackId, carId) {
  carId = await famId(env, game, carId);
  if (!trackId || !carId) return;
  await env.DB.prepare(
    `INSERT INTO model_cache (game, track_id, car_id, dirty, built, data) VALUES (?1,?2,?3,1,0,NULL)
     ON CONFLICT(game, track_id, car_id) DO UPDATE SET dirty=1`
  ).bind(game, trackId, carId).run().catch(() => {
  });
  await markCar(env, game, carId);
}
__name(markModel, "markModel");
async function rebuild(env, game, trackId, carId) {
  const m = await buildModel(env, game, trackId, carId);
  await env.DB.prepare(
    `INSERT INTO model_cache (game, track_id, car_id, dirty, built, data) VALUES (?1,?2,?3,?6,?4,?5)
     ON CONFLICT(game, track_id, car_id) DO UPDATE SET dirty=excluded.dirty, built=excluded.built, data=excluded.data`
  ).bind(game, trackId, carId, m.built, await gz(JSON.stringify(m)), m.more ? 1 : 0).run();
  return m;
}
__name(rebuild, "rebuild");
async function slowsOf(env, game, trackId) {
  const rows = (await env.DB.prepare("SELECT data FROM model_cache WHERE game=?1 AND track_id=?2 AND data IS NOT NULL ORDER BY built DESC LIMIT 4").bind(game, trackId).all().catch(() => ({ results: [] }))).results || [];
  const out = [];
  for (const row of rows) {
    try {
      const m = JSON.parse(await gunz(row.data)), L = (m.nb || 0) * 5;
      if (!(L > 500)) continue;
      for (const c of m.corners || []) if ((c.n || 0) >= 3 && c.apex > 0 && c.apex < L) out.push(Math.round(c.apex / L * 1e4) / 1e4);
    } catch (e) {
    }
  }
  return out;
}
__name(slowsOf, "slowsOf");
async function getModel(env, game, trackId, carId) {
  carId = await famId(env, game, carId);
  const row = await env.DB.prepare("SELECT dirty, built, data FROM model_cache WHERE game=?1 AND track_id=?2 AND car_id=?3").bind(game, trackId, carId).first();
  if (row && row.data && !row.dirty) {
    const m = JSON.parse(await gunz(row.data));
    if (m.v === MODEL_VERSION) return m;
  }
  try {
    return await rebuild(env, game, trackId, carId);
  } catch (e) {
    if (row && row.data) return JSON.parse(await gunz(row.data));
    throw e;
  }
}
__name(getModel, "getModel");
async function rebuildDirty(env, { daily = false } = {}) {
  if (daily) await env.DB.prepare(
    `INSERT INTO model_cache (game, track_id, car_id, dirty, built, data)
     SELECT DISTINCT game, track_id, car_id, 1, 0, NULL FROM community_laps WHERE track_id>0 AND car_id>0
     UNION SELECT DISTINCT game, track_id, car_id, 1, 0, NULL FROM sessions WHERE track_id>0 AND car_id>0 AND uploader LIKE 'acct:%'
     ON CONFLICT DO NOTHING`
  ).run().catch(() => {
  });
  const r4 = await env.DB.prepare("SELECT game, track_id, car_id FROM model_cache WHERE dirty=1 ORDER BY built LIMIT 25").all();
  for (const x of r4.results || []) {
    try {
      await rebuild(env, x.game, x.track_id, x.car_id);
    } catch (e) {
    }
  }
  if (daily) await env.DB.prepare("INSERT INTO car_cards (game, car_id, dirty, built, data) SELECT DISTINCT game, car_id, 1, 0, NULL FROM model_laps WHERE car_id>0 ON CONFLICT DO NOTHING").run().catch(() => {
  });
  const c = await env.DB.prepare("SELECT game, car_id FROM car_cards WHERE dirty=1 ORDER BY built LIMIT 10").all().catch(() => ({ results: [] }));
  for (const x of c.results || []) {
    try {
      await buildCarCard(env, x.game, x.car_id);
    } catch (e) {
    }
    await env.DB.prepare("UPDATE car_cards SET dirty=0, built=?3 WHERE game=?1 AND car_id=?2 AND dirty=1").bind(x.game, x.car_id, Date.now()).run().catch(() => {
    });
  }
}
__name(rebuildDirty, "rebuildDirty");

// src/supportlib.js
var SUPPORT_MAX = 4e3;
var SUPPORT_PER_DAY = 20;
var THREAD_MSGS = 300;
var CONVERSATIONS = 200;
var ACCOUNT_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
var DEVICES = ["web", "pc", "android", "ios"];
var cleanV = /* @__PURE__ */ __name((v) => String(v == null ? "" : v).replace(/[^0-9a-zA-Z.+-]/g, "").slice(0, 24), "cleanV");
var cleanLang = /* @__PURE__ */ __name((l) => ["en", "es", "pt"].includes(String(l || "").slice(0, 2).toLowerCase()) ? String(l).slice(0, 2).toLowerCase() : null, "cleanLang");
function cleanText(t) {
  const text2 = String(t == null ? "" : t).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (!text2) return { error: "write something first" };
  if (text2.length > SUPPORT_MAX) return { error: "too long (" + SUPPORT_MAX + " characters at most)" };
  return { text: text2 };
}
__name(cleanText, "cleanText");
function cleanSupport(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const t = cleanText(b.text);
  if (t.error) return t;
  const device = String(b.device || "").toLowerCase();
  return { text: t.text, device: DEVICES.includes(device) ? device : "", v: cleanV(b.v), view: String(b.view || "").replace(/[^a-z0-9_.:-]/gi, "").slice(0, 40), lang: cleanLang(b.lang) };
}
__name(cleanSupport, "cleanSupport");
var SQL_MSG_ADD = "INSERT INTO support_msgs (id, account_id, from_support, text, created, rating, device, v, view, kind, style, lang) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)";
var SQL_THREAD_DRIVER = "INSERT INTO support_threads (account_id, last_at, last_text, last_support, unread_support, unread_driver) VALUES (?1,?2,substr(?3,1,200),0,1,0) ON CONFLICT(account_id) DO UPDATE SET last_at=excluded.last_at, last_text=excluded.last_text, last_support=0, unread_support=support_threads.unread_support+1";
var SQL_THREAD_SUPPORT = "INSERT INTO support_threads (account_id, last_at, last_text, last_support, unread_support, unread_driver) VALUES (?1,?2,substr(?3,1,200),1,0,1) ON CONFLICT(account_id) DO UPDATE SET last_at=excluded.last_at, last_text=excluded.last_text, last_support=1, unread_driver=support_threads.unread_driver+1";
var SQL_DRIVER_READ = "UPDATE support_msgs SET read_at=?2 WHERE account_id=?1 AND from_support=1 AND read_at IS NULL";
var SQL_DRIVER_READ_T = "UPDATE support_threads SET unread_driver=0 WHERE account_id=?1 AND unread_driver<>0";
var SQL_SUPPORT_READ = "UPDATE support_msgs SET read_at=?2 WHERE account_id=?1 AND from_support=0 AND read_at IS NULL";
var SQL_SUPPORT_READ_T = "UPDATE support_threads SET unread_support=0 WHERE account_id=?1 AND unread_support<>0";
var SQL_UNREAD_DRIVER = "SELECT unread_driver AS n, last_text, last_support, last_at FROM support_threads WHERE account_id=?1";
var SQL_UNREAD_ADMIN = "SELECT COUNT(*) AS n FROM support_threads WHERE unread_support>0";
var SQL_THREAD_MSGS = "SELECT id, from_support, text, created, read_at, rating, device, v, view, kind, style FROM support_msgs WHERE account_id=?1 ORDER BY created DESC LIMIT " + THREAD_MSGS;
var SQL_CONVERSATIONS = "SELECT t.account_id, t.last_at, t.last_text, t.last_support, t.unread_support, a.display AS nick FROM support_threads t LEFT JOIN accounts a ON a.id=t.account_id ORDER BY t.last_at DESC LIMIT " + CONVERSATIONS;
var SQL_SENT_SINCE = "SELECT COUNT(*) AS n FROM support_msgs WHERE account_id=?1 AND from_support=0 AND created>?2";
var SQL_LAST_LANG = "SELECT lang FROM support_msgs WHERE account_id=?1 AND from_support=0 AND lang IS NOT NULL ORDER BY created DESC LIMIT 1";
var driverMsg = /* @__PURE__ */ __name((r4) => {
  const o = { id: r4.id, me: !r4.from_support, text: r4.text, created: r4.created, kind: r4.kind || "chat" };
  if (r4.rating) o.rating = r4.rating;
  return o;
}, "driverMsg");
var adminMsg = /* @__PURE__ */ __name((r4) => ({
  id: r4.id,
  support: !!r4.from_support,
  text: r4.text,
  created: r4.created,
  read: r4.read_at || null,
  rating: r4.rating || null,
  device: r4.device || "",
  v: r4.v || "",
  view: r4.view || "",
  kind: r4.kind || "chat",
  style: r4.style || null
}), "adminMsg");
var conversation = /* @__PURE__ */ __name((r4) => ({ accountId: r4.account_id, nick: r4.nick || "", last: r4.last_text, lastAt: r4.last_at, lastSupport: !!r4.last_support, unread: r4.unread_support || 0 }), "conversation");
var chrono = /* @__PURE__ */ __name((rows) => rows.slice().reverse(), "chrono");
function replyMail(text2, l) {
  const L = cleanLang(l) || "en";
  return {
    lang: L,
    subject: { en: "Pitlane HQ Support replied", es: "El soporte de Pitlane HQ te ha respondido", pt: "O suporte do Pitlane HQ respondeu" }[L],
    text: text2,
    button: { en: "Open Pitlane HQ", es: "Abrir Pitlane HQ", pt: "Abrir o Pitlane HQ" }[L],
    link: "https://pitlanehq.app/app?support=1"
  };
}
__name(replyMail, "replyMail");
function chatMail(f) {
  return {
    subject: "Support chat \xB7 " + (f.nick || "a driver"),
    text: [
      f.text,
      "",
      "From " + (f.nick || "\u2013") + " (" + (f.accountId || "\u2013") + ")",
      "Device " + (f.device || "\u2013") + " \xB7 version " + (f.v || "\u2013") + " \xB7 in " + (f.view || "\u2013"),
      f.email ? "Reply to answer " + f.email + ", or answer in the app" : "No email known for this account, answer in the app"
    ].join("\n"),
    link: "https://pitlanehq.app/app?support=" + encodeURIComponent(f.accountId || "")
  };
}
__name(chatMail, "chatMail");
var json2 = /* @__PURE__ */ __name((o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var err = /* @__PURE__ */ __name((m, s) => json2({ error: m }, s), "err");
var driverMessage = /* @__PURE__ */ __name((env, accId, id2, now, m) => [
  env.DB.prepare(SQL_MSG_ADD).bind(id2, accId, 0, m.text, now, m.rating || null, m.device || "", m.v || "", m.view || "", m.kind || "chat", m.style || null, m.lang || null),
  env.DB.prepare(SQL_THREAD_DRIVER).bind(accId, now, m.text)
], "driverMessage");
async function handleSupport(req, env, url, { sessionAccount: sessionAccount2, isAdmin: isAdmin2, openEscrow: openEscrow2, sendSupportChat: sendSupportChat2, sendSupportReply: sendSupportReply2 }) {
  const p = url.pathname, m = req.method;
  if (p !== "/community/support" && p !== "/community/support/unread" && !p.startsWith("/community/admin/support")) return null;
  const acc = await sessionAccount2(req, env);
  if (!acc) return err("sign in with your Pitlane HQ account", 401);
  const now = Date.now();
  if (p === "/community/support/unread" && m === "GET") {
    const r4 = await env.DB.prepare(SQL_UNREAD_DRIVER).bind(acc.id).first(), n = r4 && r4.n || 0;
    return json2(n && r4.last_support ? { n, last: r4.last_text, at: r4.last_at } : { n });
  }
  if (p === "/community/support" && m === "GET") {
    const [rows, u] = await Promise.all([env.DB.prepare(SQL_THREAD_MSGS).bind(acc.id).all(), env.DB.prepare(SQL_UNREAD_DRIVER).bind(acc.id).first()]);
    const unread = u && u.n || 0;
    if (unread) await env.DB.batch([env.DB.prepare(SQL_DRIVER_READ).bind(acc.id, now), env.DB.prepare(SQL_DRIVER_READ_T).bind(acc.id)]);
    return json2({ msgs: chrono(rows.results || []).map(driverMsg), unread });
  }
  if (p === "/community/support" && m === "POST") {
    const f = cleanSupport(await req.json().catch(() => null));
    if (f.error) return err(f.error, 400);
    const c = await env.DB.prepare(SQL_SENT_SINCE).bind(acc.id, now - 864e5).first();
    if (c && c.n >= SUPPORT_PER_DAY) return err("that is enough for today, we answer soon", 429);
    const id3 = crypto.randomUUID();
    await env.DB.batch(driverMessage(env, acc.id, id3, now, { ...f, kind: "chat" }));
    const esc6 = await openEscrow2(env, acc.escrow).catch(() => null);
    const mailed = await sendSupportChat2(env, { ...f, nick: acc.display || "", accountId: acc.id, email: esc6 && esc6.email || "" }).catch(() => false);
    return json2({ ok: true, mailed, msg: { id: id3, me: true, text: f.text, created: now, kind: "chat" } });
  }
  if (!p.startsWith("/community/admin/support")) return err("not found", 404);
  if (!isAdmin2(env, acc.id)) return err("only the admins of this server can do this", 403);
  if (p === "/community/admin/support/unread" && m === "GET") {
    const r4 = await env.DB.prepare(SQL_UNREAD_ADMIN).first();
    return json2({ n: r4 && r4.n || 0 });
  }
  if (p === "/community/admin/support" && m === "GET") {
    const r4 = await env.DB.prepare(SQL_CONVERSATIONS).all();
    const items = (r4.results || []).map(conversation);
    return json2({ items, unread: items.filter((x) => x.unread > 0).length });
  }
  const mm = /^\/community\/admin\/support\/([^/]+)$/.exec(p);
  const id2 = mm ? decodeURIComponent(mm[1]) : "";
  if (!ACCOUNT_RE.test(id2)) return err("not found", 404);
  const a = await env.DB.prepare("SELECT id, display, escrow FROM accounts WHERE id=?1").bind(id2).first();
  if (m === "GET") {
    const rows = await env.DB.prepare(SQL_THREAD_MSGS).bind(id2).all();
    await env.DB.batch([env.DB.prepare(SQL_SUPPORT_READ).bind(id2, now), env.DB.prepare(SQL_SUPPORT_READ_T).bind(id2)]);
    return json2({ accountId: id2, nick: a && a.display || "", gone: !a, msgs: chrono(rows.results || []).map(adminMsg) });
  }
  if (m === "POST") {
    if (!a) return err("this account does not exist any more", 404);
    const t = cleanText((await req.json().catch(() => null) || {}).text);
    if (t.error) return err(t.error, 400);
    const mid = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(SQL_MSG_ADD).bind(mid, id2, 1, t.text, now, null, "", "", "", "reply", null, null),
      env.DB.prepare(SQL_THREAD_SUPPORT).bind(id2, now, t.text),
      // answering is reading what they wrote
      env.DB.prepare(SQL_SUPPORT_READ).bind(id2, now),
      env.DB.prepare(SQL_SUPPORT_READ_T).bind(id2)
    ]);
    const [esc6, lr] = await Promise.all([openEscrow2(env, a.escrow).catch(() => null), env.DB.prepare(SQL_LAST_LANG).bind(id2).first()]);
    const mailed = esc6 && esc6.email ? await sendSupportReply2(env, esc6.email, t.text, lr && lr.lang).catch(() => false) : false;
    return json2({ ok: true, mailed, msg: { id: mid, support: true, text: t.text, created: now, read: null, rating: null, device: "", v: "", view: "", kind: "reply", style: null } });
  }
  return err("not found", 404);
}
__name(handleSupport, "handleSupport");

// src/email.js
var mailReady = /* @__PURE__ */ __name((env) => !!env.EMAIL_FROM && !!env.RESEND_API_KEY, "mailReady");
var SUPPORT = "support@pitlanehq.app";
var T = {
  verifySubject: { en: "Confirm your Pitlane HQ email", es: "Confirma tu email de Pitlane HQ", de: "Best\xE4tige deine PitlaneHQ-E-Mail", pt: "Confirme seu email do Pitlane HQ" },
  verifyText: {
    en: "Welcome to Pitlane HQ! Confirm this is your email by opening the link below (it works for 7 days):",
    es: "\xA1Bienvenido a Pitlane HQ! Confirma que este es tu email abriendo el enlace de abajo (vale 7 d\xEDas):",
    de: "Willkommen bei Pitlane HQ! Best\xE4tige deine E-Mail-Adresse mit dem Link unten (7 Tage g\xFCltig):",
    pt: "Bem-vindo ao Pitlane HQ! Confirme que este \xE9 o seu email abrindo o link abaixo (vale 7 dias):"
  },
  verifyButton: { en: "Confirm my email", es: "Confirmar mi email", de: "E-Mail best\xE4tigen", pt: "Confirmar meu email" },
  resetSubject: { en: "Reset your Pitlane HQ password", es: "Restablece tu contrase\xF1a de Pitlane HQ", de: "PitlaneHQ-Passwort zur\xFCcksetzen", pt: "Redefina sua senha do Pitlane HQ" },
  resetText: {
    en: "Someone (hopefully you) asked to reset the password of your Pitlane HQ account. Open the link below within 1 hour to choose a new one. If it was not you, ignore this email: nothing changes.",
    es: "Alguien (esperamos que t\xFA) ha pedido restablecer la contrase\xF1a de tu cuenta de Pitlane HQ. Abre el enlace de abajo antes de 1 hora para elegir una nueva. Si no fuiste t\xFA, ignora este email: no cambia nada.",
    de: "Jemand (hoffentlich du) m\xF6chte das Passwort deines PitlaneHQ-Kontos zur\xFCcksetzen. \xD6ffne den Link unten innerhalb von 1 Stunde, um ein neues zu w\xE4hlen. Warst du es nicht, ignoriere diese E-Mail: Es \xE4ndert sich nichts.",
    pt: "Algu\xE9m (esperamos que voc\xEA) pediu para redefinir a senha da sua conta Pitlane HQ. Abra o link abaixo em at\xE9 1 hora para escolher uma nova. Se n\xE3o foi voc\xEA, ignore este email: nada muda."
  },
  resetButton: { en: "Choose a new password", es: "Elegir una contrase\xF1a nueva", de: "Neues Passwort w\xE4hlen", pt: "Escolher uma nova senha" }
};
var SITE = "https://pitlanehq.app";
var F = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function mailHTML(subject, text2, link, button2, l) {
  const L = lang(l), ask = { en: "Questions? Write to", es: "\xBFDudas? Escr\xEDbenos a", de: "Fragen? Schreib uns an", pt: "D\xFAvidas? Escreva para" }[L];
  const alt = { en: "If the button does not work, open this link:", es: "Si el bot\xF3n no funciona, abre este enlace:", de: "Wenn der Button nicht geht, \xF6ffne diesen Link:", pt: "Se o bot\xE3o n\xE3o funcionar, abra este link:" }[L];
  const why = { en: "You get this email because someone used this address on Pitlane HQ.", es: "Recibes este email porque alguien us\xF3 esta direcci\xF3n en Pitlane HQ.", de: "Du bekommst diese E-Mail, weil diese Adresse bei Pitlane HQ verwendet wurde.", pt: "Voc\xEA recebe este email porque algu\xE9m usou este endere\xE7o no Pitlane HQ." }[L];
  return `<!doctype html><html lang="${L}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc2(subject)}</title></head>
<body style="margin:0;padding:0;background:#11151b">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc2(text2.slice(0, 110))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#11151b" style="background:#11151b"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
<tr><td style="padding:0 4px 18px"><a href="${SITE}" style="text-decoration:none"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px"><img src="${SITE}/icon-192.png" width="40" height="40" alt="" style="display:block;border:0;width:40px;height:40px"></td>
<td style="font:800 20px ${F};letter-spacing:.06em;text-transform:uppercase;color:#e7ebf1">PITLANE HQ</td></tr></table></a></td></tr>
<tr><td bgcolor="#1a2029" style="background:#1a2029;border:1px solid #2b3542;border-radius:14px;padding:28px 26px">
<div style="font:800 13px ${F};letter-spacing:.1em;text-transform:uppercase;color:#ffb02e;margin:0 0 10px">${esc2(subject.replace(/^Pitlane HQ:\s*/, ""))}</div>
<p style="font:16px/1.55 ${F};color:#e7ebf1;margin:0 0 22px;white-space:pre-line">${esc2(text2)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#ffb02e" style="background:#ffb02e;border-radius:8px">
<a href="${esc2(link)}" style="display:inline-block;padding:13px 22px;font:800 14px ${F};letter-spacing:.06em;text-transform:uppercase;color:#11151b;text-decoration:none">${esc2(button2)}</a></td></tr></table>
<p style="font:13px/1.5 ${F};color:#8a96a8;margin:22px 0 0">${esc2(alt)}<br><a href="${esc2(link)}" style="color:#aab4c3;word-break:break-all">${esc2(link)}</a></p>
</td></tr>
<tr><td style="padding:18px 6px 0;font:12px/1.6 ${F};color:#6c7789">${esc2(ask)} <a href="mailto:${SUPPORT}" style="color:#aab4c3">${SUPPORT}</a><br>${esc2(why)}<br><a href="${SITE}" style="color:#6c7789">pitlanehq.app</a></td></tr>
</table></td></tr></table></body></html>`;
}
__name(mailHTML, "mailHTML");
var lang = /* @__PURE__ */ __name((l) => ["en", "es", "pt"].includes(l) ? l : "en", "lang");
var esc2 = /* @__PURE__ */ __name((s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]), "esc");
async function note(env, ok) {
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES (?1,?2,?3) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(ok ? "mail_ok" : "mail_error", ok ? "" : JSON.stringify(lastError), Date.now()).run().catch(() => {
  });
}
__name(note, "note");
var mask = /* @__PURE__ */ __name((e) => {
  const [u, d] = String(e).split("@");
  return (u || "").slice(0, 2) + "\u2022\u2022\u2022@" + (d || "");
}, "mask");
async function logSent(env, to, subject, via, id2) {
  const row = await env.DB.prepare("SELECT v FROM app_state WHERE k='mail_log'").first().catch(() => null);
  let l = [];
  try {
    l = JSON.parse(row && row.v || "[]");
  } catch (e) {
  }
  l.unshift({ at: Date.now(), to: mask(to), subject, via, id: id2 || "" });
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('mail_log',?1,?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(JSON.stringify(l.slice(0, 10)), Date.now()).run().catch(() => {
  });
}
__name(logSent, "logSent");
async function dns(name2, type) {
  try {
    const r4 = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name2)}&type=${type}`, { headers: { accept: "application/dns-json" } });
    const j = await r4.json();
    return (j.Answer || []).map((a) => String(a.data || "").replace(/^"|"$/g, "").replace(/" "/g, ""));
  } catch (e) {
    return null;
  }
}
__name(dns, "dns");
async function mailDomain(env) {
  const from = (/<([^>]+)>/.exec(env.EMAIL_FROM || "") || [null, env.EMAIL_FROM || ""])[1].trim(), dom = from.split("@")[1] || "";
  if (!dom) return { domain: "", checks: [] };
  const [txt, mx, dmarc, rk, smx, stxt, bimi] = await Promise.all([
    dns(dom, "TXT"),
    dns(dom, "MX"),
    dns("_dmarc." + dom, "TXT"),
    dns("resend._domainkey." + dom, "TXT"),
    dns("send." + dom, "MX"),
    dns("send." + dom, "TXT"),
    dns("default._bimi." + dom, "TXT")
  ]);
  const spf = (txt || []).filter((x) => /^v=spf1/i.test(x)), checks = [];
  checks.push({ k: "resend-dkim", ok: (rk || []).some((x) => /^p=/.test(x)), got: (rk || []).join(" | ").slice(0, 60) || "\u2014", want: "TXT resend._domainkey: the p=\u2026 value from Resend \u2192 Domains" });
  checks.push({
    k: "resend-spf",
    ok: (smx || []).some((x) => /amazonses\.com/.test(x)) && (stxt || []).some((x) => /include:amazonses\.com/.test(x)),
    got: [...smx || [], ...stxt || []].join(" | ") || "\u2014",
    want: "on send: MX 10 feedback-smtp.us-east-1.amazonses.com and TXT v=spf1 include:amazonses.com ~all"
  });
  checks.push({
    k: "spf",
    ok: spf.length === 1 && !/protonmail/i.test(spf[0]),
    got: spf.join(" | ") || "\u2014",
    want: spf.length > 1 ? "one SPF record only (there are " + spf.length + ": join them)" : "v=spf1 include:_spf.mx.cloudflare.net ~all (Email Routing's), or v=spf1 -all"
  });
  checks.push({
    k: "mx",
    opt: true,
    ok: (mx || []).some((x) => /mx\.cloudflare\.net/.test(x)) && !(mx || []).some((x) => /protonmail/.test(x)),
    got: (mx || []).join(" | ") || "\u2014",
    want: "Cloudflare Email Routing's MX (route1/2/3.mx.cloudflare.net): Cloudflare \u2192 Email \u2192 Email Routing"
  });
  checks.push({ k: "dmarc", ok: (dmarc || []).some((x) => /^v=DMARC1/i.test(x)), got: (dmarc || []).join(" | ") || "\u2014", want: "_dmarc: v=DMARC1; p=quarantine" });
  const strict = (dmarc || []).some((x) => /p=(quarantine|reject)/i.test(x) && !/pct=(?!100)\d+/i.test(x));
  checks.push({
    k: "bimi",
    ok: strict && (bimi || []).some((x) => /^v=BIMI1/i.test(x) && /l=https:\/\//i.test(x)),
    got: (bimi || []).join(" | ") || "\u2014",
    want: (strict ? "" : "DMARC at p=quarantine (now: " + ((dmarc || [])[0] || "none") + "), and ") + "TXT default._bimi: v=BIMI1; l=https://" + dom + "/bimi.svg;"
  });
  return { domain: dom, via: "resend", checks, dnsOk: txt !== null };
}
__name(mailDomain, "mailDomain");
async function mailLog(env) {
  const row = await env.DB.prepare("SELECT v FROM app_state WHERE k='mail_log'").first().catch(() => null);
  let l = [];
  try {
    l = JSON.parse(row && row.v || "[]");
  } catch (e) {
  }
  for (const x of l.slice(0, 6)) {
    if (x.via !== "resend" || !x.id || !env.RESEND_API_KEY) continue;
    try {
      const r4 = await fetch("https://api.resend.com/emails/" + encodeURIComponent(x.id), { headers: { authorization: "Bearer " + env.RESEND_API_KEY } });
      const j = await r4.json().catch(() => ({}));
      x.state = r4.ok ? j.last_event || "sent" : r4.status === 401 || r4.status === 403 ? "resend-sent" : "unknown (" + r4.status + ")";
    } catch (e) {
      x.state = "unknown";
    }
  }
  return l;
}
__name(mailLog, "mailLog");
async function send(env, to, subject, text2, link, button2, l, reply2) {
  if (!mailReady(env)) {
    lastError = { at: Date.now(), message: "emails are not set up: EMAIL_FROM or RESEND_API_KEY is missing" };
    await note(env, false);
    return false;
  }
  try {
    return await send1(env, to, subject, text2, link, button2, l, reply2);
  } catch (e) {
    lastError = { at: Date.now(), message: String(e && e.message || e) };
    await note(env, false);
    return false;
  }
}
__name(send, "send");
async function send1(env, to, subject, text2, link, button2, l, reply2) {
  const html2 = mailHTML(subject, text2, link, button2, l);
  const plain2 = text2 + "\n\n" + link + "\n\n" + SUPPORT, replyTo = reply2 || env.EMAIL_REPLY_TO || SUPPORT;
  if (env.RESEND_API_KEY) {
    const r4 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, reply_to: replyTo, to: [to], subject, text: plain2, html: html2 })
    });
    if (r4.ok) {
      lastError = null;
      const j = await r4.json().catch(() => ({}));
      await logSent(env, to, subject, "resend", j.id);
      await note(env, true);
      return true;
    }
    lastError = { at: Date.now(), via: "resend", status: r4.status, body: (await r4.text().catch(() => "")).slice(0, 500), from: env.EMAIL_FROM };
    console.error("email not sent by Resend", lastError);
    await note(env, false);
    return false;
  }
  await note(env, false);
  return false;
}
__name(send1, "send1");
var lastError = null;
async function sendTest(env, to, l) {
  const ok = await send(env, to, "Pitlane HQ: " + (lang(l) === "es" ? "email de prueba" : "test email"), lang(l) === "es" ? "Si lees esto, los emails del servidor funcionan." : "If you read this, the server's emails work.", "https://pitlanehq.app/", "Pitlane HQ", l);
  return { ok, via: env.RESEND_API_KEY ? "resend" : "", from: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO || SUPPORT, error: ok ? null : lastError };
}
__name(sendTest, "sendTest");
var sendVerify = /* @__PURE__ */ __name((env, to, link, l) => send(env, to, T.verifySubject[lang(l)], T.verifyText[lang(l)], link, T.verifyButton[lang(l)], l), "sendVerify");
var sendReset = /* @__PURE__ */ __name((env, to, link, l) => send(env, to, T.resetSubject[lang(l)], T.resetText[lang(l)], link, T.resetButton[lang(l)], l), "sendReset");
function feedbackMail(f) {
  const stars = f.rating ? "\u2605".repeat(f.rating) + "\u2606".repeat(5 - f.rating) + " (" + f.rating + "/5)" : "no stars";
  const ov = f.kind === "overlays";
  const subject = (ov ? "Pitlane HQ overlay feedback \xB7 " : "Pitlane HQ feedback \xB7 ") + (f.nick || "a driver") + (f.rating ? " \xB7 " + f.rating + "/5" : "");
  const text2 = [f.text, "", ...ov ? ["About the overlays \xB7 design " + (f.style || "classic")] : [], "From " + (f.nick || "\u2013") + " (" + (f.accountId || "\u2013") + ")", "Device " + (f.device || "\u2013") + " \xB7 version " + (f.v || "\u2013") + " \xB7 asked in " + (f.view || "\u2013"), stars, f.email ? "Reply to answer " + f.email : "No email known for this account"].join("\n");
  return { subject, text: text2 };
}
__name(feedbackMail, "feedbackMail");
async function sendFeedback(env, f) {
  const { subject, text: text2 } = feedbackMail(f);
  return send(env, SUPPORT, subject, text2, SITE + "/admin", "Open the admin page", "en", f.email || "");
}
__name(sendFeedback, "sendFeedback");
async function sendSupportChat(env, f) {
  const { subject, text: text2, link } = chatMail(f);
  return send(env, SUPPORT, subject, text2, link, "Open the support chat", "en", f.email || "");
}
__name(sendSupportChat, "sendSupportChat");
async function sendSupportReply(env, to, reply2, l) {
  const m = replyMail(reply2, l);
  return send(env, to, m.subject, m.text, m.link, m.button, m.lang);
}
__name(sendSupportReply, "sendSupportReply");

// src/pages.js
var S = {
  title: { en: "Pitlane HQ", es: "Pitlane HQ", de: "Pitlane HQ", pt: "Pitlane HQ" },
  verified: { en: "Your email is confirmed. You can close this page.", es: "Tu email est\xE1 confirmado. Ya puedes cerrar esta p\xE1gina.", de: "Deine E-Mail ist best\xE4tigt. Du kannst diese Seite schlie\xDFen.", pt: "Seu email est\xE1 confirmado. Pode fechar esta p\xE1gina." },
  badLink: { en: "This link is not valid any more. Ask for a new one from the app.", es: "Este enlace ya no es v\xE1lido. Pide uno nuevo desde la app.", de: "Dieser Link ist nicht mehr g\xFCltig. Fordere in der App einen neuen an.", pt: "Este link n\xE3o \xE9 mais v\xE1lido. Pe\xE7a um novo pelo app." },
  forgotTitle: { en: "Forgot your password?", es: "\xBFOlvidaste tu contrase\xF1a?", de: "Passwort vergessen?", pt: "Esqueceu a senha?" },
  forgotText: {
    en: "Type the email of your Pitlane HQ account and we send you a link to choose a new password.",
    es: "Escribe el email de tu cuenta de Pitlane HQ y te enviamos un enlace para elegir una contrase\xF1a nueva.",
    de: "Gib die E-Mail deines PitlaneHQ-Kontos ein und wir senden dir einen Link f\xFCr ein neues Passwort.",
    pt: "Digite o email da sua conta Pitlane HQ e enviamos um link para escolher uma nova senha."
  },
  send: { en: "Send me the link", es: "Enviarme el enlace", de: "Link senden", pt: "Enviar o link" },
  sent: {
    en: "If there is an account with that email, the link is on its way. Check your inbox (and spam).",
    es: "Si hay una cuenta con ese email, el enlace va de camino. Mira tu bandeja de entrada (y el spam).",
    de: "Wenn es ein Konto mit dieser E-Mail gibt, ist der Link unterwegs. Sieh in deinem Posteingang (und Spam) nach.",
    pt: "Se houver uma conta com esse email, o link est\xE1 a caminho. Veja sua caixa de entrada (e o spam)."
  },
  resetTitle: { en: "Choose a new password", es: "Elige una contrase\xF1a nueva", de: "Neues Passwort w\xE4hlen", pt: "Escolha uma nova senha" },
  resetText: {
    en: "When you sign in on your PC with the new password, the PC uploads your settings and races again. Your laps, name and setups stay.",
    es: "Al entrar en tu PC con la contrase\xF1a nueva, el PC vuelve a subir tus ajustes y carreras. Tus vueltas, nombre y setups se quedan.",
    de: "Wenn du dich am PC mit dem neuen Passwort anmeldest, l\xE4dt der PC deine Einstellungen und Rennen erneut hoch. Runden, Name und Setups bleiben.",
    pt: "Ao entrar no PC com a nova senha, o PC envia seus ajustes e corridas de novo. Suas voltas, nome e setups ficam."
  },
  email: { en: "Email", es: "Email", de: "E-Mail", pt: "Email" },
  pass: { en: "New password (at least 10 characters)", es: "Contrase\xF1a nueva (m\xEDnimo 10 caracteres)", de: "Neues Passwort (mindestens 10 Zeichen)", pt: "Nova senha (m\xEDnimo 10 caracteres)" },
  pass2: { en: "Repeat the password", es: "Repite la contrase\xF1a", de: "Passwort wiederholen", pt: "Repita a senha" },
  save: { en: "Save the new password", es: "Guardar la contrase\xF1a nueva", de: "Neues Passwort speichern", pt: "Salvar a nova senha" },
  done: { en: "Done. Sign in with your new password in the app.", es: "Listo. Entra con tu contrase\xF1a nueva en la app.", de: "Fertig. Melde dich in der App mit dem neuen Passwort an.", pt: "Pronto. Entre com a nova senha no app." },
  mismatch: { en: "The passwords do not match.", es: "Las contrase\xF1as no coinciden.", de: "Die Passw\xF6rter stimmen nicht \xFCberein.", pt: "As senhas n\xE3o coincidem." },
  short: { en: "The password needs at least 10 characters.", es: "La contrase\xF1a necesita al menos 10 caracteres.", de: "Das Passwort braucht mindestens 10 Zeichen.", pt: "A senha precisa de pelo menos 10 caracteres." },
  working: { en: "Working\u2026", es: "Un momento\u2026", de: "Einen Moment\u2026", pt: "Um momento\u2026" },
  back: { en: "Back to Pitlane HQ", es: "Volver a Pitlane HQ", de: "Zur\xFCck zu Pitlane HQ", pt: "Voltar ao Pitlane HQ" },
  noMail: { en: "Emails are not set up on this server yet.", es: "Los emails a\xFAn no est\xE1n configurados en este servidor.", de: "E-Mails sind auf diesem Server noch nicht eingerichtet.", pt: "Os emails ainda n\xE3o est\xE3o configurados neste servidor." }
};
var esc3 = /* @__PURE__ */ __name((s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]), "esc");
function pageLang(req, url) {
  const q2 = url.searchParams.get("lang");
  if (q2) return lang(q2);
  const a = (req.headers.get("accept-language") || "").slice(0, 2).toLowerCase();
  return lang(a);
}
__name(pageLang, "pageLang");
function page2(l, body, script = "") {
  return new Response(
    `<!doctype html><html lang="${l}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pitlane HQ - Telemetry &amp; Coach</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#11151b;color:#e7ebf1;font:16px/1.5 system-ui,sans-serif}main{width:min(420px,calc(100% - 32px))}
h1{font-size:22px;letter-spacing:.05em;text-transform:uppercase}p{color:#a9b4c3}label{display:block;margin:12px 0 4px;font-size:13px;color:#8a97a9;text-transform:uppercase;letter-spacing:.06em}
input{width:100%;box-sizing:border-box;font:16px system-ui;padding:12px;border-radius:8px;border:1px solid #2b3542;background:#19202a;color:#e7ebf1}
button{margin-top:16px;width:100%;padding:13px;border:0;border-radius:8px;background:#ffb02e;color:#11151b;font:700 15px system-ui;text-transform:uppercase;letter-spacing:.05em;cursor:pointer}
.err{color:#ff6363;min-height:1.4em}.ok{color:#38c97c}.back{display:inline-block;margin-top:22px;color:#8a97a9;font-size:14px;text-decoration:none}.back:hover{color:#e7ebf1}</style><main>${body}<a class="back" href="/">\u2190 ${esc3(S.back[l])}</a></main>${script ? `<script>${script}<\/script>` : ""}</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'",
        "referrer-policy": "no-referrer"
      }
    }
  );
}
__name(page2, "page");
var messagePage = /* @__PURE__ */ __name((l, ok) => page2(l, `<h1>${S.title[l]}</h1><p class="${ok ? "ok" : "err"}">${esc3(ok ? S.verified[l] : S.badLink[l])}</p>`), "messagePage");
var badLinkPage = /* @__PURE__ */ __name((l) => page2(l, `<h1>${S.title[l]}</h1><p class="err">${esc3(S.badLink[l])}</p>`), "badLinkPage");
function forgotPage(l, ready) {
  if (!ready) return page2(l, `<h1>${esc3(S.forgotTitle[l])}</h1><p class="err">${esc3(S.noMail[l])}</p>`);
  return page2(
    l,
    `<h1>${esc3(S.forgotTitle[l])}</h1><p>${esc3(S.forgotText[l])}</p><form id="f"><label for="e">${esc3(S.email[l])}</label><input id="e" type="email" autocomplete="username" required><div class="err" id="m"></div><button>${esc3(S.send[l])}</button></form>`,
    `document.getElementById("f").onsubmit=async e=>{e.preventDefault();const m=document.getElementById("m");m.className="";m.textContent=${JSON.stringify(S.working[l])};
try{const r=await fetch("/account/forgot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:document.getElementById("e").value.trim().toLowerCase(),lang:${JSON.stringify(l)}})});const j=await r.json().catch(()=>({}));
if(!r.ok)throw new Error(j.error||("HTTP "+r.status));m.className="ok";m.textContent=${JSON.stringify(S.sent[l])}}catch(x){m.className="err";m.textContent=x.message}}`
  );
}
__name(forgotPage, "forgotPage");
function resetPage(l, token) {
  return page2(
    l,
    `<h1>${esc3(S.resetTitle[l])}</h1><p>${esc3(S.resetText[l])}</p><form id="f"><label for="e">${esc3(S.email[l])}</label><input id="e" type="email" autocomplete="username" required>
<label for="p">${esc3(S.pass[l])}</label><input id="p" type="password" autocomplete="new-password" minlength="10" required><label for="p2">${esc3(S.pass2[l])}</label><input id="p2" type="password" autocomplete="new-password" minlength="10" required>
<div class="err" id="m"></div><button>${esc3(S.save[l])}</button></form>`,
    `const T=${JSON.stringify(token)},te=new TextEncoder(),hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function keys(email,pw){const salt=await crypto.subtle.digest("SHA-256",te.encode("pitlanehq-account-v1:"+email));const k=await crypto.subtle.importKey("raw",te.encode(pw),"PBKDF2",false,["deriveBits"]);
 const master=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:600000},k,256);const hk=await crypto.subtle.importKey("raw",master,"HKDF",false,["deriveBits"]);
 const d=info=>crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:new Uint8Array(0),info:te.encode(info)},hk,256);return{auth:hex(await d("pitlanehq auth")),wrap:await d("pitlanehq wrap")}}
async function seal(wrap,plain){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await crypto.subtle.importKey("raw",wrap,"AES-GCM",false,["encrypt"]);
 const c=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:te.encode("pitlanehq-v1")},key,plain));const o=new Uint8Array(12+c.length);o.set(iv);o.set(c,12);let b="";o.forEach(x=>b+=String.fromCharCode(x));return btoa(b)}
document.getElementById("f").onsubmit=async e=>{e.preventDefault();const m=document.getElementById("m"),pw=document.getElementById("p").value;m.className="err";
 if(pw.length<10){m.textContent=${JSON.stringify(S.short[l])};return}if(pw!==document.getElementById("p2").value){m.textContent=${JSON.stringify(S.mismatch[l])};return}
 m.className="";m.textContent=${JSON.stringify(S.working[l])};
 try{const email=document.getElementById("e").value.trim().toLowerCase(),k=await keys(email,pw),wrappedKey=await seal(k.wrap,crypto.getRandomValues(new Uint8Array(32)));
  const r=await fetch("/account/reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:T,email,auth:k.auth,wrappedKey})});const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||("HTTP "+r.status));m.className="ok";m.textContent=${JSON.stringify(S.done[l])};document.querySelector("button").disabled=true}catch(x){m.className="err";m.textContent=x.message}}`
  );
}
__name(resetPage, "resetPage");

// src/patreon.js
function md5(bytes) {
  const K = new Uint32Array(64), S3 = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  const n = bytes.length, len = (n + 8 >> 6) * 64 + 64, m = new Uint8Array(len);
  m.set(bytes);
  m[n] = 128;
  const bits = n * 8;
  for (let i = 0; i < 8; i++) m[len - 8 + i] = i < 4 ? bits >>> 8 * i & 255 : Math.floor(bits / 2 ** (8 * i)) & 255;
  let a0 = 1732584193, b0 = 4023233417, c0 = 2562383102, d0 = 271733878;
  const w = new Uint32Array(16);
  for (let o = 0; o < len; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = m[o + 4 * i] | m[o + 4 * i + 1] << 8 | m[o + 4 * i + 2] << 16 | m[o + 4 * i + 3] << 24;
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) {
        f = b & c | ~b & d;
        g = i;
      } else if (i < 32) {
        f = d & b | ~d & c;
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = 7 * i % 16;
      }
      const t = d;
      d = c;
      c = b;
      const x = a + f + K[i] + w[g] >>> 0, s = S3[(i >> 4) * 4 + i % 4];
      b = b + (x << s | x >>> 32 - s) >>> 0;
      a = t;
    }
    a0 = a0 + a >>> 0;
    b0 = b0 + b >>> 0;
    c0 = c0 + c >>> 0;
    d0 = d0 + d >>> 0;
  }
  const out = new Uint8Array(16);
  [a0, b0, c0, d0].forEach((v, i) => {
    for (let k = 0; k < 4; k++) out[4 * i + k] = v >>> 8 * k & 255;
  });
  return out;
}
__name(md5, "md5");
function hmacMd5Hex(key2, msg) {
  const enc2 = new TextEncoder();
  let k = enc2.encode(key2);
  if (k.length > 64) k = md5(k);
  const kp = new Uint8Array(64);
  kp.set(k);
  const ip = kp.map((x) => x ^ 54), op = kp.map((x) => x ^ 92), m = enc2.encode(msg);
  const inner = new Uint8Array(64 + m.length);
  inner.set(ip);
  inner.set(m, 64);
  const outer = new Uint8Array(80);
  outer.set(op);
  outer.set(md5(inner), 64);
  return [...md5(outer)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(hmacMd5Hex, "hmacMd5Hex");
var same = /* @__PURE__ */ __name((a, b) => {
  if (a.length !== b.length) return false;
  let r4 = 0;
  for (let i = 0; i < a.length; i++) r4 |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r4 === 0;
}, "same");
async function patreonWebhook(req, env) {
  const json16 = /* @__PURE__ */ __name((o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } }), "json");
  if (!env.PATREON_WEBHOOK_SECRET) return json16({ error: "Patreon is not set up on this server" }, 404);
  const body = await req.text();
  if (body.length > 2e5) return json16({ error: "too large" }, 413);
  const sig = (req.headers.get("x-patreon-signature") || "").toLowerCase();
  if (!sig || !same(sig, hmacMd5Hex(env.PATREON_WEBHOOK_SECRET, body))) return json16({ error: "bad signature" }, 401);
  let j = null;
  try {
    j = JSON.parse(body);
  } catch (e) {
    return json16({ error: "not JSON" }, 400);
  }
  const ev = req.headers.get("x-patreon-event") || "";
  const at2 = j && j.data && j.data.attributes || {};
  const email = String(at2.email || "").trim().toLowerCase();
  if (!email) return json16({ ok: true, skipped: "no email" });
  const active = !/delete/.test(ev) && at2.patron_status === "active_patron";
  const eh = await emailHash(env, email), now = Date.now();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO patreon_patrons (email_hash, active, updated) VALUES (?1,?2,?3) ON CONFLICT(email_hash) DO UPDATE SET active=excluded.active, updated=excluded.updated").bind(eh, active ? 1 : 0, now),
    active ? env.DB.prepare("UPDATE accounts SET supporter=1, supporter_src=COALESCE(supporter_src,'patreon') WHERE email_hash=?1").bind(eh) : env.DB.prepare("UPDATE accounts SET supporter=0, supporter_src=NULL WHERE email_hash=?1 AND supporter_src='patreon'").bind(eh)
  ]);
  return json16({ ok: true, active });
}
__name(patreonWebhook, "patreonWebhook");
async function patreonOnRegister(env, id2, eh) {
  const p = await env.DB.prepare("SELECT active FROM patreon_patrons WHERE email_hash=?1").bind(eh).first().catch(() => null);
  if (p && p.active) await env.DB.prepare("UPDATE accounts SET supporter=1, supporter_src='patreon' WHERE id=?1").bind(id2).run();
}
__name(patreonOnRegister, "patreonOnRegister");

// ../license_plans.json
var license_plans_default = {
  _help: "Pitlane HQ Pro. The admin page switches Pro on when the beta ends (until then everything is free). The lifetime offer: its price during the beta and after, and the checkout link of its product (buy: a Stripe Payment Link, https://buy.stripe.com/...). Stripe charges (Managed Payments); the server hears of each purchase through POST /stripe/webhook (secret STRIPE_WEBHOOK_SECRET). Lemon Squeezy (LEMONSQUEEZY_WEBHOOK_SECRET) still works for what was bought there.",
  enforce: false,
  provider: "stripe",
  customUrl: "",
  storeUrl: "https://pitlanehq.lemonsqueezy.com",
  trialDays: 14,
  graceDays: 0,
  plans: [
    {
      id: "free",
      name: [
        "Free",
        "Gratis"
      ],
      price: [
        "\u20AC0",
        "0 \u20AC"
      ],
      features: [
        [
          "Live dashboard and overlays",
          "Panel en vivo y overlays"
        ],
        [
          "Calendar and series",
          "Calendario y series"
        ],
        [
          "Phone as a second screen",
          "M\xF3vil como segunda pantalla"
        ]
      ]
    },
    {
      id: "monthly",
      name: [
        "Pro monthly",
        "Pro mensual"
      ],
      price: [
        "\u20AC4.99 / month",
        "4,99 \u20AC / mes"
      ],
      buy: "https://pitlanehq.lemonsqueezy.com/checkout/buy/MONTHLY",
      features: [
        [
          "Everything in Free",
          "Todo lo de Gratis"
        ],
        [
          "Race analysis and braking coach",
          "An\xE1lisis de carrera y coach de frenada"
        ],
        [
          "Your laps on the web and the phone",
          "Tus vueltas en la web y el m\xF3vil"
        ],
        [
          "Discord bot: coach, compare, your server's ranking and alerts",
          "Bot de Discord: coach, comparar, ranking de tu servidor y alertas"
        ]
      ]
    },
    {
      id: "yearly",
      name: [
        "Pro yearly",
        "Pro anual"
      ],
      price: [
        "\u20AC39.99 / year",
        "39,99 \u20AC / a\xF1o"
      ],
      buy: "https://pitlanehq.lemonsqueezy.com/checkout/buy/YEARLY",
      features: [
        [
          "Everything in Pro",
          "Todo lo de Pro"
        ],
        [
          "2 months free",
          "2 meses gratis"
        ]
      ]
    },
    {
      id: "lifetime",
      name: [
        "Lifetime",
        "De por vida"
      ],
      price: [
        "\u20AC99 once",
        "99 \u20AC una vez"
      ],
      buy: "https://pitlanehq.lemonsqueezy.com/checkout/buy/LIFETIME",
      features: [
        [
          "Everything in Pro, forever",
          "Todo lo de Pro, para siempre"
        ],
        [
          "All future updates",
          "Todas las actualizaciones futuras"
        ]
      ]
    }
  ],
  variantPlans: {
    month: "monthly",
    year: "yearly",
    annual: "yearly",
    lifetime: "lifetime"
  },
  proViews: [
    "races",
    "tracks",
    "coach",
    "cars"
  ],
  proFeatures: [
    "cloud",
    "discord",
    "shiftBeep",
    "brakeMarkers"
  ],
  discordPro: [],
  lifetime: {
    beta: 12,
    full: 24,
    currency: "EUR",
    buy: ""
  },
  freeApps: 3,
  donate: {
    _help: "The Support button beside Patreon: buy is the Stripe Payment Link (customer chooses the amount), link its id (plink_...). A donation gives the Supporter badge, never Pro.",
    buy: "https://buy.stripe.com/fZu00beDP64g0fK5LKcwg01",
    link: "plink_1UX1wZ0v1vN4NxKYN7Dn0YeK"
  }
};

// src/prostore.js
async function setPro(env, { accountId, eh, kind, until, on, order: order2 }) {
  const now = Date.now();
  if (!accountId && eh) {
    const a = await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first().catch(() => null);
    if (a) accountId = a.id;
  }
  if (order2) await env.DB.prepare("INSERT INTO pro_orders (id, account_id, email_hash, kind, status, until, at) VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET account_id=COALESCE(excluded.account_id, pro_orders.account_id), status=excluded.status, until=excluded.until, at=excluded.at").bind(order2, accountId || null, eh || null, kind, on ? "on" : "off", until || 0, now).run();
  if (!accountId) return false;
  if (on) await env.DB.prepare("UPDATE accounts SET pro=1, pro_src=?2, pro_until=?3, pro_since=CASE WHEN pro_since>0 THEN pro_since ELSE ?4 END WHERE id=?1 AND NOT (pro=1 AND pro_src='lifetime' AND ?2<>'lifetime')").bind(accountId, kind, until || 0, now).run();
  else await env.DB.prepare("UPDATE accounts SET pro=0, pro_src=NULL, pro_until=0 WHERE id=?1 AND pro_src=?2").bind(accountId, kind).run();
  return true;
}
__name(setPro, "setPro");

// src/lemon.js
var JSONH = { "content-type": "application/json", "access-control-allow-origin": "*" };
var json3 = /* @__PURE__ */ __name((o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: JSONH }), "json");
var err2 = /* @__PURE__ */ __name((e, s = 400) => json3({ error: e }, s), "err");
var gateAt = 0;
var gateOn = false;
async function proGate(env) {
  if (Date.now() - gateAt < 6e4) return gateOn;
  const r4 = await env.DB.prepare("SELECT v FROM app_state WHERE k='pro_gate'").first().catch(() => null);
  gateOn = !!(r4 && r4.v === "1");
  gateAt = Date.now();
  return gateOn;
}
__name(proGate, "proGate");
function proOf(a) {
  const on = !!(a && a.pro) && (!a.pro_until || a.pro_until > Date.now());
  return { pro: on, proSrc: on ? a.pro_src || "" : "", proUntil: on ? a.pro_until || 0 : 0 };
}
__name(proOf, "proOf");
async function proOffer(env) {
  const gate = await proGate(env), L = license_plans_default.lifetime || {};
  return { gate, beta: !gate, freeApps: license_plans_default.freeApps || 3, lifetime: { price: gate ? L.full : L.beta, full: L.full, beta: L.beta, currency: L.currency || "EUR", buy: L.buy || "" }, donate: license_plans_default.donate && license_plans_default.donate.buy || "" };
}
__name(proOffer, "proOffer");
async function hmacHex(secret, body) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)));
  return [...s].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex, "hmacHex");
var same2 = /* @__PURE__ */ __name((a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}, "same");
async function lemonWebhook(req, env) {
  if (!env.LEMONSQUEEZY_WEBHOOK_SECRET) return err2("Lemon Squeezy is not set up on this server", 404);
  const body = await req.text();
  if (body.length > 3e5) return err2("too large", 413);
  const sig = (req.headers.get("x-signature") || "").toLowerCase();
  if (!sig || !same2(sig, await hmacHex(env.LEMONSQUEEZY_WEBHOOK_SECRET, body))) return err2("bad signature", 401);
  let j;
  try {
    j = JSON.parse(body);
  } catch (e) {
    return err2("not JSON");
  }
  const ev = j.meta && j.meta.event_name || "", custom = j.meta && j.meta.custom_data || {}, d = j.data || {}, at2 = d.attributes || {};
  const email = String(at2.user_email || "").trim().toLowerCase();
  const eh = email ? await emailHash(env, email) : null;
  let accountId = /^[\w-]{6,80}$/.test(String(custom.account || "")) ? String(custom.account) : null;
  if (accountId) {
    const a = await env.DB.prepare("SELECT id FROM accounts WHERE id=?1").bind(accountId).first().catch(() => null);
    if (!a) accountId = null;
  }
  const t = /* @__PURE__ */ __name((v) => v ? Date.parse(v) || 0 : 0, "t");
  if (ev === "order_created" || ev === "order_refunded") {
    const items = at2.first_order_item || {}, isSub = !!(custom.kind === "subscription" || /month|year|mes|año|anual/i.test(String(items.variant_name || "")));
    if (isSub) return json3({ ok: true, skipped: "subscription order" });
    const paid = ev === "order_created" && at2.status === "paid" && !at2.refunded;
    await setPro(env, { accountId, eh, kind: "lifetime", until: 0, on: paid, order: "order:" + d.id });
    return json3({ ok: true, lifetime: paid });
  }
  if (/^subscription_/.test(ev)) {
    const live2 = ["active", "on_trial", "past_due", "cancelled"].includes(at2.status);
    const until = at2.status === "cancelled" ? t(at2.ends_at) : t(at2.renews_at) + 3 * 864e5;
    await setPro(env, { accountId, eh, kind: "subscription", until, on: live2 && until > Date.now(), order: "sub:" + d.id });
    return json3({ ok: true, subscription: live2 });
  }
  return json3({ ok: true, skipped: ev });
}
__name(lemonWebhook, "lemonWebhook");
async function proOnRegister(env, id2, eh) {
  const d = await env.DB.prepare("SELECT 1 AS y FROM pro_orders WHERE email_hash=?1 AND kind='supporter' AND status='on' LIMIT 1").bind(eh).first().catch(() => null);
  if (d) await env.DB.prepare("UPDATE accounts SET supporter=1, supporter_src=COALESCE(supporter_src,'stripe') WHERE id=?1").bind(id2).run();
  const o = await env.DB.prepare("SELECT kind, until FROM pro_orders WHERE email_hash=?1 AND status='on' AND kind<>'supporter' ORDER BY (kind='lifetime') DESC, until DESC LIMIT 1").bind(eh).first().catch(() => null);
  if (o && (!o.until || o.until > Date.now())) await env.DB.prepare("UPDATE accounts SET pro=1, pro_src=?2, pro_until=?3, pro_since=?4 WHERE id=?1").bind(id2, o.kind, o.until || 0, Date.now()).run();
}
__name(proOnRegister, "proOnRegister");
var pcOf = /* @__PURE__ */ __name((q2) => /^[0-9a-f]{32}$/.test(q2.get("pc") || "") ? q2.get("pc") : "", "pcOf");
var pcNameOf = /* @__PURE__ */ __name((q2) => String(q2.get("pcname") || "").replace(/[^\w .-]/g, "").slice(0, 40), "pcNameOf");
async function proHere(env, acc, q2) {
  const pc = pcOf(q2);
  if (!pc || !proOf(acc).pro) return {};
  if (!acc.pro_pc) {
    await env.DB.prepare("UPDATE accounts SET pro_pc=?2, pro_pc_name=?3, pro_pc_at=?4 WHERE id=?1 AND pro_pc IS NULL").bind(acc.id, pc, pcNameOf(q2), Date.now()).run();
    return { pcOk: true };
  }
  return acc.pro_pc === pc ? { pcOk: true } : { pcOk: false, pcName: acc.pro_pc_name || "" };
}
__name(proHere, "proHere");
async function proRoutes(req, env, p, m, body) {
  if (p === "/pro" && m === "GET") {
    const acc2 = await sessionAccount(req, env).catch(() => null);
    const q2 = new URL(req.url).searchParams, out = { ...await proOffer(env), ...acc2 ? proOf(acc2) : {}, admin: !!(acc2 && isAdmin(env, acc2.id)) };
    if (acc2) Object.assign(out, await proHere(env, acc2, q2));
    return json3(out);
  }
  if (p === "/pro/pc" && m === "POST") {
    const acc2 = await sessionAccount(req, env);
    if (!acc2) return err2("sign in", 401);
    const q2 = new URL(req.url).searchParams, pc = pcOf(q2);
    if (!pc) return err2("only the Pitlane HQ Agent on a PC can do this");
    if (!proOf(acc2).pro) return err2("this account has no Pro", 403);
    await env.DB.prepare("UPDATE accounts SET pro_pc=?2, pro_pc_name=?3, pro_pc_at=?4 WHERE id=?1").bind(acc2.id, pc, pcNameOf(q2), Date.now()).run();
    return json3({ ok: true, pcOk: true });
  }
  if (p !== "/admin/pro" && p !== "/admin/pro-user") return null;
  const acc = await sessionAccount(req, env);
  if (!acc || !isAdmin(env, acc.id)) return err2("only the admins of this server can do this", 403);
  if (p === "/admin/pro" && m === "POST") {
    await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('pro_gate', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(body.gate ? "1" : "0", Date.now()).run();
    gateAt = 0;
  }
  if (p === "/admin/pro-user" && m === "POST") {
    const id2 = String(body.id || "");
    const r4 = body.on ? await env.DB.prepare("UPDATE accounts SET pro=1, pro_src='manual', pro_until=0, pro_since=CASE WHEN pro_since>0 THEN pro_since ELSE ?2 END WHERE id=?1").bind(id2, Date.now()).run() : await env.DB.prepare("UPDATE accounts SET pro=0, pro_src=NULL, pro_until=0 WHERE id=?1 AND pro_src='manual'").bind(id2).run();
    return r4.meta && r4.meta.changes ? json3({ ok: true }) : err2("account not found, or its Pro was bought (only a Pro given by hand is taken away here)", 404);
  }
  const c = await env.DB.prepare("SELECT COUNT(*) AS n, SUM(pro_src='lifetime') AS life, SUM(pro_src='subscription') AS sub, SUM(pro_src='manual') AS man FROM accounts WHERE pro=1 AND (pro_until=0 OR pro_until>?1)").bind(Date.now()).first().catch(() => ({}));
  const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM pro_orders WHERE account_id IS NULL AND status='on' AND kind<>'supporter'").first().catch(() => ({ n: 0 }));
  return json3({
    ...await proOffer(env),
    counts: { pro: c.n || 0, lifetime: c.life || 0, subscription: c.sub || 0, manual: c.man || 0, waiting: waiting.n || 0 },
    store: license_plans_default.provider === "stripe" ? { provider: "stripe", webhook: !!env.STRIPE_WEBHOOK_SECRET, secret: "STRIPE_WEBHOOK_SECRET", checkout: !!(license_plans_default.lifetime && license_plans_default.lifetime.buy), url: "https://pitlanehq.app/stripe/webhook" } : { provider: "lemonsqueezy", webhook: !!env.LEMONSQUEEZY_WEBHOOK_SECRET, secret: "LEMONSQUEEZY_WEBHOOK_SECRET", checkout: !!(license_plans_default.lifetime && license_plans_default.lifetime.buy), url: "https://pitlanehq.app/lemonsqueezy/webhook" }
  });
}
__name(proRoutes, "proRoutes");

// src/steam.js
var SITE2 = "https://pitlanehq.app";
var OPENID = "https://steamcommunity.com/openid/login";
var NS = "http://specs.openid.net/auth/2.0";
var JSONH2 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
var json4 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH2 }), "json");
var hex = /* @__PURE__ */ __name((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""), "hex");
var rid = /* @__PURE__ */ __name((n = 24) => hex(crypto.getRandomValues(new Uint8Array(n))), "rid");
var isHex48 = /* @__PURE__ */ __name((v) => typeof v === "string" && /^[0-9a-f]{48}$/.test(v), "isHex48");
var portOf = /* @__PURE__ */ __name((v) => Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) < 65536 ? Number(v) : null, "portOf");
var appOf = /* @__PURE__ */ __name((v) => v === 1 || v === true || v === "1", "appOf");
var site = /* @__PURE__ */ __name((env, url) => env.LOCAL === "1" ? url.origin : SITE2, "site");
var returnTo = /* @__PURE__ */ __name((base2, state) => base2 + "/steam/return?state=" + state, "returnTo");
function openidAnswer(params, ours) {
  const g = /* @__PURE__ */ __name((k) => (typeof params.get === "function" ? params.get(k) : params[k]) || "", "g");
  if (g("openid.ns") !== NS || g("openid.mode") !== "id_res") return null;
  const m = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(g("openid.claimed_id"));
  if (!m || g("openid.identity") !== g("openid.claimed_id")) return null;
  if (g("openid.op_endpoint") !== OPENID || g("openid.return_to") !== ours) return null;
  if (!g("openid.sig") || !g("openid.assoc_handle") || !g("openid.response_nonce")) return null;
  const signed2 = g("openid.signed").split(",").filter(Boolean);
  for (const k of ["claimed_id", "identity", "return_to", "response_nonce", "assoc_handle", "op_endpoint"]) if (!signed2.includes(k)) return null;
  const check = new URLSearchParams();
  const keys = typeof params.keys === "function" ? [...params.keys()] : Object.keys(params);
  for (const k of keys) if (k.startsWith("openid.")) check.set(k, g(k));
  check.set("openid.mode", "check_authentication");
  return { steamid: m[1], check };
}
__name(openidAnswer, "openidAnswer");
var openidValid = /* @__PURE__ */ __name((text2) => String(text2 || "").split("\n").some((l) => l.trim() === "is_valid:true"), "openidValid");
async function personaOf(env, steamid) {
  if (!env.STEAM_WEB_API_KEY) return null;
  try {
    const r4 = await fetch("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?" + new URLSearchParams({ key: env.STEAM_WEB_API_KEY, steamids: steamid }));
    const j = r4.ok ? await r4.json() : null;
    const p = j && j.response && j.response.players && j.response.players[0];
    return p && cleanName(p.personaname) || null;
  } catch (e) {
    return null;
  }
}
__name(personaOf, "personaOf");
async function nameLink(env, steamid, persona) {
  if (!steamid) return null;
  if (persona === void 0) persona = await personaOf(env, steamid);
  if (!persona) return null;
  await env.DB.prepare("UPDATE steam_links SET persona=?2 WHERE steamid=?1 AND COALESCE(persona,'')<>?2").bind(steamid, persona).run().catch(() => {
  });
  return persona;
}
__name(nameLink, "nameLink");
async function steamStart(env, url, kind, accountId, device, port, app) {
  if (portOf(port) && appOf(app)) return { error: "port or app, not both" };
  const state = rid(), code = rid(), now = Date.now(), base2 = site(env, url);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM steam_oauth WHERE expires<?1 OR (account_id IS NOT NULL AND account_id=?2)").bind(now, accountId || ""),
    env.DB.prepare("INSERT INTO steam_oauth (state_hash, code_hash, account_id, device, kind, port, app, expires) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)").bind(await sha256("steam-oauth:" + state), await sha256("steam-code:" + code), accountId || null, cleanName(device) || null, kind, portOf(port), appOf(app) ? 1 : 0, now + 10 * 6e4)
  ]);
  const q2 = new URLSearchParams({ "openid.ns": NS, "openid.mode": "checkid_setup", "openid.identity": NS + "/identifier_select", "openid.claimed_id": NS + "/identifier_select", "openid.return_to": returnTo(base2, state), "openid.realm": base2 });
  return { url: OPENID + "?" + q2, state, code };
}
__name(steamStart, "steamStart");
async function linkSteam(env, steamid, accountId, persona) {
  const other = await env.DB.prepare("SELECT account_id, shown FROM steam_links WHERE steamid=?1").bind(steamid).first();
  if (other && other.account_id !== accountId) return "taken";
  await env.DB.batch([
    env.DB.prepare("DELETE FROM steam_links WHERE steamid=?1 OR account_id=?2").bind(steamid, accountId),
    env.DB.prepare("INSERT INTO steam_links (steamid, account_id, persona, created, shown) VALUES (?1,?2,?3,?4,?5)").bind(steamid, accountId, persona || null, Date.now(), other && other.shown ? 1 : 0)
  ]);
  return "ok";
}
__name(linkSteam, "linkSteam");
async function newGrant(env, kind, st, steamid, persona, ttl) {
  const g = rid();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM steam_grants WHERE expires<?1").bind(Date.now()),
    env.DB.prepare("INSERT INTO steam_grants (grant_hash, code_hash, account_id, steamid, persona, device, kind, expires) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)").bind(await sha256("steam-grant:" + g), st.code_hash, st.account_id || null, steamid, persona, st.device, kind, Date.now() + ttl)
  ]);
  return g;
}
__name(newGrant, "newGrant");
async function useSteamGrant(env, g, kind, code) {
  if (!isHex48(g) || !isHex48(code)) return null;
  const r4 = await env.DB.prepare("DELETE FROM steam_grants WHERE grant_hash=?1 AND kind=?2 RETURNING code_hash, account_id, steamid, persona, device, expires").bind(await sha256("steam-grant:" + g), kind).first();
  return r4 && r4.expires >= Date.now() && r4.code_hash === await sha256("steam-code:" + code) ? r4 : null;
}
__name(useSteamGrant, "useSteamGrant");
var steamAccountId = /* @__PURE__ */ __name(async (env, steamid) => (await env.DB.prepare("SELECT account_id FROM steam_links WHERE steamid=?1").bind(steamid).first() || {}).account_id || null, "steamAccountId");
function goOn(base2, prov, st, state, q2) {
  if (!st) return Response.redirect(base2 + "/?" + q2, 302);
  if (st.port) return Response.redirect("http://127.0.0.1:" + st.port + "/" + prov + "/done?state=" + state + "&" + q2, 302);
  if (st.app) return new Response(null, { status: 302, headers: { location: "pitlanehq://" + prov + "?state=" + state + "&" + q2, "cache-control": "no-store" } });
  return Response.redirect(base2 + "/?state=" + state + "&" + q2, 302);
}
__name(goOn, "goOn");
async function steamReturn(req, env, url) {
  const base2 = site(env, url);
  const state = url.searchParams.get("state") || "";
  if (!isHex48(state)) return Response.redirect(base2 + "/?steamLogin=0", 302);
  const st = await env.DB.prepare("DELETE FROM steam_oauth WHERE state_hash=?1 RETURNING code_hash, account_id, device, kind, port, app, expires").bind(await sha256("steam-oauth:" + state)).first();
  const back2 = /* @__PURE__ */ __name((q2) => goOn(base2, "steam", st, state, q2), "back");
  const fail2 = /* @__PURE__ */ __name(() => back2(st && st.kind === "link" ? "steamLinked=0" : "steamLogin=0"), "fail");
  if (!st || st.expires < Date.now()) return fail2();
  try {
    return await steamAnswer(env, url, base2, state, st, back2, fail2);
  } catch (e) {
    return fail2();
  }
}
__name(steamReturn, "steamReturn");
async function steamAnswer(env, url, base2, state, st, back2, fail2) {
  const ans = openidAnswer(url.searchParams, returnTo(base2, state));
  if (!ans) return fail2();
  try {
    const r4 = await fetch(OPENID, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: ans.check });
    if (!r4.ok || !openidValid(await r4.text())) return fail2();
  } catch (e) {
    return fail2();
  }
  const persona = await personaOf(env, ans.steamid);
  if (st.kind === "link") {
    if (!st.account_id) return fail2();
    return back2("steamLink=" + await newGrant(env, "link", st, ans.steamid, persona, 5 * 6e4));
  }
  if (await steamAccountId(env, ans.steamid)) {
    await nameLink(env, ans.steamid, persona);
    return back2("steamLogin=" + await newGrant(env, "login", st, ans.steamid, persona, 5 * 6e4));
  }
  const q2 = new URLSearchParams({ steamLogin: "0", new: "1", sid: await newGrant(env, "signup", st, ans.steamid, persona, 30 * 6e4) });
  if (persona) q2.set("persona", persona);
  return back2(String(q2));
}
__name(steamAnswer, "steamAnswer");
async function steamAccount(env, a, p, m, body, url, passCheck) {
  if (p === "/steam" && m === "GET") {
    const l = await env.DB.prepare("SELECT steamid, persona, shown FROM steam_links WHERE account_id=?1").bind(a.id).first();
    if (l && !l.persona) l.persona = await nameLink(env, l.steamid);
    return json4({ linked: !!l, id: l ? l.steamid : void 0, persona: l ? l.persona || "" : void 0, shown: !!(l && l.shown) });
  }
  if (p === "/steam/start" && m === "POST") {
    const no = await passCheck();
    if (no) return no;
    const r4 = await steamStart(env, url, "link", a.id, body.device, body.port, body.app || url.searchParams.get("app"));
    return json4(r4, r4.error ? 400 : 200);
  }
  if (p === "/steam/link" && m === "POST") {
    const g = await useSteamGrant(env, body.grant, "link", body.code);
    if (!g || g.account_id !== a.id) return json4({ error: "this Steam sign-in is not valid any more, sign in with Steam again" }, 400);
    const res = await linkSteam(env, g.steamid, a.id, g.persona);
    if (res === "taken") return json4({ error: "this Steam account is already linked to another account", code: "taken" }, 409);
    return json4({ ok: true, persona: g.persona || "" });
  }
  if (p === "/steam/shown" && m === "POST") {
    await env.DB.prepare("UPDATE steam_links SET shown=?2 WHERE account_id=?1").bind(a.id, body.shown ? 1 : 0).run();
    return json4({ ok: true, shown: !!body.shown });
  }
  if (p === "/steam/unlink" && m === "POST") {
    const no = await passCheck();
    if (no) return no;
    await env.DB.prepare("DELETE FROM steam_links WHERE account_id=?1").bind(a.id).run();
    return json4({ ok: true });
  }
  return json4({ error: "not found" }, 404);
}
__name(steamAccount, "steamAccount");

// src/discord.js
var SITE3 = "https://pitlanehq.app";
var API = "https://discord.com/api/v10";
var AMBER = 16756782;
var PURPLE = 11104511;
var EPHEMERAL = 64;
var MANAGE_GUILD = 0x20n;
var PRO = new Set(license_plans_default.discordPro || []);
var PUBLIC_CMDS = /* @__PURE__ */ new Set(["record", "driver", "download", "coach", "compare", "board", "track"]);
var fmt = /* @__PURE__ */ __name((t) => {
  if (!(t > 0)) return "\u2013";
  const m = Math.floor(t / 60), s = t - m * 60;
  return (m ? m + ":" + (s < 10 ? "0" : "") : "") + s.toFixed(3);
}, "fmt");
var gap = /* @__PURE__ */ __name((d) => (d < 0 ? "\u2212" : "+") + Math.abs(d).toFixed(3), "gap");
var fix = /* @__PURE__ */ __name((s) => {
  s = String(s || "");
  if (!/[ÃÂ]/.test(s)) return s;
  try {
    return decodeURIComponent(escape(s));
  } catch (e) {
    return s;
  }
}, "fix");
var slug = /* @__PURE__ */ __name((s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80), "slug");
var PRE = { en: "", es: "/es", pt: "/pt" };
var recUrl = /* @__PURE__ */ __name((l, x) => `${SITE3}${PRE[l]}/records/${x.t}-${x.c}/${slug(fix(x.track) + " " + fix(x.car))}`, "recUrl");
var md = /* @__PURE__ */ __name((s) => String(s || "").replace(/[\\*_~`|[\]]/g, (c) => "\\" + c), "md");
var CAT = {
  en: { oval: "Oval", sports_car: "Sports Car", formula_car: "Formula Car", dirt_oval: "Dirt Oval", dirt_road: "Dirt Road" },
  es: { oval: "\xD3valo", sports_car: "Sports Car", formula_car: "F\xF3rmula", dirt_oval: "\xD3valo de tierra", dirt_road: "Tierra" },
  pt: { oval: "Oval", sports_car: "Sports Car", formula_car: "F\xF3rmula", dirt_oval: "Oval de terra", dirt_road: "Terra" }
};
var langOf = /* @__PURE__ */ __name((loc) => {
  const s = String(loc || "");
  return s.startsWith("es") ? "es" : s.startsWith("pt") ? "pt" : "en";
}, "langOf");
var LANGS = ["en", "es", "pt"];
var tr = /* @__PURE__ */ __name((l, en, es, pt) => l === "es" ? es : l === "pt" ? pt : en, "tr");
var anonName = /* @__PURE__ */ __name((l) => tr(l, "Anonymous", "An\xF3nimo", "An\xF4nimo"), "anonName");
var SHOWN = "CASE WHEN l.anon=1 OR COALESCE(ac.anon,0)=1 OR u.alias='Anonymous' THEN '' ELSE u.alias END";
var NOT_MODEL = "COALESCE(l.shown,'')<>'model'";
var reply = /* @__PURE__ */ __name((o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } }), "reply");
var answer = /* @__PURE__ */ __name((data, eph) => ({ allowed_mentions: { parse: [] }, ...data, ...eph ? { flags: EPHEMERAL } : {} }), "answer");
var say = /* @__PURE__ */ __name((data, eph) => reply({ type: 4, data: answer(data, eph) }), "say");
var text = /* @__PURE__ */ __name((content, eph = true) => say({ content }, eph), "text");
var button = /* @__PURE__ */ __name((label, url) => ({ type: 2, style: 5, label: label.slice(0, 80), url }), "button");
var buttons = /* @__PURE__ */ __name((...b) => [{ type: 1, components: b.filter(Boolean) }], "buttons");
var unhex = /* @__PURE__ */ __name((h) => new Uint8Array((String(h).match(/../g) || []).map((x) => parseInt(x, 16))), "unhex");
async function signed(req, env, body) {
  const sig = req.headers.get("x-signature-ed25519") || "", ts = req.headers.get("x-signature-timestamp") || "";
  if (!env.DISCORD_PUBLIC_KEY || !/^[0-9a-f]{128}$/i.test(sig) || !/^\d{1,16}$/.test(ts)) return false;
  try {
    const key2 = await crypto.subtle.importKey("raw", unhex(env.DISCORD_PUBLIC_KEY.trim()), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key2, unhex(sig), new TextEncoder().encode(ts + body));
  } catch (e) {
    return false;
  }
}
__name(signed, "signed");
async function isPro() {
  return true;
}
__name(isPro, "isPro");
async function discordInteraction(req, env, ctx) {
  if (req.method !== "POST") return new Response("not found", { status: 404 });
  const body = await req.text();
  if (body.length > 2e5 || !await signed(req, env, body)) return new Response("bad signature", { status: 401 });
  const it = JSON.parse(body);
  if (it.type === 1) return reply({ type: 1 });
  if (it.type === 4) return reply({ type: 8, data: { choices: await suggest(env, it).catch(() => []) } });
  const user = it.member && it.member.user || it.user || {};
  const me2 = user.id ? await env.DB.prepare("SELECT (SELECT account_id FROM discord_links WHERE discord_id=?1) AS account, (SELECT lang FROM discord_users WHERE discord_id=?1) AS lang, (SELECT cmd_channels FROM discord_guilds WHERE guild_id=?2) AS chans").bind(user.id, it.guild_id || "").first() : null;
  const l = LANGS.includes(me2 && me2.lang) ? me2.lang : langOf(it.locale);
  if (it.type !== 2 && it.type !== 3 || !it.data) return text(tr(l, "Unknown action", "Acci\xF3n desconocida", "A\xE7\xE3o desconhecida"));
  const x = { env, ctx, it, l, user, account: me2 && me2.account || null, guild: it.guild_id || null, opt: {} };
  if (it.type === 3) {
    try {
      return await panelAction(x);
    } catch (e) {
      return text(tr(l, "Something went wrong, try again in a moment.", "Algo ha fallado, prueba otra vez en un momento.", "Algo deu errado, tente de novo em um momento."));
    }
  }
  for (const o of it.data.options || []) x.opt[o.name] = o.value;
  if (x.account && x.guild) ctx.waitUntil(env.DB.prepare("INSERT INTO discord_members (guild_id, discord_id, seen) VALUES (?1,?2,?3) ON CONFLICT(guild_id, discord_id) DO UPDATE SET seen=excluded.seen").bind(x.guild, user.id, Date.now()).run().catch(() => {
  }));
  const name2 = it.data.name;
  let chans = [];
  try {
    chans = JSON.parse(me2 && me2.chans || "[]") || [];
  } catch (e) {
  }
  if (x.guild && chans.length && PUBLIC_CMDS.has(name2) && !chans.includes(it.channel_id) && !chans.includes(it.channel && it.channel.parent_id))
    return text(tr(l, "In this server the bot answers in ", "En este servidor el bot responde en ", "Neste servidor o bot responde em ") + chans.map((c) => `<#${c}>`).join(" ") + ".");
  if (PRO.has(name2) && !await isPro(env, x.account)) return proOnly(x);
  const run = { record, driver, link: linkStart, unlink, download, help, language, setup, coach, compare, board, alerts, recent, track, league }[name2];
  if (!run) return text(tr(l, "Unknown command", "Comando desconocido", "Comando desconhecido"));
  try {
    return await run(x);
  } catch (e) {
    return text(tr(l, "Something went wrong, try again in a moment.", "Algo ha fallado, prueba otra vez en un momento.", "Algo deu errado, tente de novo em um momento."));
  }
}
__name(discordInteraction, "discordInteraction");
function later(x, eph, work, update) {
  const send2 = /* @__PURE__ */ __name((data) => fetch(`${API}/webhooks/${x.it.application_id}/${x.it.token}/messages/@original`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(answer(data)) }), "send");
  x.ctx.waitUntil(work().catch(() => ({ content: tr(x.l, "Something went wrong, try again in a moment.", "Algo ha fallado, prueba otra vez en un momento.", "Algo deu errado, tente de novo em um momento.") })).then(send2).catch(() => {
  }));
  return reply(update ? { type: 6 } : { type: 5, data: eph ? { flags: EPHEMERAL } : {} });
}
__name(later, "later");
var needLink = /* @__PURE__ */ __name((x) => say({ content: tr(x.l, "Link your Pitlane HQ account first with /link.", "Vincula antes tu cuenta de Pitlane HQ con /link.", "Vincule antes a sua conta do Pitlane HQ com /link.") }, true), "needLink");
function proOnly(x) {
  const url = license_plans_default.storeUrl || SITE3;
  return say({
    embeds: [{
      color: PURPLE,
      title: tr(x.l, "A Pitlane HQ Pro feature", "Una funci\xF3n de Pitlane HQ Pro", "Um recurso do Pitlane HQ Pro"),
      description: x.account ? tr(x.l, "This command is part of Pitlane HQ Pro.", "Este comando es parte de Pitlane HQ Pro.", "Este comando faz parte do Pitlane HQ Pro.") : tr(x.l, "This command is part of Pitlane HQ Pro. Link your account with /link first.", "Este comando es parte de Pitlane HQ Pro. Vincula antes tu cuenta con /link.", "Este comando faz parte do Pitlane HQ Pro. Vincule antes a sua conta com /link.")
    }],
    components: buttons(button(tr(x.l, "See the plans", "Ver los planes", "Ver os planos"), url))
  }, true);
}
__name(proOnly, "proOnly");
var isAnon = /* @__PURE__ */ __name(async (env, id2) => !!(id2 && (await env.DB.prepare("SELECT anon FROM accounts WHERE id=?1").bind(id2).first() || {}).anon), "isAnon");
async function combos(env, q2, n) {
  const words = String(q2 || "").toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean).slice(0, 5);
  const squash = "replace(replace(replace(replace(lower(l.track||l.car),' ',''),'-',''),'.',''),'\xB7','')";
  const where = words.map((_, i) => `AND ${squash} LIKE ?${i + 2}`).join(" ");
  const r4 = await env.DB.prepare(
    `SELECT l.track_id AS t, MAX(l.track) AS track, l.car_id AS c, MAX(l.car) AS car, COUNT(DISTINCT l.user_id) AS drivers, MIN(l.time) AS best
       FROM community_laps l WHERE l.game='iracing' AND l.track_id>0 AND l.car_id>0 AND ${NOT_MODEL} ${where}
      GROUP BY l.track_id, l.car_id ORDER BY drivers DESC, best LIMIT ?1`
  ).bind(n, ...words.map((w) => "%" + w + "%")).all();
  return (r4.results || []).map((x) => ({ ...x, car: famName("iracing", x.c, x.car) }));
}
__name(combos, "combos");
async function comboOf(env, v) {
  const m = /^(\d+)-(\d+)$/.exec(String(v || ""));
  if (m) {
    const c = await famId(env, "iracing", m[2]);
    const r4 = await env.DB.prepare("SELECT MAX(track) AS track, MAX(car) AS car FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game='iracing'").bind(+m[1], c).first();
    if (r4 && r4.track) return { t: +m[1], c, track: r4.track, car: famName("iracing", c, r4.car) };
  }
  return (await combos(env, v, 1))[0] || null;
}
__name(comboOf, "comboOf");
var noCombo = /* @__PURE__ */ __name((x) => text(tr(x.l, "No laps on that car and track yet. Pick one from the list as you type.", "A\xFAn no hay vueltas en ese coche y circuito. Elige uno de la lista mientras escribes.", "Ainda n\xE3o h\xE1 voltas nesse carro e pista. Escolha um da lista enquanto digita.")), "noCombo");
async function driverOf(env, name2) {
  const n = String(name2 || "").trim().toLowerCase();
  if (!n) return null;
  const q2 = "SELECT a.id, a.created, a.member_since, a.supporter, a.supporter_hidden, a.anon, u.alias, u.lics FROM accounts a JOIN community_users u ON u.id=a.id WHERE a.anon=0 AND ";
  const exact = await env.DB.prepare(q2 + "lower(u.alias)=?1").bind(n).first();
  if (exact) return exact;
  const r4 = await env.DB.prepare(q2 + "lower(u.alias) LIKE ?1 LIMIT 2").bind("%" + n.replace(/[%_]/g, "") + "%").all();
  return (r4.results || []).length === 1 ? r4.results[0] : null;
}
__name(driverOf, "driverOf");
var accountOf = /* @__PURE__ */ __name((env, id2) => env.DB.prepare("SELECT a.id, a.created, a.member_since, a.supporter, a.supporter_hidden, a.anon, u.alias, u.lics FROM accounts a JOIN community_users u ON u.id=a.id WHERE a.id=?1").bind(id2).first(), "accountOf");
async function suggest(env, it) {
  const f = (it.data.options || []).find((o) => o.focused);
  if (!f) return [];
  if (f.name === "car_track") return (await combos(env, f.value, 25)).map((x) => ({ name: `${fix(x.track)} \xB7 ${fix(x.car)}`.slice(0, 100), value: `${x.t}-${x.c}` }));
  if (f.name === "track") return (await tracks(env, f.value, 25)).map((x) => ({ name: fix(x.track).slice(0, 100), value: String(x.t) }));
  if (f.name === "league") {
    const r5 = await env.DB.prepare("SELECT id, name FROM leagues WHERE lower(name) LIKE ?1 ORDER BY updated DESC LIMIT 25").bind("%" + String(f.value || "").trim().toLowerCase().replace(/[%_]/g, "") + "%").all();
    return (r5.results || []).map((x) => ({ name: fix(x.name).slice(0, 100), value: x.id }));
  }
  const n = String(f.value || "").trim().toLowerCase().replace(/[%_]/g, "");
  const r4 = await env.DB.prepare(
    `SELECT u.alias FROM accounts a JOIN community_users u ON u.id=a.id WHERE a.anon=0 AND lower(u.alias) LIKE ?1
      AND EXISTS (SELECT 1 FROM community_laps l WHERE l.user_id=a.id AND l.anon=0) ORDER BY (lower(u.alias) LIKE ?2) DESC, u.alias LIMIT 25`
  ).bind("%" + n + "%", n + "%").all();
  return (r4.results || []).map((x) => ({ name: x.alias.slice(0, 100), value: x.alias.slice(0, 100) }));
}
__name(suggest, "suggest");
async function record(x) {
  const k = await comboOf(x.env, x.opt.car_track);
  if (!k) return noCombo(x);
  const r4 = await x.env.DB.prepare(
    `SELECT l.user_id AS uid, ${SHOWN} AS alias, l.time FROM community_laps l JOIN community_users u ON u.id=l.user_id LEFT JOIN accounts ac ON ac.id=l.user_id
      WHERE l.track_id=?1 AND l.car_id=?2 AND l.game='iracing' AND ${NOT_MODEL} ORDER BY l.time LIMIT 10`
  ).bind(k.t, k.c).all();
  const laps = r4.results || [];
  if (!laps.length) return noCombo(x);
  const all = (await x.env.DB.prepare(`SELECT COUNT(*) AS n FROM community_laps l WHERE l.track_id=?1 AND l.car_id=?2 AND l.game='iracing' AND ${NOT_MODEL}`).bind(k.t, k.c).first()).n;
  const medal = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  const lines = laps.map((v, i) => `${medal[i] || `\`${String(i + 1).padStart(2)}\``} \`${fmt(v.time)}\` ${i ? `\`${gap(v.time - laps[0].time)}\` ` : ""}${md(v.alias || anonName(x.l))}`);
  if (x.account && !await isAnon(x.env, x.account)) {
    const mine = await x.env.DB.prepare("SELECT time, anon FROM community_laps WHERE user_id=?1 AND track_id=?2 AND car_id=?3 AND game='iracing'").bind(x.account, k.t, k.c).first();
    if (mine && !mine.anon && !laps.some((v) => v.uid === x.account)) {
      const pos = (await x.env.DB.prepare(`SELECT COUNT(*) AS n FROM community_laps l WHERE l.track_id=?1 AND l.car_id=?2 AND l.game='iracing' AND ${NOT_MODEL} AND l.time<?3`).bind(k.t, k.c, mine.time).first()).n + 1;
      lines.push("", tr(x.l, `You: **P${pos}** \`${fmt(mine.time)}\` \`${gap(mine.time - laps[0].time)}\``, `T\xFA: **P${pos}** \`${fmt(mine.time)}\` \`${gap(mine.time - laps[0].time)}\``, `Voc\xEA: **P${pos}** \`${fmt(mine.time)}\` \`${gap(mine.time - laps[0].time)}\``));
    }
  }
  return say({
    embeds: [{
      color: AMBER,
      title: fix(k.car).slice(0, 250),
      url: recUrl(x.l, k),
      description: `**${md(fix(k.track))}**

` + lines.join("\n"),
      footer: { text: tr(x.l, `${all} drivers \xB7 one lap each, their fastest \xB7 Pitlane HQ`, `${all} pilotos \xB7 una vuelta cada uno, la m\xE1s r\xE1pida \xB7 Pitlane HQ`, `${all} pilotos \xB7 uma volta cada um, a mais r\xE1pida \xB7 Pitlane HQ`) }
    }]
  });
}
__name(record, "record");
async function driver(x) {
  let a = null, self = false;
  if (x.opt.name) a = await driverOf(x.env, x.opt.name);
  else if (x.account) {
    a = await accountOf(x.env, x.account);
    self = true;
  } else return needLink(x);
  if (!a) return text(tr(x.l, "No driver by that name (anonymous drivers have no profile).", "No hay ning\xFAn piloto con ese nombre (los pilotos an\xF3nimos no tienen perfil).", "N\xE3o h\xE1 nenhum piloto com esse nome (pilotos an\xF4nimos n\xE3o t\xEAm perfil)."));
  if (a.id === x.account) self = true;
  const eph = self && !!a.anon;
  const r4 = await x.env.DB.prepare(
    `SELECT l.track, l.car, l.time, l.created,
       (SELECT COUNT(*) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model' AND o.time<l.time)+1 AS pos,
       (SELECT COUNT(*) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model') AS total
     FROM community_laps l WHERE l.user_id=?1 AND ${NOT_MODEL} ${eph ? "" : "AND l.anon=0"} ORDER BY l.created DESC LIMIT 60`
  ).bind(a.id).all();
  const laps = r4.results || [];
  const top = laps.slice().sort((p, q2) => p.pos - q2.pos || q2.total - p.total).slice(0, 6);
  let lics = {};
  try {
    lics = JSON.parse(a.lics || "{}") || {};
  } catch (e) {
  }
  const licLine = CATS.filter((c) => licOf(lics[c])).map((c) => `${CAT[x.l][c]} **${licOf(lics[c])}**`).join(" \xB7 ");
  const sup = a.supporter === 1 && (!a.supporter_hidden || self);
  const fields = [];
  if (licLine) fields.push({ name: tr(x.l, "Licences", "Licencias", "Licen\xE7as"), value: licLine });
  const dc = !a.anon ? await x.env.DB.prepare("SELECT discord_id FROM discord_links WHERE account_id=?1 AND shown=1").bind(a.id).first() : null;
  if (dc) fields.push({ name: "Discord", value: `<@${dc.discord_id}>` });
  fields.push({ name: tr(x.l, "On the leaderboards", "En las clasificaciones", "Nos leaderboards"), value: laps.length ? top.map((v) => `**P${v.pos}**/${v.total} \`${fmt(v.time)}\` ${md(fix(v.car))} \xB7 ${md(fix(v.track))}`).join("\n").slice(0, 1024) : tr(x.l, "No laps yet", "A\xFAn sin vueltas", "Ainda sem voltas") });
  const since = new Date(a.member_since || a.created).toISOString().slice(0, 10);
  return say({
    embeds: [{
      color: AMBER,
      title: (sup ? "\u2B50 " : "") + a.alias,
      fields,
      footer: { text: tr(x.l, `${laps.length} cars and tracks \xB7 member since ${since}`, `${laps.length} coches y circuitos \xB7 miembro desde ${since}`, `${laps.length} carros e pistas \xB7 membro desde ${since}`) }
    }]
  }, eph);
}
__name(driver, "driver");
async function linkStart(x) {
  if (x.account) {
    const a = await accountOf(x.env, x.account);
    return text(tr(x.l, `Your Discord is linked to **${md(a ? a.alias : "?")}**. Use /unlink to change it.`, `Tu Discord est\xE1 vinculado a **${md(a ? a.alias : "?")}**. Usa /unlink para cambiarlo.`, `O seu Discord est\xE1 vinculado a **${md(a ? a.alias : "?")}**. Use /unlink para mudar.`));
  }
  const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => ABC[b % 32]).join("");
  const now = Date.now();
  await x.env.DB.batch([
    x.env.DB.prepare("DELETE FROM discord_codes WHERE expires<?1 OR discord_id=?2").bind(now, x.user.id),
    x.env.DB.prepare("INSERT INTO discord_codes (code_hash, discord_id, discord_name, guild_id, expires, handle) VALUES (?1,?2,?3,?4,?5,?6)").bind(await sha256("discord:" + code), x.user.id, String(x.user.global_name || x.user.username || "").slice(0, 40), x.guild, now + 10 * 6e4, String(x.user.username || "").slice(0, 40) || null)
  ]);
  return say({
    content: tr(
      x.l,
      "Open this link where you are signed in to Pitlane HQ (the web app) and confirm. It works for 10 minutes and only once.",
      "Abre este enlace donde tengas abierta tu cuenta de Pitlane HQ (la app web) y confirma. Vale 10 minutos y una sola vez.",
      "Abra este link onde a sua conta do Pitlane HQ estiver aberta (o app web) e confirme. Vale por 10 minutos e uma \xFAnica vez."
    ),
    components: buttons(button(tr(x.l, "Link my account", "Vincular mi cuenta", "Vincular minha conta"), `${SITE3}/?discord=${code}`))
  }, true);
}
__name(linkStart, "linkStart");
async function unlink(x) {
  if (!x.account) return text(tr(x.l, "Your Discord is not linked to any Pitlane HQ account.", "Tu Discord no est\xE1 vinculado a ninguna cuenta de Pitlane HQ.", "O seu Discord n\xE3o est\xE1 vinculado a nenhuma conta do Pitlane HQ."));
  await x.env.DB.batch([
    x.env.DB.prepare("DELETE FROM discord_links WHERE discord_id=?1").bind(x.user.id),
    x.env.DB.prepare("DELETE FROM discord_members WHERE discord_id=?1").bind(x.user.id)
  ]);
  return text(tr(x.l, "Unlinked. Your laps stay in your account.", "Desvinculado. Tus vueltas siguen en tu cuenta.", "Desvinculado. As suas voltas continuam na sua conta."));
}
__name(unlink, "unlink");
async function download(x) {
  let apk = null;
  try {
    const o = x.env.DL && await x.env.DL.get("phones.json");
    apk = o ? (JSON.parse(await o.text()) || {}).apk : null;
  } catch (e) {
  }
  return say({
    content: tr(x.l, "Pitlane HQ is free: Pitlane HQ for Windows records your laps, the web and the phone apps show them.", "Pitlane HQ es gratis: Pitlane HQ para Windows graba tus vueltas, la web y las apps de m\xF3vil las muestran.", "O Pitlane HQ \xE9 gr\xE1tis: o Pitlane HQ para Windows grava as suas voltas, a web e os apps de celular as mostram."),
    components: buttons(
      button(tr(x.l, "Pitlane HQ for Windows", "Pitlane HQ para Windows", "Pitlane HQ para Windows"), `${SITE3}/dl/PitlaneHQ-Setup.exe`),
      apk && button("Android", `${SITE3}/dl/${encodeURIComponent(apk)}`),
      button(tr(x.l, "Web app", "App web", "App web"), SITE3 + "/"),
      button(tr(x.l, "All downloads", "Todas las descargas", "Todos os downloads"), SITE3 + "/downloads")
    )
  });
}
__name(download, "download");
function help(x) {
  const free = tr(
    x.l,
    "`/record` the record and top 10 of a car and track\n`/driver` a driver's profile, or yours\n`/link` \xB7 `/unlink` your Pitlane HQ account\n`/recent` your last sessions\n`/track` a track's records on every car\n`/download` the apps\n`/language` the bot's language",
    "`/record` el r\xE9cord y el top 10 de un coche y circuito\n`/driver` el perfil de un piloto, o el tuyo\n`/link` \xB7 `/unlink` tu cuenta de Pitlane HQ\n`/recent` tus \xFAltimas sesiones\n`/track` los r\xE9cords de un circuito en cada coche\n`/download` las apps\n`/language` el idioma del bot",
    "`/record` o recorde e o top 10 de um carro e pista\n`/driver` o perfil de um piloto, ou o seu\n`/link` \xB7 `/unlink` a sua conta do Pitlane HQ\n`/recent` as suas \xFAltimas sess\xF5es\n`/track` os recordes de uma pista em cada carro\n`/download` os apps\n`/language` o idioma do bot"
  );
  const pro = tr(
    x.l,
    "`/coach` your best lap against the next level and the record\n`/compare` your laps against another driver's\n`/board` this server's ranking on a car and track\n`/alerts` this server's new best laps and records, posted in a channel",
    "`/coach` tu mejor vuelta contra el siguiente nivel y el r\xE9cord\n`/compare` tus vueltas contra las de otro piloto\n`/board` el ranking de este servidor en un coche y circuito\n`/alerts` las mejores vueltas y r\xE9cords de este servidor, en un canal",
    "`/coach` a sua melhor volta contra o pr\xF3ximo n\xEDvel e o recorde\n`/compare` as suas voltas contra as de outro piloto\n`/board` o ranking deste servidor em um carro e pista\n`/alerts` as melhores voltas e recordes deste servidor, em um canal"
  );
  return say({
    embeds: [{
      color: AMBER,
      title: "Pitlane HQ",
      url: SITE3,
      fields: [
        { name: tr(x.l, "Commands", "Comandos", "Comandos"), value: free + "\n" + pro },
        {
          name: tr(x.l, "For the server's managers", "Para quien gestiona el servidor", "Para quem gerencia o servidor"),
          value: tr(
            x.l,
            "`/setup` the channels the bot answers in, the channels for best laps and records, and their language\n`/league` this server's league in the leagues hub",
            "`/setup` los canales donde responde el bot, los de mejores vueltas y r\xE9cords, y su idioma\n`/league` la liga de este servidor en el hub de ligas",
            "`/setup` os canais onde o bot responde, os das melhores voltas e recordes, e o idioma deles\n`/league` a liga deste servidor no hub de ligas"
          )
        }
      ],
      footer: { text: tr(x.l, "Your laps reach the bot once Pitlane HQ for Windows records them. Everything is free while Pitlane HQ is in beta.", "Tus vueltas llegan al bot cuando Pitlane HQ para Windows las graba. Todo es gratis mientras Pitlane HQ est\xE1 en beta.", "As suas voltas chegam ao bot quando o Pitlane HQ para Windows as grava. Tudo \xE9 gr\xE1tis enquanto o Pitlane HQ est\xE1 em beta.") }
    }]
  }, true);
}
__name(help, "help");
async function language(x) {
  const v = String(x.opt.lang || "auto");
  if (LANGS.includes(v)) await x.env.DB.prepare("INSERT INTO discord_users (discord_id, lang, updated) VALUES (?1,?2,?3) ON CONFLICT(discord_id) DO UPDATE SET lang=excluded.lang, updated=excluded.updated").bind(x.user.id, v, Date.now()).run();
  else await x.env.DB.prepare("DELETE FROM discord_users WHERE discord_id=?1").bind(x.user.id).run();
  const l = LANGS.includes(v) ? v : langOf(x.it.locale);
  return text(LANGS.includes(v) ? tr(l, "Done: the bot answers you in English.", "Hecho: el bot te responde en espa\xF1ol.", "Pronto: o bot responde a voc\xEA em portugu\xEAs.") : tr(l, "Done: the bot answers you in your Discord app's language.", "Hecho: el bot te responde en el idioma de tu app de Discord.", "Pronto: o bot responde a voc\xEA no idioma do seu app do Discord."));
}
__name(language, "language");
var canManage = /* @__PURE__ */ __name((x) => {
  try {
    return !!(BigInt(x.it.member && x.it.member.permissions || "0") & MANAGE_GUILD);
  } catch (e) {
    return false;
  }
}, "canManage");
var LNAME = { en: "English", es: "Espa\xF1ol", pt: "Portugu\xEAs" };
async function guildCfg(env, guild) {
  const g = await env.DB.prepare("SELECT alerts_channel, records_channel, cmd_channels, lang FROM discord_guilds WHERE guild_id=?1").bind(guild).first();
  let cmd = [];
  try {
    cmd = JSON.parse(g && g.cmd_channels || "[]") || [];
  } catch (e) {
  }
  return { laps: g && g.alerts_channel || null, recs: g && g.records_channel || null, cmd, lang: g && g.lang || null };
}
__name(guildCfg, "guildCfg");
var saveGuild = /* @__PURE__ */ __name((env, guild, col, val) => env.DB.prepare(`INSERT INTO discord_guilds (guild_id, ${col}, updated) VALUES (?1,?2,?3) ON CONFLICT(guild_id) DO UPDATE SET ${col}=excluded.${col}, updated=excluded.updated`).bind(guild, val, Date.now()).run(), "saveGuild");
function panel(x, c, note2) {
  const L = c.lang || langOf(x.it.guild_locale || x.it.locale), off = tr(x.l, "off", "apagado", "desligado");
  const pick = /* @__PURE__ */ __name((id2, ph, max, vals) => ({ type: 1, components: [{ type: 8, custom_id: id2, placeholder: ph, min_values: 0, max_values: max, channel_types: [0, 5], default_values: vals.map((v) => ({ id: v, type: "channel" })) }] }), "pick");
  const lines = [
    "**" + tr(x.l, "Pitlane HQ in this server", "Pitlane HQ en este servidor", "Pitlane HQ neste servidor") + "**",
    tr(x.l, "Commands answer in: ", "Los comandos responden en: ", "Os comandos respondem em: ") + (c.cmd.length ? c.cmd.map((v) => `<#${v}>`).join(" ") : tr(x.l, "every channel", "todos los canales", "todos os canais")),
    tr(x.l, "New best laps: ", "Mejores vueltas: ", "Melhores voltas: ") + (c.laps ? `<#${c.laps}>` : off),
    tr(x.l, "New records: ", "R\xE9cords: ", "Recordes: ") + (c.recs ? `<#${c.recs}>` : c.laps ? `<#${c.laps}>` : off),
    tr(x.l, "Alerts' language: ", "Idioma de las alertas: ", "Idioma dos alertas: ") + LNAME[L]
  ];
  if (note2) lines.push("", note2);
  return {
    content: lines.join("\n"),
    components: [
      pick("cfg:cmd", tr(x.l, "Channels where the bot answers (none: all)", "Canales donde responde el bot (ninguno: todos)", "Canais onde o bot responde (nenhum: todos)"), 25, c.cmd),
      pick("cfg:laps", tr(x.l, "Channel for new best laps (none: off)", "Canal de mejores vueltas (ninguno: apagado)", "Canal das melhores voltas (nenhum: desligado)"), 1, c.laps ? [c.laps] : []),
      pick("cfg:recs", tr(x.l, "Channel for new records (none: the best laps' one)", "Canal de r\xE9cords (ninguno: el de mejores vueltas)", "Canal dos recordes (nenhum: o das melhores voltas)"), 1, c.recs ? [c.recs] : []),
      { type: 1, components: [{ type: 3, custom_id: "cfg:lang", placeholder: tr(x.l, "Alerts' language", "Idioma de las alertas", "Idioma dos alertas"), options: LANGS.map((v) => ({ label: LNAME[v], value: v, default: v === L })) }] }
    ]
  };
}
__name(panel, "panel");
var onlyManagers = /* @__PURE__ */ __name((x) => text(tr(x.l, "Only the people who manage this server can change this.", "Solo quien gestiona este servidor puede cambiar esto.", "S\xF3 quem gerencia este servidor pode mudar isto.")), "onlyManagers");
async function setup(x) {
  if (!x.guild) return text(tr(x.l, "This works inside a server.", "Esto funciona dentro de un servidor.", "Isto funciona dentro de um servidor."));
  if (!canManage(x)) return onlyManagers(x);
  return say(panel(x, await guildCfg(x.env, x.guild)), true);
}
__name(setup, "setup");
async function panelAction(x) {
  const id2 = String(x.it.data.custom_id || "");
  if (!id2.startsWith("cfg:")) return reply({ type: 6 });
  if (!x.guild || !canManage(x)) return onlyManagers(x);
  const kind = id2.slice(4), raw = (x.it.data.values || []).map(String), chans = raw.filter((v) => /^\d{5,25}$/.test(v));
  const upd = /* @__PURE__ */ __name(async (note2) => reply({ type: 7, data: answer(panel(x, await guildCfg(x.env, x.guild), note2)) }), "upd");
  if (kind === "lang") {
    if (LANGS.includes(raw[0])) await saveGuild(x.env, x.guild, "lang", raw[0]);
    return upd(tr(x.l, "Saved.", "Guardado.", "Salvo."));
  }
  if (kind === "cmd") {
    await saveGuild(x.env, x.guild, "cmd_channels", chans.length ? JSON.stringify(chans.slice(0, 25)) : null);
    return upd(tr(x.l, "Saved.", "Guardado.", "Salvo."));
  }
  if (kind !== "laps" && kind !== "recs") return reply({ type: 6 });
  const col = kind === "laps" ? "alerts_channel" : "records_channel", ch = chans[0] || null;
  if (!ch) {
    await saveGuild(x.env, x.guild, col, null);
    return upd(tr(x.l, "Saved.", "Guardado.", "Salvo."));
  }
  if (!x.account) return upd(tr(x.l, "Link your Pitlane HQ account first with /link to set the alerts.", "Vincula antes tu cuenta de Pitlane HQ con /link para configurar las alertas.", "Vincule antes a sua conta do Pitlane HQ com /link para configurar os alertas."));
  if (!await isPro(x.env, x.account)) return upd(tr(x.l, "The alerts are part of Pitlane HQ Pro.", "Las alertas son parte de Pitlane HQ Pro.", "Os alertas fazem parte do Pitlane HQ Pro."));
  if (!x.env.DISCORD_BOT_TOKEN) return upd(tr(x.l, "The bot cannot post yet (no bot token on the server).", "El bot a\xFAn no puede publicar (falta su token en el servidor).", "O bot ainda n\xE3o pode publicar (falta o token dele no servidor)."));
  return later(x, true, async () => {
    const c = await guildCfg(x.env, x.guild), gl = c.lang || langOf(x.it.guild_locale || x.it.locale);
    const hello = kind === "laps" ? tr(gl, "\u{1F3C1} Pitlane HQ: this server's new best laps will show up here.", "\u{1F3C1} Pitlane HQ: aqu\xED saldr\xE1n las nuevas mejores vueltas de este servidor.", "\u{1F3C1} Pitlane HQ: aqui v\xE3o aparecer as novas melhores voltas deste servidor.") : tr(gl, "\u{1F3C6} Pitlane HQ: the records this server's drivers set will show up here.", "\u{1F3C6} Pitlane HQ: aqu\xED saldr\xE1n los r\xE9cords que batan los pilotos de este servidor.", "\u{1F3C6} Pitlane HQ: aqui v\xE3o aparecer os recordes que os pilotos deste servidor baterem.");
    if (!await post(x.env, ch, { content: hello }))
      return panel(x, c, tr(x.l, `I cannot post in <#${ch}>: give the bot View channel, Send messages and Embed links there.`, `No puedo publicar en <#${ch}>: da al bot Ver canal, Enviar mensajes e Insertar enlaces all\xED.`, `N\xE3o consigo publicar em <#${ch}>: d\xEA ao bot Ver canal, Enviar mensagens e Inserir links l\xE1.`));
    await x.env.DB.batch([
      x.env.DB.prepare(`INSERT INTO discord_guilds (guild_id, ${col}, set_by, lang, updated) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(guild_id) DO UPDATE SET ${col}=excluded.${col}, set_by=excluded.set_by, lang=COALESCE(discord_guilds.lang, excluded.lang), updated=excluded.updated`).bind(x.guild, ch, x.account, gl, Date.now())
    ]);
    return panel(x, await guildCfg(x.env, x.guild), tr(x.l, "Saved.", "Guardado.", "Salvo."));
  }, true);
}
__name(panelAction, "panelAction");
async function coach(x) {
  if (!x.account) return needLink(x);
  const k = await comboOf(x.env, x.opt.car_track);
  if (!k) return noCombo(x);
  const mine = await x.env.DB.prepare("SELECT time FROM community_laps WHERE user_id=?1 AND track_id=?2 AND car_id=?3 AND game='iracing'").bind(x.account, k.t, k.c).first();
  if (!mine) return text(tr(x.l, "You have no lap on this car and track yet (test drives do not count).", "A\xFAn no tienes vuelta en este coche y circuito (las pruebas libres no cuentan).", "Voc\xEA ainda n\xE3o tem volta neste carro e pista (test drives n\xE3o contam)."));
  return later(x, true, async () => {
    const m = await getModel(x.env, "iracing", k.t, k.c);
    let times = (m.times || []).slice();
    if (!times.length) times = ((await x.env.DB.prepare("SELECT time FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game='iracing' AND COALESCE(shown,'')<>'model' AND time>10 AND COALESCE(official,1)<>0").bind(k.t, k.c).all()).results || []).map((v) => v.time);
    const me2 = mine.time;
    if (!times.some((t) => Math.abs(t - me2) < 5e-4)) times.push(me2);
    times.sort((a, b) => a - b);
    const pos = times.filter((t) => t < me2 - 5e-4).length + 1;
    const rec = Math.min(m.fastest || Infinity, times[0]);
    const lv = (m.ladder || []).find((e) => me2 <= e.upTo + 5e-4) || (m.ladder || []).slice(-1)[0];
    const ahead = times.filter((t) => t < me2 - 5e-4).pop() || null;
    const next = lv && lv.time < me2 - 5e-4 ? lv.time : ahead;
    const fields = [
      { name: tr(x.l, "Your best", "Tu mejor vuelta", "Sua melhor volta"), value: `\`${fmt(me2)}\` \xB7 **P${pos}** ${tr(x.l, "of", "de", "de")} ${times.length}`, inline: true },
      { name: tr(x.l, "Next level", "Siguiente nivel", "Pr\xF3ximo n\xEDvel"), value: next ? `\`${fmt(next)}\` \`${gap(next - me2)}\`` : tr(x.l, "You are the fastest known here", "Eres el m\xE1s r\xE1pido conocido aqu\xED", "Voc\xEA \xE9 o mais r\xE1pido conhecido aqui"), inline: true },
      { name: tr(x.l, "Record", "R\xE9cord", "Recorde"), value: rec < me2 - 5e-4 ? `\`${fmt(rec)}\` \`${gap(rec - me2)}\`` : tr(x.l, "Yours", "El tuyo", "O seu"), inline: true }
    ];
    return {
      embeds: [{
        color: AMBER,
        title: `${fix(k.car)} \xB7 ${fix(k.track)}`.slice(0, 250),
        fields,
        description: tr(x.l, "Where you lose the time, corner by corner: the coach in the app.", "D\xF3nde pierdes el tiempo, curva a curva: el coach en la app.", "Onde voc\xEA perde tempo, curva a curva: o coach no app.")
      }],
      components: buttons(button(tr(x.l, "Open the coach", "Abrir el coach", "Abrir o coach"), SITE3 + "/"))
    };
  });
}
__name(coach, "coach");
async function compare(x) {
  if (!x.account) return needLink(x);
  const b = await driverOf(x.env, x.opt.name);
  if (!b) return text(tr(x.l, "No driver by that name (anonymous drivers have no profile).", "No hay ning\xFAn piloto con ese nombre (los pilotos an\xF3nimos no tienen perfil).", "N\xE3o h\xE1 nenhum piloto com esse nome (pilotos an\xF4nimos n\xE3o t\xEAm perfil)."));
  if (b.id === x.account) return text(tr(x.l, "That is you.", "Ese eres t\xFA.", "Esse \xE9 voc\xEA."));
  const r4 = await x.env.DB.prepare(
    `SELECT a.track, a.car, a.time AS mine, b.time AS theirs, MAX(a.created, b.created) AS at
       FROM community_laps a JOIN community_laps b ON b.track_id=a.track_id AND b.car_id=a.car_id AND b.game=a.game
      WHERE a.user_id=?1 AND b.user_id=?2 AND b.anon=0 AND COALESCE(a.shown,'')<>'model' AND COALESCE(b.shown,'')<>'model'
      ORDER BY at DESC LIMIT 300`
  ).bind(x.account, b.id).all();
  const rows = r4.results || [];
  const eph = await isAnon(x.env, x.account);
  if (!rows.length) return text(tr(x.l, `You and **${md(b.alias)}** have no car and track in common yet.`, `T\xFA y **${md(b.alias)}** a\xFAn no ten\xE9is ning\xFAn coche y circuito en com\xFAn.`, `Voc\xEA e **${md(b.alias)}** ainda n\xE3o t\xEAm nenhum carro e pista em comum.`), eph);
  const won = rows.filter((v) => v.mine < v.theirs).length;
  const lines = rows.slice(0, 12).map((v) => `${v.mine < v.theirs ? "\u{1F7E2}" : v.mine > v.theirs ? "\u{1F534}" : "\u26AA"} \`${gap(v.mine - v.theirs)}\` ${md(fix(v.car))} \xB7 ${md(fix(v.track))}`);
  return say({
    embeds: [{
      color: AMBER,
      title: tr(x.l, `You against ${b.alias}`, `T\xFA contra ${b.alias}`, `Voc\xEA contra ${b.alias}`).slice(0, 250),
      description: tr(x.l, `Faster on **${won}** of **${rows.length}** cars and tracks.`, `M\xE1s r\xE1pido en **${won}** de **${rows.length}** coches y circuitos.`, `Mais r\xE1pido em **${won}** de **${rows.length}** carros e pistas.`) + "\n\n" + lines.join("\n"),
      footer: { text: tr(x.l, "Your gap on each one's fastest lap \xB7 most recent first", "Tu diferencia en la vuelta m\xE1s r\xE1pida de cada uno \xB7 las m\xE1s recientes primero", "A sua diferen\xE7a na volta mais r\xE1pida de cada um \xB7 as mais recentes primeiro") }
    }]
  }, eph);
}
__name(compare, "compare");
async function board(x) {
  if (!x.guild) return text(tr(x.l, "This works inside a server.", "Esto funciona dentro de un servidor.", "Isto funciona dentro de um servidor."));
  const k = await comboOf(x.env, x.opt.car_track);
  if (!k) return noCombo(x);
  const r4 = await x.env.DB.prepare(
    `SELECT dl.discord_id AS did, u.alias, l.time,
       (SELECT COUNT(*) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model' AND o.time<l.time)+1 AS pos
       FROM discord_members m JOIN discord_links dl ON dl.discord_id=m.discord_id JOIN community_laps l ON l.user_id=dl.account_id
       JOIN community_users u ON u.id=l.user_id JOIN accounts ac ON ac.id=l.user_id
      WHERE m.guild_id=?1 AND l.track_id=?2 AND l.car_id=?3 AND l.game='iracing' AND l.anon=0 AND ac.anon=0 AND ${NOT_MODEL}
      ORDER BY l.time LIMIT 20`
  ).bind(x.guild, k.t, k.c).all();
  const rows = r4.results || [];
  if (!rows.length) return text(tr(
    x.l,
    "Nobody in this server has a lap there yet. Drivers show up once they link their account (/link) and use the bot here.",
    "Nadie de este servidor tiene vuelta ah\xED todav\xEDa. Los pilotos aparecen cuando vinculan su cuenta (/link) y usan el bot aqu\xED.",
    "Ningu\xE9m deste servidor tem volta a\xED ainda. Os pilotos aparecem quando vinculam a conta (/link) e usam o bot aqui."
  ), false);
  const lines = rows.map((v, i) => `\`${String(i + 1).padStart(2)}\` \`${fmt(v.time)}\` ${i ? `\`${gap(v.time - rows[0].time)}\` ` : ""}<@${v.did}> ${md(v.alias)} \xB7 P${v.pos} ${tr(x.l, "overall", "general", "geral")}`);
  return say({
    embeds: [{ color: AMBER, title: `${fix(k.car)}`.slice(0, 250), url: recUrl(x.l, k), description: `**${md(fix(k.track))}** \xB7 ${tr(x.l, "this server", "este servidor", "este servidor")}

` + lines.join("\n") }]
  });
}
__name(board, "board");
async function alerts(x) {
  if (!x.guild) return text(tr(x.l, "This works inside a server.", "Esto funciona dentro de un servidor.", "Isto funciona dentro de um servidor."));
  if (!canManage(x)) return text(tr(x.l, "Only the people who manage this server can set the alerts.", "Solo quien gestiona este servidor puede configurar las alertas.", "S\xF3 quem gerencia este servidor pode configurar os alertas."));
  if (!x.account) return needLink(x);
  const ch = x.opt.channel, now = Date.now(), gl = LANGS.includes(x.opt.language) ? x.opt.language : langOf(x.it.guild_locale || x.it.locale);
  if (!ch) {
    await x.env.DB.prepare("UPDATE discord_guilds SET alerts_channel=NULL, records_channel=NULL, updated=?2 WHERE guild_id=?1").bind(x.guild, now).run();
    return text(tr(x.l, "Alerts off.", "Alertas apagadas.", "Alertas desligados."));
  }
  if (!x.env.DISCORD_BOT_TOKEN) return text(tr(x.l, "The bot cannot post yet (no bot token on the server).", "El bot a\xFAn no puede publicar (falta su token en el servidor).", "O bot ainda n\xE3o pode publicar (falta o token dele no servidor)."));
  return later(x, true, async () => {
    const ok = await post(x.env, ch, { content: tr(gl, "\u{1F3C1} Pitlane HQ alerts: this server's new best laps and records will show up here.", "\u{1F3C1} Alertas de Pitlane HQ: aqu\xED saldr\xE1n las mejores vueltas y los r\xE9cords de este servidor.", "\u{1F3C1} Alertas do Pitlane HQ: aqui v\xE3o aparecer as melhores voltas e os recordes deste servidor.") });
    if (!ok) return { content: tr(x.l, `I cannot post in <#${ch}>: give the bot View channel, Send messages and Embed links there.`, `No puedo publicar en <#${ch}>: da al bot Ver canal, Enviar mensajes e Insertar enlaces all\xED.`, `N\xE3o consigo publicar em <#${ch}>: d\xEA ao bot Ver canal, Enviar mensagens e Inserir links l\xE1.`) };
    await x.env.DB.prepare("INSERT INTO discord_guilds (guild_id, alerts_channel, set_by, lang, updated) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(guild_id) DO UPDATE SET alerts_channel=excluded.alerts_channel, records_channel=NULL, set_by=excluded.set_by, lang=excluded.lang, updated=excluded.updated").bind(x.guild, ch, x.account, gl, now).run();
    return { content: tr(x.l, `Alerts on in <#${ch}>. They cover the drivers who linked their account and used the bot in this server.`, `Alertas activadas en <#${ch}>. Cubren a los pilotos que vincularon su cuenta y usaron el bot en este servidor.`, `Alertas ativados em <#${ch}>. Cobrem os pilotos que vincularam a conta e usaram o bot neste servidor.`) };
  });
}
__name(alerts, "alerts");
var KIND = /* @__PURE__ */ __name((l, k) => {
  const s = String(k || "").toLowerCase();
  return /race/.test(s) ? tr(l, "Race", "Carrera", "Corrida") : /qual/.test(s) ? tr(l, "Qualifying", "Clasificaci\xF3n", "Classifica\xE7\xE3o") : tr(l, "Practice", "Pr\xE1ctica", "Treino");
}, "KIND");
async function recent(x) {
  if (!x.account) return needLink(x);
  const r4 = await x.env.DB.prepare("SELECT started, track, car, kind, laps, best, pos, field, game FROM sessions WHERE uploader=?1 ORDER BY started DESC LIMIT 8").bind("acct:" + x.account).all();
  const rows = r4.results || [];
  if (!rows.length) return text(tr(x.l, "No sessions on your account yet.", "A\xFAn no hay sesiones en tu cuenta.", "Ainda n\xE3o h\xE1 sess\xF5es na sua conta."));
  const lines = rows.map((v) => `<t:${Math.floor(v.started / 1e3)}:d> **${md(fix(v.track))}** \xB7 ${md(fix(v.car))}
${KIND(x.l, v.kind)}${v.pos ? ` **P${v.pos}**${v.field ? "/" + v.field : ""}` : ""} \xB7 ${v.laps || 0} ${tr(x.l, "laps", "vueltas", "voltas")}${v.best > 0 ? ` \xB7 \`${fmt(v.best)}\`` : ""}${v.game === "lmu" ? " \xB7 LMU" : ""}`);
  return say({
    embeds: [{ color: AMBER, title: tr(x.l, "Your last sessions", "Tus \xFAltimas sesiones", "As suas \xFAltimas sess\xF5es"), description: lines.join("\n\n").slice(0, 4e3) }],
    components: buttons(button(tr(x.l, "Open Pitlane HQ", "Abrir Pitlane HQ", "Abrir o Pitlane HQ"), SITE3 + "/"))
  }, true);
}
__name(recent, "recent");
async function tracks(env, q2, n) {
  const words = String(q2 || "").toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean).slice(0, 5);
  const squash = "replace(replace(replace(lower(l.track),' ',''),'-',''),'.','')";
  const where = words.map((_, i) => `AND ${squash} LIKE ?${i + 2}`).join(" ");
  const r4 = await env.DB.prepare(`SELECT l.track_id AS t, MAX(l.track) AS track, COUNT(DISTINCT l.user_id) AS drivers FROM community_laps l
    WHERE l.game='iracing' AND l.track_id>0 AND ${NOT_MODEL} ${where} GROUP BY l.track_id ORDER BY drivers DESC LIMIT ?1`).bind(n, ...words.map((w) => "%" + w + "%")).all();
  return r4.results || [];
}
__name(tracks, "tracks");
async function track(x) {
  const v = String(x.opt.track || "");
  const t = /^\d+$/.test(v) ? { t: +v } : (await tracks(x.env, v, 1))[0];
  if (!t) return text(tr(x.l, "No laps on that track yet. Pick one from the list as you type.", "A\xFAn no hay vueltas en ese circuito. Elige uno de la lista mientras escribes.", "Ainda n\xE3o h\xE1 voltas nessa pista. Escolha uma da lista enquanto digita."));
  const r4 = await x.env.DB.prepare(`SELECT l.car_id AS c, MAX(l.car) AS car, MAX(l.track) AS track, MIN(l.time) AS best, COUNT(DISTINCT l.user_id) AS drivers FROM community_laps l
    WHERE l.track_id=?1 AND l.game='iracing' AND ${NOT_MODEL} GROUP BY l.car_id ORDER BY drivers DESC LIMIT 10`).bind(t.t).all();
  const cars = r4.results || [];
  if (!cars.length) return text(tr(x.l, "No laps on that track yet.", "A\xFAn no hay vueltas en ese circuito.", "Ainda n\xE3o h\xE1 voltas nessa pista."));
  const name2 = fix(cars[0].track);
  const lines = cars.map((c) => `\`${fmt(c.best)}\` ${md(famName("iracing", c.c, fix(c.car)))} \xB7 ${c.drivers} ${tr(x.l, "drivers", "pilotos", "pilotos")}`);
  if (x.account && !await isAnon(x.env, x.account)) {
    const mine = (await x.env.DB.prepare(`SELECT l.car, l.car_id AS c, l.time, (SELECT COUNT(*) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model' AND o.time<l.time)+1 AS pos
      FROM community_laps l WHERE l.user_id=?1 AND l.track_id=?2 AND l.game='iracing' AND l.anon=0 AND ${NOT_MODEL} ORDER BY pos LIMIT 3`).bind(x.account, t.t).all()).results || [];
    if (mine.length) lines.push("", tr(x.l, "**You**", "**T\xFA**", "**Voc\xEA**"), ...mine.map((m) => `**P${m.pos}** \`${fmt(m.time)}\` ${md(famName("iracing", m.c, fix(m.car)))}`));
  }
  return say({ embeds: [{
    color: AMBER,
    title: name2.slice(0, 250),
    description: lines.join("\n").slice(0, 4e3),
    footer: { text: tr(x.l, "The record on each car \xB7 the most driven cars first \xB7 Pitlane HQ", "El r\xE9cord en cada coche \xB7 primero los coches m\xE1s usados \xB7 Pitlane HQ", "O recorde em cada carro \xB7 primeiro os carros mais usados \xB7 Pitlane HQ") }
  }] });
}
__name(track, "track");
async function inviteGuild(env, url) {
  const m = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)/.exec(String(url || ""));
  if (!m) return null;
  const r4 = await fetch(`${API}/invites/${m[1]}`, env.DISCORD_BOT_TOKEN ? { headers: { authorization: "Bot " + env.DISCORD_BOT_TOKEN } } : {}).catch(() => null);
  const j = r4 && r4.ok ? await r4.json().catch(() => null) : null;
  return j && j.guild && j.guild.id || null;
}
__name(inviteGuild, "inviteGuild");
async function league(x) {
  if (!x.guild) return text(tr(x.l, "This works inside a server.", "Esto funciona dentro de un servidor.", "Isto funciona dentro de um servidor."));
  if (!canManage(x)) return text(tr(x.l, "Only the people who manage this server can link its league.", "Solo quien gestiona este servidor puede vincular su liga.", "S\xF3 quem gerencia este servidor pode vincular a liga."));
  const now = Date.now(), id2 = String(x.opt.league || "");
  if (!id2) {
    await x.env.DB.prepare("UPDATE discord_guilds SET league_id=NULL, updated=?2 WHERE guild_id=?1").bind(x.guild, now).run();
    return text(tr(x.l, "This server is not linked to a league any more.", "Este servidor ya no est\xE1 vinculado a ninguna liga.", "Este servidor n\xE3o est\xE1 mais vinculado a nenhuma liga."));
  }
  const lg = await x.env.DB.prepare("SELECT id, name, discord FROM leagues WHERE id=?1").bind(id2).first();
  if (!lg) return text(tr(x.l, "Pick the league from the list as you type.", "Elige la liga de la lista mientras escribes.", "Escolha a liga da lista enquanto digita."));
  return later(x, true, async () => {
    if (await inviteGuild(x.env, lg.discord) !== x.guild)
      return { content: tr(x.l, `The invite of **${md(fix(lg.name))}** in the leagues hub does not lead to this server. Its creator can change it on pitlanehq.app.`, `La invitaci\xF3n de **${md(fix(lg.name))}** en el hub de ligas no lleva a este servidor. Quien la cre\xF3 puede cambiarla en pitlanehq.app.`, `O convite de **${md(fix(lg.name))}** no hub de ligas n\xE3o leva a este servidor. Quem a criou pode mud\xE1-lo em pitlanehq.app.`) };
    await x.env.DB.prepare("INSERT INTO discord_guilds (guild_id, league_id, set_by, updated) VALUES (?1,?2,?3,?4) ON CONFLICT(guild_id) DO UPDATE SET league_id=excluded.league_id, updated=excluded.updated").bind(x.guild, lg.id, x.account, now).run();
    return { content: tr(x.l, `This server is now **${md(fix(lg.name))}** in the leagues hub. With /alerts on, the week's best laps post there on Monday.`, `Este servidor es ahora **${md(fix(lg.name))}** en el hub de ligas. Con /alerts activado, las mejores vueltas de la semana se publican all\xED el lunes.`, `Este servidor agora \xE9 **${md(fix(lg.name))}** no hub de ligas. Com /alerts ligado, as melhores voltas da semana s\xE3o publicadas l\xE1 na segunda-feira.`) };
  });
}
__name(league, "league");
async function discordWeekly(env, now = Date.now()) {
  if (!env.DISCORD_BOT_TOKEN) return 0;
  const gs = (await env.DB.prepare(`SELECT g.guild_id, g.alerts_channel, g.set_by, g.lang, lg.name AS league FROM discord_guilds g LEFT JOIN leagues lg ON lg.id=g.league_id
    WHERE g.alerts_channel IS NOT NULL AND (g.week_at IS NULL OR g.week_at<?1) LIMIT 20`).bind(now - 5 * 864e5).all()).results || [];
  let n = 0;
  for (const g of gs) {
    await env.DB.prepare("UPDATE discord_guilds SET week_at=?2 WHERE guild_id=?1").bind(g.guild_id, now).run();
    if (!await isPro(env, g.set_by)) continue;
    const rows = (await env.DB.prepare(`SELECT dl.discord_id AS did, u.alias, l.track, l.car, l.car_id AS c, l.time,
        (SELECT COUNT(*) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model' AND o.time<l.time)+1 AS pos
        FROM discord_members m JOIN discord_links dl ON dl.discord_id=m.discord_id JOIN community_laps l ON l.user_id=dl.account_id
        JOIN community_users u ON u.id=l.user_id JOIN accounts ac ON ac.id=l.user_id
       WHERE m.guild_id=?1 AND l.created>=?2 AND l.game='iracing' AND l.anon=0 AND ac.anon=0 AND ${NOT_MODEL} ORDER BY pos, l.time LIMIT 10`).bind(g.guild_id, now - 7 * 864e5).all()).results || [];
    if (!rows.length) continue;
    const l = ["es", "pt"].includes(g.lang) ? g.lang : "en";
    const lines = rows.map((v) => `**P${v.pos}** \`${fmt(v.time)}\` <@${v.did}> ${md(v.alias)}
${md(famName("iracing", v.c, fix(v.car)))} \xB7 ${md(fix(v.track))}`);
    if (await post(env, g.alerts_channel, { embeds: [{
      color: AMBER,
      title: tr(l, "\u{1F5D3}\uFE0F The week's best laps", "\u{1F5D3}\uFE0F Las mejores vueltas de la semana", "\u{1F5D3}\uFE0F As melhores voltas da semana") + (g.league ? " \xB7 " + fix(g.league) : ""),
      description: lines.join("\n\n").slice(0, 4e3),
      footer: { text: tr(l, "Each driver's best of the week and their place on the leaderboard \xB7 Pitlane HQ", "La mejor de cada piloto en la semana y su puesto en la leaderboard \xB7 Pitlane HQ", "A melhor de cada piloto na semana e a posi\xE7\xE3o na classifica\xE7\xE3o \xB7 Pitlane HQ") }
    }] })) n++;
  }
  return n;
}
__name(discordWeekly, "discordWeekly");
async function post(env, channel, msg) {
  const r4 = await fetch(`${API}/channels/${channel}/messages`, {
    method: "POST",
    headers: { authorization: "Bot " + env.DISCORD_BOT_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ allowed_mentions: { parse: [] }, ...msg })
  }).catch(() => null);
  return !!(r4 && r4.ok);
}
__name(post, "post");
async function discordLapAlert(env, accountId, lap) {
  if (!env.DISCORD_BOT_TOKEN || !lap || !lap.improved || lap.game !== "iracing") return;
  const a = await env.DB.prepare("SELECT a.anon, u.alias, dl.discord_id FROM accounts a JOIN community_users u ON u.id=a.id JOIN discord_links dl ON dl.account_id=a.id WHERE a.id=?1").bind(accountId).first();
  if (!a || a.anon || lap.anon) return;
  const gs = (await env.DB.prepare("SELECT g.guild_id, g.alerts_channel, g.records_channel, g.set_by, g.lang FROM discord_members m JOIN discord_guilds g ON g.guild_id=m.guild_id WHERE m.discord_id=?1 AND (g.alerts_channel IS NOT NULL OR g.records_channel IS NOT NULL)").bind(a.discord_id).all()).results || [];
  if (!gs.length) return;
  const st = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM community_laps l WHERE l.track_id=?1 AND l.car_id=?2 AND l.game='iracing' AND ${NOT_MODEL} AND l.time<?3)+1 AS pos,
            (SELECT COUNT(*) FROM community_laps l WHERE l.track_id=?1 AND l.car_id=?2 AND l.game='iracing' AND ${NOT_MODEL}) AS total`
  ).bind(lap.trackId, lap.carId, lap.time).first();
  const k = { t: lap.trackId, c: lap.carId, track: lap.track, car: lap.car };
  for (const g of gs) {
    const rec = st.pos === 1 && st.total > 1, channel = rec ? g.records_channel || g.alerts_channel : g.alerts_channel;
    if (!channel || !await isPro(env, g.set_by)) continue;
    const l = ["es", "pt"].includes(g.lang) ? g.lang : "en";
    const fields = [
      { name: tr(l, "Time", "Tiempo", "Tempo"), value: `\`${fmt(lap.time)}\`` + (lap.prev ? ` \`${gap(lap.time - lap.prev)}\`` : ""), inline: true },
      { name: tr(l, "Position", "Posici\xF3n", "Posi\xE7\xE3o"), value: `**P${st.pos}** ${tr(l, "of", "de", "de")} ${st.total}`, inline: true }
    ];
    await post(env, channel, {
      embeds: [{
        color: rec ? PURPLE : AMBER,
        url: recUrl(l, k),
        title: rec ? tr(l, "\u{1F3C6} New record", "\u{1F3C6} Nuevo r\xE9cord", "\u{1F3C6} Novo recorde") : tr(l, "\u23F1\uFE0F New best lap", "\u23F1\uFE0F Nueva mejor vuelta", "\u23F1\uFE0F Nova melhor volta"),
        description: `<@${a.discord_id}> **${md(a.alias)}**
${md(fix(lap.car))} \xB7 ${md(fix(lap.track))}`,
        fields
      }]
    });
  }
}
__name(discordLapAlert, "discordLapAlert");
async function linkPair(env, discordId, accountId, handle2, guildId, login) {
  const was = await env.DB.prepare("SELECT shown, login FROM discord_links WHERE discord_id=?1 AND account_id=?2").bind(discordId, accountId).first();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM discord_links WHERE discord_id=?1 OR account_id=?2").bind(discordId, accountId),
    env.DB.prepare("INSERT INTO discord_links (discord_id, account_id, created, handle, shown, login) VALUES (?1,?2,?3,?4,?5,?6)").bind(discordId, accountId, now, handle2 || null, was && was.shown ? 1 : 0, login || was && was.login ? 1 : 0),
    ...guildId ? [env.DB.prepare("INSERT OR REPLACE INTO discord_members (guild_id, discord_id, seen) VALUES (?1,?2,?3)").bind(guildId, discordId, now)] : []
  ]);
}
__name(linkPair, "linkPair");
var JSONH3 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
var json5 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH3 }), "json");
var hexOf = /* @__PURE__ */ __name((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""), "hexOf");
var rid2 = /* @__PURE__ */ __name(() => hexOf(crypto.getRandomValues(new Uint8Array(24))), "rid");
var isHex482 = /* @__PURE__ */ __name((v) => typeof v === "string" && /^[0-9a-f]{48}$/.test(v), "isHex48");
var portOf2 = /* @__PURE__ */ __name((v) => Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) < 65536 ? Number(v) : null, "portOf");
var clean32 = /* @__PURE__ */ __name((a) => (typeof a === "string" ? a : "").slice(0, 32).replace(/[\u0000-\u001f<>]/g, "").trim(), "clean32");
var siteOf2 = /* @__PURE__ */ __name((env, url) => env.LOCAL === "1" && url ? url.origin : SITE3, "siteOf");
var oauthBack = /* @__PURE__ */ __name((env, url) => siteOf2(env, url) + "/discord/oauth", "oauthBack");
var oauthReady = /* @__PURE__ */ __name((env) => !!(env.DISCORD_APP_ID && env.DISCORD_CLIENT_SECRET), "oauthReady");
var NOT_READY = "Discord sign-in is not set up on this server yet";
var AGAIN = "this Discord sign-in is not valid any more, sign in with Discord again";
async function discordStart(env, url, kind, accountId, device, port, app) {
  if (portOf2(port) && appOf(app)) return { error: "port or app, not both" };
  const state = rid2(), code = rid2(), now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM discord_oauth WHERE expires<?1 OR (account_id IS NOT NULL AND account_id=?2)").bind(now, accountId || ""),
    env.DB.prepare("INSERT INTO discord_oauth (state_hash, code_hash, account_id, device, kind, port, app, expires) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)").bind(await sha256("discord-oauth:" + state), await sha256("discord-code:" + code), accountId || null, clean32(device) || null, kind, portOf2(port), appOf(app) ? 1 : 0, now + 10 * 6e4)
  ]);
  const q2 = new URLSearchParams({ client_id: env.DISCORD_APP_ID, response_type: "code", scope: "identify", redirect_uri: oauthBack(env, url), state });
  if (kind === "login") q2.set("prompt", "none");
  return { url: "https://discord.com/oauth2/authorize?" + q2, state, code };
}
__name(discordStart, "discordStart");
async function newGrant2(env, kind, st, me2, ttl) {
  const g = rid2();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM discord_grants WHERE expires<?1").bind(Date.now()),
    env.DB.prepare("INSERT INTO discord_grants (grant_hash, code_hash, account_id, discord_id, handle, name, device, kind, expires) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(await sha256("discord-grant:" + g), st.code_hash, st.account_id || null, me2.id, me2.handle || null, me2.name || null, st.device, kind, Date.now() + ttl)
  ]);
  return g;
}
__name(newGrant2, "newGrant");
async function useDiscordGrant(env, g, kind, code) {
  if (!isHex482(g) || !isHex482(code)) return null;
  const r4 = await env.DB.prepare("DELETE FROM discord_grants WHERE grant_hash=?1 AND kind=?2 RETURNING code_hash, account_id, discord_id, handle, name, device, expires").bind(await sha256("discord-grant:" + g), kind).first();
  return r4 && r4.expires >= Date.now() && r4.code_hash === await sha256("discord-code:" + code) ? r4 : null;
}
__name(useDiscordGrant, "useDiscordGrant");
var discordAccountId = /* @__PURE__ */ __name(async (env, discordId) => (await env.DB.prepare("SELECT account_id FROM discord_links WHERE discord_id=?1 AND login=1").bind(discordId).first() || {}).account_id || null, "discordAccountId");
var discordLinkedAny = /* @__PURE__ */ __name(async (env, discordId) => !!await env.DB.prepare("SELECT 1 FROM discord_links WHERE discord_id=?1").bind(discordId).first(), "discordLinkedAny");
async function linkDiscordLogin(env, g, accountId) {
  const other = await env.DB.prepare("SELECT account_id FROM discord_links WHERE discord_id=?1").bind(g.discord_id).first();
  if (other && other.account_id !== accountId) return "taken";
  await linkPair(env, g.discord_id, accountId, g.handle, null, true);
  return "ok";
}
__name(linkDiscordLogin, "linkDiscordLogin");
function discordUser(me2) {
  if (!me2 || !/^\d{5,25}$/.test(String(me2.id || ""))) return null;
  const handle2 = String(me2.username || "").replace(/[^A-Za-z0-9_.]/g, "").slice(0, 40);
  return { id: String(me2.id), handle: handle2, name: clean32(me2.global_name) || clean32(handle2) };
}
__name(discordUser, "discordUser");
async function discordOAuth(req, env, url) {
  const base2 = siteOf2(env, url);
  const state = url.searchParams.get("state") || "", code = url.searchParams.get("code") || "";
  if (!isHex482(state)) return Response.redirect(base2 + "/?discordLogin=0", 302);
  const st = await env.DB.prepare("DELETE FROM discord_oauth WHERE state_hash=?1 RETURNING code_hash, account_id, device, kind, port, app, expires").bind(await sha256("discord-oauth:" + state)).first();
  const back2 = /* @__PURE__ */ __name((q2) => goOn(base2, "discord", st && st.kind !== "legacy" ? st : null, state, q2), "back");
  const fail2 = /* @__PURE__ */ __name(() => back2(st && st.kind !== "login" ? "discordLinked=0" : "discordLogin=0"), "fail");
  if (!st || st.expires < Date.now() || !code || !oauthReady(env)) return fail2();
  try {
    return await discordAnswer(env, url, st, code, back2, fail2);
  } catch (e) {
    return fail2();
  }
}
__name(discordOAuth, "discordOAuth");
async function discordAnswer(env, url, st, code, back2, fail2) {
  let me2 = null;
  try {
    const t = await fetch(API + "/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.DISCORD_APP_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: oauthBack(env, url) })
    });
    const tok = t.ok ? await t.json() : null;
    if (!tok || !tok.access_token) return fail2();
    const u = await fetch(API + "/users/@me", { headers: { authorization: "Bearer " + tok.access_token } });
    me2 = discordUser(u.ok ? await u.json() : null);
  } catch (e) {
    return fail2();
  }
  if (!me2) return fail2();
  if (st.kind === "legacy") {
    if (!st.account_id) return fail2();
    const other = await env.DB.prepare("SELECT account_id FROM discord_links WHERE discord_id=?1").bind(me2.id).first();
    if (other && other.account_id !== st.account_id) return back2("discordLinked=taken");
    await linkPair(env, me2.id, st.account_id, me2.handle, null, false);
    return back2("discordLinked=1");
  }
  if (st.kind === "link") {
    if (!st.account_id) return fail2();
    return back2("discordLink=" + await newGrant2(env, "link", st, me2, 5 * 6e4));
  }
  if (await discordAccountId(env, me2.id)) return back2("discordLogin=" + await newGrant2(env, "login", st, me2, 5 * 6e4));
  if (await discordLinkedAny(env, me2.id)) return back2("discordLogin=0&relink=1");
  const q2 = new URLSearchParams({ discordLogin: "0", new: "1", sid: await newGrant2(env, "signup", st, me2, 30 * 6e4) });
  if (me2.name) q2.set("name", me2.name);
  return back2(String(q2));
}
__name(discordAnswer, "discordAnswer");
async function discordAccount(env, a, p, m, body, url, passCheck) {
  if (p === "/discord" && m === "GET") {
    const l = await env.DB.prepare("SELECT discord_id, handle, shown, login FROM discord_links WHERE account_id=?1").bind(a.id).first();
    return json5({ linked: !!l, id: l ? l.discord_id : void 0, handle: l ? l.handle || "" : void 0, shown: !!(l && l.shown), login: !!(l && l.login), oauth: oauthReady(env) });
  }
  if (p === "/discord/start" && m === "POST") {
    if (!oauthReady(env)) return json5({ error: NOT_READY + ": use /link in Discord" }, 503);
    const app = body.app || url.searchParams.get("app");
    if (body.auth == null && !app && !body.port) return json5(await discordStart(env, url, "legacy", a.id, body.device));
    const no = await passCheck();
    if (no) return no;
    const r4 = await discordStart(env, url, "link", a.id, body.device, body.port, app);
    return json5(r4, r4.error ? 400 : 200);
  }
  if (p === "/discord/link/grant" && m === "POST") {
    const g = await useDiscordGrant(env, body.grant, "link", body.code);
    if (!g || g.account_id !== a.id) return json5({ error: AGAIN }, 400);
    if (await linkDiscordLogin(env, g, a.id) === "taken") return json5({ error: "this Discord account is already linked to another account", code: "taken" }, 409);
    return json5({ ok: true, handle: g.handle || "" });
  }
  if (p === "/discord/show" && m === "POST") {
    await env.DB.prepare("UPDATE discord_links SET shown=?2 WHERE account_id=?1").bind(a.id, body.shown ? 1 : 0).run();
    return json5({ ok: true, shown: !!body.shown });
  }
  if (p === "/discord/unlink" && m === "POST") {
    const l = await env.DB.prepare("SELECT login FROM discord_links WHERE account_id=?1").bind(a.id).first();
    if (body.auth != null || l && l.login) {
      const no = await passCheck();
      if (no) return no;
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM discord_members WHERE discord_id IN (SELECT discord_id FROM discord_links WHERE account_id=?1)").bind(a.id),
      env.DB.prepare("DELETE FROM discord_links WHERE account_id=?1").bind(a.id)
    ]);
    return json5({ ok: true });
  }
  const code = String((m === "GET" ? url.searchParams.get("c") : body.code) || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) return json5({ error: "this link is not valid" }, 400);
  const h = await sha256("discord:" + code);
  const c = await env.DB.prepare("SELECT discord_id, discord_name, guild_id, handle FROM discord_codes WHERE code_hash=?1 AND expires>?2").bind(h, Date.now()).first();
  if (!c) return json5({ error: "this link expired: ask the bot again with /link" }, 404);
  if (p === "/discord/code" && m === "GET") return json5({ name: c.discord_name });
  if (p === "/discord/link" && m === "POST") {
    const no = await passCheck();
    if (no) return no;
    await linkPair(env, c.discord_id, a.id, c.handle, c.guild_id, false);
    await env.DB.prepare("DELETE FROM discord_codes WHERE code_hash=?1").bind(h).run();
    return json5({ ok: true, name: c.discord_name });
  }
  return json5({ error: "not found" }, 404);
}
__name(discordAccount, "discordAccount");

// src/presence.js
var KINDS = ["web", "pc", "desktop", "android", "ios"];
var EVERY = 6e4;
var seen = /* @__PURE__ */ new Map();
function clientOf(req) {
  const h = String(req.headers.get("x-pitlane-client") || "").trim().toLowerCase();
  const m = h.match(/^([a-z]+)(?:\/([0-9][0-9a-z.+-]{0,23}))?/);
  if (m && KINDS.includes(m[1])) return { kind: m[1], version: m[2] || "" };
  const ua = String(req.headers.get("user-agent") || "");
  if (/^okhttp\//i.test(ua) || /^Dalvik\//.test(ua)) return { kind: "android", version: "" };
  if (/CFNetwork|Darwin\//.test(ua) && !/^Mozilla\//.test(ua)) return { kind: "ios", version: "" };
  if (/^Go-http-client\//.test(ua)) return { kind: "pc", version: "" };
  if (/^Mozilla\//.test(ua)) return { kind: "web", version: "" };
  return null;
}
__name(clientOf, "clientOf");
async function notePresence(env, req, a) {
  try {
    const c = clientOf(req);
    if (!c || !a || !a.sid) return;
    const now = Date.now(), key2 = a.id + "|" + c.kind + "|" + a.sid;
    if (now - (seen.get(key2) || 0) < EVERY) return;
    seen.set(key2, now);
    if (seen.size > 5e3) {
      for (const [k, t] of seen) if (now - t > EVERY) seen.delete(k);
    }
    await env.DB.prepare(
      `INSERT INTO presence (account_id, kind, device, name, app_version, last_seen) VALUES (?1,?2,?3,?4,?5,?6)
       ON CONFLICT(account_id, kind, device) DO UPDATE SET name=excluded.name, app_version=COALESCE(NULLIF(excluded.app_version,''), presence.app_version), last_seen=excluded.last_seen
       WHERE presence.last_seen < ?7`
    ).bind(a.id, c.kind, String(a.sid).slice(0, 32), String(a.session_device || "").slice(0, 60), c.version, now, now - EVERY).run();
  } catch (e) {
  }
}
__name(notePresence, "notePresence");
async function prunePresence(env) {
  await env.DB.prepare("DELETE FROM presence WHERE last_seen < ?1").bind(Date.now() - 7 * 864e5).run();
}
__name(prunePresence, "prunePresence");
async function onlineRoute(req, env) {
  const json16 = /* @__PURE__ */ __name((o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
  const acc = await sessionAccount(req, env);
  if (!acc || !isAdmin(env, acc.id)) return json16({ error: "only the admins of this server can do this" }, 403);
  const now = Date.now(), on = now - 3 * 6e4;
  const r4 = await env.DB.prepare(
    `SELECT p.account_id AS accountId, p.kind, p.name AS device, p.app_version AS version, p.last_seen AS lastSeen, a.display AS nick
     FROM presence p LEFT JOIN accounts a ON a.id=p.account_id WHERE p.last_seen > ?1 ORDER BY p.last_seen DESC LIMIT 500`
  ).bind(now - 864e5).all().catch(() => ({ results: [] }));
  const rows = r4.results || [];
  const count = /* @__PURE__ */ __name((list) => {
    const c = Object.fromEntries(KINDS.map((k) => [k, 0]));
    const accs = /* @__PURE__ */ new Set();
    for (const x of list) {
      c[x.kind] = (c[x.kind] || 0) + 1;
      accs.add(x.accountId);
    }
    return { ...c, accounts: accs.size, devices: list.length };
  }, "count");
  const online = rows.filter((x) => x.lastSeen > on), recent2 = rows.filter((x) => x.lastSeen <= on);
  return json16({ now, online, recent: recent2, counts: { online: count(online), recent: count(rows) } });
}
__name(onlineRoute, "onlineRoute");

// src/escrow.js
var isDataKey = /* @__PURE__ */ __name((v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v), "isDataKey");
var escrowReady = /* @__PURE__ */ __name((env) => !!env.DATA_KEY, "escrowReady");
var cleanEmail = /* @__PURE__ */ __name((e) => typeof e === "string" ? e.trim().toLowerCase() : "", "cleanEmail");
var isEmail = /* @__PURE__ */ __name((e) => e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e), "isEmail");
async function sealEscrow(env, key2, email, emailOK) {
  if (!escrowReady(env)) return { error: "the server cannot keep the key", status: 503 };
  const k = typeof key2 === "string" ? key2.trim().toLowerCase() : "";
  if (!isDataKey(k)) return { error: "missing key", status: 400 };
  const e = cleanEmail(email);
  const keep = e && isEmail(e) && await emailOK(e) ? e : "";
  return { value: await sealData(env, JSON.stringify(keep ? { k, e: keep } : { k })) };
}
__name(sealEscrow, "sealEscrow");
async function openEscrow(env, s) {
  if (typeof s !== "string" || !s.startsWith("enc:") || !escrowReady(env)) return null;
  try {
    const o = JSON.parse(await openData(env, s));
    return o && isDataKey(o.k) ? { key: o.k, email: typeof o.e === "string" ? o.e : "" } : null;
  } catch (e) {
    return null;
  }
}
__name(openEscrow, "openEscrow");
async function escrowLogin(env, a) {
  const x = await openEscrow(env, a && a.escrow);
  return x ? { dataKey: x.key, email: x.email || void 0, escrow: true } : { needKey: true, escrow: false };
}
__name(escrowLogin, "escrowLogin");

// src/google.js
var SITE4 = "https://pitlanehq.app";
var AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
var TOKEN = "https://oauth2.googleapis.com/token";
var hexOf2 = /* @__PURE__ */ __name((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""), "hexOf");
var rid3 = /* @__PURE__ */ __name(() => hexOf2(crypto.getRandomValues(new Uint8Array(24))), "rid");
var isHex483 = /* @__PURE__ */ __name((v) => typeof v === "string" && /^[0-9a-f]{48}$/.test(v), "isHex48");
var portOf3 = /* @__PURE__ */ __name((v) => Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) < 65536 ? Number(v) : null, "portOf");
var siteOf3 = /* @__PURE__ */ __name((env, url) => env.LOCAL === "1" && url ? url.origin : SITE4, "siteOf");
var back = /* @__PURE__ */ __name((env, url) => siteOf3(env, url) + "/google/oauth", "back");
var googleReady = /* @__PURE__ */ __name((env) => env.GOOGLE_ON === "1" && !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), "googleReady");
async function googleStart(env, url, device, port, app) {
  if (portOf3(port) && appOf(app)) return { error: "port or app, not both" };
  const state = rid3(), code = rid3(), now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM google_oauth WHERE expires<?1").bind(now),
    env.DB.prepare("INSERT INTO google_oauth (state_hash, code_hash, device, port, app, expires) VALUES (?1,?2,?3,?4,?5,?6)").bind(await sha256("google-oauth:" + state), await sha256("google-code:" + code), cleanName(device) || null, portOf3(port), appOf(app) ? 1 : 0, now + 10 * 6e4)
  ]);
  const q2 = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, response_type: "code", scope: "openid email profile", redirect_uri: back(env, url), state, prompt: "select_account" });
  return { url: AUTH + "?" + q2, state, code };
}
__name(googleStart, "googleStart");
function googleUser(idToken, clientId, now = Date.now()) {
  try {
    const p = JSON.parse(atob(String(idToken).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!p || p.iss !== "https://accounts.google.com" && p.iss !== "accounts.google.com") return null;
    if (p.aud !== clientId || !(Number(p.exp) * 1e3 > now) || !/^[0-9]{5,40}$/.test(String(p.sub || ""))) return null;
    const verified = p.email_verified === true || p.email_verified === "true";
    const email = verified && typeof p.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email) ? p.email.trim().toLowerCase() : "";
    return { sub: String(p.sub), email, name: cleanName(p.name || p.given_name || "") };
  } catch (e) {
    return null;
  }
}
__name(googleUser, "googleUser");
async function newGrant3(env, kind, st, me2, ttl) {
  const g = rid3();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM google_grants WHERE expires<?1").bind(Date.now()),
    env.DB.prepare("INSERT INTO google_grants (grant_hash, code_hash, sub, email_hash, email, name, device, kind, expires) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(await sha256("google-grant:" + g), st.code_hash, me2.sub, me2.email ? await emailHash(env, me2.email) : null, me2.email && env.DATA_KEY ? await sealData(env, me2.email) : null, me2.name || null, st.device, kind, Date.now() + ttl)
  ]);
  return g;
}
__name(newGrant3, "newGrant");
async function useGoogleGrant(env, g, kind, code) {
  if (!isHex483(g) || !isHex483(code)) return null;
  const r4 = await env.DB.prepare("DELETE FROM google_grants WHERE grant_hash=?1 AND kind=?2 RETURNING code_hash, sub, email_hash, email, name, device, expires").bind(await sha256("google-grant:" + g), kind).first();
  if (!r4 || r4.expires < Date.now() || r4.code_hash !== await sha256("google-code:" + code)) return null;
  let email = "";
  try {
    email = r4.email ? String(await openData(env, r4.email)) : "";
  } catch (e) {
  }
  return { ...r4, email };
}
__name(useGoogleGrant, "useGoogleGrant");
var googleLinked = /* @__PURE__ */ __name(async (env, sub) => (await env.DB.prepare("SELECT account_id FROM google_links WHERE sub=?1").bind(sub).first() || {}).account_id || null, "googleLinked");
async function googleAccountId(env, sub, eh) {
  const id2 = await googleLinked(env, sub);
  if (id2 || !eh) return id2;
  return (await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first() || {}).id || null;
}
__name(googleAccountId, "googleAccountId");
async function linkGoogle(env, sub, accountId) {
  const other = await googleLinked(env, sub);
  if (other && other !== accountId) return "taken";
  await env.DB.batch([
    env.DB.prepare("DELETE FROM google_links WHERE sub=?1 OR account_id=?2").bind(sub, accountId),
    env.DB.prepare("INSERT INTO google_links (sub, account_id, created) VALUES (?1,?2,?3)").bind(sub, accountId, Date.now())
  ]);
  return "ok";
}
__name(linkGoogle, "linkGoogle");
async function googleOAuth(req, env, url) {
  const base2 = siteOf3(env, url);
  const state = url.searchParams.get("state") || "", code = url.searchParams.get("code") || "";
  if (!isHex483(state)) return Response.redirect(base2 + "/?googleLogin=0", 302);
  const st = await env.DB.prepare("DELETE FROM google_oauth WHERE state_hash=?1 RETURNING code_hash, device, port, app, expires").bind(await sha256("google-oauth:" + state)).first();
  const to = /* @__PURE__ */ __name((q2) => goOn(base2, "google", st, state, q2), "to");
  if (!st || st.expires < Date.now() || !code || !googleReady(env)) return to("googleLogin=0");
  try {
    const t = await fetch(TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: back(env, url) })
    });
    const tok = t.ok ? await t.json() : null;
    const me2 = tok && tok.id_token ? googleUser(tok.id_token, env.GOOGLE_CLIENT_ID) : null;
    if (!me2) return to("googleLogin=0");
    if (await googleAccountId(env, me2.sub, me2.email ? await emailHash(env, me2.email) : null)) return to("googleLogin=" + await newGrant3(env, "login", st, me2, 5 * 6e4));
    const q2 = new URLSearchParams({ googleLogin: "0", new: "1", sid: await newGrant3(env, "signup", st, me2, 30 * 6e4) });
    if (me2.name) q2.set("name", me2.name);
    return to(String(q2));
  } catch (e) {
    return to("googleLogin=0");
  }
}
__name(googleOAuth, "googleOAuth");

// src/accounts.js
var JSONH4 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
var json6 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH4 }), "json");
var err3 = /* @__PURE__ */ __name((msg, status) => json6({ error: msg }, status), "err");
var hex2 = /* @__PURE__ */ __name((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""), "hex");
var rid4 = /* @__PURE__ */ __name((n = 12) => hex2(crypto.getRandomValues(new Uint8Array(n))), "rid");
async function sha256(t) {
  return hex2(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
}
__name(sha256, "sha256");
function same3(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
__name(same3, "same");
var isKey = /* @__PURE__ */ __name((v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v), "isKey");
var isB64 = /* @__PURE__ */ __name((v, max) => typeof v === "string" && v.length > 20 && v.length <= max && /^[A-Za-z0-9+/=]+$/.test(v), "isB64");
var cleanName = /* @__PURE__ */ __name((a) => (typeof a === "string" ? a : "").slice(0, 32).replace(/[\u0000-\u001f<>]/g, "").trim(), "cleanName");
var emailHash = /* @__PURE__ */ __name((env, e) => sha256("pitlanehq-email:" + (env.EMAIL_PEPPER || "") + ":" + String(e || "").trim().toLowerCase()), "emailHash");
var authHash = /* @__PURE__ */ __name((salt, auth) => sha256(salt + ":" + auth), "authHash");
var keyTag = /* @__PURE__ */ __name(async (wrapped) => (await sha256("pitlanehq-key:" + String(wrapped || ""))).slice(0, 16), "keyTag");
var ipOf = /* @__PURE__ */ __name((req) => req.headers.get("cf-connecting-ip") || "unknown", "ipOf");
var CHUNK = 9e5;
var SESSION_IDLE = 180 * 864e5;
var SESSION_MAX = 400 * 864e5;
async function tooMany(env, keys, limits) {
  const since = Date.now() - 15 * 6e4;
  await env.DB.prepare("DELETE FROM auth_fails WHERE t < ?1").bind(since).run();
  for (let i = 0; i < keys.length; i++) {
    const r4 = await env.DB.prepare("SELECT COUNT(*) AS n FROM auth_fails WHERE k=?1 AND t>=?2").bind(keys[i], since).first();
    if (r4 && r4.n >= limits[i]) return true;
  }
  return false;
}
__name(tooMany, "tooMany");
var fail = /* @__PURE__ */ __name((env, keys) => env.DB.batch(keys.map((k) => env.DB.prepare("INSERT INTO auth_fails (k, t) VALUES (?1, ?2)").bind(k, Date.now()))), "fail");
async function newSession(env, accountId, device, gated) {
  const token = rid4(32);
  await env.DB.prepare("INSERT INTO account_sessions (id, account_id, token_hash, device, created, last_seen, gated) VALUES (?1,?2,?3,?4,?5,?5,?6)").bind(rid4(8), accountId, await sha256(token), cleanName(device) || "PC", Date.now(), gated ? 1 : 0).run();
  return token;
}
__name(newSession, "newSession");
var gatedError = /* @__PURE__ */ __name(() => Object.assign(new Error("verify your email first: we sent you a link, open it and then sign in"), { gated: true }), "gatedError");
async function sessionAccount(req, env, gate) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (t.length < 40) return null;
  const s = await env.DB.prepare(
    "SELECT s.id AS sid, s.last_seen, s.created AS session_created, s.device AS session_device, s.gated AS session_gated, a.* FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=?1"
  ).bind(await sha256(t)).first();
  if (!s) return null;
  if (Date.now() - s.last_seen > SESSION_IDLE || Date.now() - s.session_created > SESSION_MAX) {
    await env.DB.prepare("DELETE FROM account_sessions WHERE id=?1").bind(s.sid).run();
    return null;
  }
  if (s.session_gated && !s.verified && !gate) throw gatedError();
  if (Date.now() - s.last_seen > 36e5) await env.DB.prepare("UPDATE account_sessions SET last_seen=?2 WHERE id=?1").bind(s.sid, Date.now()).run();
  return s;
}
__name(sessionAccount, "sessionAccount");
async function newEmailToken(env, accountId, kind, ttl) {
  const t = rid4(24);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM email_tokens WHERE (account_id=?1 AND kind=?2) OR expires<?3").bind(accountId, kind, Date.now()),
    env.DB.prepare("INSERT INTO email_tokens (token_hash, account_id, kind, expires) VALUES (?1,?2,?3,?4)").bind(await sha256(t), accountId, kind, Date.now() + ttl)
  ]);
  return t;
}
__name(newEmailToken, "newEmailToken");
async function useEmailToken(env, t, kind, consume) {
  if (typeof t !== "string" || !/^[0-9a-f]{48}$/.test(t)) return null;
  const h = await sha256(t);
  const r4 = await env.DB.prepare("SELECT account_id, expires FROM email_tokens WHERE token_hash=?1 AND kind=?2").bind(h, kind).first();
  if (!r4 || r4.expires < Date.now()) return null;
  if (consume) await env.DB.prepare("DELETE FROM email_tokens WHERE token_hash=?1").bind(h).run();
  return r4.account_id;
}
__name(useEmailToken, "useEmailToken");
var VERIFY_SINCE = 1791396e6;
var mustVerify = /* @__PURE__ */ __name((env, a) => !a.verified && (a.created || 0) >= VERIFY_SINCE && mailReady(env) && !isAdmin(env, a.id), "mustVerify");
async function mailVerify(env, url, accountId, email, l) {
  if (!mailReady(env)) return false;
  const t = await newEmailToken(env, accountId, "verify", 7 * 864e5);
  return sendVerify(env, email, url.origin + "/account/verify?t=" + t + "&lang=" + lang(l), l);
}
__name(mailVerify, "mailVerify");
var accountRows = /* @__PURE__ */ __name((env, id2) => [
  env.DB.prepare("DELETE FROM account_sync_chunks WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM account_sync WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM email_tokens WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM recovery_codes WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM login_pending WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM profile_races WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM league_hits WHERE league_id IN (SELECT id FROM leagues WHERE owner=?1)").bind(id2),
  env.DB.prepare("DELETE FROM league_days WHERE league_id IN (SELECT id FROM leagues WHERE owner=?1)").bind(id2),
  env.DB.prepare("DELETE FROM leagues WHERE owner=?1").bind(id2),
  env.DB.prepare("DELETE FROM discord_members WHERE discord_id IN (SELECT discord_id FROM discord_links WHERE account_id=?1)").bind(id2),
  env.DB.prepare("DELETE FROM discord_links WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM discord_oauth WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM discord_grants WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM steam_links WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM steam_oauth WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM steam_grants WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM google_links WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM usage_days WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM feedback WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM feedback_ask WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM support_msgs WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM support_logs WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM alerts WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM alert_subs WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM push_tokens WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM alerts WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM alert_subs WHERE account_id=?1").bind(id2),
  env.DB.prepare("UPDATE crash_reports SET last_account=NULL WHERE last_account=?1").bind(id2),
  env.DB.prepare("DELETE FROM support_threads WHERE account_id=?1").bind(id2),
  env.DB.prepare("DELETE FROM accounts WHERE id=?1").bind(id2)
], "accountRows");
async function deleteAccount(env, id2) {
  const up = "acct:" + id2;
  await env.DB.batch([
    // a shared lap without its own telemetry showed the same lap of the account: it keeps it now
    env.DB.prepare(`UPDATE community_laps SET trace=(SELECT a.trace FROM laps a JOIN sessions s ON s.id=a.session_id
        WHERE s.uploader=?2 AND ABS(a.time-community_laps.time)<0.002 AND s.game=community_laps.game AND a.valid=1 AND a.trace IS NOT NULL LIMIT 1)
      WHERE user_id=?1 AND trace IS NULL AND EXISTS (SELECT 1 FROM community_laps c2 WHERE c2.user_id=?1 AND c2.trace IS NOT NULL)`).bind(id2, up),
    env.DB.prepare("UPDATE community_laps SET anon=1 WHERE user_id=?1").bind(id2),
    env.DB.prepare("UPDATE community_users SET alias='Anonymous', iracing=NULL, owner=NULL, token_hash='deleted:'||id WHERE id=?1").bind(id2),
    // the rivals of your races and your Drinks drivers are other people: their laps stay as they are
    env.DB.prepare("UPDATE community_users SET owner=NULL WHERE owner=?1").bind(id2),
    env.DB.prepare("DELETE FROM driver_links WHERE account_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM driver_link_seen WHERE account_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM driver_link_moves WHERE account_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM community_reports WHERE user_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM community_setups WHERE user_id=?1").bind(id2),
    // of your own laps only the ones the model learns from stay (valid, with telemetry), under no name
    env.DB.prepare("DELETE FROM laps WHERE session_id IN (SELECT id FROM sessions WHERE uploader=?1) AND (valid<>1 OR trace IS NULL OR time<=10)").bind(up),
    env.DB.prepare("DELETE FROM sessions WHERE uploader=?1 AND NOT EXISTS (SELECT 1 FROM laps WHERE session_id=sessions.id)").bind(up),
    ...accountRows(env, id2)
  ]);
}
__name(deleteAccount, "deleteAccount");
async function purgeAccount(env, id2) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM laps WHERE session_id IN (SELECT id FROM sessions WHERE uploader=?1)").bind("acct:" + id2),
    env.DB.prepare("DELETE FROM sessions WHERE uploader=?1").bind("acct:" + id2),
    env.DB.prepare("DELETE FROM community_laps WHERE user_id IN (SELECT id FROM community_users WHERE owner=?1)").bind(id2),
    env.DB.prepare("DELETE FROM community_users WHERE owner=?1").bind(id2),
    env.DB.prepare("DELETE FROM driver_links WHERE account_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM driver_link_seen WHERE account_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM driver_link_moves WHERE account_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM community_laps WHERE user_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM community_reports WHERE user_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM community_setups WHERE user_id=?1").bind(id2),
    env.DB.prepare("DELETE FROM community_users WHERE id=?1").bind(id2),
    ...accountRows(env, id2)
  ]);
}
__name(purgeAccount, "purgeAccount");
async function nameTaken(env, name2, mine) {
  const n = String(name2 || "").trim().toLowerCase();
  if (!n) return false;
  if (n === "anonymous" || n === "an\xF3nimo" || n === "anonimo") return true;
  return !!await env.DB.prepare("SELECT 1 FROM community_users WHERE lower(alias)=?1 AND id<>?2 AND (owner IS NULL OR owner<>?2) AND (token_hash LIKE 'acct:%' OR id LIKE 'guest-%') LIMIT 1").bind(n, mine || "").first();
}
__name(nameTaken, "nameTaken");
var noPassword = /* @__PURE__ */ __name((a) => !!a && !a.auth_hash, "noPassword");
async function signInWays(env, id2) {
  const n = /* @__PURE__ */ __name(async (sql) => (await env.DB.prepare(sql).bind(id2).first() || {}).n || 0, "n");
  return await n("SELECT COUNT(*) AS n FROM steam_links WHERE account_id=?1") + await n("SELECT COUNT(*) AS n FROM discord_links WHERE account_id=?1 AND login=1") + await n("SELECT COUNT(*) AS n FROM google_links WHERE account_id=?1");
}
__name(signInWays, "signInWays");
async function freeName(env, want) {
  const base2 = cleanName(want).replace(/\s+/g, " ").slice(0, 26) || "Driver";
  if (!await nameTaken(env, base2, "")) return base2;
  for (let i = 0; i < 12; i++) {
    const n = i < 6 ? String(i + 2) : String(Math.floor(1e3 + Math.random() * 9e3));
    const c = base2 + " " + n;
    if (!await nameTaken(env, c, "")) return c;
  }
  return "Driver " + rid4(3);
}
__name(freeName, "freeName");
var isAdmin = /* @__PURE__ */ __name((env, id2) => env.LOCAL === "1" || String(env.ADMINS || env.SEASON_UPLOADERS || "").split(",").map((x) => x.trim()).filter(Boolean).includes(id2), "isAdmin");
var testersSet = /* @__PURE__ */ __name((env, id2) => !!id2 && String(env.TESTERS || "").split(",").map((x) => x.trim()).filter(Boolean).includes(id2), "testersSet");
var isTester = /* @__PURE__ */ __name((env, id2, row) => !!id2 && (!!(row && row.tester) || testersSet(env, id2)), "isTester");
async function accounts(req, env, url) {
  if (env.COMMUNITY !== "1") return err3("accounts are not enabled on this server", 404);
  const p = url.pathname.replace(/^\/account/, ""), m = req.method;
  if (m === "OPTIONS") return new Response(null, { status: 204, headers: { ...JSONH4, "access-control-allow-methods": "GET,POST,PUT,DELETE", "access-control-allow-headers": "authorization,content-type", "access-control-max-age": "86400" } });
  const body = m === "POST" || m === "PUT" ? await req.json().catch(() => ({})) : {};
  const ip = "ip:" + await sha256(ipOf(req));
  if (p === "/verify" && m === "GET") {
    const id2 = await useEmailToken(env, url.searchParams.get("t"), "verify", true);
    if (id2) await env.DB.prepare("UPDATE accounts SET verified=1 WHERE id=?1").bind(id2).run();
    return messagePage(pageLang(req, url), !!id2);
  }
  if (p === "/forgot" && m === "GET") return forgotPage(pageLang(req, url), mailReady(env));
  if (p === "/reset" && m === "GET") {
    const t = url.searchParams.get("t") || "";
    if (!await useEmailToken(env, t, "reset", false)) return badLinkPage(pageLang(req, url));
    return resetPage(pageLang(req, url), t);
  }
  if (p === "/forgot" && m === "POST") {
    if (!mailReady(env)) return err3("password reset by email is not set up on this server", 503);
    if (typeof body.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) return err3("write a valid email", 400);
    const eh = await emailHash(env, body.email);
    if (await tooMany(env, ["mail:" + ip, "mail:" + eh], [10, 3])) return err3("too many emails: try again in 15 minutes", 429);
    await fail(env, ["mail:" + ip, "mail:" + eh]);
    const a2 = await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first();
    if (a2) {
      const t = await newEmailToken(env, a2.id, "reset", 36e5);
      await sendReset(env, body.email.trim(), url.origin + "/account/reset?t=" + t + "&lang=" + lang(body.lang), body.lang);
    }
    return json6({ ok: true });
  }
  if (p === "/reset" && m === "POST") {
    if (await tooMany(env, ["reset:" + ip], [10])) return err3("too many tries: wait 15 minutes", 429);
    const id2 = await useEmailToken(env, body.token, "reset", false);
    if (!id2) return err3("this link is not valid any more: ask for a new one", 400);
    if (typeof body.email !== "string" || !isKey(body.auth) || !isB64(body.wrappedKey, 200)) return err3("missing email or key", 400);
    const a2 = await env.DB.prepare("SELECT id, email_hash FROM accounts WHERE id=?1").bind(id2).first();
    if (!a2 || !same3(await emailHash(env, body.email), a2.email_hash)) {
      await fail(env, ["reset:" + ip]);
      return err3("this is not the email of that account", 400);
    }
    const salt = rid4(16);
    await env.DB.batch([
      env.DB.prepare("UPDATE accounts SET auth_salt=?2, auth_hash=?3, wrapped_key=?4, verified=1, escrow=NULL WHERE id=?1").bind(id2, salt, await authHash(salt, body.auth), body.wrappedKey),
      // the synced copy was encrypted with the old password: the PCs upload it again
      env.DB.prepare("DELETE FROM account_sync_chunks WHERE account_id=?1").bind(id2),
      env.DB.prepare("DELETE FROM account_sync WHERE account_id=?1").bind(id2),
      env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?1").bind(id2),
      env.DB.prepare("DELETE FROM email_tokens WHERE account_id=?1").bind(id2)
    ]);
    return json6({ ok: true });
  }
  if (p === "/register" && m === "POST") {
    if (await tooMany(env, ["reg:" + ip], [5])) return err3("too many new accounts from this network, try later", 429);
    if (body.quick) return quickRegister(env, body, ip, req);
    if (typeof body.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) || !isKey(body.auth) || !isB64(body.wrappedKey, 200)) return err3("missing email, key or data key", 400);
    const display = cleanName(body.display);
    if (!display) return err3("choose a public name", 400);
    if (await nameTaken(env, display, "")) return json6({ error: "this nickname is already taken, choose another one", code: "name_taken" }, 409);
    const eh = await emailHash(env, body.email);
    if (await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first()) {
      await fail(env, ["reg:" + ip]);
      return err3("there is already an account with this email", 409);
    }
    let steam = null, discord = null;
    if ([body.sid, body.discordSid, body.googleSid].filter(Boolean).length > 1) return err3("sign up with one of them", 400);
    if (body.sid) {
      steam = await useSteamGrant(env, body.sid, "signup", body.code);
      if (!steam) return err3("this Steam sign-in is not valid any more, sign in with Steam again", 400);
      if (await steamAccountId(env, steam.steamid)) return json6({ error: "this Steam account is already linked to another account", code: "taken" }, 409);
    }
    if (body.discordSid) {
      discord = await useDiscordGrant(env, body.discordSid, "signup", body.code);
      if (!discord) return err3("this Discord sign-in is not valid any more, sign in with Discord again", 400);
      if (await discordLinkedAny(env, discord.discord_id)) return json6({ error: "this Discord account is already linked to another account", code: "taken" }, 409);
    }
    let google = null;
    if (body.googleSid) {
      google = await useGoogleGrant(env, body.googleSid, "signup", body.code);
      if (!google) return err3("this Google sign-in is not valid any more, sign in with Google again", 400);
      if (await googleAccountId(env, google.sub, null)) return json6({ error: "this Google account is already linked to another account", code: "taken" }, 409);
    }
    await fail(env, ["reg:" + ip]);
    const id2 = rid4(), salt = rid4(16);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, name_kind, created) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)").bind(id2, eh, salt, await authHash(salt, body.auth), body.wrappedKey, display, body.nameKind === "iracing" ? "iracing" : "nick", Date.now()),
      env.DB.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES (?1,?2,?3,?4)").bind(id2, "acct:" + id2, display, Date.now()),
      signupSrc(env, req, id2, body)
    ]);
    if (steam) await linkSteam(env, steam.steamid, id2, steam.persona);
    if (google) await linkGoogle(env, google.sub, id2);
    const taken = discord && await linkDiscordLogin(env, discord, id2) === "taken" ? { discordTaken: true } : {};
    await patreonOnRegister(env, id2, eh).catch(() => {
    });
    await proOnRegister(env, id2, eh).catch(() => {
    });
    const mailed = await mailVerify(env, url, id2, body.email.trim(), body.lang).catch(() => false);
    if (mailed && body.gate) {
      const token2 = await newSession(env, id2, body.device, true);
      return json6({ id: id2, token: token2, display, nameKind: body.nameKind === "iracing" ? "iracing" : "nick", wrappedKey: body.wrappedKey, keyTag: await keyTag(body.wrappedKey), admin: isAdmin(env, id2), tester: isTester(env, id2), verified: false, mailed: true, gated: true, escrow: false, ...taken });
    }
    if (mailed) return json6({ verifyFirst: true, mailed: true, error: "verify your email first: we sent you a link, open it and then sign in", code: "verify_first", ...taken }, 202);
    const token = await newSession(env, id2, body.device);
    return json6({ id: id2, token, display, nameKind: body.nameKind === "iracing" ? "iracing" : "nick", wrappedKey: body.wrappedKey, keyTag: await keyTag(body.wrappedKey), admin: isAdmin(env, id2), tester: isTester(env, id2), verified: false, mailed, escrow: false, ...taken });
  }
  const signedIn = /* @__PURE__ */ __name(async (a2, token, social) => json6({ id: a2.id, token, display: a2.display, nameKind: a2.name_kind, anon: !!a2.anon, wrappedKey: social ? void 0 : a2.wrapped_key, keyTag: await keyTag(a2.wrapped_key), admin: isAdmin(env, a2.id), tester: isTester(env, a2.id, a2), verified: !!a2.verified, twoFactor: !!a2.totp_on, escrow: !!a2.escrow, noPassword: noPassword(a2) || void 0, ...social ? await escrowLogin(env, a2) : {} }), "signedIn");
  if (p === "/steam/login/start" && (m === "GET" || m === "POST")) {
    if (await tooMany(env, ["steam:" + ip], [30])) return err3("too many tries: wait 15 minutes", 429);
    await fail(env, ["steam:" + ip]);
    const q2 = m === "GET" ? url.searchParams : null;
    const r4 = await steamStart(env, url, "login", null, q2 ? q2.get("device") : body.device, q2 ? q2.get("port") : body.port, body.app || url.searchParams.get("app"));
    return json6(r4, r4.error ? 400 : 200);
  }
  if (p === "/discord/login/start" && (m === "GET" || m === "POST")) {
    if (!oauthReady(env)) return err3("Discord sign-in is not set up on this server yet", 503);
    if (await tooMany(env, ["discord:" + ip], [30])) return err3("too many tries: wait 15 minutes", 429);
    await fail(env, ["discord:" + ip]);
    const q2 = m === "GET" ? url.searchParams : null;
    const r4 = await discordStart(env, url, "login", null, q2 ? q2.get("device") : body.device, q2 ? q2.get("port") : body.port, body.app || url.searchParams.get("app"));
    return json6(r4, r4.error ? 400 : 200);
  }
  if (p === "/google/login/start" && (m === "GET" || m === "POST")) {
    if (!googleReady(env)) return err3("Google sign-in is not set up on this server yet", 503);
    if (await tooMany(env, ["google:" + ip], [30])) return err3("too many tries: wait 15 minutes", 429);
    await fail(env, ["google:" + ip]);
    const q2 = m === "GET" ? url.searchParams : null;
    const r4 = await googleStart(env, url, q2 ? q2.get("device") : body.device, q2 ? q2.get("port") : body.port, body.app || url.searchParams.get("app"));
    return json6(r4, r4.error ? 400 : 200);
  }
  if (p === "/login" && m === "POST") {
    if (typeof body.email !== "string" || !isKey(body.auth)) return err3("missing email or key", 400);
    const eh = await emailHash(env, body.email), keys = ["login:" + eh, ip];
    if (await tooMany(env, keys, [5, 30])) return err3("too many wrong passwords: wait 15 minutes", 429);
    const a2 = await env.DB.prepare("SELECT * FROM accounts WHERE email_hash=?1").bind(eh).first();
    if (!a2) {
      await fail(env, [ip]);
      return json6({ error: "there is no account with this email: create one", code: "no_account" }, 404);
    }
    if (noPassword(a2)) {
      await fail(env, keys);
      return json6({ error: "this account signs in with Steam, Discord or Google", code: "social_only" }, 401);
    }
    if (!same3(await authHash(a2.auth_salt, body.auth), a2.auth_hash)) {
      await fail(env, keys);
      return err3("wrong email or password", 401);
    }
    if (mustVerify(env, a2)) {
      const recent2 = await env.DB.prepare("SELECT 1 FROM email_tokens WHERE account_id=?1 AND kind='verify' AND expires>?2").bind(a2.id, Date.now() + 7 * 864e5 - 12e4).first();
      if (!recent2) await mailVerify(env, url, a2.id, body.email.trim(), body.lang).catch(() => false);
      if (body.gate) return json6({ ...await (await signedIn(a2, await newSession(env, a2.id, body.device, true))).json(), gated: true });
      return json6({ error: "verify your email first: we sent you a link, open it and then sign in", code: "verify_first" }, 403);
    }
    if (a2.totp_on) {
      const t = rid4(24);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM login_pending WHERE expires<?1").bind(Date.now()),
        env.DB.prepare("INSERT INTO login_pending (token_hash, account_id, device, expires) VALUES (?1,?2,?3,?4)").bind(await sha256(t), a2.id, cleanName(body.device) || "PC", Date.now() + 5 * 6e4)
      ]);
      return json6({ twoFactor: true, pending: t });
    }
    return signedIn(a2, await newSession(env, a2.id, body.device));
  }
  if ((p === "/login/steam" || p === "/login/discord" || p === "/login/google") && m === "POST") {
    if (await tooMany(env, [ip], [30])) return err3("too many tries: wait 15 minutes", 429);
    const prov = p.slice(7), label = { steam: "Steam", discord: "Discord", google: "Google" }[prov];
    const g = prov === "discord" ? await useDiscordGrant(env, body.grant, "login", body.code) : prov === "google" ? await useGoogleGrant(env, body.grant, "login", body.code) : await useSteamGrant(env, body.grant, "login", body.code);
    const aid = g ? prov === "discord" ? await discordAccountId(env, g.discord_id) : prov === "google" ? await googleAccountId(env, g.sub, g.email_hash) : await steamAccountId(env, g.steamid) : null;
    let a2 = aid ? await env.DB.prepare("SELECT * FROM accounts WHERE id=?1").bind(aid).first() : null;
    if (a2 && prov === "google") {
      if (await linkGoogle(env, g.sub, a2.id) === "taken") a2 = null;
      else if (!a2.verified && g.email_hash && g.email_hash === a2.email_hash) {
        await env.DB.prepare("UPDATE accounts SET verified=1 WHERE id=?1").bind(a2.id).run();
        a2.verified = 1;
      }
    }
    if (!a2) {
      await fail(env, [ip]);
      return err3(`this ${label} sign-in is not valid any more, sign in with ${label} again`, 401);
    }
    const device = cleanName(body.device) || g.device || "PC";
    if (mustVerify(env, a2)) {
      if (body.gate) return json6({ ...await (await signedIn(a2, await newSession(env, a2.id, device, true), true)).json(), gated: true });
      return json6({ error: "verify your email first: we sent you a link, open it and then sign in", code: "verify_first" }, 403);
    }
    if (a2.totp_on) {
      const t = rid4(24);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM login_pending WHERE expires<?1").bind(Date.now()),
        // steam 1: the session comes without the wrapped key, with the server's copy of the data key (Steam or Discord signed in)
        env.DB.prepare("INSERT INTO login_pending (token_hash, account_id, device, expires, steam) VALUES (?1,?2,?3,?4,1)").bind(await sha256(t), a2.id, device, Date.now() + 5 * 6e4)
      ]);
      return json6({ twoFactor: true, pending: t, needKey: !a2.escrow });
    }
    return signedIn(a2, await newSession(env, a2.id, device), true);
  }
  if (p === "/login/2fa" && m === "POST") {
    if (typeof body.pending !== "string" || !/^[0-9a-f]{48}$/.test(body.pending)) return err3("sign in again", 400);
    const ph = await sha256(body.pending);
    const pend = await env.DB.prepare("SELECT * FROM login_pending WHERE token_hash=?1").bind(ph).first();
    if (!pend || pend.expires < Date.now()) return err3("the code took too long: sign in again", 401);
    const keys = ["2fa:" + pend.account_id, ip];
    if (await tooMany(env, keys, [5, 30])) return err3("too many wrong codes: wait 15 minutes", 429);
    const a2 = await env.DB.prepare("SELECT * FROM accounts WHERE id=?1").bind(pend.account_id).first();
    if (!a2 || !a2.totp_on) return err3("sign in again", 401);
    const code = String(body.code || "").trim().toLowerCase();
    let ok = await totpOK(await openData(env, a2.totp), code);
    if (!ok && /^[a-z0-9]{4}-?[a-z0-9]{4}$/.test(code)) {
      const h = await sha256("recovery:" + code.replace("-", ""));
      const r4 = await env.DB.prepare("DELETE FROM recovery_codes WHERE account_id=?1 AND code_hash=?2 RETURNING code_hash").bind(a2.id, h).first();
      ok = !!r4;
    }
    if (!ok) {
      await fail(env, keys);
      return err3("wrong code", 401);
    }
    await env.DB.prepare("DELETE FROM login_pending WHERE token_hash=?1").bind(ph).run();
    return signedIn(a2, await newSession(env, a2.id, pend.device), !!pend.steam);
  }
  const a = await sessionAccount(req, env, true);
  if (!a) return err3("signed out: sign in again", 401);
  const gated = !!a.session_gated && !a.verified;
  if (gated && !(p === "/me" && m === "GET" || p === "/verify/resend" || p === "/logout" || p === "/delete"))
    return json6({ error: "verify your email first: we sent you a link, open it and then sign in", code: "verify_first" }, 403);
  if (m === "GET" && (p === "/me" || p === "/sync" || p === "/sync/meta")) await notePresence(env, req, a);
  const reauth = /* @__PURE__ */ __name(async () => noPassword(a) || isKey(body.auth) && same3(await authHash(a.auth_salt, body.auth), a.auth_hash), "reauth");
  const SOCIAL_ONLY = /* @__PURE__ */ __name(() => json6({ error: "this account signs in with Steam, Discord or Google", code: "social_only" }, 400), "SOCIAL_ONLY");
  if (noPassword(a) && m === "POST" && (p === "/steam/unlink" || p === "/discord/unlink" || p === "/google/unlink") && await signInWays(env, a.id) <= 1)
    return json6({ error: "this is the only way you sign in to this account", code: "last_way" }, 409);
  const passCheck = /* @__PURE__ */ __name(async () => {
    if (await tooMany(env, ["login:" + a.email_hash], [5])) return err3("too many wrong passwords: wait 15 minutes", 429);
    if (await reauth()) return null;
    await fail(env, ["login:" + a.email_hash]);
    return err3("the password is wrong", 401);
  }, "passCheck");
  if (p === "/steam" || p.startsWith("/steam/")) return steamAccount(env, a, p, m, body, url, passCheck);
  if (p === "/google" && m === "GET") return json6({ linked: !!await env.DB.prepare("SELECT 1 FROM google_links WHERE account_id=?1").bind(a.id).first(), oauth: googleReady(env) });
  if (p === "/google/unlink" && m === "POST") {
    const no = await passCheck();
    if (no) return no;
    await env.DB.prepare("DELETE FROM google_links WHERE account_id=?1").bind(a.id).run();
    return json6({ ok: true });
  }
  if (p === "/discord" || p.startsWith("/discord/")) return discordAccount(env, a, p, m, body, url, passCheck);
  if (p === "/key" && m === "POST") {
    if (noPassword(a)) return SOCIAL_ONLY();
    const no = await passCheck();
    if (no) return no;
    return json6({ wrappedKey: a.wrapped_key, keyTag: await keyTag(a.wrapped_key) });
  }
  if (p === "/escrow" && m === "POST") {
    const r4 = await sealEscrow(env, body.key, body.email, async (e) => same3(await emailHash(env, e), a.email_hash));
    if (r4.error) return err3(r4.error, r4.status);
    await env.DB.prepare("UPDATE accounts SET escrow=?2 WHERE id=?1").bind(a.id, r4.value).run();
    return json6({ ok: true, escrow: true });
  }
  if (p === "/me" && m === "GET") return json6({ id: a.id, display: a.display, nameKind: a.name_kind, anon: !!a.anon, created: a.created, admin: isAdmin(env, a.id), tester: isTester(env, a.id, a), supporter: !!a.supporter, supporterHidden: !!a.supporter_hidden, ...proOf(a), ...await proHere(env, a, url.searchParams), proGate: await proGate(env), verified: !!a.verified, mail: mailReady(env), twoFactor: !!a.totp_on, escrow: !!a.escrow, noPassword: noPassword(a) || void 0, gated: gated || void 0, google: !!await env.DB.prepare("SELECT 1 FROM google_links WHERE account_id=?1").bind(a.id).first(), recoveryLeft: a.totp_on ? (await env.DB.prepare("SELECT COUNT(*) AS n FROM recovery_codes WHERE account_id=?1").bind(a.id).first() || {}).n || 0 : 0 });
  if (p === "/2fa/setup" && m === "POST") {
    if (noPassword(a)) return SOCIAL_ONLY();
    if (await tooMany(env, ["login:" + a.email_hash], [5])) return err3("too many wrong passwords: wait 15 minutes", 429);
    if (!await reauth()) {
      await fail(env, ["login:" + a.email_hash]);
      return err3("the password is wrong", 401);
    }
    if (a.totp_on) return err3("two-step sign-in is already on", 409);
    const secret = newTotpSecret();
    await env.DB.prepare("UPDATE accounts SET totp_pending=?2 WHERE id=?1").bind(a.id, await sealData(env, secret)).run();
    return json6({ secret, url: otpauthURL(secret, a.display || a.id) });
  }
  if (p === "/2fa/enable" && m === "POST") {
    if (a.totp_on) return err3("two-step sign-in is already on", 409);
    if (!a.totp_pending) return err3("start the setup first", 400);
    if (await tooMany(env, ["2fa:" + a.id], [5])) return err3("too many wrong codes: wait 15 minutes", 429);
    const secret = await openData(env, a.totp_pending);
    if (!await totpOK(secret, body.code)) {
      await fail(env, ["2fa:" + a.id]);
      return err3("wrong code: check the time of your phone and try again", 401);
    }
    const codes = newRecoveryCodes();
    await env.DB.batch([
      env.DB.prepare("UPDATE accounts SET totp=?2, totp_on=1, totp_pending=NULL WHERE id=?1").bind(a.id, await sealData(env, secret)),
      env.DB.prepare("DELETE FROM recovery_codes WHERE account_id=?1").bind(a.id),
      ...await Promise.all(codes.map(async (c) => env.DB.prepare("INSERT INTO recovery_codes (account_id, code_hash) VALUES (?1,?2)").bind(a.id, await sha256("recovery:" + c.replace("-", ""))))),
      env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?1 AND id<>?2").bind(a.id, a.sid)
      // every other device signs in again, with the code
    ]);
    return json6({ ok: true, codes });
  }
  if (p === "/2fa/disable" && m === "POST") {
    if (!a.totp_on) return json6({ ok: true });
    if (await tooMany(env, ["login:" + a.email_hash, "2fa:" + a.id], [5, 5])) return err3("too many attempts: wait 15 minutes", 429);
    const code = String(body.code || "").trim().toLowerCase();
    let codeOK = await totpOK(await openData(env, a.totp), code);
    if (!codeOK && /^[a-z0-9]{4}-?[a-z0-9]{4}$/.test(code)) codeOK = !!await env.DB.prepare("SELECT 1 AS x FROM recovery_codes WHERE account_id=?1 AND code_hash=?2").bind(a.id, await sha256("recovery:" + code.replace("-", ""))).first();
    if (!await reauth() || !codeOK) {
      await fail(env, ["login:" + a.email_hash, "2fa:" + a.id]);
      return err3("the password or the code is wrong", 401);
    }
    await env.DB.batch([
      env.DB.prepare("UPDATE accounts SET totp=NULL, totp_on=0, totp_pending=NULL WHERE id=?1").bind(a.id),
      env.DB.prepare("DELETE FROM recovery_codes WHERE account_id=?1").bind(a.id)
    ]);
    return json6({ ok: true });
  }
  if (p === "/me" && m === "POST") {
    const display = cleanName(body.display);
    if (!display) return err3("choose a public name", 400);
    if (await nameTaken(env, display, a.id)) return json6({ error: "this nickname is already taken, choose another one", code: "name_taken" }, 409);
    const anon = body.anon === void 0 ? !!a.anon : body.anon ? 1 : 0;
    const kind = body.nameKind === "iracing" ? "iracing" : "nick", was = a.name_kind === "iracing" ? "iracing" : "nick";
    const q2 = [
      env.DB.prepare("UPDATE accounts SET display=?2, name_kind=?3, anon=?4 WHERE id=?1").bind(a.id, display, kind, anon ? 1 : 0),
      env.DB.prepare("UPDATE community_users SET alias=?2 WHERE id=?1").bind(a.id, display)
    ];
    if (kind === "iracing") q2.push(env.DB.prepare("UPDATE community_users SET iracing=?2 WHERE id=?1").bind(a.id, display));
    if (kind !== was) for (const t of ["community_laps", "community_reports"])
      q2.push(env.DB.prepare(`UPDATE ${t} SET shown=?2 WHERE user_id=?1 AND anon=0 AND COALESCE(shown,'nick')=?3`).bind(a.id, kind, was));
    await env.DB.batch(q2);
    return json6({ ok: true, display, nameKind: kind, anon: !!anon });
  }
  if (p === "/verify/resend" && m === "POST") {
    if (a.verified) return json6({ ok: true, verified: true });
    if (!mailReady(env)) return err3("emails are not set up on this server", 503);
    if (typeof body.email !== "string" || !same3(await emailHash(env, body.email), a.email_hash)) return err3("this is not the email of your account", 400);
    if (await tooMany(env, ["mail:" + a.id], [3])) return err3("too many emails: try again in 15 minutes", 429);
    await fail(env, ["mail:" + a.id]);
    return json6({ ok: await mailVerify(env, url, a.id, body.email.trim(), body.lang) });
  }
  if (p === "/mail/test" && m === "POST") {
    if (!isAdmin(env, a.id)) return err3("only the admins of this server can do this", 403);
    if (!mailReady(env)) return err3("emails are not set up on this server (RESEND_API_KEY and EMAIL_FROM)", 503);
    if (typeof body.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) return err3("write a valid email", 400);
    return json6(await sendTest(env, body.email.trim(), body.lang));
  }
  if (p === "/logout" && m === "POST") {
    await env.DB.prepare("DELETE FROM account_sessions WHERE id=?1").bind(a.sid).run();
    return json6({ ok: true });
  }
  if (p === "/sessions" && m === "GET") {
    const r4 = await env.DB.prepare("SELECT id, device, created, last_seen AS lastSeen FROM account_sessions WHERE account_id=?1 ORDER BY last_seen DESC").bind(a.id).all();
    return json6({ sessions: (r4.results || []).map((s) => ({ ...s, current: s.id === a.sid })) });
  }
  if (p === "/sessions/revoke" && m === "POST") {
    if (body.id === "others") await env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?1 AND id<>?2").bind(a.id, a.sid).run();
    else await env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?1 AND id=?2").bind(a.id, String(body.id || "")).run();
    return json6({ ok: true });
  }
  if (p === "/password" && m === "POST") {
    if (noPassword(a)) return SOCIAL_ONLY();
    if (await tooMany(env, ["login:" + a.email_hash], [5])) return err3("too many wrong passwords: wait 15 minutes", 429);
    if (!await reauth()) {
      await fail(env, ["login:" + a.email_hash]);
      return err3("the current password is wrong", 401);
    }
    if (!isKey(body.newAuth) || !isB64(body.wrappedKey, 200)) return err3("missing new key", 400);
    const salt = rid4(16);
    await env.DB.batch([
      env.DB.prepare("UPDATE accounts SET auth_salt=?2, auth_hash=?3, wrapped_key=?4 WHERE id=?1").bind(a.id, salt, await authHash(salt, body.newAuth), body.wrappedKey),
      env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?1 AND id<>?2").bind(a.id, a.sid)
      // sign out everywhere else
    ]);
    return json6({ ok: true });
  }
  if (p === "/delete" && m === "POST") {
    if (!gated && !await reauth()) {
      await fail(env, ["login:" + a.email_hash]);
      return err3("the password is wrong", 401);
    }
    await deleteAccount(env, a.id);
    return json6({ deleted: true });
  }
  if (p === "/sync/meta" && m === "GET") {
    const s = await env.DB.prepare("SELECT version, updated FROM account_sync WHERE account_id=?1").bind(a.id).first();
    return json6({ version: s ? s.version : 0, updated: s ? s.updated : null });
  }
  if (p === "/sync" && m === "GET") {
    const s = await env.DB.prepare("SELECT version, updated, chunks FROM account_sync WHERE account_id=?1").bind(a.id).first();
    if (!s) return json6({ version: 0, blob: "" });
    const r4 = await env.DB.prepare("SELECT data FROM account_sync_chunks WHERE account_id=?1 AND idx<?2 ORDER BY idx").bind(a.id, s.chunks).all();
    return json6({ version: s.version, updated: s.updated, blob: (r4.results || []).map((x) => x.data).join("") });
  }
  if (p === "/sync" && m === "PUT") {
    if (!isB64(body.blob, 8 * 1024 * 1024)) return err3("missing or too large data (8 MB max)", 400);
    const s = await env.DB.prepare("SELECT version FROM account_sync WHERE account_id=?1").bind(a.id).first();
    const cur = s ? s.version : 0;
    if (!body.force && Number(body.base) !== cur) return err3("conflict: the account changed on another PC", 409);
    const parts = [];
    for (let i = 0; i < body.blob.length; i += CHUNK) parts.push(body.blob.slice(i, i + CHUNK));
    const v = cur + 1;
    await env.DB.batch([
      env.DB.prepare("DELETE FROM account_sync_chunks WHERE account_id=?1").bind(a.id),
      ...parts.map((d, i) => env.DB.prepare("INSERT INTO account_sync_chunks (account_id, idx, data) VALUES (?1,?2,?3)").bind(a.id, i, d)),
      env.DB.prepare(
        "INSERT INTO account_sync (account_id, version, updated, chunks) VALUES (?1,?2,?3,?4) ON CONFLICT(account_id) DO UPDATE SET version=excluded.version, updated=excluded.updated, chunks=excluded.chunks"
      ).bind(a.id, v, Date.now(), parts.length)
    ]);
    if (env.LIVE) await env.LIVE.get(env.LIVE.idFromName(a.id)).fetch(new Request("https://live/nudge", { headers: { "x-live-nudge": "sync", "x-live-version": String(v) } })).catch(() => {
    });
    return json6({ version: v });
  }
  return err3("not found", 404);
}
__name(accounts, "accounts");
async function quickRegister(env, body, ip, req) {
  if (!escrowReady(env)) return json6({ error: "sign up with an email on this server", code: "no_quick" }, 503);
  if ([body.sid, body.discordSid, body.googleSid].filter(Boolean).length !== 1) return err3("sign up with one of them", 400);
  let g = null, prov = "steam", name2 = "", email = "";
  if (body.sid) {
    g = await useSteamGrant(env, body.sid, "signup", body.code);
    if (!g) return err3("this Steam sign-in is not valid any more, sign in with Steam again", 400);
    if (await steamAccountId(env, g.steamid)) return json6({ error: "this Steam account is already linked to another account", code: "taken" }, 409);
    name2 = g.persona;
  } else if (body.discordSid) {
    prov = "discord";
    g = await useDiscordGrant(env, body.discordSid, "signup", body.code);
    if (!g) return err3("this Discord sign-in is not valid any more, sign in with Discord again", 400);
    if (await discordLinkedAny(env, g.discord_id)) return json6({ error: "this Discord account is already linked to another account", code: "taken" }, 409);
    name2 = g.name || g.handle;
  } else {
    prov = "google";
    g = await useGoogleGrant(env, body.googleSid, "signup", body.code);
    if (!g) return err3("this Google sign-in is not valid any more, sign in with Google again", 400);
    if (await googleAccountId(env, g.sub, g.email_hash)) return json6({ error: "this Google account already has an account, sign in with Google", code: "taken" }, 409);
    name2 = g.name;
    email = g.email && g.email_hash ? g.email : "";
  }
  await fail(env, ["reg:" + ip]);
  const id2 = rid4(), key2 = hex2(crypto.getRandomValues(new Uint8Array(32)));
  const eh = email ? await emailHash(env, email) : await sha256("pitlanehq-noemail:" + id2 + ":" + rid4(16));
  const sealed = await sealEscrow(env, key2, email, async () => !!email);
  if (sealed.error) return err3(sealed.error, sealed.status);
  const display = await freeName(env, cleanName(body.display) || name2);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO accounts (id, email_hash, auth_salt, auth_hash, wrapped_key, display, name_kind, created, verified, escrow) VALUES (?1,?2,'','','',?3,'nick',?4,1,?5)").bind(id2, eh, display, Date.now(), sealed.value),
    env.DB.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES (?1,?2,?3,?4)").bind(id2, "acct:" + id2, display, Date.now()),
    signupSrc(env, req, id2, body)
  ]);
  if (prov === "steam") await linkSteam(env, g.steamid, id2, g.persona);
  else if (prov === "discord") await linkDiscordLogin(env, g, id2);
  else await linkGoogle(env, g.sub, id2);
  if (email) {
    await patreonOnRegister(env, id2, eh).catch(() => {
    });
    await proOnRegister(env, id2, eh).catch(() => {
    });
  }
  const a = await env.DB.prepare("SELECT * FROM accounts WHERE id=?1").bind(id2).first();
  const token = await newSession(env, id2, cleanName(body.device) || g.device || "PC");
  return json6({ id: a.id, token, display: a.display, nameKind: "nick", anon: false, keyTag: await keyTag(a.wrapped_key), admin: isAdmin(env, a.id), tester: isTester(env, a.id, a), verified: true, twoFactor: false, escrow: true, noPassword: true, created: true, dataKey: key2, email: email || void 0 });
}
__name(quickRegister, "quickRegister");
function signupSrc(env, req, id2, body) {
  const v = body && body.src && typeof body.src === "object" ? visitOf(body.src) : null;
  const src = v && v.src ? v.src : v && v.src === "" ? "direct" : appSrc(req.headers.get("x-pitlane-client"));
  return env.DB.prepare(SQL_ACCOUNT_SRC).bind(id2, src, v ? v.page : null, countryOf(req.cf));
}
__name(signupSrc, "signupSrc");

// src/coachplan.js
var MIN_PLAN_VOTES = 15;
var STEP = /^(plan|[a-z_]{1,24}(:[a-z_]{0,32})?@[0-9,]{0,48})$/;
async function planVotes(env, grp) {
  const r4 = await (grp ? env.DB.prepare("SELECT sid, k, SUM(up=1) AS up, SUM(up=-1) AS down, COUNT(DISTINCT account) AS drivers FROM coach_plan_votes WHERE cat=?1 GROUP BY sid, k ORDER BY COUNT(*) DESC LIMIT 200").bind(grp) : env.DB.prepare("SELECT sid, k, SUM(up=1) AS up, SUM(up=-1) AS down, COUNT(DISTINCT account) AS drivers FROM coach_plan_votes GROUP BY sid, k ORDER BY COUNT(*) DESC LIMIT 200")).all().catch(() => ({ results: [] }));
  return (r4.results || []).map((x) => ({ id: x.sid, k: x.k, up: x.up || 0, down: x.down || 0, drivers: x.drivers || 0 }));
}
__name(planVotes, "planVotes");
var PLAN_SHRINK = 8;
var shrinkTo = /* @__PURE__ */ __name((prior, up, n) => n > 0 ? prior + (0.8 + 0.4 * up / n - prior) * (n / (n + PLAN_SHRINK)) : prior, "shrinkTo");
var r2 = /* @__PURE__ */ __name((v) => Math.round(v * 100) / 100, "r2");
function planWeights(votes, prior = 1) {
  const w = {}, byK = {}, kw = {};
  for (const v of votes) {
    if (v.id === "plan") continue;
    const o = byK[v.k] = byK[v.k] || { up: 0, down: 0 };
    o.up += v.up;
    o.down += v.down;
  }
  for (const [k, o] of Object.entries(byK)) kw[k] = shrinkTo(prior, o.up, o.up + o.down);
  for (const v of votes) {
    if (v.id === "plan") continue;
    const n = v.up + v.down;
    if (n > 0) w[v.id] = r2(shrinkTo(kw[v.k] != null ? kw[v.k] : prior, v.up, n));
  }
  for (const [k, x] of Object.entries(kw)) if (w[k] == null) w[k] = r2(x);
  for (const k of Object.keys(w)) if (w[k] === 1) delete w[k];
  return w;
}
__name(planWeights, "planWeights");
async function planWeightsFor(env, grp) {
  const all = planWeights(await planVotes(env));
  if (!grp) return all;
  const gv = await planVotes(env, grp), mine = planWeights(gv), out = { ...all };
  const enough = /* @__PURE__ */ new Set(), byK = {};
  for (const v of gv) {
    if (v.id === "plan") continue;
    const n = v.up + v.down;
    if (n >= MIN_PLAN_VOTES) enough.add(v.id);
    byK[v.k] = (byK[v.k] || 0) + n;
  }
  for (const [k, n] of Object.entries(byK)) if (n >= MIN_PLAN_VOTES) enough.add(k);
  for (const k of enough) delete out[k];
  return { ...out, ...mine };
}
__name(planWeightsFor, "planWeightsFor");

// src/coachcalib.js
var import_pitwall_analysis2 = __toESM(require_pitwall_analysis(), 1);
var PW = globalThis.PW_ANALYSIS;
var COMBOS = 6;
var LAPS = 14;
function calibrate(laps) {
  const ref = laps.reduce((a, b) => b.time < a.time ? b : a);
  const kinds = {}, steps = {};
  let n = 0, corners = 0, tips = 0, planN = 0;
  for (const A of laps) {
    if (A === ref) continue;
    let c;
    try {
      c = PW.coachPlan(A, ref, [], { lang: "en", units: "metric" });
    } catch (e) {
      continue;
    }
    n++;
    corners += c.cs.length;
    const seenK = /* @__PURE__ */ new Set(), seenS = /* @__PURE__ */ new Set();
    for (const x of c.cs) if (x.lost > 0.03 && x.kind) {
      tips++;
      seenK.add(x.kind);
    }
    for (const p of c.plan.slice(0, 5)) seenS.add(p.k);
    planN += Math.min(5, c.plan.length);
    for (const k of seenK) kinds[k] = (kinds[k] || 0) + 1;
    for (const k of seenS) steps[k] = (steps[k] || 0) + 1;
  }
  const share = /* @__PURE__ */ __name((o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v / Math.max(1, n) * 100)])), "share");
  return { laps: n, corners: n ? Math.round(corners / n * 10) / 10 : 0, tips: n ? Math.round(tips / n * 10) / 10 : 0, plan: n ? Math.round(planN / n * 10) / 10 : 0, kinds: share(kinds), steps: share(steps) };
}
__name(calibrate, "calibrate");
async function calibrateRun(env) {
  const top = (await env.DB.prepare("SELECT game, track_id, car_id, COUNT(DISTINCT drv) AS d FROM model_laps GROUP BY game, track_id, car_id HAVING d>=5 ORDER BY d DESC LIMIT ?1").bind(COMBOS).all()).results || [];
  const out = [], all = [];
  for (const t of top) {
    const rows = (await env.DB.prepare("SELECT drv, MIN(time) AS time, data FROM model_laps WHERE game=?1 AND track_id=?2 AND car_id=?3 GROUP BY drv ORDER BY time LIMIT ?4").bind(t.game, t.track_id, t.car_id, LAPS).all()).results || [];
    const card = await getCarCard(env, t.game, t.car_id).catch(() => null), laps = [];
    for (const x of rows) {
      let g = null;
      try {
        g = goodLap(x.time, memTrace(JSON.parse(await gunz(x.data))));
      } catch (e) {
      }
      if (!g) continue;
      const bins = g.field ? estimatePedals(g.bins, card && card.pedals, card && card.shifts) : g.bins;
      laps.push({ time: g.time, bins, maxBin: bins.length - 1, est: g.field });
    }
    const cl = cleanLaps(laps);
    if (cl.length < 3) continue;
    const r4 = calibrate(cl);
    out.push({ game: t.game, trackId: t.track_id, carId: t.car_id, drivers: t.d, ...r4 });
    all.push(...cl.map((l) => ({ l, k: out.length })));
  }
  const sum = { laps: 0, kinds: {}, steps: {} };
  for (const c of out) {
    sum.laps += c.laps;
    for (const [k, v] of Object.entries(c.kinds)) sum.kinds[k] = (sum.kinds[k] || 0) + v * c.laps / 100;
    for (const [k, v] of Object.entries(c.steps)) sum.steps[k] = (sum.steps[k] || 0) + v * c.laps / 100;
  }
  const pc = /* @__PURE__ */ __name((o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v / Math.max(1, sum.laps) * 100)])), "pc");
  return { combos: out, total: { laps: sum.laps, kinds: pc(sum.kinds), steps: pc(sum.steps) } };
}
__name(calibrateRun, "calibrateRun");

// src/coachlearn.js
var import_pitwall_analysis3 = __toESM(require_pitwall_analysis(), 1);
var PW2 = globalThis.PW_ANALYSIS;
var BIN2 = 5;
var GAIN_S = 0.05;
var SHADOW_PER_RUN = 10;
var SHADOW_DAYS = 180;
var ANSWER_PER_RUN = 25;
var LOOK_AGAIN = 864e5;
var NEXT_DAYS = 60;
var PROGRESS_SESSIONS = 8;
var r3 = /* @__PURE__ */ __name((v) => Math.round(v * 1e3) / 1e3, "r3");
function winTime(bins, d, apex) {
  if (!Array.isArray(bins) || !(d >= 0) || !(apex >= 0)) return null;
  const i0 = Math.max(0, Math.round(d / BIN2) - 10), i1 = Math.round(apex / BIN2) + 30;
  if (i1 >= bins.length || !bins[i0] || !bins[i1]) return null;
  const t = bins[i1][1] - bins[i0][1];
  return t > 0 && t < 60 ? t : null;
}
__name(winTime, "winTime");
function refForLap(m, t) {
  if (!m || !(m.nb > 0)) return null;
  const L = Array.isArray(m.ladder) ? m.ladder : [];
  if (L.length) {
    let i = L.findIndex((x2) => t <= x2.upTo);
    if (i < 0) i = L.length - 1;
    while (i > 0 && !(L[i].time < t * 0.997)) i--;
    const x = L[i];
    if (x && x.time < t - 1e-3 && Array.isArray(x.bins)) {
      const out = [];
      x.bins.forEach((b, k) => {
        const nx = x.bins[k + 1];
        out.push([b[0], b[1], b[2], b[3], b[4], 0, null]);
        out.push(nx ? [(b[0] + nx[0]) / 2, (b[1] + nx[1]) / 2, b[2], b[3], b[4], 0, null] : [b[0], b[1], b[2], b[3], b[4], 0, null]);
      });
      const bins = out.slice(0, m.nb);
      if (bins.length) return { ref: "level", lap: { time: x.time, bins, maxBin: bins.length - 1, est: !!x.field } };
    }
  }
  if (Array.isArray(m.ideal) && m.ideal.length && m.idealTime < t - 1e-3) {
    const bins = m.ideal.map((b) => [b[0], b[1], b[2], b[3], b[4], b[5], null]);
    return { ref: "record", lap: { time: m.idealTime, bins, maxBin: bins.length - 1, est: !!m.idealField } };
  }
  return null;
}
__name(refForLap, "refForLap");
function shadowTips(A, m, track2) {
  const R = refForLap(m, A.time);
  if (!R) return null;
  let cs;
  try {
    cs = PW2.coachCompare(A, R.lap, { lang: "en", units: "metric", track: track2 || null, estB: R.lap.est });
  } catch (e) {
    return null;
  }
  return {
    ref: R.ref,
    rows: cs.slice(0, 40).map((x) => ({ n: x.n, d: Math.round(x.d), apex: Math.round(x.apex), kind: x.lost > 0.03 ? x.kind || "" : "", cls: x.cls || "", lost: r3(x.lost), ta: r3(x.ta), tb: r3(x.tb), tbest: r3(x.ta), dd: x.dd != null ? Math.round(x.dd) : null }))
  };
}
__name(shadowTips, "shadowTips");
async function bestLap(env, sessionId, nb) {
  const r4 = await env.DB.prepare("SELECT time, trace FROM laps WHERE session_id=?1 AND valid=1 AND time>10 AND trace IS NOT NULL ORDER BY time LIMIT 3").bind(sessionId).all();
  for (const x of r4.results || []) {
    let tr2 = null;
    try {
      tr2 = JSON.parse(await openData(env, x.trace));
    } catch (e) {
      tr2 = null;
    }
    const g = goodLap(x.time, tr2);
    if (!g) continue;
    if (nb > 0 && Math.abs(g.bins.length - nb) > nb * 0.03) continue;
    const bins = g.bins.map((b) => [b[0], b[1], b[2], b[3], b[4], b[5], null]);
    return { time: g.time, bins, maxBin: bins.length - 1, flags: Array.isArray(tr2.f) ? tr2.f : [] };
  }
  return null;
}
__name(bestLap, "bestLap");
async function modelOf(env, game, trackId, carId) {
  const row = await env.DB.prepare("SELECT data FROM model_cache WHERE game=?1 AND track_id=?2 AND car_id=?3").bind(game, trackId, carId).first();
  if (!row || !row.data) return null;
  try {
    return JSON.parse(await gunz(row.data));
  } catch (e) {
    return null;
  }
}
__name(modelOf, "modelOf");
async function shadowRun(env, now = Date.now()) {
  const ss = await env.DB.prepare(
    `SELECT s.id, s.started, s.game, s.track_id, s.car_id, s.uploader, s.cat, s.track, s.track_config, s.car FROM sessions s
      WHERE s.uploader LIKE 'acct:%' AND s.track_id>0 AND s.car_id>0 AND s.started>?1 AND s.started>0
        AND LOWER(COALESCE(s.kind,'')) NOT LIKE '%test%' AND (COALESCE(s.official,1)<>0 OR s.ai=1)
        AND NOT EXISTS (SELECT 1 FROM coach_shadow c WHERE c.session_id=s.id)
      ORDER BY s.started DESC LIMIT ?2`
  ).bind(now - SHADOW_DAYS * 864e5, SHADOW_PER_RUN).all();
  let kept = 0;
  for (const s of ss.results || []) {
    const account = s.uploader.slice(5), game = s.game || "iracing", carId = await famId(env, game, s.car_id);
    let n = -1;
    try {
      const seen2 = await env.DB.prepare("SELECT 1 FROM coach_tips WHERE account=?1 AND session_id=?2 LIMIT 1").bind(account, s.id).first();
      const m = seen2 ? null : await modelOf(env, game, s.track_id, carId);
      const A = m ? await bestLap(env, s.id, m.nb) : null;
      const sh = A ? shadowTips(A, m, { cat: s.cat || "", track: s.track || "", track_config: s.track_config || "", car: s.car || "" }) : null;
      if (sh && sh.rows.length) {
        const ins = env.DB.prepare(
          `INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, d, apex, kind, cls, ref, lost, ta, tb, tbest, created, dd, flags, src)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,'auto') ON CONFLICT(account, session_id, n) DO NOTHING`
        );
        const flags = A.flags.filter((x) => x === "traffic" || x === "cold").join(",") || null;
        await env.DB.batch(sh.rows.map((c) => ins.bind(account, game, s.track_id, carId, s.id, s.started, c.n, c.d, c.apex, c.kind, c.cls, sh.ref, c.lost, c.ta, c.tb, c.tbest, now, c.dd, flags)));
        n = sh.rows.length;
        kept += n;
      } else if (seen2) n = 0;
    } catch (e) {
      n = -1;
    }
    await env.DB.prepare("INSERT INTO coach_shadow (session_id, at, n) VALUES (?1,?2,?3) ON CONFLICT(session_id) DO UPDATE SET at=excluded.at, n=excluded.n").bind(s.id, now, n).run();
  }
  return { sessions: (ss.results || []).length, kept };
}
__name(shadowRun, "shadowRun");
async function answerRun(env, now = Date.now()) {
  const open = await env.DB.prepare(
    `SELECT account, game, track_id, car_id, session_id, started FROM coach_tips
      WHERE outcome IS NULL AND kind<>'' AND tbest IS NOT NULL AND started>?1 AND (looked IS NULL OR looked<?2)
      GROUP BY account, session_id ORDER BY started DESC LIMIT ?3`
  ).bind(now - (SHADOW_DAYS + NEXT_DAYS) * 864e5, now - LOOK_AGAIN, ANSWER_PER_RUN).all();
  let scored = 0;
  for (const o of open.results || []) {
    const game = o.game || "iracing";
    const nx = await env.DB.prepare(
      `SELECT id FROM sessions WHERE uploader=?1 AND game=?2 AND track_id=?3 AND car_id IN (${await famSql(env, game, o.car_id)}) AND started>?4 AND started<?5 AND id<>?6
        ORDER BY started LIMIT 3`
    ).bind("acct:" + o.account, game, o.track_id, o.started, o.started + NEXT_DAYS * 864e5, o.session_id).all();
    let lap = null;
    for (const s of nx.results || []) {
      lap = await bestLap(env, s.id, 0);
      if (lap) break;
    }
    const tips = await env.DB.prepare("SELECT id, d, apex, tbest FROM coach_tips WHERE account=?1 AND session_id=?2 AND outcome IS NULL AND kind<>'' AND tbest IS NOT NULL").bind(o.account, o.session_id).all();
    const upd = [];
    for (const t of tips.results || []) {
      const w = lap ? winTime(lap.bins, t.d, t.apex) : null;
      if (w != null) {
        upd.push(env.DB.prepare("UPDATE coach_tips SET outcome=?2, outcome_at=?3, looked=?3 WHERE id=?1").bind(t.id, r3(t.tbest - w), now));
        scored++;
      } else upd.push(env.DB.prepare("UPDATE coach_tips SET looked=?2 WHERE id=?1").bind(t.id, now));
    }
    if (upd.length) await env.DB.batch(upd);
  }
  return { sessions: (open.results || []).length, scored };
}
__name(answerRun, "answerRun");
var SHRINK = 15;
var MIN_RATINGS2 = 20;
function weightOf(b, rt, prior = 1) {
  let w = prior;
  const n = b && b.n || 0;
  if (n > 0) {
    const raw = b.up != null ? 1 + Math.max(-0.3, Math.min(0.3, b.up)) : 0.8 + 0.4 * ((b.win || 0) / n);
    w = prior + (raw - prior) * (n / (n + SHRINK));
  }
  w = Math.min(1.3, Math.max(0.7, w));
  if (rt && rt.up + rt.down >= MIN_RATINGS2 && rt.down > 0.6 * (rt.up + rt.down)) w *= 0.85;
  return Math.round(Math.max(0.6, w) * 100) / 100;
}
__name(weightOf, "weightOf");
function upliftOf(rows) {
  const by = {}, base2 = {};
  for (const x of rows) {
    if (!x.kind || x.rec == null || !(x.n > 0)) continue;
    const k = x.kind + "|" + (x.cls || "");
    const b = by[k] = by[k] || { n: 0, rec: 0, nu: 0, recu: 0 };
    if (x.src === "auto") {
      b.nu += x.n;
      b.recu += x.rec * x.n;
      const c = base2[x.cls || ""] = base2[x.cls || ""] || { n: 0, s: 0 };
      c.n += x.n;
      c.s += x.rec * x.n;
    } else {
      b.n += x.n;
      b.rec += x.rec * x.n;
    }
  }
  const out = {};
  for (const [k, b] of Object.entries(by)) {
    const cls = k.split("|")[1], cb = base2[cls];
    const rec = b.n ? b.rec / b.n : null, recu = b.nu ? b.recu / b.nu : null, all = cb && cb.n ? cb.s / cb.n : null;
    const baseK = recu != null && all != null ? all + (recu - all) * (b.nu / (b.nu + 5)) : recu != null && b.nu >= 5 ? recu : all;
    out[k] = { rec: rec != null ? r3(rec) : null, nu: b.nu, base: baseK != null ? r3(baseK) : null, up: rec != null && baseK != null ? r3(rec - baseK) : null };
  }
  return out;
}
__name(upliftOf, "upliftOf");
async function upliftStats(env) {
  const r4 = await env.DB.prepare(
    `SELECT kind, cls, COALESCE(src,'app') AS src, COUNT(*) AS n, AVG(MIN(1.5, MAX(-1.0, outcome/lost))) AS rec
       FROM coach_tips WHERE outcome IS NOT NULL AND kind<>'' AND lost>0.03 GROUP BY kind, cls, COALESCE(src,'app')`
  ).all().catch(() => ({ results: [] }));
  return upliftOf(r4.results || []);
}
__name(upliftStats, "upliftStats");
function progressOf(laps, corners) {
  const out = [];
  for (const c of corners) {
    const t = laps.map((l) => winTime(l.bins, c.d, c.apex)).map((v) => v != null ? r3(v) : null);
    const vals = t.filter((v) => v != null);
    if (vals.length < 2) continue;
    const first = vals[0], last = vals[vals.length - 1], best = Math.min(...vals), gain = r3(first - last);
    const trend = gain >= GAIN_S ? "better" : gain <= -GAIN_S ? "worse" : vals.length >= 3 && c.lost > GAIN_S ? "stuck" : "same";
    out.push({ n: c.n, apex: c.apex, d: c.d, t, first, last, best: r3(best), gain, trend, sessions: vals.length, lost: c.lost != null ? r3(c.lost) : null });
  }
  return out;
}
__name(progressOf, "progressOf");
async function progressRoute(env, acc, game, trackId, rawCarId, before) {
  const carId = await famId(env, game, rawCarId);
  const ss = await env.DB.prepare(
    `SELECT id, started FROM sessions WHERE uploader=?1 AND game=?2 AND track_id=?3 AND car_id IN (${await famSql(env, game, carId)}) AND started<=?4
      ORDER BY started DESC LIMIT ?5`
  ).bind("acct:" + acc.id, game, trackId, before, PROGRESS_SESSIONS * 2).all();
  const laps = [];
  for (const s of ss.results || []) {
    if (laps.length >= PROGRESS_SESSIONS) break;
    const l = await bestLap(env, s.id, laps.length ? laps[0].bins.length : 0);
    if (l) laps.push({ sid: s.id, started: s.started, time: l.time, bins: l.bins });
  }
  laps.reverse();
  const last = await env.DB.prepare(
    `SELECT session_id FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started<=?5 AND tbest IS NOT NULL ORDER BY started DESC LIMIT 1`
  ).bind(acc.id, game, trackId, carId, before).first();
  const cs = last ? (await env.DB.prepare("SELECT n, d, apex, lost FROM coach_tips WHERE account=?1 AND session_id=?2 AND d IS NOT NULL AND apex IS NOT NULL ORDER BY apex").bind(acc.id, last.session_id).all()).results || [] : [];
  const corners = laps.length >= 2 ? progressOf(laps, cs) : [];
  const tr2 = await env.DB.prepare(
    `SELECT apex, kind, outcome, started FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND COALESCE(src,'app')='app'
       AND kind<>'' AND outcome IS NOT NULL ORDER BY started DESC LIMIT 60`
  ).bind(acc.id, game, trackId, carId).all();
  const tried = (tr2.results || []).map((x) => ({ apex: x.apex, kind: x.kind, ok: x.outcome >= GAIN_S ? 1 : x.outcome <= -GAIN_S ? -1 : 0, at: x.started }));
  return { sessions: laps.map((l) => ({ started: l.started, best: r3(l.time) })), corners, tried };
}
__name(progressRoute, "progressRoute");

// src/coachtips.js
var MIN_CASES = 30;
var SAME_CORNER_M = 60;
var GAIN_S2 = 0.05;
var JSONH5 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
var json7 = /* @__PURE__ */ __name((v, status = 200, h = {}) => new Response(JSON.stringify(v), { status, headers: { ...JSONH5, ...h } }), "json");
var err4 = /* @__PURE__ */ __name((msg, status) => json7({ error: msg }, status), "err");
var num = /* @__PURE__ */ __name((v) => typeof v === "number" && isFinite(v) ? v : null, "num");
var int = /* @__PURE__ */ __name((v) => Number.isInteger(v) && v > 0 && v < 1e12 ? v : null, "int");
var str = /* @__PURE__ */ __name((v, max = 40) => typeof v === "string" ? v.slice(0, max) : "", "str");
var KIND2 = /^[a-z_]{1,32}$/;
var CLS = { slow: 1, medium: 1, fast: 1 };
var REF = { level: 1, record: 1, own: 1, comm: 1 };
var r32 = /* @__PURE__ */ __name((v) => Math.round(v * 1e3) / 1e3, "r3");
var BRAKE_KINDS = ["brake_later", "brake_earlier", "brake_late_apex"];
var MIN_ASK = 10;
var MIN_PERSONAL = 3;
var HABIT_TRACKS = 3;
var TRANSFER = /^(brake_|trail|coast|throttle|full_throttle|no_wait|lifts|entry_|apex_speed|apex_longer|exit_speed|cons)/;
var FLAGS = { traffic: 1, cold: 1 };
var median2 = /* @__PURE__ */ __name((a) => {
  if (!a.length) return null;
  const v = a.slice().sort((x, y) => x - y);
  return v[v.length >> 1];
}, "median");
var flagsOf = /* @__PURE__ */ __name((f) => (Array.isArray(f) ? f.filter((x) => FLAGS[x]).slice(0, 4).join(",") : "") || null, "flagsOf");
async function buckets(env, account, grp, min = MIN_CASES) {
  const who2 = account ? " AND account=?2" : "";
  const b = await env.DB.prepare(
    `SELECT COALESCE(cat,'') AS cat, kind, cls, COUNT(*) AS n, SUM(outcome>?1) AS win, SUM(outcome<-?1) AS loss, SUM(outcome) AS tot
       FROM coach_tips WHERE outcome IS NOT NULL AND kind<>'' AND COALESCE(src,'app')='app'${who2} GROUP BY cat, kind, cls`
  ).bind(...account ? [GAIN_S2, account] : [GAIN_S2]).all();
  const t = await env.DB.prepare(`SELECT COALESCE(cat,'') AS cat, kind, SUM(rating=1) AS up, SUM(rating=-1) AS down FROM coach_tips WHERE rating<>0 AND kind<>''${account ? " AND account=?1" : ""} GROUP BY cat, kind`).bind(...account ? [account] : []).all();
  const ratings = {}, gRatings = {};
  for (const x of t.results || []) {
    const o = ratings[x.kind] = ratings[x.kind] || { up: 0, down: 0 };
    o.up += x.up || 0;
    o.down += x.down || 0;
    if (grp && x.cat === grp) gRatings[x.kind] = { up: x.up || 0, down: x.down || 0 };
  }
  const rtOf = /* @__PURE__ */ __name((kind) => {
    const g = gRatings[kind];
    return g && g.up + g.down >= MIN_RATINGS ? g : ratings[kind];
  }, "rtOf");
  const pool = /* @__PURE__ */ new Map(), mine = /* @__PURE__ */ new Map();
  for (const x of b.results || []) {
    const k = x.kind + "|" + (x.cls || ""), o = pool.get(k) || { kind: x.kind, cls: x.cls || "", n: 0, win: 0, loss: 0, tot: 0 };
    o.n += x.n;
    o.win += x.win || 0;
    o.loss += x.loss || 0;
    o.tot += x.tot || 0;
    pool.set(k, o);
    if (grp && x.cat === grp) mine.set(k, { kind: x.kind, cls: x.cls || "", n: x.n, win: x.win || 0, loss: x.loss || 0, tot: x.tot || 0 });
  }
  const up = await upliftStats(env);
  const out = [];
  for (const [k, o] of pool) {
    const u = up[k] || {}, upv = account ? null : u.up != null ? u.up : null, g = mine.get(k), use = g && g.n >= min ? g : o;
    const pooled = weightOf({ ...o, up: upv }, null);
    const w = g ? weightOf({ ...g, up: null }, rtOf(o.kind), pooled) : weightOf({ ...o, up: upv }, rtOf(o.kind));
    out.push({ kind: o.kind, cls: o.cls, n: use.n, win: use.win, loss: use.loss, avg: r32(use.n ? use.tot / use.n : 0), up: upv, base: u.base != null ? u.base : null, nu: u.nu || 0, w, ...use === g ? { cat: grp } : {} });
  }
  const kinds = /* @__PURE__ */ new Set([...Object.keys(ratings), ...Object.keys(gRatings)]);
  for (const kind of kinds) for (const cls of Object.keys(CLS)) if (!out.some((x) => x.kind === kind && x.cls === cls)) {
    const w = weightOf({ n: 0, win: 0 }, rtOf(kind));
    if (w !== 1) out.push({ kind, cls, n: 0, win: 0, loss: 0, avg: 0, w });
  }
  if (!account) {
    const d = await env.DB.prepare(
      `SELECT COALESCE(cat,'') AS cat, kind, cls, dd, ddn FROM coach_tips WHERE outcome>?1 AND kind IN (${BRAKE_KINDS.map((k) => `'${k}'`).join(",")}) AND dd IS NOT NULL AND ddn IS NOT NULL`
    ).bind(GAIN_S2).all();
    const moved = {}, gMoved = {};
    for (const x of d.results || []) {
      const k = x.kind + "|" + (x.cls || ""), v = Math.abs(x.ddn - x.dd);
      (moved[k] = moved[k] || []).push(v);
      if (grp && x.cat === grp) (gMoved[k] = gMoved[k] || []).push(v);
    }
    for (const [k, a0] of Object.entries(moved)) {
      const a = gMoved[k] && gMoved[k].length >= MIN_ASK ? gMoved[k] : a0;
      if (a.length < MIN_ASK) continue;
      const [kind, cls] = k.split("|");
      let bk = out.find((x) => x.kind === kind && x.cls === cls);
      if (!bk) {
        bk = { kind, cls, n: 0, win: 0, loss: 0, avg: 0, w: 1 };
        out.push(bk);
      }
      bk.ask = Math.max(2, Math.round(median2(a)));
    }
  }
  return { buckets: out, ratings };
}
__name(buckets, "buckets");
async function groupQ(env, game, u) {
  const q2 = /* @__PURE__ */ __name((k) => u.searchParams.get(k) || "", "q");
  const c = String(q2("cat")).slice(0, 20), t = +q2("trackId") || 0, car = +q2("carId") || 0;
  if (!c && !t) return "";
  return groupFor(env, game, t, car, c);
}
__name(groupQ, "groupQ");
var groupOfBody = /* @__PURE__ */ __name((env, game, body, trackId, carId) => groupFor(env, game, trackId, carId, typeof body.cat === "string" ? body.cat.slice(0, 20) : "").catch(() => ""), "groupOfBody");
async function fillCats(env) {
  for (const tb of ["coach_tips", "coach_plan_votes"]) {
    const r4 = await env.DB.prepare(
      `SELECT DISTINCT t.game, t.track_id AS trackId, t.car_id AS carId, t.session_id AS sid, s.cat AS hint, s.track, s.car FROM ${tb} t LEFT JOIN sessions s ON s.id=t.session_id WHERE t.cat IS NULL LIMIT 300`
    ).all().catch(() => ({ results: [] }));
    const up = [];
    for (const x of r4.results || []) up.push(env.DB.prepare(`UPDATE ${tb} SET cat=?1 WHERE session_id=?2 AND track_id=?3 AND car_id=?4 AND cat IS NULL`).bind(await groupFor(env, x.game || "iracing", x.trackId, x.carId, x.hint, x.track, x.car) || "road", x.sid, x.trackId, x.carId));
    for (let i = 0; i < up.length; i += 50) await env.DB.batch(up.slice(i, i + 50));
  }
}
__name(fillCats, "fillCats");
async function offList(env) {
  const r4 = await env.DB.prepare("SELECT kind, cls FROM coach_off").all().catch(() => ({ results: [] }));
  return (r4.results || []).map((x) => x.kind + "|" + x.cls);
}
__name(offList, "offList");
async function confidenceOn(env) {
  const r4 = await env.DB.prepare("SELECT v FROM app_state WHERE k='coach_confidence'").first().catch(() => null);
  return !!(r4 && r4.v === "1");
}
__name(confidenceOn, "confidenceOn");
async function coachTipRoutes(req, env, p, m, body, game) {
  if (!p.startsWith("/coach/") && !p.startsWith("/admin/coach")) return null;
  const acc = await sessionAccount(req, env);
  if (!acc) return err4("sign in with your Pitlane HQ account", 401);
  if (p === "/coach/tips" && m === "POST") {
    const trackId = int(body.trackId), carId = int(body.carId) && await famId(env, game, body.carId), sid = str(body.sid, 120), started = int(body.started);
    const ref = REF[body.ref] ? body.ref : "own";
    if (!trackId || !carId || !sid || !started || !Array.isArray(body.corners)) return err4("trackId, carId, sid, started and corners", 400);
    const now = Date.now(), rows = [], flags = flagsOf(body.flags);
    for (const c of body.corners.slice(0, 40)) {
      const n = int(c.n), apex = num(c.apex);
      if (!n || apex == null) continue;
      const kind = KIND2.test(c.kind || "") ? c.kind : "";
      rows.push({ n, d: num(c.d), apex, kind, cls: CLS[c.cls] ? c.cls : "", lost: num(c.lost), ta: num(c.ta), tb: num(c.tb), tbest: num(c.tbest), dd: num(c.dd) });
    }
    if (!rows.length) return json7({ ok: true, kept: 0, scored: 0 });
    const cat = await groupOfBody(env, game, body, trackId, carId) || null;
    await env.DB.prepare("DELETE FROM coach_tips WHERE account=?1 AND session_id=?2 AND src='auto'").bind(acc.id, sid).run().catch(() => {
    });
    const ins = env.DB.prepare(
      `INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, d, apex, kind, cls, ref, lost, ta, tb, tbest, created, dd, flags, cat)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)
       ON CONFLICT(account, session_id, n) DO UPDATE SET d=excluded.d, apex=excluded.apex, kind=excluded.kind, cls=excluded.cls, ref=excluded.ref,
         lost=excluded.lost, ta=excluded.ta, tb=excluded.tb, tbest=COALESCE(excluded.tbest, coach_tips.tbest), created=excluded.created, dd=excluded.dd, flags=excluded.flags, cat=COALESCE(excluded.cat, coach_tips.cat), src='app'`
    );
    await env.DB.batch(rows.map((c) => ins.bind(acc.id, game, trackId, carId, sid, started, c.n, c.d, c.apex, c.kind, c.cls, ref, c.lost, c.ta, c.tb, c.tbest, now, c.dd, flags, cat)));
    const old = await env.DB.prepare(
      `SELECT id, apex, tbest FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started<?5 AND session_id<>?6
         AND outcome IS NULL AND kind<>'' AND tbest IS NOT NULL ORDER BY started DESC LIMIT 200`
    ).bind(acc.id, game, trackId, carId, started, sid).all();
    const upd = [];
    for (const o of old.results || []) {
      let best = null;
      for (const c of rows) if (c.tbest != null && Math.abs(c.apex - o.apex) <= SAME_CORNER_M && (!best || Math.abs(c.apex - o.apex) < Math.abs(best.apex - o.apex))) best = c;
      if (best) upd.push(env.DB.prepare("UPDATE coach_tips SET outcome=?2, outcome_at=?3, ddn=?4 WHERE id=?1").bind(o.id, r32(o.tbest - best.tbest), now, best.dd));
    }
    const later3 = await env.DB.prepare(
      `SELECT session_id FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started>?5 AND tbest IS NOT NULL ORDER BY started LIMIT 1`
    ).bind(acc.id, game, trackId, carId, started).first();
    if (later3) {
      const nx = await env.DB.prepare("SELECT apex, tbest, dd FROM coach_tips WHERE account=?1 AND session_id=?2 AND tbest IS NOT NULL").bind(acc.id, later3.session_id).all();
      for (const c of rows) {
        if (!c.kind || c.tbest == null) continue;
        let best = null;
        for (const o of nx.results || []) if (Math.abs(c.apex - o.apex) <= SAME_CORNER_M && (!best || Math.abs(o.apex - c.apex) < Math.abs(best.apex - c.apex))) best = o;
        if (best) upd.push(env.DB.prepare("UPDATE coach_tips SET outcome=?3, outcome_at=?4, ddn=?6 WHERE account=?1 AND session_id=?2 AND n=?5 AND outcome IS NULL").bind(acc.id, sid, r32(c.tbest - best.tbest), now, c.n, best.dd));
      }
    }
    if (upd.length) await env.DB.batch(upd);
    return json7({ ok: true, kept: rows.length, scored: upd.length });
  }
  if (p === "/coach/rate" && m === "POST") {
    const trackId = int(body.trackId), carId = int(body.carId) && await famId(env, game, body.carId), sid = str(body.sid, 120), started = int(body.started), n = int(body.n), apex = num(body.apex);
    if (!trackId || !carId || !sid || !started || !n || apex == null) return err4("trackId, carId, sid, started, n and apex", 400);
    const up = body.up === 1 ? 1 : body.up === -1 ? -1 : 0, kind = KIND2.test(body.kind || "") ? body.kind : "", cls = CLS[body.cls] ? body.cls : "";
    const cat = await groupOfBody(env, game, body, trackId, carId) || null;
    await env.DB.prepare(
      `INSERT INTO coach_tips (account, game, track_id, car_id, session_id, started, n, apex, kind, cls, rating, created, cat) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
       ON CONFLICT(account, session_id, n) DO UPDATE SET rating=excluded.rating, kind=CASE WHEN coach_tips.kind='' THEN excluded.kind ELSE coach_tips.kind END, cls=CASE WHEN coach_tips.cls='' THEN excluded.cls ELSE coach_tips.cls END, cat=COALESCE(coach_tips.cat, excluded.cat)`
    ).bind(acc.id, game, trackId, carId, sid, started, n, apex, kind, cls, up, Date.now(), cat).run();
    return json7({ ok: true });
  }
  if (p === "/coach/planrate" && m === "POST") {
    const trackId = int(body.trackId), carId = int(body.carId) && await famId(env, game, body.carId), sid = str(body.sid, 120), started = int(body.started);
    const step = typeof body.step === "string" && STEP.test(body.step) ? body.step : "";
    if (!trackId || !carId || !sid || !started || !step) return err4("trackId, carId, sid, started and step", 400);
    const up = body.up === 1 ? 1 : body.up === -1 ? -1 : 0, id2 = step === "plan" ? "plan" : step.split("@")[0], k = KIND2.test(body.k || "") ? body.k : id2.split(":")[0];
    const kind = KIND2.test(body.kind || "") ? body.kind : "", turns = Array.isArray(body.turns) ? body.turns.filter((n) => int(n) && n < 1e3).slice(0, 12).join(",") : "";
    if (!up) await env.DB.prepare("DELETE FROM coach_plan_votes WHERE account=?1 AND session_id=?2 AND step=?3").bind(acc.id, sid, step).run();
    else await env.DB.prepare(
      `INSERT INTO coach_plan_votes (account, game, track_id, car_id, session_id, started, step, sid, k, kind, turns, up, created, cat) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)
       ON CONFLICT(account, session_id, step) DO UPDATE SET up=excluded.up, created=excluded.created, cat=COALESCE(coach_plan_votes.cat, excluded.cat)`
    ).bind(acc.id, game, trackId, carId, sid, started, step, id2, k, kind, turns, up, Date.now(), await groupOfBody(env, game, body, trackId, carId) || null).run();
    return json7({ ok: true });
  }
  if (p === "/coach/weights" && m === "GET") {
    const grp = await groupQ(env, game, new URL(req.url));
    const { buckets: b } = await buckets(env, null, grp);
    return json7({ min: MIN_CASES, cat: grp, buckets: b.filter((x) => x.w !== 1 || x.ask || x.n >= MIN_CASES), off: await offList(env), confidence: await confidenceOn(env), plan: await planWeightsFor(env, grp) }, 200, { "cache-control": "private, max-age=3600" });
  }
  if (p === "/coach/last" && m === "GET") {
    const u = new URL(req.url), trackId = +u.searchParams.get("trackId") || 0, carId = (+u.searchParams.get("carId") || 0) && await famId(env, game, +u.searchParams.get("carId")), before = +u.searchParams.get("before") || Date.now();
    if (!trackId || !carId) return err4("trackId and carId", 400);
    const last = await env.DB.prepare(
      `SELECT session_id, started FROM coach_tips WHERE account=?1 AND game=?2 AND track_id=?3 AND car_id=?4 AND started<?5 AND kind<>'' AND tbest IS NOT NULL AND COALESCE(src,'app')='app' ORDER BY started DESC LIMIT 1`
    ).bind(acc.id, game, trackId, carId, before).first();
    if (!last) return json7({ tips: [] }, 200, { "cache-control": "private, max-age=300" });
    const t = await env.DB.prepare("SELECT n, apex, kind, lost, tbest FROM coach_tips WHERE account=?1 AND session_id=?2 AND kind<>'' AND lost>0.05 AND tbest IS NOT NULL ORDER BY lost DESC LIMIT 12").bind(acc.id, last.session_id).all();
    return json7({ started: last.started, tips: (t.results || []).map((x) => ({ n: x.n, apex: x.apex, kind: x.kind, lost: r32(x.lost), tbest: r32(x.tbest) })) }, 200, { "cache-control": "private, max-age=300" });
  }
  if (p === "/coach/progress" && m === "GET") {
    const u = new URL(req.url), trackId = +u.searchParams.get("trackId") || 0, carId = +u.searchParams.get("carId") || 0, before = +u.searchParams.get("before") || Date.now();
    if (!trackId || !carId) return err4("trackId and carId", 400);
    return json7(await progressRoute(env, acc, game, trackId, carId, before), 200, { "cache-control": "private, max-age=600" });
  }
  if (p === "/coach/me" && m === "GET") {
    const grp = await groupQ(env, game, new URL(req.url));
    const habitsOf = /* @__PURE__ */ __name(async (g) => {
      const h = await env.DB.prepare(
        `SELECT kind, COUNT(DISTINCT track_id||':'||car_id) AS tracks, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS n, SUM(outcome>?2) AS win, SUM(outcome<-?2) AS loss
           FROM coach_tips WHERE account=?1 AND kind<>''${g ? " AND cat=?3" : ""} GROUP BY kind ORDER BY tracks DESC, n DESC LIMIT 12`
      ).bind(...g ? [acc.id, GAIN_S2, g] : [acc.id, GAIN_S2]).all();
      return (h.results || []).filter((x) => x.tracks >= HABIT_TRACKS).map((x) => ({ kind: x.kind, tracks: x.tracks, sessions: x.sessions, n: x.n, win: x.win || 0, loss: x.loss || 0 }));
    }, "habitsOf");
    let habits = grp ? await habitsOf(grp) : [];
    if (grp && habits.length) habits = habits.map((x) => ({ ...x, cat: grp }));
    else habits = (await habitsOf("")).filter((x) => !grp || TRANSFER.test(x.kind));
    const { buckets: mine } = await buckets(env, acc.id, grp, MIN_PERSONAL);
    const w = {};
    const { buckets: all } = await buckets(env, null, grp);
    for (const x of mine) {
      if (x.n < MIN_PERSONAL) continue;
      const g = all.find((y) => y.kind === x.kind && y.cls === x.cls), gw = g ? g.w : 1, own = weightOf({ ...x, up: null }, null, gw);
      if (own !== gw && gw > 0) w[x.kind + "|" + x.cls] = Math.round(own / gw * 100) / 100;
    }
    const clsOf = /* @__PURE__ */ __name(async (g) => {
      const bc = await env.DB.prepare(
        `SELECT cls, COUNT(*) AS n, AVG(CASE WHEN lost>0 THEN lost ELSE 0 END) AS avg FROM coach_tips WHERE account=?1 AND cls<>'' AND lost IS NOT NULL AND ref IN ('level','record')${g ? " AND cat=?2" : ""} GROUP BY cls`
      ).bind(...g ? [acc.id, g] : [acc.id]).all().catch(() => ({ results: [] }));
      return (bc.results || []).filter((x) => x.n >= 5).map((x) => ({ cls: x.cls, n: x.n, avg: r32(x.avg || 0) }));
    }, "clsOf");
    let byCls = grp ? await clsOf(grp) : [];
    if (!byCls.length) byCls = await clsOf("");
    return json7({ habits, w, minTracks: HABIT_TRACKS, byCls, cat: grp }, 200, { "cache-control": "private, max-age=600" });
  }
  if (p === "/admin/coach/off" && m === "POST") {
    if (!isAdmin(env, acc.id)) return err4("only the admins of this server can do this", 403);
    const kind = KIND2.test(body.kind || "") ? body.kind : "", cls = CLS[body.cls] ? body.cls : "";
    if (!kind || !cls) return err4("kind and cls", 400);
    if (body.off) await env.DB.prepare("INSERT INTO coach_off (kind, cls, created) VALUES (?1,?2,?3) ON CONFLICT DO NOTHING").bind(kind, cls, Date.now()).run();
    else await env.DB.prepare("DELETE FROM coach_off WHERE kind=?1 AND cls=?2").bind(kind, cls).run();
    return json7({ ok: true, off: await offList(env) });
  }
  if (p === "/admin/coach/confidence" && m === "POST") {
    if (!isAdmin(env, acc.id)) return err4("only the admins of this server can do this", 403);
    await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('coach_confidence', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(body.on ? "1" : "0", Date.now()).run();
    return json7({ ok: true, confidence: !!body.on });
  }
  if (p === "/admin/coach/calibrate" && m === "GET") {
    if (!isAdmin(env, acc.id)) return err4("only the admins of this server can do this", 403);
    return json7(await calibrateRun(env));
  }
  if (p === "/admin/coach" && m === "GET") {
    if (!isAdmin(env, acc.id)) return err4("only the admins of this server can do this", 403);
    const { buckets: b, ratings } = await buckets(env);
    const tot = await env.DB.prepare(
      `SELECT SUM(src='app') AS tips, SUM(kind<>'' AND src='app') AS withTip, SUM(outcome IS NOT NULL AND src='app') AS scored, SUM(rating<>0) AS rated, COUNT(DISTINCT account) AS drivers,
         COUNT(DISTINCT track_id||':'||car_id) AS combos, SUM(created>?1) AS week, SUM(src='auto') AS auto, SUM(src='auto' AND outcome IS NOT NULL) AS autoScored FROM coach_tips`
    ).bind(Date.now() - 7 * 864e5).first();
    const kinds = await env.DB.prepare("SELECT kind, COUNT(*) AS n, SUM(outcome IS NOT NULL) AS scored FROM coach_tips WHERE kind<>'' AND COALESCE(src,'app')='app' GROUP BY kind ORDER BY n DESC").all();
    const pv = await planVotes(env);
    return json7({ min: MIN_CASES, gain: GAIN_S2, totals: tot || {}, buckets: b, ratings, kinds: kinds.results || [], off: await offList(env), confidence: await confidenceOn(env), plan: pv, planMin: MIN_PLAN_VOTES });
  }
  return null;
}
__name(coachTipRoutes, "coachTipRoutes");

// src/driverlinks.js
var LINK_DAYS = 3;
var UNDONE = "undone";
var rid5 = /* @__PURE__ */ __name(() => [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, "0")).join(""), "rid");
var proofNeeded = /* @__PURE__ */ __name((game) => game !== "iracing", "proofNeeded");
var COL = /^[a-z_][a-z0-9_]*$/;
function insertRow(env, table, row) {
  const cols = Object.keys(row).filter((c) => COL.test(c));
  return env.DB.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((_, i) => "?" + (i + 1)).join(", ")})`).bind(...cols.map((c) => row[c] ?? null));
}
__name(insertRow, "insertRow");
async function linkDriver(env, acct, oid, game, deps = {}) {
  const move = deps.moveDriver || moveDriver, mark = deps.markModel || markModel, now = deps.now || Date.now();
  const had = await env.DB.prepare("SELECT oid, account_id FROM driver_links WHERE game=?3 AND (oid=?1 OR account_id=?2)").bind(oid, acct, game).all();
  for (const x of had.results || []) {
    if (x.oid === oid && x.account_id === acct) return { linked: true, moved: 0 };
    if (x.oid === oid) return { error: "this driver is already linked to another account", status: 409 };
    return { error: "this account is already linked to another driver", status: 409 };
  }
  const acc = await env.DB.prepare("SELECT anon, name_kind FROM accounts WHERE id=?1").bind(acct).first();
  if (!acc) return { error: "sign in with your Pitlane HQ account", status: 401 };
  const proof = proofNeeded(game);
  if (proof) {
    const undone = await env.DB.prepare("SELECT 1 AS x FROM driver_link_seen WHERE game=?1 AND oid=?2 AND account_id=?3 AND day=?4").bind(game, oid, acct, UNDONE).first();
    if (undone) return { linked: false, undone: true };
    await env.DB.prepare("INSERT OR IGNORE INTO driver_link_seen (game, oid, account_id, day) VALUES (?1,?2,?3,?4)").bind(game, oid, acct, new Date(now).toISOString().slice(0, 10)).run();
    const seen2 = await env.DB.prepare("SELECT COUNT(*) AS n FROM driver_link_seen WHERE game=?1 AND oid=?2 AND account_id=?3 AND day<>?4").bind(game, oid, acct, UNDONE).first();
    const days = seen2 && seen2.n || 0;
    if (days < LINK_DAYS) return { linked: false, days, need: LINK_DAYS };
  }
  await env.DB.prepare("INSERT INTO driver_links (game, oid, account_id, created) VALUES (?4,?1,?2,?3)").bind(oid, acct, now, game).run();
  const shown = acc.name_kind === "iracing" ? "iracing" : "nick";
  const laps = (await env.DB.prepare("SELECT * FROM community_laps WHERE user_id=?1 AND game=?2").bind(oid, game).all()).results || [];
  const q2 = [], combos2 = /* @__PURE__ */ new Set();
  const keep = /* @__PURE__ */ __name((kind, row) => {
    if (proof) q2.push(env.DB.prepare("INSERT INTO driver_link_moves (game, account_id, oid, kind, row, created) VALUES (?1,?2,?3,?4,?5,?6)").bind(game, acct, oid, kind, JSON.stringify(row), now));
  }, "keep");
  for (const l of laps) {
    const mine = await env.DB.prepare("SELECT * FROM community_laps WHERE user_id=?1 AND car_id=?2 AND track_id=?3 AND game=?4").bind(acct, l.car_id, l.track_id, l.game).first();
    combos2.add(l.game + "|" + l.track_id + "|" + l.car_id);
    const take = env.DB.prepare("UPDATE community_laps SET user_id=?2, anon=?3, shown=?4 WHERE id=?1").bind(l.id, acct, acc.anon ? 1 : 0, shown);
    if (!mine) {
      keep("took", l);
      q2.push(take);
      continue;
    }
    const better = mine.time > l.time || mine.trace == null && l.trace != null;
    if (better) {
      keep("dropped", mine);
      keep("took", l);
      q2.push(env.DB.prepare("DELETE FROM community_laps WHERE id=?1").bind(mine.id), take);
    } else {
      keep("dropped", l);
      q2.push(env.DB.prepare("DELETE FROM community_laps WHERE id=?1").bind(l.id));
    }
  }
  if (proof) {
    const who2 = await env.DB.prepare("SELECT * FROM community_users WHERE id=?1").bind(oid).first();
    if (who2) keep("user", who2);
  }
  q2.push(env.DB.prepare("DELETE FROM community_users WHERE id=?1 AND NOT EXISTS (SELECT 1 FROM community_laps WHERE user_id=?1)").bind(oid));
  await env.DB.batch(q2);
  const learnt = await move(env, "acct:" + oid, "acct:" + acct, game);
  if (proof && Array.isArray(learnt) && learnt.length) await env.DB.prepare("INSERT INTO driver_link_moves (game, account_id, oid, kind, row, created) VALUES (?1,?2,?3,'model',?4,?5)").bind(game, acct, oid, JSON.stringify(learnt.map((x) => ({ game: x.game, track_id: x.track_id, car_id: x.car_id, time: x.time }))), now).run();
  for (const c of combos2) {
    const [g, tr2, ca] = c.split("|");
    await mark(env, g, +tr2, +ca);
  }
  return { linked: true, moved: laps.length };
}
__name(linkDriver, "linkDriver");
async function unlinkDriver(env, acct, game, deps = {}) {
  const back2 = deps.moveDriverBack || moveDriverBack, mark = deps.markModel || markModel;
  const links = (await env.DB.prepare("SELECT game, oid FROM driver_links WHERE account_id=?1" + (game ? " AND game=?2" : "")).bind(...game ? [acct, game] : [acct]).all()).results || [];
  let restored = 0;
  for (const { game: g, oid } of links) {
    const moves = ((await env.DB.prepare("SELECT kind, row FROM driver_link_moves WHERE account_id=?1 AND game=?2 AND oid=?3 ORDER BY id").bind(acct, g, oid).all()).results || []).map((x) => {
      try {
        return { kind: x.kind, row: JSON.parse(x.row) };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    const q2 = [], combos2 = /* @__PURE__ */ new Set();
    for (const { row } of moves.filter((x) => x.kind === "user")) q2.push(insertRow(env, "community_users", row));
    for (const { row } of moves.filter((x) => x.kind === "took")) {
      combos2.add(row.game + "|" + row.track_id + "|" + row.car_id);
      const now = await env.DB.prepare("SELECT user_id, time FROM community_laps WHERE id=?1").bind(row.id).first();
      if (now && now.user_id === acct && Math.abs(now.time - row.time) < 1e-6) q2.push(env.DB.prepare("UPDATE community_laps SET user_id=?2, anon=?3, shown=?4 WHERE id=?1").bind(row.id, row.user_id, row.anon ?? 0, row.shown ?? null));
      else q2.push(insertRow(env, "community_laps", now ? { ...row, id: rid5() } : row));
      restored++;
    }
    for (const { row } of moves.filter((x) => x.kind === "dropped")) {
      combos2.add(row.game + "|" + row.track_id + "|" + row.car_id);
      q2.push(insertRow(env, "community_laps", row));
      if (row.user_id === oid) restored++;
    }
    if (proofNeeded(g)) q2.push(env.DB.prepare("INSERT OR IGNORE INTO driver_link_seen (game, oid, account_id, day) VALUES (?1,?2,?3,?4)").bind(g, oid, acct, UNDONE));
    q2.push(env.DB.prepare("DELETE FROM driver_links WHERE account_id=?1 AND game=?2").bind(acct, g));
    q2.push(env.DB.prepare("DELETE FROM driver_link_moves WHERE account_id=?1 AND game=?2").bind(acct, g));
    q2.push(env.DB.prepare("UPDATE community_laps SET anon=1 WHERE user_id=?1").bind(oid));
    await env.DB.batch(q2);
    for (const { row } of moves.filter((x) => x.kind === "model")) await back2(env, row, "acct:" + acct, "acct:" + oid);
    for (const c of combos2) {
      const [cg, tr2, ca] = c.split("|");
      await mark(env, cg, +tr2, +ca);
    }
  }
  return { unlinked: links.length, restored };
}
__name(unlinkDriver, "unlinkDriver");

// src/seasonseen.js
var MIN = 6e4;
var DAY = 864e5;
var SEEN_DAYS = 8;
var SEEN_PER_DAY = 60;
var name = /* @__PURE__ */ __name((v) => typeof v === "string" ? v.trim().slice(0, 80) : "", "name");
var id = /* @__PURE__ */ __name((v) => Number.isInteger(v) && v > 0 && v < 2 ** 31 ? v : 0, "id");
async function recordSeen(env, userId, body, now = Date.now()) {
  const sub = id(body.sub), season = id(body.season), series = id(body.series), track2 = id(body.track);
  const start = Math.round(Number(body.start) / MIN) * MIN;
  if (!sub || !season || !series || !track2 || !Number.isFinite(start)) return { error: "subsession, season, series, track and start are needed", status: 400 };
  if (start > now + 5 * MIN || start < now - 6 * 36e5) return { error: "only a race seen now can be reported", status: 400 };
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM season_seen WHERE user_id=?1 AND at>?2").bind(userId, now - DAY).first();
  if (n && n.n >= SEEN_PER_DAY) return { error: "too many race starts today", status: 429 };
  const r4 = await env.DB.prepare("INSERT INTO season_seen (sub, season_id, series_id, track_id, track_name, track_cfg, car, start, user_id, at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10) ON CONFLICT(sub) DO NOTHING").bind(sub, season, series, track2, name(body.trackName), name(body.trackConfig), name(body.car), start, userId, now).run();
  return { ok: true, kept: !!(r4.meta && r4.meta.changes) };
}
__name(recordSeen, "recordSeen");
async function seenSummary(env, now = Date.now()) {
  const r4 = await env.DB.prepare("SELECT season_id AS s, start AS t, COUNT(*) AS n, MAX(track_name) AS tn, MAX(track_cfg) AS tc, MAX(car) AS c FROM season_seen WHERE start>?1 GROUP BY season_id, start ORDER BY season_id, start").bind(now - SEEN_DAYS * DAY).all();
  const out = {};
  for (const x of r4.results || []) (out[x.s] ||= []).push([x.t, x.n, x.tn || "", x.tc || "", x.c || ""]);
  return out;
}
__name(seenSummary, "seenSummary");
async function pruneSeen(env, now = Date.now()) {
  await env.DB.prepare("DELETE FROM season_seen WHERE start<?1").bind(now - 14 * DAY).run();
}
__name(pruneSeen, "pruneSeen");

// src/previewsample.js
var PREVIEW_MAX = 4 << 20;
var PREVIEW_FRAMES = 400;
var PREVIEW_EVERY = 36e5;
var PREVIEW_KEEP = 30 * 864e5;
var GAMES = /* @__PURE__ */ new Set(["iracing", "lmu"]);
var key = /* @__PURE__ */ __name((game, uid) => `preview-samples/${game}/${String(uid).replace(/[^\w-]/g, "")}.json`, "key");
async function storeSample(env, uid, s, now = Date.now()) {
  if (!env.DL) return { error: "no storage", status: 503 };
  if (!s || !GAMES.has(s.game)) return { error: "unknown game", status: 400 };
  const names = s.names, frames = s.frames;
  if (!Array.isArray(names) || !names.length || names.length > 2e3 || names.some((n) => typeof n !== "string" || !/^\w{1,64}$/.test(n))) return { error: "bad names", status: 400 };
  if (!Array.isArray(frames) || frames.length < 50 || frames.length > PREVIEW_FRAMES || frames.some((f) => !f || !Array.isArray(f.v) || f.v.length !== names.length)) return { error: "bad frames", status: 400 };
  if (typeof s.session !== "string" || s.session.length > 1 << 20) return { error: "bad session", status: 400 };
  const body = JSON.stringify({ v: 1, game: s.game, at: now, hz: Math.max(1, Math.min(60, +s.hz || 10)), names, session: s.session, frames: frames.map((f) => ({ k: +f.k || 0, v: f.v })) });
  if (body.length > PREVIEW_MAX) return { error: "too big", status: 413 };
  const k = key(s.game, uid), old = await env.DL.head(k);
  if (old && now - (+(old.customMetadata || {}).at || 0) < PREVIEW_EVERY) return { ok: true, kept: false };
  await env.DL.put(k, body, { httpMetadata: { contentType: "application/json" }, customMetadata: { at: String(now) } });
  return { ok: true, kept: true };
}
__name(storeSample, "storeSample");
async function pickSample(env, game, now = Date.now()) {
  if (!env.DL || !GAMES.has(game)) return null;
  let best = null, cursor;
  do {
    const l = await env.DL.list({ prefix: `preview-samples/${game}/`, cursor, include: ["customMetadata"] });
    for (const o2 of l.objects) {
      const at2 = +(o2.customMetadata || {}).at || +new Date(o2.uploaded) || 0;
      if (now - at2 < PREVIEW_KEEP && (!best || at2 > best.at)) best = { key: o2.key, at: at2 };
    }
    cursor = l.truncated ? l.cursor : null;
  } while (cursor);
  if (!best) return null;
  const o = await env.DL.get(best.key);
  return o ? await o.text() : null;
}
__name(pickSample, "pickSample");

// src/games.js
var GAMES2 = ["iracing", "lmu", "acc", "ac"];
var gameOf = /* @__PURE__ */ __name((g) => GAMES2.includes(g) ? g : "iracing", "gameOf");

// src/lmuapi.js
var JSONH6 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
var json8 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH6 }), "json");
var err5 = /* @__PURE__ */ __name((msg, status) => json8({ error: msg }, status), "err");
var LMU_BODY_MAX = 256 * 1024;
var RAW_MAX = 64 << 20;
var ITEMS_MAX = 400;
var VER = /^[A-Za-z0-9._ -]{1,64}$/;
var str2 = /* @__PURE__ */ __name((v, max) => typeof v === "string" ? v.slice(0, max) : "", "str");
var int2 = /* @__PURE__ */ __name((v) => Number.isFinite(+v) ? Math.max(-1, Math.min(2 ** 40, Math.round(+v))) : 0, "int");
async function readBody(req) {
  const ct = req.headers.get("content-type") || "";
  let stream = req.body;
  if (!stream) return null;
  if (/gzip/.test(ct) || req.headers.get("content-encoding") === "gzip") stream = stream.pipeThrough(new DecompressionStream("gzip"));
  const rd = stream.getReader(), parts = [];
  let n = 0;
  for (; ; ) {
    const { done, value } = await rd.read();
    if (done) break;
    n += value.length;
    if (n > RAW_MAX) {
      await rd.cancel().catch(() => {
      });
      throw new Error("too big");
    }
    parts.push(value);
  }
  const all = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    all.set(p, o);
    o += p.length;
  }
  return JSON.parse(new TextDecoder().decode(all));
}
__name(readBody, "readBody");
function lmuRows(b) {
  const version = str2(b && b.version, 64);
  if (!VER.test(version) || !Array.isArray(b.items)) return null;
  const rows = [];
  for (const it of b.items.slice(0, ITEMS_MAX)) {
    const path = str2(it && it.path, 512);
    if (!path || !(path.startsWith("/") || path.startsWith("#"))) continue;
    rows.push({ path, status: int2(it.status), ctype: str2(it.ctype, 120), size: int2(it.size), ms: int2(it.ms), body: str2(it.body, LMU_BODY_MAX) });
  }
  return { version, build: int2(b.build), rows };
}
__name(lmuRows, "lmuRows");
async function lmuApiRoutes(req, env, p, m, url) {
  if (p !== "/admin/lmu-api" && p !== "/admin/lmu-api/item") return null;
  const acc = await sessionAccount(req, env);
  if (!acc || !isAdmin(env, acc.id)) return err5("only the admins of this server can do this", 403);
  if (p === "/admin/lmu-api" && m === "POST") {
    let b;
    try {
      b = await readBody(req);
    } catch (e) {
      return err5("unreadable upload", 400);
    }
    const up = lmuRows(b);
    if (!up) return err5("version and items", 400);
    const now = Date.now();
    const st = env.DB.prepare(`INSERT INTO lmu_api (account_id, at, game_version, path, status, ctype, size, ms, body) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
      ON CONFLICT(account_id, game_version, path) DO UPDATE SET at=excluded.at, status=excluded.status, ctype=excluded.ctype, size=excluded.size, ms=excluded.ms, body=excluded.body`);
    for (let i = 0; i < up.rows.length; i += 50) {
      await env.DB.batch(up.rows.slice(i, i + 50).map((r4) => st.bind(acc.id, now, up.version, r4.path, r4.status, r4.ctype, r4.size, r4.ms, r4.body)));
    }
    return json8({ ok: true, version: up.version, stored: up.rows.length });
  }
  if (p === "/admin/lmu-api" && m === "GET") {
    const v = url.searchParams.get("version");
    if (!v) {
      const r5 = await env.DB.prepare("SELECT game_version AS version, COUNT(*) AS paths, SUM(status=200) AS ok, MAX(at) AS at, COUNT(DISTINCT account_id) AS accounts FROM lmu_api GROUP BY game_version ORDER BY MAX(at) DESC LIMIT 100").all();
      return json8({ versions: r5.results || [] });
    }
    const r4 = await env.DB.prepare("SELECT id, account_id AS account, at, game_version AS version, path, status, ctype, size, ms, LENGTH(body) AS kept FROM lmu_api WHERE game_version=?1 ORDER BY path LIMIT 5000").bind(v).all();
    return json8({ version: v, items: r4.results || [] });
  }
  if (p === "/admin/lmu-api/item" && m === "GET") {
    const id2 = +url.searchParams.get("id");
    if (!Number.isInteger(id2) || id2 <= 0) return err5("id", 400);
    const r4 = await env.DB.prepare("SELECT id, account_id AS account, at, game_version AS version, path, status, ctype, size, ms, body FROM lmu_api WHERE id=?1").bind(id2).first();
    return r4 ? json8(r4) : err5("not found", 404);
  }
  return err5("method", 405);
}
__name(lmuApiRoutes, "lmuApiRoutes");

// src/sessionsum.js
function base(game, uploader, secs) {
  return `SELECT started, kind, pos, field, pos_cls, track, track_config, car, laps, best,
    ${secs ? "secs" : "NULL"} AS secs,
    CASE WHEN LOWER(COALESCE(kind,'')) LIKE '%race%' THEN 1 ELSE 0 END AS race
  FROM sessions WHERE ${uploader ? "uploader=?3 AND " : ""}started>=?1 AND laps>0${game ? " AND game=?2" : ""}`;
}
__name(base, "base");
var summarySql = /* @__PURE__ */ __name((game, uploader) => `WITH s AS (${base(game, uploader, true)})
  SELECT COUNT(*) AS sessions, COALESCE(SUM(laps),0) AS laps,
    COALESCE(SUM(CASE WHEN secs>0 THEN secs WHEN best>0 AND best<3600 THEN laps*best*1.03 ELSE 0 END),0) AS secs,
    COUNT(DISTINCT CAST((started+?4)/86400000 AS INTEGER)) AS days,
    COALESCE(SUM(race),0) AS races,
    COALESCE(SUM(CASE WHEN race=1 AND pos BETWEEN 1 AND 5 THEN 1 ELSE 0 END),0) AS top5
  FROM s`, "summarySql");
var bestSql = /* @__PURE__ */ __name((game, uploader) => `WITH s AS (${base(game, uploader, false)}) SELECT pos, field, pos_cls, track, track_config, car, started FROM s
  WHERE race=1 AND pos>0 ORDER BY pos, started DESC LIMIT 1`, "bestSql");
var CLEAN = /* @__PURE__ */ __name((t) => `${t}valid=1 AND ${t}drv IS NULL AND ${t}time>0 AND ${t}time<3600`, "CLEAN");
var CONS_OF = /* @__PURE__ */ __name((sid) => `(SELECT CASE WHEN COUNT(*)>=5 THEN MAX(0, AVG(c.time*c.time)-AVG(c.time)*AVG(c.time)) END FROM laps c
       WHERE c.session_id=${sid} AND ${CLEAN("c.")} AND c.time<=1.03*(SELECT MIN(m.time) FROM laps m WHERE m.session_id=${sid} AND ${CLEAN("m.")}))`, "CONS_OF");
var SUMS_OF = /* @__PURE__ */ __name((sid) => `(SELECT COUNT(*), MIN(CASE WHEN valid=1 AND drv IS NULL THEN time END),
       SUM(CASE WHEN time>0 AND time<3600 THEN time END), group_concat(DISTINCT drv) FROM laps WHERE session_id=${sid})`, "SUMS_OF");
var SESSION_SUMS = `UPDATE sessions SET (laps, best, secs, drvs)=${SUMS_OF("?1")}, cons=${CONS_OF("?1")} WHERE id=?1`;
var ALL_SESSION_SUMS = `UPDATE sessions SET (laps, best, secs, drvs)=${SUMS_OF("sessions.id")}`;
var TZ_MAX = 14 * 60;
function monthStart(now, tz) {
  const d = new Date(now + tz * 6e4);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - tz * 6e4;
}
__name(monthStart, "monthStart");
async function sessionSummary(DB, { from, tz, game, uploader, now }) {
  now = now || Date.now();
  tz = Number.isFinite(+tz) ? Math.max(-TZ_MAX, Math.min(TZ_MAX, Math.round(+tz))) : 0;
  from = Number.isFinite(+from) && +from > 0 ? Math.round(+from) : monthStart(now, tz);
  game = game || null;
  uploader = uploader || null;
  const args = [from, game, uploader, tz * 6e4];
  const upTo = /* @__PURE__ */ __name((n2) => args.slice(0, n2), "upTo");
  const used = /* @__PURE__ */ __name((sql) => upTo(Math.max(...[...sql.matchAll(/\?(\d)/g)].map((m) => +m[1]))), "used");
  const sq = summarySql(game, uploader), bq = bestSql(game, uploader);
  const [r4, b] = await Promise.all([DB.prepare(sq).bind(...used(sq)).first(), DB.prepare(bq).bind(...used(bq)).first()]);
  const n = /* @__PURE__ */ __name((v) => +v || 0, "n");
  return {
    laps: n(r4 && r4.laps),
    secs: Math.round(n(r4 && r4.secs)),
    sessions: n(r4 && r4.sessions),
    days: n(r4 && r4.days),
    races: n(r4 && r4.races),
    top5: n(r4 && r4.top5),
    best: b ? { pos: b.pos, field: b.field || null, cls: b.pos_cls === 1, track: b.track, track_config: b.track_config || null, car: b.car, started: b.started } : null,
    from,
    at: now
  };
}
__name(sessionSummary, "sessionSummary");

// src/pushlib.js
var TOKEN_DAYS = 270;
var TOKENS_MAX = 10;
var SQL_TOKEN_ADD = "INSERT INTO push_tokens (token, account_id, platform, updated) VALUES (?1,?2,?3,?4) ON CONFLICT(token) DO UPDATE SET account_id=excluded.account_id, platform=excluded.platform, updated=excluded.updated";
var SQL_TOKEN_DEL = "DELETE FROM push_tokens WHERE token=?1";
var SQL_TOKENS = "SELECT token FROM push_tokens WHERE account_id=?1 ORDER BY updated DESC LIMIT " + TOKENS_MAX;
var SQL_TOKEN_PRUNE = "DELETE FROM push_tokens WHERE updated<?1";
var isPushToken = /* @__PURE__ */ __name((t) => typeof t === "string" && t.length >= 20 && t.length <= 400 && /^[A-Za-z0-9:_\-]+$/.test(t), "isPushToken");
var b64url = /* @__PURE__ */ __name((b) => btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64url");
var cache2 = null;
async function accessToken(sa, { fetch: f = fetch, now = Date.now() } = {}) {
  if (cache2 && cache2.email === sa.client_email && cache2.exp > now + 3e5) return cache2.token;
  const pem = String(sa.private_key || "").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key2 = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const iat = Math.floor(now / 1e3);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 }));
  const sig = b64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key2, new TextEncoder().encode(head + "." + claim)));
  const r4 = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + head + "." + claim + "." + sig
  });
  const j = await r4.json().catch(() => ({}));
  if (!r4.ok || !j.access_token) throw new Error("google token: " + r4.status);
  cache2 = { email: sa.client_email, token: j.access_token, exp: now + (j.expires_in || 3600) * 1e3 };
  return cache2.token;
}
__name(accessToken, "accessToken");
function serviceAccount(env) {
  try {
    const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT || "");
    return sa && sa.project_id && sa.client_email && sa.private_key ? sa : null;
  } catch (e) {
    return null;
  }
}
__name(serviceAccount, "serviceAccount");
async function pushAccount(env, accountId, kind = "alerts", { fetch: f = fetch, now = Date.now() } = {}) {
  const sa = serviceAccount(env);
  if (!sa || !accountId) return { sent: 0, gone: 0 };
  const rows = (await env.DB.prepare(SQL_TOKENS).bind(accountId).all()).results || [];
  if (!rows.length) return { sent: 0, gone: 0 };
  const at2 = await accessToken(sa, { fetch: f, now });
  let sent = 0, gone = 0;
  await Promise.all(rows.map(async ({ token }) => {
    const r4 = await f(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/messages:send`, {
      method: "POST",
      headers: { authorization: "Bearer " + at2, "content-type": "application/json" },
      body: JSON.stringify({ message: { token, data: { kind }, android: { priority: "HIGH", ttl: "86400s", collapse_key: kind } } })
    }).catch(() => null);
    if (r4 && r4.ok) {
      sent++;
      return;
    }
    const e = r4 ? await r4.json().catch(() => ({})) : {};
    const code = JSON.stringify(e.error && e.error.details || []) + " " + (e.error && e.error.status || "");
    if (r4 && (r4.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(code))) {
      await env.DB.prepare(SQL_TOKEN_DEL).bind(token).run();
      gone++;
    }
  }));
  return { sent, gone };
}
__name(pushAccount, "pushAccount");
var prunePushTokens = /* @__PURE__ */ __name((env, now = Date.now()) => env.DB.prepare(SQL_TOKEN_PRUNE).bind(now - TOKEN_DAYS * 864e5).run(), "prunePushTokens");

// src/alertslib.js
var ALERT_DAYS = 30;
var ALERT_MAX = 20;
var WEEK = 7 * 864e5;
var PER_RUN2 = 100;
var L3 = /* @__PURE__ */ __name((l) => ["en", "es", "pt"].includes(l) ? l : "en", "L3");
var json9 = /* @__PURE__ */ __name((o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var SQL_RECORD = "SELECT user_id, time FROM community_laps WHERE game=?1 AND track_id=?2 AND car_id=?3 AND COALESCE(shown,'')<>'model' ORDER BY time LIMIT 1";
var SQL_ACCOUNT_OF = "SELECT COALESCE(a.id, CASE WHEN u.id LIKE 'guest-%' THEN u.owner END) AS acc FROM community_users u LEFT JOIN accounts a ON a.id=u.id WHERE u.id=?1";
var SQL_ALIAS = "SELECT alias FROM community_users WHERE id=?1";
var SQL_ALERT_ADD = "INSERT INTO alerts (id, account_id, kind, created, data) VALUES (?1,?2,?3,?4,?5)";
var SQL_ALERTS = "SELECT id, kind, created, data FROM alerts WHERE account_id=?1 AND created>?2 ORDER BY created DESC LIMIT " + ALERT_MAX;
var SQL_ALERT_PRUNE = "DELETE FROM alerts WHERE created<?1";
var SQL_SUB_GET = "SELECT account_id FROM alert_subs WHERE account_id=?1";
var SQL_SUB_ON = "INSERT INTO alert_subs (account_id, lang) VALUES (?1,?2) ON CONFLICT(account_id) DO UPDATE SET lang=excluded.lang";
var SQL_SUB_OFF = "DELETE FROM alert_subs WHERE account_id=?1";
var SQL_DUE = "SELECT account_id, lang FROM alert_subs WHERE week_at IS NULL OR week_at<?1 LIMIT " + PER_RUN2;
var SQL_WEEK_DONE = "UPDATE alert_subs SET week_at=?2 WHERE account_id=?1";
var SQL_PBS = `SELECT s.track, s.track_config, s.car, MIN(s.best) AS b,
  (SELECT MIN(p.best) FROM sessions p WHERE p.uploader=?1 AND p.track=s.track AND COALESCE(p.track_config,'')=COALESCE(s.track_config,'') AND p.car=s.car AND p.started<?2 AND p.best>0) AS before
  FROM sessions s WHERE s.uploader=?1 AND s.started>=?2 AND s.best>0 GROUP BY s.track, s.track_config, s.car`;
var rid6 = /* @__PURE__ */ __name(() => crypto.randomUUID().replace(/-/g, "").slice(0, 20), "rid");
var pbsOf = /* @__PURE__ */ __name((rows) => (rows || []).filter((r4) => r4.before != null && r4.b < r4.before).sort((a, b) => b.before - b.b - (a.before - a.b)).slice(0, 3), "pbsOf");
function hm(secs) {
  const h = Math.floor(secs / 3600), m = Math.round(secs % 3600 / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
__name(hm, "hm");
var W = {
  en: {
    title: "Your week in Pitlane HQ",
    line: /* @__PURE__ */ __name((s) => `${s.sessions} session${s.sessions === 1 ? "" : "s"}, ${s.laps} lap${s.laps === 1 ? "" : "s"} and ${hm(s.secs)} on track.`, "line"),
    races: /* @__PURE__ */ __name((s) => `${s.races} race${s.races === 1 ? "" : "s"}, ${s.top5} in the top 5.`, "races"),
    pb: /* @__PURE__ */ __name((n) => n === 1 ? "1 new personal best." : `${n} new personal bests.`, "pb")
  },
  es: {
    title: "Tu semana en Pitlane HQ",
    line: /* @__PURE__ */ __name((s) => `${s.sessions} sesi${s.sessions === 1 ? "\xF3n" : "ones"}, ${s.laps} vuelta${s.laps === 1 ? "" : "s"} y ${hm(s.secs)} en pista.`, "line"),
    races: /* @__PURE__ */ __name((s) => `${s.races} carrera${s.races === 1 ? "" : "s"}, ${s.top5} en el top 5.`, "races"),
    pb: /* @__PURE__ */ __name((n) => n === 1 ? "1 nuevo r\xE9cord personal." : `${n} nuevos r\xE9cords personales.`, "pb")
  },
  pt: {
    title: "Sua semana no Pitlane HQ",
    line: /* @__PURE__ */ __name((s) => `${s.sessions} sess${s.sessions === 1 ? "\xE3o" : "\xF5es"}, ${s.laps} volta${s.laps === 1 ? "" : "s"} e ${hm(s.secs)} na pista.`, "line"),
    races: /* @__PURE__ */ __name((s) => `${s.races} corrida${s.races === 1 ? "" : "s"}, ${s.top5} no top 5.`, "races"),
    pb: /* @__PURE__ */ __name((n) => n === 1 ? "1 novo recorde pessoal." : `${n} novos recordes pessoais.`, "pb")
  }
};
function weekNote(sum, pbs, l) {
  if (!sum || !sum.sessions) return null;
  const w = W[L3(l)], lines = [w.line(sum)];
  if (sum.races) lines.push(w.races(sum));
  if (pbs && pbs.length) lines.push(w.pb(pbs.length));
  return { title: w.title, text: lines.join(" ") };
}
__name(weekNote, "weekNote");
function wake(env, acc, ctx) {
  const p = (env.push || pushAccount)(env, acc).catch(() => {
  });
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
  return p;
}
__name(wake, "wake");
async function recordBeaten(env, uid, x, now = Date.now()) {
  if (x.shown === "model" || String(uid).startsWith("o:")) return null;
  const rec = await env.DB.prepare(SQL_RECORD).bind(x.game, x.trackId, x.carId).first();
  if (!rec || rec.user_id === uid || !(x.time < rec.time)) return null;
  const [was, by] = await Promise.all([env.DB.prepare(SQL_ACCOUNT_OF).bind(rec.user_id).first(), env.DB.prepare(SQL_ACCOUNT_OF).bind(uid).first()]);
  const acc = was && was.acc;
  if (!acc || by && by.acc === acc) return null;
  const who2 = x.anon ? null : await env.DB.prepare(SQL_ALIAS).bind(uid).first();
  const data = {
    game: x.game,
    trackId: x.trackId,
    carId: x.carId,
    track: String(x.track || "").slice(0, 80),
    car: String(x.car || "").slice(0, 80),
    time: x.time,
    was: rec.time,
    by: who2 && who2.alias || ""
  };
  await env.DB.prepare(SQL_ALERT_ADD).bind(rid6(), acc, "record_beaten", now, JSON.stringify(data)).run();
  const w = wake(env, acc, x.ctx);
  if (!x.ctx) await w;
  return { account: acc, ...data };
}
__name(recordBeaten, "recordBeaten");
async function handleAlerts(req, env, url, { sessionAccount: sessionAccount2 }, now = Date.now()) {
  const p = url.pathname, m = req.method;
  if (p !== "/community/alerts" && p !== "/community/alerts/on") return null;
  const acc = await sessionAccount2(req, env);
  if (!acc) return json9({ error: "sign in with your Pitlane HQ account" }, 401);
  if (p === "/community/alerts" && m === "GET") {
    const since = Math.max(now - ALERT_DAYS * 864e5, +url.searchParams.get("since") || 0);
    const r4 = await env.DB.prepare(SQL_ALERTS).bind(acc.id, since).all();
    return json9({ now, alerts: (r4.results || []).map((a) => {
      let d = {};
      try {
        d = JSON.parse(a.data);
      } catch (e) {
      }
      return { ...d, id: a.id, kind: a.kind, created: a.created };
    }) });
  }
  if (p === "/community/alerts/on" && m === "GET") return json9({ on: !!await env.DB.prepare(SQL_SUB_GET).bind(acc.id).first() });
  if (p === "/community/alerts/on" && m === "POST") {
    const b = await req.json().catch(() => null) || {};
    if (b.on) await env.DB.prepare(SQL_SUB_ON).bind(acc.id, L3(String(b.lang || "").slice(0, 2))).run();
    else await env.DB.prepare(SQL_SUB_OFF).bind(acc.id).run();
    const tok = b.push && b.push.token;
    if (isPushToken(tok)) {
      if (b.on) await env.DB.prepare(SQL_TOKEN_ADD).bind(tok, acc.id, b.push.platform === "ios" ? "ios" : "android", now).run();
      else await env.DB.prepare(SQL_TOKEN_DEL).bind(tok).run();
    }
    return json9({ on: !!b.on });
  }
  return json9({ error: "not found" }, 404);
}
__name(handleAlerts, "handleAlerts");
async function weeklyAlerts(env, { sessionSummary: sessionSummary2 }, now = Date.now()) {
  const due = (await env.DB.prepare(SQL_DUE).bind(now - 5 * 864e5).all()).results || [];
  let written = 0;
  for (const d of due) {
    try {
      const up = "acct:" + d.account_id, from = now - WEEK;
      const sum = await sessionSummary2(env.DB, { from, tz: 0, game: null, uploader: up, now });
      const note2 = sum && sum.sessions ? weekNote(sum, pbsOf((await env.DB.prepare(SQL_PBS).bind(up, from).all()).results || []), d.lang) : null;
      if (note2) {
        await env.DB.prepare(SQL_ALERT_ADD).bind(rid6(), d.account_id, "week", now, JSON.stringify(note2)).run();
        written++;
        await wake(env, d.account_id);
      }
    } catch (e) {
    }
    await env.DB.prepare(SQL_WEEK_DONE).bind(d.account_id, now).run();
  }
  return { due: due.length, written };
}
__name(weeklyAlerts, "weeklyAlerts");
async function testerAlert(env, acc, now = Date.now()) {
  await env.DB.prepare(SQL_ALERT_ADD).bind(rid6(), acc, "tester", now, "{}").run();
  await wake(env, acc);
}
__name(testerAlert, "testerAlert");
var pruneAlerts = /* @__PURE__ */ __name((env, now = Date.now()) => env.DB.prepare(SQL_ALERT_PRUNE).bind(now - ALERT_DAYS * 864e5).run(), "pruneAlerts");

// src/alerts.js
var alertsRoute = /* @__PURE__ */ __name((req, env, url) => handleAlerts(req, env, url, { sessionAccount }), "alertsRoute");
var weeklyAlerts2 = /* @__PURE__ */ __name((env, now) => weeklyAlerts(env, { sessionSummary }, now), "weeklyAlerts");

// src/leaguescan.js
var FEEDS = [
  ["iRacing", "https://www.reddit.com/r/iRacing/new/.rss?limit=100", "iracing"],
  ["iRacingLeagues", "https://www.reddit.com/r/iRacingLeagues/new/.rss?limit=100", "iracing"],
  ["LeMansUltimateWEC", "https://www.reddit.com/r/LeMansUltimateWEC/new/.rss?limit=100", "lmu"],
  ["simracing", "https://www.reddit.com/r/simracing/new/.rss?limit=100", ""]
];
var LEAGUE_GAMES = ["iracing", "lmu"];
var leagueGame = /* @__PURE__ */ __name((g) => {
  const x = gameOf(String(g || "").toLowerCase());
  return LEAGUE_GAMES.includes(x) ? x : "iracing";
}, "leagueGame");
var LMU_RE = /le ?mans ultimate|\blmu\b/i;
var gameOfPost = /* @__PURE__ */ __name((t) => /iracing/i.test(t) ? "iracing" : LMU_RE.test(t) ? "lmu" : "", "gameOfPost");
var UA = "web:app.pitlanehq.leagues:v1.0 (+https://pitlanehq.app)";
var EVERY2 = 6 * 36e5;
var RETRY = 30 * 6e4;
var STUCK = 24 * 36e5;
var KEEP = 60 * 864e5;
var RECHECK = 6 * 36e5;
var MIN_ONLINE = 5;
var INVITE = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,32})/i;
var LEAGUE = /\b(leagues?|series|season|championship|endurance|cup|drivers? wanted|recruit\w*|looking for (?:new |more )?(?:drivers|racers)|join us|sign[- ]?ups?|open to all|all welcome)\b/i;
var NOT = /\blooking for an? (?:league|team|series)\b|\bbroadcast(?:ing)? your league\b/i;
var unesc = /* @__PURE__ */ __name((s) => String(s || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&amp;/g, "&"), "unesc");
var tag = /* @__PURE__ */ __name((e, t) => {
  const m = e.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`));
  return m ? m[1] : "";
}, "tag");
var DISC = [
  ["dirt_oval", /\bdirt (?:oval|late model|track)|sprint ?cars?|midgets?|modifieds? dirt|world of outlaws/i],
  ["dirt_road", /\brallycross|dirt road|\brx\b|pro ?[24] (?:lite|trucks?)|off[- ]road/i],
  ["oval", /\bnascar|\boval\b|\btrucks?\b|\barca\b|late models?|next gen|xfinity|cup series|superspeedway|indy ?500/i],
  ["formula_car", /\bf1\b|formula|\bf[34]\b|super formula|indycar|open[- ]wheel|skip barber|\bff1600|\bfr2\.0|dallara|\bsfl\b|lights/i],
  ["sports_car", /\bgt[34]\b|\bgte\b|\blmp\d?\b|\blmdh|\bgtp\b|porsche|mx-?5|\bbmw\b|ferrari|imsa|endurance|supercars?|\btcr\b|touring|multi-?class|gr86|supra|mustang|camaro|mercedes|audi|lamborghini|mclaren|aston/i]
];
var catsOf = /* @__PURE__ */ __name((t) => DISC.filter(([, re]) => re.test(t)).map(([k]) => k), "catsOf");
async function redditToken(env) {
  if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) return "";
  const r4 = await fetch("https://www.reddit.com/api/v1/access_token", { method: "POST", headers: { "User-Agent": UA, Authorization: "Basic " + btoa(env.REDDIT_CLIENT_ID + ":" + env.REDDIT_CLIENT_SECRET), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  return r4.ok ? (await r4.json()).access_token || "" : "";
}
__name(redditToken, "redditToken");
async function readFeed(sub, url, token) {
  if (token) {
    const r5 = await fetch(`https://oauth.reddit.com/r/${sub}/new?limit=100&raw_json=1`, { headers: { "User-Agent": UA, Authorization: "Bearer " + token } });
    if (!r5.ok) throw new Error(String(r5.status));
    return (((await r5.json()).data || {}).children || []).map(({ data: d }) => ({ id: "t3_" + d.id, title: String(d.title || "").slice(0, 200), body: (d.selftext || "") + " " + (d.url || ""), at: (d.created_utc || 0) * 1e3, link: "https://www.reddit.com" + (d.permalink || "") }));
  }
  const r4 = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/atom+xml" } });
  if (!r4.ok) throw new Error(String(r4.status));
  const xml = await r4.text();
  return (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).map((e) => ({
    id: tag(e, "id"),
    title: unesc(tag(e, "title")).slice(0, 200),
    body: unesc(unesc(tag(e, "content"))),
    at: Date.parse(tag(e, "published")) || Date.now(),
    link: (e.match(/<link href="([^"]+)"/) || [])[1] || ""
  }));
}
__name(readFeed, "readFeed");
async function invite(code) {
  const r4 = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`, { headers: { "User-Agent": UA } });
  if (r4.status === 404) return { dead: true };
  if (!r4.ok) return null;
  const j = await r4.json();
  if (!j.guild || !j.guild.id) return { dead: true };
  return {
    guild: String(j.guild.id),
    name: String(j.guild.name || "").slice(0, 100),
    icon: j.guild.icon ? `https://cdn.discordapp.com/icons/${j.guild.id}/${j.guild.icon}.png?size=64` : "",
    members: +j.approximate_member_count || 0,
    online: +j.approximate_presence_count || 0
  };
}
__name(invite, "invite");
async function scanLeagues(env, force) {
  if (env.LOCAL === "1") return;
  const now = Date.now(), st = /* @__PURE__ */ __name(async (sub) => {
    try {
      const r4 = await env.DB.prepare("SELECT v FROM app_state WHERE k=?1").bind("lg_feed_" + sub).first();
      return JSON.parse(r4 && r4.v || "{}");
    } catch (e) {
      return {};
    }
  }, "st");
  const save = /* @__PURE__ */ __name((sub, o) => env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v=?2, at=?3").bind("lg_feed_" + sub, JSON.stringify(o), now).run(), "save");
  const due = [];
  for (const [sub, url, game] of FEEDS) {
    const f = await st(sub);
    if (force || now - (f.ok || 0) >= EVERY2 && now - (f.fail || 0) >= RETRY) due.push([sub, url, f, game]);
  }
  const lastScan = await env.DB.prepare("SELECT at FROM app_state WHERE k='leagues_scan'").first().catch(() => null);
  if (!due.length && !force && lastScan && now - lastScan.at < EVERY2) return;
  let read = 0, found = 0, okAny = false;
  const token = due.length ? await redditToken(env).catch(() => "") : "";
  for (const [sub, url, f, feedGame] of due) {
    if (read) await new Promise((r4) => setTimeout(r4, 2e3));
    let posts = [];
    try {
      posts = await readFeed(sub, url, token);
    } catch (e) {
      await save(sub, { ...f, fail: now, err: e.message, since: f.since || now });
      continue;
    }
    await save(sub, { ok: now });
    okAny = true;
    for (const { id: id2, title, body, at: at2, link } of posts) {
      read++;
      if (!id2) continue;
      const m = (title + " " + body).match(INVITE);
      if (!m || !LEAGUE.test(title + " " + body.slice(0, 1500)) || NOT.test(title)) continue;
      const game = feedGame || gameOfPost(title + " " + body);
      if (!game) continue;
      const seen2 = await env.DB.prepare("SELECT 1 FROM league_found_posts WHERE id=?1").bind(id2).first();
      if (seen2) continue;
      const code = m[1], known = await env.DB.prepare("SELECT guild FROM league_found WHERE code=?1").bind(code).first();
      let guild = known && known.guild, info = null;
      if (!guild) {
        info = await invite(code).catch(() => null);
        if (!info) continue;
        if (info.dead) {
          await env.DB.prepare("INSERT OR IGNORE INTO league_found_posts (id, guild, at) VALUES (?1, '', ?2)").bind(id2, at2).run();
          continue;
        }
        guild = info.guild;
      }
      const cats = JSON.stringify(game === "lmu" ? ["sports_car"] : catsOf(title + " " + body.slice(0, 2e3)));
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO league_found_posts (id, guild, at) VALUES (?1, ?2, ?3)").bind(id2, guild, at2),
        // a league already found keeps its game (the subreddit it was found in first)
        env.DB.prepare(`INSERT INTO league_found (guild, code, name, icon, title, url, sub, posted, first, posts, members, online, cats, checked, game)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, 1, ?9, ?10, ?11, ?12, ?13)
          ON CONFLICT(guild) DO UPDATE SET posts=posts+1, dead=0, code=CASE WHEN ?8>=COALESCE(posted,0) THEN ?2 ELSE code END,
            title=CASE WHEN ?8>=COALESCE(posted,0) THEN ?5 ELSE title END, url=CASE WHEN ?8>=COALESCE(posted,0) THEN ?6 ELSE url END,
            sub=CASE WHEN ?8>=COALESCE(posted,0) THEN ?7 ELSE sub END, posted=MAX(COALESCE(posted,0), ?8), first=MIN(COALESCE(first,?8), ?8),
            cats=CASE WHEN cats IS NULL OR cats='[]' THEN ?11 ELSE cats END`).bind(guild, code, info ? info.name : null, info ? info.icon : null, title, link, sub, at2, info ? info.members : null, info ? info.online : null, cats, info ? now : null, game)
      ]);
      found++;
    }
  }
  const stale = (await env.DB.prepare("SELECT guild, code FROM league_found WHERE dead=0 AND (checked IS NULL OR checked<?1) ORDER BY COALESCE(checked,0) ASC LIMIT 40").bind(now - RECHECK).all()).results || [];
  for (const x of stale) {
    const info = await invite(x.code).catch(() => null);
    if (!info) continue;
    if (info.dead) await env.DB.prepare("UPDATE league_found SET dead=1, checked=?2 WHERE guild=?1").bind(x.guild, now).run();
    else await env.DB.prepare("UPDATE league_found SET name=?2, icon=?3, members=?4, online=?5, checked=?6 WHERE guild=?1").bind(x.guild, info.name, info.icon, info.members, info.online, now).run();
  }
  await env.DB.prepare("DELETE FROM league_found_posts WHERE at<?1").bind(now - 2 * KEEP).run();
  if (okAny || stale.length || !lastScan) await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('leagues_scan', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=?1, at=?2").bind(JSON.stringify({ read, found, checked: stale.length }), now).run();
}
__name(scanLeagues, "scanLeagues");
async function addFound(env, link, game) {
  const g = leagueGame(game);
  const m = String(link || "").match(INVITE) || String(link || "").match(/^([A-Za-z0-9-]{2,32})$/);
  if (!m) return { error: "not a Discord invite" };
  const info = await invite(m[1]).catch(() => null);
  if (!info) return { error: "Discord did not answer, try again" };
  if (info.dead) return { error: "this invite does not work" };
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO league_found (guild, code, name, icon, title, url, sub, posted, first, posts, members, online, cats, checked, dead, hidden, game)
    VALUES (?1, ?2, ?3, ?4, '', '', 'manual', ?5, ?5, 0, ?6, ?7, ?9, ?5, 0, 0, ?8)
    ON CONFLICT(guild) DO UPDATE SET code=?2, name=?3, icon=?4, sub='manual', members=?6, online=?7, checked=?5, dead=0, hidden=0, game=?8`).bind(info.guild, m[1], info.name, info.icon, now, info.members, info.online, g, g === "lmu" ? '["sports_car"]' : "[]").run();
  return { ok: true, name: info.name, game: g };
}
__name(addFound, "addFound");
var editOf = /* @__PURE__ */ __name((x) => {
  try {
    return JSON.parse(x.edit || "{}") || {};
  } catch (e) {
    return {};
  }
}, "editOf");
var FOUND_CATS = ["oval", "sports_car", "formula_car", "dirt_oval", "dirt_road"];
async function editFound(env, guild, e) {
  let v = null;
  if (e) {
    const o = {}, name2 = String(e.name || "").trim().slice(0, 80), title = e.title == null ? null : String(e.title).trim().slice(0, 240);
    if (name2) o.name = name2;
    if (title != null) o.title = title;
    if (Array.isArray(e.cats)) o.cats = [...new Set(e.cats.filter((c) => FOUND_CATS.includes(c)))];
    v = JSON.stringify(o);
  }
  const r4 = await env.DB.prepare("UPDATE league_found SET edit=?2 WHERE guild=?1").bind(guild, v).run();
  return !!(r4.meta && r4.meta.changes);
}
__name(editFound, "editFound");
async function foundLeagues(env, admin, game) {
  const g = leagueGame(game);
  const now = Date.now();
  const st = await env.DB.prepare("SELECT v, at FROM app_state WHERE k='leagues_scan'").first().catch(() => null);
  const rows = (await env.DB.prepare(`SELECT * FROM league_found WHERE game=?2 AND dead=0 AND (sub='manual' OR online>=?1) ${admin ? "" : "AND hidden=0"}
    ORDER BY online DESC, members DESC LIMIT 60`).bind(MIN_ONLINE, g).all()).results || [];
  let info = {};
  try {
    info = JSON.parse(st && st.v || "{}");
  } catch (e) {
  }
  const errs = [];
  if (admin) for (const [sub, , fg] of FEEDS) {
    if (fg && fg !== g) continue;
    const r4 = await env.DB.prepare("SELECT v FROM app_state WHERE k=?1").bind("lg_feed_" + sub).first().catch(() => null);
    let f = {};
    try {
      f = JSON.parse(r4 && r4.v || "{}");
    } catch (e) {
    }
    if (f.fail && now - (f.since || f.fail) > STUCK) errs.push(`r/${sub} ${f.err || ""}`.trim());
  }
  return {
    game: g,
    updated: st ? st.at : 0,
    read: info.read || 0,
    errs: admin ? errs : void 0,
    leagues: rows.map((x) => {
      const e = editOf(x), cats = (() => {
        try {
          return JSON.parse(x.cats || "[]");
        } catch (er) {
          return [];
        }
      })();
      return {
        guild: x.guild,
        name: e.name || x.name || "",
        icon: x.icon || "",
        invite: "https://discord.gg/" + x.code,
        title: e.title != null ? e.title : x.title || "",
        url: x.url || "",
        sub: x.sub || "",
        posted: x.posted,
        posts: x.posts,
        members: x.members || 0,
        online: x.online || 0,
        cats: e.cats || cats,
        game: x.game || "iracing",
        checked: x.checked,
        hidden: admin ? !!x.hidden : void 0,
        edited: admin ? !!x.edit : void 0
      };
    })
  };
}
__name(foundLeagues, "foundLeagues");

// src/lmuclass.js
var NAMED = [
  [/hyper/i, "Hypercar"],
  [/lmp\s*2/i, "LMP2"],
  [/lmp\s*3/i, "LMP3"],
  [/gte/i, "LMGTE"],
  [/gt3/i, "LMGT3"]
];
var BY_CAR = [
  [/gt3/i, "LMGT3"],
  [/gte|rsr|c8\.r|vantage amr/i, "LMGTE"],
  [/499p|963|gr010|9x8|v-series\.r|m hybrid|a424|sc63|scg ?007|vanwall|vandervell|isotta|tipo ?6|valkyrie|hypercar|lmdh|lmh/i, "Hypercar"],
  [/oreca|lmp2/i, "LMP2"],
  [/ligier|ginetta|duqueine|lmp3/i, "LMP3"]
];
function lmuClass(raw, car) {
  const r4 = String(raw || "").trim();
  for (const [re, n] of NAMED) if (re.test(r4)) return n;
  const c = String(car || "");
  for (const [re, n] of BY_CAR) if (re.test(c)) return n;
  const own = r4.replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 16);
  return own || null;
}
__name(lmuClass, "lmuClass");
function wetOf(flags) {
  if (!Array.isArray(flags)) return null;
  const w = (flags.includes("wet") ? 2 : flags.includes("damp") ? 4 : 0) | (flags.includes("rain") ? 1 : 0);
  return w || null;
}
__name(wetOf, "wetOf");
var clsParam = /* @__PURE__ */ __name((v) => {
  const s = String(v || "").trim();
  return /^[A-Za-z0-9 ]{1,16}$/.test(s) ? s : null;
}, "clsParam");
async function classLaps(env, trackId, cls, opts = {}) {
  const r4 = await env.DB.prepare(
    `WITH b AS (SELECT l.*, ROW_NUMBER() OVER (PARTITION BY l.user_id ORDER BY l.time) AS rk
         FROM community_laps l WHERE l.game='lmu' AND l.track_id=?1 AND l.cls=?2 AND COALESCE(l.shown,'')<>'model')
     SELECT l.id, l.user_id AS uid, CASE WHEN l.anon=1${opts.rivals ? " AND l.user_id NOT LIKE 'o:%'" : ""} THEN 'Anonymous' WHEN l.shown='iracing' AND COALESCE(u.iracing,'')<>'' THEN u.iracing ELSE u.alias END AS alias,
       l.time, l.sectors, l.created, (l.trace IS NOT NULL OR ${opts.acctTrace || "0"}) AS hasTrace, l.car, l.car_id AS carId, l.track, l.lic, l.wet, l.cls,
       (${opts.admin ? "ac.id IS NOT NULL OR " : ""}(l.anon=0 AND ac.id IS NOT NULL AND COALESCE(ac.anon,0)=0)) AS prof, (l.anon=0 AND COALESCE(ac.supporter,0)=1 AND COALESCE(ac.supporter_hidden,0)=0) AS sup
     FROM b l JOIN community_users u ON u.id=l.user_id LEFT JOIN accounts ac ON ac.id=l.user_id
     WHERE l.rk=1 ORDER BY l.time LIMIT 200`
  ).bind(trackId, cls).all();
  return r4.results || [];
}
__name(classLaps, "classLaps");

// src/lapsectors.js
function traceSectors(tr2, time) {
  const d = tr2 && Array.isArray(tr2.d) ? tr2.d : null;
  if (!d || d.length < 60 || !(time > 10)) return null;
  const at2 = /* @__PURE__ */ __name((i) => Array.isArray(d[i]) ? Number(d[i][5]) : NaN, "at");
  const t1 = at2(Math.floor(d.length / 3)), t2 = at2(Math.floor(2 * d.length / 3));
  if (!(t1 > 0 && t2 > t1 && time > t2)) return null;
  const r4 = /* @__PURE__ */ __name((v) => Math.round(v * 1e3) / 1e3, "r");
  const s1 = r4(t1), s2 = r4(t2 - t1), s3 = r4(time - r4(t1) - s2);
  if ([s1, s2, s3].some((s) => !(s > 0.1 * time && s < 0.67 * time))) return null;
  return [s1, s2, s3];
}
__name(traceSectors, "traceSectors");
async function sealedSectors(env, trace, time) {
  if (!trace) return null;
  try {
    const s = traceSectors(JSON.parse(await openData(env, trace)), time);
    return s ? JSON.stringify(s) : null;
  } catch {
    return null;
  }
}
__name(sealedSectors, "sealedSectors");
async function fillSectors(env, limit = 100) {
  const rows = (await env.DB.prepare("SELECT id, time, trace FROM community_laps WHERE sectors IS NULL AND trace IS NOT NULL LIMIT ?1").bind(limit).all()).results || [];
  for (const x of rows) {
    const s = await sealedSectors(env, x.trace, x.time);
    await env.DB.prepare("UPDATE community_laps SET sectors=?2 WHERE id=?1 AND sectors IS NULL").bind(x.id, s || "[]").run();
  }
  return rows.length;
}
__name(fillSectors, "fillSectors");

// src/friends.js
var JSONH7 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
var json10 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH7 }), "json");
var err6 = /* @__PURE__ */ __name((msg, status) => json10({ error: msg }, status), "err");
var FOLLOW_MAX = 200;
var ID_RE = /^[A-Za-z0-9]{8,40}$/;
async function follows(env, account, id2) {
  if (!account || !ID_RE.test(String(id2 || ""))) return false;
  return !!await env.DB.prepare("SELECT 1 AS x FROM follows WHERE account_id=?1 AND driver_id=?2").bind(account, id2).first().catch(() => null);
}
__name(follows, "follows");
async function target(env, b) {
  let id2 = null;
  if (typeof b.lap === "string" && b.lap) {
    const l = await env.DB.prepare("SELECT user_id, anon FROM community_laps WHERE id=?1").bind(b.lap.slice(0, 80)).first();
    if (!l || l.anon === 1) return null;
    id2 = l.user_id;
  } else if (ID_RE.test(String(b.id || ""))) id2 = b.id;
  if (!id2) return null;
  const a = await env.DB.prepare("SELECT id, anon FROM accounts WHERE id=?1").bind(id2).first();
  return a && !a.anon ? a.id : null;
}
__name(target, "target");
async function friendRoutes(req, env, p, m, body, url, game, acc) {
  if (!p.startsWith("/friends")) return null;
  if (!acc) return err6("sign in with your Pitlane HQ account to follow drivers", 401);
  if ((p === "/friends/follow" || p === "/friends/unfollow") && m === "POST") {
    const id2 = await target(env, body || {});
    if (p === "/friends/unfollow") {
      const del = id2 || (ID_RE.test(String((body || {}).id || "")) ? body.id : null);
      if (del) await env.DB.prepare("DELETE FROM follows WHERE account_id=?1 AND driver_id=?2").bind(acc.id, del).run();
      return json10({ following: false });
    }
    if (!id2) return err6("this driver is anonymous", 404);
    if (id2 === acc.id) return err6("that is you", 400);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM follows WHERE account_id=?1").bind(acc.id).first();
    if (n && n.n >= FOLLOW_MAX) return err6(`you follow ${FOLLOW_MAX} drivers already`, 400);
    await env.DB.prepare("INSERT OR IGNORE INTO follows (account_id, driver_id, created) VALUES (?1,?2,?3)").bind(acc.id, id2, Date.now()).run();
    return json10({ following: true, id: id2 });
  }
  if (p === "/friends" && m === "GET") {
    const fr = (await env.DB.prepare(
      `SELECT f.driver_id AS id, u.alias AS name, (COALESCE(a.supporter,0)=1 AND COALESCE(a.supporter_hidden,0)=0) AS sup, f.created
       FROM follows f JOIN accounts a ON a.id=f.driver_id JOIN community_users u ON u.id=f.driver_id
       WHERE f.account_id=?1 AND COALESCE(a.anon,0)=0 ORDER BY f.created DESC LIMIT ${FOLLOW_MAX}`
    ).bind(acc.id).all()).results || [];
    const laps = fr.length ? (await env.DB.prepare(
      `SELECT id, user_id AS uid, track, car, track_id AS trackId, car_id AS carId, time, game, created, wet FROM community_laps
       WHERE user_id IN (SELECT driver_id FROM follows WHERE account_id=?1) AND anon=0 AND COALESCE(shown,'')<>'model'
       ORDER BY created DESC LIMIT 600`
    ).bind(acc.id).all()).results || [] : [];
    const by = /* @__PURE__ */ new Map();
    for (const l of laps) {
      const k = by.get(l.uid) || [];
      if (k.length < 8) k.push(l);
      by.set(l.uid, k);
    }
    return json10({ friends: fr.map((f) => ({ id: f.id, name: f.name || "Driver", sup: !!f.sup, since: f.created, laps: (by.get(f.id) || []).map(({ uid, ...l }) => l) })) });
  }
  if (p === "/friends/laps" && m === "GET") {
    const t = +url.searchParams.get("trackId"), c = await famId(env, game, url.searchParams.get("carId"));
    if (!t || !c) return err6("trackId and carId", 400);
    const r4 = await env.DB.prepare(
      `SELECT l.id, l.user_id AS fid, u.alias, l.time, l.sectors, l.wet FROM community_laps l JOIN community_users u ON u.id=l.user_id JOIN accounts a ON a.id=l.user_id
       WHERE l.track_id=?1 AND l.car_id=?2 AND l.game=?3 AND l.anon=0 AND COALESCE(a.anon,0)=0 AND COALESCE(l.shown,'')<>'model'
         AND l.user_id IN (SELECT driver_id FROM follows WHERE account_id=?4) ORDER BY l.time LIMIT ${FOLLOW_MAX}`
    ).bind(t, c, game, acc.id).all();
    return json10({ laps: (r4.results || []).map((x) => ({ ...x, sectors: x.sectors ? JSON.parse(x.sectors) : null })) });
  }
  return err6("not found", 404);
}
__name(friendRoutes, "friendRoutes");

// src/community.js
var JSONH8 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
var json11 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH8 }), "json");
var err7 = /* @__PURE__ */ __name((msg, status) => json11({ error: msg }, status), "err");
var str3 = /* @__PURE__ */ __name((v, max = 120) => typeof v === "string" ? v.slice(0, max) : v == null ? null : String(v).slice(0, max), "str");
var num2 = /* @__PURE__ */ __name((v) => typeof v === "number" && isFinite(v) ? v : null, "num");
var int3 = /* @__PURE__ */ __name((v) => Number.isInteger(v) && v > 0 && v < 1e9 ? v : null, "int");
var rid7 = /* @__PURE__ */ __name(() => [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, "0")).join(""), "rid");
var SHARES_TRACES = "EXISTS (SELECT 1 FROM community_laps c2 WHERE c2.user_id=?1 AND c2.trace IS NOT NULL)";
var ACCT_TRACE_WHERE = `s.uploader='acct:'||?1 AND ABS(a.time-?2)<0.002 AND s.game=?3 AND a.valid=1 AND a.trace IS NOT NULL AND ${SHARES_TRACES}`;
var ACCT_TRACE = `(EXISTS (SELECT 1 FROM laps a JOIN sessions s ON s.id=a.session_id WHERE s.uploader='acct:'||l.user_id AND ABS(a.time-l.time)<0.002 AND s.game=l.game AND a.valid=1 AND a.trace IS NOT NULL)
  AND EXISTS (SELECT 1 FROM community_laps c2 WHERE c2.user_id=l.user_id AND c2.trace IS NOT NULL))`;
async function sha2562(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(sha2562, "sha256");
var cleanAlias = /* @__PURE__ */ __name((a) => (str3(a, 32) || "").replace(/[\u0000-\u001f<>]/g, "").trim() || "Driver", "cleanAlias");
async function me(req, env) {
  const a = await sessionAccount(req, env);
  if (a) {
    const u = await env.DB.prepare("SELECT id, alias, uploads_day, uploads FROM community_users WHERE id=?1").bind(a.id).first();
    return u ? { ...u, account: true } : null;
  }
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (t.length < 20) return null;
  return env.DB.prepare("SELECT id, alias, uploads_day, uploads FROM community_users WHERE token_hash=?1").bind(await sha2562(t)).first();
}
__name(me, "me");
var seesRivals = /* @__PURE__ */ __name((req, env, who2) => !!who2 && isAdmin(env, who2.id) && req.headers.get("x-pitlane-admin") === "1", "seesRivals");
var shownName = /* @__PURE__ */ __name((l, u, rivals) => `CASE WHEN ${l}.anon=1${rivals ? ` AND ${l}.user_id NOT LIKE 'o:%'` : ""} THEN 'Anonymous' WHEN ${l}.shown='iracing' AND COALESCE(${u}.iracing,'')<>'' THEN ${u}.iracing ELSE ${u}.alias END`, "shownName");
var CAR_RE = /^[A-Za-z0-9 _.\-]{1,80}$/;
var cleanFile = /* @__PURE__ */ __name((n) => (typeof n === "string" ? n : "").replace(/[^A-Za-z0-9 _\-()+.,]/g, "").replace(/^[ .]+|[ .]+$/g, "").slice(0, 60) || "setup", "cleanFile");
async function countUpload(env, u) {
  const day4 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const n = u.uploads_day === day4 ? u.uploads + 1 : 1;
  if (n > 1500) return false;
  await env.DB.prepare("UPDATE community_users SET uploads_day=?2, uploads=?3 WHERE id=?1").bind(u.id, day4, n).run();
  return true;
}
__name(countUpload, "countUpload");
var LEAGUES_FREE = 3;
var LEAGUES_SUPPORTER = 10;
var isTestDrive = /* @__PURE__ */ __name((kind) => /test/i.test(String(kind || "")), "isTestDrive");
var officialOf = /* @__PURE__ */ __name((v) => typeof v === "boolean" ? v ? 1 : 0 : v === 1 || v === 0 ? v : null, "officialOf");
async function otherId(env, key2) {
  return "o:" + (await sha2562("other|" + (env.DATA_KEY || "") + "|" + String(key2).toLowerCase())).slice(0, 24);
}
__name(otherId, "otherId");
function driverName(v) {
  const w = String(v || "").normalize("NFC").split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}'.-]/gu, "")).filter(Boolean);
  if (!w.length || /^anonym/i.test(w[0])) return "";
  return [...w.join(" ")].slice(0, 48).join("");
}
__name(driverName, "driverName");
function shortDriverName(v) {
  const w = String(v || "").normalize("NFC").split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}'.-]/gu, "")).filter(Boolean);
  if (!w.length) return "";
  const first = [...w[0]].slice(0, 20).join("").replace(/\.$/, "");
  if (!first || /^anonym/i.test(first)) return "";
  if (w.length === 1) return first;
  const ini = [...w[w.length - 1]].find((c) => /[\p{L}\p{N}]/u.test(c));
  return ini ? first + " " + ini.toUpperCase() + "." : first;
}
__name(shortDriverName, "shortDriverName");
async function sealedWet(env, trace) {
  if (!trace) return null;
  try {
    const tr2 = JSON.parse(await openData(env, trace));
    return wetOf(tr2 && tr2.f);
  } catch {
    return null;
  }
}
__name(sealedWet, "sealedWet");
async function keepBestLap(env, uid, x) {
  x = { ...x, carId: await noteCar(env, x.game, x.carId, x.car) };
  const old = await env.DB.prepare("SELECT time, game, trace IS NOT NULL AS traced FROM community_laps WHERE user_id=?1 AND car_id=?2 AND track_id=?3").bind(uid, x.carId, x.trackId).first();
  if (old && old.game === x.game && old.time <= x.time && (old.traced || !x.trace)) return { kept: true, traced: !!old.traced };
  if (x.len > 0 && !fitsLayout(x.len, await layoutN(env, x.game, x.trackId))) return { kept: true, layout: true };
  if (x.count && !await x.count()) return { limit: true };
  await recordBeaten(env, uid, x).catch(() => {
  });
  const cls = x.game === "lmu" ? lmuClass(x.cls, x.car) : null;
  const wet = x.wet !== void 0 ? x.wet : await sealedWet(env, x.trace);
  const sectors = x.sectors && x.sectors !== "[]" ? x.sectors : await sealedSectors(env, x.trace, x.time) || x.sectors || null;
  await env.DB.prepare(
    `INSERT INTO community_laps (id, user_id, car_id, car, track_id, track, time, sectors, trace, created, anon, game, shown, lic, cat, official, ai, cls, wet) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)
     ON CONFLICT(user_id, car_id, track_id) DO UPDATE SET time=excluded.time, sectors=excluded.sectors, trace=excluded.trace, created=excluded.created, car=excluded.car, track=excluded.track, anon=excluded.anon, game=excluded.game, shown=excluded.shown,
       lic=COALESCE(excluded.lic, community_laps.lic), cat=COALESCE(excluded.cat, community_laps.cat), official=excluded.official, ai=excluded.ai, cls=COALESCE(excluded.cls, community_laps.cls), wet=excluded.wet`
  ).bind(rid7(), uid, x.carId, str3(x.car), x.trackId, str3(x.track), x.time, sectors, x.trace || null, Date.now(), x.anon ? 1 : 0, x.game, x.shown || "nick", licOf(x.lic), str3(x.cat, 20), officialOf(x.official), x.ai ? 1 : null, cls, wet ?? null).run();
  await markModel(env, x.game, x.trackId, x.carId);
  const improved = !old || old.game !== x.game || x.time < old.time;
  const res = { shared: true, traced: !!x.trace, improved, prev: old && old.game === x.game ? old.time : null, game: x.game, trackId: x.trackId, carId: x.carId, track: x.track, car: x.car, time: x.time, anon: !!x.anon };
  if (improved && x.ctx) x.ctx.waitUntil(discordLapAlert(env, uid, res).catch(() => {
  }));
  return res;
}
__name(keepBestLap, "keepBestLap");
async function comboIds(env, s, name2, g, uid, body) {
  let trackId = s.track_id, carId = s.car_id;
  if (!trackId && int3(body && body.trackId)) trackId = int3(body.trackId);
  if (!carId && int3(body && body.carId)) carId = int3(body.carId);
  if (!trackId || !carId) {
    const x = await env.DB.prepare("SELECT track_id, car_id FROM community_laps WHERE (lower(track)=lower(?1) OR lower(track)=lower(?2)) AND lower(car)=lower(?3) AND game=?4 ORDER BY (track_id<900000000) DESC LIMIT 1").bind(name2, s.track, s.car, g).first() || await env.DB.prepare("SELECT track_id, car_id FROM community_reports WHERE (lower(track)=lower(?1) OR lower(track)=lower(?2)) AND lower(car)=lower(?3) AND game=?4 AND track_id>0 AND car_id>0 ORDER BY (track_id<900000000) DESC LIMIT 1").bind(name2, s.track, s.car, g).first();
    if (x) {
      trackId = trackId || x.track_id;
      carId = carId || x.car_id;
    }
  }
  if (!trackId) {
    const t = await env.DB.prepare("SELECT track_id FROM community_laps WHERE (track=?1 OR track=?2) AND game=?3 LIMIT 1").bind(name2, s.track, g).first() || await env.DB.prepare("SELECT track_id FROM track_maps WHERE (track=?1 OR track=?2) AND game=?3 LIMIT 1").bind(name2, s.track, g).first();
    if (t) trackId = t.track_id;
  }
  if (!carId) {
    const c = await env.DB.prepare("SELECT car_id FROM community_laps WHERE car=?1 AND game=?2 LIMIT 1").bind(s.car, g).first();
    if (c) carId = c.car_id;
  }
  if (!trackId || !carId) {
    const o = await env.DB.prepare("SELECT track_id, car_id FROM sessions WHERE game=?1 AND lower(car)=lower(?2) AND (lower(track)=lower(?3) OR lower(track||' \xB7 '||COALESCE(track_config,''))=lower(?4)) AND track_id>0 AND car_id>0 ORDER BY (uploader=?5) DESC, started DESC LIMIT 1").bind(g, s.car, s.track, name2, "acct:" + uid).first();
    if (o) {
      trackId = trackId || o.track_id;
      carId = carId || o.car_id;
    }
  }
  if (!trackId) trackId = await pseudoId("t", g, name2);
  if (!carId) carId = await pseudoId("c", g, s.car);
  if (!s.track_id || !s.car_id) await env.DB.prepare("UPDATE sessions SET track_id=COALESCE(track_id,?2), car_id=COALESCE(car_id,?3) WHERE id=?1").bind(s.id, trackId, carId).run();
  return { trackId, carId };
}
__name(comboIds, "comboIds");
async function autoShare(env, accountId, sessionId, laps, hint, ctx) {
  const ok = new Set(((await env.DB.prepare("SELECT id FROM laps WHERE session_id=?1 AND valid=1 AND drv IS NULL").bind(sessionId).all()).results || []).map((r4) => String(r4.id)));
  const best = (laps || []).filter((l) => l && ok.has(String(l.id)) && !(typeof l.drv === "string" && l.drv.trim()) && num2(l.time) > 10 && l.time < 3600).sort((a, b) => a.time - b.time || (b.trace ? 1 : 0) - (a.trace ? 1 : 0))[0];
  if (!best) return null;
  const acc = await env.DB.prepare("SELECT a.anon, a.name_kind FROM accounts a JOIN community_users u ON u.id=a.id WHERE a.id=?1").bind(accountId).first();
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE id=?1 AND uploader=?2").bind(sessionId, "acct:" + accountId).first();
  const lap = await env.DB.prepare("SELECT time, sectors, trace FROM laps WHERE id=?1 AND session_id=?2 AND valid=1 AND drv IS NULL").bind(String(best.id), sessionId).first();
  if (!acc || !s || !lap || isTestDrive(s.kind)) return null;
  const g = s.game || "iracing", name2 = s.track + (s.track_config ? " \xB7 " + s.track_config : "");
  const { trackId, carId } = await comboIds(env, s, name2, g, accountId, hint);
  if (g === "iracing" && licOf(hint && hint.lic) && !(hint && hint.imported)) await rememberLic(env, accountId, catOf(await catMap(env), trackId, carId, hint && hint.cat, name2, s.car), hint.lic).catch(() => {
  });
  return keepBestLap(env, accountId, { game: g, carId, trackId, car: s.car, track: name2, time: lap.time, sectors: lap.sectors, trace: lap.trace, anon: !!acc.anon, shown: acc.name_kind === "iracing" ? "iracing" : "nick", lic: hint && hint.lic, cat: hint && hint.cat, official: s.official, ai: s.ai === 1, ctx });
}
__name(autoShare, "autoShare");
async function unshareInvalid(env, accountId, sid) {
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE id=?1 AND uploader=?2").bind(sid, "acct:" + accountId).first();
  if (!s) return;
  const bad = (await env.DB.prepare("SELECT time FROM laps WHERE session_id=?1 AND valid=0 AND time>0").bind(sid).all()).results || [];
  const g = s.game || "iracing", name2 = s.track + (s.track_config ? " \xB7 " + s.track_config : "");
  const { trackId, carId } = await comboIds(env, s, name2, g, accountId, null);
  if (!trackId || !carId) return;
  const fam = await famId(env, g, carId);
  for (const b of bad) {
    await env.DB.prepare("DELETE FROM community_laps WHERE user_id=?1 AND car_id=?2 AND track_id=?3 AND game=?4 AND abs(time-?5)<0.0006").bind(accountId, fam, trackId, g, b.time).run();
    await forgetLap(env, g, trackId, carId, "acct:" + accountId, b.time);
  }
  await reshareSession(env, accountId, sid);
}
__name(unshareInvalid, "unshareInvalid");
async function reshareSession(env, accountId, sid) {
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE id=?1 AND uploader=?2").bind(sid, "acct:" + accountId).first();
  if (!s || isTestDrive(s.kind)) return;
  const g = s.game || "iracing", name2 = s.track + (s.track_config ? " \xB7 " + s.track_config : "");
  const { trackId, carId } = await comboIds(env, s, name2, g, accountId, null);
  if (!trackId || !carId) return;
  const acc = await env.DB.prepare("SELECT anon, name_kind FROM accounts WHERE id=?1").bind(accountId).first();
  if (!acc) return;
  const key2 = /* @__PURE__ */ __name((d) => String(d || "").trim().toLowerCase(), "key");
  const here = (await env.DB.prepare("SELECT time, COALESCE(drv,'') AS drv FROM laps WHERE session_id=?1 AND valid=1").bind(sid).all()).results || [];
  const all = (await env.DB.prepare(`SELECT l.time, l.sectors, l.trace, COALESCE(l.drv,'') AS drv FROM laps l JOIN sessions s ON s.id=l.session_id
    WHERE s.uploader=?1 AND lower(s.track)=lower(?2) AND lower(COALESCE(s.track_config,''))=lower(?3) AND lower(s.car)=lower(?4) AND COALESCE(s.game,'iracing')=?5
    AND l.valid=1 AND l.time>10 AND l.time<3600 AND lower(COALESCE(s.kind,'')) NOT LIKE '%test%'`).bind("acct:" + accountId, s.track, s.track_config || "", s.car, g).all()).results || [];
  const by = /* @__PURE__ */ new Map();
  for (const l of all) {
    const k = key2(l.drv);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(l);
  }
  const who2 = /* @__PURE__ */ __name(async (k, nm) => {
    if (!k) return { uid: accountId, anon: !!acc.anon, shown: acc.name_kind === "iracing" ? "iracing" : "nick" };
    const alias = cleanAlias(nm);
    if (!alias) return null;
    let row = await env.DB.prepare("SELECT id FROM community_users WHERE owner=?1 AND id LIKE 'guest-%' AND lower(alias)=lower(?2)").bind(accountId, alias).first();
    if (!row) {
      if (await nameTaken(env, alias, accountId)) return null;
      const gid = "guest-" + (await sha2562(accountId + ":" + alias.toLowerCase())).slice(0, 20);
      await env.DB.prepare("INSERT INTO community_users (id, token_hash, alias, created, owner) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET alias=excluded.alias, owner=excluded.owner").bind(gid, await sha2562("guest:" + gid + ":" + rid7()), alias, Date.now(), accountId).run();
      row = { id: gid };
    }
    const gl = await env.DB.prepare("SELECT l.account_id AS id, a.anon, a.name_kind FROM guest_links l JOIN accounts a ON a.id=l.account_id WHERE l.gid=?1").bind(row.id).first();
    if (gl) return { uid: gl.id, anon: !!gl.anon, shown: gl.name_kind === "iracing" ? "iracing" : "nick" };
    return { uid: row.id, anon: false, shown: "nick" };
  }, "who");
  const mine = (await env.DB.prepare("SELECT c.id, c.user_id, c.time, u.alias FROM community_laps c JOIN community_users u ON u.id=c.user_id WHERE c.car_id=?1 AND c.track_id=?2 AND (c.user_id=?3 OR (u.owner=?3 AND u.id LIKE 'guest-%'))").bind(await famId(env, g, carId), trackId, accountId).all()).results || [];
  for (const c of mine) {
    const k = c.user_id === accountId ? "" : key2(c.alias);
    if (here.some((l) => Math.abs(l.time - c.time) < 15e-4 && key2(l.drv) !== k)) await env.DB.prepare("DELETE FROM community_laps WHERE id=?1").bind(c.id).run();
  }
  for (const [k, laps] of by) {
    const w = await who2(k, laps[0].drv).catch(() => null);
    if (!w) continue;
    const best = laps.sort((a, b) => a.time - b.time || (b.trace ? 1 : 0) - (a.trace ? 1 : 0))[0];
    await keepBestLap(env, w.uid, { game: g, carId, trackId, car: s.car, track: name2, time: best.time, sectors: best.sectors, trace: best.trace, anon: w.anon, shown: w.shown, official: s.official, ai: s.ai === 1 });
  }
}
__name(reshareSession, "reshareSession");
async function rememberLic(env, uid, cat, lic) {
  const v = licOf(lic);
  if (!v || !CATS.includes(cat)) return;
  const row = await env.DB.prepare("SELECT lics FROM community_users WHERE id=?1").bind(uid).first();
  let cur = {};
  try {
    cur = JSON.parse(row && row.lics || "{}") || {};
  } catch (e) {
  }
  if (cur[cat] === v) return;
  cur[cat] = v;
  await env.DB.prepare("UPDATE community_users SET lics=?2 WHERE id=?1").bind(uid, JSON.stringify(cur)).run();
}
__name(rememberLic, "rememberLic");
async function minuteCache(env, k, fn) {
  const cache3 = env.LOCAL !== "1" && typeof caches !== "undefined" && caches.default ? caches.default : null;
  const key2 = new Request("https://db.cache/" + k);
  if (cache3) {
    const hit = await cache3.match(key2).catch(() => null);
    if (hit) {
      try {
        return await hit.json();
      } catch (e) {
      }
    }
  }
  const r4 = await fn();
  if (cache3) await cache3.put(key2, new Response(JSON.stringify({ results: r4.results || [] }), { headers: { "content-type": "application/json", "cache-control": "max-age=60" } })).catch(() => {
  });
  return r4;
}
__name(minuteCache, "minuteCache");
async function community(req, env, url, ctx) {
  if (env.COMMUNITY !== "1") return err7("the community is not enabled on this server", 404);
  const p = url.pathname.replace(/^\/community/, ""), m = req.method;
  if (m === "OPTIONS") return new Response(null, { headers: { ...JSONH8, "access-control-allow-methods": "GET,POST,DELETE", "access-control-max-age": "86400", "access-control-allow-headers": "authorization,content-type" } });
  {
    const la = await lmuApiRoutes(req, env, p, m, url);
    if (la) return la;
  }
  const body = m === "POST" ? await req.json().catch(() => ({})) : {};
  if (p === "/register" && m === "POST") {
    const id2 = rid7(), token = rid7() + rid7();
    await env.DB.prepare("INSERT INTO community_users (id, token_hash, alias, created) VALUES (?1,?2,?3,?4)").bind(id2, await sha2562(token), cleanAlias(body.alias), Date.now()).run();
    return json11({ id: id2, token });
  }
  {
    const pr = await proRoutes(req, env, p, m, body);
    if (pr) return pr;
  }
  const game = gameOf(url.searchParams.get("game") || body.game);
  {
    const ct = await coachTipRoutes(req, env, p, m, body, game);
    if (ct) return ct;
  }
  if (p.startsWith("/friends")) return friendRoutes(req, env, p, m, body, url, game, await sessionAccount(req, env).catch(() => null));
  if (p === "/combos" && m === "GET") {
    const r4 = await env.DB.prepare(
      "SELECT track_id AS trackId, MAX(track) AS track, car_id AS carId, MAX(car) AS car, COUNT(*) AS laps, MIN(time) AS best, MAX(cat) AS hint FROM community_laps WHERE game=?1 AND COALESCE(shown,'')<>'model' GROUP BY track_id, car_id ORDER BY laps DESC LIMIT 500"
    ).bind(game).all();
    const cm = game === "iracing" ? await catMap(env) : { tc: {}, c: {} };
    const fams = await famGroups(env, game);
    return json11({ combos: (r4.results || []).map(({ hint, ...x }) => ({ ...x, ...fams.has(x.carId) ? { ids: [...fams.get(x.carId)] } : {}, car: famName(game, x.carId, x.car), cat: game === "iracing" ? catOf(cm, x.trackId, x.carId, hint, x.track, x.car) : "sports_car" })) });
  }
  if (p === "/model" && m === "GET") {
    const t = +url.searchParams.get("trackId"), c = await famId(env, game, url.searchParams.get("carId"));
    if (!t || !c) return err7("trackId and carId", 400);
    const cq = url.searchParams.get("cmp"), tq = url.searchParams.get("temp");
    const md2 = forCompound(await getModel(env, game, t, c), cq != null && /^\d{1,2}$/.test(cq) ? +cq : null, tq != null && /^-?\d{1,2}(\.\d+)?$/.test(tq) ? +tq : null);
    const rivals = seesRivals(req, env, await me(req, env).catch(() => null));
    const fs = await env.DB.prepare(`SELECT l.time, ${shownName("l", "u", rivals)} AS alias FROM community_laps l JOIN community_users u ON u.id=l.user_id WHERE l.track_id=?1 AND l.car_id=?2 AND l.game=?3 AND COALESCE(l.shown,'')<>'model' ORDER BY l.time LIMIT 1`).bind(t, c, game).first();
    return json11({ ...md2, car: await getCarCard(env, game, c).catch(() => null), fastShared: fs || null });
  }
  if (p === "/car" && m === "GET") {
    const c = await famId(env, game, url.searchParams.get("carId"));
    if (!c) return err7("carId", 400);
    return json11(await getCarCard(env, game, c).catch(() => null) || {});
  }
  if (p === "/like" && m === "GET") {
    const t = +url.searchParams.get("trackId") || 0, c = await famId(env, game, url.searchParams.get("carId"));
    if (!c) return err7("carId", 400);
    const grp = await groupFor(env, game, t, c, String(url.searchParams.get("cat") || "").slice(0, 20)).catch(() => "");
    return json11({ ...await likeFor(env, game, t, c, grp), cat: grp });
  }
  if (p === "/records" && m === "GET") {
    const lim = Math.min(100, Math.max(1, +url.searchParams.get("limit") || 40));
    const who2 = await me(req, env).catch(() => null);
    const all = url.searchParams.get("game") === "all";
    const rv = seesRivals(req, env, who2), adm = !!who2 && isAdmin(env, who2.id);
    const r4 = await minuteCache(env, `records/${all ? "all" : game}/${lim}/${rv ? 1 : 0}${adm ? 1 : 0}`, () => env.DB.prepare(
      `WITH rk AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY game, track_id, car_id ORDER BY time) AS rk, COUNT(*) OVER (PARTITION BY game, track_id, car_id) AS n
         FROM community_laps WHERE ${all ? "game IN ('iracing','lmu')" : "game=?1"} AND COALESCE(shown,'')<>'model')
       SELECT l.id, l.user_id AS uid, l.game, l.track_id AS trackId, l.track, l.car_id AS carId, l.car, l.cat AS hint, l.time, l.created, l.n, l.wet,
         ${shownName("l", "u", rv)} AS alias,
         (${adm ? "ac.id IS NOT NULL OR " : ""}(l.anon=0 AND ac.id IS NOT NULL AND COALESCE(ac.anon,0)=0)) AS prof, (l.anon=0 AND COALESCE(ac.supporter,0)=1 AND COALESCE(ac.supporter_hidden,0)=0) AS sup,
         (l.trace IS NOT NULL OR ${ACCT_TRACE}) AS hasTrace,
         p.time AS prevTime, CASE WHEN p.id IS NULL THEN NULL ELSE ${shownName("p", "pu", rv)} END AS prevAlias
       FROM rk l JOIN community_users u ON u.id=l.user_id LEFT JOIN accounts ac ON ac.id=l.user_id
         LEFT JOIN rk p ON p.game=l.game AND p.track_id=l.track_id AND p.car_id=l.car_id AND p.rk=2 LEFT JOIN community_users pu ON pu.id=p.user_id
       WHERE l.rk=1 ORDER BY l.created DESC LIMIT ?2`
    ).bind(game, lim).all());
    const cm = all || game === "iracing" ? await catMap(env) : null;
    return json11({ records: (r4.results || []).map(({ uid, hint, prevTime, prevAlias, ...x }) => ({ ...x, game: gameOf(x.game), car: famName(gameOf(x.game), x.carId, x.car), cat: cm && gameOf(x.game) === "iracing" ? catOf(cm, x.trackId, x.carId, hint, x.track, x.car) : "sports_car", prof: !!x.prof, sup: !!x.sup, hasTrace: !!x.hasTrace, mine: !!who2 && uid === who2.id, field: String(uid).startsWith("o:"), prev: prevTime ? { time: prevTime, alias: prevAlias } : null })) });
  }
  if (p === "/track" && m === "GET") {
    const t = +url.searchParams.get("trackId");
    if (!t) return err7("trackId", 400);
    const who2 = await me(req, env).catch(() => null);
    const [lay, tu, r4, tot] = await Promise.all([
      env.DB.prepare("SELECT track, n, len, pts FROM track_maps WHERE game=?1 AND track_id=?2").bind(game, t).first(),
      env.DB.prepare("SELECT turns FROM track_turns WHERE game=?1 AND track_id=?2").bind(game, t).first(),
      env.DB.prepare(
        `WITH rk AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY car_id ORDER BY time) AS rk, COUNT(*) OVER (PARTITION BY car_id) AS n
           FROM community_laps WHERE game=?1 AND track_id=?2 AND COALESCE(shown,'')<>'model')
         SELECT l.id, l.user_id AS uid, l.car_id AS carId, l.car, l.track, l.cat AS hint, l.time, l.created, l.n, l.wet, l.cls,
           ${shownName("l", "u", seesRivals(req, env, who2))} AS alias,
           (${who2 && isAdmin(env, who2.id) ? "ac.id IS NOT NULL OR " : ""}(l.anon=0 AND ac.id IS NOT NULL AND COALESCE(ac.anon,0)=0)) AS prof, (l.anon=0 AND COALESCE(ac.supporter,0)=1 AND COALESCE(ac.supporter_hidden,0)=0) AS sup,
           (l.trace IS NOT NULL OR ${ACCT_TRACE}) AS hasTrace
         FROM rk l JOIN community_users u ON u.id=l.user_id LEFT JOIN accounts ac ON ac.id=l.user_id
         WHERE l.rk=1 ORDER BY l.n DESC, l.time`
      ).bind(game, t).all(),
      env.DB.prepare("SELECT COUNT(*) AS laps, COUNT(DISTINCT user_id) AS drivers, MAX(track) AS track FROM community_laps WHERE game=?1 AND track_id=?2 AND COALESCE(shown,'')<>'model'").bind(game, t).first()
    ]);
    const cm = game === "iracing" ? await catMap(env) : null;
    const pts = lay && lay.pts ? JSON.parse(lay.pts) : null;
    const name2 = tot && tot.track || lay && lay.track || "";
    return json11({
      trackId: t,
      game,
      track: name2,
      drivers: tot && tot.drivers || 0,
      laps: tot && tot.laps || 0,
      layout: pts && pts.x && pts.x.length > 10 ? { n: lay.n, len: lay.len, x: pts.x, y: pts.y } : null,
      turns: tu && tu.turns ? JSON.parse(tu.turns) : [],
      cars: (r4.results || []).map(({ uid, hint, ...x }) => ({ ...x, car: famName(game, x.carId, x.car), track: x.track || name2, trackId: t, cat: cm ? catOf(cm, t, x.carId, hint, x.track || name2, x.car) : "sports_car", prof: !!x.prof, sup: !!x.sup, hasTrace: !!x.hasTrace, mine: !!who2 && uid === who2.id, field: String(uid).startsWith("o:") }))
    });
  }
  if (p === "/laps" && m === "GET") {
    const cq = game === "lmu" ? clsParam(url.searchParams.get("cls")) : null;
    if (cq && +url.searchParams.get("trackId")) {
      const who3 = await me(req, env).catch(() => null);
      const rows = await classLaps(env, +url.searchParams.get("trackId"), cq, { admin: !!who3 && isAdmin(env, who3.id), rivals: seesRivals(req, env, who3), acctTrace: ACCT_TRACE });
      return json11({ cat: "sports_car", cls: cq, laps: rows.map(({ uid, ...x }) => ({ ...x, car: famName(game, x.carId, x.car), lic: licOf(x.lic), prof: !!x.prof, sup: !!x.sup, mine: !!who3 && uid === who3.id, field: String(uid).startsWith("o:"), hasTrace: !!x.hasTrace, sectors: x.sectors ? JSON.parse(x.sectors) : null })) });
    }
    const t = +url.searchParams.get("trackId"), c = await famId(env, game, url.searchParams.get("carId"));
    if (!t || !c) return err7("trackId and carId", 400);
    const who2 = await me(req, env).catch(() => null);
    const h = await env.DB.prepare("SELECT MAX(cat) AS hint, MAX(track) AS track, MAX(car) AS car, MAX(cls) AS cls FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3").bind(t, c, game).first().catch(() => null);
    const cat = game === "iracing" ? catOf(await catMap(env), t, c, h && h.hint, h && h.track, h && h.car) : "sports_car";
    const r4 = await env.DB.prepare(
      `SELECT l.id, l.user_id AS uid, ${shownName("l", "u", seesRivals(req, env, who2))} AS alias, l.time, l.sectors, l.created, (l.trace IS NOT NULL OR ${ACCT_TRACE}) AS hasTrace, l.car, l.track, l.wet,
         COALESCE(json_extract(u.lics, '$.' || ?4), l.lic) AS lic,
         (${who2 && isAdmin(env, who2.id) ? "ac.id IS NOT NULL OR " : ""}(l.anon=0 AND ac.id IS NOT NULL AND COALESCE(ac.anon,0)=0)) AS prof, (l.anon=0 AND COALESCE(ac.supporter,0)=1 AND COALESCE(ac.supporter_hidden,0)=0) AS sup
       FROM community_laps l JOIN community_users u ON u.id=l.user_id LEFT JOIN accounts ac ON ac.id=l.user_id
       WHERE l.track_id=?1 AND l.car_id=?2 AND l.game=?3 AND COALESCE(l.shown,'')<>'model' ORDER BY l.time LIMIT 200`
    ).bind(t, c, game, cat).all();
    return json11({ cat, cls: game === "lmu" ? h && h.cls || lmuClass(null, h && h.car) : null, laps: (r4.results || []).map(({ uid, ...x }) => ({ ...x, lic: licOf(x.lic), prof: !!x.prof, sup: !!x.sup, mine: !!who2 && uid === who2.id, field: String(uid).startsWith("o:"), hasTrace: !!x.hasTrace, sectors: x.sectors ? JSON.parse(x.sectors) : null })) });
  }
  if (p.startsWith("/laps/") && m === "GET") {
    const rivals = seesRivals(req, env, await me(req, env).catch(() => null));
    const l = await env.DB.prepare(`SELECT l.*, ${shownName("l", "u", rivals)} AS alias FROM community_laps l JOIN community_users u ON u.id=l.user_id WHERE l.id=?1`).bind(p.slice(6)).first();
    if (!l) return err7("not found", 404);
    let trace = l.trace;
    if (!trace) {
      const a = await env.DB.prepare(`SELECT a.trace FROM laps a JOIN sessions s ON s.id=a.session_id WHERE ${ACCT_TRACE_WHERE} LIMIT 1`).bind(l.user_id, l.time, l.game).first();
      if (a) trace = a.trace;
    }
    let tr2 = trace ? JSON.parse(await openData(env, trace)) : null;
    if (tr2 && tr2.src === "field") {
      const card = await getCarCard(env, l.game, l.car_id).catch(() => null);
      tr2 = estimateTrace(tr2, card && card.pedals, card && card.shifts);
    }
    return json11({ id: l.id, alias: l.alias, game: l.game, time: l.time, car: famName(l.game, l.car_id, l.car), track: l.track, carId: l.car_id, trackId: l.track_id, sectors: l.sectors ? JSON.parse(l.sectors) : null, trace: tr2 });
  }
  if (p === "/reports" && m === "GET") {
    const t = +url.searchParams.get("trackId"), c = +url.searchParams.get("carId");
    const fam = c ? await famIds(env, game, c) : [0];
    const r4 = await env.DB.prepare(
      `SELECT r.id, r.user_id AS uid, CASE WHEN r.anon=1 THEN 'Anonymous' WHEN r.shown='iracing' AND COALESCE(u.iracing,'')<>'' THEN u.iracing ELSE u.alias END AS alias, r.car, r.track, r.created, COALESCE(r.finish, CASE WHEN substr(r.data,1,4)='enc:' THEN NULL ELSE json_extract(r.data,'$.finish') END) AS finish,
       COALESCE(r.field, CASE WHEN substr(r.data,1,4)='enc:' THEN NULL ELSE json_extract(r.data,'$.field') END) AS field,
       COALESCE(r.best, CASE WHEN substr(r.data,1,4)='enc:' THEN NULL ELSE json_extract(r.data,'$.best') END) AS best
       FROM community_reports r JOIN community_users u ON u.id=r.user_id WHERE (?1=0 OR r.track_id=?1) AND (?2=0 OR r.car_id IN (${fam.map((n) => +n || 0).join(",")})) AND r.game=?3 ORDER BY r.created DESC LIMIT 100`
    ).bind(t || 0, c || 0, game).all();
    const who2 = await me(req, env).catch(() => null);
    return json11({ reports: (r4.results || []).map(({ uid, ...x }) => ({ ...x, car: famName(game, c, x.car), mine: !!who2 && uid === who2.id })) });
  }
  if (p === "/trackmaps" && m === "GET") {
    const t = +url.searchParams.get("trackId");
    if (!t) return err7("trackId", 400);
    const [r4, ed] = await Promise.all([
      env.DB.prepare("SELECT track, n, len, pts, time, created, geo FROM track_maps WHERE game=?1 AND track_id=?2").bind(game, t).first(),
      env.DB.prepare("SELECT n, laps, data FROM track_edges WHERE game=?1 AND track_id=?2").bind(game, t).first().catch(() => null)
    ]);
    if (!r4) return err7("no layout for this track yet", 404);
    let edges = null;
    try {
      const e = ed && ed.n === r4.n ? JSON.parse(ed.data) : null;
      if (e && Array.isArray(e.l) && e.l.length === r4.n) edges = { l: e.l, r: e.r, laps: ed.laps };
    } catch (e) {
      edges = null;
    }
    const pts = JSON.parse(r4.pts);
    let g = null;
    try {
      g = r4.geo ? JSON.parse(r4.geo) : null;
    } catch (e) {
      g = null;
    }
    return new Response(JSON.stringify({ trackId: t, game, track: r4.track, n: r4.n, len: r4.len, x: pts.x, y: pts.y, g, time: r4.time, updated: r4.created, ...edges ? { edges } : {} }), { headers: { ...JSONH8, "cache-control": "public, max-age=3600" } });
  }
  if (p === "/turns" && m === "GET") {
    const t = +url.searchParams.get("trackId");
    if (!t) return err7("trackId", 400);
    const r4 = await env.DB.prepare("SELECT turns, updated FROM track_turns WHERE game=?1 AND track_id=?2").bind(game, t).first();
    let turns = [], auto = false, count = 0;
    try {
      turns = r4 ? JSON.parse(r4.turns) : [];
    } catch (e) {
      turns = [];
    }
    if (!turns.length) {
      const [lay, want, slows] = await Promise.all([env.DB.prepare("SELECT pts FROM track_maps WHERE game=?1 AND track_id=?2").bind(game, t).first(), turnCount(env, game, t), slowsOf(env, game, t)]);
      if (lay) {
        try {
          const p2 = JSON.parse(lay.pts);
          turns = turnsFromPath(p2.x, p2.y, want, slows);
          auto = true;
        } catch (e) {
          turns = [];
        }
      }
      if (want) count = want;
    }
    return new Response(JSON.stringify({ trackId: t, game, turns, auto, ...count ? { count } : {}, updated: r4 ? r4.updated : 0 }), { headers: { ...JSONH8, "cache-control": "public, max-age=300" } });
  }
  if (p === "/pitlane" && m === "GET") {
    const t = +url.searchParams.get("trackId");
    if (!t) return err7("trackId", 400);
    const r4 = await env.DB.prepare("SELECT n, pts, updated FROM track_pits WHERE game=?1 AND track_id=?2").bind(game, t).first();
    const pts = r4 ? Object.entries(JSON.parse(r4.pts)).map(([i, v]) => [+i, v]).sort((a, b) => a[0] - b[0]) : [];
    return new Response(JSON.stringify({ trackId: t, game, n: r4 ? r4.n : 0, pts, updated: r4 ? r4.updated : 0 }), { headers: { ...JSONH8, "cache-control": "public, max-age=600" } });
  }
  if (p === "/turns" && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const b = body;
    const t = +b.trackId, g = String(b.game || "iracing").slice(0, 20);
    const turns = Array.isArray(b.turns) ? b.turns.map(Number).filter((x) => isFinite(x) && x >= 0 && x < 1).slice(0, 60) : null;
    if (!t || !turns) return err7("trackId and turns", 400);
    if (!turns.length) await env.DB.prepare("DELETE FROM track_turns WHERE game=?1 AND track_id=?2").bind(g, t).run();
    else await env.DB.prepare("INSERT INTO track_turns (game, track_id, turns, updated) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(game, track_id) DO UPDATE SET turns=excluded.turns, updated=excluded.updated").bind(g, t, JSON.stringify(turns.map((x) => Math.round(x * 1e5) / 1e5)), Date.now()).run();
    return json11({ ok: true, trackId: t, game: g, turns });
  }
  const um = p.match(/^\/admin\/reports\/([A-Za-z0-9_.:-]{1,64})\/uncut$/);
  if (um && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const r4 = await env.DB.prepare("SELECT data FROM community_reports WHERE id=?1").bind(um[1]).first();
    if (!r4) return err7("not found", 404);
    const d = JSON.parse(await openData(env, r4.data));
    if (Array.isArray(d.laps)) d.laps = d.laps.map((l) => l.i ? l : { ...l, cut: false });
    await env.DB.prepare("UPDATE community_reports SET data=?2 WHERE id=?1").bind(um[1], await sealData(env, JSON.stringify(d))).run();
    return json11({ ok: true });
  }
  const du = p.match(/^\/admin\/users\/([A-Za-z0-9]{8,40})$/);
  if (du && m === "DELETE") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const id2 = du[1];
    if (id2 === acc.id || isAdmin(env, id2)) return err7("an admin account cannot be deleted from here", 400);
    await purgeAccount(env, id2);
    return json11({ deleted: true });
  }
  if (m === "GET" && p === "/admin/status") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const st = await env.DB.prepare("SELECT k, v, at FROM app_state WHERE k IN ('mail_error','mail_ok')").all().catch(() => ({ results: [] }));
    const get = /* @__PURE__ */ __name((k) => (st.results || []).find((x) => x.k === k), "get");
    const e = get("mail_error"), ok = get("mail_ok");
    const now = Date.now(), d1 = now - 864e5, d7 = now - 7 * 864e5, d30 = now - 30 * 864e5;
    const counts = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM accounts) AS accounts, (SELECT COUNT(*) FROM accounts WHERE verified=1) AS verified,
      (SELECT COUNT(*) FROM accounts WHERE created>?1) AS new7, (SELECT COUNT(*) FROM accounts WHERE created>?2) AS new30, (SELECT COUNT(*) FROM accounts WHERE totp_on=1) AS twoFactor,
      (SELECT COUNT(*) FROM sessions) AS sessions, (SELECT COUNT(*) FROM sessions WHERE started>?3) AS sessions1, (SELECT COUNT(*) FROM sessions WHERE started>?1) AS sessions7,
      (SELECT COUNT(DISTINCT uploader) FROM sessions WHERE started>?1) AS drivers7,
      (SELECT COUNT(*) FROM community_laps) AS shared, (SELECT COUNT(*) FROM (SELECT 1 FROM community_laps WHERE COALESCE(shown,'')<>'model' GROUP BY game, track_id, car_id)) AS boards,
      (SELECT COUNT(*) FROM model_laps) AS learnt, (SELECT COUNT(*) FROM model_cache) AS models, (SELECT COUNT(*) FROM model_cache WHERE dirty=1) AS modelsDirty, (SELECT COUNT(*) FROM car_cards) AS cars,
      (SELECT COUNT(*) FROM leagues) AS leagues, (SELECT COUNT(*) FROM accounts WHERE supporter=1) AS supporters, (SELECT COUNT(*) FROM accounts WHERE supporter=1 AND supporter_src='patreon') AS supportersPatreon,
      (SELECT COUNT(*) FROM patreon_patrons WHERE active=1) AS patrons, (SELECT MAX(updated) FROM patreon_patrons) AS patreonLast,
      (SELECT COUNT(*) FROM auth_fails) AS authFails`).bind(d7, d30, d1).first().catch((x) => ({ error: String(x && x.message || x) }));
    return json11({
      mail: { ready: mailReady(env), via: env.RESEND_API_KEY ? "resend" : "", from: env.EMAIL_FROM || "", lastOk: ok ? ok.at : 0, lastError: e && (!ok || e.at > ok.at) ? { at: e.at, ...JSON.parse(e.v || "{}") } : null },
      counts,
      config: { patreon: !!env.PATREON_WEBHOOK_SECRET, leaguesOpen: env.LEAGUES_OPEN === "1", community: env.COMMUNITY !== "0", dataKey: !!env.DATA_KEY, pepper: !!env.EMAIL_PEPPER, admins: String(env.ADMINS || env.SEASON_UPLOADERS || "").split(",").filter(Boolean).length }
    });
  }
  if (m === "GET" && p === "/admin/mail") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const [items, domain] = await Promise.all([mailLog(env), mailDomain(env).catch(() => null)]);
    return json11({ items, domain });
  }
  if (m === "GET" && p === "/admin/guests") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const r4 = await env.DB.prepare(`SELECT g.id, g.alias, g.created, g.owner, o.display AS ownerName, (SELECT COUNT(*) FROM community_laps l WHERE l.user_id=g.id) AS laps, gl.account_id AS linked, la.display AS linkedName
      FROM community_users g LEFT JOIN accounts o ON o.id=g.owner LEFT JOIN guest_links gl ON gl.gid=g.id LEFT JOIN accounts la ON la.id=gl.account_id WHERE g.id LIKE 'guest-%' ORDER BY g.created DESC LIMIT 300`).all();
    return json11({ guests: (r4.results || []).map((x) => ({ id: x.id, name: x.alias, created: x.created, owner: x.owner, ownerName: x.ownerName || "", laps: x.laps || 0, linked: x.linked || null, linkedName: x.linkedName || null })) });
  }
  if (m === "GET" && (p === "/admin/uploads" || p === "/admin/users")) {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    if (p === "/admin/users") {
      const q3 = String(url.searchParams.get("q") || "").trim().slice(0, 60);
      const r5 = await env.DB.prepare(`SELECT a.id, a.display, a.name_kind AS nameKind, a.anon, a.verified, a.created, a.member_since AS memberSince, a.totp_on AS twoFactor, a.supporter, a.supporter_src AS supporterSrc, a.supporter_hidden AS supporterHidden, a.tester,
        (SELECT COUNT(*) FROM sessions s WHERE s.uploader='acct:'||a.id) AS sessions,
        (SELECT MAX(started) FROM sessions s WHERE s.uploader='acct:'||a.id) AS lastSession,
        (SELECT COUNT(*) FROM community_laps l WHERE l.user_id=a.id) AS laps,
        (SELECT COUNT(*) FROM community_users g WHERE g.owner=a.id AND g.id LIKE 'guest-%') AS guests,
        (SELECT group_concat(gl.gid || '|' || g.alias, ',') FROM guest_links gl JOIN community_users g ON g.id=gl.gid WHERE gl.account_id=a.id) AS guestLinked,
        (SELECT COUNT(*) FROM leagues g WHERE g.owner=a.id) AS leagues,
        EXISTS (SELECT 1 FROM driver_links d WHERE d.account_id=a.id) AS driverLinked,
        (SELECT group_concat(d.game, ',') FROM driver_links d WHERE d.account_id=a.id) AS driverGames
        FROM accounts a ${q3 ? "WHERE a.display LIKE ?1 OR a.id LIKE ?1" : ""} ORDER BY a.created DESC LIMIT 500`).bind(...q3 ? ["%" + q3.replace(/[%_]/g, "") + "%"] : []).all();
      return json11({ users: (r5.results || []).map((x) => ({ ...x, admin: isAdmin(env, x.id), tester: isTester(env, x.id, x), testerSet: testersSet(env, x.id) })) });
    }
    const q2 = /* @__PURE__ */ __name((t, extra) => env.DB.prepare(`SELECT x.id, '${t}' AS kind, x.car, x.track, x.created, x.anon, COALESCE(x.shown,'nick') AS shown, ${extra}
      u.id AS userId, u.alias, u.iracing, u.owner, o.display AS ownerName, ac.display AS account
      FROM community_${t} x JOIN community_users u ON u.id=x.user_id LEFT JOIN accounts o ON o.id=u.owner LEFT JOIN accounts ac ON ac.id=u.id
      ORDER BY x.created DESC LIMIT 300`).all(), "q");
    const [l, r4] = await Promise.all([q2("laps", "x.time,"), q2("reports", "x.best AS time,")]);
    const items = [...l.results || [], ...r4.results || []].sort((a, b) => b.created - a.created).map((x) => ({
      ...x,
      shownAs: x.anon ? "Anonymous" : x.shown === "iracing" && x.iracing ? x.iracing : x.alias,
      // a rival of a race ("o:…", shared by the PC that raced them) is not a Drinks driver ("guest-…", who drove that PC)
      via: !x.owner ? "account" : String(x.userId).startsWith("o:") ? "rival" : "drinks",
      realUploader: !x.owner ? x.account || x.alias : String(x.userId).startsWith("o:") ? `${x.alias} (race rival \xB7 shared by ${x.ownerName || x.owner})` : `${x.alias} (Drinks \xB7 ${x.ownerName || x.owner})`
    }));
    return json11({ items });
  }
  if (p === "/admin/supporter" && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const id2 = String(body.id || "");
    const r4 = await env.DB.prepare("UPDATE accounts SET supporter=?2, supporter_src=?3 WHERE id=?1").bind(id2, body.on ? 1 : 0, body.on ? "manual" : null).run();
    return r4.meta && r4.meta.changes ? json11({ ok: true, supporter: !!body.on }) : err7("account not found", 404);
  }
  if (p === "/admin/tester" && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const id2 = String(body.id || "");
    const was = await env.DB.prepare("SELECT tester FROM accounts WHERE id=?1").bind(id2).first();
    if (!was) return err7("account not found", 404);
    if (!body.on && testersSet(env, id2)) return err7("this driver is a tester in the server's settings (TESTERS)", 409);
    await env.DB.prepare("UPDATE accounts SET tester=?2 WHERE id=?1").bind(id2, body.on ? 1 : null).run();
    if (body.on && !was.tester && !testersSet(env, id2)) await testerAlert(env, id2);
    return json11({ ok: true, tester: !!body.on });
  }
  if (p === "/admin/since" && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const since = body.since == null || body.since === "" ? null : Number(body.since);
    if (since !== null && !(isFinite(since) && since > 9466848e5 && since < Date.now() + 864e5)) return err7("that date is not valid", 400);
    const r4 = await env.DB.prepare("UPDATE accounts SET member_since=?2 WHERE id=?1").bind(String(body.id || ""), since === null ? null : Math.round(since)).run();
    return r4.meta && r4.meta.changes ? json11({ ok: true, since }) : err7("account not found", 404);
  }
  if (p === "/admin/turns-check" && m === "GET") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const rows = (await env.DB.prepare(
      `SELECT m.game, m.track_id, m.track, m.n, m.pts, i.nturns, t.turns FROM track_maps m
       LEFT JOIN track_info i ON i.game=m.game AND i.track_id=m.track_id LEFT JOIN track_turns t ON t.game=m.game AND t.track_id=m.track_id
       ORDER BY m.track LIMIT 400`
    ).all().catch(() => ({ results: [] }))).results || [];
    const out = [];
    for (const r4 of rows) {
      let placed = 0;
      try {
        placed = r4.turns ? JSON.parse(r4.turns).length : 0;
      } catch (e) {
        placed = 0;
      }
      let found = 0, fitted = 0;
      try {
        const q2 = JSON.parse(r4.pts), slows = await slowsOf(env, r4.game, r4.track_id);
        found = turnsFromPath(q2.x, q2.y, 0, slows).length;
        fitted = r4.nturns ? turnsFromPath(q2.x, q2.y, r4.nturns, slows).length : found;
      } catch (e) {
      }
      out.push({ game: r4.game, trackId: r4.track_id, track: r4.track || "", len: (r4.n || 0) * 5, official: r4.nturns || 0, placed, found, fitted });
    }
    const bad = /* @__PURE__ */ __name((x) => (x.placed ? 0 : 2) + (x.official && x.fitted !== x.official ? 1 : 0), "bad");
    out.sort((a, b) => bad(b) - bad(a) || a.track.localeCompare(b.track));
    return json11({ tracks: out });
  }
  if (p === "/admin/trackmaps-rebuild" && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    return json11({ ok: true, ...await rebuildTrackMaps(env, { all: true }) });
  }
  if (p === "/admin/models" && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const r4 = await env.DB.prepare("UPDATE model_cache SET dirty=1").run();
    await env.DB.prepare("UPDATE car_cards SET dirty=1").run().catch(() => {
    });
    return json11({ ok: true, models: r4.meta && r4.meta.changes || 0 });
  }
  if (p === "/admin/blocked" && m === "GET") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const since = Date.now() - 15 * 6e4;
    const rows = (await env.DB.prepare("SELECT k, COUNT(*) AS n, MAX(t) AS last FROM auth_fails WHERE t>=?1 GROUP BY k ORDER BY last DESC LIMIT 200").bind(since).all()).results || [];
    const hashes = rows.map((x) => /^(login|mail):([0-9a-f]{64})$/.exec(x.k)).filter(Boolean).map((x) => x[2]), ids = rows.map((x) => /^2fa:(.+)$/.exec(x.k)).filter(Boolean).map((x) => x[1]);
    const who2 = {};
    for (const h of hashes) {
      const a = await env.DB.prepare("SELECT id, display FROM accounts WHERE email_hash=?1").bind(h).first();
      if (a) who2[h] = a;
    }
    for (const id2 of ids) {
      const a = await env.DB.prepare("SELECT id, display FROM accounts WHERE id=?1").bind(id2).first();
      if (a) who2[id2] = a;
    }
    const mask2 = /* @__PURE__ */ __name((v) => /^ip:[0-9a-f]{6}/.test(v) ? "#" + v.slice(3, 9) : "#" + String(v).slice(0, 6), "mask");
    const limit = { login: 5, "2fa": 5, mail: 3, reset: 10, reg: 5, ip: 30 };
    return json11({ blocked: rows.map((x) => {
      const m2 = /^(login|mail|2fa|reset|reg):(.+)$/.exec(x.k), kind = m2 ? m2[1] : "ip", v = m2 ? m2[2] : x.k, a = who2[v];
      const net = kind === "ip" || (kind === "mail" || kind === "reset" || kind === "reg") && !/^[0-9a-f]{64}$/.test(v);
      return { k: x.k, kind, n: x.n, last: x.last, account: a ? { id: a.id, display: a.display } : null, net: net ? mask2(v) : null, blocked: x.n >= (net && kind === "mail" ? 10 : limit[kind] || 5) };
    }) });
  }
  if (p === "/admin/unlock" && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    let r4;
    if (typeof body.k === "string" && body.k) r4 = await env.DB.prepare("DELETE FROM auth_fails WHERE k=?1").bind(body.k.slice(0, 200)).run();
    else if (typeof body.account === "string" && /^[A-Za-z0-9]{8,40}$/.test(body.account)) {
      const a = await env.DB.prepare("SELECT id, email_hash FROM accounts WHERE id=?1").bind(body.account).first();
      if (!a) return err7("account not found", 404);
      r4 = await env.DB.prepare("DELETE FROM auth_fails WHERE k IN (?1, ?2, ?3)").bind("login:" + a.email_hash, "mail:" + a.email_hash, "2fa:" + a.id).run();
    } else if (typeof body.email === "string" && body.email.includes("@")) {
      const eh = await emailHash(env, body.email), a = await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first();
      r4 = await env.DB.prepare("DELETE FROM auth_fails WHERE k IN (?1, ?2, ?3)").bind("login:" + eh, "mail:" + eh, "2fa:" + (a ? a.id : "-")).run();
    } else if (body.all === true) r4 = await env.DB.prepare("DELETE FROM auth_fails").run();
    else return err7("say what to unblock", 400);
    return json11({ ok: true, cleared: r4.meta && r4.meta.changes || 0 });
  }
  const ua = p.match(/^\/admin\/users\/([A-Za-z0-9]{8,40})\/(verify|2fa-off|signout|rename|unlink-driver|link-guest|unlink-guest)$/);
  if (ua && m === "POST") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const id2 = ua[1], a = await env.DB.prepare("SELECT id FROM accounts WHERE id=?1").bind(id2).first();
    if (!a) return err7("account not found", 404);
    if (ua[2] === "verify") await env.DB.prepare("UPDATE accounts SET verified=1 WHERE id=?1").bind(id2).run();
    if (ua[2] === "2fa-off") await env.DB.batch([env.DB.prepare("UPDATE accounts SET totp=NULL, totp_on=0, totp_pending=NULL WHERE id=?1").bind(id2), env.DB.prepare("DELETE FROM recovery_codes WHERE account_id=?1").bind(id2)]);
    if (ua[2] === "signout") await env.DB.prepare("DELETE FROM account_sessions WHERE account_id=?1").bind(id2).run();
    if (ua[2] === "unlink-driver") {
      const g = String(body.game || body.name || "");
      await unlinkDriver(env, id2, g ? gameOf(g) : null);
    }
    if (ua[2] === "link-guest" || ua[2] === "unlink-guest") {
      const want = String(body.guest || body.name || "").trim();
      if (!want) return err7("which DRINKS driver?", 400);
      const g = want.startsWith("guest-") ? await env.DB.prepare("SELECT id, alias FROM community_users WHERE id=?1 AND id LIKE 'guest-%'").bind(want).first() : await env.DB.prepare("SELECT id, alias FROM community_users WHERE id LIKE 'guest-%' AND lower(alias)=lower(?1) ORDER BY (owner=?2) DESC LIMIT 1").bind(cleanAlias(want), acc.id).first();
      if (!g) return err7("DRINKS driver not found", 404);
      if (ua[2] === "unlink-guest") {
        await env.DB.prepare("DELETE FROM guest_links WHERE gid=?1 AND account_id=?2").bind(g.id, id2).run();
        return json11({ ok: true, name: g.alias });
      }
      const had = await env.DB.prepare("SELECT account_id FROM guest_links WHERE gid=?1").bind(g.id).first();
      if (had && had.account_id !== id2) return err7("this DRINKS driver is already joined to another account", 409);
      const target2 = await env.DB.prepare("SELECT anon, name_kind FROM accounts WHERE id=?1").bind(id2).first();
      const shown = target2 && target2.name_kind === "iracing" ? "iracing" : "nick";
      const laps = (await env.DB.prepare("SELECT id, car_id, track_id, time, game, trace IS NOT NULL AS traced FROM community_laps WHERE user_id=?1").bind(g.id).all()).results || [];
      const q2 = [], combos2 = /* @__PURE__ */ new Set();
      for (const l of laps) {
        const mine = await env.DB.prepare("SELECT id, time, trace IS NOT NULL AS traced FROM community_laps WHERE user_id=?1 AND car_id=?2 AND track_id=?3").bind(id2, l.car_id, l.track_id).first();
        combos2.add(l.game + "|" + l.track_id + "|" + l.car_id);
        const take = env.DB.prepare("UPDATE community_laps SET user_id=?2, anon=?3, shown=?4 WHERE id=?1").bind(l.id, id2, target2 && target2.anon ? 1 : 0, shown);
        if (!mine) {
          q2.push(take);
          continue;
        }
        const better = mine.time > l.time || !mine.traced && !!l.traced;
        if (better) q2.push(env.DB.prepare("DELETE FROM community_laps WHERE id=?1").bind(mine.id), take);
        else q2.push(env.DB.prepare("DELETE FROM community_laps WHERE id=?1").bind(l.id));
      }
      q2.push(env.DB.prepare("UPDATE community_reports SET user_id=?2 WHERE user_id=?1").bind(g.id, id2));
      if (!had) q2.push(env.DB.prepare("INSERT INTO guest_links (gid, account_id, created) VALUES (?1,?2,?3)").bind(g.id, id2, Date.now()));
      await env.DB.batch(q2);
      await moveDriver(env, "acct:" + g.id, "acct:" + id2).catch(() => {
      });
      for (const c of combos2) {
        const [gm, t, cId] = c.split("|");
        await markModel(env, gm, +t, +cId).catch(() => {
        });
      }
      return json11({ ok: true, name: g.alias, moved: laps.length });
    }
    if (ua[2] === "rename") {
      const display = cleanName(body.name);
      if (!display) return err7("choose a public name", 400);
      if (await nameTaken(env, display, id2)) return err7("this nickname is already taken", 409);
      await env.DB.batch([env.DB.prepare("UPDATE accounts SET display=?2, name_kind='nick' WHERE id=?1").bind(id2, display), env.DB.prepare("UPDATE community_users SET alias=?2 WHERE id=?1").bind(id2, display)]);
    }
    return json11({ ok: true });
  }
  if (p === "/admin/sessions" && m === "GET") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const r4 = await env.DB.prepare(`SELECT s.id, s.started, s.track, s.track_config AS trackConfig, s.car, s.kind, s.laps, s.game, s.official, s.cat, a.display AS who, a.id AS accountId
      FROM sessions s LEFT JOIN accounts a ON 'acct:'||a.id=s.uploader ORDER BY s.started DESC LIMIT 100`).all();
    return json11({ sessions: r4.results || [] });
  }
  if (p === "/profile/badge" && m === "POST") {
    const who2 = await sessionAccount(req, env);
    if (!who2) return err7("sign in with your Pitlane HQ account", 401);
    await env.DB.prepare("UPDATE accounts SET supporter_hidden=?2 WHERE id=?1").bind(who2.id, body.hidden ? 1 : 0).run();
    return json11({ ok: true, hidden: !!body.hidden });
  }
  if (p === "/profile/races" && m === "POST") {
    const who2 = await sessionAccount(req, env);
    if (!who2) return err7("sign in with your Pitlane HQ account", 401);
    const n = /* @__PURE__ */ __name((v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi ? v : null, "n");
    const list = (Array.isArray(body.races) ? body.races : []).slice(0, 30).map((x) => x && typeof x.id === "string" && /^[A-Za-z0-9_.:-]{1,80}$/.test(x.id) && n(x.when, 1e12, 1e13) ? {
      id: x.id,
      when: Math.round(x.when),
      game: gameOf(x.game),
      track: str3(x.track),
      car: str3(x.car),
      cat: CATS.includes(x.cat) ? x.cat : null,
      lic: licOf(x.lic),
      official: x.official === true,
      start: n(x.start, 0, 200),
      finish: n(x.finish, 0, 200),
      field: n(x.field, 0, 200),
      inc: n(x.inc, 0, 999),
      best: n(x.best, 0, 3600),
      laps: n(x.laps, 0, 9999),
      ir: n(x.ir, 0, 2e4),
      irChange: n(x.irChange, -2e3, 2e3),
      sof: n(x.sof, 0, 2e4),
      dnf: x.dnf === true
    } : null).filter(Boolean);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM profile_races WHERE account_id=?1").bind(who2.id),
      ...list.map((x) => env.DB.prepare("INSERT INTO profile_races (account_id, id, at, data) VALUES (?1,?2,?3,?4) ON CONFLICT DO NOTHING").bind(who2.id, x.id, x.when, JSON.stringify(x)))
    ]);
    return json11({ ok: true, races: list.length });
  }
  if (p === "/leagues" || p.startsWith("/leagues/")) {
    const who2 = await sessionAccount(req, env).catch(() => null), admin = !!who2 && isAdmin(env, who2.id);
    const parts = p.slice(9).split("/").filter(Boolean), lid = parts[0] || "", sub = parts[1] || "";
    const lgGame = leagueGame(url.searchParams.get("game") || m === "POST" && body && body.game);
    if (lid === "found" && !sub && m === "GET") return json11(await foundLeagues(env, admin, lgGame));
    if (env.LEAGUES_OPEN !== "1" && !admin && !(who2 && isTester(env, who2.id, who2))) return err7("leagues are in development", 403);
    if (lid === "found") {
      if (m === "GET") return json11(await foundLeagues(env, admin, lgGame));
      if (m !== "POST" || !admin) return err7("only the admins can do this", 403);
      if (sub && "edit" in body) return await editFound(env, sub, body.edit) ? json11(await foundLeagues(env, admin, lgGame)) : err7("league not found", 404);
      if (sub) {
        await env.DB.prepare("UPDATE league_found SET hidden=?2 WHERE guild=?1").bind(sub, body.hidden ? 1 : 0).run();
        return json11({ ok: true });
      }
      if (body.invite) {
        const r4 = await addFound(env, body.invite, body.game);
        if (r4.error) return err7(r4.error, 400);
        return json11(await foundLeagues(env, admin, lgGame));
      }
      await scanLeagues(env, true);
      return json11(await foundLeagues(env, admin, lgGame));
    }
    const lst = /* @__PURE__ */ __name((v) => {
      try {
        const a = JSON.parse(v || "[]");
        return Array.isArray(a) ? a : [];
      } catch (e) {
        return [];
      }
    }, "lst");
    const row = /* @__PURE__ */ __name((x2) => {
      const cats2 = lst(x2.cats).filter((c) => CATS.includes(c));
      const o = {
        id: x2.id,
        name: x2.name,
        about: x2.about || "",
        cat: cats2.length === 1 ? cats2[0] : null,
        cats: cats2,
        days: lst(x2.days).map(Number).filter((d) => d >= 0 && d <= 6),
        time: x2.time || "",
        tz: x2.tz || "",
        open: !!x2.open,
        discord: x2.discord || "",
        web: x2.web || "",
        schedule: x2.schedule || "",
        cars: x2.cars || "",
        lang: x2.lang || "",
        created: x2.created,
        updated: x2.updated,
        game: x2.game || "iracing",
        mine: !!who2 && x2.owner === who2.id,
        by: x2.alias || "Driver",
        bot: !!x2.bot
      };
      if (o.mine || admin) {
        o.views = x2.views || 0;
        o.clicks = x2.clicks || 0;
      }
      return o;
    }, "row");
    const leagueLimit = /* @__PURE__ */ __name(async () => {
      if (!who2) return LEAGUES_FREE;
      const a = await env.DB.prepare("SELECT supporter FROM accounts WHERE id=?1").bind(who2.id).first().catch(() => null);
      return a && a.supporter ? LEAGUES_SUPPORTER : LEAGUES_FREE;
    }, "leagueLimit");
    if (m === "GET" && !lid) {
      const r4 = await env.DB.prepare("SELECT l.*, u.alias, EXISTS (SELECT 1 FROM discord_guilds g WHERE g.league_id=l.id) AS bot FROM leagues l LEFT JOIN community_users u ON u.id=l.owner WHERE l.game=?1 ORDER BY l.updated DESC LIMIT 300").bind(lgGame).all();
      const limit2 = await leagueLimit();
      const mineN = who2 ? (await env.DB.prepare("SELECT COUNT(*) AS n FROM leagues WHERE owner=?1").bind(who2.id).first().catch(() => null) || {}).n || 0 : 0;
      return json11({ game: lgGame, posted: mineN, leagues: (r4.results || []).map(row), admin, open: env.LEAGUES_OPEN === "1", limit: limit2, supporter: limit2 === LEAGUES_SUPPORTER, limits: { free: LEAGUES_FREE, supporter: LEAGUES_SUPPORTER } });
    }
    const cur = lid ? await env.DB.prepare("SELECT l.*, u.alias FROM leagues l LEFT JOIN community_users u ON u.id=l.owner WHERE l.id=?1").bind(lid).first() : null;
    if (lid && !cur) return err7("league not found", 404);
    if (m === "GET") {
      const o = row(cur);
      let days2 = [];
      if (o.views !== void 0) {
        const since = new Date(Date.now() - 13 * 864e5).toISOString().slice(0, 10);
        const r4 = await env.DB.prepare("SELECT day, views, clicks FROM league_days WHERE league_id=?1 AND day>=?2 ORDER BY day").bind(lid, since).all();
        days2 = (r4.results || []).map((d) => ({ day: d.day, views: d.views || 0, clicks: d.clicks || 0 }));
      }
      return json11({ league: o, days: days2 });
    }
    if (m !== "POST") return err7("not found", 404);
    if (lid && sub === "hit") {
      const kind = ["view", "discord", "web"].includes(body.kind) ? body.kind : "";
      if (!kind) return err7("what was it", 400);
      if (who2 && who2.id === cur.owner) return json11({ ok: true, counted: false });
      const viewer = who2 ? "a:" + who2.id : "n:" + (await sha2562("league-viewer|" + (env.DATA_KEY || "") + "|" + (req.headers.get("cf-connecting-ip") || "") + "|" + (req.headers.get("user-agent") || ""))).slice(0, 24);
      const day4 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const ins = await env.DB.prepare("INSERT OR IGNORE INTO league_hits (league_id, viewer, day, kind) VALUES (?1,?2,?3,?4)").bind(lid, viewer, day4, kind).run();
      if (!(ins.meta && ins.meta.changes)) return json11({ ok: true, counted: false });
      const col = kind === "view" ? "views" : "clicks";
      const q2 = [
        env.DB.prepare(`UPDATE leagues SET ${col}=${col}+1 WHERE id=?1`).bind(lid),
        env.DB.prepare(`INSERT INTO league_days (league_id, day, ${col}) VALUES (?1,?2,1) ON CONFLICT(league_id, day) DO UPDATE SET ${col}=${col}+1`).bind(lid, day4)
      ];
      if (Math.random() < 0.02) q2.push(env.DB.prepare("DELETE FROM league_hits WHERE day < ?1").bind(new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10)));
      await env.DB.batch(q2);
      return json11({ ok: true, counted: true });
    }
    if (!who2) return err7("sign in with your Pitlane HQ account", 401);
    if (lid && cur.owner !== who2.id && !admin) return err7("league not found", 404);
    if (lid && body.delete) {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM league_hits WHERE league_id=?1").bind(lid),
        env.DB.prepare("DELETE FROM league_days WHERE league_id=?1").bind(lid),
        env.DB.prepare("DELETE FROM leagues WHERE id=?1").bind(lid)
      ]);
      return json11({ ok: true, deleted: true });
    }
    const txt = /* @__PURE__ */ __name((v, n2) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n2) : "", "txt");
    const link = /* @__PURE__ */ __name((v, re) => {
      const t = txt(v, 200);
      return re.test(t) ? t : "";
    }, "link");
    const discord = link(body.discord, /^https:\/\/(discord\.gg|(www\.)?discord\.com\/invite)\/[A-Za-z0-9-]{2,40}\/?$/);
    const web = link(body.web, /^https:\/\/[^\s"'<>]{4,190}$/);
    const name2 = txt(body.name, 60);
    if (name2.length < 3) return err7("the league needs a name", 400);
    if (txt(body.discord, 200) && !discord) return err7("the Discord link must be an invite: https://discord.gg/\u2026 or https://discord.com/invite/\u2026", 400);
    if (txt(body.web, 200) && !web) return err7("the website must be an https:// address", 400);
    if (!discord && !web) return err7("give drivers a way in: a Discord invite or a website", 400);
    const cats = Array.isArray(body.cats) ? [...new Set(body.cats.filter((c) => CATS.includes(c)))] : CATS.includes(body.cat) ? [body.cat] : [];
    const days = Array.isArray(body.days) ? [...new Set(body.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b) : [];
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time || "")) ? String(body.time) : "";
    let tz = txt(body.tz, 60);
    try {
      if (tz) new Intl.DateTimeFormat("en", { timeZone: tz });
    } catch (e) {
      tz = "";
    }
    const x = {
      name: name2,
      about: txt(body.about, 600),
      cat: cats.length === 1 ? cats[0] : null,
      cats: JSON.stringify(cats),
      days: JSON.stringify(days),
      time,
      tz: time ? tz : "",
      open: body.open === void 0 ? 1 : body.open ? 1 : 0,
      game: body.game ? leagueGame(body.game) : cur ? leagueGame(cur.game) : "iracing",
      discord,
      web,
      schedule: txt(body.schedule, 80),
      cars: txt(body.cars, 120),
      lang: txt(body.lang, 30)
    };
    const now = Date.now();
    if (cur) {
      await env.DB.prepare("UPDATE leagues SET name=?2, about=?3, cat=?4, cats=?5, days=?6, time=?7, tz=?8, open=?9, discord=?10, web=?11, schedule=?12, cars=?13, lang=?14, updated=?15, game=?16 WHERE id=?1").bind(lid, x.name, x.about, x.cat, x.cats, x.days, x.time, x.tz, x.open, x.discord, x.web, x.schedule, x.cars, x.lang, now, x.game).run();
      return json11({ ok: true, id: lid });
    }
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM leagues WHERE owner=?1").bind(who2.id).first();
    const limit = await leagueLimit();
    if (n && n.n >= limit && !admin) return err7(limit === LEAGUES_SUPPORTER ? `you can post up to ${limit} leagues` : `you can post up to ${limit} leagues (${LEAGUES_SUPPORTER} as a supporter)`, 429);
    const id2 = rid7();
    await env.DB.prepare("INSERT INTO leagues (id, owner, name, about, cat, cats, days, time, tz, open, discord, web, schedule, cars, lang, created, updated, game) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16,?17)").bind(id2, who2.id, x.name, x.about, x.cat, x.cats, x.days, x.time, x.tz, x.open, x.discord, x.web, x.schedule, x.cars, x.lang, now, x.game).run();
    return json11({ ok: true, id: id2, game: x.game });
  }
  if (p === "/profile" && m === "GET") {
    const viewer = await sessionAccount(req, env).catch(() => null), admin = !!viewer && isAdmin(env, viewer.id);
    let uid = null, fromAnon = false;
    if (url.searchParams.get("me") === "1") uid = viewer ? viewer.id : null;
    else if (/^[A-Za-z0-9]{8,40}$/.test(url.searchParams.get("id") || "") && (admin || await follows(env, viewer && viewer.id, url.searchParams.get("id")))) uid = url.searchParams.get("id");
    else {
      const l = await env.DB.prepare("SELECT user_id, anon FROM community_laps WHERE id=?1").bind(String(url.searchParams.get("lap") || "")).first();
      if (l) {
        uid = l.user_id;
        fromAnon = l.anon === 1;
      }
    }
    const a = uid ? await env.DB.prepare("SELECT a.id, a.anon, a.name_kind, a.created, a.member_since, a.supporter, a.supporter_hidden, u.alias, u.lics FROM accounts a JOIN community_users u ON u.id=a.id WHERE a.id=?1").bind(uid).first() : null;
    const mine = !!a && !!viewer && viewer.id === a.id;
    if (!a || (fromAnon || a.anon) && !admin && !mine) return err7("this driver is anonymous", 404);
    const laps = (await env.DB.prepare(
      `SELECT id, track, car, track_id AS trackId, car_id AS carId, time, created, anon, game, cat, lic,
         (SELECT COUNT(*) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model' AND o.time<l.time)+1 AS pos,
         (SELECT COUNT(*) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model') AS "of",
         (SELECT MIN(o.time) FROM community_laps o WHERE o.track_id=l.track_id AND o.car_id=l.car_id AND o.game=l.game AND COALESCE(o.shown,'')<>'model') AS rec
       FROM community_laps l WHERE user_id=?1 AND COALESCE(shown,'')<>'model' ${admin || mine ? "" : "AND anon=0"} ORDER BY created DESC LIMIT 60`
    ).bind(a.id).all()).results || [];
    const cm = await catMap(env).catch(() => ({ tc: {}, c: {} }));
    const races = ((await env.DB.prepare("SELECT data FROM profile_races WHERE account_id=?1 ORDER BY at DESC LIMIT 20").bind(a.id).all()).results || []).map((x) => JSON.parse(x.data));
    let lics = {};
    try {
      lics = JSON.parse(a.lics || "{}") || {};
    } catch (e) {
    }
    const sup = !!a.supporter;
    const tz = Math.max(-840, Math.min(840, parseInt(url.searchParams.get("tz") || "0", 10) || 0));
    const days = {};
    for (const x of (await env.DB.prepare("SELECT started FROM sessions WHERE uploader=?1 AND started>?2 LIMIT 3000").bind("acct:" + a.id, Date.now() - 200 * 864e5).all()).results || []) {
      const d = new Date(x.started - tz * 6e4), k = d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate();
      days[k] = (days[k] || 0) + 1;
    }
    const dc = await env.DB.prepare("SELECT discord_id, handle FROM discord_links WHERE account_id=?1 AND shown=1").bind(a.id).first().catch(() => null);
    const sl = await env.DB.prepare("SELECT steamid, persona FROM steam_links WHERE account_id=?1 AND shown=1").bind(a.id).first().catch(() => null);
    const sessions = admin ? (await env.DB.prepare("SELECT id, started, track, track_config AS trackConfig, car, kind, laps, best FROM sessions WHERE uploader=?1 ORDER BY started DESC LIMIT 30").bind("acct:" + a.id).all()).results || [] : void 0;
    const trend = {};
    if (mine) {
      const fam = /* @__PURE__ */ new Map();
      for (const x of (await env.DB.prepare("SELECT game, car_id, fam_id FROM car_families").all().catch(() => null) || {}).results || []) fam.set((x.game || "iracing") + ":" + x.car_id, x.fam_id);
      const by = /* @__PURE__ */ new Map();
      for (const x of (await env.DB.prepare("SELECT game, track_id, car_id, best FROM sessions WHERE uploader=?1 AND best>0 AND track_id>0 AND car_id>0 ORDER BY started ASC LIMIT 5000").bind("acct:" + a.id).all()).results || []) {
        const g = x.game || "iracing", k = g + ":" + x.track_id + ":" + (fam.get(g + ":" + x.car_id) || x.car_id);
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(x.best);
      }
      for (const [k, list] of by) {
        let b = Infinity;
        const run = list.map((v) => b = Math.min(b, v));
        if (run.length > 1) trend[k] = run.slice(-8).map((v) => Math.round(v * 1e3) / 1e3);
      }
    }
    return json11({
      name: a.alias || "Driver",
      since: a.member_since || a.created,
      mine,
      admin,
      anonymous: !!a.anon,
      // Follow on the profile: a signed-in driver on someone else's public profile (friends.js)
      canFollow: !!viewer && !mine && !a.anon,
      following: !!viewer && !mine && await follows(env, viewer.id, a.id),
      shownAs: admin || mine ? a.anon ? "anonymous" : a.name_kind === "iracing" ? "iracing" : "nick" : void 0,
      // how the account shows itself
      discord: dc ? { id: dc.discord_id, handle: dc.handle || "" } : void 0,
      steam: sl ? { id: sl.steamid, persona: sl.persona || "" } : void 0,
      supporter: sup && (!a.supporter_hidden || mine || admin),
      supporterHidden: mine || admin ? !!a.supporter_hidden : void 0,
      lics,
      races,
      days,
      sessions,
      laps: laps.map((x) => ({ ...x, trend: trend[(x.game || "iracing") + ":" + x.trackId + ":" + x.carId], car: famName(x.game, x.carId, x.car), anon: !!x.anon, lic: licOf(lics[x.cat]) || licOf(x.lic), cat: (x.game || "iracing") === "iracing" ? catOf(cm, x.trackId, x.carId, x.cat, x.track, x.car) : null }))
    });
  }
  const am = p.match(/^\/admin\/(laps|reports|setups|trackmaps)\/([A-Za-z0-9_.:-]{1,64})$/);
  if (am && m === "DELETE") {
    const acc = await sessionAccount(req, env);
    if (!acc || !isAdmin(env, acc.id)) return err7("only the admins of this server can do this", 403);
    const [, kind, id2] = am;
    const q2 = {
      laps: ["DELETE FROM community_laps WHERE id=?1", id2],
      reports: ["DELETE FROM community_reports WHERE id=?1", id2],
      setups: ["DELETE FROM community_setups WHERE id=?1", id2],
      trackmaps: ["DELETE FROM track_maps WHERE track_id=?1 AND game=?2", +id2 || 0, game]
    }[kind];
    const r4 = await env.DB.prepare(q2[0]).bind(...q2.slice(1)).run();
    return json11({ deleted: !!(r4.meta && r4.meta.changes) });
  }
  if (p.startsWith("/reports/") && m === "GET") {
    const r4 = await env.DB.prepare("SELECT r.*, CASE WHEN r.anon=1 THEN 'Anonymous' WHEN r.shown='iracing' AND COALESCE(u.iracing,'')<>'' THEN u.iracing ELSE u.alias END AS alias FROM community_reports r JOIN community_users u ON u.id=r.user_id WHERE r.id=?1").bind(p.slice(9)).first();
    if (!r4) return err7("not found", 404);
    const data = JSON.parse(await openData(env, r4.data));
    const rivals = seesRivals(req, env, await me(req, env).catch(() => null));
    for (const k of ["results", "brakes"]) if (Array.isArray(data[k])) data[k] = data[k].map((x) => !x ? x : x.me ? r4.anon ? { ...x, name: "Anonymous" } : x : rivals ? x : { ...x, name: "Anonymous" });
    return json11({ ...data, id: r4.id, alias: r4.alias, game: r4.game, shared: true });
  }
  if (p === "/season/info" && m === "GET") {
    const c = await env.DB.prepare("SELECT updated FROM season_cache WHERE k='current'").first();
    const i = await env.DB.prepare("SELECT data FROM season_chunks WHERE k='info' AND idx=0").first();
    return json11({ updated: c ? c.updated : null, ...i ? JSON.parse(i.data) : {} });
  }
  if (p === "/season" && m === "GET") {
    const c = await env.DB.prepare("SELECT updated, chunks FROM season_cache WHERE k='current'").first();
    if (!c) return err7("no season schedule on this server yet", 404);
    const r4 = await env.DB.prepare("SELECT data FROM season_chunks WHERE k='current' AND idx<?1 ORDER BY idx").bind(c.chunks).all();
    const seen2 = await seenSummary(env).catch(() => ({}));
    return new Response('{"updated":' + c.updated + ',"seen":' + JSON.stringify(seen2) + ',"season":' + (r4.results || []).map((x) => x.data).join("") + "}", { headers: { ...JSONH8, "cache-control": "public, max-age=900" } });
  }
  if (p === "/setups/cars" && m === "GET") {
    const r4 = await env.DB.prepare("SELECT car_path AS carPath, MAX(car) AS car, COUNT(*) AS n FROM community_setups WHERE game=?1 GROUP BY car_path ORDER BY n DESC LIMIT 500").bind(game).all();
    return json11({ cars: r4.results || [] });
  }
  if (p === "/setups" && m === "GET") {
    const car = url.searchParams.get("car") || "", track2 = (url.searchParams.get("track") || "").slice(0, 80), q2 = (url.searchParams.get("q") || "").slice(0, 60);
    const r4 = await env.DB.prepare(
      `SELECT s.id, u.alias, s.car_path AS carPath, s.car, s.track, s.name, s.notes, s.size, s.downloads, s.created FROM community_setups s JOIN community_users u ON u.id=s.user_id
       WHERE (?1='' OR s.car_path=?1) AND (?2='' OR s.track LIKE '%'||?2||'%') AND (?3='' OR s.name LIKE '%'||?3||'%' OR s.car LIKE '%'||?3||'%' OR s.track LIKE '%'||?3||'%') AND s.game=?4
       ORDER BY s.downloads DESC, s.created DESC LIMIT 200`
    ).bind(car, track2, q2, game).all();
    return json11({ setups: r4.results || [] });
  }
  if (p.startsWith("/setups/") && p !== "/setups/mine" && m === "GET") {
    const id2 = p.slice(8);
    const s = await env.DB.prepare("SELECT s.*, u.alias FROM community_setups s JOIN community_users u ON u.id=s.user_id WHERE s.id=?1").bind(id2).first();
    if (!s) return err7("not found", 404);
    await env.DB.prepare("UPDATE community_setups SET downloads=downloads+1 WHERE id=?1").bind(id2).run();
    return json11({ id: s.id, alias: s.alias, carPath: s.car_path, car: s.car, track: s.track, name: s.name, notes: s.notes, sha: s.sha, data: s.data });
  }
  if (p === "/preview/sample" && m === "GET") {
    const t = await pickSample(env, game);
    return t ? new Response(t, { headers: { ...JSONH8, "cache-control": "public, max-age=600" } }) : json11({ frames: [] });
  }
  let u = await me(req, env);
  if (!u) return err7("wrong or missing token", 401);
  if (p === "/guests" && m === "GET") {
    if (!u.account || !isAdmin(env, u.id)) return err7("only the admins of this server can do this", 403);
    const r4 = await env.DB.prepare("SELECT g.id, g.alias, g.created, (SELECT COUNT(*) FROM community_laps l WHERE l.user_id=g.id) AS laps, (SELECT a.display FROM guest_links gl JOIN accounts a ON a.id=gl.account_id WHERE gl.gid=g.id) AS linked FROM community_users g WHERE g.owner=?1 AND g.id LIKE 'guest-%' ORDER BY g.created DESC LIMIT 60").bind(u.id).all();
    return json11({ guests: (r4.results || []).map((x) => ({ id: x.id, name: x.alias, laps: x.laps || 0, created: x.created, linked: x.linked || null })) });
  }
  if (m === "POST" && (p === "/laps" || p === "/reports") && typeof body.guest === "string" && body.guest.trim()) {
    if (!u.account || !isAdmin(env, u.id)) return err7("only the admins of this server can share laps for other drivers", 403);
    const name2 = cleanAlias(body.guest);
    const had = await env.DB.prepare("SELECT id FROM community_users WHERE owner=?1 AND id LIKE 'guest-%' AND lower(alias)=lower(?2)").bind(u.id, name2).first();
    const gid = had ? had.id : "guest-" + (await sha2562(u.id + ":" + name2.toLowerCase())).slice(0, 20);
    if (await nameTaken(env, name2, u.id)) return json11({ error: `"${name2}" is already used by another driver on Pitlane HQ, choose another name`, code: "name_taken" }, 409);
    await env.DB.prepare("INSERT INTO community_users (id, token_hash, alias, created, owner) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET alias=excluded.alias, owner=excluded.owner").bind(gid, await sha2562("guest:" + gid + ":" + rid7()), name2, Date.now(), u.id).run();
    const gl = await env.DB.prepare("SELECT l.account_id AS id, a.anon, a.name_kind FROM guest_links l JOIN accounts a ON a.id=l.account_id WHERE l.gid=?1").bind(gid).first();
    const to = gl ? await env.DB.prepare("SELECT id, alias, uploads_day, uploads FROM community_users WHERE id=?1").bind(gl.id).first() : null;
    u = to || await env.DB.prepare("SELECT id, alias, uploads_day, uploads FROM community_users WHERE id=?1").bind(gid).first();
    body.anon = !!(to && gl.anon);
    body.as = to && gl.name_kind === "iracing" ? "iracing" : "nick";
  }
  if (body.as === "anon") body.anon = true;
  else if (body.as === "nick" || body.as === "iracing") body.anon = false;
  const shownAs = body.as === "iracing" ? "iracing" : "nick";
  if (shownAs === "iracing" && typeof body.iracingName === "string" && body.iracingName.trim())
    await env.DB.prepare("UPDATE community_users SET iracing=?2 WHERE id=?1").bind(u.id, cleanAlias(body.iracingName)).run();
  if (p === "/guest-rename" && m === "POST") {
    if (!u.account || !isAdmin(env, u.id)) return err7("only the admins of this server can do this", 403);
    const from = cleanAlias(body.from || ""), to = cleanAlias(body.to || "");
    if (!from || !to) return err7("both names are needed", 400);
    if (await nameTaken(env, to, u.id)) return json11({ error: `"${to}" is already used by another driver on Pitlane HQ, choose another name`, code: "name_taken" }, 409);
    const row = await env.DB.prepare("SELECT id FROM community_users WHERE owner=?1 AND id LIKE 'guest-%' AND lower(alias)=lower(?2)").bind(u.id, from).first();
    if (from.toLowerCase() !== to.toLowerCase()) {
      const clash = await env.DB.prepare("SELECT id FROM community_users WHERE owner=?1 AND id LIKE 'guest-%' AND lower(alias)=lower(?2)").bind(u.id, to).first();
      if (clash) return json11({ error: `You already have a driver called "${to}"`, code: "name_taken" }, 409);
    }
    if (row) await env.DB.prepare("UPDATE community_users SET alias=?2 WHERE id=?1").bind(row.id, to).run();
    await env.DB.prepare("UPDATE laps SET drv=?3 WHERE lower(drv)=lower(?2) AND session_id IN (SELECT id FROM sessions WHERE uploader=?1)").bind("acct:" + u.id, from, to).run().catch(() => {
    });
    await env.DB.prepare("UPDATE sessions SET drvs=(SELECT group_concat(DISTINCT drv) FROM laps WHERE session_id=sessions.id) WHERE uploader=?1 AND drvs IS NOT NULL").bind("acct:" + u.id).run().catch(() => {
    });
    return json11({ ok: true, renamed: !!row, name: to });
  }
  if (p === "/name-check" && m === "POST") {
    if (!u.account || !isAdmin(env, u.id)) return err7("only the admins of this server can do this", 403);
    return json11({ free: !await nameTaken(env, cleanAlias(body.name), u.id) });
  }
  if (p === "/preview/sample" && m === "POST") {
    const r4 = await storeSample(env, u.id, body);
    return r4.error ? err7(r4.error, r4.status) : json11(r4);
  }
  if (p === "/season/seen" && m === "POST") {
    const r4 = await recordSeen(env, u.id, body);
    return r4.error ? err7(r4.error, r4.status) : json11(r4);
  }
  if ((p === "/season" || p === "/admin/season") && m === "POST") {
    const allowed = String(env.SEASON_UPLOADERS || env.ADMINS || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!u.account || !(allowed.includes(u.id) || isAdmin(env, u.id))) return err7("this account cannot publish the season schedule", 403);
    const data = JSON.stringify(body.season || null);
    if (data.length < 100 || data.length > 12e6 || !Array.isArray(body.season.seasons)) return err7("season schedule missing or too large", 400);
    const parts = [];
    for (let i = 0; i < data.length; i += 9e5) parts.push(data.slice(i, i + 9e5));
    await env.DB.batch([
      env.DB.prepare("DELETE FROM season_chunks WHERE k='current'"),
      ...parts.map((d, i) => env.DB.prepare("INSERT INTO season_chunks (k, idx, data) VALUES ('current',?1,?2)").bind(i, d)),
      env.DB.prepare("INSERT INTO season_cache (k, updated, chunks) VALUES ('current',?1,?2) ON CONFLICT(k) DO UPDATE SET updated=excluded.updated, chunks=excluded.chunks").bind(Date.now(), parts.length),
      // what the admin page's Season says about it without reading the whole season
      env.DB.prepare("INSERT INTO season_chunks (k, idx, data) VALUES ('info',0,?1) ON CONFLICT(k, idx) DO UPDATE SET data=excluded.data").bind(JSON.stringify(seasonInfo(body.season, u.id)))
    ]);
    return json11({ published: true, size: data.length });
  }
  if (p === "/setups/mine" && m === "GET") {
    const r4 = await env.DB.prepare("SELECT id, car_path AS carPath, car, track, name, notes, size, downloads, created FROM community_setups WHERE user_id=?1 ORDER BY created DESC").bind(u.id).all();
    return json11({ setups: (r4.results || []).map((x) => ({ ...x, alias: u.alias, mine: true })) });
  }
  if (p === "/setups" && m === "POST") {
    if (typeof body.carPath !== "string" || !CAR_RE.test(body.carPath) || body.carPath.includes("..")) return err7("unknown car folder", 400);
    if (typeof body.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(body.data) || body.data.length > 56e4) return err7("setup missing or too large (400 KB max)", 400);
    if (typeof body.sha !== "string" || !/^[0-9a-f]{64}$/.test(body.sha)) return err7("missing checksum", 400);
    const bytes = Uint8Array.from(atob(body.data), (c) => c.charCodeAt(0));
    if (await crypto.subtle.digest("SHA-256", bytes).then((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("")) !== body.sha) return err7("checksum does not match", 400);
    if (!await countUpload(env, u)) return err7("too many uploads today", 429);
    const id2 = rid7();
    const r4 = await env.DB.prepare(
      "INSERT INTO community_setups (id, user_id, car_path, car, track, name, notes, data, sha, size, created, game) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12) ON CONFLICT(user_id, sha) DO NOTHING"
    ).bind(id2, u.id, body.carPath, str3(body.car), str3(body.track, 80), cleanFile(body.name), str3(body.notes, 1e3), body.data, body.sha, bytes.length, Date.now(), game).run();
    if (!r4.meta || !r4.meta.changes) return json11({ kept: "you already shared this setup" });
    return json11({ shared: true, id: id2 });
  }
  if (p.startsWith("/setups/") && m === "DELETE") {
    await env.DB.prepare("DELETE FROM community_setups WHERE id=?1 AND user_id=?2").bind(p.slice(8), u.id).run();
    return json11({ deleted: true });
  }
  if (p === "/adopt" && m === "POST") {
    if (!u.account) return err7("sign in with your Pitlane HQ account", 401);
    const t = typeof body.token === "string" ? body.token.trim() : "";
    if (t.length < 20) return err7("missing token", 400);
    const d = await env.DB.prepare("SELECT id FROM community_users WHERE token_hash=?1").bind(await sha2562(t)).first();
    if (!d || d.id === u.id || /^(o:|guest-)/.test(d.id) || await env.DB.prepare("SELECT 1 FROM accounts WHERE id=?1").bind(d.id).first()) return json11({ adopted: 0 });
    const laps = (await env.DB.prepare("SELECT id, car_id, track_id, time, game, trace IS NOT NULL AS traced FROM community_laps WHERE user_id=?1").bind(d.id).all()).results || [];
    const q2 = [], combos2 = /* @__PURE__ */ new Set();
    for (const l of laps) {
      const mine = await env.DB.prepare("SELECT id, time, trace IS NOT NULL AS traced FROM community_laps WHERE user_id=?1 AND car_id=?2 AND track_id=?3").bind(u.id, l.car_id, l.track_id).first();
      combos2.add(l.game + "|" + l.track_id + "|" + l.car_id);
      if (!mine) {
        q2.push(env.DB.prepare("UPDATE community_laps SET user_id=?2 WHERE id=?1").bind(l.id, u.id));
        continue;
      }
      const better = mine.time > l.time || !mine.traced && !!l.traced;
      if (better) q2.push(env.DB.prepare("DELETE FROM community_laps WHERE id=?1").bind(mine.id), env.DB.prepare("UPDATE community_laps SET user_id=?2 WHERE id=?1").bind(l.id, u.id));
      else q2.push(env.DB.prepare("DELETE FROM community_laps WHERE id=?1").bind(l.id));
    }
    q2.push(
      env.DB.prepare("UPDATE community_reports SET user_id=?2 WHERE user_id=?1").bind(d.id, u.id),
      env.DB.prepare("UPDATE OR IGNORE community_setups SET user_id=?2 WHERE user_id=?1").bind(d.id, u.id),
      env.DB.prepare("DELETE FROM community_setups WHERE user_id=?1").bind(d.id),
      env.DB.prepare("UPDATE track_maps SET user_id=?2 WHERE user_id=?1").bind(d.id, u.id),
      env.DB.prepare("DELETE FROM community_users WHERE id=?1").bind(d.id)
    );
    await env.DB.batch(q2);
    await moveDriver(env, "acct:" + d.id, "acct:" + u.id);
    for (const c of combos2) {
      const [g, tr2, ca] = c.split("|");
      await markModel(env, g, +tr2, +ca);
    }
    return json11({ adopted: laps.length });
  }
  if (p === "/rival-names" && m === "POST") {
    if (!u.account) return err7("sign in with your Pitlane HQ account", 401);
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 600);
    let named = 0;
    for (const x of items) {
      const carId = int3(x && x.carId), trackId = int3(x && x.trackId), time = num2(x && x.time), full = driverName(x && (x.name || x.short));
      if (!carId || !trackId || !(time > 10) || !full) continue;
      const short = shortDriverName(full);
      const hit = await env.DB.prepare(
        `SELECT DISTINCT u.id FROM community_laps l JOIN community_users u ON u.id=l.user_id
         WHERE l.car_id=?1 AND l.track_id=?2 AND abs(l.time-?3)<0.0006 AND u.id LIKE 'o:%' AND (u.alias='Anonymous' OR u.alias=?5) AND u.owner=?4`
      ).bind(await famId(env, gameOf(x && x.game), carId), trackId, time, u.id, short).all();
      const ids = (hit.results || []).map((r4) => r4.id);
      if (ids.length !== 1) continue;
      await env.DB.prepare("UPDATE community_users SET alias=?2 WHERE id=?1 AND (alias='Anonymous' OR alias=?3)").bind(ids[0], full, short).run();
      named++;
    }
    return json11({ named });
  }
  if (p === "/link-driver" && m === "POST") {
    if (!u.account) return err7("sign in with your Pitlane HQ account", 401);
    if (typeof body.key !== "string" || !/^[0-9a-f]{16,64}$/i.test(body.key)) return err7("missing key", 400);
    const r4 = await linkDriver(env, u.id, await otherId(env, body.key), game);
    return r4.error ? err7(r4.error, r4.status) : json11(r4);
  }
  if (p === "/lics" && m === "POST") {
    if (!u.account) return err7("sign in with your Pitlane HQ account", 401);
    const row = await env.DB.prepare("SELECT lics FROM community_users WHERE id=?1").bind(u.id).first();
    let out = {};
    try {
      out = JSON.parse(row && row.lics || "{}") || {};
    } catch (e) {
    }
    let n = 0;
    for (const k of CATS) {
      const v = licOf(body.lics && body.lics[k]);
      if (v) {
        out[k] = v;
        n++;
      }
    }
    if (!n) return err7("no license classes", 400);
    await env.DB.prepare("UPDATE community_users SET lics=?2 WHERE id=?1").bind(u.id, JSON.stringify(out)).run();
    return json11({ ok: true, lics: out });
  }
  if (p === "/me" && m === "POST") {
    if (u.account) return err7("change your public name in your account", 400);
    await env.DB.prepare("UPDATE community_users SET alias=?2 WHERE id=?1").bind(u.id, cleanAlias(body.alias)).run();
    return json11({ ok: true });
  }
  if (p === "/me" && m === "DELETE") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM community_laps WHERE user_id=?1").bind(u.id),
      env.DB.prepare("DELETE FROM community_reports WHERE user_id=?1").bind(u.id),
      env.DB.prepare("DELETE FROM community_setups WHERE user_id=?1").bind(u.id),
      ...u.account ? [] : [env.DB.prepare("DELETE FROM community_users WHERE id=?1").bind(u.id)]
    ]);
    return json11({ deleted: true });
  }
  if (p === "/share-lap" && m === "POST") {
    if (!u.account) return err7("sign in with your Pitlane HQ account", 401);
    const s = await env.DB.prepare("SELECT * FROM sessions WHERE id=?1 AND uploader=?2").bind(String(body.sessionId || ""), "acct:" + u.id).first();
    if (!s) return err7("session not found in your account", 404);
    const lap = body.lapId ? await env.DB.prepare("SELECT time, sectors, trace, valid FROM laps WHERE id=?1 AND session_id=?2 AND drv IS NULL").bind(String(body.lapId), s.id).first() : await env.DB.prepare("SELECT time, sectors, trace FROM laps WHERE session_id=?1 AND valid=1 AND drv IS NULL AND time>0 AND trace IS NOT NULL ORDER BY time LIMIT 1").bind(s.id).first() || await env.DB.prepare("SELECT time, sectors, trace FROM laps WHERE session_id=?1 AND valid=1 AND drv IS NULL AND time>0 ORDER BY time LIMIT 1").bind(s.id).first();
    if (!lap || !(lap.time > 10)) return err7("this session has no valid lap to share", 404);
    if (body.lapId && lap.valid !== 1) return err7("this lap is not valid (off track or the pit lane): it cannot be shared", 400);
    const name2 = s.track + (s.track_config ? " \xB7 " + s.track_config : "");
    const g = s.game || "iracing";
    const { trackId, carId } = await comboIds(env, s, name2, g, u.id, body);
    const r4 = await keepBestLap(env, u.id, { game: g, carId, trackId, car: s.car, track: name2, time: lap.time, sectors: lap.sectors, trace: lap.trace, anon: !!body.anon, shown: shownAs, count: /* @__PURE__ */ __name(() => countUpload(env, u), "count"), ctx });
    if (r4.limit) return err7("too many uploads today", 429);
    if (r4.kept) return json11({ kept: "your faster lap is already shared", traced: r4.traced });
    return json11({ shared: true, traced: r4.traced });
  }
  if (p === "/laps" && m === "POST") {
    const carId = int3(body.carId), trackId = int3(body.trackId), time = num2(body.time);
    if (!carId || !trackId || !time || time <= 10 || time > 3600) return err7("lap needs carId, trackId and time", 400);
    if (isTestDrive(body.kind)) return json11({ kept: "laps of a test drive are not shared" });
    const sectors = Array.isArray(body.sectors) ? JSON.stringify(body.sectors.filter((x) => typeof x === "number").slice(0, 10)) : null;
    if (typeof body.other === "string" && /^[0-9a-f]{16,64}$/i.test(body.other)) {
      if (!u.account) return err7("sign in with your Pitlane HQ account to share other drivers' times", 401);
      const oid = await otherId(env, body.other);
      const plain2 = body.trace && Array.isArray(body.trace.d) && body.trace.d.length >= 60 ? JSON.stringify({ ...body.trace, src: body.trace.src === "real" ? "real" : "field" }) : null;
      if (plain2 && plain2.length > 9e5) return err7("lap trace too large", 400);
      const link = await env.DB.prepare("SELECT l.account_id AS id, a.anon, a.name_kind FROM driver_links l JOIN accounts a ON a.id=l.account_id WHERE l.oid=?1 AND l.game=?2").bind(oid, game).first();
      if (link) {
        const r6 = await keepBestLap(env, link.id, { game, carId, trackId, car: body.car, track: body.track, time, sectors, trace: await sealData(env, plain2), len: traceLen(body.trace), cls: body.cls, wet: wetOf(body.trace && body.trace.f), anon: !!link.anon, shown: link.name_kind === "iracing" ? "iracing" : "nick", lic: body.lic, cat: body.cat, official: body.official, ai: body.ai === true, count: /* @__PURE__ */ __name(() => countUpload(env, u), "count"), ctx });
        if (r6.limit) return err7("too many uploads today", 429);
        return json11(r6.kept ? { kept: "a faster lap of this driver is already shared" } : { shared: true });
      }
      const short = driverName(body.name || body.short);
      await env.DB.prepare("INSERT INTO community_users (id, token_hash, alias, created, owner) VALUES (?1,?2,?5,?3,?4) ON CONFLICT(id) DO UPDATE SET alias=excluded.alias WHERE excluded.alias<>'Anonymous'").bind(oid, "other:" + oid, Date.now(), u.id, short || "Anonymous").run();
      const r5 = await keepBestLap(env, oid, { game, carId, trackId, car: body.car, track: body.track, time, sectors, trace: await sealData(env, plain2), len: traceLen(body.trace), cls: body.cls, wet: wetOf(body.trace && body.trace.f), anon: true, shown: "nick", lic: body.lic, cat: body.cat, official: body.official, ai: body.ai === true, count: /* @__PURE__ */ __name(() => countUpload(env, u), "count") });
      if (r5.limit) return err7("too many uploads today", 429);
      return json11(r5.kept ? { kept: "a faster lap of this driver is already shared" } : { shared: true });
    }
    const plainTrace = body.trace ? JSON.stringify(body.trace) : null;
    if (plainTrace && plainTrace.length > 9e5) return err7("lap trace too large", 400);
    const trace = await sealData(env, plainTrace);
    const r4 = await keepBestLap(env, u.id, { game, carId, trackId, car: body.car, track: body.track, time, sectors, trace, len: traceLen(body.trace), cls: body.cls, wet: wetOf(body.trace && body.trace.f), anon: !!body.anon, shown: shownAs, lic: body.lic, cat: body.cat, official: body.official, ai: body.ai === true, count: /* @__PURE__ */ __name(() => countUpload(env, u), "count"), ctx });
    if (r4.limit) return err7("too many uploads today", 429);
    return json11(r4.kept ? { kept: "your faster lap is already shared" } : { shared: true });
  }
  if (p === "/trackinfo" && m === "POST") {
    const trackId = int3(body.trackId);
    if (!trackId || !(Number.isInteger(body.nturns) && body.nturns >= 1 && body.nturns <= 60)) return err7("trackInfo needs trackId and nturns", 400);
    return json11({ ok: true, changed: await noteTurnCount(env, game, trackId, str3(body.track), body.nturns) });
  }
  if (p === "/trackmaps" && m === "POST") {
    const trackId = int3(body.trackId), time = num2(body.time), n = int3(body.n);
    if (trackId && Number.isInteger(body.nturns)) await noteTurnCount(env, game, trackId, str3(body.track), body.nturns).catch(() => {
    });
    const x = body.x, y = body.y;
    if (!trackId || !time || time <= 10 || time > 3600) return err7("layout needs trackId and the lap time", 400);
    if (body.clean !== true) return err7("only laps without incidents", 400);
    if (!(n >= 100 && n <= 3e3) || !Array.isArray(x) || !Array.isArray(y) || x.length !== n || y.length !== n) return err7("layout points missing", 400);
    const ok = /* @__PURE__ */ __name((v) => typeof v === "number" && isFinite(v) && Math.abs(v) < 3e4, "ok");
    if (!x.every(ok) || !y.every(ok)) return err7("layout points out of range", 400);
    const g = Array.isArray(body.g) && body.g.length === 2 && body.g.every((v) => typeof v === "number" && isFinite(v)) && Math.abs(body.g[0]) <= 90 && Math.abs(body.g[1]) <= 180 ? body.g.map((v) => Math.round(v * 1e5) / 1e5) : null;
    const r22 = /* @__PURE__ */ __name((v) => Math.round(v * 10) / 10, "r2");
    const old = await env.DB.prepare("SELECT time, geo FROM track_maps WHERE game=?1 AND track_id=?2").bind(game, trackId).first();
    if (old && old.geo && !g) return json11({ kept: "a layout from the game's position already draws this track" });
    if (old && old.time <= time && !(g && !old.geo)) return json11({ kept: "a faster clean lap already drew this track" });
    if (!await countUpload(env, u)) return err7("too many uploads today", 429);
    await env.DB.prepare(
      `INSERT INTO track_maps (game, track_id, track, n, len, pts, time, user_id, created, geo) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
       ON CONFLICT(game, track_id) DO UPDATE SET track=excluded.track, n=excluded.n, len=excluded.len, pts=excluded.pts, time=excluded.time, user_id=excluded.user_id, created=excluded.created, geo=excluded.geo`
    ).bind(game, trackId, str3(body.track), n, num2(body.len), JSON.stringify({ x: x.map(r22), y: y.map(r22) }), time, u.id, Date.now(), g ? JSON.stringify(g) : null).run();
    return json11({ shared: true });
  }
  if (p === "/pitlane" && m === "POST") {
    const trackId = int3(body.trackId), n = int3(body.n), pts = body.pts;
    if (!trackId || !(n >= 60 && n <= 4e3) || !Array.isArray(pts) || pts.length < 10 || pts.length > 2e3) return err7("pit lane needs trackId, n and its points", 400);
    const ok = pts.every((q2) => Array.isArray(q2) && q2.length === 2 && Number.isInteger(q2[0]) && q2[0] >= 0 && q2[0] < n && typeof q2[1] === "number" && isFinite(q2[1]) && Math.abs(q2[1]) <= 80);
    if (!ok) return err7("pit lane points out of range", 400);
    if (!await countUpload(env, u)) return err7("too many uploads today", 429);
    const old = await env.DB.prepare("SELECT n, pts FROM track_pits WHERE game=?1 AND track_id=?2").bind(game, trackId).first();
    const keep = old && Math.abs(old.n - n) <= 4 ? JSON.parse(old.pts) : {};
    for (const [i, v] of pts) keep[i] = keep[i] == null ? v : Math.round((keep[i] * 0.6 + v * 0.4) * 10) / 10;
    await env.DB.prepare(`INSERT INTO track_pits (game, track_id, n, pts, updated) VALUES (?1,?2,?3,?4,?5)
       ON CONFLICT(game, track_id) DO UPDATE SET n=excluded.n, pts=excluded.pts, updated=excluded.updated`).bind(game, trackId, n, JSON.stringify(keep), Date.now()).run();
    return json11({ shared: true, points: Object.keys(keep).length });
  }
  if (p === "/reports" && m === "POST") {
    const data = JSON.stringify(body.report || {});
    if (data.length < 20 || data.length > 9e5) return err7("report missing or too large", 400);
    if (!await countUpload(env, u)) return err7("too many uploads today", 429);
    const r4 = body.report;
    await env.DB.prepare("INSERT INTO community_reports (id, user_id, car_id, car, track_id, track, data, created, anon, game, finish, field, best, shown) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)").bind(rid7(), u.id, int3(r4.carId), str3(r4.car), int3(r4.trackId), str3(r4.track), await sealData(env, data), Date.now(), body.anon ? 1 : 0, gameOf(body.game || r4.game), int3(r4.finish), int3(r4.field), num2(r4.best), shownAs).run();
    return json11({ shared: true });
  }
  return err7("not found", 404);
}
__name(community, "community");
function seasonInfo(season, by) {
  const ss = season && season.seasons || [], ws = ss.flatMap((x) => x.schedules || []).map((w) => w.start_date).filter(Boolean).sort();
  return { series: ss.length, weeks: ws.length, from: ws[0] || null, to: ws.at(-1) || null, source: season && season.source || "api", by };
}
__name(seasonInfo, "seasonInfo");

// src/stripe.js
var JSONH9 = { "content-type": "application/json" };
var json12 = /* @__PURE__ */ __name((o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: JSONH9 }), "json");
var err8 = /* @__PURE__ */ __name((e, s = 400) => json12({ error: e }, s), "err");
var DAY2 = 864e5;
var GRACE = 3 * DAY2;
var FIRST = 35 * DAY2;
var TOLERANCE = 300;
async function hmacHex2(secret, body) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)));
  return [...s].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex2, "hmacHex");
var same4 = /* @__PURE__ */ __name((a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}, "same");
async function stripeSigned(secret, header, body, nowSec = Math.floor(Date.now() / 1e3)) {
  let t = 0;
  const v1 = [];
  for (const part of String(header || "").split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === "t") t = +v;
    else if (k === "v1") v1.push(v.toLowerCase());
  }
  if (!t || !v1.length || Math.abs(nowSec - t) > TOLERANCE) return false;
  const want = await hmacHex2(secret, t + "." + body);
  return v1.some((s) => same4(s, want));
}
__name(stripeSigned, "stripeSigned");
var subOrder = /* @__PURE__ */ __name((id2) => "stripe:sub:" + id2, "subOrder");
var payOrder = /* @__PURE__ */ __name((id2) => "stripe:pay:" + id2, "payOrder");
var donOrder = /* @__PURE__ */ __name((id2) => "stripe:don:" + id2, "donOrder");
var orderRow = /* @__PURE__ */ __name((env, id2) => env.DB.prepare("SELECT account_id, email_hash, kind, until, status FROM pro_orders WHERE id=?1").bind(id2).first().catch(() => null), "orderRow");
async function stripeWebhook(req, env, emailHash2, opts = {}) {
  if (!env.STRIPE_WEBHOOK_SECRET) return err8("Stripe is not set up on this server", 404);
  const body = await req.text();
  if (body.length > 3e5) return err8("too large", 413);
  if (!await stripeSigned(env.STRIPE_WEBHOOK_SECRET, req.headers.get("stripe-signature"), body)) return err8("bad signature", 401);
  let j;
  try {
    j = JSON.parse(body);
  } catch (e) {
    return err8("not JSON");
  }
  const ev = String(j.type || ""), o = j.data && j.data.object || {}, now = Date.now();
  if (ev === "checkout.session.completed" || ev === "checkout.session.async_payment_succeeded") {
    let ref = String(o.client_reference_id || "");
    const support = ref.startsWith("support-") || !!(opts.supportLink && o.payment_link === opts.supportLink);
    if (ref.startsWith("support-")) ref = ref.slice(8);
    let accountId = /^[\w-]{6,80}$/.test(ref) ? ref : null;
    if (accountId) {
      const a = await env.DB.prepare("SELECT id FROM accounts WHERE id=?1").bind(accountId).first().catch(() => null);
      if (!a) accountId = null;
    }
    const email = String(o.customer_details && o.customer_details.email || o.customer_email || "").trim().toLowerCase();
    const eh = email ? await emailHash2(env, email) : null;
    if (support) {
      if (o.payment_status !== "paid") return json12({ ok: true, skipped: "not paid yet" });
      if (!accountId && eh) {
        const a = await env.DB.prepare("SELECT id FROM accounts WHERE email_hash=?1").bind(eh).first().catch(() => null);
        if (a) accountId = a.id;
      }
      await env.DB.prepare("INSERT INTO pro_orders (id, account_id, email_hash, kind, status, until, at) VALUES (?1,?2,?3,'supporter','on',0,?4) ON CONFLICT(id) DO NOTHING").bind(donOrder(o.id), accountId, eh, now).run();
      if (accountId) await env.DB.prepare("UPDATE accounts SET supporter=1, supporter_src=COALESCE(supporter_src,'stripe') WHERE id=?1").bind(accountId).run();
      return json12({ ok: true, supporter: !!accountId });
    }
    if (o.mode === "subscription" && o.subscription) {
      const id2 = subOrder(typeof o.subscription === "string" ? o.subscription : o.subscription.id);
      const had = await orderRow(env, id2);
      if (had && had.status === "off") {
        await setPro(env, { accountId, eh, kind: "subscription", until: had.until, on: false, order: id2 });
        return json12({ ok: true, subscription: false });
      }
      const until = Math.max(had && had.until || 0, now + FIRST);
      await setPro(env, { accountId, eh, kind: "subscription", until, on: true, order: id2 });
      return json12({ ok: true, subscription: true });
    }
    if (o.mode === "payment") {
      if (o.payment_status !== "paid") return json12({ ok: true, skipped: "not paid yet" });
      const pi = typeof o.payment_intent === "string" ? o.payment_intent : o.payment_intent && o.payment_intent.id || o.id;
      await setPro(env, { accountId, eh, kind: "lifetime", until: 0, on: true, order: payOrder(pi) });
      return json12({ ok: true, lifetime: true });
    }
    return json12({ ok: true, skipped: "mode " + o.mode });
  }
  if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev) && o.id) {
    if (o.status === "incomplete") return json12({ ok: true, skipped: "incomplete" });
    const id2 = subOrder(o.id), had = await orderRow(env, id2);
    const end = o.current_period_end || o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end || 0;
    const live2 = ev !== "customer.subscription.deleted" && ["active", "trialing", "past_due"].includes(o.status);
    const until = end ? end * 1e3 + GRACE : had && had.until || now + FIRST;
    const on = live2 && until > now;
    await setPro(env, { accountId: had && had.account_id || null, eh: had && had.email_hash || null, kind: "subscription", until: on ? until : now, on, order: id2 });
    return json12({ ok: true, subscription: on });
  }
  if (ev === "charge.refunded" && o.refunded && o.payment_intent) {
    const pi = typeof o.payment_intent === "string" ? o.payment_intent : o.payment_intent.id;
    const had = await orderRow(env, payOrder(pi));
    if (!had || had.kind !== "lifetime") return json12({ ok: true, skipped: "not a lifetime payment" });
    await setPro(env, { accountId: had.account_id, eh: had.email_hash, kind: "lifetime", until: 0, on: false, order: payOrder(pi) });
    return json12({ ok: true, lifetime: false });
  }
  return json12({ ok: true, skipped: ev });
}
__name(stripeWebhook, "stripeWebhook");

// src/news.js
var FEED = "https://www.iracing.com/feed/";
var H2 = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type" };
var ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function unesc2(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 1114112 ? String.fromCodePoint(n) : "";
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}
__name(unesc2, "unesc");
var cdata = /* @__PURE__ */ __name((s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"), "cdata");
function plain(s, max) {
  s = unesc2(cdata(s || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max).trim() + "\u2026" : s;
}
__name(plain, "plain");
var tag2 = /* @__PURE__ */ __name((x, t) => {
  const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
  return m ? m[1] : "";
}, "tag");
var https = /* @__PURE__ */ __name((u) => /^https:\/\//.test(u) ? u : "", "https");
function parseFeed(xml) {
  const out = [];
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const x = m[0];
    const link = https(unesc2(cdata(tag2(x, "link")).trim()));
    if (!link) continue;
    const tags = [...x.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((c) => plain(c[1], 60)).filter(Boolean);
    const d = Date.parse(cdata(tag2(x, "pubDate")).trim());
    let image = "";
    const media = x.match(/<(?:media:content|enclosure)[^>]*\burl="([^"]+)"/i);
    if (media) image = https(unesc2(media[1]));
    if (!image) {
      const im = cdata(tag2(x, "content:encoded") + tag2(x, "description")).match(/<img[^>]+src="([^"]+)"/i);
      if (im) image = https(unesc2(im[1]));
    }
    out.push({ title: plain(tag2(x, "title"), 200), link, summary: plain(tag2(x, "description"), 320), tags, date: isNaN(d) ? 0 : d, image });
  }
  return out;
}
__name(parseFeed, "parseFeed");
async function news(req, env, ctx) {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...H2, "access-control-allow-methods": "GET" } });
  const cache3 = caches.default, key2 = new Request("https://news.cache/iracing");
  const url = new URL(req.url);
  if (url.searchParams.get("refresh") !== "1") {
    const hit = await cache3.match(key2);
    if (hit) return new Response(hit.body, { headers: H2 });
  }
  let items;
  try {
    const r4 = await fetch(FEED, { headers: { "user-agent": "PitlaneHQ-server" }, cf: { cacheTtl: 900 } });
    if (!r4.ok) throw new Error("iracing.com answered HTTP " + r4.status);
    items = parseFeed(await r4.text());
  } catch (e) {
    return new Response(JSON.stringify({ error: "could not read the iRacing news: " + (e && e.message) }), { status: 502, headers: H2 });
  }
  const body = JSON.stringify({ items });
  const put = cache3.put(key2, new Response(body, { headers: { ...H2, "cache-control": "max-age=1800" } }));
  if (ctx && ctx.waitUntil) ctx.waitUntil(put);
  else await put;
  return new Response(body, { headers: H2 });
}
__name(news, "news");

// src/laphealth.js
function traceHole(tr2) {
  if (!tr2 || !Array.isArray(tr2.d)) return true;
  if (tr2.h && typeof tr2.h === "object") return (+tr2.h.gap || 0) > 40 || (+tr2.h.seen || 0) < 0.9;
  return !(Array.isArray(tr2.incK) && tr2.incK.includes("off"));
}
__name(traceHole, "traceHole");

// src/worker.js
import VIEWER from "./08b98ecbb95c8d52a3cf408dc7ea49553569cdf3-viewer.html";

// src/live.js
import { DurableObject } from "cloudflare:workers";
var MAX_MSG = 512 * 1024;
var jerr = /* @__PURE__ */ __name((msg, status) => new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } }), "jerr");
async function live(req, env) {
  if (!env.LIVE) return jerr("live telemetry is not set up on this server", 404);
  if ((req.headers.get("upgrade") || "").toLowerCase() !== "websocket") return jerr("expected a WebSocket", 426);
  const url = new URL(req.url);
  const r0 = url.searchParams.get("role");
  const role = r0 === "pc" ? "pc" : r0 === "idle" ? "idle" : "view";
  const share = url.searchParams.get("share") || "";
  if (share && !/^[0-9a-f]{32}$/.test(share)) return jerr("bad share code", 400);
  const protos = (req.headers.get("sec-websocket-protocol") || "").split(",").map((x) => x.trim()).filter(Boolean);
  let auth = req.headers.get("authorization") || "";
  if (!auth && protos[0] === "pitlane" && protos[1]) auth = "Bearer " + protos[1];
  const acc = auth ? await sessionAccount(new Request(req.url, { headers: { authorization: auth } }), env) : null;
  if (!acc && (!share || role === "pc")) return jerr("sign in again", 401);
  const room = env.LIVE.get(env.LIVE.idFromName(share ? "share:" + share : acc.id));
  const h = new Headers(req.headers);
  h.set("x-live-role", role);
  h.set("x-live-proto", protos[0] === "pitlane" ? "pitlane" : "");
  h.delete("authorization");
  h.delete("sec-websocket-protocol");
  h.delete("x-live-nudge");
  return room.fetch(new Request(req.url, { headers: h }));
}
__name(live, "live");
var LiveRoom = class extends DurableObject {
  static {
    __name(this, "LiveRoom");
  }
  constructor(ctx, env) {
    super(ctx, env);
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
      } catch (e) {
      }
    }
  }
  // the PC needs to know whether anybody watches; the viewers (and the idle screens) whether the PC is there
  announce(except) {
    const pcs = this.socks("pc", except), views = this.socks("view", except);
    this.tell(pcs, { ctl: "viewers", n: views.length });
    this.tell([...views, ...this.socks("idle", except)], { ctl: "pc", on: pcs.length > 0 });
  }
  async fetch(req) {
    if (req.headers.get("x-live-nudge") === "sync") {
      this.tell([...this.socks("pc"), ...this.socks("view"), ...this.socks("idle")], { ctl: "sync", version: Number(req.headers.get("x-live-version") || 0) });
      return new Response(null, { status: 204 });
    }
    const r0 = req.headers.get("x-live-role"), role = r0 === "pc" ? "pc" : r0 === "idle" ? "idle" : "view";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (role === "pc") {
      for (const w of this.socks("pc")) {
        try {
          w.close(4e3, "replaced");
        } catch (e) {
        }
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
    if (!msg.startsWith("e:") || role === "idle") return;
    const to = this.socks(role === "pc" ? "view" : "pc");
    for (const w of to) {
      try {
        w.send(msg);
      } catch (e) {
      }
    }
  }
  async webSocketClose(ws, code) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1e3 : code, "bye");
    } catch (e) {
    }
    this.announce(ws);
  }
  async webSocketError(ws) {
    this.announce(ws);
  }
};

// src/seo-topics.js
var TOPICS = [
  {
    id: "coach",
    img: "coach.jpg",
    lmu: "lmu-coach",
    en: {
      path: "/iracing-coach",
      title: "iRacing coach that shows where you lose time \xB7 Pitlane HQ",
      desc: "A free iRacing driving coach. Pitlane HQ compares your lap with real faster laps and tells you which corners cost the most and what to change.",
      h1: "An iRacing coach that uses real laps",
      lead: "Pitlane HQ compares your lap with a faster lap driven by a real person on the same car and track, and tells you, corner by corner, where the time goes and what to change first.",
      secs: [
        ["The corners that cost the most", "Every corner of the lap is measured against the reference, where you brake, how fast you reach the apex and when you pick up the throttle. The coach lists the corners that lose the most time first."],
        ["A tip that follows the data", "Brake later or earlier, carry more speed to the apex, pick up the throttle sooner, take a different line or gear. Each tip comes from what your lap and the faster one really did."],
        ["Real references, not an ideal lap", "The reference is a real lap, the record of the car and track or the lap of the driver just ahead of your pace. Nothing is made up from pieces of different laps."],
        ["A plan for the next session", "What to work on first, the habits that repeat over the lap and the map with the corners marked."],
        ["Live on track", "The coach overlay shows the next corner's tip and braking point while you drive, and after the corner what it gave or took."]
      ],
      faq: [
        ["Is the iRacing coach free?", "Yes. The coach and the telemetry of Pitlane HQ are free."],
        ["Where does the faster lap come from?", "From the laps of Pitlane HQ drivers on the same car and track, the fastest lap and the next level above your pace."],
        ["Do I need to set anything up?", "No. Install Pitlane HQ Agent on the PC where you race, drive, and open Analysis \u2192 Coach."],
        ["Does the coach work in Le Mans Ultimate?", "Yes. It works the same in Le Mans Ultimate, whose support is in beta."]
      ]
    },
    es: {
      path: "/es/coach-iracing",
      title: "Coach para iRacing con vueltas reales \xB7 Pitlane HQ",
      desc: "Un coach de conducci\xF3n gratis para iRacing. Pitlane HQ compara tu vuelta con vueltas reales m\xE1s r\xE1pidas y te dice qu\xE9 curvas te cuestan m\xE1s y qu\xE9 cambiar.",
      h1: "Un coach de iRacing con vueltas reales",
      lead: "Pitlane HQ compara tu vuelta con una vuelta m\xE1s r\xE1pida de una persona real en el mismo coche y circuito, y te dice, curva a curva, d\xF3nde se va el tiempo y qu\xE9 cambiar primero.",
      secs: [
        ["Las curvas que m\xE1s te cuestan", "Cada curva de la vuelta se mide frente a la referencia, d\xF3nde frenas, a qu\xE9 velocidad llegas al v\xE9rtice y cu\xE1ndo vuelves a acelerar. El coach pone primero las curvas que m\xE1s tiempo pierden."],
        ["Un consejo que sigue a los datos", "Frenar m\xE1s tarde o antes, llevar m\xE1s velocidad al v\xE9rtice, acelerar antes, otra trazada u otra marcha. Cada consejo sale de lo que hicieron de verdad tu vuelta y la m\xE1s r\xE1pida."],
        ["Referencias reales, no una vuelta ideal", "La referencia es una vuelta real, el r\xE9cord del coche y circuito o la vuelta del piloto justo por encima de tu ritmo. Nada se inventa con trozos de vueltas distintas."],
        ["Un plan para la pr\xF3xima sesi\xF3n", "Qu\xE9 trabajar primero, los h\xE1bitos que se repiten en la vuelta y el mapa con las curvas marcadas."],
        ["En vivo en pista", "El overlay del coach muestra el consejo y el punto de frenada de la siguiente curva mientras conduces, y al salir lo que ganaste o perdiste."]
      ],
      faq: [
        ["\xBFEl coach de iRacing es gratis?", "S\xED. El coach y la telemetr\xEDa de Pitlane HQ son gratis."],
        ["\xBFDe d\xF3nde sale la vuelta m\xE1s r\xE1pida?", "De las vueltas de los pilotos de Pitlane HQ en el mismo coche y circuito, la m\xE1s r\xE1pida y el siguiente nivel por encima de tu ritmo."],
        ["\xBFHay que configurar algo?", "No. Instala Pitlane HQ Agent en el PC donde corres, conduce y abre An\xE1lisis \u2192 Coach."],
        ["\xBFEl coach funciona en Le Mans Ultimate?", "S\xED. Funciona igual en Le Mans Ultimate, cuyo soporte est\xE1 en beta."]
      ]
    },
    pt: {
      path: "/pt/coach-iracing",
      title: "Coach para iRacing com voltas reais \xB7 Pitlane HQ",
      desc: "Um coach de pilotagem gr\xE1tis para iRacing. O Pitlane HQ compara sua volta com voltas reais mais r\xE1pidas e diz quais curvas custam mais e o que mudar.",
      h1: "Um coach de iRacing com voltas reais",
      lead: "O Pitlane HQ compara sua volta com uma volta mais r\xE1pida de uma pessoa real no mesmo carro e pista, e diz, curva a curva, onde o tempo vai embora e o que mudar primeiro.",
      secs: [
        ["As curvas que mais custam", "Cada curva da volta \xE9 medida contra a refer\xEAncia, onde voc\xEA freia, com que velocidade chega ao \xE1pice e quando volta a acelerar. O coach mostra primeiro as curvas que mais perdem tempo."],
        ["Uma dica que segue os dados", "Frear mais tarde ou antes, levar mais velocidade ao \xE1pice, acelerar antes, outro tra\xE7ado ou outra marcha. Cada dica vem do que sua volta e a mais r\xE1pida realmente fizeram."],
        ["Refer\xEAncias reais, n\xE3o uma volta ideal", "A refer\xEAncia \xE9 uma volta real, o recorde do carro e pista ou a volta do piloto logo acima do seu ritmo. Nada \xE9 inventado com peda\xE7os de voltas diferentes."],
        ["Um plano para a pr\xF3xima sess\xE3o", "O que treinar primeiro, os h\xE1bitos que se repetem na volta e o mapa com as curvas marcadas."],
        ["Ao vivo na pista", "O overlay do coach mostra a dica e o ponto de frenagem da pr\xF3xima curva enquanto voc\xEA pilota, e na sa\xEDda o que voc\xEA ganhou ou perdeu."]
      ],
      faq: [
        ["O coach de iRacing \xE9 gr\xE1tis?", "Sim. O coach e a telemetria do Pitlane HQ s\xE3o gr\xE1tis."],
        ["De onde vem a volta mais r\xE1pida?", "Das voltas dos pilotos do Pitlane HQ no mesmo carro e pista, a mais r\xE1pida e o pr\xF3ximo n\xEDvel acima do seu ritmo."],
        ["Preciso configurar algo?", "N\xE3o. Instale o Pitlane HQ Agent no PC onde voc\xEA corre, pilote e abra An\xE1lise \u2192 Coach."],
        ["O coach funciona no Le Mans Ultimate?", "Sim. Funciona igual no Le Mans Ultimate, cujo suporte est\xE1 em beta."]
      ]
    }
  },
  {
    id: "compare",
    img: "compare.jpg",
    lmu: "lmu-compare",
    en: {
      path: "/iracing-lap-comparison",
      title: "Compare iRacing laps side by side \xB7 Pitlane HQ",
      desc: "Compare two iRacing laps for free. Speed, throttle, brake, gear, steering and the time gap along the lap, with the track map, sectors and braking points.",
      h1: "Compare two iRacing laps",
      lead: "Put any two laps side by side, two of yours, one from another session, the record of the car and track or a lap from the leaderboard. Pitlane HQ shows where one gains and the other loses, metre by metre.",
      secs: [
        ["The charts along the lap", "Speed, throttle, brake, gear and steering of both laps, and the time gap growing or shrinking, with the corners marked by their official turn numbers."],
        ["The track map", "Where lap A gains or loses against lap B, both laps' braking points, the incidents and the two racing lines."],
        ["Every corner at a glance", "Each corner as a small bar with the time it gives or takes. Press one and the charts and the map go to it."],
        ["Laps from anyone", "Compare with the record of the car and track or with the driver just ahead of your pace, taken from real laps."],
        ["Away from the PC", "Your laps are in your account, so you compare them at pitlanehq.app or in the Android app as well."]
      ],
      faq: [
        ["Can I compare my lap with someone else's?", "Yes, with any lap on the Pitlane HQ leaderboards for the same car and track."],
        ["Can I see it without the PC?", "Yes. Your laps are in your account, so open them at pitlanehq.app or in the Android app."],
        ["Can I compare Le Mans Ultimate laps?", "Yes. Lap comparison works the same in Le Mans Ultimate, in beta."],
        ["Is it free?", "Yes."]
      ]
    },
    es: {
      path: "/es/comparar-vueltas-iracing",
      title: "Comparar vueltas de iRacing una junto a otra \xB7 Pitlane HQ",
      desc: "Compara gratis dos vueltas de iRacing. Velocidad, acelerador, freno, marcha, volante y la diferencia de tiempo, con el mapa, los sectores y las frenadas.",
      h1: "Compara dos vueltas de iRacing",
      lead: "Pon dos vueltas una al lado de la otra, dos tuyas, una de otra sesi\xF3n, el r\xE9cord del coche y circuito o una vuelta de la clasificaci\xF3n. Pitlane HQ te ense\xF1a d\xF3nde gana una y pierde la otra, metro a metro.",
      secs: [
        ["Las gr\xE1ficas a lo largo de la vuelta", "Velocidad, acelerador, freno, marcha y volante de las dos vueltas, y la diferencia de tiempo creciendo o bajando, con las curvas marcadas por su n\xFAmero oficial."],
        ["El mapa del circuito", "D\xF3nde la vuelta A gana o pierde frente a la B, las frenadas de las dos, los incidentes y las dos trazadas."],
        ["Cada curva de un vistazo", "Cada curva como una barra peque\xF1a con el tiempo que da o quita. P\xFAlsala y las gr\xE1ficas y el mapa van a ella."],
        ["Vueltas de cualquiera", "Comp\xE1rate con el r\xE9cord del coche y circuito o con el piloto justo por encima de tu ritmo, con vueltas reales."],
        ["Lejos del PC", "Tus vueltas est\xE1n en tu cuenta, as\xED que tambi\xE9n las comparas en pitlanehq.app o en la app de Android."]
      ],
      faq: [
        ["\xBFPuedo comparar mi vuelta con la de otro?", "S\xED, con cualquier vuelta de las clasificaciones de Pitlane HQ del mismo coche y circuito."],
        ["\xBFPuedo verlo sin el PC?", "S\xED. Tus vueltas est\xE1n en tu cuenta, as\xED que \xE1brelas en pitlanehq.app o en la app de Android."],
        ["\xBFPuedo comparar vueltas de Le Mans Ultimate?", "S\xED. La comparaci\xF3n funciona igual en Le Mans Ultimate, en beta."],
        ["\xBFEs gratis?", "S\xED."]
      ]
    },
    pt: {
      path: "/pt/comparar-voltas-iracing",
      title: "Comparar voltas do iRacing lado a lado \xB7 Pitlane HQ",
      desc: "Compare gr\xE1tis duas voltas do iRacing. Velocidade, acelerador, freio, marcha, volante e a diferen\xE7a de tempo, com o mapa, os setores e as frenagens.",
      h1: "Compare duas voltas do iRacing",
      lead: "Coloque duas voltas lado a lado, duas suas, uma de outra sess\xE3o, o recorde do carro e pista ou uma volta da classifica\xE7\xE3o. O Pitlane HQ mostra onde uma ganha e a outra perde, metro a metro.",
      secs: [
        ["Os gr\xE1ficos ao longo da volta", "Velocidade, acelerador, freio, marcha e volante das duas voltas, e a diferen\xE7a de tempo crescendo ou diminuindo, com as curvas marcadas pelo n\xFAmero oficial."],
        ["O mapa da pista", "Onde a volta A ganha ou perde contra a B, as frenagens das duas, os incidentes e os dois tra\xE7ados."],
        ["Cada curva num relance", "Cada curva como uma barra pequena com o tempo que d\xE1 ou tira. Toque nela e os gr\xE1ficos e o mapa v\xE3o at\xE9 ela."],
        ["Voltas de qualquer um", "Compare com o recorde do carro e pista ou com o piloto logo acima do seu ritmo, com voltas reais."],
        ["Longe do PC", "Suas voltas est\xE3o na sua conta, ent\xE3o voc\xEA tamb\xE9m as compara em pitlanehq.app ou no app Android."]
      ],
      faq: [
        ["Posso comparar minha volta com a de outro?", "Sim, com qualquer volta das classifica\xE7\xF5es do Pitlane HQ no mesmo carro e pista."],
        ["Posso ver sem o PC?", "Sim. Suas voltas est\xE3o na sua conta, ent\xE3o abra em pitlanehq.app ou no app Android."],
        ["Posso comparar voltas do Le Mans Ultimate?", "Sim. A compara\xE7\xE3o funciona igual no Le Mans Ultimate, em beta."],
        ["\xC9 gr\xE1tis?", "Sim."]
      ]
    }
  },
  {
    id: "braking",
    lmu: "lmu-braking",
    en: {
      path: "/iracing-braking-points",
      title: "iRacing braking points and braking markers \xB7 Pitlane HQ",
      desc: "Find your braking points in iRacing. Pitlane HQ shows where you brake against a faster lap, on the map, in the charts and live on track with markers.",
      h1: "Braking points for iRacing",
      lead: "Most lap time is won or lost under braking. Pitlane HQ shows where you brake, how hard and how long, next to a faster lap of the same car, and marks the points on track while you drive.",
      secs: [
        ["Where you brake against a faster lap", "Both laps' braking points on the track map, with the speed before the corner and the lowest speed in it."],
        ["How you brake", "The brake trace of both laps, hard at once or building up, trail braking into the corner, and when you release."],
        ["Braking markers on track", "An overlay marks the next braking point while you drive, taken from the next level above your best lap, and moves with your speed and the car close ahead."],
        ["What the fast drivers do", "Under each corner, the range of braking points and apex speeds of the fastest drivers there, from their real laps."],
        ["Named by the official turns", "T1, T2, T7 and so on, the same numbers as the track's official turns."]
      ],
      faq: [
        ["Where do the braking points come from?", "From real laps of the same car and track, the next level above your pace, or your own best lap while there is none."],
        ["Do the markers work in VR?", "Yes. The overlays also show in the headset through SteamVR."],
        ["Do they work in Le Mans Ultimate?", "Yes. The braking markers and the coach work in Le Mans Ultimate too, in beta."],
        ["Is it free?", "Yes."]
      ]
    },
    es: {
      path: "/es/puntos-de-frenada-iracing",
      title: "Puntos de frenada en iRacing y marcas en pista \xB7 Pitlane HQ",
      desc: "Tus puntos de frenada en iRacing. Pitlane HQ muestra d\xF3nde frenas frente a una vuelta m\xE1s r\xE1pida, en el mapa, en las gr\xE1ficas y en pista con marcas.",
      h1: "Puntos de frenada para iRacing",
      lead: "La mayor parte del tiempo se gana o se pierde frenando. Pitlane HQ muestra d\xF3nde frenas, cu\xE1nto y durante cu\xE1nto, junto a una vuelta m\xE1s r\xE1pida del mismo coche, y marca los puntos en pista mientras conduces.",
      secs: [
        ["D\xF3nde frenas frente a una vuelta m\xE1s r\xE1pida", "Las frenadas de las dos vueltas en el mapa, con la velocidad antes de la curva y la m\xEDnima dentro de ella."],
        ["C\xF3mo frenas", "La traza del freno de las dos vueltas, fuerte de golpe o progresivo, trail braking hacia la curva y cu\xE1ndo sueltas."],
        ["Marcas de frenada en pista", "Un overlay marca el siguiente punto de frenada mientras conduces, sacado del siguiente nivel por encima de tu mejor vuelta, y se mueve con tu velocidad y con el coche que llevas delante."],
        ["Lo que hacen los r\xE1pidos", "Bajo cada curva, entre qu\xE9 metros frenan y a qu\xE9 velocidad pasan el v\xE9rtice los pilotos m\xE1s r\xE1pidos de all\xED, con sus vueltas reales."],
        ["Con las curvas oficiales", "T1, T2, T7 y las dem\xE1s, los mismos n\xFAmeros que las curvas oficiales del circuito."]
      ],
      faq: [
        ["\xBFDe d\xF3nde salen los puntos de frenada?", "De vueltas reales del mismo coche y circuito, el siguiente nivel por encima de tu ritmo, o tu propia mejor vuelta mientras no lo haya."],
        ["\xBFLas marcas funcionan en VR?", "S\xED. Los overlays tambi\xE9n se ven en las gafas a trav\xE9s de SteamVR."],
        ["\xBFFuncionan en Le Mans Ultimate?", "S\xED. Las marcas de frenada y el coach tambi\xE9n funcionan en Le Mans Ultimate, en beta."],
        ["\xBFEs gratis?", "S\xED."]
      ]
    },
    pt: {
      path: "/pt/pontos-de-frenagem-iracing",
      title: "Pontos de frenagem no iRacing e marcas na pista \xB7 Pitlane HQ",
      desc: "Seus pontos de frenagem no iRacing. O Pitlane HQ mostra onde voc\xEA freia contra uma volta mais r\xE1pida, no mapa, nos gr\xE1ficos e na pista com marcas.",
      h1: "Pontos de frenagem para iRacing",
      lead: "A maior parte do tempo se ganha ou se perde na frenagem. O Pitlane HQ mostra onde voc\xEA freia, quanto e por quanto tempo, ao lado de uma volta mais r\xE1pida do mesmo carro, e marca os pontos na pista enquanto voc\xEA pilota.",
      secs: [
        ["Onde voc\xEA freia contra uma volta mais r\xE1pida", "As frenagens das duas voltas no mapa, com a velocidade antes da curva e a m\xEDnima dentro dela."],
        ["Como voc\xEA freia", "O tra\xE7o do freio das duas voltas, forte de uma vez ou progressivo, trail braking para a curva e quando voc\xEA solta."],
        ["Marcas de frenagem na pista", "Um overlay marca o pr\xF3ximo ponto de frenagem enquanto voc\xEA pilota, tirado do pr\xF3ximo n\xEDvel acima da sua melhor volta, e se move com a sua velocidade e o carro \xE0 frente."],
        ["O que os r\xE1pidos fazem", "Embaixo de cada curva, entre quais metros freiam e com que velocidade passam o \xE1pice os pilotos mais r\xE1pidos dali, com suas voltas reais."],
        ["Com as curvas oficiais", "T1, T2, T7 e as outras, os mesmos n\xFAmeros das curvas oficiais da pista."]
      ],
      faq: [
        ["De onde v\xEAm os pontos de frenagem?", "De voltas reais do mesmo carro e pista, o pr\xF3ximo n\xEDvel acima do seu ritmo, ou a sua melhor volta enquanto n\xE3o houver."],
        ["As marcas funcionam em VR?", "Sim. Os overlays tamb\xE9m aparecem nos \xF3culos pelo SteamVR."],
        ["Funcionam no Le Mans Ultimate?", "Sim. As marcas de frenagem e o coach tamb\xE9m funcionam no Le Mans Ultimate, em beta."],
        ["\xC9 gr\xE1tis?", "Sim."]
      ]
    }
  },
  {
    id: "line",
    lmu: "lmu-coach",
    en: {
      path: "/iracing-racing-line",
      title: "iRacing racing line next to a faster lap \xB7 Pitlane HQ",
      desc: "Your iRacing racing line next to a faster lap. Pitlane HQ draws both on the map and says where you were inside or outside at turn-in, apex and exit.",
      h1: "Your racing line in iRacing",
      lead: "Two laps with the same braking point can still be seconds apart because of the line. Pitlane HQ draws your line next to a faster one and measures how far to one side you were, every 5 metres.",
      secs: [
        ["Both lines on the map", "The faster lap's line dashed along the middle of the road and yours beside it, so the difference is plain to see."],
        ["Inside or outside", "At the turn-in, the apex and the exit of each corner, the coach says when you were 1.5 metres or more off the faster line."],
        ["The Line chart", "How far you were to the left or right of the other lap along the whole lap, next to the speed and the inputs."],
        ["From real laps", "The line comes from the laps' own path. When the reference has none, the fastest lap of the car and track with a path gives it."]
      ],
      faq: [
        ["Does iRacing give the position on track?", "Yes. Pitlane HQ takes the car's position from the game, and works it out from speed and heading when there is none, so both lines can be compared."],
        ["Does it work in Le Mans Ultimate?", "Yes. Le Mans Ultimate gives the car's position too, so your line is drawn from it."],
        ["Is it free?", "Yes."]
      ]
    },
    es: {
      path: "/es/trazada-iracing",
      title: "Trazada en iRacing frente a una vuelta r\xE1pida \xB7 Pitlane HQ",
      desc: "Tu trazada en iRacing junto a una vuelta m\xE1s r\xE1pida. Pitlane HQ dibuja las dos en el mapa y dice si ibas por dentro o por fuera en cada curva.",
      h1: "Tu trazada en iRacing",
      lead: "Dos vueltas con el mismo punto de frenada pueden estar a segundos por la trazada. Pitlane HQ dibuja tu l\xEDnea junto a una m\xE1s r\xE1pida y mide cu\xE1nto ibas hacia un lado, cada 5 metros.",
      secs: [
        ["Las dos l\xEDneas en el mapa", "La l\xEDnea de la vuelta m\xE1s r\xE1pida discontinua por el centro de la pista y la tuya a su lado, para ver la diferencia de un vistazo."],
        ["Por dentro o por fuera", "En la entrada, el v\xE9rtice y la salida de cada curva, el coach te dice cu\xE1ndo ibas a 1,5 metros o m\xE1s de la l\xEDnea r\xE1pida."],
        ["La gr\xE1fica de l\xEDnea", "Cu\xE1nto ibas a la izquierda o a la derecha de la otra vuelta durante toda la vuelta, junto a la velocidad y los pedales."],
        ["Con vueltas reales", "La l\xEDnea sale del recorrido de las propias vueltas. Si la referencia no lo tiene, lo da la vuelta m\xE1s r\xE1pida del coche y circuito que s\xED lo tenga."]
      ],
      faq: [
        ["\xBFiRacing da la posici\xF3n en pista?", "S\xED. Pitlane HQ toma la posici\xF3n del coche del juego, y la calcula con la velocidad y la direcci\xF3n cuando no la hay, as\xED que las dos l\xEDneas se pueden comparar."],
        ["\xBFFunciona en Le Mans Ultimate?", "S\xED. Le Mans Ultimate tambi\xE9n da la posici\xF3n del coche, y tu l\xEDnea se dibuja con ella."],
        ["\xBFEs gratis?", "S\xED."]
      ]
    },
    pt: {
      path: "/pt/tracado-iracing",
      title: "Tra\xE7ado no iRacing contra uma volta r\xE1pida \xB7 Pitlane HQ",
      desc: "Seu tra\xE7ado no iRacing ao lado de uma volta mais r\xE1pida. O Pitlane HQ desenha os dois no mapa e diz se voc\xEA estava por dentro ou por fora em cada curva.",
      h1: "Seu tra\xE7ado no iRacing",
      lead: "Duas voltas com o mesmo ponto de frenagem podem estar a segundos por causa do tra\xE7ado. O Pitlane HQ desenha sua linha ao lado de uma mais r\xE1pida e mede o quanto voc\xEA estava para um lado, a cada 5 metros.",
      secs: [
        ["As duas linhas no mapa", "A linha da volta mais r\xE1pida tracejada pelo meio da pista e a sua ao lado, para ver a diferen\xE7a de relance."],
        ["Por dentro ou por fora", "Na entrada, no \xE1pice e na sa\xEDda de cada curva, o coach diz quando voc\xEA estava a 1,5 metro ou mais da linha r\xE1pida."],
        ["O gr\xE1fico de linha", "O quanto voc\xEA estava \xE0 esquerda ou \xE0 direita da outra volta ao longo de toda a volta, ao lado da velocidade e dos pedais."],
        ["Com voltas reais", "A linha vem do percurso das pr\xF3prias voltas. Se a refer\xEAncia n\xE3o tiver, a volta mais r\xE1pida do carro e pista que tiver d\xE1 a linha."]
      ],
      faq: [
        ["O iRacing d\xE1 a posi\xE7\xE3o na pista?", "Sim. O Pitlane HQ pega a posi\xE7\xE3o do carro do jogo, e calcula com a velocidade e a dire\xE7\xE3o quando n\xE3o h\xE1, ent\xE3o as duas linhas podem ser comparadas."],
        ["Funciona no Le Mans Ultimate?", "Sim. O Le Mans Ultimate tamb\xE9m d\xE1 a posi\xE7\xE3o do carro, e sua linha \xE9 desenhada com ela."],
        ["\xC9 gr\xE1tis?", "Sim."]
      ]
    }
  },
  {
    id: "irating",
    img: "race.jpg",
    en: {
      path: "/iracing-irating-tracker",
      title: "iRacing iRating and licence tracker \xB7 Pitlane HQ",
      desc: "Your iRacing iRating and licence in oval, sports car, formula, dirt oval and dirt road, with the change of your last races. Free with Pitlane HQ.",
      h1: "Your iRating and licence in every discipline",
      lead: "iRacing gives you one iRating and one licence per discipline. Pitlane HQ keeps each of them, updated every time you join a session, with what your last races gave or took.",
      secs: [
        ["Five disciplines, five cards", "Oval, sports car, formula, dirt oval and dirt road, each with its iRating, its licence and safety rating as the game shows them."],
        ["What your races did", "The iRating change of your last races of each discipline, and after every race its estimate, replaced by the real change at your next session."],
        ["Race summaries", "Your result, positions gained or lost, incidents and laps of every race, next to the drivers around you."],
        ["Races against the AI apart", "Races against iRacing's AI never touch your iRating, so they show none."]
      ],
      faq: [
        ["Do I need to sign in to iRacing?", "No. Pitlane HQ Agent reads what the game shows while it runs next to iRacing."],
        ["Why is my iRating split by discipline?", "Because iRacing keeps one per discipline. Pitlane HQ never mixes them into one number."],
        ["Is it free?", "Yes."]
      ]
    },
    es: {
      path: "/es/irating-iracing",
      title: "iRating y licencia de iRacing por disciplina \xB7 Pitlane HQ",
      desc: "Tu iRating y licencia de iRacing en \xF3valo, sports car, f\xF3rmula, \xF3valo de tierra y tierra, con el cambio de tus \xFAltimas carreras. Gratis con Pitlane HQ.",
      h1: "Tu iRating y licencia en cada disciplina",
      lead: "iRacing te da un iRating y una licencia por disciplina. Pitlane HQ guarda cada uno, al d\xEDa cada vez que entras en una sesi\xF3n, con lo que te dieron o quitaron tus \xFAltimas carreras.",
      secs: [
        ["Cinco disciplinas, cinco tarjetas", "\xD3valo, sports car, f\xF3rmula, \xF3valo de tierra y tierra, cada una con su iRating, su licencia y su safety rating como los muestra el juego."],
        ["Lo que hicieron tus carreras", "El cambio de iRating de tus \xFAltimas carreras de cada disciplina, y tras cada carrera su estimaci\xF3n, que se cambia por la real en tu siguiente sesi\xF3n."],
        ["Res\xFAmenes de carrera", "Tu resultado, las posiciones ganadas o perdidas, los incidentes y las vueltas de cada carrera, junto a los pilotos de tu alrededor."],
        ["Las carreras contra la IA aparte", "Las carreras contra la IA de iRacing no tocan tu iRating, as\xED que no muestran ninguno."]
      ],
      faq: [
        ["\xBFTengo que iniciar sesi\xF3n en iRacing?", "No. Pitlane HQ Agent lee lo que muestra el juego mientras est\xE1 abierto junto a iRacing."],
        ["\xBFPor qu\xE9 mi iRating va por disciplina?", "Porque iRacing guarda uno por disciplina. Pitlane HQ nunca los mezcla en un solo n\xFAmero."],
        ["\xBFEs gratis?", "S\xED."]
      ]
    },
    pt: {
      path: "/pt/irating-iracing",
      title: "iRating e licen\xE7a do iRacing por disciplina \xB7 Pitlane HQ",
      desc: "Seu iRating e licen\xE7a do iRacing em oval, sports car, f\xF3rmula, oval de terra e terra, com a varia\xE7\xE3o das \xFAltimas corridas. Gr\xE1tis com o Pitlane HQ.",
      h1: "Seu iRating e licen\xE7a em cada disciplina",
      lead: "O iRacing d\xE1 um iRating e uma licen\xE7a por disciplina. O Pitlane HQ guarda cada um, atualizado sempre que voc\xEA entra numa sess\xE3o, com o que suas \xFAltimas corridas deram ou tiraram.",
      secs: [
        ["Cinco disciplinas, cinco cart\xF5es", "Oval, sports car, f\xF3rmula, oval de terra e terra, cada uma com seu iRating, sua licen\xE7a e seu safety rating como o jogo mostra."],
        ["O que suas corridas fizeram", "A varia\xE7\xE3o de iRating das suas \xFAltimas corridas de cada disciplina, e depois de cada corrida a estimativa, trocada pela real na sua pr\xF3xima sess\xE3o."],
        ["Resumos de corrida", "Seu resultado, posi\xE7\xF5es ganhas ou perdidas, incidentes e voltas de cada corrida, ao lado dos pilotos ao seu redor."],
        ["Corridas contra a IA \xE0 parte", "Corridas contra a IA do iRacing n\xE3o mexem no seu iRating, ent\xE3o n\xE3o mostram nenhum."]
      ],
      faq: [
        ["Preciso entrar no iRacing?", "N\xE3o. O Pitlane HQ Agent l\xEA o que o jogo mostra enquanto roda ao lado do iRacing."],
        ["Por que meu iRating \xE9 por disciplina?", "Porque o iRacing guarda um por disciplina. O Pitlane HQ nunca os mistura num s\xF3 n\xFAmero."],
        ["\xC9 gr\xE1tis?", "Sim."]
      ]
    }
  },
  {
    id: "shift",
    lmu: "tel",
    en: {
      path: "/iracing-shift-beep",
      title: "iRacing shift beep at the RPM you choose \xB7 Pitlane HQ",
      desc: "A shift beep for iRacing and Le Mans Ultimate. Pitlane HQ beeps at the revs you choose for each car, one RPM for every gear, one per gear or the shift lights.",
      h1: "A shift beep for iRacing",
      lead: "Keep your eyes on the track. Pitlane HQ beeps when it is time to change up, at the revs you choose for each car, a moment early to make up for your reaction time.",
      secs: [
        ["Your RPM, per car", "The same RPM for every gear or one for each gear, kept for each car."],
        ["Or the best estimate", "From your own flat-out laps Pitlane HQ works out where the next gear would pull harder, gear by gear."],
        ["Or iRacing's shift lights", "The beep at the RPM the game's shift lights use."],
        ["Early, pitch and volume", "How early it sounds, a low, middle or high beep and its volume, in Telemetry \u2192 Rev beep."]
      ],
      faq: [
        ["Where does it sound?", "On the PC where Pitlane HQ runs, or in the screen where you turn it on."],
        ["Does it work in Le Mans Ultimate?", "Yes, with your own RPM or the estimate from your laps."],
        ["Is it free?", "Yes."]
      ]
    },
    es: {
      path: "/es/pitido-cambio-marcha-iracing",
      title: "Pitido de cambio de marcha para iRacing \xB7 Pitlane HQ",
      desc: "Un pitido de cambio para iRacing y Le Mans Ultimate. Pitlane HQ pita a las RPM que elijas en cada coche, para todas las marchas o una por marcha.",
      h1: "Un pitido de cambio de marcha para iRacing",
      lead: "Los ojos en la pista. Pitlane HQ pita cuando toca subir de marcha, a las revoluciones que elijas para cada coche, un instante antes para compensar tu tiempo de reacci\xF3n.",
      secs: [
        ["Tus RPM, por coche", "Las mismas RPM en todas las marchas o unas para cada marcha, guardadas para cada coche."],
        ["O el \xF3ptimo estimado", "Con tus propias vueltas a fondo Pitlane HQ calcula d\xF3nde la siguiente marcha tirar\xEDa m\xE1s, marcha a marcha."],
        ["O las luces de cambio de iRacing", "El pitido a las RPM de las luces de cambio del juego."],
        ["Adelanto, tono y volumen", "Cu\xE1nto antes suena, un pitido grave, medio o agudo y su volumen, en Telemetr\xEDa \u2192 Pitido de revoluciones."]
      ],
      faq: [
        ["\xBFD\xF3nde suena?", "En el PC donde corre Pitlane HQ, o en la pantalla donde lo actives."],
        ["\xBFFunciona en Le Mans Ultimate?", "S\xED, con tus propias RPM o con el \xF3ptimo estimado de tus vueltas."],
        ["\xBFEs gratis?", "S\xED."]
      ]
    },
    pt: {
      path: "/pt/bipe-troca-de-marcha-iracing",
      title: "Bipe de troca de marcha para iRacing \xB7 Pitlane HQ",
      desc: "Um bipe de troca para iRacing e Le Mans Ultimate. O Pitlane HQ apita no RPM que voc\xEA escolher em cada carro, para todas as marchas ou um por marcha.",
      h1: "Um bipe de troca de marcha para iRacing",
      lead: "Olhos na pista. O Pitlane HQ apita quando \xE9 hora de subir de marcha, nos giros que voc\xEA escolher para cada carro, um instante antes para compensar o seu tempo de rea\xE7\xE3o.",
      secs: [
        ["Seu RPM, por carro", "O mesmo RPM em todas as marchas ou um para cada marcha, guardado para cada carro."],
        ["Ou o \xF3timo estimado", "Com as suas voltas de p\xE9 embaixo o Pitlane HQ calcula onde a pr\xF3xima marcha puxaria mais, marcha a marcha."],
        ["Ou as luzes de troca do iRacing", "O bipe no RPM das luzes de troca do jogo."],
        ["Antecipa\xE7\xE3o, tom e volume", "Quanto antes toca, um bipe grave, m\xE9dio ou agudo e o volume, em Telemetria \u2192 Bipe de giros."]
      ],
      faq: [
        ["Onde toca?", "No PC onde o Pitlane HQ roda, ou na tela onde voc\xEA o ativar."],
        ["Funciona no Le Mans Ultimate?", "Sim, com o seu pr\xF3prio RPM ou com o \xF3timo estimado das suas voltas."],
        ["\xC9 gr\xE1tis?", "Sim."]
      ]
    }
  },
  {
    id: "phone",
    phones: ["m-live.png", "m-race.png", "m-analysis-0.png"],
    lmu: "tel",
    en: {
      path: "/iracing-telemetry-on-phone",
      title: "iRacing telemetry live on your phone or tablet \xB7 Pitlane HQ",
      desc: "Your iRacing and Le Mans Ultimate telemetry live on a phone, tablet or browser. Position, delta, fuel, the relative and the map, free on Android and the web.",
      h1: "Your iRacing telemetry on the phone",
      lead: "Put the phone or a tablet next to the wheel and see your race live, position, delta, last lap, fuel, the relative and the map. It works over Wi-Fi or mobile data, from anywhere.",
      secs: [
        ["Same account, nothing to pair", "Sign in on the phone with the same Pitlane HQ account as your PC and press Connect. The PC asks you to accept the phone, by its name."],
        ["A friend can watch", "Make a share code on the PC and a friend watches your telemetry from anywhere. They only watch."],
        ["Your laps afterwards", "Every lap goes to your account. Analyse it on the phone, compare it and read your race summaries."],
        ["On Android and in any browser", "The Android app, or pitlanehq.app in any browser. The iPhone app is coming to the App Store, and until then the web works on the iPhone."],
        ["Le Mans Ultimate too", "The live view works the same with Le Mans Ultimate, in beta."]
      ],
      faq: [
        ["Does the phone need to be on the same Wi-Fi?", "No. It works from anywhere, over Wi-Fi or mobile data."],
        ["Is there an iPhone app?", "It is coming to the App Store. On the iPhone, pitlanehq.app works in the browser and can be added to the home screen."],
        ["Is it free?", "Yes."]
      ]
    },
    es: {
      path: "/es/telemetria-iracing-en-el-movil",
      title: "Telemetr\xEDa de iRacing en vivo en el m\xF3vil \xB7 Pitlane HQ",
      desc: "Tu telemetr\xEDa de iRacing y Le Mans Ultimate en vivo en el m\xF3vil, la tablet o el navegador. Posici\xF3n, delta, combustible, el relative y el mapa, gratis.",
      h1: "Tu telemetr\xEDa de iRacing en el m\xF3vil",
      lead: "Pon el m\xF3vil o una tablet junto al volante y sigue tu carrera en vivo, posici\xF3n, delta, \xFAltima vuelta, combustible, el relative y el mapa. Funciona con Wi-Fi o datos, desde cualquier sitio.",
      secs: [
        ["La misma cuenta, nada que emparejar", "Entra en el m\xF3vil con la misma cuenta de Pitlane HQ que en tu PC y pulsa Conectar. El PC te pide aceptar el m\xF3vil, por su nombre."],
        ["Un amigo puede verla", "Crea un c\xF3digo en el PC y un amigo ve tu telemetr\xEDa desde cualquier sitio. Solo mira."],
        ["Tus vueltas, despu\xE9s", "Cada vuelta va a tu cuenta. Anal\xEDzala en el m\xF3vil, comp\xE1rala y lee tus res\xFAmenes de carrera."],
        ["En Android y en cualquier navegador", "La app de Android, o pitlanehq.app en cualquier navegador. La app de iPhone llegar\xE1 a la App Store, y mientras tanto la web funciona en el iPhone."],
        ["Tambi\xE9n en Le Mans Ultimate", "La vista en vivo funciona igual con Le Mans Ultimate, en beta."]
      ],
      faq: [
        ["\xBFEl m\xF3vil tiene que estar en el mismo Wi-Fi?", "No. Funciona desde cualquier sitio, con Wi-Fi o datos."],
        ["\xBFHay app para iPhone?", "Llegar\xE1 a la App Store. En el iPhone, pitlanehq.app funciona en el navegador y se puede a\xF1adir a la pantalla de inicio."],
        ["\xBFEs gratis?", "S\xED."]
      ]
    },
    pt: {
      path: "/pt/telemetria-iracing-no-celular",
      title: "Telemetria do iRacing ao vivo no celular \xB7 Pitlane HQ",
      desc: "Sua telemetria do iRacing e do Le Mans Ultimate ao vivo no celular, tablet ou navegador. Posi\xE7\xE3o, delta, combust\xEDvel e o mapa, gr\xE1tis no Android e na web.",
      h1: "Sua telemetria do iRacing no celular",
      lead: "Coloque o celular ou um tablet ao lado do volante e acompanhe sua corrida ao vivo, posi\xE7\xE3o, delta, \xFAltima volta, combust\xEDvel, o relative e o mapa. Funciona com Wi-Fi ou dados, de qualquer lugar.",
      secs: [
        ["A mesma conta, nada para parear", "Entre no celular com a mesma conta do Pitlane HQ do seu PC e toque em Conectar. O PC pede para aceitar o celular, pelo nome."],
        ["Um amigo pode assistir", "Crie um c\xF3digo no PC e um amigo v\xEA sua telemetria de qualquer lugar. S\xF3 assiste."],
        ["Suas voltas, depois", "Cada volta vai para a sua conta. Analise no celular, compare e leia seus resumos de corrida."],
        ["No Android e em qualquer navegador", "O app Android, ou pitlanehq.app em qualquer navegador. O app de iPhone vai chegar \xE0 App Store, e at\xE9 l\xE1 a web funciona no iPhone."],
        ["Tamb\xE9m no Le Mans Ultimate", "A vis\xE3o ao vivo funciona igual com o Le Mans Ultimate, em beta."]
      ],
      faq: [
        ["O celular precisa estar no mesmo Wi-Fi?", "N\xE3o. Funciona de qualquer lugar, com Wi-Fi ou dados."],
        ["Tem app para iPhone?", "Vai chegar \xE0 App Store. No iPhone, pitlanehq.app funciona no navegador e pode ser adicionado \xE0 tela inicial."],
        ["\xC9 gr\xE1tis?", "Sim."]
      ]
    }
  },
  {
    id: "free",
    img: "laps.jpg",
    lmu: "tel",
    en: {
      path: "/free-iracing-telemetry",
      title: "Free iRacing and Le Mans Ultimate telemetry \xB7 Pitlane HQ",
      desc: "Free sim racing telemetry for iRacing and Le Mans Ultimate. Lap analysis, a coach with real laps, leaderboards, overlays and live telemetry on your phone.",
      h1: "Free telemetry for iRacing and Le Mans Ultimate",
      lead: "Pitlane HQ puts in one free app what usually takes several. Lap telemetry and analysis, a coach that compares you with real faster laps, overlays on top of the game, leaderboards and your race summaries.",
      secs: [
        ["Telemetry and analysis", "Every lap recorded with nothing to set up, two laps compared on charts and on the map, the sectors and the braking points."],
        ["A coach", "The corners that cost the most against the record or the driver just ahead of your pace, with what to change."],
        ["Overlays", "Relative, standings, radar, delta bar, fuel, tyres, track map, braking markers and more, also in VR."],
        ["Everywhere", "Windows for driving, and the web and Android to look at your laps and follow your race live."],
        ["What is free", "During the beta everything is free. The telemetry, the coach, the leaderboards, the basic overlays and the phone app stay free after it."],
        ["Free Le Mans Ultimate telemetry", "The same app records Le Mans Ultimate, in beta, with nothing to install in the game."]
      ],
      faq: [
        ["Is it really free?", "Yes. The PC app, the web and the Android app are free."],
        ["Looking for a free alternative to RaceLab, Garage 61, Track Titan or VRS?", "Pitlane HQ brings overlays, lap telemetry with comparisons and a coach with reference laps from its own leaderboards together in one free app."],
        ["Which sims?", "iRacing and Le Mans Ultimate (in beta). ACC and Assetto Corsa are in development."]
      ]
    },
    es: {
      path: "/es/telemetria-iracing-gratis",
      title: "Telemetr\xEDa gratis para iRacing y Le Mans Ultimate \xB7 Pitlane HQ",
      desc: "Telemetr\xEDa gratis para iRacing y Le Mans Ultimate. An\xE1lisis de vueltas, un coach con vueltas reales, clasificaciones, overlays y telemetr\xEDa en el m\xF3vil.",
      h1: "Telemetr\xEDa gratis para iRacing y Le Mans Ultimate",
      lead: "Pitlane HQ re\xFAne en una app gratis lo que suele necesitar varias. Telemetr\xEDa y an\xE1lisis de vueltas, un coach que te compara con vueltas reales m\xE1s r\xE1pidas, overlays sobre el juego, clasificaciones y tus res\xFAmenes de carrera.",
      secs: [
        ["Telemetr\xEDa y an\xE1lisis", "Cada vuelta grabada sin configurar nada, dos vueltas comparadas en gr\xE1ficas y en el mapa, los sectores y las frenadas."],
        ["Un coach", "Las curvas que m\xE1s te cuestan frente al r\xE9cord o al piloto justo por encima de tu ritmo, con qu\xE9 cambiar."],
        ["Overlays", "Relative, clasificaci\xF3n, radar, barra de delta, combustible, neum\xE1ticos, mapa, marcas de frenada y m\xE1s, tambi\xE9n en VR."],
        ["En todas partes", "Windows para conducir, y la web y Android para ver tus vueltas y seguir tu carrera en vivo."],
        ["Qu\xE9 es gratis", "Durante la beta todo es gratis. La telemetr\xEDa, el coach, las clasificaciones, los overlays b\xE1sicos y la app del m\xF3vil siguen gratis despu\xE9s."],
        ["Telemetr\xEDa gratis para Le Mans Ultimate", "La misma app graba Le Mans Ultimate, en beta, sin instalar nada en el juego."]
      ],
      faq: [
        ["\xBFDe verdad es gratis?", "S\xED. La app del PC, la web y la app de Android son gratis."],
        ["\xBFBuscas una alternativa gratis a RaceLab, Garage 61, Track Titan o VRS?", "Pitlane HQ junta overlays, telemetr\xEDa de vueltas con comparaciones y un coach con vueltas de referencia de sus propias clasificaciones en una sola app gratis."],
        ["\xBFQu\xE9 simuladores?", "iRacing y Le Mans Ultimate (en beta). ACC y Assetto Corsa est\xE1n en desarrollo."]
      ]
    },
    pt: {
      path: "/pt/telemetria-iracing-gratis",
      title: "Telemetria gr\xE1tis para iRacing e Le Mans Ultimate \xB7 Pitlane HQ",
      desc: "Telemetria gr\xE1tis para iRacing e Le Mans Ultimate. An\xE1lise de voltas, um coach com voltas reais, classifica\xE7\xF5es, overlays e telemetria no celular.",
      h1: "Telemetria gr\xE1tis para iRacing e Le Mans Ultimate",
      lead: "O Pitlane HQ junta num app gr\xE1tis o que costuma precisar de v\xE1rios. Telemetria e an\xE1lise de voltas, um coach que compara voc\xEA com voltas reais mais r\xE1pidas, overlays sobre o jogo, classifica\xE7\xF5es e seus resumos de corrida.",
      secs: [
        ["Telemetria e an\xE1lise", "Cada volta gravada sem configurar nada, duas voltas comparadas em gr\xE1ficos e no mapa, os setores e as frenagens."],
        ["Um coach", "As curvas que mais custam contra o recorde ou o piloto logo acima do seu ritmo, com o que mudar."],
        ["Overlays", "Relative, classifica\xE7\xE3o, radar, barra de delta, combust\xEDvel, pneus, mapa, marcas de frenagem e mais, tamb\xE9m em VR."],
        ["Em todo lugar", "Windows para pilotar, e a web e o Android para ver suas voltas e acompanhar sua corrida ao vivo."],
        ["O que \xE9 gr\xE1tis", "Durante a beta tudo \xE9 gr\xE1tis. A telemetria, o coach, as classifica\xE7\xF5es, os overlays b\xE1sicos e o app de celular continuam gr\xE1tis depois."],
        ["Telemetria gr\xE1tis para Le Mans Ultimate", "O mesmo app grava o Le Mans Ultimate, em beta, sem instalar nada no jogo."]
      ],
      faq: [
        ["\xC9 gr\xE1tis mesmo?", "Sim. O app do PC, a web e o app Android s\xE3o gr\xE1tis."],
        ["Procurando uma alternativa gr\xE1tis ao RaceLab, Garage 61, Track Titan ou VRS?", "O Pitlane HQ junta overlays, telemetria de voltas com compara\xE7\xF5es e um coach com voltas de refer\xEAncia das suas pr\xF3prias classifica\xE7\xF5es num s\xF3 app gr\xE1tis."],
        ["Quais simuladores?", "iRacing e Le Mans Ultimate (em beta). ACC e Assetto Corsa est\xE3o em desenvolvimento."]
      ]
    }
  },
  {
    id: "fuel",
    lmu: "ov",
    en: {
      path: "/iracing-fuel-calculator",
      title: "iRacing fuel calculator that measures every lap \xB7 Pitlane HQ",
      desc: "A live iRacing fuel calculator. The Pitlane HQ fuel overlay measures each lap and shows the laps left and what you may use per lap to finish without a stop.",
      h1: "An iRacing fuel calculator that measures every lap",
      lead: "No table to fill in before the race. The fuel overlay of Pitlane HQ measures what each lap really uses, with your pace and the traffic you meet, and tells you while you drive if the tank reaches the flag.",
      secs: [
        ["What each lap uses", "The last lap's use and the average of the clean laps, measured from the car itself, not from a guess made before the start."],
        ["Laps left in the tank", "How many laps the fuel you carry gives at the pace you are driving, with the spare laps of margin you choose."],
        ["To finish without a stop", "What you may use per lap to reach the flag on the fuel you have. Lift and coast until the number turns green."],
        ["The pit stop", "On the pit road the pit overlay shows your speed against the limit and the fuel and repairs of the stop."],
        ["Every race in your account", "Each lap's fuel goes into your laps, so the next race at the same track starts with what you used last time."]
      ],
      faq: [
        ["Do I need to type the race length or the tank size?", "No. The overlay reads the session, the tank and every lap from iRacing by itself."],
        ["How much margin does it keep?", "0.3 laps by default. You choose the spare laps in the overlay's settings."],
        ["Does it work in Le Mans Ultimate?", "Yes, in beta. The fuel overlay works the same, and the dash shows the virtual energy left."],
        ["Is it free?", "Yes. The fuel overlay is one of the free overlays."]
      ]
    },
    es: {
      path: "/es/calculadora-combustible-iracing",
      title: "Calculadora de combustible para iRacing en vivo \xB7 Pitlane HQ",
      desc: "Una calculadora de combustible en vivo para iRacing. El overlay de Pitlane HQ mide cada vuelta y te dice cu\xE1ntas te quedan y cu\xE1nto gastar para no parar.",
      h1: "Una calculadora de combustible para iRacing que mide cada vuelta",
      lead: "Sin tablas que rellenar antes de la carrera. El overlay de combustible de Pitlane HQ mide lo que gasta de verdad cada vuelta, con tu ritmo y el tr\xE1fico que encuentras, y te dice mientras conduces si el dep\xF3sito llega a la bandera.",
      secs: [
        ["Lo que gasta cada vuelta", "El consumo de la \xFAltima vuelta y la media de las vueltas limpias, medidos en el propio coche, no estimados antes de la salida."],
        ["Vueltas que quedan en el dep\xF3sito", "Cu\xE1ntas vueltas da el combustible que llevas al ritmo al que vas, con las vueltas de margen que elijas."],
        ["Para terminar sin parar", "Lo que puedes gastar por vuelta para llegar a la bandera con el combustible que tienes. Levanta y deja rodar hasta que el n\xFAmero se ponga verde."],
        ["La parada en boxes", "En el pit lane el overlay de boxes muestra tu velocidad frente al l\xEDmite y el combustible y las reparaciones de la parada."],
        ["Cada carrera en tu cuenta", "El combustible de cada vuelta se guarda con tus vueltas, as\xED que la pr\xF3xima carrera en el mismo circuito empieza con lo que gastaste la \xFAltima vez."]
      ],
      faq: [
        ["\xBFTengo que escribir la duraci\xF3n de la carrera o el dep\xF3sito?", "No. El overlay lee la sesi\xF3n, el dep\xF3sito y cada vuelta de iRacing \xE9l solo."],
        ["\xBFCu\xE1nto margen deja?", "0,3 vueltas por defecto. Las vueltas de margen se eligen en los ajustes del overlay."],
        ["\xBFFunciona en Le Mans Ultimate?", "S\xED, en beta. El overlay de combustible funciona igual, y el dash muestra la energ\xEDa virtual que queda."],
        ["\xBFEs gratis?", "S\xED. El overlay de combustible es uno de los overlays gratis."]
      ]
    },
    pt: {
      path: "/pt/calculadora-combustivel-iracing",
      title: "Calculadora de combust\xEDvel para iRacing ao vivo \xB7 Pitlane HQ",
      desc: "Uma calculadora de combust\xEDvel ao vivo para iRacing. O overlay do Pitlane HQ mede cada volta e mostra quantas restam e quanto gastar para n\xE3o parar.",
      h1: "Uma calculadora de combust\xEDvel para iRacing que mede cada volta",
      lead: "Sem tabela para preencher antes da corrida. O overlay de combust\xEDvel do Pitlane HQ mede o que cada volta realmente gasta, com o seu ritmo e o tr\xE1fego que encontra, e diz enquanto voc\xEA pilota se o tanque chega \xE0 bandeirada.",
      secs: [
        ["O que cada volta gasta", "O consumo da \xFAltima volta e a m\xE9dia das voltas limpas, medidos no pr\xF3prio carro, n\xE3o estimados antes da largada."],
        ["Voltas que restam no tanque", "Quantas voltas o combust\xEDvel que voc\xEA leva d\xE1 no ritmo em que est\xE1, com as voltas de margem que escolher."],
        ["Para terminar sem parar", "O que voc\xEA pode gastar por volta para chegar \xE0 bandeirada com o combust\xEDvel que tem. Tire o p\xE9 antes da frenagem at\xE9 o n\xFAmero ficar verde."],
        ["O pit stop", "No pit lane o overlay de boxes mostra sua velocidade contra o limite e o combust\xEDvel e os reparos da parada."],
        ["Cada corrida na sua conta", "O combust\xEDvel de cada volta fica com as suas voltas, ent\xE3o a pr\xF3xima corrida na mesma pista come\xE7a com o que voc\xEA gastou da \xFAltima vez."]
      ],
      faq: [
        ["Preciso digitar a dura\xE7\xE3o da corrida ou o tanque?", "N\xE3o. O overlay l\xEA a sess\xE3o, o tanque e cada volta do iRacing sozinho."],
        ["Quanta margem ele deixa?", "0,3 voltas por padr\xE3o. As voltas de margem s\xE3o escolhidas nos ajustes do overlay."],
        ["Funciona no Le Mans Ultimate?", "Sim, em beta. O overlay de combust\xEDvel funciona igual, e o dash mostra a energia virtual que resta."],
        ["\xC9 gr\xE1tis?", "Sim. O overlay de combust\xEDvel \xE9 um dos overlays gr\xE1tis."]
      ]
    }
  },
  {
    id: "lmu-compare",
    game: "lmu",
    img: "compare.jpg",
    lmu: "compare",
    en: {
      path: "/le-mans-ultimate-lap-comparison",
      title: "Compare Le Mans Ultimate laps side by side \xB7 Pitlane HQ",
      desc: "Compare two Le Mans Ultimate laps on charts and on the map. Speed, throttle, brake, gear and the time gap, against your best or a faster real lap. Free.",
      h1: "Compare Le Mans Ultimate laps side by side",
      lead: "Pitlane HQ records every Le Mans Ultimate lap by itself and lays two of them over each other, yours against your best, a team mate's or a faster lap from the leaderboard of the same car and track.",
      secs: [
        ["Every channel on one chart", "Speed, throttle, brake, gear, steering and the time gap along the lap, so you see where the gap opens and why."],
        ["On the track map", "Both racing lines drawn on the circuit, with the braking points and the corners where the time goes."],
        ["Sector by sector", "The official sectors of Le Mans Ultimate, learnt from the game, and the time of each against the other lap."],
        ["A faster lap to compare with", "The record of the car and track, or the next level above your pace, from the laps of Pitlane HQ drivers and their rivals."],
        ["Hypercar, LMP2, LMP3, GTE and LMGT3", "Every car is compared with laps of the same car on the same track, never another class."],
        ["On the PC, the web and the phone", "Open the comparison wherever you are, the laps are in your account."]
      ],
      faq: [
        ["Do I need to export anything from the game?", "No. Turn on Settings \u2192 Gameplay \u2192 Enable Plugins in Le Mans Ultimate and Pitlane HQ Agent records the laps by itself."],
        ["Can I compare with a faster driver?", "Yes. Lap B can be the record of the car and track or the next level above your pace, both laps someone really drove."],
        ["Does it count laps off the track?", "A lap off the track or not round the whole circuit is never valid, and never a reference."],
        ["Is it free?", "Yes. Le Mans Ultimate support is in beta and free."]
      ]
    },
    es: {
      path: "/es/comparar-vueltas-le-mans-ultimate",
      title: "Comparar vueltas de Le Mans Ultimate \xB7 Pitlane HQ",
      desc: "Compara dos vueltas de Le Mans Ultimate en gr\xE1ficas y en el mapa. Velocidad, acelerador, freno, marcha y diferencia, frente a tu mejor vuelta o una m\xE1s r\xE1pida.",
      h1: "Comparar vueltas de Le Mans Ultimate una junto a otra",
      lead: "Pitlane HQ graba cada vuelta de Le Mans Ultimate \xE9l solo y pone dos una encima de otra, la tuya frente a tu mejor vuelta, la de un compa\xF1ero o una m\xE1s r\xE1pida de la clasificaci\xF3n del mismo coche y circuito.",
      secs: [
        ["Todos los canales en una gr\xE1fica", "Velocidad, acelerador, freno, marcha, volante y la diferencia de tiempo a lo largo de la vuelta, para ver d\xF3nde se abre la diferencia y por qu\xE9."],
        ["En el mapa del circuito", "Las dos trazadas dibujadas sobre el circuito, con los puntos de frenada y las curvas donde se va el tiempo."],
        ["Sector a sector", "Los sectores oficiales de Le Mans Ultimate, aprendidos del juego, y el tiempo de cada uno frente a la otra vuelta."],
        ["Una vuelta m\xE1s r\xE1pida con la que comparar", "El r\xE9cord del coche y circuito, o el siguiente nivel por encima de tu ritmo, de las vueltas de los pilotos de Pitlane HQ y de sus rivales."],
        ["Hypercar, LMP2, LMP3, GTE y LMGT3", "Cada coche se compara con vueltas del mismo coche en el mismo circuito, nunca de otra clase."],
        ["En el PC, la web y el m\xF3vil", "Abre la comparaci\xF3n donde est\xE9s, las vueltas est\xE1n en tu cuenta."]
      ],
      faq: [
        ["\xBFTengo que exportar algo del juego?", "No. Activa Settings \u2192 Gameplay \u2192 Enable Plugins en Le Mans Ultimate y Pitlane HQ Agent graba las vueltas \xE9l solo."],
        ["\xBFPuedo compararme con un piloto m\xE1s r\xE1pido?", "S\xED. La vuelta B puede ser el r\xE9cord del coche y circuito o el siguiente nivel por encima de tu ritmo, las dos vueltas que alguien condujo de verdad."],
        ["\xBFCuenta las vueltas fuera de pista?", "Una vuelta fuera de pista o que no recorre todo el circuito nunca es v\xE1lida, ni sirve de referencia."],
        ["\xBFEs gratis?", "S\xED. El soporte de Le Mans Ultimate est\xE1 en beta y es gratis."]
      ]
    },
    pt: {
      path: "/pt/comparar-voltas-le-mans-ultimate",
      title: "Comparar voltas do Le Mans Ultimate \xB7 Pitlane HQ",
      desc: "Compare duas voltas do Le Mans Ultimate em gr\xE1ficos e no mapa. Velocidade, acelerador, freio, marcha e a diferen\xE7a, contra a sua melhor ou uma mais r\xE1pida.",
      h1: "Comparar voltas do Le Mans Ultimate lado a lado",
      lead: "O Pitlane HQ grava cada volta do Le Mans Ultimate sozinho e coloca duas uma sobre a outra, a sua contra a sua melhor, a de um colega ou uma mais r\xE1pida da classifica\xE7\xE3o do mesmo carro e pista.",
      secs: [
        ["Todos os canais num gr\xE1fico", "Velocidade, acelerador, freio, marcha, volante e a diferen\xE7a de tempo ao longo da volta, para ver onde a diferen\xE7a abre e por qu\xEA."],
        ["No mapa da pista", "Os dois tra\xE7ados desenhados na pista, com os pontos de frenagem e as curvas onde o tempo vai embora."],
        ["Setor a setor", "Os setores oficiais do Le Mans Ultimate, aprendidos do jogo, e o tempo de cada um contra a outra volta."],
        ["Uma volta mais r\xE1pida para comparar", "O recorde do carro e pista, ou o pr\xF3ximo n\xEDvel acima do seu ritmo, das voltas dos pilotos do Pitlane HQ e dos seus rivais."],
        ["Hypercar, LMP2, LMP3, GTE e LMGT3", "Cada carro \xE9 comparado com voltas do mesmo carro na mesma pista, nunca de outra classe."],
        ["No PC, na web e no celular", "Abra a compara\xE7\xE3o onde estiver, as voltas est\xE3o na sua conta."]
      ],
      faq: [
        ["Preciso exportar algo do jogo?", "N\xE3o. Ative Settings \u2192 Gameplay \u2192 Enable Plugins no Le Mans Ultimate e o Pitlane HQ Agent grava as voltas sozinho."],
        ["Posso comparar com um piloto mais r\xE1pido?", "Sim. A volta B pode ser o recorde do carro e pista ou o pr\xF3ximo n\xEDvel acima do seu ritmo, as duas voltas que algu\xE9m realmente pilotou."],
        ["Conta voltas fora da pista?", "Uma volta fora da pista ou que n\xE3o percorre a pista inteira nunca \xE9 v\xE1lida, nem serve de refer\xEAncia."],
        ["\xC9 gr\xE1tis?", "Sim. O suporte ao Le Mans Ultimate est\xE1 em beta e \xE9 gr\xE1tis."]
      ]
    }
  },
  {
    id: "lmu-braking",
    game: "lmu",
    lmu: "braking",
    en: {
      path: "/le-mans-ultimate-braking-points",
      title: "Le Mans Ultimate braking points and markers \xB7 Pitlane HQ",
      desc: "Find your braking points in Le Mans Ultimate. Pitlane HQ shows where you brake against a faster lap of the same car, on the map and live on track. In beta.",
      h1: "Braking points for Le Mans Ultimate",
      lead: "At Le Mans, Spa or Bahrain most of the time is won or lost under braking. Pitlane HQ shows where you brake, how hard and how long, next to a faster lap of the same car, and marks the next point on track while you drive.",
      secs: [
        ["Where you brake against a faster lap", "Both laps' braking points on the track map, in metres, with the speed before the corner and the lowest speed in it."],
        ["How you brake", "The brake trace of both laps, the peak pressure, trail braking into the corner and when you release"],
        ["Braking markers on track", "An overlay marks the next braking point while you drive, taken from the next level above your best lap, and moves with your speed and the car close ahead."],
        ["What the fast drivers do", "Under each corner, the range of braking points and apex speeds of the fastest drivers there, from their real laps."],
        ["Every class on its own", "A Hypercar brakes much later than an LMGT3, so each car is compared only with laps of the same car."]
      ],
      faq: [
        ["Where do the braking points come from?", "From real laps of the same car and track, the next level above your pace, or your own best lap while there is none."],
        ["Do the markers work in VR?", "Yes. The overlays also show in the headset through SteamVR."],
        ["What do I need?", "Pitlane HQ Agent on Windows and, in the game, Settings \u2192 Gameplay \u2192 Enable Plugins turned on."],
        ["Is it free?", "Yes. Le Mans Ultimate support is in beta and free."]
      ]
    },
    es: {
      path: "/es/puntos-de-frenada-le-mans-ultimate",
      title: "Puntos de frenada en Le Mans Ultimate \xB7 Pitlane HQ",
      desc: "Encuentra tus puntos de frenada en Le Mans Ultimate. Pitlane HQ te ense\xF1a d\xF3nde frenas frente a una vuelta m\xE1s r\xE1pida del mismo coche, en el mapa y en pista.",
      h1: "Puntos de frenada para Le Mans Ultimate",
      lead: "En Le Mans, Spa o Bahr\xE9in casi todo el tiempo se gana o se pierde frenando. Pitlane HQ te ense\xF1a d\xF3nde frenas, cu\xE1nto y durante cu\xE1nto, junto a una vuelta m\xE1s r\xE1pida del mismo coche, y marca el siguiente punto en pista mientras conduces.",
      secs: [
        ["D\xF3nde frenas frente a una vuelta m\xE1s r\xE1pida", "Los puntos de frenada de las dos vueltas en el mapa, en metros, con la velocidad antes de la curva y la m\xEDnima dentro."],
        ["C\xF3mo frenas", "La traza de freno de las dos vueltas, la presi\xF3n m\xE1xima, el trail braking hasta la curva y cu\xE1ndo sueltas"],
        ["Marcas de frenada en pista", "Un overlay marca el siguiente punto de frenada mientras conduces, sacado del siguiente nivel por encima de tu mejor vuelta, y se ajusta a tu velocidad y al coche que llevas delante."],
        ["Lo que hacen los r\xE1pidos", "En cada curva, entre qu\xE9 metros frenan y a qu\xE9 velocidad pasan por el v\xE9rtice los pilotos m\xE1s r\xE1pidos de all\xED, de sus vueltas reales."],
        ["Cada clase por su lado", "Un Hypercar frena mucho m\xE1s tarde que un LMGT3, as\xED que cada coche se compara solo con vueltas del mismo coche."]
      ],
      faq: [
        ["\xBFDe d\xF3nde salen los puntos de frenada?", "De vueltas reales del mismo coche y circuito, del siguiente nivel por encima de tu ritmo, o de tu mejor vuelta mientras no haya otra."],
        ["\xBFLas marcas funcionan en VR?", "S\xED. Los overlays tambi\xE9n se ven en las gafas a trav\xE9s de SteamVR."],
        ["\xBFQu\xE9 necesito?", "Pitlane HQ Agent en Windows y, en el juego, Settings \u2192 Gameplay \u2192 Enable Plugins activado."],
        ["\xBFEs gratis?", "S\xED. El soporte de Le Mans Ultimate est\xE1 en beta y es gratis."]
      ]
    },
    pt: {
      path: "/pt/pontos-de-frenagem-le-mans-ultimate",
      title: "Pontos de frenagem no Le Mans Ultimate \xB7 Pitlane HQ",
      desc: "Encontre seus pontos de frenagem no Le Mans Ultimate. O Pitlane HQ mostra onde voc\xEA freia contra uma volta mais r\xE1pida do mesmo carro, no mapa e na pista.",
      h1: "Pontos de frenagem para Le Mans Ultimate",
      lead: "Em Le Mans, Spa ou Bahrein quase todo o tempo \xE9 ganho ou perdido na frenagem. O Pitlane HQ mostra onde voc\xEA freia, quanto e por quanto tempo, ao lado de uma volta mais r\xE1pida do mesmo carro, e marca o pr\xF3ximo ponto na pista enquanto voc\xEA pilota.",
      secs: [
        ["Onde voc\xEA freia contra uma volta mais r\xE1pida", "Os pontos de frenagem das duas voltas no mapa, em metros, com a velocidade antes da curva e a m\xEDnima dentro dela."],
        ["Como voc\xEA freia", "O tra\xE7o de freio das duas voltas, a press\xE3o m\xE1xima, o trail braking at\xE9 a curva e quando voc\xEA solta"],
        ["Marcas de frenagem na pista", "Um overlay marca o pr\xF3ximo ponto de frenagem enquanto voc\xEA pilota, tirado do pr\xF3ximo n\xEDvel acima da sua melhor volta, e se ajusta \xE0 sua velocidade e ao carro logo \xE0 frente."],
        ["O que os r\xE1pidos fazem", "Em cada curva, entre quais metros freiam e com que velocidade passam pelo \xE1pice os pilotos mais r\xE1pidos dali, das voltas reais deles."],
        ["Cada classe separada", "Um Hypercar freia muito mais tarde que um LMGT3, ent\xE3o cada carro \xE9 comparado s\xF3 com voltas do mesmo carro."]
      ],
      faq: [
        ["De onde v\xEAm os pontos de frenagem?", "De voltas reais do mesmo carro e pista, do pr\xF3ximo n\xEDvel acima do seu ritmo, ou da sua melhor volta enquanto n\xE3o houver outra."],
        ["As marcas funcionam em VR?", "Sim. Os overlays tamb\xE9m aparecem nos \xF3culos pelo SteamVR."],
        ["Do que preciso?", "Do Pitlane HQ Agent no Windows e, no jogo, de Settings \u2192 Gameplay \u2192 Enable Plugins ativado."],
        ["\xC9 gr\xE1tis?", "Sim. O suporte ao Le Mans Ultimate est\xE1 em beta e \xE9 gr\xE1tis."]
      ]
    }
  },
  {
    id: "lmu-coach",
    game: "lmu",
    img: "coach.jpg",
    en: {
      path: "/le-mans-ultimate-coach",
      title: "Le Mans Ultimate coach, braking points and line \xB7 Pitlane HQ",
      desc: "A free coach for Le Mans Ultimate, in beta. Compare your lap with real reference laps and see your braking points and racing line, corner by corner.",
      h1: "A Le Mans Ultimate coach with real reference laps",
      lead: "Pitlane HQ compares your Le Mans Ultimate lap with a faster lap driven by a real person on the same car and track. It shows where you brake, how fast you reach the apex and which line you take, and says what to change first.",
      secs: [
        ["The corners that cost the most", "Every corner is measured against the reference, braking point, apex speed and throttle. The coach lists the corners that lose the most first, named by the track's turns."],
        ["Braking points in metres", "Where you brake against the faster lap, how hard and how long, and the range of braking points of the fastest drivers there. The braking markers overlay shows the next one on track."],
        ["The racing line", "Le Mans Ultimate gives the car's position, so your line is drawn next to the faster one and the coach says where you were inside or outside at turn-in, apex and exit."],
        ["Reference laps from the leaderboard", "Lap B can be your own best, the next level above your pace or the record of the car and track. All of them are laps someone really drove."],
        ["Compare any two laps", "Speed, throttle, brake, gear, steering and the time gap along the lap, with the sectors and the map, on the PC, the web or the phone."],
        ["Live on track", "The coach overlay shows the next corner's tip and braking point while you drive, and after the corner what it gave or took."]
      ],
      faq: [
        ["Does the coach work in Le Mans Ultimate?", "Yes. Le Mans Ultimate support is in beta, and the coach, lap comparison and braking markers work as they do in iRacing."],
        ["Where do the reference laps come from?", "From the laps of Pitlane HQ drivers and their rivals on the same car and track. The more people drive a combination, the closer the next level is to your pace."],
        ["Does it work with Hypercar, LMP2 and LMGT3?", "Yes. Every car is compared with laps of the same car on the same track."],
        ["Is it free?", "Yes."]
      ]
    },
    es: {
      path: "/es/coach-le-mans-ultimate",
      title: "Coach de Le Mans Ultimate, frenadas y trazada \xB7 Pitlane HQ",
      desc: "Un coach gratis para Le Mans Ultimate, en beta. Compara tu vuelta con vueltas de referencia reales y mira tus puntos de frenada y tu trazada, curva a curva.",
      h1: "Un coach de Le Mans Ultimate con vueltas de referencia reales",
      lead: "Pitlane HQ compara tu vuelta de Le Mans Ultimate con una vuelta m\xE1s r\xE1pida de una persona real en el mismo coche y circuito. Te ense\xF1a d\xF3nde frenas, a qu\xE9 velocidad llegas al v\xE9rtice y qu\xE9 trazada llevas, y te dice qu\xE9 cambiar primero.",
      secs: [
        ["Las curvas que m\xE1s te cuestan", "Cada curva se mide frente a la referencia, punto de frenada, velocidad en el v\xE9rtice y acelerador. El coach pone primero las que m\xE1s pierden, con el nombre de las curvas del circuito."],
        ["Puntos de frenada en metros", "D\xF3nde frenas frente a la vuelta m\xE1s r\xE1pida, cu\xE1nto y durante cu\xE1nto, y entre qu\xE9 metros frenan los pilotos m\xE1s r\xE1pidos de all\xED. El overlay de marcas de frenada te ense\xF1a la siguiente en pista."],
        ["La trazada", "Le Mans Ultimate da la posici\xF3n del coche, as\xED que tu l\xEDnea se dibuja junto a la r\xE1pida y el coach te dice si ibas por dentro o por fuera en la entrada, el v\xE9rtice y la salida."],
        ["Vueltas de referencia de la clasificaci\xF3n", "La vuelta B puede ser tu mejor vuelta, el siguiente nivel por encima de tu ritmo o el r\xE9cord del coche y circuito. Todas son vueltas que alguien condujo de verdad."],
        ["Compara dos vueltas cualquiera", "Velocidad, acelerador, freno, marcha, volante y la diferencia de tiempo a lo largo de la vuelta, con los sectores y el mapa, en el PC, la web o el m\xF3vil."],
        ["En vivo en pista", "El overlay del coach muestra el consejo y el punto de frenada de la siguiente curva mientras conduces, y al salir lo que ganaste o perdiste."]
      ],
      faq: [
        ["\xBFEl coach funciona en Le Mans Ultimate?", "S\xED. El soporte de Le Mans Ultimate est\xE1 en beta, y el coach, la comparaci\xF3n de vueltas y las marcas de frenada funcionan como en iRacing."],
        ["\xBFDe d\xF3nde salen las vueltas de referencia?", "De las vueltas de los pilotos de Pitlane HQ y de sus rivales en el mismo coche y circuito. Cuanta m\xE1s gente corre una combinaci\xF3n, m\xE1s cerca de tu ritmo est\xE1 el siguiente nivel."],
        ["\xBFFunciona con Hypercar, LMP2 y LMGT3?", "S\xED. Cada coche se compara con vueltas del mismo coche en el mismo circuito."],
        ["\xBFEs gratis?", "S\xED."]
      ]
    },
    pt: {
      path: "/pt/coach-le-mans-ultimate",
      title: "Coach de Le Mans Ultimate, frenagens e tra\xE7ado \xB7 Pitlane HQ",
      desc: "Um coach gr\xE1tis para Le Mans Ultimate, em beta. Compare sua volta com voltas de refer\xEAncia reais e veja seus pontos de frenagem e seu tra\xE7ado, curva a curva.",
      h1: "Um coach de Le Mans Ultimate com voltas de refer\xEAncia reais",
      lead: "O Pitlane HQ compara sua volta do Le Mans Ultimate com uma volta mais r\xE1pida de uma pessoa real no mesmo carro e pista. Mostra onde voc\xEA freia, com que velocidade chega ao \xE1pice e qual tra\xE7ado faz, e diz o que mudar primeiro.",
      secs: [
        ["As curvas que mais custam", "Cada curva \xE9 medida contra a refer\xEAncia, ponto de frenagem, velocidade no \xE1pice e acelerador. O coach mostra primeiro as que mais perdem, com o nome das curvas da pista."],
        ["Pontos de frenagem em metros", "Onde voc\xEA freia contra a volta mais r\xE1pida, quanto e por quanto tempo, e entre quais metros freiam os pilotos mais r\xE1pidos dali. O overlay de marcas de frenagem mostra a pr\xF3xima na pista."],
        ["O tra\xE7ado", "O Le Mans Ultimate d\xE1 a posi\xE7\xE3o do carro, ent\xE3o sua linha \xE9 desenhada ao lado da r\xE1pida e o coach diz se voc\xEA estava por dentro ou por fora na entrada, no \xE1pice e na sa\xEDda."],
        ["Voltas de refer\xEAncia da classifica\xE7\xE3o", "A volta B pode ser a sua melhor, o pr\xF3ximo n\xEDvel acima do seu ritmo ou o recorde do carro e pista. Todas s\xE3o voltas que algu\xE9m pilotou de verdade."],
        ["Compare duas voltas quaisquer", "Velocidade, acelerador, freio, marcha, volante e a diferen\xE7a de tempo ao longo da volta, com os setores e o mapa, no PC, na web ou no celular."],
        ["Ao vivo na pista", "O overlay do coach mostra a dica e o ponto de frenagem da pr\xF3xima curva enquanto voc\xEA pilota, e na sa\xEDda o que voc\xEA ganhou ou perdeu."]
      ],
      faq: [
        ["O coach funciona no Le Mans Ultimate?", "Sim. O suporte ao Le Mans Ultimate est\xE1 em beta, e o coach, a compara\xE7\xE3o de voltas e as marcas de frenagem funcionam como no iRacing."],
        ["De onde v\xEAm as voltas de refer\xEAncia?", "Das voltas dos pilotos do Pitlane HQ e dos seus rivais no mesmo carro e pista. Quanto mais gente corre uma combina\xE7\xE3o, mais perto do seu ritmo fica o pr\xF3ximo n\xEDvel."],
        ["Funciona com Hypercar, LMP2 e LMGT3?", "Sim. Cada carro \xE9 comparado com voltas do mesmo carro na mesma pista."],
        ["\xC9 gr\xE1tis?", "Sim."]
      ]
    }
  }
];
var GUIDES = { en: "Guides", es: "Gu\xEDas", pt: "Guias" };

// src/seo.js
var SITE5 = "https://pitlanehq.app";
var SEO_VER = "13";
var SEO_DATE = "2026-11-01";
var esc4 = /* @__PURE__ */ __name((s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]), "esc");
var slug2 = /* @__PURE__ */ __name((s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80), "slug");
var fmt2 = /* @__PURE__ */ __name((t) => {
  if (!(t > 0)) return "\u2013";
  const m = Math.floor(t / 60), s = t - m * 60;
  return (m ? m + ":" + (s < 10 ? "0" : "") : "") + s.toFixed(3);
}, "fmt");
var cap = /* @__PURE__ */ __name((s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1), "cap");
var day = /* @__PURE__ */ __name((v) => v > 0 ? new Date(v).toISOString().slice(0, 10) : "", "day");
var later2 = /* @__PURE__ */ __name((...d) => d.filter(Boolean).sort().pop() || SEO_DATE, "later");
var fix2 = /* @__PURE__ */ __name((s) => {
  s = String(s || "");
  if (!/[ÃÂ]/.test(s)) return s;
  try {
    return decodeURIComponent(escape(s));
  } catch (e) {
    return s;
  }
}, "fix");
var LANGS2 = ["en", "es", "pt"];
var PRE2 = { en: "", es: "/es", pt: "/pt" };
var NAME = { en: "English", es: "Espa\xF1ol", pt: "Portugu\xEAs" };
var LOCALE = { en: "en_US", es: "es_ES", pt: "pt_BR" };
var HLANG = { en: "en", es: "es", pt: "pt-BR" };
var altsOf = /* @__PURE__ */ __name((o) => ({ en: o.en.path, es: o.es.path, pt: o.pt.path }), "altsOf");
var GNAME = { iracing: "iRacing", lmu: "Le Mans Ultimate" };
var GSHORT = { iracing: "iRacing", lmu: "LMU" };
var recTitle = /* @__PURE__ */ __name((W2, car, track2, game) => [W2.cT(car, track2, GNAME[game]), W2.cT(car, track2, GSHORT[game]), W2.cT(car, track2, GSHORT[game], true)].find((x) => x.length <= 60) || W2.cTs(car, track2), "recTitle");
var CAT2 = {
  en: { oval: "Oval", sports_car: "Sports Car", formula_car: "Formula Car", dirt_oval: "Dirt Oval", dirt_road: "Dirt Road" },
  es: { oval: "\xD3valo", sports_car: "Sports Car", formula_car: "F\xF3rmula", dirt_oval: "\xD3valo de tierra", dirt_road: "Tierra" },
  pt: { oval: "Oval", sports_car: "Sports Car", formula_car: "F\xF3rmula", dirt_oval: "Oval de terra", dirt_road: "Terra" }
};
var T2 = {
  en: {
    tel: { iracing: "iRacing telemetry", lmu: "LMU telemetry" },
    lmuH: "Le Mans Ultimate",
    ov: "Overlays",
    lgs: "Leagues",
    rec: "Records",
    dl: "Download",
    app: "Open the app",
    free: "Free \xB7 Windows, Android and the web",
    other: { iracing: "Racing in Le Mans Ultimate?", lmu: "Racing in iRacing too?" }
  },
  es: {
    tel: { iracing: "Telemetr\xEDa iRacing", lmu: "Telemetr\xEDa LMU" },
    lmuH: "Le Mans Ultimate",
    ov: "Overlays",
    lgs: "Ligas",
    rec: "R\xE9cords",
    dl: "Descargar",
    app: "Abrir la app",
    free: "Gratis \xB7 Windows, Android y web",
    other: { iracing: "\xBFCorres en Le Mans Ultimate?", lmu: "\xBFTambi\xE9n corres en iRacing?" }
  },
  pt: {
    tel: { iracing: "Telemetria iRacing", lmu: "Telemetria LMU" },
    lmuH: "Le Mans Ultimate",
    ov: "Overlays",
    lgs: "Ligas",
    rec: "Recordes",
    dl: "Baixar",
    app: "Abrir o app",
    free: "Gr\xE1tis \xB7 Windows, Android e web",
    other: { iracing: "Corre no Le Mans Ultimate?", lmu: "Tamb\xE9m corre no iRacing?" }
  }
};
var S2 = {
  en: {
    recH: /* @__PURE__ */ __name((gn) => `${gn} lap records by car and track`, "recH"),
    recD: /* @__PURE__ */ __name((gn) => `The fastest ${gn} laps on every car and track, one per driver, from drivers who use Pitlane HQ. Open a record to see its leaderboard.`, "recD"),
    howT: "How a lap gets here",
    how: /* @__PURE__ */ __name((gn) => `Pitlane HQ Agent shares each driver's fastest valid lap of every car and track in ${gn} by itself, under their public name or as Anonymous. A lap off the track, with a lost connection or not round the whole circuit never counts.`, "how"),
    faq: /* @__PURE__ */ __name((gn) => [
      [`How does my ${gn} lap get on these records?`, `Install Pitlane HQ Agent on the PC where you race and drive. Your fastest valid lap of each car and track goes up by itself.`],
      ["Can I compare my lap with a record?", "Yes. Open the record in Community \u2192 Leaderboards and compare it with your own lap of the same track, corner by corner."],
      ["Can I stay anonymous?", "Yes. Choose Anonymous in your account and your laps show without a name."]
    ], "faq"),
    all: "All",
    track: "Track",
    car: "Car",
    record: "Record",
    drivers: "Drivers",
    none: "No laps yet.",
    anon: "Anonymous",
    driver: "Driver",
    time: "Time",
    date: "Date",
    nf: "This page does not exist",
    nfT: "Not found",
    cT: /* @__PURE__ */ __name((car, track2, gn, short) => `${car} at ${track2} \xB7 ${gn}${short ? "" : " lap"} records`, "cT"),
    cTs: /* @__PURE__ */ __name((car, track2) => `${car} at ${track2} lap records`, "cTs"),
    cD: /* @__PURE__ */ __name((car, track2, t, n, gn) => `The ${car} lap record at ${track2} is ${t}. ${n === 1 ? `The only ${gn} lap from Pitlane HQ drivers so far.` : `The ${n} fastest ${gn} laps from Pitlane HQ drivers, one per driver.`}`, "cD"),
    cL: /* @__PURE__ */ __name((t) => `The record is ${t}. One lap per driver, their fastest.`, "cL"),
    cQ: "Where do you lose time in this car?",
    cA: /* @__PURE__ */ __name((gn) => `Pitlane HQ records your ${gn} laps and compares them with these, corner by corner. It is free.`, "cA")
  },
  es: {
    recH: /* @__PURE__ */ __name((gn) => `R\xE9cords de ${gn} por coche y circuito`, "recH"),
    recD: /* @__PURE__ */ __name((gn) => `Las vueltas m\xE1s r\xE1pidas de ${gn} en cada coche y circuito, una por piloto, de pilotos que usan Pitlane HQ. Abre un r\xE9cord para ver su clasificaci\xF3n.`, "recD"),
    howT: "C\xF3mo llega aqu\xED una vuelta",
    how: /* @__PURE__ */ __name((gn) => `Pitlane HQ Agent comparte sola la vuelta v\xE1lida m\xE1s r\xE1pida de cada piloto en cada coche y circuito de ${gn}, con su nombre p\xFAblico o como An\xF3nimo. Una vuelta fuera de pista, con la conexi\xF3n perdida o que no da la vuelta entera al circuito nunca cuenta.`, "how"),
    faq: /* @__PURE__ */ __name((gn) => [
      [`\xBFC\xF3mo entra mi vuelta de ${gn} en estos r\xE9cords?`, `Instala Pitlane HQ Agent en el PC donde corres y conduce. Tu vuelta v\xE1lida m\xE1s r\xE1pida de cada coche y circuito sube sola.`],
      ["\xBFPuedo comparar mi vuelta con un r\xE9cord?", "S\xED. Abre el r\xE9cord en Comunidad \u2192 Clasificaciones y comp\xE1ralo con tu propia vuelta del mismo circuito, curva a curva."],
      ["\xBFPuedo salir como an\xF3nimo?", "S\xED. Elige An\xF3nimo en tu cuenta y tus vueltas salen sin nombre."]
    ], "faq"),
    all: "Todas",
    track: "Circuito",
    car: "Coche",
    record: "R\xE9cord",
    drivers: "Pilotos",
    none: "A\xFAn no hay vueltas.",
    anon: "An\xF3nimo",
    driver: "Piloto",
    time: "Tiempo",
    date: "Fecha",
    nf: "Esta p\xE1gina no existe",
    nfT: "No encontrado",
    cT: /* @__PURE__ */ __name((car, track2, gn) => `${car} en ${track2} \xB7 r\xE9cords de ${gn}`, "cT"),
    cTs: /* @__PURE__ */ __name((car, track2) => `R\xE9cords de ${car} en ${track2}`, "cTs"),
    cD: /* @__PURE__ */ __name((car, track2, t, n, gn) => `El r\xE9cord de ${car} en ${track2} es ${t}. ${n === 1 ? `La \xFAnica vuelta de ${gn} de pilotos de Pitlane HQ por ahora.` : `Las ${n} vueltas m\xE1s r\xE1pidas de ${gn} de pilotos de Pitlane HQ, una por piloto.`}`, "cD"),
    cL: /* @__PURE__ */ __name((t) => `El r\xE9cord es ${t}. Una vuelta por piloto, la m\xE1s r\xE1pida.`, "cL"),
    cQ: "\xBFD\xF3nde pierdes tiempo con este coche?",
    cA: /* @__PURE__ */ __name((gn) => `Pitlane HQ graba tus vueltas en ${gn} y las compara con estas, curva a curva. Es gratis.`, "cA")
  },
  pt: {
    recH: /* @__PURE__ */ __name((gn) => `Recordes do ${gn} por carro e pista`, "recH"),
    recD: /* @__PURE__ */ __name((gn) => `As voltas mais r\xE1pidas do ${gn} em cada carro e pista, uma por piloto, de pilotos que usam o Pitlane HQ. Abra um recorde para ver a classifica\xE7\xE3o.`, "recD"),
    howT: "Como uma volta chega aqui",
    how: /* @__PURE__ */ __name((gn) => `O Pitlane HQ Agent compartilha sozinho a volta v\xE1lida mais r\xE1pida de cada piloto em cada carro e pista do ${gn}, com o nome p\xFAblico ou como An\xF4nimo. Uma volta fora da pista, com a conex\xE3o perdida ou que n\xE3o d\xE1 a volta inteira no circuito nunca conta.`, "how"),
    faq: /* @__PURE__ */ __name((gn) => [
      [`Como minha volta do ${gn} entra nestes recordes?`, `Instale o Pitlane HQ Agent no PC onde voc\xEA corre e pilote. Sua volta v\xE1lida mais r\xE1pida de cada carro e pista sobe sozinha.`],
      ["Posso comparar minha volta com um recorde?", "Sim. Abra o recorde em Comunidade \u2192 Classifica\xE7\xF5es e compare com a sua pr\xF3pria volta da mesma pista, curva a curva."],
      ["Posso aparecer como an\xF4nimo?", "Sim. Escolha An\xF4nimo na sua conta e suas voltas aparecem sem nome."]
    ], "faq"),
    all: "Todas",
    track: "Pista",
    car: "Carro",
    record: "Recorde",
    drivers: "Pilotos",
    none: "Ainda n\xE3o h\xE1 voltas.",
    anon: "An\xF4nimo",
    driver: "Piloto",
    time: "Tempo",
    date: "Data",
    nf: "Esta p\xE1gina n\xE3o existe",
    nfT: "N\xE3o encontrado",
    cT: /* @__PURE__ */ __name((car, track2, gn) => `${car} em ${track2} \xB7 recordes do ${gn}`, "cT"),
    cTs: /* @__PURE__ */ __name((car, track2) => `Recordes de ${car} em ${track2}`, "cTs"),
    cD: /* @__PURE__ */ __name((car, track2, t, n, gn) => `O recorde de ${car} em ${track2} \xE9 ${t}. ${n === 1 ? `A \xFAnica volta do ${gn} de pilotos do Pitlane HQ por enquanto.` : `As ${n} voltas mais r\xE1pidas do ${gn} de pilotos do Pitlane HQ, uma por piloto.`}`, "cD"),
    cL: /* @__PURE__ */ __name((t) => `O recorde \xE9 ${t}. Uma volta por piloto, a mais r\xE1pida.`, "cL"),
    cQ: "Onde voc\xEA perde tempo com este carro?",
    cA: /* @__PURE__ */ __name((gn) => `O Pitlane HQ grava suas voltas no ${gn} e as compara com estas, curva a curva. \xC9 gr\xE1tis.`, "cA")
  }
};
var LOGO = `<svg viewBox="0 0 512 512" width="30" height="30" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2733"/><stop offset="1" stop-color="#0d1116"/></linearGradient></defs><rect x="16" y="16" width="480" height="480" rx="112" fill="url(#g)"/><path d="M149.9 382.1A150 150 0 1 1 362.1 382.1" fill="none" stroke="#ffb02e" stroke-width="48" stroke-dasharray="460 1000"/><path d="M149.9 382.1A150 150 0 1 1 362.1 382.1" fill="none" stroke="#f2f4f7" stroke-width="48" stroke-dasharray="0 460 247 1000"/><path d="M149.9 382.1A150 150 0 1 1 362.1 382.1" fill="none" stroke="#ffb02e" stroke-width="48" stroke-dasharray="0 460 31 31 31 31 31 31 31 31 1000"/><path d="M188.1 343.9A96 96 0 1 1 323.9 343.9" fill="none" stroke="#2f3a48" stroke-width="10" stroke-linecap="round"/><path d="M256 276L330 188" stroke="#f2f4f7" stroke-width="20" stroke-linecap="round"/><circle cx="256" cy="276" r="30" fill="#f2f4f7"/><circle cx="256" cy="276" r="12" fill="#ffb02e"/></svg>`;
var FONTS = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=IBM+Plex+Sans:wght@400;600&family=JetBrains+Mono:wght@500&display=swap";
var CSS = `:root{--bg:#11151b;--card:#1a2029;--line:#2b3542;--fg:#e7ebf1;--mut:#9aa6b8;--acc:#ffb02e;--hd:'Barlow Condensed','Arial Narrow',sans-serif}*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 'IBM Plex Sans',-apple-system,'Segoe UI',Roboto,sans-serif}a{color:var(--acc)}img{max-width:100%}
.w{max-width:1000px;margin:0 auto;padding:0 18px}header{border-bottom:1px solid var(--line)}header .w{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding-top:12px;padding-bottom:12px}
.b{display:flex;align-items:center;gap:10px;color:var(--fg);text-decoration:none;font:700 22px/1 var(--hd);letter-spacing:.04em;text-transform:uppercase;margin-right:auto}
nav{display:flex;gap:14px;flex-wrap:wrap;font-size:14px}nav a{color:var(--fg);text-decoration:none;opacity:.85}nav a:hover{opacity:1;color:var(--acc)}
h1,h2,h3{font-family:var(--hd);font-weight:700;line-height:1.1;letter-spacing:.02em}h1{font-size:46px;margin:40px 0 12px}h2{font-size:30px;margin:38px 0 10px}h3{font-size:21px;margin:0 0 6px}.c h2{font-size:22px;margin:0 0 6px}
.lead{font-size:19px;color:#c9d1dc;max-width:760px}.cta{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}
.btn{display:inline-block;padding:12px 18px;border-radius:8px;font:700 15px/1 var(--hd);letter-spacing:.06em;text-transform:uppercase;text-decoration:none;border:1px solid var(--line);color:var(--fg)}
.btn.p{background:var(--acc);color:#11151b;border-color:var(--acc)}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.c{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px}.c p{margin:0;color:#c9d1dc}.m{color:var(--mut)}a.c{text-decoration:none;color:inherit}
.x{margin:22px 0 0;padding:14px 16px;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:15px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}th{color:var(--mut);font-weight:400;font-size:13px;text-transform:uppercase;letter-spacing:.06em}
td.t{font-family:'JetBrains Mono',ui-monospace,monospace;color:var(--acc)}.n{width:44px;color:var(--mut)}.tw{overflow-x:auto}
details{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin:8px 0}summary{cursor:pointer;font-weight:600}
footer{border-top:1px solid var(--line);margin-top:50px;padding:22px 0;color:var(--mut);font-size:14px}.cats{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 4px}
.cats a{padding:6px 12px;border:1px solid var(--line);border-radius:20px;color:var(--fg);text-decoration:none;font-size:14px}.cats a.on{border-color:var(--acc);color:var(--acc)}
.lg h3{font-size:22px;margin:0 0 4px}.lg .k{margin:0 0 8px}.lg img{width:44px;height:44px;border-radius:10px;float:right;margin-left:10px}.on{color:#38c97c}
figure{margin:0}figcaption{font-size:13px;color:var(--mut);margin-top:6px}.shot{margin:26px 0 0}.shot img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:#0d1116}
.ovs{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:18px}.ovs figure{background:#0d1116;border:1px solid var(--line);border-radius:12px;padding:12px;text-align:center}.ovs img{height:auto}
.phs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;max-width:640px;margin-top:22px}.phs img{display:block;width:100%;height:auto;border:5px solid #2a313c;border-radius:26px}.phs figcaption{text-align:center}
@media(max-width:600px){h1{font-size:36px}.lead{font-size:17px}th:nth-child(4),td:nth-child(4){display:none}}`;
var SHOT = {
  "board.jpg": [2880, 1040],
  "coach.jpg": [2880, 1040],
  "compare.jpg": [2880, 1e3],
  "laps.jpg": [2880, 880],
  "live.jpg": [2880, 1600],
  "race.jpg": [2220, 1520],
  "m-analysis-0.png": [540, 1060],
  "m-analysis-1.png": [540, 1060],
  "m-live.png": [540, 1060],
  "m-race.png": [540, 1060],
  "ov-g-inputs.png": [560, 262],
  "ov-g-timing.png": [440, 154],
  "ov-g-tyres.png": [420, 214],
  "ov-l-brakes.png": [480, 138],
  "ov-l-coach.png": [520, 76],
  "ov-s-sectors.png": [560, 146],
  "ov-trackbar.png": [700, 62],
  "ov-weather.png": [360, 196]
};
var imgSrc = /* @__PURE__ */ __name((l, f) => `/landing/${l}/${f}`, "imgSrc");
var img = /* @__PURE__ */ __name((l, f, alt) => {
  const [w, h] = SHOT[f] || [1200, 600];
  return `<img src="${imgSrc(l, f)}" alt="${esc4(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
}, "img");
var SHOT_ALT = {
  en: { "coach.jpg": "The Pitlane HQ coach", "compare.jpg": "Two laps compared in Pitlane HQ", "laps.jpg": "The laps of a session in Pitlane HQ", "race.jpg": "A race summary in Pitlane HQ", "m-live.png": "Live telemetry on the phone", "m-race.png": "A race summary on the phone", "m-analysis-0.png": "The laps on the phone" },
  es: { "coach.jpg": "El coach de Pitlane HQ", "compare.jpg": "Dos vueltas comparadas en Pitlane HQ", "laps.jpg": "Las vueltas de una sesi\xF3n en Pitlane HQ", "race.jpg": "Un resumen de carrera en Pitlane HQ", "m-live.png": "Telemetr\xEDa en vivo en el m\xF3vil", "m-race.png": "Un resumen de carrera en el m\xF3vil", "m-analysis-0.png": "Las vueltas en el m\xF3vil" },
  pt: { "coach.jpg": "O coach do Pitlane HQ", "compare.jpg": "Duas voltas comparadas no Pitlane HQ", "laps.jpg": "As voltas de uma sess\xE3o no Pitlane HQ", "race.jpg": "Um resumo de corrida no Pitlane HQ", "m-live.png": "Telemetria ao vivo no celular", "m-race.png": "Um resumo de corrida no celular", "m-analysis-0.png": "As voltas no celular" }
};
var shot = /* @__PURE__ */ __name((l, f) => `<figure class="shot">${img(l, f, SHOT_ALT[l][f] || "Pitlane HQ")}</figure>`, "shot");
var phones = /* @__PURE__ */ __name((l, list) => `<div class="phs">${list.map((f) => `<figure>${img(l, f, SHOT_ALT[l][f] || "Pitlane HQ")}<figcaption>${esc4(SHOT_ALT[l][f] || "")}</figcaption></figure>`).join("")}</div>`, "phones");
var HAS = { lmuLeagues: false, lmuRecords: false };
var HAS_MEMO = /* @__PURE__ */ new WeakMap();
async function readHas(env) {
  const m = HAS_MEMO.get(env);
  if (m && Date.now() - m.at < 5 * 6e4) return HAS = m.has;
  const [lg, rc] = await Promise.all([leaguesData(env, "lmu").then((D) => D.posted.length + D.found.length).catch(() => 0), topCombos(env, 1, "lmu").then((x) => x.length).catch(() => 0)]);
  const has = { lmuLeagues: lg > 0, lmuRecords: rc > 0 };
  HAS_MEMO.set(env, { at: Date.now(), has });
  return HAS = has;
}
__name(readHas, "readHas");
var TOPIC_BY = Object.fromEntries(TOPICS.map((x) => [x.id, x]));
var LMU_TOO = ["phone", "free"];
var LMU_TOO_H = {
  phone: { en: "Telemetry on your phone", es: "La telemetr\xEDa en tu m\xF3vil", pt: "A telemetria no seu celular" },
  free: { en: "Free telemetry", es: "Telemetr\xEDa gratis", pt: "Telemetria gr\xE1tis" }
};
var lmuToo = /* @__PURE__ */ __name((l) => LMU_TOO.map((id2) => ({ ...TOPIC_BY[id2][l], h1: LMU_TOO_H[id2][l] })), "lmuToo");
var lmuLinks = /* @__PURE__ */ __name((l) => [
  [LANDL[l].path, LANDL[l].h1],
  [OVLL[l].path, OVLL[l].h1],
  ...TOPICS.filter((x) => x.game === "lmu").map((x) => [x[l].path, x[l].h1]),
  ...HAS.lmuLeagues ? [[LEAGL[l].path, LEAGL[l].h1]] : [],
  ...HAS.lmuRecords ? [[REC_IDX.lmu[l], S2[l].recH(GNAME.lmu)]] : []
], "lmuLinks");
var iracingLinks = /* @__PURE__ */ __name((l) => [...TOPICS.filter((x) => x.game !== "lmu").map((x) => [x[l].path, x[l].h1]), [OVL[l].path, OVL[l].h1], [LEAG[l].path, LEAG[l].h1], [REC_IDX.iracing[l], S2[l].recH(GNAME.iracing)]], "iracingLinks");
function page3(l, { title, desc, path, alts, body, ld, noindex, game = "iracing", mod }) {
  const t = T2[l], other = game === "lmu" ? "iracing" : "lmu";
  if (path && !noindex) ld = [webPageLd(l, path, title, desc, mod), ...ld || []];
  const lg = game === "lmu" && HAS.lmuLeagues ? LEAGL[l].path : LEAG[l].path, rc = game === "lmu" && HAS.lmuRecords ? REC_IDX.lmu[l] : REC_IDX.iracing[l];
  const hl = alts ? LANGS2.map((k) => `<link rel="alternate" hreflang="${HLANG[k]}" href="${SITE5}${alts[k]}">`).join("") + `<link rel="alternate" hreflang="x-default" href="${SITE5}${alts.en}">` : "";
  const others = alts ? LANGS2.filter((k) => k !== l).map((k) => `<a href="${alts[k]}" hreflang="${HLANG[k]}" lang="${HLANG[k]}">${NAME[k]}</a>`).join("") : "";
  const og = `${SITE5}/og${l === "en" ? "" : "-" + l}.png`;
  return `<!doctype html><html lang="${HLANG[l]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc4(title)}</title><meta name="description" content="${esc4(desc)}">${path ? `<link rel="canonical" href="${SITE5}${path}">` : ""}${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
${hl}
<meta property="og:type" content="website"><meta property="og:site_name" content="Pitlane HQ"><meta property="og:locale" content="${LOCALE[l]}"><meta property="og:title" content="${esc4(title)}"><meta property="og:description" content="${esc4(desc)}">${path ? `<meta property="og:url" content="${SITE5}${path}">` : ""}<meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Pitlane HQ">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc4(title)}"><meta name="twitter:description" content="${esc4(desc)}"><meta name="twitter:image" content="${og}">
<meta name="theme-color" content="#11151b"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/logo.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon-180.png">
<style>${CSS}</style><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${FONTS}"></noscript>
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}<\/script>` : ""}</head><body>
<header><div class="w"><a class="b" href="/">${LOGO}Pitlane HQ</a><nav><a href="${(game === "lmu" ? LANDL : LAND)[l].path}">${esc4(t.tel[game])}</a><a href="${(game === "lmu" ? OVLL : OVL)[l].path}">${esc4(t.ov)}</a><a href="${lg}">${esc4(t.lgs)}</a><a href="${rc}">${esc4(t.rec)}</a><a href="${(other === "lmu" ? LANDL : LAND)[l].path}">${esc4(GNAME[other])}</a><a href="/downloads">${esc4(t.dl)}</a><a href="/">${esc4(t.app)}</a>${others}</nav></div></header>
<main class="w">${body}</main>
<footer><div class="w"><p class="m">${esc4(GUIDES[l])} \xB7 iRacing \xB7 ${iracingLinks(l).map(([p, h]) => `<a href="${p}">${esc4(h)}</a>`).join(" \xB7 ")}</p><p class="m">${esc4(t.lmuH)} \xB7 ${lmuLinks(l).map(([p, h]) => `<a href="${p}">${esc4(h)}</a>`).join(" \xB7 ")}</p>Pitlane HQ \xB7 ${esc4(t.free)} \xB7 <a href="/downloads">${esc4(t.dl)}</a> \xB7 <a href="mailto:support@pitlanehq.app">support@pitlanehq.app</a> \xB7 ${LANGS2.map((k) => `<a href="${LAND[k].path}" hreflang="${HLANG[k]}">${NAME[k]}</a>`).join(" \xB7 ")}</div></footer>${VISIT_JS}</body></html>`;
}
__name(page3, "page");
var webPageLd = /* @__PURE__ */ __name((l, path, name2, description, mod) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": SITE5 + path + "#page",
  url: SITE5 + path,
  name: name2,
  description,
  inLanguage: HLANG[l],
  isPartOf: { "@id": SITE5 + "/#website" },
  about: { "@id": SITE5 + "/#app" },
  dateModified: mod || SEO_DATE
}), "webPageLd");
var START = {
  en: { t: "How to start", name: /* @__PURE__ */ __name((gn) => `How to record your ${gn} telemetry with Pitlane HQ`, "name"), steps: /* @__PURE__ */ __name((gn) => [
    "Download Pitlane HQ Agent and install it on the Windows PC where you race.",
    "Open it and sign in, or create a free account.",
    `Drive in ${gn}. Every lap is saved by itself.`,
    "Open Analysis in the app, on the web or on your phone, to see where you lose time."
  ], "steps") },
  es: { t: "C\xF3mo empezar", name: /* @__PURE__ */ __name((gn) => `C\xF3mo grabar tu telemetr\xEDa de ${gn} con Pitlane HQ`, "name"), steps: /* @__PURE__ */ __name((gn) => [
    "Descarga Pitlane HQ Agent e inst\xE1lalo en el PC con Windows donde corres.",
    "\xC1brelo e inicia sesi\xF3n, o crea una cuenta gratis.",
    `Conduce en ${gn}. Cada vuelta se guarda sola.`,
    "Abre An\xE1lisis en la app, en la web o en el m\xF3vil para ver d\xF3nde pierdes tiempo."
  ], "steps") },
  pt: { t: "Como come\xE7ar", name: /* @__PURE__ */ __name((gn) => `Como gravar sua telemetria do ${gn} com o Pitlane HQ`, "name"), steps: /* @__PURE__ */ __name((gn) => [
    "Baixe o Pitlane HQ Agent e instale no PC com Windows onde voc\xEA corre.",
    "Abra e entre na sua conta, ou crie uma conta gr\xE1tis.",
    `Pilote no ${gn}. Cada volta \xE9 salva sozinha.`,
    "Abra An\xE1lise no app, na web ou no celular para ver onde voc\xEA perde tempo."
  ], "steps") }
};
var howToLd = /* @__PURE__ */ __name((l, gn, path) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: START[l].name(gn),
  inLanguage: HLANG[l],
  estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
  tool: [{ "@type": "HowToTool", name: "Pitlane HQ Agent" }],
  step: START[l].steps(gn).map((text2, i) => ({ "@type": "HowToStep", position: i + 1, text: text2, url: `${SITE5}${path}#start` }))
}), "howToLd");
var crumbs = /* @__PURE__ */ __name((items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name2, path], i) => ({ "@type": "ListItem", position: i + 1, name: name2, item: SITE5 + path })) }), "crumbs");
var faqLd = /* @__PURE__ */ __name((faq) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q2, a]) => ({ "@type": "Question", name: q2, acceptedAnswer: { "@type": "Answer", text: a } })) }), "faqLd");
var appLd = /* @__PURE__ */ __name((l, desc, shots, features) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": SITE5 + "/#app",
  name: "Pitlane HQ",
  alternateName: ["PitlaneHQ", "Pitlane HQ Agent"],
  url: SITE5 + "/",
  applicationCategory: "SportsApplication",
  applicationSubCategory: "Sim racing telemetry",
  operatingSystem: "Windows, Android, Web",
  description: desc,
  inLanguage: HLANG[l],
  image: `${SITE5}/og${l === "en" ? "" : "-" + l}.png`,
  ...shots && shots.length ? { screenshot: shots.map((f) => ({ "@type": "ImageObject", url: SITE5 + imgSrc(l, f), width: (SHOT[f] || [])[0], height: (SHOT[f] || [])[1] })) } : {},
  ...features && features.length ? { featureList: features } : {},
  downloadUrl: SITE5 + "/downloads",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": SITE5 + "/#org" }
}), "appLd");
var siteLd = /* @__PURE__ */ __name((l) => [
  { "@context": "https://schema.org", "@type": "WebSite", "@id": SITE5 + "/#website", name: "Pitlane HQ", alternateName: ["PitlaneHQ", "Pitlane"], url: SITE5 + "/", inLanguage: HLANG[l], publisher: { "@id": SITE5 + "/#org" } },
  { "@context": "https://schema.org", "@type": "Organization", "@id": SITE5 + "/#org", name: "Pitlane HQ", alternateName: "PitlaneHQ", url: SITE5 + "/", logo: SITE5 + "/icon-512.png", email: "support@pitlanehq.app" }
], "siteLd");
var etagOf = /* @__PURE__ */ __name((s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `W/"${(h >>> 0).toString(36)}-${s.length.toString(36)}"`;
}, "etagOf");
var html = /* @__PURE__ */ __name((s, cache3 = 600, status = 200) => new Response(s, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": `public, max-age=${cache3}, stale-while-revalidate=86400`, etag: etagOf(s), "x-content-type-options": "nosniff" } }), "html");
var cross = /* @__PURE__ */ __name((l, game) => {
  const o = game === "lmu" ? LAND[l] : LANDL[l];
  return `<p class="x">${esc4(T2[l].other[game])} <a href="${o.path}">${esc4(o.h1)} \u2192</a></p>`;
}, "cross");
var LAND = {
  en: {
    path: "/iracing-telemetry",
    title: "iRacing telemetry, lap analysis and overlays \xB7 Pitlane HQ",
    desc: "Free iRacing telemetry from Pitlane HQ. Record every lap, see where you lose time, compare with faster drivers and race with overlays on top of the game.",
    h1: "iRacing telemetry and a coach for your laps",
    lead: "Pitlane HQ records every lap you drive in iRacing and shows where you lose time, against your own best lap, the record and the driver just ahead of you in the same car. It is free and works on Windows, Android and the web.",
    cards: [
      ["Telemetry from every lap", "Pitlane HQ Agent runs next to iRacing and saves speed, throttle, brake, gear and steering on every lap, with nothing to set up. The laps go to your account, so you can open them later on the web or on your phone."],
      ["Compare two laps", "Speed, inputs and the time gap along the lap, the track map, the sectors and the braking points. Pick any two laps, yours, one from another session or one from the leaderboard."],
      ["A coach that uses real laps", "For each car and track Pitlane HQ learns from real laps driven by real people. The coach compares your lap with the record and with the driver just ahead of you, and tells you which corners cost the most."],
      ["Live telemetry on your phone", "While you drive, watch your telemetry on the phone or in a browser. Share a code and a friend can watch too."],
      ["Leaderboards by car and track", "The fastest lap of every driver on each car and track, by discipline, oval, sports car, formula, dirt oval and dirt road."],
      ["Race summaries and iRating", "After each race, your result, your laps, your incidents, your iRating and how you compared with the drivers around you."],
      ["Overlays on top of the game", "Relative, standings, radar, delta bar, fuel, tyres, track map, flags, a live coach and more, drawn by Pitlane HQ Agent over iRacing and also shown in VR."]
    ],
    recs: "Records by car and track",
    recsLead: "The fastest laps driven with Pitlane HQ.",
    faqT: "Questions",
    faq: [
      ["What is Pitlane HQ?", "Pitlane HQ (also written PitlaneHQ) is a free sim racing telemetry app for iRacing and Le Mans Ultimate. Pitlane HQ Agent records your laps on Windows, and the web and the phone app show them with a coach, leaderboards and overlays."],
      ["Is it free?", "Yes. The telemetry, the coach, the leaderboards and the basic overlays are free, and during the beta everything is."],
      ["Which sims does it work with?", "iRacing and Le Mans Ultimate (in beta). ACC and Assetto Corsa are in development."],
      ["What do I need?", "A Windows PC where you race in iRacing or Le Mans Ultimate, to record the laps. To look at them, any browser or the Android app."],
      ["Who sees my laps?", "Your laps are in your account. On the leaderboards only your fastest lap of each car and track appears, under your public name or as Anonymous."],
      ["How is it different from looking at a replay?", "A replay shows what happened. Telemetry shows how, where you braked, how much throttle you used and where the time went, metre by metre, next to a faster lap."]
    ],
    dl: "Download for Windows",
    app: "Open the app"
  },
  es: {
    path: "/es/telemetria-iracing",
    title: "Telemetr\xEDa de iRacing, an\xE1lisis y overlays \xB7 Pitlane HQ",
    desc: "Telemetr\xEDa gratis para iRacing con Pitlane HQ. Graba tus vueltas, mira d\xF3nde pierdes tiempo, comp\xE1rate con pilotos m\xE1s r\xE1pidos y usa overlays en el juego.",
    h1: "Telemetr\xEDa para iRacing y un coach para tus vueltas",
    lead: "Pitlane HQ graba cada vuelta que das en iRacing y te ense\xF1a d\xF3nde pierdes tiempo, frente a tu mejor vuelta, frente al r\xE9cord y frente al piloto que va justo por delante con el mismo coche. Es gratis y funciona en Windows, Android y la web.",
    cards: [
      ["Telemetr\xEDa de cada vuelta", "Pitlane HQ Agent funciona junto a iRacing y guarda velocidad, acelerador, freno, marcha y volante en cada vuelta, sin configurar nada. Las vueltas van a tu cuenta, as\xED que luego las abres en la web o en el m\xF3vil."],
      ["Comparar dos vueltas", "Velocidad, pedales y diferencia de tiempo a lo largo de la vuelta, el mapa del circuito, los sectores y los puntos de frenada. Eliges dos vueltas cualquiera, tuyas, de otra sesi\xF3n o de la clasificaci\xF3n."],
      ["Un coach con vueltas reales", "Para cada coche y circuito, Pitlane HQ aprende de vueltas reales de pilotos reales. El coach compara tu vuelta con el r\xE9cord y con el piloto que va justo por delante, y te dice qu\xE9 curvas te cuestan m\xE1s."],
      ["Telemetr\xEDa en vivo en el m\xF3vil", "Mientras corres, mira tu telemetr\xEDa en el m\xF3vil o en el navegador. Comparte un c\xF3digo y un amigo tambi\xE9n puede verla."],
      ["Clasificaciones por coche y circuito", "La vuelta m\xE1s r\xE1pida de cada piloto en cada coche y circuito, por disciplina, \xF3valo, sports car, f\xF3rmula, \xF3valo de tierra y tierra."],
      ["Resumen de carrera e iRating", "Despu\xE9s de cada carrera, tu resultado, tus vueltas, tus incidentes, tu iRating y c\xF3mo ibas frente a los pilotos de tu alrededor."],
      ["Overlays encima del juego", "Relative, clasificaci\xF3n, radar, barra de delta, combustible, neum\xE1ticos, mapa, banderas, un coach en vivo y m\xE1s, dibujados por Pitlane HQ Agent sobre iRacing y tambi\xE9n en VR."]
    ],
    recs: "R\xE9cords por coche y circuito",
    recsLead: "Las vueltas m\xE1s r\xE1pidas hechas con Pitlane HQ.",
    faqT: "Preguntas",
    faq: [
      ["\xBFQu\xE9 es Pitlane HQ?", "Pitlane HQ (tambi\xE9n escrito PitlaneHQ) es una app gratis de telemetr\xEDa para sim racing en iRacing y Le Mans Ultimate. Pitlane HQ Agent graba tus vueltas en Windows, y la web y la app del m\xF3vil te las ense\xF1an con un coach, clasificaciones y overlays."],
      ["\xBFEs gratis?", "S\xED. La telemetr\xEDa, el coach, las clasificaciones y los overlays b\xE1sicos son gratis, y durante la beta lo es todo."],
      ["\xBFCon qu\xE9 simuladores funciona?", "Con iRacing y Le Mans Ultimate (en beta). ACC y Assetto Corsa est\xE1n en desarrollo."],
      ["\xBFQu\xE9 necesito?", "Un PC con Windows donde corras en iRacing o Le Mans Ultimate, para grabar las vueltas. Para verlas, cualquier navegador o la app de Android."],
      ["\xBFQui\xE9n ve mis vueltas?", "Tus vueltas est\xE1n en tu cuenta. En las clasificaciones solo aparece tu vuelta m\xE1s r\xE1pida de cada coche y circuito, con tu nombre p\xFAblico o como An\xF3nimo."],
      ["\xBFEn qu\xE9 se diferencia de ver una repetici\xF3n?", "La repetici\xF3n muestra qu\xE9 pas\xF3. La telemetr\xEDa muestra c\xF3mo, d\xF3nde frenaste, cu\xE1nto acelerador diste y d\xF3nde se fue el tiempo, metro a metro, al lado de una vuelta m\xE1s r\xE1pida."]
    ],
    dl: "Descargar para Windows",
    app: "Abrir la app"
  },
  pt: {
    path: "/pt/telemetria-iracing",
    title: "Telemetria do iRacing, an\xE1lise e overlays \xB7 Pitlane HQ",
    desc: "Telemetria gr\xE1tis para iRacing com o Pitlane HQ. Grave suas voltas, veja onde perde tempo, compare com pilotos mais r\xE1pidos e use overlays no jogo.",
    h1: "Telemetria para iRacing e um coach para suas voltas",
    lead: "O Pitlane HQ grava cada volta que voc\xEA d\xE1 no iRacing e mostra onde voc\xEA perde tempo, contra a sua melhor volta, contra o recorde e contra o piloto logo \xE0 sua frente no mesmo carro. \xC9 gr\xE1tis e funciona no Windows, no Android e na web.",
    cards: [
      ["Telemetria de cada volta", "O Pitlane HQ Agent roda ao lado do iRacing e salva velocidade, acelerador, freio, marcha e volante em cada volta, sem configurar nada. As voltas v\xE3o para a sua conta, ent\xE3o voc\xEA as abre depois na web ou no celular."],
      ["Compare duas voltas", "Velocidade, pedais e a diferen\xE7a de tempo ao longo da volta, o mapa da pista, os setores e os pontos de frenagem. Escolha duas voltas quaisquer, suas, de outra sess\xE3o ou da classifica\xE7\xE3o."],
      ["Um coach com voltas reais", "Para cada carro e pista, o Pitlane HQ aprende com voltas reais de pilotos reais. O coach compara a sua volta com o recorde e com o piloto logo \xE0 frente e diz quais curvas custam mais."],
      ["Telemetria ao vivo no celular", "Enquanto voc\xEA corre, veja a sua telemetria no celular ou no navegador. Compartilhe um c\xF3digo e um amigo tamb\xE9m pode acompanhar."],
      ["Classifica\xE7\xF5es por carro e pista", "A volta mais r\xE1pida de cada piloto em cada carro e pista, por disciplina, oval, sports car, f\xF3rmula, oval de terra e terra."],
      ["Resumo de corrida e iRating", "Depois de cada corrida, o seu resultado, as suas voltas, os seus incidentes, o seu iRating e como voc\xEA foi contra os pilotos ao seu redor."],
      ["Overlays sobre o jogo", "Relative, classifica\xE7\xE3o, radar, barra de delta, combust\xEDvel, pneus, mapa, bandeiras, um coach ao vivo e mais, desenhados pelo Pitlane HQ Agent sobre o iRacing e tamb\xE9m em VR."]
    ],
    recs: "Recordes por carro e pista",
    recsLead: "As voltas mais r\xE1pidas feitas com o Pitlane HQ.",
    faqT: "Perguntas",
    faq: [
      ["O que \xE9 o Pitlane HQ?", "O Pitlane HQ (tamb\xE9m escrito PitlaneHQ) \xE9 um app gr\xE1tis de telemetria para sim racing no iRacing e no Le Mans Ultimate. O Pitlane HQ Agent grava suas voltas no Windows, e a web e o app de celular mostram com um coach, classifica\xE7\xF5es e overlays."],
      ["\xC9 gr\xE1tis?", "Sim. A telemetria, o coach, as classifica\xE7\xF5es e os overlays b\xE1sicos s\xE3o gr\xE1tis, e durante a beta tudo \xE9."],
      ["Com quais simuladores funciona?", "Com o iRacing e o Le Mans Ultimate (em beta). ACC e Assetto Corsa est\xE3o em desenvolvimento."],
      ["Do que eu preciso?", "Um PC com Windows onde voc\xEA corre no iRacing ou no Le Mans Ultimate, para gravar as voltas. Para v\xEA-las, qualquer navegador ou o app de Android."],
      ["Quem v\xEA as minhas voltas?", "As suas voltas ficam na sua conta. Nas classifica\xE7\xF5es aparece s\xF3 a sua volta mais r\xE1pida de cada carro e pista, com o seu nome p\xFAblico ou como An\xF4nimo."],
      ["Qual a diferen\xE7a para ver um replay?", "O replay mostra o que aconteceu. A telemetria mostra como, onde voc\xEA freou, quanto acelerador usou e para onde foi o tempo, metro a metro, ao lado de uma volta mais r\xE1pida."]
    ],
    dl: "Baixar para Windows",
    app: "Abrir o app"
  }
};
var LANDL = {
  en: {
    path: "/le-mans-ultimate-telemetry",
    title: "Le Mans Ultimate telemetry, coach and overlays \xB7 Pitlane HQ",
    desc: "Free Le Mans Ultimate telemetry app, in beta. Record every LMU lap, compare it with faster drivers, see where you lose time and race with overlays.",
    h1: "Le Mans Ultimate telemetry and a coach for your laps",
    lead: "Pitlane HQ records every lap you drive in Le Mans Ultimate and shows where you lose time, against your best lap, the record and the driver just ahead of you in the same car. Le Mans Ultimate support is in beta and free, on Windows, Android and the web.",
    cards: [
      ["Nothing to install in the game", "Pitlane HQ Agent reads the game's own data. Turn on Enable Plugins in the game's Settings \u2192 Gameplay and drive. Every lap is saved with its speed, pedals, gear, steering and official sectors."],
      ["Compare laps and reference laps", "Put two laps side by side, yours or the leaderboard's, with the time gap, the inputs, the racing line on the map and the braking points."],
      ["A coach with real laps", "The coach compares your lap with the record and with the driver just ahead of your pace on the same car and track, and lists the corners that cost the most."],
      ["Overlays for multiclass races", "Relative and standings with class colours, radar, delta bar, fuel, a track map with every class, flags and a dash with TC, ABS, brake bias and the virtual energy left."],
      ["Live on your phone", "Watch position, delta, fuel, the relative and the map on a phone or tablet next to the wheel, over Wi-Fi or mobile data."],
      ["Race summaries and rivals", "After each race, your place, your laps and the field as the game shows it, with the best lap of every rival."],
      ["Leaderboards and leagues", "Your fastest lap of each car and track goes to its leaderboard by itself, and the leagues hub lists Le Mans Ultimate leagues with their Discord."]
    ],
    recs: "Le Mans Ultimate records by car and track",
    recsLead: "The fastest Le Mans Ultimate laps driven with Pitlane HQ.",
    faqT: "Questions",
    faq: [
      ["Is there a free Le Mans Ultimate telemetry app?", "Yes. Pitlane HQ is free. Its Le Mans Ultimate support is in beta, so write to support@pitlanehq.app when something looks wrong."],
      ["How do I turn on LMU telemetry?", "In Le Mans Ultimate open Settings \u2192 Gameplay and turn on Enable Plugins. Pitlane HQ Agent finds the game by itself, with nothing else to install."],
      ["Does it work with Hypercar, LMP2 and LMGT3?", "Yes. Every car of the game is recorded, and the overlays colour each class."],
      ["Does it show the virtual energy?", "Yes. The dash overlay shows the virtual energy left next to TC, ABS, the engine map and the brake bias, and the fuel overlay shows what each lap used and what you may use per lap to finish."],
      ["Can I see my LMU telemetry on the phone?", "Yes. Sign in with the same account on the phone or at pitlanehq.app and press Connect in Telemetry."],
      ["Is there an iRating?", "Le Mans Ultimate has no iRating or licences, so Pitlane HQ shows none for it. Everything else works as in iRacing."]
    ],
    dl: "Download for Windows",
    app: "Open the app"
  },
  es: {
    path: "/es/telemetria-le-mans-ultimate",
    title: "Telemetr\xEDa y overlays para Le Mans Ultimate \xB7 Pitlane HQ",
    desc: "App de telemetr\xEDa gratis para Le Mans Ultimate, en beta. Graba cada vuelta de LMU, comp\xE1rala con pilotos m\xE1s r\xE1pidos y corre con overlays sobre el juego.",
    h1: "Telemetr\xEDa para Le Mans Ultimate y un coach para tus vueltas",
    lead: "Pitlane HQ graba cada vuelta que das en Le Mans Ultimate y te ense\xF1a d\xF3nde pierdes tiempo, frente a tu mejor vuelta, el r\xE9cord y el piloto que va justo por delante con el mismo coche. El soporte de Le Mans Ultimate est\xE1 en beta y es gratis, en Windows, Android y la web.",
    cards: [
      ["Nada que instalar en el juego", "Pitlane HQ Agent lee los datos del propio juego. Activa Enable Plugins en Settings \u2192 Gameplay del juego y conduce. Cada vuelta se guarda con su velocidad, pedales, marcha, volante y sectores oficiales."],
      ["Compara vueltas y vueltas de referencia", "Pon dos vueltas una al lado de la otra, tuyas o de la clasificaci\xF3n, con la diferencia de tiempo, los pedales, la trazada en el mapa y los puntos de frenada."],
      ["Un coach con vueltas reales", "El coach compara tu vuelta con el r\xE9cord y con el piloto justo por encima de tu ritmo en el mismo coche y circuito, y pone primero las curvas que m\xE1s te cuestan."],
      ["Overlays para carreras multiclase", "Relative y clasificaci\xF3n con los colores de cada clase, radar, barra de delta, combustible, mapa con todas las clases, banderas y un dash con TC, ABS, reparto de frenada y la energ\xEDa virtual que queda."],
      ["En vivo en el m\xF3vil", "Mira posici\xF3n, delta, combustible, el relative y el mapa en un m\xF3vil o una tablet junto al volante, con Wi-Fi o datos."],
      ["Res\xFAmenes de carrera y rivales", "Despu\xE9s de cada carrera, tu posici\xF3n, tus vueltas y la parrilla como la muestra el juego, con la mejor vuelta de cada rival."],
      ["Clasificaciones y ligas", "Tu vuelta m\xE1s r\xE1pida de cada coche y circuito entra sola en su clasificaci\xF3n, y el hub de ligas re\xFAne ligas de Le Mans Ultimate con su Discord."]
    ],
    recs: "R\xE9cords de Le Mans Ultimate por coche y circuito",
    recsLead: "Las vueltas m\xE1s r\xE1pidas de Le Mans Ultimate hechas con Pitlane HQ.",
    faqT: "Preguntas",
    faq: [
      ["\xBFHay una app de telemetr\xEDa gratis para Le Mans Ultimate?", "S\xED. Pitlane HQ es gratis. Su soporte de Le Mans Ultimate est\xE1 en beta, as\xED que escribe a support@pitlanehq.app si algo no cuadra."],
      ["\xBFC\xF3mo activo la telemetr\xEDa de LMU?", "En Le Mans Ultimate abre Settings \u2192 Gameplay y activa Enable Plugins. Pitlane HQ Agent encuentra el juego solo, sin instalar nada m\xE1s."],
      ["\xBFFunciona con Hypercar, LMP2 y LMGT3?", "S\xED. Se graba cada coche del juego, y los overlays colorean cada clase."],
      ["\xBFMuestra la energ\xEDa virtual?", "S\xED. El overlay del dash muestra la energ\xEDa virtual que queda junto al TC, el ABS, el mapa motor y el reparto de frenada, y el de combustible lo que gast\xF3 cada vuelta y lo que puedes gastar por vuelta para terminar."],
      ["\xBFPuedo ver mi telemetr\xEDa de LMU en el m\xF3vil?", "S\xED. Entra con la misma cuenta en el m\xF3vil o en pitlanehq.app y pulsa Conectar en Telemetr\xEDa."],
      ["\xBFHay iRating?", "Le Mans Ultimate no tiene iRating ni licencias, as\xED que Pitlane HQ no muestra ninguno. Todo lo dem\xE1s funciona como en iRacing."]
    ],
    dl: "Descargar para Windows",
    app: "Abrir la app"
  },
  pt: {
    path: "/pt/telemetria-le-mans-ultimate",
    title: "Telemetria e overlays para Le Mans Ultimate \xB7 Pitlane HQ",
    desc: "App de telemetria gr\xE1tis para Le Mans Ultimate, em beta. Grave cada volta do LMU, compare com pilotos mais r\xE1pidos e corra com overlays sobre o jogo.",
    h1: "Telemetria para Le Mans Ultimate e um coach para suas voltas",
    lead: "O Pitlane HQ grava cada volta que voc\xEA d\xE1 no Le Mans Ultimate e mostra onde voc\xEA perde tempo, contra a sua melhor volta, o recorde e o piloto logo \xE0 sua frente no mesmo carro. O suporte ao Le Mans Ultimate est\xE1 em beta e \xE9 gr\xE1tis, no Windows, no Android e na web.",
    cards: [
      ["Nada para instalar no jogo", "O Pitlane HQ Agent l\xEA os dados do pr\xF3prio jogo. Ative Enable Plugins em Settings \u2192 Gameplay do jogo e pilote. Cada volta \xE9 salva com velocidade, pedais, marcha, volante e setores oficiais."],
      ["Compare voltas e voltas de refer\xEAncia", "Coloque duas voltas lado a lado, suas ou da classifica\xE7\xE3o, com a diferen\xE7a de tempo, os pedais, o tra\xE7ado no mapa e os pontos de frenagem."],
      ["Um coach com voltas reais", "O coach compara sua volta com o recorde e com o piloto logo acima do seu ritmo no mesmo carro e pista, e mostra primeiro as curvas que mais custam."],
      ["Overlays para corridas multiclasse", "Relative e classifica\xE7\xE3o com as cores de cada classe, radar, barra de delta, combust\xEDvel, mapa com todas as classes, bandeiras e um dash com TC, ABS, balan\xE7o de freio e a energia virtual que resta."],
      ["Ao vivo no celular", "Veja posi\xE7\xE3o, delta, combust\xEDvel, o relative e o mapa num celular ou tablet ao lado do volante, com Wi-Fi ou dados."],
      ["Resumos de corrida e rivais", "Depois de cada corrida, a sua posi\xE7\xE3o, as suas voltas e o grid como o jogo mostra, com a melhor volta de cada rival."],
      ["Classifica\xE7\xF5es e ligas", "Sua volta mais r\xE1pida de cada carro e pista entra sozinha na classifica\xE7\xE3o, e o hub de ligas re\xFAne ligas de Le Mans Ultimate com o Discord delas."]
    ],
    recs: "Recordes do Le Mans Ultimate por carro e pista",
    recsLead: "As voltas mais r\xE1pidas do Le Mans Ultimate feitas com o Pitlane HQ.",
    faqT: "Perguntas",
    faq: [
      ["Existe um app de telemetria gr\xE1tis para Le Mans Ultimate?", "Sim. O Pitlane HQ \xE9 gr\xE1tis. O suporte ao Le Mans Ultimate est\xE1 em beta, ent\xE3o escreva para support@pitlanehq.app se algo parecer errado."],
      ["Como ativo a telemetria do LMU?", "No Le Mans Ultimate abra Settings \u2192 Gameplay e ative Enable Plugins. O Pitlane HQ Agent encontra o jogo sozinho, sem instalar mais nada."],
      ["Funciona com Hypercar, LMP2 e LMGT3?", "Sim. Cada carro do jogo \xE9 gravado, e os overlays colorem cada classe."],
      ["Mostra a energia virtual?", "Sim. O overlay do dash mostra a energia virtual que resta ao lado do TC, do ABS, do mapa do motor e do balan\xE7o de freio, e o de combust\xEDvel o que cada volta gastou e o que voc\xEA pode gastar por volta para terminar."],
      ["Posso ver minha telemetria do LMU no celular?", "Sim. Entre com a mesma conta no celular ou em pitlanehq.app e toque em Conectar em Telemetria."],
      ["Tem iRating?", "O Le Mans Ultimate n\xE3o tem iRating nem licen\xE7as, ent\xE3o o Pitlane HQ n\xE3o mostra nenhum. Todo o resto funciona como no iRacing."]
    ],
    dl: "Baixar para Windows",
    app: "Abrir o app"
  }
};
var LAND_ALTS = altsOf(LAND);
var LANDL_ALTS = altsOf(LANDL);
var OV_IMGS = {
  en: [["ov-l-brakes.png", "Braking markers"], ["ov-l-coach.png", "Coach"], ["ov-g-inputs.png", "Inputs"], ["ov-g-timing.png", "Timing"], ["ov-s-sectors.png", "Mini-sectors"], ["ov-g-tyres.png", "Tyres"], ["ov-weather.png", "Weather"], ["ov-trackbar.png", "Track position bar"]],
  es: [["ov-l-brakes.png", "Marcas de frenada"], ["ov-l-coach.png", "Coach"], ["ov-g-inputs.png", "Pedales"], ["ov-g-timing.png", "Tiempos"], ["ov-s-sectors.png", "Minisectores"], ["ov-g-tyres.png", "Neum\xE1ticos"], ["ov-weather.png", "Clima"], ["ov-trackbar.png", "Barra de posiciones"]],
  pt: [["ov-l-brakes.png", "Marcas de frenagem"], ["ov-l-coach.png", "Coach"], ["ov-g-inputs.png", "Pedais"], ["ov-g-timing.png", "Tempos"], ["ov-s-sectors.png", "Minissetores"], ["ov-g-tyres.png", "Pneus"], ["ov-weather.png", "Clima"], ["ov-trackbar.png", "Barra de posi\xE7\xF5es"]]
};
var OVW = {
  en: {
    listT: "The overlays",
    expT: "Experimental overlays",
    exp: "Live lap compare, DRS and push-to-pass, g-force, mini-sectors, gaps, session stats, telemetry traces and performance (frames a second, CPU, GPU and latency). Switch them on in the Overlays tab.",
    vrT: "Overlays in VR",
    vr: "Every open overlay also shows in the headset as a SteamVR overlay, where it sits on your screen, so moving it on the screen moves it in VR. Meta headsets work through SteamVR. Turn it on in Settings \u2192 VR.",
    howT: "How they work",
    shotsT: "As Pitlane HQ Agent draws them",
    how: ["Drawn natively by Pitlane HQ Agent on Windows, not in a browser window.", "Only the panel shows. The rest is see-through and every click goes to the game.", "Drag and resize them while you place them. They never leave the screen.", "Four presets built in, and your own, saved in your account.", "Six looks, Lane, Wall, Light, Board, Frameless and Classic, for every overlay or a different one for each.", "Each overlay has its own opacity, text size and rows, and can hide by itself in the pits or when you are out of the car.", "Auto opens them when you get in the car and closes them when you get out."]
  },
  es: {
    listT: "Los overlays",
    expT: "Overlays experimentales",
    exp: "Comparaci\xF3n de vueltas en vivo, DRS y push-to-pass, fuerzas g, minisectores, diferencias, estad\xEDsticas de la sesi\xF3n, trazas de telemetr\xEDa y rendimiento (fotogramas por segundo, CPU, GPU y latencia). Se activan en la pesta\xF1a Overlays.",
    vrT: "Overlays en VR",
    vr: "Cada overlay abierto tambi\xE9n se ve en las gafas como un overlay de SteamVR, donde est\xE1 en tu pantalla, as\xED que moverlo en la pantalla lo mueve en VR. Las gafas Meta funcionan a trav\xE9s de SteamVR. Se activa en Ajustes \u2192 VR.",
    howT: "C\xF3mo funcionan",
    shotsT: "Tal como los dibuja Pitlane HQ Agent",
    how: ["Dibujados de forma nativa por Pitlane HQ Agent en Windows, no en una ventana de navegador.", "Solo se ve el panel. El resto es transparente y cada clic va al juego.", "Los arrastras y cambias de tama\xF1o mientras los colocas. Nunca se salen de la pantalla.", "Cuatro presets incluidos y los tuyos, guardados en tu cuenta.", "Seis estilos, Lane, Wall, Light, Board, Frameless y Classic, para todos los overlays o uno distinto para cada uno.", "Cada overlay tiene su propia opacidad, tama\xF1o de texto y filas, y puede ocultarse solo en boxes o al bajarte del coche.", "Auto los abre al subirte al coche y los cierra al bajarte."]
  },
  pt: {
    listT: "Os overlays",
    expT: "Overlays experimentais",
    exp: "Compara\xE7\xE3o de voltas ao vivo, DRS e push-to-pass, for\xE7as g, minissetores, diferen\xE7as, estat\xEDsticas da sess\xE3o, tra\xE7os de telemetria e desempenho (quadros por segundo, CPU, GPU e lat\xEAncia). Ative na aba Overlays.",
    vrT: "Overlays em VR",
    vr: "Cada overlay aberto tamb\xE9m aparece nos \xF3culos como um overlay do SteamVR, onde ele est\xE1 na sua tela, ent\xE3o mov\xEA-lo na tela o move em VR. Os \xF3culos Meta funcionam pelo SteamVR. Ative em Configura\xE7\xF5es \u2192 VR.",
    howT: "Como funcionam",
    shotsT: "Como o Pitlane HQ Agent os desenha",
    how: ["Desenhados de forma nativa pelo Pitlane HQ Agent no Windows, n\xE3o numa janela de navegador.", "S\xF3 o painel aparece. O resto \xE9 transparente e cada clique vai para o jogo.", "Arraste e redimensione enquanto posiciona. Eles nunca saem da tela.", "Quatro presets inclu\xEDdos e os seus, salvos na sua conta.", "Seis estilos, Lane, Wall, Light, Board, Frameless e Classic, para todos os overlays ou um diferente para cada um.", "Cada overlay tem sua pr\xF3pria opacidade, tamanho de texto e linhas, e pode se esconder sozinho nos boxes ou quando voc\xEA sai do carro.", "Auto abre quando voc\xEA entra no carro e fecha quando sai."]
  }
};
var OVL = {
  en: {
    path: "/iracing-overlays",
    title: "iRacing overlays, relative, radar and fuel \xB7 Pitlane HQ",
    desc: "Free iRacing overlays from Pitlane HQ. Relative, standings, radar, delta bar, fuel, tyres, track map, a live coach and more, also in VR through SteamVR.",
    h1: "iRacing overlays",
    lead: "Pitlane HQ Agent draws its overlays itself, on top of iRacing. They are light, sharp and see-through, and every click goes to the game. Place them once, save them as a preset and they open by themselves when you get in the car.",
    faq: [["Do the overlays cost anything?", "The basic overlays are free. During the beta the experimental ones are free too."], ["Do they need anything else?", "Only Pitlane HQ Agent on the Windows PC where you race."], ["Do they work in VR?", "Yes, through SteamVR, Meta headsets included."], ["Do they work in Le Mans Ultimate?", "Yes. The same overlays work in Le Mans Ultimate, in beta."]],
    items: [["Relative", "The cars ahead and behind on track, with the gaps, their trend, the class colours, your driver notes and +1L / \u22121L."], ["Standings", "The positions of the race, the gaps, the last laps and each driver's pace against yours."], ["Radar", "The cars beside and behind you, 60 times a second, with a red side bar and the nearest distance."], ["Delta bar", "Your gap to your best lap, metre by metre, and the lap this pace gives."], ["Fuel", "What each lap uses and what you may use per lap to finish without a stop."], ["Tyres", "Temperatures inside, middle and outside, the pressure and the wear."], ["Track map", "Every car on the track, the official turn numbers and the sectors."], ["Flags", "The start lights, the flags, debris, laps to go and one lap to green."], ["Dash", "Gear, speed, revs, the pedals, ABS and a strip with the lap, the place, the delta and the incidents."], ["Timing", "The official sectors of the lap in purple, green or yellow."], ["Pit stop", "Your speed against the pit lane limit and what the stop is doing."], ["Braking markers", "Where to brake in each corner, from the next level above your best lap."], ["Coach", "The next corner's tip and braking point while you drive, and after it what it gave or took."], ["Inputs", "Throttle, brake, clutch and steering as traces and bars."], ["Engine", "The game's engine warnings, the pit limiter and the rev limiter."], ["Incidents", "Your incident count and what is left before the limit."], ["Weather", "Track and air temperature, the wind against your car, the rain and how wet the track is."], ["Track position bar", "Every car along the lap on one line, class colours and you marked."]]
  },
  es: {
    path: "/es/overlays-iracing",
    title: "Overlays para iRacing, relative, radar y m\xE1s \xB7 Pitlane HQ",
    desc: "Overlays gratis para iRacing. Relative, clasificaci\xF3n, radar, barra de delta, combustible, neum\xE1ticos, mapa, un coach en vivo y m\xE1s, tambi\xE9n en VR.",
    h1: "Overlays para iRacing",
    lead: "Pitlane HQ Agent dibuja sus overlays \xE9l mismo, encima de iRacing. Son ligeros, n\xEDtidos y transparentes, y cada clic va al juego. Col\xF3calos una vez, gu\xE1rdalos como preset y se abren solos al subirte al coche.",
    faq: [["\xBFLos overlays cuestan algo?", "Los overlays b\xE1sicos son gratis. Durante la beta los experimentales tambi\xE9n lo son."], ["\xBFNecesitan algo m\xE1s?", "Solo Pitlane HQ Agent en el PC con Windows donde corres."], ["\xBFFuncionan en VR?", "S\xED, a trav\xE9s de SteamVR, tambi\xE9n con gafas Meta."], ["\xBFFuncionan en Le Mans Ultimate?", "S\xED. Los mismos overlays funcionan en Le Mans Ultimate, en beta."]],
    items: [["Relative", "Los coches delante y detr\xE1s en pista, con las diferencias, su tendencia, los colores de clase, tus notas de pilotos y +1L / \u22121L."], ["Clasificaci\xF3n", "Las posiciones de la carrera, las diferencias, las \xFAltimas vueltas y el ritmo de cada piloto frente al tuyo."], ["Radar", "Los coches a tu lado y detr\xE1s, 60 veces por segundo, con una barra lateral roja y la distancia al m\xE1s cercano."], ["Barra de delta", "Tu diferencia con tu mejor vuelta, metro a metro, y la vuelta que da este ritmo."], ["Combustible", "Lo que gasta cada vuelta y lo que puedes gastar por vuelta para terminar sin parar."], ["Neum\xE1ticos", "Temperaturas por dentro, centro y fuera, la presi\xF3n y el desgaste."], ["Mapa del circuito", "Todos los coches en pista, los n\xFAmeros oficiales de las curvas y los sectores."], ["Banderas", "El sem\xE1foro de salida, las banderas, restos en pista, vueltas restantes y una para la verde."], ["Dash", "Marcha, velocidad, revoluciones, los pedales, el ABS y una tira con la vuelta, la posici\xF3n, el delta y los incidentes."], ["Tiempos", "Los sectores oficiales de la vuelta en morado, verde o amarillo."], ["Parada en boxes", "Tu velocidad frente al l\xEDmite del pit lane y lo que est\xE1 haciendo la parada."], ["Marcas de frenada", "D\xF3nde frenar en cada curva, del siguiente nivel por encima de tu mejor vuelta."], ["Coach", "El consejo y el punto de frenada de la siguiente curva mientras conduces, y al salir lo que ganaste o perdiste."], ["Pedales", "Acelerador, freno, embrague y volante como trazas y barras."], ["Motor", "Los avisos del motor del juego, el limitador de boxes y el corte de revoluciones."], ["Incidentes", "Tus incidentes y lo que queda hasta el l\xEDmite."], ["Clima", "Temperatura de pista y aire, el viento contra tu coche, la lluvia y lo mojada que est\xE1 la pista."], ["Barra de posiciones", "Todos los coches a lo largo de la vuelta en una l\xEDnea, con los colores de clase y t\xFA marcado."]]
  },
  pt: {
    path: "/pt/overlays-iracing",
    title: "Overlays para iRacing, relative, radar e mais \xB7 Pitlane HQ",
    desc: "Overlays gr\xE1tis para iRacing do Pitlane HQ. Relative, classifica\xE7\xE3o, radar, barra de delta, combust\xEDvel, pneus, mapa, um coach ao vivo e mais, tamb\xE9m em VR.",
    h1: "Overlays para iRacing",
    lead: "O Pitlane HQ Agent desenha seus overlays sozinho, sobre o iRacing. S\xE3o leves, n\xEDtidos e transparentes, e cada clique vai para o jogo. Posicione uma vez, salve como preset e eles abrem sozinhos quando voc\xEA entra no carro.",
    faq: [["Os overlays custam algo?", "Os overlays b\xE1sicos s\xE3o gr\xE1tis. Durante a beta os experimentais tamb\xE9m s\xE3o."], ["Precisam de mais alguma coisa?", "S\xF3 do Pitlane HQ Agent no PC com Windows onde voc\xEA corre."], ["Funcionam em VR?", "Sim, pelo SteamVR, tamb\xE9m com \xF3culos Meta."], ["Funcionam no Le Mans Ultimate?", "Sim. Os mesmos overlays funcionam no Le Mans Ultimate, em beta."]],
    items: [["Relative", "Os carros \xE0 frente e atr\xE1s na pista, com as diferen\xE7as, a tend\xEAncia, as cores de classe, suas notas de pilotos e +1L / \u22121L."], ["Classifica\xE7\xE3o", "As posi\xE7\xF5es da corrida, as diferen\xE7as, as \xFAltimas voltas e o ritmo de cada piloto contra o seu."], ["Radar", "Os carros ao seu lado e atr\xE1s, 60 vezes por segundo, com uma barra lateral vermelha e a dist\xE2ncia do mais pr\xF3ximo."], ["Barra de delta", "A sua diferen\xE7a para a sua melhor volta, metro a metro, e a volta que esse ritmo d\xE1."], ["Combust\xEDvel", "O que cada volta gasta e o que voc\xEA pode gastar por volta para terminar sem parar."], ["Pneus", "Temperaturas por dentro, meio e fora, a press\xE3o e o desgaste."], ["Mapa da pista", "Todos os carros na pista, os n\xFAmeros oficiais das curvas e os setores."], ["Bandeiras", "As luzes de largada, as bandeiras, detritos, voltas restantes e uma para a verde."], ["Dash", "Marcha, velocidade, rota\xE7\xE3o, os pedais, o ABS e uma faixa com a volta, a posi\xE7\xE3o, o delta e os incidentes."], ["Tempos", "Os setores oficiais da volta em roxo, verde ou amarelo."], ["Pit stop", "A sua velocidade contra o limite do pit lane e o que a parada est\xE1 fazendo."], ["Marcas de frenagem", "Onde frear em cada curva, do pr\xF3ximo n\xEDvel acima da sua melhor volta."], ["Coach", "A dica e o ponto de frenagem da pr\xF3xima curva enquanto voc\xEA pilota, e na sa\xEDda o que voc\xEA ganhou ou perdeu."], ["Pedais", "Acelerador, freio, embreagem e volante como tra\xE7os e barras."], ["Motor", "Os avisos do motor do jogo, o limitador do pit e o corte de giro."], ["Incidentes", "Seus incidentes e o que falta at\xE9 o limite."], ["Clima", "Temperatura da pista e do ar, o vento contra o seu carro, a chuva e o quanto a pista est\xE1 molhada."], ["Barra de posi\xE7\xF5es", "Todos os carros ao longo da volta numa linha, com as cores de classe e voc\xEA marcado."]]
  }
};
var OVLL = {
  en: {
    path: "/le-mans-ultimate-overlays",
    title: "Le Mans Ultimate overlays, relative and radar \xB7 Pitlane HQ",
    desc: "Free Le Mans Ultimate overlays from Pitlane HQ, in beta. A multiclass relative, standings, radar, delta bar, fuel, track map and a dash with virtual energy.",
    h1: "Le Mans Ultimate overlays",
    lead: "Pitlane HQ Agent draws its overlays on top of Le Mans Ultimate, read from the game's own data. They are see-through, every click goes to the game, and they open by themselves when you get in the car. Le Mans Ultimate support is in beta.",
    faq: [["Are there free Le Mans Ultimate overlays?", "Yes. The basic overlays are free, and during the beta everything is."], ["What do I need to install?", "Only Pitlane HQ Agent on Windows. In the game, turn on Settings \u2192 Gameplay \u2192 Enable Plugins."], ["Do they work in VR?", "Yes. Every open overlay also shows in the headset through SteamVR."], ["Is there a fuel calculator?", "The fuel overlay is not a calculator you fill in. It measures each lap and shows what you may use per lap to finish without a stop, and the dash shows the virtual energy left."]],
    items: [["Relative", "The cars ahead and behind on track with the gaps, their trend, the colours of each class and +1L / \u22121L, made for multiclass races."], ["Standings", "Overall and by class, the gaps, the last laps and each driver's pace against yours."], ["Radar", "The cars beside and behind you, with a red side bar and the nearest distance."], ["Delta bar", "Your gap to your best lap, metre by metre, and the lap this pace gives."], ["Fuel", "What each lap uses and what you may use per lap to finish without a stop."], ["Dash", "Gear, speed, revs, the pedals, TC, ABS, engine map, brake bias and the virtual energy and battery left."], ["Track map", "Every car on the track coloured by class, the turns and the sectors."], ["Flags", "The start lights, the flags and the laps to go."], ["Timing", "The official sectors of the lap in purple, green or yellow."], ["Tyres", "Temperatures inside, middle and outside, and the pressure."], ["Pit stop", "Your speed on the pit road and whether the pit limiter is on."], ["Braking markers", "Where to brake in each corner, from the next level above your best lap."], ["Coach", "The next corner's tip and braking point while you drive."], ["Weather", "Track and air temperature and the wind against your car."], ["Track position bar", "Every car along the lap on one line, coloured by class."]]
  },
  es: {
    path: "/es/overlays-le-mans-ultimate",
    title: "Overlays para Le Mans Ultimate, relative y radar \xB7 Pitlane HQ",
    desc: "Overlays gratis para Le Mans Ultimate de Pitlane HQ, en beta. Relative multiclase, clasificaci\xF3n, radar, delta, combustible, mapa y un dash con energ\xEDa virtual.",
    h1: "Overlays para Le Mans Ultimate",
    lead: "Pitlane HQ Agent dibuja sus overlays encima de Le Mans Ultimate, con los datos del propio juego. Son transparentes, cada clic va al juego y se abren solos al subirte al coche. El soporte de Le Mans Ultimate est\xE1 en beta.",
    faq: [["\xBFHay overlays gratis para Le Mans Ultimate?", "S\xED. Los overlays b\xE1sicos son gratis, y durante la beta lo es todo."], ["\xBFQu\xE9 tengo que instalar?", "Solo Pitlane HQ Agent en Windows. En el juego, activa Settings \u2192 Gameplay \u2192 Enable Plugins."], ["\xBFFuncionan en VR?", "S\xED. Cada overlay abierto tambi\xE9n se ve en las gafas a trav\xE9s de SteamVR."], ["\xBFHay una calculadora de combustible?", "El overlay de combustible no es una calculadora que rellenas. Mide cada vuelta y te dice lo que puedes gastar por vuelta para terminar sin parar, y el dash muestra la energ\xEDa virtual que queda."]],
    items: [["Relative", "Los coches delante y detr\xE1s en pista con las diferencias, su tendencia, los colores de cada clase y +1L / \u22121L, pensado para carreras multiclase."], ["Clasificaci\xF3n", "General y por clase, las diferencias, las \xFAltimas vueltas y el ritmo de cada piloto frente al tuyo."], ["Radar", "Los coches a tu lado y detr\xE1s, con una barra lateral roja y la distancia al m\xE1s cercano."], ["Barra de delta", "Tu diferencia con tu mejor vuelta, metro a metro, y la vuelta que da este ritmo."], ["Combustible", "Lo que gasta cada vuelta y lo que puedes gastar por vuelta para terminar sin parar."], ["Dash", "Marcha, velocidad, revoluciones, los pedales, TC, ABS, mapa motor, reparto de frenada y la energ\xEDa virtual y la bater\xEDa que quedan."], ["Mapa del circuito", "Todos los coches en pista con el color de su clase, las curvas y los sectores."], ["Banderas", "El sem\xE1foro de salida, las banderas y las vueltas restantes."], ["Tiempos", "Los sectores oficiales de la vuelta en morado, verde o amarillo."], ["Neum\xE1ticos", "Temperaturas por dentro, centro y fuera, y la presi\xF3n."], ["Parada en boxes", "Tu velocidad en el pit lane y si el limitador est\xE1 puesto."], ["Marcas de frenada", "D\xF3nde frenar en cada curva, del siguiente nivel por encima de tu mejor vuelta."], ["Coach", "El consejo y el punto de frenada de la siguiente curva mientras conduces."], ["Clima", "Temperatura de pista y aire y el viento contra tu coche."], ["Barra de posiciones", "Todos los coches a lo largo de la vuelta en una l\xEDnea, con el color de su clase."]]
  },
  pt: {
    path: "/pt/overlays-le-mans-ultimate",
    title: "Overlays para Le Mans Ultimate, relative e radar \xB7 Pitlane HQ",
    desc: "Overlays gr\xE1tis para Le Mans Ultimate, em beta. Relative multiclasse, classifica\xE7\xE3o, radar, delta, combust\xEDvel, mapa e um dash com energia virtual.",
    h1: "Overlays para Le Mans Ultimate",
    lead: "O Pitlane HQ Agent desenha seus overlays sobre o Le Mans Ultimate, com os dados do pr\xF3prio jogo. S\xE3o transparentes, cada clique vai para o jogo e eles abrem sozinhos quando voc\xEA entra no carro. O suporte ao Le Mans Ultimate est\xE1 em beta.",
    faq: [["Existem overlays gr\xE1tis para Le Mans Ultimate?", "Sim. Os overlays b\xE1sicos s\xE3o gr\xE1tis, e durante a beta tudo \xE9."], ["O que preciso instalar?", "S\xF3 o Pitlane HQ Agent no Windows. No jogo, ative Settings \u2192 Gameplay \u2192 Enable Plugins."], ["Funcionam em VR?", "Sim. Cada overlay aberto tamb\xE9m aparece nos \xF3culos pelo SteamVR."], ["Tem uma calculadora de combust\xEDvel?", "O overlay de combust\xEDvel n\xE3o \xE9 uma calculadora para preencher. Ele mede cada volta e mostra o que voc\xEA pode gastar por volta para terminar sem parar, e o dash mostra a energia virtual que resta."]],
    items: [["Relative", "Os carros \xE0 frente e atr\xE1s na pista com as diferen\xE7as, a tend\xEAncia, as cores de cada classe e +1L / \u22121L, feito para corridas multiclasse."], ["Classifica\xE7\xE3o", "Geral e por classe, as diferen\xE7as, as \xFAltimas voltas e o ritmo de cada piloto contra o seu."], ["Radar", "Os carros ao seu lado e atr\xE1s, com uma barra lateral vermelha e a dist\xE2ncia do mais pr\xF3ximo."], ["Barra de delta", "A sua diferen\xE7a para a sua melhor volta, metro a metro, e a volta que esse ritmo d\xE1."], ["Combust\xEDvel", "O que cada volta gasta e o que voc\xEA pode gastar por volta para terminar sem parar."], ["Dash", "Marcha, velocidade, rota\xE7\xE3o, os pedais, TC, ABS, mapa do motor, balan\xE7o de freio e a energia virtual e a bateria que restam."], ["Mapa da pista", "Todos os carros na pista com a cor da classe, as curvas e os setores."], ["Bandeiras", "As luzes de largada, as bandeiras e as voltas restantes."], ["Tempos", "Os setores oficiais da volta em roxo, verde ou amarelo."], ["Pneus", "Temperaturas por dentro, meio e fora, e a press\xE3o."], ["Pit stop", "A sua velocidade no pit lane e se o limitador est\xE1 ligado."], ["Marcas de frenagem", "Onde frear em cada curva, do pr\xF3ximo n\xEDvel acima da sua melhor volta."], ["Coach", "A dica e o ponto de frenagem da pr\xF3xima curva enquanto voc\xEA pilota."], ["Clima", "Temperatura da pista e do ar e o vento contra o seu carro."], ["Barra de posi\xE7\xF5es", "Todos os carros ao longo da volta numa linha, com a cor da classe."]]
  }
};
var OVL_ALTS = altsOf(OVL);
var OVLL_ALTS = altsOf(OVLL);
function overlaysPage(l, game) {
  const O = (game === "lmu" ? OVLL : OVL)[l], W2 = OVW[l], L = (game === "lmu" ? LANDL : LAND)[l];
  const shots = OV_IMGS[l];
  const body = `<h1>${esc4(O.h1)}</h1><p class="lead">${esc4(O.lead)}</p>
<div class="cta"><a class="btn p" href="/dl/PitlaneHQ-Setup.exe">${esc4(L.dl)}</a><a class="btn" href="${L.path}">${esc4(T2[l].tel[game])}</a></div>
<h2>${esc4(W2.listT)}</h2><div class="g">${O.items.map(([h, p]) => `<section class="c"><h3>${esc4(h)}</h3><p>${esc4(p)}</p></section>`).join("")}</div>
<h2>${esc4(W2.shotsT)}</h2><div class="ovs">${shots.map(([f, c]) => `<figure>${img(l, f, c)}<figcaption>${esc4(c)}</figcaption></figure>`).join("")}</div>
<h2>${esc4(W2.expT)}</h2><p>${esc4(W2.exp)}</p>
<h2>${esc4(W2.vrT)}</h2><p>${esc4(W2.vr)}</p>
<h2>${esc4(W2.howT)}</h2><ul>${W2.how.map((x) => `<li>${esc4(x)}</li>`).join("")}</ul>
<h2>${esc4(L.faqT)}</h2>${O.faq.map(([q2, a]) => `<details open><summary>${esc4(q2)}</summary><p>${esc4(a)}</p></details>`).join("")}
${game === "lmu" ? `<p class="x">${esc4(T2[l].other.lmu)} <a href="${OVL[l].path}">${esc4(OVL[l].h1)} \u2192</a></p>` : `<p class="x">${esc4(T2[l].other.iracing)} <a href="${OVLL[l].path}">${esc4(OVLL[l].h1)} \u2192</a></p>`}`;
  const ld = [
    crumbs(game === "lmu" ? [["Pitlane HQ", LAND[l].path], ["Le Mans Ultimate", LANDL[l].path], [O.h1, O.path]] : [["Pitlane HQ", LAND[l].path], [O.h1, O.path]]),
    appLd(l, O.desc, shots.map(([f]) => f)),
    faqLd(O.faq)
  ];
  return html(page3(l, { title: O.title, desc: O.desc, path: O.path, alts: game === "lmu" ? OVLL_ALTS : OVL_ALTS, body, ld, game }));
}
__name(overlaysPage, "overlaysPage");
var LG_CAT = {
  en: { oval: "oval", sports_car: "sports-car", formula_car: "formula", dirt_oval: "dirt-oval", dirt_road: "dirt-road" },
  es: { oval: "ovalo", sports_car: "sports-car", formula_car: "formula", dirt_oval: "ovalo-de-tierra", dirt_road: "tierra" },
  pt: { oval: "oval", sports_car: "sports-car", formula_car: "formula", dirt_oval: "oval-de-terra", dirt_road: "terra" }
};
var LG_DAYS = { en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], es: ["Lun", "Mar", "Mi\xE9", "Jue", "Vie", "S\xE1b", "Dom"], pt: ["Seg", "Ter", "Qua", "Qui", "Sex", "S\xE1b", "Dom"] };
var LG_MIN = 3;
var LGW = {
  en: {
    posted: "Leagues posted on Pitlane HQ",
    byCat: "By discipline",
    all: "All",
    post: "Post your league for free",
    join: "Join the Discord",
    site: "Website",
    online: "online",
    members: "members",
    none: "No leagues yet.",
    upd: "Updated",
    open: "Looking for drivers",
    races: "Races",
    cars: "Cars",
    lang: "Language",
    see: "See it in Pitlane HQ"
  },
  es: {
    posted: "Ligas publicadas en Pitlane HQ",
    byCat: "Por disciplina",
    all: "Todas",
    post: "Publica tu liga gratis",
    join: "Unirse al Discord",
    site: "Web",
    online: "conectados",
    members: "miembros",
    none: "A\xFAn no hay ligas.",
    upd: "Actualizado",
    open: "Busca pilotos",
    races: "Corre",
    cars: "Coches",
    lang: "Idioma",
    see: "Verla en Pitlane HQ"
  },
  pt: {
    posted: "Ligas publicadas no Pitlane HQ",
    byCat: "Por disciplina",
    all: "Todas",
    post: "Publique sua liga de gra\xE7a",
    join: "Entrar no Discord",
    site: "Site",
    online: "online",
    members: "membros",
    none: "Ainda n\xE3o h\xE1 ligas.",
    upd: "Atualizado",
    open: "Procura pilotos",
    races: "Corre",
    cars: "Carros",
    lang: "Idioma",
    see: "Ver no Pitlane HQ"
  }
};
var LEAG = {
  en: {
    path: "/iracing-leagues",
    title: "iRacing leagues to join, with their Discord \xB7 Pitlane HQ",
    catT: /* @__PURE__ */ __name((c) => `iRacing ${c} leagues to join \xB7 Pitlane HQ`, "catT"),
    desc: "Find an iRacing league to race in. Leagues looking for drivers, the days they race and how many drivers are on their Discord right now.",
    catD: /* @__PURE__ */ __name((c) => `${cap(c)} leagues on iRacing you can join, with the days they race, their Discord and how many drivers are online now.`, "catD"),
    h1: "iRacing leagues",
    catH: /* @__PURE__ */ __name((c) => `iRacing ${c} leagues`, "catH"),
    lead: "Leagues to race in on iRacing, posted by their organisers on Pitlane HQ, and the most active leagues sorted by how many drivers are on their Discord right now. Join one in a click, or post your own league for free.",
    catLead: /* @__PURE__ */ __name((c) => `iRacing ${c} leagues to race in, posted by their organisers on Pitlane HQ or found on Reddit, sorted by how many drivers are on their Discord right now.`, "catLead"),
    active: "The most active iRacing leagues",
    any: "iRacing league",
    catQ: /* @__PURE__ */ __name((c) => [`Where do I find an iRacing ${c} league?`, `Here, sorted by how many drivers are online on its Discord. Every card links to the league's Discord or website.`], "catQ"),
    faq: [
      ["How do I join an iRacing league?", "Pick a league here and join its Discord or its website. The organisers say there when the league races, which cars and tracks it uses and how to sign up."],
      ["Do iRacing leagues cost anything?", "Most leagues are free to join. You need an iRacing subscription and the cars and tracks the league races with."],
      ["How are these leagues chosen?", "Some are posted by their organisers on Pitlane HQ. The others are leagues posted on Reddit with a Discord invite, and every few hours Pitlane HQ reads how many members each Discord has and how many are online."],
      ["Can I add my league?", "Yes. Create a free Pitlane HQ account and post it in Community \u2192 Leagues with its race days, its start time, its Discord or its website."]
    ]
  },
  es: {
    path: "/es/ligas-iracing",
    title: "Ligas de iRacing para unirte, con su Discord \xB7 Pitlane HQ",
    catT: /* @__PURE__ */ __name((c) => `Ligas de ${c} de iRacing para unirte \xB7 Pitlane HQ`, "catT"),
    desc: "Encuentra una liga de iRacing en la que correr. Ligas que buscan pilotos, los d\xEDas que corren y cu\xE1ntos pilotos hay ahora en su Discord.",
    catD: /* @__PURE__ */ __name((c) => `Ligas de ${c} en iRacing a las que puedes unirte, con los d\xEDas que corren, su Discord y cu\xE1ntos pilotos hay conectados ahora.`, "catD"),
    h1: "Ligas de iRacing",
    catH: /* @__PURE__ */ __name((c) => `Ligas de ${c} de iRacing`, "catH"),
    lead: "Ligas en las que correr en iRacing, publicadas por sus organizadores en Pitlane HQ, y las ligas m\xE1s activas ordenadas por cu\xE1ntos pilotos hay ahora mismo en su Discord. \xDAnete a una con un clic, o publica tu liga gratis.",
    catLead: /* @__PURE__ */ __name((c) => `Ligas de ${c} de iRacing en las que correr, publicadas por sus organizadores en Pitlane HQ o encontradas en Reddit, ordenadas por cu\xE1ntos pilotos hay ahora en su Discord.`, "catLead"),
    active: "Las ligas de iRacing m\xE1s activas",
    any: "Liga de iRacing",
    catQ: /* @__PURE__ */ __name((c) => [`\xBFD\xF3nde encuentro una liga de ${c} de iRacing?`, `Aqu\xED, ordenadas por cu\xE1ntos pilotos hay conectados en su Discord. Cada tarjeta lleva al Discord o a la web de la liga.`], "catQ"),
    faq: [
      ["\xBFC\xF3mo me uno a una liga de iRacing?", "Elige una liga aqu\xED y entra en su Discord o en su web. Los organizadores cuentan ah\xED cu\xE1ndo corre la liga, con qu\xE9 coches y circuitos, y c\xF3mo apuntarte."],
      ["\xBFCuestan algo las ligas de iRacing?", "La mayor\xEDa de las ligas son gratis. Necesitas una suscripci\xF3n de iRacing y los coches y circuitos con los que corre la liga."],
      ["\xBFC\xF3mo se eligen estas ligas?", "Unas las publican sus organizadores en Pitlane HQ. Las dem\xE1s son ligas publicadas en Reddit con una invitaci\xF3n de Discord, y cada pocas horas Pitlane HQ lee cu\xE1ntos miembros tiene cada Discord y cu\xE1ntos est\xE1n conectados."],
      ["\xBFPuedo a\xF1adir mi liga?", "S\xED. Crea una cuenta gratis de Pitlane HQ y publ\xEDcala en Comunidad \u2192 Ligas con sus d\xEDas de carrera, su hora de inicio, su Discord o su web."]
    ]
  },
  pt: {
    path: "/pt/ligas-iracing",
    title: "Ligas de iRacing para entrar, com o Discord \xB7 Pitlane HQ",
    catT: /* @__PURE__ */ __name((c) => `Ligas de ${c} do iRacing para entrar \xB7 Pitlane HQ`, "catT"),
    desc: "Encontre uma liga de iRacing para correr. Ligas que procuram pilotos, os dias em que correm e quantos pilotos est\xE3o no Discord delas agora.",
    catD: /* @__PURE__ */ __name((c) => `Ligas de ${c} no iRacing em que voc\xEA pode entrar, com os dias em que correm, o Discord e quantos pilotos est\xE3o online agora.`, "catD"),
    h1: "Ligas de iRacing",
    catH: /* @__PURE__ */ __name((c) => `Ligas de ${c} do iRacing`, "catH"),
    lead: "Ligas para correr no iRacing, publicadas pelos organizadores no Pitlane HQ, e as ligas mais ativas ordenadas por quantos pilotos est\xE3o no Discord delas agora. Entre numa com um clique, ou publique sua liga de gra\xE7a.",
    catLead: /* @__PURE__ */ __name((c) => `Ligas de ${c} do iRacing para correr, publicadas pelos organizadores no Pitlane HQ ou encontradas no Reddit, ordenadas por quantos pilotos est\xE3o no Discord agora.`, "catLead"),
    active: "As ligas de iRacing mais ativas",
    any: "Liga de iRacing",
    catQ: /* @__PURE__ */ __name((c) => [`Onde encontro uma liga de ${c} do iRacing?`, `Aqui, ordenadas por quantos pilotos est\xE3o online no Discord. Cada cart\xE3o leva ao Discord ou ao site da liga.`], "catQ"),
    faq: [
      ["Como entro numa liga de iRacing?", "Escolha uma liga aqui e entre no Discord ou no site dela. Os organizadores contam l\xE1 quando a liga corre, com quais carros e pistas e como se inscrever."],
      ["As ligas de iRacing custam algo?", "A maioria das ligas \xE9 gr\xE1tis. Voc\xEA precisa de uma assinatura do iRacing e dos carros e pistas com que a liga corre."],
      ["Como essas ligas s\xE3o escolhidas?", "Algumas s\xE3o publicadas pelos organizadores no Pitlane HQ. As outras s\xE3o ligas publicadas no Reddit com um convite do Discord, e a cada poucas horas o Pitlane HQ l\xEA quantos membros cada Discord tem e quantos est\xE3o online."],
      ["Posso adicionar minha liga?", "Sim. Crie uma conta gr\xE1tis no Pitlane HQ e publique em Comunidade \u2192 Ligas com os dias de corrida, a hora de in\xEDcio, o Discord ou o site."]
    ]
  }
};
var LEAGL = {
  en: {
    path: "/le-mans-ultimate-leagues",
    title: "Le Mans Ultimate leagues to join \xB7 Pitlane HQ",
    desc: "Find a Le Mans Ultimate league to race in. LMU leagues looking for drivers, the days they race and how many drivers are on their Discord right now.",
    h1: "Le Mans Ultimate leagues",
    lead: "Leagues to race in on Le Mans Ultimate, posted by their organisers on Pitlane HQ or found on Reddit, sorted by how many drivers are on their Discord right now. Join one in a click, or post your own league for free.",
    active: "The most active Le Mans Ultimate leagues",
    any: "Le Mans Ultimate league",
    faq: [
      ["How do I join a Le Mans Ultimate league?", "Pick a league here and join its Discord or its website. The organisers say there when it races, which classes and tracks it uses and how to sign up."],
      ["Do LMU leagues cost anything?", "Most are free to join. You need Le Mans Ultimate and the content the league races with."],
      ["How are these leagues chosen?", "Some are posted by their organisers on Pitlane HQ. The others are leagues posted on Reddit with a Discord invite, and every few hours Pitlane HQ reads how many members each Discord has and how many are online."],
      ["Can I add my league?", "Yes. Create a free Pitlane HQ account and post it in Community \u2192 Leagues, choosing Le Mans Ultimate."]
    ]
  },
  es: {
    path: "/es/ligas-le-mans-ultimate",
    title: "Ligas de Le Mans Ultimate para unirte \xB7 Pitlane HQ",
    desc: "Encuentra una liga de Le Mans Ultimate en la que correr. Ligas de LMU que buscan pilotos, los d\xEDas que corren y cu\xE1ntos pilotos hay ahora en su Discord.",
    h1: "Ligas de Le Mans Ultimate",
    lead: "Ligas en las que correr en Le Mans Ultimate, publicadas por sus organizadores en Pitlane HQ o encontradas en Reddit, ordenadas por cu\xE1ntos pilotos hay ahora en su Discord. \xDAnete a una con un clic, o publica tu liga gratis.",
    active: "Las ligas de Le Mans Ultimate m\xE1s activas",
    any: "Liga de Le Mans Ultimate",
    faq: [
      ["\xBFC\xF3mo me uno a una liga de Le Mans Ultimate?", "Elige una liga aqu\xED y entra en su Discord o en su web. Los organizadores cuentan ah\xED cu\xE1ndo corre, con qu\xE9 clases y circuitos, y c\xF3mo apuntarte."],
      ["\xBFCuestan algo las ligas de LMU?", "La mayor\xEDa son gratis. Necesitas Le Mans Ultimate y el contenido con el que corre la liga."],
      ["\xBFC\xF3mo se eligen estas ligas?", "Unas las publican sus organizadores en Pitlane HQ. Las dem\xE1s son ligas publicadas en Reddit con una invitaci\xF3n de Discord, y cada pocas horas Pitlane HQ lee cu\xE1ntos miembros tiene cada Discord y cu\xE1ntos est\xE1n conectados."],
      ["\xBFPuedo a\xF1adir mi liga?", "S\xED. Crea una cuenta gratis de Pitlane HQ y publ\xEDcala en Comunidad \u2192 Ligas, eligiendo Le Mans Ultimate."]
    ]
  },
  pt: {
    path: "/pt/ligas-le-mans-ultimate",
    title: "Ligas de Le Mans Ultimate para entrar \xB7 Pitlane HQ",
    desc: "Encontre uma liga de Le Mans Ultimate para correr. Ligas de LMU que procuram pilotos, os dias em que correm e quantos pilotos est\xE3o no Discord agora.",
    h1: "Ligas de Le Mans Ultimate",
    lead: "Ligas para correr no Le Mans Ultimate, publicadas pelos organizadores no Pitlane HQ ou encontradas no Reddit, ordenadas por quantos pilotos est\xE3o no Discord agora. Entre numa com um clique, ou publique sua liga de gra\xE7a.",
    active: "As ligas de Le Mans Ultimate mais ativas",
    any: "Liga de Le Mans Ultimate",
    faq: [
      ["Como entro numa liga de Le Mans Ultimate?", "Escolha uma liga aqui e entre no Discord ou no site dela. Os organizadores contam l\xE1 quando corre, com quais classes e pistas e como se inscrever."],
      ["As ligas de LMU custam algo?", "A maioria \xE9 gr\xE1tis. Voc\xEA precisa do Le Mans Ultimate e do conte\xFAdo com que a liga corre."],
      ["Como essas ligas s\xE3o escolhidas?", "Algumas s\xE3o publicadas pelos organizadores no Pitlane HQ. As outras s\xE3o ligas publicadas no Reddit com um convite do Discord, e a cada poucas horas o Pitlane HQ l\xEA quantos membros cada Discord tem e quantos est\xE3o online."],
      ["Posso adicionar minha liga?", "Sim. Crie uma conta gr\xE1tis no Pitlane HQ e publique em Comunidade \u2192 Ligas, escolhendo Le Mans Ultimate."]
    ]
  }
};
var LEAG_ALTS = altsOf(LEAG);
var LEAGL_ALTS = altsOf(LEAGL);
var lgPath = /* @__PURE__ */ __name((l, cat) => LEAG[l].path + (cat ? "/" + LG_CAT[l][cat] : ""), "lgPath");
var lgAlts = /* @__PURE__ */ __name((cat) => ({ en: lgPath("en", cat), es: lgPath("es", cat), pt: lgPath("pt", cat) }), "lgAlts");
var LG_CN = {
  en: { oval: "oval", sports_car: "sports car", formula_car: "formula", dirt_oval: "dirt oval", dirt_road: "dirt road" },
  es: { oval: "\xF3valo", sports_car: "Sports Car", formula_car: "f\xF3rmula", dirt_oval: "\xF3valo de tierra", dirt_road: "tierra" },
  pt: { oval: "oval", sports_car: "Sports Car", formula_car: "f\xF3rmula", dirt_oval: "oval de terra", dirt_road: "terra" }
};
async function postedLeagues(env, game) {
  const r4 = await env.DB.prepare("SELECT id, name, about, cats, days, time, tz, open, discord, web, cars, lang, updated FROM leagues WHERE game=?1 ORDER BY open DESC, updated DESC LIMIT 100").bind(game).all().catch(() => ({ results: [] }));
  const lst = /* @__PURE__ */ __name((v) => {
    try {
      return JSON.parse(v || "[]") || [];
    } catch (e) {
      return [];
    }
  }, "lst");
  return (r4.results || []).map((x) => ({ ...x, cats: lst(x.cats), days: lst(x.days).map(Number).filter((d) => d >= 0 && d <= 6) }));
}
__name(postedLeagues, "postedLeagues");
async function leaguesData(env, game = "iracing") {
  const [posted, F2] = await Promise.all([postedLeagues(env, game), foundLeagues(env, false, game).catch(() => ({ leagues: [] }))]);
  const lastPost = Math.max(0, ...posted.map((x) => +x.updated || 0));
  return { posted, found: F2.leagues || [], updated: Math.max(F2.updated || 0, lastPost) };
}
__name(leaguesData, "leaguesData");
var catCounts = /* @__PURE__ */ __name((D) => {
  const n = {};
  for (const x of D.posted.concat(D.found)) for (const c of x.cats || []) n[c] = (n[c] || 0) + 1;
  return n;
}, "catCounts");
async function leaguesPage(env, l, cat, game = "iracing") {
  const lmu = game === "lmu", G = (lmu ? LEAGL : LEAG)[l], W2 = LGW[l], D = await leaguesData(env, game), has = /* @__PURE__ */ __name((x) => !cat || (x.cats || []).includes(cat), "has");
  const posted = D.posted.filter(has), found = D.found.filter(has).slice(0, 40);
  if ((cat || lmu) && !posted.length && !found.length) return notFound(l);
  const cn = cat ? LG_CN[l][cat] : "", path = lmu ? G.path : lgPath(l, cat), num4 = /* @__PURE__ */ __name((n) => Number(n || 0).toLocaleString(HLANG[l]), "num");
  const counts = catCounts(D), cats = lmu ? [] : Object.keys(CAT2.en).filter((k) => counts[k]);
  const catsOf2 = /* @__PURE__ */ __name((x) => (lmu ? [] : (x.cats || []).map((c) => CAT2[l][c] || c)).join(" \xB7 ") || G.any, "catsOf");
  const ext = /* @__PURE__ */ __name((u) => /^https:\/\//.test(String(u || "")) ? esc4(u) : "", "ext");
  const postedHTML = posted.map((x) => `<section class="c lg"><h3>${esc4(fix2(x.name))}</h3><p class="m k">${esc4(catsOf2(x))}${x.open ? ` \xB7 <b class="on">${esc4(W2.open)}</b>` : ""}</p>
${x.days.length ? `<p style="margin:0 0 4px">${esc4(W2.races)} ${esc4(x.days.map((d) => LG_DAYS[l][d]).join(", "))}${x.time ? ` \xB7 ${esc4(x.time)}${x.tz ? ` (${esc4(x.tz)})` : ""}` : ""}</p>` : ""}${x.cars ? `<p class="m" style="margin:0 0 4px">${esc4(W2.cars)} ${esc4(fix2(x.cars))}</p>` : ""}${x.lang ? `<p class="m" style="margin:0 0 4px">${esc4(W2.lang)} ${esc4(x.lang)}</p>` : ""}${x.about ? `<p class="m" style="font-size:14px;margin:6px 0 10px">${esc4(fix2(x.about).slice(0, 400))}</p>` : ""}
<p style="margin:8px 0 0">${ext(x.discord) ? `<a class="btn" href="${ext(x.discord)}" rel="nofollow noopener" target="_blank">${esc4(W2.join)}</a> ` : ""}${ext(x.web) ? `<a class="btn" href="${ext(x.web)}" rel="nofollow noopener" target="_blank">${esc4(W2.site)}</a> ` : ""}<a href="/?league=${encodeURIComponent(x.id)}" rel="nofollow">${esc4(W2.see)}</a></p></section>`).join("");
  const foundHTML = found.map((x) => `<section class="c lg">${x.icon ? `<img src="${esc4(x.icon)}" alt="" width="44" height="44" loading="lazy" decoding="async">` : ""}<h3>${esc4(fix2(x.name))}</h3><p class="m k">${esc4(catsOf2(x))}</p><p style="margin:0 0 6px"><b class="on">${num4(x.online)}</b> ${esc4(W2.online)} \xB7 <b>${num4(x.members)}</b> ${esc4(W2.members)}</p>${x.title ? `<p class="m" style="font-size:14px;margin:0 0 10px">${esc4(fix2(x.title))}</p>` : ""}<a class="btn" href="${esc4(x.invite)}" rel="nofollow noopener" target="_blank">${esc4(W2.join)}</a></section>`).join("");
  const faq = cat ? [G.catQ(cn), ...G.faq] : G.faq;
  const otherLg = lmu ? `<p class="x"><a href="${LEAG[l].path}">${esc4(LEAG[l].h1)} \u2192</a></p>` : HAS.lmuLeagues ? `<p class="x"><a href="${LEAGL[l].path}">${esc4(LEAGL[l].h1)} \u2192</a></p>` : "";
  const body = `<h1>${esc4(cat ? G.catH(cn) : G.h1)}</h1><p class="lead">${esc4(cat ? G.catLead(cn) : G.lead)}</p>
<div class="cta"><a class="btn p" href="/?league-post=1" rel="nofollow">${esc4(W2.post)}</a><a class="btn" href="${(lmu ? LANDL : LAND)[l].path}">${esc4(T2[l].tel[game])}</a></div>
${cats.length ? `<div class="cats" aria-label="${esc4(W2.byCat)}"><a href="${lgPath(l)}"${cat ? "" : ' class="on"'}>${esc4(W2.all)}</a>${cats.map((k) => `<a href="${lgPath(l, k)}"${k === cat ? ' class="on"' : ""}>${esc4(CAT2[l][k])}</a>`).join("")}</div>` : ""}
${posted.length ? `<h2>${esc4(W2.posted)}</h2><div class="g">${postedHTML}</div>` : ""}
${found.length ? `<h2>${esc4(G.active)}</h2><div class="g">${foundHTML}</div>${D.updated ? `<p class="m" style="font-size:14px">${esc4(W2.upd)} ${day(D.updated)}</p>` : ""}` : ""}
${!posted.length && !found.length ? `<p class="m">${esc4(W2.none)}</p>` : ""}
<h2>${esc4(LAND[l].faqT)}</h2>${faq.map(([q2, a]) => `<details open><summary>${esc4(q2)}</summary><p>${esc4(a)}</p></details>`).join("")}${otherLg}`;
  const root = lmu ? [["Pitlane HQ", LAND[l].path], ["Le Mans Ultimate", LANDL[l].path], [G.h1, G.path]] : [["Pitlane HQ", LAND[l].path], [G.h1, G.path]];
  const ld = [crumbs(cat ? [...root, [CAT2[l][cat], path]] : root), faqLd(faq)];
  const thin = cat ? posted.length + found.length < LG_MIN : !posted.length && !found.length;
  return html(page3(l, { title: cat ? G.catT(cn) : G.title, desc: cat ? G.catD(cn) : G.desc, path, alts: lmu ? LEAGL_ALTS : lgAlts(cat), body, ld, noindex: thin, game }), 1800);
}
__name(leaguesPage, "leaguesPage");
var REC_IDX = { iracing: { en: "/records", es: "/es/records", pt: "/pt/records" }, lmu: { en: "/le-mans-ultimate-records", es: "/es/records-le-mans-ultimate", pt: "/pt/recordes-le-mans-ultimate" } };
async function topCombos(env, n, game = "iracing") {
  const r4 = await env.DB.prepare(
    "SELECT track_id AS t, MAX(track) AS track, car_id AS c, MAX(car) AS car, COUNT(DISTINCT user_id) AS drivers, MIN(time) AS best, MAX(cat) AS hint, MAX(created) AS upd FROM community_laps WHERE game=?2 AND track_id>0 AND car_id>0 AND COALESCE(shown,'')<>'model' GROUP BY track_id, car_id ORDER BY drivers DESC, best LIMIT ?1"
  ).bind(n, game).all().catch(() => ({ results: [] }));
  return (r4.results || []).map((x) => ({ ...x, car: famName(game, x.c, x.car) }));
}
__name(topCombos, "topCombos");
var recPath = /* @__PURE__ */ __name((l, x, game = "iracing") => `${PRE2[l]}/records/${game === "lmu" ? "lmu/" : ""}${x.t}-${x.c}/${slug2(fix2(x.track) + " " + fix2(x.car))}`, "recPath");
var recAlts = /* @__PURE__ */ __name((x, game) => ({ en: recPath("en", x, game), es: recPath("es", x, game), pt: recPath("pt", x, game) }), "recAlts");
var catFor = /* @__PURE__ */ __name((cm, game, x, hint, track2, car) => game === "lmu" ? "sports_car" : catOf(cm, x.t, x.c, hint, track2, car), "catFor");
async function landing(env, l, game) {
  const lmu = game === "lmu", L = (lmu ? LANDL : LAND)[l], combos2 = await topCombos(env, 8, game);
  const guides = lmu ? [...TOPICS.filter((x) => x.game === "lmu").map((x) => x[l]), OVLL[l], ...HAS.lmuLeagues ? [LEAGL[l]] : [], ...lmuToo(l)] : [...TOPICS.filter((x) => x.game !== "lmu").map((x) => x[l]), OVL[l], LEAG[l]];
  const body = `<h1>${esc4(L.h1)}</h1><p class="lead">${esc4(L.lead)}</p>
<div class="cta"><a class="btn p" href="/dl/PitlaneHQ-Setup.exe">${esc4(L.dl)}</a><a class="btn" href="/">${esc4(L.app)}</a></div>
<div class="g">${L.cards.map(([h, p]) => `<section class="c"><h2>${esc4(h)}</h2><p>${esc4(p)}</p></section>`).join("")}</div>
${shot(l, lmu ? "coach.jpg" : "compare.jpg")}
<h2 id="start">${esc4(START[l].t)}</h2><ol>${START[l].steps(GNAME[game]).map((x) => `<li>${esc4(x)}</li>`).join("")}</ol>
${cross(l, game)}
<h2>${esc4(GUIDES[l])}</h2><div class="g">${guides.map((x) => `<a class="c" href="${x.path}"><h3>${esc4(x.h1)} \u2192</h3><p>${esc4(x.desc)}</p></a>`).join("")}</div>
${combos2.length ? `<h2>${esc4(L.recs)}</h2><p class="m">${esc4(L.recsLead)}</p><div class="tw"><table><tbody>${combos2.map((x) => `<tr><td><a href="${recPath(l, x, game)}">${esc4(fix2(x.track))}</a></td><td class="m">${esc4(fix2(x.car))}</td><td class="t">${fmt2(x.best)}</td></tr>`).join("")}</tbody></table></div><p><a href="${REC_IDX[game][l]}">${esc4(T2[l].rec)} \u2192</a></p>` : ""}
<h2>${esc4(L.faqT)}</h2>${L.faq.map(([q2, a]) => `<details><summary>${esc4(q2)}</summary><p>${esc4(a)}</p></details>`).join("")}`;
  const ld = [...lmu ? [crumbs([["Pitlane HQ", LAND[l].path], ["Le Mans Ultimate", L.path]])] : [], appLd(l, L.desc, [lmu ? "coach.jpg" : "compare.jpg"], L.cards.map(([h]) => h)), ...siteLd(l), howToLd(l, GNAME[game], L.path), faqLd(L.faq)];
  return html(page3(l, { title: L.title, desc: L.desc, path: L.path, alts: lmu ? LANDL_ALTS : LAND_ALTS, body, ld, game }));
}
__name(landing, "landing");
async function recordsIndex(env, l, cat, game = "iracing") {
  const all = await topCombos(env, 1e3, game), cm = game === "lmu" ? { tc: {}, c: {} } : await catMap(env).catch(() => ({ tc: {}, c: {} }));
  if (game === "lmu" && !all.length) return notFound(l);
  const gn = GNAME[game], rows = all.map((x) => ({ ...x, cat: catFor(cm, game, x, x.hint, x.track, x.car) }));
  const cats = Object.keys(CAT2.en).filter((k) => rows.some((x) => x.cat === k));
  const list = cat ? rows.filter((x) => x.cat === cat) : rows;
  const W2 = S2[l], A = REC_IDX[game], base2 = A[l], q2 = cat ? "?d=" + cat : "", path = base2 + q2;
  const title = `${W2.recH(gn)}${cat ? " \xB7 " + CAT2[l][cat] : ""} \xB7 Pitlane HQ`, desc = W2.recD(gn);
  const body = `<h1>${esc4(W2.recH(gn))}</h1><p class="lead">${esc4(desc)}</p>
${cats.length > 1 ? `<div class="cats"><a href="${base2}"${cat ? "" : ' class="on"'}>${esc4(W2.all)}</a>${cats.map((k) => `<a href="${base2}?d=${k}"${k === cat ? ' class="on"' : ""}>${esc4(CAT2[l][k])}</a>`).join("")}</div>` : ""}
${list.length ? `<div class="tw"><table><thead><tr><th>${esc4(W2.track)}</th><th>${esc4(W2.car)}</th><th>${esc4(W2.record)}</th><th>${esc4(W2.drivers)}</th></tr></thead><tbody>${list.map((x) => `<tr><td><a href="${recPath(l, x, game)}">${esc4(fix2(x.track))}</a></td><td class="m">${esc4(fix2(x.car))}</td><td class="t">${fmt2(x.best)}</td><td class="m">${x.drivers}</td></tr>`).join("")}</tbody></table></div>` : `<p class="m">${esc4(W2.none)}</p>`}
<h2>${esc4(W2.howT)}</h2><p>${esc4(W2.how(gn))}</p>
<h2>${esc4(LAND[l].faqT)}</h2>${W2.faq(gn).map(([q3, a]) => `<details open><summary>${esc4(q3)}</summary><p>${esc4(a)}</p></details>`).join("")}${cross(l, game)}`;
  const root = game === "lmu" ? [["Pitlane HQ", LAND[l].path], ["Le Mans Ultimate", LANDL[l].path], [T2[l].rec, base2]] : [["Pitlane HQ", LAND[l].path], [T2[l].rec, base2]];
  const ld = [
    crumbs(root),
    { "@context": "https://schema.org", "@type": "ItemList", name: W2.recH(gn), itemListElement: list.slice(0, 100).map((x, i) => ({ "@type": "ListItem", position: i + 1, url: SITE5 + recPath(l, x, game), name: fix2(x.car) + " \xB7 " + fix2(x.track) })) },
    faqLd(W2.faq(gn))
  ];
  return html(page3(l, { title, desc, path, alts: { en: A.en + q2, es: A.es + q2, pt: A.pt + q2 }, body, ld, noindex: !list.length, game }));
}
__name(recordsIndex, "recordsIndex");
async function recordsCombo(env, l, t, c, asked, game = "iracing") {
  c = await famId(env, game, c);
  const nm = await env.DB.prepare("SELECT MAX(track) AS track, MAX(car) AS car FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3").bind(t, c, game).first().catch(() => null);
  if (!nm || !nm.track) return null;
  nm.car = famName(game, c, nm.car);
  const canon = recPath(l, { t, c, track: nm.track, car: nm.car }, game);
  if (asked !== canon) return Response.redirect(SITE5 + canon, 301);
  const r4 = await env.DB.prepare(
    `SELECT l.user_id AS uid, CASE WHEN l.anon=1 OR COALESCE(ac.anon,0)=1 OR u.alias='Anonymous' THEN '' ELSE u.alias END AS alias, l.time, l.created, l.track, l.car, l.cat
       FROM community_laps l JOIN community_users u ON u.id=l.user_id LEFT JOIN accounts ac ON ac.id=l.user_id
      WHERE l.track_id=?1 AND l.car_id=?2 AND l.game=?3 AND COALESCE(l.shown,'')<>'model' ORDER BY l.time LIMIT 300`
  ).bind(t, c, game).all().catch(() => ({ results: [] }));
  const seen2 = /* @__PURE__ */ new Set(), laps = [];
  for (const x2 of r4.results || []) {
    if (seen2.has(x2.uid)) continue;
    seen2.add(x2.uid);
    laps.push(x2);
    if (laps.length >= 50) break;
  }
  if (!laps.length) return null;
  const gn = GNAME[game], track2 = fix2(nm.track), car = fix2(nm.car), cm = game === "lmu" ? { tc: {}, c: {} } : await catMap(env).catch(() => ({ tc: {}, c: {} }));
  const x = { t, c, track: track2, car }, cat = catFor(cm, game, x, laps[0].cat, laps[0].track, laps[0].car);
  const W2 = S2[l], rec = fmt2(laps[0].time), idx = REC_IDX[game][l];
  const title = recTitle(W2, car, track2, game), desc = W2.cD(car, track2, rec, laps.length, gn), L = (game === "lmu" ? LANDL : LAND)[l];
  const body = `<p class="m"><a href="${idx}">${esc4(W2.recH(gn))}</a>${game === "lmu" ? "" : ` \xB7 <a href="${idx}?d=${cat}">${esc4(CAT2[l][cat] || "")}</a>`}</p>
<h1>${esc4(car)}<br><span class="m" style="font-size:.7em">${esc4(track2)}</span></h1>
<p class="lead">${esc4(W2.cL(rec))}</p>
<div class="tw"><table><thead><tr><th class="n">#</th><th>${esc4(W2.driver)}</th><th>${esc4(W2.time)}</th><th>${esc4(W2.date)}</th></tr></thead><tbody>${laps.map((v, i) => `<tr><td class="n">${i + 1}</td><td>${esc4(v.alias || W2.anon)}</td><td class="t">${fmt2(v.time)}</td><td class="m">${day(v.created)}</td></tr>`).join("")}</tbody></table></div>
<div class="c" style="margin-top:22px"><h2>${esc4(W2.cQ)}</h2><p>${esc4(W2.cA(gn))}</p><div class="cta" style="margin-bottom:0"><a class="btn p" href="/dl/PitlaneHQ-Setup.exe">${esc4(L.dl)}</a><a class="btn" href="${L.path}">${esc4(T2[l].tel[game])}</a></div></div>`;
  const ld = [crumbs([["Pitlane HQ", LAND[l].path], ...game === "lmu" ? [["Le Mans Ultimate", LANDL[l].path]] : [], [T2[l].rec, idx], [car + " \xB7 " + track2, recPath(l, x, game)]])];
  return html(page3(l, { title, desc, path: recPath(l, x, game), alts: recAlts(x, game), body, ld, game, mod: later2(SEO_DATE, day(Math.max(0, ...laps.map((v) => +v.created || 0)))) }));
}
__name(recordsCombo, "recordsCombo");
var notFound = /* @__PURE__ */ __name((l) => noIndex(html(page3(l, {
  title: S2[l].nfT + " \xB7 Pitlane HQ",
  desc: S2[l].nf,
  path: null,
  noindex: true,
  body: `<h1>${esc4(S2[l].nf)}</h1><p><a href="${LAND[l].path}">${esc4(T2[l].tel.iracing)}</a> \xB7 <a href="${LANDL[l].path}">${esc4(T2[l].tel.lmu)}</a> \xB7 <a href="${REC_IDX.iracing[l]}">${esc4(T2[l].rec)}</a> \xB7 <a href="/">${esc4(T2[l].app)}</a></p>`
}), 600, 404)), "notFound");
var noIndex = /* @__PURE__ */ __name((r4) => {
  r4.headers.set("x-robots-tag", "noindex");
  r4.headers.set("cache-control", "public, max-age=60");
  return r4;
}, "noIndex");
var topicAlts = /* @__PURE__ */ __name((x) => altsOf(x), "topicAlts");
function topicPage(x, l) {
  const G = x[l], lmu = x.game === "lmu", L = (lmu ? LANDL : LAND)[l], game = lmu ? "lmu" : "iracing";
  const more = lmu ? lmuLinks(l).filter(([p]) => p !== G.path).concat(lmuToo(l).map((x2) => [x2.path, x2.h1])) : iracingLinks(l).filter(([p]) => p !== G.path).concat([[L.path, L.h1]]);
  const to = x.lmu ? x.lmu === "tel" ? LANDL[l] : x.lmu === "ov" ? OVLL[l] : TOPIC_BY[x.lmu] ? TOPIC_BY[x.lmu][l] : null : lmu ? TOPIC_BY.coach[l] : null;
  const body = `<h1>${esc4(G.h1)}</h1><p class="lead">${esc4(G.lead)}</p>
<div class="cta"><a class="btn p" href="/dl/PitlaneHQ-Setup.exe">${esc4(L.dl)}</a><a class="btn" href="/">${esc4(L.app)}</a></div>
<div class="g">${G.secs.map(([h, p]) => `<section class="c"><h2>${esc4(h)}</h2><p>${esc4(p)}</p></section>`).join("")}</div>
${x.img ? shot(l, x.img) : ""}${x.phones ? phones(l, x.phones) : ""}
${to ? `<p class="x">${esc4(T2[l].other[game])} <a href="${to.path}">${esc4(to.h1)} \u2192</a></p>` : ""}
<h2>${esc4(L.faqT)}</h2>${G.faq.map(([q2, a]) => `<details open><summary>${esc4(q2)}</summary><p>${esc4(a)}</p></details>`).join("")}
<h2>${esc4(GUIDES[l])}</h2><ul>${more.map(([p, h]) => `<li><a href="${p}">${esc4(h)}</a></li>`).join("")}</ul>`;
  const ld = [
    crumbs(lmu ? [["Pitlane HQ", LAND[l].path], ["Le Mans Ultimate", LANDL[l].path], [G.h1, G.path]] : [["Pitlane HQ", LAND[l].path], [G.h1, G.path]]),
    faqLd(G.faq),
    appLd(l, G.desc, x.img ? [x.img] : x.phones || [])
  ];
  return html(page3(l, { title: G.title, desc: G.desc, path: G.path, alts: topicAlts(x), body, ld, game }));
}
__name(topicPage, "topicPage");
var PAGES = [
  { alts: LAND_ALTS, draw: /* @__PURE__ */ __name((env, l) => landing(env, l, "iracing"), "draw"), alias: { en: ["/telemetry"], es: ["/es/telemetria", "/es"], pt: ["/pt/telemetria", "/pt", "/pt-br"] } },
  { alts: LANDL_ALTS, draw: /* @__PURE__ */ __name((env, l) => landing(env, l, "lmu"), "draw"), alias: { en: ["/lmu-telemetry", "/le-mans-ultimate", "/lmu"], es: ["/es/telemetria-lmu", "/es/le-mans-ultimate", "/es/lmu"], pt: ["/pt/telemetria-lmu", "/pt/le-mans-ultimate", "/pt/lmu"] } },
  { alts: OVL_ALTS, draw: /* @__PURE__ */ __name((env, l) => overlaysPage(l, "iracing"), "draw"), alias: { en: ["/overlays"], es: ["/es/overlays"], pt: ["/pt/overlays"] } },
  { alts: OVLL_ALTS, draw: /* @__PURE__ */ __name((env, l) => overlaysPage(l, "lmu"), "draw"), alias: { en: ["/lmu-overlays"], es: ["/es/overlays-lmu"], pt: ["/pt/overlays-lmu"] } },
  { alts: LEAG_ALTS, draw: /* @__PURE__ */ __name((env, l) => leaguesPage(env, l, "", "iracing"), "draw"), alias: { en: ["/leagues"], es: ["/es/ligas"], pt: ["/pt/ligas"] } },
  { alts: LEAGL_ALTS, draw: /* @__PURE__ */ __name((env, l) => leaguesPage(env, l, "", "lmu"), "draw"), alias: { en: ["/lmu-leagues"], es: ["/es/ligas-lmu"], pt: ["/pt/ligas-lmu"] } },
  { alts: REC_IDX.iracing, draw: /* @__PURE__ */ __name((env, l, cat) => recordsIndex(env, l, cat, "iracing"), "draw"), alias: {} },
  { alts: REC_IDX.lmu, draw: /* @__PURE__ */ __name((env, l, cat) => recordsIndex(env, l, cat, "lmu"), "draw"), alias: { en: ["/lmu-records"], es: ["/es/records-lmu"], pt: ["/pt/recordes-lmu"] } },
  ...TOPICS.map((x) => ({ alts: topicAlts(x), draw: /* @__PURE__ */ __name((env, l) => topicPage(x, l), "draw"), alias: x.id === "lmu-coach" ? { en: ["/lmu-coach"], es: ["/es/coach-lmu"], pt: ["/pt/coach-lmu"] } : {} }))
];
var AT = /* @__PURE__ */ new Map();
for (const pg of PAGES) for (const l of LANGS2) {
  AT.set(pg.alts[l], [pg, l, pg.alts[l]]);
  for (const a of pg.alias[l] || []) AT.set(a, [pg, l, pg.alts[l]]);
}
var STATIC_ALTS = [LAND_ALTS, LANDL_ALTS, OVL_ALTS, OVLL_ALTS, ...TOPICS.map(topicAlts)];
async function sitemap(env) {
  const [combos2, lmuCombos, D, DL] = await Promise.all([topCombos(env, 2e3), topCombos(env, 2e3, "lmu"), leaguesData(env), leaguesData(env, "lmu")]);
  const u = /* @__PURE__ */ __name((p, f, pr, alts, mod) => `<url><loc>${SITE5}${p}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ""}<changefreq>${f}</changefreq><priority>${pr}</priority>${alts ? LANGS2.map((k) => `<xhtml:link rel="alternate" hreflang="${HLANG[k]}" href="${SITE5}${alts[k]}"/>`).join("") + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE5}${alts.en}"/>` : ""}</url>`, "u");
  const newest = /* @__PURE__ */ __name((cs) => later2(SEO_DATE, day(Math.max(0, ...cs.map((x) => x.upd || 0)))), "newest");
  const s = [u("/", "weekly", "1.0", null, newest(combos2))];
  const all = /* @__PURE__ */ __name((alts, f, pr, mod) => {
    for (const k of LANGS2) s.push(u(alts[k], f, k === "en" ? pr : (pr - 0.1).toFixed(1), alts, mod));
  }, "all");
  all(LAND_ALTS, "weekly", 0.9, newest(combos2));
  all(LANDL_ALTS, "weekly", 0.9, newest(lmuCombos));
  all(OVL_ALTS, "monthly", 0.8, SEO_DATE);
  all(OVLL_ALTS, "monthly", 0.8, SEO_DATE);
  for (const x of TOPICS) all(topicAlts(x), "monthly", 0.8, SEO_DATE);
  const lgDay = /* @__PURE__ */ __name((d) => later2(SEO_DATE, day(d.updated)), "lgDay");
  all(LEAG_ALTS, "daily", 0.8, lgDay(D));
  const n = catCounts(D);
  for (const c of Object.keys(CAT2.en)) if ((n[c] || 0) >= LG_MIN) all(lgAlts(c), "daily", 0.7, lgDay(D));
  if (DL.posted.length + DL.found.length) all(LEAGL_ALTS, "daily", 0.8, lgDay(DL));
  all(REC_IDX.iracing, "daily", 0.8, newest(combos2));
  if (lmuCombos.length) all(REC_IDX.lmu, "daily", 0.8, newest(lmuCombos));
  s.push(u("/downloads", "weekly", "0.7", null, SEO_DATE), u("/changelog", "weekly", "0.4", null, SEO_DATE));
  for (const [game, cs] of [["iracing", combos2], ["lmu", lmuCombos]]) for (const x of cs) all(recAlts(x, game), "daily", 0.6, day(x.upd) || SEO_DATE);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${s.join("\n")}
</urlset>
`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
__name(sitemap, "sitemap");
var INDEXNOW_KEY = "1fbc105af121e0dcfc14e13a8740813a";
async function indexNow(env) {
  if (env.LOCAL === "1") return;
  const row = await env.DB.prepare("SELECT v FROM app_state WHERE k='indexnow_at'").first().catch(() => null);
  const ver = await env.DB.prepare("SELECT v FROM app_state WHERE k='indexnow_ver'").first().catch(() => null);
  const full = !ver || ver.v !== SEO_VER;
  let last = full ? 0 : +(row && row.v || 0);
  if (!full && Date.now() - last < 20 * 36e5) return;
  const tried = await env.DB.prepare("SELECT at FROM app_state WHERE k='indexnow_last'").first().catch(() => null);
  if (tried && Date.now() - tried.at < 6 * 36e5 && !(last > tried.at)) {
    const okBefore = await env.DB.prepare("SELECT v FROM app_state WHERE k='indexnow_last'").first().catch(() => null);
    if (!okBefore || !/^"?\{?.*"said":"2\d\d/.test(okBefore.v || "")) return;
  }
  const fresh = await env.DB.prepare(
    "SELECT game, track_id AS t, MAX(track) AS track, car_id AS c, MAX(car) AS car FROM community_laps WHERE game IN ('iracing','lmu') AND track_id>0 AND car_id>0 AND created>?1 GROUP BY game, track_id, car_id LIMIT 4000"
  ).bind(last).all().catch(() => ({ results: [] }));
  const rows = fresh.results || [], urls = [];
  if (!last) {
    const [D, DL, lmuCombos] = await Promise.all([leaguesData(env), leaguesData(env, "lmu"), topCombos(env, 1, "lmu")]);
    const n = catCounts(D);
    urls.push(
      "/",
      ...STATIC_ALTS.flatMap((a) => Object.values(a)),
      ...Object.values(LEAG_ALTS),
      ...Object.values(REC_IDX.iracing),
      "/downloads",
      "/changelog",
      ...Object.keys(CAT2.en).filter((c) => (n[c] || 0) >= LG_MIN).flatMap((c) => Object.values(lgAlts(c))),
      ...DL.posted.length + DL.found.length ? Object.values(LEAGL_ALTS) : [],
      ...lmuCombos.length ? Object.values(REC_IDX.lmu) : []
    );
  } else for (const g of ["iracing", "lmu"]) if (rows.some((x) => (x.game || "iracing") === g)) urls.push(...Object.values(REC_IDX[g]));
  for (const x of rows) {
    const g = x.game === "lmu" ? "lmu" : "iracing";
    urls.push(...Object.values(recAlts({ ...x, car: famName(g, x.c, x.car) }, g)));
  }
  if (urls.length) {
    const r4 = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: "pitlanehq.app", key: INDEXNOW_KEY, keyLocation: `${SITE5}/${INDEXNOW_KEY}.txt`, urlList: [...new Set(urls)].slice(0, 1e4).map((u) => SITE5 + u) })
    }).catch(() => null);
    const said = r4 ? r4.status + " " + (await r4.text().catch(() => "")).slice(0, 200) : "no answer";
    await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('indexnow_last', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(JSON.stringify({ said, urls: urls.length }), Date.now()).run().catch(() => {
    });
    if (!r4 || r4.status >= 300) return;
  }
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('indexnow_at', ?1, ?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(String(Date.now())).run().catch(() => {
  });
  if (full) await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES ('indexnow_ver', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind(SEO_VER, Date.now()).run().catch(() => {
  });
}
__name(indexNow, "indexNow");
var mdLink = /* @__PURE__ */ __name(([path, h, d]) => `- [${h}](${SITE5}${path})${d ? ": " + d : ""}`, "mdLink");
var ABOUT = "Pitlane HQ (also written PitlaneHQ) is a free sim racing telemetry app for iRacing and Le Mans Ultimate. Le Mans Ultimate support is in beta, and ACC and Assetto Corsa are in development. Pitlane HQ Agent, a Windows program, runs next to the game and records every lap by itself. The web app and the Android app show the laps with a coach that compares them with real faster laps, lap comparison, braking points, leaderboards by car and track, race summaries with the iRating and leagues to join. Pitlane HQ Agent also draws overlays on top of the game, in six looks and in VR, and sends live telemetry to a phone. Everything is free during the beta. The pages are in English, Spanish and Portuguese (Brazil).";
function llmsTxt() {
  const l = "en", g = /* @__PURE__ */ __name((x) => [x.path, x.h1, x.desc], "g");
  const ir = [g(LAND.en), g(OVL.en), ...TOPICS.filter((x) => x.game !== "lmu").map((x) => g(x.en)), g(LEAG.en), [REC_IDX.iracing.en, S2.en.recH("iRacing"), S2.en.recD("iRacing")]];
  const lm = [
    g(LANDL.en),
    g(OVLL.en),
    ...TOPICS.filter((x) => x.game === "lmu").map((x) => g(x.en)),
    ...HAS.lmuLeagues ? [g(LEAGL.en)] : [],
    ...HAS.lmuRecords ? [[REC_IDX.lmu.en, S2.en.recH("Le Mans Ultimate"), S2.en.recD("Le Mans Ultimate")]] : []
  ];
  const other = LANGS2.filter((k) => k !== l).flatMap((k) => [[LAND[k].path, LAND[k].h1 + " (" + NAME[k] + ")"], [LANDL[k].path, LANDL[k].h1 + " (" + NAME[k] + ")"]]);
  return `# Pitlane HQ

> Free iRacing and Le Mans Ultimate telemetry with a lap coach, overlays, leaderboards and leagues, on Windows, the web and Android.

${ABOUT}

- Website and web app ${SITE5}/
- Download ${SITE5}/downloads
- Support support@pitlanehq.app

## iRacing

${ir.map(mdLink).join("\n")}

## Le Mans Ultimate

${lm.map(mdLink).join("\n")}

## Download

${[["/downloads", "Download Pitlane HQ", "Pitlane HQ Agent for Windows and the Android app"], ["/changelog", "What's new", "the release notes of every version"]].map(mdLink).join("\n")}

## Optional

${[["/llms-full.txt", "Full texts", "every English page above, whole"], ...other, ["/privacy", "Privacy policy"], ["/terms", "Terms of service"]].map(mdLink).join("\n")}
`;
}
__name(llmsTxt, "llmsTxt");
function llmsFull() {
  const l = "en", qa = /* @__PURE__ */ __name((faq) => faq.map(([q2, a]) => `### ${q2}

${a}`).join("\n\n"), "qa");
  const sec = /* @__PURE__ */ __name((path, h1, lead, parts, faq) => `# ${h1}

${SITE5}${path}

${lead}

${parts.map(([h, p]) => `## ${h}

${p}`).join("\n\n")}${faq && faq.length ? "\n\n## " + LAND[l].faqT + "\n\n" + qa(faq) : ""}`, "sec");
  const land = /* @__PURE__ */ __name((L, gn) => sec(L.path, L.h1, L.lead, [...L.cards, [START[l].t, START[l].steps(gn).map((x, i) => `${i + 1}. ${x}`).join("\n")]], L.faq), "land");
  const W2 = OVW[l], ov = /* @__PURE__ */ __name((O) => sec(O.path, O.h1, O.lead, [...O.items, [W2.expT, W2.exp], [W2.vrT, W2.vr], [W2.howT, W2.how.map((x) => "- " + x).join("\n")]], O.faq), "ov");
  return [
    `# Pitlane HQ

${ABOUT}`,
    land(LAND[l], "iRacing"),
    ov(OVL[l]),
    ...TOPICS.filter((x) => x.game !== "lmu").map((x) => sec(x[l].path, x[l].h1, x[l].lead, x[l].secs, x[l].faq)),
    land(LANDL[l], "Le Mans Ultimate"),
    ov(OVLL[l]),
    ...TOPICS.filter((x) => x.game === "lmu").map((x) => sec(x[l].path, x[l].h1, x[l].lead, x[l].secs, x[l].faq)),
    sec(LEAG[l].path, LEAG[l].h1, LEAG[l].lead, [], LEAG[l].faq),
    sec(REC_IDX.iracing[l], S2[l].recH("iRacing"), S2[l].recD("iRacing"), [[S2[l].howT, S2[l].how("iRacing")]], S2[l].faq("iRacing"))
  ].join("\n\n---\n\n") + "\n";
}
__name(llmsFull, "llmsFull");
var LLMS = { "/llms.txt": llmsTxt, "/llms-full.txt": llmsFull };
var BOT = /(Googlebot|Google-InspectionTool|bingbot|YandexBot|DuckDuckBot|DuckAssistBot|Applebot|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|CCBot|Amazonbot|meta-externalagent|MistralAI-User)/i;
async function noteBot(req, env, p) {
  const m = BOT.exec(req.headers.get("user-agent") || "");
  if (!m || !env.DB) return;
  await env.DB.prepare("INSERT INTO app_state (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v=excluded.v, at=excluded.at").bind("bot_" + m[1].toLowerCase(), JSON.stringify({ path: p.slice(0, 200) }), Date.now()).run().catch(() => {
  });
}
__name(noteBot, "noteBot");
var RECORD_RE = /^(?:\/(es|pt))?\/records\/(?:(lmu)\/)?(\d+)-(\d+)(?:\/[a-z0-9-]*)?$/;
var LEAGUE_CAT_RE = /^(?:\/(es|pt))?\/(?:iracing-leagues|ligas-iracing)\/([a-z-]+)$/;
var isPublic = /* @__PURE__ */ __name((p) => p === "/sitemap.xml" || AT.has(p) || RECORD_RE.test(p) || LEAGUE_CAT_RE.test(p) || /^(\/(es|pt))?\/records\//.test(p), "isPublic");
async function draw(req, env, url, p) {
  if (p === "/sitemap.xml") return sitemap(env);
  await readHas(env);
  const at2 = /* @__PURE__ */ __name((canon, show) => url.pathname === canon ? show() : Response.redirect(SITE5 + canon + url.search, 301), "at");
  const hit = AT.get(p);
  if (hit) {
    const [pg, l, canon] = hit, dsc = url.searchParams.get("d");
    return at2(canon, () => pg.draw(env, l, CAT2.en[dsc] ? dsc : ""));
  }
  {
    const lm = LEAGUE_CAT_RE.exec(p);
    if (lm) {
      const l = lm[1] || "en", cat = Object.keys(LG_CAT[l]).find((k) => LG_CAT[l][k] === lm[2]);
      if (cat && LEAG[l].path === p.slice(0, p.lastIndexOf("/"))) return at2(p, () => leaguesPage(env, l, cat));
      return notFound(l);
    }
  }
  const m = RECORD_RE.exec(p);
  if (m) return await recordsCombo(env, m[1] || "en", +m[3], +m[4], url.pathname, m[2] ? "lmu" : "iracing") || notFound(m[1] || "en");
  return notFound(p.startsWith("/es") ? "es" : p.startsWith("/pt") ? "pt" : "en");
}
__name(draw, "draw");
async function seoPage(req, env, url, ctx) {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  const p = url.pathname.replace(/\/+$/, "") || "/";
  await noteBot(req, env, p);
  if (p === "/" + INDEXNOW_KEY + ".txt") return new Response(INDEXNOW_KEY, { headers: { "content-type": "text/plain; charset=utf-8" } });
  if (LLMS[p]) {
    await readHas(env);
    const t = LLMS[p]();
    return new Response(req.method === "HEAD" ? null : t, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600", "x-robots-tag": "noindex", etag: etagOf(t) } });
  }
  if (!isPublic(p)) return null;
  const cache3 = env.LOCAL !== "1" && typeof caches !== "undefined" && caches.default ? caches.default : null;
  const key2 = new Request(SITE5 + url.pathname + url.search, { method: "GET" });
  let res = cache3 ? await cache3.match(key2).catch(() => null) : null;
  if (!res) {
    res = await draw(req, env, url, p);
    if (cache3 && res.status === 200) {
      const put = cache3.put(key2, res.clone()).catch(() => {
      });
      if (ctx && ctx.waitUntil) ctx.waitUntil(put);
      else await put;
    }
  }
  const tag3 = res.headers.get("etag"), inm = req.headers.get("if-none-match");
  if (tag3 && inm && inm.split(/\s*,\s*/).includes(tag3)) return new Response(null, { status: 304, headers: { etag: tag3, "cache-control": res.headers.get("cache-control") || "" } });
  return req.method === "HEAD" ? new Response(null, { status: res.status, headers: res.headers }) : res;
}
__name(seoPage, "seoPage");

// src/usagenames.js
var N = /* @__PURE__ */ __name((en, es, pt) => [en, es || en, pt || en], "N");
var VIEWS = {
  home: N("Home", "Inicio", "In\xEDcio"),
  live: N("Telemetry", "Telemetr\xEDa", "Telemetria"),
  telemetry: N("Telemetry", "Telemetr\xEDa", "Telemetria"),
  laps: N("Laps", "Vueltas", "Voltas"),
  cloudlaps: N("My sessions", "Mis sesiones", "Minhas sess\xF5es"),
  session: N("Session", "Sesi\xF3n", "Sess\xE3o"),
  races: N("My races", "Mis carreras", "Minhas corridas"),
  coach: N("Coach"),
  tracks: N("Tracks", "Circuitos", "Pistas"),
  tyres: N("Tyres", "Neum\xE1ticos", "Pneus"),
  field: N("Standings", "Posiciones", "Classifica\xE7\xE3o"),
  standings: N("Standings", "Posiciones", "Classifica\xE7\xE3o"),
  overlays: N("Overlays"),
  revbeep: N("Rev beep", "Pitido de revoluciones", "Bipe de giros"),
  community: N("Community", "Comunidad", "Comunidade"),
  leagues: N("Leagues", "Ligas", "Ligas"),
  profile: N("Driver profile", "Perfil de piloto", "Perfil do piloto"),
  me: N("My account", "Mi cuenta", "Minha conta"),
  account: N("My account", "Mi cuenta", "Minha conta"),
  settings: N("Settings", "Ajustes", "Configura\xE7\xF5es"),
  calendar: N("Calendar", "Calendario", "Calend\xE1rio"),
  plan: N("Planner", "Planificador", "Planejador"),
  notes: N("Notes", "Notas", "Notas"),
  drinks: N("DRINKS mode", "Modo DRINKS", "Modo DRINKS"),
  news: N("News", "Noticias", "Not\xEDcias"),
  goals: N("Goals", "Objetivos", "Metas"),
  admin: N("Admin")
};
var ACTS = {
  race_summary: [N("Race summary", "Resumen de carrera", "Resumo da corrida"), N("Opened the summary of a race", "Abri\xF3 el resumen de una carrera", "Abriu o resumo de uma corrida")],
  plan_to_overlay: [N("Plan to the coach overlay", "Plan al overlay del coach", "Plano para o overlay do coach"), N("Sent the coach's plan to the coach overlay", "Llev\xF3 el plan del coach al overlay del coach", "Levou o plano do coach ao overlay do coach")],
  track_page: [N("Track page", "P\xE1gina del circuito", "P\xE1gina da pista"), N("Opened a track's page", "Abri\xF3 la p\xE1gina de un circuito", "Abriu a p\xE1gina de uma pista")],
  leaderboard: [N("Leaderboard", "Leaderboard", "Classifica\xE7\xE3o"), N("Opened a leaderboard", "Abri\xF3 una leaderboard", "Abriu uma classifica\xE7\xE3o")],
  overlay_open: [N("Overlay opened", "Overlay abierto", "Overlay aberto"), N("Put an overlay on the screen", "Puso un overlay en pantalla", "Colocou um overlay na tela")],
  profile: [N("Profile opened", "Perfil abierto", "Perfil aberto"), N("Opened a driver's profile", "Abri\xF3 el perfil de un piloto", "Abriu o perfil de um piloto")],
  voice_call: [N("Voice call", "Llamada de voz", "Chamada de voz"), N("Started a voice call", "Empez\xF3 una llamada de voz", "Come\xE7ou uma chamada de voz")],
  open_in_coach: [N("Lap sent to the coach", "Vuelta llevada al coach", "Volta levada ao coach"), N("Sent a lap from Laps to the coach", "Llev\xF3 una vuelta de Vueltas al coach", "Levou uma volta de Voltas ao coach")],
  widget_settings: [N("Overlay settings", "Ajustes de un overlay", "Ajustes de um overlay"), N("Opened the settings of an overlay", "Abri\xF3 los ajustes de un overlay", "Abriu os ajustes de um overlay")],
  whats_new: [N("What's new", "Novedades", "Novidades"), N("Read What's new", "Ley\xF3 las Novedades", "Leu as Novidades")],
  session_picker: [N("Choose a session", "Elegir una sesi\xF3n", "Escolher uma sess\xE3o"), N("Picked another session to look at", "Eligi\xF3 otra sesi\xF3n para mirar", "Escolheu outra sess\xE3o para ver")],
  coach_report: [N("Coach report", "Informe del coach", "Relat\xF3rio do coach"), N("Opened the coach's report of a lap", "Abri\xF3 el informe del coach de una vuelta", "Abriu o relat\xF3rio do coach de uma volta")],
  coach_plan: [N("Coach plan", "Plan del coach", "Plano do coach"), N("Opened the coach's plan", "Abri\xF3 el plan del coach", "Abriu o plano do coach")],
  compare: [N("Compare laps", "Comparar vueltas", "Comparar voltas"), N("Put two laps side by side", "Puso dos vueltas lado a lado", "Colocou duas voltas lado a lado")],
  share_code: [N("Share code", "C\xF3digo para compartir", "C\xF3digo de compartilhamento"), N("Made a share code for the live link", "Cre\xF3 un c\xF3digo para compartir el enlace en directo", "Criou um c\xF3digo para compartilhar o link ao vivo")],
  watch_code: [N("Watch with a code", "Seguir con un c\xF3digo", "Acompanhar com um c\xF3digo"), N("Watched a driver with a share code", "Sigui\xF3 a un piloto con un c\xF3digo", "Acompanhou um piloto com um c\xF3digo")],
  drinks: [N("DRINKS mode", "Modo DRINKS", "Modo DRINKS"), N("Used DRINKS mode", "Us\xF3 el modo DRINKS", "Usou o modo DRINKS")],
  feedback_button: [N("Feedback button", "Bot\xF3n de opiniones", "Bot\xE3o de opini\xF5es"), N("Pressed the floating feedback button", "Puls\xF3 el bot\xF3n flotante de opiniones", "Tocou o bot\xE3o flutuante de opini\xF5es")],
  feedback_sent: [N("Feedback sent", "Opini\xF3n enviada", "Opini\xE3o enviada"), N("Sent an answer to Share your feedback", "Envi\xF3 una respuesta a Danos tu opini\xF3n", "Enviou uma resposta a D\xEA sua opini\xE3o")],
  support_open: [N("Support chat opened", "Chat de soporte abierto", "Chat de suporte aberto"), N("Opened the support chat", "Abri\xF3 el chat de soporte", "Abriu o chat de suporte")],
  support_sent: [N("Message to support", "Mensaje a soporte", "Mensagem ao suporte"), N("Wrote to support", "Escribi\xF3 a soporte", "Escreveu ao suporte")],
  support_reply: [N("Support reply", "Respuesta de soporte", "Resposta do suporte"), N("Answered as support (admins)", "Respondi\xF3 como soporte (admins)", "Respondeu como suporte (admins)")],
  support_logs: [N("Logs sent to support", "Registros enviados a soporte", "Registros enviados ao suporte"), N("Sent the app's logs to support", "Envi\xF3 los registros de la app a soporte", "Enviou os registros do app ao suporte")],
  share_card: [N("Lap card shared", "Tarjeta de vuelta compartida", "Cart\xE3o de volta compartilhado"), N("Shared a lap card", "Comparti\xF3 una tarjeta de vuelta", "Compartilhou um cart\xE3o de volta")],
  connect: [N("Phone connected", "M\xF3vil conectado", "Celular conectado"), N("Connected a phone to the PC", "Conect\xF3 un m\xF3vil al PC", "Conectou um celular ao PC")]
};
var AREAS = [
  ["analysis", N("Analysis", "An\xE1lisis", "An\xE1lise"), ["view:telemetry", "view:live", "view:laps", "view:cloudlaps", "view:session", "view:races", "act:session_picker", "act:race_summary", "act:compare", "view:tracks", "view:tyres", "view:field", "view:standings"]],
  ["coach", N("Coach"), ["view:coach", "act:coach_report", "act:open_in_coach", "act:coach_plan", "act:plan_to_overlay", "view:goals"]],
  ["overlays", N("Overlays"), ["view:overlays", "act:overlay_open", "act:widget_settings", "view:revbeep"]],
  ["community", N("Community", "Comunidad", "Comunidade"), ["view:community", "view:leagues", "act:leaderboard", "act:track_page", "act:profile", "view:profile", "act:share_code", "act:watch_code", "act:voice_call", "act:share_card", "view:drinks", "act:drinks"]],
  ["planning", N("Planning", "Planificaci\xF3n", "Planejamento"), ["view:calendar", "view:plan", "view:notes"]],
  ["help", N("Help and feedback", "Ayuda y opiniones", "Ajuda e opini\xF5es"), ["act:feedback_button", "act:feedback_sent", "act:support_open", "act:support_sent", "act:support_reply", "act:support_logs", "act:whats_new", "view:news"]],
  ["account", N("Home and account", "Inicio y cuenta", "In\xEDcio e conta"), ["view:home", "view:me", "view:account", "view:settings", "act:connect"]]
];
var cap2 = /* @__PURE__ */ __name((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " "), "cap");
function featureOf(key2) {
  const [kind, name2 = ""] = String(key2).split(/:(.*)/);
  if (kind === "act" && ACTS[name2]) return { name: ACTS[name2][0], what: ACTS[name2][1] };
  const v = VIEWS[name2] || N(cap2(name2));
  return { name: v, what: [`Opened ${v[0]}`, `Abri\xF3 ${v[1]}`, `Abriu ${v[2]}`] };
}
__name(featureOf, "featureOf");
function areasOf(top) {
  const seen2 = /* @__PURE__ */ new Set(), out = [];
  for (const [k, name2, keys] of AREAS) {
    const rows = keys.map((key2) => top.find((x) => x.key === key2)).filter(Boolean);
    rows.forEach((x) => seen2.add(x.key));
    if (rows.length) out.push({ k, name: name2, rows: rows.map((x) => ({ ...featureOf(x.key), key: x.key, users: x.users, n: x.n })) });
  }
  const rest = top.filter((x) => !seen2.has(x.key) && x.key !== "view:admin").slice(0, 10);
  if (rest.length) out.push({ k: "other", name: N("Other", "Otros", "Outros"), rows: rest.map((x) => ({ ...featureOf(x.key), key: x.key, users: x.users, n: x.n })) });
  return out;
}
__name(areasOf, "areasOf");
var SRC_NAMES = {
  direct: N("Direct", "Directo", "Direto"),
  unknown: N("Not known", "Sin saber", "Desconhecido"),
  "pc-app": N("The PC agent", "El agente del PC", "O agente do PC"),
  "android-app": N("The Android app", "La app de Android", "O app Android"),
  "ios-app": N("The iPhone app", "La app de iPhone", "O app iPhone"),
  iracing: N("iRacing forums", "Foros de iRacing", "F\xF3runs do iRacing"),
  google: N("Google"),
  bing: N("Bing"),
  duckduckgo: N("DuckDuckGo"),
  yahoo: N("Yahoo"),
  yandex: N("Yandex"),
  baidu: N("Baidu"),
  ecosia: N("Ecosia"),
  brave: N("Brave Search"),
  qwant: N("Qwant"),
  chatgpt: N("ChatGPT"),
  perplexity: N("Perplexity"),
  claude: N("Claude"),
  gemini: N("Gemini"),
  copilot: N("Copilot"),
  reddit: N("Reddit"),
  discord: N("Discord"),
  youtube: N("YouTube"),
  facebook: N("Facebook"),
  instagram: N("Instagram"),
  x: N("X (Twitter)"),
  tiktok: N("TikTok"),
  twitch: N("Twitch"),
  steam: N("Steam"),
  overtake: N("OverTake"),
  simhub: N("SimHub"),
  github: N("GitHub"),
  whatsapp: N("WhatsApp"),
  telegram: N("Telegram"),
  linkedin: N("LinkedIn"),
  gmail: N("Gmail")
};
var KIND_NAMES = {
  search: N("Search", "Buscador", "Busca"),
  ai: N("AI assistant", "Asistente de IA", "Assistente de IA"),
  community: N("Community", "Comunidad", "Comunidade"),
  social: N("Social", "Redes sociales", "Redes sociais"),
  direct: N("Direct", "Directo", "Direto"),
  app: N("App"),
  other: N("Other site", "Otra web", "Outro site"),
  unknown: N("Not known", "Sin saber", "Desconhecido")
};
var srcName = /* @__PURE__ */ __name((s) => SRC_NAMES[s] || N(s), "srcName");
var GAME_NAMES = { iracing: "iRacing", lmu: "Le Mans Ultimate", acc: "ACC", ac: "Assetto Corsa" };
var gameName = /* @__PURE__ */ __name((g) => GAME_NAMES[g] || g, "gameName");
function hiText(k, a) {
  const s = /* @__PURE__ */ __name((x) => srcName(x), "s");
  switch (k) {
    case "active_more":
      return [`${a[0]} drivers were active in these ${a[1]} days, ${a[2]} more than in the ${a[1]} before.`, `${a[0]} pilotos estuvieron activos en estos ${a[1]} d\xEDas, ${a[2]} m\xE1s que en los ${a[1]} anteriores.`, `${a[0]} pilotos estiveram ativos nestes ${a[1]} dias, ${a[2]} a mais que nos ${a[1]} anteriores.`];
    case "active_fewer":
      return [`${a[0]} drivers were active in these ${a[1]} days, ${a[2]} fewer than in the ${a[1]} before.`, `${a[0]} pilotos estuvieron activos en estos ${a[1]} d\xEDas, ${a[2]} menos que en los ${a[1]} anteriores.`, `${a[0]} pilotos estiveram ativos nestes ${a[1]} dias, ${a[2]} a menos que nos ${a[1]} anteriores.`];
    case "active_first":
      return [`${a[0]} drivers were active in these ${a[1]} days, and ${a[2]} accounts were made.`, `${a[0]} pilotos estuvieron activos en estos ${a[1]} d\xEDas y se crearon ${a[2]} cuentas.`, `${a[0]} pilotos estiveram ativos nestes ${a[1]} dias e foram criadas ${a[2]} contas.`];
    case "no_app":
      return [`${a[0]} of the ${a[1]} new accounts (${a[2]}%) never opened an app.`, `${a[0]} de las ${a[1]} cuentas nuevas (${a[2]}%) nunca abrieron una app.`, `${a[0]} das ${a[1]} contas novas (${a[2]}%) nunca abriram um app.`];
    case "no_drive":
      return [`${a[0]} of the ${a[1]} new accounts (${a[2]}%) never drove with the agent.`, `${a[0]} de las ${a[1]} cuentas nuevas (${a[2]}%) nunca condujeron con el agente.`, `${a[0]} das ${a[1]} contas novas (${a[2]}%) nunca dirigiram com o agente.`];
    case "coach_low":
      return [`Only ${a[0]} of the ${a[1]} active drivers used the coach, while ${a[2]} looked at their laps.`, `Solo ${a[0]} de los ${a[1]} pilotos activos usaron el coach, mientras ${a[2]} miraron sus vueltas.`, `S\xF3 ${a[0]} dos ${a[1]} pilotos ativos usaram o coach, enquanto ${a[2]} olharam suas voltas.`];
    case "top_signups":
      return [`Most new accounts came from ${s(a[0])[0]} (${a[1]}).`, `La mayor\xEDa de las cuentas nuevas vinieron de ${s(a[0])[1]} (${a[1]}).`, `A maioria das contas novas veio de ${s(a[0])[2]} (${a[1]}).`];
    case "top_visits":
      return [`Most visits came from ${s(a[0])[0]} (${a[1]} of ${a[2]}).`, `La mayor\xEDa de las visitas vinieron de ${s(a[0])[1]} (${a[1]} de ${a[2]}).`, `A maioria das visitas veio de ${s(a[0])[2]} (${a[1]} de ${a[2]}).`];
    case "games":
      return [`${gameName(a[0])} drivers run ${a[1]} sessions each, ${gameName(a[2])} drivers ${a[3]}.`, `Los pilotos de ${gameName(a[0])} hacen ${a[1]} sesiones cada uno, los de ${gameName(a[2])} ${a[3]}.`, `Os pilotos de ${gameName(a[0])} fazem ${a[1]} sess\xF5es cada, os de ${gameName(a[2])} ${a[3]}.`];
    case "no_android":
      return [`No Android phone opened the app in these ${a[0]} days.`, `Ning\xFAn m\xF3vil Android abri\xF3 la app en estos ${a[0]} d\xEDas.`, `Nenhum celular Android abriu o app nestes ${a[0]} dias.`];
    case "no_ios":
      return [`No iPhone opened the app in these ${a[0]} days.`, `Ning\xFAn iPhone abri\xF3 la app en estos ${a[0]} d\xEDas.`, `Nenhum iPhone abriu o app nestes ${a[0]} dias.`];
    case "behind":
      return [`${a[0]} devices seen this week are not on the newest version.`, `${a[0]} dispositivos vistos esta semana no tienen la versi\xF3n m\xE1s nueva.`, `${a[0]} dispositivos vistos esta semana n\xE3o est\xE3o na vers\xE3o mais nova.`];
    default:
      return null;
  }
}
__name(hiText, "hiText");

// src/usagelib.js
var DEVICES2 = ["web", "pc", "android", "ios"];
var KEY_RE = /^(view|act|game):[a-z0-9_.-]{1,40}$/;
var MAX_KEYS = 100;
var MAX_N = 1e3;
var MAX_DAYS = 90;
var FEEDBACK_MAX = 4e3;
var FEEDBACK_PER_DAY = 20;
var ASK_USED = 6 * 36e5;
var ASK_RACES = 2;
var MAX_MS = 10 * 6e4;
var OV_FIRST = 1;
var OV_AGAIN = 6;
var OV_GAMES = ["iracing", "lmu"];
var OV_MAX = 30;
var STYLE_RE = /^[a-z0-9_-]{1,20}$/;
var OV_RE = /^[a-z]{2,12}$/;
var USAGE_GAMES = ["iracing", "lmu", "acc", "ac"];
var gameKeyOk = /* @__PURE__ */ __name((k) => !k.startsWith("game:") || USAGE_GAMES.includes(k.slice(5)), "gameKeyOk");
var day2 = /* @__PURE__ */ __name((t) => new Date(t).toISOString().slice(0, 10), "day");
var cleanV2 = /* @__PURE__ */ __name((v) => String(v == null ? "" : v).replace(/[^0-9a-zA-Z.+-]/g, "").slice(0, 24), "cleanV");
function cleanUsage(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const device = String(b.device || "").toLowerCase();
  if (!DEVICES2.includes(device)) return { error: "unknown device" };
  const counts = [];
  if (b.counts && typeof b.counts === "object" && !Array.isArray(b.counts)) {
    for (const [k0, n0] of Object.entries(b.counts)) {
      if (counts.length >= MAX_KEYS) break;
      const k = String(k0).toLowerCase(), n = Math.floor(Number(n0));
      if (!KEY_RE.test(k) || !gameKeyOk(k) || !(n > 0)) continue;
      counts.push([k, Math.min(n, MAX_N)]);
    }
  }
  const ms = Math.max(0, Math.min(MAX_MS, Math.floor(Number(b.ms) || 0)));
  return { device, v: cleanV2(b.v), counts, ms };
}
__name(cleanUsage, "cleanUsage");
function cleanFeedback(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const text2 = String(b.text == null ? "" : b.text).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (!text2) return { error: "write something first" };
  if (text2.length > FEEDBACK_MAX) return { error: "too long (" + FEEDBACK_MAX + " characters at most)" };
  let rating = null;
  if (b.rating != null && b.rating !== "" && b.rating !== 0) {
    const r4 = Number(b.rating);
    if (!Number.isInteger(r4) || r4 < 1 || r4 > 5) return { error: "the rating goes from 1 to 5" };
    rating = r4;
  }
  const kind = b.kind === "overlays" ? "overlays" : "general";
  let style = null;
  if (kind === "overlays") {
    style = cleanStyle(b.style);
    if (!style) return { error: "unknown overlay design" };
  }
  const device = String(b.device || "").toLowerCase();
  return { text: text2, rating, kind, style, device: DEVICES2.includes(device) ? device : "", v: cleanV2(b.v), view: String(b.view || "").replace(/[^a-z0-9_.:-]/gi, "").slice(0, 40) };
}
__name(cleanFeedback, "cleanFeedback");
function cleanStyle(v) {
  if (v == null || v === "") return "classic";
  const s = String(v).toLowerCase();
  return STYLE_RE.test(s) ? s : null;
}
__name(cleanStyle, "cleanStyle");
function cleanOvRace(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const style = cleanStyle(b.style);
  if (!style) return { error: "unknown overlay design" };
  const game = String(b.game || "").toLowerCase();
  if (!OV_GAMES.includes(game)) return { error: "unknown game" };
  const ovs = [...new Set((Array.isArray(b.ovs) ? b.ovs : []).map((x) => String(x).toLowerCase()).filter((x) => OV_RE.test(x)))].slice(0, OV_MAX);
  if (!ovs.length) return { error: "no overlay was open" };
  const sid = String(b.sid == null ? "" : b.sid).replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 80);
  return { style, game, ovs, sid };
}
__name(cleanOvRace, "cleanOvRace");
var shouldAskOv = /* @__PURE__ */ __name((answered, races) => answered ? races >= OV_AGAIN : races >= OV_FIRST, "shouldAskOv");
var shouldAsk = /* @__PURE__ */ __name((used, races) => used >= ASK_USED || races >= ASK_RACES, "shouldAsk");
function analyticsOf(days, perDay, rows, presence, accounts2) {
  const byDev = /* @__PURE__ */ new Map(), byKey = /* @__PURE__ */ new Map(), byGame = /* @__PURE__ */ new Map(), byUser = /* @__PURE__ */ new Map();
  const add = /* @__PURE__ */ __name((m, k, acc, n) => {
    let x = m.get(k);
    if (!x) m.set(k, x = { n: 0, users: /* @__PURE__ */ new Set() });
    x.n += n;
    x.users.add(acc);
  }, "add");
  for (const r4 of rows) {
    if (!gameKeyOk(r4.key)) continue;
    add(byDev, r4.device, r4.account_id, r4.n);
    if (r4.key.startsWith("game:")) add(byGame, r4.key.slice(5), r4.account_id, r4.n);
    else add(byKey, r4.key, r4.account_id, r4.n);
    let u = byUser.get(r4.account_id);
    if (!u) byUser.set(r4.account_id, u = { n: 0, devices: /* @__PURE__ */ new Set(), keys: /* @__PURE__ */ new Map(), last: "" });
    u.n += r4.n;
    u.devices.add(r4.device);
    u.keys.set(r4.key, (u.keys.get(r4.key) || 0) + r4.n);
    if (r4.last > u.last) u.last = r4.last;
  }
  const seen2 = /* @__PURE__ */ new Map(), versions = /* @__PURE__ */ new Map();
  for (const p of presence) {
    if (!seen2.has(p.account_id) || p.last_seen > seen2.get(p.account_id)) seen2.set(p.account_id, p.last_seen);
    if (p.app_version) {
      const k = p.kind + "|" + p.app_version;
      versions.set(k, (versions.get(k) || 0) + 1);
    }
  }
  const list = /* @__PURE__ */ __name((m, name2) => [...m].map(([k, x]) => ({ [name2]: k, users: x.users.size, n: x.n })).sort((a, b) => b.n - a.n), "list");
  return {
    days,
    active: perDay.map((x) => ({ day: x.day, users: x.users })),
    byDevice: list(byDev, "device"),
    top: list(byKey, "key").slice(0, 60),
    games: list(byGame, "game"),
    versions: [...versions].map(([k, n]) => ({ device: k.split("|")[0], v: k.split("|")[1], devices: n })).sort((a, b) => b.devices - a.devices),
    users: [...byUser].map(([id2, u]) => ({
      id: id2,
      nick: (accounts2.get(id2) || {}).display || "",
      lastSeen: seen2.get(id2) || (u.last ? Date.parse(u.last + "T12:00:00Z") : 0),
      lastDay: u.last,
      devices: [...u.devices],
      n: u.n,
      top: [...u.keys].map(([key2, n]) => ({ key: key2, n })).sort((a, b) => b.n - a.n).slice(0, 6)
    })).sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 300)
  };
}
__name(analyticsOf, "analyticsOf");
var LAPS_KEYS = /* @__PURE__ */ new Set(["view:laps", "view:telemetry", "view:cloudlaps", "view:session", "act:race_summary", "act:compare"]);
var COACH_KEYS = /* @__PURE__ */ new Set(["act:coach_report", "view:coach", "act:open_in_coach", "act:coach_plan", "act:plan_to_overlay"]);
var sesDay = /* @__PURE__ */ __name((t) => new Date(t).toISOString().slice(0, 10), "sesDay");
function analyticsMore({ from, t0, actDays, rows, sessions, prevSessions, prevActive, accounts: accounts2, accountsAll }) {
  const perDay = /* @__PURE__ */ new Map(), userDays = /* @__PURE__ */ new Map(), app = /* @__PURE__ */ new Map(), drove = /* @__PURE__ */ new Map();
  const mark = /* @__PURE__ */ __name((m, d, id2) => {
    let x = m.get(d);
    if (!x) m.set(d, x = /* @__PURE__ */ new Set());
    x.add(id2);
  }, "mark");
  for (const r4 of actDays) {
    if (r4.day < from) continue;
    mark(perDay, r4.day, r4.account_id);
    mark(app, r4.day, r4.account_id);
    mark(userDays, r4.account_id, r4.day);
  }
  const games = /* @__PURE__ */ new Map(), drivers = /* @__PURE__ */ new Set();
  let nSes = 0, races = 0, laps = 0, secs = 0;
  for (const s of sessions) {
    const id2 = String(s.uploader || "").slice(5), d = s.day || sesDay(s.started || 0);
    if (!id2 || d < from) continue;
    mark(perDay, d, id2);
    mark(drove, d, id2);
    mark(userDays, id2, d);
    drivers.add(id2);
    let g = games.get(s.game);
    if (!g) games.set(s.game, g = { game: s.game, drivers: /* @__PURE__ */ new Set(), sessions: 0, races: 0, laps: 0, secs: 0 });
    g.drivers.add(id2);
    g.sessions += s.n || 0;
    g.races += s.races || 0;
    g.laps += s.laps || 0;
    g.secs += s.secs || 0;
    nSes += s.n || 0;
    races += s.races || 0;
    laps += s.laps || 0;
    secs += s.secs || 0;
  }
  const devices = /* @__PURE__ */ new Map(), keys = /* @__PURE__ */ new Map();
  for (const r4 of rows) {
    let d = devices.get(r4.account_id);
    if (!d) devices.set(r4.account_id, d = /* @__PURE__ */ new Set());
    d.add(r4.device);
    let k = keys.get(r4.account_id);
    if (!k) keys.set(r4.account_id, k = /* @__PURE__ */ new Set());
    k.add(r4.key);
  }
  const fresh = accounts2.filter((a) => a.created >= t0);
  const has = /* @__PURE__ */ __name((id2, set) => [...keys.get(id2) || []].some((k) => set.has(k)), "has");
  const daysList = [...userDays.values()].map((x) => x.size);
  const list = /* @__PURE__ */ __name((m) => [...m].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([day4, u]) => ({ day: day4, users: u.size })), "list");
  return {
    active: list(perDay),
    activeApp: list(app),
    drove: list(drove),
    signupsPerDay: [...fresh.reduce((m, a) => m.set(sesDay(a.created), (m.get(sesDay(a.created)) || 0) + 1), /* @__PURE__ */ new Map())].sort().map(([day4, n]) => ({ day: day4, n })),
    totals: { active: userDays.size, newAccounts: fresh.length, accounts: accountsAll, drove: drivers.size, sessions: nSes, races, laps, secs: Math.round(secs), returning: daysList.filter((n) => n >= 2).length, multiDevice: [...devices.values()].filter((d) => d.size >= 2).length },
    prev: { active: prevActive, newAccounts: accounts2.length - fresh.length, sessions: prevSessions.sessions || 0, drove: prevSessions.drivers || 0, secs: Math.round(prevSessions.secs || 0) },
    funnel: { accounts: fresh.length, opened: fresh.filter((a) => keys.has(a.id)).length, drove: fresh.filter((a) => drivers.has(a.id)).length, laps: fresh.filter((a) => has(a.id, LAPS_KEYS)).length, coach: fresh.filter((a) => has(a.id, COACH_KEYS)).length },
    comeback: { d1: daysList.filter((n) => n === 1).length, d23: daysList.filter((n) => n >= 2 && n <= 3).length, d4: daysList.filter((n) => n >= 4).length },
    driven: [...games.values()].map((g) => ({ game: g.game, drivers: g.drivers.size, sessions: g.sessions, races: g.races, laps: g.laps, secs: Math.round(g.secs) })).sort((a, b) => b.sessions - a.sessions)
  };
}
__name(analyticsMore, "analyticsMore");
function highlightsOf(a) {
  const out = [], t = a.totals || {}, pv = a.prev || {}, F2 = a.funnel || {}, act = t.active || 0, top = a.top || [];
  if (pv.active) out.push({ k: t.active >= pv.active ? "active_more" : "active_fewer", tone: t.active >= pv.active ? "good" : "bad", a: [act, a.days, Math.abs(act - pv.active)] });
  else out.push({ k: "active_first", tone: "good", a: [act, a.days, t.newAccounts || 0] });
  if (F2.accounts >= 3) {
    const w = [["no_app", F2.accounts - (F2.opened || 0)], ["no_drive", F2.accounts - (F2.drove || 0)]].sort((x, y) => y[1] - x[1])[0];
    if (w[1] > 0) out.push({ k: w[0], tone: "bad", a: [w[1], F2.accounts, Math.round(w[1] / F2.accounts * 100)] });
  }
  const users = /* @__PURE__ */ __name((keys) => Math.max(0, ...keys.map((k) => (top.find((x) => x.key === k) || {}).users || 0)), "users");
  const coach2 = users(["act:coach_report", "view:coach"]), laps = users(["view:telemetry", "view:laps"]);
  if (act && laps && coach2 < laps * 0.6) out.push({ k: "coach_low", tone: "warn", a: [coach2, act, laps] });
  const S3 = a.sources || {}, bs = (S3.bySource || []).filter((x) => x.signups && x.src !== "unknown").sort((x, y) => y.signups - x.signups)[0];
  const bv = (S3.bySource || []).filter((x) => x.visits).sort((x, y) => y.visits - x.visits)[0];
  if (bs) out.push({ k: "top_signups", tone: "blue", a: [bs.src, bs.signups] });
  else if (bv) out.push({ k: "top_visits", tone: "blue", a: [bv.src, bv.visits, S3.visits] });
  const g = (a.driven || []).filter((x) => x.drivers).map((x) => [x.game, x.sessions / x.drivers]).sort((x, y) => y[1] - x[1]);
  if (g.length > 1 && g[0][1] >= g[g.length - 1][1] * 2) out.push({ k: "games", tone: "blue", a: [g[0][0], g[0][1].toFixed(1), g[g.length - 1][0], g[g.length - 1][1].toFixed(1)] });
  const devs = new Map((a.byDevice || []).map((x) => [x.device, x.users]));
  for (const d of ["android", "ios"]) if (act && !devs.get(d)) out.push({ k: "no_" + d, tone: "bad", a: [a.days] });
  const vers = /* @__PURE__ */ new Map();
  for (const v of a.versions || []) {
    const k = v.device === "desktop" ? "pc" : v.device;
    if (!vers.has(k)) vers.set(k, []);
    vers.get(k).push(v);
  }
  const num4 = /* @__PURE__ */ __name((v) => String(v || "").split(/[^0-9]+/).filter(Boolean).slice(0, 3).map(Number), "num");
  const cmp = /* @__PURE__ */ __name((x, y) => {
    const p = num4(x), q2 = num4(y);
    for (let i = 0; i < 3; i++) {
      const d = (p[i] || 0) - (q2[i] || 0);
      if (d) return d;
    }
    return 0;
  }, "cmp");
  let behind = 0;
  for (const list of vers.values()) {
    const newest = list.map((x) => x.v).sort(cmp).pop();
    behind += list.filter((x) => cmp(x.v, newest)).reduce((s, x) => s + x.devices, 0);
  }
  if (behind) out.push({ k: "behind", tone: "warn", a: [behind] });
  return out;
}
__name(highlightsOf, "highlightsOf");
var SQL_SESSIONS_DAYS = "SELECT date(started/1000,'unixepoch') AS day, game, uploader, COUNT(*) AS n, SUM(COALESCE(laps,0)) AS laps, SUM(COALESCE(secs,0)) AS secs, SUM(CASE WHEN lower(COALESCE(kind,'')) LIKE '%race%' THEN 1 ELSE 0 END) AS races FROM sessions WHERE started>=?1 AND uploader LIKE 'acct:%' GROUP BY 1, game, uploader LIMIT 20000";
var SQL_USAGE_ADD = "INSERT INTO usage_days (day, account_id, device, key, n) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(day, account_id, device, key) DO UPDATE SET n=MIN(usage_days.n+excluded.n, 100000)";
var SQL_ASK_USED = "INSERT INTO feedback_ask (account_id, shown, used) VALUES (?1,?2,?3) ON CONFLICT(account_id) DO UPDATE SET used=feedback_ask.used+excluded.used";
var SQL_ASK_SEEN = "INSERT INTO feedback_ask (account_id, shown, used) VALUES (?1,?2,0) ON CONFLICT(account_id) DO UPDATE SET shown=excluded.shown, used=0";
var SQL_RACES_SINCE = "SELECT COUNT(*) AS n FROM sessions WHERE uploader=?1 AND started>?2 AND lower(COALESCE(kind,'')) LIKE '%race%'";
var SQL_OV_RACE = "INSERT INTO feedback_ask (account_id, shown, used, ov_races, ov_last_style, ov_last_sid) VALUES (?1,?2,0,1,?3,?4) ON CONFLICT(account_id) DO UPDATE SET ov_races=MIN(feedback_ask.ov_races+(CASE WHEN COALESCE(feedback_ask.ov_last_sid,'')=excluded.ov_last_sid THEN 0 ELSE 1 END), 1000), ov_last_style=excluded.ov_last_style, ov_last_sid=excluded.ov_last_sid";
var SQL_OV_SEEN = "UPDATE feedback_ask SET ov_races=0 WHERE account_id=?1";
var SQL_OV_ANSWERED = "INSERT INTO feedback_ask (account_id, shown, used, ov_races, ov_answered) VALUES (?1,?2,0,0,1) ON CONFLICT(account_id) DO UPDATE SET ov_races=0, ov_answered=1";

// src/usage.js
var json13 = /* @__PURE__ */ __name((o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var err9 = /* @__PURE__ */ __name((m, s) => json13({ error: m }, s), "err");
async function usageRoute(req, env, url) {
  const p = url.pathname, m = req.method;
  const ours = ["/community/usage", "/community/feedback", "/community/feedback/ask", "/community/feedback/seen", "/community/feedback/ovrace", "/community/admin/analytics", "/community/admin/feedback"];
  if (p === "/community/visit" && m === "POST") {
    if (isBot(req.headers.get("user-agent"))) return json13({ ok: true });
    let b = null;
    try {
      b = JSON.parse((await req.text()).slice(0, 4e3));
    } catch {
      b = null;
    }
    const v = visitOf(b);
    if (v.src) await env.DB.prepare(SQL_VISIT_ADD).bind(day2(Date.now()), v.src, countryOf(req.cf), v.page).run();
    return json13({ ok: true });
  }
  if (!ours.includes(p)) return null;
  const acc = await sessionAccount(req, env);
  if (!acc) return err9("sign in with your Pitlane HQ account", 401);
  const now = Date.now();
  if (p === "/community/usage" && m === "POST") {
    const u = cleanUsage(await req.json().catch(() => null));
    if (u.error) return err9(u.error, 400);
    const d = day2(now), st = [];
    for (const [k, n] of u.counts)
      st.push(env.DB.prepare(SQL_USAGE_ADD).bind(d, acc.id, u.device, k, n));
    if (u.ms) st.push(env.DB.prepare(SQL_ASK_USED).bind(acc.id, now, u.ms));
    if (st.length) await env.DB.batch(st);
    return json13({ ok: true, kept: u.counts.length });
  }
  if (p === "/community/feedback/ask" && m === "GET") {
    const r4 = await env.DB.prepare("SELECT shown, used, ov_races, ov_answered, ov_last_style FROM feedback_ask WHERE account_id=?1").bind(acc.id).first();
    if (!r4) {
      await env.DB.prepare("INSERT OR IGNORE INTO feedback_ask (account_id, shown, used) VALUES (?1,?2,0)").bind(acc.id, now).run();
      return json13({ ask: false, ov: false });
    }
    let races = 0;
    if (r4.used < ASK_USED) {
      const c = await env.DB.prepare(SQL_RACES_SINCE).bind("acct:" + acc.id, r4.shown).first();
      races = c && c.n || 0;
    }
    return json13({ ask: shouldAsk(r4.used, races), used: r4.used, races, ov: shouldAskOv(!!r4.ov_answered, r4.ov_races || 0), ovRaces: r4.ov_races || 0, ovStyle: r4.ov_last_style || "classic" });
  }
  if (p === "/community/feedback/seen" && m === "POST") {
    const b = await req.json().catch(() => null);
    if (b && b.kind === "overlays") await env.DB.prepare(SQL_OV_SEEN).bind(acc.id).run();
    else await env.DB.prepare(SQL_ASK_SEEN).bind(acc.id, now).run();
    return json13({ ok: true });
  }
  if (p === "/community/feedback/ovrace" && m === "POST") {
    const o = cleanOvRace(await req.json().catch(() => null));
    if (o.error) return err9(o.error, 400);
    await env.DB.prepare(SQL_OV_RACE).bind(acc.id, now, o.style, o.sid || crypto.randomUUID()).run();
    return json13({ ok: true });
  }
  if (p === "/community/feedback" && m === "POST") {
    const b = await req.json().catch(() => null), f = cleanFeedback(b);
    if (f.error) return err9(f.error, 400);
    const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM feedback WHERE account_id=?1 AND created>?2").bind(acc.id, now - 864e5).first();
    if (c && c.n >= FEEDBACK_PER_DAY) return err9("thank you, that is enough for today", 429);
    const id2 = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO feedback (id, account_id, created, device, v, rating, text, view, kind, style) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)").bind(id2, acc.id, now, f.device, f.v, f.rating, f.text, f.view, f.kind, f.style),
      f.kind === "overlays" ? env.DB.prepare(SQL_OV_ANSWERED).bind(acc.id, now) : env.DB.prepare(SQL_ASK_SEEN).bind(acc.id, now),
      // and it is a message of the driver's support chat (support.js), so they see it there
      ...driverMessage(env, acc.id, id2, now, { ...f, lang: cleanLang(b && b.lang) })
    ]);
    const esc6 = await openEscrow(env, acc.escrow).catch(() => null);
    const mailed = await sendFeedback(env, { ...f, nick: acc.display || "", accountId: acc.id, email: esc6 && esc6.email || "" }).catch(() => false);
    return json13({ ok: true, id: id2, mailed });
  }
  if (!isAdmin(env, acc.id)) return err9("only the admins of this server can do this", 403);
  if (p === "/community/admin/feedback" && m === "GET") {
    const r4 = await env.DB.prepare("SELECT f.id, f.account_id AS accountId, f.created, f.device, f.v, f.rating, f.text, f.view, f.kind, f.style, a.display AS nick FROM feedback f LEFT JOIN accounts a ON a.id=f.account_id ORDER BY f.created DESC LIMIT 300").all();
    const items = r4.results || [];
    const rated = items.filter((x) => x.rating);
    return json13({ items, count: items.length, avg: rated.length ? Math.round(rated.reduce((s, x) => s + x.rating, 0) / rated.length * 10) / 10 : null });
  }
  if (p === "/community/admin/analytics" && m === "GET") {
    const days = Math.max(1, Math.min(MAX_DAYS, Math.floor(Number(url.searchParams.get("days")) || 30)));
    const t0 = Date.parse(day2(now - (days - 1) * 864e5) + "T00:00:00Z"), p0 = t0 - days * 864e5;
    const from = day2(t0), pFrom = day2(p0);
    const q2 = /* @__PURE__ */ __name((sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r4) => r4.results || []), "q");
    const [actDays, rows, pres, ses, pSes, pAct, accs, allAcc, vis] = await Promise.all([
      q2("SELECT DISTINCT account_id, day FROM usage_days WHERE day>=?1 LIMIT 20000", from),
      q2("SELECT account_id, device, key, SUM(n) AS n, MAX(day) AS last FROM usage_days WHERE day>=?1 GROUP BY account_id, device, key LIMIT 20000", from),
      q2("SELECT account_id, kind, app_version, last_seen FROM presence WHERE last_seen>?1 LIMIT 5000", now - 7 * 864e5),
      q2(SQL_SESSIONS_DAYS, t0),
      q2("SELECT COUNT(*) AS sessions, COUNT(DISTINCT uploader) AS drivers, SUM(COALESCE(secs,0)) AS secs FROM sessions WHERE started>=?1 AND started<?2 AND uploader LIKE 'acct:%'", p0, t0),
      q2("SELECT COUNT(*) AS n FROM (SELECT account_id AS a FROM usage_days WHERE day>=?1 AND day<?2 UNION SELECT substr(uploader,6) FROM sessions WHERE started>=?3 AND started<?4 AND uploader LIKE 'acct:%')", pFrom, from, p0, t0),
      q2("SELECT id, created, src, country FROM accounts WHERE created>=?1 LIMIT 20000", p0),
      q2("SELECT COUNT(*) AS n FROM accounts"),
      q2("SELECT day, src, country, page, n FROM visits_days WHERE day>=?1 LIMIT 20000", pFrom).catch(() => [])
    ]);
    const ids = [.../* @__PURE__ */ new Set([...rows.map((x) => x.account_id), ...ses.map((x) => x.uploader.slice(5))])].slice(0, 300), accounts2 = /* @__PURE__ */ new Map();
    for (let i = 0; i < ids.length; i += 90) {
      const part = ids.slice(i, i + 90);
      const a = await env.DB.prepare(`SELECT id, display FROM accounts WHERE id IN (${part.map((_, j) => "?" + (j + 1)).join(",")})`).bind(...part).all();
      for (const x of a.results || []) accounts2.set(x.id, x);
    }
    const out = analyticsOf(days, [], rows, pres, accounts2);
    const more = analyticsMore({ from, t0, actDays, rows, sessions: ses, prevSessions: pSes[0] || {}, prevActive: (pAct[0] || {}).n || 0, accounts: accs, accountsAll: (allAcc[0] || {}).n || 0 });
    const vNow = vis.filter((x) => x.day >= from), vPrev = vis.filter((x) => x.day < from);
    const all = { ...out, ...more, sources: sourcesOf(vNow, vPrev, accs.filter((a) => a.created >= t0), accs.filter((a) => a.created < t0)) };
    all.sources.bySource = all.sources.bySource.map((x) => ({ ...x, name: srcName(x.src), kindName: KIND_NAMES[x.kind] || KIND_NAMES.other }));
    return json13({ ...all, highlights: highlightsOf(all).map((h) => ({ ...h, text: hiText(h.k, h.a) })), areas: areasOf(all.top || []) });
  }
  return err9("not found", 404);
}
__name(usageRoute, "usageRoute");
async function pruneUsage(env) {
  const old = day2(Date.now() - 400 * 864e5);
  await env.DB.batch([env.DB.prepare("DELETE FROM usage_days WHERE day < ?1").bind(old), env.DB.prepare("DELETE FROM visits_days WHERE day < ?1").bind(old)]);
}
__name(pruneUsage, "pruneUsage");

// src/support.js
var supportRoute = /* @__PURE__ */ __name((req, env, url) => handleSupport(req, env, url, { sessionAccount, isAdmin, openEscrow, sendSupportChat, sendSupportReply }), "supportRoute");

// src/legal.js
var esc5 = /* @__PURE__ */ __name((s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]), "esc");
var MAIL = "support@pitlanehq.app";
var UPDATED = "2026-10-31";
var PRIVACY = {
  en: {
    title: "Privacy policy",
    up: "Last updated",
    intro: "Pitlane HQ is a free app for sim racing drivers. This page says what it keeps about you, why and for how long.",
    s: [
      ["What we keep", [
        "Your account. Your email address, your nickname and the language you chose.",
        "Your laps and sessions. The Pitlane HQ Agent on your PC uploads the laps you drive in iRacing and Le Mans Ultimate, with their times and telemetry, so you can see them on the web and the phone apps.",
        "What you share. Laps on the leaderboards, track notes, league posts and support messages, under your nickname or as an anonymous driver if you choose so.",
        "Linked accounts. When you sign in with Steam or Discord or link them, their account id and name, to sign you in and show them where you choose.",
        "The apps' use. Which screens are opened each day, error reports when an app fails and the logs you send from the support chat, to fix problems.",
        "Notifications. With notifications turned on in a phone, a token from Google Firebase (Android) or Apple (iPhone) so the server can wake that phone when there is something new. The message only says there is something new and the phone reads it from Pitlane HQ."
      ]],
      ["What we do not do", ["We do not sell your data, show ads or share your data with advertisers.", "We never send reminders or summaries by email. Emails are only for your account (confirming the address, signing in, a new password)."]],
      ["Who helps us run it", ["Cloudflare hosts the server, the database and the downloads.", "Resend sends the account emails.", "Google Firebase and Apple deliver the phone notifications when you turn them on.", "Steam and Discord, only when you sign in with them or link them."]],
      ["How long we keep it", ["Your account and its data stay until you delete the account.", "Notifications are kept 30 days, phone tokens until notifications are turned off or 270 days without use, error reports 30 days."]],
      ["Deleting your account", ['You can delete your account at any time in the app (Account \u2192 Delete account) or as explained at <a href="/delete-account">pitlanehq.app/delete-account</a>. Deleting it removes the account, your synced data, your devices and your race analyses. Your laps on the leaderboard and the laps the coach model learns from stay, as an anonymous driver without your name.']],
      ["Children", ["Pitlane HQ is not meant for children under 13 and does not knowingly keep data about them."]],
      ["Contact", [`Questions about your data go to <a href="mailto:${MAIL}">${MAIL}</a>. We may update this page and the date at the top says when it last changed.`]]
    ]
  },
  es: {
    title: "Pol\xEDtica de privacidad",
    up: "\xDAltima actualizaci\xF3n",
    intro: "Pitlane HQ es una app gratuita para pilotos de sim racing. Esta p\xE1gina dice qu\xE9 guarda sobre ti, para qu\xE9 y durante cu\xE1nto tiempo.",
    s: [
      ["Qu\xE9 guardamos", [
        "Tu cuenta. Tu email, tu apodo y el idioma que elegiste.",
        "Tus vueltas y sesiones. Pitlane HQ Agent en tu PC sube las vueltas que das en iRacing y Le Mans Ultimate, con sus tiempos y su telemetr\xEDa, para que las veas en la web y en las apps del m\xF3vil.",
        "Lo que compartes. Vueltas en las leaderboards, notas de circuito, publicaciones de ligas y mensajes de soporte, con tu apodo o como piloto an\xF3nimo si lo eliges.",
        "Cuentas vinculadas. Si inicias sesi\xF3n con Steam o Discord o los vinculas, su id y su nombre, para iniciar sesi\xF3n y mostrarlos donde elijas.",
        "El uso de las apps. Qu\xE9 pantallas se abren cada d\xEDa, informes de error cuando una app falla y los logs que env\xEDas desde el chat de soporte, para arreglar problemas.",
        "Notificaciones. Con las notificaciones activadas en un m\xF3vil, un token de Google Firebase (Android) o de Apple (iPhone) para que el servidor pueda avisar a ese m\xF3vil cuando hay algo nuevo. El mensaje solo dice que hay algo nuevo y el m\xF3vil lo lee de Pitlane HQ."
      ]],
      ["Qu\xE9 no hacemos", ["No vendemos tus datos, no mostramos anuncios ni compartimos tus datos con anunciantes.", "Nunca enviamos recordatorios ni res\xFAmenes por email. Los emails son solo para tu cuenta (confirmar la direcci\xF3n, iniciar sesi\xF3n, una contrase\xF1a nueva)."]],
      ["Qui\xE9n nos ayuda", ["Cloudflare aloja el servidor, la base de datos y las descargas.", "Resend env\xEDa los emails de la cuenta.", "Google Firebase y Apple entregan las notificaciones del m\xF3vil cuando las activas.", "Steam y Discord, solo cuando inicias sesi\xF3n con ellos o los vinculas."]],
      ["Cu\xE1nto tiempo lo guardamos", ["Tu cuenta y sus datos se quedan hasta que borras la cuenta.", "Los avisos se guardan 30 d\xEDas, los tokens del m\xF3vil hasta que desactivas las notificaciones o 270 d\xEDas sin uso, los informes de error 30 d\xEDas."]],
      ["Borrar tu cuenta", ['Puedes borrar tu cuenta cuando quieras en la app (Cuenta \u2192 Borrar cuenta) o como se explica en <a href="/delete-account?lang=es">pitlanehq.app/delete-account</a>. Al borrarla se van la cuenta, tus datos sincronizados, tus dispositivos y tus an\xE1lisis de carrera. Tus vueltas en la leaderboard y las vueltas de las que aprende el modelo del coach se quedan, como un piloto an\xF3nimo sin tu nombre.']],
      ["Menores", ["Pitlane HQ no est\xE1 pensada para menores de 13 a\xF1os y no guarda a sabiendas datos sobre ellos."]],
      ["Contacto", [`Las preguntas sobre tus datos van a <a href="mailto:${MAIL}">${MAIL}</a>. Podemos actualizar esta p\xE1gina y la fecha de arriba dice cu\xE1ndo cambi\xF3 por \xFAltima vez.`]]
    ]
  },
  pt: {
    title: "Pol\xEDtica de privacidade",
    up: "\xDAltima atualiza\xE7\xE3o",
    intro: "O Pitlane HQ \xE9 um app gratuito para pilotos de sim racing. Esta p\xE1gina diz o que ele guarda sobre voc\xEA, para qu\xEA e por quanto tempo.",
    s: [
      ["O que guardamos", [
        "Sua conta. Seu email, seu apelido e o idioma que voc\xEA escolheu.",
        "Suas voltas e sess\xF5es. O Pitlane HQ Agent no seu PC envia as voltas que voc\xEA d\xE1 no iRacing e no Le Mans Ultimate, com os tempos e a telemetria, para voc\xEA v\xEA-las na web e nos apps do celular.",
        "O que voc\xEA compartilha. Voltas nas classifica\xE7\xF5es, notas de pista, publica\xE7\xF5es de ligas e mensagens de suporte, com seu apelido ou como piloto an\xF4nimo se voc\xEA escolher.",
        "Contas vinculadas. Se voc\xEA entrar com Steam ou Discord ou vincul\xE1-los, o id e o nome delas, para entrar e mostr\xE1-las onde voc\xEA escolher.",
        "O uso dos apps. Quais telas s\xE3o abertas por dia, relat\xF3rios de erro quando um app falha e os logs que voc\xEA envia pelo chat de suporte, para corrigir problemas.",
        "Notifica\xE7\xF5es. Com as notifica\xE7\xF5es ativadas em um celular, um token do Google Firebase (Android) ou da Apple (iPhone) para o servidor poder avisar esse celular quando houver algo novo. A mensagem s\xF3 diz que h\xE1 algo novo e o celular l\xEA do Pitlane HQ."
      ]],
      ["O que n\xE3o fazemos", ["N\xE3o vendemos seus dados, n\xE3o mostramos an\xFAncios nem compartilhamos seus dados com anunciantes.", "Nunca enviamos lembretes nem resumos por email. Os emails s\xE3o s\xF3 para sua conta (confirmar o endere\xE7o, entrar, uma nova senha)."]],
      ["Quem nos ajuda", ["A Cloudflare hospeda o servidor, o banco de dados e os downloads.", "A Resend envia os emails da conta.", "O Google Firebase e a Apple entregam as notifica\xE7\xF5es do celular quando voc\xEA as ativa.", "Steam e Discord, s\xF3 quando voc\xEA entra com eles ou os vincula."]],
      ["Por quanto tempo guardamos", ["Sua conta e seus dados ficam at\xE9 voc\xEA apagar a conta.", "Os avisos ficam 30 dias, os tokens do celular at\xE9 voc\xEA desativar as notifica\xE7\xF5es ou 270 dias sem uso, os relat\xF3rios de erro 30 dias."]],
      ["Apagar sua conta", ['Voc\xEA pode apagar sua conta quando quiser no app (Conta \u2192 Apagar conta) ou como explicado em <a href="/delete-account?lang=pt">pitlanehq.app/delete-account</a>. Ao apag\xE1-la v\xE3o a conta, seus dados sincronizados, seus dispositivos e suas an\xE1lises de corrida. Suas voltas na classifica\xE7\xE3o e as voltas com que o modelo do coach aprende ficam, como um piloto an\xF4nimo sem seu nome.']],
      ["Crian\xE7as", ["O Pitlane HQ n\xE3o \xE9 feito para menores de 13 anos e n\xE3o guarda conscientemente dados sobre eles."]],
      ["Contato", [`Perguntas sobre seus dados v\xE3o para <a href="mailto:${MAIL}">${MAIL}</a>. Podemos atualizar esta p\xE1gina e a data no topo diz quando ela mudou pela \xFAltima vez.`]]
    ]
  }
};
var TERMS = {
  en: {
    title: "Terms of service",
    intro: "These terms apply when you use Pitlane HQ, the web at pitlanehq.app, the phone apps and Pitlane HQ Agent. By using it you agree to them.",
    s: [
      ["The service", ["Pitlane HQ is free during the beta. It records your sim racing laps, analyses them and shows them on your devices. Features can change, arrive or go away while it is in beta."]],
      ["Your account", ["You can sign up with an email or with Steam or Discord. Keep your sign-in to yourself. You are responsible for what is done with your account.", "You must be at least 13 years old to use Pitlane HQ."]],
      ["What you share", ["Laps, notes, league posts and messages you share stay yours. You let Pitlane HQ show them where you chose to share them.", "Do not post anything illegal, hateful, abusive or that is not yours to share, and do not cheat on the leaderboards. We can remove such content and close accounts that break these terms."]],
      ["Fair use", ["Do not try to break, overload or reverse engineer the service, read other people's data or use it to send spam."]],
      ["Games and other companies", ["Pitlane HQ is not made by or linked to iRacing, Motorsport Games, Studio 397, Valve, Discord or Google. Their names and games belong to their owners."]],
      ["No warranty", ["Pitlane HQ is given as it is, without any warranty. It can have bugs or be down at times. As far as the law allows, we are not liable for any loss that comes from using it."]],
      ["Ending", [`You can delete your account at any time, as explained at <a href="/delete-account">pitlanehq.app/delete-account</a>. How we handle your data is in the <a href="/privacy">privacy policy</a>.`]],
      ["Changes and contact", [`We can update these terms and the date at the top says when they last changed. Questions go to <a href="mailto:${MAIL}">${MAIL}</a>.`]]
    ]
  },
  es: {
    title: "T\xE9rminos del servicio",
    intro: "Estos t\xE9rminos se aplican cuando usas Pitlane HQ, la web en pitlanehq.app, las apps del m\xF3vil y Pitlane HQ Agent. Al usarlo los aceptas.",
    s: [
      ["El servicio", ["Pitlane HQ es gratis durante la beta. Guarda tus vueltas de sim racing, las analiza y te las muestra en tus dispositivos. Las funciones pueden cambiar, llegar o irse mientras est\xE1 en beta."]],
      ["Tu cuenta", ["Puedes registrarte con un email o con Steam o Discord. No compartas tu acceso. Eres responsable de lo que se haga con tu cuenta.", "Tienes que tener al menos 13 a\xF1os para usar Pitlane HQ."]],
      ["Lo que compartes", ["Las vueltas, notas, publicaciones de ligas y mensajes que compartes siguen siendo tuyos. Permites que Pitlane HQ los muestre donde elegiste compartirlos.", "No publiques nada ilegal, de odio, abusivo o que no sea tuyo, y no hagas trampas en las leaderboards. Podemos quitar ese contenido y cerrar las cuentas que incumplan estos t\xE9rminos."]],
      ["Uso justo", ["No intentes romper, saturar o hacer ingenier\xEDa inversa del servicio, leer datos de otras personas ni usarlo para enviar spam."]],
      ["Juegos y otras empresas", ["Pitlane HQ no est\xE1 hecho por iRacing, Motorsport Games, Studio 397, Valve, Discord ni Google, ni vinculado a ellos. Sus nombres y juegos son de sus due\xF1os."]],
      ["Sin garant\xEDa", ["Pitlane HQ se ofrece tal cual, sin ninguna garant\xEDa. Puede tener errores o no estar disponible a veces. En lo que permita la ley, no respondemos de p\xE9rdidas que vengan de usarlo."]],
      ["Baja", [`Puedes borrar tu cuenta cuando quieras, como se explica en <a href="/delete-account?lang=es">pitlanehq.app/delete-account</a>. C\xF3mo tratamos tus datos est\xE1 en la <a href="/privacy?lang=es">pol\xEDtica de privacidad</a>.`]],
      ["Cambios y contacto", [`Podemos actualizar estos t\xE9rminos y la fecha de arriba dice cu\xE1ndo cambiaron por \xFAltima vez. Las preguntas van a <a href="mailto:${MAIL}">${MAIL}</a>.`]]
    ]
  },
  pt: {
    title: "Termos de servi\xE7o",
    intro: "Estes termos valem quando voc\xEA usa o Pitlane HQ, a web em pitlanehq.app, os apps de celular e o Pitlane HQ Agent. Ao us\xE1-lo voc\xEA os aceita.",
    s: [
      ["O servi\xE7o", ["O Pitlane HQ \xE9 gr\xE1tis durante o beta. Ele guarda suas voltas de sim racing, analisa e mostra nos seus dispositivos. Os recursos podem mudar, chegar ou sair enquanto ele est\xE1 em beta."]],
      ["Sua conta", ["Voc\xEA pode se cadastrar com um email ou com Steam ou Discord. N\xE3o compartilhe seu acesso. Voc\xEA \xE9 respons\xE1vel pelo que \xE9 feito com sua conta.", "Voc\xEA precisa ter pelo menos 13 anos para usar o Pitlane HQ."]],
      ["O que voc\xEA compartilha", ["Voltas, notas, posts de ligas e mensagens que voc\xEA compartilha continuam sendo seus. Voc\xEA permite que o Pitlane HQ os mostre onde escolheu compartilh\xE1-los.", "N\xE3o publique nada ilegal, de \xF3dio, abusivo ou que n\xE3o seja seu, e n\xE3o trapaceie nas classifica\xE7\xF5es. Podemos remover esse conte\xFAdo e encerrar contas que descumpram estes termos."]],
      ["Uso justo", ["N\xE3o tente quebrar, sobrecarregar ou fazer engenharia reversa do servi\xE7o, ler dados de outras pessoas nem us\xE1-lo para enviar spam."]],
      ["Jogos e outras empresas", ["O Pitlane HQ n\xE3o \xE9 feito pela iRacing, Motorsport Games, Studio 397, Valve, Discord ou Google, nem ligado a elas. Seus nomes e jogos pertencem aos donos."]],
      ["Sem garantia", ["O Pitlane HQ \xE9 oferecido como est\xE1, sem nenhuma garantia. Ele pode ter erros ou ficar fora do ar \xE0s vezes. At\xE9 onde a lei permite, n\xE3o respondemos por perdas que venham do seu uso."]],
      ["Encerramento", [`Voc\xEA pode apagar sua conta quando quiser, como explicado em <a href="/delete-account?lang=pt">pitlanehq.app/delete-account</a>. Como tratamos seus dados est\xE1 na <a href="/privacy?lang=pt">pol\xEDtica de privacidade</a>.`]],
      ["Mudan\xE7as e contato", [`Podemos atualizar estes termos e a data no topo diz quando mudaram pela \xFAltima vez. Perguntas v\xE3o para <a href="mailto:${MAIL}">${MAIL}</a>.`]]
    ]
  }
};
var DELETE = {
  en: {
    title: "Delete your Pitlane HQ account",
    steps: [
      "In the phone app, open Account, write your password under Delete account and tap Delete.",
      'Or on the web, open <a href="/">pitlanehq.app</a>, sign in, open Account and use Delete account at the bottom.',
      `If you can no longer sign in, write to <a href="mailto:${MAIL}?subject=Delete%20my%20account">${MAIL}</a> from the email of your account and we delete it within 30 days.`
    ],
    h1: "How to delete it",
    h2: "What is deleted and what stays",
    what: ["The account, your email, your synced data, your devices, your race analyses, your notifications and linked Steam or Discord accounts are deleted at once.", "Your laps on the leaderboard and the laps the coach model learns from stay, as an anonymous driver without your name.", "The data on your PC stays until you uninstall Pitlane HQ Agent from it. Uninstalling removes all of it from the PC."],
    more: 'More in the <a href="/privacy">privacy policy</a>.'
  },
  es: {
    title: "Borrar tu cuenta de Pitlane HQ",
    steps: [
      "En la app del m\xF3vil, abre Cuenta, escribe tu contrase\xF1a en Borrar cuenta y toca Borrar.",
      'O en la web, abre <a href="/">pitlanehq.app</a>, inicia sesi\xF3n, abre Cuenta y usa Borrar cuenta al final.',
      `Si ya no puedes iniciar sesi\xF3n, escribe a <a href="mailto:${MAIL}?subject=Borrar%20mi%20cuenta">${MAIL}</a> desde el email de tu cuenta y la borramos en 30 d\xEDas como mucho.`
    ],
    h1: "C\xF3mo borrarla",
    h2: "Qu\xE9 se borra y qu\xE9 se queda",
    what: ["La cuenta, tu email, tus datos sincronizados, tus dispositivos, tus an\xE1lisis de carrera, tus avisos y las cuentas de Steam o Discord vinculadas se borran al momento.", "Tus vueltas en la leaderboard y las vueltas de las que aprende el modelo del coach se quedan, como un piloto an\xF3nimo sin tu nombre.", "Los datos de tu PC se quedan hasta que desinstales Pitlane HQ Agent de \xE9l. Al desinstalarlo se borra todo del PC."],
    more: 'M\xE1s en la <a href="/privacy?lang=es">pol\xEDtica de privacidad</a>.'
  },
  pt: {
    title: "Apagar sua conta do Pitlane HQ",
    steps: [
      "No app do celular, abra Conta, escreva sua senha em Apagar conta e toque em Apagar.",
      'Ou na web, abra <a href="/">pitlanehq.app</a>, entre, abra Conta e use Apagar conta no final.',
      `Se voc\xEA n\xE3o consegue mais entrar, escreva para <a href="mailto:${MAIL}?subject=Apagar%20minha%20conta">${MAIL}</a> do email da sua conta e n\xF3s a apagamos em at\xE9 30 dias.`
    ],
    h1: "Como apag\xE1-la",
    h2: "O que \xE9 apagado e o que fica",
    what: ["A conta, seu email, seus dados sincronizados, seus dispositivos, suas an\xE1lises de corrida, seus avisos e as contas de Steam ou Discord vinculadas s\xE3o apagados na hora.", "Suas voltas na classifica\xE7\xE3o e as voltas com que o modelo do coach aprende ficam, como um piloto an\xF4nimo sem seu nome.", "Os dados do seu PC ficam at\xE9 voc\xEA desinstalar o Pitlane HQ Agent dele. A desinstala\xE7\xE3o apaga tudo do PC."],
    more: 'Mais na <a href="/privacy?lang=pt">pol\xEDtica de privacidade</a>.'
  }
};
function legalLang(req, url) {
  const q2 = (url.searchParams.get("lang") || "").slice(0, 2).toLowerCase();
  if (PRIVACY[q2]) return q2;
  for (const part of (req.headers.get("accept-language") || "").toLowerCase().split(",")) {
    const l = part.trim().slice(0, 2);
    if (PRIVACY[l]) return l;
  }
  return "en";
}
__name(legalLang, "legalLang");
var LN = { en: "English", es: "Espa\xF1ol", pt: "Portugu\xEAs" };
var shell = /* @__PURE__ */ __name((l, path, title, body) => `<!doctype html><html lang="${l === "pt" ? "pt-BR" : l}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc5(title)} \xB7 Pitlane HQ</title><link rel="canonical" href="https://pitlanehq.app${path}${l === "en" ? "" : "?lang=" + l}"><link rel="icon" href="/favicon.ico" sizes="any">
<style>body{margin:0;background:#11151b;color:#e7ebf1;font:16px/1.6 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:28px 16px 48px}h1{font-size:26px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 8px;color:#ffb02e}p{color:#a9b4c3;margin:6px 0}ul,ol{padding-left:20px;color:#c9d2de}li{margin:6px 0}a{color:#ffb02e}.m{color:#8a97a9;font-size:13px}.top{display:flex;align-items:center;gap:10px;margin-bottom:18px}.top b{font-size:15px;letter-spacing:.06em}.top img{width:28px;height:28px;border-radius:7px}</style>
<main><div class="top"><img src="/icon-192.png" alt=""><b>PITLANE HQ</b></div>${body}<p class="m" style="margin-top:28px">${Object.keys(LN).map((k) => `<a href="${path}?lang=${k}" hreflang="${k}">${LN[k]}</a>`).join(" \xB7 ")}</p></main></html>`, "shell");
function privacyPage(l) {
  const p = PRIVACY[l] || PRIVACY.en;
  return shell(l, "/privacy", p.title, `<h1>${esc5(p.title)}</h1><p class="m">${esc5(p.up)} ${UPDATED}</p><p>${esc5(p.intro)}</p>` + p.s.map(([h, items]) => `<h2>${esc5(h)}</h2>` + (items.length > 1 ? `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>` : `<p>${items[0]}</p>`)).join(""));
}
__name(privacyPage, "privacyPage");
function termsPage(l) {
  const p = TERMS[l] || TERMS.en, up = (PRIVACY[l] || PRIVACY.en).up;
  return shell(l, "/terms", p.title, `<h1>${esc5(p.title)}</h1><p class="m">${esc5(up)} ${UPDATED}</p><p>${esc5(p.intro)}</p>` + p.s.map(([h, items]) => `<h2>${esc5(h)}</h2>` + items.map((x) => `<p>${x}</p>`).join("")).join(""));
}
__name(termsPage, "termsPage");
function deletePage(l) {
  const d = DELETE[l] || DELETE.en;
  return shell(l, "/delete-account", d.title, `<h1>${esc5(d.title)}</h1><h2>${esc5(d.h1)}</h2><ol>${d.steps.map((x) => `<li>${x}</li>`).join("")}</ol><h2>${esc5(d.h2)}</h2><ul>${d.what.map((x) => `<li>${esc5(x)}</li>`).join("")}</ul><p>${d.more}</p>`);
}
__name(deletePage, "deletePage");
function legal(req, url) {
  const p = url.pathname.replace(/\/+$/, "");
  const page4 = { "/privacy": privacyPage, "/terms": termsPage, "/delete-account": deletePage }[p];
  if (!page4) return null;
  const l = legalLang(req, url);
  return new Response(page4(l), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", vary: "Accept-Language" } });
}
__name(legal, "legal");

// src/reportslib.js
var APPS = ["pc", "web", "android", "ios"];
var STACK_MAX = 8e3;
var MSG_MAX = 500;
var LOG_MAX = 512 * 1024;
var LOGS_PER_DAY = 3;
var CRASH_DAYS = 30;
var USAGE_DAYS = 30;
var clean = /* @__PURE__ */ __name((v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max), "clean");
var cleanV3 = /* @__PURE__ */ __name((v) => String(v == null ? "" : v).replace(/[^0-9a-zA-Z.+-]/g, "").slice(0, 24), "cleanV");
function crashSig(app, where, msg, stack) {
  const norm = /* @__PURE__ */ __name((s2) => String(s2 || "").replace(/0x[0-9a-f]+/gi, "0x").replace(/\d+/g, "0"), "norm");
  const frames = String(stack || "").split("\n").map((l) => l.trim()).filter((l) => l && !/^goroutine |^\s*$/.test(l)).slice(0, 6).map(norm).join("|");
  const s = [app, norm(where), norm(String(msg || "").split("\n")[0]), frames].join("~");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return app + "-" + h.toString(36);
}
__name(crashSig, "crashSig");
function cleanCrash(b) {
  if (!b || typeof b !== "object") return { error: "missing body" };
  const app = String(b.app || "").toLowerCase();
  if (!APPS.includes(app)) return { error: "unknown app" };
  const msg = clean(b.msg, MSG_MAX).trim();
  if (!msg) return { error: "missing msg" };
  const where = clean(b.where, 80).trim(), stack = clean(b.stack, STACK_MAX);
  return { app, v: cleanV3(b.v), os: clean(b.os, 60), where, msg, stack, sig: crashSig(app, where, msg, stack) };
}
__name(cleanCrash, "cleanCrash");
var SQL_CRASH_ADD = `INSERT INTO crash_reports (sig, app, v, os, at_where, msg, stack, first, last, n, last_account) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8,1,?9)
  ON CONFLICT(sig) DO UPDATE SET n=crash_reports.n+1, last=excluded.last, v=excluded.v, os=excluded.os, msg=excluded.msg, stack=excluded.stack, last_account=COALESCE(excluded.last_account, crash_reports.last_account)`;
var SQL_CRASHES = "SELECT c.sig, c.app, c.v, c.os, c.at_where, c.msg, c.stack, c.first, c.last, c.n, c.last_account, a.display AS nick FROM crash_reports c LEFT JOIN accounts a ON a.id=c.last_account WHERE c.last>?1 ORDER BY c.last DESC LIMIT 200";
var SQL_CRASH_DEL = "DELETE FROM crash_reports WHERE sig=?1";
var SQL_CRASH_PRUNE = "DELETE FROM crash_reports WHERE last<?1";
var SQL_LOG_ADD = "INSERT INTO support_logs (id, account_id, created, device, v, bytes, text) VALUES (?1,?2,?3,?4,?5,?6,?7)";
var SQL_LOGS_SINCE = "SELECT COUNT(*) AS n FROM support_logs WHERE account_id=?1 AND created>?2";
var SQL_LOG_GET = "SELECT id, account_id, created, device, v, bytes, text FROM support_logs WHERE id=?1";
var SQL_LOG_PRUNE = "DELETE FROM support_logs WHERE created<?1";
var SQL_USAGE_ADD2 = `INSERT INTO d1_usage (day, route, reqs, rows_read, rows_written) VALUES (?1,?2,?3,?4,?5)
  ON CONFLICT(day, route) DO UPDATE SET reqs=d1_usage.reqs+excluded.reqs, rows_read=d1_usage.rows_read+excluded.rows_read, rows_written=d1_usage.rows_written+excluded.rows_written`;
var SQL_USAGE_DAYS = "SELECT day, route, reqs, rows_read, rows_written FROM d1_usage WHERE day>=?1 ORDER BY day";
var SQL_USAGE_PRUNE = "DELETE FROM d1_usage WHERE day<?1";
var day3 = /* @__PURE__ */ __name((t) => new Date(t).toISOString().slice(0, 10), "day");
function usageOf(rows) {
  const by = /* @__PURE__ */ new Map(), days = /* @__PURE__ */ new Map();
  for (const r4 of rows) {
    const x = by.get(r4.route) || { route: r4.route, reqs: 0, read: 0, written: 0, days: {} };
    x.reqs += r4.reqs;
    x.read += r4.rows_read;
    x.written += r4.rows_written;
    x.days[r4.day] = r4.rows_read;
    by.set(r4.route, x);
    const d = days.get(r4.day) || { day: r4.day, reqs: 0, read: 0, written: 0 };
    d.reqs += r4.reqs;
    d.read += r4.rows_read;
    d.written += r4.rows_written;
    days.set(r4.day, d);
  }
  return { routes: [...by.values()].sort((a, b) => b.read - a.read), days: [...days.values()].sort((a, b) => a.day < b.day ? -1 : 1) };
}
__name(usageOf, "usageOf");
function routeKey(method, path) {
  const segs = String(path || "/").split("/").map((s) => /\d/.test(s) || s.length > 24 || /^[A-Za-z0-9_-]{16,}$/.test(s) ? ":x" : s);
  return (method || "GET") + " " + (segs.join("/").slice(0, 80) || "/");
}
__name(routeKey, "routeKey");
var json14 = /* @__PURE__ */ __name((o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var err10 = /* @__PURE__ */ __name((m, s) => json14({ error: m }, s), "err");
async function handleReports(req, env, url, { sessionAccount: sessionAccount2, isAdmin: isAdmin2 }) {
  const p = url.pathname, m = req.method, now = Date.now();
  if (p === "/community/crash" && m === "POST") {
    const raw = await req.text().catch(() => "");
    if (raw.length > STACK_MAX * 2) return err10("too big", 413);
    let b = null;
    try {
      b = JSON.parse(raw);
    } catch (e) {
    }
    const c = cleanCrash(b);
    if (c.error) return err10(c.error, 400);
    const acc2 = await sessionAccount2(req, env).catch(() => null);
    await env.DB.prepare(SQL_CRASH_ADD).bind(c.sig, c.app, c.v, c.os, c.where, c.msg, c.stack, now, acc2 ? acc2.id : null).run();
    return json14({ ok: true });
  }
  const ours = p === "/community/support/logs" || p === "/community/admin/crashes" || p.startsWith("/community/admin/crashes/") || p.startsWith("/community/admin/support/logs/") || p === "/community/admin/d1";
  if (!ours) return null;
  const acc = await sessionAccount2(req, env);
  if (!acc) return err10("sign in with your Pitlane HQ account", 401);
  if (p === "/community/support/logs" && m === "POST") {
    const b = await req.json().catch(() => null) || {};
    const text2 = clean(b.text, LOG_MAX + 1).replace(/\r\n?/g, "\n");
    if (!text2.trim()) return err10("the log is empty", 400);
    if (text2.length > LOG_MAX) return err10("the log is too big", 413);
    const c = await env.DB.prepare(SQL_LOGS_SINCE).bind(acc.id, now - 864e5).first();
    if (c && c.n >= LOGS_PER_DAY) return err10("that is enough for today, we answer soon", 429);
    const id2 = crypto.randomUUID(), mid = crypto.randomUUID(), device = APPS.includes(String(b.device)) ? String(b.device) : "", v = cleanV3(b.v);
    const kb = Math.max(1, Math.round(text2.length / 1024));
    const line = "Logs sent, " + kb + " KB";
    await env.DB.batch([
      env.DB.prepare(SQL_LOG_ADD).bind(id2, acc.id, now, device, v, text2.length, text2),
      ...driverMessage(env, acc.id, mid, now, { text: line, device, v, view: "log:" + id2, kind: "logs" })
    ]);
    return json14({ ok: true, msg: { id: mid, me: true, text: line, created: now, kind: "logs" } });
  }
  if (!isAdmin2(env, acc.id)) return err10("only the admins of this server can do this", 403);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "7", 10) || 7));
  if (p === "/community/admin/crashes" && m === "GET") {
    const r4 = await env.DB.prepare(SQL_CRASHES).bind(now - days * 864e5).all();
    return json14({ items: (r4.results || []).map((x) => ({ sig: x.sig, app: x.app, v: x.v, os: x.os, where: x.at_where, msg: x.msg, stack: x.stack, first: x.first, last: x.last, n: x.n, nick: x.nick || "" })) });
  }
  if (p.startsWith("/community/admin/crashes/") && m === "DELETE") {
    await env.DB.prepare(SQL_CRASH_DEL).bind(decodeURIComponent(p.slice(25))).run();
    return json14({ ok: true });
  }
  if (p.startsWith("/community/admin/support/logs/") && m === "GET") {
    const r4 = await env.DB.prepare(SQL_LOG_GET).bind(decodeURIComponent(p.slice(30))).first();
    if (!r4) return err10("not found", 404);
    return json14({ id: r4.id, accountId: r4.account_id, created: r4.created, device: r4.device || "", v: r4.v || "", bytes: r4.bytes, text: r4.text });
  }
  if (p === "/community/admin/d1" && m === "GET") {
    const r4 = await env.DB.prepare(SQL_USAGE_DAYS).bind(day3(now - (days - 1) * 864e5)).all();
    return json14(usageOf(r4.results || []));
  }
  return err10("not found", 404);
}
__name(handleReports, "handleReports");
var pruneReports = /* @__PURE__ */ __name((env, now = Date.now()) => env.DB.batch([
  env.DB.prepare(SQL_CRASH_PRUNE).bind(now - CRASH_DAYS * 864e5),
  env.DB.prepare(SQL_LOG_PRUNE).bind(now - CRASH_DAYS * 864e5),
  env.DB.prepare(SQL_USAGE_PRUNE).bind(day3(now - USAGE_DAYS * 864e5))
]), "pruneReports");
var TALLY = /* @__PURE__ */ new Map();
var lastFlush = Date.now();
function countingDB(db, route) {
  const add = /* @__PURE__ */ __name((meta) => {
    const t = TALLY.get(route) || { reqs: 0, read: 0, written: 0 };
    if (meta) {
      t.read += meta.rows_read || 0;
      t.written += meta.rows_written || 0;
    }
    TALLY.set(route, t);
  }, "add");
  add(null);
  TALLY.get(route).reqs++;
  const RAW = /* @__PURE__ */ Symbol.for("pitlane.raw");
  const wrap = /* @__PURE__ */ __name((s) => new Proxy(s, {
    get(o, k) {
      if (k === RAW) return o;
      if (k === "bind") return (...a) => wrap(o.bind(...a));
      if (k === "all" || k === "run") return async (...a) => {
        const r4 = await o[k](...a);
        add(r4 && r4.meta);
        return r4;
      };
      if (k === "first") return async (col) => {
        const r4 = await o.all();
        add(r4 && r4.meta);
        const row = r4 && r4.results && r4.results[0] || null;
        return col == null ? row : row ? row[col] ?? null : null;
      };
      const v = o[k];
      return typeof v === "function" ? v.bind(o) : v;
    }
  }), "wrap");
  return new Proxy(db, {
    get(o, k) {
      if (k === "prepare") return (sql) => wrap(o.prepare(sql));
      if (k === "batch") return async (qs) => {
        const out = await o.batch(qs.map((q2) => q2 && q2[RAW] || q2));
        for (const r4 of out || []) add(r4 && r4.meta);
        return out;
      };
      const v = o[k];
      return typeof v === "function" ? v.bind(o) : v;
    }
  });
}
__name(countingDB, "countingDB");
async function flushUsage(db, force = false, now = Date.now()) {
  if (!TALLY.size || !force && now - lastFlush < 6e4) return;
  lastFlush = now;
  const d = day3(now), rows = [...TALLY.entries()];
  TALLY.clear();
  await db.batch(rows.map(([route, t]) => db.prepare(SQL_USAGE_ADD2).bind(d, route, t.reqs, t.read, t.written))).catch(() => {
  });
}
__name(flushUsage, "flushUsage");

// src/reports.js
var reportsRoute = /* @__PURE__ */ __name((req, env, url) => handleReports(req, env, url, { sessionAccount, isAdmin }), "reportsRoute");

// src/worker.js
var JSONH10 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
var json15 = /* @__PURE__ */ __name((v, status = 200) => new Response(JSON.stringify(v), { status, headers: JSONH10 }), "json");
var err11 = /* @__PURE__ */ __name((msg, status) => json15({ error: msg }, status), "err");
function same5(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
__name(same5, "same");
async function sha2563(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(sha2563, "sha256");
async function who(req, env) {
  const h = req.headers.get("authorization") || "";
  const key2 = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!key2) return null;
  const acc = await sessionAccount(req, env).catch(() => null);
  if (acc) return { role: "account", name: "acct:" + acc.id, display: acc.display };
  if (env.PITLANE_KEY && same5(key2, env.PITLANE_KEY)) return { role: "owner", name: "owner" };
  if (env.VIEW_KEY && same5(key2, env.VIEW_KEY)) return { role: "viewer", name: "viewer" };
  const m = await env.DB.prepare("SELECT name FROM members WHERE key_hash=?1").bind(await sha2563(key2)).first().catch(() => null);
  return m ? { role: "member", name: m.name } : null;
}
__name(who, "who");
var str4 = /* @__PURE__ */ __name((v, max = 120) => typeof v === "string" ? v.slice(0, max) : v == null ? null : String(v).slice(0, max), "str");
var num3 = /* @__PURE__ */ __name((v) => typeof v === "number" && isFinite(v) ? v : null, "num");
var idOk = /* @__PURE__ */ __name((v) => typeof v === "string" && /^[A-Za-z0-9_.:-]{6,80}$/.test(v), "idOk");
var posInt = /* @__PURE__ */ __name((v) => Number.isInteger(v) && v > 0 && v < 1e9 ? v : null, "posInt");
var offlineAI = /* @__PURE__ */ __name((s) => gameOf(s.game) === "iracing" && /(^|:)t-/.test(String(s.id || "")) && !/test/i.test(String(s.kind || "")), "offlineAI");
async function upsertSession(env, s, uploader) {
  if (!idOk(s.id) || !num3(s.started) || !s.track || !s.car) return "session needs id, started, track and car";
  await env.DB.prepare(
    `INSERT INTO sessions (id, started, track, track_config, car, kind, series, driver, air_temp, track_temp, uploader, game, track_id, car_id, official, lic, cat, ai, pos, field, pos_cls, tank)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, tank=COALESCE(excluded.tank, tank), air_temp=excluded.air_temp, track_temp=excluded.track_temp, track_id=COALESCE(excluded.track_id, track_id), car_id=COALESCE(excluded.car_id, car_id), official=COALESCE(excluded.official, official), ai=COALESCE(excluded.ai, ai),
       lic=COALESCE(excluded.lic, lic), cat=COALESCE(excluded.cat, cat),
       pos=COALESCE(excluded.pos, pos), field=CASE WHEN excluded.pos IS NULL THEN field ELSE excluded.field END, pos_cls=CASE WHEN excluded.pos IS NULL THEN pos_cls ELSE excluded.pos_cls END`
  ).bind(s.id, Math.round(s.started), str4(s.track), str4(s.trackConfig), str4(s.car), str4(s.kind, 40), str4(s.series), str4(s.driver, 80), num3(s.airTemp), num3(s.trackTemp), uploader, gameOf(s.game), posInt(s.trackId), posInt(s.carId), typeof s.official === "boolean" ? s.official ? 1 : 0 : null, licOf(s.lic), str4(s.cat, 20), s.ai === true || offlineAI(s) ? 1 : null, ...placeOf(s), num3(s.tank) > 0 && s.tank < 1e3 ? Math.round(s.tank * 10) / 10 : null).run();
  return null;
}
__name(upsertSession, "upsertSession");
function placeOf(s) {
  const pos = Number.isInteger(s.pos) && s.pos > 0 && s.pos < 1e3 ? s.pos : null;
  if (!pos) return [null, null, null];
  const field = Number.isInteger(s.field) && s.field >= pos && s.field < 1e3 ? s.field : pos;
  return [pos, field, s.cls === true ? 1 : 0];
}
__name(placeOf, "placeOf");
var placeOut = /* @__PURE__ */ __name(({ pos_cls, ...x }) => ({ ...x, pos: x.pos || null, field: x.field || null, cls: pos_cls === 1 }), "placeOut");
var lapDrv = /* @__PURE__ */ __name((l) => typeof l.drv === "string" && l.drv.trim() ? l.drv.trim().slice(0, 32) : null, "lapDrv");
async function dropImpossibleLaps(env, sid) {
  const r4 = await env.DB.batch([
    env.DB.prepare("UPDATE laps SET valid=0 WHERE session_id=?1 AND valid=1 AND COALESCE(sectors,'[]')='[]' AND EXISTS (SELECT 1 FROM laps WHERE session_id=?1 AND COALESCE(sectors,'[]')<>'[]')").bind(sid),
    env.DB.prepare(SESSION_SUMS).bind(sid)
  ]);
  return r4[0].meta.changes || 0;
}
__name(dropImpossibleLaps, "dropImpossibleLaps");
async function validityChanged(env, sid) {
  await env.DB.prepare(SESSION_SUMS).bind(sid).run().catch(() => {
  });
  const s = await env.DB.prepare("SELECT uploader FROM sessions WHERE id=?1").bind(sid).first().catch(() => null);
  if (s && String(s.uploader).startsWith("acct:")) await unshareInvalid(env, String(s.uploader).slice(5), sid).catch(() => {
  });
}
__name(validityChanged, "validityChanged");
async function addLap(env, sessionId, l) {
  if (!idOk(sessionId) || !idOk(l.id) || !num3(l.n) || !num3(l.time) || l.time <= 0 || l.time > 3600) return "lap needs id, n and time";
  const plain2 = l.trace ? JSON.stringify(l.trace) : null;
  if (plain2 && plain2.length > 9e5) return "lap trace too large";
  const trace = await sealData(env, plain2);
  if (l.repair === true) {
    const old = await env.DB.prepare("SELECT id, trace FROM laps WHERE session_id=?1 AND n=?2 AND abs(time-?3)<0.0006 AND valid=0 LIMIT 1").bind(sessionId, Math.round(l.n), l.time).first() || await env.DB.prepare("SELECT l.id, l.trace FROM laps l JOIN sessions s ON s.id=l.session_id JOIN sessions t ON t.id=?1 WHERE s.uploader=t.uploader AND s.track=t.track AND s.car=t.car AND abs(l.time-?2)<0.0006 AND l.valid=0 AND abs(s.started-t.started)<43200000 LIMIT 1").bind(sessionId, l.time).first();
    if (!old) return null;
    let tr2 = null;
    try {
      tr2 = old.trace ? JSON.parse(await openData(env, old.trace)) : null;
    } catch (e) {
      tr2 = null;
    }
    if (!traceHole(tr2) || l.valid === false || !plain2) return null;
    const sectors2 = Array.isArray(l.sectors) ? JSON.stringify(l.sectors.filter((x) => typeof x === "number").slice(0, 40)) : null;
    await env.DB.prepare("UPDATE laps SET trace=?2, valid=1, sectors=COALESCE(?3, sectors), inc=?4 WHERE id=?1").bind(old.id, trace, sectors2, Math.max(0, Math.round(num3(l.inc) || 0))).run();
    await env.DB.prepare(SESSION_SUMS).bind(sessionId).run().catch(() => {
    });
    return null;
  }
  const sectors = Array.isArray(l.sectors) ? JSON.stringify(l.sectors.filter((x) => typeof x === "number").slice(0, 40)) : null;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO laps (id, session_id, n, time, valid, fuel, vmax, sectors, trace, created, inc, drv) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
       ON CONFLICT(id) DO NOTHING`
    ).bind(l.id, sessionId, Math.round(l.n), l.time, l.valid === false ? 0 : 1, num3(l.fuel), num3(l.vmax), sectors, trace, Date.now(), Math.max(0, Math.round(num3(l.inc) || 0)), lapDrv(l)),
    env.DB.prepare(SESSION_SUMS).bind(sessionId)
  ]);
  return null;
}
__name(addLap, "addLap");
async function api(req, env, url, ctx) {
  const me2 = await who(req, env);
  if (!me2) return err11(env.PITLANE_KEY ? "wrong or missing key" : "sign in with your Pitlane HQ account (this server has no PITLANE_KEY)", 401);
  const role = me2.role;
  const p = url.pathname;
  const m = req.method;
  if (p === "/api/me") return json15({ role, name: me2.name, display: me2.display });
  const admins = (env.ADMINS || env.SEASON_UPLOADERS || "").split(",").map((x) => x.trim()).filter(Boolean);
  const admin = role === "account" && admins.includes(me2.name.replace(/^acct:/, ""));
  const own = role === "account" ? me2.name : null;
  const ownRead = admin ? null : own;
  if (p === "/api/upload" && m === "POST") {
    if (role === "viewer") return err11("this key can only read", 403);
    const body = await req.json().catch(() => null);
    if (!body || !body.session) return err11("bad upload", 400);
    if ((role === "member" || role === "account") && body.session.id) body.session.id = (me2.name.replace(/[^A-Za-z0-9_.-]/g, "_") + ":" + body.session.id).slice(0, 80);
    if (body.session.imported === true && Array.isArray(body.laps) && body.laps.length) {
      const st = Number(body.session.started) || 0;
      const have = await env.DB.prepare(
        `SELECT l.time FROM laps l JOIN sessions s ON s.id=l.session_id WHERE s.uploader=?1 AND s.track=?2 AND s.car=?3 AND s.started BETWEEN ?4 AND ?5`
      ).bind(me2.name, str4(body.session.track), str4(body.session.car), st - 12 * 36e5, st + 12 * 36e5).all().catch(() => ({ results: [] }));
      const times = (have.results || []).map((x) => x.time);
      body.laps = body.laps.filter((l) => l && (l.repair === true || !(num3(l.time) && times.some((t) => Math.abs(t - l.time) < 6e-4))));
      if (!body.laps.length) return json15({ ok: true, shared: false, duplicate: true });
    }
    let e = await upsertSession(env, body.session, me2.name);
    if (!e && posInt(body.session.trackId) && posInt(body.session.carId)) await reconcileIds(env, gameOf(body.session.game), str4(body.session.track), str4(body.session.trackConfig), str4(body.session.car), posInt(body.session.trackId), posInt(body.session.carId)).catch(() => {
    });
    if (!e && posInt(body.session.carId)) await noteCar(env, gameOf(body.session.game), posInt(body.session.carId), str4(body.session.car)).catch(() => {
    });
    if (role === "member" || role === "account") body.laps = (body.laps || []).map((l) => ({ ...l, id: (me2.name.replace(/[^A-Za-z0-9_.-]/g, "_") + ":" + l.id).slice(0, 80) }));
    if (e) return err11(e, 400);
    for (const l of (body.laps || []).slice(0, 50)) {
      e = await addLap(env, body.session.id, l);
      if (e) return err11(e, 400);
    }
    const dropped = await dropImpossibleLaps(env, body.session.id).catch(() => 0);
    if (dropped && role === "account") await unshareInvalid(env, me2.name.slice(5), body.session.id).catch(() => {
    });
    if ((body.laps || []).some((l) => l.valid !== false && l.trace)) await markModel(env, gameOf(body.session.game), posInt(body.session.trackId), posInt(body.session.carId));
    let shared = null;
    const imported = body.session.imported === true;
    if (role === "account") shared = await autoShare(env, me2.name.slice(5), body.session.id, body.laps, { trackId: body.session.trackId, carId: body.session.carId, lic: body.session.lic, cat: body.session.cat, imported }, imported ? null : ctx).catch(() => null);
    return json15({ ok: true, shared: !!(shared && shared.shared) });
  }
  if (p === "/api/sessions/summary" && m === "GET") {
    const q2 = url.searchParams;
    return json15(await sessionSummary(env.DB, { from: q2.get("from"), tz: q2.get("tz"), game: q2.get("game") ? gameOf(q2.get("game")) : null, uploader: own || q2.get("who") || null }));
  }
  if (p === "/api/sessions-owned" && m === "GET") {
    if (!own) return json15({ tracks: [], cars: [] });
    const { results } = await env.DB.prepare(
      "SELECT DISTINCT track, track_config, car FROM sessions WHERE uploader=?1 AND COALESCE(game,'iracing')='iracing' AND LOWER(COALESCE(kind,'')) NOT LIKE '%test%' LIMIT 2000"
    ).bind(own).all();
    const tracks2 = /* @__PURE__ */ new Map(), cars = /* @__PURE__ */ new Set();
    for (const r4 of results || []) {
      const cfg = /^TrackCity:/i.test(r4.track_config || "") ? "" : r4.track_config || "";
      if (r4.track) tracks2.set(r4.track + "\0" + cfg, [r4.track, cfg]);
      if (r4.car) cars.add(r4.car);
    }
    return json15({ tracks: [...tracks2.values()], cars: [...cars] });
  }
  if (p === "/api/sessions" && m === "GET") {
    const q2 = url.searchParams;
    const lim = Math.min(200, +q2.get("limit") || 60);
    let sql = "SELECT * FROM sessions";
    const args = [];
    if (q2.get("track")) {
      args.push(q2.get("track"));
      sql += ` WHERE track=?${args.length}`;
    }
    if (q2.get("car")) {
      args.push(q2.get("car"));
      sql += `${args.length > 1 ? " AND" : " WHERE"} car=?${args.length}`;
    }
    if (q2.get("game")) {
      args.push(gameOf(q2.get("game")));
      sql += `${args.length > 1 ? " AND" : " WHERE"} game=?${args.length}`;
    }
    if (own || q2.get("who")) {
      args.push(own || q2.get("who"));
      sql += `${args.length > 1 ? " AND" : " WHERE"} uploader=?${args.length}`;
    }
    sql += ` ORDER BY started DESC LIMIT ${lim}`;
    const { results } = await env.DB.prepare(sql).bind(...args).all();
    const cm = await catMap(env).catch(() => ({ tc: {}, c: {} }));
    let lics = {};
    if (own && own.startsWith("acct:")) {
      const u = await env.DB.prepare("SELECT lics FROM community_users WHERE id=?1").bind(own.slice(5)).first().catch(() => null);
      try {
        lics = JSON.parse(u && u.lics || "{}") || {};
      } catch (e) {
      }
    }
    return json15((results || []).map(placeOut).map(({ cat, lic, ...x }) => {
      const ir = (x.game || "iracing") === "iracing";
      const c = ir ? catOf(cm, x.track_id, x.car_id, cat, x.track + (x.track_config ? " \xB7 " + x.track_config : ""), x.car) : "sports_car";
      return { ...x, cons: x.cons != null && x.cons >= 0 ? Math.round(Math.sqrt(x.cons) * 1e3) / 1e3 : null, cat: c, lic: lic || ir && c && lics[c] || null };
    }));
  }
  if (p === "/api/bests" && m === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT s.game, s.track, s.track_config, s.car, COALESCE(s.uploader,'owner') AS who, MAX(s.driver) AS driver, MIN(l.time) AS best, COUNT(l.id) AS laps, MAX(s.started) AS last,
        (SELECT l2.id FROM laps l2 JOIN sessions s2 ON s2.id=l2.session_id
         WHERE l2.valid=1 AND l2.drv IS NULL AND s2.game=s.game AND s2.track=s.track AND COALESCE(s2.track_config,'')=COALESCE(s.track_config,'')
           AND s2.car=s.car AND COALESCE(s2.uploader,'')=COALESCE(s.uploader,'') AND (?1 IS NULL OR s2.uploader=?1)
         ORDER BY l2.time LIMIT 1) AS bestLapId,
        (SELECT s2.id FROM laps l2 JOIN sessions s2 ON s2.id=l2.session_id
         WHERE l2.valid=1 AND l2.drv IS NULL AND s2.game=s.game AND s2.track=s.track AND COALESCE(s2.track_config,'')=COALESCE(s.track_config,'')
           AND s2.car=s.car AND COALESCE(s2.uploader,'')=COALESCE(s.uploader,'') AND (?1 IS NULL OR s2.uploader=?1)
         ORDER BY l2.time LIMIT 1) AS bestSessionId
       FROM laps l JOIN sessions s ON s.id=l.session_id WHERE l.valid=1 AND l.drv IS NULL AND (?1 IS NULL OR s.uploader=?1)
       GROUP BY s.game, s.track, s.track_config, s.car, who ORDER BY last DESC LIMIT 600`
    ).bind(own).all();
    return json15(results);
  }
  let mm = p.match(/^\/api\/sessions\/([A-Za-z0-9_.:-]+)\/validate$/);
  if (mm && m === "POST") {
    const admins2 = (env.ADMINS || env.SEASON_UPLOADERS || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (role !== "account" || !admins2.includes(me2.name.replace(/^acct:/, ""))) return err11("only the admins of this server can do this", 403);
    const sid = decodeURIComponent(mm[1]);
    const ls = (await env.DB.prepare("SELECT id, time, sectors, COALESCE(inc,0) AS inc FROM laps WHERE session_id=?1 AND time>0").bind(sid).all()).results || [];
    const secs = /* @__PURE__ */ __name((l) => {
      try {
        const x = JSON.parse(l.sectors || "null");
        return Array.isArray(x) && x.length >= 3 && x.every((v) => v > 0) ? x : null;
      } catch (e) {
        return null;
      }
    }, "secs");
    const med = /* @__PURE__ */ __name((a) => {
      const b = a.filter((x) => x > 0).sort((x, y) => x - y);
      return b.length ? b[Math.floor(b.length / 2)] : 0;
    }, "med");
    const whole = ls.filter((l) => secs(l));
    let mt = med(whole.map((l) => l.time)), ms = [0, 1, 2].map((k) => med(whole.map((l) => secs(l)[k])));
    const ss = await env.DB.prepare("SELECT track_id, car_id, COALESCE(game,'iracing') AS game FROM sessions WHERE id=?1").bind(sid).first().catch(() => null);
    const rec = ss && ss.track_id && ss.car_id ? await env.DB.prepare("SELECT MIN(time) AS t FROM community_laps WHERE track_id=?1 AND car_id=?2 AND game=?3").bind(ss.track_id, ss.car_id, ss.game).first().catch(() => null) : null;
    if (rec && rec.t > mt) {
      const k = rec.t / mt;
      mt = rec.t;
      ms = ms.map((x) => x * k);
    }
    const ok = ls.filter((l) => !l.inc && secs(l) && mt > 0 && l.time >= 0.85 * mt && secs(l).every((v, k) => v >= 0.5 * ms[k]));
    if (ok.length) await env.DB.batch(ok.map((l) => env.DB.prepare("UPDATE laps SET valid=1 WHERE id=?1").bind(l.id)));
    await validityChanged(env, sid);
    return json15({ ok: true, laps: ok.length });
  }
  mm = p.match(/^\/api\/sessions\/([A-Za-z0-9_.:-]+)\/driver$/);
  if (mm && m === "POST") {
    const sid = decodeURIComponent(mm[1]);
    const s = await env.DB.prepare("SELECT uploader FROM sessions WHERE id=?1").bind(sid).first();
    if (!s || role === "viewer" || own && s.uploader !== own) return err11("not found", 404);
    const b = await req.json().catch(() => ({}));
    const n = Math.round(num3(b.n) || 0);
    if (!n) return err11("which lap?", 400);
    await env.DB.batch([env.DB.prepare("UPDATE laps SET drv=?3 WHERE session_id=?1 AND n=?2").bind(sid, n, lapDrv(b)), env.DB.prepare(SESSION_SUMS).bind(sid)]);
    if (String(s.uploader).startsWith("acct:")) await reshareSession(env, String(s.uploader).slice(5), sid).catch(() => {
    });
    return json15({ ok: true });
  }
  mm = p.match(/^\/api\/sessions\/([A-Za-z0-9_.:-]+)\/incidents$/);
  if (mm && m === "POST") {
    const sid = decodeURIComponent(mm[1]);
    const s = await env.DB.prepare("SELECT uploader FROM sessions WHERE id=?1").bind(sid).first();
    if (!s || role === "viewer" || own && s.uploader !== own) return err11("not found", 404);
    const b = await req.json().catch(() => ({}));
    const laps = Array.isArray(b.laps) ? b.laps.slice(0, 200) : [];
    const stmts = [];
    const have = (await env.DB.prepare("SELECT n, trace FROM laps WHERE session_id=?1 AND COALESCE(inc,0)=0").bind(sid).all()).results || [];
    const byN = new Map(have.map((r4) => [r4.n, r4]));
    for (const l of laps) {
      const n = Math.round(num3(l.n) || 0), inc = Math.max(0, Math.round(num3(l.inc) || 0));
      const at2 = Array.isArray(l.at) ? l.at.filter((v) => typeof v === "number" && isFinite(v)).slice(0, 160) : [];
      if (!n || !byN.has(n)) continue;
      const ks = Array.isArray(l.k) ? l.k.filter((v) => ["off", "loss", "light", "contact"].includes(v)).slice(0, 80) : [];
      let trace = byN.get(n).trace;
      if (trace) {
        try {
          const t = JSON.parse(await openData(env, trace));
          t.inc = at2;
          t.incK = ks;
          trace = await sealData(env, JSON.stringify(t));
        } catch (e) {
        }
      }
      stmts.push(env.DB.prepare("UPDATE laps SET inc=?3, trace=?4 WHERE session_id=?1 AND n=?2 AND COALESCE(inc,0)=0").bind(sid, n, inc, trace));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json15({ ok: true, laps: stmts.length });
  }
  mm = p.match(/^\/api\/laps\/([A-Za-z0-9_.:-]+)\/valid$/);
  if (mm && m === "POST") {
    const admins2 = (env.ADMINS || env.SEASON_UPLOADERS || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (role !== "account" || !admins2.includes(me2.name.replace(/^acct:/, ""))) return err11("only the admins of this server can do this", 403);
    const b = await req.json().catch(() => ({}));
    const lid = decodeURIComponent(mm[1]);
    const r4 = await env.DB.prepare("UPDATE laps SET valid=?2 WHERE id=?1").bind(lid, b.valid === false ? 0 : 1).run();
    const lr = await env.DB.prepare("SELECT session_id FROM laps WHERE id=?1").bind(lid).first();
    if (lr) await validityChanged(env, lr.session_id);
    return json15({ ok: true, changed: r4.meta ? r4.meta.changes : void 0, valid: b.valid !== false });
  }
  mm = p.match(/^\/api\/sessions\/([A-Za-z0-9_.:-]+)$/);
  if (mm) {
    if (m === "DELETE") {
      const own2 = await env.DB.prepare("SELECT uploader FROM sessions WHERE id=?1").bind(mm[1]).first();
      if (role === "viewer" || (role === "member" || role === "account") && (!own2 || own2.uploader !== me2.name)) return err11("you can only delete your own sessions", 403);
      await env.DB.batch([env.DB.prepare("DELETE FROM laps WHERE session_id=?1").bind(mm[1]), env.DB.prepare("DELETE FROM sessions WHERE id=?1").bind(mm[1])]);
      return json15({ ok: true });
    }
    const sid = decodeURIComponent(mm[1]);
    const s = await env.DB.prepare("SELECT * FROM sessions WHERE id=?1").bind(sid).first();
    if (!s || ownRead && s.uploader !== ownRead) return err11("not found", 404);
    const withTraces = url.searchParams.get("traces") === "1";
    const { results } = await env.DB.prepare(`SELECT id, n, time, valid, fuel, vmax, sectors, inc, drv${withTraces ? ", trace" : ""} FROM laps WHERE session_id=?1 ORDER BY n`).bind(sid).all();
    const laps = [];
    for (const l of results) laps.push({ ...l, sectors: l.sectors ? JSON.parse(l.sectors) : null, ...withTraces ? { trace: l.trace ? JSON.parse(await openData(env, l.trace)) : null } : {} });
    let who2;
    if (me2 && s.uploader !== me2.name && String(s.uploader || "").startsWith("acct:")) {
      const a = await env.DB.prepare("SELECT display FROM accounts WHERE id=?1").bind(String(s.uploader).slice(5)).first().catch(() => null);
      who2 = a && a.display || "";
    }
    return json15({ session: { ...placeOut(s), cons: s.cons != null && s.cons >= 0 ? Math.round(Math.sqrt(s.cons) * 1e3) / 1e3 : null, ...who2 !== void 0 ? { other: true, who: who2 } : {} }, laps });
  }
  if (p === "/api/teambest" && m === "GET") {
    const q2 = url.searchParams;
    const l = await env.DB.prepare(
      `SELECT l.id FROM laps l JOIN sessions s ON s.id=l.session_id WHERE l.valid=1 AND l.drv IS NULL AND l.trace IS NOT NULL AND s.track=?1 AND COALESCE(s.track_config,'')=?2 AND s.car=?3 AND (?4 IS NULL OR s.uploader=?4) AND s.game=?5 ORDER BY l.time LIMIT 1`
    ).bind(q2.get("track") || "", q2.get("config") || "", q2.get("car") || "", own, gameOf(q2.get("game"))).first();
    return json15(l || {});
  }
  if (p === "/api/team") {
    if (role === "account") return json15({ members: [], me: me2.display || me2.name, role });
    if (m === "GET") {
      const { results } = await env.DB.prepare("SELECT name, created FROM members ORDER BY name").all();
      return json15({ members: results, me: me2.name, role });
    }
    if (role !== "owner") return err11("only the owner manages the team", 403);
    if (m === "POST") {
      const b = await req.json().catch(() => ({}));
      const name2 = str4(b.name, 40);
      if (!name2 || !/^[\p{L}\p{N} _.'-]{2,40}$/u.test(name2) || name2 === "owner" || name2 === "viewer") return err11("choose a name of 2 to 40 letters", 400);
      const key2 = [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, "0")).join("");
      try {
        await env.DB.prepare("INSERT INTO members (name, key_hash, created) VALUES (?1,?2,?3)").bind(name2, await sha2563(key2), Date.now()).run();
      } catch (e) {
        return err11("that name is already in the team", 400);
      }
      return json15({ name: name2, key: key2 });
    }
  }
  mm = p.match(/^\/api\/team\/(.+)$/);
  if (mm && m === "DELETE") {
    if (role !== "owner") return err11("only the owner manages the team", 403);
    await env.DB.prepare("DELETE FROM members WHERE name=?1").bind(decodeURIComponent(mm[1])).run();
    return json15({ ok: true });
  }
  mm = p.match(/^\/api\/laps\/([A-Za-z0-9_.:-]+)\/valid$/);
  if (mm && m === "POST") {
    if (!admin) return err11("only the admins of this server can do this", 403);
    const b = await req.json().catch(() => ({}));
    const l = await env.DB.prepare("SELECT l.session_id, s.uploader FROM laps l JOIN sessions s ON s.id=l.session_id WHERE l.id=?1").bind(decodeURIComponent(mm[1])).first();
    if (!l) return err11("not found", 404);
    await env.DB.batch([env.DB.prepare("UPDATE laps SET valid=?2 WHERE id=?1").bind(decodeURIComponent(mm[1]), b.valid ? 1 : 0), env.DB.prepare(SESSION_SUMS).bind(l.session_id)]);
    if (String(l.uploader).startsWith("acct:")) {
      const uid = String(l.uploader).slice(5);
      if (b.valid) await reshareSession(env, uid, l.session_id).catch(() => {
      });
      else await unshareInvalid(env, uid, l.session_id).catch(() => {
      });
    }
    return json15({ ok: true });
  }
  mm = p.match(/^\/api\/laps\/([A-Za-z0-9_.:-]+)$/);
  if (mm && m === "GET") {
    const lid = decodeURIComponent(mm[1]);
    const l = await env.DB.prepare("SELECT l.*, s.track, s.car, s.started, s.driver, s.uploader FROM laps l JOIN sessions s ON s.id=l.session_id WHERE l.id=?1").bind(lid).first();
    if (!l || ownRead && l.uploader !== ownRead) return err11("not found", 404);
    return json15({ ...l, trace: l.trace ? JSON.parse(await openData(env, l.trace)) : null, sectors: l.sectors ? JSON.parse(l.sectors) : null });
  }
  return err11("not found", 404);
}
__name(api, "api");
function traceLapTime(t) {
  const d = t && Array.isArray(t.d) ? t.d : null;
  if (!d || d.length < 40) return null;
  const bin = num3(t.bin) || 5;
  let k = d.length - 1;
  while (k > 0 && d[k - 1] && d[k] && d[k - 1][5] === d[k][5]) k--;
  const p = d[k];
  if (!p || !(p[5] > 0) || !(p[0] > 1)) return null;
  return p[5] + (d.length - k) * bin / p[0];
}
__name(traceLapTime, "traceLapTime");
async function repairImpossibleShares(env) {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT c.user_id AS uid, l.session_id AS sid FROM laps l
       JOIN sessions s ON s.id=l.session_id AND s.uploader LIKE 'acct:%'
       JOIN community_laps c ON c.user_id=substr(s.uploader,6) AND abs(l.time-c.time)<0.0006
     WHERE l.valid=0 AND l.drv IS NULL
       AND NOT EXISTS (SELECT 1 FROM laps v WHERE v.session_id=l.session_id AND v.valid=1 AND v.drv IS NULL AND abs(v.time-l.time)<0.0006)
     LIMIT 5`
  ).all();
  for (const r4 of results || []) await unshareInvalid(env, r4.uid, r4.sid).catch(() => {
  });
}
__name(repairImpossibleShares, "repairImpossibleShares");
async function resharePending(env) {
  const row = await env.DB.prepare("SELECT v FROM app_state WHERE k='reshare'").first().catch(() => null);
  let ids = [];
  try {
    ids = JSON.parse(row && row.v || "[]");
  } catch (e) {
  }
  if (!ids.length) return;
  const now = ids.slice(0, 8), rest = ids.slice(8);
  for (const sid of now) {
    const s = await env.DB.prepare("SELECT uploader FROM sessions WHERE id=?1").bind(sid).first();
    if (s && String(s.uploader).startsWith("acct:")) await reshareSession(env, String(s.uploader).slice(5), sid).catch(() => {
    });
  }
  await env.DB.prepare(rest.length ? "UPDATE app_state SET v=?1 WHERE k='reshare'" : "DELETE FROM app_state WHERE k='reshare'").bind(...rest.length ? [JSON.stringify(rest)] : []).run();
}
__name(resharePending, "resharePending");
async function fixLapTimes(env) {
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.session_id AS sid, a.time, a.trace, s.game, s.track_id AS tid, s.car_id AS cid FROM laps a
     JOIN laps b ON b.session_id=a.session_id AND b.n=a.n-1 AND b.time=a.time JOIN sessions s ON s.id=a.session_id
     WHERE a.tfix IS NULL AND a.trace IS NOT NULL LIMIT 15`
  ).all().catch(() => ({ results: [] }));
  for (const l of results || []) {
    let est = null;
    try {
      est = traceLapTime(JSON.parse(await openData(env, l.trace)));
    } catch (e) {
    }
    const fix3 = est != null && Math.abs(est - l.time) > 0.3 && est > 10 && est < 3600;
    await env.DB.batch([
      env.DB.prepare(fix3 ? "UPDATE laps SET time=?2, tfix=1 WHERE id=?1" : "UPDATE laps SET tfix=1 WHERE id=?1").bind(...fix3 ? [l.id, Math.round(est * 1e3) / 1e3] : [l.id]),
      env.DB.prepare(SESSION_SUMS).bind(l.sid)
    ]);
    if (fix3 && l.tid && l.cid) await markModel(env, l.game || "iracing", l.tid, l.cid).catch(() => {
    });
  }
}
__name(fixLapTimes, "fixLapTimes");
var HARDEN = { "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "permissions-policy": "camera=(), microphone=(), geolocation=()", "strict-transport-security": "max-age=31536000; includeSubDomains", "cross-origin-opener-policy": "same-origin" };
function harden(r4) {
  if (r4.status === 101 || r4.webSocket) return r4;
  const h = new Headers(r4.headers);
  for (const k in HARDEN) if (!h.has(k)) h.set(k, HARDEN[k]);
  if (h.get("x-frame-options") === "DENY" && (h.get("content-security-policy") || "").includes("frame-ancestors *")) h.delete("x-frame-options");
  return new Response(r4.body, { status: r4.status, statusText: r4.statusText, headers: h });
}
__name(harden, "harden");
var worker_default = {
  // every 10 minutes: the models of the cars and tracks that got new laps
  async scheduled(ev, env, ctx) {
    const at2 = new Date(ev.scheduledTime || Date.now()), hourly = at2.getUTCMinutes() < 10, daily = hourly && at2.getUTCHours() === 3;
    const raw = env.DB;
    env = { ...env, DB: countingDB(raw, daily ? "cron daily" : hourly ? "cron hourly" : "cron 10 min") };
    if (hourly) ctx.waitUntil(pruneReports({ DB: raw }).catch(() => {
    }));
    if (hourly) ctx.waitUntil(pruneAlerts({ DB: raw }).catch(() => {
    }));
    if (daily) ctx.waitUntil(prunePushTokens({ DB: raw }).catch(() => {
    }));
    if (hourly && at2.getUTCDay() === 1 && at2.getUTCHours() >= 7) ctx.waitUntil(weeklyAlerts2(env, at2.getTime()).catch(() => {
    }));
    if (hourly && at2.getUTCDay() === 1 && at2.getUTCHours() >= 9) ctx.waitUntil(discordWeekly(env, at2.getTime()).catch(() => {
    }));
    const all = [];
    const wait = ctx.waitUntil.bind(ctx);
    ctx = { ...ctx, waitUntil: /* @__PURE__ */ __name((pr) => {
      all.push(pr);
      wait(pr);
    }, "waitUntil") };
    ctx.waitUntil(rebuildDirty(env, { daily }));
    ctx.waitUntil(indexNow(env).catch(() => {
    }));
    ctx.waitUntil(shadowRun(env).then(() => answerRun(env)).catch(() => {
    }));
    if (hourly) {
      ctx.waitUntil(fillCats(env).catch(() => {
      }));
      ctx.waitUntil(fillSectors(env).catch(() => {
      }));
      ctx.waitUntil(pruneUsage(env).catch(() => {
      }));
      ctx.waitUntil(pruneSeen(env).catch(() => {
      }));
    }
    if (daily) {
      ctx.waitUntil(buildOvalKinds(env).catch(() => {
      }));
      ctx.waitUntil(fixLapTimes(env).catch(() => {
      }));
      ctx.waitUntil(repairImpossibleShares(env).catch(() => {
      }));
      ctx.waitUntil(env.DB.prepare(ALL_SESSION_SUMS).run().catch(() => {
      }));
    }
    ctx.waitUntil(resharePending(env).catch(() => {
    }));
    ctx.waitUntil(rebuildTrackMaps(env).catch(() => {
    }));
    ctx.waitUntil(rebuildEdges(env).catch(() => {
    }));
    ctx.waitUntil(scanLeagues(env).catch(() => {
    }));
    ctx.waitUntil(prunePresence(env).catch(() => {
    }));
    wait(Promise.allSettled(all).then(() => flushUsage(raw, true)));
  },
  async fetch(req, env, ctx) {
    if (!env.DB) return harden(await handle(req, env, ctx).catch(gatedAnswer));
    const raw = env.DB, url = new URL(req.url);
    try {
      return harden(await handle(req, { ...env, DB: countingDB(raw, routeKey(req.method, url.pathname)) }, ctx).catch(gatedAnswer));
    } finally {
      ctx.waitUntil(flushUsage(raw));
    }
  }
};
function gatedAnswer(e) {
  if (e && e.gated) return new Response(JSON.stringify({ error: e.message, code: "verify_first" }), { status: 403, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
  throw e;
}
__name(gatedAnswer, "gatedAnswer");
async function handle(req, env, ctx) {
  const url = new URL(req.url);
  if (url.protocol === "http:" && env.LOCAL !== "1" && !/^(localhost|127\.|\[::1\])/.test(url.hostname) && (req.method === "GET" || req.method === "HEAD")) {
    url.protocol = "https:";
    if (url.hostname.startsWith("www.")) url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === "/news") return news(req, env, ctx);
  {
    const sp = await seoPage(req, env, url, ctx).catch(() => null);
    if (sp) return sp;
  }
  {
    const lp = legal(req, url);
    if (lp) return lp;
  }
  if (url.pathname.startsWith("/dl/") || url.pathname.startsWith("/downloads") || url.pathname.startsWith("/changelog")) return downloads(req, env, url);
  if (url.pathname === "/community/admin/online" && req.method === "GET") return onlineRoute(req, env).catch((e) => new Response(JSON.stringify({ error: "server error: " + (e && e.message) }), { status: 500, headers: { "content-type": "application/json" } }));
  if (url.pathname.startsWith("/community/usage") || url.pathname.startsWith("/community/feedback") || url.pathname === "/community/visit" || url.pathname === "/community/admin/analytics" || url.pathname === "/community/admin/feedback") {
    const r4 = await usageRoute(req, env, url).catch((e) => new Response(JSON.stringify({ error: "server error: " + (e && e.message) }), { status: 500, headers: { "content-type": "application/json" } }));
    if (r4) return r4;
  }
  if (url.pathname === "/community/alerts" || url.pathname === "/community/alerts/on") {
    const r4 = await alertsRoute(req, env, url).catch((e) => new Response(JSON.stringify({ error: "server error: " + (e && e.message) }), { status: 500, headers: { "content-type": "application/json" } }));
    if (r4) return r4;
  }
  if (url.pathname === "/community/crash" || url.pathname === "/community/support/logs" || url.pathname.startsWith("/community/admin/crashes") || url.pathname.startsWith("/community/admin/support/logs/") || url.pathname === "/community/admin/d1") {
    const r4 = await reportsRoute(req, env, url).catch((e) => new Response(JSON.stringify({ error: "server error: " + (e && e.message) }), { status: 500, headers: { "content-type": "application/json" } }));
    if (r4) return r4;
  }
  if (url.pathname.startsWith("/community/support") || url.pathname.startsWith("/community/admin/support")) {
    const r4 = await supportRoute(req, env, url).catch((e) => new Response(JSON.stringify({ error: "server error: " + (e && e.message) }), { status: 500, headers: { "content-type": "application/json" } }));
    if (r4) return r4;
  }
  if (url.pathname.startsWith("/community/")) {
    try {
      return await community(req, env, url, ctx);
    } catch (e) {
      return new Response(JSON.stringify({ error: "server error: " + (e && e.message) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }
  if (url.pathname.startsWith("/account/")) {
    try {
      {
        const res = await accounts(req, env, url);
        if (res && url.pathname === "/account/sync/meta") {
          try {
            const b = await latestBuild(env);
            if (b) res.headers.set("X-Pitlane-Build", b);
          } catch (e) {
          }
        }
        return res;
      }
    } catch (e) {
      return err11("server error: " + (e && e.message), 500);
    }
  }
  if (url.pathname === "/app" || url.pathname.startsWith("/app/")) {
    const to = new URL(req.url);
    to.pathname = url.pathname.slice(4) || "/";
    to.searchParams.delete("companion");
    return Response.redirect(to.href, 301);
  }
  if (url.pathname === "/index.html") {
    const to = new URL(req.url);
    to.pathname = "/";
    return Response.redirect(to.href, 301);
  }
  const isAppFile = /^\/(fonts\.css|pitwall-[a-z0-9-]+\.js|app-news\.json|whats-new\.json|server\.json|manifest\.webmanifest|favicon\.ico|favicon-32\.png|icon-\d+\.png|logo\.svg|bimi\.svg|og(?:-es|-pt)?\.png|robots\.txt|landing\/(?:en\/|es\/|pt\/)?[a-z0-9-]+\.(?:jpg|png)|landing\/live-lap\.json)$/.test(url.pathname);
  if (url.pathname === "/" && url.searchParams.get("embed") !== "1" || isAppFile) {
    if (!env.ASSETS) return err11("the app is not published on this server", 404);
    if (url.pathname === "/server.json" && env.LOCAL === "1") return new Response(JSON.stringify({ url: url.origin }), { headers: { "content-type": "application/json", "cache-control": "no-cache" } });
    const r4 = await env.ASSETS.fetch(new Request(new URL(url.pathname, url.origin), req));
    const h = new Headers(r4.headers);
    h.set("referrer-policy", "no-referrer");
    h.set("x-frame-options", "DENY");
    h.set("x-content-type-options", "nosniff");
    h.set("cache-control", /^\/(landing\/|og)/.test(url.pathname) ? "public, max-age=86400, stale-while-revalidate=604800" : "no-cache");
    return new Response(r4.body, { status: r4.status, headers: h });
  }
  if (url.pathname === "/live") return live(req, env);
  if (url.pathname === "/discord/interactions") {
    try {
      return await discordInteraction(req, env, ctx);
    } catch (e) {
      return err11("server error", 500);
    }
  }
  if (url.pathname === "/discord/oauth" && req.method === "GET") return discordOAuth(req, env, url).catch(() => Response.redirect("https://pitlanehq.app/?discordLogin=0", 302));
  if (url.pathname === "/steam/return" && req.method === "GET") return steamReturn(req, env, url).catch(() => Response.redirect("https://pitlanehq.app/?steamLogin=0", 302));
  if (url.pathname === "/google/oauth" && req.method === "GET") return googleOAuth(req, env, url).catch(() => Response.redirect("https://pitlanehq.app/?googleLogin=0", 302));
  if (url.pathname === "/patreon/webhook" && req.method === "POST") return patreonWebhook(req, env);
  if (url.pathname === "/lemonsqueezy/webhook" && req.method === "POST") return lemonWebhook(req, env);
  if (url.pathname === "/stripe/webhook" && req.method === "POST") return stripeWebhook(req, env, emailHash, { supportLink: license_plans_default.donate && license_plans_default.donate.link || "" });
  if (url.pathname === "/voice/ice" && req.method === "GET") return voiceIce(env);
  if (url.pathname === "/admin" && req.method === "GET") return Response.redirect(url.origin + "/app#admin", 302);
  if (url.pathname.startsWith("/api/")) {
    try {
      return await api(req, env, url, ctx);
    } catch (e) {
      return err11("server error: " + (e && e.message), 500);
    }
  }
  if (url.pathname !== "/" && url.pathname.replace(/\/+$/, "") !== "/laps") {
    const al = /^\/(es|pt)(\/|$)/.exec(url.pathname)?.[1] || (req.headers.get("accept-language") || "").toLowerCase().slice(0, 2);
    return notFound(al === "es" || al === "pt" ? al : "en");
  }
  return new Response(VIEWER, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // shown inside the Pitlane HQ apps with embed=1 (then it only uses the session handed in the address)
      "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-ancestors " + (url.searchParams.get("embed") === "1" ? "*" : "'none'"),
      "referrer-policy": "no-referrer",
      // the viewer is part of the app, never a page of its own in search results
      "x-robots-tag": "noindex"
    }
  });
}
__name(handle, "handle");
export {
  LiveRoom,
  worker_default as default,
  traceLapTime
};
//# sourceMappingURL=worker.js.map
