"""Pieks & Tupfi – 3D-Kurzvideo im Comic-Look (Blender/Cycles, Toon-Shading + Freestyle-Konturen).
Aufruf:  ../render3d_venv/bin/python scene3d.py test 5.0 30.0   -> Testbilder
         ../render3d_venv/bin/python scene3d.py render          -> alle Bilder (jedes 2. Frame, "on twos")
"""
import bpy, math, json, os, sys, random, addon_utils
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
TL = json.load(open(os.path.join(B, 'short_timeline.json')))
FPS = 24
RES = (540, 960)

def F(t): return int(round(t * FPS)) + 1

# ------------------------------------------------------------------ Grundeinstellungen
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('cycles', default_set=True, persistent=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 6
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.05
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 1; sc.cycles.diffuse_bounces = 0; sc.cycles.glossy_bounces = 0
sc.cycles.transmission_bounces = 0; sc.cycles.volume_bounces = 0; sc.cycles.transparent_max_bounces = 2
sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.render.resolution_x, sc.render.resolution_y = RES
sc.render.resolution_percentage = 100
sc.render.fps = FPS
sc.frame_start = 1; sc.frame_end = F(TL['total'])
sc.view_settings.view_transform = 'Standard'
sc.render.use_freestyle = True
sc.render.line_thickness_mode = 'ABSOLUTE'
sc.render.line_thickness = 1.6
vl = sc.view_layers[0]
fs = vl.freestyle_settings
fs.crease_angle = math.radians(125)

NOLINE = bpy.data.collections.new('NoLine'); sc.collection.children.link(NOLINE)
ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('Lines')
ls.select_by_visibility = True; ls.select_by_edge_types = True
ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
ls.select_by_collection = True; ls.collection = NOLINE; ls.collection_negation = 'EXCLUSIVE'
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
ls.linestyle.color = (0.08, 0.04, 0.10); ls.linestyle.thickness = 2.4

prefs = bpy.context.preferences.edit
def key(obj, path, frame, interp='BEZIER', index=-1):
    prefs.keyframe_new_interpolation_type = interp
    obj.keyframe_insert(path, frame=frame, index=index)

def hexrgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)

# ------------------------------------------------------------------ Materialien
_mats = {}
def mat(hexc, emit=0.32, toon=True, strength=None):
    k = (hexc, emit, toon, strength)
    if k in _mats: return _mats[k]
    m = bpy.data.materials.new('m_%s_%s' % (hexc, emit)); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    col = hexrgb(hexc)
    if not toon:
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = col
        em.inputs['Strength'].default_value = strength or 1.0
        nt.links.new(em.outputs[0], out.inputs[0])
    else:
        tb = nt.nodes.new('ShaderNodeBsdfToon'); tb.inputs['Color'].default_value = col
        tb.inputs['Size'].default_value = 0.62; tb.inputs['Smooth'].default_value = 0.03
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = col; em.inputs['Strength'].default_value = emit
        add = nt.nodes.new('ShaderNodeAddShader')
        nt.links.new(tb.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], out.inputs[0])
    _mats[k] = m
    return m

# ------------------------------------------------------------------ Grundformen
def _finish(o, m, parent, smooth=True, coll=None):
    if m: o.data.materials.append(m)
    if smooth and o.type == 'MESH':
        for p in o.data.polygons: p.use_smooth = True
    if parent: o.parent = parent
    if coll:
        for c in o.users_collection: c.objects.unlink(o)
        coll.objects.link(o)
    return o

def sphere(loc, r=1.0, scale=(1, 1, 1), m=None, parent=None, seg=32, ring=16, rot=(0, 0, 0), coll=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc, rotation=rot)
    o = bpy.context.active_object; o.scale = scale
    return _finish(o, m, parent, coll=coll)

