// Shared constants and helpers used by the public site and admin portal.
import { getLang } from "./i18n.js";
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = u => { u = String(u || "").trim(); return /^(https?:|data:image\/|data:application\/|\.{0,2}\/|[\w-]+[.\/])/i.test(u) && !/^javascript:/i.test(u) ? u : ""; };
const BN = "০১২৩৪৫৬৭৮৯";
// Digits follow the visitor's language (Bangla digits unless the site is in English).
export const bnNum = n => getLang() === "en" ? String(n ?? "").replace(/[০-৯]/g, d => BN.indexOf(d)) : String(n ?? "").replace(/\d/g, d => BN[d]);
const LOCALE = () => getLang() === "en" ? "en-GB" : "bn-BD";
export const monthShort = d => d.toLocaleString(LOCALE(), { month: "short" });
export const fmtDate = (t, opt = { day: "numeric", month: "long", year: "numeric" }) => {
  if (!t) return "";
  const d = typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(t + "T00:00:00") : new Date(t);
  return isNaN(d) ? "" : (opt.timeStyle ? d.toLocaleString(LOCALE(), opt) : d.toLocaleDateString(LOCALE(), opt));
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
  m.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true"><button class="modal-x" aria-label="বন্ধ করুন">${icon("x")}</button><div class="modal-body">${html}</div></div>`;
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

export const LOGO_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true" class="logo"><rect width="64" height="64" rx="14" fill="#14532d"/><path d="M36 13a13 13 0 1 0 9.5 21.5A10.5 10.5 0 1 1 36 13z" fill="#fff"/><path d="M43.5 16.5l1.4 2.9 3.2.4-2.4 2.2.7 3.2-2.9-1.6-2.9 1.6.7-3.2-2.4-2.2 3.2-.4z" fill="#fff"/><path d="M15 44.5c5.6-2.6 11.3-2.6 17 0 5.7-2.6 11.4-2.6 17 0V51c-5.6-2.6-11.3-2.6-17 0-5.7-2.6-11.4-2.6-17 0z" fill="#fff" opacity=".9"/></svg>`;

// ---------------------------------------------------------------- Icons (24px line icons, stroke = currentColor)
const ICONS = {
  arrowRight: "M5 12h14M13 6l6 6-6 6", arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14", upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6", pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2", lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  file: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6",
  chart: "M4 20h16M7 16v-5M12 16V7M17 16v-8", bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  book: "M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z",
  flask: "M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3M7 15h10",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14L7 22l5-3 5 3-1.5-8",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1",
  cap: "M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6",
  clip: "M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7",
  pinned: "M9 3h6l-1 6 4 4H6l4-4zM12 13v8", search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  printer: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z", check: "M5 12l5 5L20 7", x: "M6 6l12 12M18 6L6 18",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  plus: "M12 5v14M5 12h14", image: "M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  settings: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4",
  database: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  grid: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z", inbox: "M4 13l2.5-8h11l2.5 8v6H4zM4 13h5l1 2h4l1-2h5",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11", idcard: "M3 5h18v14H3zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 16a3 3 0 0 1 6 0M14 9h4M14 13h4",
  folder: "M3 6h6l2 2h10v11H3z", alert: "M12 4l9 16H3zM12 10v4M12 17h.01", home: "M4 11l8-7 8 7M6 9v11h12V9",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01", key: "M15 9a4 4 0 1 0-3.5 4L9 15.5V18H6.5v2.5H4V18l6-6M15.5 8.5h.01"
};
/** Inline SVG icon. Purely decorative (aria-hidden) — always pair with text or a title. */
export const icon = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[name] || ICONS.info}"/></svg>`;
/** Replace <i data-icon="name"></i> placeholders in static HTML. */
export function hydrateIcons(root = document) { root.querySelectorAll("i[data-icon]").forEach(el => { el.outerHTML = icon(el.dataset.icon, el.className); }); }
