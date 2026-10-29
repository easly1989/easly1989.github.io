// Willy in the room: the home with ?room, in a window wide enough for it. He keeps the room's
// light off until he is ready, at most as long as the dark lasts (about 4 s), and then lives
// on the desk, the cushion under the window and the shelf, doing one of his everyday actions
// after another (willy-life.js), and saying so in a bubble now and then. three.js and his
// model load only from here, so nothing of the room waits on them; without WebGL 2, or if
// anything fails, there is no Willy and the room is as it is. Under reduced motion he sleeps on
// the cushion and does not move.
const room = document.querySelector(".room");
const stage = document.querySelector(".stage");
const still = matchMedia("(prefers-reduced-motion: reduce)");

let ready;
ROOM.holdLight(new Promise((r) => (ready = r)));
live()
  .catch((e) => {
    room.querySelectorAll("canvas.willy, canvas.willy-low, canvas.willy-shadow").forEach((c) => c.remove());
    console.warn("No Willy:", e);
    // nor in the room's light pass, which draws once more without him and his shadow
    const w = ROOM.willy;
    ROOM.willy = null;
    if (w && w.drawn) w.drawn();
  })
  .finally(() => ready());

// how long he looks about where he is when there is nothing else he can do, s
const LOOK_ABOUT = [3, 7];

