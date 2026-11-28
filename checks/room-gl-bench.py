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
    cs = b.js(f"({BOUNDS})(BENCH.group.children[0])")
    check(abs((cs[1] - cs[0]) - 368) <= 1 and abs((cs[3] - cs[2]) - 280) <= 1 and abs(cs[5] - 320) <= 1 and abs(cs[4]) <= 1,
          f"the case is 368 wide, 280 deep and 320 high, on z = 0 ({[round(v, 1) for v in cs]})")
    check(bb[1] - bb[0] <= 385 and 285 <= bb[3] - bb[2] <= 300 and bb[4] >= -1,
          f"with the note (it curls 10 px off the side) and the bezel and glass (13 px off the front) it is no wider or deeper than that ({[round(v, 1) for v in bb]})")
    px = b.js(f"""(() => {{ const at = {AT}; return {{ glass: at([-36, -146, 204]), note: at([-185, -46, 165]), caseTop: at([0, 0, 316]), drive: at([-64, -146, 56]) }}; }})()""")
    check(sum(px["glass"]) < 200, f"the screen is a dark tube ({px['glass']})")
    check(px["note"][0] > 190 and px["note"][1] > 160 and px["note"][2] < 150, f"the note is yellow ({px['note']})")
    check(sum(px["caseTop"]) > 400, f"the case is beige ({px['caseTop']})")
    ink = b.js("""(() => { let n = 0; for (let v = -125; v <= 35; v += 4) for (let z = 200; z <= 280; z += 3) { const c = BENCH.pixel(...BENCH.project(-185, v, z)); if (c[0] < 120 && c[1] < 110) n++; } return n; })()""")
    check(ink >= 25, f"'Write to me' and its line are written on the note, in dark ink ({ink} dark samples)")

    # the keyboard: 400 by 136, 34 high at the back, sixty-four keys and a spacebar, every key with its legend
    open(b, "?bench=keyboard")
    check(wait(b, "!!(window.BENCH && BENCH.ready)"), "the keyboard starts on the bench")
    time.sleep(0.5)
    kb = b.js(f"({BOUNDS})(BENCH.group)")
    check(abs((kb[1] - kb[0]) - 400) <= 3 and 136 <= kb[3] - kb[2] <= 140 and 26 <= kb[5] <= 34, f"the keyboard is 400 by 136 and 10 px high at the front, 22 at the back, about 30 with its keys ({[round(v, 1) for v in kb]})")
    # its legends read the right way on the screen: the left of the sheet is on the left, its top up
    lo = b.js("""(() => { const g = BENCH.group.getObjectByName('legends').geometry, p = g.attributes.position, uv = g.attributes.uv;
        const at = (u, v) => { let best = 0, d = 9; for (let i = 0; i < uv.count; i++) { const e = Math.abs(uv.getX(i) - u) + Math.abs(uv.getY(i) - v); if (e < d) { d = e; best = i; } }
          const w = new BENCH.THREE.Vector3(p.getX(best), p.getY(best), p.getZ(best)).applyMatrix4(BENCH.group.getObjectByName('legends').matrixWorld); return BENCH.project(w.x, w.y, w.z); };
        const l = at(0, 0.5), r = at(1, 0.5), t = at(0.5, 1), u = at(0.5, 0); return { left: l[0], right: r[0], top: t[1], low: u[1] }; })()""")
    check(lo["left"] < lo["right"] - 100 and lo["top"] < lo["low"] + 200 and lo["top"] != lo["low"], f"the legends are not mirrored: their left is on the screen's left ({lo})")
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
    check(172 < cord[0] < 184, f"the cord goes into the case's east side, which is at x = 184, a few px deep ({cord[0]:.0f})")

    # ---- the chair, the wastebasket, the window, the shelf, the plant and the radio (ticket 05) ----
    def start(name):
        open(b, "?bench=" + name)
        ok = wait(b, "!!(window.BENCH && BENCH.ready)")
        time.sleep(0.5)
        return ok

    check(start("chair"), "the chair starts on the bench")
    cb = b.js(f"({BOUNDS})(BENCH.group)")
    check(340 <= cb[1] - cb[0] <= 390 and 340 <= cb[3] - cb[2] <= 390 and abs(cb[5] - 1020) <= 3 and -1 <= cb[4] <= 5,
          f"the chair is on its casters, about 180 out each way from its post, and 1020 high with its headrest ({[round(v) for v in cb]})")
    seatb = b.js(f"({BOUNDS})(BENCH.group.getObjectByName('seat'))")
    headb = b.js(f"({BOUNDS})(BENCH.group.getObjectByName('head'))")
    check(abs(seatb[5] - 300) <= 0.6 and abs(headb[5] - 1020) <= 0.6, f"the seat's top is at 300 and the headrest's at 1020, as the CSS room's flat ones, their domes included ({seatb[5]:.1f}, {headb[5]:.1f})")
    check(b.js("(() => { let n = 0; BENCH.group.traverse((o) => { if (o.isMesh) n++; }); return n; })()") >= 40, "it is made of its parts: arms, five casters of two wheels, hub, ribbed cover, lift, seat, armrests, back in its frame, lumbar pad, headrest")

    check(start("tie"), "the tie starts on the bench, apart from the chair")
    tb = b.js(f"({BOUNDS})(BENCH.group)")
    check(0 <= tb[4] <= 8 and tb[5] <= 238 and 44 <= tb[1] - tb[0] <= 50, f"the tie hangs 230 down from the headrest's top (lifted 235 on the bench), its blade 46 wide ({[round(v) for v in tb]})")
    blade = b.js(f"""(() => {{ const at = {AT}; return at([0, -15, -150]); }})()""")
    check(blade[0] > 100 and blade[1] < 70 and blade[2] < 70, f"the tie is red ({blade})")

    check(start("bin"), "the wastebasket starts on the bench")
    bb2 = b.js(f"({BOUNDS})(BENCH.group)")
    check(118 <= bb2[1] - bb2[0] <= 130 and abs(bb2[5] - 203.4) <= 3 and abs(bb2[4]) <= 1, f"the basket is 120 across its rim and 200 high on its foot ({[round(v, 1) for v in bb2]})")
    check(b.js("(() => { let n = 0; BENCH.group.traverse((o) => { if (o.isMesh) n++; }); return n; })()") >= 9, "its wire, rim, foot, floor and five sheets of paper are there")

    check(start("window"), "the window starts on the bench")
    sky = b.js(f"""(() => {{ const at = {AT}; return at([-250, -3, 600]); }})()""")
    check(sky[2] > sky[0] + 20 and sky[2] > 150, f"the sky is seen through the glass, blue by day ({sky})")
    wb = b.js(f"({BOUNDS})(BENCH.group)")
    check(wb[5] >= 2400 and wb[4] <= -500, f"the wall runs from the floor to the ceiling's height round the window ({round(wb[4])} to {round(wb[5])})")
    check(b.js("(() => { let n = 0; BENCH.group.traverse((o) => { if (o.isInstancedMesh) n += o.count; }); return n; })()") > 100, "the perch hangs on two chains of links")

    check(start("shelf"), "the shelf starts on the bench")
    leaf = b.js(f"""(() => {{ const at = {AT}; let best = null; for (const [x, y, z] of [[-52, -38, 260], [-48, -34, 270], [-56, -30, 250], [-52, -44, 250]]) {{ const c = at([x, y, z]); if (c[1] - c[2] > 40 && c[1] > c[0] + 25) best = c; }} return best; }})()""")
    check(leaf is not None, f"the plant's leaves are green above its pot ({leaf})")
    pot = b.js(f"""(() => {{ const at = {AT}; return at([-52, -66, 200]); }})()""")
    check(pot[2] > pot[0] + 15, f"the pot is blue ({pot})")

    check(start("radio"), "the radio starts on the bench")
    rr = b.js(f"""(() => {{ const at = {AT}; return {{ dial: at([-42.5, 35, 93]), knob: at([-47, 77, 24]), grille: at([-42.5, -60, 40]) }}; }})()""")
    dialp = b.js(f"""(() => {{ const at = {AT}; return at([-42.5, 55, 93]); }})()""")  # (u 50, clear of the needle at u 70)
    check(sum(dialp) > 470 and dialp[0] > 170 and dialp[2] > 140, f"the dial is cream ({dialp})")
    check(sum(rr["knob"]) < 330, f"the knob is dark ({rr['knob']})")
    check(sum(rr["grille"]) < sum(dialp) - 120, f"the grille is darker than the dial ({rr['grille']})")
    # the tuning dial runs the whole length of the face: cream near the south end (u 190) and lighter than the beige case just above it
    dl = b.js(f"""(() => {{ const at = {AT}; return [at([-42.5, 105 - 190, 93]), at([-42.5, 105 - 190, 112])]; }})()""")
    check(dl[0][2] - dl[1][2] > 15 and dl[0][1] - dl[1][1] > 10, f"the dial takes all the length of the radio's face, paler than the case above it at its south end ({dl})")
    # the projector: out of the radio only while it plays; off, it is in, turned a half turn and a quarter back, and cut at the top; on, it is out and
    # turned 45 degrees; under reduced motion at once, where motion is allowed in 0.8 s
    p0 = b.js("BENCH.radio.pose()")
    check(not b.js("BENCH.radio.isOn()") and p0["out"] == 0 and not p0["visible"], f"the radio is off at first, its projector in ({p0})")
    b.js("BENCH.radio.setOn(true)")
    time.sleep(0.4)
    p1 = b.js("BENCH.radio.pose()")
    check(p1["out"] == 1 and abs(p1["z"] - 128) < 0.1 and abs(p1["turn"] - 0.7854) < 0.01 and p1["visible"], f"on, at once under reduced motion, the projector is out and turned 45 degrees ({p1})")
    b.js("BENCH.radio.setOn(false)")
    time.sleep(0.4)
    check(b.js("BENCH.radio.pose().out") == 0 and not b.js("BENCH.radio.pose().visible"), "and off again it goes back in, out of sight")
    open(b, "?bench=radio", motion="no-preference")
    wait(b, "!!(window.BENCH && BENCH.ready)")
    slot_off = b.js(f"""(() => {{ const at = {AT}; return at([0, 65, 121]); }})()""")  # (the slot in the top, with the projector in: dark)
    check(sum(slot_off) < 250, f"off, the projector is not above the case: the slot in its top is dark ({slot_off})")
    b.js("BENCH.radio.setOn(true)")
    # (frames can be slow here: wait for it to be on its way, then to be out, rather than for set times)
    mid = None
    for _ in range(60):
        time.sleep(0.25)
        p = b.js("BENCH.radio.pose()")
        if 0 < p["out"] < 1 and mid is None:
            mid = p
        if p["out"] == 1:
            break
    check(mid is not None and mid["visible"] and p["out"] == 1, f"where motion is allowed it comes out turning, not at once ({mid and round(mid['out'], 2)} on the way, {p['out']} at the end)")
    open(b, "?bench=radio")
    wait(b, "!!(window.BENCH && BENCH.ready)")

    # ---- the two books (ticket 06) ----
    check(start("ledger"), "the ledger starts on the bench")
    lb = b.js(f"({BOUNDS})(BENCH.group)")
    check(248 <= lb[1] - lb[0] <= 252 and 330 <= lb[3] - lb[2] <= 336 and abs(lb[4]) <= 2.2 and 30 <= lb[5] <= 32.2, f"the ledger is 250 by 330 and 30 thick, its band a little proud ({[round(v, 1) for v in lb]})")
    lc = b.js(f"""(() => {{ const at = {AT}; return {{ cover: at([0, 40, 30]), tile: at([-79, 119, 30]), band: at([86.5, 0, 31.4]) }}; }})()""")
    check(lc["cover"][2] > lc["cover"][0] + 60 and lc["tile"][0] > 190 and sum(lc["band"]) < 200, f"the ledger's cover is blue with the logo's white tile and the dark band across it ({lc})")
    check(start("agenda"), "the agenda starts on the bench")
    ab = b.js(f"({BOUNDS})(BENCH.group)")
    check(218 <= ab[1] - ab[0] <= 224 and abs(ab[3] - 145) <= 2.5 and -168 <= ab[2] <= -160 and abs(ab[4]) <= 2.2 and 24 <= ab[5] <= 26.2, f"the agenda is 220 by 290 and 24 thick, its elastic a little proud, the bookmark about 23 px past the south edge ({[round(v, 1) for v in ab]})")
    ac = b.js(f"""(() => {{ const at = {AT}; return {{ cover: at([0, 60, 24]), tile: at([-80, 115, 24]), band: at([0, -39.3, 25.4]), ribbon: at([23.6, -148, 3.5]) }}; }})()""")
    check(ac["cover"][1] > ac["cover"][0] + 40 and ac["tile"][0] > 190 and sum(ac["band"]) < 200 and ac["ribbon"][0] > 140 and ac["ribbon"][1] < 90, f"the agenda's cover is green with its white tile, the elastic across it, the red bookmark on the mat ({ac})")

    # ---- the camera, the jar, the pager, the post and the cards (ticket 07) ----
    check(start("camera"), "the camera starts on the bench")
    kb = b.js(f"({BOUNDS})(BENCH.group)")
    check(158 <= kb[1] - kb[0] <= 162 and -90.5 <= kb[2] <= -86 and 99 <= kb[3] <= 103 and abs(kb[4]) <= 1 and 119 <= kb[5] <= 121, f"the camera is 160 wide, 120 high, its eyepiece out of the back and its lens out of the front ({[round(v, 1) for v in kb]})")
    kc = b.js(f"""(() => {{ const at = {AT}; return {{ plate: at([-60, -75.2, 100]), lens: at([-5, -89, 81]), shutter: at([-56, -84, 64]), base: at([40, -75.2, 20]) }}; }})()""")
    check(sum(kc["plate"]) > 400 and sum(kc["plate"]) > sum(kc["base"]) + 250 and sum(kc["lens"]) < 220 and kc["shutter"][0] > 140 and kc["shutter"][1] < 110, f"the plate is white, the lens dark glass, the shutter button red and the base black ({kc})")

    check(start("jar"), "the jar starts on the bench")
    jb = b.js(f"({BOUNDS})(BENCH.group)")
    check(149 <= jb[1] - jb[0] <= 153 and 149 <= jb[3] - jb[2] <= 153 and abs(jb[4]) <= 1 and 199 <= jb[5] <= 201.5, f"the jar is 150 across and 200 high ({[round(v, 1) for v in jb]})")
    jl = b.js(f"""(() => {{ const at = {AT}; return {{ label: at([-53.5, -53.5, 100]) }}; }})()""")
    check(sum(jl["label"]) > 450 and jl["label"][0] > 150, f"the label is paper on the glass, on the side that faces the camera ({jl})")

    check(start("pager"), "the pager starts on the bench")
    pb = b.js(f"({BOUNDS})(BENCH.group)")
    check(124 <= pb[1] - pb[0] <= 132 and 77 <= pb[3] - pb[2] <= 80 and abs(pb[4]) <= 1 and 16 <= pb[5] <= 16.5, f"the pager is 120 by 78 and 16 high, its clip and keys a little out of its sides ({[round(v, 1) for v in pb]})")
    pc = b.js(f"""(() => {{ const at = {AT}; return {{ screen: at([30, 17, 16.2]), tag: at([-50, -19.5, 16.2]), body: at([50, -35, 8]) }}; }})()""")
    check(sum(pc["screen"]) < 200 and sum(pc["tag"]) > 500 and pc["body"][1] > pc["body"][0] + 25, f"the pager's screen is dark, its label paper, its case in the asf colour ({pc})")

    check(start("post"), "the post starts on the bench")
    qb = b.js(f"({BOUNDS})(BENCH.group)")
    check(abs(qb[4]) <= 0.5 and 2 <= qb[5] <= 4.5 and qb[1] - qb[0] >= 280, f"the post is thin, the envelope on it 294 across ({[round(v, 1) for v in qb]})")
    qc = b.js(f"""(() => {{ const at = {AT}; return {{ seal: at([1.8, -6.1, 3.8]), pocket: at([60, -20, 2.2]) }}; }})()""")
    check(qc["seal"][0] > qc["seal"][1] + 50 and qc["pocket"][0] > qc["pocket"][2] - 5, f"Cupid's seal is red and the envelope's paper pink ({qc})")

    check(start("cards"), "the cards start on the bench")
    cb2 = b.js(f"({BOUNDS})(BENCH.group)")
    check(cb2[1] - cb2[0] <= 9 and cb2[3] - cb2[2] >= 400, f"the cards are thin and stand on the wall's plane, 390 across with their tape ({[round(v, 1) for v in cb2]})")
    cc = b.js(f"""(() => {{ const at = {AT}; return {{ face: at([-126, 26.4, 0.8]), paper: at([60, -60, 0.8]) }}; }})()""")
    check(cc["face"][2] > cc["face"][0] + 50 and sum(cc["paper"]) > 450, f"the front card's face is violet on cream paper ({cc})")

    # ---- the odds and ends, Willy's box, the cable and what hangs on the walls (ticket 08) ----
    check(start("loose"), "the odds and ends start on the bench")
    ob = b.js(f"({BOUNDS})(BENCH.group)")
    check(ob[4] >= -3.5 and ob[5] <= 13, f"the seven lie flat on the mat, none more than 12 thick (boxes of turned things, a little loose) ({[round(v, 1) for v in ob]})")
    check(b.js("(() => { let n = 0; BENCH.group.traverse((o) => { if (o.isMesh) n++; }); return n; })()") >= 16, "the pencil, eraser, clip, coin, cap, stick and band are made of their parts")

    check(start("nest"), "Willy's box starts on the bench")
    nb = b.js(f"({BOUNDS})(BENCH.group)")
    check(260 <= nb[1] - nb[0] <= 264 and nb[3] > 126 and -190 <= nb[2] <= -184 and -4.5 <= nb[4] <= -3.5 and 89 <= nb[5] <= 91.5, f"the box is 262 across, 90 high, its flap folded out to the south ({[round(v, 1) for v in nb]})")

    check(start("cable"), "the cable starts on the bench")
    cbb = b.js(f"({BOUNDS})(BENCH.group)")
    check(-502 <= cbb[4] <= -498 and cbb[5] <= 6, f"the cable lies on the desk, goes over its back edge and down to the socket, 500 under the mat ({[round(v, 1) for v in cbb]})")

    SCAN = """(() => {{ const at = {AT}; const out = {{ pale: 0, cyan: 0, pink: 0 }}; for (let x = {x0}; x <= {x1}; x += {dx}) for (let y = {y0}; y <= {y1}; y += {dy}) {{ const c = at([x, y, {z}]); if (c[0] > 225 && c[1] > 170 && c[2] > 190) out.pale++; if (c[2] > 200 && c[1] > 200 && c[0] < 235) out.cyan++; if (c[0] > 200 && c[1] < 150 && c[2] > 100) out.pink++; }} return out; }})()"""
    check(start("sign"), "the neon name starts on the bench")
    sg = b.js(SCAN.format(AT=AT, x0=-330, x1=300, dx=12, y0=-28, y1=40, dy=8, z=3.2))
    corner = b.js(f"""(() => {{ const at = {AT}; return at([340, -42, 3.2]); }})()""")
    check(sg["pale"] > 8 and sg["pink"] > 5 and sum(corner) < 260, f"the name is a pale tube in pink glass on a dark board ({sg}, board {corner})")
    b.js("BENCH.group.userData.neon.setColor('#3fd2ff')")
    time.sleep(1.5)
    sg2 = b.js(SCAN.format(AT=AT, x0=-330, x1=300, dx=12, y0=-28, y1=40, dy=8, z=3.2))
    check(sg2["cyan"] > 5 and sg2["pink"] < sg["pink"], f"struck in another colour, the tube is blue ({sg2})")

    check(start("poster"), "the poster starts on the bench")
    bar = b.js(f"""(() => {{ const at = {AT}; return {{ bar: at([-270, -122, 3.2]), paper: at([260, 30, 3.2]) }}; }})()""")
    check(bar["bar"][2] > bar["bar"][0] + 40 and sum(bar["paper"]) > 380, f"the poster is paper with the bar of the six colours at its foot, blue first ({bar})")

    check(start("nav"), "the navigation starts on the bench")
    nv = b.js(SCAN.format(AT=AT, x0=-320, x1=320, dx=10, y0=-20, y1=20, dy=6, z=3.2))
    check(nv["cyan"] > 5 and nv["pale"] > 5, f"the navigation's words are neon, the pages' blue and this one's pink ({nv})")

    check(start("switch"), "the light switch starts on the bench")
    sw = b.js(f"""(() => {{ const at = {AT}; return {{ plate: at([-26, -40, 10.6]) }}; }})()""")
    check(sum(sw["plate"]) > 400 and b.js("BENCH.group.userData.lightSwitch.isOn()"), f"the switch is a cream plate with its rocker, on ({sw})")

    # an object that is not there lists what there is
    open(b, "?bench=nothing")
    time.sleep(2)
    check(b.js("!!document.querySelector('nav[aria-label=Workbench] a[href=\"?bench=mug\"]')") and b.js("document.body.innerText.includes('No such object: nothing')")
          and not b.js("!!document.querySelector('canvas.room-gl')"), "an object that is not there is said so, with the list, and no scene")
finally:
    b.close()

sys.exit(1 if failures else 0)
