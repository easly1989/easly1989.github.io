/* The room's opening moves (home only, right after room.js, not deferred: a page loaded
   fresh is revealed while it is still loading, and the morph back must be named by then).
   Picking up a project object plays its move: it rises straight up, clear of the desk and of
   what stands beside it, turns to face the reader, and morphs into its page's counterpart
   through a cross-document view transition. Coming back is the reverse. The mug falls and
   its coffee floods the view instead; the camera flashes and ejects its print first; the
   sticky note peels off into the Write to me sheet. The camera takes one of the photos
   (photos.js) each time; back from About the photo lands in its place in the room, from where
   it can be picked up again. The objects are named only for the trip,
   and from the click that starts a move the page is inert until it has gone. It has no
   interface: it listens to clicks and to pageswap, pagereveal and pageshow. */
(function () {
  "use strict";
  if (!document.documentElement.classList.contains("iso") || !window.ROOM) return;
  var stage = ROOM.stage;
  var still = matchMedia("(prefers-reduced-motion: reduce)");
  // without cross-document view transitions (Firefox today) the pages simply load
  var morphs = "onpagereveal" in window;

  // ---- the pairs: what is named in the room, and for which page ---------------------
  var PAIRS = {
    "cloudbank.html": [["#ledger", "cloudbank"]],
    "nutreek.html": [["#agenda", "nutreek"]],
    "social-contacts-sync.html": [[".thing.cards", "scs"]],
    // an idea comes out of the jar and unfolds: that slip, not the round jar, becomes the label
    "planora.html": [[".jar .jar-idea", "planora"]],
    "cupid.html": [[".thing.envelope", "cupid"]],
    "asf-notifier.html": [[".thing.pager", "asf"]],
    "donate.html": [[".mug .cup", "mug"], [".mug .puddle", "puddle"]],
    "about.html": [[".camera .film", "photo"]],
    // named only on the way to the console: left on, it would ride over every other morph
    "terminal.html": [[".pc .glass", "crt"]],
  };
  // what rises to face the reader (the mug spills instead, the computer works as it does)
  var POSE = { "cloudbank.html": 1, "nutreek.html": 1, "social-contacts-sync.html": 1, "planora.html": 1, "cupid.html": 1, "asf-notifier.html": 1, "about.html": 1 };
  function file(url) {
    return new URL(url, location.href).pathname.split("/").pop() || "index.html";
  }
  function each(page, fn) {
    (PAIRS[page] || []).forEach(function (p) {
      var e = document.querySelector(p[0]);
      if (e) fn(e, p[1]);
    });
  }

  // ---- facing the reader: undo everything between the element and the screen --------
  // Every ancestor's turn, tilt and scale (its translate, rotate and scale as well as its
  // transform) is undone, then one even scale is put back, so the thing faces the reader
  // square and undistorted, at about the size the room shows it
  function linear(n) {
    var m = ROOM.localMatrix(n);
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
    var cx = M.m12 * M.m23 - M.m13 * M.m22,
      cy = M.m13 * M.m21 - M.m11 * M.m23,
      cz = M.m11 * M.m22 - M.m12 * M.m21;
    return Math.sqrt(Math.hypot(cx, cy, cz)) || 1;
  }
  function facing(e) {
    var M = chain(e),
      k = planeScale(M);
    return M.inverse().scale(k, k, k);
  }
  // Up first, straight, high enough that turning cannot sweep it into the desk or into
  // what stands beside it; only then turned to face the reader.
  var EASE = " .35s cubic-bezier(.2,.8,.2,1)";
  function clear(e) {
    var up = Math.hypot(e.offsetWidth, e.offsetHeight) / 2 + 24;
    // Planora's idea starts at the bottom of the jar: first out of it, then clear of it
    var jar = e.classList.contains("jar-idea") && e.closest(".thing.jar");
    if (jar) up += parseFloat(getComputedStyle(jar).getPropertyValue("--h3")) || 200;
    // The lift is a translate in the parent's units. The envelope is scaled down flat,
    // onto a computer that is scaled up whole, so its size and its depth scale apart:
    // measure the size in the parent's plane and turn it into the parent's depth
    var M = chain(e),
      kp = planeScale(M);
    up += (Math.hypot(e.offsetWidth, e.offsetHeight) / 2) * (planeScale(M.multiply(linear(e))) / kp - 1);
    up *= kp / (Math.hypot(M.m31, M.m32, M.m33) || 1);
    return Math.round(up) + "px";
  }
  // says whether it moved: a lift that changes nothing ends no transition to wait for
  function raise(e, on) {
    // on the desk a thing lifts by --lift; pinned on a wall, lying on the computer or inside
    // another thing, it moves by its own translate, which --lift does not drive there
    var desk = e.classList.contains("thing") && !e.closest(".on-wall, .pc"),
      was = desk ? e.style.getPropertyValue("--lift") : e.style.translate;
    if (desk) e.style.setProperty("--lift", on ? clear(e) : "");
    else e.style.translate = on ? "0 0 " + clear(e) : "";
    return (desk ? e.style.getPropertyValue("--lift") : e.style.translate) !== was;
  }
  function turn(e) {
    e.style.transform = facing(e).toString() + " translateZ(60px)";
    e.classList.add("unfolded"); // a folded thing (Planora's idea) opens out as it turns
  }
  function pose(e, instant, done) {
    e.style.transition = instant ? "none" : "transform" + EASE + ", translate" + EASE;
    var moved = raise(e, true);
    if (instant) {
      turn(e);
      e.getBoundingClientRect();
      return;
    }
    function then() {
      turn(e);
      after(e, "transform", done);
    }
    if (moved) after(e, "translate", then);
    else then();
  }
  function unpose(e) {
    e.style.transition = "transform" + EASE + ", translate" + EASE;
    e.style.transform = "";
    e.classList.remove("unfolded");
    after(e, "transform", function () {
      if (raise(e, false))
        after(e, "translate", function () {
          e.style.transition = "";
        });
      else e.style.transition = "";
    });
  }
  // the next step starts when this one has ended, so slowed animations stay in order
  function after(e, prop, fn) {
    var done = false;
    function once(t) {
      if (done || (t && (t.target !== e || t.propertyName !== prop))) return;
      done = true;
      e.removeEventListener("transitionend", once);
      if (fn) fn();
    }
    e.addEventListener("transitionend", once);
    setTimeout(once, 1200);
  }

  // ---- the mug: it falls over, and the coffee spreads over the whole view ------------
  // The coffee is a flat layer outside the room, and on the way it becomes the spill on
  // the Donate page. Coming back nothing is played: the mug simply stands full again.
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
  function circle(c, p, r) {
    c.style.clipPath = "circle(" + r + "px at " + p[0] + "px " + p[1] + "px)";
  }
  function spill(mug, go) {
    mug.classList.add("falling");
    after(mug.querySelector(".cup"), "transform", function () {
      // from the middle of the spill on screen
      var r = mug.querySelector(".puddle").getClientRects()[0];
      var p = r ? [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)] : [innerWidth / 2, innerHeight / 2];
      var c = coffee();
      c.style.transition = "none";
      circle(c, p, 0);
      c.getBoundingClientRect();
      c.style.transition = "clip-path 0.7s cubic-bezier(0.55, 0, 0.8, 0.4) 0.1s";
      circle(c, p, Math.ceil(Math.hypot(innerWidth, innerHeight)));
      after(c, "clip-path", go);
    });
  }
  function refill() {
    var c = document.querySelector(".coffee-cover");
    if (c) c.remove();
    var nav = document.querySelector(".plexi");
    if (nav) nav.style.viewTransitionName = "";
    var mug = document.querySelector(".thing.mug.falling");
    if (!mug) return;
    mug.classList.add("fallen");
    mug.classList.remove("falling");
    mug.getBoundingClientRect();
    mug.classList.remove("fallen");
  }

  // ---- the camera: the flash and the shutter, then the print slides out ---------------
  // A photo taken again leaves its place under the flash
  function unpin(shot) {
    if (shot && ROOM.snaps) ROOM.snaps.show(shot.id, false);
  }
  function shoot(camera, shot, then) {
    camera.classList.add("opening");
    unpin(shot);
    var html = document.documentElement;
    html.classList.add("flashing");
    setTimeout(function () {
      html.classList.remove("flashing");
    }, 600);
    if (window.CRT) {
      CRT.shutter();
      setTimeout(function () {
        CRT.eject(0.5);
      }, 200);
    }
    after(camera.querySelector(".film"), "top", then);
  }
  // the print is back inside at once
  function stow() {
    var camera = document.querySelector(".thing.camera");
    if (!camera) return;
    var film = camera.querySelector(".film");
    film.style.transition = "none";
    film.style.transform = film.style.translate = film.style.viewTransitionName = "";
    film.classList.remove("unfolded");
    camera.classList.remove("ejected", "opening");
    camera.getBoundingClientRect();
    film.style.transition = "";
  }

  // ---- leaving ---------------------------------------------------------------------------
  // the page an object's move is leading to: only that trip names the object; reached
  // another way (the navigation's Donate or About), the page just comes in
  var trip = "";
  document.addEventListener(
    "click",
    function (ev) {
      var a = ev.target.closest && ev.target.closest("a.thing[href]");
      // Shift, Ctrl or Cmd-click: the browser's own way, a new tab or a new window
      if (!a || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      var page = file(a.getAttribute("href"));
      if (!POSE[page] && page !== "donate.html") return;
      var shot = a.classList.contains("camera") && window.PHOTOS ? PHOTOS.shoot() : null;
      // under reduced motion, or with no morphs to land in, the link just opens its page,
      // without the flat bench's moves (site.js)
      if (still.matches || !morphs) {
        unpin(shot);
        return ev.stopImmediatePropagation();
      }
      ev.preventDefault();
      ev.stopImmediatePropagation();
      trip = page;
      // from here the page is leaving: nothing else answers, or a second click mid-move
      // would start a second move, or open another page under this one's
      document.body.inert = true;
      var gone = false;
      function go() {
        if (gone) return;
        gone = true;
        location.href = a.href;
      }
      // whatever happens, the page opens
      setTimeout(go, 2400);
      if (page === "donate.html") return spill(a, go);
      if (page === "cloudbank.html") a.classList.add("unbanded"); // the band slips off as it rises
      function lift() {
        each(page, function (e) {
          pose(e, false, go);
        });
      }
      if (shot) shoot(a, shot, lift);
      else lift();
    },
    true
  );
  // A pinned photo picked up opens About on itself, developed; it is what morphs into About's
  // photo, and back in the room it lands in the same place
  var picked = null;
  document.addEventListener(
    "click",
    function (ev) {
      var s = ev.target.closest && ev.target.closest(".snap.out");
      if (!s || !window.PHOTOS || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      PHOTOS.choose(s.dataset.photo);
      picked = s;
      trip = "about.html";
      document.body.inert = true;
    },
    true
  );

  addEventListener("pageswap", function (e) {
    if (!e.viewTransition || !e.activation) return;
    var page = file(e.activation.entry.url);
    if (PAIRS[page] && page !== "terminal.html" && page !== trip) return;
    if (page === "about.html" && picked) {
      picked.style.viewTransitionName = "photo";
      return;
    }
    if (page === "donate.html") {
      // the coffee over the view becomes the spill on the Donate page; nothing else rides
      // over it, not even the neon navigation
      var cover = document.querySelector(".coffee-cover");
      if (cover) cover.style.viewTransitionName = "puddle";
      document.querySelector(".plexi").style.viewTransitionName = "none";
      return;
    }
    each(page, function (el, name) {
      el.style.viewTransitionName = name;
    });
  });

  // ---- coming back: the page's counterpart lands on its object --------------------------
  addEventListener("pagereveal", function (e) {
    if (!e.viewTransition) return;
    var from = navigation.activation && navigation.activation.from;
    if (!from) return;
    var page = file(from.url);
    if (page === "donate.html") return refill();
    // the print never goes back into the camera: it comes back inside, unmorphed, and
    // About's photo morphs into its place in the room instead (room.js has put it out)
    if (page === "about.html") {
      stow();
      var snap = ROOM.snaps && ROOM.snaps.landed();
      if (!snap) return;
      snap.style.viewTransitionName = "photo";
      e.viewTransition.finished.finally(function () {
        snap.style.viewTransitionName = "";
      });
      return;
    }
    var named = [];
    each(page, function (el, name) {
      if (POSE[page]) pose(el, true);
      el.style.viewTransitionName = name;
      named.push(el);
    });
    e.viewTransition.finished.finally(function () {
      named.forEach(function (el) {
        el.style.viewTransitionName = "";
        if (POSE[page]) unpose(el);
      });
    });
  });

  // the back/forward cache brings the page back as it was left: names off, objects down
  addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    document.body.inert = false;
    trip = "";
    if (picked) picked.style.viewTransitionName = "";
    picked = null;
    refill();
    stow();
    [].forEach.call(document.querySelectorAll(".unbanded"), function (t) {
      t.classList.remove("unbanded");
    });
    setTimeout(function () {
      Object.keys(PAIRS).forEach(function (p) {
        each(p, function (el) {
          el.style.viewTransitionName = "";
          if (el.style.transform) unpose(el);
        });
      });
    }, 600);
  });

  // ---- the sticky note peels off and becomes the Write to me sheet ----------------------
  // A same-document view transition round the sheet site.js opens and closes: the note is
  // named going in, the sheet coming out, and the reverse on closing.
  var note = document.querySelector(".thing.sticky");
  var passing = false;
  function swap(from, to, change) {
    if (!document.startViewTransition || still.matches) return change();
    from.style.viewTransitionName = "sheet";
    var t = document.startViewTransition(function () {
      from.style.viewTransitionName = "";
      change();
      to().style.viewTransitionName = "sheet";
    });
    t.finished.finally(function () {
      to().style.viewTransitionName = "";
    });
  }
  function paper() {
    return document.querySelector(".sheet-dialog .sheet");
  }
  if (note)
    note.addEventListener(
      "click",
      function (ev) {
        if (passing) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        swap(note, paper, function () {
          passing = true;
          note.click(); // site.js opens the sheet
          passing = false;
        });
      },
      true
    );
  // However it is closed (its button, outside it, sending the form, Esc), it goes back.
  // The sheet is site.js's, which is deferred: it is there once the page is parsed
  document.addEventListener("DOMContentLoaded", function () {
    var dialog = document.querySelector(".sheet-dialog");
    if (!dialog || !note) return;
    var shut = dialog.close.bind(dialog);
    dialog.close = function () {
      if (!dialog.open) return shut();
      swap(paper(), function () {
        return note;
      }, shut);
    };
    // Esc closes it natively; where that cannot be held back, it closes without the move
    dialog.addEventListener("cancel", function (ev) {
      if (!ev.cancelable) return;
      ev.preventDefault();
      dialog.close();
    });
  });
})();
