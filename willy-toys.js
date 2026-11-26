// Willy's toys (#70-C): two to four on the desk each visit, picked at random from the yarn, the
// crinkle ball, the catnip mouse and the treat bag, and now and then the paper bag (all five with
// ?toys, for looking at them). Each stands on the desk where it goes into nothing (ROOM.place) and is
// a button: pressed, by a click or Enter, it shows an effect on it for a moment (the yarn unrolls, the
// ball crinkles, the mouse spins, the bag tips and spills treats, the paper bag rustles), which is
// said on the live line, and tells Willy ("toytouch"), who may care. Under reduced motion the effect
// is still shown, still. Each is drawn as one picture turned to face the reader, with its own
// footprint, which he walks round (toyspot, in the room's solids). Loaded with Willy, who is the one
// who plays with them (willy-room.js, willy-life.js); until then there are none.
//
// Soft 3D, as Carlo chose from the mockup on #70: a gradient to each, lit from the upper left, with a
// soft shadow under it.

const SC = 1.3; // how big they are drawn: a drawing of 120 by 100 is this many room px to the unit
const W = 120 * SC * 0.9,
  H = 100 * SC * 0.9;
const KINDS0 = {
  yarn: { name: "yarn", foot: [50, 50], tall: 46, line: "The yarn unrolls a little." },
  ball: { name: "crinkle ball", foot: [50, 50], tall: 40, line: "The crinkle ball crinkles." },
  mouse: { name: "catnip mouse", foot: [76, 44], tall: 34, line: "The catnip mouse spins round." },
  bag: { name: "treat bag", foot: [50, 40], tall: 56, line: "The treat bag tips over and spills some treats." },
  paper: { name: "paper bag", foot: [76, 50], tall: 44, line: "The paper bag rustles." },
};
// (footprints and heights are for a drawing at unit size)
const KINDS = Object.fromEntries(Object.entries(KINDS0).map(([k, v]) => [k, { ...v, foot: v.foot.map((n) => Math.round(n * SC)), tall: Math.round(v.tall * SC) }]));
const MAX_TREATS = 3;
const LONG = 2600; // ms an effect lasts

