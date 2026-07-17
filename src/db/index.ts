import Dexie, { Table } from "dexie";

export interface Drug {
  id?: string;
  barcode: string;
  name: string;
  nameAr?: string;
  activeIngredient: string;
  company: string;
  price: number;
  stock: number;
  expiryDate: string;
  createdAt: Date;
}

export interface Sale {
  id?: string;
  drugId: string;
  drugName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  soldAt: Date;
}

// Egyptian national drug catalog (loaded once from GitHub)
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

export class PharmacyDB extends Dexie {
  drugs!: Table<Drug>;
  sales!: Table<Sale>;
  catalog!: Table<DrugCatalog>;

  constructor() {
    super("PharmacyDB");
    this.version(2).stores({
      drugs: "++id, barcode, name, company, expiryDate, stock",
      sales: "++id, drugId, soldAt",
      catalog:
        "++id, barcode, commercial_name_en, commercial_name_ar, manufacturer",
    });
  }
}

export const db = new PharmacyDB();
