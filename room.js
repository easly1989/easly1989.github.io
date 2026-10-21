/* The home as an isometric room. The mat lies on a desk against two walls, an office
   chair stands at the desk's front edge, and every object has its height. The home's
   head decides whether the room is shown (html.iso); this builds it from the bench's own
   markup before the first frame, and frames it to the window. */
(function () {
  "use strict";
  if (!document.documentElement.classList.contains("iso")) return;
  var stage = document.querySelector(".stage");
  var fit = document.querySelector(".fit");

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
  // Round things cost the frame rate most: their rings stay 6 px apart or more and their
  // label strips 12 px wide or more (see 'Measure what the room can draw at 60 fps').
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
  // the walls and the floor run well past the frame at every size the room shows at, up to
  // 2560 wide at a scale of 1.15
  var FAR = -3200, DEEP = 4200, WALL_H = 3000;
  el("span", "floor-plane", room, "left:" + FAR + "px;top:" + BACK + "px;width:" + (RIGHT - FAR) + "px;height:" + DEEP + "px;transform:translateZ(" + FLOOR + "px)");
  box(room, { x: FAR, y: BACK - 24, w: RIGHT - FAR + 24, d: 24, z: FLOOR, h: WALL_H, color: "var(--wall)" });
  box(room, { x: RIGHT, y: BACK - 24, w: 24, d: DEEP + 24, z: FLOOR, h: WALL_H, color: "var(--wall)" });
  box(room, { x: FAR, y: BACK, w: RIGHT - FAR, d: 8, z: FLOOR, h: 40, color: "var(--skirting)" });
  box(room, { x: RIGHT - 8, y: BACK, w: 8, d: DEEP, z: FLOOR, h: 40, color: "var(--skirting)" });
  box(room, { x: DESK.x, y: DESK.y, w: DESK.w, d: DESK.d, z: -MAT - DESK.t, h: DESK.t, color: "var(--desk)" });
  [[30, 30], [DESK.w - 100, 30], [30, DESK.d - 100], [DESK.w - 100, DESK.d - 100]].forEach(function (p) {
    box(room, { x: DESK.x + p[0], y: DESK.y + p[1], w: 70, d: 70, z: FLOOR, h: -MAT - DESK.t - FLOOR, color: "var(--desk-leg)", cls: "desk-leg" });
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

  var jar = stage.querySelector(".thing.jar");
  if (jar) jar.style.setProperty("--x", "930px");
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

  // ---- the camera: an old instant camera, its lens towards the chair --------------
  // Seen from the side it is a wedge: a black base the whole depth, with the slot the
  // print comes out of at its front; a tall white front plate carrying the lens, the
  // shutter button, the finder window and the light meter; behind the plate a black body
  // whose top slopes down to the back, with the eyepiece standing out of it. No maker's
  // name or marks: the base says what it opens.
  var camera = stage.querySelector(".thing.camera");
  if (camera) {
    camera.style.setProperty("--w", "160px");
    camera.style.setProperty("--h", "150px");
    camera.style.setProperty("--x", "160px");
    camera.style.setProperty("--y", "560px");
    camera.style.setProperty("--r", "12deg"); // its front nearly square to the reader, so "About me" reads
    var INK = "#262626";
    var base = box(camera, { x: 0, y: 0, w: 160, d: 150, z: -120, h: 34, color: INK, side: "#1f1f1f", cls: "pl-base" });
    base.querySelector("i.s").innerHTML = '<span class="pl-name">About me</span><span class="pl-slot"></span>';
    box(camera, { x: 6, y: 0, w: 148, d: 118, z: -86, h: 36, color: INK });
    // the sloping top, from the back of the body up to the front plate, and its two
    // triangular cheeks
    var rise = 44, run = 118;
    el("span", "pl-slope", camera, "left:6px;top:0;width:148px;height:" + Math.hypot(run, rise).toFixed(1) + "px;transform:translateZ(-50px) rotateX(" + ((Math.atan2(rise, run) * 180) / Math.PI).toFixed(2) + "deg)");
    [6, 154].forEach(function (x) {
      el("span", "pl-cheek", camera, "width:" + run + "px;height:" + rise + "px;transform:matrix3d(0,1,0,0,0,0,-1,0,-1,0,0,0," + x + ",0,-6,1)");
    });
    box(camera, { x: 58, y: -26, w: 44, d: 26, z: -70, h: 30, color: "#1b1b1b" });
    var front = box(camera, { x: 0, y: 118, w: 160, d: 32, z: -86, h: 86, color: "#efede6", side: "#f4f2ec", cls: "pl-front" });
    var face = front.querySelector("i.s");
    face.innerHTML = '<span class="pl-finder"></span><span class="pl-meter"></span><span class="pl-stripe"></span>';
    [".lens", ".burst"].forEach(function (q) {
      var e = camera.querySelector(q);
      if (e) face.appendChild(e);
    });
    var shutter = el("span", "pl-shutter", face);
    for (var sh = 0; sh < 5; sh++) el("span", "slice", shutter, "inset:0;border-radius:50%;background:" + shade("#e0533f", 0.7 + sh / 20) + ";transform:translateZ(" + sh * 2 + "px)");
    // built of boxes with gaps between them: one plane through its middle, facing the
    // camera, is the whole of it for the pointer (see hitPlane)
    el("span", "hit-plane", camera, "left:-20px;top:75px;width:200px;height:120px;transform:rotateZ(45deg) rotateX(-90deg)");
    // the print waits flat inside the base and comes out of its slot, towards the chair
    var out = el("span", "cam-out", camera);
    var film = camera.querySelector(".film");
    if (film) out.appendChild(film);
  }

  // ---- objects: a face at its height, a body below it, a shadow on the mat -------
  var SPEC = {
    ledger: { h: 30, step: 2, kind: "book", page: "#efe7d3", cover: "var(--cloudbank)", r: "6px 12px 12px 6px" },
    agenda: { h: 24, step: 2, kind: "book", page: "#f3ecda", cover: "var(--nutreek)", r: "5px 12px 12px 5px" },
    camera: { h: 120, step: 120, kind: "built", r: "8px", ground: ".label" }, // its boxes are drawn above
    envelope: { h: 4, step: 1, kind: "solid", color: "#ead3d9", r: "2px" },
    mug: { h: 124, step: 6, kind: "mug", r: "50%", ground: ".label, .puddle" },
    jar: { h: 200, step: 16, kind: "jar", r: "50%" },
  };
  // A round thing is rings of glass or china with a label wrapped round them, and the
  // pointer falls through the gaps between them: on and off it, the thing lifts and drops
  // and flickers. One upright plane through its middle, facing the camera as its label
  // does, is the whole of it for the pointer.
  function hitPlane(t, host, d, h) {
    var x = host === t ? 0 : host.offsetLeft, y = host === t ? 0 : host.offsetTop;
    var cx = x + host.offsetWidth / 2, cy = y + host.offsetHeight / 2;
    el("span", "hit-plane", t, "left:" + (cx - d / 2) + "px;top:" + cy + "px;width:" + d + "px;height:" + h + "px;transform:rotateZ(45deg) rotateX(-90deg)");
  }
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
      // the mug's side is a wall of its own (below): of its rings only the base is left
      if (sp.kind === "mug" && i < n) continue;
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
      // Its side is upright strips all the way round, not a stack of rings: rings show
      // their gaps, in stripes, as soon as the mug is turned, and it falls over.
      var WALL = 22,
        wr = host.offsetWidth / 2 - 2.5, // well inside the print round it, which is sorted in front
        ww = 2 * wr * Math.sin(Math.PI / WALL) + 0.8,
        wh = n * sp.step;
      for (var w = 0; w < WALL; w++) {
        var a = (w * 360) / WALL;
        var lit = 0.82 + 0.13 * Math.cos(((a - 135) * Math.PI) / 180);
        el("span", "mug-wall", host, "width:" + ww.toFixed(1) + "px;height:" + wh + "px;margin-left:" + (-ww / 2).toFixed(1) + "px;transform:rotateZ(" + a + "deg) translateY(" + wr + "px) rotateX(-90deg);background:linear-gradient(" + shade("#f4f1ea", lit) + ", " + shade("#f4f1ea", lit - 0.2) + ")");
      }
      // the handle the same way: its D drawn in upright strips, outside and in, under a ring
      // at the top and one at the bottom
      var hx = host.offsetWidth - 14,
        hy = host.offsetHeight / 2 - 15;
      [15, 6].forEach(function (r) {
        var pts = [[0, 15 - r]];
        for (var q = 0; q <= 8; q++) pts.push([29 + r * Math.cos(Math.PI * (q / 8 - 0.5)), 15 + r * Math.sin(Math.PI * (q / 8 - 0.5))]);
        pts.push([0, 15 + r]);
        for (var p = 0; p < pts.length - 1; p++) {
          var dx = pts[p + 1][0] - pts[p][0],
            dy = pts[p + 1][1] - pts[p][1],
            ang = (Math.atan2(dy, dx) * 180) / Math.PI;
          // lit as the wall is: the outside faces away from the D, the inside into it
          var hl = 0.82 + 0.13 * Math.cos(((ang + (r === 15 ? 180 : 0) - 135) * Math.PI) / 180);
          el("span", "mug-wall", host, "left:" + (hx + pts[p][0]).toFixed(1) + "px;top:" + (hy + pts[p][1]).toFixed(1) + "px;width:" + (Math.hypot(dx, dy) + 0.6).toFixed(1) + "px;height:78px;transform-origin:0 0;transform:translateZ(-24px) rotateZ(" + ang.toFixed(1) + "deg) rotateX(-90deg);background:linear-gradient(" + shade("#f4f1ea", hl) + ", " + shade("#f4f1ea", hl - 0.2) + ")");
        }
      });
      [8, 34].forEach(function (j) {
        el("span", "handle", host, "transform:translateZ(" + -j * 3 + "px);border-color:" + shade("#f4f1ea", 0.9 - j / 90));
      });
      // the mug says what it is, round its side
      wrap(host, '<span class="mug-print">Buy me<br />a coffee</span>', { r: 65.6, w: 170, h: 80, z: -18, at: 45, strip: 15 });
      hitPlane(t, host, 132, sp.h);
    }
    if (sp.kind === "jar") {
      [].forEach.call(t.querySelectorAll(".slip"), function (p, idx) {
        p.style.setProperty("--sz", 3 + idx * 3 + "px");
      });
      // Planora's label, stuck round the glass
      var tag = t.querySelector(".jar-tag");
      tag.classList.add("moved");
      wrap(t, '<span class="jar-label"><b>Planora</b><small>Ideas for the group.<br />In testing.</small></span>', { r: 75.6, w: 176, h: 76, z: -64, at: 45, strip: 12 });
      hitPlane(t, t, 152, sp.h);
      // tipping it over was the flat bench's trick: a jar of rings cannot lie down
      t.removeAttribute("data-cat");
      // one idea folded in half among the slips at the bottom: on the way to Planora it
      // comes up out of the jar and unfolds (morph.js)
      var at = el("span", "jar-idea-at", t);
      at.setAttribute("aria-hidden", "true");
      at.innerHTML =
        '<span class="jar-idea"><span class="fold a"><b>Planora</b></span>' +
        '<span class="fold b"><span class="front">An idea for the group</span><span class="back"></span></span></span>';
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

  // ---- measuring the room: a thing's corners carried through every transform -------
  // shortcut: rotations other than about z are read only from `transform`, which is all
  // the room uses; boxes are axis-aligned bounds, so a turned thing is judged a little big
  function triple(v, n) {
    return !v || v === "none" ? null : v.split(" ").map(parseFloat).concat([n, n, n]).slice(0, 3);
  }
  function localMatrix(n) {
    var cs = getComputedStyle(n);
    var o = cs.transformOrigin.split(" ").map(parseFloat);
    var m = new DOMMatrix().translate(n.offsetLeft, n.offsetTop).translate(o[0], o[1], o[2] || 0);
    var t = triple(cs.translate, 0);
    if (t) m = m.translate(t[0], t[1], t[2]);
    if (cs.rotate && cs.rotate !== "none") m = m.rotate(0, 0, parseFloat(cs.rotate.split(" ").pop()));
    var sc = triple(cs.scale, 1);
    if (sc) m = m.scale(sc[0], sc[1], sc[2]);
    if (cs.transform !== "none") m = m.multiply(new DOMMatrix(cs.transform));
    return m.translate(-o[0], -o[1], -(o[2] || 0));
  }
  function toStage(e) {
    var chain = [];
    for (var n = e; n && n !== stage; n = n.offsetParent) chain.unshift(n);
    var m = new DOMMatrix();
    chain.forEach(function (n) {
      m = m.multiply(localMatrix(n));
    });
    return m;
  }
  // the room-space box round an element and everything in it (z up from the mat)
  function bounds(root) {
    var b = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9, parts: [] };
    [root].concat([].slice.call(root.querySelectorAll("*"), 0, 600)).forEach(function (e) {
      // the blurred shadow on the mat is light, not body, and so is the flash's burst; the
      // camera's print waits inside it
      if (!(e instanceof HTMLElement) || !e.offsetWidth || /\b(shade|anchor|burst|cam-out|film)\b/.test(e.className)) return;
      if (getComputedStyle(e).visibility === "hidden") return;
      var m = toStage(e);
      // each part keeps its own box and footprint, so a shape with a notch (a box with
      // its flaps open) is not judged as if the notch were filled
      var part = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9, q: [] };
      [[0, 0], [e.offsetWidth, 0], [e.offsetWidth, e.offsetHeight], [0, e.offsetHeight]].forEach(function (c) {
        var p = m.transformPoint(new DOMPoint(c[0], c[1], 0));
        part.q.push([p.x, p.y]);
        [b, part].forEach(function (o) {
          o.x0 = Math.min(o.x0, p.x);
          o.x1 = Math.max(o.x1, p.x);
          o.y0 = Math.min(o.y0, p.y);
          o.y1 = Math.max(o.y1, p.y);
          o.z0 = Math.min(o.z0, p.z);
          o.z1 = Math.max(o.z1, p.z);
        });
      });
      b.parts.push(part);
    });
    return b;
  }
  function plansMeet(a, b, g) {
    return a.x0 < b.x1 - g && a.x1 > b.x0 + g && a.y0 < b.y1 - g && a.y1 > b.y0 + g;
  }
  function overlap(a, b) {
    var g = 1; // touching is fine
    if (!plansMeet(a, b, g) || !(a.z0 < b.z1 - g && a.z1 > b.z0 + g)) return false;
    // the boxes meet; ask part by part whether the footprints do, since a turned or
    // notched thing's box is bigger than it. Heights stay the whole thing's: a book or a
    // pencil is a stack of flat parts, and two flat parts never share a height
    return a.parts.some(function (p) {
      return plansMeet(p, b, g) && b.parts.some(function (q) {
        return plansMeet(p, q, g) && !apart(p.q, q.q, g);
      });
    });
  }
  // two convex footprints are apart when some edge of either separates them by more than g
  function apart(P, Q, g) {
    return [P, Q].some(function (poly) {
      return poly.some(function (u, i) {
        var v = poly[(i + 1) % poly.length];
        var nx = v[1] - u[1], ny = u[0] - v[0], len = Math.hypot(nx, ny);
        if (len < 1e-6) return false; // a face seen edge-on has a zero-length side
        var proj = function (s) {
          var lo = 1e9, hi = -1e9;
          s.forEach(function (q) {
            var d = (q[0] * nx + q[1] * ny) / len;
            lo = Math.min(lo, d);
            hi = Math.max(hi, d);
          });
          return [lo, hi];
        };
        var a = proj(P), b = proj(Q);
        return a[1] < b[0] + g || b[1] < a[0] + g;
      });
    });
  }
  // what nothing may go into: the computer, the project objects on the desk, the desk's
  // legs and the chair
  function obstacles() {
    return [].filter.call(stage.querySelectorAll(".pc, .desk-leg, .chair, .thing"), function (e) {
      return !(e.classList.contains("thing") && e.closest(".on-wall, .pc"));
    });
  }
  var DESK_TOP = { x0: DESK.x, y0: DESK.y, x1: DESK.x + DESK.w, y1: DESK.y + DESK.d };
  // what is wrong with a thing where it stands, against the boxes of everything else
  function faults(e, others, onFloor) {
    var b = bounds(e);
    var out = [];
    if (b.y0 < BACK) out.push("goes " + Math.round(BACK - b.y0) + " into the back wall");
    if (b.x1 > RIGHT) out.push("goes " + Math.round(b.x1 - RIGHT) + " into the right wall");
    if (!onFloor && (b.x0 < DESK_TOP.x0 || b.x1 > DESK_TOP.x1 || b.y0 < DESK_TOP.y0 || b.y1 > DESK_TOP.y1)) out.push("hangs off the desk");
    others.forEach(function (o) {
      if (o.el !== e && !o.el.contains(e) && overlap(b, o.b)) out.push("is inside " + o.name);
    });
    return out;
  }
  function named(e) {
    if (e.classList.contains("pc")) return "the computer";
    if (e.classList.contains("desk-leg")) return "a leg of the desk";
    if (e.classList.contains("chair")) return "the chair";
    var l = e.querySelector(".label");
    return (l && l.firstChild ? l.firstChild.textContent.trim() : e.getAttribute("aria-label") || e.className).replace(/\s+/g, " ");
  }

  // ---- where the loose things go, on every visit ------------------------------------
  // Anywhere on the desk where they go into nothing and are not hidden behind the computer,
  // or seen through the jar as if they were in it, or behind the mug.
  function setAt(e, p) {
    e.style.left = p.x + "px";
    e.style.top = p.y + "px";
    e.style.setProperty("--r", p.r + "deg");
  }
  function screenBox(e) {
    var r = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
    [e].concat([].slice.call(e.querySelectorAll("*"), 0, 600)).forEach(function (n) {
      [].forEach.call(n.getClientRects(), function (c) {
        r.l = Math.min(r.l, c.left);
        r.t = Math.min(r.t, c.top);
        r.r = Math.max(r.r, c.right);
        r.b = Math.max(r.b, c.bottom);
      });
    });
    return r;
  }
  // again: only what the words, once their fonts are in, now run into moves; the rest stays put
  function spread(again) {
    var fixed = obstacles().map(function (e) {
      return { el: e, b: bounds(e), name: named(e) };
    });
    var tall = [].map.call(stage.querySelectorAll(".pc, .thing.jar, .thing.mug"), screenBox);
    [].forEach.call(stage.querySelectorAll(".loose"), function (e) {
      if (again && !faults(e, fixed, false).length) return fixed.push({ el: e, b: bounds(e), name: named(e) });
      for (var tries = 0; tries < 200; tries++) {
        var x = DESK_TOP.x0 + 40 + Math.random() * (DESK_TOP.x1 - DESK_TOP.x0 - 80) - e.offsetWidth / 2;
        var y = DESK_TOP.y0 + 40 + Math.random() * (DESK_TOP.y1 - DESK_TOP.y0 - 80) - e.offsetHeight / 2;
        setAt(e, { x: Math.round(x), y: Math.round(y), r: Math.round(Math.random() * 80 - 40) });
        if (faults(e, fixed, false).length) continue;
        var sb = screenBox(e);
        var cx = (sb.l + sb.r) / 2,
          cy = (sb.t + sb.b) / 2;
        var behind = tall.some(function (t) {
          return cx > t.l && cx < t.r && cy > t.t && cy < t.b;
        });
        if (!behind) break;
      }
      if (tries === 200) console.warn("[room] no free place for " + named(e) + ": " + faults(e, fixed, false).join("; "));
      fixed.push({ el: e, b: bounds(e), name: named(e) });
    });
  }

  // ---- words where they can be read -------------------------------------------------
  // The name and the note go up on the wall behind the desk; Social Contacts Sync's
  // cards are pinned large on the other wall; the yellow note is stuck on the side of
  // the computer. Pointing at an object brings out a paper tag with its name.
  // the name: a neon sign (its typeface, Tilt Neon, comes with room.css), with the line
  // about the work painted under it
  var tape = stage.querySelector(".home-tape");
  var sign = onWall("back", -430, 660, "neon");
  sign.appendChild(tape);
  // Pressing the sign switches it off and on again in another colour, the way a tube
  // flickers when it strikes; under reduced motion the colour just changes.
  var NEON = ["#ff4fa0", "#3fd2ff", "#7dff6a", "#ffb43f", "#b77dff", "#ff5a4e"];
  var hue = 0;
  var struck = 0;
  var DARK = [[0.08, 0.14], [0.22, 0.46], [0.52, 0.62], [0.7, 0.78]]; // the parts of the strike the tube is out
  var still = matchMedia("(prefers-reduced-motion: reduce)");
  // over the whole name: the sign it hangs on has no size of its own
  var tube = el("button", "neon-switch", tape);
  tube.type = "button";
  tube.setAttribute("aria-label", "Change the neon's colour");
  tube.addEventListener("click", function () {
    if (sign.classList.contains("striking")) return;
    function next() {
      hue = (hue + 1) % NEON.length;
      sign.style.setProperty("--neon", NEON[hue]);
      glow();
    }
    if (still.matches) return next();
    sign.classList.add("striking");
    struck = performance.now();
    glow();
    // the light it throws goes out and back with the tube (the strike's keyframes, room.css)
    DARK.forEach(function (p) {
      setTimeout(glow, p[0] * 1100);
      setTimeout(glow, p[1] * 1100);
    });
    setTimeout(next, 420);
    setTimeout(function () {
      sign.classList.remove("striking");
      glow();
    }, 1100);
  });
  var intro = stage.querySelector(".intro");
  var words = intro.querySelector("p").textContent.replace(/\s+/g, " ").trim();
  var first = words.indexOf(". ") + 1;
  intro.innerHTML = '<p class="pst-text"><b></b> <span></span></p><span class="pst-bar" aria-hidden="true"></span>';
  intro.querySelector(".pst-text b").textContent = words.slice(0, first);
  intro.querySelector(".pst-text span").textContent = words.slice(first + 1);
  onWall("back", -360, 340, "poster low").appendChild(intro);
  var cards = stage.querySelector(".thing.cards");
  if (cards) {
    cards.removeAttribute("data-cat");
    var pin = onWall("right", 0, 250, "pinned");
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
  // its light on the desk, crossed by the mullions: the sun by day, the moon by night, from
  // high up (about 50 degrees), so the patch starts well out from the wall, where the ray
  // through the window's bottom edge lands, and runs out to the ray through its top
  var HIGH = 1.2; // tan of the sun's and the moon's height above the horizon
  var near = BACK + (WIN.top - WIN.h) / HIGH,
    far = BACK + WIN.top / HIGH;
  var beam = el("span", "window-light", room, "left:" + (WIN.along - 30) + "px;top:" + near + "px;width:" + (WIN.w + 60) + "px;height:" + (far - near) + "px;transform:translateZ(0.8px)");
  beam.setAttribute("aria-hidden", "true");
  // the cat's perch: a board hung on two chains from the top of the frame, deep enough to
  // sleep on, with a fleece on it
  var PERCH = { x: WIN.along + 120, w: 360, d: 190, z: WIN.top - WIN.h + 24 };
  box(room, { x: PERCH.x, y: BACK, w: PERCH.w, d: PERCH.d, z: PERCH.z - 14, h: 14, color: "var(--perch)", r: 4, cls: "perch" });
  box(room, { x: PERCH.x + 18, y: BACK + 12, w: PERCH.w - 36, d: PERCH.d - 26, z: PERCH.z, h: 26, color: "var(--fleece)", r: 34, topCls: "fleece", cls: "perch-fleece" });
  [PERCH.x + 10, PERCH.x + PERCH.w - 14].forEach(function (x) {
    // from the frame's top corner on the wall down to the board's front corner
    var dy = PERCH.d - 8,
      dz = PERCH.z - (WIN.top - 30);
    var len = Math.hypot(dy, dz);
    el("span", "chain", room, "left:" + x + "px;top:" + (BACK + 2) + "px;height:" + Math.round(len) + "px;transform:translateZ(" + (WIN.top - 30) + "px) rotateX(" + ((Math.atan2(dz, dy) * 180) / Math.PI).toFixed(2) + "deg)");
  });

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
  var SHELF = { y: 520, d: 700, z: 170, w: 112 }; // runs on past the edge of the frame
  box(room, { x: RIGHT - SHELF.w, y: SHELF.y, w: SHELF.w, d: SHELF.d, z: SHELF.z - 18, h: 18, color: "var(--sill)" });
  [SHELF.y + 40, SHELF.y + 330, SHELF.y + SHELF.d - 60].forEach(function (y) {
    box(room, { x: RIGHT - 60, y: y, w: 60, d: 14, z: SHELF.z - 78, h: 60, color: "var(--skirting)" });
  });
  var pot = el("span", "rbox plant", room, "left:" + (RIGHT - 80) + "px;top:" + (SHELF.y + 24) + "px;width:56px;height:56px;transform:translateZ(" + SHELF.z + "px)");
  box(pot, { x: 0, y: 0, w: 56, d: 56, z: 0, h: 58, color: "var(--pot)", r: 8, topCls: "pot-top" });
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
  var navWall = onWall("right", 110, 385, "navwall");
  navWall.appendChild(nav);
  // first in the room's order, so the keyboard reaches the links before the objects, as on every page
  room.insertBefore(navWall, room.firstChild);

  var letter = stage.querySelector(".thing.envelope");
  var top = document.querySelector(".pc .top");
  if (letter && top) {
    letter.removeAttribute("data-cat");
    var pile = el("span", "post", top);
    el("span", "post-card", pile).setAttribute("aria-hidden", "true");
    el("span", "post-env", pile).setAttribute("aria-hidden", "true");
    pile.appendChild(letter);
    // the same envelope as on Cupid's page, closed, at its real size and scaled down
    // evenly to lie on the computer: one turns into the other without changing shape
    letter.style.setProperty("--w", "736px");
    letter.style.setProperty("--h", "192px");
    var env = el("span", "env-face", letter);
    env.setAttribute("aria-hidden", "true");
    env.innerHTML =
      '<span class="env-pocket"></span><span class="env-flap"></span>' +
      '<span class="env-seal"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.3 1.7-2 3.1-3.3 5.3-3.3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg></span>' +
      '<span class="env-to">To the agency,<br />with the whole workflow inside</span>' +
      '<span class="env-stamp"><img src="cupid.svg" alt="" /></span>';
  }
  var sticky = stage.querySelector(".thing.sticky");
  var side = document.querySelector(".pc .side");
  if (sticky && side) {
    sticky.removeAttribute("data-cat");
    el("span", "pc-note", side).appendChild(sticky);
  }

  // ---- the photos the camera took ---------------------------------------------------
  // One place per photo (photos.js), in its order: on the back wall round the name and the
  // poster, never over their words nor in the window, or stuck on the computer's side round
  // the note. On the wall: along it and the height of the photo's top; on the computer: in
  // the note's own frame, which reads the right way up. Each is a link to About on itself,
  // shown only while it is out.
  var SNAP_SPOTS = [
    { along: -150, z: 860, r: -4 },
    { pc: [-92, 30], r: -6 },
    { along: 320, z: 452, r: 5 },
    { pc: [96, 168], r: 7 },
    { along: 380, z: 200, r: -6 },
    { along: 170, z: 90, r: 8 },
    { pc: [-58, 176], r: -4 },
  ];
  var snaps = {};
  if (window.PHOTOS)
    PHOTOS.all.forEach(function (p, i) {
      var at = SNAP_SPOTS[i];
      if (!at || (at.pc && !side)) return;
      var s;
      if (at.pc) {
        // laid out in the note's frame (see .pc-note), a hair off the case
        s = el("a", "snap on-pc", el("span", "pc-note snap-pc", side), "left:" + at.pc[0] + "px;top:" + at.pc[1] + "px;transform:translateZ(0.4px) rotate(" + at.r + "deg)");
      } else {
        // a hair in front of the wall, and of the poster it may overlap
        var w = onWall("back", at.along, at.z, "snap-wall");
        w.style.top = BACK + 5 + "px";
        s = el("a", "snap on-wall-print", w, "transform:rotate(" + at.r + "deg)");
      }
      s.href = "about.html";
      s.setAttribute("aria-label", "About me, with this photo: " + p.alt);
      s.dataset.photo = p.id;
      el("span", "snap-img", s, "background-image:url(" + p.thumb + ")");
      el("span", "snap-pen", s).innerHTML = PHOTOS.pen(p);
      snaps[p.id] = s;
    });
  function snapShow(id, on) {
    if (!snaps[id]) return;
    snaps[id].classList.toggle("out", on);
    var out = PHOTOS.out().filter(function (o) {
      return o !== id;
    });
    PHOTOS.setOut(on ? out.concat(id) : out);
  }
  // the photo About showed goes to its place, however the reader came back: with the morph,
  // which names it (morph.js), or without one
  var landed = null;
  function land() {
    var shown = window.PHOTOS && PHOTOS.shown();
    if (!shown) return;
    PHOTOS.setShown("");
    if (!snaps[shown.id]) return;
    snapShow(shown.id, true);
    landed = snaps[shown.id];
  }
  if (window.PHOTOS) {
    PHOTOS.out().forEach(function (id) {
      if (snaps[id]) snaps[id].classList.add("out");
    });
    land();
    // the back/forward cache brings the room back as it was left
    addEventListener("pageshow", function (e) {
      if (e.persisted) land();
    });
  }
  // a long caption is written smaller, so it stays on the print's edge
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    Object.keys(snaps).forEach(function (id) {
      var pen = snaps[id].querySelector(".snap-pen");
      var line = pen && pen.firstElementChild;
      if (!line) return;
      var space = pen.clientWidth,
        used = line.offsetWidth;
      if (used > space) line.style.fontSize = (parseFloat(line.style.fontSize) || 1) * (space / used) * 0.96 + "em";
    });
  });

  // ---- the room's light, and the night ------------------------------------------------
  // A switch on the back wall, remembered for the visit; the room starts with it on. With
  // it off, a multiply layer darkens the room, with holes where its own sources shine.
  var sw = el("button", "light-switch", onWall("back", -470, 300, "switch"));
  sw.type = "button";
  sw.setAttribute("aria-label", "Room light");
  sw.innerHTML = '<span class="rocker" aria-hidden="true"></span>';
  // a plate with some thickness, and a rocker that stands proud of it
  for (var ps = 1; ps <= 6; ps++) el("span", "plate-slice", sw, "transform:translateZ(" + -ps * 1.5 + "px);background:" + shade("#f1ece2", 0.92 - ps * 0.03));
  var rock = sw.querySelector(".rocker");
  for (var rs = 1; rs <= 4; rs++) el("span", "rocker-slice", rock, "transform:translateZ(" + -rs * 1.5 + "px);background:" + shade("#e8e2d6", 0.9 - rs * 0.04));
  var night = el("div", "night", document.querySelector(".mat"));
  night.setAttribute("aria-hidden", "true");
  function setLight(on) {
    sw.setAttribute("aria-pressed", String(on));
    document.documentElement.classList.toggle("lights-off", !on);
    try {
      sessionStorage.setItem("room-light", on ? "on" : "off");
    } catch (e) {}
    glow();
  }
  sw.addEventListener("click", function () {
    setLight(sw.getAttribute("aria-pressed") !== "true");
  });
  var pc = document.querySelector(".pc");
  // the screen lights the room only while the computer is on
  new MutationObserver(glow).observe(pc, { attributes: true, attributeFilter: ["class"] });
  addEventListener("focusin", glow);
  addEventListener("focusout", function () {
    setTimeout(glow);
  });
  var navTubes = [].slice.call(nav.querySelectorAll("a"));
  // drawn again when something it follows changes: the light, the frame, the neon, the screen
  function glow() {
    if (!document.documentElement.classList.contains("lights-off")) return;
    function at(r, w, h, dy) {
      return "radial-gradient(ellipse " + w + "px " + h + "px at " + (r.left + r.width / 2) + "px " + (r.top + r.height * (dy || 0.5)) + "px, ";
    }
    var n = sign.querySelector("h1").getBoundingClientRect();
    var tint = getComputedStyle(sign).getPropertyValue("--neon").trim() || NEON[0];
    var t = (performance.now() - struck) / 1100;
    var dim =
      sign.classList.contains("striking") &&
      DARK.some(function (p) {
        return t >= p[0] && t < p[1];
      })
        ? 0.15
        : 1;
    var w = win.getBoundingClientRect(),
      m = beam.getBoundingClientRect(),
      k = sw.getBoundingClientRect(),
      g = pc.querySelector(".glass").getBoundingClientRect();
    var holes = [
      at(n, n.width * 0.75, n.height * 1.7) + "color-mix(in srgb, " + tint + " " + 45 * dim + "%, white), color-mix(in srgb, " + tint + " " + 50 * dim + "%, transparent) 55%, transparent 80%)",
      at(w, w.width * 0.7, w.height * 0.75) + "rgba(150,170,235,1), transparent 80%)",
      at(m, m.width * 0.5, m.height * 0.55, 0.45) + "rgba(185,200,250,1), rgba(120,140,210,0.8) 45%, transparent 85%)",
      "radial-gradient(circle at " + (k.left + k.width / 2) + "px " + (k.top + k.height / 2) + "px, rgba(255,255,255,1) 0 14px, transparent 36px)",
    ];
    navTubes.forEach(function (a) {
      var r = a.getBoundingClientRect();
      if (!r.width) return;
      var c = getComputedStyle(a).color;
      // the box round a word on a slanted wall is tall: the glow keeps to the word
      holes.push(at(r, r.width * 0.62, r.height * 0.62) + "color-mix(in srgb, " + c + " 55%, white), color-mix(in srgb, " + c + " 35%, transparent) 55%, transparent 85%)");
    });
    // what has the keyboard's focus is lit, so its ring shows in the dark
    var f = document.activeElement;
    if (f && f !== document.body && fit.contains(f) && f.matches(":focus-visible")) {
      var fr = f.getBoundingClientRect();
      holes.push(at(fr, fr.width * 0.75 + 40, fr.height * 0.75 + 40) + "rgba(255,255,255,1) 60%, transparent 100%)");
    }
    // a faint green on the keyboard, the desk's edge and the wall, round the screen itself
    if (pc.classList.contains("on")) holes.push(at(g, g.width * 1.6, g.height * 1.9, 0.6) + "rgba(200,255,210,1), rgba(80,140,100,0.6) 40%, transparent 75%)");
    night.style.background = holes.join(", ") + ", rgb(40, 46, 80)";
  }
  var lightWas = null;
  try {
    lightWas = sessionStorage.getItem("room-light");
  } catch (e) {}

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
    var f = fit.getBoundingClientRect();
    tags.forEach(function (o) {
      if (!o.tag.classList.contains("on")) return;
      var r = o.a.getBoundingClientRect();
      o.tag.style.transform = "translate(" + Math.round(r.left - f.left - 18) + "px," + Math.round(r.top - f.top - 86) + "px)";
    });
    requestAnimationFrame(place);
  }
  requestAnimationFrame(place);

  // ---- framing: the room fits the window ------------------------------------------------
  // It scales until every link and button in it fits with a margin, and is centred on them
  // rather than on the whole room; it grows on big screens, up to 1.15 (see "Frame the room
  // to the window's width"). Below 0.7 its words no longer read, so the home shows the bench
  // instead. The box the room needs is kept, so that the head can make that call before the
  // next load draws anything.
  var MARGIN = ROOM_FIT.margin, // shared with the head, which decides on the next load
    MAX = 1.15,
    MIN = ROOM_FIT.min,
    BASE = { x: 179, y: 73 }; // the stage's own offsets (room.css)
  function usable() {
    return [].filter.call(fit.querySelectorAll("a[href], button, [tabindex]:not([tabindex='-1'])"), function (e) {
      if (e.closest("[hidden], [inert]")) return false;
      var cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.display === "none") return false;
      var r = e.getClientRects()[0];
      return r && r.width > 1 && r.height > 1;
    });
  }
  function union(list) {
    var u = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
    list.forEach(function (e) {
      var r = e.getClientRects()[0];
      u.l = Math.min(u.l, r.left);
      u.t = Math.min(u.t, r.top);
      u.r = Math.max(u.r, r.right);
      u.b = Math.max(u.b, r.bottom);
    });
    return u;
  }
  function setFrame(s, dx, dy) {
    stage.style.setProperty("--s", s);
    stage.style.setProperty("--iso-x", BASE.x + dx + "px");
    stage.style.setProperty("--iso-y", BASE.y + dy + "px");
  }
  function frame() {
    // the stage eases its transform: a box read straight after a change would be the old one
    stage.style.transition = "none";
    var f = fit.getBoundingClientRect();
    var A = { l: Math.max(0, f.left), t: Math.max(0, f.top), r: Math.min(innerWidth, f.right), b: Math.min(innerHeight, f.bottom) };
    // the name and the note have to be read, so they are framed with what can be used
    var list = usable().concat([tape, intro]);
    // the usable box at two scales gives the point the stage scales about
    setFrame(1, 0, 0);
    var U1 = union(list);
    setFrame(0.5, 0, 0);
    var U5 = union(list);
    var O = { x: U5.l + U5.r - (U1.l + U1.r) / 2, y: U5.t + U5.b - (U1.t + U1.b) / 2 };
    var box = { w: U1.r - U1.l, h: U1.b - U1.t, dw: innerWidth - (A.r - A.l), dh: innerHeight - (A.b - A.t) };
    var s = Math.min(MAX, (A.r - A.l - 2 * MARGIN) / box.w, (A.b - A.t - 2 * MARGIN) / box.h);
    try {
      localStorage.setItem("room-box", JSON.stringify(box));
    } catch (e) {}
    if (s < MIN && tooSmall()) return;
    s = Math.max(s, MIN);
    var c = { x: (U1.l + U1.r) / 2, y: (U1.t + U1.b) / 2 };
    setFrame(s, (A.l + A.r) / 2 - (O.x + s * (c.x - O.x)), (A.t + A.b) / 2 - (O.y + s * (c.y - O.y)));
    void stage.offsetWidth;
    stage.style.removeProperty("transition");
    glow();
  }
  // the head shows the bench at this size from now on; it reloads once, never in a loop
  function tooSmall() {
    // narrower than the room's layout: always the bench, which never comes back here
    if (!matchMedia("(min-width: 901px)").matches) {
      location.reload();
      return true;
    }
    try {
      var last = +sessionStorage.getItem("room-reload") || 0;
      if (Date.now() - last < 5000) return false;
      sessionStorage.setItem("room-reload", String(Date.now()));
    } catch (e) {
      return false;
    }
    location.reload();
    return true;
  }
  var pending = 0;
  addEventListener("resize", function () {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(frame);
  });
  spread();
  frame();
  setLight(lightWas !== "off");
  // again once the fonts are in, since words change the sizes: a small correction, not a new layout
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    spread(true);
    frame();
  });
  // what the room's other modules use of it: morph.js turns things to face the reader, and
  // takes a photo out of its place or names the one that has just landed in it
  window.ROOM = {
    stage: stage,
    localMatrix: localMatrix,
    snaps: {
      el: function (id) {
        return snaps[id];
      },
      show: snapShow,
      // the photo that has just come back from About, once
      landed: function () {
        var l = landed;
        landed = null;
        return l;
      },
    },
  };
})();
