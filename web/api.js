// Thin wrapper over fetch for all N8N webhook calls.
// All calls are POST with JSON body. Bearer token is the active user's user_id.

const API = (() => {
  const base = () => (window.CONFIG?.N8N_BASE || '').replace(/\/$/, '');
  const token = () => (window.SESSION?.user?.user_id || '');

  async function call(path, body, { retries = 2, retryDelay = 2000 } = {}) {
    const url = `${base()}${path}`;
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, retryDelay * attempt));
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token() ? { 'Authorization': `Bearer ${token()}` } : {}),
          },
          body: JSON.stringify(body || {}),
        });
        let data = null;
        try { data = await res.json(); } catch (_) {}
        if (!res.ok) {
          // Don't retry 4xx errors — only retry 5xx (server/rate-limit failures)
          if (res.status < 500) {
            const msg = (data && data.error) || `${res.status} ${res.statusText}`;
            const err = new Error(msg);
            err.status = res.status; err.code = data?.code;
            throw err;
          }
          lastErr = new Error((data && data.error) || `${res.status} ${res.statusText}`);
          lastErr.status = res.status;
          continue; // retry on 5xx
        }
        return data;
      } catch (e) {
        if (e.status && e.status < 500) throw e; // don't retry 4xx
        lastErr = e;
      }
    }
    throw lastErr;
  }

  async function uploadAttachment(issue_id, file, uploaded_by) {
    const cloud  = window.CONFIG?.CLOUDINARY_CLOUD;
    const preset = window.CONFIG?.CLOUDINARY_PRESET;
    if (!cloud || !preset) throw new Error('Cloudinary not configured');

    // Step 1 — direct browser upload to Cloudinary (no backend involved)
    // Pick endpoint by file kind. Cloudinary uses `image` for img, `video` for audio/video,
    // and `raw` for PDFs and other docs.
    const kind = file.type.startsWith('image/') ? 'image'
              : file.type.startsWith('audio/') || file.type.startsWith('video/') ? 'video'
              : 'raw';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    const cdRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`, {
      method: 'POST',
      body: fd,
    });
    if (!cdRes.ok) {
      const err = await cdRes.json().catch(() => ({}));
      throw new Error(`Cloudinary upload failed: ${err.error?.message || cdRes.status}`);
    }
    const cd = await cdRes.json();

    // Step 2 — record metadata in our data table via n8n
    const meta = {
      issue_id,
      uploaded_by,
      url:        cd.secure_url,
      thumb_url:  kind === 'image' ? cd.secure_url.replace('/upload/', '/upload/c_thumb,w_400,q_auto,f_auto/') : null,
      file_name:  file.name,
      mime:       file.type,
      size_bytes: file.size,
      kind,
      public_id:  cd.public_id,
    };
    return call('/attachments-create', meta);
  }

  function scopeFor(user) {
    return { role: user.role, user_id: user.user_id, workshop_id: user.workshop_id || null };
  }

  return {
    login:        (username)            => call('/auth-login',      { username }),
    lookups:      ()                    => call('/lookups',         {}),
    usersList:    ()                    => call('/users-list',      {}),
    usersCreate:  (payload)             => call('/users-create',    payload),
    usersUpdate:  (user_id, patch)      => call('/users-update',    { user_id, patch }),
    usersDelete:  (user_id)             => call('/users-delete',    { user_id }),

    issuesList:   (user, filters = {}) => call('/issues-list',     { scope: scopeFor(user), filters, limit: 200 }),
    issuesGet:    (user, issue_id)     => call('/issues-get',      { issue_id, scope: scopeFor(user) }),
    issuesCreate: async (payload) => {
      const r = await call('/issues-create', payload);
      const row = Array.isArray(r) ? r[0] : r;
      // Accept any of: { issue: {...} }, [{ issue: {...} }], or the raw row
      return row && row.issue ? row : { issue: row };
    },
    issuesUpdate: (issue_id, patch, actor) => call('/issues-update', { issue_id, patch, actor }),
    issuesReopen: (issue_id, actor)    => call('/issues-reopen',   { issue_id, actor }),

    commentsCreate: (payload) => call('/comments-create', payload),

    uploadAttachment,
  };
})();

window.API = API;
