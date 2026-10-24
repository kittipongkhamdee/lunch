// แม่แบบเอกสารที่พิมพ์ได้ (ทำตามแบบ Word เดิมของโรงเรียน) แต่ละฟังก์ชันคืนค่า HTML ของ 1 หน้ากระดาษ A4
import { esc, thDate, thDateLong, thParts, money, bahtText, clean } from './util.js';
import { dayTotal, weekTotal, extrasTotal, itemAmount, findTeacher } from './store.js';

export const DOCS = [
  { id: 'purchase', title: 'ใบจัดซื้อวัสดุเครื่องบริโภค', scope: 'day', hint: 'รายวัน · 4 ส่วน (ขอซื้อ/อนุมัติ/ใบรับรอง/ตรวจรับ)' },
  { id: 'voucher', title: 'ใบรับรองการจ่ายเงินค่าอาหารกลางวัน', scope: 'day', hint: 'รายวัน · ตารางรายการวัตถุดิบ' },
  { id: 'loan', title: 'บันทึกขออนุมัติเบิกจ่าย (ประธานกรรมการ)', scope: 'week', hint: 'รายสัปดาห์ · ชดเชยเงินยืม' },
  { id: 'finance', title: 'บันทึกขออนุมัติเบิกจ่าย (หัวหน้าการเงิน)', scope: 'week', hint: 'รายสัปดาห์ · รวมค่าแก๊ส/แม่ครัว ถ้ามี' },
  { id: 'control', title: 'บันทึกรายงานผู้ควบคุมและกรรมการตรวจการประกอบอาหาร', scope: 'week', hint: 'รายสัปดาห์' },
  { id: 'receipt', title: 'ใบตรวจรับพัสดุ (ค่าจ้างแม่ครัว)', scope: 'week', hint: 'รายสัปดาห์' },
];

const fill = (x, cls = '') => {
  const t = clean(x);
  return `<span class="fill ${t ? '' : 'empty'} ${cls}">${t ? esc(t) : '&nbsp;'}</span>`;
};
const num = n => `${money(n)} บาท (${bahtText(n)})`;
const sign = (label, name, extra = '') => `
  <div class="sig">
    <div class="sl">ลงชื่อ<span class="dl"></span>${label}</div>
    <div>(${esc(name) || '<span class="dl"></span>'})</div>${extra}
  </div>`;
const teacherOf = d => findTeacher(d.teacherId) || { name: '', position: '' };
const range = w => {
  const f = w.days[0]?.date, l = w.days.at(-1)?.date;
  return f === l ? thDate(f) : `${thDate(f)} – ${thDate(l)}`;
};

function memoHead(s, no, date, subject) {
  return `
  <div class="memo-head"><img src="assets/garuda.png" alt=""><h1>บันทึกข้อความ</h1></div>
  <div class="line"><b>ส่วนราชการ</b> ${esc(s.school)}</div>
  <div class="line"><b>ที่</b> ${fill(no)} <b class="gap">วันที่</b> ${esc(thDate(date))}</div>
  <div class="line subject"><b>เรื่อง</b> ${esc(subject)}</div>
  <div class="dots"></div>`;
}

