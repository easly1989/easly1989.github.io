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

With Python 3, Blender 5.2 or later and Node.js (for `npx gltfpack`), from the repo root:

```bash
python cat-src/unpack.py "<path to>/Fully Animated Cats v2.1.unitypackage"
```

```bash
blender -b --python cat-src/build.py -- assets/willy.glb
```

The build takes a minute or so. It prints how much ground a cycle of each gait covers (`STRIDE`: walk, trot, run, sneak, chase) and how
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
    jump in place;
  - `stretch`, `yawn`, `shake` (his head) and the swat, `swat-left` and `swat-right`, from
    standing and back;
  - `groom`, licking a paw, sitting;
  - `claws`, up on his hind legs against something upright: the chair;
  - `look-around`, `look-down` and `look-side`, standing;
  - `crouch`, low, where a pounce starts;
  - `drink`, nose down to half his height (the mug), and `eat`, nose to the floor;
  - the gaits besides the walk, `trot`, `run` and `sneak` (low, stalking);
  - `pet`, `pet-sit` and `pet-lie`, pushing up into a hand;
  - `knead` (the model's digging), standing; `sit-paw-left` and `sit-paw-right`, a paw pushed
    down to the side, sitting; `land-stop`, landing from a running leap and stopping. The pounce
    has no clip of its own: `willy-moves.js` makes it of `crouch` and the jump's three parts;
  - made here (`SCRIPTED`), one of the model's clips with some bones turned on top of it:
    `chatter` (sitting, at the birds, the jaw going), `knead-lie` (lying, the front paws pressing
    in turn), `loaf` (lying, the front paws folded under), `roll-over` (onto his back, paws
    paddling, and back), `peekaboo` (low, leaning out to look and back) and `chase` (trotting,
    bent round after his tail, a gait: `willy-moves.js` runs it round a tight circle).
- **Each file's rest.** Every animation file keys its clips against its own armature at rest,
  and not all of them rest as the model does: the Action file's spine is 80° off, the Rest
  file's thighs 14–19°. Each bone is put back where its file puts it in its parent's space,
  frame by frame, against the model's rest.
- **Lifting.** A clip in which his fuller belly would sink into the ground is lifted, frame by
  frame, until it rests on it.
- **Export.** Checks no clip takes him through the ground, and exports the `.glb`.
- **Packing.** Packs it with gltfpack 1.3.0 (meshopt compression), to about a third of its size:
  1.5 MB to 577 KB with the first 18 clips. Rotations, translations and scales keep its finest
  steps (16 bits), and positions and UVs stay floats, because `willy.js` grows his fur and
  outline in model units. Packed and unpacked, no bone is more than 0.05 px from where the other
  puts it, and no vertex more than 0.2 px. `willy.js` reads it with three.js's meshopt decoder.

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

`willy-room.js` is Willy's life in the room (`index.html?room`): one everyday action after
another, from `willy-life.js`, picked at random, weighted, among those he can do where he is
(the desk, the cushion under the window, the shelf), never the same twice running and none again
before its cooldown. They are the 2D cat's (`cat.js`), with its weights, remapped to the room:
wandering, trotting, napping, grooming, the zoomies, chasing his tail, a pounce on nothing,
kneading on the cushion, chattering at the birds from it, looking down from the shelf, and so
on; those that need a prop or a toy come with those. A few say something in a bubble over his
head. The cushion is too shallow to sit or lie on where he lands in its middle: he settles a
little to its front, as a cat flops onto its side, and gets up back where he landed. `node
checks/willy-life.test.mjs` checks how he picks. He does not answer clicks yet. three.js and his model load only
from there, after the room is built (`ROOM.ready`), and the first load's dark waits for him
(`ROOM.holdLight`), no longer than it lasts. Without WebGL 2, or if anything fails, there is no
Willy and the room is as it is. Under reduced motion he sleeps on the cushion and does not move.

He is lit by the room's own sources (`ROOM.lights()`): its light, the window, the computer's
screen while it is on and the radio's lamp while it plays, as point lights over a soft fill. In
the dark he is cut out of the room's night layer, which is drawn flat on the screen and would
light him wherever the floor behind him is lit (`cutout()`: his shape, white, in a canvas inside
it, less wherever a face of something solid stands in front of him, `ROOM.before()`). He is lit
instead by a dim blue fill and by each source as far as it reaches him, the moon only as much of
him as is in the window's light (`ROOM.moonlit()`). His shadow is drawn in his own canvas: his
shape seen from under what he stands on, darker the nearer the ground, so it starts at his paws,
and blurred; there are no shadow maps. With the light on it falls away from it as the room's
shadows do; in the dark, away from the strongest source that reaches him, or not at all. He is drawn only when he is anywhere new, and not at all while the tab is hidden.

Over every clip `willy.js` adds the small motions that keep him from ever being quite still
(`alive()`): his back rising and falling as he breathes, slower asleep; his tail swaying, root to
tip, and now and then flicking at its tip; now and then an ear turned back a moment, or a blink;
and, while he rests, his head turned to whatever he looks at (`look()`), as far as a neck turns.
`willy-room.js` has him look, every few seconds, at one of the room's sources that is on (the
window, the screen, the radio's lamp), at the reader, or at nothing. None of it under reduced
motion.

three.js r186 is in `vendor/three/` (see its README), behind the import map in `index.html`.

Where he can go (the desk, the cushion, the shelf) is worked out by `willy-paths.js` from what
the room says (`ROOM.surfaces`, `ROOM.jumps`, `ROOM.clear`, `ROOM.ground`) and the room each clip
takes, measured on the model by `willy.js`. He walks round tall things and over low ones (the
notebooks), turning as he steps; on a low thing each paw stands on the ground under it, his
body tilted between them and each leg bent to reach (`willy.js`, `stand()`); he turns on the spot only where he has room to. A route is a
promise: the search takes a few ms of each frame, so the page never waits on it. It heads
straight for the end, and when that takes long, it is led round whatever is in the way by how
far the end is from each point. `node checks/willy-paths.test.mjs` checks the planner on a
made-up room, and how soon it finds a walk across it.
