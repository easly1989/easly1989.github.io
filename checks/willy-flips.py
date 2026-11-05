"""Willy never flips: on the desk, on the books and the pager he walks over, and across their edges,
his body turns no further between two frames than a cat can, and he leans no further than the
step under his paws asks. First a sweep on the review page, frame by frame at 60 fps: in the middle
of each low thing on the desk and at the middle of each of its edges, facing along it and across
it, he turns on the spot both ways, lies down and gets up, sits and gets up, sleeps and wakes, and
walks over the edge and back. The sweep is the gate. Then the room as a reader sees it, on a clock
that moves 1/60 s with every frame however long the frame takes, for LIFE seconds of it (or the
first argument), watched on every frame: whether he comes upon a book there is chance, and a
browser too slow to show that much of it in four times as long is too slow to judge. Headless;
about five minutes."""
import json
import sys
import time

from cdp import Browser
from serve import serve

LIFE = int(sys.argv[1]) if len(sys.argv) > 1 else 90  # s of the room, on its clock
# degrees his body may turn between two frames: a flip went 70 to 170; the most a clip of his does
# is the start of a jump, its first frame already crouched, about 35
BODY = 45
LEAN = 35  # degrees he may lean: the highest thing he walks over (50 px) under half of him asks 30

# what a frame of him is: how far his body (the bone his spine starts from, in the room) turned
# since the frame before, how far he leans from the up of what he stands on, and whether he is
# anywhere at all
MEASURE = r"""
const THREE = await import("three");
const body = ROOM.willy, model = body.holder.children[0], spine = model.getObjectByName("Spine");
const deg = (r) => (r * 180) / Math.PI;
let was = null;
const measure = () => {
  body.holder.updateMatrixWorld(true);
  const q = spine.getWorldQuaternion(new THREE.Quaternion()), p = spine.getWorldPosition(new THREE.Vector3()), h = body.here();
  const up = new THREE.Vector3(0, 0, 1).applyQuaternion(body.holder.quaternion);
  const m = { lean: deg(Math.acos(Math.min(1, up.z))), turn: 0, ok: [q.x, q.y, q.z, q.w, p.x, p.y, p.z, ...h].every(Number.isFinite) };
  if (was) m.turn = deg(2 * Math.acos(Math.min(1, Math.abs(was.dot(q))))); // (q and -q are the same turn)
  was = q;
  return m;
};
const forget = () => (was = null);
const bad = (m) => !m.ok || m.turn > %(BODY)s || m.lean > %(LEAN)s;
const r1 = (n) => Math.round(n * 10) / 10;
""" % {"BODY": BODY, "LEAN": LEAN}

SWEEP = r"""(async () => {
  for (let i = 0; i < 300 && !(window.__review && ROOM.willy); i++) await new Promise((r) => setTimeout(r, 100));
  if (!window.__review) return { error: "no review page" };
  %s
  const { moves } = await import("./willy-moves.js");
  const { w, P } = __review;
  const M = moves(w, P, ROOM.surfaces);
  // the low things on the desk, each by its own box (a name twice gets its number)
  const lows = ROOM.lows().map((o, i, all) => ({ ...o, name: all.filter((p) => p.name === o.name).length > 1 ? o.name + " " + (i + 1) : o.name }));
  // time stands still between frames but for what the sweep moves on: a frame every 1/60 s
  const real = performance.now, step = 1000 / 60;
  let clock = real.call(performance);
  performance.now = () => clock;
  // (and his fur and the light pass left out while it runs: a frame of him is all it needs)
  const fur = body.fur.map((f) => [f, f.visible]), drawn = body.drawn;
  for (const [f] of fur) f.visible = false;
  body.drawn = null;
  const worst = { turn: 0, lean: 0 }, flips = [];
  let frames = 0, places = 0;
  const play = (show, where) => {
    const total = show.reduce((n, m) => n + m.dur, 0);
    forget();
    clock += 1000; // (his paws find the ground under them at once)
    for (let t = 0; t <= total; t += 1 / 60) {
      clock += step;
      const p = M.now(show, Math.min(t, total - 1e-6));
      M.pose(p);
      w.draw(0);
      const m = measure();
      frames++;
      for (const k of ["turn", "lean"]) worst[k] = Math.max(worst[k], m[k]);
      if (bad(m) && flips.length < 12) flips.push({ where, clip: p.clip, time: r1(p.time), x: r1(p.x), y: r1(p.y), h: r1(p.h), turn: r1(m.turn), lean: r1(m.lean) });
    }
  };
  try {
    for (const b of lows) {
      const mid = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
      // its middle, and the middle of each edge with the way across it (heading 0 along the room's
      // x, 90 towards the back)
      const edges = [[...mid, 0], [b.x0, mid[1], 0], [b.x1, mid[1], 0], [mid[0], b.y0, 90], [mid[0], b.y1, 90]];
      for (const [x, y, across] of edges)
        for (const h of [across, across + 90]) {
          places++;
          const at = [x, y, h], where = b.name + " " + [x, y, h].map(Math.round).join(",");
          const r = (h * Math.PI) / 180, off = (d) => [x + Math.cos(r) * d, y - Math.sin(r) * d, h];
          play([...M.turning(at, 180, "desk"), ...M.turning([x, y, h + 180], -135, "desk"), ...M.turning([x, y, h + 45], 45, "desk")], where);
          play([M.hold("lie", at, "desk"), M.hold("loaf", at, "desk", 0.5), M.hold("lie-from", at, "desk")], where);
          play([M.hold("sit", at, "desk"), M.hold("sit-idle", at, "desk"), M.hold("sit-from", at, "desk")], where);
          play([M.hold("sleep", at, "desk"), M.hold("sleep-idle", at, "desk"), M.hold("wake", at, "desk")], where);
          play(M.walking([off(-120), off(120), [...off(120).slice(0, 2), h + 180], [...off(-120).slice(0, 2), h + 180]], "desk"), where);
        }
    }
  } finally {
    performance.now = real;
    for (const [f, v] of fur) f.visible = v;
    body.drawn = drawn;
  }
  return { places, frames, lows: lows.map((o) => o.name), worst: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, r1(v)])), flips };
})()""" % MEASURE

