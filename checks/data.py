"""The project data in data/projects/: every page shows what tools/sync.py would write from it,
every file holds the fields the pages and the professional template read, each page has every
block it is meant to have, and the facts still written by hand on a page (the licence in its
prose, the stack table, captions, screenshots' alt and size, CloudBank's fallback version, the
room's jar label, the links beyond the label sheet) agree with the data, and a version GitHub
publishes has its source and its changelog link. Each project has its
professional page, pro/<id>.html, with a title of its own, and neither those pages nor the
professional home link to a playful page. No browser."""
import html
import importlib.util
import json
import re
import struct
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("sync", ROOT / "tools" / "sync.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
failures = []


def check(ok, what, details=()):
    print(("ok    " if ok else "FAIL  ") + what)
    for line in details:
        print("        " + line)
    if not ok:
        failures.append(what)


def text_of(fragment):
    """A piece of markup as the reader sees it."""
    return " ".join(html.unescape(re.sub(r"<[^>]+>", "", fragment)).split())


# ---- the pages are what the generator writes ------------------------------------------------
run = subprocess.run([sys.executable, str(ROOT / "tools" / "sync.py"), "--check"], capture_output=True, text=True, encoding="utf-8")
check(run.returncode == 0, "every generated block matches data/projects/ and every marker pairs (python tools/sync.py --check)",
      run.stdout.splitlines())

try:
    projects = sync.load()
except sync.Problem as e:
    check(False, f"the data loads: {e}")
    sys.exit(1)

# ---- the fields -----------------------------------------------------------------------------
KINDS = {"demo", "release", "repo", "docs", "changelog", "spec", "donate", "contact", "nav", "credit"}
INLINE = {"code", "b", "em", "a"}  # the markup an HTML field may carry
HTML_FIELDS = {"status", "status_short", "lede", "about"}
FILLED = HTML_FIELDS | {"description", "summary", "line", "aria"}  # where the placeholders go
PLACEHOLDERS = ("name", "version", "release", "licence")
TOP = {"name", "tagline", "status", "version", "version_live", "release", "prerelease", "lede", "about", "description",
       "summary", "licence", "accent", "mark", "stack", "facts", "home", "links", "screenshots", "members"}
MEMBER = {"id", "name", "status", "status_short", "version", "release", "prerelease", "lede", "licence", "accent", "mark",
          "stack", "links", "screenshots"}
OPTIONAL = {"version", "version_live", "release", "prerelease", "members", "facts"}
REPO = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
FILE = re.compile(r"(?!.*\.\.)[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)*\.json")
ENTITY = re.compile(r"&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
root_vars = set(re.findall(r"(--[a-z0-9-]+):", css[: css.index("}")]))


def png_size(path):
    head = path.read_bytes()[:24]
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", head[16:24])


def strings(value, path):
    """Every string in a piece of data, with the path to it."""
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from strings(v, path + [k])
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from strings(v, path + [str(i)])


def problems(d, fields, where):
    out = [f"{where}: unknown field {k}" for k in sorted(set(d) - fields)]
    out += [f"{where}: no {k}" for k in sorted(fields - set(d) - OPTIONAL)]
    # one rule for text: the HTML fields hold the inline subset, every other string is plain
    for path, v in strings({k: v for k, v in d.items() if k != "members"}, []):
        field, name = path[-1], ".".join(path)
        if field in HTML_FIELDS:
            for tag in sorted(set(re.findall(r"</?([a-zA-Z][a-zA-Z0-9]*)", v)) - INLINE):
                out.append(f"{where}.{name}: <{tag}> is not one of the inline tags {sorted(INLINE)}")
        elif "<" in v or ENTITY.search(v):
            out.append(f"{where}.{name}: plain text, so no tags and no entities (the generator escapes it)")
        for ph in re.findall(r"\{([^}]*)\}", v):
            if field not in FILLED or ph not in PLACEHOLDERS:
                out.append(f"{where}.{name}: unknown placeholder {{{ph}}}")
            elif ph == "release" and not (isinstance(d.get("release"), dict) and "prerelease" in d):
                out.append(f"{where}.{name}: says {{release}} but there is no release with a prerelease flag")
            elif ph not in ("name", "release") and not isinstance(d.get(ph), str):
                out.append(f"{where}.{name}: says {{{ph}}} but there is no {ph}")
    for key in ("name", "tagline", "description", "summary", "status", "status_short", "lede", "about", "mark", "id"):
        if key in fields and key in d and not (isinstance(d[key], str) and d[key]):
            out.append(f"{where}.{key}: not text")
    if "version" in d and not isinstance(d["version"], str):
        out.append(f"{where}.version: not a string")
    if "version" in d and isinstance(d["version"], str) and not sync.VERSION.fullmatch(d["version"]):
        out.append(f"{where}.version: {d['version']} does not look like a version")
    if d.get("version_live") not in (None, "stable", "nightly"):
        out.append(f"{where}.version_live: stable or nightly")
    # where GitHub publishes the version: a repo's newest release, or a JSON file's version field
    rel = d.get("release")
    if "release" in d:
        if not (isinstance(rel, dict) and set(rel) <= {"repo", "file"} and REPO.fullmatch(str(rel.get("repo")))
                and ("file" not in rel or FILE.fullmatch(str(rel["file"])))):
            out.append(f"{where}.release: needs repo (owner/name), and may have file (a .json path in it)")
            rel = {}
        if not isinstance(d.get("version"), str):
            out.append(f"{where}.release: there is no version for it to replace")
        if "prerelease" in d and rel.get("file"):
            out.append(f"{where}.prerelease: a file's version is never a pre-release")
        n = sum(l.get("kind") == "changelog" for l in d.get("links", []) if isinstance(l, dict))
        if n != 1:
            out.append(f"{where}.links: a version GitHub publishes needs one changelog link ({n})")
    elif "prerelease" in d:
        out.append(f"{where}.prerelease: only with release")
    if "prerelease" in d and not isinstance(d["prerelease"], bool):
        out.append(f"{where}.prerelease: not true or false")
    if not (d.get("licence") is None or isinstance(d.get("licence"), str) and d["licence"]):
        out.append(f"{where}.licence: not text or null")
    if d.get("accent") not in root_vars:
        out.append(f"{where}.accent: {d.get('accent')} is not a variable in :root of styles.css")
    if not (ROOT / str(d.get("mark"))).is_file():
        out.append(f"{where}.mark: no file {d.get('mark')}")
    stack = d.get("stack")
    if not isinstance(stack, list) or any(not isinstance(r, dict) or set(r) != {"label", "value"} for r in stack):
        out.append(f"{where}.stack: not a list of {{label, value}}")
    # what else the professional page lists at a glance, each a fact its playful page states
    facts = d.get("facts", [])
    if not isinstance(facts, list) or any(not isinstance(r, dict) or set(r) != {"label", "value"}
                                          or not all(isinstance(r[k], str) and r[k].strip() for k in r) for r in facts):
        out.append(f"{where}.facts: not a list of {{label, value}}, both text")
    if "home" in fields:
        home = d.get("home")
        if not isinstance(home, dict) or set(home) - {"label", "line", "aria"} or not isinstance(home.get("aria"), str) or "line" not in home:
            out.append(f"{where}.home: needs line (text or null) and aria, and may have label")
    links = d.get("links")
    if not isinstance(links, list) or not links:
        out.append(f"{where}.links: none")
        links = []
    for i, l in enumerate(links):
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
    if sum(bool(l.get("primary")) for l in links if l.get("label_sheet", True)) != 1:
        out.append(f"{where}.links: the label sheet needs exactly one primary link")
    shots = d.get("screenshots")
    if not isinstance(shots, list):
        out.append(f"{where}.screenshots: not a list")
        shots = []
    for i, s in enumerate(shots):
        w = f"{where}.screenshots[{i}]"
        if not {"file", "width", "height", "alt", "caption"} <= set(s) <= {"file", "width", "height", "alt", "caption", "pro_only"}:
            out.append(f"{w}: needs file, width, height, alt and caption, and may have pro_only")
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
    return out


data = {}
for path in sorted((ROOT / "data" / "projects").glob("*.json")):
    d = json.loads(path.read_text(encoding="utf-8"))
    found = problems(d, TOP, path.stem)
    for m in d.get("members", []):
        found += problems(m, MEMBER, f"{path.stem}/{m.get('id')}")
    check(not found, f"{path.name} has every field, well formed", found)
    data[path.stem] = d
check(len(data) >= 7, f"a data file per project ({len(data)})")

# where each project shows: its own page, or its family's
PAGE = {pid: f"{pid}.html" for pid in data}
PAGE.update({m["id"]: f"{pid}.html" for pid, d in data.items() for m in d.get("members", [])})
pages = {p.name: p.read_text(encoding="utf-8") for p in sorted(ROOT.glob("*.html"))}
prose = {name: re.sub(r"<!-- data:[^>]*-->.*?<!-- /data -->", "", text, flags=re.S) for name, text in pages.items()}

# ---- every page has every block it is meant to have, once ---------------------------------
want = Counter()
for pid in data:
    for kind in ("title", "og", "state", "name", "lede", "actions"):
        want[(PAGE[pid], pid, kind)] += 1
    # the room's object, its label, the contact option, and the professional home's row
    for kind in ("aria", "object", "name", "pro-row"):
        want[("index.html", pid, kind)] += 1
    want[("about.html", pid, "about")] += 1
for mid in set(PAGE) - set(data):
    for kind in ("state", "name", "lede", "actions", "tab"):
        want[(PAGE[mid], mid, kind)] += 1
have = Counter()
for name, text in pages.items():
    for pid, kind, *_ in sync.parse(text)[0]:
        have[(name, pid, "object" if kind == "object-apart" else kind)] += 1
missing = sorted(f"{p}: {i}.{k}" + (f" (x{n})" if n > 1 else "") for (p, i, k), n in (want - have).items())
extra = sorted(f"{p}: {i}.{k}" + (f" (x{n})" if n > 1 else "") for (p, i, k), n in (have - want).items())
check(not missing, "every page has every block it is meant to have", [f"no {x}" for x in missing])
check(not extra, "no page has a block it is not meant to have, or one twice", [f"extra {x}" for x in extra])

# ---- the licence: in the status line, and as the page's prose names it ---------------------
LICENCE = re.compile(r"\b(?:AGPL|LGPL|GPL|MPL|MIT|BSD|Apache)(?:[- ]\d+(?:\.\d+)*)?(?:-or-later|-only)?(?: with the Commons Clause)?")
ELSEWHERE = {"coordinator-monitor.html": {"MIT"}}  # the credits for adapted work
for pid, p in projects.items():
    lic = p.get("licence")
    if lic is not None:
        check("{licence}" in p["status"] or lic in prose[PAGE[pid]],
              f"{pid}: its licence, {lic}, is in its status line ({{licence}}) or its page's prose")
for page in sorted({PAGE[pid] for pid in projects}):
    licences = {projects[i]["licence"] for i in projects if PAGE[i] == page} - {None}
    wrong = sorted({m.group(0) for m in LICENCE.finditer(prose[page])} - licences - ELSEWHERE.get(page, set()))
    check(not wrong, f"{page}: every licence its prose names is the data's ({', '.join(sorted(licences)) or 'none'})",
          [f"names {w}" for w in wrong])

# ---- the stack, where a page shows it as a table --------------------------------------------
STACK_SHOWN = {"nutreek", "planora", "cupid"}  # the others' stack is read only by the professional template
for pid in sorted(STACK_SHOWN):
    rows = [{"label": text_of(a), "value": text_of(b)}
            for a, b in re.findall(r'<tr><th scope="row">(.*?)</th><td>(.*?)</td></tr>', prose[PAGE[pid]])]
    check(rows == data[pid]["stack"], f"{pid}: the stack table on its page is the data's stack",
          [] if rows == data[pid]["stack"] else [f"page {rows}", f"data {data[pid]['stack']}"])

# ---- a screenshot reads the same wherever it is shown --------------------------------------
for pid, p in projects.items():
    for s in p.get("screenshots", []):
        seen, wrong = Counter(), []
        for name, text in pages.items():
            for m in re.finditer(r"<img\b[^>]*>", text):
                a = {k: html.unescape(v) for k, v in re.findall(r'([a-z-]+)="([^"]*)"', m.group(0))}
                if a.get("src") != s["file"]:
                    continue
                seen[name] += 1
                if a.get("alt") != s["alt"]:
                    wrong.append(f"{name}: alt differs")
                if a.get("width") != str(s["width"]) or a.get("height") != str(s["height"]):
                    wrong.append(f"{name}: size differs")
                cap = re.match(r"\s*<figcaption>(.*?)</figcaption>", text[m.end():], re.S)
                if cap and text_of(cap.group(1)) != s["caption"]:
                    wrong.append(f"{name}: caption differs")
        if not s.get("pro_only") and not seen[PAGE[pid]]:
            wrong.append(f"not shown on {PAGE[pid]}: mark it pro_only if it is for the professional pages only")
        check(not wrong, f"{s['file']}: the data's alt, size and caption wherever it is shown ({sum(seen.values())} shown)", wrong)

# ---- the facts still written by hand -------------------------------------------------------
cb = data["cloudbank"]["version"]
spans = [(name, v) for name, text in pages.items() for v in re.findall(r'<span data-cloudbank="stable">([^<]*)</span>', text)]
check(spans and all(v == cb for _, v in spans), f"every fallback of CloudBank's stable version is the data's {cb} ({len(spans)} on the pages)",
      [f"{n}: {v}" for n, v in spans if v != cb])

for pid, p in projects.items():
    gone = [l["href"] for l in p["links"] if not l.get("label_sheet", True) and f'href="{sync.esc(l["href"])}"' not in prose[PAGE[pid]]]
    check(not gone, f"{pid}: every link beyond its label sheet is one its page carries", gone)

# ---- the professional pages: one per project, and never a way into the playful pages -------
pro = {p.stem: p.read_text(encoding="utf-8") for p in sorted((ROOT / "pro").glob("*.html"))}
check(set(pro) == set(data), f"a professional page per project, pro/<id>.html, and no other ({len(pro)})",
      [f"no pro/{i}.html" for i in sorted(set(data) - set(pro))] + [f"extra pro/{i}.html" for i in sorted(set(pro) - set(data))])
titles = Counter(re.search(r"<title>(.*?)</title>", t).group(1) for t in pro.values())
check(all(n == 1 for n in titles.values()), "every professional page has a title of its own")
home = pages["index.html"]
home_pro = home[home.index('<div class="pro">') : home.index('<div class="mat"')]
LINK = r'<a[^>]*?href="(?!https?:|mailto:|#)([^"]*)"'  # a link to a page of this site
leads = {f"pro/{i}": sorted(set(re.findall(LINK, t)) - {"../index.html"}) for i, t in pro.items()}
leads["index.html (the professional home)"] = sorted(set(re.findall(LINK, home_pro))
                                                    - {f"pro/{i}.html" for i in data} - {"?room"})
wrong = [f"{page}: {h}" for page, hrefs in leads.items() for h in hrefs]
check(not wrong, "the professional pages lead only to each other, the room's switch and elsewhere on the web", wrong)
unshown = [f"pro/{pid}.html: {s['file']}" for pid, d in data.items()
           for s in [s for m in [d] + d.get("members", []) for s in m.get("screenshots", [])]
           if f'src="../{s["file"]}"' not in pro.get(pid, "")]
check(not unshown, "every project's curated screenshots are on its professional page", unshown)

site_js = (ROOT / "site.js").read_text(encoding="utf-8")
check(all(f'"{w}, "' in site_js for w in sync.STAGE.values()) and sync.VERSION.pattern in site_js,
      "site.js writes a release's stage in sync.py's words and takes a version as sync.py does")

room = (ROOT / "room.js").read_text(encoding="utf-8")
check('tag.querySelector(".label")' in room and "Planora" not in re.sub(r"//.*", "", room),
      "room.js takes Planora's jar label from the bench's label, not from a copy of its own")

sys.exit(1 if failures else 0)
