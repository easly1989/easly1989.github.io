# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Carlo Ruggiero's personal project site, served by GitHub Pages from the root of
`main` at https://easly1989.github.io. There is no build step, no package manager,
no test suite and no CI — the `.html`, `.css`, `.js` and `.svg` files in the repo
root are exactly what ships. A push to `main` is a deploy.

## Working on it

Preview locally with any static server from the repo root, e.g.:

```bash
python -m http.server 8000
```

Opening a file directly with `file://` mostly works, but the root-relative asset
paths and `<dialog>` behaviour are easier to trust over HTTP.

`python -m http.server` lets the browser cache `styles.css` and `site.js` hard,
and a stale copy will have you debugging CSS that the page never loaded. Serve
with `Cache-Control: no-store` while working, or check what the page actually
loaded before believing it.

Verification is manual: load the affected page, check both colour schemes
(`prefers-color-scheme` light and dark are both styled), check phone width, and
check `prefers-reduced-motion: reduce` — under it every reveal must resolve to
plain visible content and no reel may auto-advance.

Motion needs a browser that is actually painting. Scroll reveals, the accent
swap and every transition run per frame or on `IntersectionObserver`, so in a
throttled or offscreen preview none of it appears to work while the static
layout is perfectly fine. Check motion in a real window before concluding it is
broken.

**Never write a file by opening it for writing before reading it.** In Python,
`open(p, "wb").write(open(p, "rb").read())` truncates the file before the read
runs, and the file is gone. Read into a variable first, then open for writing.
This wiped six files in one command during the redesign; nothing was committed,
so they had to be rebuilt by hand.

## Structure

- `index.html` — the home page. Links `styles.css`, then adds its own inline
  `<style>` for the parts only it has (the index rows, the product sections, the
  contact dialog) and one inline IIFE for the dialog.
- `styles.css` — the shared design system: tokens, the site frame, and the
  components every page draws from (`.masthead`, `.section`, `.defs`, `.spec`,
  `.code`, `.note`, `.reel`, `.pane`, `.actions`).
- `about.html`, `cloudbank.html`, `cupid.html`, `donate.html`, `nutreek.html`,
  `planora.html` — content pages. Each links `styles.css` and sets one variable,
  `--accent`, in a small inline `<style>`, with a dark-mode override beside it.
- `site.js` — shared behaviour, loaded `defer` by every page: scroll reveals, the
  condensing sticky header, the screenshot reels, the pointer effects, and
  (home only) the accent that follows the reader.
- `logo.svg` (CloudBank + site favicon), `cupid.svg`, `nutreek.svg`, `planora.svg`
  — project marks. `assets/` holds the screenshots and `carlo.jpg`, the portrait
  on the About page.

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

It links out to GitHub Sponsors, PayPal and Liberapay; each hands the reader to
that service. No payment details are ever collected here, and there is no backend
that could receive them.

Its accent is the ink, like `about.html`: pages about the person take the ink,
saturated colour belongs to the product marks.

The HomeBank attribution belongs on `cloudbank.html`, where it is a factual note
about that product's origins. It is deliberately **not** in the home page footer,
where it read as a disclaimer about the whole site.

## The CloudBank demo

`cloudbank.html#demo` publishes the demo instance's sign-in, and that is
deliberate: it is one shared public account on a throwaway instance, not a
secret. The page says so plainly — everyone signs in as the same user, anything
typed is visible to the next visitor, and the data is reset — so nobody treats
it as somewhere to put real finances. Keep that caveat next to the credentials
if you move them.

This is the one place credentials belong in the repo. Anything that is actually
a secret does not go in these files at all.

The values are marked `data-copy="<description>"`, which `site.js` turns into a
copy button, but only when `navigator.clipboard` exists. If the write is refused
— no user activation, an insecure context, a permissions policy — the fallback
selects the value and says to press Ctrl+C, so the advice is always actionable.
The value stays selectable text (`user-select: all`) whether or not the button
ever appears.

## Screenshots and reels

A product's screenshots go in a `<div class="reel">` as plain `<figure>`s, each
with its own `<figcaption>`. That markup is the fallback: with no JavaScript the
page simply shows every shot stacked. `site.js` adds `.is-live`, stacks them into
one 16:10 frame and builds the controls — a progress line, a dot per shot and a
pause button.

