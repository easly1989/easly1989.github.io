/* One answer to "does this reader want motion": the browser's prefers-reduced-motion, unless the
   reader chose to animate anyway (localStorage "site:motion" is "1", the button in the
   professional pages' footer). Loaded, not deferred, in every page's head, after styles.css where
   a page has it. It marks html.motion-ok, which every reduced-motion rule in the CSS yields to
   (`:where(html:not(.motion-ok))`), and, on the pages that morph into one another (styles.css),
   lets the page transitions run again, which no class can do for an @view-transition rule. */
(function () {
  var query = matchMedia("(prefers-reduced-motion: reduce)");
  var store = null;
  try {
    store = localStorage;
    store.getItem("site:motion");
  } catch (e) {
    store = null; // without storage the browser's answer stands, and there is no choice to offer
  }
  function chosen() {
    try {
      return !!store && store.getItem("site:motion") === "1";
    } catch (e) {
      return false;
    }
  }
  function mark() {
    document.documentElement.classList.toggle("motion-ok", chosen());
  }
  // true when nothing should move on its own: the browser asks for that and the reader did not
  // choose otherwise
  window.reducedMotion = function () {
    return query.matches && !chosen();
  };
  reducedMotion.query = query;
  reducedMotion.canChoose = !!store;
  reducedMotion.chosen = chosen;
  // the button's: stores the choice or removes it, and marks the page (what watches the class,
  // Willy's peek, follows at once)
  reducedMotion.choose = function (on) {
    try {
      if (on) store.setItem("site:motion", "1");
      else store.removeItem("site:motion");
    } catch (e) {}
    mark();
  };
  mark();
  // a constructed sheet comes after every other one, so it outweighs styles.css's
  // reduced-motion `navigation: none` (only on its pages: the professional ones never morph)
  if (chosen() && document.querySelector('link[href$="styles.css"]') && "adoptedStyleSheets" in document) {
    try {
      var vt = new CSSStyleSheet();
      vt.replaceSync("@view-transition { navigation: auto; }");
      document.adoptedStyleSheets = document.adoptedStyleSheets.concat(vt);
    } catch (e) {}
  }
})();
