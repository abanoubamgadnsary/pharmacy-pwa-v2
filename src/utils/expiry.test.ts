import { describe, expect, it } from 'vitest';
import {
  daysUntilExpiry,
  formatExpiryDisplay,
  getExpiryAlerts,
  getExpiryUrgency,
  parseExpiryDate,
} from './expiry';
import { Drug } from '../db';

const drug = (expiryDate: string, overrides: Partial<Drug> = {}): Drug => ({
  id: 'test-id',
  barcode: '123',
  name: 'Test Drug',
  activeIngredient: 'Test',
  company: 'Test Co',
  price: 10,
  stock: 5,
  expiryDate,
  createdAt: new Date(),
  ...overrides,
});

describe('parseExpiryDate', () => {
  it('parses MM/YYYY as end of month', () => {
    const parsed = parseExpiryDate('08/2026');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(7);
    expect(parsed?.getDate()).toBe(31);
  });

  it('parses ISO dates', () => {
    const parsed = parseExpiryDate('2026-12-15');
    expect(parsed?.getFullYear()).toBe(2026);
  });
});

describe('getExpiryAlerts', () => {
  it('includes expired and soon-to-expire drugs sorted by urgency', () => {
    const drugs = [
      drug('12/2027'),
      drug('08/2026'),
      drug('07/2026'),
    ];

    const alerts = getExpiryAlerts(drugs, 30);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].urgency).toBe('expired');
    expect(alerts[1].urgency).toBe('warning');
  });
});

describe('getExpiryUrgency', () => {
  it('classifies days correctly', () => {
    expect(getExpiryUrgency(-1)).toBe('expired');
    expect(getExpiryUrgency(5)).toBe('critical');
    expect(getExpiryUrgency(20)).toBe('warning');
    expect(getExpiryUrgency(60)).toBe('ok');
  });
});

describe('formatExpiryDisplay', () => {
  it('formats parsed dates as MM/YYYY', () => {
    expect(formatExpiryDisplay('08/2026')).toBe('08/2026');
  });
});

describe('daysUntilExpiry', () => {
  it('returns negative days for expired drugs', () => {
    const days = daysUntilExpiry('07/2026', new Date('2026-08-13'));
    expect(days).not.toBeNull();
    expect(days!).toBeLessThan(0);
  });
});
