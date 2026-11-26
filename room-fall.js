// What falls in the room (#72): the odds and ends on the desk as bodies in a cannon-es world, the
// desk, the walls, the floor and everything that stands in the room as boxes they meet. Loaded
// with Willy (willy-room.js), who is the one who knocks things off; until something is pushed,
// nothing here runs. A pushed thing is woken, follows the physics through its own element
// (a matrix3d on it, its stacked faces with it), wakes what it meets, sleeps once still, and is
// taken out of the room once it has left the frame. Willy's paw is a body too while he paws at
// something (paw()): moved by his clip, it pushes what it meets. Under reduced motion nothing
// falls.
// Room px throughout, z up from the desk's top; the world counts in units of U px.
import { World, Body, Box, Plane, Sphere, Vec3, Material, ContactMaterial } from "cannon-es";

const U = 100; // px in a world unit: the desk is 1890 px, about 1.4 m, so a unit is about 7 cm
const G = 130; // 9.8 m/s² in units/s²
const STEP = 1 / 120;
const PAW = 12; // px, the paw's radius
const BELOW = -20; // px under the desk's top: what is lower has fallen off it

export function fall(ROOM, reducedMotion) {
  const stage = ROOM.stage,
    room = stage.closest(".room") || document.documentElement;
  const world = new World({ gravity: new Vec3(0, 0, -G), allowSleep: true });
  // (cannon-es caps each contact point's friction by this as an impulse, a step's worth, and a
  // thing lying flat touches at four points: as it is, the friction would stop anything at once)
  world.frictionGravity = new Vec3(0, 0, (G * STEP) / 4);
  const wood = new Material("wood"),
    thing = new Material("thing"),
    pad = new Material("paw");
  world.addContactMaterial(new ContactMaterial(wood, thing, { friction: 0.35, restitution: 0.25 }));
  world.addContactMaterial(new ContactMaterial(thing, thing, { friction: 0.3, restitution: 0.2 }));
  world.addContactMaterial(new ContactMaterial(pad, thing, { friction: 0.2, restitution: 0 }));
  const v = (x, y, z) => new Vec3(x / U, y / U, z / U);

  // the room, still: the floor, the back and right walls, the desk's top, and a box round each
  // solid or low thing in it (ROOM.boxes(), axis-aligned: a turned thing is met a little early)
  const fixed = (shape, at, mat = wood) => {
    const b = new Body({ mass: 0, material: mat });
    b.addShape(shape);
    b.position.copy(at);
    world.addBody(b);
    return b;
  };
  const walls = ROOM.walls;
  fixed(new Plane(), v(0, 0, ROOM.floor));
  fixed(new Plane(), v(0, walls.back, 0)).quaternion.setFromEuler(-Math.PI / 2, 0, 0); // (facing +y)
  fixed(new Plane(), v(walls.right, 0, 0)).quaternion.setFromEuler(0, -Math.PI / 2, 0); // (facing -x)
  const d = ROOM.desk;
  fixed(new Box(v(d.w / 2, d.d / 2, d.t / 2)), v(d.x + d.w / 2, d.y + d.d / 2, -d.t / 2));
  // (those of the room's things, again when it is measured again, rebox(): the toys have been put down)
  let boxes = [];
  const reboxed = () => {
    for (const b of boxes) world.removeBody(b);
    boxes = ROOM.boxes().map((o) => fixed(new Box(v(Math.max(1, (o.x1 - o.x0) / 2), Math.max(1, (o.y1 - o.y0) / 2), Math.max(1, (o.z1 - o.z0) / 2))), v((o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, (o.z0 + o.z1) / 2)));
  };
  reboxed();

  // his paw: moved by him, not by what it meets; in the world only while he paws
  const paw = new Body({ mass: 0, type: Body.KINEMATIC, material: pad, allowSleep: false });
  paw.addShape(new Sphere(PAW / U));
  let pawing = false;
  // a flick (flick()): the thing his paw is to send off as it first touches it, how fast; and
  // once it has, the flick to give it after this step
  let flicking = null,
    flicked = null;
  paw.addEventListener("collide", (ev) => {
    if (flicking && ev.body === flicking.b) (flicked = flicking), (flicking = null);
  });

  // where a thing lies as its element has it: its middle, its half sizes on the desk, its turn
  function measured(e) {
    const m = ROOM.toStage(e),
      sx = Math.hypot(m.m11, m.m12, m.m13),
      sy = Math.hypot(m.m21, m.m22, m.m23),
      t = Math.max(1, e.querySelectorAll(".slice").length - 1),
      w = e.offsetWidth,
      h = e.offsetHeight,
      c = m.transformPoint(new DOMPoint(w / 2, h / 2, t / 2));
    return { m, sx, sy, t, w, h, c, yaw: Math.atan2(m.m12, m.m11) };
  }
  // the things that fall, each made a body the first time anything is pushed, where it lies then
  // (and one put down later, his present, as it is first pushed)
  const bodies = new Map(),
    made = new WeakSet();
  function make() {
    for (const e of stage.querySelectorAll(".loose")) {
      if (made.has(e)) continue;
      made.add(e);
      const { sx, sy, t, w, h, c, yaw } = measured(e);
      const b = new Body({ mass: Math.max(0.02, (w * h * t * sx * sy) / 1e5), material: thing, allowSleep: true, sleepSpeedLimit: 0.08, sleepTimeLimit: 0.4, linearDamping: 0.05, angularDamping: 0.1 });
      // (never thinner than 4 px to the world, or it slips through what it lands on)
      b.addShape(new Box(v((w * sx) / 2, (h * sy) / 2, Math.max(4, t * sx) / 2)));
      b.position.copy(v(c.x, c.y, c.z));
      b.quaternion.setFromEuler(0, 0, yaw);
      world.addBody(b);
      b.sleep();
      bodies.set(e, { b, w, h, t, s: [sx, sy, sx], base: null });
    }
  }

  // its element where its body is: once it first moves, its own place and turn handed over to a
  // matrix3d from where it would stand with none
  function show(e, o) {
    if (!o.base) {
      Object.assign(e.style, { left: "0px", top: "0px", transform: "none", translate: "none", rotate: "none", scale: "none", transformOrigin: "0 0 0", transition: "none" });
      o.base = ROOM.toStage(e).inverse();
    }
    const p = o.b.position,
      q = o.b.quaternion;
    const m = new DOMMatrix().translate(p.x * U, p.y * U, p.z * U);
    const r = new DOMMatrix([1 - 2 * (q.y * q.y + q.z * q.z), 2 * (q.x * q.y + q.z * q.w), 2 * (q.x * q.z - q.y * q.w), 0, 2 * (q.x * q.y - q.z * q.w), 1 - 2 * (q.x * q.x + q.z * q.z), 2 * (q.y * q.z + q.x * q.w), 0, 2 * (q.x * q.z + q.y * q.w), 2 * (q.y * q.z - q.x * q.w), 1 - 2 * (q.x * q.x + q.y * q.y), 0, 0, 0, 0, 1]);
    const local = o.base.multiply(m.multiply(r).scale(o.s[0], o.s[1], o.s[2]).translate(-o.w / 2, -o.h / 2, -o.t / 2));
    e.style.transform = "matrix3d(" + local.toFloat64Array().join(",") + ")";
  }

  // whether a point of the room is out of the frame, with r px to spare
  function gone(p, r) {
    const [x, y] = ROOM.toScreen(p.x * U, p.y * U, p.z * U),
      f = room.getBoundingClientRect(),
      l = Math.max(0, f.left) - r,
      t = Math.max(0, f.top) - r,
      R = Math.min(innerWidth, f.right) + r,
      B = Math.min(innerHeight, f.bottom) + r;
    return x < l || x > R || y < t || y > B || p.z * U < ROOM.floor - 200;
  }

  let running = false,
    last = 0;
  const removed = [],
    fell = [];
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    world.step(STEP, dt, 8);
    if (flicked) {
      flicked.b.velocity.copy(flicked.vel);
      flicked.b.angularVelocity.copy(flicked.spin);
      flicked = null;
    }
    let awake = false,
      moved = null;
    for (const [e, o] of bodies) {
      // (shown while awake, and once more as it falls asleep, where it came to rest)
      const asleep = o.b.sleepState === Body.SLEEPING;
      if (asleep && !o.shown) continue;
      o.shown = !asleep;
      awake ||= !asleep;
      show(e, o);
      moved = e;
      // (off the desk: said once, for the live line, willy-room.js)
      if (!o.fell && o.b.position.z * U < BELOW) {
        o.fell = true;
        fell.push(e);
        stage.dispatchEvent(new CustomEvent("knocked", { detail: e }));
      }
      if (gone(o.b.position, Math.max(o.w, o.h) * o.s[0])) {
        world.removeBody(o.b);
        bodies.delete(e);
        e.remove();
        removed.push(e);
      }
    }
    // (the room's light follows what moves, and lets go of what is gone: room-light.js)
    if (moved) stage.dispatchEvent(new Event("falling"));
    if (awake || pawing) requestAnimationFrame(frame);
    else running = false;
  }
  function run() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  const named = (e) => [...e.classList].find((c) => c !== "loose");

  return {
    // the room's things measured again (the toys, once they are down): the boxes they make are the world's
    rebox: reboxed,
    // push the thing e: its middle given a velocity in room px/s, and a spin, in turns/s round
    // each axis; whether it was
    push(e, vel, spin = [0, 0, 0]) {
      if (reducedMotion()) return false;
      make();
      const o = bodies.get(e);
      if (!o) return false;
      o.b.wakeUp();
      o.shown = true;
      o.b.velocity.copy(v(...vel));
      o.b.angularVelocity.set(...spin.map((s) => s * 2 * Math.PI));
      run();
      return true;
    },
    // Willy's paw at p, [x, y, z] in room px, as he is drawn now (dt s since he last was); or
    // null, put away. It moves towards p over the next frame, at the speed that takes it there,
    // so what it meets is pushed as hard as it moves.
    paw(p, dt = 1 / 60) {
      if (!p) {
        if (pawing) world.removeBody(paw);
        pawing = false;
        flicking = null;
        return;
      }
      if (reducedMotion()) return;
      make();
      if (!pawing) {
        paw.position.copy(v(...p));
        paw.velocity.set(0, 0, 0);
        world.addBody(paw);
        pawing = true;
        run();
        return;
      }
      const to = v(...p),
        k = 1 / Math.max(1 / 240, dt);
      paw.velocity.set((to.x - paw.position.x) * k, (to.y - paw.position.y) * k, (to.z - paw.position.z) * k);
      for (const o of bodies.values()) if (o.b.sleepState === Body.SLEEPING && o.b.position.distanceTo(to) < (PAW + Math.max(o.w, o.h) * o.s[0]) / U) o.b.wakeUp(), (o.shown = true);
    },
    // the next time his paw touches the thing e (while he paws), it is flicked: given the
    // velocity vel, room px/s, and a spin in turns/s, as push() gives them; whether it can be
    flick(e, vel, spin = [0, 0, 0]) {
      if (reducedMotion()) return false;
      make();
      const o = bodies.get(e);
      if (!o) return false;
      flicking = { b: o.b, vel: v(...vel), spin: new Vec3(...spin.map((s) => s * 2 * Math.PI)) };
      return true;
    },
    // where the thing e lies: its middle in room px, its half sizes along its own x and y, its
    // turn about z (radians), and whether it still lies on the desk; or null, gone
    where(e) {
      if (!e.isConnected) return null;
      const o = bodies.get(e);
      if (o) {
        const p = o.b.position,
          q = o.b.quaternion;
        return { x: p.x * U, y: p.y * U, z: p.z * U, hx: (o.w * o.s[0]) / 2, hy: (o.h * o.s[1]) / 2, yaw: Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z)), still: o.b.sleepState === Body.SLEEPING, fell: !!o.fell };
      }
      const { sx, sy, w, h, c, yaw } = measured(e);
      return { x: c.x, y: c.y, z: c.z, hx: (w * sx) / 2, hy: (h * sy) / 2, yaw, still: true, fell: false };
    },
    // for checks: each thing that may fall, where it is (room px), whether it sleeps; those
    // taken out of the room, and those that fell off the desk
    state() {
      make();
      return {
        bodies: [...bodies].map(([e, o]) => ({ name: named(e), x: o.b.position.x * U, y: o.b.position.y * U, z: o.b.position.z * U, asleep: o.b.sleepState === Body.SLEEPING })),
        removed: removed.map(named),
        fell: fell.map(named),
        running,
        pawing,
      };
    },
  };
}
