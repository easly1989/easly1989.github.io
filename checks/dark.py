"""The room's first load in a visit: dark, the neon name striking and the room marked busy,
until the switch clicks the light on within about 4 s. Later loads in the visit show it at
once with its light as left; under reduced motion it is lit from the start. With scripts
stopped once the room is up, the dark still ends on its own. Needs a window that is
actually painting, so it opens one."""
import sys
import time

from cdp import Browser
from serve import serve

# how dark it is: the night layer's, or with the light pass running (room-light.js), its canvas's
# when what it draws is the dark
STATE = """(() => { const h = document.documentElement, n = document.querySelector('.night'), s = document.querySelector('.stage'), w = document.querySelector('.light-switch'),
    pass = h.classList.contains('lit') && document.querySelector('canvas.light-pass'),
    dark = pass ? (pass.dataset.dark === 'true') * +getComputedStyle(pass).opacity : +getComputedStyle(n).opacity;
  return { room: h.classList.contains('iso'), dawn: h.classList.contains('dawn'), dark, busy: s.getAttribute('aria-busy'),
    striking: document.querySelector('.on-wall.neon').classList.contains('striking'), pressed: w.getAttribute('aria-pressed'), light: sessionStorage.getItem('room-light') }; })()"""
failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def fresh(b, base):
    """A new visit to the room: nothing remembered of its light."""
    b.nav(base + "/index.html?room", 2)
    b.js("sessionStorage.removeItem('room-light')")


def built(b, limit=3):
    """Waits for the room to be there: a load right after another can wait on the last one's start."""
    t = time.time()
    while time.time() - t < limit and not b.js("!!document.querySelector('.night')"):
        time.sleep(0.05)


def lit_after(b, limit=6):
    """How long, from now, until the switch is on and the dark has gone."""
    t = time.time()
    while time.time() - t < limit:
        s = b.js(STATE)
        if not s["dawn"] and s["dark"] == 0 and s["pressed"] == "true":
            return time.time() - t, s
        time.sleep(0.1)
    return None, b.js(STATE)


base = serve()
b = Browser(1460, 960, headless=False)
try:
    b.size(1440, 900)
    for scheme in ("light", "dark"):
        b.media(prefers_color_scheme=scheme, prefers_reduced_motion="no-preference")
        fresh(b, base)
        b.call("Page.navigate", url=base + "/index.html")
        time.sleep(0.6)
        built(b)
        s = b.js(STATE)
        check(s["room"] and s["dawn"] and s["dark"] == 1 and s["busy"] == "true" and s["striking"] and s["pressed"] == "false",
              f"{scheme}: the first load of a visit is dark, the name striking, the room busy and the switch off ({s})")
        took, s = lit_after(b)
        check(took is not None and took + 0.6 <= 4.3 and s["busy"] is None and s["light"] == "on",
              f"{scheme}: the switch clicks the light on within about 4 s ({took and round(took + 0.6, 1)} s, {s})")
        b.call("Page.navigate", url=base + "/index.html")
        time.sleep(0.6)
        built(b)
        s = b.js(STATE)
        check(not s["dawn"] and s["dark"] == 0 and s["busy"] is None, f"{scheme}: a later load in the visit shows the room at once ({s})")
        b.js("document.querySelector('.light-switch').click()")
        b.nav(base + "/index.html", 0.6)
        built(b)
        s = b.js(STATE)
        check(not s["dawn"] and s["dark"] == 1 and s["pressed"] == "false" and s["busy"] is None, f"{scheme}: with the light left off, it is there at once, off ({s})")

    # the reader gets to the switch before the light comes on: the light comes on then, and stays
    fresh(b, base)
    b.call("Page.navigate", url=base + "/index.html")
    time.sleep(0.6)
    built(b)
    b.js("document.querySelector('.light-switch').click()")
    time.sleep(0.1)
    s = b.js(STATE)
    time.sleep(4)
    after = b.js(STATE)
    check(not s["dawn"] and s["busy"] is None and s["pressed"] == "true" and after["pressed"] == "true" and after["dark"] == 0,
          f"pressing the switch in the dark puts the light on at once, and it stays on ({s}, then {after})")

    b.media(prefers_color_scheme="light", prefers_reduced_motion="reduce")
    fresh(b, base)
    b.call("Page.navigate", url=base + "/index.html")
    time.sleep(0.6)
    built(b)
    s = b.js(STATE)
    check(not s["dawn"] and s["dark"] == 0 and not s["striking"] and s["busy"] is None and s["pressed"] == "true", f"under reduced motion the room is lit from the start ({s})")

    # Whatever holds the light never lets go, and then the scripts stop: the dark is CSS, and ends
    b.media(prefers_color_scheme="light", prefers_reduced_motion="no-preference")
    fresh(b, base)
    hold = b.call("Page.addScriptToEvaluateOnNewDocument", source="""Object.defineProperty(window, 'ROOM', { configurable: true,
      get() { return this.__room; }, set(v) { this.__room = v; v.holdLight(new Promise(() => {})); } });""")
    b.call("Page.navigate", url=base + "/index.html")
    time.sleep(0.8)
    built(b)
    s = b.js(STATE)
    b.call("Emulation.setScriptExecutionDisabled", value=True)
    time.sleep(4)
    b.call("Emulation.setScriptExecutionDisabled", value=False)
    after = b.js(STATE)
    after = [after["dawn"], after["dark"]]
    check(s["dawn"] and after[0] and after[1] == 0, f"with scripts stopped once the room is up, the dark still ends on its own (then {s['dark']}, after 4 s {after})")
    b.call("Page.removeScriptToEvaluateOnNewDocument", identifier=hold["identifier"])
finally:
    b.close()
sys.exit(1 if failures else 0)
