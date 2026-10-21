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
```

`contrast.py` also needs `pip install pillow numpy`.

- `framing.py` — with `?room`, every link, button and word in the room is inside the window at
  1280×720, 1366×768, 1440×900, 1920×1080 and 2560×1080, and the walls and floor fill it to the
  corners; a window too small for the room, a phone, and the home without `?room` get the bench
  as before; `?room` is remembered for the session and `?room=0` turns it off; nothing on the
  desk moves when the fonts arrive after the first frame. Headless.
- `fps.py` — the room keeps pace with a 60 Hz display in both schemes, with its light on and
  off. It opens a visible window, since a hidden one throttles its frames: leave it in front
  until it closes. The white square crossing the desk in that window is the check's own, there
  so every frame is drawn again; the site has no such thing.
- `contrast.py` — with the room's light on, every text the reader can see clears 4.5:1 against
  what is really behind it, in both schemes; with the light off, the night is a view the reader
  chose and only the neon navigation has to. It measures pixels, drawing each text with and
  without its ink at four times the density. Headless; about three minutes.

- `moves.py` — each project object is clicked with the mouse, and a second click lands
  elsewhere mid-move: the first click's page opens within about 1.6 s and at 60 fps or more,
  the pair's name is on both pages and no name is used twice, and back on the room the object
  is put down and the page answers. Ctrl-click and reduced motion play no move. A visible
  window, like `fps.py`.

`cdp.py` is the driver (Chrome comes from `CHROME`, or the usual Windows path), and
`serve.py` the server: no caching, byte ranges, nothing logged. `python checks/serve.py`
serves the site on its own, for looking at it by hand.
