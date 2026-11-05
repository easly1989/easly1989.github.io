# Data, versions and the things that are coupled

**The product accents live once**, in `:root` in `styles.css` (`--cloudbank`, `--scs`,
`--planora`, `--nutreek`, `--cupid`, `--asf`, `--asf-pc`, `--coordinator-monitor`); a page or a
button takes one as `--c`, and `tools/sync.py` writes them into the professional pages. Light
accents clear 4.5:1 against white, because a button puts white text on `--c`.

**A project's facts live in its data file**, `data/projects/<id>.json`: its name, status line,
version, lede, the room object's short line and `aria-label`, About's line, the page's title and
descriptions, licence, stack, the professional page's `facts`, links and a curated set of
screenshots. `tools/sync.py` writes them into the pages between `<!-- data:<id>.<block> -->` and
`<!-- /data -->` (the label sheets, each `.fam-head` and `.fam-tab`, the room object's label,
the contact sheet's option, About's list, the professional home's rows, every `<title>` and
meta) and writes `pro/<id>.html` whole, and `pro/about.html` and `pro/donate.html` from
`data/pages/`. Never edit inside those markers or in `pro/`: a release
or a status change is an edit to the data file and a run of `python tools/sync.py`, done by the
session, never by Carlo, and `checks/data.py` fails while a page differs. The playful scenery,
the long sections and their screenshots stay in each page's markup.

Some facts are still written by hand on the playful pages, and `checks/data.py` compares each
with the data: the licence as the page's prose names it, the stack tables of Nutreek, Planora
and Cupid, a data screenshot's alt, size and caption wherever it is shown (on its project's page
unless it is `pro_only`), CloudBank's fallback version in the ledger's Run it table, and the
links beyond the label sheet, which the page must still carry. The room's label round Planora's
jar is read by `room.js` from the bench's label, so it follows the data.

Adding a project: write `data/projects/<id>.json` (copy one, then run `python checks/data.py`,
which names every missing field); put the markers on its page (`title` and `og` in the head, and
`state`, `name`, `lede` and `actions` in its label sheet, empty: the generator fills them); add
its room object in `index.html` with its `aria` and `object` markers, its contact option
(`<option><!-- data:<id>.name --><!-- /data --></option>`), its entry in About's list (`about`)
and its professional row (`<!-- data:<id>.pro-row --><!-- /data -->` in the home's list); then
run `python tools/sync.py` and `python checks/data.py`. Its morph is a pair as well
(`docs/pages.md`).

**`.label-sheet .state` is the status line.** One sentence, "Shipping, v3.8.1. Open source under
AGPL-3.0.", "In internal testing. Free, and hosted for you.", "Available to license." It is
`status` in the data file.

**CloudBank's version is not written by hand.** Every mention is a `<span data-cloudbank="stable">`
(or `"nightly"`, or `data-cloudbank-date`), and `site.js` fills it from `versions.json` on
CloudBank's `site-data` branch, which CloudBank's release and nightly workflows rewrite when they
publish. The text in the markup is only the fallback shown if that fetch fails: `version` in
`data/projects/cloudbank.json`; the span in the ledger's Run it table is a hand copy, which
`checks/data.py` holds to the same version.

**The other versions come from GitHub too.** A product whose repo is public has `release` in its
data file, and its status line says `{release}`: the page is written with the fallback, "Shipping,
1.1.2.0" (or "Pre-release, …" with `prerelease`), and `site.js` replaces it with the newest
release on GitHub, pre-release flag included, once a visit per repo (anonymous API: 60 requests
an hour). coordinator-monitor publishes no releases, so its source is the `version` in its
`.claude-plugin/plugin.json`. After a release, `python tools/sync.py --versions` moves `version`
and `prerelease` in every data file with a `release` (CloudBank's `version` too) to what GitHub
publishes, and writes the pages from them. It does not touch the hand copies outside the
markers: in CloudBank's Run it table `checks/data.py` holds the version to the data, but the
publish date beside it is moved by hand and not checked. Planora and Cupid are private, so no
visitor can read theirs. Each such product links its changelog (a link of kind `changelog`).

**A morph is a pair.** Renaming or removing a room object, or the element its page shows first,
breaks its page transition: see the table in `docs/pages.md`.

**Contact is mailto-based.** The Write to me sheet in the room is a form in
`<template id="sheet-contact">`; its inline script builds a `mailto:` URL to
`window.CONTACT_EMAIL`, set in a `<script>` in the head. Nothing is posted anywhere: there is no
backend, and adding one would be a real architectural change, not a tweak. Other pages, the
professional ones too, use plain `mailto:` links.

**The nav is repeated in every playful page.** Projects, About, Donate, GitHub, plus
`aria-current="page"` on the current one. Adding a page means touching all of them; there is no
include mechanism and that is the accepted cost. The professional pages' nav is `bar()` in
`tools/sync.py`, and the professional home's is in `index.html`.
