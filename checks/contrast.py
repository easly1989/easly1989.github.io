"""Text contrast in the room, as drawn: in both schemes, with the room's light on, every piece
of text the reader can see clears 4.5:1 against what is actually behind it. With the light off
the room is a night view the reader chose, and the room with its light on is the readable
version of it; what has to be read to get back to it, the neon navigation, still clears 4.5:1. Each state is
drawn as it is, then again with the ink of some texts made transparent; where the two differ are
those texts' letters, and each letter's pixel is measured against the same pixel without it. So
the night's darkening and the paper or the wall under a word all count; a neon's own glow is
part of the letter, not of what is behind it. It is drawn at four times the density, so even
the smallest letters have solid cores and their colours are measured rather than how a small word blurs.
The professional home and every professional page are measured the same way, whole, in both
schemes."""
import base64
import io
import re
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

from cdp import Browser
from serve import serve

LEAST = 4.5
ROOT = Path(__file__).resolve().parent.parent
# every element with words of its own that the reader can see, and where it is on screen
TEXTS = r"""((within) => {
  const out = [];
  window.__inked = [];
  document.querySelectorAll(within + ' *').forEach((e) => {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
    const r = e.getBoundingClientRect();
    const l = Math.max(0, r.left), t = Math.max(0, r.top), rr = Math.min(innerWidth, r.right), b = Math.min(innerHeight, r.bottom);
    if (rr - l < 4 || b - t < 4) return;
    out.push({ name: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 28), box: [l, t, rr, b].map(Math.round) });
    __inked.push(e);
  });
  return out;
})"""
# the ink of some of them made transparent, their own letters only: what is inside them keeps
# the colour it had
INKLESS = r"""((ids) => {
  window.__undo = [];
  const set = (e, p, v) => { __undo.push([e, p, e.style.getPropertyValue(p), e.style.getPropertyPriority(p)]); e.style.setProperty(p, v, 'important'); };
  const own = ids.map((i) => __inked[i]);
  const keep = own.flatMap((e) => [...e.querySelectorAll('*')]).filter((c) => !own.includes(c)).map((c) => [c, getComputedStyle(c).color]);
  own.forEach((e) => {
    set(e, 'color', 'transparent');
    set(e, '-webkit-text-stroke-color', 'transparent');
    set(e, 'text-shadow', 'none');
  });
  keep.forEach(([c, col]) => set(c, 'color', col));
})"""
INKED = r"""(() => {
  __undo.reverse().forEach(([e, p, v, pr]) => (v ? e.style.setProperty(p, v, pr) : e.style.removeProperty(p)));
})()"""


def lum(img):
    c = img[..., :3] / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return c @ np.array([0.2126, 0.7152, 0.0722])


