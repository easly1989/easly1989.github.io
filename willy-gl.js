// Willy in the scene (issue #160, ticket 09): the cat of willy-room.js, but drawn into the same three.js scene as the room itself (room-gl.js), so that what
// stands in front of him hides him, he covers what is behind him, and his shadow is cast by the scene's light. He walks the surfaces of the scene and keeps
// out of its solids (gl/room-api.js is `ROOM`, made from the scene), does one of his everyday actions after another (willy-life.js), is petted through
// the invisible button on him, and under reduced motion sleeps on the cushion. What of his world is not in the scene yet is left out, and his actions that
// need it do not come up: the toys, what he knocks off the desk and the plant (ticket 13), the old computer's keyboard and mouse, and the objects that are
// links, which he must not be in the way of (tickets 11 and 14). Without WebGL 2, or if anything fails, there is no Willy and the room is as it is.
// (motion.js's answer, or the browser's where it never ran)
const reducedMotion = window.reducedMotion || function () { return matchMedia("(prefers-reduced-motion: reduce)").matches; };
const GL = window.ROOMGL;
const ROOM = window.ROOM;

// his button, his live line and his bubble: the CSS room's page has their styles (room.css, styles.css), the scene's does not
{
  const css = document.createElement("style");
  css.textContent = `
.willy-pet { position: fixed; z-index: 60; margin: 0; padding: 0; border: 0; background: none; pointer-events: none; border-radius: 24px; }
.willy-pet[hidden] { display: none; }
.willy-pet:focus-visible { outline: 3px solid #ffd84a; outline-offset: 0; box-shadow: 0 0 0 3px #1b1b1b; }
.willy-live { position: fixed; top: 0; left: 0; }
.vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.cat-says { position: fixed; z-index: 40; background: #fbfbf6; color: #1d211f; font: 700 0.95rem "Bricolage Grotesque", sans-serif; padding: 0.3rem 0.7rem; border-radius: 999px; pointer-events: none; opacity: 0; transform: scale(0.8); transition: opacity 0.2s ease, transform 0.2s ease; }
.cat-says.on { opacity: 1; transform: scale(1); }
@media (prefers-color-scheme: dark) { .cat-says { background: #e9e8e0; } }
@media (prefers-reduced-motion: reduce) { .cat-says { transition: none; } }`;
  document.head.append(css);
}

let ready;
ROOM.holdLight(new Promise((r) => (ready = r)));
live()
  .catch((e) => {
    console.warn("No Willy:", e);
    GL.willy = null;
  })
  .finally(() => ready());

// how long he looks about where he is when there is nothing else he can do, s
const LOOK_ABOUT = [3, 7];

