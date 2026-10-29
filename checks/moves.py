"""The room's opening moves, as a reader makes them: each project object is clicked with the
mouse, and a second click lands elsewhere while it moves. The first click's page opens, within
about 1.6 s and at 60 fps or more; the object and its page's counterpart carry the pair's name
over the morph and no name is used twice on either page; coming back, the object lands, is put
down and the page answers again; coming back by a link, the room loading as it lands, no frame
of the morph or the put-down takes over 100 ms. Needs a window that is actually painting, so it
opens one."""
import json
import sys
import time

from cdp import Browser
from serve import serve

MOVES = [
    (".thing.ledger", "cloudbank.html", ["cloudbank"]),
    ("#agenda", "nutreek.html", ["nutreek"]),
    (".thing.cards", "social-contacts-sync.html", ["scs"]),
    (".thing.jar", "planora.html", ["planora"]),
    (".thing.envelope", "cupid.html", ["cupid"]),
    (".thing.pager", "asf-notifier.html", ["asf"]),
    (".thing.mug", "donate.html", ["puddle"]),
    (".thing.camera", "about.html", ["photo"]),
]
LONGEST_MS = 1700  # "about 1.6 s"
FRAME_MS = 1000 / 60 + 1

# On every page: what is named when it is left and when it is shown, and the frames from the
# click to leaving. Registered once the page has loaded, so it runs after the page's own
# listeners have set their names.
PROBE = r"""
addEventListener('load', () => {
  const names = () => [...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((v) => v && v !== 'none' && v !== 'auto');
  addEventListener('pageswap', (e) => {
    const f = window.__f || [], d = [];
    for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
    d.sort((a, b) => a - b);
    sessionStorage.__swap = JSON.stringify({ ms: Math.round(performance.now() - (window.__t0 || 0)), vt: !!e.viewTransition, names: names(), p50: d.length ? d[d.length >> 1] : null });
  });
});
// read once every listener of the page has run
addEventListener('pagereveal', (e) => {
  setTimeout(() => { sessionStorage.__reveal = JSON.stringify({ page: location.pathname, vt: !!e.viewTransition, names: [...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((v) => v && v !== 'none' && v !== 'auto') }); }, 0);
});
// in the room, shown by a morph: every frame until what it put down has landed (morph.js), and
// the scripts that ran in the long ones
addEventListener('pagereveal', (e) => {
  if (!e.viewTransition || !document.documentElement.classList.contains('iso')) return;
  const f = (window.__rf = []), loaf = (window.__loaf = []);
  new PerformanceObserver((l) => loaf.push(...l.getEntries().map((x) => ({ at: x.startTime, by: x.scripts.filter((s) => s.duration > 20).map((s) => (s.sourceURL || '').split('/').pop() + ' ' + (s.sourceFunctionName || s.invoker) + ' ' + Math.round(s.duration) + ' ms') })))).observe({ type: 'long-animation-frame' });
  (function t(n) { f.push(n); if (!window.__rfEnd) requestAnimationFrame(t); })(performance.now());
  e.viewTransition.finished.finally(async () => {
    for (;;) {
      await new Promise(requestAnimationFrame);
      const m = document.querySelector('.stage').getAnimations({ subtree: true }).filter((a) => a instanceof CSSTransition);
      if (!m.length) break;
      await Promise.allSettled(m.map((a) => a.finished));
    }
    window.__rfEnd = performance.now();
  });
});
// whether going back brought the page back from the back/forward cache, as for readers
addEventListener('pageshow', (e) => { window.__restored = e.persisted; });
addEventListener('error', (e) => { const l = JSON.parse(localStorage.__errs || '[]'); l.push(location.pathname + ': ' + e.message); localStorage.__errs = JSON.stringify(l); });
"""
# a point on the object that the pointer actually reaches
POINT = """((sel) => { const t = document.querySelector(sel).closest('a.thing'); const r = t.getBoundingClientRect();
  for (const [fx, fy] of [[.5,.5],[.5,.4],[.4,.5],[.6,.5],[.5,.6],[.5,.3],[.3,.5],[.7,.5]]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy, h = document.elementFromPoint(x, y);
    if (h && h.closest('a.thing') === t) return [x, y]; }
  return null; })"""
REC = "window.__t0 = performance.now(); window.__f = []; (function t(n) { __f.push(n); requestAnimationFrame(t); })(performance.now())"

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def click(b, x, y, modifiers=0):
    for t in ("mouseMoved", "mousePressed", "mouseReleased"):
        b.call("Input.dispatchMouseEvent", type=t, x=x, y=y, button="left", clickCount=1, modifiers=modifiers)


def dupes(names):
    return sorted({n for n in names if names.count(n) > 1})


