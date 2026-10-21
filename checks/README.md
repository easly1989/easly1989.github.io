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
```

- `framing.py` — with `?room`, every link, button and word in the room is inside the window at
  1280×720, 1366×768, 1440×900, 1920×1080 and 2560×1080, and the walls and floor fill it to the
  corners; a window too small for the room, a phone, and the home without `?room` get the bench
  as before; `?room` is remembered for the session. Headless.
- `fps.py` — the room keeps pace with a 60 Hz display in both schemes. It opens a visible
  window, since a hidden one throttles its frames: leave it in front until it closes.

`cdp.py` is the driver (Chrome comes from `CHROME`, or the usual Windows path), and
`serve.py` the server: no caching, byte ranges, nothing logged. `python checks/serve.py`
serves the site on its own, for looking at it by hand.
