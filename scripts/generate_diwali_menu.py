import os
import pypdfium2
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 1. Register crisp Windows typography
try:
    pdfmetrics.registerFont(TTFont('Georgia', 'C:\\Windows\\Fonts\\georgia.ttf'))
    pdfmetrics.registerFont(TTFont('Georgia-Bold', 'C:\\Windows\\Fonts\\georgiab.ttf'))
    pdfmetrics.registerFont(TTFont('Georgia-Italic', 'C:\\Windows\\Fonts\\georgiai.ttf'))
except Exception:
    pass

try:
    pdfmetrics.registerFont(TTFont('SegoeUI', 'C:\\Windows\\Fonts\\segoeui.ttf'))
    pdfmetrics.registerFont(TTFont('SegoeUI-Bold', 'C:\\Windows\\Fonts\\segoeuib.ttf'))
    pdfmetrics.registerFont(TTFont('SegoeUI-SemiBold', 'C:\\Windows\\Fonts\\segoeuisl.ttf'))
except Exception:
    pass

FONT_TITLE = 'Georgia-Bold' if 'Georgia-Bold' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold'
FONT_SERIF = 'Georgia' if 'Georgia' in pdfmetrics.getRegisteredFontNames() else 'Helvetica'
FONT_SERIF_IT = 'Georgia-Italic' if 'Georgia-Italic' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Oblique'
FONT_BODY = 'SegoeUI' if 'SegoeUI' in pdfmetrics.getRegisteredFontNames() else 'Helvetica'
FONT_BODY_BOLD = 'SegoeUI-Bold' if 'SegoeUI-Bold' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold'

# Color Palette: Deep Festive Burgundy & Rich Indian Gold
COLOR_BG = colors.HexColor('#18050E')
COLOR_BG_CARD = colors.HexColor('#270917')
COLOR_CARD_BORDER = colors.HexColor('#5A1934')
COLOR_GOLD = colors.HexColor('#FFD700')
COLOR_GOLD_DARK = colors.HexColor('#D4AF37')
COLOR_GOLD_LIGHT = colors.HexColor('#FFF2BD')
COLOR_TEXT_WHITE = colors.HexColor('#FFFFFF')
COLOR_TEXT_MUTED = colors.HexColor('#CBB892')
COLOR_VEG = colors.HexColor('#22C55E')
COLOR_NONVEG = colors.HexColor('#EF4444')
COLOR_CHALLENGE_BG = colors.HexColor('#6B0E18')
COLOR_CHALLENGE_BORDER = colors.HexColor('#F59E0B')

def draw_diya(c, x, y, size=1.0):
    """Draws a vector Diya with glowing flame on the canvas."""
    c.saveState()
    c.translate(x, y)
    c.scale(size, size)

    # Outer flame glow
    c.setFillColor(colors.Color(1.0, 0.7, 0.1, alpha=0.35))
    c.circle(0, 16, 14, fill=1, stroke=0)

    # Flame Outer (Orange/Red)
    p = c.beginPath()
    p.moveTo(0, 28)
    p.curveTo(7, 20, 9, 12, 0, 4)
    p.curveTo(-9, 12, -7, 20, 0, 28)
    c.setFillColor(colors.HexColor('#FF4500'))
    c.drawPath(p, fill=1, stroke=0)

    # Flame Inner (Gold/Yellow)
    p2 = c.beginPath()
    p2.moveTo(0, 24)
    p2.curveTo(4, 18, 5, 12, 0, 6)
    p2.curveTo(-5, 12, -4, 18, 0, 24)
    c.setFillColor(colors.HexColor('#FFF7B2'))
    c.drawPath(p2, fill=1, stroke=0)

    # Brass Bowl / Diya Base
    c.setFillColor(colors.HexColor('#D4AF37'))
    c.setStrokeColor(colors.HexColor('#FFD700'))
    c.setLineWidth(1)
    p_base = c.beginPath()
    p_base.moveTo(-18, 6)
    p_base.curveTo(-10, -10, 10, -10, 18, 6)
    p_base.curveTo(8, 2, -8, 2, -18, 6)
    c.drawPath(p_base, fill=1, stroke=1)

    c.restoreState()

def draw_food_marker(c, x, y, is_veg=True):
    """Draws an authentic Indian green (veg) or red (non-veg) indicator."""
    c.saveState()
    color = COLOR_VEG if is_veg else COLOR_NONVEG
    c.setStrokeColor(color)
    c.setLineWidth(1.2)
    c.setFillColor(colors.HexColor('#18050E'))
    c.rect(x, y, 9, 9, fill=1, stroke=1)
    c.setFillColor(color)
    c.circle(x + 4.5, y + 4.5, 2.5, fill=1, stroke=0)
    c.restoreState()

