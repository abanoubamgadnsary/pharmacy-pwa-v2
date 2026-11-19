import Dexie, { Table } from "dexie";
import { ensureStringId } from "../utils/id";
import type { UserRole } from "../utils/permissions";

export interface Drug {
  id: string;
  barcode: string;
  name: string;
  nameAr?: string;
  activeIngredient: string;
  company: string;
  price: number;
  costPrice?: number;
  stripsPerBox?: number;
  stripPrice?: number;
  stock: number;
  expiryDate: string;
  createdAt: Date;
}

export interface Sale {
  id: string;
  drugId: string;
  drugName: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  saleUnit?: 'box' | 'strip';
  stripsDeducted?: number;
  totalPrice: number;
  soldAt: Date;
}

export interface DrugCatalog {
  id?: number;
  commercial_name_en: string;
  commercial_name_ar: string;
  scientific_composition: string;
  manufacturer: string;
  drug_class: string;
  route: string;
  price_egp: number;
  barcode: string;
}

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  pinHash: string;
  active: boolean;
  createdAt: Date;
}

export interface AppSetting {
  key: string;
  value: string;
}

const DB_RESET_FLAG = "pharmacy_db_reset_attempted";
const CATALOG_VERSION_KEY = "catalog_version";

export class PharmacyDB extends Dexie {
  drugs!: Table<Drug>;
  sales!: Table<Sale>;
  catalog!: Table<DrugCatalog>;
  users!: Table<AppUser>;
  settings!: Table<AppSetting>;

  constructor() {
    super("PharmacyDB");

    this.on("blocked", () => {
      console.warn(
        "[PharmacyDB] Upgrade blocked — close other tabs with MEDISOL open, then refresh.",
      );
    });

    this.on("versionchange", () => {
      console.warn("[PharmacyDB] Schema updated in another tab — reloading.");
      window.location.reload();
    });

    // Keep v2 so existing users aren't wiped
    this.version(2).stores({
      drugs:   "++id, barcode, name, company, expiryDate, stock",
      sales:   "++id, drugId, soldAt",
      catalog: "++id, barcode, commercial_name_en, commercial_name_ar, manufacturer",
    });

    // v3 — barcode explicitly indexed for O(log n) catalog lookups
    this.version(3).stores({
      drugs:   "++id, barcode, name, company, expiryDate, stock",
      sales:   "++id, drugId, soldAt",
      catalog: "++id, barcode, commercial_name_en, commercial_name_ar, manufacturer",
    });

    // v4 — string UUID primary keys (clear + bulkPut — PK cannot be modified in place)
    this.version(4)
      .stores({
        drugs:   "id, barcode, name, company, expiryDate, stock",
        sales:   "id, drugId, soldAt",
        catalog: "++id, barcode, commercial_name_en, commercial_name_ar, manufacturer",
      })
      .upgrade(async (tx) => {
        const drugKeyToId = new Map<string, string>();

        const drugsTable = tx.table("drugs");
        const existingDrugs = await drugsTable.toArray();
        const migratedDrugs = existingDrugs.map((drug: Drug) => {
          const oldKey = drug.id != null ? String(drug.id) : "";
          const newId = ensureStringId(drug.id);
          if (oldKey) drugKeyToId.set(oldKey, newId);
          return { ...drug, id: newId };
        });
        await drugsTable.clear();
        if (migratedDrugs.length) await drugsTable.bulkPut(migratedDrugs);

        const salesTable = tx.table("sales");
        const existingSales = await salesTable.toArray();
        const migratedSales = existingSales.map((sale: Sale) => ({
          ...sale,
          id: ensureStringId(sale.id),
          drugId:
            drugKeyToId.get(String(sale.drugId ?? "")) ??
            ensureStringId(sale.drugId),
        }));
        await salesTable.clear();
        if (migratedSales.length) await salesTable.bulkPut(migratedSales);
      });

    // v5 — app users (PIN login)
    this.version(5).stores({
      drugs:   "id, barcode, name, company, expiryDate, stock",
      sales:   "id, drugId, soldAt",
      catalog: "++id, barcode, commercial_name_en, commercial_name_ar, manufacturer",
      users:   "id, role, active, name",
    });

    // v6 — settings table (recovery key hash, etc.)
    this.version(6).stores({
      drugs:    "id, barcode, name, company, expiryDate, stock",
      sales:    "id, drugId, soldAt",
      catalog:  "++id, barcode, commercial_name_en, commercial_name_ar, manufacturer",
      users:    "id, role, active, name",
      settings: "key",
    });
  }
}

export const db = new PharmacyDB();

function logDexieError(label: string, err: unknown): void {
  if (err instanceof Dexie.DexieError) {
    console.error(`[PharmacyDB] ${label}:`, err.name, err.message, err.inner ?? "");
  } else {
    console.error(`[PharmacyDB] ${label}:`, err);
  }
}

/** Wipe local IndexedDB (used when schema upgrade is stuck/corrupt). */
export async function resetDb(): Promise<void> {
  dbReady = null;
  try {
    db.close();
  } catch {
    /* already closed */
  }
  await Dexie.delete("PharmacyDB");
  localStorage.removeItem(CATALOG_VERSION_KEY);
  sessionStorage.setItem(DB_RESET_FLAG, "1");
}

export function wasDbResetThisSession(): boolean {
  return sessionStorage.getItem(DB_RESET_FLAG) === "1";
}

/** Single shared open() — avoids Dexie race when Auth + catalog init run together. */
let dbReady: Promise<void> | null = null;

async function openWithRecovery(): Promise<void> {
  try {
    await db.open();
    return;
  } catch (firstErr) {
    logDexieError("Failed to open", firstErr);

    if (sessionStorage.getItem(DB_RESET_FLAG)) throw firstErr;

    console.warn("[PharmacyDB] Attempting one-time database reset…");
    sessionStorage.setItem(DB_RESET_FLAG, "1");

    try {
      db.close();
    } catch {
      /* ignore */
    }

    await Dexie.delete("PharmacyDB");
    localStorage.removeItem(CATALOG_VERSION_KEY);
    dbReady = null;

    await db.open();
    console.warn("[PharmacyDB] Database reset complete — local data was cleared.");
  }
}

export function readyDb(): Promise<void> {
  if (!dbReady) {
    dbReady = openWithRecovery().catch((err) => {
      dbReady = null;
      throw err;
    });
  }
  return dbReady;
}
