import { describe, expect, it } from 'vitest';
import { getReorderLines, suggestedReorderQty } from './restock';
import { Drug } from '../db';

const drug = (stock: number): Drug => ({
  id: `id-${stock}`,
  barcode: '123',
  name: 'Test',
  activeIngredient: 'X',
  company: 'Co',
  price: 10,
  stock,
  expiryDate: '12/2027',
  createdAt: new Date(),
});

describe('suggestedReorderQty', () => {
  it('suggests target stock for out-of-stock items', () => {
    expect(suggestedReorderQty(0, 10, 30)).toBe(30);
  });

  it('suggests enough to reach target', () => {
    expect(suggestedReorderQty(8, 10, 30)).toBe(22);
  });

  it('suggests at least threshold units', () => {
    expect(suggestedReorderQty(25, 10, 30)).toBe(10);
  });
});

describe('getReorderLines', () => {
  it('returns only drugs at or below threshold sorted by stock', () => {
    const lines = getReorderLines([drug(20), drug(3), drug(0), drug(10)], 10);
    expect(lines.map((l) => l.currentStock)).toEqual([0, 3, 10]);
  });
});
