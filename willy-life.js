// What Willy does next, in the room (willy-room.js): one of his everyday actions, picked at random,
// weighted, among those he can do where he is, never the one he did last, and none again before
// its cooldown is up. The actions and their weights were the 2D cat's (the bench's cat, which he
// replaced), remapped to the room; the ones that need a prop or a toy come with those.
//
// An action's run(at) gives where he ends up and the show that takes him there, as moments
// (willy-moves.js), or null when it cannot be done this time (no room for it, say). A moment may
// carry cues for when it starts: say, [text, ms] in a bubble over his head; look, a point in the
// room, "reader", "around" (somewhere about him) or null; blink, s of a slow blink; twitch, an ear;
// act, something done to the room as it starts (the mouse knocked); line, what the live line says.
import { arc } from "./willy-paths.js";

// one of actions, or null: where, the surface he is on; now, s; ran, when each last ran, s;
// last, the one he did last; skip, those already tried this time that could not be done
export function pick(actions, { where, now, ran = {}, last = null, skip = new Set() }, rand = Math.random) {
  const can = actions.filter((a) => a.where.includes(where) && !skip.has(a.n) && !(a.cool && ran[a.n] != null && now - ran[a.n] < a.cool));
  const options = can.some((a) => a.n !== last) ? can.filter((a) => a.n !== last) : can;
  if (!options.length) return null;
  let r = rand() * options.reduce((n, a) => n + a.w, 0);
  for (const a of options) {
    if (r < a.w) return a;
    r -= a.w;
  }
  return options[options.length - 1];
}

// The old computer, as Willy knows it. Its monitor is warm while it is on and for WARM s after it
// went off (off, s, when it last did; null if it has not this visit).
export const WARM = 180;
export const warm = ({ on, off }, now) => on || (off != null && now - off < WARM);
// How far from the desk's front edge he sits there at most, px, his tail still over it.
export const EDGE_BY = 110;
// What his paws type on its keyboard: punctuation and the space bar only, so that nothing he
// types ever spells a word; in bursts, as a paw comes down and slides, n keys of them.
export const PAW_KEYS = ";'[],./\\=- ";
export const paws = (n, rand = Math.random) => [...Array(n)].map(() => PAW_KEYS[Math.floor(rand() * PAW_KEYS.length)]).join("");

// Knocking things off the desk (#72). Sitting, his paw sweeps across in front of him, PAW_AT px
// ahead (willy.js: the wrist of the paw that moves, in sit-paw-left and sit-paw-right, measured on
// the model): from SWEEP[0] px on one side of his middle to SWEEP[1] px on the other, a ball
// PAW px round (room-fall.js) pushing what it meets. So he sits beside a thing, side on to the
// edge, and each sweep moves it about TAP px towards the edge, until it goes over.
export const PAW_AT = 92;
export const SWEEP = [-22, 27];
export const PAW = 12;
export const TAP = SWEEP[1] - SWEEP[0] - 3; // (it starts 3 px clear of his paw)
// The edges he pushes from: the front one, towards the reader, and the left side; behind the desk
// is the wall, and on the right the chair, which nothing falls through (room-fall.js).
export const EDGES = {
  front: { n: [0, 1], at: (D) => D.y1 },
  left: { n: [-1, 0], at: (D) => -D.x0 },
};
const deg = (r) => (r * 180) / Math.PI;
// He cannot sit nearer the edge than about 60 px, so the sweep that takes a thing over is a
// flick: played FAST times as fast from SWIPE[0] s to SWIPE[1] s of the clip, and the thing,
// as his paw first touches it, sent off fast enough to slide over the edge (flickSpeed). He
// flicks it once a sweep would leave it no further than FLICK px from the edge.
export const FAST = 2.5;
export const SWIPE = [0.85, 2.1];
export const FLICK = 90;
// how fast (room px/s) a thing must go to slide d px on the desk and over its edge: measured in
// the room, a thing pushed at v slides about v * v / 7000 px (room-fall.js's friction)
export const flickSpeed = (d) => Math.round(Math.min(1700, Math.max(500, Math.sqrt(7000 * (d + 40)))));
// Where he sits to paw thing { x, y, hx, hy, yaw } towards the edge named, the paw that sweeps
// that way ("right": his right side to the edge, so his left paw sweeps; "left": the other) on
// the desk D, back px further from the edge than he would be (so his paw meets it later in its
// sweep, and moves it less): { x, y, heading, clip, falls, left }, falls whether this sweep is
// the flick that takes it over the edge, left how far its middle is from the edge now.
export function pawSpot(thing, edge, side, D, back = 0) {
  const { n, at } = EDGES[edge],
    c = Math.cos(thing.yaw),
    s = Math.sin(thing.yaw);
  // how far the thing reaches towards the edge from its middle
  const reach = thing.hx * Math.abs(c * n[0] + s * n[1]) + thing.hy * Math.abs(-s * n[0] + c * n[1]);
  // his heading: the edge on his right (his right is (sin h, cos h) in the room) or his left
  const h = side === "right" ? (Math.round(deg(Math.atan2(n[0], n[1]))) + 360) % 360 : (Math.round(deg(Math.atan2(-n[0], -n[1]))) + 360) % 360,
    r = (h * Math.PI) / 180,
    f = [Math.cos(r), -Math.sin(r)];
  // the thing's middle across him, towards the edge: its back just clear of where his paw starts
  const across = SWEEP[0] + PAW + 3 + reach + back;
  const x = Math.round(thing.x - PAW_AT * f[0] - across * n[0]),
    y = Math.round(thing.y - PAW_AT * f[1] - across * n[1]);
  const left = at(D) - (thing.x * n[0] + thing.y * n[1]);
  return { x, y, heading: h, clip: side === "right" ? "sit-paw-right" : "sit-paw-left", falls: left - TAP + back <= FLICK, left };
}
// the paw that moves in a clip, if it is one where he paws at something
export const PAWING = { "sit-paw-right": "left", "sit-paw-left": "right", "swat-left": "left", "swat-right": "right" };
// what each of the odds and ends is called, for the live line
const CALLED = { pencil: "pencil", eraser: "eraser", clip: "paper clip", coin: "coin", "bottle-cap": "bottle cap", "usb-stick": "USB stick", "rubber-band": "rubber band", "plant-leaf": "leaf" };
export const called = (e) => "the " + (CALLED[[...e.classList].find((k) => CALLED[k])] || "thing");
// at most this many things off the desk each visit; and how near the edge a thing must be
export const KNOCKS = 3;
export const NEAR_EDGE = 220;

