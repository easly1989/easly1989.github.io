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
(q.has("outside") || q.has("closeup") ? document.body : room).appendChild(cv);
if (q.has("closeup")) cv.style.cssText = "position:fixed;right:20px;top:70px;width:640px;height:640px;z-index:98;background:#2d5a4e;border-radius:8px"; // ?outside: not in the 3D scene

function place(x, y, z) {
  if (q.has("closeup")) return;
  // a plane facing the screen: the room's own rotation undone, about the canvas centre
  const b = BIAS / Math.sqrt(3);
  const px = x - b,
    py = y + b,
    pz = z + ANCHOR_Z + b;
  if (cssShadow) cssShadow.style.transform = "translate3d(" + (x - 125) + "px," + (y - 60) + "px," + (z + 0.5) + "px) rotateZ(" + (-heading * 180 / Math.PI) + "deg)";
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
// the canvas is drawn at the size the stage's scale shows it at (the close-up: at 640 px)
const cssScale = () => (q.has("closeup") ? 640 / W : (parseFloat(getComputedStyle(stage).getPropertyValue("--s")) || 1) * (parseFloat(getComputedStyle(stage).getPropertyValue("--zoom")) || 0.72));
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
if (q.has("closeup")) {
  cam.zoom = 2.8;
  cam.updateProjectionMatrix();
}

const sky = new THREE.HemisphereLight(0xffffff, 0x5a6470, 1.7);
sky.position.set(0, 0, 1);
scene.add(sky);
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(-0.6, 0.9, 1.2);
scene.add(sun);
// MEASURE: ?lights=N adds N point lights, one per light source in the room
for (let i = 0; i < +(q.get("lights") || 0); i++) {
  const l = new THREE.PointLight([0xb2c6ff, 0x7dff9a, 0xffd08a, 0xfff2dd][i % 4], 1.2, 1600, 1.5);
  l.position.set(-400 + i * 300, 200 + i * 150, 300);
  scene.add(l);
}

const gltf = await new GLTFLoader().loadAsync("cat.glb");
const holder = new THREE.Group();
const model = gltf.scene;
model.rotation.x = Math.PI / 2; // glTF is y-up; the room is z-up
// a little chonky: wider and a touch deeper in the body (?nochonk for the model as it is)
if (q.has("nochonk")) model.scale.setScalar(CAT_SCALE);
else model.scale.set(CAT_SCALE, CAT_SCALE * 1.04, CAT_SCALE * 1.16); // glTF z is the cat's width
holder.add(model);
scene.add(holder);
// MEASURE: ?shadow=gl a soft blob under the cat, ?shadow=map a real shadow from the sun,
// ?shadow=css a blob on the desk drawn by the room, outside the cat's canvas
const SHADOW = q.get("shadow") || "";
if (SHADOW === "gl") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(0.55, "rgba(0,0,0,.3)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(250, 120), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  blob.position.z = 0.5;
  blob.renderOrder = -1;
  holder.add(blob);
}
if (SHADOW === "map") {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sun.position.set(-300, 450, 600);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 2000 });
  sun.shadow.radius = 6;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.receiveShadow = true;
  ground.position.z = 0.5;
  scene.add(ground);
  model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
}
let cssShadow = null;
if (SHADOW === "css") {
  cssShadow = document.createElement("span");
  cssShadow.style.cssText = "position:absolute;left:0;top:0;width:250px;height:120px;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,rgba(0,0,0,.5),rgba(0,0,0,.28) 55%,transparent);filter:blur(3px)";
  room.appendChild(cssShadow);
}