def cone(loc, r1, r2, depth, m=None, parent=None, rot=(0, 0, 0), verts=16, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object; o.scale = scale
    return _finish(o, m, parent)

def cyl(loc, r, depth, m=None, parent=None, rot=(0, 0, 0), verts=24, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object; o.scale = scale
    return _finish(o, m, parent)

def torus(loc, R, r, m=None, parent=None, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=32, minor_segments=12)
    o = bpy.context.active_object; o.scale = scale
    return _finish(o, m, parent)

def box(loc, size, m=None, parent=None, rot=(0, 0, 0), bevel=0.05):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.scale = size
    if bevel:
        bm = o.modifiers.new('bv', 'BEVEL'); bm.width = bevel; bm.segments = 3
    return _finish(o, m, parent, smooth=False)

def star_prism(loc, r, depth, m, parent=None, rot=(math.pi / 2, 0, 0), coll=None):
    verts = []
    for z in (-depth / 2, depth / 2):
        for k in range(10):
            a = math.pi / 2 + k * math.pi / 5; rr = r if k % 2 == 0 else r * 0.45
            verts.append((math.cos(a) * rr, math.sin(a) * rr, z))
    faces = [list(range(10))[::-1], list(range(10, 20))] + [[k, (k + 1) % 10, (k + 1) % 10 + 10, k + 10] for k in range(10)]
    me = bpy.data.meshes.new('star'); me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new('star', me); sc.collection.objects.link(o)
    o.location = loc; o.rotation_euler = rot
    return _finish(o, m, parent, smooth=False, coll=coll)

def arc_curve(loc, radius, a0, a1, bevel, m, parent=None, rot=(math.pi / 2, 0, 0)):
    cu = bpy.data.curves.new('arc', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = bevel; cu.bevel_resolution = 4
    sp = cu.splines.new('POLY'); n = 12; sp.points.add(n - 1)
    for i in range(n):
        a = a0 + (a1 - a0) * i / (n - 1)
        sp.points[i].co = (math.cos(a) * radius, math.sin(a) * radius, 0, 1)
    o = bpy.data.objects.new('arc', cu); sc.collection.objects.link(o)
    o.location = loc; o.rotation_euler = rot
    o.data.materials.append(m)
    if parent: o.parent = parent
    return o

def empty(name, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None); sc.collection.objects.link(o); o.location = loc
    return o

def fib_points(n):
    pts = []
    ga = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n; r = math.sqrt(1 - z * z)
        pts.append(Vector((math.cos(ga * i) * r, math.sin(ga * i) * r, z)))
    return pts

def aim(o, direction):
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector(direction).to_track_quat('Z', 'Y')

# ------------------------------------------------------------------ Gesicht
class Face:
    pass

def make_eyes(root, centers, r, iris_hex, lids_hex=None, iris_scale=0.62):
    groups = []
    for c in centers:
        g = empty('eye', c); g.parent = root
        sphere((0, 0, 0), r, (1, 0.7, 1.15), mat('ffffff', 0.7), g, seg=24, ring=12)
        sphere((0, -r * 0.62, 0.0), r * iris_scale, (1, 0.5, 1), mat(iris_hex, 0.45), g, seg=20, ring=10)
        sphere((0, -r * 0.82, 0.0), r * iris_scale * 0.55, (1, 0.4, 1), mat('15101c', 0.2), g, seg=16, ring=8)
        sphere((-r * 0.22, -r * 0.95, r * 0.25), r * 0.17, (1, 0.5, 1), mat('ffffff', 1.5, False, 2.5), g, seg=12, ring=6)
        groups.append(g)
    return groups

def make_mouth(root, loc, width, open_scale=(1, 0.35, 1)):
    smile = arc_curve(loc, width, math.radians(200), math.radians(340), width * 0.09, mat('3a1a28', 0.2), root)
    frown = arc_curve((loc[0], loc[1], loc[2] - width * 0.9), width * 0.8, math.radians(20), math.radians(160), width * 0.09, mat('3a1a28', 0.2), root)
    frown.scale = (0, 0, 0)
    mo = sphere((loc[0], loc[1] + 0.005, loc[2] - width * 0.45), width * 0.62, open_scale, mat('7a2236', 0.3), root, seg=20, ring=10)
    mo.scale = (0.001, 0.001, 0.001)
    return smile, frown, mo

CHAR = {}

# ------------------------------------------------------------------ Pieks
def build_pieks():
    root = empty('pieks')
    brown, honey, light = mat('8a5530'), mat('e9b47c'), mat('f0c48e')
    orange = mat('ff9a2e', 0.4)
    sphere((0, 0.02, 0.30), 0.25, (1, 0.92, 1.0), brown, root)
    sphere((0, -0.13, 0.25), 0.17, (1, 0.55, 1.05), light, root)
    sphere((0, -0.12, 0.38), 0.17, (1.05, 0.7, 0.92), honey, root)
    # Stacheln
    for p in fib_points(70):
        if p.y < -0.25 and p.z < 0.75: continue
        if p.z < -0.35: continue
        base = Vector((0, 0.03, 0.32)) + p * 0.23
        c = cone(base + p * 0.07, 0.045, 0.0, 0.16, brown, root, verts=8)
        aim(c, p)
        t = cone(base + p * 0.13, 0.021, 0.0, 0.07, orange, root, verts=8)
        aim(t, p)
    for dx, h in ((-0.07, 0.17), (0.0, 0.22), (0.07, 0.17)):
        d = Vector((dx * 2, -0.9, 0.9)).normalized()
        c = cone((dx, -0.08, 0.52), 0.05, 0.0, h, brown, root, verts=8); aim(c, d)
        t = cone((dx + d.x * h * 0.4, -0.08 + d.y * h * 0.4, 0.52 + d.z * h * 0.4), 0.025, 0, h * 0.4, orange, root, verts=8); aim(t, d)
    eyes = make_eyes(root, [(-0.065, -0.235, 0.41), (0.065, -0.235, 0.41)], 0.055, '2fb36a')
    sphere((0, -0.29, 0.355), 0.026, (1.2, 1, 0.8), mat('1a1218', 0.25), root)
    for sx in (-1, 1): sphere((sx * 0.12, -0.24, 0.35), 0.028, (1, 0.4, 0.6), mat('ff8fa8', 0.6), root, seg=12, ring=6)
    smile, frown, mo = make_mouth(root, (0, -0.282, 0.33), 0.04)
    for sx in (-1, 1): sphere((sx * 0.24, -0.06, 0.25), 0.055, (0.8, 0.8, 1.2), brown, root)
    blue, blue2 = mat('2f7de1'), mat('5aa0f5')
    for sx in (-1, 1):
        cyl((sx * 0.1, -0.02, 0.06), 0.065, 0.12, blue, root)
        sphere((sx * 0.1, -0.06, 0.02), 0.07, (1, 1.4, 0.45), blue, root)
        torus((sx * 0.1, -0.02, 0.12), 0.066, 0.014, blue2, root)
    pack = box((0, 0.23, 0.34), (0.26, 0.12, 0.26), mat('e8b83a'), root, bevel=0.04)
    star_prism((0, 0.30, 0.34), 0.06, 0.02, mat('e23b3b', 0.5), root)
    CHAR['pieks'] = dict(root=root, eyes=eyes, smile=smile, frown=frown, mo=mo, head=0.42)

# ------------------------------------------------------------------ Tupfi
def build_tupfi():
    root = empty('tupfi')
    fur, pink = mat('35c7c2'), mat('ff8cbc', 0.45)
    body = sphere((0, 0, 0.24), 0.22, (1, 0.96, 1), fur, root, seg=40, ring=20)
    dots = [(-0.35, -0.75, 0.55), (0.6, -0.65, 0.05), (0.0, -0.95, -0.25), (-0.97, -0.1, 0.0), (0.97, -0.05, 0.15), (-0.2, 0.9, 0.3), (0.25, 0.92, -0.2)]
    for d in dots:
        v = Vector(d).normalized()
        dd = sphere(Vector((0, 0, 0.24)) + v * 0.215, 0.045, (1, 1, 0.3), pink, root, seg=16, ring=8); aim(dd, v)
    for sx in (-1, 1):
        sphere((sx * 0.13, 0.0, 0.45), 0.065, (1, 0.55, 1), fur, root)
        sphere((sx * 0.13, -0.03, 0.45), 0.04, (1, 0.3, 1), mat('ff9bc0', 0.5), root, seg=16, ring=8)
    for k in range(5):
        a = k * 2 * math.pi / 5
        sphere((-0.17 + math.cos(a) * 0.025, -0.03, 0.52 + math.sin(a) * 0.025), 0.02, (1, 0.6, 1), mat('ffd33d', 0.5), root, seg=12, ring=6)
    sphere((-0.17, -0.045, 0.52), 0.013, (1, 0.6, 1), mat('ff9a2e', 0.5), root, seg=10, ring=5)
    eyes = make_eyes(root, [(-0.075, -0.18, 0.31), (0.075, -0.18, 0.31)], 0.06, '8a4fd6', iris_scale=0.66)
    for sx in (-1, 1): sphere((sx * 0.14, -0.17, 0.25), 0.028, (1, 0.4, 0.6), mat('ff7aa5', 0.6), root, seg=12, ring=6)
    smile, frown, mo = make_mouth(root, (0, -0.215, 0.235), 0.03)
    for sx in (-1, 1):
        sphere((sx * 0.08, -0.05, 0.03), 0.05, (1, 1.3, 0.5), mat('25a8a6'), root)
        sphere((sx * 0.22, -0.04, 0.22), 0.04, (0.8, 0.8, 1.2), fur, root)
    lan = empty('lantern', (0.27, -0.05, 0.2)); lan.parent = root
    cyl((0, 0, 0.08), 0.004, 0.08, mat('3a2a3f'), lan)
    star_prism((0, 0, 0.0), 0.06, 0.03, mat('ffd84a', 0, False, 3.0), lan)
    CHAR['tupfi'] = dict(root=root, eyes=eyes, smile=smile, frown=frown, mo=mo, head=0.3)

# ------------------------------------------------------------------ Gustav
def build_gustav():
    root = empty('gustav')
    white, red, orange = mat('fbfaf6', 0.35), mat('e8333a'), mat('f59a23')
    sphere((0, 0, 0.42), 0.27, (1, 0.9, 1.0), white, root)
    for k, (x, z, r) in enumerate([(0.0, 0.62, 0.1), (0.05, 0.55, 0.11), (-0.05, 0.6, 0.1)]):
        pass
    for dz, ry in ((0.1, -0.4), (0.0, 0.0), (-0.1, 0.4)):
        sphere((0.0, 0.26, 0.48 + dz), 0.08, (0.5, 1.6, 0.6), mat('f2eee4'), root, rot=(0.6, 0, ry))
    wings = []
    for sx in (-1, 1):
        w = empty('wing', (sx * 0.25, 0.0, 0.5)); w.parent = root
        sphere((sx * 0.03, 0, -0.08), 0.1, (0.45, 1.0, 1.4), mat('f2eee4'), w)
        wings.append(w)
    for sx in (-1, 1):
        cyl((sx * 0.09, 0, 0.1), 0.018, 0.2, orange, root)
        for d in (-0.4, 0, 0.4):
            c = cyl((sx * 0.09 + math.sin(d) * 0.04, -math.cos(d) * 0.04, 0.01), 0.012, 0.09, orange, root, rot=(math.pi / 2, 0, d))
    head = empty('head', (0, -0.05, 0.78)); head.parent = root
    sphere((0, 0, 0), 0.17, (1, 0.95, 1), white, head)
    for i, (x, z, r) in enumerate([(-0.06, 0.17, 0.05), (0.0, 0.2, 0.06), (0.06, 0.17, 0.05)]):
        sphere((x, 0.0, z), r, (0.6, 1, 1), red, head)
    eyes = make_eyes(head, [(-0.065, -0.13, 0.04), (0.065, -0.13, 0.04)], 0.05, 'e0951c')
    for sx in (-1, 1): sphere((sx * 0.07, -0.15, 0.11), 0.045, (1.3, 0.5, 0.35), mat('dcd6ca'), head, rot=(0, sx * -0.2, 0))
    cone((0, -0.2, -0.02), 0.045, 0.0, 0.11, orange, head, rot=(math.pi / 2, 0, 0), verts=12, scale=(1.3, 1, 0.8))
    lb = empty('lowbeak', (0, -0.15, -0.05)); lb.parent = head
    cone((0, -0.04, -0.005), 0.035, 0.0, 0.08, mat('e0841a'), lb, rot=(math.pi / 2, 0, 0), verts=12, scale=(1.2, 1, 0.6))
    sphere((0, -0.14, -0.12), 0.035, (0.7, 0.6, 1.3), red, head)
    torus((0, -0.02, 0.62), 0.12, 0.012, mat('2e9e4f'), root, rot=(math.radians(70), 0, 0))
    cyl((0, -0.22, 0.52), 0.05, 0.025, mat('d9a441', 0.4), root, rot=(math.pi / 2, 0, 0))
    cyl((0, -0.235, 0.52), 0.04, 0.01, mat('fff7e0', 0.6), root, rot=(math.pi / 2, 0, 0))
    CHAR['gustav'] = dict(root=root, eyes=eyes, lowbeak=lb, head=head, wings=wings, headz=0.78)

# ------------------------------------------------------------------ Wuschel
def build_wuschel():
    root = empty('wuschel')
    mb = bpy.data.metaballs.new('cloud'); mb.resolution = 0.04; mb.render_resolution = 0.025
    for (x, y, z, r) in [(-0.16, 0, 0.0, 0.17), (0.16, 0, 0.0, 0.17), (0, 0, 0.09, 0.2), (-0.07, 0, -0.06, 0.15), (0.08, 0, -0.06, 0.15), (0, 0.05, 0, 0.18)]:
        e = mb.elements.new(); e.co = (x, y, z); e.radius = r; e.stiffness = 2.0
    o = bpy.data.objects.new('cloudmesh', mb); sc.collection.objects.link(o)
    o.data.materials.append(mat('ffffff', 0.55)); o.parent = root
    eyes = []
    for sx in (-1, 1):
        g = empty('weye', (sx * 0.07, -0.19, 0.04)); g.parent = root
        sphere((0, 0, 0), 0.028, (1, 0.6, 1.3), mat('15101c', 0.2), g, seg=12, ring=8)
        sphere((-0.008, -0.016, 0.012), 0.008, (1, 1, 1), mat('ffffff', 1.5, False, 2.5), g, seg=8, ring=4)
        eyes.append(g)
        sphere((sx * 0.13, -0.17, -0.01), 0.025, (1, 0.4, 0.6), mat('ff9fb8', 0.7), root, seg=12, ring=6)
    CHAR['wuschel'] = dict(root=root, eyes=eyes)

# ------------------------------------------------------------------ Sola
def build_sola():
    root = empty('sola')
    R = 2.0
    sphere((0, 0, 0), R, (1, 1, 1), mat('ffd84a', 0.9), root, seg=48, ring=24)
    rnd = random.Random(2)
    rays = []
    for k in range(16):
        a = 2 * math.pi * k / 16
        g = empty('ray', (math.cos(a) * (R + 0.45), 0.25, math.sin(a) * (R + 0.45))); g.parent = root
        torus((0, 0, 0), 0.32, 0.13, mat('ffb43a' if k % 2 else 'ffc94a', 0.8), g, rot=(math.pi / 2, 0, 0))
        sphere((0, 0, 0), 0.22, (1, 0.6, 1), mat('ffe48a', 0.9), g, seg=16, ring=8)
        rays.append(g)
    eyes = make_eyes(root, [(-0.7, -1.62, 0.35), (0.7, -1.62, 0.35)], 0.42, 'e0901c')
    for sx in (-1, 1): sphere((sx * 1.25, -1.45, -0.35), 0.3, (1, 0.3, 0.6), mat('ff9a3c', 0.8), root, seg=16, ring=8)
    spot = sphere((-1.12, -1.5, -0.15), 0.19, (1, 0.35, 1), mat('7a4a2a', 0.3), root, seg=16, ring=8)
    aim(spot, Vector((-1.12, -1.5, -0.15)).normalized())
    smile, frown, mo = make_mouth(root, (0, -1.93, -0.55), 0.38)
    cap = empty('cap', (0, 0.1, 1.55)); cap.parent = root
    cone((0.3, 0, 0.8), 1.35, 0.15, 1.8, mat('ff8fc2'), cap, rot=(0, math.radians(-25), 0))
    torus((0, 0, 0.0), 1.45, 0.22, mat('ffd1e6'), cap, rot=(0, 0, 0))
    sphere((1.15, 0, 1.55), 0.32, (1, 1, 1), mat('ffe14d', 0.6), cap)
    CHAR['sola'] = dict(root=root, eyes=eyes, smile=smile, frown=frown, mo=mo, cap=cap, rays=rays)

# ------------------------------------------------------------------ Opa Mond
def build_mond():
    root = empty('mond')
    a = sphere((0, 0, 0), 2.4, (1, 0.55, 1), mat('c9dcf5', 0.6), root, seg=48, ring=24)
    b = sphere((1.6, 0, 0.35), 2.2, (1, 0.8, 1), None, root, seg=32, ring=16)
    mod = a.modifiers.new('cut', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = b
    b.hide_render = True; b.hide_viewport = True
    g = make_eyes(root, [(-1.0, -1.1, 0.55)], 0.28, '3f5f9a')
    sphere((-0.6, -1.2, 0.0), 0.25, (1, 0.6, 0.8), mat('b9cde8'), root)
    for dx in (-0.4, -0.1, 0.2): sphere((-0.75 + dx * 0.6 + 0.2, -1.15, -0.4), 0.18, (1.2, 0.6, 0.8), mat('ffffff', 0.6), root)
    cone((-0.4, 0, 2.5), 0.9, 0.08, 1.4, mat('2b3f8f'), root, rot=(0, math.radians(30), 0))
    torus((-0.75, 0, 1.95), 0.85, 0.15, mat('4a63c2'), root, rot=(0, math.radians(30), 0))
    star_prism((0.1, -0.2, 3.25), 0.28, 0.12, mat('ffe14d', 0.8), root)
    smile, frown, mo = make_mouth(root, (-0.75, -1.25, -0.75), 0.18)
    CHAR['mond'] = dict(root=root, eyes=g, smile=smile, frown=frown, mo=mo)

# ------------------------------------------------------------------ Welt
def sky_dome():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=400, location=(0, 0, 0))
    o = bpy.context.active_object
    for p in o.data.polygons: p.use_smooth = True
    m = bpy.data.materials.new('sky'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    mapr = nt.nodes.new('ShaderNodeMapRange'); mapr.inputs['From Min'].default_value = -60; mapr.inputs['From Max'].default_value = 260
    nt.links.new(sep.outputs['Z'], mapr.inputs['Value'])
    ramps = {}
    for name, (lo, mid, hi) in {'night': ('5a3f8f', '2b2f78', '0f1240'), 'dusk': ('ffb3c7', 'a35fa8', '3a2f7a'), 'day': ('fff0c2', 'a8ddff', '5fb8ff')}.items():
        cr = nt.nodes.new('ShaderNodeValToRGB')
        cr.color_ramp.elements[0].color = hexrgb(lo); cr.color_ramp.elements[1].color = hexrgb(hi)
        e = cr.color_ramp.elements.new(0.35); e.color = hexrgb(mid)
        nt.links.new(mapr.outputs[0], cr.inputs[0]); ramps[name] = cr
    mixA = nt.nodes.new('ShaderNodeMix'); mixA.data_type = 'RGBA'
    mixB = nt.nodes.new('ShaderNodeMix'); mixB.data_type = 'RGBA'
    nt.links.new(ramps['night'].outputs[0], mixA.inputs[6]); nt.links.new(ramps['dusk'].outputs[0], mixA.inputs[7])
    nt.links.new(mixA.outputs[2], mixB.inputs[6]); nt.links.new(ramps['day'].outputs[0], mixB.inputs[7])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
    nt.links.new(mixB.outputs[2], em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0])
    o.data.materials.append(m)
    o.visible_shadow = False; o.visible_diffuse = False
    for c in o.users_collection: c.objects.unlink(o)
    NOLINE.objects.link(o)
    return mixA.inputs[0], mixB.inputs[0]

def stars():
    import bmesh
    bm = bmesh.new(); r = random.Random(5)
    for i in range(500):
        v = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(0.05, 1))).normalized() * 350
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r.uniform(0.5, 1.4), matrix=__import__('mathutils').Matrix.Translation(v))
    me = bpy.data.meshes.new('stars'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('stars', me); NOLINE.objects.link(o)
    o.data.materials.append(mat('fffbe0', 0, False, 6.0))
    o.visible_shadow = False
    return o

def world():
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = hexrgb('3a3f8f'); bg.inputs['Strength'].default_value = 0.6
    return bg

def ground():
    bpy.ops.mesh.primitive_plane_add(size=140, location=(0, 0, 0))
    g = bpy.context.active_object
    sub = g.modifiers.new('s', 'SUBSURF'); sub.levels = 0
    g.data.materials.append(mat('5cbf5a', 0.22))
    return g

def mushroom_house(loc, s, wall, roof):
    root = empty('house', loc)
    cyl((0, 0, 0.7 * s), 0.75 * s, 1.4 * s, mat(wall), root)
    sphere((0, 0, 1.35 * s), 1.25 * s, (1, 1, 0.65), mat(roof), root, seg=32, ring=16)
    win = cyl((0, -0.74 * s, 0.75 * s), 0.25 * s, 0.06, mat('ffd36b', 0.3), root, rot=(math.pi / 2, 0, 0))
    for k in range(5):
        a = k * 1.2 + 0.4
        sphere((math.cos(a) * 0.8 * s, math.sin(a) * 0.8 * s - 0.1 * s, 1.6 * s + (k % 2) * 0.15 * s), 0.16 * s, (1, 1, 0.5), mat('ffffff', 0.5), root)
    box((0, -0.76 * s, 0.32 * s), (0.42 * s, 0.05, 0.64 * s), mat('a06a4a'), root, bevel=0.03)
    return root, win

def tower(loc):
    root = empty('tower', loc)
    box((0, 0, 2.0), (1.2, 1.2, 4.0), mat('f0e2c8'), root, bevel=0.06)
    cyl((0, -0.6, 3.0), 0.32, 0.06, mat('2b2f60', 0.3), root, rot=(math.pi / 2, 0, 0))
    box((0, 0, 4.12), (1.6, 1.6, 0.24), mat('b47b45'), root, bevel=0.04)
    return root

def mountain(loc, r, h):
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=r, radius2=0.8, depth=h, location=(loc[0], loc[1], loc[2] + h / 2))
    o = bpy.context.active_object
    o.data.materials.append(mat('6f85c8', 0.35))
    for p in o.data.polygons: p.use_smooth = True
    # Spiralweg
    cu = bpy.data.curves.new('path', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.25
    sp = cu.splines.new('POLY'); n = 160; sp.points.add(n - 1)
    for i in range(n):
        u = i / (n - 1); z = u * h * 0.95; rr = r * (1 - z / h) + 0.25
        a = u * 2 * math.pi * 4.5
        sp.points[i].co = (loc[0] + math.cos(a) * rr, loc[1] + math.sin(a) * rr, loc[2] + z, 1)
    po = bpy.data.objects.new('path', cu); sc.collection.objects.link(po); po.data.materials.append(mat('e9d2a6', 0.4))
    return o

def flower(loc, col):
    root = empty('flower', loc)
    cyl((0, 0, 0.18), 0.012, 0.36, mat('3e9c3a'), root)
    head = empty('fhead', (0, 0, 0.38)); head.parent = root
    for k in range(6):
        a = k * math.pi / 3
        sphere((math.cos(a) * 0.07, 0, math.sin(a) * 0.07), 0.05, (1, 0.4, 1), mat(col, 0.5), head, seg=12, ring=6)
    sphere((0, -0.02, 0), 0.045, (1, 0.6, 1), mat('ffe46b', 0.6), head, seg=12, ring=6)
    return head

def cloud_cluster(center, spread, n, size, seed, hexc='ffffff', coll=None):
    r = random.Random(seed); objs = []
    for i in range(n):
        p = (center[0] + r.uniform(-spread[0], spread[0]), center[1] + r.uniform(-spread[1], spread[1]), center[2] + r.uniform(-spread[2], spread[2]))
        objs.append(sphere(p, size * r.uniform(0.7, 1.3), (1, 1, 0.7), mat(hexc, 0.6), None, seg=24, ring=12, coll=coll))
    return objs

# ------------------------------------------------------------------ Bauen
build_pieks(); build_tupfi(); build_gustav(); build_wuschel(); build_sola(); build_mond()
skyA, skyB = sky_dome()
STARS = stars()
BG = world()
ground()
WINDOWS = []
for (x, y, s, wall, roof) in [(-5.5, 4.5, 1.2, 'ffe1c7', 'ff7f7f'), (-2.8, 8, 1.0, 'd2f2e4', '7fb8ff'), (3.2, 7.5, 1.1, 'fff3b0', 'ff9fd0'),
                              (6, 4, 1.3, 'ffd7e8', '8fdc7f'), (-8, 10, 1.0, 'd8e9ff', 'ffb36b'), (8.5, 11, 1.0, 'ffe1c7', 'b583e6')]:
    h, w = mushroom_house((x, y, 0), s, wall, roof); WINDOWS.append(w)
tower((0, 4, 0))
# Schneckenbrunnen
cyl((0, -0.2, 0.15), 1.1, 0.3, mat('9fb3c8'), None)
cyl((0, -0.2, 0.28), 0.95, 0.06, mat('4a8fd8', 0.5), None)
torus((0, -0.2, 0.75), 0.32, 0.18, mat('f2b0d0'), None, rot=(math.pi / 2, 0, 0))
sphere((0, -0.2, 0.75), 0.2, (1, 0.6, 1), mat('d98ab0'), None)
MOUNT = mountain((0, 45, 0), 16, 20)
GLOW = sphere((0, 45, 20.6), 1.8, (1, 1, 0.6), mat('ffd84a', 0, False, 6.0), None, coll=NOLINE)
FLOWERS = []
for k in range(14):
    a = k * 2 * math.pi / 14
    FLOWERS.append(flower((math.cos(a) * 1.6, -0.2 + math.sin(a) * 1.6, 0), ['ff6fa0', 'ffcf2e', 'b583e6', 'ff8f4a', '6fb8ff'][k % 5]))
for (x, y) in [(-3, -2), (3.5, -1.5), (-1.5, 2.5)]: sphere((x, y, 0), 0.6, (1.4, 1, 0.6), mat('4fb03f'), None)
# Himmels-Set (Flug)
SKYZ = 80
FLIGHT_CLOUDS = cloud_cluster((0, 40, SKYZ - 16), (50, 35, 1.5), 40, 4.5, 11, 'd8d2ec')
# Schlafzimmer der Sonne (x=100)
BX = 100
cloud_cluster((BX, 0, -0.5), (9, 5, 0.3), 46, 1.2, 12, 'ffffff')
cloud_cluster((BX, 6, 1.5), (7, 1.2, 2.5), 26, 1.3, 13, 'fdf8ff')
BLANKET = sphere((BX, 2.2, 0.0), 1.0, (3.7, 2.7, 6.0), mat('ff9ec8', 0.4), None, seg=48, ring=24)
bpy.context.view_layer.update()
for k in range(10):
    a = -1.2 + k * 0.27
    st = star_prism((BX + math.sin(a) * 3.55, 2.2 - math.cos(a) * 2.55 * 0.98, 1.8 + (k % 2) * 1.2), 0.3, 0.1, mat('ffd84a', 0.6), BLANKET)
    st.parent = BLANKET
    st.matrix_parent_inverse = BLANKET.matrix_world.inverted()
SIGN = box((BX + 5.5, -1.0, 1.3), (1.4, 0.1, 0.6), mat('c48a4a'), None)
CHEST = box((BX - 5.2, -0.6, 0.45), (1.0, 0.7, 0.7), mat('8a5530'), None)
sphere((BX - 5.2, -0.6, 0.8), 0.5, (1, 0.7, 0.5), mat('a06a4a'), None)

SUN_LAMP = bpy.data.lights.new('sun', 'SUN'); SUN_LAMP.angle = math.radians(3)
sun_o = bpy.data.objects.new('sun', SUN_LAMP); sc.collection.objects.link(sun_o)
sun_o.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))

