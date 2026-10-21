/* PROTOTYPE, throwaway: can today's page morphs survive a 3D room?
   ?vt=off  no names in the room: the page just cross-fades (the mockup today)
   ?vt=a    today's opening moves, then the object is named as the page is left
   ?vt=b    the object is lifted to face the reader, then named and morphed
   The neon navigation in plexiglass on the right wall is named "bar" in a and b. */
(function () {
  "use strict";
  if (!document.documentElement.classList.contains("b3")) return;
  var VT = new URLSearchParams(location.search).get("vt") || sessionStorage.getItem("vt") || "b";
  sessionStorage.setItem("vt", VT);
  var stage = document.querySelector(".stage");
  var room = document.querySelector(".room");

  // ---- the neon navigation in plexiglass, top of the right wall ----------------
  var css = document.createElement("style");
  css.textContent =
    ".vt-bar{position:fixed;left:12px;bottom:12px;z-index:99;display:flex;gap:6px;align-items:center;padding:6px 10px;" +
    "background:#111c;color:#fff;font:13px system-ui;border-radius:8px}.vt-bar a{color:#fff;padding:2px 8px;border-radius:5px}" +
    ".vt-bar a.on{background:#fff;color:#111}";
  document.head.appendChild(css);
  var nav = document.querySelector(".plexi");
  if (VT !== "off") nav.style.viewTransitionName = "bar";

  var bar = document.createElement("div");
  bar.className = "vt-bar";
  bar.innerHTML = "prototype: " + ["off", "a", "b"].map(function (v) {
    return '<a href="?vt=' + v + '"' + (v === VT ? ' class="on"' : "") + ">" + v + "</a>";
  }).join("") + ' <span class="vt-log"></span>';
  document.body.appendChild(bar);
  function log(s) {
    bar.querySelector(".vt-log").textContent = s;
    console.log("[vt]", s);
  }

  // ---- the pairs: what is named on the bench, and for which page ----------------
  var PAIRS = {
    "cloudbank.html": [["#ledger", "cloudbank"]],
    "nutreek.html": [["#agenda", "nutreek"]],
    "social-contacts-sync.html": [[".thing.cards", "scs"]],
    // an idea comes out of the jar and unfolds: that slip, not the round jar, becomes the label
    "planora.html": [[".jar .jar-idea", "planora"]],
    "cupid.html": [[".thing.envelope", "cupid"]],
    "donate.html": [[".mug .cup", "mug"], [".mug .puddle", "puddle"]],
    "about.html": [[".camera .film", "photo"]],
    // named only on the way to the console: left on, it rides over every other morph
    "terminal.html": [[".pc .glass", "crt"]],
  };
  // what b lifts to face the reader (the mug stays as it spilled)
  var POSE = { "cloudbank.html": 1, "nutreek.html": 1, "social-contacts-sync.html": 1, "planora.html": 1, "cupid.html": 1, "about.html": 1 };
  function file(url) {
    return new URL(url, location.href).pathname.split("/").pop() || "index.html";
  }
  function each(page, fn) {
    (PAIRS[page] || []).forEach(function (p) {
      var e = document.querySelector(p[0]);
      if (e) fn(e, p[1]);
    });
  }

  // ---- facing the reader: undo everything between the element and the screen ------
  // Every ancestor's turn, tilt and scale (its translate, rotate and scale as well as its
  // transform) is undone, then one even scale is put back, so the thing faces the reader
  // square and undistorted, at about the size the room shows it
  function linear(n) {
    var m = window.__room.localMatrix(n);
    m.m41 = m.m42 = m.m43 = 0;
    return m;
  }
  function chain(e) {
    var M = new DOMMatrix();
    for (var n = e.parentElement; n; n = n.parentElement) {
      M = linear(n).multiply(M);
      if (n === stage) break;
    }
    return M;
  }
  // the even scale is the one in the thing's own plane: a depth scale (the computer's)
  // would make a flat thing come up larger than it lies
  function planeScale(M) {
    var cx = M.m12 * M.m23 - M.m13 * M.m22, cy = M.m13 * M.m21 - M.m11 * M.m23, cz = M.m11 * M.m22 - M.m12 * M.m21;
    return Math.sqrt(Math.hypot(cx, cy, cz)) || 1;
  }
  function facing(e) {
    var M = chain(e), k = planeScale(M);
    return M.inverse().scale(k, k, k);
  }
  // Up first, straight, high enough that turning cannot sweep it into the desk or
  // into what stands beside it; only then turned to face the reader.
  var EASE = " .45s cubic-bezier(.2,.8,.2,1)";
  function clear(e) {
    var up = Math.hypot(e.offsetWidth, e.offsetHeight) / 2 + 24;
    // Planora's idea starts at the bottom of the jar: first out of it, then clear of it
    var jar = e.classList.contains("jar-idea") && e.closest(".thing.jar");
    if (jar) up += parseFloat(getComputedStyle(jar).getPropertyValue("--h3")) || 200;
    // The lift is a translate in the parent's units. The envelope is scaled down flat,
    // onto a computer that is scaled up whole, so its size and its depth scale apart:
    // measure the size in the parent's plane and turn it into the parent's depth
    var M = chain(e), kp = planeScale(M);
    up += (Math.hypot(e.offsetWidth, e.offsetHeight) / 2) * (planeScale(M.multiply(linear(e))) / kp - 1);
    up *= kp / (Math.hypot(M.m31, M.m32, M.m33) || 1);
    return Math.round(up) + "px";
  }
  function raise(e, on) {
    // on the desk a thing lifts by --lift; pinned on a wall, or lying on the computer, it
    // moves by its own translate, which --lift does not drive there
    if (e.classList.contains("thing") && !e.closest(".on-wall, .pc")) e.style.setProperty("--lift", on ? clear(e) : "");
    else e.style.translate = on ? "0 0 " + clear(e) : "";
  }
  function pose(e, instant) {
    e.style.transition = instant ? "none" : "transform" + EASE + ", translate" + EASE;
    raise(e, true);
    if (instant) {
      e.style.transform = facing(e).toString() + " translateZ(60px)";
      e.classList.add("unfolded");
      e.getBoundingClientRect();
      return;
    }
    after(e, "translate", function () {
      e.style.transform = facing(e).toString() + " translateZ(60px)";
      e.classList.add("unfolded"); // a folded thing (Planora's idea) opens out as it turns
    });
  }
  // the next step starts when this one has ended, so slowed animations stay in order
  function after(e, prop, fn) {
    var done = false;
    function once(t) {
      if (done || (t && (t.target !== e || t.propertyName !== prop))) return;
      done = true;
      e.removeEventListener("transitionend", once);
      fn();
    }
    e.addEventListener("transitionend", once);
    setTimeout(once, 2500);
  }
  function unpose(e, done) {
    e.style.transition = "transform" + EASE + ", translate" + EASE;
    e.style.transform = "";
    e.classList.remove("unfolded");
    after(e, "transform", function () {
      raise(e, false);
      after(e, "translate", function () {
        e.style.transition = "";
        if (done) done();
      });
    });
  }
  // ---- the photos: each shot stays on the bench ------------------------------------
  // The camera takes one of the photos (photos.js) and the About page shows it. A print
  // cannot go back into the camera: back on the bench the page's photo becomes the one in
  // its own place on the wall or the computer, and the camera has a fresh one inside. A
  // photo taken again leaves its place first. A photo already out can be picked up too:
  // it becomes the About page's, and comes back to the same place.
  var shot = null, picked = null;
  function shoot() {
    if (!window.PHOTOS || shot) return;
    shot = PHOTOS.shoot();
    if (window.__room && __room.snaps) __room.snaps.show(shot.id, false);
  }
  document.addEventListener(
    "click",
    function (ev) {
      var s = ev.target.closest && ev.target.closest(".snap.out");
      if (!s || !window.PHOTOS || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      // it stays on show until the page goes: it is what morphs into the About page's photo
      shot = PHOTOS.choose(s.dataset.photo);
      picked = s;
      PHOTOS.setOut(PHOTOS.out().filter(function (id) {
        return id !== shot.id;
      }));
    },
    true
  );
  // the print is back inside at once, undeveloped
  function stow(camera) {
    var film = camera.querySelector(".film");
    film.style.transition = "none";
    film.style.transform = film.style.translate = "";
    film.classList.remove("unfolded");
    camera.classList.remove("ejected", "opening");
    camera.getBoundingClientRect();
    film.style.transition = "";
  }

  // ---- the mug: it falls over, the coffee spreads and covers the view, and the cover
  // becomes the spill on the Donate page; coming back, the reverse ----------------
  var R = Math.ceil(Math.hypot(innerWidth, innerHeight));
  function coffee() {
    var c = document.querySelector(".coffee-cover");
    if (!c) {
      c = document.createElement("div");
      c.className = "coffee-cover";
      c.setAttribute("aria-hidden", "true");
      document.body.appendChild(c);
    }
    return c;
  }
  // the middle of the spill on screen, where the coffee spreads from and goes back to
  function spillAt(mug) {
    var r = mug.querySelector(".puddle").getClientRects()[0];
    return r ? [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)] : [innerWidth / 2, innerHeight / 2];
  }
  function circle(c, p, r) {
    c.style.clipPath = "circle(" + r + "px at " + p[0] + "px " + p[1] + "px)";
  }
  function spill(mug, go) {
    mug.classList.add("falling");
    after(mug.querySelector(".cup"), "transform", function () {
      var c = coffee(), p = spillAt(mug);
      c.style.transition = "none";
      circle(c, p, 0);
      c.getBoundingClientRect();
      c.style.transition = "clip-path 0.8s cubic-bezier(0.55, 0, 0.8, 0.4) 0.35s";
      circle(c, p, R);
      after(c, "clip-path", go);
    });
  }
  // back on the bench (also from the back/forward cache, which keeps it spilt): the mug
  // stands full again at once, and the coffee is gone
  function refill() {
    var mug = document.querySelector(".thing.mug.falling");
    var c = document.querySelector(".coffee-cover");
    if (c) c.remove();
    [".cat", ".plexi"].forEach(function (q) {
      var n = document.querySelector(q);
      if (n && n.style.viewTransitionName === "none") n.style.viewTransitionName = q === ".plexi" && VT !== "off" ? "bar" : "";
    });
    if (!mug) return;
    mug.classList.add("fallen");
    mug.classList.remove("falling");
    mug.getBoundingClientRect();
    mug.classList.remove("fallen");
  }

  // ---- leaving: b lifts the object first; a lets today's move play -----------------
  if (VT === "b")
    document.addEventListener(
      "click",
      function (ev) {
        var a = ev.target.closest && ev.target.closest("a.thing[href]");
        // under reduced motion nothing moves: the link just opens its page
        if (!a || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        var page = file(a.getAttribute("href"));
        if (!POSE[page] && page !== "donate.html") return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        var gone = false;
        function go() {
          if (gone) return;
          gone = true;
          location.href = a.href;
        }
        if (page === "donate.html") {
          spill(a, go);
          log("spilling for donate.html");
          setTimeout(go, 4000);
          return;
        }
        function lift() {
          each(page, function (e) {
            pose(e);
            e.addEventListener("transitionend", function (t) {
              if (t.target === e && t.propertyName === "transform") go();
            });
          });
          log("lifting for " + page);
        }
        var camera = a.classList.contains("camera") ? a : null;
        if (camera) {
          // the flash and the shutter, then the print comes out of the slot, and only
          // then is it picked up
          camera.classList.add("opening");
          shoot(); // under the flash, the photo taken again leaves its place
          var html = document.documentElement;
          html.classList.add("flashing");
          setTimeout(function () {
            html.classList.remove("flashing");
          }, 600);
          if (window.CRT) {
            CRT.shutter();
            setTimeout(function () {
              CRT.eject(1);
            }, 400);
          }
          after(camera.querySelector(".film"), "top", lift);
          setTimeout(go, 4500);
        } else {
          lift();
          setTimeout(go, 3000);
        }
      },
      true
    );

  addEventListener("pageswap", function (e) {
    // About shows a new photo however it is reached
    if (e.activation && file(e.activation.entry.url) === "about.html") shoot();
    if (!e.viewTransition || VT === "off" || !e.activation) return;
    var page = file(e.activation.entry.url);
    var names = [];
    var cover = document.querySelector(".coffee-cover");
    if (VT === "b" && page === "donate.html") {
      // the coffee over the view becomes the spill on the Donate page; nothing else rides
      // over it, not even the cat or the neon sign
      if (cover) cover.style.viewTransitionName = "puddle";
      [".cat", ".plexi"].forEach(function (q) {
        var n = document.querySelector(q);
        if (n) n.style.viewTransitionName = "none";
      });
      log("leaving for donate.html, named the coffee");
      return;
    }
    // a photo picked up from its place goes instead of the camera's print
    if (picked && page === "about.html") {
      picked.style.viewTransitionName = "photo";
      names.push("photo");
    } else
      each(page, function (el, name) {
        el.style.viewTransitionName = name;
        names.push(name);
      });
    log("leaving for " + page + ", named " + (names.join(", ") || "nothing"));
  });

  // ---- coming back: the page's counterpart lands on its object ----------------------
  addEventListener("pagereveal", function (e) {
    if (!e.viewTransition || VT === "off") return;
    var from = navigation.activation && navigation.activation.from;
    if (!from) return;
    var page = file(from.url);
    var named = [];
    if (VT === "b" && page === "donate.html") {
      // coming back nothing is played: the bench, and the mug full again
      refill();
      log("back from donate.html, the mug is full again");
      return;
    }
    // the About page's photo lands in its own place, out, and the camera is ready again
    var shown = page === "about.html" && window.PHOTOS && PHOTOS.shown();
    var snap = shown && window.__room && __room.snaps && __room.snaps.el(shown.id);
    if (snap) {
      PHOTOS.setShown(""); // taken care of here, not by the room's fallback
      var camera = document.querySelector(".thing.camera");
      if (camera) stow(camera);
      __room.snaps.show(shown.id, true);
      snap.style.viewTransitionName = "photo";
      log("back from about.html, the photo goes to its place");
      e.viewTransition.finished.finally(function () {
        snap.style.viewTransitionName = "";
      });
      return;
    }
    if (page === "about.html") return; // the camera's print never comes back
    each(page, function (el, name) {
      if (VT === "b" && POSE[page]) pose(el, true);
      el.style.viewTransitionName = name;
      named.push(el);
    });
    log("back from " + page + ", named " + named.length);
    e.viewTransition.finished.finally(function () {
      named.forEach(function (el) {
        el.style.viewTransitionName = "";
        if (VT === "b" && POSE[page]) unpose(el);
      });
    });
  });
  // the back/forward cache brings the page back as it was left: names off, objects down
  addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    refill();
    // back from About through the cache, which runs its morph with the names as they were
    // left: the camera's print is back inside, and the page's photo lands in its place
    shot = picked = null;
    var camera = document.querySelector(".thing.camera");
    if (camera) {
      stow(camera);
      camera.querySelector(".film").style.viewTransitionName = "";
    }
    [].forEach.call(document.querySelectorAll(".snap"), function (s) {
      s.style.viewTransitionName = "";
    });
    var shown = window.PHOTOS && PHOTOS.shown();
    var snap = shown && window.__room && __room.snaps && __room.snaps.el(shown.id);
    if (snap) {
      PHOTOS.setShown("");
      __room.snaps.show(shown.id, true);
      if (VT !== "off") snap.style.viewTransitionName = "photo";
    }
    setTimeout(function () {
      if (snap) snap.style.viewTransitionName = "";
      Object.keys(PAIRS).forEach(function (p) {
        each(p, function (el) {
          el.style.viewTransitionName = "";
          if (el.style.transform) unpose(el);
        });
      });
    }, 1200);
  });
})();