// what the actions and the reactions are made of, for Willy w, his planner P and his moves M in a
// room of surfaces SURF, kept off the places avoid() names
function kit({ w, P, M, SURF, avoid = () => [], desk = null }) {
  const between = ([a, b]) => a + Math.random() * (b - a),
    one = (list) => list[Math.floor(Math.random() * list.length)],
    xyh = (s, p) => ({ surface: s, x: p[0], y: p[1], heading: p[2] }),
    here = (at) => [at.x, at.y, at.heading],
    fits = (to, clip) => w.fits(to.x, to.y, SURF[to.surface].z, to.heading, clip, { on: SURF[to.surface] }),
    // a place on the desk he can walk off from and turn all the way round in (at each of the
    // planner's 16 headings): one he could only walk into, nose first, is a pocket no route leaves
    free = (to) => fits(to, "walk") && [...Array(16).keys()].every((i) => fits({ ...to, heading: i * 22.5 }, "turn")),
    cue = (m, c) => Object.assign(m, c),
    hold = (clip, at, extra = 0, loop = false) => M.hold(clip, here(at), at.surface, extra, loop),
    // a clip held looping for about s seconds
    stay = (clip, at, s) => hold(clip, at, Math.max(0, s - M.dur(clip)), true);
  // whether to is clear of the places avoid() names, with room for him round it
  const AVOID_BY = 40;
  const clear = (to) => !avoid().some((r) => (r.surface || "desk") === to.surface && to.x > r.x0 - AVOID_BY && to.x < r.x1 + AVOID_BY && to.y > r.y0 - AVOID_BY && to.y < r.y1 + AVOID_BY);
  // somewhere free on the desk, at least far px from at
  function spot(at, clip = "idle", far = 200) {
    for (let n = 0; n < 30; n++) {
      const p = P.spot("desk", clip);
      const to = p && xyh("desk", p);
      if (to && clear(to) && free(to) && (at.surface !== "desk" || Math.hypot(to.x - at.x, to.y - at.y) >= far)) return to;
    }
    return null;
  }

  // Off the desk's front edge and out of the frame, for about s seconds, and back the same way:
  // he walks to the nearest stretch of the edge he can leap from, clear of the chair, leaps down
  // to the floor, trots out of the window, and later trots back, leaps up and lands where he
  // left. lines are what the live line says as he goes and as he is back. Or null.
  const FRONT_OUT = 260; // px past the edge he lands, on the floor
  async function leaving(at, s, lines, gait = "walk") {
    const D = SURF.desk,
      floor = window.ROOM.floor,
      H = 270; // facing the reader
    const edges = [];
    // (a grid's step back from the very edge: the planner ends a walk on its grid, up to 10 px
    // either way, willy-paths.js)
    const ok = (e) => fits(e, "walk") && fits(e, "idle") && clear(e);
    for (let x = D.x0 + 120; x <= D.x1 - 120; x += 40)
      for (let y = D.y1 - 60; y > D.y1 - 220; y -= 10) {
        const e = xyh("desk", [x, y - 20, H]);
        if (ok(xyh("desk", [x, y, H])) && ok(e)) {
          edges.push(e);
          break;
        }
      }
    const downFrom = (e) => ({ from: [e.x, e.y, 0], to: [e.x, D.y1 + FRONT_OUT, floor], h0: H, h1: H });
    // (clear air on the way down: the desk's legs, the chair; checked for every stretch before
    // any route is looked for, as most routes cost far more)
    const clearAir = (e) => {
      const down = downFrom(e);
      for (let f = 0.1; f < 0.96; f += 0.1) {
        const q = arc(down, f);
        if (!w.fits(q[0], q[1], q[2], H, "jump-air", { at: f, past: ["desk"] })) return false;
      }
      return w.fits(down.to[0], down.to[1], floor, H, "walk");
    };
    const near = edges.filter(clearAir).sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
    for (const e of near.slice(0, 6)) {
      const down = downFrom(e);
      // out of the window: on along the floor until all of him is below its bottom edge
      let out = down.to[1];
      while (out < down.to[1] + 3000 && window.ROOM.toScreen(e.x, out, floor + 200)[1] < innerHeight + 40) out += 50;
      const route = at.surface === e.surface && at.x === e.x && at.y === e.y ? [] : await M.go(at, e);
      if (!route) continue;
      const trot = (from, to, h) => floorTrot([e.x, from, h], [e.x, to, h], floor);
      const up = { from: [e.x, down.to[1], floor], to: [e.x, e.y, 0], h0: 90, h1: 90 };
      const leap = M.jumping(down),
        there = trot(down.to[1], out, H),
        gone = M.hold("idle", [e.x, out, H], "desk", Math.max(0, s - 2 * there.dur)),
        back = trot(out, down.to[1], 90),
        home = M.jumping(up);
      gone.at = ((g) => (t) => ({ ...g(t), z: floor }))(gone.at);
      if (lines[0]) cue(leap[0], { line: lines[0] });
      cue(home[2], { line: lines[1] });
      const to = xyh("desk", [e.x, e.y, 90]);
      return { to, moments: [...M.legs(route, gait), ...turnTo(e, H), ...leap, there, gone, back, ...home, stay("idle", to, 0.6)] };
    }
    return null;
  }
  // a turn on the spot to face h, if he is not facing it
  const turnTo = (at, h) => {
    const d = ((((h - at.heading + 180) % 360) + 360) % 360) - 180;
    return Math.abs(d) < 1 ? [] : M.turning(here(at), d, at.surface);
  };
  // a trot in a straight line on the floor, from [x, y, h] to [x, y]
  const floorTrot = (a, b, floor) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      SPEED = 250,
      STRIDE = 244.1,
      d = M.dur("trot");
    return { dur: len / SPEED, at: (t) => { const k = Math.min(1, t / (len / SPEED)); return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, z: floor, h: a[2], clip: "trot", time: ((len * k) / STRIDE * d) % d }; } };
  };
  // there from at, in that gait, and what he does there; or null
  async function going(at, to, gait, then) {
    const there = to && then(to),
      route = there && (await M.go(at, to));
    return route ? { to, moments: [...M.legs(route, gait), ...there] } : null;
  }
  const done = (at, moments) => (moments ? { to: at, moments } : null);
  const ease = (k) => k * k * (3 - 2 * k);
  // a clip played while he shifts from a to b, slowly at both ends
  const sliding = (clip, a, b) => {
    const m = hold(clip, a);
    return { dur: m.dur, at: (t) => ({ ...m.at(t), x: a.x + (b.x - a.x) * ease(t / m.dur), y: a.y + (b.y - a.y) * ease(t / m.dur) }) };
  };
  // the spots near at, facing the same way, nearest first: the cushion is too shallow to sit or
  // lie on where he lands in its middle
  const NEAR = [];
  for (let dx = -60; dx <= 60; dx += 10) for (let dy = -90; dy <= 90; dy++) NEAR.push([dx, dy]); // (lying to knead fits in a strip 1 px deep)
  NEAR.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  // settling down in clips (the first sits or lies him down, the last gets him up), staying down
  // in each of those between, { clip, s, cue }, for about s: where he is, if he fits; else, on the
  // cushion, the nearest spot he does, shifting there as he settles, as a cat flops onto its
  // side, and back as he gets up, to where he landed, where he leaps down from; or null
  function settled(at, [down, ...rest]) {
    const up = rest.pop(),
      fit = (to) => [down, ...rest.map((m) => m.clip), up].every((c) => fits(to, c)),
      to = (at.surface === "perch" || at.surface === "top" ? NEAR : [[0, 0]]).map(([dx, dy]) => ({ ...at, x: at.x + dx, y: at.y + dy })).find(fit);
    // (and once he has lain down, a little of his fur where he lies)
    const sheds = desk && /^(lie|sleep)$/.test(down);
    return to ? [sliding(down, at, to), ...rest.map((m, i) => cue(stay(m.clip, to, m.s), { ...(m.cue || {}), ...(sheds && i === 0 ? { act: () => (m.cue?.act?.(), desk?.fur?.(to)) } : {}) })), sliding(up, to, at)] : null;
  }
  const sitting = (at, s, c = {}) => settled(at, ["sit", { clip: "sit-idle", s, cue: c }, "sit-from"]);

  return { between, one, xyh, here, fits, free, cue, hold, stay, spot, going, done, sitting, settled, clear, leaving, turnTo };
}

