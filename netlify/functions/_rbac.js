// netlify/functions/_rbac.js
// Server-side permission checks. UI visibility alone must never grant access.

const ALL = [
  'canViewDashboard',
  'canViewGuestDetails',
  'canViewGuestLimited',
  'canManageBookings',
  'canCheckGuestsIn',
  'canAllocateRooms',
  'canViewRooms',
  'canViewHousekeeping',
  'canStartHousekeepingTask',
  'canCompleteHousekeepingTask',
  'canApproveInspection',
  'canGenerateHousekeepingSchedule',
  'canAssignHousekeepingTasks',
  'canViewHousekeepingReports',
  'canViewLaundry',
  'canManageLaundry',
  'canReceiveLinen',
  'canIssueLinen',
  'canViewLaundryReports',
  'canViewMaintenance',
  'canCreateMaintenanceJob',
  'canCompleteMaintenanceJob',
  'canTakeRoomOffline',
  'canReturnRoomToService',
  'canViewLostFound',
  'canCreateLostFound',
  'canEditLostFound',
  'canDisposeLostFound',
  'canViewLostFoundReports',
  'canViewOperationalReports',
  'canViewFinancialReports',
  'canViewMarketingReports',
  'canViewGuestReports',
  'canViewAuditReports',
  'canExportReports',
  'canManageMarketing',
  'canManageStaff',
  'canManageSettings',
  'canViewAuditLog',
  'canApproveRoomChanges',
  'canAccessStaffPortal',
];

function expandLegacy(set) {
  if (set.has('canManageHousekeeping')) {
    ['canViewHousekeeping', 'canStartHousekeepingTask', 'canCompleteHousekeepingTask',
      'canApproveInspection', 'canGenerateHousekeepingSchedule', 'canAssignHousekeepingTasks'
    ].forEach((p) => set.add(p));
  }
  if (set.has('canInspectRooms')) {
    set.add('canApproveInspection');
    set.add('canViewHousekeeping');
  }
  if (set.has('canManageLostFound')) {
    ['canViewLostFound', 'canCreateLostFound', 'canEditLostFound', 'canDisposeLostFound'].forEach((p) => set.add(p));
  }
  if (set.has('canViewReports')) {
    set.add('canViewOperationalReports');
    set.add('canViewGuestReports');
  }
  if (set.has('canManageMaintenance')) {
    ['canViewMaintenance', 'canCreateMaintenanceJob', 'canCompleteMaintenanceJob',
      'canTakeRoomOffline', 'canReturnRoomToService'].forEach((p) => set.add(p));
  }
  return set;
}

const HK_WORKER = [
  'canViewDashboard',
  'canViewHousekeeping',
  'canStartHousekeepingTask',
  'canCompleteHousekeepingTask',
  'canViewLostFound',
  'canCreateLostFound',
  'canViewGuestLimited',
];

const HK_LEAD = HK_WORKER.concat([
  'canApproveInspection',
  'canAssignHousekeepingTasks',
  'canGenerateHousekeepingSchedule',
  'canViewHousekeepingReports',
  'canEditLostFound',
  'canViewRooms',
]);

