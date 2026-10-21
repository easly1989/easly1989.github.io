/* PROTOTYPE, throwaway: place things in the room by hand. Only with ?place in the address.
   Step 1: what stands on the desk (the project objects, the loose things, the cat's toys).
   Click or pick a thing, drag it, or use the arrow keys (Shift: bigger steps) and Q / E to
   turn it. Its box in the room is measured from its real transforms, and it turns red when
   it goes into a wall, off the desk, or into the computer or another thing. Positions are
   kept in this browser; "Copy positions" gives the list to paste back. */
(function () {
  "use strict";
  if (!/[?&]place\b/.test(location.search) || !document.documentElement.classList.contains("b3")) return;
  var stage = document.querySelector(".stage");
  var BACK = -200, RIGHT = 1350, DESK = { x0: -560, y0: -150, x1: 1330, y1: 1030 };
  var KEY = "place:v1";

  // ---- what can be placed ----------------------------------------------------------
  function items() {
    var list = [];
    [].forEach.call(stage.querySelectorAll(".thing"), function (t) {
      if (t.closest(".on-wall, .pc")) return; // on a wall or on the computer: a later step
      var id = ["ledger", "agenda", "camera", "mug", "jar"].filter(function (k) { return t.classList.contains(k); })[0];
      if (id) list.push({ id: id, el: t, label: label(t, id), vars: true });
    });
    [].forEach.call(stage.querySelectorAll(".loose"), function (o) {
      var id = o.className.replace("loose", "").trim().split(/\s+/)[0];
      list.push({ id: id, el: o, label: id });
    });
    [].forEach.call(stage.querySelectorAll(".cat-toy:not([data-toy='box'])"), function (t) {
      list.push({ id: "toy-" + t.dataset.toy, el: t, label: t.getAttribute("aria-label") || t.dataset.toy });
    });
    // the box has three places of its own: picking one shows the box there
    var box = stage.querySelector(".cat-toy[data-toy='box']");
    if (box && window.__room)
      window.__room.BOX_SPOTS.forEach(function (s, i) {
        list.push({ id: "box-" + (i + 1), el: box, slot: i, label: "Box, place " + (i + 1) + (s.z < 0 ? " (floor, under the desk)" : " (behind the computer)") });
      });
    return list;
  }
  function label(t, id) {
    var l = t.querySelector(".label");
    return (l && l.firstChild ? l.firstChild.textContent.trim() : id) + " (" + id + ")";
  }
  function getPos(it) {
    if (it.slot !== undefined) {
      var s = window.__room.BOX_SPOTS[it.slot];
      return { x: s.x, y: s.y, r: s.r };
    }
    var cs = it.el.style;
    var x = it.vars ? parseFloat(cs.getPropertyValue("--x") || getComputedStyle(it.el).getPropertyValue("--x")) : parseFloat(cs.left);
    var y = it.vars ? parseFloat(cs.getPropertyValue("--y") || getComputedStyle(it.el).getPropertyValue("--y")) : parseFloat(cs.top);
    var r = parseFloat(cs.getPropertyValue("--r") || getComputedStyle(it.el).getPropertyValue("--r")) || 0;
    return { x: Math.round(x || 0), y: Math.round(y || 0), r: Math.round(r) };
  }
  function setPos(it, p) {
    if (it.slot !== undefined) {
      var s = window.__room.BOX_SPOTS[it.slot];
      s.x = p.x;
      s.y = p.y;
      s.r = p.r;
      window.__room.placeBox(it.el, it.slot);
      return;
    }
    if (!it.vars && window.__room) return window.__room.setAt(it.el, p); // instant, no glide
    if (it.vars) {
      it.el.style.setProperty("--x", p.x + "px");
      it.el.style.setProperty("--y", p.y + "px");
    } else {
      it.el.style.left = p.x + "px";
      it.el.style.top = p.y + "px";
    }
    it.el.style.setProperty("--r", p.r + "deg");
  }

  // ---- where a thing really is: its corners carried through every transform ----------
  function parse3(v, n) {
    if (!v || v === "none") return null;
    return v.split(" ").map(parseFloat).concat([n, n, n]).slice(0, 3);
  }
  function localMatrix(n) {
    var cs = getComputedStyle(n);
    var o = cs.transformOrigin.split(" ").map(parseFloat);
    var m = new DOMMatrix().translate(n.offsetLeft, n.offsetTop).translate(o[0], o[1], o[2] || 0);
    var t = parse3(cs.translate, 0);
    if (t) m = m.translate(t[0], t[1], t[2]);
    if (cs.rotate && cs.rotate !== "none") {
      var deg = parseFloat(cs.rotate.split(" ").pop());
      m = m.rotate(0, 0, deg); // shortcut: only rotations about z, which is all the desk uses
    }
    var s = parse3(cs.scale, 1);
    if (s) m = m.scale(s[0], s[1], s[2]);
    if (cs.transform !== "none") m = m.multiply(new DOMMatrix(cs.transform));
    return m.translate(-o[0], -o[1], -(o[2] || 0));
  }
  // the matrix from an element to the stage, following offsetParents (all of them positioned)
  function toStage(e) {
    var chain = [];
    for (var n = e; n && n !== stage; n = n.offsetParent) chain.unshift(n);
    var m = new DOMMatrix();
    chain.forEach(function (n) { m = m.multiply(localMatrix(n)); });
    return m;
  }
  function bounds(root) {
    var b = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9 };
    var els = [root].concat([].slice.call(root.querySelectorAll("*"), 0, 400));
    els.forEach(function (e) {
      // the blurred shadow on the mat is light, not body
      if (!(e instanceof HTMLElement) || !e.offsetWidth || e.classList.contains("shade") || getComputedStyle(e).visibility === "hidden") return;
      var m = toStage(e);
      [[0, 0], [e.offsetWidth, 0], [0, e.offsetHeight], [e.offsetWidth, e.offsetHeight]].forEach(function (c) {
        var p = m.transformPoint(new DOMPoint(c[0], c[1], 0));
        b.x0 = Math.min(b.x0, p.x); b.x1 = Math.max(b.x1, p.x);
        b.y0 = Math.min(b.y0, p.y); b.y1 = Math.max(b.y1, p.y);
        // CSS z grows towards the viewer, which on this stage is up
        b.z0 = Math.min(b.z0, p.z); b.z1 = Math.max(b.z1, p.z);
      });
    });
    return b;
  }
  function overlap(a, b) {
    var g = 1; // a pixel's grace, so things that only touch are fine
    return a.x0 < b.x1 - g && a.x1 > b.x0 + g && a.y0 < b.y1 - g && a.y1 > b.y0 + g && a.z0 < b.z1 - g && a.z1 > b.z0 + g;
  }
  // the same test the room uses when it spreads things on each visit (bench3d.js)
  function problems(it) {
    var R = window.__room;
    var onFloor = it.slot !== undefined && R.BOX_SPOTS[it.slot].z < 0;
    return { list: R.faults(it.el, others, onFloor) };
  }
  var others = [];
  function measureOthers(sel) {
    var R = window.__room;
    var els = R.obstacles();
    all.forEach(function (o) {
      if (o.el !== sel.el && els.indexOf(o.el) < 0) els.push(o.el);
    });
    // the computer is judged by its case, which the box's cut flaps already keep out of
    if (sel.slot !== undefined) els = els.filter(function (e) { return !e.classList.contains("pc"); });
    others = els.map(function (e) { return { el: e, b: R.bounds(e), name: R.named(e) }; });
  }

  // ---- the panel --------------------------------------------------------------------
  var css = document.createElement("style");
  css.textContent =
    ".place-ui{position:fixed;right:12px;top:12px;z-index:100;width:300px;max-height:calc(100vh - 24px);overflow:auto;padding:12px;" +
    "background:#141a20ee;color:#fff;font:13px/1.4 system-ui;border-radius:10px;box-shadow:0 8px 24px #0006}" +
    ".place-ui h2{margin:0 0 8px;font-size:14px}.place-ui select,.place-ui input,.place-ui button{font:inherit}" +
    ".place-ui select{width:100%;margin-bottom:8px}.place-ui .row{display:flex;gap:6px;margin-bottom:8px}" +
    ".place-ui label{flex:1}.place-ui input{width:100%;box-sizing:border-box}" +
    ".place-ui .state{padding:6px 8px;border-radius:6px;margin-bottom:8px}.place-ui .ok{background:#1f6f3a}.place-ui .bad{background:#a3242f}" +
    ".place-ui textarea{width:100%;height:110px;box-sizing:border-box;font:12px ui-monospace,monospace}" +
    ".place-ui button{padding:4px 10px;border-radius:6px;border:0;background:#e8edf2;color:#111;cursor:pointer}" +
    ".b3 .placing{outline:4px dashed #2ee66b;outline-offset:6px}.b3 .placing.bad{outline:4px solid #ff3b4e}" +
    "html.placing-on .cat{opacity:.35}";
  document.head.appendChild(css);
  document.documentElement.classList.add("placing-on");
  var ui = document.createElement("div");
  ui.className = "place-ui";
  ui.innerHTML =
    "<h2>Place mode: the desk</h2>" +
    '<select aria-label="Thing to place"></select>' +
    '<div class="row"><label>x <input type="number" step="5" data-k="x" /></label><label>y <input type="number" step="5" data-k="y" /></label><label>turn <input type="number" step="5" data-k="r" /></label></div>' +
    '<div class="state ok">Pick a thing.</div>' +
    '<div class="row"><button type="button" data-a="copy">Copy positions</button><button type="button" data-a="reset">Reset all</button></div>' +
    '<textarea readonly aria-label="Positions to paste back"></textarea>' +
    "<p>Drag a thing, or arrows to move it (Shift: ×5), Q / E to turn it, Esc to let go.</p>";
  document.body.appendChild(ui);
  var pick = ui.querySelector("select");
  var state = ui.querySelector(".state");
  var out = ui.querySelector("textarea");
  var inputs = {};
  [].forEach.call(ui.querySelectorAll("input"), function (i) { inputs[i.dataset.k] = i; });

  var all = [];
  var sel = null;
  function refreshList() {
    all = items();
    pick.innerHTML = '<option value="">Pick a thing…</option>' + all.map(function (it, i) {
      return '<option value="' + i + '">' + it.label + "</option>";
    }).join("");
    if (sel) pick.value = String(all.indexOf(sel));
  }
  function select(it) {
    if (sel) sel.el.classList.remove("placing", "bad");
    sel = it;
    if (!it) {
      state.textContent = "Pick a thing.";
      state.className = "state ok";
      pick.value = "";
      return;
    }
    it.el.classList.add("placing");
    if (it.slot !== undefined) window.__room.placeBox(it.el, it.slot);
    pick.value = String(all.indexOf(it));
    measureOthers(it);
    show();
  }
  function show() {
    if (!sel) return;
    var p = getPos(sel);
    ["x", "y", "r"].forEach(function (k) { if (document.activeElement !== inputs[k]) inputs[k].value = p[k]; });
    var pr = problems(sel);
    sel.el.classList.toggle("bad", pr.list.length > 0);
    state.className = "state " + (pr.list.length ? "bad" : "ok");
    state.textContent = pr.list.length ? "It " + pr.list.join("; it ") + "." : "Fits: nothing in the way.";
  }
  function move(p) {
    setPos(sel, p);
    save();
    show();
  }

  // ---- keeping and giving back what was placed ----------------------------------------
  function saved() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    var s = saved();
    if (sel) s[sel.id] = getPos(sel);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private window: kept for this visit only */ }
    out.value = JSON.stringify(s, null, 1);
  }
  function restore() {
    var s = saved();
    all.forEach(function (it) {
      if (!s[it.id]) return;
      // the loose things and the toys are spread at random on every visit, round the rest
      if (it.slot === undefined && !it.vars) return;
      if (it.slot === undefined) return setPos(it, s[it.id]);
      // a box place is remembered without moving the box there
      var b = window.__room.BOX_SPOTS[it.slot];
      b.x = s[it.id].x;
      b.y = s[it.id].y;
      b.r = s[it.id].r;
    });
    out.value = JSON.stringify(s, null, 1);
  }

  // ---- mouse and keys -----------------------------------------------------------------
  // in place mode nothing opens: the click is caught before the page's own handlers
  window.addEventListener("click", function (e) {
    if (e.target.closest(".place-ui")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  window.addEventListener("dragstart", function (e) { e.preventDefault(); }, true);
  var drag = null;
  window.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".place-ui")) return;
    var hit = all.filter(function (it) { return it.el.contains(e.target); })[0];
    if (!hit) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    select(hit);
    var m = new DOMMatrix(getComputedStyle(stage).transform);
    drag = { sx: e.clientX, sy: e.clientY, p: getPos(hit), m: m };
  }, true);
  window.addEventListener("pointermove", function (e) {
    if (!drag || !sel) return;
    // undo the stage's projection of the desk plane: screen = x * (m11, m12) + y * (m21, m22)
    var m = drag.m, dX = e.clientX - drag.sx, dY = e.clientY - drag.sy;
    var det = m.m11 * m.m22 - m.m21 * m.m12;
    var dx = (dX * m.m22 - dY * m.m21) / det;
    var dy = (dY * m.m11 - dX * m.m12) / det;
    move({ x: Math.round(drag.p.x + dx), y: Math.round(drag.p.y + dy), r: drag.p.r });
  }, true);
  window.addEventListener("pointerup", function () { drag = null; }, true);
  window.addEventListener("keydown", function (e) {
    if (!sel || e.target.closest(".place-ui input, .place-ui select")) return;
    var step = e.shiftKey ? 25 : 5;
    var p = getPos(sel);
    // the arrows move it the way they point on screen, along the desk's own axes
    var k = { ArrowLeft: [-1, -1], ArrowRight: [1, 1], ArrowUp: [1, -1], ArrowDown: [-1, 1] }[e.key];
    if (k) {
      e.preventDefault();
      move({ x: p.x + k[0] * step, y: p.y + k[1] * step, r: p.r });
    } else if (e.key === "q" || e.key === "e") {
      move({ x: p.x, y: p.y, r: p.r + (e.key === "e" ? step : -step) });
    } else if (e.key === "Escape") {
      select(null);
    }
  }, true);
  pick.addEventListener("change", function () { select(all[+pick.value] || null); });
  ui.addEventListener("input", function (e) {
    if (!sel || !e.target.dataset.k) return;
    var p = getPos(sel);
    p[e.target.dataset.k] = Math.round(+e.target.value || 0);
    move(p);
  });
  ui.addEventListener("click", function (e) {
    var a = e.target.dataset && e.target.dataset.a;
    if (a === "copy") {
      save();
      out.select();
      try { navigator.clipboard.writeText(out.value); } catch (err) { /* the text stays selected to copy by hand */ }
      state.textContent = "Copied. Paste it in the chat.";
    } else if (a === "reset") {
      try { localStorage.removeItem(KEY); } catch (err) { /* nothing kept */ }
      location.reload();
    }
  });

  // the toys and the box arrive later, from cat.js and bench3d.js: wait for them
  setTimeout(function () {
    refreshList();
    restore();
    new MutationObserver(function () { refreshList(); }).observe(stage, { childList: true });
  }, 1200);
})();
