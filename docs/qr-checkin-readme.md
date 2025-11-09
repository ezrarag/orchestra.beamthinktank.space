# 🎻 QR-Based Check-In System

## Purpose

This system allows BDSO musicians to record rehearsal attendance quickly and securely.

## How It Works

1. Each rehearsal in `data.ts` has a unique `sessionID` (the date in `YYYY-MM-DD` format).

2. A QR code pointing to `/checkin?id={sessionID}` is printed or displayed at the venue.

3. Musicians scan the QR, sign in with Google (via Firebase Auth), and tap **Check In**.

4. The check-in is saved to Firestore → `attendance/{autoId}` with:

   - userId  
   - name / email  
   - rehearsalId  
   - timestamp  
   - location  

Admins can later view these in `/admin/attendance`.

## Technical Overview

- **Frontend:** Next.js + Tailwind + Firebase SDK  
- **Auth:** Firebase Auth (Google Sign-In)  
- **Database:** Firestore  
- **QR Codes:** generated via `qrcode.react`

## Setup

1. Confirm `.env.local` has valid Firebase credentials.  

2. Install dependency:

   ```bash
   pnpm add qrcode.react
   ```

3. Start dev server:

   ```bash
   pnpm dev
   ```

4. Open `/checkin?id=2025-11-09` to verify.

## Generating QR Codes

To generate QR codes for rehearsals, you can use the `QRCode` component from `lib/generateQR.tsx`:

```tsx
import { QRCode, generateCheckInURL } from '@/lib/generateQR'

// In your component
const rehearsalId = '2025-11-09'
const checkInUrl = generateCheckInURL(rehearsalId)

<QRCode value={checkInUrl} size={200} />
```

### Example: QR Code Generator Page

You can create a simple page to generate QR codes for all rehearsals:

```tsx
'use client'
import { QRCode, generateCheckInURL } from '@/lib/generateQR'
import { rehearsalSchedule } from '@/app/training/contract-projects/black-diaspora-symphony/data'

export default function QRGeneratorPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Rehearsal QR Codes</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {rehearsalSchedule.map((rehearsal) => {
          const url = generateCheckInURL(rehearsal.date)
          return (
            <div key={rehearsal.date} className="text-center">
              <h3 className="mb-2">{new Date(rehearsal.date).toLocaleDateString()}</h3>
              <QRCode value={url} size={180} />
              <p className="text-xs mt-2 text-gray-500 break-all">{url}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## Admin View

You can view all attendance records at `/admin/attendance`. This page:

- Lists all check-ins sorted by timestamp (most recent first)
- Allows filtering by rehearsal date
- Shows summary statistics
- Provides CSV export functionality

## Security & Best Practices

* Require users to be authenticated to check in.

* Use Firestore rules:

  ```json
  match /attendance/{docId} {
    allow read: if request.auth != null;
    allow write: if request.auth != null;
  }
  ```

* Use HTTPS only.

## Example

* **Rehearsal QR:** points to

  `https://orchestra.beamthinktank.space/checkin?id=2025-11-09`

* **Firestore document:**

  ```json
  {
    "userId": "abc123",
    "email": "violist@example.com",
    "name": "Jane Doe",
    "rehearsalId": "2025-11-09",
    "timestamp": "2025-11-09T23:10:00Z",
    "location": "Central United Methodist Church, 639 N 25th St, Milwaukee, WI 53233"
  }
  ```

---

## Descriptive Section for Website

Add a paragraph on your site (e.g., in the "Play in This Project" section):

> **Check In System**
> 
> We use a QR-based attendance tool to track musician participation at every rehearsal.
> Simply scan the QR code posted at the venue entrance, sign in, and tap **Check In**.
> Your presence is automatically logged and helps us maintain accurate records for ensemble coordination and community impact reporting.

