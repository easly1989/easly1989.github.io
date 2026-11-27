// Willy's toys (#70-C), what they do. room.js draws two to four of them on the desk each visit, in the
// room's own shapes (the yarn, the crinkle ball, the catnip mouse, the treat bag, now and then the
// paper bag), each a .toyspot with a button over it, inert until now. Here, once he is there, each
// button answers: pressed, by a click or Enter, the toy shows an effect for a moment (the yarn rolls
// out on its thread and back, the ball crinkles, the mouse spins, the bag tips and spills treats, the
// paper bag rustles: room.css, the .go class), which is said on the live line, and tells him
// ("toytouch"), who may care. Under reduced motion the effect is shown, still. Each toy is put where he
// can come to it, and the treats where he can come to them. Loaded with Willy, who is the one who
// plays with them (willy-room.js, willy-life.js).
//
// Soft 3D, as Carlo chose from the mockup on #70: shapes lit by the room's light, with shadows.

const KINDS = {
  yarn: { name: "yarn", line: "The yarn rolls out on its thread and back." },
  ball: { name: "crinkle ball", line: "The crinkle ball crinkles." },
  mouse: { name: "catnip mouse", line: "The catnip mouse spins round." },
  bag: { name: "treat bag", line: "The treat bag tips over and spills some treats." },
  paper: { name: "paper bag", line: "The paper bag rustles." },
};
const MAX_TREATS = 3;
const LONG = 2600; // ms an effect lasts
const ROLL = 95; // px the yarn rolls out

// a treat, lying on the desk: a little fish
const TREAT = '<svg viewBox="0 0 26 14" aria-hidden="true"><path d="M1 7 Q10 -1 18 7 Q10 15 1 7 Z M18 7 L25 2 L25 12 Z" fill="#e09a55"/><path d="M4 7 Q10 4 15 7" fill="none" stroke="#a96a30" stroke-width="1"/><circle cx="5" cy="6" r="1" fill="#3b2a18"/></svg>';

