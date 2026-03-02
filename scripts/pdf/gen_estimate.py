"""
USA Wrap Co — Estimate v8
Major improvements:
- Header split into 3 zones: Brand Identity | Trust Signals | Document Info
- Eagle gets its own prominent space, USA Wrap Co name at real size
- Section headers as clean full-width labeled bands
- Client info clearly secondary to shop brand
- Thin steel left-edge accent throughout page
"""

import sys, json, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw
import numpy as np
import io, math

FD = "/usr/share/fonts/truetype/google-fonts"
for n, f in [('Pop',  'Poppins-Regular'),
             ('PopM', 'Poppins-Medium'),
             ('PopB', 'Poppins-Bold'),
             ('PopL', 'Poppins-Light')]:
    for _fd in [FD, SCRIPT_DIR]:
        try: pdfmetrics.registerFont(TTFont(n, f'{_fd}/{f}.ttf')); break
        except: pass
_hv = {'Pop': 'Helvetica', 'PopM': 'Helvetica', 'PopB': 'Helvetica-Bold', 'PopL': 'Helvetica'}
for _a, _b in _hv.items():
    try: pdfmetrics.getFont(_a)
    except KeyError:
        from reportlab.pdfbase.pdfmetrics import Font as _Font
        pdfmetrics.registerFont(_Font(_a, _b, 'WinAnsiEncoding'))

# ── PALETTE ─────────────────────────────────────────────────────────────────
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
GREEN   = colors.HexColor('#3a8a5c')
GOLD    = colors.HexColor('#b8920a')
GOLDBG  = colors.HexColor('#fdf8ec')
LINK    = colors.HexColor('#2e5fa3')
RULE    = colors.HexColor('#e0dcd6')
ROWALT  = colors.HexColor('#f7f5f2')
SECBG   = colors.HexColor('#f0eee9')
W, H    = letter

SHOP = {
    "name":    "USA Wrap Co",
    "slogan":  "American Craftsmanship You Can Trust.",
    "tagline": "Pacific Northwest's Premier Vehicle Wrap Studio",
    "address": "4124 124th St. NW, Gig Harbor, WA 98332",
    "phone":   "(253) 853-0900",
    "email":   "shop@usawrapco.com",
    "web":     "usawrapco.com",
    "reviews": "110",
    "certs":   ["Avery Dennison Certified", "3M Preferred Installer", "Wrap Institute Certified"],
    "hours":   "Mon-Fri  9AM-6PM",
}

WA_TAX = {
    "default": {"rate": 0.081, "label": "8.1%",
                "note": "WA State 6.5% + Pierce County 1.6% - service performed at shop (Artondale, unincorporated)"},
}

def calc_tax(sub_str, zip_code="98332", b2b=False, cert=None):
    sub = float(sub_str.replace('$', '').replace(',', ''))
    if b2b:
        return {"pct": "0%", "amount": "$0.00", "label": "Tax Exempt",
                "note": f"WA Resale Cert on File{' - ' + cert if cert else ''}",
                "stat": "Washington B2B Exemption - WAC 458-20-211", "applies": False}
    info = WA_TAX["default"]
    amt  = sub * info["rate"]
    return {"pct": info["label"], "amount": f"${amt:,.2f}",
            "label": f"Sales Tax  ({info['label']})",
            "note": info["note"],
            "stat": "WA vehicle wrap installation - taxable retail service (RCW 82.04.050)",
            "applies": True}

