# N8N Build Guide — Refurb Helpdesk Backend

This folder is the source of truth for the N8N side of the backend.
The contract every workflow must follow is in [`../docs/03-n8n-webhook-contract.md`](../docs/03-n8n-webhook-contract.md).

## Why step-by-step UI instead of raw JSON import

Hand-authored N8N workflow JSON with valid UUIDs and position coords is brittle.
N8N's UI builds each workflow in 5–10 min with zero chance of import errors.
If/when you want exportable templates, export after building and commit the `.json` back here.

## Build order (matches frontend dependencies)

| # | Workflow | Webhook path | What it does |
|---|----------|--------------|--------------|
| 0 | **Setup credentials** | — | Service account + HTTP header auth (one-time) |
| 1 | auth-login | `/auth-login` | Look up user by username |
| 2 | lookups | `/lookups` | Cities, workshops, departments (static lists) |
| 3 | users-list | `/users-list` | All active users |
| 4 | issues-list | `/issues-list` | Filtered issue list |
| 5 | issues-get | `/issues-get` | One issue + comments + attachments |
| 6 | issues-create | `/issues-create` | Insert + trigger AI triage |
| 7 | issues-update | `/issues-update` | Status/assignment/priority patch |
| 8 | issues-reopen | `/issues-reopen` | Raiser-only reopen |
| 9 | comments-create | `/comments-create` | Append row |
| 10 | users-create | `/users-create` | Admin add user |
| 11 | users-update | `/users-update` | Admin edit user |
| 12 | users-delete | `/users-delete` | Soft-delete user |
| 13 | attachments-upload | `/attachments-upload` | Drive upload + sheet append |
| 14 |  ply |

## Shared concepts used throughout

### Credentials (create once, reference everywhere)

**1. "Google Sheets (service account)"** — Credentials → + Add Credential → Google Sheets (service account)
- Paste the `service-account.json` contents
- Save, name it `RefurbHelpdesk SA`

**2. "AI Triage HTTP"** — Credentials → + Add Credential → Generic Credential Type → Header Auth
- (If your ngrok endpoint needs no auth, skip this)

### Env vars (Settings → Variables)
Create two workflow variables so you don't hard-code IDs across 14 workflows:
- `SHEET_ID` = `1OOQH2zt8nZ721nMGF0VBYdiVbEkA5dHbaozEF4x6b3c`
- `DRIVE_FOLDER_ID` = `<your-drive-folder-id>`
- `AI_ENDPOINT` = `https://proxy-implicit-unstable.ngrok-free.dev/api/text`

### CORS (once per workflow)
On every **Webhook** node → Advanced Options → **Response Headers** add:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
```
And set **HTTP Method** to `POST`, **Respond** to `Using 'Respond to Webhook' Node`.

---

## Workflow 1 — `auth-login`

**Purpose:** look up a user row by `username`. Return full row or 404.

**Nodes (in order):**

1. **Webhook** — `POST /auth-login`
2. **Google Sheets** → `Lookup Row(s)`
   - Spreadsheet: `{{ $vars.SHEET_ID }}`
   - Sheet: `users`
   - Lookup column: `username`
   - Lookup value: `={{ $json.body.username.toLowerCase().trim() }}`
   - Return All Matches: off
3. **IF** — check if a row was found
   - Condition: `{{ $json.user_id }}` is not empty
4. **TRUE branch → Respond to Webhook**
   - Response Code: 200
   - Body (JSON):
   ```json
   { "user": {{ $json }} }
   ```
5. **FALSE branch → Respond to Webhook**
   - Response Code: 404
   - Body: `{ "error": "No active user with that user ID", "code": "USER_NOT_FOUND" }`

Also add an **IF** before step 2 to check `is_active === TRUE`, and return the same 404 if inactive.

---

## Workflow 2 — `lookups`

**Purpose:** bundle cities + workshops + departments in one response.

**Nodes:**
1. **Webhook** — `POST /lookups`
2. **Google Sheets** (1st) → `Get Rows` · sheet `cities`
3. **Google Sheets** (2nd) → `Get Rows` · sheet `workshops`
4. **Google Sheets** (3rd) → `Get Rows` · sheet `departments`
5. **Merge** → Combine mode: `Multiplex` or use a **Code** node
6. **Code** (JS):
```javascript
const [cities, workshops, departments] = $input.all().map(x => x.json);
return [{ json: {
  cities:      cities.map(r => ({ id: r.city_id, label: r.city_label, is_active: r.is_active === 'TRUE' || r.is_active === true })),
  workshops:   workshops.map(r => ({ id: r.workshop_id, label: r.workshop_label, city_id: r.city_id, short: r.short_name, is_active: r.is_active === 'TRUE' || r.is_active === true })),
  departments: departments.map(r => ({ id: r.department_id, label: r.department_label, color: r.color, is_active: r.is_active === 'TRUE' || r.is_active === true })),
}}];
```
7. **Respond to Webhook** — pass `{{ $json }}` through.

---

## Workflow 3 — `users-list`

1. **Webhook** — `POST /users-list`
2. **Google Sheets** → `Get Rows` · sheet `users`
3. **Code** (filter inactive + shape):
```javascript
return $input.all()
  .map(x => x.json)
  .filter(u => u.is_active === 'TRUE' || u.is_active === true)
  .map(u => ({ json: u }));
