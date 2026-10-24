// ส่วนติดต่อผู้ใช้: หน้าจอทั้งหมด + เราเตอร์ (hash) ไม่ใช้ไลบรารีภายนอก ทำงานออฟไลน์ได้
import * as S from './store.js';
import { DOCS, renderDocs, missingFor } from './docs.js';
import { esc, thDate, thDateShort, thWeekday, money, bahtText, parseISO, addDays, todayISO, uid, clean, debounce, round2 } from './util.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const state = S.load();
const save = debounce(() => S.save(), 250);
const flush = () => S.save();

function toast(msg, ms = 2400) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}
const weekRange = w => {
  const a = w.days[0]?.date, b = w.days.at(-1)?.date;
  if (!a) return '';
  const pa = parseISO(a), pb = parseISO(b);
  return pa.getMonth() === pb.getMonth() ? `${pa.getDate()}–${thDateShort(b)}` : `${thDateShort(a)} – ${thDateShort(b)}`;
};
const weekIncomplete = w => !w.memoNo || w.days.some(d => !d.teacherId || !S.dayTotal(d));
const icon = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6.5 6.5 0 0 0-2.5-5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/></svg>',
  cog: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  print: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

// ───────────────────────── โครงหน้า ─────────────────────────
function shell(active, body, { title = 'ระบบเอกสารอาหารกลางวัน', back = '', actions = '' } = {}) {
  const tab = (href, id, ic, label) => `<a href="${href}" class="${active === id ? 'on' : ''}">${ic}<span>${label}</span></a>`;
  return `
  <header class="topbar">
    ${back ? `<a class="iconbtn" href="${back}" aria-label="ย้อนกลับ">${icon.back}</a>` : '<span class="logo"><img src="assets/icon.svg" alt="" width="28" height="28"></span>'}
    <h1>${esc(title)}</h1>
    <span class="grow"></span>${actions}
    <nav class="dnav">
      ${tab('#/', 'home', '', 'สัปดาห์')}${tab('#/teachers', 'teachers', '', 'ครู')}${tab('#/menus', 'menus', '', 'เมนู')}${tab('#/settings', 'settings', '', 'ตั้งค่า')}
    </nav>
  </header>
  <div id="savewarn" class="warnbar" hidden>⚠ เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูลในเครื่อง (อาจอยู่ในโหมดส่วนตัว/พื้นที่เต็ม) กรุณาสำรองข้อมูลทันทีที่หน้า “ตั้งค่า”</div>
  <main class="page">${body}</main>
  <nav class="tabbar">
    ${tab('#/', 'home', icon.home, 'สัปดาห์')}${tab('#/teachers', 'teachers', icon.users, 'ครู')}${tab('#/menus', 'menus', icon.menu, 'เมนู')}${tab('#/settings', 'settings', icon.cog, 'ตั้งค่า')}
  </nav>`;
}
S.onChange(failed => { const el = $('#savewarn'); if (el) el.hidden = !failed; });

// ───────────────────────── เริ่มต้นใช้งาน ─────────────────────────
function viewWelcome() {
  app.innerHTML = `
  <main class="welcome">
    <img src="assets/icon.svg" width="84" height="84" alt="">
    <h1>ระบบเอกสารอาหารกลางวัน</h1>
    <p>กรอกรายการอาหารรายวันครั้งเดียว ระบบจัดทำและพิมพ์เอกสารทั้งชุดให้อัตโนมัติ<br>ไม่ต้องคัดลอกจาก Excel ไป Word อีกต่อไป</p>
    <div class="cards2">
      <button class="card choice" data-act="seed">
        <b>เริ่มด้วยข้อมูลโรงเรียนบ้านละมงค์</b>
        <span>นำเข้าข้อมูลปีงบ 2569 จากไฟล์ Excel เดิม (34 สัปดาห์ · ครู · เมนู · ผู้ลงนาม)</span>
      </button>
      <button class="card choice" data-act="blank">
        <b>เริ่มใหม่แบบว่างเปล่า</b>
        <span>กรอกข้อมูลโรงเรียนในหน้าตั้งค่าเอง</span>
      </button>
    </div>
    <p class="muted small">ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น สำรอง/ย้ายเครื่องได้ที่หน้า “ตั้งค่า”</p>
  </main>`;
  app.onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'seed') {
      try {
        const seed = await (await fetch('data/seed.json')).json();
        S.importSeed(seed); toast('นำเข้าข้อมูลเรียบร้อย'); location.hash = '#/'; route();
      } catch (err) { toast('นำเข้าไม่สำเร็จ: ' + err.message, 5000); }
    } else if (act === 'blank') { S.startBlank(); location.hash = '#/settings'; route(); }
  };
}

