"""Willy's box (#70-E): a cardboard box stands open on the desk (ROOM.props().nest). Asked for, he
walks up to it from the side, hops over its wall into it, and sits or lies in it facing the reader
(each of the two asked for in turn), says so on the live line, then hops
out again and walks off. The box is solid to the loose things, so none of them lies in it, and
under reduced motion none of it happens. Headless Chrome, a few minutes."""
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

# whether he is inside the box's walls, and whether clear of them (the flap is not a wall)
INSIDE = "(() => { const n = window.ROOM.props().nest, p = %s, i = n.inside; return p.x > i.x0 && p.x < i.x1 && p.y > i.y0 && p.y < i.y1; })()" % NOW
OUTSIDE = "(() => { const n = window.ROOM.props().nest, p = %s; return p.x < n.x0 - 60 || p.x > n.x1 + 60 || p.y < n.y0 - 60 || p.y > n.y1 + 60; })()" % NOW


def until(b, expr, s, step=0.25):
    end = time.time() + s
    while time.time() < end:
        v = b.js(expr)
        if v:
            return v
        time.sleep(step)
    return None


def calm(b):
    """On the desk and standing, which is where the action starts from."""
    if b.js(NOW + ".z") != 0:
        until(b, "/^(idle|sit-idle|sleep-idle|loaf)/.test(%s.clip)" % NOW, 60)
        b.js(R + ".act('back to the desk')")
    until(b, NOW + ".z === 0 && !/^jump/.test(%s.clip)" % NOW, 30)


def open_room(b, base, reduced):
    b.media(prefers_reduced_motion="reduce" if reduced else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion'); sessionStorage.removeItem('pc:on')")
    b.nav(base + "/index.html?room&weather=clear-day", 3)
    if not reduced and not until(b, "!!(document.querySelector('.room') || {}).willy", 40, 0.5):
        return False
    time.sleep(2)
    b.js("window.__e = []; addEventListener('error', (e) => __e.push(e.message)); addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)));"
         "window.__lines = []; new MutationObserver(() => { const t = document.querySelector('.willy-live').textContent; if (t) __lines.push(t); })"
         ".observe(document.querySelector('.willy-live'), { childList: true, characterData: true, subtree: true })")
    return True


PET = "(() => { const t = document.querySelector('.willy-pet'); if (!t || t.hidden) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()"


def click(b, x, y):
    for kind, button in (("mouseMoved", "none"), ("mousePressed", "left"), ("mouseReleased", "left")):
        b.call("Input.dispatchMouseEvent", type=kind, x=x, y=y, button=button, clickCount=1 if button != "none" else 0)


def visit(b, name, rest, petted=False):
    """Ask for it by that name; whether he went in, rested there as rest, and came out."""
    calm(b)
    b.js("__lines.length = 0")
    b.js(R + ".act(%r)" % name)
    went = until(b, "__lines.some((l) => l === 'Willy hops into his box.')", 60)
    if not went:
        return None
    check(True, "hops into his box (%s)" % rest)
    seen = set()
    end = time.time() + 40
    while time.time() < end and not (rest in seen):
        if b.js(INSIDE):
            seen.add(b.js(NOW + ".clip"))
        time.sleep(0.25)
    check(rest in seen, f"{rest} inside the walls (saw {sorted(seen)})")
    if petted and rest in seen:
        # (a click cuts his show short in it: the planner has no way out of a box, so he hops out)
        pet = b.js(PET)
        if pet:
            click(b, pet["x"], pet["y"])
        check(bool(pet), "a click on him in the box is answered")
    check(bool(until(b, OUTSIDE + " && !/^jump/.test(%s.clip)" % NOW, 90)), "out of it again, on his way" + (", cut short by a click" if petted else ""))
    return True


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    if not open_room(b, base, False):
        check(False, "Willy is in the room")
        raise SystemExit(1)
    nest = b.js("(() => { const n = window.ROOM.props().nest; return n && [n.x0, n.y0, n.x1, n.y1, n.z1].map(Math.round); })()")
    check(bool(nest), f"the box is on the desk: {nest}")
    check(b.js("window.ROOM.boxes().some((o) => o.name === \"Willy's box\")"), "and solid to the odds and ends and what falls")
    check(b.js("window.ROOM.lows().every((o) => o.name !== \"Willy's box\")"), "but not low enough to walk over")
    # (a loose thing in it would be one he cannot reach or see: none lies inside its walls)
    check(b.js("(() => { const n = window.ROOM.props().nest.inside; return [...document.querySelectorAll('.loose')].every((e) => { const x = e.offsetLeft + e.offsetWidth / 2, y = e.offsetTop + e.offsetHeight / 2; return !(x > n.x0 && x < n.x1 && y > n.y0 && y < n.y1); }); })()"), "no odds and ends in it")
    for name, rest in (("sit in his box", "sit-idle"), ("lie in his box", "loaf")):
        done = None
        for _ in range(3):
            done = visit(b, name, rest, petted=rest == "sit-idle")
            if done:
                break
            # (a visit may have no room for him to stand at: a new one)
            open_room(b, base, False)
        if not done:
            check(False, f"{name}: hops into it")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- under reduced motion he does none of it
    open_room(b, base, True)
    b.js("document.querySelector('.room').willy && document.querySelector('.room').willy.act('sit in his box')")
    time.sleep(4)
    check(not b.js("window.__lines.some((l) => /his box/.test(l))"), "under reduced motion nothing of it happens")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
