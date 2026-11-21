// Result sheet (marksheet): one design used on screen, in the admin panel and
// for printing. Printing always produces exactly one A4 page per student — if a
// sheet has many subjects the text is shrunk step by step until it fits.
import { esc, bnNum, fmtDate, computeResult, GRADE_SCALE, LOGO_SVG } from "./common.js";
import { tr, trHTML, L, isEn } from "./i18n.js";

const FONTS = "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@400;500;600;700&display=swap";

/** Styles for the sheet. Sizes are in em so one font-size on .rs scales everything. */
export const SHEET_CSS = `
.rs{--g:#1e3a6e;--gd:#162c55;--gold:#d9a02a;--gold-l:#f6edd3;--line:#d7ddd8;--soft:#f5f8f5;--ink:#15211b;--mute:#5b6861;
  position:relative;background:#fff;color:var(--ink);font-family:"Noto Sans","SutonnyOMJ","Noto Serif Bengali",sans-serif;font-size:15px;line-height:1.5;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;text-align:left}
.rs *{box-sizing:border-box}
.rs-frame{position:relative;height:100%;border:.18em solid var(--g);padding:.32em;border-radius:.3em;background:#fff}
.rs-inner{position:relative;height:100%;border:.07em solid var(--gold);padding:1.3em 1.5em 1em;display:flex;flex-direction:column;overflow:hidden}
.rs-inner>*{flex-shrink:0}
.rs-c{position:absolute;width:1.1em;height:1.1em;border:.16em solid var(--gold);z-index:1}
.rs-c.tl{top:.35em;left:.35em;border-right:0;border-bottom:0}.rs-c.tr{top:.35em;right:.35em;border-left:0;border-bottom:0}
.rs-c.bl{bottom:.35em;left:.35em;border-right:0;border-top:0}.rs-c.br{bottom:.35em;right:.35em;border-left:0;border-top:0}
.rs-wm{position:absolute;left:50%;top:55%;width:58%;transform:translate(-50%,-50%);opacity:.05;pointer-events:none}
.rs-wm svg{width:100%;height:auto;display:block}
.rs-head{position:relative;display:grid;grid-template-columns:5.2em 1fr 5.2em;align-items:center;gap:.8em;text-align:center}
.rs-head .logo{width:5em;height:5em;display:block}
.rs-bis{font-family:"Amiri","Traditional Arabic","Noto Naskh Arabic",serif;color:var(--gold);font-size:1.05em;line-height:1.4;margin:0}
.rs-name{margin:.05em 0 0;font-size:1.75em;line-height:1.25;font-weight:700;color:var(--gd)}
.rs-en{margin:.1em 0 0;font-size:.72em;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-weight:600}
.rs-addr{margin:.15em 0 0;font-size:.74em;color:var(--mute)}
.rs-medal{width:5.2em;height:5.2em;border-radius:50%;border:.16em solid var(--gold);display:grid;place-content:center;text-align:center;background:var(--gold-l);color:var(--gd);line-height:1.1}
.rs-medal small{font-size:.62em;color:var(--mute);font-weight:600}
.rs-medal b{font-size:1.3em;font-weight:700}
.rs-medal i{font-style:normal;font-size:.7em;font-weight:700;color:var(--gold)}
.rs-ribbon{position:relative;display:flex;flex-direction:column;align-items:center;margin:.9em 0 1em}
.rs-ribbon::before{content:"";position:absolute;left:0;right:0;top:1em;border-top:.07em solid var(--line)}
.rs-ribbon span{position:relative;background:var(--g);color:#fff;font-weight:700;font-size:1.02em;padding:.3em 2.2em;clip-path:polygon(0 0,100% 0,95% 50%,100% 100%,0 100%,5% 50%);letter-spacing:.02em}
.rs-ribbon em{font-style:normal;margin-top:.35em;font-weight:700;color:#8a6a14;font-size:.92em}
.rs-info{position:relative;display:grid;grid-template-columns:1fr 1fr;border:.07em solid var(--line);border-radius:.4em;overflow:hidden;font-size:.9em;margin-bottom:1em;background:rgba(255,255,255,.85)}
.rs-info div{display:flex;gap:.6em;padding:.45em .8em;border-bottom:.07em solid var(--line)}
.rs-info div:nth-child(odd){border-right:.07em solid var(--line)}
.rs-info div:nth-last-child(-n+2){border-bottom:0}
.rs-info dt{flex:none;width:7.2em;color:var(--mute)}
.rs-info dd{margin:0;font-weight:700;min-width:0;overflow-wrap:anywhere}
.rs-table{position:relative;width:100%;border-collapse:collapse;font-size:.9em;background:rgba(255,255,255,.88)}
.rs-table th{background:var(--g);color:#fff;font-weight:600;padding:.45em .6em;text-align:left;border:.07em solid var(--g)}
.rs-table td{padding:.36em .6em;border:.07em solid var(--line)}
.rs-table tbody tr:nth-child(even) td{background:var(--soft)}
.rs-table .n{text-align:center;white-space:nowrap}
.rs-table .sl{width:2.6em;text-align:center;color:var(--mute)}
.rs-table th.sl{color:#fff}
.rs-table tr.f td{color:#b42318;font-weight:600}
.rs-table tfoot td{background:var(--gold-l);font-weight:700;border-color:#e7d7a8}
.rs-grade{display:inline-block;min-width:2.3em;padding:0 .3em;border-radius:.3em;font-weight:700;background:#e9f4ee;color:var(--gd)}
tr.f .rs-grade{background:#fde8e6;color:#b42318}
.rs-sum{position:relative;display:grid;grid-template-columns:repeat(var(--cols,5),minmax(0,1fr));gap:.5em;margin:1em 0 .8em}
.rs-sum div{border:.07em solid var(--line);border-top:.22em solid var(--gold);border-radius:.35em;padding:.4em .3em;text-align:center;background:#fff}
.rs-sum span{display:block;font-size:.74em;color:var(--mute);font-weight:600}
.rs-sum b{font-size:1.3em;color:var(--gd);line-height:1.25}
.rs-sum .pass{color:#067647}.rs-sum .fail{color:#b42318}
.rs-bottom{position:relative;margin-top:auto;display:grid;grid-template-columns:1fr 1.25fr;gap:1.2em;align-items:end}
.rs-scale{border-collapse:collapse;font-size:.68em;width:100%}
.rs-scale caption{text-align:left;font-weight:700;color:var(--gd);margin-bottom:.2em;font-size:1.1em}
.rs-scale th,.rs-scale td{border:.1em solid var(--line);padding:.12em .4em;text-align:center}
.rs-scale th{background:var(--soft);font-weight:600}
.rs-remark{font-size:.82em;margin:0 0 .4em;color:var(--ink)}
.rs-sign{display:flex;justify-content:space-between;gap:1em;padding-top:2.6em}
.rs-sign span{flex:1;border-top:.07em solid var(--ink);padding-top:.25em;text-align:center;font-size:.8em;font-weight:600}
.rs-foot{position:relative;display:flex;justify-content:space-between;gap:1em;margin-top:.8em;padding-top:.4em;border-top:.07em dashed var(--line);font-size:.66em;color:var(--mute)}
.rs-foot span:last-child{text-align:right;overflow-wrap:anywhere}
@media (max-width:640px){
  .rs.screen{font-size:12.5px}
  .rs.screen .rs-inner{padding:1em .8em .8em}
  .rs.screen .rs-head{grid-template-columns:3.6em 1fr;}
  .rs.screen .rs-head .logo{width:3.6em;height:3.6em}
  .rs.screen .rs-medal{grid-column:1/-1;justify-self:center;width:auto;height:auto;border-radius:2em;padding:.3em 1.2em;display:flex;gap:.6em;align-items:baseline}
  .rs.screen .rs-name{font-size:1.4em}
  .rs.screen .rs-info{grid-template-columns:1fr}
  .rs.screen .rs-info div,.rs.screen .rs-info div:nth-child(odd){border-right:0;border-bottom:.07em solid var(--line)}
  .rs.screen .rs-info div:last-child{border-bottom:0}
  .rs.screen .rs-table .sl{display:none}
  .rs.screen .rs-table th,.rs.screen .rs-table td{padding:.4em .35em}
  .rs.screen .rs-sum{grid-template-columns:repeat(3,minmax(0,1fr))}
  .rs.screen .rs-bottom{grid-template-columns:1fr}
}`;

