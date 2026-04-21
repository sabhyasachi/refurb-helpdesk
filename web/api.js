// Thin wrapper over fetch for all N8N webhook calls.
// All calls are POST with JSON body. Bearer token is the active user's user_id.

const API = (() => {
  const base = () => (window.CONFIG?.N8N_BASE || '').replace(/\/$/, '');
  const token = () => (window.SESSION?.user?.user_id || '');

  async function call(path, body) {
    const url = `${base()}${path}`;
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
      const msg = (data && data.error) || `${res.status} ${res.statusText}`;
      const err = new Error(msg);
      err.status = res.status;
      err.code = data?.code;
      throw err;
    }
    return data;
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
