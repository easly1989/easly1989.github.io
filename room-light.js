// The room's light (index.html?room): real light and shadow over the CSS room. The CSS room
// draws itself as it always has, in its plain colours; this draws the same room again in WebGL,
// every element a face where the CSS room puts it (ROOM.toStage), in its own shape, all of it
// white, lit by the room's light and the window with shadow maps. What comes out is how much
// light reaches each pixel, multiplied over the page: a canvas laid flat on the screen, but
// drawn from the room's own shapes, so it knows what stands in front of what. Over it, in the
// dark, the night's holes where the other sources glow (ROOM.glows()). While it runs, the CSS
// room paints no light of its own (room.css, .lit); without WebGL 2, or if anything here
// fails, it never starts and the room is lit as it was, by its painted shadows and the night
// layer.
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
  const air = document.createElement("canvas"); // (what glows in the air, added over it: room.css)
  air.className = "light-pass air";
  air.setAttribute("aria-hidden", "true");
  const ax = air.getContext("2d");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, failIfMajorPerformanceCaveat: true });
  renderer.setClearColor(0xffffff, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
  const { body, big, glows, cut, backs } = faces(stage);
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  // (what glows hides nothing drawn after it, below: the plant's leaves reach behind the board
  // the tubes are on, where the CSS room draws them in front; and it gives way to what lies on
  // it, the window's bars on its glass)
  const glowing = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4 });
  const solid = mesh(body, lit);
  solid.castShadow = solid.receiveShadow = true;
  const walls = mesh(big, lit);
  walls.receiveShadow = true;
  const hidden = mesh(backs, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide })); // (in the shadow maps only)
  hidden.castShadow = true;
  const glowMeshes = glows.map((f) => {
    const m = mesh([f], lit);
    m.receiveShadow = true;
    m.renderOrder = 1;
    m.userData.e = f.e;
    return m;
  });
  // what is cut to the shape of a drawing (the plant's leaves): the drawing, in white on
  // nothing, is where it is solid; drawn as soon as the picture is ready
  const cutMeshes = cut.map((f) => {
    const corners = [0, 1, 2, 0, 2, 3],
      g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(corners.flatMap((i) => f.q[i].toArray()), 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(corners.flatMap(() => f.n.toArray()), 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(corners.flatMap((i) => f.uv[i]), 2));
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide, alphaTest: 0.5 });
    const me = new THREE.Mesh(g, mat);
    me.castShadow = me.receiveShadow = true;
    me.renderOrder = 2;
    me.visible = false;
    const svg = f.e.querySelector("svg").cloneNode(true),
      img = new Image();
    svg.setAttribute("fill", "#fff");
    svg.setAttribute("width", f.e.offsetWidth);
    svg.setAttribute("height", f.e.offsetHeight);
    // (later, once the pass runs: a failure here takes it down as any other does)
    img.onload = () => {
      if (!cv.isConnected) return;
      try {
        const c = document.createElement("canvas");
        c.width = 256;
        c.height = Math.round((256 * f.e.offsetHeight) / f.e.offsetWidth);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        mat.alphaMap = new THREE.CanvasTexture(c);
        mat.needsUpdate = me.visible = shadows = true;
        draw();
      } catch (e) {
        down(e);
      }
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    return me;
  });
  const hole = opening(stage.querySelector(".window"));
  scene.add(solid, walls, hidden, ...glowMeshes, ...cutMeshes, windowWall(hole));

  // The sources it casts: the room's light, and the window's sun or moon, far off, through the
  // window only, and in the dark the computer's screen and the radio's lamp. What glows in the
  // air (the radio's halo, the projector's beam) lights it as the night's holes do, below.
  const sky = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  sky.position.set(0, 0, 1); // (from above: the room's up is its z)
  scene.add(sky);
  const lamps = {};
  for (const s of ROOM.lights()) {
    let l;
    if (s.name === "window") {
      l = new THREE.DirectionalLight(s.color, 1);
      l.position.set(...s.at);
      l.target.position.set((hole.x0 + hole.x1) / 2, hole.y, (hole.z0 + hole.z1) / 2); // (it shines from s.at through the window's middle)
      scene.add(l.target);
      Object.assign(l.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 6000 });
      l.shadow.mapSize.set(2048, 2048);
      l.shadow.radius = 3;
    } else if (s.name === "room") {
      l = new THREE.PointLight(s.color, 1, 0, 0); // (as strong wherever it reaches, like the painted light)
      l.position.set(...s.at);
      // (as tight round what it lights as it goes: a point light's shadow loses the desk's small
      // things when its far is thousands of times its near)
      Object.assign(l.shadow.camera, { near: 150, far: 4500 });
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.radius = 4;
    } else if (s.name === "screen" || s.name === "radio") {
      // forward only, out of the glass or the dial, so the case's top and back and the wall
      // behind the radio stay dark, fading out by s.reach: the screen straight out at the
      // keyboard, the radio's lit dial a little way out into the room (its face looks along -x)
      // and down onto the desk below the shelf
      const at = new THREE.Vector3(...s.at),
        out = new THREE.Vector3(-1, 0, -0.45).normalize();
      if (s.name === "screen") {
        const g = stage.querySelector(".pc .glass"),
          kb = stage.querySelector(".pc .kb"),
          p = (e, x, y, z) => new THREE.Vector3().copy(ROOM.toStage(e).transformPoint(new DOMPoint(x, y, z)));
        out.copy(p(g, 0, 0, 1).sub(p(g, 0, 0, 0)).normalize());
        if (kb && out.dot(p(kb, kb.offsetWidth / 2, kb.offsetHeight / 2, 0).sub(at)) < 0) out.negate(); // (towards the keyboard)
      }
      l = new THREE.SpotLight(s.color, 1, s.reach, Math.PI * (s.name === "screen" ? 0.42 : 0.3), 0.9, 0);
      l.position.copy(at).addScaledVector(out, 4); // (just off its own face)
      l.target.position.copy(at).addScaledVector(out, 100);
      scene.add(l.target);
      Object.assign(l.shadow.camera, { near: 20, far: s.reach });
      l.shadow.mapSize.set(512, 512);
      l.shadow.radius = 3;
    } else continue;
    l.shadow.bias = -0.0008;
    l.shadow.normalBias = 1.5;
    lamps[s.name] = l;
    scene.add(l);
  }
  // How strong each is, by day (the room's light on) and by night (off), as the share of a white
  // face it lights when it meets it square on (three.js takes π for all of it): by day the room
  // looks as it did when its light was painted; by night it is as dark as the night layer left
  // it, rgb(40, 46, 80), but where a source reaches.
  const DAY = { sky: 0.6, room: 0.5, window: 0.6 },
    NIGHT = { sky: 1, window: 1, screen: 1.8, radio: 0.6 };
  const DARK = new THREE.Color("rgb(40, 46, 80)");
  let shadows = true;
  let was = "";
  function shine() {
    const all = ROOM.lights().filter((s) => lamps[s.name]),
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
      l.intensity = l.userData.full = Math.PI * s.power * (k[s.name] ?? 0);
      l.visible = l.castShadow = l.intensity > 0;
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
  }

  // What moves on its own, lifted when pointed at: its faces go with it (follow()), as long as
  // it is moving, and a little longer
  const movers = new Map();
  for (const f of body.concat(backs))
    if (f.mover) {
      if (!movers.has(f.mover)) movers.set(f.mover, { key: "", faces: [] });
      movers.get(f.mover).faces.push(f);
    }
  // and the mouse (room-mouse.js), once it is there, as solid as they are, where it is now
  let mouse = null;
  function follow() {
    let moved = false;
    for (const [e, mv] of movers) {
      const m = ROOM.toStage(e),
        key = m.toString();
      if (key === mv.key) continue;
      mv.key = key;
      moved = true;
      for (const f of mv.faces) place(f, m.multiply(f.rel));
    }
    if (moved) {
      write(solid, body);
      write(hidden, backs);
    }
    const mb = ROOM.mouse && ROOM.mouse.body;
    if (mb) {
      if (!mouse) {
        mouse = new THREE.Mesh(mb.geometry, lit);
        mouse.matrixAutoUpdate = false;
        mouse.castShadow = mouse.receiveShadow = true;
        scene.add(mouse);
      }
      const m = mb.matrix();
      if (!m.equals(mouse.matrix)) {
        mouse.matrix.copy(m);
        moved = true;
      }
    }
    return moved && (shadows = true);
  }
  follow();

  // Willy: his own canvas lights him for now, so the pass leaves him as he is, white where he
  // is, in his pose
  const him = new THREE.Group();
  him.scale.set(1, -1, 1); // (his world's y runs the other way)
  scene.add(him);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // The night's holes, over what the room's light leaves: each brightens the dark as the night
  // layer's did, never darkens what is lit (blended by the brighter of the two).
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { at: { value: new THREE.Vector4() }, col: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, pos: { value: new THREE.Vector4() }, n: { value: 0 } },
      vertexShader: `uniform vec4 at;
varying vec2 p;
void main() { p = position.xy; gl_Position = vec4(at.xy + position.xy * at.zw, 0.0, 1.0); }`,
      fragmentShader: `uniform vec4 col[4];
uniform vec4 pos;
uniform int n;
varying vec2 p;
const vec3 BASE = vec3(40.0, 46.0, 80.0) / 255.0;
void main() {
  float d = length(p);
  vec4 c = col[0];
  for (int i = 1; i < 4; i++) {
    if (i >= n) break;
    float a = pos[i - 1], b = pos[i];
    if (d >= a) c = d >= b ? col[i] : mix(col[i - 1], col[i], (d - a) / max(b - a, 1e-4));
  }
  if (d < pos[0]) c = col[0];
  gl_FragColor = vec4(BASE * (1.0 - c.a) + c.rgb, 1.0);
}`,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide, // (flat on the screen, so wound as a back is, for the mirror's sake above)
    }),
  );
  glow.frustumCulled = false;
  const front = new THREE.Scene();
  front.add(glow);
  const flat = new THREE.Camera();
  // the screen's flicker, as room.css's keyframes have the CRT's over 3.3 s
  const CRT = [[0, 1], [0.06, 0.9], [0.08, 1], [0.31, 0.95], [0.33, 0.82], [0.35, 0.97], [0.58, 0.92], [0.74, 1], [0.76, 0.86], [0.78, 0.99], [1, 1]];
  function crt(t) {
    const u = (t / 3300) % 1,
      i = CRT.findIndex((c) => c[0] > u);
    const [a, va] = CRT[i - 1],
      [b, vb] = CRT[i];
    return va + ((vb - va) * (u - a)) / (b - a);
  }
  // what glows in the air: a lamp's halo, a projector's beam (its outline on screen, from the
  // lens out), added over the room as light is, as strongly as o.air, rather than letting the
  // room through
  function inAir(o) {
    const stops = o.stops.map(([c, at], i, all) => {
      const [r, g, b, a] = rgba(c),
        [pr, pg, pb] = a || !i ? [r, g, b] : rgba(all[i - 1][0]); // (fading to nothing in its own colour, not to black)
      return [at, `rgba(${pr * 255}, ${pg * 255}, ${pb * 255}, ${a * o.air})`];
    });
    ax.save();
    let fill;
    if (o.poly) {
      const [apex, ...far] = o.poly,
        mid = [0, 1].map((i) => apex[i] + (far.reduce((t, p) => t + p[i], 0) / far.length - apex[i]) * 1.3);
      fill = ax.createLinearGradient(...apex, ...mid);
      ax.beginPath();
      for (const [x, y] of hull(o.poly)) ax.lineTo(x, y);
    } else {
      ax.translate(o.x, o.y);
      ax.scale(o.w, o.h);
      fill = ax.createRadialGradient(0, 0, 0, 0, 0, 1);
      ax.beginPath();
      ax.rect(-1, -1, 2, 2);
    }
    for (const [at, c] of stops) fill.addColorStop(at, c);
    ax.fillStyle = fill;
    ax.fill();
    ax.restore();
  }
  function holes(list) {
    const u = glow.material.uniforms,
      W = innerWidth,
      H = innerHeight;
    air.hidden = !list.some((o) => o.air); // (no layer to blend at all when nothing glows in the air)
    ax.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ax.clearRect(0, 0, W, H);
    renderer.autoClear = false;
    for (const o of list) {
      if (o.cast) continue; // (its light is one of the lamps, cast for real)
      if (o.air) {
        inAir(o.crt && flickers ? { ...o, air: o.air * crt(performance.now()) } : o); // (the screen's glass flickers with its light)
        continue;
      }
      u.at.value.set((o.x / W) * 2 - 1, 1 - (o.y / H) * 2, (o.w / W) * 2, (o.h / H) * 2);
      o.stops.slice(0, 4).forEach(([c, at], i) => {
        const [r, g, b, a] = rgba(c);
        u.col.value[i].set(r * a, g * a, b * a, a); // (premultiplied, as CSS mixes a gradient's stops)
        u.pos.value.setComponent(i, at);
      });
      u.n.value = Math.min(o.stops.length, 4);
      renderer.render(front, flat);
    }
    renderer.autoClear = true;
  }

  let flickers = false;
  const still = matchMedia("(prefers-reduced-motion: reduce)"); // (under it the screen holds steady)
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
    const screen = lamps.screen;
    flickers = !!screen && screen.visible && !still.matches;
    if (flickers) screen.intensity = screen.userData.full * crt(performance.now());
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
    holes(ROOM.glows());
  }
  function resize() {
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight, false);
    air.width = innerWidth * devicePixelRatio;
    air.height = innerHeight * devicePixelRatio;
    project(cam);
  }
  resize();
  shine();
  draw();
  document.body.append(cv, air);
  document.documentElement.classList.add("lit");
  // again whenever a light changes, the colour scheme or the window does, something on the desk
  // moves, or Willy is drawn (in the same frame as he is, or his edges would show the room lit
  // round him); and if it ever fails, or loses its GPU, the room goes back to its painted light
  const guard = (f) => () => {
    if (!cv.isConnected) return;
    try {
      f();
    } catch (e) {
      down(e);
    }
  };
  const relight = guard(() => {
    shine();
    project(cam); // (the room may have been fitted to the window again since: room.js, frame())
    draw();
  });
  const redraw = guard(draw);
  ROOM.onLights(relight);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", relight);
  still.addEventListener("change", relight);
  cv.addEventListener("webglcontextlost", () => down("its GPU context was lost"));
  addEventListener(
    "resize",
    guard(() => {
      resize();
      draw();
    }),
  );
  // while anything on the desk moves (a transition or an animation in it), every frame; and
  // while the screen flickers, whenever its light has changed enough to show
  let until = 0,
    ticking = false;
  let moving = false;
  const tick = guard(() => {
    if (!cv.isConnected) return;
    const now = performance.now(),
      busy = now < until,
      s = lamps.screen;
    // (once more as it stops, for where it came to rest)
    if (((busy || moving) && follow()) || (flickers && Math.abs(s.userData.full * crt(now) - s.intensity) > 0.015 * s.userData.full)) draw();
    moving = busy;
    ticking = busy || flickers;
    if (ticking) requestAnimationFrame(tick);
  });
  const wake = (ms) => (ev) => {
    if (!ev.target.closest || !ev.target.closest(MOVERS)) return;
    until = Math.max(until, performance.now() + ms);
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  };
  stage.addEventListener("transitionrun", wake(1200));
  stage.addEventListener("animationstart", wake(3000));
  const flicker = () => {
    if (flickers && !ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  };
  ROOM.onLights(flicker);
  flicker(); // (the computer may be on already)
  if (ROOM.mouse) ROOM.mouse.moved = guard(() => follow() && draw()); // (room-mouse.js, as it loads and as it moves)
  (function meet() {
    if (!cv.isConnected) return;
    if (!ROOM.willy) return requestAnimationFrame(meet); // (he comes when he has loaded)
    ROOM.willy.drawn = redraw;
    redraw();
  })();
}

