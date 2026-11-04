/* What every page shares: the ruler, books you can leaf through, screenshots
   that open full size (the professional pages' too), the Write to me sheet,
   tabbed folders, and the room's objects' opening moves. */
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
    // A contents page: each link turns to the page it names and marks the row.
    [].forEach.call(book.querySelectorAll(".toc a[href^='#']"), function (a) {
      var target = document.getElementById(a.getAttribute("href").slice(1));
      if (!target) return;
      var folio = target.closest(".page").querySelector(".folio");
      var num = a.querySelector("em");
      if (folio && num) num.textContent = folio.textContent; // so the number never drifts
      a.addEventListener("click", function (e) {
        var mark = function () {
          target.classList.remove("marked");
          void target.offsetWidth;
          target.classList.add("marked");
        };
        if (narrow.matches) return mark(); // a column of pages: the anchor scrolls there
        e.preventDefault();
        go(book.pageOf(target));
        setTimeout(mark, reduced ? 0 : 900);
      });
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
      // the page is leaving: nothing else answers until it has, or a click mid-move would
      // start another move, or open another page under this one's
      document.body.inert = true;
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
    document.body.inert = false;
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

  // ---- folders with a tab per sheet ---------------------------------------
  // [data-tabs] holds a .fam-tabs list of links (.fam-tab, href="#sheet-id") and the .fam-sheet
  // sections they name. Without this every sheet shows, one under the other. A hash that
  // points inside a sheet opens that sheet and scrolls to the element.
  var folders = [].map.call(document.querySelectorAll("[data-tabs]"), function (folder) {
    var list = folder.querySelector(".fam-tabs");
    var tabs = [].slice.call(list.querySelectorAll(".fam-tab"));
    var sheets = tabs.map(function (t) { return document.getElementById(t.hash.slice(1)); });
    folder.classList.add("fam-tabbed");
    list.setAttribute("role", "tablist");
    tabs.forEach(function (t, i) {
      t.setAttribute("role", "tab");
      t.id = "tab-" + sheets[i].id;
      t.setAttribute("aria-controls", sheets[i].id);
      sheets[i].setAttribute("role", "tabpanel");
      sheets[i].setAttribute("aria-labelledby", t.id);
      sheets[i].tabIndex = 0;
    });
    var f = {
      folder: folder,
      indexOf: function (el) {
        for (var i = 0; i < sheets.length; i++) if (sheets[i].contains(el)) return i;
        return -1;
      },
      show: function (i, focus) {
        // the sheet that has the focus is about to be hidden: the focus goes to its tab
        var held = sheets.some(function (sh) { return sh.contains(document.activeElement); });
        tabs.forEach(function (t, j) {
          t.setAttribute("aria-selected", i === j ? "true" : "false");
          t.tabIndex = i === j ? 0 : -1;
          sheets[j].hidden = i !== j;
        });
        if (focus || held) tabs[i].focus();
      },
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("keydown", function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return; // back, forward, Ctrl+Home...
        if (e.key === " ") {
          e.preventDefault(); // a tab answers Space as Enter, and the page does not scroll
          t.click();
          return;
        }
        var step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        var to = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : step ? (i + step + tabs.length) % tabs.length : -1;
        if (to < 0) return;
        e.preventDefault();
        history.replaceState(null, "", tabs[to].hash);
        f.show(to, true);
      });
    });
    f.show(0);
    return f;
  });
  // the element a hash names, and the folder that holds it
  function target(hash) {
    try {
      return hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    } catch (e) {
      return null; // a malformed hash names nothing
    }
  }
  function inFolder(hash) {
    var el = target(hash);
    for (var i = 0; el && i < folders.length; i++) {
      var n = folders[i].indexOf(el);
      if (n >= 0) return { el: el, folder: folders[i], n: n };
    }
    return null;
  }
  function openHash(smooth) {
    var h = inFolder(location.hash);
    if (!h) {
      // no hash, or one that names nothing: the first tab; an element elsewhere on the page
      // leaves the tabs alone, and the browser scrolls to it
      if (!target(location.hash)) folders.forEach(function (f) { f.show(0); });
      return;
    }
    h.folder.show(h.n);
    // a sheet itself brings its folder into view, with its tabs
    var to = h.el.classList.contains("fam-sheet") ? h.folder.folder : h.el;
    to.scrollIntoView({ behavior: smooth && !reduced ? "smooth" : "auto", block: "start" });
  }
  if (folders.length) {
    openHash(false);
    addEventListener("hashchange", function () { openHash(true); });
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href^='#']");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var h = inFolder(a.hash);
      if (!h) return;
      e.preventDefault();
      if (a.getAttribute("role") === "tab") {
        // choosing a tab is not a place to go back to
        history.replaceState(null, "", a.hash);
        h.folder.show(h.n);
      } else {
        history.pushState(null, "", a.hash);
        openHash(true);
      }
    });
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
            // In Rome's time, like CloudBank's changelog and the fallback.
            el.textContent = new Date(ch.published).toLocaleDateString("en-GB", {
              timeZone: "Europe/Rome",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          }
        });
      })
      .catch(function () {});
  }

  // ---- every other product's version, from GitHub --------------------------
  // data-release="<owner>/<repo>" shows its newest release as "Shipping, <tag>"
  // or "Pre-release, <tag>" (tools/sync.py writes the same words as the
  // fallback), data-version the tag alone. A source with a path after the repo
  // reads the version field of that JSON file on the default branch, for a repo
  // that publishes no releases. Anonymous GitHub API use is 60 requests an hour
  // per address, so each source is asked once a visit (sessionStorage, and a
  // refusal or an odd answer too, but not a fetch cut short by leaving the
  // page); anything that goes wrong leaves the written fallback. Only text that
  // looks like a version is shown, and only as text. A pre-release also moves
  // the repo's Download links (/releases/latest, which skips pre-releases) to
  // that release's own page, so the button gets what the status line names.
  var sources = {};
  [].forEach.call(document.querySelectorAll("[data-release], [data-version]"), function (el) {
    var src = el.dataset.release || el.dataset.version;
    (sources[src] = sources[src] || []).push(el);
  });
  Object.keys(sources).forEach(function (src) {
    var key = "gh:" + src;
    var parts = src.split("/");
    var repo = parts.slice(0, 2).join("/");
    var file = parts.slice(2).join("/");
    function show(v) {
      if (!v || typeof v.v !== "string" || !/^v?\d[0-9A-Za-z.+-]{0,30}$/.test(v.v)) return;
      sources[src].forEach(function (el) {
        el.textContent = el.dataset.release ? (v.pre ? "Pre-release, " : "Shipping, ") + v.v : v.v;
      });
      var home = ("https://github.com/" + repo + "/releases/").toLowerCase();
      if (!v.pre || typeof v.url !== "string" || v.url.toLowerCase().indexOf(home + "tag/") !== 0) return;
      [].forEach.call(document.querySelectorAll('a[href$="/releases/latest"]'), function (a) {
        if (a.getAttribute("href").toLowerCase() === home + "latest") a.href = v.url;
      });
    }
    function keep(v) {
      try {
        sessionStorage.setItem(key, JSON.stringify(v || {}));
      } catch (e) {}
      show(v);
    }
    try {
      var kept = sessionStorage.getItem(key);
      if (kept) return show(JSON.parse(kept));
    } catch (e) {}
    if (!window.fetch) return;
    fetch(
      file
        ? "https://raw.githubusercontent.com/" + repo + "/HEAD/" + file
        : "https://api.github.com/repos/" + repo + "/releases?per_page=1"
    )
      .then(
        function (r) {
          // a refusal (403 rate limit, 404) or an answer that is not JSON is kept
          var d = r.ok ? r.json().catch(function () {}) : null;
          return Promise.resolve(d).then(function (d) {
            if (file) return keep(d && { v: d.version, pre: false });
            keep(d && d[0] && { v: d[0].tag_name, pre: d[0].prerelease === true, url: d[0].html_url });
          });
        },
        // no answer at all (offline, or aborted by leaving the page): ask again next page
        function () {}
      );
  });
})();
