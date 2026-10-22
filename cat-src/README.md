# Willy's sources

Everything that makes `assets/willy.glb`, the cat in the room, rebuilt by script. Nothing here
is loaded by the site.

## The model

Willy is the cat from **Fully Animated Cats** (v2.1, by AnimX), licensed from the Unity Asset
Store under its standard EULA: it may be used embedded in a product of our own, like this site,
but not passed on as it is. So the package and the files taken from it are **not in the repo**:
they go in `cat-src/animx/`, which `.gitignore` keeps out, and only the `.glb` made from them is
published, as part of the site. Whoever rebuilds needs their own copy of the package.

Of the package, the build uses the cat without fur (`Cat_R_noFur.fbx`), at its lightest level of
detail (LOD5, about 1,900 triangles: at the room's size it looks as the 10,500 of LOD3 do), its
50-bone rig, the clips in its eight `A_Cat_*.fbx` files, its white and black coats, its green iris
and its slit pupil.

## Rebuild

With Python 3 and Blender 5.2 or later, from the repo root:

```bash
python cat-src/unpack.py "<path to>/Fully Animated Cats v2.1.unitypackage"
```

```bash
blender -b --python cat-src/build.py -- assets/willy.glb
```

The build takes a minute or so. It prints how much ground a walk cycle covers (`STRIDE`) and how
high the jump's root is as it leaves the ground and meets it (`LIFT`): `willy-moves.js` and
`willy.js` hold those two, so they change with his size. It stops without writing anything if a
clip goes through the ground.

## What the build does

- **Size and shape.** Makes him 388 px nose to tail tip (`LENGTH`, 1.25 times the first Willy),
  chubbier, as Carlo's cat is: the trunk pushed out, more below where the belly hangs, the neck
  and the tops of the legs filled out, the tail fluffed. It turns him to face +x, as the room has
  him at heading 0.
- **Coat.** The coat from Carlo's photos, as ellipsoids at rest, with uneven edges:
  - a black cap, over his right ear and round his left eye;
  - a black saddle;
  - a white band across the hips;
  - a black rump and tail.

  It picks between the model's white coat (its orange patch bleached) and its black one, greyed
  to Willy's black, and bakes the result onto an unwrap of its own: the model's mirrors the head.
- **Eyes.** The model's green iris with its slit pupil put over it, and no cornea.
- **Clips.** The ones Willy uses, made to stand where he is put: the room moves him, so their own
  travel is taken out. Turns keep their turn, about where he stands. Taking off and landing keep
  the root's height; in the air the room's arc holds him. The clips:
  - `idle`, `walk`, and `turn-left`, `turn-right` (90°) and their `-45` variants;
  - `sit`, `sit-idle`, `sit-from`;
  - `lie`, `lie-idle`, `lie-from`;
  - `sleep` (lying down, then curling up), `sleep-idle` and `wake`;
  - the jump in three parts, `jump-up`, `jump-air` and `jump-land`, cut from the model's
    jump in place.
- **Lifting.** A clip in which his fuller belly would sink into the ground is lifted, frame by
  frame, until it rests on it.
- **Export.** Checks no clip takes him through the ground, and exports the `.glb`.

His fur (shells combed back, longer on the tail) and his thin outline are drawn at run time, by
`willy.js`.

## Adding a clip

Map the model's clip to a name in `CLIPS` in `build.py`, and in `TRACKS` if it plays in a row
with others. Rebuild, and look at it in the viewer or on the review page.

## The viewer

`viewer.html` shows Willy alone, outside the site, to look at a clip closely. You can turn him
round, scrub through the clip, stand him on the desk or on the perch drawn to its size, and show
his bones. Serve the repo root and open `/cat-src/viewer.html`; after a rebuild, Reload model.
`?model=` loads another build, and `?fur=<reach>&tail=<longer by>` puts his fur on.

## The review page

`index.html?room&review` (or `?room&review=<clip>`) plays any clip in a loop on Willy in the
room, somewhere he fits in it, found anew on each play:

- `sit` on the desk;
- `sleep` on the cushion under the window or on the desk, whichever he likes;
- `jump`, the jump up onto the cushion;
- `shelf`, from the desk up onto the shelf, between the plant and the radio;
- `walk`, from one place on the desk to another and back, round whatever is in the way;
- `wander`, anywhere, the cushion too, sitting or sleeping where it gets to.

`room` draws the room he takes, green, or red where it goes into something. `&willy=<path>`
tries another build. The page is a tool for checking clips, not part of the site, but it moves
him with the room's own code (`willy-moves.js`), so what it shows is what the reader sees.

## In the room

`willy-room.js` is Willy's life in the room (`index.html?room`): he goes from place to place on
the desk, jumps up to the cushion under the window or to the shelf, sits, sleeps or looks about
where he gets to, and goes on. He does not answer clicks yet. three.js and his model load only
from there, after the room is built (`ROOM.ready`), and the first load's dark waits for him
(`ROOM.holdLight`), no longer than it lasts. Without WebGL 2, or if anything fails, there is no
Willy and the room is as it is. Under reduced motion he sleeps on the cushion and does not move.

He is lit by the room's own sources (`ROOM.lights()`): its light, the window, the computer's
screen while it is on and the radio's lamp while it plays, as point lights over a soft fill. In
the dark the room's night layer darkens him with everything else, and lights him where it lights
the room. His shadow is a soft blob in his own canvas, on what he stands on; there are no shadow
maps. He is drawn only when he is anywhere new, and not at all while the tab is hidden.

three.js r186 is in `vendor/three/` (see its README), behind the import map in `index.html`.

Where he can go (the desk, the cushion, the shelf) is worked out by `willy-paths.js` from what
the room says (`ROOM.surfaces`, `ROOM.jumps`, `ROOM.clear`, `ROOM.ground`) and the room each clip
takes, measured on the model by `willy.js`. He walks round tall things and over low ones (the
notebooks), turning as he steps; he turns on the spot only where he has room to. A route is a
promise: the search takes a few ms of each frame, so the page never waits on it. It heads
straight for the end, and when that takes long, it is led round whatever is in the way by how
far the end is from each point. `node checks/willy-paths.test.mjs` checks the planner on a
made-up room, and how soon it finds a walk across it.
