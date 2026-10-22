// Where Willy can go in the room, and how he gets there. He walks a surface round whatever
// stands on it, on a grid of steps and turns, and goes from one surface to another by one of
// the jumps the room names. What is solid is asked of fits(), so this needs no page and is
// checked on its own (checks/willy-paths.test.mjs).
//
// In room px. A surface is { name, z, x0, y0, x1, y1 }. A jump { a, b, to, heading } goes from
// surface a up to the spot to on surface b, landing facing heading; and back down the other
// way. fits(x, y, z, heading, clip, { on, at, past }) says whether he can be there in that
// clip: clear of everything solid (but what makes the surfaces named in past), wholly on the
// surface on when one is given, at the moment at (0 to 1) of the clip or at all of them. A
// heading is in degrees, 0 along the room's x, 90 towards the back wall (room -y).

const STEP = 20; // the grid
const DIRS = 16; // the headings he walks at on it
const ARC = 360 / DIRS;
const TURN_COST = 8; // a turn of one ARC on the spot costs as much as this much ground
const BEND_COST = 3; // and turning it as he steps, as a cat mostly turns, this much
const LIMIT = 80000; // states looked at before giving up on a walk
export const AIR = 0.42; // seconds in the air
const LIFT = 40; // how far the arc rises over the higher end, at most

