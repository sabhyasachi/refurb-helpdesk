// Mobile views for technicians (and managers in mobile mode).
// Exports: MobileApp

function MobileShell({ children, active, onNav, title, onBack, rightEl, notifBell, hideTabBar }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F8FA', color: '#111827' }}>
      <div style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12, paddingLeft: 16, paddingRight: 16, background: 'white', borderBottom: '1px solid #EEF0F3', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: '#F3F4F6', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="chevronLeft" size={22} color="#111827" />
          </button>
        )}
        <div style={{ flex: 1, fontSize: onBack ? 17 : 22, fontWeight: 700, letterSpacing: -0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {notifBell}
        {rightEl}
      </div>
      <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>{children}</div>
      {!hideTabBar && (
        <div style={{ borderTop: '1px solid #EEF0F3', background: 'white', display: 'flex', paddingTop: 8, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {[
            { id: 'home',   icon: 'home',  label: 'Home' },
            { id: 'new',    icon: 'plus',  label: 'Raise', primary: true },
            { id: 'issues', icon: 'list',  label: 'My issues' },
          ].map(tab => {
            const isActive = active === tab.id;
            if (tab.primary) {
              return (
                <div key={tab.id} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => onNav(tab.id)} style={{ background: '#111827', color: 'white', width: 56, height: 56, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -18, boxShadow: '0 8px 20px rgba(17,24,39,0.3)' }}>
                    <Icon name="plus" size={28} color="white" strokeWidth={2.5} />
                  </button>
                </div>
              );
            }
            return (
              <button key={tab.id} onClick={() => onNav(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', color: isActive ? '#111827' : '#9CA3AF' }}>
                <Icon name={tab.icon} size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, onClick, divider }) {
  const cat = lookup(window.CATEGORIES, issue.category) || { color: '#6B7280', icon: '❔' };
  return (
    <button onClick={onClick} style={{ width: '100%', background: 'white', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', borderBottom: divider ? '1px solid #F3F4F6' : 'none' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{cat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{issue.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill statusId={issue.status} size="sm" />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>· {relTime(issue.updated_at)}</span>
        </div>
      </div>
    </button>
  );
}

function MobileHome({ user, issues, onNav, onOpenIssue, onLogout, notifBell }) {
  const mine = issues.filter(i => i.raised_by === user.user_id);
  const openCount = mine.filter(i => ['open', 'assigned', 'in_progress', 'reopened'].includes(i.status)).length;
  const resolvedCount = mine.filter(i => i.status === 'resolved').length;
  const recent = mine.slice(0, 3);
  const dept = lookup(window.DEPARTMENTS, user.department_id);
  const ws = lookup(window.WORKSHOPS, user.workshop_id);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <MobileShell
      active="home" onNav={onNav}
      title={<span>Hello, {user.full_name.split(' ')[0]} 👋</span>}
      notifBell={notifBell}
      rightEl={<button onClick={onLogout} title="Log out" style={{ padding: 8, color: '#6B7280' }}><Icon name="logout" size={20} /></button>}
    >
      <div style={{ padding: 16, paddingBottom: 32 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>{greet},</div>
          {dept && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{dept.label}{ws ? ` · ${ws.label}` : ''}</div>}
        </div>
        <button onClick={() => onNav('new')} style={{ width: '100%', background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)', borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 16, color: 'white', textAlign: 'left', boxShadow: '0 8px 24px rgba(17,24,39,0.15)', marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="plus" size={28} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>Raise a new issue</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Takes 30 seconds</div>
          </div>
          <Icon name="arrowRight" size={20} color="white" />
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <button onClick={() => onNav('issues')} style={{ background: 'white', borderRadius: 16, padding: 16, textAlign: 'left', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1, marginBottom: 6 }}>{openCount}</div>
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Open issues</div>
          </button>
          <button onClick={() => onNav('issues')} style={{ background: 'white', borderRadius: 16, padding: 16, textAlign: 'left', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#16A34A', lineHeight: 1, marginBottom: 6 }}>{resolvedCount}</div>
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Resolved</div>
          </button>
        </div>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Recent</div>
          <button onClick={() => onNav('issues')} style={{ color: '#2563EB', fontSize: 13, fontWeight: 600 }}>See all</button>
        </div>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
          {recent.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No issues yet. Tap + to raise one.</div>
          ) : recent.map((issue, i) => (
            <IssueRow key={issue.issue_id} issue={issue} onClick={() => onOpenIssue(issue.issue_id)} divider={i < recent.length - 1} />
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

function MobileIssues({ user, issues, onNav, onOpenIssue, notifBell }) {
  const [filter, setFilter] = React.useState('all');
  const mine = issues.filter(i => i.raised_by === user.user_id);
  const tabs = [
    { id: 'all',      label: 'All',      count: mine.length },
    { id: 'open',     label: 'Open',     count: mine.filter(i => ['open', 'assigned', 'in_progress', 'reopened'].includes(i.status)).length },
    { id: 'resolved', label: 'Resolved', count: mine.filter(i => i.status === 'resolved').length },
  ];
  const visible = filter === 'all' ? mine : filter === 'resolved' ? mine.filter(i => i.status === 'resolved') : mine.filter(i => ['open', 'assigned', 'in_progress', 'reopened'].includes(i.status));

  return (
    <MobileShell active="issues" onNav={onNav} title="My issues" notifBell={notifBell}>
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #EEF0F3', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {tabs.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ background: filter === f.id ? '#111827' : '#F3F4F6', color: filter === f.id ? 'white' : '#374151', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {f.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>{f.count}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Nothing here yet</div>
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
            {visible.map((issue, i) => <IssueRow key={issue.issue_id} issue={issue} onClick={() => onOpenIssue(issue.issue_id)} divider={i < visible.length - 1} />)}
          </div>
        </div>
      )}
    </MobileShell>
  );
}

// Urgency labels shown to technicians — friendlier than "Urgent/High/Normal/Low".
// Priority IDs stay p0-p3 internally for the admin UI + filters + DB.
const URGENCY_LABELS = {
  p0: 'work is stopped',
  p1: 'blocking me',
  p2: 'can wait a bit',
  p3: 'just asking',
};

// Only these two categories are offered on the raise form. Admin UI still knows about
// the other categories if an older ticket has them.
const RAISE_CATEGORIES = ['bug', 'other'];

function MobileNew({ user, onCancel, onSubmit }) {
  const [draft, setDraft] = React.useState({ category: null, vehicle_id: '', description: '', priority: null, attachments: [] });
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef();
  const update = (patch) => setDraft(d => ({ ...d, ...patch }));

  // Description required (≥10 chars) + priority required. Category is optional.
  const canSubmit = draft.description.trim().length >= 10 && !!draft.priority && !!draft.vehicle_id.trim();

  const pickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const max = window.CONFIG.ATTACHMENT_MAX_BYTES;
    const kept = files.filter(f => f.size <= max);
    if (kept.length < files.length) alert('Some files were too large (>25MB) and skipped.');
    update({ attachments: [...draft.attachments, ...kept] });
    e.target.value = '';
  };

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const desc = draft.description.trim();
      await onSubmit({
        category: draft.category || 'other',
        title: draft.vehicle_id.trim(),
        description: desc,
        priority: draft.priority,
        attachments: draft.attachments,
      });
    } finally {
      setBusy(false);
    }
  };

  const cats = window.CATEGORIES.filter(c => RAISE_CATEGORIES.includes(c.id));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F8FA' }}>
      <div style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12, paddingLeft: 16, paddingRight: 16, background: 'white', borderBottom: '1px solid #EEF0F3', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onCancel} style={{ background: '#F3F4F6', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color="#111827" />
        </button>
        <div style={{ flex: 1, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Raise an issue</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* 0. Car / Lead ID — required */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Car / Lead ID <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <input
          value={draft.vehicle_id}
          onChange={e => update({ vehicle_id: e.target.value })}
          placeholder="e.g. KA01AB1234 or LD-2398"
          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', fontSize: 16, outline: 'none', marginBottom: 18 }}
        />

        {/* 1. Description — required, primary field */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          What's going on? <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <textarea
          autoFocus
          value={draft.description}
          onChange={e => update({ description: e.target.value })}
          placeholder="Describe what happened. When did it start, what were you doing?"
          rows={5}
          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', fontSize: 16, outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: 4 }}
        />
        <div style={{ fontSize: 11, color: draft.description.trim().length < 10 ? '#DC2626' : '#9CA3AF', marginBottom: 18, textAlign: 'right' }}>
          {draft.description.trim().length < 10 ? `${10 - draft.description.trim().length} more characters needed` : '✓ looks good'}
        </div>

        {/* 2. Attachments — optional */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Photo / voice / PDF <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
        </label>
        <input ref={fileRef} type="file" accept={window.CONFIG.ATTACHMENT_ACCEPT} multiple style={{ display: 'none' }} onChange={pickFiles} />
        <button onClick={() => fileRef.current?.click()} style={{ width: '100%', border: '1.5px dashed #D1D5DB', background: 'white', borderRadius: 12, padding: '14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#374151', fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
          <Icon name="paperclip" size={18} color="#6B7280" />
          Add photo, voice note, or PDF
        </button>
        {draft.attachments.length > 0 && (
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {draft.attachments.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F3F4F6', borderRadius: 8 }}>
                <Icon name="paperclip" size={14} color="#6B7280" />
                <div style={{ flex: 1, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                <button onClick={() => update({ attachments: draft.attachments.filter((_, j) => j !== i) })} style={{ padding: 2 }}>
                  <Icon name="x" size={14} color="#9CA3AF" />
                </button>
              </div>
            ))}
          </div>
        )}
        {draft.attachments.length === 0 && <div style={{ height: 18 }} />}

        {/* 3. Type — optional, bug or other */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Type <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
          {cats.map(c => {
            const selected = draft.category === c.id;
            return (
              <button key={c.id} onClick={() => update({ category: selected ? null : c.id })} style={{ border: selected ? `2px solid ${c.color}` : '1.5px solid #E5E7EB', background: 'white', borderRadius: 12, padding: '12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: selected ? `0 4px 12px ${c.color}22` : 'none' }}>
                <div style={{ fontSize: 20 }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{c.short}</div>
              </button>
            );
          })}
        </div>

        {/* 4. Urgency — required */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          How urgent? <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {window.PRIORITIES.map(p => {
            const selected = draft.priority === p.id;
            const label = URGENCY_LABELS[p.id] || p.short;
            return (
              <button key={p.id} onClick={() => update({ priority: p.id })} style={{ border: selected ? `2px solid ${p.color}` : '1.5px solid #E5E7EB', background: 'white', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: selected ? `0 4px 12px ${p.color}22` : 'none' }}>
                <div style={{ width: 8, height: 32, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1, textAlign: 'left', fontSize: 16, fontWeight: 600, color: '#111827', textTransform: 'lowercase' }}>{label}</div>
                {selected && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={12} color="white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px max(12px, env(safe-area-inset-bottom))', background: 'white', borderTop: '1px solid #EEF0F3' }}>
        <button onClick={submit} disabled={!canSubmit || busy} style={{ width: '100%', background: (canSubmit && !busy) ? '#111827' : '#E5E7EB', color: (canSubmit && !busy) ? 'white' : '#9CA3AF', padding: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {busy ? 'Submitting…' : 'Submit issue'}
          {!busy && <Icon name="send" size={18} color={canSubmit ? 'white' : '#9CA3AF'} />}
        </button>
      </div>
    </div>
  );
}

function MobileIssueDetail({ issueData, user, onBack, onComment, onReopen, onAttach, notifBell, refreshing }) {
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [attaching, setAttaching] = React.useState(false);
  const attachRef = React.useRef();
  const { issue, comments, attachments } = issueData;
  const raiser = issueData.raiser || userFor(issue.raised_by);
  const assignee = issueData.assignee || (issue.assigned_to ? userFor(issue.assigned_to) : null);
  const cat = lookup(window.CATEGORIES, issue.category) || {};

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await onComment(issue.issue_id, draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const pickAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const max = window.CONFIG?.ATTACHMENT_MAX_BYTES || 10 * 1024 * 1024;
    if (file.size > max) { alert('File too large (max 10 MB)'); return; }
    setAttaching(true);
    try { await onAttach(file); }
    catch (err) { alert('Upload failed: ' + err.message); }
    finally { setAttaching(false); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F8FA' }}>
      <div style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12, paddingLeft: 16, paddingRight: 16, background: 'white', borderBottom: '1px solid #EEF0F3', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: '#F3F4F6', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color="#111827" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, letterSpacing: 0.4 }}>{issue.issue_id}</div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{issue.title}</div>
        </div>
        {notifBell}
        {refreshing && <div className="pulse" style={{ fontSize: 10, color: '#9CA3AF' }}>syncing…</div>}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <StatusPill statusId={issue.status} />
            <PriorityPill priorityId={issue.priority} />
            <span style={{ fontSize: 12, color: '#6B7280' }}>· {relTime(issue.updated_at)}</span>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Raised by</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar user={raiser} size={28} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{raiser?.user_id === user.user_id ? 'You' : raiser?.full_name.split(' ')[0]}</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Assigned</div>
              {assignee ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar user={assignee} size={28} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{assignee.full_name.split(' ')[0]}</span>
                </div>
              ) : <span style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Waiting…</span>}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: (cat.color || '#6B7280') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{cat.icon}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{cat.short || issue.category}</span>
          </div>
          {issue.description && <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{issue.description}</div>}
        </div>

        {attachments && attachments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, paddingLeft: 4 }}>Attachments · {attachments.length}</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {attachments.map(a => {
                const href = a.url || a.drive_url;
                const isImage = (a.kind === 'image') || /^image\//.test(a.mime || '') || /\.(png|jpe?g|gif|webp|heic)$/i.test(a.file_name || '');
                if (isImage) {
                  return (
                    <a key={a.attachment_id} href={href} target="_blank" rel="noopener" title={a.file_name} style={{ display: 'block', borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={a.thumb_url || href} alt={a.file_name || 'attachment'} style={{ display: 'block', width: 120, height: 120, objectFit: 'cover' }} />
                    </a>
                  );
                }
                return (
                  <a key={a.attachment_id} href={href} target="_blank" rel="noopener" style={{ minWidth: 140, background: 'white', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <Icon name="paperclip" size={16} color="#6B7280" />
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{Math.round((a.size_bytes || a.file_size_bytes || 0) / 1024)} KB</div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, paddingLeft: 4 }}>Conversation · {comments.length}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.map(c => {
            const author = userFor(c.commented_by);
            const isMine = c.commented_by === user.user_id;
            return (
              <div key={c.comment_id} style={{ display: 'flex', gap: 10, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                <Avatar user={author} size={30} />
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textAlign: isMine ? 'right' : 'left' }}>
                    <span style={{ fontWeight: 600 }}>{isMine ? 'You' : author?.full_name.split(' ')[0] || '—'}</span> · {relTime(c.created_at)}{c.is_ai_generated ? ' · AI' : ''}
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 14, background: isMine ? '#111827' : 'white', color: isMine ? 'white' : '#111827', fontSize: 14, lineHeight: 1.5, borderTopLeftRadius: isMine ? 14 : 4, borderTopRightRadius: isMine ? 4 : 14, boxShadow: isMine ? 'none' : '0 1px 2px rgba(0,0,0,0.04)' }}>{c.comment_text}</div>
                </div>
              </div>
            );
          })}
        </div>

        {issue.status === 'resolved' && issue.raised_by === user.user_id && (
          <div style={{ marginTop: 20, padding: 16, background: '#F0FDF4', borderRadius: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 8 }}>✅ Marked resolved</div>
            <button onClick={() => onReopen(issue.issue_id)} style={{ border: '1.5px solid #16A34A', background: 'white', color: '#16A34A', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>Reopen issue</button>
          </div>
        )}
      </div>

      {issue.status !== 'resolved' && (
        <div style={{ padding: '10px 12px max(12px, env(safe-area-inset-bottom))', background: 'white', borderTop: '1px solid #EEF0F3', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <input ref={attachRef} type="file" accept={window.CONFIG?.ATTACHMENT_ACCEPT || 'image/*,audio/*,application/pdf'} style={{ display: 'none' }} onChange={pickAttachment} />
          <button onClick={() => attachRef.current?.click()} disabled={attaching} title="Attach file" style={{ background: attaching ? '#F3F4F6' : '#F3F4F6', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {attaching
              ? <div style={{ width: 16, height: 16, border: '2px solid #9CA3AF', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <Icon name="paperclip" size={17} color="#6B7280" />}
          </button>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a reply…" rows={1} style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '10px 14px', fontSize: 15, resize: 'none', outline: 'none', maxHeight: 100 }} />
          <button onClick={send} disabled={!draft.trim() || sending} style={{ background: (draft.trim() && !sending) ? '#111827' : '#E5E7EB', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="send" size={17} color={(draft.trim() && !sending) ? 'white' : '#9CA3AF'} />
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MobileShell, MobileHome, MobileIssues, MobileNew, MobileIssueDetail, IssueRow });
