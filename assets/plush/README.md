# The plush

coordinator-monitor's object on the home: an orange felt crab, hung by a cord from a blue suction
cup. It is drawn, not downloaded: `plush.js` is its one model (three.js, from `vendor/three`), for
the room and for its pictures.

- In the room (`index.html?room`), `room-plush.js` draws the model live on the back wall, swings it
  and has it tugged; `room.js` places its link and `room-light.js` lights it with the room.
- `plush-bench.png` is the bench's picture of it, lying on its back on the mat, its cord trailing
  loose; `plush-wall.png` is the room's picture of it on the wall, with its shadow, shown where
  there is no WebGL 2.

Both pictures are drawn from `plush.js` by `render.html` in a real Chrome. After a change to the
model, draw them again from the repo root:

```bash
python assets/plush/render.py
```

It prints each picture's size: the bench picture's `width` and `height` are written on its `<img>`
in `index.html`, and its `--w` and `--h`. `python assets/plush/render.py look.png` also saves the
view it was approved in. The felt's fibres are random noise, so each drawing differs a little.
