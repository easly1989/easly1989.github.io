# Checks

Scripts that load the built site in a real Chrome and check what a reader would see. There is
no build and no test runner; each check is one Python file that serves the repo itself, drives
Chrome through the DevTools protocol, prints one line per check and exits non-zero if any
failed.

Run them before merging a change to the room (`room.js`, `room.css`, or the home's switch in
`index.html`):

```bash
pip install websocket-client
python checks/framing.py
python checks/fps.py
python checks/contrast.py
python checks/moves.py
python checks/photos.py
python checks/radio.py
python checks/dark.py
python checks/peek.py
python checks/willy-flips.py
python checks/data.py
```

`contrast.py` also needs `pip install pillow numpy`.

Chrome on this PC reports `prefers-reduced-motion: reduce` unless told otherwise (Windows'
animation effects are off), so every check sets the motion it means, with `b.media(...)`: a check
of motion that forgets it measures a room in which Willy only sleeps.

- `framing.py` — a first visit to the home gets the professional page, with its way into the
  room; "Step into the room" shows the room and the choice holds on the next visit; every link,
  button and word in the room is inside the window at 1280×720, 1366×768, 1440×900, 1920×1080
  and 2560×1080, and the walls and floor fill it to the corners; a window too small for the room
  and a phone get the professional page, with no way in; `?room=0` turns the room off and
  `?room` back on; `?room` leaves a clean address, and the tie on the chair opens the professional
  home at one, which a reload keeps; nothing on the desk moves when the fonts arrive after the
  first frame.
  Headless. The other checks reach the room through `?room`, which chooses it.
- `fps.py` — the room keeps pace with a 60 Hz display while Willy walks, in both schemes, with
  its light on and off, with the radio playing and with the computer on; he rests between walks, so a sample is taken
  again until he has walked through enough of it. It draws without vsync, so it measures what a
  frame costs. It opens a visible window, since a hidden one throttles its frames: leave it in
  front until it closes; a few minutes. The white square crossing the desk in that window is the check's own, there
  so every frame is drawn again; the site has no such thing.
- `contrast.py` — with the room's light on, every text the reader can see clears 4.5:1 against
  what is really behind it, in both schemes; with the light off, the night is a view the reader
  chose and only the neon navigation has to. It measures pixels, drawing each text with and
  without its ink at four times the density. Then the professional home and every page in
  `pro/`, whole, in both schemes, failing a page that shows nothing to measure, and each page's
  accent-bordered buttons and Donate's services at 3:1 against the ground, and each service's
  icon at 3:1 against its colour. Headless; about four minutes.

- `moves.py` — each project object is clicked with the mouse, and a second click lands
  elsewhere mid-move: the first click's page opens within about 1.6 s and at 60 fps or more,
  the pair's name is on both pages and no name is used twice, and back on the room the object
  is put down and the page answers. Ctrl-click and reduced motion play no move. A visible
  window, like `fps.py`, drawing without vsync, so the frame rate it reports is what the frames
  cost and not the display's own: on a 90 Hz display a 12 ms frame would read as 45 fps. It
  also comes back by a link, not the cache, where the room is shown while it still loads, and
  no frame of that morph or of the put-down after it takes over 100 ms.
- `photos.py` — the camera takes a photo, never the same twice running, and About shows it
  developing; back in the room it lands in its place with the morph, by the cache and by a
  link; picked up it opens About on itself, developed, and lands in the same place; taken
  again it leaves its place; under reduced motion it still goes there; About reached another
  way shows the visit's last photo; a pinned photo is a labelled link with a focus ring; and
  with all seven out, each is inside the window and clear of the name, the poster's words and
  the window at every size. A visible window, like `moves.py`.

- `radio.py` — the radio is off at first with nothing fetched; outside a visit to the room the
  pages carry no radio, and in one every page's bar carries it, off; switched on by its knob in
  the room it plays the tuned station at 0.4 and its projector shows the track on the wall; the
  next station is fetched only once tuned in; on the next page it carries on where it would be
  by now; in the console it is quiet and back out it carries on from where it stopped; the radio
  in a page's bar stops it, starts it and changes station; About credits every track; every
  station's words on the wall are inside the window at every size; clicking the projector caps
  it for the visit; out of the room while it plays, every page still carries the radio that
  stops it. A visible window with autoplay allowed.
