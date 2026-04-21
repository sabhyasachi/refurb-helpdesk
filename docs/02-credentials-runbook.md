# Day 1 — Credentials Runbook

Do these before code-wiring time on Day 1. Total: **~1 hour of your time**.
Each section has a **paste slot** — fill it in, paste the result in chat when done.

---

## 1. GitHub repo (5 min)

1. Go to https://github.com/new
2. Repo name: `refurb-helpdesk`
3. Visibility: **Private**
4. Initialize with README: **No**
5. Click **Create repository**
6. Copy the HTTPS URL

**Paste slot:**
```
GITHUB_REPO_URL =
```

Then enable Pages (after first push):
- Settings → Pages → Source: `Deploy from branch` → Branch: `main` → `/ (root)` → Save
- Wait 30s, Pages URL appears at top.

**Paste slot:**
```
GITHUB_PAGES_URL =
```

---

## 2. Google Sheet + 7 tabs (5 min)

1. https://sheets.google.com → Blank
2. Rename file: `RefurbHelpdesk_DB`
3. Create 7 tabs with these **exact names** (case-sensitive):
   - `users`
   - `issues`
   - `issue_comments`
   - `issue_attachments`
   - `workshops`
   - `departments`
   - `cities`
4. In each tab, **paste the corresponding CSV** from `refurb-helpdesk/seed/`:
   - File → Import → Upload → pick CSV → Import location: **Replace current sheet** → Separator: Comma
5. Copy the spreadsheet ID from URL: `https://docs.google.com/spreadsheets/d/{THIS_PART}/edit`

**Paste slot:**
```
GOOGLE_SHEET_ID =
```

---

## 3. Google Cloud service account (20–30 min first time)

This one's the longest. Instructions below work on a fresh Google Cloud account.

1. https://console.cloud.google.com → Create new project → name `refurb-helpdesk`
2. Enable these APIs (each is a separate click):
   - https://console.cloud.google.com/apis/library/sheets.googleapis.com → Enable
   - https://console.cloud.google.com/apis/library/drive.googleapis.com → Enable
3. Create service account:
   - IAM & Admin → Service Accounts → **Create service account**
   - Name: `refurb-helpdesk-bot`
   - Role: skip (click Continue → Done)
4. Generate key:
   - Click the new service account → Keys tab → Add Key → Create new key → **JSON** → Create
   - A `.json` file downloads. **This is your credential.**
5. Copy the `client_email` from the JSON (ends in `@*.iam.gserviceaccount.com`).
6. Share the Google Sheet with that email: open sheet → Share → paste email → **Editor** → Send.
7. Upload the JSON somewhere **you control** (not public). Options:
   - Paste contents into N8N's Credentials → Google Service Account, OR
   - Save to a password manager, OR
   - Keep locally and paste into N8N only.

**Paste slot:**
```
SERVICE_ACCOUNT_EMAIL =
SERVICE_ACCOUNT_JSON = (paste contents or tell me "uploaded to N8N")
```

---

## 4. Google Drive folder for attachments (2 min)

1. https://drive.google.com → New → Folder → name `RefurbHelpdesk_Attachments`
2. Right-click the folder → Share → paste service account email from step 3 → **Editor** → Send.
3. Open the folder. Copy the folder ID from URL: `https://drive.google.com/drive/folders/{THIS_PART}`

**Paste slot:**
```
DRIVE_FOLDER_ID =
```

---

## 5. N8N access (2 min to check)

Answer three questions:

**Paste slot:**
```
N8N_BASE_URL =
CAN_I_CREATE_WORKFLOWS = yes / no-need-JSON-handoff
CAN_I_CREATE_CREDENTIALS = yes / no-someone-else-does-it
```

If any answer is "no", tell me and I'll switch to JSON-handoff mode (I give you files, you import via Admin → Import).

---

## 6. Claude API key (5 min)

1. https://console.anthropic.com → API Keys → Create Key → copy
2. Make sure billing is set up (Plans & Billing → Add credit card → prepaid $5 is enough for a month of MVP usage at this volume).

**Paste slot:**
```
CLAUDE_API_KEY = sk-ant-...
```

Optional — Qwen fallback:

**Paste slot:**
```
QWEN_API_URL = (leave blank if skipping)
QWEN_API_KEY =
```

---

## 7. Product decisions (5 min of thinking)

**Paste slot:**
```
AI_BOT_IDENTITY      = helpdesk_bot / ghost_as_neha
EXTRA_SEED_USERS     = (names to add, or "seed data is enough for demo")
EXTRA_WORKSHOPS      = (real branch list, or "seed data is enough for demo")
SLA_ENABLED          = yes / no-v1-skip
LOGIN_OTP            = no / yes-email-otp
AI_CATEGORIES_TO_USE = (default: bug, question, process, tool, other — prototype's 5)
```

---

## Done checklist

- [ ] GitHub repo created + Pages enabled
- [ ] Google Sheet created + 7 tabs + seed CSVs imported
- [ ] Service account created + JSON downloaded + sheet shared
- [ ] Drive folder created + shared with service account
- [ ] N8N access confirmed
- [ ] Claude API key generated + billing live
- [ ] Product decisions answered

When all ☐ → ☑, paste the filled-in slots in chat and I start Phase 2 (N8N wiring).
