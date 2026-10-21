"""The room's photos, as a reader meets them: the camera takes one, never the same twice
running, and About shows it developing; back in the room it lands in its own place, with the
morph; picked up there it opens About on itself, developed, and lands in the same place again;
taken again it leaves its place. Under reduced motion a photo still goes to its place. With
all seven out, each is a labelled link inside the window, clear of the name, the poster's words
and the window, at every size the room shows at. Needs a window that is actually painting, so
it opens one."""
import json
import sys
import time

from cdp import Browser
from serve import serve

SIZES = [(1280, 720), (1366, 768), (1440, 900), (1920, 1080), (2560, 1080)]

# what is named when the page is left and when it is shown, and which photos are out as the
# room is left
PROBE = r"""
addEventListener('load', () => {
  const names = () => [...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((v) => v && v !== 'none' && v !== 'auto');
  addEventListener('pageswap', (e) => {
    sessionStorage.__swap = JSON.stringify({ vt: !!e.viewTransition, names: names(), out: [...document.querySelectorAll('.snap.out')].map((s) => s.dataset.photo) });
  });
});
// read once every listener of the page has run: the room names the photo in its own
addEventListener('pagereveal', (e) => {
  setTimeout(() => { sessionStorage.__reveal = JSON.stringify({ page: location.pathname, vt: !!e.viewTransition, names: [...document.querySelectorAll('*')].map((n) => getComputedStyle(n).viewTransitionName).filter((v) => v && v !== 'none' && v !== 'auto') }); }, 0);
});
addEventListener('error', (e) => { const l = JSON.parse(localStorage.__errs || '[]'); l.push(location.pathname + ': ' + e.message); localStorage.__errs = JSON.stringify(l); });
"""
# a point on the element that the pointer actually reaches
POINT = """((sel) => { const t = document.querySelector(sel); if (!t) return null; const r = t.getBoundingClientRect();
  for (const [fx, fy] of [[.5,.5],[.5,.4],[.4,.5],[.6,.5],[.5,.6],[.5,.3],[.3,.5],[.7,.5]]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy, h = document.elementFromPoint(x, y);
    if (h && t.contains(h)) return [x, y]; }
  return null; })"""
CAMERA = "a.thing.camera"
# About's print, as the reader sees it
PRINT = """(() => { const p = document.getElementById('print'); return { page: location.pathname.split('/').pop(),
  src: p.querySelector('img').getAttribute('src'), developing: !p.classList.contains('developed') && p.querySelector('img').getAnimations().length > 0,
  caption: p.querySelector('.caption').innerHTML.length > 0, shot: sessionStorage.getItem('photo:next') }; })()"""
# a photo's place, and whether it is out there
SNAP = """((id) => { const s = document.querySelector('.snap[data-photo="' + id + '"]'); const r = s.getBoundingClientRect();
  return { out: s.classList.contains('out') && getComputedStyle(s).visibility === 'visible', at: [Math.round(r.left), Math.round(r.top)],
    named: s.style.viewTransitionName || '', inert: document.body.inert }; })"""

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


def click(b, x, y):
    for t in ("mouseMoved", "mousePressed", "mouseReleased"):
        b.call("Input.dispatchMouseEvent", type=t, x=x, y=y, button="left", clickCount=1)


def state(b, key):
    return json.loads(b.js(f"sessionStorage.{key} || 'null'") or "null")


def go(b, sel, wait=3):
    """Click what a reader would, and come out on the page it opens."""
    b.js("sessionStorage.removeItem('__swap'); sessionStorage.removeItem('__reveal')")
    pt = b.js(POINT + f"('{sel}')")
    if not pt:
        check(False, f"{sel} can be pointed at")
        return None
    click(b, *pt)
    time.sleep(wait)
    return state(b, "__swap")


def back(b, wait=2.5):
    b.js("sessionStorage.removeItem('__reveal')")
    b.js("history.back()")
    time.sleep(wait)
    return state(b, "__reveal")


