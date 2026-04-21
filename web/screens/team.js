// Team directory + Add/Edit user dialog. Admin-only.

const USERNAME_RE = /^[a-z0-9._-]{2,}$/;

function TeamDirectory({ users, issues, onAdd, onEdit }) {
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [cityId, setCityId] = React.useState(null);
  const [deptId, setDeptId] = React.useState(null);

  const active = users.filter(u => u.is_active !== false && u.role !== 'bot');
  const counts = {
    all: active.length,
    poc: active.filter(u => u.role === 'poc').length,
    manager: active.filter(u => u.role === 'manager').length,
    workshop: active.filter(u => u.role === 'workshop').length,
    admin: active.filter(u => u.role === 'admin').length,
  };

  const visible = active.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!u.full_name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
    }
    if (cityId) {
      const ws = lookup(window.WORKSHOPS, u.workshop_id);
      if (!ws || ws.city_id !== cityId) return false;
    }
    if (deptId && u.department_id !== deptId) return false;
    return true;
  });

  const filters = [
    { id: 'all',      label: 'All',         count: counts.all },
    { id: 'poc',      label: 'POCs',        count: counts.poc },
    { id: 'manager',  label: 'Managers',    count: counts.manager },
    { id: 'workshop', label: 'Technicians', count: counts.workshop },
    { id: 'admin',    label: 'Admins',      count: counts.admin },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }} />
        <button onClick={onAdd} style={{ background: '#111827', color: 'white', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={14} color="white" strokeWidth={2.5} /> Add user
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setRoleFilter(f.id)} style={{ background: roleFilter === f.id ? '#111827' : 'white', color: roleFilter === f.id ? 'white' : '#374151', padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1px solid #E5E7EB' }}>
            {f.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{f.count}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or username…" style={{ flex: '1 1 220px', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'white' }} />
        <FilterSelect label="City"       value={cityId} onChange={setCityId} options={window.CITIES} />
        <FilterSelect label="Department" value={deptId} onChange={setDeptId} options={window.DEPARTMENTS} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {visible.map(u => {
          const userIssues = issues.filter(i => i.assigned_to === u.user_id);
          const activeCount = userIssues.filter(i => i.status !== 'resolved').length;
          const resolvedCount = userIssues.filter(i => i.status === 'resolved').length;
          const ws = lookup(window.WORKSHOPS, u.workshop_id);
          const dept = lookup(window.DEPARTMENTS, u.department_id);
          const role = lookup(window.ROLES, u.role);
          return (
            <div key={u.user_id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                <Avatar user={u} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{u.full_name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{role?.label || u.role}{ws ? ` · ${ws.short_name || ws.label}` : ''}</div>
                  {dept && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{dept.label}</div>}
                </div>
                <button onClick={() => onEdit(u)} title="Edit" style={{ color: '#9CA3AF', padding: 6 }}>
                  <Icon name="edit" size={14} />
                </button>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F3F4F6', padding: '4px 10px', borderRadius: 6, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
                <Icon name="user" size={11} color="#9CA3AF" /> {u.username}
              </div>
              {(u.role === 'poc' || u.role === 'manager') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{activeCount}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Active</div>
                  </div>
                  <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{resolvedCount}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Resolved</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function slugifyName(full) {
  const parts = full.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]}.${parts[parts.length - 1][0]}`;
}

function UserDialog({ mode, initial, existing, onClose, onSave, onDelete }) {
  const [form, setForm] = React.useState({
    full_name:     initial?.full_name     || '',
    username:      initial?.username      || '',
    password:      initial?.password      || '',
    role:          initial?.role          || 'workshop',
    workshop_id:   initial?.workshop_id   || '',
    department_id: initial?.department_id || '',
  });
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (mode === 'add' && !form.username && form.full_name.trim().split(/\s+/).length >= 2) {
      setForm(f => ({ ...f, username: slugifyName(f.full_name) }));
    }
  }, [form.full_name]);

  const roleNeedsDept = form.role === 'workshop' || form.role === 'poc';
  const roleNeedsWs   = form.role === 'workshop' || form.role === 'manager';

  const save = async () => {
    setError('');
    if (form.full_name.trim().length < 2) return setError('Full name is required');
    if (!USERNAME_RE.test(form.username))  return setError('Username must be lowercase, ≥2 chars, only letters/digits/._-');
    const dupe = existing.find(u => u.username === form.username && u.user_id !== initial?.user_id);
    if (dupe) return setError('That username is taken');
    if (roleNeedsWs && !form.workshop_id) return setError('Pick a workshop');
    if (roleNeedsDept && !form.department_id) return setError('Pick a department');

    setBusy(true);
    try {
      await onSave({
        ...form,
        workshop_id:   roleNeedsWs   ? form.workshop_id   : null,
        department_id: roleNeedsDept ? form.department_id : null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px, calc(100vw - 32px))', background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{mode === 'add' ? 'Add user' : 'Edit user'}</div>
          <button onClick={onClose}><Icon name="x" size={18} color="#6B7280" /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Full name">
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={inputStyle} autoFocus />
          </Field>
          <Field label="User ID (username)" hint="lowercase, letters/digits/._-">
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} />
          </Field>
          <Field label="Password" hint="optional, scaffold for v2 — not checked at login today">
            <input type="text" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Role">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {window.ROLES.map(r => (
                <button key={r.id} onClick={() => setForm(f => ({ ...f, role: r.id }))} style={{ textAlign: 'left', padding: 10, border: form.role === r.id ? '2px solid #111827' : '1.5px solid #E5E7EB', borderRadius: 10, background: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </Field>
          {roleNeedsWs && (
            <Field label="Workshop">
              <select value={form.workshop_id || ''} onChange={e => setForm(f => ({ ...f, workshop_id: e.target.value || null }))} style={inputStyle}>
                <option value="">Pick a workshop…</option>
                {window.WORKSHOPS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
              </select>
            </Field>
          )}
          {roleNeedsDept && (
            <Field label="Department">
              <select value={form.department_id || ''} onChange={e => setForm(f => ({ ...f, department_id: e.target.value || null }))} style={inputStyle}>
                <option value="">Pick a department…</option>
                {window.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </Field>
          )}
          {error && <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 8, alignItems: 'center' }}>
          {mode === 'edit' && onDelete && !['u_neha', 'u_rajesh', 'u_vikram'].includes(initial?.user_id) && (
            <button onClick={() => { if (confirm(`Remove ${initial.full_name}?`)) onDelete(initial.user_id); }} style={{ color: '#DC2626', fontSize: 13, fontWeight: 600 }}>Remove</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: '#6B7280', fontSize: 13, fontWeight: 600, padding: '8px 14px' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ background: busy ? '#374151' : '#111827', color: 'white', padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', background: 'white' };

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

Object.assign(window, { TeamDirectory, UserDialog });
