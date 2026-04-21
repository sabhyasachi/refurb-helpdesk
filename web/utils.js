// Shared view primitives. Depends on React (globals) and data.js.

const lookup = (arr, id) => (arr || []).find(x => x.id === id);

function relTime(ts) {
  const t = typeof ts === 'string' ? Date.parse(ts) : ts;
  if (!t) return '';
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd} day${dd > 1 ? 's' : ''} ago`;
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function userFor(id) { return window.USERS_BY_ID[id] || null; }

function Avatar({ user, size = 32, ring = false }) {
  const u = user || {};
  const placeholder = !user;
  return React.createElement('div', {
    style: {
      width: size, height: size, borderRadius: '50%',
      background: placeholder ? '#E5E7EB' : (u.color || '#6B7280'),
      color: placeholder ? '#9CA3AF' : 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600,
      border: ring ? '2px solid white' : 'none', flexShrink: 0,
      boxShadow: ring ? '0 0 0 1px rgba(0,0,0,0.05)' : 'none',
    }
  }, placeholder ? '?' : (u.initials || ''));
}

function StatusPill({ statusId, size = 'md' }) {
  const s = lookup(window.STATUSES, statusId);
  if (!s) return null;
  const pad = size === 'sm' ? '2px 8px' : '4px 10px';
  const fs  = size === 'sm' ? 11 : 12;
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: s.bg, color: s.color, padding: pad, borderRadius: 999,
      fontSize: fs, fontWeight: 600, letterSpacing: 0.1, whiteSpace: 'nowrap',
    }
  },
    React.createElement('span', { style: { width: 6, height: 6, borderRadius: '50%', background: s.dot } }),
    s.label
  );
}

function PriorityPill({ priorityId, size = 'md' }) {
  const p = lookup(window.PRIORITIES, priorityId);
  if (!p) return null;
  const pad = size === 'sm' ? '2px 8px' : '4px 10px';
  const fs  = size === 'sm' ? 11 : 12;
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: p.bg, color: p.color, padding: pad, borderRadius: 6,
      fontSize: fs, fontWeight: 600, whiteSpace: 'nowrap',
    }
  }, p.short);
}

function CategoryChip({ categoryId, size = 'md' }) {
  const c = lookup(window.CATEGORIES, categoryId);
  if (!c) return null;
  const pad = size === 'sm' ? '2px 6px' : '4px 10px';
  const fs  = size === 'sm' ? 11 : 12;
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#F3F4F6', color: '#374151', padding: pad, borderRadius: 6,
      fontSize: fs, fontWeight: 500, whiteSpace: 'nowrap',
    }
  },
    React.createElement('span', { style: { fontSize: fs } }, c.icon),
    c.short
  );
}

const Icon = ({ name, size = 20, color = 'currentColor', strokeWidth = 2 }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="M20 6L9 17l-5-5"/>,
    chevronRight: <path d="M9 18l6-6-6-6"/>,
    chevronLeft:  <path d="M15 18l-6-6 6-6"/>,
    chevronDown:  <path d="M6 9l6 6 6-6"/>,
    x: <path d="M18 6L6 18M6 6l12 12"/>,
    search: <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    paperclip: <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>,
    camera: <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
    mic: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></>,
    alert: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></>,
    inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>,
    external: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>,
    sparkles: <><path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
};

// Expose to global scope for Babel-in-browser setup.
Object.assign(window, { lookup, relTime, userFor, Avatar, StatusPill, PriorityPill, CategoryChip, Icon });
