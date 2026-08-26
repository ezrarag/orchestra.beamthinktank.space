# Hood & Orchestra Subdomain Interoperability Specification

This specification documents the data contracts, shared Firebase collections, and cross-site user flow between **`hood.beamthinktank.space`** (Village Backing & Community Patronage) and **`orchestra.beamthinktank.space`** (Institutional Musician Contracting & Media Vault).

---

## 1. Core Architecture Overview

BEAM operates a two-pillar model for musicians:
1. **`orchestra.beamthinktank.space`**: Manages institutional contracts, Steinway recording sessions, performance stipends, and media portfolio.
2. **`hood.beamthinktank.space`**: Manages village backing (family, friends & patrons) and stream revenue shares that cover musician travel, lodging, meals, and instrument care.

Both subdomains connect to the same Firebase project: **`beam-orchestra-platform`**.

---

## 2. Shared Firestore Schema (`participantProfiles`)

Participant profile documents are keyed by the participant's normalized email address (e.g., `participantProfiles/ezra.haugabrooks@gmail.com`).

```typescript
interface ParticipantDemographics {
  fullName: string;
  email: string;
  primaryRole: string;
  originProject: string;
  primaryInstrument: string;
  homeHub: string;
  
  // Financial Funds
  usdTotalEarned: number;        // Direct institutional stipends earned
  hoodVillageBalance: number;    // Accumulated patron backing + stream revenue share ($ USD)
  
  // Fund Allocation Preferences configured by participant
  hoodAllocations: {
    travelPercent: number;       // Ground & Flight Transit (e.g., 40%)
    housingPercent: number;      // Hotel & Residency Lodging (e.g., 35%)
    mealsPercent: number;        // Catering & Per Diem Meals (e.g., 15%)
    maintenancePercent: number;  // Instrument Care & Luthier (e.g., 10%)
  };
  
  headshotUrl?: string;
  portfolioMedia?: Array<{
    id: string;
    title: string;
    url: string;
    category: string;
    composer?: string;
  }>;
}
```

---

## 3. `hood.beamthinktank.space` Implementation Checklist

When implementing patronage features on `hood.beamthinktank.space`:

### A. Incrementing Musician Hood Balance upon Patron Gift
When a patron backs a musician profile on Hood (e.g., $50 gift):
```typescript
import { db } from './lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

async function recordPatronGift(participantEmail: string, giftAmountUSD: number) {
  const profileRef = doc(db, 'participantProfiles', participantEmail.toLowerCase());
  await updateDoc(profileRef, {
    hoodVillageBalance: increment(giftAmountUSD),
    updatedAt: new Date().toISOString()
  });
}
```

### B. Displaying Allocated Funds Breakdown on Hood Profile
To display how the musician's village fund is allocated for travel/lodging on Hood:
```typescript
function calculateFundBreakdown(hoodVillageBalance: number, hoodAllocations: HoodFundAllocation) {
  return {
    travelUSD: (hoodVillageBalance * (hoodAllocations.travelPercent || 40)) / 100,
    housingUSD: (hoodVillageBalance * (hoodAllocations.housingPercent || 35)) / 100,
    mealsUSD: (hoodVillageBalance * (hoodAllocations.mealsPercent || 15)) / 100,
    maintenanceUSD: (hoodVillageBalance * (hoodAllocations.maintenancePercent || 10)) / 100
  };
}
```

### C. Deep-Linking URLs between Hood & Orchestra
- **Musician Profile Share Link**: `https://orchestra.beamthinktank.space/profile?musician=ezra.haugabrooks@gmail.com`
- **Patron Backing Link on Hood**: `https://hood.beamthinktank.space/back?musician=ezra.haugabrooks@gmail.com`
- **Privacy Policy Compliance Link**: `https://orchestra.beamthinktank.space/privacy`
