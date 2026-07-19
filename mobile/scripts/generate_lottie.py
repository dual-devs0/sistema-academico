"""
Generate a proper Lottie JSON animation with real shape layers
for the UCA mobile splash screen.
4 seconds at 30fps = 120 frames. Canvas 400x600.
"""
import json
import os

OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "splash-animation.json")


def fill(r, g, b, a=1):
    """Create a fill color shape element."""
    return {
        "ty": "fl",
        "o": {"a": 0, "k": 100},
        "c": {"a": 0, "k": [r / 255.0, g / 255.0, b / 255.0, a]},
        "r": 1,
        "bm": 0,
    }


def rect(w, h, x, y, r=0):
    """Create a rectangle shape element."""
    return {
        "ty": "rc",
        "d": 1,
        "s": {"a": 0, "k": [w, h]},
        "p": {"a": 0, "k": [x, y]},
        "r": {"a": 0, "k": r},
    }


def ellipse(w, h, x, y):
    """Create an ellipse shape element."""
    return {
        "ty": "el",
        "d": 1,
        "s": {"a": 0, "k": [w, h]},
        "p": {"a": 0, "k": [x, y]},
    }


def stroke(width=2, r=255, g=255, b=255, opacity=50):
    """Create a stroke shape element."""
    return {
        "ty": "st",
        "c": {"a": 0, "k": [r / 255.0, g / 255.0, b / 255.0, 1]},
        "o": {"a": 0, "k": opacity},
        "w": {"a": 0, "k": width},
        "lc": 1,
        "lj": 1,
        "ml": 4,
        "bm": 0,
    }


def transform(pos, anchor=(0, 0), scale=(100, 100), rot=0, op=100):
    """Create a transform shape element."""
    return {
        "ty": "tr",
        "p": {"a": 0, "k": list(pos)},
        "a": {"a": 0, "k": list(anchor)},
        "s": {"a": 0, "k": list(scale)},
        "r": {"a": 0, "k": rot},
        "o": {"a": 0, "k": op},
    }


def make_shape_layer(ind, nm, shapes, ks):
    """Create a full shape layer with the given shapes and keyframe data."""
    return {
        "ddd": 0,
        "ind": ind,
        "ty": 4,
        "nm": nm,
        "sr": 1,
        "ks": ks,
        "shapes": [
            {
                "ty": "gr",
                "it": shapes + [
                    {"ty": "tm", "s": {"a": 0, "k": 0}, "e": {"a": 0, "k": 100}}
                ],
                "nm": f"{nm} Group",
                "np": 3,
                "cix": 2,
            }
        ],
        "ao": 0,
        "w": 400,
        "h": 600,
    }


def kf_pos(keyframes):
    """Create position keyframes: list of {t, s} or {t, s, e, i, o}."""
    return {"a": 1 if len(keyframes) > 1 else 0, "k": keyframes}


def kf_scale(keyframes):
    """Create scale keyframes."""
    return {"a": 1 if len(keyframes) > 1 else 0, "k": keyframes}


def kf_opacity(keyframes):
    """Create opacity keyframes."""
    return {"a": 1 if len(keyframes) > 1 else 0, "k": keyframes}


def kf_rot(keyframes):
    """Create rotation keyframes."""
    return {"a": 1 if len(keyframes) > 1 else 0, "k": keyframes}


# ---- Build Lottie JSON ----
lj = {
    "v": "5.5.0",
    "fr": 30,
    "ip": 0,
    "op": 121,
    "w": 400,
    "h": 600,
    "layers": [],
    "assets": [],
    "chars": [],
}

layers = []
idx = 0


def add_shape(nm, shapes, ks):
    global idx
    idx += 1
    layers.append(make_shape_layer(idx, nm, shapes, ks))


# ─── L1: Background ─────────────────────────────────────────────────────
add_shape(
    "Background",
    [rect(400, 600, 200, 300), fill(19, 40, 82)],  # #132852
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {"a": 0, "k": [200, 300]},
        "s": {"a": 0, "k": [100, 100]},
        "r": {"a": 0, "k": 0},
        "o": {"a": 0, "k": 100},
    },
)

