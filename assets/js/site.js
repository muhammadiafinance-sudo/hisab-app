// Public website: shared layout + page-specific behaviour.
import { $, $$, esc, safeUrl, bnNum, fmtDate, CLASSES, GROUPS, EXAMS, NOTICE_CATS, computeResult, toast, modal, avatar, LOGO_SVG, icon, hydrateIcons } from "./common.js";
import * as store from "./store.js";

const page = document.body.dataset.page;
const NAV = [
  ["index.html", "home", "প্রথম পাতা", "Home"],
  ["about.html", "about", "আমাদের সম্পর্কে", "About"],
  ["academics.html", "academics", "একাডেমিক", "Academics"],
  ["admission.html", "admission", "ভর্তি", "Admission"],
  ["results.html", "results", "ফলাফল", "Results"],
  ["notices.html", "notices", "নোটিশ", "Notices"],
  ["teachers.html", "teachers", "শিক্ষকমণ্ডলী", "Teachers"],
  ["gallery.html", "gallery", "গ্যালারি", "Gallery"],
  ["downloads.html", "downloads", "ডাউনলোড", "Downloads"],
  ["contact.html", "contact", "যোগাযোগ", "Contact"]
];

let S = null; // settings

// ---------------------------------------------------------------- Layout
function renderLayout() {
  const head = $("#site-header");
  if (head) head.innerHTML = `
  <div class="topbar"><div class="container topbar-in">
    <span class="tb-left"><span data-s="phone-line"></span><span data-s="email-line"></span></span>
    <span class="tb-right"><a href="admin.html" class="tb-admin">${icon("lock")}<span data-en="Admin Portal">অ্যাডমিন পোর্টাল</span></a><button class="lang-btn" id="langBtn" type="button">English</button></span>
  </div></div>
  <header class="site-header"><div class="container header-in">
    <a class="brand" href="index.html">${LOGO_SVG}<span><strong data-s="nameBn">${esc(S.nameBn)}</strong><small data-s="nameEn">${esc(S.nameEn)}</small></span></a>
    <button class="menu-btn" id="menuBtn" type="button" aria-label="মেনু" aria-expanded="false"><span></span><span></span><span></span></button>
    <nav class="main-nav" id="mainNav" aria-label="প্রধান মেনু">${NAV.map(([h, k, bn, en]) => `<a href="${h}" class="${k === page ? "active" : ""}" data-en="${en}">${bn}</a>`).join("")}</nav>
  </div></header>
  <div class="ticker" id="ticker" hidden><div class="container ticker-in"><b data-en="Latest">সর্বশেষ</b><div class="ticker-track"><div class="ticker-move" id="tickerMove"></div></div></div></div>`;

  const foot = $("#site-footer");
  if (foot) foot.innerHTML = `
  <footer class="site-footer"><div class="container footer-grid">
    <div><a class="brand light" href="index.html">${LOGO_SVG}<span><strong>${esc(S.nameBn)}</strong><small>${esc(S.nameEn)}</small></span></a>
      <p class="muted-light">${esc(S.slogan)}</p>
      <p class="muted-light small">${S.eiin ? `EIIN: ${esc(S.eiin)}` : ""}${S.madrasaCode ? ` · মাদ্রাসা কোড: ${esc(S.madrasaCode)}` : ""}${S.estd ? ` · স্থাপিত: ${esc(S.estd)}` : ""}</p></div>
    <div><h4 data-en="Quick links">দ্রুত লিংক</h4><ul>${NAV.slice(1, 6).map(([h, , bn, en]) => `<li><a href="${h}" data-en="${en}">${bn}</a></li>`).join("")}</ul></div>
    <div><h4 data-en="Resources">তথ্যসেবা</h4><ul>${NAV.slice(6).map(([h, , bn, en]) => `<li><a href="${h}" data-en="${en}">${bn}</a></li>`).join("")}<li><a href="https://www.bmeb.gov.bd" target="_blank" rel="noopener">মাদ্রাসা শিক্ষা বোর্ড ${icon("external", "sm")}</a></li></ul></div>
    <div><h4 data-en="Contact">যোগাযোগ</h4><ul class="contact-list">
      ${S.address ? `<li>${icon("pin")}<span>${esc(S.address)}</span></li>` : ""}${S.phone ? `<li>${icon("phone")}<a href="tel:${esc(S.phone)}">${esc(S.phone)}</a></li>` : ""}${S.email ? `<li>${icon("mail")}<a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>` : ""}
      ${!S.address && !S.phone && !S.email ? `<li><a href="contact.html">যোগাযোগ পাতা দেখুন</a></li>` : ""}</ul>
      <div class="socials">${safeUrl(S.facebook) ? `<a href="${esc(safeUrl(S.facebook))}" target="_blank" rel="noopener">Facebook</a>` : ""}${safeUrl(S.youtube) ? `<a href="${esc(safeUrl(S.youtube))}" target="_blank" rel="noopener">YouTube</a>` : ""}</div></div>
  </div>
  <div class="footer-bottom"><div class="container">© ${bnNum(new Date().getFullYear())} ${esc(S.nameBn)} · সর্বস্বত্ব সংরক্ষিত</div></div></footer>
  ${store.MODE === "demo" ? `<button type="button" class="demo-flag" onclick="this.remove()" title="বন্ধ করতে ক্লিক করুন">ডেমো মোড — তথ্য শুধু এই ব্রাউজারে ${icon("x", "sm")}</button>` : ""}`;

  $$('[data-s="phone-line"]').forEach(e => e.innerHTML = S.phone ? icon("phone") + esc(S.phone) : "");
  $$('[data-s="email-line"]').forEach(e => e.innerHTML = S.email ? icon("mail") + esc(S.email) : "");

  const btn = $("#menuBtn"), nav = $("#mainNav");
  btn?.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
  setupLang();
}