# ------------------------------------------------------------------ Animation
shots = {s['name']: s for s in TL['shots']}
def T(name, frac=0.0):
    s = shots[name]; return s['start'] + (s['end'] - s['start']) * frac
def S(name): return shots[name]['start']
def E(name): return shots[name]['end']

def place(name, t, loc, rz=0.0, s=1.0, interp='BEZIER', cut=True):
    """cut=True: vorher konstant halten, dann springen"""
    root = CHAR[name]['root']; f = F(t)
    if cut and f > 1:
        key(root, 'location', f - 1, 'CONSTANT'); key(root, 'rotation_euler', f - 1, 'CONSTANT'); key(root, 'scale', f - 1, 'CONSTANT')
    root.location = loc; root.rotation_euler = (0, 0, rz); root.scale = (s, s, s)
    key(root, 'location', f, interp); key(root, 'rotation_euler', f, interp); key(root, 'scale', f, interp)

def move(name, t0, t1, loc1, rz=None, s=None):
    root = CHAR[name]['root']
    key(root, 'location', F(t0)); key(root, 'rotation_euler', F(t0)); key(root, 'scale', F(t0))
    root.location = loc1
    if rz is not None: root.rotation_euler = (0, 0, rz)
    if s is not None: root.scale = (s, s, s)
    key(root, 'location', F(t1)); key(root, 'rotation_euler', F(t1)); key(root, 'scale', F(t1))

