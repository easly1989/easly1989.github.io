"""Willy is never in the way (#70-B): sitting on a project object he is announced; focusing it moves
him off at once, every time, and its link stays clickable through him; the pointer resting on it
usually moves him off; an object that has focus is never where he settles; clicked three times he
moves away, clicked five times he leaves off the desk's front edge, out of the window, and comes
back the same way, each said on the live line. Headless Chrome, about three minutes."""
import time

from cdp import Browser
from serve import serve

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


R = "document.querySelector('.room').willy"
BOX = "(() => { const t = document.querySelector('.willy-pet'); if (!t || t.hidden) return null; const a = t.getBoundingClientRect(); return [a.left + a.width / 2, a.top + a.height / 2]; })()"
LEDGER = "document.querySelector('.thing.ledger')"
LEDGER_AT = "(() => { const r = %s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()" % LEDGER


def mouse(b, kind, x, y, button="none"):
    b.call("Input.dispatchMouseEvent", type=kind, x=x, y=y, button=button, clickCount=1 if button != "none" else 0)


def click(b, x, y):
    mouse(b, "mouseMoved", x, y)
    mouse(b, "mousePressed", x, y, "left")
    mouse(b, "mouseReleased", x, y, "left")


def until(b, expr, s, step=0.25):
    end = time.time() + s
    while time.time() < end:
        v = b.js(expr)
        if v:
            return v
        time.sleep(step)
    return None


def lines(b):
    return b.js("window.__lines.slice()")


def seated(b, name="CloudBank"):
    """Off he goes to sit on the object by that name, as he would on his own; whether he got there."""
    for _ in range(3):
        b.js(R + ".visit(%r)" % name)
        # (first up from wherever he sat, which may be that very object)
        until(b, "!/^sit-idle/.test(%s.now().clip)" % R, 3, 0.05)
        if until(b, R + ".on() === %r && /^sit-idle/.test(%s.now().clip)" % (name, R), 30):
            time.sleep(0.5)
            return True
    return False


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    b.media(prefers_reduced_motion="no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion')")
    b.nav(base + "/index.html?room", 3)
    if not until(b, "!!(document.querySelector('.room') || {}).willy", 30, 0.5):
        check(False, "Willy is in the room")
        raise SystemExit(1)
    time.sleep(1)
    b.js("window.__e = []; addEventListener('error', (e) => window.__e.push(e.message));"
         "window.__lines = []; new MutationObserver(() => { const t = document.querySelector('.willy-live').textContent; if (t) __lines.push(t); })"
         ".observe(document.querySelector('.willy-live'), { childList: true, characterData: true, subtree: true })")

    # ---- on the ledger: said; focus always moves him off; the link is clickable through him
    off = 0
    for n in range(3):
        b.js("__lines.length = 0")
        if not seated(b):
            check(False, f"he sits on the CloudBank ledger (try {n + 1})")
            continue
        if n == 0:
            check(any("sits on the CloudBank ledger" in s for s in lines(b)), f"sitting down on it is said ({lines(b)!r})")
            at = b.js(R + ".now()")
            pt = b.js("ROOM.toScreen(%f, %f, %f)" % (at["x"], at["y"], at["z"] + 40))
            hit = b.js("(() => { const e = document.elementFromPoint(%f, %f); return !!e && !!e.closest('.thing.ledger'); })()" % (pt[0], pt[1]))
            check(hit, "the ledger's link is what a click on him there reaches")
        b.js(LEDGER + ".focus()")
        up = until(b, "!/^sit-idle/.test(%s.now().clip)" % R, 1, 0.05)
        if up and until(b, R + ".on() !== 'CloudBank'", 10, 0.1):
            off += 1
        b.js("document.activeElement.blur()")
        time.sleep(0.5)
    check(off == 3, f"focusing the ledger gets him up at once and off it, {off} times of 3")

    # ---- with the ledger focused, he never settles on it
    b.js(LEDGER + ".focus()")
    settled = False
    end = time.time() + 20
    while time.time() < end:
        if b.js(R + ".on() === 'CloudBank' && /^(sit|lie|sleep)/.test(%s.now().clip)" % R):
            settled = b.js("JSON.stringify(%s.now())" % R)
            break
        time.sleep(0.2)
    check(not settled, "while the ledger has focus he never settles on it (20 s)" + (f": {settled}" if settled else ""))
    b.js("document.activeElement.blur()")

    # ---- the pointer resting on it usually moves him off (70% a time)
    moved = 0
    for n in range(6):
        if not seated(b):
            continue
        x, y = b.js(LEDGER_AT)
        mouse(b, "mouseMoved", 5, 5)
        mouse(b, "mouseMoved", x - 30, y)
        mouse(b, "mouseMoved", x - 28, y + 2)
        if until(b, R + ".on() !== 'CloudBank'", 9, 0.1):
            moved += 1
        mouse(b, "mouseMoved", 5, 5)
        time.sleep(0.5)
    check(moved >= 2, f"the pointer resting on the ledger moved him off {moved} times of 6")

    # ---- clicked three times in 5 s, he moves away (or, now and then, leaves)
    time.sleep(2)
    b.js("__lines.length = 0")
    for _ in range(3):
        p = b.js(BOX)
        if p:
            click(b, *p)
        time.sleep(0.4)
    said = until(b, "__lines.find((s) => /moves away from you|has had enough/.test(s))", 4)
    check(bool(said), f"clicked three times: {said!r}")
    if said and "had enough" in said:  # (now and then, three are enough)
        until(b, "__lines.find((s) => /is back/.test(s))", 60, 0.5)
    time.sleep(8)  # (the clicks are counted over 5 s, and he settles)

    # ---- clicked five times, he leaves off the front edge, out of the window, and comes back
    b.js("__lines.length = 0")
    for _ in range(5):
        p = b.js(BOX)
        if p:
            click(b, *p)
        time.sleep(0.25)
    said = until(b, "__lines.find((s) => /has had enough/.test(s))", 4)
    check(bool(said), f"clicked five times: {said!r}")
    floor = until(b, R + ".now().z < -1", 20, 0.1)
    check(bool(floor), "he leaps off the desk's front edge, down to the floor")
    gone = until(b, "(() => { const p = %s.now(); return p.z < -1 && ROOM.toScreen(p.x, p.y, p.z + 120)[1] > innerHeight; })()" % R, 15, 0.1)
    check(bool(gone), "and goes out of the window")
    t0 = time.time()
    back = until(b, "__lines.find((s) => /is back/.test(s))", 60, 0.5)
    check(bool(back) and time.time() - t0 > 15, f"he comes back after a while ({time.time() - t0:.0f} s): {back!r}")
    until(b, R + ".now().z >= 0 && !/^jump/.test(%s.now().clip)" % R, 5, 0.1)
    check(b.js(R + ".now().z") >= 0, "back on the desk")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
