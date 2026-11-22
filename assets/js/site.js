// Public website: shared layout + page-specific behaviour.
import { $, $$, esc, safeUrl, bnNum, fmtDate, CLASSES, GROUPS, EXAMS, NOTICE_CATS, computeResult, toast, modal, avatar, LOGO_SVG, icon, hydrateIcons, monthShort } from "./common.js";
import { initLang, setLang, isEn, translatePage, tr, L } from "./i18n.js";
import { DEFAULT_SETTINGS, DEFAULT_SETTINGS_EN } from "./config.js";
import * as store from "./store.js";
import { screenSheet, printSheets } from "./marksheet.js";

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
    <span class="tb-right"><a href="admission.html" class="tb-cta">ভর্তি আবেদন</a><a href="admin.html" class="tb-admin">${icon("lock")}<span data-en="Admin Portal">অ্যাডমিন পোর্টাল</span></a><button class="lang-btn" id="langBtn" type="button" data-no-tr>English</button></span>
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
      <p class="muted-light small">${S.eiin ? `EIIN: ${esc(S.eiin)}` : ""}${S.madrasaCode ? ` · ${L("মাদ্রাসা কোড", "Madrasha code")}: ${esc(S.madrasaCode)}` : ""}${S.estd ? ` · ${L("স্থাপিত", "Established")}: ${esc(bnNum(S.estd))}` : ""}</p></div>
    <div><h4 data-en="Quick links">দ্রুত লিংক</h4><ul>${NAV.slice(1, 6).map(([h, , bn, en]) => `<li><a href="${h}" data-en="${en}">${bn}</a></li>`).join("")}</ul></div>
    <div><h4 data-en="Resources">তথ্যসেবা</h4><ul>${NAV.slice(6).map(([h, , bn, en]) => `<li><a href="${h}" data-en="${en}">${bn}</a></li>`).join("")}<li><a href="https://www.bmeb.gov.bd" target="_blank" rel="noopener">মাদ্রাসা শিক্ষা বোর্ড ${icon("external", "sm")}</a></li></ul></div>
    <div><h4 data-en="Contact">যোগাযোগ</h4><ul class="contact-list">
      ${S.address ? `<li>${icon("pin")}<span>${esc(S.address)}</span></li>` : ""}${S.phone ? `<li>${icon("phone")}<a href="tel:${esc(S.phone)}">${esc(S.phone)}</a></li>` : ""}${S.email ? `<li>${icon("mail")}<a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>` : ""}
      ${!S.address && !S.phone && !S.email ? `<li><a href="contact.html">যোগাযোগ পাতা দেখুন</a></li>` : ""}</ul>
      <div class="socials">${safeUrl(S.facebook) ? `<a href="${esc(safeUrl(S.facebook))}" target="_blank" rel="noopener">Facebook</a>` : ""}${safeUrl(S.youtube) ? `<a href="${esc(safeUrl(S.youtube))}" target="_blank" rel="noopener">YouTube</a>` : ""}</div></div>
  </div>
  <div class="footer-bottom"><div class="container">© ${bnNum(new Date().getFullYear())} ${esc(S.nameBn)} · ${L("সর্বস্বত্ব সংরক্ষিত", "All rights reserved")}</div></div></footer>`;

  $$('[data-s="phone-line"]').forEach(e => e.innerHTML = S.phone ? icon("phone") + esc(S.phone) : "");
  $$('[data-s="email-line"]').forEach(e => e.innerHTML = S.email ? icon("mail") + esc(S.email) : "");

  const btn = $("#menuBtn"), nav = $("#mainNav");
  btn?.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
  setupLang();
}

function applyLang() {
  if (isEn()) $$("[data-en]").forEach(el => { el.textContent = el.dataset.en; });
  const b = $("#langBtn"); if (b) { b.textContent = isEn() ? "বাংলা" : "English"; b.setAttribute("data-no-tr", ""); b.setAttribute("aria-label", isEn() ? "বাংলায় দেখুন" : "View in English"); }
}
function setupLang() {
  $("#langBtn")?.addEventListener("click", () => setLang(isEn() ? "bn" : "en"));
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
    <div class="n-date"><b>${bnNum(d.getDate())}</b><span>${monthShort(d)}</span></div>
    <div class="n-body"><h3>${x.pinned ? `<span class="pin" title="পিন করা">${icon("pinned")}</span>` : ""}${esc(x.title)}</h3><p><span class="chip">${esc(x.category || "সাধারণ")}</span> ${fmtDate(x.createdAt)}${x.fileUrl ? ` · <span class="att">${icon("clip", "sm")}সংযুক্তি</span>` : ""}</p></div></a>`;
};
const sortNotices = a => a.sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || (y.createdAt || 0) - (x.createdAt || 0));
const empty = t => `<div class="empty">${t}</div>`;
const errBox = e => { console.error(e); return empty("তথ্য লোড করা যায়নি। পরে আবার চেষ্টা করুন।"); };

