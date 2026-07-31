// netlify/functions/_rbac.js
// Server-side permission checks. UI visibility alone must never grant access.

const ALL = [
  'canViewDashboard',
  'canManageBookings',
  'canCheckGuestsIn',
  'canAllocateRooms',
  'canViewHousekeeping',
  'canManageHousekeeping',
  'canInspectRooms',
  'canAssignHousekeepingTasks',
  'canManageLaundry',
  'canManageMaintenance',
  'canViewReports',
  'canExportReports',
  'canManageMarketing',
  'canManageStaff',
  'canManageSettings',
  'canViewAuditLog',
  'canApproveRoomChanges',
  'canManageLostFound',
  'canViewGuestDetails',
  'canViewGuestLimited',
  'canAccessStaffPortal',
];

const ROLE_DEFAULTS = {
  super_admin: ALL,
  business_owner: ALL,
  general_manager: ALL,
  front_desk: [
    'canViewDashboard',
    'canManageBookings',
    'canCheckGuestsIn',
    'canAllocateRooms',
    'canViewGuestDetails',
    'canViewHousekeeping',
  ],
  team_leader: [
    'canViewDashboard',
    'canViewHousekeeping',
    'canManageHousekeeping',
    'canInspectRooms',
    'canAssignHousekeepingTasks',
    'canManageLostFound',
    'canViewGuestLimited',
  ],
  housekeeper: [
    'canViewDashboard',
    'canViewHousekeeping',
    'canManageLostFound',
    'canViewGuestLimited',
  ],
  laundry_attendant: [
    'canViewDashboard',
    'canManageLaundry',
    'canViewHousekeeping',
    'canViewGuestLimited',
  ],
  maintenance: [
    'canViewDashboard',
    'canManageMaintenance',
    'canApproveRoomChanges',
  ],
  administration: [
    'canViewDashboard',
    'canViewReports',
    'canExportReports',
    'canViewAuditLog',
    'canManageSettings',
    'canManageStaff',
    'canAccessStaffPortal',
    'canViewGuestDetails',
  ],
  marketing: ['canViewDashboard', 'canManageMarketing'],
  finance: ['canViewDashboard', 'canViewReports', 'canExportReports'],
  custom: ['canViewDashboard'],
  EmployeeOverview: [
    'canViewDashboard',
    'canViewGuestDetails',
    'canManageBookings',
  ],
};

function normalizeRole(role) {
  if (!role) return 'EmployeeOverview';
  if (ROLE_DEFAULTS[role]) return role;
  const aliases = {
    owner: 'business_owner',
    business: 'business_owner',
    gm: 'general_manager',
    receptionist: 'front_desk',
    reception: 'front_desk',
    hk: 'housekeeper',
    housekeeping: 'housekeeper',
  };
  return aliases[String(role).toLowerCase()] || 'custom';
}

function resolvePermissions({ actorType, role, permission_set, active }) {
  if (active === false) return new Set();
  if (actorType === 'super_admin' || role === 'super_admin') return new Set(ALL);
  if (actorType === 'business' || role === 'business_owner' || role === 'owner') {
    return new Set(ALL);
  }
  const r = normalizeRole(role);
  const base = new Set(ROLE_DEFAULTS[r] || []);
  if (Array.isArray(permission_set) && permission_set.length) {
    if (r === 'custom') return new Set(permission_set.filter((p) => ALL.includes(p)));
    permission_set.forEach((p) => {
      if (ALL.includes(p)) base.add(p);
    });
  }
  return base;
}

function requirePermission(principal, permission) {
  const set = resolvePermissions(principal || {});
  return set.has(permission);
}

/** Build principal from JWT payload used by manage-employees etc. */
function principalFromJwt(decoded) {
  const meta = decoded.user_metadata || {};
  if (decoded.role === 'service_role' || meta.super_admin) {
    return { actorType: 'super_admin', role: 'super_admin', active: true };
  }
  if (meta.business_id && !meta.employee_id) {
    return { actorType: 'business', role: 'business_owner', active: true };
  }
  return {
    actorType: 'employee',
    role: meta.role || meta.staff_role || 'EmployeeOverview',
    permission_set: meta.permission_set || null,
    active: meta.active !== false,
  };
}

module.exports = {
  ALL,
  ROLE_DEFAULTS,
  normalizeRole,
  resolvePermissions,
  requirePermission,
  principalFromJwt,
};
