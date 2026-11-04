"""Write each project's facts from data/projects/*.json into the pages.

Run from anywhere, after editing data/projects/:

    python tools/sync.py           rewrite every generated block
    python tools/sync.py --check   write nothing; exit 1 listing every block that differs

A generated block is the text between `<!-- data:<id>.<block> -->` and `<!-- /data -->`
in a page at the repo root. Everything outside those markers is left byte for byte. A block
whose opening marker ends its line is written as lines at that marker's indent; one that
goes on along the line is written on that line. Each project's professional page,
pro/<id>.html, is written whole from its data file. A marker that does not pair into a known
block, a page with CR line endings, a data file that does not load, or a page in pro/ with no
data file is an error: nothing is written and the exit code is 2. See tools/README.md.
"""

import functools
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "projects"
PRO = ROOT / "pro"
TOP = []  # the projects with a data file of their own, in file order: one professional page each
WIDTH = 100  # the markup's wrap column
SITE = "Carlo Ruggiero"
# anything that looks like a marker, so a mistyped one is caught rather than skipped
LOOSE = re.compile(r"<!--\s*(?:/\s*data\b|data\s*:)[^>]*-->")
OPEN = re.compile(r"<!-- data:([a-z0-9-]+)\.([a-z-]+) -->")
CLOSE = "<!-- /data -->"
PLACEHOLDER = re.compile(r"\{(name|version|licence)\}")


class Problem(Exception):
    pass


def load():
    """Every project, and every member of a family, by id."""
    out = {}
    TOP.clear()
    for path in sorted(DATA.glob("*.json")):
        try:
            out[path.stem] = json.loads(path.read_text(encoding="utf-8"))
        except ValueError as e:
            raise Problem(f"{path.name} is not JSON: {e}")
        out[path.stem]["id"] = path.stem
        TOP.append(path.stem)
    for pid, project in list(out.items()):
        for member in project.get("members", []):
            mid = member.get("id")
            if not isinstance(mid, str) or not mid:
                raise Problem(f"{pid}.json: a member has no id")
            if mid in out:
                raise Problem(f"{pid}.json: member id {mid} is already a project or member")
            out[mid] = member
    for pid, p in out.items():
        if "version" in p and not isinstance(p["version"], str):
            raise Problem(f"{pid}: version is not a string")
    return out


