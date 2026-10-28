// Willy, drawn by three.js into a canvas that stands inside the room's preserve-3d scene,
// facing the screen, so the browser sorts him in depth with everything else: the computer and
// the chair hide him. The camera is orthographic at the room's own isometric angle, and his
// world is the room's with y flipped (x right, y towards the back wall, z up), one unit one
// room px. He is assets/willy.glb, built from cat-src/; here he gets his fur and outline.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const SCALE = 55; // room px per model unit: cat-src/build.py makes him 388 px nose to tail tip
const W = 560; // room enough for all of him, 388 px nose to tail, whichever way he faces
const H = 560;
const ANCHOR_Z = 88; // the canvas stands at his body's middle, not at his feet
const BIAS = 50; // and a little towards the viewer, so the ground under him stays behind it
// Facing the reader, his canvas goes down into the ground a little in front of him, and what of
// him is there (his paws stretched out lying, his tail hanging towards the reader) went into the
// desk or the book beside him and was cut off. So below the height of his feet it folds forward,
// flat this high above his ground, over the books (30 px at most); on screen nothing changes.
const FOLD = 40;
// a little long, as Willy's is; reach in model units of a cat 5.64 long, tail how much longer
// the tail's is
const FUR = { reach: 0.28, shells: 20, strands: 26, comb: 0.9, outline: 0.09, tail: 0.5 };
const LENGTH = 5.64;
// px his root is above what he stands on as he leaves it and as he meets the next, in jump-air,
// which the arc does not know (cat-src/build.py prints them)
const LIFT = [83.6, 155];
const lift = (at) => LIFT[0] + (LIFT[1] - LIFT[0]) * at;
const CLEAR = 4; // px he keeps from everything solid
const OVER = 6; // px he may hang over the edge of what he stands on, being soft
const LYING = 20; // and lying down or asleep, his paws and tail spilling over
// the fill from all round with the room's light on, and how strong each of the room's sources is
// on him at full power
const FILL = 1.7;
const STRENGTH = { room: 1.5, window: 1.4, screen: 1.2, radio: 1.4 };
// With the room's light off the room is darkened by a layer multiplied over it (room.js, glow()),
// with holes where its sources shine; on screen, so it would light him wherever the floor behind
// him is lit, his legs in the window's light and his back not. So he is cut out of it (cutout())
// and lit by his own lights only: this fill, as dark as the layer leaves the room (rgb(40, 46,
// 80)), and each source from where it is, as far as it reaches him; the moon only as much of
// him as is in the window's light.
const NIGHT = { sky: 0x8093ff, ground: 0x2c3248, power: 0.25 };
const SHADOW = 0.5; // how dark his shadow is, as dark as the room's own (room.css, .shade)
// and the room it is drawn in, px square, the texels across it, how high above the ground he
// still darkens it, how far each point of him falls away from the light per px of its height
// (room.css, .shade: 0.18 and 0.3 along the room's x and y, whose y runs the other way), and
// how soft it is: each pass of the blur, px
const SHADE = { size: 600, texels: 192, high: 240, fall: [0.18, -0.3], blur: [7, 7], layer: 1 };
// his legs, front then hind, left then right: the two bones that bend, the bone whose head is
// the wrist or the hock, and the paw
const LEGS = [
  ["UpperArm.L", "Forearm.L", "Pastern.L", "Hand.L"],
  ["UpperArm.R", "Forearm.R", "Pastern.R", "Hand.R"],
  ["Thigh.L", "Shin.L", "Hook.L", "Foot.L"],
  ["Thigh.R", "Shin.R", "Hook.R", "Foot.R"],
];
// how much of the step between two paws their shoulders and their hips rise by: his front legs
// stand nearly straight, with little to spare for the lower paw to reach down
const RAISE = [0.1, 0.2];
const EASE = 0.05; // s a paw takes to meet a new ground: a step up comes mid-stride

