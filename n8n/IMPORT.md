# N8N Workflow Import Guide

This folder contains N8N workflow JSONs that you **import** into your N8N instance. No UI-click building required.

---

## One-time setup (do this first, 5 min)

### 1. Create the Google service account credential

N8N → top-right → **Credentials** → **+ Add credential** → search `Google` → pick **Google Service Account API**.

- **Service Account Email:** paste the email from your `service-account.json` (`client_email` field)
- **Private Key:** paste the `private_key` field from your JSON (include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines, keep `\n` as real newlines)
- **Impersonate a User:** leave blank
- Click **Save**. Name it exactly: `RefurbHelpdesk SA`.

### 2. Create workflow variables

N8N → **Settings** (gear) → **Variables** → **+ Add variable**:

| Key | Value |
|-----|-------|
| `SHEET_ID`         | `1OOQH2zt8nZ721nMGF0VBYdiVbEkA5dHbaozEF4x6b3c` |
| `DRIVE_FOLDER_ID`  | *(your Drive folder ID — fill in when IT unblocks)* |
| `AI_ENDPOINT`      | `https://proxy-implicit-unstable.ngrok-free.dev/api/text` |

---

## Import each workflow (1 min per file)

For each `.json` file in this folder, in order:

1. N8N → top-left → **+** → **New** → **...** (three dots, top-right) → **Import from File**
2. Pick the `.json` (e.g. `01-auth-login.json`)
3. The workflow opens. Any node that uses the Google Sheets credential will show an error badge.
4. Click that node → in the Credentials section, pick `RefurbHelpdesk SA` from the dropdown → Save.
5. Click **Save** (top-right) → toggle **Active** (top-right switch) → green = live.
6. Click the **Webhook** node → copy the **Production URL**. Looks like:
   `https://<your-n8n-host>/webhook/auth-login`

Paste me the **base URL** (the part before `/webhook/`) after importing #1 — that's what goes into `web/config.js` `N8N_BASE`.

---

## Shipped in this batch

| File | Endpoint | Status |
|------|----------|--------|
| `01-auth-login.json`   | `POST /webhook/auth-login`   | ✅ ready to import |
| `02-lookups.json`      | `POST /webhook/lookups`      | ✅ ready to import |
| `03-users-list.json`   | `POST /webhook/users-list`   | ✅ ready to import |
| `04-users-delete.json` | `POST /webhook/users-delete` | ✅ ready to import |

## Coming in next batch

| File | Endpoint |
|------|----------|
| `05-users-create.json`       | `POST /webhook/users-create` |
| `06-users-update.json`       | `POST /webhook/users-update` |
| `07-issues-list.json`        | `POST /webhook/issues-list` |
| `08-issues-get.json`         | `POST /webhook/issues-get` |
| `09-issues-create.json`      | `POST /webhook/issues-create` |
| `10-issues-update.json`      | `POST /webhook/issues-update` |
| `11-issues-reopen.json`      | `POST /webhook/issues-reopen` |
| `12-comments-create.json`    | `POST /webhook/comments-create` |
| `13-attachments-upload.json` | `POST /webhook/attachments-upload` |
| `14-ai-triage.json`          | (internal — called by `issues-create`) |

See `README.md` for the full UI-build guide if you want to build any of these yourself before I ship the JSON.

---

## Smoke test after importing #1 + #2

In Chrome DevTools console (any page):

```javascript
const BASE = 'YOUR_N8N_BASE_URL'; // e.g. https://n8n.spinny.internal/webhook

// Should return: { user: { user_id: 'u_rajesh', ... } }
fetch(`${BASE}/auth-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'rajesh.k' })
}).then(r => r.json()).then(console.log);

// Should return: { cities: [...], workshops: [...], departments: [...] }
fetch(`${BASE}/lookups`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
}).then(r => r.json()).then(console.log);
```

If both return the expected shape, the plumbing works and we can trust the remaining 10 workflows will click-in the same way.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401 Unauthorized` on Google Sheets | IT hasn't whitelisted the domain yet, or sheet not shared with service account |
| `404` on webhook URL | Workflow not toggled to **Active** |
| Node shows red "credential not set" | Click the node → pick `RefurbHelpdesk SA` in Credentials dropdown → Save |
| CORS error in browser console | Webhook node Response Headers missing `Access-Control-Allow-Origin: *` — already set in these JSONs but double-check after import |
| `SHEET_ID is undefined` | N8N Variables not set — redo setup step 2 |
