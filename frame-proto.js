/* PROTOTYPE, throwaway: how does the room fit the window, so nothing a reader uses leaves
   the frame? Answers "Frame the room to the window's width".
   ?frame=today  what the mockup does now: shrinks only below 1304 px wide, crops the sides
   ?frame=fit    scales and centres the room so everything usable fits, never above its size
   ?frame=grow   the same, and grows on big screens, up to 1.15 (the one chosen)
   ?frame=width  fits the width only; the height may crop
   The bar at the bottom right switches; the panel says what the frame holds. */
(function () {
  var MODES = ["today", "fit", "grow", "width"];
  var q = new URLSearchParams(location.search).get("frame");
  var mode = MODES.indexOf(q) >= 0 ? q : sessionStorage.getItem("frame") || "grow";
  sessionStorage.setItem("frame", mode);
  var stage = document.querySelector(".stage"),
    fit = document.querySelector(".fit");
  if (!stage || !fit) return;
  var M = 16; // the clear margin round what is usable
  var BASE = { x: 179, y: 73 }; // the stage's own offsets (bench3d.css)

  var bar = document.createElement("div");
  bar.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:99;display:flex;flex-direction:column;gap:6px;padding:8px 10px;background:rgba(20,20,20,.86);color:#e9f5e6;font:12px/1.4 'IBM Plex Mono',monospace;border-radius:6px;max-width:360px";
  var row = document.createElement("div");
  row.style.cssText = "display:flex;gap:6px;align-items:center";
  row.innerHTML = "<span>frame</span>";
  MODES.forEach(function (m) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = m;
    b.setAttribute("aria-pressed", String(m === mode));
    b.style.cssText = "font:inherit;padding:2px 8px;border-radius:4px;border:1px solid #9fc79a;cursor:pointer;" + (m === mode ? "background:#9fc79a;color:#14231a" : "background:transparent;color:inherit");
    b.onclick = function () {
      var u = new URL(location.href);
      u.searchParams.set("frame", m);
      location.href = u.href;
    };
    row.appendChild(b);
  });
  var out = document.createElement("pre");
  out.style.cssText = "margin:0;white-space:pre-wrap";
  bar.appendChild(row);
  bar.appendChild(out);
  document.body.appendChild(bar);

  // what a reader can use: every link, button and focusable thing in the room that shows
  function usable() {
    return [].filter.call(fit.querySelectorAll("a[href], button, [tabindex]:not([tabindex='-1'])"), function (e) {
      // the toys are left out: placed at random, the build keeps them inside the frame
      if (bar.contains(e) || e.closest("[hidden], [inert], .cat-toy, .cat")) return false;
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
      u.l = Math.min(u.l, r.left); u.t = Math.min(u.t, r.top);
      u.r = Math.max(u.r, r.right); u.b = Math.max(u.b, r.bottom);
    });
    return u;
  }
  function set(s, dx, dy) {
    stage.style.setProperty("--s", s);
    stage.style.setProperty("--iso-x", BASE.x + dx + "px");
    stage.style.setProperty("--iso-y", BASE.y + dy + "px");
  }
  function area() {
    var f = fit.getClientRects()[0];
    return { l: Math.max(0, f.left), t: Math.max(0, f.top), r: Math.min(innerWidth, f.right), b: Math.min(innerHeight, f.bottom) };
  }

  function frame() {
    // the stage eases its transform: a box read straight after a change would be the old one
    stage.style.transition = "none";
    var A = area(), list, s, dx = 0, dy = 0;
    if (mode !== "today") {
      // the usable box at two scales gives the point the stage scales about
      set(1, 0, 0);
      list = usable();
      var U1 = union(list);
      set(0.5, 0, 0);
      var U5 = union(list);
      var O = { x: 2 * (U5.l + U5.r) / 2 - (U1.l + U1.r) / 2, y: 2 * (U5.t + U5.b) / 2 - (U1.t + U1.b) / 2 };
      var w = U1.r - U1.l, h = U1.b - U1.t;
      var kw = (A.r - A.l - 2 * M) / w, kh = (A.b - A.t - 2 * M) / h;
      s = mode === "width" ? kw : Math.min(kw, kh);
      s = Math.min(s, mode === "grow" ? 1.15 : 1);
      // centre the usable box in the window
      var c = { x: (U1.l + U1.r) / 2, y: (U1.t + U1.b) / 2 };
      dx = (A.l + A.r) / 2 - (O.x + s * (c.x - O.x));
      dy = mode === "width" ? 0 : (A.t + A.b) / 2 - (O.y + s * (c.y - O.y));
      set(s, dx, dy);
    } else {
      stage.style.removeProperty("--s");
      stage.style.removeProperty("--iso-x");
      stage.style.removeProperty("--iso-y");
      s = parseFloat(getComputedStyle(stage).getPropertyValue("--s")) || 1;
    }
    list = usable();
    var cut = list.filter(function (e) {
      var r = e.getClientRects()[0];
      return r.left < A.l - 0.5 || r.top < A.t - 0.5 || r.right > A.r + 0.5 || r.bottom > A.b + 0.5;
    });
    var names = cut.map(function (e) {
      return (e.getAttribute("aria-label") || e.textContent || e.className || e.tagName).trim().replace(/\s+/g, " ").slice(0, 28);
    });
    stage.style.removeProperty("transition");
    var text = 16 * s * 0.72;
    window.__frame = { mode: mode, s: s, cut: names, usable: list.length };
    out.textContent =
      "window   " + innerWidth + " x " + innerHeight + "\n" +
      "scale    " + s.toFixed(3) + "  (a 16 px label shows at " + text.toFixed(1) + " px)\n" +
      "usable   " + list.length + " links and buttons\n" +
      "cut      " + (cut.length ? cut.length + ": " + names.slice(0, 6).join(", ") + (cut.length > 6 ? ", ..." : "") : "none");
  }
  var pending = 0;
  function later() {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(frame);
  }
  addEventListener("resize", later);
  // after the room, the toys and the fonts are in place
  addEventListener("load", function () {
    setTimeout(frame, 300);
    if (document.fonts) document.fonts.ready.then(later);
  });
})();