def hop(name, t, h=0.25, dur=0.4):
    root = CHAR[name]['root']; base = Vector(root.location)
    sc.frame_set(F(t)); base = Vector(root.location)
    for u, dz in ((0, 0), (0.5, h), (1, 0)):
        root.location = base + Vector((0, 0, dz)); key(root, 'location', F(t + u * dur))

def blink_all(t0, t1):
    r = random.Random(1)
    for name, c in CHAR.items():
        eyes = c.get('eyes') or []
        t = t0 + r.uniform(0.5, 2.5)
        while t < t1:
            for e in eyes:
                for dt, z in ((0, 1.0), (0.06, 0.1), (0.14, 1.0)):
                    e.scale = (1, 1, z); key(e, 'scale', F(t + dt))
            t += r.uniform(2.5, 4.5)

def set_vis(obj, t, show):
    """Sichtbarkeit über Skalierung (0 oder 1), konstant"""
    f = F(t)
    if f > 1: key(obj, 'scale', f - 1, 'CONSTANT')
    obj.scale = (1, 1, 1) if show else (0, 0, 0); key(obj, 'scale', f, 'CONSTANT')

def talk_all():
    for shot in TL['shots']:
        for ev in shot['events']:
            if ev['kind'] != 'line': continue
            for member, env in ev['env'].items():
                c = CHAR.get(member)
                if not c: continue
                f0 = F(ev['start'])
                for i in range(0, len(env) + 2, 1):
                    v = env[i] if i < len(env) else 0.0
                    o = v if v > 0.12 else 0.0
                    if member == 'gustav':
                        c['lowbeak'].rotation_euler = (math.radians(-35 * o), 0, 0); key(c['lowbeak'], 'rotation_euler', f0 + i, 'LINEAR')
                    elif 'mo' in c:
                        c['mo'].scale = (0.7 + 0.3 * o, 0.35, 0.15 + 0.85 * o) if o else (0.001, 0.001, 0.001)
                        key(c['mo'], 'scale', f0 + i, 'CONSTANT')