// ───────── ใบรับรองการจ่ายเงินค่าอาหารกลางวัน (รายวัน) ─────────
function voucher(w, d, s) {
  const t = teacherOf(d);
  const rows = [];
  const dishes = clean(d.menu).split(' ').filter(Boolean);
  const n = Math.max(d.items.length, dishes.length, 14);
  for (let i = 0; i < n; i++) {
    const it = d.items[i];
    rows.push(`<tr>
      <td class="l">${esc(dishes[i] || '')}</td>
      <td class="l">${it ? esc(it.name) : ''}</td>
      <td class="r">${it ? esc(it.qty) : ''}</td>
      <td class="c">${it ? esc(it.unit) : ''}</td>
      <td class="r">${it ? esc(it.price) : ''}</td>
      <td class="r">${it ? money(itemAmount(it)) : ''}</td>
      <td></td></tr>`);
  }
  if (!d.items.length && dayTotal(d)) {
    rows[0] = `<tr><td class="l">${esc(dishes[0] || '')}</td><td class="l" colspan="4">ค่าอาหารกลางวันประจำวัน (ตามหลักฐานที่แนบ)</td><td class="r">${money(dayTotal(d))}</td><td></td></tr>`;
  }
  const p = thParts(d.date);
  return `<section class="sheet voucher">
    <h2>ใบรับรองการจ่ายเงินค่าอาหารกลางวัน</h2>
    <div class="c">${esc(s.school)} ${esc(s.locale)}</div>
    <div class="c">วันที่ ${p.d} เดือน ${p.m} พ.ศ. ${p.y}</div>
    <table class="grid lines">
      <colgroup><col style="width:21%"><col style="width:22%"><col style="width:9%"><col style="width:11%"><col style="width:12%"><col style="width:13%"><col style="width:12%"></colgroup>
      <thead><tr><th>รายการอาหาร</th><th>เครื่องปรุง</th><th>จำนวน</th><th>หน่วย</th><th>ราคา/หน่วย</th><th>จำนวนเงิน</th><th>หมายเหตุ</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
      <tfoot><tr><td class="l"><b>รวมเป็นเงิน</b></td><td class="c" colspan="4">(${esc(bahtText(dayTotal(d)))})</td><td class="r"><b>${money(dayTotal(d))}</b></td><td></td></tr></tfoot>
    </table>
    <p class="indent">ข้าพเจ้า${esc(t.name)} ตำแหน่ง ${esc(t.position)} ${esc(s.school)} ขอรับรองว่ารายจ่ายข้างต้นนี้ไม่อาจเรียกใบเสร็จรับเงินจากผู้ขายได้ และข้าพเจ้าได้จ่ายไปในงานของราชการโดยแท้</p>
    ${sign('ผู้จ่ายเงิน', t.name, `<div>วันที่ ${p.d} เดือน ${p.m} พ.ศ. ${p.y}</div>`)}
  </section>`;
}