// Willy in the room, with his clips. Throws if there is no WebGL 2 or the model fails to load.
export async function willy(room, stage, src = "assets/willy.glb") {
  const cv = document.createElement("canvas");
  cv.className = "willy";
  cv.setAttribute("aria-hidden", "true");
  // (never transitioned, not even by reduced motion's 0.01ms on everything, in styles.css:
  // cutout() measures where he is the moment he is moved)
  cv.style.cssText = "position:absolute;left:0;top:0;width:" + W + "px;height:" + H + "px;pointer-events:none;transition:none";
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  room.appendChild(cv);
  // the fold: the row of his canvas where it is FOLD above his ground, and the part below it,
  // copied into a canvas of its own lying flat (stand())
  const b = BIAS / Math.sqrt(3),
    fold = (ANCHOR_Z + b - FOLD) / Math.sqrt(2 / 3) + H / 2;
  cv.style.clipPath = "inset(0 0 " + (H - fold - 0.5) + "px 0)";
  const low = document.createElement("canvas");
  low.className = "willy-low";
  low.setAttribute("aria-hidden", "true");
  low.style.cssText = "position:absolute;left:0;top:0;width:" + W + "px;height:" + (H - fold) + "px;pointer-events:none;transition:none;transform-origin:0 0";
  room.appendChild(low);
  const lowPen = low.getContext("2d");
  const show = () => {
    renderer.render(scene, cam);
    if (body && body.drawn) body.drawn();
    const k = cv.width / W,
      top = Math.round(fold * k);
    if (low.width !== cv.width || low.height !== cv.height - top) Object.assign(low, { width: cv.width, height: cv.height - top });
    lowPen.clearRect(0, 0, low.width, low.height);
    lowPen.drawImage(cv, 0, top, cv.width, low.height, 0, 0, low.width, low.height);
  };
  // drawn at the size the stage shows it at
  const resize = () => {
    const s = parseFloat(getComputedStyle(stage).getPropertyValue("--s")) || 1;
    const z = parseFloat(getComputedStyle(stage).getPropertyValue("--zoom")) || 0.72;
    renderer.setPixelRatio(devicePixelRatio * s * z);
    renderer.setSize(W, H, false);
  };
  resize();
  addEventListener("resize", resize);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 6000);
  cam.up.set(0.408, 0.408, 0.816).normalize();
  const target = new THREE.Vector3(0, 0, ANCHOR_Z);
  cam.position.copy(target).addScaledVector(new THREE.Vector3(-1, -1, 1).normalize(), 3000);
  cam.lookAt(target);
  // a soft fill from all round, and the room's own sources (ROOM.lights()) as point lights,
  // moved with him, since his world is centred on him; all four always there, an unlit one at
  // nothing, so that one switching on recompiles no shader
  const sky = new THREE.HemisphereLight(0xffffff, 0x5a6470, FILL);
  sky.position.set(0, 0, 1);
  scene.add(sky);
  const lamps = [0, 1, 2, 3].map(() => {
    const l = new THREE.PointLight(0xffffff, 0, 0, 0);
    scene.add(l);
    return l;
  });
  let sources = [],
    here = [0, 0, 0],
    moon = 1; // how much of him is in the window's light
  const dark = () => !sources.some((s) => s.name === "room" && s.power);
  // whether the room's light pass lights him (room-light.js): then his canvas draws only his
  // colours, a white light from all round as strong as three.js takes for all of it (π)
  const passed = () => !!body.drawn;
  // each source where it is from him, as strong as it is now
  const shine = () => {
    if (passed()) {
      for (const l of lamps) l.intensity = 0;
      sky.color.set(0xffffff);
      sky.groundColor.set(0xffffff);
      sky.intensity = Math.PI;
      return;
    }
    const night = dark();
    lamps.forEach((l, i) => {
      const s = sources[i];
      l.intensity = s ? s.power * (STRENGTH[s.name] ?? 1) * (night && s.name === "window" ? moon : 1) : 0;
      if (!s) return;
      l.color.set(s.color);
      l.distance = s.reach;
      l.position.set(s.at[0] - here[0], here[1] - s.at[1], s.at[2] - here[2]);
    });
    sky.color.set(night ? NIGHT.sky : 0xffffff);
    sky.groundColor.set(night ? NIGHT.ground : 0x5a6470);
    sky.intensity = night ? NIGHT.power : FILL;
  };

  let gltf;
  try {
    // (packed by gltfpack, cat-src/README.md: his clips take a third of the room)
    gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(src);
  } catch (e) {
    // no Willy: nothing of him left in the room
    renderer.dispose();
    cv.remove();
    throw e;
  }
  const holder = new THREE.Group();
  const model = gltf.scene;
  model.rotation.x = Math.PI / 2; // glTF is y-up; the room is z-up
  model.scale.setScalar(SCALE);
  holder.add(model);
  scene.add(holder);
  // him for the room's light pass (room-light.js), as ROOM.willy once he is first placed: what of
  // him it lights (his body, which casts his shadow, and his fur), and whom to tell each time he
  // is drawn, so it draws him in the same frame; again() draws him anew, as when it starts
  // lighting him or stops
  const body = { holder, here: () => here, body: [], fur: [], drawn: null, again: null };
  const skinned = body.body;
  model.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
    if (o.isSkinnedMesh) skinned.push(o);
  });
  // matte, so the coat does not shine like plastic
  for (const mesh of skinned) mesh.material = new THREE.MeshLambertMaterial({ map: mesh.material.map });
  fur(skinned);
  model.traverse((o) => o.isSkinnedMesh && !skinned.includes(o) && body.fur.push(o));
  outline(skinned);

  const mixer = new THREE.AnimationMixer(model);
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
  const size = measure(model, skinned, mixer, clips);
  // (his body only: neither its fur nor its outline casts a shadow of its own)
  for (const mesh of skinned) mesh.layers.enable(SHADE.layer);
  const blob = shadow(renderer);
  room.insertBefore(blob.canvas, cv);
  holder.rotation.order = "ZYX"; // tilted in his own frame, then turned to his heading
  const legs = LEGS.map((l) => l.map((n) => model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n))));
  const legged = legs.every((l) => l.every(Boolean));
  const skull = model.getObjectByName("Head");
  // what of him the moon is looked for on: his head and along his back
  const torso = ["Head", "Spine.3", "Spine.2", "Spine.1", "Spine"].map((n) => model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n))).filter(Boolean);
  // him cut out of the dark layer: his body drawn plain white into a canvas in it, where the
  // layer then leaves the room as it is, but where something solid stands in front of him
  const veil = document.createElement("canvas");
  veil.className = "night-willy";
  veil.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  window.ROOM.night.append(veil);
  const pen = veil.getContext("2d"),
    plain = new THREE.MeshBasicMaterial({ color: 0xffffff });
  let veiled = false;
  const cutout = () => {
    if (!dark() || passed()) {
      if (veiled) pen.clearRect(0, 0, veil.width, veil.height);
      veiled = false;
      return;
    }
    const k = devicePixelRatio,
      vw = Math.round(innerWidth * k),
      vh = Math.round(innerHeight * k);
    if (veil.width !== vw || veil.height !== vh) Object.assign(veil, { width: vw, height: vh });
    pen.clearRect(0, 0, vw, vh);
    const over = scene.overrideMaterial,
      seen = cam.layers.mask;
    scene.overrideMaterial = plain;
    cam.layers.set(SHADE.layer); // (his body, without the fur's fringe or his shadow)
    renderer.render(scene, cam);
    scene.overrideMaterial = over;
    cam.layers.mask = seen;
    const r = cv.getBoundingClientRect();
    pen.drawImage(cv, r.left * k, r.top * k, r.width * k, r.height * k);
    pen.globalCompositeOperation = "destination-out";
    for (const hull of window.ROOM.before(shape(size.idle, at.x, at.y, here[2], at.heading, 0))) {
      pen.beginPath();
      hull.forEach(([px, py], i) => (i ? pen.lineTo(px * k, py * k) : pen.moveTo(px * k, py * k)));
      pen.fill();
    }
    pen.globalCompositeOperation = "source-over";
    veiled = true;
  };
  // none under reduced motion, where he sleeps and does not move
  const life = matchMedia("(prefers-reduced-motion: reduce)").matches ? null : alive(model, holder);
  let at = { x: 0, y: 0, z: 0, heading: 0, under: null },
    steps = [0, 0, 0, 0],
    then = 0,
    bent = [];
  // the leg bones as the clip has them, before stand() bent them
  const unbend = () => {
    for (const [b, q] of bent) b.quaternion.copy(q);
    bent = [];
  };
  // him where place() put him, in the pose the clip has him in. On a low thing he walks over
  // (room.js, ground()) each paw stands on the ground under it: his shoulders and his hips rise
  // by part of the step between their two paws, his body tilts between them, and each leg bends
  // to put its paw where the clip has it, as high above its own ground. His shadow lies on the
  // highest of those grounds, on a book rather than under it; in the air, on under.z, what is under him, his paws under.by above
  // it, and fades the higher they are. As the room's own shadows do (room.css, .shade), it falls
  // away from a light high behind on the left, further the taller he is and the higher in the air.
  const stand = () => {
    unbend();
    const { x, y, z, heading, under } = at,
      r = (heading * Math.PI) / 180;
    holder.rotation.set(0, 0, r);
    holder.position.set(0, 0, 0);
    holder.updateMatrixWorld(true);
    const feet = legged ? legs.map(([top, , end, paw]) => ({ top: top.getWorldPosition(new THREE.Vector3()), end: end.getWorldPosition(new THREE.Vector3()), paw: paw.getWorldPosition(new THREE.Vector3()) })) : [];
    // (the room's y runs towards the viewer, his world's the other way)
    const want = feet.map((f) => (under ? 0 : window.ROOM.ground(x + f.paw.x, y - f.paw.y, z) - z));
    const now = performance.now() / 1000,
      dt = now - then;
    then = now;
    steps = want.map((g, i) => (dt > 0.25 || under || Math.abs(g - steps[i]) < 0.5 ? g : g + (steps[i] - g) * Math.exp(-dt / EASE)));
    let lift = 0;
    if (steps.some((g) => g > 0)) {
      const pair = (a, b, k) => Math.min(a, b) + k * Math.abs(a - b),
        along = (i) => feet[i].paw.x * Math.cos(r) + feet[i].paw.y * Math.sin(r),
        front = pair(steps[0], steps[1], RAISE[0]),
        hind = pair(steps[2], steps[3], RAISE[1]),
        xf = (along(0) + along(1)) / 2,
        xh = (along(2) + along(3)) / 2,
        tilt = (front - hind) / (xf - xh);
      lift = front - xf * tilt;
      holder.rotation.set(0, -Math.atan(tilt), r); // (nose up is a turn the other way about his y)
      // tilted about the height of his shoulders and hips, which a tilt about his feet would
      // push back and forth, out of his legs' reach
      const pivot = new THREE.Vector3(0, 0, feet.reduce((n, f) => n + f.top.z, 0) / 4);
      holder.position.copy(pivot).sub(pivot.clone().applyEuler(holder.rotation));
      holder.updateMatrixWorld(true);
      legs.forEach((l, i) => {
        for (const b of l.slice(0, 3)) bent.push([b, b.quaternion.clone()]);
        reach(l, feet[i].end.clone().setZ(feet[i].end.z + steps[i] - lift));
      });
    }
    const u = under || { z: z + (steps.length ? Math.max(...steps) : 0), by: 0 },
      h = z + lift;
    cv.style.transform = "translate3d(" + (x - b - W / 2) + "px," + (y + b - H / 2) + "px," + (h + ANCHOR_Z + b) + "px) rotateZ(45deg) rotateX(-54.7356deg)";
    // the fold's row, where his canvas's rows run (across: along the room's x and y; down: back
    // to front and down), and below it flat, back to front, the same on screen
    const r2 = Math.SQRT1_2,
      r6 = 1 / Math.sqrt(6),
      t = fold - H / 2,
      o = [x - b - (W / 2) * r2 - t * r6, y + b - (W / 2) * r2 + t * r6, h + FOLD];
    low.style.transform = "matrix3d(" + [r2, r2, 0, 0, -3 * r6, 3 * r6, 0, 0, -1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3), 0, ...o, 1].map((n) => +n.toFixed(5)).join(",") + ")";
    here = [x, y, h];
    // in the dark, the moon as far as it falls on him, and his shadow cast by the strongest
    // light that reaches him, away from it; or none, where none does
    const room = (v) => [x + v.x, y - v.y, h + v.z];
    moon = torso.length ? torso.filter((b) => window.ROOM.moonlit(...room(b.getWorldPosition(new THREE.Vector3())))).length / torso.length : 1;
    let fall = SHADE.fall,
      strength = 1;
    if (dark()) {
      const mid = [x, y, h + ANCHOR_Z],
        reaching = sources
          .filter((s) => s.power && s.name !== "room")
          .map((s) => ({ s, e: s.power * (s.name === "window" ? moon : s.reach ? Math.max(0, 1 - Math.hypot(...s.at.map((c, i) => c - mid[i])) / s.reach) : 1) }))
          .sort((a, b) => b.e - a.e)[0];
      strength = reaching ? Math.min(1, reaching.e) : 0;
      if (reaching) {
        const a = reaching.s.at,
          up = Math.max(60, a[2] - mid[2]),
          f = [(mid[0] - a[0]) / up, -(mid[1] - a[1]) / up], // (his world's y runs the other way)
          n = Math.hypot(...f);
        fall = n > 1.2 ? f.map((c) => (c * 1.2) / n) : f;
      }
    }
    blob.fall(fall);
    // (the surface it lies on: what he stands on, or a book on it)
    const on = window.ROOM.surfaces.filter((s) => x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1 && s.z <= u.z + 0.5).sort((a, b) => b.z - a.z)[0];
    blob.on(x, y, u.z - h, u.z + 0.5, on);
    blob.canvas.style.opacity = passed() ? 0 : SHADOW * strength * Math.max(0, 1 - u.by / 300);
    shine();
  };
  // him drawn as he is now, lit by his own lights and with his own shadow unless the light pass
  // lights him
  const paint = () => {
    stand();
    if (!passed()) blob.cast(scene);
    cutout();
    show();
  };
  body.again = paint;
  // his many shaders (one a shell of fur) compiled in the background where the browser can,
  // rather than all at once in his first frame
  await renderer.compileAsync(scene, cam);
  // lit as the room is, and drawn again whenever its lights change
  sources = window.ROOM.lights();
  window.ROOM.onLights(() => {
    sources = window.ROOM.lights();
    paint();
  });
  const moments = (clip, at) => {
    const m = size[clip].moments;
    return at == null ? m : [m[Math.min(m.length - 1, Math.max(0, Math.round(at * (m.length - 1))))]];
  };

  return {
    canvas: cv,
    clips,
    mixer,
    // where he stands, in room px (z the height of what he stands on), and which way he
    // faces, in degrees: 0 along the room's x, 90 towards the back wall; in the air, what is
    // under him (stand())
    place(x, y, z, heading, under = null) {
      at = { x, y, z, heading, under };
      stand();
      window.ROOM.willy ??= body; // (not before: until then he stands at the room's origin, unposed)
    },
    draw(dt) {
      unbend();
      life?.restore();
      mixer.update(dt);
      life?.apply(Object.keys(clips).find((n) => clips[n].isScheduled()) || "", here);
      paint();
    },
    size,
    // where he looks, a point in room px, or nowhere (null): he turns his head to it while he
    // rests, as far as a neck turns
    look(p) {
      if (life) life.target = p;
    },
    // a slow blink, s long; an ear turned
    blink: (s) => life?.blink(s),
    twitch: () => life?.twitch(),
    // where the top of his head is on the screen, in the viewport's px
    head() {
      const v = skull.getWorldPosition(new THREE.Vector3());
      v.z += 40;
      v.project(cam);
      const r = cv.getBoundingClientRect();
      return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
    },
    // whether he fits at x, y, standing at z and facing heading, in that clip: clear of
    // everything solid in the room (but what makes the surfaces named in past), wholly on the
    // surface on, when one is given, and at the moment at (0 to 1 of the way through the
    // clip), or at every moment of it
    fits(x, y, z, heading, clip, { on = null, at = null, past = [] } = {}) {
      return moments(clip, at).every((m, i, all) => {
        const over = /^(lie|sleep|wake|curl|uncurl|loaf|knead-lie|pet-lie|roll-over)/.test(clip) ? LYING : OVER;
        if (on && !shape(m, x, y, z, heading, 0).parts[0].q.every(([a, b]) => a >= on.x0 - over && a <= on.x1 + over && b >= on.y0 - over && b <= on.y1 + over)) return false;
        return window.ROOM.clear(shape(m, x, y, up(z, clip, at, i, all.length), heading), past);
      });
    },
    // what he goes into there, by name, to say why a place is refused
    into: (x, y, z, heading, clip, at = null) => [...new Set(moments(clip, at).flatMap((b, i, all) => window.ROOM.into(shape(b, x, y, up(z, clip, at, i, all.length), heading))))],
    // how high his root is above the arc, at that moment of jump-air
    lift,
  };
}

