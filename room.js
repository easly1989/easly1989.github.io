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
  // A side drawn darker, k of its colour, or a face dimmed to k: the room's painted light, which
  // the light pass (room-light.js) does instead when it runs, by setting --shading to 0
  function shade(color, k) {
    return "color-mix(in srgb, " + color + " calc(100% - " + Math.round((1 - k) * 100) + "% * var(--shading, 1)), black)";
  }
  function dim(k) {
    return "brightness(calc(1 - " + +(1 - k).toFixed(3) + " * var(--shading, 1)))";
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
  // The upright edge of something rounded, standing on z, w along x, d along y, h up (hb at the
  // back, y = 0, if its top slopes), its corners r round: short faces along its outline in one
  // piece, each as dark as the way it faces (a box's sides meet square, and show past a rounded
  // top); a sloping face is cut to the slope
  function rim(parent, o) {
    var hb = o.hb == null ? o.h : o.hb,
      at = function (y) {
        return hb + ((o.h - hb) * y) / o.d;
      };
    var pts = [];
    [[o.w - o.r, o.d - o.r, 90], [o.w - o.r, o.r, 0], [o.r, o.r, -90], [o.r, o.d - o.r, 180]].forEach(function (c) {
      for (var s = 0; s <= 3; s++) {
        var t = ((c[2] - s * 30) * Math.PI) / 180;
        pts.push([c[0] + o.r * Math.cos(t), c[1] + o.r * Math.sin(t)]);
      }
    });
    pts.forEach(function (p, i) {
      var q = pts[(i + 1) % pts.length],
        dx = q[0] - p[0],
        dy = q[1] - p[1],
        len = Math.hypot(dx, dy);
      if (len < 0.01) return;
      var k = 0.735 + 0.12 * (dy / len) + 0.09 * (dx / len), // (its outside is dx, dy turned a quarter: +y south, +x east)
        hp = at(p[1]),
        hq = at(q[1]),
        H = Math.max(hp, hq),
        cut = hp === hq ? "" : ";clip-path:polygon(0 " + (H - hp).toFixed(2) + "px, 100% " + (H - hq).toFixed(2) + "px, 100% 100%, 0 100%)";
      el("i", "rim", parent, "left:" + (o.x + p[0]) + "px;top:" + (o.y + p[1]) + "px;width:" + (len + 0.3) + "px;height:" + H + "px;background:" + shade(o.color, k) + ";transform:rotateZ(" + Math.atan2(dy, dx) + "rad) translateZ(" + (o.z + H) + "px) rotateX(-90deg)" + cut);
    });
  }
  // A face marked data-round is a slice of something round: the light pass (room-light.js)
  // shades it as the curve it is part of, round its parent's z through the parent's middle, or
  // through the point it names ("x y", px of the parent).
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
      s.dataset.round = "";
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
    pager: { h: 16, step: 2, kind: "solid", color: "var(--asf)", r: "11px" },
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
        if (cover) s.style.filter = dim(0.8);
      } else if (sp.kind === "solid") {
        s.style.inset = "0";
        s.style.background = shade(sp.color, k);
      } else if (sp.kind === "mug") {
        s.style.borderColor = shade("#f4f1ea", k);
        if (i === n) s.style.background = shade("#f4f1ea", k);
      } else if (sp.kind === "jar" && i === n) s.classList.add("base");
      host.insertBefore(s, host.firstChild);
    }
    if (sp.kind === "book") el("span", "wall spine", t, "background:" + sp.cover + ";filter:" + dim(0.85));
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
        el("span", "mug-wall", host, "width:" + ww.toFixed(1) + "px;height:" + wh + "px;margin-left:" + (-ww / 2).toFixed(1) + "px;transform:rotateZ(" + a + "deg) translateY(" + wr + "px) rotateX(-90deg);background:linear-gradient(" + shade("#f4f1ea", lit) + ", " + shade("#f4f1ea", lit - 0.2) + ")").dataset.round = "";
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
          var seg = el("span", "mug-wall", host, "left:" + (hx + pts[p][0]).toFixed(1) + "px;top:" + (hy + pts[p][1]).toFixed(1) + "px;width:" + (Math.hypot(dx, dy) + 0.6).toFixed(1) + "px;height:78px;transform-origin:0 0;transform:translateZ(-24px) rotateZ(" + ang.toFixed(1) + "deg) rotateX(-90deg);background:linear-gradient(" + shade("#f4f1ea", hl) + ", " + shade("#f4f1ea", hl - 0.2) + ")");
          if (p > 0 && p < pts.length - 2) seg.dataset.round = hx + 29 + " " + (hy + 15); // (the D's bend, not its straight arms)
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
      // and the light on the glass, left of the front (the label faces the reader at 45
      // degrees): a streak down it, above the label and below it, on the glass and not on the
      // paper; and a fainter one down its right edge
      [{ z: -12, h: 50 }, { z: -142, h: 46 }].forEach(function (p) {
        wrap(t, '<span class="jar-shine"></span>', { r: 76.4, w: 34, h: p.h, z: p.z, at: 98, strip: 7 });
      });
      wrap(t, '<span class="jar-shine faint"></span>', { r: 76.4, w: 28, h: 150, z: -24, at: 345, strip: 7 });
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
  // the pager, a little larger than on the bench so its name reads from here; its belt clip
  // runs down its side, from just over the mat to under its face
  var pager = stage.querySelector(".thing.pager");
  if (pager) {
    pager.style.setProperty("--w", "120px");
    pager.style.setProperty("--h", "78px");
    pager.style.setProperty("--x", "1130px");
    pager.style.setProperty("--y", "380px");
    box(pager, { x: -5, y: 16, w: 7, d: pager.offsetHeight - 32, z: -13, h: 10, color: "#2b2f2e" });
    [18, 36].forEach(function (y) {
      box(pager, { x: pager.offsetWidth - 3, y: y, w: 6, d: 12, z: -11, h: 7, color: "#0a524c" });
    });
  }
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
      if (i < h) s.style.filter = dim(0.7 + (0.2 * i) / h);
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
    // (its offset runs from inside its parent's border: the window's frame is one)
    var p = n.offsetParent;
    var m = new DOMMatrix().translate(n.offsetLeft + (p ? p.clientLeft : 0), n.offsetTop + (p ? p.clientTop : 0)).translate(o[0], o[1], o[2] || 0);
    var t = triple(cs.translate, 0);
    if (t) m = m.translate(t[0], t[1], t[2]);
    if (cs.rotate && cs.rotate !== "none") m = m.rotate(0, 0, parseFloat(cs.rotate.split(" ").pop()));
    var sc = triple(cs.scale, 1);
    if (sc) m = m.scale(sc[0], sc[1], sc[2]);
    if (cs.transform !== "none") m = m.multiply(new DOMMatrix(cs.transform));
    return m.translate(-o[0], -o[1], -(o[2] || 0));
  }
  // (memo, within one measuring pass: each element's matrix found so far, for those inside it
  // to start from, rather than every ancestor's again for each; the same steps, the same matrix)
  function toStage(e, memo) {
    var chain = [];
    for (var n = e; n && n !== stage && !(memo && memo.has(n)); n = n.offsetParent) chain.unshift(n);
    var m = memo && memo.has(n) ? memo.get(n) : new DOMMatrix();
    chain.forEach(function (n) {
      m = m.multiply(localMatrix(n));
      if (memo) memo.set(n, m);
    });
    return m;
  }
  // the room-space box round an element and everything in it (z up from the mat)
  var BODYLESS = /\b(shade|anchor|burst|cam-out|film|pc-mouse-cord|pg-msg)\b/;
  function bounds(root) {
    var b = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9, parts: [] },
      memo = new Map();
    [root].concat([].slice.call(root.querySelectorAll("*"), 0, 600)).forEach(function (e) {
      // the blurred shadow on the mat is light, not body, and so is the flash's burst; the
      // camera's print waits inside it; the pager's message runs on past its screen, clipped
      if (!(e instanceof HTMLElement) || !e.offsetWidth || BODYLESS.test(e.className)) return;
      if (e.closest(".pc-mouse")) return; // (its patch stands for it: mouse-patch)
      if (getComputedStyle(e).visibility === "hidden") return;
      var m = toStage(e, memo);
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
      // the mug's steam hides nothing, and it rises once the room is up
      if (n.closest(".steam")) return;
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
        // with some room to spare, so that nothing sits half behind a rim either
        var behind = tall.some(function (t) {
          return cx > t.l - 10 && cx < t.r + 10 && cy > t.t - 10 && cy < t.b + 10;
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
    strike(true);
  });
  // the tube flickers out and back, in its next colour when asked
  function strike(change) {
    if (sign.classList.contains("striking")) return;
    function next() {
      if (!change) return;
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
  }
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
  box(room, { x: WIN.along - 30, y: BACK, w: WIN.w + 60, d: 78, z: WIN.top - WIN.h - 20, h: 20, color: "var(--sill)", cls: "sill" });
  // its light on the desk, crossed by the mullions: the sun by day, the moon by night, from
  // high up (about 50 degrees), so the patch starts well out from the wall, where the ray
  // through the window's bottom edge lands, and runs out to the ray through its top
  var HIGH = 1.2; // tan of the sun's and the moon's height above the horizon
  var near = BACK + (WIN.top - WIN.h) / HIGH,
    far = BACK + WIN.top / HIGH;
  var beam = el("span", "window-light", room, "left:" + (WIN.along - 30) + "px;top:" + near + "px;width:" + (WIN.w + 60) + "px;height:" + (far - near) + "px;transform:translateZ(0.8px)");
  beam.setAttribute("aria-hidden", "true");
  // the cat's perch: a board hung on two chains from the wall over the frame, deep enough to
  // sleep on, with a fleece on it
  var PERCH = { x: WIN.along + 120, w: 360, d: 190, z: WIN.top - WIN.h + 24 };
  box(room, { x: PERCH.x, y: BACK, w: PERCH.w, d: PERCH.d, z: PERCH.z - 14, h: 14, color: "var(--perch)", r: 4, cls: "perch" });
  box(room, { x: PERCH.x + 18, y: BACK + 12, w: PERCH.w - 36, d: PERCH.d - 26, z: PERCH.z, h: 26, color: "var(--fleece)", r: 34, topCls: "fleece", cls: "perch-fleece" });
  [PERCH.x + 10, PERCH.x + PERCH.w - 14].forEach(function (x) {
    // from the wall just over the frame down to the board's front corner
    var top = WIN.top + 16,
      dy = PERCH.d - 8,
      dz = PERCH.z - top;
    var len = Math.hypot(dy, dz);
    el("span", "chain", room, "left:" + x + "px;top:" + (BACK + 2) + "px;height:" + Math.round(len) + "px;transform:translateZ(" + top + "px) rotateX(" + ((Math.atan2(dz, dy) * 180) / Math.PI).toFixed(2) + "deg)");
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
  box(room, { x: RIGHT - SHELF.w, y: SHELF.y, w: SHELF.w, d: SHELF.d, z: SHELF.z - 18, h: 18, color: "var(--sill)", cls: "wall-shelf" });
  [SHELF.y + 40, SHELF.y + 330, SHELF.y + SHELF.d - 60].forEach(function (y) {
    box(room, { x: RIGHT - 60, y: y, w: 60, d: 14, z: SHELF.z - 78, h: 60, color: "var(--skirting)", cls: "shelf-bracket" });
  });
  var pot = el("span", "rbox plant", room, "left:" + (RIGHT - 80) + "px;top:" + (SHELF.y + 10) + "px;width:56px;height:56px;transform:translateZ(" + SHELF.z + "px)");
  box(pot, { x: 0, y: 0, w: 56, d: 56, z: 0, h: 58, color: "var(--pot)", r: 8, topCls: "pot-top" });
  [45, -45].forEach(function (deg) {
    var leaves = el("span", "leaves", pot, "transform:translateZ(58px) rotateZ(" + deg + "deg) rotateX(-90deg)");
    leaves.innerHTML = '<svg viewBox="0 0 140 130"><path d="M70 130C66 90 40 70 8 66c18 22 34 40 62 64zM70 130C74 84 98 58 132 52c-14 28-32 52-62 78zM70 130C60 80 62 36 74 2c14 34 12 82-4 128zM70 130C52 98 30 92 14 100c20 10 36 18 56 30zM70 130c18-34 40-44 58-40-16 16-34 28-58 40z" /></svg>';
  });

  // ---- the radio at the shelf's far end, partly out of the frame -----------------------
  // Room between it and the plant's leaves for the cat to land in: about 400 px, he takes 370
  // landing. It plays radio.js's stations, which carry on from page to page; here it is its
  // knobs, its dial and its projector. Between stations, the hiss. Near enough the frame's
  // edge that what it projects shows whole at every size.
  var RAD = { x: RIGHT - 96, y: SHELF.y + SHELF.d - 220, w: 84, d: 210, z: SHELF.z, h: 120 };
  var radio = box(room, { x: RAD.x, y: RAD.y, w: RAD.w, d: RAD.d, z: RAD.z, h: RAD.h, color: "var(--radio)", west: "var(--radio)", r: 12, cls: "radio" });
  radio.querySelector("i.w").innerHTML =
    '<span class="radio-face"><span class="grille" aria-hidden="true"></span><span class="dial" aria-hidden="true"><span class="needle"></span></span>' +
    '<span class="led" aria-hidden="true"></span><button type="button" class="knob power" aria-pressed="false" aria-label="Radio"></button>' +
    '<button type="button" class="knob tune" aria-label="Next station"></button></span>';
  [].forEach.call(radio.querySelectorAll("i:not(.w)"), function (f) {
    f.setAttribute("aria-hidden", "true");
  });
  var face = radio.querySelector(".radio-face");
  // each knob stands proud of the face: its cap, and its side in a few rings behind it
  [].forEach.call(face.querySelectorAll(".knob"), function (k) {
    for (var ks = 1; ks <= 5; ks++) el("span", "knob-side", k, "transform:translateZ(" + -ks * 1.6 + "px);background:" + shade("#3b3027", 0.95 - ks * 0.08)).dataset.round = "";
  });
  var power = face.querySelector(".power");
  var dial = face.querySelector(".dial");
  // what is on air, and by whom, for a screen reader whether the projector shows it or not
  var onAir = el("span", "vh", face);
  onAir.setAttribute("aria-live", "polite");
  // A little projector on top of the radio, a wedge in its colour, taller on the room's side,
  // its lens in the face that slopes towards the wall. It throws the track and its author up
  // onto the wall behind, centred over its lens, over a wave that moves with the music, along
  // a beam of light. Faint by day, bright at night; clicking it caps the lens, for the visit.
  // It is turned towards the back wall (turn, degrees) on a toothed wheel, as if it could be
  // aimed (it cannot), and throws the words further back (shift, px), so that they show whole
  // by the frame's edge.
  var PJ = { x: RAD.x + 16, y: RAD.y + 10, w: 52, d: 60, hi: 32, lo: 14, turn: 45, shift: 100, wheel: 8, r: 42 };
  var wheel = el("span", "pj-wheel", room, "left:" + (PJ.x + PJ.w / 2 - PJ.r) + "px;top:" + (PJ.y + PJ.d / 2 - PJ.r) + "px;width:" + 2 * PJ.r + "px;height:" + 2 * PJ.r + "px;transform:translateZ(" + (RAD.z + RAD.h + PJ.wheel) + "px)");
  wheel.setAttribute("aria-hidden", "true");
  // its side, in a few rings under its top, as the knobs' are
  for (var ws = 1; ws <= 5; ws++) el("span", "pj-wheel-side", wheel, "transform:translateZ(" + -ws * 1.6 + "px);filter:" + dim(0.8 - ws * 0.07)).dataset.round = "";
  var proj = el("span", "projector", room, "left:" + PJ.x + "px;top:" + PJ.y + "px;width:" + PJ.w + "px;height:" + PJ.d + "px;transform:translateZ(" + (RAD.z + RAD.h + PJ.wheel) + "px) rotateZ(" + -PJ.turn + "deg)");
  // a face w by h whose x runs along u and y along v, from o (unit vectors, in the case's frame)
  function pjFace(cls, w, h, u, v, o, css) {
    var n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    var m = u.concat(0, v, 0, n, 0, o, 1).map(function (k) {
      return +k.toFixed(4);
    });
    return el("span", "pj-face " + cls, proj, "width:" + w + "px;height:" + h + "px;transform:matrix3d(" + m.join(",") + ")" + (css || ""));
  }
  var slope = Math.hypot(PJ.w, PJ.hi - PJ.lo);
  var down = [0, 0, -1];
  var cut = ";clip-path:polygon(0 0, " + PJ.w + "px " + (PJ.hi - PJ.lo) + "px, " + PJ.w + "px " + PJ.hi + "px, 0 " + PJ.hi + "px)";
  pjFace("pj-n", PJ.w, PJ.hi, [1, 0, 0], down, [0, 0, PJ.hi], cut);
  pjFace("pj-e", PJ.d, PJ.lo, [0, 1, 0], down, [PJ.w, 0, PJ.lo]);
  pjFace("pj-w", PJ.d, PJ.hi, [0, 1, 0], down, [0, 0, PJ.hi]);
  pjFace("pj-s", PJ.w, PJ.hi, [1, 0, 0], down, [0, PJ.d, PJ.hi], cut);
  var lensFace = pjFace("pj-top", PJ.d, slope, [0, 1, 0], [PJ.w / slope, 0, (PJ.lo - PJ.hi) / slope], [0, 0, PJ.hi]);
  el("span", "proj-lens", lensFace, "left:" + (PJ.d / 2 - 15) + "px;top:" + (slope / 2 - 15) + "px");
  // the whole of it, for the pointer: one upright plane through its middle, facing the camera
  var projBtn = el("button", "proj-hit", proj, "transform:translateZ(" + PJ.hi + "px) rotateZ(45deg) rotateX(-90deg)");
  projBtn.type = "button";
  projBtn.setAttribute("aria-label", "Projector");
  // the lens: where the beam starts, and what the words are centred over
  var LAMP = { x: PJ.x + PJ.w / 2, y: PJ.y + PJ.d / 2, z: RAD.z + RAD.h + PJ.wheel + (PJ.hi + PJ.lo) / 2 };
  var PROJ = { w: 260, h: 140, z: LAMP.z + 230 };
  PROJ.along = LAMP.y - PROJ.w / 2 - PJ.shift;
  var cast = el("div", "projection", onWall("right", PROJ.along, PROJ.z, "projected"), "width:" + PROJ.w + "px;height:" + PROJ.h + "px");
  // the beam, in the upright plane through the lamp: from the lamp out to the words' edges
  var beamH = PROJ.z - LAMP.z,
    apex = PROJ.w / 2 + PJ.shift;
  // (its shape cut out, and blurred round it, so its edges are soft)
  var ray = el("span", "proj-beam", room, "left:" + LAMP.x + "px;top:" + PROJ.along + "px;width:" + (PROJ.w + PJ.shift) + "px;height:" + beamH + "px;transform:translateZ(" + PROJ.z + "px) rotateZ(90deg) rotateX(-90deg)");
  ray.setAttribute("aria-hidden", "true");
  el("span", "proj-beam-shape", el("span", "proj-beam-in", ray), "clip-path:polygon(" + (apex - 6) + "px " + beamH + "px, " + (apex + 6) + "px " + beamH + "px, " + PROJ.w + "px " + PROJ.h + "px, " + PROJ.w + "px 0, 0 0, 0 " + PROJ.h + "px)");
  cast.setAttribute("aria-hidden", "true");
  cast.innerHTML = '<b></b><small></small><canvas class="wave" width="220" height="44"></canvas>';
  var waveC = cast.querySelector("canvas"),
    waveX = waveC.getContext("2d");
  var projOpen = true;
  try {
    projOpen = sessionStorage.getItem("radio-projector") !== "off";
  } catch (e) {}
  // The wave, drawn every frame while it shows: a soft wave that swells with the music's
  // loudness, measured against the loudest of the last few seconds so every track fills it.
  // Still, at mid height, under reduced motion or before the music can be read.
  var waving = 0,
    loud = 0.02,
    amp = 0.5,
    phase = 0;
  function drawWave() {
    waving = 0;
    var bins = !still.matches && window.RADIO && RADIO.wave();
    if (bins) {
      var sq = 0;
      for (var k = 0; k < bins.length; k++) sq += Math.pow((bins[k] - 128) / 128, 2);
      var rms = Math.sqrt(sq / bins.length);
      loud = Math.max(rms, loud * 0.995, 0.01);
      amp = amp * 0.6 + (rms / loud) * 0.4;
      phase += 0.12;
    }
    var W = waveC.width,
      H = waveC.height,
      N = 80;
    waveX.clearRect(0, 0, W, H);
    waveX.lineWidth = 3;
    waveX.lineJoin = waveX.lineCap = "round";
    waveX.strokeStyle = "rgba(255, 240, 214, 0.95)";
    waveX.beginPath();
    for (var i = 0; i <= N; i++) {
      var f = i / N;
      // two waves, tapering to nothing at the ends
      var v = (0.7 * Math.sin(f * Math.PI * 6 + phase) + 0.3 * Math.sin(f * Math.PI * 14 - phase * 1.7)) * Math.sin(f * Math.PI);
      var y = H / 2 - v * (0.15 + 0.85 * Math.min(1, amp)) * (H / 2 - 4);
      if (i) waveX.lineTo(f * W, y);
      else waveX.moveTo(0, y);
    }
    waveX.stroke();
    if (cast.classList.contains("lit") && !still.matches) waving = requestAnimationFrame(drawWave);
  }
  still.addEventListener("change", function () {
    if (!waving) drawWave();
  });
  // its halogen lamp, while it plays: the dial shines forward, never on the wall behind it.
  // A halo standing just in front of its face, turned to the camera, and a pool where the
  // light lands, on the desk in front of and below the shelf.
  var lamp = el("span", "radio-lamp", room, "left:" + (RAD.x - 40 - 150) + "px;top:" + (RAD.y + RAD.d / 2) + "px;width:300px;height:240px;transform:translateZ(" + (RAD.z + RAD.h / 2 + 120) + "px) rotateZ(45deg) rotateX(-90deg)");
  lamp.setAttribute("aria-hidden", "true");
  var pool = el("span", "radio-pool", room, "left:" + (RAD.x - 300) + "px;top:" + (RAD.y - 90) + "px;width:" + (DESK.x + DESK.w - (RAD.x - 300)) + "px;height:" + (RAD.d + 180) + "px;transform:translateZ(0.6px)");
  pool.setAttribute("aria-hidden", "true");
  function showRadio(st) {
    power.setAttribute("aria-pressed", String(!!st.on));
    face.classList.toggle("on", !!st.on);
    [lamp, pool].forEach(function (l) {
      l.classList.toggle("lit", !!st.on);
    });
    face.style.setProperty("--st", RADIO.stations > 1 ? st.station / (RADIO.stations - 1) : 0.5);
    var tr = RADIO.track();
    onAir.textContent = st.on ? "On the radio: " + tr.title + ", by " + tr.author : "";
    cast.querySelector("b").textContent = tr.title;
    cast.querySelector("small").textContent = "by " + tr.author;
    projBtn.setAttribute("aria-pressed", String(projOpen));
    proj.classList.toggle("open", projOpen);
    proj.classList.toggle("lit", projOpen && !!st.on);
    cast.classList.toggle("lit", projOpen && !!st.on);
    ray.classList.toggle("lit", projOpen && !!st.on);
    if (!waving) drawWave();
    glow();
  }
  if (window.RADIO) {
    RADIO.onChange(showRadio);
    power.addEventListener("click", function () {
      if (window.CRT) CRT.clack();
      var on = !RADIO.state().on;
      if (on && window.CRT) CRT.snow(0.35);
      RADIO.power(on);
    });
    projBtn.addEventListener("click", function () {
      if (window.CRT) CRT.clack();
      projOpen = !projOpen;
      try {
        sessionStorage.setItem("radio-projector", projOpen ? "on" : "off");
      } catch (e) {}
      showRadio(RADIO.state());
    });
    face.querySelector(".tune").addEventListener("click", function () {
      if (window.CRT) CRT.clack();
      face.style.setProperty("--turn", (parseFloat(face.style.getPropertyValue("--turn")) || 0) + 60 + "deg");
      if (RADIO.state().on && window.CRT) CRT.snow(0.35);
      RADIO.next();
    });
  }

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
  // the keyboard's keys stand up off it, so they catch the light and throw their own shadows:
  // four rows of sixteen on the pitch the flat pattern on the bench draws, and the spacebar
  var kb = document.querySelector(".pc .kb");
  if (kb) {
    for (var row = 0; row < 4; row++)
      for (var col = 0; col < 16; col++) box(kb, { x: 6 + col * 5.5, y: 4 + row * 5, w: 4, d: 4, z: 0, h: 1.4, color: "#efe9dc" });
    box(kb, { x: 30, y: 26, w: 40, d: 4, z: 0, h: 1.4, color: "#efe9dc" });
    // and its edge runs round its rounded corners in one piece (the bench's front and side
    // meet square and leave the far end open)
    rim(kb.parentNode, { x: kb.offsetLeft, y: kb.offsetTop, w: kb.offsetWidth, d: kb.offsetHeight, z: 0, h: 2.5, hb: 5.5, r: 3, color: "#c9bfa4" });
  }
  // The mouse, an old one with a ball under it, right of the keyboard, its cord running back to
  // the computer: Willy's to knock about (willy-life.js, ROOM.mouse), in the computer's own px.
  // It is no obstacle itself, but the patch it can be knocked about in is, so he never walks
  // through it; it moves from where it was put by up to reach px, and turns up to 45deg. Here
  // it is only where it is, its nose at the top; room-mouse.js draws it there.
  var pcMouse = null;
  if (kb) {
    var pcBox = kb.parentNode,
      MS = { x: 112, y: 90, w: 17, d: 22, h: 7, reach: 8 };
    el("span", "mouse-patch", pcBox, "left:" + (MS.x - MS.reach) + "px;top:" + (MS.y - MS.reach) + "px;width:" + (MS.w + 2 * MS.reach) + "px;height:" + (MS.d + 2 * MS.reach) + "px;transform:translateZ(" + MS.h + "px)");
    var cord = el("span", "pc-mouse-cord", pcBox, "left:0;top:0;width:150px;height:150px;transform:translateZ(0.3px)");
    cord.setAttribute("aria-hidden", "true");
    cord.innerHTML = '<svg viewBox="0 0 150 150"><path /></svg>';
    var mouse = el("span", "pc-mouse", pcBox, "left:" + MS.x + "px;top:" + MS.y + "px;width:" + MS.w + "px;height:" + MS.d + "px");
    mouse.setAttribute("aria-hidden", "true");
    var shove = { x: 0, y: 0, a: 0 };
    // the cord, from the mouse's nose round behind the keyboard to the computer's side, from
    // where the mouse is now, part way along its slide (room-mouse.js lays it each frame)
    var lay = function () {
      var cs = getComputedStyle(mouse),
        t = triple(cs.translate, 0) || [0, 0],
        r = ((parseFloat(cs.rotate) || 0) * Math.PI) / 180,
        sx = MS.x + MS.w / 2 + t[0] + (MS.d / 2) * Math.sin(r),
        sy = MS.y + MS.d / 2 + t[1] - (MS.d / 2) * Math.cos(r);
      cord.querySelector("path").setAttribute("d", "M" + sx.toFixed(1) + " " + sy.toFixed(1) + "C" + (sx + 10 * Math.sin(r)).toFixed(1) + " " + (sy - 10 * Math.cos(r)).toFixed(1) + " 112 52 92 36");
    };
    lay();
    pcMouse = {
      lay: lay,
      // where it is in the room: the middle of its top
      at: function () {
        var p = toStage(mouse).transformPoint(new DOMPoint(MS.w / 2, MS.d / 2, MS.h));
        return [p.x, p.y, p.z];
      },
      // knocked along heading (deg, as Willy's): it slides a little that way and turns
      knock: function (heading) {
        var r = (heading * Math.PI) / 180,
          inv = toStage(pcBox).inverse(),
          p = pcMouse.at(),
          a = inv.transformPoint(new DOMPoint(p[0], p[1], 0)),
          b = inv.transformPoint(new DOMPoint(p[0] + Math.cos(r) * 100, p[1] - Math.sin(r) * 100, 0)),
          len = Math.hypot(b.x - a.x, b.y - a.y) || 1,
          step = 5 + Math.random() * 6,
          x = shove.x + ((b.x - a.x) / len) * step,
          y = shove.y + ((b.y - a.y) / len) * step,
          far = Math.hypot(x, y) / MS.reach;
        shove.x = far > 1 ? x / far : x;
        shove.y = far > 1 ? y / far : y;
        shove.a = Math.max(-45, Math.min(45, shove.a + (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 20)));
        mouse.style.translate = shove.x.toFixed(1) + "px " + shove.y.toFixed(1) + "px";
        mouse.style.rotate = shove.a.toFixed(1) + "deg";
        lay(); // (at once where it has nothing to slide: under reduced motion)
      },
    };
  }
  // a broken computer smokes out of the vents on that same side
  var fumes = document.querySelector(".fumes");
  if (fumes && side) side.appendChild(fumes);
  // and while it runs, warm air comes out of them, barely to be seen; now and then, at no set
  // time and never as hard twice, a gust of it lifts the note (room.css, .gust)
  if (side) el("span", "draught", side).innerHTML = "<i></i><i></i><i></i><i></i>";
  var pcCase = document.querySelector(".pc");
  if (pcCase && sticky && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    (function gust() {
      setTimeout(function () {
        if (pcCase.classList.contains("on") && !document.hidden) {
          pcCase.style.setProperty("--k", (0.45 + Math.random() * 0.55).toFixed(2));
          pcCase.classList.add("gust");
        }
        gust();
      }, 9000 + Math.random() * 21000);
    })();
    // done, or cut short by the computer going off
    ["animationend", "animationcancel"].forEach(function (type) {
      sticky.addEventListener(type, function (e) {
        if (e.animationName === "gust") pcCase.classList.remove("gust");
      });
    });
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
  // what of the night is not a hole in it (glow()): the window's light on the desk in its own
  // shape, crossed by the shadows of the mullions on whatever it falls on, and the screen's,
  // which flickers as an old CRT's does
  night.innerHTML =
    '<svg class="night-beam"><defs><linearGradient id="night-beam-fall" gradientUnits="userSpaceOnUse">' +
    '<stop offset="0" stop-color="rgb(185,200,250)" /><stop offset="0.55" stop-color="rgb(150,170,235)" stop-opacity="0.85" />' +
    '<stop offset="1" stop-color="rgb(120,140,210)" stop-opacity="0" /></linearGradient></defs><path fill="url(#night-beam-fall)" /></svg>' +
    '<svg class="night-lit"></svg><span class="night-screen"></span>';
  var nightBeam = night.querySelector(".night-beam"),
    nightLit = night.querySelector(".night-lit"),
    nightScreen = night.querySelector(".night-screen");
  // where three of the beam's corners are on screen, for its shape there
  var beamCorners = ["left:0;top:0", "left:100%;top:0", "left:0;top:100%"].map(function (at) {
    return el("span", "beam-corner", beam, "position:absolute;width:0;height:0;" + at);
  });
  function setLight(on) {
    sw.setAttribute("aria-pressed", String(on));
    // (the first load's dark ends too, if the reader got to the switch first)
    document.documentElement.classList.remove("dawn");
    stage.removeAttribute("aria-busy");
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
  // the pager's screen lights it where it is: lifted while pointed at or focused, put down, or
  // done buzzing (its message's run along the screen moves none of it); at once where nothing
  // moves, under reduced motion
  var pager = stage.querySelector(".thing.pager");
  if (pager)
    ["transitionend", "animationend", "mouseenter", "mouseleave"].forEach(function (type) {
      pager.addEventListener(type, function (ev) {
        if (!ev.target.closest(".pg-msg")) glow();
      });
    });
  var navTubes = [].slice.call(nav.querySelectorAll("a"));
  var heard = []; // who hears of the lights changing (ROOM.onLights)
  // The night's holes, where a source lights the dark (none by day): each an ellipse on screen,
  // w and h across, at x, y, its colour falling off through stops from its middle (0) to its
  // edge (1). The night layer paints them; the light pass (room-light.js), when it runs, does
  // instead (ROOM.glows()), all but those it casts for real (cast): the window's, the screen's,
  // where the radio's lands and what the projector throws on the wall; and those that glow in
  // the air (air), it adds rather than lets through.
  var holes = [];
  function hole(r, w, h, stops, dy) {
    return { x: r.left + r.width / 2, y: r.top + r.height * (dy || 0.5), w: w, h: h, stops: stops };
  }
  function painted(o) {
    return (
      "radial-gradient(ellipse " + o.w + "px " + o.h + "px at " + o.x + "px " + o.y + "px, " +
      o.stops
        .map(function (s) {
          return s[0] + " " + s[1] * 100 + "%";
        })
        .join(", ") +
      ")"
    );
  }
  // drawn again when something it follows changes: the light, the frame, the neon, the screen
  function glow() {
    var h = document.documentElement.classList;
    holes = [];
    if (h.contains("lights-off") || h.contains("dawn")) inTheDark();
    // by day only the projector's beam, fainter, for the light pass (room.css hides the CSS
    // one while the pass runs: it stands upright at the lens, short of the wall)
    else if (cast.classList.contains("lit")) holes.push(projBeam(0.45));
    heard.forEach(function (f) {
      f();
    });
  }
  // A hole in the shape of something backlit, q its four corners on screen (it lies at a slant
  // there): its light full inside and gone soft px past its edges. The night layer draws it in
  // nightLit, the light pass in its glow shader; x, y, w and h are the box round it.
  function shaped(q, soft, stops) {
    var xs = q.map(function (c) {
        return c[0];
      }),
      ys = q.map(function (c) {
        return c[1];
      });
    var x0 = Math.min.apply(null, xs),
      x1 = Math.max.apply(null, xs),
      y0 = Math.min.apply(null, ys),
      y1 = Math.max.apply(null, ys);
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: (x1 - x0) / 2 + soft, h: (y1 - y0) / 2 + soft, stops: stops, quad: q, soft: soft };
  }
  // where an element's four corners are on screen, through every transform on the way
  function cornersOf(e) {
    var m = toStage(e),
      w = e.offsetWidth,
      h = e.offsetHeight;
    return [[0, 0], [w, 0], [w, h], [0, h]].map(function (c) {
      var p = m.transformPoint(new DOMPoint(c[0], c[1], 0));
      return toScreen(p.x, p.y, p.z);
    });
  }
  // a convex outline pushed out by s px on every side, each corner along the two edges' normals
  function grow(q, s) {
    var m = [0, 1].map(function (i) {
      return (q[0][i] + q[1][i] + q[2][i] + q[3][i]) / 4;
    });
    var out = function (a, b) {
      var dx = b[0] - a[0],
        dy = b[1] - a[1],
        l = Math.hypot(dx, dy) || 1,
        n = [dy / l, -dx / l];
      return (m[0] - a[0]) * n[0] + (m[1] - a[1]) * n[1] > 0 ? [-n[0], -n[1]] : n;
    };
    return q.map(function (c, i) {
      var n1 = out(q[(i + 3) % 4], c),
        n2 = out(c, q[(i + 1) % 4]),
        k = s / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
      return [c[0] + (n1[0] + n2[0]) * k, c[1] + (n1[1] + n2[1]) * k];
    });
  }
  // the projector's beam: a hole round the CSS one, for the night layer, and its shape on
  // screen, for the light pass, from the lens out to the corners of the words, added air strong
  function projBeam(air) {
    var br = ray.getBoundingClientRect();
    var beam = hole(br, br.width * 0.4, br.height * 0.5, [["rgba(240,215,180,0.7)", 0], ["transparent", 1]], 0.6);
    beam.air = air;
    beam.poly = [[LAMP.x, LAMP.y, LAMP.z], [0, 0], [PROJ.w, 0], [PROJ.w, -PROJ.h], [0, -PROJ.h]].map(function (p, i) {
      return i ? toScreen(RIGHT - 2, PROJ.along + p[0], PROJ.z + p[1]) : toScreen(p[0], p[1], p[2]);
    });
    return beam;
  }
  function inTheDark() {
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
      k = sw.getBoundingClientRect(),
      g = pc.querySelector(".glass").getBoundingClientRect();
    var moon = hole(w, w.width * 0.7, w.height * 0.75, [["rgba(150,170,235,1)", 0], ["transparent", 0.8]]);
    moon.cast = true;
    holes = [
      // (with the tube out its light fades, rather than whitening, which in a multiply layer is brightest)
      hole(n, n.width * 0.75, n.height * 1.7, [["color-mix(in srgb, color-mix(in srgb, " + tint + " 45%, white) " + 100 * dim + "%, transparent)", 0], ["color-mix(in srgb, " + tint + " " + 50 * dim + "%, transparent)", 0.55], ["transparent", 0.8]]),
      moon,
      hole(k, 36, 36, [["rgba(255,255,255,1)", 0], ["rgba(255,255,255,1)", 14 / 36], ["transparent", 1]]),
    ];
    navTubes.forEach(function (a) {
      var r = a.getBoundingClientRect();
      if (!r.width) return;
      var c = getComputedStyle(a).color;
      // the word itself, and its light thrown wide on the wall round it
      holes.push(hole(r, r.width * 0.62, r.height * 0.62, [["color-mix(in srgb, " + c + " 55%, white)", 0], ["color-mix(in srgb, " + c + " 35%, transparent)", 0.55], ["transparent", 0.85]]));
      holes.push(hole(r, r.width * 1.6 + 90, r.height * 1.4 + 120, [["color-mix(in srgb, " + c + " 70%, transparent)", 0], ["color-mix(in srgb, " + c + " 30%, transparent)", 0.5], ["transparent", 1]]));
    });
    // the window's light: the four panes of the beam on screen (its corners mapped from the
    // beam's own 0 to 1 across and along, as its mask and clip in room.css have them), so the
    // mullions' shadows cross what stands in it, the CloudBank ledger
    var c = beamCorners.map(function (e) {
      var r = e.getBoundingClientRect();
      return [r.left, r.top];
    });
    var onBeam = function (u, v) {
      return [0, 1].map(function (i) {
        return (c[0][i] + u * (c[1][i] - c[0][i]) + v * (c[2][i] - c[0][i])).toFixed(1);
      });
    };
    var panes = "";
    [[0, 0.42], [0.46, 1]].forEach(function (vs) {
      [[0, 0.486], [0.514, 1]].forEach(function (us) {
        panes +=
          "M" +
          [[us[0], vs[0]], [us[1], vs[0]], [us[1], vs[1]], [us[0], vs[1]]]
            .map(function (p) {
              var e = 0.04 * (1 - p[1]); // the beam narrows towards the window
              return onBeam(Math.min(Math.max(p[0], e), 1 - e), p[1]);
            })
            .join("L") +
          "Z";
      });
    });
    nightBeam.querySelector("path").setAttribute("d", panes);
    var fall = nightBeam.querySelector("linearGradient"),
      from = onBeam(0.5, 0),
      to = onBeam(0.5, 1);
    [["x1", from[0]], ["y1", from[1]], ["x2", to[0]], ["y2", to[1]]].forEach(function (a) {
      fall.setAttribute(a[0], a[1]);
    });
    // the screen's: a green on the keyboard, the desk's edge and the wall, round the screen,
    // unsteady (the night layer's own element, with its CSS flicker; a hole for the light pass)
    nightScreen.style.display = pc.classList.contains("on") ? "block" : "none";
    var sx = g.width * 1.85,
      sy = g.height * 2.2;
    Object.assign(nightScreen.style, { left: g.left + g.width / 2 - sx + "px", top: g.top + g.height * 0.6 - sy + "px", width: 2 * sx + "px", height: 2 * sy + "px" });
    if (pc.classList.contains("on")) {
      var screen = hole(g, sx, sy, [["rgba(200,255,210,1)", 0], ["rgba(80,140,100,0.65)", 0.45], ["transparent", 0.8]], 0.6);
      // (the light pass draws it too, flickering with the light the screen casts)
      screen.own = screen.crt = true;
      holes.push(screen);
    }
    // the pager's backlight, faint as a battery's: its screen, and just onto the pager round it
    var lcd = stage.querySelector(".pager .pg-lcd");
    if (lcd && lcd.offsetWidth) holes.push(shaped(cornersOf(lcd), 3.5, [["rgba(190,225,190,0.65)", 0], ["transparent", 1]]));
    // what has the keyboard's focus is lit, so its ring shows in the dark
    var f = document.activeElement;
    if (f && f !== document.body && fit.contains(f) && f.matches(":focus-visible")) {
      var fr = f.getBoundingClientRect();
      holes.push(hole(fr, fr.width * 0.75 + 40, fr.height * 0.75 + 40, [["rgba(255,255,255,1)", 0.6], ["transparent", 1]]));
    }
    // the radio while it plays: its lit dial, its halo, and where its light lands on the desk,
    // nearer the radio than the pool's middle
    if (lamp.classList.contains("lit")) {
      var lp = lamp.getBoundingClientRect(),
        pl = pool.getBoundingClientRect(),
        dl = dial.getBoundingClientRect();
      var px = pl.left + pl.width * 0.5 + (lp.left + lp.width / 2 - pl.left - pl.width * 0.5) * 0.4,
        py = pl.top + pl.height * 0.5 + (lp.top + lp.height / 2 - pl.top - pl.height * 0.5) * 0.4;
      holes.push(hole(dl, dl.width * 0.9 + 20, dl.height * 0.9 + 20, [["rgba(255,240,210,1)", 0.3], ["transparent", 1]]));
      // (for the light pass: only a glow round its face, the lit dial and the knobs, no lamp's)
      var fr = face.getBoundingClientRect(),
        halo = hole(fr, fr.width * 0.65, fr.height * 0.65, [["rgba(255,205,150,1)", 0], ["rgba(200,150,100,0.5)", 0.5], ["transparent", 1]]);
      halo.air = 0.22; // (how strongly it adds)
      halo.own = true; // (the night layer has its lamp's halo, below, which the pass casts)
      holes.push(halo);
      var lampHalo = hole(lp, lp.width * 0.55, lp.height * 0.5, [["rgba(255,205,150,1)", 0], ["rgba(200,150,100,0.6)", 0.45], ["transparent", 0.8]]);
      lampHalo.cast = true;
      holes.push(lampHalo);
      holes.push({ x: px, y: py, w: pl.width * 0.32, h: pl.height * 0.3, stops: [["rgba(230,180,130,0.9)", 0], ["rgba(170,130,90,0.4)", 0.5], ["transparent", 0.85]], cast: true });
    }
    // what the projector throws on the wall
    if (cast.classList.contains("lit")) {
      var pr = cast.getBoundingClientRect(),
        thrown = hole(pr, pr.width * 0.6, pr.height * 0.62, [["rgba(255,236,206,1)", 0.4], ["rgba(200,170,130,0.5)", 0.7], ["transparent", 1]]);
      thrown.cast = true; // (the light pass casts it from the lens, with what stands in the beam)
      holes.push(thrown);
      holes.push(projBeam(0.6));
    }
    // (what is backlit in its own shape: grown by half its soft edge, and blurred over the rest
    // by room.css, as the light pass's falls off)
    nightLit.innerHTML = holes
      .filter(function (o) {
        return o.quad && !o.own;
      })
      .map(function (o) {
        var d = grow(o.quad, o.soft / 2).map(function (c) {
          return c[0].toFixed(1) + " " + c[1].toFixed(1);
        });
        return '<path d="M' + d.join("L") + 'Z" style="fill:' + o.stops[0][0] + '" />';
      })
      .join("");
    night.style.background =
      holes
        .filter(function (o) {
          return !o.own && !o.quad;
        })
        .map(painted)
        .join(", ") + ", rgb(40, 46, 80)";
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
  // ---- the first load of a visit: the room in the dark ---------------------------------
  // Built but dark, the neon name striking, until the switch clicks the light on once the
  // room and whatever holds it (Willy, later, through ROOM.holdLight) are ready. The dark is
  // a CSS animation that ends lit on its own (room.css, .dawn); this only ends it sooner, or
  // at its end puts the switch where the light is. Later loads in the visit skip it.
  var holds = [];
  var dawn = lightWas === null && !still.matches;
  var dawnAt = performance.now();
  var lightUp = function () {};
  if (dawn) {
    document.documentElement.classList.add("dawn");
    stage.setAttribute("aria-busy", "true");
    sw.setAttribute("aria-pressed", "false");
    lightUp = function () {
      if (!document.documentElement.classList.contains("dawn")) return;
      if (window.CRT) CRT.clack();
      setLight(true);
    };
    setTimeout(lightUp, 4000);
  } else setLight(lightWas !== "off");
  spread();
  frame();
  if (dawn) strike(false);
  if (window.RADIO) showRadio(RADIO.state());
  // the light waits for everything that holds it, and for the name to have struck
  function settle() {
    var n = holds.length;
    Promise.all(holds).then(function () {
      if (holds.length !== n) return settle();
      setTimeout(lightUp, Math.max(0, 1600 - (performance.now() - dawnAt)));
    });
  }
  // again once the fonts are in, since words change the sizes: a small correction, not a new
  // layout; and from then on the room is where it stays, for Willy (ROOM.ready)
  var readied;
  var ready = new Promise(function (r) {
    readied = r;
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    spread(true);
    solids = null;
    frame();
    readied();
    // and once every script after it has run, so that each has had its chance to hold it
    if (document.readyState === "loading") addEventListener("DOMContentLoaded", settle);
    else settle();
  });
  // the morph that brought the reader here, if any, as the page is revealed (pagereveal, before
  // its first frame; this runs before then, as morph.js does). A frame's callbacks run after its
  // reveal, so by the first one it has been revealed, if not while this was listening.
  var inbound = new Promise(function (r) {
    addEventListener(
      "pagereveal",
      function (e) {
        r(e.viewTransition);
      },
      { once: true }
    );
    requestAnimationFrame(function () {
      r(document.activeViewTransition || null);
    });
  });
  // once that morph has landed, and whatever it put down with it (morph.js) has stopped moving:
  // what takes the main thread for a while (the light pass, Willy, the mouse) waits for it, or
  // the morph would stop for them (ROOM.landed()). At most 3 s from the first asking, however
  // long they take; and at once in a tab the reader cannot see, where no frame runs
  var arrival = null;
  function arrived() {
    if (!arrival)
      arrival = new Promise(function (done) {
        var over = false;
        function land() {
          over = true;
          document.removeEventListener("visibilitychange", unseen);
          done();
        }
        function unseen() {
          if (document.hidden) land();
        }
        function stopped() {
          if (over) return;
          var moving = stage.getAnimations({ subtree: true }).filter(function (a) {
            return a instanceof CSSTransition;
          });
          if (!moving.length) return land();
          Promise.allSettled(
            moving.map(function (a) {
              return a.finished;
            })
          ).then(function () {
            requestAnimationFrame(stopped);
          });
        }
        function go() {
          requestAnimationFrame(stopped);
        }
        setTimeout(land, 3000);
        document.addEventListener("visibilitychange", unseen);
        unseen();
        inbound.then(function (vt) {
          if (vt) vt.finished.then(go, go);
          else go();
        });
      });
    return arrival;
  }
  // ---- what Willy stands on, and what he keeps out of ---------------------------------
  // The desk (the mat on it is 4 px proud, too little to matter), the fleece on the perch and
  // the shelf, in room px; the jumps between them, landing along the perch and the shelf, since
  // across them he would not fit (where he takes off from, Willy works out); and everything
  // solid, measured once the loose things have their places.
  var SURFACES = [
    { name: "desk", z: 0, x0: DESK.x, y0: DESK.y, x1: DESK.x + DESK.w, y1: DESK.y + DESK.d },
    { name: "perch", z: PERCH.z + 26, x0: PERCH.x, y0: BACK, x1: PERCH.x + PERCH.w, y1: BACK + PERCH.d, of: ".perch, .perch-fleece" },
    { name: "shelf", z: SHELF.z, x0: RIGHT - SHELF.w, y0: SHELF.y, x1: RIGHT, y1: SHELF.y + SHELF.d, of: ".wall-shelf, .shelf-bracket" },
  ];
  var JUMPS = [180, 0]
    .map(function (h) {
      return { a: "desk", b: "perch", to: [PERCH.x + PERCH.w / 2, BACK + PERCH.d / 2], heading: h };
    })
    .concat(
      // onto the shelf between the plant and the radio, along it, either way
      [90, 270].map(function (h) {
        return { a: "desk", b: "shelf", to: [RIGHT - SHELF.w / 2, (SHELF.y + 66 + RAD.y) / 2], heading: h };
      }),
    );
  // what Willy walks over rather than round: anything this low on the desk, a book, an
  // envelope, a card, as a cat does; he stands on its top
  var LOW = 50;
  var solids = null,
    lows = null;
  function solid() {
    if (!solids) {
      var all = obstacles()
        // not the perch's chains: thin, he brushes past them, and as boxes they would fill the
        // air over the whole perch; nor the loose things, 12 px at most, which he steps over
        .concat([].slice.call(stage.querySelectorAll(".sill, .perch, .perch-fleece, .wall-shelf, .shelf-bracket, .plant, .radio, .projector")))
        .map(function (e) {
          var of = SURFACES.filter(function (s) {
            return s.of && e.matches(s.of);
          })[0];
          return { b: bounds(e), name: named(e), of: of && of.name, e: e };
        });
      lows = all.filter(function (o) {
        return !o.of && Math.abs(o.b.z0) < 2 && o.b.z1 <= LOW; // standing on the desk, not under it
      });
      solids = all.filter(function (o) {
        return lows.indexOf(o) < 0;
      });
    }
    return solids;
  }
  // how high the ground is at x, y on the surface at z: the top of a low thing there, if any
  function ground(x, y, z) {
    solid();
    return lows.reduce(function (h, o) {
      var b = o.b;
      return z === 0 && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 ? Math.max(h, b.z1) : h;
    }, z);
  }
  // the solids a shape goes into, but those that make the surfaces named in past
  function hit(shape, past) {
    return solid().filter(function (o) {
      return !(past && past.indexOf(o.of) >= 0) && overlap(shape, o.b);
    });
  }

  // ---- the room's lights, for Willy -----------------------------------------------------
  // Each source where it is, in room px, in the colour the dark's holes give it (glow()), how
  // strong it is now (0 when off) and how far it reaches (0, everywhere): the room's own light,
  // high above the back left; the window, from high outside it, the moon by night and with the
  // light off, the sun by day; the computer's screen while it is on; the radio's lamp while it
  // plays, and its projector's, from the lens, while it throws the words on the wall. Whoever
  // listens hears of every change.
  var spots = null;
  function lights() {
    if (!spots) {
      var mid = function (e) {
        var b = bounds(e);
        return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2];
      };
      spots = { screen: mid(pc.querySelector(".glass")), radio: mid(dial) };
    }
    var h = document.documentElement.classList,
      dark = h.contains("lights-off") || h.contains("dawn"),
      night = dark || matchMedia("(prefers-color-scheme: dark)").matches;
    return [
      { name: "room", at: [DESK.x + 200, BACK + 250, 1600], color: "#fff1dc", power: dark ? 0 : 1, reach: 0 },
      { name: "window", at: [WIN.along + WIN.w / 2, BACK - 1000, WIN.top - WIN.h / 2 + 1000 * HIGH], color: night ? "#b9c8fa" : "#ffe4a0", power: dark ? 1 : 0.35, reach: 0 },
      { name: "screen", at: spots.screen, color: "#c8ffd2", power: pc.classList.contains("on") ? 1 : 0, reach: 700 },
      { name: "radio", at: spots.radio, color: "#ffcd96", power: lamp.classList.contains("lit") ? 1 : 0, reach: 450 },
      { name: "projector", at: [LAMP.x, LAMP.y, LAMP.z], color: "#ffe6c0", power: cast.classList.contains("lit") ? 1 : 0, reach: 400 },
    ];
  }

  // whether the moon or the sun, through the window, falls on x, y at height z: the ray through
  // it lands that much nearer the wall the higher the point (the mullions' shadows aside)
  function moonlit(x, y, z) {
    var w = y + z / HIGH;
    return x >= WIN.along - 30 && x <= WIN.along + WIN.w + 30 && w >= near && w <= far;
  }
  // where a point of the room is on screen, in the viewport's px: the room is drawn without
  // perspective, so three of its axes, measured once for each size of the window, say it all
  var axes = null,
    axesFor = "";
  function toScreen(x, y, z) {
    var key = innerWidth + "x" + innerHeight + " " + getComputedStyle(stage).getPropertyValue("--s");
    if (!axes || axesFor !== key) {
      axesFor = key;
      axes = [[0, 0, 0], [1000, 0, 0], [0, 1000, 0], [0, 0, 1000]].map(function (p) {
        var s = el("span", "", room, "position:absolute;left:0;top:0;width:0;height:0;transform:translate3d(" + p.join("px,") + "px)"),
          r = s.getBoundingClientRect();
        s.remove();
        return [r.left, r.top];
      });
    }
    var o = axes[0];
    return [0, 1].map(function (i) {
      return o[i] + ((axes[1][i] - o[i]) * x + (axes[2][i] - o[i]) * y + (axes[3][i] - o[i]) * z) / 1000;
    });
  }
  // the outlines on screen of the solid things in front of a box w (in bounds()'s form), as the
  // reader sees them, from the front left and above: the outline of each of their faces (the
  // hull of their box's corners would hide what is round them, the space over a keyboard). A box
  // is in front where the two are apart along an axis and it is the nearer along it (the
  // lower x, the higher y, the higher z); where they are apart along two that disagree, the one
  // whose middle is nearer
  function before(w) {
    var depth = function (b) {
      return -(b.x0 + b.x1) / 2 + (b.y0 + b.y1) / 2 + (b.z0 + b.z1) / 2;
    };
    return solid()
      .filter(function (o) {
        var b = o.b;
        if (o.of) return false;
        var front = b.x1 <= w.x0 || b.y0 >= w.y1 || b.z0 >= w.z1,
          behind = b.x0 >= w.x1 || b.y1 <= w.y0 || b.z1 <= w.z0;
        return front && behind ? depth(b) > depth(w) : front;
      })
      .reduce(function (all, o) {
        return all.concat(
          faces(o).map(function (f) {
            return hull(
              f.map(function (c) {
                return toScreen(c[0], c[1], c[2]);
              })
            );
          })
        );
      }, []);
  }
  // the corners in the room of each part of a solid thing that hides what is behind it: those
  // that paint more than a tint (not the jar's glass, nor the plane through it that takes the
  // pointer), each cut to what it shows through (a strip of a label wrapped round)
  function faces(o) {
    if (o.faces) return o.faces;
    var root = o.e,
      see = function (e) {
        for (var a = e; a !== root.parentElement; a = a.parentElement) if (+getComputedStyle(a).opacity < 0.5) return false;
        var cs = getComputedStyle(e),
          tint = cs.backgroundColor.match(/^rgba\(.*,\s*([\d.]+)\)$|\/\s*([\d.]+)(%?)\s*\)$/),
          alpha = !tint ? 1 : tint[1] ? +tint[1] : tint[3] ? tint[2] / 100 : +tint[2];
        return cs.visibility !== "hidden" && (cs.backgroundImage !== "none" || alpha >= 0.5);
      };
    o.faces = [root]
      .concat([].slice.call(root.querySelectorAll("*"), 0, 600))
      .filter(function (e) {
        return e instanceof HTMLElement && e.offsetWidth && !BODYLESS.test(e.className) && see(e);
      })
      .map(function (e) {
        for (var c = e.parentElement; c !== root && root.contains(c); c = c.parentElement)
          if (getComputedStyle(c).overflow === "hidden") {
            e = c;
            break;
          }
        var m = toStage(e);
        return [[0, 0], [e.offsetWidth, 0], [e.offsetWidth, e.offsetHeight], [0, e.offsetHeight]].map(function (c) {
          var p = m.transformPoint(new DOMPoint(c[0], c[1], 0));
          return [p.x, p.y, p.z];
        });
      });
    return o.faces;
  }
  // the convex hull of points, in order round it
  function hull(pts) {
    pts.sort(function (a, b) {
      return a[0] - b[0] || a[1] - b[1];
    });
    var cross = function (o, a, b) {
      return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    };
    var lower = [],
      upper = [];
    pts.forEach(function (p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    });
    pts
      .slice()
      .reverse()
      .forEach(function (p) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
      });
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  // what the room's other modules use of it: morph.js turns things to face the reader, and
  // takes a photo out of its place or names the one that has just landed in it; Willy walks
  // its surfaces and keeps out of its solids
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
    // keeps the first load's dark until p settles, or the dark's own end: for Willy
    holdLight: function (p) {
      holds.push(p);
    },
    // settles once the room is where it stays: its loose things placed, its words measured
    ready: ready,
    // a promise that settles once the morph that brought the reader here has landed (arrived())
    landed: arrived,
    surfaces: SURFACES,
    jumps: JUMPS,
    lights: lights,
    // the mouse by the keyboard, for Willy: at(), where it is; knock(heading)
    mouse: pcMouse,
    // the night's holes as they are now (glow())
    glows: function () {
      return holes;
    },
    moonlit: moonlit,
    toScreen: toScreen,
    // the matrix from an element's own px to the room's, through every transform on the way
    toStage: toStage,
    before: before,
    // the layer that darkens the room with its light off, where Willy draws himself out of it
    night: night,
    // f is called whenever a light changes
    onLights: function (f) {
      heard.push(f);
    },
    ground: ground,
    // what is low enough to walk over, and how high, by name
    lows: function () {
      solid();
      return lows.map(function (o) {
        return [o.name, Math.round(o.b.z1)];
      });
    },
    // whether a shape, in bounds()'s form, goes into nothing solid, but what makes the
    // surfaces named in past (for a jump, which clears their edges); or what it goes into
    clear: function (shape, past) {
      return !hit(shape, past).length;
    },
    into: function (shape, past) {
      return hit(shape, past).map(function (o) {
        return o.name;
      });
    },
  };
})();
