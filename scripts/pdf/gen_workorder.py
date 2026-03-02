"""
USA Wrap Co — Work Order / Installer Brief
One page. Installer gets this at job start.
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

WHITE   = colors.HexColor('#ffffff')
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
GREEN   = colors.HexColor('#3a8a5c')
ORANGE  = colors.HexColor('#c87020')
ORANGEBG= colors.HexColor('#fff8f0')
RULE    = colors.HexColor('#e0dcd6')
ROWALT  = colors.HexColor('#f7f5f2')
SECBG   = colors.HexColor('#f0eee9')
W, H    = letter

SHOP = {
    'name':    'USA Wrap Co',
    'phone':   '(253) 853-0900',
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

DEFAULT_PRE_CHECKS = [
    'Vinyl roll condition verified (no damage, correct color)',
    'Color match confirmed against approved proof',
    'Panel measurements verified against estimate',
    'Vehicle surface prep completed (decon wash + IPA wipe)',
    'Pre-existing damage documented with photos',
]
DEFAULT_POST_CHECKS = [
    'All panels applied - no missed sections',
    'Zero bubbles, fish eyes, or lifting edges',
    'All edges sealed and tucked - no exposed cut edges',
    'Seam placement acceptable - not on high-visibility lines',
    'Vehicle cleaned and debris removed from interior',
    'Customer walkthrough completed and signature obtained',
]

def bg(c):   c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0)
def hline(c, x, y, w, col=RULE, lw=0.5):
    c.setStrokeColor(col); c.setLineWidth(lw); c.line(x, y, x+w, y)
def card(c, x, y, w, h, fill=WHITE, stroke=RULE, r=3):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1)
def sec_header(c, x, y, w, text, right=''):
    c.setFillColor(SECBG); c.rect(x, y, w, 12, fill=1, stroke=0)
    c.setFillColor(STEELD); c.rect(x, y, 3, 12, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(x+8, y+4, text.upper())
    if right:
        c.setFillColor(MDGRAY); c.setFont('Pop', 6.5); c.drawRightString(x+w-6, y+4, right)
def checkbox(c, x, y, label, size=9):
    c.setStrokeColor(MDGRAY); c.setLineWidth(0.8)
    c.rect(x, y, size, size, fill=0, stroke=1)
    c.setFillColor(INK); c.setFont('Pop', 7.5); c.drawString(x+size+5, y+1, label)
def footer(c, wo):
    hline(c, 22, 24, W-44, col=LTGRAY)
    c.setFillColor(MDGRAY); c.setFont('Pop', 6.5)
    c.drawString(22, 16, f"Work Order {wo.get('ref','')}  -  Sales Order {wo.get('so_ref','')}  -  {SHOP['name']}  -  {SHOP['address']}")
    c.drawRightString(W-22, 16, "Installer keeps this form  -  Sign and return after completion")

def wo_header(c, wo):
    ZA = 72; ZD = 18; SEP = colors.HexColor('#162636')
    c.setFillColor(NAVY);  c.rect(0, H-ZA, W, ZA, fill=1, stroke=0)
    c.setFillColor(STEEL); c.rect(0, H-ZA, 5, ZA, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#070f1a')); c.rect(320, H-ZA, W-320, ZA, fill=1, stroke=0)

    EH = 56; EW = int(1230/470*EH)
    EY = H-ZA+(ZA-EH)/2
    if EAGLE_LIGHT:
        c.drawImage(EAGLE_LIGHT, 10, EY, width=EW, height=EH)
    NX = 10+EW+10; NY = H-ZA+ZA//2+14
    c.setFillColor(WHITE);  c.setFont('PopB', 14); c.drawString(NX, NY, "USA WRAP CO")
    nw = c.stringWidth("USA WRAP CO","PopB",14)
    c.setStrokeColor(STEEL); c.setLineWidth(1); c.line(NX, NY-5, NX+nw, NY-5)
    c.setFillColor(STEELL); c.setFont('PopM', 8); c.drawString(NX, NY-15, "Work Order / Installer Brief")
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('Pop', 7)
    c.drawString(NX, NY-25, SHOP['address']+"  -  "+SHOP['phone'])

    c.setStrokeColor(SEP); c.setLineWidth(0.8); c.line(319, H-6, 319, H-ZA+5)

    pri_col = colors.HexColor('#c04040') if wo.get('priority')=='HIGH' else STEEL
    c.setFillColor(pri_col); c.roundRect(W-14-60, H-22, 60, 12, 3, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 7)
    c.drawCentredString(W-14-30, H-16, wo.get('priority','NORMAL')+" PRIORITY")
    c.setFillColor(WHITE); c.setFont('PopB', 22)
    c.drawRightString(W-14, H-40, "WORK ORDER")
    c.setFillColor(colors.HexColor('#5a7a9a')); c.setFont('Pop', 7.5)
    c.drawRightString(W-14, H-53, wo.get('ref','')+"  -  "+wo.get('date',''))
    c.drawRightString(W-14, H-64, "Sales Order:  "+wo.get('so_ref',''))

    c.setFillColor(NAVY2); c.rect(0, H-ZA-ZD, W, ZD, fill=1, stroke=0)
    hline(c, 0, H-ZA, W, col=SEP, lw=0.8)
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('PopB', 7)
    c.drawString(12, H-ZA-7, "INSTALLER:")
    c.setFillColor(WHITE); c.setFont('PopB', 9); c.drawString(75, H-ZA-7, wo.get('installer','—'))
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('PopB', 7)
    c.drawString(160, H-ZA-7, "BAY:")
    c.setFillColor(WHITE); c.setFont('PopB', 9); c.drawString(185, H-ZA-7, wo.get('bay','—'))
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('PopB', 7)
    c.drawString(250, H-ZA-7, "EST. HRS:")
    c.setFillColor(WHITE); c.setFont('PopB', 9); c.drawString(298, H-ZA-7, str(wo.get('est_hours','—'))+" hrs")
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('PopB', 7)
    c.drawString(370, H-ZA-7, "PAY:")
    c.setFillColor(WHITE); c.setFont('PopB', 9)
    c.drawString(396, H-ZA-7, wo.get('installer_pay','—')+"  ("+wo.get('pay_type','Flat Rate')+")")
    c.setFillColor(GREEN); c.roundRect(W-14-100, H-ZA-ZD+3, 100, 12, 2, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 6.5)
    c.drawCentredString(W-14-50, H-ZA-ZD+9, wo.get('status','READY TO INSTALL'))


def gen_wo(c, wo):
    bg(c)
    wo_header(c, wo)

    HTOP = 72+18; y = H-HTOP-10; LX=22; TW=W-44

    VW = TW*0.55; CW2 = TW-VW-8

    card(c, LX, y-72, VW, 72, fill=WHITE, stroke=RULE)
    c.setFillColor(NAVY); c.rect(LX, y-72, 3, 72, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7);  c.drawString(LX+9, y-9, "VEHICLE")
    c.setFillColor(INK);    c.setFont('PopB', 11); c.drawString(LX+9, y-21, wo.get('year','')+" "+wo.get('make',''))
    c.setFillColor(STEELL); c.setFont('PopM', 9);  c.drawString(LX+9, y-32, wo.get('model',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  8.5)
    c.drawString(LX+9,  y-44, "Color: "+wo.get('color','—'))
    c.drawString(LX+9,  y-55, "VIN:  "+wo.get('vin','—'))
    c.drawString(LX+9,  y-66, "Plate: "+wo.get('plate','—')+"   -   Mileage: "+wo.get('mileage','—'))

    CX2 = LX+VW+8
    card(c, CX2, y-72, CW2, 72, fill=STEELBG, stroke=STEELD)
    c.setFillColor(STEELD); c.rect(CX2, y-72, 3, 72, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7);  c.drawString(CX2+9, y-9, "CLIENT / PICKUP INFO")
    c.setFillColor(INK);    c.setFont('PopB', 9.5);c.drawString(CX2+9, y-21, wo.get('client_name',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  8.5)
    c.drawString(CX2+9, y-32, "Contact: "+wo.get('client_contact',''))
    c.drawString(CX2+9, y-43, wo.get('client_phone',''))
    c.drawString(CX2+9, y-55, "Drop-off: "+wo.get('drop_off',''))
    c.drawString(CX2+9, y-66, "Pick-up:  "+wo.get('pick_up',''))

    y -= 80

    sec_header(c, LX, y, TW, "Wrap Scope & Material",
               str(wo.get('sqft',''))+" sqft  -  "+wo.get('linear_ft',''))
    y -= 13

    card(c, LX, y-46, TW, 46, fill=WHITE, stroke=RULE)
    c.setFillColor(STEEL); c.rect(LX, y-46, 3, 46, fill=1, stroke=0)
    c.setFillColor(INK);    c.setFont('PopB', 10); c.drawString(LX+9, y-11, wo.get('scope',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  9);  c.drawString(LX+9, y-23, "Material: "+wo.get('material',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  9)
    c.drawString(LX+9, y-35, "Coverage: "+str(wo.get('sqft',''))+" sqft  -  "+wo.get('linear_ft','')+" ordered")

    c.setFillColor(NAVY); c.roundRect(W-28-50, y-32, 50, 24, 3, fill=1, stroke=0)
    c.setFillColor(STEELL); c.setFont('PopB', 6.5); c.drawCentredString(W-28-25, y-14, "SQ FT")
    c.setFillColor(WHITE);  c.setFont('PopB', 14);  c.drawCentredString(W-28-25, y-30, str(wo.get('sqft','')))

    y -= 54

    panels = wo.get('panels', [])
    if panels:
        sec_header(c, LX, y, TW, "Panels to Wrap")
        y -= 13
        col_n = 3; col_w2 = TW/col_n
        row_count = math.ceil(len(panels)/col_n)
        PNL_H = row_count*12+14
        card(c, LX, y-PNL_H, TW, PNL_H, fill=OFF, stroke=RULE)
        c.setFillColor(STEEL); c.rect(LX, y-PNL_H, 3, PNL_H, fill=1, stroke=0)
        py2 = y-9
        for i, panel in enumerate(panels):
            col_i = i % col_n; row_i = i // col_n
            px = LX+9 + col_i*col_w2
            py3 = py2 - row_i*12
            c.setFillColor(STEEL);  c.setFont('PopB', 8.5); c.drawString(px, py3+1, "-")
            c.setFillColor(INK);    c.setFont('Pop',  8.5); c.drawString(px+10, py3, panel)
        y -= PNL_H+8

    if wo.get('special_notes'):
        card(c, LX, y-30, TW, 30, fill=ORANGEBG, stroke=colors.HexColor('#e8a060'))
        c.setFillColor(ORANGE); c.rect(LX, y-30, 3, 30, fill=1, stroke=0)
        c.setFillColor(ORANGE); c.setFont('PopB', 7.5)
        c.drawString(LX+9, y-9, "! SPECIAL INSTRUCTIONS")
        c.setFillColor(colors.HexColor('#5a3000')); c.setFont('Pop', 8)
        words = wo['special_notes'].split(); line=''; ny=y-21
        for word in words:
            t=(line+' '+word).strip()
            if c.stringWidth(t,'Pop',8)>TW-20:
                c.drawString(LX+9,ny,line); ny-=9; line=word
            else: line=t
        if line: c.drawString(LX+9,ny,line)
        y -= 38

    sec_header(c, LX, y, TW, "Installation Checklists")
    y -= 13

    pre_checks  = wo.get('pre_checks',  DEFAULT_PRE_CHECKS)
    post_checks = wo.get('post_checks', DEFAULT_POST_CHECKS)
    CHL = max(len(pre_checks), len(post_checks))
    CK_H = CHL*14+18
    HW = TW/2-4

    card(c, LX, y-CK_H, HW, CK_H, fill=WHITE, stroke=RULE)
    c.setFillColor(STEEL); c.rect(LX, y-CK_H, 3, CK_H, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(LX+9, y-9, "PRE-INSTALL  (before starting)")
    cy = y-21
    for chk in pre_checks:
        checkbox(c, LX+9, cy, chk)
        cy -= 14

    CX3 = LX+HW+8
    card(c, CX3, y-CK_H, HW, CK_H, fill=WHITE, stroke=RULE)
    c.setFillColor(NAVY); c.rect(CX3, y-CK_H, 3, CK_H, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(CX3+9, y-9, "POST-INSTALL  (before releasing)")
    cy = y-21
    for chk in post_checks:
        checkbox(c, CX3+9, cy, chk)
        cy -= 14

    y -= CK_H+10

    card(c, LX, y-34, TW, 34, fill=OFF, stroke=RULE)
    c.setFillColor(NAVY); c.rect(LX, y-34, 3, 34, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(LX+9, y-9, "INSTALLER SIGN-OFF")
    c.setFillColor(DKGRAY); c.setFont('Pop', 8)
    c.drawString(LX+9, y-22, "By signing below, installer confirms all pre/post checklists complete and vehicle released to customer.")
    c.setFillColor(DKGRAY); c.setFont('Pop', 8)
    c.drawString(LX+9, y-32, "Installer Signature: ______________________   Date: ____________   Actual Hrs: _______   Start: _______   End: _______")

    footer(c, wo)


# ─── MAIN ────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    WORKORDER = {
        'ref': 'WO-0001', 'so_ref': '', 'date': 'Today',
        'status': 'READY TO INSTALL', 'priority': 'NORMAL',
        'installer': 'Installer', 'bay': 'Bay 1', 'est_hours': '8',
        'client_name': 'Client', 'client_phone': '', 'client_contact': '',
        'drop_off': '', 'pick_up': '',
        'year': '', 'make': '', 'model': '', 'color': '', 'vin': '', 'plate': '', 'mileage': '',
        'scope': '', 'material': '', 'sqft': '0', 'linear_ft': '0',
        'panels': [], 'special_notes': '',
        'pre_checks': DEFAULT_PRE_CHECKS, 'post_checks': DEFAULT_POST_CHECKS,
        'installer_pay': '$0.00', 'pay_type': 'Flat Rate',
    }

    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            WORKORDER = json.load(f)

    out_path = sys.argv[2] if len(sys.argv) > 2 else '/tmp/workorder.pdf'

    c = rl_canvas.Canvas(out_path, pagesize=letter)
    gen_wo(c, WORKORDER)
    c.save()
    print(f"Saved: {out_path}")
