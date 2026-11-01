#!/usr/bin/env python3
"""
Generate The 69 Store menu card in Kasturi restaurant style (v2).
Warm parchment, ornate gold borders, clean price list.
No food descriptions, no order button.
"""
import os, sys, math
from pathlib import Path

os.system(f'"{sys.executable}" -m pip install Pillow numpy -q')

from PIL import Image, ImageDraw, ImageFont
import numpy as np

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  CONFIG                                                           ║
# ╚═══════════════════════════════════════════════════════════════════╝
W, H  = 1080, 1680   # Taller to fit spicy challenge banner
DPI   = 300

# Colours
BG_C  = np.array([255, 249, 237], dtype=np.float64)
BG_E  = np.array([228, 208, 172], dtype=np.float64)
GOLD      = (186, 148, 63)
GOLD_DK   = (148, 115, 40)
GOLD_LT   = (220, 190, 100)
GOLD_FILL = (200, 165, 70)
MAROON    = (145, 18, 28)
DARK      = (38, 22, 10)
MID       = (90, 58, 32)
LINE_CLR  = (188, 162, 118)
BANNER_BG = (142, 20, 26)
BANNER_TX = (255, 228, 150)

# Fonts
FD = "C:/Windows/Fonts/"
def F(names, sz):
    if isinstance(names, str): names = [names]
    for n in names:
        try: return ImageFont.truetype(FD + n, sz)
        except: pass
    return ImageFont.load_default()

ft_store    = F(["impact.ttf", "arialbd.ttf"], 78)
ft_tagline  = F(["georgiai.ttf", "timesi.ttf"], 24)
ft_heading  = F(["georgiab.ttf", "timesbd.ttf"], 40)
ft_cat      = F(["georgiab.ttf", "timesbd.ttf"], 22)
ft_item     = F(["georgia.ttf", "times.ttf"], 28)
ft_price    = F(["georgiab.ttf", "timesbd.ttf"], 32)
ft_banner   = F(["georgiai.ttf", "timesi.ttf"], 28)
ft_footer   = F(["georgiai.ttf", "timesi.ttf"], 24)
ft_tiny     = F(["segoeui.ttf", "arial.ttf"], 18)

# Layout
LX  = 95
RX  = W - 95
CX  = W // 2

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  CANVAS                                                           ║
# ╚═══════════════════════════════════════════════════════════════════╝
ys = np.linspace(-1, 1, H).reshape(-1, 1, 1)
xs = np.linspace(-1, 1, W).reshape(1, -1, 1)
vig = np.clip(1.0 - 0.16 * xs**2 - 0.12 * ys**2, 0, 1)
bg = (BG_C * vig + BG_E * (1 - vig)).astype(np.uint8)
img = Image.fromarray(bg)
draw = ImageDraw.Draw(img)

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  HELPERS                                                          ║
# ╚═══════════════════════════════════════════════════════════════════╝
def tw(text, fnt):
    bb = draw.textbbox((0, 0), text, font=fnt)
    return bb[2] - bb[0]

def th(text, fnt):
    bb = draw.textbbox((0, 0), text, font=fnt)
    return bb[3] - bb[1]

