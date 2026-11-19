// Bangla / English for the public website.
// Bangla is written directly in the pages and scripts. In English mode every
// text node (and placeholder/title/alt/aria-label) whose text is a key of the
// dictionary below is swapped for its English — including content that is
// added later (lists, modals, the result sheet) via a MutationObserver.
// Numbers and dates follow the language (see common.js). The admin panel
// always stays in Bangla.
import { DICT } from "./i18n-dict.js";

let LANG = "bn";
export const getLang = () => LANG;
export const isEn = () => LANG === "en";

/** Read the visitor's choice (public site only). */
export function initLang() {
  try { LANG = localStorage.getItem("siam_lang") === "en" ? "en" : "bn"; } catch { LANG = "bn"; }
  document.documentElement.lang = LANG;
  return LANG;
}
export function setLang(l) {
  try { localStorage.setItem("siam_lang", l); } catch { }
  location.reload();
}

/** Translate one string: exact match, then trimmed match (keeping surrounding spaces). */
export function tr(s) {
  if (LANG !== "en" || s == null) return s;
  s = String(s);
  if (DICT[s] !== undefined) return DICT[s];
  const t = s.trim();
  if (t && DICT[t] !== undefined) return s.replace(t, DICT[t]);
  return s;
}
/** Translate every text segment of an HTML string (used for print pages, which
 *  are separate documents without the live translator). */
export function trHTML(html) {
  if (LANG !== "en") return html;
  return html.replace(/>([^<>]+)</g, (m, t) => ">" + tr(t) + "<");
}
/** Pick the English or Bangla variant. */
export const L = (bn, en) => (LANG === "en" ? en : bn);

const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "NOSCRIPT"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt", "data-bn-label"];
function walk(node) {
  if (node.nodeType === 3) {
    if (node.parentElement?.closest("[data-no-tr]")) return;
    const v = node.nodeValue, nv = tr(v);
    if (nv !== v) node.nodeValue = nv;
    return;
  }
  if (node.nodeType !== 1 || SKIP.has(node.tagName) || node.hasAttribute("data-no-tr")) return;
  for (const a of ATTRS) if (node.hasAttribute(a)) { const v = node.getAttribute(a), nv = tr(v); if (nv !== v) node.setAttribute(a, nv); }
  if (node.tagName === "INPUT" && (node.type === "submit" || node.type === "button") && node.value) node.value = tr(node.value);
  for (const c of node.childNodes) walk(c);
}

/** Translate the page now and keep translating whatever is added later. */
export function translatePage() {
  if (LANG !== "en") return;
  document.title = document.title.split(" | ").map(tr).join(" | ");
  walk(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === "childList") m.addedNodes.forEach(walk);
      else if (m.type === "characterData") { if (m.target.parentElement?.closest("[data-no-tr]")) continue; const v = m.target.nodeValue, nv = tr(v); if (nv !== v) m.target.nodeValue = nv; }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