**To add a screenshot: drop the file in `assets/` and add one `<figure>` to the
reel.** Nothing counts slides or is numbered by hand; the dots, the labels and
the rotation all come from however many figures are there. A reel holding a
single figure is left alone entirely — controls for a carousel of one would be
furniture with nothing behind it, which is why Planora (one shot) has none and
Cupid has no reel at all.

The rotation pauses on hover, on focus and while the reel is off screen, and
clicking a dot or pressing an arrow key stops it for good — at that point the
reader is driving. The pause button is not decoration: WCAG 2.2.2 requires a way
to stop anything that moves for more than five seconds, and the dwell is 5.2s.
Under `prefers-reduced-motion` a reel never auto-advances at all; it starts
paused and the controls still work.

**Every screenshot can be opened full size.** `site.js` wraps each `figure img`
in a `<button class="zoom">` and opens a shared `<dialog class="lightbox">` —
a real button, so Enter, Space, focus and the screen-reader label come for
free. Click rather than hover, because hover does not exist on a phone. The
portrait on the About page is deliberately **not** in a `<figure>`, which is
what keeps the zoom button and the tilt effect off a personal photo.

**The reel frame is 3:2 and the image is drawn transparent**, with a
`drop-shadow` rather than a `box-shadow`. The screenshots are all slightly
different shapes, so whatever the frame's ratio some of them are letterboxed;
with an opaque plate behind, that leftover space read as a pale panel with a
small picture adrift inside it. A drop-shadow follows the picture's own edges,
so there is no panel to be adrift in.

Keep `loading="lazy"` on every shot. They all occupy the same box, so the
browser fetches the whole set as the reel nears the viewport — no blank frames
mid-rotation, and nothing downloaded for a product the reader never scrolls to.

## Depth, glass and the pointer

Every page opens with `<div class="depth">`: two accent-tinted auras that drift
on long loops, a grain layer that stops the gradients banding, and a glow that
trails the cursor. It is `position: fixed`, `z-index: -1`, `aria-hidden`, and
purely decorative — but it is what makes the glass read as glass, so do not
remove it and keep the panels.

**The glass recipe is deliberately thin**: a wash (50% white in light, 5% in
dark) over `blur(7px)`, with the edge drawn as `inset 0 0 0 1px` plus a 1px top
highlight rather than a border. A thick blur over an opaque panel reads as
frosted plastic; this reads as glass. It is applied by selector — `.pane`,
`.defs`, `.note`, `.code`, `.flow`, `dialog` — so grouped content picks it up
without a class in the markup. `.pane` is for anything else that should join
them, like the home page's index, the donate routes and Cupid's no-screenshots
panel.

**Pointer effects only exist under `html.pointer-fine`**, which `site.js` adds
when `(hover: hover) and (pointer: fine)` matches and motion is not reduced.
Touch devices never pay for any of it. Each effect writes a custom property in a
`requestAnimationFrame` — `--mx/--my` for the cursor glow, `--px/--py` for a
pane's highlight, `--tx/--ty/--tilt` for a screenshot, `--magnet-x/y` for a
button — because `pointermove` fires far more often than the screen updates.

The highlight is drawn in a `::before`, so it only goes on panes whose children
are positioned above it (`.pane > *` and friends set `z-index: 1`). It is
deliberately **not** on `<pre class="code">`, whose children are raw text nodes:
the glow would tint the code itself.

**Careful with layer names.** The depth layer was first called `.field`, which is
also the contact form's label class — the fixed, full-bleed background rules
landed on every form field. Check both the stylesheet and `index.html`'s inline
styles before introducing a generic class name.

## Motion

`site.js` owns it, and two rules hold.

**The resting state is the visible one.** `styles.css` only hides a `.reveal`
while `html.js-motion` is set, and `site.js` adds that class itself, then drops
it again if the observer has not delivered a callback within 2s. A page whose
script never loads, or whose browser lacks `IntersectionObserver`, shows
everything. Never write a rule that leaves content hidden unless something else
runs — that is the one way this system can fail a reader.

