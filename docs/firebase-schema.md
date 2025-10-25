# Firebase Collections Schema for BEAM Orchestra

## Core Collections

### 1. `organizations`
```typescript
interface Organization {
  id: string
  name: string
  slug: string
  city: string
  contactEmail: string
  adminUserId: string
  subscriptionTier: 'basic' | 'premium' | 'readyaimgo'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 2. `projects`
```typescript
interface Project {
  id: string
  organizationId: string
  name: string
  description: string
  city: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: Timestamp
  endDate: Timestamp
  maxMusicians: number
  currentMusicians: number
  budgetUsd: number
  beamCoinsTotal: number
  rehearsalSchedule: RehearsalEvent[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 3. `musicians`
```typescript
interface Musician {
  id: string
  userId: string
  name: string
  email: string
  phone?: string
  city: string
  instruments: string[]
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  beamCoinsBalance: number
  status: 'active' | 'inactive' | 'pending'
  profileImageUrl?: string
  bio?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 4. `projectMusicians`
```typescript
interface ProjectMusician {
  id: string
  projectId: string
  musicianId: string
  instrument: string
  role: 'musician' | 'section_leader' | 'soloist' | 'conductor'
  status: 'pending' | 'confirmed' | 'completed' | 'dropped'
  usdEarned: number
  beamCoinsEarned: number
  auditionSubmitted: boolean
  auditionUrl?: string
  notes?: string
  joinedAt: Timestamp
  updatedAt: Timestamp
}
```

### 5. `pulseEntries`
```typescript
interface PulseEntry {
  id: string
  projectId: string
  source: 'gmail' | 'calendar' | 'system' | 'manual'
  summary: string
  actionSuggested: ActionSuggestion[]
  assignedTo?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  insights: PulseInsights
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface ActionSuggestion {
  action: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedTime: string
  impact: string
  assignedTo?: string
  completedAt?: Timestamp
}

interface PulseInsights {
  missingInstruments: MissingInstrument[]
  upcomingEvents: UpcomingEvent[]
  unreadEmails: UnreadEmail[]
  musicianEngagement: MusicianEngagement[]
}

interface MissingInstrument {
  instrument: string
  needed: number
  confirmed: number
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface UpcomingEvent {
  date: string
  time: string
  type: string
  location: string
  musicians: number
  needed: number
  status: 'confirmed' | 'tentative' | 'cancelled'
}

interface UnreadEmail {
  from: string
  subject: string
  time: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  project: string
  threadId?: string
}

interface MusicianEngagement {
  musicianId: string
  name: string
  lastActive: Timestamp
  responseRate: number
  satisfaction: number
}
```

### 6. `users` (Firebase Auth + Custom Claims)
```typescript
interface User {
  uid: string
  email: string
  role: 'beam_admin' | 'partner_admin' | 'musician' | 'audience'
  organizationId?: string
  customClaims: {
    role: string
    organizationId?: string
    permissions: string[]
  }
  createdAt: Timestamp
  lastLoginAt: Timestamp
}
```

### 7. `beamCoinTransactions`
```typescript
interface BeamCoinTransaction {
  id: string
  musicianId: string
  projectId?: string
  type: 'earned' | 'spent' | 'transferred' | 'bonus'
  amount: number
  description: string
  source: 'rehearsal' | 'performance' | 'community_outreach' | 'content_creation' | 'redemption'
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: Timestamp
}
```

### 8. `auditions`
```typescript
interface Audition {
  id: string
  projectId: string
  musicianId: string
  instrument: string
  status: 'submitted' | 'reviewed' | 'accepted' | 'rejected' | 'waitlisted'
  submissionUrl: string
  notes?: string
  reviewedBy?: string
  reviewedAt?: Timestamp
  createdAt: Timestamp
}
```

### 9. `communications`
```typescript
interface Communication {
  id: string
  projectId: string
  type: 'email' | 'sms' | 'push_notification' | 'system_message'
  recipient: string | string[] // musicianId or email
  subject: string
  content: string
  status: 'draft' | 'sent' | 'delivered' | 'failed'
  sentAt?: Timestamp
  createdAt: Timestamp
  createdBy: string
}
```

### 10. `rehearsals`
```typescript
interface Rehearsal {
  id: string
  projectId: string
  date: Timestamp
  time: string
  duration: number
  location: string
  type: 'sectional' | 'full_orchestra' | 'dress_rehearsal'
  section?: string // 'strings' | 'winds' | 'brass' | 'percussion'
  maxParticipants: number
  currentParticipants: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Indexes Required

### Firestore Indexes
```javascript
// For querying projects by organization and status
db.collection('projects')
  .where('organizationId', '==', 'orgId')
  .where('status', '==', 'active')

// For querying musicians by city and status
db.collection('musicians')
  .where('city', '==', 'Milwaukee')
  .where('status', '==', 'active')

// For querying project musicians by project and status
db.collection('projectMusicians')
  .where('projectId', '==', 'projectId')
  .where('status', '==', 'confirmed')

// For querying pulse entries by project and priority
db.collection('pulseEntries')
  .where('projectId', '==', 'projectId')
  .where('priority', '==', 'high')
  .orderBy('createdAt', 'desc')
```

## Security Rules

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Organizations - only admins can read/write
    match /organizations/{orgId} {
      allow read, write: if request.auth != null && 
        request.auth.token.role == 'beam_admin';
    }
    
    // Projects - admins and organization admins can access
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        (request.auth.token.role == 'beam_admin' || 
         request.auth.token.organizationId == resource.data.organizationId);
    }
    
    // Musicians - admins and the musician themselves
    match /musicians/{musicianId} {
      allow read, write: if request.auth != null && 
        (request.auth.token.role == 'beam_admin' || 
         request.auth.uid == resource.data.userId);
    }
    
    // Project Musicians - admins and organization admins
    match /projectMusicians/{pmId} {
      allow read, write: if request.auth != null && 
        (request.auth.token.role == 'beam_admin' || 
         request.auth.token.role == 'partner_admin');
    }
    
    // Pulse Entries - admins only
    match /pulseEntries/{entryId} {
      allow read, write: if request.auth != null && 
        request.auth.token.role == 'beam_admin';
    }
  }
}
```

## Environment Variables Required

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for server-side operations)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email

# OpenAI Pulse API
PULSE_API_KEY=your_openai_pulse_api_key
OPENAI_API_KEY=your_openai_api_key
```
