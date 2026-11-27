"""The room's modelling workbench (#160, ticket 03), ?roomgl&bench=<name>: any object of the room alone, in the
room's light on a piece of the mat, turning (still under reduced motion), to be looked at up close. The mug is the
first: a turned body standing on z = 0, a coffee in it, a swept handle on the east, "Buy me a coffee" printed round the
side that faces the camera, in dark letters; an object that is not there lists what is. Headless (software drawing);
how it looks is judged in the owner's Chrome."""
import sys
import time

from cdp import Browser
from serve import serve

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


def open(b, query, motion="reduce"):
    b.media(prefers_reduced_motion=motion, prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("localStorage.setItem('site:room','1');localStorage.setItem('room-gl','1');sessionStorage.removeItem('room-gl-failed')")
    b.nav(base + "/index.html" + query, 1)


# the colour at a point of the object, its own px (what is drawn there, [r, g, b])
AT = "(p) => BENCH.pixel(...BENCH.project(...p))"

base = serve()
b = Browser(1460, 1000, headless=True)
try:
    open(b, "?bench=mug")
    if not wait(b, "!!(window.BENCH && BENCH.ready)"):
        print("FAIL  the workbench starts with the mug, and draws")
        sys.exit(1)
    check(True, "the workbench starts with the mug, and draws")
    check(b.js("BENCH.names.includes('mug') && BENCH.name === 'mug'") and b.js("!!document.querySelector('nav[aria-label=Workbench] a[href=\"?bench=mug\"]')"),
          "it lists the objects there are, each a link, and says which it shows")
    check(b.js("document.documentElement.classList.contains('gl') && !document.documentElement.classList.contains('iso')"), "the CSS room is not there")
    time.sleep(0.5)

    # the shape: it stands on z = 0, 124 px high and about 131 across, as the CSS room's mug
    box = b.js("""(() => { const B = new BENCH.THREE.Box3().setFromObject(BENCH.group); return [B.min.z, B.max.z, B.max.x - B.min.x, B.max.y - B.min.y]; })()""")
    check(abs(box[0]) < 0.6 and abs(box[1] - 124) < 1.5, f"the mug stands on z = 0 and is 124 px high ({box[0]:.2f} to {box[1]:.2f})")
    check(box[2] > 125 and box[2] < 185 and box[3] > 125 and box[3] < 140, f"it is 131 px across the body, with the handle on the east ({box[2]:.0f} by {box[3]:.0f})")

    # what is drawn: the china is light, the coffee dark and brown, and the mat green round it
    px = b.js(f"""(() => {{ const at = {AT}; return {{ rim: at([0, -60, 124]), coffee: at([0, 0, 112]), mat: at([-85, -65, 0]) }}; }})()""")
    check(sum(px["rim"]) > 450, f"the rim is china, light ({px['rim']})")
    check(px["coffee"][0] > px["coffee"][2] and sum(px["coffee"]) < 330, f"the coffee is dark and brown ({px['coffee']})")
    check(px["mat"][1] > px["mat"][0] and px["mat"][1] > px["mat"][2], f"the mat under it is green ({px['mat']})")

    # the print: dark letters on the china, over the side that faces the camera (the south-west)
    dark = b.js("""(() => { let n = 0; for (let a = -75; a <= 75; a += 3) for (let z = 40; z <= 95; z += 3) {
        const t = (-45 + a) * Math.PI / 180, p = [65.8 * Math.sin(t), -65.8 * Math.cos(t), z], c = BENCH.pixel(...BENCH.project(...p));
        if (c[0] < 110 && c[1] < 100) n++; } return n; })()""")
    check(dark >= 40, f"'Buy me a coffee' is printed in dark letters round the side that faces the camera ({dark} dark samples)")

    # the print reads the right way, left to right and upright, as seen: the left of its picture is left on the screen, its top up
    ori = b.js("""(() => { const g = BENCH.group.getObjectByName('print').geometry, p = g.attributes.position, uv = g.attributes.uv;
        const at = (u, v) => { let best = 0, d = 9; for (let i = 0; i < uv.count; i++) { const e = Math.abs(uv.getX(i) - u) + Math.abs(uv.getY(i) - v); if (e < d) { d = e; best = i; } }
          return BENCH.project(p.getX(best), p.getY(best), p.getZ(best)); };
        const l = at(0.1, 0.5), r = at(0.9, 0.5), t = at(0.5, 0.9), u = at(0.5, 0.1); return { left: l[0], right: r[0], top: t[1], low: u[1] }; })()""")
    check(ori["left"] < ori["right"] - 40 and ori["top"] < ori["low"] - 20, f"the print is not mirrored or upside down on the screen ({ori})")

    # the print lies on the china: from the bottom to the top of it, the gap to the body is under half a px
    gap = b.js("""(() => { const body = BENCH.group.children[0].geometry.attributes.position, pr = BENCH.group.getObjectByName('print').geometry.attributes.position; let worst = 0;
        for (let i = 0; i < pr.count; i += 7) { const x = pr.getX(i), y = pr.getY(i), z = pr.getZ(i), r = Math.hypot(x, y); let best = 99;
          for (let j = 0; j < body.count; j += 3) { const bx = body.getX(j), by = body.getY(j), bz = body.getZ(j); if (Math.abs(bz - z) < 2.5 && Math.hypot(bx, by) > 50) best = Math.min(best, Math.abs(r - Math.hypot(bx, by))); }
          if (best < 99) worst = Math.max(worst, best); } return worst; })()""")
    check(gap < 0.7, f"the print lies on the body at every height ({gap:.2f} px at the worst)")

    # the handle: turned to face the camera it is china, and not the mat or the wall
    b.js("BENCH.turntable.rotation.z = 225 * Math.PI / 180; BENCH.turntable.updateMatrixWorld(true); BENCH.group.updateMatrixWorld(true); window.__d = BENCH.drawn; BENCH.redraw()")
    wait(b, "BENCH.drawn > window.__d", 30)
    time.sleep(0.3)
    h = b.js(f"""(() => {{ const at = {AT}; return [at([95, 0, 100]), at([100, 0, 78]), at([93, 0, 50])]; }})()""")
    check(all(sum(c) > 380 for c in h), f"the handle is there, china, turned to face the camera ({h})")

    # still under reduced motion
    # (let any frame in flight finish: the count must hold still for a second, and then for another)
    last = -1
    for _ in range(40):
        cur = b.js("BENCH.drawn")
        if cur == last:
            break
        last = cur
        time.sleep(1)
    time.sleep(1.5)
    check(b.js("BENCH.drawn") == last, "under reduced motion nothing moves by itself: no frame is drawn while it rests")

    # turning where motion is allowed
    open(b, "?bench=mug", motion="no-preference")
    wait(b, "!!(window.BENCH && BENCH.ready)")
    z0 = b.js("BENCH.turntable.rotation.z")
    time.sleep(1.5)
    check(b.js("BENCH.turntable.rotation.z") != z0, "where motion is allowed the turntable turns")

    # the name is the address's: never read as markup
    open(b, "?bench=%3Cb%20id%3Dpwned%3Ex%3C%2Fb%3E")
    time.sleep(2)
    check(b.js("!document.querySelector('#pwned') && document.body.innerText.includes('<b id=pwned>x</b>')"), "a name with markup in it is shown as text and is not markup")

    # an object that is not there lists what there is
    open(b, "?bench=nothing")
    time.sleep(2)
    check(b.js("!!document.querySelector('nav[aria-label=Workbench] a[href=\"?bench=mug\"]')") and b.js("document.body.innerText.includes('No such object: nothing')")
          and not b.js("!!document.querySelector('canvas.room-gl')"), "an object that is not there is said so, with the list, and no scene")
finally:
    b.close()

sys.exit(1 if failures else 0)