function showNotice(x) {
  const u = safeUrl(x.fileUrl);
  modal(`<span class="chip">${esc(x.category || "সাধারণ")}</span><h2 class="modal-title">${esc(x.title)}</h2>
    <p class="muted">${L("প্রকাশ", "Published")}: ${fmtDate(x.createdAt)}</p><div class="prose">${esc(x.body || "").replace(/\n/g, "<br>")}</div>
    ${u ? (u.startsWith("data:image") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) ? `<img class="notice-img" src="${esc(u)}" alt="">` : "") +
      `<p><a class="btn btn-primary" href="${esc(u)}" target="_blank" rel="noopener" ${u.startsWith("data:") ? "download" : ""}>${icon("download")}সংযুক্তি দেখুন / ডাউনলোড</a></p>` : ""}
    <p><button class="btn btn-ghost" onclick="window.print()">${icon("printer")}প্রিন্ট</button></p>`, { wide: true });
}

// ---------------------------------------------------------------- Pages
const pages = {
  async home() {
    // ---- static texts from settings
    $("#principalMsg").textContent = S.principalMessage;
    $("#principalName").textContent = S.principalName || "";
    $("#principalTitle").textContent = S.principalTitle || "অধ্যক্ষ";
    $("#principalPhoto").innerHTML = avatar(S.principalPhoto, S.principalName || "অধ্যক্ষ", "principal-img");
    $("#aboutShort").textContent = S.about;
    if (!S.admissionOpen) $("#heroAdmission").textContent = "ভর্তি তথ্য";
    $("#admissionBadge").textContent = S.admissionOpen ? L(`${bnNum(S.admissionSession)} শিক্ষাবর্ষে ভর্তি চলছে`, `Admission open for ${S.admissionSession}`) : "স্বাগতম";
    $("#admSlideTitle").innerHTML = S.admissionOpen ? L(`${esc(bnNum(S.admissionSession))} শিক্ষাবর্ষে <span>ভর্তি চলছে</span>`, `Admission open <span>for ${esc(S.admissionSession)}</span>`) : L(`ভর্তি <span>তথ্য</span>`, `Admission <span>information</span>`);

    // ---- statistics with count-up
    const years = /^\d{4}$/.test(String(S.estd).replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d))) ? new Date().getFullYear() - Number(String(S.estd).replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d))) : 0;
    const stats = [[S.statStudents, "শিক্ষার্থী", "users"], [S.statTeachers, "শিক্ষক-শিক্ষিকা", "user"], ["7", "শ্রেণি (৬ষ্ঠ–আলিম)", "book"], [S.statPass, "পাসের হার", "award"], [years > 0 ? String(years) + "+" : "", "বছরের পথচলা", "calendar"],
      ["3", "শিক্ষা স্তর (নিম্ন মাধ্যমিক, দাখিল, আলিম)", "cap"], ["2", "বিভাগ (সাধারণ ও বিজ্ঞান)", "list"]].filter(s => s[0]).slice(0, 4);
    $("#stats").innerHTML = stats.map(([v, l, ic]) => `<div class="stat"><span class="stat-ic">${icon(ic)}</span><div><b data-count="${esc(v)}">${esc(bnNum(v))}</b><span>${l}</span></div></div>`).join("");
    countUp($$("#stats [data-count]"));

    // ---- class strip with level filter
    const levels = ["সব", ...new Set(CLASSES.map(c => c.level))];
    const drawClasses = lv => {
      $$("#levelTabs button").forEach(b => b.classList.toggle("active", b.dataset.lv === lv));
      $("#classStrip").innerHTML = CLASSES.filter(c => lv === "সব" || c.level === lv).map(c => `<a class="class-pill" href="academics.html#${encodeURIComponent(c.name)}"><b>${c.short}</b><span>${c.name}</span><small>${c.level}</small><i class="cp-go">${icon("arrowRight", "sm")}</i></a>`).join("");
    };
    $("#levelTabs").innerHTML = levels.map(l => `<button type="button" role="tab" data-lv="${esc(l)}">${esc(l === "সব" ? "সকল শ্রেণি" : l)}</button>`).join("");
    $("#levelTabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) drawClasses(b.dataset.lv); });
    drawClasses("সব");

    // ---- admission countdown
    const deadline = S.admissionOpen && S.admissionLastDate ? new Date(S.admissionLastDate + "T23:59:59") : null;
    if (deadline && deadline > new Date()) {
      $("#admCard").hidden = false;
      $("#admCardTitle").textContent = L(`${bnNum(S.admissionSession)} শিক্ষাবর্ষে ভর্তির শেষ সময়`, `Admission deadline for ${S.admissionSession}`);
      $("#countdown").hidden = false;
      startCountdown(deadline, [$("#countdown"), $("#countdown2")]);
    }

    // ---- data
    let gallery = [];
    try {
      const [n, ev, g] = await Promise.all([store.list("notices", { publicOnly: true }), store.list("events", { publicOnly: true }), store.list("gallery", { publicOnly: true })]);
      gallery = g;
      const sorted = sortNotices(n);
      const cats = ["সব", ...new Set(sorted.map(x => x.category || "সাধারণ"))].slice(0, 6);
      const drawNotices = c => {
        $$("#noticeTabs button").forEach(b => b.classList.toggle("active", b.dataset.c === c));
        const f = sorted.filter(x => c === "সব" || (x.category || "সাধারণ") === c).slice(0, 5);
        $("#homeNotices").innerHTML = f.length ? f.map(noticeItem).join("") : empty("এই বিভাগে কোনো নোটিশ নেই।");
      };
      $("#noticeTabs").innerHTML = cats.length > 2 ? cats.map(c => `<button type="button" role="tab" data-c="${esc(c)}">${esc(c)}</button>`).join("") : "";
      $("#noticeTabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) drawNotices(b.dataset.c); });
      if (sorted.length) drawNotices("সব"); else $("#homeNotices").innerHTML = empty("এখনো কোনো নোটিশ প্রকাশিত হয়নি।");
      const today = new Date().toISOString().slice(0, 10);
      const up = ev.filter(e => (e.date || "") >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
      $("#homeEvents").innerHTML = up.length ? up.map(eventItem).join("") : empty("আসন্ন কোনো অনুষ্ঠান নেই।");
      const pics = g.filter(x => !x.slider).concat(g.filter(x => x.slider));
      $("#homeGallery").innerHTML = pics.length ? pics.slice(0, 8).map(galleryItem).join("") : empty("গ্যালারিতে ছবি যোগ করা হলে এখানে দেখা যাবে।");
      bindGallery(g);
    } catch (e) { $("#homeNotices").innerHTML = errBox(e); }

    // ---- hero slider (photos marked "show on home slider" in admin → gallery)
    heroSlider(gallery.filter(x => x.slider && safeUrl(x.imageUrl)).map(x => safeUrl(x.imageUrl)));
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
      <div class="cc-head"><b>${c.short}</b><div><h3>${c.name}</h3><small>${L(`${c.en} · ${c.level}${c.groups ? " · বিভাগ: " + GROUPS.join(", ") : ""}`, `${tr(c.level)}${c.groups ? " · Groups: " + GROUPS.map(tr).join(", ") : ""}`)}</small></div></div>
      <details><summary>${L(`বিষয়সমূহ (${bnNum(subjectsFor(S, c.name).length)}টি)`, `Subjects (${subjectsFor(S, c.name).length})`)}</summary><ol>${subjectsFor(S, c.name).map(s => `<li>${s.code ? `<span class="subj-code">${esc(bnNum(s.code))}</span>` : ""}<span>${esc(isEn() && s.nameEn ? s.nameEn : s.name)}</span> <small class="muted">· ${L("পূর্ণমান", "Full marks")} ${bnNum(s.full)}${s.group ? ` · ${esc(tr(s.group))}` : ""}</small></li>`).join("")}</ol></details></article>`).join("");
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
    cat.innerHTML = `<option value="">সকল ক্যাটাগরি</option>` + NOTICE_CATS.map(c => `<option value="${c}">${c}</option>`).join("");
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
    f.elements.className.innerHTML = CLASSES.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    f.exam.innerHTML = EXAMS.map(c => `<option value="${c}">${c}</option>`).join("");
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
        $("[data-print-sheet]", out).onclick = () => printSheets([r], S);
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
    f.elements.className.innerHTML = `<option value="">— নির্বাচন করুন —</option>` + CLASSES.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    f.group.innerHTML = `<option value="">প্রযোজ্য নয়</option>` + GROUPS.map(g => `<option value="${g}">${g}</option>`).join("");
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
        out.innerHTML = `<div class="track-card"><div><b>${esc(a.studentNameBn || a.studentName)}</b><p class="muted"><span>${esc(a.className)}</span> · ${L("আবেদন", "Applied")}: ${fmtDate(a.createdAt)}</p></div><span class="badge ${st[1]}">${st[0]}</span>${a.adminNote ? `<p class="note">অফিসের মন্তব্য: ${esc(a.adminNote)}</p>` : ""}</div>`;
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
      modal(`<div class="person-modal">${avatar(t.photoUrl, t.name, "avatar xl")}<div><h2 class="modal-title">${esc(t.name)}</h2><p><b>${esc(t.designation)}</b>${t.subject ? ` · <span>${esc(t.subject)}</span>` : ""}</p>
        ${t.qualification ? `<p class="meta">${icon("cap")}${esc(t.qualification)}</p>` : ""}${t.joinDate ? `<p class="meta">${icon("calendar")}${L("যোগদান", "Joined")}: ${fmtDate(t.joinDate)}</p>` : ""}${t.phone ? `<p class="meta">${icon("phone")}<a href="tel:${esc(t.phone)}">${esc(t.phone)}</a></p>` : ""}${t.email ? `<p class="meta">${icon("mail")}${esc(t.email)}</p>` : ""}
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
  return `<div class="event-item"><div class="ev-date"><b>${isNaN(d) ? "" : bnNum(d.getDate())}</b><span>${isNaN(d) ? "" : monthShort(d)}</span></div><div><h4>${esc(e.title)}</h4><p class="muted">${fmtDate(e.date)}${e.place ? ` · <span>${esc(e.place)}</span>` : ""}</p></div></div>`;
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
  return `<div class="ms-wrap">${screenSheet(r, S)}
    <div class="no-print btn-row ms-actions"><button type="button" class="btn btn-primary btn-lg" data-print-sheet>${icon("printer")}প্রিন্ট করুন (A4, এক পাতা)</button></div></div>`;
}

function printApplication(a) {
  const w = window.open("", "_blank");
  if (!w) { toast("পপ-আপ চালু করুন", "err"); return; }
  const row = (k, v) => v ? `<tr><th>${tr(k)}</th><td>${esc(tr(v))}</td></tr>` : "";
  w.document.write(`<!doctype html><html lang="${isEn() ? "en" : "bn"}"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Serif+Bengali:wght@400;600&display=swap"><title>${L("ভর্তি আবেদন", "Admission application")} ${esc(a.id)}</title>
  <style>body{font-family:"Noto Sans","SutonnyOMJ","Noto Serif Bengali",sans-serif;max-width:760px;margin:24px auto;color:#111;padding:0 16px}h1,h2{text-align:center;margin:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #999;padding:7px 10px;text-align:left;vertical-align:top}th{width:34%;background:#f3f3f3}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.ph{width:110px;height:130px;border:1px solid #999;object-fit:cover;display:grid;place-items:center;font-size:12px}.sign{display:flex;justify-content:space-between;margin-top:70px}.sign span{border-top:1px solid #333;padding-top:4px}</style></head><body>
  <h1>${esc(S.nameBn)}</h1><h2 style="font-weight:400">${esc(S.nameEn)}</h2><p style="text-align:center">${esc(S.address || "")}</p><hr>
  <div class="top"><div><h2 style="text-align:left">${L(`ভর্তি আবেদন — শিক্ষাবর্ষ ${esc(a.session)}`, `Admission Application — Academic year ${esc(a.session)}`)}</h2><p>${L("ট্র্যাকিং আইডি", "Tracking ID")}: <b>${esc(a.id)}</b><br>${L("তারিখ", "Date")}: ${fmtDate(a.createdAt)}</p></div>${a.photo ? `<img class="ph" src="${a.photo}">` : `<div class="ph">${L("ছবি", "Photo")}</div>`}</div>
  <table>${row("শিক্ষার্থীর নাম (বাংলা)", a.studentNameBn)}${row("Student name (English)", a.studentName)}${row("জন্ম তারিখ", a.dob)}${row("জন্ম নিবন্ধন নম্বর", a.birthReg)}${row("লিঙ্গ", a.gender)}${row("রক্তের গ্রুপ", a.blood)}${row("ভর্তিচ্ছু শ্রেণি", a.className)}${row("বিভাগ", a.group)}${row("পিতার নাম", a.fatherName)}${row("মাতার নাম", a.motherName)}${row("অভিভাবকের মোবাইল", a.guardianPhone)}${row("বর্তমান ঠিকানা", a.address)}${row("স্থায়ী ঠিকানা", a.permanentAddress)}${row(L("পূর্ববর্তী প্রতিষ্ঠান", "Previous institution"), a.prevInstitution)}${row(L("সর্বশেষ ফলাফল", "Last result"), a.prevResult)}${row("অন্যান্য তথ্য", a.notes)}</table>
  <div class="sign"><span>${L("অভিভাবকের স্বাক্ষর", "Guardian's signature")}</span><span>${L("গ্রহণকারীর স্বাক্ষর", "Received by")}</span><span>${L("অধ্যক্ষের স্বাক্ষর", "Principal's signature")}</span></div>
  <script>window.onload=()=>document.fonts.ready.then(()=>window.print())<\/script></body></html>`);
  w.document.close();
}

// ---------------------------------------------------------------- Interactive helpers
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const toLatin = s => String(s).replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d));

