"""Build Willy, assets/willy.glb, from the AnimX cat (Fully Animated Cats, licensed from the
Unity Asset Store), whose files sit in cat-src/animx/, git-ignored: see README.md.

    blender -b --python cat-src/build.py -- [out.glb] [size]

Takes the model's lightest level of detail and the clips Willy uses, made to stand where he is
put (the clips' own travel is taken out: the room moves him); makes him chubbier, with a fuller
tail; gives him his coat, from Carlo's photos, and his sage eyes with an upright slit; checks no
clip takes him through the ground; and exports a .glb.
"""
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(ARGS[0]) if ARGS else os.path.join(HERE, "..", "assets", "willy.glb")
SRC = os.path.join(HERE, "animx")
LOD = 5  # 1,900 triangles: at the room's size it looks as the 10,500 of LOD3 do
CHUB = 1.1
TAIL_FLUFF = 0.015  # of his length, nose to tail tip
# model units nose to tail tip: 1.25 times the 310 room px of the first Willy, as Carlo has him:
# nearer the things in the room, and still small enough to get round them and up on the perch
LENGTH = 5.64 * (float(ARGS[1]) if len(ARGS) > 1 else 1.25)
PX = 55  # room px per model unit, as willy.js has it
SOFT = 6 * LENGTH / 5.64  # px a paw may press into what he stands on
# the model's clips Willy uses, by the names they go by here
CLIPS = {
    "Base": "idle", "Walk_F": "walk",
    "Turn-45_L": "turn-left-45", "Turn-45_R": "turn-right-45", "Turn-90_L": "turn-left", "Turn-90_R": "turn-right",
    "Sit_to": "sit", "Sit_Idle": "sit-idle", "Sit_from": "sit-from",
    "Lie_to": "lie", "Lie_idle": "lie-idle", "Lie_from": "lie-from",
    "Sleep_to": "curl", "Sleep_idle": "sleep-idle", "Sleep_from": "uncurl",
    "InPlace": "jump",
}
# the jump comes whole; the room draws the arc, so it is cut where he leaves the ground and where
# he meets it again (frames, at 30 a second)
JUMP = {"jump-up": (1, 21), "jump-air": (21, 61), "jump-land": (61, 79)}
# the clips the room plays, each one or more of those in a row: he goes to sleep from standing by
# lying down and then curling up, and wakes the other way round
TRACKS = {n: [(n, None)] for n in CLIPS.values() if n not in ("curl", "uncurl", "jump")}
TRACKS["sleep"] = [("lie", None), ("curl", None)]
TRACKS["wake"] = [("uncurl", None), ("lie-from", None)]
TRACKS.update({n: [("jump-air" if n == "jump-air" else "jump", r)] for n, r in JUMP.items()})

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, "Cat_R_noFur.fbx"))
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for o in list(bpy.data.objects):
    if o.type == "MESH" and not o.name.endswith(f"_LOD{LOD}"):
        bpy.data.objects.remove(o)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]

# the clips, taken from the animation files onto this armature
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
kept = {}
for f in sorted(os.listdir(SRC)):
    if f.startswith("A_Cat_") and f.endswith(".fbx"):
        objs = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, f))
        for o in set(bpy.data.objects) - objs:
            bpy.data.objects.remove(o)
for a in list(bpy.data.actions):
    name = a.name.split("|")[-1]
    if name in CLIPS and CLIPS[name] not in kept:
        a.name = CLIPS[name]
        kept[a.name] = a
    else:
        bpy.data.actions.remove(a)


def curves(a):
    if hasattr(a, "fcurves"):
        return a.fcurves
    return a.layers[0].strips[0].channelbag(a.slots[0]).fcurves


# where he goes is the room's to say: the root stays where he stands. A turn keeps the root's
# turn, which is about that same point; the room turns him by as much once it ends. Taking off
# and landing keep the root's height, which lifts the body while the paws are still on the
# ground; in the air he has none, and the room's arc starts and ends that high (LIFT, printed
# below, is what willy.js must hold).
ROOT = 'pose.bones["Root"].location'
kept["jump-air"] = kept["jump"].copy()
stride = kept["walk"].copy()  # to measure his stride by, before the walk is made to stand
for c in [c for c in curves(stride) if c.data_path in ("location", "rotation_euler", "rotation_quaternion", "scale")]:
    curves(stride).remove(c)
