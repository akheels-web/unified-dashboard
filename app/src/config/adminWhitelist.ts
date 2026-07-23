// Single source of truth for the IT admin whitelist.
// Used by the Reports "Admin Audit" tab and the dashboard "Recent Activity" feed
// so both show only activity from these accounts (Issue 6, Option A).
export const ADMIN_WHITELIST = [
  { upn: 'mohammed.akheel@lxt.ai',     name: 'Mohammed Akheel',     initials: 'MA', color: '#6366f1' },
  { upn: 'ibrahim.aly@lxt.ai',         name: 'Ibrahim Aly',         initials: 'IA', color: '#0ea5e9' },
  { upn: 'dilawar.amin@lxt.ai',        name: 'Dilawar Amin',        initials: 'DA', color: '#10b981' },
  { upn: 'youssef.ragab@lxt.ai',       name: 'Youssef Ragab',       initials: 'YR', color: '#f59e0b' },
  { upn: 'absal.abdulhafedh@lxt.ai',   name: 'Absal Abdulhafedh',   initials: 'AA', color: '#ef4444' },
  { upn: 'muhammad.hamdi@lxt.ai',      name: 'Muhammad Hamdi',      initials: 'MH', color: '#8b5cf6' },
  { upn: 'nada.elrayes@lxt.ai',        name: 'Nada El-Rayes',       initials: 'NE', color: '#ec4899' },
  { upn: 'ahmed.amin@lxt.ai',          name: 'Ahmed Amin',          initials: 'AH', color: '#14b8a6' },
];

export const ADMIN_UPN_SET = new Set(ADMIN_WHITELIST.map(a => a.upn.toLowerCase()));

// True if an audit log entry belongs to a whitelisted admin.
// Matches on userPrincipalName when present, else falls back to first-name match on display name.
export const isAdminLog = (log: { userPrincipalName?: string; user?: string }): boolean => {
  const upn = (log.userPrincipalName || '').toLowerCase();
  if (upn) return ADMIN_UPN_SET.has(upn);
  return ADMIN_WHITELIST.some(a => log.user?.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]));
};