let lang = (() => { try { return localStorage.getItem("siam_lang") || "bn"; } catch { return "bn"; } })();
function applyLang() {
  document.documentElement.lang = lang;
  $$("[data-en]").forEach(el => {
    if (el.dataset.bn === undefined) el.dataset.bn = el.textContent;
    el.textContent = lang === "en" ? el.dataset.en : el.dataset.bn;
  });
  const b = $("#langBtn"); if (b) b.textContent = lang === "en" ? "বাংলা" : "English";
}
function setupLang() {
  $("#langBtn")?.addEventListener("click", () => { lang = lang === "bn" ? "en" : "bn"; try { localStorage.setItem("siam_lang", lang); } catch { } applyLang(); });
  applyLang();
}

async function ticker() {
  try {
    const items = [];
    if (S.noticeTicker) items.push(`<span>${esc(S.noticeTicker)}</span>`);
    const n = (await store.list("notices", { publicOnly: true })).slice(0, 6);
    n.forEach(x => items.push(`<a href="notices.html?id=${encodeURIComponent(x.id)}">${esc(x.title)}</a>`));
    if (!items.length) return;
    $("#tickerMove").innerHTML = items.join('<i class="sep"></i>') + '<i class="sep"></i>' + items.join('<i class="sep"></i>');
    $("#ticker").hidden = false;
  } catch (e) { console.warn(e); }
}

// ---------------------------------------------------------------- Shared renderers
const noticeItem = x => {
  const d = new Date(x.createdAt || Date.now());
  return `<a class="notice-item" href="notices.html?id=${encodeURIComponent(x.id)}">
    <div class="n-date"><b>${bnNum(d.getDate())}</b><span>${d.toLocaleString("bn-BD", { month: "short" })}</span></div>
    <div class="n-body"><h3>${x.pinned ? `<span class="pin" title="পিন করা">${icon("pinned")}</span>` : ""}${esc(x.title)}</h3><p><span class="chip">${esc(x.category || "সাধারণ")}</span> ${fmtDate(x.createdAt)}${x.fileUrl ? ` · <span class="att">${icon("clip", "sm")}সংযুক্তি</span>` : ""}</p></div></a>`;
};
const sortNotices = a => a.sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || (y.createdAt || 0) - (x.createdAt || 0));
const empty = t => `<div class="empty">${t}</div>`;
const errBox = e => { console.error(e); return empty("তথ্য লোড করা যায়নি। পরে আবার চেষ্টা করুন।"); };

function showNotice(x) {
  const u = safeUrl(x.fileUrl);
  modal(`<span class="chip">${esc(x.category || "সাধারণ")}</span><h2 class="modal-title">${esc(x.title)}</h2>
    <p class="muted">প্রকাশ: ${fmtDate(x.createdAt)}</p><div class="prose">${esc(x.body || "").replace(/\n/g, "<br>")}</div>
    ${u ? (u.startsWith("data:image") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) ? `<img class="notice-img" src="${esc(u)}" alt="">` : "") +
      `<p><a class="btn btn-primary" href="${esc(u)}" target="_blank" rel="noopener" ${u.startsWith("data:") ? "download" : ""}>${icon("download")}সংযুক্তি দেখুন / ডাউনলোড</a></p>` : ""}
    <p><button class="btn btn-ghost" onclick="window.print()">${icon("printer")}প্রিন্ট</button></p>`, { wide: true });
}

