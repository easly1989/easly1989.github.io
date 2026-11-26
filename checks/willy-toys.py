"""Willy's toys (#70-C): two to four on the desk each visit (all five with ?toys), each a labelled button
inside the window and inside the room, none on another, which he walks round and does not walk over;
pressed, by a click or by Enter, each shows its effect for a moment and says so on the live line, the
treat bag spills treats; a toy the reader has pressed he may come and bat, he rolls with the yarn and
eats the treats; under reduced motion the effect is still shown and he does not come. Headless Chrome,
a few minutes."""
import time

from cdp import Browser
from serve import serve

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


R = "document.querySelector('.room').willy"
TOYS = "document.querySelector('.room').toys"
NOW = R + ".now()"


def until(b, expr, s, step=0.25):
    end = time.time() + s
    while time.time() < end:
        v = b.js(expr)
        if v:
            return v
        time.sleep(step)
    return None


def click(b, x, y):
    for kind, button in (("mouseMoved", "none"), ("mousePressed", "left"), ("mouseReleased", "left")):
        b.call("Input.dispatchMouseEvent", type=kind, x=x, y=y, button=button, clickCount=1 if button != "none" else 0)


def key(b, k, code, vk, text=""):
    for kind in ("keyDown", "keyUp"):
        b.call("Input.dispatchKeyEvent", type=kind, key=k, code=code, windowsVirtualKeyCode=vk, text=text if kind == "keyDown" else "")


def calm(b):
    """On the desk and standing, which is where an action starts from."""
    if b.js(NOW + ".z") != 0:
        until(b, "/^(idle|sit-idle|sleep-idle|loaf)/.test(%s.clip)" % NOW, 60)
        b.js(R + ".act('back to the desk')")
    until(b, NOW + ".z === 0 && /^(idle|sit-idle|loaf)/.test(%s.clip)" % NOW, 60)


