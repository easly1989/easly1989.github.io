"""Willy peeking in on the professional home: a mouse moved about the page turns his eyes, and
coming close to his face or onto "Step into the room" gets one swat of a paw, then none for 5 s,
and three at most; a click through the raised paw still opens the room; the keyboard focus on the
link gets the same swat. Under reduced motion, on a phone and for touch nothing of him moves."""
import sys
import time

from cdp import Browser
from serve import serve

# every paw swat, counted as it starts
COUNT = """(() => { window.__swats = 0; const a = Element.prototype.animate;
  Element.prototype.animate = function (...args) { if (this.matches('.w-paw')) window.__swats++; return a.apply(this, args); }; })()"""
STATE = """(() => { const p = document.querySelectorAll('.w-pupil'), h = document.querySelector('.w-head');
  return { pupils: [...p].map((e) => e.style.transform).join(' | '), head: h.style.transform,
    swats: window.__swats || 0, up: [...document.querySelectorAll('.w-paw')].some((e) => e.getAnimations().length) }; })()"""
# where his face is, and the link's words, in the window
WHERE = """(() => { const s = document.querySelector('.peek svg').getBoundingClientRect(), t = document.querySelector('.peek span').getBoundingClientRect();
  const k = s.width / 96; return { fx: s.left + 48 * k, fy: s.top + 38 * k, tx: t.left + t.width / 2, ty: t.top + t.height / 2 }; })()"""

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def mouse(b, x, y, kind="mouseMoved", button="none", pointer="mouse"):
    b.call("Input.dispatchMouseEvent", type=kind, x=x, y=y, button=button, clickCount=1 if button != "none" else 0,
           pointerType=pointer)


def load(b, base, w, h, reduce=False, mobile=False):
    b.media(prefers_reduced_motion="reduce" if reduce else "no-preference")
    b.size(w, h, mobile=mobile)
    b.nav(base + "/index.html", 2.5)
    b.js("document.querySelector('.peek').scrollIntoView({ block: 'center' })")
    time.sleep(0.4)


base = serve()
b = Browser(1300, 900, headless=True)
try:
    b.call("Page.addScriptToEvaluateOnNewDocument", source=COUNT)
    # reduced motion: still, whatever the mouse does
    load(b, base, 1280, 900, reduce=True)
    w = b.js(WHERE)
    before = b.js(STATE)
    for x, y in [(w["fx"] - 300, w["fy"] + 200), (w["fx"] + 20, w["fy"] + 10), (w["tx"], w["ty"])]:
        mouse(b, x, y)
        time.sleep(0.3)
    after = b.js(STATE)
    check(after == before and not after["swats"], "under reduced motion his pupils, head and paws stay still over a mouse move")

    # moving: the eyes follow
    load(b, base, 1280, 900)
    w = b.js(WHERE)
    mouse(b, w["fx"] - 400, w["fy"] + 250)
    time.sleep(0.6)
    left = b.js(STATE)
    mouse(b, w["fx"] + 250, w["fy"] + 250)
    time.sleep(0.6)
    right = b.js(STATE)
    check(left["pupils"] and left["pupils"] != right["pupils"] and left["head"] != right["head"],
          "his pupils and his head follow the mouse" + f" ({left['pupils']} / {right['pupils']})")
    check(not right["swats"], "far from him, no swat")
    # close to his face: one swat, and the link still opens through the raised paw
    mouse(b, w["fx"] + 30, w["fy"] - 20)
    time.sleep(0.12)
    st = b.js(STATE)
    check(st["swats"] == 1 and st["up"], f"close to his face, one swat ({st['swats']})")
    mouse(b, w["fx"] - 300, w["fy"] + 300)
    time.sleep(0.3)
    mouse(b, w["tx"], w["ty"])
    time.sleep(0.3)
    check(b.js(STATE)["swats"] == 1, "within 5 s, onto the link: no second swat")
    time.sleep(5)
    mouse(b, w["tx"] + 2, w["ty"])
    time.sleep(0.3)
    check(b.js(STATE)["swats"] == 1, "staying on the link: no swat again")
    mouse(b, w["fx"] - 300, w["fy"] + 300)
    time.sleep(0.2)
    mouse(b, w["tx"], w["ty"])
    time.sleep(0.1)
    st = b.js(STATE)
    check(st["swats"] == 2 and st["up"], f"after 5 s, back onto the link: a swat ({st['swats']})")
    hit = b.js(f"document.elementFromPoint({w['tx']}, {w['ty']}).closest('a') === document.querySelector('.peek')")
    check(hit, "while the paw is up, the link's words are still the link under the pointer")
    mouse(b, w["tx"], w["ty"], "mousePressed", "left")
    mouse(b, w["tx"], w["ty"], "mouseReleased", "left")
    time.sleep(3)
    check(b.js("document.documentElement.classList.contains('iso')"), "a click on the link through the swat opens the room")

    # the keyboard: the focus on the link gets the swat
    b.js("localStorage.setItem('site:room', '0')")
    load(b, base, 1280, 900)
    b.js("document.querySelector('.reach a').focus()")
    time.sleep(0.5)
    st0 = b.js(STATE)
    for _ in range(3):
        b.call("Input.dispatchKeyEvent", type="keyDown", key="Tab", code="Tab", windowsVirtualKeyCode=9)
        b.call("Input.dispatchKeyEvent", type="keyUp", key="Tab", code="Tab", windowsVirtualKeyCode=9)
        if b.js("document.activeElement === document.querySelector('.peek')"):
            break
    time.sleep(0.1)
    st = b.js(STATE)
    check(b.js("document.activeElement.matches('.peek:focus-visible')") and st["swats"] == 1 and st["pupils"] == st0["pupils"],
          f"the keyboard focus on the link: one swat, and no eye-following ({st['swats']})")

    # touch: nothing
    load(b, base, 1280, 900)
    w = b.js(WHERE)
    time.sleep(0.5)
    st0 = b.js(STATE)
    # (close to his face, under the rule: a tap on the link itself would open the room)
    b.call("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": w["fx"], "y": w["fy"] + 70}])
    b.call("Input.dispatchTouchEvent", type="touchMove", touchPoints=[{"x": w["fx"] + 20, "y": w["fy"] + 60}])
    b.call("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    time.sleep(0.3)
    st = b.js(STATE)
    check(not st["swats"] and st["pupils"] == st0["pupils"] and not b.js("document.documentElement.classList.contains('iso')"),
          "a touch close to his face: no reaction")

    # a narrow window that holds the room: he shows and follows (the room's size, kept from the
    # visit to it above, would not fit at 960, so it is forgotten as on a first visit)
    b.js("localStorage.removeItem('room-box'); localStorage.setItem('site:room', '0')")
    load(b, base, 960, 800)
    w = b.js(WHERE)
    shown = b.js("getComputedStyle(document.querySelector('.peek')).display !== 'none'")
    mouse(b, w["fx"] - 300, w["fy"] + 200)
    time.sleep(0.5)
    check(shown and b.js(STATE)["pupils"], "at 960 wide he shows, and follows the mouse")

    # a phone: no peek, and nothing listens
    load(b, base, 390, 844, mobile=True)
    st0 = b.js(STATE)
    mouse(b, 100, 200)
    time.sleep(0.3)
    check(b.js("getComputedStyle(document.querySelector('.peek')).display") == "none" and b.js(STATE) == st0,
          "on a phone he is not shown, and nothing of him moves")
finally:
    b.close()
sys.exit(1 if failures else 0)
