"""Petting Willy (#70-A): his button is the room's last Tab stop, labelled and never relabelled; Enter
or a click on him is answered, and the polite live line says what he did; under reduced motion he
stays still until petted, then changes pose at once; where the reader chose to animate anyway he is
caught mid-action and answers without a jump. Headless Chrome, a minute or so."""
import time

from cdp import Browser
from serve import serve

ENTER = chr(13)
LABEL = "Willy. You can pet him!"
failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def key(b, name, code, vk, text=None):
    extra = {"text": text} if text else {}
    b.call("Input.dispatchKeyEvent", type="keyDown", key=name, code=code, windowsVirtualKeyCode=vk, **extra)
    b.call("Input.dispatchKeyEvent", type="keyUp", key=name, code=code, windowsVirtualKeyCode=vk)


def tab(b):
    key(b, "Tab", "Tab", 9)
    time.sleep(0.05)


def click(b, x, y):
    for kind, button in (("mouseMoved", "none"), ("mousePressed", "left"), ("mouseReleased", "left")):
        b.call("Input.dispatchMouseEvent", type=kind, x=x, y=y, button=button, clickCount=1 if button != "none" else 0)


ACTIVE = "(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.className || a.tagName) : ''; })()"
LIVE = "(document.querySelector('.willy-live') || {}).textContent || ''"
BOX = "(() => { const t = document.querySelector('.willy-pet'); if (!t || t.hidden) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, label: t.getAttribute('aria-label') }; })()"
CANVAS = "(document.querySelector('canvas.willy') || {}).style?.transform || ''"


def load(b, url, reduce, choice=False):
    b.media(prefers_reduced_motion="reduce" if reduce else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.js("localStorage.setItem('site:motion', '1')" if choice else "localStorage.removeItem('site:motion')")
    b.nav(url, 3)
    for _ in range(40):  # he loads after the room does
        if b.js("!!document.querySelector('.willy-pet') && !document.querySelector('.willy-pet').hidden"):
            break
        time.sleep(0.5)
    time.sleep(1)


def last_stop(b):
    """Tab from the top of the page to the end: the sequence of what takes focus."""
    b.js("document.activeElement.blur(); window.scrollTo(0, 0)")
    seq = []
    for _ in range(80):
        tab(b)
        seq.append(b.js(ACTIVE))
        if seq[-1] == LABEL:
            tab(b)
            return seq, b.js(ACTIVE)
    return seq, None


base = serve()
b = Browser(1300, 900, headless=True)
try:
    home = base + "/index.html"
    b.nav(home, 0.5)
    b.js("localStorage.setItem('site:room', '1')")

    # ---- reduced motion, no choice: still until petted
    load(b, home + "?room", reduce=True)
    if not b.js("document.documentElement.classList.contains('iso')"):
        check(False, "the room shows")
        raise SystemExit(1)
    box = b.js(BOX)
    check(bool(box) and box["label"] == LABEL, f"his button is there, labelled {LABEL!r}")
    check(b.js("document.querySelector('.willy-live')?.getAttribute('aria-live')") == "polite", "the live line is polite")
    seq, after = last_stop(b)
    check(seq and seq[-1] == LABEL, f"Tab reaches him, and he is the last stop of {len(seq)}")
    check(after != LABEL and after not in seq[:-1] or after in seq[:1], f"the Tab after him leaves the page's stops ({after!r})")
    still = b.js(CANVAS)
    time.sleep(3)
    check(b.js(CANVAS) == still and not b.js(LIVE), "reduced motion: he stays still and says nothing until petted")
    # Enter on his button
    b.js("document.querySelector('.willy-pet').focus()")
    key(b, "Enter", "Enter", 13, ENTER)
    time.sleep(0.6)
    line = b.js(LIVE)
    check(line.startswith("Willy"), f"Enter on him: the live line speaks ({line!r})")
    check(b.js("document.querySelector('.willy-pet').getAttribute('aria-label')") == LABEL, "his label does not change")
    # a click on him, through his own outline
    time.sleep(1.6)
    before = b.js(LIVE)
    box = b.js(BOX)
    click(b, box["x"], box["y"])
    time.sleep(0.6)
    check(bool(b.js(LIVE)), "a click on him is answered")
    # a click far from him is not
    time.sleep(1.6)
    b.js("document.querySelector('.willy-live').textContent = ''")
    click(b, 20, 20)
    time.sleep(0.6)
    check(not b.js(LIVE), "a click elsewhere is not for him")

    # ---- animating anyway: he walks, is petted mid-action and answers
    load(b, home + "?room", reduce=True, choice=True)
    time.sleep(3)
    errs = b.js("window.__e = []; addEventListener('error', (e) => window.__e.push(e.message)); 0")
    spoke = 0
    for _ in range(4):
        b.js("document.querySelector('.willy-pet').focus()")
        key(b, "Enter", "Enter", 13, ENTER)
        time.sleep(1.8)
        spoke += bool(b.js(LIVE))
        b.js("document.querySelector('.willy-live').textContent = ''")
    check(spoke >= 3, f"animating anyway: petted four times, the live line spoke {spoke} times")
    check(not b.js("window.__e"), "no error while he answers")
    moved = False
    a = b.js(CANVAS)
    for _ in range(10):
        time.sleep(1)
        if b.js(CANVAS) != a:
            moved = True
            break
    check(moved, "animating anyway: he moves on his own")
    b.js("localStorage.removeItem('site:motion'); localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
