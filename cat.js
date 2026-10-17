/* The cat.
 *
 * It ignores the mouse and does what it likes: every few seconds it picks
 * one of the actions below at random, weighted, among the ones the page has
 * the props for. Clicking it (or Enter on it) gets one of its reactions.
 *
 * A page opts in with an element marked data-cat-world, the space the cat
 * lives in; things it can play with carry data-cat="<what it can do>".
 */
(function () {
  "use strict";
  var world = document.querySelector("[data-cat-world]");
  if (!world) return;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = matchMedia("(max-width: 900px)").matches;
  var PAGE = document.body.dataset.page || "home";
  var ABORT = { abort: true };

  function load(k, d) {
    try {
      var v = sessionStorage.getItem("cat:" + k);
      return v ? JSON.parse(v) : d;
    } catch (e) {
      return d;
    }
  }
  function save(k, v) {
    try {
      sessionStorage.setItem("cat:" + k, JSON.stringify(v));
    } catch (e) {}
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function chance(p) {
    return Math.random() < p;
  }
  function pickOne(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // ---- the drawing -------------------------------------------------------
  var TAILS = {
    straight: "M0 44 C 2 64, -6 82, 0 100",
    curl: "M14 44 C 44 50, 44 10, 28 -6",
    wrap: "M18 38 C 40 30, 38 -6, 22 -22",
    front: "M30 30 C 44 -6, 18 -36, -16 -30",
    up: "M0 56 C 4 80, 0 96, 6 112",
    side: "M22 46 C 46 56, 56 80, 48 100",
    low: "M0 40 C -4 66, 6 84, -2 104",
  };
  var cat = document.createElement("button");
  cat.type = "button";
  cat.className = "cat";
  cat.setAttribute("aria-label", "The cat. Press to pet it.");
  cat.style.pointerEvents = "none";
  cat.innerHTML =
    '<svg viewBox="-75 -100 150 200" aria-hidden="true">' +
    '<g class="part tail"><path class="tail-path" d="' + TAILS.straight + '"/><path class="tail-tip" d="' + TAILS.straight + '"/></g>' +
    '<ellipse class="part paw bl fur-w" rx="7" ry="9"/><ellipse class="part paw br fur-w" rx="7" ry="9"/>' +
    '<g class="part body">' +
    '<ellipse class="fur-w" rx="26" ry="40"/>' +
    '<ellipse class="pink belly" rx="15" ry="24" cy="4" opacity="0"/>' +
    '<path class="fur-b spots" d="M-4 -26 C 14 -34, 28 -18, 24 2 C 21 14, 6 12, 2 2 C -3 -8, -14 -16, -4 -26 Z"/>' +
    '<ellipse class="fur-b spots" cx="-13" cy="22" rx="9" ry="7"/>' +
    "</g>" +
    '<ellipse class="part paw fl fur-w" rx="7" ry="9"/><ellipse class="part paw fr fur-w" rx="7" ry="9"/>' +
    '<g class="part head">' +
    '<path class="fur-w" d="M-21 -6 L-17 -31 L-4 -18 Z"/><path class="fur-b" d="M-20 -8 L-17 -31 L-4 -18 Z"/>' +
    '<path class="fur-w" d="M21 -6 L17 -31 L4 -18 Z"/><path class="pink" d="M15 -12 L16 -25 L8 -17 Z"/>' +
    '<circle class="fur-w" r="21"/>' +
    '<path class="fur-b" d="M-20 -6 C -22 -18, -12 -22, -2 -20 C 4 -12, 0 -2, -8 2 C -14 4, -19 0, -20 -6 Z"/>' +
    '<path class="pink" d="M-3 -17 L3 -17 L0 -13 Z"/>' +
    '<path d="M-6 -14 L-26 -18 M-6 -12 L-25 -10 M6 -14 L26 -18 M6 -12 L25 -10" stroke="rgba(0,0,0,.35)" stroke-width="0.8"/>' +
    "</g>" +
    '<ellipse class="hit" rx="34" ry="62" cy="-6" fill="transparent"/>' +
    "</svg>";
  world.appendChild(cat);
  addEventListener("pagehide", function () {
    var w = world.getBoundingClientRect(), s = scale();
    save("at", { x: w.left + pos.x * s, y: w.top + pos.y * s, h: pos.h, pose: current, t: Date.now() });
  });
  var says = document.createElement("span");
  says.className = "cat-says";
  says.setAttribute("aria-hidden", "true");
  world.appendChild(says);
  var live = document.createElement("p");
  live.className = "vh";
  live.setAttribute("aria-live", "polite");
  document.body.appendChild(live);

  var parts = {};
  ["tail", "body", "head"].forEach(function (k) {
    parts[k] = cat.querySelector("." + k);
  });
  ["fl", "fr", "bl", "br"].forEach(function (k) {
    parts[k] = cat.querySelector(".paw." + k);
  });
  var tailPaths = cat.querySelectorAll(".tail path");
  var belly = cat.querySelector(".belly");
  var spots = cat.querySelectorAll(".spots");

  // body [x, y, scaleX, scaleY, rotate], head [x, y, rotate], paws [x, y, scale]
  var POSES = {
    stand: { body: [0, 8, 1, 1, 0], head: [0, -46, 0], fl: [-14, -24, 1], fr: [14, -24, 1], bl: [-15, 40, 1], br: [15, 40, 1], tail: "straight" },
    sit: { body: [0, 20, 1.18, 0.82, 0], head: [0, -22, 0], fl: [-8, 0, 0.9], fr: [8, 0, 0.9], bl: [-26, 30, 1], br: [26, 30, 1], tail: "curl" },
    loaf: { body: [0, 14, 1.12, 0.86, 0], head: [0, -30, 0], fl: [-6, -6, 0], fr: [6, -6, 0], bl: [-20, 30, 0], br: [20, 30, 0], tail: "wrap" },
    sleep: { body: [4, 16, 1.3, 1.02, -20], head: [-22, 2, -80], fl: [0, 0, 0], fr: [0, 0, 0], bl: [0, 20, 0], br: [0, 20, 0], tail: "front", shut: true },
    stretch: { body: [0, 14, 0.92, 1.25, 0], head: [0, -50, 0], fl: [-11, -66, 1], fr: [11, -66, 1], bl: [-15, 52, 1], br: [15, 52, 1], tail: "up" },
    crouch: { body: [0, 14, 1.06, 0.86, 0], head: [0, -34, 0], fl: [-13, -22, 1], fr: [13, -22, 1], bl: [-16, 30, 1], br: [16, 30, 1], tail: "low" },
    groom: { body: [0, 20, 1.18, 0.82, 0], head: [0, -22, 24], fl: [-8, 0, 0.9], fr: [6, -34, 0.9], bl: [-26, 30, 1], br: [26, 30, 1], tail: "curl" },
    belly: { body: [0, 10, 1.22, 1.05, 0], head: [0, -44, 12], fl: [-30, -26, 1], fr: [30, -26, 1], bl: [-28, 40, 1], br: [28, 40, 1], tail: "side", belly: true },
    scratch: { body: [0, 20, 0.9, 1.18, 0], head: [0, -44, 0], fl: [-9, -70, 1], fr: [9, -70, 1], bl: [-14, 48, 1], br: [14, 48, 1], tail: "up" },
    alert: { body: [0, 20, 1.18, 0.82, 0], head: [0, -26, 0], fl: [-8, 0, 0.9], fr: [8, 0, 0.9], bl: [-26, 30, 1], br: [26, 30, 1], tail: "straight" },
  };
  var current = "stand";
  function setPose(name, headTurn) {
    var p = POSES[name] || POSES.stand;
    current = name;
    var b = p.body;
    parts.body.style.transform = "translate(" + b[0] + "px," + b[1] + "px) rotate(" + b[4] + "deg) scale(" + b[2] + "," + b[3] + ")";
    var h = p.head;
    parts.head.style.transform = "translate(" + h[0] + "px," + h[1] + "px) rotate(" + (h[2] + (headTurn || 0)) + "deg)";
    ["fl", "fr", "bl", "br"].forEach(function (k) {
      var v = p[k];
      parts[k].style.transform = "translate(" + v[0] + "px," + v[1] + "px) scale(" + v[2] + ")";
    });
    var d = TAILS[p.tail];
    [].forEach.call(tailPaths, function (path) {
      path.style.d = 'path("' + d + '")';
      if (!path.style.d) path.setAttribute("d", d); // no CSS d support: no tween, same shape
    });
    belly.setAttribute("opacity", p.belly ? "1" : "0");
    [].forEach.call(spots, function (s) {
      s.style.opacity = p.belly ? "0" : "1";
    });
    cat.classList.toggle("eyes-shut", !!p.shut);
  }
  function turnHead(deg) {
    setPose(current, deg);
  }
  function flag(name, on) {
    cat.classList.toggle(name, on);
  }

  // ---- where things are --------------------------------------------------
  var pos = { x: -200, y: 200, h: 90 };
  var size = parseFloat(document.body.dataset.catScale || (narrow ? 0.7 : 1));
  // Where it was on the last page, in window pixels: kept for a moment only.
  var arrived = load("at", null);
  save("at", null);
  if (!arrived || Date.now() - arrived.t > 5000) arrived = null;
  if (arrived) {
    // placed now, before the first frame, so the page transition finds it there
    var w0 = world.getBoundingClientRect(), s0 = scale(), b0 = { w: world.offsetWidth, h: world.offsetHeight };
    pos.x = Math.max(40, Math.min(b0.w - 40, (arrived.x - w0.left) / s0));
    pos.y = Math.max(60, Math.min(b0.h - 40, (arrived.y - w0.top) / s0));
    pos.h = arrived.h;
    setPose(POSES[arrived.pose] ? arrived.pose : "sit");
    apply();
  }
  function apply() {
    cat.style.setProperty("--cx", pos.x + "px");
    cat.style.setProperty("--cy", pos.y + "px");
    cat.style.setProperty("--ca", pos.h + "deg");
    cat.style.setProperty("--cs", size);
  }
  function scale() {
    return world.getBoundingClientRect().width / (world.offsetWidth || 1) || 1;
  }
  function rectOf(el) {
    var w = world.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var s = scale();
    return { x: (r.left - w.left) / s, y: (r.top - w.top) / s, w: r.width / s, h: r.height / s };
  }
  function centre(el) {
    var r = rectOf(el);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: r };
  }
  function bounds() {
    return { w: world.offsetWidth, h: world.offsetHeight };
  }
  // the part of the world on screen right now, so the cat stays where it is seen
  function visible() {
    var w = world.getBoundingClientRect();
    var s = scale();
    var top = Math.max(0, -w.top / s);
    var bottom = Math.min(world.offsetHeight, (innerHeight - w.top) / s);
    return { top: top, bottom: Math.max(top + 200, bottom) };
  }
  function props(kind) {
    return [].filter.call(world.querySelectorAll('[data-cat~="' + kind + '"]'), function (el) {
      if (el.classList.contains("gone") || el.closest("[inert]")) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }
  function busyRects() {
    return [].map.call(world.querySelectorAll("a, button:not(.cat), .paper, .tape, .book, .thing, .letter-sheet, .card-grid > *, .shot, .slip, .ideajar, .syncbar, .tray, .env, .env .flap, [data-cat]:not(.loose), main h2, main .lead, [data-cat-avoid]"), rectOf);
  }
  function freeSpot(opts) {
    opts = opts || {};
    var b = bounds();
    var v = visible();
    var avoid = opts.anywhere ? [] : busyRects();
    // pad: half the size of whatever lands there, so a big toy clears the props too
    var px = opts.pad || 50, py = opts.pad || 60;
    for (var i = 0; i < 40; i++) {
      var x = rand(70, b.w - 70);
      var y = rand(Math.max(80, v.top + 90), Math.min(b.h - 60, v.bottom - 90));
      var hit = avoid.some(function (r) {
        return x > r.x - px && x < r.x + r.w + px && y > r.y - py && y < r.y + r.h + py;
      });
      if (!hit) return { x: x, y: y };
    }
    if (opts.strict) return null;
    return { x: rand(70, b.w - 70), y: rand(v.top + 90, Math.max(v.top + 100, v.bottom - 90)) };
  }

  function gutter() {
    var b = bounds(), v = visible();
    return { x: chance(0.5) ? 46 * size : b.w - 46 * size, y: rand(v.top + 120, Math.max(v.top + 130, v.bottom - 120)) };
  }

  // ---- time and motion ---------------------------------------------------
  var token = 0;
  function alive(t) {
    if (t !== token) throw ABORT;
  }
  // timers that count only while the tab is painting
  function wait(t, ms) {
    return new Promise(function (resolve, reject) {
      var left = ms, last = performance.now();
      (function tick(now) {
        if (t !== token) return reject(ABORT);
        left -= Math.min(100, now - last);
        last = now;
        if (left <= 0) return resolve();
        requestAnimationFrame(tick);
      })(last);
    });
  }
  function norm(a) {
    a = ((a + 180) % 360 + 360) % 360 - 180;
    return a;
  }
  // turn on the spot, eased, rather than snapping round
  function face(t, x, y) {
    var from = pos.h;
    var to = from + norm((Math.atan2(x - pos.x, -(y - pos.y)) * 180) / Math.PI - from);
    var dur = 120 + Math.abs(to - from) * 1.6;
    return new Promise(function (resolve, reject) {
      var st = performance.now();
      (function tick(now) {
        if (t !== token) {
          plant();
          return reject(ABORT);
        }
        var k = Math.min(1, (now - st) / dur);
        var h = from + (to - from) * k * (2 - k);
        if (current === "stand" || current === "crouch") stride(Math.abs(h - pos.h) * 0.7);
        pos.h = h;
        apply();
        if (k < 1) requestAnimationFrame(tick);
        else {
          plant();
          resolve();
        }
      })(st);
    });
  }
  // One stride per ~70px travelled: the feet keep pace with the body at any
  // speed, so it never glides. Written as --g, read by the paws in the CSS.
  var gait = 0;
  function stride(d) {
    gait += (d / 70) * Math.PI * 2;
    cat.style.setProperty("--g", (Math.sin(gait) * 7).toFixed(2));
  }
  function plant() {
    cat.style.setProperty("--g", "0");
  }
  function move(t, tx, ty, opts) {
    opts = opts || {};
    // lying down, it gets up before it goes anywhere
    var hold = current === "stand" || current === "crouch" ? 0 : 320;
    // never further than just off the edge of its world
    var bb = bounds();
    tx = Math.max(-160, Math.min(bb.w + 160, tx));
    ty = Math.max(40, Math.min(bb.h - 30, ty));
    if (reduced) {
      // no animated travel: it is simply somewhere else
      pos.h = (Math.atan2(tx - pos.x, -(ty - pos.y)) * 180) / Math.PI;
      pos.x = tx;
      pos.y = ty;
      apply();
      return Promise.resolve();
    }
    var vmax = opts.speed || 110;
    var turnRate = opts.turn || (vmax > 200 ? 520 : 260);
    setPose("stand");
    flag("walking", true);
    var v = 0, prints = 0;
    return new Promise(function (resolve, reject) {
      var last = performance.now(), started = last;
      (function tick(now) {
        if (t !== token) {
          flag("walking", false);
          plant();
          return reject(ABORT);
        }
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (now - started < hold) return requestAnimationFrame(tick);
        var dx = tx - pos.x, dy = ty - pos.y;
        var dist = Math.hypot(dx, dy);
        if (dist < 5 || now - started > 15000) {
          flag("walking", false);
          plant();
          return resolve();
        }
        var want = (Math.atan2(dx, -dy) * 180) / Math.PI;
        var diff = norm(want - pos.h);
        pos.h += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
        var target = vmax * (1 - Math.min(Math.abs(diff) / 180, 0.8));
        if (dist < 70) target *= Math.max(0.3, dist / 70);
        v += (target - v) * Math.min(1, dt * 4);
        var rad = (pos.h * Math.PI) / 180;
        pos.x += Math.sin(rad) * v * dt;
        pos.y -= Math.cos(rad) * v * dt;
        stride(v * dt + Math.abs(diff) * dt * 0.4);
        if (opts.prints) {
          prints += v * dt;
          if (prints > 24) {
            prints = 0;
            print(pos.x, pos.y, pos.h, opts.prints);
          }
        }
        apply();
        requestAnimationFrame(tick);
      })(last);
    });
  }
  function walkTo(t, p, opts) {
    return move(t, p.x, p.y, opts);
  }
  function hop(t, x, y) {
    if (reduced) return move(t, x, y);
    var fx = pos.x, fy = pos.y, s0 = size, dur = 440;
    setPose("stretch");
    flag("hop", true);
    return new Promise(function (resolve, reject) {
      var st = performance.now();
      (function tick(now) {
        if (t !== token) {
          size = s0;
          flag("hop", false);
          apply();
          return reject(ABORT);
        }
        var k = Math.min(1, (now - st) / dur);
        var e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
        pos.x = fx + (x - fx) * e;
        pos.y = fy + (y - fy) * e;
        size = s0 * (1 + 0.16 * Math.sin(Math.PI * k));
        apply();
        if (k < 1) return requestAnimationFrame(tick);
        size = s0;
        apply();
        flag("hop", false);
        resolve();
      })(st);
    });
  }
  function say(text, ms) {
    says.textContent = text;
    says.style.setProperty("--bx", pos.x + 18 * size + "px");
    says.style.setProperty("--by", pos.y - 110 * size + "px");
    says.classList.add("on");
    clearTimeout(say.t);
    say.t = setTimeout(function () {
      says.classList.remove("on");
    }, ms || 1400);
  }
  function announce(text) {
    live.textContent = "";
    setTimeout(function () {
      live.textContent = text;
    }, 30);
  }
  function pose(t, name, ms, flags) {
    setPose(name);
    (flags || []).forEach(function (f) {
      flag(f, true);
    });
    return wait(t, ms || 0).then(
      function () {
        (flags || []).forEach(function (f) {
          flag(f, false);
        });
      },
      function (e) {
        (flags || []).forEach(function (f) {
          flag(f, false);
        });
        throw e;
      }
    );
  }

  // ---- traces ------------------------------------------------------------
  function spawn(cls, x, y, rot) {
    var el = document.createElement("span");
    el.className = cls;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.transform = "translate(-50%,-50%) rotate(" + (rot || 0) + "deg)";
    world.appendChild(el);
    return el;
  }
  var printSide = 1;
  function print(x, y, h, colour) {
    printSide = -printSide;
    var rad = (h * Math.PI) / 180;
    var el = spawn("print", x + Math.cos(rad) * 8 * printSide, y + Math.sin(rad) * 8 * printSide, h);
    if (colour !== true) el.style.setProperty("--print", colour);
    setTimeout(function () {
      el.style.opacity = "0";
    }, 5000);
    setTimeout(function () {
      el.remove();
    }, 11500);
  }
  function fur(x, y) {
    for (var i = 0; i < 3; i++) {
      var el = spawn("fur", x + rand(-20, 20), y + rand(-16, 16), rand(0, 180));
      (function (el) {
        setTimeout(function () {
          el.style.opacity = "0";
        }, 60000);
        setTimeout(function () {
          el.remove();
        }, 64000);
      })(el);
    }
  }
  // claw marks stay for the visit, even across pages
  var scratchKey = PAGE + ":scratches";
  function scratchMarks(el, local) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "scratches");
    svg.setAttribute("viewBox", "0 0 46 52");
    svg.innerHTML = '<path d="M8 4 L4 48"/><path d="M20 2 L17 50"/><path d="M32 4 L30 48"/>';
    svg.style.left = local.x - 23 + "px";
    svg.style.top = local.y - 26 + "px";
    el.appendChild(svg);
  }
  (function restoreScratches() {
    var list = load(scratchKey, []);
    list.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (el) scratchMarks(el, s);
    });
  })();
  function nudge(el, dx, dy, dr, max) {
    max = max || 16;
    var cs = getComputedStyle(el);
    var nx = parseFloat(el.style.getPropertyValue("--nx") || cs.getPropertyValue("--nx")) || 0;
    var ny = parseFloat(el.style.getPropertyValue("--ny") || cs.getPropertyValue("--ny")) || 0;
    var nr = parseFloat(el.style.getPropertyValue("--nr") || cs.getPropertyValue("--nr")) || 0;
    var clamp = function (v, m) {
      return Math.max(-m, Math.min(m, v));
    };
    el.style.setProperty("--nx", clamp(nx + dx, max) + "px");
    el.style.setProperty("--ny", clamp(ny + dy, max) + "px");
    el.style.setProperty("--nr", clamp(nr + dr, 12) + "deg");
  }
  function knockOff(el) {
    var c = centre(el);
    var ang = Math.atan2(c.y - pos.y, c.x - pos.x);
    el.style.setProperty("--fx", Math.cos(ang) * 700 + "px");
    el.style.setProperty("--fy", Math.sin(ang) * 700 + "px");
    el.classList.add("gone");
    // Someone puts it back, eventually.
    setTimeout(function () {
      el.classList.remove("gone");
      el.style.opacity = "0";
      el.getBoundingClientRect();
      el.style.opacity = "";
    }, rand(30000, 50000));
  }
  function mark(el, flagName, ms) {
    el.classList.add(flagName);
    setTimeout(function () {
      el.classList.remove(flagName);
    }, ms);
  }

  // ---- what it does when nobody asks --------------------------------------
  function near(el, dx, dy) {
    var c = centre(el);
    return { x: c.x + (dx || 0) * c.r.w, y: c.y + (dy || 0) * c.r.h, r: c.r };
  }
  var ACTIONS = [
    { n: "wander", w: 10, run: async function (t) { await walkTo(t, freeSpot()); await pose(t, "stand", rand(600, 1500)); } },
    { n: "trot", w: 4, run: async function (t) { await walkTo(t, freeSpot(), { speed: 190 }); await pose(t, "sit", rand(1500, 3000)); } },
    { n: "sit and look around", w: 8, run: async function (t) { await pose(t, "sit", 700); for (var i = 0; i < 3; i++) { turnHead(rand(-45, 45)); await wait(t, rand(700, 1600)); } turnHead(0); await wait(t, 600); } },
    { n: "loaf", w: 6, run: async function (t) { await pose(t, "loaf", rand(6000, 12000), ["tail-flick"]); } },
    { n: "nap", w: 6, cool: 40000, run: async function (t) { await walkTo(t, freeSpot()); await pose(t, "loaf", 1200); await pose(t, "sleep", rand(18000, 40000), ["breathe"]); await pose(t, "stretch", 1400); } },
    { n: "groom", w: 7, run: async function (t) { await pose(t, "sit", 500); await pose(t, "groom", rand(2500, 4500), ["licking"]); await pose(t, "sit", 600); } },
    { n: "wash face", w: 4, run: async function (t) { await pose(t, "sit", 400); for (var i = 0; i < 4; i++) { await pose(t, "groom", 400); await pose(t, "sit", 300); } } },
    { n: "stretch", w: 5, run: async function (t) { await pose(t, "stretch", 1800); await pose(t, "stand", 500); } },
    { n: "yawn", w: 4, run: async function (t) { await pose(t, "sit", 400); say("*yawn*", 1300); flag("eyes-shut", true); await wait(t, 1300); flag("eyes-shut", false); } },
    { n: "slow blink", w: 4, run: async function (t) { await pose(t, "sit", 400); await face(t, pos.x, pos.y + 400); flag("slow-blink", true); flag("eyes-shut", true); await wait(t, 1300); flag("eyes-shut", false); await wait(t, 1100); flag("slow-blink", false); } },
    { n: "stare at nothing", w: 4, run: async function (t) { await pose(t, "alert", 300); turnHead(rand(-70, 70)); await wait(t, rand(2500, 5000)); turnHead(0); } },
    { n: "chase its tail", w: 2, cool: 60000, run: async function (t) { await pose(t, "stand", 200); flag("spin", true); await wait(t, 2200); flag("spin", false); await pose(t, "sit", 1200); say("…", 900); } },
    { n: "zoomies", w: 2, cool: 70000, run: async function (t) { for (var i = 0; i < 4; i++) await walkTo(t, freeSpot({ anywhere: true }), { speed: 520 }); await pose(t, "sit", 1500); } },
    { n: "pounce on nothing", w: 3, run: async function (t) { await pose(t, "crouch", 1400, ["wiggle"]); var rad = (pos.h * Math.PI) / 180; await move(t, pos.x + Math.sin(rad) * 90, pos.y - Math.cos(rad) * 90, { speed: 600, turn: 900 }); await pose(t, "sit", 1000); } },
    { n: "chase a fly", w: 3, cool: 50000, run: chaseFly },
    { n: "roll over", w: 3, run: async function (t) { await pose(t, "belly", rand(3000, 6000)); await pose(t, "sit", 600); } },
    { n: "knead", w: 3, run: async function (t) { await pose(t, "loaf", 400); await pose(t, "sit", rand(3000, 5000), ["kneading", "purr"]); } },
    { n: "sneeze", w: 2, run: async function (t) { await pose(t, "sit", 300); flag("sneeze", true); say("tchi!", 900); await wait(t, 600); flag("sneeze", false); } },
    { n: "meow at you", w: 3, run: async function (t) { await pose(t, "sit", 300); await face(t, pos.x, pos.y + 400); say(pickOne(["mew", "mrrp?", "meow"]), 1200); await wait(t, 1500); } },
    { n: "shed", w: 2, run: async function (t) { await pose(t, "sit", 400); fur(pos.x, pos.y); await pose(t, "groom", 1600, ["licking"]); } },
    { n: "ear twitch", w: 3, run: async function (t) { await pose(t, "loaf", 300); for (var i = 0; i < 3; i++) { turnHead(8); await wait(t, 160); turnHead(0); await wait(t, rand(800, 1600)); } } },

    // things on the bench
    { n: "scratch it", w: 5, needs: "scratch", cool: 45000, run: async function (t) {
      var el = pickOne(props("scratch")); var p = near(el, 0, 0.62);
      await walkTo(t, p); await face(t, p.x, p.y - 100);
      await pose(t, "scratch", 400); flag("scratching", true); await wait(t, 1800); flag("scratching", false);
      var r = rectOf(el); var local = { x: Math.max(30, Math.min(r.w - 30, pos.x - r.x)), y: Math.max(30, Math.min(r.h - 30, pos.y - 70 * size - r.y)) };
      scratchMarks(el, local);
      if (el.id) { var list = load(scratchKey, []); list.push({ id: el.id, x: local.x, y: local.y }); save(scratchKey, list.slice(-6)); }
      await pose(t, "sit", 900); say("…", 800);
    } },
    { n: "knock something off", w: 6, needs: "knock", cool: 25000, run: async function (t) {
      var el = pickOne(props("knock")); var c = centre(el);
      await walkTo(t, { x: c.x - 40, y: c.y + 50 }); await face(t, c.x, c.y);
      await pose(t, "sit", 500); for (var i = 0; i < 3; i++) { parts.fr.style.transform = "translate(8px,-40px) scale(1)"; await wait(t, 260); nudge(el, rand(-4, 4), rand(-4, 4), rand(-6, 6), 40); setPose("sit"); await wait(t, rand(500, 1100)); }
      parts.fr.style.transform = "translate(10px,-46px) scale(1)"; await wait(t, 150); knockOff(el); setPose("sit");
      turnHead(0); await wait(t, 900); await face(t, pos.x, pos.y + 400); await wait(t, 1200);
    } },
    { n: "bat it about", w: 4, needs: "knock", run: async function (t) {
      var el = pickOne(props("knock")); var c = centre(el);
      await walkTo(t, { x: c.x + 46, y: c.y + 40 }); await face(t, c.x, c.y); await pose(t, "crouch", 500);
      for (var i = 0; i < 4; i++) { nudge(el, rand(-14, 14), rand(-10, 10), rand(-25, 25), 60); await wait(t, rand(300, 700)); }
      await pose(t, "sit", 900);
    } },
    { n: "nudge it", w: 5, needs: "push", run: async function (t) {
      var el = pickOne(props("push")); var c = centre(el); var side = chance(0.5) ? -1 : 1;
      await walkTo(t, { x: c.x + side * (c.r.w / 2 + 30), y: c.y + rand(-20, 20) }); await face(t, c.x, c.y);
      await pose(t, "stand", 300); var rad = (pos.h * Math.PI) / 180; nudge(el, Math.sin(rad) * 8, -Math.cos(rad) * 8, rand(-3, 3)); await pose(t, "sit", 1500);
    } },
    { n: "sit on it", w: 6, needs: "sit", cool: 30000, run: async function (t) {
      var el = pickOne(props("sit")); var p = near(el, rand(-0.2, 0.2), rand(-0.15, 0.2));
      await walkTo(t, p); await pose(t, chance(0.5) ? "loaf" : "sit", rand(8000, 15000), ["tail-flick"]);
    } },
    { n: "hide under it", w: 3, needs: "hide", cool: 60000, run: async function (t) {
      var el = pickOne(props("hide")); var c = centre(el);
      await walkTo(t, { x: c.x, y: c.r.y + c.r.h + 40 }); flag("hiding", true); await walkTo(t, { x: c.x + 10, y: c.y + c.r.h * 0.2 }, { speed: 70 });
      await pose(t, "loaf", rand(7000, 14000), ["tail-flick"]); await walkTo(t, { x: c.x, y: c.r.y + c.r.h + 60 }, { speed: 90 }); flag("hiding", false);
    } },
    { n: "sniff it", w: 6, needs: "sit", run: async function (t) {
      var el = pickOne(props("sit")); var c = centre(el); var p = { x: c.r.x + rand(0, c.r.w), y: c.r.y + c.r.h + 34 };
      await walkTo(t, p); await face(t, p.x, c.y); await pose(t, "stand", 200);
      for (var i = 0; i < 3; i++) { turnHead(rand(-12, 12)); await wait(t, 300); } turnHead(0); await pose(t, "sit", 800);
    } },
    { n: "sniff the coffee", w: 4, needs: "coffee", cool: 40000, run: async function (t) {
      var el = pickOne(props("coffee")); var c = centre(el);
      await walkTo(t, { x: c.x - c.r.w / 2 - 40, y: c.y + 20 }); await face(t, c.x, c.y); await pose(t, "stand", 900);
      say("!", 700); await move(t, pos.x - 70, pos.y + 30, { speed: 420, turn: 900 }); await pose(t, "sit", 1200);
    } },
    { n: "tip the jar", w: 3, needs: "jar", cool: 90000, run: async function (t) {
      var el = pickOne(props("jar")); var c = centre(el);
      await walkTo(t, { x: c.x - c.r.w / 2 - 34, y: c.y + 10 }); await face(t, c.x, c.y); await pose(t, "sit", 600);
      parts.fr.style.transform = "translate(8px,-44px) scale(1)"; await wait(t, 300); mark(el, "tipped", 40000); setPose("sit");
      await wait(t, 600); await face(t, pos.x, pos.y + 400); say("…", 900); await wait(t, 1200);
    } },
    { n: "mess up the cards", w: 3, needs: "cards", cool: 60000, run: async function (t) {
      var el = pickOne(props("cards")); var c = centre(el);
      await walkTo(t, { x: c.x, y: c.r.y + c.r.h + 36 }); await face(t, c.x, c.y); await pose(t, "crouch", 600, ["wiggle"]);
      await move(t, c.x, c.y, { speed: 400 }); mark(el, "messy", 35000); await pose(t, "sit", 2000);
    } },
    { n: "spin the envelope", w: 3, needs: "envelope", run: async function (t) {
      var el = pickOne(props("envelope")); var c = centre(el);
      await walkTo(t, { x: c.x + c.r.w / 2 + 30, y: c.y }); await face(t, c.x, c.y); await pose(t, "sit", 400);
      parts.fl.style.transform = "translate(-8px,-40px) scale(1)"; await wait(t, 250); nudge(el, -6, 4, -9); setPose("sit"); await wait(t, 1200);
    } },
    { n: "bat the tape", w: 3, needs: "tape", run: async function (t) {
      var el = pickOne(props("tape")); var r = rectOf(el); var p = { x: r.x + r.w - 10, y: r.y + r.h + 36 };
      await walkTo(t, p); await face(t, p.x, r.y); await pose(t, "scratch", 500); mark(el, "lifted", 15000); await pose(t, "sit", 1500);
    } },
    { n: "lie on the photo", w: 3, needs: "photo", cool: 80000, run: async function (t) {
      var el = pickOne(props("photo")); var c = centre(el); await walkTo(t, c); await pose(t, "loaf", 800); say("that's me", 1600); await pose(t, "loaf", rand(6000, 10000), ["tail-flick"]);
    } },
    { n: "lie on the book", w: 5, needs: "book", cool: 40000, run: async function (t) {
      var el = pickOne(props("book")); var r = rectOf(el); var p = { x: r.x + r.w * rand(0.25, 0.75), y: r.y + r.h * rand(0.3, 0.7) };
      p.y = Math.max(visible().top + 120, Math.min(visible().bottom - 120, p.y));
      await walkTo(t, p); await pose(t, "loaf", 600); await pose(t, chance(0.4) ? "sleep" : "loaf", rand(7000, 12000), ["breathe"]);
    } },
    { n: "paw at a page", w: 4, needs: "corner", run: async function (t) {
      var el = pickOne(props("corner")); var c = centre(el); await walkTo(t, { x: c.x + 30, y: c.y + 46 }); await face(t, c.x, c.y);
      await pose(t, "crouch", 400); for (var i = 0; i < 3; i++) { el.classList.add("curl"); await wait(t, 300); el.classList.remove("curl"); await wait(t, 500); } await pose(t, "sit", 900);
    } },
    { n: "sit by the menu", w: 2, needs: "nav", cool: 90000, run: async function (t) {
      var el = pickOne(props("nav")); var c = centre(el); await walkTo(t, { x: c.x - 20, y: c.y + 70 }); await face(t, c.x, c.y); await pose(t, "sit", rand(5000, 9000), ["tail-flick"]);
    } },
    { n: "lap at the coffee", w: 6, needs: "puddle", cool: 30000, run: async function (t) {
      var el = pickOne(props("puddle")); var c = centre(el); await walkTo(t, { x: c.x + c.r.w * 0.3, y: c.y + c.r.h * 0.5 + 30 }); await face(t, c.x, c.y);
      await pose(t, "crouch", 400); await pose(t, "crouch", rand(3000, 5000), ["licking"]); say("…", 800);
      await walkTo(t, freeSpot(), { prints: "rgba(80,45,20,.55)" });
    } },
    { n: "bring a present", w: 2, cool: 120000, run: async function (t) {
      if (world.querySelector(".toy")) return;
      var from = { x: chance(0.5) ? -80 : bounds().w + 80, y: rand(visible().top + 120, visible().bottom - 120) };
      await walkTo(t, from, { speed: 220 }); await wait(t, 1500); var to = freeSpot(); await walkTo(t, to, { speed: 150 });
      var toy = spawn("toy", pos.x, pos.y - 70 * size, pos.h - 90); toy.setAttribute("aria-hidden", "true"); await face(t, pos.x, pos.y + 400); say("for you", 1500); await pose(t, "sit", 2500);
    } },
    { n: "walk the line", w: 2, run: async function (t) {
      var line = Math.round(rand(2, Math.floor(bounds().w / 200) - 1)) * 200 + 28; var v = visible();
      await walkTo(t, { x: line, y: v.top + 120 }); await walkTo(t, { x: line, y: v.bottom - 120 }, { speed: 80, turn: 120 }); await pose(t, "sit", 1200);
    } },
    { n: "leave", w: 2, cool: 120000, run: function (t) { return stayAway(t, rand(15000, 35000), 140); } },
  ];

  // The free spot furthest from where it is now.
  function farSpot() {
    var best = freeSpot(), far = 0;
    for (var i = 0; i < 12; i++) {
      var s = freeSpot();
      var d = Math.hypot(s.x - pos.x, s.y - pos.y);
      if (d > far) { far = d; best = s; }
    }
    return best;
  }
  // Off the nearest side edge, away for a while, then a peek and back in.
  async function stayAway(t, ms, speed) {
    var b = bounds();
    var left = pos.x < b.w / 2;
    await walkTo(t, { x: left ? -150 : b.w + 150, y: pos.y }, { speed: speed || 380 });
    await wait(t, ms);
    var v = visible();
    var y = rand(v.top + 140, v.bottom - 140);
    pos.x = left ? -70 : b.w + 70; pos.y = y; pos.h = left ? 90 : -90;
    apply();
    await move(t, left ? -18 : b.w + 18, y, { speed: 50 });
    await pose(t, "stand", 1600);
    turnHead(rand(-30, 30));
    await wait(t, 900);
    await walkTo(t, freeSpot());
  }

  async function chaseFly(t) {
    var fly = spawn("fly", pos.x + 120, pos.y - 140, 0);
    fly.setAttribute("aria-hidden", "true");
    var f = { x: pos.x + 120, y: pos.y - 140 };
    var flying = true;
    (function buzz() {
      if (!flying) return;
      f.x += rand(-14, 14); f.y += rand(-12, 12);
      fly.style.left = f.x + "px"; fly.style.top = f.y + "px";
      requestAnimationFrame(buzz);
    })();
    try {
      for (var i = 0; i < 4; i++) {
        await face(t, f.x, f.y);
        await pose(t, "crouch", 700, ["wiggle"]);
        await move(t, f.x, f.y, { speed: 520, turn: 900 });
        f.x += rand(-160, 160); f.y += rand(-120, 120);
        var v = visible();
        f.x = Math.max(60, Math.min(bounds().w - 60, f.x));
        f.y = Math.max(v.top + 60, Math.min(v.bottom - 60, f.y));
      }
      await pose(t, "sit", 1200);
      say("…", 800);
    } finally {
      flying = false;
      fly.remove();
    }
  }

  // ---- toys ----------------------------------------------------------------
  // Things on the bench that lead nowhere: they are only there for the cat.
  // Touching one always does something to the toy; whether the cat cares is
  // up to the cat.
  var TOYS = {
    yarn: { label: "A ball of yarn", chance: 0.5, html: '<svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="22" fill="#d9485f"/><path d="M8 18c10 6 24 6 34-2M6 28c12 6 28 6 38-4M12 38c8-12 20-24 26-30M20 44c4-14 14-28 22-34" stroke="#a8283d" stroke-width="2" fill="none"/></svg>' },
    feather: { label: "A feather on a stick", chance: 0.55, pad: 90, html: '<span class="wand"></span><span class="tuft"><i></i><i></i><i></i></span>' },
    laser: { label: "A laser pointer", chance: 0.7, html: '<span class="pen"></span>' },
    box: { label: "A cardboard box", chance: 0.45, pad: 110, html: '<span class="flap n"></span><span class="flap s"></span><span class="flap e"></span><span class="flap w"></span><span class="inner"></span>' },
    crinkle: { label: "A crinkle ball", chance: 0.45, html: "" },
    catnip: { label: "A catnip mouse", chance: 0.6, html: "" },
    treats: { label: "A bag of cat treats", chance: 0.8, pad: 80, html: '<span class="bag-face">treats</span>' },
    bag: { label: "A paper bag", chance: 0.4, pad: 90, html: '<span class="mouth"></span>' },
  };
  var lastPoke = {};
  function placeToys() {
    var kinds = Object.keys(TOYS).filter(function (k) { return k !== "treats" || chance(0.5); });
    kinds.sort(function () { return Math.random() - 0.5; });
    var n = narrow ? 2 : Math.round(rand(2, 4));
    kinds.slice(0, n).forEach(function (k) {
      var spot = freeSpot({ strict: true, pad: TOYS[k].pad || 60 });
      if (!spot) return; // no room on this bench: no toy
      var el = document.createElement("button");
      el.type = "button";
      el.className = "cat-toy " + k;
      el.dataset.cat = "toy " + k;
      el.dataset.toy = k;
      el.setAttribute("aria-label", TOYS[k].label);
      el.innerHTML = TOYS[k].html;
      el.style.left = spot.x + "px";
      el.style.top = spot.y + "px";
      el.style.setProperty("--r", rand(-40, 40) + "deg");
      world.appendChild(el);
      el.addEventListener("click", function () { poke(el); });
    });
    if (!narrow && chance(0.6)) {
      var s = freeSpot({ anywhere: true });
      var sun = document.createElement("span");
      sun.className = "sunbeam";
      sun.dataset.cat = "sunbeam";
      sun.setAttribute("aria-hidden", "true");
      sun.style.left = s.x - 110 + "px";
      sun.style.top = s.y - 80 + "px";
      world.insertBefore(sun, world.firstChild);
    }
  }
  function toyAt(el) {
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
  }
  function moveToy(el, x, y) {
    var b = bounds();
    el.style.left = Math.max(40, Math.min(b.w - 40, x)) + "px";
    el.style.top = Math.max(60, Math.min(b.h - 40, y)) + "px";
  }
  function thread(from, to) {
    var svg = world.querySelector(".yarn-trail");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "yarn-trail");
      svg.setAttribute("aria-hidden", "true");
      world.insertBefore(svg, world.firstChild);
    }
    svg.setAttribute("width", bounds().w);
    svg.setAttribute("height", bounds().h);
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    var mx = (from.x + to.x) / 2 + rand(-40, 40), my = (from.y + to.y) / 2 + rand(-40, 40);
    p.setAttribute("d", "M" + from.x + " " + from.y + " Q" + mx + " " + my + " " + to.x + " " + to.y);
    svg.appendChild(p);
  }
  var laserDot = null;
  function laser(ms) {
    if (!laserDot) {
      laserDot = document.createElement("span");
      laserDot.className = "laser-dot";
      laserDot.setAttribute("aria-hidden", "true");
      world.appendChild(laserDot);
    }
    var v = visible(), b = bounds();
    var at = { x: rand(100, b.w - 100), y: rand(v.top + 100, v.bottom - 100) };
    laserDot.style.left = at.x + "px";
    laserDot.style.top = at.y + "px";
    laserDot.classList.add("on");
    var hops = Math.floor(ms / 700);
    var h = 0;
    clearInterval(laser.iv);
    laser.iv = setInterval(function () {
      if (++h > hops) {
        clearInterval(laser.iv);
        laserDot.classList.remove("on");
        return;
      }
      at = { x: Math.max(80, Math.min(b.w - 80, at.x + rand(-260, 260))), y: Math.max(v.top + 80, Math.min(v.bottom - 80, at.y + rand(-200, 200))) };
      laserDot.style.left = at.x + "px";
      laserDot.style.top = at.y + "px";
    }, 700);
  }
  function spillTreats(el) {
    var c = toyAt(el);
    for (var i = 0; i < 6; i++) {
      var tr = spawn("treat", c.x + rand(-60, 60), c.y + rand(30, 80), rand(0, 180));
      tr.dataset.cat = "treat";
      tr.setAttribute("aria-hidden", "true");
    }
  }
  // what the human sees, every time
  function poke(el) {
    var k = el.dataset.toy;
    var c = toyAt(el);
    if (k === "yarn") moveToy(el, c.x + rand(-50, 50), c.y + rand(-40, 40));
    if (k === "laser") laser(4200);
    if (k === "treats") { mark(el, "shake", 600); spillTreats(el); }
    if (k === "crinkle") { mark(el, "shake", 500); note(c, "crinkle"); }
    if (k === "catnip") { mark(el, "shake", 500); note(c, "squeak"); }
    if (k === "feather" || k === "box" || k === "bag") mark(el, "shake", 700);
    stimulus(k, el);
  }
  function note(c, text) {
    var n = spawn("toy-note", c.x, c.y - 40, 0);
    n.textContent = text;
    n.setAttribute("aria-hidden", "true");
    setTimeout(function () { n.remove(); }, 1100);
  }
  // whether the cat cares
  function stimulus(kind, el) {
    var now = performance.now();
    var p = TOYS[kind].chance;
    if (current === "sleep") p *= 0.3;
    if (pets.length > 3) p *= 0.5;
    if (lastPoke[kind] && now - lastPoke[kind] < 8000) p *= 0.6; // bored of it already
    lastPoke[kind] = now;
    var delay = rand(400, 1800);
    setTimeout(function () {
      if (reacting) return;
      if (chance(p)) {
        announce("The cat noticed the " + TOYS[kind].label.replace(/^An? /, "").toLowerCase() + ".");
        var t = ++token;
        reacting = playWith(t, kind, el)
          .catch(function (e) { if (e !== ABORT) console.warn(e); })
          .then(function () { reacting = null; });
      } else if (chance(0.45) && current !== "sleep") {
        announce("The cat looks, and goes back to what it was doing.");
        var c = toyAt(el);
        var ang = norm((Math.atan2(c.x - pos.x, -(c.y - pos.y)) * 180) / Math.PI - pos.h);
        turnHead(Math.max(-60, Math.min(60, ang)));
        setTimeout(function () { turnHead(0); }, 1400);
      } else {
        announce("The cat ignores it.");
      }
    }, delay);
  }
  async function playWith(t, kind, el) {
    var c = toyAt(el);
    flag("hiding", false);
    if (current === "sleep") { await pose(t, "loaf", 800); await pose(t, "stretch", 1000); }
    if (kind === "yarn") {
      for (var i = 0; i < 3; i++) {
        c = toyAt(el);
        await walkTo(t, { x: c.x - 30, y: c.y + 60 }, { speed: 220 });
        await face(t, c.x, c.y);
        await pose(t, "crouch", 500, ["wiggle"]);
        var to = { x: c.x + rand(-160, 160), y: c.y + rand(-120, 120) };
        thread(c, to);
        moveToy(el, to.x, to.y);
        await wait(t, 400);
      }
      await pose(t, "sit", 1200);
    } else if (kind === "feather") {
      await walkTo(t, { x: c.x + 20, y: c.y + 110 });
      await face(t, c.x, c.y);
      await pose(t, "crouch", rand(1200, 2200), ["wiggle"]);
      await move(t, c.x, c.y + 40, { speed: 600, turn: 900 });
      mark(el, "shake", 900);
      say("!", 700);
      await pose(t, "belly", 2200, ["kneading"]);
      await pose(t, "sit", 600);
    } else if (kind === "laser") {
      if (!laserDot || !laserDot.classList.contains("on")) laser(4200);
      for (var j = 0; j < 6 && laserDot.classList.contains("on"); j++) {
        var d = { x: parseFloat(laserDot.style.left), y: parseFloat(laserDot.style.top) };
        await move(t, d.x, d.y + 50, { speed: 520, turn: 900 });
        await pose(t, "crouch", 250);
      }
      await pose(t, "alert", 300);
      say("…?", 1400);
      await wait(t, 1800);
    } else if (kind === "box") {
      // up to the edge, a look, a wiggle, and in
      await walkTo(t, { x: c.x + rand(-20, 20), y: c.y + 95 });
      await face(t, c.x, c.y);
      await pose(t, "crouch", rand(700, 1400), ["wiggle"]);
      await hop(t, c.x, c.y + 6);
      await pose(t, "sit", 500);
      say("fits", 1200);
      await pose(t, "loaf", rand(10000, 18000), ["tail-flick"]);
      var out = freeSpot();
      await pose(t, "stand", 300);
      await face(t, out.x, out.y);
      var ang = (pos.h * Math.PI) / 180;
      await hop(t, pos.x + Math.sin(ang) * 95, pos.y - Math.cos(ang) * 95);
      await walkTo(t, out);
    } else if (kind === "crinkle") {
      await walkTo(t, { x: c.x + 40, y: c.y + 50 }, { speed: 200 });
      await face(t, c.x, c.y);
      for (var k2 = 0; k2 < 3; k2++) {
        await pose(t, "crouch", 300);
        moveToy(el, toyAt(el).x + rand(-40, 40), toyAt(el).y + rand(-30, 30));
        note(toyAt(el), "crinkle");
        await wait(t, 500);
      }
      await pose(t, "sit", 1000);
    } else if (kind === "catnip") {
      await walkTo(t, { x: c.x, y: c.y + 50 });
      await face(t, c.x, c.y);
      await pose(t, "stand", 800);
      say("prrrr", 2000);
      await pose(t, "belly", 3500, ["purr"]);
      for (var z = 0; z < 3; z++) await walkTo(t, freeSpot({ anywhere: true }), { speed: 520 });
      await pose(t, "sit", 1500);
    } else if (kind === "treats") {
      var treats = props("treat");
      if (!treats.length) { spillTreats(el); treats = props("treat"); }
      await walkTo(t, centre(treats[0]), { speed: 320 });
      for (var q = 0; q < treats.length; q++) {
        var tc = centre(treats[q]);
        await move(t, tc.x, tc.y + 40, { speed: 80 });
        await face(t, tc.x, tc.y);
        await pose(t, "crouch", 700, ["licking"]);
        treats[q].remove();
        say("crunch", 600);
      }
      await pose(t, "sit", 600);
      await pose(t, "groom", 2500, ["licking"]);
    } else if (kind === "bag") {
      await walkTo(t, { x: c.x, y: c.y + 90 });
      flag("hiding", true);
      await move(t, c.x, c.y, { speed: 60 });
      for (var r2 = 0; r2 < 3; r2++) { await pose(t, "loaf", rand(2500, 5000)); mark(el, "shake", 500); }
      await move(t, c.x, c.y + 120, { speed: 90 });
      flag("hiding", false);
    }
  }
  ACTIONS.push(
    // On its own, without anyone pointing a laser: the treat bag gets raided.
    { n: "play with a toy", w: 5, needs: "toy", cool: 30000, run: async function (t) {
      var toys = props("toy").filter(function (el) { return el.dataset.toy !== "laser"; });
      if (!toys.length) return;
      var el = pickOne(toys);
      if (el.dataset.toy === "treats") {
        var c = toyAt(el);
        await walkTo(t, { x: c.x - 40, y: c.y + 40 });
        await face(t, c.x, c.y);
        await pose(t, "sit", 500);
        mark(el, "shake", 600);
        spillTreats(el);
      }
      await playWith(t, el.dataset.toy, el);
    } },
    { n: "eat what's on the floor", w: 8, needs: "treat", run: async function (t) {
      var bagEl = props("treats")[0] || props("treat")[0];
      await playWith(t, "treats", bagEl);
    } },
    { n: "nap in the sun", w: 6, needs: "sunbeam", cool: 60000, run: async function (t) {
      var c = centre(pickOne(props("sunbeam")));
      await walkTo(t, c);
      await pose(t, "loaf", 1000);
      await pose(t, chance(0.5) ? "belly" : "sleep", rand(15000, 30000), ["breathe"]);
      await pose(t, "stretch", 1400);
    } }
  );

  var lastRun = {};
  function pickAction() {
    var now = performance.now();
    var options = ACTIONS.filter(function (a) {
      if (a.needs && !props(a.needs).length) return false;
      if (a.cool && lastRun[a.n] && now - lastRun[a.n] < a.cool) return false;
      return a.n !== pickAction.last;
    });
    var total = options.reduce(function (s, a) { return s + a.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < options.length; i++) {
      r -= options[i].w;
      if (r <= 0) return options[i];
    }
    return options[0];
  }

  // ---- what it does when you touch it -------------------------------------
  var pets = [];
  var REACTIONS = [
    { w: 6, text: "The cat purrs.", run: async function (t) { await pose(t, "loaf", 200); say("prrrrr", 2400); await pose(t, "loaf", 2600, ["purr", "eyes-shut"]); } },
    { w: 4, text: "The cat meows at you.", run: async function (t) { await pose(t, "sit", 200); say(pickOne(["mew", "meow", "mrow"]), 1200); await wait(t, 1200); } },
    { w: 4, text: "The cat chirps.", run: async function (t) { await pose(t, "alert", 200); say("mrrp?", 1100); await wait(t, 1200); } },
    { w: 4, text: "The cat gives you a slow blink.", run: async function (t) { await pose(t, "sit", 300); flag("slow-blink", true); flag("eyes-shut", true); await wait(t, 1400); flag("eyes-shut", false); await wait(t, 1000); flag("slow-blink", false); } },
    { w: 4, text: "The cat headbutts your hand.", run: async function (t) { await pose(t, "stand", 150); flag("bonk", true); say("*bonk*", 900); await wait(t, 600); flag("bonk", false); await pose(t, "sit", 900, ["purr"]); } },
    { w: 3, text: "The cat rolls over and shows its belly. It is a trap.", run: async function (t) { await pose(t, "belly", 200); say("…", 900); belly.trap = performance.now(); await wait(t, 3500); belly.trap = 0; await pose(t, "sit", 500); } },
    { w: 3, text: "The cat ignores you.", run: async function (t) { flag("tail-flick", true); await wait(t, 1800); flag("tail-flick", false); } },
    { w: 2, text: "The cat walks off.", run: async function (t) { say("hmph", 900); await walkTo(t, freeSpot(), { speed: 150 }); await pose(t, "sit", 600); turnHead(60); await wait(t, 1200); } },
    { w: 3, text: "The cat starts grooming, pointedly.", run: async function (t) { await pose(t, "groom", 2600, ["licking"]); await pose(t, "sit", 400); } },
    { w: 3, text: "The cat kneads the mat.", run: async function (t) { await pose(t, "sit", 200); say("prr", 1500); await pose(t, "sit", 3000, ["kneading", "purr"]); } },
    { w: 2, text: "The cat yawns.", run: async function (t) { await pose(t, "sit", 200); say("*yawn*", 1300); flag("eyes-shut", true); await wait(t, 1300); flag("eyes-shut", false); } },
    { w: 2, text: "The cat stares at you.", run: async function (t) { await pose(t, "alert", 200); await face(t, pos.x, pos.y + 400); say("…", 1800); await wait(t, 2000); } },
    { w: 2, text: "The cat sneezes.", run: async function (t) { flag("sneeze", true); say("tchi!", 900); await wait(t, 600); flag("sneeze", false); } },
    { w: 2, text: "The cat rubs against you, leaving fur everywhere.", run: async function (t) { await pose(t, "stand", 200); fur(pos.x, pos.y); say("prr", 900); await wait(t, 1000); } },
  ];
  async function react() {
    var t = ++token;
    var now = performance.now();
    pets = pets.filter(function (p) { return now - p < 10000; });
    pets.push(now);
    try {
      flag("walking", false);
      flag("hiding", false);
      if (belly.trap && now - belly.trap < 3500) {
        // the trap: it grabs you
        belly.trap = 0;
        announce("The cat grabs your hand with all four paws.");
        await pose(t, "belly", 100, ["kneading"]);
        say("!", 900);
        await wait(t, 1100);
        await pose(t, "sit", 600, ["tail-flick"]);
        return;
      }
      // Pester it and it moves away from you, every time: the one reaction
      // that is not left to chance, so a cat sitting on something can be moved.
      var recent = pets.filter(function (p) { return now - p < 5000; }).length;
      if (recent >= 5 || (recent >= 3 && chance(0.25))) {
        pets = [];
        announce("The cat has had enough, and leaves for a while.");
        say(pickOne(["hss", "…", "hmph"]), 900);
        await stayAway(t, rand(20000, 40000));
        return;
      }
      if (recent >= 3) {
        announce("The cat moves away from you.");
        say(pickOne(["hmph", "…", "mrr"]), 900);
        await walkTo(t, farSpot(), { speed: 300 });
        await pose(t, "sit", 600);
        turnHead(pickOne([-60, 60]));
        await wait(t, 1400);
        turnHead(0);
        return;
      }
      if (current === "sleep") {
        if (chance(0.5)) {
          announce("The cat twitches an ear and keeps sleeping.");
          turnHead(-8);
          await wait(t, 200);
          turnHead(0);
          say("zzz", 1200);
          await wait(t, 1500);
          return;
        }
        announce("The cat wakes up, unimpressed.");
        await pose(t, "loaf", 700);
        flag("eyes-shut", false);
        say("…", 1000);
        await wait(t, 1200);
        return;
      }
      var total = REACTIONS.reduce(function (s, r) { return s + r.w; }, 0);
      var r = Math.random() * total, chosen = REACTIONS[0];
      for (var i = 0; i < REACTIONS.length; i++) {
        r -= REACTIONS[i].w;
        if (r <= 0) { chosen = REACTIONS[i]; break; }
      }
      announce(chosen.text);
      await chosen.run(t);
    } catch (e) {
      if (e !== ABORT) console.warn(e);
    }
  }
  var reacting = null;
  cat.addEventListener("click", function () {
    reacting = react().then(function () { reacting = null; });
  });

  // ---- a life -------------------------------------------------------------
  async function life() {
    for (;;) {
      if (reacting) {
        await reacting;
        continue;
      }
      var a = pickAction();
      pickAction.last = a.n;
      lastRun[a.n] = performance.now();
      var t = ++token;
      cat.dataset.doing = a.n;
      try {
        await a.run(t);
        await wait(t, rand(800, 3500));
      } catch (e) {
        if (e !== ABORT) {
          console.warn("cat:", a.n, e);
          await new Promise(function (r) { setTimeout(r, 1000); });
        }
      }
    }
  }

  function start() {
    placeToys();
    if (arrived) {
      // it came along from the last page: it carries on from where it is
      if (!reduced) setTimeout(life, rand(900, 2200));
      return;
    }
    // somewhere clear to begin, or the margin: never asleep on top of the text
    var spot = freeSpot({ strict: true, pad: 80 }) || gutter();
    if (reduced) {
      // No walking about: it is asleep where it is, and still answers.
      pos.x = spot.x; pos.y = spot.y; pos.h = -20;
      setPose("sleep");
      apply();
      return;
    }
    if (chance(0.45)) {
      pos.x = spot.x; pos.y = spot.y; pos.h = rand(-40, 40);
      setPose("sleep");
      flag("breathe", true);
      apply();
      setTimeout(function () { flag("breathe", false); life(); }, rand(4000, 9000));
    } else {
      var b = bounds();
      var fromLeft = chance(0.5);
      pos.x = fromLeft ? -120 : b.w + 120; pos.y = spot.y; pos.h = fromLeft ? 90 : -90;
      setPose("stand");
      apply();
      life();
    }
  }
  // Wait for fonts and layout, so the props are where they will be.
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
    requestAnimationFrame(start);
  });
  window.benchCat = {
    actions: ACTIONS.map(function (a) { return a.n; }),
    reactions: REACTIONS.length,
    toys: Object.keys(TOYS),
    doing: function () { return cat.dataset.doing; },
    // for looking at the drawing: benchCat.inspect("sleep", 3)
    inspect: function (name, s) {
      token++;
      size = s || 3;
      var v = visible();
      pos.x = bounds().w / 2; pos.y = (v.top + v.bottom) / 2; pos.h = 0;
      setPose(name);
      apply();
    },
  };
})();
