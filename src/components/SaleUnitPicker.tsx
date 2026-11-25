import React, { useMemo, useState } from "react";
import { Minus, Plus, X, Package, Layers } from "lucide-react";
import type { Drug } from "../db";
import { useLang } from "../contexts/LanguageContext";
import { formatEgp } from "../utils/format";
import {
  getStripsPerBox,
  getUnitPrice,
  hasStripBoxChoice,
  maxBoxesGivenStrips,
  maxStripsGivenBoxes,
  splitStock,
  totalStripsRequested,
  SaleUnit,
} from "../utils/units";

export type SalePick = { unit: SaleUnit; qty: number; unitPrice: number };

interface Props {
  drug: Drug;
  initialBoxQty?: number;
  initialStripQty?: number;
  confirmLabel?: string;
  onConfirm: (items: SalePick[]) => void;
  onClose: () => void;
}

function CounterRow({
  icon: Icon,
  label,
  unitPrice,
  qty,
  max,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  unitPrice: number;
  qty: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(n, max));

  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[#0d493a]">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{label}</p>
            <p className="text-xs text-emerald-600 font-semibold">
              {formatEgp(unitPrice)}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">{formatEgp(unitPrice * qty)}</p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onChange(clamp(qty - 1))}
          disabled={qty <= 0}
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          min={0}
          max={max}
          value={qty}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || 0))}
          className="w-16 text-center text-xl font-bold border border-slate-200 rounded-lg py-1.5"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(qty + 1))}
          disabled={qty >= max}
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-center text-[11px] text-slate-400">max {max}</p>
    </div>
  );
}

export const SaleUnitPicker: React.FC<Props> = ({
  drug,
  initialBoxQty,
  initialStripQty,
  confirmLabel,
  onConfirm,
  onClose,
}) => {
  const { t, isRtl } = useLang();
  const multiUnit = hasStripBoxChoice(drug);
  const spb = getStripsPerBox(drug);
  const stockSplit = splitStock(drug);

  const [boxQty, setBoxQty] = useState(initialBoxQty ?? (multiUnit ? 0 : 1));
  const [stripQty, setStripQty] = useState(initialStripQty ?? (multiUnit ? 1 : 0));

  const maxBoxes = maxBoxesGivenStrips(drug, stripQty);
  const maxStrips = maxStripsGivenBoxes(drug, boxQty);

  const total = useMemo(
    () =>
      getUnitPrice(drug, "box") * boxQty +
      getUnitPrice(drug, "strip") * stripQty,
    [drug, boxQty, stripQty],
  );

  const requestedStrips = totalStripsRequested(boxQty, stripQty, drug);
  const canConfirm = requestedStrips > 0 && requestedStrips <= drug.stock;

  const handleConfirm = () => {
    if (!canConfirm) return;
    const items: SalePick[] = [];
    if (boxQty > 0)
      items.push({
        unit: "box",
        qty: boxQty,
        unitPrice: getUnitPrice(drug, "box"),
      });
    if (stripQty > 0)
      items.push({
        unit: "strip",
        qty: stripQty,
        unitPrice: getUnitPrice(drug, "strip"),
      });
    onConfirm(items);
  };

  const handleBoxChange = (n: number) => {
    setBoxQty(n);
    setStripQty((s) => Math.min(s, maxStripsGivenBoxes(drug, n)));
  };

  const handleStripChange = (n: number) => {
    setStripQty(n);
    setBoxQty((b) => Math.min(b, maxBoxesGivenStrips(drug, n)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">{t.saleUnitTitle}</h3>
            {multiUnit && (
              <p className="text-xs text-slate-500 mt-0.5">
                {t.saleUnitSubtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg bg-slate-50 p-3 text-end">
            <p className="font-semibold text-slate-900">{drug.name}</p>
            {drug.nameAr && (
              <p className="text-sm text-slate-500">{drug.nameAr}</p>
            )}
          </div>

          {multiUnit && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border-2 border-[#0d493a]/20 bg-[#f4fbf6] p-3 text-center">
                  <Package className="h-5 w-5 mx-auto text-[#0d493a] mb-1" />
                  <p className="text-2xl font-bold text-[#0d493a]">
                    {stockSplit.boxes}
                  </p>
                  <p className="text-xs font-medium text-slate-600">
                    {t.saleUnitBox}
                  </p>
                </div>
                <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3 text-center">
                  <Layers className="h-5 w-5 mx-auto text-violet-600 mb-1" />
                  <p className="text-2xl font-bold text-violet-700">
                    {stockSplit.strips}
                  </p>
                  <p className="text-xs font-medium text-slate-600">
                    {t.saleUnitStrip}
                  </p>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500">
                {t.stripsPerBoxShort}: {spb} · {t.saleUnitStockHint}
              </p>
            </>
          )}

          <CounterRow
            icon={Package}
            label={t.saleUnitBox}
            unitPrice={getUnitPrice(drug, "box")}
            qty={boxQty}
            max={maxBoxes}
            onChange={handleBoxChange}
          />
          {multiUnit && (
            <CounterRow
              icon={Layers}
              label={t.saleUnitStrip}
              unitPrice={getUnitPrice(drug, "strip")}
              qty={stripQty}
              max={maxStrips}
              onChange={handleStripChange}
            />
          )}

          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
            <span className="text-lg font-bold text-emerald-700">
              {formatEgp(total)}
            </span>
            <span className="text-sm text-emerald-800 text-end">
              {boxQty > 0 && `${boxQty} ${t.saleUnitBox}`}
              {boxQty > 0 && stripQty > 0 && " + "}
              {stripQty > 0 && `${stripQty} ${t.saleUnitStrip}`}
            </span>
          </div>

          {drug.stock < 1 ? (
            <p className="text-center text-sm text-rose-600">
              {t.saleUnitOutOfStock}
            </p>
          ) : !canConfirm ? (
            <p className="text-center text-sm text-amber-600">
              {t.saleUnitPickOne}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="primary-btn w-full py-3"
            >
              {confirmLabel ?? t.saleUnitAddToCart}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
