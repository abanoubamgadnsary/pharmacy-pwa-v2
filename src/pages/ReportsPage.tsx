import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart2,
  ShoppingBag,
  Package,
  AlertTriangle,
  Calendar,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Download,
  Printer,
  Search,
  ArrowUp,
  RotateCcw,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Sale, Drug } from "../db";
import {
  getSalesByDateRange,
  getLowStockDrugs,
  getExpiringSoonDrugs,
  voidSale,
} from "../utils/dbOperations";
import { formatEgp } from "../utils/format";
import { formatExpiryDisplay, daysUntilExpiry, parseExpiryDate } from "../utils/expiry";
import { useLang } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInDays,
  subDays,
} from "date-fns";
import { arEG } from "date-fns/locale";
import { computeProfitByDrug, computeProfitSummary } from "../utils/profit";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "overview" | "history" | "inventory" | "topDrugs" | "profit";
type Preset = "today" | "week" | "month" | "year" | "custom";
type TopLine = { name: string; qty: number; revenue: number };

const PRESET_KEYS: Preset[] = ["today", "week", "month", "year", "custom"];

function presetRange(p: Preset, cs: string, ce: string): [Date, Date] {
  const now = new Date();
  if (p === "today") return [startOfDay(now), endOfDay(now)];
  if (p === "week") return [startOfWeek(now), endOfWeek(now)];
  if (p === "month") return [startOfMonth(now), endOfMonth(now)];
  if (p === "year") return [startOfYear(now), endOfYear(now)];
  const s = cs ? new Date(cs) : subDays(now, 30);
  const e = ce ? endOfDay(new Date(ce)) : endOfDay(now);
  return [s, e];
}

