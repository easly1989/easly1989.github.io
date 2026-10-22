// Willy, drawn by three.js into a canvas that stands inside the room's preserve-3d scene,
// facing the screen, so the browser sorts him in depth with everything else: the computer and
// the chair hide him. The camera is orthographic at the room's own isometric angle, and his
// world is the room's with y flipped (x right, y towards the back wall, z up), one unit one
// room px. He is assets/willy.glb, built from cat-src/; here he gets his fur and outline.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const SCALE = 55; // room px per model unit: cat-src/build.py makes him 388 px nose to tail tip
const W = 560; // room enough for all of him, 388 px nose to tail, whichever way he faces
const H = 560;
const ANCHOR_Z = 88; // the canvas stands at his body's middle, not at his feet
const BIAS = 50; // and a little towards the viewer, so the ground under him stays behind it
// a little long, as Willy's is; reach in model units of a cat 5.64 long, tail how much longer
// the tail's is
const FUR = { reach: 0.28, shells: 20, strands: 26, comb: 0.9, outline: 0.09, tail: 0.5 };
const LENGTH = 5.64;
// px his root is above what he stands on as he leaves it and as he meets the next, in jump-air,
// which the arc does not know (cat-src/build.py prints them)
const LIFT = [83.6, 155];
const lift = (at) => LIFT[0] + (LIFT[1] - LIFT[0]) * at;
const CLEAR = 4; // px he keeps from everything solid
const OVER = 6; // px he may hang over the edge of what he stands on, being soft
const LYING = 20; // and lying down or asleep, his paws and tail spilling over
// the fill from all round, with the room's light on and off, and how strong each of the room's
// sources is on him at full power
const FILL = [1.7, 1.0];
const STRENGTH = { room: 1.5, window: 1.4, screen: 1.2, radio: 1.4 };
const SHADOW = 0.5; // how dark his shadow is, as dark as the room's own (room.css, .shade)