def centered(y, text, fnt, fill):
    w = tw(text, fnt)
    draw.text(((W - w) // 2, y), text, fill=fill, font=fnt)
    return th(text, fnt)

def diamond(cx, cy, r, fill=GOLD_FILL, outline=GOLD):
    draw.polygon([(cx, cy-r), (cx+r, cy), (cx, cy+r), (cx-r, cy)],
                 fill=fill, outline=outline)

def gold_sep(y, style="diamond"):
    draw.line([LX, y, RX, y], fill=GOLD, width=2)
    if style == "diamond":
        diamond(CX, y, 7)
    elif style == "dots":
        for dx in [-18, 0, 18]:
            draw.ellipse([CX+dx-3, y-3, CX+dx+3, y+3], fill=GOLD_FILL)

def item_underline(y):
    draw.line([LX, y, RX, y], fill=LINE_CLR, width=1)

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  BORDERS & CORNERS                                                ║
# ╚═══════════════════════════════════════════════════════════════════╝

# Triple border
draw.rectangle([28, 28, W-28, H-28], outline=GOLD, width=4)
draw.rectangle([38, 38, W-38, H-38], outline=GOLD_DK, width=1)
draw.rectangle([46, 46, W-46, H-46], outline=GOLD, width=3)

def corner(cx, cy, sx, sy):
    """Ornamental corner piece with arcs, lines, leaf dots."""
    # L-strokes
    for off in [0, 5]:
        draw.line([cx+sx*18, cy+sy*off, cx+sx*80, cy+sy*off], fill=GOLD, width=2)
        draw.line([cx+sx*off, cy+sy*18, cx+sx*off, cy+sy*80], fill=GOLD, width=2)
    # Corner arc
    r = 38
    bb = [cx-r, cy-r, cx+r, cy+r]
    starts = {(1,1): 0, (-1,1): 90, (-1,-1): 180, (1,-1): 270}
    draw.arc(bb, starts[(sx,sy)], starts[(sx,sy)]+90, fill=GOLD_LT, width=2)
    # Center diamond
    diamond(cx+sx*14, cy+sy*14, 9, fill=GOLD_LT, outline=GOLD)
    # Diagonal dots
    for i in range(5):
        t = 0.22 + i * 0.15
        dx = cx + sx * (22 + t * 58)
        dy = cy + sy * (22 + t * 58)
        rr = 3.5 - i * 0.4
        draw.ellipse([dx-rr, dy-rr, dx+rr, dy+rr], fill=GOLD_FILL)
    # Arm dots
    for i in range(4):
        px = cx + sx * (32 + i * 14)
        draw.ellipse([px-2, cy+sy*12-2, px+2, cy+sy*12+2], fill=GOLD)
        py = cy + sy * (32 + i * 14)
        draw.ellipse([cx+sx*12-2, py-2, cx+sx*12+2, py+2], fill=GOLD)

c = 48
corner(c, c, 1, 1)
corner(W-c, c, -1, 1)
corner(c, H-c, 1, -1)
corner(W-c, H-c, -1, -1)

# Side florals
def side_floral(yc):
    for xb in [53, W-53]:
        draw.ellipse([xb-4, yc-4, xb+4, yc+4], fill=GOLD_FILL)
        for a in range(0, 360, 60):
            r = math.radians(a)
            lx, ly = xb + 10*math.cos(r), yc + 10*math.sin(r)
            draw.ellipse([lx-2, ly-2, lx+2, ly+2], fill=GOLD)

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  TITLE                                                            ║
# ╚═══════════════════════════════════════════════════════════════════╝
y = 72

# Top decorative dots
for dx in [-24, -12, 0, 12, 24]:
    r = 3 if dx == 0 else 2
    draw.ellipse([CX+dx-r, y-r, CX+dx+r, y+r], fill=GOLD_FILL)
y += 22

# Store name
store_h = centered(y, "THE 69 STORE", ft_store, MAROON)
y += store_h + 14

# Tagline (properly spaced below)
tag_h = centered(y, "Food Stall", ft_tagline, MID)
y += tag_h + 22

# Heading
head_text = "DIWALI SPECIAL MENU"
head_w = tw(head_text, ft_heading)
head_h = th(head_text, ft_heading)
hx = (W - head_w) // 2
# Faint highlight behind heading
draw.rectangle([hx - 16, y - 3, hx + head_w + 16, y + head_h + 8],
               fill=(248, 240, 222))
draw.text((hx, y), head_text, fill=DARK, font=ft_heading)
y += head_h + 16

# Gold separator
gold_sep(y)
y += 20

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  MENU                                                             ║
# ╚═══════════════════════════════════════════════════════════════════╝

menu_data = [
    ("KOLKATA STYLE ROLLS", None, [
        ("Egg Roll",                   "₹49"),
        ("Double Egg Roll",            "₹59"),
        ("Egg Chicken Roll",           "₹69"),
    ]),
    ("CRISPY CUTLETS  (3 pcs)", None, [
        ("Veg Cutlets",                "₹49"),
        ("Paneer Cutlets",             "₹59"),
        ("Chicken Cutlets",            "₹69"),
    ]),
    ("SAMOSA JUNCTION", None, [
        ("Plain Samosa (1 pc)",        "₹25"),
        ("1 Plate Samosa (2 pcs)",     "₹48"),
        ("Dahi Samosa Chaat (2 pcs)",  "₹50"),
    ]),
    ("GRILL SANDWICHES", "Plain / Cheese", [
        ("Veg Sandwich",               "₹39 / ₹49"),
        ("Paneer Sandwich",            "₹59 / ₹69"),
        ("Chicken Sandwich",           "₹59 / ₹69"),
    ]),
    ("TANDOORI KEBABS", None, [
        ("Chicken Tikka Kebabs (3 pcs)","₹69"),
    ]),
    ("BEVERAGES", None, [
        ("Classic Cold Coffee",        "₹49"),
        ("Chatpate Lassi",             "₹39"),
        ("Rose Lassi",                 "₹39"),
    ]),
]

ITEM_H  = 50
CAT_GAP = 10

for si, (cat, note, items) in enumerate(menu_data):
    if si > 0:
        y += CAT_GAP

    # Category header with flanking lines
    cw = tw(cat, ft_cat)
    ch = th(cat, ft_cat)
    cx_text = (W - cw) // 2
    mid = y + ch // 2 + 2
    draw.line([LX, mid, cx_text - 12, mid], fill=GOLD, width=1)
    draw.line([cx_text + cw + 12, mid, RX, mid], fill=GOLD, width=1)
    draw.text((cx_text, y), cat, fill=GOLD_DK, font=ft_cat)
    y += ch + 3

    if note:
        ns = f"({note})"
        nw = tw(ns, ft_tiny)
        draw.text(((W - nw) // 2, y), ns, fill=MID, font=ft_tiny)
        y += 22

    y += 4

    for name, price in items:
        draw.text((LX, y), name, fill=DARK, font=ft_item)
        pw = tw(price, ft_price)
        draw.text((RX - pw, y - 1), price, fill=DARK, font=ft_price)
        item_underline(y + ITEM_H - 10)
        y += ITEM_H

# Side florals at various heights
for fy in [300, 560, 820, 1060]:
    side_floral(fy)

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  BOTTOM                                                           ║
# ╚═══════════════════════════════════════════════════════════════════╝
y += 16
gold_sep(y, "dots")
y += 24

# ── Diwali Banner ─────────────────────────────────────────────────────
ban_h = 55
draw.rectangle([LX - 8, y, RX + 8, y + ban_h], fill=BANNER_BG)
draw.rectangle([LX - 8, y, RX + 8, y + ban_h], outline=GOLD, width=2)
bt = "Happy Diwali from The 69 Store!"
bw, bh = tw(bt, ft_banner), th(bt, ft_banner)
draw.text(((W - bw) // 2, y + (ban_h - bh) // 2), bt, fill=BANNER_TX, font=ft_banner)
y += ban_h + 22

# ── Spicy Roll Challenge ─────────────────────────────────────────────
ft_chall_title = F(["georgiab.ttf", "timesbd.ttf"], 26)
ft_chall_body  = F(["georgia.ttf", "times.ttf"], 22)
ft_chall_bold  = F(["georgiab.ttf", "timesbd.ttf"], 22)
ft_tnc         = F(["georgiai.ttf", "timesi.ttf"], 16)

CHALL_BG = (60, 12, 15)
CHALL_BORDER = GOLD
FIRE_CLR = (230, 90, 30)

chall_top = y
chall_h = 158
chall_pad = 16

# Challenge box background
draw.rectangle([LX - 8, chall_top, RX + 8, chall_top + chall_h],
               fill=CHALL_BG)
draw.rectangle([LX - 8, chall_top, RX + 8, chall_top + chall_h],
               outline=CHALL_BORDER, width=2)
# Inner dashed-style border
draw.rectangle([LX, chall_top + 4, RX, chall_top + chall_h - 4],
               outline=GOLD_DK, width=1)

cy = chall_top + chall_pad

# Challenge title
chall_title = "THE 69 SPICY CHALLENGE"
ctw = tw(chall_title, ft_chall_title)
draw.text(((W - ctw) // 2, cy), chall_title, fill=FIRE_CLR, font=ft_chall_title)
cy += th(chall_title, ft_chall_title) + 10

# Challenge line 1
line1 = "Eat our Extra Spicy Roll without"
l1w = tw(line1, ft_chall_body)
draw.text(((W - l1w) // 2, cy), line1, fill=BANNER_TX, font=ft_chall_body)
cy += th(line1, ft_chall_body) + 5

# Challenge line 2
line2 = "drinking water & win a"
l2w = tw(line2, ft_chall_body)
draw.text(((W - l2w) // 2, cy), line2, fill=BANNER_TX, font=ft_chall_body)
cy += th(line2, ft_chall_body) + 5

# Reward line (bold)
reward = "FREE Chocolate Bar!"
rw = tw(reward, ft_chall_bold)
draw.text(((W - rw) // 2, cy), reward, fill=GOLD_LT, font=ft_chall_bold)
cy += th(reward, ft_chall_bold) + 8

# T&C
tnc = "*Terms & Conditions Apply"
tncw = tw(tnc, ft_tnc)
draw.text(((W - tncw) // 2, cy), tnc, fill=(180, 155, 110), font=ft_tnc)

y = chall_top + chall_h + 20

# Bottom dots
for dx in [-24, -12, 0, 12, 24]:
    r = 3 if dx == 0 else 2
    draw.ellipse([CX+dx-r, y-r, CX+dx+r, y+r], fill=GOLD_FILL)

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  SAVE                                                             ║
# ╚═══════════════════════════════════════════════════════════════════╝
out = Path(r"c:\Users\prami\OneDrive\Desktop\The 69 store")
pub = out / "public"
pub.mkdir(exist_ok=True)
art = Path(r"C:\Users\prami\.gemini\antigravity\brain\35cb5385-fdc3-447e-a7f4-3fa31b8e82ec")

for p in [out / "The_69_Store_Menu.png", pub / "The_69_Store_Menu.png",
          art / "The_69_Store_Menu.png"]:
    img.save(str(p), "PNG", dpi=(DPI, DPI))

for p in [out / "The_69_Store_Menu.pdf", pub / "The_69_Store_Menu.pdf"]:
    img.save(str(p), "PDF", resolution=DPI)

png = out / "The_69_Store_Menu.png"
pdf = out / "The_69_Store_Menu.pdf"
print(f"  PNG: {png}  ({png.stat().st_size:,} bytes)")
print(f"  PDF: {pdf}  ({pdf.stat().st_size:,} bytes)")
print("  Copies in public/ and artifact dir.")
print("Done!")
