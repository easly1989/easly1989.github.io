"""Draws the plush's pictures from plush.js in a real Chrome (render.html) and saves them here:
plush-bench.png (the bench) and plush-wall.png (the room without WebGL). Prints each one's size,
for its width and height in index.html. python assets/plush/render.py [look.png], the last also
saving the view it was approved in."""
import base64
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "checks"))
from cdp import Browser  # noqa: E402
from serve import serve  # noqa: E402

base = serve()
b = Browser(900, 1100, headless=False)
try:
    views = [("bench", HERE / "plush-bench.png"), ("wall", HERE / "plush-wall.png")]
    if len(sys.argv) > 1:
        views.append(("look", pathlib.Path(sys.argv[1])))
    for view, out in views:
        b.nav(f"{base}/assets/plush/render.html?view={view}", 1)
        for _ in range(40):
            if b.js("!!window.done || !!window.failed"):
                break
            time.sleep(0.25)
        failed = b.js("window.failed || null")
        if failed:
            raise SystemExit(f"{view}: {failed}")
        data = b.js("document.getElementById('out').toDataURL('image/png')")
        out.write_bytes(base64.b64decode(data.split(",", 1)[1]))
        print(view, out.name, "size", b.js("window.size"))
finally:
    b.close()
