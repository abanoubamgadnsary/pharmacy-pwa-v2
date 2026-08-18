import type { Drug, Sale } from '../db';

export interface DrugProfitLine {
  drugName: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

export interface ProfitSummary {
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  saleCount: number;
  missingCostCount: number;
}

export function buildDrugCostMap(drugs: Drug[]): Map<string, number> {
  return new Map(drugs.map((d) => [d.id, d.costPrice ?? 0]));
}

/** Cost per unit at time of sale, or fallback to current drug cost. */
export function resolveUnitCost(sale: Sale, drugCostById: Map<string, number>): number {
  if (sale.unitCost != null && Number.isFinite(sale.unitCost) && sale.unitCost >= 0) {
    return sale.unitCost;
  }
  return drugCostById.get(sale.drugId) ?? 0;
}

export function saleHasCostData(sale: Sale, drugCostById: Map<string, number>): boolean {
  if (sale.unitCost != null && sale.unitCost > 0) return true;
  return (drugCostById.get(sale.drugId) ?? 0) > 0;
}

export function computeProfitSummary(sales: Sale[], drugs: Drug[]): ProfitSummary {
  const costMap = buildDrugCostMap(drugs);
  let revenue = 0;
  let cost = 0;
  let missingCostCount = 0;

  for (const sale of sales) {
    revenue += sale.totalPrice;
    const unitCost = resolveUnitCost(sale, costMap);
    cost += sale.quantity * unitCost;
    if (!saleHasCostData(sale, costMap)) missingCostCount += 1;
  }

  const profit = revenue - cost;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cost,
    profit,
    marginPct,
    saleCount: sales.length,
    missingCostCount,
  };
}

export function computeProfitByDrug(sales: Sale[], drugs: Drug[]): DrugProfitLine[] {
  const costMap = buildDrugCostMap(drugs);
  const map = new Map<string, DrugProfitLine>();

  for (const sale of sales) {
    const unitCost = resolveUnitCost(sale, costMap);
    const lineCost = sale.quantity * unitCost;
    const curr = map.get(sale.drugName) ?? {
      drugName: sale.drugName,
      qty: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      marginPct: 0,
    };

    const revenue = curr.revenue + sale.totalPrice;
    const cost = curr.cost + lineCost;
    const profit = revenue - cost;

    map.set(sale.drugName, {
      drugName: sale.drugName,
      qty: curr.qty + sale.quantity,
      revenue,
      cost,
      profit,
      marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    });
  }

  return [...map.values()].sort((a, b) => b.profit - a.profit);
}