// ───────────────────────── หน้าแรก: รายการสัปดาห์ ─────────────────────────
function viewHome() {
  const weeks = S.sortedWeeks();
  const asc = [...weeks].reverse();
  const no = new Map(asc.map((w, i) => [w.id, i + 1]));
  const sum = weeks.reduce((s, w) => s + S.weekTotal(w), 0);
  const days = weeks.reduce((s, w) => s + w.days.length, 0);
  const rows = weeks.map(w => `
    <a class="row week" href="#/week/${w.id}">
      <div class="wn">${no.get(w.id)}</div>
      <div class="grow">
        <b>${esc(weekRange(w))}</b>
        <div class="muted small">บันทึก ${esc(w.memoNo) || '—'} · ใบเบิกที่ ${esc(w.withdrawNo) || '—'} · ${w.days.length} วัน</div>
      </div>
      ${weekIncomplete(w) ? '<span class="badge warn">ยังไม่ครบ</span>' : '<span class="badge ok">ครบ</span>'}
      <div class="amt">${money(S.weekTotal(w))}<small>บาท</small></div>
    </a>`).join('');
  app.innerHTML = shell('home', `
    <section class="stats">
      <div class="stat"><small>จำนวนสัปดาห์</small><b>${weeks.length}</b></div>
      <div class="stat"><small>จำนวนวันที่เบิก</small><b>${days}</b></div>
      <div class="stat wide"><small>ยอดรวมทั้งหมด (บาท)</small><b>${money(sum)}</b></div>
    </section>
    <div class="bar">
      <button class="btn primary" data-act="new">${icon.plus} สร้างสัปดาห์ใหม่</button>
      <button class="btn" data-act="csv">ส่งออกสรุป (CSV)</button>
      <span class="grow"></span>
      <button class="btn ghost hide-installed" data-act="install" hidden>ติดตั้งเป็นแอพ</button>
    </div>
    ${weeks.length ? `<div class="list">${rows}</div>` : '<div class="empty card">ยังไม่มีสัปดาห์ — กด “สร้างสัปดาห์ใหม่” เพื่อเริ่มกรอกข้อมูล</div>'}
  `);
  syncInstallBtn();
  app.onclick = e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'new') newWeekDialog();
    if (act === 'csv') exportCSV();
    if (act === 'install') promptInstall();
  };
}

function newWeekDialog() {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <h2>สร้างสัปดาห์ใหม่</h2>
    <label>วันจันทร์ของสัปดาห์<input type="date" name="start" value="${S.suggestNextMonday()}" required></label>
    <label>จำนวนวันทำการ<select name="n">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n} วัน</option>`).join('')}</select></label>
    <p class="muted small">ระบบจะหมุนเวียนครูผู้จ่ายเงินและเลขที่ บค. ต่อจากสัปดาห์ก่อนให้อัตโนมัติ (แก้ไขรายวันได้ภายหลัง รวมถึงวันหยุดชดเชย)</p>
    <div class="row-end"><button class="btn" value="cancel">ยกเลิก</button><button class="btn primary" value="ok">สร้าง</button></div>
  </form>`;
  document.body.append(dlg); dlg.showModal();
  dlg.addEventListener('close', () => {
    if (dlg.returnValue === 'ok') {
      const f = new FormData($('form', dlg));
      const w = S.createWeek(f.get('start'), +f.get('n'));
      location.hash = '#/week/' + w.id;
    }
    dlg.remove();
  });
}

