import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, Calendar, TrendingDown, ClipboardList } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getLowStockDrugs } from '../utils/dbOperations';
import { Drug } from '../db';
import { formatEgp } from '../utils/format';
import { useLang } from '../contexts/LanguageContext';
import { getExpiryAlerts, formatExpiryDisplay } from '../utils/expiry';

export const InventoryPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const allDrugs = useLiveQuery(() => db.drugs.toArray()) || [];
  const lowStockDrugs = useLiveQuery(() => getLowStockDrugs(10), []) ?? [];

  const expiryAlerts = useMemo(() => getExpiryAlerts(allDrugs), [allDrugs]);
  const expiredDrugs = useMemo(
    () => expiryAlerts.filter((a) => a.urgency === 'expired'),
    [expiryAlerts],
  );
  const expiringSoonDrugs = useMemo(
    () => expiryAlerts.filter((a) => a.urgency !== 'expired'),
    [expiryAlerts],
  );

  const getTotalValue = () => allDrugs.reduce((sum, drug) => sum + (drug.stock * drug.price), 0);
  const getTotalStock = () => allDrugs.reduce((sum, drug) => sum + drug.stock, 0);

  const ExpiryRow = ({ drug, days, urgency }: { drug: Drug; days: number; urgency: string }) => (
    <div className="flex items-center justify-between rounded-lg border bg-white p-4
      border-amber-100">
      <div>
        <p className="font-semibold text-gray-900">{drug.name}</p>
        <p className="text-sm text-gray-600">{drug.company}</p>
      </div>
      <div className="text-end">
        <p className={`text-lg font-bold ${urgency === 'expired' ? 'text-rose-600' : 'text-orange-600'}`}>
          {formatExpiryDisplay(drug.expiryDate)}
        </p>
        <p className="text-sm text-gray-500">
          {days < 0 ? t.expiredDaysAgo(Math.abs(days)) : t.expiresInDays(days)} · {t.stockCol}: {drug.stock}
        </p>
      </div>
    </div>
  );

  return (
    <div className="page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t.inventoryTitle}</h1>
          <p className="page-subtitle">{t.inventorySubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">{t.totalProducts}</p>
              <p className="text-3xl font-bold text-gray-900">{allDrugs.length}</p>
            </div>
            <Package className="w-12 h-12 text-emerald-600" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">{t.totalStock}</p>
              <p className="text-3xl font-bold text-gray-900">{getTotalStock()}</p>
            </div>
            <TrendingDown className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">{t.inventoryValue}</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatEgp(getTotalValue())}
              </p>
            </div>
            <Package className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      {expiredDrugs.length > 0 && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <h2 className="text-lg font-bold text-rose-900">
              {t.expiredAlertTitle} ({expiredDrugs.length})
            </h2>
          </div>
          <div className="space-y-2">
            {expiredDrugs.map(({ drug, days, urgency }) => (
              <div key={drug.id} className="rounded-lg border border-rose-200 bg-white">
                <ExpiryRow drug={drug} days={days} urgency={urgency} />
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockDrugs.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-bold text-red-900">
                {t.lowStockAlert} ({lowStockDrugs.length})
              </h2>
            </div>
            <Link to="/restock" className="secondary-btn text-sm py-2">
              <ClipboardList className="w-4 h-4" />
              {t.restockViewOrders}
            </Link>
          </div>
          <div className="space-y-2">
            {lowStockDrugs.map((drug) => (
              <div
                key={drug.id}
                className="flex items-center justify-between rounded-lg border border-rose-100 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">{drug.name}</p>
                  <p className="text-sm text-gray-600">{drug.company}</p>
                </div>
                <div className="text-end">
                  <p className="text-lg font-bold text-red-600">{drug.stock} {t.units}</p>
                  <p className="text-sm text-gray-500">{t.reorderNow}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expiringSoonDrugs.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-6 h-6 text-orange-600" />
            <h2 className="text-lg font-bold text-orange-900">
              {t.expiringSoonAlert} ({expiringSoonDrugs.length})
            </h2>
          </div>
          <div className="space-y-2">
            {expiringSoonDrugs.map(({ drug, days, urgency }) => (
              <div key={drug.id} className="rounded-lg border border-amber-100 bg-white">
                <ExpiryRow drug={drug} days={days} urgency={urgency} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-pad">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t.allInventory}</h2>

        {allDrugs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>{t.noDrugsMsg}</p>
          </div>
        ) : (
          <div className="table-shell overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.ingredient}</th>
                  <th>{t.company}</th>
                  <th>{t.stockCol}</th>
                  <th>{t.price}</th>
                  <th>{t.expiryCol}</th>
                </tr>
              </thead>
              <tbody>
                {allDrugs.map((drug) => (
                  <tr key={drug.id} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-900">{drug.name}</td>
                    <td>{drug.activeIngredient}</td>
                    <td>{drug.company}</td>
                    <td>
                      <span className={`font-semibold ${drug.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {drug.stock}
                      </span>
                    </td>
                    <td className="text-slate-900">{formatEgp(drug.price)}</td>
                    <td>{formatExpiryDisplay(drug.expiryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
