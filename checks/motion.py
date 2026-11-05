"""The reader's choice to animate anyway (motion.js): under reduced motion, with no choice, nothing
moves; with localStorage "site:motion" set, by the footer's button, Willy peeking in on the
professional home follows the mouse and swats, the room's Willy walks, an object picked up in the
room plays its move and the playful pages morph again. The button shows only where the browser
asks for less motion or the reader chose, says which, and is a 44 px target with a focus ring,
inside the window, in both schemes, at 1280 and 375 wide. And every script and rule that reads
reduced motion goes through the choice."""
import pathlib
import re
import sys
import time

from cdp import Browser
from serve import serve

COUNT = """(() => { window.__swats = 0; const a = Element.prototype.animate;
  Element.prototype.animate = function (...args) { if (this.matches('.w-paw')) window.__swats++; return a.apply(this, args); }; })();
  addEventListener('pagereveal', (e) => { try { sessionStorage.setItem('vt', String(!!e.viewTransition)); } catch (x) {} });"""
STATE = """(() => { const p = document.querySelectorAll('.w-pupil'), h = document.querySelector('.w-head');
  return { pupils: [...p].map((e) => e.style.transform).join(' | '), head: h.style.transform, swats: window.__swats || 0 }; })()"""
WHERE = """(() => { const s = document.querySelector('.peek svg').getBoundingClientRect();
  const k = s.width / 96; return { fx: s.left + 48 * k, fy: s.top + 38 * k }; })()"""
BUTTON = """(() => { const b = document.querySelector('footer .motion button'); if (!b) return null;
  b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect();
  return { shown: !b.closest('[hidden]') && r.height > 0, text: b.textContent, pressed: b.getAttribute('aria-pressed'),
    h: r.height, x: r.left + Math.min(40, r.width / 2), y: r.top + r.height / 2, right: r.right,
    fits: document.documentElement.scrollWidth <= innerWidth, ok: document.documentElement.classList.contains('motion-ok'),
    stored: localStorage.getItem('site:motion') }; })()"""
OFF = "Your browser asks for less motion. Animate anyway."
ON = "Animating. Respect my browser's setting."

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def through_the_choice():
    """Every reduced-motion rule yields to html.motion-ok, and no script reads the query's .matches
    itself: the only way to that answer is reducedMotion() (motion.js)."""
    root = pathlib.Path(__file__).resolve().parent.parent
    files = [f for f in [*root.glob("*.css"), *root.glob("*.html"), *root.glob("*.js")] if f.name not in ("terminal.html", "motion.js")]
    bad = []
    for f in files:
        s = f.read_text(encoding="utf-8")
        if re.search(r"matchMedia\(\s*[\"']\(prefers-reduced-motion: reduce\)[\"']\s*\)\.matches", s):
            bad.append(f"{f.name}: matchMedia(...).matches")
        for m in re.finditer(r"@media[^{]*prefers-reduced-motion[^{]*\{", s):
            i, d = m.end(), 1
            while d:
                d += (s[i] == "{") - (s[i] == "}")
                i += 1
            body = re.sub(r"/\*.*?\*/", "", s[m.end():i - 1], flags=re.S)
            for sel in re.findall(r"([^{}]+)\{", body):
                sel = sel.strip()
                if sel.startswith("@"):
                    continue
                # split on the top-level commas only
                parts, depth, cur = [], 0, ""
                for c in sel:
                    depth += (c == "(") - (c == ")")
                    if c == "," and not depth:
                        parts.append(cur)
                        cur = ""
                    else:
                        cur += c
                parts.append(cur)
                bad += [f"{f.name}: {p.strip()}" for p in parts if "motion-ok" not in p]
    check(not bad, "every reduced-motion rule and script goes through the reader's choice" + (": " + "; ".join(bad) if bad else ""))


def mouse(b, x, y, kind="mouseMoved", button="none"):
    b.call("Input.dispatchMouseEvent", type=kind, x=x, y=y, button=button, clickCount=1 if button != "none" else 0,
           pointerType="mouse")


def click(b, x, y):
    mouse(b, x, y)
    mouse(b, x, y, "mousePressed", "left")
    mouse(b, x, y, "mouseReleased", "left")


def load(b, url, reduce, choice, scheme="light", w=1280, h=900, wait=2.5):
    b.media(prefers_reduced_motion="reduce" if reduce else "no-preference", prefers_color_scheme=scheme)
    b.size(w, h)
    b.js("localStorage.setItem('site:motion', '1')" if choice else "localStorage.removeItem('site:motion')")
    b.nav(url, wait)


def follows(b):
    """Moves the mouse across Willy, then close to his face: did his eyes follow, and did he swat?"""
    b.js("document.querySelector('.peek').scrollIntoView({ block: 'center', behavior: 'instant' })")
    time.sleep(0.4)
    w = b.js(WHERE)
    was = b.js(STATE)["swats"]
    mouse(b, w["fx"] - 400, w["fy"] + 250)
    time.sleep(0.6)
    left = b.js(STATE)
    mouse(b, w["fx"] + 250, w["fy"] + 250)
    time.sleep(0.6)
    right = b.js(STATE)
    mouse(b, w["fx"] + 30, w["fy"] - 20)
    time.sleep(0.3)
    return left["pupils"] != right["pupils"] and left["head"] != right["head"], b.js(STATE)["swats"] - was


