// coordinator-monitor's crab in the room (index.html): the plush of assets/plush/plush.js,
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
// (the room's light waits for it, and so does the light pass for its faces: its picture is one
// only where it is not drawn)
let ready;
const settled = new Promise((r) => (ready = r));
ROOM.holdLight(settled);
if (ROOM.plush) ROOM.plush.settled = settled;

// a swing: up to SWING radians each way, a full one every PERIOD s, dying away over DECAY s (over
// ARRIVE s as the room arrives, about 2.5 s in all; over CALM s when a move starts), done once
// less than a hair is left; a tug: the toy pulled DROP model units down its cord and bouncing
// back, a bounce every BOUNCE s, dying away over SPRING s
const SWING = 0.12,
  PERIOD = 1.15,
  DECAY = 1,
  ARRIVE = 0.6,
  CALM = 0.03,
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
  const geometry = toy.body();
  geometry.computeBoundingSphere();

  // Where each point of it meets the wall along the way the reader looks (plush.js, flat()), from
  // how the link's own axes show on screen now
  let sharp = 0,
    out = false;
  function draw() {
    if (out && !cv.isConnected) return; // (gone: its GPU lost, below)
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
  out = true;
  const pic = el.querySelector(".plush-pic");
  if (pic) pic.hidden = true;
  // the light pass lights it from now on (its own place in the beam: its middle and its size)
  P.body = { geometry, sphere: geometry.boundingSphere, matrix: () => mat(ROOM.toStage(el)).multiply(M.UP).multiply(hang()).multiply(across) };
  if (P.moved) P.moved(); // (the light pass may have started without it)
  // a GPU that resets takes it with it: the picture again
  cv.addEventListener("webglcontextlost", () => {
    gone("its GPU context was lost");
    if (P.moved) P.moved();
  });
  // drawn again when the window changes
  addEventListener("resize", () => requestAnimationFrame(draw));

  // moving: each frame until what moves it is over, the light pass told (and told when only its
  // swing moves it, which the room's shadows need not follow). A swing is
  // e^(-s/d) (a sin ws + b cos ws), s from when it was last pushed: pushed again, it carries on
  // from where it is and as fast, with a more added (push())
  const W = (2 * Math.PI) / PERIOD;
  let swingAt = -1e9,
    a = 0,
    b = 0,
    d = DECAY,
    swingTo = 0,
    tugAt = -1e9,
    tugTo = 0,
    turnTo = 0,
    heldTo = 0,
    running = false;
  const swung = (now) => {
    if (now >= swingTo) return { angle: 0, speed: 0, size: 0 };
    const s = (now - swingAt) / 1000,
      e = Math.exp(-s / d),
      sin = Math.sin(W * s),
      cos = Math.cos(W * s);
    return { angle: e * (a * sin + b * cos), speed: e * ((a * W - b / d) * cos - (b * W + a / d) * sin), size: e * Math.hypot(a, b) };
  };
  const frame = () => {
    if (!cv.isConnected) return (running = false);
    const now = performance.now(),
      t = (now - tugAt) / 1000,
      drop = now < tugTo ? DROP * Math.exp(-t / SPRING) * Math.sin((2 * Math.PI * t) / BOUNCE) : 0;
    toy.pose(swung(now).angle, drop);
    running = now < Math.max(swingTo, tugTo, turnTo);
    P.body.swinging = running && now >= tugTo && now >= turnTo;
    draw();
    if (P.moved) P.moved();
    if (running) requestAnimationFrame(frame);
  };
  const loop = () => {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  };
  // from where it is and as fast, by more (or by nothing, and dying away over decay s)
  const push = (by, decay) => {
    const now = performance.now(),
      was = swung(now);
    d = decay;
    b = was.angle;
    a = (was.speed + b / d) / W;
    if (by) {
      a += a < 0 ? -by : by;
      const k = Math.min(1, SWING / Math.hypot(a, b)); // (as it stands: settling, it may not jump)
      a *= k;
      b *= k;
    }
    swingAt = now;
    swingTo = now + Math.max(0, 1000 * d * Math.log(Math.hypot(a, b) / 0.002));
    loop();
  };
  // (pointed at again while it still swings hard, it carries on as it was; never more than SWING;
  // and never while a move plays)
  const swing = (by = SWING, decay = DECAY) => {
    const now = performance.now();
    if (reducedMotion() || now < heldTo || swung(now).size > by / 2) return;
    push(by, decay);
  };
  // a move starting (any object picked up, or the old computer switched on): it comes to rest in
  // a few frames, as fast as it was going, and stays still until the move is over
  const calm = () => {
    if (performance.now() < swingTo) push(0, CALM);
  };
  addEventListener(
    "click",
    (e) => {
      if (!e.target.closest) return;
      const pc = e.target.closest(".pc");
      // (only switching it on boots it: off, or broken, it does nothing for long)
      const power = e.target.closest(".pc .power") && !pc.classList.contains("on") && !pc.classList.contains("broken");
      if (!power && !e.target.closest("a.thing[href], .pc .use, .snap.out")) return;
      if (!power && (e.button || e.metaKey || e.ctrlKey || e.shiftKey)) return; // (a new tab: no move)
      heldTo = performance.now() + (power ? 3700 : Infinity); // (the computer boots in 3.7 s; a page leaves)
      calm();
    },
    true
  );
  addEventListener("pageshow", () => (heldTo = 0));
  ["mouseenter", "focus"].forEach((ev) => el.addEventListener(ev, () => swing()));
  const pictures = P.tug; // (room.js: its picture's bounce)
  P.tug = (done) => {
    if (!cv.isConnected) return pictures(done);
    tugAt = performance.now();
    tugTo = tugAt + P.ms;
    if (!reducedMotion() && swung(tugAt).size <= SWING / 4) push(SWING / 2, DECAY);
    loop();
    setTimeout(() => {
      calm();
      done();
    }, P.ms);
  };
  // and while it turns to face the reader, or back (morph.js)
  el.addEventListener("transitionrun", (e) => {
    if (e.target !== el) return;
    turnTo = Math.max(turnTo, performance.now() + 800);
    loop();
  });
  swing(SWING, ARRIVE);
}

// no model: its canvases gone, the light pass told, its picture back
function gone(e) {
  document.querySelectorAll("canvas.plush-model").forEach((c) => c.remove());
  const P = ROOM.plush;
  if (P) {
    delete P.body;
    const pic = P.el.querySelector(".plush-pic");
    if (pic) pic.hidden = false;
  }
  console.warn("No plush:", e);
}
start()
  .catch(gone)
  .finally(() => ready());