# Startzustände
for name in CHAR: place(name, 0, (0, -50, -50), cut=False)
sky_keys = []
def sky(t, dusk, day, interp='CONSTANT'):
    f = F(t); prefs.keyframe_new_interpolation_type = interp
    skyA.default_value = dusk; skyA.keyframe_insert('default_value', frame=f)
    skyB.default_value = day; skyB.keyframe_insert('default_value', frame=f)
    BG.inputs['Color'].default_value = tuple(a + (b - a) * day for a, b in zip(hexrgb('3a3f8f' if not dusk else 'c98fb8'), hexrgb('bfe4ff')))
    BG.inputs['Color'].keyframe_insert('default_value', frame=f)
    SUN_LAMP.energy = 1.2 + 2.6 * day + 1.0 * dusk; SUN_LAMP.keyframe_insert('energy', frame=f)
    SUN_LAMP.color = tuple(a + (b - a) * day for a, b in zip((0.65, 0.72, 1.0), (1.0, 0.95, 0.85))); SUN_LAMP.keyframe_insert('color', frame=f)
    STARS.hide_render = day > 0.6; STARS.keyframe_insert('hide_render', frame=f)
    for w in WINDOWS:
        w.hide_render = day > 0.6; w.keyframe_insert('hide_render', frame=f)

