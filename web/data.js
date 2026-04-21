// Static enum values that don't come from the sheet.
// Cities, departments, workshops come from /webhook/lookups at runtime.

window.CATEGORIES = [
  { id: 'bug',      label: 'Something is broken',    short: 'Bug',      icon: '🛠️', color: '#DC2626' },
  { id: 'question', label: 'I have a question',      short: 'Question', icon: '❓', color: '#2563EB' },
  { id: 'process',  label: 'Process is unclear',     short: 'Process',  icon: '📋', color: '#9333EA' },
  { id: 'tool',     label: 'Tool / hardware issue',  short: 'Tool',     icon: '🔧', color: '#EA580C' },
  { id: 'other',    label: 'Something else',         short: 'Other',    icon: '💬', color: '#475569' },
];

window.PRIORITIES = [
  { id: 'p0', label: 'Urgent — work is stopped',   short: 'Urgent', color: '#DC2626', bg: '#FEE2E2' },
  { id: 'p1', label: 'High — blocking me soon',    short: 'High',   color: '#EA580C', bg: '#FFEDD5' },
  { id: 'p2', label: 'Normal — can wait a bit',    short: 'Normal', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'p3', label: 'Low — just asking',          short: 'Low',    color: '#475569', bg: '#E2E8F0' },
];

window.STATUSES = [
  { id: 'open',        label: 'Open',        color: '#2563EB', bg: '#DBEAFE', dot: '#2563EB' },
  { id: 'assigned',    label: 'Assigned',    color: '#9333EA', bg: '#F3E8FF', dot: '#9333EA' },
  { id: 'in_progress', label: 'In Progress', color: '#EA580C', bg: '#FFEDD5', dot: '#EA580C' },
  { id: 'resolved',    label: 'Resolved',    color: '#16A34A', bg: '#DCFCE7', dot: '#16A34A' },
  { id: 'reopened',    label: 'Reopened',    color: '#DC2626', bg: '#FEE2E2', dot: '#DC2626' },
];

window.ROLES = [
  { id: 'workshop', label: 'Technician',        desc: 'Raises tickets from the floor.' },
  { id: 'manager',  label: 'Workshop Manager',  desc: 'Oversees their branch.' },
  { id: 'poc',      label: 'Central POC',       desc: 'Subject-matter expert (per department).' },
  { id: 'admin',    label: 'Central Admin',     desc: 'Triages and assigns globally.' },
];

// Filled by /webhook/lookups at runtime. Initial empty to avoid undefined errors.
window.CITIES      = [];
window.DEPARTMENTS = [];
window.WORKSHOPS   = [];
window.USERS_BY_ID = {};
