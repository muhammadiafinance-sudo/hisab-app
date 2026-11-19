// Shared constants and helpers used by the public site and admin portal.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = u => { u = String(u || "").trim(); return /^(https?:|data:image\/|data:application\/|\.?\/|[\w-]+\.)/i.test(u) && !/^javascript:/i.test(u) ? u : ""; };
const BN = "০১২৩৪৫৬৭৮৯";
export const bnNum = n => String(n ?? "").replace(/\d/g, d => BN[d]);
export const fmtDate = (t, opt = { day: "numeric", month: "long", year: "numeric" }) => {
  if (!t) return "";
  const d = typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(t + "T00:00:00") : new Date(t);
  return isNaN(d) ? "" : (opt.timeStyle ? d.toLocaleString("bn-BD", opt) : d.toLocaleDateString("bn-BD", opt));
};

// ---------------------------------------------------------------- Academic structure
export const CLASSES = [
  { name: "ষষ্ঠ শ্রেণি", en: "Class Six", level: "নিম্ন মাধ্যমিক", short: "৬" },
  { name: "সপ্তম শ্রেণি", en: "Class Seven", level: "নিম্ন মাধ্যমিক", short: "৭" },
  { name: "অষ্টম শ্রেণি", en: "Class Eight", level: "নিম্ন মাধ্যমিক", short: "৮" },
  { name: "নবম শ্রেণি", en: "Class Nine (Dakhil)", level: "দাখিল", short: "৯", groups: true },
  { name: "দশম শ্রেণি", en: "Class Ten (Dakhil)", level: "দাখিল", short: "১০", groups: true },
  { name: "আলিম ১ম বর্ষ", en: "Alim 1st Year", level: "আলিম", short: "আ-১", groups: true },
  { name: "আলিম ২য় বর্ষ", en: "Alim 2nd Year", level: "আলিম", short: "আ-২", groups: true }
];
export const GROUPS = ["সাধারণ", "বিজ্ঞান"];
export const EXAMS = ["প্রথম সাময়িক পরীক্ষা", "অর্ধবার্ষিক পরীক্ষা", "দ্বিতীয় সাময়িক পরীক্ষা", "বার্ষিক পরীক্ষা", "প্রাক-নির্বাচনী পরীক্ষা", "নির্বাচনী পরীক্ষা", "মডেল টেস্ট"];
export const NOTICE_CATS = ["সাধারণ", "ভর্তি", "পরীক্ষা", "ফলাফল", "ছুটি", "অনুষ্ঠান", "শিক্ষক-কর্মচারী"];

