/* Pitlane HQ: the lap comparison's track map in full screen (Analysis → Laps and the Coach, on the PC app and the web).
   The road at its real width (the edges the drivers' laps give, else 13 m), both laps' racing lines on it, their braking
   points and slowest points, the turns with their names, the sectors and where lap A gains or loses time against lap B.
   Zoom with the wheel, the buttons or two fingers; drag to move; the telemetry under the map and the map follow one
   cursor, and the replay drives both laps on the same clock. The same file runs in the app and in previews: everything
   it needs comes in `open(o)` (see the end of the file). */
(function () {
  "use strict";
  const BIN = 5;
  const mod = (i, n) => ((i % n) + n) % n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- the road ---------- */
  // the layout's points (x east, y north, metres; point 0 on the start/finish line), its direction and left normal at every
  // point, and how far each edge is to the left (+) and to the right (−) of it
  function roadOf(map) {
    const X = map.x, Y = map.y, N0 = X.length;
    const e = map.edges && Array.isArray(map.edges.l) && map.edges.l.length === N0 && Array.isArray(map.edges.r) && map.edges.r.length === N0 ? map.edges : null;
    // A game that gives its position less often than the lap is recorded leaves the layout with points on top of each
    // other and gaps of 15 m: the road is drawn again through the points that really moved, as a smooth curve with a
    // point every 3 m of road, so a distance along the lap is the same share of the road everywhere.
    const px = [], py = [], el = [], er = [], num = (v) => (v != null && isFinite(v) ? +v : null);
    for (let i = 0; i < N0; i++) { const k = px.length; if (k && Math.hypot(X[i] - px[k - 1], Y[i] - py[k - 1]) < 1.5) continue; px.push(+X[i]); py.push(+Y[i]); el.push(e ? num(e.l[i]) : null); er.push(e ? num(e.r[i]) : null); }
    while (px.length > 8 && Math.hypot(px[px.length - 1] - px[0], py[py.length - 1] - py[0]) < 1.5) { px.pop(); py.pop(); el.pop(); er.pop(); }
    const n = px.length, t = new Float64Array(n + 1); for (let i = 0; i < n; i++) { const j = (i + 1) % n; t[i + 1] = t[i] + Math.hypot(px[j] - px[i], py[j] - py[i]); }
    const T = t[n], N = clamp(Math.round(T / 3), 120, 8000), x = new Float64Array(N), y = new Float64Array(N), l0 = new Array(N), r0 = new Array(N), ch = (i) => t[mod(i, n) + 1] - t[mod(i, n)];
    const mix = (a, b, u) => (a == null ? b : b == null ? a : a + (b - a) * u);
    for (let k = 0, i = 0; k < N; k++) {
      const sK = k * T / N; while (i < n - 1 && t[i + 1] <= sK) i++;
      const h = ch(i) || 1, u = clamp((sK - t[i]) / h, 0, 1), i0 = mod(i - 1, n), i2 = mod(i + 1, n), i3 = mod(i + 2, n), ha = ch(i - 1) + h || 1, hb = h + ch(i + 1) || 1;
      const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      x[k] = h00 * px[i] + h10 * h * (px[i2] - px[i0]) / ha + h01 * px[i2] + h11 * h * (px[i3] - px[i]) / hb;
      y[k] = h00 * py[i] + h10 * h * (py[i2] - py[i0]) / ha + h01 * py[i2] + h11 * h * (py[i3] - py[i]) / hb;
      l0[k] = mix(el[i], el[i2], u); r0[k] = mix(er[i], er[i2], u);
    }
    // where the layout was put together from two laps the road steps a few metres to the side: rounded off over
    // about 15 m each way (a hairpin moves by less than a metre)
    for (let pass = 0; pass < 8; pass++) { const ax = Float64Array.from(x), ay = Float64Array.from(y); for (let i = 0; i < N; i++) { const a = mod(i - 1, N), b = mod(i + 1, N); x[i] = (ax[a] + 2 * ax[i] + ax[b]) / 4; y[i] = (ay[a] + 2 * ay[i] + ay[b]) / 4; } }
    const tx = new Float64Array(N), ty = new Float64Array(N);
    for (let i = 0; i < N; i++) { const a = mod(i - 3, N), b = mod(i + 3, N); let dx = x[b] - x[a], dy = y[b] - y[a]; const m = Math.hypot(dx, dy) || 1; tx[i] = dx / m; ty[i] = dy / m; }
    const sm = (a, w) => a.map((_, i) => { let s = 0, c = 0; for (let k = -w; k <= w; k++) { const v = a[mod(i + k, N)]; if (v != null && isFinite(v)) { s += v; c++; } } return c ? s / c : null; });
    // the drivers' outermost positions are the car's centre: the road goes a car's half width further
    const l = e ? sm(l0, 7).map((v) => clamp(v == null ? 6.5 : v + 1.3, 4.5, 16)) : new Array(N).fill(6.5);
    const r = e ? sm(r0, 7).map((v) => clamp(v == null ? -6.5 : v - 1.3, -16, -4.5)) : new Array(N).fill(-6.5);
    return { x, y, N, tx, ty, l, r, g: map.g || null, measured: !!e, q: 5 / (T / N) }; // q: points of the road in 5 m
  }
  // a point of the road at a fractional index, and its left normal
  function roadAt(R, s) {
    const N = R.N, i = Math.floor(s), f = s - i, a = mod(i, N), b = mod(i + 1, N);
    const x = R.x[a] + (R.x[b] - R.x[a]) * f, y = R.y[a] + (R.y[b] - R.y[a]) * f;
    let tx = R.tx[a] + (R.tx[b] - R.tx[a]) * f, ty = R.ty[a] + (R.ty[b] - R.ty[a]) * f; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    return { x, y, nx: -ty, ny: tx, l: R.l[a] + (R.l[b] - R.l[a]) * f, r: R.r[a] + (R.r[b] - R.r[a]) * f };
  }

  /* ---------- a lap's racing line on the road ---------- */
  // the similarity (turn, scale within ±10 %, move) that puts points P on points Q best
  function simil(P, Q) {
    let pmx = 0, pmy = 0, qmx = 0, qmy = 0; const n = P.length; if (n < 10) return null;
    for (let i = 0; i < n; i++) { pmx += P[i][0]; pmy += P[i][1]; qmx += Q[i][0]; qmy += Q[i][1]; }
    pmx /= n; pmy /= n; qmx /= n; qmy /= n; let sxx = 0, sxy = 0, pp = 0;
    for (let i = 0; i < n; i++) { const px = P[i][0] - pmx, py = P[i][1] - pmy, qx = Q[i][0] - qmx, qy = Q[i][1] - qmy; sxx += px * qx + py * qy; sxy += px * qy - py * qx; pp += px * px + py * py; }
    let a = sxx / (pp || 1), b = sxy / (pp || 1); const k = Math.hypot(a, b) || 1, kk = clamp(k, 0.9, 1.1); a *= kk / k; b *= kk / k;
    return { a, b, tx: qmx - (a * pmx - b * pmy), ty: qmy - (b * pmx + a * pmy) };
  }
  const apply = (t, x, y) => [t.a * x - t.b * y + t.tx, t.b * x + t.a * y + t.ty];
  const compose = (t2, t) => ({ a: t2.a * t.a - t2.b * t.b, b: t2.b * t.a + t2.a * t.b, tx: t2.a * t.tx - t2.b * t.ty + t2.tx, ty: t2.b * t.tx + t2.a * t.ty + t2.ty });
  function nearest(R, x, y, j0, win) { let bj = j0, bd = 1e18; for (let k = -win; k <= win; k++) { const j = mod(j0 + k, R.N), dx = R.x[j] - x, dy = R.y[j] - y, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; bj = j; } } return [bj, bd]; }
  /* where the lap's car was on the road every 5 m: its path put in the road's frame (from the game's position, exact; a
     path by dead reckoning is fitted onto the road), then at each point how far to the side of the road's line it was.
     Null when the lap has no path or it does not fit this road. */
  function lineOf(xy, R) {
    if (!xy || !Array.isArray(xy.x) || xy.x.length < 60 || xy.y.length !== xy.x.length) return null;
    let px = xy.x, py = xy.y; const NB = px.length, N = R.N; let geo = false;
    if (R.g && xy.g) { geo = true; if (R.g[0] !== xy.g[0] || R.g[1] !== xy.g[1]) { const dx = (xy.g[1] - R.g[1]) * 111320 * Math.cos(R.g[0] * Math.PI / 180), dy = (xy.g[0] - R.g[0]) * 110540; px = px.map((v) => v + dx); py = py.map((v) => v + dy); } }
    const jOf = (i) => Math.round(i / NB * N) % N, st = Math.max(1, Math.round(NB / 400)); const near0 = nearest; { } const nearestQ = (R_, x_, y_, j0, win) => near0(R_, x_, y_, j0, Math.round(win * R.q));
    let t = { a: 1, b: 0, tx: 0, ty: 0 };
    const med = () => { const ds = []; for (let i = 0; i < NB; i += st) { const q = apply(t, px[i], py[i]); ds.push(nearestQ(R, q[0], q[1], jOf(i), 40)[1]); } ds.sort((a, b) => a - b); return Math.sqrt(ds[ds.length >> 1]); };
    if (!geo || med() > 10) {
      // first by the share of the lap (both start on the line), then a few times by the nearest point of the road
      const P = [], Q = []; for (let i = 0; i < NB; i += st) { P.push([px[i], py[i]]); const j = jOf(i); Q.push([R.x[j], R.y[j]]); }
      const t0 = simil(P, Q); if (!t0) return null; t = t0;
      for (let it = 0; it < 5; it++) {
        const P2 = [], Q2 = [], ds = [];
        for (let i = 0; i < NB; i += st) { const q = apply(t, px[i], py[i]), [j, d2] = nearestQ(R, q[0], q[1], jOf(i), 60); ds.push(d2); P2.push(q); Q2.push([R.x[j], R.y[j]]); }
        const lim = Math.max(15 * 15, [...ds].sort((a, b) => a - b)[ds.length >> 1] * 9), P3 = [], Q3 = [];
        P2.forEach((p, k) => { if (ds[k] <= lim) { P3.push(p); Q3.push(Q2[k]); } });
        const t2 = simil(P3, Q3); if (!t2) break; t = compose(t2, t);
      }
      geo = false;
    }
    if (med() > 9) return null;
    // the side of the road at every point of the lap
    const s = new Float64Array(NB), lat = new Float64Array(NB); let last = -1;
    for (let i = 0; i < NB; i++) {
      const q = apply(t, px[i], py[i]), j0 = last < 0 ? jOf(i) : mod(last + Math.round(N / NB), N);
      let [j] = nearestQ(R, q[0], q[1], j0, last < 0 ? 60 : 12); if (last >= 0) { const [jj, dd] = nearestQ(R, q[0], q[1], jOf(i), 40); const [, dj] = nearestQ(R, q[0], q[1], j, 0); if (dd < dj - 25) j = jj; }
      // onto the segment before or after the nearest point
      let bs = j, bl = 0, bd = 1e18;
      for (const a of [mod(j - 1, N), j]) { const b = mod(a + 1, N), sx = R.x[b] - R.x[a], sy = R.y[b] - R.y[a], m2 = sx * sx + sy * sy || 1, f = clamp(((q[0] - R.x[a]) * sx + (q[1] - R.y[a]) * sy) / m2, 0, 1), cx = R.x[a] + sx * f, cy = R.y[a] + sy * f, d2 = (q[0] - cx) ** 2 + (q[1] - cy) ** 2; if (d2 < bd) { bd = d2; bs = a + f; const m = Math.sqrt(m2); bl = (-sy * (q[0] - cx) + sx * (q[1] - cy)) / m; } }
      s[i] = bs; lat[i] = bl; last = j;
    }
    // a path by dead reckoning drifts slowly: its average over ±400 m is the road's line
    let L2 = Array.from(lat);
    if (!geo) { const W = 80, pre = [0]; L2.forEach((v, i) => pre.push(pre[i] + v)); L2 = L2.map((v, i) => { const lo = Math.max(0, i - W), hi = Math.min(NB - 1, i + W); return v - (pre[hi + 1] - pre[lo]) / (hi - lo + 1); }); }
    // The line is the side of the road as a function of where on the road the car was, read again at even steps: a
    // path whose points are bunched or far apart (a game's slow position) gives the same line, evenly spaced, and
    // the side is averaged over about 12 m of road so the line has no kinks (well under a car's width of change).
    const su = new Float64Array(NB); for (let i = 0; i < NB; i++) su[i] = s[i] + N * Math.round((i / NB * N - s[i]) / N);
    const out = { x: new Float64Array(NB), y: new Float64Array(NB), N: NB }, rad = 12 / 5 * R.q, vv = new Float64Array(NB);
    for (let k = 0; k < NB; k++) { const Tk = k / NB * N; let w = 0, v = 0, bd = 1e18, bv = 0;
      for (let j = Math.max(0, k - 14); j <= Math.min(NB - 1, k + 14); j++) { const d = Math.abs(su[j] - Tk); if (d < bd) { bd = d; bv = L2[j]; } if (d < rad) { const g = 1 - d / rad; w += g; v += g * L2[j]; } }
      vv[k] = w > 0 ? v / w : bv; }
    for (let pass = 0; pass < 4; pass++) { const c = Float64Array.from(vv); for (let k = 0; k < NB; k++) vv[k] = (c[Math.max(0, k - 1)] + 2 * c[k] + c[Math.min(NB - 1, k + 1)]) / 4; }
    for (let k = 0; k < NB; k++) { const p = roadAt(R, k / NB * N), v = clamp(vv[k], p.r - 2, p.l + 2); out.x[k] = p.x + p.nx * v; out.y[k] = p.y + p.ny * v; }
    return out;
  }

  /* ---------- the styles (the app's colours: --accent is lap A, --blue lap B, --pb lap B when it is your best) ---------- */
  const CSS = `
.fm{position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;background:var(--bg,#0b0e14);color:var(--fg,#e6e9ef);font:14px var(--f-body,system-ui,sans-serif)}
.fm *{box-sizing:border-box}
.fm-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px 14px;border-bottom:1px solid var(--line,#1c222d);background:var(--surface,#10141c)}
.fm .fm-h h2{margin:0 6px 0 0;font:700 18px var(--f-display,"Barlow Condensed",system-ui);letter-spacing:.04em;text-transform:uppercase}
.fm-lg{display:inline-flex;align-items:center;gap:6px;font-size:13px;max-width:28ch;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.fm-lg{max-width:46ch}.fm-nl{font-style:normal;font-size:11px;color:var(--muted,#8b97a8);border:1px solid var(--line,#263140);border-radius:999px;padding:1px 7px}
.fm-lg i{width:18px;height:3px;border-radius:2px;flex:none}.fm-lg.a i{background:var(--accent,#f5b43c)}.fm-lg.b i{background:var(--fm-b)}
.fm-ch{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.fm-c{appearance:none;border:1px solid var(--line2,#2a3140);background:transparent;color:var(--muted,#8a93a3);border-radius:999px;padding:5px 11px;font:600 12px var(--f-body,system-ui);cursor:pointer;white-space:nowrap}
.fm-c[aria-pressed="true"]{background:var(--surface2,#151a24);color:var(--fg,#e6e9ef);border-color:var(--accent,#f5b43c)}
.fm-c:disabled{opacity:.45;cursor:default}
.fm-x{appearance:none;border:1px solid var(--line2,#2a3140);background:transparent;color:var(--fg,#e6e9ef);width:34px;height:34px;border-radius:8px;font-size:20px;line-height:1;cursor:pointer}
.fm-m{position:relative;flex:1;min-height:200px;overflow:hidden;touch-action:none;cursor:grab;background:radial-gradient(ellipse at 50% 40%,color-mix(in srgb,var(--surface,#10141c) 70%,transparent),transparent 70%)}
.fm-m.drag{cursor:grabbing}
.fm-cc{position:absolute;inset:0;width:100%;height:100%;display:none}.fm-m.chase .fm-cc{display:block}.fm-m.chase svg,.fm-m.chase .fm-sc{visibility:hidden}.fm-m.chase{cursor:default}
.fm-z button.wide{width:auto;padding:0 10px;font-size:13px}
.fm-m svg{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;-webkit-user-select:none}
.fm .grass{fill:none;stroke:color-mix(in srgb,var(--good,#3ddc84) 7%,transparent);stroke-linejoin:round}
.fm .road{fill:color-mix(in srgb,var(--surface2,#151a24) 55%,#2a3140 45%);fill-rule:evenodd;stroke:color-mix(in srgb,var(--fg,#e6e9ef) 55%,transparent);stroke-linejoin:round}
.fm .casing{fill:none;stroke:color-mix(in srgb,var(--surface2,#151a24) 55%,#2a3140 45%);stroke-linejoin:round;stroke-linecap:round}
.fm .dseg{fill:none;stroke-linecap:butt;stroke-linejoin:round}
.fm .ln{fill:none;stroke-linejoin:round;stroke-linecap:round}.fm .ln.a{stroke:var(--accent,#f5b43c)}.fm .ln.b{stroke:var(--fm-b)}
.fm .sf{stroke:#fff;stroke-dasharray:1.2 1.2}.fm .secb{stroke:var(--muted,#8a93a3)}
.fm .sec{fill:var(--muted,#8a93a3);font-family:var(--f-data,monospace);font-weight:700;text-anchor:middle;dominant-baseline:middle}
.fm .tn{cursor:pointer;outline:none}.fm .tn:focus-visible rect{stroke:var(--accent,#f5b43c)}.fm .tn rect{fill:var(--surface,#10141c);stroke:var(--line2,#2a3140)}.fm .tn text{fill:var(--fg,#e6e9ef);font-family:var(--f-data,monospace);font-weight:700;text-anchor:middle;dominant-baseline:central}
.fm .tn .nm{fill:var(--muted,#8a93a3);font-family:var(--f-body,system-ui);font-weight:500}
.fm .tn:hover rect,.fm .tn.on rect{stroke:var(--accent,#f5b43c)}
.fm .bk circle{stroke:var(--bg,#0b0e14);stroke-width:1.5}.fm .bk.a circle{fill:var(--accent,#f5b43c)}.fm .bk.b circle{fill:var(--fm-b)}
.fm .bk text,.fm .mn text{font-family:var(--f-data,monospace);font-weight:700;paint-order:stroke;stroke:var(--bg,#0b0e14);stroke-width:3px;dominant-baseline:central}.fm .bk.a text,.fm .mn.a text{fill:var(--accent,#f5b43c)}.fm .bk.b text,.fm .mn.b text{fill:var(--fm-b)}
.fm .mn path{stroke:var(--bg,#0b0e14);stroke-width:1.2}.fm .mn.a path{fill:var(--accent,#f5b43c)}.fm .mn.b path{fill:var(--fm-b)}
.fm .cur .ca{fill:var(--accent,#f5b43c);stroke:var(--bg,#0b0e14);stroke-width:2}.fm .cur .halo{fill:color-mix(in srgb,var(--accent,#f5b43c) 22%,transparent)}.fm .cur .cb{fill:none;stroke:var(--fm-b);stroke-width:3}
.fm-rd{position:absolute;left:12px;top:12px;min-width:210px;max-width:calc(100% - 24px);padding:10px 12px;border:1px solid var(--line2,#2a3140);border-radius:10px;background:color-mix(in srgb,var(--surface,#10141c) 92%,transparent);font:12px var(--f-data,monospace);pointer-events:none;display:grid;gap:4px}
.fm-rd b{font-size:13px;color:var(--fg,#e6e9ef)}.fm-rd .r{display:flex;gap:12px;flex-wrap:wrap}.fm-rd .a{color:var(--accent,#f5b43c)}.fm-rd .b{color:var(--fm-b)}.fm-rd .good{color:var(--good,#3ddc84)}.fm-rd .bad{color:var(--bad,#ff5c5c)}.fm-rd .mu{color:var(--muted,#8a93a3)}
.fm-z{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:6px}
.fm-z button{appearance:none;width:38px;height:38px;border-radius:9px;border:1px solid var(--line2,#2a3140);background:var(--surface,#10141c);color:var(--fg,#e6e9ef);font:600 18px var(--f-body,system-ui);cursor:pointer}
.fm-z button[aria-pressed="true"]{border-color:var(--accent,#f5b43c);color:var(--accent,#f5b43c)}
.fm-sc{position:absolute;left:12px;bottom:12px;font:11px var(--f-data,monospace);color:var(--muted,#8a93a3);pointer-events:none}
.fm-sc i{display:block;height:6px;border:1.5px solid var(--muted,#8a93a3);border-top:0;margin-bottom:3px}
.fm-t{border-top:1px solid var(--line,#1c222d);background:var(--surface,#10141c);padding:8px 14px 10px}
.fm-rp{display:flex;align-items:center;gap:10px;margin-bottom:6px;font:12px var(--f-data,monospace)}
.fm-rp .go{appearance:none;width:34px;height:30px;border-radius:8px;border:1px solid var(--accent,#f5b43c);background:var(--accent,#f5b43c);color:var(--accent-ink,#161003);font-size:13px;cursor:pointer}
.fm-rp input{flex:1;min-width:80px;accent-color:var(--accent,#f5b43c)}
.fm-rp .sp{display:flex;gap:4px}.fm-rp .sp button{appearance:none;border:1px solid var(--line2,#2a3140);background:transparent;color:var(--muted,#8a93a3);border-radius:6px;padding:3px 7px;font:600 11px var(--f-data,monospace);cursor:pointer}.fm-rp .sp button[aria-pressed="true"]{color:var(--fg,#e6e9ef);border-color:var(--accent,#f5b43c)}
.fm-rp .tm{min-width:15ch;text-align:right}.fm-rp .good{color:var(--good,#3ddc84)}.fm-rp .bad{color:var(--bad,#ff5c5c)}
.fm-tc{position:relative;overflow:hidden}.fm-tc i{position:absolute;left:0;top:0;pointer-events:none;will-change:transform}.fm-tc .cl{width:0;height:100%;border-left:1px dashed var(--fg,#e6e9ef);opacity:.7}.fm-tc .da,.fm-tc .db{width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;box-sizing:border-box}.fm-tc .da{background:var(--accent,#f5b43c)}.fm-tc .db{border:2px solid var(--fm-b,#4f9cff)}.fm-t canvas{display:block;width:100%;height:190px;touch-action:none;cursor:crosshair}
.fm:focus{outline:none}.fm-rp button,.fm-rp .tm{white-space:nowrap}
@media (max-width:700px){.fm-h{padding:8px 10px;padding-top:max(8px,env(safe-area-inset-top,0px))}.fm .fm-h h2{font-size:16px}.fm-x{margin-left:auto;width:32px;height:32px}.fm-ch{order:9;margin-left:0;width:100%;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}.fm-lg{max-width:40vw;font-size:12px}
  .fm-t{padding:6px 10px max(8px,env(safe-area-inset-bottom,0px))}.fm-t canvas{height:140px}.fm-rp{flex-wrap:wrap;gap:6px 8px}.fm-rp input{order:9;flex-basis:100%}.fm-rp .tm{margin-left:auto}
  .fm-rd{left:8px;top:8px;min-width:0;font-size:10.5px;padding:6px 8px;gap:2px}.fm-rd .pd{display:none}.fm-z{right:8px;bottom:8px}.fm-z button{width:34px;height:34px}}
`;
  function styleOnce() { if (document.getElementById("fmCss")) return; const s = document.createElement("style"); s.id = "fmCss"; s.textContent = CSS; document.head.appendChild(s); }
  const css = (el, v, d) => (getComputedStyle(el).getPropertyValue(v) || "").trim() || d;
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ---------- the view ---------- */
  function open(o) {
    styleOnce();
    const T = o.T || ((en) => en), spd = o.spd || ((v) => v * 3.6), spdU = o.spdU || (() => "km/h"), fmtT = o.fmtT || ((s) => s.toFixed(3));
    const sgn = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(d == null ? 2 : d);
    const R = roadOf(o.map), A = o.A, B = o.B, sa = A.ser, sb = B.ser, n = o.n, L = n * BIN;
    const lineA = lineOf(A.xy, R), lineB = lineOf(B.xy, R);
    let ST = { lines: true, brk: true, mins: true, turns: true, delta: true, follow: false };
    try { ST = Object.assign(ST, JSON.parse(localStorage.getItem("pw.fmap") || "{}")); } catch (e) { }
    const save = () => { try { localStorage.setItem("pw.fmap", JSON.stringify(ST)); } catch (e) { } };

    const root = document.createElement("div"); root.className = "fm"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    root.style.setProperty("--fm-b", `var(${o.bColor || "--blue"})`);
    // a lap with no path of its own (one taken from the standings, or recorded before paths were kept) has no line to draw: its name says so
    const noLn = ` <em class="fm-nl">${esc(T("no racing line recorded", "sin trazada grabada", "sem traçado gravado"))}</em>`;
    const chip = (k, label, dis) => `<button type="button" class="fm-c" data-k="${k}" aria-pressed="${!!ST[k] && !dis}"${dis ? " disabled" : ""}>${esc(label)}</button>`;
    root.innerHTML = `<div class="fm-h"><h2>${esc(T("Track map", "Mapa del circuito", "Mapa da pista"))}</h2>
      <span class="fm-lg a"><i></i>A · ${esc(A.name)}${lineA ? "" : noLn}</span><span class="fm-lg b"><i></i>B · ${esc(B.name)}${lineB ? "" : noLn}</span>
      <div class="fm-ch">${chip("lines", T("Racing lines", "Trazadas", "Traçados"), !lineA && !lineB)}${chip("brk", T("Braking", "Frenadas", "Freadas"))}${chip("mins", T("Slowest points", "Puntos más lentos", "Pontos mais lentos"))}${chip("turns", T("Turns", "Curvas", "Curvas"))}${chip("delta", T("A vs B time", "Tiempo A vs B", "Tempo A vs B"))}</div>
      <button type="button" class="fm-x" aria-label="${esc(T("Close", "Cerrar", "Fechar"))}">×</button></div>
      <div class="fm-m"><canvas class="fm-cc" aria-hidden="true"></canvas><svg aria-label="${esc(T("Track map", "Mapa del circuito", "Mapa da pista"))}" role="img"></svg><div class="fm-rd"></div>
        <div class="fm-sc"><i></i><span></span></div>
        <div class="fm-z"><button type="button" data-z="in" aria-label="${esc(T("Zoom in", "Acercar", "Aproximar"))}">+</button><button type="button" data-z="out" aria-label="${esc(T("Zoom out", "Alejar", "Afastar"))}">−</button><button type="button" data-z="fit" aria-label="${esc(T("Whole track", "Circuito entero", "Pista inteira"))}">⤢</button><button type="button" data-z="chase" class="wide" aria-pressed="false" title="${esc(T("Chase view", "Vista de persecución", "Visão de perseguição"))}">${esc(T("Chase", "Cámara", "Câmera"))}</button><button type="button" data-z="follow" aria-pressed="${!!ST.follow}" aria-label="${esc(T("Follow lap A", "Seguir la vuelta A", "Seguir a volta A"))}" title="${esc(T("Follow lap A", "Seguir la vuelta A", "Seguir a volta A"))}">◎</button></div></div>
      <div class="fm-t"><div class="fm-rp"><button type="button" class="go" aria-label="${esc(T("Replay", "Repetición", "Replay"))}">▶</button><input type="range" min="0" max="1000" value="0" aria-label="${esc(T("Replay", "Repetición", "Replay"))}"><span class="sp">${[1, 2, 4, 8].map((k) => `<button type="button" data-sp="${k}" aria-pressed="${k === 2}">${k}×</button>`).join("")}</span><span class="tm"></span></div><div class="fm-tc"><canvas></canvas><i class="cl"></i><i class="da"></i><i class="db"></i></div></div>`;
    document.body.appendChild(root);
    const prevOv = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    const box = root.querySelector(".fm-m"), svg = box.querySelector("svg"), rd = root.querySelector(".fm-rd"), cv = root.querySelector(".fm-t canvas"), sc = root.querySelector(".fm-sc"), scI = sc.querySelector("i"), scS = sc.querySelector("span");

    // the world: the road's frame turned so the circuit fills the screen (y down for the screen)
    let rot = 0;
    // the same way up as the small map the driver opened it from: north up, turned only when that makes the track at
    // least 15 % bigger in the small map's frame (fitTurn in index.html, the same rule and the same angle)
    const pickRot = () => { const x = o.map.x, y = o.map.y, n = x.length, F = o.frame || [600, 400, 26], W = F[0], H = F[1], pad = F[2];
      const size = (a) => { const c = Math.cos(a), sn = Math.sin(a); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < n; i += Math.max(1, n >> 8)) { const u = x[i] * c - y[i] * sn, v = x[i] * sn + y[i] * c; if (u < x0) x0 = u; if (u > x1) x1 = u; if (v < y0) y0 = v; if (v > y1) y1 = v; } return Math.min((W - 2 * pad) / (x1 - x0 || 1), (H - 2 * pad) / (y1 - y0 || 1)); };
      let best = 0, bk = size(0); const k0 = bk; for (let d = 3; d < 180; d += 3) { const a = d * Math.PI / 180, k = size(a); if (k > bk) { bk = k; best = a; } } return bk > k0 * 1.15 ? best : 0; };
    rot = pickRot();
    const rc = Math.cos(rot), rs = Math.sin(rot);
    const Wp = (x, y) => [x * rc - y * rs, -(x * rs + y * rc)];
    const f1 = (v) => v.toFixed(2);
    // the road's points, its edges and the lines in world coordinates
    const C = [], EL = [], ER = [];
    for (let i = 0; i < R.N; i++) { const p = roadAt(R, i); C.push(Wp(p.x, p.y)); EL.push(Wp(p.x + p.nx * p.l, p.y + p.ny * p.l)); ER.push(Wp(p.x + p.nx * p.r, p.y + p.ny * p.r)); }
    let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9; C.forEach((q) => { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); by0 = Math.min(by0, q[1]); by1 = Math.max(by1, q[1]); });
    const ptsStr = (arr) => arr.map((q) => f1(q[0]) + "," + f1(q[1])).join(" ");
    const lineW = (ln) => { if (!ln) return null; const r = []; for (let i = 0; i < ln.N; i++) r.push(Wp(ln.x[i], ln.y[i])); return r; };
    const LA = lineW(lineA), LB = lineW(lineB);
    // where a lap's car was at d metres: on its line when it has one, else on the road's line
    const atRoad = (d) => { const p = roadAt(R, mod(d / L * R.N, R.N)); return Wp(p.x, p.y); };
    const atLine = (ln, d) => { if (!ln || !ST.lines) return atRoad(d); const m = ln.length - 1, sI = clamp(d / BIN, 0, m), i = Math.min(m - 1, Math.floor(sI)), u = sI - i, p0 = ln[Math.max(0, i - 1)], p1 = ln[i], p2 = ln[i + 1], p3 = ln[Math.min(m, i + 2)], u2 = u * u, u3 = u2 * u;
      const c0 = -.5 * u3 + u2 - .5 * u, c1 = 1.5 * u3 - 2.5 * u2 + 1, c2 = -1.5 * u3 + 2 * u2 + .5 * u, c3 = .5 * u3 - .5 * u2; return [c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0], c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1]]; };
    const outward = (d) => { // the outside of the bend at d, in world coordinates
      const s = d / L * R.N, p = roadAt(R, s), p1 = roadAt(R, s - 6 * R.q), p2 = roadAt(R, s + 6 * R.q), cr = (p.x - p1.x) * (p2.y - p.y) - (p.y - p1.y) * (p2.x - p.x), side = cr > 0 ? -1 : 1, w = side > 0 ? p.l : -p.r;
      const a = Wp(p.x, p.y), b = Wp(p.x + p.nx * side, p.y + p.ny * side); return { a, nx: b[0] - a[0], ny: b[1] - a[1], w };
    };

    // the layers
    const gGrass = el("g", {}, svg), gRoad = el("g", {}, svg), gDelta = el("g", {}, svg), gMarks = el("g", {}, svg), gLines = el("g", {}, svg), gPts = el("g", {}, svg), gTurns = el("g", {}, svg), gCur = el("g", { class: "cur" }, svg);
    const ring = `M${ptsStr(EL).replace(/ /g, "L")}Z M${ptsStr(ER).replace(/ /g, "L")}Z`;
    const grass = el("polyline", { class: "grass", points: ptsStr(C) + " " + f1(C[0][0]) + "," + f1(C[0][1]) }, gGrass);
    const casing = el("polyline", { class: "casing", points: ptsStr(C) + " " + f1(C[0][0]) + "," + f1(C[0][1]) }, gRoad);
    const roadP = el("path", { class: "road", d: ring }, gRoad);
    // start/finish and the sector cuts across the road
    const cut = (d, cls) => { const s = d / L * R.N, p = roadAt(R, s), a = Wp(p.x + p.nx * p.l, p.y + p.ny * p.l), b = Wp(p.x + p.nx * p.r, p.y + p.ny * p.r); return el("line", { class: cls, x1: f1(a[0]), y1: f1(a[1]), x2: f1(b[0]), y2: f1(b[1]) }, gMarks); };
    const sfL = cut(0, "sf"), cnt = Math.max(1, o.sectors || 3), secL = []; for (let j = 1; j < cnt; j++) secL.push(cut(j / cnt * L, "secb"));
    const secT = []; for (let j = 0; j < cnt; j++) { const d = (j + .5) / cnt * L, ow = outward(d); secT.push({ el: el("text", { class: "sec" }, gMarks), ow, inner: true, txt: "S" + (j + 1) }); secT[j].el.textContent = "S" + (j + 1); }
    // where A gains (green) or loses (red) against B, every 25 m
    const tA = (i) => { const r = sa[i]; return r && r[1] != null ? r[1] : null; }, tB = (i) => { const r = sb[i]; return r && r[1] != null ? r[1] : null; };
    const dSegs = [], dRaw = []; let dMx = .004; { const st = 5; let mx = .004; const raw = dRaw; for (let i = 0; i + st < n; i += st) { const a0 = tA(i), a1 = tA(i + st), b0 = tB(i), b1 = tB(i + st); if (a0 == null || a1 == null || b0 == null || b1 == null) continue; const v = (a1 - b1) - (a0 - b0); raw.push([i, v]); mx = Math.max(mx, Math.abs(v)); }
      // drawn as the road's kerbs on both sides, so the lines stay readable on the asphalt
      const edgeAt = (d, side, inset) => { const p = roadAt(R, mod(d / L * R.N, R.N)), w = (side > 0 ? p.l : p.r) - side * inset; return Wp(p.x + p.nx * w, p.y + p.ny * w); };
      dMx = mx; raw.forEach(([i, v]) => { if (Math.abs(v) < mx * .08) return; const col = v > 0 ? "var(--bad,#ff5c5c)" : "var(--good,#3ddc84)", op = (.35 + .65 * Math.min(1, Math.abs(v) / mx)).toFixed(2);
        [1, -1].forEach((side) => { const pts = []; for (let k = i; k <= i + st; k++) pts.push(edgeAt(k * BIN, side, 0)); dSegs.push(el("polyline", { class: "dseg", points: ptsStr(pts), stroke: col, "stroke-opacity": op }, gDelta)); }); }); }
    // the racing lines
    const fine = (ln) => { const r = [], keep = ST.lines; ST.lines = true; for (let d = 0, m = (ln.length - 1) * BIN; d <= m; d += 1.25) r.push(atLine(ln, d)); ST.lines = keep; return r; };
    const lnB = LB ? el("polyline", { class: "ln b", points: ptsStr(fine(LB)) }, gLines) : null, lnA = LA ? el("polyline", { class: "ln a", points: ptsStr(fine(LA)) }, gLines) : null;
    // the braking points and the slowest points of both laps, the same size on screen at any zoom
    const PX = []; // {g, d, lap, kind}
    const brk = (zs, k, ser) => (zs || []).forEach((z) => {
      const g = el("g", { class: "bk " + k }, gPts); el("circle", { r: 5.5 }, g); const t = el("text", k === "a" ? { x: 9, y: 0 } : { x: -9, y: 0, "text-anchor": "end" }, g); t.textContent = `${k.toUpperCase()} ${Math.round(spd(z.v))}→${Math.round(spd(z.vmin))}`;
      el("title", {}, g).textContent = `${k.toUpperCase()} · ${T("brakes at", "frena en", "freia em")} ${Math.round(z.i * BIN)} m · ${Math.round(spd(z.v))} → ${Math.round(spd(z.vmin))} ${spdU()}`;
      PX.push({ g, d: z.i * BIN, lap: k, kind: "brk", t, lab: t.textContent });
      if (z.imin != null) { const m = el("g", { class: "mn " + k }, gPts); el("path", { d: "M0 -5L5 0L0 5L-5 0Z" }, m); const tt = el("text", k === "a" ? { x: 8, y: 0 } : { x: -8, y: 0, "text-anchor": "end" }, m); tt.textContent = String(Math.round(spd(z.vmin))); el("title", {}, m).textContent = `${k.toUpperCase()} · ${T("slowest", "más lento", "mais lento")} ${Math.round(spd(z.vmin))} ${spdU()} · ${Math.round(z.imin * BIN)} m`; PX.push({ g: m, d: z.imin * BIN, lap: k, kind: "min", t: tt, lab: tt.textContent }); }
    });
    brk(o.brB, "b"); brk(o.brA, "a");
    // the turns: T5 and its name outside the bend; a press zooms on it
    const TN = (o.corners || []).filter((c) => c && isFinite(c.d)).map((c) => {
      const g = el("g", { class: "tn", tabindex: "0", role: "button" }, gTurns), r = el("rect", { rx: 5 }, g), t = el("text", {}, g); t.textContent = "T" + c.n; const nm = c.name ? el("text", { class: "nm" }, g) : null; if (nm) nm.textContent = c.name;
      el("title", {}, g).textContent = "T" + c.n + (c.name ? " " + c.name : "");
      const it = { g, r, t, nm, c, ow: outward(c.d) }; g.addEventListener("click", (e) => { e.stopPropagation(); zoomTo(c.d, 260); setCur(c.d / BIN); }); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zoomTo(c.d, 260); setCur(c.d / BIN); } });
      return it;
    });
    // the cursor: lap A's car, and lap B where it was at the same moment
    const cB = el("g", {}, gCur); el("circle", { class: "cb", r: 7 }, cB); const cA = el("g", {}, gCur); el("circle", { class: "halo", r: 14 }, cA); el("circle", { class: "ca", r: 6.5 }, cA);

    /* the box's size, read once and again only when it changes (never a layout read per frame) */
    let BW = box.clientWidth || 800, BH = box.clientHeight || 500;
    /* the camera: the middle of the screen in the world and metres per screen pixel */
    let cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, u = 1, uFit = 1;
    const fitU = () => { const W = BW, H = BH, pad = 40; return Math.max((bx1 - bx0) / Math.max(50, W - 2 * pad), (by1 - by0) / Math.max(50, H - 2 * pad)); };
    const U_MIN = 0.04;
    const fit = () => { uFit = fitU(); u = uFit; cx = (bx0 + bx1) / 2; cy = (by0 + by1) / 2; view(); };
    let lastU = 0, lastST = "";
    function view() {
      const W = BW, H = BH;
      u = clamp(u, U_MIN, uFit * 1.6);
      svg.setAttribute("viewBox", `${f1(cx - W / 2 * u)} ${f1(cy - H / 2 * u)} ${f1(W * u)} ${f1(H * u)}`);
      // moving the camera (the replay following lap A) only moves the view box; sizes change with the zoom alone
      const stKey = JSON.stringify(ST);
      if (u === lastU && stKey === lastST) { placeCur(); drawT(); return; }
      lastU = u; lastST = stKey;
      // widths in metres: the real road when it is big enough, never thinner than a few pixels
      grass.setAttribute("stroke-width", f1(Math.max(34, 26 * u)));
      casing.setAttribute("stroke-width", f1(10 * u)); roadP.setAttribute("stroke-width", f1(1.4 * u));
      dSegs.forEach((s) => s.setAttribute("stroke-width", f1(Math.max(2.2, 7 * u))));
      // lap B is drawn wider under lap A, so it shows on both sides of it where the two lines are on top of each other
      if (lnB) lnB.setAttribute("stroke-width", f1(clamp(5.6 * u, .6, 9 * u))); if (lnA) lnA.setAttribute("stroke-width", f1(clamp(2.2 * u, .5, 6 * u)));
      sfL.setAttribute("stroke-width", f1(Math.max(2.2, 3.5 * u))); secL.forEach((s) => s.setAttribute("stroke-width", f1(Math.max(1.2, 2 * u))));
      secT.forEach((s) => { const w = s.ow, k = -(w.w + 18 * u); s.el.setAttribute("x", f1(w.a[0] + w.nx * k)); s.el.setAttribute("y", f1(w.a[1] + w.ny * k)); s.el.setAttribute("font-size", f1(11 * u)); });
      const near = u < uFit * .45; // close enough for the numbers beside each point
      PX.forEach((p) => { const q = p.lap === "a" ? atLine(LA, p.d) : atLine(LB, p.d); p.g.setAttribute("transform", `translate(${f1(q[0])} ${f1(q[1])}) scale(${u.toFixed(4)})`); p.t.style.display = near ? "" : "none"; p.g.style.display = (p.kind === "brk" ? ST.brk : ST.mins) ? "" : "none"; if (p.t) p.t.setAttribute("font-size", "11"); });
      TN.forEach((t) => { const w = t.ow, off = w.w + 20 * u, x = w.a[0] + w.nx * off, y = w.a[1] + w.ny * off, showNm = t.nm && u < uFit * .35, fs = 12 * u;
        t.t.setAttribute("font-size", f1(fs)); t.t.setAttribute("x", f1(x)); t.t.setAttribute("y", f1(y));
        let wdt = (String(t.t.textContent).length * 7.6 + 10) * u, hgt = 20 * u;
        if (t.nm) { t.nm.style.display = showNm ? "" : "none"; if (showNm) { t.nm.setAttribute("font-size", f1(11 * u)); t.nm.setAttribute("x", f1(x)); t.nm.setAttribute("y", f1(y + 15 * u)); wdt = Math.max(wdt, (t.c.name.length * 6.3 + 12) * u); hgt = 36 * u; } }
        t.r.setAttribute("x", f1(x - wdt / 2)); t.r.setAttribute("y", f1(y - 10 * u)); t.r.setAttribute("width", f1(wdt)); t.r.setAttribute("height", f1(hgt)); t.r.setAttribute("stroke-width", f1(1.2 * u)); t.r.setAttribute("rx", f1(5 * u)); });
      gTurns.style.display = ST.turns ? "" : "none"; gDelta.style.display = ST.delta ? "" : "none"; gLines.style.display = ST.lines ? "" : "none";
      placeCur();
      // the scale bar: a round number of metres about 90 px long
      const m = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find((v) => v / u >= 70) || 2000; scI.style.width = (m / u).toFixed(0) + "px"; scS.textContent = m + " m";
      drawT();
    }
    const zoomAt = (k, px, py) => { const W = box.clientWidth, H = box.clientHeight, wx = cx + (px - W / 2) * u, wy = cy + (py - H / 2) * u, nu = clamp(u * k, U_MIN, uFit * 1.6); cx = wx - (px - W / 2) * nu; cy = wy - (py - H / 2) * nu; u = nu; view(); };
    let anim = 0;
    const glide = (tx, ty, tu, ms) => { cancelAnimationFrame(anim); const x0 = cx, y0 = cy, u0 = u, t0 = performance.now(); const st = (ts) => { const k = clamp((ts - t0) / (ms || 350), 0, 1), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; cx = x0 + (tx - x0) * e; cy = y0 + (ty - y0) * e; u = Math.exp(Math.log(u0) + (Math.log(tu) - Math.log(u0)) * e); view(); if (k < 1) anim = requestAnimationFrame(st); }; anim = requestAnimationFrame(st); };
    // a stretch of the lap (d ± span metres) filling the screen
    function zoomTo(d, span) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let k = -span; k <= span; k += 10) { const q = atRoad(mod(d + k, L)); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } const W = box.clientWidth, H = box.clientHeight; glide((x0 + x1) / 2, (y0 + y1) / 2, clamp(Math.max((x1 - x0 + 60) / W, (y1 - y0 + 60) / H), U_MIN, uFit), 450); }

    /* the cursor (index of 5 m) and the replay's clock */
    const ta = [], tb = []; for (let i = 0; i < n; i++) { const a = sa[i], b = sb[i]; ta.push(a && a[1] != null ? a[1] : (i ? ta[i - 1] : 0)); tb.push(b && b[1] != null ? b[1] : (i ? tb[i - 1] : 0)); }
    const tEnd = Math.max(ta[n - 1] || 0, tb[n - 1] || 0);
    const dAt = (ts, t) => { if (t <= ts[0]) return 0; if (t >= ts[n - 1]) return (n - 1) * BIN; let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ts[m] <= t) lo = m; else hi = m; } return (lo + (t - ts[lo]) / ((ts[hi] - ts[lo]) || 1)) * BIN; };
    let cur = clamp(Math.round(o.start || 0), 0, n - 1), curD = cur * BIN;
    const corner = (d) => { let b = null, bd = 181; (o.corners || []).forEach((c) => { let dd = Math.abs(c.d - d); dd = Math.min(dd, L - dd); if (dd < bd) { bd = dd; b = c; } }); return b; };
    let rdT = 0, lastQB = null, lastDB = 0;
    function placeCur() {
      const qa = atLine(LA, curD), fi = clamp(curD / BIN, 0, n - 1), i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1), tAt = ta[i0] + (ta[i1] - ta[i0]) * (fi - i0), dbb = dAt(tb, tAt), qb = atLine(LB, Math.min(dbb, L - 1));
      lastQB = qb; lastDB = dbb; if (chase) drawChase();
      if (!chase) cA.setAttribute("transform", `translate(${f1(qa[0])} ${f1(qa[1])}) scale(${u.toFixed(4)})`); cB.setAttribute("transform", `translate(${f1(qb[0])} ${f1(qb[1])}) scale(${u.toFixed(4)})`);
      const now = performance.now(); if (playing && now - rdT < 80) return; rdT = now;
      const i = clamp(Math.round(curD / BIN), 0, n - 1), a = sa[i], b = sb[i], c = corner(curD), dl = a && b && a[1] != null && b[1] != null ? a[1] - b[1] : null, ah = Math.round(dbb - curD);
      const pct = (v) => (v == null ? "–" : Math.round(v * 100) + "%");
      rd.innerHTML = `<b>${Math.round(curD)} m${c ? " · T" + c.n + (c.name ? " " + esc(c.name) : "") : ""}</b>
        <div class="r">${a ? `<span class="a">A ${Math.round(spd(a[0]))}</span>` : ""}${b ? `<span class="b">B ${Math.round(spd(b[0]))} ${esc(spdU())}</span>` : ""}${dl != null ? `<span class="${dl > 0 ? "bad" : "good"}">${sgn(dl, 3)} s</span>` : ""}</div>
        ${a || b ? `<div class="r mu pd">${esc(T("Throttle", "Gas", "Acelerador"))} <span class="a">${pct(a && a[2])}</span> <span class="b">${pct(b && b[2])}</span> · ${esc(T("Brake", "Freno", "Freio"))} <span class="a">${pct(a && a[3])}</span> <span class="b">${pct(b && b[3])}</span></div>` : ""}
        <div class="mu">${esc(Math.abs(ah) < 5 ? T("B level with A", "B a la par de A", "B lado a lado com A") : ah > 0 ? T(`B ${ah} m ahead`, `B ${ah} m por delante`, `B ${ah} m à frente`) : T(`B ${-ah} m behind`, `B ${-ah} m por detrás`, `B ${-ah} m atrás`))}</div>`;
      TN.forEach((t) => t.g.classList.toggle("on", !!c && t.c.n === c.n));
    }
    function setCur(i, fromReplay) {
      cur = clamp(i, 0, n - 1); curD = cur * BIN; if (!fromReplay && !playing) t = ta[clamp(Math.round(cur), 0, n - 1)];
      if (chase) { placeCur(); drawT(); }
      // following lap A: the camera stays on the car (the replay locks it there, a jump glides to it)
      else if (ST.follow) { const q = atLine(LA, curD); if (fromReplay && playing) { cx = q[0]; cy = q[1]; view(); } else if (Math.abs(q[0] - cx) > BW * u * .18 || Math.abs(q[1] - cy) > BH * u * .18) glide(q[0], q[1], u, 250); else { placeCur(); drawT(); } }
      else { placeCur(); drawT(); }
      rg.value = String(Math.round(t / (tEnd || 1) * 1000)); tm.innerHTML = tEnd ? `${fmtT(t)} / ${fmtT(tEnd)}` : "";
      if (o.onCursor) try { o.onCursor(Math.round(cur)); } catch (e) { }
    }

    /* the telemetry under the map: speed of both laps, the gap and the pedals, the part of the lap on screen shaded */
    const tx = cv.getContext("2d"), layer = document.createElement("canvas");
    let CW = cv.clientWidth, CH = cv.clientHeight, COL = null, layerKey = ""; let shadeKey = "", shadeT = 0; const tcL = root.querySelector(".fm-tc .cl"), tcA = root.querySelector(".fm-tc .da"), tcB = root.querySelector(".fm-tc .db");
    const colors = () => ({ a: css(root, "--accent", "#f5b43c"), b: css(root, "--fm-b", "#4f9cff"), mu: css(root, "--muted", "#8a93a3"), ln: css(root, "--line", "#1c222d"), fg: css(root, "--fg", "#e6e9ef"), good: css(root, "--good", "#3ddc84"), bad: css(root, "--bad", "#ff5c5c"), font: css(root, "--f-data", "monospace"), s2: css(root, "--surface2", "#151a24"), s1: css(root, "--surface", "#10141c"), bg: css(root, "--bg", "#0b0e14"), line2: css(root, "--line2", "#2a3140"), road: getComputedStyle(roadP).fill || "#2a3140", edge: css(root, "--fg", "#e6e9ef") });
    const VP = []; for (let i = 0; i < n; i++) VP.push(atRoad(i * BIN)); // the road under every 5 m, for the shade of what is on screen
    let vmax = 1; for (let i = 0; i < n; i++) { if (sa[i]) vmax = Math.max(vmax, sa[i][0]); if (sb[i]) vmax = Math.max(vmax, sb[i][0]); }
    let gmx = .2; for (let i = 0; i < n; i++) { const a = tA(i), b = tB(i); if (a != null && b != null) gmx = Math.max(gmx, Math.abs(a - b)); }
    function drawT() {
      const dpr = window.devicePixelRatio || 1, w = CW, h = CH; if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      if (!COL) COL = colors();
      const pl = 44, pr = 8, X = (d) => pl + d / L * (w - pl - pr), hS = h * .56, hD = h * .2, hP = h - hS - hD - 14, yS = 12, yD = yS + hS, yP = yD + hD;
      const top = Math.ceil(spd(vmax) / 50) * 50, YS = (v) => yS + hS - spd(v) / top * (hS - 4);
      const key = w + "x" + h + "@" + dpr; if (key !== layerKey) { layerKey = key; shadeKey = ""; drawLayer(w, h, dpr, pl, pr, X, hS, hD, hP, yS, yD, yP, top, YS); }
      // the cursor: three small elements moved by the compositor, nothing is redrawn for it
      const cxp = X(curD), ci = clamp(Math.round(curD / BIN), 0, n - 1), a = sa[ci], b = sb[ci];
      tcL.style.transform = `translate3d(${cxp.toFixed(1)}px,0,0)`;
      tcA.style.transform = a ? `translate3d(${cxp.toFixed(1)}px,${YS(a[0]).toFixed(1)}px,0)` : "translate3d(-99px,0,0)"; tcB.style.transform = b ? `translate3d(${cxp.toFixed(1)}px,${YS(b[0]).toFixed(1)}px,0)` : "translate3d(-99px,0,0)";
      // the traces and the part of the lap on screen: redrawn only when the view moved (a few times a second in a replay)
      const shade = u < uFit * .9 && !chase, sk = shade ? f1(cx) + "," + f1(cy) + "," + u.toFixed(4) : "-"; if (sk === shadeKey) return;
      const now = performance.now(); if (playing && shadeKey && now - shadeT < 160) return; shadeKey = sk; shadeT = now;
      const x = tx; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
      if (shade) { const vx0 = cx - BW / 2 * u, vx1 = cx + BW / 2 * u, vy0 = cy - BH / 2 * u, vy1 = cy + BH / 2 * u; x.fillStyle = COL.s2; let run = -1; for (let i = 0; i <= n; i++) { const q = i < n ? VP[i] : null, inn = q && q[0] >= vx0 && q[0] <= vx1 && q[1] >= vy0 && q[1] <= vy1; if (inn && run < 0) run = i; if (!inn && run >= 0) { x.fillRect(X(run * BIN), 0, X(i * BIN) - X(run * BIN), h); run = -1; } } }
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(layer, 0, 0);
    }
    function drawLayer(w, h, dpr, pl, pr, X, hS, hD, hP, yS, yD, yP, top, YS) {
      layer.width = Math.round(w * dpr); layer.height = Math.round(h * dpr); const x = layer.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cA_ = COL.a, cB_ = COL.b, mu = COL.mu, ln = COL.ln, fg = COL.fg, good = COL.good, bad = COL.bad, font = COL.font;
      x.font = "10px " + font; x.lineWidth = 1;
      // turns
      (o.corners || []).forEach((c) => { const xx = X(c.d); x.strokeStyle = ln; x.beginPath(); x.moveTo(xx, yS); x.lineTo(xx, h - 2); x.stroke(); x.fillStyle = mu; x.fillText("T" + c.n, xx + 2, 9); });
      // speed
      x.fillStyle = mu; x.strokeStyle = ln; for (let v = 50; v < top; v += 50) { const y = yS + hS - v / top * (hS - 4); x.beginPath(); x.moveTo(pl, y); x.lineTo(w - pr, y); x.stroke(); x.fillText(String(v), 4, y + 3); }
      const trace = (s, col, k, Y, lw) => { x.beginPath(); let on = false; for (let i = 0; i < n; i++) { const r = s[i]; if (!r || r[k] == null) { on = false; continue; } const px = X(i * BIN), py = Y(r[k]); on ? x.lineTo(px, py) : x.moveTo(px, py); on = true; } x.strokeStyle = col; x.lineWidth = lw || 1.6; x.stroke(); };
      trace(sb, cB_, 0, YS); trace(sa, cA_, 0, YS);
      // the gap, A − B
      const mx = gmx;
      const YD = (v) => yD + hD / 2 - v / mx * (hD / 2 - 3); x.strokeStyle = ln; x.beginPath(); x.moveTo(pl, YD(0)); x.lineTo(w - pr, YD(0)); x.stroke(); x.fillStyle = mu; x.fillText("±" + mx.toFixed(1), 4, YD(0) + 3);
      x.beginPath(); let on = false; for (let i = 0; i < n; i++) { const a = tA(i), b = tB(i); if (a == null || b == null) { on = false; continue; } const px = X(i * BIN), py = YD(a - b); on ? x.lineTo(px, py) : x.moveTo(px, py); on = true; } x.strokeStyle = fg; x.lineWidth = 1.3; x.stroke();
      // the pedals: throttle up, brake down
      const YP = (v) => yP + hP / 2 - v * (hP / 2 - 1), YB = (v) => yP + hP / 2 + v * (hP / 2 - 1);
      x.globalAlpha = .9; trace(sb, cB_, 2, YP, 1); trace(sa, cA_, 2, YP, 1); trace(sb, cB_, 3, YB, 1); trace(sa, cA_, 3, YB, 1); x.globalAlpha = 1;
      x.fillStyle = good; x.fillText(T("thr", "gas", "acel"), 4, yP + 8); x.fillStyle = bad; x.fillText(T("brk", "fren", "freio"), 4, yP + hP - 2);
    }
    /* ---------- the chase view: from behind lap A's car, a little above it, the road ahead in perspective ----------
       Drawn on its own canvas from the same road, lines and points as the map (no 3D model, no heights). */
    const cc = root.querySelector(".fm-cc"), cx2 = cc.getContext("2d");
    let chase = false, hd = null, hdT = 0, cHd = null, camK = 1, chQ = 1, chT = 0, chBest = 16.8, ccBg = null, chAvg = 16, chN = 0;
    // drawn as few paths as possible (one for the asphalt, one per colour and width for the kerbs and lines) and at most
    // 1.5 pixels per CSS pixel, so it keeps up with the screen's refresh rate on any PC
    let dRoad = null; // the gain or loss under every road point, worked out once
    const roadDelta = () => { if (dRoad) return dRoad; const m = new Map(dRaw.map((r) => [r[0], r[1]])), N = R.N; dRoad = new Float32Array(N); for (let i = 0; i < N; i++) { const v = m.get(Math.floor(i / N * n / 5) * 5); dRoad[i] = v != null && Math.abs(v) >= dMx * .08 ? v : 0; } return dRoad; };
    function drawChase() {
      const now0 = performance.now(), W = BW, H = BH; if (!W || !H) return;
      // the picture gets a little less sharp before it ever drops a frame: when the replay's frames come late against
      // the fastest the screen showed, the canvas draws fewer pixels
      if (playing && chT) { const dt = now0 - chT; if (dt < 200) { chBest = Math.min(chBest, Math.max(4, dt)); chAvg += (dt - chAvg) * .1; if (++chN > 20 && chAvg > chBest * 1.45 && chQ > .6) { chQ = Math.max(.6, chQ * .8); chN = 0; chAvg = chBest; } } } chT = now0;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1) * chQ;
      if (cc.width !== Math.round(W * dpr) || cc.height !== Math.round(H * dpr)) { cc.width = Math.round(W * dpr); cc.height = Math.round(H * dpr); }
      if (!COL) COL = colors(); if (ccBg !== COL) { ccBg = COL; cc.style.background = `linear-gradient(${COL.s2} 0%, ${COL.bg} 16%, color-mix(in srgb, ${COL.good} 6%, ${COL.bg}) 16.1%, color-mix(in srgb, ${COL.good} 6%, ${COL.s1}) 100%)`; }
      const x = cx2; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      // the camera rides on the middle of the road, pointed along it (the road's shape is smooth, a car's path is not),
      // so it never shakes; lap A's car moves across the road in front of it
      const o0 = atRoad(curD), r1 = atRoad(curD - 10), r2 = atRoad(curD + 30), hdt = Math.atan2(r2[1] - r1[1], r2[0] - r1[0]);
      const now = performance.now(); if (hd == null || !playing) hd = hdt; else { let df = hdt - hd; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI; hd += df * (1 - Math.exp(-(now - (hdT || now)) / 90)); } hdT = now;
      const hx = Math.cos(hd), hy = Math.sin(hd), rx = -hy, ry = hx; // forward and right, in the world (y down)
      const back = 42 * camK, up = 17 * camK, hz = H * .16, f = (H * .58 - hz) * back / up, near = 1.5, far = 700 * camK;
      const P = (pt) => { const dx = pt[0] - o0[0], dy = pt[1] - o0[1], Z = dx * hx + dy * hy + back, X = dx * rx + dy * ry; return Z > near ? [W / 2 + f * X / Z, hz + f * up / Z, Z] : null; };
      // the stretch of road from just behind the camera to 600 m ahead
      const N = R.N, step = L / N, s0 = Math.round(curD / step), from = s0 - Math.round((back + 10) / step), to = s0 + Math.round(far / step);
      const pts = []; for (let k = from; k <= to; k++) { const i = mod(k, N); pts.push({ i, l: P(EL[i]), r: P(ER[i]) }); }
      // the asphalt, one shape per run of road in front of the camera
      x.fillStyle = COL.road; x.beginPath();
      for (let j = 0; j < pts.length;) { while (j < pts.length && !(pts[j].l && pts[j].r)) j++; const a = j; while (j < pts.length && pts[j].l && pts[j].r) j++; if (j - a < 2) continue;
        x.moveTo(pts[a].l[0], pts[a].l[1]); for (let k = a + 1; k < j; k++) x.lineTo(pts[k].l[0], pts[k].l[1]); for (let k = j - 1; k >= a; k--) x.lineTo(pts[k].r[0], pts[k].r[1]); x.closePath(); }
      x.fill("nonzero");
      // the edges, coloured where A gains or loses: segments grouped by colour and width
      const groups = new Map(), add = (col, w, A, B) => { const key = col + "|" + w; let g = groups.get(key); if (!g) { g = { col, w, p: new Path2D() }; groups.set(key, g); } g.p.moveTo(A[0], A[1]); g.p.lineTo(B[0], B[1]); };
      const dr = ST.delta ? roadDelta() : null;
      for (const side of ["l", "r"]) for (let j = 0; j < pts.length - 1; j++) { const A = pts[j][side], B = pts[j + 1][side]; if (!A || !B) continue; const v = dr ? dr[pts[j].i] : 0; add(v > 0 ? COL.bad : v < 0 ? COL.good : COL.mu, Math.round(clamp((v ? 1.2 : .35) * f / ((A[2] + B[2]) / 2), 1, 10) * 2) / 2, A, B); }
      x.lineCap = "butt"; x.lineJoin = "round"; groups.forEach((g) => { x.strokeStyle = g.col; x.lineWidth = g.w; x.stroke(g.p); });
      // start/finish and sector cuts
      const cutAt = (d, col, w) => { let dd = d - curD; if (dd < -back) dd += L; if (dd < -back || dd > far) return; const i = mod(Math.round(d / step), N), l = P(EL[i]), r = P(ER[i]); if (!l || !r) return; x.strokeStyle = col; x.lineWidth = Math.max(1.5, w * f / l[2]); x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(r[0], r[1]); x.stroke(); };
      cutAt(0, "#fff", .8); for (let j = 1; j < cnt; j++) cutAt(j / cnt * L, COL.mu, .4);
      // the racing lines, B under A, each as a few paths of one width
      const lineAt = (ln, col, wk) => { if (!ln || !ST.lines) return; const d0 = Math.max(0, curD - back - 10), d1 = Math.min((ln.length - 1) * BIN, curD + far), byW = new Map(); let prev = null;
        for (let d = d0; d <= d1; d += d - curD < 150 ? 2.5 : 5) { const pp = P(atLine(ln, d)); if (pp && prev) { const w = Math.round(clamp(.35 * wk * f / pp[2], 1.2 * wk, 7 * wk) * 2) / 2; let p = byW.get(w); if (!p) { p = new Path2D(); byW.set(w, p); } p.moveTo(prev[0], prev[1]); p.lineTo(pp[0], pp[1]); } prev = pp; }
        x.strokeStyle = col; x.lineCap = "round"; byW.forEach((p, w) => { x.lineWidth = w; x.stroke(p); }); };
      lineAt(LB, COL.b, 1.9); lineAt(LA, COL.a, 1);
      // braking and slowest points ahead, with their speeds
      x.font = "600 12px " + COL.font; x.textBaseline = "middle";
      PX.forEach((p) => { if ((p.kind === "brk" && !ST.brk) || (p.kind === "min" && !ST.mins)) return; const dd = p.d - curD; if (dd < -back || dd > far) return; const pp = P(atLine(p.lap === "a" ? LA : LB, p.d)); if (!pp) return; const rr = clamp(.9 * f / pp[2], 2.5, 9), col = p.lap === "a" ? COL.a : COL.b;
        x.fillStyle = col; x.strokeStyle = COL.bg; x.lineWidth = 1.5; x.beginPath(); if (p.kind === "brk") x.arc(pp[0], pp[1], rr, 0, 7); else { x.moveTo(pp[0], pp[1] - rr); x.lineTo(pp[0] + rr, pp[1]); x.lineTo(pp[0], pp[1] + rr); x.lineTo(pp[0] - rr, pp[1]); x.closePath(); } x.fill(); x.stroke();
        if (pp[2] < 260 * camK) { x.textAlign = p.lap === "a" ? "left" : "right"; x.lineWidth = 3; x.strokeText(p.lab, pp[0] + (p.lap === "a" ? rr + 4 : -rr - 4), pp[1]); x.fillText(p.lab, pp[0] + (p.lap === "a" ? rr + 4 : -rr - 4), pp[1]); } });
      // the turns ahead: a sign beside the road
      if (ST.turns) TN.forEach((t) => { let dd = t.c.d - curD; if (dd < 0) dd += L; if (dd > far) return; const w = t.ow, pp = P([w.a[0] + w.nx * (w.w + 4), w.a[1] + w.ny * (w.w + 4)]); if (!pp) return; const txt = "T" + t.c.n + (t.c.name && pp[2] < 300 * camK ? " " + t.c.name : ""); x.font = "700 13px " + COL.font; x.textAlign = "center"; const tw = x.measureText(txt).width + 14, ty = pp[1] - 22;
        x.strokeStyle = COL.mu; x.lineWidth = 1; x.beginPath(); x.moveTo(pp[0], pp[1]); x.lineTo(pp[0], ty + 11); x.stroke(); x.fillStyle = COL.s1; x.strokeStyle = COL.line2; x.beginPath(); x.rect(pp[0] - tw / 2, ty - 11, tw, 22); x.fill(); x.stroke(); x.fillStyle = COL.fg; x.fillText(txt, pp[0], ty); });
      // lap B where it was at this moment, then lap A's car (an arrow along its own path, its nose 2.5 m ahead)
      if (lastQB) { const pb = P(lastQB); if (pb) { x.strokeStyle = COL.b; x.lineWidth = 3; x.beginPath(); x.ellipse(pb[0], pb[1], clamp(1.4 * f / pb[2], 4, 26), clamp(.7 * f / pb[2], 2, 13), 0, 0, 7); x.stroke(); } }
      const q = atLine(LA, curD), c1 = atLine(LA, Math.max(0, curD - 6)), c2 = atLine(LA, Math.min(L - 1, curD + 10)), ca = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);
      if (cHd == null || !playing) cHd = ca; else { let df = ca - cHd; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI; cHd += df * .3; }
      const ax = Math.cos(cHd), ay = Math.sin(cHd), bx = -ay, by = ax;
      const nose = P([q[0] + ax * 3.6, q[1] + ay * 3.6]), tail = P([q[0] - ax * 2.6, q[1] - ay * 2.6]), tl = P([q[0] - ax * 2.6 - bx * 1.6, q[1] - ay * 2.6 - by * 1.6]), tr = P([q[0] - ax * 2.6 + bx * 1.6, q[1] - ay * 2.6 + by * 1.6]);
      if (nose && tail && tl && tr) { x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.moveTo(nose[0], nose[1] + 3); x.lineTo(tr[0], tr[1] + 3); x.lineTo(tail[0], tail[1] + 3); x.lineTo(tl[0], tl[1] + 3); x.closePath(); x.fill();
        x.fillStyle = COL.a; x.strokeStyle = COL.bg; x.lineWidth = 2; x.lineJoin = "round"; x.beginPath(); x.moveTo(nose[0], nose[1]); x.lineTo(tr[0], tr[1]); x.lineTo(tail[0], tail[1] - (tail[1] - nose[1]) * .25); x.lineTo(tl[0], tl[1]); x.closePath(); x.fill(); x.stroke(); }
    }
    function setChase(on) {
      chase = on; zb.chase.setAttribute("aria-pressed", String(on)); box.classList.toggle("chase", on); hd = null; cHd = null; COL = null;
      if (on) drawChase(); else view();
      drawT();
    }

    // pointer on the telemetry: a click or a drag moves the cursor, the mouse passing over it does not
    const dOfX = (e) => { const r = cv.getBoundingClientRect(), pl = 44, pr = 8; return clamp((e.clientX - r.left - pl) / (r.width - pl - pr), 0, 1) * L; };
    let tDown = false;
    cv.addEventListener("pointerdown", (e) => { tDown = true; cv.setPointerCapture(e.pointerId); stop(); setCur(dOfX(e) / BIN); });
    cv.addEventListener("pointermove", (e) => { if (tDown) setCur(dOfX(e) / BIN); });
    cv.addEventListener("pointerup", () => { tDown = false; }); cv.addEventListener("pointercancel", () => { tDown = false; });
    cv.addEventListener("dblclick", (e) => zoomTo(dOfX(e), 220));

    /* the map's pointer: drag moves, the wheel and two fingers zoom, a hover or a tap reads the nearest point of the road */
    const ptrs = new Map(); let drag = null, pinch = null;
    const local = (e) => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const nearestD = (px, py, lim) => { const W = BW, H = BH, wx = cx + (px - W / 2) * u, wy = cy + (py - H / 2) * u; let bi = -1, bd = (lim * u) ** 2; for (let i = 0; i < R.N; i++) { const dx = C[i][0] - wx, dy = C[i][1] - wy, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; bi = i; } } if (bi < 0) return null;
      // between the nearest point and the next or the one before
      let s = bi, best = 1e18; for (const a of [mod(bi - 1, R.N), bi]) { const b = mod(a + 1, R.N), sx = C[b][0] - C[a][0], sy = C[b][1] - C[a][1], m2 = sx * sx + sy * sy || 1, f = clamp(((wx - C[a][0]) * sx + (wy - C[a][1]) * sy) / m2, 0, 1), qx = C[a][0] + sx * f - wx, qy = C[a][1] + sy * f - wy, d2 = qx * qx + qy * qy; if (d2 < best) { best = d2; s = a + f; } }
      return mod(s, R.N) / R.N * L; };
    box.addEventListener("pointerdown", (e) => { if (chase || (e.target.closest && e.target.closest(".fm-z,.tn"))) return; box.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, local(e)); cancelAnimationFrame(anim);
      if (ptrs.size === 1) drag = { p: local(e), cx, cy, moved: false }; else if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; pinch = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), u, m: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], cx, cy }; drag = null; } });
    box.addEventListener("pointermove", (e) => {
      if (chase) return;
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, local(e));
      if (pinch && ptrs.size === 2) { const [p1, p2] = [...ptrs.values()], d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], W = box.clientWidth, H = box.clientHeight; const nu = clamp(pinch.u * pinch.d / (d || 1), U_MIN, uFit * 1.6), wx = pinch.cx + (pinch.m[0] - W / 2) * pinch.u, wy = pinch.cy + (pinch.m[1] - H / 2) * pinch.u; u = nu; cx = wx - (m[0] - W / 2) * nu; cy = wy - (m[1] - H / 2) * nu; view(); return; }
      if (drag) { const p = local(e), dx = p[0] - drag.p[0], dy = p[1] - drag.p[1]; if (!drag.moved && Math.hypot(dx, dy) < 4) return; drag.moved = true; box.classList.add("drag"); if (ST.follow) { ST.follow = false; save(); zb.follow.setAttribute("aria-pressed", "false"); } cx = drag.cx - dx * u; cy = drag.cy - dy * u; view(); return; }
    });
    const up = (e) => { const was = drag; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) { box.classList.remove("drag"); if (was && !was.moved) { const p = local(e), d = nearestD(p[0], p[1], e.pointerType === "mouse" ? 40 : 90); if (d != null) { stop(); setCur(d / BIN); } } drag = null; } };
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("wheel", (e) => { e.preventDefault(); if (chase) { camK = clamp(camK * Math.exp(clamp(e.deltaY, -120, 120) * .002), .4, 3); drawChase(); return; } const p = local(e); zoomAt(Math.exp(clamp(e.deltaY, -120, 120) * (e.ctrlKey ? .01 : .0025)), p[0], p[1]); }, { passive: false });
    box.addEventListener("dblclick", (e) => { if (chase) return; if (e.target.closest && e.target.closest(".fm-z")) return; const p = local(e); glideAt(.4, p); });
    const glideAt = (k, p) => { const W = box.clientWidth, H = box.clientHeight, wx = cx + (p[0] - W / 2) * u, wy = cy + (p[1] - H / 2) * u, nu = clamp(u * k, U_MIN, uFit * 1.6); glide(wx - (p[0] - W / 2) * nu, wy - (p[1] - H / 2) * nu, nu, 300); };
    const zb = {}; root.querySelectorAll("[data-z]").forEach((b) => { zb[b.dataset.z] = b; b.addEventListener("click", () => {
      const W = box.clientWidth, H = box.clientHeight;
      if (b.dataset.z === "chase") { setChase(!chase); return; }
      if (chase && (b.dataset.z === "in" || b.dataset.z === "out")) { camK = clamp(camK * (b.dataset.z === "in" ? .75 : 1 / .75), .4, 3); drawChase(); return; }
      if (chase) setChase(false);
      if (b.dataset.z === "in") glideAt(.6, [W / 2, H / 2]); else if (b.dataset.z === "out") glideAt(1 / .6, [W / 2, H / 2]); else if (b.dataset.z === "fit") { uFit = fitU(); glide((bx0 + bx1) / 2, (by0 + by1) / 2, uFit, 400); }
      else { ST.follow = !ST.follow; save(); b.setAttribute("aria-pressed", String(ST.follow)); if (ST.follow) { const q = atLine(LA, curD); glide(q[0], q[1], Math.min(u, uFit * .22), 450); } }
    }); });
    root.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.k; ST[k] = !ST[k]; save(); b.setAttribute("aria-pressed", String(ST[k])); view(); }));

    /* the replay: both laps on the same clock */
    const go = root.querySelector(".go"), rg = root.querySelector(".fm-rp input"), tm = root.querySelector(".tm");
    let t = ta[cur] || 0, playing = false, raf = 0, last = 0, rate = 2;
    root.querySelectorAll("[data-sp]").forEach((b) => b.addEventListener("click", () => { rate = +b.dataset.sp; root.querySelectorAll("[data-sp]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
    function stop() { cancelAnimationFrame(raf); raf = 0; const was = playing; playing = false; go.textContent = "▶"; if (was) { rdT = 0; shadeKey = ""; placeCur(); drawT(); } }
    const step = (ts) => { if (!root.isConnected) return stop(); if (last) t = Math.min(tEnd, t + (ts - last) / 1000 * rate); last = ts; setCur(dAt(ta, t) / BIN, true); if (t >= tEnd) return stop(); raf = requestAnimationFrame(step); };
    function play() { if (!(tEnd > 0)) return; if (t >= tEnd - .01) t = 0; playing = true; last = 0; go.textContent = "❚❚"; raf = requestAnimationFrame(step); }
    go.addEventListener("click", () => (playing ? stop() : play()));
    rg.addEventListener("input", () => { stop(); t = +rg.value / 1000 * tEnd; setCur(dAt(ta, t) / BIN, true); });

    /* keys: Esc closes, + − 0 zoom, space plays, ← → move the cursor (Shift: 50 m) */
    const onKey = (e) => {
      if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target !== rg) return;
      e.stopPropagation(); // the map is on top of everything: the screen under it gets no keys
      const W = box.clientWidth, H = box.clientHeight;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "+" || e.key === "=") glideAt(.6, [W / 2, H / 2]); else if (e.key === "-" || e.key === "_") glideAt(1 / .6, [W / 2, H / 2]); else if (e.key === "0") zb.fit.click();
      else if (e.key === " ") { e.preventDefault(); playing ? stop() : play(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); stop(); setCur(cur + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1)); }
    };
    document.addEventListener("keydown", onKey, true);
    const onResize = () => { BW = box.clientWidth || BW; BH = box.clientHeight || BH; CW = cv.clientWidth; CH = cv.clientHeight; COL = null; layerKey = ""; const k = u / uFit; uFit = fitU(); u = uFit * k; lastU = 0; view(); if (chase) drawChase(); };
    window.addEventListener("resize", onResize);
    const ro = window.ResizeObserver ? new ResizeObserver(onResize) : null; if (ro) { ro.observe(box); ro.observe(cv); }
    const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null, onTheme = () => { COL = null; layerKey = ""; drawT(); if (chase) drawChase(); }; if (mq && mq.addEventListener) mq.addEventListener("change", onTheme);
    function close() { stop(); cancelAnimationFrame(anim); document.removeEventListener("keydown", onKey, true); window.removeEventListener("resize", onResize); if (ro) ro.disconnect(); if (mq && mq.removeEventListener) mq.removeEventListener("change", onTheme); document.documentElement.style.overflow = prevOv; root.remove(); if (o.onClose) try { o.onClose(Math.round(cur)); } catch (e) { } }
    root.querySelector(".fm-x").addEventListener("click", close);

    fit(); setCur(cur); if (o.chase) setChase(true); // "Watch it" from a coach tip opens behind lap A's car just before the corner
    root.tabIndex = -1; root.focus({ preventScroll: true });
    return { close, setCursor: (i) => setCur(i), lines: { a: !!lineA, b: !!lineB } };
  }

  window.PW_FULLMAP = { open, lineOf: (xy, map) => lineOf(xy, roadOf(map)), VERSION: 1 };
})();