```
4. **Merge** (→ wait for all items) → **Code** to wrap:
```javascript
return [{ json: { users: $input.all().map(x => x.json) } }];
```
5. **Respond to Webhook** — `{{ $json }}`

---

## Workflow 4 — `issues-list`

1. **Webhook** — `POST /issues-list`
2. **Google Sheets** → `Get Rows` · sheet `issues`
3. **Google Sheets** → `Get Rows` · sheet `issue_comments`
4. **Google Sheets** → `Get Rows` · sheet `issue_attachments`
5. **Code** (filter + annotate counts):
```javascript
const body = $('Webhook').first().json.body || {};
const { scope = {}, filters = {}, limit = 200 } = body;

const issues = $('Google Sheets').all().map(x => x.json);
const comments = $('Google Sheets1').all().map(x => x.json);
const attachments = $('Google Sheets2').all().map(x => x.json);

const cByIssue = {};
for (const c of comments) { (cByIssue[c.issue_id] ||= []).push(c); }
const aByIssue = {};
for (const a of attachments) { (aByIssue[a.issue_id] ||= []).push(a); }

let rows = issues;

// Scope
if (scope.role === 'workshop')      rows = rows.filter(i => i.raised_by === scope.user_id);
else if (scope.role === 'manager')  rows = rows.filter(i => i.workshop_id === scope.workshop_id);

// Filters
if (filters.status?.length)   rows = rows.filter(i => filters.status.includes(i.status));
if (filters.workshop_id)      rows = rows.filter(i => i.workshop_id === filters.workshop_id);
if (filters.raised_by)        rows = rows.filter(i => i.raised_by === filters.raised_by);
if (filters.assigned_to)      rows = rows.filter(i => i.assigned_to === filters.assigned_to);
if (filters.category)         rows = rows.filter(i => i.category === filters.category);
if (filters.priority)         rows = rows.filter(i => i.priority === filters.priority);
if (filters.search) {
  const q = filters.search.toLowerCase();
  rows = rows.filter(i => i.title.toLowerCase().includes(q) || i.issue_id.toLowerCase().includes(q));
}

rows = rows
  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  .slice(0, limit)
  .map(i => {
    const { ai_triage_note, ...rest } = i;   // strip from list view
    return {
      ...rest,
      comments_count: (cByIssue[i.issue_id] || []).length,
      attachments_count: (aByIssue[i.issue_id] || []).length,
    };
  });

return [{ json: { issues: rows, total: rows.length } }];
```
6. **Respond to Webhook**

---

## Workflow 5 — `issues-get`

1. **Webhook** — `POST /issues-get`
2. **Google Sheets** (1st) → read `issues`
3. **Google Sheets** (2nd) → read `issue_comments`
4. **Google Sheets** (3rd) → read `issue_attachments`
5. **Google Sheets** (4th) → read `users`
6. **Code**:
```javascript
const body = $('Webhook').first().json.body || {};
const { issue_id, scope = {} } = body;