const rad = (d) => (d * Math.PI) / 180;
const ahead = (h) => [Math.cos(rad(h)), -Math.sin(rad(h))];
const toward = (a, b) => (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
const norm = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// the point of a jump at f (0 to 1) of the way: x, y, z and heading. A curve through a point
// above the higher end: going up he rises first and comes over the edge from above; going
// down he leaps out and falls.
export function arc(j, f) {
  const up = j.to[2] > j.from[2],
    k = up ? 0.2 : 0.5;
  const c = [j.from[0] + (j.to[0] - j.from[0]) * k, j.from[1] + (j.to[1] - j.from[1]) * k, Math.max(j.from[2], j.to[2]) + LIFT * (up ? 2 : 1)];
  const b = (i) => (1 - f) * (1 - f) * j.from[i] + 2 * f * (1 - f) * c[i] + f * f * j.to[i];
  return [b(0), b(1), b(2), j.h0 + norm(j.h1 - j.h0) * f];
}

export function planner({ surfaces, jumps, fits }) {
  const named = Object.fromEntries(surfaces.map((s) => [s.name, s]));
  const memo = new Map();
  const fit = (s, x, y, h, clip) => {
    const k = s.name + clip + Math.round(x) + "," + Math.round(y) + "," + Math.round(norm(h));
    if (!memo.has(k)) memo.set(k, fits(x, y, s.z, h, clip, { on: s }));
    return memo.get(k);
  };

  // whether a straight line can be walked, looking along it
  function line(s, a, b) {
    const h = toward(a, b),
      n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (STEP / 2));
    for (let i = 0; i <= n; i++) if (!fit(s, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, h, "walk")) return false;
    return true;
  }
  // whether he can turn on the spot from one heading to another, the short way round, in the
  // room a turn takes ("turn" to fits: his paws step out as he goes round)
  function turn(s, p, h0, h1) {
    const d = norm(h1 - h0),
      n = Math.ceil(Math.abs(d) / 5);
    for (let i = 0; i <= n; i++) if (!fit(s, p[0], p[1], h0 + (d * i) / n, "turn")) return false;
    return true;
  }

  // a walk on s from [x, y, heading] to [x, y] (facing heading, if one is given): the points
  // he passes, each with the way he faces there; a point repeated with another heading is a
  // turn on the spot. null if there is no way.
  function walk(s, from, to) {
    const dir = (h) => ((Math.round(h / ARC) % DIRS) + DIRS) % DIRS;
    const d0 = dir(from[2]);
    const gi = Math.round((to[0] - from[0]) / STEP),
      gj = Math.round((to[1] - from[1]) / STEP);
    const gd = to[2] == null ? null : dir(to[2]);
    const at = (i, j) => [from[0] + i * STEP, from[1] + j * STEP];
    const key = (i, j, d) => i + "," + j + "," + d;
    const open = [{ i: 0, j: 0, d: d0, g: 0, f: 0 }];
    const best = new Map([[key(0, 0, d0), 0]]);
    const back = new Map();
    let seen = 0;
    while (open.length && seen++ < LIMIT) {
      const c = pop(open);
      if (c.g > best.get(key(c.i, c.j, c.d))) continue;
      if (c.i === gi && c.j === gj && (gd == null || c.d === gd)) {
        const grid = trace(back, c, at);
        const smoothed = smooth(s, grid.map((p) => p.slice()), from, to);
        return walkable(s, smoothed) ? smoothed : grid;
      }
      // a step ahead lands on the grid point nearest two steps along his heading, and is
      // checked halfway there too; a step may bend one ARC either way, along the heading
      // between, and the halfway point faces between; or he turns on the spot
      const step = (h) => ahead(h).map((x) => Math.round(2 * x));
      const v = step(c.d * ARC);
      const next = [
        { i: c.i + v[0], j: c.j + v[1], d: c.d, cost: STEP * Math.hypot(v[0], v[1]) },
        { i: c.i, j: c.j, d: (c.d + 1) % DIRS, cost: TURN_COST },
        { i: c.i, j: c.j, d: (c.d + DIRS - 1) % DIRS, cost: TURN_COST },
      ];
      for (const e of [1, -1]) {
        const u = step((c.d + e / 2) * ARC);
        next.push({ i: c.i + u[0], j: c.j + u[1], d: (c.d + e + DIRS) % DIRS, cost: STEP * Math.hypot(u[0], u[1]) + BEND_COST, bend: e });
      }
      for (const n of next) {
        const p = at(n.i, n.j),
          mid = at((c.i + n.i) / 2, (c.j + n.j) / 2);
        const h = n.bend ? (c.d + n.bend / 2) * ARC : n.d * ARC;
        if (!fit(s, p[0], p[1], n.d * ARC, "walk") || !fit(s, mid[0], mid[1], h, "walk")) continue;
        if (n.d !== c.d && !n.bend && !turn(s, p, c.d * ARC, n.d * ARC)) continue; // and the turn's sweep
        const g = c.g + n.cost,
          k = key(n.i, n.j, n.d);
        if (best.has(k) && best.get(k) <= g) continue;
        best.set(k, g);
        back.set(k, c);
        push(open, { ...n, g, f: g + STEP * Math.hypot(gi - n.i, gj - n.j) });
      }
    }
    return null;
  }

  // whether every step of a walk can be taken: each line looking along it, each turn
  function walkable(s, pts) {
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      if (a[0] === b[0] && a[1] === b[1] ? !turn(s, a, a[2], b[2]) : !line(s, a, b) || norm(toward(a, b) - b[2]) !== 0) return false;
    }
    return true;
  }

  // the grid's zig-zags pulled straight wherever a straight line can be walked
  function smooth(s, pts, from, to) {
    const end = [to[0], to[1], to[2] == null ? pts[pts.length - 1][2] : to[2]];
    if (line(s, pts[pts.length - 1], end)) pts.push(end);
    const out = [[from[0], from[1], from[2]]];
    let k = 0;
    while (k < pts.length - 1) {
      let m = pts.length - 1;
      const was = out[out.length - 1][2];
      const ok = (m) => pts[k][0] === pts[m][0] && pts[k][1] === pts[m][1] ? turn(s, pts[k], was, pts[m][2]) : line(s, pts[k], pts[m]) && turn(s, pts[k], was, toward(pts[k], pts[m]));
      while (m > k + 1 && !ok(m)) m--;
      const a = pts[k],
        b = pts[m];
      // a step the grid took on the spot is a turn; otherwise the line, looking along it
      const h = a[0] === b[0] && a[1] === b[1] ? b[2] : toward(a, b);
      if (norm(h - was) !== 0) out.push([a[0], a[1], h]);
      if (a[0] !== b[0] || a[1] !== b[1]) out.push([b[0], b[1], h]);
      k = m;
    }
    const last = out[out.length - 1];
    if (norm(last[2] - end[2]) !== 0) out.push([last[0], last[1], end[2]]);
    return out;
  }

  // The jumps from surface a to surface b, each as it goes that way, if he can make it. A
  // jump the room names lands at a spot on its upper surface, facing a way; where he takes off
  // from is found: behind the spot, off to either side, near or far, wherever he fits and the
  // air between is clear; and the spot may slide a little along the way he faces, so that it
  // fits too. Down he leaps off from the same spot, ahead of him. Worked out once for each pair.
  const found = new Map();
  function hops(a, b) {
    const k = a.name + ">" + b.name;
    if (!found.has(k)) found.set(k, jumps.flatMap((j) => (j.a === a.name && j.b === b.name ? hop(j, a, b, true) : j.b === a.name && j.a === b.name ? hop(j, b, a, false) : [])));
    return found.get(k);
  }
  function hop(j, lo, hi, up) {
    for (let n = 0; n <= 18; n++) {
      const slide = (n % 2 ? -5 : 5) * Math.ceil(n / 2); // 0, -5, 5, -10 ... to 45 either way
      const f = ahead(j.heading);
      const top = [j.to[0] + f[0] * slide, j.to[1] + f[1] * slide, hi.z];
      if (!fit(hi, top[0], top[1], j.heading, "idle")) continue;
      for (const d of [240, 280, 200, 320, 160, 360, 120])
        for (const turn of [30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 15, -15, 105, -105, 120, -120]) {
          // up, he comes from behind the way he lands facing; down, he leaps off ahead
          const g = ahead(j.heading + (up ? 180 : 0) + turn);
          const bottom = [top[0] + g[0] * d, top[1] + g[1] * d, lo.z];
          if (up) {
            const one = { a: lo.name, b: hi.name, from: bottom, to: top, h0: toward(bottom, top), h1: j.heading };
            if (works(one, lo, hi, up)) return [one];
          } else
            // and he may twist in the air, landing facing some other way than he flew
            for (const twist of [0, 30, -30, 60, -60, 90, -90]) {
              const one = { a: hi.name, b: lo.name, from: top, to: bottom, h0: j.heading, h1: toward(top, bottom) + twist };
              if (works(one, lo, hi, up)) return [one];
            }
        }
    }
    return [];
  }
  function works(j, lo, hi, up) {
    const [A, B] = up ? [lo, hi] : [hi, lo];
    // standing at either end he is on the surface; crouched to go or stretched to land, he
    // may reach out over its edge, into the air, but into nothing solid
    if (!fit(A, j.from[0], j.from[1], j.h0, "idle") || !fit(B, j.to[0], j.to[1], j.h1, "idle")) return false;
    if (!fits(j.from[0], j.from[1], A.z, j.h0, "jump-up") || !fits(j.to[0], j.to[1], B.z, j.h1, "jump-land")) return false;
    // in between, clear air, sampled, but the edges of the two surfaces, which he clears
    for (let f = 0.05; f < 0.96; f += 0.05) {
      const p = arc(j, f);
      if (!fits(p[0], p[1], p[2], p[3], "jump-air", { at: f, past: [A.name, B.name] })) return false;
    }
    return true;
  }

  const length = (pts) => pts.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

  return {
    walk: (s, from, to) => walk(named[s], from, to),
    // from { surface, x, y, heading } to { surface, x, y, heading? }: a list of legs, each
    // { walk: points } or { jump: hop }, or null. Between surfaces, the shorter ways are the
    // likelier, not certain: rand() picks.
    route(from, to, rand = Math.random) {
      const a = named[from.surface],
        b = named[to.surface];
      if (a === b) {
        const w = walk(a, [from.x, from.y, from.heading], [to.x, to.y, to.heading]);
        return w && [{ walk: w }];
      }
      const ways = [];
      for (const hop of hops(a, b)) {
        const w1 = walk(a, [from.x, from.y, from.heading], [hop.from[0], hop.from[1], hop.h0]);
        const w2 = w1 && walk(b, [hop.to[0], hop.to[1], hop.h1], [to.x, to.y, to.heading]);
        if (w2) ways.push({ legs: [{ walk: w1 }, { jump: hop }, { walk: w2 }], cost: length(w1) + length(w2) + Math.hypot(hop.to[0] - hop.from[0], hop.to[1] - hop.from[1]) });
      }
      if (!ways.length) return null;
      const weight = ways.map((w) => 1 / (w.cost * w.cost + 1));
      let r = rand() * weight.reduce((x, y) => x + y);
      for (let i = 0; i < ways.length; i++) if ((r -= weight[i]) <= 0) return ways[i].legs;
      return ways[ways.length - 1].legs;
    },
    // somewhere on the surface he fits in that clip: [x, y, heading], or null
    spot(s, clip, rand = Math.random, headings = null) {
      const S = named[s];
      for (let n = 0; n < 400; n++) {
        const x = S.x0 + rand() * (S.x1 - S.x0),
          y = S.y0 + rand() * (S.y1 - S.y0);
        const h = headings ? headings[Math.floor(rand() * headings.length)] : Math.round(rand() * 24) * 15;
        if (fit(S, x, y, h, clip)) return [Math.round(x), Math.round(y), h];
      }
      return null;
    },
    hops: (a, b) => hops(named[a], named[b]),
  };
}

function trace(back, c, at) {
  const out = [];
  for (let n = c; n; n = back.get(n.i + "," + n.j + "," + n.d)) out.unshift([...at(n.i, n.j), n.d * ARC]);
  return out;
}

// a binary heap on f
function push(h, x) {
  h.push(x);
  for (let i = h.length - 1; i > 0; ) {
    const p = (i - 1) >> 1;
    if (h[p].f <= h[i].f) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}
function pop(h) {
  const top = h[0],
    last = h.pop();
  if (h.length) {
    h[0] = last;
    for (let i = 0; ; ) {
      const l = 2 * i + 1,
        r = l + 1;
      let m = i;
      if (l < h.length && h[l].f < h[m].f) m = l;
      if (r < h.length && h[r].f < h[m].f) m = r;
      if (m === i) break;
      [h[m], h[i]] = [h[i], h[m]];
      i = m;
    }
  }
  return top;
}
