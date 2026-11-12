// Replace these placeholders with your Firebase project's web app configuration.
// Firebase Console > Project settings > General > Your apps > SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
export const firebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).includes("YOUR_"));
