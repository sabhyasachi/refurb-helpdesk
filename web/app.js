// Root application: session, routing, data bootstrap, polling.

const SESSION_KEY = 'refurb_helpdesk_session_v1';

// ─── Cache helpers (stale-while-revalidate) ───────────────────────────────────
const CACHE_TTL = {
  lookups: 30 * 60 * 1000,  // 30 min — workshops/depts/cities rarely change
  users:   10 * 60 * 1000,  // 10 min — user list changes infrequently
};
function getCached(key) {
  try {
    const raw = localStorage.getItem(`rh_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL[key]) { localStorage.removeItem(`rh_cache_${key}`); return null; }
    return data;
  } catch { return null; }
}
function setCache(key, data) {
  try { localStorage.setItem(`rh_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch {}
}
function clearAllCache() {
  try { ['lookups', 'users'].forEach(k => localStorage.removeItem(`rh_cache_${k}`)); } catch {}
}
function applyLookups(l) {
  window.CITIES      = l.cities      || [];
  window.DEPARTMENTS = l.departments || [];
  window.WORKSHOPS   = l.workshops   || [];
}
function applyUsers(r, setUsers) {
  const list = r.users || [];
  window.USERS_BY_ID = Object.fromEntries(list.map(u => [u.user_id, u]));
  setUsers(list);
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSession(s) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch {}
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 18, radius = 8, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      flexShrink: 0,
      ...style,
    }} />
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: 18 }}>
            <Skeleton h={12} w="60%" style={{ marginBottom: 12 }} />
            <Skeleton h={36} w="40%" />
          </div>
        ))}
      </div>
      {/* table rows */}
      <div style={{ background: 'white', borderRadius: 14, padding: 18 }}>
        <Skeleton h={14} w="30%" style={{ marginBottom: 20 }} />
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <Skeleton h={14} w="12%" />
            <Skeleton h={14} w="35%" />
            <Skeleton h={14} w="15%" />
            <Skeleton h={14} w="12%" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      <Skeleton h={20} w="50%" style={{ marginBottom: 24 }} />
      {[0,1,2,3].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <Skeleton h={14} w="80%" style={{ marginBottom: 10 }} />
          <Skeleton h={12} w="40%" />
        </div>
      ))}
    </div>
  );
}