base = serve()
# Frames are drawn as fast as they can be, not to the display's beat, so a frame's interval
# is what it costs: on a 90 Hz display a 12 ms frame misses a beat and reads as 45 fps
b = Browser(1460, 960, headless=False, flags=["--disable-gpu-vsync", "--disable-frame-rate-limit"])
try:
    b.call("Page.enable")
    b.call("Page.addScriptToEvaluateOnNewDocument", source=PROBE)
    b.size(1440, 900)
    b.media(prefers_reduced_motion="no-preference")
    b.nav(base + "/index.html?room", 3)
    b.js("localStorage.__errs = '[]'; sessionStorage.setItem('room-light', 'on')")
    # once round first, unchecked: the first move after the browser starts pays for drawing
    # its layers, and runs slow
    for n, (i, (sel, page, pair)) in enumerate([(0, MOVES[0])] + list(enumerate(MOVES))):
        warm = n == 0
        b.nav(base + "/index.html", 3)
        b.js("sessionStorage.removeItem('__swap'); sessionStorage.removeItem('__reveal')")
        pt = b.js(POINT + f"('{sel}')")
        other = b.js(POINT + f"('{MOVES[(i + 1) % len(MOVES)][0]}')")
        if not pt or not other:
            check(False, f"{page}: the object can be pointed at")
            continue
        b.js(REC)
        click(b, *pt)
        time.sleep(0.25)
        click(b, *other)  # mid-move: ignored
        time.sleep(3)
        if warm:
            continue
        swap = json.loads(b.js("sessionStorage.__swap || 'null'") or "null")
        there = b.js("location.pathname").split("/")[-1]
        reveal = json.loads(b.js("sessionStorage.__reveal || 'null'") or "null")
        check(there == page, f"{page}: the first click's page opens, the second click is ignored (got {there})")
        if not swap or not reveal:
            check(False, f"{page}: the page was left and shown ({swap}, {reveal})")
            continue
        check(swap["ms"] <= LONGEST_MS, f"{page}: the move takes {swap['ms']} ms")
        check(swap["p50"] is not None and swap["p50"] <= FRAME_MS, f"{page}: the move runs at {1000 / swap['p50']:.0f} fps" if swap["p50"] else f"{page}: frames recorded")
        missing = [n for n in pair if n not in swap["names"] or n not in reveal["names"]]
        check(swap["vt"] and not missing, f"{page}: {', '.join(pair)} named on both pages" + (f" (missing {missing}: {swap['names']} / {reveal['names']})" if missing else ""))
        dup = dupes(swap["names"]) + dupes(reveal["names"])
        check(not dup, f"{page}: no name used twice" + (f" ({dup})" if dup else ""))
        # coming back
        b.js("sessionStorage.removeItem('__reveal')")
        b.js("history.back()")
        time.sleep(2.5)
        back = json.loads(b.js("sessionStorage.__reveal || 'null'") or "null")
        state = b.js(f"""(() => {{ const t = document.querySelector('{sel}');
          return {{ page: location.pathname, restored: window.__restored === true, inert: document.body.inert, lifted: t.style.getPropertyValue('--lift') || '', turned: !!t.style.transform, named: [...document.querySelectorAll('.stage *')].filter((e) => e.style.viewTransitionName).length }}; }})()""")
        landed = page in ("donate.html", "about.html") or (back and all(n in back["names"] for n in pair))
        check(
            state["page"].endswith("index.html") and state["restored"] and not state["inert"] and not state["lifted"] and not state["turned"] and not state["named"] and landed,
            f"{page}: back on the room, it lands and is put down, and the page answers ({state}, {back and back['names']})",
        )
    # back by a link, not the cache: the room loads fresh and is shown while it is still
    # loading, and the pair must be named by then
    b.nav(base + "/cloudbank.html", 2)
    b.js("sessionStorage.removeItem('__reveal')")
    b.js("document.querySelector('a.crumb').click()")
    time.sleep(2.5)
    fresh = json.loads(b.js("sessionStorage.__reveal || 'null'") or "null")
    check(bool(fresh) and fresh["vt"] and "cloudbank" in fresh["names"], f"back to the room by a link, the ledger is named for the morph ({fresh})")
    # and loading as it lands, nothing stops the morph or the ledger being put down
    for _ in range(16):
        if b.js("!!window.__rfEnd"):
            break
        time.sleep(0.5)
    lag = b.js("""(() => { const f = window.__rf || [], d = f.slice(1).map((n, i) => n - f[i]), worst = Math.max(0, ...d), at = f[d.indexOf(worst)];
      const l = (window.__loaf || []).find((x) => x.at >= at - 5 && x.at < at + worst); return { done: !!window.__rfEnd, worst: Math.round(worst), by: l ? l.by : [] }; })()""")
    check(lag["done"] and lag["worst"] <= 100, f"back to the room by a link, no frame of the morph or the put-down takes over 100 ms (longest {lag['worst']} ms" + (f": {'; '.join(lag['by'])}" if lag["by"] else "") + ("" if lag["done"] else ", and it had not landed") + ")")
    # skipping the move: Ctrl-click is the browser's own (a new tab), and leaves the room as it is
    b.nav(base + "/index.html", 3)
    pt = b.js(POINT + "('.thing.ledger')")
    click(b, *pt, modifiers=2)
    time.sleep(1.2)
    st = b.js("[location.pathname, document.body.inert, document.querySelector('.thing.ledger').style.getPropertyValue('--lift'), document.querySelector('.thing.ledger').className]")
    check(st[0].endswith("index.html") and not st[1] and not st[2] and "unbanded" not in st[3], f"Ctrl-click opens elsewhere and plays no move ({st})")
    # and under reduced motion the page just opens, at once
    b.media(prefers_reduced_motion="reduce")
    b.nav(base + "/index.html", 3)
    b.js("sessionStorage.removeItem('__swap')")
    b.js(REC)
    click(b, *pt)
    time.sleep(2)
    swap = json.loads(b.js("sessionStorage.__swap || 'null'") or "null")
    there = b.js("location.pathname").split("/")[-1]
    check(there == "cloudbank.html" and swap and swap["ms"] < 400, f"under reduced motion the page opens with no move ({there}, {swap and swap['ms']} ms)")
    b.media(prefers_reduced_motion="no-preference")
    errs = json.loads(b.js("localStorage.__errs") or "[]")
    check(not errs, "no script errors" + (f" ({errs})" if errs else ""))
finally:
    b.close()
sys.exit(1 if failures else 0)
