#!/usr/bin/env bash
# Puts a Windows build on pitlanehq.app for everyone (R2, /dl/) and records it on the GitHub release.
#   pc-publish.sh <app folder zip> <installer> <build commit>
# windows.yml runs it when a tested build is promoted (the test build's own files, never rebuilt) or, for an urgent
# fix the owner asked for, right after building master. Needs CLOUDFLARE_API_TOKEN/ACCOUNT_ID, GH_TOKEN, GITHUB_SHA.
set -euo pipefail
zip="$1" setup="$2" build="$3"
ver=$(sed -n 's/^const appVersion = "\(.*\)"/\1/p' main.go)
min=$(sed -n 's/^const appMinVersion = "\(.*\)"/\1/p' main.go)
cp "$zip" PitlaneHQ-windows.zip 2>/dev/null || true
cp PitlaneHQ-windows.zip TrackIQ-windows.zip
# links to the old preview's installer get the one app
cp "$setup" PitlaneHQ-Setup.exe 2>/dev/null || true
cp PitlaneHQ-Setup.exe PitlaneHQ-Desktop-Setup.exe
# what this version brings (whats-new.json), so the update window of the version before can say it
notes=$(node -e 'const w=require("./web/dist/whats-new.json"),v=(w.versions||[]).find((x)=>x.v===process.argv[1]),o={};if(v)for(const k of ["en","es","pt"])if(Array.isArray(v[k]))o[k]=v[k];process.stdout.write(JSON.stringify(o))' "$ver")
printf '{"version":"%s","build":"%s","date":"%s","min":"%s","notes":%s}\n' "$ver" "$build" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${min:-0}" "${notes:-{\}}" > version.json
node -e 'JSON.parse(require("fs").readFileSync("version.json","utf8"))' # never a broken version.json
npx --yes wrangler@4 r2 bucket create pitlanehq-downloads 2>/dev/null || true
put() { npx --yes wrangler@4 r2 object put "pitlanehq-downloads/$2" --file "$1" --remote --content-type "$3"; }
put PitlaneHQ-Setup.exe PitlaneHQ-Setup.exe application/vnd.microsoft.portable-executable
put PitlaneHQ-Desktop-Setup.exe PitlaneHQ-Desktop-Setup.exe application/vnd.microsoft.portable-executable
put PitlaneHQ-windows.zip PitlaneHQ-windows.zip application/zip
put TrackIQ-windows.zip TrackIQ-windows.zip application/zip
put CHANGELOG.md CHANGELOG-pc.md text/markdown
# version.json goes last: the app only sees a new version once its files are there
put version.json version.json application/json

# the GitHub release (a record; the apps never link to it)
for old in PitlaneHQ-android.apk PitlaneHQ.ipa PitlaneHQ-Desktop-Setup.exe; do gh release delete-asset pitlanehq-latest "$old" -y 2>/dev/null || true; done
bash .github/scripts/publish.sh TrackIQ-windows.zip
bash .github/scripts/publish.sh PitlaneHQ-windows.zip
bash .github/scripts/publish.sh PitlaneHQ-Setup.exe
bash .github/scripts/publish.sh version.json
# one release per version with its part of CHANGELOG.md (later builds of the same version refresh its files and notes)
# the public history started again at 0.4.1 (the owner's choice): the releases of a higher number go, tags too
gh release list --limit 300 --json tagName -q '.[].tagName' 2>/dev/null | while read -r t; do o="${t#v}"; o="${o%-beta}"; [[ "$o" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue; [ "$o" = "$ver" ] && continue; [ "$(printf '%s\n%s\n' "$ver" "$o" | sort -V | tail -1)" = "$o" ] && gh release delete "$t" -y --cleanup-tag || true; done
tag="v$ver-beta"
awk -v v="$ver" '$0 ~ "^## "v"( |$)" {on=1; next} on && /^## / {exit} on {print}' CHANGELOG.md > notes.md
printf '\n---\nDownloads: https://pitlanehq.app/downloads · Full history: https://pitlanehq.app/changelog\n' >> notes.md
gh release view "$tag" >/dev/null 2>&1 || gh release create "$tag" --target "$GITHUB_SHA" --title "Pitlane HQ $ver beta" --notes-file notes.md --prerelease --latest=false || true
gh release edit "$tag" --notes-file notes.md >/dev/null 2>&1 || true # the notes follow CHANGELOG.md
gh release upload "$tag" PitlaneHQ-windows.zip PitlaneHQ-Setup.exe --clobber || true
