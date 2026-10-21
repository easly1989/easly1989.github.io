# What the real-time cat costs to ship

Research for issue #36, a child of the map #33. Everything below was checked on 2026-10-21 against first-party sources, each linked where it is used. Numbers I measured myself say so. Things I could not verify say so too.

## Summary

| Point | Answer |
|---|---|
| Smallest module set | `three.module.js` (the WebGL renderer) + `three.core.js` (scene graph, `SkinnedMesh`, `AnimationMixer`) + `GLTFLoader` + its two helpers `BufferGeometryUtils` and `SkeletonUtils`. Five files. |
| Size, minified | 878,611 B raw, **214,460 B gzipped (about 209 KB)**. Measured in a browser from jsDelivr (Brotli): 233,363 B on the wire with `GLTFLoader` unminified. |
| Version, licence | three.js **r186** (npm `0.186.1`, released 2026-09-24), **MIT**. |
| Delivery | Both work. r186 ships **no minified builds**, so a "minified CDN" file is jsDelivr's on-the-fly Terser output, and its own docs say never to put SRI on it. Pinned jsDelivr URLs through an import map work with no build step. Vendoring costs about 880 KB of minified files in the repo. |
| The model | **233 KB** as `.glb` with a 512 px baked coat (PNG 24.5 KB of it), **221 KB** with 256 px (PNG 11.9 KB). 141 KB with no texture and no eyes. |
| Fallback | `new WebGLRenderer()` throws when no WebGL 2 context can be made. Catch it, and leave the page as it is. The cat is simply absent. |
| Idle cost | `renderer.setAnimationLoop(null)` stops the loop. Pause on `visibilitychange`, stop when the cat holds a pose, wake from a timer or an event. `THREE.Timer` with `connect(document)` avoids the time jump on return. |

## 1. Size: the smallest set of modules

