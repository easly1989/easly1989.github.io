"""Willy in the scene (#160, ticket 09): the cat is drawn into the same three.js scene as the room (`?roomgl&willy`; the CSS room's own Willy, with the
canvases over it, is what `willy-*.py` check until the scene replaces it): no canvas of his own; he is hidden by what stands in front of him (the
computer) and hides what is behind him, judged by the scene's depth and not by outlines; his shadow is the scene's light's (castShadow); he walks the
scene's surfaces (the desk, the cushion, the shelf, the computer's top) and keeps out of its solids (`ROOM`, made from the scene: gl/room-api.js); his
button is the room's last Tab stop and answers Enter; under reduced motion he sleeps on the cushion. Headless Chrome, software drawing, a minute or two.

What of his world is not in the scene yet is not checked here: the toys, what he knocks off the desk and the plant (willy-toys.py, willy-fall.py,
willy-push.py, willy-plant.py, willy-prop-actions.py, willy-fly.py: ticket 13); that he keeps out of the way of the objects that are links (willy-way.py:
ticket 11); the old computer's keyboard and sounds (willy-props.py, willy-sound.py: ticket 14); his box (willy-box.py), that he never flips
(willy-flips.py: a clock that moves 1/60 s a frame, for the scene) and that he can be petted by the pointer (willy-pet.py) until the scene is the room: all
of those stay as they are and keep passing on the CSS room."""
import json
import sys
import time

from cdp import Browser
from serve import serve

failures = []
ENTER = chr(13)
LABEL = "Willy. You can pet him!"
KEYS = "localStorage.setItem('site:room','1');localStorage.setItem('room-gl','1')"


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def key(b, name, code, vk, text=None):
    extra = {"text": text} if text else {}
    b.call("Input.dispatchKeyEvent", type="keyDown", key=name, code=code, windowsVirtualKeyCode=vk, **extra)
    b.call("Input.dispatchKeyEvent", type="keyUp", key=name, code=code, windowsVirtualKeyCode=vk)


def until(b, expr, s, step=0.25):
    end = time.time() + s
    while time.time() < end:
        v = b.js(expr)
        if v:
            return v
        time.sleep(step)
    return None


def load(b, reduce, query="?room&willy"):
    b.media(prefers_reduced_motion="reduce" if reduce else "no-preference", prefers_color_scheme="light")
    b.size(1440, 900)
    b.nav(base + "/index.html", 0.5)
    b.js("sessionStorage.removeItem('room-gl-failed');" + KEYS)
    b.nav(base + "/index.html" + query, 1)
    until(b, "!!(window.ROOMGL && window.ROOMGL.ready)", 40)
    return until(b, "!!(window.ROOMGL && window.ROOMGL.willy)", 90)


# page helpers: a frame drawn, the pixel of the window, the computer's outline on the screen, what differs with and without him
HELPERS = r"""
window.__h = {
  frames: async (n = 2) => { for (let i = 0; i < n; i++) { const d = ROOMGL.drawn; ROOMGL.redraw(); let k = 0; while (ROOMGL.drawn <= d && k++ < 400) await new Promise((r) => setTimeout(r, 16)); } },
  hull: (pts) => { pts = pts.map((p) => p.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); },
  inside: (h, x, y) => { let s = 0; for (let i = 0; i < h.length; i++) { const [ax, ay] = h[i], [bx, by] = h[(i + 1) % h.length], c = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (!c) continue; if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } return h.length > 2; },
  // the computer's case on the screen: the hull of where its own vertices are drawn (not of its box, which a turned thing's is bigger than)
  pc: () => { const T = ROOMGL.THREE, c = ROOMGL.camera, case_ = ROOMGL.objects.pc.children[0], v = new T.Vector3(), pts = []; case_.updateMatrixWorld(true);
    case_.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position, step = Math.max(1, Math.floor(p.count / 800)); for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).project(c); pts.push([((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]); } });
    return window.__h.hull(pts); },
  read: (pts) => pts.map(([x, y]) => ROOMGL.pixel(x, y)),
};
"""

