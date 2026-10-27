// PROTOTYPE, throwaway (?room&gl): real light and shadow over the CSS room. The CSS room draws
// itself as it always has; this draws the same room again in WebGL, every element a face where
// the CSS room puts it, but all of it white, lit by the room's sources with shadow maps: what
// comes out is how much light reaches each pixel, multiplied over the page as the night layer
// was, but knowing what stands in front of what. "g" turns it off and on; numbers in __glInfo.
import * as THREE from "three";

await ROOM.ready;
const stage = document.querySelector(".stage");
const t0 = performance.now();
const css = document.createElement("style");
// the room's painted shadows and light patches: the light makes its own now
css.textContent = ".gl .stage .shade, .gl .window-light, .gl .night, .gl .willy-shadow { display: none !important }";
document.head.append(css);
document.documentElement.classList.add("gl");

// ---- the faces --------------------------------------------------------------------------------
const SKIP = /\b(shade|anchor|burst|hit-plane|window-light|beam-corner|willy|willy-low|willy-shadow)\b/;
// what gives light rather than takes it: shown as the CSS room paints it, never darkened
const GLOWS = ".window .sky, .window .pane, .pc.on .glass, .pc.on .glass *, .neon h1, .nav a, .radio-lamp.lit, .projection.lit";
// what may: each its own face, which glows or takes the light as it is now (glowing())
const MAY = ".window .sky, .window .pane, .pc .glass, .pc .glass *, .neon h1, .nav a, .radio-lamp, .projection";
// what lets the light through: the window's own faces (but its bars), the jar's glass
const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
const seen = new Map();
function alpha(c) {
  if (!seen.has(c)) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "rgba(0,0,0,0)";
    probe.fillStyle = c;
    probe.fillRect(0, 0, 1, 1);
    seen.set(c, probe.getImageData(0, 0, 1, 1).data[3] / 255);
  }
  return seen.get(c);
}
const TOWARD = new THREE.Vector3(-1, 1, 1).normalize(); // the reader, from the room
const sets = { body: [], glow: [], through: [] };
for (const e of stage.querySelectorAll("*")) {
  if (!(e instanceof HTMLElement) || !e.offsetWidth || !e.offsetHeight) continue;
  if (SKIP.test(e.className) || e.closest(".shade, .tags")) continue;
  const cs = getComputedStyle(e);
  if (cs.visibility === "hidden" || cs.display === "none") continue;
  let op = 1;
  for (let a = e; a && a !== stage; a = a.parentElement) op *= +getComputedStyle(a).opacity;
  if (op < 0.3) continue;
  const glow = e.matches(MAY);
  // a face is what paints more than a tint: a colour, a gradient or a picture
  if (!glow && cs.backgroundImage === "none" && alpha(cs.backgroundColor) < 0.5 && e.tagName !== "IMG") continue;
  const m = ROOM.toStage(e);
  const q = [[0, 0], [e.offsetWidth, 0], [e.offsetWidth, e.offsetHeight], [0, e.offsetHeight]].map(([x, y]) => {
    const p = m.transformPoint(new DOMPoint(x, y, 0));
    return new THREE.Vector3(p.x, p.y, p.z);
  });
  const n = new THREE.Vector3().subVectors(q[1], q[0]).cross(new THREE.Vector3().subVectors(q[3], q[0])).normalize();
  if (!isFinite(n.x)) continue;
  if (n.dot(TOWARD) < 0) {
    n.negate(); // the side the reader sees, and its corners round that way
    q.reverse();
  }
  const big = q[0].distanceTo(q[1]) * q[0].distanceTo(q[3]) > 2e6; // a wall, the floor: lit, casts nothing
  const into = glow ? "glow" : e.closest(".window") && !e.matches(".mullion") || e.closest(".jar .glass") ? "through" : big ? "big" : "body";
  (sets[into] ||= []).push({ q, n, e });
}
const cam = new THREE.OrthographicCamera();
cam.matrixAutoUpdate = false;
function mesh(faces, mat) {
  const pos = [],
    nrm = [];
  for (const { q, n } of faces)
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(q[i].x, q[i].y, q[i].z);
      nrm.push(n.x, n.y, n.z);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  const me = new THREE.Mesh(g, mat);
  me.frustumCulled = false;
  return me;
}
const lit = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
const scene = new THREE.Scene();
const body = mesh(sets.body, lit);
body.castShadow = body.receiveShadow = true;
const big = mesh(sets.big || [], lit);
big.receiveShadow = true;
const glowing = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const glows = sets.glow.map((f) => {
  const m = mesh([f], lit);
  m.receiveShadow = true;
  m.userData.e = f.e;
  return m;
});
scene.add(body, big, ...glows);
// the back wall for the light from outside: solid but for the window
{
  const W = { x0: 420, x1: 1020, z0: 280, z1: 660 },
    y = -201,
    walls = [[-3200, W.x0, -560, 3000], [W.x1, 1400, -560, 3000], [W.x0, W.x1, -560, W.z0], [W.x0, W.x1, W.z1, 3000]].map(([x0, x1, z0, z1]) => ({
      q: [new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z0), new THREE.Vector3(x1, y, z1), new THREE.Vector3(x0, y, z1)],
      n: new THREE.Vector3(0, 1, 0),
    }));
  const wall = mesh(walls, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  wall.castShadow = true;
  scene.add(wall);
}