// The room each clip takes, in px in his own frame: x0 to x1 ahead of the point he stands on,
// y0 to y1 to his left, up to z1; over the whole clip, and at each of a few moments of it, since
// a clip that changes his shape (from standing to curled up) takes less at any one moment than
// over all of them. Measured on the posed mesh. A cycle (the walk, idle) is checked whole. A
// turn turns him about where he stands: each of its moments is measured the way he faces by
// then, and says by how much (yaw, degrees), or a cat half way round would take a square.
const MOMENTS = 8;
function measure(model, skinned, mixer, clips) {
  const out = {};
  const box = new THREE.Box3(),
    v = new THREE.Vector3();
  const plain = (b, yaw = 0) => ({ x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z1: b.max.z, yaw });
  const head = model.getObjectByName("Head"),
    spine = model.getObjectByName("Spine");
  const facing = () => {
    const d = head.getWorldPosition(new THREE.Vector3()).sub(spine.getWorldPosition(new THREE.Vector3()));
    return Math.atan2(d.y, d.x);
  };
  for (const [name, a] of Object.entries(clips)) {
    const turn = name.startsWith("turn") && head && spine;
    const at = [],
      yaws = [];
    a.play();
    let rest = 0;
    for (let k = 0; k <= MOMENTS * 2; k++) {
      a.time = (a.getClip().duration * k) / (MOMENTS * 2);
      mixer.update(0);
      model.updateMatrixWorld(true);
      const here = new THREE.Box3();
      if (turn) {
        if (k === 0) rest = facing();
        const yaw = facing() - rest,
          c = Math.cos(-yaw),
          s = Math.sin(-yaw);
        for (const m of skinned)
          for (let i = 0; i < m.geometry.attributes.position.count; i++) {
            m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
            here.expandByPoint(v.set(v.x * c - v.y * s, v.x * s + v.y * c, v.z));
          }
        yaws.push((yaw * 180) / Math.PI);
      } else {
        for (const m of skinned) {
          m.computeBoundingBox();
          here.union(box.copy(m.boundingBox).applyMatrix4(m.matrixWorld));
        }
        yaws.push(0);
      }
      at.push(here);
    }
    a.stop();
    const all = at.reduce((u, b) => u.union(b), new THREE.Box3());
    // each moment holds the samples either side of it too, so nothing slips between two
    const moments = [];
    for (let i = 0; i <= MOMENTS; i++) moments.push(plain(at.slice(Math.max(0, 2 * i - 1), 2 * i + 2).reduce((u, b) => u.union(b), new THREE.Box3()), yaws[2 * i]));
    out[name] = { ...plain(all), moments: ["walk", "trot", "run", "sneak", "chase", "idle"].includes(name) ? [plain(all)] : moments };
  }
  // "turn": what any turn takes at any moment of it, the way he faces then
  const turns = Object.values(out).filter((c) => c.moments.some((m) => m.yaw));
  if (turns.length) {
    const u = (k, f) => f(...turns.flatMap((c) => c.moments.map((m) => m[k])));
    const all = { x0: u("x0", Math.min), x1: u("x1", Math.max), y0: u("y0", Math.min), y1: u("y1", Math.max), z1: u("z1", Math.max), yaw: 0 };
    out.turn = { ...all, moments: [all] };
  }
  return out;
}