const names = [];
const skinned = [];
model.traverse((o) => {
  names.push(o.type + ":" + o.name);
  if (o.isMesh) o.frustumCulled = false;
  if (o.isSkinnedMesh) skinned.push(o);
});
// Smooth normals, shared across the body's pieces, so it reads as a soft animal and
// not as faceted plastic. The pieces split along their seams; this joins them by position.
const key = (a, i) => Math.round(a.getX(i) * 1e4) + "," + Math.round(a.getY(i) * 1e4) + "," + Math.round(a.getZ(i) * 1e4);
if (!q.has("flat")) {
  const acc = new Map();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  for (const mesh of skinned) {
    const g = mesh.geometry, p = g.attributes.position, idx = g.index;
    const n = idx ? idx.count : p.count;
    for (let t = 0; t < n; t += 3) {
      const ia = idx ? idx.getX(t) : t, ib = idx ? idx.getX(t + 1) : t + 1, ic = idx ? idx.getX(t + 2) : t + 2;
      va.fromBufferAttribute(p, ia); vb.fromBufferAttribute(p, ib); vc.fromBufferAttribute(p, ic);
      const f = vc.clone().sub(vb).cross(va.clone().sub(vb)); // area-weighted
      for (const i of [ia, ib, ic]) {
        const k = key(p, i);
        const s = acc.get(k);
        if (s) s.add(f); else acc.set(k, f.clone());
      }
    }
  }
  for (const mesh of skinned) {
    const g = mesh.geometry, p = g.attributes.position, nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const v = acc.get(key(p, i)).clone().normalize();
      nr.setXYZ(i, v.x, v.y, v.z);
    }
    nr.needsUpdate = true;
  }
}
// matte, so the coat does not shine like plastic (?gloss for the exported material)
if (!q.has("gloss")) for (const mesh of skinned) mesh.material = new THREE.MeshLambertMaterial({ map: mesh.material.map });

// Fur: a few shells over the body, each a hair further out, with fewer and fewer
// strands kept the further out it is. The coat's own colour carries through. (?nofur)
const FUR = q.get("fur") ? +q.get("fur") : 0.15; // model units, about 8 px
const SHELLS = q.get("shells") ? +q.get("shells") : 14;
const SREP = q.get("srep") ? +q.get("srep") : 26; // strands across the coat: fewer is coarser
const COMB = q.get("comb") ? +q.get("comb") : 0.9; // how far the tips lean back and down
if (!q.has("nofur")) {
  const n = 128, data = new Uint8Array(n * n);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 255;
  const strands = new THREE.DataTexture(data, n, n, THREE.RedFormat);
  strands.wrapS = strands.wrapT = THREE.RepeatWrapping;
  strands.magFilter = strands.minFilter = THREE.NearestFilter; // one texel, one strand
  strands.needsUpdate = true;
  for (let i = 1; i <= SHELLS; i++) {
    const t = i / SHELLS;
    const h = FUR * t, keep = 0.3 + 0.65 * t * t, shade = 0.8 + 0.2 * t, tip = 0.07 * t;
    // combed: the further out, the more a strand leans towards the tail and down
    const lean = COMB * h * t;
    for (const mesh of skinned) {
      const m = new THREE.MeshLambertMaterial({ map: mesh.material.map });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.strands = { value: strands };
        sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normal * " + h.toFixed(4) + " + vec3(-0.75, -0.65, 0.0) * " + lean.toFixed(4) + ";");
        sh.fragmentShader =
          "uniform sampler2D strands;\n" +
          sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n  float s = texture2D(strands, vMapUv * " + SREP.toFixed(1) + ").r;\n  if (s < " + keep.toFixed(3) + ") discard;\n  diffuseColor.rgb = diffuseColor.rgb * " + shade.toFixed(3) + " * (0.9 + 0.2 * s) + " + tip.toFixed(3) + ";");
      };
      const shell = new THREE.SkinnedMesh(mesh.geometry, m);
      shell.frustumCulled = false;
      shell.position.copy(mesh.position);
      shell.quaternion.copy(mesh.quaternion);
      shell.scale.copy(mesh.scale);
      mesh.parent.add(shell);
      shell.bind(mesh.skeleton, mesh.bindMatrix);
    }
  }
  // the body under the fur is a little darker, as the roots are
  for (const mesh of skinned) mesh.material.color.setScalar(0.82);
}

// a thin dark outline: the body again, a hair larger, drawn from the inside
// with fur it sits inside the coat, so the strands fray the edge beyond it
const OUTLINE = q.has("nofur") ? 0.022 : FUR * (q.get("oline") ? +q.get("oline") : 0.22);
for (const mesh of skinned) {
  const g = mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (!["position", "skinIndex", "skinWeight"].includes(k)) g.deleteAttribute(k);
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x262626, side: THREE.BackSide });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normal * " + OUTLINE.toFixed(4) + ";");
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
