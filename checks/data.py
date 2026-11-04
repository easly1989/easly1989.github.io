"""The project data in data/projects/: every page shows what tools/sync.py would write from it,
every file holds the fields the pages and the professional template read, each project's facts
reach every page that shows them, and a screenshot in the data has the same alt text and size
wherever a page shows it. No browser."""
import html
import json
import re
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
failures = []


def check(ok, what):
    print(("ok    " if ok else "FAIL  ") + what)
    if not ok:
        failures.append(what)


# ---- the pages are what the generator writes ------------------------------------------------
run = subprocess.run([sys.executable, str(ROOT / "tools" / "sync.py"), "--check"], capture_output=True, text=True, encoding="utf-8")
check(run.returncode == 0, "every generated block matches data/projects/ (python tools/sync.py --check)")
for line in run.stdout.splitlines():
    print("        " + line)

# ---- the fields -----------------------------------------------------------------------------
TEXT = str  # plain text: no markup
KINDS = {"demo", "release", "repo", "docs", "spec", "donate", "contact", "nav"}
INLINE = {"code", "b", "em", "a"}  # the markup a fact may carry
TOP = {"name": TEXT, "tagline": TEXT, "status": "html", "version": "opt", "version_live": "opt", "lede": "html",
       "about": "html", "description": TEXT, "summary": TEXT, "licence": "licence", "accent": "accent",
       "mark": "file", "stack": "stack", "home": "home", "links": "links", "screenshots": "shots", "members": "opt"}
MEMBER = {"id": TEXT, "name": TEXT, "status": "html", "status_short": "html", "version": "opt", "lede": "html",
          "licence": "licence", "accent": "accent", "mark": "file", "stack": "stack", "links": "links",
          "screenshots": "shots"}
OPTIONAL = {"version", "version_live", "members"}
css = (ROOT / "styles.css").read_text(encoding="utf-8")
root_vars = set(re.findall(r"(--[a-z0-9-]+):", css[: css.index("}")]))


def png_size(path):
    head = path.read_bytes()[:24]
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", head[16:24])


def problems(d, fields, where):
    out = []
    for key in sorted(set(d) - set(fields)):
        out.append(f"{where}: unknown field {key}")
    for key, kind in fields.items():
        if key not in d:
            if key not in OPTIONAL:
                out.append(f"{where}: no {key}")
            continue
        v = d[key]
        if kind is TEXT and not (isinstance(v, str) and v and "<" not in v):
            out.append(f"{where}.{key}: not plain text")
        elif kind == "html":
            if not isinstance(v, str) or not v:
                out.append(f"{where}.{key}: not text")
                continue
            for tag in set(re.findall(r"</?([a-zA-Z0-9]+)", v)) - INLINE:
                out.append(f"{where}.{key}: <{tag}> is not one of the inline tags")
            for ph in set(re.findall(r"\{([^}]*)\}", v)) - {"name", "version"}:
                out.append(f"{where}.{key}: unknown placeholder {{{ph}}}")
            if "{version}" in v and "version" not in d:
                out.append(f"{where}.{key}: says {{version}} but there is no version")
        elif kind == "licence" and not (v is None or isinstance(v, str) and v):
            out.append(f"{where}.licence: not text or null")
        elif kind == "accent" and v not in root_vars:
            out.append(f"{where}.accent: {v} is not a variable in :root of styles.css")
        elif kind == "file" and not (ROOT / v).is_file():
            out.append(f"{where}.{key}: no file {v}")
        elif kind == "stack":
            if not isinstance(v, list) or any(not isinstance(r, dict) or set(r) != {"label", "value"} for r in v):
                out.append(f"{where}.stack: not a list of {{label, value}}")
        elif kind == "home":
            if not isinstance(v, dict) or set(v) - {"label", "line", "aria"} or not isinstance(v.get("aria"), str) or "line" not in v:
                out.append(f"{where}.home: needs line (text or null) and aria, and may have label")
        elif kind == "links":
            if not isinstance(v, list) or not v:
                out.append(f"{where}.links: none")
                continue
            for i, l in enumerate(v):
                w = f"{where}.links[{i}]"
                if set(l) - {"label", "href", "kind", "primary", "new_tab", "label_sheet"}:
                    out.append(f"{w}: unknown field")
                if not (l.get("label") and l.get("href")):
                    out.append(f"{w}: needs label and href")
                if l.get("kind") not in KINDS:
                    out.append(f"{w}: kind {l.get('kind')} is not one of {sorted(KINDS)}")
                for flag in ("primary", "new_tab", "label_sheet"):
                    if flag in l and not isinstance(l[flag], bool):
                        out.append(f"{w}.{flag}: not true or false")
                href = l.get("href", "")
                if not re.match(r"(https?:|mailto:|#)", href) and not (ROOT / href.split("#")[0]).is_file():
                    out.append(f"{w}: no page {href}")
            shown = [l for l in v if l.get("label_sheet", True)]
            if sum(bool(l.get("primary")) for l in shown) != 1:
                out.append(f"{where}.links: the label sheet needs exactly one primary link")
        elif kind == "shots":
            if not isinstance(v, list):
                out.append(f"{where}.screenshots: not a list")
                continue
            for i, s in enumerate(v):
                w = f"{where}.screenshots[{i}]"
                if set(s) != {"file", "width", "height", "alt", "caption"}:
                    out.append(f"{w}: needs exactly file, width, height, alt and caption")
                    continue
                path = ROOT / s["file"]
                if not path.is_file():
                    out.append(f"{w}: no file {s['file']}")
                    continue
                size = png_size(path)
                if size and size != (s["width"], s["height"]):
                    out.append(f"{w}: {s['file']} is {size[0]}x{size[1]}, not {s['width']}x{s['height']}")
                if not s["alt"] or not s["caption"]:
                    out.append(f"{w}: empty alt or caption")
    if d.get("version_live") not in (None, "stable", "nightly"):
        out.append(f"{where}.version_live: stable or nightly")
    return out


