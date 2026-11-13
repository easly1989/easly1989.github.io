"""Screenshots of the prototype room. usage: shot.py ROOT OUTDIR spec...
spec = name|url-path|scheme|reduced(0/1)|w|h|js-before(optional)|clip(x,y,w,h optional)|wait"""
import base64
import pathlib
import sys
import time

root = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(root / "checks"))
from cdp import Browser  # noqa: E402
from serve import serve  # noqa: E402

out = pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
base = serve()
b = Browser(1460, 960, headless=False)
try:
    for spec in sys.argv[3:]:
        parts = spec.split("|") + [""] * 10
        name, path, scheme, reduced, w, h, js, clip, wait = parts[:9]
        b.size(int(w), int(h), mobile=int(w) < 600)
        b.media(prefers_color_scheme=scheme, prefers_reduced_motion="reduce" if reduced == "1" else "no-preference")
        b.nav(base + "/" + path, 0.3)
        b.js("sessionStorage.setItem('room-light','on')")
        b.nav(base + "/" + path, float(wait or 3.5))
        b.js("Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>0)}))")
        if js:
            b.js(js)
            time.sleep(0.6)
        params = {"format": "png"}
        if clip == "full":
            hh = b.js("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)")
            params["clip"] = {"x": 0, "y": 0, "width": int(w), "height": hh, "scale": 1}
            params["captureBeyondViewport"] = True
        elif clip:
            x, y, cw, ch = (float(v) for v in clip.split(","))
            params["clip"] = {"x": x, "y": y, "width": cw, "height": ch, "scale": 2}
        else:
            params["captureBeyondViewport"] = False
        data = b.call("Page.captureScreenshot", **params)["data"]
        (out / (name + ".png")).write_bytes(base64.b64decode(data))
        print("shot", name)
finally:
    b.close()
