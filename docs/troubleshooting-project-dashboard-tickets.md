# Troubleshooting Project Dashboard Ticket Display

## Issue

The project dashboard (`/admin/projects/[id]`) is not showing ticket aggregates, while the main admin dashboard shows them correctly.

## Root Causes

1. **Firestore Permission Errors**: Partner admins may not have proper permissions to read `eventOrders` and `eventRSVPs` collections
2. **Token Claims Missing**: Partner admin tokens may not have `assignedProjectId` or `partnerProjectId` claims
3. **Event projectId Not Set**: Events may not have `projectId` field set, so they can't be linked to projects
4. **Token Not Refreshed**: After setting partner admin role, user must sign out and back in

## Solutions

### 1. Deploy Firestore Rules

The updated Firestore rules allow partner admins to read ticket data. **Deploy them:**

```bash
firebase deploy --only firestore:rules
```

### 2. Verify Partner Admin Token Claims

Check if the partner admin has `assignedProjectId` in their token:

1. Open browser console on project dashboard
2. Check console logs for token claims
3. Look for: `assignedProjectId` or `partnerProjectId` in the token

### 3. Refresh Token

**Critical:** After setting partner admin role, the user MUST:
1. Sign out completely
2. Sign back in
3. This refreshes the ID token with new custom claims

### 4. Verify Event projectId

Ensure events have `projectId` set:

1. Go to `/admin/events`
2. Click on an event
3. Check "Project ID" field
4. Set it to the correct project ID (e.g., `black-diaspora-symphony`)

### 5. Check Browser Console

The updated code logs detailed information:
- Number of events found for project
- Number of orders found per event
- Number of RSVPs found per event
- Permission errors (if any)
- Token claims (if permission error occurs)

## Code Changes Made

### Query Optimization

- **Beam Admins**: Query all orders/RSVPs, filter client-side (faster)
- **Partner Admins**: Query filtered by eventId (required for security)

### Error Handling

- Catches permission errors specifically
- Logs helpful debugging information
- Shows token claims on permission errors
- Falls back gracefully if queries fail

### Firestore Rules

Updated to allow partner admins to read:
- `eventOrders` for events in their assigned project
- `eventRSVPs` for events in their assigned project

Rules check:
- Event exists
- Event's `projectId` matches partner admin's `assignedProjectId` or `partnerProjectId`

## Testing Steps

1. **As Beam Admin:**
   - Go to `/admin/projects/black-diaspora-symphony`
   - Should see ticket stats card with numbers
   - Should see ticket reservations list

2. **As Partner Admin:**
   - Sign out and sign back in (refresh token)
   - Go to `/admin/projects/black-diaspora-symphony`
   - Should see ticket stats card with numbers
   - Should see ticket reservations list

3. **Check Console:**
   - Look for logs showing:
     - `Found X events for project Y`
     - `Found X orders for event Y`
     - `Found X RSVPs for event Y`
     - `Ticket stats calculated: X tickets sold, $Y revenue`

## Common Issues

### Issue: "Missing or insufficient permissions"

**Cause:** Token doesn't have `assignedProjectId` claim

**Fix:**
1. Re-run `setPartnerAdmin.ts` script
2. User must sign out and back in
3. Check token claims in console

### Issue: Ticket stats show 0

**Possible Causes:**
1. No events linked to project (`projectId` not set)
2. No ticket orders/RSVPs exist
3. Permission error (check console)

**Fix:**
1. Check events have `projectId` set
2. Verify tickets exist in Firestore
3. Check console for errors

### Issue: Stats show but reservations list is empty

**Cause:** Query succeeded but no reservations found

**Fix:** This is normal if no tickets have been sold yet

## Debugging

Enable detailed logging by checking browser console. The code logs:
- Event IDs found for project
- Orders fetched per event
- RSVPs fetched per event
- Calculated ticket stats
- Any permission errors

## Next Steps

1. Deploy Firestore rules
2. Have partner admin sign out and back in
3. Check browser console for detailed logs
4. Verify events have `projectId` set
5. Test ticket display

