// The room as Willy knows it (issue #160, ticket 09): what willy-paths.js, willy-moves.js, willy-life.js and willy.js ask of `window.ROOM`, made from
// the scene instead of from the CSS room's elements. Everything here is in the CSS room's own px (the scene's x is the stage's less 640, its y is 440
// less the stage's, z up from the mat), so what Willy plans, walks and says is the same in the scene as it was. His walking surfaces are the desk, the
// cushion on the perch, the shelf and the computer's top; what he keeps out of, or walks over (what is no higher than 50 on the desk), is each thing's
// footprint turned as it stands, measured on the objects of the scene, apart from what he has no business with (the odds and ends, the cards on the wall).
// The room's light is on (its lights and the weather are ticket 10) and there is no mouse nor toys yet (the mouse: ticket 14, the toys: 13).

import { THREE } from "./kit.js";

// (the CSS room's constants: room.js)
const DESK = { x: -560, y: -150, w: 1890, d: 1180, t: 46 };
const BACK = -200;
const RIGHT = 1350;
const FLOOR = -560;
const MAT = 4;
const NEST = { x: 166, y: -146, w: 262, d: 258, h: 90, t: 6 };
const PERCH = { x: 540, w: 360, d: 190, z: 304 };
const SHELF = { y: 520, d: 700, z: 170, w: 112 };
const RAD = { y: SHELF.y + SHELF.d - 220 };
const WIN = { along: 420, top: 660, w: 600, h: 380 };
const LOW = 50;
const HIGH = 1.2;

// ---- the geometry ---------------------------------------------------------------------------------------------------
function plansMeet(a, b, g) {
  return a.x0 < b.x1 - g && a.x1 > b.x0 + g && a.y0 < b.y1 - g && a.y1 > b.y0 + g;
}
// two convex footprints are apart when some edge of either separates them by more than g
function apart(P, Q, g) {
  return [P, Q].some((poly) =>
    poly.some((u, i) => {
      const v = poly[(i + 1) % poly.length];
      const nx = v[1] - u[1],
        ny = u[0] - v[0],
        len = Math.hypot(nx, ny);
      if (len < 1e-6) return false;
      const proj = (s) => {
        let lo = 1e9,
          hi = -1e9;
        for (const q of s) {
          const d = (q[0] * nx + q[1] * ny) / len;
          lo = Math.min(lo, d);
          hi = Math.max(hi, d);
        }
        return [lo, hi];
      };
      const a = proj(P),
        b = proj(Q);
      return a[1] < b[0] + g || b[1] < a[0] + g;
    }),
  );
}
// whether two boxes meet: their plans and heights, and then part by part, since a turned thing's box is bigger than it is
function overlap(a, b) {
  const g = 1;
  if (!plansMeet(a, b, g) || !(a.z0 < b.z1 - g && a.z1 > b.z0 + g)) return false;
  return a.parts.some((p) => plansMeet(p, b, g) && b.parts.some((q) => plansMeet(p, q, g) && !apart(p.q, q.q, g)));
}
// the convex hull of points, in order round it
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [],
    upper = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// a convex outline with no more than n vertices: the one whose corner adds least to the area is dropped, again and again (a subset of the corners of a
// convex outline is convex, a little inside it)
function simplify(h, n) {
  const area = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  while (h.length > n) {
    let k = 0,
      least = Infinity;
    for (let i = 0; i < h.length; i++) {
      const a = area(h[(i + h.length - 1) % h.length], h[i], h[(i + 1) % h.length]);
      if (a < least) (least = a), (k = i);
    }
    h.splice(k, 1);
  }
  return h;
}

