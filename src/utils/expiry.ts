import { Drug } from '../db';

export type ExpiryUrgency = 'expired' | 'critical' | 'warning' | 'ok';

export type ExpiryAlert = {
  drug: Drug;
  days: number;
  urgency: ExpiryUrgency;
};

/** Parse MM/YYYY or ISO expiry strings. Month-end is used for MM/YYYY. */
export function parseExpiryDate(value: string): Date | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();

  const mmYyyy = /^(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mmYyyy) {
    const month = parseInt(mmYyyy[1], 10);
    const year = parseInt(mmYyyy[2], 10);
    if (month < 1 || month > 12) return null;
    return new Date(year, month, 0);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysUntilExpiry(value: string, now = new Date()): number | null {
  const expiry = parseExpiryDate(value);
  if (!expiry) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryUrgency(days: number | null): ExpiryUrgency {
  if (days === null) return 'ok';
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

export function getExpiryAlerts(drugs: Drug[], withinDays = 30): ExpiryAlert[] {
  const now = new Date();
  return drugs
    .map((drug) => {
      const days = daysUntilExpiry(drug.expiryDate, now);
      const urgency = getExpiryUrgency(days);
      return days === null ? null : { drug, days, urgency };
    })
    .filter((item): item is ExpiryAlert => {
      if (!item) return false;
      return item.urgency === 'expired' || item.days <= withinDays;
    })
    .sort((a, b) => a.days - b.days);
}

export function formatExpiryDisplay(value: string): string {
  const parsed = parseExpiryDate(value);
  if (!parsed) return value;
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${mm}/${parsed.getFullYear()}`;
}
