// The room as a three.js scene (issue #160, ticket 02): the walls, the floor, the desk and the mat
// seen from the camera of the CSS room, drawn with a depth buffer, so that nothing is sorted by cutting
// it along something else's plane, and no seam can show. Reached only through ?roomgl while the
// room is rebuilt (index.html's head), and never without WebGL 2.
//
// The world is the CSS room's, in its pixels, with the stage's middle (640, 440, 0) as the origin,
// x east, y NORTH (the CSS room's y runs south, which would make the scene a mirror) and z up. Its camera
// is the CSS room's: orthographic, looking along (1, 1, -1) from the south-west and above, the room's
// framing as room.js makes it (a scale of at most 1.15 and at least 0.7 that fits the box of what can be
// used, which is frozen here as the numbers it measured: until the links exist, in ticket 11, there is
// nothing to measure it from). Its look is real materials (wood with a grain, a matt mat) lit by a sun
// with soft shadows and by an environment, with ambient occlusion: the owner picked it over the room's
// flat palette on 2026-11-27.

import { THREE, pal, scheme, renderer as makeRenderer, ratio, addLight, grain, matTexture } from "./gl/kit.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ---- the room's own numbers (room.js), in px, with y running south ---------------------------------
const MAT = 4; // the mat's thickness: its top is z = 0, where everything stands
const DESK = { x: -560, y: -150, w: 1890, d: 1180, t: 46 };
const BACK = -200; // the face of the wall behind the desk
const RIGHT = 1350; // the face of the wall to its right
const FLOOR = -560;
const FAR = -3200;
const DEEP = 4200;
const WALL_H = 3000;
const MIDDLE = { x: 640, y: 440 }; // the stage's middle, the scene's origin

// ---- the room's framing (room.js frame(), as it measured it) ----------------------------------------
const ZOOM = 0.72;
const MARGIN = 16;
const MAX = 1.15;
const MIN = 0.7;
const FIT_TOP = 17.59; // where the frame starts on the page, and it ends 64 px above the window's foot
const FIT_FOOT = 64;
// what has to be inside the frame, at a scale of 1 (px of the CSS room, at its zoom of 0.72): its size,
// and where its middle lies from the stage's middle (measured on the CSS room at five window sizes)
const BOX = { w: 1595.5723, h: 884.6808 };
const BOX_MIDDLE = { x: -120.918 * ZOOM, y: -89.457 * ZOOM };

const reduced = window.reducedMotion ? window.reducedMotion() : matchMedia("(prefers-reduced-motion: reduce)").matches;

const FLOOR_BOARDS = ["#8a6a4c", "#7d5f43", "#8f6f50", "#7a5c41"]; // the boards' colours across the room, as the CSS gradient had them
// anything failing: the professional home, for this visit (the head reads the flag), and the reason said; with
// no way to keep the flag, no reload, or it would never end
function fail(e) {
  console.warn("[room-gl] no room", e);
  try {
    sessionStorage.setItem("room-gl-failed", "1");
    if (sessionStorage.getItem("room-gl-failed") === "1") location.reload();
  } catch (err) {}
}