// Willy in the room, with his clips. Throws if there is no WebGL 2 or the model fails to load.
export async function willy(room, stage, src = "assets/willy.glb") {
  const cv = document.createElement("canvas");
  cv.className = "willy";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;left:0;top:0;width:" + W + "px;height:" + H + "px;pointer-events:none";
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  room.appendChild(cv);
  // drawn at the size the stage shows it at
  const resize = () => {
    const s = parseFloat(getComputedStyle(stage).getPropertyValue("--s")) || 1;
    const z = parseFloat(getComputedStyle(stage).getPropertyValue("--zoom")) || 0.72;
    renderer.setPixelRatio(devicePixelRatio * s * z);
    renderer.setSize(W, H, false);
  };
  resize();
  addEventListener("resize", resize);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 6000);
  cam.up.set(0.408, 0.408, 0.816).normalize();
  const target = new THREE.Vector3(0, 0, ANCHOR_Z);
  cam.position.copy(target).addScaledVector(new THREE.Vector3(-1, -1, 1).normalize(), 3000);
  cam.lookAt(target);
  // a soft fill from all round, and the room's own sources (ROOM.lights()) as point lights,
  // moved with him, since his world is centred on him; all four always there, an unlit one at
  // nothing, so that one switching on recompiles no shader
  const sky = new THREE.HemisphereLight(0xffffff, 0x5a6470, FILL[0]);
  sky.position.set(0, 0, 1);
  scene.add(sky);
  const lamps = [0, 1, 2, 3].map(() => {
    const l = new THREE.PointLight(0xffffff, 0, 0, 0);
    scene.add(l);
    return l;
  });
  let sources = [],
    here = [0, 0, 0];
  // each source where it is from him, as strong as it is now
  const shine = () => {
    lamps.forEach((l, i) => {
      const s = sources[i];
      l.intensity = s ? s.power * (STRENGTH[s.name] ?? 1) : 0;
      if (!s) return;
      l.color.set(s.color);
      l.distance = s.reach;
      l.position.set(s.at[0] - here[0], here[1] - s.at[1], s.at[2] - here[2]);
    });
    sky.intensity = sources.some((s) => s.name === "room" && s.power) ? FILL[0] : FILL[1];
  };

  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(src);
  } catch (e) {
    // no Willy: nothing of him left in the room
    renderer.dispose();
    cv.remove();
    throw e;
  }
  const holder = new THREE.Group();
  const model = gltf.scene;
  model.rotation.x = Math.PI / 2; // glTF is y-up; the room is z-up
  model.scale.setScalar(SCALE);
  holder.add(model);
  scene.add(holder);
  const skinned = [];
  model.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
    if (o.isSkinnedMesh) skinned.push(o);
  });
  // matte, so the coat does not shine like plastic
  for (const mesh of skinned) mesh.material = new THREE.MeshLambertMaterial({ map: mesh.material.map });
  fur(skinned);
  outline(skinned);

  const mixer = new THREE.AnimationMixer(model);
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
  const size = measure(model, skinned, mixer, clips);
  const blob = shadow(size.idle);
  scene.add(blob);
  // his many shaders (one a shell of fur) compiled in the background where the browser can,
  // rather than all at once in his first frame
  await renderer.compileAsync(scene, cam);
  // lit as the room is, and drawn again whenever its lights change
  sources = window.ROOM.lights();
  window.ROOM.onLights(() => {
    sources = window.ROOM.lights();
    shine();
    renderer.render(scene, cam);
  });
  const moments = (clip, at) => {
    const m = size[clip].moments;
    return at == null ? m : [m[Math.min(m.length - 1, Math.max(0, Math.round(at * (m.length - 1))))]];
  };

  return {
    canvas: cv,
    clips,
    mixer,
    // where he stands, in room px (z the height of what he stands on), and which way he
    // faces, in degrees: 0 along the room's x, 90 towards the back wall
    // On a low thing he walks over (room.js, ground()) he stands on its top: as high as the
    // ground under his front and his hind paws, between them, so he climbs on and off it.
    // His shadow lies on that; in the air, on under.z, what is under him, his paws under.by
    // above it, and fades the higher they are. As the room's own shadows do (room.css,
    // .shade), it falls away from a light high behind on the left, further the taller he is
    // and the higher in the air.
    place(x, y, z, heading, under = null) {
      const r = (heading * Math.PI) / 180,
        f = [Math.cos(r), -Math.sin(r)],
        reach = [size.idle.x1 * 0.6, size.idle.x0 * 0.35];
      if (!under) {
        z = reach.reduce((s, d) => s + window.ROOM.ground(x + f[0] * d, y + f[1] * d, z), 0) / reach.length;
        under = { z, by: 0 };
      }
      const b = BIAS / Math.sqrt(3);
      cv.style.transform = "translate3d(" + (x - b - W / 2) + "px," + (y + b - H / 2) + "px," + (z + ANCHOR_Z + b) + "px) rotateZ(45deg) rotateX(-54.7356deg)";
      holder.rotation.z = blob.rotation.z = r;
      // (the room's y runs towards the viewer, his world's the other way)
      blob.position.set(size.idle.z1 * 0.18 + under.by * 0.5, -(size.idle.z1 * 0.3 + under.by * 0.8), under.z - z + 0.5);
      blob.material.opacity = SHADOW * Math.max(0, 1 - under.by / 300);
      here = [x, y, z];
      shine();
    },
    draw(dt) {
      mixer.update(dt);
      renderer.render(scene, cam);
    },
    size,
    // whether he fits at x, y, standing at z and facing heading, in that clip: clear of
    // everything solid in the room (but what makes the surfaces named in past), wholly on the
    // surface on, when one is given, and at the moment at (0 to 1 of the way through the
    // clip), or at every moment of it
    fits(x, y, z, heading, clip, { on = null, at = null, past = [] } = {}) {
      return moments(clip, at).every((m, i, all) => {
        const over = /^(lie|sleep|wake)/.test(clip) ? LYING : OVER;
        if (on && !shape(m, x, y, z, heading, 0).parts[0].q.every(([a, b]) => a >= on.x0 - over && a <= on.x1 + over && b >= on.y0 - over && b <= on.y1 + over)) return false;
        return window.ROOM.clear(shape(m, x, y, up(z, clip, at, i, all.length), heading), past);
      });
    },
    // what he goes into there, by name, to say why a place is refused
    into: (x, y, z, heading, clip, at = null) => [...new Set(moments(clip, at).flatMap((b, i, all) => window.ROOM.into(shape(b, x, y, up(z, clip, at, i, all.length), heading))))],
    // how high his root is above the arc, at that moment of jump-air
    lift,
  };
}