function verifyUrl(r) {
  try {
    const u = new URL("results.html", location.href.replace(/admin\.html.*$/, ""));
    u.search = new URLSearchParams({ year: r.year, exam: r.exam, className: r.className, roll: r.roll });
    return u.href;
  } catch { return ""; }
}

/** One sheet. mode = "screen" (responsive) or "print" (A4). */
export function sheetHTML(r, S, mode = "screen") {
  const c = computeResult(r.subjects);
  const pct = c.fullTotal ? (c.total / c.fullTotal) * 100 : 0;
  const info = [["শিক্ষার্থীর নাম", r.studentName], ["রোল নম্বর", bnNum(r.roll)], ["পিতার নাম", r.fatherName || "—"], ["শ্রেণি", tr(r.className) + (r.group ? ` (${tr(r.group)})` : "")], ["পরীক্ষা", tr(r.exam)], ["শিক্ষাবর্ষ", bnNum(r.year)]];
  const sum = [["মোট নম্বর", `${bnNum(c.total)}/${bnNum(c.fullTotal)}`], ["শতকরা", bnNum(pct.toFixed(1)) + "%"], ["জিপিএ", bnNum(c.gpa.toFixed(2))], ["লেটার গ্রেড", c.grade], [L("ফলাফল", "Result"), `<span class="${c.passed ? "pass" : "fail"}">${c.passed ? "উত্তীর্ণ" : "অনুত্তীর্ণ"}</span>`]];
  if (r.position) sum.push(["মেধাস্থান", bnNum(r.position)]);
  const ids = [S.eiin ? `EIIN: ${esc(S.eiin)}` : "", S.madrasaCode ? `মাদ্রাসা কোড: ${esc(S.madrasaCode)}` : ""].filter(Boolean).join(" · ");
  const url = verifyUrl(r);
  return trHTML(`<article class="rs ${mode}"><div class="rs-frame"><div class="rs-inner">
    <i class="rs-c tl"></i><i class="rs-c tr"></i><i class="rs-c bl"></i><i class="rs-c br"></i>
    <div class="rs-wm" aria-hidden="true">${LOGO_SVG}</div>
    <header class="rs-head">
      ${LOGO_SVG}
      <div><p class="rs-bis" lang="ar">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</p><h2 class="rs-name">${esc(S.nameBn)}</h2>${isEn() ? "" : `<p class="rs-en">${esc(S.nameEn)}</p>`}${S.address || ids ? `<p class="rs-addr">${esc(S.address || "")}${S.address && ids ? " · " : ""}${ids}</p>` : ""}</div>
      <div class="rs-medal"><small>জিপিএ</small><b>${bnNum(c.gpa.toFixed(2))}</b><i>${c.grade}</i></div>
    </header>
    <div class="rs-ribbon"><span>একাডেমিক ট্রান্সক্রিপ্ট</span><em>${esc(tr(r.exam))} — ${bnNum(r.year)}</em></div>
    <dl class="rs-info">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <table class="rs-table"><thead><tr><th class="sl">ক্রম</th><th>বিষয়</th><th class="n">পূর্ণমান</th><th class="n">প্রাপ্ত নম্বর</th><th class="n">লেটার গ্রেড</th><th class="n">গ্রেড পয়েন্ট</th></tr></thead>
      <tbody>${c.rows.map((s, i) => `<tr class="${s.grade === "F" ? "f" : ""}"><td class="sl">${bnNum(i + 1)}</td><td>${esc(tr(s.subject))}</td><td class="n">${bnNum(s.full)}</td><td class="n">${s.marks === "AB" ? "অনুপস্থিত" : bnNum(s.marks)}</td><td class="n"><span class="rs-grade">${s.grade}</span></td><td class="n">${bnNum(s.gp.toFixed(2))}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td class="sl"></td><td>সর্বমোট</td><td class="n">${bnNum(c.fullTotal)}</td><td class="n">${bnNum(c.total)}</td><td class="n">${c.grade}</td><td class="n">${bnNum(c.gpa.toFixed(2))}</td></tr></tfoot></table>
    <div class="rs-sum" style="--cols:${sum.length}">${sum.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
    <div class="rs-bottom">
      <table class="rs-scale"><caption>গ্রেডিং পদ্ধতি</caption><tr><th>নম্বর</th>${GRADE_SCALE.map(([min], i) => `<td>${bnNum(i === 0 ? "৮০+" : min + "–" + (GRADE_SCALE[i - 1][0] - 1))}</td>`).join("")}</tr><tr><th>গ্রেড</th>${GRADE_SCALE.map(([, g]) => `<td>${g}</td>`).join("")}</tr><tr><th>পয়েন্ট</th>${GRADE_SCALE.map(([, , gp]) => `<td>${bnNum(gp.toFixed(1))}</td>`).join("")}</tr></table>
      <div>${r.remarks ? `<p class="rs-remark"><b>মন্তব্য:</b> ${esc(r.remarks)}</p>` : ""}<div class="rs-sign"><span>শ্রেণি শিক্ষক</span><span>পরীক্ষা নিয়ন্ত্রক</span><span>অধ্যক্ষ</span></div></div>
    </div>
    <footer class="rs-foot"><span>${L("প্রকাশের তারিখ", "Issued on")}: ${fmtDate(Date.now())} · ${L("এটি কম্পিউটারে তৈরি ফলাফলপত্র", "This is a computer-generated result sheet")}</span>${url ? `<span>${L("যাচাই", "Verify")}: ${esc(url.replace(/^https?:\/\//, "").split("?")[0])}</span>` : ""}</footer>
  </div></div></article>`);
}

let cssInjected = false;
/** On-screen marksheet with a print button. */
export function screenSheet(r, S) {
  if (!cssInjected) { const st = document.createElement("style"); st.textContent = SHEET_CSS; document.head.append(st); cssInjected = true; }
  return sheetHTML(r, S, "screen");
}

/** Open a print-ready A4 document: one page per result, each forced to fit one page. */
export function printSheets(list, S) {
  const pages = list.map(r => `<section class="page">${sheetHTML(r, S, "print")}</section>`).join("");
  const title = list.length === 1 ? `${L("ফলাফল", "Result")} — ${list[0].studentName} (${L("রোল", "Roll")} ${bnNum(list[0].roll)})` : `${L("ফলাফল", "Results")} — ${tr(list[0].className)} ${tr(list[0].exam)} ${bnNum(list[0].year)}`;
  const doc = `<!doctype html><html lang="${isEn() ? "en" : "bn"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="${FONTS}">
<style>
@page{size:A4 portrait;margin:0}
html,body{margin:0;padding:0}
body{background:#e7ebe8;font-family:"Noto Sans","SutonnyOMJ","Noto Serif Bengali",sans-serif}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px;background:#162c55;color:#fff;font-size:14px}
.bar button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:8px 18px;cursor:pointer;background:#c79a2b;color:#0e1d3a}
.bar button.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)}
.pages{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0 32px}
.page{width:210mm;height:297mm;padding:9mm;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.18);overflow:hidden;zoom:var(--z,1)}
.page>.rs{height:100%;font-size:10.5pt}
${SHEET_CSS}
@media print{
  body{background:#fff}.bar{display:none}.pages{display:block;padding:0}
  .page{zoom:1;box-shadow:none;margin:0;break-after:page;page-break-after:always}
  .page:last-child{break-after:auto;page-break-after:auto}
}
</style></head><body>
<div class="bar"><span>${L(`${list.length > 1 ? bnNum(list.length) + "টি ফলাফলপত্র · " : ""}A4 সাইজ, প্রতিটি এক পাতায়`, `${list.length > 1 ? list.length + " result sheets · " : ""}A4 size, one page each`)}</span><button onclick="print()">${L("প্রিন্ট / PDF সংরক্ষণ", "Print / Save as PDF")}</button><button class="ghost" onclick="close()">${L("বন্ধ করুন", "Close")}</button></div>
<main class="pages">${pages}</main>
<script>
function fit(){
  document.querySelectorAll('.page').forEach(function(p){
    var rs=p.querySelector(".rs"), inner=p.querySelector(".rs-inner"), size=12.5;
    rs.style.fontSize=size+'pt';
    while(inner.scrollHeight>inner.clientHeight+1 && size>6.5){ size-=.25; rs.style.fontSize=size+'pt'; }
  });
}
function scalePreview(){
  var w=document.documentElement.clientWidth-16, mm=210*96/25.4;
  document.documentElement.style.setProperty('--z', Math.min(1, w/mm));
}
addEventListener('resize', scalePreview);
addEventListener('beforeprint', fit);
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
  scalePreview(); fit(); setTimeout(function(){ print(); }, 300);
});
<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(L("প্রিন্ট পাতা খুলতে পপ-আপ চালু করুন।", "Please allow pop-ups to open the print page.")); return; }
  w.document.open(); w.document.write(doc); w.document.close();
}
