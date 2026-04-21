// Root application: session, routing, data bootstrap, polling.

const SESSION_KEY = 'refurb_helpdesk_session_v1';

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

  // Bootstrap lookups + users + issues after login
  const bootstrap = async (user) => {
    setBooting(true);
    try {
      if (!window.CONFIG.N8N_BASE) {
        setFatalError('N8N_BASE not configured. Edit web/config.js.');
        return;
      }
      const [lookups, usersRes, issuesRes] = await Promise.all([
        API.lookups(),
        API.usersList(),
        API.issuesList(user, {}),
      ]);
      window.CITIES = lookups.cities || [];
      window.DEPARTMENTS = lookups.departments || [];
      window.WORKSHOPS = lookups.workshops || [];
      window.USERS_BY_ID = Object.fromEntries((usersRes.users || []).map(u => [u.user_id, u]));
      setUsers(usersRes.users || []);
      setIssues(issuesRes.issues || []);
      setPage(user.role === 'workshop' ? 'home' : 'dashboard');
    } catch (e) {
      setFatalError(`Couldn't load data: ${e.message}`);
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
    clearSession(); setSession(null); setIssues([]); setUsers([]);
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
      issue_id, commented_by: session.user.user_id,
      comment_text: text, is_internal: !!is_internal,
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
      await API.issuesUpdate(openIssueId, patch, session.user.user_id);
      const data = await API.issuesGet(session.user, openIssueId);
      setOpenIssueData(data);
      refreshIssues(true);
      toast('Updated', 'success');
    } catch (e) { toast(`Update failed: ${e.message}`, 'error'); }
  };

  const reopenIssue = async (issue_id) => {
    try {
      await API.issuesReopen(issue_id, session.user.user_id);
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
        setUsers(us => [...us, user]);
        window.USERS_BY_ID[user.user_id] = user;
        toast(`Created ${user.full_name}`, 'success');
      } else {
        const { user } = await API.usersUpdate(teamDialog.initial.user_id, payload);
        setUsers(us => us.map(u => u.user_id === user.user_id ? user : u));
        window.USERS_BY_ID[user.user_id] = user;
        toast(`Updated ${user.full_name}`, 'success');
      }
      setTeamDialog(null);
    } catch (e) { throw e; }
  };

  const deleteUser = async (user_id) => {
    try {
      await API.usersDelete(user_id);
      setUsers(us => us.filter(u => u.user_id !== user_id));
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
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading your workspace…</div>;
  }

  const user = session.user;
  const isMobile = user.role === 'workshop' || (user.role === 'manager' && window.matchMedia('(max-width: 720px)').matches);

  if (openIssueId && !openIssueData) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading {openIssueId}…</div>;
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
