"""Willy and the room's props (#70-E), each action asked of him through the room's `willy` hook, as
he would choose it on his own, and said on the live line: he sniffs the mug and dips his face in it,
paws at a page of the ledger or the agenda, lies down on a book, lies against the camera, naps where
the sun falls on the desk by day, and stares up at the neon sign from the shelf. A visit may have
no room for one of them (a place for each is looked for among those free), so each is asked up to
several times, and a new visit opened between. Under reduced motion none of it happens. Headless
Chrome, several minutes."""
import re
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

ACTIONS = [
    ("sniff the mug", r"^Willy sniffs the mug, and dips his face in it\.$"),
    ("paw at a page", r"^Willy paws at a page of the (CloudBank ledger|Nutreek agenda)\.$"),
    ("lie on a book", r"^Willy lies down on the (CloudBank ledger|Nutreek agenda)\.$"),
    ("lie against the camera", r"^Willy lies down against the camera\.$"),
    ("nap in the sun", r"^Willy naps in the sun\.$"),
    ("stare at the neon", r"^Willy stares up at the neon sign\.$"),
]


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


def calm(b):
    """On the desk and standing, which is where these actions start from."""
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


def ask(b, name, pat, s=40, tries=3):
    """He does the action by that name, until the line says so; whether he did."""
    for _ in range(tries):
        calm(b)
        b.js("__lines.length = 0")
        b.js(R + ".act(%r)" % name)
        if until(b, "window.__lines.some((l) => new RegExp(%r).test(l))" % pat, s):
            return True
        b.js(R + ".act('wander')")
        time.sleep(6)
    return False


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    if not open_room(b, base, False):
        check(False, "Willy is in the room")
        raise SystemExit(1)
    for name, pat in ACTIONS:
        done = False
        for visit in range(3):
            done = ask(b, name, pat)
            if done:
                break
            # (a visit may have no room for it: a new one)
            open_room(b, base, False)
        check(done, f"{name}: said {lines(b)!r}")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- under reduced motion he does none of it
    open_room(b, base, True)
    b.js("document.querySelector('.room').willy && document.querySelector('.room').willy.act('sniff the mug')")
    time.sleep(4)
    check(not b.js("window.__lines.some((l) => /sniffs|paws|lies down|naps|stares up/.test(l))"), "under reduced motion nothing of it happens")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
