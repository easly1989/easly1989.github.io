# Changelog

What changed on easly1989.github.io, newest first. The site has no build: a push to `main` is
a deploy, and a release is a tag on the `main` that was live at that moment.

## Unreleased

- **Animate anyway:** a reader whose browser asks for reduced motion can choose to animate
  anyway, from a button in the footer of the professional pages. The choice is remembered, and
  Willy follows the pointer and the room moves; nothing changes for a reader who does not
  choose.
- **Willy no longer flips over** as he turns or lies down on a book, the ledger, the agenda or
  the pager. A new check watches his body for sudden turns.
- The repository's `CLAUDE.md` is cut to its rules, and the reference moved to `docs/`.

## 1.0.0 — 2026-11-04

The first release.

### Professional home

- The home is now a plain, static professional page on every device: the name, one card per
  project, About and the contacts.
- Every project has its own professional page (`pro/<id>.html`), and so do About and Donate.
  They never link to the playful pages.
- Every fact about a project lives in one file, `data/projects/<id>.json`, and
  `tools/sync.py` writes it into the pages, so the pages cannot drift apart.
- Each product's version and changelog link come from GitHub where its repository is public;
  the value in the data file is the fallback.

### The room

- The isometric room is a choice: a way in on windows that can hold it (Willy peeking in, and
  "Step into the room"), remembered for the next visit. Phones never get the room.
- The way back is the tie on the office chair, which sways when it is pointed at, and a skip
  link, "Plain version of this site".
- Willy, a 3D cat, lives in the room. The 2D cat of the old bench is gone.
- The room is lit by a real light pass: its lamp, the window (with Pesaro's real sky and
  weather), the computer, the radio and its projector, the neon sign and the pager.
- The bench's objects play their opening moves in 3D, and a radio plays across pages.

### Projects

- ASF Plugins: one page for ASF-Notifier and ASF-PluginConfig, as two tabs of one folder.
- coordinator-monitor: a project page, and an orange felt crab on the wall of the room.
- Nutreek, CloudBank and the other pages follow their products' latest releases.
