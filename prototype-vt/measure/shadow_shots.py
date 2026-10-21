"""Willy on the mat with each kind of shadow, cropped round him, light and lights off."""
import base64
import pathlib
import time

from cdp import Browser

BASE = "http://127.0.0.1:8126/measure.html?nohud&shadow="
b = Browser(1460, 1000, headless=False)
try:
    b.size(1440, 900)
    for scheme, off in (("light", False), ("dark", True)):
        b.media(prefers_color_scheme=scheme)
        for mode in ("none", "gl", "map", "css"):
            b.nav(BASE + mode, 5)
            if off:
                b.call("Runtime.evaluate", expression="document.querySelector('.light-switch').click()", userGesture=True)
            b.js("__hold(430, 150, 0, 200, false)")
            time.sleep(1.5)
            r = b.js("(() => { const r = document.querySelector('canvas.cat3d').getClientRects()[0]; return [r.left, r.top, r.width, r.height] })()")
            x, y, w, h = r
            clip = {"x": max(0, x + w * 0.1), "y": max(0, y + h * 0.15), "width": w * 0.8, "height": h * 0.8, "scale": 1}
            data = b.call("Page.captureScreenshot", format="png", clip=clip)["data"]
            pathlib.Path(f"shadow-{scheme}-{mode}.png").write_bytes(base64.b64decode(data))
            print(scheme, mode, [round(v) for v in r], flush=True)
finally:
    b.close()
