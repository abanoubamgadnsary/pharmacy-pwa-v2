import { db, Drug, Sale } from '../db';

export const generateId = (): string => crypto.randomUUID();

// ── Drug CRUD ────────────────────────────────────────────────────────────────

export const addDrug = async (drug: Omit<Drug, 'id' | 'createdAt'>): Promise<string> => {
  const newDrug: Drug = { ...drug, id: generateId(), createdAt: new Date() };
  await db.drugs.add(newDrug);
  return newDrug.id!;
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
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const all = await db.drugs.toArray();
  return all.filter((d) => {
    const exp = new Date(d.expiryDate);
    return exp <= future && exp >= new Date();
  });
};

// ── Sales ────────────────────────────────────────────────────────────────────

export const recordSale = async (
  drugId: string,
  drugName: string,
  quantity: number,
  unitPrice: number
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
    if (drug.stock < quantity) throw new Error('Insufficient stock');

    const sale: Sale = {
      id: generateId(),
      drugId,
      drugName,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      soldAt: new Date(),
    };

    await db.sales.add(sale);
    await db.drugs.update(drugId, { stock: drug.stock - quantity });
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

// ── Backup / Restore ─────────────────────────────────────────────────────────

export const exportData = async () => {
  const drugs = await getAllDrugs();
  const sales = await getAllSales();
  return JSON.stringify({ drugs, sales, exportedAt: new Date().toISOString() }, null, 2);
};

const isValidDateString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && !Number.isNaN(new Date(value).getTime());

const parseDate = (value: unknown, fallback = new Date()): Date => {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const normalizeDrug = (value: unknown): Drug => {
  if (!value || typeof value !== 'object') throw new Error('Invalid drug record');
  const item = value as Partial<Drug>;
  const price = item.price;
  const stock = item.stock;

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

  return {
    id: typeof item.id === 'string' && item.id ? item.id : generateId(),
    barcode: item.barcode.trim(),
    name: item.name.trim(),
    nameAr: typeof item.nameAr === 'string' ? item.nameAr.trim() : '',
    activeIngredient: item.activeIngredient.trim(),
    company: item.company.trim(),
    price,
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

  return {
    id: typeof item.id === 'string' && item.id ? item.id : generateId(),
    drugId: item.drugId,
    drugName: item.drugName,
    quantity,
    unitPrice,
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
