"""The room as a three.js scene (#160, ticket 02), reached through ?roomgl while the room is rebuilt:
it starts, draws, and falls back to the professional home without WebGL 2; its camera and its
framing are the CSS room's (the same points of the room land on the same pixels, within 1 px, at the
five window sizes the room is framed for); the desk, the mat and the walls are what is drawn, in both
colour schemes; the box it keeps for the head's decision is the CSS room's. Headless (software
drawing): the look, and the seams, are judged on a real GPU in the owner's Chrome."""
import json
import sys
import time

from cdp import Browser
from serve import serve

# the five the room is framed for, and one that is bound by width, not height (1200 x 1000), and one at the
# largest scale (2560 x 1440)
SIZES = [(1280, 720), (1366, 768), (1440, 900), (1920, 1080), (2560, 1080), (1200, 1000), (2560, 1440)]
# points of the room, as the CSS room's own px (x east, y south, z up): the mat's corners, the desk's,
# the top of the walls' corner, the floor's, a chair's place
POINTS = {
    "mat nw": (-40, -40, 0), "mat ne": (1320, -40, 0), "mat se": (1320, 920, 0), "mat sw": (-40, 920, 0),
    "desk nw": (-560, -150, -4), "desk se": (1330, 1030, -4), "desk leg": (-530, -120, -560),
    "wall corner top": (1350, -200, 2440), "back wall at the desk": (640, -200, 600),
    "floor": (1000, 2000, -560), "chair": (560, 1080, -260),
}
OLD = "(() => { const o = {}; for (const [k, p] of Object.entries(%s)) o[k] = ROOM.toScreen(...p); return o; })()"
NEW = "(() => { const o = {}; for (const [k, p] of Object.entries(%s)) o[k] = ROOMGL.project(...p); return o; })()"
READY = "!!(window.ROOMGL && window.ROOMGL.ready)"

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def wait(b, expr, secs=40):
    for _ in range(int(secs * 2)):
        if b.js(expr):
            return True
        time.sleep(0.5)
    return False


def start(b, w, h, query, keys):
    b.size(w, h)
    b.nav(base + "/index.html", 0.5)
    b.js("sessionStorage.removeItem('room-gl-failed');" + keys)
    b.nav(base + "/index.html" + query, 1)


base = serve()
old = {}
b = Browser(1460, 1000, headless=True)
try:
    b.media(prefers_reduced_motion="reduce", prefers_color_scheme="light")
    # the CSS room's points, at each size
    for w, h in SIZES:
        start(b, w, h, "?room", "localStorage.setItem('site:room','1');localStorage.setItem('room-gl','0')")
        wait(b, "!!window.ROOM && !!document.querySelector('.stage')")
        time.sleep(1)
        old[(w, h)] = b.js(OLD % json.dumps(POINTS))
        old[(w, h, "box")] = json.loads(b.js("localStorage.getItem('room-box')"))
finally:
    b.close()

