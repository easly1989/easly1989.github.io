# three.js

[three.js](https://threejs.org) r186 (npm `three@0.186.1`), MIT licensed (`LICENSE`), for Willy
in the room and the room's light (`room-light.js`). Only what they use, as published on npm, fetched from jsDelivr:

- `build/three.module.min.js` and `build/three.core.min.js`, the minified build;
- `examples/jsm/loaders/GLTFLoader.js`, which loads his model, and the two utilities it imports,
  `examples/jsm/utils/BufferGeometryUtils.js` and `examples/jsm/utils/SkeletonUtils.js`.

For the room as a three.js scene (`room-gl.js`, #160) whole folders of the addons are here too, from
the same package (`three@0.186.1` on npm, MIT): `examples/jsm/postprocessing`, `shaders`, `geometries`,
`environments`, `math`, `lights`, `objects`, `misc` and `controls` (the workbench's orbit), not minified, since weight is no limit while the room is
built; trim them to what is used when it is done.

`index.html` maps `three` and `three/addons/` here with an import map, and maps the module
build's own import of `three.core.js` to the minified `three.core.min.js`. To update, replace
the files with the same paths of the new version and check Willy on the review page, and the
room's light with the light on and off.
