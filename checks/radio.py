"""The radio, as a reader hears it: off at first, with nothing fetched; switched on by its knob
in the room it plays the tuned station at 0.4, and its projector shows the track on the wall; the next station
is fetched only once tuned in. It carries on from page to page where it would be by now; in
the console it is quiet, and back out it carries on from where it stopped. In a visit to the
room every page's bar carries the radio, whose knobs stop it and change station. About credits every
track. With the radio on, every station's words on the wall are inside the window at every size,
and clicking the projector shuts it for the visit. Out of the room while it plays, every page
still carries the radio that stops it. Needs a window that is actually painting, so it opens one, with autoplay allowed."""
import json
import sys
import time

from cdp import Browser
from serve import serve

# what plays: every media element that is asked to play, kept where the check can read it
PROBE = r"""
(() => {
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__audio = this; return play.call(this); };
})();
addEventListener('error', (e) => { const l = JSON.parse(localStorage.__errs || '[]'); l.push(location.pathname + ': ' + e.message); localStorage.__errs = JSON.stringify(l); });
"""
HEAR = """(() => { const a = window.__audio; return a ? { src: a.getAttribute('src'), playing: !a.paused, t: a.currentTime, volume: a.volume } : null; })()"""
FETCHED = "performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('/assets/radio/')).map((n) => n.split('/').pop())"
POINT = """((sel) => { const t = document.querySelector(sel); if (!t) return null; const r = t.getBoundingClientRect();
  for (const [fx, fy] of [[.5,.5],[.4,.5],[.6,.5],[.5,.4],[.5,.6]]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy, h = document.elementFromPoint(x, y);
    if (h && t.contains(h)) return [x, y]; }
  return null; })"""
# the radio at the head of a page's bar: whether it is there, and its power knob
TOGGLE = """(() => { const t = document.querySelector('header.bar .page-radio .pr-power'); return t ? { shown: t.offsetWidth > 0, pressed: t.getAttribute('aria-pressed'), on: document.querySelector('.page-radio .pr-on').textContent } : null; })()"""

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def press(b, sel):
    pt = b.js(POINT + f"('{sel}')")
    if not pt:
        check(False, f"{sel} can be pointed at")
        return
    for t in ("mouseMoved", "mousePressed", "mouseReleased"):
        b.call("Input.dispatchMouseEvent", type=t, x=pt[0], y=pt[1], button="left", clickCount=1)


def go(b, page, wait=3):
    """Leave by a link, as a reader does, so the page is told where it is going."""
    b.js(f"location.href = '{page}'")
    time.sleep(wait)