three.js has no separate "animation" package. The files that matter in the npm package [`three@0.186.1`](https://www.npmjs.com/package/three) are (sizes from the [jsDelivr file listing](https://data.jsdelivr.com/v1/packages/npm/three@0.186.1?structure=flat), which reads the npm package):

| File | Holds | Raw (B) |
|---|---|---|
| `build/three.module.js` | `WebGLRenderer` and the WebGL back end. It imports `./three.core.js`. | 662,772 |
| `build/three.core.js` | Everything that is not the renderer: `Scene`, cameras, `Object3D`, `SkinnedMesh`, `Skeleton`, `Bone`, `AnimationMixer`, `AnimationClip`, `Timer`, materials, loaders, maths. | 1,458,113 |
| `examples/jsm/loaders/GLTFLoader.js` | the glTF 2.0 loader. Imports `three`, `../utils/BufferGeometryUtils.js` and `../utils/SkeletonUtils.js`. | 117,570 |
| `examples/jsm/utils/BufferGeometryUtils.js` | needed by `GLTFLoader` | 37,712 |
| `examples/jsm/utils/SkeletonUtils.js` | needed by `GLTFLoader` | 11,535 |

`AnimationMixer`, `SkinnedMesh` and the skeleton code are in `three.core.js`, so playing a skinned clip needs no extra module. The loader's imports were read from the minified file; the three files together form the closed set, with no other import.

**There is no tree-shaking without a bundler.** Loading `three.core.js` as a module loads all of it, used or not. That is why core is the bigger of the two files.

### Minified and gzipped

r186 removed the minified builds from the package (its [release notes](https://github.com/mrdoob/three.js/releases/tag/r186) list "minified builds removed"), and the file listing above has no `.min.js`. [jsDelivr minifies any `.js` on request when you add `.min`](https://github.com/jsdelivr/jsdelivr#usage) and the files say so in their header ("Minified by jsDelivr using Terser v5.48.0"). The registry has no size data for those, so I fetched the five single files to a temp folder and measured them (nothing was installed or run):

| File | Minified (B) | gzip -9 (B) |
|---|---|---|
| `three.module.min.js` | 392,831 | 89,846 |
| `three.core.min.js` | 415,816 | 104,105 |
| `GLTFLoader.min.js` | 50,878 | 14,012 |
| `BufferGeometryUtils.min.js` | 14,343 | 4,631 |
| `SkeletonUtils.min.js` | 4,743 | 1,866 |
| **Total** | **878,611** | **214,460** |

Transfer sizes measured in a real Chromium page (the test below), as jsDelivr sent them with Brotli: `three.module.min.js` 90,124 B, `three.core.min.js` 104,314 B, and the three addon files **unminified** 26,587 + 9,004 + 3,334 B. That is **233,363 B** for the five. The same files unminified, Brotli, from the `Content-Length` headers: 132,469 + 266,288 + 26,587 + 9,004 + 3,334 = 437,682 B.

Not measured: a tree-shaken bundle (Rollup or esbuild over `WebGLRenderer`, `GLTFLoader` and `AnimationMixer` only). It needs an npm install, which this ticket was told not to do. The renderer file is mostly irreducible, so the saving would come from `three.core.js`. How much is unknown. It also needs a build step, even if run once and committed, so it is an option for later, not part of the baseline.

Compressed sizes assume the host compresses. I did not check whether GitHub Pages compresses `.js` or `.glb`; the [Pages limits page](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) says nothing about it.

## 2. Version and licence

- Current release: **r186**, npm `0.186.1` (npm `dist-tags.latest`, [registry](https://registry.npmjs.org/three/latest)). The [GitHub release](https://github.com/mrdoob/three.js/releases/tag/r186) `r186` is marked latest and was published 2026-09-24. The package is 20,443,256 B unpacked, 1,263 files: nothing here needs more than the five files above.
- Licence: **MIT**, "Copyright (c) 2010-2026 three.js authors" ([LICENSE](https://github.com/mrdoob/three.js/blob/master/LICENSE), also the npm `license` field). The minified files keep an `@license` comment. MIT asks that the notice travels with copies, which matters if the files are vendored.
- r186 needs **WebGL 2**: `WebGLRenderer` only asks for a `webgl2` context ([source, r186](https://github.com/mrdoob/three.js/blob/r186/src/renderers/WebGLRenderer.js)).
- `THREE.Clock` is deprecated since r183 and warns; use `THREE.Timer` ([`Clock.js`](https://github.com/mrdoob/three.js/blob/r186/src/core/Clock.js)).

## 3. Delivery: vendor or CDN

**Import maps work with no build step.** The three.js [installation manual](https://github.com/mrdoob/three.js/blob/r186/manual/pages/installation.html) shows exactly this for CDN use, with `jsDelivr` and a pinned version:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
  }
}
</script>
```

[MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap): import maps are Baseline widely available since March 2023, must come before the modules that use them, and **must be inline** (no `src`). `GLTFLoader` imports the bare specifier `three`, so the map is required either way.

The manual's own warnings for the CDN route: keep every file on the same version and the same CDN, and "if the CDN goes down, your website will stop working too".

**Pinned versions suit the site's rule.** [jsDelivr](https://github.com/jsdelivr/jsdelivr#usage): exact versions get one-year cache headers and permanent storage; ranges and `latest` are not for production. The responses I saw carry `cache-control: public, max-age=31536000, immutable`. `cdn.jsdelivr.net/npm/` and an exact version are both what the site's rule asks for.

### Two findings that change how to do it

1. **`three.module.min.js` imports `./three.core.js`, the unminified file** (verified in the file's `from"./three.core.js"`). Loaded as is, the page fetches the 1.4 MB core (266 KB Brotli) beside the minified renderer. An import map can remap the resolved URL, which MDN confirms for absolute-URL keys, and I verified it in Chromium:

   ```json
   "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.js":
     "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.min.js"
   ```

   With that line the page fetched `three.core.min.js` and never `three.core.js`. The same trick can point `three/addons/loaders/GLTFLoader.js` at its `.min.js` and save about 12 KB gzipped, but the prefix map does not do it, so it needs one key per addon file.

2. **SRI cannot be used on the auto-minified files.** The import map has an [`integrity` key](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) (MDN does not say which browsers support it), but jsDelivr [says not to use SRI on dynamically generated files](https://www.jsdelivr.com/using-sri-with-dynamic-files): their bytes can change, for example when files are regenerated during a failover. SRI is fine on the unminified originals, which are static, at a cost of about 437 KB over the wire instead of 233 KB.

### Weighing it

| | CDN, pinned, import map | Vendored in the repo |
|---|---|---|
| Repo weight | none | minified copies about 880 KB raw (215 KB gzipped); the unminified originals about 2.3 MB. Pages' [limit](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) is 1 GB per site. |
| Rule | fits: allowed host, exact pin | not covered by the list, since it is not an external script. No fetch of anything from a third party. |
| Build step | none | none; copy the files from jsDelivr once. Keep the MIT notice. |
| Integrity | SRI only on unminified files | the bytes are the repo's own, so reviewable and frozen |
| Failure | CDN down or blocked means no cat. Acceptable here, since the resting page shows everything without it (the site's own rule). | cannot fail on a third party |
| Upgrade | change one version string in the map | replace the files |

Both are viable. A lean, to be settled in the spec: **CDN with the exact pin, the `three.core` remap, and the cat loaded lazily with a dynamic `import()` after first paint**, so a blocked CDN costs only the cat. Vendor instead if the reader wants SRI with the small files or no third party at all. I tested that a dynamic `import("three")` through the map works.

The phone (under 900px) has no cat, so it should skip the import entirely and download none of this.

## 4. The model

Source: Quaternius, [Animated Animales Low Poly (Animal Pack Vol.2)](https://opengameart.org/content/animated-animales-low-poly), **CC0**, 2.1 MB zip. `Cat.blend` has one mesh (406 vertices, 402 faces, **no UV map**), a 24-bone armature with IK legs, and two actions only: **Idle** and **Walking** (40 frames at 24 fps).

The coat in `render_v3.py` is a Blender node shader driven by a per-vertex `rest` position and a noise node. glTF carries only Principled BSDF inputs and images, so the coat has to be baked.

I worked on a copy of `Cat.blend` in a temp folder, with Blender 5.2.2. I ran the coat and eyes sections of `render_v3.py`, added a Smart UV unwrap, baked the DIFFUSE colour pass with Cycles into one image, put it on one material, and exported with the Blender glTF exporter (animations as actions, IK baked to keys). The unwrap is quick and unrefined (the baked sheet is mostly flat white and black), so the texture sizes below are representative for a flat two-colour coat, and a hand unwrap would change them little.

| Variant | `.glb` size | Texture in it | gzip -9 of the `.glb` |
|---|---|---|---|
| No texture, the file's own materials, no eyes | 140,612 B | none | 45,001 B |
| Baked 256 px, PNG | **220,540 B** | 11,851 B | 69,372 B |
| Baked 256 px, JPEG q85 | 219,796 B | 11,105 B | 68,094 B |
| Baked 512 px, PNG | **233,212 B** | 24,522 B | 81,497 B |
| Baked 512 px, JPEG q85 | 235,476 B | 26,785 B | 81,855 B |

- PNG is as small as JPEG here and keeps the hard edges; glTF 2.0 stores only [PNG and JPEG](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc), inside the GLB through a `bufferView`.
- The baked files are about 80 KB larger than the plain one, but the texture is only 12 to 25 KB of that. The rest is the two eyes and two pupils (four sphere meshes, 1,488 vertices) and the UV set. The cat mesh is 1,609 vertices in the file, flat-shaded.
- **Animation:** 72 channels per clip, sampled per frame because the IK legs cannot be written as is. Measured from the accessors: Idle about 11 KB, Walking about 16 KB. Each further clip at this rig and length costs about 11 to 16 KB raw. The README says there are only these two clips, so grooming, sitting and the rest need new clips or procedural posing. That is outside this question, but it is where the size will grow.
- The GLB container is a 12-byte header and a JSON chunk and a binary chunk ([spec](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc)); the files above have a JSON chunk of about 37 to 40 KB.
- Draco and Meshopt are not worth their decoders at 1,609 vertices: `draco_decoder.wasm` alone is 285,747 B and `meshopt_decoder.module.js` 29,256 B (jsDelivr listing).

A test page loaded the 512 px PNG file through the import map above, with `GLTFLoader`, and built an `AnimationMixer` on it: the revision was 186, it parsed, and it found both clips (Idle and Walking, 1.67 s each). The import and the load took 351 ms on localhost. I could not watch frames: the in-app browser pane did not fire `requestAnimationFrame` at all (the site's CLAUDE.md warns that a non-painting preview behaves this way), so rendering was not verified here.

**First-visit total** on the wire, as measured: 233,363 B of three.js (Brotli, the addons unminified) + 233,212 B of cat (uncompressed, from a local server) = about **466 KB**, or about 315 KB if the `.glb` compresses to its gzip size above.

## 5. Detecting missing or blocked WebGL

- `HTMLCanvasElement.getContext()` [returns `null`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) when it cannot make the context. `WebGLRenderer` in r186 requests only `webgl2`, and its constructor **throws** `THREE.WebGLRenderer: Error creating WebGL context.` when it gets `null` ([source, lines 407 to 421](https://github.com/mrdoob/three.js/blob/r186/src/renderers/WebGLRenderer.js)). Wrap the construction in `try`/`catch`.
- The canvas also fires [`webglcontextcreationerror`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextcreationerror_event) with a `statusMessage` for logging; `WebGLRenderer` listens to it itself.
- **Software rendering:** the renderer takes `failIfMajorPerformanceCaveat` ([source, line 82](https://github.com/mrdoob/three.js/blob/r186/src/renderers/WebGLRenderer.js)). [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext): with it the browser returns `null` instead of a slow software context. For a cat that is a decoration, set it to `true`, so a machine with no GPU gets the fallback rather than a stuttering cat.
- Without module or import-map support, `import("three")` rejects: catch that too. Both are the same fallback.
- three.js ships a check, `three/addons/capabilities/WebGL.js` (`isWebGL2Available()`, `getWebGL2ErrorMessage()`, [source](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/capabilities/WebGL.js)). It makes a throw-away canvas and context and its message is a full-page box meant for demos. Not needed when the constructor is in a `try`.
- **Context loss after start:** [the WebGL spec](https://registry.khronos.org/webgl/specs/latest/1.0/) requires `preventDefault()` on `webglcontextlost` for the context to be restored. `WebGLRenderer` already does that, skips rendering while lost, and reinitialises on restore (source, `onContextLost`, `onContextRestore`, and the `_isContextLost` check in the frame callback). The page has nothing to add.

**The usual fallback is progressive enhancement**: ship the page without the cat, create the canvas hidden, and show it only after the first successful render. If anything throws, remove the canvas and leave the scene. No message, no error UI. That matches the site's rule that the resting state is the visible one and that a page whose scripts never load shows everything. A static drawing of the cat (the sprite sheet the map dropped) would also be a fallback; the map has dropped the sprites for their size, so absent is the cheaper choice.

## 6. Costing nothing at rest

- Browsers [generally pause `requestAnimationFrame` in background tabs](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) and hidden iframes. MDN's [Page Visibility page](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) says this is browser policy, not something to rely on as the pause mechanism, and shows `visibilitychange` with `document.hidden` as the way to pause work yourself.
- **Stop the loop:** `renderer.setAnimationLoop(null)` stops it and `setAnimationLoop(fn)` starts it again ([source, lines 1609 to 1616](https://github.com/mrdoob/three.js/blob/r186/src/renderers/WebGLRenderer.js)). The three.js manual's [rendering on demand](https://github.com/mrdoob/three.js/blob/r186/manual/pages/rendering-on-demand.html) explains the idea: render once, then only when something changes, because a loop that renders an unchanged frame wastes power and battery.
- **When the cat is still:** the loop is needed only while a pose changes. When the cat holds a still pose (sleeping with the clip paused, sitting), render the last frame, call `setAnimationLoop(null)`, and wake it from the next scheduled behaviour (a `setTimeout`) or a click on the cat. A looping breathing idle does need frames, so it is a choice: pause the clip, or accept a loop at a low rate.
- **Time delta:** `THREE.Timer` calls `connect(document)` to use the Page Visibility API "to avoid large time delta values" when the tab was hidden ([`Timer.js`](https://github.com/mrdoob/three.js/blob/r186/src/core/Timer.js)). Use it instead of the deprecated `Clock`. `AnimationMixer.update(delta)` takes the delta, and the mixer has a `timeScale` ([source](https://github.com/mrdoob/three.js/blob/r186/src/animation/AnimationMixer.js)).
- **Off-screen:** [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) fits deciding whether to run an animation by whether anyone sees it. On a no-scroll room it adds little; the tab-visibility pause covers the real case.
- The room is a bfcache page: stop on `pagehide`, restart on `pageshow` with `persisted`. Under `prefers-reduced-motion`, the site wants the cat asleep and moving only on click, which is the render-on-demand case.

## Sources

- three.js: [r186 release](https://github.com/mrdoob/three.js/releases/tag/r186), [npm registry](https://registry.npmjs.org/three/latest), [LICENSE](https://github.com/mrdoob/three.js/blob/master/LICENSE), [installation manual](https://github.com/mrdoob/three.js/blob/r186/manual/pages/installation.html), [rendering on demand](https://github.com/mrdoob/three.js/blob/r186/manual/pages/rendering-on-demand.html), the r186 source of [`WebGLRenderer`](https://github.com/mrdoob/three.js/blob/r186/src/renderers/WebGLRenderer.js), [`Timer`](https://github.com/mrdoob/three.js/blob/r186/src/core/Timer.js), [`Clock`](https://github.com/mrdoob/three.js/blob/r186/src/core/Clock.js), [`AnimationMixer`](https://github.com/mrdoob/three.js/blob/r186/src/animation/AnimationMixer.js) and [`WebGL.js`](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/capabilities/WebGL.js).
- jsDelivr: [file listing for `three@0.186.1`](https://data.jsdelivr.com/v1/packages/npm/three@0.186.1?structure=flat), [README, usage](https://github.com/jsdelivr/jsdelivr#usage), [SRI with dynamic files](https://www.jsdelivr.com/using-sri-with-dynamic-files).
- MDN: [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap), [`getContext`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext), [`webglcontextcreationerror`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextcreationerror_event), [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
- Khronos: [glTF 2.0 specification](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc), [WebGL 1.0 specification](https://registry.khronos.org/webgl/specs/latest/1.0/).
- GitHub: [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- Model: [Quaternius, Animal Pack Vol.2, on OpenGameArt](https://opengameart.org/content/animated-animales-low-poly) (CC0).

## Not verified

- A tree-shaken bundle's size.
- Whether GitHub Pages compresses `.js` or `.glb`.
- Frame rendering and frame time (the preview pane does not paint). Only loading, parsing and the mixer were exercised.
- Which browsers honour the import-map `integrity` key.
