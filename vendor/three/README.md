# three.js

[three.js](https://threejs.org) r186 (npm `three@0.186.1`), MIT licensed (`LICENSE`), for Willy
in the room. Only what he uses, as published on npm, fetched from jsDelivr:

- `build/three.module.min.js` and `build/three.core.min.js`, the minified build;
- `examples/jsm/loaders/GLTFLoader.js`, which loads his model, and the two utilities it imports,
  `examples/jsm/utils/BufferGeometryUtils.js` and `examples/jsm/utils/SkeletonUtils.js`.

`index.html` maps `three` and `three/addons/` here with an import map, and maps the module
build's own import of `three.core.js` to the minified `three.core.min.js`. To update, replace
the files with the same paths of the new version and check Willy on the review page.