def shot(b):
    data = b.call("Page.captureScreenshot", format="png")["data"]
    return np.asarray(Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB"))


def apart(x, y):
    return x[2] <= y[0] or y[2] <= x[0] or x[3] <= y[1] or y[3] <= x[1]


def measure(b, within):
    texts = b.js(TEXTS + f"('{within}')")
    # texts whose boxes do not overlap lose their ink together, so the letters that change in
    # a box are that text's own
    groups = []
    for i, t in enumerate(texts):
        g = next((g for g in groups if all(apart(t["box"], texts[j]["box"]) for j in g)), None)
        if g is None:
            groups.append([i])
        else:
            g.append(i)
    a = shot(b)
    k = a.shape[1] / b.js("innerWidth")
    out = {}
    for g in groups:
        b.js(INKLESS + f"({g})")
        time.sleep(0.1)
        z = shot(b)
        b.js(INKED)
        for i in g:
            l, tp, r, bt = (round(v * k) for v in texts[i]["box"])
            ca, cz = a[tp:bt, l:r].astype(np.float32), z[tp:bt, l:r].astype(np.float32)
            d = np.abs(ca - cz).sum(axis=2)
            # the cores of the letters: the tenth of its pixels the ink changes most, so a thin
            # stroke is measured by its middle and not by its antialiased edges
            inked = d[d > 30]
            if inked.size < 12:
                continue  # nothing of it shows: covered by something in front of it
            mask = d >= np.percentile(inked, 90)
            if mask.sum() < 12:
                continue  # nothing of it shows: covered by something in front of it
            ta, tz = lum(ca)[mask], lum(cz)[mask]
            ratio = float(np.median((np.maximum(ta, tz) + 0.05) / (np.minimum(ta, tz) + 0.05)))
            n = texts[i]["name"]
            out[n] = min(ratio, out.get(n, ratio))
    return out


def rgb_ratio(fg, bg):
    """The contrast of two computed colours, rgb() or rgba() (alpha ignored: both are opaque)."""
    def l(c):
        v = [int(x) / 255 for x in re.findall(r"[\d.]+", c)[:3]]
        v = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    a, b_ = sorted((l(fg), l(bg)))
    return (b_ + 0.05) / (a + 0.05)


failures = []
base = serve()
b = Browser(1460, 1000, headless=True)
try:
    b.call("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=4, mobile=False)
    for scheme in ("light", "dark"):
        for light in ("on", "off"):
            b.media(prefers_color_scheme=scheme, prefers_reduced_motion="reduce")
            b.nav(base + "/index.html?room", 1)
            b.js(f"sessionStorage.setItem('room-light', '{light}')")
            b.nav(base + "/index.html", 4)
            within = ".fit" if light == "on" else ".fit nav.plexi"
            low = sorted((r, n) for n, r in measure(b, within).items() if r < LEAST)
            what = f"{scheme}, light {light}: every text {'' if light == 'on' else 'of the navigation '}at {LEAST}:1 or better"
            if low:
                what += " (" + "; ".join(f"{n} {r:.1f}" for r, n in low) + ")"
                failures.append(what)
            print(("ok    " if not low else "FAIL  ") + what)
    # the professional pages: flat colours, so twice the density is enough; the window is as tall
    # as the page, with its pictures in, so every word is in it
    pro = ["index.html"] + sorted("pro/" + f.name for f in (ROOT / "pro").glob("*.html"))
    b.call("Emulation.setDeviceMetricsOverride", width=1280, height=900, deviceScaleFactor=2, mobile=False)
    # (the room was chosen above: the home is the professional page again)
    b.js("localStorage.setItem('site:room', '0')")
    for scheme in ("light", "dark"):
        b.media(prefers_color_scheme=scheme, prefers_reduced_motion="reduce")
        for page in pro:
            b.nav(base + "/" + page, 1.5)
            b.js("Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.decode().catch(() => {}); }))")
            h = b.js("document.documentElement.scrollHeight")
            b.call("Emulation.setDeviceMetricsOverride", width=1280, height=h, deviceScaleFactor=2, mobile=False)
            time.sleep(0.5)
            shown = b.js("!document.documentElement.classList.contains('iso') && !!document.querySelector('.pro, .ph')")
            got = measure(b, ".pro" if page == "index.html" else "body") if shown else {}
            low = sorted((r, n) for n, r in got.items() if r < LEAST)
            what = f"{page}, {scheme}: every text at {LEAST}:1 or better ({len(got)} measured"
            what += f", the lowest {min(got.values()):.1f})" if got else ", none: the page did not show)"
            if low:
                what += " (" + "; ".join(f"{n} {r:.1f}" for r, n in low) + ")"
            bad = bool(low) or not got
            if bad:
                failures.append(what)
            print(("ok    " if not bad else "FAIL  ") + what)
            # a button's accent border against the ground: 3:1 for what is not text (WCAG 1.4.11)
            edges = b.js("""[...document.querySelectorAll('.acts a:not(.go)')].map((a) => [a.textContent.trim(),
              getComputedStyle(a).borderTopColor, getComputedStyle(document.body).backgroundColor])""")
            weak = [(n, r) for n, fg, bg in edges if (r := rgb_ratio(fg, bg)) < 3]
            if edges:
                what = f"{page}, {scheme}: the buttons' borders at 3:1 or better ({len(edges)}, the lowest {min(rgb_ratio(f, g) for _, f, g in edges):.1f})"
                if weak:
                    what += " (" + "; ".join(f"{n} {r:.1f}" for n, r in weak) + ")"
                    failures.append(what)
                print(("ok    " if not weak else "FAIL  ") + what)
finally:
    b.close()
sys.exit(1 if failures else 0)
