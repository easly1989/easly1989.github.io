"""What falls in the room (#72-A): cannon-es 0.20.0 is in vendor/ with its licence; each visit
draws three to five of the seven odds and ends (all seven with ?odds); until something is pushed
the physics does not run and every body sleeps; a thing pushed over the desk's front edge falls,
turns, and is taken out of the room once out of the frame, the others staying where they were,
and then nothing runs; under reduced motion a push is refused and nothing moves. Nothing throws.
Headless Chrome, about a minute."""
import gzip
import json
import pathlib
import time

from cdp import Browser
from serve import serve

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


ROOT = pathlib.Path(__file__).resolve().parent.parent
POOL = {"pencil", "eraser", "clip", "coin", "bottle-cap", "usb-stick", "rubber-band"}
R = "document.querySelector('.room')"
STATE = "JSON.stringify(%s.fall.state())" % R
LOOSE = "JSON.stringify([...document.querySelectorAll('.loose')].map((e) => [...e.classList].find((c) => c !== 'loose')))"
ERRORS = ("window.__e = []; addEventListener('error', (e) => __e.push(e.message));"
          "addEventListener('unhandledrejection', (e) => __e.push(String(e.reason)))")
# (the eraser put near the desk's front edge, the coin a little behind it, the rest taken away)
PLACE = """(() => {
  const at = { eraser: [300, 900, 10], coin: [700, 700, 0] };
  for (const e of [...document.querySelectorAll('.loose')]) {
    const k = Object.keys(at).find((k) => e.classList.contains(k));
    if (!k) { e.remove(); continue; }
    e.style.left = at[k][0] + 'px'; e.style.top = at[k][1] + 'px'; e.style.setProperty('--r', at[k][2] + 'deg');
  }
})()"""


def until(b, expr, s, step=0.2):
    end = time.time() + s
    while time.time() < end:
        v = b.js(expr)
        if v:
            return v
        time.sleep(step)
    return None


def room(b, query):
    b.nav(base + "/index.html?" + query, 2)
    return until(b, "!!(%s || {}).fall" % R, 40, 0.5)


# ---- the library, as published, with its licence
lib = ROOT / "vendor" / "cannon-es" / "cannon-es.js"
check(lib.exists() and (ROOT / "vendor" / "cannon-es" / "LICENSE").exists(), "vendor/cannon-es holds cannon-es.js and its LICENSE")
if lib.exists():
    raw = lib.read_bytes()
    print("      (cannon-es.js: %d bytes, %d gzipped)" % (len(raw), len(gzip.compress(raw, 9))))
    check(len(gzip.compress(raw, 9)) < 100_000, "and it is under 100 KB gzipped")

base = serve()
b = Browser(1440, 900, headless=True)
try:
    b.media(prefers_reduced_motion="no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room', '1'); localStorage.removeItem('site:motion')")

    # ---- three to five of the pool on each visit, all seven with ?odds
    counts = []
    for _ in range(4):
        if not room(b, "room&weather=clear-day"):
            check(False, "the room's falling things are set up")
            raise SystemExit(1)
        names = json.loads(b.js(LOOSE))
        counts.append(len(names))
        check(3 <= len(names) <= 5 and set(names) <= POOL and len(set(names)) == len(names), f"a visit draws three to five of the seven: {names}")
    room(b, "room&odds&weather=clear-day")
    check(set(json.loads(b.js(LOOSE))) == POOL, "with ?odds all seven are on the desk")

    # ---- at rest, nothing runs
    b.js(ERRORS)
    b.js(PLACE)
    time.sleep(0.5)
    s = json.loads(b.js(STATE))
    check(not s["running"] and all(x["asleep"] for x in s["bodies"]) and len(s["bodies"]) == 2, f"before a push the physics does not run and both bodies sleep: {s}")
    coin = next(x for x in s["bodies"] if x["name"] == "coin")

    # ---- pushed over the front edge: it falls, turns, and leaves the room; the coin stays
    b.js("window.__tf = []; const _e = document.querySelector('.loose.eraser');"
         "new MutationObserver(() => __tf.push(_e.style.transform)).observe(_e, { attributes: true, attributeFilter: ['style'] })")
    pushed = b.js("%s.fall.push(document.querySelector('.loose.eraser'), [0, 1300, 0], [0, 0, 1.2])" % R)
    check(pushed is True, "a push on the eraser is taken")
    seen = until(b, "%s.fall.state().bodies.some((x) => x.name === 'eraser' && x.z < -20)" % R, 4, 0.05)
    check(bool(seen), "the eraser goes over the edge and falls below the desk's top")
    gone = until(b, "%s.fall.state().removed.includes('eraser') && !document.querySelector('.loose.eraser')" % R, 8)
    check(bool(gone), "once out of the frame it is taken out of the room")
    tf = b.js("__tf.filter((t) => t.startsWith('matrix3d')).length")
    check((tf or 0) >= 5, f"its element followed the body by matrix3d, frame by frame ({tf} frames)")
    stopped = until(b, "!%s.fall.state().running" % R, 5)
    s = json.loads(b.js(STATE))
    c2 = next((x for x in s["bodies"] if x["name"] == "coin"), None)
    check(bool(stopped) and c2 is not None and c2["asleep"] and abs(c2["x"] - coin["x"]) < 1 and abs(c2["y"] - coin["y"]) < 1,
          f"then the physics stops, and the coin lies where it was, asleep: {c2}")
    check(b.js("__e.length") == 0, f"nothing threw: {b.js('JSON.stringify(__e)')}")

    # ---- under reduced motion a push is refused
    b.media(prefers_reduced_motion="reduce", prefers_color_scheme="light")
    room(b, "room&odds&weather=clear-day")
    b.js(ERRORS)
    refused = b.js("%s.fall.push(document.querySelector('.loose.eraser'), [0, 1300, 0])" % R)
    time.sleep(1.5)
    s = json.loads(b.js(STATE))
    check(refused is False and not s["running"] and not s["removed"] and len(json.loads(b.js(LOOSE))) == 7,
          f"under reduced motion a push is refused and nothing falls: {refused}, {s['running']}, {s['removed']}")
    check(b.js("__e.length") == 0, "nothing threw")
finally:
    b.close()

print("\n%d failed" % len(failures) if failures else "\nall ok")
raise SystemExit(1 if failures else 0)
