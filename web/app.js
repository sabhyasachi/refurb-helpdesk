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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: 18 }}>
            <Skeleton h={12} w="60%" style={{ marginBottom: 12 }} />
            <Skeleton h={36} w="40%" />
          </div>
        ))}
      </div>
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

// ─── Notification sound + native popup helpers ────────────────────────────────
// HTML Audio with a runtime-generated WAV blob — far more reliable across browsers
// than raw WebAudio (especially on Android Chrome and after-gesture replay).
let _notifAudio = null;
function _makeBeepUrl() {
  const sampleRate = 22050;
  const duration   = 0.45;        // total clip length in seconds
  const freqs      = [880, 660];  // two-tone "ding"
  const total      = Math.floor(sampleRate * duration);
  const buf        = new ArrayBuffer(44 + total * 2);
  const view       = new DataView(buf);
  const w          = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  w(0, 'RIFF');
  view.setUint32(4, 36 + total * 2, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) {
    const t   = i / sampleRate;
    const seg = t < duration / 2 ? freqs[0] : freqs[1];
    const env = Math.min(1, 50 * t) * Math.exp(-3.5 * (t < duration / 2 ? t : t - duration / 2));
    const s   = Math.sin(2 * Math.PI * seg * t) * env * 0.6;
    view.setInt16(44 + i * 2, s * 32767, true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function playNotifSound() {
  try {
    if (!_notifAudio) {
      _notifAudio = new Audio(_makeBeepUrl());
      _notifAudio.volume = 0.7;
      _notifAudio.preload = 'auto';
    }
    _notifAudio.currentTime = 0;
    const p = _notifAudio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (_) {}
}
// Pre-warm on first user gesture so mobile browsers allow later .play()
function _unlockAudio() {
  try {
    if (!_notifAudio) {
      _notifAudio = new Audio(_makeBeepUrl());
      _notifAudio.volume = 0.7;
      _notifAudio.preload = 'auto';
    }
    // Play muted then immediately pause — this "unlocks" further .play() calls
    _notifAudio.muted = true;
    const p = _notifAudio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { _notifAudio.pause(); _notifAudio.muted = false; _notifAudio.currentTime = 0; })
       .catch(() => { _notifAudio.muted = false; });
    } else {
      _notifAudio.muted = false;
    }
  } catch (_) {}
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', _unlockAudio, { once: true });
  document.addEventListener('touchstart', _unlockAudio, { once: true });
}

function showNativeNotif(title, body, tag) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    // Make the tag unique per fire so the OS shows a fresh popup every time
    const uniqueTag = `${tag}_${Date.now()}`;
    const opts = { body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: uniqueTag, vibrate: [200, 100, 200], renotify: true, requireInteraction: false, silent: false };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        try { reg.showNotification(title, opts); }
        catch (_) { try { new Notification(title, opts); } catch (_2) {} }
      }).catch(() => { try { new Notification(title, opts); } catch (_) {} });
    } else {
      new Notification(title, opts);
    }
  } catch (_) {}
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

