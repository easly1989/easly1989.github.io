# PROTOTYPE, throwaway: page morphs with a 3D room

Answers [Keep today's page transitions with a 3D room](https://github.com/easly1989/easly1989.github.io/issues/41).
Never merged. `index.html` on this branch is the isometric room mockup, not the site's home.

Run it from the repo root, in Chrome (Firefox has no cross-document view transitions). Any
static server works, but the radio needs one that answers byte ranges, as GitHub Pages
does: `python -m http.server` does not, so there a station starts over on every page
instead of carrying on.

```bash
python -m http.server 8000
```

Open http://localhost:8000/index.html. The bar at the bottom left switches the variant:

- `off`: nothing in the room is named, so a page just cross-fades in.
- `a`: today's opening moves play, then the picked object is named as the page is left
  (`pageswap`) and morphs straight from the room's perspective into its page.
- `b`, the one chosen: the object rises straight up, clear of the desk and its
  neighbours, turns to face the reader, and only then morphs. Coming back, the page's
  counterpart lands facing the reader, turns back flat, and is lowered onto the desk.

`vt-proto.js` holds the whole prototype. `bench3d.js` and `bench3d.css` draw the room. In
the head, `<link rel="expect" href="#room-ready" blocking="render">` holds the first
render, and with it the morph's capture, until the room is built.

Also on this branch, built while the morphs were worked out:

- `photos.js`: the instant camera takes one of seven photos, the About page shows it, and
  back on the bench it goes to its own place on the wall or the computer. A photo there
  opens About on itself, and comes back to the same place.
- `radio.js`: the radio on the shelf, which every page but the console loads, so the
  music carries on from page to page and waits while the console is open.