def fix_constant_sky():
    pass

# --- HOOK (Nacht, Dorf)
sky(0, 0, 0)
place('gustav', 0, (0, 4, 4.24), 0, 1.6)
place('pieks', 0, (-0.45, -1.9, 0), 0.15, 1.0); place('tupfi', 0, (0.45, -1.95, 0), -0.15, 1.0)
g = CHAR['gustav']
def wings(t, up):
    for i, w in enumerate(g['wings']):
        w.rotation_euler = (0, (-1 if i == 0 else 1) * (math.radians(70) if up else 0), 0); key(w, 'rotation_euler', F(t))
def headtilt(t, ang):
    g['head'].rotation_euler = (math.radians(ang), 0, 0); key(g['head'], 'rotation_euler', F(t))
wings(0, False); headtilt(0, 0)
crow = [w for w in TL['words'] if w['word'] == 'KIKERIKI!']
t_crow = crow[0]['t']
headtilt(t_crow - 0.2, 0); headtilt(t_crow + 0.1, -25); wings(t_crow, False); wings(t_crow + 0.25, True)
hk = shots['hook']
t_nothing = hk['events'][3]['start']
headtilt(t_nothing, 0); wings(t_nothing + 0.6, False)
move('gustav', t_nothing, t_nothing + 0.5, (0, 4, 4.24), rz=math.pi)
t_shock = hk['events'][5]['start']
move('gustav', t_shock - 0.4, t_shock, (0, 4, 4.24), rz=0)
hop('gustav', t_shock, 0.25, 0.35)

# --- SQUARE
hop('tupfi', S('square') + 0.1, 0.2); hop('pieks', shots['square']['events'][1]['start'], 0.3)

# --- FLIGHT
f0, f1 = S('flight'), E('flight')
sky(f0, 0, 0)
place('wuschel', f0, (0, -4, SKYZ), 0, 5.0)
place('pieks', f0, (-0.55, -4.1, SKYZ + 1.05), 0, 1.0); place('tupfi', f0, (0.05, -4.25, SKYZ + 1.08), 0, 1.0)
place('gustav', f0, (0.62, -3.95, SKYZ + 1.05), 0, 0.85)
steps = 8
for k in range(1, steps + 1):
    t = f0 + (f1 - f0) * k / steps; dy = 9 * k / steps; bob = 0.08 * math.sin(k * 1.7)
    for n, base in (('wuschel', (0, -4, SKYZ)), ('pieks', (-0.55, -4.1, SKYZ + 1.05)), ('tupfi', (0.05, -4.25, SKYZ + 1.08)), ('gustav', (0.62, -3.95, SKYZ + 1.05))):
        r = CHAR[n]['root']; r.location = (base[0], base[1] + dy, base[2] + bob); key(r, 'location', F(t), 'BEZIER')
place('mond', f0, (5.5, 14, SKYZ + 2.5), math.radians(-20), 1.0)
for o in FLIGHT_CLOUDS:
    o.hide_render = True; o.keyframe_insert('hide_render', frame=1)
    o.hide_render = False; o.keyframe_insert('hide_render', frame=F(f0))
    o.hide_render = True; o.keyframe_insert('hide_render', frame=F(f1))

# --- BEDROOM / REVEAL
b0 = S('bedroom')
sky(b0, 1, 0)
place('sola', b0, (BX, 2.6, 2.25), 0, 1.0)
place('pieks', b0, (BX - 1.4, -1.9, 0.0), 0.15, 1.6); place('tupfi', b0, (BX - 0.55, -2.1, 0.0), 0.0, 1.6)
place('gustav', b0, (BX + 0.9, -1.8, 0.0), -0.2, 1.3); place('wuschel', b0, (BX - 1.1, -1.6, 1.6), 0.2, 1.4)
place('mond', b0, (0, -50, -50))
sola = CHAR['sola']
set_vis(sola['smile'], 0, False); set_vis(sola['frown'], 0, True)
key(BLANKET, 'location', 1); key(BLANKET, 'scale', 1)
bd = shots['bedroom']['events']
t_quak = bd[1]['start']
move('gustav', t_quak - 0.9, t_quak - 0.3, (BX + 0.4, -0.9, 0.0))
headtilt(t_quak - 0.1, 0); headtilt(t_quak + 0.1, -25); headtilt(t_quak + 1.2, 0)
t_gig = bd[3]['start']
for k in range(10):
    BLANKET.rotation_euler = (0, math.radians(2.5 * (1 if k % 2 else -1)), 0); key(BLANKET, 'rotation_euler', F(t_gig + k * 0.15))
