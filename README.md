# Singchapair Islamia Alim Madrasha — Website & Admin Portal

A bilingual (Bangla/English) Firebase-backed institutional website starter with public information pages, admission applications, result lookup, notices, teacher profiles, downloads and a protected administration portal.

## Included
- Responsive public website inspired by contemporary university portals (original branding/layout).
- Bangla/English text toggle.
- Ebtedayee, Dakhil and Alim academic levels.
- Public notices, published result lookup and printable marksheet view.
- Online admission intake with tracking ID.
- Teacher/staff profiles, downloads and contact messages.
- Admin authentication using Firebase Authentication.
- Admin-only dashboard modules for notices, results, admissions, students, teachers, downloads, messages and basic settings.
- Firestore and Storage security rules.

## 1. Create and configure Firebase
1. Create a Firebase project at https://console.firebase.google.com/.
2. Register a Web App and copy its configuration.
3. Replace placeholders in `js/firebase-config.js`.
4. Enable **Authentication > Email/Password**.
5. Create a **Cloud Firestore** database and **Storage** bucket.
6. In Firestore Rules, publish `firestore.rules`. In Storage Rules, publish `storage.rules`.
7. Add an admin user in Authentication (create the user with a strong password).
8. In Firestore, create `users/{AUTH_USER_UID}` where the document ID is the admin user's exact UID and fields are:
   ```json
   { "role": "admin", "name": "Madrasha Administrator" }
   ```
   Do this through Firebase Console or a trusted server environment. The client app intentionally cannot grant itself admin access.

## 2. Run locally
Because the app uses JavaScript modules, serve the folder through a local web server (not by opening `index.html` as a file). For example:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`. Add the local and production domains to Firebase Authentication > Settings > Authorized domains.

## 3. Deploy
You can deploy the folder using Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Choose the existing Firebase project; set public directory to this folder.
firebase deploy
```
Review the generated `firebase.json` and ensure the selected public directory contains `index.html`, `admin.html`, `assets/`, and `js/`.

## Firestore collections
- `users` — admin role records (UID is document ID)
- `notices` — title, category, body, fileUrl, published, createdAt, createdBy
- `results` — level, className, exam, year, studentName, roll, registration, totalMarks, obtainedMarks, gpa, grade, subjects[], published, createdAt
- `admissions` — studentName, fatherName, motherName, level, className, phone, address, status, createdAt
- `students` — name, studentId, roll, level, className, session, guardianPhone
- `teachers` — name, designation, subject, photoUrl, bio, published, createdAt
- `downloads` — title, category, url, published, createdAt
- `messages` — name, contact, message, status, createdAt
- `settings/main` — name, phone, email, eiin, address, principalMessage

## Important production checklist
This is a working foundation, not a verified live deployment. It needs your Firebase project configuration and verified institutional content before it can go online.

Before public launch:
- Confirm the official institution name spelling in Bangla and English, address, EIIN, contact numbers, logo, principal's name/message and approved photos.
- Configure a trusted admin account and test every role/rule.
- Add Firestore composite indexes if Firebase prompts for them.
- Test result uniqueness and correct subject-wise grading against the madrasha's approved grading policy.
- Add admission document uploads and staff approval workflow if required.
- Add pagination, CSV import/export, audit logs, automated backups and server-side validation before handling large-scale student records.
- Do not publish personal student/guardian details or confidential records. Public result publishing must be an explicit administrative action.
- Configure Firebase App Check, billing alerts, backups and a privacy notice/consent process.
- Test on mobile and desktop and review accessibility.

## Current limitations to complete before production
- Admin lists show the latest records, but bulk import/export, edit-in-place forms and pagination are not yet implemented.
- Result lookup is keyed to level + exam + year + roll. Add session/class/registration filters if the institution's official result process requires them.
- Admission currently collects a basic application; file upload, payment, SMS and approval/rejection notifications need provider setup.
- The sample design uses a remote Unsplash hero image and Google Fonts; replace with institution-owned imagery for launch.
- The website address and contact details are sample placeholders and must be verified.