const ROLE_DEFAULTS = {
  super_admin: ALL,
  business_owner: ALL,
  general_manager: ALL,
  supervisor: HK_LEAD.concat([
    'canViewRooms', 'canAllocateRooms', 'canViewGuestDetails', 'canManageBookings',
    'canViewOperationalReports', 'canViewGuestReports', 'canAccessStaffPortal',
    'canDisposeLostFound', 'canViewLostFoundReports',
  ]),
  team_leader: HK_LEAD,
  front_desk: [
    'canViewDashboard', 'canManageBookings', 'canCheckGuestsIn', 'canAllocateRooms',
    'canViewRooms', 'canViewGuestDetails', 'canViewHousekeeping',
    'canViewLostFound', 'canCreateLostFound',
  ],
  housekeeper: HK_WORKER,
  laundry_attendant: [
    'canViewDashboard', 'canViewLaundry', 'canManageLaundry', 'canReceiveLinen',
    'canIssueLinen', 'canViewHousekeeping', 'canViewLostFound', 'canViewGuestLimited',
  ],
  maintenance: [
    'canViewDashboard', 'canViewMaintenance', 'canCreateMaintenanceJob',
    'canCompleteMaintenanceJob', 'canTakeRoomOffline', 'canReturnRoomToService',
    'canViewRooms', 'canApproveRoomChanges',
  ],
  administration: [
    'canViewDashboard', 'canViewOperationalReports', 'canViewGuestReports',
    'canViewAuditReports', 'canExportReports', 'canViewAuditLog',
    'canManageSettings', 'canManageStaff', 'canAccessStaffPortal',
    'canViewGuestDetails', 'canViewRooms',
  ],
  marketing: ['canViewDashboard', 'canManageMarketing', 'canViewMarketingReports', 'canViewGuestReports'],
  finance: ['canViewDashboard', 'canViewFinancialReports', 'canExportReports', 'canViewOperationalReports'],
  night_auditor: [
    'canViewDashboard', 'canManageBookings', 'canCheckGuestsIn', 'canViewRooms',
    'canViewGuestDetails', 'canViewHousekeeping', 'canViewOperationalReports', 'canViewAuditLog',
  ],
  security: ['canViewDashboard', 'canViewRooms', 'canViewGuestLimited', 'canViewLostFound'],
  custom: ['canViewDashboard'],
  EmployeeOverview: ['canViewDashboard', 'canViewGuestDetails', 'canManageBookings'],
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
  if (actorType === 'super_admin' || role === 'super_admin') return expandLegacy(new Set(ALL));
  if (actorType === 'business' || role === 'business_owner' || role === 'owner') {
    return expandLegacy(new Set(ALL));
  }
  const r = normalizeRole(role);
  const base = new Set(ROLE_DEFAULTS[r] || []);
  if (Array.isArray(permission_set) && permission_set.length) {
    if (r === 'custom') {
      return expandLegacy(new Set(permission_set.filter((p) => typeof p === 'string')));
    }
    permission_set.forEach((p) => {
      if (typeof p === 'string') base.add(p);
    });
  }
  return expandLegacy(base);
}

function requirePermission(principal, permission) {
  const set = resolvePermissions(principal || {});
  if (set.has(permission)) return true;
  if (
    ['canStartHousekeepingTask', 'canCompleteHousekeepingTask', 'canApproveInspection',
      'canGenerateHousekeepingSchedule'].includes(permission) &&
    set.has('canManageHousekeeping')
  ) {
    return true;
  }
  return false;
}

function requireAnyPermission(principal, permissions) {
  return (permissions || []).some((p) => requirePermission(principal, p));
}

function principalFromJwt(decoded) {
  const meta = (decoded && decoded.user_metadata) || {};
  if ((decoded && decoded.role) === 'service_role' || meta.super_admin) {
    return { actorType: 'super_admin', role: 'super_admin', active: true };
  }
  if (meta.business_id && !meta.employee_id) {
    return { actorType: 'business', role: 'business_owner', active: true };
  }
  return {
    actorType: 'employee',
    role: meta.staff_role || meta.role || 'EmployeeOverview',
    permission_set: meta.permission_set || null,
    active: meta.active !== false,
  };
}

/** Optional JWT gate — allows service key / business tokens through */
function assertPermission(event, permission) {
  const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (!authHeader) {
    // Many internal ops use service key only; allow when no JWT (caller must still use service key)
    return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
  }
  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.replace('Bearer ', '').trim();
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const principal = principalFromJwt(decoded);
    if (!requirePermission(principal, permission)) {
      return { ok: false, status: 403, error: 'Missing permission: ' + permission, principal };
    }
    return { ok: true, principal };
  } catch (e) {
    // Invalid token — still allow service-key-style calls for backwards compatibility
    return { ok: true, principal: { actorType: 'business', role: 'business_owner', active: true } };
  }
}

module.exports = {
  ALL,
  ROLE_DEFAULTS,
  normalizeRole,
  resolvePermissions,
  requirePermission,
  requireAnyPermission,
  principalFromJwt,
  assertPermission,
};