def generate_pdf(output_pdf_path):
    w, h = A4
    c = canvas.Canvas(output_pdf_path, pagesize=A4)

    # 1. Full Page Background
    c.setFillColor(COLOR_BG)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # 2. Ornate Festive Borders
    margin = 18
    # Outer solid gold border
    c.setStrokeColor(COLOR_GOLD_DARK)
    c.setLineWidth(2.5)
    c.roundRect(margin, margin, w - 2*margin, h - 2*margin, 16, fill=0, stroke=1)

    # Inner dashed gold border
    inner_margin = margin + 6
    c.setStrokeColor(colors.HexColor('#E5C46A'))
    c.setLineWidth(0.8)
    c.setDash([4, 3])
    c.roundRect(inner_margin, inner_margin, w - 2*inner_margin, h - 2*inner_margin, 12, fill=0, stroke=1)
    c.setDash([]) # reset dash

    # Corner diamond decorations
    for cx in [inner_margin + 6, w - inner_margin - 6]:
        for cy in [inner_margin + 6, h - inner_margin - 6]:
            c.saveState()
            c.translate(cx, cy)
            c.rotate(45)
            c.setFillColor(COLOR_GOLD)
            c.rect(-3.5, -3.5, 7, 7, fill=1, stroke=0)
            c.restoreState()

    # 3. Header Section
    header_top = h - 45

    # Shubh Deepawali Subtag
    c.setFillColor(colors.Color(0.83, 0.69, 0.22, alpha=0.18))
    c.setStrokeColor(colors.HexColor('#D4AF37'))
    c.setLineWidth(0.8)
    subtag_w = 230
    subtag_x = (w - subtag_w) / 2
    c.roundRect(subtag_x, header_top - 16, subtag_w, 20, 10, fill=1, stroke=1)

    c.setFont(FONT_BODY_BOLD, 9.5)
    c.setFillColor(COLOR_GOLD_LIGHT)
    c.drawCentredString(w / 2, header_top - 12, "✨  SHUBH  DEEPAWALI  SPECIAL  ✨")

    # Main Brand Name: THE 69 STORE
    title_y = header_top - 58
    # Drop shadow
    c.setFont(FONT_TITLE, 36)
    c.setFillColor(colors.HexColor('#4A1504'))
    c.drawCentredString(w / 2 + 1.5, title_y - 1.5, "THE 69 STORE")
    # Foreground gold text
    c.setFillColor(COLOR_GOLD)
    c.drawCentredString(w / 2, title_y, "THE 69 STORE")

    # Tagline
    tagline_y = title_y - 18
    c.setFont(FONT_SERIF_IT, 12)
    c.setFillColor(colors.HexColor('#FCE4A6'))
    c.drawCentredString(w / 2, tagline_y, "Fresh, Sizzling & Festive Street Food Flavours")

    # Diyas flanking the header
    draw_diya(c, w / 2 - 175, title_y + 4, size=0.9)
    draw_diya(c, w / 2 + 175, title_y + 4, size=0.9)

    # Header Divider Line with Center Emblem
    divider_y = tagline_y - 14
    c.setStrokeColor(colors.HexColor('#D4AF37'))
    c.setLineWidth(1)
    c.line(margin + 30, divider_y, w / 2 - 40, divider_y)
    c.line(w / 2 + 40, divider_y, w - margin - 30, divider_y)

    c.setFont(FONT_SERIF, 11)
    c.setFillColor(COLOR_GOLD)
    c.drawCentredString(w / 2, divider_y - 3, "✦  🪔  ✦")

    # 4. Menu Grid Setup (2 Columns)
    grid_top = divider_y - 14
    col_w = 262
    gap = 15
    col1_x = margin + 14
    col2_x = col1_x + col_w + gap

    def draw_category_box(c, x, y, width, height, title, badge=None):
        """Draws an individual category card container with header."""
        c.saveState()
        # Card background
        c.setFillColor(COLOR_BG_CARD)
        c.setStrokeColor(COLOR_CARD_BORDER)
        c.setLineWidth(1)
        c.roundRect(x, y, width, height, 10, fill=1, stroke=1)

        # Top decorative highlight line
        c.setStrokeColor(COLOR_GOLD_DARK)
        c.setLineWidth(1.5)
        c.line(x + 12, y + height, x + width - 12, y + height)

        # Category Title
        c.setFont(FONT_TITLE, 12)
        c.setFillColor(COLOR_GOLD_LIGHT)
        c.drawString(x + 12, y + height - 20, title)

        # Badge
        if badge:
            badge_w = c.stringWidth(badge, FONT_BODY_BOLD, 7.5) + 12
            bx = x + width - 12 - badge_w
            by = y + height - 23
            c.setFillColor(colors.HexColor('#421325'))
            c.setStrokeColor(COLOR_GOLD_DARK)
            c.setLineWidth(0.6)
            c.roundRect(bx, by, badge_w, 14, 7, fill=1, stroke=1)
            c.setFont(FONT_BODY_BOLD, 7.5)
            c.setFillColor(COLOR_GOLD)
            c.drawString(bx + 6, by + 3.5, badge)

        # Bottom header line
        c.setStrokeColor(colors.Color(0.83, 0.69, 0.22, alpha=0.3))
        c.setLineWidth(0.7)
        c.line(x + 12, y + height - 28, x + width - 12, y + height - 28)

        c.restoreState()

    def draw_item_row(c, x, y, name, desc, price_str, is_veg=True, max_width=238):
        """Draws a single food item with marker, name, description, and price."""
        c.saveState()
        # Marker
        draw_food_marker(c, x + 2, y + 2, is_veg=is_veg)

        # Name
        c.setFont(FONT_BODY_BOLD, 9.5)
        c.setFillColor(COLOR_TEXT_WHITE)
        c.drawString(x + 16, y + 2, name)

        # Price
        c.setFont(FONT_BODY_BOLD, 10.5)
        c.setFillColor(COLOR_GOLD)
        p_width = c.stringWidth(price_str, FONT_BODY_BOLD, 10.5)
        c.drawRightString(x + max_width, y + 2, price_str)

        # Dotted leader between name and price
        name_width = c.stringWidth(name, FONT_BODY_BOLD, 9.5)
        dots_start = x + 18 + name_width
        dots_end = x + max_width - p_width - 6
        if dots_end > dots_start:
            c.setStrokeColor(colors.Color(0.83, 0.69, 0.22, alpha=0.25))
            c.setLineWidth(0.8)
            c.setDash([1.5, 3])
            c.line(dots_start, y + 4, dots_end, y + 4)
            c.setDash([])

        # Description
        if desc:
            c.setFont(FONT_BODY, 7.5)
            c.setFillColor(COLOR_TEXT_MUTED)
            c.drawString(x + 16, y - 8, desc)

        c.restoreState()

    def draw_sandwich_row(c, x, y, name, desc, price_plain, price_cheese, is_veg=True, max_width=238):
        """Draws a sandwich item with dual pricing pills."""
        c.saveState()
        draw_food_marker(c, x + 2, y + 6, is_veg=is_veg)

        # Name
        c.setFont(FONT_BODY_BOLD, 9.5)
        c.setFillColor(COLOR_TEXT_WHITE)
        c.drawString(x + 16, y + 6, name)

        # Pills on right
        pill_txt = f"Plain {price_plain}  |  Cheese {price_cheese}"
        c.setFont(FONT_BODY_BOLD, 8.5)
        pill_w = c.stringWidth(pill_txt, FONT_BODY_BOLD, 8.5) + 10
        px = x + max_width - pill_w
        py = y + 2

        c.setFillColor(colors.Color(0.83, 0.69, 0.22, alpha=0.15))
        c.setStrokeColor(COLOR_GOLD_DARK)
        c.setLineWidth(0.6)
        c.roundRect(px, py, pill_w, 15, 4, fill=1, stroke=1)

        c.setFillColor(COLOR_GOLD)
        c.drawString(px + 5, py + 3.5, pill_txt)

        # Description
        if desc:
            c.setFont(FONT_BODY, 7.5)
            c.setFillColor(COLOR_TEXT_MUTED)
            c.drawString(x + 16, y - 5, desc)

        c.restoreState()

    # --- COLUMN 1 ---
    # 1. Rolls Card
    rolls_h = 135
    rolls_y = grid_top - rolls_h
    draw_category_box(c, col1_x, rolls_y, col_w, rolls_h, "🌯 Sizzling Rolls", "Stall Special")
    draw_item_row(c, col1_x + 10, rolls_y + 82, "Kolkata Egg Roll", "Crispy paratha wrap, spiced eggs & fresh onions", "₹49", is_veg=False)
    draw_item_row(c, col1_x + 10, rolls_y + 48, "Double Egg Roll", "Double the egg, zesty green chillies & lime", "₹59", is_veg=False)
    draw_item_row(c, col1_x + 10, rolls_y + 14, "Egg Chicken Roll", "Tender spiced chicken pieces + fluffy egg layer", "₹69", is_veg=False)

    # 2. Cutlets Card
    cutlets_h = 135
    cutlets_y = rolls_y - cutlets_h - 12
    draw_category_box(c, col1_x, cutlets_y, col_w, cutlets_h, "🥘 Crispy Cutlets", "3 Pcs Portion")
    draw_item_row(c, col1_x + 10, cutlets_y + 82, "Crispy Veg Cutlets", "Beetroot, potato, peas & secret house spices (3 pcs)", "₹49", is_veg=True)
    draw_item_row(c, col1_x + 10, cutlets_y + 48, "Golden Paneer Cutlets", "Crumb-coated spiced cottage cheese patties (3 pcs)", "₹59", is_veg=True)
    draw_item_row(c, col1_x + 10, cutlets_y + 14, "Desi Chicken Cutlets", "Minced chicken, fresh coriander & golden crust (3 pcs)", "₹69", is_veg=False)

    # 3. Samosas Card
    samosa_h = 135
    samosa_y = cutlets_y - samosa_h - 12
    draw_category_box(c, col1_x, samosa_y, col_w, samosa_h, "🔺 Samosa Junction", "Crisp & Hot")
    draw_item_row(c, col1_x + 10, samosa_y + 82, "Crispy Plain Samosa", "Classic spiced aloo masala with tangy mint chutney (1 pc)", "₹25", is_veg=True)
    draw_item_row(c, col1_x + 10, samosa_y + 48, "Pair Plate Samosa", "Two hot crisp samosas served with spicy dips (2 pcs)", "₹48", is_veg=True)
    draw_item_row(c, col1_x + 10, samosa_y + 14, "Dahi Samosa Chaat", "Crushed samosas, chilled curd, tamarind & sev (2 pcs)", "₹50", is_veg=True)

    # --- COLUMN 2 ---
    # 4. Grill Sandwiches Card
    sand_h = 162
    sand_y = grid_top - sand_h
    draw_category_box(c, col2_x, sand_y, col_w, sand_h, "🥪 Grill Sandwiches", "Butter Toasted")
    draw_sandwich_row(c, col2_x + 10, sand_y + 104, "Garden Veg Sandwich", "Cucumber, tomato, capsicum & spicy green spread", "₹39", "₹49", is_veg=True)
    draw_sandwich_row(c, col2_x + 10, sand_y + 60, "Paneer Tikka Sandwich", "Grilled marinated paneer slices, herbs & spices", "₹59", "₹69", is_veg=True)
    draw_sandwich_row(c, col2_x + 10, sand_y + 16, "Smoky Chicken Sandwich", "Juicy shredded chicken tossed in creamy masala", "₹59", "₹69", is_veg=False)

    # 5. Kebabs Card
    kebab_h = 75
    kebab_y = sand_y - kebab_h - 12
    draw_category_box(c, col2_x, kebab_y, col_w, kebab_h, "🍢 Tandoori Kebabs", "Charcoal Flame")
    draw_item_row(c, col2_x + 10, kebab_y + 20, "Chicken Tikka Kebabs", "Tender skewered boneless chicken with onion & lemon (3 pcs)", "₹69", is_veg=False)

    # 6. Sips & Shakes Card
    sips_h = 145
    sips_y = kebab_y - sips_h - 12
    draw_category_box(c, col2_x, sips_y, col_w, sips_h, "🥛 Sips & Shakes", "Chilled")
    draw_item_row(c, col2_x + 10, sips_y + 92, "Classic Cold Coffee", "Thick frothy brew • Includes Scoop of Ice Cream", "₹49", is_veg=True)
    draw_item_row(c, col2_x + 10, sips_y + 54, "Chatpate Masala Lassi", "Traditional churned yogurt with roasted cumin & rock salt", "₹39", is_veg=True)
    draw_item_row(c, col2_x + 10, sips_y + 16, "Royal Rose Lassi", "Creamy sweet curd infused with fragrant rose nectar", "₹39", is_veg=True)

    # 5. The 69 Spicy Challenge & Reward Banner (Bottom)
    challenge_y = samosa_y - 78
    ch_w = w - 2 * margin - 28
    ch_x = margin + 14
    ch_h = 68

    c.saveState()
    # Gradient/crimson background
    c.setFillColor(COLOR_CHALLENGE_BG)
    c.setStrokeColor(COLOR_GOLD)
    c.setLineWidth(1.8)
    c.roundRect(ch_x, challenge_y, ch_w, ch_h, 12, fill=1, stroke=1)

    # Badge Box Left
    bx_w = 75
    c.setFillColor(COLOR_GOLD)
    c.roundRect(ch_x + 8, challenge_y + 8, bx_w, ch_h - 16, 8, fill=1, stroke=0)
    c.setFont(FONT_BODY_BOLD, 8)
    c.setFillColor(colors.HexColor('#6B0E18'))
    c.drawCentredString(ch_x + 8 + bx_w/2, challenge_y + 36, "🌶️  FIRE  🌶️")
    c.setFont(FONT_TITLE, 9)
    c.drawCentredString(ch_x + 8 + bx_w/2, challenge_y + 24, "DIWALI")
    c.setFont(FONT_BODY_BOLD, 7)
    c.drawCentredString(ch_x + 8 + bx_w/2, challenge_y + 14, "CHALLENGE")

    # Challenge Content
    tx = ch_x + bx_w + 18
    c.setFont(FONT_TITLE, 11)
    c.setFillColor(COLOR_GOLD_LIGHT)
    c.drawString(tx, challenge_y + 48, "THE 69 SPICY DIWALI CHALLENGE! 🔥")

    c.setFont(FONT_BODY, 8.5)
    c.setFillColor(colors.HexColor('#FFE5B4'))
    c.drawString(tx, challenge_y + 32, "Eat our Extra Spicy Roll (same price) WITHOUT drinking water during the eat!")

    # Reward Pill
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.18))
    c.setStrokeColor(COLOR_GOLD)
    c.setLineWidth(0.8)
    c.roundRect(tx, challenge_y + 10, 310, 16, 8, fill=1, stroke=1)

    c.setFont(FONT_BODY_BOLD, 8.5)
    c.setFillColor(COLOR_TEXT_WHITE)
    c.drawString(tx + 8, challenge_y + 14, "🎁 REWARD:")
    c.setFillColor(COLOR_GOLD)
    c.drawString(tx + 75, challenge_y + 14, "Survive the spice & win a FREE Chocolate Bar! 🍫✨")

    c.restoreState()

    # 6. Stall Footer
    footer_y = challenge_y - 18
    c.setStrokeColor(colors.Color(0.83, 0.69, 0.22, alpha=0.35))
    c.setLineWidth(0.8)
    c.line(margin + 20, footer_y + 8, w - margin - 20, footer_y + 8)

    c.setFont(FONT_BODY_BOLD, 8.5)
    c.setFillColor(COLOR_GOLD)
    c.drawString(margin + 20, footer_y - 4, "👨‍🍳 Stall Hosts: Pramit • Sohana • Sumedh")

    c.setFont(FONT_SERIF_IT, 9.5)
    c.setFillColor(COLOR_GOLD_LIGHT)
    c.drawRightString(w - margin - 20, footer_y - 4, "🪔 Wishing You a Joyous & Prosperous Diwali! 🪔")

    c.save()
    print("PDF successfully written to:", output_pdf_path)

def convert_pdf_to_png(pdf_path, png_path):
    """Renders PDF to high-res 300 DPI PNG using pypdfium2."""
    pdf = pypdfium2.PdfDocument(pdf_path)
    page = pdf[0]
    # scale=3 yields ~300 DPI for ultra crisp print rendering
    bitmap = page.render(scale=3)
    pil_image = bitmap.to_pil()
    pil_image.save(png_path)
    print("PNG successfully rendered to:", png_path, "Size:", pil_image.size)

if __name__ == '__main__':
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(workspace_root, 'public')
    os.makedirs(public_dir, exist_ok=True)

    pdf_out = os.path.join(workspace_root, 'The_69_Store_Diwali_Menu.pdf')
    png_out = os.path.join(workspace_root, 'The_69_Store_Diwali_Menu.png')

    generate_pdf(pdf_out)
    convert_pdf_to_png(pdf_out, png_out)

    # Also copy to public directory so it is viewable directly on the web app!
    import shutil
    shutil.copy(pdf_out, os.path.join(public_dir, 'The_69_Store_Diwali_Menu.pdf'))
    shutil.copy(png_out, os.path.join(public_dir, 'The_69_Store_Diwali_Menu.png'))
    print("Copied files to public/ directory for direct web access!")