BLANKET.rotation_euler = (0, 0, 0); key(BLANKET, 'rotation_euler', F(t_gig + 1.6))
t_reveal = bd[6]['start']
key(BLANKET, 'location', F(t_reveal))
BLANKET.location = (BX, 2.0, -6.5); key(BLANKET, 'location', F(t_reveal + 2.3))
rv = shots['reveal']['events']
hop('pieks', rv[0]['start'], 0.2)
hop('tupfi', rv[1]['start'] + 2.5, 0.2)
t_up = rv[3]['start']
set_vis(sola['frown'], t_up - 0.3, False); set_vis(sola['smile'], t_up - 0.3, True)
hop('wuschel', t_up, 0.3)

# --- SUNRISE (Dorf, Tag kommt)
s0 = S('sunrise')
place('sola', s0, (0, 75, -30), 0, 6.0)
move('sola', s0 + 0.1, s0 + 4.4, (0, 75, 30))
sky(s0, 0, 0, 'LINEAR')
nsteps = 6
for k in range(1, nsteps + 1):
    sky(s0 + 4.2 * k / nsteps, 0, k / nsteps, 'LINEAR' if k < nsteps else 'CONSTANT')
GLOW.hide_render = False; GLOW.keyframe_insert('hide_render', frame=1)
GLOW.hide_render = True; GLOW.keyframe_insert('hide_render', frame=F(s0))
place('pieks', s0, (-0.45, -1.9, 0), 0.15, 1.0); place('tupfi', s0, (0.45, -1.95, 0), -0.15, 1.0)
place('wuschel', s0, (1.0, -1.8, 1.25), -0.2, 1.0)
set_vis(CHAR['sola']['cap'], s0, False)
place('gustav', s0, (0, 4, 4.24), 0, 1.6)
for i, fh in enumerate(FLOWERS):
    fh.scale = (0.15, 0.15, 0.15); key(fh, 'scale', 1, 'CONSTANT'); key(fh, 'scale', F(s0 + 4.6 + i * 0.05), 'BEZIER')
    fh.scale = (1.25, 1.25, 1.25); key(fh, 'scale', F(s0 + 4.8 + i * 0.05)); fh.scale = (1, 1, 1); key(fh, 'scale', F(s0 + 5.0 + i * 0.05))
sr = shots['sunrise']['events']
hop('pieks', sr[2]['start'], 0.35); hop('tupfi', sr[2]['start'] + 0.15, 0.35)

# --- FINALE
fn = shots['finale']['events']
headtilt(fn[0]['start'] - 0.1, 0); headtilt(fn[0]['start'] + 0.15, -30); wings(fn[0]['start'], False); wings(fn[0]['start'] + 0.3, True)
headtilt(fn[1]['start'], 0); wings(fn[1]['start'] + 0.2, False)
headtilt(fn[2]['start'], 12)
for k, n in enumerate(['pieks', 'tupfi', 'wuschel']): hop(n, fn[3]['start'] + 0.1 * k, 0.3)
hop('pieks', fn[4]['start'] + 0.5, 0.3); hop('tupfi', fn[4]['start'] + 0.7, 0.3)

blink_all(0, TL['total'])
talk_all()

# ------------------------------------------------------------------ Kameras
CAMS = []
def cam(t0, t1, p0, l0, p1, l1, lens0=35, lens1=None):
    cd = bpy.data.cameras.new('cam'); cd.lens = lens0; cd.clip_end = 1000; cd.sensor_fit = 'VERTICAL'
    o = bpy.data.objects.new('cam', cd); sc.collection.objects.link(o)
    tgt = empty('tgt')
    con = o.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    o.location = p0; tgt.location = l0; key(o, 'location', F(t0)); key(tgt, 'location', F(t0)); key(cd, 'lens', F(t0))
    o.location = p1; tgt.location = l1; cd.lens = lens1 or lens0
    key(o, 'location', F(t1)); key(tgt, 'location', F(t1)); key(cd, 'lens', F(t1))
    CAMS.append((F(t0), o))

def head_of(name, t):
    sc.frame_set(F(t)); r = CHAR[name]['root']
    hz = {'pieks': 0.4, 'tupfi': 0.3, 'gustav': 0.8, 'wuschel': 0.0, 'sola': 0.0, 'mond': 0.0}[name]
    return Vector(r.location) + Vector((0, 0, hz * r.scale[2]))

