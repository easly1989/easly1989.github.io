"""The room while it is rebuilt (#160): a reader who chose the room, in a window that holds it, gets
the work-in-progress page and not the room; its way back is the plain version and takes the choice
back; ?roomdev keeps the way to the room being built, ?roomdev=0 takes it away; a phone gets the
professional page. Headless; the browser here has no room-dev key, as a reader's has none."""
import sys
import time

from cdp import Browser
from serve import serve

failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


CLS = "(c) => document.documentElement.classList.contains(c)"
WIP_SHOWN = "(() => { const e = document.querySelector('.room-wip'); return getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 100; })()"
PRO_SHOWN = "getComputedStyle(document.querySelector('.pro')).display !== 'none'"

base = serve()
b = Browser(1460, 1000, headless=True, room_dev=False)
try:
    b.media(prefers_reduced_motion="reduce")
    b.size(1440, 900)
    b.nav(base + "/index.html", 2)
    check(not b.js(f"({CLS})('wip')") and b.js(PRO_SHOWN), "a first visit gets the professional page")

    b.js("document.querySelector('.peek').click()")
    time.sleep(2)
    check(b.js(f"({CLS})('wip')") and b.js(WIP_SHOWN), "Step into the room shows the work-in-progress page")
    check(not b.js(f"({CLS})('iso')") and not b.js("!!document.querySelector('.stage .room')"), "and not the room")
    check(not b.js(PRO_SHOWN), "and not the professional page")
    check(b.js("document.querySelector('.room-wip h1').textContent.trim().length > 0") and b.js("document.querySelectorAll('.room-wip li.done').length >= 1"),
          "it has a heading and what is done")
    check(b.js("document.querySelector('.room-wip a').getAttribute('href') === '?room=0'"), "its link is the way back to the plain version")

    b.nav(base + "/index.html", 2)
    check(b.js(f"({CLS})('wip')"), "the choice is remembered: the next visit shows it too")

    b.js("document.querySelector('.room-wip a').click()")
    time.sleep(2)
    check(not b.js(f"({CLS})('wip')") and b.js(PRO_SHOWN) and b.js("localStorage.getItem('site:room') === '0'"),
          "the way back shows the professional home and takes the room choice back")

    b.nav(base + "/index.html?room&roomdev", 4)
    check(b.js(f"({CLS})('iso')") and not b.js(f"({CLS})('wip')"), "?roomdev keeps the way to the room being built")
    check(b.js("localStorage.getItem('room-dev') === '1'") and "roomdev" not in b.js("location.search"), "kept in the browser, and the address is clean")
    b.nav(base + "/index.html", 3)
    check(b.js(f"({CLS})('iso')"), "the next visit shows the room")

    b.nav(base + "/index.html?roomdev=0", 2)
    check(b.js("localStorage.getItem('room-dev') === '0'") and b.js(f"({CLS})('wip')"), "?roomdev=0 takes it away: the page says so again")

    b.size(390, 800, mobile=True)
    b.nav(base + "/index.html", 2)
    check(not b.js(f"({CLS})('wip')") and not b.js(f"({CLS})('iso')") and b.js(PRO_SHOWN), "a phone gets the professional page")
finally:
    b.close()

sys.exit(1 if failures else 0)
