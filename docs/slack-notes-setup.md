# Slack Notes Setup

This project includes an admin-only page at `/admin/slack-notes` that sends notes to Slack.

## 1) Create or choose the Slack channel

Pick the channel that should receive notes (example: `#orchestra-admin-notes`).

## 2) Create an incoming webhook for that channel

1. In Slack, open your workspace and go to **Apps**.
2. Install **Incoming WebHooks** (if not already installed).
3. Click **Add New Webhook to Workspace**.
4. Select your target channel (example: `#orchestra-admin-notes`).
5. Copy the generated webhook URL.

## 3) Add environment variable

In `.env.local` (and your deploy host env settings), set:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

Optional, but recommended for clean links:

```env
NEXT_PUBLIC_BASE_URL=https://orchestra.beamthinktank.space
```

## 4) Use the feature

1. Sign in with a `beam_admin` account.
2. Open `/admin/slack-notes`.
3. Enter title + note (+ optional page context).
4. Click **Send to Slack**.

## Notes

- API endpoint: `POST /api/admin/slack-notes`
- Auth required: Firebase ID token + `beam_admin` role
- If `SLACK_WEBHOOK_URL` is missing or invalid, the API returns an error and nothing is posted.
