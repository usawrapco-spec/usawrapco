"""
USA Wrap Co — Sales Order (Internal)
Internal-only document. CONFIDENTIAL — never shared with customer.
"""

import sys, json, os, math

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image
import numpy as np, io

FD = "/usr/share/fonts/truetype/google-fonts"
for n, f in [('Pop','Poppins-Regular'),('PopM','Poppins-Medium'),
             ('PopB','Poppins-Bold'),('PopL','Poppins-Light')]:
    for _fd in [FD, SCRIPT_DIR]:
        try: pdfmetrics.registerFont(TTFont(n, f'{_fd}/{f}.ttf')); break
        except: pass
_hv = {'Pop': 'Helvetica', 'PopM': 'Helvetica', 'PopB': 'Helvetica-Bold', 'PopL': 'Helvetica'}
for _a, _b in _hv.items():
    try: pdfmetrics.getFont(_a)
    except KeyError:
        from reportlab.pdfbase.pdfmetrics import Font as _Font
        pdfmetrics.registerFont(_Font(_a, _b, 'WinAnsiEncoding'))

# ── PALETTE ───────────────────────────────────────────────────────────────────
WHITE   = colors.HexColor('#ffffff')
CREAM   = colors.HexColor('#fafaf8')
OFF     = colors.HexColor('#f4f2ef')
LTGRAY  = colors.HexColor('#e8e5e0')
MDGRAY  = colors.HexColor('#b8b4ae')
DKGRAY  = colors.HexColor('#5a5754')
INK     = colors.HexColor('#1a1917')
NAVY    = colors.HexColor('#0e1a2b')
NAVY2   = colors.HexColor('#162234')
STEEL   = colors.HexColor('#aa6a66')
STEELL  = colors.HexColor('#c4857f')
STEELD  = colors.HexColor('#8a4a47')
STEELBG = colors.HexColor('#fdf5f5')
GREEN   = colors.HexColor('#2e7d52')
GREENBG = colors.HexColor('#f0faf4')
AMBER   = colors.HexColor('#c07820')
AMBERBG = colors.HexColor('#fffbf0')
RED     = colors.HexColor('#c04040')
ORANGE  = colors.HexColor('#c87020')
RULE    = colors.HexColor('#e0dcd6')
ROWALT  = colors.HexColor('#f7f5f2')
SECBG   = colors.HexColor('#f0eee9')
CONFRED = colors.HexColor('#c04040')
W, H    = letter

SHOP = {
    'name':    'USA Wrap Co',
    'phone':   '(253) 853-0900',
    'email':   'shop@usawrapco.com',
    'address': '4124 124th St. NW, Gig Harbor, WA 98332',
}

def _eagle_on_bg(path, bg_rgb):
    img = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', img.size, bg_rgb+(255,))
    out = Image.alpha_composite(bg, img)
    buf = io.BytesIO(); out.convert('RGB').save(buf,'PNG')
    buf.seek(0); return ImageReader(buf)

try:
    EAGLE_LIGHT = _eagle_on_bg(os.path.join(SCRIPT_DIR, 'eagle_light.png'), (14,26,43))
except Exception:
    EAGLE_LIGHT = None

# ── HELPERS ───────────────────────────────────────────────────────────────────
def bg(c):
    c.setFillColor(WHITE); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#f4f2ef')); c.rect(0, 0, 6, H, fill=1, stroke=0)

def hline(c, x, y, w, col=RULE, lw=0.5):
    c.setStrokeColor(col); c.setLineWidth(lw); c.line(x, y, x+w, y)

def card(c, x, y, w, h, fill=WHITE, stroke=RULE, r=3):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1)

