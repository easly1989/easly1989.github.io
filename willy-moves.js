// How Willy moves, for the room (willy-room.js) and the review page (willy-review.js) alike,
// so that the review shows what the reader sees. A show is a list of moments, each { dur, at(t) }
// where at gives where he is and what clip shows at what time of it: a route turned into
// moments, a clip held somewhere, and him put at a moment of a show.
import { arc, AIR } from "./willy-paths.js";

// each gait: px a second, and px of ground one of its cycles covers (cat-src/build.py prints
// those); a little under the clip's own pace, and the sneak slow, as stalking is
const GAITS = { walk: [95, 189.6], trot: [250, 244.1], run: [600, 510.1], sneak: [110, 211.5] };
const norm = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// w is Willy (willy.js), P his planner (willy-paths.js), surfaces the room's
export function moves(w, P, surfaces) {
  const SURF = Object.fromEntries(surfaces.map((s) => [s.name, s]));
  const dur = (clip) => w.clips[clip].getClip().duration;

  // a clip played at [x, y, heading] on s, and held as long again as extra; looped, if loop
  function hold(clip, [x, y, h], s, extra = 0, loop = false) {
    return { dur: dur(clip) + extra, at: (t) => ({ x, y, z: SURF[s].z, h, clip, time: loop ? t % dur(clip) : Math.min(t, dur(clip)) }) };
  }
  // a turn on the spot, as the model's own turns, of 90 and 45 degrees: the fewest that cover it,
  // what they turn too far made up by turning him back a little as the last one plays. A turn
  // turns him about where he stands, and the room turns him by as much once it ends.
  function turning([x, y, h], turn, s) {
    const sign = Math.sign(turn),
      side = sign > 0 ? "left" : "right",
      k = Math.ceil(Math.abs(turn) / 45 - 1e-6),
      over = 45 * k - Math.abs(turn);
    const steps = [...Array(k >> 1).fill("turn-" + side), ...(k & 1 ? ["turn-" + side + "-45"] : [])];
    let at = h;
    return steps.map((clip, i) => {
      const from = at,
        back = i === steps.length - 1 ? over : 0;
      at += sign * (clip.endsWith("-45") ? 45 : 90);
      return { dur: dur(clip), at: (t) => ({ x, y, z: SURF[s].z, h: from - sign * back * turned(clip, t / dur(clip)), clip, time: t }) };
    });
  }
  // how far round a turn has taken him, 0 to 1, at that part of it: at its own pace, which
  // eases in and out
  function turned(clip, f) {
    const m = w.size[clip].moments,
      x = f * (m.length - 1),
      i = Math.min(m.length - 2, Math.floor(x));
    return Math.abs(m[i].yaw + (m[i + 1].yaw - m[i].yaw) * (x - i)) / Math.abs(m[m.length - 1].yaw || 1);
  }
  // a walk's points as moments, in that gait, the feet paced by the ground covered (and by
  // turning)
  function walking(pts, s, gone = { d: 0 }, gait = "walk") {
    const [SPEED, STRIDE] = GAITS[gait],
      out = [];
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        turn = norm(b[2] - a[2]);
      if (!len) {
        out.push(...turning(a, turn, s));
        continue;
      }
      const d0 = gone.d,
        dd = len;
      gone.d += dd;
      out.push({
        dur: len / SPEED,
        at: (t, k = t / (len / SPEED)) => ({ x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, z: SURF[s].z, h: a[2] + turn * k, clip: gait, time: (((d0 + dd * k) / STRIDE) * dur(gait)) % dur(gait) }),
      });
    }
    return out;
  }
  function jumping(j) {
    const up = dur("jump-up"),
      land = dur("jump-land");
    return [
      { dur: up, at: (t) => ({ x: j.from[0], y: j.from[1], z: j.from[2], h: j.h0, clip: "jump-up", time: t }) },
      { dur: AIR, at: (t) => { const p = arc(j, t / AIR); return { x: p[0], y: p[1], z: p[2], h: p[3], clip: "jump-air", time: (t / AIR) * dur("jump-air") }; } },
      { dur: land, at: (t) => ({ x: j.to[0], y: j.to[1], z: j.to[2], h: j.h1, clip: "jump-land", time: t }) },
    ];
  }
  // a pounce: low and watching a while, the tail sweeping, then a short low leap d px straight
  // ahead (the jump starts as low as the crouch ends)
  function pouncing([x, y, h], d, s, watch = 1.5) {
    const z = SURF[s].z,
      r = (h * Math.PI) / 180;
    const j = { from: [x, y, z], to: [x + Math.cos(r) * d, y - Math.sin(r) * d, z], h0: h, h1: h };
    return [hold("crouch", [x, y, h], s, watch, true), ...jumping(j)];
  }
  // a route's legs as moments, walking in that gait
  function legs(route, gait = "walk") {
    const gone = { d: 0 };
    return route.flatMap((l) => (l.walk ? walking(l.walk, l.surface, gone, gait) : jumping(l.jump)));
  }
  // a route from { surface, x, y, heading } to another, with each walk told the surface it is
  // on; or null
  async function go(from, to) {
    const r = await P.route(from, to);
    if (!r) return null;
    let s = from.surface;
    return r.map((l) => (l.jump ? ((s = l.jump.b), l) : { ...l, surface: s }));
  }
  // where he is and how, t seconds into a show, looping it
  function now(moments, t) {
    const total = moments.reduce((n, m) => n + m.dur, 0);
    let s = t % total;
    for (const m of moments) {
      if (s <= m.dur) return m.at(s);
      s -= m.dur;
    }
    const m = moments[moments.length - 1];
    return m.at(m.dur);
  }
  // the height of the highest surface under x, y that is no higher than z
  const under = (x, y, z) => Math.max(0, ...surfaces.filter((s) => s.z <= z && x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1).map((s) => s.z));
  // him at a moment of a show: in his place (his root riding above the arc in the air, his
  // shadow on what is under him), and every clip set to its moment by hand
  function pose(p) {
    if (p.clip === "jump-air") {
      const g = under(p.x, p.y, p.z);
      w.place(p.x, p.y, p.z + w.lift(p.time / dur(p.clip)), p.h, { z: g, by: p.z - g });
    } else w.place(p.x, p.y, p.z, p.h);
    for (const [n, a] of Object.entries(w.clips)) if (n !== p.clip) a.stop();
    const a = w.clips[p.clip];
    a.play();
    a.paused = true;
    a.time = Math.min(p.time, dur(p.clip));
  }

  return { dur, hold, turning, walking, jumping, pouncing, legs, go, now, pose };
}
