"""Which parts of the room cost the frame rate, and what each shadow costs: Willy walking,
light scheme, 1440 x 900, each variant three times (the median is kept)."""
import json
import statistics
import time

from cdp import Browser

BASE = "http://127.0.0.1:8126/measure.html?nohud"
REC = "window.__f=[];(function t(n){__f.push(n);requestAnimationFrame(t)})(performance.now())"
STATS = """(() => { const f = __f, d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]); d.sort((a, b) => a - b);
  const s = d.reduce((a, x) => a + x, 0); return [1000 * d.length / s, d[Math.floor(d.length * 0.95)]] })()"""
VARIANTS = [
    ("room only, cat not drawn", "&nocat"),
    ("cat walking", ""),
    ("+ blob shadow in the cat's canvas", "&shadow=gl"),
    ("+ shadow map from one light", "&shadow=map"),
    ("+ blob shadow on the desk (CSS)", "&shadow=css"),
    ("without the chair", "&lite=.room .chair"),
    ("without the project objects", "&lite=.thing"),
    ("without the computer", "&lite=.pc"),
    ("without the photos", "&lite=.snap"),
    ("without the wall prints", "&lite=.on-wall"),
    ("without the toys and loose things", "&lite=.cat-toy,.loose"),
    ("without the desk's legs and the shelf", "&lite=.desk-leg,.perch,.perch-fleece,.plant"),
    ("cat not drawn, without chair, objects, computer", "&nocat&lite=.room .chair,.thing,.pc"),
]
b = Browser(1460, 1000, headless=False)
out = {}
try:
    b.size(1440, 900)
    for name, q in VARIANTS:
        runs = []
        for _ in range(3):
            b.nav(BASE + q, 4)
            b.js(REC)
            time.sleep(5)
            runs.append(b.js(STATS))
        fps = statistics.median(r[0] for r in runs)
        p95 = statistics.median(r[1] for r in runs)
        out[name] = {"fps": round(fps, 1), "p95": round(p95, 1), "runs": [round(r[0], 1) for r in runs]}
        print(name, out[name], flush=True)
    with open("measure_parts.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, indent=1)
finally:
    b.close()
