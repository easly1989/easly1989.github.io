/* Mockup: the bench as an isometric room. The mat lies on a desk against two
   walls, an office chair stands at the desk's front edge, and every object has
   its height. Runs before site.js and cat.js; only on the wide bench. */
(function () {
  "use strict";
  if (!matchMedia("(min-width: 901px)").matches) return;
  document.documentElement.classList.add("b3");
  var stage = document.querySelector(".stage");
  var fit = document.querySelector(".fit");
  var native = Element.prototype.getBoundingClientRect;

  function el(tag, cls, parent, css) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    (parent || stage).appendChild(e);
    return e;
  }
  function shade(color, k) {
    return "color-mix(in srgb, " + color + " " + Math.round(k * 100) + "%, black)";
  }
  // A box standing on z, w along x, d along y, h up: its top and the four sides.
  function box(parent, o) {
    var b = el("span", "rbox " + (o.cls || ""), parent, "left:" + o.x + "px;top:" + o.y + "px;width:" + o.w + "px;height:" + o.d + "px;transform:translateZ(" + o.z + "px)");
    var c = o.color;
    el("i", "t " + (o.topCls || ""), b, "transform:translateZ(" + o.h + "px);" + (o.topCls ? "" : "background:" + c) + (o.r ? ";border-radius:" + o.r + "px" : ""));
    el("i", "s", b, "top:" + o.d + "px;height:" + o.h + "px;background:" + (o.side || shade(c, 0.78)) + ";transform:translateZ(" + o.h + "px) rotateX(-90deg)");
    el("i", "n", b, "top:" + -o.h + "px;height:" + o.h + "px;background:" + shade(c, 0.6) + ";transform:translateZ(" + o.h + "px) rotateX(90deg)");
    el("i", "e", b, "left:" + o.w + "px;width:" + o.h + "px;background:" + shade(c, 0.66) + ";transform:translateZ(" + o.h + "px) rotateY(90deg)");
    el("i", "w", b, "left:" + -o.h + "px;width:" + o.h + "px;background:" + (o.west || shade(c, 0.9)) + ";transform:translateZ(" + o.h + "px) rotateY(-90deg)");
    return b;
  }
  // Something printed round a cylinder: cut into narrow strips, each standing on
  // the curve. The host's centre is the axis; at is the angle the middle faces
  // (45deg faces the camera), z the height of the print's top edge.
  function wrap(host, html, o) {
    var n = Math.ceil(o.w / o.strip);
    for (var i = 0; i < n; i++) {
      var x0 = i * o.strip;
      var a = o.at - (((x0 + o.strip / 2 - o.w / 2) / o.r) * 180) / Math.PI;
      var s = el("span", "strip", host, "width:" + (o.strip + 0.6) + "px;height:" + o.h + "px;margin-left:" + -o.strip / 2 + "px;transform:translateZ(" + o.z + "px) rotateZ(" + a + "deg) translateY(" + o.r + "px) rotateX(-90deg)");
      s.setAttribute("aria-hidden", "true");
      var inner = el("span", "strip-in " + (o.cls || ""), s, "left:" + -x0 + "px;width:" + o.w + "px;height:" + o.h + "px");
      inner.innerHTML = html;
    }
  }
  // A plane on a wall's face: "back" is the wall behind the desk, "right" the
  // other one. x runs along the wall, z is the height of the plane's top edge.
  function onWall(which, along, z, cls) {
    var p =
      which === "back"
        ? el("div", "on-wall " + cls, room, "left:" + along + "px;top:" + (BACK + 2) + "px;transform:translateZ(" + z + "px) rotateX(-90deg)")
        : el("div", "on-wall " + cls, room, "left:" + (RIGHT - 2) + "px;top:" + along + "px;transform:translateZ(" + z + "px) rotateZ(90deg) rotateX(-90deg)");
    return p;
  }

  // ---- the room --------------------------------------------------------------
  var MAT = 4; // the mat's thickness; its top is z = 0, where everything stands
  var DESK = { x: -560, y: -150, w: 1890, d: 1180, t: 46 };
  var BACK = -200; // the face of the wall behind the desk
  var RIGHT = 1350; // the face of the wall to its right
  var FLOOR = -560; // the desk is drawn shorter than a real one, so the scene fits
  var room = el("div", "room", stage, "position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;pointer-events:none");
  stage.insertBefore(room, stage.firstChild);
  el("span", "floor-plane", room, "left:-1400px;top:" + BACK + "px;width:" + (RIGHT + 1400) + "px;height:2700px;transform:translateZ(" + FLOOR + "px)");
  var WALL_H = 1900; // tall enough that no corner of the room shows above the walls
  box(room, { x: -1400, y: BACK - 24, w: RIGHT + 1424, d: 24, z: FLOOR, h: WALL_H, color: "var(--wall)" });
  box(room, { x: RIGHT, y: BACK - 24, w: 24, d: 2724, z: FLOOR, h: WALL_H, color: "var(--wall)" });
  box(room, { x: -1400, y: BACK, w: RIGHT + 1400, d: 8, z: FLOOR, h: 40, color: "var(--skirting)" });
  box(room, { x: RIGHT - 8, y: BACK, w: 8, d: 2700, z: FLOOR, h: 40, color: "var(--skirting)" });
  box(room, { x: DESK.x, y: DESK.y, w: DESK.w, d: DESK.d, z: -MAT - DESK.t, h: DESK.t, color: "var(--desk)" });
  [[30, 30], [DESK.w - 100, 30], [30, DESK.d - 100], [DESK.w - 100, DESK.d - 100]].forEach(function (p) {
    box(room, { x: DESK.x + p[0], y: DESK.y + p[1], w: 70, d: 70, z: FLOOR, h: -MAT - DESK.t - FLOOR, color: "var(--desk-leg)" });
  });
  box(room, { x: -40, y: -40, w: 1360, d: 960, z: -MAT, h: MAT, color: "var(--mat)", topCls: "mat-top", side: "var(--mat-edge)" });

  // An ergonomic office chair at the desk's front-right, pushed in and turned a
  // little: a tall curved mesh back with a lumbar pad and a headrest, and armrests.
  // With this camera only the top of its back and the armrests show.
  var seatZ = FLOOR + 300;
  var chair = el("span", "rbox chair", room, "left:560px;top:1080px;width:340px;height:320px;transform:rotateZ(28deg)");
  var cx = 170,
    cy = 150;
  for (var a = 0; a < 5; a++) {
    var deg = a * 72 + 18;
    var leg = el("span", "rbox", chair, "left:" + cx + "px;top:" + (cy - 10) + "px;width:180px;height:20px;transform-origin:0 50%;transform:translateZ(" + (FLOOR + 30) + "px) rotateZ(" + deg + "deg)");
    box(leg, { x: 0, y: 0, w: 180, d: 20, z: 0, h: 14, color: "var(--chair-leg)" });
    var rad = (deg * Math.PI) / 180;
    el("span", "caster", chair, "left:" + (cx + Math.cos(rad) * 176) + "px;top:" + (cy + Math.sin(rad) * 176) + "px;transform:translateZ(" + (FLOOR + 17) + "px) rotateX(-90deg)");
  }
  box(chair, { x: cx - 34, y: cy - 34, w: 68, d: 68, z: FLOOR + 28, h: 24, color: "var(--chair-leg)", cls: "round" });
  box(chair, { x: cx - 16, y: cy - 16, w: 32, d: 32, z: FLOOR + 52, h: seatZ - FLOOR - 80, color: "#9aa2a8" });
  box(chair, { x: 10, y: 0, w: 320, d: 290, z: seatZ - 32, h: 32, color: "var(--chair)", r: 30 });
  // armrests on their posts, either side of the seat
  [0, 300].forEach(function (x) {
    box(chair, { x: x + 4, y: 120, w: 22, d: 22, z: seatZ, h: 150, color: "var(--chair-leg)" });
    box(chair, { x: x - 6, y: 40, w: 42, d: 190, z: seatZ + 150, h: 18, color: "var(--chair-leg)", r: 10 });
  });
  // the back: slats on an arc, so it curves round whoever sits in it
  box(chair, { x: cx - 22, y: 272, w: 44, d: 26, z: seatZ - 20, h: 110, color: "var(--chair-leg)" });
  var BACK_H = 520;
  for (var s = -2; s <= 2; s++) {
    var slat = el("span", "rbox", chair, "left:" + (cx + s * 58 - 30) + "px;top:" + (286 - Math.abs(s) * Math.abs(s) * 9) + "px;width:60px;height:24px;transform:rotateZ(" + -s * 9 + "deg)");
    box(slat, { x: 0, y: 0, w: 60, d: 24, z: seatZ + 70, h: BACK_H - Math.abs(s) * 30, color: Math.abs(s) === 2 ? "var(--chair-leg)" : "var(--chair-mesh)", r: 6 });
  }
  // a lumbar pad standing proud of the mesh, and the headrest on its stem
  box(chair, { x: cx - 110, y: 268, w: 220, d: 14, z: seatZ + 150, h: 70, color: "var(--chair)", r: 12 });
  box(chair, { x: cx - 10, y: 292, w: 20, d: 14, z: seatZ + 70 + BACK_H, h: 40, color: "#9aa2a8" });
  box(chair, { x: cx - 105, y: 280, w: 210, d: 34, z: seatZ + 110 + BACK_H, h: 90, color: "var(--chair)", r: 22 });

  var mug = stage.querySelector(".thing.mug");
  if (mug) {
    mug.style.setProperty("--x", "900px");
    mug.style.setProperty("--y", "640px");
  }

  var NS = "http://www.w3.org/2000/svg";
  var cable = document.createElementNS(NS, "svg");
  cable.setAttribute("class", "cable");
  cable.setAttribute("viewBox", "0 0 500 500");
  cable.style.cssText = "left:-600px;top:-200px;width:500px;height:500px;transform:translateZ(0.6px)";
  cable.innerHTML = '<path d="M342 420 C 330 300, 190 260, 200 50" />';
  room.appendChild(cable);
  el("span", "cable-drop", room, "left:-404px;top:-152px;height:" + (-FLOOR - 70) + "px");
  el("span", "socket", room, "left:-440px;top:" + (BACK + 1) + "px;transform:translateZ(" + (FLOOR + 130) + "px) rotateX(-90deg)");

  // ---- the camera stands up, smaller, its lens towards the chair ---------------
  var camera = stage.querySelector(".thing.camera");
  if (camera) {
    camera.style.setProperty("--w", "170px");
    camera.style.setProperty("--h", "96px");
    camera.style.setProperty("--x", "160px");
    camera.style.setProperty("--y", "570px");
    camera.style.setProperty("--r", "-18deg");
    el("span", "cam-band", camera);
    var print = el("span", "cam-print", camera);
    print.textContent = "About me";
    print.setAttribute("aria-hidden", "true");
    var shutter = el("span", "cam-shutter", camera);
    for (var sh = 0; sh < 5; sh++) el("span", "slice", shutter, "inset:0;border-radius:50%;background:" + shade("#e0533f", 0.7 + sh / 20) + ";transform:translateZ(" + sh * 2 + "px)");
    var face = el("span", "camface", camera);
    [".film", ".body", ".finder", ".flashgun", ".lens", ".burst"].forEach(function (q) {
      var e = camera.querySelector(q);
      if (e) face.appendChild(e);
    });
  }

  // ---- objects: a face at its height, a body below it, a shadow on the mat -------
  var SPEC = {
    ledger: { h: 30, step: 2, kind: "book", page: "#efe7d3", cover: "var(--cloudbank)", r: "6px 12px 12px 6px" },
    agenda: { h: 24, step: 2, kind: "book", page: "#f3ecda", cover: "var(--nutreek)", r: "5px 12px 12px 5px" },
    camera: { h: 120, step: 3, kind: "solid", color: "#e2ddd2", r: "14px", ground: ".label" },
    envelope: { h: 4, step: 1, kind: "solid", color: "#ddd5c6", r: "4px" },
    mug: { h: 124, step: 3, kind: "mug", r: "50%", ground: ".label, .puddle" },
    jar: { h: 200, step: 8, kind: "jar", r: "50%" },
  };
  [].forEach.call(stage.querySelectorAll(".thing"), function (t) {
    var name = Object.keys(SPEC).filter(function (k) {
      return t.classList.contains(k);
    })[0];
    var sp = SPEC[name];
    if (!sp) return;
    t.style.setProperty("--h3", sp.h + "px");
    t.style.setProperty("--fr", sp.r);
    if (sp.ground)
      [].forEach.call(t.querySelectorAll(sp.ground), function (g) {
        g.classList.add("ground");
      });
    t.insertBefore(el("span", "shade", t), t.firstChild);
    var host = sp.kind === "mug" ? t.querySelector(".cup") : t;
    var n = Math.floor(sp.h / sp.step);
    for (var i = 1; i <= n; i++) {
      var k = 0.95 - 0.25 * (i / n); // darker towards the mat
      var s = el("span", "slice", null, "transform:translateZ(" + -i * sp.step + "px);border-radius:" + sp.r);
      if (sp.kind === "book") {
        var cover = i >= n - 1;
        s.style.inset = cover ? "0" : "2px 3px 2px 6px";
        s.style.background = cover ? sp.cover : shade(sp.page, i % 2 ? k : k - 0.06);
        if (cover) s.style.filter = "brightness(0.8)";
      } else if (sp.kind === "solid") {
        s.style.inset = "0";
        s.style.background = shade(sp.color, k);
      } else if (sp.kind === "mug") {
        s.style.borderColor = shade("#f4f1ea", k);
        if (i === n) s.style.background = shade("#f4f1ea", k);
      } else if (sp.kind === "jar" && i === n) s.classList.add("base");
      host.insertBefore(s, host.firstChild);
    }
    if (sp.kind === "book") el("span", "wall spine", t, "background:" + sp.cover + ";filter:brightness(0.85)");
    if (sp.kind === "mug") {
      for (var j = 8; j <= 34; j++) el("span", "handle", host, "transform:translateZ(" + -j * 3 + "px);border-color:" + shade("#f4f1ea", 0.9 - j / 90));
      // the mug says what it is, round its side
      wrap(host, '<span class="mug-print">Buy me<br />a coffee</span>', { r: 65.6, w: 170, h: 80, z: -18, at: 45, strip: 5 });
    }
    if (sp.kind === "jar") {
      [].forEach.call(t.querySelectorAll(".slip"), function (p, idx) {
        p.style.setProperty("--sz", 3 + idx * 3 + "px");
      });
      // Planora's label, stuck round the glass
      var tag = t.querySelector(".jar-tag");
      tag.classList.add("moved");
      wrap(t, '<span class="jar-label"><b>Planora</b><small>Ideas for the group.<br />In testing.</small></span>', { r: 75.6, w: 176, h: 76, z: -64, at: 45, strip: 4 });
    }
  });
  // the camera's lens stands proud of its face
  var lens = stage.querySelector(".camera .lens");
  if (lens)
    for (var l = 1; l <= 8; l++) el("span", "slice", lens, "inset:0;border-radius:50%;background:" + shade("#2a2a2a", 0.9 - l / 30) + ";transform:translateZ(" + -l * 2 + "px)");

  // loose things: copies of their own face stacked up, so the art runs down the sides
  var LOOSE = { pencil: 10, eraser: 12, coin: 4, clip: 2 };
  [].forEach.call(stage.querySelectorAll(".loose"), function (o) {
    var h =
      LOOSE[
        Object.keys(LOOSE).filter(function (k) {
          return o.classList.contains(k);
        })[0]
      ] || 2;
    var cs = getComputedStyle(o);
    var look = ["background", "clipPath", "borderRadius", "border", "boxShadow"].map(function (p) {
      return [p, cs[p]];
    });
    o.style.cssText += ";background:none;clip-path:none;border-color:transparent;box-shadow:none;filter:none;transform-style:preserve-3d";
    for (var i = 0; i <= h; i++) {
      var s = el("span", "slice", o, "inset:" + (o.classList.contains("clip") ? "-3px" : "0") + ";transform:translateZ(" + i + "px)");
      look.forEach(function (f) {
        s.style[f[0]] = f[1];
      });
      if (i < h) s.style.filter = "brightness(" + (0.7 + (0.2 * i) / h) + ")";
    }
  });

  // ---- the cat's toys get a body too ---------------------------------------------
  // Copies of the toy stacked up: straight for a bag, shrinking towards the top and
  // the bottom for a ball, and for the box, plain cardboard walls under its flaps.
  var TOY = { yarn: [36, "ball"], crinkle: [24, "ball"], catnip: [16, "ball"], box: [64, "box"], treats: [26, "flat"], bag: [34, "flat"], laser: [10, "flat"], feather: [4, "flat"] };
  function body(toy) {
    var kind = toy.getAttribute("data-toy");
    var spec = TOY[kind];
    if (!spec || toy.querySelector(".lid")) return;
    var h = spec[0];
    var lid = el("span", "lid", toy);
    while (toy.firstChild !== lid) lid.appendChild(toy.firstChild);
    lid.style.transform = "translateZ(" + (spec[1] === "ball" ? h / 2 : h) + "px)";
    var step = spec[1] === "box" ? 4 : 2;
    for (var z = 0; z < h; z += step) {
      var s = el("span", "slice", null, "transform:translateZ(" + z + "px)");
      if (spec[1] === "box") {
        var inner = toy.querySelector(".inner");
        s.style.cssText += ";left:" + inner.offsetLeft + "px;top:" + inner.offsetTop + "px;width:" + inner.offsetWidth + "px;height:" + inner.offsetHeight + "px;background:" + shade("#c99a62", 0.72 + (0.2 * z) / h);
      } else {
        s.style.inset = "0";
        s.innerHTML = lid.innerHTML;
        var f = spec[1] === "ball" ? Math.sqrt(Math.max(0.05, 1 - Math.pow((z - h / 2) / (h / 2), 2))) : 1;
        s.style.scale = f;
        s.style.filter = "brightness(" + (0.72 + (0.25 * z) / h) + ")";
      }
      s.setAttribute("aria-hidden", "true");
      toy.insertBefore(s, lid);
    }
  }
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      [].forEach.call(m.addedNodes, function (n) {
        if (n.nodeType === 1 && n.classList.contains("cat-toy")) requestAnimationFrame(function () {
          body(n);
        });
      });
    });
  }).observe(stage, { childList: true });

  // ---- words where they can be read -------------------------------------------------
  // The name and the note go up on the wall behind the desk; Social Contacts Sync's
  // cards are pinned large on the other wall; the yellow note is stuck on the side of
  // the computer. Pointing at an object brings out a paper tag with its name.
  // the name: a neon sign with the line about the work painted under it, or with
  // #board in the address, both on a felt letter board
  var tape = stage.querySelector(".home-tape");
  var board = location.hash === "#board";
  var sign = onWall("back", -430, board ? 640 : 660, board ? "letterboard" : "neon");
  sign.appendChild(tape);
  if (!board) {
    // a typeface drawn as one bent tube per stroke
    var font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Tilt+Neon&display=swap";
    document.head.appendChild(font);
    // With the lights off, pressing the sign switches it off and on again in
    // another colour, the way a tube flickers when it strikes.
    var NEON = ["#ff4fa0", "#3fd2ff", "#7dff6a", "#ffb43f", "#b77dff", "#ff5a4e"];
    var hue = 0;
    var tube = el("button", "neon-switch", sign);
    tube.type = "button";
    tube.setAttribute("aria-label", "Change the neon's colour");
    tube.addEventListener("click", function () {
      if (!document.documentElement.classList.contains("lights-off") || sign.classList.contains("striking")) return;
      sign.classList.add("striking");
      setTimeout(function () {
        hue = (hue + 1) % NEON.length;
        sign.style.setProperty("--neon", NEON[hue]);
      }, 420);
      setTimeout(function () {
        sign.classList.remove("striking");
      }, 1100);
    });
  }
  var intro = stage.querySelector(".intro");
  var words = intro.querySelector("p").textContent.replace(/\s+/g, " ").trim();
  var first = words.indexOf(". ") + 1;
  intro.innerHTML = '<p class="pst-text"><b></b> <span></span></p><span class="pst-bar" aria-hidden="true"></span>';
  intro.querySelector(".pst-text b").textContent = words.slice(0, first);
  intro.querySelector(".pst-text span").textContent = words.slice(first + 1);
  onWall("back", -360, board ? 330 : 340, "poster low").appendChild(intro);
  var cards = stage.querySelector(".thing.cards");
  if (cards) {
    cards.removeAttribute("data-cat");
    var pin = onWall("right", 0, 290, "pinned");
    pin.appendChild(cards);
    el("span", "tape-strip one", pin);
    el("span", "tape-strip two", pin);
  }

  // ---- the window, right of the name, above the jar -------------------------------
  // The sky follows the colour scheme; the roofs and trees outside are drawn anew on
  // every visit. Its sill carries the cat's cushion.
  var WIN = { along: 420, top: 660, w: 600, h: 380 };
  var win = el("div", "window", onWall("back", WIN.along, WIN.top, "window"));
  win.setAttribute("aria-hidden", "true");
  win.style.cssText = "width:" + WIN.w + "px;height:" + WIN.h + "px";
  win.innerHTML = '<span class="sky"></span>' + skyline(WIN.w, WIN.h) + '<span class="pane"></span><span class="mullion v"></span><span class="mullion h"></span>';
  box(room, { x: WIN.along - 30, y: BACK, w: WIN.w + 60, d: 78, z: WIN.top - WIN.h - 20, h: 20, color: "var(--sill)" });
  box(room, { x: WIN.along + 150, y: BACK + 6, w: 300, d: 64, z: WIN.top - WIN.h, h: 22, color: "var(--cushion)", r: 22 });
  function skyline(w, h) {
    var r = Math.random,
      d = "",
      x = -10;
    while (x < w + 10) {
      var bw = 40 + r() * 90;
      if (r() < 0.3) {
        // a tree: a trunk and a round crown
        var th = 60 + r() * 70,
          cr = 22 + r() * 26,
          tx = x + bw / 2;
        d += "M" + (tx - 4) + " " + h + "V" + (h - th) + "h8V" + h + "Z";
        d += "M" + (tx - cr) + " " + (h - th) + "a" + cr + " " + cr + " 0 1 0 " + 2 * cr + " 0a" + cr + " " + cr + " 0 1 0 " + -2 * cr + " 0Z";
      } else {
        // a house or a block: a gable or a flat roof, sometimes a chimney
        var top = h - (50 + r() * (r() < 0.25 ? 200 : 110));
        if (r() < 0.6) d += "M" + x + " " + h + "V" + top + "L" + (x + bw / 2) + " " + (top - 22 - r() * 26) + "L" + (x + bw) + " " + top + "V" + h + "Z";
        else d += "M" + x + " " + h + "V" + top + "H" + (x + bw) + "V" + h + "Z";
        if (r() < 0.35) d += "M" + (x + bw * 0.7) + " " + top + "v-34h10v34Z";
      }
      x += bw + r() * 18;
    }
    return '<svg class="skyline" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><path d="' + d + '" /></svg>';
  }

  // ---- the shelf on the right wall, with the plant (and room for the radio) ---------
  var SHELF = { y: 540, d: 260, z: 170 };
  box(room, { x: RIGHT - 84, y: SHELF.y, w: 84, d: SHELF.d, z: SHELF.z - 18, h: 18, color: "var(--sill)" });
  [SHELF.y + 30, SHELF.y + SHELF.d - 44].forEach(function (y) {
    box(room, { x: RIGHT - 60, y: y, w: 60, d: 14, z: SHELF.z - 78, h: 60, color: "var(--skirting)" });
  });
  var pot = el("span", "rbox plant", room, "left:" + (RIGHT - 70) + "px;top:" + (SHELF.y + SHELF.d - 84) + "px;width:56px;height:56px;transform:translateZ(" + SHELF.z + "px)");
  box(pot, { x: 0, y: 0, w: 56, d: 56, z: 0, h: 58, color: "var(--pot)", r: 8 });
  [45, -45].forEach(function (deg) {
    var leaves = el("span", "leaves", pot, "transform:translateZ(58px) rotateZ(" + deg + "deg) rotateX(-90deg)");
    leaves.innerHTML = '<svg viewBox="0 0 140 130"><path d="M70 130C66 90 40 70 8 66c18 22 34 40 62 64zM70 130C74 84 98 58 132 52c-14 28-32 52-62 78zM70 130C60 80 62 36 74 2c14 34 12 82-4 128zM70 130C52 98 30 92 14 100c20 10 36 18 56 30zM70 130c18-34 40-44 58-40-16 16-34 28-58 40z" /></svg>';
  });

  // ---- the site's navigation: neon tubes in a plexiglass frame, top of the right wall
  var nav = document.createElement("nav");
  nav.className = "plexi";
  nav.setAttribute("aria-label", "Site");
  // the same links as the bar the other pages keep; the bar itself goes
  var bar = document.querySelector("header.bar");
  if (bar) while (bar.firstElementChild) nav.appendChild(bar.firstElementChild);
  var navWall = onWall("right", 190, 430, "navwall");
  navWall.appendChild(nav);

  var letter = stage.querySelector(".thing.envelope");
  var top = document.querySelector(".pc .top");
  if (letter && top) {
    letter.removeAttribute("data-cat");
    var pile = el("span", "post", top);
    el("span", "post-card", pile).setAttribute("aria-hidden", "true");
    el("span", "post-env", pile).setAttribute("aria-hidden", "true");
    pile.appendChild(letter);
    var stamp = el("span", "stamp", letter);
    stamp.setAttribute("aria-hidden", "true");
    stamp.innerHTML = '<img src="cupid.svg" alt="" />';
  }
  var sticky = stage.querySelector(".thing.sticky");
  var side = document.querySelector(".pc .side");
  if (sticky && side) {
    sticky.removeAttribute("data-cat");
    el("span", "pc-note", side).appendChild(sticky);
  }

  var sw = el("button", "light-switch", onWall("back", -470, 300, "switch"));
  sw.type = "button";
  sw.setAttribute("aria-pressed", "true");
  sw.setAttribute("aria-label", "Room lights");
  sw.innerHTML = '<span class="rocker" aria-hidden="true"></span>';
  // a plate with some thickness, and a rocker that stands proud of it
  for (var ps = 1; ps <= 6; ps++) el("span", "plate-slice", sw, "transform:translateZ(" + -ps * 1.5 + "px);background:" + shade("#f1ece2", 0.92 - ps * 0.03));
  var rock = sw.querySelector(".rocker");
  for (var rs = 1; rs <= 4; rs++) el("span", "rocker-slice", rock, "transform:translateZ(" + -rs * 1.5 + "px);background:" + shade("#e8e2d6", 0.9 - rs * 0.04));
  var night = el("div", "night", document.querySelector(".mat"));
  night.setAttribute("aria-hidden", "true");
  sw.addEventListener("click", function () {
    var on = sw.getAttribute("aria-pressed") !== "true";
    sw.setAttribute("aria-pressed", String(on));
    document.documentElement.classList.toggle("lights-off", !on);
  });
  // in the dark, the tube and the switch's little light still show
  function glow() {
    var g = native.call(document.querySelector(".pc .glass"));
    var k = native.call(sw);
    var lit = document.querySelector(".pc").classList.contains("on");
    var n = native.call(sign.querySelector("h1"));
    var tint = getComputedStyle(sign).getPropertyValue("--neon").trim() || "#ff4fa0";
    var dim = sign.classList.contains("striking") ? 0.35 : 1;
    var neon = board ? "" : "radial-gradient(ellipse " + n.width * 0.75 + "px " + n.height * 1.7 + "px at " + (n.left + n.width / 2) + "px " + (n.top + n.height / 2) + "px, color-mix(in srgb, " + tint + " " + 45 * dim + "%, white), color-mix(in srgb, " + tint + " " + 50 * dim + "%, transparent) 55%, transparent 80%), ";
    night.style.background =
      neon +
      "radial-gradient(circle at " + (k.left + k.width / 2) + "px " + (k.top + k.height / 2) + "px, rgba(255,255,255,1) 0 14px, transparent 36px), " +
      (lit ? "radial-gradient(ellipse 280px 230px at " + (g.left + g.width / 2) + "px " + (g.top + g.height / 2) + "px, rgba(200,255,210,1), rgba(80,140,100,0.6) 40%, transparent 75%), " : "") +
      "rgb(40, 46, 80)";
    requestAnimationFrame(glow);
  }
  requestAnimationFrame(glow);

  var layer = el("div", "tags", fit);
  var tags = [];
  [].forEach.call(document.querySelectorAll(".thing"), function (t) {
    var lab = t.querySelector(".label");
    var name = (lab ? lab.firstChild : t.firstChild).textContent.trim();
    var small = t.querySelector("small");
    var anchor = el("span", "anchor", t);
    var tag = el("span", "tag", layer);
    tag.setAttribute("aria-hidden", "true");
    tag.innerHTML = "<b></b><small></small>";
    tag.querySelector("b").textContent = name;
    tag.querySelector("small").textContent = small ? small.textContent : "";
    tags.push({ a: anchor, tag: tag });
    // out while the object is pointed at or has the focus
    ["mouseenter", "focus"].forEach(function (ev) {
      t.addEventListener(ev, function () {
        tag.classList.add("on");
      });
    });
    ["mouseleave", "blur"].forEach(function (ev) {
      t.addEventListener(ev, function () {
        tag.classList.remove("on");
      });
    });
  });
  function place() {
    var f = native.call(fit);
    tags.forEach(function (o) {
      if (!o.tag.classList.contains("on")) return;
      var r = native.call(o.a);
      o.tag.style.transform = "translate(" + Math.round(r.left - f.left - 18) + "px," + Math.round(r.top - f.top - 86) + "px)";
    });
    requestAnimationFrame(place);
  }
  requestAnimationFrame(place);

  // ---- the cat --------------------------------------------------------------------
  // cat.js measures the bench with getBoundingClientRect, which now returns the
  // projected boxes. Inside the stage, answer as if the bench were still flat.
  function scale() {
    return parseFloat(getComputedStyle(fit).getPropertyValue("--s")) || 1;
  }
  function origin() {
    var f = native.call(fit);
    var s = scale();
    return { left: f.left + (f.width - 1280 * s) / 2, top: f.top, s: s };
  }
  function flat(e) {
    var x = 0,
      y = 0,
      n = e;
    while (n && n !== stage) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return n === stage ? { x: x, y: y } : null;
  }
  Element.prototype.getBoundingClientRect = function () {
    if (!document.documentElement.classList.contains("b3") || !(this instanceof HTMLElement) || !stage.contains(this) || this.closest(".cat")) return native.call(this);
    var o = origin();
    if (this === stage) return new DOMRect(o.left, o.top, 1280 * o.s, 880 * o.s);
    var p = flat(this);
    if (!p) return native.call(this);
    return new DOMRect(o.left + p.x * o.s, o.top + p.y * o.s, this.offsetWidth * o.s, this.offsetHeight * o.s);
  };
  // what the cat would be standing on at a point: the height of that thing's top
  function heightAt(x, y) {
    var top = 0;
    [].forEach.call(stage.querySelectorAll(".thing"), function (t) {
      if (t.classList.contains("mug") || t.classList.contains("jar") || t.closest(".on-wall")) return;
      var h = parseFloat(t.style.getPropertyValue("--h3")) || 0;
      if (x > t.offsetLeft && x < t.offsetLeft + t.offsetWidth && y > t.offsetTop && y < t.offsetTop + t.offsetHeight) top = Math.max(top, h);
    });
    return top;
  }
  function follow() {
    var cat = stage.querySelector(".cat");
    if (cat) {
      var x = parseFloat(cat.style.getPropertyValue("--cx")) || 0;
      var y = parseFloat(cat.style.getPropertyValue("--cy")) || 0;
      cat.style.setProperty("--cz", (cat.classList.contains("hiding") ? 0 : heightAt(x, y)) + 2 + "px");
    }
    requestAnimationFrame(follow);
  }
  requestAnimationFrame(follow);
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      [].forEach.call(m.addedNodes, function (n) {
        if (n.nodeType === 1 && /\b(scratches|print|fur)\b/.test(n.className)) n.style.setProperty("--mz", heightAt(n.offsetLeft + n.offsetWidth / 2, n.offsetTop + n.offsetHeight / 2) + 0.5 + "px");
      });
    });
  }).observe(stage, { childList: true });
})();
