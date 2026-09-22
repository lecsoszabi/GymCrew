---
name: verify
description: How to verify a GymCrew change at its real surface (the live gymcrew.hu web app, driven like a user with Playwright)
---

# GymCrew: verifying a change at runtime

The surface is the web app in a phone browser. Drive it with Playwright scripts
(not the test suite), capture screenshots and DOM observations.

## Handle

- Production: `https://gymcrew.hu` (Vercel deploys every push to `main`; check
  `gh api repos/lecsoszabi/GymCrew/commits/<sha>/status --jq .state` is `success`
  and grep the live CSS/HTML for the change before driving it).
- Local: `preview_start` with the `gymcrew-e2e` config (Next dev on :3100).
- Logged-in pages need the test session `tests/e2e/.auth/a.json` (never commit it).
  Refresh it against production first:
  `E2E_BASE_URL=https://gymcrew.hu npx playwright test --project=munkamenet`,
  and save `ctx.storageState({ path })` at the end of every script.
- Run ad-hoc scripts from the repo root (so `@playwright/test` resolves), delete them after.

## Driving

- iPhone: `webkit` + `devices["iPhone 13"]`. Use `touchscreen.tap` for taps.
- Keyboard focus walks: use Chromium (`devices["Pixel 7"]`). WebKit skips links
  on Tab (Safari default), so focus lands on `<body>`.
- Pinch zoom probe: Chromium CDP `Input.synthesizePinchGesture`, then read
  `visualViewport.scale`.
- Pages first render the `loading.tsx` skeleton: wait for `main h1` before measuring.
- Pass `reducedMotion: "reduce"` when measuring colors/sizes: the scroll-reveal
  and fade-in animations otherwise give mid-animation values.
- The fixed bottom nav covers roughly the last 65 px of the viewport. Scroll targets
  to mid-screen before tapping, or the tap lands on the nav.
- Hit testing: `document.elementFromPoint(x, y)` at offsets around the target.
- First visit shows the cookie notice (fixed, bottom of the screen) until the
  `gymcrew_suti` cookie is set. The test configs preset it; in ad-hoc scripts add
  it with `ctx.addCookies` (value = `LEGAL_VERSION` from `src/lib/legal.ts`) or
  tap "Rendben", otherwise it covers what you want to tap or screenshot.

## Safety

- Never submit: profile "Mentés", new password, sheet "Javaslom…", "Kijelentkezés"
  (logout revokes the saved session). Votes/"Ma megyek" write to the shared DB.
- The test account may be in use by the owner: only delete what you created.
- Check the test group afterwards (sessions and today's check-ins unchanged).
