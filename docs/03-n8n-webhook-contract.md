# N8N Webhook Contract (v1)

Both the frontend (`web/`) and the N8N workflows in `n8n/` MUST follow this contract.
Change this doc first if you need to change a shape, then update both sides.

**Base URL:** `<N8N_BASE_URL>/webhook/` — e.g. `https://n8n.spinny.internal/webhook/`
**All requests/responses:** `application/json` unless noted (attachments upload uses multipart)
**Auth:** `Authorization: Bearer <user_id>` header (server validates user exists + is_active). No signatures in v1.
**CORS:** N8N webhooks must respond with `Access-Control-Allow-Origin: *` (or the GH Pages domain). Preflight `OPTIONS` must return 204.

---

## Error shape (all endpoints)

```json
{ "error": "human-readable message", "code": "SHORT_SNAKE_CODE" }
```

HTTP status: 400 (bad input), 401 (auth), 404 (not found), 409 (conflict), 500 (server).

---

## 1. POST `/webhook/auth-login`

**Body:** `{ "username": "rajesh.k" }`
**Success:** `{ "user": { ...full users row... } }`
**Errors:** 404 if no match or `is_active=FALSE`.

---

## 2. GET `/webhook/lookups`

Static reference data (cities, workshops, departments). Frontend caches for the session.

**Response:**
```json
{
  "cities":      [ { "id": "blr", "label": "Bengaluru", "is_active": true } ],
  "departments": [ { "id": "paint", "label": "Paint", "color": "#F59E0B", "is_active": true } ],
  "workshops":   [ { "id": "blr-hsr", "label": "Bengaluru · HSR", "city_id": "blr", "short": "HSR", "is_active": true } ]
}
```

---

## 3. GET `/webhook/users-list`

Returns all active users. Used by admin Team page and assignment pickers.

**Response:** `{ "users": [ { user row... } ] }`

---

## 4. POST `/webhook/users-create`

**Body:**
```json
{
  "username": "arjun.m",
  "full_name": "Arjun Mehta",
  "role": "poc",
  "workshop_id": null,
  "department_id": "paint",
  "color": "#F59E0B",
  "password": null
}
```
Server computes `user_id` (`u_<firstname>` lowercased, dedup by suffix), `initials`, `created_at`, `is_active=true`. Rejects duplicate username with 409.

**Success:** `{ "user": { ... } }`

---

## 5. POST `/webhook/users-update`

**Body:** `{ "user_id": "u_arjun", "patch": { "role": "manager", "workshop_id": "blr-hsr", "department_id": null } }`
**Success:** `{ "user": { ... } }`

---

## 6. POST `/webhook/users-delete`

**Body:** `{ "user_id": "u_arjun" }`
Soft-delete — flips `is_active=FALSE`.
**Success:** `{ "ok": true }`

---

## 7. POST `/webhook/issues-list`

POST (not GET) so filters live in body cleanly. Server filters sheet in-memory.

**Body (all filters optional):**
```json
{
  "scope": { "role": "admin", "user_id": "u_neha", "workshop_id": null },
  "filters": {
    "status":       ["open", "assigned"],
    "workshop_id":  "blr-hsr",
    "city_id":      "blr",
    "raised_by":    "u_rajesh",
    "assigned_to":  "u_sneha",
    "category":     null,
    "priority":     null,
    "search":       "paint booth"
  },
  "limit": 100
}
```

**`scope` rules:**
- `role="workshop"` → force `raised_by = user_id`
- `role="manager"` → force `workshop_id = user.workshop_id`
- `role="admin"` → no restriction
- `role="poc"` → n/a in v1 (no UI)

**Response:**
```json
{
  "issues": [
    {
      "issue_id": "RH-248",
      "title": "...",
      "description": "...",
      "category": "tool",
      "priority": "p0",
      "status": "assigned",
      "workshop_id": "blr-hsr",
      "department_id": "paint",
      "raised_by": "u_rajesh",
      "assigned_to": "u_sneha",
      "duplicate_of": null,
      "created_at": "2026-04-21T12:00:00Z",
      "updated_at": "2026-04-21T13:48:00Z",
      "resolved_at": null,
      "comments_count": 3,
      "attachments_count": 2
    }
  ],
  "total": 8
}
```

Note: `ai_triage_note` is **omitted** from the list endpoint (admin-only, fetched via detail).

---

## 8. POST `/webhook/issues-get`

**Body:** `{ "issue_id": "RH-248", "scope": { "role": "admin", ... } }`

**Response:**
```json
{
  "issue": { ...full row, includes ai_triage_note if scope.role=admin... },
  "comments":    [ { "comment_id": "CMT-00001", "issue_id": "RH-248", "commented_by": "u_rajesh", "comment_text": "...", "is_internal": false, "is_ai_generated": false, "created_at": "..." } ],
  "attachments": [ { "attachment_id": "ATT-00001", "file_name": "...", "drive_url": "...", "mime_type": "...", "file_size_bytes": 1258291, "uploaded_by": "u_rajesh", "created_at": "..." } ],
  "raiser":      { ...user row... },
  "assignee":    { ...user row or null... }
}
```