# the files also key the armature object itself, at rest, which would undo his size here
OBJECT = ("location", "rotation_euler", "rotation_quaternion", "scale")
for name, a in kept.items():
    fc = curves(a)
    for c in [c for c in fc if c.data_path in OBJECT or c.data_path == ROOT and (name != "jump" or c.array_index != 2)]:
        fc.remove(c)
ad = rig.animation_data or rig.animation_data_create()


def frames(a, r):
    return r or (int(a.frame_range[0]), int(a.frame_range[1]))


def use(a):
    ad.action = a
    if hasattr(ad, "action_slot") and a.slots:
        ad.action_slot = a.slots[0]


for name, pieces in TRACKS.items():
    track = ad.nla_tracks.new()
    track.name = name
    at = 1
    for n, r in pieces:
        a = kept[n]
        f0, f1 = frames(a, r)
        st = track.strips.new(n, at, a)
        if hasattr(st, "action_slot") and a.slots:
            st.action_slot = a.slots[0]
        st.action_frame_start, st.action_frame_end = f0, f1
        at = int(st.frame_end) + 1
    track.mute = True
ad.action = None

# the eyes: the sage iris with the upright slit over it (in Unity a shader put the two together),
# and no cornea
def load(name, size):
    img = bpy.data.images.load(os.path.join(SRC, name))
    img.scale(size, size)
    return img


def pixels(img):
    a = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(-1, 4)


def plain(name, img):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 1
    tex = m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = img
    m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return m


slit = pixels(load("T_Eyes_pupil_mask.png", 512))[:, :1]
iris = pixels(load("T_Cat.eye_Black.png", 512))
iris[:, :3] = iris[:, :3] * (1 - slit) + 0.01 * slit
eye_img = bpy.data.images.new("eye", 512, 512)
eye_img.pixels.foreach_set(iris.ravel())
eye = plain("eye", eye_img)
for o in meshes:
    if "Eye" in o.name:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        cornea = [i for i, m in enumerate(o.data.materials) if m and "Cornea" in m.name]
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in cornea], context="FACES")
        bm.to_mesh(o.data)
        bm.free()
        o.data.materials.clear()
        o.data.materials.append(eye)

# chubbier, as Willy is. The trunk is pushed out from the middle of the trunk at its height along
# the body, as much as the back's bones carry it: wider at the sides, and more below, where a fed
# cat's belly hangs. The neck and the tops of the legs are filled out along the skin's normal, so
# a leg grows thicker rather than further out; the tail too, fluffed out along its length. Then
# each point's push is evened out with its neighbours', so nothing steps where one bone hands
# over to the next. The paws and the head keep their shape, and every clip still fits.
TRUNK = ("Spine", "Spine.1", "Spine.2", "Spine.3")
FILL = {"Neck": 1, "Neck.1": 0.7, "Thigh.L": 1, "Thigh.R": 1, "Shoulder.L": 0.8, "Shoulder.R": 0.8, "UpperArm.L": 0.6, "UpperArm.R": 0.6}
FLUFF = {"tail": 0.5, "tail.1": 0.9, "tail.2": 1, "tail.3": 1, "tail.4": 1, "tail.5": 1, "tail.6": 0.9, "tail.7": 0.6}
for o in meshes:
    if "Body" not in o.name:
        continue
    me = o.data
    gi = {o.vertex_groups[n].index for n in TRUNK if n in o.vertex_groups}
    fi = {o.vertex_groups[n].index: k for n, k in FILL.items() if n in o.vertex_groups}
    w = [sum(g.weight for g in v.groups if g.group in gi) for v in me.vertices]
    f = [sum(g.weight * fi[g.group] for g in v.groups if g.group in fi) for v in me.vertices]
    ti = {o.vertex_groups[n].index: k for n, k in FLUFF.items() if n in o.vertex_groups}
    fl = [sum(g.weight * ti[g.group] for g in v.groups if g.group in ti) for v in me.vertices]
    core = [v.co for v, t in zip(me.vertices, w) if t > 0.6]
    span = max(v.co.y for v in me.vertices) - min(v.co.y for v in me.vertices)
    y0, y1 = min(c.y for c in core), max(c.y for c in core)
    bins = 24
    mid = []
    for k in range(bins):
        sl = [c.z for c in core if int((c.y - y0) / (y1 - y0 + 1e-9) * bins) == k] or [sum(c.z for c in core) / len(core)]
        mid.append((min(sl) + max(sl)) / 2)
    push = []
    for v, t, fill, fluff in zip(me.vertices, w, f, fl):
        k = min(bins - 1, max(0, int((v.co.y - y0) / (y1 - y0 + 1e-9) * bins)))
        dz = v.co.z - mid[k]
        d = Vector((v.co.x * CHUB * t, 0, dz * CHUB * t * (1.0 if dz < 0 else 0.35)))
        push.append(d + v.normal * (0.018 * CHUB * fill + TAIL_FLUFF * span * fluff))
    near = [[] for _ in me.vertices]
    for e in me.edges:
        i, j = e.vertices
        near[i].append(j)
        near[j].append(i)
    for _ in range(3):
        push = [(p + sum((push[j] for j in n), Vector()) / len(n)) / 2 if n else p for p, n in zip(push, near)]
    for v, p in zip(me.vertices, push):
        v.co += p