// ---------------------------------------------------------------- Pages
const pages = {
  async home() {
    $("#principalMsg").textContent = S.principalMessage;
    $("#principalName").textContent = S.principalName ? S.principalName : "";
    $("#principalTitle").textContent = S.principalTitle || "অধ্যক্ষ";
    $("#principalPhoto").innerHTML = avatar(S.principalPhoto, S.principalName || "অধ্যক্ষ", "principal-img");
    $("#aboutShort").textContent = S.about;
    const stats = [[S.statStudents, "শিক্ষার্থী"], [S.statTeachers, "শিক্ষক-শিক্ষিকা"], ["৭", "শ্রেণি (৬ষ্ঠ–আলিম)"], [S.statPass, "পাসের হার"]].filter(s => s[0]);
    $("#stats").innerHTML = stats.map(([v, l]) => `<div class="stat"><b>${esc(bnNum(v))}</b><span>${l}</span></div>`).join("");
    if (!S.admissionOpen) $("#heroAdmission").textContent = "ভর্তি তথ্য";
    $("#admissionBadge").textContent = S.admissionOpen ? `${bnNum(S.admissionSession)} শিক্ষাবর্ষে ভর্তি চলছে` : "স্বাগতম";
    $("#classStrip").innerHTML = CLASSES.map(c => `<a class="class-pill" href="academics.html#${encodeURIComponent(c.name)}"><b>${c.short}</b><span>${c.name}</span><small>${c.level}</small></a>`).join("");
    try {
      const [n, ev, g] = await Promise.all([store.list("notices", { publicOnly: true }), store.list("events", { publicOnly: true }), store.list("gallery", { publicOnly: true })]);
      $("#homeNotices").innerHTML = n.length ? sortNotices(n).slice(0, 5).map(noticeItem).join("") : empty("এখনো কোনো নোটিশ প্রকাশিত হয়নি।");
      const today = new Date().toISOString().slice(0, 10);
      const up = ev.filter(e => (e.date || "") >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
      $("#homeEvents").innerHTML = up.length ? up.map(eventItem).join("") : empty("আসন্ন কোনো অনুষ্ঠান নেই।");
      $("#homeGallery").innerHTML = g.length ? g.slice(0, 8).map(galleryItem).join("") : empty("গ্যালারিতে ছবি যোগ করা হলে এখানে দেখা যাবে।");
      bindGallery(g);
    } catch (e) { $("#homeNotices").innerHTML = errBox(e); }
  },

  async about() {
    $("#aboutText").textContent = S.about;
    $("#historyText").textContent = S.history || "";
    $("#historyBlock").hidden = !S.history;
    $("#missionText").textContent = S.mission;
    $("#visionText").textContent = S.vision;
    $("#aboutPrincipalMsg").textContent = S.principalMessage;
    $("#aboutPrincipalName").textContent = [S.principalName, S.principalTitle].filter(Boolean).join(" — ");
    $("#aboutPrincipalPhoto").innerHTML = avatar(S.principalPhoto, S.principalName || "অধ্যক্ষ", "principal-img");
    const facts = [["প্রতিষ্ঠার সাল", S.estd], ["EIIN", S.eiin], ["মাদ্রাসা কোড", S.madrasaCode], ["শিক্ষা বোর্ড", "বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড"], ["শ্রেণি", "ষষ্ঠ শ্রেণি থেকে আলিম"], ["ঠিকানা", S.address]].filter(f => f[1]);
    $("#facts").innerHTML = facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    try {
      const c = (await store.list("teachers", { publicOnly: true })).filter(t => t.category === "committee");
      $("#committee").innerHTML = c.length ? sortPeople(c).map(personCard).join("") : empty("পরিচালনা কমিটির তথ্য শিগগির যোগ করা হবে।");
    } catch (e) { $("#committee").innerHTML = errBox(e); }
  },

  async academics() {
    const { subjectsFor } = await import("./common.js");
    $("#classCards").innerHTML = CLASSES.map(c => `<article class="class-card" id="${esc(c.name)}">
      <div class="cc-head"><b>${c.short}</b><div><h3>${c.name}</h3><small>${c.en} · ${c.level}${c.groups ? " · বিভাগ: " + GROUPS.join(", ") : ""}</small></div></div>
      <details><summary>বিষয়সমূহ (${bnNum(subjectsFor(S, c.name).length)}টি)</summary><ol>${subjectsFor(S, c.name).map(s => `<li>${esc(s)}</li>`).join("")}</ol></details></article>`).join("");
    try {
      const [r, ev] = await Promise.all([store.list("routines", { publicOnly: true }), store.list("events", { publicOnly: true })]);
      $("#routines").innerHTML = r.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>শিরোনাম</th><th>শ্রেণি</th><th>ধরন</th><th></th></tr></thead><tbody>${r.map(x => `<tr><td>${esc(x.title)}</td><td>${esc(x.className || "সকল")}</td><td>${esc(x.type || "ক্লাস রুটিন")}</td><td>${linkBtn(x.fileUrl, "দেখুন")}${x.details ? ` <button class="btn btn-sm btn-ghost" data-rt="${esc(x.id)}">বিস্তারিত</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : empty("রুটিন প্রকাশিত হলে এখানে দেখা যাবে।");
      $("#routines").addEventListener("click", e => { const b = e.target.closest("[data-rt]"); if (!b) return; const x = r.find(i => i.id === b.dataset.rt); modal(`<h2 class="modal-title">${esc(x.title)}</h2><div class="prose pre">${esc(x.details)}</div>`, { wide: true }); });
      const evs = ev.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      $("#calendar").innerHTML = evs.length ? evs.map(eventItem).join("") : empty("একাডেমিক ক্যালেন্ডার শিগগির প্রকাশ করা হবে।");
    } catch (e) { $("#routines").innerHTML = errBox(e); }
  },

  async notices() {
    const list = $("#noticeList"), q = $("#nSearch"), cat = $("#nCat");
    cat.innerHTML = `<option value="">সকল ক্যাটাগরি</option>` + NOTICE_CATS.map(c => `<option>${c}</option>`).join("");
    let all = [];
    try { all = sortNotices(await store.list("notices", { publicOnly: true })); } catch (e) { list.innerHTML = errBox(e); return; }
    const draw = () => {
      const t = q.value.trim().toLowerCase(), c = cat.value;
      const f = all.filter(x => (!c || x.category === c) && (!t || (x.title + " " + (x.body || "")).toLowerCase().includes(t)));
      list.innerHTML = f.length ? f.map(noticeItem).join("") : empty("কোনো নোটিশ পাওয়া যায়নি।");
    };
    q.addEventListener("input", draw); cat.addEventListener("change", draw); draw();
    list.addEventListener("click", e => { const a = e.target.closest(".notice-item"); if (!a) return; e.preventDefault(); const id = new URL(a.href).searchParams.get("id"); const x = all.find(n => n.id === id); if (x) { history.replaceState(null, "", "?id=" + encodeURIComponent(id)); showNotice(x); } });
    const id = new URLSearchParams(location.search).get("id");
    if (id) { const x = all.find(n => n.id === id) || await store.get("notices", id).catch(() => null); if (x && x.published) showNotice(x); }
  },

  async results() {
    const f = $("#resultForm");
    f.elements.className.innerHTML = CLASSES.map(c => `<option>${c.name}</option>`).join("");
    f.exam.innerHTML = EXAMS.map(c => `<option>${c}</option>`).join("");
    const y = new Date().getFullYear();
    f.year.innerHTML = Array.from({ length: 8 }, (_, i) => `<option value="${y - i}">${bnNum(y - i)}</option>`).join("");
    const qs = new URLSearchParams(location.search);
    ["className", "exam", "year", "roll"].forEach(k => qs.get(k) && (f.elements[k].value = qs.get(k)));
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const out = $("#resultOut"); out.innerHTML = `<div class="loading">অনুসন্ধান করা হচ্ছে…</div>`;
      const roll = f.roll.value.trim().replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d));
      try {
        const r = await store.get("results", store.resultId(f.year.value, f.exam.value, f.elements.className.value, roll));
        if (!r || !r.published) { out.innerHTML = empty("এই তথ্যের সঙ্গে মিলে এমন কোনো প্রকাশিত ফলাফল পাওয়া যায়নি। শ্রেণি, পরীক্ষা, সাল ও রোল যাচাই করুন।"); return; }
        out.innerHTML = marksheet(r);
        out.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) { out.innerHTML = errBox(err); }
    });
    if (qs.get("roll")) f.requestSubmit();
  },

  async admission() {
    const f = $("#admForm");
    $("#admInfo").textContent = S.admissionInfo;
    $("#admSession").textContent = bnNum(S.admissionSession);
    $("#admLast").textContent = S.admissionLastDate ? fmtDate(S.admissionLastDate) : "অফিসে যোগাযোগ করুন";
    $("#admStatusBadge").innerHTML = S.admissionOpen ? `<span class="badge ok">ভর্তি চলছে</span>` : `<span class="badge no">অনলাইন আবেদন বর্তমানে বন্ধ</span>`;
    f.elements.className.innerHTML = `<option value="">— নির্বাচন করুন —</option>` + CLASSES.map(c => `<option>${c.name}</option>`).join("");
    f.group.innerHTML = `<option value="">প্রযোজ্য নয়</option>` + GROUPS.map(g => `<option>${g}</option>`).join("");
    f.elements.className.addEventListener("change", () => { const c = CLASSES.find(c => c.name === f.elements.className.value); $("#groupWrap").hidden = !c?.groups; if (!c?.groups) f.group.value = ""; });
    if (!S.admissionOpen) { f.querySelectorAll("input,select,textarea,button").forEach(i => i.disabled = true); }
    let photo = "";
    f.photo.addEventListener("change", async () => {
      const file = f.photo.files[0]; if (!file) return;
      if (!file.type.startsWith("image/")) { toast("শুধু ছবি (JPG/PNG) দিন", "err"); f.photo.value = ""; return; }
      photo = await store.imageToDataUrl(file, 300, 0.7);
      $("#photoPrev").innerHTML = `<img src="${photo}" alt="">`;
    });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      if (!/^01[3-9]\d{8}$/.test(f.guardianPhone.value.replace(/[\s-]/g, "").replace(/^\+?88/, ""))) { toast("সঠিক মোবাইল নম্বর দিন (০১XXXXXXXXX)", "err"); f.guardianPhone.focus(); return; }
      const btn = f.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "জমা হচ্ছে…";
      const data = Object.fromEntries(new FormData(f)); delete data.photo; delete data.agree;
      Object.keys(data).forEach(k => data[k] = String(data[k]).trim().slice(0, 600));
      const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", rnd = crypto.getRandomValues(new Uint8Array(7));
      const id = "SIAM" + String(new Date().getFullYear()).slice(2) + "-" + [...rnd].map(b => alpha[b % alpha.length]).join("");
      const rec = { ...data, photo, session: String(S.admissionSession), status: "Pending", adminNote: "", createdAt: Date.now() };
      try {
        await store.set("admissions", id, rec);
        $("#admDone").hidden = false; f.hidden = true;
        $("#admDone").innerHTML = `<div class="success-card"><div class="big-check">${icon("check")}</div><h2>আবেদন সফলভাবে জমা হয়েছে</h2>
          <p>আপনার ট্র্যাকিং আইডি সংরক্ষণ করুন:</p><div class="tracking">${id}</div>
          <p class="muted">এই আইডি দিয়ে নিচের "আবেদনের অবস্থা" অংশে খোঁজ নিতে পারবেন। প্রয়োজনীয় কাগজপত্রসহ মাদ্রাসা অফিসে যোগাযোগ করুন।</p>
          <div class="btn-row"><button class="btn btn-primary" id="printApp">${icon("printer")}আবেদনপত্র প্রিন্ট</button><a class="btn btn-ghost" href="admission.html">নতুন আবেদন</a></div></div>`;
        $("#printApp").onclick = () => printApplication({ id, ...rec });
        $("#trackId").value = id;
        window.scrollTo({ top: $("#admDone").offsetTop - 120, behavior: "smooth" });
      } catch (err) { console.error(err); toast("আবেদন জমা হয়নি। আবার চেষ্টা করুন।", "err"); btn.disabled = false; btn.textContent = "আবেদন জমা দিন"; }
    });
    $("#trackForm").addEventListener("submit", async e => {
      e.preventDefault();
      const out = $("#trackOut"), id = $("#trackId").value.trim().toUpperCase();
      out.innerHTML = `<div class="loading">খোঁজা হচ্ছে…</div>`;
      try {
        const a = id ? await store.get("admissions", id) : null;
        if (!a) { out.innerHTML = empty("এই ট্র্যাকিং আইডির কোনো আবেদন পাওয়া যায়নি।"); return; }
        const st = { Pending: ["অপেক্ষমাণ", "warn"], Approved: ["অনুমোদিত", "ok"], Rejected: ["বাতিল", "no"], Admitted: ["ভর্তি সম্পন্ন", "ok"] }[a.status] || [a.status, "warn"];
        out.innerHTML = `<div class="track-card"><div><b>${esc(a.studentNameBn || a.studentName)}</b><p class="muted">${esc(a.className)} · আবেদন: ${fmtDate(a.createdAt)}</p></div><span class="badge ${st[1]}">${st[0]}</span>${a.adminNote ? `<p class="note">অফিসের মন্তব্য: ${esc(a.adminNote)}</p>` : ""}</div>`;
      } catch (err) { out.innerHTML = errBox(err); }
    });
  },

  async teachers() {
    const box = $("#people"), tabs = $("#peopleTabs");
    let all = [];
    try { all = sortPeople(await store.list("teachers", { publicOnly: true })); } catch (e) { box.innerHTML = errBox(e); return; }
    const draw = cat => {
      $$("button", tabs).forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
      const f = all.filter(t => (t.category || "teacher") === cat);
      box.innerHTML = f.length ? f.map(personCard).join("") : empty("তথ্য শিগগির যোগ করা হবে।");
    };
    tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (b) draw(b.dataset.cat); });
    draw(new URLSearchParams(location.search).get("cat") || "teacher");
    box.addEventListener("click", e => {
      const c = e.target.closest("[data-person]"); if (!c) return;
      const t = all.find(x => x.id === c.dataset.person);
      modal(`<div class="person-modal">${avatar(t.photoUrl, t.name, "avatar xl")}<div><h2 class="modal-title">${esc(t.name)}</h2><p><b>${esc(t.designation)}</b>${t.subject ? " · " + esc(t.subject) : ""}</p>
        ${t.qualification ? `<p class="meta">${icon("cap")}${esc(t.qualification)}</p>` : ""}${t.joinDate ? `<p class="meta">${icon("calendar")}যোগদান: ${fmtDate(t.joinDate)}</p>` : ""}${t.phone ? `<p class="meta">${icon("phone")}<a href="tel:${esc(t.phone)}">${esc(t.phone)}</a></p>` : ""}${t.email ? `<p class="meta">${icon("mail")}${esc(t.email)}</p>` : ""}
        ${t.bio ? `<p class="prose">${esc(t.bio)}</p>` : ""}</div></div>`);
    });
  },

  async gallery() {
    const box = $("#galleryGrid"), tabs = $("#galTabs");
    let all = [];
    try { all = await store.list("gallery", { publicOnly: true }); } catch (e) { box.innerHTML = errBox(e); return; }
    const albums = [...new Set(all.map(g => g.album || "সাধারণ"))];
    tabs.innerHTML = [`<button class="active" data-a="">সব</button>`, ...albums.map(a => `<button data-a="${esc(a)}">${esc(a)}</button>`)].join("");
    const draw = a => {
      $$("button", tabs).forEach(b => b.classList.toggle("active", b.dataset.a === a));
      const f = all.filter(g => !a || (g.album || "সাধারণ") === a);
      box.innerHTML = f.length ? f.map(galleryItem).join("") : empty("এখনো কোনো ছবি যোগ করা হয়নি।");
    };
    tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (b) draw(b.dataset.a); });
    draw(""); bindGallery(all);
  },

  async downloads() {
    const box = $("#dlList");
    try {
      const all = await store.list("downloads", { publicOnly: true });
      const cats = [...new Set(all.map(d => d.category || "অন্যান্য"))];
      box.innerHTML = all.length ? cats.map(c => `<h3 class="dl-cat">${esc(c)}</h3><div class="dl-grid">${all.filter(d => (d.category || "অন্যান্য") === c).map(d => `<div class="dl-card"><div class="dl-icon">${icon("file")}</div><div><h4>${esc(d.title)}</h4><p class="muted">${fmtDate(d.createdAt)}</p></div>${linkBtn(d.url, "ডাউনলোড")}</div>`).join("")}</div>`).join("") : empty("ডাউনলোডযোগ্য ফাইল প্রকাশিত হলে এখানে দেখা যাবে।");
    } catch (e) { box.innerHTML = errBox(e); }
  },

  async contact() {
    $("#cAddress").textContent = S.address || "—";
    $("#cPhone").innerHTML = S.phone ? `<a href="tel:${esc(S.phone)}">${esc(S.phone)}</a>` : "—";
    $("#cEmail").innerHTML = S.email ? `<a href="mailto:${esc(S.email)}">${esc(S.email)}</a>` : "—";
    const m = safeUrl(S.mapEmbed);
    if (m && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(m)) $("#map").innerHTML = `<iframe src="${esc(m)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="মানচিত্র"></iframe>`;
    const f = $("#contactForm");
    f.addEventListener("submit", async e => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f)); Object.keys(d).forEach(k => d[k] = String(d[k]).trim().slice(0, 2000));
      const b = f.querySelector("[type=submit]"); b.disabled = true;
      try { await store.add("messages", { ...d, status: "New", createdAt: Date.now() }); f.reset(); toast("আপনার বার্তা পাঠানো হয়েছে। ধন্যবাদ!"); }
      catch (err) { console.error(err); toast("বার্তা পাঠানো যায়নি", "err"); }
      b.disabled = false;
    });
  }
};