The failsafe deliberately does *not* force every block visible on a timer: that
would also fire on a healthy browser and reveal the whole page before the reader
reached it. It only lifts the hiding rule when the observer proves dead.

**Reveal vocabulary.** `.reveal` fades and rises a block; add `.stagger` and its
direct children arrive in sequence (`site.js` numbers them into `--i`, the CSS
turns that into a delay). `.reveal.shown` in the markup means "animate from
visible" — used on mastheads so the top of a page never flashes empty.
`.unfurl` animates a headline open along Archivo's width axis; its spans are
each one line, and it uses `backwards` fill so the resting state is visible.

## Voice

Plain and first-person, and no broader than the facts. Carlo is a software
developer with more than a decade of experience, currently a Full Stack
Software Developer at TeamSystem; the projects here are his own time. Earlier
drafts of this site opened with "Whole products, not demos" and a donate page
arguing about the ethics of paywalls, and both were asked to be toned down.
Describe what a thing is and let the reader decide whether it is impressive.

Never invent biography. LinkedIn (HTTP 999) and Instagram (login wall) cannot
be read programmatically, so anything personal on the About page came from
Carlo directly and the next fact should too.

## The design system

Two typefaces, both from Google Fonts: **Archivo** (variable, loaded with its
`wdth` axis) and **IBM Plex Mono**. Headlines are set expanded — `font-variation-
settings: "wdth" 125` — which is the site's main typographic move; body text sits
at 100. Mono is reserved for text that is literally machine text: image tags, env
vars, paths, commands, and the values in `.spec` tables. It is never used for
labels or decoration.

The page ground is a mid-tone "concrete" (`--ground`), with glass panes for
grouped content. The only saturated colour on the site is each product's
`--accent`, taken from its logo mark.

Deliberately absent, and worth not reintroducing: gradient-filled words in
headings, chips, identical rounded cards, `·`-joined meta strings, and `→`
appended to button text.

## The things that are coupled

**Accent colours live in two places per project.** `index.html` declares all four
in `:root` (`--cloudbank`, `--planora`, `--nutreek`, `--cupid`), each with a
lighter dark-mode value; the project's own page declares the same pair as
`--accent`. Change one, change the other, or the index row and its page drift
apart. Light-mode accents are chosen to clear 4.5:1 against white, because
`.action.key` and every `.action:hover` put `--on-accent` text on the accent.

**`--accent` is a registered `@property` of type `<color>`**, which is what lets
it transition instead of snapping as the reader moves between products. A
registered colour property will **not** accept a `var()` reference set from
JavaScript — `style.setProperty("--accent", "var(--nutreek)")` silently does
nothing. That is why `site.js` reads each section's resolved colour back out of
the cascade (`getComputedStyle(el).getPropertyValue("--accent")`) instead of
repeating hex values in the markup: a section opts in with a bare `data-accent`
attribute and keeps declaring its colour in CSS, so light and dark keep working
from one set of values.

**The home page describes each product twice over.** An index row (name, one
line, status) and a fuller `.product` section below it. A release or a status
change usually touches the row, the section, and the detail page.

**`.masthead .state` is the status line.** One sentence, in the same words as the
matching index row's `.state` — "Shipping, v3.0", "In internal testing",
"Available to license". The index row also carries `.state.pending`, which draws
the marker as an outline instead of a fill for things that aren't out yet, and
`.state.live`, which adds a slow ring to the one product that is actually out.

**Contact is home-page-only and mailto-based.** The `<dialog id="contact">` and
its form exist only in `index.html`; the address comes from `window.CONTACT_EMAIL`,
set in a `<script>` in the head, and submitting just builds a `mailto:` URL.
Nothing is posted anywhere — there is no backend, and adding one would be a real
architectural change, not a tweak. Detail pages use plain `mailto:` links instead.

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
on marks that repeat adjacent text, `aria-label` on the index and the reels, a
visible focus ring on every interactive element, and contrast held at 4.5:1 or
better in both schemes. Keep it when editing.

External links carry `rel="noopener"`.

Commit messages are short imperative sentences describing the user-visible change,
e.g. "Update CloudBank to v3.0.0 on the card and detail page".

## Agent skills

### Issue tracker

GitHub Issues on `easly1989/easly1989.github.io`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
