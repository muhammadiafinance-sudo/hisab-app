# Mohammadia Daily Hisab (installable app)

Files in this folder (upload ALL of them to GitHub):

    index.html              the app
    manifest.webmanifest    app name, colours, icons
    sw.js                   makes it open fast and work offline
    .nojekyll               tells GitHub Pages to serve files as they are
    icons/                  app icons (5 png files)

Your hisab data is NOT in these files. It stays inside each phone/PC browser (IndexedDB).
Take a Backup from the ⋮ menu regularly.

## Deploy on GitHub Pages
1. github.com -> New repository -> name it (e.g. hisab) -> Public -> Create.
2. Add file -> Upload files -> drag in everything from this folder (including the icons folder
   and .nojekyll) -> Commit changes.
3. Settings -> Pages -> Source: "Deploy from a branch" -> Branch: main, folder: / (root) -> Save.
4. After 1-2 minutes your app is at  https://YOUR-USERNAME.github.io/hisab/

## Install
- Android Chrome: open the link -> ⋮ -> Install app (or Add to Home screen).
- iPhone Safari: open the link -> Share -> Add to Home Screen.
- PC Chrome/Edge: install icon at the right end of the address bar.

## Move old data
Old file: ⋮ -> Backup. New app: ⋮ -> Restore / Import -> pick that file.

## Update later
Upload the new index.html to the repo (replace). Then open sw.js, change
`const CACHE = 'hisab-v1'` to 'hisab-v2' (v3, v4...) and commit. Close and reopen the app twice.