def esc(text):
    """Plain text into markup, text or attribute alike."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def fill(text, p, html):
    """Expand {name}, {version} and {licence}. In markup (html) the values are escaped, and a
    live CloudBank version becomes the span site.js fills; plain text comes back raw."""

    def one(m):
        key = m.group(1)
        if not isinstance(p.get(key), str):
            raise Problem(f"says {{{key}}} but has no {key}")
        value = esc(p[key]) if html else p[key]
        if key == "version" and html and p.get("version_live"):
            return f'<span data-cloudbank="{esc(p["version_live"])}">{value}</span>'
        return value

    return PLACEHOLDER.sub(one, text)


def markup(text, p):
    """A field that holds the inline-HTML subset."""
    return fill(text, p, True)


def plain(text, p):
    """A plain-text field, escaped."""
    return esc(fill(text, p, False))


def wrap(text, width):
    # shortcut: splits at every space, so a tag with attributes would break across lines;
    # the facts' inline HTML has none today. Teach it tags when one does.
    if width is None:
        return [text]
    lines, line = [], ""
    for word in text.split():
        if line and len(line) + 1 + len(word) > width:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}" if line else word
    return lines + [line]


def meta(key, name, value, width):
    one = f'<meta {key}="{name}" content="{value}" />'
    if width is None or len(one) <= width:
        return [one]
    return ["<meta", f'  {key}="{name}"', f'  content="{value}"', "/>"]


def link(item):
    cls = "btn" if item.get("primary") else "btn quiet"
    tab = ' target="_blank"' if item.get("new_tab") else ""
    rel = ' rel="noopener"' if item["href"].startswith("http") else ""
    return f'<a class="{cls}" href="{esc(item["href"])}"{tab}{rel}>{esc(item["label"])}</a>'


def label(p, apart):
    home = p["home"]
    name = f'<span class="label">{esc(home.get("label", p["name"]))}'
    if home.get("line") is None:
        return [name + "</span>"]
    small = f'<small>{plain(home["line"], p)}</small>'
    return [name + "</span>" + small] if apart else [name + small + "</span>"]


def title(p):
    return esc(f'{p["name"]} — {p["tagline"]}')


# ---- the professional home's rows and pages (#127) -------------------------------------------
# a professional page leads to what a project is, never to the playful pages: their own nav,
# Donate and credits stay there
ACTION_KINDS = {"demo", "release", "repo", "docs", "spec", "contact"}
FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Mono:wght@500&display=swap"


@functools.lru_cache(maxsize=None)
def accents():
    """The product accents, as styles.css :root holds them: the one place they live."""
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    return dict(re.findall(r"(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});", css[: css.index("}")]))


def colour(p):
    if p.get("accent") not in accents():
        raise Problem(f"accent {p.get('accent')} is not a colour in :root of styles.css")
    return accents()[p["accent"]]


def unlinked(p, *keys):
    """Text that goes inside a link: a link in it would be a link in a link."""
    for k in keys:
        if "<a" in p[k]:
            raise Problem(f"{k} has a link, and here it is written inside one")


def pro_row(p, w):
    if p["id"] not in TOP:
        raise Problem("is a family member: its family's row stands for it")
    unlinked(p, "status", "lede")
    return [
        f'<li class="row" style="--c: {colour(p)}">',
        f'  <a href="pro/{p["id"]}.html">',
        f'    <img src="{esc(p["mark"])}" alt="" width="44" height="44" />',
        f'    <span><b>{esc(p["name"])}</b><span class="st">{markup(p["status"], p)}</span></span>',
        "    <p>",
        *[f"      {x}" for x in wrap(markup(p["lede"], p), w - 6)],
        "    </p>",
        "  </a>",
        "</li>",
    ]


def actions(p, members):
    """The label sheet's links that a professional page carries, as its buttons."""
    out = []
    for l in p["links"]:
        href = l["href"]
        cls = ' class="go"' if l.get("primary") else ""
        if not l.get("label_sheet", True):
            continue
        if l.get("kind") == "nav":
            if href.startswith("#") and href[1:] in members:  # a family's member, further down
                out.append(f'<a{cls} href="{esc(href)}">{esc(l["label"])}</a>')
            continue
        if l.get("kind") not in ACTION_KINDS:
            continue
        if not re.match(r"(https?:|mailto:)", href):
            raise Problem(f"link {href} would lead to the playful site")
        tab = ' target="_blank"' if l.get("new_tab") else ""
        rel = ' rel="noopener"' if href.startswith("http") else ""
        out.append(f'<a{cls} href="{esc(href)}"{tab}{rel}>{esc(l["label"])}</a>')
    return out


def shots(p):
    if not p.get("screenshots"):
        return []
    out = ['<div class="shots">']
    for s in p["screenshots"]:
        out += [
            '  <figure class="shot">',
            f'    <img src="../{esc(s["file"])}" alt="{esc(s["alt"])}" width="{s["width"]}" height="{s["height"]}" loading="lazy" />',
            f'    <figcaption>{esc(s["caption"])}</figcaption>',
            "  </figure>",
        ]
    return out + ["</div>"]


def head(p, h, members, size, w):
    """The mark, the status line, the name, the lede and the buttons."""
    acts = actions(p, members)
    hid = f' id="{p["id"]}-h"' if h == "h2" else ""  # a member's heading names its section
    return [
        f'<img src="../{esc(p["mark"])}" alt="" width="{size}" height="{size}" />',
        "<div>",
        f'  <p class="st">{markup(p["status"], p)}</p>',
        f"  <{h}{hid}>{esc(p['name'])}</{h}>",
        '  <p class="lede">',
        *[f"    {x}" for x in wrap(markup(p["lede"], p), w - 4)],
        "  </p>",
        *(['  <div class="acts">'] + [f"    {a}" for a in acts] + ["  </div>"] if acts else []),
        "</div>",
    ]


