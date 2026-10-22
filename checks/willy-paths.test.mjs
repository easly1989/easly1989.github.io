// node checks/willy-paths.test.mjs: Willy's ways round a made-up room, with no page. He is a
// box 120 x 40; a wall stands across the desk with a gap at its back; a perch is up behind.
import assert from "node:assert/strict";
import { planner, arc } from "../willy-paths.js";

const desk = { name: "desk", z: 0, x0: 0, y0: 0, x1: 1000, y1: 600 };
const perch = { name: "perch", z: 300, x0: 300, y0: -200, x1: 700, y1: -40 };
const WALL = { x0: 450, x1: 550, y0: 110, y1: 600, z1: 200 };
const BODY = { x0: -60, x1: 60, y0: -20, y1: 20, h: 80 };

function corners(x, y, h) {
  const r = (h * Math.PI) / 180,
    f = [Math.cos(r), -Math.sin(r)],
    l = [-Math.sin(r), -Math.cos(r)];
  return [[BODY.x0, BODY.y0], [BODY.x1, BODY.y0], [BODY.x1, BODY.y1], [BODY.x0, BODY.y1]].map(([a, b]) => [x + f[0] * a + l[0] * b, y + f[1] * a + l[1] * b]);
}
// separating axes, for the body against the wall's box
function hitsWall(q, z) {
  if (z >= WALL.z1 || z + BODY.h <= 0) return false;
  const W = [[WALL.x0, WALL.y0], [WALL.x1, WALL.y0], [WALL.x1, WALL.y1], [WALL.x0, WALL.y1]];
  return ![q, W].some((P) =>
    P.some((u, i) => {
      const v = P[(i + 1) % 4],
        n = [v[1] - u[1], u[0] - v[0]];
      const span = (S) => S.map((p) => p[0] * n[0] + p[1] * n[1]);
      const a = span(q),
        b = span(W);
      return Math.max(...a) <= Math.min(...b) || Math.max(...b) <= Math.min(...a);
    }),
  );
}
const fits = (x, y, z, h, clip, { on: s } = {}) => {
  const q = corners(x, y, h);
  if (s && !q.every(([a, b]) => a >= s.x0 && a <= s.x1 && b >= s.y0 && b <= s.y1)) return false;
  return !hitsWall(q, z);
};
const jumps = [{ a: "desk", b: "perch", to: [550, -120], heading: 180 }];
const P = planner({ surfaces: [desk, perch], jumps, fits });

// every point of a walk, every few px, fits where it is, looking the way it walks
function walked(s, pts) {
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
    for (let k = 0; k <= n; k++) assert.ok(fits(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, s.z, b[2], "walk", { on: s }), "walks into something at " + a + " to " + b);
  }
}

// round the wall, through the gap behind it
const w = P.walk("desk", [100, 400, 0], [900, 400]);
assert.ok(w, "finds a way round the wall");
walked(desk, w);
assert.ok(w.some((p) => p[0] > 400 && p[0] < 600 && p[1] < 110), "goes through the gap");
assert.deepEqual(w[w.length - 1].slice(0, 2), [900, 400]);

// facing a given way at the end
const f = P.walk("desk", [100, 400, 0], [200, 400, 90]);
assert.equal(f[f.length - 1][2], 90);

// up onto the perch: a walk to the take-off, the jump, a walk on the perch
const r = P.route({ surface: "desk", x: 100, y: 400, heading: 0 }, { surface: "perch", x: 400, y: -120, heading: 180 });
assert.deepEqual(r.map((l) => Object.keys(l)[0]), ["walk", "jump", "walk"]);
walked(desk, r[0].walk);
walked(perch, r[2].walk);
assert.equal(r[1].jump.h1, 180);
assert.ok(r[1].jump.from[1] > -40, "takes off from the desk, in front of the perch");
assert.ok(arc(r[1].jump, 0.8)[2] > 300, "the arc comes over the perch's edge from above");
// and down again
assert.ok(P.route({ surface: "perch", x: 400, y: -120, heading: 180 }, { surface: "desk", x: 100, y: 400, heading: 0 }));

// a spot on the perch fits
const sp = P.spot("perch", "sleep", Math.random, [0, 180]);
assert.ok(sp && fits(sp[0], sp[1], 300, sp[2], "sleep", { on: perch }));

// shut in: a desk cut in two by a wall right across has no way over
const shut = planner({ surfaces: [{ ...desk }], jumps: [], fits: (x, y, z, h, c, o) => fits(x, y, z, h, c, o) && Math.abs(x - 500) > 60 + 20 });
assert.equal(shut.walk("desk", [100, 400, 0], [900, 400]), null);

console.log("willy-paths: ok");