- `dark.py` — the first load of a visit is dark, the neon name striking, the room busy and its
  switch off, until the switch clicks the light on within about 4 s, in both schemes; later
  loads show the room at once with its light as left; the switch pressed in the dark puts the
  light on at once; under reduced motion it is lit from the
  start; and with whatever holds the light never letting go and the page's scripts stopped
  once the room is up, the dark still ends on its own. A visible window.

- `peek.py` — Willy peeking in on the professional home: a mouse turns his eyes and head; close
  to his face or onto "Step into the room" he swats once, then not for 5 s and not again while
  the mouse stays; a click through the raised paw still opens the room; the keyboard focus on the
  link gets one swat and no eye-following; under reduced motion, for a touch and on a phone
  nothing of him moves; at 1120×740, the smallest window that holds the room, he shows, and
  at 960×800 and on a phone in landscape (915×412, touch) he does not. Headless; about half a minute.

- `willy-flips.py` — Willy never flips over: his body turns at most 45 degrees between two frames
  and he leans at most 35, on the desk, on the books and the pager he walks over and across their
  edges. First a sweep on the review page at 60 fps, in the middle of each of those and at the
  middle of each edge, facing along it and across: he turns on the spot both ways, lies down, sits
  and sleeps and gets up again, and walks over the edge and back. The sweep is the gate: it is the
  same every run. Then 90 s of the room as a reader sees it (`python checks/willy-flips.py 600`
  watches ten minutes), on a clock that moves 1/60 s a frame however slowly the browser draws,
  every frame measured and each failing frame printed with its clip and where he was. Whether he
  comes upon a book there is chance, so a pass there proves little; a browser that cannot show
  that much of it in four times as long prints `slow`, too slow to judge, and does not fail.
  Headless; about five minutes.

- `data.py` — no browser, and run it after any change to `data/projects/` or to a page's
  facts: every page is what `python tools/sync.py` would write from the data, every data file
  has its fields and they are well formed (plain text without tags or entities, only the
  inline tags in the markup fields, no unknown placeholder, accents in `:root`, marks and
  screenshots on disk at their real size, one primary link on each label sheet), every page
  has each block it is meant to have, once, and the facts still written by hand agree with the
  data: the licence in each page's prose, the stack tables, a data screenshot's alt, size and
  caption (shown on its own page unless `pro_only`), CloudBank's fallback version, the links
  beyond the label sheet, and the room's jar label. A version GitHub publishes (`release`) has
  a well-formed source, a `prerelease` flag where `{release}` shows it, and one changelog link;
  `site.js` writes the stage in `sync.py`'s words. A professional page's `facts` are a list of
  `{label, value}`. Every project has its professional page,
  `pro/<id>.html`, with its own title and its curated screenshots, and neither those pages nor
  the professional home link to a playful page, and every link out carries `rel="noopener"`.
  Each has the site's nav, its own page marked. `data/pages/about.json` and `donate.json` are
  well formed, with the photo on disk at its real size; About lists every project once and
  says nothing of the person that the playful About does not; Donate names no project. A second.

The room's window shows Pesaro's weather from Open-Meteo, asked once and kept for 15 minutes
in `sessionStorage` (`weather`). For a check or a screenshot, `?weather=` forces a state without
asking: `<look>-day` or `<look>-night`, the look one of `clear`, `partly`, `overcast`, `fog`,
`rain`, `snow` and `storm` (e.g. `rain-night`), with `&wind=1` for a windy one. It holds
for that load only and is never stored; any other value is ignored and the window asks as usual.
To see the window without weather, as when the service fails, block
`api.open-meteo.com` (`Network.setBlockedURLs`).

`cdp.py` is the driver (Chrome comes from `CHROME`, or the usual Windows path), and
`serve.py` the server: fresh on every load or reload (going back may bring back the page as
it was left), byte ranges, nothing logged.
`python checks/serve.py` serves the site on its own, for looking at it by hand.
