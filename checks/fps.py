"""The room's frame rate: the room, with one thing moving across it so that every frame is drawn
again, and Willy walking, keeps pace with a 60 Hz display, in both schemes, with the room's light
on and off, and with the radio playing, its projector throwing a wave that moves on every frame.
A sample counts only once he has walked through enough of it; he rests between his walks, so it
is taken again until he has. Needs a window that is actually painting, so it opens one: a
headless or hidden Chrome throttles its frames and measures nothing."""
import sys
import time

from cdp import Browser
from serve import serve

SIZES = [(1440, 900), (1920, 1080)]
SETTLE, SAMPLE = 3, 5
WALKED = 30  # % of a sample's frames he must have walked in
TRIES = 12  # he may be asleep for up to 40 s
# a frame at 60 Hz, plus a millisecond of the timer's own jitter
FRAME_MS = 1000 / 60 + 1

# something moving over the room, so the room is composited every frame, whatever Willy does
MOVER = """(() => {
  const m = document.createElement('span');
  m.style.cssText = 'position:absolute;left:0;top:0;width:40px;height:40px;background:#fff;z-index:9';
  document.querySelector('.stage').append(m);
  (function go(t) { m.style.transform = 'translate(' + (t / 4 % 900) + 'px, 300px)'; requestAnimationFrame(go); })(0);
})()"""
# every frame's time, and how many of them Willy moved in
REC = """(() => {
  const f = (window.__f = []), run = (window.__run = {});
  let was = null;
  window.__w = 0;
  (function t(n) {
    if (window.__run !== run) return; // a later sample's loop takes over
    f.push(n);
    const c = document.querySelector('canvas.willy'), at = c && c.style.transform;
    if (at && was && at !== was) __w++;
    was = at;
    requestAnimationFrame(t);
  })(performance.now());
})()"""
STATS = """(() => {
  const f = __f, d = [];
  for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
  d.sort((a, b) => a - b);
  if (!d.length) return { p50: 1e9, slow: 100, frames: 0 }; // JSON has no Infinity
  return { p50: +d[Math.floor(d.length / 2)].toFixed(2), slow: +(100 * d.filter((x) => x > 25).length / d.length).toFixed(1), frames: d.length, walked: +(100 * __w / d.length).toFixed(0) };
})()"""

failures = []
base = serve()
# Frames are drawn as fast as they can be, not to the display's beat, so a frame's interval
# is what it costs: on a 90 Hz display a 12 ms frame misses a beat and reads as 45 fps
b = Browser(1940, 1100, headless=False, flags=["--disable-gpu-vsync", "--disable-frame-rate-limit", "--autoplay-policy=no-user-gesture-required"])
try:
    for w, h in SIZES:
        # (the computer on: its screen's light flickers, over the whole window, in the dark)
        for scheme, light, radio, pc in (("light", "on", False, False), ("dark", "on", False, False), ("dark", "off", False, False), ("light", "on", True, False), ("dark", "off", True, False), ("dark", "off", False, True)):
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
            if pc:
                b.js("document.querySelector('.pc .power').click()")
            b.js(MOVER)
            time.sleep(1)
            for _ in range(TRIES):
                b.js(REC)
                time.sleep(SAMPLE)
                s = b.js(STATS)
                if s["walked"] >= WALKED:
                    break
            ok = s["p50"] <= FRAME_MS and s["slow"] < 5 and s["walked"] >= WALKED
            what = f"{w} x {h} {scheme}, light {light}{', radio on' if radio else ''}{', computer on' if pc else ''}: {1000 / s['p50']:.0f} fps, {s['slow']}% of {s['frames']} frames over 25 ms, Willy walking in {s['walked']}%"
            print(("ok    " if ok else "FAIL  ") + what)
            if not ok:
                failures.append(what)
finally:
    b.close()
sys.exit(1 if failures else 0)
