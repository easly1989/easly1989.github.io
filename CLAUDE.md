# CLAUDE.md

Carlo Ruggiero's personal project site, served by GitHub Pages from the root of `main` at
https://easly1989.github.io. No package manager, no CI: the `.html`, `.css`, `.js` and `.svg`
files are what ships, and a push to `main` is a deploy. Two faces: the plain **professional
home** (`index.html`'s `<div class="pro">`, `pro.css`, `pro/`), the default everywhere, and
**the room** a reader chooses from it: the bench on a desk, Willy the 3D cat, the playful pages.

## Commands

- `python checks/serve.py`: serve the repo root with `no-cache` (never `no-store`: it breaks the
  back/forward cache). Reload after an edit; going back may show the page as it was.
- `python tools/sync.py`: after every edit to `data/projects/` or `data/pages/`; writes the facts
  into the pages and `pro/`, and the result is committed. `--check` writes nothing; `--versions`
  after a release (`tools/README.md`).
- `python checks/data.py`: after any data or page-fact change. The browser checks, to run before
  merging a change to the room: `checks/README.md`.

## Rules for any edit

- **Never open a file for writing before reading it**: `open(p, "wb").write(open(p, "rb").read())`
  empties it first, and once wiped six files. Read into a variable, then write.
- Files are LF: from Python, `newline="\n"`.
- **Never edit inside `<!-- data:<id>.<block> -->` … `<!-- /data -->` or in `pro/`**: edit the
  data file and run `python tools/sync.py`, done by the session, never by Carlo. Facts still
  written by hand are held to the data by `checks/data.py` (`docs/data.md`).
- **The terminal's hidden commands are sealed.** Never write a command, or the name of what it
  opens, into this repo: not in a comment, a commit message or a PR. Edit the console in
  `~/.claude-env/bench-terminal/`, never the built `terminal.html`, which stands alone
  (`docs/computer.md`).
- **The resting state is the visible one**: never a rule that leaves content hidden unless
  something else runs. Under reduced motion, unless the reader chose to animate anyway, nothing
  moves on its own: books arrive open, the About photo developed, no page transitions or opening
  moves, Willy sleeps and his peek is still. Scripts ask `reducedMotion()`, never `matchMedia`;
  reduced-motion CSS starts with `:where(html:not(.motion-ok))`. This PC's Chrome reports reduced
  motion by default: emulate `no-preference` to test motion (`docs/motion.md`).
- Donate, playful and professional, names no project and never calls a closed project closed for
  good; donation links point at `donate.html`; HomeBank's attribution is on `cloudbank.html`
  only. Never invent biography: personal facts come from Carlo (`docs/content.md`).
- The professional pages never link to the playful ones and load nothing of the room.
- External links carry `rel="noopener"`. Keep the accessibility and 4.5:1 contrast in both
  schemes; product accents live once, in `:root` in `styles.css` (`docs/design.md`).
- Before a new generic class name, check `styles.css`, `room.css` and `pro.css` for rules it would
  pick up.
- A `view-transition-name` is half of a pair: renaming a room object or its page's first element
  breaks the morph, and a duplicate name cancels it silently (`docs/pages.md`).
- A new link in the room must sit inside its frame, or the room is drawn smaller
  (`docs/homes.md`). A book page has a fixed height: check it still fits (`docs/pages.md`).
- Contact is `mailto:` only; there is no backend. The playful nav is repeated by hand in every
  playful page (`docs/data.md`).
- Commit messages: short imperative sentences about the user-visible change, e.g. "Update
  CloudBank to v3.0.0 on the card and detail page".

## Verify

Load the page in both colour schemes, at phone width and under reduced motion (and with the
choice to animate anyway), then the checks. Motion needs a window that is painting; headless
Chrome skips page transitions at random; load lazy images before measuring (`docs/working.md`).

## Where things are

- `index.html` both homes; `pro.css`, `pro/` (`pro/README.md`); `styles.css` the playful pages;
  `room.css`, `room*.js`, `morph.js` the room; `willy*.js`, `cat-src/` Willy; `site.js` shared
  behaviour; `motion.js` the motion choice; `terminal.html`, `crt.js` the console;
  `data/projects/`, `data/pages/` the facts; `tools/`, `checks/`.
- `docs/working.md`: serving, verifying, measuring by script, the full file layout.
- `docs/homes.md`: the professional home, choosing the room, its objects, Willy.
- `docs/pages.md`: label sheets, books, the morph table, a family page.
- `docs/computer.md`: the easter-egg computer and its console.
- `docs/motion.md`: motion and the "animate anyway" choice.
- `docs/data.md`: data files, versions and releases, adding a project, the nav.
- `docs/content.md`: voice, Donate and attribution, the CloudBank demo.
- `docs/design.md`: typefaces, colours, markup and accessibility conventions.
- Domain docs, single-context: `CONTEXT.md`, and `docs/adr/` once created
  (`docs/agents/domain.md`). Issues: GitHub Issues on `easly1989/easly1989.github.io` via `gh`
  (`docs/agents/issue-tracker.md`). Token tools: CBM declined (2026-10-17).