// ── Component ─────────────────────────────────────────────────────────────────
export const ReportsPage: React.FC = () => {
  const { t, lang, isRtl } = useLang();
  const { can } = useAuth();
  const ar = lang === "ar";

  const presetLabel = (key: Preset): string => {
    if (key === "today") return t.presetToday;
    if (key === "week") return t.presetWeek;
    if (key === "month") return t.presetMonth;
    if (key === "year") return t.presetYear;
    return t.presetCustom;
  };

  const tabLabel = (key: Tab): string => {
    if (key === "overview") return t.tabOverview;
    if (key === "history") return t.tabSalesLog;
    if (key === "inventory") return t.tabInventoryHealth;
    if (key === "profit") return t.tabProfit;
    return t.tabTopDrugs;
  };

  const allDrugs =
    useLiveQuery(() => db.drugs.toArray(), [], [] as Drug[]) ?? [];
  const allSales =
    useLiveQuery(() => db.sales.toArray(), [], [] as Sale[]) ?? [];

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [preset, setPreset] = useState<Preset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filtered, setFiltered] = useState<Sale[]>([]);
  const [lowDrugs, setLowDrugs] = useState<Drug[]>([]);
  const [expDrugs, setExpDrugs] = useState<Drug[]>([]);
  const [histSearch, setHistSearch] = useState("");
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
  const [voidMessage, setVoidMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [voiding, setVoiding] = useState(false);

  // Load filtered sales + alerts whenever period or allSales changes
  useEffect(() => {
    const [s, e] = presetRange(preset, customStart, customEnd);
    getSalesByDateRange(s, e).then(setFiltered);
    getLowStockDrugs(10).then(setLowDrugs);
    getExpiringSoonDrugs(30).then(setExpDrugs);
  }, [preset, customStart, customEnd, allSales]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalRevenue = filtered.reduce((s, x) => s + x.totalPrice, 0);
  const totalQty = filtered.reduce((s, x) => s + x.quantity, 0);
  const avgSale = filtered.length ? totalRevenue / filtered.length : 0;
  const totalValue = allDrugs.reduce((s, d) => s + d.stock * d.price, 0);

  // ── 7-day chart data ────────────────────────────────────────────────────────
  const chart7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const label = format(day, "EEE", { locale: ar ? arEG : undefined });
      const total = allSales
        .filter(
          (s) =>
            format(new Date(s.soldAt), "yyyy-MM-dd") ===
            format(day, "yyyy-MM-dd"),
        )
        .reduce((sum, s) => sum + s.totalPrice, 0);
      return { label, total, date: format(day, "dd/MM") };
    });
  }, [allSales, ar]);

  const maxChart = Math.max(...chart7.map((d) => d.total), 1);

  // ── Top drugs ───────────────────────────────────────────────────────────────
  const topDrugs: TopLine[] = useMemo(() => {
    const map = new Map<string, TopLine>();
    filtered.forEach((s) => {
      const curr = map.get(s.drugName) ?? {
        name: s.drugName,
        qty: 0,
        revenue: 0,
      };
      map.set(s.drugName, {
        ...curr,
        qty: curr.qty + s.quantity,
        revenue: curr.revenue + s.totalPrice,
      });
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [filtered]);

  const maxQty = Math.max(...topDrugs.map((d) => d.qty), 1);

  const profitSummary = useMemo(
    () => computeProfitSummary(filtered, allDrugs),
    [filtered, allDrugs],
  );

  const profitByDrug = useMemo(
    () => computeProfitByDrug(filtered, allDrugs),
    [filtered, allDrugs],
  );

  const maxDrugProfit = Math.max(...profitByDrug.map((d) => d.profit), 1);

  // ── Stock value by company ──────────────────────────────────────────────────
  const companyValue = useMemo(() => {
    const map = new Map<string, number>();
    allDrugs.forEach((d) => {
      if (!d.company) return;
      map.set(d.company, (map.get(d.company) ?? 0) + d.stock * d.price);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [allDrugs]);

  const maxCompanyVal = Math.max(...companyValue.map((c) => c[1]), 1);

  // ── History table with search ────────────────────────────────────────────────
  const historyRows = useMemo(() => {
    if (!histSearch.trim()) return filtered;
    const q = histSearch.toLowerCase();
    return filtered.filter((s) => s.drugName.toLowerCase().includes(q));
  }, [filtered, histSearch]);

  const exportCSV = () => {
    const header = "Date,Drug,Qty,Unit Price,Total\n";
    const rows = historyRows
      .map(
        (s) =>
          `${format(new Date(s.soldAt), "yyyy-MM-dd HH:mm")},${s.drugName},${s.quantity},${s.unitPrice},${s.totalPrice}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProfitCSV = () => {
    const header = "Drug,Qty,Revenue,Cost,Profit,Margin%\n";
    const rows = profitByDrug
      .map(
        (d) =>
          `${d.drugName},${d.qty},${d.revenue.toFixed(2)},${d.cost.toFixed(2)},${d.profit.toFixed(2)},${d.marginPct.toFixed(1)}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  const confirmVoidSale = async () => {
    if (!saleToVoid) return;
    setVoiding(true);
    try {
      await voidSale(saleToVoid.id);
      setSaleToVoid(null);
      setVoidMessage({ type: "success", text: t.voidSaleSuccess });
      setTimeout(() => setVoidMessage(null), 3000);
    } catch {
      setVoidMessage({ type: "error", text: t.voidSaleFail });
    }
    setVoiding(false);
  };

  // ── Shared sub-components ────────────────────────────────────────────────────

  const KpiCard = ({
    icon: Icon,
    label,
    value,
    sub,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    color: string;
  }) => (
    <div className="metric-card flex items-start gap-4">
      <div
        className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell" dir={isRtl ? "rtl" : "ltr"}>
      {/* ─── Page header + tabs ─── */}
      <div>
        <h1 className="page-title">{t.reportsAnalyticsTitle}</h1>
        <p className="page-subtitle">{t.reportsAnalyticsSubtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {(
          [
            { key: "overview", icon: BarChart2 },
            { key: "history", icon: ShoppingBag },
            { key: "profit", icon: PiggyBank },
            { key: "inventory", icon: Package },
            { key: "topDrugs", icon: TrendingUp },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${
                activeTab === tab.key
                  ? "bg-[#0d493a] text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
          >
            <tab.icon className="h-4 w-4" />
            {tabLabel(tab.key as Tab)}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors
              ${
                preset === key
                  ? "border-[#0d493a] bg-[#0d493a] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
          >
            {presetLabel(key)}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="field-input w-36 text-sm"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="field-input w-36 text-sm"
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB 1 — OVERVIEW
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={DollarSign}
              color="bg-emerald-500"
              label={t.totalRevenueKpi}
              value={formatEgp(totalRevenue)}
              sub={`${filtered.length} ${t.invoices}`}
            />
            <KpiCard
              icon={ShoppingBag}
              color="bg-blue-500"
              label={t.transactionsKpi}
              value={String(filtered.length)}
              sub={t.salesWord}
            />
            <KpiCard
              icon={Package}
              color="bg-violet-500"
              label={t.itemsSoldKpi}
              value={String(totalQty)}
              sub={t.unitsWord}
            />
            <KpiCard
              icon={TrendingUp}
              color="bg-amber-500"
              label={t.avgSaleKpi}
              value={formatEgp(avgSale)}
              sub={t.perTransaction}
            />
          </div>

          {/* 7-day bar chart + alerts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Bar chart */}
            <div className="xl:col-span-2 panel-pad">
              <h2 className="mb-4 text-base font-bold text-slate-900">
                {t.revenueLast7Days}
              </h2>
              <svg
                viewBox="0 0 560 180"
                className="w-full"
                aria-label="Revenue bar chart last 7 days"
              >
                {/* Grid lines */}
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="40"
                    y1={20 + i * 38}
                    x2="555"
                    y2={20 + i * 38}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                ))}
                {/* Bars */}
                {chart7.map((d, i) => {
                  const barH = maxChart > 0 ? (d.total / maxChart) * 130 : 2;
                  const x = 48 + i * 74;
                  const y = 154 - barH;
                  return (
                    <g key={i}>
                      <rect
                        x={x}
                        y={y}
                        width="42"
                        height={barH}
                        rx="5"
                        fill={barH > 4 ? "#0d493a" : "#e2e8f0"}
                        opacity={barH > 4 ? 1 : 0.4}
                      />
                      {d.total > 0 && (
                        <text
                          x={x + 21}
                          y={y - 4}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#0d493a"
                          fontWeight="600"
                        >
                          {d.total >= 1000
                            ? `${(d.total / 1000).toFixed(1)}k`
                            : Math.round(d.total)}
                        </text>
                      )}
                      <text
                        x={x + 21}
                        y="170"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#94a3b8"
                      >
                        {d.label}
                      </text>
                      <text
                        x={x + 21}
                        y="180"
                        textAnchor="middle"
                        fontSize="9"
                        fill="#cbd5e1"
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Alerts sidebar */}
            <div className="space-y-4">
              <div className="panel overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-sm font-bold text-slate-900">
                    {t.lowStockAlert}
                  </span>
                  <span className="ms-auto rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">
                    {lowDrugs.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                  {lowDrugs.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400">
                      {t.noAlertsOk}
                    </p>
                  ) : (
                    lowDrugs.slice(0, 6).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between px-4 py-2"
                      >
                        <span className="text-sm text-slate-700 truncate flex-1">
                          {d.name}
                        </span>
                        <span className="ms-2 shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">
                          {d.stock}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="panel overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-bold text-slate-900">
                    {t.expiringSoonAlert}
                  </span>
                  <span className="ms-auto rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">
                    {expDrugs.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                  {expDrugs.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400">
                      {t.noAlertsOk}
                    </p>
                  ) : (
                    expDrugs.slice(0, 6).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between px-4 py-2"
                      >
                        <span className="text-sm text-slate-700 truncate flex-1">
                          {d.name}
                        </span>
                        <span className="ms-2 shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">
                          {d.expiryDate
                            ? formatExpiryDisplay(d.expiryDate)
                            : "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Top 5 */}
          {topDrugs.length > 0 && (
            <div className="panel-pad">
              <h2 className="mb-4 text-base font-bold text-slate-900">
                {t.top5Selling}
              </h2>
              <div className="space-y-3">
                {topDrugs.slice(0, 5).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-slate-400">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-900 truncate">
                          {d.name}
                        </span>
                        <span className="ms-2 shrink-0 text-xs text-slate-500">
                          {d.qty} {t.unitsWord} — {formatEgp(d.revenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-[#0d493a] transition-all"
                          style={{ width: `${(d.qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 2 — SALES HISTORY
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {voidMessage && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-medium
              ${
                voidMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {voidMessage.text}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                placeholder={t.searchByDrug}
                className="field-input bg-slate-50 ps-9"
              />
            </div>
            <button onClick={exportCSV} className="secondary-btn">
              <Download className="h-4 w-4" />
              {t.exportCsv}
            </button>
            <button onClick={printReport} className="secondary-btn">
              <Printer className="h-4 w-4" />
              {t.print}
            </button>
            <span className="text-xs text-slate-400">
              {historyRows.length} {t.records}
            </span>
          </div>

          {/* Summary strip */}
          <div className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm">
            <span className="text-slate-500">{t.totalLabel}</span>
            <span className="font-bold text-emerald-700">
              {formatEgp(historyRows.reduce((s, x) => s + x.totalPrice, 0))}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{t.invoicesLabel}</span>
            <span className="font-bold">{historyRows.length}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{t.itemsLabel}</span>
            <span className="font-bold">
              {historyRows.reduce((s, x) => s + x.quantity, 0)}
            </span>
          </div>

          <div className="table-shell overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.dateTime}</th>
                  <th>{t.drugName}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalCol}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-slate-400 text-sm"
                    >
                      {t.noSalesInPeriod}
                    </td>
                  </tr>
                ) : (
                  historyRows.slice(0, 100).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="text-xs text-slate-400">
                        {format(new Date(s.soldAt), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="font-medium text-slate-900">
                        {s.drugName}
                      </td>
                      <td>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                          ×{s.quantity}
                        </span>
                      </td>
                      <td>{formatEgp(s.unitPrice)}</td>
                      <td className="font-semibold text-emerald-600">
                        {formatEgp(s.totalPrice)}
                      </td>
                      <td>
                        {can("sales.void") && (
                          <button
                            onClick={() => setSaleToVoid(s)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                            title={t.voidSale}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t.voidSale}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {historyRows.length > 100 && (
            <p className="text-center text-xs text-slate-400">
              {t.showingFirst100(historyRows.length)}
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 3 — INVENTORY HEALTH
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Inventory KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Package}
              color="bg-blue-500"
              label={t.totalProductsKpi}
              value={String(allDrugs.length)}
            />
            <KpiCard
              icon={DollarSign}
              color="bg-emerald-500"
              label={t.stockValueKpi}
              value={formatEgp(totalValue)}
            />
            <KpiCard
              icon={AlertTriangle}
              color="bg-rose-500"
              label={t.lowStockKpi}
              value={String(lowDrugs.length)}
              sub={t.under10Units}
            />
            <KpiCard
              icon={Calendar}
              color="bg-amber-500"
              label={t.expiringKpi}
              value={String(expDrugs.length)}
              sub={t.within30Days}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Low stock table */}
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {t.lowStockReport}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.drugName}</th>
                      <th>{t.company}</th>
                      <th>{t.remaining}</th>
                      <th>{t.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowDrugs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-slate-400 text-sm"
                        >
                          ✓ {t.noAlertsSimple}
                        </td>
                      </tr>
                    ) : (
                      lowDrugs.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="font-medium text-slate-900">
                            {d.name}
                          </td>
                          <td className="text-xs text-slate-500">
                            {d.company || "—"}
                          </td>
                          <td>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold
                            ${d.stock === 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {d.stock}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold
                            ${d.stock === 0 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}
                            >
                              {d.stock === 0 ? t.outOfStockShort : t.reorder}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expiring table */}
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <Calendar className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {t.expiryReport}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.drugName}</th>
                      <th>{t.expiryDateCol}</th>
                      <th>{t.daysLeft}</th>
                      <th>{t.stockCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expDrugs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-slate-400 text-sm"
                        >
                          ✓ {t.noAlertsSimple}
                        </td>
                      </tr>
                    ) : (
                      [...expDrugs]
                        .sort(
                          (a, b) =>
                            (parseExpiryDate(a.expiryDate)?.getTime() ?? 0) -
                            (parseExpiryDate(b.expiryDate)?.getTime() ?? 0),
                        )
                        .map((d) => {
                          const days = daysUntilExpiry(d.expiryDate) ?? 0;
                          return (
                            <tr key={d.id} className="hover:bg-slate-50">
                              <td className="font-medium text-slate-900">
                                {d.name}
                              </td>
                              <td className="text-xs">
                                {d.expiryDate
                                  ? formatExpiryDisplay(d.expiryDate)
                                  : "—"}
                              </td>
                              <td>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-bold
                                ${days <= 7 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}
                                >
                                  {t.daysShort(days)}
                                </span>
                              </td>
                              <td className="text-slate-600">{d.stock}</td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Stock value by company */}
          {companyValue.length > 0 && (
            <div className="panel-pad">
              <h3 className="mb-4 font-bold text-slate-900 text-sm">
                {t.stockValueByCompany}
              </h3>
              <div className="space-y-3">
                {companyValue.map(([company, value]) => (
                  <div key={company} className="flex items-center gap-3">
                    <span className="w-36 truncate text-sm text-slate-700">
                      {company}
                    </span>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-[#0d493a]/70 transition-all"
                          style={{ width: `${(value / maxCompanyVal) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-28 text-end text-xs font-semibold text-slate-600">
                      {formatEgp(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB — PROFIT
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "profit" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t.profitReportTitle}
            </h2>
            <p className="text-sm text-slate-500">{t.profitReportSubtitle}</p>
          </div>

          {profitSummary.missingCostCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t.profitMissingCostWarning(profitSummary.missingCostCount)}
              </p>
            </div>
          )}

          {profitByDrug.length === 0 ? (
            <div className="panel-pad py-16 text-center text-slate-400">
              <PiggyBank className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">{t.noProfitInPeriod}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  icon={DollarSign}
                  color="bg-emerald-500"
                  label={t.totalRevenueKpi}
                  value={formatEgp(profitSummary.revenue)}
                  sub={`${profitSummary.saleCount} ${t.salesWord}`}
                />
                <KpiCard
                  icon={Package}
                  color="bg-slate-500"
                  label={t.totalCostKpi}
                  value={formatEgp(profitSummary.cost)}
                  sub={t.purchaseCostBasis}
                />
                <KpiCard
                  icon={PiggyBank}
                  color="bg-violet-500"
                  label={t.grossProfitKpi}
                  value={formatEgp(profitSummary.profit)}
                  sub={t.profitCol}
                />
                <KpiCard
                  icon={TrendingUp}
                  color="bg-amber-500"
                  label={t.profitMarginKpi}
                  value={`${profitSummary.marginPct.toFixed(1)}%`}
                  sub={t.pctOfRevenue}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportProfitCSV}
                  className="secondary-btn text-sm"
                >
                  <Download className="h-4 w-4" /> {t.exportProfitCsv}
                </button>
                <button onClick={printReport} className="secondary-btn text-sm">
                  <Printer className="h-4 w-4" /> {t.print}
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="panel-pad space-y-4">
                  <h3 className="font-bold text-slate-900">{t.profitByDrug}</h3>
                  <div className="space-y-3">
                    {profitByDrug.slice(0, 8).map((d, i) => (
                      <div key={d.drugName} className="space-y-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-slate-900">
                            {d.drugName}
                          </span>
                          <span
                            className={`shrink-0 font-bold ${d.profit >= 0 ? "text-violet-600" : "text-rose-600"}`}
                          >
                            {formatEgp(d.profit)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full transition-all ${d.profit >= 0 ? "bg-violet-500" : "bg-rose-400"}`}
                            style={{
                              width: `${Math.max(4, (Math.abs(d.profit) / maxDrugProfit) * 100)}%`,
                              opacity: 1 - i * 0.06,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel-pad">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-900">
                      {t.profitByDrug}
                    </h3>
                    <div className="text-end text-xs text-slate-500">
                      <p>
                        {t.totalLabel}{" "}
                        <span className="font-bold text-violet-600">
                          {formatEgp(profitSummary.profit)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t.drugName}</th>
                          <th>{t.totalQtyCol}</th>
                          <th>{t.totalRevenueCol}</th>
                          <th>{t.costCol}</th>
                          <th>{t.profitCol}</th>
                          <th>{t.marginCol}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitByDrug.map((d) => (
                          <tr key={d.drugName} className="hover:bg-slate-50">
                            <td className="font-medium text-slate-900">
                              {d.drugName}
                            </td>
                            <td>{d.qty}</td>
                            <td className="text-emerald-600">
                              {formatEgp(d.revenue)}
                            </td>
                            <td className="text-slate-600">
                              {formatEgp(d.cost)}
                            </td>
                            <td
                              className={`font-semibold ${d.profit >= 0 ? "text-violet-600" : "text-rose-600"}`}
                            >
                              {formatEgp(d.profit)}
                            </td>
                            <td>{d.marginPct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 4 — TOP DRUGS
      ════════════════════════════════════════════════════════════ */}
      {activeTab === "topDrugs" && (
        <div className="space-y-6">
          {topDrugs.length === 0 ? (
            <div className="panel-pad py-16 text-center text-slate-400">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">{t.noSalesInPeriod}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Top by quantity */}
              <div className="panel-pad space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowUp className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900">
                    {t.bestSellersQty}
                  </h3>
                </div>
                <div className="space-y-3">
                  {topDrugs.map((d, i) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-5 text-center text-xs font-bold
                            ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-slate-300"}`}
                          >
                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`}
                          </span>
                          <span className="font-medium text-slate-900 truncate max-w-[160px]">
                            {d.name}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-slate-600 shrink-0 ms-2">
                          {d.qty} {t.unitsWord}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full transition-all
                            ${i === 0 ? "bg-[#d8ff64]" : "bg-[#0d493a]"}`}
                          style={{
                            width: `${(d.qty / maxQty) * 100}%`,
                            opacity: 1 - i * 0.07,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top by revenue */}
              <div className="panel-pad space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900">{t.topRevenue}</h3>
                </div>
                {(() => {
                  const byRev = [...topDrugs].sort(
                    (a, b) => b.revenue - a.revenue,
                  );
                  const maxR = byRev[0]?.revenue || 1;
                  return (
                    <div className="space-y-3">
                      {byRev.map((d, i) => (
                        <div key={d.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="w-5 text-center text-xs font-bold text-slate-300">
                                {i + 1}.
                              </span>
                              <span className="font-medium text-slate-900 truncate max-w-[160px]">
                                {d.name}
                              </span>
                            </span>
                            <span className="text-xs font-bold text-emerald-600 shrink-0 ms-2">
                              {formatEgp(d.revenue)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-emerald-500 transition-all"
                              style={{
                                width: `${(d.revenue / maxR) * 100}%`,
                                opacity: 1 - i * 0.07,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Summary table */}
              <div className="xl:col-span-2 table-shell overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t.drugName}</th>
                      <th>{t.totalQtyCol}</th>
                      <th>{t.totalRevenueCol}</th>
                      <th>{t.avgPriceCol}</th>
                      <th>{t.pctOfRevenue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDrugs.map((d, i) => (
                      <tr key={d.name} className="hover:bg-slate-50">
                        <td className="text-slate-400 text-xs">{i + 1}</td>
                        <td className="font-medium text-slate-900">{d.name}</td>
                        <td>{d.qty}</td>
                        <td className="font-semibold text-emerald-600">
                          {formatEgp(d.revenue)}
                        </td>
                        <td className="text-slate-500">
                          {formatEgp(d.qty > 0 ? d.revenue / d.qty : 0)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-100">
                              <div
                                className="h-1.5 rounded-full bg-[#0d493a]"
                                style={{
                                  width: `${totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">
                              {totalRevenue > 0
                                ? ((d.revenue / totalRevenue) * 100).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {saleToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              {t.voidSaleTitle}
            </h3>
            <p className="text-slate-600 mb-6">
              {t.voidSaleMsg(saleToVoid.drugName, saleToVoid.quantity)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSaleToVoid(null)}
                className="secondary-btn flex-1"
                disabled={voiding}
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmVoidSale}
                className="danger-btn flex-1"
                disabled={voiding}
              >
                {t.voidSale}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
