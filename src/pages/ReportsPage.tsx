import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, ShoppingBag, Calendar } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getTodaySales, getSalesByDateRange } from '../utils/dbOperations';
import { formatEgp } from '../utils/format';
import { Sale } from '../db';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useLang } from '../contexts/LanguageContext';

export const ReportsPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const allSales = useLiveQuery(() => db.sales.orderBy('soldAt').reverse().toArray()) || [];
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [weekSales, setWeekSales] = useState<Sale[]>([]);
  const [monthSales, setMonthSales] = useState<Sale[]>([]);

  useEffect(() => {
    loadSalesData();
  }, [allSales]);

  const loadSalesData = async () => {
    const today = await getTodaySales();
    const week = await getSalesByDateRange(startOfWeek(new Date()), endOfWeek(new Date()));
    const month = await getSalesByDateRange(startOfMonth(new Date()), endOfMonth(new Date()));
    setTodaySales(today);
    setWeekSales(week);
    setMonthSales(month);
  };

  const calculateTotal    = (sales: Sale[]) => sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const calculateQuantity = (sales: Sale[]) => sales.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="page-title">{t.reportsTitle}</h1>
        <p className="page-subtitle">{t.reportsSubtitle}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">{t.todaysSales}</p>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatEgp(calculateTotal(todaySales))}</p>
          <p className="text-sm text-gray-500 mt-1">{todaySales.length} {t.transactions}</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">{t.thisWeek}</p>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatEgp(calculateTotal(weekSales))}</p>
          <p className="text-sm text-gray-500 mt-1">{weekSales.length} {t.transactions}</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">{t.thisMonth}</p>
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatEgp(calculateTotal(monthSales))}</p>
          <p className="text-sm text-gray-500 mt-1">{monthSales.length} {t.transactions}</p>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="panel-pad">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">{t.recentSales}</h2>
        </div>

        {allSales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>{t.noSalesMsg}</p>
          </div>
        ) : (
          <div className="table-shell overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.dateTime}</th>
                  <th>{t.drugName}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalCol}</th>
                </tr>
              </thead>
              <tbody>
                {allSales.slice(0, 20).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td>
                      {sale.soldAt
                        ? format(new Date(sale.soldAt), 'MMM dd, yyyy HH:mm')
                        : '—'}
                    </td>
                    <td className="font-medium text-slate-900">{sale.drugName}</td>
                    <td>{sale.quantity}</td>
                    <td>{formatEgp(sale.unitPrice)}</td>
                    <td className="font-semibold text-emerald-600">{formatEgp(sale.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel-pad">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t.todaySummary}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.totalTransactions}</span>
              <span className="font-semibold">{todaySales.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.itemsSold}</span>
              <span className="font-semibold">{calculateQuantity(todaySales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.revenue}</span>
              <span className="font-semibold text-emerald-600">{formatEgp(calculateTotal(todaySales))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.avgPerSale}</span>
              <span className="font-semibold">
                {formatEgp(todaySales.length > 0 ? calculateTotal(todaySales) / todaySales.length : 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="panel-pad">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t.monthlySummary}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.totalTransactions}</span>
              <span className="font-semibold">{monthSales.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.itemsSold}</span>
              <span className="font-semibold">{calculateQuantity(monthSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.revenue}</span>
              <span className="font-semibold text-emerald-600">{formatEgp(calculateTotal(monthSales))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.avgPerSale}</span>
              <span className="font-semibold">
                {formatEgp(monthSales.length > 0 ? calculateTotal(monthSales) / monthSales.length : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
