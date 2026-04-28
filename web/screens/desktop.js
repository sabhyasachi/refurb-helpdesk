// Desktop admin + manager views. Single shell; content varies by role + tab.

const NAV_ITEMS_ADMIN   = [ { id: 'dashboard', label: 'Dashboard', icon: 'home' }, { id: 'issues', label: 'All issues', icon: 'list' }, { id: 'team', label: 'Team', icon: 'users' } ];
const NAV_ITEMS_MANAGER = [ { id: 'dashboard', label: 'Dashboard', icon: 'home' }, { id: 'issues', label: 'All issues', icon: 'list' } ];

function DesktopShell({ user, activeTab, onNavTab, onLogout, children, title, subtitle }) {
  const items = user.role === 'admin' ? NAV_ITEMS_ADMIN : NAV_ITEMS_MANAGER;
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 240, background: '#0F1419', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>R</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Refurb Helpdesk</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{user.role === 'admin' ? 'Central admin' : 'Workshop manager'}</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '0 10px' }}>
          {items.map(n => {
            const active = activeTab === n.id;
            return (
              <button key={n.id} onClick={() => onNavTab(n.id)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: active ? 'rgba(255,255,255,0.1)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                <Icon name={n.icon} size={18} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={user} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{user.username}</div>
          </div>
          <button onClick={onLogout} title="Log out" style={{ color: 'rgba(255,255,255,0.6)', padding: 8 }}>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>
      <main className="scroll-area" style={{ flex: 1, overflow: 'auto', background: '#F7F8FA' }}>
        {(title || subtitle) && (
          <div style={{ padding: '28px 32px 14px', background: 'white', borderBottom: '1px solid #EEF0F3' }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{subtitle}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

function StatCard({ label, value, color = '#111827' }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Dashboard({ user, issues, onOpenIssue }) {
  const isPOC = user.role === 'poc';
  const scoped = isPOC
    ? issues.filter(i => i.assigned_to === user.user_id)
    : user.role === 'manager'
      ? issues.filter(i => i.workshop_id === user.workshop_id)
      : issues;
  const today = new Date(); today.setHours(0,0,0,0);
  const stats = {
    open:       scoped.filter(i => ['open', 'assigned', 'in_progress', 'reopened'].includes(i.status)).length,
    unassigned: scoped.filter(i => !i.assigned_to && i.status !== 'resolved').length,
    urgent:     scoped.filter(i => i.priority === 'p0' && i.status !== 'resolved').length,
    resolved:   scoped.filter(i => i.status === 'resolved' && new Date(i.resolved_at || i.updated_at) >= today).length,
  };
  // POC sees their open assigned tasks; admin/manager see unassigned triage
  const triage = isPOC
    ? scoped.filter(i => i.status !== 'resolved').sort((a, b) => {
        const pri = { p0: 0, p1: 1, p2: 2, p3: 3 };
        return (pri[a.priority] ?? 9) - (pri[b.priority] ?? 9) || new Date(b.updated_at) - new Date(a.updated_at);
      }).slice(0, 20)
    : scoped.filter(i => !i.assigned_to && i.status !== 'resolved').slice(0, 10);

  const byCat = window.CATEGORIES.map(c => ({
    ...c,
    count: scoped.filter(i => i.category === c.id && i.status !== 'resolved').length,
  }));
  const catMax = Math.max(1, ...byCat.map(c => c.count));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label={isPOC ? 'My open' : 'Open'} value={stats.open} />
        {!isPOC && <StatCard label="Unassigned" value={stats.unassigned} color="#DC2626" />}
        {isPOC && <StatCard label="In progress" value={scoped.filter(i => i.status === 'in_progress').length} color="#EA580C" />}
        <StatCard label="Urgent (P0)" value={stats.urgent} color="#DC2626" />
        <StatCard label="Resolved today" value={stats.resolved} color="#16A34A" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: user.role === 'admin' ? '1fr 320px' : '1fr', gap: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', fontSize: 14, fontWeight: 700 }}>{isPOC ? 'Assigned to you' : 'Needs your attention'}</div>
          {triage.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>{isPOC ? 'Nothing assigned to you yet.' : 'Nothing unassigned — nice.'}</div>
          ) : triage.map(i => <AdminIssueRow key={i.issue_id} issue={i} onClick={() => onOpenIssue(i.issue_id)} />)}
        </div>
        {user.role === 'admin' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Open by category</div>
            {byCat.map(c => (
              <div key={c.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#374151' }}>{c.short}</span>
                  <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{c.count}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(c.count / catMax) * 100}%`, background: c.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminIssueRow({ issue, onClick }) {
  const cat = lookup(window.CATEGORIES, issue.category) || { color: '#6B7280', icon: '❔' };
  const raiser = userFor(issue.raised_by);
  const assignee = userFor(issue.assigned_to);
  const ws = lookup(window.WORKSHOPS, issue.workshop_id);
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cat.icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: '#6B7280', fontWeight: 600 }}>{issue.issue_id}</span>
          <StatusPill statusId={issue.status} size="sm" />
          <PriorityPill priorityId={issue.priority} size="sm" />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
          {raiser?.full_name || '—'} · {ws?.short_name || ws?.label || '—'} · {relTime(issue.updated_at)}
        </div>
      </div>
      {assignee ? (
        <div title={assignee.full_name}><Avatar user={assignee} size={32} /></div>
      ) : (
        <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', padding: '4px 10px', borderRadius: 999 }}>Unassigned</span>
      )}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 500, minWidth: 130 }}>
      <option value="">{label}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

const SORT_OPTIONS = [
  { id: 'updated_desc',  label: 'Recently updated',     sort: (a, b) => new Date(b.updated_at) - new Date(a.updated_at) },
  { id: 'created_desc',  label: 'Newest first',         sort: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  { id: 'created_asc',   label: 'Oldest first',         sort: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  { id: 'priority',      label: 'Most urgent first',    sort: (a, b) => (a.priority || 'p9').localeCompare(b.priority || 'p9') },
  { id: 'status',        label: 'Status (open → done)', sort: (a, b) => ['open','reopened','assigned','in_progress','resolved'].indexOf(a.status) - ['open','reopened','assigned','in_progress','resolved'].indexOf(b.status) },
];

const EMPTY_FILTERS = {
  search: '',
  status: [],
  priority: [],
  category: [],
  cityId: null,
  workshopId: null,
  assignee: null,   // admin — also accepts '__unassigned__'
  raiser: null,     // manager
};

function countActive(f) {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.status.length) n++;
  if (f.priority.length) n++;
  if (f.category.length) n++;
  if (f.cityId) n++;
  if (f.workshopId) n++;
  if (f.assignee) n++;
  if (f.raiser) n++;
  return n;
}

function FilterModal({ user, filters, onChange, onClose, onClear }) {
  const [f, setF] = React.useState(filters);
  const set = (patch) => setF(prev => ({ ...prev, ...patch }));
  const toggle = (key, val) => {
    const arr = f[key];
    set({ [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };
  const workshopsForCity = f.cityId ? window.WORKSHOPS.filter(w => w.city_id === f.cityId) : window.WORKSHOPS;
  const pocs = Object.values(window.USERS_BY_ID).filter(u => u.role === 'poc');
  const technicians = Object.values(window.USERS_BY_ID).filter(u => (user.role === 'manager' ? u.workshop_id === user.workshop_id : true) && u.role === 'workshop');

  const apply = () => { onChange(f); onClose(); };
  const reset = () => { setF(EMPTY_FILTERS); };

  const Chip = ({ active, color, bg, onClick, children }) => (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: active ? `1.5px solid ${color}` : '1px solid #E5E7EB', background: active ? bg : 'white', color: active ? color : '#374151' }}>{children}</button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px, calc(100vw - 32px))', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>Filter issues</div>
          <button onClick={onClose}><Icon name="x" size={18} color="#6B7280" /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Search */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Search</div>
            <input value={f.search} onChange={e => set({ search: e.target.value })} placeholder="ID or title…" style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
          </div>

          {/* Status */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {window.STATUSES.map(s => (
                <Chip key={s.id} active={f.status.includes(s.id)} color={s.color} bg={s.bg} onClick={() => toggle('status', s.id)}>{s.label}</Chip>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Urgency</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {window.PRIORITIES.map(p => (
                <Chip key={p.id} active={f.priority.includes(p.id)} color={p.color} bg={p.bg} onClick={() => toggle('priority', p.id)}>{p.short}</Chip>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {window.CATEGORIES.map(c => (
                <Chip key={c.id} active={f.category.includes(c.id)} color={c.color} bg={c.color + '18'} onClick={() => toggle('category', c.id)}>{c.icon} {c.short}</Chip>
              ))}
            </div>
          </div>

          {/* City + Workshop (admin) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>City</div>
              <select value={f.cityId || ''} onChange={e => set({ cityId: e.target.value || null, workshopId: null })} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', fontSize: 13 }}>
                <option value="">Any</option>
                {window.CITIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {user.role === 'admin' && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Workshop</div>
                <select value={f.workshopId || ''} onChange={e => set({ workshopId: e.target.value || null })} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', fontSize: 13 }}>
                  <option value="">Any</option>
                  {workshopsForCity.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Assignee or Raiser */}
          {user.role === 'admin' ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Assignee</div>
              <select value={f.assignee || ''} onChange={e => set({ assignee: e.target.value || null })} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', fontSize: 13 }}>
                <option value="">Any</option>
                <option value="__unassigned__">⚠ Unassigned</option>
                {pocs.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Raised by</div>
              <select value={f.raiser || ''} onChange={e => set({ raiser: e.target.value || null })} style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: 'white', fontSize: 13 }}>
                <option value="">Any</option>
                {technicians.map(t => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={reset} style={{ color: '#6B7280', fontSize: 13, fontWeight: 600, padding: '9px 14px' }}>Clear all</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: '#6B7280', fontSize: 13, fontWeight: 600, padding: '9px 14px' }}>Cancel</button>
          <button onClick={apply} style={{ background: '#111827', color: 'white', padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

function SortPopover({ current, onPick, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', background: 'white', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB', padding: 4, minWidth: 220, left: 'calc(50% - 110px)', top: 150 }}>
        {SORT_OPTIONS.map(o => (
          <button key={o.id} onClick={() => { onPick(o.id); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, textAlign: 'left', fontSize: 13, fontWeight: current === o.id ? 600 : 500, color: current === o.id ? '#111827' : '#374151', background: current === o.id ? '#F3F4F6' : 'transparent' }}>
            {current === o.id ? <Icon name="check" size={14} color="#16A34A" /> : <span style={{ width: 14 }} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function IssuesList({ user, issues, onOpenIssue }) {
  const [sortBy, setSortBy] = React.useState('updated_desc');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);

  const activeCount = countActive(filters);

  let visible = issues.filter(i => {
    if (user.role === 'manager' && i.workshop_id !== user.workshop_id) return false;
    if (filters.status.length && !filters.status.includes(i.status)) return false;
    if (filters.priority.length && !filters.priority.includes(i.priority)) return false;
    if (filters.category.length && !filters.category.includes(i.category)) return false;
    if (filters.cityId) {
      const ws = lookup(window.WORKSHOPS, i.workshop_id);
      if (!ws || ws.city_id !== filters.cityId) return false;
    }
    if (filters.workshopId && i.workshop_id !== filters.workshopId) return false;
    if (filters.assignee === '__unassigned__') { if (i.assigned_to) return false; }
    else if (filters.assignee && i.assigned_to !== filters.assignee) return false;
    if (filters.raiser && i.raised_by !== filters.raiser) return false;
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.issue_id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sortFn = (SORT_OPTIONS.find(o => o.id === sortBy) || SORT_OPTIONS[0]).sort;
  visible = [...visible].sort(sortFn);
  const sortLabel = (SORT_OPTIONS.find(o => o.id === sortBy) || SORT_OPTIONS[0]).label;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setSortOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          <Icon name="list" size={14} color="#6B7280" />
          Sort: <span style={{ color: '#111827' }}>{sortLabel}</span>
          <Icon name="chevronDown" size={14} color="#9CA3AF" />
        </button>
        <button onClick={() => setFilterOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: activeCount ? '#111827' : 'white', color: activeCount ? 'white' : '#374151', border: '1px solid ' + (activeCount ? '#111827' : '#E5E7EB'), borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>
          <Icon name="search" size={14} color={activeCount ? 'white' : '#6B7280'} />
          Filter
          {activeCount > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button onClick={() => setFilters(EMPTY_FILTERS)} style={{ color: '#6B7280', fontSize: 12, fontWeight: 600, padding: '9px 8px' }}>Clear all</button>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{visible.length} {visible.length === 1 ? 'issue' : 'issues'}</div>
      </div>

      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        {visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            {issues.length === 0 ? 'No issues yet.' : 'No issues match these filters.'}
          </div>
        ) : visible.map(i => <AdminIssueRow key={i.issue_id} issue={i} onClick={() => onOpenIssue(i.issue_id)} />)}
      </div>

      {sortOpen && <SortPopover current={sortBy} onPick={setSortBy} onClose={() => setSortOpen(false)} />}
      {filterOpen && <FilterModal user={user} filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)} />}
    </div>
  );
}

function DesktopIssueDetail({ issueData, user, onBack, onPatch, onComment, onReopen, refreshing }) {
  const { issue, comments, attachments } = issueData;
  const raiser = issueData.raiser || userFor(issue.raised_by);
  const assignee = issueData.assignee || (issue.assigned_to ? userFor(issue.assigned_to) : null);
  const [draft, setDraft] = React.useState('');
  const [internal, setInternal] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const pocs = Object.values(window.USERS_BY_ID).filter(u => u.role === 'poc');
  const cat = lookup(window.CATEGORIES, issue.category) || {};

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try { await onComment(issue.issue_id, draft.trim(), internal); setDraft(''); setInternal(false); }
    finally { setSending(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, padding: 24, alignItems: 'start' }}>
      <div style={{ minWidth: 0 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          <Icon name="chevronLeft" size={16} /> Back to issues
        </button>
        <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: '#6B7280', fontWeight: 600 }}>{issue.issue_id}</span>
            <StatusPill statusId={issue.status} size="sm" />
            <PriorityPill priorityId={issue.priority} size="sm" />
            <CategoryChip categoryId={issue.category} size="sm" />
            {refreshing && <span className="pulse" style={{ fontSize: 10, color: '#9CA3AF' }}>syncing…</span>}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginBottom: 12 }}>{issue.title}</div>
          {issue.description && <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{issue.description}</div>}

          {user.role === 'admin' && issue.ai_triage_note && (
            <div style={{ padding: 14, borderRadius: 12, background: '#F5F3FF', border: '1px solid #EDE9FE', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                <Icon name="sparkles" size={14} color="#7C3AED" /> AI triage (admin-only)
              </div>
              <div style={{ fontSize: 13, color: '#5B21B6', lineHeight: 1.5 }}>{issue.ai_triage_note}</div>
              {issue.duplicate_of && <div style={{ marginTop: 8, fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>Possible duplicate of {issue.duplicate_of}</div>}
            </div>
          )}

          {attachments && attachments.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Attachments · {attachments.length}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {attachments.map(a => (
                  <a key={a.attachment_id} href={a.drive_url} target="_blank" rel="noopener" style={{ background: '#F3F4F6', borderRadius: 10, padding: '10px 12px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Icon name="paperclip" size={14} color="#6B7280" />
                    <span style={{ color: '#374151', fontWeight: 500 }}>{a.file_name}</span>
                    <Icon name="external" size={12} color="#9CA3AF" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, margin: '8px 0 12px' }}>Conversation · {comments.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.map(c => {
              const author = userFor(c.commented_by);
              const isMine = c.commented_by === user.user_id;
              return (
                <div key={c.comment_id} style={{ display: 'flex', gap: 12, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                  <Avatar user={author} size={32} />
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textAlign: isMine ? 'right' : 'left' }}>
                      <span style={{ fontWeight: 600 }}>{isMine ? 'You' : author?.full_name || '—'}</span>
                      {' · '}{relTime(c.created_at)}
                      {c.is_ai_generated && <span style={{ background: '#F5F3FF', color: '#7C3AED', padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontSize: 10, fontWeight: 700 }}>AI</span>}
                      {c.is_internal && <span style={{ background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontSize: 10, fontWeight: 700 }}>INTERNAL</span>}
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 14, background: isMine ? '#111827' : (c.is_internal ? '#FFFBEB' : 'white'), color: isMine ? 'white' : '#111827', fontSize: 14, lineHeight: 1.5, boxShadow: isMine ? 'none' : '0 1px 2px rgba(0,0,0,0.04)', border: c.is_internal && !isMine ? '1px solid #FDE68A' : 'none' }}>{c.comment_text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, padding: 14, background: '#F9FAFB', borderRadius: 12 }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a reply…" rows={3} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'vertical', outline: 'none', background: 'white' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              {user.role === 'admin' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
                  <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> Internal only
                </label>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={send} disabled={!draft.trim() || sending} style={{ background: (draft.trim() && !sending) ? '#111827' : '#E5E7EB', color: (draft.trim() && !sending) ? 'white' : '#9CA3AF', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                {sending ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Status</div>
          <select value={issue.status} onChange={e => onPatch({ status: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'white' }}>
            {window.STATUSES.filter(s => s.id !== 'reopened').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {user.role === 'admin' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Assign to POC</div>
            {assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #E5E7EB', borderRadius: 10 }}>
                <Avatar user={assignee} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{assignee.full_name}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{lookup(window.DEPARTMENTS, assignee.department_id)?.label}</div>
                </div>
                <button onClick={() => onPatch({ assigned_to: null })} style={{ color: '#DC2626', fontSize: 11, fontWeight: 600 }}>Unassign</button>
              </div>
            ) : (
              <button onClick={() => setAssignOpen(v => !v)} style={{ width: '100%', padding: '10px 12px', border: '1px dashed #D1D5DB', borderRadius: 10, color: '#6B7280', fontSize: 13, fontWeight: 600 }}>
                Pick a POC
              </button>
            )}
            {assignOpen && !assignee && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pocs.map(p => (
                  <button key={p.user_id} onClick={() => { onPatch({ assigned_to: p.user_id, status: 'assigned' }); setAssignOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, textAlign: 'left' }}>
                    <Avatar user={p} size={26} />
                    <span style={{ fontSize: 13 }}>{p.full_name}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{lookup(window.DEPARTMENTS, p.department_id)?.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', fontSize: 12 }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Meta</div>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '90px 1fr', gap: '6px 10px', color: '#374151' }}>
            <dt style={{ color: '#9CA3AF' }}>Created</dt><dd style={{ margin: 0 }}>{relTime(issue.created_at)}</dd>
            <dt style={{ color: '#9CA3AF' }}>Updated</dt><dd style={{ margin: 0 }}>{relTime(issue.updated_at)}</dd>
            <dt style={{ color: '#9CA3AF' }}>Raiser</dt><dd style={{ margin: 0 }}>{raiser?.full_name}</dd>
            <dt style={{ color: '#9CA3AF' }}>Workshop</dt><dd style={{ margin: 0 }}>{lookup(window.WORKSHOPS, issue.workshop_id)?.label || '—'}</dd>
            <dt style={{ color: '#9CA3AF' }}>Dept</dt><dd style={{ margin: 0 }}>{lookup(window.DEPARTMENTS, issue.department_id)?.label || '—'}</dd>
          </dl>
        </div>

        {issue.status === 'resolved' && (
          <button onClick={() => onReopen(issue.issue_id)} style={{ background: 'white', border: '1.5px solid #DC2626', color: '#DC2626', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            Reopen issue
          </button>
        )}
      </aside>
    </div>
  );
}

Object.assign(window, { DesktopShell, Dashboard, IssuesList, DesktopIssueDetail, AdminIssueRow });