// how high he is at z in that clip: the arc holds him up in the air, his root above it
function up(z, clip, at, i, n) {
  return clip === "jump-air" ? z + lift(at ?? (n > 1 ? i / (n - 1) : 0)) : z;
}

// One leg bent so that the head of its third bone (the wrist, the hock) is at target, in his
// world, or as near as the leg reaches: its first two bones turn in the plane they bend in, and
// the third keeps the way it was turned, so the paw stays as flat as the clip had it.
function reach([upper, mid, end], target) {
  const a = upper.getWorldPosition(new THREE.Vector3()),
    b = mid.getWorldPosition(new THREE.Vector3()),
    c = end.getWorldPosition(new THREE.Vector3()),
    keep = end.getWorldQuaternion(new THREE.Quaternion());
  const ab = a.distanceTo(b),
    bc = b.distanceTo(c),
    at = THREE.MathUtils.clamp(a.distanceTo(target), Math.abs(ab - bc) + 0.01, ab + bc - 0.01);
  const angle = (u, v) => Math.acos(THREE.MathUtils.clamp(u.dot(v) / (u.length() * v.length()), -1, 1)),
    cosine = (n) => Math.acos(THREE.MathUtils.clamp(n, -1, 1));
  const axis = c.clone().sub(a).cross(b.clone().sub(a));
  if (axis.lengthSq() < 1e-6) return; // straight: no plane to bend in
  axis.normalize();
  turn(upper, axis, cosine((bc * bc - ab * ab - at * at) / (-2 * ab * at)) - angle(c.clone().sub(a), b.clone().sub(a)));
  turn(mid, axis, cosine((at * at - ab * ab - bc * bc) / (-2 * ab * bc)) - angle(a.clone().sub(b), c.clone().sub(b)));
  // then the whole leg swung about the shoulder or the hip, onto the target
  const to = end.getWorldPosition(new THREE.Vector3()).sub(a),
    aim = target.clone().sub(a),
    swing = to.clone().cross(aim);
  if (swing.lengthSq() > 1e-9) turn(upper, swing.normalize(), angle(to, aim));
  end.quaternion.copy(end.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(keep));
  end.updateMatrixWorld(true);
}
// a bone turned by angle about an axis in his world
function turn(bone, axis, angle) {
  const q = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
  bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(q), angle));
  bone.updateMatrixWorld(true);
}