# ── LOGO LOADERS ─────────────────────────────────────────────────────────────
def _logo_on_dark(path):
    img = Image.open(path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    br  = (arr[:,:,0]+arr[:,:,1]+arr[:,:,2])/3.0
    out = np.zeros_like(arr)
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            b=br[y,x]
            if   b<100: out[y,x]=[246,246,244,255]
            elif b<195: out[y,x]=[190,120,116,int((195-b)/95*220)]
            else:       out[y,x]=[0,0,0,0]
    buf=io.BytesIO(); Image.fromarray(out.astype(np.uint8)).save(buf,'PNG')
    buf.seek(0); return ImageReader(buf)

def _logo_on_light(path):
    img = Image.open(path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    br  = (arr[:,:,0]+arr[:,:,1]+arr[:,:,2])/3.0
    out = np.zeros_like(arr)
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            b=br[y,x]
            if   b<100: out[y,x]=[14,26,43,255]
            elif b<195: out[y,x]=[140,80,76,int((195-b)/95*200)]
            else:       out[y,x]=[0,0,0,0]
    buf=io.BytesIO(); Image.fromarray(out.astype(np.uint8)).save(buf,'PNG')
    buf.seek(0); return ImageReader(buf)

def _eagle_on_bg(path, bg_rgb, invert_to_dark=False):
    img = Image.open(path).convert('RGBA')
    if invert_to_dark:
        arr = np.array(img, dtype=np.uint8)
        m = arr[:,:,3] > 50
        arr[m,0]=14; arr[m,1]=26; arr[m,2]=43
        img = Image.fromarray(arr)
    bg = Image.new('RGBA', img.size, bg_rgb+(255,))
    out = Image.alpha_composite(bg, img)
    buf = io.BytesIO(); out.convert('RGB').save(buf,'PNG')
    buf.seek(0); return ImageReader(buf)

def make_stars(n=5, s=9, col=(184,146,10)):
    W2=n*s+4; H2=s+4
    img=Image.new('RGBA',(W2,H2),(0,0,0,0))
    d=ImageDraw.Draw(img)
    for i in range(n):
        x=2+i*s+s//2; y=H2//2; r=s//2-1; pts=[]
        for j in range(5):
            a=math.pi*j*2/5-math.pi/2
            pts.append((x+r*math.cos(a),y+r*math.sin(a)))
            a2=math.pi*(j*2+1)/5-math.pi/2
            pts.append((x+r*.4*math.cos(a2),y+r*.4*math.sin(a2)))
        d.polygon(pts,fill=col+(255,))
    buf=io.BytesIO(); img.save(buf,'PNG'); buf.seek(0); return ImageReader(buf)

# Load assets — gracefully degrade if files missing
try:
    LOGO_LIGHT = _logo_on_dark(os.path.join(SCRIPT_DIR, 'logo_horiz_clean.png'))
except Exception:
    LOGO_LIGHT = None
try:
    LOGO_DARK = _logo_on_light(os.path.join(SCRIPT_DIR, 'logo_horiz_clean.png'))
except Exception:
    LOGO_DARK = None
try:
    EAGLE_LIGHT = _eagle_on_bg(os.path.join(SCRIPT_DIR, 'eagle_light.png'), (14,26,43))
except Exception:
    EAGLE_LIGHT = None
try:
    EAGLE_DARK = _eagle_on_bg(os.path.join(SCRIPT_DIR, 'eagle_light.png'), (240,238,233), True)
except Exception:
    EAGLE_DARK = None
try:
    STARS = make_stars()
except Exception:
    STARS = None

# ── HELPERS ──────────────────────────────────────────────────────────────────
def bg(c): c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0)

def hline(c, x, y, w, col=RULE, lw=0.5):
    c.setStrokeColor(col); c.setLineWidth(lw); c.line(x,y,x+w,y)

def vline(c, x, y1, y2, col=RULE, lw=0.5):
    c.setStrokeColor(col); c.setLineWidth(lw); c.line(x,y1,x,y2)

def card(c, x, y, w, h, fill=WHITE, stroke=RULE, r=3):
    c.setFillColor(fill); c.setStrokeColor(stroke)
    c.setLineWidth(0.5); c.roundRect(x,y,w,h,r,fill=1,stroke=1)

def sec_header(c, x, y, w, text, icon_text=""):
    SH = 28
    c.setFillColor(NAVY); c.rect(x, y-SH, w, SH, fill=1, stroke=0)
    c.setFillColor(STEEL); c.rect(x, y-SH, 5, SH, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 12)
    c.drawString(x+14, y-SH/2-4, text)
    if icon_text:
        c.setFillColor(STEELL); c.setFont('PopM', 7.5)
        c.drawRightString(x+w-10, y-SH/2-2.5, icon_text)

def footer(c, pg=1, total=1):
    c.setFillColor(NAVY); c.rect(0,0,W,20,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#4a6888')); c.setFont('Pop',6)
    c.drawString(22,6.5,f"{SHOP['name']}  -  {SHOP['address']}  -  {SHOP['email']}  -  {SHOP['web']}")
    c.setFillColor(colors.HexColor('#6a8aaa'))
    c.drawRightString(W-22,6.5,f"Page {pg} of {total}")


# ── BRAND HEADER ─────────────────────────────────────────────────────────────
def brand_header(c, doc_type, ref, date, status, status_col=STEEL, pg2=False):
    ZA  = 88
    ZD  = 20
    SEP = colors.HexColor('#162636')

    c.setFillColor(NAVY);  c.rect(0, H-ZA, W, ZA, fill=1, stroke=0)
    c.setFillColor(STEEL); c.rect(0, H-ZA, 5, ZA, fill=1, stroke=0)

    if pg2:
        c.setFillColor(colors.HexColor('#070f1a')); c.rect(354, H-ZA, W-354, ZA, fill=1, stroke=0)
        AX = 105
        EH = 46; EW = int(1230/470*EH)
        if EAGLE_LIGHT:
            c.drawImage(EAGLE_LIGHT, AX-EW//2, H-ZA+(ZA-EH)/2+10, width=EW, height=EH)
        c.setFillColor(WHITE);  c.setFont('PopB', 13); c.drawCentredString(AX, H-ZA+18, "USA WRAP CO")
        c.setFillColor(STEELL); c.setFont('PopM',  7); c.drawCentredString(AX, H-ZA+8, SHOP['slogan'])
        c.setStrokeColor(SEP); c.setLineWidth(0.8)
        c.line(211, H-8, 211, H-ZA+6)
        BX = 282
        if STARS:
            c.drawImage(STARS, BX-22, H-18, width=44, height=9, mask='auto')
        c.setFillColor(GOLD); c.setFont('PopB', 28); c.drawCentredString(BX, H-48, SHOP['reviews'])
        c.setFillColor(colors.HexColor('#9abcda')); c.setFont('PopM', 7)
        c.drawCentredString(BX, H-58, "Five-Star Reviews")
        c.setFillColor(colors.HexColor('#4a6888')); c.setFont('Pop', 6)
        c.drawCentredString(BX, H-67, "Verified on Google")
        c.setStrokeColor(SEP); c.setLineWidth(0.8)
        c.line(353, H-8, 353, H-ZA+6)
        c.setFillColor(WHITE); c.setFont('PopB', 18)
        c.drawRightString(W-14, H-26, doc_type.upper())
        c.setFillColor(colors.HexColor('#6a8aaa')); c.setFont('Pop', 7.5)
        c.drawRightString(W-14, H-40, status)
        c.setFillColor(colors.HexColor('#5a7a9a')); c.setFont('Pop', 7)
        c.drawRightString(W-14, H-54, f"REF:  {ref}")
        c.drawRightString(W-14, H-65, f"Issued:  {date}")
    else:
        c.setFillColor(colors.HexColor('#070f1a')); c.rect(332, H-ZA, W-332, ZA, fill=1, stroke=0)
        EH = 70; EW = int(1230/470*EH)
        EY = H - ZA + (ZA - EH) / 2
        if EAGLE_LIGHT:
            c.drawImage(EAGLE_LIGHT, 10, EY, width=EW, height=EH)
        NX = 10 + EW + 10
        NY = H - ZA + ZA//2 + 18
        c.setFillColor(WHITE);  c.setFont('PopB', 16); c.drawString(NX, NY, "USA WRAP CO")
        nw = c.stringWidth("USA WRAP CO","PopB",16)
        c.setStrokeColor(STEEL); c.setLineWidth(1.2); c.line(NX, NY-5, NX+nw, NY-5)
        c.setFillColor(STEELL); c.setFont('PopM',  8.5); c.drawString(NX, NY-17, SHOP['slogan'])
        c.setFillColor(colors.HexColor('#6a8aaa')); c.setFont('Pop', 7.5)
        c.drawString(NX, NY-29, SHOP['address'])
        c.drawString(NX, NY-40, SHOP['phone']+"  -  "+SHOP['email'])
        c.setStrokeColor(SEP); c.setLineWidth(0.8)
        c.line(331, H-8, 331, H-ZA+6)
        c.setFillColor(WHITE); c.setFont('PopB', 30)
        c.drawRightString(W-14, H-32, doc_type.upper())
        bw2 = max(len(status)*7+22, 90)
        c.setFillColor(status_col)
        c.roundRect(W-14-bw2, H-52, bw2, 13, 3, fill=1, stroke=0)
        c.setFillColor(NAVY); c.setFont('PopB', 6.5)
        c.drawCentredString(W-14-bw2/2, H-45, status.upper())
        c.setFillColor(colors.HexColor('#7a9aba')); c.setFont('Pop', 7.5)
        c.drawRightString(W-14, H-67, f"REF  {ref}")
        c.drawRightString(W-14, H-79, f"Issued  {date}")

    c.setFillColor(NAVY2); c.rect(0, H-ZA-ZD, W, ZD, fill=1, stroke=0)
    hline(c, 0, H-ZA,    W, col=SEP, lw=0.8)
    hline(c, 0, H-ZA-ZD, W, col=colors.HexColor('#0b1a28'), lw=0.4)
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('Pop', 6.5)
    c.drawString(12, H-ZA-8,  SHOP['phone']+"  -  "+SHOP['email']+"  -  "+SHOP['web'])
    c.drawString(12, H-ZA-17, SHOP['address']+"  -  "+SHOP['hours'])


# ── PAGE 1 ────────────────────────────────────────────────────────────────────
def gen_p1(c, job):
    bg(c)
    brand_header(c, "ESTIMATE", job['ref'], job['date'], job['status'])

    HTOP = 88+20
    y = H - HTOP - 10
    LX = 22; TW = W-44

    CW = TW/2 - 4
    card(c, LX, y-70, CW, 70, fill=STEELBG, stroke=STEELD)
    c.setFillColor(STEELD); c.rect(LX, y-70, 3, 70, fill=1, stroke=0)
    c.setFillColor(DKGRAY);  c.setFont('PopB', 7);  c.drawString(LX+9, y-10, "PREPARED BY")
    c.setFillColor(NAVY);    c.setFont('PopB', 12); c.drawString(LX+9, y-25, SHOP['name'])
    c.setFillColor(DKGRAY);  c.setFont('Pop',  9);  c.drawString(LX+9, y-38, SHOP['address'])
    c.setFillColor(DKGRAY);  c.setFont('Pop',  9);  c.drawString(LX+9, y-50, SHOP['email'])
    c.setFillColor(DKGRAY);  c.setFont('Pop',  9);  c.drawString(LX+9, y-63, SHOP['phone']+"  -  "+SHOP['web'])

    CX2 = LX+CW+8
    card(c, CX2, y-70, CW, 70, fill=WHITE, stroke=RULE)
    c.setFillColor(NAVY);    c.rect(CX2, y-70, 3, 70, fill=1, stroke=0)
    c.setFillColor(DKGRAY);  c.setFont('PopB', 7);  c.drawString(CX2+9, y-10, "PREPARED FOR")
    c.setFillColor(INK);     c.setFont('PopB', 14); c.drawString(CX2+9, y-28, job['client_name'])
    c.setFillColor(DKGRAY);  c.setFont('Pop',  9.5);c.drawString(CX2+9, y-43, job['client_phone']+"  -  "+job['client_email'])
    c.setFillColor(DKGRAY);  c.setFont('Pop',  9.5);c.drawString(CX2+9, y-57, job['client_addr'])

    y -= 78

    card(c, LX, y-22, TW, 22, fill=OFF, stroke=RULE)
    c.setFillColor(NAVY); c.rect(LX, y-22, 3, 22, fill=1, stroke=0)
    meta = [("Sales Agent", job['agent']), ("Est. Install", job['install_date']),
            ("Valid", f"{job['valid_days']} days from issue"), ("REF", job['ref'])]
    cw4 = TW / len(meta)
    for i, (lbl, val) in enumerate(meta):
        mx = LX + cw4*i + 10
        c.setFillColor(MDGRAY); c.setFont('Pop',   7);  c.drawString(mx, y-8,  lbl)
        c.setFillColor(INK);    c.setFont('PopM', 9);  c.drawString(mx, y-18, val)
        if i < len(meta)-1:
            c.setStrokeColor(RULE); c.setLineWidth(0.5)
            c.line(LX+cw4*(i+1), y-4, LX+cw4*(i+1), y-20)

    y -= 30
    y -= 8
    sec_header(c, LX, y, TW, "Scope of Work - Itemized Services")
    y -= 32

    c.setFillColor(NAVY); c.rect(LX, y, TW, 14, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 7)
    c.drawString(LX+9,   y+4, "DESCRIPTION")
    c.drawString(LX+340, y+4, "QTY")
    c.drawRightString(W-28, y+4, "AMOUNT")
    y -= 14

    for idx, item in enumerate(job['line_items']):
        nb  = len(item.get('bullets', []))
        hv  = bool(item.get('vehicle'))
        RH  = 13 + (10 if hv else 0) + 11 + nb*10 + 6

        c.setFillColor(WHITE if idx%2==0 else ROWALT)
        c.rect(LX, y-RH, TW, RH, fill=1, stroke=0)
        c.setFillColor(STEEL if idx%2==0 else STEELL)
        c.rect(LX, y-RH, 3, RH, fill=1, stroke=0)

        c.setFillColor(INK);    c.setFont('PopB', 10); c.drawString(LX+9,   y-11, item['name'])
        c.setFillColor(INK);    c.setFont('PopB', 10); c.drawRightString(W-28, y-11, item['amount'])
        c.setFillColor(DKGRAY); c.setFont('Pop',  8.5);c.drawString(LX+340, y-11, item.get('qty',''))

        row_y = y-22
        if hv:
            c.setFillColor(MDGRAY); c.setFont('Pop', 8.5)
            c.drawString(LX+9, row_y, item['vehicle']); row_y -= 10
        c.setFillColor(STEELD); c.setFont('PopM', 8.5)
        c.drawString(LX+9, row_y, item.get('sub','')); row_y -= 11

        for bullet in item.get('bullets', []):
            c.setFillColor(STEEL);  c.setFont('PopB', 9);   c.drawString(LX+9, row_y+1, "-")
            c.setFillColor(DKGRAY); c.setFont('Pop',  8.5)
            mw = TW-80
            if c.stringWidth(bullet, 'Pop', 8.5) > mw:
                words = bullet.split(); line = ''; fx = LX+19
                for word in words:
                    t = (line+' '+word).strip()
                    if c.stringWidth(t, 'Pop', 8.5) > mw:
                        c.drawString(fx, row_y, line); row_y -= 9; line = word; fx = LX+19
                    else: line = t
                if line: c.drawString(fx, row_y, line)
            else:
                c.drawString(LX+19, row_y, bullet)
            row_y -= 10

        hline(c, LX, y-RH, TW, col=RULE)
        y -= RH

    hline(c, LX, y, TW, col=MDGRAY, lw=0.8)
    y -= 10

    sub_f = float(job['subtotal'].replace('$', '').replace(',', ''))
    tax   = calc_tax(job['subtotal'], job.get('client_zip','98332'),
                     job.get('b2b_exempt',False), job.get('exempt_cert'))
    tax_f = float(tax['amount'].replace('$', '').replace(',', ''))
    bal_f = sub_f + tax_f - 250.0

    BLOCK_H = 100
    TW2 = 200; TX = W-22-TW2; IW = TX-LX-8

    card(c, LX, y-BLOCK_H, IW, BLOCK_H, fill=WHITE, stroke=RULE)
    c.setFillColor(GREEN); c.rect(LX, y-BLOCK_H, 3, BLOCK_H, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(LX+9, y-10, "WHAT'S INCLUDED")
    iy = y-22
    for incl in job.get('inclusions', []):
        c.setFillColor(GREEN);  c.setFont('Pop', 9); c.drawString(LX+9,  iy+1, "+")
        c.setFillColor(DKGRAY); c.setFont('Pop', 9); c.drawString(LX+21, iy,   incl)
        iy -= 13

    card(c, TX, y-BLOCK_H, TW2, BLOCK_H, fill=WHITE, stroke=RULE)
    c.setFillColor(NAVY); c.rect(TX, y-BLOCK_H, 3, BLOCK_H, fill=1, stroke=0)
    ty = y-14

    rows = [
        ("Subtotal",           job['subtotal'],  False, False),
        (tax['label'],         tax['amount'],    False, False),
        ("Design Deposit Paid", "-$250.00",       False, False),
        ("BALANCE DUE",        f"${bal_f:,.2f}", True,  True),
    ]
    for lbl, val, accent, big in rows:
        if accent:
            hline(c, TX+4, ty+13, TW2-8, col=LTGRAY, lw=0.8)
            c.setFillColor(OFF); c.rect(TX+3, ty-6, TW2-3, 22, fill=1, stroke=0)
        c.setFillColor(INK if accent else DKGRAY)
        c.setFont('PopB' if accent else 'Pop', 9.5 if big else 9)
        c.drawString(TX+12, ty, lbl)
        c.setFillColor(INK)
        c.setFont('PopB', 11 if big else 9)
        c.drawRightString(TX+TW2-10, ty, val)
        ty -= 22 if big else 16

    c.setFillColor(MDGRAY); c.setFont('Pop', 6.5)
    c.drawString(TX+12, ty+6, "WA vehicle wrap - taxable retail service (RCW 82.04)")

    y -= BLOCK_H + 8

    FIN_H = 26
    card(c, LX, y-FIN_H, TW, FIN_H, fill=GOLDBG, stroke=colors.HexColor('#e8c84a'))
    c.setFillColor(colors.HexColor('#8a6a00')); c.rect(LX, y-FIN_H, 3, FIN_H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#7a5a00')); c.setFont('PopB', 8)
    c.drawString(LX+12, y-9, "Financing Available")
    c.setFillColor(DKGRAY); c.setFont('Pop', 8)
    c.drawString(LX+140, y-9,
        "Get pre-approved in minutes through your customer portal - 0% interest options available")
    c.setFillColor(LINK); c.setFont('PopM', 7.5)
    c.drawRightString(W-28, y-20, "Apply at portal.usawrapco.com  ->")
    c.setFillColor(DKGRAY); c.setFont('Pop', 7.5)
    c.drawString(LX+12, y-20, "No hard credit pull required  -  Terms from 6 to 60 months")

    y -= FIN_H + 6

    c.setFillColor(NAVY); c.roundRect(LX, y-18, TW, 18, 3, fill=1, stroke=0)
    c.setFillColor(STEELL); c.setFont('PopM', 8.5)
    c.drawString(LX+12, y-7, "Ready to move forward?")
    c.setFillColor(colors.HexColor('#7aaac8')); c.setFont('Pop', 8)
    c.drawString(LX+155, y-7, "A $250 design deposit secures your slot and starts your design  -  Materials & terms on Page 2")

    footer(c, 1, 2)

def gen_p2(c, job):
    bg(c)
    c.setFillColor(NAVY); c.rect(0, H-18, W, 18, fill=1, stroke=0)
    c.setFillColor(STEELL); c.rect(0, H-18, 5, 18, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('Pop', 6.5)
    c.drawString(12, H-12, SHOP['name']+"  -  "+SHOP['phone']+"  -  "+SHOP['email']+"  -  "+SHOP['web'])
    c.setFillColor(MDGRAY); c.setFont('Pop', 6.5)
    c.drawRightString(W-14, H-12, "ESTIMATE  -  "+job['ref']+"  -  Page 2 of 2")

    y = H-28; LX=22; TW=W-44

    br = job.get('client_brand', {})
    sec_header(c, LX, y, TW, "Client Profile", "portal.usawrapco.com")
    y -= 32

    BP_H = 42
    card(c, LX, y-BP_H, TW, BP_H, fill=OFF, stroke=RULE)
    c.setFillColor(STEEL); c.rect(LX, y-BP_H, 3, BP_H, fill=1, stroke=0)

    c.setFillColor(INK);    c.setFont('PopB', 13);  c.drawString(LX+10, y-18, job['client_name'])
    nw = c.stringWidth(job['client_name'], 'PopB', 13)
    c.setFillColor(STEELL); c.setFont('PopM', 8.5); c.drawString(LX+10+nw+8, y-18, "-  "+br.get('tagline',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  8.5); c.drawString(LX+10, y-32, br.get('industry','')+"  -  "+br.get('website',''))

    sx = W-28
    for hx, nm in reversed(list(zip(br.get('colors',[])[:3], br.get('color_names',[])[:3]))):
        try: c.setFillColor(colors.HexColor(hx))
        except: c.setFillColor(MDGRAY)
        c.setStrokeColor(MDGRAY); c.setLineWidth(0.3)
        c.roundRect(sx-20, y-22, 18, 13, 2, fill=1, stroke=1)
        c.setFillColor(MDGRAY); c.setFont('Pop', 5.5); c.drawCentredString(sx-11, y-34, nm[:10])
        sx -= 28
    y -= BP_H+6

    mat_data = {
        "Avery MPI 1105 EZ-RS": {
            "full_name": "Avery Dennison MPI 1105 EZ-RS Supreme Wrapping Film",
            "category":  "Professional Cast Vinyl Wrap Film",
            "url": "averydennison.com/mpi-1105",
        },
        "Avery DOL 1060": {
            "full_name": "Avery Dennison DOL 1060 High-Gloss Overlaminate",
            "category":  "Cast Protective Overlaminate",
            "url": "averydennison.com/dol-1060",
        },
    }

    primary_film = job.get('primary_film', 'Avery MPI 1105 EZ-RS')
    overlaminate = job.get('overlaminate', '')
    mat = mat_data.get(primary_film, {"full_name": primary_film, "category": "Vinyl Wrap Film", "url": ""})
    ol  = mat_data.get(overlaminate, {"full_name": overlaminate, "category": ""})

    y -= 6
    sec_header(c, LX, y, TW, "Wrap Materials", primary_film)
    y -= 32

    MAT_H = 72
    card(c, LX, y-MAT_H, TW, MAT_H, fill=WHITE, stroke=RULE)

    LW = TW * 0.38
    c.setFillColor(STEEL); c.roundRect(LX+9, y-13, 76, 10, 2, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 6); c.drawString(LX+13, y-8, "PRIMARY WRAP FILM")
    c.setFillColor(INK);   c.setFont('PopB', 9.5); c.drawString(LX+9, y-25, mat.get('full_name',''))
    c.setFillColor(DKGRAY);c.setFont('Pop',  7);   c.drawString(LX+9, y-36, mat.get('category',''))
    if ol and ol.get('full_name'):
        c.setFillColor(MDGRAY); c.setFont('Pop', 6.5)
        c.drawString(LX+9, y-47, "Overlaminate: "+ol.get('full_name','')[:40])
    if mat.get('url'):
        c.setFillColor(LINK); c.setFont('PopM', 6.5)
        c.drawString(LX+9, y-MAT_H+9, "Spec Sheet:  "+mat['url'])

    c.setStrokeColor(LTGRAY); c.setLineWidth(0.6)
    c.line(LX+LW, y-4, LX+LW, y-MAT_H+4)

    CHIPS = [
        ("OUTDOOR DURABILITY",  "7 Years Vertical",         NAVY,  WHITE),
        ("HORIZONTAL SURFACES", "5 Years Rated",            NAVY,  WHITE),
        ("FILM CONSTRUCTION",   "Cast - Conforms to Curves",SECBG, INK),
        ("CLEAN REMOVAL",       "Up to 5 Years",            SECBG, INK),
    ]
    RX = LX + LW + 10
    RW = TW - LW - 14
    chip_w = RW/2 - 4
    chip_h = 24
    for ci, (sub_lbl, val, bg_c, fg_c) in enumerate(CHIPS):
        col_i = ci % 2; row_i = ci // 2
        cx = RX + col_i*(chip_w+6)
        cy = y - 12 - row_i*(chip_h+5)
        c.setFillColor(bg_c);  c.roundRect(cx, cy-chip_h, chip_w, chip_h, 3, fill=1, stroke=0)
        if bg_c == NAVY:
            c.setFillColor(STEELL); c.setFont('PopB', 5.5); c.drawString(cx+6, cy-8, sub_lbl)
            c.setFillColor(WHITE);  c.setFont('PopB', 8);   c.drawString(cx+6, cy-19, val)
        else:
            c.setFillColor(DKGRAY); c.setFont('PopB', 5.5); c.drawString(cx+6, cy-8,  sub_lbl)
            c.setFillColor(INK);    c.setFont('PopB', 7.5); c.drawString(cx+6, cy-19, val)

    y -= MAT_H+10

    y -= 6
    sec_header(c, LX, y, TW, "Our Process - What to Expect", "Delivering Premium Results, Every Time")
    y -= 13

    steps = [
        ("01","Estimate &\nDeposit",    STEEL, NAVY, ["Quote in 24 hrs.", "$250 deposit locks", "your slot & design."]),
        ("02","Design &\nApproval",     NAVY,  WHITE,["Mockup on your exact", "vehicle. 2 revisions.", "Approve before print."]),
        ("03","Print &\nProduction",    STEEL, NAVY, ["HP Latex on Avery", "MPI 1105. Full QC", "before it leaves shop."]),
        ("04","Professional\nInstall",  NAVY,  WHITE,["Certified installer.", "Pre & post photos.", "Climate-controlled shop."]),
        ("05","Final\nDelivery",        STEEL, NAVY, ["Full walkthrough.", "12-mo warranty cert.", "Portal access provided."]),
    ]
    SH = 82; SW2 = TW/len(steps)-2
    GAP = (TW - SW2*len(steps)) / (len(steps)-1)

    for i, (num, title, cc, nc, dlines) in enumerate(steps):
        sx = LX + i*(SW2+GAP)
        card(c, sx, y-SH, SW2, SH, fill=OFF if i%2==0 else WHITE, stroke=LTGRAY)
        c.setFillColor(cc); c.circle(sx+SW2/2, y-13, 9, fill=1, stroke=0)
        c.setFillColor(nc); c.setFont('PopB', 7.5); c.drawCentredString(sx+SW2/2, y-17, num)
        tls = title.split('\n')
        c.setFillColor(cc); c.setFont('PopB', 7.5)
        for ti, tl in enumerate(tls): c.drawCentredString(sx+SW2/2, y-29-(ti*9), tl)
        dy = y-29-(len(tls)-1)*9-13
        for dl in dlines:
            c.setFillColor(DKGRAY); c.setFont('Pop', 6.5)
            c.drawCentredString(sx+SW2/2, dy, dl); dy -= 8

    y -= SH+10

    y -= 6
    sec_header(c, LX, y, TW, "Terms & Conditions")
    y -= 32

    TC_H = 168
    card(c, LX, y-TC_H, TW, TC_H, fill=WHITE, stroke=RULE)
    CW2 = TW/2 - 10

    tL = [
        ("Deposit & Payment",
         ["$250 non-refundable design deposit required to begin design and secure your install slot.",
          "Full balance is due upon completion before vehicle release.",
          "Card on file will be automatically charged 10 days after job completion if balance remains unpaid.",
          "Credit card payments may be subject to a processing fee.",
          "Late payments: 1.5%/month. Returned checks: $35 fee."]),
        ("Design Approval",
         ["Client approves all artwork before production. Changes after approval incur additional fees.",
          "USA Wrap Co not liable for errors in client-supplied artwork, logos, or text."]),
        ("Cancellation",
         ["Cancellations after production begins are billed for all materials and labor.",
          "$250 design deposit is non-refundable. Schedule changes require 48-hr advance notice."]),
    ]
    tR = [
        ("Warranty - 12 Months",
         ["Workmanship warranted 12 months from install date. Issues must be reported within 10 days.",
          "Client responsible for inspecting wrap within 30 days of installation.",
          "Repairs subject to USA Wrap Co judgment. Full panel replacement not always feasible."]),
        ("Vehicle Condition",
         ["Vehicle must be clean and in good working condition. Pre-existing damage documented at intake.",
          "Excessive contamination may delay job and incur additional surface prep charges."]),
        ("Wrap Care",
         ["Wait 48 hrs before washing. Hand wash only first 2 weeks. No automatic or pressure washes.",
          "Avoid harsh chemicals. Non-compliance voids warranty coverage."]),
    ]
    for col_x, cw, terms in [(LX+9, CW2, tL), (LX+CW2+21, CW2, tR)]:
        ty2 = y-10
        for title, pts in terms:
            c.setFillColor(INK); c.setFont('PopB', 7.5); c.drawString(col_x, ty2, title); ty2 -= 11
            for pt in pts:
                c.setFillColor(STEEL);  c.setFont('PopB', 8);   c.drawString(col_x,    ty2+1, "-")
                c.setFillColor(DKGRAY); c.setFont('Pop',  6.5)
                words = pt.split(); line = ''; fx = col_x+10
                for word in words:
                    t = (line+' '+word).strip()
                    if c.stringWidth(t,'Pop',6.5) > cw-12:
                        c.drawString(fx, ty2, line); ty2 -= 8; line = word; fx = col_x+10
                    else: line = t
                if line: c.drawString(fx, ty2, line); ty2 -= 8
            ty2 -= 5

    sig_y = y-TC_H+11
    hline(c, LX+9, sig_y+9, TW-18, col=LTGRAY)
    c.setFillColor(DKGRAY); c.setFont('Pop', 7)
    c.drawString(LX+9, sig_y,
        "Client Signature: ___________________________   "
        "Printed Name: ___________________________   Date: ___________")
    y -= TC_H+10

    c.setFillColor(NAVY); c.roundRect(LX, y-28, TW, 28, 3, fill=1, stroke=0)
    EH2 = 20; EW2 = int(1230/470*EH2)
    if EAGLE_LIGHT:
        c.drawImage(EAGLE_LIGHT, LX+10, y-24, width=EW2, height=EH2)
    c.setFillColor(WHITE);  c.setFont('PopB', 9);   c.drawString(LX+EW2+16, y-11, SHOP['name'])
    c.setFillColor(STEELL); c.setFont('PopM', 7.5); c.drawString(LX+EW2+16, y-21, SHOP['slogan'])
    c.setFillColor(GOLD);   c.setFont('PopB', 7.5)
    c.drawRightString(W-28, y-11, "***** "+SHOP['reviews']+" Five-Star Google Reviews")
    c.setFillColor(colors.HexColor('#5a7a9a')); c.setFont('Pop', 7)
    c.drawRightString(W-28, y-21, SHOP['phone']+"  -  "+SHOP['email']+"  -  "+SHOP['web'])

    footer(c, 2, 2)


# ─── MAIN ────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys, json

    # Default job data
    JOB = {
        "ref": "ESTIMATE", "date": "Today", "status": "Estimate Sent",
        "valid_days": 30, "client_name": "Client", "client_phone": "",
        "client_email": "", "client_addr": "", "client_zip": "98332",
        "agent": "Agent", "install_date": "TBD", "b2b_exempt": False,
        "exempt_cert": None, "primary_film": "Avery MPI 1105 EZ-RS",
        "overlaminate": "Avery DOL 1060", "client_brand": {},
        "line_items": [], "subtotal": "$0.00",
        "inclusions": ["12-month workmanship warranty", "Pre & post-install photos"],
    }

    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            JOB = json.load(f)

    out_path = sys.argv[2] if len(sys.argv) > 2 else '/tmp/estimate.pdf'

    c = rl_canvas.Canvas(out_path, pagesize=letter)
    gen_p1(c, JOB)
    c.showPage()
    gen_p2(c, JOB)
    c.save()
    print(f"Saved: {out_path}")
