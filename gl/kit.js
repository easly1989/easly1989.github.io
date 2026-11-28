// What the room's objects are built from (issue #160, ticket 03): the room's light, its palette, and the
// helpers that turn a drawing into a shape (lathed, extruded, bevelled, swept along a line), a surface into a
// material, and words and pictures into textures that stay sharp at any size. The room (room-gl.js) and the
// workbench (gl/bench.js) both use it, so that an object looks the same alone as in the room.
//
// Units are the CSS room's px, x east, y north, z up, an object's own origin at the middle of its foot.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export { THREE };

// ---- the palette, in both colour schemes (room.css, styles.css) ----------------------------------------
export const PALETTE = {
  light: { wall: "#d9d2c4", skirting: "#b9ad98", desk: "#a9774b", leg: "#8d6340", mat: "#22594b", matEdge: "#1a4a3e", line: [214, 240, 228, 0.13], line2: [214, 240, 228, 0.3], floor: 1, back: "#2a2522" },
  dark: { wall: "#4a4640", skirting: "#3a3631", desk: "#6e4c31", leg: "#573b26", mat: "#12352d", matEdge: "#0d2822", line: [214, 240, 228, 0.09], line2: [214, 240, 228, 0.2], floor: 0.55, back: "#161311" },
};
// what the things of the room are painted, in both schemes (room.css and styles.css)
Object.assign(PALETTE.light, {
  chair: "#3f4a52", chairLeg: "#2c3338", chairMesh: "#353e45", tie: "#b3343c", binWire: "#3a4045", binIn: "#2a2f33", binPaper: "#f1eee6",
  sill: "#e6dfd2", pot: "#3c78a8", soil: "#4a3426", perch: "#9a6a3e", fleece: "#f4f0ea", radio: "#d8c7a4", skyTop: "#8fc8ec", skyLow: "#e4f3fb", roofs: "#7f97a8", night: false,
});
Object.assign(PALETTE.dark, {
  chair: "#2c353b", chairLeg: "#1e2428", chairMesh: "#262d32", tie: "#a52f37", binWire: "#23282b", binIn: "#14181a", binPaper: "#b9b6ae",
  sill: "#57524a", pot: "#2e5f86", soil: "#33251b", perch: "#6b4a2c", fleece: "#b9b4ad", radio: "#8f8064", skyTop: "#0b1433", skyLow: "#2a3863", roofs: "#10172b", night: true,
});
export const scheme = matchMedia("(prefers-color-scheme: dark)");
export const pal = () => PALETTE[scheme.matches ? "dark" : "light"];
// A material whose colour is a colour of the palette, kept as the scheme changes (the objects' own, set when they are built).
const tinted = [];
export function tint(material, key) {
  material.color.set(pal()[key]);
  tinted.push([material, key]);
  return material;
}
scheme.addEventListener("change", () => {
  for (const [m, key] of tinted) m.color.set(pal()[key]);
});

// the renderer, as the room and the workbench both want it
export function renderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.NoToneMapping;
  r.localClippingEnabled = true; // (a thing that goes into another, as the radio's projector, is cut at its surface)
  return r;
}
// drawn at a size the screen may not have, then scaled down: the edges come out soft; but never more than
// about 10 Mpx, which with the multisampled targets is most of a gigabyte
export const ratio = () => Math.max(1, Math.min(2, Math.max(devicePixelRatio || 1, 1.5), Math.sqrt(1e7 / (innerWidth * innerHeight))));

// ---- the room's light: a sun from up and the south-west with soft shadows, a sky and a floor, and an environment ----
// `sunAt` is where the sun is; its shadow covers `extent` px round the origin.
export function addLight(scene, renderer, sunAt, extent = 1500) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8ccbc, 1.1);
  const sun = new THREE.DirectionalLight(0xfff1dc, 0.9);
  sun.position.copy(sunAt);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 100, far: sunAt.length() + extent });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 1.5;
  sun.shadow.radius = 5;
  scene.add(hemi, sun, sun.target);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.2;
  return { hemi, sun };
}

