// The room's light (index.html?room): real light and shadow over the CSS room. The CSS room
// draws itself as it always has, in its plain colours; this draws the same room again in WebGL,
// every element a face where the CSS room puts it (ROOM.toStage), all of it white, lit by the
// room's sources (ROOM.lights()) with shadow maps. What comes out is how much light reaches
// each pixel, multiplied over the page: a canvas laid flat on the screen, but drawn from the
// room's own shapes, so it knows what stands in front of what. While it runs, the CSS room
// paints no light of its own (room.css, .lit); without WebGL 2, or if anything here fails, it
// never starts and the room is lit as it was, by its painted shadows and the night layer.
let THREE; // (loaded once the room is built, as Willy's is, so the room never waits on it)

let ready;
ROOM.holdLight(new Promise((r) => (ready = r)));

async function start() {
  await ROOM.ready;
  THREE = await import("three");
  const stage = document.querySelector(".stage");
  const cv = document.createElement("canvas");
  cv.className = "light-pass";
  cv.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, failIfMajorPerformanceCaveat: true });
  renderer.setClearColor(0xffffff, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // drawn again only when something casting moves (draw())
  // The CSS room's projection is a mirror's, so whatever faces the reader is wound the way a
  // back is: which way a front winds is turned round for everything drawn.
  {
    const gl = renderer.getContext(),
      front = gl.frontFace.bind(gl);
    gl.frontFace = (m) => front(m === gl.CW ? gl.CCW : gl.CW);
    gl.frontFace(gl.CCW);
  }

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera();
  cam.matrixAutoUpdate = false;
  const { body, big, glows } = faces(stage);
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  const glowing = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const solid = mesh(body, lit);
  solid.castShadow = solid.receiveShadow = true;
  const walls = mesh(big, lit);
  walls.receiveShadow = true;
  const glowMeshes = glows.map((f) => {
    const m = mesh([f], lit);
    m.receiveShadow = true;
    m.userData.e = f.e;
    return m;
  });
  scene.add(solid, walls, ...glowMeshes, windowWall(stage.querySelector(".window")));

  // the sources: the window's a sun or a moon, far off, through the window only; the others
  // lamps where they are
  const sky = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  sky.position.set(0, 0, 1); // (from above: the room's up is its z)
  scene.add(sky);
  const lamps = {};
  for (const s of ROOM.lights()) {
    let l;
    if (s.name === "window") {
      l = new THREE.DirectionalLight(s.color, 1);
      l.position.set(...s.at);
      const win = stage.querySelector(".window"),
        mid = ROOM.toStage(win).transformPoint(new DOMPoint(win.offsetWidth / 2, win.offsetHeight / 2, 0));
      l.target.position.set(mid.x, mid.y, mid.z); // (it shines along the line from s.at to here)
      scene.add(l.target);
      Object.assign(l.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 6000 });
      l.shadow.mapSize.set(2048, 2048);
      l.shadow.radius = 3;
    } else {
      // (as strong wherever it reaches, fading out at the edge of it, like the painted light)
      l = new THREE.PointLight(s.color, 1, s.reach * 1.6, 0);
      l.position.set(...s.at);
      Object.assign(l.shadow.camera, { near: 5, far: 6000 });
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.radius = 4;
    }
    l.shadow.bias = -0.0008;
    l.shadow.normalBias = 1.5;
    lamps[s.name] = l;
    scene.add(l);
  }
  // How strong each is, by day (the room's light on) and by night (off), as the share of a white
  // face it lights when it meets it square on (three.js takes π for all of it): by day the room
  // looks as it did when its light was painted; by night it is as dark as the night layer left
  // it, rgb(40, 46, 80), but where a source reaches.
  const DAY = { sky: 0.6, room: 0.5, window: 0.6, screen: 0.3, radio: 0.3 },
    NIGHT = { sky: 1, window: 1, screen: 0.7, radio: 0.7 };
  const DARK = new THREE.Color("rgb(40, 46, 80)");
  let shadows = true;
  let was = "";
  function shine() {
    const all = ROOM.lights(),
      dark = !all.some((s) => s.name === "room" && s.power),
      k = dark ? NIGHT : DAY;
    // (the shadows are drawn again only when a light did change: the room hears of it on every
    // move of the focus too)
    const now = JSON.stringify(all);
    if (now !== was) shadows = true;
    was = now;
    for (const s of all) {
      const l = lamps[s.name];
      l.color.set(s.color);
      l.intensity = Math.PI * s.power * (k[s.name] ?? 0);
      l.visible = l.castShadow = s.power > 0;
    }
    sky.intensity = Math.PI * k.sky;
    sky.color.copy(dark ? DARK : new THREE.Color(0xffffff));
    sky.groundColor.copy(dark ? DARK : new THREE.Color(0xffffff));
    for (const m of glowMeshes) {
      const on = m.userData.e.matches(GLOWS);
      m.material = on ? glowing : lit;
      m.visible = on || shown(m.userData.e, stage);
    }
    cv.dataset.dark = dark; // (what it draws, for checks/dark.py)
    return dark;
  }

  // Willy: his own canvas lights him for now, so the pass leaves him as he is, white where he
  // is, in his pose
  const him = new THREE.Group();
  him.scale.set(1, -1, 1); // (his world's y runs the other way)
  scene.add(him);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // what has the keyboard's focus, in the dark: lit round it, so its ring shows
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { at: { value: new THREE.Vector4() } },
      vertexShader: "varying vec2 p;\nvoid main() { p = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: `uniform vec4 at;
