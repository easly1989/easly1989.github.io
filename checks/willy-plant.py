"""The plant knocked off the shelf (#72-C): Willy goes up to the shelf and swats it, the pot goes over
the shelf's end and lands on the desk with a crack, spills its soil, and lies where it landed, which the
room and his routes know of afterwards; and what hangs on the plant stays right (no leaf to bring from
a plant that is no longer there, nothing falls under reduced motion). Headless Chrome, a few minutes."""
import time

from cdp import Browser
from serve import serve

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


R = "document.querySelector('.room').willy"
FALL = "document.querySelector('.room').fall"
NOW = R + ".now()"
POT = "document.querySelector('.plant')"


def until(b, expr, s, step=0.25):
    end = time.time() + s
    while time.time() < end:
        v = b.js(expr)
        if v:
            return v
        time.sleep(step)
    return None


def open_room(b, base, reduced):
    b.media(prefers_reduced_motion="reduce" if reduced else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion'); sessionStorage.removeItem('pc:on')")
    b.nav(base + "/index.html?room&weather=clear-day", 3)
    if not reduced and not until(b, "!!(document.querySelector('.room') || {}).willy", 40, 0.5):
        return False
    time.sleep(2)
    b.js("window.__ev = []; for (const k of ['landed', 'rested']) document.querySelector('.stage').addEventListener(k, () => __ev.push(k)); window.__e = []; addEventListener('error', (e) => __e.push(e.message)); addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)));")
    return True


def calm(b):
    """On the desk and standing, which is where an action starts from."""
    if b.js(NOW + ".z") != 0:
        until(b, "/^(idle|sit-idle|sleep-idle|loaf)/.test(%s.clip)" % NOW, 60)
        b.js(R + ".act('back to the desk')")
    until(b, NOW + ".z === 0 && !/^jump/.test(%s.clip)" % NOW, 30)


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    if not open_room(b, base, False):
        check(False, "Willy is in the room")
        raise SystemExit(1)

    check(b.js("!!" + POT + " && !" + POT + ".classList.contains('fallen')"), "the plant stands on the shelf")
    before = b.js(f"(() => {{ const r = {POT}.getBoundingClientRect(); return [r.left, r.top]; }})()")
    calm(b)
    b.js(R + ".act('knock the plant off')")
    check(bool(until(b, POT + ".classList.contains('fallen')", 90)), "he swats it off the shelf")
    check(bool(until(b, "__ev.includes('landed')", 8)), f"it lands with a crack: {b.js('__ev')!r}")
    check(bool(until(b, "__ev.includes('rested')", 12)), f"and comes to rest: {b.js('__ev')!r}")
    w = b.js(f"(() => {{ const p = {FALL}.where({POT}); return p && [p.x, p.y, p.z, p.still]; }})()")
    check(bool(w) and w[3] and 10 < w[2] < 70 and -560 < w[0] < 1330 and -150 < w[1] < 1030, f"the pot lies still on the desk, not off it: {w!r}")
    moved = b.js(f"(() => {{ const r = {POT}.getBoundingClientRect(); return [r.left, r.top]; }})()")
    check(abs(moved[0] - before[0]) + abs(moved[1] - before[1]) > 40, f"and is drawn there, off the shelf: {before!r} to {moved!r}")
    check(b.js("document.querySelectorAll('.soil').length") == 1, "its soil is on the desk")
    check(b.js("document.querySelector('.plant .leaves svg') !== null"), "its leaves are still on it")
    # the room knows it is there now: something solid where it lies
    inside = b.js(f"(() => {{ const p = {FALL}.where({POT}); const s = {{ x0: p.x - 10, x1: p.x + 10, y0: p.y - 10, y1: p.y + 10, z0: 5, z1: 30 }}; s.parts = [{{ ...s, q: [[s.x0, s.y0], [s.x1, s.y0], [s.x1, s.y1], [s.x0, s.y1]] }}]; return ROOM.into(s); }})()")
    check(bool(inside), f"the room's solids take it into account where it lies: {inside!r}")
    check(bool(until(b, NOW + ".z === 0 && /^(idle|sit-idle|walk)/.test(%s.clip)" % NOW, 60)), "he is back on the desk afterwards")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- under reduced motion nothing falls
    open_room(b, base, True)
    b.js("document.querySelector('.room').willy && document.querySelector('.room').willy.act('knock the plant off')")
    time.sleep(4)
    check(b.js("!document.querySelector('.plant').classList.contains('fallen')"), "under reduced motion the plant stays where it is")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