// the actions, for Willy w, his planner P and his moves M in a room of surfaces SURF; avoid()
// names the places on the desk he does not go to now (willy-room.js: an object the reader points
// at or has focused)
export function everyday({ w, P, M, SURF, avoid, pc = null, desk = null }) {
  const { between, one, xyh, here, fits, free, cue, hold, stay, spot, going, done, sitting, settled, clear, leaving } = kit({ w, P, M, SURF, avoid, desk });
  // a part of a clip, from t0 s to t1 s of it, at at, played k times as fast
  const part = (clip, at, t0, t1, k = 1) => {
    const m = hold(clip, at);
    return { dur: (t1 - t0) / k, at: (t) => m.at(t0 + t * k) };
  };
  const D = SURF.desk;

  // Knocking a thing off, a sweep of his paw at a time: he sits beside it, side on to the edge
  // it is nearest, and paws it towards the edge; until it goes over he gets up, steps after it
  // and paws again (again: willy-room.js runs this next, before anything else), four times at
  // most. Before the sweep that takes it over he often looks at the reader first. desk (willy-
  // room.js) has the things, where each lies, how many have fallen this visit, and the line to
  // say once the one he aims at falls (room-fall.js tells it).
  let aim = null; // { el, taps }
  // (the planner ends a walk on a grid of STEP px laid from where he starts: willy-paths.js)
  const STEP = 20,
    snap = (v, o) => o + Math.round((v - o) / STEP) * STEP,
    ahead = (h) => [Math.cos((h * Math.PI) / 180), -Math.sin((h * Math.PI) / 180)],
    toward = (a, b) => (Math.round(deg(Math.atan2(-(b[1] - a[1]), b[0] - a[0]))) + 360) % 360,
    turnOf = (a, b) => ((((b - a + 180) % 360) + 360) % 360) - 180;
  // whether he can walk straight from a to b ([x, y, heading]), his heading going from a's to b's
  const straight = (a, b) => [...Array(11).keys()].every((i) => w.fits(a[0] + ((b[0] - a[0]) * i) / 10, a[1] + ((b[1] - a[1]) * i) / 10, D.z, a[2] + (turnOf(a[2], b[2]) * i) / 10, "walk", { on: D }));
  // to, by the edge (n, the way out over it), from at, and then: too near the edge to turn round
  // in, it is walked into the way he faces there, from a little back and away from the edge
  // (on the planner's grid, so that the route ends just there), where he can; or null
  async function edgeward(at, to, n, then) {
    const there = then(to);
    if (!there) return null;
    const direct = await M.go(at, to);
    if (direct) return { to, moments: [...M.legs(direct, "walk"), ...there] };
    const f = ahead(to.heading);
    for (const [back, away] of [[80, 40], [110, 60], [160, 40], [120, 80], [200, 60]]) {
      const x = snap(to.x - back * f[0] - away * n[0], at.x),
        y = snap(to.y - back * f[1] - away * n[1], at.y),
        h = toward([x, y], [to.x, to.y]);
      if (!straight([x, y, h], [to.x, to.y, to.heading])) continue;
      const route = await M.go(at, xyh("desk", [x, y, h]));
      if (route) return { to, moments: [...M.legs(route, "walk"), ...M.walking([[x, y, h], [to.x, to.y, to.heading]], "desk"), ...there] };
    }
    return null;
  }
  // and from there, up again, a few steps on the way he faces and away from the edge: to
  // somewhere he can turn round in, for whatever he does next, the nearest; else walked to
  // somewhere free; or null
  const OFF = [60, 100, 140, 180, 240, 300].flatMap((on) => [40, 80, 110, 140, 170, 200].map((away) => [on, away])).sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  async function edgeOff(to, n) {
    const f = ahead(to.heading);
    for (const [on, away] of OFF) {
      const x = Math.round(to.x + on * f[0] - away * n[0]),
        y = Math.round(to.y + on * f[1] - away * n[1]),
        h = toward([to.x, to.y], [x, y]),
        off = xyh("desk", [x, y, h]);
      if (clear(off) && free(off) && straight([to.x, to.y, to.heading], [x, y, h])) return { off, moments: M.walking([[to.x, to.y, to.heading], [x, y, h]], "desk") };
    }
    for (let k = 0; k < 4; k++) {
      const off = spot(to, "idle", 120),
        route = off && (await M.go(to, off));
      if (route) return { off, moments: M.legs(route, "walk") };
    }
    return null;
  }
  const lying = (p) => p && !p.fell && p.still && p.z > -2 && p.z < 16;
  async function knock(at) {
    if (!desk || desk.fallen() >= KNOCKS) return (aim = null);
    const tries = [];
    for (const el of aim && aim.el.isConnected ? [aim.el] : desk.things()) {
      const p = desk.where(el);
      if (!lying(p)) continue;
      for (const edge of Object.keys(EDGES)) {
        const { n, at: edgeAt } = EDGES[edge],
          left = edgeAt(D) - (p.x * n[0] + p.y * n[1]);
        if (left < 0 || left > NEAR_EDGE || (edge === "front" && desk.byChair(p.x))) continue;
        // (from where his paw meets it soonest; else, near the edge, from further back)
        for (const side of ["right", "left"]) tries.push({ el, p, n, spots: [0, 10, 20, 30].map((back) => pawSpot(p, edge, side, D, back)) });
      }
    }
    // (the nearest first, each way round in turn at random)
    tries.sort((a, b) => Math.hypot(a.spots[0].x - at.x, a.spots[0].y - at.y) - Math.hypot(b.spots[0].x - at.x, b.spots[0].y - at.y) + (Math.random() - 0.5) * 80);
    for (const { el, p, n, spots } of tries.slice(0, 10)) {
      for (const s of spots) {
        const to = xyh("desk", [s.x, s.y, s.heading]);
        if (!clear(to) || ![s.clip, "walk", "idle", "sit", "sit-idle", "sit-from"].every((c) => fits(to, c))) continue;
        const up = await edgeOff(to, n);
        if (!up) continue;
        const it = [p.x, p.y, 0],
          look = s.falls && Math.random() < 0.5,
          line = "Willy " + (look ? "looks at you, then pushes " : "pushes ") + called(el) + " off the desk.",
          d = M.dur(s.clip);
        // sitting down beside it, looking at it (or, before the flick, often at the reader),
        // pawing it, the last time a flick, and watching where it went
        const sweep = s.falls ? [part(s.clip, to, 0, SWIPE[0]), part(s.clip, to, SWIPE[0], SWIPE[1], FAST), part(s.clip, to, SWIPE[1], d)] : [part(s.clip, to, 0, d)];
        cue(sweep[0], { look: it, act: () => desk.aim(el, line, s.falls && [n[0] * flickSpeed(s.left), n[1] * flickSpeed(s.left), 60]) });
        const r = await edgeward(at, to, n, (to) => [
          hold("sit", to),
          look ? cue(stay("sit-idle", to, between([1.6, 2.4])), { look: "reader" }) : cue(stay("sit-idle", to, between([0.5, 1.2])), { look: it }),
          ...sweep,
          // (and after it, over the edge, where it went)
          cue(stay("sit-idle", to, between([0.8, 1.6])), { look: s.falls ? [p.x + n[0] * 250, p.y + n[1] * 250, -300] : it }),
          hold("sit-from", to),
          ...up.moments,
        ]);
        if (!r) continue;
        const taps = aim && aim.el === el ? aim.taps + 1 : 1;
        aim = s.falls || taps >= 4 ? null : { el, taps };
        return { to: up.off, moments: r.moments, again: aim ? "push something off" : null };
      }
    }
    return (aim = null);
  }

  // Tapping the mug or the jar: he walks up to it, rises a paw and pats it, and it wobbles; it
  // stays where it is (it is one of the projects).
  // (his paw, swatting, reaches 100 to 160 px ahead of him: he stands as near as he fits,
  // facing it, its middle no further than REACH px past its side)
  const REACH = 180;
  // up to a pot (desk.pots(): the mug or the jar), as near as he fits, facing it, and then
  // away from it again, with what he does there (moments(to, pot, c)); the clips named must
  // fit where he stands; or null
  // each place beside a pot he can stand at, facing it (the nearest first, each way round in turn at
  // random): { to, off, a, cx, cy }, where off is where he is walked straight back to from it
  function* stands(pot, need, reach = REACH) {
    const cx = (pot.x0 + pot.x1) / 2,
      cy = (pot.y0 + pot.y1) / 2,
      half = Math.max(pot.x1 - pot.x0, pot.y1 - pot.y0) / 2;
    const round = [...Array(16).keys()].map((i) => (i * Math.PI) / 8).sort(() => Math.random() - 0.5);
    for (const a of round) {
      const heading = Math.round((deg(a) + 180) % 360);
      for (const R of [...Array(Math.floor((reach - 60) / 10) + 1).keys()].map((i) => half + 60 + i * 10)) {
        const to = xyh("desk", [Math.round(cx + Math.cos(a) * R), Math.round(cy - Math.sin(a) * R), heading]);
        if (!clear(to) || !["walk", "idle", ...need].every((c) => fits(to, c))) continue;
        // he must be able to walk on from where he stands: the planner gives up on a place
        // that close to the pot, so he is walked straight back from it, away from the pot
        // (as at the desk's edge), and that is looked for first
        for (const away of [90, 140, 200]) {
          const x2 = Math.round(to.x + Math.cos(a) * away),
            y2 = Math.round(to.y - Math.sin(a) * away),
            h2 = toward([to.x, to.y], [x2, y2]),
            p = xyh("desk", [x2, y2, h2]);
          if (clear(p) && free(p) && straight([to.x, to.y, to.heading], [x2, y2, h2])) {
            yield { to, off: { p, moments: M.walking([[to.x, to.y, to.heading], [x2, y2, h2]], "desk") }, cx, cy, a };
            break;
          }
        }
      }
    }
  }
  // the first places to stand beside a thing at cx, cy, half px across (up to three; willy-toys.js puts a toy,
  // and a treat, only where there is one he can walk to)
  const canStand = (cx, cy, half, need, reach) => {
    const out = [];
    for (const s of stands({ x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half }, need, reach)) if (out.push(s) >= 3) break;
    return out;
  };
  async function atPot(at, pots, need, moments, reach = REACH, tries = Infinity) {
    if (!desk) return null;
    for (const pot of pots.sort(() => Math.random() - 0.5)) {
      let n = 0;
      const failed = {};
      for (const { to, off, cx, cy, a } of stands(pot, need, reach)) {
        // (the toys' actions, with a number of tries, give up on a place after that many, and on a way round the pot
        // after two: a walk that cannot be found takes a while to give up; the others try them all)
        if (n >= tries) break;
        if (tries < Infinity && failed[a] >= 2) continue;
        n++;
        const r = await going(at, to, "walk", (to) => moments(to, pot, { cx, cy, x: to.x, y: to.y }));
        if (r) return { to: off.p, moments: [...r.moments, ...off.moments] };
        failed[a] = (failed[a] || 0) + 1;
      }
    }
    return null;
  }
  const tap = (at) =>
    desk &&
    atPot(at, desk.pots(), [], (to, pot, { cx, cy, x, y }) => {
      const clip = one(["swat-left", "swat-right"]),
        hit = 0.62; // (s into the swat, as the paw comes down on it)
      return [
        cue(stay("idle", to, between([0.6, 1.2])), { look: [cx, cy, 60] }),
        part(clip, to, 0, hit),
        cue(part(clip, to, hit, M.dur(clip)), { act: () => desk.wobble(pot.el, [cx - x, cy - y]), line: "Willy taps the " + pot.name + ". It wobbles." }),
        cue(stay("idle", to, between([1, 1.8])), { look: [cx, cy, 60] }),
      ];
    });
  // The mug: he sniffs it and dips his face in it (the jar he only taps).
  const sniff = (at) =>
    desk &&
    atPot(at, desk.pots().filter((p) => p.name === "mug"), ["drink"], (to, pot, { cx, cy }) => [
      cue(stay("idle", to, between([0.6, 1.2])), { look: [cx, cy, 110] }),
      cue(hold("drink", to), { look: [cx, cy, 110], line: "Willy sniffs the mug, and dips his face in it." }),
      cue(stay("idle", to, between([0.8, 1.4])), { look: [cx, cy, 110] }),
    ], 180);

  // What he does with the room's other props (ROOM.props(): boxes by kind), each found when it is
  // wanted: on a book (it is low, he stands on its top) he paws at a page, or lies down; he lies
  // against the camera; by day he naps where the sun falls on the desk; and from the shelf he
  // stares at the neon sign.
  // and from there a few steps straight on, away from it, to somewhere he can turn round in: the
  // planner gives up on a place that close to a prop; { p, moments }, or null
  function stepAway(to, angles = [...Array(16).keys()].map((i) => (i * Math.PI) / 8).sort(() => Math.random() - 0.5)) {
    for (const a of angles)
      for (const away of [90, 140, 200]) {
        const x2 = Math.round(to.x + Math.cos(a) * away),
          y2 = Math.round(to.y - Math.sin(a) * away),
          h2 = toward([to.x, to.y], [x2, y2]),
          p = xyh("desk", [x2, y2, h2]);
        if (clear(p) && free(p) && straight([to.x, to.y, to.heading], [x2, y2, h2])) return { p, moments: M.walking([[to.x, to.y, to.heading], [x2, y2, h2]], "desk") };
      }
    return null;
  }
  const thenAway = (r, off) => r && { to: off.p, moments: [...r.moments, ...off.moments] };
  let props = null;
  const prop = (k) => (props ||= window.ROOM.props())[k];
  const BOOKS = { ledger: "the CloudBank ledger", agenda: "the Nutreek agenda" };
  const shuffled = (list) => [...list].sort(() => Math.random() - 0.5);
  async function onBook(at, clips, then) {
    for (const k of shuffled(Object.keys(BOOKS))) {
      const b = prop(k);
      if (!b) continue;
      for (const h of shuffled([0, 90, 180, 270])) {
        const to = xyh("desk", [Math.round((b.x0 + b.x1) / 2), Math.round((b.y0 + b.y1) / 2), h]);
        if (!clear(to) || !["walk", ...clips].every((c) => fits(to, c))) continue;
        const off = stepAway(to);
        if (!off) continue;
        const r = thenAway(await going(at, to, "walk", (to) => then(to, BOOKS[k])), off);
        if (r) return r;
      }
    }
    return null;
  }
  const pawAtAPage = (at) => {
    const clip = one(["sit-paw-left", "sit-paw-right"]);
    return onBook(at, ["sit", "sit-from", clip], (to, name) => [hold("sit", to), cue(hold(clip, to), { line: "Willy paws at a page of " + name + "." }), stay("sit-idle", to, between([1, 2])), hold("sit-from", to)]);
  };
  const lieOnABook = (at) => onBook(at, ["lie", "loaf", "lie-from"], (to) => settled(to, ["lie", { clip: "loaf", s: between([8, 16]) }, "lie-from"]));
  async function againstTheCamera(at) {
    const c = prop("camera");
    if (!c) return null;
    const cx = (c.x0 + c.x1) / 2,
      cy = (c.y0 + c.y1) / 2;
    // (along its side, his back to it, as near as he fits lying down: that takes about 90 px
    // across, and more to roll onto his side)
    const sides = (g) => [[c.x1 + g, cy, 90], [c.x1 + g, cy, 270], [c.x0 - g, cy, 90], [c.x0 - g, cy, 270], [cx, c.y1 + g, 0], [cx, c.y1 + g, 180], [cx, c.y0 - g, 0], [cx, c.y0 - g, 180]];
    for (const [x, y, h] of [55, 80, 105, 130].flatMap((g) => shuffled(sides(g)))) {
      const to = xyh("desk", [Math.round(x), Math.round(y), h]);
      if (!clear(to) || !["walk", "lie", "loaf", "lie-from"].every((k) => fits(to, k))) continue;
      // (away from the camera, then)
      const off = stepAway(to, [Math.atan2(-(to.y - cy), to.x - cx)]) || stepAway(to);
      const m = off && settled(to, ["lie", { clip: "loaf", s: between([8, 16]) }, "lie-from"]);
      const r = m && thenAway(await going(at, to, "walk", () => [cue(m[0], { line: "Willy lies down against the camera." }), ...m.slice(1)]), off);
      if (r) return r;
    }
    return null;
  }
  async function inTheSun(at) {
    // (the window's light is the sun's: by day, and strong enough to throw a patch)
    const sun = window.ROOM.lights().find((l) => l.name === "window");
    if (!sun || !sun.day || sun.power < 0.1) return null;
    const D = SURF.desk;
    for (let n = 0; n < 80; n++) {
      const to = xyh("desk", [Math.round(between([D.x0 + 100, D.x1 - 100])), Math.round(between([D.y0 + 60, D.y1 - 200])), one([0, 90, 180, 270])]);
      if (!window.ROOM.moonlit(to.x, to.y, 0) || !clear(to) || !free(to)) continue;
      const m = settled(to, ["sleep", { clip: "sleep-idle", s: between([15, 35]) }, "wake"]);
      const r = m && (await going(at, to, "walk", () => [cue(m[0], { line: "Willy naps in the sun." }), ...m.slice(1)]));
      if (r) return r;
    }
    return null;
  }
  async function atTheNeon(at) {
    const n = prop("nav"),
      hop = P.hops("desk", "shelf")[0],
      to = n && hop && xyh("shelf", [hop.to[0], hop.to[1], hop.h1]);
    return to && going(at, to, "walk", (to) => [cue(stay("idle", to, between([4, 8])), { look: [(n.x0 + n.x1) / 2, (n.y0 + n.y1) / 2, (n.z0 + n.z1) / 2], line: "Willy stares up at the neon sign." })]);
  }

  // His box (ROOM.props().nest): he goes up to it from the side, hops over its wall into it, turned
  // to face the reader, and sits or lies in it a while, his head over the rim; then hops out the
  // way he came, and a few steps on. A hop is his own arc over the wall (the planner knows none so
  // high), from the clip he leaps from to the clip he lands from.
  const hopping = (a, b, apex, air = 0.55) => {
    const up = M.dur("jump-up"),
      land = M.dur("jump-land");
    return [
      { dur: up, at: (t) => ({ x: a.x, y: a.y, z: D.z, h: a.heading, clip: "jump-up", time: t }) },
      {
        dur: air,
        at: (t, f = t / air) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: D.z + 4 * apex * f * (1 - f), h: a.heading + turnOf(a.heading, b.heading) * f, clip: "jump-air", time: f * M.dur("jump-air") }),
      },
      { dur: land, at: (t) => ({ x: b.x, y: b.y, z: D.z, h: b.heading, clip: "jump-land", time: t }) },
    ];
  };
  // (not where a low thing lies: the hop and the walk on know no height but the desk's)
  const bare = (p) => window.ROOM.ground(p.x, p.y, 0) < 1;
  // Out of it from where he is inside it, if something cut his visit short there (the planner has
  // no way out of a box: he hops out over a wall, to the side he can stand at); or null
  async function leaveBox(at) {
    const n = prop("nest");
    if (!n) return null;
    for (const [side, y] of shuffled([-1, 1].flatMap((s) => [70, 40, 20].map((d) => [s, n.y1 - d])))) {
      const wall = side < 0 ? n.x0 : n.x1,
        out = (d, h) => xyh("desk", [Math.round(wall + side * d), Math.round(y), h]),
        land = out(120, (side < 0 ? 180 : 0)),
        gone = out(250, (side < 0 ? 180 : 0));
      if (!clear(gone) || !free(gone) || !bare(land) || !bare(gone)) continue;
      return {
        to: gone,
        moments: [stay("crouch", at, 0.6), ...hopping(at, land, 140), ...M.walking([[land.x, land.y, land.heading], [gone.x, gone.y, gone.heading]], "desk"), stay("idle", gone, 0.6)],
      };
    }
    return null;
  }
  async function inTheBox(at, sit) {
    const n = prop("nest"),
      I = n && n.inside;
    if (!I) return null;
    const cx = (I.x0 + I.x1) / 2,
      cy = (I.y0 + I.y1) / 2,
      rest = sit ? "sit-idle" : "loaf";
    // where he rests, in the middle of it as near as he fits, facing the reader
    let to = null;
    for (let r = 0; r <= 110 && !to; r += 10)
      for (let a = 0; a < 360 && !to; a += 30) {
        const p = xyh("desk", [Math.round(cx + Math.cos((a * Math.PI) / 180) * r), Math.round(cy + Math.sin((a * Math.PI) / 180) * r), 270]);
        if (fits(p, rest)) to = p;
      }
    if (!to) return null;
    // from the left of it or from the right, whichever he can stand at, towards its front, away from
    // the desk's back edge, which is too near to turn round in
    for (const [side, y] of shuffled([-1, 1].flatMap((s) => [70, 40, 20].map((d) => [s, n.y1 - d])))) {
      const h = side < 0 ? 0 : 180, // (towards it)
        wall = side < 0 ? n.x0 : n.x1,
        out = (d, h) => xyh("desk", [Math.round(wall + side * d), Math.round(y), h]);
      const from = out(170, h),
        gone = out(250, (h + 180) % 360),
        land = out(120, (h + 180) % 360);
      if (!clear(from) || !["walk", "idle", "crouch"].every((c) => fits(from, c)) || !clear(gone) || !free(gone) || !bare(land) || !bare(gone)) continue;
      const m = sit ? [hold("sit", to), stay("sit-idle", to, between([6, 14])), hold("sit-from", to)] : [hold("lie", to), stay("loaf", to, between([8, 16])), hold("lie-from", to)];
      const hopIn = hopping(from, to, 140);
      cue(hopIn[0], { line: "Willy hops into his box." });
      const r = await going(at, from, "walk", (from) => [
        cue(stay("idle", from, between([0.6, 1.2])), { look: [cx, cy, 60] }),
        stay("crouch", from, 0.6),
        ...hopIn,
        ...m,
        stay("crouch", to, 0.6),
        ...hopping(to, land, 140),
        ...M.walking([[land.x, land.y, land.heading], [gone.x, gone.y, gone.heading]], "desk"),
        stay("idle", gone, 0.6),
      ]);
      if (r) return { ...r, to: gone };
    }
    return null;
  }

  // A fly, by day: it comes in at the window, and about the room, and he stands where he is and
  // follows it with his eyes (willy-room.js, desk.fly), until it comes by in front of him, where he
  // swats at it and misses; it goes out at the window, and he looks after it.
  async function watchFly(at) {
    const sun = window.ROOM.lights().find((l) => l.name === "window"),
      win = prop("window"),
      clip = one(["swat-left", "swat-right"]);
    if (!desk || !win || !sun || !sun.day || sun.power < 0.1 || !fits(at, clip) || !fits(at, "idle")) return null;
    const f = ahead(at.heading),
      hit = 0.62, // (s into the swat, as the paw comes down)
      through = [(win.x0 + win.x1) / 2, win.y1 + 8, (win.z0 + win.z1) / 2],
      by = [at.x + f[0] * 130, at.y + f[1] * 130, 110], // (where it passes, in reach)
      side = one([-1, 1]),
      up = [by[0] + side * 260, by[1] + between([-120, 120]), 240];
    const points = [through, [(through[0] + by[0]) / 2 + side * 120, (through[1] + by[1]) / 2, 230], by, up, through],
      times = [0, 1.8, 3.6, 5, 8];
    const look = () => desk.fly.at();
    return done(at, [
      cue(stay("idle", at, times[2] - hit), { look, act: () => desk.fly.start(points, times), line: "Willy watches a fly." }),
      cue(part(clip, at, 0, hit), { look }),
      cue(part(clip, at, hit, M.dur(clip)), { look, line: "Willy swats at the fly and misses." }),
      cue(stay("idle", at, 4.2), { look }),
      cue(stay("idle", at, 1.2), { look: "window", act: () => desk.fly.stop() }),
    ]);
  }

  // His present: a leaf off the plant on the shelf. He goes up to the shelf, along it to the
  // plant, nuzzles it and pulls a leaf off, comes back down to the desk with it and puts it down
  // in front of him, and sits and looks at the reader. Then it is one of the odds and ends on the
  // desk: he may knock it off later. Once a visit.
  let gave = false;
  async function present(at) {
    if (!desk || gave || !SURF.shelf) return null;
    const plant = desk.plant();
    if (!plant) return null;
    // along the shelf, facing the plant, his mouth at its leaves
    const sh = SURF.shelf,
      x = Math.round((sh.x0 + sh.x1) / 2);
    // (the shelf is narrow, between the plant and the radio: where he lands on it or leaps down
    // from, if he can reach the plant from there; else as near it as he fits)
    const ys = [...P.hops("desk", "shelf").map((h) => h.to[1]), ...P.hops("shelf", "desk").map((h) => h.from[1]), ...[...Array(80).keys()].map((i) => plant.y + 110 + i * 2)];
    for (const y of ys.filter((y) => y > plant.y + 100 && y < plant.y + 270)) {
      const by = xyh("shelf", [x, Math.round(y), 90]);
      if (!["walk", "idle", "pet", "shake"].every((c) => fits(by, c))) continue;
      // and somewhere on the desk to put it down: a free spot, with room on the desk's own top
      // in front of him, clear of the books, towards the front of the desk and not behind the
      // computer, where the reader sees it
      let there; // (the way to him, up on the shelf, is the same for each of the places to put it down)
      for (let n = 0; n < 40; n++) {
        // (somewhere in the front of the desk, facing about the reader's way)
        const to = xyh("desk", [Math.round(between([D.x0 + 120, D.x1 - 120])), Math.round(between([D.y0 + (D.y1 - D.y0) * 0.65, D.y1 - 200])), one([240, 270, 300])]);
        if (!clear(to) || !free(to)) continue;
        const r0 = (to.heading * Math.PI) / 180,
          ahead = [to.x + Math.cos(r0) * 120, to.y - Math.sin(r0) * 120];
        if (ahead[0] < D.x0 + 40 || ahead[0] > D.x1 - 40 || ahead[1] < D.y0 + (D.y1 - D.y0) * 0.6 || ahead[1] > D.y1 - 40 || [[0, 0], [50, 0], [-50, 0], [0, 50], [0, -50]].some(([dx, dy]) => window.ROOM.ground(ahead[0] + dx, ahead[1] + dy, 0) > 0.5) || !desk.seen(ahead[0], ahead[1])) continue;
        if (!["eat", "sit", "sit-idle", "sit-from"].every((c) => fits(to, c))) continue;
        if (there === undefined) there = await going(at, by, "walk", (by) => [
          cue(stay("idle", by, between([0.8, 1.4])), { look: [plant.x, plant.y, plant.z] }),
          hold("pet", by),
          cue(hold("shake", by), { act: () => desk.leaf.take() }),
        ]);
        if (!there) break; // (the shelf cannot be reached from here: the next place along it)
        // (from where he cannot get back down, the next place along the shelf)
        const back = await M.go(by, to);
        if (!back) break;
        const e = M.dur("eat"),
          sit = sitting(to, between([2.5, 4]), { look: "reader" });
        if (!sit) continue;
        gave = true;
        return {
          to,
          moments: [
            ...there.moments,
            ...M.legs(back, "walk"),
            part("eat", to, 0, e * 0.45),
            cue(part("eat", to, e * 0.45, e), { act: () => desk.leaf.drop(), line: "Willy brings you a leaf." }),
            ...sit,
          ],
        };
      }
    }
    return null;
  }

  // His toys (willy-toys.js, #70-C): he goes up to one as near as he fits, facing it, and bats it (it shows
  // its effect) or, with the yarn, rolls onto his back beside it; and eats the treats the bag has spilled.
  // From the reader's press (willy-room.js) it is the toy they pressed (c.toy) that he plays with.
  const playable = (c, kinds) => (desk ? desk.toys.list().filter((t) => (c?.toy ? t.el === c.toy : !t.spot.busy) && (!kinds || kinds.includes(t.kind))) : []);
  const play = (at, c) =>
    atPot(at, playable(c), [], (to, t, { cx, cy }) => {
      const clip = one(["swat-left", "swat-right"]),
        hit = 0.62;
      return [
        cue(stay("idle", to, between([0.6, 1.2])), { look: [cx, cy, 40], line: "Willy notices the " + t.name + "." }),
        part(clip, to, 0, hit),
        cue(part(clip, to, hit, M.dur(clip)), { act: () => desk.toys.touch(t.spot), line: "Willy bats the " + t.name + "." }),
        cue(stay("idle", to, between([1, 1.8])), { look: [cx, cy, 40] }),
      ];
    }, REACH, 12);
  const rollWithYarn = (at, c) =>
    atPot(at, playable(c, ["yarn"]), ["lie", "roll-over", "lie-from"], (to, t, { cx, cy }) => {
      const roll = settled(to, ["lie", { clip: "roll-over", s: 0 }, "lie-from"]);
      if (!roll) return null;
      cue(roll[0], { act: () => desk.toys.touch(t.spot), line: "Willy rolls onto his back with the yarn." });
      return [cue(stay("idle", to, between([0.6, 1.2])), { look: [cx, cy, 30] }), ...roll, cue(stay("idle", to, between([0.8, 1.4])), { look: [cx, cy, 30] })];
    }, 300, 12); // (rolling over takes room: from further off)
  const eatTreat = (at) =>
    desk &&
    atPot(
      at,
      desk.toys.treats().map((t) => ({ name: "treat", el: t.el, x0: t.x - 12, x1: t.x + 12, y0: t.y - 7, y1: t.y + 7 })),
      ["eat"],
      (to, t, { cx, cy }) => {
        const d = M.dur("eat");
        return [cue(stay("idle", to, between([0.5, 1])), { look: [cx, cy, 0] }), part("eat", to, 0, d * 0.45), cue(part("eat", to, d * 0.45, d), { act: () => desk.toys.eat(t.el), line: "Willy eats a treat." }), stay("idle", to, between([0.6, 1.2]))];
      },
      240,
      12,
    );

  // The plant off the shelf: he goes up to it as he does for the leaf, along the shelf (too narrow
  // for a swat: a butt of his head, as he nuzzles it), and sends it towards the shelf's near end,
  // where it goes over (willy-room.js, desk.tipPlant, and room-fall.js) and falls to the desk. He
  // watches it, and comes back down. Once, while it stands on the shelf.
  async function knockPlant(at) {
    if (!desk || !SURF.shelf) return null;
    const plant = desk.plant();
    if (!plant) return null;
    const sh = SURF.shelf,
      x = Math.round((sh.x0 + sh.x1) / 2),
      butt = M.dur("pet");
    const ys = [...P.hops("desk", "shelf").map((h) => h.to[1]), ...P.hops("shelf", "desk").map((h) => h.from[1]), ...[...Array(80).keys()].map((i) => plant.y + 110 + i * 2)];
    for (const y of ys.filter((y) => y > plant.y + 100 && y < plant.y + 270)) {
      const by = xyh("shelf", [x, Math.round(y), 90]);
      if (!["walk", "idle", "pet"].every((k) => fits(by, k))) continue;
      // and down to the front of the desk afterwards, away from where it lands
      let to;
      for (let n = 0; n < 40 && !to; n++) {
        const p = xyh("desk", [Math.round(between([D.x0 + 120, D.x1 - 120])), Math.round(between([D.y0 + (D.y1 - D.y0) * 0.65, D.y1 - 200])), one([240, 270, 300])]);
        if (clear(p) && free(p)) to = p;
      }
      const there = to && (await going(at, by, "walk", (by) => [
        cue(stay("idle", by, between([0.8, 1.4])), { look: [plant.x, plant.y, plant.z] }),
        part("pet", by, 0, butt * 0.5),
        cue(part("pet", by, butt * 0.5, butt), { act: () => desk.tipPlant(), line: "Willy butts the plant off the shelf." }),
        cue(stay("idle", by, between([1.8, 2.6])), { look: [plant.x - 60, plant.y - 300, 0] }),
      ]));
      const back = there && (await M.go(by, to));
      if (back) return { to, moments: [...there.moments, ...M.legs(back, "walk")] };
    }
    return null;
  }

  const actions = [
    // his toys (#70-C)
    { n: "play with a toy", w: 3, cool: 120, where: ["desk"], run: play },
    { n: "roll with the yarn", w: 2, cool: 200, where: ["desk"], run: rollWithYarn },
    { n: "eat a treat", w: 4, cool: 60, where: ["desk"], run: eatTreat },
    // knocking things off, tapping the mug and the jar, and his present (#72)
    { n: "knock the plant off", w: 1, cool: 300, where: ["desk"], run: knockPlant },
    { n: "push something off", w: 2, cool: 180, where: ["desk"], run: knock },
    { n: "tap the mug", w: 2, cool: 150, where: ["desk"], run: tap },
    { n: "bring a leaf", w: 1, cool: 120, where: ["desk"], run: present },
    // his props (#70-E)
    { n: "sniff the mug", w: 2, cool: 200, where: ["desk"], run: sniff },
    { n: "paw at a page", w: 2, cool: 200, where: ["desk"], run: pawAtAPage },
    { n: "lie on a book", w: 3, cool: 150, where: ["desk"], run: lieOnABook },
    { n: "lie against the camera", w: 2, cool: 200, where: ["desk"], run: againstTheCamera },
    { n: "nap in the sun", w: 3, cool: 200, where: ["desk"], run: inTheSun },
    { n: "stare at the neon", w: 2, cool: 200, where: ["desk"], run: atTheNeon },
    { n: "watch a fly", w: 2, cool: 300, where: ["desk"], run: watchFly },
    { n: "sit in his box", w: 2, cool: 240, where: ["desk"], run: (at) => inTheBox(at, true) },
    { n: "lie in his box", w: 1, cool: 240, where: ["desk"], run: (at) => inTheBox(at, false) },
    // (not one he picks: the way out of it, when he is in it at the end of a show: willy-room.js)
    { n: "leave his box", w: 0, where: [], run: leaveBox },
    { n: "wander", w: 10, where: ["desk"], run: (at) => going(at, spot(at), "walk", (to) => [stay("idle", to, between([0.6, 1.5]))]) },
    { n: "trot", w: 4, where: ["desk"], run: (at) => going(at, spot(at, "sit"), "trot", (to) => sitting(to, between([1.5, 3]))) },
    {
      n: "sit and look around",
      w: 8,
      where: ["desk", "perch"],
      run: (at) => done(at, settled(at, ["sit", ...[0, 1, 2].map(() => ({ clip: "sit-idle", s: between([0.7, 1.6]), cue: { look: "around" } })), { clip: "sit-idle", s: 0.6, cue: { look: null } }, "sit-from"])),
    },
    { n: "loaf", w: 6, where: ["desk", "perch"], run: (at) => done(at, settled(at, ["lie", { clip: "loaf", s: between([6, 12]) }, "lie-from"])) },
    {
      n: "nap",
      w: 6,
      cool: 40,
      where: ["desk", "perch"],
      run: async (at) => {
        const nap = (to) => settled(to, ["sleep", { clip: "sleep-idle", s: between([18, 40]) }, "wake"]);
        if (at.surface === "perch") return done(at, nap(at));
        return going(at, spot(at, "sleep"), "walk", (to) => {
          const m = nap(to);
          return m && [...m, hold("stretch", to)];
        });
      },
    },
    // washing his face is grooming too
    ...[["groom", 7], ["wash face", 4]].map(([n, wt]) => ({ n, w: wt, where: ["desk", "perch"], run: (at) => done(at, settled(at, ["sit", { clip: "groom", s: 0 }, "sit-from"])) })),
    { n: "stretch", w: 5, where: ["desk"], run: (at) => done(at, [hold("stretch", at), stay("idle", at, 0.5)]) },
    { n: "yawn", w: 4, where: ["desk", "perch", "shelf"], run: (at) => done(at, [cue(hold("yawn", at), { say: ["*yawn*", 1300] })]) },
    { n: "slow blink", w: 4, where: ["desk", "perch"], run: (at) => done(at, sitting(at, 2.6, { look: "reader", blink: 1.3 })) },
    { n: "stare at nothing", w: 4, where: ["desk", "perch", "shelf"], run: (at) => done(at, [cue(stay("idle", at, between([2.5, 5])), { look: "around" }), cue(stay("idle", at, 0.3), { look: null })]) },
    {
      n: "chase its tail",
      w: 2,
      cool: 60,
      where: ["desk"],
      run: (at) => {
        const round = M.chasing(here(at), "desk");
        const clear = round.every((m) => [0, 0.5].every((k) => { const q = m.at(m.dur * k); return w.fits(q.x, q.y, SURF.desk.z, q.h, "chase", { on: SURF.desk }); }));
        const then = clear && sitting(at, 1.2, { say: ["…", 900] });
        return then ? done(at, [...round, ...then]) : null;
      },
    },
    {
      n: "zoomies",
      w: 2,
      cool: 70,
      where: ["desk"],
      run: async (at) => {
        const moments = [];
        let from = at;
        for (let i = 0; i < 4; i++) {
          const to = spot(from, "sit", 300);
          const route = to && (await M.go(from, to));
          if (!route) break;
          moments.push(...M.legs(route, "run"));
          from = to;
        }
        const then = moments.length && sitting(from, 1.5);
        return then ? { to: from, moments: [...moments, ...then] } : null;
      },
    },
    {
      n: "pounce on nothing",
      w: 3,
      where: ["desk"],
      run: (at) => {
        const r = (at.heading * Math.PI) / 180,
          ahead = (k) => [at.x + Math.cos(r) * 150 * k, at.y - Math.sin(r) * 150 * k];
        if (![0.5, 1].every((k) => w.fits(...ahead(k), SURF.desk.z, at.heading, "walk", { on: SURF.desk }))) return null;
        const to = xyh("desk", [...ahead(1), at.heading]);
        const then = clear(to) && sitting(to, 1);
        return then && { to, moments: [...M.pouncing(here(at), 150, "desk"), ...then] };
      },
    },
    {
      // the old mouse by the keyboard (ROOM.mouse): he creeps up to it, watches it, and pounces;
      // it slides off a little where he lands on it
      n: "knock the mouse about",
      w: 4,
      cool: 45,
      where: ["desk"],
      run: (at) => {
        const mouse = window.ROOM && window.ROOM.mouse;
        if (!mouse || !mouse.body) return null; // (no mouse drawn: room-mouse.js)
        const [mx, my, mz] = mouse.at();
        // landing as near it as he fits, so his paws come down on it
        const tries = [];
        for (const L of [230, 250, 270, 300]) {
          const round = [];
          for (const d of [120, 170, 220]) for (let i = 0; i < 16; i++) round.push([L + d, d, (i * Math.PI) / 8]);
          tries.push(...round.sort(() => Math.random() - 0.5));
        }
        for (const [D, d, a] of tries) {
          const heading = ((a * 180) / Math.PI + 180) % 360,
            from = xyh("desk", [mx + Math.cos(a) * D, my - Math.sin(a) * D, heading]),
            ahead = (k) => [from.x - Math.cos(a) * d * k, from.y + Math.sin(a) * d * k];
          // (where he waits need only take him walking up and crouching, not turning round)
          if (!fits(from, "walk") || !fits(from, "crouch")) continue;
          if (![0.5, 1].every((k) => w.fits(...ahead(k), SURF.desk.z, heading, "walk", { on: SURF.desk }))) continue;
          const land = xyh("desk", [...ahead(1), heading]),
            then = clear(land) && sitting(land, between([1.5, 2.5]));
          if (!then) continue;
          cue(then[0], { act: () => mouse.knock(heading), look: [mx, my, mz] });
          return going(at, from, "walk", (to) => {
            const leap = M.pouncing(here(to), d, "desk", between([1.2, 2.2]));
            cue(leap[0], { look: [mx, my, mz] });
            return [...leap, ...then];
          });
        }
        return null;
      },
    },
    // kneading is for soft things: the cushion under the window
    // (lying down, or standing, where there is no room to lie down and knead)
    {
      n: "knead",
      w: 3,
      where: ["perch"],
      run: (at) => {
        const prr = { say: ["prr", 1500] };
        return done(at, settled(at, ["lie", { clip: "knead-lie", s: between([3, 5]), cue: prr }, "lie-from"]) || (fits(at, "knead") && [cue(stay("knead", at, between([3, 5])), prr)]));
      },
    },
    { n: "sneeze", w: 2, where: ["desk", "perch", "shelf"], run: (at) => done(at, [cue(hold("shake", at), { say: ["tchi!", 900] })]) },
    { n: "meow at you", w: 3, where: ["desk", "perch"], run: (at) => done(at, sitting(at, 1.5, { look: "reader", say: [one(["mew", "mrrp?", "meow"]), 1200] })) },
    {
      n: "ear twitch",
      w: 3,
      where: ["desk", "perch"],
      run: (at) => done(at, settled(at, ["lie", ...[0, 1, 2].map(() => ({ clip: "loaf", s: between([0.9, 1.7]), cue: { twitch: true } })), "lie-from"])),
    },
    {
      n: "walk the line",
      w: 2,
      where: ["desk"],
      run: (at) => {
        // straight on along the mat's grid, slowly, as far as he can go
        const h = Math.round(at.heading / 90) * 90,
          r = (h * Math.PI) / 180;
        if (h !== at.heading && !fits(at, "turn")) return null;
        let d = 0;
        while (d < 400 && w.fits(at.x + Math.cos(r) * (d + 20), at.y - Math.sin(r) * (d + 20), SURF.desk.z, h, "walk", { on: SURF.desk })) d += 20;
        if (d < 160) return null;
        const to = xyh("desk", [at.x + Math.cos(r) * d, at.y - Math.sin(r) * d, h]);
        const then = clear(to) && sitting(to, 1.2);
        return then && { to, moments: [...M.walking([here(at), [at.x, at.y, h], here(to)], "desk", { d: 0 }, "sneak"), ...then] };
      },
    },
    // the room's own: up to the cushion under the window to sleep, up to the shelf to look
    // down, and back to the desk from either
    {
      n: "nap on the cushion",
      w: 20,
      where: ["desk"],
      run: async (at) => {
        // by whichever of the jumps lands him where he can lie down
        for (const hop of P.hops("desk", "perch")) {
          const to = xyh("perch", [hop.to[0], hop.to[1], hop.h1]),
            m = settled(to, ["sleep", { clip: "sleep-idle", s: between([15, 40]) }, "wake"]);
          if (m) return going(at, to, "walk", () => m);
        }
        return null;
      },
    },
    {
      n: "look from the shelf",
      w: 10,
      where: ["desk"],
      run: async (at) => {
        const hop = P.hops("desk", "shelf")[0];
        const to = hop && xyh("shelf", [hop.to[0], hop.to[1], hop.h1]);
        return to && going(at, to, "walk", (to) => [cue(stay("look-down", to, between([3, 7])), { look: "reader" })]);
      },
    },
    { n: "chatter at the birds", w: 3, where: ["perch"], run: (at) => done(at, settled(at, ["sit", { clip: "chatter", s: 0, cue: { look: "window", say: ["ek-ek-ek", 1600] } }, "sit-from"])) },
    { n: "back to the desk", w: 10, where: ["perch", "shelf", "top"], run: (at) => going(at, spot(at, "sit"), "walk", (to) => sitting(to, between([3, 8]))) },
    // now and then, off the desk's front edge and out of the frame a while, and back
    { n: "leave", w: 2, cool: 120, where: ["desk"], run: (at) => leaving(at, between([15, 35]), ["Willy leaves for a while.", "Willy is back."]) },
    // The computer and the desk's front edge (#71). On the keyboard he sits along it, and with
    // the computer on his paws type a little on its screen; on its top, while the monitor is
    // warm, he curls up and sleeps; behind it he is half hidden a while; at the front edge he
    // sits and looks at the reader.
    {
      n: "sit on the keyboard",
      w: 2,
      cool: 120,
      where: ["desk"],
      run: async (at) => {
        const k = pc && pc.keyboard();
        if (!k) return null;
        for (let n = 0; n < 60; n++) {
          const to = xyh("desk", [Math.round(between([k.x0 + 40, k.x1 - 40])), Math.round(between([k.y0 + 30, k.y1 - 30])), one([12, 192])]);
          if (!clear(to) || !["walk", "idle", "sit", "sit-idle", "sit-from", "knead"].every((c) => fits(to, c))) continue;
          const on = pc && pc.ready();
          const r = await going(at, to, "walk", (to) => {
            const s = sitting(to, between([4, 8]), { look: "reader" });
            if (!s) return null;
            if (!on) return [cue(s[0], { line: "Willy sits on the keyboard." }), ...s.slice(1)];
            // (standing, his paws coming down on the keys, then sitting on them)
            const tap = cue(stay("knead", to, between([2.5, 4])), { line: "Willy sits on the keyboard, and types.", act: () => pc.type(2.5) });
            return [tap, ...s];
          });
          if (r) return r;
        }
        return null;
      },
    },
    {
      n: "sleep on the warm monitor",
      w: 3,
      cool: 120,
      where: ["desk"],
      run: async (at) => {
        if (!pc || !pc.warm() || !SURF.top) return null;
        for (const hop of P.hops("desk", "top")) {
          const to = xyh("top", [hop.to[0], hop.to[1], hop.h1]);
          if (!clear(to)) continue;
          const m = settled(to, ["sleep", { clip: "sleep-idle", s: between([20, 45]) }, "wake"]);
          if (m) {
            cue(m[0], { line: "Willy curls up on the warm monitor." });
            const r = await going(at, to, "walk", () => m);
            if (r) return r;
          }
        }
        return null;
      },
    },
    {
      n: "behind the monitor",
      w: 1,
      cool: 120,
      where: ["desk"],
      run: async (at) => {
        const c = pc && pc.behind();
        if (!c) return null;
        for (let n = 0; n < 60; n++) {
          const to = xyh("desk", [Math.round(between([c.x0, c.x1])), Math.round(between([c.y0, c.y1])), one([0, 180, 270])]);
          if (!clear(to)) continue;
          const lie = settled(to, ["lie", { clip: "loaf", s: between([8, 15]), cue: { look: "reader", line: "Willy slips behind the monitor." } }, "lie-from"]);
          const m = lie || sitting(to, between([6, 10]), { look: "reader", line: "Willy slips behind the monitor." });
          const r = m && (await going(at, to, "sneak", () => m));
          if (r) return r;
        }
        return null;
      },
    },
    {
      n: "sit at the edge",
      w: 2,
      cool: 120,
      where: ["desk"],
      run: async (at) => {
        // (along the edge, his head turned to the reader: so his tail reaches over it; facing
        // the reader he could sit no nearer it than his tail is long)
        const D = SURF.desk,
          H = one([0, 180]);
        const edges = [];
        for (let x = D.x0 + 120; x <= D.x1 - 120; x += 40)
          // (his front paws at the edge: as near it as he fits, sitting, which is about this far)
          for (let y = D.y1 - 20; y >= D.y1 - 260; y -= 5) {
            const e = xyh("desk", [x, y, H]);
            const ok = (e) => clear(e) && ["walk", "idle", "sit", "sit-idle", "sit-from"].every((c) => fits(e, c));
            if (ok(e)) {
              // (a grid's half step back, where the planner may end his walk, willy-paths.js)
              const back = xyh("desk", [x, y - 10, H]);
              // (and no farther from it than his tail can still hang over)
              if (ok(back) && y >= D.y1 - EDGE_BY) edges.push(back);
              break;
            }
          }
        // (one of the nearer stretches; failing those, the farther ones)
        edges.sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
        for (const e of [...edges.slice(0, 10).sort(() => Math.random() - 0.5), ...edges.slice(10)].slice(0, 14)) {
          const r = await going(at, e, "walk", (to) => {
            const s = sitting(to, between([5, 10]), { look: "reader", tail: { y: D.y1, z: D.z } });
            return s && [cue(s[0], { line: "Willy sits at the edge of the desk." }), ...s.slice(1)];
          });
          if (r) return r;
        }
        return null;
      },
    },
  ];
  // (and, for willy-room.js, where a toy can be put: canStand)
  return Object.assign(actions, { canStand });
}