// ---------------------------------------------------------------- Small renderers
function linkBtn(url, label) {
  const u = safeUrl(url); if (!u) return "";
  return `<a class="btn btn-sm btn-primary" href="${esc(u)}" target="_blank" rel="noopener" ${u.startsWith("data:") ? "download" : ""}>${icon("download", "sm")}${label}</a>`;
}
function eventItem(e) {
  const d = new Date((e.date || "") + "T00:00:00");
  return `<div class="event-item"><div class="ev-date"><b>${isNaN(d) ? "" : bnNum(d.getDate())}</b><span>${isNaN(d) ? "" : d.toLocaleString("bn-BD", { month: "short" })}</span></div><div><h4>${esc(e.title)}</h4><p class="muted">${fmtDate(e.date)}${e.place ? " · " + esc(e.place) : ""}</p></div></div>`;
}
const ORDER = ["অধ্যক্ষ", "উপাধ্যক্ষ", "সুপার", "সভাপতি"];
function sortPeople(a) { return a.sort((x, y) => (Number(x.order) || 999) - (Number(y.order) || 999) || ((ORDER.indexOf(x.designation) + 1 || 99) - (ORDER.indexOf(y.designation) + 1 || 99))); }
function personCard(t) {
  return `<button class="person" data-person="${esc(t.id)}" type="button">${avatar(t.photoUrl, t.name, "avatar lg")}<h3>${esc(t.name)}</h3><p>${esc(t.designation || "")}</p>${t.subject ? `<small>${esc(t.subject)}</small>` : ""}</button>`;
}
function galleryItem(g) {
  const u = safeUrl(g.imageUrl); if (!u) return "";
  return `<button class="g-item" type="button" data-g="${esc(g.id)}"><img src="${esc(u)}" alt="${esc(g.title || "")}" loading="lazy">${g.title ? `<span>${esc(g.title)}</span>` : ""}</button>`;
}
function bindGallery(all) {
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    const g = all.find(x => x.id === b.dataset.g); if (!g) return;
    modal(`<img class="lightbox-img" src="${esc(safeUrl(g.imageUrl))}" alt="${esc(g.title || "")}"><p class="center"><b>${esc(g.title || "")}</b> ${g.album ? `<span class="chip">${esc(g.album)}</span>` : ""}</p>`, { wide: true });
  });
}

