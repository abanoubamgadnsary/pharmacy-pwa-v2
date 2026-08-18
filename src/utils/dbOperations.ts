import { db, Drug, Sale } from '../db';
import { ensureStringId, generateId } from './id';
import { daysUntilExpiry, formatExpiryDisplay, parseExpiryDate } from './expiry';
import type { SaleUnit } from './units';

export { generateId };

// ── Drug CRUD ────────────────────────────────────────────────────────────────

export const addDrug = async (drug: Omit<Drug, 'id' | 'createdAt'>): Promise<string> => {
  const newDrug: Drug = { ...drug, id: generateId(), createdAt: new Date() };
  await db.drugs.add(newDrug);
  return newDrug.id;
};

export const updateDrug = async (id: string, updates: Partial<Drug>) =>
  db.drugs.update(id, updates);

export const deleteDrug = async (id: string) => db.drugs.delete(id);

export const getDrugByBarcode = async (barcode: string) =>
  db.drugs.where('barcode').equals(barcode).first();

export const getDrugById = async (id: string) => db.drugs.get(id);

export const searchDrugs = async (query: string): Promise<Drug[]> => {
  const q = query.toLowerCase();
  return db.drugs
    .filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.activeIngredient.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        d.barcode.includes(query) ||
        (d.nameAr ?? '').toLowerCase().includes(q)
    )
    .toArray();
};

export const getAllDrugs = async () => db.drugs.toArray();

export const getLowStockDrugs = async (threshold = 10) =>
  db.drugs.where('stock').belowOrEqual(threshold).toArray();

export const getExpiringSoonDrugs = async (daysAhead = 30): Promise<Drug[]> => {
  const all = await db.drugs.toArray();
  return all.filter((d) => {
    const days = daysUntilExpiry(d.expiryDate);
    return days !== null && days >= 0 && days <= daysAhead;
  });
};

export const getExpiredDrugs = async (): Promise<Drug[]> => {
  const all = await db.drugs.toArray();
  return all.filter((d) => {
    const days = daysUntilExpiry(d.expiryDate);
    return days !== null && days < 0;
  });
};

// ── Sales ────────────────────────────────────────────────────────────────────

export const recordSale = async (
  drugId: string,
  drugName: string,
  quantity: number,
  unitPrice: number,
  opts?: {
    saleUnit?: SaleUnit;
    stripsPerBox?: number;
  },
) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive whole number');
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error('Unit price must be a valid number');
  }

  await db.transaction('rw', db.drugs, db.sales, async () => {
    const drug = await db.drugs.get(drugId);
    if (!drug) throw new Error('Drug not found');

    const spb = opts?.stripsPerBox ?? drug.stripsPerBox ?? 1;
    const saleUnit = opts?.saleUnit ?? 'box';
    const stripsNeeded = saleUnit === 'box' ? quantity * spb : quantity;

    if (drug.stock < stripsNeeded) throw new Error('Insufficient stock');

    const boxCost = drug.costPrice ?? 0;
    const unitCost =
      saleUnit === 'strip' && spb > 0 ? boxCost / spb : boxCost;

    const sale: Sale = {
      id: generateId(),
      drugId,
      drugName,
      quantity,
      unitPrice,
      unitCost,
      saleUnit,
      stripsDeducted: stripsNeeded,
      totalPrice: quantity * unitPrice,
      soldAt: new Date(),
    };

    await db.sales.add(sale);
    await db.drugs.update(drugId, { stock: drug.stock - stripsNeeded });
  });
};

export const getAllSales = async () => db.sales.orderBy('soldAt').reverse().toArray();

export const getSalesByDateRange = async (start: Date, end: Date) =>
  db.sales.where('soldAt').between(start, end, true, true).toArray();

export const getTodaySales = async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  return getSalesByDateRange(today, tomorrow);
};

export const voidSale = async (saleId: string) => {
  await db.transaction('rw', db.drugs, db.sales, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale) throw new Error('Sale not found');

    const drug = await db.drugs.get(sale.drugId);
    if (drug) {
      const restore = sale.stripsDeducted ?? sale.quantity;
      await db.drugs.update(sale.drugId, { stock: drug.stock + restore });
    }
    await db.sales.delete(saleId);
  });
};

// ── Backup / Restore ─────────────────────────────────────────────────────────

