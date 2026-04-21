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
    const fd = new FormData();
    fd.append('file', file);
    fd.append('issue_id', issue_id);
    fd.append('uploaded_by', uploaded_by);
    const res = await fetch(`${base()}/attachments-upload`, {
      method: 'POST',
      headers: { ...(token() ? { 'Authorization': `Bearer ${token()}` } : {}) },
      body: fd,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
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
    issuesCreate: (payload)            => call('/issues-create',   payload),
    issuesUpdate: (issue_id, patch, actor) => call('/issues-update', { issue_id, patch, actor }),
    issuesReopen: (issue_id, actor)    => call('/issues-reopen',   { issue_id, actor }),

    commentsCreate: (payload) => call('/comments-create', payload),

    uploadAttachment,
  };
})();

window.API = API;