let uid = 0;
// a radial gradient from the lit side, and the soft shadow under a toy: parts of its drawing
const grad = (c1, c2) => {
  const id = "tg" + uid++;
  return { id, def: `<radialGradient id="${id}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`, f: `url(#${id})` };
};
const shadow = (cx, cy, rx, ry) => {
  const id = "ts" + uid++;
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter><ellipse cx="${cx}" cy="${cy + 2}" rx="${rx}" ry="${ry}" fill="#06201a" opacity=".6" filter="url(#${id})"/>`;
};

// each toy's drawing, at rest and as it is after a touch (fx)
const DRAW = {
  yarn(fx) {
    const g = grad("#e2574a", "#8f2a22"),
      r = fx ? 20 : 26,
      cx = fx ? 40 : 56;
    let b = shadow(58, 80, fx ? 44 : 30, 9);
    if (fx) b += `<path class="strand" pathLength="1" d="M${cx + 16} 66 C 56 92, 70 58, 84 82 S 104 70, 112 84" fill="none" stroke="#e2574a" stroke-width="3" stroke-linecap="round"/>`;
    b += `<circle cx="${cx}" cy="58" r="${r}" fill="${g.f}"/>`;
    b += `<g fill="none" stroke="#8f2a22" stroke-width="2" opacity=".85"><path d="M${cx - r + 4} 52 Q ${cx} 40 ${cx + r - 4} 58"/><path d="M${cx - r + 6} 64 Q ${cx} 52 ${cx + r - 2} 70"/><path d="M${cx - 6} ${58 - r + 2} Q ${cx + 10} 58 ${cx - 2} ${58 + r - 2}"/></g>`;
    if (!fx) b += `<path d="M${cx + 20} 70 C 84 78, 82 90, 98 88" fill="none" stroke="#e2574a" stroke-width="3" stroke-linecap="round"/>`;
    return [b, g.def];
  },
  ball(fx) {
    const g = grad("#eef2f6", "#7d8794");
    let b = shadow(58, 80, 28, 8);
    b += `<polygon points="${fx ? "26,62 36,46 54,40 62,32 76,44 92,48 94,66 80,78 56,80 36,76" : "34,60 40,44 56,34 74,40 84,56 78,74 58,80 40,74"}" fill="${g.f}"/>`;
    b += fx
      ? `<g fill="none" stroke="#7d8794" stroke-width="2"><path d="M36 46 L50 62 L40 76"/><path d="M62 32 L58 56 L80 78"/><path d="M92 48 L70 60 L94 66"/><path d="M54 40 L50 62"/></g><g stroke="#f4f1ea" stroke-width="2" stroke-linecap="round"><path d="M16 36 l8 6"/><path d="M104 34 l-8 6"/><path d="M58 18 v8"/></g>`
      : `<g fill="none" stroke="#7d8794" stroke-width="2"><path d="M40 44 L58 62 L40 74"/><path d="M56 34 L58 62 L84 56"/><path d="M58 62 L58 80"/></g><path d="M48 46 L58 40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    return [b, g.def];
  },
  mouse(fx) {
    const g = grad("#b9b2cc", "#6e6785");
    let b = shadow(58, 80, 36, 8);
    b += `<g transform="rotate(${fx ? 140 : 0} 58 62)"><path d="M30 66 C 14 70, 12 88, 4 90" fill="none" stroke="#6e6785" stroke-width="3" stroke-linecap="round"/>`;
    b += `<ellipse cx="62" cy="62" rx="34" ry="19" fill="${g.f}"/><circle cx="84" cy="48" r="8" fill="#f0b3ab"/><circle cx="70" cy="45" r="8" fill="#f0b3ab"/>`;
    b += `<circle cx="90" cy="62" r="3.2" fill="#1b1b1b"/><circle cx="94" cy="66" r="3" fill="#e0707d"/><path d="M44 56 q8 -6 16 0" fill="none" stroke="#6e6785" stroke-width="2"/></g>`;
    if (fx) b += `<g fill="none" stroke="#f4f1ea" stroke-width="2" stroke-linecap="round"><path d="M14 40 A 46 46 0 0 1 58 14"/><path d="M104 84 A 46 46 0 0 1 64 98"/></g>`;
    return [b, g.def];
  },
  bag(fx) {
    const g = grad("#e8c15a", "#a97c1f");
    let b = shadow(58, 82, fx ? 42 : 26, 8);
    b += `<g transform="rotate(${fx ? -22 : 0} 50 78) translate(${fx ? -10 : 0} 0)"><path d="M28 78 L34 34 Q50 28 66 34 L72 78 Z" fill="${g.f}"/>`;
    b += `<path d="M34 34 Q50 40 66 34" fill="none" stroke="#a97c1f" stroke-width="3"/><path d="M40 28 L60 28 L58 36 L42 36 Z" fill="#a97c1f"/>`;
    b += `<g transform="translate(50 58)"><path d="M-12 0 Q0 -9 12 0 Q0 9 -12 0 Z M12 0 L19 -5 L19 5 Z" fill="#fff" opacity=".92"/><circle cx="-6" cy="-1" r="1.4" fill="#1b1b1b"/></g></g>`;
    return [b, g.def];
  },
  paper(fx) {
    const g = grad("#d2a572", "#8a5f33");
    let b = shadow(58, 82, 38, 8);
    b += `<g transform="translate(58 62) scale(${fx ? 1.12 : 1} ${fx ? 0.88 : 1}) translate(-58 -62)"><path d="M22 52 L82 40 L96 82 L34 90 Z" fill="${g.f}"/>`;
    b += `<path d="M82 40 L96 82 L106 70 L94 30 Z" fill="#8a5f33"/><ellipse cx="94" cy="56" rx="7" ry="22" transform="rotate(-8 94 56)" fill="#3b2a18" opacity=".85"/>`;
    b += `<path d="M30 62 L64 56 M34 76 L70 70" stroke="#8a5f33" stroke-width="2" fill="none"/></g>`;
    if (fx) b += `<g stroke="#f4f1ea" stroke-width="2" stroke-linecap="round" fill="none"><path d="M12 40 q-6 6 0 12"/><path d="M6 36 q-9 10 0 20"/><path d="M108 30 q6 6 0 12"/><path d="M114 26 q9 10 0 20"/></g>`;
    return [b, g.def];
  },
};
const art = (kind, fx) => {
  const [body, defs] = DRAW[kind](fx);
  return `<svg viewBox="0 0 120 100" aria-hidden="true" focusable="false"><defs>${defs || ""}</defs>${body}</svg>`;
};
// a treat, lying on the desk: a little fish
const TREAT = '<svg viewBox="0 0 26 14" aria-hidden="true"><path d="M1 7 Q10 -1 18 7 Q10 15 1 7 Z M18 7 L25 2 L25 12 Z" fill="#e09a55"/><path d="M4 7 Q10 4 15 7" fill="none" stroke="#a96a30" stroke-width="1"/><circle cx="5" cy="6" r="1" fill="#3b2a18"/></svg>';

