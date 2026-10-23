// Willy in the room: the home with ?room, in a window wide enough for it. He keeps the room's
// light off until he is ready, at most as long as the dark lasts (about 4 s), and then lives
// on the desk, the cushion under the window and the shelf: he goes from place to place, and
// sits, sleeps or looks about where he gets to, then gets up and goes on. three.js and his
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
    room.querySelector("canvas.willy")?.remove();
    console.warn("No Willy:", e);
  })
  .finally(() => ready());

// where he goes, and how likely: off the desk he only goes back to it, as there is no jump
// from the cushion to the shelf
const PLACES = [
  { odds: 0.4, surface: "desk", rest: "sit" },
  { odds: 0.15, surface: "desk", rest: "sleep" },
  { odds: 0.3, surface: "perch", rest: "sleep" },
  { odds: 0.15, surface: "shelf", rest: "look" },
];
// how long he stays, in seconds, at least and at most
const STAY = { sit: [5, 12], sleep: [15, 40], look: [3, 7] };
// the clip that takes the most room in each rest
const CLIP = { sit: "sit", sleep: "sleep", look: "idle" };

async function live() {
  const [{ willy }, { planner }, { moves }] = await Promise.all([import("./willy.js"), import("./willy-paths.js"), import("./willy-moves.js")]);
  await ROOM.ready;
  const w = await willy(room, stage);
  const P = planner({ surfaces: ROOM.surfaces, jumps: ROOM.jumps, fits: w.fits });
  const M = moves(w, P, ROOM.surfaces);
  const SURF = Object.fromEntries(ROOM.surfaces.map((s) => [s.name, s]));
  const xyh = (s, p) => ({ surface: s, x: p[0], y: p[1], heading: p[2] });
  const fits = (to, clip) => w.fits(to.x, to.y, SURF[to.surface].z, to.heading, clip, { on: SURF[to.surface] });
  const between = ([a, b]) => a + Math.random() * (b - a);
  // a place on the desk he can walk off from and turn all the way round in (at each of the
  // planner's 16 headings): one he could only walk into, nose first, is a pocket no route leaves
  const free = (to) => fits(to, "walk") && [...Array(16).keys()].every((i) => fits({ ...to, heading: i * 22.5 }, "turn"));

  // asleep on the cushion, along it, and nothing more
  if (still.matches) {
    const bed = P.spot("perch", "sleep", Math.random, [0, 180]);
    if (!bed) throw new Error("no room on the cushion");
    M.pose(M.hold("sleep-idle", bed, "perch").at(0));
    w.draw(0);
    addEventListener("resize", () => w.draw(0));
    return;
  }

  // a rest where he is: settling, staying a while, getting up again
  function resting(rest, at) {
    const p = [at.x, at.y, at.heading],
      s = at.surface,
      stay = between(STAY[rest]);
    if (rest === "sit") return [M.hold("sit", p, s), M.hold("sit-idle", p, s, stay - M.dur("sit-idle"), true), M.hold("sit-from", p, s)];
    if (rest === "sleep") return [M.hold("sleep", p, s), M.hold("sleep-idle", p, s, stay - M.dur("sleep-idle"), true), M.hold("wake", p, s)];
    return [M.hold("idle", p, s, stay - M.dur("idle"), true)];
  }
  // somewhere else to go from at, and the way there: on the cushion and the shelf he stays
  // where he lands, since neither has room to walk on; or, if nowhere can be reached, he
  // stays and looks about
  async function trip(at) {
    const choices = PLACES.filter((c) => at.surface === "desk" || c.surface === "desk");
    for (let tries = 0; tries < 8; tries++) {
      let r = Math.random() * choices.reduce((n, c) => n + c.odds, 0);
      const c = choices.find((c) => (r -= c.odds) <= 0) || choices[0];
      let to, rest = c.rest;
      if (c.surface === "desk") {
        const p = P.spot("desk", CLIP[rest]);
        if (!p) continue;
        to = xyh("desk", p);
        if (!free(to)) continue;
        if (at.surface === "desk" && Math.hypot(to.x - at.x, to.y - at.y) < 200) continue;
      } else {
        const hop = P.hops("desk", c.surface)[0];
        if (!hop) continue;
        to = xyh(c.surface, [hop.to[0], hop.to[1], hop.h1]);
        if (!fits(to, CLIP[rest])) rest = "look";
      }
      const route = await M.go(at, to);
      if (route) return { to, moments: [...M.legs(route), ...resting(rest, to)] };
    }
    return { to: at, moments: resting("look", at) };
  }

  // where he starts: somewhere free on the desk, looking about
  let at = null;
  for (let n = 0; n < 50 && !at; n++) {
    const p = P.spot("desk", "idle");
    if (p && free(xyh("desk", p))) at = xyh("desk", p);
  }
  if (!at) throw new Error("no room on the desk");
  // what he looks at as he rests, now and then something else: one of the room's sources that is
  // on (the window, the screen, the radio's lamp), the reader, out of the screen, or nothing
  const LOOKS = [2, 6]; // s
  let lookAt = 0;
  const gaze = (p) => {
    const lit = ROOM.lights().filter((s) => s.power && s.name !== "room"),
      r = Math.random();
    if (r < 0.35 || !p) return null;
    if (r < 0.55 || !lit.length) return [p.x - 600, p.y + 600, 500];
    return lit[Math.floor(Math.random() * lit.length)].at;
  };
  let show = resting("look", at),
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
      M.pose(show[show.length - 1].at(show[show.length - 1].dur));
      w.draw(0);
      // (a trip that fails leaves him looking about where he is, rather than frozen)
      trip(at)
        .catch((e) => {
          console.warn("Willy stays:", e);
          return { to: at, moments: resting("look", at) };
        })
        .then((n) => {
          ({ to: at, moments: show } = n);
          total = show.reduce((k, m) => k + m.dur, 0);
          t = 0;
          last = null;
          requestAnimationFrame(frame);
        });
      return;
    }
    const p = M.now(show, t);
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
    requestAnimationFrame(frame);
  }
  frame(performance.now());
  ready();
}