// ---- textures --------------------------------------------------------------------------------------------
function finish(canvas, renderer, repeat = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Something printed or painted: `w` x `h` px of the room, drawn at `k` texture px to each (2 to 4 keeps lines and
// letters crisp up close), by draw(ctx, k), whose units are the room's px. The fonts the site uses are waited for,
// so that words are in their own letters and not in a stand-in.
let fontsReady = null;
export async function paint(renderer, w, h, draw, { k = 4, repeat = false } = {}) {
  // (once for all that is painted, and for at most 3 s: a font file that never arrives must not keep an object from being
  // drawn, in a stand-in)
  fontsReady ||= Promise.race([
    Promise.all(['800 30px "Bricolage Grotesque"', '400 16px "Atkinson Hyperlegible"', '700 16px "Atkinson Hyperlegible"', '500 11px "IBM Plex Mono"'].map((f) => document.fonts.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await fontsReady;
  const cv = document.createElement("canvas");
  cv.width = Math.round(w * k);
  cv.height = Math.round(h * k);
  const g = cv.getContext("2d");
  g.scale(k, k);
  draw(g, k);
  return finish(cv, renderer, repeat);
}
// wood with a grain, the streaks running along x (alongX) or y, in a greyscale that multiplies the colour
export function grain(renderer, alongX) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1024;
  const g = cv.getContext("2d");
  g.fillStyle = "#f4f4f4";
  g.fillRect(0, 0, 1024, 1024);
  let seed = alongX ? 7 : 13;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 320; i++) {
    const a = rnd() * 1024,
      len = 300 + rnd() * 724,
      b = rnd() * 1024,
      wob = (rnd() - 0.5) * 18;
    g.lineWidth = 0.6 + rnd() * 2.6;
    g.strokeStyle = rnd() < 0.8 ? `rgba(60,35,15,${0.04 + rnd() * 0.09})` : `rgba(255,240,220,${0.05 + rnd() * 0.07})`;
    g.beginPath();
    if (alongX) {
      g.moveTo(b, a);
      g.quadraticCurveTo(b + len / 2, a + wob, b + len, a);
    } else {
      g.moveTo(a, b);
      g.quadraticCurveTo(a + wob, b + len / 2, a, b + len);
    }
    g.stroke();
  }
  return finish(cv, renderer, true);
}
// the cutting mat's top: its colour and the grid of the CSS room (lines every 40 px, thick every 200, from 40 px in)
export function matTexture(renderer, p, w, d) {
  const k = 2,
    cv = document.createElement("canvas");
  cv.width = w * k;
  cv.height = d * k;
  const g = cv.getContext("2d");
  g.fillStyle = p.mat;
  g.fillRect(0, 0, cv.width, cv.height);
  const rgba = (c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
  for (const [step, color] of [[40, p.line], [200, p.line2]]) {
    g.fillStyle = rgba(color);
    for (let x = 40; x < w; x += step) g.fillRect(x * k, 0, k, cv.height);
    for (let y = 40; y < d; y += step) g.fillRect(0, y * k, cv.width, k);
  }
  const t = finish(cv, renderer);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ---- materials: what the room's things are made of ------------------------------------------------------
export const material = {
  // glazed china: smooth, with a clear coat that takes the light as a highlight
  china: (color = "#f4f1ea") => new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
  // a liquid: dark, glossy
  liquid: (color = "#4a2a16") => new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 }),
  paper: (color = "#f3ecda") => new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
  plastic: (color = "#3a3a3c") => new THREE.MeshStandardMaterial({ color, roughness: 0.45 }),
  rubber: (color = "#2a2a2c") => new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  metal: (color = "#c8ccd0") => new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 1 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, metalness: 0, transmission: 1, thickness: 4, ior: 1.5, transparent: true }),
  fabric: (color = "#c9c2b4") => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  // something printed on a surface: a texture with an alpha, laid just over it
  decal: (map) => new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
};

// ---- shapes -------------------------------------------------------------------------------------------------
// A shape turned round the z axis: `profile` is [radius, height] points from the axis, up the outside, over and down the
// inside (a closed outline is a hollow thing); a point twice makes a crease, and the rest are smoothed.
// (`from` and `span` make only a part of the turn, in radians from the south, growing to the east: a print round a side)
export function lathe(profile, segments = 96, from = 0, span = Math.PI * 2) {
  const pts = [];
  profile.forEach((p) => pts.push(new THREE.Vector2(p[0], p[1])));
  const g = new THREE.LatheGeometry(pts, segments, from, span);
  g.rotateX(Math.PI / 2); // (the lathe turns round y: up is now z)
  return g;
}
// A box standing on z = 0, centred on x and y, its edges rounded
export function roundedBox(w, d, h, r = 2, segments = 3) {
  const g = new RoundedBoxGeometry(w, d, h, segments, r);
  g.translate(0, 0, h / 2);
  return g;
}
// A flat outline given as [x, y] points, standing on z = 0 and `depth` thick, the edge bevelled by `bevel`
export function extrude(outline, depth, bevel = 0.5) {
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
  g.translate(0, 0, bevel);
  return g;
}
// A round rod swept along a smooth line through `points` ([x, y, z]), `radius` thick
export function sweep(points, radius, { closed = false, radial = 16 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, "catmullrom", 0.5);
  return new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, radial, closed);
}
// A puffed solid, a cushion or a pillow: a superellipsoid with half-sizes `a` (x), `b` (y) and `c` (z), standing on z = 0: `n` squares its plan
// (2 an ellipse, 3 or 4 a rounded rectangle), `e` rounds its profile (1 a ball's, less a flatter top and fuller sides)
export function pillow(a, b, c, n = 3, e = 0.55, seg = 56) {
  const rows = Math.ceil(seg / 2),
    pos = [],
    uv = [],
    idx = [];
  const sg = (v, p) => Math.sign(v) * Math.abs(v) ** p;
  for (let j = 0; j <= rows; j++) {
    const v = (j / rows) * (Math.PI / 2),
      r = Math.cos(v) ** e,
      z = c * Math.sin(v) ** e;
    for (let i = 0; i < seg; i++) {
      const u = (i / seg) * Math.PI * 2,
        x = a * r * sg(Math.cos(u), 2 / n),
        y = b * r * sg(Math.sin(u), 2 / n);
      pos.push(x, y, z);
      uv.push(x / (2 * a) + 0.5, y / (2 * b) + 0.5);
    }
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < seg; i++) {
      const k = j * seg + i,
        k1 = j * seg + ((i + 1) % seg);
      idx.push(k, k1, k + seg, k1, k1 + seg, k + seg);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Every point of a geometry moved by fn(vector) (in place), its normals made again: a bend, a dome, a dent. With `weld`, the normals of
// points that lie in one place are averaged (the seams of a box, of a mapped shape), so that a smooth thing has no crease; leave it off
// for a flat-sided cut shape, whose edges are meant to show.
export function warp(geometry, fn, weld = true) {
  const p = geometry.attributes.position,
    v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    fn(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
  if (weld) {
    const n = geometry.attributes.normal,
      sum = new Map(),
      key = (i) => `${Math.round(p.getX(i) * 50)},${Math.round(p.getY(i) * 50)},${Math.round(p.getZ(i) * 50)}`;
    for (let i = 0; i < p.count; i++) {
      const k = key(i),
        s = sum.get(k) || new THREE.Vector3();
      sum.set(k, s.add(v.fromBufferAttribute(n, i)));
    }
    for (const s of sum.values()) s.normalize();
    for (let i = 0; i < p.count; i++) {
      const s = sum.get(key(i));
      n.setXYZ(i, s.x, s.y, s.z);
    }
    n.needsUpdate = true;
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
// A grey texture of tiny irregular bumps (cloth, fleece, soil, to be a bump map): `size` px a side, `grain` the size of a speck, repeating
export function noiseTexture(renderer, size = 256, grain = 1.6, repeat = [1, 1]) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  let seed = 90210;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * size * 0.9; i++) {
    const v = 60 + Math.floor(rnd() * 140);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rnd() * size, rnd() * size, grain * (0.5 + rnd()), grain * (0.5 + rnd()));
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
// A rounded rectangle, centred, as a Shape (`hole` another Shape, cut out of it, as a ring)
export function roundedRect(w, h, r, hole) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  if (hole) s.holes.push(hole);
  return s;
}
// A flat piece made in its own x, y (normal +z, depth +z) turned onto a face of a thing: its x runs along the face, its y up, its
// normal out of it; `at` is [x, y, z] of the middle of its back. Faces: "front" (looks south, x runs east), "west" (looks west, x runs
// south, the way a reader of the west side reads), "top" (looks up, x east, y north)
export function onFace(geometry, face, at = [0, 0, 0]) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const basis = { front: [V(1, 0, 0), V(0, 0, 1), V(0, -1, 0)], west: [V(0, -1, 0), V(0, 0, 1), V(-1, 0, 0)], top: [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)] }[face];
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(...basis));
  geometry.translate(...at);
  return geometry;
}
// A side view made a solid: `outline` is [y, z] points (y north, z up) of its profile, `width` long along x, centred on x = 0
export function profile(outline, width, bevel = 0.8) {
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, bevel - width / 2);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  return g;
}
// A mesh that casts and takes shadows
export function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
