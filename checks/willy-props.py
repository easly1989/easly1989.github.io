"""Willy and his props (#71-A), each action asked of him through the room's `willy` hook, as he
would choose it on his own: on the computer's top only while its monitor is warm, asleep there, and
down again by himself; on the keyboard, his paws typing punctuation and spaces only after the
prompt, never more than a line, gone when the reader uses the computer; behind the monitor, his
focus ring round only the half of him that shows; at the desk's front edge, sitting along it with
his tail hanging over it. Each said on the live line. Headless Chrome, about four minutes."""
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
PC = "document.querySelector('.pc')"
CUR = "document.querySelector('.pc .boot .cur').textContent"
PROMPT = "carlo@bench:~$ "
BOX = "(() => { const t = document.querySelector('.willy-pet'); if (!t || t.hidden) return null; const a = t.getBoundingClientRect(); return [a.left, a.top, a.right, a.bottom]; })()"
DESK = "ROOM.surfaces.find((s) => s.name === 'desk')"


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


def act(b, name, done, s=45, tries=4):
    """He does the action by that name, until done holds; whether it did."""
    for _ in range(tries):
        # (from the desk, standing: what each of these starts from)
        if b.js(NOW + ".z") != 0:
            until(b, "/^(idle|sit-idle|sleep-idle|loaf)/.test(%s.clip)" % NOW, 60)
            b.js(R + ".act('back to the desk')")
            until(b, NOW + ".z === 0 && !/^jump/.test(%s.clip)" % NOW, 30)
        b.js("__lines.length = 0")
        b.js(R + ".act(%r)" % name)
        if until(b, done, s):
            return True
        print("      (%s: not yet, at %r, said %r)" % (name, b.js(NOW), lines(b)))
    return False


