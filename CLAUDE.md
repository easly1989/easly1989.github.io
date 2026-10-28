# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Carlo Ruggiero's personal project site, served by GitHub Pages from the root of
`main` at https://easly1989.github.io. There is no build step, no package manager,
no test suite and no CI — the `.html`, `.css`, `.js` and `.svg` files in the repo
root are exactly what ships. A push to `main` is a deploy.

The whole site is one scene: a cutting mat seen from above — "the bench" — with
one object on it per project, and a cat that lives there and does what it likes.

## Working on it

Preview locally with any static server from the repo root, e.g.:

```bash
python -m http.server 8000
```

Opening a file directly with `file://` mostly works, but `<dialog>`, the
session storage the cat uses and the page transitions are easier to trust over
HTTP.

`python -m http.server` lets the browser cache `styles.css`, `site.js` and
`cat.js` hard, and a stale copy will have you debugging code the page never
loaded. Serve with `Cache-Control: no-cache` while working (`python checks/serve.py`
does) and reload after an edit, rather than going back to the page, which may bring it
back as it was; or check what the page actually loaded before believing it. Not
`no-store`: it also keeps every page out of the back/forward cache, so going back reloads
the page, and readers' back is never tested.

Verification is manual: load the affected page, check both colour schemes
(`prefers-color-scheme` light and dark are both styled), check phone width, and
check `prefers-reduced-motion: reduce` — under it nothing may animate on its
own: books arrive open, the About photo arrives developed, there are no page
transitions, and the cat sleeps and moves only when clicked, instantly.

Motion needs a browser that is actually painting. The cat, the books and every
transition run per frame, so in a hidden, throttled or offscreen preview none of
it appears to work while the static layout is perfectly fine. Check motion in a
real window before concluding it is broken. Headless Chrome is unreliable for
the page transitions in particular: it skips some of them at random.

When checking layout by script, load lazy images first (`img.loading = "eager"`
and wait), or every book page and screenshot measures as if it had no picture —
that hid an overflowing Nutreek page during the redesign. Measure rotated
elements with `offsetWidth`/`offsetHeight`; `getBoundingClientRect()` returns
the rotated box.

**Never write a file by opening it for writing before reading it.** In Python,
`open(p, "wb").write(open(p, "rb").read())` truncates the file before the read
runs, and the file is gone. Read into a variable first, then open for writing.
This wiped six files in one command during an earlier redesign; nothing was
committed, so they had to be rebuilt by hand.

## Structure

- `index.html` — the bench. A 1280×880 stage, `.stage` inside `.fit`, scaled to
  the window by `site.js` through `--s`; under 900px it becomes a column. Its
  inline `<style>` draws the objects (`.thing`), its templates hold the Write to
  me sheet, and one inline script turns that sheet into a `mailto:` URL.
- `styles.css` — everything the pages share: tokens, the mat, paper and tape,
  buttons, the label sheet, taped screenshots and the lightbox, the sheet
  dialog, loose desk items, the cat and its toys, the book, and the page
  transitions.
- `about.html`, `cloudbank.html`, `cupid.html`, `donate.html`, `nutreek.html`,
  `planora.html`, `social-contacts-sync.html` — the pages. Each links
  `styles.css` and keeps its own layout in a small inline `<style>`, and any
  behaviour that only it has in one inline script.
- `site.js` — shared behaviour, loaded `defer`: the ruler, scaling the bench,
  the lightbox, the Write to me sheet, books you can leaf through, the home
  objects' opening moves, and CloudBank's version from `versions.json`.
- `cat.js` — the cat, loaded `defer` after `site.js` on every page.
- `terminal.html` and `crt.js` — the console behind the old computer on the
  bench, and the sounds both make. See The computer.
- `logo.svg` (CloudBank, and the favicon of the pages about the person),
  `cupid.svg`, `nutreek.svg`, `planora.svg`, `social-contacts-sync.svg` — the
  project marks. `assets/` holds the screenshots and `carlo.jpg`.

## The bench and its objects

Each project is one object on the home bench, and picking it up plays a move
that says what it is before its page opens: CloudBank's ledger loses its band
and opens, the Social Contacts Sync cards are dealt and get faces, Planora's jar
unfolds an idea, Nutreek's agenda flips to today, Cupid's envelope breaks its
seal, the mug tips over and spills (the way to Donate), and the instant camera
fires its flash and ejects a print (the way to About). The sticky note opens the
Write to me sheet.

A home object is `<a class="thing">` with `data-open="<move>"` and
`data-open-ms`, the time the move takes before the page opens. Shift, Ctrl or
Cmd-click and reduced motion skip the move and just navigate. Coming back
through the back/forward cache puts every object down again (`pageshow`).

