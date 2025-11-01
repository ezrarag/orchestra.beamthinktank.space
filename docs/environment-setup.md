# Environment Variables Setup

## Required Environment Variables

### Firebase Configuration
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_PROJECT_ID=your_project_id
```

### SMTP Configuration (Zoho for Production)

**Production (Zoho SMTP):**
```env
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=noreply@beamthinktank.space
SMTP_PASSWORD=your_zoho_app_password
SMTP_FROM="BEAM Orchestra <noreply@beamthinktank.space>"
```

**Development (Gmail - Testing Only):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
SMTP_FROM=noreply@beamthinktank.space
```

**Important Notes:**
- Use Zoho SMTP (`smtp.zoho.com`) for all production SMS and email sends
- Personal addresses (like `ezra.haugabrooks@gmail.com`) should only be used for testing
- Never use personal email addresses for production SMS relay via carrier gateways
- Zoho requires an App Password (not your regular password) - generate in Zoho Mail settings

### OpenAI Configuration (Optional)
```env
OPENAI_API_KEY=your_openai_api_key
```

### Base URL
```env
NEXT_PUBLIC_BASE_URL=https://orchestra.beamthinktank.space
NEXT_PUBLIC_APP_URL=https://orchestra.beamthinktank.space
```

### Stripe Configuration (Optional)
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Google Sheets (Optional - for imports)
```env
GOOGLE_SHEETS_ID=your_google_sheet_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

## Setup Instructions

1. Copy `.env.example` to `.env.local`
2. Fill in all required Firebase credentials
3. For production, configure Zoho SMTP credentials
4. Set `NEXT_PUBLIC_BASE_URL` to your production domain

## Zoho SMTP Setup

1. Sign in to Zoho Mail for `beamthinktank.space`
2. Go to Settings → Security → App Passwords
3. Generate a new App Password for "BEAM Orchestra Platform"
4. Use this password in `SMTP_PASSWORD` (not your regular Zoho password)
5. Set `SMTP_USER=noreply@beamthinktank.space`
6. Set `SMTP_FROM="BEAM Orchestra <noreply@beamthinktank.space>"` (with quotes)

## Security Best Practices

- Never commit `.env.local` to git
- Use environment variables for all sensitive data
- Rotate API keys and passwords regularly
- Use App Passwords for SMTP (not regular passwords)
- Limit Firebase API keys to specific domains/IPs when possible

