# PROTOTYPE, throwaway: page morphs with a 3D room

Answers [Keep today's page transitions with a 3D room](https://github.com/easly1989/easly1989.github.io/issues/41).
Never merged. `index.html` on this branch is the isometric room mockup, not the site's home.

Run it from the repo root, in Chrome (Firefox has no cross-document view transitions):

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
