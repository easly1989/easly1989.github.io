"""The room's sound effects (#72-C): the old computer has a speaker button, labelled, that mutes them
(the console's own setting, `pc:mute`) and not the radio; Willy's mew, and what falls off the desk
landing on the floor out of sight, go through the same effects, which wait until the reader has
pressed or typed. Under reduced motion he makes none. Headless Chrome, a minute or two."""
import time

from cdp import Browser
from serve import serve

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


R = "document.querySelector('.room').willy"
SPEAKER = "(() => { const s = document.querySelector('.pc .speaker'); if (!s) return null; const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()"
COUNT = "JSON.stringify(window.__snd)"


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


NOW = R + ".now()"


def calm(b):
    """On the desk and standing, which is where the action starts from."""
    if b.js(NOW + ".z") != 0:
        until(b, "/^(idle|sit-idle|sleep-idle|loaf)/.test(%s.clip)" % NOW, 60)
        b.js(R + ".act('back to the desk')")
    until(b, NOW + ".z === 0 && !/^jump/.test(%s.clip)" % NOW, 30)


def open_room(b, base, reduced):
    b.media(prefers_reduced_motion="reduce" if reduced else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion'); localStorage.removeItem('pc:mute'); sessionStorage.removeItem('pc:on')")
    b.nav(base + "/index.html?room&weather=clear-day", 3)
    if not reduced and not until(b, "!!(document.querySelector('.room') || {}).willy", 40, 0.5):
        return False
    time.sleep(2)
    # (each effect counted as it is asked for, whether it can be heard or not)
    b.js("window.__snd = {}; for (const k of ['mew', 'purr', 'thud']) { const f = CRT[k]; CRT[k] = function (...a) { __snd[k] = (__snd[k] || 0) + 1; return f.apply(CRT, a); }; }")
    b.js("window.__e = []; addEventListener('error', (e) => __e.push(e.message)); addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)));")
    return True


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    if not open_room(b, base, False):
        check(False, "Willy is in the room")
        raise SystemExit(1)

    # ---- the speaker button on the old computer
    s = b.js("(() => { const s = document.querySelector('.pc .speaker'); return s && [s.tagName, s.getAttribute('aria-label'), s.getAttribute('aria-pressed')]; })()")
    check(s == ["BUTTON", "Sound effects", "true"], f"a labelled speaker button, sounding at first: {s!r}")
    pos = b.js(SPEAKER)
    check(bool(pos) and 0 <= pos[0] <= 1440 and 0 <= pos[1] <= 900, f"inside the window: {pos!r}")
    check(b.js("CRT.heard()") is False, "no effect may play before the reader has pressed or typed")

    # ---- Willy's mew goes through the effects (asked for before any press: it waits)
    calm(b)
    b.js(R + ".act('meow at you')")
    check(bool(until(b, "(window.__snd || {}).mew > 0", 40)), f"he mews through the computer's speaker: {b.js(COUNT)}")
    check(b.js("CRT.heard()") is False, "and it waited for the reader (nothing was pressed)")

    # ---- the three recordings of his mew are there and decode
    ok = b.js("(async () => { try { for (const n of [1, 2, 3]) { const a = await (await fetch('assets/sounds/mew-' + n + '.mp3')).arrayBuffer(); const x = await new AudioContext().decodeAudioData(a); if (!(x.duration > 0.3)) return false; } return true; } catch (e) { return false; } })()")
    check(ok is True, f"the three recordings of his mew load and decode: {ok!r}")

    # ---- what falls lands on the floor out of sight: a thud
    b.js("document.querySelector('.stage').dispatchEvent(new CustomEvent('knocked', { detail: document.body }))")
    check(bool(until(b, "(window.__snd || {}).thud > 0", 3)), f"a thud after something has fallen off the desk: {b.js(COUNT)}")

    # ---- the button mutes them, and keeps it
    if pos:
        click(b, *pos)
        time.sleep(0.4)
        check(b.js("document.querySelector('.pc .speaker').getAttribute('aria-pressed')") == "false", "pressed, the speaker is muted")
        check(b.js("localStorage.getItem('pc:mute')") == "1" and b.js("CRT.muted()") is True, "in the console's setting, `pc:mute`")
        check("off" in b.js("document.querySelector('.pc .vh').textContent"), "and a screen reader is told")
        check(b.js("CRT.heard()") is True, "the press woke the sound")
        b.nav(base + "/index.html?room&weather=clear-day", 3)
        time.sleep(2)
        check(b.js("document.querySelector('.pc .speaker').getAttribute('aria-pressed')") == "false", "a new visit keeps it muted")
        pos = b.js(SPEAKER)
        click(b, *pos)
        time.sleep(0.4)
        check(b.js("document.querySelector('.pc .speaker').getAttribute('aria-pressed')") == "true" and b.js("localStorage.getItem('pc:mute')") == "0", "pressed again, it sounds")
    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")

    # ---- the radio is not the computer's: its own setting stays
    check(b.js("!!document.querySelector('.radio-face .power')"), "the radio has its own switch, apart from the speaker")

    # ---- under reduced motion he makes none
    open_room(b, base, True)
    b.js("document.querySelector('.room').willy && document.querySelector('.room').willy.act('meow at you')")
    time.sleep(4)
    check(not (b.js("window.__snd") or {}), "under reduced motion he makes no sound")
    b.js("localStorage.setItem('site:room', '0'); localStorage.removeItem('pc:mute')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