function exportCSV() {
  const rows = [['ฉบับ', 'เลขที่บันทึก', 'วันที่บันทึก', 'ใบเบิกที่', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'จำนวนวัน', 'ยอดเบิก', 'ตัวอักษร']];
  [...S.sortedWeeks()].reverse().forEach((w, i) => rows.push([i + 1, w.memoNo, thDate(w.memoDate), w.withdrawNo, thDate(w.days[0].date), thDate(w.days.at(-1).date), w.days.length, S.weekTotal(w), bahtText(S.weekTotal(w))]));
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download('สรุปเบิกอาหารกลางวัน.csv', csv, 'text/csv;charset=utf-8');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ───────────────────────── หน้าสัปดาห์ (กรอกข้อมูล) ─────────────────────────
function itemRow(d, di, it, ii) {
  return `<div class="item" data-i="${ii}">
    <label class="f name">เครื่องปรุง/วัตถุดิบ<input data-d="${di}" data-it="${ii}" data-f="name" list="ingr" value="${esc(it.name)}" placeholder="เช่น ไก่" autocomplete="off"></label>
    <label class="f qty">จำนวน<input data-d="${di}" data-it="${ii}" data-f="qty" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.qty)}"></label>
    <label class="f unit">หน่วย<input data-d="${di}" data-it="${ii}" data-f="unit" list="units" value="${esc(it.unit)}" placeholder="กิโลกรัม"></label>
    <label class="f price">ราคา/หน่วย<input data-d="${di}" data-it="${ii}" data-f="price" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.price)}"></label>
    <label class="f amount">จำนวนเงิน<input data-d="${di}" data-it="${ii}" data-f="amount" type="number" inputmode="decimal" step="any" value="${S.itemAmount(it)}"></label>
    <button class="iconbtn danger" data-act="del-item" data-d="${di}" data-it="${ii}" aria-label="ลบรายการ">${icon.trash}</button>
  </div>`;
}

function dayCard(w, d, di, open) {
  const lib = state.menus.some(m => m.menu === clean(d.menu));
  return `<details class="card day" data-d="${di}" ${open ? 'open' : ''}>
    <summary>
      <span class="dn">${esc(thWeekday(d.date))}<b>${esc(thDateShort(d.date))}</b></span>
      <span class="grow muted menu-sum">${esc(clean(d.menu)) || 'ยังไม่ได้ใส่เมนู'}</span>
      <span class="badge ${S.dayTotal(d) && d.teacherId ? 'ok' : 'warn'}" data-total-badge="${di}">${money(S.dayTotal(d))} บาท</span>
    </summary>
    <div class="daybody">
      <div class="grid2">
        <label class="f">วันที่<input type="date" data-d="${di}" data-f="date" value="${esc(d.date)}"></label>
        <label class="f">ครูผู้จ่ายเงิน (ผู้รับผิดชอบ)<select data-d="${di}" data-f="teacherId">
          <option value="">— เลือกครู —</option>${state.teachers.map(t => `<option value="${t.id}" ${t.id === d.teacherId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
        <label class="f">เลข บค.<input data-d="${di}" data-f="bk" inputmode="numeric" value="${esc(d.bk)}"></label>
      </div>
      <label class="f">เมนูอาหารของวัน <small class="muted">(เว้นวรรคระหว่างรายการ เช่น ข้าวสวยขาว ผัดกะเพราไก่ แตงโม)</small>
        <input data-d="${di}" data-f="menu" list="menulist" value="${esc(d.menu)}" placeholder="พิมพ์ชื่อเมนู หรือเลือกจากคลังเมนู" autocomplete="off"></label>
      ${lib && d.items.length === 0 ? `<button class="btn tint" data-act="load-menu" data-d="${di}">นำรายการวัตถุดิบของเมนูนี้จากคลังมาใส่</button>` : ''}
      ${d.items.length ? '<div class="itemhead"><span>เครื่องปรุง/วัตถุดิบ</span><span>จำนวน</span><span>หน่วย</span><span>ราคา/หน่วย</span><span>จำนวนเงิน</span><span></span></div>' : ''}
      <div class="items">${d.items.map((it, ii) => itemRow(d, di, it, ii)).join('')}</div>
      ${d.items.length ? '' : `<label class="f amtonly">ยอดรวมทั้งวัน (ใช้เมื่อไม่ได้กรอกรายการวัตถุดิบ)<input data-d="${di}" data-f="amount" type="number" inputmode="decimal" step="any" value="${esc(d.amount ?? '')}"></label>`}
      <div class="row-end split">
        <button class="btn tint" data-act="add-item" data-d="${di}">${icon.plus} เพิ่มรายการ</button>
        <span class="grow"></span>
        <b class="daytotal">รวม <span data-day-total="${di}">${money(S.dayTotal(d))}</span> บาท</b>
      </div>
      <div class="row-end">
        <a class="btn" href="#/print/${w.id}?day=${di}">${icon.print} พิมพ์เฉพาะวันนี้</a>
        ${w.days.length > 1 ? `<button class="btn ghost danger-t" data-act="del-day" data-d="${di}">ลบวันนี้</button>` : ''}
      </div>
    </div>
  </details>`;
}

function viewWeek(id) {
  const w = S.findWeek(id);
  if (!w) { location.hash = '#/'; return; }
  const openIdx = (() => { const i = w.days.findIndex(d => !S.dayTotal(d) || !d.teacherId); return i < 0 ? 0 : i; })();
  const idx = S.ingredientIndex();
  const render = () => {
    const keepOpen = $$('details.day[open]').map(x => x.dataset.d);
    app.innerHTML = shell('home', `
      <section class="card info">
        <div class="grid4">
          <label class="f">เลขที่บันทึกข้อความ<input data-w="memoNo" value="${esc(w.memoNo)}" placeholder="เช่น 429/2569"></label>
          <label class="f">วันที่บันทึก<input type="date" data-w="memoDate" value="${esc(w.memoDate)}"><small class="muted" data-thdate="memoDate">${esc(thDate(w.memoDate))}</small></label>
          <label class="f">ใบเบิกที่<input data-w="withdrawNo" inputmode="numeric" value="${esc(w.withdrawNo)}"></label>
          <label class="f">ค่าจ้างแม่ครัวสัปดาห์นี้ (บาท)<input data-w="cookPay" type="number" inputmode="decimal" value="${esc(w.cookPay)}"></label>
        </div>
      </section>
      <div class="days">${w.days.map((d, i) => dayCard(w, d, i, keepOpen.length ? keepOpen.includes(String(i)) : i === openIdx)).join('')}</div>
      <div class="bar"><button class="btn tint" data-act="add-day">${icon.plus} เพิ่มวัน</button></div>
      <section class="card extras">
        <h3>รายการเบิกเพิ่มในบันทึกของหัวหน้าการเงิน <small class="muted">(ถ้ามี เช่น ค่าแก๊ส ค่าน้ำยาล้างจาน ค่าจ้างแม่ครัว)</small></h3>
        ${(w.extras || []).map((e, i) => `<div class="extra">
          <label class="f grow">รายการ<input data-x="${i}" data-f="label" value="${esc(e.label)}" placeholder="เช่น ค่าแก๊ส"></label>
          <label class="f">จำนวนเงิน<input data-x="${i}" data-f="amount" type="number" inputmode="decimal" step="any" value="${esc(e.amount)}"></label>
          <button class="iconbtn danger" data-act="del-extra" data-x="${i}" aria-label="ลบ">${icon.trash}</button></div>`).join('')}
        <button class="btn tint" data-act="add-extra">${icon.plus} เพิ่มรายการเบิก</button>
      </section>
      <div class="bar"><button class="btn ghost danger-t" data-act="del-week">ลบสัปดาห์นี้</button></div>
      <div class="stickybar">
        <div><small class="muted">ยอดเบิกสัปดาห์นี้</small><b class="big" id="weektotal">${money(S.weekTotal(w))}</b> <small>บาท</small></div>
        <a class="btn primary" href="#/print/${w.id}">${icon.print} พิมพ์เอกสาร</a>
      </div>
      <datalist id="ingr">${[...idx.keys()].map(k => `<option value="${esc(k)}">`).join('')}</datalist>
      <datalist id="units">${['กิโลกรัม', 'ขีด', 'ถุง', 'มัด', 'ขวด', 'ห่อ', 'แผง', 'ฟอง', 'ลูก', 'ก้อน', 'แพ็ค', 'กล่อง', 'คู่', 'ผล', 'กระป๋อง'].map(u => `<option value="${u}">`).join('')}</datalist>
      <datalist id="menulist">${state.menus.map(m => `<option value="${esc(m.menu)}">`).join('')}</datalist>
    `, { title: 'สัปดาห์ ' + weekRange(w), back: '#/' });
  };
  render();

  const refresh = () => {
    $('#weektotal').textContent = money(S.weekTotal(w));
    w.days.forEach((d, di) => {
      const t = money(S.dayTotal(d));
      const a = $(`[data-day-total="${di}"]`); if (a) a.textContent = t;
      const b = $(`[data-total-badge="${di}"]`);
      if (b) { b.textContent = t + ' บาท'; b.className = 'badge ' + (S.dayTotal(d) && d.teacherId ? 'ok' : 'warn'); }
    });
  };
  const persist = () => { refresh(); save(); };

  app.oninput = e => {
    const el = e.target; if (!el.dataset.f && !el.dataset.w) return;
    if (el.dataset.w) {
      w[el.dataset.w] = el.value;
      if (el.dataset.w === 'memoDate') $('[data-thdate="memoDate"]').textContent = thDate(el.value);
      return save();
    }
    if (el.dataset.x !== undefined) { w.extras[+el.dataset.x][el.dataset.f] = el.value; return save(); }
    const d = w.days[+el.dataset.d];
    if (el.dataset.it !== undefined) {
      const it = d.items[+el.dataset.it], f = el.dataset.f;
      it[f] = el.value;
      if (f === 'qty' || f === 'price') { delete it.amount; }
      if (f === 'amount') it.amount = el.value === '' ? undefined : +el.value;
      if (f === 'qty' || f === 'price') { const a = $(`[data-d="${el.dataset.d}"][data-it="${el.dataset.it}"][data-f="amount"]`); if (a) a.value = S.itemAmount(it); }
      S.rememberMenu(d);
    } else {
      d[el.dataset.f] = el.value;
      if (el.dataset.f === 'menu') $(`details[data-d="${el.dataset.d}"] .menu-sum`).textContent = clean(el.value) || 'ยังไม่ได้ใส่เมนู';
      if (el.dataset.f === 'date') { const sm = el.closest('details').querySelector('.dn'); sm.innerHTML = `${esc(thWeekday(el.value))}<b>${esc(thDateShort(el.value))}</b>`; }
      if (el.dataset.f === 'amount') d.amount = el.value === '' ? undefined : +el.value;
      S.rememberMenu(d);
    }
    persist();
  };

  app.onchange = e => {
    const el = e.target;
    if (el.dataset.it !== undefined && el.dataset.f === 'name') {   // เติมหน่วย/ราคาล่าสุดอัตโนมัติ
      const it = w.days[+el.dataset.d].items[+el.dataset.it], known = idx.get(clean(el.value));
      if (known && !it.unit && !it.price) {
        it.unit = known.unit; it.price = known.price; delete it.amount;
        const row = el.closest('.item');
        $('[data-f="unit"]', row).value = it.unit; $('[data-f="price"]', row).value = it.price;
        $('[data-f="amount"]', row).value = S.itemAmount(it); persist();
      }
    }
    if (el.dataset.f === 'menu') {                                  // เมนูตรงกับคลัง และยังไม่มีรายการ → เติมให้เลย
      const d = w.days[+el.dataset.d], m = state.menus.find(x => x.menu === clean(el.value));
      if (m && !d.items.length) { d.items = m.items.map(it => ({ ...it, id: uid() })); flush(); render(); }
      else render();
    }
    if (el.dataset.f === 'teacherId') { refresh(); }
    if (el.dataset.f === 'date' && el.dataset.d !== undefined) { w.days.sort((a, b) => a.date.localeCompare(b.date)); flush(); render(); }
  };

  app.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const di = b.dataset.d !== undefined ? +b.dataset.d : null, act = b.dataset.act;
    if (act === 'add-item') {
      w.days[di].items.push({ id: uid(), name: '', qty: '', unit: '', price: '' }); flush(); render();
      const open = $(`details[data-d="${di}"]`); open.open = true;
      $$('.item [data-f="name"]', open).at(-1)?.focus();
    } else if (act === 'del-item') {
      w.days[di].items.splice(+b.dataset.it, 1); S.rememberMenu(w.days[di]); flush(); render();
    } else if (act === 'load-menu') {
      const d = w.days[di], m = state.menus.find(x => x.menu === clean(d.menu));
      if (m) { d.items = m.items.map(it => ({ ...it, id: uid() })); flush(); render(); }
    } else if (act === 'add-day') {
      const lastD = w.days.at(-1).date; let nd = addDays(lastD, 1);
      if (parseISO(nd).getDay() === 6) nd = addDays(nd, 2);
      if (parseISO(nd).getDay() === 0) nd = addDays(nd, 1);
      const bk = Math.max(+state.settings.nextBk || 1, 1);
      w.days.push({ date: nd, menu: '', bk: String(bk), items: [], teacherId: '' }); state.settings.nextBk = bk + 1; flush(); render();
    } else if (act === 'del-day') {
      if (confirm('ลบวันนี้ออกจากสัปดาห์?')) { w.days.splice(di, 1); flush(); render(); }
    } else if (act === 'add-extra') {
      (w.extras ||= []).push({ label: '', amount: '' }); flush(); render();
    } else if (act === 'del-extra') {
      w.extras.splice(+b.dataset.x, 1); flush(); render();
    } else if (act === 'del-week') {
      if (confirm('ลบสัปดาห์นี้ทั้งหมด? (กู้คืนไม่ได้ ควรสำรองข้อมูลก่อน)')) { S.deleteWeek(w.id); location.hash = '#/'; }
    }
  };
  app.onfocusin = e => { if (e.target.matches('input[type=number]')) e.target.select?.(); };
}

// ───────────────────────── หน้าพิมพ์เอกสาร ─────────────────────────
function viewPrint(id, query) {
  const w = S.findWeek(id);
  if (!w) { location.hash = '#/'; return; }
  const dayParam = new URLSearchParams(query).get('day');
  const dayIdx = dayParam !== null && dayParam !== '' ? [+dayParam] : null;
  let sel;
  try { sel = JSON.parse(localStorage.getItem('lunch.docs')) } catch { /* ใช้ค่าเริ่มต้น */ }
  sel = Array.isArray(sel) ? sel : DOCS.map(d => d.id);
  const avail = DOCS.filter(d => !dayIdx || d.scope === 'day');
  const draw = () => {
    const ids = avail.map(d => d.id).filter(i => sel.includes(i));
    const miss = missingFor(w, state.settings, ids);
    const pages = renderDocs(w, state.settings, ids, dayIdx);
    app.innerHTML = shell('home', `
      <section class="toolbar card">
        <div class="chips">${avail.map(d => `<label class="chip ${sel.includes(d.id) ? 'on' : ''}" title="${esc(d.hint)}"><input type="checkbox" value="${d.id}" ${sel.includes(d.id) ? 'checked' : ''}>${esc(d.title)}</label>`).join('')}</div>
        <div class="row-end"><span class="muted small grow">${dayIdx ? 'พิมพ์เฉพาะ ' + esc(thDate(w.days[dayIdx[0]]?.date)) : `ทั้งสัปดาห์ ${w.days.length} วัน`} · กระดาษ A4</span>
          <button class="btn primary" data-act="print" ${ids.length ? '' : 'disabled'}>${icon.print} พิมพ์ / บันทึกเป็น PDF</button></div>
        ${miss.length ? `<div class="warnbox"><b>ข้อมูลที่ยังไม่ครบ</b> (ช่องที่ว่างจะพิมพ์เป็นเส้นประให้เขียนเอง):<ul>${miss.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      </section>
      <div class="sheets" id="sheets">${pages || '<div class="empty card">เลือกเอกสารที่ต้องการด้านบน</div>'}</div>`,
    { title: 'พิมพ์เอกสาร · ' + weekRange(w), back: '#/week/' + w.id });
    fit();
  };
  draw();
  app.onchange = e => {
    if (e.target.type !== 'checkbox') return;
    sel = $$('.chips input:checked').map(i => i.value);
    // คงรายการที่ไม่ได้แสดงอยู่ในการเลือกเดิมไว้ด้วย
    try { localStorage.setItem('lunch.docs', JSON.stringify(sel)); } catch { /* ignore */ }
    draw();
  };
  app.onclick = e => { if (e.target.closest('[data-act="print"]')) window.print(); };
}
/** ย่อหน้ากระดาษ A4 ให้พอดีจอมือถือ (เฉพาะตอนแสดงผล ไม่กระทบตอนพิมพ์) */
function fit() {
  const el = $('#sheets'); if (!el) return;
  const z = Math.min(1, (document.documentElement.clientWidth - 16) / 794);
  el.style.setProperty('--z', z.toFixed(3));
}
addEventListener('resize', fit);

// ───────────────────────── ครู ─────────────────────────
function viewTeachers() {
  const render = () => {
    app.innerHTML = shell('teachers', `
      <p class="muted">รายชื่อนี้ใช้เลือก “ครูผู้จ่ายเงิน” รายวัน ระบบหมุนเวียนตามลำดับในรายการนี้เมื่อสร้างสัปดาห์ใหม่</p>
      <div class="list">${state.teachers.map((t, i) => `
        <div class="row teacher">
          <span class="wn">${i + 1}</span>
          <label class="f grow">ชื่อ-สกุล<input data-t="${i}" data-f="name" value="${esc(t.name)}"></label>
          <label class="f">ตำแหน่ง<input data-t="${i}" data-f="position" value="${esc(t.position)}" list="positions"></label>
          <button class="iconbtn" data-act="up" data-t="${i}" aria-label="ขึ้น" ${i ? '' : 'disabled'}>↑</button>
          <button class="iconbtn" data-act="down" data-t="${i}" aria-label="ลง" ${i < state.teachers.length - 1 ? '' : 'disabled'}>↓</button>
          <button class="iconbtn danger" data-act="del" data-t="${i}" aria-label="ลบ">${icon.trash}</button>
        </div>`).join('')}</div>
      <div class="bar"><button class="btn primary" data-act="add">${icon.plus} เพิ่มครู</button></div>
      <datalist id="positions">${['ครู', 'ครูชำนาญการ', 'ครูชำนาญการพิเศษ', 'ครูผู้ช่วย', 'พนักงานราชการ', 'ครูอัตราจ้าง'].map(p => `<option value="${p}">`).join('')}</datalist>`);
  };
  render();
  app.oninput = e => { const el = e.target; if (el.dataset.t === undefined) return; state.teachers[+el.dataset.t][el.dataset.f] = el.value; save(); };
  app.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = +b.dataset.t, T = state.teachers;
    if (b.dataset.act === 'add') { T.push({ id: uid(), name: '', position: '' }); flush(); render(); $$('[data-f="name"]').at(-1).focus(); return; }
    if (b.dataset.act === 'up') [T[i - 1], T[i]] = [T[i], T[i - 1]];
    if (b.dataset.act === 'down') [T[i + 1], T[i]] = [T[i], T[i + 1]];
    if (b.dataset.act === 'del') {
      const used = state.weeks.some(w => w.days.some(d => d.teacherId === T[i].id));
      if (!confirm(used ? 'ครูท่านนี้ถูกใช้ในสัปดาห์ที่บันทึกไว้แล้ว ลบแล้วช่องครูในสัปดาห์เหล่านั้นจะว่าง ต้องการลบ?' : 'ลบรายชื่อนี้?')) return;
      state.weeks.forEach(w => w.days.forEach(d => { if (d.teacherId === T[i].id) d.teacherId = ''; }));
      T.splice(i, 1);
    }
    flush(); render();
  };
}

