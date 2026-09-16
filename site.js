/* =========================================================================
   Shared behaviour for every page. No dependencies, no build.

   Five jobs:
   1. Reveal blocks as they scroll into view.
   2. Condense the sticky header once you leave the top.
   3. On the home page, move the page accent to whichever product you are
      reading, so the header rule and the buttons follow you down the page.
   4. Answer the pointer: a glow that trails the cursor, a highlight inside
      whichever pane it is over, a tilt on screenshots, a lean on buttons.
      All of that is skipped entirely on touch, where there is no cursor to
      answer and the work would only cost battery.
   5. Turn each .reel of screenshots into a carousel.

   Everything here is an enhancement. The stylesheet only hides a .reveal while
   `html.js-motion` is set, and this file removes that class if the observer
   turns out not to deliver — so a browser that throttles or never runs this
   still shows the whole page.
   ========================================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var dark = window.matchMedia("(prefers-color-scheme: dark)");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;

  // ---- Reveals ----------------------------------------------------------
  var blocks = [].slice.call(document.querySelectorAll(".reveal"));

  if (blocks.length && canObserve && !reduced) {
    root.classList.add("js-motion");

    // Number the children of a staggered block so CSS can delay them in order.
    blocks.forEach(function (el) {
      if (!el.classList.contains("stagger")) return;
      [].slice.call(el.children).forEach(function (child, i) {
        child.style.setProperty("--i", i);
      });
    });

    var delivered = false;

    var reveal = new IntersectionObserver(
      function (entries) {
        delivered = true;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("shown");
          reveal.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    blocks.forEach(function (el) {
      reveal.observe(el);
    });

    // Failsafe, but a narrow one: if the observer has not delivered a single
    // callback by now it is not going to, so drop the hiding rule entirely.
    // A blanket "show everything" timer would also fire on a healthy browser
    // and reveal the whole page before the reader had scrolled to it.
    window.setTimeout(function () {
      if (delivered) return;
      reveal.disconnect();
      root.classList.remove("js-motion");
    }, 2000);
  }

  // ---- Sticky header ----------------------------------------------------
  var bar = document.querySelector(".bar");
  if (bar) {
    var scrolled = false;
    var onScroll = function () {
      var past = window.scrollY > 24;
      if (past === scrolled) return;
      scrolled = past;
      bar.classList.toggle("scrolled", past);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---- Reels --------------------------------------------------------------
  // A reel with one shot in it stays a plain figure: controls for a carousel
  // of one would be furniture with nothing behind it.
  [].slice.call(document.querySelectorAll(".reel")).forEach(function (reel) {
    var shots = [].slice.call(reel.querySelectorAll(":scope > figure"));
    if (shots.length < 2) return;

    var DWELL = 5200;
    var index = 0;
    var timer = null;
    var stopped = reduced; // reduced motion: manual only, never auto-advances
    var away = false; // off screen
    var hovering = false;

    reel.classList.add("is-live");
    reel.style.setProperty("--dwell", DWELL + "ms");
    reel.setAttribute("role", "group");
    reel.setAttribute("aria-roledescription", "carousel");

    var controls = document.createElement("div");
    controls.className = "reel-bar";
    var track = document.createElement("div");
    track.className = "reel-track";
    track.appendChild(document.createElement("i"));
    var dots = document.createElement("div");
    dots.className = "reel-dots";
    var play = document.createElement("button");
    play.className = "reel-play";
    play.type = "button";

    var ICON_PAUSE =
      '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="3" height="9" rx="1"/><rect x="7" y="1.5" width="3" height="9" rx="1"/></svg>';
    var ICON_PLAY =
      '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4a.6.6 0 0 0 .92.5l6.5-4.2a.6.6 0 0 0 0-1L3.92 1.3A.6.6 0 0 0 3 1.8z"/></svg>';

    var buttons = shots.map(function (shot, i) {
      shot.setAttribute("aria-roledescription", "slide");
      shot.setAttribute("aria-label", i + 1 + " of " + shots.length);

      var dot = document.createElement("button");
      dot.className = "reel-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", "Screenshot " + (i + 1) + " of " + shots.length);
      dot.addEventListener("click", function () {
        show(i);
        hold();
      });
      dots.appendChild(dot);
      return dot;
    });

    function show(next) {
      if (next === index) return;
      var from = shots[index];
      from.classList.add("leaving");
      from.classList.remove("current");
      window.setTimeout(function () {
        from.classList.remove("leaving");
      }, 620);
      index = (next + shots.length) % shots.length;
      paint();
    }

    function paint() {
      shots.forEach(function (shot, i) {
        var on = i === index;
        shot.classList.toggle("current", on);
        shot.setAttribute("aria-hidden", on ? "false" : "true");
      });
      buttons.forEach(function (dot, i) {
        if (i === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      restartDwell();
    }

    // Re-trigger the progress animation from zero for the new slide.
    function restartDwell() {
      var fill = track.firstChild;
      reel.classList.remove("playing");
      void fill.offsetWidth;
      if (running()) reel.classList.add("playing");
    }

    function running() {
      return !stopped && !away && !hovering;
    }

    function tick() {
      window.clearTimeout(timer);
      if (!running()) return;
      timer = window.setTimeout(function () {
        show(index + 1);
        tick();
      }, DWELL);
    }

    function hold() {
      // An explicit choice stops the rotation; the reader is driving now.
      stopped = true;
      window.clearTimeout(timer);
      reel.classList.remove("playing");
      play.innerHTML = ICON_PLAY;
      play.setAttribute("aria-label", "Play screenshots");
    }

    function resume() {
      stopped = false;
      play.innerHTML = ICON_PAUSE;
      play.setAttribute("aria-label", "Pause screenshots");
      restartDwell();
      tick();
    }

    play.innerHTML = stopped ? ICON_PLAY : ICON_PAUSE;
    play.setAttribute("aria-label", stopped ? "Play screenshots" : "Pause screenshots");
    play.addEventListener("click", function () {
      if (stopped) resume();
      else hold();
    });

    controls.appendChild(track);
    controls.appendChild(dots);
    controls.appendChild(play);
    reel.appendChild(controls);

    // Hovering or tabbing into the reel pauses it without claiming the reader
    // meant to stop it for good.
    ["pointerenter", "focusin"].forEach(function (evt) {
      reel.addEventListener(evt, function () {
        hovering = true;
        window.clearTimeout(timer);
        reel.classList.remove("playing");
      });
    });

    ["pointerleave", "focusout"].forEach(function (evt) {
      reel.addEventListener(evt, function () {
        if (evt === "focusout" && reel.contains(document.activeElement)) return;
        hovering = false;
        restartDwell();
        tick();
      });
    });

    reel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
      else return;
      hold();
      e.preventDefault();
    });

    // Nothing rotates while it is off screen.
    if (canObserve) {
      new IntersectionObserver(
        function (entries) {
          away = !entries[0].isIntersecting;
          if (away) {
            window.clearTimeout(timer);
            reel.classList.remove("playing");
          } else {
            restartDwell();
            tick();
          }
        },
        { threshold: 0.2 },
      ).observe(reel);
    }

    paint();
    tick();
  });


  // ---- Copy buttons -------------------------------------------------------
  // Only offered where the clipboard is actually available; the value stays
  // selectable text either way.
  if (navigator.clipboard) {
    [].slice.call(document.querySelectorAll("[data-copy]")).forEach(function (el) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy " + el.dataset.copy);
      btn.setAttribute("aria-live", "polite");

      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(el.textContent.trim()).then(
          function () {
            btn.textContent = "Copied";
            window.setTimeout(function () {
              btn.textContent = "Copy";
            }, 1600);
          },
          function () {
            // Clipboard refused (no user activation, insecure context, a
            // permissions policy). Select the value so the advice is usable.
            var range = document.createRange();
            range.selectNodeContents(el);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            btn.textContent = "Press Ctrl+C";
          },
        );
      });

      el.insertAdjacentElement("afterend", btn);
    });
  }

  // ---- Pointer ------------------------------------------------------------
  var fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (fineQuery.matches && !reduced) {
    root.classList.add("pointer-fine");

    // A hybrid machine can gain or lose its mouse mid-session.
    fineQuery.addEventListener("change", function (e) {
      root.classList.toggle("pointer-fine", e.matches);
    });

    // One rAF-batched writer for the background glow: pointermove fires far
    // more often than the screen updates, so we only keep the latest position.
    var pending = false;
    var px = 0;
    var py = 0;

    var writeGlow = function () {
      pending = false;
      root.style.setProperty("--mx", px + "px");
      root.style.setProperty("--my", py + "px");
    };

    document.addEventListener(
      "pointermove",
      function (e) {
        px = e.clientX;
        py = e.clientY;
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(writeGlow);
      },
      { passive: true },
    );

    // Panes light up where the pointer is. The glow is drawn in a ::before, so
    // it only goes on panes whose children sit above it — never on <pre>, whose
    // children are raw text nodes.
    var panes = document.querySelectorAll(".pane, .defs, .note, .flow");
    [].slice.call(panes).forEach(function (pane) {
      var queued = false;
      var last = null;

      var writeSpot = function () {
        queued = false;
        if (!last) return;
        var box = pane.getBoundingClientRect();
        pane.style.setProperty("--px", ((last.x - box.left) / box.width) * 100 + "%");
        pane.style.setProperty("--py", ((last.y - box.top) / box.height) * 100 + "%");
      };

      pane.addEventListener(
        "pointermove",
        function (e) {
          last = { x: e.clientX, y: e.clientY };
          if (queued) return;
          queued = true;
          window.requestAnimationFrame(writeSpot);
        },
        { passive: true },
      );
    });

    // Screenshots tip toward the pointer, by a few degrees at most.
    [].slice.call(document.querySelectorAll("figure")).forEach(function (fig) {
      var img = fig.querySelector("img");
      if (!img) return;
      var queued = false;
      var at = null;

      var writeTilt = function () {
        queued = false;
        if (!at) return;
        var box = fig.getBoundingClientRect();
        var dx = (at.x - box.left) / box.width - 0.5;
        var dy = (at.y - box.top) / box.height - 0.5;
        img.style.setProperty("--tx", dx.toFixed(3));
        img.style.setProperty("--ty", (-dy).toFixed(3));
        img.style.setProperty("--tilt", (Math.hypot(dx, dy) * 7).toFixed(2) + "deg");
      };

      fig.addEventListener(
        "pointermove",
        function (e) {
          at = { x: e.clientX, y: e.clientY };
          if (queued) return;
          queued = true;
          window.requestAnimationFrame(writeTilt);
        },
        { passive: true },
      );

      fig.addEventListener("pointerleave", function () {
        at = null;
        img.style.setProperty("--tilt", "0deg");
      });
    });

    // Buttons lean toward the pointer while it is near them.
    [].slice.call(document.querySelectorAll(".action")).forEach(function (btn) {
      btn.addEventListener(
        "pointermove",
        function (e) {
          var box = btn.getBoundingClientRect();
          var dx = (e.clientX - box.left) / box.width - 0.5;
          var dy = (e.clientY - box.top) / box.height - 0.5;
          btn.style.setProperty("--magnet-x", (dx * 7).toFixed(1) + "px");
          btn.style.setProperty("--magnet-y", (dy * 5).toFixed(1) + "px");
        },
        { passive: true },
      );

      btn.addEventListener("pointerleave", function () {
        btn.style.removeProperty("--magnet-x");
        btn.style.removeProperty("--magnet-y");
      });
    });
  }

  // ---- The accent follows the product you are reading --------------------
  // A themed section is simply one that sets its own --accent in CSS; marking
  // it with data-accent opts it in here. The colour is read back from the
  // cascade rather than repeated in the markup, so light and dark keep working
  // from the single set of values in the page's stylesheet.
  var themed = [].slice.call(document.querySelectorAll("main [data-accent]"));
  if (themed.length && canObserve) {
    var current = null;

    var colourOf = function (el) {
      return getComputedStyle(el).getPropertyValue("--accent").trim();
    };

    // The page's own accent, read with any painted override lifted. Removing
    // and restoring the inline value inside one task never reaches the screen.
    var baseAccent = function () {
      var painted = root.style.getPropertyValue("--accent");
      root.style.removeProperty("--accent");
      var value = colourOf(root);
      if (painted) root.style.setProperty("--accent", painted);
      return value;
    };

    var paint = function (el) {
      current = el;
      root.style.setProperty("--accent", el ? colourOf(el) : baseAccent());
    };

    var theme = new IntersectionObserver(
      function (entries) {
        // Whichever themed section is highest on screen wins.
        var best = null;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (!best || entry.boundingClientRect.top < best.boundingClientRect.top) {
            best = entry;
          }
        });
        if (best) paint(best.target);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    themed.forEach(function (el) {
      theme.observe(el);
    });

    // Back at the top, return to the page's own accent.
    window.addEventListener(
      "scroll",
      function () {
        if (window.scrollY < 140 && current !== null) paint(null);
      },
      { passive: true },
    );

    // Keep the painted accent correct if the system flips light or dark.
    dark.addEventListener("change", function () {
      paint(current);
    });
  }
})();