// The small motions over every clip, as a cat is never quite still: his breathing, his tail
// swaying and now and then flicking at its tip, now and then an ear turning or a blink, and his
// head turned to whatever he looks at, as far as a neck turns. Each is a turn of a few bones on
// top of the clip's pose, about his own axes, put back before the next frame.
const RESTS = new Set(["idle", "sit", "sit-idle", "lie", "lie-idle", "loaf", "crouch", "pet", "pet-sit", "pet-lie", "knead-lie"]);
const ASLEEP = /^(sleep|curl|uncurl)/;
const STILL_TAIL = /^(jump|run|land-stop|roll-over|chase)/;
const LOOK = { yaw: 70, pitch: 30, neck: 0.4, ease: 0.18, fade: 0.3 }; // degrees as far as he turns, s
const BREATH = { awake: [0.45, 1.5], asleep: [0.28, 2.5] }; // a second, degrees
const SWAY = { awake: [0.25, 4], asleep: [0.15, 1], lag: 0.7, flick: [5, 14], flickDeg: 25 }; // a second, degrees, rad a bone, s apart, degrees
const TWITCH = { every: [3, 9], deg: 30 }; // s apart, degrees
const BLINK = { every: [2.5, 7], s: 0.16, deg: 60 }; // s apart, s it takes, degrees the lids close
function alive(model, holder) {
  const bone = (n) => model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
  const B = {
    neck: bone("Neck"),
    head: bone("Head"),
    back: [bone("Spine.2"), bone("Spine.3")],
    ears: [bone("ear.L"), bone("ear.R")],
    lids: [bone("lid_up.L"), bone("lid_up.R"), bone("lid_down.L"), bone("lid_down.R")],
    nose: [bone("nose.L"), bone("nose.R")],
    tail: ["tail.1", "tail.2", "tail.3", "tail.4", "tail.5", "tail.6", "tail.7"].map(bone),
  };
  if (Object.values(B).flat().some((b) => !b)) return null;
  const between = ([a, b]) => a + Math.random() * (b - a),
    deg = Math.PI / 180,
    touched = [];
  let clock = 0,
    then = null,
    yaw = 0,
    pitch = 0,
    weight = 0,
    flickAt = between(SWAY.flick),
    flick = null,
    earAt = between(TWITCH.every),
    ear = null,
    blinkAt = between(BLINK.every),
    blinkLen = BLINK.s;
  const move = (b, axis, a) => {
    if (!a) return;
    touched.push([b, b.quaternion.clone()]);
    turn(b, axis, a);
  };
  // how far through a quick there and back he is, 0 to 1 and back, s after it began
  const pulse = (s, len) => (s < 0 || s > len ? 0 : Math.sin((Math.PI * s) / len));
  return {
    target: null, // where he looks, in room px, or nowhere
    // a blink now, of s seconds (a slow one is a cat's smile), and an ear turned now
    blink(s) {
      blinkAt = clock;
      blinkLen = s;
    },
    twitch() {
      earAt = clock;
    },
    // the clip's own pose back, before the mixer sets the next
    restore() {
      for (let i = touched.length - 1; i >= 0; i--) touched[i][0].quaternion.copy(touched[i][1]);
      touched.length = 0;
    },
    apply(clip, here) {
      const now = performance.now() / 1000,
        dt = then == null ? 0 : Math.min(0.1, now - then);
      then = now;
      clock += dt;
      holder.updateMatrixWorld(true);
      const e = holder.matrixWorld.elements,
        forward = new THREE.Vector3(e[0], e[1], e[2]).normalize(),
        left = new THREE.Vector3(e[4], e[5], e[6]).normalize(),
        up = new THREE.Vector3(e[8], e[9], e[10]).normalize();
      const sleeping = ASLEEP.test(clip),
        resting = RESTS.has(clip);
      // breathing: his back rising and falling between his hips and his chest
      if (resting || sleeping) {
        const [f, a] = sleeping ? BREATH.asleep : BREATH.awake,
          b = a * deg * (0.5 + 0.5 * Math.sin(2 * Math.PI * f * clock));
        move(B.back[0], left, -b);
        move(B.back[1], left, b);
      }
      // the tail: a slow wave from its root to its tip, and now and then a flick of the tip
      if (!STILL_TAIL.test(clip)) {
        const [f, a] = sleeping ? SWAY.asleep : SWAY.awake;
        if (!sleeping && clock > flickAt) {
          flick = { at: clock, side: Math.random() < 0.5 ? -1 : 1 };
          flickAt = clock + between(SWAY.flick);
        }
        const k = flick ? pulse(clock - flick.at, 0.45) : 0;
        B.tail.forEach((b, i) => move(b, up, (a * Math.sin(2 * Math.PI * f * clock - i * SWAY.lag) + (i >= 4 && flick ? flick.side * k * SWAY.flickDeg * (i - 3) / 3 : 0)) * deg));
      }
      if (sleeping) return;
      // an ear turned back a moment, now and then, one at a time
      if (clock > earAt) {
        ear = { at: clock, i: Math.random() < 0.5 ? 0 : 1 };
        earAt = clock + between(TWITCH.every);
      }
      if (ear) move(B.ears[ear.i], up, (ear.i ? 1 : -1) * TWITCH.deg * deg * pulse(clock - ear.at, 0.4));
      // a blink
      if (clock > blinkAt + blinkLen) {
        blinkAt = clock + between(BLINK.every);
        blinkLen = BLINK.s;
      }
      const shut = pulse(clock - blinkAt, blinkLen) * BLINK.deg * deg;
      B.lids.forEach((b, i) => move(b, left, i < 2 ? -shut : shut)); // (the upper lids close one way about his left, the lower ones the other)
      // the head turned to where he looks, in the rests only, the neck taking part of it
      const head = B.head.getWorldPosition(new THREE.Vector3()),
        nose = B.nose[0].getWorldPosition(new THREE.Vector3()).add(B.nose[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5),
        facing = nose.sub(head).normalize();
      let want = [0, 0];
      if (this.target && resting) {
        const p = this.target,
          to = new THREE.Vector3(p[0] - here[0], here[1] - p[1], p[2] - here[2]).sub(head).normalize(),
          flat = (v) => v.clone().projectOnPlane(up).normalize(),
          [a, b] = [flat(facing), flat(to)],
          turnBy = Math.atan2(a.clone().cross(b).dot(up), a.dot(b)),
          lift = Math.asin(THREE.MathUtils.clamp(to.dot(up), -1, 1)) - Math.asin(THREE.MathUtils.clamp(facing.dot(up), -1, 1));
        want = [THREE.MathUtils.clamp(turnBy, -LOOK.yaw * deg, LOOK.yaw * deg), THREE.MathUtils.clamp(lift, -LOOK.pitch * deg, LOOK.pitch * deg)];
      }
      const ease = (t) => 1 - Math.exp(-dt / t);
      weight += ((this.target && resting ? 1 : 0) - weight) * ease(LOOK.fade);
      yaw += (want[0] - yaw) * ease(LOOK.ease);
      pitch += (want[1] - pitch) * ease(LOOK.ease);
      const across = left.clone().applyAxisAngle(up, yaw * weight);
      move(B.neck, up, yaw * weight * LOOK.neck);
      move(B.head, up, yaw * weight * (1 - LOOK.neck));
      move(B.neck, across, -pitch * weight * LOOK.neck); // (nose up is a turn the other way about his left)
      move(B.head, across, -pitch * weight * (1 - LOOK.neck));
    },
  };
}

// that room where he stands, as the room measures its own things (room.js, bounds()): turned
// to his heading, clear px larger, from just above what he stands on
function shape(b, x, y, z, heading, clear = CLEAR) {
  const r = ((heading + b.yaw) * Math.PI) / 180,
    f = [Math.cos(r), -Math.sin(r)],
    l = [-Math.sin(r), -Math.cos(r)]; // his left, in the room (whose y runs the other way)
  const q = [[b.x0 - clear, b.y0 - clear], [b.x1 + clear, b.y0 - clear], [b.x1 + clear, b.y1 + clear], [b.x0 - clear, b.y1 + clear]].map(([u, v]) => [x + f[0] * u + l[0] * v, y + f[1] * u + l[1] * v]);
  const xs = q.map((p) => p[0]),
    ys = q.map((p) => p[1]);
  const part = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), q };
  return { ...part, z0: z + 2, z1: z + b.z1, parts: [part] };
}