// Never in the way: what he does when the reader wants him elsewhere, each { to, moments } or
// null, from the pose p he was caught in at at (getting up first, if he is down). pestered a
// little, off to the free spot on the desk furthest from where he is; pestered a lot, off the
// front edge for half a minute; moved off, to the nearest free spot clear of what avoid() names,
// when the object he is on is pointed at or focused.
export function bothered({ w, P, M, SURF, avoid, objects = [] }) {
  const { between, xyh, hold, stay, spot, going, sitting, clear, leaving, free } = kit({ w, P, M, SURF, avoid });
  const UP = { sleep: "wake", lie: "lie-from", sit: "sit-from" };
  // getting up from how he was caught, as a moment, or none
  const up = (at, rest) => (rest && UP[rest] ? [hold(UP[rest], at)] : []);
  const after = (at, rest, r) => r && { to: r.to, moments: [...up(at, rest), ...r.moments] };
  return {
    async away(at, rest) {
      const far = [];
      for (let n = 0; n < 12; n++) {
        const to = spot(at, "sit", 300);
        if (to) far.push(to);
      }
      far.sort((a, b) => Math.hypot(b.x - at.x, b.y - at.y) - Math.hypot(a.x - at.x, a.y - at.y));
      for (const to of far.slice(0, 4)) {
        const r = await going(at, to, "trot", (to) => sitting(to, between([1.5, 3]), { look: "around" }));
        if (r) return after(at, rest, r);
      }
      return null;
    },
    async gone(at, rest) {
      return after(at, rest, await leaving(at, between([25, 35]), [null, "Willy is back."], "trot"));
    },
    async off(at, rest) {
      const near = [];
      for (let n = 0; n < 80 && near.length < 12; n++) {
        const p = P.spot("desk", "sit");
        const to = p && xyh("desk", p);
        // (and onto none of the others: he would only be in the way there)
        const then = to && clear(to) && !objects.some((r) => !r.surface && to.x >= r.x0 && to.x <= r.x1 && to.y >= r.y0 && to.y <= r.y1) && free(to) && sitting(to, between([2, 4]), { look: "reader" });
        if (then) near.push({ to, then });
      }
      near.sort((a, b) => Math.hypot(a.to.x - at.x, a.to.y - at.y) - Math.hypot(b.to.x - at.x, b.to.y - at.y));
      for (const { to, then } of near.slice(0, 8)) {
        const r = await going(at, to, "walk", () => then);
        if (r) return after(at, rest, r);
      }
      return null;
    },
    // (for the checks: to a spot on the box r, there to sit s seconds; or null)
    async visit(at, rest, r, s) {
      for (let n = 0; n < 200; n++) {
        const to = xyh("desk", [Math.round(r.x0 + Math.random() * (r.x1 - r.x0)), Math.round(r.y0 + Math.random() * (r.y1 - r.y0)), Math.round(Math.random() * 24) * 15]);
        const there = free(to) && sitting(to, s);
        const go = there && (await going(at, to, "walk", () => there));
        if (go) return after(at, rest, go);
      }
      return null;
    },
  };
}

