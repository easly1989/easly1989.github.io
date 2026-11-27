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

    # ---- the old computer (ticket 04) ----
    BOUNDS = "(o) => { const B = new BENCH.THREE.Box3().setFromObject(o); return [B.min.x, B.max.x, B.min.y, B.max.y, B.min.z, B.max.z]; }"
    open(b, "?bench=computer")
    check(wait(b, "!!(window.BENCH && BENCH.ready)"), "the old computer starts on the bench")
    time.sleep(0.5)
    bb = b.js(f"({BOUNDS})(BENCH.group)")
    check(366 <= bb[1] - bb[0] <= 385 and 280 <= bb[3] - bb[2] <= 300 and abs(bb[5] - 320) <= 1.5 and bb[4] >= -4,
          f"the case is 368 px wide (the note curls 10 px off its side), 280 deep (the bezel and glass 13 more) and 320 high, on its feet ({[round(v, 1) for v in bb]})")
    px = b.js(f"""(() => {{ const at = {AT}; return {{ glass: at([-36, -146, 204]), note: at([-185, -46, 240]), caseTop: at([0, 0, 316]), drive: at([-64, -146, 56]) }}; }})()""")
    check(sum(px["glass"]) < 200, f"the screen is a dark tube ({px['glass']})")
    check(px["note"][0] > 190 and px["note"][1] > 160 and px["note"][2] < 150, f"the note is yellow ({px['note']})")
    check(sum(px["caseTop"]) > 400, f"the case is beige ({px['caseTop']})")
    ink = b.js("""(() => { let n = 0; for (let v = -110; v <= 60; v += 4) for (let z = 150; z <= 280; z += 4) { const c = BENCH.pixel(...BENCH.project(-185, v, z)); if (c[0] < 120 && c[1] < 110) n++; } return n; })()""")
    check(ink >= 25, f"'Write to me' and its line are written on the note, in dark ink ({ink} dark samples)")

    # the keyboard: 400 by 136, 34 high at the back, sixty-four keys and a spacebar, every key with its legend
    open(b, "?bench=keyboard")
    check(wait(b, "!!(window.BENCH && BENCH.ready)"), "the keyboard starts on the bench")
    time.sleep(0.5)
    kb = b.js(f"({BOUNDS})(BENCH.group)")
    check(abs((kb[1] - kb[0]) - 400) <= 3 and 136 <= kb[3] - kb[2] <= 144 and 38 <= kb[5] <= 45, f"the keyboard is 400 by 136 (tilted, 141 on the desk) and 34 high at the back, 42 with its keys ({[round(v, 1) for v in kb]})")
    check(b.js("(() => { let n = 0; BENCH.group.traverse((o) => { if (o.isInstancedMesh) n = o.count; }); return n; })()") == 64, "it has sixty-four keys and a spacebar of its own")
    leg = b.js("""(() => { const cv = BENCH.group.getObjectByName('legends').material.map.image, d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++; return n; })()""")
    check(leg > 6000, f"the legends are painted ({leg} px of ink)")

    # the mouse: 68 by 88, its nose to the back, and its cord running to the case's east side
    open(b, "?bench=mouse")
    check(wait(b, "!!(window.BENCH && BENCH.ready)"), "the mouse starts on the bench")
    time.sleep(0.5)
    check(b.js("BENCH.camera.position.length() < 2500"), "the camera stands near it, not far off, and it is in view")
    mv = b.js(f"""(() => {{ const at = {AT}; const s = BENCH.project(0, 0, 14); return [s, at([0, 0, 25])]; }})()""")
    check(120 < mv[0][0] < 1320 and 100 < mv[0][1] < 800 and sum(mv[1]) > 380, f"the mouse is in the middle of the window, beige ({mv})")
    mb = b.js(f"({BOUNDS})(BENCH.group.children[0])")
    check(abs((mb[1] - mb[0]) - 68) <= 3 and abs((mb[3] - mb[2]) - 88) <= 2 and mb[4] >= -0.5 and 24 <= mb[5] <= 30, f"the mouse is 68 by 88 and 27 high, standing on z = 0 ({[round(v, 1) for v in mb]})")
    # it is smooth: the surface has the rings of a dome, not the few faces of a model
    check(b.js("BENCH.group.children[0].geometry.attributes.position.count") > 2000, "its surface is smooth: made of more than two thousand points")
    cb = b.js(f"({BOUNDS})(BENCH.group.getObjectByName('cord'))")
    check(cb[3] > 255 and cb[0] < -105 and cb[2] < 50, f"its cord leaves the nose and runs 114 px west and 260 south ({[round(v, 1) for v in cb]})")

    # the three together, as on the desk: the cord meets the case's east side
    open(b, "?bench=pc")
    check(wait(b, "!!(window.BENCH && BENCH.ready)"), "the computer, keyboard and mouse start together on the bench")
    time.sleep(0.5)
    parts = b.js("(() => BENCH.group.children.map((c) => [Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z)]))()")
    check(parts == [[0, 0, -4], [0, -240, 0], [298, -264, 0]], f"the keyboard stands 240 px in front of the case's middle, the mouse 298 to its right and 264 in front ({parts})")
    cord = b.js(f"({BOUNDS})(BENCH.group.getObjectByName('cord'))")
    check(abs(cord[0] - 184) < 5, f"the cord ends at the case's east side, x = 184 ({cord[0]:.0f})")

    # an object that is not there lists what there is
    open(b, "?bench=nothing")
    time.sleep(2)
    check(b.js("!!document.querySelector('nav[aria-label=Workbench] a[href=\"?bench=mug\"]')") and b.js("document.body.innerText.includes('No such object: nothing')")
          and not b.js("!!document.querySelector('canvas.room-gl')"), "an object that is not there is said so, with the list, and no scene")
finally:
    b.close()

sys.exit(1 if failures else 0)