base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.call("Emulation.setFocusEmulationEnabled", enabled=True)
    b.media(prefers_reduced_motion="no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion'); localStorage.removeItem('pc:fried'); sessionStorage.removeItem('pc:on')")
    b.nav(base + "/index.html?room&weather=clear-day", 3)
    if not until(b, "!!(document.querySelector('.room') || {}).willy", 40, 0.5):
        check(False, "Willy is in the room")
        raise SystemExit(1)
    time.sleep(2)
    b.js("window.__e = []; addEventListener('error', (e) => __e.push(e.message)); addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)));"
         "window.__lines = []; new MutationObserver(() => { const t = document.querySelector('.willy-live').textContent; if (t) __lines.push(t); })"
         ".observe(document.querySelector('.willy-live'), { childList: true, characterData: true, subtree: true })")

    # ---- the computer never on this visit: its monitor is cold, and he does not go up there
    until(b, NOW + ".z === 0 && /^(idle|walk|sit-idle)/.test(%s.clip)" % NOW, 30)
    b.js("__lines.length = 0")
    b.js(R + ".act('sleep on the warm monitor')")
    time.sleep(8)
    check(b.js(NOW + ".z") <= 0 and not any("warm monitor" in s for s in lines(b)), f"with the computer cold he stays off its top ({lines(b)!r})")

    # ---- on the computer's top while it is on, asleep, and down again by himself
    b.js(PC + ".querySelector('.power').click()")
    check(bool(until(b, PC + ".classList.contains('ready')", 15)), "the computer is on, at its prompt")
    up = act(b, "sleep on the warm monitor", "/^sleep-idle/.test(%s.clip) && %s.z > 100" % (NOW, NOW))
    check(up, "with the computer on he sleeps on its top")
    if up:
        check(any(s == "Willy curls up on the warm monitor." for s in lines(b)), f"said: {lines(b)!r}")
        # (asleep 20 to 45 s, then whatever he does next from up there, by himself)
        down = until(b, NOW + ".z === 0 && !/^jump/.test(%s.clip)" % NOW, 120, 0.5)
        check(bool(down), "he gets down off the computer by himself, back onto the desk")
        if down:
            moved = until(b, "(() => { const p = %s; return /^(walk|trot|sit|idle|lie|loaf|sneak)/.test(p.clip); })()" % NOW, 20)
            check(bool(moved), "and carries on from there")

    # ---- on the keyboard, typing after the prompt: punctuation and spaces, a line at most
    until(b, PC + ".classList.contains('ready')", 5)
    # (what he may have typed already, on his own, goes first)
    b.js("document.querySelector('.pc .boot .cur').textContent = %r" % PROMPT)
    typed = act(b, "sit on the keyboard", "__lines.includes('Willy sits on the keyboard, and types.') && %s.length > %d" % (CUR, len(PROMPT)), 45)
    check(typed, "on the keyboard, with the computer on, his paws type after the prompt, and it is said")
    if typed:
        time.sleep(4)
        cur = b.js(CUR)
        paws = cur[len(PROMPT):]
        check(cur.startswith(PROMPT) and re.fullmatch(r"[;'\[\],./\\=\- ]{1,24}", paws or "") is not None, f"only punctuation and spaces, 24 at most: {paws!r}")
        # the reader uses the computer: what his paws typed goes before the keys do
        b.js("window.__cur = []; new MutationObserver(() => __cur.push(%s)).observe(document.querySelector('.pc .boot .cur'), { childList: true, characterData: true, subtree: true });"
             "addEventListener('beforeunload', () => sessionStorage.setItem('cur', JSON.stringify(__cur)))" % CUR)
        b.js(PC + ".querySelector('.use').click()")
        time.sleep(2)
        seen = b.js("JSON.parse(sessionStorage.getItem('cur') || '[]')") or []
        check(bool(seen) and all(re.fullmatch(re.escape(PROMPT) + r"t?t?y?", s) for s in seen), f"used, the prompt shows only what the reader types: {seen!r}")
        b.nav(base + "/index.html?room&weather=clear-day", 3)
        until(b, "!!(document.querySelector('.room') || {}).willy", 40, 0.5)
        time.sleep(2)
        b.js("window.__lines = []; new MutationObserver(() => { const t = document.querySelector('.willy-live').textContent; if (t) __lines.push(t); })"
             ".observe(document.querySelector('.willy-live'), { childList: true, characterData: true, subtree: true })")

    # ---- behind the monitor: the focus ring round only the half of him that shows
    hid = act(b, "behind the monitor", "/^(loaf|sit-idle)/.test(%s.clip) && __lines.some((l) => /behind the monitor/.test(l))" % NOW)
    check(hid, "he slips behind the monitor, and it is said")
    if hid:
        time.sleep(1)
        whole = b.js(BOX)
        b.js("document.querySelector('.willy-pet').focus()")
        time.sleep(0.3)
        seen = b.js(BOX)
        b.js("document.activeElement.blur()")
        area = lambda r: (r[2] - r[0]) * (r[3] - r[1]) if r else 0
        check(bool(seen) and 0 < area(seen) < area(whole), f"focused, his ring goes round only what shows of him ({seen!r} in {whole!r})")

    # ---- at the desk's front edge: along it, his tail over it
    sat = act(b, "sit at the edge", "/^sit-idle/.test(%s.clip) && __lines.some((l) => /edge of the desk/.test(l))" % NOW)
    check(sat, "he sits at the desk's front edge, and it is said")
    if sat:
        time.sleep(1.5)  # (his tail falls over it in about 0.6 s)
        p = b.js(NOW)
        d = b.js(DESK)
        check(p["h"] % 180 == 0 and d["y1"] - p["y"] <= 120, f"along the edge, near it: {p!r}, the edge at {d['y1']}")
        # (the edge, on the screen, where his tail's last bone is: the edge runs aslant there)
        tip = b.js(R + ".tip()")
        (ax, ay), (bx, by) = (b.js("ROOM.toScreen(%f, %f, %f)" % (p["x"] + dx, d["y1"], d["z"])) for dx in (-300, 300))
        edge = ay + (by - ay) * (tip[0] - ax) / (bx - ax) if tip else 0
        check(bool(tip) and tip[1] > edge, f"the last bone of his tail is over the edge, below it: at {tip and tip[1]:.0f}, the edge at {edge:.0f}")

    check(not b.js("window.__e"), f"nothing throws ({b.js('window.__e')!r})")
    b.js("localStorage.setItem('site:room', '0')")
finally:
    b.close()

print("\n" + ("FAILED: " + "; ".join(failures) if failures else "all ok"))
raise SystemExit(1 if failures else 0)