// How he answers being petted: the click, or Enter on his button. One of fourteen reactions, picked
// at random, never the same twice running, and by where he is. pick()ed like an action, but a
// reaction with solo true is the only answer where its when() holds: on the cushion, asleep or lying
// down, he only opens one eye; on the shelf he turns and looks down. Peekaboo's, ducking behind the
// computer, comes with #71: a solo reaction with when: (c) => c.peekaboo, added to this list.
// Each carries line, what the live line says he did.
//
// run(at, ctx) is as an action's, but from wherever the show he was in had him: ctx.rest is "sleep"
// or "lie" when he is down, and ctx.fur(at) leaves a little fur on what he stands on.
export function reactions({ w, P, M, SURF }) {
  const { between, one, here, fits, cue, hold, stay, spot, going, done, sitting, settled } = kit({ w, P, M, SURF });
  // standing here a while, as he is: what he does from a moment he was caught in
  const idle = (at, s, c = {}) => cue(stay("idle", at, s), c);
  return [
    { n: "open one eye", w: 1, where: ["perch", "top"], solo: true, when: (c) => !!c.rest, line: "Willy opens one eye.", run: (at, c) => (fits(at, c.rest === "sleep" ? "sleep-idle" : "loaf") ? [cue(stay(c.rest === "sleep" ? "sleep-idle" : "loaf", at, 2.4), { blink: 1.8 })] : null) },
    { n: "look down", w: 1, where: ["shelf"], solo: true, line: "Willy turns and looks down at you.", run: (at) => (fits(at, "look-down") ? [cue(stay("look-down", at, between([3, 5])), { look: "reader" })] : null) },
    {
      n: "purr",
      w: 8,
      where: ["desk", "perch", "top"],
      line: "Willy purrs.",
      run: (at, c) => {
        const cues = { look: "reader", say: ["prrr", 1800] };
        return done(at, (c.rest && settled(at, ["lie", { clip: "pet-lie", s: between([2.5, 4]), cue: cues }, "lie-from"])) || settled(at, ["sit", { clip: "pet-sit", s: between([2.5, 4]), cue: cues }, "sit-from"]));
      },
    },
    { n: "meow at you", w: 6, where: ["desk", "perch"], line: "Willy meows at you.", run: (at) => done(at, sitting(at, 1.5, { look: "reader", say: [one(["mew", "mrrp?", "meow"]), 1200] })) },
    { n: "chirp", w: 5, where: ["desk", "perch"], line: "Willy chirps.", run: (at) => done(at, sitting(at, 1.2, { look: "reader", say: [one(["brrp!", "prrp?"]), 900], twitch: true })) },
    { n: "slow blink", w: 6, where: ["desk", "perch", "top"], line: "Willy gives you a slow blink.", run: (at) => done(at, sitting(at, 2.6, { look: "reader", blink: 1.3 })) },
    { n: "headbutt", w: 6, where: ["desk", "perch", "shelf"], line: "Willy headbutts your hand.", run: (at, c) => (!c.rest && fits(at, "pet") ? [cue(hold("pet", at), { look: "reader" }), idle(at, 0.3)] : null) },
    {
      n: "belly trap",
      w: 3,
      where: ["desk", "perch"],
      line: "Willy rolls onto his back. It's a trap.",
      run: (at) => {
        const roll = settled(at, ["lie", { clip: "roll-over", s: 0 }, "lie-from"]);
        return done(at, roll && [...roll, ...(fits(at, "swat-right") ? [cue(hold("swat-right", at), { look: "reader" })] : [])]);
      },
    },
    { n: "ignore you", w: 5, where: ["desk", "perch", "shelf", "top"], line: "Willy ignores you.", run: (at, c) => (c.rest ? null : [idle(at, between([2, 3.5]), { look: "around" }), idle(at, 0.3, { look: null })]) },
    {
      // (he stops first, so the walk's first step does not jump from the pose he was caught in)
      n: "walk off",
      w: 4,
      where: ["desk", "perch", "shelf"],
      line: "Willy walks off.",
      run: async (at, c) => {
        if (c.rest || !fits(at, "idle")) return null;
        const r = await going(at, spot(at), "walk", (to) => [stay("idle", to, between([0.6, 1.2]))]);
        return r && { to: r.to, moments: [idle(at, 0.35), ...r.moments] };
      },
    },
    { n: "pointed grooming", w: 5, where: ["desk", "perch"], line: "Willy grooms himself, pointedly.", run: (at) => done(at, settled(at, ["sit", { clip: "groom", s: between([3, 4.5]), cue: { look: "around" } }, "sit-from"])) },
    { n: "knead", w: 3, where: ["desk", "perch"], line: "Willy kneads.", run: (at, c) => (!c.rest && fits(at, "knead") ? [cue(stay("knead", at, between([2.5, 4])), { say: ["prr", 1500] })] : null) },
    { n: "yawn", w: 4, where: ["desk", "perch", "shelf", "top"], line: "Willy yawns.", run: (at, c) => (!c.rest && fits(at, "yawn") ? [cue(hold("yawn", at), { say: ["*yawn*", 1300] })] : null) },
    { n: "stare", w: 4, where: ["desk", "perch", "shelf", "top"], line: "Willy stares at you.", run: (at, c) => (c.rest ? null : [idle(at, between([2.5, 4]), { look: "reader" }), idle(at, 0.3, { look: null })]) },
    { n: "sneeze", w: 3, where: ["desk", "perch", "shelf"], line: "Willy sneezes.", run: (at, c) => (!c.rest && fits(at, "shake") ? [cue(hold("shake", at), { say: ["tchi!", 900] })] : null) },
    {
      n: "rub and leave fur",
      w: 4,
      where: ["desk", "perch"],
      line: "Willy rubs against you and leaves some fur.",
      run: (at, c) => (!c.rest && fits(at, "pet") ? [cue(hold("pet", at), { look: "reader" }), cue(hold("pet", at), { act: () => c.fur(at) }), idle(at, 0.3)] : null),
    },
  ];
}

// the reaction to give, from ctx (reactions()): among those where he is that can be done now, the
// solo ones alone where there are any; or null
export function react(list, ctx, state, rand = Math.random) {
  const here = list.filter((a) => a.where.includes(ctx.where) && !state.skip.has(a.n) && (!a.when || a.when(ctx)));
  return pick(here.some((a) => a.solo) ? here.filter((a) => a.solo) : here, { where: ctx.where, last: state.last, skip: state.skip }, rand);
}
