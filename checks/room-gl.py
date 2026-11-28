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
# points of the old computer's own frame (its units: 92 wide, 70 deep, 80 tall, four px of the room to a unit), at the CSS room and
# in the scene: the case's corners at its foot and its top, the keyboard's front corners, the mouse's middle
PCPTS = {
    "case foot nw": (0, 0, 0), "case foot ne": (92, 0, 0), "case foot sw": (0, 70, 0), "case foot se": (92, 70, 0),
    "case top nw": (0, 0, 80), "case top se": (92, 70, 80),
    "keyboard front left": (-4, 112, 0), "keyboard front right": (96, 112, 0), "mouse": (120.5, 101, 0),
}
OLDPC = "(() => { const pc = document.querySelector('.pc'), m = ROOM.toStage(pc), o = {}; for (const [k, p] of Object.entries(%s)) { const q = m.transformPoint(new DOMPoint(...p)); o[k] = ROOM.toScreen(q.x, q.y, q.z); } return o; })()"
NEWPC = "(() => { const g = ROOMGL.objects.pc, o = {}; for (const [k, p] of Object.entries(%s)) { const q = g.localToWorld(new ROOMGL.THREE.Vector3(4 * p[0] - 184, 140 - 4 * p[1], 4 * p[2])); o[k] = ROOMGL.project(q.x + 640, 440 - q.y, q.z); } return o; })()"
# the other things of the room (#165, #164): a point of each in the CSS room's own element (selector, a point of its frame) and the same
# point in the scene (the object, its point in the object's frame: x east, y north, z up, from the origin the object's file says)
ITEMS = {
    "window top left": (".on-wall.window > .window", (0, 0, 0), "window", (-300, -2, 660)),
    "window bottom right": (".on-wall.window > .window", (600, 380, 0), "window", (300, -2, 280)),
    "plant pot top": (".plant", (28, 28, 58), "shelf", (-52, -38, 228)),
    "radio top": (".radio", (42, 105, 120), "shelf", (-54, -585, 290)),
    "chair seat": (".chair", (170, 145, -260), "chair", (0, 15, 300)),
    "chair headrest top": (".chair", (170, 297, 460), "chair", (0, -137, 1020)),
    "wastebasket rim": (".wastebasket", (0, 0, 200), "bin", (0, 0, 200)),
    # the books' covers: their top corners (the CSS element's local z is 0 at its top)
    "ledger nw": (".ledger", (0, 0, 0), "ledger", (-125, 165, 30)),
    "ledger se": (".ledger", (250, 330, 0), "ledger", (125, -165, 30)),
    "agenda nw": (".agenda", (0, 0, 0), "agenda", (-110, 145, 24)),
    "agenda se": (".agenda", (220, 290, 0), "agenda", (110, -145, 24)),
}
OLDITEMS = ("(() => { const o = {}; for (const [k, [sel, p]] of Object.entries(%s)) { const e = document.querySelector(sel), q = ROOM.toStage(e).transformPoint(new DOMPoint(...p)); o[k] = ROOM.toScreen(q.x, q.y, q.z); } return o; })()") % json.dumps({k: [v[0], v[1]] for k, v in ITEMS.items()})
NEWITEMS = ("(() => { const o = {}; for (const [k, [name, p]] of Object.entries(%s)) { const q = ROOMGL.objects[name].localToWorld(new ROOMGL.THREE.Vector3(...p)); o[k] = ROOMGL.project(q.x + 640, 440 - q.y, q.z); } return o; })()") % json.dumps({k: [v[2], v[3]] for k, v in ITEMS.items()})
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
        old[(w, h, "pc")] = b.js(OLDPC % json.dumps(PCPTS))
        old[(w, h, "items")] = b.js(OLDITEMS)
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
        # the old computer, its keyboard and its mouse, where the CSS room has them (the case is on the desk, 4 px under the mat's top,
        # so its top corners may differ by what 4 px up is on the screen, about 3 px)
        pcn = b.js(NEWPC % json.dumps(PCPTS))
        pcw = max(((abs(pcn[k][0] - old[(w, h, "pc")][k][0]) ** 2 + abs(pcn[k][1] - old[(w, h, "pc")][k][1]) ** 2) ** 0.5, k) for k in PCPTS)
        check(pcw[0] <= 1.5, f"{w} x {h}: the computer, keyboard and mouse are where the CSS room has them (the worst, {pcw[1]}, {pcw[0]:.2f} px off)")
        # the window, the shelf with the plant and the radio, the chair and the wastebasket
        itn = b.js(NEWITEMS)
        itw = max(((abs(itn[k][0] - old[(w, h, "items")][k][0]) ** 2 + abs(itn[k][1] - old[(w, h, "items")][k][1]) ** 2) ** 0.5, k) for k in ITEMS)
        check(itw[0] <= 1.5, f"{w} x {h}: the window, the shelf, the plant, the radio, the chair, the wastebasket and the two books are where the CSS room has them (the worst, {itw[1]}, {itw[0]:.2f} px off)")
        # the tie hangs on the chair's headrest where it stands: its origin is at (-70, -137, 1019) of the chair's frame
        tie_off = b.js("(() => { const O = ROOMGL.objects, p = O.chair.localToWorld(new ROOMGL.THREE.Vector3(-70, -137, 1019)); return Math.hypot(p.x - O.tie.position.x, p.y - O.tie.position.y, p.z - O.tie.position.z) + Math.abs(O.tie.rotation.z - O.chair.rotation.z); })()")
        check(tie_off < 0.01, f"{w} x {h}: the tie is on the chair's headrest, turned as the chair is ({tie_off:.4f} off)")
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
    px = b.js("(() => { " + VIS + " return { mat: at([250, 200, 0]), desk: at([-300, 500, -4]), wall: at(vis(WALL)), floor: at(vis(FLOOR)) }; })()")
    check(len({tuple(v) for v in px.values()}) == 4 and all(sum(v) > 0 for v in px.values()), f"the mat, the desk, a wall and the floor are drawn, each its own colour ({px})")
    check(px["mat"][1] > px["mat"][0] and px["mat"][1] > px["mat"][2], "the mat is green")

    # the dark scheme
    before = b.js("ROOMGL.drawn")
    b.media(prefers_color_scheme="dark")
    check(wait(b, f"ROOMGL.drawn > {before}", 20), "the scheme changing draws the scene again")
    dark =b.js("(() => { " + VIS + " return { mat: at([250, 200, 0]), wall: at(vis(WALL)) }; })()")
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