// ---- the camera: the CSS room's own projection, measured -------------------------------------
function frame() {
  const o = ROOM.toScreen(0, 0, 0),
    ax = [ROOM.toScreen(1000, 0, 0), ROOM.toScreen(0, 1000, 0), ROOM.toScreen(0, 0, 1000)].map((p) => [(p[0] - o[0]) / 1000, (p[1] - o[1]) / 1000]);
  const nn = new THREE.Vector3(ax[0][0], ax[1][0], ax[2][0]).cross(new THREE.Vector3(ax[0][1], ax[1][1], ax[2][1])).normalize();
  if (nn.z < 0) nn.negate();
  const W = innerWidth,
    H = innerHeight,
    R = 12000;
  cam.projectionMatrix.set(
    (2 * ax[0][0]) / W, (2 * ax[1][0]) / W, (2 * ax[2][0]) / W, (2 * o[0]) / W - 1,
    (-2 * ax[0][1]) / H, (-2 * ax[1][1]) / H, (-2 * ax[2][1]) / H, 1 - (2 * o[1]) / H,
    -nn.x / R, -nn.y / R, -nn.z / R, 0,
    0, 0, 0, 1,
  );
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}

// ---- the lights --------------------------------------------------------------------------------
const sky = new THREE.HemisphereLight(0xffffff, 0x808890, 1);
scene.add(sky);
const lamps = {};
for (const s of ROOM.lights()) {
  let l;
  if (s.name === "window") {
    l = new THREE.DirectionalLight(s.color, 1);
    l.position.set(...s.at);
    l.target.position.set(s.at[0], s.at[1] + 1000, s.at[2] - 1200);
    scene.add(l.target);
    Object.assign(l.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 6000 });
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.radius = 3;
  } else {
    l = new THREE.PointLight(s.color, 1, s.reach ? s.reach * 1.6 : 0, s.reach ? 1 : 0);
    l.position.set(...s.at);
    Object.assign(l.shadow.camera, { near: 5, far: 6000 });
    l.shadow.mapSize.set(1024, 1024);
    l.shadow.radius = 4;
  }
  l.castShadow = true;
  l.shadow.bias = -0.0008;
  l.shadow.normalBias = 1.5;
  lamps[s.name] = l;
  scene.add(l);
}
const DAY = { sky: 0.8, room: 1.3, window: 1.4 },
  NIGHT = { sky: 0.24, window: 2.4, screen: 2.2, radio: 2.2 };
