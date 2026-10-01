"""
Painted-farm prototype in Blender (run headless):

  blender --background --factory-startup --python scripts/blender/proto_painted.py -- <out_dir>

Builds three test pieces for the PlayCanvas scene `farm-painted`, matching the
layout in scripts/garden-export/painted.ts:

  proto-roof-main.glb  clay-tile roof of the farmhouse (short tiles, staggered courses)
  proto-roof-wing.glb  the same for the side wing
  proto-thatch.glb     thatched roof of the cow barn (layered courses, ragged eave)
  proto-bank.glb       one stretch of pond bank (varied stones, grass lip)

Colour comes from procedural "hand-painted" shaders (per-tile tone, brush-like
mottling, lighter edges, straw strands, stone mottling and moss). Light from a
sun in the scene's direction plus sky light is baked into one texture per piece,
so the look does not depend on the engine's lighting. Everything is original,
generated here (no third-party assets).

Coordinates: written in game space (x, y up, z) and converted to Blender's
z-up with g2b(); the glTF exporter converts back to y-up.
"""

import bmesh
import bpy
import math
import os
import random
import sys
from mathutils import Euler, Matrix, Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."
os.makedirs(OUT, exist_ok=True)
TEX = 1024
SAMPLES = 24


def g2b(x, y, z):
    """Game (y up) to Blender (z up)."""
    return Vector((x, -z, y))


# ——— scene ———

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = False
scene.render.bake.margin = 6
# Standard view transform: previews show the baked colours as they are (AgX would wash them out).
scene.view_settings.view_transform = "Standard"

world = bpy.data.worlds.new("sky")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.62, 0.78, 0.95, 1)
bg.inputs["Strength"].default_value = 0.55
scene.world = world

# Sun in the PlayCanvas scene's direction (light travels along (3, -14, -13) in game space).
sun_data = bpy.data.lights.new("sun", "SUN")
sun_data.energy = 2.1
sun_data.angle = math.radians(24)
sun_data.color = (1.0, 0.95, 0.86)
sun = bpy.data.objects.new("sun", sun_data)
scene.collection.objects.link(sun)
d = g2b(3, -14, -13).normalized()
sun.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
# Soft fill from straight above: keeps overlapping courses from going muddy.
fill_data = bpy.data.lights.new("fill", "SUN")
fill_data.energy = 1.3
fill_data.angle = math.radians(40)
fill = bpy.data.objects.new("fill", fill_data)
scene.collection.objects.link(fill)


def link(obj):
    scene.collection.objects.link(obj)
    return obj