data = {}
for path in sorted((ROOT / "data" / "projects").glob("*.json")):
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except ValueError as e:
        check(False, f"{path.name} is JSON: {e}")
        continue
    found = problems(d, TOP, path.stem)
    for m in d.get("members", []):
        found += problems(m, MEMBER, f"{path.stem}/{m.get('id')}")
    check(not found, f"{path.name} has every field, well formed")
    for line in found:
        print("        " + line)
    data[path.stem] = d
check(len(data) >= 7, f"a data file per project ({len(data)})")

# ---- every project reaches every page that shows it ---------------------------------------
pages = {p.name: p.read_text(encoding="utf-8") for p in sorted(ROOT.glob("*.html"))}
blocks = {}
for name, text in pages.items():
    for pid, kind in re.findall(r"<!-- data:([a-z0-9-]+)\.([a-z-]+) -->", text):
        blocks.setdefault(pid, set()).add(kind)
NEED = {"title", "og", "state", "name", "lede", "actions", "aria", "about"}
for pid, d in data.items():
    have = blocks.get(pid, set())
    missing = NEED - have
    if not have & {"object", "object-apart"}:
        missing.add("object")
    check(not missing, f"{pid}: its page, the home and About show it from the data" + (f" (no {', '.join(sorted(missing))})" if missing else ""))
    for m in d.get("members", []):
        missing = {"state", "name", "lede", "actions", "tab"} - blocks.get(m["id"], set())
        check(not missing, f"{m['id']}: its sheet shows it from the data" + (f" (no {', '.join(sorted(missing))})" if missing else ""))

# ---- a screenshot reads the same wherever it is shown --------------------------------------
shots = [s for d in data.values() for p in [d, *d.get("members", [])] for s in p.get("screenshots", [])]
for s in shots:
    seen, wrong = 0, []
    for name, text in pages.items():
        for tag in re.findall(r"<img\b[^>]*>", text):
            a = {k: html.unescape(v) for k, v in re.findall(r'([a-z-]+)="([^"]*)"', tag)}
            if a.get("src") != s["file"]:
                continue
            seen += 1
            if a.get("alt") != s["alt"]:
                wrong.append(f"{name}: alt differs")
            if a.get("width") != str(s["width"]) or a.get("height") != str(s["height"]):
                wrong.append(f"{name}: size differs")
    check(not wrong, f"{s['file']} has the data's alt and size on every page ({seen} shown)")
    for line in wrong:
        print("        " + line)

sys.exit(1 if failures else 0)