/** Animate numbers like "650+", "৯৮%" from 0 when they scroll into view. */
function countUp(els) {
  const run = el => {
    const m = toLatin(el.dataset.count).match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
    if (!m || reduceMotion) return;
    const [, pre, num, suf] = m, target = Number(num), dec = (num.split(".")[1] || "").length, t0 = performance.now(), dur = 1400;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - k, 3));
      el.textContent = bnNum(pre + v.toFixed(dec) + suf);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .6 });
  els.forEach(el => io.observe(el));
}

/** Days / hours / minutes / seconds until the admission deadline. */
function startCountdown(deadline, boxes) {
  const units = [["দিন", 86400], ["ঘণ্টা", 3600], ["মিনিট", 60], ["সেকেন্ড", 1]];
  const tick = () => {
    let s = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    const html = units.map(([l, n]) => { const v = Math.floor(s / n); s -= v * n; return `<div><b>${bnNum(String(v).padStart(2, "0"))}</b><span>${l}</span></div>`; }).join("");
    boxes.forEach(b => b && (b.innerHTML = html));
  };
  tick(); setInterval(tick, 1000);
}

/** Hero carousel: rotating text slides + optional background photos. */
function heroSlider(images) {
  const hero = $("#hero"), slides = $$(".hero-slide", hero), bg = $("#heroBg"), dots = $("#heroDots");
  if (!hero || !slides.length) return;
  bg.innerHTML = images.map((u, i) => `<div class="bg-img${i === 0 ? " on" : ""}" style="background-image:url('${esc(u).replace(/'/g, "%27")}')"></div>`).join("");
  hero.classList.toggle("has-photo", images.length > 0);
  dots.innerHTML = slides.map((_, i) => `<button type="button" role="tab" aria-label="${L("স্লাইড", "Slide")} ${bnNum(i + 1)}"></button>`).join("");
  let i = 0, timer = null;
  const go = n => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle("active", k === i); s.setAttribute("aria-hidden", k !== i); s.inert = k !== i; });
    $$("button", dots).forEach((d, k) => { d.classList.toggle("active", k === i); d.setAttribute("aria-selected", k === i); });
    if (images.length) $$(".bg-img", bg).forEach((b, k) => b.classList.toggle("on", k === i % images.length));
  };
  const play = () => { stop(); if (!reduceMotion) timer = setInterval(() => go(i + 1), 7000); };
  const stop = () => clearInterval(timer);
  $("#heroPrev").onclick = () => { go(i - 1); play(); };
  $("#heroNext").onclick = () => { go(i + 1); play(); };
  dots.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { go([...dots.children].indexOf(b)); play(); } });
  hero.addEventListener("mouseenter", stop); hero.addEventListener("mouseleave", play);
  hero.addEventListener("focusin", stop); hero.addEventListener("focusout", play);
  hero.addEventListener("keydown", e => { if (e.target.closest("input,select,textarea")) return; if (e.key === "ArrowLeft") go(i - 1); if (e.key === "ArrowRight") go(i + 1); });
  let x0 = null;
  $("#heroSlides").addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  $("#heroSlides").addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { go(i + (dx < 0 ? 1 : -1)); play(); } x0 = null; });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : play());
  go(0); play();
}