base = serve()
b = Browser(1460, 960, headless=False)
try:
    b.call("Page.addScriptToEvaluateOnNewDocument", source=PROBE)
    b.size(1440, 900)
    b.media(prefers_reduced_motion="no-preference")
    b.nav(base + "/index.html?room", 3)
    b.js("for (const k of ['photo:next', 'photo:out', 'photo:shown', 'photo:developed']) sessionStorage.removeItem(k); localStorage.__errs = '[]'; sessionStorage.setItem('room-light', 'on')")
    b.nav(base + "/index.html", 3)
    check(b.js("document.querySelectorAll('.snap').length") == 7 and not b.js("document.querySelector('.snap.out')"), "seven places in the room, none of them taken yet")

    # taken: About shows it developing
    swap = go(b, CAMERA)
    first = b.js(PRINT)
    check(first["page"] == "about.html" and first["shot"] and first["developing"] and first["caption"], f"the camera takes a photo and About shows it developing, with its caption ({first})")
    # pinned: back in the room it lands in its place, with the morph
    rev = back(b)
    a = b.js(SNAP + f"('{first['shot']}')")
    check(a["out"] and not a["inert"], f"back in the room the photo is in its place ({a})")
    check(bool(rev) and rev["vt"] and "photo" in rev["names"], f"it lands there with the morph ({rev})")
    time.sleep(1)
    check(not b.js(SNAP + f"('{first['shot']}')")["named"], "and is not named once it has landed")

    # never the same twice running, and a photo taken again leaves its place under the flash
    taken = [first["shot"]]
    for _ in range(4):
        swap = go(b, CAMERA)
        shot = b.js(PRINT)["shot"]
        check(shot != taken[-1], f"the camera never takes the same photo twice running ({taken[-1]}, then {shot})")
        check(bool(swap) and shot not in swap["out"], f"{shot} is not in its place while it is in the camera ({swap and swap['out']})")
        taken.append(shot)
        back(b)
        check(b.js(SNAP + f"('{shot}')")["out"], f"{shot} is in its place again")
    out = sorted(set(taken))
    check(sorted(b.js("[...document.querySelectorAll('.snap.out')].map((s) => s.dataset.photo)")) == out, f"every photo taken is out, and only those ({out})")

    # picked up: About on itself, developed; back to the same place
    pick = taken[0]
    before = b.js(SNAP + f"('{pick}')")
    swap = go(b, f'.snap[data-photo="{pick}"]')
    p = b.js(PRINT)
    check(p["page"] == "about.html" and p["shot"] == pick and not p["developing"], f"a pinned photo picked up opens About on itself, developed ({p})")
    check(bool(swap) and swap["vt"] and "photo" in swap["names"] and swap["names"].count("photo") == 1, f"the photo, and only it, morphs into About's ({swap and swap['names']})")
    rev = back(b)
    after = b.js(SNAP + f"('{pick}')")
    check(after["out"] and after["at"] == before["at"], f"and lands back in the same place ({before['at']} -> {after['at']})")
    check(bool(rev) and "photo" in rev["names"], "with the morph")

    # back by About's own link, not the cache: the room loads fresh, and the photo still
    # lands in its place with the morph
    b.js("sessionStorage.removeItem('__reveal')")
    go(b, f'.snap[data-photo="{pick}"]')
    b.js("sessionStorage.removeItem('__reveal')")
    b.js("document.querySelector('a.crumb').click()")
    time.sleep(2.5)
    rev = state(b, "__reveal")
    check(b.js(SNAP + f"('{pick}')")["out"] and bool(rev) and "photo" in rev["names"], f"back by a link, the photo lands in its place with the morph ({rev})")

    # About from anywhere else: the last photo of the visit
    b.nav(base + "/cloudbank.html", 2)
    b.nav(base + "/about.html", 2)
    p = b.js(PRINT)
    check(p["src"].endswith(pick + ".jpg"), f"About reached another way shows the last photo of the visit ({p['src']})")
    b.nav(base + "/index.html", 3)
    check(b.js(SNAP + f"('{pick}')")["out"], "and coming to the room from there, it is in its place")

    # About from the navigation, before any photo is taken, pins nothing
    b.js("for (const k of ['photo:next', 'photo:out', 'photo:shown', 'photo:developed']) sessionStorage.removeItem(k)")
    b.nav(base + "/index.html", 3)
    b.js("document.querySelector('.plexi a[href=\"about.html\"]').click()")
    time.sleep(2)
    back(b)
    check(not b.js("document.querySelector('.snap.out')"), "About reached by the navigation before any photo is taken pins nothing in the room")
    # outside a room visit About is as it was: Carlo's usual photo and its printed caption
    b.js("sessionStorage.setItem('room', '0')")
    b.nav(base + "/about.html", 2)
    plain = b.js("[document.querySelector('#print img').getAttribute('src'), document.querySelector('#print .caption').className, document.querySelector('#print .caption').textContent]")
    check(plain == ["assets/carlo.jpg", "caption", "That's us."], f"outside a room visit About keeps Carlo's usual photo and caption ({plain})")
    b.js("sessionStorage.setItem('room', '1')")
    b.js(f"sessionStorage.setItem('photo:next', '{pick}'); sessionStorage.setItem('photo:out', '{pick}')")
    b.nav(base + "/index.html", 3)

    # a pinned photo is a labelled link, with a focus ring
    for _ in range(80):  # the keyboard's way there
        if b.js("!!document.activeElement.closest('.snap')"):
            break
        for t in ("keyDown", "keyUp"):
            b.call("Input.dispatchKeyEvent", type=t, key="Tab", code="Tab", windowsVirtualKeyCode=9)
    link = b.js("""(() => { const s = document.activeElement; const cs = getComputedStyle(s);
      return { tag: s.tagName, href: s.getAttribute('href'), label: s.getAttribute('aria-label') || '', focused: document.activeElement === s, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; })()""")
    check(link["tag"] == "A" and link["href"] == "about.html" and len(link["label"]) > 30 and link["focused"] and link["ring"], f"a pinned photo is a labelled link with a focus ring ({link})")

    # under reduced motion it still goes to its place
    b.media(prefers_reduced_motion="reduce")
    b.nav(base + "/index.html", 3)
    go(b, CAMERA, 1.5)
    shot = b.js(PRINT)["shot"]
    back(b, 1.5)
    check(b.js(SNAP + f"('{shot}')")["out"], f"under reduced motion the photo still goes to its place ({shot})")
    b.media(prefers_reduced_motion="no-preference")

    # all seven out: inside the window, clear of the words and of the window, at every size
    b.js("sessionStorage.setItem('photo:out', 'carlo,cat,crossed-arms,beard,volleyball,seaside,hand')")
    # where a photo is really on top, point by point, against each letter of the name and the
    # poster and against the window beneath it
    WORDS = """(() => {
      const css = document.createElement('style');
      css.textContent = '.on-wall > .window { pointer-events: auto !important; }';
      document.head.appendChild(css);
      const letters = [];
      for (const host of document.querySelectorAll('.on-wall.neon, .on-wall.poster')) {
        const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode()); )
          for (let i = 0; i < n.length; i++) {
            if (!n.data[i].trim()) continue;
            const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
            const b = r.getBoundingClientRect(); if (b.width) letters.push(b);
          }
      }
      const res = [...document.querySelectorAll('.snap.out')].map((s) => {
        const r = s.getBoundingClientRect(); let words = 0, glass = 0;
        for (let x = r.left; x <= r.right; x += 3)
          for (let y = r.top; y <= r.bottom; y += 3) {
            const top = document.elementFromPoint(x, y);
            if (!top || !s.contains(top)) continue;
            if (letters.some((l) => x > l.left && x < l.right && y > l.top && y < l.bottom)) words++;
            if (document.elementsFromPoint(x, y).some((e) => e.matches('.on-wall > .window'))) glass++;
          }
        return { id: s.dataset.photo, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, words, window: glass };
      });
      css.remove();
      return res;
    })()"""
    for w, h in SIZES:
        b.size(w, h)
        b.nav(base + "/index.html", 3)
        bad = [s for s in b.js(WORDS) if not s["inside"] or s["words"] or s["window"]]
        check(not bad and len(b.js(WORDS)) == 7, f"{w}x{h}: all seven out, inside the window and clear of the words and the window" + (f" ({bad})" if bad else ""))

    errs = json.loads(b.js("localStorage.__errs") or "[]")
    check(not errs, "no script errors" + (f" ({errs})" if errs else ""))
finally:
    b.close()
sys.exit(1 if failures else 0)
