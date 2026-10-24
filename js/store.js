// ที่เก็บข้อมูลในเครื่อง (localStorage) + คำนวณยอด + สำรอง/กู้คืนข้อมูล
import { uid, round2, clean, addDays, parseISO, toISO } from './util.js';

const KEY = 'lunch.v1';

export const blankSettings = () => ({
  school: '', locale: '', area: '',
  fiscalYear: new Date().getFullYear() + 543, term: '',
  directorName: '', directorTitle: 'ผู้อำนวยการโรงเรียน',
  financeName: '', financePosition: '',
  parcelName: '', parcelHeadName: '',
  chairName: '',
  loanNo: '', loanDate: '',
  orderNo: '', orderDate: '',
  cookName: '', agreementNo: '', agreementDate: '', cookPay: 0,
  controlCommittee: ['', '', ''], inspectCommittee: ['', '', ''],
  purchaseRef: 'มาตรา 56 (2) (ข) ประกอบหนังสือกระทรวงการคลัง ด่วนที่สุด ที่ กค (กวจ) 0405.2 / ว116 ลงวันที่ 12 มีนาคม 2562',
  nextBk: 1,
});

const emptyState = () => ({ v: 1, settings: blankSettings(), teachers: [], weeks: [], menus: [], ready: false });

const state = emptyState();   // เก็บ object เดิมไว้ตลอด (อ้างอิงจากหน้าจอได้) แล้วเขียนทับเนื้อใน
const listeners = new Set();
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const getState = () => state;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { console.warn('โหลดข้อมูลไม่ได้', e); }
  state.settings = { ...blankSettings(), ...state.settings };
  return state;
}

let saveFailed = false;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveFailed = false;
  } catch (e) {
    saveFailed = true;
    console.warn('บันทึกข้อมูลไม่ได้', e);
  }
  listeners.forEach(fn => fn(saveFailed));
}

export function replaceState(next) {
  const n = { ...emptyState(), ...next };
  n.settings = { ...blankSettings(), ...n.settings };
  n.ready = true;
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, n);
  save();
}

// ---------- คำนวณยอด ----------
export const itemAmount = it => (it.amount !== undefined && it.amount !== null && it.amount !== '')
  ? +it.amount : round2((+it.qty || 0) * (+it.price || 0));
export const dayTotal = d => d.items?.length ? round2(d.items.reduce((s, it) => s + itemAmount(it), 0)) : round2(+d.amount || 0);
export const weekTotal = w => round2(w.days.reduce((s, d) => s + dayTotal(d), 0));
export const extrasTotal = w => round2((w.extras || []).reduce((s, e) => s + (+e.amount || 0), 0));

export const findWeek = id => state.weeks.find(w => w.id === id);
export const findTeacher = id => state.teachers.find(t => t.id === id);
export const sortedWeeks = () => [...state.weeks].sort((a, b) => (b.days[0]?.date || '').localeCompare(a.days[0]?.date || ''));

// ---------- ข้อมูลเริ่มต้นจากไฟล์ seed ----------
export function importSeed(seed) {
  const teachers = seed.teachers.map(t => ({ id: uid(), name: t.name, position: t.position }));
  const byName = Object.fromEntries(teachers.map(t => [t.name, t.id]));
  const weeks = seed.weeks.map(w => ({
    id: uid(), memoNo: w.memoNo, memoDate: w.memoDate, withdrawNo: String(w.withdrawNo ?? ''),
    cookPay: seed.settings?.cookPay ?? 0, extras: [],
    days: w.days.map(d => ({
      date: d.date, menu: d.menu, bk: String(d.bk), teacherId: byName[d.teacher] || '',
      amount: d.items.length ? undefined : d.amount, items: d.items.map(it => ({ ...it, id: uid() })),
    })),
  }));
  const last = Math.max(0, ...weeks.flatMap(w => w.days.map(d => +d.bk || 0)));
  replaceState({
    settings: { ...blankSettings(), ...seed.settings, nextBk: last + 1 },
    teachers, weeks, menus: seed.menuLibrary || [],
  });
}

export function startBlank() { replaceState({ settings: blankSettings(), teachers: [], weeks: [], menus: [] }); }

// ---------- สัปดาห์ใหม่ ----------
/** วันจันทร์ถัดจากสัปดาห์ล่าสุด (หรือวันจันทร์ของสัปดาห์นี้ถ้ายังไม่มีข้อมูล) */
export function suggestNextMonday() {
  const last = sortedWeeks()[0];
  const d = last ? parseISO(addDays(last.days.at(-1).date, 1)) : new Date();
  const step = last ? 1 : -1;
  while (d.getDay() !== 1) d.setDate(d.getDate() + step);
  return toISO(d);
}

export function createWeek(mondayISO, nDays = 5) {
  const { settings, teachers } = state;
  const last = sortedWeeks()[0];
  // หมุนเวียนครูต่อจากสัปดาห์ก่อน
  let ti = last ? teachers.findIndex(t => t.id === last.days.at(-1).teacherId) + 1 : 0;
  let bk = Math.max(+settings.nextBk || 1, 1);
  const days = [];
  for (let i = 0; i < nDays; i++, bk++) {
    days.push({
      date: addDays(mondayISO, i), menu: '', bk: String(bk), items: [],
      teacherId: teachers.length ? teachers[(ti + i) % teachers.length].id : '',
    });
  }
  const w = {
    id: uid(), memoNo: '', memoDate: days.at(-1).date, withdrawNo: String((last ? +last.withdrawNo || 0 : 0) + 1),
    cookPay: +settings.cookPay || 0, extras: [], days,
  };
  state.weeks.push(w);
  settings.nextBk = bk;
  save();
  return w;
}

export function deleteWeek(id) {
  state.weeks = state.weeks.filter(w => w.id !== id);
  save();
}

// ---------- คลังเมนู/วัตถุดิบ ----------
export function rememberMenu(day) {
  const menu = clean(day.menu);
  if (!menu || !day.items.length) return;
  const rec = { menu, items: day.items.map(({ id, ...it }) => it) };
  const i = state.menus.findIndex(m => m.menu === menu);
  if (i >= 0) state.menus[i] = rec; else state.menus.push(rec);
}

/** ราคา/หน่วยล่าสุดของวัตถุดิบ ใช้เติมให้อัตโนมัติ */
export function ingredientIndex() {
  const idx = new Map();
  const add = it => it.name && idx.set(clean(it.name), { unit: it.unit, price: it.price });
  state.menus.forEach(m => m.items.forEach(add));
  [...state.weeks].sort((a, b) => a.days[0].date.localeCompare(b.days[0].date)).forEach(w => w.days.forEach(d => d.items.forEach(add)));
  return idx;
}

// ---------- สำรองข้อมูล ----------
export function exportJSON() { return JSON.stringify(state, null, 1); }
export function importJSON(text) {
  const obj = JSON.parse(text);
  if (!obj || !Array.isArray(obj.weeks) || !obj.settings) throw new Error('ไฟล์ไม่ใช่ข้อมูลสำรองของระบบนี้');
  replaceState(obj);
}
export { saveFailed };
