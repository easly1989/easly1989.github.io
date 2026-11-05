# Voice, Donate and attribution, the CloudBank demo

## Voice

Plain and first-person, and no broader than the facts. Carlo is a software
developer with more than a decade of experience, currently a Full Stack
Software Developer at TeamSystem; the projects here are his own time. Earlier
drafts of this site opened with "Whole products, not demos" and a donate page
arguing about the ethics of paywalls, and both were asked to be toned down.
Describe what a thing is and let the reader decide whether it is impressive.
The room and the playful pages are allowed to be playful, but the words about
the work stay factual, and the professional home is plain throughout.

Never invent biography. LinkedIn (HTTP 999) and Instagram (login wall) cannot
be read programmatically, so anything personal on the About page came from
Carlo directly and the next fact should too. The professional About says nothing of him that
the playful About does not (`checks/data.py`); its photo is a different one,
`assets/photos/crossed-arms-400.jpg` (a 400px copy of `crossed-arms.jpg`), Carlo's choice.

## Money and attribution

`donate.html` is the site's own page, and donation links point at it rather than
at any product's own donate page — sending people from this site to a product's
donate page reads as though the site were asking on that product's behalf.

**The page names no projects at all, on purpose.** It is about supporting the
work in general: the time to finish and maintain things, releasing more of them
openly, and hosting for the apps and demos. An earlier draft argued the case
project by project — CloudBank is free, Planora is hosted at my expense, Nutreek
and Cupid are licensed — and it read as a pitch aimed at specific software.
Keep it general and keep it polite. In particular, do not describe the closed
projects as permanently closed: opening more of them up later is something Carlo
would like to do, and the page says so.

**The packets come first and then stay put.** The page exists to be donated
through, so the four services sit right under the label as sugar packets on a
tray (`.tray`), pinned to the top of the window for the whole page. On a phone,
under 52rem, the tray is fixed to the bottom instead, with `padding-bottom` on
the mat so the end of the page is never trapped under it. `scroll-padding` on
`html` keeps anything that takes focus clear of the tray (WCAG 2.4.11).

Each packet carries its service's own colour, taken from the service itself
rather than from memory: Buy Me a Coffee `#FFDD00` on `#0D0C22`, GitHub Sponsors
`#BF3989` light and `#DB61A2` dark (Primer's `--fgColor-sponsors`), PayPal
`#003087` light and `#0070E0` dark, Liberapay `#F6C915`. All four clear 4.5:1 in
both schemes. The icons are **drawn in this repo**, not lifted from anyone's
site: each says what kind of giving it is — a cup, a heart, a card, a recurring
arrow — so no third-party trademark artwork is redistributed here. If official
brand buttons are ever wanted instead, they should be downloaded from each
service's own brand page and committed to `assets/`.

Each packet hands the reader to that service. No payment details are ever
collected here, and there is no backend that could receive them — which is what
the till receipt on the page says, "Charged here 0.00".

`pro/donate.html`, the professional Donate, keeps every rule above: it names no project
(`checks/data.py` fails if it does), the services carry the same colours, in `pro.css`, and the
same icons, from `data/pages/donate.json`, each a plain bordered link that hands the reader to its
service, and nothing on it is a form.

The HomeBank attribution belongs on `cloudbank.html`, where it is a factual note
about that product's origins. It is deliberately **not** on the home page, where
it read as a disclaimer about the whole site.

## The CloudBank demo

`cloudbank.html#demo` links the demo instance. Since CloudBank's `:demo`
build, the demo has no shared sign-in: one button makes a throwaway account of
the visitor's own, deleted after two hours without use, every night and on every
update. The page says so next to the link, and points at CloudBank's
`docs/demo.md` for the rest — keep the two saying the same thing. No credentials
belong in this repo at all.
