// The review page for Willy's clips: index.html?room&review. A tool for checking clips as
// they are made, not part of the site: it plays any clip in a loop on Willy, in a place in the
// room where he fits in it, found anew on each play. walk goes from one place on the desk to
// another and back, round whatever is in the way; wander goes anywhere, the perch too, by its
// jumps, and sits or sleeps where it gets to. "room" draws the room he takes in the clip.
import { willy } from "./willy.js";
import { planner, AIR } from "./willy-paths.js";
import { moves } from "./willy-moves.js";

const room = document.querySelector(".room");
const stage = document.querySelector(".stage");
const w = await willy(room, stage, new URLSearchParams(location.search).get("willy") || undefined); // &willy= tries another build
const P = planner({ surfaces: ROOM.surfaces, jumps: ROOM.jumps, fits: w.fits });
const SURF = Object.fromEntries(ROOM.surfaces.map((s) => [s.name, s]));

const M = moves(w, P, ROOM.surfaces);
const { dur, hold, jumping, legs, go } = M;

const spot = (s, clip, headings) => P.spot(s, clip, Math.random, headings);
// a clip held somewhere on s where he fits in it, if there is such a place
function placed(clip, s, extra, loop = false, headings = null) {
  const p = spot(s, clip, headings);
  return p && [hold(clip, p, s, extra, loop)];
}
const ALONG = [0, 180]; // the perch is too shallow for any other way
const firstHop = () => P.hops("desk", "perch")[0];
const jumpShow = (f) => () => (firstHop() ? f(jumping(firstHop())) : null);

const SHOW = {
  idle: () => placed("idle", "desk", 0, true),
  walk: async () => {
    for (let n = 0; n < 60; n++) {
      const a = spot("desk", "walk"),
        b = spot("desk", "walk");
      const A = { surface: "desk", x: a[0], y: a[1], heading: a[2] },
        B = { surface: "desk", x: b[0], y: b[1], heading: b[2] };
      const there = await go(A, B),
        back = there && (await go(B, A));
      if (back && Math.hypot(a[0] - b[0], a[1] - b[1]) > 300) return legs([...there, ...back]);
    }
  },
  sit: () => placed("sit", "desk", 1.5),
  // on the perch, along it, or on the desk, whichever he likes this time
  sleep: () => {
    const [a, b] = Math.random() < 0.5 ? ["perch", "desk"] : ["desk", "perch"];
    const at = (s) => placed("sleep", s, 2, false, s === "perch" ? ALONG : null);
    return at(a) || at(b);
  },
  "jump-up": jumpShow((j) => [{ ...j[0], dur: dur("jump-up") + 0.6, at: (t) => j[0].at(Math.min(t, dur("jump-up"))) }]),
  "jump-air": jumpShow((j) => [{ ...j[1], dur: AIR + 0.3, at: (t) => j[1].at(Math.min(t, AIR)) }]),
  "jump-land": jumpShow((j) => [{ ...j[2], dur: dur("jump-land") + 0.8, at: (t) => j[2].at(Math.min(t, dur("jump-land"))) }]),
  jump: jumpShow((j) => [...j, { dur: 1, at: () => j[2].at(dur("jump-land")) }]),
  // from somewhere on the desk up onto the shelf, where he looks at the plant a while
  shelf: async () => {
    const hop = P.hops("desk", "shelf")[0];
    for (let n = 0; hop && n < 30; n++) {
      const p = spot("desk", "sit");
      const r = p && (await go({ surface: "desk", ...xyh(p) }, { surface: "shelf", x: hop.to[0], y: hop.to[1], heading: hop.h1 }));
      if (r) return [...legs(r), hold("idle", [hop.to[0], hop.to[1], hop.h1], "shelf", 2, true)];
    }
    return null;
  },
  // trips from place to place, each ending in a sit on the desk or a sleep on the perch, the
  // last one back where the first began, so the loop closes
  wander: async () => {
    // from somewhere the perch can be reached from, so that he gets around; on the perch he
    // goes where he has room to sleep, or stays where he lands
    const hop = firstHop();
    if (!hop) return null;
    const top = { surface: "perch", x: hop.to[0], y: hop.to[1], heading: hop.h1 };
    let start = null;
    for (let n = 0; n < 30 && !start; n++) {
      const p = spot("desk", "sit");
      const s = p && { surface: "desk", ...xyh(p) };
      if (s && (await go(s, top))) start = s;
    }
    if (!start) return null;
    const out = [];
    let at = start;
    for (let n = 0; n < 5; n++) {
      const last = n === 4;
      for (let tries = 0; tries < 10; tries++) {
        const s = last ? "desk" : at.surface === "desk" && Math.random() < 0.5 ? "perch" : "desk";
        const bed = s === "perch" && spot("perch", "sleep", ALONG);
        const to = last ? start : s === "perch" ? (bed ? { surface: s, ...xyh(bed) } : top) : { surface: s, ...xyh(spot(s, "sit") || [0, 0, 0]) };
        // asleep, if he fits there asleep
        // on the desk he sits, or now and then sleeps; on the perch he sleeps if he has room
        const curl = w.fits(to.x, to.y, SURF[s].z, to.heading, "sleep", { on: SURF[s] });
        const clip = s === "desk" ? (curl && Math.random() < 0.3 ? "sleep" : "sit") : curl ? "sleep" : "idle";
        const r = to && (await go(at, to));
        if (!r) continue;
        out.push(...legs(r), hold(clip, [to.x, to.y, to.heading], s, clip === "sit" ? 1.2 : 2.5, clip === "idle"));
        at = to;
        break;
      }
    }
    return out;
  },
};
function xyh(p) {
  return { x: p[0], y: p[1], heading: p[2] };
}