# Willy's coat, from Carlo's photos, as the Quaternius Willy had it: a black cap over the top of
# the head, down over his right ear and round his left eye; a black saddle from the neck down the
# back and half way down the sides; a white band across the hips; a black rump and a black tail;
# muzzle, chest, belly and legs white. Worked out from where each point sits at rest, its edges
# made uneven with noise, it picks between the model's own white coat and its black one, greyed
# to Willy's black. The model's unwrap mirrors the head, both sides on the same pixels, so the
# coat is baked onto an unwrap of its own, read from the model's. He faces -y, his right is -x.
PATCHES = [
    ((-0.006, -0.215, 0.385), (0.03, 0.035, 0.025)),  # the cap, between the ears
    ((-0.047, -0.222, 0.385), (0.03, 0.03, 0.035)),  # over his right ear
    ((-0.033, -0.235, 0.355), (0.02, 0.022, 0.02)),  # down the right of his head
    ((0.026, -0.27, 0.338), (0.022, 0.02, 0.02)),  # round his left eye
    ((0, -0.165, 0.33), (0.06, 0.045, 0.035)),  # the nape, below and behind the ears
    ((0, -0.075, 0.315), (0.12, 0.085, 0.09)),  # the saddle
    ((0, 0.15, 0.3), (0.12, 0.075, 0.09)),  # the rump
    ((0, 0.35, 0.302), (0.05, 0.165, 0.05)),  # the tail, straight out behind him at rest
]
EDGE = 0.03  # how far the noise moves an edge, m
TEX = 1024
body_obj = next(o for o in meshes if "Body" in o.name)
me = body_obj.data
rest = me.attributes.new("rest", "FLOAT_VECTOR", "POINT")
for i, v in enumerate(me.vertices):
    rest.data[i].vector = body_obj.matrix_world @ v.co
coat = bpy.data.materials.new("coat")
coat.use_nodes = True
nt = coat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
N, L = nt.nodes.new, nt.links.new
outn, bsdf = N("ShaderNodeOutputMaterial"), N("ShaderNodeBsdfPrincipled")
L(bsdf.outputs[0], outn.inputs["Surface"])
white, black = N("ShaderNodeTexImage"), N("ShaderNodeTexImage")
white.image, black.image = load("Cat.body_White.png", 2048), load("Cat.body_Black.png", 2048)
src_uv = me.uv_layers.active.name
uvmap = N("ShaderNodeUVMap")
uvmap.uv_map = src_uv
L(uvmap.outputs["UV"], white.inputs["Vector"])
L(uvmap.outputs["UV"], black.inputs["Vector"])
# the model's white cat has an orange patch on its head, which Willy has not: orange goes to
# white, by its hue, so the pink of the nose, the ears and the pads stays
hsv = N("ShaderNodeSeparateColor")
hsv.mode = "HSV"
L(white.outputs["Color"], hsv.inputs["Color"])
orange = None
for out, op, v in (("Red", "GREATER_THAN", 0.025), ("Red", "LESS_THAN", 0.17), ("Green", "GREATER_THAN", 0.1)):
    t = N("ShaderNodeMath")
    t.operation = op
    L(hsv.outputs[out], t.inputs[0])
    t.inputs[1].default_value = v
    if orange is not None:
        m = N("ShaderNodeMath")
        m.operation = "MULTIPLY"
        L(orange.outputs[0], m.inputs[0])
        L(t.outputs[0], m.inputs[1])
        t = m
    orange = t
