# The playful pages: label sheets, books, morphs, family pages

## Label sheets and screenshots

Every playful page opens with a label sheet (`.paper.label-sheet`): the status line (`.state`),
the name, one lede and the actions. Below it, each page is its object opened up: CloudBank the
ledger, Nutreek the agenda (open on this week, today's page marked), Social Contacts Sync a grid
of contact cards, Planora the vote card, the lifecycle on a string and the idea jar, Cupid the
letter out of its envelope, About the photo developing, Donate the spilled coffee and the sugar
packets. Screenshots are taped prints, `<figure class="shot">` with a `<figcaption>`; `site.js`
wraps each `.shot img` in a `<button class="zoom">` that opens the shared lightbox. Every
screenshot carries its real `width` and `height` and `loading="lazy"`.

## Books

`.book` is a book you can leaf through: `.leaf` elements, each with a
`.page.front` and a `.page.back`, turned in 3D. `site.js` builds a corner to
turn on every page, wires the side tabs (`.tabs [data-go="<spread>"]`), the
previous and next buttons and the arrow keys, and makes every page that is not
showing `inert`. A book arrives closed and opens; `data-open-to` makes it go on
to a spread, which is how the Nutreek agenda opens on today. Under 900px a book
is simply its pages in a column, all of them readable.

A page has a fixed height. Adding content to one means checking it still fits,
with its images loaded, at 1280, 1100 and 960 wide.

## Between pages

The browser morphs one page into the next (`@view-transition { navigation: auto; }` in
`styles.css`): the mat and the header stay, the object picked up becomes its page's counterpart,
and the rest cross-fades. Where cross-document view transitions are not supported (Firefox,
today) the pages simply load, and nothing else depends on them. Under reduced motion there are
none. The professional pages have no morphs.

The pairs are made by `view-transition-name`, one per page and unique on it; in the room
`morph.js` names the object only for the trip (its PAIRS):

| Room | Page | Name |
|---|---|---|
| `#ledger` | `cloudbank.html` `#ledger` (the book) | `cloudbank` |
| `#agenda` | `nutreek.html` `#agenda` (the book) | `nutreek` |
| `.thing.cards` | `social-contacts-sync.html` `.label-sheet` | `scs` |
| `.jar .jar-idea` | `planora.html` `.label-sheet` | `planora` |
| `.thing.envelope` | `cupid.html` `.env` | `cupid` |
| `.thing.pager` | `asf-plugins.html` `.label-sheet` | `asf` |
| `.thing.plush` | `coordinator-monitor.html` `.label-sheet` | `crab` |
| `.mug .cup`, the coffee | `donate.html` `.spill .cup`, `.spill .puddle` | `mug`, `puddle` |
| `.camera .film` | `about.html` `.instant` | `photo` |
| `.pc .glass` | `terminal.html` `.crt` | `crt` |

`header.bar` is named `bar` on every playful page. A duplicate name cancels the transition
silently, so a new name needs a check on both pages (`checks/moves.py`).

## A family page

`asf-plugins.html` is the page for several pieces of one platform: a label sheet for the family,
then one kraft folder (`.fam-folder[data-tabs]`) with a tab per piece. Another family page
copies its structure, and its facts go in a data file with one entry per piece under `members`,
with the markers of `asf-plugins.html` (each sheet's `state`, `name`, `lede` and `actions`,
each tab's `tab`).

- `.fam-tabs` holds one `a.fam-tab` per piece, `href="#<sheet id>"`, `style="--c: <accent>"`,
  with `<b>` the name and `<small>` the status. Each sheet is `section.fam-sheet#<id>` with
  `aria-labelledby` on its `h2`, `header.fam-head` (mark, `.state`, name, `.lede`, `.actions`),
  then its own blocks (a feed, a taped screenshot) and `.fam-grid` of `article.fam-card` (`h3`).
  The sheet's own `--c` colours its buttons. `.fam-card.fam-shared` is the card above the folder.
- `site.js` makes `[data-tabs]` a real tablist: roving tabindex, arrows, Home and End, `hidden`
  on inactive sheets, `replaceState` when a tab is chosen. A hash that names an element inside a
  sheet (`#events`) opens that sheet and scrolls to it, smoothly unless reduced motion. Without
  the script every sheet shows, stacked, and the tabs are links.
- The new product accent goes into `:root` (6:1 against white). A new family page also needs its
  pager-like object in the room, its `morph.js` entry and its `checks/moves.py` row.
