# Media Access & Dashboard Audit

## Summary of Changes

### 1. ✅ Grant Media Access Feature
**Location:** `/admin/projects/[id]/media`

**What was added:**
- "Grant Access" button on admin media page
- Modal to grant access by email, phone, or name
- Supports granting roles: musician, board, public
- Automatically creates/updates user documents and projectMusicians entries

**How it works:**
1. Admin clicks "Grant Access" button
2. Selects search method (email/phone/name)
3. Enters identifier
4. Selects role to grant
5. System searches for existing user or creates new one
6. Updates Firestore with appropriate role and project access

---

## 2. Media Access Links - Where to Place Them

### Recommended Locations:

#### **Option A: Roster Page (Recommended)**
**Location:** `/training/contract-projects/black-diaspora-symphony` (roster section)

**Benefits:**
- Musicians already visit this page to see roster
- Natural place to find project resources
- Can show different links based on login status

**Implementation:**
- Add "Media Library" link in the navigation sections
- Show prominent button/link when user is logged in as musician/admin/board
- Link: `/projects/black-diaspora-symphony/media`

#### **Option B: Members Page**
**Location:** `/members`

**Benefits:**
- General members directory
- Could show media links for all projects

**Implementation:**
- Add project-specific media sections
- Filter by project membership

#### **Option C: Project Detail Page**
**Location:** `/admin/projects/[id]` or `/projects/[id]`

**Benefits:**
- Centralized project hub
- Already has project information

**Implementation:**
- Add "Media" tab/section
- Link to media library

---

## 3. Board/Admin Section on Roster Page

### Proposed Design:

Add a new section at the bottom of the roster page (`/training/contract-projects/black-diaspora-symphony`) that displays:

**For Public Viewers:**
- Board member names and titles (if public)
- Admin names (if public)
- "Login to see more" prompt

**For Logged-in Board/Admin:**
- Full board/admin roster
- Links to:
  - Media Library (`/projects/black-diaspora-symphony/media`)
  - Admin Dashboard (`/admin/dashboard` for admins)
  - Board Dashboard (`/admin/board` for board members)
- Project analytics access
- Additional project resources

**Implementation Plan:**
1. Add new section after roster section
2. Fetch board/admin members from Firestore
3. Show different content based on auth status
4. Add login prompts for non-authenticated users
5. Add quick links for authenticated board/admin

---

## 4. Musician Dashboard Audit

### Current State: ❌ **NO DEDICATED MUSICIAN DASHBOARD EXISTS**

**What exists instead:**
1. **Project Roster Page** (`/training/contract-projects/black-diaspora-symphony`)
   - Shows roster, materials, compensation, schedule, FAQ, media
   - Accessible to all, but shows more when logged in
   - **This functions as a de facto musician dashboard**

2. **Musician Profile Modal** (`components/MusicianProfileModal.tsx`)
   - Shows musician profile, documents, payments, donations
   - Accessible from roster page
   - **This is the closest thing to a musician dashboard**

3. **Media Library Page** (`/projects/[id]/media`)
   - Shows project media filtered by access level
   - Accessible to musicians

### Benefits of Creating a Dedicated Musician Dashboard:

**Pros:**
- ✅ Centralized hub for all musician activities
- ✅ Quick access to:
  - Upcoming rehearsals
  - Media library
  - Documents (contracts, W9s)
  - Payment history
  - Project materials
  - Attendance tracking
- ✅ Personalized experience
- ✅ Notifications/alerts
- ✅ Better UX than scattered pages

**Cons:**
- ❌ Additional development time
- ❌ Current roster page already serves this purpose
- ❌ May duplicate functionality

### Recommendation:
**Create a lightweight musician dashboard** that aggregates:
- Upcoming rehearsals (from schedule)
- Recent media uploads
- Document status
- Payment summary
- Quick links to:
  - Full roster page
  - Media library
  - Project materials
  - Profile settings

**Location:** `/musician/dashboard` or `/dashboard` (if musician role)

---

## 5. Subscriber Dashboard Design

### Proposed Structure:

**Location:** `/subscriber/dashboard` or `/dashboard` (if subscriber role)

### Dashboard Sections:

#### **1. Overview Section**
- Welcome message
- Subscription status (active/cancelled)
- Next billing date
- Subscription tier ($5/month)

#### **2. Projects Section**
- List of all available projects
- Project cards showing:
  - Project name (e.g., "Black Diaspora Symphony Orchestra")
  - Project status (upcoming, active, completed)
  - Media count available
  - Quick link to project media
- Filter by project type

#### **3. Media Library**
- Recent media uploads across all projects
- Filter by project
- Filter by media type (rehearsal, performance, interview)
- Search functionality
- "View All Media" link

#### **4. My Content**
- Saved/favorited media
- Download history
- Playlists (future feature)

#### **5. Account Management**
- Subscription management
- Payment history
- Billing information
- Cancel subscription option

#### **6. Community**
- Member directory (public profiles)
- Upcoming events
- Community announcements

### Multi-Project Support:

Since BEAM will have multiple projects (Black Diaspora Symphony, future projects):

**Project Cards:**
```
┌─────────────────────────────────────┐
│ Black Diaspora Symphony Orchestra   │
│                                     │
│ Status: Active                      │
│ Media Available: 12 videos         │
│                                     │
│ [View Project] [View Media]         │
└─────────────────────────────────────┘
```

**Navigation:**
- Sidebar with project list
- Project switcher dropdown
- "All Projects" view

### Implementation Priority:

**Phase 1 (MVP):**
- Overview section
- Projects list
- Media library with project filtering
- Account management

**Phase 2:**
- Saved content
- Community features
- Notifications

**Phase 3:**
- Advanced filtering
- Playlists
- Social features

---

## Access URLs Summary

### For Musicians:
- **Media Library:** `/projects/black-diaspora-symphony/media`
- **Roster Page:** `/training/contract-projects/black-diaspora-symphony`
- **Musician Dashboard:** (to be created) `/musician/dashboard`

### For Admin/Board:
- **Admin Media Management:** `/admin/projects/black-diaspora-symphony/media`
- **Admin Dashboard:** `/admin/dashboard`
- **Board Dashboard:** `/admin/board`
- **Project Board View:** `/admin/projects/black-diaspora-symphony/board`
- **Media Library (view):** `/projects/black-diaspora-symphony/media`

### For Subscribers:
- **Subscriber Dashboard:** (to be created) `/subscriber/dashboard`
- **Media Library:** `/projects/black-diaspora-symphony/media` (filtered by subscriber access)

---

## Next Steps

1. ✅ Add "Grant Access" feature (COMPLETED)
2. ⏳ Add board/admin section to roster page
3. ⏳ Add media links to roster page
4. ⏳ Create musician dashboard (optional)
5. ⏳ Create subscriber dashboard
6. ⏳ Update navigation/header with dashboard links

