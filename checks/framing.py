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

# where the loose things are and the scale, now; and the same at the first frame, before the
# fonts can have arrived
LAYOUT = """(() => ({
  s: document.querySelector('.stage').style.getPropertyValue('--s'),
  loose: Object.fromEntries([...document.querySelectorAll('.loose')].map((e, i) => [i + ' ' + e.className, e.style.left + ' ' + e.style.top])),
}))()"""
FIRST = f"""addEventListener('DOMContentLoaded', () => {{
  if (!document.querySelector('.stage')) return;
  window.__first = Object.assign({LAYOUT}, {{ fonts: document.fonts.status }});
}})"""

# a loose thing whose middle is seen behind the computer, the jar or the mug, as if in it
HIDDEN = """(() => {
  const box = (e) => { const r = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
    [e, ...e.querySelectorAll('*')].forEach((n) => [...n.getClientRects()].forEach((c) => {
      r.l = Math.min(r.l, c.left); r.t = Math.min(r.t, c.top); r.r = Math.max(r.r, c.right); r.b = Math.max(r.b, c.bottom); }));
    return r; };
  const tall = [...document.querySelectorAll('.pc, .thing.jar, .thing.mug')].map((e) => [e.className.split(' ').pop(), box(e)]);
  const out = [];
  document.querySelectorAll('.loose').forEach((e) => {
    const b = box(e), x = (b.l + b.r) / 2, y = (b.t + b.b) / 2;
    tall.forEach(([n, t]) => { if (x > t.l && x < t.r && y > t.t && y < t.b) out.push(e.className.replace('loose ', '') + ' behind ' + n); });
  });
  return out;
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
    # the loose things land somewhere new on every load
    b.size(1440, 900)
    hidden = []
    for _ in range(10):
        b.nav(base + "/index.html?room", 1.5)
        hidden += b.js(HIDDEN)
    check(not hidden, "in 10 loads, nothing loose is hidden behind something tall" + (f" ({', '.join(hidden)})" if hidden else ""))
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
    # ?room=0 turns it off for the session
    b.nav(base + "/index.html?room=0", 3)
    off = not b.js("document.documentElement.classList.contains('iso')")
    b.nav(base + "/index.html", 3)
    check(off and not b.js("document.documentElement.classList.contains('iso')"), "?room=0 turns the room off for the session")
    # the first frame is the layout: when the fonts come in, nothing moves to a new place
    b.call("Network.enable")
    b.call("Network.setCacheDisabled", cacheDisabled=True)
    b.call("Page.addScriptToEvaluateOnNewDocument", source=FIRST)
    b.nav(base + "/index.html?room", 5)
    first, now = b.js("window.__first"), b.js(LAYOUT)
    b.call("Network.setCacheDisabled", cacheDisabled=False)
    moved = [k for k in first["loose"] if first["loose"][k] != now["loose"].get(k)]
    drift = abs(float(now["s"]) / float(first["s"]) - 1)
    check(
        first["fonts"] != "loaded" and not moved and drift < 0.01,
        f"the fonts arrive after the first frame ({first['fonts']}) and nothing jumps"
        + (f" (moved: {', '.join(moved)})" if moved else "") + f" (scale {drift:.2%})",
    )
finally:
    b.close()
sys.exit(1 if failures else 0)
