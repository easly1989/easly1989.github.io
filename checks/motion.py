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


# the one fallback a caller may hold, for a page where motion.js never ran
FALLBACK = 'window.reducedMotion || function () { return matchMedia("(prefers-reduced-motion: reduce)").matches; }'
QUERY = r"matchMedia\(\s*[\"']\(prefers-reduced-motion: reduce\)[\"']\s*\)"
SKIP = {"vendor", "checks", "cat-src", ".git", "node_modules"}


def through_the_choice():
    """Every reduced-motion rule yields to html.motion-ok (`:not(.motion-ok)`), and no script reads
    the query's answer itself, directly or through a variable: the only way to it is
    reducedMotion() (motion.js), or the fallback above. terminal.html stands alone (CLAUDE.md)."""
    root = pathlib.Path(__file__).resolve().parent.parent
    files = [f for ext in ("css", "html", "js") for f in root.rglob(f"*.{ext}")
             if not SKIP & set(f.relative_to(root).parts) and f.name not in ("terminal.html", "motion.js")]
    bad = []
    for f in files:
        name = f.relative_to(root).as_posix()
        s = f.read_text(encoding="utf-8").replace(FALLBACK, "")
        if re.search(QUERY + r"\.matches", s):
            bad.append(f"{name}: matchMedia(...).matches")
        for v in re.findall(r"(?:var|let|const)\s+(\w+)\s*=\s*" + QUERY, s):
            if re.search(r"\b" + v + r"\.matches\b", s):
                bad.append(f"{name}: {v}.matches")
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
                bad += [f"{name}: {p.strip()}" for p in parts if ":not(.motion-ok)" not in p]
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

    # ---- chosen in another tab (here a frame of the site, which shares its storage): the page follows
    load(b, home, reduce=True, choice=False)
    b.js("new Promise((r) => { const f = document.createElement('iframe'); f.src = 'pro/about.html'; f.onload = () => {"
         " f.contentWindow.localStorage.setItem('site:motion', '1'); setTimeout(r, 300); }; document.body.append(f); })")
    btn = b.js(BUTTON)
    moved, swats = follows(b)
    check(btn["ok"] and btn["pressed"] == "true" and btn["text"] == ON and moved and swats == 1,
          f"chosen in another tab: the button says so and Willy follows and swats, without a reload ({swats})")

    # ---- a browser that will not store it: it holds for the page, and the page says it is not kept
    load(b, home, reduce=True, choice=False)
    b.js("Storage.prototype.setItem = function () { throw new Error('quota'); }")
    btn = b.js(BUTTON)
    click(b, btn["x"], btn["y"])
    time.sleep(0.3)
    btn = b.js(BUTTON)
    note = b.js("(document.querySelector('footer .motion [role=status]') || {}).textContent || ''")
    moved, swats = follows(b)
    check(btn["ok"] and btn["pressed"] == "true" and btn["stored"] is None and "not remember" in note and moved,
          f"storage refused: on for this page, not stored, and it says so ({note!r})")
    b.nav(home, 1)  # (a page whose storage works again)

    # ---- motion.js missing (a stale page, a blocked script): every page still works, and moves as
    # the browser says
    b.call("Network.enable")
    b.call("Network.setBlockedURLs", urls=["*motion.js"])
    b.call("Page.addScriptToEvaluateOnNewDocument", source="window.__errs = []; addEventListener('error', (e) => __errs.push(String(e.message)));"
           " addEventListener('unhandledrejection', (e) => __errs.push(String(e.reason)));")
    for page, ready in (("pro/cloudbank.html", "document.querySelectorAll('button.zoom').length > 0"),
                        ("cloudbank.html", "document.querySelectorAll('button.zoom').length > 0"),
                        ("index.html", "true")):
        load(b, f"{base}/{page}", reduce=True, choice=True, wait=2)
        st = b.js("({ errs: window.__errs, ok:document.documentElement.classList.contains('motion-ok'),"
                  " hidden: !!(document.querySelector('footer .motion') || { hidden: true }).hidden, ready: " + ready + " })")
        check(not st["errs"] and st["ready"] and not st["ok"] and st["hidden"],
              f"{page} without motion.js: no error, site.js still runs, no button, reduced motion holds ({st['errs']})")
    load(b, home, reduce=False, choice=False)
    moved, swats = follows(b)
    check(moved and swats == 1 and not b.js("window.__errs"), "the home without motion.js, no reduced motion: Willy follows and swats")
    load(b, home + "?room", reduce=False, choice=False, w=1440, h=900, wait=1)
    b.nav(home, 5)
    st = b.js("({ errs: window.__errs, iso: document.documentElement.classList.contains('iso'), willy: !!document.querySelector('canvas.willy') })")
    check(st["iso"] and st["willy"] and not st["errs"], f"the room without motion.js: it shows, with Willy, and no error ({st['errs']})")
    b.call("Network.setBlockedURLs", urls=[])
    b.js("localStorage.setItem('site:room', '0')")

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