through_the_choice()
base = serve()
b = Browser(1300, 900, headless=False)
try:
    b.call("Page.addScriptToEvaluateOnNewDocument", source=COUNT)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '0')")
    home = base + "/index.html"

    # ---- the professional home
    load(b, home, reduce=True, choice=False)
    btn = b.js(BUTTON)
    moved, swats = follows(b)
    check(btn["shown"] and btn["text"] == OFF and btn["pressed"] == "false" and not btn["ok"],
          f"reduced motion, no choice: the button offers to animate ({btn['text']!r}, pressed {btn['pressed']})")
    check(not moved and not swats, "reduced motion, no choice: Willy stays still over a mouse move")
    btn = b.js(BUTTON)
    click(b, btn["x"], btn["y"])
    time.sleep(0.3)
    btn = b.js(BUTTON)
    check(btn["pressed"] == "true" and btn["text"] == ON and btn["stored"] == "1" and btn["ok"],
          f"clicked: pressed, says {btn['text']!r}, stored and marked")
    moved, swats = follows(b)
    check(moved and swats == 1, f"at once, without a reload: Willy follows the mouse and swats ({swats})")

    load(b, home, reduce=True, choice=True)
    btn = b.js(BUTTON)
    moved, swats = follows(b)
    check(btn["shown"] and btn["pressed"] == "true" and btn["text"] == ON, "reduced motion, chosen: on the next load it is still on")
    check(moved and swats == 1, f"reduced motion, chosen: Willy follows the mouse and swats ({swats})")
    btn = b.js(BUTTON)
    click(b, btn["x"], btn["y"])
    time.sleep(0.3)
    btn = b.js(BUTTON)
    moved, swats = follows(b)
    check(btn["pressed"] == "false" and btn["stored"] is None and not btn["ok"] and btn["shown"],
          "clicked again: the choice is gone, and the button stays to choose again")
    check(not moved and not swats, "and Willy is still again, at once")

    load(b, home, reduce=False, choice=False)
    btn = b.js(BUTTON)
    moved, swats = follows(b)
    check(not btn["shown"], "no reduced motion: no button")
    check(moved and swats == 1, f"no reduced motion: Willy follows and swats, as before ({swats})")
    load(b, home, reduce=False, choice=True)
    check(b.js(BUTTON)["shown"] and b.js(BUTTON)["pressed"] == "true", "no reduced motion but chosen: the button shows, to undo it")

    # ---- the button on every face: shown, 44 px, a focus ring, inside the window
    for page in ("index.html", "pro/cloudbank.html", "pro/about.html", "pro/donate.html"):
        for scheme in ("light", "dark"):
            for w, h in ((1280, 900), (375, 812)):
                load(b, f"{base}/{page}", reduce=True, choice=False, scheme=scheme, w=w, h=h, wait=1.5)
                btn = b.js(BUTTON)
                # reached by the keyboard, from the footer's last link
                b.js("document.querySelector('nav.foot a:last-child').focus()")
                b.call("Input.dispatchKeyEvent", type="keyDown", key="Tab", code="Tab", windowsVirtualKeyCode=9)
                b.call("Input.dispatchKeyEvent", type="keyUp", key="Tab", code="Tab", windowsVirtualKeyCode=9)
                ring = b.js("(() => { const b = document.activeElement, s = getComputedStyle(b); return b.matches('footer .motion button:focus-visible')"
                            " && s.outlineStyle === 'solid' && parseFloat(s.outlineWidth) >= 2; })()")
                check(btn and btn["shown"] and btn["h"] >= 44 and btn["right"] <= w and btn["fits"] and ring,
                      f"{page} {scheme} {w}: the button shows, {btn and btn['h']:.0f} px tall, with a focus ring, inside the window")
    load(b, f"{base}/pro/cloudbank.html", reduce=False, choice=False, wait=1.5)
    check(not b.js(BUTTON)["shown"], "pro/cloudbank.html, no reduced motion: no button")

    # ---- the playful pages morph again for a reader who chose
    for choice in (False, True):
        load(b, f"{base}/cloudbank.html", reduce=True, choice=choice, wait=1.5)
        sheets = b.js("document.adoptedStyleSheets.length")
        b.js("sessionStorage.removeItem('vt'); location.href = 'nutreek.html'")
        time.sleep(2)
        vt = b.js("sessionStorage.getItem('vt')")
        check(vt == ("true" if choice else "false") and sheets == (1 if choice else 0),
              f"reduced motion, {'chosen' if choice else 'no choice'}: a page {'morphs' if choice else 'does not morph'} into the next (view transition {vt})")

    # ---- the room: Willy, and the opening moves
    b.size(1440, 900)
    for choice in (False, True):
        load(b, home + "?room", reduce=True, choice=choice, w=1440, h=900, wait=1)
        b.nav(home, 4)
        if not b.js("document.documentElement.classList.contains('iso')"):
            check(False, "the room shows")
            continue
        walked = 0
        for _ in range(12 if choice else 2):  # he may nap a while before he walks (willy-life.js)
            a = b.js("(document.querySelector('canvas.willy') || {}).style?.transform || ''")
            time.sleep(5 if choice else 3)
            if a and a != b.js("(document.querySelector('canvas.willy') || {}).style?.transform || ''"):
                walked += 1
                break
        check(bool(walked) == choice, f"the room, reduced motion, {'chosen: Willy walks' if choice else 'no choice: Willy stays where he sleeps'}")
        inert = b.js("(() => { document.querySelector('.thing.cards').click(); return document.body.inert; })()")
        check(inert == choice, f"the room, reduced motion, {'chosen: the cards play their move' if choice else 'no choice: the cards just open their page'}")
        time.sleep(2)
    b.js("localStorage.removeItem('site:motion'); localStorage.setItem('site:room', '0')")
finally:
    b.close()
sys.exit(1 if failures else 0)
