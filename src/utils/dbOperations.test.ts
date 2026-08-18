import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { sampleDrugInput } from '../test/fixtures';
import {
  addDrug,
  clearAllData,
  deleteDrug,
  exportData,
  getAllDrugs,
  getAllSales,
  getDrugByBarcode,
  getDrugById,
  importData,
  recordSale,
  updateDrug,
  voidSale,
} from './dbOperations';

beforeEach(async () => {
  await clearAllData();
});

describe('drug CRUD', () => {
  it('adds a drug with a string UUID and retrieves it by id', async () => {
    const id = await addDrug(sampleDrugInput());
    const drug = await getDrugById(id);

    expect(drug).toBeDefined();
    expect(drug!.id).toBe(id);
    expect(drug!.name).toBe('Paracetamol 500mg');
    expect(drug!.stock).toBe(100);
  });

  it('finds a drug by barcode', async () => {
    await addDrug(sampleDrugInput({ barcode: '111222333' }));
    const drug = await getDrugByBarcode('111222333');
    expect(drug?.barcode).toBe('111222333');
  });

  it('updates and deletes a drug by string id', async () => {
    const id = await addDrug(sampleDrugInput());
    await updateDrug(id, { price: 30, stock: 50 });
    expect((await getDrugById(id))!.price).toBe(30);

    await deleteDrug(id);
    expect(await getDrugById(id)).toBeUndefined();
  });
});

describe('recordSale', () => {
  it('records a sale and decrements stock', async () => {
    const id = await addDrug(sampleDrugInput({ stock: 10, price: 20 }));

    await recordSale(id, 'Paracetamol 500mg', 3, 20);

    expect((await getDrugById(id))!.stock).toBe(7);

    const sales = await getAllSales();
    expect(sales).toHaveLength(1);
    expect(sales[0].drugId).toBe(id);
    expect(sales[0].quantity).toBe(3);
    expect(sales[0].totalPrice).toBe(60);
    expect(sales[0].unitCost).toBe(15);
  });

  it('rejects sales when stock is insufficient', async () => {
    const id = await addDrug(sampleDrugInput({ stock: 2 }));

    await expect(recordSale(id, 'Paracetamol 500mg', 5, 20)).rejects.toThrow(
      'Insufficient stock'
    );
    expect((await getDrugById(id))!.stock).toBe(2);
    expect(await getAllSales()).toHaveLength(0);
  });

  it('rejects invalid quantity', async () => {
    const id = await addDrug(sampleDrugInput());

    await expect(recordSale(id, 'Paracetamol 500mg', 0, 20)).rejects.toThrow(
      'Quantity must be a positive whole number'
    );
    await expect(recordSale(id, 'Paracetamol 500mg', 1.5, 20)).rejects.toThrow(
      'Quantity must be a positive whole number'
    );
  });

  it('rejects sales for missing drugs', async () => {
    await expect(
      recordSale('00000000-0000-4000-8000-000000000000', 'Missing', 1, 10)
    ).rejects.toThrow('Drug not found');
  });

  it('rejects negative unit price', async () => {
    const id = await addDrug(sampleDrugInput());

    await expect(recordSale(id, 'Paracetamol 500mg', 1, -5)).rejects.toThrow(
      'Unit price must be a valid number'
    );
  });

  it('deducts strips when selling by strip', async () => {
    const id = await addDrug(sampleDrugInput({ stock: 20, stripsPerBox: 10, price: 100 }));

    await recordSale(id, 'Paracetamol 500mg', 3, 10, { saleUnit: 'strip', stripsPerBox: 10 });

    expect((await getDrugById(id))!.stock).toBe(17);
    expect((await getAllSales())[0].stripsDeducted).toBe(3);
  });

  it('deducts full box as strips from stock', async () => {
    const id = await addDrug(sampleDrugInput({ stock: 30, stripsPerBox: 10, price: 100 }));

    await recordSale(id, 'Paracetamol 500mg', 2, 100, { saleUnit: 'box', stripsPerBox: 10 });

    expect((await getDrugById(id))!.stock).toBe(10);
    expect((await getAllSales())[0].stripsDeducted).toBe(20);
  });
});

describe('voidSale', () => {
  it('returns stock and removes the sale record', async () => {
    const id = await addDrug(sampleDrugInput({ stock: 10 }));
    await recordSale(id, 'Paracetamol 500mg', 3, 20);

    const sale = (await getAllSales())[0];
    await voidSale(sale.id);

    expect((await getDrugById(id))!.stock).toBe(10);
    expect(await getAllSales()).toHaveLength(0);
  });

  it('rejects void for missing sale', async () => {
    await expect(
      voidSale('00000000-0000-4000-8000-000000000000')
    ).rejects.toThrow('Sale not found');
  });
});

describe('backup / restore', () => {
  it('exports and imports drugs and sales', async () => {
    const id = await addDrug(sampleDrugInput({ stock: 10 }));
    await recordSale(id, 'Paracetamol 500mg', 2, 25);

    const backup = await exportData();
    await clearAllData();
    expect(await getAllDrugs()).toHaveLength(0);

    await importData(backup);

    const drugs = await getAllDrugs();
    const sales = await getAllSales();
    expect(drugs).toHaveLength(1);
    expect(drugs[0].stock).toBe(8);
    expect(sales).toHaveLength(1);
    expect(sales[0].totalPrice).toBe(50);
  });

  it('rejects invalid drug records on import', async () => {
    await expect(
      importData(JSON.stringify({ drugs: [{ barcode: 123 }] }))
    ).rejects.toThrow('Invalid drug record');
  });

  it('rejects invalid sale records on import', async () => {
    await expect(
      importData(
        JSON.stringify({
          sales: [{ drugId: 'x', drugName: 'Test', quantity: -1, unitPrice: 10, totalPrice: 10 }],
        })
      )
    ).rejects.toThrow('Invalid sale record');
  });

  it('preserves existing string ids on import', async () => {
    const fixedId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await importData(
      JSON.stringify({
        drugs: [
          {
            id: fixedId,
            ...sampleDrugInput(),
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );

    const drug = await getDrugById(fixedId);
    expect(drug?.id).toBe(fixedId);
  });
});

describe('database schema', () => {
  it('uses string UUID primary keys for drugs and sales', async () => {
    const id = await addDrug(sampleDrugInput());
    await recordSale(id, 'Paracetamol 500mg', 1, 25);

    const rawDrug = await db.drugs.get(id);
    const rawSale = (await db.sales.toArray())[0];

    expect(typeof rawDrug!.id).toBe('string');
    expect(rawDrug!.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(typeof rawSale.id).toBe('string');
    expect(rawSale.drugId).toBe(id);
  });
});
