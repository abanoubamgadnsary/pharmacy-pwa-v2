import React, { useState } from 'react';
import { Camera, Search, Minus, Plus, ShoppingBag, BookOpen, X } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { CatalogSearch } from '../components/CatalogSearch';
import { getDrugByBarcode, searchDrugs, recordSale, addDrug, getDrugById } from '../utils/dbOperations';
import { formatEgp } from '../utils/format';
import { Drug, DrugCatalog } from '../db';
import { useLang } from '../contexts/LanguageContext';

type FlashMsg = { type: 'success' | 'error' | 'info'; text: string };

export const SalesPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const [showScanner, setShowScanner]           = useState(false);
  const [searchQuery, setSearchQuery]           = useState('');
  const [searchResults, setSearchResults]       = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug]         = useState<Drug | null>(null);
  const [quantity, setQuantity]                 = useState(1);
  const [flash, setFlash]                       = useState<FlashMsg | null>(null);

  // catalog search state (shown when barcode not found)
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);
  const [scannedBarcode, setScannedBarcode]       = useState('');

  // ── helpers ────────────────────────────────────────────────────────────────

  const showMsg = (type: FlashMsg['type'], text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 3500);
  };

  // ── barcode scanned ────────────────────────────────────────────────────────

  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    const drug = await getDrugByBarcode(barcode);
    if (drug) {
      setSelectedDrug(drug);
      setQuantity(1);
    } else {
      // not in pharmacy stock — show catalog search to identify + add
      setScannedBarcode(barcode);
      setShowCatalogSearch(true);
      showMsg('info', `${t.barcodeNotFound} — ${barcode}`);
    }
  };

  // ── user picked a drug from the national catalog ───────────────────────────

  const handleCatalogSelect = async (catalogDrug: DrugCatalog) => {
    setShowCatalogSearch(false);

    // auto-add it to the pharmacy's stock with barcode, price from catalog
    await addDrug({
      barcode:          scannedBarcode,
      name:             catalogDrug.commercial_name_en,
      nameAr:           catalogDrug.commercial_name_ar,
      activeIngredient: catalogDrug.scientific_composition,
      company:          catalogDrug.manufacturer,
      price:            catalogDrug.price_egp || 0,
      stock:            0,           // stock 0 — cashier should update
      expiryDate:       '',
    });

    // re-fetch the newly created drug
    const newDrug = await getDrugByBarcode(scannedBarcode);
    if (newDrug) {
      setSelectedDrug(newDrug);
      setQuantity(1);
      showMsg('success', t.drugAdded(catalogDrug.commercial_name_en));
    }
    setScannedBarcode('');
  };

  // ── manual search inside existing pharmacy stock ───────────────────────────

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) setSearchResults(await searchDrugs(q));
    else setSearchResults([]);
  };

  const handleSelectDrug = (drug: Drug) => {
    setSelectedDrug(drug);
    setQuantity(1);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ── complete sale ──────────────────────────────────────────────────────────

  const handleSell = async () => {
    if (!selectedDrug) return;
    if (quantity > selectedDrug.stock) {
      showMsg('error', t.qtyExceedsStock);
      return;
    }
    try {
      await recordSale(selectedDrug.id!, selectedDrug.name, quantity, selectedDrug.price);
      showMsg('success', t.saleDone(quantity, selectedDrug.name));
      // Re-fetch drug so displayed stock is fresh (Bug #2 fix)
      const updatedDrug = await getDrugById(selectedDrug.id!);
      setSelectedDrug(updatedDrug ?? null);
      setQuantity(1);
    } catch {
      showMsg('error', t.saleError);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="page-title">{t.salesTitle}</h1>
        <p className="page-subtitle">{t.salesSubtitle}</p>
      </div>

      {/* Flash message */}
      {flash && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${
          flash.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
          flash.type === 'error'   ? 'border-rose-200 bg-rose-50 text-rose-800'   :
                                     'border-blue-200 bg-blue-50 text-blue-800'
        }`}>
          {flash.text}
        </div>
      )}

      {/* Scan button */}
      <div className="panel-pad">
        <button
          onClick={() => setShowScanner(true)}
          className="primary-btn w-full py-4 text-base"
        >
          <Camera className="w-6 h-6" />
          {t.scanBarcode}
        </button>
      </div>

      {/* Catalog search panel (appears after failed barcode scan) */}
      {showCatalogSearch && (
        <div className="panel-pad border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setShowCatalogSearch(false)} aria-label="Close catalog search">
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
            <div className="flex items-center gap-2 text-blue-700">
              <span className="font-bold text-sm">{t.searchCatalogTitle}</span>
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <CatalogSearch onSelect={handleCatalogSelect} autoFocus />
          <p className="text-xs text-gray-400 text-end mt-2">
            {t.barcodeLabel}: <span className="font-mono">{scannedBarcode}</span> — {t.catalogLinked}
          </p>
        </div>
      )}

      {/* Manual search in pharmacy stock */}
      <div className="panel-pad">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t.searchInStock}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="field-input ps-10"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            {searchResults.map((drug) => (
              <button
                key={drug.id}
                onClick={() => handleSelectDrug(drug)}
                className="w-full border-b border-slate-100 p-3 text-start transition-colors last:border-b-0 hover:bg-[#f4fbf6]"
              >
                <div className="font-semibold text-gray-900 text-sm">{drug.name}</div>
                {drug.nameAr && (
                  <div className="text-gray-500 text-xs">{drug.nameAr}</div>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className={drug.stock < 10 ? 'text-red-600 font-bold' : ''}>
                    {t.stockLabel}: {drug.stock}
                  </span>
                  <span className="text-emerald-600 font-bold">{formatEgp(drug.price)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected drug card */}
      {selectedDrug && (
        <div className="panel-pad space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <button onClick={() => setSelectedDrug(null)} aria-label="Clear selection">
              <X className="w-5 h-5 text-gray-400 hover:text-red-500" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 text-end">
              {selectedDrug.name}
            </h2>
          </div>

          {selectedDrug.nameAr && (
            <p className="text-end text-gray-600 text-sm">{selectedDrug.nameAr}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: t.activeIngredient, value: selectedDrug.activeIngredient },
              { label: t.company,          value: selectedDrug.company          },
              { label: t.barcode,          value: selectedDrug.barcode          },
              { label: t.stockLabel,       value: `${selectedDrug.stock} ${t.units}`, highlight: selectedDrug.stock < 10 },
            ].map((r) => (
              <div key={r.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-end">
                <div className="text-xs text-gray-500">{r.label}</div>
                <div className={`font-semibold mt-0.5 ${r.highlight ? 'text-red-600' : 'text-gray-900'}`}>
                  {r.value}
                </div>
              </div>
            ))}
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 text-end">{t.quantityLabel}</label>
            <div className="flex items-center gap-4 justify-center">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                aria-label="Decrease quantity"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number" min="1" max={selectedDrug.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="field-input w-20 text-center text-xl font-bold"
              />
              <button
                onClick={() => setQuantity(Math.min(selectedDrug.stock, quantity + 1))}
                className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                aria-label="Increase quantity"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="rounded-lg border border-[#ccefb9] bg-[#f7ffe6] p-4 text-end">
            <div className="text-sm text-gray-600">{t.total}</div>
            <div className="text-3xl font-bold text-emerald-600">
              {formatEgp(quantity * selectedDrug.price)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {quantity} × {formatEgp(selectedDrug.price)}
            </div>
          </div>

          <button
            onClick={handleSell}
            disabled={selectedDrug.stock === 0}
            className="primary-btn w-full py-4 text-base"
          >
            <ShoppingBag className="w-5 h-5" />
            {t.completeSale}
          </button>

          {selectedDrug.stock === 0 && (
            <p className="text-center text-red-500 text-sm">
              {t.outOfStock}
            </p>
          )}
        </div>
      )}

      {/* Scanner modal */}
      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
};
