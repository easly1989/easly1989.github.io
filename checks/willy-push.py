"""Willy pushes things (#72-B), each action asked of him through the room's `willy` hook, as he
would choose it on his own: he paws an odd or end towards the desk's edge until it goes over, and
it is said on the live line, with a look at the reader first now and then; he taps the mug or the
jar, which wobbles and stays where it is; he brings a leaf off the plant and puts it down on the
desk, where it is one of the odds and ends; no more than three things go over the edge in a
visit; under reduced motion none of it happens. Headless Chrome, about three minutes."""
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
FALL = "document.querySelector('.room').fall.state()"


def until(b, expr, s, step=0.2):
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


def act(b, name, done, s=45, tries=6):
    """He does the action by that name, until done holds; whether it did."""
    for _ in range(tries):
        calm(b)
        b.js("__lines.length = 0")
        b.js(R + ".act(%r)" % name)
        if until(b, done, s):
            return True
        print("      (%s: not yet, at %r, said %r)" % (name, b.js(NOW), lines(b)))
        # (he may be somewhere the action cannot start from: he goes somewhere else first)
        b.js(R + ".act('wander')")
        time.sleep(8)
    return False


def open_room(b, base, reduced):
    b.media(prefers_reduced_motion="reduce" if reduced else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion'); sessionStorage.removeItem('pc:on')")
    b.nav(base + "/index.html?room&weather=clear-day&odds", 3)
    if not reduced and not until(b, "!!(document.querySelector('.room') || {}).willy", 40, 0.5):
        return False
    time.sleep(2)
    b.js("window.__e = []; addEventListener('error', (e) => __e.push(e.message)); addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)));"
         "window.__lines = []; new MutationObserver(() => { const t = document.querySelector('.willy-live').textContent; if (t) __lines.push(t); })"
         ".observe(document.querySelector('.willy-live'), { childList: true, characterData: true, subtree: true });"
         "window.__wobbled = []; new MutationObserver((ms) => ms.forEach((m) => m.target.classList.contains('wobble') && __wobbled.push(m.target.className)))"
         ".observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class'] })")
    return True


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    if not open_room(b, base, False):
        check(False, "Willy is in the room")
        raise SystemExit(1)

    # ---- he pushes something off the desk, and says so
    PUSH = re.compile(r"^Willy (looks at you, then )?pushes the (pencil|eraser|paper clip|coin|bottle cap|USB stick|rubber band|leaf) off the desk\.$")
    before = b.js(FALL + ".fell.length")
    pushed = False
    for visit in range(4):
        pushed = act(b, "push something off", "window.__lines.some((l) => /off the desk\\.$/.test(l))", 40, 4)
        if pushed:
            break
        # (a visit whose odds and ends lie nowhere near an edge has nothing for him to push: a new one)
        open_room(b, base, False)
        before = b.js(FALL + ".fell.length")
    check(pushed, f"he pushes something off the desk, and it is said: {lines(b)!r}")
    if pushed:
        said = [l for l in lines(b) if l.endswith("off the desk.")]
        check(all(PUSH.match(l) for l in said), f"in his words: {said!r}")
        check(b.js(FALL + ".fell.length") == before + 1, f"and one thing has gone over the edge: {b.js(FALL + '.fell')!r}")

    # ---- the mug or the jar wobbles, and stays
    pots = "JSON.stringify([...document.querySelectorAll('.thing.mug, .thing.jar')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }))"
    here = b.js(pots)
    tapped = act(b, "tap the mug", "window.__lines.some((l) => /^Willy taps the (mug|jar)\\. It wobbles\\.$/.test(l))", 90)
    check(tapped, f"he taps the mug or the jar, and it is said: {lines(b)!r}")
    if tapped:
        time.sleep(0.5)
        check(bool(b.js("window.__wobbled.length")), "and it wobbles")
        time.sleep(3)
        check(b.js(pots) == here, "and each stays where it was")

    # ---- a leaf off the plant, put down on the desk
    leaves = "document.querySelectorAll('.plant .leaves path:not(.taken)').length"
    n = b.js(leaves)
    gave = act(b, "bring a leaf", "window.__lines.includes('Willy brings you a leaf.')", 90, 8)
    check(gave, f"he brings a leaf, and it is said: {lines(b)!r}")
    if gave:
        check(b.js(leaves) == n - 1, f"the plant has one leaf the fewer: {n} -> {b.js(leaves)}")
        check(bool(until(b, "!!document.querySelector('.loose.plant-leaf')", 5)), "and the leaf lies on the desk, one of the odds and ends")
        # (once a visit)
        b.js("__lines.length = 0")
        calm(b)
        b.js(R + ".act('bring a leaf')")
        time.sleep(6)
        check("Willy brings you a leaf." not in lines(b), "he brings one leaf a visit")

    # ---- no more than three things over the edge in a visit
    for _ in range(6):
        if b.js(FALL + ".fell.length") >= 3:
            break
        act(b, "push something off", "window.__lines.some((l) => /off the desk\\.$/.test(l)) && /^(idle|sit-idle|walk)/.test(%s.clip)" % NOW, 70, 1)
    at = b.js(FALL + ".fell.length")
    calm(b)
    b.js("__lines.length = 0")
    b.js(R + ".act('push something off')")
    time.sleep(10)
    check(b.js(FALL + ".fell.length") <= 3, f"three things at most go over the edge in a visit ({at} so far, {b.js(FALL + '.fell.length')} now)")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- under reduced motion he pushes nothing
    open_room(b, base, True)
    b.js("document.querySelector('.room').willy && document.querySelector('.room').willy.act('push something off')")
    time.sleep(5)
    check(not (b.js(FALL + ".fell.length") or 0) and not b.js("window.__lines.some((l) => /off the desk/.test(l))"), "under reduced motion nothing is pushed off")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
