// Admin portal
import { $, $$, esc, safeUrl, bnNum, fmtDate, CLASSES, GROUPS, EXAMS, NOTICE_CATS, DEFAULT_SUBJECTS, subjectsFor, computeResult, toast, modal, avatar, downloadFile, toCSV, parseCSV, LOGO_SVG, icon, hydrateIcons } from "./common.js";
import * as store from "./store.js";
import { DEFAULT_SETTINGS, DEMO_DEFAULT_PASSWORD } from "./config.js";

let S = null, USER = null;
const view = () => $("#view");
const CLASS_NAMES = CLASSES.map(c => c.name);
const YEARS = (() => { const y = new Date().getFullYear() + 1; return Array.from({ length: 10 }, (_, i) => String(y - i)); })();
const confirmDel = (what = "এই রেকর্ড") => confirm(`${what} স্থায়ীভাবে মুছে ফেলতে চান?`);
const yesNo = v => v ? `<span class="badge ok">প্রকাশিত</span>` : `<span class="badge warn">খসড়া</span>`;
const STATUS = { Pending: ["অপেক্ষমাণ", "warn"], Approved: ["অনুমোদিত", "ok"], Admitted: ["ভর্তি সম্পন্ন", "ok"], Rejected: ["বাতিল", "no"] };
const statusBadge = s => { const x = STATUS[s] || [s, "warn"]; return `<span class="badge ${x[1]}">${x[0]}</span>`; };

// ===================================================================== Auth
const MODE_LABEL = { api: "লাইভ (নিজস্ব সার্ভার)", firebase: "লাইভ (Firebase)", demo: "ডেমো মোড" };
(async function boot() {
  hydrateIcons();
  await store.ready;
  const lf = $("#loginForm"), userInput = lf.elements.user;
  $("#modeNote").innerHTML = {
    demo: `<b>ডেমো মোড:</b> সার্ভার সংযুক্ত নয়, তাই তথ্য শুধু এই ব্রাউজারে থাকবে। পাসওয়ার্ড <code>${DEMO_DEFAULT_PASSWORD}</code> — লগইনের পর সেটিংস থেকে পরিবর্তন করুন।`,
    api: `নিজস্ব সার্ভারে সংযুক্ত। আপনার অ্যাডমিন ইউজারনেম ও পাসওয়ার্ড দিন।`,
    firebase: `Firebase Authentication-এ তৈরি করা অ্যাডমিন ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।`
  }[store.MODE];
  if (store.MODE === "demo") $("#userWrap").hidden = true;
  else {
    userInput.required = true;
    if (store.MODE === "firebase") { $("#userLabel").textContent = "ইমেইল"; userInput.type = "email"; $("#resetBtn").hidden = false; }
  }
  lf.addEventListener("submit", async e => {
    e.preventDefault(); const b = lf.querySelector("[type=submit]");
    b.disabled = true; $("#loginMsg").textContent = "";
    try { await store.login(userInput.value.trim(), lf.password.value); if (store.MODE !== "firebase") location.reload(); }
    catch (err) { $("#loginMsg").textContent = "লগইন ব্যর্থ: " + (err.code === "auth/invalid-credential" ? "ইমেইল বা পাসওয়ার্ড ভুল" : err.message); }
    b.disabled = false;
  });
  $("#resetBtn").addEventListener("click", async () => {
    const email = userInput.value.trim(); if (!email) { $("#loginMsg").textContent = "প্রথমে ইমেইল লিখুন"; return; }
    try { await store.sendReset(email); $("#loginMsg").textContent = "পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে।"; } catch (err) { $("#loginMsg").textContent = err.message; }
  });
  $("#setupForm").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.currentTarget, b = f.querySelector("[type=submit]");
    if (f.password.value !== f.password2.value) { $("#setupMsg").textContent = "দুটি পাসওয়ার্ড মেলেনি"; return; }
    b.disabled = true; $("#setupMsg").textContent = "";
    try { await store.setupAdmin(f.username.value.trim(), f.password.value, f.name.value.trim()); location.reload(); }
    catch (err) { $("#setupMsg").textContent = err.message; b.disabled = false; }
  });
  $("#logoutBtn").addEventListener("click", () => store.logout());
  $("#sideToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  try {
    await store.onAuth(onUser);
  } catch (err) {
    console.error(err);
    $("#loginView").hidden = false;
    $("#loginMsg").textContent = "সার্ভারের সাথে সংযোগ করা যায়নি: " + err.message;
  }
})();

async function onUser(user, info = {}) {
    if (!user && info.needsSetup) { $("#setupView").hidden = false; $("#loginView").hidden = true; $("#appView").hidden = true; return; }
    if (!user) { $("#loginView").hidden = false; $("#appView").hidden = true; return; }
    if (!user.isAdmin) {
      $("#loginView").hidden = false; $("#appView").hidden = true;
      $("#loginMsg").innerHTML = `এই অ্যাকাউন্টটি অ্যাডমিন হিসেবে অনুমোদিত নয়।<br><small>Firestore-এ <code>users/${esc(user.uid)}</code> ডকুমেন্টে <code>role: "admin"</code> যোগ করুন, তারপর আবার লগইন করুন।</small>`;
      await store.logout(); return;
    }
    USER = user; S = await store.getSettings(true);
    $("#loginView").hidden = true; $("#setupView").hidden = true; $("#appView").hidden = false;
    $("#userEmail").textContent = user.name || user.email;
    $("#modePill").textContent = MODE_LABEL[store.MODE];
    $("#modePill").className = "mode-pill " + (store.MODE === "demo" ? "demo" : "firebase");
    buildNav(); route();
}

// ===================================================================== Navigation
const SECTIONS = [
  ["dashboard", "grid", "ড্যাশবোর্ড"],
  ["notices", "bell", "নোটিশ"],
  ["results", "chart", "ফলাফল"],
  ["admissions", "inbox", "ভর্তি আবেদন"],
  ["students", "cap", "শিক্ষার্থী"],
  ["teachers", "users", "শিক্ষক ও কমিটি"],
  ["events", "calendar", "অনুষ্ঠান / ক্যালেন্ডার"],
  ["routines", "clock", "রুটিন"],
  ["gallery", "image", "গ্যালারি"],
  ["downloads", "download", "ডাউনলোড"],
  ["messages", "mail", "বার্তা"],
  ["settings", "settings", "সেটিংস"],
  ["backup", "database", "ব্যাকআপ"]
];
function buildNav() {
  $("#sideNav").innerHTML = SECTIONS.map(([k, i, t]) => `<a href="#${k}" data-k="${k}">${icon(i)}<span>${t}</span><em data-badge="${k}"></em></a>`).join("");
  window.addEventListener("hashchange", route);
  refreshBadges();
}
async function refreshBadges() {
  try {
    const [a, m] = await Promise.all([store.list("admissions", { where: { status: "Pending" } }), store.list("messages", { where: { status: "New" } })]);
    const set = (k, n) => { const e = $(`[data-badge="${k}"]`); if (e) e.textContent = n ? bnNum(n) : ""; };
    set("admissions", a.length); set("messages", m.length);
  } catch (e) { console.warn(e); }
}
async function route() {
  const k = (location.hash.slice(1) || "dashboard").split("?")[0];
  const sec = SECTIONS.find(s => s[0] === k) || SECTIONS[0];
  $$("#sideNav a").forEach(a => a.classList.toggle("active", a.dataset.k === sec[0]));
  $("#viewTitle").textContent = sec[2];
  $("#sidebar").classList.remove("open");
  view().innerHTML = `<div class="loading">লোড হচ্ছে…</div>`;
  try { await (VIEWS[sec[0]] || VIEWS.dashboard)(); }
  catch (e) { console.error(e); view().innerHTML = `<div class="empty">লোড করা যায়নি: ${esc(e.message)}<br><small>Firebase rules ও ইন্টারনেট সংযোগ যাচাই করুন।</small></div>`; }
}

