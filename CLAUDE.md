# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Carlo Ruggiero's personal project site, served by GitHub Pages from the root of
`main` at https://easly1989.github.io. There is no build step, no package manager,
no test suite and no CI — the `.html`, `.css` and `.svg` files in the repo root are
exactly what ships. A push to `main` is a deploy.

## Working on it

Preview locally with any static server from the repo root, e.g.:

```bash
python -m http.server 8000
```

Opening a file directly with `file://` mostly works, but the root-relative asset
paths and `<dialog>` behaviour are easier to trust over HTTP.

Verification is manual: load the affected page, check both colour schemes
(`prefers-color-scheme` light and dark are both styled), check narrow widths, and
on the home page check the carousel with `prefers-reduced-motion: reduce` as well
(it disables auto-rotation and smooth scrolling).

## Structure

- `index.html` — the home page. Self-contained: its own inline `<style>` and two
  inline IIFEs (carousel, contact dialog). It does **not** use `styles.css`.
- `styles.css` — the shared design system for every *other* page.
- `about.html`, `cloudbank.html`, `cupid.html`, `nutreek.html`, `planora.html` —
  content pages. Each links `styles.css`, then overrides `--accent`, `--accent-2`
  and `--accent-ink` in a small inline `<style>` to theme itself. They carry no
  JavaScript at all.
- `logo.svg` (CloudBank + site favicon), `cupid.svg`, `nutreek.svg`, `planora.svg`
  — project icons. `assets/` holds screenshots used by the detail pages.

## The things that are coupled

**Accent colours live in two places per project.** The home page holds a `THEMES`
array in its carousel IIFE (one entry per slide, in slide order) that swaps the
accent custom properties as the carousel moves; the project's own detail page
declares the same three values in its inline `:root`. Change one, change the other
or the card and its page drift apart.

The accents are registered with `@property ... syntax: "<color>"` on the home page
specifically so they can animate between projects — plain custom properties would
snap instead of fading.

**The carousel is index-based and hand-counted.** Slide order, the `.dot` buttons
after the track, and the `aria-label="… — N of 4"` on each `<article class="card">`
are all maintained by hand. Adding or reordering a project means updating the card
markup, the dots, every `N of 4` label, and the `THEMES` entry — in matching order.

**Card and detail page describe the same thing twice.** Each carousel card repeats
the project's description, chips/badges and version; the detail page states them
again at length. Product changes (a new version, a new feature) usually need both.

**Contact is home-page-only and mailto-based.** The `<dialog id="contact">` and its
form exist only in `index.html`; the address comes from `window.CONTACT_EMAIL`, set
in a `<script>` in the head, and submitting just builds a `mailto:` URL. Nothing is
posted anywhere — there is no backend, and adding one would be a real architectural
change, not a tweak. Detail pages link back to the home page instead of carrying
their own dialog.

## Conventions

Markup is Prettier-formatted-looking: two-space indent, ~100 column wrap, double
quotes, self-closing void elements. Match it by hand; no formatter is configured.

Accessibility is deliberate throughout (`aria-roledescription`, `aria-current` on
the active dot, `aria-hidden` on decorative blobs and icons, keyboard arrow-key
navigation on the track). Keep it when editing.

External links carry `rel="noopener"`.

Commit messages are short imperative sentences describing the user-visible change,
e.g. "Update CloudBank to v3.0.0 on the card and detail page".

## Agent skills

### Issue tracker

GitHub Issues on `easly1989/easly1989.github.io`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
