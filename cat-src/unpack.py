"""Take what build.py needs out of the AnimX package into cat-src/animx/ (git-ignored).

    python cat-src/unpack.py "<path to>/Fully Animated Cats v2.1.unitypackage"

A .unitypackage is a gzipped tar of folders, one per asset, each holding the asset's path in
"pathname" and its file in "asset". Only the cat without fur, its clips and the textures the
coat and the eyes are made from come out, flat, by their own names.
"""
import os
import sys
import tarfile

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "animx")
WANT = {"Cat_R_noFur.fbx", "Cat.body_White.png", "Cat.body_Black.png", "T_Cat.eye_Black.png", "T_Eyes_pupil_mask.png"}


def wanted(path):
    name = os.path.basename(path)
    return name in WANT or ("/Animations/A_Cat_" in path and "Preview" not in path and name.endswith(".fbx"))


paths, files = {}, {}
with tarfile.open(sys.argv[1], "r:gz") as t:
    for m in t:
        folder, _, leaf = m.name.partition("/")
        if leaf == "pathname":
            paths[folder] = t.extractfile(m).read().decode("utf-8").splitlines()[0]
        elif leaf == "asset" and m.isfile() and m.size < 50_000_000:  # the cat with fur, 90 MB, is not used
            files[folder] = t.extractfile(m).read()
os.makedirs(OUT, exist_ok=True)
n = 0
for folder, path in paths.items():
    if folder in files and wanted(path):
        with open(os.path.join(OUT, os.path.basename(path)), "wb") as f:
            f.write(files[folder])
        n += 1
print(n, "files into", OUT)
