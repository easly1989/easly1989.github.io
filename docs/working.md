# Working on the site

How to serve, check and measure the site while editing it, and where every file is. The
short rules are in `CLAUDE.md`.

## Serving and verifying

Serve the repo root with `python checks/serve.py`: it sends `Cache-Control: no-cache`, so a
reload after an edit gets the new file (plain `python -m http.server` lets the browser cache
the scripts hard). Not `no-store`: it also keeps every page out of the back/forward cache, so
going back reloads the page, and readers' back is never tested. Reload rather than going back,
which may bring the page back as it was; or check what the page actually loaded.

Verification: load the affected page, check both colour schemes (`prefers-color-scheme` light
and dark are both styled), phone width, and `prefers-reduced-motion: reduce`, under which
nothing may move on its own: books arrive open, the About photo arrives developed, there are no
page transitions or opening moves, Willy sleeps, and his peek on the professional home is still;
and all of it moving again once the reader chose to animate anyway (`docs/motion.md`).
Then the checks in `checks/README.md`.

**A long-lived Chrome may report reduced motion** (Remote Desktop can leave one that way until
it is fully quit): every check sets the motion it means with `b.media(...)`, and a test of motion
must do likewise, or Willy never walks and nothing moves.

Motion needs a browser that is actually painting. Willy, the books and every transition run per
frame, so in a hidden, throttled or offscreen preview none of it appears to work while the
static layout is fine. Headless Chrome is unreliable for the page transitions in particular: it
skips some of them at random.

When checking layout by script, load lazy images first (`img.loading = "eager"` and wait), or
every book page and screenshot measures as if it had no picture. Measure rotated elements with
`offsetWidth`/`offsetHeight`; `getBoundingClientRect()` returns the rotated box.

**Never write a file by opening it for writing before reading it.** In Python,
`open(p, "wb").write(open(p, "rb").read())` truncates the file before the read runs, and the
file is gone. Read into a variable first, then open for writing. This wiped six files in one
command during an earlier redesign; nothing was committed, so they had to be rebuilt by hand.

## Structure

- `index.html`: both homes (`docs/homes.md`). The room's mat is a 1280×880 stage, `.stage`
  inside `.fit`; its inline `<style>` draws the objects (`.thing`), its templates hold the Write
  to me sheet,
  and inline scripts run the computer, the pager's screen, the contact sheet's `mailto:` URL
  and Willy's peek.
- `pro.css`, `pro/`: the professional home's and pages' styles, and the pages, generated.
- `motion.js`: whether the reader wants motion (`docs/motion.md`), loaded in every page's head.
- `styles.css`: what the playful pages and the room share: tokens and accents, the mat, paper
  and tape, buttons, the label sheet, taped screenshots and the lightbox, the sheet dialog,
  loose desk items, the book, Willy's speech bubble (`.cat-says`) and the page transitions.
- `room.css`, `room.js`, `room-*.js`, `morph.js`: the room, its parts and its opening moves.
- `willy.js` (his model, fur and outline), `willy-room.js` (him in the room), `willy-life.js`
  (his everyday actions), `willy-moves.js`, `willy-paths.js` (how and where he moves),
  `willy-review.js` (`?room&review`, a page for checking his clips); `assets/willy.glb`, built
  by `cat-src/` from a licensed model whose sources stay out of the repo (`cat-src/README.md`);
  three.js in `vendor/three`.
- `about.html`, `asf-plugins.html`, `cloudbank.html`, `coordinator-monitor.html`, `cupid.html`,
  `donate.html`, `nutreek.html`, `planora.html`, `social-contacts-sync.html`: the playful
  pages. `asf-notifier.html` is only a redirect to `asf-plugins.html#asf-notifier`. Each links
  `styles.css` and keeps its own layout in a small inline `<style>`, and any behaviour only it
  has in one inline script.
- `site.js`: shared behaviour, loaded `defer`, on the professional pages too: the ruler, the
  lightbox, the Write to me sheet, books you can leaf through, tabbed folders, the objects'
  opening moves where `morph.js` does not play them, and CloudBank's version from `versions.json`.
- `terminal.html` and `crt.js`: the console behind the old computer, and the sounds both make.
- The project marks: `logo.svg` (CloudBank, and the favicon of the pages about the person),
  `asf-notifier.svg`, `asf-pluginconfig.svg`, `coordinator-monitor.svg`, `cupid.svg`,
  `nutreek.svg`, `planora.svg`, `social-contacts-sync.svg`. `assets/` holds the screenshots,
  `carlo.jpg`, the photos, the radio, the mouse and the crab (`assets/plush/README.md`).
- `data/projects/`: one JSON file per project with every fact the pages show about it;
  `tools/sync.py` writes them in (`tools/README.md`); `data/pages/`: what the professional About
  and Donate say; `checks/`: the checks.
