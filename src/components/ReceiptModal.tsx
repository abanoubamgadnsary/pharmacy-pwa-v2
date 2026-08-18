import React from 'react';
import { Printer, X } from 'lucide-react';
import { ReceiptLine, printReceipt } from '../utils/receipt';
import { formatEgp } from '../utils/format';
import { useLang } from '../contexts/LanguageContext';

export type CompletedReceipt = {
  lines: ReceiptLine[];
  total: number;
  soldAt: Date;
};

interface Props {
  receipt: CompletedReceipt;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ receipt, onClose }) => {
  const { t, isRtl } = useLang();

  const labels = {
    title: t.receiptTitle,
    date: t.receiptDate,
    items: t.receiptItems,
    qty: t.quantity,
    price: t.unitPrice,
    lineTotal: t.totalCol,
    total: t.total,
    thankYou: t.receiptThankYou,
    pharmacyName: t.pharmacyName,
  };

  const handlePrint = () => {
    printReceipt(receipt.lines, receipt.total, receipt.soldAt, labels, formatEgp, isRtl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{t.receiptTitle}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm space-y-2 max-h-64 overflow-y-auto">
          {receipt.lines.map((line, i) => (
            <div key={i} className="flex justify-between gap-3">
              <div className="min-w-0 text-end">
                <p className="font-medium text-slate-900 truncate">{line.name}</p>
                {line.nameAr && <p className="text-xs text-slate-500 truncate">{line.nameAr}</p>}
              </div>
              <div className="shrink-0 text-start text-slate-600">
                {line.qty} {line.unitLabel ? `(${line.unitLabel})` : ''} × {formatEgp(line.unitPrice)}
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-dashed border-slate-300 font-bold text-slate-900">
            <span>{formatEgp(receipt.total)}</span>
            <span>{t.total}</span>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="secondary-btn flex-1">{t.close}</button>
          <button onClick={handlePrint} className="primary-btn flex-1">
            <Printer className="w-4 h-4" />
            {t.printReceipt}
          </button>
        </div>
      </div>
    </div>
  );
};
