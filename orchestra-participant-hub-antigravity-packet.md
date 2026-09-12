# Participant Profile — Static Data Fix + Hub Panel Build

For Antigravity. Grounded in the live code at `app/profile/page.tsx` and `lib/api/profile.ts` as of commit `a9ca88e` (the most recent one on the repo). Two separate jobs below — do Job 1 first, it's small and unblocks Ezra testing with his own account; Job 2 is the bigger structural change.

---

## Job 1 — Remove the hardcoded "fake Ezra" demo profile

### What's happening
`ezra.haugabrooks@gmail.com` (Ezra's personal Gmail) is hardcoded into the code as a special-cased identity that auto-injects a fabricated, fully "completed" musician profile — cellist bio, made-up earnings, a fake broadcasting location — every time that email signs in. This is why logging in with his personal email shows "static data that doesn't apply": the app thinks he's a specific fictional persona named in the source code.

### Exactly where it lives

**`app/profile/page.tsx` line 72:**
```ts
const BDSO_SANDBOX_EMAIL = 'ezra.haugabrooks@gmail.com'
```
and line ~90: `const isBdsoEzra = targetEmail.toLowerCase() === BDSO_SANDBOX_EMAIL`

**`lib/api/profile.ts` lines 248–278** — the fabricated profile object itself:
```ts
// Pre-populated completed profile for ezra.haugabrooks@gmail.com (originated in Black Diaspora Orchestra / BDSO)
export const DEFAULT_EZRA_PROFILE: ParticipantDemographics = {
  fullName: 'Ezra Haugabrooks',
  primaryRole: 'Section Leader & Resident Cellist',
  originProject: 'Black Diaspora Symphony Orchestra (BDSO)',
  primaryInstrument: 'Violoncello (Cello)',
  disciplineTags: ['Principal Cello', 'Steinway Recording Specialist', 'Media Producer'],
  roamingCity: 'Orlando, FL (Steinway Gallery Residency)',
  isRoamingActive: true,
  ethnicity: 'Black / African Diaspora',
  pronouns: 'He / Him',
  educationBackground: 'Master of Music (M.M.) Cellist',
  culturalCapitalNotes: 'Cellist & Section Leader for Black Diaspora Symphony Orchestra...',
  uncompensatedRehearsalHours: 0,
  beamCoinBalance: 0,
  usdTotalEarned: 0,
  ...
}
```

**`lib/api/profile.ts` lines ~302–339** inside `fetchParticipantProfile` — every field falls back to a piece of `DEFAULT_EZRA_PROFILE` whenever `normEmail === 'ezra.haugabrooks@gmail.com'`, even overriding real Firestore fields in a couple of spots (`uncompensatedRehearsalHours`, `beamCoinBalance: 48`, `usdTotalEarned: 1485` show up as literal numbers if the Firestore doc doesn't already have them).

**`lib/api/profile.ts` line 339-341** — if there's no Firestore doc *at all* for that email, it just returns `DEFAULT_EZRA_PROFILE` outright.

**`lib/api/profile.ts` line 409** (`ensureParticipantProfileExists`) and **lines 737–738** (`dualWriteInstitutionalCommitmentAsGig`) — same special-case repeated.

### The fix
This looks like leftover seed/demo data from early development/testing, not a real feature. Two acceptable ways to fix it — pick one:

1. **Delete the special case entirely.** Remove `DEFAULT_EZRA_PROFILE`, `DEFAULT_EZRA_EVENTS`, `BDSO_SANDBOX_EMAIL`, `isBdsoEzra`, and every `isEzra ? ... : ...` branch in `fetchParticipantProfile`, `ensureParticipantProfileExists`, and `dualWriteInstitutionalCommitmentAsGig`. Ezra's real account then goes through the same "clean brand-new user" path as everyone else (lines 342–368 of `lib/api/profile.ts`), and he fills in his own real bio/instrument/role through the existing Edit Profile & CV modal.
2. **Keep it, but gate it behind the existing `isSandboxPreview` toggle instead of an email match** — so the fake BDSO cellist persona only appears when someone explicitly clicks into sandbox/demo mode (there's already a "⚡ SANDBOX PREVIEW (BDSO CORE)" banner and toggle in the code for exactly this purpose), never on a real sign-in.

Recommend **option 1** unless there's a demo/investor-preview reason to keep a canned profile around — in which case option 2.

### Two more ungated hardcodes to fix in the same pass (not tied to the email — these apply to *every* signed-in user)
- `app/profile/page.tsx` line ~294: `setEditPhone('(414) 555-0199')` — every user's phone field defaults to this fake number regardless of who they are. Should default to empty string.
- `app/profile/page.tsx` line ~309: `setDisciplinePills(data.disciplineTags || ['Resident Cellist', 'Steinway Recording Specialist', 'Media Producer'])` — fallback should be `[data.primaryInstrument || 'Musician']` or just `[]`, not a copy of the fake Ezra tags.
- `app/profile/page.tsx` lines ~168–173: `liveBeaconCity` defaults to `'Atlanta, GA'` with real-looking coordinates (`33.749, -84.388`) and `isBroadcastingLocation` defaults to `true` — meaning a brand-new user's live-location beacon shows as "currently broadcasting from Atlanta" before they've ever touched that feature. Default `isBroadcastingLocation` to `false` and clear the city/lat/lng defaults to empty until a real value is saved.

`BEAM_CATALOG_WORKS` (the "claim your recordings" catalog picker, `lib/api/profile.ts` line 43 / used at `app/profile/page.tsx` line ~1790) is **not** part of this problem — it's a real, correctly-scoped list of actual BDSO recordings available to *claim* into your portfolio, not data presented as if it were already yours. Leave it as-is.

---

## Job 2 — Turn the hero into a real header, and build the hub panel underneath it

### What's live today (confirmed by reading the code, not guessing)
`/profile` is currently **one fixed, non-scrolling viewport** — literally:
```tsx
{/* 100vh x 100vw VIEWPORT LOCKED SPATIAL CANVAS CONTAINER */}
<div className="relative w-full h-full overflow-hidden flex flex-col justify-between">
```
(`app/profile/page.tsx` line ~840). There is no scrollable content area below the hero today — the page never scrolls. What you're calling "the header" and "the full-width hero section" are actually one and the same element: the ambient background photo + gradient + the floating pill dock + your name overlaid at bottom-left, all pinned inside that fixed viewport. When you click Gigs / Funds / Media / Logistics, a small ~256px floating card stack (`activeCanvasFolder`, `app/profile/page.tsx` lines ~1100–1260) pops up on top of it — that's the only thing that currently changes.

So "immediately under that, different — like the one you built" doesn't exist yet as a section. It needs to be built. Here's the plan:

### Step 1 — Split the fixed canvas into a hero band + a real scrollable region
In `app/profile/page.tsx`, change the outer container (line ~838–840) from a `h-full overflow-hidden` viewport-locked box into:
- A hero band that keeps its current fixed height (roughly the current viewport minus what the new panel needs — a `h-[62vh]` or similar works well, tune to taste) containing **exactly what's there now, unchanged**: the ambient background photo/gradient, the sandbox banner, the **X → Return Home button** (line ~872, keep this exact — it's what you specifically asked to preserve), the pill dock (Gigs/Funds/Media/Works/Logistics), the Signed-In badge, help button, more-options menu, and the name/handle overlay at bottom-left.
- Below it, a normal-flow `<div className="overflow-y-auto">` section that scrolls with the page. This is the new hub panel.

### Step 2 — Repurpose the pill clicks to drive the new panel instead of a tiny popover
Right now each pill's `onClick` sets `activeCanvasFolder` to a number and a small popover appears. Change this so the same click instead sets which category is showing in the new scrollable panel below (reuse `activeCanvasFolder` as the selector — no need for a new state variable). Remove the `absolute top-20 left-1/2 -translate-x-1/2` positioning on those four blocks (lines ~1100–1260) and instead render the selected one's content, full-width, inside the new panel.

There's already an unused, ready-made hook for this: `activeTab` (`useState<'nodes' | 'portfolio'>`, declared at line 100) is declared but **never referenced anywhere else in the file** — it's dead code from an earlier pass. Either wire it up as the tab switcher for the new panel, or drop it in favor of driving everything off `activeCanvasFolder` — don't leave two unused parallel states.

### Step 3 — Build the panel content in the hub style
Use `components/works/WorkPickerModal.tsx` as the structural template — it's the best-built real component in the codebase for this (real Firestore-backed search, debounced matching, tabbed UI, clean empty/filled states) — but render it as an **inline section**, not a modal:
- A row of quick-access category tiles at the top of the panel (Gigs, Funds, Media, Logistics — matching the pill dock above it, so the two stay in sync visually).
- Filter chips where relevant (e.g., Media: filter by category, matching the existing `catalogCategoryFilter` pattern already built for the Catalog Picker modal at line ~1770).
- A card grid below, reusing the real data and empty states that already exist per category:
  - **Gigs**: `events` array, the existing "No Gigs Booked Yet" empty state (line ~1105) — just re-styled as a full-width grid instead of a fanned card stack.
  - **Funds**: `institutionalEarningsTotal` / `allocatedHoodAmount` (already computed, lines ~176–179) plus the Hood allocation modal trigger.
  - **Media**: `portfolioItems` array, existing "No Portfolio Media Yet" empty state, "Upload Work / Score" action already wired to `showWorkPickerModal`.
  - **Logistics**: existing `showLogisticsDrawer` trigger.

### Step 4 — Surface the recording-projects pipeline
`app/musician/select-project/page.tsx` is a large, real recording-projects/training-pipeline hub (backed by `lib/api/recordingProjects.ts` and `lib/api/orchestras.ts`) but it is **not linked from `/profile` anywhere** — someone would need to know the URL. Add a tile/card in the new panel (under Gigs or a new "Recording Projects" category) that links to `/musician/select-project`, so it's reachable from the page people actually land on.

### What stays exactly as-is (per your instructions)
- The X button in the top-left, its "Return Home" behavior, and its position.
- The pill dock's visual style and icons.
- The background ambient photo treatment, gradient, and the name/handle overlay.
- The Works pill's behavior (opens the real `WorkPickerModal`) — leave that as a modal, it already works well and is a different interaction pattern (submitting/creating a work) than browsing the other four categories.

### Routing note
There is no separate "hub" route today — everything above happens on the existing `/profile` page, reached the same way it already is (sign-in → `/profile`, or the "Return Home" X button routes back to `/`). No new route or slide-in-overlay mechanism is needed once the panel lives in normal scrollable flow directly under the hero — scrolling *is* the reveal, so nothing needs to "slide in."

---

## Job 3 — Fix the Presenter & Venue ("Institution") page's hardcoded roster & identity

### Route correction
The roster/billing screenshot with "ezra haugabrooks (Institutional)" and the "Add to Request" cards is **not** the `/profile` page covered by Jobs 1–2 above — it's a completely separate route and component: `app/institution/profile/page.tsx`, which renders `components/InstitutionalCohortProfile.tsx`. The address bar was very likely reading `/institution/profile`; nothing in the codebase maps `/profile` to this component, so if the URL bar really showed exactly `/profile`, flag that separately as its own bug — but the file that produced what's in the screenshot is `InstitutionalCohortProfile.tsx`. This is the Presenter & Venue view from your very first message — the "sprawled out" musician list you originally wanted made explorative.

### The static data here, mapped line-for-line to the screenshot
- **Org name** ("ezra haugabrooks (Institutional)") — this part is real, pulled from `businessProfile.organizationName`, sourced from your Google sign-in display name via the generic new-institution-sign-in default in `fetchInstitutionalProfile` (`lib/api/profile.ts` line ~660). Nothing to fix here.
- **Subtitle** "Multi-state ballet & dance production partner · BADO FL" — 100% hardcoded JSX text, `components/InstitutionalCohortProfile.tsx` line 483, shown underneath *every* institution's name regardless of who they are. It has nothing to do with your account — it's literally typed into the template.
- **"📍 Florida · Wisconsin · Illinois"** — hardcoded static text right next to it (same block, line ~471), not derived from `businessProfile.stateOperations` even though that field exists and is exactly the data this line should be built from.
- **The 18-card musician roster grid** — a hardcoded array, `INITIAL_ROSTER_MUSICIANS` (`components/InstitutionalCohortProfile.tsx` lines 53–71), including invented names (Marisol Ferreira, Devon Kwan, Theo Marchetti, etc.), invented instruments, and invented per-service rates — and, notably, one of the 18 entries is literally "Ezra Haugabrooks · Cello." There is a real Firestore fetch already built (`loadRealRosterAndRequests`, lines 129–191) that pulls actual `participantProfiles` documents — but it only **merges** them into the mock list by de-duplicating on name (line 167: `merged = [...loaded, ...INITIAL_ROSTER_MUSICIANS.filter(m => !ids.has(...))]`), so the 18 fake musicians never go away — real ones just get added alongside them. Your screenshot's "13 available now / 18 roster total" is exactly this mock array's own counts (13 of the 18 mock entries have `available: true`) — confirming no real roster data is currently showing at all for your account.
- **"$2,400 cohort credit balance"** — `cohortBalance` state hardcoded to `2400` (line 101), never loaded from Firestore or anywhere else.
- **Past Requests** (visible under the "Cohort & Billing" tab) — same pattern, a hardcoded `INITIAL_PAST_REQUESTS` array (lines 74–78) with three invented line items.

### The fix
- Change the initial state for `rosterMusicians` and `pastRequests` from the hardcoded arrays to `[]`, and rely entirely on the real Firestore fetch that already exists (`loadRealRosterAndRequests`) — it's already built and working, it's just currently backstopped by fake data instead of a clean empty state while it loads (or if it finds nothing).
- Replace the hardcoded subtitle and location line with real fields off `businessProfile` — add a `tagline` field to `InstitutionalBusinessProfile` (`lib/api/profile.ts`) if one doesn't fit an existing field, and map the location line over the real `businessProfile.stateOperations` array (already has `stateName` per entry) instead of the static string.
- Load `cohortBalance` from Firestore, or compute it from `businessProfile.allocatedStipendsBudgetUsd` if that's meant to represent the same number — just stop hardcoding `2400`.
- **Leave `DEFAULT_BADO_FLORIDA_PROFILE` and `DEFAULT_BDSO_PROFILE` alone** (`lib/api/profile.ts` lines 496–611) — unlike the participant-page issue in Job 1, these two are legitimately reusable seed profiles keyed by *email pattern* (`bado`/`ballet`, `bdso`/`blackdiaspora`), not by your personal email, so they're a reasonable way to pre-fill a demo for those two specific test accounts. The actual bug is narrower: your personal sign-in falls through to the generic new-institution branch correctly, but the *roster grid and stat strip* pull from the separate hardcoded arrays above regardless of which profile branch loaded.

### Reusing the hub pattern here
This page is already closest in shape to the Main.dc.html mockup you liked — it already has filter chips and a card grid, it just needs the mock data removed. Once Job 2's participant panel is built, consider adding a matching quick-access tile row above this page's filter chips for visual consistency across both portals, but that's a nice-to-have, not required to fix the static-data problem.

---

## Suggested commit split
1. `fix(profile): remove hardcoded demo profile keyed to personal email` (Job 1)
2. `feat(profile): split fixed hero canvas into scrollable hub panel` (Job 2, steps 1–2)
3. `feat(profile): build category panel content from WorkPickerModal pattern` (Job 2, step 3)
4. `feat(profile): link recording-projects hub from profile panel` (Job 2, step 4)
5. `fix(institution): remove hardcoded roster/tagline/balance from InstitutionalCohortProfile` (Job 3)