export function marksheet(r) {
  const c = computeResult(r.subjects);
  return `<div class="marksheet print-area">
    <div class="ms-head">${LOGO_SVG}<div><h2>${esc(S.nameBn)}</h2><p>${esc(S.nameEn)}${S.address ? " · " + esc(S.address) : ""}</p><h3>${esc(r.exam)} — ${bnNum(r.year)}</h3><span class="ms-tag">একাডেমিক ট্রান্সক্রিপ্ট</span></div></div>
    <table class="ms-info"><tr><th>শিক্ষার্থীর নাম</th><td>${esc(r.studentName)}</td><th>রোল</th><td>${esc(bnNum(r.roll))}</td></tr>
    <tr><th>পিতার নাম</th><td>${esc(r.fatherName || "—")}</td><th>শ্রেণি</th><td>${esc(r.className)}${r.group ? " (" + esc(r.group) + ")" : ""}</td></tr></table>
    <table class="table ms-table"><thead><tr><th>#</th><th>বিষয়</th><th>পূর্ণমান</th><th>প্রাপ্ত নম্বর</th><th>গ্রেড</th><th>গ্রেড পয়েন্ট</th></tr></thead>
    <tbody>${c.rows.map((s, i) => `<tr class="${s.grade === "F" ? "fail" : ""}"><td>${bnNum(i + 1)}</td><td>${esc(s.subject)}</td><td>${bnNum(s.full)}</td><td>${s.marks === "AB" ? "অনুপস্থিত" : bnNum(s.marks)}</td><td><b>${s.grade}</b></td><td>${s.gp.toFixed(2)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><th colspan="2">মোট</th><th>${bnNum(c.fullTotal)}</th><th>${bnNum(c.total)}</th><th colspan="2"></th></tr></tfoot></table>
    <div class="ms-summary"><div><span>জিপিএ</span><b>${c.gpa.toFixed(2)}</b></div><div><span>গ্রেড</span><b>${c.grade}</b></div><div><span>ফলাফল</span><b class="${c.passed ? "pass" : "failc"}">${c.passed ? "উত্তীর্ণ" : "অনুত্তীর্ণ"}</b></div>${r.position ? `<div><span>মেধাস্থান</span><b>${bnNum(r.position)}</b></div>` : ""}</div>
    ${r.remarks ? `<p><b>মন্তব্য:</b> ${esc(r.remarks)}</p>` : ""}
    <div class="ms-sign"><span>শ্রেণি শিক্ষক</span><span>পরীক্ষা নিয়ন্ত্রক</span><span>অধ্যক্ষ</span></div>
    <p class="ms-note">এটি অনলাইন কপি। প্রয়োজনে মাদ্রাসা অফিস থেকে সত্যায়িত কপি সংগ্রহ করুন।</p>
    <div class="no-print btn-row"><button class="btn btn-primary" onclick="window.print()">${icon("printer")}প্রিন্ট / PDF</button></div></div>`;
}

function printApplication(a) {
  const w = window.open("", "_blank");
  if (!w) { toast("পপ-আপ চালু করুন", "err"); return; }
  const row = (k, v) => v ? `<tr><th>${k}</th><td>${esc(v)}</td></tr>` : "";
  w.document.write(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Serif+Bengali:wght@400;600&display=swap"><title>ভর্তি আবেদন ${esc(a.id)}</title>
  <style>body{font-family:"Noto Sans","SutonnyOMJ","Noto Serif Bengali",sans-serif;max-width:760px;margin:24px auto;color:#111;padding:0 16px}h1,h2{text-align:center;margin:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #999;padding:7px 10px;text-align:left;vertical-align:top}th{width:34%;background:#f3f3f3}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.ph{width:110px;height:130px;border:1px solid #999;object-fit:cover;display:grid;place-items:center;font-size:12px}.sign{display:flex;justify-content:space-between;margin-top:70px}.sign span{border-top:1px solid #333;padding-top:4px}</style></head><body>
  <h1>${esc(S.nameBn)}</h1><h2 style="font-weight:400">${esc(S.nameEn)}</h2><p style="text-align:center">${esc(S.address || "")}</p><hr>
  <div class="top"><div><h2 style="text-align:left">ভর্তি আবেদন — শিক্ষাবর্ষ ${esc(a.session)}</h2><p>ট্র্যাকিং আইডি: <b>${esc(a.id)}</b><br>তারিখ: ${fmtDate(a.createdAt)}</p></div>${a.photo ? `<img class="ph" src="${a.photo}">` : `<div class="ph">ছবি</div>`}</div>
  <table>${row("শিক্ষার্থীর নাম (বাংলা)", a.studentNameBn)}${row("Student name (English)", a.studentName)}${row("জন্ম তারিখ", a.dob)}${row("জন্ম নিবন্ধন নম্বর", a.birthReg)}${row("লিঙ্গ", a.gender)}${row("রক্তের গ্রুপ", a.blood)}${row("ভর্তিচ্ছু শ্রেণি", a.className)}${row("বিভাগ", a.group)}${row("পিতার নাম", a.fatherName)}${row("মাতার নাম", a.motherName)}${row("অভিভাবকের মোবাইল", a.guardianPhone)}${row("বর্তমান ঠিকানা", a.address)}${row("স্থায়ী ঠিকানা", a.permanentAddress)}${row("পূর্ববর্তী প্রতিষ্ঠান", a.prevInstitution)}${row("সর্বশেষ ফলাফল", a.prevResult)}${row("অন্যান্য তথ্য", a.notes)}</table>
  <div class="sign"><span>অভিভাবকের স্বাক্ষর</span><span>গ্রহণকারীর স্বাক্ষর</span><span>অধ্যক্ষের স্বাক্ষর</span></div>
  <script>window.onload=()=>document.fonts.ready.then(()=>window.print())<\/script></body></html>`);
  w.document.close();
}

// ---------------------------------------------------------------- Boot
(async function boot() {
  try { S = await store.getSettings(); } catch { S = (await import("./config.js")).DEFAULT_SETTINGS; }
  renderLayout();
  hydrateIcons();
  $$("[data-s-text]").forEach(el => { const v = S[el.dataset.sText]; if (v) el.textContent = v; });
  ticker();
  try { await pages[page]?.(); } catch (e) { console.error(e); }
  applyLang(); // re-apply language after dynamic content
})();