// ===================================================================== Generic form helpers
function fieldHtml(f, rec) {
  const has = rec && rec[f.name] !== undefined;
  const val = has ? rec[f.name] : (typeof f.default === "function" ? f.default() : f.default ?? "");
  const req = f.required ? "required" : "";
  const lab = esc(f.label) + (f.required ? " *" : "");
  const cls = f.full ? "full" : "";
  const help = f.help ? `<small class="help">${f.help}</small>` : "";
  switch (f.type) {
    case "textarea": return `<label class="${cls}">${lab}<textarea name="${f.name}" rows="${f.rows || 4}" ${req}>${esc(val)}</textarea>${help}</label>`;
    case "select": {
      const opts = typeof f.options === "function" ? f.options() : f.options;
      return `<label class="${cls}">${lab}<select name="${f.name}" ${req}>${opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? "selected" : ""}>${esc(ol)}</option>`; }).join("")}</select>${help}</label>`;
    }
    case "checkbox": return `<label class="check ${cls}"><input type="checkbox" name="${f.name}" ${val === true || val === "true" ? "checked" : ""}> ${esc(f.label)}</label>`;
    case "file": {
      const u = safeUrl(val), isImg = f.accept === "image/*";
      return `<div class="file-field ${cls}"><span class="flabel">${lab}</span><input type="hidden" name="${f.name}" value="${esc(val)}">
        <div class="file-row"><input type="text" inputmode="url" autocapitalize="none" spellcheck="false" data-urlfor="${f.name}" placeholder="লিংক (https://…) দিন অথবা ফাইল বাছাই করুন" value="${u && !u.startsWith("data:") ? esc(u) : ""}"><label class="btn btn-sm btn-ghost upl">${icon("upload")}আপলোড<input type="file" data-upload="${f.name}" accept="${f.accept || "*/*"}" hidden></label></div>
        <div class="file-prev" data-prev="${f.name}">${u ? (isImg ? `<img src="${esc(u)}" alt="">` : `<span>${icon("check", "sm")}ফাইল সংযুক্ত</span>`) + ` <button type="button" class="linkish" data-clear="${f.name}">সরান</button>` : ""}</div>${help}</div>`;
    }
    default: return `<label class="${cls}">${lab}<input type="${f.type || "text"}" name="${f.name}" value="${esc(val)}" ${req} ${f.attrs || ""}>${help}</label>`;
  }
}
function bindFileFields(form, folder) {
  form.addEventListener("input", e => {
    const n = e.target.dataset.urlfor; if (!n) return;
    form.elements[n].value = e.target.value.trim();
    $(`[data-prev="${n}"]`, form).innerHTML = "";
  });
  form.addEventListener("click", e => {
    const n = e.target.dataset.clear; if (!n) return;
    form.elements[n].value = ""; $(`[data-urlfor="${n}"]`, form).value = ""; $(`[data-prev="${n}"]`, form).innerHTML = "";
  });
  form.addEventListener("change", async e => {
    const n = e.target.dataset.upload; if (!n) return;
    const file = e.target.files[0]; if (!file) return;
    const prev = $(`[data-prev="${n}"]`, form), save = form.querySelector("[type=submit]");
    prev.innerHTML = `<span class="muted">আপলোড হচ্ছে…</span>`; if (save) save.disabled = true;
    try {
      const url = await store.upload(file, folder);
      form.elements[n].value = url; $(`[data-urlfor="${n}"]`, form).value = url.startsWith("data:") ? "" : url;
      prev.innerHTML = (file.type.startsWith("image/") ? `<img src="${esc(url)}" alt="">` : `<span>${icon("check", "sm")}${esc(file.name)}</span>`) + ` <button type="button" class="linkish" data-clear="${n}">সরান</button>`;
    } catch (err) { prev.innerHTML = ""; toast("আপলোড ব্যর্থ: " + err.message, "err"); }
    if (save) save.disabled = false;
  });
}
function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.name]; if (!el) continue;
    if (f.type === "checkbox") out[f.name] = el.checked;
    else if (f.type === "number") out[f.name] = el.value === "" ? "" : Number(el.value);
    else out[f.name] = String(el.value).trim();
  }
  return out;
}

// ===================================================================== Generic CRUD
const RES = {
  notices: {
    title: "নোটিশ", folder: "notices",
    fields: [
      { name: "title", label: "শিরোনাম", required: true, full: true },
      { name: "category", label: "ক্যাটাগরি", type: "select", options: NOTICE_CATS },
      { name: "createdAt", label: "প্রকাশের তারিখ", type: "date", default: () => new Date().toISOString().slice(0, 10) },
      { name: "body", label: "বিস্তারিত", type: "textarea", full: true, rows: 6 },
      { name: "fileUrl", label: "সংযুক্তি (PDF / ছবি)", type: "file", full: true },
      { name: "pinned", label: "উপরে পিন করুন", type: "checkbox" },
      { name: "published", label: "ওয়েবসাইটে প্রকাশ করুন", type: "checkbox", default: true }
    ],
    cols: [["শিরোনাম", x => `${x.pinned ? `<span class="pin" title="পিন করা">${icon("pinned", "sm")}</span>` : ""}<b>${esc(x.title)}</b>`], ["ক্যাটাগরি", x => esc(x.category)], ["তারিখ", x => fmtDate(x.createdAt)], ["অবস্থা", x => yesNo(x.published)]],
    search: x => x.title + " " + x.body, dateField: "createdAt"
  },
  events: {
    title: "অনুষ্ঠান", folder: "events",
    fields: [
      { name: "title", label: "অনুষ্ঠান / কার্যক্রম", required: true, full: true },
      { name: "date", label: "তারিখ", type: "date", required: true },
      { name: "place", label: "স্থান" },
      { name: "published", label: "প্রকাশ করুন", type: "checkbox", default: true }
    ],
    cols: [["অনুষ্ঠান", x => `<b>${esc(x.title)}</b>`], ["তারিখ", x => fmtDate(x.date)], ["স্থান", x => esc(x.place)], ["অবস্থা", x => yesNo(x.published)]],
    sort: (a, b) => (b.date || "").localeCompare(a.date || ""), search: x => x.title
  },
  routines: {
    title: "রুটিন", folder: "routines",
    fields: [
      { name: "title", label: "শিরোনাম", required: true, full: true, attrs: 'placeholder="যেমন: ২০২৭ শিক্ষাবর্ষের ক্লাস রুটিন"' },
      { name: "type", label: "ধরন", type: "select", options: ["ক্লাস রুটিন", "পরীক্ষার সময়সূচি", "সিলেবাস", "অন্যান্য"] },
      { name: "className", label: "শ্রেণি", type: "select", options: [["", "সকল শ্রেণি"], ...CLASS_NAMES] },
      { name: "fileUrl", label: "ফাইল (PDF / ছবি)", type: "file", full: true },
      { name: "details", label: "লিখিত রুটিন (ঐচ্ছিক)", type: "textarea", full: true, rows: 6, help: "ফাইল না থাকলে এখানে রুটিন লিখে দিতে পারেন" },
      { name: "published", label: "প্রকাশ করুন", type: "checkbox", default: true }
    ],
    cols: [["শিরোনাম", x => `<b>${esc(x.title)}</b>`], ["ধরন", x => esc(x.type)], ["শ্রেণি", x => esc(x.className || "সকল")], ["অবস্থা", x => yesNo(x.published)]],
    search: x => x.title
  },
  gallery: {
    title: "ছবি", folder: "gallery",
    fields: [
      { name: "imageUrl", label: "ছবি", type: "file", accept: "image/*", required: true, full: true },
      { name: "title", label: "ক্যাপশন" },
      { name: "album", label: "অ্যালবাম", attrs: 'list="albums" placeholder="যেমন: বার্ষিক ক্রীড়া ২০২৬"' },
      { name: "slider", label: "প্রথম পাতার বড় স্লাইডারে দেখান (চওড়া ছবি দিন, যেমন মাদ্রাসা ভবন)", type: "checkbox", full: true },
      { name: "published", label: "প্রকাশ করুন", type: "checkbox", default: true }
    ],
    cols: [["ছবি", x => safeUrl(x.imageUrl) ? `<img class="thumb" src="${esc(safeUrl(x.imageUrl))}" alt="">` : ""], ["ক্যাপশন", x => esc(x.title)], ["অ্যালবাম", x => esc(x.album)], ["স্লাইডার", x => x.slider ? `<span class="badge ok">হ্যাঁ</span>` : ""], ["অবস্থা", x => yesNo(x.published)]],
    search: x => (x.title || "") + " " + (x.album || "")
  },
  downloads: {
    title: "ফাইল", folder: "downloads",
    fields: [
      { name: "title", label: "শিরোনাম", required: true, full: true },
      { name: "category", label: "ক্যাটাগরি", attrs: 'placeholder="যেমন: ফরম, সিলেবাস, প্রজ্ঞাপন"' },
      { name: "url", label: "ফাইল", type: "file", required: true, full: true },
      { name: "published", label: "প্রকাশ করুন", type: "checkbox", default: true }
    ],
    cols: [["শিরোনাম", x => `<b>${esc(x.title)}</b>`], ["ক্যাটাগরি", x => esc(x.category)], ["তারিখ", x => fmtDate(x.createdAt)], ["অবস্থা", x => yesNo(x.published)]],
    search: x => x.title + " " + (x.category || "")
  },
  teachers: {
    title: "ব্যক্তি", folder: "people",
    fields: [
      { name: "category", label: "ধরন", type: "select", options: [["teacher", "শিক্ষক-শিক্ষিকা"], ["staff", "কর্মচারী"], ["committee", "পরিচালনা কমিটি"]] },
      { name: "name", label: "নাম", required: true },
      { name: "designation", label: "পদবি", required: true, attrs: 'list="designations"' },
      { name: "subject", label: "বিষয় / দায়িত্ব" },
      { name: "qualification", label: "শিক্ষাগত যোগ্যতা" },
      { name: "phone", label: "মোবাইল", type: "tel" },
      { name: "email", label: "ইমেইল", type: "email" },
      { name: "joinDate", label: "যোগদানের তারিখ", type: "date" },
      { name: "order", label: "ক্রম (ছোট সংখ্যা আগে দেখাবে)", type: "number" },
      { name: "photoUrl", label: "ছবি", type: "file", accept: "image/*", full: true },
      { name: "bio", label: "সংক্ষিপ্ত পরিচিতি", type: "textarea", full: true, rows: 3 },
      { name: "published", label: "ওয়েবসাইটে দেখান", type: "checkbox", default: true }
    ],
    cols: [["", x => avatar(x.photoUrl, x.name)], ["নাম", x => `<b>${esc(x.name)}</b><br><small class="muted">${esc(x.subject || "")}</small>`], ["পদবি", x => esc(x.designation)], ["ধরন", x => ({ teacher: "শিক্ষক", staff: "কর্মচারী", committee: "কমিটি" }[x.category] || "শিক্ষক")], ["ক্রম", x => esc(x.order)], ["অবস্থা", x => yesNo(x.published)]],
    filter: { name: "category", label: "ধরন", options: [["", "সব"], ["teacher", "শিক্ষক"], ["staff", "কর্মচারী"], ["committee", "কমিটি"]] },
    sort: (a, b) => (Number(a.order) || 999) - (Number(b.order) || 999), search: x => x.name + " " + x.designation + " " + (x.subject || "")
  },
  students: {
    title: "শিক্ষার্থী", folder: "students",
    fields: [
      { name: "name", label: "নাম (বাংলা)", required: true },
      { name: "nameEn", label: "Name (English)" },
      { name: "className", label: "শ্রেণি", type: "select", options: CLASS_NAMES, required: true },
      { name: "group", label: "বিভাগ", type: "select", options: [["", "প্রযোজ্য নয়"], ...GROUPS] },
      { name: "roll", label: "রোল", required: true, attrs: 'inputmode="numeric"' },
      { name: "session", label: "শিক্ষাবর্ষ", default: () => String(new Date().getFullYear()) },
      { name: "studentId", label: "স্টুডেন্ট আইডি", help: "খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে" },
      { name: "gender", label: "লিঙ্গ", type: "select", options: ["", "ছাত্র", "ছাত্রী"] },
      { name: "dob", label: "জন্ম তারিখ", type: "date" },
      { name: "blood", label: "রক্তের গ্রুপ" },
      { name: "fatherName", label: "পিতার নাম" },
      { name: "motherName", label: "মাতার নাম" },
      { name: "guardianPhone", label: "অভিভাবকের মোবাইল", type: "tel" },
      { name: "status", label: "অবস্থা", type: "select", options: ["অধ্যয়নরত", "ছাড়পত্র নিয়েছে", "উত্তীর্ণ"] },
      { name: "address", label: "ঠিকানা", type: "textarea", rows: 2, full: true },
      { name: "photoUrl", label: "ছবি", type: "file", accept: "image/*", full: true }
    ],
    cols: [["", x => avatar(x.photoUrl, x.name)], ["রোল", x => esc(bnNum(x.roll))], ["নাম", x => `<b>${esc(x.name)}</b><br><small class="muted">${esc(x.studentId || "")}</small>`], ["শ্রেণি", x => esc(x.className) + (x.group ? ` <small>(${esc(x.group)})</small>` : "")], ["অভিভাবক", x => esc(x.fatherName || "") + `<br><small>${esc(x.guardianPhone || "")}</small>`], ["অবস্থা", x => esc(x.status || "অধ্যয়নরত")]],
    filter: { name: "className", label: "শ্রেণি", options: [["", "সকল শ্রেণি"], ...CLASS_NAMES] },
    sort: (a, b) => CLASS_NAMES.indexOf(a.className) - CLASS_NAMES.indexOf(b.className) || (Number(a.roll) || 0) - (Number(b.roll) || 0),
    search: x => [x.name, x.nameEn, x.roll, x.studentId, x.fatherName, x.guardianPhone].join(" "),
    beforeSave: d => { if (!d.studentId) d.studentId = String(d.session || new Date().getFullYear()).slice(-2) + String(CLASS_NAMES.indexOf(d.className) + 6).padStart(2, "0") + String(d.roll).padStart(3, "0"); return d; },
    extra: true
  }
};
const DESIGNATIONS = ["অধ্যক্ষ", "উপাধ্যক্ষ", "প্রভাষক", "সহকারী অধ্যাপক", "সিনিয়র শিক্ষক", "সহকারী শিক্ষক", "সহকারী মৌলভী", "ইবতেদায়ী প্রধান", "কম্পিউটার শিক্ষক", "অফিস সহকারী", "হিসাবরক্ষক", "পরিচ্ছন্নতা কর্মী", "নৈশ প্রহরী", "সভাপতি", "সদস্য", "সদস্য সচিব"];

function crudView(key) {
  const R = RES[key];
  return async function () {
    let all = await store.list(key);
    if (R.sort) all.sort(R.sort);
    view().innerHTML = `
      <div class="toolbar">
        <div class="search">${icon("search")}<input type="search" id="q" placeholder="খুঁজুন…"></div>
        ${R.filter ? `<select id="flt">${R.filter.options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>` : ""}
        <span class="spacer"></span>
        ${R.extra ? `<button class="btn btn-ghost" id="impBtn">${icon("upload")}CSV আমদানি</button><button class="btn btn-ghost" id="expBtn">${icon("download")}CSV রপ্তানি</button><button class="btn btn-ghost" id="idBtn">${icon("idcard")}আইডি কার্ড</button>` : ""}
        <button class="btn btn-primary" id="addBtn">${icon("plus")}নতুন ${R.title}</button>
      </div>
      <p class="muted small" id="count"></p>
      <div class="table-wrap" id="tbl"></div>
      <datalist id="designations">${DESIGNATIONS.map(d => `<option>${d}</option>`).join("")}</datalist>
      <datalist id="albums">${[...new Set(all.map(x => x.album).filter(Boolean))].map(a => `<option>${esc(a)}</option>`).join("")}</datalist>`;
    const filtered = () => {
      const q = $("#q").value.trim().toLowerCase(), fv = $("#flt")?.value || "";
      return all.filter(x => (!fv || (x[R.filter.name] || (R.filter.name === "category" ? "teacher" : "")) === fv) && (!q || String(R.search(x)).toLowerCase().includes(q)));
    };
    const draw = () => {
      const f = filtered();
      $("#count").textContent = `মোট ${bnNum(f.length)}টি`;
      $("#tbl").innerHTML = f.length ? `<table class="table"><thead><tr>${R.cols.map(c => `<th>${c[0]}</th>`).join("")}<th class="act">কার্যক্রম</th></tr></thead><tbody>${f.map(x => `<tr>${R.cols.map(c => `<td>${c[1](x) ?? ""}</td>`).join("")}<td class="act">
        ${"published" in x || R.fields.some(f => f.name === "published") ? `<button class="icon-btn" data-toggle="${esc(x.id)}" title="${x.published ? "অপ্রকাশ" : "প্রকাশ"} করুন">${icon(x.published ? "eyeOff" : "eye")}</button>` : ""}
        <button class="icon-btn" data-edit="${esc(x.id)}" title="সম্পাদনা">${icon("edit")}</button><button class="icon-btn danger" data-del="${esc(x.id)}" title="মুছুন">${icon("trash")}</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">কোনো তথ্য নেই। "+ নতুন ${R.title}" বাটনে ক্লিক করে যোগ করুন।</div>`;
    };
    $("#q").addEventListener("input", draw); $("#flt")?.addEventListener("change", draw); draw();
    const reload = async () => { all = await store.list(key); if (R.sort) all.sort(R.sort); draw(); };
    $("#addBtn").onclick = () => editRecord(key, null, reload);
    $("#tbl").addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.edit) editRecord(key, all.find(x => x.id === b.dataset.edit), reload);
      if (b.dataset.del && confirmDel()) { await store.remove(key, b.dataset.del); toast("মুছে ফেলা হয়েছে"); reload(); }
      if (b.dataset.toggle) { const x = all.find(r => r.id === b.dataset.toggle); await store.update(key, x.id, { published: !x.published }); toast(x.published ? "অপ্রকাশিত করা হয়েছে" : "প্রকাশিত হয়েছে"); reload(); }
    });
    if (key === "students") {
      $("#expBtn").onclick = () => { downloadFile(`students-${Date.now()}.csv`, toCSV(filtered(), STUDENT_CSV.map(k => [k, x => x[k]])), "text/csv"); };
      $("#impBtn").onclick = () => importStudents(reload);
      $("#idBtn").onclick = () => { const f = filtered(); if (!f.length) return toast("কোনো শিক্ষার্থী নেই", "err"); printIdCards(f); };
    }
  };
}

function editRecord(key, rec, done) {
  const R = RES[key];
  const recForForm = rec && R.fields.some(f => f.name === "createdAt") ? { ...rec, createdAt: new Date(rec.createdAt || Date.now()).toISOString().slice(0, 10) } : rec;
  const m = modal(`<h2 class="modal-title">${rec ? "সম্পাদনা" : "নতুন " + R.title}</h2>
    <form class="form-grid admin-form">${R.fields.map(f => fieldHtml(f, recForForm)).join("")}
    <div class="full form-actions"><button type="button" class="btn btn-ghost" data-cancel>বাতিল</button><button class="btn btn-primary" type="submit">সংরক্ষণ করুন</button></div></form>`, { wide: true });
  const form = $("form", m.el);
  bindFileFields(form, R.folder);
  $("[data-cancel]", form).onclick = m.close;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    for (const f of R.fields) if (f.required && f.type === "file" && !form.elements[f.name].value) { toast(`${f.label} প্রয়োজন`, "err"); return; }
    if (!form.reportValidity()) return;
    let d = readForm(form, R.fields);
    if ("createdAt" in d) d.createdAt = d.createdAt ? new Date(d.createdAt + "T09:00:00").getTime() : Date.now();
    if (R.beforeSave) d = R.beforeSave(d);
    const b = form.querySelector("[type=submit]"); b.disabled = true;
    try {
      if (rec) await store.update(key, rec.id, { ...d, updatedAt: Date.now() });
      else await store.add(key, { createdAt: Date.now(), ...d, createdBy: USER.email });
      m.close(); toast("সংরক্ষিত হয়েছে"); done?.();
    } catch (err) { console.error(err); toast("সংরক্ষণ ব্যর্থ: " + err.message, "err"); b.disabled = false; }
  });
}

// ===================================================================== Students CSV / ID cards
const STUDENT_CSV = ["roll", "name", "nameEn", "className", "group", "session", "studentId", "gender", "dob", "blood", "fatherName", "motherName", "guardianPhone", "address", "status"];
function importStudents(done) {
  const m = modal(`<h2 class="modal-title">শিক্ষার্থী CSV আমদানি</h2>
    <p>Excel-এ তালিকা তৈরি করে <b>CSV (UTF-8)</b> হিসেবে সেভ করুন। প্রথম সারিতে কলামের নাম থাকবে: <code>${STUDENT_CSV.join(", ")}</code>। <code>name</code>, <code>roll</code> ও <code>className</code> আবশ্যক। className হবে: ${CLASS_NAMES.join(", ")}।</p>
    <p><button class="btn btn-sm btn-ghost" id="tpl">${icon("download")}টেমপ্লেট ডাউনলোড</button></p>
    <input type="file" accept=".csv,text/csv" id="csvFile"><div id="csvPrev"></div>
    <div class="form-actions"><button class="btn btn-primary" id="doImp" disabled>আমদানি করুন</button></div>`, { wide: true });
  let rows = [];
  $("#tpl", m.el).onclick = () => downloadFile("students-template.csv", toCSV([{ roll: "1", name: "মোঃ উদাহরণ", className: "ষষ্ঠ শ্রেণি", session: new Date().getFullYear(), status: "অধ্যয়নরত" }], STUDENT_CSV.map(k => [k, x => x[k]])), "text/csv");
  $("#csvFile", m.el).onchange = async e => {
    const t = await e.target.files[0].text(), p = parseCSV(t);
    const head = p[0].map(h => h.trim());
    rows = p.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()]))).filter(r => r.name && r.roll && CLASS_NAMES.includes(r.className));
    $("#csvPrev", m.el).innerHTML = `<p>${bnNum(rows.length)}টি সঠিক সারি পাওয়া গেছে (মোট ${bnNum(p.length - 1)})।</p>`;
    $("#doImp", m.el).disabled = !rows.length;
  };
  $("#doImp", m.el).onclick = async () => {
    const items = rows.map(r => { const d = RES.students.beforeSave({ ...Object.fromEntries(STUDENT_CSV.map(k => [k, r[k] || ""])), status: r.status || "অধ্যয়নরত", createdAt: Date.now() }); return { col: "students", id: "st_" + d.studentId.replace(/\W/g, "") + "_" + Math.random().toString(36).slice(2, 6), data: d }; });
    try { await store.batchSet(items); toast(`${bnNum(items.length)} জন শিক্ষার্থী যুক্ত হয়েছে`); m.close(); done(); } catch (err) { toast(err.message, "err"); }
  };
}
function printIdCards(list) {
  const w = window.open("", "_blank"); if (!w) return toast("পপ-আপ চালু করুন", "err");
  w.document.write(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Serif+Bengali:wght@400;600&display=swap"><title>আইডি কার্ড</title><style>
  body{font-family:"Noto Sans","SutonnyOMJ","Noto Serif Bengali",sans-serif;margin:10mm}.grid{display:grid;grid-template-columns:repeat(3,54mm);gap:6mm}
  .c{width:54mm;height:86mm;border:1px solid #0d3b33;border-radius:3mm;overflow:hidden;page-break-inside:avoid;text-align:center;font-size:8.5pt}
  .h{background:#0d3b33;color:#fff;padding:2mm;font-size:8pt;line-height:1.25}.h svg{width:9mm;height:9mm;display:block;margin:0 auto 1mm}
  .p{width:20mm;height:24mm;object-fit:cover;border:1px solid #ccc;margin:2mm auto 1mm;display:grid;place-items:center;color:#999;font-size:7pt}
  b{display:block;font-size:10pt;color:#0d3b33}table{margin:1mm auto;font-size:8pt;text-align:left}td{padding:0 1mm}.f{background:#d4af5a;color:#0d3b33;font-size:7pt;padding:1mm;margin-top:1mm}
  </style></head><body><div class="grid">${list.map(s => `<div class="c"><div class="h">${LOGO_SVG}${esc(S.nameBn)}</div>
  ${safeUrl(s.photoUrl) ? `<img class="p" src="${esc(safeUrl(s.photoUrl))}">` : `<div class="p">ছবি</div>`}<b>${esc(s.name)}</b>
  <table><tr><td>আইডি</td><td>: ${esc(s.studentId)}</td></tr><tr><td>শ্রেণি</td><td>: ${esc(s.className)}</td></tr><tr><td>রোল</td><td>: ${esc(s.roll)}</td></tr><tr><td>শিক্ষাবর্ষ</td><td>: ${esc(s.session)}</td></tr><tr><td>রক্ত</td><td>: ${esc(s.blood || "—")}</td></tr><tr><td>মোবাইল</td><td>: ${esc(s.guardianPhone || "—")}</td></tr></table>
  <div class="f">স্টুডেন্ট আইডি কার্ড</div></div>`).join("")}</div><script>window.onload=()=>document.fonts.ready.then(()=>window.print())<\/script></body></html>`);
  w.document.close();
}

// ===================================================================== Views
const VIEWS = {
  async dashboard() {
    const cols = ["students", "admissions", "notices", "results", "teachers", "messages"];
    const data = Object.fromEntries(await Promise.all(cols.map(async c => [c, await store.list(c)])));
    const pending = data.admissions.filter(a => a.status === "Pending"), newMsg = data.messages.filter(m => m.status === "New");
    view().innerHTML = `
      <div class="stat-cards">
        ${[["cap", "শিক্ষার্থী", data.students.length, "students"], ["inbox", "অপেক্ষমাণ আবেদন", pending.length, "admissions"], ["bell", "নোটিশ", data.notices.length, "notices"], ["chart", "ফলাফল রেকর্ড", data.results.length, "results"], ["users", "শিক্ষক-কর্মচারী", data.teachers.length, "teachers"], ["mail", "নতুন বার্তা", newMsg.length, "messages"]]
        .map(([i, l, n, k]) => `<a class="stat-card" href="#${k}"><span class="stat-ic">${icon(i)}</span><div><b>${bnNum(n)}</b><small>${l}</small></div></a>`).join("")}
      </div>
      <div class="quick-actions"><a class="btn btn-primary" href="#notices">${icon("plus")}নোটিশ</a><a class="btn btn-ghost" href="#results">${icon("plus")}ফলাফল</a><a class="btn btn-ghost" href="#students">শিক্ষার্থী তালিকা</a><a class="btn btn-ghost" href="#settings">সেটিংস</a><a class="btn btn-ghost" href="index.html" target="_blank">ওয়েবসাইট দেখুন ${icon("external", "sm")}</a></div>
      <div class="dash-grid">
        <div class="panel"><h3>সাম্প্রতিক ভর্তি আবেদন</h3>${data.admissions.slice(0, 6).map(a => `<a class="mini-row" href="#admissions"><span>${esc(a.studentNameBn || a.studentName)}<small>${esc(a.className)} · ${fmtDate(a.createdAt)}</small></span>${statusBadge(a.status)}</a>`).join("") || `<p class="muted">কোনো আবেদন নেই</p>`}</div>
        <div class="panel"><h3>সাম্প্রতিক বার্তা</h3>${data.messages.slice(0, 6).map(m => `<a class="mini-row" href="#messages"><span>${esc(m.name)}<small>${esc((m.subject || m.message || "").slice(0, 60))}</small></span>${m.status === "New" ? `<span class="badge warn">নতুন</span>` : ""}</a>`).join("") || `<p class="muted">কোনো বার্তা নেই</p>`}</div>
        <div class="panel"><h3>শ্রেণিভিত্তিক শিক্ষার্থী</h3>${CLASS_NAMES.map(c => { const n = data.students.filter(s => s.className === c).length, mx = Math.max(1, ...CLASS_NAMES.map(k => data.students.filter(s => s.className === k).length)); return `<div class="bar-row"><span>${c}</span><div class="bar"><i style="width:${(n / mx) * 100}%"></i></div><b>${bnNum(n)}</b></div>`; }).join("")}</div>
        <div class="panel"><h3>সর্বশেষ নোটিশ</h3>${data.notices.slice(0, 6).map(n => `<a class="mini-row" href="#notices"><span>${esc(n.title)}<small>${fmtDate(n.createdAt)}</small></span>${yesNo(n.published)}</a>`).join("") || `<p class="muted">কোনো নোটিশ নেই</p>`}</div>
      </div>`;
  },
  notices: crudView("notices"), events: crudView("events"), routines: crudView("routines"), gallery: crudView("gallery"),
  downloads: crudView("downloads"), teachers: crudView("teachers"), students: crudView("students"),

  // ----------------------------------------------------------------- Results
  async results() {
    const st = JSON.parse(sessionStorage.getItem("siam_rf") || "null") || { year: String(new Date().getFullYear()), exam: EXAMS[3], className: CLASS_NAMES[0] };
    view().innerHTML = `
      <div class="toolbar">
        <select id="rYear">${YEARS.map(y => `<option ${y === st.year ? "selected" : ""}>${y}</option>`).join("")}</select>
        <select id="rExam">${EXAMS.map(y => `<option ${y === st.exam ? "selected" : ""}>${y}</option>`).join("")}</select>
        <select id="rClass">${CLASS_NAMES.map(y => `<option ${y === st.className ? "selected" : ""}>${y}</option>`).join("")}</select>
        <span class="spacer"></span>
        <button class="btn btn-primary" id="rAdd">${icon("plus")}নতুন ফলাফল</button>
      </div>
      <div class="toolbar sub">
        <button class="btn btn-sm btn-ghost" id="rImp">${icon("upload")}CSV থেকে আমদানি</button>
        <button class="btn btn-sm btn-ghost" id="rPos">${icon("award")}মেধাস্থান নির্ণয়</button>
        <button class="btn btn-sm btn-ghost" id="rPub">${icon("eye")}সব প্রকাশ</button>
        <button class="btn btn-sm btn-ghost" id="rUnpub">${icon("eyeOff")}সব অপ্রকাশ</button>
        <button class="btn btn-sm btn-ghost" id="rTab">${icon("printer")}টেবুলেশন শিট</button>
        <button class="btn btn-sm btn-ghost" id="rExp">${icon("download")}CSV রপ্তানি</button>
      </div>
      <div id="rSummary" class="r-summary"></div>
      <div class="table-wrap" id="rTbl"></div>`;
    let rows = [];
    const combo = () => ({ year: $("#rYear").value, exam: $("#rExam").value, className: $("#rClass").value });
    const load = async () => {
      const c = combo(); sessionStorage.setItem("siam_rf", JSON.stringify(c));
      $("#rTbl").innerHTML = `<div class="loading">লোড হচ্ছে…</div>`;
      rows = (await store.list("results", { where: { year: Number(c.year), exam: c.exam, className: c.className } }))
        .map(r => ({ ...r, _c: computeResult(r.subjects) })).sort((a, b) => (Number(a.roll) || 0) - (Number(b.roll) || 0));
      const pass = rows.filter(r => r._c.passed).length, ap = rows.filter(r => r._c.grade === "A+").length, pub = rows.filter(r => r.published).length;
      $("#rSummary").innerHTML = rows.length ? `<span>মোট: <b>${bnNum(rows.length)}</b></span><span>উত্তীর্ণ: <b>${bnNum(pass)}</b></span><span>অনুত্তীর্ণ: <b>${bnNum(rows.length - pass)}</b></span><span>পাসের হার: <b>${bnNum(((pass / rows.length) * 100).toFixed(1))}%</b></span><span>A+: <b>${bnNum(ap)}</b></span><span>প্রকাশিত: <b>${bnNum(pub)}</b></span>` : "";
      $("#rTbl").innerHTML = rows.length ? `<table class="table"><thead><tr><th>রোল</th><th>নাম</th><th>মোট নম্বর</th><th>জিপিএ</th><th>গ্রেড</th><th>মেধাস্থান</th><th>অবস্থা</th><th class="act">কার্যক্রম</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(bnNum(r.roll))}</td><td><b>${esc(r.studentName)}</b></td><td>${bnNum(r._c.total)}/${bnNum(r._c.fullTotal)}</td><td>${r._c.gpa.toFixed(2)}</td><td><span class="badge ${r._c.passed ? "ok" : "no"}">${r._c.grade}</span></td><td>${r.position ? bnNum(r.position) : "—"}</td><td>${yesNo(r.published)}</td>
        <td class="act"><button class="icon-btn" data-view="${esc(r.id)}" title="মার্কশিট">${icon("file")}</button><button class="icon-btn" data-toggle="${esc(r.id)}" title="প্রকাশ/অপ্রকাশ">${icon(r.published ? "eyeOff" : "eye")}</button><button class="icon-btn" data-edit="${esc(r.id)}" title="সম্পাদনা">${icon("edit")}</button><button class="icon-btn danger" data-del="${esc(r.id)}" title="মুছুন">${icon("trash")}</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="empty">এই পরীক্ষার কোনো ফলাফল নেই। "+ নতুন ফলাফল" অথবা "CSV থেকে আমদানি" ব্যবহার করুন।</div>`;
    };
    ["#rYear", "#rExam", "#rClass"].forEach(s => $(s).addEventListener("change", load));
    await load();
    $("#rAdd").onclick = () => editResult(null, combo(), load);
    $("#rImp").onclick = () => importResults(combo(), load);
    $("#rTbl").addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      const r = rows.find(x => x.id === (b.dataset.view || b.dataset.edit || b.dataset.del || b.dataset.toggle));
      if (b.dataset.view) { const { marksheet } = await marksheetMod(); modal(marksheet(r, S), { wide: true }); }
      if (b.dataset.edit) editResult(r, combo(), load);
      if (b.dataset.del && confirmDel("এই ফলাফল")) { await store.remove("results", r.id); toast("মুছে ফেলা হয়েছে"); load(); }
      if (b.dataset.toggle) { await store.update("results", r.id, { published: !r.published }); load(); }
    });
    const bulk = async (fn, msg) => {
      if (!rows.length) return toast("কোনো ফলাফল নেই", "err");
      await store.batchSet(rows.map(r => { const { id, _c, ...d } = r; return { col: "results", id, data: fn(d, r) }; }));
      toast(msg); load();
    };
    $("#rPub").onclick = () => bulk(d => ({ ...d, published: true }), "সব ফলাফল প্রকাশিত হয়েছে");
    $("#rUnpub").onclick = () => bulk(d => ({ ...d, published: false }), "সব ফলাফল অপ্রকাশিত করা হয়েছে");
    $("#rPos").onclick = () => {
      const ranked = [...rows].sort((a, b) => (b._c.passed - a._c.passed) || (b._c.gpa - a._c.gpa) || (b._c.total - a._c.total));
      const pos = new Map(ranked.map((r, i) => [r.id, i + 1]));
      bulk((d, r) => ({ ...d, position: pos.get(r.id) }), "মেধাস্থান নির্ণয় করা হয়েছে (জিপিএ, তারপর মোট নম্বর অনুযায়ী)");
    };
    $("#rTab").onclick = () => printTabulation(rows, combo());
    $("#rExp").onclick = () => {
      const subs = [...new Set(rows.flatMap(r => r.subjects.map(s => s.subject)))];
      downloadFile(`result-${combo().className}-${combo().exam}-${combo().year}.csv`, toCSV(rows, [["roll", r => r.roll], ["studentName", r => r.studentName], ["fatherName", r => r.fatherName], ...subs.map(s => [s, r => r.subjects.find(x => x.subject === s)?.marks ?? ""]), ["total", r => r._c.total], ["gpa", r => r._c.gpa.toFixed(2)], ["grade", r => r._c.grade], ["position", r => r.position || ""]]), "text/csv");
    };
  },

  // ----------------------------------------------------------------- Admissions
  async admissions() {
    let all = await store.list("admissions");
    const sessions = [...new Set(all.map(a => a.session).filter(Boolean))].sort().reverse();
    view().innerHTML = `
      <div class="toolbar">
        <div class="search">${icon("search")}<input type="search" id="q" placeholder="নাম, ট্র্যাকিং আইডি বা মোবাইল…"></div>
        <select id="fStatus"><option value="">সকল অবস্থা</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select>
        <select id="fClass"><option value="">সকল শ্রেণি</option>${CLASS_NAMES.map(c => `<option>${c}</option>`).join("")}</select>
        <select id="fSession"><option value="">সকল শিক্ষাবর্ষ</option>${sessions.map(s => `<option>${esc(s)}</option>`).join("")}</select>
        <span class="spacer"></span><button class="btn btn-ghost" id="aExp">${icon("download")}CSV রপ্তানি</button>
      </div><p class="muted small" id="count"></p><div class="table-wrap" id="tbl"></div>`;
    const filtered = () => {
      const q = $("#q").value.trim().toLowerCase(), s = $("#fStatus").value, c = $("#fClass").value, se = $("#fSession").value;
      return all.filter(a => (!s || a.status === s) && (!c || a.className === c) && (!se || a.session === se) && (!q || [a.id, a.studentName, a.studentNameBn, a.guardianPhone, a.fatherName].join(" ").toLowerCase().includes(q)));
    };
    const draw = () => {
      const f = filtered(); $("#count").textContent = `মোট ${bnNum(f.length)}টি আবেদন`;
      $("#tbl").innerHTML = f.length ? `<table class="table"><thead><tr><th></th><th>ট্র্যাকিং আইডি</th><th>শিক্ষার্থী</th><th>শ্রেণি</th><th>মোবাইল</th><th>তারিখ</th><th>অবস্থা</th><th class="act"></th></tr></thead><tbody>${f.map(a => `<tr><td>${avatar(a.photo, a.studentNameBn || a.studentName)}</td><td><code>${esc(a.id)}</code></td><td><b>${esc(a.studentNameBn)}</b><br><small class="muted">${esc(a.studentName)}</small></td><td>${esc(a.className)}${a.group ? `<br><small>${esc(a.group)}</small>` : ""}</td><td><a href="tel:${esc(a.guardianPhone)}">${esc(a.guardianPhone)}</a></td><td>${fmtDate(a.createdAt)}</td><td>${statusBadge(a.status)}</td><td class="act"><button class="btn btn-sm btn-primary" data-open="${esc(a.id)}">দেখুন</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">কোনো আবেদন পাওয়া যায়নি।</div>`;
    };
    ["#q", "#fStatus", "#fClass", "#fSession"].forEach(s => $(s).addEventListener("input", draw)); draw();
    $("#aExp").onclick = () => downloadFile(`admissions-${Date.now()}.csv`, toCSV(filtered(), [["trackingId", a => a.id], ["status", a => a.status], ["session", a => a.session], ["className", a => a.className], ["group", a => a.group], ["studentNameBn", a => a.studentNameBn], ["studentName", a => a.studentName], ["dob", a => a.dob], ["birthReg", a => a.birthReg], ["gender", a => a.gender], ["fatherName", a => a.fatherName], ["motherName", a => a.motherName], ["guardianPhone", a => a.guardianPhone], ["address", a => a.address], ["prevInstitution", a => a.prevInstitution], ["prevResult", a => a.prevResult], ["date", a => new Date(a.createdAt).toISOString().slice(0, 10)]]), "text/csv");
    $("#tbl").addEventListener("click", e => {
      const b = e.target.closest("[data-open]"); if (!b) return;
      const a = all.find(x => x.id === b.dataset.open);
      const row = (k, v) => v ? `<tr><th>${k}</th><td>${esc(v)}</td></tr>` : "";
      const m = modal(`<div class="adm-view"><div>${avatar(a.photo, a.studentNameBn, "avatar xl")}</div><div><h2 class="modal-title">${esc(a.studentNameBn)}</h2><p><code>${esc(a.id)}</code> ${statusBadge(a.status)}</p></div></div>
        <table class="table kv">${row("Student name", a.studentName)}${row("শ্রেণি", a.className + (a.group ? ` (${a.group})` : ""))}${row("শিক্ষাবর্ষ", a.session)}${row("জন্ম তারিখ", a.dob)}${row("জন্ম নিবন্ধন", a.birthReg)}${row("লিঙ্গ", a.gender)}${row("রক্তের গ্রুপ", a.blood)}${row("পিতা", a.fatherName)}${row("মাতা", a.motherName)}${row("মোবাইল", a.guardianPhone)}${row("অভিভাবকের পেশা", a.guardianJob)}${row("বর্তমান ঠিকানা", a.address)}${row("স্থায়ী ঠিকানা", a.permanentAddress)}${row("পূর্ববর্তী প্রতিষ্ঠান", a.prevInstitution)}${row("সর্বশেষ ফলাফল", a.prevResult)}${row("অন্যান্য", a.notes)}${row("আবেদনের তারিখ", fmtDate(a.createdAt))}</table>
        <form class="form-grid adm-form"><label>অবস্থা<select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${a.status === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select></label>
        <label>আবেদনকারীর জন্য মন্তব্য<input name="adminNote" value="${esc(a.adminNote || "")}" placeholder="যেমন: ১০ জানুয়ারি সাক্ষাৎকারে আসুন"></label>
        <div class="full form-actions"><button type="button" class="btn btn-danger" data-del>${icon("trash")}মুছুন</button><span class="spacer"></span><button type="button" class="btn btn-ghost" data-stu>${icon("cap")}শিক্ষার্থী তালিকায় যুক্ত করুন</button><button class="btn btn-primary" type="submit">হালনাগাদ করুন</button></div></form>`, { wide: true });
      const f = $("form", m.el);
      f.addEventListener("submit", async ev => { ev.preventDefault(); await store.update("admissions", a.id, { status: f.status.value, adminNote: f.adminNote.value.trim() }); toast("হালনাগাদ হয়েছে"); m.close(); all = await store.list("admissions"); draw(); refreshBadges(); });
      $("[data-del]", f).onclick = async () => { if (!confirmDel("এই আবেদন")) return; await store.remove("admissions", a.id); m.close(); all = await store.list("admissions"); draw(); refreshBadges(); };
      $("[data-stu]", f).onclick = async () => {
        const roll = prompt("এই শিক্ষার্থীর রোল নম্বর দিন:"); if (!roll) return;
        const d = RES.students.beforeSave({ name: a.studentNameBn, nameEn: a.studentName, className: a.className, group: a.group || "", roll: roll.trim(), session: a.session || String(new Date().getFullYear()), studentId: "", gender: a.gender === "ছাত্রী" ? "ছাত্রী" : a.gender ? "ছাত্র" : "", dob: a.dob, blood: a.blood, fatherName: a.fatherName, motherName: a.motherName, guardianPhone: a.guardianPhone, address: a.address, photoUrl: a.photo || "", status: "অধ্যয়নরত", admissionId: a.id });
        await store.add("students", d); await store.update("admissions", a.id, { status: "Admitted" });
        toast(`শিক্ষার্থী যুক্ত হয়েছে (আইডি: ${d.studentId})`); m.close(); all = await store.list("admissions"); draw(); refreshBadges();
      };
    });
  },

  // ----------------------------------------------------------------- Messages
  async messages() {
    let all = await store.list("messages");
    const draw = () => {
      view().innerHTML = all.length ? `<div class="msg-list">${all.map(m => `<div class="msg ${m.status === "New" ? "new" : ""}"><div class="msg-head"><b>${esc(m.name)}</b><span class="muted">${esc(m.contact)}</span><span class="muted small">${fmtDate(m.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span></div>${m.subject ? `<h4>${esc(m.subject)}</h4>` : ""}<p class="pre">${esc(m.message)}</p><div class="btn-row">${m.status === "New" ? `<button class="btn btn-sm btn-ghost" data-read="${esc(m.id)}">${icon("check")}পড়া হয়েছে</button>` : `<span class="badge ok">পঠিত</span>`}<button class="btn btn-sm btn-ghost" data-del="${esc(m.id)}">${icon("trash")}মুছুন</button></div></div>`).join("")}</div>` : `<div class="empty">কোনো বার্তা নেই।</div>`;
    };
    draw();
    view().addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.read) await store.update("messages", b.dataset.read, { status: "Read" });
      else if (b.dataset.del && confirmDel("এই বার্তা")) await store.remove("messages", b.dataset.del);
      else return;
      all = await store.list("messages"); draw(); refreshBadges();
    });
  },

  // ----------------------------------------------------------------- Settings
  async settings() {
    S = await store.getSettings(true);
    const F = [
      ["প্রতিষ্ঠানের তথ্য", [
        { name: "nameBn", label: "প্রতিষ্ঠানের নাম (বাংলা)", required: true }, { name: "nameEn", label: "প্রতিষ্ঠানের নাম (English)", required: true },
        { name: "slogan", label: "স্লোগান" }, { name: "estd", label: "প্রতিষ্ঠার সাল" }, { name: "eiin", label: "EIIN নম্বর" }, { name: "madrasaCode", label: "মাদ্রাসা কোড" },
        { name: "address", label: "ঠিকানা", full: true }, { name: "phone", label: "ফোন" }, { name: "email", label: "ইমেইল", type: "email" },
        { name: "facebook", label: "Facebook পেজ লিংক", type: "url" }, { name: "youtube", label: "YouTube লিংক", type: "url" },
        { name: "mapEmbed", label: "Google Map embed লিংক", full: true, help: "Google Maps → Share → Embed a map → src=\"…\" অংশের লিংকটি দিন (https://www.google.com/maps/embed?...)" }
      ]],
      ["অধ্যক্ষ ও পরিচিতি", [
        { name: "principalName", label: "অধ্যক্ষের নাম" }, { name: "principalTitle", label: "পদবি" },
        { name: "principalPhoto", label: "অধ্যক্ষের ছবি", type: "file", accept: "image/*", full: true },
        { name: "principalMessage", label: "অধ্যক্ষের বাণী", type: "textarea", full: true, rows: 5 },
        { name: "about", label: "প্রতিষ্ঠান পরিচিতি (সংক্ষেপে)", type: "textarea", full: true, rows: 3 },
        { name: "history", label: "ইতিহাস", type: "textarea", full: true, rows: 5 },
        { name: "mission", label: "লক্ষ্য", type: "textarea", rows: 3 }, { name: "vision", label: "উদ্দেশ্য", type: "textarea", rows: 3 }
      ]],
      ["প্রথম পাতার পরিসংখ্যান ও স্ক্রলিং বার্তা", [
        { name: "statStudents", label: "মোট শিক্ষার্থী (যেমন: ৬৫০+)" }, { name: "statTeachers", label: "মোট শিক্ষক" }, { name: "statPass", label: "পাসের হার (যেমন: ৯৮%)" },
        { name: "noticeTicker", label: "স্ক্রলিং বার্তা (ঐচ্ছিক)", full: true }
      ]],
      ["ভর্তি", [
        { name: "admissionOpen", label: "অনলাইন ভর্তি আবেদন চালু", type: "checkbox" }, { name: "admissionSession", label: "শিক্ষাবর্ষ" },
        { name: "admissionLastDate", label: "আবেদনের শেষ তারিখ", type: "date" },
        { name: "admissionInfo", label: "ভর্তি তথ্য ও প্রয়োজনীয় কাগজপত্র", type: "textarea", full: true, rows: 5 }
      ]]
    ];
    const all = F.flatMap(g => g[1]);
    view().innerHTML = `<form id="setForm" class="settings">
      ${F.map(([t, fs]) => `<section class="panel"><h3>${t}</h3><div class="form-grid">${fs.map(f => fieldHtml(f, S)).join("")}</div></section>`).join("")}
      <section class="panel"><h3>শ্রেণিভিত্তিক বিষয়সমূহ</h3><p class="muted small">প্রতি লাইনে একটি বিষয় লিখুন। ফলাফল এন্ট্রি ও একাডেমিক পাতায় এই তালিকা ব্যবহৃত হবে।</p>
        <div class="form-grid">${CLASS_NAMES.map(c => `<label>${c}<textarea data-subj="${esc(c)}" rows="7">${esc(subjectsFor(S, c).join("\n"))}</textarea></label>`).join("")}</div>
        <button type="button" class="btn btn-sm btn-ghost" id="subjReset">ডিফল্ট বিষয় তালিকা ফিরিয়ে আনুন</button></section>
      <div class="sticky-save"><button class="btn btn-primary btn-lg" type="submit">${icon("check")}সেটিংস সংরক্ষণ করুন</button></div></form>
      ${store.MODE === "firebase"
        ? `<section class="panel"><h3>অ্যাডমিন অ্যাকাউন্ট</h3><p>পাসওয়ার্ড পরিবর্তন বা নতুন অ্যাডমিন যোগ করতে Firebase Console → Authentication ব্যবহার করুন। নতুন অ্যাডমিনের UID দিয়ে Firestore-এ <code>users/{UID}</code> ডকুমেন্টে <code>role: "admin"</code> যোগ করুন।</p></section>`
        : `<section class="panel"><h3>আমার পাসওয়ার্ড পরিবর্তন</h3><form id="pwForm" class="form-grid">
            <label>বর্তমান পাসওয়ার্ড<input type="password" name="current" required autocomplete="current-password"></label>
            <label>নতুন পাসওয়ার্ড<input type="password" name="pw" required minlength="${store.MODE === "api" ? 8 : 6}" autocomplete="new-password"></label>
            <div class="full form-actions"><button class="btn btn-primary">পাসওয়ার্ড পরিবর্তন</button></div></form></section>`}
      ${store.MODE === "api" ? `<section class="panel"><h3>অ্যাডমিন ব্যবহারকারী</h3><p class="muted small">যাঁরা অ্যাডমিন পোর্টালে লগইন করতে পারবেন। প্রত্যেকের আলাদা অ্যাকাউন্ট দিন।</p><div class="table-wrap" id="userTbl"><div class="loading">লোড হচ্ছে…</div></div>
          <h4 style="margin-top:18px">নতুন অ্যাডমিন যোগ করুন</h4><form id="userForm" class="form-grid">
            <label>নাম<input name="name" maxlength="120"></label>
            <label>ইউজারনেম *<input name="username" required pattern="[A-Za-z0-9._@\\-]{3,60}" title="ইংরেজি অক্ষর, সংখ্যা, . _ - @ (৩–৬০ অক্ষর)" autocapitalize="none"></label>
            <label>পাসওয়ার্ড * <small class="help">কমপক্ষে ৮ অক্ষর</small><input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
            <div class="form-actions" style="align-self:end"><button class="btn btn-primary">${icon("plus")}যোগ করুন</button></div></form></section>` : ""}`;
    const form = $("#setForm");
    bindFileFields(form, "settings");
    $("#subjReset").onclick = () => $$("[data-subj]").forEach(t => t.value = DEFAULT_SUBJECTS[t.dataset.subj].join("\n"));
    form.addEventListener("submit", async e => {
      e.preventDefault(); if (!form.reportValidity()) return;
      const d = readForm(form, all);
      d.subjects = Object.fromEntries($$("[data-subj]").map(t => [t.dataset.subj, t.value.split("\n").map(s => s.trim()).filter(Boolean)]));
      try { await store.saveSettings(d); S = await store.getSettings(true); toast("সেটিংস সংরক্ষিত হয়েছে"); } catch (err) { toast(err.message, "err"); }
    });
    $("#pwForm")?.addEventListener("submit", async e => { e.preventDefault(); const f = e.target; try { await store.changePassword(f.current.value, f.pw.value); f.reset(); toast("পাসওয়ার্ড পরিবর্তন হয়েছে"); } catch (err) { toast(err.message, "err"); } });
    if (store.MODE === "api") {
      const drawUsers = async () => {
        const list = await store.users.list();
        $("#userTbl").innerHTML = `<table class="table"><thead><tr><th>নাম</th><th>ইউজারনেম</th><th>যোগ করা হয়েছে</th><th class="act"></th></tr></thead><tbody>${list.map(u => `<tr><td>${esc(u.name || "—")}</td><td><code>${esc(u.username)}</code>${u.username === USER.email ? ` <span class="badge ok">আপনি</span>` : ""}</td><td>${fmtDate(Number(u.created_at))}</td><td class="act">${u.username === USER.email ? "" : `<button class="btn btn-sm btn-ghost" data-reset="${u.id}">পাসওয়ার্ড রিসেট</button> <button class="icon-btn danger" data-udel="${u.id}" title="মুছুন">${icon("trash")}</button>`}</td></tr>`).join("")}</tbody></table>`;
      };
      await drawUsers();
      $("#userTbl").addEventListener("click", async e => {
        const b = e.target.closest("button"); if (!b) return;
        try {
          if (b.dataset.udel && confirmDel("এই অ্যাডমিন অ্যাকাউন্ট")) { await store.users.remove(Number(b.dataset.udel)); toast("মুছে ফেলা হয়েছে"); }
          if (b.dataset.reset) { const pw = prompt("নতুন পাসওয়ার্ড দিন (কমপক্ষে ৮ অক্ষর):"); if (!pw) return; await store.users.resetPassword(Number(b.dataset.reset), pw); toast("পাসওয়ার্ড রিসেট হয়েছে"); }
          await drawUsers();
        } catch (err) { toast(err.message, "err"); }
      });
      $("#userForm").addEventListener("submit", async e => {
        e.preventDefault(); const f = e.target;
        try { await store.users.add(f.username.value.trim(), f.password.value, f.name.value.trim()); f.reset(); toast("অ্যাডমিন যোগ হয়েছে"); await drawUsers(); } catch (err) { toast(err.message, "err"); }
      });
    }
  },

  // ----------------------------------------------------------------- Backup
  async backup() {
    view().innerHTML = `
      <section class="panel"><h3>ব্যাকআপ ডাউনলোড</h3><p>সকল তথ্য (নোটিশ, ফলাফল, শিক্ষার্থী, ভর্তি আবেদন, সেটিংস ইত্যাদি) একটি JSON ফাইলে ডাউনলোড করুন। নিয়মিত ব্যাকআপ রাখুন।</p><button class="btn btn-primary" id="bExp">ব্যাকআপ ডাউনলোড</button></section>
      <section class="panel"><h3>ব্যাকআপ থেকে পুনরুদ্ধার</h3><p>পূর্বে ডাউনলোড করা ব্যাকআপ ফাইল থেকে তথ্য ফিরিয়ে আনুন। একই আইডির তথ্য প্রতিস্থাপিত হবে। ডেমো মোডের তথ্য Firebase-এ স্থানান্তরের জন্যও এটি ব্যবহার করা যায়।</p><input type="file" id="bFile" accept=".json,application/json"> <button class="btn btn-ghost" id="bImp">পুনরুদ্ধার করুন</button></section>
      ${store.MODE === "demo" ? `<section class="panel danger"><h3>ডেমো তথ্য মুছে ফেলুন</h3><p>এই ব্রাউজারে সংরক্ষিত সকল ডেমো তথ্য মুছে নতুন করে শুরু করুন।</p><button class="btn btn-danger" id="bReset">সব মুছে ফেলুন</button></section>` : ""}`;
    $("#bExp").onclick = async () => { const d = await store.exportAll(); downloadFile(`madrasha-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(d, null, 1), "application/json"); };
    $("#bImp").onclick = async () => {
      const f = $("#bFile").files[0]; if (!f) return toast("ফাইল বাছাই করুন", "err");
      if (!confirm("ব্যাকআপ থেকে তথ্য পুনরুদ্ধার করবেন?")) return;
      try { const n = await store.importAll(JSON.parse(await f.text())); toast(`${bnNum(n)}টি রেকর্ড পুনরুদ্ধার হয়েছে`); } catch (err) { toast("ব্যর্থ: " + err.message, "err"); }
    };
    $("#bReset")?.addEventListener("click", () => { if (confirm("সত্যিই সব ডেমো তথ্য মুছে ফেলবেন?")) { store.resetDemo(); localStorage.setItem("siam_db_v1", JSON.stringify({})); toast("মুছে ফেলা হয়েছে"); setTimeout(() => location.reload(), 600); } });
  }
};

// ===================================================================== Results editor
async function marksheetMod() {
  // Re-use the public marksheet renderer without loading the whole site script.
  const { computeResult: cr } = await import("./common.js");
  return {
    marksheet: (r, s) => {
      const c = cr(r.subjects);
      return `<div class="marksheet"><div class="ms-head">${LOGO_SVG}<div><h2>${esc(s.nameBn)}</h2><h3>${esc(r.exam)} — ${bnNum(r.year)}</h3></div></div>
      <dl class="ms-info"><div><dt>নাম</dt><dd>${esc(r.studentName)}</dd></div><div><dt>রোল</dt><dd>${esc(bnNum(r.roll))}</dd></div><div><dt>পিতা</dt><dd>${esc(r.fatherName || "—")}</dd></div><div><dt>শ্রেণি</dt><dd>${esc(r.className)}${r.group ? ` (${esc(r.group)})` : ""}</dd></div></dl>
      <div class="ms-scroll"><table class="table ms-table"><thead><tr><th>বিষয়</th><th class="num">পূর্ণমান</th><th class="num">প্রাপ্ত</th><th class="num">গ্রেড</th><th class="num">পয়েন্ট</th></tr></thead><tbody>${c.rows.map(x => `<tr class="${x.grade === "F" ? "fail" : ""}"><td>${esc(x.subject)}</td><td class="num">${bnNum(x.full)}</td><td class="num">${x.marks === "AB" ? "অনুপস্থিত" : bnNum(x.marks)}</td><td class="num">${x.grade}</td><td class="num">${bnNum(x.gp.toFixed(2))}</td></tr>`).join("")}</tbody></table></div>
      <div class="ms-summary"><div><span>মোট</span><b>${bnNum(c.total)}</b></div><div><span>জিপিএ</span><b>${bnNum(c.gpa.toFixed(2))}</b></div><div><span>গ্রেড</span><b>${c.grade}</b></div>${r.position ? `<div><span>মেধাস্থান</span><b>${bnNum(r.position)}</b></div>` : ""}</div>
      <p class="no-print"><a class="btn btn-ghost" href="results.html?year=${encodeURIComponent(r.year)}&exam=${encodeURIComponent(r.exam)}&className=${encodeURIComponent(r.className)}&roll=${encodeURIComponent(r.roll)}" target="_blank">পাবলিক পাতায় দেখুন ${icon("external", "sm")}</a></p></div>`;
    }
  };
}

function editResult(rec, combo, done) {
  const base = rec || { ...combo, roll: "", studentName: "", fatherName: "", group: "", remarks: "", published: false, subjects: subjectsFor(S, combo.className).map(s => ({ subject: s, full: 100, marks: "" })) };
  const m = modal(`<h2 class="modal-title">${rec ? "ফলাফল সম্পাদনা" : "নতুন ফলাফল"}</h2>
    <form class="res-form">
      <div class="form-grid four">
        <label>সাল<select name="year">${YEARS.map(y => `<option ${String(base.year) === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
        <label>পরীক্ষা<select name="exam">${EXAMS.map(y => `<option ${base.exam === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
        <label>শ্রেণি<select name="className">${CLASS_NAMES.map(y => `<option ${base.className === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
        <label>বিভাগ<select name="group"><option value="">—</option>${GROUPS.map(g => `<option ${base.group === g ? "selected" : ""}>${g}</option>`).join("")}</select></label>
        <label>রোল *<input name="roll" required value="${esc(base.roll)}" inputmode="numeric"></label>
        <label>শিক্ষার্থীর নাম *<input name="studentName" required value="${esc(base.studentName)}"></label>
        <label>পিতার নাম<input name="fatherName" value="${esc(base.fatherName || "")}"></label>
        <label>মন্তব্য<input name="remarks" value="${esc(base.remarks || "")}"></label>
      </div>
      <p class="muted small" id="stuHint">রোল লিখলে শিক্ষার্থী তালিকা থেকে নাম স্বয়ংক্রিয়ভাবে আসবে। অনুপস্থিত হলে নম্বরের ঘরে <b>AB</b> লিখুন।</p>
      <div class="table-wrap"><table class="table subj-table"><thead><tr><th>বিষয়</th><th style="width:110px">পূর্ণমান</th><th style="width:130px">প্রাপ্ত নম্বর</th><th style="width:70px">গ্রেড</th><th style="width:44px"></th></tr></thead><tbody id="subRows"></tbody></table></div>
      <div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" id="addSub">+ বিষয় যোগ</button><button type="button" class="btn btn-sm btn-ghost" id="loadSub">শ্রেণির বিষয় তালিকা লোড</button></div>
      <div class="live-sum" id="liveSum"></div>
      <label class="check"><input type="checkbox" name="published" ${base.published ? "checked" : ""}> ওয়েবসাইটে প্রকাশ করুন</label>
      <div class="form-actions"><button type="button" class="btn btn-ghost" data-cancel>বাতিল</button><button class="btn btn-primary" type="submit">সংরক্ষণ করুন</button></div>
    </form>`, { wide: true });
  const f = $("form", m.el), tb = $("#subRows", f);
  const rowHtml = s => `<tr><td><input data-k="subject" value="${esc(s.subject)}" required></td><td><input data-k="full" type="number" min="1" value="${esc(s.full || 100)}"></td><td><input data-k="marks" value="${esc(s.marks)}" placeholder="০–১০০ / AB"></td><td class="g"></td><td><button type="button" class="icon-btn" data-rm title="সরান">${icon("x")}</button></td></tr>`;
  const setRows = list => { tb.innerHTML = list.map(rowHtml).join(""); calc(); };
  const read = () => $$("tr", tb).map(tr => ({ subject: $('[data-k="subject"]', tr).value.trim(), full: Number($('[data-k="full"]', tr).value) || 100, marks: (v => v === "" ? "" : /^ab$/i.test(v) ? "AB" : Number(v.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d))))($('[data-k="marks"]', tr).value.trim()) })).filter(s => s.subject);
  function calc() {
    const subs = read(), c = computeResult(subs.map(s => ({ ...s, marks: s.marks === "" ? 0 : s.marks })));
    $$("tr", tb).forEach((tr, i) => { const r = c.rows[i]; $(".g", tr).innerHTML = r ? `<span class="badge ${r.grade === "F" ? "no" : "ok"}">${r.grade}</span>` : ""; });
    $("#liveSum", f).innerHTML = `মোট: <b>${bnNum(c.total)}/${bnNum(c.fullTotal)}</b> · জিপিএ: <b>${c.gpa.toFixed(2)}</b> · গ্রেড: <b>${c.grade}</b> · ${c.passed ? "<b class='ok'>উত্তীর্ণ</b>" : "<b class='no'>অনুত্তীর্ণ</b>"}`;
  }
  setRows(base.subjects);
  tb.addEventListener("input", calc);
  tb.addEventListener("click", e => { if (e.target.closest("[data-rm]")) { e.target.closest("tr").remove(); calc(); } });
  $("#addSub", f).onclick = () => { tb.insertAdjacentHTML("beforeend", rowHtml({ subject: "", full: 100, marks: "" })); };
  $("#loadSub", f).onclick = () => { if (!read().some(s => s.marks !== "") || confirm("বর্তমান বিষয় ও নম্বর মুছে যাবে। চালিয়ে যাবেন?")) setRows(subjectsFor(S, f.elements.className.value).map(s => ({ subject: s, full: 100, marks: "" }))); };
  $("[data-cancel]", f).onclick = m.close;
  f.roll.addEventListener("change", async () => {
    if (f.studentName.value) return;
    try {
      const s = (await store.list("students", { where: { className: f.elements.className.value } })).find(x => String(x.roll) === f.roll.value.trim());
      if (s) { f.studentName.value = s.name; f.fatherName.value = s.fatherName || ""; if (s.group) f.group.value = s.group; $("#stuHint", f).textContent = "শিক্ষার্থী তালিকা থেকে তথ্য নেওয়া হয়েছে"; }
    } catch { }
  });
  f.addEventListener("submit", async e => {
    e.preventDefault(); if (!f.reportValidity()) return;
    const subjects = read();
    if (!subjects.length) return toast("কমপক্ষে একটি বিষয় দিন", "err");
    const bad = subjects.find(s => s.marks !== "AB" && s.marks !== "" && (isNaN(s.marks) || s.marks < 0 || s.marks > s.full));
    if (bad) return toast(`"${bad.subject}" বিষয়ের নম্বর সঠিক নয়`, "err");
    const d = { year: Number(f.year.value), exam: f.exam.value, className: f.elements.className.value, group: f.group.value, roll: f.roll.value.trim().replace(/[০-৯]/g, x => "০১২৩৪৫৬৭৮৯".indexOf(x)), studentName: f.studentName.value.trim(), fatherName: f.fatherName.value.trim(), remarks: f.remarks.value.trim(), subjects: subjects.map(s => ({ ...s, marks: s.marks === "" ? "AB" : s.marks })), published: f.published.checked, position: rec?.position || null, createdAt: rec?.createdAt || Date.now(), updatedAt: Date.now() };
    const id = store.resultId(d.year, d.exam, d.className, d.roll);
    try {
      if (!rec || rec.id !== id) { const ex = await store.get("results", id); if (ex && !confirm("এই রোলের ফলাফল আগে থেকেই আছে। প্রতিস্থাপন করবেন?")) return; }
      await store.set("results", id, d);
      if (rec && rec.id !== id) await store.remove("results", rec.id);
      toast("ফলাফল সংরক্ষিত হয়েছে");
      if (!rec && confirm("সংরক্ষিত হয়েছে। একই পরীক্ষার পরবর্তী শিক্ষার্থীর ফলাফল দিবেন?")) {
        f.roll.value = String((Number(d.roll) || 0) + 1); f.studentName.value = ""; f.fatherName.value = ""; f.remarks.value = "";
        $$('[data-k="marks"]', tb).forEach(i => i.value = ""); calc(); f.roll.dispatchEvent(new Event("change")); f.roll.focus(); done(); return;
      }
      m.close(); done();
    } catch (err) { console.error(err); toast("সংরক্ষণ ব্যর্থ: " + err.message, "err"); }
  });
}

function importResults(combo, done) {
  const subs = subjectsFor(S, combo.className);
  const m = modal(`<h2 class="modal-title">CSV থেকে ফলাফল আমদানি</h2>
    <p><b>${esc(combo.className)}</b> · ${esc(combo.exam)} · ${esc(combo.year)}</p>
    <ol class="steps"><li>টেমপ্লেট ডাউনলোড করে Excel-এ খুলুন।</li><li>প্রতি সারিতে একজন শিক্ষার্থীর রোল, নাম ও বিষয়ভিত্তিক নম্বর লিখুন (অনুপস্থিত হলে AB)।</li><li>পূর্ণমান ১০০ না হলে কলামের নামে <code>বিষয়|50</code> এভাবে লিখুন।</li><li><b>CSV UTF-8</b> হিসেবে সেভ করে এখানে আপলোড করুন।</li></ol>
    <p><button class="btn btn-sm btn-ghost" id="tpl">${icon("download")}টেমপ্লেট ডাউনলোড</button></p>
    <input type="file" accept=".csv,text/csv" id="csvFile"><div id="csvPrev"></div>
    <label class="check"><input type="checkbox" id="pubNow"> আমদানির সাথে সাথে প্রকাশ করুন</label>
    <div class="form-actions"><button class="btn btn-primary" id="doImp" disabled>আমদানি করুন</button></div>`, { wide: true });
  let items = [];
  $("#tpl", m.el).onclick = () => downloadFile(`result-template-${combo.className}.csv`, "﻿" + ["roll", "studentName", "fatherName", ...subs].join(",") + "\n1,,," + subs.map(() => "").join(",") + "\n", "text/csv");
  $("#csvFile", m.el).onchange = async e => {
    const p = parseCSV(await e.target.files[0].text());
    if (p.length < 2) { $("#csvPrev", m.el).innerHTML = `<p class="err">ফাইলে কোনো তথ্য নেই</p>`; return; }
    const head = p[0].map(h => h.trim()), iRoll = head.indexOf("roll"), iName = head.indexOf("studentName"), iFather = head.indexOf("fatherName");
    if (iRoll < 0 || iName < 0) { $("#csvPrev", m.el).innerHTML = `<p class="err">"roll" ও "studentName" কলাম পাওয়া যায়নি</p>`; return; }
    const subCols = head.map((h, i) => [h, i]).filter(([h, i]) => h && ![iRoll, iName, iFather].includes(i)).map(([h, i]) => { const [name, full] = h.split("|"); return { name: name.trim(), full: Number(full) || 100, i }; });
    const errs = [];
    items = p.slice(1).filter(r => (r[iRoll] || "").trim()).map((r, n) => {
      const roll = r[iRoll].trim().replace(/[০-৯]/g, x => "০১২৩৪৫৬৭৮৯".indexOf(x));
      const subjects = subCols.map(s => { const v = (r[s.i] || "").trim(); const marks = v === "" || /^ab$/i.test(v) ? "AB" : Number(v.replace(/[০-৯]/g, x => "০১২৩৪৫৬৭৮৯".indexOf(x))); if (marks !== "AB" && (isNaN(marks) || marks < 0 || marks > s.full)) errs.push(`সারি ${n + 2}: ${s.name}`); return { subject: s.name, full: s.full, marks }; });
      const d = { year: Number(combo.year), exam: combo.exam, className: combo.className, group: "", roll, studentName: (r[iName] || "").trim(), fatherName: iFather >= 0 ? (r[iFather] || "").trim() : "", remarks: "", subjects, published: false, position: null, createdAt: Date.now() };
      return { col: "results", id: store.resultId(d.year, d.exam, d.className, roll), data: d };
    });
    $("#csvPrev", m.el).innerHTML = `<p>${bnNum(items.length)} জন শিক্ষার্থী, ${bnNum(subCols.length)}টি বিষয় পাওয়া গেছে।</p>${errs.length ? `<p class="err">ভুল নম্বর: ${esc(errs.slice(0, 8).join(", "))}${errs.length > 8 ? "…" : ""}</p>` : ""}`;
    $("#doImp", m.el).disabled = !items.length || errs.length > 0;
  };
  $("#doImp", m.el).onclick = async () => {
    const pub = $("#pubNow", m.el).checked; items.forEach(i => i.data.published = pub);
    try { await store.batchSet(items); toast(`${bnNum(items.length)}টি ফলাফল আমদানি হয়েছে`); m.close(); done(); } catch (err) { toast(err.message, "err"); }
  };
}

function printTabulation(rows, c) {
  if (!rows.length) return toast("কোনো ফলাফল নেই", "err");
  const subs = [...new Set(rows.flatMap(r => r.subjects.map(s => s.subject)))];
  const w = window.open("", "_blank"); if (!w) return toast("পপ-আপ চালু করুন", "err");
  w.document.write(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Serif+Bengali:wght@400;600&display=swap"><title>টেবুলেশন শিট</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:"Noto Sans","SutonnyOMJ","Noto Serif Bengali",sans-serif;font-size:9pt}h1,h2{text-align:center;margin:2px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #555;padding:3px;text-align:center}th{background:#eee}td.l{text-align:left}.f{color:#b00;font-weight:700}.sign{display:flex;justify-content:space-between;margin-top:50px}.sign span{border-top:1px solid #000;padding-top:3px}</style></head><body>
  <h1>${esc(S.nameBn)}</h1><h2>টেবুলেশন শিট — ${esc(c.exam)} ${esc(c.year)} · ${esc(c.className)}</h2>
  <table><thead><tr><th>রোল</th><th>নাম</th>${subs.map(s => `<th>${esc(s)}</th>`).join("")}<th>মোট</th><th>GPA</th><th>গ্রেড</th><th>স্থান</th></tr></thead><tbody>
  ${rows.map(r => `<tr><td>${esc(r.roll)}</td><td class="l">${esc(r.studentName)}</td>${subs.map(s => { const x = r._c.rows.find(k => k.subject === s); return `<td class="${x?.grade === "F" ? "f" : ""}">${x ? `${x.marks}<br><small>${x.grade}</small>` : ""}</td>`; }).join("")}<td>${r._c.total}</td><td>${r._c.gpa.toFixed(2)}</td><td class="${r._c.passed ? "" : "f"}">${r._c.grade}</td><td>${r.position || ""}</td></tr>`).join("")}
  </tbody></table><div class="sign"><span>শ্রেণি শিক্ষক</span><span>পরীক্ষা নিয়ন্ত্রক</span><span>অধ্যক্ষ</span></div><script>window.onload=()=>document.fonts.ready.then(()=>window.print())<\/script></body></html>`);
  w.document.close();
}
