// Data layer: one API for three back ends.
//   "api"      — the madrasha's own PHP server (api/index.php)   ← recommended
//   "firebase" — Google Firebase, if configured in config.js
//   "demo"     — browser localStorage only (nothing is shared)
import { FIREBASE, DEFAULT_SETTINGS, DEMO_DEFAULT_PASSWORD, BACKEND, API_URL } from "./config.js";

const FB_VER = "10.14.1";
const LS_KEY = "siam_db_v1";
const fbConfigured = !Object.values(FIREBASE).some(v => !v || String(v).includes("YOUR_"));

export let MODE = "demo";
async function detect() {
  if (BACKEND === "demo") return MODE = "demo";
  if (BACKEND === "firebase") return MODE = "firebase";
  if (BACKEND === "auto" || BACKEND === "php") {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
      const r = await fetch(API_URL + "?a=ping", { signal: ctl.signal, cache: "no-store", credentials: "same-origin" });
      clearTimeout(t);
      const j = await r.json();
      if (j?.ok && j.data?.backend === "php") return MODE = "api";
    } catch { /* not a PHP host (e.g. GitHub Pages) */ }
    if (BACKEND === "php") console.warn("PHP backend not reachable at", API_URL);
  }
  return MODE = fbConfigured ? "firebase" : "demo";
}
/** Resolves once the back end is known. Every function below awaits it. */
export const ready = detect();

// ---------------------------------------------------------------- PHP API
let csrf = null;
async function api(action, body = {}) {
  const r = await fetch(API_URL + "?a=" + action, {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
    body: JSON.stringify(body)
  });
  let j;
  try { j = await r.json(); } catch { throw new Error("সার্ভার থেকে সঠিক উত্তর পাওয়া যায়নি (" + r.status + ")"); }
  if (!j.ok) { const e = new Error(j.error || "Error"); e.status = r.status; throw e; }
  return j.data;
}

// ---------------------------------------------------------------- Firebase
let fbPromise = null;
function fb() {
  if (!fbPromise) {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    fbPromise = Promise.all(["firebase-app", "firebase-auth", "firebase-firestore", "firebase-storage"].map(m => import(base + m + ".js")))
      .then(([app, auth, fs, st]) => {
        const a = app.initializeApp(FIREBASE);
        return { auth, fs, st, A: auth.getAuth(a), D: fs.getFirestore(a), S: st.getStorage(a) };
      });
  }
  return fbPromise;
}

