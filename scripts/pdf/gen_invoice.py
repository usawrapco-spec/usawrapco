"""
USA Wrap Co — Invoice Template
Single page professional invoice with payment section
"""

import sys, json, os

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
GREENBG = colors.HexColor('#f0faf4')
RED     = colors.HexColor('#c04040')
REDBG   = colors.HexColor('#fff0f0')
GOLD    = colors.HexColor('#b8920a')
GOLDBG  = colors.HexColor('#fdf8ec')
LINK    = colors.HexColor('#2e5fa3')
RULE    = colors.HexColor('#e0dcd6')
ROWALT  = colors.HexColor('#f7f5f2')
SECBG   = colors.HexColor('#f0eee9')
W, H    = letter

SHOP = {
    'name':    'USA Wrap Co',
    'slogan':  'American Craftsmanship You Can Trust.',
    'phone':   '(253) 853-0900',
    'email':   'shop@usawrapco.com',
    'web':     'usawrapco.com',
    'address': '4124 124th St. NW, Gig Harbor, WA 98332',
    'hours':   'Mon-Fri  9AM-6PM',
    'portal':  'portal.usawrapco.com',
    'reviews': '110',
}

def _eagle_on_bg(path, bg_rgb, invert=False):
    img = Image.open(path).convert('RGBA')
    if invert:
        arr = np.array(img, dtype=np.uint8)
        m = arr[:,:,3] > 50
        arr[m,0]=14; arr[m,1]=26; arr[m,2]=43
        img = Image.fromarray(arr)
    bg = Image.new('RGBA', img.size, bg_rgb+(255,))
    out = Image.alpha_composite(bg, img)
    buf = io.BytesIO(); out.convert('RGB').save(buf,'PNG')
    buf.seek(0); return ImageReader(buf)

try:
    EAGLE_LIGHT = _eagle_on_bg(os.path.join(SCRIPT_DIR, 'eagle_light.png'), (14,26,43))
except Exception:
    EAGLE_LIGHT = None

# ── HELPERS ───────────────────────────────────────────────────────────────────
def bg(c):   c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0)
def hline(c, x, y, w, col=RULE, lw=0.5):
    c.setStrokeColor(col); c.setLineWidth(lw); c.line(x, y, x+w, y)
def card(c, x, y, w, h, fill=WHITE, stroke=RULE, r=3):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, r, fill=1, stroke=1)
def sec_header(c, x, y, w, text, right=''):
    c.setFillColor(SECBG); c.rect(x, y, w, 12, fill=1, stroke=0)
    c.setFillColor(STEELD); c.rect(x, y, 3, 12, fill=1, stroke=0)
    c.setFillColor(DKGRAY);  c.setFont('PopB', 7); c.drawString(x+8, y+4, text.upper())
    if right:
        c.setFillColor(MDGRAY); c.setFont('Pop', 6.5)
        c.drawRightString(x+w-6, y+4, right)
def footer(c):
    c.setFillColor(MDGRAY); c.setFont('Pop', 6.5)
    c.drawString(22, 18, f"{SHOP['name']}  -  {SHOP['address']}  -  {SHOP['web']}")
    c.drawRightString(W-22, 18, "Questions? Call (253) 853-0900 or email shop@usawrapco.com")
    hline(c, 22, 24, W-44, col=colors.HexColor('#e8e5e0'))