// ───────── ใบจัดซื้อวัสดุเครื่องบริโภค (รายวัน) ─────────
function purchase(w, d, s) {
  const t = teacherOf(d), total = dayTotal(d), date = thDate(d.date);
  const names = (arr, roles) => arr.map((n, i) => `<div class="cm"><span>${roles}.${i + 1}&nbsp; ${esc(n) || '………………………………'}</span><span>${i ? 'กรรมการ' : 'ประธานกรรมการ'}</span></div>`).join('');
  const ctrl = names(s.controlCommittee, '2'), insp = names(s.inspectCommittee, '3');
  return `<section class="sheet purchase">
    <table class="frame">
      <tr><td colspan="2" class="c title">ใบจัดซื้อวัสดุเครื่องบริโภค วงเงินไม่เกิน 500,000 บาท<br>${esc(s.school)} ${esc(s.area)}</td></tr>
      <tr><th>ส่วนที่ 1 รายการซื้ออาหาร</th><th>ส่วนที่ 3 ใบรับรองแทนใบเสร็จรับเงิน บค.${esc(d.bk)}/${esc(s.fiscalYear)}</th></tr>
      <tr>
        <td class="indent">ด้วย${esc(s.school)} ขอจัดซื้อวัสดุเครื่องบริโภคตามรายการต่อไปนี้ เพื่อประกอบอาหารให้แก่นักเรียนรับประทาน ในวันที่ ${esc(date)} การจัดซื้อครั้งนี้ดำเนินการโดยวิธีเฉพาะเจาะจง${esc(s.purchaseRef)}</td>
        <td class="indent">ข้าพเจ้า ${esc(t.name)} ตำแหน่ง ${esc(t.position)} ได้จ่ายเงิน จำนวน ${money(total)} บาท (${esc(bahtText(total))}) โดยไม่อาจเรียกใบเสร็จรับเงินจากผู้รับเงินได้ตามรายการต่อไปนี้</td>
      </tr>
      <tr><td colspan="2" class="nopad">
        <table class="grid inner">
          <thead><tr><th>รายการอาหาร</th><th>เครื่องปรุง</th><th>จำนวนหน่วย</th><th>ราคา/หน่วย</th><th>จำนวนเงิน</th><th>หมายเหตุ</th></tr></thead>
          <tbody><tr class="attach"><td colspan="4" class="c">รายละเอียดแนบท้าย<br><small>(ใบรับรองการจ่ายเงินค่าอาหารกลางวัน ประจำวันที่ ${esc(date)})</small></td><td class="r"><b>${money(total)}</b></td><td></td></tr></tbody>
        </table></td></tr>
      <tr>
        <td>รวมเป็น (${esc(bahtText(total))})
          ${sign('ผู้จัดทำรายการ', t.name, `<div>วันที่ ${esc(date)}</div>`)}</td>
        <td>${sign('ผู้จ่ายเงิน', t.name, `<div>วันที่ ${esc(date)}</div>`)}</td>
      </tr>
      <tr><th>ส่วนที่ 2 การอนุมัติการจัดซื้อ</th><th>ส่วนที่ 4 ผลการตรวจรับและอนุมัติการจ่ายเงิน</th></tr>
      <tr>
        <td class="small">เรียน ผู้อำนวยการ${esc(s.school)}<br>เพื่อโปรดทราบและ<br>
          &nbsp;1. เห็นชอบตามรายการขอซื้อ<br>&nbsp;2. แต่งตั้งผู้ควบคุมและคณะกรรมการตรวจการประกอบอาหาร${ctrl}
          &nbsp;3. แต่งตั้งบุคคลทำการตรวจการรับ${insp}
          ${sign('เจ้าหน้าที่พัสดุ', s.parcelName)}
          ${sign('หัวหน้าเจ้าหน้าที่พัสดุ', s.parcelHeadName, `<div>วันที่ ${esc(date)}</div>`)}
          <div class="appr">อนุมัติ ตามเสนอข้อ 1, 2 และ 3</div>
          ${sign('ผู้อำนวยการ' + s.school, s.directorName, `<div>วันที่ ${esc(date)}</div>`)}</td>
        <td class="small">เรียน ผู้อำนวยการ${esc(s.school)}<br><span class="indent">เพื่อโปรดทราบ พัสดุตามรายการข้างต้นได้ทำการตรวจรับไว้เป็นการถูกต้องครบถ้วนแล้ว</span>
          <div class="sig3"><div class="sl">ลงชื่อ<span class="dl s"></span>ประธานกรรมการ</div><div class="sl">ลงชื่อ<span class="dl s"></span>กรรมการ</div><div class="sl">ลงชื่อ<span class="dl s"></span>กรรมการ</div></div>
          ${sign('เจ้าหน้าที่พัสดุ', s.parcelName)}
          <div>ได้ตรวจหลักฐานแล้วถูกต้อง จึงขอเบิกจ่ายเงินประเภทเงินอุดหนุนโครงการอาหารกลางวัน</div>
          ${sign('เจ้าหน้าที่การเงิน', s.financeName, `<div>วันที่ ${esc(date)}</div>`)}
          <div class="appr">ทราบและอนุมัติตามรายการที่ขอเบิกและจ่ายเงินได้</div>
          ${sign('ผู้อำนวยการ' + s.school, s.directorName, `<div>วันที่ ${esc(date)}</div>`)}
          <div class="two"><div>${sign('ผู้รับเงิน', t.name)}</div><div>${sign('ผู้จ่ายเงิน', s.chairName)}</div></div></td>
      </tr>
    </table>
  </section>`;
}