async function live() {
  const [{ willy }, { planner }, { moves }, { pick, everyday, reactions, react, bothered }] = await Promise.all([import("./willy.js"), import("./willy-paths.js"), import("./willy-moves.js"), import("./willy-life.js")]);
  const w = await willy(null, null, "assets/willy.glb", GL.host);
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
  // window. It leaves the Tab order while he is wholly out of the window. The mouse reaches him through
  // his own outline (the button lets the pointer through): a click on him is for him, whatever
  // is under him.
  const touch = document.createElement("button");
  touch.type = "button";
  touch.className = "willy-pet";
  touch.setAttribute("aria-label", "Willy. You can pet him!");
  touch.hidden = true;
  document.body.append(touch);
  touch.addEventListener("focus", () => track());
  let area = null;
  // (with his focus ring on him, round only what of him shows: half behind the computer, the
  // half that does)
  const track = () => {
    area = w.area(document.activeElement === touch);
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
      // (on what of him shows: a click on the computer is the computer's, he behind it or not)
      if (e.target !== touch && !(e.detail > 0 && area && !touch.hidden && area.hit(e.clientX, e.clientY) && w.area(true).hit(e.clientX, e.clientY))) return;
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
  const fur = (at, shed = false, bare = () => true) => {
    const spread = shed ? 55 : 30;
    let x, y;
    for (let n = 0; n < 10; n++) {
      [x, y] = [at.x + between([-spread, spread]), at.y + between([-spread, spread])];
      if (bare(x, y)) break;
      if (n === 9) return;
    }
    // (a tuft: a flat patch of white with a dark fleck, lying on what he stands on, a little larger where he has lain)
    const t = new GL.THREE.Group();
    const patch = (r, c, dx) => {
      const m = new GL.THREE.Mesh(new GL.THREE.SphereGeometry(r, 10, 6), new GL.THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
      m.scale.z = 0.12;
      m.position.x = dx;
      m.receiveShadow = true;
      t.add(m);
    };
    patch(7, "#f2efe8", 0);
    patch(4, "#2a2a2a", 5);
    GL.host.toScene(x, y, SURF[at.surface].z + 0.6, t.position);
    t.rotation.z = between([0, Math.PI * 2]);
    t.scale.setScalar(shed ? 1.8 : 1);
    GL.scene.add(t);
    tufts.push(t);
    if (tufts.length > 6) GL.scene.remove(tufts.shift());
    GL.host.invalidate();
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
    GL.willy = { now: () => now, on: () => null, visit: () => {}, act: () => {}, tip: () => w.area().tip, w, M, P, SURF };
    return;
  }

  // Never in the way. The project objects he walks over: one the reader points at or has focused is never where he goes
  // (the objects that are links: ticket 11); so none yet.
  const OBJECTS = [];
  const MOVING = /^(walk|trot|run|sneak|chase|jump|turn|crouch)/;
  const RESTING = (clip) => (/^(sleep|curl|uncurl|wake)/.test(clip) ? "sleep" : /^(lie|loaf|knead-lie|pet-lie|roll-over)/.test(clip) ? "lie" : /^(sit|pet-sit|groom|chatter)/.test(clip) ? "sit" : null);
  let pointed = null,
    focused = null;
  const avoid = () => [pointed, focused].filter(Boolean);
  const onObject = (p) => (p && OBJECTS.find((o) => p.z === SURF[o.surface || "desk"].z && p.x >= o.x0 && p.x <= o.x1 && p.y >= o.y0 && p.y <= o.y1)) || null;
  const BOTHER = bothered({ w, P, M, SURF, avoid, objects: OBJECTS });
  const PESTER = { within: 5000, away: 3, gone: 5, goneSometimes: 0.25 }; // ms, clicks
  let clicks = [],
    fleeing = false, // moving away from the reader, until that show ends
    settledOn = null; // the object he last sat or lay down on, while he is still on it

  // (the old computer's keyboard and mouse, the toys and what falls: no desk and no computer for his actions to use yet)
  const ACTIONS = everyday({ w, P, M, SURF, avoid, pc: null, desk: null }),
    ran = {};
  let boxInside; // (where his box stands is fixed: found once)
  const inBox = ({ x, y }) => {
    const I = (boxInside ??= ROOM.props().nest?.inside || null);
    return !!I && x > I.x0 && x < I.x1 && y > I.y0 && y < I.y1;
  };

  let done = null,
    again = null; // an action that goes on
  async function next(at) {
    // (shut in his box, which the planner has no way out of, by a show cut short in it: out of it first)
    if (inBox(at)) {
      const r = await ACTIONS.find((a) => a.n === "leave his box").run(at);
      if (r && r.moments.length) return r;
    }
    const on = again && ACTIONS.find((a) => a.n === again);
    again = null;
    if (on && on.where.includes(at.surface)) {
      const r = await on.run(at);
      if (r && r.moments.length) {
        ran[on.n] = performance.now() / 1000;
        done = on.n;
        again = r.again || null;
        return r;
      }
    }
    const skip = new Set();
    for (let tries = 0; tries < 8; tries++) {
      const a = pick(ACTIONS, { where: at.surface, now: performance.now() / 1000, ran, last: done, skip });
      if (!a) break;
      const r = await a.run(at);
      if (r && r.moments.length) {
        ran[a.n] = performance.now() / 1000;
        done = a.n;
        again = r.again || null;
        return r;
      }
      skip.add(a.n);
    }
    return { to: at, moments: lookingAbout(at) };
  }
  // looking about where he is a while
  const lookingAbout = (at) => [M.hold("idle", [at.x, at.y, at.heading], at.surface, between(LOOK_ABOUT) - M.dur("idle"), true)];

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
  // (his voice, through the computer's speaker: muted with the rest of the room's effects)
  // (a sound that fails, or a script of another day that has none, is not his show stopping)
  const effect = (play) => {
    try {
      if (window.CRT) play(window.CRT);
    } catch (e) {}
  };
  const mewing = (text, ms) =>
    effect((crt) => {
      if (/^prr+$/.test(text)) crt.purr(ms / 1000);
      else if (/^(mew|meow|mrrp)/.test(text)) crt.mew();
    });
  const say = (text, ms) => {
    mewing(text, ms);
    says.textContent = text;
    bubble();
    says.classList.add("on");
    saying = performance.now() + ms;
  };

  // where he starts: somewhere free on the desk, looking about
  let at = null;
  for (let n = 0; n < 50 && !at; n++) {
    const p = P.spot("desk", "idle");
    if (p && free(xyh("desk", p)) && !inBox({ x: p[0], y: p[1] })) at = xyh("desk", p);
  }
  if (!at) throw new Error("no room on the desk");
  P.forget();
  // what he looks at as he rests, now and then something else: one of the room's sources that is
  // on (the window), the reader, out of the screen, or nothing
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
    if (typeof look === "function") return look(p); // (where something that moves is now)
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
    blend = null, // the pose a reaction cut into, fading out as it takes over
    held = false; // (for the checks: nothing runs while he is held where they put him)
  // A click on him can come at any moment. His answer starts where he is: from the pose he was
  // caught in, which fades into the answer's first (willy-moves.js, pose()) instead of jumping to
  // it. In the air it waits for the landing. Meanwhile the next trip is not found, nor the frames
  // run: the answer is worked out first, and he carries on if there is none.
  const FADE = 0.3; // s
  petted = () => {
    clicks = clicks.filter((c) => performance.now() - c < PESTER.within).concat(performance.now());
    pending = "pet";
  };
  // what he does about what the reader did, from p: pestered, he moves away or leaves; petted, he
  // answers (answer()); asked off the object he is on, he gets off it
  async function bother(kind, p) {
    if (kind.visit) return here(p) && BOTHER.visit(here(p), RESTING(p.clip), kind.visit, 60);
    if (kind.act) {
      const a = ACTIONS.find((a) => a.n === kind.act),
        at = here(p);
      const r = a && at && a.where.includes(at.surface) && (await a.run(at, kind));
      if (r) (ran[a.n] = performance.now() / 1000), (done = a.n), (again = r.again || null);
      return r && r.moments.length ? r : null;
    }
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
  // (for the checks: where he is, off to sit on a project object, by name, one of his everyday actions, by name, now, as he would on his own, where the
  // tip of his tail is on the screen, and him held where they put him)
  GL.willy = {
    now: () => M.now(show, Math.min(t, total)),
    on: () => onObject(M.now(show, Math.min(t, total)))?.name || null,
    visit: (name) => (pending = { visit: OBJECTS.find((o) => o.name === name) }),
    act: (name) => (pending = { act: name }),
    tip: () => w.area().tip,
    w,
    M,
    P,
    SURF,
    // held where they put him, standing, and drawn: for judging what hides him and what shadow he casts
    hold(x, y, surface = "desk", heading = 270, clip = "idle") {
      held = true;
      const s = SURF[surface];
      M.pose({ x, y, z: s.z, h: heading, clip, time: 0 });
      w.draw(0);
      track();
    },
    release() {
      held = false;
      last = null;
      requestAnimationFrame(frame);
    },
  };
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
    if (held) return;
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
      w.tail(m.tail || null);
      if (m.act) m.act();
      if (m.line) announce(m.line, true);
    }
    // (his eyes follow what moves: a look that is a function of where he is)
    if (typeof show[i].look === "function") w.look(show[i].look(p));
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
