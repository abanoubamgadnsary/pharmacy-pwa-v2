import { Drug } from '../db';

export type ReorderLine = {
  drug: Drug;
  currentStock: number;
  suggestedQty: number;
};

/** Units to order so stock reaches targetStock (minimum one threshold pack). */
export function suggestedReorderQty(
  stock: number,
  threshold = 10,
  targetStock = 30,
): number {
  if (stock <= 0) return targetStock;
  return Math.max(targetStock - stock, threshold);
}

export function getReorderLines(
  drugs: Drug[],
  threshold = 10,
  targetStock = 30,
): ReorderLine[] {
  return drugs
    .filter((d) => d.stock <= threshold)
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
    .map((drug) => ({
      drug,
      currentStock: drug.stock,
      suggestedQty: suggestedReorderQty(drug.stock, threshold, targetStock),
    }));
}

export function buildReorderCsv(
  lines: Array<{ drug: Drug; orderQty: number }>,
  header: string,
): string {
  const rows = lines.map(
    ({ drug, orderQty }) =>
      `${drug.name},${drug.company},${drug.barcode},${drug.stock},${orderQty}`,
  );
  return `${header}\n${rows.join('\n')}`;
}