let show = null;
let t = 0;
let held = false; // by at(), for a screenshot
let asked = 0; // the last show asked for: one that is still finding its way when another is asked is dropped
async function play(name) {
  const ask = ++asked;
  held = false;
  status.textContent = "finding a way for " + name;
  const moments = await SHOW[name]();
  if (ask !== asked) return;
  status.textContent = "";
  if (!moments || !moments.length) return (status.textContent = "no place in the room for " + name);
  show = { name, moments, total: moments.reduce((n, m) => n + m.dur, 0) };
  t = 0;
  for (const b of panel.querySelectorAll("button[data-clip]")) b.setAttribute("aria-pressed", String(b.dataset.clip === name));
  step(0);
}
// where he is and how, t seconds into the show
const now = (t) => M.now(show.moments, t);
function step(dt) {
  t += dt;
  if (!show) return;
  const p = now(t);
  M.pose(p);
  if (outline.on) outline.draw(p);
}

// the room he takes in the clip, drawn on what he stands on: green, or red where it goes into
// something
const outline = {
  on: false,
  el: null,
  draw(p) {
    const b = w.size[p.clip],
      r = (p.h * Math.PI) / 180;
    const f = [Math.cos(r), -Math.sin(r)],
      l = [-Math.sin(r), -Math.cos(r)];
    const q = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([u, v]) => [p.x + f[0] * u + l[0] * v, p.y + f[1] * u + l[1] * v]);
    const x0 = Math.min(...q.map((c) => c[0])),
      y0 = Math.min(...q.map((c) => c[1]));
    if (!this.el) {
      this.el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.el.setAttribute("aria-hidden", "true");
      this.el.style.cssText = "position:absolute;overflow:visible;pointer-events:none";
      this.el.innerHTML = '<polygon fill="none" stroke-width="3" />';
      room.append(this.el);
    }
    this.el.style.left = x0 + "px";
    this.el.style.top = y0 + "px";
    this.el.style.transform = "translateZ(" + (p.z + 1) + "px)";
    const into = w.into(p.x, p.y, p.z, p.h, p.clip, p.time / dur(p.clip));
    const poly = this.el.firstChild;
    poly.setAttribute("points", q.map((c) => c[0] - x0 + "," + (c[1] - y0)).join(" "));
    poly.setAttribute("stroke", into.length ? "#e5484d" : "#3fd27a");
    status.textContent = into.length ? "goes into " + into.join(", ") : "clear";
  },
};

const panel = document.createElement("div");
panel.className = "willy-review";
panel.setAttribute("role", "group");
panel.setAttribute("aria-label", "Willy's clips");
panel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99;display:flex;flex-wrap:wrap;gap:6px;max-width:440px;padding:10px;background:rgba(20,20,20,.85);border-radius:8px;font:13px/1.2 'IBM Plex Mono',monospace;color:#e9f5e6";
const BTN = "padding:6px 9px;border:1px solid #6b7;border-radius:5px;background:#203;color:#e9f5e6;cursor:pointer;font:inherit";
for (const name of Object.keys(SHOW)) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = name;
  b.dataset.clip = name;
  b.style.cssText = BTN;
  b.addEventListener("click", () => play(name));
  panel.append(b);
}
const box = document.createElement("button");
box.type = "button";
box.textContent = "room";
box.setAttribute("aria-pressed", "false");
box.style.cssText = BTN;
box.addEventListener("click", () => {
  outline.on = !outline.on;
  box.setAttribute("aria-pressed", String(outline.on));
  if (outline.el) outline.el.style.display = outline.on ? "" : "none";
  if (!outline.on) status.textContent = "";
  step(0);
});
panel.append(box);
const status = document.createElement("span");
status.setAttribute("aria-live", "polite");
status.style.cssText = "flex-basis:100%;min-height:1.2em";
panel.append(status);
document.body.append(panel);
const style = document.createElement("style");
style.textContent = ".willy-review button[aria-pressed='true']{background:#6b7!important;color:#102!important}.willy-review button:focus-visible{outline:2px solid #fff;outline-offset:2px}";
document.head.append(style);
// ?review=<clip> starts on that clip
const first = new URLSearchParams(location.search).get("review");
play(first in SHOW ? first : "idle");

// for screenshots: __review.at(seconds) holds the show at that moment of it
function at(seconds) {
  held = true;
  t = 0;
  step(seconds);
  w.draw(0);
}

let last = performance.now();
(function frame(time) {
  const dt = held ? 0 : Math.min(0.05, (time - last) / 1000);
  last = time;
  step(dt);
  w.draw(0);
  requestAnimationFrame(frame);
})(last);
window.__review = { play, at, w, P, outline, show: () => ({ total: show.total, now }) };
