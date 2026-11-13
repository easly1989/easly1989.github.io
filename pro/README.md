# The professional pages

One page per project, `pro/<id>.html`, in the professional home's style (`../pro.css`). The
professional home (`../index.html`, when the reader has not chosen the room) has one row per
project, and each row leads here. Beside them are the professional About, Donate and Archive,
`about.html`, `donate.html` and `archive.html` (the public projects I no longer maintain, reached
from a row on the home and from every footer). These pages never link to the playful pages.

**Every page here is generated.** `python tools/sync.py` writes each one whole from
`data/projects/<id>.json`; do not edit them by hand, since the next run puts them back.
`python tools/sync.py --check` (and `checks/data.py`) fails when a page differs from its data, is
missing, or has no data file. About and Donate are written from `data/pages/about.json` and
`data/pages/donate.json` (see `tools/README.md`).

Every page here, and the professional home, opens with a quiet nav row at the top right: Projects,
About, Donate, the current page marked `aria-current="page"` (none on a project's page), with "All
projects" at its left here. The footer is the name and About, Donate and GitHub, and, on a line
of its own, the "Animate anyway" button (`docs/motion.md`): `MOTION` in `tools/sync.py`, the
same by hand in the home's footer, hidden until `site.js` shows it where the browser asks for
less motion or the reader chose. It looks like the footer's links. Every link is 44px
tall at least, except a link inside running text (Donate's "GitHub" in a sentence), which WCAG
2.5.8 lets be the line's height.

A page has, in order:

- `<title>`, the description and Open Graph tags (`name`, `tagline`, `description`, `summary`);
- "All projects", back to the home, and the nav row;
- the head: the mark, the status line (its square in the project's accent), the name, the lede,
  and the buttons: the label sheet's links of kind `demo`, `release`, `repo`, `docs`, `spec` or
  `contact`, and the `changelog` link always, on the label sheet or not, the primary one
  filled with the accent; a family's links to its members' sections;
- "What it is": `description`;
- "At a glance": `stack`, then `facts` (an optional list of `{label, value}`, each a fact its
  playful page already states), then the licence, unless it is null, empty or "None"; left out
  when there is none of them;
- the curated `screenshots`, each opening full size in the lightbox (`../site.js`);
- for a family (ASF Plugins), a section per member, `#<member id>`, with its own head and
  screenshots.

A section the data has nothing for is left out rather than written by hand. The accent is read
from `:root` in `styles.css`, where the accents live, and written into the page as `--c`.

## About and Donate

Pages about the person, in the same frame, with the ink as their accent (`.pg`). About has the
photo (`assets/photos/crossed-arms-400.jpg`, a 400px copy of `crossed-arms.jpg`, a different one from the playful About's), the status line,
the name, the lede and the buttons, then What I do, How I build, What I've built (a row per
project, from its `about`, leading to its professional page) and Get in touch. Everything it says
of the person is on the playful About, which `checks/data.py` holds it to: never invent biography.

Donate keeps the playful Donate's rules (`docs/content.md`, Money and attribution): it names no
project, closed projects are never called closed for good, and each of the four services is a
plain bordered link with its own colour and the icon drawn in this repo, handing the reader to
that service. Nothing is collected here, and there is no form.

## Willy on the home

The professional home's one playful thing is Willy peeking over the top rule of the project list,
next to "Step into the room", on a window that can hold the room and has a mouse or a
trackpad (`html.room-fits`). He is an
inline SVG in `../index.html`, the same in both schemes, and the home's own inline script (never
`site.js`, never anything of the room) moves him:

- his pupils (`.w-pupil`, clipped to his eyes) and his head (`.w-head`) follow a mouse, eased, a
  few px and degrees, from `pointermove` with `pointerType` "mouse", drawn once a frame and only
  until they have caught up. Nothing is measured while the mouse moves: his place is read again on
  a resize and once the fonts are in;
- a mouse that comes within a face and a half of his face, or onto the link, gets one swat of the
  paw on its side (`.w-paw`, 400 ms), then none for 5 s and none until it has gone away again,
  and three at most for the page; the keyboard focus on the link gets the same swat, towards it;
- the paws take no pointer and stay inside the drawing, so the link is never covered, moved or
  shrunk.

Under reduced motion, for touch and a pen, and wherever he is not shown, nothing listens and he is
the still drawing; without scripts too. `checks/peek.py` checks all of it. A reader whose browser
asks for less motion can choose to animate anyway with the footer's button: he then follows and
swats at once, without a reload, and stops again at once when the choice is undone
(`checks/motion.py`).