def pro_page(p):
    """A project's professional page, whole: its head, what it is, its facts, its screenshots,
    and a section for each member of a family. A section the data has nothing for is left out."""
    members = [m["id"] for m in p.get("members", [])]
    w = WIDTH - 8  # the page's content sits at an indent of 8
    facts = [(r["label"], r["value"]) for r in p.get("stack", [])]
    if isinstance(p.get("licence"), str):
        facts.append(("Licence", p["licence"]))
    what = [
        '<section aria-labelledby="what-h">',
        '  <h2 id="what-h">What it is</h2>',
        "  <p>",
        *[f"    {x}" for x in wrap(plain(p["description"], p), w - 4)],
        "  </p>",
        "</section>",
    ]
    glance = []
    if facts:
        glance = ['<section aria-labelledby="glance-h">', '  <h2 id="glance-h">At a glance</h2>', '  <dl class="facts">']
        glance += [f"    <dt>{esc(k)}</dt><dd>{esc(v)}</dd>" for k, v in facts]
        glance += ["  </dl>", "</section>"]
    body = ['<div class="cols">'] + [f"  {x}" for x in what + glance] + ["</div>"] + shots(p)
    for m in p.get("members", []):
        body += [f'<section class="member" id="{m["id"]}" style="--c: {colour(m)}" aria-labelledby="{m["id"]}-h">']
        body += ['  <header class="ph">'] + [f"    {x}" for x in head(m, "h2", [], 44, w - 4)] + ["  </header>"]
        body += [f"  {x}" for x in shots(m)] + ["</section>"]
    lines = [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="UTF-8" />',
        '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
        *[f"    {x}" for x in RENDER["title"](p, WIDTH - 4)],
        '    <meta name="theme-color" content="#f4f6f5" media="(prefers-color-scheme: light)" />',
        '    <meta name="theme-color" content="#0f1512" media="(prefers-color-scheme: dark)" />',
        f'    <link rel="icon" type="image/svg+xml" href="../{esc(p["mark"])}" />',
        *[f"    {x}" for x in RENDER["og"](p, WIDTH - 4)],
        '    <meta property="og:type" content="website" />',
        "",
        '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
        '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
        "    <link",
        f'      href="{FONTS}"',
        '      rel="stylesheet"',
        "    />",
        '    <link rel="stylesheet" href="../pro.css" />',
        "  </head>",
        "  <body>",
        f'    <div class="wrap" style="--c: {colour(p)}">',
        '      <a class="back" href="../index.html">All projects</a>',
        '      <header class="ph">',
        *[f"        {x}" for x in head(p, "h1", members, 64, w)],
        "      </header>",
        "      <main>",
        *[f"        {x}" for x in body],
        "      </main>",
        f'      <footer>{esc(p["name"])} is one of {SITE}\'s projects. <a href="../index.html">All projects</a></footer>',
        "    </div>",
        '    <script src="../site.js" defer></script>',
        "  </body>",
        "</html>",
    ]
    return "".join(x.rstrip() + "\n" for x in lines)


RENDER = {
    # the label sheet, or its equivalent
    "state": lambda p, w: [markup(p["status"], p)],
    "name": lambda p, w: [esc(p["name"])],
    "lede": lambda p, w: wrap(markup(p["lede"], p), w),
    "actions": lambda p, w: [link(i) for i in p["links"] if i.get("label_sheet", True)],
    # the page's head
    "title": lambda p, w: [f"<title>{title(p)} · {SITE}</title>"]
    + meta("name", "description", plain(p["description"], p), w),
    "og": lambda p, w: meta("property", "og:title", title(p), w)
    + meta("property", "og:description", plain(p["summary"], p), w),
    # a family member's tab
    "tab": lambda p, w: [f'<b>{esc(p["name"])}</b><small>{markup(p["status_short"], p)}</small>'],
    # the home's objects: the label, or the label and its line side by side
    "object": lambda p, w: label(p, False),
    "object-apart": lambda p, w: label(p, True),
    # About's list of projects
    "about": lambda p, w: [f'<img src="{esc(p["mark"])}" alt="" /><span><b>{esc(p["name"])}</b>{markup(p["about"], p)}</span>'],
    # the professional home's row, which leads to pro/<id>.html
    "pro-row": pro_row,
}
KINDS = set(RENDER) | {"aria"}