async function live() {
  const [{ willy }, { planner }, { moves }, { pick, everyday }] = await Promise.all([import("./willy.js"), import("./willy-paths.js"), import("./willy-moves.js"), import("./willy-life.js")]);
  await ROOM.ready;
  await ROOM.landed(); // (setting him up takes the main thread for a while, and the morph would stop for it)
  const w = await willy(room, stage);
  const P = planner({ surfaces: ROOM.surfaces, jumps: ROOM.jumps, fits: w.fits });
  const M = moves(w, P, ROOM.surfaces);
  const SURF = Object.fromEntries(ROOM.surfaces.map((s) => [s.name, s]));
  const xyh = (s, p) => ({ surface: s, x: p[0], y: p[1], heading: p[2] });
  const fits = (to, clip) => w.fits(to.x, to.y, SURF[to.surface].z, to.heading, clip, { on: SURF[to.surface] });
  // a place on the desk he can walk off from and turn all the way round in (at each of the
  // planner's 16 headings): one he could only walk into, nose first, is a pocket no route leaves
  const free = (to) => fits(to, "walk") && [...Array(16).keys()].every((i) => fits({ ...to, heading: i * 22.5 }, "turn"));
  const between = ([a, b]) => a + Math.random() * (b - a);

  // asleep on the cushion, along it, and nothing more
  if (still.matches) {
    const bed = P.spot("perch", "sleep", Math.random, [0, 180]);
    if (!bed) throw new Error("no room on the cushion");
    M.pose(M.hold("sleep-idle", bed, "perch").at(0));
    w.draw(0);
    addEventListener("resize", () => w.draw(0));
    return;
  }

  // looking about where he is a while
  const lookingAbout = (at) => [M.hold("idle", [at.x, at.y, at.heading], at.surface, between(LOOK_ABOUT) - M.dur("idle"), true)];
  // what he does next, from at, and where he ends up: one of his everyday actions he can do
  // there and now; or, if none can be, he looks about where he is
  const ACTIONS = everyday({ w, P, M, SURF }),
    ran = {};
  let done = null;
  async function next(at) {
    const skip = new Set();
    for (let tries = 0; tries < 8; tries++) {
      const a = pick(ACTIONS, { where: at.surface, now: performance.now() / 1000, ran, last: done, skip });
      if (!a) break;
      const r = await a.run(at);
      if (r && r.moments.length) {
        ran[a.n] = performance.now() / 1000;
        done = a.n;
        return r;
      }
      skip.add(a.n);
    }
    return { to: at, moments: lookingAbout(at) };
  }

  // what he says, in a bubble over his head, for ms
  const says = document.createElement("span");
  says.className = "cat-says";
  says.setAttribute("aria-hidden", "true");
  says.style.position = "fixed";
  document.body.append(says);
  let saying = 0;
  const bubble = () => {
    const [x, y] = w.head();
    // (by left and top: the style's transform eases, and would fly the bubble in from the last one)
    says.style.left = x + 10 + "px";
    says.style.top = y - says.offsetHeight - 6 + "px";
  };
  const say = (text, ms) => {
    says.textContent = text;
    bubble();
    says.classList.add("on");
    saying = performance.now() + ms;
  };

  // where he starts: somewhere free on the desk, looking about
  let at = null;
  for (let n = 0; n < 50 && !at; n++) {
    const p = P.spot("desk", "idle");
    if (p && free(xyh("desk", p))) at = xyh("desk", p);
  }
  if (!at) throw new Error("no room on the desk");
  // what he looks at as he rests, now and then something else: one of the room's sources that is
  // on (the window, the screen, the radio's lamp, the projector's lens), the reader, out of the
  // screen, or nothing
  const LOOKS = [2, 6]; // s
  let lookAt = 0;
  const gaze = (p) => {
    const lit = ROOM.lights().filter((s) => s.power && s.name !== "room"),
      r = Math.random();
    if (r < 0.35 || !p) return null;
    if (r < 0.55 || !lit.length) return [p.x - 600, p.y + 600, 500];
    return lit[Math.floor(Math.random() * lit.length)].at;
  };
  // a point a moment's cue names, as he is at p
  const point = (look, p) => {
    if (look === "reader") return [p.x - 600, p.y + 600, 500];
    if (look === "window") return ROOM.lights().find((s) => s.name === "window")?.at || null;
    if (look === "around") {
      const a = Math.random() * 2 * Math.PI;
      return [p.x + Math.cos(a) * 400, p.y - Math.sin(a) * 400, p.z + between([0, 250])];
    }
    return look;
  };
  // which moment of the show t is in
  const which = (show, t) => {
    for (let i = 0, s = t; i < show.length; i++) {
      if (s <= show[i].dur) return i;
      s -= show[i].dur;
    }
    return show.length - 1;
  };
  let show = lookingAbout(at),
    cued = -1,
    total = show.reduce((n, m) => n + m.dur, 0),
    t = 0,
    last = null,
    drawn = "";
  // one frame: where the show has got to, drawn only if he is anywhere new; at its end, the
  // next trip is found while he holds his last pose (the page's frames go on meanwhile)
  function frame(time) {
    const dt = last == null ? 0 : Math.min(0.05, (time - last) / 1000);
    last = time;
    t += dt;
    if (t >= total) {
      // (no frames run while the next is found: what he said is over)
      says.classList.remove("on");
      saying = 0;
      M.pose(show[show.length - 1].at(show[show.length - 1].dur));
      w.draw(0);
      // (an action that fails leaves him looking about where he is, rather than frozen)
      next(at)
        .catch((e) => {
          console.warn("Willy stays:", e);
          return { to: at, moments: lookingAbout(at) };
        })
        .then((n) => {
          ({ to: at, moments: show } = n);
          total = show.reduce((k, m) => k + m.dur, 0);
          t = 0;
          cued = -1;
          last = null;
          requestAnimationFrame(frame);
        });
      return;
    }
    const p = M.now(show, t),
      i = which(show, t);
    // a moment's cues, as it starts; one that says where he looks has him look there throughout
    if (i !== cued) {
      cued = i;
      const m = show[i];
      if ("look" in m) {
        w.look(point(m.look, p));
        lookAt = time + m.dur * 1000;
      }
      if (m.say) say(...m.say);
      if (m.blink) w.blink(m.blink);
      if (m.twitch) w.twitch();
      if (m.act) m.act();
    }
    if (time > lookAt) {
      w.look(gaze(p));
      lookAt = time + between(LOOKS) * 1000;
    }
    const key = [p.x, p.y, p.z, p.h, p.clip, p.time].map((v) => (typeof v === "number" ? v.toFixed(2) : v)).join();
    if (key !== drawn) {
      M.pose(p);
      w.draw(0);
      drawn = key;
    }
    if (saying) {
      if (time > saying) {
        says.classList.remove("on");
        saying = 0;
      } else bubble();
    }
    requestAnimationFrame(frame);
  }
  frame(performance.now());
  ready();
}