# the room's clock, from its first script on: 1/60 s a frame, standing still in between, so that a
# frame of him is a sixtieth of a second however slowly this browser draws it
CLOCK = r"""(() => {
  const raf = window.requestAnimationFrame.bind(window);
  let clock = performance.now(), last = null;
  performance.now = () => clock;
  window.requestAnimationFrame = (cb) => raf((t) => {
    if (t !== last) { last = t; clock += 1000 / 60; }
    cb(clock);
  });
})()"""

# the room's own life, watched on every frame; the clip that shows, from three.js's own play()
LIFE_WATCH = r"""(async () => {
  for (let i = 0; i < 300 && !(window.ROOM && ROOM.willy); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(window.ROOM && ROOM.willy)) return "no Willy";
  %s
  let act = null;
  const play = THREE.AnimationAction.prototype.play;
  THREE.AnimationAction.prototype.play = function () {
    act = this;
    return play.call(this);
  };
  const L = (window.__flips = { frames: 0, s: 0, worst: { turn: 0, lean: 0 }, flips: [], clips: {} });
  const t0 = performance.now();
  let prev = null;
  (function tick() {
    const m = measure(), h = body.here(), clip = act ? act.getClip().name : "";
    const now = { clip, time: act ? r1(act.time) : 0, x: r1(h[0]), y: r1(h[1]), z: r1(h[2]), ground: Math.round(ROOM.ground(h[0], h[1], 0)) };
    L.frames++;
    L.s = r1((performance.now() - t0) / 1000);
    L.clips[clip] = (L.clips[clip] || 0) + 1;
    for (const k of ["turn", "lean"]) L.worst[k] = r1(Math.max(L.worst[k], m[k]));
    if (bad(m) && L.flips.length < 12) L.flips.push({ from: prev, to: now, turn: r1(m.turn), lean: r1(m.lean) });
    prev = now;
    requestAnimationFrame(tick);
  })();
  return "watching";
})()""" % MEASURE

failures = []
base = serve()
b = Browser(1500, 950)
try:
    b.size(1440, 900)
    # (motion on, whatever the system says: under reduced motion Willy sleeps where he starts)
    b.media(prefers_reduced_motion="no-preference")
    b.nav(base + "/index.html?room&review=idle", 3)
    t0 = time.time()
    s = b.js(SWEEP)
    if "error" in s:
        failures.append("sweep: " + s["error"])
        print("FAIL  " + failures[-1])
    else:
        w = s["worst"]
        what = f"sweep: {s['places']} places on and at the edges of {', '.join(s['lows'])}, {s['frames']} frames in {time.time() - t0:.0f} s: his body turns at most {w['turn']} degrees a frame, he leans at most {w['lean']}"
        ok = not s["flips"]
        print(("ok    " if ok else "FAIL  ") + what)
        if not ok:
            failures.append(what)
            for f in s["flips"]:
                print("        " + json.dumps(f))

    b.call("Page.addScriptToEvaluateOnNewDocument", source=CLOCK)
    b.nav(base + "/index.html?room", 2)
    print("      the room: " + b.js(LIFE_WATCH))
    t0 = time.time()
    while True:
        time.sleep(5)
        L = b.js("__flips")
        if L["s"] >= LIFE or L["flips"] or time.time() - t0 > 4 * LIFE:
            break
    w = L["worst"]
    seen = ", ".join(sorted(c for c in L["clips"] if c))
    what = f"the room, {L['s']} s of it in {time.time() - t0:.0f} s, {L['frames']} frames ({seen}): his body turns at most {w['turn']} degrees a frame, he leans at most {w['lean']}"
    if L["flips"]:
        failures.append(what)
        print("FAIL  " + what)
        for f in L["flips"]:
            print("        " + json.dumps(f))
    elif L["s"] < LIFE:
        print("slow  " + what + ": too slow to judge")
    else:
        print("ok    " + what)
finally:
    b.close()
sys.exit(1 if failures else 0)