# HOOK
h = shots['hook']; ev = h['events']
cam(0, ev[1]['start'] + 1.6, (0, -26, 14), (0, 4, 3.5), (2, -15, 7), (0, 4, 4.5), 28, 30)
cam(ev[1]['start'] + 1.6, ev[2]['start'], (-9, -6, 1.6), (-1, 4, 4.0), (8, -6, 2.0), (1, 4, 4.5), 30)
gh = Vector((0, 4, 4.24 + 0.8 * 1.6))
cam(ev[2]['start'], ev[3]['start'], (0.6, 0.6, 3.0), gh, (0.4, 1.8, 3.6), gh, 32, 38)
cam(ev[3]['start'], ev[5]['start'], (0.4, 1.5, 5.4), (0.6, 45, 9), (0.3, 2.3, 5.3), (0.6, 45, 12), 30, 32)
cam(ev[5]['start'], h['end'], (0, 0.2, 5.4), gh, (0, 2.6, 5.5), gh, 32, 60)
# SQUARE
q = shots['square']; ev = q['events']
pc, tc = Vector((-0.45, -1.9, 0.42)), Vector((0.45, -1.95, 0.3))
cam(q['start'], ev[0]['start'] + 2.6, (-2.4, -3.6, 0.45), (0, -1.9, 0.35), (1.6, -3.4, 0.55), (0, -1.9, 0.4), 30)
cam(ev[0]['start'] + 2.6, ev[1]['start'], (0, -0.6, 0.6), (0, 45, 14), (0.4, -9, 4.0), (0, 45, 16), 24, 28)
cam(ev[1]['start'], q['end'], (-0.9, -3.1, 0.22), pc, (-0.6, -2.55, 0.35), pc, 32, 40)
# FLIGHT
fl = shots['flight']; ev = fl['events']
c0 = Vector((0, -4, SKYZ + 0.5))
cam(fl['start'], ev[1]['start'] + 2.0, c0 + Vector((-4.5, -3.0, 1.5)), c0, c0 + Vector((3.5, -0.5, 2.0)) + Vector((0, 4, 0)), c0 + Vector((0, 4, 0)), 28)
cam(ev[1]['start'] + 2.0, ev[2]['start'], c0 + Vector((-7, 2, -0.5)), Vector((4, 12, SKYZ + 2)), c0 + Vector((-4, 5, 0.5)), Vector((5, 14, SKYZ + 2.5)), 24, 30)
mf = Vector((5.5, 14, SKYZ + 2.5)) + Vector((-0.8, -1.2, 0.3))
cam(ev[2]['start'], fl['end'], mf + Vector((-2.5, -9, 0)), mf, mf + Vector((-1.2, -5.5, 0.3)), mf, 35, 45)
# BEDROOM
bd_s = shots['bedroom']; ev = bd_s['events']
cam(bd_s['start'], ev[1]['start'], (BX, -12, 4), (BX, 2, 2.5), (BX + 1, -8.5, 3), (BX, 2, 2.5), 30)
gq = Vector((BX + 0.4, -0.9, 0.8 * 1.3))
cam(ev[1]['start'], ev[3]['start'], gq + Vector((1.6, -1.8, -0.3)), gq, gq + Vector((0.9, -1.0, -0.2)), gq, 32, 40)
cam(ev[3]['start'], ev[4]['start'], (BX - 2, -6, 0.6), (BX, 2, 3), (BX - 0.5, -4.5, 1.0), (BX, 2, 3.5), 28, 32)
tq = Vector((BX - 0.55, -2.1, 0.45))
cam(ev[4]['start'], ev[5]['start'], tq + Vector((-0.9, -1.6, 0.4)), Vector((BX, 2, 2.5)), tq + Vector((-0.4, -1.2, 0.3)), Vector((BX, 2, 3)), 30)
cam(ev[5]['start'], ev[6]['start'], (BX + 3, -5, 1.0), (BX, 2, 3.0), (BX + 1.5, -4.2, 1.6), (BX, 2, 3.0), 30, 36)
sface = Vector((BX, 2.6 - 1.6, 2.4))
cam(ev[6]['start'], bd_s['end'], (BX, -5.5, 0.8), (BX, 2, 2.0), (BX, -7.5, 2.6), sface, 30, 34)
# REVEAL
rv_s = shots['reveal']; ev = rv_s['events']
pq = Vector((BX - 1.4, -1.9, 0.65))
cam(rv_s['start'], ev[1]['start'], pq + Vector((-0.7, -1.4, 0.0)), pq, pq + Vector((-0.4, -0.9, 0.1)), pq, 30, 36)
cam(ev[1]['start'], ev[2]['start'], tq + Vector((-2.2, -2.0, 0.6)), Vector((BX - 0.2, 0, 1.4)), tq + Vector((1.6, -2.2, 0.8)), Vector((BX, 0.5, 1.8)), 26, 28)
spot = Vector((BX - 1.12, 2.6 - 1.5, 2.25 - 0.15))
cam(ev[2]['start'], ev[3]['start'], spot + Vector((-0.5, -1.6, 0.1)), spot, Vector((BX - 1, -6.5, 2.0)), Vector((BX, 2.6, 2.3)), 50, 30)
cam(ev[3]['start'], rv_s['end'], (BX, -9, 1.0), (BX, 2, 2.2), (BX, -10.5, 1.8), (BX, 2, 2.6), 30, 28)
# SUNRISE
sr_s = shots['sunrise']; ev = sr_s['events']
cam(sr_s['start'], ev[1]['start'], (0, -12, 1.5), (0, 45, 8), (0, -18, 7), (0, 45, 20), 26, 24)
cam(ev[1]['start'], ev[2]['start'], (-1.8, -3.6, 2.4), (0, -0.8, 0.1), (2.0, -3.2, 2.0), (0, -0.8, 0.2), 28)
cam(ev[2]['start'], sr_s['end'], (0, -4.6, 0.6), (0, -1.9, 0.5), (0.8, -6.5, 1.5), (0, -1.9, 0.6), 30, 28)
# FINALE
fz = shots['finale']; ev = fz['events']
cam(fz['start'], ev[1]['start'], (0.5, 1.0, 2.6), gh, (0.3, 2.2, 3.4), gh, 28, 40)
cam(ev[1]['start'], ev[2]['start'], (0, -14, 3), (0, 3, 3), (0, -12, 3.5), (0, 3, 3.5), 28)
cam(ev[2]['start'], ev[3]['start'], gh + Vector((0.6, -1.8, -0.2)), gh, gh + Vector((0.3, -1.4, -0.1)), gh, 40, 48)
cam(ev[3]['start'], fz['end'], (0, -3.6, 0.5), (0, -1.6, 0.6), (0, -9, 4), (0, 3, 3.5), 30, 26)

def camera_at(f):
    cur = CAMS[0][1]
    for f0, o in CAMS:
        if f0 <= f: cur = o
    return cur

# ------------------------------------------------------------------ Rendern
def render_frames(frames):
    out = os.path.join(B, 'frames'); os.makedirs(out, exist_ok=True)
    for f in frames:
        p = os.path.join(out, 'f%05d.png' % f)
        if os.path.exists(p): continue
        sc.frame_set(f); sc.camera = camera_at(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print('frame', f, flush=True)

if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    mode = args[0] if args else 'test'
    if mode == 'test':
        out = os.path.join(B, 'test'); os.makedirs(out, exist_ok=True)
        for v in args[1:]:
            f = F(float(v)); sc.frame_set(f); sc.camera = camera_at(f)
            sc.render.filepath = os.path.join(out, 't%06.2f.png' % float(v))
            bpy.ops.render.render(write_still=True)
    elif mode == 'render':
        part = int(args[1]) if len(args) > 1 else 0; nparts = int(args[2]) if len(args) > 2 else 1
        sc.render.threads_mode = 'FIXED'; sc.render.threads = int(args[3]) if len(args) > 3 else 2
        frames = list(range(1, sc.frame_end + 1, 2))[part::nparts]
        render_frames(frames)
    elif mode == 'bench':
        import time
        f = F(float(args[1]))
        for res, smp, fsl in [((720, 1280), 16, True), ((540, 960), 8, True), ((540, 960), 8, False), ((720, 1280), 8, True)]:
            sc.render.resolution_x, sc.render.resolution_y = res; sc.cycles.samples = smp; sc.render.use_freestyle = fsl
            sc.frame_set(f); sc.camera = camera_at(f); sc.render.filepath = os.path.join(B, 'bench_%d_%d_%d.png' % (res[0], smp, fsl))
            t0 = time.time(); bpy.ops.render.render(write_still=True); print('BENCH', res, smp, fsl, round(time.time() - t0, 1), flush=True)
    elif mode == 'bench2':
        import time
        sc.render.use_persistent_data = True
        sc.render.resolution_x, sc.render.resolution_y = 540, 960; sc.cycles.samples = int(args[2])
        sc.cycles.max_bounces = 1; sc.cycles.diffuse_bounces = 0
        sc.render.use_freestyle = args[3] == '1'
        for k in range(4):
            f = F(float(args[1])) + 2 * k
            sc.frame_set(f); sc.camera = camera_at(f); sc.render.filepath = os.path.join(B, 'bench2_%d.png' % k)
            t0 = time.time(); bpy.ops.render.render(write_still=True); print('BENCH2', k, round(time.time() - t0, 1), flush=True)
    elif mode == 'save':
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'scene.blend'))