# him held at x, y on the desk facing heading, drawn with and without him (or without his shadow): the pixels of a grid over the box round him
COMPARE = """(async (x, y, heading, what) => {
  const h = window.__h, W = ROOMGL.willy;
  W.hold(x, y, 'desk', heading, 'idle');
  await h.frames(3);
  const a = W.w.area(), pad = what === 'shadow' ? 90 : 0;
  const pts = [];
  for (let px = Math.floor(a.left - pad); px < a.right + pad; px += 5) for (let py = Math.floor(a.top - pad); py < a.bottom + pad; py += 5) if (px > 0 && py > 0 && px < innerWidth && py < innerHeight) pts.push([px, py]);
  const skins = [];
  ROOMGL.scene.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); });
  const set = (v) => { if (what === 'shadow') for (const o of skins) o.castShadow = v; else W.w.visible = v; };
  const withHim = h.read(pts);
  set(false);
  await h.frames(3);
  const without = h.read(pts);
  set(true);
  await h.frames(2);
  const pc = h.pc();
  // (a point well inside the case's outline: a few px from its edge on every side)
  const deep = ([px, py]) => [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]].every(([dx, dy]) => h.inside(pc, px + dx, py + dy));
  const out = { n: pts.length, inPc: 0, inPcDiff: 0, diff: 0, darker: 0, lighter: 0 };
  pts.forEach((p, i) => {
    const d = Math.max(...[0, 1, 2].map((k) => Math.abs(withHim[i][k] - without[i][k])));
    const dl = withHim[i][0] + withHim[i][1] + withHim[i][2] - (without[i][0] + without[i][1] + without[i][2]);
    if (d > 6) { out.diff++; if (dl < 0) out.darker++; else out.lighter++; }
    if (deep(p)) { out.inPc++; if (d > 6) out.inPcDiff++; }
  });
  return out;
})"""

