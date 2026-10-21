// PROTOTYPE, throwaway. It answers one question from the room map: can a three.js
// canvas standing inside the CSS preserve-3d room carry the cat? The cat walks a
// fixed route: across the mat, behind the computer and out again (peekaboo), then
// on the floor behind the chair. A panel shows the frame rate and the current step.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const FLOOR = -560;
const CAT_SCALE = 55; // room px per model unit: about 310 px nose to tail tip
const W = 480;
const H = 480;
const ANCHOR_Z = 70; // the billboard stands at the body's middle, not at the feet
const BIAS = 40; // and a little towards the viewer, so the ground under it stays behind
const SPEED = 95; // px per second
const STRIDE = 150; // px the walk cycle covers once round, to keep the feet on the ground

const q = new URLSearchParams(location.search);
const room = document.querySelector(".room");
const stage = document.querySelector(".stage");

// The chair, pulled up to the desk's front edge where its back shows in the frame.
// With today's camera only the top of its back is in view: the seat and the floor
// fall below the bottom edge of the screen.
const chair = document.querySelector(".room .chair");
if (chair) {
  chair.style.left = (q.get("cx") || 560) + "px";
  chair.style.top = (q.get("cy") || 850) + "px";
  chair.style.transform = "rotateZ(" + (q.get("cr") || 0) + "deg)";
}

// ?nonight: the lights-off overlay (a full-screen multiply blend) taken away, to measure it
if (q.has("nonight")) document.querySelectorAll(".night").forEach((n) => n.remove());
// ?lite=<selectors>: hide some of the room, to measure what its planes cost
if (q.get("lite")) document.querySelectorAll(q.get("lite")).forEach((n) => (n.style.display = "none"));
const hud = document.createElement("pre");
hud.className = "proto-hud";
hud.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99;margin:0;padding:10px 12px;background:rgba(20,20,20,.82);color:#e9f5e6;font:12px/1.45 'IBM Plex Mono',monospace;border-radius:6px;pointer-events:none;white-space:pre";
document.body.appendChild(hud);

const cv = document.createElement("canvas");
cv.className = "cat3d";
cv.style.cssText = "position:absolute;left:0;top:0;width:" + W + "px;height:" + H + "px;pointer-events:none";
(q.has("outside") ? document.body : room).appendChild(cv); // ?outside: not in the 3D scene

function place(x, y, z) {
  // a plane facing the screen: the room's own rotation undone, about the canvas centre
  const b = BIAS / Math.sqrt(3);
  const px = x - b,
    py = y + b,
    pz = z + ANCHOR_Z + b;
  cv.style.transform = "translate3d(" + (px - W / 2) + "px," + (py - H / 2) + "px," + pz + "px) rotateZ(45deg) rotateX(-54.7356deg)";
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
} catch (e) {
  cv.remove();
  hud.textContent = "no WebGL 2: the cat is left out\n" + e.message;
  throw e;
}
const cssScale = () => (parseFloat(getComputedStyle(stage).getPropertyValue("--s")) || 1) * (parseFloat(getComputedStyle(stage).getPropertyValue("--zoom")) || 0.72);
function resize() {
  renderer.setPixelRatio(devicePixelRatio * cssScale());
  renderer.setSize(W, H, false);
}
resize();
addEventListener("resize", resize);

// three's world is the room with y flipped (x right, y towards the back wall, z up),
// seen by an orthographic camera from the same isometric angle as the CSS stage
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 6000);
cam.up.set(0.408, 0.408, 0.816).normalize();
const target = new THREE.Vector3(0, 0, ANCHOR_Z);
cam.position.copy(target).addScaledVector(new THREE.Vector3(-1, -1, 1).normalize(), 3000);
cam.lookAt(target);

const sky = new THREE.HemisphereLight(0xffffff, 0x5a6470, 1.7);
sky.position.set(0, 0, 1);
scene.add(sky);
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(-0.6, 0.9, 1.2);
scene.add(sun);

const gltf = await new GLTFLoader().loadAsync("cat.glb");
const holder = new THREE.Group();
const model = gltf.scene;
model.rotation.x = Math.PI / 2; // glTF is y-up; the room is z-up
model.scale.setScalar(CAT_SCALE);
holder.add(model);
scene.add(holder);

const names = [];
const skinned = [];
model.traverse((o) => {
  names.push(o.type + ":" + o.name);
  if (o.isMesh) o.frustumCulled = false;
  if (o.isSkinnedMesh) skinned.push(o);
});
// a thin dark outline: the body again, a hair larger, drawn from the inside
for (const mesh of skinned) {
  const g = mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (!["position", "skinIndex", "skinWeight"].includes(k)) g.deleteAttribute(k);
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x262626, side: THREE.BackSide });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normal * 0.022;");
  };
  const hull = new THREE.SkinnedMesh(merged, mat);
  hull.frustumCulled = false;
  hull.position.copy(mesh.position);
  hull.quaternion.copy(mesh.quaternion);
  hull.scale.copy(mesh.scale);
  mesh.parent.add(hull);
  hull.bind(mesh.skeleton, mesh.bindMatrix);
}