// The room each clip takes, in px in his own frame: x0 to x1 ahead of the point he stands on,
// y0 to y1 to his left, up to z1; over the whole clip, and at each of a few moments of it, since
// a clip that changes his shape (from standing to curled up) takes less at any one moment than
// over all of them. Measured on the posed mesh. A cycle (the walk, idle) is checked whole. A
// turn turns him about where he stands: each of its moments is measured the way he faces by
// then, and says by how much (yaw, degrees), or a cat half way round would take a square.
const MOMENTS = 8;
function measure(model, skinned, mixer, clips) {
  const out = {};
  const box = new THREE.Box3(),
    v = new THREE.Vector3();
  const plain = (b, yaw = 0) => ({ x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z1: b.max.z, yaw });
  const head = model.getObjectByName("Head"),
    spine = model.getObjectByName("Spine");
  const facing = () => {
    const d = head.getWorldPosition(new THREE.Vector3()).sub(spine.getWorldPosition(new THREE.Vector3()));
    return Math.atan2(d.y, d.x);
  };
  for (const [name, a] of Object.entries(clips)) {
    const turn = name.startsWith("turn") && head && spine;
    const at = [],
      yaws = [];
    a.play();
    let rest = 0;
    for (let k = 0; k <= MOMENTS * 2; k++) {
      a.time = (a.getClip().duration * k) / (MOMENTS * 2);
      mixer.update(0);
      model.updateMatrixWorld(true);
      const here = new THREE.Box3();
      if (turn) {
        if (k === 0) rest = facing();
        const yaw = facing() - rest,
          c = Math.cos(-yaw),
          s = Math.sin(-yaw);
        for (const m of skinned)
          for (let i = 0; i < m.geometry.attributes.position.count; i++) {
            m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
            here.expandByPoint(v.set(v.x * c - v.y * s, v.x * s + v.y * c, v.z));
          }
        yaws.push((yaw * 180) / Math.PI);
      } else {
        for (const m of skinned) {
          m.computeBoundingBox();
          here.union(box.copy(m.boundingBox).applyMatrix4(m.matrixWorld));
        }
        yaws.push(0);
      }
      at.push(here);
    }
    a.stop();
    const all = at.reduce((u, b) => u.union(b), new THREE.Box3());
    // each moment holds the samples either side of it too, so nothing slips between two
    const moments = [];
    for (let i = 0; i <= MOMENTS; i++) moments.push(plain(at.slice(Math.max(0, 2 * i - 1), 2 * i + 2).reduce((u, b) => u.union(b), new THREE.Box3()), yaws[2 * i]));
    out[name] = { ...plain(all), moments: name === "walk" || name === "idle" ? [plain(all)] : moments };
  }
  // "turn": what any turn takes at any moment of it, the way he faces then
  const turns = Object.values(out).filter((c) => c.moments.some((m) => m.yaw));
  if (turns.length) {
    const u = (k, f) => f(...turns.flatMap((c) => c.moments.map((m) => m[k])));
    const all = { x0: u("x0", Math.min), x1: u("x1", Math.max), y0: u("y0", Math.min), y1: u("y1", Math.max), z1: u("z1", Math.max), yaw: 0 };
    out.turn = { ...all, moments: [all] };
  }
  return out;
}

// how high he is at z in that clip: the arc holds him up in the air, his root above it
function up(z, clip, at, i, n) {
  return clip === "jump-air" ? z + lift(at ?? (n > 1 ? i / (n - 1) : 0)) : z;
}

// that room where he stands, as the room measures its own things (room.js, bounds()): turned
// to his heading, clear px larger, from just above what he stands on
function shape(b, x, y, z, heading, clear = CLEAR) {
  const r = ((heading + b.yaw) * Math.PI) / 180,
    f = [Math.cos(r), -Math.sin(r)],
    l = [-Math.sin(r), -Math.cos(r)]; // his left, in the room (whose y runs the other way)
  const q = [[b.x0 - clear, b.y0 - clear], [b.x1 + clear, b.y0 - clear], [b.x1 + clear, b.y1 + clear], [b.x0 - clear, b.y1 + clear]].map(([u, v]) => [x + f[0] * u + l[0] * v, y + f[1] * u + l[1] * v]);
  const xs = q.map((p) => p[0]),
    ys = q.map((p) => p[1]);
  const part = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), q };
  return { ...part, z0: z + 2, z1: z + b.z1, parts: [part] };
}

// His shadow: a soft dark blob under his body and legs, not his tail, on what he stands on. No
// shadow maps: the room's sources are too many and too soft for one to mean anything.
function shadow(b) {
  // a disc in rings, black, even over most of it and fading out at its rim, as the room's
  // blurred shadows do (most of it is under him)
  const g = new THREE.RingGeometry(0, 0.5, 32, 8);
  const p = g.attributes.position,
    rgba = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    const out = Math.min(1, Math.max(0, (2 * Math.hypot(p.getX(i), p.getY(i)) - 0.7) / 0.3));
    rgba[i * 4 + 3] = 1 - out * out * (3 - 2 * out);
  }
  g.setAttribute("color", new THREE.BufferAttribute(rgba, 4));
  // as long as his body and head, about as wide again as he is, turned with him (the room
  // turns it about where he stands)
  const x0 = b.x0 * 0.5,
    x1 = b.x1;
  g.scale(x1 - x0, (b.y1 - b.y0) * 1.7, 1).translate((x0 + x1) / 2, (b.y0 + b.y1) / 2, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  m.renderOrder = -1;
  return m;
}

