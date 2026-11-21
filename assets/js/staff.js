// Teacher / staff information sheet ("শিক্ষক/কর্মচারী তথ্য ছক") — admin only.
// Stored in the private "staffRecords" collection (document id = the teacher's id),
// never in the public "teachers" collection. Scanned documents use private uploads.
import { $, $$, esc, bnNum, fmtDate, toast, modal, icon, downloadFile, toCSV, LOGO_SVG } from "./common.js";
import * as store from "./store.js";

export const STAFF_FIELDS = [
  ["nameEn", "শিক্ষক/কর্মচারীর নাম (ইংরেজি)", "text", { placeholder: "IN CAPITAL LETTERS" }],
  ["nameBn", "শিক্ষক/কর্মচারীর নাম (বাংলা)", "text", {}],
  ["designation", "পদবি", "text", { list: "designations" }],
  ["indexNo", "Index নম্বর", "text", {}],
  ["nid", "জাতীয় পরিচয়পত্র নং (NID)", "text", { inputmode: "numeric", pattern: "[0-9]{10}|[0-9]{13}|[0-9]{17}", title: "১০, ১৩ বা ১৭ অঙ্কের নম্বর (ইংরেজি অঙ্কে)" }],
  ["address", "ঠিকানা", "textarea", { full: true }],
  ["dob", "জন্ম তারিখ", "date", {}],
  ["mobile", "মোবাইল নম্বর (NID দ্বারা রেজিস্ট্রিকৃত)", "tel", { pattern: "01[3-9][0-9]{8}", title: "১১ অঙ্কের মোবাইল নম্বর, যেমন 01XXXXXXXXX", placeholder: "01XXXXXXXXX" }],
  ["email", "ইমেইল এড্রেস", "email", {}],
  ["tin", "TIN নম্বর", "text", { inputmode: "numeric", pattern: "[0-9]{12}", title: "১২ অঙ্কের TIN নম্বর" }],
  ["firstJoin", "চাকুরীতে প্রথম যোগদানের তারিখ", "date", {}],
  ["joinHere", "এই প্রতিষ্ঠানে প্রথম যোগদানের তারিখ", "date", {}],
  ["mpoDate", "এমপিও ভুক্তির তারিখ", "date", {}]
];
export const STAFF_EDU = [["ssc", "এসএসসি বা সমমান", "যেমন: দাখিল"], ["hsc", "এইচএসসি বা সমমান", "যেমন: আলিম"], ["bachelor", "স্নাতক বা সমমান", "যেমন: ফাজিল / বি.এ"], ["masters", "স্নাতকোত্তর বা সমমান", "যেমন: কামিল / এম.এ"]];
export const STAFF_DOCS = [
  ["photo", "ছবি", true], ["nidCopy", "NID"], ["mpo1", "1st MPO"],
  ["resolution", "রেজুলেশন (নিয়োগ/যোগদান/নিয়োগ কমিটি/অব্যাহতি ও নিয়োগ সংক্রান্ত যাবতীয় রেজুলেশন)"],
  ["appointment", "নিয়োগ পত্র + যোগদান পত্র"], ["dg", "ডিজি চিঠি"], ["certificates", "সকল সনদ ও নম্বর পত্র"],
  ["release", "অব্যাহতি পত্র + রেজুলেশন"], ["circular", "বিজ্ঞপ্তি"]
];
const toLatin = s => String(s || "").replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d)).trim();

/** How complete a record is: filled info fields + document groups with at least one file. */
export function staffProgress(rec) {
  if (!rec) return { done: 0, total: STAFF_FIELDS.length + STAFF_DOCS.length };
  const f = STAFF_FIELDS.filter(([k]) => String(rec[k] || "").trim()).length;
  const d = STAFF_DOCS.filter(([k]) => (rec.docs?.[k] || []).length).length;
  return { done: f + d, total: STAFF_FIELDS.length + STAFF_DOCS.length };
}

