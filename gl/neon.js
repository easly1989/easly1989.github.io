// Neon lettering as real tubes (issue #160, ticket 08): each letter is a few bent lines of one stroke, as a glass-blower bends them, and each line is a
// glass tube round a pale lit core, its two ends closed in rounded tips of the glass, held off the board on small posts. The letters are drawn here as lines (a
// round monoline hand), not taken from a typeface: only the letters the room uses are made (the name, and the navigation's four words).
// A word is made for a width and a height: its letters stretch to fill the width. The tubes lie in the plane of the board, x east, y up, z out of it.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ---- the letters: strokes as lists of [x, y] in units of the capital's height, y up, the baseline at 0; w is the advance ----
const arc = (cx, cy, rx, ry, a0, a1, n = 28) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
};
const XH = 0.66; // (the lower case's height)
const R2 = XH / 2;
const G = {
  C: { w: 1.0, s: [arc(0.5, 0.5, 0.46, 0.5, 42, 318, 40)] },
  A: { w: 1.0, s: [[[0, 0], [0.42, 1], [0.84, 0]], [[0.14, 0.34], [0.7, 0.34]]] },
  D: { w: 1.05, s: [[[0.06, 0], [0.06, 1], [0.38, 1], ...arc(0.38, 0.5, 0.45, 0.5, 90, -90, 30).slice(1), [0.06, 0]]] },
  G: { w: 1.1, s: [[...arc(0.5, 0.5, 0.46, 0.5, 42, 360, 40), [0.55, 0.5]]] },
  H: { w: 1.0, s: [[[0.06, 0], [0.06, 1]], [[0.76, 0], [0.76, 1]], [[0.06, 0.5], [0.76, 0.5]]] },
  P: { w: 0.85, s: [[[0.06, 0], [0.06, 1], [0.45, 1], ...arc(0.45, 0.74, 0.27, 0.26, 90, -90, 20).slice(1), [0.06, 0.48]]] },
  R: { w: 0.95, s: [[[0.06, 0], [0.06, 1], [0.5, 1], ...arc(0.5, 0.75, 0.25, 0.25, 90, -90, 20).slice(1), [0.06, 0.5]], [[0.36, 0.5], [0.78, 0]]] },
  a: { w: 0.95, s: [arc(0.33, 0.33, 0.33, 0.33, 0, 360, 36), [[0.66, XH], [0.66, 0]]] },
  b: { w: 0.9, s: [[[0.06, 0], [0.06, 1]], arc(0.38, 0.33, 0.32, 0.33, 0, 360, 36)] },
  c: { w: 0.75, s: [arc(0.37, 0.33, 0.31, 0.33, 40, 320, 30)] },
  e: { w: 0.85, s: [[[0.04, 0.33], [0.66, 0.33], ...arc(0.35, 0.33, 0.31, 0.33, 0, 320, 32).slice(1)]] },
  g: { w: 0.95, s: [arc(0.33, 0.33, 0.33, 0.33, 0, 360, 36), [[0.66, XH], [0.66, -0.1], [0.56, -0.28], [0.34, -0.35], [0.12, -0.29]]] },
  i: { w: 0.3, s: [[[0.06, XH], [0.06, 0]]], dots: [[0.06, 0.92]] },
  j: { w: 0.4, s: [[[0.2, XH], [0.2, -0.1], [0.13, -0.27], [-0.03, -0.34]]], dots: [[0.2, 0.92]] },
  l: { w: 0.3, s: [[[0.06, 1], [0.06, 0]]] },
  n: { w: 0.8, s: [[[0.06, XH], [0.06, 0]], [[0.06, 0.42], [0.16, 0.6], [0.34, XH], [0.52, 0.6], [0.6, 0.42], [0.6, 0]]] },
  o: { w: 0.85, s: [arc(0.35, 0.33, 0.35, 0.33, 0, 360, 40)] },
  r: { w: 0.55, s: [[[0.06, XH], [0.06, 0]], [[0.06, 0.4], [0.14, 0.58], [0.3, XH], [0.44, 0.62]]] },
  s: { w: 0.7, s: [[[0.5, 0.56], [0.36, XH], [0.16, 0.64], [0.05, 0.53], [0.12, 0.42], [0.34, 0.34], [0.5, 0.22], [0.44, 0.06], [0.24, 0], [0.04, 0.08]]] },
  t: { w: 0.55, s: [[[0.24, 0.95], [0.24, 0.16], [0.3, 0.04], [0.45, 0]], [[0.04, 0.62], [0.46, 0.62]]] },
  u: { w: 0.8, s: [[[0.06, XH], [0.06, 0.3], ...arc(0.34, 0.3, 0.28, 0.3, 180, 360, 22).slice(1), [0.62, XH]], [[0.62, XH], [0.62, 0]]] },
  " ": { w: 0.4, s: [] },
};
const GAP = 0.12;
// the corners of a bent line rounded a little (a glass tube is bent, not cut), by cutting each corner back and joining with a curve
function rounded(pts, r) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1],
      [x, y] = pts[i],
      [nx, ny] = pts[i + 1];
    const d1 = Math.hypot(x - px, y - py),
      d2 = Math.hypot(nx - x, ny - y);
    if (d1 < 1e-6 || d2 < 1e-6) {
      out.push(pts[i]);
      continue;
    }
    const cut = Math.min(r, d1 / 2.2, d2 / 2.2);
    const a = [x + ((px - x) / d1) * cut, y + ((py - y) / d1) * cut],
      b = [x + ((nx - x) / d2) * cut, y + ((ny - y) / d2) * cut];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4,
        u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * x + t * t * b[0], u * u * a[1] + 2 * u * t * y + t * t * b[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// a word's strokes laid out: the lines in px, x from 0 to `width`, the baseline at 0 and the capital `height` high; `dots` the dots of i and j
export function layout(text, width, height) {
  let x = 0;
  const lines = [],
    dots = [];
  for (const ch of text) {
    const g = G[ch] || G[" "];
    for (const s of g.s) lines.push(s.map(([u, v]) => [x + u, v]));
    for (const d of g.dots || []) dots.push([x + d[0], d[1]]);
    x += g.w + GAP;
  }
  const total = x - GAP,
    kx = width / total;
  const place = ([u, v]) => [u * kx, v * height];
  return { lines: lines.map((l) => rounded(l, 0.07).map(place)), dots: dots.map(place), width, height, unitX: kx };
}

// the tubes of a word, as meshes of a group: the glass (coloured, clear, each end closed in a round tip of it), the lit core, the posts that hold
// it off the board, and a dot for each dot of an i and a j; `r` the tube's radius, `lift` how far its middle stands off the board's face
export function tubes(lay, { r, lift = 5, neon = "#ff4fa0" }) {
  const group = new THREE.Group();
  const col = (t) => new THREE.Color(neon).lerp(new THREE.Color("#ffffff"), t);
  const glass = [],
    core = [],
    posts = [];
  const z0 = lift + r;
  const add = (pts, closed) => {
    if (closed) pts = pts.slice(0, -1); // (the last point is the first again)
    const v = pts.map(([x, y]) => new THREE.Vector3(x, y, z0));
    const curve = new THREE.CatmullRomCurve3(v, closed, "centripetal");
    const seg = Math.max(8, Math.min(240, v.length * 2));
    glass.push(new THREE.TubeGeometry(curve, seg, r, 10, closed));
    core.push(new THREE.TubeGeometry(curve, seg, r * 0.48, 8, closed));
    if (!closed) {
      // each end closed in a round tip of the tube's own glass, the lit core going into it
      for (const a of [v[0], v[v.length - 1]]) {
        const tip = new THREE.SphereGeometry(r, 14, 10);
        tip.translate(a.x, a.y, a.z);
        glass.push(tip);
        const lit = new THREE.SphereGeometry(r * 0.48, 10, 8);
        lit.translate(a.x, a.y, a.z);
        core.push(lit);
      }
    }
    // the posts: one at about every 130 px along the line (at least one for a long one), a thin pin from the board up to the tube's back
    const len = curve.getLength();
    const n = Math.max(len > 40 ? 1 : 0, Math.round(len / 130));
    for (let i = 0; i < n; i++) {
      const p = curve.getPointAt((i + 0.5) / n);
      const post = new THREE.CylinderGeometry(r * 0.28, r * 0.28, z0 - r * 0.6, 8);
      post.rotateX(Math.PI / 2);
      post.translate(p.x, p.y, (z0 - r * 0.6) / 2);
      posts.push(post);
    }
  };
  lay.lines.forEach((l) => add(l, Math.hypot(l[0][0] - l[l.length - 1][0], l[0][1] - l[l.length - 1][1]) < 1e-3 && l.length > 8));
  for (const [x, y] of lay.dots) {
    // (a dot is a short bar of the tube, as a bent glass bead)
    add([[x - r * 0.4, y], [x + r * 0.4, y]], false);
  }
  const mat = {
    glass: new THREE.MeshPhysicalMaterial({ color: col(0.3), roughness: 0.05, transparent: true, opacity: 0.5, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false }),
    core: new THREE.MeshStandardMaterial({ color: col(0.7), emissive: col(0.7), emissiveIntensity: 1, roughness: 0.4 }),
    post: new THREE.MeshStandardMaterial({ color: "#dde1e4", roughness: 0.32, metalness: 0.4 }), // (satin steel: light even where nothing is there to reflect)
  };
  const mk = (geos, m, name, cast = false) => {
    if (!geos.length) return null;
    const mesh = new THREE.Mesh(mergeGeometries(geos), m);
    mesh.name = name;
    mesh.castShadow = cast;
    return mesh;
  };
  const glassMesh = mk(glass, mat.glass, "tube-glass");
  glassMesh.renderOrder = 5;
  const parts = [glassMesh, mk(core, mat.core, "tube-core"), mk(posts, mat.post, "tube-posts", true)];
  for (const p of parts) if (p) group.add(p);
  group.userData.setColor = (c) => {
    mat.glass.color.set(c).lerp(new THREE.Color("#ffffff"), 0.3);
    mat.core.color.set(c).lerp(new THREE.Color("#ffffff"), 0.7);
    mat.core.emissive.copy(mat.core.color);
  };
  return group;
}

// the glow of a word, drawn on a canvas in px of the board (x from the board's left, y down): every line stroked wide and soft, white, to be added to the
// wall's light in the colour of the tube (the canvas's blur and offset are in its own px, taken times `k`)
export function haloStrokes(g, k, lay, at, color, shadows, lineWidth) {
  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const [blur, col] of shadows(color)) {
    g.shadowColor = col;
    g.shadowBlur = blur * k;
    g.shadowOffsetX = 6000 * k;
    g.strokeStyle = "#fff";
    g.lineWidth = lineWidth;
    for (const l of lay.lines) {
      g.beginPath();
      l.forEach(([x, y], i) => (i ? g.lineTo(at.x + x - 6000, at.y - y) : g.moveTo(at.x + x - 6000, at.y - y)));
      g.stroke();
    }
  }
  g.restore();
}