def open_room(b, base, query, reduced=False):
    b.media(prefers_reduced_motion="reduce" if reduced else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion'); sessionStorage.removeItem('pc:on')")
    b.nav(base + "/index.html?room&weather=clear-day" + query, 3)
    if not until(b, "!!(document.querySelector('.room') || {}).toys", 40, 0.5):
        return False
    time.sleep(2)
    b.js("window.__t = []; document.querySelector('.stage').addEventListener('toytouch', (e) => __t.push([e.detail.spot.dataset.kind, e.detail.by])); window.__e = []; addEventListener('error', (e) => __e.push(e.message)); addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)));")
    return True


def centre(b, kind):
    """A point on the toy that is the toy's own: another may be drawn over a part of it."""
    return b.js(f"""(() => {{ const t = document.querySelector('.toyspot[data-kind={kind}] .toy'), r = t.getBoundingClientRect();
      for (const [u, v] of [[.5, .55], [.4, .6], [.6, .6], [.5, .7], [.3, .5], [.7, .5], [.5, .4]]) {{
        const x = r.left + r.width * u, y = r.top + r.height * v, e = document.elementFromPoint(x, y);
        if (e && e.closest('.toy') === t) return [x, y];
      }}
      return [r.left + r.width / 2, r.top + r.height * 0.55]; }})()""")


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    # ---- an ordinary visit: two to four, each its own button, inside the window, apart
    for _ in range(4):
        if not open_room(b, base, ""):
            check(False, "Willy and his toys are in the room")
            raise SystemExit(1)
        n = b.js("document.querySelectorAll('.toyspot').length")
        if n:
            break
    check(2 <= n <= 5, f"two to four toys (five with the rare paper bag): {n}")

    # ---- all five, to look at
    open_room(b, base, "&toys")
    kinds = sorted(b.js("[...document.querySelectorAll('.toyspot')].map((e) => e.dataset.kind)"))
    check(kinds == ["bag", "ball", "mouse", "paper", "yarn"], f"?toys: all five: {kinds}")
    labels = b.js("[...document.querySelectorAll('.toyspot .toy')].map((e) => e.tagName + ':' + e.getAttribute('aria-label'))")
    check(all(l.startswith("BUTTON:Play with the ") for l in labels) and len(labels) == 5, f"each a labelled button: {labels}")
    inside = b.js("[...document.querySelectorAll('.toyspot .toy')].every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })")
    check(inside is True, "each inside the window")
    apart = b.js(f"(() => {{ const l = {TOYS}.list(); return l.every((a, i) => l.every((c, j) => i === j || a.x1 <= c.x0 || c.x1 <= a.x0 || a.y1 <= c.y0 || c.y1 <= a.y0)); }})()")
    check(apart is True, "none on another")
    solid = b.js("ROOM.lows().every((l) => !l.el || !l.el.classList.contains('toyspot'))")
    check(solid is True, "not low enough to walk over: he goes round them")
    into = b.js(f"(() => {{ const t = {TOYS}.list()[0]; const s = {{ x0: t.x0 + 5, x1: t.x1 - 5, y0: t.y0 + 5, y1: t.y1 - 5, z0: 2, z1: 20 }}; s.parts = [{{ ...s, q: [[s.x0, s.y0], [s.x1, s.y0], [s.x1, s.y1], [s.x0, s.y1]] }}]; return ROOM.into(s).length; }})()")
    check(into > 0, "and the room's solids have each where it stands")
    order = b.js("(() => { const t = [...document.querySelectorAll('.toyspot .toy')], w = document.querySelector('.willy-pet'); return !!w && t.every((e) => e.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING); })()")
    check(order is True, "all of them before Willy in the Tab order")

    # ---- (and four, so that there is room for him to come: the rest of the check)
    open_room(b, base, "&toys=yarn,ball,mouse,bag")
    check("paper" not in b.js("[...document.querySelectorAll('.toyspot')].map((e) => e.dataset.kind)"), "?toys=yarn,ball,mouse,bag: those four, and no other")

    # ---- pressed: the effect, said on the live line, for a moment
    for kind, words in (("yarn", "yarn unrolls"), ("ball", "crinkle ball crinkles"), ("mouse", "mouse spins")):
        x, y = centre(b, kind)
        click(b, x, y)
        time.sleep(0.4)
        check(b.js(f"document.querySelector('.toyspot[data-kind={kind}] .toy').classList.contains('go')"), f"{kind}: pressed, it shows its effect")
        check(words in (b.js("document.querySelector('.willy-live').textContent") or ""), f"{kind}: and the live line says so: {b.js('document.querySelector(\".willy-live\").textContent')!r}")
        check(bool(until(b, f"!document.querySelector('.toyspot[data-kind={kind}] .toy').classList.contains('go')", 5)), f"{kind}: and it is as it was after a moment")
        time.sleep(1.7)  # (the live line says one thing in a second and a half)
    check(["yarn", "reader"] in b.js("__t"), f"the press is told ('toytouch'): {b.js('__t')!r}")

    # ---- the treat bag spills treats, up to three
    x, y = centre(b, "bag")
    click(b, x, y)
    until(b, "document.querySelectorAll('.treat').length >= 1", 20)
    time.sleep(3)
    check(1 <= b.js("document.querySelectorAll('.treat').length") <= 3, f"the bag spills treats, up to three: {b.js('document.querySelectorAll(\".treat\").length')}")
    until(b, "!document.querySelector('.toyspot[data-kind=bag] .toy').classList.contains('go')", 5)
    x, y = centre(b, "bag")
    click(b, x, y)
    time.sleep(0.5)
    check(b.js("document.querySelectorAll('.treat').length") <= 3, "and never more")

    # ---- from the keyboard: Tab to it, Enter
    b.js("document.querySelector('.toyspot[data-kind=ball] .toy').focus()")
    until(b, "!document.querySelector('.toyspot[data-kind=ball] .toy').classList.contains('go')", 5)
    key(b, "Enter", "Enter", 13, "\r")
    time.sleep(0.4)
    check(b.js("document.querySelector('.toyspot[data-kind=ball] .toy').classList.contains('go')"), "Enter on a focused toy shows its effect too")

    # ---- Willy plays with them: asked to, he bats one (it shows its effect, he says so)
    calm(b)
    b.js("__t.length = 0")
    b.js(R + ".act('play with a toy')")
    check(bool(until(b, "__t.some((t) => t[1] === 'willy')", 90)), f"he bats a toy: {b.js('__t')!r}")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- the yarn alone, with room round it: he rolls on his back with it
    open_room(b, base, "&toys=yarn")
    rolled = None
    for _ in range(3):  # (the way to it from where he is may be shut; he is asked again)
        calm(b)
        b.js("__t.length = 0")
        b.js(R + ".act('roll with the yarn')")
        rolled = until(b, "__t.some((t) => t[0] === 'yarn' && t[1] === 'willy')", 60)
        if rolled:
            break
    check(bool(rolled), f"he rolls on his back with the yarn: {b.js('__t')!r}")

    # ---- the bag alone: it spills, he eats what it spilled
    open_room(b, base, "&toys=bag")
    x, y = centre(b, "bag")
    click(b, x, y)
    until(b, "document.querySelectorAll('.treat').length >= 3", 20)
    n0 = b.js("document.querySelectorAll('.treat').length")
    ate = None
    for _ in range(3):
        calm(b)
        b.js(R + ".act('eat a treat')")
        ate = until(b, f"document.querySelectorAll('.treat').length < {n0}", 60)
        if ate:
            break
    check(bool(ate), f"he eats a treat: {n0} -> {b.js('document.querySelectorAll(\".treat\").length')}")

    # ---- the toy the reader has pressed he may come to: here he does (the chance made certain)
    open_room(b, base, "&toys=mouse")
    calm(b)
    b.js("__t.length = 0")
    b.js("window.__r = Math.random; Math.random = () => 0; document.querySelector('.toyspot[data-kind=mouse] .toy').click(); Math.random = window.__r;")
    check(bool(until(b, "__t.some((t) => t[0] === 'mouse' && t[1] === 'willy')", 90)), f"pressed, a toy draws him to it: {b.js('__t')!r}")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- under reduced motion the effect is shown, still; he does not come
    open_room(b, base, "&toys", reduced=True)
    x, y = centre(b, "mouse")
    click(b, x, y)
    time.sleep(0.4)
    check(b.js("document.querySelector('.toyspot[data-kind=mouse] .toy').classList.contains('go')"), "reduced motion: pressed, the effect is shown")
    check(b.js("getComputedStyle(document.querySelector('.toyspot[data-kind=mouse] .toy svg')).animationName") == "none", "and does not move")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