/** Fade sections in as they scroll into view. */
function setupReveal() {
  const els = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
  els.forEach(e => io.observe(e));
}

function backToTop() {
  const b = document.createElement("button");
  b.type = "button"; b.className = "to-top"; b.setAttribute("aria-label", "উপরে যান"); b.innerHTML = icon("arrowRight");
  b.onclick = () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  document.body.append(b);
  const header = $(".site-header");
  const onScroll = () => { b.classList.toggle("show", scrollY > 600); header?.classList.toggle("scrolled", scrollY > 10); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
}

/** This repository used to host another app with a service worker at the same
    address; remove any such leftover worker so it can't serve stale pages. */
function cleanupOldServiceWorkers() {
  const base = new URL(".", location.href).href;
  navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => { if (r.scope.startsWith(base)) r.unregister(); })).catch(() => { });
}

// ---------------------------------------------------------------- Boot
/** Settings as shown in English: the admin's English text if given, otherwise the
 *  English default when the Bangla text is still the default, otherwise the Bangla text. */
function englishSettings(s) {
  const out = { ...s };
  for (const k of ["slogan", "principalTitle", "principalMessage", "about", "mission", "vision", "admissionInfo", "history", "address", "principalName", "noticeTicker"]) {
    const en = String(s[k + "En"] || "").trim();
    if (en) out[k] = en;
    else if (DEFAULT_SETTINGS_EN[k] && s[k] === DEFAULT_SETTINGS[k]) out[k] = DEFAULT_SETTINGS_EN[k];
  }
  out.nameBn = s.nameEn || s.nameBn;  // the main name in the header, footer and result sheet
  return out;
}

document.documentElement.classList.add("js");
initLang();
(async function boot() {
  try { S = await store.getSettings(); } catch { S = (await import("./config.js")).DEFAULT_SETTINGS; }
  if (isEn()) S = englishSettings(S);
  translatePage();  // translates the static page now and anything rendered later
  renderLayout();
  hydrateIcons();
  $$("[data-s-text]").forEach(el => { const v = S[el.dataset.sText]; if (v) el.textContent = v; });
  ticker();
  setupReveal();
  backToTop();
  cleanupOldServiceWorkers();
  try { await pages[page]?.(); } catch (e) { console.error(e); }
  applyLang(); // re-apply language after dynamic content
})();