function Toast({ toasts, onDismiss }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{ pointerEvents: 'auto', padding: '12px 18px', borderRadius: 12, background: t.kind === 'error' ? '#DC2626' : t.kind === 'success' ? '#16A34A' : '#111827', color: 'white', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', animation: 'slidein-up 0.25s ease' }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [session, setSession]   = React.useState(loadSession);
  const [booting, setBooting]   = React.useState(false);
  const [issues, setIssues]     = React.useState([]);
  const [users, setUsers]       = React.useState([]);
  const [page, setPage]         = React.useState('home');
  const [openIssueId, setOpenIssueId] = React.useState(null);
  const [openIssueData, setOpenIssueData] = React.useState(null);
  const [openIssueRefreshing, setOpenIssueRefreshing] = React.useState(false);
  const [teamDialog, setTeamDialog] = React.useState(null);
  const [toasts, setToasts]     = React.useState([]);
  const [fatalError, setFatalError] = React.useState(null);

  React.useEffect(() => { window.SESSION = session; }, [session]);

  const toast = (message, kind = 'info', ttl = 3200) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  };

  // Bootstrap lookups + users + issues after login.
  // Strategy: serve lookups + users from cache instantly (app appears immediately),
  // always fetch issues fresh, refresh stale cache in background.
  const bootstrap = async (user) => {
    if (!window.CONFIG.N8N_BASE) {
      setFatalError('N8N_BASE not configured. Edit web/config.js.');
      return;
    }

    const cachedLookups = getCached('lookups');
    const cachedUsers   = getCached('users');
    const hasCached     = !!(cachedLookups && cachedUsers);

    // If we have cached static data → apply it immediately, skip loading screen
    if (hasCached) {
      applyLookups(cachedLookups);
      applyUsers(cachedUsers, setUsers);
    } else {
      setBooting(true);
    }

    try {
      // Always fetch fresh; cache was just used for instant first paint
      const [lookups, usersRes, issuesRes] = await Promise.all([
        API.lookups(),
        API.usersList(),
        API.issuesList(user, {}),
      ]);

      // Refresh cache with new data
      setCache('lookups', lookups);
      setCache('users',   usersRes);

      applyLookups(lookups);
      applyUsers(usersRes, setUsers);
      setIssues(issuesRes.issues || []);
      setPage(user.role === 'workshop' ? 'home' : 'dashboard');
    } catch (e) {
      if (!hasCached) setFatalError(`Couldn't load data: ${e.message}`);
      else            console.warn('Background refresh failed:', e.message);
    } finally {
      setBooting(false);
    }
  };

  React.useEffect(() => { if (session?.user) bootstrap(session.user); /* eslint-disable-next-line */ }, [session?.user?.user_id]);

  const refreshIssues = async (silent = false) => {
    if (!session?.user) return;
    try {
      const res = await API.issuesList(session.user, {});
      setIssues(res.issues || []);
    } catch (e) { if (!silent) toast(`Refresh failed: ${e.message}`, 'error'); }
  };

  // Open-issue polling
  React.useEffect(() => {
    if (!openIssueId || !session?.user) return;
    let cancelled = false;
    const fetchDetail = async () => {
      setOpenIssueRefreshing(true);
      try {
        const data = await API.issuesGet(session.user, openIssueId);
        if (!cancelled) setOpenIssueData(data);
      } catch (e) { if (!cancelled) toast(`Couldn't load ${openIssueId}: ${e.message}`, 'error'); }
      finally { if (!cancelled) setOpenIssueRefreshing(false); }
    };
    fetchDetail();
    const timer = setInterval(fetchDetail, window.CONFIG.POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [openIssueId, session?.user?.user_id]);

  const onLogin = (user) => {
    const s = { user, at: Date.now() };
    saveSession(s); setSession(s);
  };
  const onLogout = () => {
    clearSession(); clearAllCache();
    setSession(null); setIssues([]); setUsers([]);
    setOpenIssueId(null); setOpenIssueData(null); setPage('home');
  };

  const openIssue = (id) => { setOpenIssueId(id); };
  const closeIssue = () => { setOpenIssueId(null); setOpenIssueData(null); };

  const createIssue = async (draft) => {
    try {
      const { issue } = await API.issuesCreate({
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        priority: draft.priority,
        raised_by: session.user.user_id,
        workshop_id: session.user.workshop_id,
      });
      // Upload attachments sequentially so we don't hammer N8N/Drive.
      for (const file of draft.attachments) {
        try { await API.uploadAttachment(issue.issue_id, file, session.user.user_id); }
        catch (e) { toast(`Upload failed: ${file.name}`, 'error'); }
      }
      toast(`Issue ${issue.issue_id} raised · AI triage running`, 'success');
      await refreshIssues(true);
      setPage('issues');
      openIssue(issue.issue_id);
    } catch (e) {
      toast(`Couldn't raise issue: ${e.message}`, 'error');
      throw e;
    }
  };

  const addComment = async (issue_id, text, is_internal = false) => {
    await API.commentsCreate({
      issue_id,
      commented_by: session.user.user_id,
      comment_text: text,
      is_internal: !!is_internal,
      scope: { role: session.user.role, user_id: session.user.user_id, workshop_id: session.user.workshop_id || null },
    });
    // Re-fetch the current detail eagerly
    if (openIssueId === issue_id) {
      const data = await API.issuesGet(session.user, issue_id);
      setOpenIssueData(data);
    }
    refreshIssues(true);
  };

  const patchIssue = async (patch) => {
    if (!openIssueId) return;
    try {
      await API.issuesUpdate(openIssueId, patch, { role: session.user.role, user_id: session.user.user_id, workshop_id: session.user.workshop_id || null });
      const data = await API.issuesGet(session.user, openIssueId);
      setOpenIssueData(data);
      refreshIssues(true);
      toast('Updated', 'success');
    } catch (e) { toast(`Update failed: ${e.message}`, 'error'); }
  };

  const reopenIssue = async (issue_id) => {
    try {
      await API.issuesReopen(issue_id, { role: session.user.role, user_id: session.user.user_id, workshop_id: session.user.workshop_id || null });
      if (openIssueId === issue_id) {
        const data = await API.issuesGet(session.user, issue_id);
        setOpenIssueData(data);
      }
      refreshIssues(true);
      toast('Reopened', 'success');
    } catch (e) { toast(`Reopen failed: ${e.message}`, 'error'); }
  };

  const saveUser = async (payload) => {
    try {
      if (teamDialog?.mode === 'add') {
        const { user } = await API.usersCreate(payload);
        setUsers(us => { const next = [...us, user]; setCache('users', { users: next }); return next; });
        window.USERS_BY_ID[user.user_id] = user;
        toast(`Created ${user.full_name}`, 'success');
      } else {
        const { user } = await API.usersUpdate(teamDialog.initial.user_id, payload);
        setUsers(us => { const next = us.map(u => u.user_id === user.user_id ? user : u); setCache('users', { users: next }); return next; });
        window.USERS_BY_ID[user.user_id] = user;
        toast(`Updated ${user.full_name}`, 'success');
      }
      setTeamDialog(null);
    } catch (e) { throw e; }
  };

  const deleteUser = async (user_id) => {
    try {
      await API.usersDelete(user_id);
      setUsers(us => { const next = us.filter(u => u.user_id !== user_id); setCache('users', { users: next }); return next; });
      delete window.USERS_BY_ID[user_id];
      toast('User removed', 'success');
      setTeamDialog(null);
    } catch (e) { toast(`Delete failed: ${e.message}`, 'error'); }
  };

  // ─── Render ───
  if (fatalError) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Configuration error</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>{fatalError}</div>
          <button onClick={() => { setFatalError(null); if (!window.CONFIG.N8N_BASE) return; bootstrap(session.user); }} style={{ background: '#111827', color: 'white', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!session?.user) return <LoginScreen onLogin={onLogin} />;

  if (booting) {
    const isMobileRole = session?.user?.role === 'workshop';
    return (
      <div style={{ height: '100vh', overflow: 'hidden', background: '#F7F8FA' }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        {isMobileRole ? <MobileSkeleton /> : (
          <div style={{ display: 'flex', height: '100vh' }}>
            {/* sidebar skeleton */}
            <div style={{ width: 240, background: '#0F1419', padding: 20, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 32 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)' }} />
                <Skeleton h={14} w={100} style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
              {[0,1,2].map(i => <Skeleton key={i} h={38} radius={10} style={{ marginBottom: 4, background: 'rgba(255,255,255,0.07)' }} />)}
            </div>
            <div style={{ flex: 1, background: '#F7F8FA' }}><DashboardSkeleton /></div>
          </div>
        )}
      </div>
    );
  }

  const user = session.user;
  const isMobile = user.role === 'workshop' || (user.role === 'manager' && window.matchMedia('(max-width: 720px)').matches);

  if (openIssueId && !openIssueData) {
    return (
      <div style={{ height: '100vh', background: '#F7F8FA', overflow: 'hidden' }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
          <Skeleton h={14} w={80} style={{ marginBottom: 24 }} />
          <Skeleton h={28} w="70%" style={{ marginBottom: 12 }} />
          <Skeleton h={14} w="40%" style={{ marginBottom: 32 }} />
          <div style={{ background: 'white', borderRadius: 14, padding: 20 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <Skeleton w={36} h={36} radius={18} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton h={12} w="30%" style={{ marginBottom: 8 }} />
                  <Skeleton h={14} w="80%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (openIssueId && openIssueData) {
    if (isMobile || user.role === 'workshop') {
      return (
        <>
          <MobileIssueDetail issueData={openIssueData} user={user} onBack={closeIssue} onComment={addComment} onReopen={reopenIssue} refreshing={openIssueRefreshing} />
          <Toast toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
        </>
      );
    }
    return (
      <DesktopShell user={user} activeTab={page} onNavTab={p => { setPage(p); closeIssue(); }} onLogout={onLogout}>
        <DesktopIssueDetail issueData={openIssueData} user={user} onBack={closeIssue} onPatch={patchIssue} onComment={addComment} onReopen={reopenIssue} refreshing={openIssueRefreshing} />
        <Toast toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
      </DesktopShell>
    );
  }

  // ─── Top-level pages ───
  if (user.role === 'workshop') {
    let view;
    if (page === 'new') {
      view = <MobileNew user={user} onCancel={() => setPage('home')} onSubmit={createIssue} />;
    } else if (page === 'issues') {
      view = <MobileIssues user={user} issues={issues} onNav={setPage} onOpenIssue={openIssue} />;
    } else {
      view = <MobileHome user={user} issues={issues} onNav={setPage} onOpenIssue={openIssue} onLogout={onLogout} />;
    }
    return <>{view}<Toast toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} /></>;
  }

  // admin & manager
  const subtitle = user.role === 'manager' ? `${lookup(window.WORKSHOPS, user.workshop_id)?.label || ''} overview` : null;
  const pageTitle = page === 'dashboard' ? (user.role === 'manager' ? 'Dashboard' : 'Dashboard') : page === 'issues' ? 'All issues' : 'Team directory';

  return (
    <DesktopShell user={user} activeTab={page} onNavTab={setPage} onLogout={onLogout} title={pageTitle} subtitle={subtitle}>
      {page === 'dashboard' && <Dashboard user={user} issues={issues} onOpenIssue={openIssue} />}
      {page === 'issues'    && <IssuesList user={user} issues={issues} onOpenIssue={openIssue} />}
      {page === 'team' && user.role === 'admin' && (
        <TeamDirectory
          users={users} issues={issues}
          onAdd={() => setTeamDialog({ mode: 'add', initial: null })}
          onEdit={(u) => setTeamDialog({ mode: 'edit', initial: u })}
        />
      )}
      {teamDialog && (
        <UserDialog
          mode={teamDialog.mode} initial={teamDialog.initial} existing={users}
          onClose={() => setTeamDialog(null)}
          onSave={saveUser}
          onDelete={teamDialog.mode === 'edit' ? deleteUser : null}
        />
      )}
      <Toast toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
    </DesktopShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
