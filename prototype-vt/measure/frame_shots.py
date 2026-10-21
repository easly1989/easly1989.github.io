"""The room framed four ways at seven window sizes: a screenshot each and what the frame cuts."""
import json
import time

from cdp import Browser

SIZES = [(960, 640), (1280, 720), (1366, 768), (1440, 900), (1680, 1050), (1920, 1080), (2560, 1080)]
MODES = ["today", "fit", "grow", "width"]
b = Browser(1300, 900, headless=True)
res = {}
try:
    b.media(prefers_color_scheme="light", prefers_reduced_motion="reduce")
    for w, h in SIZES:
        b.size(w, h)
        for m in MODES:
            b.nav(f"http://127.0.0.1:8126/index.html?vt=off&frame={m}", 4)
            time.sleep(0.8)
            f = b.js("window.__frame")
            res[f"{w}x{h} {m}"] = f
            b.js("document.querySelectorAll('.vt-bar').forEach((e) => e.remove())")
            b.shot(f"frame-{w}x{h}-{m}.png")
            print(w, h, m, json.dumps(f), flush=True)
    json.dump(res, open("frame_shots.json", "w", encoding="utf-8", newline="\n"), indent=1)
finally:
    b.close()