async function start() {
  // the workbench: one object alone, to be looked at up close (gl/bench.js), when ?bench= is in the address
  const benchName = new URLSearchParams(location.search).get("bench");
  if (benchName !== null) return (await import("./gl/bench.js")).bench(benchName);
  const canvas = document.createElement("canvas");
  canvas.className = "room-gl";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const renderer = makeRenderer(canvas);
  renderer.setPixelRatio(ratio());

  let dirty = false,
    pending = false,
    drawn = 0;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 500, 7000);
  const DIST = 5000;
  cam.up.set(0, 0, 1);
  cam.position.set(-1, -1, 1).normalize().multiplyScalar(DIST);
  cam.lookAt(0, 0, 0);

  // the CSS room's point (x, y, z), as the scene has it
  const at = (x, y, z) => new THREE.Vector3(x - MIDDLE.x, MIDDLE.y - y, z);

  // ---- light ---------------------------------------------------------------------------------------
  // up, to the west and the south: what the camera sees of a box is lit as the CSS room lights it
  addLight(scene, renderer, at(-700, 1100, 2100));

  // ---- materials: the room's colours, on surfaces with a grain and a gloss ------------------------
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0 });
  const M = {
    wall: mat("#fff"),
    skirting: mat("#fff"),
    desk: mat("#fff"),
    leg: mat("#fff"),
    floor: mat("#fff"),
    matEdge: mat("#fff"),
    matTop: mat("#fff"),
  };

  M.desk.map = grain(renderer, true);
  M.leg.map = grain(renderer, false);
  M.floor.map = grain(renderer, false);
  M.desk.roughness = 0.5;
  M.floor.roughness = 0.7;

  // a box standing on z, w along x, d along y, h up, as the CSS room's box() has it
  const box = (x, y, z, w, d, h, material, radius = 0) => {
    const g = radius ? new RoundedBoxGeometry(w, d, h, 3, radius) : new THREE.BoxGeometry(w, d, h);
    const m = new THREE.Mesh(g, material);
    m.position.copy(at(x + w / 2, y + d / 2, z + h / 2));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  // the walls and the floor run well past the frame at every size the room shows at
  // (the back wall, with its window in it, is gl/window.js, below)
  box(RIGHT, BACK - 24, FLOOR, 24, DEEP + 24, WALL_H, M.wall).castShadow = false;
  box(FAR, BACK, FLOOR, RIGHT - FAR, 8, 40, M.skirting);
  box(RIGHT - 8, BACK, FLOOR, 8, DEEP, 40, M.skirting);

  // the desk, its edge rounded, on four legs
  box(DESK.x, DESK.y, -MAT - DESK.t, DESK.w, DESK.d, DESK.t, M.desk, 5);
  for (const [px, py] of [[30, 30], [DESK.w - 100, 30], [30, DESK.d - 100], [DESK.w - 100, DESK.d - 100]]) box(DESK.x + px, DESK.y + py, FLOOR, 70, 70, -MAT - DESK.t - FLOOR, M.leg, 2);

  // the floor: boards 120 px across and 600 long, each its own colour from the CSS room's gradient, a hair apart
  const BW = 120,
    BL = 600,
    nx = Math.ceil((RIGHT - FAR) / BW),
    ny = DEEP / BL;
  const boards = new THREE.InstancedMesh(new RoundedBoxGeometry(BW - 2, BL - 2, 12, 2, 1.5), M.floor, nx * ny);
  boards.castShadow = false;
  boards.receiveShadow = true;
  scene.add(boards);
  {
    const m4 = new THREE.Matrix4(),
      tint = new THREE.Color(),
      stops = FLOOR_BOARDS.map((c) => new THREE.Color(c)),
      at3 = [0, 0.3, 0.6, 1];
    let i = 0;
    for (let ix = 0; ix < nx; ix++)
      for (let iy = 0; iy < ny; iy++) {
        const cx = FAR + ix * BW + BW / 2,
          cy = BACK + iy * BL + BL / 2,
          t = (ix * BW) / (RIGHT - FAR);
        m4.setPosition(at(cx, cy, FLOOR - 6 + 0));
        boards.setMatrixAt(i, m4);
        let k = 0;
        while (k < 2 && t > at3[k + 1]) k++;
        tint.copy(stops[k]).lerp(stops[k + 1], (t - at3[k]) / (at3[k + 1] - at3[k]));
        const r = Math.sin(ix * 12.9898 + iy * 78.233) * 43758.5453;
        tint.multiplyScalar(0.93 + 0.14 * (r - Math.floor(r))); // (each board a little different)
        boards.setColorAt(i, tint);
        i++;
      }
  }

  // the mat: its top 4 px thick, its corners round, the grid of the CSS room printed on it
  const shape = new THREE.Shape();
  const MW = 1360,
    MD = 960,
    MR = 6;
  shape.moveTo(-MW / 2 + MR, -MD / 2);
  shape.lineTo(MW / 2 - MR, -MD / 2);
  shape.absarc(MW / 2 - MR, -MD / 2 + MR, MR, -Math.PI / 2, 0, false);
  shape.lineTo(MW / 2, MD / 2 - MR);
  shape.absarc(MW / 2 - MR, MD / 2 - MR, MR, 0, Math.PI / 2, false);
  shape.lineTo(-MW / 2 + MR, MD / 2);
  shape.absarc(-MW / 2 + MR, MD / 2 - MR, MR, Math.PI / 2, Math.PI, false);
  shape.lineTo(-MW / 2, -MD / 2 + MR);
  shape.absarc(-MW / 2 + MR, -MD / 2 + MR, MR, Math.PI, Math.PI * 1.5, false);
  const matGeo = new THREE.ExtrudeGeometry(shape, { depth: MAT, bevelEnabled: false, curveSegments: 6 });
  {
    // (texture coordinates over the top: the whole mat, once)
    const p = matGeo.attributes.position,
      uv = matGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + MW / 2) / MW, (p.getY(i) + MD / 2) / MD);
  }
  const matMesh = new THREE.Mesh(matGeo, [M.matTop, M.matEdge]);
  matMesh.position.set(0, 0, -MAT);
  matMesh.castShadow = matMesh.receiveShadow = true;
  scene.add(matMesh);
  let matMap = null;
  function paintMat() {
    if (matMap) matMap.dispose();
    matMap = matTexture(renderer, pal(), MW, MD);
    M.matTop.map = matMap;
    M.matTop.needsUpdate = true;
  }

  // ---- the colours of the scheme -------------------------------------------------------------------
  function paint() {
    const p = pal();
    M.wall.color.set(p.wall);
    M.skirting.color.set(p.skirting);
    M.desk.color.set(p.desk);
    M.leg.color.set(p.leg);
    M.matEdge.color.set(p.matEdge);
    M.floor.color.setRGB(p.floor, p.floor, p.floor, THREE.SRGBColorSpace); // (the CSS room dimmed the sRGB values)
    M.matTop.color.set("#fff");
    paintMat();
    scene.background = new THREE.Color(p.back);
    invalidate();
  }

  // ---- the objects, as the CSS room puts them (gl/objects.js, each judged on the workbench first) ----------------
  // the old computer with its keyboard and mouse, turned 12 degrees (the CSS room's `rotateZ(-12deg)`, counterclockwise from above),
  // its case's middle at (-907.46, 76.17) of the scene, measured on the CSS room, and then brought 170 px forward (the way its screen faces, towards the
  // desk's front edge, where the chair is) because the owner finds a computer nearer the edge more real; the post on its top goes with it
  const objects = {};
  const api_loose = { names: [], solids: [] }; // (what the checks ask: which of the seven were drawn, and the solids they keep clear of)
  // the typeface of the neon (the CSS room's page loads it with its styles; the scene's page does not), before anything is printed in it
  if (!document.querySelector('link[href*="Tilt+Neon"]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Tilt+Neon&display=swap";
    document.head.append(l);
  }
  const PC_FORWARD = 170,
    shifts = { pc: [PC_FORWARD * Math.sin((12 * Math.PI) / 180), -PC_FORWARD * Math.cos((12 * Math.PI) / 180)] };
  shifts.post = shifts.pc;
  {
    const { OBJECTS } = await import("./gl/objects.js");
    const pc = await OBJECTS.pc.build(renderer);
    pc.group.position.set(-907.46 + shifts.pc[0], 76.17 + shifts.pc[1], 0);
    pc.group.rotation.z = (12 * Math.PI) / 180;
    scene.add(pc.group);
    objects.pc = pc.group;
    // each of the others at the CSS room's place (px, as the scene has them: x east, y north, from the stage's middle): the back wall with its
    // window, sill and perch; the shelf on the right wall with the plant and the radio; the chair, turned 28 degrees clockwise from above (the
    // CSS room's `rotateZ(28deg)`), on the floor, and its tie; the wastebasket, on the floor
    const put = async (name, x, y, z, turn = 0) => {
      const o = await OBJECTS[name].build(renderer);
      o.group.position.set(x, y, z);
      if (turn) o.group.rotation.z = turn; // (not for a thing that comes turned already, the cards on the wall)
      scene.add(o.group);
      objects[name] = o.group;
    };
    await put("window", 80, 640, 0);
    await put("shelf", 710, -80, 0);
    const turn = (-28 * Math.PI) / 180;
    await put("chair", 90, -800, FLOOR, turn);
    // the tie hangs on the chair's headrest, at (-70, -137, 1019) of the chair's frame, turned as the chair is
    const onChair = new THREE.Vector3(-70, -137, 1019).applyAxisAngle(new THREE.Vector3(0, 0, 1), turn).add(new THREE.Vector3(90, -800, FLOOR));
    await put("tie", onChair.x, onChair.y, onChair.z, turn);
    await put("bin", 625, -635, FLOOR);
    // the books on the desk, measured on the CSS room: the ledger 4 degrees clockwise, the agenda 4 degrees counterclockwise, from above
    await put("ledger", -29, 183, 0, (-4 * Math.PI) / 180);
    await put("agenda", -42, -199, 0, (4 * Math.PI) / 180);
    // the mug, the jar, the camera and the pager on the mat, the post on the computer's top, the cards taped to the right wall: measured on the CSS room
    // (the mug, the jar, the camera and the pager are rotated as the CSS room's `rotateZ` has them: 0, 0, 12 and -7 degrees)
    await put("mug", 325, -265, 0);
    await put("jar", 365, 295, 0);
    await put("camera", -400, -195, 0, (-12 * Math.PI) / 180);
    await put("pager", 550, 21, 0, (7 * Math.PI) / 180);
    await put("post", -908.76 + shifts.post[0], 79.94 + shifts.post[1], 320);
    await put("cards", 706, 240.56, 170.33);
    // what is on the walls and under the desk, measured on the CSS room: the neon name and the poster on the back wall (2 px proud of its face, at y = 638),
    // the light switch beside them, the navigation on the right wall (at x = 708); Willy's box at the desk's back left; the cable from the computer's back
    // (it goes with the computer, ROOMGL.shifts) over the desk's back edge to the socket
    await put("sign", -701.5, 638, 592);
    await put("poster", -678.29, 638, 206.12);
    await put("switch", -1078, 638, 250);
    await put("nav", 708, -20, 337);
    await put("nest", -343, 457, 0);
    {
      const cb = await (await import("./gl/desk.js")).cable(renderer, { shift: [shifts.pc[0], shifts.pc[1]] });
      cb.group.position.set(-399.5 - 640, 440 + 152, 0);
      scene.add(cb.group);
      objects.cable = cb.group;
    }
    // the odds and ends, a few of the seven on each visit, put where they go into nothing (all seven with ?odds)
    await scatter(objects, scene, renderer);
  }

  // ---- where the loose things go, on every visit (room.js: put, faults, tallOnes) ----------------------------------
  // Three to five of the seven (all of them with ?odds), anywhere on the desk where they go into no solid thing and are not hidden, on the screen,
  // behind the computer, the jar or the mug; a turn up to 40 degrees either way; the next is judged against the ones before it.
  async function scatter(objects, scene, renderer) {
    const { LOOSE } = await import("./gl/loose.js");
    const names = Object.keys(LOOSE);
    const keep = /[?&]odds\b/.test(location.search) ? names.length : 3 + Math.floor(Math.random() * 3);
    while (names.length > keep) names.splice(Math.floor(Math.random() * names.length), 1);
    const DESK = { x0: -1200, x1: 690, y0: -590, y1: 590 }; // (the desk's top, scene px: css x -560 to 1330, y -150 to 1030)
    const MAT = { x0: -680, x1: 680, y0: -480, y1: 480 };
    // the solid things on the desk, as plan boxes with the heights they stand between; and the tall ones' boxes on the screen (a fixed isometric
    // projection: right = (1,-1,0), up = (1,1,2)): the computer, the jar, the mug
    const solids = [];
    const rectOf = (g, name) => {
      const b = new THREE.Box3().setFromObject(g);
      return { name, x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z, box: b };
    };
    for (const n of ["pc", "ledger", "agenda", "camera", "jar", "mug", "pager", "nest"]) if (objects[n]) solids.push(rectOf(objects[n], n));
    const scr = (x, y, z) => [(x - y) / Math.SQRT2, (x + y + 2 * z) / Math.sqrt(6)];
    const screenBox = (b) => {
      const o = { l: 1e9, r: -1e9, t: 1e9, b: -1e9 };
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const [u, v] = scr(x, y, z);
        o.l = Math.min(o.l, u);
        o.r = Math.max(o.r, u);
        o.t = Math.min(o.t, v);
        o.b = Math.max(o.b, v);
      }
      return o;
    };
    const tall = solids.filter((s) => ["pc", "jar", "mug"].includes(s.name)).map((s) => screenBox(s.box));
    const placed = [];
    for (const name of names) {
      const o = await LOOSE[name](renderer);
      const local = new THREE.Box3().setFromObject(o.group);
      let ok = false;
      for (let tries = 0; tries < 200 && !ok; tries++) {
        const x = DESK.x0 + 40 + Math.random() * (DESK.x1 - DESK.x0 - 80),
          y = DESK.y0 + 40 + Math.random() * (DESK.y1 - DESK.y0 - 80),
          turn = ((Math.random() * 80 - 40) * Math.PI) / 180;
        // (its plan box turned: the four corners of the local one)
        const c = Math.cos(turn),
          s = Math.sin(turn);
        const xs = [],
          ys = [];
        for (const px of [local.min.x, local.max.x]) for (const py of [local.min.y, local.max.y]) {
          xs.push(x + px * c - py * s);
          ys.push(y + px * s + py * c);
        }
        const r = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
        if (r.x0 < DESK.x0 || r.x1 > DESK.x1 || r.y0 < DESK.y0 || r.y1 > DESK.y1) continue;
        if (solids.some((q) => r.x0 < q.x1 - 1 && r.x1 > q.x0 + 1 && r.y0 < q.y1 - 1 && r.y1 > q.y0 + 1)) continue;
        const [u, v] = scr(x, y, 4);
        if (tall.some((t) => u > t.l - 14 && u < t.r + 14 && v > t.t - 14 && v < t.b + 14)) continue;
        const onMat = r.x0 > MAT.x0 && r.x1 < MAT.x1 && r.y0 > MAT.y0 && r.y1 < MAT.y1;
        o.group.position.set(x, y, onMat ? 0 : -4); // (on the bare desk, 4 lower than the mat's top)
        o.group.rotation.z = turn;
        scene.add(o.group);
        objects["loose-" + name] = o.group;
        solids.push({ name, ...r, z0: 0, z1: o.height });
        placed.push(name);
        ok = true;
      }
      if (!ok) console.warn("[room-gl] no free place for", name);
    }
    api_loose.names = placed;
    api_loose.solids = solids.map(({ name, x0, x1, y0, y1 }) => ({ name, x0, x1, y0, y1 }));
  }

  // ---- the frame: room.js's, with the box it measured --------------------------------------------
  let C = { x: 0, y: 0 },
    S = 1,
    s = 1;
  function frame() {
    const W = innerWidth,
      H = innerHeight,
      A = { l: 0, t: FIT_TOP, r: W, b: FIT_TOP + H - FIT_FOOT },
      aw = A.r - A.l,
      ah = A.b - A.t;
    s = Math.max(MIN, Math.min(MAX, (aw - 2 * MARGIN) / BOX.w, (ah - 2 * MARGIN) / BOX.h));
    S = s * ZOOM;
    // the stage's middle lies where the box's middle is put, in the middle of the frame
    C = { x: (A.l + A.r) / 2 - (S / ZOOM) * BOX_MIDDLE.x, y: (A.t + A.b) / 2 - (S / ZOOM) * BOX_MIDDLE.y };
    Object.assign(cam, { left: -C.x / S, right: (W - C.x) / S, top: C.y / S, bottom: -(H - C.y) / S });
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    try {
      // what the head reads, to decide before anything is drawn whether the window holds the room
      localStorage.setItem("room-box", JSON.stringify({ w: BOX.w, h: BOX.h, dw: W - aw, dh: H - ah }));
    } catch (e) {}
  }

  // ---- drawing: a pass of ambient occlusion over the scene, soft at the edges -----------------------
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, cam));
  let ao = null;
  if (new URLSearchParams(location.search).get("ao") !== "0") {
    try {
      ao = new GTAOPass(scene, cam, innerWidth, innerHeight);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.updateGtaoMaterial({ radius: 60, distanceExponent: 1, thickness: 10, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
      composer.addPass(ao);
    } catch (e) {
      console.warn("[room-gl] no ambient occlusion", e);
    }
  }
  composer.addPass(new OutputPass());

  function resize() {
    renderer.setPixelRatio(ratio());
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(ratio());
    composer.setSize(innerWidth, innerHeight);
    frame();
    invalidate();
  }

  // drawn when something asks for it (a frame at most per frame of the screen), not all the time
  function draw() {
    pending = false;
    if (!dirty) return;
    dirty = false;
    try {
      composer.render();
    } catch (e) {
      return fail(e);
    }
    drawn++;
    api.drawn = drawn;
  }
  function invalidate() {
    dirty = true;
    if (!pending) {
      pending = true;
      requestAnimationFrame(draw);
    }
  }

  // ---- what the checks and the later tickets ask of it ----------------------------------------------
  const api = {
    ready: false,
    drawn: 0,
    scene,
    camera: cam,
    THREE,
    objects,
    // where the scene is not the CSS room's on purpose: how far an object was moved, [x, y], from the place the CSS room gives it
    shifts,
    loose: api_loose,
    // the CSS room's point, where it is on the screen, px
    project(x, y, z) {
      const v = at(x, y, z).project(cam);
      return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
    },
    frame: () => ({ s, S, C: { ...C } }),
    // the colour drawn at a px of the window, [r, g, b]
    pixel(x, y) {
      const r = renderer.getPixelRatio(),
        cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.drawImage(canvas, x * r, y * r, 1, 1, 0, 0, 1, 1);
      return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3);
    },
    redraw: invalidate,
  };
  window.ROOMGL = api;

  scheme.addEventListener("change", paint);
  addEventListener("gl-redraw", invalidate); // (an object that moves by itself, as the radio's projector, asks for frames)
  addEventListener("resize", resize);
  canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
  canvas.addEventListener("webglcontextrestored", invalidate);
  // (a page kept for Back and Forward keeps its context: only one that is going away lets it go)
  addEventListener("pagehide", (e) => {
    if (e.persisted) return;
    renderer.dispose();
    renderer.forceContextLoss();
  });

  paint();
  resize();
  composer.render(); // (the first frame, before anything is said to be ready)
  drawn++;
  api.drawn = drawn;
  dirty = false;
  api.ready = true;
  document.documentElement.classList.add("gl-ready");
}

start().catch(fail);
