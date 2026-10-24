// ฟังก์ชันช่วยทั่วไป: วันที่ไทย, ตัวเลข → ตัวอักษร (BAHTTEXT), รูปแบบเงิน, escape HTML

export const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- วันที่ (เก็บเป็น ISO ค.ศ. yyyy-mm-dd แสดงเป็น พ.ศ.) ----------
export function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(iso, n) {
  const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d);
}
export const todayISO = () => toISO(new Date());

/** 24 กันยายน 2569 */
export function thDate(iso) {
  const d = parseISO(iso);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}` : '';
}
/** 24 ก.ย. 69 */
export function thDateShort(iso) {
  const d = parseISO(iso);
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}` : '';
}
/** 24 เดือน กันยายน พ.ศ. 2569 (รูปแบบในสัญญา/คำสั่ง) */
export function thDateLong(iso) {
  const d = parseISO(iso);
  return d ? `${d.getDate()} เดือน ${MONTHS[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}` : '';
}
export const thWeekday = iso => { const d = parseISO(iso); return d ? WEEKDAYS[d.getDay()] : ''; };
export const thParts = iso => { const d = parseISO(iso); return d ? { d: d.getDate(), m: MONTHS[d.getMonth()], y: d.getFullYear() + 543 } : { d: '', m: '', y: '' }; };

// ---------- เงิน ----------
export const round2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;
export function money(n) {
  n = round2(n || 0);
  return n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
export function money2(n) {
  return round2(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DIGIT = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const POS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

// อ่านเลขไม่เกิน 6 หลัก (หลักล้านขึ้นไปจัดการด้านนอก) more = มีหลักที่สูงกว่านี้อยู่ (ใช้ตัดสิน "เอ็ด")
function readBlock(s, more) {
  let out = '';
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const d = +s[i], p = len - 1 - i;
    if (!d) continue;
    if (p === 0) out += d === 1 && (len > 1 && +s.slice(0, -1) > 0 || more) ? 'เอ็ด' : DIGIT[d];
    else if (p === 1) out += d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : DIGIT[d] + 'สิบ';
    else out += DIGIT[d] + POS[p];
  }
  return out;
}
function readInt(s) {
  s = s.replace(/^0+/, '');
  if (!s) return DIGIT[0];
  const parts = [];
  while (s.length > 6) { parts.unshift(s.slice(-6)); s = s.slice(0, -6); }
  parts.unshift(s);
  return parts.map((blk, i) => {
    const more = parts.slice(0, i).some(x => +x);
    return (+blk ? readBlock(blk, more) : '') + (i < parts.length - 1 ? 'ล้าน' : '');
  }).join('');
}
/** เหมือน BAHTTEXT ของ Excel: 25350 → สองหมื่นห้าพันสามร้อยห้าสิบบาทถ้วน */
export function bahtText(n) {
  n = round2(+n || 0);
  const neg = n < 0 ? 'ลบ' : '';
  const [b, s] = Math.abs(n).toFixed(2).split('.');
  let out = neg + readInt(b) + 'บาท';
  out += +s ? readInt(s) + 'สตางค์' : 'ถ้วน';
  return out;
}

// ---------- อื่น ๆ ----------
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