def sec_header(c, x, y, w, text, right=''):
    c.setFillColor(SECBG);  c.rect(x, y, w, 12, fill=1, stroke=0)
    c.setFillColor(STEELD); c.rect(x, y, 3, 12, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(x+8, y+4, text.upper())
    if right:
        c.setFillColor(MDGRAY); c.setFont('Pop', 6.5)
        c.drawRightString(x+w-6, y+4, right)

def pill(c, x, y, text, bg_col, fg_col, font='PopB', size=7):
    tw = c.stringWidth(text, font, size)
    pw = tw + 10; ph = 12
    c.setFillColor(bg_col); c.roundRect(x, y, pw, ph, 4, fill=1, stroke=0)
    c.setFillColor(fg_col); c.setFont(font, size)
    c.drawCentredString(x + pw/2, y+3.5, text)
    return pw

def gpm_bar(c, x, y, w, gpm, target=75.0, bonus_thresh=73.0):
    BAR_H = 7
    c.setFillColor(LTGRAY); c.roundRect(x, y, w, BAR_H, 2, fill=1, stroke=0)
    pct = min(gpm/100, 1.0)
    if gpm >= target:
        bar_col = GREEN
    elif gpm >= bonus_thresh:
        bar_col = AMBER
    else:
        bar_col = RED
    fill_w = max(w * pct, 4)
    c.setFillColor(bar_col); c.roundRect(x, y, fill_w, BAR_H, 2, fill=1, stroke=0)
    mx = x + w * (target/100)
    c.setStrokeColor(NAVY); c.setLineWidth(1.5)
    c.line(mx, y-2, mx, y+BAR_H+2)
    bx = x + w * (bonus_thresh/100)
    c.setStrokeColor(AMBER); c.setLineWidth(1)
    c.line(bx, y, bx, y+BAR_H)


# ── HEADER ────────────────────────────────────────────────────────────────────
def header(c, so):
    BAND = 62
    c.setFillColor(NAVY); c.rect(0, H-BAND, W, BAND, fill=1, stroke=0)

    EH = 40; EW = int(1143/469 * EH)
    EY = H - BAND + (BAND-EH)/2
    if EAGLE_LIGHT:
        c.drawImage(EAGLE_LIGHT, 14, EY, width=EW, height=EH)

    CONF_X = 14 + EW + 10
    c.setFillColor(CONFRED); c.roundRect(CONF_X, H-18, 80, 11, 3, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 6.5)
    c.drawCentredString(CONF_X+40, H-13, '! CONFIDENTIAL - INTERNAL USE ONLY')

    c.setFillColor(WHITE); c.setFont('PopB', 22)
    c.drawString(CONF_X, H-BAND+24, 'SALES ORDER')
    c.setFillColor(STEELL); c.setFont('PopM', 8)
    c.drawString(CONF_X, H-BAND+13, f'{so.get("division","WRAPS")}  -  Internal Financial Summary  -  Not for Customer Distribution')

    RX = W - 180
    STATUS_COLORS = {
        'APPROVED':    (GREEN, WHITE),
        'PENDING':     (AMBER, WHITE),
        'IN PROGRESS': (colors.HexColor('#1a4a8a'), WHITE),
        'COMPLETED':   (NAVY, WHITE),
    }
    sc, fc = STATUS_COLORS.get(so.get('status','APPROVED'), (STEEL, WHITE))
    pill(c, RX, H-20, so.get('status','APPROVED'), sc, fc, size=7.5)

    if so.get('priority') == 'HIGH':
        pill(c, RX+75, H-20, '^ HIGH PRIORITY', RED, WHITE, size=7)

    c.setFillColor(WHITE); c.setFont('PopB', 9.5)
    c.drawRightString(W-14, H-BAND+38, so.get('ref',''))
    c.setFillColor(MDGRAY); c.setFont('Pop', 7.5)
    c.drawRightString(W-14, H-BAND+27, f"EST Ref: {so.get('est_ref','')}")
    c.drawRightString(W-14, H-BAND+16, f"Date: {so.get('date','')}  -  Install: {so.get('install_date','')}")

    META_H = 14
    c.setFillColor(NAVY2); c.rect(0, H-BAND-META_H, W, META_H, fill=1, stroke=0)
    items = [
        ('AGENT',     f"{so.get('agent','-')} ({so.get('agent_type','inbound').title()})"),
        ('INSTALLER', so.get('installer','-')),
        ('DESIGNER',  so.get('designer','-')),
        ('REF',       so.get('ref','')),
    ]
    IX = 14
    for label, val in items:
        c.setFillColor(STEELL); c.setFont('PopB', 5.5)
        c.drawString(IX, H-BAND-META_H+5.5, label)
        c.setFillColor(WHITE); c.setFont('PopM', 7.5)
        c.drawString(IX, H-BAND-META_H+0.5, val)
        IX += max(c.stringWidth(val,'PopM',7.5)+16, 90)


# ── JOB DETAILS ───────────────────────────────────────────────────────────────
def job_details(c, so, y):
    LX=14; TW=W-28
    CW_L = TW * 0.52; CW_R = TW - CW_L - 8

    card(c, LX, y-64, CW_L, 64, fill=OFF, stroke=LTGRAY)
    c.setFillColor(STEELD); c.rect(LX, y-64, 3, 64, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 6); c.drawString(LX+8, y-10, 'VEHICLE')
    c.setFillColor(INK);    c.setFont('PopB', 10); c.drawString(LX+8, y-22, so.get('vehicle',''))
    c.setFillColor(DKGRAY); c.setFont('Pop', 7.5)
    c.drawString(LX+8, y-32, f"VIN: {so.get('vin','--')}  -  {so.get('color','--')}  -  {so.get('plates','--')}")
    c.setFillColor(DKGRAY); c.setFont('PopB', 6); c.drawString(LX+8, y-44, 'SCOPE')
    c.setFillColor(INK);    c.setFont('Pop', 8); c.drawString(LX+8, y-54, so.get('scope',''))
    c.setFillColor(DKGRAY); c.setFont('Pop', 7)
    c.drawString(LX+8, y-62, f"Material: {so.get('material','')}  -  {so.get('sqft','')} sqft")

    RX = LX + CW_L + 8
    card(c, RX, y-64, CW_R, 64, fill=WHITE, stroke=LTGRAY)
    c.setFillColor(STEELD); c.rect(RX, y-64, 3, 64, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 6); c.drawString(RX+8, y-10, 'CLIENT')
    c.setFillColor(INK);    c.setFont('PopB', 10); c.drawString(RX+8, y-22, so.get('client_name',''))
    c.setFillColor(DKGRAY); c.setFont('Pop', 7.5)
    c.drawString(RX+8, y-32, so.get('client_phone',''))
    c.drawString(RX+8, y-42, so.get('client_email',''))
    c.drawString(RX+8, y-52, so.get('client_company',''))

    return y - 64 - 8


# ── LINE ITEMS TABLE ──────────────────────────────────────────────────────────
def line_items_table(c, so, y):
    LX=14; TW=W-28
    sec_header(c, LX, y, TW, 'Line Items & COGS Breakdown', 'Revenue / Material / Labor / Design / GP / GPM')
    y -= 12

    COL = {'desc':14, 'revenue':220, 'material':290, 'labor':345, 'design':400, 'cogs':450, 'gp':490, 'gpm':530}
    ROW_H = 13
    c.setFillColor(NAVY); c.rect(LX, y-ROW_H, TW, ROW_H, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 6.5)
    for cx, hdr in [
        (COL['desc']+2, 'DESCRIPTION'), (COL['revenue'], 'REVENUE'),
        (COL['material'], 'MATERIAL'), (COL['labor'], 'LABOR'),
        (COL['design'], 'DESIGN'), (COL['cogs'], 'TOTAL COGS'),
        (COL['gp'], 'GROSS PROFIT'), (COL['gpm'], 'GPM %'),
    ]:
        c.drawString(cx, y-ROW_H+4, hdr)
    y -= ROW_H

    line_items = so.get('line_items', [])
    for i, item in enumerate(line_items):
        row_fill = ROWALT if i % 2 == 0 else WHITE
        c.setFillColor(row_fill); c.rect(LX, y-ROW_H, TW, ROW_H, fill=1, stroke=0)
        hline(c, LX, y-ROW_H, TW, col=LTGRAY)

        rev   = float(item.get('revenue', 0))
        mat   = float(item.get('material_cost', 0))
        lab   = float(item.get('labor_cost', 0))
        des   = float(item.get('design_cost', 0))
        cogs  = mat + lab + des
        gp    = rev - cogs
        gpm   = (gp / rev * 100) if rev > 0 else 0
        gpm_col = GREEN if gpm >= 75 else (AMBER if gpm >= 65 else RED)

        c.setFillColor(INK); c.setFont('PopB', 7.5)
        c.drawString(COL['desc']+2, y-ROW_H+5, item.get('name',''))
        c.setFillColor(DKGRAY); c.setFont('Pop', 6)
        c.drawString(COL['desc']+2, y-ROW_H+1, item.get('description',''))

        c.setFont('PopM', 7.5)
        for cx, val, col in [
            (COL['revenue'],  rev,  INK),
            (COL['material'], mat,  DKGRAY),
            (COL['labor'],    lab,  DKGRAY),
            (COL['design'],   des,  DKGRAY),
            (COL['cogs'],     cogs, STEELD),
            (COL['gp'],       gp,   GREEN if gp > 0 else RED),
        ]:
            c.setFillColor(col)
            c.drawString(cx, y-ROW_H+4, f'${val:,.2f}')

        c.setFillColor(gpm_col); c.setFont('PopB', 7.5)
        c.drawString(COL['gpm'], y-ROW_H+4, f'{gpm:.1f}%')
        y -= ROW_H

    # Totals row
    if line_items:
        total_rev  = sum(float(i.get('revenue',0))       for i in line_items)
        total_mat  = sum(float(i.get('material_cost',0)) for i in line_items)
        total_lab  = sum(float(i.get('labor_cost',0))    for i in line_items)
        total_des  = sum(float(i.get('design_cost',0))   for i in line_items)
        total_cogs = total_mat + total_lab + total_des
        total_gp   = total_rev - total_cogs
        total_gpm  = (total_gp / total_rev * 100) if total_rev > 0 else 0
        gpm_col    = GREEN if total_gpm >= 75 else (AMBER if total_gpm >= 65 else RED)

        hline(c, LX, y, TW, col=STEELD, lw=1)
        c.setFillColor(SECBG); c.rect(LX, y-ROW_H, TW, ROW_H, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont('PopB', 7.5)
        c.drawString(COL['desc']+2, y-ROW_H+4, 'TOTALS')
        for cx, val, col in [
            (COL['revenue'],  total_rev,  INK),
            (COL['material'], total_mat,  DKGRAY),
            (COL['labor'],    total_lab,  DKGRAY),
            (COL['design'],   total_des,  DKGRAY),
            (COL['cogs'],     total_cogs, STEELD),
            (COL['gp'],       total_gp,   GREEN if total_gp > 0 else RED),
        ]:
            c.setFillColor(col); c.setFont('PopB', 7.5)
            c.drawString(cx, y-ROW_H+4, f'${val:,.2f}')
        c.setFillColor(gpm_col); c.setFont('PopB', 8)
        c.drawString(COL['gpm'], y-ROW_H+4, f'{total_gpm:.1f}%')
        y -= ROW_H

    return y - 8


# ── FINANCIAL SUMMARY CARDS ───────────────────────────────────────────────────
def financials(c, so, y):
    LX=14; TW=W-28
    sec_header(c, LX, y, TW, 'Financial Summary', 'INTERNAL - Confidential')
    y -= 12

    CARD_H = 90
    CW = (TW - 16) / 3

    # Card 1: Revenue & COGS
    C1X = LX
    card(c, C1X, y-CARD_H, CW, CARD_H, fill=WHITE, stroke=LTGRAY)
    c.setFillColor(STEELD); c.rect(C1X, y-CARD_H, 3, CARD_H, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 6.5); c.drawString(C1X+8, y-10, 'REVENUE vs COGS')

    rows = [
        ('Sale Price',        float(so.get('sale_price',0)),        INK,   False),
        ('Material Cost',    -float(so.get('material_cost',0)),     STEELD, True),
        ('Installer Pay',    -float(so.get('installer_pay',0)),     STEELD, True),
        ('Design Fee',       -float(so.get('design_fee',0)),        STEELD, True),
        ('Production Bonus', -float(so.get('production_bonus',0)),  STEELD, True),
    ]
    ry = y - 22
    for label, val, col, is_cost in rows:
        prefix = '-' if is_cost else ''
        c.setFillColor(DKGRAY if is_cost else INK); c.setFont('Pop', 7)
        c.drawString(C1X+8, ry, label)
        c.setFillColor(col); c.setFont('PopM', 7)
        c.drawRightString(C1X+CW-8, ry, f'{prefix}${abs(val):,.2f}')
        ry -= 9

    hline(c, C1X+8, ry+6, CW-16, col=LTGRAY)
    ry -= 4
    gp = float(so.get('gross_profit', 0))
    gp_col = GREEN if gp >= 0 else RED
    c.setFillColor(INK);    c.setFont('PopB', 7.5); c.drawString(C1X+8, ry, 'Gross Profit')
    c.setFillColor(gp_col); c.setFont('PopB', 9);   c.drawRightString(C1X+CW-8, ry, f'${gp:,.2f}')

    # Card 2: GPM Visual
    C2X = LX + CW + 8
    card(c, C2X, y-CARD_H, CW, CARD_H, fill=WHITE, stroke=LTGRAY)
    c.setFillColor(STEELD); c.rect(C2X, y-CARD_H, 3, CARD_H, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 6.5); c.drawString(C2X+8, y-10, 'GROSS PROFIT MARGIN')

    gpm      = float(so.get('gpm', 0))
    gpm_tgt  = float(so.get('gpm_target', 75.0))
    gpm_bon  = float(so.get('gpm_bonus_thresh', 73.0))
    gpm_col  = GREEN if gpm >= gpm_tgt else (AMBER if gpm >= gpm_bon else RED)
    gpm_label = 'ABOVE TARGET' if gpm >= gpm_tgt else ('BONUS ELIGIBLE' if gpm >= gpm_bon else 'BELOW THRESHOLD')

    c.setFillColor(gpm_col); c.setFont('PopB', 26)
    c.drawCentredString(C2X+CW/2, y-38, f'{gpm:.1f}%')
    c.setFillColor(gpm_col); c.setFont('PopB', 7)
    c.drawCentredString(C2X+CW/2, y-50, gpm_label)

    gpm_bar(c, C2X+10, y-62, CW-20, gpm, gpm_tgt, gpm_bon)
    c.setFillColor(MDGRAY); c.setFont('Pop', 6)
    c.drawString(C2X+10, y-72, f'Target: {gpm_tgt}%')
    c.drawString(C2X+CW/2-5, y-72, f'Bonus: {gpm_bon}%')
    c.drawRightString(C2X+CW-10, y-72, f'Actual: {gpm:.1f}%')

    FY = y-CARD_H+8
    torq = so.get('torq_completed', False)
    bonus_earned = so.get('gpm_bonus_earned', False)
    c.setFillColor(DKGRAY); c.setFont('Pop', 6); c.drawString(C2X+8, FY, 'Torq Training:')
    c.setFillColor(GREEN if torq else RED); c.setFont('PopB', 6)
    c.drawString(C2X+63, FY, 'Completed' if torq else 'Incomplete')
    c.setFillColor(DKGRAY); c.setFont('Pop', 6); c.drawString(C2X+CW/2+4, FY, 'GPM Bonus:')
    c.setFillColor(GREEN if bonus_earned else RED); c.setFont('PopB', 6)
    c.drawString(C2X+CW/2+55, FY, 'Earned' if bonus_earned else 'Not Earned')

    # Card 3: Commission
    C3X = LX + 2*(CW+8)
    card(c, C3X, y-CARD_H, CW, CARD_H, fill=WHITE, stroke=LTGRAY)
    c.setFillColor(STEELD); c.rect(C3X, y-CARD_H, 3, CARD_H, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 6.5); c.drawString(C3X+8, y-10, 'COMMISSION CALCULATION')

    comm_rows = [
        ('Gross Profit',                          f'${gp:,.2f}',                                      INK),
        (f'Base Rate ({so.get("commission_type","inbound").title()})', f'{so.get("commission_base",4.5)}%', DKGRAY),
        ('Bonus Adjustments',                     f'+{so.get("commission_bonus",0)}%',                 AMBER),
        ('Effective Rate',                        f'{so.get("commission_rate",4.5)}%',                 NAVY),
    ]
    ry2 = y-22
    for label, val, col in comm_rows:
        c.setFillColor(DKGRAY); c.setFont('Pop', 7); c.drawString(C3X+8, ry2, label)
        c.setFillColor(col);    c.setFont('PopM', 7); c.drawRightString(C3X+CW-8, ry2, val)
        ry2 -= 9

    hline(c, C3X+8, ry2+6, CW-16, col=LTGRAY)
    ry2 -= 4
    comm_amt = float(so.get('commission_amount', 0))
    c.setFillColor(INK);      c.setFont('PopB', 7.5); c.drawString(C3X+8, ry2, 'Commission Due')
    c.setFillColor(GREEN if comm_amt > 0 else RED); c.setFont('PopB', 9)
    c.drawRightString(C3X+CW-8, ry2, f'${comm_amt:,.2f}')

    ry2 -= 18
    sale_price = float(so.get('sale_price', 0))
    c.setFillColor(MDGRAY); c.setFont('Pop', 5.5)
    c.drawString(C3X+8, ry2, f'Comm. calculated on GP (${gp:,.2f}), NOT on sale price (${sale_price:,.2f})')
    ry2 -= 8
    c.setFillColor(MDGRAY); c.setFont('Pop', 6)
    bonus_note = f'Torq: {"+" if torq else "-"} (+1%)  -  GPM Bonus: {"+" if bonus_earned else "-"} (+2%)'
    c.drawString(C3X+8, ry2, bonus_note)

    return y - CARD_H - 8


# ── PANELS SECTION ────────────────────────────────────────────────────────────
def install_section(c, so, y):
    LX=14; TW=W-28
    panels = so.get('panels', [])
    if not panels:
        return y
    sec_header(c, LX, y, TW, 'Panels to Wrap', f'{so.get("sqft","")} sqft total')
    y -= 12

    PANEL_ROW_H = 12; COLS = 4
    rows = math.ceil(len(panels) / COLS)
    COL_W = TW / COLS
    PANEL_BLOCK_H = rows * PANEL_ROW_H + 8

    card(c, LX, y-PANEL_BLOCK_H, TW, PANEL_BLOCK_H, fill=OFF, stroke=LTGRAY)
    for i, panel in enumerate(panels):
        col = i % COLS; row = i // COLS
        px = LX + col * COL_W + 8
        py = y - 10 - row * PANEL_ROW_H
        c.setFillColor(STEELD); c.setFont('Pop', 7); c.drawString(px, py, '>')
        c.setFillColor(INK);    c.setFont('PopM', 7.5); c.drawString(px+9, py, panel)

    return y - PANEL_BLOCK_H - 8


# ── NOTES SECTION ─────────────────────────────────────────────────────────────
def notes_section(c, so, y):
    LX=14; TW=W-28
    NOTE_H = 46
    card(c, LX, y-NOTE_H, TW, NOTE_H, fill=OFF, stroke=LTGRAY)
    c.setFillColor(STEELD); c.rect(LX, y-NOTE_H, 3, NOTE_H, fill=1, stroke=0)

    note_fields = [
        ('AGENT NOTES',    so.get('agent_notes','--'),    INK),
        ('PRODUCTION',     so.get('prod_notes','--'),     DKGRAY),
        ('INTERNAL NOTES', so.get('internal_notes','--'), RED if so.get('internal_notes') else DKGRAY),
    ]
    NCOL_W = TW / 3 - 8; NX = LX + 8
    for label, text, col in note_fields:
        c.setFillColor(STEELD); c.setFont('PopB', 6); c.drawString(NX, y-10, label)
        c.setFillColor(col);    c.setFont('Pop', 7)
        words = text.split(); line = ''; ny = y-20
        for word in words:
            t = (line+' '+word).strip()
            if c.stringWidth(t,'Pop',7) > NCOL_W - 4:
                c.drawString(NX, ny, line); ny -= 9; line = word
            else: line = t
        if line: c.drawString(NX, ny, line)
        NX += NCOL_W + 8

    return y - NOTE_H - 8


# ── SIGN-OFF ───────────────────────────────────────────────────────────────────
def signoff(c, so, y):
    LX=14; TW=W-28
    SIGN_H = 28
    card(c, LX, y-SIGN_H, TW, SIGN_H, fill=WHITE, stroke=LTGRAY)
    c.setFillColor(STEELD); c.setFont('PopB', 6); c.drawString(LX+8, y-10, 'AUTHORIZATION & SIGN-OFF')
    hline(c, LX+8, y-SIGN_H+12, TW-16)

    fields = [
        ('Sales Agent Approval', so.get('agent',''), 70),
        ('Production Manager',   '',                 70),
        ('Date Authorized',      so.get('date',''),  55),
        ('Finance Reviewed',     '',                 55),
    ]
    FX = LX+8
    for label, default, fw in fields:
        c.setFillColor(DKGRAY); c.setFont('Pop', 6.5)
        c.drawString(FX, y-SIGN_H+9, label+':')
        c.setFillColor(MDGRAY); c.setFont('Pop', 7)
        c.drawString(FX, y-SIGN_H+3, default if default else '_'*int(fw/4.5))
        FX += fw + 20

    return y - SIGN_H - 8


# ── FOOTER ─────────────────────────────────────────────────────────────────────
def footer(c, so):
    c.setFillColor(NAVY); c.rect(0, 0, W, 20, fill=1, stroke=0)
    EH2=14; EW2=int(1143/469*EH2)
    if EAGLE_LIGHT:
        c.drawImage(EAGLE_LIGHT, 14, 3, width=EW2, height=EH2)
    c.setFillColor(WHITE);  c.setFont('PopB', 8);   c.drawString(14+EW2+8, 11, SHOP['name'])
    c.setFillColor(STEELL); c.setFont('PopM', 6.5); c.drawString(14+EW2+8, 3, SHOP['phone']+'  -  '+SHOP['email'])
    c.setFillColor(CONFRED); c.setFont('PopB', 7)
    c.drawCentredString(W/2, 7, '! CONFIDENTIAL - FOR INTERNAL USE ONLY - NOT FOR CUSTOMER DISTRIBUTION')
    c.setFillColor(MDGRAY); c.setFont('Pop', 6)
    c.drawRightString(W-14, 11, f'SO: {so.get("ref","")}  -  Printed {so.get("date","")}')
    c.drawRightString(W-14, 4, 'WrapShop Pro  -  app.usawrapco.com')


# ── MAIN GENERATOR ────────────────────────────────────────────────────────────
def gen_salesorder(c, so):
    bg(c)
    BAND = 62; META = 14
    header(c, so)

    y = H - BAND - META - 8
    y = job_details(c, so, y)
    y = line_items_table(c, so, y)
    y = financials(c, so, y)
    y = install_section(c, so, y)
    y = notes_section(c, so, y)
    y = signoff(c, so, y)
    footer(c, so)


# ─── MAIN ────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    SO = {
        'ref': 'SO-0001', 'est_ref': '', 'date': 'Today', 'install_date': 'TBD',
        'status': 'APPROVED', 'priority': 'NORMAL', 'division': 'WRAPS',
        'agent': 'Agent', 'agent_type': 'inbound', 'installer': '--', 'designer': '--',
        'client_name': 'Client', 'client_phone': '', 'client_email': '', 'client_company': '',
        'vehicle': '', 'vin': '', 'color': '', 'plates': '',
        'scope': '', 'sqft': '', 'material': '', 'panels': [],
        'sale_price': 0, 'deposit_paid': 0, 'balance_due': 0,
        'material_cost': 0, 'installer_pay': 0, 'design_fee': 0,
        'production_bonus': 0, 'gross_profit': 0, 'gpm': 0,
        'gpm_target': 75, 'gpm_bonus_thresh': 73,
        'commission_type': 'inbound', 'commission_rate': 4.5,
        'commission_base': 4.5, 'commission_bonus': 0, 'commission_amount': 0,
        'torq_completed': False, 'gpm_bonus_earned': False,
        'line_items': [], 'agent_notes': '', 'prod_notes': '', 'internal_notes': '',
    }

    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            SO = json.load(f)

    out_path = sys.argv[2] if len(sys.argv) > 2 else '/tmp/salesorder.pdf'

    c = rl_canvas.Canvas(out_path, pagesize=letter)
    gen_salesorder(c, SO)
    c.save()
    print(f"Saved: {out_path}")