/**
 * Add / edit a person. With `pub` (from the admin panel) the form has two parts:
 *   1. ওয়েবসাইটে প্রদর্শিত তথ্য — saved to the public "teachers" collection
 *   2. তথ্য ছক — saved to the private "staffRecords" collection (hidden for committee members)
 * Without `pub` only the তথ্য ছক is shown (opened from the progress badge).
 * teacher = null → a new person.
 */
export async function openStaffForm(teacher, S, onSaved, pub = null) {
  const existing = teacher ? await store.get("staffRecords", teacher.id) : null;
  const rec = existing || { nameBn: teacher?.name || "", designation: teacher?.designation || "", mobile: teacher?.phone || "", email: teacher?.email || "", joinHere: teacher?.joinDate || "", edu: {}, docs: {} };
  const docs = JSON.parse(JSON.stringify(rec.docs || {}));
  const removed = [];  // files to delete from storage once the record is saved
  const combined = !!pub;
  // In the combined form the Bangla name and designation come from the public part.
  const privFields = STAFF_FIELDS.filter(([k]) => !(combined && (k === "nameBn" || k === "designation")));

  const field = ([k, label, type, o]) => {
    const v = rec[k] || "";
    const attrs = `name="p_${k}" ${o.pattern ? `pattern="${o.pattern}"` : ""} ${o.title ? `title="${esc(o.title)}"` : ""} ${o.inputmode ? `inputmode="${o.inputmode}"` : ""} ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ""} ${o.list ? `list="${o.list}"` : ""}`;
    const input = type === "textarea" ? `<textarea ${attrs} rows="2">${esc(v)}</textarea>` : `<input type="${type}" ${attrs} value="${esc(v)}">`;
    return `<label class="${o.full ? "full" : ""}">${esc(label)}${input}</label>`;
  };
  const eduRow = ([k, label, ph]) => `<tr><th>${label}</th><td><input name="edu_${k}_degree" value="${esc(rec.edu?.[k]?.degree || "")}" placeholder="${ph}"></td><td><input name="edu_${k}_result" value="${esc(rec.edu?.[k]?.result || "")}" placeholder="যেমন: জিপিএ ৫.০০ / প্রথম বিভাগ"></td></tr>`;
  const docRow = ([k, label, single]) => `<div class="doc-row" data-doc="${k}"><div class="doc-label">${esc(label)}</div><div class="doc-files"></div>
      <label class="btn btn-sm btn-ghost upl">${icon("upload")}${single ? "ছবি দিন" : "ফাইল যোগ করুন"}<input type="file" hidden data-private-file ${single ? 'accept="image/*"' : 'multiple accept="image/*,.pdf"'}></label></div>`;

  const title = combined ? (teacher ? "শিক্ষক / কর্মচারী — সম্পাদনা" : "নতুন শিক্ষক / কর্মচারী / কমিটি সদস্য") : "শিক্ষক/কর্মচারী তথ্য ছক";
  const m = modal(`<h2 class="modal-title">${title}</h2>
    ${combined ? "" : `<p class="muted small">${esc(teacher.name)} · ${esc(teacher.designation || "")}</p>`}
    <form class="staff-form" novalidate>
      ${combined ? `<section class="panel"><h3>ওয়েবসাইটে প্রদর্শিত তথ্য</h3><div class="form-grid admin-form">${pub.html}</div></section>` : ""}
      <div data-private>
        <div class="private-note">${icon("lock")}<div><b>শিক্ষক/কর্মচারী তথ্য ছক</b><br><span>নিচের তথ্য ও ফাইল গোপন থাকবে — শুধু লগইন করা অ্যাডমিন দেখতে পারবেন, ওয়েবসাইটে প্রকাশিত হবে না।</span></div></div>
        <section class="panel"><h3>১. ব্যক্তিগত ও চাকুরি সংক্রান্ত তথ্য</h3><div class="form-grid">${privFields.map(field).join("")}</div></section>
        <section class="panel"><h3>২. শিক্ষাগত যোগ্যতা</h3>
          <div class="table-wrap"><table class="table edu-table"><thead><tr><th>স্তর</th><th>ডিগ্রির নাম</th><th>ফলাফল</th></tr></thead><tbody>${STAFF_EDU.map(eduRow).join("")}
          <tr><th><input name="edu_other_label" value="${esc(rec.edu?.other?.label || "")}" placeholder="অন্যান্য (যেমন: দাওরায়ে হাদিস)"></th><td><input name="edu_other_degree" value="${esc(rec.edu?.other?.degree || "")}"></td><td><input name="edu_other_result" value="${esc(rec.edu?.other?.result || "")}"></td></tr></tbody></table></div></section>
        <section class="panel"><h3>৩. সংযুক্তি (সকল ডকুমেন্টের স্ক্যান কপি)</h3><p class="muted small">PDF বা ছবি দিন। একাধিক পাতা থাকলে একাধিক ফাইল যোগ করা যাবে।</p>
          <div class="doc-list">${STAFF_DOCS.map(docRow).join("")}</div></section>
      </div>
      <div class="form-actions sticky-actions"><button type="button" class="btn btn-ghost" data-print>${icon("printer")}তথ্য ছক প্রিন্ট (A4)</button><span class="spacer"></span><button type="button" class="btn btn-ghost" data-cancel>বাতিল</button><button class="btn btn-primary" type="submit">${icon("check")}সংরক্ষণ করুন</button></div>
    </form>`, { wide: true });
  const form = $("form", m.el);
  if (combined) pub.bind(form);

  // committee members have no service record
  const isCommittee = () => combined && form.elements.category?.value === "committee";
  const syncPrivate = () => { $("[data-private]", form).hidden = isCommittee(); $("[data-print]", form).hidden = isCommittee(); };
  form.elements.category?.addEventListener("change", syncPrivate); syncPrivate();

  const drawDocs = async key => {
    const box = $(`[data-doc="${key}"] .doc-files`, form), list = docs[key] || [];
    if (!list.length) { box.innerHTML = `<span class="muted small">সংযুক্ত নেই</span>`; return; }
    const isPhoto = key === "photo";
    box.innerHTML = list.map((d, i) => `<span class="doc-chip">${isPhoto ? `<img data-src="${esc(d.ref)}" alt="">` : icon("file", "sm")}<button type="button" class="linkish" data-open="${key}:${i}">${esc(d.name || "ফাইল " + bnNum(i + 1))}</button><button type="button" class="icon-btn danger" data-rm="${key}:${i}" title="সরান">${icon("x")}</button></span>`).join("");
    for (const img of $$("img[data-src]", box)) img.src = await store.privateImageSrc(img.dataset.src);
  };
  STAFF_DOCS.forEach(([k]) => drawDocs(k));

  form.addEventListener("change", async e => {
    const inp = e.target; if (!inp.matches("[data-private-file]")) return;
    const key = inp.closest("[data-doc]").dataset.doc, files = [...inp.files]; inp.value = "";
    if (!files.length) return;
    const save = form.querySelector("[type=submit]"); save.disabled = true;
    $(`[data-doc="${key}"] .doc-files`, form).insertAdjacentHTML("beforeend", `<span class="muted small"> আপলোড হচ্ছে…</span>`);
    try {
      for (const f of files) {
        const ref = await store.uploadPrivate(f);
        const item = { ref, name: f.name, size: f.size, at: Date.now() };
        if (key === "photo") { (docs.photo || []).forEach(d => removed.push(d.ref)); docs.photo = [item]; }
        else (docs[key] = docs[key] || []).push(item);
      }
    } catch (err) { toast("আপলোড ব্যর্থ: " + err.message, "err"); }
    save.disabled = false; drawDocs(key);
  });
  form.addEventListener("click", e => {
    const o = e.target.closest("[data-open]"), r = e.target.closest("[data-rm]");
    if (o) { const [k, i] = o.dataset.open.split(":"); store.openPrivate(docs[k][i].ref); }
    if (r && confirm("ফাইলটি সরাবেন?")) { const [k, i] = r.dataset.rm.split(":"); removed.push(docs[k][i].ref); docs[k].splice(i, 1); drawDocs(k); }
  });
  $("[data-cancel]", form).onclick = m.close;
  // NID / TIN / mobile are often typed with Bangla digits: convert them as soon as the field is left.
  const DIGITS = ["nid", "tin", "mobile", "indexNo"];
  DIGITS.forEach(k => form.elements["p_" + k].addEventListener("blur", e => { e.target.value = toLatin(e.target.value); }));

  const collect = id => {
    const d = { teacherId: id };
    STAFF_FIELDS.forEach(([k]) => { d[k] = form.elements["p_" + k] ? String(form.elements["p_" + k].value).trim() : rec[k] || ""; });
    if (combined) { d.nameBn = form.elements.name.value.trim(); d.designation = form.elements.designation.value.trim(); }
    DIGITS.forEach(k => d[k] = toLatin(d[k]));
    d.edu = Object.fromEntries(STAFF_EDU.map(([k]) => [k, { degree: form.elements[`edu_${k}_degree`].value.trim(), result: form.elements[`edu_${k}_result`].value.trim() }]));
    d.edu.other = { label: form.elements.edu_other_label.value.trim(), degree: form.elements.edu_other_degree.value.trim(), result: form.elements.edu_other_result.value.trim() };
    d.docs = docs;
    return d;
  };
  const currentTeacher = () => combined ? { ...(teacher || {}), name: form.elements.name.value.trim(), designation: form.elements.designation.value.trim() } : teacher;
  $("[data-print]", form).onclick = () => printStaffForms([{ teacher: currentTeacher(), rec: collect(teacher?.id || "") }], S);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    DIGITS.forEach(k => { form.elements["p_" + k].value = toLatin(form.elements["p_" + k].value); });
    if (combined && !pub.validate(form)) return;
    // only check the private fields when they are in use
    if (!isCommittee()) {
      const bad = $$("[data-private] input, [data-private] textarea", form).find(i => !i.checkValidity());
      if (bad) { bad.reportValidity(); return; }
    }
    const b = form.querySelector("[type=submit]"); b.disabled = true;
    try {
      let id = teacher?.id;
      if (combined) {
        const data = pub.read(form);
        if (teacher) await store.update("teachers", teacher.id, { ...data, updatedAt: Date.now() });
        else id = await store.add("teachers", { createdAt: Date.now(), ...data, createdBy: pub.user });
      }
      if (!isCommittee()) {
        await store.set("staffRecords", id, { ...collect(id), createdAt: existing?.createdAt || Date.now(), updatedAt: Date.now() });
        for (const ref of removed) await store.removePrivate(ref);
      }
      toast("সংরক্ষিত হয়েছে"); m.close(); onSaved?.();
    } catch (err) { console.error(err); toast("সংরক্ষণ ব্যর্থ: " + err.message, "err"); b.disabled = false; }
  });
}

