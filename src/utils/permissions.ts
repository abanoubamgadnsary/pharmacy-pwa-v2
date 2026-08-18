export type UserRole = 'cashier' | 'manager';

export type Permission =
  | 'sales.create'
  | 'sales.print_receipt'
  | 'inventory.view'
  | 'restock.view'
  | 'restock.export'
  | 'drugs.view'
  | 'drugs.create'
  | 'drugs.edit'
  | 'drugs.delete'
  | 'reports.view'
  | 'reports.export'
  | 'sales.void'
  | 'data.export'
  | 'data.import'
  | 'data.clear'
  | 'users.manage';

const CASHIER_PERMISSIONS: Permission[] = [
  'sales.create',
  'sales.print_receipt',
];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === 'manager') return true;
  return CASHIER_PERMISSIONS.includes(permission);
}

/** Route paths a role may open (prefix match for nested routes). */
export function canAccessPath(role: UserRole, path: string): boolean {
  if (role === 'manager') return true;
  if (path === '/' || path === '') return true;
  return false;
}

export const PIN_MIN = 4;
export const PIN_MAX = 6;

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}