base = serve()
b = Browser(1460, 1000, headless=True)
try:
    # (what the page says of itself, to see that nothing went wrong)
    b.call("Page.addScriptToEvaluateOnNewDocument", source="window.__log=[];['warn','error'].forEach(k=>{const o=console[k];console[k]=(...a)=>{window.__log.push(k+': '+a.map(x=>String(x&&x.stack||x)).join(' ').slice(0,300));o.apply(console,a)}});addEventListener('error',e=>window.__log.push('error: '+e.message));addEventListener('unhandledrejection',e=>window.__log.push('error: '+String(e.reason&&e.reason.stack||e.reason).slice(0,300)));")
    # without ?willy there is no Willy: the room is as it was
    ok = load(b, True, "?room") is None
    time.sleep(1)
    check(ok and not b.js("!!document.querySelector('.willy-pet')"), "without ?willy there is no Willy and no button for him")

    # ---- under reduced motion: asleep on the cushion, in the scene, with no canvas of his own ----
    check(load(b, True), "Willy is there under reduced motion")
    skins = b.js("(() => { let n = 0; ROOMGL.scene.traverse((o) => { if (o.isSkinnedMesh) n++; }); return n; })()")
    check(skins >= 1, f"his body is in the scene ({skins} skinned meshes)")
    check(b.js("document.querySelectorAll('canvas.willy, canvas.willy-low, canvas.willy-shadow').length") == 0, "he has no canvas of his own, no flat copy and no shadow canvas")
    check(b.js("document.querySelectorAll('canvas').length") == 1, "the page has the scene's one canvas")
    names = b.js("ROOM.surfaces.map((s) => s.name).join(',')")
    check(names == "desk,perch,shelf,top", f"his surfaces come from the scene: the desk, the cushion, the shelf and the computer's top ({names})")
    now = b.js("(() => { const n = ROOMGL.willy.now(); return { clip: n.clip, z: n.z, perch: ROOMGL.willy.SURF.perch.z }; })()")
    check(now["clip"].startswith("sleep") and now["z"] == now["perch"], f"he sleeps on the cushion ({now})")
    # his button: the last Tab stop, labelled; Enter is answered, and the live line says what he did
    box = b.js("(() => { const t = document.querySelector('.willy-pet'); if (!t || t.hidden) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: t.getAttribute('aria-label'), l: r.left, t: r.top, r: r.right, b: r.bottom }; })()")
    check(box is not None and box["label"] == LABEL, f"his button is there, on him ({box})")
    where = b.js("(() => { const n = ROOMGL.willy.now(); return ROOMGL.project(n.x, n.y, n.z); })()")
    check(box is not None and box["l"] <= where[0] <= box["r"] and box["t"] <= where[1] <= box["b"], f"it is round where he lies on the screen ({where})")
    b.js("document.activeElement.blur(); document.querySelector('.willy-pet').focus()")
    key(b, "Enter", "Enter", 13, ENTER)
    live = until(b, "(document.querySelector('.willy-live') || {}).textContent", 5)
    check(bool(live), f"Enter on him is answered, and the live line says so ({live!r})")

    # ---- with motion: held behind the computer he is hidden by it, in front of it he hides it ----
    check(load(b, False), "Willy is there where motion is allowed")
    b.js(HELPERS)
    # places on the desk where he fits, and the computer's outline overlaps the box round him: behind it (further from the reader) and in front of it
    spots = b.js("""(() => { const h = window.__h, W = ROOMGL.willy, pc = ROOM.boxes().find((o) => o.name === 'the computer'), hull = h.pc(), out = { behind: [], front: [] };
      const depth = (x, y, z) => -x + y + z, mid = depth((pc.x0 + pc.x1) / 2, (pc.y0 + pc.y1) / 2, pc.z1 / 2);
      for (let x = pc.x0 - 260; x <= pc.x1 + 260; x += 40) for (let y = pc.y0 - 330; y <= pc.y1 + 330; y += 40) {
        const [sx, sy] = ROOM.toScreen(x, y, 60);
        const d = depth(x, y, 60) > mid ? 'front' : 'behind';
        // (his middle over the computer's outline, or within a hand of it for the one in front, which is only a part of him over it)
        const near = d === 'front' ? [[0, 0], [60, 0], [-60, 0], [0, 60], [0, -60], [40, 40], [-40, -40]].some(([dx, dy]) => h.inside(hull, sx + dx, sy + dy)) : h.inside(hull, sx, sy);
        if (!near) continue;
        const heading = d === 'front' ? 90 : 270;
        if (W.w.fits(x, y, 0, heading, 'idle', { on: W.SURF.desk })) out[d].push([x, y, heading]);
      }
      return out; })()""")
    for k in spots:
        spots[k] = spots[k][:: max(1, len(spots[k]) // 10)][:10]
    check(len(spots["behind"]) and len(spots["front"]), f"there are places behind and in front of the computer where he fits and the computer is in front of or behind part of him ({spots})")
    # (one of them leaves part of him over the computer's outline, hidden, and part of him beside it, drawn)
    tried = []
    for x, y, hd in spots["behind"]:
        r = b.js(f"{COMPARE}({x}, {y}, {hd}, 'hidden')")
        tried.append((round(x), round(y), r["inPc"], r["inPcDiff"], r["diff"]))
    # the one that leaves the most of him hidden by the computer's outline while some of him shows
    ok_ = [t for t in tried if t[2] >= 40 and t[4] >= 40]
    best = min(ok_, key=lambda t: t[3] / t[2]) if ok_ else None
    check(best is not None, f"he can be held where the computer is in front of part of him and part of him shows ({tried})")
    if best:
        check(best[3] <= max(6, best[2] * 0.01), f"behind the computer, what of him is over it is hidden by it: {best[2]} px in its outline, {best[3]} of them changed by him (x, y, in outline, changed in it, changed in all: {best})")
    front = None
    for x, y, hd in spots["front"]:
        r = b.js(f"{COMPARE}({x}, {y}, {hd}, 'hides')")
        if r["inPc"] >= 40 and (front is None or r["inPc"] > front[1]["inPc"]):
            front = ((x, y), r)
    check(front is not None, "he can be held where he is in front of the computer")
    if front:
        r = front[1]
        check(r["inPcDiff"] >= 30, f"in front of the computer he covers it: {r['inPcDiff']} of {r['inPc']} px of its outline under him changed")

    # ---- his shadow is the scene's light's ----
    shadow = None
    for x, y in [(900, 600), (1000, 470), (330, 330), (800, 880)]:
        ok = b.js(f"(() => {{ const W = ROOMGL.willy; return W.w.fits({x}, {y}, 0, 90, 'idle', {{ on: W.SURF.desk }}); }})()")
        if ok:
            shadow = b.js(f"{COMPARE}({x}, {y}, 90, 'shadow')")
            break
    check(shadow is not None and shadow["darker"] >= 30 and shadow["lighter"] <= shadow["darker"] * 0.05, f"he casts a shadow on the desk: pixels darker with it, none lighter ({shadow})")
    b.js("ROOMGL.willy.release()")

    # ---- he walks: moves about the scene's surfaces, and is always on one of them ----
    seen = []
    for _ in range(24):
        time.sleep(1.2)
        seen.append(b.js("(() => { const W = ROOMGL.willy, n = W.now(); return [n.x, n.y, n.z, n.clip, W.w.into(n.x, n.y, n.z, n.h, n.clip.replace(/-(air|from|to)$/, ''))]; })()"))
    zs = b.js("[...new Set(ROOM.surfaces.map((s) => s.z).concat(ROOM.lows().map((l) => l.z)))]")
    moved = max(((a[0] - c[0]) ** 2 + (a[1] - c[1]) ** 2) ** 0.5 for a in seen for c in seen)
    check(moved > 80, f"he moves about, {moved:.0f} px between where he was at most")
    off = [s for s in seen if min(abs(s[2] - z) for z in zs) > 25 and not s[3].startswith("jump")]
    check(not off, f"and he is always on a surface or over a low thing, or in a jump ({off[:2]})")
    inside = [(round(s_[0]), round(s_[1]), s_[3], s_[4]) for s_ in seen if s_[4] and not s_[3].startswith("jump")]
    check(not inside, f"he never goes into anything solid: the outlines of the scene's things are the boundaries he keeps out of ({len(seen)} samples; into: {inside[:3]})")
    errors = [m for m in b.js("(window.__log || [])") or [] if not m.startswith("warn")]
    check(not errors, f"nothing went wrong ({errors[:2]})")
finally:
    b.close()

sys.exit(1 if failures else 0)