Every page opens with a label sheet (`.paper.label-sheet`): the status line
(`.state`), the name, one lede and the actions. Below it, each page is its
object opened up: CloudBank is the ledger, Nutreek the agenda (open on this
week, with today's page marked), Social Contacts Sync a grid of contact cards
that a Sync photos button gives faces, Planora the vote card, the lifecycle on a
string and the idea jar, Cupid the letter out of its envelope, About the photo
developing, Donate the spilled coffee and the sugar packets.

Screenshots are taped prints, `<figure class="shot">` with a `<figcaption>`.
`site.js` wraps each `.shot img` in a `<button class="zoom">` that opens it full
size in a shared `<dialog class="lightbox">` — a real button, so Enter, Space,
focus and the label come for free. Every screenshot carries its real `width`
and `height` and `loading="lazy"`, so nothing jumps as they load and nothing is
fetched for a page the reader never scrolls through.

**Careful with class names.** `styles.css` uses short generic names for the
cat's traces and toys — `.print` is a paw print, `.box`, `.bag`, `.fur`,
`.flap` (a box toy's flaps), `.slip` — and a page-level element with the same
name picks up their rules. The About photo was first called `.print` and came
out as a paw print. Check `styles.css` before introducing a generic class name.

## Books

`.book` is a book you can leaf through: `.leaf` elements, each with a
`.page.front` and a `.page.back`, turned in 3D. `site.js` builds a corner to
turn on every page, wires the side tabs (`.tabs [data-go="<spread>"]`), the
previous and next buttons and the arrow keys, and makes every page that is not
showing `inert`. A book arrives closed and opens; `data-open-to` makes it go on
to a spread, which is how the Nutreek agenda opens on today. Under 900px a book
is simply its pages in a column, all of them readable.

A page has a fixed height. Adding content to one means checking it still fits,
with its images loaded, at 1280, 1100 and 960 wide.

## Between pages

The browser morphs one page into the next (`@view-transition { navigation:
auto; }` in `styles.css`): the mat and the header stay, the object you picked up
becomes its page's counterpart, and the rest cross-fades. Where cross-document
view transitions are not supported (Firefox, today) the pages simply load, and
nothing else depends on them. Under reduced motion there are none.

The pairs are made by `view-transition-name`, one per page and unique on it:

| Home | Page | Name |
|---|---|---|
| `#ledger` | `cloudbank.html` `#ledger` (the book) | `cloudbank` |
| `#agenda` | `nutreek.html` `#agenda` (the book) | `nutreek` |
| `.thing.cards` | `social-contacts-sync.html` `.label-sheet` | `scs` |
| `.thing.jar` | `planora.html` `.label-sheet` | `planora` |
| `.thing.envelope` | `cupid.html` `.env` | `cupid` |
| `.mug .cup`, `.mug .puddle` | `donate.html` `.spill .cup`, `.spill .puddle` | `mug`, `puddle` |
| `.camera .film` | `about.html` `.instant` | `photo` |
| `.pc .glass` | `terminal.html` `.crt` | `crt` |

`header.bar` is named `bar` and `.cat` is named `cat` on every page. A duplicate
name cancels the transition silently, so a new name needs a check on both pages.

The ledger and the agenda open on their own pages, so where pages morph they only
lift on the bench (`data-vt-ms`, `.lift`) and the opening happens once, after the
morph lands. The other objects play their move on the bench and morph after it.

## The cat

`cat.js` draws a white cat with black patches — like the one in the photo on the
About page — seen from above, as an SVG puppet: body, head, four paws and a
tail, posed by transforms, so every pose is the same cat moved. It has no eyes:
seen from above they read as the back of its head.

It ignores the mouse. Every few seconds it picks one of about forty actions at
random, weighted, among those the page has the props for: wandering, napping,
grooming, zoomies, knocking things off, scratching the ledger, sitting on paper,
hiding under things, lapping at the spilled coffee and leaving brown prints,
bringing a present. Clicking it gets one of fourteen reactions, also at random —
purring, a headbutt, a belly trap, ignoring you. Clicked repeatedly it moves
away, and clicked a lot it leaves the screen for half a minute: that is also how
a reader moves it off something it is covering.

A page opts in with `data-cat-world` on the element the cat lives in. Things it
can play with carry `data-cat="<what it can do>"` — `knock`, `push`, `sit`,
`hide`, `scratch`, `book`, `corner`, `nav`, `photo`, `coffee`, `puddle`, `jar`,
`cards`, `envelope`, `tape` — and an action whose prop is missing is never
picked. Its claw marks persist for the visit in `sessionStorage`.

Toys are placed at random on each load, two to four of eight kinds, and touching
one always shows an effect on the toy. Whether the cat cares is chance, lowered
when it is asleep, when it was just petted, or when the same toy was poked a
moment ago. A real cat does not answer every stimulus, and this one must not.

The walk is driven by distance, not by a looping animation: `cat.js` advances
`--g` with every pixel travelled and the paws read it, so the feet keep pace
with the body at any speed and stop when it stops. Never drive the gait with an
animation whose duration changes while it runs — Chrome freezes it, and the cat
glides.

Toys and the cat's starting spot avoid everything in `busyRects()` — links,
buttons, paper, screenshots, every `data-cat` prop, the headings on the mat —
with a clearance for the toy's size. A new kind of content block that the cat
should not land on goes into that selector or carries `data-cat-avoid`.

It is the same cat on every page: on `pagehide` it saves where it is on screen,
and the next page, within five seconds, puts it there before the first frame,
so it stays put while the page changes under it.

Under reduced motion it sleeps where it starts, in a clear spot, and still
answers; any move it makes is instant.

## The computer

An easter egg, not a project: an old all-in-one computer drawn in CSS 3D in the
top-left corner of the bench, hidden under 900px. Its markup, style and script
are inline in `index.html` (`.pc`). Only its power button does anything until it
has booted; then the screen or the keyboard opens `terminal.html`, a green CRT
console with a fake filesystem, floppy disks, tab completion and a few hidden
commands.

**The hidden commands are sealed, and that is the point.** Each one is the key
(PBKDF2, then AES-GCM) to its own entry in the `VAULT` in `terminal.html`, so the
page holds no command and no hash of one. The commands, the programs they open
and the kit that seals them live outside the repo, in
`~/.claude-env/bench-terminal/` (its `kit/build_term.py` rewrites
`terminal.html`). Edit the console there, never in the built page, and never
write a command, or the name of what it opens, into this repo — not in a
comment, a commit message or a PR. The hints in the console are riddles on
purpose.

State, all in this browser: `sessionStorage pc:on` says the computer was
switched on; opening `terminal.html` without it shows a red FATAL screen and
sets `localStorage pc:fried`, after which the bench computer stays broken
(cracked, scorched) until site data is cleared. `localStorage pc:mute` is the
speaker button. Ten wrong commands, or three wrong passwords, play
`assets/tty0.mp4` in a loop until its window is closed.

`crt.js` makes every sound with Web Audio, nothing downloaded; it loads, not
deferred, before `site.js` on the home page. `terminal.html` stands alone: it
loads `crt.js` and its own script, and not `styles.css`, `site.js` or the cat.

## Motion

**The resting state is the visible one.** Everything that animates on its own
ends where the content is plainly visible, and a page whose scripts never load
shows all of it: books are readable pages, the About photo is a photo (its
development is a CSS animation that ends at no filter), and the cat is simply
absent. Never write a rule that leaves content hidden unless something else
runs.

Non-user-triggered motion is the cat, the opening moves and the page
transitions. Decoration does not loop forever: the mug's steam puffs three times
and stops.

## Money and attribution

`donate.html` is the site's own page, and donation links point at it rather than
at any product's own donate page — sending people from this site to a product's
donate page reads as though the site were asking on that product's behalf.

**The page names no projects at all, on purpose.** It is about supporting the
work in general: the time to finish and maintain things, releasing more of them
openly, and hosting for the apps and demos. An earlier draft argued the case
project by project — CloudBank is free, Planora is hosted at my expense, Nutreek
and Cupid are licensed — and it read as a pitch aimed at specific software.
Keep it general and keep it polite. In particular, do not describe the closed
projects as permanently closed: opening more of them up later is something Carlo
would like to do, and the page says so.

**The packets come first and then stay put.** The page exists to be donated
through, so the four services sit right under the label as sugar packets on a
tray (`.tray`), pinned to the top of the window for the whole page. On a phone,
under 52rem, the tray is fixed to the bottom instead, with `padding-bottom` on
the mat so the end of the page is never trapped under it. `scroll-padding` on
`html` keeps anything that takes focus clear of the tray (WCAG 2.4.11).

Each packet carries its service's own colour, taken from the service itself
rather than from memory: Buy Me a Coffee `#FFDD00` on `#0D0C22`, GitHub Sponsors
`#BF3989` light and `#DB61A2` dark (Primer's `--fgColor-sponsors`), PayPal
`#003087` light and `#0070E0` dark, Liberapay `#F6C915`. All four clear 4.5:1 in
both schemes. The icons are **drawn in this repo**, not lifted from anyone's
site: each says what kind of giving it is — a cup, a heart, a card, a recurring
arrow — so no third-party trademark artwork is redistributed here. If official
brand buttons are ever wanted instead, they should be downloaded from each
service's own brand page and committed to `assets/`.

Each packet hands the reader to that service. No payment details are ever
collected here, and there is no backend that could receive them — which is what
the till receipt on the page says, "Charged here 0.00".

The HomeBank attribution belongs on `cloudbank.html`, where it is a factual note
about that product's origins. It is deliberately **not** on the home page, where
it read as a disclaimer about the whole site.

## The CloudBank demo

`cloudbank.html#demo` links the demo instance. Since CloudBank's `:demo`
build, the demo has no shared sign-in: one button makes a throwaway account of
the visitor's own, deleted after two hours without use, every night and on every
update. The page says so next to the link, and points at CloudBank's
`docs/demo.md` for the rest — keep the two saying the same thing. No credentials
belong in this repo at all.

## Voice

Plain and first-person, and no broader than the facts. Carlo is a software
developer with more than a decade of experience, currently a Full Stack
Software Developer at TeamSystem; the projects here are his own time. Earlier
drafts of this site opened with "Whole products, not demos" and a donate page
arguing about the ethics of paywalls, and both were asked to be toned down.
Describe what a thing is and let the reader decide whether it is impressive.
The bench is allowed to be playful — the cat says "fits" in a box — but the
words about the work stay factual.

Never invent biography. LinkedIn (HTTP 999) and Instagram (login wall) cannot
be read programmatically, so anything personal on the About page came from
Carlo directly and the next fact should too.

## The design system

Three typefaces, from Google Fonts: **Bricolage Grotesque** for names and
headings, **Atkinson Hyperlegible** for reading, and **IBM Plex Mono** only for
text that is literally machine text: image tags, paths, commands, the values in
spec tables.

The ground is the mat, a green cutting mat with a 1 cm grid (`--mat`, darker in
the dark scheme). On it everything is a physical thing: paper (`--paper`, light
in both schemes, so text on paper is dark in both), tape, taped prints, index
cards, sticky notes. The only saturated colours are each product's accent, taken
from its logo mark, and the donation services' own colours.

Deliberately absent, and worth not reintroducing: gradient-filled words in
headings, chips, identical rounded cards, `·`-joined meta strings, and `→`
appended to button text.

## The things that are coupled

**The product accents live once**, in `:root` in `styles.css` (`--cloudbank`,
`--scs`, `--planora`, `--nutreek`, `--cupid`); a page or a button takes one as
`--c`. Light accents are chosen to clear 4.5:1 against white, because a `.btn`
puts white text on `--c`.

**The home page describes each product twice over.** Its object (a name and a
short line) and the page's label sheet. A release or a status change usually
touches both.

**`.label-sheet .state` is the status line.** One sentence, "Shipping, v3.8.1.
Open source under AGPL-3.0.", "In internal testing. Free, and hosted for you.",
"Available to license."

**CloudBank's version is not written by hand.** Every mention is a
`<span data-cloudbank="stable">` (or `"nightly"`, or `data-cloudbank-date`), and
`site.js` fills it from `versions.json` on CloudBank's `site-data` branch, which
CloudBank's release and nightly workflows rewrite when they publish. The text in
the markup is only the fallback shown if that fetch fails; move it forward now
and then, but a release no longer needs an edit here.

**A morph is a pair.** Renaming or removing a home object, or the element its
page shows first, breaks its page transition: see the table under Between pages.

**Contact is mailto-based.** The Write to me sheet on the home page is a form in
`<template id="sheet-contact">`; its inline script builds a `mailto:` URL to
`window.CONTACT_EMAIL`, set in a `<script>` in the head. Nothing is posted
anywhere — there is no backend, and adding one would be a real architectural
change, not a tweak. Other pages use plain `mailto:` links.

**The nav is repeated in every page.** Projects, About, Donate, GitHub, plus
`aria-current="page"` on the current one. Adding a page means touching all of
them; there is no include mechanism and that is the accepted cost of a no-build
site.

## Conventions

Markup is Prettier-formatted-looking: two-space indent, ~100 column wrap, double
quotes, self-closing void elements. Match it by hand; no formatter is configured.

Files are LF. Writing them from Python needs `newline="\n"`, or Windows turns
every line ending into CRLF and the whole file shows as changed.

Accessibility is deliberate throughout: `aria-current="page"` in the nav, `alt=""`
on marks that repeat adjacent text, a label on every control the cat and its toys
are, an `aria-live` line that says what the cat did, every page that is not
showing `inert`, a visible focus ring on every interactive element, and contrast
held at 4.5:1 or better in both schemes. Keep it when editing.

External links carry `rel="noopener"`.

Commit messages are short imperative sentences describing the user-visible change,
e.g. "Update CloudBank to v3.0.0 on the card and detail page".

## Agent skills

### Issue tracker

GitHub Issues on `easly1989/easly1989.github.io`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.

### Token tools

CBM: declined (2026-10-17).