// ---------------------------------------------------------------- Local (demo)
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; }
}
function saveLocal(db) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)); }
  catch (e) { throw new Error("ব্রাউজারের স্টোরেজ পূর্ণ। বড় ছবি মুছে ফেলুন বা নিজস্ব সার্ভার ব্যবহার করুন।"); }
}
let local = null;
function L() {
  if (!local) { local = loadLocal(); if (!local) { local = seed(); saveLocal(local); } }
  return local;
}
function seed() {
  const now = Date.now(), day = 86400000;
  const db = { notices: {}, events: {}, results: {}, settings: {}, teachers: {}, gallery: {}, downloads: {}, routines: {}, admissions: {}, students: {}, messages: {} };
  const n = (id, title, category, body, ago, pinned = false) =>
    db.notices[id] = { title, category, body, fileUrl: "", published: true, pinned, createdAt: now - ago * day };
  n("demo1", "নমুনা নোটিশ: ২০২৭ শিক্ষাবর্ষে ভর্তি চলছে", "ভর্তি", "প্রথম শ্রেণি থেকে আলিম পর্যন্ত সকল শ্রেণিতে ভর্তি চলছে। অনলাইনে আবেদন করুন অথবা অফিসে যোগাযোগ করুন। (এটি ডেমো তথ্য — অ্যাডমিন প্যানেল থেকে মুছে ফেলুন)", 1, true);
  n("demo2", "নমুনা নোটিশ: বার্ষিক পরীক্ষার সময়সূচি প্রকাশ", "পরীক্ষা", "বার্ষিক পরীক্ষার সময়সূচি ডাউনলোড পাতায় পাওয়া যাবে। (ডেমো তথ্য)", 4);
  n("demo3", "নমুনা নোটিশ: শীতকালীন ছুটি", "ছুটি", "শীতকালীন ছুটি উপলক্ষে মাদ্রাসা বন্ধ থাকবে। (ডেমো তথ্য)", 9);
  db.events.demoE1 = { title: "বার্ষিক পরীক্ষা শুরু (নমুনা)", date: new Date(now + 7 * day).toISOString().slice(0, 10), place: "মাদ্রাসা প্রাঙ্গণ", published: true, createdAt: now };
  db.events.demoE2 = { title: "বার্ষিক ক্রীড়া প্রতিযোগিতা (নমুনা)", date: new Date(now + 30 * day).toISOString().slice(0, 10), place: "মাদ্রাসা মাঠ", published: true, createdAt: now };
  const subjects = [["কুরআন মাজিদ ও তাজভিদ", 88], ["আকাইদ ও ফিকহ", 79], ["আরবি ১ম পত্র", 74], ["বাংলা", 81], ["ইংরেজি", 66], ["গণিত", 92], ["বিজ্ঞান", 70]];
  db.results[resultId(new Date().getFullYear(), "বার্ষিক পরীক্ষা", "ষষ্ঠ শ্রেণি", "1")] = {
    year: new Date().getFullYear(), exam: "বার্ষিক পরীক্ষা", className: "ষষ্ঠ শ্রেণি", group: "", roll: "1",
    studentName: "নমুনা শিক্ষার্থী (ডেমো)", fatherName: "", subjects: subjects.map(([subject, marks]) => ({ subject, full: 100, marks })),
    published: true, createdAt: now
  };
  return db;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------------------------------------------------------------- Public API
export function resultId(year, exam, className, roll) {
  return [year, exam, className, String(roll).trim()].join("_").replace(/[\/\s]+/g, "-");
}

/** list(col, {publicOnly, where:{field:value}}) → array of {id,...} newest first */
export async function list(col, opt = {}) {
  await ready;
  let out;
  if (MODE === "api") {
    out = await api("list", { col, publicOnly: !!opt.publicOnly, where: opt.where || {} });
  } else if (MODE === "firebase") {
    const { fs, D } = await fb();
    const cons = [];
    if (opt.publicOnly) cons.push(fs.where("published", "==", true));
    for (const [k, v] of Object.entries(opt.where || {})) cons.push(fs.where(k, "==", v));
    const snap = await fs.getDocs(cons.length ? fs.query(fs.collection(D, col), ...cons) : fs.collection(D, col));
    out = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    out = Object.entries(L()[col] || {}).map(([id, d]) => ({ id, ...d }));
    if (opt.publicOnly) out = out.filter(x => x.published === true);
    for (const [k, v] of Object.entries(opt.where || {})) out = out.filter(x => x[k] === v);
  }
  return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function get(col, id) {
  await ready;
  if (MODE === "api") return api("get", { col, id });
  if (MODE === "firebase") {
    const { fs, D } = await fb();
    try {
      const s = await fs.getDoc(fs.doc(D, col, id));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    } catch (e) { if (e.code === "permission-denied") return null; throw e; }
  }
  const d = (L()[col] || {})[id];
  return d ? { id, ...d } : null;
}

export async function set(col, id, data, merge = false) {
  await ready;
  if (MODE === "api") return api("set", { col, id, data, merge });
  if (MODE === "firebase") {
    const { fs, D } = await fb();
    await fs.setDoc(fs.doc(D, col, id), data, { merge });
    return id;
  }
  const db = L(); db[col] = db[col] || {};
  db[col][id] = merge ? { ...(db[col][id] || {}), ...data } : data;
  saveLocal(db); return id;
}

export async function add(col, data) {
  await ready;
  data = { createdAt: Date.now(), ...data };
  if (MODE === "api") return api("add", { col, data });
  if (MODE === "firebase") {
    const { fs, D } = await fb();
    return (await fs.addDoc(fs.collection(D, col), data)).id;
  }
  return set(col, uid(), data);
}

export async function update(col, id, data) {
  await ready;
  if (MODE === "api") { await api("update", { col, id, data }); return; }
  if (MODE === "firebase") {
    const { fs, D } = await fb();
    await fs.updateDoc(fs.doc(D, col, id), data); return;
  }
  const db = L(); if (!db[col]?.[id]) throw new Error("Record not found");
  db[col][id] = { ...db[col][id], ...data }; saveLocal(db);
}

export async function remove(col, id) {
  await ready;
  if (MODE === "api") { await api("remove", { col, id }); return; }
  if (MODE === "firebase") {
    const { fs, D } = await fb();
    await fs.deleteDoc(fs.doc(D, col, id)); return;
  }
  const db = L(); delete db[col]?.[id]; saveLocal(db);
}

/** Write many docs at once: items = [{col,id,data}] */
export async function batchSet(items) {
  await ready;
  if (MODE === "api") {
    for (let i = 0; i < items.length; i += 500) await api("batch", { items: items.slice(i, i + 500) });
    return;
  }
  if (MODE === "firebase") {
    const { fs, D } = await fb();
    for (let i = 0; i < items.length; i += 400) {
      const b = fs.writeBatch(D);
      items.slice(i, i + 400).forEach(it => b.set(fs.doc(D, it.col, it.id), it.data));
      await b.commit();
    }
    return;
  }
  const db = L();
  items.forEach(it => { db[it.col] = db[it.col] || {}; db[it.col][it.id] = it.data; });
  saveLocal(db);
}

// ---------------------------------------------------------------- Settings
let settingsCache = null;
export async function getSettings(fresh = false) {
  if (settingsCache && !fresh) return settingsCache;
  let s = null;
  try { s = await get("settings", "main"); } catch (e) { console.warn(e); }
  settingsCache = { ...DEFAULT_SETTINGS, ...(s || {}) };
  delete settingsCache.id;
  return settingsCache;
}
export async function saveSettings(data) {
  await set("settings", "main", data, true);
  settingsCache = null;
}

// ---------------------------------------------------------------- Files
/** Resize an image file → JPEG data URL */
export function imageToDataUrl(file, max = 900, quality = 0.78) {
  return new Promise((res, rej) => {
    const img = new Image(), r = new FileReader();
    r.onload = () => { img.src = r.result; };
    r.onerror = rej;
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => rej(new Error("ছবিটি পড়া যায়নি"));
    r.readAsDataURL(file);
  });
}
function dataUrlToBlob(u) {
  const [h, b] = u.split(","), bin = atob(b), a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: h.slice(5, h.indexOf(";")) });
}

