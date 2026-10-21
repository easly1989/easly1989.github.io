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
    "planora.html": [[".thing.jar", "planora"]],
    "cupid.html": [[".thing.envelope", "cupid"]],
    "donate.html": [[".mug .cup", "mug"], [".mug .puddle", "puddle"]],
    "about.html": [[".camera .film", "photo"]],
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

  // ---- facing the reader: undo every rotation between the element and the screen --
  function rot(e) {
    var t = getComputedStyle(e).transform;
    if (!t || t === "none") return new DOMMatrix();
    var m = new DOMMatrix(t);
    var c = [[m.m11, m.m12, m.m13], [m.m21, m.m22, m.m23], [m.m31, m.m32, m.m33]].map(function (v) {
      var n = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / n, v[1] / n, v[2] / n];
    });
    return new DOMMatrix([c[0][0], c[0][1], c[0][2], 0, c[1][0], c[1][1], c[1][2], 0, c[2][0], c[2][1], c[2][2], 0, 0, 0, 0, 1]);
  }
  function facing(e) {
    var chain = [];
    for (var n = e.parentElement; n; n = n.parentElement) {
      chain.push(n);
      if (n === stage) break;
    }
    var M = new DOMMatrix();
    for (var i = chain.length - 1; i >= 0; i--) M = M.multiply(rot(chain[i]));
    return M.inverse();
  }
  // Up first, straight, high enough that turning cannot sweep it into the desk or
  // into what stands beside it; only then turned to face the reader.
  var EASE = " .45s cubic-bezier(.2,.8,.2,1)";
  function clear(e) {
    return Math.round(Math.hypot(e.offsetWidth, e.offsetHeight) / 2 + 24) + "px";
  }
  function raise(e, on) {
    if (e.classList.contains("thing")) e.style.setProperty("--lift", on ? clear(e) : "");
    else e.style.translate = on ? "0 0 " + clear(e) : "";
  }
  function pose(e, instant) {
    e.style.transition = instant ? "none" : "transform" + EASE + ", translate" + EASE;
    raise(e, true);
    if (instant) {
      e.style.transform = facing(e).toString() + " translateZ(60px)";
      e.getBoundingClientRect();
      return;
    }
    after(e, "translate", function () {
      e.style.transform = facing(e).toString() + " translateZ(60px)";
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
  function unpose(e) {
    e.style.transition = "transform" + EASE + ", translate" + EASE;
    e.style.transform = "";
    after(e, "transform", function () {
      raise(e, false);
      after(e, "translate", function () {
        e.style.transition = "";
      });
    });
  }

  // ---- leaving: b lifts the object first; a lets today's move play -----------------
  if (VT === "b")
    document.addEventListener(
      "click",
      function (ev) {
        var a = ev.target.closest && ev.target.closest("a.thing[href]");
        if (!a || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
        var page = file(a.getAttribute("href"));
        if (!POSE[page]) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        var gone = false;
        function go() {
          if (gone) return;
          gone = true;
          location.href = a.href;
        }
        each(page, function (e) {
          pose(e);
          e.addEventListener("transitionend", function (t) {
            if (t.target === e && t.propertyName === "transform") go();
          });
        });
        log("lifting for " + page);
        setTimeout(go, 3000);
      },
      true
    );

  addEventListener("pageswap", function (e) {
    if (!e.viewTransition || VT === "off" || !e.activation) return;
    var page = file(e.activation.entry.url);
    var names = [];
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
    setTimeout(function () {
      Object.keys(PAIRS).forEach(function (p) {
        each(p, function (el) {
          el.style.viewTransitionName = "";
          if (el.style.transform) unpose(el);
        });
      });
    }, 1200);
  });
})();