// ---- the faces ----------------------------------------------------------------------------------
// not drawn: the painted shadows and light patches, the light painted in the air (the radio's
// lamp and pool, the projector's beam, the steam, the shine on the jar), what only takes the
// pointer, Willy's canvases
const SKIP = /\b(shade|anchor|burst|hit-plane|window-light|beam-corner|radio-lamp|radio-pool|proj-beam|steam|jar-shine|willy|willy-low|willy-shadow)\b/;
// what may give light rather than take it, each its own face; and what does now: shown as the
// CSS room paints it, never darkened (the boards the neon is mounted on, whole, so no edge of
// a glow shows on them)
const MAY = ".window .sky, .window .pane, .pc .glass, .neon h1, .plexi, .light-switch, .light-switch *";
const GLOWS = ".window .sky, .window .pane, .pc.on .glass, .neon h1, .plexi, .lights-off .light-switch, .lights-off .light-switch *, .dawn .light-switch, .dawn .light-switch *";
const CUT = ".plant .leaves"; // cut to the shape of the drawing it holds
const MOVERS = ".thing, .pc-mouse"; // what moves on the desk, with its faces
const BIG = 4e6; // px², a wall or the floor: lit, and casting nothing, since nothing is behind it
const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
const colours = new Map();
// a CSS colour as the canvas paints it, [r, g, b, a] from 0 to 1
function rgba(c) {
  if (!colours.has(c)) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "rgba(0,0,0,0)";
    probe.fillStyle = c;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data; // (unpremultiplied already)
    colours.set(c, [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255]);
  }
  return colours.get(c);
}
// whether it shows: neither hidden nor all but transparent
function shown(e, stage) {
  if (getComputedStyle(e).visibility === "hidden") return false;
  let op = 1;
  for (let a = e; a && a !== stage; a = a.parentElement) op *= +getComputedStyle(a).opacity;
  return op >= 0.3;
}
// whether it paints more than a tint: a colour, a gradient or a picture
function paints(e, cs = getComputedStyle(e)) {
  return cs.backgroundImage !== "none" || rgba(cs.backgroundColor)[3] >= 0.5 || e.tagName === "IMG";
}
// Its outline in its own px, round where its corners are (a ring is a disc, not a square).
function outline(e, cs) {
  const w = e.offsetWidth,
    h = e.offsetHeight;
  const px = (v, of) => (v.endsWith("%") ? (parseFloat(v) / 100) * of : parseFloat(v) || 0);
  // cut out by its clip-path: a polygon is its shape; an inset, what is left of it (nothing
  // while it is all cut away, the camera's print before it comes out)
  const clip = cs.clipPath.match(/^(polygon|inset)\((.*)\)$/);
  if (clip && clip[1] === "polygon") return clip[2].split(",").map((pt) => pt.trim().split(/\s+/).map((v, i) => px(v, i ? h : w)));
  let box = [0, 0, w, h];
  if (clip) {
    const [t, r = t, b = t, l = r] = clip[2].split(/\s+/);
    box = [px(l, w), px(t, h), w - px(r, w), h - px(b, h)];
    if (box[2] - box[0] < 1 || box[3] - box[1] < 1) return [];
  }
  const r = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((c) => {
    const [a, b = a] = cs["border" + c + "Radius"].split(" ");
    return [px(a, w), px(b, h)];
  });
  // (as CSS does: radii that would overlap are all scaled down together)
  const f = Math.min(1, w / (r[0][0] + r[1][0] || 1), w / (r[3][0] + r[2][0] || 1), h / (r[0][1] + r[3][1] || 1), h / (r[1][1] + r[2][1] || 1));
  const corners = [[0, 0, 1, 1], [w, 0, -1, 1], [w, h, -1, -1], [0, h, 1, -1]];
  const out = [];
  corners.forEach(([x, y, sx, sy], i) => {
    const [rx, ry] = r[i].map((v) => v * f);
    if (rx < 1 || ry < 1) return out.push([x, y]);
    const cx = x + sx * rx,
      cy = y + sy * ry;
    // its arc, round the way the corners go (y runs down): from the side before it to the next
    for (let k = 0; k <= 6; k++) {
      const ang = [Math.PI, 1.5 * Math.PI, 0, 0.5 * Math.PI][i] + (Math.PI / 2) * (k / 6);
      out.push([cx + rx * Math.cos(ang), cy + ry * Math.sin(ang)]);
    }
  });
  // (a convex shape clamped to the inset's box is what the box leaves of it)
  return clip ? out.map(([x, y]) => [Math.min(Math.max(x, box[0]), box[2]), Math.min(Math.max(y, box[1]), box[3])]) : out;
}
// where a face is now: its outline through m, and the way it faces, towards the reader (who
// looks from -x, +y, +z)
function place(f, m) {
  const p = (x, y) => {
    const q = m.transformPoint(new DOMPoint(x, y, 0));
    return new THREE.Vector3(q.x, q.y, q.z);
  };
  const w = f.e.offsetWidth,
    h = f.e.offsetHeight,
    o = p(0, 0);
  f.n = new THREE.Vector3().subVectors(p(w, 0), o).cross(new THREE.Vector3().subVectors(p(0, h), o)).normalize();
  f.q = f.shape.map(([x, y]) => p(x, y));
  f.uv = f.shape.map(([x, y]) => [x / w, 1 - y / h]); // (where each corner is on a picture of it)
  if (-f.n.x + f.n.y + f.n.z < 0) {
    f.n.negate(); // the side the reader sees, and its corners round that way
    f.q.reverse();
    f.uv.reverse();
  }
}
// every element of the room that paints more than a tint, in its own shape, where it is and
// the way it faces; the window's own faces (but its bars) let the light in; a strip of a print
// round a curve is the face of its slice of the print, and the rest of the way round is there
// for the shadow it throws (backs: a label round the jar throws a band, not part of one)
function faces(stage) {
  const out = { body: [], big: [], glows: [], cut: [], backs: [] };
  for (const e of stage.querySelectorAll("*")) {
    if (!(e instanceof HTMLElement) || !e.offsetWidth || !e.offsetHeight) continue;
    if (SKIP.test(e.className)) continue;
    const strip = e.closest(".strip");
    if (strip && strip !== e) continue;
    if (e.parentElement.closest(".pc .glass")) continue; // (the glass is one face, whatever it shows: as boxes they would show past its rounded corners)
    const cs = getComputedStyle(e),
      may = e.matches(MAY),
      cut = e.matches(CUT);
    // (what may glow is kept even while it is hidden: it may come on later)
    if (!may && !shown(e, stage)) continue;
    if (!may && !cut && !(strip ? [...e.querySelectorAll("*")].some((d) => d instanceof HTMLElement && !SKIP.test(d.className) && paints(d)) : paints(e, cs))) continue;
    if (!may && e.closest(".window") && !e.matches(".mullion")) continue;
    let m = ROOM.toStage(e);
    const mover = e.closest(MOVERS),
      drawing = cut && getComputedStyle(e.querySelector("svg")).transform;
    if (drawing && drawing !== "none") m = m.multiply(new DOMMatrix(drawing)); // (the drawing where its own transform puts it: the leaves stand up out of their box)
    const f = { e, shape: outline(e, cs), mover, rel: mover && ROOM.toStage(mover).inverse().multiply(m) };
    if (f.shape.length < 3) continue;
    place(f, m);
    if (!isFinite(f.n.x)) continue;
    (may ? out.glows : cut ? out.cut : !mover && e.offsetWidth * e.offsetHeight > BIG ? out.big : out.body).push(f);
    // and the rest of the way round, which the CSS room leaves out since no one sees it: the
    // strip turned a third and two thirds round the curve's axis, its host's middle (room.js,
    // wrap()), which closes the ring for any print a third of the way round or more
    if (strip)
      for (const turn of [120, 240]) {
        const host = e.parentElement,
          mh = ROOM.toStage(host),
          [cx, cy] = [host.offsetWidth / 2, host.offsetHeight / 2],
          bm = mh.translate(cx, cy).rotate(0, 0, turn).translate(-cx, -cy).multiply(mh.inverse()).multiply(m),
          b = { e, shape: f.shape, mover, rel: mover && ROOM.toStage(mover).inverse().multiply(bm) };
        place(b, bm);
        out.backs.push(b);
      }
  }
  return out;
}
// the faces' triangles, each a fan from its first corner, into a mesh; write() does it again
// in place, when some have moved
function mesh(fs, mat) {
  const g = new THREE.BufferGeometry();
  const n = fs.reduce((s, f) => s + 3 * (f.q.length - 2), 0);
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(3 * n), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(3 * n), 3));
  const me = new THREE.Mesh(g, mat);
  me.frustumCulled = false;
  write(me, fs);
  return me;
}
function write(me, fs) {
  const pos = me.geometry.attributes.position,
    nrm = me.geometry.attributes.normal;
  let v = 0;
  for (const { q, n } of fs)
    for (let i = 1; i < q.length - 1; i++)
      for (const p of [q[0], q[i], q[i + 1]]) {
        pos.setXYZ(v, p.x, p.y, p.z);
        nrm.setXYZ(v++, n.x, n.y, n.z);
      }
  pos.needsUpdate = nrm.needsUpdate = true;
}
// The window's opening in the back wall, in the room: all that the window holds, since the
// window itself has no size
function opening(win) {
  const c = [];
  for (const e of win.querySelectorAll("*")) {
    if (!(e instanceof HTMLElement) || !e.offsetWidth) continue; // (the skyline's svg has no box to go by)
    const m = ROOM.toStage(e);
    for (const [x, y] of [[0, 0], [e.offsetWidth, e.offsetHeight]]) c.push(m.transformPoint(new DOMPoint(x, y, 0)));
  }
  const at = (k, f) => f(...c.map((p) => p[k]));
  return { x0: at("x", Math.min), x1: at("x", Math.max), z0: at("z", Math.min), z1: at("z", Math.max), y: at("y", Math.min) - 1 };
}
// The back wall as the light from outside meets it: solid everywhere but the window. Drawn into
// the shadow maps only: the wall the reader sees is the CSS room's, which casts nothing.
function windowWall({ x0, x1, z0, z1, y }) {
  const F = 8000;
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

// the convex outline of points on screen, in order round it (Andrew's monotone chain)
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
    half = (list) => {
      const h = [];
      for (const q of list) {
        while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
        h.push(q);
      }
      h.pop();
      return h;
    };
  return half(p).concat(half(p.reverse()));
}
function down(e) {
  for (const c of document.querySelectorAll("canvas.light-pass")) c.remove();
  document.documentElement.classList.remove("lit");
  console.warn("No light pass:", e);
}
// (last, so everything above is there when it starts)
try {
  await start();
} catch (e) {
  down(e);
} finally {
  ready();
}
