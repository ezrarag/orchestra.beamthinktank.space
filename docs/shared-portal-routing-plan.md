# Shared Portal Routing Plan

## Current State

- `resolvePortalPath(path, ngo?, scoped?)` lives in `lib/portal/routes.ts`.
- Participant intent routing currently depends on a second helper:
  `resolveParticipantIntentDestination(ngo, intent)`.
- That second helper now lives in `lib/portal/onboarding.ts` so it sits next to the shared portal routing utilities instead of staying orchestra-only.

## Next Shared-Component Session

1. Decide whether intent-based routing belongs inside `resolvePortalPath` or beside it.
2. If it belongs inside the shared utility, define a single stable API that all BEAM NGO subdomains can implement.
3. Align destination rules across subdomains:
   - participant dashboard
   - admin/staff intake
   - cohort or recruitment-specific forms
4. Update all NGO apps to import the same shared participant-onboarding helper.
5. Remove the temporary compatibility re-export in `lib/participantOnboarding.ts`.

## Proposed Direction

Keep `resolvePortalPath` for path scoping only, and add a shared companion API for onboarding:

```ts
resolveParticipantIntentDestination({
  ngo,
  intent,
  scoped,
})
```

That keeps the base path resolver small and avoids overloading it with role semantics.
