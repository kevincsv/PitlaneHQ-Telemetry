# UI redesign (PC and web)

Status as of 2026-11-07. The look is described in `docs/spec/app-screens.md` ("The look").

- Asked 2026-11-06 because people called the old look generic. Scope: PC app and web first, phones later.
- First restyle (graphite, one CSS layer) was rejected: the owner wanted new layouts, not only new colours.
- Prototypes: A https://claude.ai/artifact/SC4ArTdy9sU41oHfEwiwwY, B https://claude.ai/artifact/JpvtXU7NzV3K7haKu4yhw9,
  A2 https://claude.ai/artifact/EVMYHpVbVxqFU7372gBMgQ (copies in the project files, `ui-redesign/prototype/`).
- Chosen: A2 "Workspace" (lap list and map on the left, channels on the right), keeping today's analyzer and page
  structure, Pitlane HQ's colours (night blue #0b0e14, amber #f5b43c, purple for best) and the logo and wordmark.
  Never name another product as the inspiration in code, docs or texts.
- State: commit 06cb33a, live on beta only (cloud run 42233220551, Windows run 42233227054). On master but not
  promoted. Production waits for the owner's OK.
- Not done yet: the phones, the landing screenshots (`web/dist/landing/<lang>/*.jpg`), the public SEO pages (`cloud/src/seo.js`).