export function roomApi({ objects, project }) {
  const stage = (sx, sy) => [sx + 640, 440 - sy];

  // the footprints of picks (parts of group, or group) as they stand, in the stage's px, and the heights they span: `{ parts, z0, z1 }`. Each footprint is the
  // outline of the thing itself, the convex hull of its own vertices seen from above (a round thing is round, a turned one is turned, a wedge is a wedge),
  // not the box round it: what Willy keeps out of is what is there.
  function measure(group, picks = [group]) {
    group.updateMatrixWorld(true);
    const pos = group.position.clone(),
      quat = group.quaternion.clone(),
      turn = group.rotation.z;
    group.position.set(0, 0, 0);
    group.quaternion.identity();
    group.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const shapes = picks.map((o) => {
      const pts = [];
      let z0 = Infinity,
        z1 = -Infinity;
      o.updateMatrixWorld(true);
      o.traverse((m) => {
        if (!m.isMesh || !m.visible || !m.geometry.attributes.position) return;
        const p = m.geometry.attributes.position,
          step = Math.max(1, Math.floor(p.count / 1500));
        for (let i = 0; i < p.count; i += step) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          pts.push([v.x, v.y]);
          z0 = Math.min(z0, v.z);
          z1 = Math.max(z1, v.z);
        }
      });
      return { pts, z0, z1 };
    });
    group.position.copy(pos);
    group.quaternion.copy(quat);
    group.updateMatrixWorld(true);
    const c = Math.cos(turn),
      s = Math.sin(turn);
    const parts = shapes.map(({ pts }) => {
      const q = simplify(hull(pts), 28).map(([x, y]) => stage(pos.x + x * c - y * s, pos.y + x * s + y * c));
      const xs = q.map((p) => p[0]),
        ys = q.map((p) => p[1]);
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), q };
    });
    return { parts, z0: pos.z + Math.min(...shapes.map((b) => b.z0)), z1: pos.z + Math.max(...shapes.map((b) => b.z1)) };
  }
  const solidBox = (m) => ({
    x0: Math.min(...m.parts.map((p) => p.x0)),
    x1: Math.max(...m.parts.map((p) => p.x1)),
    y0: Math.min(...m.parts.map((p) => p.y0)),
    y1: Math.max(...m.parts.map((p) => p.y1)),
    z0: m.z0,
    z1: m.z1,
    parts: m.parts,
  });
  const rect = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, q: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });

  // ---- what he stands on ------------------------------------------------------------------------------------------
  const SURFACES = [
    { name: "desk", z: 0, x0: DESK.x, y0: DESK.y, x1: DESK.x + DESK.w, y1: DESK.y + DESK.d },
    { name: "perch", z: PERCH.z + 26, x0: PERCH.x, y0: BACK, x1: PERCH.x + PERCH.w, y1: BACK + PERCH.d, of: "perch" },
    { name: "shelf", z: SHELF.z, x0: RIGHT - SHELF.w, y0: SHELF.y, x1: RIGHT, y1: SHELF.y + SHELF.d, of: "shelf" },
  ];
  const pc = objects.pc;
  let caseTop = null;
  const surfaceTop = () => {
    // the computer's top, square to the room though the case stands a little turned: half way between its corners, so that at them he hangs over its edge a
    // little, as a cat on a monitor does; it hides him behind it though he stands on it (cover)
    const m = measure(pc, [pc.children[0]]);
    // (with Cupid's letter on it, which he lies on: the top of the post)
    const post = objects.post ? measure(objects.post) : null;
    // (the four corners of the case's top, turned as the case stands: from its box in its own frame, not the outline of its rounded edges)
    const pos = pc.position.clone(),
      quat = pc.quaternion.clone();
    pc.position.set(0, 0, 0);
    pc.quaternion.identity();
    pc.updateMatrixWorld(true);
    const lb = new THREE.Box3().setFromObject(pc.children[0]);
    pc.position.copy(pos);
    pc.quaternion.copy(quat);
    pc.updateMatrixWorld(true);
    const tc = Math.cos(pc.rotation.z),
      ts = Math.sin(pc.rotation.z);
    const q = [[lb.min.x, lb.min.y], [lb.max.x, lb.min.y], [lb.max.x, lb.max.y], [lb.min.x, lb.max.y]].map(([x, y]) => stage(pos.x + x * tc - y * ts, pos.y + x * ts + y * tc));
    const xs = q.map((p) => p[0]).sort((a, b) => a - b),
      ys = q.map((p) => p[1]).sort((a, b) => a - b);
    return { name: "top", z: Math.round(Math.max(m.z1, post ? post.z1 : 0)), x0: Math.round((xs[0] + xs[1]) / 2), y0: Math.round((ys[0] + ys[1]) / 2), x1: Math.round((xs[2] + xs[3]) / 2), y1: Math.round((ys[2] + ys[3]) / 2), of: "top", cover: true };
  };
  if (pc) SURFACES.push((caseTop = surfaceTop()));
  const JUMPS = [180, 0]
    .map((h) => ({ a: "desk", b: "perch", to: [PERCH.x + PERCH.w / 2, BACK + PERCH.d / 2], heading: h }))
    // onto the shelf between the plant and the radio, along it, either way
    .concat([90, 270].map((h) => ({ a: "desk", b: "shelf", to: [RIGHT - SHELF.w / 2, (SHELF.y + 66 + RAD.y) / 2], heading: h })));
  // up onto the computer's top, from beside it, from in front of it or from behind it
  if (caseTop) for (const h of [180, 90, 270]) JUMPS.push({ a: "desk", b: "top", to: [(caseTop.x0 + caseTop.x1) / 2, (caseTop.y0 + caseTop.y1) / 2], heading: h });

  // ---- what he keeps out of, and what he walks over --------------------------------------------------------------
  let solids = null,
    lows = null;
  const find = (g, name) => {
    let r = null;
    g.traverse((o) => {
      if (!r && o.name === name) r = o;
    });
    return r;
  };
  const findAll = (g, name) => {
    const r = [];
    g.traverse((o) => o.name === name && r.push(o));
    return r;
  };
  function measureAll() {
    const all = [];
    const add = (name, group, picks, of) => {
      if (!group || (picks && picks.some((p) => !p))) return;
      all.push({ b: solidBox(measure(group, picks)), name, of: of || undefined, e: null });
    };
    if (pc) {
      add("the computer", pc, [pc.children[0]], "top");
      add("the keyboard", pc, [pc.children[1]]);
    }
    add("CloudBank", objects.ledger);
    add("Nutreek", objects.agenda);
    add("About me", objects.camera);
    add("Planora", objects.jar);
    add("Buy me a coffee", objects.mug);
    add("ASF Plugins", objects.pager);
    add("Archive", objects.bin);
    add("the chair", objects.chair);
    if (objects.nest) add("Willy's box", objects.nest, objects.nest.children.slice(0, 4));
    // the desk's legs
    for (const [x, y] of [[30, 30], [DESK.w - 100, 30], [30, DESK.d - 100], [DESK.w - 100, DESK.d - 100]]) {
      const r = rect(DESK.x + x, DESK.y + y, DESK.x + x + 70, DESK.y + y + 70);
      all.push({ b: { ...r, z0: FLOOR, z1: -MAT - DESK.t, parts: [r] }, name: "a leg of the desk", e: null });
    }
    // the window's sill and the perch, the shelf, its brackets, the plant and the radio (not the perch's chains: thin, he brushes past them)
    const w = objects.window,
      sh = objects.shelf;
    if (w) {
      add("the sill", w, [find(w, "sill")]);
      add("the perch", w, [find(w, "perch-board")], "perch");
      add("the perch", w, [find(w, "fleece")], "perch");
    }
    if (sh) {
      add("the shelf", sh, [find(sh, "shelf-board")], "shelf");
      for (const br of findAll(sh, "bracket")) add("the shelf", sh, [br], "shelf");
      add("the plant", sh, [find(sh, "plant")]);
      add("the radio", sh, [find(sh, "radio")]);
    }
    // (standing on the desk, not under it; the keyboard's feet are a hair into it)
    lows = all.filter((o) => !o.of && Math.abs(o.b.z0) < 3 && o.b.z1 <= LOW);
    solids = all.filter((o) => !lows.includes(o));
  }
  const solid = () => {
    if (!solids) measureAll();
    return solids;
  };
  const ground = (x, y, z) => {
    solid();
    return lows.reduce((h, o) => (z === 0 && x >= o.b.x0 && x <= o.b.x1 && y >= o.b.y0 && y <= o.b.y1 ? Math.max(h, o.b.z1) : h), z);
  };
  const hit = (shape, past) => solid().filter((o) => !(past && past.includes(o.of)) && overlap(shape, o.b));

  // ---- what hides him, on the screen: the outlines of the solid things in front of a box w ------------------------
  const depth = (b) => -(b.x0 + b.x1) / 2 + (b.y0 + b.y1) / 2 + (b.z0 + b.z1) / 2;
  const facesOf = (o) =>
    (o.faces ??= o.b.parts.flatMap((p) => {
      const { z0, z1 } = o.b,
        q = p.q;
      const n = q.length;
      const side = (i) => [[q[i][0], q[i][1], z0], [q[(i + 1) % n][0], q[(i + 1) % n][1], z0], [q[(i + 1) % n][0], q[(i + 1) % n][1], z1], [q[i][0], q[i][1], z1]];
      return [...Array(n).keys()].map(side).concat([q.map((c) => [c[0], c[1], z1])]);
    }));
  const before = (w) =>
    solid()
      .filter((o) => {
        const b = o.b;
        // (what he stands on hides nothing of him, but the computer's case, which he is on only at its top)
        if (o.of && !(SURFACES.some((s) => s.name === o.of && s.cover) && b.z1 > w.z0 + 1)) return false;
        const front = b.x1 <= w.x0 || b.y0 >= w.y1 || b.z0 >= w.z1,
          behind = b.x0 >= w.x1 || b.y1 <= w.y0 || b.z1 <= w.z0;
        return front && behind ? depth(b) > depth(w) : front;
      })
      .flatMap((o) => facesOf(o).map((f) => hull(f.map((c) => project(c[0], c[1], c[2])))));

  // ---- the props: boxes by kind, for what he does with the room's other things ------------------------------------
  function props() {
    const out = {};
    const put = (k, group, picks) => {
      if (!group) return;
      const b = solidBox(measure(group, picks));
      out[k] = { x0: b.x0, y0: b.y0, z0: b.z0, x1: b.x1, y1: b.y1, z1: b.z1, el: null };
    };
    put("ledger", objects.ledger);
    put("agenda", objects.agenda);
    put("camera", objects.camera);
    put("mug", objects.mug);
    put("jar", objects.jar);
    put("pager", objects.pager);
    put("envelope", objects.post);
    put("nav", objects.nav);
    // (the window's opening, on the back wall)
    out.window = { x0: WIN.along, x1: WIN.along + WIN.w, y0: BACK, y1: BACK + 2, z0: WIN.top - WIN.h, z1: WIN.top, el: null };
    if (objects.nest) {
      put("nest", objects.nest, objects.nest.children.slice(0, 4));
      out.nest.inside = { x0: NEST.x + NEST.t, x1: NEST.x + NEST.w - NEST.t, y0: NEST.y + NEST.t, y1: NEST.y + NEST.d - NEST.t, h: NEST.h };
    }
    return out;
  }

  // ---- the lights: the room's own, and the day's through the window (their weather is ticket 10) ------------------
  const lights = () => [
    { name: "room", at: [DESK.x + 200, BACK + 250, 1600], color: "#fff1dc", power: 1, reach: 0 },
    { name: "window", at: [WIN.along + WIN.w / 2, BACK - 1000, WIN.top - WIN.h / 2 + 1000 * HIGH], color: "#fff6de", power: 0.35, reach: 0, fill: 1, soft: 1, day: true },
    { name: "screen", at: [0, 0, 0], color: "#c8ffd2", power: 0, reach: 700 },
    { name: "radio", at: [0, 0, 0], color: "#ffcd96", power: 0, reach: 450 },
    { name: "projector", at: [0, 0, 0], color: "#ffe6c0", power: 0, reach: 400 },
  ];

  const api = {
    gl: true,
    surfaces: SURFACES,
    jumps: JUMPS,
    ready: Promise.resolve(),
    landed: () => Promise.resolve(),
    holdLight: () => {},
    onLights: () => {},
    lights,
    // whether the sun or the moon falls on a point through the window (their light and its weather: ticket 10)
    moonlit: () => false,
    glows: () => [],
    mouse: null,
    night: null,
    toScreen: (x, y, z) => project(x, y, z),
    before,
    ground,
    floor: FLOOR,
    desk: DESK,
    walls: { back: BACK, right: RIGHT },
    boxes: () => {
      solid();
      return solids.concat(lows).filter((o) => o.name !== "the chair").map((o) => ({ name: o.name, el: null, x0: o.b.x0, y0: o.b.y0, z0: o.b.z0, x1: o.b.x1, y1: o.b.y1, z1: o.b.z1 }));
    },
    // measured again, from where things lie now
    refresh: () => {
      solids = lows = null;
    },
    props,
    // what is low enough to walk over, each by name, how high and where on the desk
    lows: () => {
      solid();
      return lows.map((o) => ({ name: o.name, z: Math.round(o.b.z1), x0: o.b.x0, y0: o.b.y0, x1: o.b.x1, y1: o.b.y1, el: null }));
    },
    // whether a shape, in willy.js's form, goes into nothing solid, but what makes the surfaces named in past; or what it goes into
    clear: (shape, past) => !hit(shape, past).length,
    into: (shape, past) => hit(shape, past).map((o) => o.name),
  };
  return api;
}
