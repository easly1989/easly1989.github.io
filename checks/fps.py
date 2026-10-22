"""The room's frame rate: the still room, with one thing moving across it so that every frame is
drawn again, keeps pace with a 60 Hz display, in both schemes, with the room's light on and
off, and with the radio playing, its projector throwing a wave that moves on every frame. Needs a
window that is actually
painting, so it opens one: a headless or hidden Chrome throttles its frames and measures
nothing."""
import sys
import time

from cdp import Browser
from serve import serve

SIZES = [(1440, 900), (1920, 1080)]
SETTLE, SAMPLE = 3, 5
# a frame at 60 Hz, plus a millisecond of the timer's own jitter
FRAME_MS = 1000 / 60 + 1

# something moving over the room, where Willy will walk, so the room is composited every frame
MOVER = """(() => {
  const m = document.createElement('span');
  m.style.cssText = 'position:absolute;left:0;top:0;width:40px;height:40px;background:#fff;z-index:9';
  document.querySelector('.stage').append(m);
  (function go(t) { m.style.transform = 'translate(' + (t / 4 % 900) + 'px, 300px)'; requestAnimationFrame(go); })(0);
})()"""
REC = "window.__f=[];(function t(n){__f.push(n);requestAnimationFrame(t)})(performance.now())"
STATS = """(() => {
  const f = __f, d = [];
  for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
  d.sort((a, b) => a - b);
  if (!d.length) return { p50: 1e9, slow: 100, frames: 0 }; // JSON has no Infinity
  return { p50: +d[Math.floor(d.length / 2)].toFixed(2), slow: +(100 * d.filter((x) => x > 25).length / d.length).toFixed(1), frames: d.length };
})()"""

failures = []
base = serve()
# Frames are drawn as fast as they can be, not to the display's beat, so a frame's interval
# is what it costs: on a 90 Hz display a 12 ms frame misses a beat and reads as 45 fps
b = Browser(1940, 1100, headless=False, flags=["--disable-gpu-vsync", "--disable-frame-rate-limit", "--autoplay-policy=no-user-gesture-required"])
try:
    for w, h in SIZES:
        for scheme, light, radio in (("light", "on", False), ("dark", "on", False), ("dark", "off", False), ("light", "on", True), ("dark", "off", True)):
            b.size(w, h)
            b.media(prefers_color_scheme=scheme)
            b.nav(base + "/index.html?room", 1)
            b.js(f"sessionStorage.setItem('room-light', '{light}'); sessionStorage.removeItem('radio'); sessionStorage.removeItem('radio-projector')")
            b.nav(base + "/index.html", SETTLE)
            if not b.js("document.documentElement.classList.contains('iso')"):
                failures.append(f"{w} x {h} {scheme}, light {light}: the room shows")
                print("FAIL  " + failures[-1])
                continue
            if radio:
                b.js("document.querySelector('.radio-face .power').click()")
            b.js(MOVER)
            time.sleep(1)
            b.js(REC)
            time.sleep(SAMPLE)
            s = b.js(STATS)
            ok = s["p50"] <= FRAME_MS and s["slow"] < 5
            what = f"{w} x {h} {scheme}, light {light}{', radio on' if radio else ''}: {1000 / s['p50']:.0f} fps, {s['slow']}% of {s['frames']} frames over 25 ms"
            print(("ok    " if ok else "FAIL  ") + what)
            if not ok:
                failures.append(what)
finally:
    b.close()
sys.exit(1 if failures else 0)
