import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useLang } from '../contexts/LanguageContext';
import { getExpiryAlerts, formatExpiryDisplay } from '../utils/expiry';

const urgencyStyles = {
  expired:  'border-rose-300 bg-rose-50 text-rose-900',
  critical: 'border-orange-300 bg-orange-50 text-orange-900',
  warning:  'border-amber-200 bg-amber-50 text-amber-900',
};

export const ExpiryAlertsBanner: React.FC = () => {
  const { t, isRtl } = useLang();
  const drugs = useLiveQuery(() => db.drugs.toArray(), []) ?? [];
  const alerts = getExpiryAlerts(drugs);

  if (alerts.length === 0) return null;

  const expiredCount = alerts.filter((a) => a.urgency === 'expired').length;
  const soonCount = alerts.length - expiredCount;

  const urgencyLabel = (days: number, urgency: string) => {
    if (urgency === 'expired') return t.expiredDaysAgo(Math.abs(days));
    return t.expiresInDays(days);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-white shadow-sm overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-700 shrink-0" />
          <div>
            <p className="font-bold text-amber-900 text-sm">{t.expiryAlertsTitle}</p>
            <p className="text-xs text-amber-700">
              {expiredCount > 0 && `${expiredCount} ${t.expiredLabel}`}
              {expiredCount > 0 && soonCount > 0 && ' · '}
              {soonCount > 0 && `${soonCount} ${t.expiringSoon}`}
            </p>
          </div>
        </div>
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d493a] hover:underline"
        >
          {t.viewAllExpiry}
          <ChevronRight className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
        </Link>
      </div>

      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
        {alerts.slice(0, 8).map(({ drug, days, urgency }) => (
          <Link
            key={drug.id}
            to={`/management/edit/${drug.id}`}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors
              ${urgency === 'expired' ? 'bg-rose-50/40' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 truncate">{drug.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {drug.company} · {t.stockCol}: {drug.stock}
              </p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${urgencyStyles[urgency as keyof typeof urgencyStyles] ?? urgencyStyles.warning}`}>
              {urgency === 'expired' && <AlertTriangle className="inline h-3 w-3 me-1 -mt-0.5" />}
              {formatExpiryDisplay(drug.expiryDate)} · {urgencyLabel(days, urgency)}
            </span>
          </Link>
        ))}
      </div>

      {alerts.length > 8 && (
        <p className="px-4 py-2 text-center text-xs text-slate-400 border-t border-slate-100">
          {t.moreExpiryAlerts(alerts.length - 8)}
        </p>
      )}
    </div>
  );
};
