# Tools

`sync.py` writes each project's facts from `data/projects/<id>.json` into the pages. Python 3,
standard library only. Nothing runs at deploy: the pages it writes are committed, so the site
stays plain static HTML that reads in full with scripts off.

```bash
python tools/sync.py           # after editing data/projects/: rewrite every generated block
python tools/sync.py --check   # write nothing; exit 1 listing every block that differs
```

A generated block sits between `<!-- data:<id>.<block> -->` and `<!-- /data -->` in a page at
the repo root; everything outside the markers is left byte for byte, and a second run changes
nothing. A block whose opening marker ends its line is written as lines at that marker's
indent, wrapped at 100 columns; one that goes on along the line stays on it. `<id>` is a data
file's name, or a family member's `id`.

Both modes stop with exit code 2, write nothing and name the page, the line and the block when
a marker does not pair (an opening marker with no closing one, a closing one with none open, a
block inside a block), a marker is malformed or names no known block or id, a page has CR line
endings (the pages are LF, see `.gitattributes`), or the data does not load (a member without
an `id`, an `id` used twice, a `version` that is not a string, a placeholder with no value).

| Block | What it writes |
|---|---|
| `title` | `<title>` and the description meta: `name`, `tagline`, `description` |
| `og` | `og:title` and `og:description`: `name`, `tagline`, `summary` |
| `state` | the status line's text: `status` |
| `name` | the name, in the page's heading or the contact sheet's option |
| `lede` | the lede's text: `lede` |
| `actions` | the label sheet's buttons: `links`, but for those with `"label_sheet": false` |
| `tab` | a family tab's name and `status_short` |
| `object` | the home object's `.label`: `home.label` (else `name`) and `home.line` in its `<small>` |
| `object-apart` | the same, with the `<small>` after the label rather than in it |
| `aria` | keeps the home object's start tag and sets only its `aria-label`: `home.aria` |
| `about` | About's entry: `mark`, `name` and `about` |
| `pro-row` | the professional home's row: `mark`, `name`, `status`, `lede`, the accent; to `pro/<id>.html` |

**The professional pages.** Each project with a data file of its own also gets `pro/<id>.html`,
written whole (see `pro/README.md`); `--check` names one that differs or is missing, and a page
in `pro/` with no data file is an error. Text that goes inside a link there (a row's `status` and
`lede`) may not hold an `<a>`.

**Text.** `status`, `status_short`, `lede` and `about` hold markup, and only `<code>`, `<b>`,
`<em>` and `<a>`. Every other string is plain text, with no tags and no entities: write `&`,
not `&amp;`, and the generator escapes it wherever it writes it. In `status`, `status_short`,
`lede`, `about`, `description`, `summary`, `home.line` and `home.aria`, `{name}`, `{version}`
and `{licence}` are the project's own; with `version_live` (CloudBank), `{version}` in markup
becomes `<span data-cloudbank="stable">` around it, which `site.js` fills from `versions.json`.

**Links.** A link's `kind` (demo, release, repo, docs, spec, donate, contact, nav, credit) says
what it is to a page that picks links. Those with `"label_sheet": false` are not on the label
sheet but elsewhere on the page, which must still carry them.

**Read by the professional pages too.** `screenshots` is the curated set for them,
not the playful pages' taped prints: each is also shown on its project's page, with the same
alt text, size and caption, unless it is `"pro_only": true`. `stack` is shown on a page only by
Nutreek, Planora and Cupid; for the others only the professional pages show it.

`checks/data.py` runs `--check`, validates every data file, requires every block each page is
meant to have, and compares with the data the facts still written by hand on the pages (see
"The things that are coupled" in `CLAUDE.md`).