const issue = $('Google Sheets').all().map(x => x.json).find(i => i.issue_id === issue_id);
if (!issue) return [{ json: { error: 'Not found', code: 'NOT_FOUND' }, status: 404 }];

let comments = $('Google Sheets1').all().map(x => x.json).filter(c => c.issue_id === issue_id);
const attachments = $('Google Sheets2').all().map(x => x.json).filter(a => a.issue_id === issue_id);
const users = Object.fromEntries($('Google Sheets3').all().map(x => x.json).map(u => [u.user_id, u]));

// Strip internal comments from non-admin non-raiser
if (scope.role !== 'admin' && scope.user_id !== issue.raised_by) {
  comments = comments.filter(c => c.is_internal !== 'TRUE' && c.is_internal !== true);
}

// Strip ai_triage_note from non-admins
const { ai_triage_note, ...rest } = issue;
const issueOut = scope.role === 'admin' ? issue : rest;

return [{ json: {
  issue: issueOut,
  comments: comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  attachments,
  raiser: users[issue.raised_by] || null,
  assignee: issue.assigned_to ? (users[issue.assigned_to] || null) : null,
}}];
```
7. **Respond to Webhook**

---

## Workflow 6 — `issues-create`

**Most complex. Steps:**

1. **Webhook** — `POST /issues-create`
2. **Google Sheets** → read `issues` (to compute next ID) AND read `users` (to get raiser's workshop/dept)
3. **Code**:
```javascript
const body = $('Webhook').first().json.body || {};
const rows  = $('Google Sheets').all().map(x => x.json);
const users = $('Google Sheets1').all().map(x => x.json);

const raiser = users.find(u => u.user_id === body.raised_by);
if (!raiser) throw new Error('raiser not found');

const nextNum = rows.reduce((mx, r) => Math.max(mx, parseInt((r.issue_id || '').split('-')[1] || 0, 10)), 248) + 1;
const now = new Date().toISOString();
const row = {
  issue_id: `RH-${String(nextNum).padStart(3, '0')}`,
  title: body.title.trim(),
  description: (body.description || '').trim(),
  category: body.category,
  priority: body.priority,
  status: 'open',
  workshop_id: raiser.workshop_id,
  department_id: raiser.department_id,
  raised_by: body.raised_by,
  assigned_to: '',
  duplicate_of: '',
  ai_triage_note: '',
  created_at: now,
  updated_at: now,
  resolved_at: '',
};
return [{ json: row }];
```
4. **Google Sheets** → `Append Row` into `issues` (map each column from `$json`)
5. **Respond to Webhook** (respond fast — don't wait on AI):
   - Body: `{ "issue": {{ $json }} }`
6. **After Respond → Execute Workflow** → select `ai-triage` workflow (see #14), pass `{ issue: {{ $json }} }`

---

## Workflow 7 — `issues-update`

1. **Webhook** — `POST /issues-update`
2. **Google Sheets** → `Update Row` · sheet `issues` · lookup by `issue_id`
   - Map only changed fields from `body.patch`
   - Always set `updated_at = now`
   - If `patch.status === 'resolved'`, set `resolved_at = now`
3. **Respond to Webhook** — return updated row

**Status transition guard (add a Code node before the update):**
```javascript
const allowed = {
  open:        ['assigned', 'in_progress', 'resolved'],
  assigned:    ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved:    ['reopened'],
  reopened:    ['in_progress', 'resolved'],
};
const next = $('Webhook').first().json.body.patch.status;
const curr = $('Google Sheets').first().json.status;
if (next && !allowed[curr]?.includes(next)) {
  throw new Error(`Illegal transition: ${curr} → ${next}`);
}
return $input.all();
```

---

## Workflow 8 — `issues-reopen`

1. **Webhook** — `POST /issues-reopen`
2. **Google Sheets** → read `issues` for the issue_id
3. **Code** (auth check):
```javascript
const body = $('Webhook').first().json.body;
const issue = $('Google Sheets').first().json;
if (issue.raised_by !== body.actor) throw new Error('Only the raiser can reopen');
if (issue.status !== 'resolved')    throw new Error('Only resolved issues can be reopened');
return $input.all();
```
4. **Google Sheets** → `Update Row` · set `status='reopened'`, `resolved_at=''`, `updated_at=now`
5. **Respond to Webhook**

---

## Workflow 9 — `comments-create`

1. **Webhook** — `POST /comments-create`
2. **Google Sheets** → read `issue_comments` (for next ID)
3. **Code** (generate next ID + row):
```javascript
const body = $('Webhook').first().json.body;
const rows = $('Google Sheets').all().map(x => x.json);
const n = rows.reduce((mx, r) => Math.max(mx, parseInt((r.comment_id || '').split('-')[1] || 0, 10)), 10) + 1;
return [{ json: {
  comment_id: `CMT-${String(n).padStart(5, '0')}`,
  issue_id: body.issue_id,
  commented_by: body.commented_by,
  comment_text: body.comment_text,
  is_internal: body.is_internal ? 'TRUE' : 'FALSE',
  is_ai_generated: 'FALSE',
  created_at: new Date().toISOString(),
}}];
```
4. **Google Sheets** → `Append Row` into `issue_comments`
5. **Google Sheets** → `Update Row` on `issues` · set `updated_at=now` for the issue_id
6. **Respond to Webhook** — `{ "comment": {{ $json }} }`

---

## Workflow 10 — `users-create`

1. **Webhook** — `POST /users-create`
2. **Google Sheets** → read `users` (dedup + next id)
3. **Code**:
```javascript
const body = $('Webhook').first().json.body;
const rows = $('Google Sheets').all().map(x => x.json);
if (!/^[a-z0-9._-]{2,}$/.test(body.username || '')) throw new Error('Bad username format');
if (rows.some(u => u.username === body.username)) throw new Error('USERNAME_TAKEN');