export function toys({ room, stage, ROOM, announce }) {
  const spots = [],
    treats = [],
    place = ROOM.placer();
  // where he can stand beside a thing at x, y, half px across, facing it, in the clips need names, from as far
  // as reach px (willy-life.js, canStand: up to three places), and whether he can walk to one from where he
  // starts (willy-room.js): a toy is put only where he can come to it, and so is a treat
  let canStand = () => [],
    walkTo = async () => false,
    start = null,
    moved = () => {};
  // whether a toy lies inside the box the room is framed to (everything usable in it but the toys): the room
  // is scaled to that box for any size of window, so a toy inside it is inside the frame at every size
  const inFrame = (el) => {
    const u = ROOM.usableBox(),
      r = el.querySelector(".toy").getBoundingClientRect();
    return r.left > u.left + 30 && r.right < u.right - 30 && r.top > u.top + 30 && r.bottom < u.bottom - 30;
  };
  // whether he can come to a thing at x, y, half px across
  const comes = async (x, y, half, need, far, walk = true) => {
    try {
      const stands = canStand(x, y, half, need, far);
      if (!walk) return stands.length > 0; // (a place to stand: a toy is put by that alone, so that he starts at once)
      for (const st of stands.slice(0, 2)) if (await walkTo(st.to)) return true;
    } catch (e) {
      console.warn("[toys] no walk to look for", e);
    }
    return false;
  };
  // put down: where it is inside the frame, not on top of him, and he has a place to stand beside it (a few tries)
  let until = Infinity; // (performance.now() when settle gives up looking: Willy waits for it)
  const put = async (el, need = [], far = 180) => {
    for (let tries = 0; tries < 12 && performance.now() < until; tries++) {
      await new Promise((r) => setTimeout(r, 0)); // (the page's own timers run between: the room's light has its time to keep)
      place(el);
      moved(); // (what he fits among has changed)
      const { offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h } = el;
      if (inFrame(el) && !(start && Math.hypot(x + w / 2 - start.x, y + h / 2 - start.y) < 150) && (await comes(x + w / 2, y + h / 2, Math.max(w, h) / 2, need, far, false))) return;
    }
    // (nowhere he can come to: at least where it is seen)
    for (let tries = 0; tries < 30 && !inFrame(el); tries++) place(el);
    moved();
  };

  for (const el of room.querySelectorAll(".toyspot")) {
    const btn = el.querySelector(".toy"),
      s = { el, kind: el.dataset.kind, btn, busy: false };
    btn.inert = false;
    btn.addEventListener("click", () => touch(s, "reader"));
    spots.push(s);
  }

  // the toy shows its effect for a moment (the yarn on a thread of its own); the treat bag leaves treats;
  // Willy is told
  function touch(s, by) {
    if (s.busy) return false;
    s.busy = true;
    if (s.kind === "yarn") unroll(s);
    s.el.classList.add("go");
    if (s.kind === "bag") spill(s);
    if (by === "reader") announce(KINDS[s.kind].line, true);
    stage.dispatchEvent(new CustomEvent("toytouch", { detail: { spot: s.el, by } }));
    // (the light follows it while it moves, room-light.js: MOVERS)
    setTimeout(() => {
      s.el.classList.remove("go");
      s.strand?.remove();
      s.busy = false;
    }, LONG);
    return true;
  }
  // the yarn rolls out along a thread, ROLL px the way it is sent, turning as it goes and growing smaller
  // as it pays the thread out, and back; the thread lies on the desk
  function unroll(s) {
    // (a way that ends on the desk: 12 to choose from, any if none does)
    const d = ROOM.desk,
      cx = s.el.offsetLeft + s.el.offsetWidth / 2,
      cy = s.el.offsetTop + s.el.offsetHeight / 2,
      ways = [...Array(12).keys()].map((i) => (i + Math.random()) * (Math.PI / 6)),
      ok = ways.filter((a) => {
        const x = cx + Math.cos(a) * (ROLL + 26),
          y = cy + Math.sin(a) * (ROLL + 26);
        return x > d.x + 20 && x < d.x + d.w - 20 && y > d.y + 20 && y < d.y + d.d - 20;
      }),
      a = (ok.length ? ok : ways)[Math.floor(Math.random() * (ok.length || ways.length))],
      [dx, dy] = [Math.cos(a) * ROLL, Math.sin(a) * ROLL],
      wave = [-dy, dx].map((v) => (v / ROLL) * 14);
    // (custom properties: set one by one, not assigned)
    for (const [k, v] of Object.entries({ "--rx": dx.toFixed(1) + "px", "--ry": dy.toFixed(1) + "px", "--ax": (-dy / ROLL).toFixed(3), "--ay": (dx / ROLL).toFixed(3), "--rot": ((ROLL / 26) * 180) / Math.PI + "deg" })) s.el.style.setProperty(k, v);
    const t = document.createElement("i");
    t.className = "strand";
    t.setAttribute("aria-hidden", "true");
    t.style.left = s.el.offsetLeft + s.el.offsetWidth / 2 + "px";
    t.style.top = s.el.offsetTop + s.el.offsetHeight / 2 + "px";
    t.innerHTML = `<svg viewBox="-80 -80 160 160" aria-hidden="true"><path pathLength="1" d="M0 0 C ${dx * 0.3 + wave[0]} ${dy * 0.3 + wave[1]}, ${dx * 0.6 - wave[0]} ${dy * 0.6 - wave[1]}, ${dx} ${dy}" fill="none" stroke="#e2574a" stroke-width="3" stroke-linecap="round"/></svg>`;
    room.append(t);
    s.strand = t;
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
      // (each where he can come to it; those that find no such place, three in all, where he cannot, for the look of it)
      for (const reachable of [true, false])
        for (let tries = 0; treats.length < MAX_TREATS && tries < 25; tries++) {
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
    // once he can say (canStand), each toy is put where he can come to it (for at most three seconds
    // in all: after that, wherever each is seen)
    settle: async (can, go, from, changed) => {
      [canStand, walkTo, start, moved] = [can, go, from, changed];
      until = performance.now() + 400;
      // (Willy waits for no more than that: a walk that takes longer to look for is left to finish, and no toy is moved again)
      await Promise.race([(async () => {
          // (the yarn where he can roll over by it too)
          for (const s of spots) await (s.kind === "yarn" ? put(s.el, ["lie", "roll-over", "lie-from"], 300) : put(s.el));
        })(), new Promise((r) => setTimeout(r, 400))]);
      until = 0;
      // (the light follows what has moved)
      stage.dispatchEvent(new Event("falling"));
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