bleach = N("ShaderNodeHueSaturation")
bleach.inputs["Saturation"].default_value = 0
bleach.inputs["Value"].default_value = 1.15
L(white.outputs["Color"], bleach.inputs["Color"])
clean = N("ShaderNodeMix")
clean.data_type = "RGBA"
L(orange.outputs[0], clean.inputs["Factor"])
L(white.outputs["Color"], clean.inputs["A"])
L(bleach.outputs["Color"], clean.inputs["B"])
grey = N("ShaderNodeHueSaturation")
grey.inputs["Saturation"].default_value = 0.15
grey.inputs["Value"].default_value = 0.7
L(black.outputs["Color"], grey.inputs["Color"])
attr = N("ShaderNodeAttribute")
attr.attribute_type = "GEOMETRY"
attr.attribute_name = "rest"
noise = N("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 16
noise.inputs["Detail"].default_value = 3
L(attr.outputs["Vector"], noise.inputs["Vector"])
centred = N("ShaderNodeVectorMath")
centred.operation = "SUBTRACT"
L(noise.outputs["Color"], centred.inputs[0])
centred.inputs[1].default_value = (0.5, 0.5, 0.5)
scaled = N("ShaderNodeVectorMath")
scaled.operation = "SCALE"
L(centred.outputs[0], scaled.inputs[0])
scaled.inputs["Scale"].default_value = EDGE
pt = N("ShaderNodeVectorMath")
pt.operation = "ADD"
L(attr.outputs["Vector"], pt.inputs[0])
L(scaled.outputs[0], pt.inputs[1])
mask = None
for c, r in PATCHES:
    # inside an ellipsoid: |(p - c) / radii| < 1
    off = N("ShaderNodeVectorMath")
    off.operation = "SUBTRACT"
    L(pt.outputs[0], off.inputs[0])
    off.inputs[1].default_value = c
    sc = N("ShaderNodeVectorMath")
    sc.operation = "DIVIDE"
    L(off.outputs[0], sc.inputs[0])
    sc.inputs[1].default_value = r
    d = N("ShaderNodeVectorMath")
    d.operation = "LENGTH"
    L(sc.outputs[0], d.inputs[0])
    lt = N("ShaderNodeMath")
    lt.operation = "LESS_THAN"
    L(d.outputs["Value"], lt.inputs[0])
    lt.inputs[1].default_value = 1
    if mask is not None:
        mx = N("ShaderNodeMath")
        mx.operation = "MAXIMUM"
        L(mask.outputs[0], mx.inputs[0])
        L(lt.outputs[0], mx.inputs[1])
        lt = mx
    mask = lt
mix = N("ShaderNodeMix")
mix.data_type = "RGBA"
L(mask.outputs[0], mix.inputs["Factor"])
L(clean.outputs["Result"], mix.inputs["A"])
L(grey.outputs["Color"], mix.inputs["B"])
L(mix.outputs["Result"], bsdf.inputs["Base Color"])
coat_img = bpy.data.images.new("coat", TEX, TEX)
target = N("ShaderNodeTexImage")
target.image = coat_img
nt.nodes.active = target
me.materials.clear()
me.materials.append(coat)

scene = bpy.context.scene
rig.data.pose_position = "REST"
for o in bpy.context.view_layer.objects:
    o.select_set(False)
bpy.context.view_layer.objects.active = body_obj
body_obj.select_set(True)
own = me.uv_layers.new(name="coat")
me.uv_layers.active = own
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(island_margin=0.02)
bpy.ops.object.mode_set(mode="OBJECT")
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 1
bake = scene.render.bake
bake.use_pass_direct = bake.use_pass_indirect = False
bake.use_pass_color = True
bake.margin = 4
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"})
rig.data.pose_position = "POSE"
me.materials.clear()
me.materials.append(plain("body", coat_img))
me.uv_layers.remove(me.uv_layers[src_uv])
me.attributes.remove(me.attributes["rest"])

# his size: as long as the Willy he replaces
bpy.context.view_layer.update()
long = max(o.dimensions.y * o.matrix_world.to_scale().y for o in meshes if "Body" in o.name)
rig.scale = rig.scale * (LENGTH / long)
# and facing +x, as the room has him at heading 0 (the model faces -y), his left +y
rig.rotation_euler.z = 1.5707963
bpy.context.view_layer.update()

# how much ground one walk cycle covers, so the room can pace his feet to it
ad.action = stride
if hasattr(ad, "action_slot") and stride.slots:
    ad.action_slot = stride.slots[0]
ends = []
for fr in (int(stride.frame_range[0]), int(stride.frame_range[1])):
    bpy.context.scene.frame_set(fr)
    ends.append(rig.matrix_world @ rig.pose.bones["Root"].head)
print("STRIDE", round((ends[1] - ends[0]).length * PX, 1), "px a cycle of", round((stride.frame_range[1] - stride.frame_range[0]) / bpy.context.scene.render.fps, 3), "s")
ad.action = None
bpy.data.actions.remove(stride)

def lowest():
    """The lowest point of him now, in room px."""
    ev = body_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    m = ev.to_mesh()
    z = min((ev.matrix_world @ v.co).z for v in m.vertices) * PX
    ev.to_mesh_clear()
    return z


# lying down, the chubbier belly would sink into the ground: a soft cat rests on it, so a clip
# that sinks is lifted, frame by frame, until his lowest point is on the ground
for n, a in kept.items():
    if n.startswith("jump"):
        continue
    use(a)
    f0, f1 = frames(a, None)
    sink = {}
    for fr in range(f0, f1 + 1):
        bpy.context.scene.frame_set(fr)
        sink[fr] = lowest()
    if min(sink.values()) >= -SOFT:
        continue
    up = curves(a).new(ROOT, index=2)
    for fr, z in sink.items():
        k = up.keyframe_points.insert(fr, max(0.0, -z) / PX / rig.scale.z)
        k.interpolation = "LINEAR"
    print("LIFTED", n, "by up to", round(-min(sink.values()), 1), "px")
ad.action = None

# no clip may take him through the ground: the lowest point of him, every other frame
low, lift = {}, {}
for name, pieces in TRACKS.items():
    if name == "jump-air":
        continue  # in the air: the arc holds him up
    for n, r in pieces:
        use(kept[n])
        f0, f1 = frames(kept[n], r)
        for fr in range(f0, f1 + 1, 2):
            bpy.context.scene.frame_set(fr)
            if fr in JUMP["jump-air"] and name in ("jump-up", "jump-land"):
                lift[fr] = (rig.matrix_world @ rig.pose.bones["Root"].head).z * PX
            low[name] = min(low.get(name, 1e9), lowest())
ad.action = None
print("LIFT", [round(lift[f], 1) for f in JUMP["jump-air"]], "px: the root's height leaving the ground and meeting it")
print("GROUND", ", ".join(f"{n} {z:+.1f}" for n, z in low.items()), "px")
under = {n: z for n, z in low.items() if z < -SOFT}
if under:
    sys.exit("through the ground: " + ", ".join(f"{n} {z:.1f} px" for n, z in under.items()))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_animation_mode="NLA_TRACKS", export_image_format="JPEG",
                          export_jpeg_quality=80, export_optimize_animation_size=True, export_morph=True, export_skins=True)
print("built", OUT, os.path.getsize(OUT) // 1024, "KB,", len(TRACKS), "clips:", ", ".join(TRACKS))
