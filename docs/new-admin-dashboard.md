# New BEAM Admin Dashboard

## Overview

The BEAM Admin Dashboard has been completely redesigned with a macro-level view of all projects, metrics, and system health.

## Features Implemented

### 1. Global Wrapper
- ✅ `max-w-7xl mx-auto px-6` wrapper for consistent width
- ✅ `space-y-10` spacing between sections
- ✅ Responsive design for all screen sizes

### 2. BEAM Health Overview
Six metric cards displaying:
- ✅ Active Projects
- ✅ Active Cities
- ✅ Total Musicians
- ✅ Total BEAM Coins Issued
- ✅ Total Tickets Sold (clickable for breakdown)
- ✅ Total Media Uploaded

### 3. Pulse Intelligence Section
Pulse Alerts panel showing:
- ✅ Overdue tasks across all projects
- ✅ Tasks due in next 48 hours
- ✅ Resource mismatch warnings
- ✅ Missing media uploads

**Data Sources:**
- Queries `pulse_tasks` or `pulseEntries` collection
- Checks project musician counts vs. requirements
- Checks media uploads per project

### 4. BEAM Coin Overview
Four cards showing:
- ✅ Coins issued today
- ✅ Coins redeemed today
- ✅ Outstanding coins
- ✅ Expiring coins (within 30 days)

**Link:** Click "View Full Ledger" to go to `/admin/coins`

### 5. Projects Snapshot Table
Table displaying:
- ✅ Project name (clickable link)
- ✅ City
- ✅ Musicians confirmed / total
- ✅ Progress percentage with visual bar
- ✅ Revenue from ticket sales
- ✅ Missing tasks count

### 6. Environment-based Styling
- ✅ Development mode shows "STAGING MODE" ribbon
- ✅ Thicker card borders in dev (`border-orchestra-gold/40`)
- ✅ Tailwind `ring-2 ring-yellow-400` in dev mode

### 7. Responsive Grid Layouts
- ✅ All cards use responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` or `lg:grid-cols-4`
- ✅ Consistent `gap-6` between cards
- ✅ Table is horizontally scrollable on mobile

## Components Created

### `/components/admin/MetricCard.tsx`
Reusable metric card component with:
- Icon support
- Trend indicators
- Click handlers
- Environment-aware styling

### `/components/admin/AlertBadge.tsx`
Alert badge component for pulse alerts with:
- Multiple types: overdue, due-soon, warning, info, success
- Color-coded styling
- Icon support

### `/components/admin/ProjectsTable.tsx`
Projects snapshot table with:
- Responsive design
- Clickable project links
- Progress bars
- Revenue formatting

## Data Sources

### Live Queries (onSnapshot)
- `projects` - Real-time project updates
- `projectMusicians` - Real-time musician counts
- `projectRehearsalMedia` - Real-time media count

### One-time Queries
- `eventOrders` - Ticket sales data
- `eventRSVPs` - Free ticket reservations
- `events` - Event data for project linking
- `pulse_tasks` or `pulseEntries` - Task data
- `beamCoins` - Coin metrics (if collection exists)

## Ticket Breakdown Modal

Clicking the "Total Tickets Sold" card opens a modal showing:
- Ticket sales broken down by project
- Paid tickets vs. RSVPs
- Revenue per project
- Clickable project links

## Styling

- Uses existing Tailwind classes
- Consistent with orchestra theme colors
- Development mode has visual indicators
- Responsive breakpoints: `md:` and `lg:`

## Next Steps

1. **Deploy Firestore Rules** - See `docs/deploy-firestore-rules.md`
2. **Create `/admin/coins` page** - For full BEAM coin ledger
3. **Set up `pulse_tasks` collection** - If not using `pulseEntries`
4. **Add more pulse intelligence** - Expand task tracking

## Notes

- Partner admins are automatically redirected to their project dashboard
- All queries handle missing collections gracefully
- Loading states are shown during initial data fetch
- Real-time updates via Firestore `onSnapshot`