const firstName = (body.full_name || '').trim().split(/\s+/)[0].toLowerCase();
let base = `u_${firstName}`, suffix = 0, id = base;
while (rows.some(u => u.user_id === id)) { suffix++; id = `${base}${suffix}`; }

const initials = (body.full_name || '').trim().split(/\s+/).slice(0, 2).map(s => s[0].toUpperCase()).join('');

return [{ json: {
  user_id: id,
  username: body.username,
  full_name: body.full_name,
  role: body.role,
  workshop_id: body.workshop_id || '',
  department_id: body.department_id || '',
  initials,
  color: body.color || '#6B7280',
  password: body.password || '',
  is_active: 'TRUE',
  created_at: new Date().toISOString(),
}}];
```
4. **Google Sheets** → `Append Row` into `users`
5. **Respond to Webhook** — `{ "user": {{ $json }} }`

---

## Workflow 11 — `users-update`

1. **Webhook** — `POST /users-update`
2. **Code**: merge `patch` onto target, validating role-specific fields.
3. **Google Sheets** → `Update Row` · lookup by `user_id`
4. **Respond to Webhook**

---

## Workflow 12 — `users-delete`

1. **Webhook** — `POST /users-delete`
2. **Google Sheets** → `Update Row` · set `is_active=FALSE`
3. **Respond to Webhook** — `{ "ok": true }`

---

## Workflow 13 — `attachments-upload`

**Multipart input — different from the rest.**

1. **Webhook** — `POST /attachments-upload`
   - Content type: `multipart/form-data`
   - Binary Data: on (auto-extracts `file` field)
2. **Google Drive** node → `Upload File`
   - Input Data Field: `file`
   - Drive: My Drive
   - Folder ID: `{{ $vars.DRIVE_FOLDER_ID }}`
   - Name: `={{ $json.issue_id }}__{{ $binary.file.fileName }}`
3. **Google Drive** node → `Share File` → Anyone with link · Reader
4. **Google Sheets** → read `issue_attachments` (next ID)
5. **Code**:
```javascript
const body = $('Webhook').first().json.body;
const rows = $('Google Sheets').all().map(x => x.json);
const drive = $('Google Drive').first().json;
const n = rows.reduce((mx, r) => Math.max(mx, parseInt((r.attachment_id || '').split('-')[1] || 0, 10)), 3) + 1;
return [{ json: {
  attachment_id: `ATT-${String(n).padStart(5, '0')}`,
  issue_id: body.issue_id,
  uploaded_by: body.uploaded_by,
  file_name: drive.name,
  drive_file_id: drive.id,
  drive_url: `https://drive.google.com/file/d/${drive.id}/view`,
  mime_type: drive.mimeType,
  file_size_bytes: parseInt(drive.size || 0, 10),
  created_at: new Date().toISOString(),
}}];
```
6. **Google Sheets** → `Append Row` into `issue_attachments`
7. **Respond to Webhook** — `{ "attachment": {{ $json }} }`

---

## Workflow 14 — `ai-triage` (internal)

Triggered by workflow 6 via "Execute Workflow".

1. **Execute Workflow Trigger** (accepts `{ issue }`)
2. **Google Sheets** → read last 30 days of non-closed issues (or all if volume is small)
3. **Code** — build prompt:
```javascript
const { issue } = $('Execute Workflow Trigger').first().json;
const recent = $('Google Sheets').all()
  .map(x => x.json)
  .filter(i => i.issue_id !== issue.issue_id && (new Date() - new Date(i.created_at)) < 30*86400000)
  .slice(0, 50)
  .map(i => `- ${i.issue_id}: [${i.status}] ${i.title}`)
  .join('\n');

