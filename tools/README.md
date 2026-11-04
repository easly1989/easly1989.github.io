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

In text, `{name}` is the project's name and `{version}` its `version`; with `version_live`
(CloudBank), `{version}` becomes `<span data-cloudbank="stable">` around it, which `site.js`
fills from `versions.json`. Text may carry `<code>`, `<b>`, `<em>` and `<a>`; `description`,
`summary` and `home.aria` are plain text. A link's `kind` (demo, release, repo, docs, spec,
donate, contact, nav) says what it is to a page that picks links, and `screenshots` is the
curated set for the professional pages, not the playful pages' taped prints.

`checks/data.py` runs `--check`, validates every data file and checks that a screenshot in the
data has the same alt text and size on every page that shows it.