# ─── L2: Closed Book (Left Cover) ─────────────────────────────────────
add_shape(
    "Left Cover",
    [rect(32, 92, -18, -10, 3), fill(255, 255, 255)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {
            "a": 1,
            "k": [
                {"t": 0, "s": [200, 550], "e": [200, 290], "i": {"x": 0.22, "y": 1}, "o": {"x": 0.36, "y": 0}},
                {"t": 35, "s": [200, 290], "h": 0},
                {"t": 55, "s": [200, 290], "h": 0},
            ],
        },
        "s": {
            "a": 1,
            "k": [
                {"t": 0, "s": [80, 80], "h": 0},
                {"t": 10, "s": [100, 100], "h": 0},
            ],
        },
        "r": {
            "a": 1,
            "k": [
                {"t": 0, "s": [12], "h": 0},
                {"t": 10, "s": [0], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 0, "s": [0], "h": 0},
                {"t": 8, "s": [100], "h": 0},
                {"t": 50, "s": [100], "h": 0},
                {"t": 60, "s": [0], "h": 0},
            ],
        },
    },
)

# ─── L3: Right Cover ─────────────────────────────────────────────────────
add_shape(
    "Right Cover",
    [rect(32, 92, 18, -10, 3), fill(255, 255, 255)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {
            "a": 1,
            "k": [
                {"t": 0, "s": [200, 550], "e": [200, 290], "i": {"x": 0.22, "y": 1}, "o": {"x": 0.36, "y": 0}},
                {"t": 35, "s": [200, 290], "h": 0},
                {"t": 55, "s": [200, 290], "h": 0},
            ],
        },
        "s": {
            "a": 1,
            "k": [
                {"t": 0, "s": [80, 80], "h": 0},
                {"t": 10, "s": [100, 100], "h": 0},
            ],
        },
        "r": {
            "a": 1,
            "k": [
                {"t": 0, "s": [-12], "h": 0},
                {"t": 10, "s": [0], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 0, "s": [0], "h": 0},
                {"t": 8, "s": [100], "h": 0},
                {"t": 50, "s": [100], "h": 0},
                {"t": 60, "s": [0], "h": 0},
            ],
        },
    },
)

# ─── L4: Spine ────────────────────────────────────────────────────────────
add_shape(
    "Spine",
    [rect(6, 96, 0, -10, 1), fill(200, 210, 225)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {
            "a": 1,
            "k": [
                {"t": 0, "s": [200, 550], "e": [200, 290], "i": {"x": 0.22, "y": 1}, "o": {"x": 0.36, "y": 0}},
                {"t": 35, "s": [200, 290], "h": 0},
            ],
        },
        "s": {
            "a": 1,
            "k": [
                {"t": 0, "s": [80, 80], "h": 0},
                {"t": 10, "s": [100, 100], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 0, "s": [0], "h": 0},
                {"t": 8, "s": [100], "h": 0},
                {"t": 50, "s": [100], "h": 0},
                {"t": 60, "s": [0], "h": 0},
            ],
        },
    },
)

# ─── L5: Open Book Left Page ──────────────────────────────────────────────
add_shape(
    "Left Page",
    [rect(46, 90, -23, 0, 4), fill(255, 255, 255)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {"a": 0, "k": [180, 260]},
        "s": {
            "a": 1,
            "k": [
                {"t": 55, "s": [0, 60], "h": 0},
                {"t": 65, "s": [100, 100], "i": {"x": 0.34, "y": 1}, "o": {"x": 0.64, "y": 0}},
                {"t": 80, "s": [100, 100], "h": 0},
            ],
        },
        "r": {
            "a": 1,
            "k": [
                {"t": 65, "s": [-2], "h": 0},
                {"t": 80, "s": [0], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 55, "s": [0], "h": 0},
                {"t": 62, "s": [100], "h": 0},
                {"t": 110, "s": [100], "h": 0},
            ],
        },
    },
)

# ─── L6: Open Book Right Page ─────────────────────────────────────────────
add_shape(
    "Right Page",
    [rect(46, 90, 23, 0, 4), fill(255, 255, 255)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {"a": 0, "k": [220, 260]},
        "s": {
            "a": 1,
            "k": [
                {"t": 55, "s": [0, 60], "h": 0},
                {"t": 65, "s": [100, 100], "i": {"x": 0.34, "y": 1}, "o": {"x": 0.64, "y": 0}},
                {"t": 80, "s": [100, 100], "h": 0},
            ],
        },
        "r": {
            "a": 1,
            "k": [
                {"t": 65, "s": [2], "h": 0},
                {"t": 80, "s": [0], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 55, "s": [0], "h": 0},
                {"t": 62, "s": [100], "h": 0},
                {"t": 110, "s": [100], "h": 0},
            ],
        },
    },
)

