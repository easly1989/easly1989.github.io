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
    check(wait(b, "!!(window.BENCH && BENCH.ready)"), "the workbench starts with the mug, and draws")
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

    # the handle: turned to face the camera it is china, and not the mat or the wall
    b.js("BENCH.turntable.rotation.z = 225 * Math.PI / 180; BENCH.group.updateMatrixWorld(true); BENCH.redraw()")
    time.sleep(1.5)
    h = b.js(f"""(() => {{ const at = {AT}; return [at([95, 0, 100]), at([100, 0, 78]), at([93, 0, 50])]; }})()""")
    check(all(sum(c) > 380 for c in h), f"the handle is there, china, turned to face the camera ({h})")

    # still under reduced motion
    d0 = b.js("BENCH.drawn")
    time.sleep(1.5)
    check(b.js("BENCH.drawn") == d0, "under reduced motion nothing moves by itself: no frame is drawn while it rests")

    # turning where motion is allowed
    open(b, "?bench=mug", motion="no-preference")
    wait(b, "!!(window.BENCH && BENCH.ready)")
    z0 = b.js("BENCH.turntable.rotation.z")
    time.sleep(1.5)
    check(b.js("BENCH.turntable.rotation.z") != z0, "where motion is allowed the turntable turns")

    # an object that is not there lists what there is
    open(b, "?bench=nothing")
    time.sleep(2)
    check(b.js("!!document.querySelector('nav[aria-label=Workbench] a[href=\"?bench=mug\"]')") and b.js("document.body.innerText.includes('No such object: nothing')")
          and not b.js("!!document.querySelector('canvas.room-gl')"), "an object that is not there is said so, with the list, and no scene")
finally:
    b.close()

sys.exit(1 if failures else 0)