// ───────── บันทึกขออนุมัติเบิกจ่าย (ประธานกรรมการ → ผอ.) ─────────
function loan(w, s) {
  const total = weekTotal(w), n = w.days.length;
  return `<section class="sheet memo">
    ${memoHead(s, w.memoNo, w.memoDate, 'ขออนุมัติเบิกจ่ายเงินโครงการอาหารกลางวัน')}
    <div class="line"><b>เรียน</b> ผู้อำนวยการ${esc(s.school)}</div>
    <p class="indent">ด้วยตามคำสั่ง${esc(s.school)} ที่ ${esc(s.orderNo)} ลงวันที่ ${esc(thDateLong(s.orderDate))} ได้แต่งตั้งให้ข้าพเจ้าและคณะเป็นกรรมการดำเนินการโครงการอาหารกลางวันนั้น ในการดำเนินการข้าพเจ้าได้ยืมเงินของทางโรงเรียนไปใช้ในการทดรองเป็นเงินค่าซื้ออาหารสด / อาหารแห้ง ตามสัญญายืมเงิน เลขที่ ${esc(s.loanNo)} ลงวันที่ ${esc(thDateLong(s.loanDate))} เป็นเงิน ${num(total)}</p>
    <p class="indent">การดำเนินงานโครงการอาหารกลางวัน ตั้งแต่วันที่ ${esc(range(w))} ข้าพเจ้าได้ใช้เงินทดรองจ่ายเป็นค่าซื้ออาหารสด/อาหารแห้ง ไปแล้วเป็นเงิน ${num(total)} ใบสำคัญ จำนวน ${n} ฉบับ ${num(total)}</p>
    <p class="indent">จึงเรียนมาเพื่ออนุมัติเบิกจ่ายเงินจากโรงเรียน เป็นเงิน ${num(total)} เพื่อนำไปชดเชยเงินยืมและใช้ในการทดรองจ่ายเป็นเงินค่าซื้ออาหารสด / อาหารแห้ง ตามสัญญายืมเงิน เลขที่ ${esc(s.loanNo)} ลงวันที่ ${esc(thDateLong(s.loanDate))} ในโครงการอาหารกลางวัน ต่อไป</p>
    <p class="indent">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>
    ${sign('ประธานกรรมการ', s.chairName)}
    <div class="line gap-t"><b>เรียน</b> ผู้อำนวยการ${esc(s.school)}</div>
    <p class="indent">ข้าพเจ้าได้ตรวจสอบการจ่ายเงินตามใบสำคัญ จำนวน ${n} ฉบับ ที่แนบมาแล้ว เห็นสมควรอนุมัติให้จ่ายเงิน</p>
    ${sign('เจ้าหน้าที่การเงิน', s.financeName)}
    <p class="gap-t">อนุมัติให้เบิกจ่ายเงิน จำนวนเงิน ${num(total)}</p>
    ${sign('', s.directorName, `<div>${esc(s.directorTitle)}</div><div>${esc(thDate(w.memoDate))}</div>`)}
  </section>`;
}

// ───────── บันทึกขออนุมัติเบิกจ่าย (หัวหน้าการเงิน → ผอ.) ─────────
function finance(w, s) {
  const loanAmt = weekTotal(w), extras = (w.extras || []).filter(e => clean(e.label) || +e.amount);
  const total = loanAmt + extrasTotal(w);
  const lines = [`เบิกเงินอาหารกลางวันตามสัญญาการยืมเงิน ${esc(s.loanNo)} จำนวน ${money(loanAmt)} บาท`,
    ...extras.map(e => `เบิกเงิน${esc(e.label)} จำนวน ${money(e.amount)} บาท`)];
  return `<section class="sheet memo">
    ${memoHead(s, w.memoNo, w.memoDate, 'ขออนุมัติเบิกจ่ายเงินโครงการอาหารกลางวัน')}
    <div class="line"><b>เรียน</b> ผู้อำนวยการ${esc(s.school)}</div>
    <p class="indent">ตามที่โรงเรียนได้รับจัดสรรงบประมาณหมวดเงินโครงการอาหารกลางวัน${esc(s.school)} ประจำปีงบประมาณ ${esc(s.fiscalYear)} ภาคเรียนที่ ${esc(s.term)} จึงขออนุมัติเบิกจ่ายเงินอาหารกลางวัน เป็นจำนวนเงิน ${num(total)} ตามรายละเอียด ดังนี้</p>
    <div class="list">${lines.map((l, i) => `<div>${i + 1}. ${l}</div>`).join('')}</div>
    <p class="indent">จึงเรียนมาเพื่อโปรดทราบและพิจารณาอนุมัติ</p>
    ${sign('หัวหน้าการเงิน', s.financeName, `<div>${esc(s.financePosition)}</div>`)}
    <div class="choices"><div>- ทราบ</div><div>- อนุมัติ</div></div>
    ${sign('', s.directorName, `<div>${esc(s.directorTitle)}</div><div>${esc(thDate(w.memoDate))}</div>`)}
  </section>`;
}

