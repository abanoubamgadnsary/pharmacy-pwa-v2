export const generateId = (): string => crypto.randomUUID();

/** Normalize legacy numeric or string IDs to a non-empty UUID string. */
export const ensureStringId = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return generateId();
};