/** Upload a file (admin) → URL. Large photos are shrunk before upload. */
/** Upload a confidential document (admin only). Returns a reference, not a public link:
 *  own server → "private:<name>" (served only to admins), Firebase → "fbprivate:<path>",
 *  demo → data URL kept in this browser. Open it with openPrivate(ref). */
export async function uploadPrivate(file) {
  await ready;
  if (file.size > 15 * 1024 * 1024) throw new Error("ফাইল ১৫ MB-এর বেশি");
  if (MODE === "api") {
    const fd = new FormData();
    const isImg = /^image\/(jpeg|png|webp)$/.test(file.type);
    if (isImg && file.size > 900 * 1024) fd.append("file", dataUrlToBlob(await imageToDataUrl(file, 2000, 0.85)), file.name.replace(/\.\w+$/, "") + ".jpg");
    else fd.append("file", file);
    fd.append("private", "1");
    const r = await fetch(API_URL + "?a=upload", { method: "POST", body: fd, credentials: "same-origin", headers: csrf ? { "X-CSRF-Token": csrf } : {} });
    let j; try { j = await r.json(); } catch { throw new Error("আপলোড ব্যর্থ (" + r.status + ")"); }
    if (!j.ok) throw new Error(j.error || "আপলোড ব্যর্থ");
    return j.data;
  }
  if (MODE === "firebase") {
    const { st, S } = await fb();
    const path = `private/staff/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
    await st.uploadBytes(st.ref(S, path), file, { contentType: file.type });
    return "fbprivate:" + path;
  }
  if (file.size > 1.5 * 1024 * 1024 && !file.type.startsWith("image/")) throw new Error("ডেমো মোডে ১.৫ MB-এর বড় ফাইল রাখা যায় না।");
  if (file.type.startsWith("image/")) return imageToDataUrl(file, 1400, 0.8);
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
/** Open a confidential document in a new tab (admin only). */
export async function openPrivate(ref) {
  await ready;
  if (!ref) return;
  const w = window.open("about:blank", "_blank");
  let url = ref;
  if (ref.startsWith("private:")) url = API_URL + "?a=file&n=" + encodeURIComponent(ref.slice(8));
  else if (ref.startsWith("fbprivate:")) { const { st, S } = await fb(); url = await st.getDownloadURL(st.ref(S, ref.slice(10))); }
  else if (ref.startsWith("data:")) { url = URL.createObjectURL(dataUrlToBlob(ref)); }
  if (w) w.location.href = url; else location.href = url;
}
/** Delete a confidential document that is no longer referenced. */
export async function removePrivate(ref) {
  await ready;
  try {
    if (ref?.startsWith("private:")) await api("removeFile", { n: ref.slice(8) });
    else if (ref?.startsWith("fbprivate:")) { const { st, S } = await fb(); await st.deleteObject(st.ref(S, ref.slice(10))); }
  } catch (e) { console.warn("Could not delete old file", e); }
}
/** Image (e.g. the staff photo) that can be shown inline in the admin panel / print. */
export async function privateImageSrc(ref) {
  if (!ref) return "";
  if (ref.startsWith("data:")) return ref;
  if (ref.startsWith("private:")) return API_URL + "?a=file&n=" + encodeURIComponent(ref.slice(8));
  if (ref.startsWith("fbprivate:")) { const { st, S } = await fb(); return st.getDownloadURL(st.ref(S, ref.slice(10))); }
  return "";
}

export async function upload(file, folder = "files") {
  await ready;
  const isImg = /^image\/(jpeg|png|webp)$/.test(file.type);
  if (MODE === "api") {
    const fd = new FormData();
    if (isImg && file.size > 600 * 1024) fd.append("file", dataUrlToBlob(await imageToDataUrl(file, 1600, 0.82)), file.name.replace(/\.\w+$/, "") + ".jpg");
    else fd.append("file", file);
    fd.append("folder", folder);
    const r = await fetch(API_URL + "?a=upload", { method: "POST", body: fd, credentials: "same-origin", headers: csrf ? { "X-CSRF-Token": csrf } : {} });
    let j; try { j = await r.json(); } catch { throw new Error("আপলোড ব্যর্থ (" + r.status + ")। ফাইলটি হয়তো সার্ভারের সীমার চেয়ে বড়।"); }
    if (!j.ok) throw new Error(j.error || "আপলোড ব্যর্থ");
    return j.data;
  }
  if (MODE === "firebase") {
    const { st, S } = await fb();
    const r = st.ref(S, `public/${folder}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`);
    await st.uploadBytes(r, file, { contentType: file.type });
    return st.getDownloadURL(r);
  }
  if (file.type.startsWith("image/")) return imageToDataUrl(file, 1000, 0.75);
  if (file.size > 1.5 * 1024 * 1024) throw new Error("ডেমো মোডে ১.৫ MB-এর বড় ফাইল রাখা যায় না। ফাইলটি Google Drive-এ রেখে লিংক দিন।");
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

// ---------------------------------------------------------------- Auth
const DEMO_SESSION = "siam_admin_session";
async function sha(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
/** user: username (own server), email (Firebase) or ignored (demo) */
export async function login(user, password) {
  await ready;
  if (MODE === "api") { const r = await api("login", { username: user, password }); csrf = r.csrf; return; }
  if (MODE === "firebase") {
    const { auth, A } = await fb();
    await auth.signInWithEmailAndPassword(A, user, password);
    return;
  }
  const stored = localStorage.getItem("siam_admin_pw") || await sha(DEMO_DEFAULT_PASSWORD);
  if (await sha(password) !== stored) throw new Error("পাসওয়ার্ড সঠিক নয়");
  sessionStorage.setItem(DEMO_SESSION, "1");
}
/** First-run: create the first admin account on the own server. */
export async function setupAdmin(username, password, name) {
  await ready;
  const r = await api("setup", { username, password, name }); csrf = r.csrf;
}
export async function changePassword(current, pw) {
  await ready;
  if (MODE === "api") return api("changePassword", { current, password: pw });
  if (MODE === "demo") {
    const stored = localStorage.getItem("siam_admin_pw") || await sha(DEMO_DEFAULT_PASSWORD);
    if (await sha(current) !== stored) throw new Error("বর্তমান পাসওয়ার্ড ভুল");
    if (pw.length < 6) throw new Error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
    localStorage.setItem("siam_admin_pw", await sha(pw));
    return;
  }
  throw new Error("Firebase Console থেকে পাসওয়ার্ড পরিবর্তন করুন");
}
export async function logout() {
  await ready;
  if (MODE === "api") { await api("logout").catch(() => { }); csrf = null; location.reload(); return; }
  if (MODE === "firebase") { const { auth, A } = await fb(); await auth.signOut(A); return; }
  sessionStorage.removeItem(DEMO_SESSION); location.reload();
}
/** cb(user|null, info). user = {email, uid, name, isAdmin}; info.needsSetup on own server */
export async function onAuth(cb) {
  await ready;
  if (MODE === "api") {
    const r = await api("me");
    csrf = r.csrf;
    cb(r.user ? { email: r.user.username, uid: r.user.username, name: r.user.name, isAdmin: r.user.role === "admin" } : null, { needsSetup: r.needsSetup });
    return;
  }
  if (MODE === "firebase") {
    const { auth, A, fs, D } = await fb();
    auth.onAuthStateChanged(A, async u => {
      if (!u) return cb(null, {});
      try {
        const r = await fs.getDoc(fs.doc(D, "users", u.uid));
        cb({ email: u.email, uid: u.uid, isAdmin: r.exists() && r.data().role === "admin" }, {});
      } catch { cb({ email: u.email, uid: u.uid, isAdmin: false }, {}); }
    });
    return;
  }
  cb(sessionStorage.getItem(DEMO_SESSION) ? { email: "demo-admin", uid: "demo", isAdmin: true } : null, {});
}
export async function sendReset(email) {
  await ready;
  if (MODE !== "firebase") throw new Error("এই মোডে প্রযোজ্য নয়");
  const { auth, A } = await fb();
  await auth.sendPasswordResetEmail(A, email);
}
// Admin account management (own server only)
export const users = {
  list: () => api("users"),
  add: (username, password, name) => api("addUser", { username, password, name }),
  remove: id => api("deleteUser", { id }),
  resetPassword: (id, password) => api("resetUserPassword", { id, password })
};

// ---------------------------------------------------------------- Backup (all modes)
export const COLLECTIONS = ["notices", "events", "results", "admissions", "students", "teachers", "gallery", "downloads", "routines", "messages", "settings", "staffRecords"];
export async function exportAll() {
  await ready;
  const out = { exportedAt: new Date().toISOString(), mode: MODE };
  for (const c of COLLECTIONS) out[c] = await list(c);
  return out;
}
export async function importAll(data) {
  const items = [];
  for (const c of COLLECTIONS) for (const d of data[c] || []) { const { id, ...rest } = d; if (id) items.push({ col: c, id, data: rest }); }
  await batchSet(items);
  settingsCache = null;
  return items.length;
}
export function resetDemo() { localStorage.removeItem(LS_KEY); local = null; }
