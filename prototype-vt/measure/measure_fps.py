"""What the room can draw at 60 fps: frame times in a painting window, state by state.
Each run loads measure.html (the mockup with the three.js cat walking), sets up a state,
lets it settle, then records requestAnimationFrame intervals."""
import json
import os
import sys
import time

from cdp import Browser

BASE = "http://127.0.0.1:8126/measure.html"
LEAN = os.environ.get("LEAN", "")  # e.g. "&strip=3&ring=2&shadow=gl"
SETTLE, SAMPLE = 4, 6

REC = "window.__f=[];(function t(n){__f.push(n);requestAnimationFrame(t)})(performance.now())"
STATS = """(() => {
  const f = __f, d = [];
  for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
  d.sort((a, b) => a - b);
  const sum = d.reduce((s, x) => s + x, 0), q = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))];
  return { fps: +(1000 * d.length / sum).toFixed(1), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +d[d.length - 1].toFixed(1),
           over25: +(100 * d.filter((x) => x > 25).length / d.length).toFixed(1), frames: d.length };
})()"""
LIGHTS_OFF = "document.querySelector('.light-switch').click()"
RADIO_ON = "document.querySelector('.radio-face .power').click()"
# a move: frames are kept until the page is left, and read back on the page it opens
KEEP = "addEventListener('pagehide', () => sessionStorage.setItem('__f', JSON.stringify(__f)))"
READ = "(() => { window.__f = JSON.parse(sessionStorage.getItem('__f') || '[]'); sessionStorage.removeItem('__f'); return __f.length })()"

STATES = [
    # name, query, scheme, setup js, cpu throttle
    ("room, no cat drawn", "nocat", "light", None, 1),
    ("cat walking", "", "light", None, 1),
    ("cat walking, no fur", "nofur", "light", None, 1),
    ("cat walking, dark", "", "dark", None, 1),
    ("cat walking, dark, lights off", "", "dark", LIGHTS_OFF, 1),
    ("cat walking, dark, lights off, radio on", "", "dark", LIGHTS_OFF + ";" + RADIO_ON, 1),
    ("cat walking, 4 point lights", "lights=4", "light", None, 1),
    ("cat walking, dark, lights off, 4 point lights", "lights=4", "dark", LIGHTS_OFF, 1),
    ("cat walking, CPU 4x slower", "", "light", None, 4),
    ("cat walking, dark, lights off, CPU 4x slower", "", "dark", LIGHTS_OFF, 4),
]
MOVES = [
    ("move: ledger", ".thing.ledger"),
    ("move: mug", ".thing.mug"),
    ("move: camera", ".thing.camera"),
    ("move: jar", ".thing.jar"),
]


def run(b, w, h):
    out = {}
    b.size(w, h)
    for name, query, scheme, setup, cpu in STATES:
        b.call("Emulation.setCPUThrottlingRate", rate=cpu)
        b.media(prefers_color_scheme=scheme)
        b.nav(BASE + "?nohud" + LEAN + "&" + query, SETTLE)
        if setup:
            b.call("Runtime.evaluate", expression=setup, userGesture=True)
            time.sleep(1.5)
        b.js(REC)
        time.sleep(SAMPLE)
        out[name] = b.js(STATS)
        print(w, name, out[name], flush=True)
    b.call("Emulation.setCPUThrottlingRate", rate=1)
    b.media(prefers_color_scheme="light")
    for name, sel in MOVES:
        b.nav(BASE + "?nohud" + LEAN, SETTLE)
        b.js(REC + ";" + KEEP)
        b.call("Runtime.evaluate", expression=f"document.querySelector('{sel}').click()", userGesture=True)
        time.sleep(6)
        n = b.js(READ)
        out[name] = b.js(STATS) if n > 2 else {"frames": n}
        print(w, name, out[name], flush=True)
    return out


b = Browser(1700, 1100, headless=False)
try:
    b.call("Page.enable")
    b.nav(BASE + "?nohud", SETTLE)
    gpu = b.js("(() => { const g = document.createElement('canvas').getContext('webgl2'); const x = g && g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown' })()")
    dpr = b.js("devicePixelRatio")
    planes = b.js("""(() => { const all = [...document.querySelectorAll('.stage *')];
      return { elements: all.length, preserve3d: all.filter((e) => getComputedStyle(e).transformStyle === 'preserve-3d').length,
               wrapped: document.querySelectorAll('.stage .wrap, .stage [class*=wrap]').length } })()""")
    print("gpu", gpu, "dpr", dpr, "planes", planes, flush=True)
    res = {"gpu": gpu, "dpr": dpr, "planes": planes}
    sizes = [(1440, 900), (1680, 1000)] if len(sys.argv) < 2 else [tuple(map(int, sys.argv[1].split("x")))]
    for w, h in sizes:
        res[f"{w}x{h}"] = run(b, w, h)
    with open("measure_fps" + ("_lean" if LEAN else "") + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(res, f, indent=1)
finally:
    b.close()
