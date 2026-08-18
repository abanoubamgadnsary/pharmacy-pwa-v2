import { describe, it, expect } from 'vitest';
import type { Drug } from '../db';
import {
  getStripPrice,
  getStripsPerBox,
  maxSellQty,
  maxBoxesGivenStrips,
  maxStripsGivenBoxes,
  splitStock,
  stripsToDeduct,
  totalStripsRequested,
} from './units';

const drug: Drug = {
  id: '1',
  barcode: '123',
  name: 'Test',
  activeIngredient: 'X',
  company: 'Co',
  price: 100,
  costPrice: 60,
  stripsPerBox: 10,
  stock: 25,
  expiryDate: '2027-01-01',
  createdAt: new Date(),
};

describe('units', () => {
  it('calculates strip price from box price', () => {
    expect(getStripPrice(drug)).toBe(10);
  });

  it('deducts strips correctly for box and strip sales', () => {
    expect(stripsToDeduct(2, 'box', drug)).toBe(20);
    expect(stripsToDeduct(3, 'strip', drug)).toBe(3);
  });

  it('computes max sell qty per unit', () => {
    expect(maxSellQty(drug, 'strip')).toBe(25);
    expect(maxSellQty(drug, 'box')).toBe(2);
  });

  it('defaults stripsPerBox to 1', () => {
    expect(getStripsPerBox({ ...drug, stripsPerBox: undefined })).toBe(1);
  });

  it('splits stock into boxes and strips', () => {
    expect(splitStock(drug)).toEqual({ boxes: 2, strips: 5 });
  });

  it('limits dual qty by total strips in stock', () => {
    expect(maxBoxesGivenStrips(drug, 3)).toBe(2);
    expect(maxStripsGivenBoxes(drug, 2)).toBe(5);
    expect(totalStripsRequested(2, 3, drug)).toBe(23);
  });
});
