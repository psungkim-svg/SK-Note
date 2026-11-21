SoonNote v8.3 — full static PWA release
Release date: 2026-09-12

DEPLOY
1. Extract this ZIP.
2. Copy the runtime files below directly into the HTTPS hosting document root. Keep relative paths and capitalization exactly as shown; do not put them inside a second nested folder.
3. No build step or server process is required. Service workers require HTTPS (localhost is suitable for local testing).
4. Cloudflare Pages can use the included _headers file. For other hosts, consult DEPLOYMENT_HEADERS.txt and configure headers in the host settings. GitHub Pages does not interpret Cloudflare's _headers format.
5. Confirm v8.3 in Settings after deployment. Existing installations update through the v8.3 service worker.
6. Before deleting or replacing repository files, verify Vercel's connected repository, branch, and Root Directory. This ZIP cannot identify which repository path is currently deployed.

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

The app loads Supabase from vendor/supabase.min.js; do not substitute a same-named root-level copy. Keep icons/, vendor/, and .well-known/ paths unchanged.

v8.3 RELEASE NOTES — preview text, home menu, and toolbar spacing
- Note-card content preview beneath each title is fixed at font weight 550, independent of the editor's text settings. Grid and title-focused views both use it.
- The top-right vertical-ellipsis menu replaces the separate home View, Trash, and Settings buttons. Each menu action has an icon and a label. Expand View settings to choose Grid, List, or Titles + content preview; the choice is saved.
- Vault-specific actions remain available from the same ellipsis menu, so Vault does not need a second top-bar overflow button.
- The Undo, T, photo-link, and color controls in the note editor have matching visible icon gaps. Their hit targets do not overlap; the title field remains at least 115 px wide in the 320 px responsive test.

VALIDATION
v8.3 feature regression 88/88; selection/touch QA 25/25; UI regression 36/36; responsive regression 24/24 (320/390 px, English/Korean); move UI 16/16; service-worker update flow 11/11; notification service-worker unit tests 6/6; offline boot/cache-response test PASS. These are automated browser tests with emulated touch; a final physical Android-device feel check is still recommended.

CHECKSUMS
From the package folder, run: sha256sum -c SHA256SUMS.txt
The checksum manifest covers the 9 runtime deploy files. README_KO.md has the full Korean notes; TEST_LOG_KO.md records validation.

APP_VER / Service Worker VERSION: 8.3
CSP SHA-256: sha256-+pA6Wd9QRkx8LshoOfEG3oUUJlMIwxMshxK8fs9uhW0=