const prompt = `New issue just raised:
ID: ${issue.issue_id}
Title: ${issue.title}
Description: ${issue.description}
Category: ${issue.category}
Priority: ${issue.priority}

Recent open issues at other workshops (for duplicate detection):
${recent || '(none)'}

Return ONLY this JSON, nothing else:
{
  "duplicate_issue_id": "RH-xxx or null",
  "suggested_department_id": "paint|body|detailing|mechanical|electrical|qc",
  "triage_note": "2-3 sentence internal note for the admin explaining what is likely wrong and suggested next step",
  "auto_reply": "1-2 friendly sentences for the technician — acknowledge receipt, say an expert is looking, no fluff"
}`;

return [{ json: { prompt } }];
```
4. **HTTP Request** → POST `{{ $vars.AI_ENDPOINT }}`
   - Body JSON: `{ "prompt": "{{ $json.prompt }}", "system": "You are a helpdesk triage assistant for Spinny's car-refurb workshops. Return JSON only.", "temperature": 0.2 }`
5. **Code** — parse flexibly:
```javascript
const res = $input.first().json;
let text = res.text ?? res.output ?? res.response ?? res.content ?? res.message ?? res.generated_text;
if (typeof res === 'string') text = res;
if (!text) throw new Error('AI returned no text');
// Try to parse JSON from the text
let parsed = null;
try {
  const match = text.match(/\{[\s\S]*\}/);
  parsed = JSON.parse(match ? match[0] : text);
} catch (e) { throw new Error('AI returned non-JSON: ' + text); }
return [{ json: parsed }];
```
6. **Google Sheets** → `Update Row` on `issues` → set `ai_triage_note`, `duplicate_of` (if not null), possibly `department_id`
7. **Google Sheets** → `Append Row` on `issue_comments` × 2:
   - (a) `commented_by=u_bot, is_internal=FALSE, is_ai_generated=TRUE, text=auto_reply`
   - (b) `commented_by=u_bot, is_internal=TRUE,  is_ai_generated=TRUE, text=triage_note`

---

## Smoke test checklist

After all 14 are active, test via a browser `fetch` call:

```javascript
// In Chrome DevTools console (any page):
const R = (path, body) => fetch('YOUR_N8N_BASE/webhook/' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then(r => r.json());

R('auth-login', { username: 'rajesh.k' }).then(console.log);
R('lookups', {}).then(console.log);
R('issues-list', { scope: { role: 'admin', user_id: 'u_neha' }, filters: {}, limit: 10 }).then(console.log);
```

Each should return the expected shape. If any returns 404 or times out, check:
1. Workflow is **Active** (toggle top-right)
2. Webhook path matches exactly (case-sensitive)
3. CORS headers added
4. Google Sheets credential is set on every sheet node
