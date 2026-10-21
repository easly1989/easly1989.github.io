"""Once an object is picked up, does anything else still answer? Real mouse clicks: the
ledger, then the mug and the neon name mid-move; then back, and the room answers again."""
import sys
import time

from cdp import Browser

VT = sys.argv[1] if len(sys.argv) > 1 else "b"
b = Browser(1460, 1000, headless=False)


def centre(sel):
    return b.js(f"""(() => {{ const e = document.querySelector('{sel}'), r = e.getClientRects()[0];
      for (const [fx, fy] of [[.5, .5], [.5, .35], [.4, .5], [.6, .6]]) {{ const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const h = document.elementFromPoint(x, y); if (h && (h === e || e.contains(h))) return [x, y]; }}
      return [r.left + r.width / 2, r.top + r.height / 2] }})()""")


def click(x, y):
    for t in ("mousePressed", "mouseReleased"):
        b.call("Input.dispatchMouseEvent", type=t, x=x, y=y, button="left", clickCount=1)


try:
    b.size(1440, 900)
    b.nav(f"http://127.0.0.1:8126/index.html?vt={VT}&frame=grow", 5)
    led, mug, neon = centre(".thing.ledger"), centre(".thing.mug"), centre(".neon-switch")
    b.js("window.__hits = []; addEventListener('click', (e) => __hits.push(e.target.className && String(e.target.className).slice(0, 30)), true)")
    click(*led)
    time.sleep(0.3)
    inert = b.js("document.body.inert")
    click(*mug)
    click(*neon)
    hits = b.js("JSON.stringify(__hits)")
    mugMoved = b.js("document.querySelector('.thing.mug').classList.contains('falling')")
    time.sleep(6)
    print("vt", VT, "| inert mid-move:", inert, "| clicks that reached the page:", hits, "| mug started falling:", mugMoved)
    print("landed on:", b.js("location.pathname"))
    b.js("history.back()")
    time.sleep(3)
    print("back on:", b.js("location.pathname"), "| inert:", b.js("document.body.inert"))
    click(*centre(".thing.mug"))
    time.sleep(0.4)
    print("the mug answers again:", b.js("document.querySelector('.thing.mug').classList.contains('falling')"))
finally:
    b.close()
