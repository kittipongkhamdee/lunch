"""สร้าง data/seed.json จากไฟล์ Excel เดิมของโรงเรียน (ใช้ครั้งเดียวเพื่อนำข้อมูลเก่าเข้าระบบ)
usage: python3 -I tools/build_seed.py <เงินต่อวัน.xlsx> <ใบรับรอง.xlsx> data/seed.json
"""
import sys, re, json, openpyxl

TH = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,
      'สิงหาคม':8,'พฤษาคม':5,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12}

def iso(s):
    m = re.match(r'\s*(\d+)\s+(\S+)\s+(\d{4})', str(s))
    d, mo, y = int(m[1]), TH[m[2]], int(m[3]) - 543
    return f'{y:04d}-{mo:02d}-{d:02d}'

def clean(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()

def num(v):
    return v if isinstance(v, (int, float)) else None

ledger, vouchers, out = sys.argv[1:4]
wb = openpyxl.load_workbook(ledger)
s1 = wb['Sheet1']; menus_ws = wb['รายการอาหาร']; money = wb['เงินต่อวัน']

# ---- รายชื่อครู + ตำแหน่ง (ตัดชื่อซ้ำที่ต่างกันแค่ช่องว่าง)
teachers = {}
for r in s1.iter_rows(min_row=2, values_only=True):
    if r[12]:
        teachers[clean(r[12])] = clean(r[13])

# ---- สัปดาห์
weeks = []
bk_to_teacher = {}
for r in s1.iter_rows(min_row=2, values_only=True):
    if r[0]:  # ต้นสัปดาห์
        weeks.append({'no': r[0], 'memoNo': clean(r[1]), 'memoDate': iso(r[2]), 'drawn': r[3], 'withdrawNo': r[11], 'days': []})
    if r[7]:
        weeks[-1]['days'].append({'date': iso(r[7]), 'amount': r[5], 'bk': str(r[8]), 'teacher': clean(r[12]), 'items': [], 'menu': ''})

# ---- เมนูรายวัน
# แถวของแต่ละชีตเรียงตามสัปดาห์เหมือนกัน (วันที่ในบางแถวพิมพ์ไม่ตรงกัน จึงจับคู่ตามลำดับ)
for wk, row in zip(weeks, menus_ws.iter_rows(min_row=2, values_only=True)):
    for i, d in enumerate(wk['days']):
        d['menu'] = clean(row[6 + i])

# ---- รายการวัตถุดิบ (เฉพาะสัปดาห์ที่มีใบรับรองใน Excel)
byDate = {d['date']: d for w in weeks for d in w['days']}
library = {}
for ws in openpyxl.load_workbook(vouchers).worksheets:
    rows = list(ws.iter_rows(values_only=True))
    i = 0
    while i < len(rows):
        if clean(rows[i][0]).startswith('ใบรับรองการจ่ายเงิน'):
            m = re.search(r'วันที่\s*(\d+)\s*เดือน\s*(\S+)\s*พ\.ศ\.?\s*(\d{4})', ' '.join(clean(c) for c in rows[i+2] if c))
            date = iso(f'{m[1]} {m[2]} {m[3]}')
            j = i + 4
            items = []
            while j < len(rows) and not clean(rows[j][0]).startswith('รวมเป็นเงิน'):
                r = rows[j]
                if r[1] and num(r[2]) is not None or (r[1] and str(r[2] or '').replace('.', '').isdigit()):
                    q = float(r[2]); p = float(r[4]) if r[4] not in (None, '') else 0
                    it = {'name': clean(r[1]), 'qty': q, 'unit': clean(r[3]), 'price': p}
                    if isinstance(r[5], (int, float)) and abs(r[5] - q * p) > 0.001:
                        it['amount'] = r[5]  # ในไฟล์เดิมพิมพ์ยอดทับสูตร
                    items.append(it)
                j += 1
            if date in byDate:
                byDate[date]['items'] = items
                if byDate[date]['menu']:
                    library[byDate[date]['menu']] = items
            i = j
        i += 1

# ---- ตรวจยอดรวมกับสมุดบัญชี
bad = 0
for d in byDate.values():
    if d['items']:
        t = sum(it.get('amount', it['qty'] * it['price']) for it in d['items'])
        if abs(t - d['amount']) > 0.5:
            bad += 1
            print('ยอดไม่ตรง', d['date'], t, d['amount'])
print('weeks', len(weeks), 'days', len(byDate), 'with items', sum(1 for d in byDate.values() if d['items']), 'menus', len(library), 'mismatch', bad)

SETTINGS = {
    'school': 'โรงเรียนบ้านละมงค์', 'locale': 'อ.ศรีณรงค์ จ.สุรินทร์',
    'area': 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุรินทร์ เขต 3',
    'fiscalYear': 2569, 'term': '1 / 2569',
    'directorName': 'นายธงสยาม พลหล้า', 'directorTitle': 'ผู้อำนวยการโรงเรียนบ้านละมงค์',
    'financeName': 'นางสาวธิดารัตน์ เต็งตระกูล', 'financePosition': 'ครู ชำนาญการพิเศษ',
    'parcelName': 'นายวิรัตน์ นามเขต', 'parcelHeadName': 'นางเยาวพร คำฝอย',
    'chairName': 'นางกนกวรรณ คำดี',
    'loanNo': '4 / 2569', 'loanDate': '2026-05-18',
    'orderNo': '078/2568', 'orderDate': '2025-10-31',
    'cookName': 'นางคำพันธ์ สุขประจำ', 'agreementNo': '2/2569', 'agreementDate': '2025-10-01', 'cookPay': 4000,
    'controlCommittee': ['นางสาววรรณพร เกษชาติ', 'นางสาวมะริษา ลัดหนองขี', 'นางสาวศิริวรรณ มีสติ'],
    'inspectCommittee': ['นางพูนทรัพย์ ประยงค์หอม', 'นางสาวณัฏฐ์นลิน ศรีกาลบุตร', 'นางสาวจุฑามาศ แม่นงาม'],
}
json.dump({'settings': SETTINGS, 'teachers': [{'name': n, 'position': p} for n, p in teachers.items()], 'weeks': weeks,
           'menuLibrary': [{'menu': k, 'items': v} for k, v in library.items()]},
          open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