base = serve()
b = Browser(1460, 960, headless=False, flags=["--autoplay-policy=no-user-gesture-required"])
try:
    b.call("Page.addScriptToEvaluateOnNewDocument", source=PROBE)
    b.size(1440, 900)
    b.media(prefers_reduced_motion="no-preference")
    b.nav(base + "/index.html?room", 3)
    b.js("sessionStorage.removeItem('radio'); sessionStorage.setItem('room-light', 'on'); localStorage.__errs = '[]'")
    b.nav(base + "/index.html", 3)

    # outside a visit to the room the pages are as they were; in one, their bar carries the radio, off
    b.js("sessionStorage.setItem('room', '0')")
    b.nav(base + "/nutreek.html", 2)
    check(b.js(TOGGLE) is None, "outside a visit to the room, the pages carry no radio")
    b.js("sessionStorage.setItem('room', '1')")
    b.nav(base + "/nutreek.html", 2)
    tg = b.js(TOGGLE)
    check(bool(tg) and tg["shown"] and tg["pressed"] == "false", f"in a visit to the room, every page's bar carries the radio, off ({tg})")
    b.nav(base + "/index.html", 3)

    # off at first, and nothing fetched
    check(b.js(HEAR) is None and not b.js(FETCHED), "the radio is off at first, and no track has been fetched")
    check(b.js("document.querySelector('.radio-face .power').getAttribute('aria-pressed')") == "false", "its power knob is a labelled button, not pressed")
    # on: the tuned station, at 0.4, named on its tag
    press(b, ".radio-face .power")
    time.sleep(3)
    h = b.js(HEAR)
    check(bool(h) and h["playing"] and h["src"].endswith("lofi_1.mp3") and abs(h["volume"] - 0.4) < 1e-6 and h["t"] > 1, f"switched on, it plays the tuned station at 0.4 ({h})")
    check(b.js("document.querySelector('.radio-face .power').getAttribute('aria-pressed')") == "true", "and its knob is pressed")
    tag = b.js("(() => { const t = document.querySelector('.radio-face .vh'), p = document.querySelector('.projection'); return { text: t.textContent, live: t.getAttribute('aria-live'), wall: p.textContent, lit: p.classList.contains('lit') }; })()")
    check(tag["live"] == "polite" and tag["text"].startswith("On the radio:") and tag["lit"] and len(tag["wall"]) > 4, f"the projector shows the track on air on the wall, and a screen reader hears it ({tag})")
    # the next station: fetched only now
    press(b, ".radio-face .tune")
    time.sleep(2)
    h = b.js(HEAR)
    fetched = b.js(FETCHED)
    check(bool(h) and h["playing"] and h["src"].endswith("lofi_2.mp3"), f"the tuning knob goes to the next station ({h and h['src']})")
    check(sorted(set(fetched)) == ["lofi_1.mp3", "lofi_2.mp3"], f"each track is fetched only once its station is tuned in ({sorted(set(fetched))})")
    check(b.js("document.querySelector('.projection').textContent") != tag["wall"], "and the projection names the new track")

    # across pages: where it would be by now
    t0 = b.js(HEAR)["t"]
    left = time.time()
    go(b, "cloudbank.html")
    h = b.js(HEAR)
    gone = time.time() - left
    check(bool(h) and h["playing"] and h["src"].endswith("lofi_2.mp3") and abs(h["t"] - (t0 + gone)) < 2.5, f"on the next page it carries on where it would be by now ({t0:.1f} s, then {h and round(h['t'], 1)} s after {gone:.1f} s)")
    tg = b.js(TOGGLE)
    check(bool(tg) and tg["shown"] and tg["pressed"] == "true" and "Lofi Pop" in tg["on"], f"the radio in the bar is on, and says what is on air ({tg})")

    # quiet in the console, and on from where it stopped after
    go(b, "index.html", 3)
    b.js("sessionStorage.setItem('pc:on', '1')")  # the computer was switched on, so the console works
    t0 = b.js(HEAR)["t"]
    go(b, "terminal.html", 4)
    check(b.js(HEAR) is None and "terminal.html" in b.js("location.pathname"), "in the console the radio is quiet")
    left = time.time()
    go(b, "about.html", 3)
    h = b.js(HEAR)
    here = 3  # it plays on About for the wait; the 4 s in the console must not count
    check(bool(h) and h["playing"] and abs(h["t"] - (t0 + here)) < 1.5, f"back out, it carries on from where it stopped ({t0:.1f} s, then {h and round(h['t'], 1)} s after {here} s here, {time.time() - left:.1f} s in all)")
    credits = b.js("(() => { const c = document.getElementById('radio-credits'); return c && !c.hidden ? c.querySelectorAll('li').length : 0; })()")
    check(credits == 5, f"the foot of About credits every track ({credits})")

    # the radio in the bar stops it, and starts it again, and changes station
    press(b, "header.bar .pr-power")
    time.sleep(1)
    h = b.js(HEAR)
    tg = b.js(TOGGLE)
    check(bool(h) and not h["playing"] and tg["shown"] and tg["pressed"] == "false", f"the radio in the bar stops it ({h}, {tg})")
    go(b, "donate.html")
    check(b.js(HEAR) is None and b.js(TOGGLE)["pressed"] == "false", "and it stays off on the next page")
    press(b, "header.bar .pr-power")
    time.sleep(2)
    h = b.js(HEAR)
    check(bool(h) and h["playing"], f"switched on again, it plays ({h})")
    press(b, "header.bar .pr-tune")
    time.sleep(2)
    h = b.js(HEAR)
    check(bool(h) and h["playing"] and h["src"].endswith("ambient.mp3"), f"and its tuning knob changes station ({h and h['src']})")


    # what the projector throws on the wall, every station's, is inside the window at every
    # size the room shows at, and goes when the projector is shut
    INSIDE = """(() => { const out = []; for (const e of document.querySelectorAll('.projection b, .projection small')) {
      const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect();
      if (b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight) out.push(e.textContent + ' ' + [b.left, b.top, b.right, b.bottom].map(Math.round)); }
      return out; })()"""
    b.nav(base + "/index.html", 3)
    if not b.js("RADIO.state().on"):
        press(b, ".radio-face .power")
    for w, hh in [(1280, 720), (1366, 768), (1440, 900), (1920, 1080), (2560, 1080)]:
        b.size(w, hh)
        b.nav(base + "/index.html", 3)
        cut = []
        for _ in range(5):
            cut += b.js(INSIDE)
            b.js("RADIO.next()")
            time.sleep(0.3)
        check(not cut and b.js("document.querySelector('.projection').classList.contains('lit')"), f"{w}x{hh}: the projection is on the wall and every station's words are inside the window" + (f" ({cut})" if cut else ""))
    b.size(1440, 900)
    time.sleep(2)  # the room reloads itself on a resize: let it, before loading it again
    b.nav(base + "/index.html", 3)
    press(b, ".projector .proj-hit")
    time.sleep(0.6)
    shut = b.js("[document.querySelector('.projection').classList.contains('lit'), document.querySelector('.proj-hit').getAttribute('aria-pressed'), getComputedStyle(document.querySelector('.projection')).visibility, document.querySelector('.radio-face .vh').textContent]")
    check(not shut[0] and shut[1] == "false" and shut[2] == "hidden" and shut[3].startswith("On the radio:"), f"clicking the projector shuts it, and a screen reader still hears what is on air ({shut})")
    b.nav(base + "/index.html", 3)
    check(b.js("document.querySelector('.proj-hit').getAttribute('aria-pressed')") == "false", "and it stays shut for the visit")

    # out of the room while it plays, the pages still carry the radio, since it is how it stops
    b.js("sessionStorage.setItem('room', '0')")
    go(b, "planora.html")
    tg = b.js(TOGGLE)
    check(bool(tg) and tg["shown"] and tg["pressed"] == "true", f"out of the room while it plays, the page's bar carries the radio ({tg})")
    press(b, "header.bar .pr-power")
    time.sleep(1)
    h = b.js(HEAR)
    check(bool(h) and not h["playing"], f"and it stops it there ({h})")
    b.js("sessionStorage.setItem('room', '1')")

    errs = json.loads(b.js("localStorage.__errs") or "[]")
    check(not errs, "no script errors" + (f" ({errs})" if errs else ""))
finally:
    b.close()
sys.exit(1 if failures else 0)
