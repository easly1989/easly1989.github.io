"""Write each project's facts from data/projects/*.json into the pages.

Run from anywhere, after editing data/projects/:

    python tools/sync.py           rewrite every generated block
    python tools/sync.py --check   write nothing; exit 1 listing every block that differs

A generated block is the text between `<!-- data:<id>.<block> -->` and `<!-- /data -->`
in a page at the repo root. Everything outside those markers is left byte for byte. A block
whose opening marker ends its line is written as lines at that marker's indent; one that
goes on along the line is written on that line. A marker that does not pair into a known
block, a page with CR line endings, or a data file that does not load is an error: nothing
is written and the exit code is 2. See tools/README.md for the blocks.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "projects"
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
    for path in sorted(DATA.glob("*.json")):
        try:
            out[path.stem] = json.loads(path.read_text(encoding="utf-8"))
        except ValueError as e:
            raise Problem(f"{path.name} is not JSON: {e}")
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
        page.write_bytes(text.encode("utf-8"))
        print(f"wrote {page.name}")
    return 0


if __name__ == "__main__":
    sys.exit(run("--check" in sys.argv[1:]))