// Fur: shells over the body, each a hair further out, with fewer strands kept the further out
// it is, combed back and down towards the tail, and longer on the tail. The coat's own colour
// carries through.
export function fur(skinned, options = {}) {
  const f = { ...FUR, ...options };
  const n = 128;
  const data = new Uint8Array(n * n);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 255;
  const strands = new THREE.DataTexture(data, n, n, THREE.RedFormat);
  strands.wrapS = strands.wrapT = THREE.RepeatWrapping;
  strands.magFilter = strands.minFilter = THREE.NearestFilter; // one texel, one strand
  strands.needsUpdate = true;
  const v = (a) => "vec3(" + a.map((n) => n.toFixed(3)).join(", ") + ")";
  for (const mesh of skinned) {
    const unit = size(mesh) / LENGTH,
      comb = combOf(mesh);
    tailOf(mesh);
    for (let i = 1; i <= f.shells; i++) {
      const t = i / f.shells;
      const h = f.reach * unit * t,
        keep = 0.3 + 0.65 * t * t,
        shade = 0.8 + 0.2 * t,
        tip = 0.07 * t,
        lean = f.comb * h * t;
      const m = new THREE.MeshLambertMaterial({ map: mesh.material.map });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.strands = { value: strands };
        sh.vertexShader =
          "attribute float tailw;\n" +
          sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  float grow = 1.0 + tailw * " + f.tail.toFixed(3) + ";\n  transformed += (normal * " + h.toFixed(5) + " + " + v(comb) + " * " + lean.toFixed(5) + ") * grow;");
        sh.fragmentShader =
          "uniform sampler2D strands;\n" +
          sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n  float s = texture2D(strands, vMapUv * " + f.strands.toFixed(1) + ").r;\n  if (s < " + keep.toFixed(3) + ") discard;\n  diffuseColor.rgb = diffuseColor.rgb * " + shade.toFixed(3) + " * (0.9 + 0.2 * s) + " + tip.toFixed(3) + ";");
      };
      mesh.parent.add(twin(mesh, mesh.geometry, m));
    }
  }
  // the body under the fur is a little darker, as the roots are
  for (const mesh of skinned) mesh.material.color.setScalar(0.82);
}

// A thin dark outline: the body again, a hair larger, drawn from the inside. It sits inside
// the fur, so the strands fray the edge beyond it.
export function outline(skinned, options = {}) {
  const f = { ...FUR, ...options };
  for (const mesh of skinned) {
    const grow = FUR.reach * f.outline * (size(mesh) / LENGTH); // as thin under long fur as under short
    const g = mesh.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!["position", "skinIndex", "skinWeight"].includes(k)) g.deleteAttribute(k);
    const merged = mergeVertices(g);
    merged.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color: 0x262626, side: THREE.BackSide });
    mat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normal * " + grow.toFixed(4) + ";");
    };
    mesh.parent.add(twin(mesh, merged, mat));
  }
}

// the longest side of the mesh at rest, in its own units
function size(mesh) {
  mesh.geometry.computeBoundingBox();
  const s = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z);
}

// where a bone stands at rest, in the mesh's own space
function rest(mesh, i) {
  return new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[i].clone().invert()).applyMatrix4(mesh.bindMatrixInverse);
}

// back along the body, from the head to the tail, and down: the way his hair lies
function combOf(mesh) {
  const bones = mesh.skeleton.bones.map((b) => b.name);
  const head = bones.indexOf("Head"),
    tail = bones.indexOf("tail");
  if (head < 0 || tail < 0) return [-0.75, -0.65, 0];
  const back = rest(mesh, tail).sub(rest(mesh, head)).setY(0).normalize();
  return [back.x * 0.75, -0.65, back.z * 0.75];
}

// how much of each point the tail's bones carry, as the attribute tailw
function tailOf(mesh) {
  const g = mesh.geometry;
  if (g.getAttribute("tailw")) return;
  const tail = new Set(mesh.skeleton.bones.flatMap((b, i) => (/^tail/i.test(b.name) || /^Bone00[4-7]$/.test(b.name) ? [i] : [])));
  const idx = g.getAttribute("skinIndex"),
    wt = g.getAttribute("skinWeight"),
    out = new Float32Array(idx.count);
  for (let i = 0; i < idx.count; i++) for (let k = 0; k < 4; k++) if (tail.has(idx.getComponent(i, k))) out[i] += wt.getComponent(i, k);
  g.setAttribute("tailw", new THREE.BufferAttribute(out, 1));
}

// another skinned mesh on the same skeleton, in the same place
function twin(mesh, geometry, material) {
  const t = new THREE.SkinnedMesh(geometry, material);
  t.frustumCulled = false;
  t.position.copy(mesh.position);
  t.quaternion.copy(mesh.quaternion);
  t.scale.copy(mesh.scale);
  t.bind(mesh.skeleton, mesh.bindMatrix);
  return t;
}