export const exportData = async () => {
  const drugs = await getAllDrugs();
  const sales = await getAllSales();
  return JSON.stringify({ drugs, sales, exportedAt: new Date().toISOString() }, null, 2);
};

const isValidDateString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && parseExpiryDate(value) !== null;

const parseDate = (value: unknown, fallback = new Date()): Date => {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const normalizeDrug = (value: unknown): Drug => {
  if (!value || typeof value !== 'object') throw new Error('Invalid drug record');
  const item = value as Partial<Drug>;
  const price = item.price;
  const stock = item.stock;
  const costPrice = item.costPrice;
  const stripsPerBox = item.stripsPerBox;
  const stripPrice = item.stripPrice;

  if (
    typeof item.barcode !== 'string' ||
    typeof item.name !== 'string' ||
    typeof item.activeIngredient !== 'string' ||
    typeof item.company !== 'string' ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    typeof stock !== 'number' ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    !isValidDateString(item.expiryDate)
  ) {
    throw new Error('Invalid drug record');
  }

  if (
    costPrice != null &&
    (typeof costPrice !== 'number' || !Number.isFinite(costPrice) || costPrice < 0)
  ) {
    throw new Error('Invalid drug record');
  }

  if (
    stripsPerBox != null &&
    (typeof stripsPerBox !== 'number' || !Number.isInteger(stripsPerBox) || stripsPerBox < 1)
  ) {
    throw new Error('Invalid drug record');
  }

  if (
    stripPrice != null &&
    (typeof stripPrice !== 'number' || !Number.isFinite(stripPrice) || stripPrice < 0)
  ) {
    throw new Error('Invalid drug record');
  }

  return {
    id: ensureStringId(item.id),
    barcode: item.barcode.trim(),
    name: item.name.trim(),
    nameAr: typeof item.nameAr === 'string' ? item.nameAr.trim() : '',
    activeIngredient: item.activeIngredient.trim(),
    company: item.company.trim(),
    price,
    costPrice: costPrice ?? 0,
    stripsPerBox: stripsPerBox ?? 1,
    stripPrice: stripPrice ?? undefined,
    stock,
    expiryDate: item.expiryDate,
    createdAt: parseDate(item.createdAt),
  };
};

const normalizeSale = (value: unknown): Sale => {
  if (!value || typeof value !== 'object') throw new Error('Invalid sale record');
  const item = value as Partial<Sale>;
  const quantity = item.quantity;
  const unitPrice = item.unitPrice;
  const totalPrice = item.totalPrice;
  const unitCost = item.unitCost;

  if (
    typeof item.drugId !== 'string' ||
    typeof item.drugName !== 'string' ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    typeof unitPrice !== 'number' ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0 ||
    typeof totalPrice !== 'number' ||
    !Number.isFinite(totalPrice)
  ) {
    throw new Error('Invalid sale record');
  }

  if (
    unitCost != null &&
    (typeof unitCost !== 'number' || !Number.isFinite(unitCost) || unitCost < 0)
  ) {
    throw new Error('Invalid sale record');
  }

  return {
    id: ensureStringId(item.id),
    drugId: item.drugId,
    drugName: item.drugName,
    quantity,
    unitPrice,
    unitCost: unitCost ?? undefined,
    saleUnit: item.saleUnit === 'strip' || item.saleUnit === 'box' ? item.saleUnit : undefined,
    stripsDeducted:
      typeof item.stripsDeducted === 'number' && item.stripsDeducted > 0
        ? item.stripsDeducted
        : undefined,
    totalPrice,
    soldAt: parseDate(item.soldAt),
  };
};

export const importData = async (jsonData: string) => {
  const data = JSON.parse(jsonData) as { drugs?: unknown; sales?: unknown };
  const drugs = Array.isArray(data.drugs) ? data.drugs.map(normalizeDrug) : [];
  const sales = Array.isArray(data.sales) ? data.sales.map(normalizeSale) : [];

  await db.transaction('rw', db.drugs, db.sales, async () => {
    if (drugs.length > 0) await db.drugs.bulkPut(drugs);
    if (sales.length > 0) await db.sales.bulkPut(sales);
  });
};

export const clearAllData = async () => {
  await db.drugs.clear();
  await db.sales.clear();
};