// His shadow: his own shape as seen from under the ground he stands on, each point of him
// fallen away from a light high behind on the left as the room's shadows do (room.css,
// .shade), darker the nearer it is to the ground, so that it starts at his paws; then blurred,
// as the room's are. Not a shadow map: the room's sources are too many and too soft for one to
// mean anything. Drawn not in his canvas but in one of its own, lying on the ground (on()):
// his canvas faces the reader, so below his feet it goes into whatever he stands on, and
// whatever of his shadow falls towards the reader would be cut off there. cast() draws it anew.
function shadow(renderer) {
  const { size, texels, high, fall, blur } = SHADE;
  const target = () => new THREE.WebGLRenderTarget(texels, texels, { depthBuffer: true });
  const a = target(),
    b = target();
  // looking up from the ground: his world's x comes out mirrored, so the plane reads it so
  const eye = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, -2, high);
  eye.layers.set(SHADE.layer);
  eye.up.set(0, 1, 0);
  eye.lookAt(0, 0, 1);
  // each point moved along the ground by its height, which the eye sees as its depth (-z), by f
  // a px of height, along his world's x and y
  const level = eye.projectionMatrix.clone();
  const fallBy = (f) => eye.projectionMatrix.copy(level).multiply(new THREE.Matrix4().set(1, 0, f[0], 0, 0, 1, -f[1], 0, 0, 0, 1, 0, 0, 0, 0, 1));
  fallBy(fall);
  const dark = new THREE.MeshDepthMaterial();
  dark.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );", "gl_FragColor = vec4( vec3( 0.0 ), 1.0 - fragCoordZ );");
  };
  // a gaussian blur, one way per pass
  const soft = new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, along: { value: new THREE.Vector2() } },
    vertexShader: "varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform sampler2D map;
