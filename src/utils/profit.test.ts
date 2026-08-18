import { describe, it, expect } from 'vitest';
import type { Drug, Sale } from '../db';
import {
  computeProfitByDrug,
  computeProfitSummary,
  resolveUnitCost,
  saleHasCostData,
} from './profit';

const drugs: Drug[] = [
  {
    id: 'd1',
    barcode: '111',
    name: 'Drug A',
    activeIngredient: 'X',
    company: 'Co',
    price: 30,
    costPrice: 20,
    stock: 50,
    expiryDate: '2027-01-01',
    createdAt: new Date(),
  },
  {
    id: 'd2',
    barcode: '222',
    name: 'Drug B',
    activeIngredient: 'Y',
    company: 'Co',
    price: 15,
    stock: 10,
    expiryDate: '2027-01-01',
    createdAt: new Date(),
  },
];

const saleWithSnapshot: Sale = {
  id: 's1',
  drugId: 'd1',
  drugName: 'Drug A',
  quantity: 2,
  unitPrice: 30,
  unitCost: 20,
  totalPrice: 60,
  soldAt: new Date(),
};

const saleLegacy: Sale = {
  id: 's2',
  drugId: 'd1',
  drugName: 'Drug A',
  quantity: 1,
  unitPrice: 30,
  totalPrice: 30,
  soldAt: new Date(),
};

describe('resolveUnitCost', () => {
  it('uses sale snapshot when present', () => {
    const map = new Map([['d1', 5]]);
    expect(resolveUnitCost(saleWithSnapshot, map)).toBe(20);
  });

  it('falls back to drug cost when snapshot missing', () => {
    const map = new Map([['d1', 18]]);
    expect(resolveUnitCost(saleLegacy, map)).toBe(18);
  });
});

describe('computeProfitSummary', () => {
  it('calculates revenue, cost, profit and margin', () => {
    const summary = computeProfitSummary([saleWithSnapshot, saleLegacy], drugs);
    expect(summary.revenue).toBe(90);
    expect(summary.cost).toBe(60);
    expect(summary.profit).toBe(30);
    expect(summary.marginPct).toBeCloseTo(33.33, 1);
    expect(summary.saleCount).toBe(2);
  });

  it('counts sales missing cost data', () => {
    const noCostSale: Sale = {
      id: 's3',
      drugId: 'd2',
      drugName: 'Drug B',
      quantity: 1,
      unitPrice: 15,
      totalPrice: 15,
      soldAt: new Date(),
    };
    const summary = computeProfitSummary([noCostSale], drugs);
    expect(summary.missingCostCount).toBe(1);
    expect(summary.cost).toBe(0);
    expect(summary.profit).toBe(15);
  });
});

describe('computeProfitByDrug', () => {
  it('aggregates profit per drug', () => {
    const lines = computeProfitByDrug([saleWithSnapshot, saleLegacy], drugs);
    expect(lines).toHaveLength(1);
    expect(lines[0].drugName).toBe('Drug A');
    expect(lines[0].qty).toBe(3);
    expect(lines[0].profit).toBe(30);
  });
});

describe('saleHasCostData', () => {
  it('detects missing cost', () => {
    const map = new Map([['d2', 0]]);
    expect(saleHasCostData(saleWithSnapshot, map)).toBe(true);
    expect(saleHasCostData(saleLegacy, new Map([['d1', 20]]))).toBe(true);
    expect(saleHasCostData(saleLegacy, new Map([['d1', 0]]))).toBe(false);
  });
});
