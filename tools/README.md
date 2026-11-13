# Tools

`sync.py` writes each project's facts from `data/projects/<id>.json` into the pages, and the
professional About, Donate and Archive from `data/pages/`. Python 3,
standard library only. Nothing runs at deploy: the pages it writes are committed, so the site
stays plain static HTML that reads in full with scripts off.

```bash
python tools/sync.py           # after editing data/projects/: rewrite every generated block
python tools/sync.py --check   # write nothing; exit 1 listing every block that differs
python tools/sync.py --versions  # first move each fallback version to what GitHub publishes
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

**About and Donate.** `data/pages/<name>.json` is the professional `pro/<name>.html`, written
whole the same way: `about`, `donate` and `archive` (the public projects I no longer maintain: a
section of `contacts`, each a repository's name, address and one line; the playful `archive.html`
lists the same by hand, and `checks/data.py` compares them). Each has `title`, `description` and `summary` (the
title, the description and `og:` tags), `status`, `name` and `lede` for its head, an optional
`photo` (`file`, `width`, `height`, `alt`) and `links` (`label`, `href`, `primary`: its buttons,
only ever out of the site), and `sections`, each with an `id`, a `heading`, any `text` (its
paragraphs) and then what it lists: `items` (`label`, `text`), `terms` (`label`, `text`), `facts`
(`label`, `value`), `contacts` (`label`, `href`, `text`), `projects` (project ids, each written
from that project's `mark`, `name`, `about` and accent and leading to its professional page) or
`services` (`id`, `name`, `text`, `href`, `address`, `icon`: the paths of its 24×24 icon, drawn in
this repo) with a `note`. A paragraph, an item's or a term's `text` and a `note` hold markup, with
`<strong>` too, and a link in it goes out of the site with `rel="noopener"`; every other string is
plain text. The nav row at the top of every professional page and the footer are written by
`bar()` and `foot()`.

**Text.** `status`, `status_short`, `lede` and `about` hold markup, and only `<code>`, `<b>`,
`<em>` and `<a>`. Every other string is plain text, with no tags and no entities: write `&`,
not `&amp;`, and the generator escapes it wherever it writes it. In `status`, `status_short`,
`lede`, `about`, `description`, `summary`, `home.line` and `home.aria`, `{name}`, `{version}`
and `{licence}` are the project's own, and `{release}` is the stage and the version, "Shipping,
1.1.2.0" or, with `"prerelease": true`, "Pre-release, 1.0.0.0"; with `version_live` (CloudBank),
`{version}` in markup becomes `<span data-cloudbank="stable">` around it, which `site.js` fills
from `versions.json`.

**Versions from GitHub.** `release` says where GitHub publishes a project's version:
`{"repo": "owner/name"}`, its newest release, or with `"file": "path.json"` the `version` field of
that file on the default branch, for a repo that publishes no releases. In markup, `{release}`
becomes `<span data-release="<source>">` and `{version}` `<span data-version="<source>">`
(unless `version_live` says CloudBank's), and `site.js` fills them from GitHub, the stage too,
once a visit per source; `version` and `prerelease` are the fallback the page is written with.
`--versions` moves them to what GitHub publishes (anonymous: a request per source of the API's 60
an hour), editing only those values in the data files, and then writes the pages; if any source
cannot be read, or a value is not written as `"key": value` after its id, it writes nothing and
exits 2. With `--check` it is refused (exit 2), since `--check` writes nothing. It leaves the
hand copies outside the markers alone: CloudBank's Run it table, whose version `checks/data.py`
holds to the data and whose publish date nothing checks. A project
with a `release` has one link of kind `changelog`, which its professional page always carries.

**Links.** A link's `kind` (demo, release, repo, docs, changelog, spec, donate, contact, nav, credit) says
what it is to a page that picks links. Those with `"label_sheet": false` are not on the label
sheet but elsewhere on the page, which must still carry them.

**Read by the professional pages too.** `screenshots` is the curated set for them,
not the playful pages' taped prints: each is also shown on its project's page, with the same
alt text, size and caption, unless it is `"pro_only": true`. `stack` is shown on a page only by
Nutreek, Planora and Cupid; for the others only the professional pages show it.

`checks/data.py` runs `--check`, validates every data file, requires every block each page is
meant to have, and compares with the data the facts still written by hand on the pages (see
`docs/data.md`).