**Internal comment filter:** If `scope.role != "admin"` AND `user_id != issue.raised_by`, strip comments where `is_internal=TRUE`.

---

## 9. POST `/webhook/issues-create`

**Body:**
```json
{
  "title": "...",
  "description": "...",
  "category": "bug",
  "priority": "p1",
  "raised_by": "u_rajesh"
}
```
Server fills: `issue_id` (next `RH-###`), `workshop_id`/`department_id` from raiser, `status="open"`, `created_at`/`updated_at`.

**Then async (fire-and-forget):**
- Run AI-triage flow → writes `ai_triage_note`, optionally sets `duplicate_of`, posts AI auto-reply as a comment.

**Response (returned before AI runs):** `{ "issue": { ...row... } }`

---

## 10. POST `/webhook/issues-update`

**Body:**
```json
{
  "issue_id": "RH-248",
  "patch": { "status": "in_progress", "assigned_to": "u_sneha", "priority": "p1" },
  "actor": "u_neha"
}
```

Enforces status transitions from schema doc. Sets `resolved_at` when transitioning to `resolved`. Updates `updated_at`.

**Response:** `{ "issue": { ...row... } }`

---

## 11. POST `/webhook/issues-reopen`

**Body:** `{ "issue_id": "RH-248", "actor": "u_rajesh" }`
Only allowed if `actor == issue.raised_by` AND `issue.status == "resolved"`.
Sets `status="reopened"`, clears `resolved_at`.

**Response:** `{ "issue": { ...row... } }`

---

## 12. POST `/webhook/comments-create`

**Body:**
```json
{
  "issue_id": "RH-248",
  "commented_by": "u_rajesh",
  "comment_text": "It started around 10am.",
  "is_internal": false
}
```
Server fills `comment_id`, `created_at`, `is_ai_generated=false`.

**Response:** `{ "comment": { ...row... } }`

---

## 13. POST `/webhook/attachments-upload` (multipart)

**Fields:**
- `file` — binary
- `issue_id` — string
- `uploaded_by` — string

Server: upload to Drive folder (`DRIVE_FOLDER_ID`), make the file viewable by anyone with link, append row to `issue_attachments` sheet.

**Response:** `{ "attachment": { ...row, includes drive_url... } }`

---

## 14. POST `/webhook/ai-triage` (internal)

Called by `issues-create` flow asynchronously. Do not expose to frontend.

**Inputs (from calling flow):**
- The newly created `issue` row
- Last 30 days of open/assigned/in_progress issues (for duplicate detect)
- User profile (for auto-reply personalization)

**Logic:**
1. Build prompt asking the LLM for:
   - `duplicate_issue_id` — one of the recent IDs, or null
   - `triage_note` — 2-3 sentences for admin, what's likely wrong + suggested next step
   - `auto_reply` — 1-2 sentence friendly acknowledgement for the technician (as if from Helpdesk Bot)
   - `category_confidence` — 0..1
   - `suggested_department_id` — one of the 6 dept IDs
2. Call ngrok AI endpoint (see below).
3. Parse response (flexible — try `.text`, `.output`, `.response`, `.content`, `.message`, or raw string).
4. Write:
   - `issues.duplicate_of`, `issues.ai_triage_note`, `issues.department_id` (if overridden)
   - Append row to `issue_comments` with `commented_by="u_bot"`, `is_ai_generated=true`, `is_internal=false`, text = `auto_reply`
   - Append row to `issue_comments` with `commented_by="u_bot"`, `is_ai_generated=true`, `is_internal=true`, text = `triage_note`

**AI API call shape (your ngrok endpoint):**
```
POST https://proxy-implicit-unstable.ngrok-free.dev/api/text
Content-Type: application/json

{
  "prompt":      "<full prompt with issue + recent issues embedded>",
  "system":      "You are a helpdesk triage assistant for Spinny's car-refurb workshops. Return JSON only.",
  "temperature": 0.2
}
```

N8N parses the response with a Code node that tries common shapes. If the model returns JSON inside a text field, parse twice.

---

## 15. Polling contract

Frontend polls the detail endpoint every **30s** when an issue detail screen is open. List endpoints are **not** polled (user pulls to refresh, or view change re-fetches). This respects the 300 reads/min/project limit.

---

## Config the frontend needs

```js
// web/config.js
window.CONFIG = {
  N8N_BASE: "https://n8n.spinny.internal/webhook",
  POLL_INTERVAL_MS: 30000,
  AI_BOT_USER_ID: "u_bot"
};
```

Set `N8N_BASE` after you import N8N workflows and see the webhook URLs.
