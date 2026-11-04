# The professional pages

One page per project, `pro/<id>.html`, in the professional home's style (`../pro.css`). The
professional home (`../index.html`, when the reader has not chosen the room) has one row per
project, and each row leads here. These pages never link to the playful project pages.

**Every page here is generated.** `python tools/sync.py` writes each one whole from
`data/projects/<id>.json`; do not edit them by hand, since the next run puts them back.
`python tools/sync.py --check` (and `checks/data.py`) fails when a page differs from its data, is
missing, or has no data file.

A page has, in order:

- `<title>`, the description and Open Graph tags (`name`, `tagline`, `description`, `summary`);
- "All projects", back to the home;
- the head: the mark, the status line (its square in the project's accent), the name, the lede,
  and the buttons: the label sheet's links of kind `demo`, `release`, `repo`, `docs`, `spec` or
  `contact`, the primary one filled with the accent; a family's links to its members' sections;
- "What it is": `description`;
- "At a glance": `stack`, then `facts` (an optional list of `{label, value}`, each a fact its
  playful page already states), then the licence, unless it is null, empty or "None"; left out
  when there is none of them;
- the curated `screenshots`, each opening full size in the lightbox (`../site.js`);
- for a family (ASF Plugins), a section per member, `#<member id>`, with its own head and
  screenshots.

A section the data has nothing for is left out rather than written by hand. The accent is read
from `:root` in `styles.css`, where the accents live, and written into the page as `--c`.

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
the still drawing; without scripts too. `checks/peek.py` checks all of it.