const JR = ["কুরআন মাজিদ ও তাজভিদ", "আকাইদ ও ফিকহ", "আরবি ১ম পত্র", "আরবি ২য় পত্র", "বাংলা ১ম পত্র", "বাংলা ২য় পত্র", "ইংরেজি ১ম পত্র", "ইংরেজি ২য় পত্র", "গণিত", "বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "তথ্য ও যোগাযোগ প্রযুক্তি"];
const DK = ["কুরআন মাজিদ ও তাজভিদ", "হাদিস শরিফ", "আকাইদ ও ফিকহ", "আরবি ১ম পত্র", "আরবি ২য় পত্র", "বাংলা ১ম পত্র", "বাংলা ২য় পত্র", "ইংরেজি ১ম পত্র", "ইংরেজি ২য় পত্র", "গণিত", "তথ্য ও যোগাযোগ প্রযুক্তি", "বিজ্ঞান / পদার্থ", "ইসলামের ইতিহাস / রসায়ন", "জীববিজ্ঞান / উচ্চতর গণিত"];
const AL = ["কুরআন মাজিদ", "হাদিস শরিফ", "আরবি ১ম পত্র", "আরবি ২য় পত্র", "বাংলা", "ইংরেজি", "তথ্য ও যোগাযোগ প্রযুক্তি", "ফিকহ ও উসুলুল ফিকহ", "ইসলামের ইতিহাস / পদার্থবিজ্ঞান", "রসায়ন / ইসলামি দর্শন", "জীববিজ্ঞান / উচ্চতর গণিত"];
export const DEFAULT_SUBJECTS = {
  "ষষ্ঠ শ্রেণি": JR, "সপ্তম শ্রেণি": JR, "অষ্টম শ্রেণি": JR,
  "নবম শ্রেণি": DK, "দশম শ্রেণি": DK, "আলিম ১ম বর্ষ": AL, "আলিম ২য় বর্ষ": AL
};
export const subjectsFor = (settings, cls) => (settings?.subjects?.[cls]?.length ? settings.subjects[cls] : DEFAULT_SUBJECTS[cls]) || [];

// ---------------------------------------------------------------- Grading (Bangladesh scale)
export const GRADE_SCALE = [
  [80, "A+", 5.0], [70, "A", 4.0], [60, "A-", 3.5], [50, "B", 3.0], [40, "C", 2.0], [33, "D", 1.0], [0, "F", 0.0]
];
export function gradeOf(marks, full = 100) {
  const p = full ? (Number(marks) / Number(full)) * 100 : 0;
  for (const [min, g, gp] of GRADE_SCALE) if (p >= min) return { grade: g, gp };
  return { grade: "F", gp: 0 };
}
export function gradeFromGpa(g) {
  if (g >= 5) return "A+"; if (g >= 4) return "A"; if (g >= 3.5) return "A-";
  if (g >= 3) return "B"; if (g >= 2) return "C"; if (g >= 1) return "D"; return "F";
}
/** subjects: [{subject, full, marks}] → computed summary */
export function computeResult(subjects = []) {
  const rows = subjects.filter(s => s && s.subject).map(s => {
    const absent = s.marks === "" || s.marks === null || s.marks === undefined || String(s.marks).toUpperCase() === "AB";
    const g = absent ? { grade: "F", gp: 0 } : gradeOf(s.marks, s.full || 100);
    return { ...s, full: Number(s.full || 100), marks: absent ? "AB" : Number(s.marks), ...g };
  });
  const total = rows.reduce((a, r) => a + (typeof r.marks === "number" ? r.marks : 0), 0);
  const fullTotal = rows.reduce((a, r) => a + r.full, 0);
  const failed = rows.filter(r => r.grade === "F").length;
  const gpa = rows.length && !failed ? Math.round((rows.reduce((a, r) => a + r.gp, 0) / rows.length) * 100) / 100 : 0;
  return { rows, total, fullTotal, failed, gpa, grade: failed ? "F" : gradeFromGpa(gpa), passed: rows.length > 0 && !failed };
}

// ---------------------------------------------------------------- UI helpers
export function toast(msg, type = "ok") {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.append(box); }
  const t = document.createElement("div");
  t.className = "toast " + type; t.textContent = msg; box.append(t);
  setTimeout(() => t.classList.add("hide"), 3200); setTimeout(() => t.remove(), 3800);
}
export function modal(html, { wide = false } = {}) {
  const m = document.createElement("div");
  m.className = "modal-bg";
  m.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true"><button class="modal-x" aria-label="বন্ধ করুন">×</button><div class="modal-body">${html}</div></div>`;
  const close = () => { m.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => e.key === "Escape" && close();
  m.addEventListener("click", e => { if (e.target === m || e.target.closest(".modal-x")) close(); });
  document.addEventListener("keydown", onKey);
  document.body.append(m);
  return { el: m, close };
}
export const initials = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("");
export const avatar = (url, name, cls = "avatar") => safeUrl(url)
  ? `<img class="${cls}" src="${esc(safeUrl(url))}" alt="${esc(name)}" loading="lazy">`
  : `<div class="${cls} avatar-ph" aria-hidden="true">${esc(initials(name))}</div>`;

export function downloadFile(name, content, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function toCSV(rows, cols) {
  const q = v => { v = String(v ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return "﻿" + [cols.map(c => q(c[0])).join(","), ...rows.map(r => cols.map(c => q(c[1](r))).join(","))].join("\n");
}
export function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

export const LOGO_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#0d3b33" stroke="#d4af5a" stroke-width="2.5"/><path d="M38 14a14 14 0 1 0 10 22 11 11 0 1 1-10-22z" fill="#d4af5a"/><path d="M45 17l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#d4af5a"/><path d="M16 44c5-2.4 10.5-2.4 16 0 5.5-2.4 11-2.4 16 0v6c-5-2.4-10.5-2.4-16 0-5.5-2.4-11-2.4-16 0z" fill="#f4ecd6"/><path d="M32 44v6" stroke="#0d3b33" stroke-width="1.4"/></svg>`;
