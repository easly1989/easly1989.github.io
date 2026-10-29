// The computer's mouse in the room (index.html?room), assets/mouse/mouse.glb, where room.js
// keeps it (ROOM.mouse: an empty .pc-mouse it slides and turns when Willy knocks it). It is
// drawn lying on the desk: a canvas flat in .pc-mouse, so it goes wherever that goes, holding
// what the reader sees of the model at each point of the desk under it, the model squashed down
// along the way the reader looks. So the browser sorts it with the desk as the CSS room's own
// flat things are, and whatever stands in front of the mouse hides it. It is drawn in its own
// colours only; the room's light pass (room-light.js) lights it, as ROOM.mouse.body. Without
// WebGL 2, or if it fails to load, there is no mouse.
let THREE; // (loaded once the room is built, as the light pass's is, so the room never waits on it)

const BODY = 0xd6ccb2; // the computer's beige (room.css, .pc)
const WHEEL = 0x6f6858;
const SPAN = 2.2; // the canvas, square, as many times the mouse's length: room for it squashed any way

// (the room's light waits for it, as for Willy, so it is not lit up without its mouse)
let ready;
ROOM.holdLight(new Promise((r) => (ready = r)));

async function start() {
  await ROOM.ready;
  await ROOM.landed(); // (setting it up takes the main thread for a moment, and the morph would stop for it)
  const anchor = document.querySelector(".pc .pc-mouse");
  if (!anchor || !ROOM.mouse) return;
  let GLTFLoader;
  [THREE, { GLTFLoader }] = await Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js")]);
  const gltf = await new GLTFLoader().loadAsync("assets/mouse/mouse.glb");
  let geo;
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (o.isMesh && !geo) geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
  });
  // its colours by where they were on the model's palette: the wheel is its grey patch, at the
  // top left, the rest is body
  const uv = geo.attributes.uv,
    col = new Float32Array(3 * uv.count),
    body = new THREE.Color(BODY),
    wheel = new THREE.Color(WHEEL);
  for (let i = 0; i < uv.count; i++) (uv.getX(i) < 0.25 && uv.getY(i) < 0.19 ? wheel : body).toArray(col, 3 * i);
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeBoundingBox();

  // the model in .pc-mouse's own px: as long as it is, its nose (the model's -z) at the top, its
  // underside on the desk (the model is y-up, .pc-mouse has z up off the desk)
  const w = anchor.offsetWidth,
    d = anchor.offsetHeight,
    bb = geo.boundingBox,
    s = d / (bb.max.z - bb.min.z),
    c = bb.getCenter(new THREE.Vector3());
  const local = new THREE.Matrix4().set(s, 0, 0, w / 2 - s * c.x, 0, 0, s, d / 2 - s * c.z, 0, s, 0, -s * bb.min.y, 0, 0, 0, 1);
  const height = s * (bb.max.y - bb.min.y);
  const mat = (m) => new THREE.Matrix4().fromArray(m.toFloat64Array());
  ROOM.mouse.body = { geometry: geo, matrix: () => mat(ROOM.toStage(anchor)).multiply(local) };

  const S = SPAN * d;
  const cv = document.createElement("canvas");
  cv.className = "pc-mouse-model";
  cv.setAttribute("aria-hidden", "true");
  // (over its cord, which runs out from under it)
  cv.style.cssText = "position:absolute;left:" + (w - S) / 2 + "px;top:" + (d - S) / 2 + "px;width:" + S + "px;height:" + S + "px;transform:translateZ(0.5px);pointer-events:none";
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(local);
  scene.add(mesh);
  const cam = new THREE.Camera();
  anchor.append(cv);

  // Where each point of it meets the desk along the way the reader looks: a step up off the
  // desk shows on screen as the step (p, q) along it does, so a point at height z is seen at
  // (x + p z, y + q z) on the desk; and the nearer the reader, the further along (-p, -q, 1).
  let sharp = 0;
  function draw() {
    const m = ROOM.toStage(anchor),
      at = (x, y, z) => {
        const q = m.transformPoint(new DOMPoint(x, y, z));
        return ROOM.toScreen(q.x, q.y, q.z);
      },
      o = at(0, 0, 0),
      [ax, ay, az] = [at(1, 0, 0), at(0, 1, 0), at(0, 0, 1)].map((v) => [v[0] - o[0], v[1] - o[1]]),
      det = ax[0] * ay[1] - ay[0] * ax[1],
      p = (az[0] * ay[1] - ay[0] * az[1]) / det,
      q = (ax[0] * az[1] - az[0] * ax[1]) / det;
    // (sharp at the size it is on screen, a little over, since squashing stretches it)
    const k = Math.min(4, devicePixelRatio * Math.hypot(...ax) * 1.5);
    if (k !== sharp) {
      sharp = k;
      renderer.setPixelRatio(k);
      renderer.setSize(S, S, false);
    }
    const x0 = (w - S) / 2,
      y0 = (d - S) / 2,
      R = 4 * (S + height);
    cam.projectionMatrix.set(
      2 / S, 0, (2 * p) / S, -1 - (2 * x0) / S,
      0, -2 / S, (-2 * q) / S, 1 + (2 * y0) / S,
      p / R, q / R, -1 / R, 0,
      0, 0, 0, 1,
    );
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    renderer.render(scene, cam);
  }
  draw();
  addEventListener("resize", draw);
  // drawn again as it slides and turns, every frame until it stops, and the light pass told
  let until = 0;
  const frame = () => {
    draw();
    ROOM.mouse.lay();
    if (ROOM.mouse.moved) ROOM.mouse.moved();
    if (performance.now() < until) requestAnimationFrame(frame);
  };
  anchor.addEventListener("transitionrun", (e) => {
    if (e.target !== anchor) return;
    const was = until;
    until = performance.now() + 600;
    if (was < performance.now()) requestAnimationFrame(frame);
  });
  if (ROOM.mouse.moved) ROOM.mouse.moved(); // (the light pass may have started without it)
}

start()
  .catch((e) => {
    // (nor its cord; Willy knocks it about only once it is drawn: willy-life.js)
    document.querySelectorAll("canvas.pc-mouse-model, .pc-mouse-cord").forEach((c) => c.remove());
    if (ROOM.mouse) delete ROOM.mouse.body;
    console.warn("No mouse:", e);
  })
  .finally(() => ready());
