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
