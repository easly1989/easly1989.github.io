"""Write each project's facts from data/projects/*.json into the pages.

Run from anywhere, after editing data/projects/:

    python tools/sync.py           rewrite every generated block
    python tools/sync.py --check   write nothing; exit 1 listing every block that differs

A generated block is the text between `<!-- data:<id>.<block> -->` and `<!-- /data -->`
in a page at the repo root. Everything outside those markers is left byte for byte. A block
whose opening marker ends its line is written as lines at that marker's indent; one that
goes on along the line is written on that line. See tools/README.md for the blocks.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "projects"
WIDTH = 100  # the markup's wrap column
SITE = "Carlo Ruggiero"
BLOCK = re.compile(r"<!-- data:([a-z0-9-]+)\.([a-z-]+) -->(.*?)<!-- /data -->", re.S)


def load():
    """Every project, and every member of a family, by id."""
    out = {}
    for path in sorted(DATA.glob("*.json")):
        project = json.loads(path.read_text(encoding="utf-8"))
        out[path.stem] = project
        for member in project.get("members", []):
            out[member["id"]] = member
    return out


def attr(text):
    return text.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def fill(text, p, html=True):
    """Expand {name} and {version}; in markup, a live CloudBank version is its span."""

    def one(m):
        if m.group(1) == "name":
            return p["name"]
        if html and p.get("version_live"):
            return f'<span data-cloudbank="{p["version_live"]}">{p["version"]}</span>'
        return p["version"]

    return re.sub(r"\{(name|version)\}", one, text)


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
    one = f'<meta {key}="{name}" content="{attr(value)}" />'
    if len(one) <= width:
        return [one]
    return ["<meta", f'  {key}="{name}"', f'  content="{attr(value)}"', "/>"]


def link(item):
    cls = "btn" if item.get("primary") else "btn quiet"
    tab = ' target="_blank"' if item.get("new_tab") else ""
    rel = ' rel="noopener"' if item["href"].startswith("http") else ""
    return f'<a class="{cls}" href="{attr(item["href"])}"{tab}{rel}>{item["label"]}</a>'


def label(p, apart):
    home = p["home"]
    name = f'<span class="label">{home.get("label", p["name"])}'
    line = home.get("line")
    if line is None:
        return [name + "</span>"]
    small = f"<small>{fill(line, p)}</small>"
    return [name + "</span>" + small] if apart else [name + small + "</span>"]


def title(p):
    return f'{p["name"]} — {p["tagline"]}'


RENDER = {
    # the label sheet, or its equivalent
    "state": lambda p, w: [fill(p["status"], p)],
    "name": lambda p, w: [p["name"]],
    "lede": lambda p, w: wrap(fill(p["lede"], p), w),
    "actions": lambda p, w: [link(i) for i in p["links"] if i.get("label_sheet", True)],
    # the page's head
    "title": lambda p, w: [f"<title>{attr(title(p))} · {SITE}</title>"]
    + meta("name", "description", p["description"], w),
    "og": lambda p, w: meta("property", "og:title", title(p), w)
    + meta("property", "og:description", p["summary"], w),
    # a family member's tab
    "tab": lambda p, w: [f'<b>{p["name"]}</b><small>{fill(p["status_short"], p)}</small>'],
    # the home's objects: the label, or the label and its line side by side
    "object": lambda p, w: label(p, False),
    "object-apart": lambda p, w: label(p, True),
    # About's list of projects
    "about": lambda p, w: [f'<img src="{p["mark"]}" alt="" /><span><b>{p["name"]}</b>{fill(p["about"], p)}</span>'],
}


def aria(p, body):
    """An aria block keeps its markup and only sets the aria-label in it."""
    value = attr(fill(p["home"]["aria"], p, html=False))
    new, n = re.subn(r'aria-label="[^"]*"', lambda m: f'aria-label="{value}"', body)
    return new if n == 1 else None


def run(check):
    projects = load()
    stale, errors, changed = [], [], []
    for page in sorted(ROOT.glob("*.html")):
        old = page.read_bytes().decode("utf-8")  # read whole before anything is written

        def block(m):
            pid, kind, body = m.groups()
            where = f"{page.name}: {pid}.{kind}"
            p = projects.get(pid)
            if p is None or (kind not in RENDER and kind != "aria"):
                errors.append(f"{where}: no such project or block")
                return m.group(0)
            try:
                if kind == "aria":
                    new = aria(p, body)
                    if new is None:
                        errors.append(f"{where}: needs exactly one aria-label")
                        return m.group(0)
                elif body.startswith("\n"):
                    start = old.rfind("\n", 0, m.start()) + 1
                    indent = old[start : m.start()]
                    if indent.strip():
                        errors.append(f"{where}: a block on its own lines needs its marker alone")
                        return m.group(0)
                    lines = RENDER[kind](p, WIDTH - len(indent))
                    new = "\n" + "".join(f"{indent}{line}\n" for line in lines) + indent
                else:
                    new = "".join(RENDER[kind](p, None))
            except KeyError as e:
                errors.append(f"{where}: the data has no {e}")
                return m.group(0)
            if new != body:
                stale.append(where)
            return f"<!-- data:{pid}.{kind} -->{new}<!-- /data -->"

        text = BLOCK.sub(block, old)
        if text != old:
            changed.append(page)
            if not check:
                page.write_bytes(text.encode("utf-8"))

    for line in errors:
        print(f"error {line}")
    if check:
        for line in stale:
            print(f"differs {line}")
    else:
        for page in changed:
            print(f"wrote {page.name}")
    if errors:
        return 2
    return 1 if check and stale else 0


if __name__ == "__main__":
    sys.exit(run("--check" in sys.argv[1:]))
