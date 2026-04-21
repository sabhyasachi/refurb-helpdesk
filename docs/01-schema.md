# Refurb Helpdesk — Sheets Schema (v1)

One Google Sheets workbook named **`RefurbHelpdesk_DB`** with 7 tabs.
Column order in this doc = column order in the sheet. Header row is row 1.
All IDs align with the prototype's seed data so no remapping is needed.

---

## Tab 1 — `users`

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | user_id | text | PK. Pattern `u_firstname` (e.g. `u_rajesh`). Admin generates on create. |
| B | username | text | Login key. Pattern `firstname.initial` (e.g. `rajesh.k`). Unique, lowercase, `^[a-z0-9._-]{2,}$`. |
| C | full_name | text | Display name. |
| D | role | enum | `workshop` / `manager` / `admin` / `poc` |
| E | workshop_id | text | FK → workshops.workshop_id. Required for `workshop`/`manager`. Null for `admin`/`poc`. |
| F | department_id | text | FK → departments.department_id. Required for `workshop`/`poc`. Null for `manager`/`admin`. |
| G | initials | text | 2 chars. Derived from full_name; used in avatars. |
| H | color | text | Hex code for avatar bg. Pick from department palette or brand palette. |
| I | password | text | Nullable. Scaffold for v2 — not checked at login. |
| J | is_active | boolean | `TRUE`/`FALSE`. Soft delete. |
| K | created_at | datetime | ISO 8601 UTC. |

## Tab 2 — `issues`

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | issue_id | text | PK. Pattern `RH-###`. N8N generates next number. |
| B | title | text | ≥3 chars. Required. |
| C | description | text | Free text. Optional. |
| D | category | enum | `bug` / `question` / `process` / `tool` / `other` |
| E | priority | enum | `p0` / `p1` / `p2` / `p3` |
| F | status | enum | `open` / `assigned` / `in_progress` / `resolved` / `reopened` |
| G | workshop_id | text | FK → workshops. Auto-filled from raiser's workshop. |
| H | department_id | text | FK → departments. Auto-filled from raiser's dept (or AI-assigned). |
| I | raised_by | text | FK → users.user_id. |
| J | assigned_to | text | FK → users.user_id. Nullable. Set when admin assigns to POC. |
| K | duplicate_of | text | FK → issues.issue_id. Nullable. Set by AI duplicate-detect. |
| L | ai_triage_note | text | Admin-only. Hidden from technician UI. AI-generated on create. |
| M | created_at | datetime | ISO 8601 UTC. |
| N | updated_at | datetime | ISO 8601 UTC. N8N rewrites on every mutation. |
| O | resolved_at | datetime | Set when status transitions to `resolved`. |

## Tab 3 — `issue_comments`

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | comment_id | text | PK. Pattern `CMT-#####`. |
| B | issue_id | text | FK → issues.issue_id. |
| C | commented_by | text | FK → users.user_id. Use `u_bot` for AI replies. |
| D | comment_text | text | Required. |
| E | is_internal | boolean | `TRUE` = admin-only, hidden from technician. |
| F | is_ai_generated | boolean | `TRUE` for auto-reply + triage note. |
| G | created_at | datetime | ISO 8601 UTC. |

## Tab 4 — `issue_attachments`

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | attachment_id | text | PK. Pattern `ATT-#####`. |
| B | issue_id | text | FK → issues.issue_id. |
| C | uploaded_by | text | FK → users.user_id. |
| D | file_name | text | Original filename. |
| E | drive_file_id | text | Google Drive file ID. |
| F | drive_url | text | Direct view URL (`https://drive.google.com/file/d/<id>/view`). |
| G | mime_type | text | e.g. `image/jpeg`. |
| H | file_size_bytes | number | |
| I | created_at | datetime | ISO 8601 UTC. |

## Tab 5 — `workshops`

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | workshop_id | text | PK. Pattern `city_id-slug` (e.g. `blr-hsr`). |
| B | workshop_label | text | Display name `"Bengaluru · HSR"`. |
| C | city_id | text | FK → cities.city_id. |
| D | short_name | text | Used in compact UI (e.g. `"HSR"`). |
| E | is_active | boolean | |

## Tab 6 — `departments`

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | department_id | text | PK. Short slug (e.g. `paint`). |
| B | department_label | text | Display name. |
| C | color | text | Hex code (avatar/badge). |
| D | is_active | boolean | |

## Tab 7 — `cities`

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | city_id | text | PK. 3-letter code (e.g. `blr`). |
| B | city_label | text | Display name. |
| C | is_active | boolean | |

---

## ID generation (done in N8N on create)

| Entity | Next-ID formula |
|--------|-----------------|
| Issue | `RH-` + `MAX(issue_id replaced "RH-" with number) + 1`, zero-padded to 3 digits once |
| Comment | `CMT-` + `MAX(...) + 1`, zero-padded to 5 digits |
| Attachment | `ATT-` + `MAX(...) + 1`, zero-padded to 5 digits |
| User | Admin-entered on create. Must match `^u_[a-z0-9_]+$` and be unique. |

## Enum values (locked)

- **role**: `workshop` · `manager` · `admin` · `poc`
- **category**: `bug` · `question` · `process` · `tool` · `other`
- **priority**: `p0` (Urgent) · `p1` (High) · `p2` (Normal) · `p3` (Low)
- **status**: `open` · `assigned` · `in_progress` · `resolved` · `reopened`

## Allowed status transitions

```
open       → assigned | in_progress | resolved
assigned   → in_progress | resolved
in_progress → resolved
resolved   → reopened          (raiser only)
reopened   → in_progress | resolved
```

## Dropped from prototype (per MVP scope)

- `slack` flag on users
- `jiraKey` on issues
- All Slack toast / Jira auto-sync logic