// ─── Notification components ──────────────────────────────────────────────────
function NotifBell({ count, onClick, light = false }) {
  const clr = light ? 'rgba(255,255,255,0.75)' : '#6B7280';
  return (
    <button onClick={onClick} title="Notifications" style={{ position: 'relative', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="bell" size={20} color={clr} />
      {count > 0 && (
        <span style={{ position: 'absolute', top: 1, right: 1, background: '#DC2626', color: 'white', fontSize: 9, fontWeight: 800, minWidth: 14, height: 14, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

function NotificationPanel({ notifications, onOpenIssue, onMarkAllRead, onTest, onClose }) {
  const TYPE_ICON = { new_issue: '🆕', status_change: '🔄', new_comment: '💬', reopened: '🔁', assigned: '👋' };
  const unread = notifications.filter(n => !n.read).length;
  const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
  const requestPerm = () => { try { Notification.requestPermission?.(); } catch (_) {} };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.2)' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', right: 12, top: 12, width: 'min(360px, calc(100vw - 24px))', maxHeight: 'min(540px, calc(100vh - 24px))', background: 'white', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Notifications</span>
          {unread > 0 && <button onClick={onMarkAllRead} style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, padding: '4px 8px' }}>Mark all read</button>}
          <button onClick={onClose} style={{ padding: 4 }}><Icon name="x" size={16} color="#6B7280" /></button>
        </div>
        <button onClick={onTest} style={{ padding: '12px 16px', background: '#111827', color: 'white', borderBottom: '1px solid #F3F4F6', fontSize: 13, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          🔊 Test sound + popup
        </button>
        {perm === 'default' && (
          <button onClick={requestPerm} style={{ padding: '10px 16px', background: '#FEF3C7', borderBottom: '1px solid #FDE68A', fontSize: 12, color: '#92400E', fontWeight: 600, textAlign: 'left' }}>
            ⚠ Browser popups not enabled · tap to allow
          </button>
        )}
        {perm === 'denied' && (
          <div style={{ padding: '10px 16px', background: '#FEE2E2', borderBottom: '1px solid #FCA5A5', fontSize: 12, color: '#991B1B' }}>
            🚫 Browser popups blocked. Open site settings → Notifications → Allow, then refresh.
          </div>
        )}
        {perm === 'unsupported' && (
          <div style={{ padding: '10px 16px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', fontSize: 12, color: '#6B7280' }}>
            ℹ This browser doesn't support OS popups. In-app + sound only.
          </div>
        )}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
              All caught up
            </div>
          ) : notifications.map(n => (
            <button key={n.id} onClick={() => { onOpenIssue(n.issue_id); onClose(); }}
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', background: n.read ? 'transparent' : '#EFF6FF', borderBottom: '1px solid #F9FAFB' }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{TYPE_ICON[n.type] || '🔔'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 600, color: '#111827', marginBottom: 2, lineHeight: 1.4 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{relTime(n.at)}</div>
              </div>
              {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563EB', flexShrink: 0, marginTop: 6 }} />}
            </button>
          ))}
        </div>
      </div>
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

  // ─── Notification state ───────────────────────────────────────────────────
  const [notifications, setNotifications] = React.useState([]);
  const [notifOpen, setNotifOpen]         = React.useState(false);
  const lastSeenRef    = React.useRef(null);   // {[issue_id]:{status}} — null = not yet initialised
  const seenCommentsRef = React.useRef({});    // {[issue_id]: Set of comment_ids already observed}
  const notifDedupRef  = React.useRef(new Set()); // prevents double-firing within same 2-min window
  const diffNotifRef   = React.useRef(null);   // always points to latest diffAndNotify

  React.useEffect(() => { window.SESSION = session; }, [session]);

  const toast = (message, kind = 'info', ttl = 3200) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  };

  // ─── Notification helpers ─────────────────────────────────────────────────
  const addNotif = (notif) => {
    // Deduplicate: same issue + type fires at most once per 2-minute window
    const key = `${notif.issue_id}_${notif.type}_${Math.floor(Date.now() / 120000)}`;
    if (notifDedupRef.current.has(key)) return;
    notifDedupRef.current.add(key);
    const n = { ...notif, id: Math.random().toString(36).slice(2), at: new Date().toISOString(), read: false };
    setNotifications(prev => [n, ...prev].slice(0, 50));
    // Three layers of feedback — at least one will land:
    // 1) In-app toast (always works)
    toast(`🔔 ${notif.message}`, 'info', 5000);
    // 2) WebAudio beep (works in tab, even without notif permission)
    playNotifSound();
    // 3) Native OS notification (always — fires even when tab is visible)
    showNativeNotif('Refurb Helpdesk', notif.message, key);
  };

  const diffAndNotify = (newIssues) => {
    const user = window.SESSION?.user;
    if (!user) return;
    const prev = lastSeenRef.current;
    const buildMap = arr => Object.fromEntries(arr.map(i => [i.issue_id, { status: i.status }]));

    if (prev === null) {
      // First load — initialise silently without firing any notifications
      lastSeenRef.current = buildMap(newIssues);
      return;
    }

    for (const issue of newIssues) {
      const old = prev[issue.issue_id];
      const title = issue.title || issue.issue_id;

      if (!old) {
        // Brand-new issue appeared in the list
        if (user.role === 'admin') {
          addNotif({ type: 'new_issue', issue_id: issue.issue_id, message: `New issue raised: ${title}` });
        }
        continue;
      }

      if (old.status === issue.status) continue;

      // Status changed ─────────────────────────────────────────────────────
      // Workshop user: their own issue changed status
      if (user.role === 'workshop' && issue.raised_by === user.user_id) {
        const label = window.STATUSES?.find(s => s.id === issue.status)?.label || issue.status.replace(/_/g, ' ');
        addNotif({ type: 'status_change', issue_id: issue.issue_id, message: `${issue.issue_id}: status → ${label}` });
      }
      // Admin / manager: issue was reopened
      if (['admin', 'manager'].includes(user.role) && issue.status === 'reopened') {
        addNotif({ type: 'reopened', issue_id: issue.issue_id, message: `${issue.issue_id} reopened: ${title}` });
      }
      // POC: issue newly assigned to them
      if (user.role === 'poc' && issue.status === 'assigned' && issue.assigned_to === user.user_id) {
        addNotif({ type: 'assigned', issue_id: issue.issue_id, message: `${issue.issue_id} assigned to you: ${title}` });
      }
    }

    lastSeenRef.current = buildMap(newIssues);
  };

  // Keep ref in sync with latest closure on every render (avoids stale ref in interval)
  diffNotifRef.current = diffAndNotify;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  const bootstrap = async (user) => {
    if (!window.CONFIG.N8N_BASE) {
      setFatalError('N8N_BASE not configured. Edit web/config.js.');
      return;
    }

    const cachedLookups = getCached('lookups');
    const cachedUsers   = getCached('users');
    const hasCached     = !!(cachedLookups && cachedUsers);

    if (hasCached) {
      applyLookups(cachedLookups);
      applyUsers(cachedUsers, setUsers);
    } else {
      setBooting(true);
    }

    try {
      const [lookups, usersRes, issuesRes] = await Promise.all([
        API.lookups(),
        API.usersList(),
        API.issuesList(user, {}),
      ]);

      setCache('lookups', lookups);
      setCache('users',   usersRes);

      applyLookups(lookups);
      applyUsers(usersRes, setUsers);
      const bootIssues = issuesRes.issues || [];
      setIssues(bootIssues);
      // Initialise lastSeen without notifying — these issues already exist
      lastSeenRef.current = Object.fromEntries(bootIssues.map(i => [i.issue_id, { status: i.status }]));
      setPage(user.role === 'workshop' ? 'home' : 'dashboard');
    } catch (e) {
      if (!hasCached) setFatalError(`Couldn't load data: ${e.message}`);
      else            console.warn('Background refresh failed:', e.message);
    } finally {
      setBooting(false);
    }
  };

  React.useEffect(() => { if (session?.user) bootstrap(session.user); /* eslint-disable-next-line */ }, [session?.user?.user_id]);

  // Request browser-notification permission whenever a session is active.
  // Covers both fresh logins AND auto-login from saved session (where onLogin never fires).
  React.useEffect(() => {
    if (!session?.user) return;
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const p = Notification.requestPermission?.();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (_) {}
  }, [session?.user?.user_id]);

  const refreshIssues = async (silent = false) => {
    if (!session?.user) return;
    try {
      const res = await API.issuesList(session.user, {});
      const newIssues = res.issues || [];
      setIssues(newIssues);
      diffNotifRef.current?.(newIssues);
    } catch (e) { if (!silent) toast(`Refresh failed: ${e.message}`, 'error'); }
  };

  // Open-issue detail polling
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

  // Background issue-list polling — catches new issues + status changes even when no action taken
  React.useEffect(() => {
    if (!session?.user) return;
    let alive = true;
    const poll = async () => {
      const user = window.SESSION?.user;
      if (!user || !alive) return;
      try {
        const res = await API.issuesList(user, {});
        if (!alive) return;
        const fresh = res?.issues || [];
        setIssues(fresh);
        diffNotifRef.current?.(fresh);
      } catch (_) {}
    };
    const t = setInterval(poll, window.CONFIG?.POLL_INTERVAL_MS || 60000);
    return () => { alive = false; clearInterval(t); };
  }, [session?.user?.user_id]);

  // Comment tracking — notify when NEW messages from OTHER users land in the open issue.
  // Tracks comment_ids (not counts) so it's robust against retries, reorderings and races.
  React.useEffect(() => {
    if (!openIssueData) return;
    const user = window.SESSION?.user;
    if (!user) return;
    const { issue, comments } = openIssueData;
    if (!issue) return;
    const list = comments || [];

    let seen = seenCommentsRef.current[issue.issue_id];
    if (!seen) {
      // First view of this issue — mark every existing comment as seen, no notifications
      seen = new Set(list.map(c => c.comment_id).filter(Boolean));
      seenCommentsRef.current[issue.issue_id] = seen;
      return;
    }

    const newComments = list.filter(c => c.comment_id && !seen.has(c.comment_id));
    // Always mark them as seen — even own messages — so we never re-notify
    newComments.forEach(c => seen.add(c.comment_id));

    const fromOthers = newComments.filter(c => c.commented_by && c.commented_by !== user.user_id);
    if (fromOthers.length === 0) return;

    if (user.role === 'workshop' && issue.raised_by === user.user_id) {
      addNotif({ type: 'new_comment', issue_id: issue.issue_id, message: `New message on ${issue.issue_id}` });
    }
    if (['admin', 'manager'].includes(user.role)) {
      addNotif({ type: 'new_comment', issue_id: issue.issue_id, message: `New message on ${issue.issue_id}: ${issue.title || ''}` });
    }
    if (user.role === 'poc' && issue.assigned_to === user.user_id) {
      addNotif({ type: 'new_comment', issue_id: issue.issue_id, message: `New message on ${issue.issue_id}: ${issue.title || ''}` });
    }
  }, [openIssueData]);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const onLogin = (user) => {
    const s = { user, at: Date.now() };
    saveSession(s); setSession(s);
    // Request browser notification permission on first login
    try { if (Notification?.permission === 'default') Notification.requestPermission?.(); } catch (_) {}
  };
  const onLogout = () => {
    clearSession(); clearAllCache();
    setSession(null); setIssues([]); setUsers([]);
    setOpenIssueId(null); setOpenIssueData(null); setPage('home');
    setNotifications([]); setNotifOpen(false);
    lastSeenRef.current = null; seenCommentsRef.current = {}; notifDedupRef.current = new Set();
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

      // Show success + redirect immediately — uploads happen in background.
      const hasAtt = draft.attachments?.length > 0;
      toast(hasAtt ? `Issue ${issue.issue_id} raised · uploading photos…` : `Issue ${issue.issue_id} raised`, 'success');
      setPage('issues');
      openIssue(issue.issue_id);
      refreshIssues(true);

      // Background upload — keeps UI responsive on slow mobile networks.
      if (hasAtt) {
        (async () => {
          const optimistic = [];
          for (const file of draft.attachments) {
            try {
              const res = await API.uploadAttachment(issue.issue_id, file, session.user.user_id);
              const att = res?.attachment;
              if (att) {
                optimistic.push(att);
                // Inject immediately so user sees their image (avoids race with stale DB rows)
                setOpenIssueData(prev => {
                  if (!prev || prev.issue?.issue_id !== issue.issue_id) return prev;
                  const existing = prev.attachments || [];
                  if (existing.find(a => a.attachment_id === att.attachment_id)) return prev;
                  return { ...prev, attachments: [...existing, att] };
                });
              }
            } catch (e) {
              toast(`Upload failed: ${file.name}`, 'error');
            }
          }
          // Wait for n8n data table to commit, then re-fetch to confirm
          if (optimistic.length) {
            await new Promise(r => setTimeout(r, 1500));
            try {
              const data = await API.issuesGet(session.user, issue.issue_id);
              // Only overwrite if our optimistic atts are present (else keep optimistic)
              const serverIds = new Set((data.attachments || []).map(a => a.attachment_id));
              const allPresent = optimistic.every(a => serverIds.has(a.attachment_id));
              if (allPresent) setOpenIssueData(data);
              toast(`${optimistic.length} photo${optimistic.length > 1 ? 's' : ''} uploaded`, 'success');
            } catch (_) {}
          }
        })();
      }
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
      const isAdd = teamDialog?.mode === 'add';
      if (isAdd) {
        await API.usersCreate(payload);
      } else {
        await API.usersUpdate(teamDialog.initial.user_id, payload);
      }
      const freshRes = await API.usersList();
      setCache('users', freshRes);
      applyUsers(freshRes, setUsers);
      toast(isAdd ? 'User created' : 'User updated', 'success');
      setTeamDialog(null);
    } catch (e) { throw e; }
  };

  const deleteUser = async (user_id) => {
    try {
      await API.usersDelete(user_id);
      const freshRes = await API.usersList();
      setCache('users', freshRes);
      applyUsers(freshRes, setUsers);
      toast('User removed', 'success');
      setTeamDialog(null);
    } catch (e) { toast(`Delete failed: ${e.message}`, 'error'); }
  };

  const attachToIssue = async (file) => {
    if (!openIssueId) return;
    const targetId = openIssueId;
    const res = await API.uploadAttachment(targetId, file, session.user.user_id);
    const att = res?.attachment;
    // Optimistically inject so user sees the just-uploaded file instantly
    if (att) {
      setOpenIssueData(prev => {
        if (!prev || prev.issue?.issue_id !== targetId) return prev;
        const existing = prev.attachments || [];
        if (existing.find(a => a.attachment_id === att.attachment_id)) return prev;
        return { ...prev, attachments: [...existing, att] };
      });
    }
    // Re-fetch from server after a delay to confirm + pick up any other changes
    setTimeout(async () => {
      try {
        const data = await API.issuesGet(session.user, targetId);
        const serverIds = new Set((data.attachments || []).map(a => a.attachment_id));
        if (!att || serverIds.has(att.attachment_id)) {
          setOpenIssueData(curr => (curr && curr.issue?.issue_id === targetId) ? data : curr);
        }
      } catch (_) {}
    }, 1500);
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length;
  const dismissToast = id => setToasts(t => t.filter(x => x.id !== id));
  const openNotifPanel = () => setNotifOpen(v => !v);
  const closeNotifPanel = () => { setNotifOpen(false); markAllRead(); };

  const onTestNotif = () => {
    toast('🔔 Test — sound + native popup', 'info', 4000);
    playNotifSound();
    showNativeNotif('Refurb Helpdesk', 'Test notification — if you see this, popups work!', 'test');
  };

  const notifPanel = notifOpen && (
    <NotificationPanel
      notifications={notifications}
      onOpenIssue={id => { openIssue(id); setNotifOpen(false); markAllRead(); }}
      onMarkAllRead={markAllRead}
      onTest={onTestNotif}
      onClose={closeNotifPanel}
    />
  );

  // ─── Render ───────────────────────────────────────────────────────────────
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
  const mobileBell = <NotifBell count={unreadCount} onClick={openNotifPanel} light={false} />;
  const desktopBell = <NotifBell count={unreadCount} onClick={openNotifPanel} light={true} />;

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
          <MobileIssueDetail issueData={openIssueData} user={user} onBack={closeIssue} onComment={addComment} onReopen={reopenIssue} onAttach={attachToIssue} notifBell={mobileBell} refreshing={openIssueRefreshing} />
          <Toast toasts={toasts} onDismiss={dismissToast} />
          {notifPanel}
        </>
      );
    }
    return (
      <DesktopShell user={user} activeTab={page} onNavTab={p => { setPage(p); closeIssue(); }} onLogout={onLogout} notifBell={desktopBell}>
        <DesktopIssueDetail issueData={openIssueData} user={user} onBack={closeIssue} onPatch={patchIssue} onComment={addComment} onReopen={reopenIssue} onAttach={attachToIssue} refreshing={openIssueRefreshing} />
        <Toast toasts={toasts} onDismiss={dismissToast} />
        {notifPanel}
      </DesktopShell>
    );
  }

  // ─── Top-level pages ───────────────────────────────────────────────────────
  if (user.role === 'workshop') {
    let view;
    if (page === 'new') {
      view = <MobileNew user={user} onCancel={() => setPage('home')} onSubmit={createIssue} />;
    } else if (page === 'issues') {
      view = <MobileIssues user={user} issues={issues} onNav={setPage} onOpenIssue={openIssue} notifBell={mobileBell} />;
    } else {
      view = <MobileHome user={user} issues={issues} onNav={setPage} onOpenIssue={openIssue} onLogout={onLogout} notifBell={mobileBell} />;
    }
    return <>{view}<Toast toasts={toasts} onDismiss={dismissToast} />{notifPanel}</>;
  }

  // admin / manager / poc
  const subtitle = user.role === 'manager' ? `${lookup(window.WORKSHOPS, user.workshop_id)?.label || ''} overview` : null;
  const pageTitle = page === 'dashboard' ? 'Dashboard' : page === 'issues' ? 'All issues' : 'Team directory';

  return (
    <DesktopShell user={user} activeTab={page} onNavTab={setPage} onLogout={onLogout} title={pageTitle} subtitle={subtitle} notifBell={desktopBell}>
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
      <Toast toasts={toasts} onDismiss={dismissToast} />
      {notifPanel}
    </DesktopShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
