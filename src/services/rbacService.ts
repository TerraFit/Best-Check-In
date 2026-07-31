// src/services/rbacService.ts
// Resolve Role → Permission Set → UI / API decisions

import {
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  TAB_REQUIRED_PERMISSION,
  type Permission,
  type StaffRole,
} from '../types/permissions';

export interface PermissionPrincipal {
  /** business | employee | super_admin */
  actorType?: 'business' | 'employee' | 'super_admin' | string;
  role?: string | null;
  /** Optional override JSON array of permission keys */
  permission_set?: string[] | Permission[] | null;
  active?: boolean | null;
}

export function normalizeRole(role: string | null | undefined): StaffRole {
  if (!role) return 'EmployeeOverview';
  if (role in ROLE_DEFAULT_PERMISSIONS) return role as StaffRole;
  // Common aliases
  const aliases: Record<string, StaffRole> = {
    owner: 'business_owner',
    business: 'business_owner',
    gm: 'general_manager',
    receptionist: 'front_desk',
    reception: 'front_desk',
    hk: 'housekeeper',
    housekeeping: 'housekeeper',
  };
  return aliases[role.toLowerCase()] || 'custom';
}

/** Resolve effective permission set for a principal */
export function resolvePermissions(principal: PermissionPrincipal): Set<Permission> {
  if (principal.active === false) return new Set();

  if (
    principal.actorType === 'super_admin' ||
    principal.role === 'super_admin'
  ) {
    return new Set(ALL_PERMISSIONS);
  }

  // Business owner sessions (dashboard login) always full access
  if (
    principal.actorType === 'business' ||
    principal.role === 'business_owner' ||
    principal.role === 'owner'
  ) {
    return new Set(ALL_PERMISSIONS);
  }

  const role = normalizeRole(principal.role);
  const base = new Set(ROLE_DEFAULT_PERMISSIONS[role] || []);

  // Custom / override permission_set replaces or extends
  if (principal.permission_set && Array.isArray(principal.permission_set)) {
    if (role === 'custom' || principal.permission_set.length > 0) {
      const custom = new Set<Permission>();
      for (const p of principal.permission_set) {
        if (ALL_PERMISSIONS.includes(p as Permission)) {
          custom.add(p as Permission);
        }
      }
      // custom role uses only permission_set; other roles merge overrides
      if (role === 'custom') return custom.size ? custom : base;
      for (const p of custom) base.add(p);
    }
  }

  return base;
}

export function hasPermission(
  principal: PermissionPrincipal,
  permission: Permission
): boolean {
  return resolvePermissions(principal).has(permission);
}

export function hasAnyPermission(
  principal: PermissionPrincipal,
  permissions: Permission[]
): boolean {
  const set = resolvePermissions(principal);
  return permissions.some((p) => set.has(p));
}

export function hasAllPermissions(
  principal: PermissionPrincipal,
  permissions: Permission[]
): boolean {
  const set = resolvePermissions(principal);
  return permissions.every((p) => set.has(p));
}

export function canAccessTab(
  principal: PermissionPrincipal,
  tabId: string
): boolean {
  const required = TAB_REQUIRED_PERMISSION[tabId];
  if (!required) return true;
  if (Array.isArray(required)) return hasAnyPermission(principal, required);
  return hasPermission(principal, required);
}

export function filterTabs<
  T extends { id: string; name: string }
>(principal: PermissionPrincipal, tabs: T[]): T[] {
  return tabs.filter((t) => canAccessTab(principal, t.id));
}

export function roleLabel(role: string | null | undefined): string {
  const r = normalizeRole(role);
  return ROLE_LABELS[r] || role || 'Staff';
}

/** Build owner principal for business dashboard sessions */
export function businessOwnerPrincipal(): PermissionPrincipal {
  return { actorType: 'business', role: 'business_owner', active: true };
}

/** Build principal from employee record */
export function employeePrincipal(emp: {
  role?: string | null;
  permission_set?: string[] | null;
  active?: boolean | null;
  status?: string | null;
}): PermissionPrincipal {
  const active =
    emp.active !== false &&
    (emp.status === undefined || emp.status === null || emp.status === 'Active');
  return {
    actorType: 'employee',
    role: emp.role,
    permission_set: emp.permission_set,
    active,
  };
}
