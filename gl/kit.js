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
export const scheme = matchMedia("(prefers-color-scheme: dark)");
export const pal = () => PALETTE[scheme.matches ? "dark" : "light"];

// the renderer, as the room and the workbench both want it
export function renderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.NoToneMapping;
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
export async function paint(renderer, w, h, draw, { k = 4, repeat = false } = {}) {
  try {
    // (for at most 3 s: a font file that never arrives must not keep an object from being drawn, in a stand-in)
    await Promise.race([
      Promise.all(['800 30px "Bricolage Grotesque"', '400 16px "Atkinson Hyperlegible"', '700 16px "Atkinson Hyperlegible"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch (e) {}
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
// A mesh that casts and takes shadows
export function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
