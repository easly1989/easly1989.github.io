/* What every page of the bench shares: the ruler, scaling the home bench to
   the window, books you can leaf through, screenshots that open full size,
   the Write to me sheet, and the home objects' opening moves. */
(function () {
  "use strict";
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = matchMedia("(max-width: 900px)");
  // the browser morphs one page into the next (cross-document view transitions)
  var morphs = "PageRevealEvent" in window && !reduced;
  var mat = document.querySelector(".mat");

  // ---- the ruler, in centimetres ------------------------------------------
  if (mat) {
    for (var i = 1; i < 60; i++) {
      var t = document.createElement("span");
      t.className = "ruler";
      t.setAttribute("aria-hidden", "true");
      t.textContent = i * 5;
      t.style.left = 28 + i * 200 - 6 + "px";
      t.style.top = "8px";
      mat.appendChild(t);
      if (i < 30) {
        var l = t.cloneNode(true);
        l.style.left = "6px";
        l.style.top = 28 + i * 200 - 5 + "px";
        mat.appendChild(l);
      }
    }
  }

  // ---- the home bench is drawn at 1280px and scaled to fit -----------------
  var fit = document.querySelector(".fit");
  function scale() {
    if (!fit) return;
    var s = narrow.matches ? 1 : Math.min(1, (fit.clientWidth - 24) / 1280);
    fit.style.setProperty("--s", s);
  }
  scale();
  addEventListener("resize", scale);

  // ---- screenshots open full size ----------------------------------------
  var box = document.createElement("dialog");
  box.className = "lightbox";
  box.innerHTML = '<button class="close" type="button" aria-label="Close">&times;</button><img alt="" /><p></p>';
  document.body.appendChild(box);
  box.querySelector(".close").addEventListener("click", function () { box.close(); });
  box.addEventListener("click", function (e) { if (e.target === box) box.close(); });
  [].forEach.call(document.querySelectorAll(".shot img"), function (img) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "zoom";
    b.setAttribute("aria-label", "Enlarge: " + img.alt);
    img.parentNode.insertBefore(b, img);
    b.appendChild(img);
    b.addEventListener("click", function () {
      box.querySelector("img").src = img.currentSrc || img.src;
      box.querySelector("img").alt = img.alt;
      var cap = img.closest("figure") && img.closest("figure").querySelector("figcaption");
      box.querySelector("p").textContent = cap ? cap.textContent : "";
      box.showModal();
    });
  });

  // ---- sheets picked up off the bench ------------------------------------
  var sheet = document.createElement("dialog");
  sheet.className = "sheet-dialog";
  sheet.setAttribute("aria-labelledby", "sheet-title");
  sheet.innerHTML = '<button class="close" type="button" aria-label="Put it back">&times;</button><div class="sheet"></div>';
  document.body.appendChild(sheet);
  sheet.querySelector(".close").addEventListener("click", function () { sheet.close(); });
  sheet.addEventListener("click", function (e) { if (e.target === sheet) sheet.close(); });
  function openSheet(id) {
    var tpl = document.getElementById("sheet-" + id);
    if (!tpl) return false;
    var body = sheet.querySelector(".sheet");
    body.innerHTML = "";
    body.appendChild(tpl.content.cloneNode(true));
    sheet.classList.toggle("solo", !body.querySelector("img"));
    sheet.showModal();
    return true;
  }
  [].forEach.call(document.querySelectorAll("[data-sheet]"), function (b) {
    b.addEventListener("click", function (e) {
      if (openSheet(b.dataset.sheet)) e.preventDefault();
    });
  });
  if (location.hash === "#write") openSheet("contact");

  // ---- books you can leaf through ----------------------------------------
  [].forEach.call(document.querySelectorAll(".book"), function (book) {
    var leaves = [].slice.call(book.querySelectorAll(".leaf"));
    var nav = book.parentNode.parentNode.querySelector(".book-nav");
    var prev = nav && nav.querySelector("[data-prev]");
    var next = nav && nav.querySelector("[data-next]");
    var out = nav && nav.querySelector("output");
    var tabs = [].slice.call(book.querySelectorAll(".tabs [data-go]"));
    var turned = 0;
    var flipping = 0;

    // Each page gets a corner to turn it by.
    leaves.forEach(function (lf, i) {
      [].forEach.call(lf.querySelectorAll(".page"), function (pg) {
        if (lf.classList.contains("cover") && pg.classList.contains("front")) return;
        var c = document.createElement("button");
        c.type = "button";
        c.className = "corner";
        var forward = pg.classList.contains("front");
        c.setAttribute("aria-label", forward ? "Turn the page" : "Turn back");
        c.dataset.cat = "corner";
        c.addEventListener("click", function () { go(forward ? i + 1 : i); });
        pg.appendChild(c);
      });
    });
    var cover = book.querySelector(".leaf.cover .front");
    if (cover) cover.addEventListener("click", function () { if (turned === 0) go(1); });

    function label() {
      var right = leaves[turned] && leaves[turned].querySelector(".front");
      var left = leaves[turned - 1] && leaves[turned - 1].querySelector(".back");
      var l = (left && left.dataset.label) || "";
      var r = (right && right.dataset.label) || "";
      return turned === 0 ? "Closed" : l && r ? l + " / " + r : l || r;
    }
    function layout() {
      leaves.forEach(function (lf, i) {
        var isTurned = i < turned;
        lf.classList.toggle("turned", isTurned);
        lf.classList.remove("fast");
        lf.style.zIndex = isTurned ? i + 1 : leaves.length - i + 1;
        // a column of pages shows them all, so none is inert there
        var front = lf.querySelector(".front"), back = lf.querySelector(".back");
        if (front) front.inert = !narrow.matches && i !== turned;
        if (back) back.inert = !narrow.matches && i !== turned - 1;
      });
      book.classList.toggle("closed", turned === 0);
      if (prev) prev.disabled = turned === 0;
      if (next) next.disabled = turned >= leaves.length;
      if (out) out.textContent = label();
      tabs.forEach(function (tb) {
        var n = +tb.dataset.go;
        tb.setAttribute("aria-current", n === turned ? "true" : "false");
      });
    }
    function go(n) {
      n = Math.max(0, Math.min(leaves.length, n));
      if (n === turned || flipping) return;
      if (reduced || narrow.matches) {
        turned = n;
        layout();
        return;
      }
      var dir = n > turned ? 1 : -1;
      var steps = Math.abs(n - turned);
      var k = 0;
      flipping = steps;
      (function step() {
        var idx = dir > 0 ? turned : turned - 1;
        var lf = leaves[idx];
        lf.classList.toggle("fast", steps > 1);
        lf.style.zIndex = 200 + k;
        turned += dir;
        lf.classList.toggle("turned", dir > 0);
        k++;
        if (k < steps) setTimeout(step, 120);
        else {
          setTimeout(function () {
            flipping = 0;
            layout();
          }, steps > 1 ? 480 : 880);
        }
      })();
      if (out) out.textContent = "…";
    }
    book.go = go;
    book.pageOf = function (el) {
      var lf = el.closest(".leaf");
      var i = leaves.indexOf(lf);
      return el.closest(".page").classList.contains("front") ? i : i + 1;
    };
    if (prev) prev.addEventListener("click", function () { go(turned - 1); });
    if (next) next.addEventListener("click", function () { go(turned + 1); });
    tabs.forEach(function (tb) {
      tb.addEventListener("click", function () { go(+tb.dataset.go); });
    });
    addEventListener("keydown", function (e) {
      if (e.target.closest && e.target.closest("input, textarea, dialog")) return;
      if (e.key === "ArrowRight") go(turned + 1);
      if (e.key === "ArrowLeft") go(turned - 1);
    });
    layout();
    narrow.addEventListener("change", layout);
    // It arrives closed, as it was on the bench, and opens.
    var openTo = +(book.dataset.openTo || 1);
    setTimeout(function () {
      go(1);
      if (openTo > 1) setTimeout(function () { go(openTo); }, 1100);
    }, reduced ? 0 : morphs ? 750 : 450); // after the morph has landed
  });

  // ---- home: picking things up -------------------------------------------
  // Each object plays its own opening move, then the page it opens takes over.
  // Where the pages morph, an object whose page opens it again (data-vt-ms)
  // only lifts, so the opening is not done twice.
  [].forEach.call(document.querySelectorAll("[data-open]"), function (el) {
    el.addEventListener("click", function (e) {
      if (reduced || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      if (el.classList.contains("opening") || el.classList.contains("lift")) return;
      var href = el.getAttribute("href");
      var lift = morphs && el.dataset.vtMs;
      var ms = +(lift ? el.dataset.vtMs : el.dataset.openMs || 900);
      if (!lift && el.dataset.open === "agenda") riffle(el);
      el.classList.add(lift ? "lift" : "opening");
      setTimeout(function () {
        location.href = href;
      }, ms);
    });
  });
  // Back from a page, out of the back/forward cache: everything is put down again.
  addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    [].forEach.call(document.querySelectorAll(".opening, .lift"), function (el) {
      el.classList.remove("opening", "lift");
    });
  });
  // The agenda flips through to today before it opens.
  function riffle(el) {
    var d = new Date();
    var day = el.querySelector(".today-page");
    if (day) {
      day.querySelector("b").textContent = d.toLocaleDateString("en-GB", { weekday: "long" });
      day.querySelector("span").textContent = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    }
  }

  // ---- CloudBank's published versions ------------------------------------
  // CloudBank's release and nightly workflows rewrite versions.json on its
  // site-data branch whenever they publish an image. An element marked
  // data-cloudbank="stable" or "nightly" shows that channel's version, and
  // data-cloudbank-date its publish date. The markup carries a written fallback,
  // which simply stays when the fetch fails or the channel is missing.
  var versioned = document.querySelectorAll("[data-cloudbank], [data-cloudbank-date]");
  if (versioned.length && window.fetch) {
    fetch("https://raw.githubusercontent.com/easly1989/cloudbank/site-data/versions.json", {
      cache: "no-cache",
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (v) {
        if (!v) return;
        [].slice.call(versioned).forEach(function (el) {
          var version = el.dataset.cloudbank;
          var date = el.dataset.cloudbankDate;
          var ch = v[version || date];
          if (!ch) return;
          if (version && ch.version) el.textContent = ch.version;
          if (date && ch.published) {
            el.textContent = new Date(ch.published).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          }
        });
      })
      .catch(function () {});
  }
})();
