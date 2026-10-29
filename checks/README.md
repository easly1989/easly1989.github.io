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
```

`contrast.py` also needs `pip install pillow numpy`.

- `framing.py` — with `?room`, every link, button and word in the room is inside the window at
  1280×720, 1366×768, 1440×900, 1920×1080 and 2560×1080, and the walls and floor fill it to the
  corners; a window too small for the room, a phone, and the home without `?room` get the bench
  as before; `?room` is remembered for the session and `?room=0` turns it off; nothing on the
  desk moves when the fonts arrive after the first frame. Headless.
- `fps.py` — the room keeps pace with a 60 Hz display while Willy walks, in both schemes, with
  its light on and off, with the radio playing and with the computer on; he rests between walks, so a sample is taken
  again until he has walked through enough of it. It draws without vsync, so it measures what a
  frame costs. It opens a visible window, since a hidden one throttles its frames: leave it in
  front until it closes; a few minutes. The white square crossing the desk in that window is the check's own, there
  so every frame is drawn again; the site has no such thing.
- `contrast.py` — with the room's light on, every text the reader can see clears 4.5:1 against
  what is really behind it, in both schemes; with the light off, the night is a view the reader
  chose and only the neon navigation has to. It measures pixels, drawing each text with and
  without its ink at four times the density. Headless; about three minutes.

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

`cdp.py` is the driver (Chrome comes from `CHROME`, or the usual Windows path), and
`serve.py` the server: fresh on every load or reload (going back may bring back the page as
it was left), byte ranges, nothing logged.
`python checks/serve.py` serves the site on its own, for looking at it by hand.
