# The design system and conventions

## Typefaces and colours

Three typefaces, from Google Fonts: **Bricolage Grotesque** for names and headings, **Atkinson
Hyperlegible** for reading, and **IBM Plex Mono** only for text that is literally machine text:
image tags, paths, commands, the values in spec tables and under "At a glance".

The professional home and pages (`pro.css`): a cool off-white ground (dark green-black in the
dark scheme) and one ink; the name is the only loud thing. Projects are ruled rows, not cards; a
project's accent shows only as its status line's square and its page's buttons.

The playful side: the ground is the mat, a green cutting mat with a 1 cm grid (`--mat`, darker
in the dark scheme). On it everything is a physical thing: paper (`--paper`, light in both
schemes, so text on paper is dark in both), tape, taped prints, index cards, sticky notes. The
only saturated colours are each product's accent, taken from its logo mark, and the donation
services' own colours.

Deliberately absent, and worth not reintroducing: gradient-filled words in headings, chips,
identical rounded cards, `·`-joined meta strings, and `→` appended to button text.

## Conventions

Markup is Prettier-formatted-looking: two-space indent, ~100 column wrap, double
quotes, self-closing void elements. Match it by hand; no formatter is configured.

Files are LF. Writing them from Python needs `newline="\n"`, or Windows turns
every line ending into CRLF and the whole file shows as changed.

Accessibility is deliberate throughout: `aria-current="page"` in the nav, `alt=""`
on marks that repeat adjacent text, a skip link first on both homes, a label on every
control, every page that is not showing `inert`, a visible focus ring on every
interactive element, targets of 44 px or more, and contrast held at 4.5:1 or better in
both schemes. Keep it when editing.

External links carry `rel="noopener"`.
