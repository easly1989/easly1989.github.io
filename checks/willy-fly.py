"""The fly and the fur (#70-E). By day, asked for, a fly comes in at the window, flies about the room
(a dot with wings drawn over it, on the screen, moving all the time) and out again, while Willy
follows it and swats at it and misses, said on the live line; none by night. Where he lies down he
leaves a little fur, which a new visit does not have. Under reduced motion none of it happens.
Headless Chrome, a few minutes."""
import time

from cdp import Browser
from serve import serve

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


R = "document.querySelector('.room').willy"
NOW = R + ".now()"
FLY = "(() => { const f = document.querySelector('.fly'); if (!f) return null; const r = f.getBoundingClientRect(); return [r.left, r.top, innerWidth, innerHeight]; })()"


def until(b, expr, s, step=0.25):
    end = time.time() + s
    while time.time() < end:
        v = b.js(expr)
        if v:
            return v
        time.sleep(step)
    return None


def calm(b):
    """On the desk and standing, which is where these actions start from."""
    if b.js(NOW + ".z") != 0:
        until(b, "/^(idle|sit-idle|sleep-idle|loaf)/.test(%s.clip)" % NOW, 60)
        b.js(R + ".act('back to the desk')")
    until(b, NOW + ".z === 0 && !/^jump/.test(%s.clip)" % NOW, 30)


def open_room(b, base, reduced, weather="clear-day"):
    b.media(prefers_reduced_motion="reduce" if reduced else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion'); sessionStorage.removeItem('pc:on')")
    b.nav(base + "/index.html?room&weather=" + weather, 3)
    if not reduced and not until(b, "!!(document.querySelector('.room') || {}).willy", 40, 0.5):
        return False
    time.sleep(2)
    b.js("window.__e = []; addEventListener('error', (e) => __e.push(e.message)); addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)));"
         "window.__lines = []; new MutationObserver(() => { const t = document.querySelector('.willy-live').textContent; if (t) __lines.push(t); })"
         ".observe(document.querySelector('.willy-live'), { childList: true, characterData: true, subtree: true })")
    return True


def fly_visit(b):
    """Asked for once; the lines he says, where the fly was on the screen as it flew, whether it was gone."""
    calm(b)
    b.js("__lines.length = 0")
    b.js(R + ".act('watch a fly')")
    if not until(b, "__lines.includes('Willy watches a fly.')", 25):
        return None
    seen = []
    end = time.time() + 14
    while time.time() < end:
        f = b.js(FLY)
        if f:
            seen.append(f)
        elif seen:
            break
        time.sleep(0.4)
    return b.js("__lines.slice()"), seen, b.js("!document.querySelector('.fly')")


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    if not open_room(b, base, False):
        check(False, "Willy is in the room")
        raise SystemExit(1)

    # ---- the fly, by day
    got = None
    for _ in range(3):
        got = fly_visit(b)
        if got:
            break
        open_room(b, base, False)
    check(bool(got), "he watches a fly, and it is said")
    if got:
        lines, seen, gone = got
        check(len(seen) >= 8, f"the fly is drawn all the while ({len(seen)} samples)")
        check(all(0 <= x <= w and 0 <= y <= h for x, y, w, h in seen), "and stays on the screen")
        moved = max((abs(a[0] - c[0]) + abs(a[1] - c[1]) for a, c in zip(seen, seen[1:])), default=0)
        check(moved > 15, f"and it moves ({moved:.0f} px between two samples at most)")
        check(bool(until(b, "__lines.includes('Willy swats at the fly and misses.')", 15)), "he swats at it and misses, and it is said")
        check(bool(until(b, "!document.querySelector('.fly')", 15)), "it goes out, and there is no fly left")

    # ---- the fur: where he lies down on the desk
    left = 0
    for _ in range(3):
        calm(b)
        b.js(R + ".act('loaf')")
        until(b, "document.querySelectorAll('.fur-tuft').length > 0", 40)
        left = b.js("document.querySelectorAll('.fur-tuft').length")
        if left:
            break
    check(left > 0, f"he leaves a little fur where he lies down ({left})")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- a new visit has none of it
    open_room(b, base, False)
    check(not b.js("document.querySelectorAll('.fur-tuft, .fly').length"), "a new visit has no fur and no fly")

    # ---- none by night
    open_room(b, base, False, "clear-night")
    calm(b)
    b.js("__lines.length = 0")
    b.js(R + ".act('watch a fly')")
    time.sleep(12)
    check(not b.js("__lines.includes('Willy watches a fly.')") and not b.js("!!document.querySelector('.fly')"), "none by night")

    # ---- under reduced motion he does none of it
    open_room(b, base, True)
    b.js("document.querySelector('.room').willy && document.querySelector('.room').willy.act('watch a fly')")
    time.sleep(4)
    check(not b.js("!!document.querySelector('.fly') || __lines.some((l) => /fly/.test(l))"), "under reduced motion nothing of it happens")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
