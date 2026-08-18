import type { Drug } from '../db';

export type SaleUnit = 'box' | 'strip';

export function getStripsPerBox(drug: Drug): number {
  const n = drug.stripsPerBox ?? 1;
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function hasStripBoxChoice(drug: Drug): boolean {
  return getStripsPerBox(drug) > 1;
}

export function getBoxPrice(drug: Drug): number {
  return drug.price;
}

export function getStripPrice(drug: Drug): number {
  if (drug.stripPrice != null && drug.stripPrice > 0) return drug.stripPrice;
  const spb = getStripsPerBox(drug);
  return spb > 0 ? drug.price / spb : drug.price;
}

export function getUnitPrice(drug: Drug, unit: SaleUnit): number {
  return unit === 'box' ? getBoxPrice(drug) : getStripPrice(drug);
}

export function stripsToDeduct(qty: number, unit: SaleUnit, drug: Drug): number {
  const spb = getStripsPerBox(drug);
  return unit === 'box' ? qty * spb : qty;
}

export function maxSellQty(drug: Drug, unit: SaleUnit): number {
  const spb = getStripsPerBox(drug);
  if (unit === 'strip') return drug.stock;
  return Math.floor(drug.stock / spb);
}

export function unitCostForSale(drug: Drug, unit: SaleUnit): number {
  const boxCost = drug.costPrice ?? 0;
  if (unit === 'box') return boxCost;
  const spb = getStripsPerBox(drug);
  return spb > 0 ? boxCost / spb : boxCost;
}

export function formatStockDisplay(
  drug: Drug,
  labels: { strip: string; box: string; stripsWord: string },
): string {
  const spb = getStripsPerBox(drug);
  if (spb <= 1) return `${drug.stock} ${labels.stripsWord}`;
  const { boxes, strips } = splitStock(drug);
  if (strips === 0) return `${boxes} ${labels.box}`;
  if (boxes === 0) return `${strips} ${labels.strip}`;
  return `${boxes} ${labels.box} + ${strips} ${labels.strip}`;
}

export function splitStock(drug: Drug): { boxes: number; strips: number } {
  const spb = getStripsPerBox(drug);
  if (spb <= 1) return { boxes: drug.stock, strips: 0 };
  return {
    boxes: Math.floor(drug.stock / spb),
    strips: drug.stock % spb,
  };
}

export function maxBoxesGivenStrips(drug: Drug, stripQty: number): number {
  const spb = getStripsPerBox(drug);
  if (spb <= 1) return stripQty > 0 ? 0 : drug.stock;
  return Math.max(0, Math.floor((drug.stock - stripQty) / spb));
}

export function maxStripsGivenBoxes(drug: Drug, boxQty: number): number {
  const spb = getStripsPerBox(drug);
  if (spb <= 1) return boxQty > 0 ? 0 : drug.stock;
  return Math.max(0, drug.stock - boxQty * spb);
}

export function totalStripsRequested(boxQty: number, stripQty: number, drug: Drug): number {
  return boxQty * getStripsPerBox(drug) + stripQty;
}
