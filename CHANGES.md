# 📦 pharma-fixes — Changelog

## Files Changed (5 files)

### 🔴 HIGH FIXES

#### 1. `src/App.tsx`
**Bug:** `CatalogInitializer` was rendered *outside* `<LanguageProvider>`, so
any call to `useLang()` inside it would throw a context error on first run.

**Fix:** Wrapped the entire render tree (checking → need_catalog → ready)
inside a single `<LanguageProvider>` at the top level.

---

#### 2. `src/services/catalogLoader.ts`
**Bug A:** `lookupCatalogByBarcode()` function did not exist — the whole
barcode-to-catalog feature depended on it.

**Fix:** Added `lookupCatalogByBarcode(barcode)` using Dexie's indexed
`.where("barcode").equals(bc).first()` — O(log n), not O(n).

**Bug B:** Progress message said *"24,868 drugs"* but the mahmoudfalous
dataset has **26,562**.

**Bug C:** Prices up to 34,000,000 EGP were accepted from the raw JSON
(hospital infusions / data errors). These slip into the retail price field.

**Fix B+C:** Corrected the count in the progress string; added a 50,000 EGP
price cap — values above that are zeroed out so the cashier enters them manually.

---

#### 3. `src/pages/DrugFormPage.tsx`
**Bug:** The *"ابحث بالباركود"* button called `searchCatalog(code, 10)` — a
full-text filter scan across all 26 K records — instead of the fast indexed
lookup.

**New Feature:** Added camera scan button (🎥) directly in the barcode row.
Scanning triggers `lookupCatalogByBarcode()` and auto-fills the form instantly.

**Fix:** Replaced `searchCatalog` with `lookupCatalogByBarcode` for the
barcode button. Camera scan also uses the same indexed lookup.

---

#### 4. `src/pages/SalesPage.tsx`  *(largest change)*
**Bug A:** Only one drug per sale — no cart. Real pharmacy transactions have
5–10 items.

**Fix A:** Replaced `selectedDrug / quantity` state with a `cart: CartLine[]`
array. Right-hand column shows the live invoice with per-item qty controls,
subtotal rows, and a "Complete Sale" button that loops `recordSale()` for each
line atomically.

**Bug B:** When a barcode missed pharmacy stock, the app jumped straight to
the name-search catalog panel — skipping the instant catalog barcode lookup.

**Fix B:** Three-step waterfall on barcode scan:
```
1. getDrugByBarcode()       → in pharmacy stock? → add to cart instantly
2. lookupCatalogByBarcode() → in national catalog? → show QuickAdd panel
                              (name, company, price pre-filled; user adds qty + expiry)
3. else → open name-search CatalogSearch as before
```

---

### 🟡 MEDIUM FIX

#### 5. `src/db/index.ts`
**Issue:** DB stayed at version 2. While the `barcode` column was listed in
the Dexie schema string for `catalog`, the index was not guaranteed to be
rebuilt if the user's browser already had v2 data.

**Fix:** Bumped to version 3 with an explicit identical schema — Dexie
automatically rebuilds any missing indexes during the upgrade without wiping data.

---

#### 5b. `src/pages/ManagementPage.tsx`
**Issue:** Drug list had no search. With 500+ drugs the list became an
unusable scroll.

**Fix:** Added a `useMemo`-based `filteredDrugs` computed from a search input
in the panel header. Searches across name, nameAr, company, barcode,
and activeIngredient in real time.

---

## How to Apply

Copy each file from this ZIP into your project at the matching path:

```
pharma-fixes/
└── src/
    ├── App.tsx                       → src/App.tsx
    ├── db/index.ts                   → src/db/index.ts
    ├── services/catalogLoader.ts     → src/services/catalogLoader.ts
    └── pages/
        ├── DrugFormPage.tsx          → src/pages/DrugFormPage.tsx
        ├── ManagementPage.tsx        → src/pages/ManagementPage.tsx
        └── SalesPage.tsx             → src/pages/SalesPage.tsx
```

Then run:
```bash
npm run build   # or npm run dev
```

No other files need to change. `dbOperations.ts`, `Layout.tsx`,
`ReportsPage.tsx`, `InventoryPage.tsx`, `CatalogSearch.tsx`,
`BarcodeScanner.tsx`, and all context/utility files are **untouched**.
