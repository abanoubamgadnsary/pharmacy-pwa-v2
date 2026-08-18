import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canAccessPath,
  isValidPin,
  PIN_MIN,
  PIN_MAX,
} from './permissions';

describe('hasPermission', () => {
  it('manager has all permissions', () => {
    expect(hasPermission('manager', 'sales.create')).toBe(true);
    expect(hasPermission('manager', 'users.manage')).toBe(true);
    expect(hasPermission('manager', 'sales.void')).toBe(true);
  });

  it('cashier only has sales permissions', () => {
    expect(hasPermission('cashier', 'sales.create')).toBe(true);
    expect(hasPermission('cashier', 'sales.print_receipt')).toBe(true);
    expect(hasPermission('cashier', 'reports.view')).toBe(false);
    expect(hasPermission('cashier', 'drugs.create')).toBe(false);
    expect(hasPermission('cashier', 'users.manage')).toBe(false);
  });
});

describe('canAccessPath', () => {
  it('cashier can only access sales route', () => {
    expect(canAccessPath('cashier', '/')).toBe(true);
    expect(canAccessPath('cashier', '/reports')).toBe(false);
    expect(canAccessPath('cashier', '/management')).toBe(false);
    expect(canAccessPath('cashier', '/inventory')).toBe(false);
  });

  it('manager can access all routes', () => {
    expect(canAccessPath('manager', '/')).toBe(true);
    expect(canAccessPath('manager', '/reports')).toBe(true);
    expect(canAccessPath('manager', '/management/edit/abc')).toBe(true);
  });
});

describe('isValidPin', () => {
  it('accepts 4–6 digit PINs', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
  });

  it('rejects invalid PINs', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12ab')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });

  it('exports PIN bounds', () => {
    expect(PIN_MIN).toBe(4);
    expect(PIN_MAX).toBe(6);
  });
});
