// =====================================================================
//  সাইট কনফিগারেশন / Site configuration
// ---------------------------------------------------------------------
//  ডেটা কোথায় থাকবে তা স্বয়ংক্রিয়ভাবে ঠিক হয় (BACKEND = "auto"):
//   1) নিজস্ব সার্ভার (PHP হোস্টিং-এ api/ ফোল্ডার চালু থাকলে) — সুপারিশকৃত
//   2) Firebase (নিচের FIREBASE অংশ পূরণ করলে)
//   3) ডেমো মোড — কোনোটিই না থাকলে; তথ্য শুধু ওই ব্রাউজারে থাকে
// =====================================================================

// "auto" | "php" | "firebase" | "demo"
export const BACKEND = "auto";
// Address of the PHP backend, relative to the website pages.
export const API_URL = "api/index.php";

export const FIREBASE = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Default site information. Everything here can be changed later from
// Admin Portal → সেটিংস (stored in the database, overrides these values).
export const DEFAULT_SETTINGS = {
  nameBn: "সিংচাপইড় ইসলামিয়া আলিম মাদ্রাসা",
  nameEn: "Singchapair Islamia Alim Madrasha",
  slogan: "জ্ঞান • নৈতিকতা • মানবিকতা",
  estd: "",
  eiin: "",
  madrasaCode: "",
  address: "",
  phone: "",
  email: "",
  facebook: "",
  youtube: "",
  mapEmbed: "",
  principalName: "",
  principalTitle: "অধ্যক্ষ",
  principalPhoto: "",
  principalMessage:
    "আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদ্রাসায় ষষ্ঠ শ্রেণি থেকে আলিম পর্যন্ত কুরআন-সুন্নাহভিত্তিক দ্বীনি শিক্ষার পাশাপাশি আধুনিক সাধারণ শিক্ষা দেওয়া হয়। আমাদের লক্ষ্য—জ্ঞানী, চরিত্রবান ও দেশপ্রেমিক নাগরিক গড়ে তোলা। অভিভাবক ও শুভানুধ্যায়ীদের সহযোগিতা আমাদের পথচলার শক্তি।",
  about:
    "সিংচাপইড় ইসলামিয়া আলিম মাদ্রাসা বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ডের অধীনে পরিচালিত একটি দ্বীনি শিক্ষা প্রতিষ্ঠান। এখানে ষষ্ঠ শ্রেণি থেকে দাখিল (দশম শ্রেণি) এবং আলিম (একাদশ-দ্বাদশ) পর্যন্ত পাঠদান করা হয়।",
  history: "",
  mission: "কুরআন ও সুন্নাহর আলোকে আধুনিক ও যুগোপযোগী শিক্ষার মাধ্যমে আদর্শ মানুষ গড়ে তোলা।",
  vision: "দ্বীনি ও সাধারণ শিক্ষার সমন্বয়ে এলাকার শ্রেষ্ঠ শিক্ষা প্রতিষ্ঠান হিসেবে প্রতিষ্ঠিত হওয়া।",
  statStudents: "",
  statTeachers: "",
  statPass: "",
  admissionOpen: true,
  admissionSession: String(new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()),
  admissionInfo:
    "ভর্তির জন্য প্রয়োজনীয় কাগজপত্র: শিক্ষার্থীর জন্ম নিবন্ধন সনদের কপি, পূর্ববর্তী প্রতিষ্ঠানের ছাড়পত্র (প্রযোজ্য ক্ষেত্রে), সর্বশেষ পরীক্ষার নম্বরপত্র, ২ কপি পাসপোর্ট সাইজ ছবি এবং পিতা/মাতা/অভিভাবকের জাতীয় পরিচয়পত্রের কপি।",
  admissionLastDate: "",
  noticeTicker: "",
  subjects: null // null = use DEFAULT_SUBJECTS from common.js
};

// English versions of the default texts, shown when a visitor switches the
// site to English. Admins can write their own English text in Admin → সেটিংস
// (fields ending in "En"); those always take priority.
export const DEFAULT_SETTINGS_EN = {
  slogan: "Knowledge • Morality • Humanity",
  principalTitle: "Principal",
  principalMessage:
    "Assalamu Alaikum wa Rahmatullah. From Class Six to Alim, our madrasha offers religious education based on the Qur'an and Sunnah together with modern general education. Our aim is to raise knowledgeable, upright and patriotic citizens. The support of guardians and well-wishers is the strength of our journey.",
  about:
    "Singchapair Islamia Alim Madrasha is an Islamic educational institution under the Bangladesh Madrasah Education Board. Classes are taught from Class Six to Dakhil (Class Ten) and Alim (Classes Eleven and Twelve).",
  mission: "To build ideal people through modern, up-to-date education in the light of the Qur'an and Sunnah.",
  vision: "To become the leading educational institution of the area by combining religious and general education.",
  admissionInfo:
    "Documents required for admission: a copy of the student's birth registration certificate, a transfer certificate from the previous institution (where applicable), the latest mark sheet, 2 passport-size photos, and a copy of the father's/mother's/guardian's National ID card."
};

// Demo mode admin password (only used when Firebase is NOT configured).
// Change it from Admin → সেটিংস after first login.
export const DEMO_DEFAULT_PASSWORD = "admin123";
