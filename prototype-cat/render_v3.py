"""Run inside Blender: Carlo's cat, from Quaternius's CC0 cat (Animal Pack Vol.2),
in the bench's isometric camera, in eight headings.

The coat is worked out per pixel from where each point of the body sits at rest,
so the black patches have crisp, uneven edges and stay put on the body while it
moves. Two eyes are added and fixed to the head bone.

    blender -b Cat.blend --python render_v3.py -- <out> <action> <frame>
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index("--") + 1 :]
out = args[0]
action = args[1] if len(args) > 1 else "Walking"
frame = int(args[2]) if len(args) > 2 else 10

scene = bpy.context.scene
cat = bpy.data.objects["Cat"]
rig = bpy.data.objects["CatArmature"]
me = cat.data


def lin(h):
    c = [int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c] + [1]


# ---- the body's measurements, at rest ------------------------------------------------
mats = [m.name for m in me.materials]
pink = mats.index("Pink")
pink_pts = [me.vertices[v].co.copy() for p in me.polygons if p.material_index == pink for v in p.vertices]
xs, ys, zs = ([v.co[i] for v in me.vertices] for i in range(3))
lo = Vector((min(xs), min(ys), min(zs)))
hi = Vector((max(xs), max(ys), max(zs)))
size = hi - lo
nose = max(pink_pts, key=lambda p: p.x)  # the head is towards +x in this file


def top(x):
    near = [v.co.z for v in me.vertices if abs(v.co.x - x) < size.x * 0.04]
    return max(near) if near else hi.z


def at(t, below, side):
    # t: 0 at the tail end, 1 at the nose; below: how far under the top line; side: -1..1 across
    x = lo.x + t * size.x
    return Vector((x, side * size.y / 2, top(x) - below))


rig.data.pose_position = "REST"
bpy.context.view_layer.update()
EYES = {}
for side in (-1, 1):
    # from in front of the face, back along the head until it meets the skin
    origin = Vector((nose.x + 2, side * size.y * 0.17, nose.z + size.z * 0.075))
    hit, loc, normal, _ = cat.ray_cast(origin, Vector((-1, 0, 0)))
    EYES[side] = (loc, normal) if hit else (Vector((nose.x - 0.3, origin.y, origin.z)), Vector((1, 0, 0)))
print("eyes", {k: tuple(round(c, 2) for c in v[0]) for k, v in EYES.items()})
EYE_R = size.y * 0.088

# Carlo's cat, from his photos: a black cap over the top of the head, down over its
# right ear (-y) and round its left eye (+y); a black saddle from the neck down the
# back and sides; a white band across the hips; a black rump and a black tail.
# Muzzle, chest, belly and legs white.
PATCHES = [
    (Vector((2.45, -0.2, 3.3)), 0.33),
    (Vector((2.4, -0.38, 3.6)), 0.32),
    (Vector((2.75, 0.18, 3.2)), 0.18),
    (EYES[1][0], 0.2),
    (at(0.78, 0.2, 0.0), 0.5),
    # the saddle and the rump wrap the back and half way down the sides
    (at(0.64, 0.1, 0.0), (1.0, 1.3, 0.8)),
    (at(0.26, 0.1, 0.0), (0.55, 1.3, 0.75)),
]

rest = me.attributes.get("rest") or me.attributes.new("rest", "FLOAT_VECTOR", "POINT")
for i, v in enumerate(me.vertices):
    rest.data[i].vector = v.co
# the whole tail is black: whatever the tail's bones carry
TAIL = {cat.vertex_groups[n].index for n in ("Bone.004", "Bone.005", "Bone.006", "Bone.007")}
tail = me.attributes.get("tail") or me.attributes.new("tail", "FLOAT", "POINT")
for i, v in enumerate(me.vertices):
    tail.data[i].value = sum(g.weight for g in v.groups if g.group in TAIL)


def coat_material(m):
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    N = nt.nodes.new
    L = nt.links.new
    outn = N("ShaderNodeOutputMaterial")
    bsdf = N("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.9
    L(bsdf.outputs[0], outn.inputs["Surface"])
    attr = N("ShaderNodeAttribute")
    attr.attribute_type = "GEOMETRY"
    attr.attribute_name = "rest"
    # uneven edges: push the point about a little with noise before measuring
    noise = N("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 2.2
    noise.inputs["Detail"].default_value = 3
    L(attr.outputs["Vector"], noise.inputs["Vector"])
    centred = N("ShaderNodeVectorMath")
    centred.operation = "SUBTRACT"
    L(noise.outputs["Color"], centred.inputs[0])
    centred.inputs[1].default_value = (0.5, 0.5, 0.5)
    scaled = N("ShaderNodeVectorMath")
    scaled.operation = "SCALE"
    L(centred.outputs[0], scaled.inputs[0])
    scaled.inputs["Scale"].default_value = 0.22
    p = N("ShaderNodeVectorMath")
    p.operation = "ADD"
    L(attr.outputs["Vector"], p.inputs[0])
    L(scaled.outputs[0], p.inputs[1])
    mask = None
    for c, r in PATCHES:
        # inside an ellipsoid: |(p - c) / radii| < 1
        r = r if isinstance(r, tuple) else (r, r, r)
        off = N("ShaderNodeVectorMath")
        off.operation = "SUBTRACT"
        L(p.outputs[0], off.inputs[0])
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
        if mask is None:
            mask = lt
        else:
            mx = N("ShaderNodeMath")
            mx.operation = "MAXIMUM"
            L(mask.outputs[0], mx.inputs[0])
            L(lt.outputs[0], mx.inputs[1])
            mask = mx
    tw = N("ShaderNodeAttribute")
    tw.attribute_type = "GEOMETRY"
    tw.attribute_name = "tail"
    tl = N("ShaderNodeMath")
    tl.operation = "GREATER_THAN"
    L(tw.outputs["Fac"], tl.inputs[0])
    tl.inputs[1].default_value = 0.5
    both = N("ShaderNodeMath")
    both.operation = "MAXIMUM"
    L(mask.outputs[0], both.inputs[0])
    L(tl.outputs[0], both.inputs[1])
    mask = both
    # a dark rim round each eye, crisp: measured on the body itself, with no noise
    for loc, _n in EYES.values():
        d = N("ShaderNodeVectorMath")
        d.operation = "DISTANCE"
        L(attr.outputs["Vector"], d.inputs[0])
        d.inputs[1].default_value = loc
        out = N("ShaderNodeMath")
        out.operation = "GREATER_THAN"
        L(d.outputs["Value"], out.inputs[0])
        out.inputs[1].default_value = EYE_R * 0.8
        inn = N("ShaderNodeMath")
        inn.operation = "LESS_THAN"
        L(d.outputs["Value"], inn.inputs[0])
        inn.inputs[1].default_value = EYE_R * 1.22
        band = N("ShaderNodeMath")
        band.operation = "MULTIPLY"
        L(out.outputs[0], band.inputs[0])
        L(inn.outputs[0], band.inputs[1])
        both = N("ShaderNodeMath")
        both.operation = "MAXIMUM"
        L(mask.outputs[0], both.inputs[0])
        L(band.outputs[0], both.inputs[1])
        mask = both
    mix = N("ShaderNodeMix")
    mix.data_type = "RGBA"
    L(mask.outputs[0], mix.inputs["Factor"])
    mix.inputs["A"].default_value = lin("#fbfaf7")
    mix.inputs["B"].default_value = lin("#1d1d1d")
    L(mix.outputs["Result"], bsdf.inputs["Base Color"])


def plain_material(m, hexc, rough=0.9):
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    outn = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = lin(hexc)
    bsdf.inputs["Roughness"].default_value = rough
    nt.links.new(bsdf.outputs[0], outn.inputs["Surface"])


coat_material(bpy.data.materials["Grey"])
coat_material(bpy.data.materials["White"])
plain_material(bpy.data.materials["Pink"], "#e9aab3")

# ---- eyes: two glossy dark beads on the face, fixed to the head bone ---------------------
eye_mat = bpy.data.materials.new("Eye")
plain_material(eye_mat, "#a9b98e", rough=0.15)
# a little light of its own, so the side away from the sun stays green
eb = next(n for n in eye_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
eb.inputs["Emission Color"].default_value = lin("#a9b98e")
eb.inputs["Emission Strength"].default_value = 0.2
pupil_mat = bpy.data.materials.new("Pupil")
plain_material(pupil_mat, "#141414", rough=0.1)
head_bone = min(rig.data.bones, key=lambda b: (b.head_local - nose).length + (0 if b.children else 0.5))
eye_r = EYE_R
for side in (-1, 1):
    loc, hit_normal = EYES[side]
    # The way the face looks at that point: the vertex normals round the eye, averaged,
    # since one low-poly face can lean far off. The eye lies flat along it, so the skin
    # cuts it round, the full size of the dark rim painted on the coat.
    near = [v.normal for v in me.vertices if (v.co - loc).length < eye_r * 2.2]
    n = (sum(near, Vector()) if near else hit_normal).normalized()
    u = (Vector((0, 0, 1)) - n * n.z).normalized()  # up the face, for the slit
    w = u.cross(n)  # so n, w, u turn the right way round
    frame = Matrix((n, w, u)).transposed()  # columns: thin along n, wide across, tall up
    for o_name, mat, radius, depth, out, slit in (
        ("eye", eye_mat, eye_r * 0.86, 0.42, 0.06, False),
        ("pupil", pupil_mat, eye_r * 0.86, 0.12, 0.06 + 0.42 * 0.86 * 0.78, True),
    ):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=24, ring_count=12, location=(0, 0, 0))
        o = bpy.context.active_object
        o.name = o_name
        o.data.materials.append(mat)
        # a bulge resting on the skin: its middle a hair proud of it, its edge just under
        sx, sy, sz = (radius * depth, radius * 0.3, radius * 0.92) if slit else (radius * depth, radius, radius)
        o.matrix_world = Matrix.Translation(cat.matrix_world @ (loc + n * eye_r * out)) @ frame.to_4x4() @ Matrix.Diagonal((sx, sy, sz, 1))
        bpy.context.view_layer.update()
        world = o.matrix_world.copy()
        o.parent = rig
        o.parent_type = "BONE"
        o.parent_bone = head_bone.name
        o.matrix_world = world
rig.data.pose_position = "POSE"
print("head bone", head_bone.name, "nose", tuple(round(v, 2) for v in nose))

# ---- camera, light, render settings ---------------------------------------------------------
for o in list(bpy.data.objects):
    if o.type in ("CAMERA", "LIGHT"):
        bpy.data.objects.remove(o)
cam_data = bpy.data.cameras.new("iso")
cam_data.type = "ORTHO"
cam_data.ortho_scale = max(size) * 1.2
cam = bpy.data.objects.new("iso", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
tilt, turn = math.radians(54.7356), math.radians(-45)

sun_data = bpy.data.lights.new("sun", "SUN")
sun_data.energy = 2.6
sun_data.angle = math.radians(8)
sun = bpy.data.objects.new("sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(38), 0, math.radians(-140))
scene.world = scene.world or bpy.data.worlds.new("w")
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (1, 1, 1, 1)
bg.inputs[1].default_value = 0.55

scene.render.engine = "BLENDER_EEVEE"
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.render.use_freestyle = True
scene.render.line_thickness_mode = "ABSOLUTE"
scene.render.line_thickness = 0.75
fs = scene.view_layers[0].freestyle_settings
ls = fs.linesets[0] if fs.linesets else fs.linesets.new("lines")
ls.linestyle.color = (0.16, 0.16, 0.16)
# only the outline: no strokes along the facets inside the body
ls.select_by_visibility = True
ls.select_crease = False
ls.select_border = True
ls.select_silhouette = True

rig.animation_data.action = bpy.data.actions[action]
scene.frame_set(frame)
dg = bpy.context.evaluated_depsgraph_get()
ev = cat.evaluated_get(dg)
box = [ev.matrix_world @ Vector(c) for c in ev.bound_box]
target = sum(box, Vector()) / 8
# the camera walks round the cat, so the cat stays in the middle of every picture
for k in range(8):
    cam.rotation_euler = (tilt, 0, turn - math.radians(45 * k))
    view = Vector((0, 0, -1))
    view.rotate(cam.rotation_euler)
    cam.location = target - view * 40
    scene.render.filepath = f"{out}/v3-{action}-{frame:02d}-dir{k}.png"
    bpy.ops.render.render(write_still=True)

# close-ups of the face, to check the eyes and the cap
hb = rig.matrix_world @ rig.pose.bones[head_bone.name].tail
cam_data.ortho_scale = max(size) * 0.45
for k in (3, 4, 5):
    cam.rotation_euler = (tilt, 0, turn - math.radians(45 * k))
    view = Vector((0, 0, -1))
    view.rotate(cam.rotation_euler)
    cam.location = hb - view * 40
    scene.render.filepath = f"{out}/v3-face-dir{k}.png"
    bpy.ops.render.render(write_still=True)