uniform vec2 along;
varying vec2 vUv;
void main() {
  float w[5] = float[](0.227, 0.194, 0.121, 0.054, 0.016);
  vec4 s = texture2D(map, vUv) * w[0];
  for (int i = 1; i < 5; i++) s += (texture2D(map, vUv + along * float(i)) + texture2D(map, vUv - along * float(i))) * w[i];
  gl_FragColor = s;
}`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), soft);
  quad.frustumCulled = false;
  const flat = new THREE.Camera();
  const cv = document.createElement("canvas");
  cv.className = "willy-shadow";
  cv.setAttribute("aria-hidden", "true");
  Object.assign(cv, { width: texels, height: texels });
  cv.style.cssText = "position:absolute;left:0;top:0;width:" + size + "px;height:" + size + "px;pointer-events:none;transition:none";
  const pen = cv.getContext("2d");
  const copy = new THREE.ShaderMaterial({
    uniforms: { map: { value: null } },
    vertexShader: soft.vertexShader,
    fragmentShader: `uniform sampler2D map;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(map, vUv); }`,
    depthTest: false,
    depthWrite: false,
  });
  let below = 0; // how far the ground is below him
  const m = { canvas: cv, fall: fallBy };
  // on the ground at z in the room, under him at x, y, below him, and only as far as the
  // surface s goes, rather than out into the air past its edge: the eye looks up with his
  // world's x mirrored, so the picture lies mirrored back (its rows already run the room's way)
  m.on = (x, y, under, z, s) => {
    below = under;
    const x0 = x - size / 2,
      y0 = y - size / 2,
      cut = (n) => Math.max(0, n).toFixed(1) + "px";
    cv.style.clipPath = s ? "inset(" + [s.y0 - y0, x0 + size - s.x1, y0 + size - s.y1, s.x0 - x0].map(cut).join(" ") + ")" : "";
    cv.style.transform = "translate3d(" + x0 + "px," + y0 + "px," + z + "px) scaleX(-1)";
  };
  // (the weights are a gaussian of 2 taps' width: a tap every half of each pass's px)
  const tap = size / texels;
  m.cast = (scene) => {
    const was = renderer.getRenderTarget(),
      over = scene.overrideMaterial;
    eye.position.set(0, 0, below + 0.5);
    eye.updateMatrixWorld();
    scene.overrideMaterial = dark;
    renderer.setRenderTarget(a);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, eye);
    scene.overrideMaterial = over;
    for (const px of blur)
      for (const [from, to, dir] of [[a, b, [1, 0]], [b, a, [0, 1]]]) {
        soft.uniforms.map.value = from.texture;
        soft.uniforms.along.value.set(dir[0], dir[1]).multiplyScalar(px / 2 / tap / texels);
        renderer.setRenderTarget(to);
        renderer.render(quad, flat);
      }
    // into his canvas a moment and copied out of it, on the GPU: read back, it stalls a frame
    renderer.setRenderTarget(null);
    quad.material = copy;
    copy.uniforms.map.value = a.texture;
    renderer.render(quad, flat);
    quad.material = soft;
    pen.clearRect(0, 0, texels, texels);
    pen.drawImage(renderer.domElement, 0, 0, texels, texels);
    renderer.setRenderTarget(was);
  };
  return m;
}

// Fur: shells over the body, each a hair further out, with fewer strands kept the further out
// it is, combed back and down towards the tail, and longer on the tail. The coat's own colour
// carries through.
export function fur(skinned, options = {}) {
  const f = { ...FUR, ...options };
  const n = 128;
  const data = new Uint8Array(n * n);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 255;
  const strands = new THREE.DataTexture(data, n, n, THREE.RedFormat);
  strands.wrapS = strands.wrapT = THREE.RepeatWrapping;
  strands.magFilter = strands.minFilter = THREE.NearestFilter; // one texel, one strand
  strands.needsUpdate = true;
  const v = (a) => "vec3(" + a.map((n) => n.toFixed(3)).join(", ") + ")";
  for (const mesh of skinned) {
    const unit = size(mesh) / LENGTH,
      comb = combOf(mesh);
    tailOf(mesh);
    for (let i = 1; i <= f.shells; i++) {
      const t = i / f.shells;
      const h = f.reach * unit * t,
        keep = 0.3 + 0.65 * t * t,
        shade = 0.8 + 0.2 * t,
        tip = 0.07 * t,
        lean = f.comb * h * t;
      const m = new THREE.MeshLambertMaterial({ map: mesh.material.map });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.strands = { value: strands };
        sh.vertexShader =
          "attribute float tailw;\n" +
          sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  float grow = 1.0 + tailw * " + f.tail.toFixed(3) + ";\n  transformed += (normal * " + h.toFixed(5) + " + " + v(comb) + " * " + lean.toFixed(5) + ") * grow;");
        sh.fragmentShader =
          "uniform sampler2D strands;\n" +
          sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n  float s = texture2D(strands, vMapUv * " + f.strands.toFixed(1) + ").r;\n  if (s < " + keep.toFixed(3) + ") discard;\n  diffuseColor.rgb = diffuseColor.rgb * " + shade.toFixed(3) + " * (0.9 + 0.2 * s) + " + tip.toFixed(3) + ";");
      };
      mesh.parent.add(twin(mesh, mesh.geometry, m));
    }
  }
  // the body under the fur is a little darker, as the roots are
  for (const mesh of skinned) mesh.material.color.setScalar(0.82);
}

// A thin dark outline: the body again, a hair larger, drawn from the inside. It sits inside
// the fur, so the strands fray the edge beyond it.
export function outline(skinned, options = {}) {
  const f = { ...FUR, ...options };
  for (const mesh of skinned) {
    const grow = FUR.reach * f.outline * (size(mesh) / LENGTH); // as thin under long fur as under short
    const g = mesh.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!["position", "skinIndex", "skinWeight"].includes(k)) g.deleteAttribute(k);
    const merged = mergeVertices(g);
    merged.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color: 0x262626, side: THREE.BackSide });
    mat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normal * " + grow.toFixed(4) + ";");
    };
    mesh.parent.add(twin(mesh, merged, mat));
  }
}

// the longest side of the mesh at rest, in its own units
function size(mesh) {
  mesh.geometry.computeBoundingBox();
  const s = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z);
}

// where a bone stands at rest, in the mesh's own space
function rest(mesh, i) {
  return new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[i].clone().invert()).applyMatrix4(mesh.bindMatrixInverse);
}

// back along the body, from the head to the tail, and down: the way his hair lies
function combOf(mesh) {
  const bones = mesh.skeleton.bones.map((b) => b.name);
  const head = bones.indexOf("Head"),
    tail = bones.indexOf("tail");
  if (head < 0 || tail < 0) return [-0.75, -0.65, 0];
  const back = rest(mesh, tail).sub(rest(mesh, head)).setY(0).normalize();
  return [back.x * 0.75, -0.65, back.z * 0.75];
}

// how much of each point the tail's bones carry, as the attribute tailw
function tailOf(mesh) {
  const g = mesh.geometry;
  if (g.getAttribute("tailw")) return;
  const tail = new Set(mesh.skeleton.bones.flatMap((b, i) => (/^tail/i.test(b.name) || /^Bone00[4-7]$/.test(b.name) ? [i] : [])));
  const idx = g.getAttribute("skinIndex"),
    wt = g.getAttribute("skinWeight"),
    out = new Float32Array(idx.count);
  for (let i = 0; i < idx.count; i++) for (let k = 0; k < 4; k++) if (tail.has(idx.getComponent(i, k))) out[i] += wt.getComponent(i, k);
  g.setAttribute("tailw", new THREE.BufferAttribute(out, 1));
}

// another skinned mesh on the same skeleton, in the same place
function twin(mesh, geometry, material) {
  const t = new THREE.SkinnedMesh(geometry, material);
  t.frustumCulled = false;
  t.position.copy(mesh.position);
  t.quaternion.copy(mesh.quaternion);
  t.scale.copy(mesh.scale);
  t.bind(mesh.skeleton, mesh.bindMatrix);
  return t;
}
