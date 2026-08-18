import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Download, Printer, Search, PackageCheck, AlertTriangle,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useLang } from '../contexts/LanguageContext';
import { getReorderLines, buildReorderCsv } from '../utils/restock';
import { format } from 'date-fns';

type Filter = 'all' | 'out';

export const RestockPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const drugs = useLiveQuery(() => db.drugs.toArray(), []) ?? [];

  const [threshold, setThreshold] = useState(10);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [orderQty, setOrderQty] = useState<Record<string, number>>({});

  const reorderLines = useMemo(
    () => getReorderLines(drugs, threshold),
    [drugs, threshold],
  );

  const filteredLines = useMemo(() => {
    let lines = reorderLines;
    if (filter === 'out') lines = lines.filter((l) => l.currentStock === 0);
    const q = search.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter(
      (l) =>
        l.drug.name.toLowerCase().includes(q) ||
        (l.drug.nameAr ?? '').toLowerCase().includes(q) ||
        l.drug.company.toLowerCase().includes(q) ||
        l.drug.barcode.includes(search.trim()),
    );
  }, [reorderLines, filter, search]);

  const getQty = (id: string, suggested: number) => orderQty[id] ?? suggested;

  const setQty = (id: string, qty: number) => {
    setOrderQty((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  };

  const exportLines = filteredLines
    .filter((l) => getQty(l.drug.id, l.suggestedQty) > 0)
    .map((l) => ({ drug: l.drug, orderQty: getQty(l.drug.id, l.suggestedQty) }));

  const handleExport = () => {
    const csv = buildReorderCsv(exportLines, t.restockCsvHeader);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restock-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const rows = exportLines
      .map(
        ({ drug, orderQty: qty }) =>
          `<tr><td>${drug.name}</td><td>${drug.company}</td><td>${drug.barcode}</td><td>${drug.stock}</td><td><b>${qty}</b></td></tr>`,
      )
      .join('');
    const html = `<!DOCTYPE html><html dir="${isRtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
      <title>${t.restockTitle}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:8px;text-align:${isRtl ? 'right' : 'left'}}
      th{background:#f5f5f5}</style></head><body>
      <h2>${t.restockTitle}</h2><p>${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      <table><thead><tr>
      <th>${t.drugName}</th><th>${t.company}</th><th>${t.barcode}</th><th>${t.stockCol}</th><th>${t.restockOrderQty}</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const outCount = reorderLines.filter((l) => l.currentStock === 0).length;
  const lowCount = reorderLines.length - outCount;

  return (
    <div className="page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t.restockTitle}</h1>
          <p className="page-subtitle">{t.restockSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={exportLines.length === 0} className="secondary-btn">
            <Download className="w-4 h-4" /> {t.restockExport}
          </button>
          <button onClick={handlePrint} disabled={exportLines.length === 0} className="secondary-btn">
            <Printer className="w-4 h-4" /> {t.print}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card flex items-center gap-4">
          <ClipboardList className="w-10 h-10 text-[#0d493a]" />
          <div>
            <p className="text-sm text-slate-500">{t.restockNeedOrder}</p>
            <p className="text-2xl font-bold">{reorderLines.length}</p>
          </div>
        </div>
        <div className="metric-card flex items-center gap-4">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <div>
            <p className="text-sm text-slate-500">{t.restockOutOfStock}</p>
            <p className="text-2xl font-bold text-rose-600">{outCount}</p>
          </div>
        </div>
        <div className="metric-card flex items-center gap-4">
          <PackageCheck className="w-10 h-10 text-amber-500" />
          <div>
            <p className="text-sm text-slate-500">{t.restockLowStock}</p>
            <p className="text-2xl font-bold text-amber-600">{lowCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">{t.restockThreshold}</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="field-input w-24 text-sm"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(['all', 'out'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
                ${filter === f ? 'bg-[#0d493a] text-white' : 'text-slate-600 hover:bg-white'}`}
            >
              {f === 'all' ? t.restockFilterAll : t.restockFilterOut}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.restockSearch}
            className={`field-input bg-slate-50 text-sm w-full ${isRtl ? 'pr-9' : 'pl-9'}`}
          />
        </div>
      </div>

      {/* List */}
      {filteredLines.length === 0 ? (
        <div className="panel-pad py-16 text-center text-slate-400">
          <PackageCheck className="w-14 h-14 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{t.restockAllGood}</p>
          <p className="text-sm mt-1">{t.restockAllGoodSub}</p>
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.drugName}</th>
                <th>{t.company}</th>
                <th>{t.barcode}</th>
                <th>{t.stockCol}</th>
                <th>{t.restockSuggested}</th>
                <th>{t.restockOrderQty}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map(({ drug, currentStock, suggestedQty }) => (
                <tr key={drug.id} className="hover:bg-slate-50">
                  <td>
                    <Link
                      to={`/management/edit/${drug.id}`}
                      className="font-medium text-[#0d493a] hover:underline"
                    >
                      {drug.name}
                    </Link>
                    {drug.nameAr && (
                      <p className="text-xs text-slate-400">{drug.nameAr}</p>
                    )}
                  </td>
                  <td className="text-sm">{drug.company}</td>
                  <td className="font-mono text-xs text-slate-500">{drug.barcode}</td>
                  <td>
                    <span className={`font-bold ${currentStock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {currentStock}
                    </span>
                  </td>
                  <td className="text-slate-500">{suggestedQty}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={getQty(drug.id, suggestedQty)}
                      onChange={(e) => setQty(drug.id, parseInt(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm font-bold
                        focus:outline-none focus:ring-2 focus:ring-[#0d493a]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {exportLines.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          {t.restockTotalUnits(exportLines.reduce((s, l) => s + l.orderQty, 0))}
        </p>
      )}
    </div>
  );
};
