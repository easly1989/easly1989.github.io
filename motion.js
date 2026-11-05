/* One answer to "does this reader want motion": the browser's prefers-reduced-motion, unless the
   reader chose to animate anyway (localStorage "site:motion" is "1", the button in the
   professional pages' footer). Loaded, not deferred, in every page's head, after styles.css where
   a page has it. It marks html.motion-ok, which every reduced-motion rule in the CSS yields to
   (`:where(html:not(.motion-ok))`), and, on the pages that morph into one another (styles.css),
   lets the page transitions run again, which no class can do for an @view-transition rule.
   Every caller falls back to the browser's answer if this file never ran (a stale page, a
   blocked script). */
(function () {
  var root = document.documentElement;
  var query = matchMedia("(prefers-reduced-motion: reduce)");
  var store = null;
  try {
    store = localStorage;
    store.getItem("site:motion");
  } catch (e) {
    store = null; // without storage the browser's answer stands, and there is no choice to offer
  }
  // the choice, read once and again only when it may have changed: reducedMotion() runs per frame
  var on = false;
  function read() {
    try {
      on = !!store && store.getItem("site:motion") === "1";
    } catch (e) {}
  }
  // a constructed sheet comes after every other one, so it outweighs styles.css's
  // reduced-motion `navigation: none` (only on its pages: the professional ones never morph)
  var vt = null;
  if (document.querySelector('link[href$="styles.css"]') && "adoptedStyleSheets" in document) {
    try {
      vt = new CSSStyleSheet();
      vt.replaceSync("@view-transition { navigation: auto; }");
    } catch (e) {
      vt = null;
    }
  }
  // the page follows the choice: the class (what watches it, Willy's peek, follows at once), the
  // page transitions, and motion-change for the button (site.js)
  function mark() {
    root.classList.toggle("motion-ok", on);
    if (vt) {
      var rest = document.adoptedStyleSheets.filter(function (s) {
        return s !== vt;
      });
      document.adoptedStyleSheets = on ? rest.concat(vt) : rest;
    }
    dispatchEvent(new Event("motion-change"));
  }
  // true when nothing should move on its own: the browser asks for that and the reader did not
  // choose otherwise
  window.reducedMotion = function () {
    return query.matches && !on;
  };
  reducedMotion.query = query;
  reducedMotion.canChoose = !!store;
  reducedMotion.chosen = function () {
    return on;
  };
  // the button's: the choice holds for this page whatever happens, and is remembered if it can be
  // (returns whether it was)
  reducedMotion.choose = function (want) {
    var kept = true;
    try {
      if (want) store.setItem("site:motion", "1");
      else store.removeItem("site:motion");
    } catch (e) {
      kept = false;
    }
    on = !!want;
    mark();
    return kept;
  };
  // chosen in another tab, or a page brought back from the back/forward cache
  function again() {
    var was = on;
    read();
    if (on !== was) mark();
  }
  addEventListener("storage", function (e) {
    if (e.key === "site:motion" || e.key === null) again();
  });
  addEventListener("pageshow", function (e) {
    if (e.persisted) again();
  });
  read();
  mark();
})();
