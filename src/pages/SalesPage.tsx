import React, { useState, useCallback } from 'react';
import {
  Camera, Search, Minus, Plus, Trash2,
  ShoppingBag, BookOpen, X, Receipt,
  Loader2, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { BarcodeScanner }    from '../components/BarcodeScanner';
import { CatalogSearch }     from '../components/CatalogSearch';
import { ReceiptModal, CompletedReceipt } from '../components/ReceiptModal';
import { ExpiryAlertsBanner } from '../components/ExpiryAlertsBanner';
import { SaleUnitPicker, SalePick } from '../components/SaleUnitPicker';
import { getDrugByBarcode, searchDrugs, recordSale, addDrug } from '../utils/dbOperations';
import { lookupCatalogByBarcode }                              from '../services/catalogLoader';
import { formatEgp }         from '../utils/format';
import { Drug, DrugCatalog } from '../db';
import { useLang }           from '../contexts/LanguageContext';
import { useAuth }           from '../contexts/AuthContext';
import {
  getStripsPerBox,
  maxSellQty,
  stripsToDeduct,
  SaleUnit,
} from '../utils/units';

type CartLine = {
  drug: Drug;
  qty: number;
  saleUnit: SaleUnit;
  unitPrice: number;
  lineKey: string;
};
type Flash    = { type: 'success' | 'error' | 'info'; text: string };
type QuickAdd = {
  barcode: string;
  catalog: DrugCatalog;
  stock: string;
  costPrice: string;
  stripsPerBox: string;
  expiryDate: string;
};

export const SalesPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const { isManager } = useAuth();

  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState<Drug[]>([]);
  const [searching,      setSearching]      = useState(false);

  // FIX #6 — cart replaces single selectedDrug
  const [cart,           setCart]           = useState<CartLine[]>([]);

  const [showScanner,    setShowScanner]    = useState(false);
  const [showCatalog,    setShowCatalog]    = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  // FIX #4 — quick-add panel state
  const [quickAdd,       setQuickAdd]       = useState<QuickAdd | null>(null);

  const [flash,          setFlash]          = useState<Flash | null>(null);
  const [completing,     setCompleting]     = useState(false);
  const [lookingUp,      setLookingUp]      = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<CompletedReceipt | null>(null);
  const [unitPickerDrug, setUnitPickerDrug] = useState<Drug | null>(null);

  const showMsg = (type: Flash['type'], text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 3500);
  };

  // ── Manual search ────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    setSearchResults(await searchDrugs(q));
    setSearching(false);
  }, []);

  // ── Barcode scan ────────────────────────────────────────────────────────
  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    setLookingUp(true);

    // 1️⃣ Check pharmacy stock first (O(log n))
    const stockDrug = await getDrugByBarcode(barcode);
    if (stockDrug) {
      setUnitPickerDrug(stockDrug);
      setLookingUp(false);
      return;
    }

    // FIX #4 — 2️⃣ Check catalog by barcode (O(log n) indexed)
    const catDrug = await lookupCatalogByBarcode(barcode);
    setLookingUp(false);

    if (catDrug) {
      if (!isManager) {
        showMsg('error', t.cashierNoAdd);
        return;
      }
      setQuickAdd({ barcode, catalog: catDrug, stock: '', costPrice: '', stripsPerBox: '1', expiryDate: '' });
      showMsg('info', t.catalogFoundQuickAdd(catDrug.commercial_name_en));
    } else if (isManager) {
      setScannedBarcode(barcode);
      setShowCatalog(true);
      showMsg('info', t.barcodeNotFoundSearch(barcode));
    } else {
      showMsg('error', t.cashierNoAdd);
    }
  };

  // ── Quick-add: save drug from catalog + add to cart ─────────────────────
  const handleQuickAddSave = async () => {
    if (!quickAdd) return;
    await addDrug({
      barcode:          quickAdd.barcode,
      name:             quickAdd.catalog.commercial_name_en,
      nameAr:           quickAdd.catalog.commercial_name_ar,
      activeIngredient: quickAdd.catalog.scientific_composition,
      company:          quickAdd.catalog.manufacturer,
      price:            quickAdd.catalog.price_egp || 0,
      costPrice:        parseFloat(quickAdd.costPrice) || 0,
      stripsPerBox:     Math.max(1, parseInt(quickAdd.stripsPerBox, 10) || 1),
      stock:            parseInt(quickAdd.stock) || 0,
      expiryDate:       quickAdd.expiryDate,
    });
    const drug = await getDrugByBarcode(quickAdd.barcode);
    if (drug) {
      setUnitPickerDrug(drug);
      showMsg('success', t.addedToStockAndCart(drug.name));
    }
    setQuickAdd(null);
  };

  // ── Name-search catalog fallback ─────────────────────────────────────────
  const handleCatalogSelect = async (catalogDrug: DrugCatalog) => {
    setShowCatalog(false);
    await addDrug({
      barcode:          scannedBarcode,
      name:             catalogDrug.commercial_name_en,
      nameAr:           catalogDrug.commercial_name_ar,
      activeIngredient: catalogDrug.scientific_composition,
      company:          catalogDrug.manufacturer,
      price:            catalogDrug.price_egp || 0,
      stock:            0,
      expiryDate:       '',
    });
    const newDrug = await getDrugByBarcode(scannedBarcode);
    if (newDrug) {
      setUnitPickerDrug(newDrug);
      showMsg('success', t.drugAdded(catalogDrug.commercial_name_en));
    }
    setScannedBarcode('');
  };

  const openUnitPicker = (drug: Drug) => setUnitPickerDrug(drug);

  const addToCart = (drug: Drug, qty: number, saleUnit: SaleUnit, unitPrice: number) => {
    const lineKey = `${drug.id}:${saleUnit}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.lineKey === lineKey);
      if (ex) {
        const merged = ex.qty + qty;
        const maxQ = maxSellQty(drug, saleUnit);
        const nextQty = Math.min(merged, maxQ);
        if (nextQty <= 0) return prev;
        return prev.map((l) =>
          l.lineKey === lineKey ? { ...l, qty: nextQty } : l,
        );
      }
      return [...prev, { drug, qty, saleUnit, unitPrice, lineKey }];
    });
    setSearchQuery('');
    setSearchResults([]);
    showMsg('success', t.addedToCart(drug.name));
  };

  const handleUnitPickerConfirm = (items: SalePick[]) => {
    if (!unitPickerDrug) return;
    for (const item of items) {
      if (item.qty > 0) addToCart(unitPickerDrug, item.qty, item.unit, item.unitPrice);
    }
    setUnitPickerDrug(null);
  };

  const setQty = (lineKey: string, qty: number) => {
    if (qty <= 0) return setCart((p) => p.filter((l) => l.lineKey !== lineKey));
    setCart((p) =>
      p.map((l) => {
        if (l.lineKey !== lineKey) return l;
        const maxQ = maxSellQty(l.drug, l.saleUnit);
        return { ...l, qty: Math.min(qty, maxQ) };
      }),
    );
  };

  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const cartQty   = cart.reduce((s, l) => s + l.qty, 0);

  const unitLabel = (unit: SaleUnit) =>
    unit === 'box' ? t.saleUnitBox : t.saleUnitStrip;

  // ── Complete sale ────────────────────────────────────────────────────────
  const handleSell = async () => {
    if (!cart.length) return;
    const over = cart.find((l) => {
      const need = stripsToDeduct(l.qty, l.saleUnit, l.drug);
      return need > l.drug.stock;
    });
    if (over) {
      showMsg('error', t.onlyInStock(over.drug.name, maxSellQty(over.drug, over.saleUnit)));
      return;
    }
    setCompleting(true);
    try {
      const soldAt = new Date();
      const receiptLines = cart.map(({ drug, qty, saleUnit, unitPrice }) => ({
        name: drug.name,
        nameAr: drug.nameAr,
        qty,
        unitPrice,
        unitLabel: unitLabel(saleUnit),
      }));
      const total = cartTotal;

      for (const { drug, qty, saleUnit, unitPrice } of cart) {
        await recordSale(drug.id!, drug.name, qty, unitPrice, {
          saleUnit,
          stripsPerBox: getStripsPerBox(drug),
        });
      }

      setCompletedReceipt({ lines: receiptLines, total, soldAt });
      showMsg('success', t.saleComplete(cart.length, formatEgp(total)));
      setCart([]);
    } catch { showMsg('error', t.saleError); }
    setCompleting(false);
  };

  const flashCls =
    flash?.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
    flash?.type === 'error'   ? 'border-rose-200   bg-rose-50   text-rose-800'      :
                                'border-blue-200   bg-blue-50   text-blue-800';

  return (
    <div className="page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="page-title">{t.salesTitle}</h1>
        <p className="page-subtitle">{t.salesSubtitle}</p>
      </div>

      {flash && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${flashCls}`}>
          {flash.text}
        </div>
      )}

      {isManager && <ExpiryAlertsBanner />}

      {/* FIX #6 — two-column POS layout on desktop */}
      <div className="flex gap-5 min-h-[calc(100vh-220px)]">

        {/* ── LEFT: Search + product list ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Scan + Search row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              {searching || lookingUp
                ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                : <Search  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              <input
                type="text" value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t.searchInStock}
                className="field-input bg-slate-50 ps-9"
              />
            </div>
            <button onClick={() => setShowScanner(true)} className="primary-btn shrink-0 px-5">
              <Camera className="w-5 h-5" />
              <span className="hidden sm:inline">{t.scanBarcode}</span>
            </button>
          </div>

          {/* FIX #4 — Quick-add panel (barcode found in catalog) */}
          {isManager && quickAdd && (
            <div className="rounded-lg border-2 border-emerald-300 bg-white overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 border-b border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-bold text-emerald-800">{t.foundInDatabase}</span>
                <button onClick={() => setQuickAdd(null)} className="ms-auto text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-lg bg-slate-50 p-3 text-end">
                  <p className="font-bold text-slate-900">{quickAdd.catalog.commercial_name_en}</p>
                  {quickAdd.catalog.commercial_name_ar && (
                    <p className="text-sm text-slate-500">{quickAdd.catalog.commercial_name_ar}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1.5 justify-end">
                    {quickAdd.catalog.manufacturer && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {quickAdd.catalog.manufacturer}
                      </span>
                    )}
                    {quickAdd.catalog.price_egp > 0 && (
                      <span className="text-sm font-bold text-emerald-600">
                        {formatEgp(quickAdd.catalog.price_egp)}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 text-end">
                    {t.costPriceField}
                  </label>
                  <input type="number" min="0" step="0.01" placeholder="0"
                    value={quickAdd.costPrice}
                    onChange={(e) => setQuickAdd((p) => p ? { ...p, costPrice: e.target.value } : null)}
                    className="field-input text-center"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 text-end">
                      {t.stripsPerBoxField}
                    </label>
                    <input type="number" min="1" placeholder="1"
                      value={quickAdd.stripsPerBox}
                      onChange={(e) => setQuickAdd((p) => p ? { ...p, stripsPerBox: e.target.value } : null)}
                      className="field-input text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 text-end">
                      {t.qtyInStock}
                    </label>
                    <input type="number" min="0" placeholder="0"
                      value={quickAdd.stock}
                      onChange={(e) => setQuickAdd((p) => p ? { ...p, stock: e.target.value } : null)}
                      className="field-input text-center"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-end">{t.stockInStripsHint}</p>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 text-end">
                    {t.expiryDateLabel}
                  </label>
                  <input type="date"
                    value={quickAdd.expiryDate}
                    onChange={(e) => setQuickAdd((p) => p ? { ...p, expiryDate: e.target.value } : null)}
                    className="field-input"
                  />
                </div>

                <button onClick={handleQuickAddSave} className="primary-btn w-full py-2.5">
                  <Plus className="w-4 h-4" /> {t.addToStockAndCart}
                </button>
              </div>
            </div>
          )}

          {/* Catalog name-search fallback */}
          {isManager && showCatalog && (
            <div className="panel-pad border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setShowCatalog(false)}><X className="w-5 h-5 text-slate-400" /></button>
                <div className="flex items-center gap-2 text-blue-700">
                  <span className="font-bold text-sm">{t.searchCatalogTitle}</span>
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <CatalogSearch onSelect={handleCatalogSelect} autoFocus />
              <p className="text-xs text-slate-400 text-end mt-2">
                {t.barcodeLabel}: <span className="font-mono">{scannedBarcode}</span> — {t.catalogLinked}
              </p>
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="panel overflow-hidden divide-y divide-slate-100">
              {searchResults.map((drug) => (
                <button key={drug.id} onClick={() => openUnitPicker(drug)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-start hover:bg-[#f4fbf6] transition-colors">
                  <span>
                    <span className="block font-semibold text-slate-900 text-sm">{drug.name}</span>
                    {drug.nameAr && <span className="block text-xs text-slate-400">{drug.nameAr}</span>}
                    <span className={`text-xs ${drug.stock <= 10 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                      {t.stockLabel}: {drug.stock}
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block text-sm font-bold text-emerald-600">{formatEgp(drug.price)}</span>
                    <span className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!searchQuery && !quickAdd && !showCatalog && (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-300 py-16">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">{t.searchOrScan}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Cart / Invoice ── */}
        <div className="w-80 xl:w-96 shrink-0 flex flex-col panel overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Receipt className="w-4 h-4 text-slate-400" />
            <h2 className="font-bold text-slate-900 text-sm">{t.invoice}</h2>
            <span className="ms-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {t.cartItems(cart.length)}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {!cart.length ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-slate-300">
                <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">{t.cartEmpty}</p>
              </div>
            ) : cart.map(({ drug, qty, saleUnit, unitPrice, lineKey }) => {
              const maxQ = maxSellQty(drug, saleUnit);
              return (
              <div key={lineKey} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{drug.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatEgp(unitPrice)} × {qty} · {unitLabel(saleUnit)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button onClick={() => setCart((p) => p.filter((l) => l.lineKey !== lineKey))}
                      className="text-slate-300 hover:text-rose-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatEgp(unitPrice * qty)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setQty(lineKey, qty - 1)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 hover:bg-slate-50">
                    <Minus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <input type="number" value={qty} min={1} max={maxQ}
                    onChange={(e) => setQty(lineKey, parseInt(e.target.value) || 1)}
                    className="w-12 text-center text-sm font-bold border border-slate-200 rounded-lg py-1
                      focus:outline-none focus:ring-2 focus:ring-[#0d493a]" />
                  <button onClick={() => setQty(lineKey, qty + 1)} disabled={qty >= maxQ}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 hover:bg-slate-50
                      disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  {qty >= maxQ && maxQ > 0 && (
                    <span className="flex items-center gap-1 text-xs text-rose-500">
                      <AlertTriangle className="w-3 h-3" /> {t.maxStock(maxQ)}
                    </span>
                  )}
                </div>
              </div>
            );})}
          </div>

          {/* Summary + Checkout */}
          <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50">
            {cart.length > 0 && (
              <div className="space-y-1">
                {cart.map(({ drug, qty, unitPrice, saleUnit, lineKey }) => (
                  <div key={lineKey} className="flex justify-between text-xs text-slate-500">
                    <span>{formatEgp(unitPrice * qty)}</span>
                    <span className="truncate max-w-[180px] text-end">
                      {drug.name} ({unitLabel(saleUnit)})
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-end pt-2 border-t border-dashed border-slate-200">
                  <div className="text-xs text-slate-400">{t.cartItems(cartQty)}</div>
                  <div className="text-2xl font-bold text-slate-900">{formatEgp(cartTotal)}</div>
                </div>
              </div>
            )}

            <button onClick={handleSell} disabled={!cart.length || completing}
              className="primary-btn w-full py-3 text-base">
              {completing
                ? <><Loader2 className="w-5 h-5 animate-spin" /> {t.saving}</>
                : <><ShoppingBag className="w-5 h-5" /> {t.completeSale} — {formatEgp(cartTotal)}</>}
            </button>

            {cart.length > 0 && (
              <button onClick={() => setCart([])}
                className="flex w-full items-center justify-center gap-1.5 py-1.5
                  text-xs text-slate-400 hover:text-rose-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> {t.clearCart}
              </button>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}

      {unitPickerDrug && (
        <SaleUnitPicker
          drug={unitPickerDrug}
          onConfirm={handleUnitPickerConfirm}
          onClose={() => setUnitPickerDrug(null)}
        />
      )}

      {completedReceipt && (
        <ReceiptModal
          receipt={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
        />
      )}
    </div>
  );
};