b = Browser(1460, 1000, headless=True)
try:
    b.media(prefers_reduced_motion="reduce", prefers_color_scheme="light")
    for w, h in SIZES:
        start(b, w, h, "?room", "localStorage.setItem('site:room','1');localStorage.setItem('room-gl','1')")
        if not wait(b, READY):
            check(False, f"{w} x {h}: the scene starts and draws")
            continue
        time.sleep(0.5)
        check(b.js("document.documentElement.classList.contains('gl') && !document.documentElement.classList.contains('iso')") and b.js("ROOMGL.drawn >= 1"),
              f"{w} x {h}: the scene starts and draws, and the CSS room does not")
        new = b.js(NEW % json.dumps(POINTS))
        worst = max(((abs(new[k][0] - old[(w, h)][k][0]) ** 2 + abs(new[k][1] - old[(w, h)][k][1]) ** 2) ** 0.5, k) for k in POINTS)
        check(worst[0] <= 1.0, f"{w} x {h}: the same points of the room on the same pixels as the CSS room's (the worst, {worst[1]}, {worst[0]:.2f} px off)")
        box = json.loads(b.js("localStorage.getItem('room-box')"))
        ob = old[(w, h, "box")]
        check(all(abs(box[k] - ob[k]) <= 1 for k in ("w", "h", "dw", "dh")), f"{w} x {h}: the box it keeps for the head is the CSS room's ({box} against {ob})")

    # what is drawn: not blank, and the mat, the desk and the walls are different colours
    start(b, 1440, 900, "?room", "localStorage.setItem('site:room','1');localStorage.setItem('room-gl','1')")
    wait(b, READY)
    time.sleep(0.5)
    # (each of the walls and the floor at the first of a few places that is inside the window)
    VIS = """const vis = (list) => list.find((p) => { const s = ROOMGL.project(...p); return s[0] > 20 && s[0] < innerWidth - 20 && s[1] > 20 && s[1] < innerHeight - 20; });
      const at = (p) => ROOMGL.pixel(...ROOMGL.project(...p));
      const grid = (f) => { const l = []; for (let a = -1500; a <= 3000; a += 100) for (let b = -500; b <= 2400; b += 100) l.push(f(a, b)); return l; };
      const WALL = grid((a, b) => [a, -200, b]).filter((p) => p[0] < 1300 && p[2] > 100), FLOOR = grid((a, b) => [a, b + 600, -560]).filter((p) => p[0] < 1300 && p[1] > 1100);"""
    px = b.js("(() => { " + VIS + " return { mat: at([600, 300, 0]), desk: at([-300, 500, -4]), wall: at(vis(WALL)), floor: at(vis(FLOOR)) }; })()")
    check(len({tuple(v) for v in px.values()}) == 4 and all(sum(v) > 0 for v in px.values()), f"the mat, the desk, a wall and the floor are drawn, each its own colour ({px})")
    check(px["mat"][1] > px["mat"][0] and px["mat"][1] > px["mat"][2], "the mat is green")

    # the dark scheme
    before = b.js("ROOMGL.drawn")
    b.media(prefers_color_scheme="dark")
    check(wait(b, f"ROOMGL.drawn > {before}", 20), "the scheme changing draws the scene again")
    dark =b.js("(() => { " + VIS + " return { mat: at([600, 300, 0]), wall: at(vis(WALL)) }; })()")
    check(sum(dark["mat"]) < sum(px["mat"]) and sum(dark["wall"]) < sum(px["wall"]), f"in the dark scheme the mat and the wall are darker ({dark} against {px['mat']}, {px['wall']})")

    # a window that grows or shrinks is framed again, to the same points
    before = b.js("ROOMGL.drawn")
    b.size(1920, 1080)
    wait(b, f"ROOMGL.drawn > {before}", 20)
    a = b.js(NEW % json.dumps(POINTS))
    worst = max(((abs(a[k][0] - old[(1920, 1080)][k][0]) ** 2 + abs(a[k][1] - old[(1920, 1080)][k][1]) ** 2) ** 0.5) for k in POINTS)
    check(worst <= 1.0, f"resized to 1920 x 1080 it is framed as the CSS room is ({worst:.2f} px off)")

    # a window that shrinks below what holds the room: the professional page, not the scene cut off
    b.size(800, 700)
    time.sleep(2)
    check(not b.js("document.documentElement.classList.contains('gl')") and b.js("getComputedStyle(document.querySelector('.pro')).display !== 'none'"),
          "a window shrunk below what holds the room gets the professional page")

    b.media(prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html?roomgl=0", 2)
    check(b.js("localStorage.getItem('room-gl') === '0'") and not b.js("document.documentElement.classList.contains('gl')"), "?roomgl=0 takes the scene away")

    # the scene's code failing to load: the professional page, and no loop of reloads
    b.js("localStorage.setItem('room-gl','1'); sessionStorage.removeItem('room-gl-failed')")
    b.call("Network.enable")
    b.call("Network.setBlockedURLs", urls=["*room-gl.js"])
    b.nav(base + "/index.html", 4)
    check(b.js("sessionStorage.getItem('room-gl-failed') === '1'") and not b.js("document.documentElement.classList.contains('gl')") and b.js("getComputedStyle(document.querySelector('.pro')).display !== 'none'"),
          "if the scene's code does not load, the home is the professional page")
    b.call("Network.setBlockedURLs", urls=[])
    b.nav(base + "/index.html?roomgl", 3)
    check(b.js("sessionStorage.getItem('room-gl-failed') === null") and wait(b, READY, 20), "?roomgl tries again after a failure")
finally:
    b.close()

# a reader, with no room-dev key, gets the work-in-progress page whatever else is in the browser
b = Browser(1460, 1000, headless=True, room_dev=False)
try:
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room','1');localStorage.setItem('room-gl','1');sessionStorage.removeItem('room-gl-failed')")
    b.nav(base + "/index.html", 3)
    check(b.js("document.documentElement.classList.contains('wip')") and not b.js("!!document.querySelector('canvas.room-gl')") and not b.js("document.documentElement.classList.contains('gl')"),
          "without the room-dev key the scene is not reached: the work-in-progress page")
finally:
    b.close()

# without WebGL 2 the home is the professional page, whatever was chosen
b = Browser(1460, 1000, headless=True, flags=["--disable-3d-apis"])
try:
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room','1');localStorage.setItem('room-gl','1');sessionStorage.removeItem('room-gl-failed')")
    b.nav(base + "/index.html", 3)
    check(not b.js("document.documentElement.classList.contains('gl')") and not b.js("!!document.querySelector('canvas.room-gl')")
          and b.js("getComputedStyle(document.querySelector('.pro')).display !== 'none'"), "without WebGL 2 the home is the professional page")
finally:
    b.close()

sys.exit(1 if failures else 0)