const mixer = new THREE.AnimationMixer(model);
const clipNamed = (n) => gltf.animations.find((a) => a.name.toLowerCase().includes(n));
const walk = mixer.clipAction(clipNamed("walk"));
const idle = mixer.clipAction(clipNamed("idle"));
walk.play();
idle.play();
const clipLen = clipNamed("walk").duration;
let walking = 1;
let placedOnce = false;

// the route, in room px; z is the height of what the cat stands on (the mat top is 0)
const ROUTE = [
  { say: "on the mat", at: [430, 150, 0] },
  { say: "walks behind the computer", to: [0, 200, 0] },
  { say: "hidden behind it", idle: 1500 },
  { say: "peeks out", to: [60, 260, 0] },
  { say: "peekaboo", idle: 1800, face: [1, 1] },
  { say: "back behind", to: [0, 200, 0] },
  { say: "hidden again", idle: 1200 },
  { say: "out across the mat to the desk's front edge", to: [480, 990, 0] },
  { say: "walks behind the chair's back", to: [1060, 990, 0] },
  { say: "sits there", idle: 1600 },
  { say: "walks back behind the chair", to: [480, 990, 0] },
  { say: "back to the start", to: [430, 150, 0] },
];
let step = -1;
let stepStart = 0;
const pos = new THREE.Vector3();
let heading = 0;
let wantHeading = 0;

function begin(now) {
  step = (step + 1) % ROUTE.length;
  stepStart = now;
  const s = ROUTE[step];
  if (s.at) pos.set(s.at[0], s.at[1], s.at[2]);
  if (s.to) {
    const dx = s.to[0] - pos.x,
      dy = s.to[1] - pos.y;
    wantHeading = Math.atan2(-dy, dx); // room y runs towards the viewer; three's the other way
  }
  if (s.face) wantHeading = Math.atan2(-s.face[1], s.face[0]);
}

const times = [];
let last = performance.now();
const freeze = q.has("freeze"); // a fixed step and time, for screenshots
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  times.push(now);
  while (times.length && now - times[0] > 1000) times.shift();
  if (step < 0) begin(now);
  const s = hold || ROUTE[step];
  let moving = false;
  if (s.to) {
    const dx = s.to[0] - pos.x,
      dy = s.to[1] - pos.y;
    const d = Math.hypot(dx, dy);
    const stepPx = SPEED * dt;
    if (d <= stepPx) {
      pos.x = s.to[0];
      pos.y = s.to[1];
      pos.z = s.to[2];
      begin(now);
    } else {
      pos.x += (dx / d) * stepPx;
      pos.y += (dy / d) * stepPx;
      moving = true;
    }
  } else if (s.idle) {
    if (!hold && now - stepStart > s.idle) begin(now);
  } else begin(now);
  // turn towards where it is going, the short way round
  let dh = wantHeading - heading;
  dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  heading += dh * Math.min(1, dt * 8);
  holder.rotation.z = heading;
  // cross-fade between walking and standing; the walk cycle keeps pace with the ground
  if (s.walkInPlace) moving = true;
  walking += ((moving ? 1 : 0) - walking) * Math.min(1, dt * 6);
  walk.setEffectiveWeight(walking);
  idle.setEffectiveWeight(1 - walking);
  walk.timeScale = (SPEED / STRIDE) * clipLen;
  mixer.update(dt);
  if (!q.has("noplace") || !placedOnce) place(pos.x, pos.y, pos.z); // ?noplace: the canvas stays put
  placedOnce = true;
  if (!q.has("nocat")) renderer.render(scene, cam); // ?nocat: the same page, the cat not drawn
  if (!q.has("nohud")) hud.textContent =
    "PROTOTYPE: the real-time cat in the CSS 3D room\n" +
    "fps            " + times.length + "\n" +
    "step           " + (hold ? "-" : step + 1 + "/" + ROUTE.length) + "  " + s.say + "\n" +
    "cat at         " + pos.x.toFixed(0) + ", " + pos.y.toFixed(0) + ", " + pos.z.toFixed(0) + "\n" +
    "walk weight    " + walking.toFixed(2) + "\n" +
    "canvas px      " + cv.width + " x " + cv.height + "\n" +
    "draw calls     " + renderer.info.render.calls + "  triangles " + renderer.info.render.triangles + "\n" +
    "three.js       r" + THREE.REVISION;
});
// for screenshots: hold the cat at a place and heading, walking or standing
let hold = null;
window.__hold = (x, y, z, h, walk) => {
  pos.set(x, y, z);
  wantHeading = heading = (h * Math.PI) / 180;
  hold = walk ? { say: "held, walking", idle: 1, walkInPlace: true } : { say: "held", idle: 1 };
};
window.__proto = { names, ROUTE, pos, jump: (i) => { step = i - 1; begin(performance.now()); }, freeze };
