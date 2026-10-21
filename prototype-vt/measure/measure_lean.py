"""Leaner round things: wider label strips and rings further apart. Frame rate with Willy
walking, and a crop of the mug and the jar for each, to see what it costs the look."""
import base64
import json
import pathlib
import statistics
import time

from cdp import Browser

BASE = "http://127.0.0.1:8126/measure.html?nohud&shadow=gl"
REC = "window.__f=[];(function t(n){__f.push(n);requestAnimationFrame(t)})(performance.now())"
STATS = "(() => { const f = __f, d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]); const s = d.reduce((a, x) => a + x, 0); return 1000 * d.length / s })()"
COMBOS = [(1, 1), (2, 2), (3, 2), (2, 3), (3, 3)]
b = Browser(1460, 1000, headless=False)
out = {}
try:
    b.size(1440, 900)
    for st, rg in COMBOS:
        q = f"&strip={st}&ring={rg}"
        runs = []
        for _ in range(2):
            b.nav(BASE + q, 4)
            b.js(REC)
            time.sleep(4)
            runs.append(b.js(STATS))
        n = b.js("document.querySelectorAll('.thing.mug *, .thing.jar *').length")
        out[f"strip x{st}, rings x{rg}"] = {"fps": round(statistics.mean(runs), 1), "elements": n}
        print(st, rg, out[f"strip x{st}, rings x{rg}"], flush=True)
        for k in ("mug", "jar"):
            r = b.js(f"(() => {{ const r = document.querySelector('.thing.{k}').getClientRects()[0]; return [r.left, r.top, r.width, r.height] }})()")
            x, y, w, h = r
            clip = {"x": max(0, x - 70), "y": max(0, y - 150), "width": w + 140, "height": h + 200, "scale": 1}
            data = b.call("Page.captureScreenshot", format="png", clip=clip)["data"]
            pathlib.Path(f"lean-{k}-{st}-{rg}.png").write_bytes(base64.b64decode(data))
    json.dump(out, open("measure_lean.json", "w", encoding="utf-8", newline="\n"), indent=1)
finally:
    b.close()