varying vec2 p;
void main() { float d = length((p - at.xy) / at.zw); gl_FragColor = vec4(vec3(1.0 - smoothstep(0.6, 1.0, d)), 1.0); }`,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
    }),
  );
  ring.frustumCulled = false;
  const front = new THREE.Scene();
  front.add(ring);
  const flat = new THREE.Camera();
  const fit = document.querySelector(".fit");

  let dark = true;
  function draw() {
    const w = ROOM.willy;
    if (w) {
      const [x, y, h] = w.here();
      him.position.set(x, y, h);
    }
    const mats = [],
      home = w && w.holder.parent;
    if (w) {
      w.holder.traverse((o) => {
        if (o.isMesh) {
          mats.push([o, o.material]);
          o.material = white;
        }
      });
      him.add(w.holder);
    }
    renderer.shadowMap.needsUpdate = shadows;
    shadows = false;
    try {
      renderer.render(scene, cam);
    } finally {
      // (he goes back whatever happens, or he would be gone from his own canvas)
      if (w) {
        home.add(w.holder);
        for (const [o, m] of mats) o.material = m;
      }
    }
    const f = document.activeElement;
    if (dark && f && f !== document.body && fit.contains(f) && f.matches(":focus-visible")) {
      const r = f.getBoundingClientRect(),
        W = innerWidth,
        H = innerHeight;
      ring.material.uniforms.at.value.set(((r.left + r.width / 2) / W) * 2 - 1, 1 - ((r.top + r.height / 2) / H) * 2, ((r.width * 0.75 + 40) / W) * 2, ((r.height * 0.75 + 40) / H) * 2);
      renderer.autoClear = false;
      renderer.render(front, flat);
      renderer.autoClear = true;
    }
  }
  function resize() {
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight, false);
    project(cam);
  }
  resize();
  dark = shine();
  draw();
  document.body.append(cv);
  document.documentElement.classList.add("lit");
  // again whenever a light changes, the colour scheme or the window does, or Willy is drawn (in
  // the same frame as he is, or his edges would show the room lit round him);
  // and if it ever fails, or loses its GPU, the room goes back to its painted light
  const guard = (f) => () => {
    if (!cv.isConnected) return;
    try {
      f();
    } catch (e) {
      down(e);
    }
  };
  const relight = guard(() => {
    dark = shine();
    draw();
  });
  const redraw = guard(draw);
  ROOM.onLights(relight);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", relight);
  cv.addEventListener("webglcontextlost", () => down("its GPU context was lost"));
  addEventListener(
    "resize",
    guard(() => {
      resize();
      draw();
    }),
  );
  (function meet() {
    if (!cv.isConnected) return;
    if (!ROOM.willy) return requestAnimationFrame(meet); // (he comes when he has loaded)
    ROOM.willy.drawn = redraw;
    redraw();
  })();
}

// ---- the faces ----------------------------------------------------------------------------------
// not drawn: the painted shadows and light patches, the light painted in the air (the radio's
// lamp and pool, the projector's beam, the steam), what only takes the pointer, Willy's canvases
const SKIP = /\b(shade|anchor|burst|hit-plane|window-light|beam-corner|radio-lamp|radio-pool|proj-beam|steam|willy|willy-low|willy-shadow)\b/;
// what may give light rather than take it, each its own face; and what does now: shown as the
// CSS room paints it, never darkened
const MAY = ".window .sky, .window .pane, .pc .glass, .pc .glass *, .neon h1, .plexi a, .projection, .light-switch, .light-switch *";
const GLOWS = ".window .sky, .window .pane, .pc.on .glass, .pc.on .glass *, .neon h1, .plexi a, .projection.lit, .lights-off .light-switch, .lights-off .light-switch *, .dawn .light-switch, .dawn .light-switch *";
const BIG = 4e6; // px², a wall or the floor: lit, and casting nothing, since nothing is behind it
const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
const alphas = new Map();
// whether it shows: neither hidden nor all but transparent
function shown(e, stage) {
  if (getComputedStyle(e).visibility === "hidden") return false;
  let op = 1;
  for (let a = e; a && a !== stage; a = a.parentElement) op *= +getComputedStyle(a).opacity;
  return op >= 0.3;
}
// how opaque a CSS colour is, as the canvas paints it
function alpha(c) {
  if (!alphas.has(c)) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "rgba(0,0,0,0)";
    probe.fillStyle = c;
    probe.fillRect(0, 0, 1, 1);
    alphas.set(c, probe.getImageData(0, 0, 1, 1).data[3] / 255);
  }
  return alphas.get(c);
}
// every element of the room that paints more than a tint, as its four corners in the room and
// the way it faces, towards the reader; the window's own faces (but its bars) let the light in
function faces(stage) {
  const out = { body: [], big: [], glows: [] },
    toward = new THREE.Vector3(-1, 1, 1).normalize(); // the reader, from the room
  for (const e of stage.querySelectorAll("*")) {
    if (!(e instanceof HTMLElement) || !e.offsetWidth || !e.offsetHeight) continue;
    if (SKIP.test(e.className)) continue;
    const cs = getComputedStyle(e),
      may = e.matches(MAY);
    // (what may glow is kept even while it is hidden: it may come on later)
    if (!may && !shown(e, stage)) continue;
    if (!may && cs.backgroundImage === "none" && alpha(cs.backgroundColor) < 0.5 && e.tagName !== "IMG") continue;
    if (!may && e.closest(".window") && !e.matches(".mullion")) continue;
    const m = ROOM.toStage(e);
    const q = [[0, 0], [e.offsetWidth, 0], [e.offsetWidth, e.offsetHeight], [0, e.offsetHeight]].map(([x, y]) => {
      const p = m.transformPoint(new DOMPoint(x, y, 0));
      return new THREE.Vector3(p.x, p.y, p.z);
    });
    const n = new THREE.Vector3().subVectors(q[1], q[0]).cross(new THREE.Vector3().subVectors(q[3], q[0])).normalize();
    if (!isFinite(n.x)) continue;
    if (n.dot(toward) < 0) {
      n.negate(); // the side the reader sees, and its corners round that way
      q.reverse();
    }
    const area = q[0].distanceTo(q[1]) * q[0].distanceTo(q[3]);
    (may ? out.glows : area > BIG ? out.big : out.body).push({ q, n, e });
  }
  return out;
}
function mesh(fs, mat) {
  const pos = [],
    nrm = [];
  for (const { q, n } of fs)
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
// The back wall as the light from outside meets it: solid everywhere but the window (all that
// the window holds, since the window itself has no size). Drawn into the shadow maps only: the
// wall the reader sees is the CSS room's, which casts nothing.
function windowWall(win) {
  const c = [];
  for (const e of win.querySelectorAll("*")) {
    const m = ROOM.toStage(e);
    for (const [x, y] of [[0, 0], [e.offsetWidth, e.offsetHeight]]) c.push(m.transformPoint(new DOMPoint(x, y, 0)));
  }
  const x0 = Math.min(...c.map((p) => p.x)),
    x1 = Math.max(...c.map((p) => p.x)),
    z0 = Math.min(...c.map((p) => p.z)),
    z1 = Math.max(...c.map((p) => p.z)),
    y = Math.min(...c.map((p) => p.y)) - 1,
    F = 8000;
  const panes = [[-F, x0, -F, F], [x1, F, -F, F], [x0, x1, -F, z0], [x0, x1, z1, F]].map(([a, b, lo, hi]) => ({
    q: [new THREE.Vector3(a, y, lo), new THREE.Vector3(b, y, lo), new THREE.Vector3(b, y, hi), new THREE.Vector3(a, y, hi)],
    n: new THREE.Vector3(0, 1, 0),
  }));
  const w = mesh(panes, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  w.castShadow = true;
  return w;
}

// ---- the camera: the CSS room's own projection, as ROOM.toScreen measures it --------------------
function project(cam) {
  const o = ROOM.toScreen(0, 0, 0),
    ax = [ROOM.toScreen(1000, 0, 0), ROOM.toScreen(0, 1000, 0), ROOM.toScreen(0, 0, 1000)].map((p) => [(p[0] - o[0]) / 1000, (p[1] - o[1]) / 1000]);
  // depth: the way the projection does not show, towards the reader
  const nn = new THREE.Vector3(ax[0][0], ax[1][0], ax[2][0]).cross(new THREE.Vector3(ax[0][1], ax[1][1], ax[2][1])).normalize();
  if (nn.z < 0) nn.negate();
  const W = innerWidth,
    H = innerHeight,
    R = 12000; // px of depth either way, past the room's walls and floor
  cam.projectionMatrix.set(
    (2 * ax[0][0]) / W, (2 * ax[1][0]) / W, (2 * ax[2][0]) / W, (2 * o[0]) / W - 1,
    (-2 * ax[0][1]) / H, (-2 * ax[1][1]) / H, (-2 * ax[2][1]) / H, 1 - (2 * o[1]) / H,
    -nn.x / R, -nn.y / R, -nn.z / R, 0,
    0, 0, 0, 1,
  );
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}

// (last, so everything above is there when it starts)
function down(e) {
  document.querySelector("canvas.light-pass")?.remove();
  document.documentElement.classList.remove("lit");
  console.warn("No light pass:", e);
}
try {
  await start();
} catch (e) {
  down(e);
} finally {
  ready();
}
