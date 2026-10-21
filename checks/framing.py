"""The room's frame: with ?room, every link and button in the room, and the name and the note
on the wall, are inside the window at every size the room shows at, and the walls and the floor
fill it to the corners; below its smallest scale, and without ?room, the home is the flat bench
as before."""
import sys
import time

from cdp import Browser
from serve import serve

ROOM_SIZES = [(1280, 720), (1366, 768), (1440, 900), (1920, 1080), (2560, 1080)]
# a window too small for the room at a scale of 0.7: the column, or the bench, instead
SMALL = (1100, 640)

USABLE = """(() => {
  const fit = document.querySelector('.fit'), f = fit.getClientRects()[0];
  const a = { l: Math.max(0, f.left), t: Math.max(0, f.top), r: Math.min(innerWidth, f.right), b: Math.min(innerHeight, f.bottom) };
  const out = [...fit.querySelectorAll("a[href], button, [tabindex]:not([tabindex='-1']), .home-tape, .intro")].filter((e) => {
    if (e.closest('[hidden], [inert], .cat-toy, .cat')) return false;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const r = e.getClientRects()[0];
    return r && r.width > 1 && r.height > 1 && (r.left < a.l - 0.5 || r.top < a.t - 0.5 || r.right > a.r + 0.5 || r.bottom > a.b + 0.5);
  });
  return out.map((e) => (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\\s+/g, ' ').slice(0, 30));
})()"""

# what is under each corner of the window: the room's planes take no pointer, so they are
# made to for the probe
CORNERS = """(() => {
  const st = document.createElement('style');
  st.textContent = '.iso .room, .iso .room * { pointer-events: auto !important }';
  document.head.append(st);
  const pts = [[2, 2], [innerWidth - 3, 2], [2, innerHeight - 3], [innerWidth - 3, innerHeight - 3]];
  const bare = pts.filter(([x, y]) => { const e = document.elementFromPoint(x, y); return !e || !e.closest('.room'); });
  st.remove();
  return bare.map(([x, y]) => x + ',' + y);
})()"""

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


base = serve()
b = Browser(1460, 1000, headless=True)
try:
    b.media(prefers_reduced_motion="reduce")
    b.size(1440, 900)
    b.nav(base + "/index.html", 3)
    check(not b.js("document.documentElement.classList.contains('iso')"), "without ?room the home is the bench")
    for w, h in ROOM_SIZES:
        b.size(w, h)
        b.nav(base + "/index.html?room", 3)
        if not b.js("document.documentElement.classList.contains('iso')"):
            check(False, f"{w} x {h}: the room shows")
            continue
        time.sleep(0.5)
        cut = b.js(USABLE)
        check(not cut, f"{w} x {h}: nothing usable or to read out of the frame" + (f" ({', '.join(cut)})" if cut else ""))
        bare = b.js(CORNERS)
        check(not bare, f"{w} x {h}: the room fills the corners" + (f" (bare at {'; '.join(bare)})" if bare else ""))
    b.size(*SMALL)
    b.nav(base + "/index.html?room", 4)
    check(not b.js("document.documentElement.classList.contains('iso')"), f"{SMALL[0]} x {SMALL[1]}: too small for the room, so the bench shows")
    # the first visit on a small window: the room measures itself, finds it does not fit,
    # and the page reloads once into the bench
    b.js("localStorage.clear(); sessionStorage.removeItem('room-reload')")
    b.nav(base + "/index.html?room", 6)
    check(not b.js("document.documentElement.classList.contains('iso')"), f"{SMALL[0]} x {SMALL[1]}, first visit: the bench, after one reload")
    b.size(390, 844, mobile=True)
    b.nav(base + "/index.html?room", 3)
    check(not b.js("document.documentElement.classList.contains('iso')"), "on a phone the column shows")
    # remembered for the session: the plain address keeps the room
    b.size(1440, 900)
    b.nav(base + "/index.html", 3)
    check(b.js("document.documentElement.classList.contains('iso')"), "?room is remembered for the session")
    # the window changing size under the room: narrower than the room's layout, then wide again
    b.size(860, 900)
    time.sleep(3)
    check(not b.js("document.documentElement.classList.contains('iso')"), "narrowed to 860, the room gives way to the column")
    b.size(1440, 900)
    time.sleep(3)
    check(b.js("document.documentElement.classList.contains('iso')"), "widened to 1440 again, the room comes back")
finally:
    b.close()
sys.exit(1 if failures else 0)