# ─── L7: Open Spine (visible when book opens) ─────────────────────────────
add_shape(
    "Open Spine",
    [rect(6, 94, 0, 0, 1), fill(200, 210, 225)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {"a": 0, "k": [200, 260]},
        "s": {
            "a": 1,
            "k": [
                {"t": 55, "s": [0, 60], "h": 0},
                {"t": 65, "s": [100, 100], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 55, "s": [0], "h": 0},
                {"t": 62, "s": [100], "h": 0},
            ],
        },
    },
)

# ─── L8: Star (gold circle) ───────────────────────────────────────────────
add_shape(
    "Star",
    [ellipse(20, 20, 0, 0), fill(255, 215, 0)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {"a": 0, "k": [200, 260]},
        "s": {
            "a": 1,
            "k": [
                {"t": 72, "s": [0, 0], "h": 0},
                {"t": 80, "s": [120, 120], "i": {"x": 0.22, "y": 1.56}, "o": {"x": 0.64, "y": 0}},
                {"t": 90, "s": [100, 100], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 70, "s": [0], "h": 0},
                {"t": 78, "s": [100], "h": 0},
            ],
        },
    },
)

# ─── L9: Glow Ring ────────────────────────────────────────────────────────
add_shape(
    "Glow",
    [ellipse(80, 80, 0, 0), fill(255, 255, 255, 0.03), stroke(1.5, 255, 255, 255, 30)],
    {
        "a": {"a": 0, "k": [0, 0]},
        "p": {"a": 0, "k": [200, 260]},
        "s": {
            "a": 1,
            "k": [
                {"t": 62, "s": [30, 30], "h": 0},
                {"t": 75, "s": [220, 220], "i": {"x": 0.34, "y": 1}, "o": {"x": 0.64, "y": 0}},
                {"t": 90, "s": [160, 160], "h": 0},
            ],
        },
        "o": {
            "a": 1,
            "k": [
                {"t": 62, "s": [0], "h": 0},
                {"t": 70, "s": [80], "h": 0},
                {"t": 85, "s": [20], "h": 0},
                {"t": 100, "s": [40], "h": 0},
                {"t": 118, "s": [10], "h": 0},
            ],
        },
    },
)

# ─── L10-14: Particles ─────────────────────────────────────────────────────
particle_config = [
    (160, 210, 255, 255, 255),  # white
    (180, 200, 100, 200, 255),  # light blue
    (220, 190, 255, 215, 0),  # gold
    (240, 220, 255, 255, 255),  # white
    (170, 235, 150, 220, 255),  # light blue
]
for i, (cx, cy, *rgb) in enumerate(particle_config):
    r, g, b = rgb
    add_shape(
        f"Particle {i + 1}",
        [ellipse(4, 4, cx, cy), fill(r, g, b, 0.5)],
        {
            "a": {"a": 0, "k": [0, 0]},
            "p": {"a": 0, "k": [cx, cy]},
            "s": {
                "a": 1,
                "k": [
                    {"t": 75 + i * 5, "s": [0, 0], "h": 0},
                    {"t": 82 + i * 5, "s": [100, 100], "h": 0},
                    {"t": 100 + i * 5, "s": [200, 200], "h": 0},
                ],
            },
            "o": {
                "a": 1,
                "k": [
                    {"t": 75 + i * 5, "s": [0], "h": 0},
                    {"t": 82 + i * 5, "s": [90], "h": 0},
                    {"t": 100 + i * 5, "s": [0], "h": 0},
                ],
            },
        },
    )

# ─── Write file ────────────────────────────────────────────────────────────
lj["layers"] = layers

with open(OUTPUT_PATH, "w") as f:
    json.dump(lj, f, indent=2)

print(f"Lottie JSON generated: {OUTPUT_PATH}")
print(f"  Size: {os.path.getsize(OUTPUT_PATH):,} bytes")
print(f"  Layers: {len(layers)}")
print(f"  Duration: {lj['op'] / lj['fr']:.1f}s ({lj['op']} frames @ {lj['fr']}fps)")
