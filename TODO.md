# BEAM Orchestra Platform - TODO

## Completed ✅

### Ticketing System (Latest Release)
- ✅ Multi-city event management system
- ✅ Admin event CRUD interface (`/admin/events`)
- ✅ Public ticket pages (`/tickets`)
- ✅ Stripe integration for paid tickets
- ✅ Free event RSVP system
- ✅ External ticket link support
- ✅ Price tier system (multiple ticket types per event)
- ✅ Firestore security rules for events, orders, and RSVPs
- ✅ Storage rules for event poster images
- ✅ Stripe webhook handler for ticket purchases
- ✅ TypeScript type definitions for events system

### Studio Page
- ✅ Watch & Explore page (`/studio`)
- ✅ Rehearsal video gallery
- ✅ Featured projects section

### UI Updates
- ✅ Updated navigation (added Events link)
- ✅ Updated footer links (Tickets & Performances, Watch & Explore)

## In Progress / Next Steps 🚧

### Authentication & SMS

1. **Fix reCAPTCHA for SMS Authentication**
   - [ ] Investigate and fix reCAPTCHA container rendering issues
   - [ ] Ensure reCAPTCHA verifier properly initializes before SMS send
   - [ ] Handle reCAPTCHA expiration and retry logic
   - [ ] Improve error handling for reCAPTCHA-related failures
   - [ ] Test SMS authentication flow across different browsers/devices
   - [ ] Location: `components/AuthButtons.tsx` and `lib/authClient.ts`
   - **Priority: High** - SMS authentication is currently unreliable

### Ticketing System Enhancements

1. **Email Confirmations**
   - [ ] Send confirmation emails after ticket purchase
   - [ ] Send RSVP confirmation emails for free events
   - [ ] Include ticket details and QR codes in emails
   - Location: `/api/stripe/webhook/route.ts` (TODO comment)

2. **QR Code Generation**
   - [ ] Generate QR codes for purchased tickets
   - [ ] Store QR code data in `eventOrders` collection
   - [ ] Admin scanning interface for check-in at venues
   - [ ] Location: Extend `/app/checkin` page or create new admin interface
   - Location: `/api/stripe/webhook/route.ts` (TODO comment)

3. **Ticket Quantity Management**
   - [ ] Decrement available ticket quantities when purchased
   - [ ] Prevent over-selling (check availability before checkout)
   - [ ] Show remaining tickets on event pages
   - Location: `/api/tickets/checkout/route.ts` and `/api/stripe/webhook/route.ts`

4. **Subscription Discounts**
   - [ ] Check user subscription status in checkout flow
   - [ ] Apply member discounts to ticket prices
   - [ ] Display discount information on event pages
   - Location: `/api/tickets/checkout/route.ts` (TODO comment)

5. **Media System Integration**
   - [ ] Link events to project media
   - [ ] Display event photos/videos on event detail pages
   - [ ] Add `mediaIds` array to event document schema
   - Location: Event admin pages and public event pages

6. **Partner Organization Management**
   - [ ] Add `organizationId` field to events
   - [ ] Allow partner admins to manage their own events
   - [ ] Organization-scoped event management interface
   - [ ] Update security rules for organization-based access
   - Location: `/api/stripe/webhook/route.ts` (TODO comment)

7. **Geo Check-in for Musicians**
   - [ ] Allow musicians to check in at venue location
   - [ ] Integration with existing attendance system
   - [ ] Location: Extend `/app/checkin` page

### Studio Page Enhancements

1. **Dynamic Content Loading**
   - [ ] Load rehearsal videos from Firestore instead of hardcoded array
   - [ ] Load featured projects dynamically
   - [ ] Add pagination for video gallery
   - Location: `/app/studio/page.tsx` (TODO comment)

2. **Subscription Integration**
   - [ ] Implement real subscription flow with Stripe
   - [ ] Integrate with Neighbor SSO (neighbor.beamthinktank.space)
   - [ ] Redirect users to Neighbor portal after subscription with SSO token
   - Location: `/app/studio/page.tsx` (TODO comment)

3. **Video Management**
   - [ ] Admin interface to upload/manage rehearsal videos
   - [ ] Video metadata (project, piece, date, description)
   - [ ] Video access control (public vs. subscriber-only)

### General Improvements

1. **Event Analytics**
   - [ ] Track ticket sales metrics
   - [ ] RSVP conversion rates
   - [ ] Revenue reporting dashboard
   - [ ] Location: New admin analytics page

2. **Event Notifications**
   - [ ] Email notifications for new events
   - [ ] Reminder emails before events
   - [ ] SMS notifications (optional)

3. **Accessibility**
   - [ ] Audit and improve ARIA labels
   - [ ] Keyboard navigation improvements
   - [ ] Screen reader optimization

4. **Performance**
   - [ ] Optimize event listing page (pagination, filtering)
   - [ ] Image optimization for event posters
   - [ ] Lazy loading for video gallery

5. **Testing**
   - [ ] Unit tests for ticket checkout flow
   - [ ] Integration tests for Stripe webhook
   - [ ] E2E tests for event creation and purchase flow

## Future Considerations 💡

- Multi-language support for events
- Event waitlist functionality
- Group ticket purchases
- Gift tickets
- Event calendar integration (Google Calendar, iCal)
- Social media sharing for events
- Event reviews and ratings
- Recurring event series management
- Venue management system
- Artist/performer profiles linked to events

