// Willy in the room: the home, in a window wide enough for the room. He keeps the room's
// light off until he is ready, at most as long as the dark lasts (about 4 s), and then lives
// on the desk, the cushion under the window and the shelf, doing one of his everyday actions
// after another (willy-life.js), and saying so in a bubble now and then. three.js and his
// model load only from here, so nothing of the room waits on them; without WebGL 2, or if
// anything fails, there is no Willy and the room is as it is. Under reduced motion he sleeps on
// the cushion and does not move.
// (motion.js's answer, or the browser's where it never ran)
const reducedMotion = window.reducedMotion || function () { return matchMedia("(prefers-reduced-motion: reduce)").matches; };
const room = document.querySelector(".room");
const stage = document.querySelector(".stage");

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
  const [{ willy }, { planner }, { moves }, { pick, everyday, reactions, react, bothered }] = await Promise.all([import("./willy.js"), import("./willy-paths.js"), import("./willy-moves.js"), import("./willy-life.js")]);
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

  // The live line: one polite line, a few words a time, for what concerns the reader and no more.
  // Cleared first, so that the same words twice still speak; at most one in a second and a half.
  const voice = document.createElement("div");
  voice.className = "vh willy-live";
  voice.setAttribute("aria-live", "polite");
  document.body.append(voice);
  // (but what he does because the reader pestered him, said even so)
  let spoke = 0;
  const announce = (text, always = false) => {
    if (performance.now() - spoke < 1500 && !always) return;
    spoke = performance.now();
    voice.textContent = "";
    setTimeout(() => (voice.textContent = text), 60);
  };

  // His button: invisible, on him (willy.js, area()), the last Tab stop of the room. Fixed to the
  // window, outside the room's frame, so that where he stands never changes how big the room is.
  // It leaves the Tab order while he is wholly out of the window. The mouse reaches him through
  // his own outline (the button lets the pointer through): a click on him is for him, whatever
  // is under him.
  const touch = document.createElement("button");
  touch.type = "button";
  touch.className = "willy-pet";
  touch.setAttribute("aria-label", "Willy. You can pet him!");
  touch.hidden = true;
  document.body.append(touch);
  let area = null;
  const track = () => {
    area = w.area();
    const out = !(area.right > 0 && area.left < innerWidth && area.bottom > 0 && area.top < innerHeight);
    touch.hidden = out || ![area.left, area.top, area.right, area.bottom].every(Number.isFinite);
    if (!touch.hidden) Object.assign(touch.style, { left: area.left + "px", top: area.top + "px", width: area.right - area.left + "px", height: area.bottom - area.top + "px" });
  };
  const retrack = () => {
    requestAnimationFrame(track);
    setTimeout(track, 250); // (the room frames itself to its window a moment after the resize)
  };
  addEventListener("resize", retrack);
  let petted = () => {};
  addEventListener(
    "click",
    (e) => {
      // (a click with no press behind it, from the keyboard or a screen reader, is on its target)
      if (e.target !== touch && !(e.detail > 0 && area && !touch.hidden && area.hit(e.clientX, e.clientY))) return;
      e.preventDefault();
      e.stopPropagation();
      petted();
    },
    true,
  );

  // his answers to being petted (willy-life.js): where he is, from the pose p he was caught in,
  // and what he does about it; or null. A little fur is left on what he stands on.
  const REACT = reactions({ w, P, M, SURF });
  const tufts = [];
  const fur = (at) => {
    const tuft = document.createElement("i");
    tuft.className = "fur-tuft";
    tuft.setAttribute("aria-hidden", "true");
    const x = at.x + between([-30, 30]),
      y = at.y + between([-30, 30]);
    tuft.style.transform = "translate3d(" + x + "px," + y + "px," + (SURF[at.surface].z + 1) + "px) rotate(" + between([0, 180]) + "deg)";
    room.append(tuft);
    tufts.push(tuft);
    if (tufts.length > 3) tufts.shift().remove();
  };
  let lastReaction = null;
  async function answer(p) {
    const on = ROOM.surfaces.find((s) => Math.abs(s.z - p.z) < 0.5 && SURF[s.name]);
    if (!on) return null;
    const at = { surface: on.name, x: p.x, y: p.y, heading: ((p.h % 360) + 360) % 360 },
      rest = /^(sleep|curl|uncurl)/.test(p.clip) ? "sleep" : /^(lie|wake|loaf|knead-lie|pet-lie|roll-over)/.test(p.clip) ? "lie" : null,
      ctx = { where: at.surface, rest, fur },
      state = { last: lastReaction, skip: new Set() };
    for (let tries = 0; tries < 8; tries++) {
      const a = react(REACT, ctx, state);
      if (!a) break;
      const r = await a.run(at, ctx);
      const got = Array.isArray(r) ? { to: at, moments: r } : r;
      if (got && got.moments.length) {
        lastReaction = a.n;
        announce(a.line);
        return got;
      }
      state.skip.add(a.n);
    }
    return null;
  }

  // asleep on the cushion, along it, and nothing more; petted, he changes pose at once, and the
  // live line says what he did
  if (reducedMotion()) {
    const bed = P.spot("perch", "sleep", Math.random, [0, 180]);
    if (!bed) throw new Error("no room on the cushion");
    let now = M.hold("sleep-idle", bed, "perch").at(0);
    const draw = () => {
      M.pose(now);
      w.draw(0);
      track();
    };
    draw();
    addEventListener("resize", () => {
      w.draw(0);
      retrack();
    });
    let busy = false;
    petted = async () => {
      if (busy) return;
      busy = true;
      try {
        const r = await answer(now);
        if (r) {
          // (the middle of it, where he does what he does, and what it does to the room)
          const total = r.moments.reduce((n, m) => n + m.dur, 0);
          let s = total / 2,
            i = 0;
          while (i < r.moments.length - 1 && s > r.moments[i].dur) s -= r.moments[i++].dur;
          if (r.moments[i].act) r.moments[i].act();
          now = r.moments[i].at(Math.min(s, r.moments[i].dur));
          draw();
        }
      } finally {
        busy = false;
      }
    };
    return;
  }

  // Never in the way. The project objects he walks over (ROOM.lows()): one the reader points at or
  // has focused is never where he goes; on one he sits or lies on, the pointer resting a moment
  // usually moves him off, and focus always does, at once. Clicked again and again he moves away;
  // clicked a lot he has had enough, and leaves off the desk's front edge for half a minute.
  const OBJECTS = ROOM.lows().filter((o) => o.el && (o.el.matches("a[href]") || o.el.querySelector("a[href]")));
  const named = (o) => {
    const k = ["ledger", "agenda", "pager", "cards", "envelope"].find((c) => o.el.classList.contains(c));
    return "the " + o.name + (k ? " " + k : "");
  };
  let pointed = null,
    focused = null;
  const avoid = () => [pointed, focused].filter(Boolean);
  // the object he is on, at p, or null
  const onObject = (p) => (p && p.z === SURF.desk.z ? OBJECTS.find((o) => p.x >= o.x0 && p.x <= o.x1 && p.y >= o.y0 && p.y <= o.y1) || null : null);
  const MOVING = /^(walk|trot|run|sneak|chase|jump|turn|crouch)/;
  const RESTING = (clip) => (/^(sleep|curl|uncurl|wake)/.test(clip) ? "sleep" : /^(lie|loaf|knead-lie|pet-lie|roll-over)/.test(clip) ? "lie" : /^(sit|pet-sit|groom|chatter)/.test(clip) ? "sit" : null);
  const BOTHER = bothered({ w, P, M, SURF, avoid, objects: OBJECTS });
  const PESTER = { within: 5000, away: 3, gone: 5, goneSometimes: 0.25 }; // ms, clicks
  const REST_PTR = 1500, // ms the pointer rests before he may move
    MOVES_OFF = 0.7; // how often he does
  let clicks = [],
    fleeing = false, // moving away from the reader, until that show ends
    settledOn = null; // the object he last sat or lay down on, while he is still on it

  // looking about where he is a while
  const lookingAbout = (at) => [M.hold("idle", [at.x, at.y, at.heading], at.surface, between(LOOK_ABOUT) - M.dur("idle"), true)];
  // what he does next, from at, and where he ends up: one of his everyday actions he can do
  // there and now; or, if none can be, he looks about where he is
  const ACTIONS = everyday({ w, P, M, SURF, avoid }),
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
    drawn = "",
    pending = false,
    blend = null; // the pose a reaction cut into, fading out as it takes over
  // A click on him can come at any moment. His answer starts where he is: from the pose he was
  // caught in, which fades into the answer's first (willy-moves.js, pose()) instead of jumping to
  // it. In the air it waits for the landing. Meanwhile the next trip is not found, nor the frames
  // run: the answer is worked out first, and he carries on if there is none.
  const FADE = 0.3; // s
  petted = () => {
    const now = performance.now();
    clicks = clicks.filter((c) => now - c < PESTER.within).concat(now);
    pending = "pet";
  };
  // what he does about what the reader did, from p: pestered, he moves away or leaves; petted, he
  // answers (answer()); asked off the object he is on, he gets off it
  async function bother(kind, p) {
    if (kind.visit) return here(p) && BOTHER.visit(here(p), RESTING(p.clip), kind.visit, 60);
    if (kind === "off") {
      const o = onObject(p);
      return o && (pointed === o || focused === o) && !MOVING.test(p.clip) ? BOTHER.off(here(p), RESTING(p.clip)) : null;
    }
    // (once he has had enough, nothing stops him)
    if (fleeing === "gone") return null;
    const n = clicks.length,
      at = here(p);
    if (at && (n >= PESTER.gone || (n >= PESTER.away && !fleeing && Math.random() < PESTER.goneSometimes))) {
      const r = await BOTHER.gone(at, RESTING(p.clip));
      if (r) {
        clicks = [];
        ran.leave = performance.now() / 1000; // (and he does not leave again on his own soon)
        announce("Willy has had enough, and leaves for a while.", true);
        return { ...r, fleeing: "gone" };
      }
    }
    // (moving away already, he carries on)
    if (fleeing && n < PESTER.gone) return null;
    if (at && n >= PESTER.away) {
      const r = await BOTHER.away(at, RESTING(p.clip));
      if (r) {
        announce("Willy moves away from you.", true);
        return { ...r, fleeing: true };
      }
    }
    return answer(p);
  }
  // where p is, as an action starts from it; or null, off every surface (on the floor)
  const here = (p) => {
    const s = ROOM.surfaces.find((s) => Math.abs(s.z - p.z) < 0.5);
    return s ? { surface: s.name, x: p.x, y: p.y, heading: ((p.h % 360) + 360) % 360 } : null;
  };
  // The object the pointer rests on, or that has focus: if he sits or lies on it, focus moves
  // him off at once, and the pointer, still a moment, mostly does; if he stays, he stays until
  // the pointer has left it and come back.
  let resting = 0,
    tried = false;
  const ask = () => {
    if (!pending) pending = "off";
  };
  // (the pointer still a moment on the object, with him down on it)
  const still = () => {
    clearTimeout(resting);
    if (tried) return;
    resting = setTimeout(() => {
      const p = M.now(show, Math.min(t, total)),
        o = onObject(p);
      if (!o || o !== pointed || MOVING.test(p.clip)) return;
      tried = true;
      if (Math.random() < MOVES_OFF) ask();
    }, REST_PTR);
  };
  for (const o of OBJECTS) {
    o.el.addEventListener("pointerenter", () => {
      pointed = o;
      tried = false;
    });
    o.el.addEventListener("pointermove", still);
    o.el.addEventListener("pointerleave", () => {
      clearTimeout(resting);
      if (pointed === o) pointed = null;
    });
    o.el.addEventListener("focusin", () => {
      focused = o;
      ask();
    });
    o.el.addEventListener("focusout", () => {
      if (focused === o) focused = null;
    });
  }
  // (for the checks, checks/willy-way.py: where he is, and off to sit on a project object, by
  // name, as he would on his own)
  room.willy = { now: () => M.now(show, Math.min(t, total)), on: () => onObject(M.now(show, Math.min(t, total)))?.name || null, visit: (name) => (pending = { visit: OBJECTS.find((o) => o.name === name) }) };
  async function answering(kind) {
    const p = M.now(show, Math.min(t, total));
    const r = await bother(kind, p).catch((e) => (console.warn("Willy stays:", e), null));
    if (r) {
      says.classList.remove("on");
      saying = 0;
      fleeing = r.fleeing || false;
      ({ to: at, moments: show } = r);
      total = show.reduce((k, m) => k + m.dur, 0);
      t = 0;
      cued = -1;
      blend = { from: p, at: null };
    }
    last = null;
    requestAnimationFrame(frame);
  }
  // one frame: where the show has got to, drawn only if he is anywhere new; at its end, the
  // next trip is found while he holds his last pose (the page's frames go on meanwhile)
  function frame(time) {
    if (pending && t < total && !/^jump/.test(M.now(show, t).clip)) {
      const kind = pending;
      pending = false;
      answering(kind);
      return;
    }
    const dt = last == null ? 0 : Math.min(0.05, (time - last) / 1000);
    last = time;
    t += dt;
    if (t >= total) {
      // (no frames run while the next is found: what he said is over)
      says.classList.remove("on");
      saying = 0;
      M.pose(show[show.length - 1].at(show[show.length - 1].dur));
      w.draw(0);
      track();
      blend = null;
      fleeing = false;
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
      if (m.line) announce(m.line, true);
      // sitting or lying down on a project object, said as he first settles on it
      const on = onObject(p),
        down = /^(sit|lie|sleep)$/.test(p.clip) && on;
      if (down && down !== settledOn) announce("Willy " + (p.clip === "sit" ? "sits" : "lies down") + " on " + named(down) + ".");
      if (down || !on) settledOn = down || null;
      // and moved off it, at once if it has focus, or soon if the pointer rests on it
      if (down && focused === down) ask();
      else if (down && pointed === down) still();
    }
    if (time > lookAt) {
      w.look(gaze(p));
      lookAt = time + between(LOOKS) * 1000;
    }
    if (blend) blend.at ??= time;
    const k = blend ? Math.min(1, (time - blend.at) / 1000 / FADE) : 1;
    const key = [p.x, p.y, p.z, p.h, p.clip, p.time, k].map((v) => (typeof v === "number" ? v.toFixed(2) : v)).join();
    if (key !== drawn) {
      M.pose(p, blend && blend.from, k);
      w.draw(0);
      track();
      drawn = key;
    }
    if (k === 1) blend = null;
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