def select_only(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def join(objs, name):
    select_only(objs)
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


def apply_all(o):
    select_only([o])
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


# ——— painted shaders ———


def node(nt, kind, loc, **inputs):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def ramp(nt, loc, stops):
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.location = loc
    el = r.color_ramp.elements
    while len(el) > len(stops):
        el.remove(el[-1])
    while len(el) < len(stops):
        el.new(0.5)
    for e, (pos, col) in zip(el, stops):
        e.position = pos
        e.color = (*col, 1)
    return r


def hexc(h):
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    # sRGB -> linear for shader colours
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


def material(name, build):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = node(nt, "ShaderNodeOutputMaterial", (900, 0))
    bsdf = node(nt, "ShaderNodeBsdfDiffuse", (700, 0))
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    color = build(nt)
    nt.links.new(color, bsdf.inputs["Color"])
    return m


def tile_shader(nt):
    geo = node(nt, "ShaderNodeNewGeometry", (-900, 0))
    tone = ramp(
        nt,
        (-650, 200),
        [
            (0.0, hexc("#b23a1c")),
            (0.3, hexc("#cf4a22")),
            (0.55, hexc("#e2602c")),
            (0.8, hexc("#ec7a3a")),
            (1.0, hexc("#a8361d")),
        ],
    )
    nt.links.new(geo.outputs["Random Per Island"], tone.inputs["Fac"])
    # Brush-like mottling.
    tc = node(nt, "ShaderNodeTexCoord", (-1100, -300))
    noise = node(nt, "ShaderNodeTexNoise", (-850, -300), Scale=7.0, Detail=3.0, Roughness=0.6)
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    mott = ramp(nt, (-600, -300), [(0.3, (0.82, 0.8, 0.8)), (0.7, (1.0, 1.0, 1.0))])
    nt.links.new(noise.outputs["Fac"], mott.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.location = (-300, 100)
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(tone.outputs["Color"], mul.inputs["A"])
    nt.links.new(mott.outputs["Color"], mul.inputs["B"])
    # Lighter worn edges (pointiness), like a painter's highlight on each tile rim.
    edge = ramp(nt, (-600, -600), [(0.58, (0, 0, 0)), (0.68, (0.35, 0.35, 0.35))])
    nt.links.new(geo.outputs["Pointiness"], edge.inputs["Fac"])
    hi = nt.nodes.new("ShaderNodeMix")
    hi.data_type = "RGBA"
    hi.blend_type = "SCREEN"
    hi.location = (0, 0)
    nt.links.new(edge.outputs["Color"], hi.inputs["Factor"])
    nt.links.new(mul.outputs["Result"], hi.inputs["A"])
    hi.inputs["B"].default_value = (*hexc("#f6b27a"), 1)
    return hi.outputs["Result"]


def straw_shader(nt):
    tc = node(nt, "ShaderNodeTexCoord", (-1200, 0))
    # Strands: bands along the slope, stretched noise across it.
    mapping = node(nt, "ShaderNodeMapping", (-1000, 0))
    mapping.inputs["Scale"].default_value = (1.0, 14.0, 1.0)
    nt.links.new(tc.outputs["Object"], mapping.inputs["Vector"])
    strands = node(nt, "ShaderNodeTexNoise", (-800, 0), Scale=9.0, Detail=6.0, Roughness=0.7)
    nt.links.new(mapping.outputs["Vector"], strands.inputs["Vector"])
    col = ramp(
        nt,
        (-550, 0),
        [
            (0.2, hexc("#d19a3a")),
            (0.45, hexc("#e6b44e")),
            (0.65, hexc("#f2c862")),
            (0.85, hexc("#f9dd8c")),
        ],
    )
    nt.links.new(strands.outputs["Fac"], col.inputs["Fac"])
    # Each course darker at its tucked-in top, lighter at the sunny lip (Random Per Island varies courses).
    geo = node(nt, "ShaderNodeNewGeometry", (-800, -350))
    var = ramp(nt, (-550, -350), [(0.0, (0.93, 0.92, 0.9)), (1.0, (1.04, 1.03, 1.0))])
    nt.links.new(geo.outputs["Random Per Island"], var.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.location = (-250, 0)
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(col.outputs["Color"], mul.inputs["A"])
    nt.links.new(var.outputs["Color"], mul.inputs["B"])
    return mul.outputs["Result"]


def stone_shader(nt):
    geo = node(nt, "ShaderNodeNewGeometry", (-1000, 0))
    tone = ramp(
        nt,
        (-700, 250),
        [(0.0, hexc("#8a8172")), (0.5, hexc("#a99f8c")), (1.0, hexc("#c4bba8"))],
    )
    nt.links.new(geo.outputs["Random Per Island"], tone.inputs["Fac"])
    tc = node(nt, "ShaderNodeTexCoord", (-1200, -250))
    noise = node(nt, "ShaderNodeTexNoise", (-950, -250), Scale=4.5, Detail=4.0, Roughness=0.65)
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    mott = ramp(nt, (-700, -250), [(0.35, (0.8, 0.8, 0.82)), (0.65, (1.05, 1.04, 1.0))])
    nt.links.new(noise.outputs["Fac"], mott.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.location = (-400, 100)
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(tone.outputs["Color"], mul.inputs["A"])
    nt.links.new(mott.outputs["Color"], mul.inputs["B"])
    # Moss on the tops of some stones (normal facing up × a second noise).
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-950, -550)
    nt.links.new(geo.outputs["Normal"], sep.inputs["Vector"])
    moss_noise = node(nt, "ShaderNodeTexNoise", (-950, -750), Scale=2.5, Detail=2.0)
    nt.links.new(tc.outputs["Object"], moss_noise.inputs["Vector"])
    top = ramp(nt, (-700, -550), [(0.7, (0, 0, 0)), (0.9, (1, 1, 1))])
    nt.links.new(sep.outputs["Z"], top.inputs["Fac"])
    patch = ramp(nt, (-700, -750), [(0.55, (0, 0, 0)), (0.7, (1, 1, 1))])
    nt.links.new(moss_noise.outputs["Fac"], patch.inputs["Fac"])
    both = nt.nodes.new("ShaderNodeMath")
    both.operation = "MULTIPLY"
    both.location = (-450, -650)
    nt.links.new(top.outputs["Color"], both.inputs[0])
    nt.links.new(patch.outputs["Color"], both.inputs[1])
    moss = nt.nodes.new("ShaderNodeMix")
    moss.data_type = "RGBA"
    moss.location = (-150, 0)
    nt.links.new(both.outputs["Value"], moss.inputs["Factor"])
    nt.links.new(mul.outputs["Result"], moss.inputs["A"])
    moss.inputs["B"].default_value = (*hexc("#6aa83a"), 1)
    # Brighter lit rims.
    edge = ramp(nt, (-450, -950), [(0.5, (0, 0, 0)), (0.6, (0.6, 0.6, 0.6))])
    nt.links.new(geo.outputs["Pointiness"], edge.inputs["Fac"])
    hi = nt.nodes.new("ShaderNodeMix")
    hi.data_type = "RGBA"
    hi.blend_type = "SCREEN"
    hi.location = (100, 0)
    nt.links.new(edge.outputs["Color"], hi.inputs["Factor"])
    nt.links.new(moss.outputs["Result"], hi.inputs["A"])
    hi.inputs["B"].default_value = (1, 0.97, 0.9, 1)
    return hi.outputs["Result"]


def grass_shader(nt):
    tc = node(nt, "ShaderNodeTexCoord", (-1000, 0))
    noise = node(nt, "ShaderNodeTexNoise", (-800, 0), Scale=6.0, Detail=5.0, Roughness=0.7)
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    col = ramp(
        nt,
        (-550, 0),
        [(0.3, hexc("#4f9a2f")), (0.5, hexc("#6fbb3e")), (0.7, hexc("#93d456"))],
    )
    nt.links.new(noise.outputs["Fac"], col.inputs["Fac"])
    return col.outputs["Color"]


# ——— bake ———


def bake(obj, name, size=TEX, lit=True):
    """UV-unwrap `obj`, bake its lit painted colour into one image, swap to a textured material."""
    select_only([obj])
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")
    img = bpy.data.images.new(f"{name}_painted", size, size)
    for m in obj.data.materials:
        nt = m.node_tree
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img
        t.location = (700, 300)
        nt.nodes.active = t
    # lit: sun and sky baked in (painted light). Otherwise colour only; the engine lights it.
    scene.render.bake.use_pass_direct = lit
    scene.render.bake.use_pass_indirect = lit
    scene.render.bake.use_pass_color = True
    bpy.ops.object.bake(type="DIFFUSE", margin=6)
    img.filepath_raw = os.path.join(OUT, f"{name}.png")
    img.file_format = "PNG"
    img.save()
    # Textured material for export.
    mat = bpy.data.materials.new(f"{name}_mat")
    mat.use_nodes = True
    nt = mat.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Roughness"].default_value = 1.0
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img
    nt.links.new(t.outputs["Color"], p.inputs["Base Color"])
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def export(obj, file):
    select_only([obj])
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, file),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format="AUTO",
    )


# ——— 1. Tile roof (farmhouse main and wing) ———


def tile_mesh(tw, tl, th):
    """One clay tile: a slightly curved, rounded slab (cheap, reads as a tile)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= tw
        v.co.y *= tl
        v.co.z *= th
        # Curve across the width, thicker at the exposed lower edge.
        v.co.z += 0.018 * (1 - (2 * v.co.x / tw) ** 2)
        if v.co.y < 0:
            v.co.z += th * 0.35
    me = bpy.data.meshes.new("tile")
    bm.to_mesh(me)
    bm.free()
    return me


def tile_roof(name, w, depth, rise, y, seed, tw=0.22):
    """Same frame as roof() in painted.ts: ridge along x, slopes towards ±z, eaves at height y."""
    rnd = random.Random(seed)
    half = depth / 2
    length = math.hypot(half, rise)
    ang = math.atan2(rise, half)
    rows = max(5, round(length / 0.21))
    tl = length / rows
    cols = round(w / tw)
    base = tile_mesh(tw - 0.02, tl + 0.05, 0.045)
    objs = []
    for side in (1, -1):
        normal = Vector((0, math.cos(ang), side * math.sin(ang)))
        for row in range(rows):
            f = (row + 0.5) / rows
            gy = y + rise * f
            gz = side * half * (1 - f)
            shift = tw / 2 if row % 2 else 0
            for c in range(-1, cols + 1):
                gx = -w / 2 + (c + 0.5) * (w / cols) + shift
                if gx < -w / 2 + tw * 0.25 or gx > w / 2 - tw * 0.25:
                    continue
                p = Vector((gx, gy, gz)) + normal * 0.08
                o = bpy.data.objects.new("t", base.copy())
                link(o)
                o.location = g2b(*p)
                # Tile's local y runs down the slope; tip the lower edge up a little.
                tilt = ang + 0.07 + rnd.uniform(-0.02, 0.02)
                o.rotation_euler = Euler(
                    (side * tilt if side > 0 else -tilt, 0, 0 if side > 0 else math.pi), "XYZ"
                )
                o.rotation_euler.z += rnd.uniform(-0.025, 0.025)
                objs.append(o)
    roof = join(objs, name)
    apply_all(roof)
    roof.data.materials.append(material(f"{name}_paint", tile_shader))
    # Ridge: a row of rounded ridge tiles.
    ridge = []
    n = round(w / 0.26)
    for i in range(n):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=10, radius=0.12, depth=0.27, location=g2b(-w / 2 + (i + 0.5) * w / n, y + rise + 0.08, 0)
        )
        r = bpy.context.active_object
        r.rotation_euler = Euler((0, math.pi / 2, 0))
        r.scale = (1, 1, 1.0)
        ridge.append(r)
    ridge_obj = join(ridge, f"{name}_ridge")
    apply_all(ridge_obj)
    ridge_obj.data.materials.append(roof.data.materials[0])
    roof = join([roof, ridge_obj], name)
    bpy.ops.object.shade_smooth()
    return roof


main = tile_roof("roof_main", w=4.6, depth=3.7, rise=1.7, y=2.5, seed=31)
bake(main, "proto-roof-main")
export(main, "proto-roof-main.glb")
wing = tile_roof("roof_wing", w=3.2, depth=2.9, rise=1.3, y=2.2, seed=37)
bake(wing, "proto-roof-wing")
export(wing, "proto-roof-wing.glb")

# ——— 2. Thatched roof (cow barn: W 3.2, D 2.4, eaves at 1.7, rise 1.15) ———


def course(w, length, thick, seed, rag):
    """One straw course: a strip, ragged lower edge, lumpy surface."""
    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=48, y_subdivisions=6, size=1)
    o = bpy.context.active_object
    o.scale = (w, length, 1)
    apply_all(o)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for v in bm.verts:
        # Lower edge (y = -length/2) pulled down unevenly in tufts.
        t = (v.co.y + length / 2) / length
        if t < 0.02:
            v.co.y -= rag * (0.4 + rnd.random()) * (0.5 + 0.5 * math.sin(v.co.x * 23 + rnd.random()))
        v.co.z += rnd.uniform(-0.012, 0.012) + 0.03 * math.sin(v.co.x * 9 + seed) * (1 - t)
    bm.to_mesh(o.data)
    bm.free()
    sol = o.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = thick
    sol.offset = -1
    apply_all(o)
    return o


def thatch(name, W, D, y, rise, seed):
    half = D / 2 + 0.4
    length = math.hypot(half, rise)
    ang = math.atan2(rise, half)
    objs = []
    courses = 5
    for side in (1, -1):
        normal = Vector((0, math.cos(ang), side * math.sin(ang)))
        for c in range(courses):
            f = (c + 0.55) / courses
            off = 0.08 + c * 0.02
            p = Vector((0, y + rise * f, side * half * (1 - f))) + normal * off
            o = course(W + 0.8 - c * 0.05, length / courses * 1.2, 0.16, seed + c * 7 + (side > 0), 0.16)
            o.location = g2b(*p)
            tilt = ang + 0.1
            o.rotation_euler = Euler((tilt if side > 0 else -tilt, 0, 0 if side > 0 else math.pi), "XYZ")
            objs.append(o)
    # Rolled ridge.
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.24, depth=W + 0.9, location=g2b(0, y + rise + 0.12, 0))
    ridge = bpy.context.active_object
    ridge.rotation_euler = Euler((0, math.pi / 2, 0))
    objs.append(ridge)
    o = join(objs, name)
    apply_all(o)
    disp_tex = bpy.data.textures.new("strawlumps", "CLOUDS")
    disp_tex.noise_scale = 0.18
    disp = o.modifiers.new("lumps", "DISPLACE")
    disp.texture = disp_tex
    disp.strength = 0.05
    apply_all(o)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(material(f"{name}_paint", straw_shader))
    return o


barn = thatch("thatch_barn", W=3.2, D=2.4, y=1.7, rise=1.15, seed=53)
bake(barn, "proto-thatch", lit=False)
export(barn, "proto-thatch.glb")

# ——— 3. Pond bank stretch (front edge of the pond) ———

POND = dict(x=5.2, z=3.2, w=5.2, d=8.8)


def pond_point(t, grow=0.0):
    """pondPoint() in painted.ts: superellipse n=5 with a small wobble (game x, z)."""
    w = POND["w"] / 2 + grow
    d = POND["d"] / 2 + grow
    a = t * math.pi * 2
    cx, cz = math.cos(a), math.sin(a)
    n = 5
    sx = math.copysign(abs(cx) ** (2 / n), cx)
    sz = math.copysign(abs(cz) ** (2 / n), cz)
    wob = 1 + 0.02 * math.sin(a * 5 + 1)
    return POND["x"] + sx * w * wob, POND["z"] + sz * d * wob


T0, T1 = 0.18, 0.34
rnd = random.Random(9)
stones = []
t = T0
while t < T1:
    gx, gz = pond_point(t, 0.12 + rnd.uniform(-0.06, 0.08))
    big = rnd.random() < 0.3
    s = rnd.uniform(0.28, 0.45) if big else rnd.uniform(0.13, 0.26)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=g2b(gx, s * 0.25, gz))
    o = bpy.context.active_object
    o.scale = (s * rnd.uniform(1.0, 1.5), s * rnd.uniform(0.8, 1.2), s * rnd.uniform(0.5, 0.8))
    o.rotation_euler = Euler((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 6.3)))
    tex = bpy.data.textures.new(f"rock{len(stones)}", "VORONOI")
    tex.noise_scale = 0.6
    disp = o.modifiers.new("chunky", "DISPLACE")
    disp.texture = tex
    disp.strength = 0.32
    disp.mid_level = 0.5
    stones.append(o)
    # A pebble tucked against bigger stones.
    if big:
        px, pz = pond_point(t + 0.006, 0.3)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=g2b(px, 0.04, pz))
        p = bpy.context.active_object
        p.scale = (0.1, 0.08, 0.06)
        stones.append(p)
    t += (s * 1.25 + rnd.uniform(0.02, 0.08)) / (2 * (POND["w"] + POND["d"]))
for o in stones:
    apply_all(o)
    # Flat underside, set into the bank.
    for v in o.data.vertices:
        if v.co.z < 0.0:
            v.co.z *= 0.25
bank = join(stones, "bank_stones")
bpy.ops.object.shade_smooth()
bank.data.materials.append(material("stone_paint", stone_shader))

# Grass lip behind the stones: a ribbon that meets the lawn.
verts, faces = [], []
N = 40
for i in range(N + 1):
    t = T0 + (T1 - T0) * i / N
    for g, h in ((0.0, 0.01), (0.55, 0.03), (0.9, 0.0)):
        gx, gz = pond_point(t, 0.05 + g)
        verts.append(g2b(gx, h, gz))
for i in range(N):
    for j in range(2):
        a = i * 3 + j
        faces.append((a, a + 3, a + 4, a + 1))
me = bpy.data.meshes.new("lip")
me.from_pydata(verts, [], faces)
lip = link(bpy.data.objects.new("bank_lip", me))
lip.data.materials.append(material("grass_paint", grass_shader))
bank = join([bank, lip], "bank")
bake(bank, "proto-bank", lit=False)
export(bank, "proto-bank.glb")

# ——— Preview renders: baked textures as emission, orthographic corner view like the game ———


def preview(objs, file, target, scale):
    for o in objs:
        for m in o.data.materials:
            nt = m.node_tree
            img = next(n.image for n in nt.nodes if n.type == "TEX_IMAGE")
            for n in list(nt.nodes):
                if n.type == "BSDF_PRINCIPLED":
                    nt.nodes.remove(n)
            em = nt.nodes.new("ShaderNodeEmission")
            t = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
            nt.links.new(t.outputs["Color"], em.inputs["Color"])
            nt.links.new(em.outputs["Emission"], nt.nodes["Material Output"].inputs["Surface"])
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = scale
    cam = link(bpy.data.objects.new("cam", cam_data))
    tx, ty, tz = target
    cam.location = g2b(tx + 10, ty + 9.2, tz + 10)
    look = (g2b(*target) - cam.location).normalized()
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    for o in scene.objects:
        o.hide_render = o.type == "MESH" and o not in objs
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.cycles.samples = 8
    scene.render.filepath = os.path.join(OUT, file)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


preview([main], "preview-roof.png", (0, 2.6, 0), 7.0)
preview([barn], "preview-thatch.png", (0, 2.0, 0), 5.5)
preview([bank], "preview-bank.png", (4.0, 0, 7.4), 5.0)

# Report triangle counts.
for name in ("roof_main", "roof_wing", "thatch_barn", "bank"):
    o = bpy.data.objects.get(name)
    if o:
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        print(f"[proto] {name}: {tris} triangles")
