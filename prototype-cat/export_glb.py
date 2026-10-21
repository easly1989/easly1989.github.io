"""Run inside Blender: the cat with its coat, baked to one texture, exported as .glb.

Reuses the coat and eyes from render_v3.py (everything before its camera section),
unwraps the mesh, bakes the coat's colour into an image and exports Idle and Walking.

    blender -b Cat.blend --python export_glb.py -- <render_v3.py> <out.glb> [size]
"""
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1 :]
X_SRC, X_OUT = args[0], args[1]
tex_size = int(args[2]) if len(args) > 2 else 512

code = open(X_SRC, encoding="utf-8").read().split("# ---- camera, light, render settings")[0]
sys.argv = [sys.argv[0], "--", "unused"]  # render_v3 reads its own args
exec(compile(code, X_SRC, "exec"))

scene = bpy.context.scene
cat = bpy.data.objects["Cat"]
rig = bpy.data.objects["CatArmature"]
rig.data.pose_position = "REST"

for o in bpy.context.view_layer.objects:
    o.select_set(False)
bpy.context.view_layer.objects.active = cat
cat.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(island_margin=0.03)
bpy.ops.object.mode_set(mode="OBJECT")

img = bpy.data.images.new("coat", tex_size, tex_size)
for m in cat.data.materials:
    tex = m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = img
    m.node_tree.nodes.active = tex

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 1
bake = scene.render.bake
bake.use_pass_direct = False
bake.use_pass_indirect = False
bake.use_pass_color = True
bake.margin = 4
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"})

img.file_format = "PNG"
img.pack()

# one plain material per slot, all reading the baked coat
for m in cat.data.materials:
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    outn = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.9
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs[0], outn.inputs["Surface"])

rig.data.pose_position = "POSE"
for o in list(bpy.data.objects):
    if o.type in ("CAMERA", "LIGHT"):
        bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=X_OUT, export_format="GLB", export_animations=True, export_animation_mode="ACTIONS", export_yup=True)
print("exported", X_OUT)
