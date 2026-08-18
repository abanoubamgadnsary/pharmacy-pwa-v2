import { describe, expect, it } from 'vitest';
import { ensureStringId, generateId } from './id';

describe('id utils', () => {
  it('generateId returns a UUID string', () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('ensureStringId keeps a non-empty trimmed string', () => {
    expect(ensureStringId('  abc-123  ')).toBe('abc-123');
  });

  it('ensureStringId generates a UUID for empty or invalid values', () => {
    expect(ensureStringId('')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(ensureStringId('   ')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(ensureStringId(42)).toMatch(/^[0-9a-f-]{36}$/i);
    expect(ensureStringId(null)).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
