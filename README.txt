SoonNote v8.1 — full static PWA release

DEPLOY
1. Extract this ZIP.
2. Copy the runtime files listed below from the Soonnote-v8.1 package folder directly into the HTTPS hosting document root. Keep the relative folders and capitalization exactly as shown; do not create a github-upload/ subfolder.
3. No build step or server process is required. The app uses a service worker, so serve it over HTTPS (localhost is suitable for local testing).
4. Cloudflare Pages can apply the included _headers file. For other hosts, consult DEPLOYMENT_HEADERS.txt and configure the headers in the host's settings. GitHub Pages does not interpret Cloudflare's _headers format.
5. Open the deployed app and confirm v8.1 in Settings. Existing installations receive the new version when the v8.1 service worker is installed and activated.

RUNTIME DEPLOY FILES (9)
index.html
sw.js
manifest.webmanifest
_headers
.well-known/assetlinks.json
vendor/supabase.min.js
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png

The app loads its Supabase library from vendor/supabase.min.js; do not substitute a same-named root-level copy. .well-known/assetlinks.json is for Android app-link verification. Keep icons/ and vendor/ paths unchanged.

RELEASE NOTES
The Vault footer uses a gold V-folder icon with a localized Folders/폴더 label on screens wider than 360px. At 360px and narrower, the label text is hidden to preserve the original full-sized Normal notes, VNotes, and V-folder controls; the V icon and accessible name remain. v8.0 search-location and confirmed-move behavior is retained.

CHECKSUMS
From the package folder, run: sha256sum -c SHA256SUMS.txt
The checksum manifest covers the 9 runtime deploy files. README_KO.md has the full Korean release and deployment notes; TEST_LOG_KO.md records validation results.

APP_VER / Service Worker VERSION: 8.1
CSP SHA-256: sha256-IJtNPR0Rkxz8CJAweW3K+XiyTctTc7CDxWqLLR7pPgI=
