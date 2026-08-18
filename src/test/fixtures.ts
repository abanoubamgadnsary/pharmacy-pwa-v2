import type { Drug } from '../db';

export const sampleDrugInput = (
  overrides: Partial<Omit<Drug, 'id' | 'createdAt'>> = {}
): Omit<Drug, 'id' | 'createdAt'> => ({
  barcode: '6281000000001',
  name: 'Paracetamol 500mg',
  nameAr: 'باراسيتامول',
  activeIngredient: 'Paracetamol',
  company: 'EIPICO',
  price: 25,
  costPrice: 15,
  stock: 100,
  expiryDate: '2027-12-31',
  ...overrides,
});