// ───────────────────────── คลังเมนู ─────────────────────────
function viewMenus() {
  const q = () => clean($('#q')?.value || '');
  const render = () => {
    const f = q();
    const list = state.menus.map((m, i) => ({ m, i })).filter(({ m }) => !f || m.menu.includes(f));
    app.innerHTML = shell('menus', `
      <p class="muted">คลังเมนูสะสมอัตโนมัติจากที่กรอกในแต่ละวัน เมื่อพิมพ์เมนูซ้ำ ระบบจะเติมรายการวัตถุดิบ หน่วย และราคาล่าสุดให้ทันที</p>
      <input id="q" class="search" type="search" placeholder="ค้นหาเมนู" value="${esc(f)}">
      <div class="list">${list.map(({ m, i }) => {
        const total = round2(m.items.reduce((s, it) => s + S.itemAmount(it), 0));
        return `<details class="row menuitem"><summary><b class="grow">${esc(m.menu)}</b><span class="muted small">${m.items.length} รายการ · ${money(total)} บาท</span></summary>
          <table class="mini"><tbody>${m.items.map(it => `<tr><td>${esc(it.name)}</td><td class="r">${esc(it.qty)} ${esc(it.unit)}</td><td class="r">${money(S.itemAmount(it))}</td></tr>`).join('')}</tbody></table>
          <button class="btn ghost danger-t" data-act="del" data-i="${i}">ลบเมนูนี้ออกจากคลัง</button></details>`;
      }).join('') || '<div class="empty card">ไม่พบเมนู</div>'}</div>`);
    const s = $('#q'); if (f) { s.focus(); s.setSelectionRange(f.length, f.length); }
  };
  render();
  app.oninput = e => { if (e.target.id === 'q') render(); };
  app.onclick = e => {
    const b = e.target.closest('[data-act="del"]'); if (!b) return;
    if (confirm('ลบเมนูนี้ออกจากคลัง? (ไม่กระทบสัปดาห์ที่บันทึกไว้แล้ว)')) { state.menus.splice(+b.dataset.i, 1); flush(); render(); }
  };
}

