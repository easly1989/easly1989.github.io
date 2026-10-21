# PROTOTYPE: the real-time cat in the CSS 3D room

Throwaway. This branch is never merged. It answers one ticket of the map "Map: the room and the real-time cat": [Prove the real-time cat inside the CSS 3D room](https://github.com/easly1989/easly1989.github.io/issues/37).

## Run it

From the root of this branch, start a static server with no caching:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/proto-cat.html.

Open it in a real, visible browser window. The cat and the frame counter run once per frame, so a hidden or headless tab shows nothing.

## What is here

- **`proto-cat.html`:** the room mockup (`bench3d.css` and `bench3d.js` on top of the home page). It adds an import map for three.js r186 from jsDelivr, and today's `cat.js` is left out.
- **`proto-cat.js`:** the cat. It is drawn by three.js into a canvas that stands inside the room's `preserve-3d` scene, facing the screen, so the browser sorts it in depth with everything else.
  - The cat walks a fixed route: across the mat, behind the computer and out again, then along the desk's front edge behind the chair's back.
  - A panel shows the frame rate, the step, where the cat is and what it costs to draw.
- **`cat.glb`:** Quaternius's CC0 cat (Animal Pack Vol.2), with the coat taken from Carlo's photos and baked into a 512 px texture, plus two eyes. 245 KB, with the Idle and Walking clips.
- **`prototype-cat/render_v3.py`:** the coat and the eyes, as Blender script.
- **`prototype-cat/export_glb.py`:** unwraps the coat, bakes it and exports the `.glb`:

  ```bash
  blender -b Cat.blend --python export_glb.py -- render_v3.py cat.glb 512
  ```

## Switches, for measuring

| Query | Effect |
|---|---|
| `?nocat` | the cat is not drawn |
| `?noplace` | the canvas stays where it started |
| `?nohud` | the panel is not updated |
| `?outside` | the canvas goes outside the 3D scene |
| `?nonight` | the lights-off overlay is removed |
| `?lite=<selectors>` | those parts of the room are hidden |
| `?nofur` | no fur shells |
| `?fur=<units>` | how far the fur reaches, in model units (default 0.15) |
| `?shells=<n>`, `?srep=<n>`, `?comb=<k>`, `?oline=<k>` | fur layers (14), strand coarseness (26, fewer is coarser), how far the tips lean (0.9), where the outline sits inside the fur (0.22) |
| `?nochonk` | the model's own proportions, not widened |
| `?flat` | the exported faceted normals |
| `?gloss` | the exported, glossy material |
| `?closeup` | the cat alone, large, in the top right corner, to check the face |

From the console, `__hold(x, y, z, headingDeg, walking)` holds the cat at one place.
