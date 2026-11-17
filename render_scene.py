"""Satisfying cloth animation: gold wire meshes with increasing face counts
drop onto a glossy black sphere. Renders one PNG sequence per level.

Usage: python3 render_scene.py OUT_DIR [levels...] [--test]
"""
import math
import os
import sys

import bpy
from mathutils import Vector

OUT = sys.argv[1]
TEST = "--test" in sys.argv
LEVELS = [int(a) for a in sys.argv[2:] if a.isdigit()] or [2, 4, 8, 16, 32, 64, 128]
FRAMES = 135  # 4.5 s @ 30 fps per level
SHEET = 2.8

scene = bpy.context.scene
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)

# ---------- render settings ----------
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.cycles.adaptive_threshold = 0.03
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 6
scene.render.resolution_x = 720
scene.render.resolution_y = 1280
scene.render.resolution_percentage = 100
scene.render.fps = 30
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.use_persistent_data = True


# ---------- materials ----------
def mat(name, color, metal, rough, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.03
    return m


GOLD = mat("Gold", (1.0, 0.72, 0.32), 1.0, 0.22)
BLACK = mat("Black", (0.012, 0.012, 0.014), 0.0, 0.35, coat=1.0)
FLOOR = mat("Floor", (0.55, 0.50, 0.45), 0.0, 0.6)
PLINTH = mat("Plinth", (0.05, 0.045, 0.04), 0.2, 0.25)

# ---------- world ----------
world = bpy.data.worlds.new("W")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.38, 0.34, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.35


def add_collision(ob, friction=5.0):
    ob.modifiers.new("Collision", "COLLISION")
    ob.collision.cloth_friction = friction
    ob.collision.thickness_outer = 0.01


# floor sweep (big plane)
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
floor = bpy.context.object
floor.data.materials.append(FLOOR)
add_collision(floor)

# square plinth
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.06))
plinth = bpy.context.object
plinth.scale = (3.2, 3.2, 0.12)
bpy.ops.object.transform_apply(scale=True)
bev = plinth.modifiers.new("Bevel", "BEVEL")
bev.width = 0.02
bev.segments = 3
plinth.data.materials.append(PLINTH)
add_collision(plinth)

# gold ring base
bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=0.62, depth=0.12, location=(0, 0, 0.18))
ring = bpy.context.object
rb = ring.modifiers.new("Bevel", "BEVEL")
rb.width = 0.015
rb.segments = 3
ring.data.materials.append(GOLD)
bpy.ops.object.shade_smooth()
add_collision(ring)

# black sphere
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.85, location=(0, 0, 1.05))
sphere = bpy.context.object
bpy.ops.object.shade_smooth()
sphere.data.materials.append(BLACK)
add_collision(sphere, friction=8.0)

# thin gold equator line on sphere
bpy.ops.mesh.primitive_torus_add(major_radius=0.853, minor_radius=0.006, major_segments=192,
                                 minor_segments=12, location=(0, 0, 1.05))
eq = bpy.context.object
bpy.ops.object.shade_smooth()
eq.data.materials.append(GOLD)

# ---------- lights ----------
def area(name, loc, energy, size, color=(1, 1, 1)):
    bpy.ops.object.light_add(type="AREA", location=loc)
    l = bpy.context.object
    l.data.energy = energy
    l.data.size = size
    l.data.color = color
    d = Vector((0, 0, 1.0)) - Vector(loc)
    l.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return l


area("Key", (-3.5, -3.0, 5.0), 900, 3.0, (1.0, 0.93, 0.85))
area("Fill", (4.0, -2.5, 2.5), 250, 4.0, (0.85, 0.9, 1.0))
area("Rim", (1.5, 4.5, 4.5), 700, 2.5, (1.0, 0.95, 0.9))

# ---------- camera ----------
bpy.ops.object.camera_add(location=(0, -8.4, 3.0))
cam = bpy.context.object
cam.data.lens = 45
target = Vector((0, 0, 1.85))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam


# ---------- cloth sheet ----------
def make_sheet(k):
    n = k + 1
    verts = []
    for j in range(n):
        for i in range(n):
            verts.append(((i / k - 0.5) * SHEET, (j / k - 0.5) * SHEET, 0.0))
    faces = []
    for j in range(k):
        for i in range(k):
            a = j * n + i
            faces.append((a, a + 1, a + n + 1, a + n))
    me = bpy.data.meshes.new(f"Sheet{k}")
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(f"Sheet{k}", me)
    scene.collection.objects.link(ob)
    ob.location = (0.05, -0.03, 4.4)
    ob.rotation_euler = (math.radians(9), math.radians(-6), math.radians(23))

    cloth = ob.modifiers.new("Cloth", "CLOTH")
    s = cloth.settings
    s.quality = max(6, k // 6)
    s.mass = 0.3 * (32 / k) if k > 32 else 0.3
    s.tension_stiffness = 15
    s.compression_stiffness = 15
    s.shear_stiffness = 5
    s.bending_stiffness = 0.5 if k <= 8 else 0.05
    s.air_damping = 0.3
    cs = cloth.collision_settings
    cs.collision_quality = 3
    cs.distance_min = 0.012
    cs.use_self_collision = False
    cloth.point_cache.frame_start = 1
    cloth.point_cache.frame_end = FRAMES

    edge = SHEET / k
    wf = ob.modifiers.new("Wire", "WIREFRAME")
    wf.thickness = min(0.022, edge * 0.28)
    wf.use_even_offset = True
    wf.use_boundary = True
    ob.data.materials.append(GOLD)
    return ob


for k in LEVELS:
    sheet = make_sheet(k)
    d = os.path.join(OUT, f"lvl_{k:03d}")
    os.makedirs(d, exist_ok=True)
    frames = [1, 45, 100, 150] if TEST else range(1, FRAMES + 1)
    last = 0
    for f in range(1, FRAMES + 1):
        scene.frame_set(f)  # step the simulation sequentially
        if f in frames:
            scene.render.filepath = os.path.join(d, f"{f:04d}.png")
            if not os.path.exists(scene.render.filepath):
                bpy.ops.render.render(write_still=True)
            print(f"level {k} frame {f}", flush=True)
        if TEST and f >= max(frames):
            break
    bpy.data.objects.remove(sheet, do_unlink=True)
    bpy.context.scene.frame_set(1)