export function toys({ room, stage, ROOM, announce }) {
  const spots = [],
    treats = [];
  // where he can stand beside a thing at x, y, half px across, facing it, in the clips need names, from as far
  // as reach px (willy-life.js, canStand: up to three places), and whether he can walk to one from where he
  // starts (willy-room.js): a toy is put only where he can come to it, and so is a treat
  let canStand = () => [],
    walkTo = async () => false;
  let start = null,
    moved = () => {};
  // whether a toy's picture lies inside the box the room is framed to (everything usable in it but the toys):
  // the room is scaled to that box for any size of window, so a toy inside it is inside the frame at every size
  const inFrame = (el) => {
    const u = ROOM.usableBox(),
      r = el.querySelector(".toy").getBoundingClientRect();
    return r.left > u.left + 8 && r.right < u.right - 8 && r.top > u.top + 8 && r.bottom < u.bottom - 8;
  };
  // whether he can come to a thing at x, y, half px across
  const comes = async (x, y, half, need, far) => {
    try {
      for (const st of canStand(x, y, half, need, far).slice(0, 2)) if (await walkTo(st.to)) return true;
    } catch (e) {
      console.warn("[toys] no walk to look for", e);
    }
    return false;
  };
  // put down: where it is inside the frame, not on top of him, and he can come to it (a few tries)
  let until = Infinity; // (performance.now() when settle gives up looking: Willy waits for it)
  const put = async (el, need = [], far = 180) => {
    for (let tries = 0; tries < 12 && performance.now() < until; tries++) {
      ROOM.place(el);
      moved(); // (what he fits among has changed)
      const { offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h } = el;
      if (inFrame(el) && !(start && Math.hypot(x + w / 2 - start.x, y + h / 2 - start.y) < 150) && (await comes(x + w / 2, y + h / 2, Math.max(w, h) / 2, need, far))) return;
    }
    // (nowhere he can come to: at least where it is seen)
    for (let tries = 0; tries < 30 && !inFrame(el); tries++) ROOM.place(el);
    moved();
  };
  const pool = Object.keys(KINDS).filter((k) => k !== "paper");
  // (?toys for all five, ?toys=yarn,bag for those, to look at them)
  const ask = decodeURIComponent(location.search).match(/[?&]toys(?:=([a-z,]*))?(?:&|$)/);
  if (!ask && Math.random() < 0.2) pool.push("paper");
  const named = ask && ask[1] ? [...new Set(ask[1].split(",").filter((k) => KINDS[k]))] : null;
  const mine = ask ? named || Object.keys(KINDS) : pool.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
  for (const kind of mine) {
    const k = KINDS[kind],
      el = document.createElement("span");
    el.className = "toyspot";
    el.dataset.kind = kind;
    el.style.width = k.foot[0] + "px";
    el.style.height = k.foot[1] + "px";
    // (its body, for the room's solids: a floor and a top at the toy's height, with nothing drawn on them)
    el.innerHTML = `<i class="toyfoot"></i><i class="toytop" style="--th:${k.tall}px"></i>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toy toy-" + kind;
    btn.setAttribute("aria-label", "Play with the " + k.name);
    btn.style.cssText = `width:${W}px;height:${H}px;margin:${-H / 2}px 0 0 ${-W / 2}px;--lift:${Math.round(H * 0.4)}px`;
    btn.innerHTML = art(kind, false);
    el.append(btn);
    room.append(el);
    ROOM.place(el);
    const s = { el, kind, btn, busy: false };
    btn.addEventListener("click", () => touch(s, "reader"));
    spots.push(s);
  }

  // the toy shows its effect for a moment; the treat bag leaves treats; Willy is told
  function touch(s, by) {
    if (s.busy) return false;
    s.busy = true;
    s.btn.innerHTML = art(s.kind, true);
    s.btn.classList.add("go");
    if (s.kind === "bag") spill(s);
    if (by === "reader") announce(KINDS[s.kind].line, true);
    stage.dispatchEvent(new CustomEvent("toytouch", { detail: { spot: s.el, by } }));
    setTimeout(() => {
      s.btn.innerHTML = art(s.kind, false);
      s.btn.classList.remove("go");
      s.busy = false;
    }, LONG);
    return true;
  }
  // up to three treats on the desk round the bag, for Willy to eat: each where he can come to it (found
  // a moment after, as the walk to each is looked for)
  async function spill(s) {
    if (s.spilling) return;
    s.spilling = true;
    try {
      const cx = s.el.offsetLeft + s.el.offsetWidth / 2,
        cy = s.el.offsetTop + s.el.offsetHeight / 2,
        d = ROOM.desk;
      // (each where he can come to it; if there is nowhere, some where he cannot, for the look of it)
      for (const reachable of [true, false])
        for (let tries = 0; treats.length < MAX_TREATS && tries < 25 && (reachable || !treats.length); tries++) {
          const a = Math.random() * 2 * Math.PI,
            r = 55 + Math.random() * 60,
            x = Math.min(d.x + d.w - 40, Math.max(d.x + 40, cx + Math.cos(a) * r)),
            y = Math.min(d.y + d.d - 40, Math.max(d.y + 40, cy + Math.sin(a) * r)),
            box = { x0: x - 12, x1: x + 12, y0: y - 7, y1: y + 7, z0: 0, z1: 6 };
          box.parts = [{ ...box, q: [[box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1]] }];
          // (on bare desk: not under the computer, a book or another toy)
          if (!ROOM.clear(box) || ROOM.ground(x, y, 0) > 1 || (reachable && !(await comes(x, y, 12, ["eat"], 240))) || treats.length >= MAX_TREATS) continue;
          const t = document.createElement("i");
          t.className = "treat";
          t.setAttribute("aria-hidden", "true");
          t.style.transform = `translate3d(${Math.round(x - 13)}px,${Math.round(y - 7)}px,1px) rotate(${Math.round(Math.random() * 360)}deg)`;
          t.innerHTML = TREAT;
          t.dataset.x = Math.round(x);
          t.dataset.y = Math.round(y);
          room.append(t);
          treats.push(t);
        }
    } finally {
      s.spilling = false;
    }
  }

  return {
    // once he can say (canStand), each toy is put where he can come to it (the yarn, where he can roll over by it too)
    // (for at most three seconds in all: after that, wherever each is seen)
    settle: async (can, go, from, changed) => {
      [canStand, walkTo, start, moved] = [can, go, from, changed];
      until = performance.now() + 3000;
      for (const s of spots) await put(s.el);
    },
    // each toy: its kind, name, element, and where it lies (its middle and its sides), room px
    list: () =>
      spots.map((s) => {
        const { offsetLeft: x0, offsetTop: y0, offsetWidth: w, offsetHeight: h } = s.el;
        return { kind: s.kind, name: KINDS[s.kind].name, el: s.el, x0, y0, x1: x0 + w, y1: y0 + h, spot: s };
      }),
    touch: (spot, by = "willy") => touch(spot, by),
    // the treats on the desk, each where it lies (room px); and one eaten
    treats: () => treats.map((t) => ({ el: t, x: +t.dataset.x, y: +t.dataset.y })),
    eat(t) {
      const i = treats.indexOf(t.el || t);
      if (i >= 0) treats.splice(i, 1)[0].remove();
    },
  };
}