// ───────── บันทึกรายงานผู้ควบคุมและคณะกรรมการตรวจการประกอบอาหารกลางวัน ─────────
function control(w, s) {
  const rows = w.days.map(d => `<tr><td class="c nw">${esc(thDate(d.date))}</td><td class="l">${esc(clean(d.menu))}</td><td></td>
    <td class="l sg">1)....................<br>2)....................<br>3)....................</td></tr>`).join('');
  return `<section class="sheet doc">
    <h2>บันทึกรายงานผู้ควบคุมและคณะกรรมการตรวจการประกอบอาหารกลางวัน</h2>
    <div class="r">เขียนที่ ${esc(s.school)}</div>
    <div class="r">วันที่ ${esc(thDate(w.memoDate))}</div>
    <p class="indent">ตามที่${esc(s.school)} ได้ตกลงจ้าง ${esc(s.cookName)} ประกอบอาหารกลางวันให้นักเรียนรับประทาน ตามบันทึกข้อตกลงจ้าง เลขที่ ${esc(s.agreementNo)} ลงวันที่ ${esc(thDate(s.agreementDate))} บัดนี้ ผู้รับจ้างได้ส่งมอบพัสดุทุกวันตามผู้ควบคุมและคณะกรรมการตรวจการประกอบอาหารกลางวัน ขอรายงานผลการดำเนินงาน ดังนี้</p>
    <table class="grid">
      <colgroup><col style="width:17%"><col style="width:35%"><col style="width:16%"><col style="width:32%"></colgroup>
      <thead><tr><th>วัน เดือน ปี</th><th>รายการอาหารตามขอบเขตงาน TOR</th><th>ผลการดำเนินงาน</th><th>ผู้ตรวจควบคุมและคณะกรรมการตรวจการประกอบอาหาร</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <div class="opinion"><b>ความคิดเห็นของผู้อำนวยการสถานศึกษา</b>
      <div>( &nbsp;) ทราบผลการดำเนินการประกอบอาหารกลางวัน</div></div>
    ${sign('', s.directorName, `<div>${esc(s.directorTitle)}</div>`)}
  </section>`;
}