# ── INVOICE HEADER ────────────────────────────────────────────────────────────
def invoice_header(c, inv):
    ZA = 88; ZD = 20
    SEP = colors.HexColor('#162636')
    c.setFillColor(NAVY);  c.rect(0, H-ZA, W, ZA, fill=1, stroke=0)
    c.setFillColor(STEEL); c.rect(0, H-ZA, 5, ZA, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#070f1a')); c.rect(332, H-ZA, W-332, ZA, fill=1, stroke=0)

    EH = 70; EW = int(1230/470*EH)
    EY = H - ZA + (ZA-EH)/2
    if EAGLE_LIGHT:
        c.drawImage(EAGLE_LIGHT, 10, EY, width=EW, height=EH)
    NX = 10+EW+10
    NY = H-ZA+ZA//2+18
    c.setFillColor(WHITE);  c.setFont('PopB', 16); c.drawString(NX, NY, "USA WRAP CO")
    nw = c.stringWidth("USA WRAP CO","PopB",16)
    c.setStrokeColor(STEEL); c.setLineWidth(1.2); c.line(NX, NY-5, NX+nw, NY-5)
    c.setFillColor(STEELL); c.setFont('PopM',  8.5); c.drawString(NX, NY-17, SHOP['slogan'])
    c.setFillColor(colors.HexColor('#6a8aaa')); c.setFont('Pop', 7.5)
    c.drawString(NX, NY-29, SHOP['address'])
    c.drawString(NX, NY-40, SHOP['phone']+"  -  "+SHOP['email'])

    c.setStrokeColor(SEP); c.setLineWidth(0.8); c.line(331, H-8, 331, H-ZA+6)

    c.setFillColor(WHITE); c.setFont('PopB', 30); c.drawRightString(W-14, H-32, "INVOICE")
    sc = {'due': STEEL, 'paid': GREEN, 'overdue': RED}
    pill_col = sc.get(inv.get('status_color','due'), STEEL)
    bw2 = max(len(inv.get('status',''))*7+22, 90)
    c.setFillColor(pill_col)
    c.roundRect(W-14-bw2, H-52, bw2, 13, 3, fill=1, stroke=0)
    c.setFillColor(NAVY); c.setFont('PopB', 6.5)
    c.drawCentredString(W-14-bw2/2, H-45, inv.get('status','INVOICE').upper())
    c.setFillColor(colors.HexColor('#7a9aba')); c.setFont('Pop', 7.5)
    c.drawRightString(W-14, H-67, "INV NO.  "+inv.get('ref',''))
    c.drawRightString(W-14, H-79, "Issued  "+inv.get('date','')+"   -   Due  "+inv.get('due_date',''))

    c.setFillColor(NAVY2); c.rect(0, H-ZA-ZD, W, ZD, fill=1, stroke=0)
    hline(c, 0, H-ZA, W, col=SEP, lw=0.8)
    c.setFillColor(colors.HexColor('#5a7898')); c.setFont('Pop', 6.5)
    c.drawString(12, H-ZA-8,  SHOP['phone']+"  -  "+SHOP['email']+"  -  "+SHOP['web'])
    c.drawString(12, H-ZA-17, SHOP['address']+"  -  "+SHOP['hours'])

# ── MAIN PAGE ─────────────────────────────────────────────────────────────────
def gen_invoice(c, inv):
    bg(c)
    invoice_header(c, inv)

    HTOP = 88+20; y = H-HTOP-10; LX=22; TW=W-44

    CW = TW/2-4

    card(c, LX, y-50, CW, 50, fill=WHITE, stroke=RULE)
    c.setFillColor(NAVY); c.rect(LX, y-50, 3, 50, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7);  c.drawString(LX+9, y-9, "BILL TO")
    c.setFillColor(INK);    c.setFont('PopB', 10); c.drawString(LX+9, y-21, inv.get('client_name',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  9);  c.drawString(LX+9, y-32, inv.get('client_phone','')+"  -  "+inv.get('client_email',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  9);  c.drawString(LX+9, y-43, inv.get('client_addr',''))

    CX2 = LX+CW+8
    card(c, CX2, y-50, CW, 50, fill=STEELBG, stroke=STEELD)
    c.setFillColor(STEELD); c.rect(CX2, y-50, 3, 50, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7);  c.drawString(CX2+9, y-9, "JOB DETAILS")
    c.setFillColor(INK);    c.setFont('PopB', 9);  c.drawString(CX2+9, y-21, "Sales Order  "+inv.get('linked_ref',''))
    c.setFillColor(DKGRAY); c.setFont('Pop',  9);  c.drawString(CX2+9, y-32, "Installed "+inv.get('install_date','')+"  -  Agent: "+inv.get('agent',''))
    if inv.get('po_number'):
        c.setFillColor(DKGRAY); c.setFont('Pop', 9)
        c.drawString(CX2+9, y-43, "Client PO:  "+inv['po_number'])

    y -= 58

    sec_header(c, LX, y, TW, "Services Rendered")
    y -= 13

    c.setFillColor(NAVY); c.rect(LX, y, TW, 14, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont('PopB', 7)
    c.drawString(LX+9, y+4, "DESCRIPTION")
    c.drawString(LX+340, y+4, "QTY")
    c.drawRightString(W-28, y+4, "AMOUNT")
    y -= 14

    for idx, item in enumerate(inv.get('line_items', [])):
        RH = 26
        c.setFillColor(WHITE if idx%2==0 else ROWALT)
        c.rect(LX, y-RH, TW, RH, fill=1, stroke=0)
        c.setFillColor(STEEL if idx%2==0 else STEELL)
        c.rect(LX, y-RH, 3, RH, fill=1, stroke=0)

        c.setFillColor(INK);    c.setFont('PopB', 10); c.drawString(LX+9,   y-11, item.get('name',''))
        c.setFillColor(INK);    c.setFont('PopB', 10); c.drawRightString(W-28, y-11, item.get('amount',''))
        c.setFillColor(DKGRAY); c.setFont('Pop',  8.5); c.drawString(LX+340, y-11, item.get('qty',''))
        c.setFillColor(DKGRAY); c.setFont('Pop',  8.5); c.drawString(LX+9,   y-21, item.get('desc',''))
        hline(c, LX, y-RH, TW, col=RULE)
        y -= RH

    hline(c, LX, y, TW, col=MDGRAY, lw=0.8)
    y -= 10

    TW2 = 218; TX = W-22-TW2; IW = TX-LX-8

    PH_H = 88
    card(c, LX, y-PH_H, IW, PH_H, fill=WHITE, stroke=RULE)
    c.setFillColor(NAVY); c.rect(LX, y-PH_H, 3, PH_H, fill=1, stroke=0)
    c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(LX+9, y-9, "PAYMENT HISTORY")
    py = y-22
    for pmt in inv.get('payments', []):
        c.setFillColor(GREEN);  c.setFont('PopB', 9);   c.drawString(LX+9,  py+1, "+")
        c.setFillColor(INK);    c.setFont('PopM', 9);   c.drawString(LX+21, py,   pmt.get('note','Payment')+"  -  "+pmt.get('amount',''))
        c.setFillColor(MDGRAY); c.setFont('Pop',  7.5); c.drawString(LX+21, py-10, pmt.get('date','')+"  -  "+pmt.get('method',''))
        py -= 24
    if not inv.get('payments'):
        c.setFillColor(MDGRAY); c.setFont('Pop', 8)
        c.drawString(LX+9, y-28, "No payments recorded.")

    card(c, TX, y-PH_H, TW2, PH_H, fill=WHITE, stroke=RULE)
    c.setFillColor(NAVY); c.rect(TX, y-PH_H, 3, PH_H, fill=1, stroke=0)
    ty = y-12; RVAL = TX+TW2-10

    for lbl, val, accent, big in [
        ("Subtotal",             inv.get('subtotal','$0.00'),    False, False),
        (inv.get('tax_label','Sales Tax'), inv.get('tax_amount','$0.00'), False, False),
        ("Design Deposit Paid",  "-"+inv.get('deposit_paid','$0.00'),   False, False),
        ("BALANCE DUE",          inv.get('balance','$0.00'),     True,  True),
    ]:
        if accent:
            hline(c, TX+8, ty+10, TW2-16, col=LTGRAY, lw=0.8)
            c.setFillColor(OFF); c.rect(TX+3, ty-12, TW2-3, 22, fill=1, stroke=0)
        c.setFillColor(INK if accent else DKGRAY)
        c.setFont('PopB' if big else 'Pop', 10 if big else 9)
        c.drawString(TX+10, ty, lbl)
        status_color = inv.get('status_color','due')
        c.setFillColor(RED if accent and status_color=='overdue' else
                       GREEN if accent and status_color=='paid' else INK)
        c.setFont('PopB', 11 if big else 9)
        c.drawRightString(RVAL, ty, val)
        ty -= 19 if big else 14

    c.setFillColor(MDGRAY); c.setFont('Pop', 6)
    c.drawString(TX+10, ty+4, "WA vehicle wrap installation - taxable retail service (RCW 82.04)")
    y -= PH_H+10

    card(c, LX, y-26, TW, 26, fill=GREENBG, stroke=colors.HexColor('#a8d8bc'))
    c.setFillColor(GREEN); c.rect(LX, y-26, 3, 26, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#1a6a3c')); c.setFont('PopB', 8)
    c.drawString(LX+10, y-9, "How to Pay")
    c.setFillColor(DKGRAY); c.setFont('Pop', 8)
    c.drawString(LX+72, y-9, inv.get('payment_methods','Credit Card  -  Check payable to USA Wrap Co  -  Pay online at portal.usawrapco.com'))
    c.setFillColor(LINK); c.setFont('PopM', 7.5)
    c.drawRightString(W-28, y-20, "Pay online -> "+SHOP['portal'])
    c.setFillColor(DKGRAY); c.setFont('Pop', 7.5)
    c.drawString(LX+10, y-20, "Payments received after due date subject to 1.5%/month late fee")
    y -= 34

    if inv.get('notes'):
        card(c, LX, y-36, TW, 36, fill=OFF, stroke=RULE)
        c.setFillColor(NAVY); c.rect(LX, y-36, 3, 36, fill=1, stroke=0)
        c.setFillColor(DKGRAY); c.setFont('PopB', 7); c.drawString(LX+9, y-9, "NOTES")
        c.setFillColor(DKGRAY); c.setFont('Pop', 8)
        words = inv['notes'].split(); line = ''; ny = y-20
        for word in words:
            t = (line+' '+word).strip()
            if c.stringWidth(t,'Pop',8) > TW-20:
                c.drawString(LX+9, ny, line); ny -= 10; line = word
            else: line = t
        if line: c.drawString(LX+9, ny, line)
        y -= 44

    footer(c)


# ─── MAIN ────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    INVOICE = {
        'ref': 'INV-0001', 'date': 'Today', 'due_date': 'Net 10',
        'status': 'PAYMENT DUE', 'status_color': 'due',
        'agent': 'Agent', 'install_date': 'Today',
        'client_name': 'Client', 'client_phone': '', 'client_email': '',
        'client_addr': '', 'linked_ref': '', 'line_items': [],
        'subtotal': '$0.00', 'tax_label': 'Sales Tax (8.1%)', 'tax_amount': '$0.00',
        'deposit_paid': '$0.00', 'balance': '$0.00', 'payments': [],
        'payment_methods': 'Credit Card - Check - portal.usawrapco.com',
    }

    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            INVOICE = json.load(f)

    out_path = sys.argv[2] if len(sys.argv) > 2 else '/tmp/invoice.pdf'

    c = rl_canvas.Canvas(out_path, pagesize=letter)
    gen_invoice(c, INVOICE)
    c.save()
    print(f"Saved: {out_path}")