function shine() {
  const dark = !ROOM.lights().some((s) => s.name === "room" && s.power);
  const k = dark ? NIGHT : DAY;
  for (const s of ROOM.lights()) {
    const l = lamps[s.name];
    l.color.set(s.color);
    l.intensity = s.power * (k[s.name] ?? 1);
    l.visible = l.castShadow = s.power > 0;
  }
  for (const m of glows) m.material = m.userData.e.matches(GLOWS) ? glowing : lit;
  sky.intensity = k.sky;
  sky.color.set(dark ? 0x8090d0 : 0xffffff);
  sky.groundColor.set(dark ? 0x30344a : 0xa0a4ac);
}

// ---- drawing: over the page, multiplied -------------------------------------------------------
const cv = document.createElement("canvas");
cv.className = "prototype-gl";
cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:11;pointer-events:none;mix-blend-mode:multiply";
document.body.append(cv);
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setClearColor(0xffffff, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(devicePixelRatio);
// the CSS room's projection is a mirror's, so what faces the reader is wound the way a back is:
// which way a front winds is turned round for everything drawn
{
  const gl = renderer.getContext(),
    front = gl.frontFace.bind(gl);
  gl.frontFace = (m) => front(m === gl.CW ? gl.CCW : gl.CW);
  gl.frontFace(gl.CCW);
}
// Willy, for the light pass: his body (not its fur or outline) borrowed from his own scene, white,
// where he stands in the room (his world's y runs the other way)
const him = new THREE.Group();
him.scale.set(1, -1, 1);
scene.add(him);
function render() {
  const w = window.__willyScene;
  if (!w) return renderer.render(scene, cam);
  const [x, y, h] = w.here();
  him.position.set(x, y, h);
  const hidden = [],
    mats = w.skinned.map((m) => m.material);
  w.holder.traverse((o) => {
    if (o.isMesh && !w.skinned.includes(o) && o.visible) {
      o.visible = false;
      hidden.push(o);
    }
  });
  w.skinned.forEach((m) => {
    m.material = lit;
    m.castShadow = m.receiveShadow = true;
  });
  him.add(w.holder);
  renderer.render(scene, cam);
  w.scene.add(w.holder);
  w.skinned.forEach((m, i) => (m.material = mats[i]));
  hidden.forEach((o) => (o.visible = true));
}
function draw() {
  renderer.setSize(innerWidth, innerHeight, false);
  frame();
  shine();
  const t = performance.now();
  render();
  return performance.now() - t;
}
// drawn again whenever Willy is
let drawnWas = -1;
(function follow() {
  const w = window.__willyScene;
  if (w && w.drawn !== drawnWas && !cv.hidden) {
    drawnWas = w.drawn;
    render();
  }
  requestAnimationFrame(follow);
})();
const built = performance.now() - t0;
const first = draw();
window.__glInfo = `${Object.entries(sets).map(([k, v]) => k + " " + v.length).join(", ")} faces, built in ${built.toFixed(0)} ms, first frame ${first.toFixed(0)} ms`;
console.log(window.__glInfo);
ROOM.onLights(draw);
addEventListener("resize", draw);
addEventListener("keydown", (e) => {
  if (e.key !== "g") return;
  cv.hidden = !cv.hidden;
  document.documentElement.classList.toggle("gl", !cv.hidden);
});
// how long a frame takes on the GPU, drawn 60 times
window.__glBench = () =>
  new Promise((done) => {
    let n = 0;
    const t = performance.now();
    const step = () => {
      renderer.render(scene, cam);
      renderer.getContext().finish();
      if (++n < 60) requestAnimationFrame(step);
      else done((performance.now() - t) / n);
    };
    requestAnimationFrame(step);
  });
window.__gl = { scene, cam, renderer, draw, lamps, sets };