// ───────── ใบตรวจรับพัสดุ (ค่าจ้างแม่ครัว) ─────────
function receipt(w, s) {
  const pay = +w.cookPay || 0;
  const rows = w.days.map(d => `<tr><td class="c nw">${esc(thDate(d.date))}</td><td class="l">${esc(clean(d.menu))}</td>
    <td class="l sg">1)....................<br>2)....................<br>3)....................</td></tr>`).join('');
  return `<section class="sheet doc">
    <h2>ใบตรวจรับพัสดุ</h2>
    <div class="r">เขียนที่ ${esc(s.school)}</div>
    <div class="r">วันที่ ${esc(thDate(w.memoDate))}</div>
    <p class="indent">ตามที่${esc(s.school)} ได้ตกลงจ้าง ${esc(s.cookName)} ประกอบอาหารกลางวัน ให้นักเรียนรับประทาน ตามบันทึกข้อตกลงจ้าง เลขที่ ${esc(s.agreementNo)} ลงวันที่ ${esc(thDate(s.agreementDate))} บัดนี้ ผู้รับจ้างได้ส่งมอบพัสดุทุกวันตามข้อตกลง ( &nbsp;) ผู้ตรวจรับ ( &nbsp;) คณะกรรมการตรวจรับพัสดุ ได้ตรวจรับไว้ถูกต้องตามบันทึกข้อตกลงจ้างแล้ว ดังนี้</p>
    <table class="grid">
      <colgroup><col style="width:20%"><col style="width:44%"><col style="width:36%"></colgroup>
      <thead><tr><th>วัน เดือน ปี</th><th>รายการอาหาร</th><th>ผู้ตรวจรับพัสดุหรือคณะกรรมการตรวจรับพัสดุ</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <p class="gap-t"><b>เรียน</b> ผู้อำนวยการ${esc(s.school)}</p>
    <p class="indent">เพื่อโปรดทราบผลการตรวจรับพัสดุ และขออนุมัติจ่ายเงินให้ผู้รับจ้าง ตั้งแต่ วันที่ ${esc(thDate(w.days[0].date))} ถึง วันที่ ${esc(thDate(w.days.at(-1).date))} เป็นเงิน ${num(pay)}</p>
    ${sign('เจ้าหน้าที่', s.parcelName)}
    ${sign('หัวหน้าเจ้าหน้าที่', s.parcelHeadName)}
    <div class="opinion"><b>ความคิดเห็นของผู้อำนวยการสถานศึกษา</b>
      <div>( &nbsp;) ทราบผลการตรวจรับ</div><div>( &nbsp;) อนุมัติ</div></div>
    ${sign('', s.directorName, `<div>ตำแหน่ง${esc(s.directorTitle)}</div>`)}
  </section>`;
}

/** สร้างหน้าเอกสารตามที่เลือก: ใบรายวันเรียงทีละวัน (ใบจัดซื้อ → ใบรับรอง) แล้วตามด้วยบันทึกรายสัปดาห์ */
export function renderDocs(w, s, ids, dayIdx = null) {
  const pages = [];
  w.days.forEach((d, i) => {
    if (dayIdx && !dayIdx.includes(i)) return;
    if (ids.includes('purchase')) pages.push(purchase(w, d, s));
    if (ids.includes('voucher')) pages.push(voucher(w, d, s));
  });
  if (!dayIdx) {
    if (ids.includes('finance')) pages.push(finance(w, s));
    if (ids.includes('loan')) pages.push(loan(w, s));
    if (ids.includes('control')) pages.push(control(w, s));
    if (ids.includes('receipt')) pages.push(receipt(w, s));
  }
  return pages.join('');
}

/** รายการข้อมูลที่ยังขาด เตือนก่อนพิมพ์ */
export function missingFor(w, s, ids) {
  const out = [];
  const need = (cond, msg) => { if (!cond && !out.includes(msg)) out.push(msg); };
  need(clean(s.school), 'ชื่อโรงเรียน (ตั้งค่า)');
  if (ids.some(i => ['loan', 'finance'].includes(i))) { need(clean(w.memoNo), 'เลขที่บันทึกข้อความของสัปดาห์นี้'); need(clean(s.directorName), 'ชื่อผู้อำนวยการ (ตั้งค่า)'); }
  if (ids.includes('loan')) { need(clean(s.loanNo), 'เลขที่สัญญายืมเงิน (ตั้งค่า)'); need(clean(s.chairName), 'ชื่อประธานกรรมการโครงการ (ตั้งค่า)'); }
  if (ids.some(i => ['voucher', 'purchase'].includes(i))) w.days.forEach(d => {
    if (!d.teacherId) need(false, `ครูผู้จ่ายเงินของวันที่ ${thDate(d.date)}`);
    if (!dayTotal(d)) need(false, `รายการ/ยอดเงินของวันที่ ${thDate(d.date)}`);
  });
  if (ids.some(i => ['control', 'receipt'].includes(i))) need(clean(s.cookName), 'ชื่อแม่ครัว (ตั้งค่า)');
  return out;
}
