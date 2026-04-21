# Deploy — first git push + GitHub Pages

Do this **once**. After that every `git push` to `main` auto-deploys to Pages in ~30s.

---

## Step 1 — Verify the folder

In the project root, you should see:

```
refurb-helpdesk/
├── .gitignore
├── .secrets/              ← NEVER committed
├── docs/
├── n8n/
├── seed/
├── web/                   ← this is what Pages serves
│   ├── index.html
│   ├── config.js          ← ⚠ edit BEFORE pushing (see below)
│   ├── data.js, utils.js, api.js, app.js, styles.css
│   ├── manifest.webmanifest, sw.js, icon-maker.html
│   ├── icons/             ← must have 3 PNGs generated via icon-maker.html
│   └── screens/
```

---

## Step 2 — Make sure icons exist

```bash
ls "refurb-helpdesk/web/icons/"
```

Should list: `icon-192.png  icon-512.png  icon-512-maskable.png`.

If empty: open `web/icon-maker.html` in Chrome → click the 3 download buttons → move files into `web/icons/`.

---

## Step 3 — Edit `web/config.js`

Set `N8N_BASE` to your N8N webhook base URL once you have it from N8N workflow import:

```javascript
// web/config.js
window.CONFIG = {
  N8N_BASE: "https://your-n8n-host.example.com/webhook",
  // ...
};
```

**If you don't have the N8N URL yet**, leave it empty — the frontend will show a clear error banner until you set it. You can push anyway and edit later.

---

## Step 4 — First git push

Open terminal (Git Bash) in the project root:

```bash
cd "C:/Users/Sabhya Sachi/OneDrive - Valuedrive Technologies Private Limited/Documents/GitHub/Central tracker/refurb-helpdesk"

git init
git branch -M main

# Confirm .secrets is gitignored
git status | grep -i secret  # should return nothing

# Stage everything except secrets
git add .gitignore docs/ n8n/ seed/ web/
git commit -m "Initial scaffold: frontend, N8N workflows, schema, seed data"

git remote add origin https://github.com/sabhyasachi/refurb-helpdesk.git
git push -u origin main
```

If GitHub asks for credentials, use a **personal access token** (not your password) as the password: https://github.com/settings/tokens → Generate new → classic → repo scope → Generate → copy.

---

## Step 5 — Enable GitHub Pages

1. https://github.com/sabhyasachi/refurb-helpdesk/settings/pages
2. **Source:** Deploy from a branch
3. **Branch:** `main` · Folder: `/web` → click **Save**
4. Wait ~30 seconds, refresh. A banner appears at top:
   > Your site is live at `https://sabhyasachi.github.io/refurb-helpdesk/`

---

## Step 6 — Sanity check

Open the Pages URL on your phone and laptop:

- Should show the dark login card (`Sign in`)
- Type any username → should show a clear error about N8N not configured (if you haven't set `N8N_BASE` yet) or actually attempt to authenticate (if you have)
- On Android Chrome: menu → "Install app" → should install a PWA with the R icon

---

## Subsequent deploys

Just push:

```bash
git add web/ && git commit -m "Tweak X" && git push
```

Pages rebuilds in ~30s.

---

## When to bump the service-worker cache version

If you change any file in `web/`, users' browsers will keep serving the cached old version for up to a day. To force-refresh:

Open `web/sw.js` and bump the version string:

```javascript
const CACHE_VERSION = 'rh-shell-v2';  // was v1
```

Commit + push. Next time a user loads the app, the SW detects the version change and nukes the old cache.

---

## Rollback

```bash
# Find the last-good commit
git log --oneline

# Revert (safe — creates a new commit that undoes the bad one)
git revert <bad-commit-sha>
git push
```

Avoid `git reset --hard` on `main` once you've pushed.