def parse(text):
    """A page's blocks, each (id, block, marker start, body start, body end, line), and its
    problems: every marker must pair into a block, and a block holds no other marker."""
    blocks, problems, open_ = [], [], None
    for m in LOOSE.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        o = OPEN.fullmatch(m.group(0))
        if o:
            if open_:
                problems.append(f"line {open_[5]}: {open_[0]}.{open_[1]} has no {CLOSE} before the next block at line {line}")
            if o.group(2) not in KINDS:
                problems.append(f"line {line}: no such block {o.group(1)}.{o.group(2)}")
            open_ = [o.group(1), o.group(2), m.start(), m.end(), None, line]
        elif m.group(0) == CLOSE:
            if not open_:
                problems.append(f"line {line}: {CLOSE} closes no block (its opening marker is missing)")
                continue
            open_[4] = m.start()
            blocks.append(tuple(open_))
            open_ = None
        else:
            problems.append(f"line {line}: a malformed marker {m.group(0)!r}")
    if open_:
        problems.append(f"line {open_[5]}: {open_[0]}.{open_[1]} is never closed with {CLOSE}")
    return blocks, problems


def render(text, block, p):
    pid, kind, mark, a, b, line = block
    body = text[a:b]
    if kind == "aria":
        value = plain(p["home"]["aria"], p)
        new, n = re.subn(r'aria-label="[^"]*"', lambda m: f'aria-label="{value}"', body)
        if n != 1:
            raise Problem("needs exactly one aria-label in it")
        return new
    if re.match(r"[ \t]*\n", body):  # on its own lines; spaces after the marker are dropped
        indent = text[text.rfind("\n", 0, mark) + 1 : mark]
        if indent.strip():
            raise Problem("is written on its own lines, so its opening marker must be alone on its line")
        lines = RENDER[kind](p, WIDTH - len(indent))
        return "\n" + "".join(f"{indent}{x}\n" for x in lines) + indent
    return "".join(RENDER[kind](p, None))


def run(check):
    try:
        projects = load()
    except Problem as e:
        print(f"error {e}")
        return 2
    stale, errors, writes = [], [], []
    for page in sorted(ROOT.glob("*.html")):
        old = page.read_bytes().decode("utf-8")  # read whole before anything is written
        blocks, problems = parse(old)
        if "\r" in old and blocks:
            problems.append("has CR line endings; the pages are LF (see .gitattributes)")
        if problems:
            errors += [f"{page.name}: {x}" for x in problems]
            continue
        out, at = [], 0
        for block in blocks:
            pid, kind, mark, a, b, line = block
            where = f"{page.name}:{line}: {pid}.{kind}"
            p = projects.get(pid)
            try:
                if p is None:
                    raise Problem("has no data file or member of that id")
                new = render(old, block, p)
            except Problem as e:
                errors.append(f"{where} {e}")
                continue
            except KeyError as e:
                errors.append(f"{where}: the data has no {e}")
                continue
            if new != old[a:b]:
                stale.append(where)
            out += [old[at:a], new]
            at = b
        text = "".join(out) + old[at:]
        if text != old:
            writes.append((page, text))

    # the professional pages, written whole
    for pid in TOP:
        page = PRO / f"{pid}.html"
        try:
            text = pro_page(projects[pid])
        except Problem as e:
            errors.append(f"pro/{pid}.html: {e}")
            continue
        except KeyError as e:
            errors.append(f"pro/{pid}.html: the data has no {e}")
            continue
        old = page.read_bytes().decode("utf-8") if page.exists() else None
        if text != old:
            stale.append(f"pro/{pid}.html" + ("" if old is not None else " (missing)"))
            writes.append((page, text))
    for page in sorted(PRO.glob("*.html")):
        if page.stem not in TOP:
            errors.append(f"pro/{page.name}: has no data file in data/projects/; delete it, or add its data")

    for line in errors:
        print(f"error {line}")
    if errors:
        print("fix the markers or the data first" if check else "nothing written: fix the markers or the data first")
        return 2
    if check:
        for line in stale:
            print(f"differs {line}")
        return 1 if stale else 0
    for page, text in writes:
        page.parent.mkdir(exist_ok=True)
        page.write_bytes(text.encode("utf-8"))
        print(f"wrote {page.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(run("--check" in sys.argv[1:]))
