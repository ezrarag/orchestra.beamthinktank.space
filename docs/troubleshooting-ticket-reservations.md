# Troubleshooting Ticket Reservations Not Showing on Dashboards

## Quick Diagnosis

If ticket reservations aren't showing up on the dashboards, check the following:

### 1. Check Browser Console

Open your browser's developer console (F12) and look for:
- `Fetched RSVPs: X [...]` - Shows how many RSVPs were found
- `RSVP Stats: {...}` - Shows the calculated statistics
- `Found X events for project Y: [...]` - Shows events linked to a project
- Any error messages

### 2. Verify RSVP Was Created

**Check Firestore:**
1. Go to Firebase Console → Firestore Database
2. Navigate to `eventRSVPs` collection
3. Verify your RSVP exists with:
   - `eventId`: Should match the event ID
   - `name`: Your name
   - `email`: Your email
   - `hasPlusOne`: true/false
   - `timestamp`: When it was created

### 3. Check Event Has projectId (For Project Dashboard)

**The project dashboard only shows tickets for events linked to that project.**

**To check:**
1. Go to Firebase Console → Firestore Database
2. Navigate to `events` collection
3. Find your event (search by title)
4. Check if `projectId` field exists and matches the project ID

**To fix:**
1. Go to `/admin/events`
2. Click on your event to edit it
3. Find the "Project ID" field
4. Enter the project ID (e.g., `black-diaspora-symphony`)
5. Save the event

**Common Project IDs:**
- `black-diaspora-symphony` - Black Diaspora Symphony Orchestra

### 4. Main Dashboard Should Show All RSVPs

The main admin dashboard (`/admin/dashboard`) queries **all** RSVPs regardless of projectId, so it should show your reservation even if the event doesn't have a projectId set.

**If it's not showing:**
1. Check browser console for errors
2. Verify RSVP exists in Firestore (step 2)
3. Check Firestore security rules allow reading `eventRSVPs`
4. Try refreshing the page

### 5. Project Dashboard Only Shows Project Events

The project dashboard (`/admin/projects/[id]`) only shows tickets for events where `event.projectId === projectId`.

**To see your reservation on the project dashboard:**
1. Ensure the event has `projectId` set (step 3)
2. The `projectId` must match the project ID in the URL
3. Refresh the project dashboard

## Common Issues

### Issue: RSVP Created But Not Showing

**Possible Causes:**
1. **Event doesn't have projectId** - Fix by editing the event and setting projectId
2. **Permission error** - Check Firestore security rules
3. **Query error** - Check browser console for errors

**Solution:**
- Check browser console logs
- Verify RSVP exists in Firestore
- Ensure event has projectId if viewing project dashboard

### Issue: Main Dashboard Shows 0 RSVPs

**Possible Causes:**
1. **Firestore query failing** - Check console for errors
2. **Security rules blocking read** - Verify rules allow admin read access
3. **RSVP not actually created** - Check Firestore directly

**Solution:**
- Check browser console for error messages
- Verify Firestore security rules
- Check if RSVP document exists in Firestore

### Issue: Project Dashboard Shows 0 Tickets

**Possible Causes:**
1. **Event doesn't have projectId** - Most common issue
2. **projectId mismatch** - projectId doesn't match URL parameter
3. **No events linked to project** - Event exists but not linked

**Solution:**
- Edit the event and set the correct projectId
- Verify projectId matches the project ID in the URL
- Check console logs for "Found X events for project Y"

## Debugging Steps

1. **Open Browser Console** (F12)
2. **Navigate to dashboard** (`/admin/dashboard` or `/admin/projects/[id]`)
3. **Look for console logs:**
   - `Fetched RSVPs: X` - Should show count > 0 if RSVPs exist
   - `Found X events for project Y` - Should show events if projectId is set
4. **Check Firestore directly:**
   - Verify RSVP document exists
   - Verify event has projectId (for project dashboard)
5. **Check Firestore Security Rules:**
   - Admins should be able to read `eventRSVPs`
   - Admins should be able to read `events`

## Quick Fix Checklist

- [ ] RSVP exists in Firestore `eventRSVPs` collection
- [ ] Event exists in Firestore `events` collection
- [ ] Event has `projectId` field set (for project dashboard)
- [ ] `projectId` matches the project ID in URL (for project dashboard)
- [ ] Browser console shows no errors
- [ ] Firestore security rules allow admin read access
- [ ] Page refreshed after creating RSVP

## Still Not Working?

1. Check the browser console for specific error messages
2. Verify Firestore security rules allow reading both collections
3. Ensure you're logged in as an admin user
4. Try creating a new RSVP and watching the console logs
5. Check if the event's `projectId` field is set correctly