// ───────────────────────── ตั้งค่า ─────────────────────────
const FIELD_GROUPS = [
  ['โรงเรียน', [['school', 'ชื่อโรงเรียน', 'โรงเรียนบ้านละมงค์'], ['locale', 'อำเภอ/จังหวัด', 'อ.ศรีณรงค์ จ.สุรินทร์'], ['area', 'สังกัด', 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา…'], ['fiscalYear', 'ปีงบประมาณ (พ.ศ.)', '2569', 'number'], ['term', 'ภาคเรียนที่', '1 / 2569']]],
  ['ผู้ลงนาม', [['directorName', 'ชื่อผู้อำนวยการ', ''], ['directorTitle', 'ตำแหน่งผู้อำนวยการ', 'ผู้อำนวยการโรงเรียน…'], ['financeName', 'หัวหน้า/เจ้าหน้าที่การเงิน', ''], ['financePosition', 'ตำแหน่งหัวหน้าการเงิน', 'ครู ชำนาญการพิเศษ'], ['parcelName', 'เจ้าหน้าที่พัสดุ', ''], ['parcelHeadName', 'หัวหน้าเจ้าหน้าที่พัสดุ', ''], ['chairName', 'ประธานกรรมการโครงการอาหารกลางวัน (ผู้ยืมเงิน)', '']]],
  ['คำสั่ง / สัญญายืมเงิน', [['orderNo', 'คำสั่งแต่งตั้งคณะกรรมการ เลขที่', '078/2568'], ['orderDate', 'ลงวันที่', '', 'date'], ['loanNo', 'สัญญายืมเงิน เลขที่', '4 / 2569'], ['loanDate', 'ลงวันที่', '', 'date']]],
  ['แม่ครัว (ผู้รับจ้าง)', [['cookName', 'ชื่อผู้รับจ้าง', ''], ['agreementNo', 'บันทึกข้อตกลงจ้าง เลขที่', '2/2569'], ['agreementDate', 'ลงวันที่', '', 'date'], ['cookPay', 'ค่าจ้างต่อสัปดาห์ (ค่าเริ่มต้นสัปดาห์ใหม่)', '4000', 'number']]],
];
function viewSettings() {
  const s = state.settings;
  const input = ([k, label, ph, type = 'text']) => `<label class="f">${label}<input data-s="${k}" type="${type}" ${type === 'number' ? 'inputmode="decimal"' : ''} value="${esc(s[k])}" placeholder="${esc(ph)}"></label>`;
  const committee = (key, title) => `<div class="f"><b>${title}</b>${[0, 1, 2].map(i => `<label class="f sub">${i ? 'กรรมการ' : 'ประธานกรรมการ'}<input data-s="${key}.${i}" value="${esc(s[key][i])}"></label>`).join('')}</div>`;
  app.innerHTML = shell('settings', `
    ${FIELD_GROUPS.map(([t, fs]) => `<section class="card"><h3>${t}</h3><div class="grid2">${fs.map(input).join('')}</div></section>`).join('')}
    <section class="card"><h3>คณะกรรมการ (แสดงในใบจัดซื้อ ส่วนที่ 2)</h3><div class="grid2">
      ${committee('controlCommittee', 'ผู้ควบคุมและคณะกรรมการตรวจการประกอบอาหาร')}${committee('inspectCommittee', 'ผู้ตรวจการรับ')}</div></section>
    <section class="card"><h3>ใบจัดซื้อ</h3>
      <label class="f">ข้อความอ้างอิงวิธีจัดซื้อ <small class="muted">(ต่อท้ายคำว่า “ดำเนินการโดยวิธีเฉพาะเจาะจง”)</small><textarea rows="3" data-s="purchaseRef">${esc(s.purchaseRef)}</textarea></label>
      <label class="f">เลข บค. ถัดไป <small class="muted">(ใช้ตอนสร้างสัปดาห์ใหม่ — ถ้าขึ้นปีงบใหม่ให้ตั้งเป็น 1)</small><input data-s="nextBk" type="number" inputmode="numeric" value="${esc(s.nextBk)}"></label>
    </section>
    <section class="card"><h3>สำรอง / ย้ายข้อมูล</h3>
      <p class="muted small">ข้อมูลเก็บในเบราว์เซอร์ของเครื่องนี้ ควรกด “สำรองข้อมูล” เป็นประจำ และใช้ไฟล์เดียวกันนี้ย้ายไปเครื่อง/มือถือเครื่องอื่นได้</p>
      <div class="row-end start"><button class="btn primary" data-act="backup">⬇ สำรองข้อมูล (.json)</button>
        <label class="btn">⬆ กู้คืนจากไฟล์<input type="file" id="restore" accept="application/json,.json" hidden></label>
        <button class="btn ghost hide-installed" data-act="install" hidden>ติดตั้งเป็นแอพ</button></div>
      <p class="muted small" id="iosnote" hidden>iPhone/iPad: กดปุ่มแชร์ใน Safari แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”</p>
    </section>
    <section class="card dangerzone"><h3>ล้างข้อมูล</h3>
      <button class="btn ghost danger-t" data-act="reset">ลบข้อมูลทั้งหมดในเครื่องนี้</button></section>`);
  syncInstallBtn();
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) $('#iosnote').hidden = false;
  app.oninput = e => {
    const k = e.target.dataset.s; if (!k) return;
    const v = e.target.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value;
    if (k.includes('.')) { const [a, i] = k.split('.'); s[a][+i] = v; } else s[k] = v;
    save();
  };
  app.onchange = async e => {
    if (e.target.id !== 'restore' || !e.target.files[0]) return;
    try {
      if (!confirm('กู้คืนจะแทนที่ข้อมูลปัจจุบันทั้งหมด ต้องการดำเนินการ?')) return;
      S.importJSON(await e.target.files[0].text()); toast('กู้คืนข้อมูลเรียบร้อย'); route();
    } catch (err) { toast('กู้คืนไม่สำเร็จ: ' + err.message, 5000); }
  };
  app.onclick = e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'backup') download(`สำรองอาหารกลางวัน-${todayISO()}.json`, S.exportJSON(), 'application/json');
    if (act === 'install') promptInstall();
    if (act === 'reset' && confirm('ลบข้อมูลทั้งหมดในเครื่องนี้? (กู้คืนไม่ได้ ควรสำรองข้อมูลก่อน)') && confirm('ยืนยันอีกครั้ง: ลบทั้งหมดจริง ๆ?')) {
      localStorage.removeItem('lunch.v1'); location.hash = '#/'; location.reload();
    }
  };
}

// ───────────────────────── ติดตั้งเป็นแอพ (PWA) ─────────────────────────
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; syncInstallBtn(); });
addEventListener('appinstalled', () => { deferredInstall = null; syncInstallBtn(); toast('ติดตั้งแอพเรียบร้อย'); });
function syncInstallBtn() { $$('.hide-installed').forEach(b => { b.hidden = !deferredInstall; }); }
async function promptInstall() { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; syncInstallBtn(); }

// ───────────────────────── เราเตอร์ ─────────────────────────
function route() {
  flush();
  document.body.classList.remove('printing-view');
  app.onclick = app.oninput = app.onchange = app.onfocusin = null;
  if (!state.ready) return viewWelcome();
  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const seg = path.split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (seg[0] === 'week' && seg[1]) return viewWeek(seg[1]);
  if (seg[0] === 'print' && seg[1]) { document.body.classList.add('printing-view'); return viewPrint(seg[1], query); }
  if (seg[0] === 'teachers') return viewTeachers();
  if (seg[0] === 'menus') return viewMenus();
  if (seg[0] === 'settings') return viewSettings();
  return viewHome();
}
addEventListener('hashchange', route);
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW', err));
}
