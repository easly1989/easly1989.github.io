// coordinator-monitor's crab in the room (index.html?room): the plush of assets/plush/plush.js,
// hung by its suction cup on the back wall where room.js puts its link (ROOM.plush). It is drawn
// flat on the wall, a canvas in the link's own plane holding what the reader sees of the model at
// each point of the wall behind it, as room-mouse.js draws the mouse on the desk; so the browser
// sorts it with the wall. It is drawn in the light it was approved in, and its soft shadow on the
// wall in a canvas behind it; the room's light pass (room-light.js) lights it again as the room is
// lit, as ROOM.plush.body: by day it barely changes it, by night it is as dark as the wall. It
// swings a few times about its cup as the room arrives and when it is pointed at or has the focus,
// and bounces on its cord when tugged (morph.js), drawn again only while it moves; it only ever
// turns and drops in the wall's plane, its back on the wall. Under reduced motion it never moves
// on its own. Without WebGL 2, or if anything here fails, the room keeps its picture (room.js).
let ready;
ROOM.holdLight(new Promise((r) => (ready = r)));
const still = matchMedia("(prefers-reduced-motion: reduce)");

// a swing: from SWING radians each way, a full one every PERIOD s, dying away over DECAY s, done
// once less than a hair is left; a tug: the toy pulled DROP model units down its cord and bouncing
// back, a bounce every BOUNCE s, dying away over SPRING s
const SWING = 0.12,
  PERIOD = 1.15,
  DECAY = 1,
  DROP = 0.28,
  BOUNCE = 0.22,
  SPRING = 0.15;

async function start() {
  await ROOM.ready;
  await ROOM.landed(); // (setting it up takes the main thread for a moment, and the morph would stop for it)
  const P = ROOM.plush;
  if (!P) return;
  const [THREE, M] = await Promise.all([import("three"), import("./assets/plush/plush.js")]);
  const el = P.el,
    [cx, cy] = P.cup,
    { S, left, up, scale } = M.ON_WALL,
    x0 = cx - left,
    y0 = cy - up;

  const place = "position:absolute;left:" + x0 + "px;top:" + y0 + "px;width:" + S + "px;height:" + S + "px;pointer-events:none";
  const cv = document.createElement("canvas");
  cv.className = "plush-model";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = place;
  // its shadow, on the wall under it
  const dark = document.createElement("canvas");
  dark.className = "plush-model";
  dark.setAttribute("aria-hidden", "true");
  dark.style.cssText = place + ";transform:translateZ(-1px)";
  const pen = dark.getContext("2d");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  const scene = new THREE.Scene();
  const toy = M.plush();
  const holder = new THREE.Group();
  holder.matrixAutoUpdate = false;
  holder.matrix.copy(M.onPlane(scale, cx, cy));
  holder.add(toy.root);
  scene.add(holder);
  M.look(renderer, scene, { up: new THREE.Vector3(0, 1, 0), left: new THREE.Vector3(-1, 0, 0), front: new THREE.Vector3(0, 0, 1) });
  const cam = new THREE.OrthographicCamera();

  // what of it the light pass lights: its felt and eyes, where they hang now, in the room
  const hang = () => {
    toy.root.updateWorldMatrix(true, true);
    return toy.hang.matrixWorld;
  };
  const mat = (m) => new THREE.Matrix4().fromArray(m.toFloat64Array());
  // (the link's px are y down, the scene's y up: a mirror, which three.js would take to turn its
  // faces round, and light their backs; so mirrored again across its own middle, where it is the
  // same either way)
  const across = new THREE.Matrix4().makeScale(-1, 1, 1);
  P.body = { geometry: toy.body(), matrix: () => mat(ROOM.toStage(el)).multiply(M.UP).multiply(hang()).multiply(across) };

  // Where each point of it meets the wall along the way the reader looks (plush.js, flat()), from
  // how the link's own axes show on screen now
  let sharp = 0;
  function draw() {
    const m = ROOM.toStage(el),
      at = (x, y, z) => {
        const q = m.transformPoint(new DOMPoint(x, y, z));
        return ROOM.toScreen(q.x, q.y, q.z);
      },
      o = at(0, 0, 0),
      [ax, ay, az] = [at(1, 0, 0), at(0, 1, 0), at(0, 0, 1)].map((v) => [v[0] - o[0], v[1] - o[1]]),
      det = ax[0] * ay[1] - ay[0] * ax[1],
      p = (az[0] * ay[1] - ay[0] * az[1]) / det,
      q = (ax[0] * az[1] - az[0] * ax[1]) / det;
    // (sharp at the size it is on screen, a little over)
    const k = Math.min(4, devicePixelRatio * Math.hypot(...ax) * 1.5);
    if (k !== sharp) {
      sharp = k;
      renderer.setPixelRatio(k);
      renderer.setSize(S, S, false);
      dark.width = dark.height = cv.width;
    }
    M.flat(cam, { p, q, x0, y0, S, R: 4 * S });
    renderer.render(scene, cam);
    M.shadow(pen, cv, cv.width / S); // (in the same task, while the canvas still holds what it drew)
  }
  await renderer.compileAsync(scene, cam, scene); // (its shells' programs in the background, not in its first frame)
  draw();
  el.append(dark, cv);
  const pic = el.querySelector(".plush-pic");
  if (pic) pic.hidden = true;
  if (P.moved) P.moved(); // (the light pass may have started without it)
  // drawn again when the window changes
  addEventListener("resize", () => requestAnimationFrame(draw));

  // moving: each frame until what moves it is over, the light pass told
  let swingAt = -1e9,
    swingBy = 0,
    tugAt = -1e9,
    until = 0,
    running = false;
  const frame = () => {
    const now = performance.now(),
      s = (now - swingAt) / 1000,
      t = (now - tugAt) / 1000,
      angle = s * 1000 < swingFor ? swingBy * Math.exp(-s / DECAY) * Math.sin((2 * Math.PI * s) / PERIOD) : 0,
      drop = t * 1000 < P.ms ? DROP * Math.exp(-t / SPRING) * Math.sin((2 * Math.PI * t) / BOUNCE) : 0;
    toy.pose(angle, drop);
    draw();
    if (P.moved) P.moved();
    running = now < until;
    if (running) requestAnimationFrame(frame);
  };
  const run = (ms) => {
    until = Math.max(until, performance.now() + ms);
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  };
  const swingFor = 1000 * DECAY * Math.log(SWING / 0.002);
  // (pointed at again while it still swings hard, it carries on as it was)
  const swing = (by = SWING) => {
    if (still.matches) return;
    const s = (performance.now() - swingAt) / 1000;
    if (s * 1000 < swingFor && swingBy * Math.exp(-s / DECAY) > by / 2) return;
    swingAt = performance.now();
    swingBy = by;
    run(swingFor);
  };
  ["mouseenter", "focus"].forEach((ev) => el.addEventListener(ev, () => swing()));
  P.tug = (done) => {
    tugAt = performance.now();
    swing(SWING / 2);
    run(P.ms);
    setTimeout(done, P.ms);
  };
  // and while it turns to face the reader, or back (morph.js)
  el.addEventListener("transitionrun", (e) => {
    if (e.target === el) run(800);
  });
  swing();
}

start()
  .catch((e) => {
    document.querySelectorAll("canvas.plush-model").forEach((c) => c.remove());
    const P = ROOM.plush;
    if (P) {
      delete P.body;
      const pic = P.el.querySelector(".plush-pic");
      if (pic) pic.hidden = false;
    }
    console.warn("No plush:", e);
  })
  .finally(() => ready());