/** Print one or more filled sheets, one A4 page each. items = [{teacher, rec}] */
export async function printStaffForms(items, S) {
  const w = window.open("", "_blank");
  if (!w) { toast("প্রিন্ট পাতা খুলতে পপ-আপ চালু করুন", "err"); return; }
  const abs = u => !u || /^(data:|https?:|blob:)/.test(u) ? u : new URL(u, location.href).href;
  const photos = await Promise.all(items.map(({ rec }) => store.privateImageSrc(rec?.docs?.photo?.[0]?.ref || "").then(abs).catch(() => "")));
  const d = v => v ? fmtDate(v) : "";
  const page = ({ teacher, rec = {} }, i) => {
    const rows = STAFF_FIELDS.map(([k, label, type]) => `<tr><th>${label}</th><td>${esc(type === "date" ? d(rec[k]) : rec[k] || "")}</td></tr>`).join("");
    const e = rec.edu || {}, cell = k => `${esc(e[k]?.degree || "")}`, res = k => `${esc(e[k]?.result || "")}`;
    const docs = STAFF_DOCS.map(([k, label]) => { const n = (rec.docs?.[k] || []).length; return `<li><span class="box ${n ? "on" : ""}">${n ? '<svg viewBox="0 0 24 24" width="3mm" height="3mm"><path d="M5 12l5 5L20 7" fill="none" stroke="#fff" stroke-width="3.5"/></svg>' : ""}</span>${esc(label)}${n > 1 ? ` <small>(${bnNum(n)}টি ফাইল)</small>` : ""}</li>`; }).join("");
    return `<section class="page"><div class="sheet">
      <header><div class="logo">${LOGO_SVG}</div><div class="org"><h1>${esc(S.nameBn)}</h1><p>${esc(S.nameEn)}</p>${S.address || S.eiin ? `<p class="addr">${esc(S.address || "")}${S.address && S.eiin ? " · " : ""}${S.eiin ? "EIIN: " + esc(S.eiin) : ""}</p>` : ""}</div>
        <div class="photo">${photos[i] ? `<img src="${esc(photos[i])}" alt="">` : "ছবি"}</div></header>
      <h2 class="title">শিক্ষক/কর্মচারী তথ্য ছক</h2>
      <table class="info">${rows}</table>
      <h3>শিক্ষাগত যোগ্যতা</h3>
      <table class="edu"><tr><th>ডিগ্রির নাম</th><th>ফলাফল</th><th>ডিগ্রির নাম</th><th>ফলাফল</th></tr>
        <tr><td><b>এসএসসি বা সমমান</b> ${cell("ssc")}</td><td>${res("ssc")}</td><td><b>স্নাতক বা সমমান</b> ${cell("bachelor")}</td><td>${res("bachelor")}</td></tr>
        <tr><td><b>এইচএসসি বা সমমান</b> ${cell("hsc")}</td><td>${res("hsc")}</td><td><b>স্নাতকোত্তর বা সমমান</b> ${cell("masters")}</td><td>${res("masters")}</td></tr>
        <tr><td>${e.other?.label ? `<b>${esc(e.other.label)}</b> ` : ""}${esc(e.other?.degree || "")}</td><td>${esc(e.other?.result || "")}</td><td></td><td></td></tr></table>
      <h3>সংযুক্তি (সকল ডকুমেন্টের স্ক্যান কপি)</h3><ul class="docs">${docs}</ul>
      <div class="sign"><span>শিক্ষক/কর্মচারীর স্বাক্ষর ও তারিখ</span><span>অধ্যক্ষের স্বাক্ষর ও সিল</span></div>
      <footer>মুদ্রণের তারিখ: ${fmtDate(Date.now())}${rec.updatedAt ? " · সর্বশেষ হালনাগাদ: " + fmtDate(rec.updatedAt) : ""}</footer>
    </div></section>`;
  };
  const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>শিক্ষক/কর্মচারী তথ্য ছক</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Serif+Bengali:wght@400;600;700&display=swap">
<style>
@page{size:A4 portrait;margin:0}
html,body{margin:0}body{background:#e7ebe8;font-family:"Noto Sans","SutonnyOMJ","Noto Serif Bengali",sans-serif;color:#15211b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bar{position:sticky;top:0;display:flex;gap:10px;justify-content:center;padding:10px;background:#162c55}
.bar button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:8px 18px;cursor:pointer;background:#c79a2b;color:#0e1d3a}.bar button.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)}
.pages{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0}
.page{width:210mm;height:297mm;padding:12mm 14mm;box-sizing:border-box;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.18);overflow:hidden;zoom:var(--z,1)}
.sheet{height:100%;display:flex;flex-direction:column;font-size:10.5pt}
header{display:grid;grid-template-columns:20mm 1fr 28mm;gap:4mm;align-items:center;border-bottom:.6mm double #1e3a6e;padding-bottom:3mm}
.logo svg{width:18mm;height:18mm;display:block}
.org{text-align:center}.org h1{margin:0;font-size:1.65em;color:#162c55}.org p{margin:.1em 0 0;font-size:.8em;color:#5b6861;letter-spacing:.06em}.org .addr{letter-spacing:0}
.photo{width:28mm;height:34mm;border:.3mm solid #8a958f;display:grid;place-items:center;font-size:.8em;color:#8a958f;overflow:hidden}.photo img{width:100%;height:100%;object-fit:cover}
.title{margin:4mm auto 4mm;padding:1.2mm 8mm;background:#1e3a6e;color:#fff;font-size:1.15em;border-radius:1mm}
h3{margin:4mm 0 1.5mm;font-size:1em;color:#162c55}
table{width:100%;border-collapse:collapse}
.info th,.info td,.edu th,.edu td{border:.25mm solid #9aa5a0;padding:1.4mm 2.5mm;text-align:left;vertical-align:top}
.info th{width:42%;background:#f3f6f4;font-weight:600}
.edu th{background:#f3f6f4;font-weight:600}.edu td{height:7mm}.edu td b{font-weight:600;display:block;font-size:.85em;color:#5b6861}
.docs{margin:0;padding:0;list-style:none;columns:2;column-gap:8mm;font-size:.92em}
.docs li{break-inside:avoid;display:flex;gap:2mm;align-items:flex-start;margin-bottom:1.2mm}
.box{flex:none;width:3.6mm;height:3.6mm;border:.3mm solid #5b6861;display:grid;place-items:center;font-size:3mm;line-height:1;margin-top:.8mm}.box.on{background:#1e3a6e;border-color:#1e3a6e;color:#fff}
.sign{margin-top:auto;display:flex;justify-content:space-between;gap:20mm;padding-top:14mm}
.sign span{flex:1;border-top:.3mm solid #15211b;padding-top:1.5mm;text-align:center;font-size:.9em}
footer{margin-top:4mm;font-size:.72em;color:#5b6861;border-top:.2mm dashed #c8d0cb;padding-top:1.5mm}
@media print{body{background:#fff}.bar{display:none}.pages{display:block;padding:0}.page{zoom:1;box-shadow:none;break-after:page}.page:last-child{break-after:auto}}
</style></head><body>
<div class="bar"><button onclick="print()">প্রিন্ট / PDF সংরক্ষণ</button><button class="ghost" onclick="close()">বন্ধ করুন</button></div>
<main class="pages">${items.map(page).join("")}</main>
<script>
function fit(){document.querySelectorAll('.sheet').forEach(function(s){var z=10.5;s.style.fontSize=z+'pt';while(s.scrollHeight>s.clientHeight+1&&z>7){z-=.25;s.style.fontSize=z+'pt';}});}
function prev(){document.documentElement.style.setProperty('--z',Math.min(1,(document.documentElement.clientWidth-16)/(210*96/25.4)));}
addEventListener('resize',prev);addEventListener('beforeprint',fit);
Promise.all([document.fonts.ready].concat([].map.call(document.images,function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r;});}))).then(function(){prev();fit();setTimeout(function(){print();},300);});
<\/script></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  w.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** CSV of all records (for MPO/office use). */
export function exportStaffCSV(teachers, records) {
  const byId = Object.fromEntries(records.map(r => [r.teacherId || r.id, r]));
  const rows = teachers.filter(t => (t.category || "teacher") !== "committee").map(t => ({ t, r: byId[t.id] || {} }));
  const cols = [["ক্রম", (_, i) => i], ...STAFF_FIELDS.map(([k, label]) => [label, x => x.r[k] || (k === "nameBn" ? x.t.name : k === "designation" ? x.t.designation : "")]),
    ...STAFF_EDU.flatMap(([k, label]) => [[label + " — ডিগ্রি", x => x.r.edu?.[k]?.degree || ""], [label + " — ফলাফল", x => x.r.edu?.[k]?.result || ""]]),
    ["অন্যান্য ডিগ্রি", x => [x.r.edu?.other?.label, x.r.edu?.other?.degree, x.r.edu?.other?.result].filter(Boolean).join(" — ")],
    ...STAFF_DOCS.map(([k, label]) => [label, x => (x.r.docs?.[k] || []).length ? "সংযুক্ত" : ""])];
  const numbered = rows.map((x, i) => ({ ...x, i: i + 1 }));
  downloadFile(`staff-information-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(numbered, cols.map(([h, f]) => [h, x => f(x, x.i)])), "text/csv");
}
