import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Save, ArrowRight, Sparkles, Camera } from "lucide-react";
import { CatalogSearch } from "../components/CatalogSearch";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { addDrug, updateDrug, getDrugById } from "../utils/dbOperations";
import { lookupCatalogByBarcode } from "../services/catalogLoader";
import { DrugCatalog } from "../db";
import { useLang } from "../contexts/LanguageContext";

type FormState = {
  barcode: string;
  name: string;
  nameAr: string;
  activeIngredient: string;
  company: string;
  price: string;
  costPrice: string;
  stripsPerBox: string;
  stripPrice: string;
  stock: string;
  expiryDate: string;
};

const EMPTY: FormState = {
  barcode: "",
  name: "",
  nameAr: "",
  activeIngredient: "",
  company: "",
  price: "",
  costPrice: "",
  stripsPerBox: "1",
  stripPrice: "",
  stock: "",
  expiryDate: "",
};

export const DrugFormPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;
  const initBarcode = location.state?.barcode ?? "";

  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    barcode: initBarcode,
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [stripPriceManual, setStripPriceManual] = useState(false);
  const [flash, setFlash] = useState("");
  const [flashErr, setFlashErr] = useState("");
  const [catalogFilled, setCatalogFilled] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "looking" | "found" | "notfound"
  >("idle");

  const calcStripPrice = (priceStr: string, stripsStr: string): string => {
    const p = parseFloat(priceStr);
    const spb = parseInt(stripsStr, 10);
    if (!Number.isFinite(p) || p <= 0 || !Number.isInteger(spb) || spb < 1) {
      return "";
    }
    return Number((p / spb).toFixed(2)).toString();
  };

  useEffect(() => {
    if (isEdit && id) loadDrug(id);
  }, [id]);

  const loadDrug = async (drugId: string) => {
    const drug = await getDrugById(drugId);
    if (drug) {
      const priceStr = drug.price.toString();
      const spbStr = (drug.stripsPerBox ?? 1).toString();
      const autoPrice = calcStripPrice(priceStr, spbStr);
      const loadedStrip = drug.stripPrice != null ? drug.stripPrice.toString() : "";
      setStripPriceManual(loadedStrip !== "" && loadedStrip !== autoPrice);
      setForm({
        barcode: drug.barcode,
        name: drug.name,
        nameAr: drug.nameAr ?? "",
        activeIngredient: drug.activeIngredient,
        company: drug.company,
        price: priceStr,
        costPrice: drug.costPrice != null ? drug.costPrice.toString() : "",
        stripsPerBox: spbStr,
        stripPrice: loadedStrip || autoPrice,
        stock: drug.stock.toString(),
        expiryDate: drug.expiryDate,
      });
    }
  };

  const fillFromCatalog = (drug: DrugCatalog) => {
    setForm((prev) => {
      const nextPrice = drug.price_egp > 0 ? drug.price_egp.toString() : prev.price;
      return {
        ...prev,
        name: drug.commercial_name_en,
        nameAr: drug.commercial_name_ar,
        activeIngredient: drug.scientific_composition,
        company: drug.manufacturer,
        price: nextPrice,
        stripPrice: stripPriceManual
          ? prev.stripPrice
          : calcStripPrice(nextPrice, prev.stripsPerBox),
        barcode: drug.barcode || prev.barcode,
      };
    });
    setCatalogFilled(true);
    setErrors({});
  };

  const handleBarcodeLookup = async () => {
    const code = form.barcode.trim();
    if (!code) {
      setFlashErr(t.barcodeEmpty);
      setTimeout(() => setFlashErr(""), 2500);
      return;
    }
    setScanStatus("looking");
    const hit = await lookupCatalogByBarcode(code);
    if (hit) {
      fillFromCatalog(hit);
      setScanStatus("found");
      setFlash(t.catalogFoundFromCatalog);
      setTimeout(() => setFlash(""), 2500);
    } else {
      setScanStatus("notfound");
      setFlashErr(t.barcodeNoResult);
      setTimeout(() => setFlashErr(""), 3000);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    setForm((p) => ({ ...p, barcode }));
    setScanStatus("looking");
    const hit = await lookupCatalogByBarcode(barcode);
    if (hit) {
      fillFromCatalog(hit);
      setScanStatus("found");
    } else {
      setScanStatus("notfound");
    }
  };

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.barcode.trim()) e.barcode = t.required;
    if (!form.name.trim()) e.name = t.required;
    if (!form.activeIngredient.trim()) e.activeIngredient = t.required;
    if (!form.company.trim()) e.company = t.required;
    if (!form.price || +form.price <= 0) e.price = t.priceMustBePositive;
    if (form.costPrice !== "" && (+form.costPrice < 0 || Number.isNaN(+form.costPrice))) {
      e.costPrice = t.priceMustBePositive;
    }
    if (form.stripsPerBox === "" || +form.stripsPerBox < 1 || !Number.isInteger(+form.stripsPerBox)) {
      e.stripsPerBox = t.required;
    }
    if (form.stripPrice !== "" && (+form.stripPrice < 0 || Number.isNaN(+form.stripPrice))) {
      e.stripPrice = t.priceMustBePositive;
    }
    if (form.stock === "" || +form.stock < 0) e.stock = t.required;
    if (!form.expiryDate) e.expiryDate = t.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      barcode: form.barcode.trim(),
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      activeIngredient: form.activeIngredient.trim(),
      company: form.company.trim(),
      price: parseFloat(form.price),
      costPrice: form.costPrice === "" ? 0 : parseFloat(form.costPrice),
      stripsPerBox: Math.max(1, parseInt(form.stripsPerBox, 10) || 1),
      stripPrice: form.stripPrice === "" ? undefined : parseFloat(form.stripPrice),
      stock: parseInt(form.stock),
      expiryDate: form.expiryDate,
    };
    try {
      isEdit && id ? await updateDrug(id, payload) : await addDrug(payload);
      setFlash(isEdit ? t.saveSuccess : t.addSuccess);
      setTimeout(() => navigate("/management"), 1200);
    } catch {
      setFlashErr(t.saveError);
    }
  };

  const field = (
    key: keyof FormState,
    label: string,
    type = "text",
    extras?: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 text-end">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        dir="auto"
        onChange={(e) => {
          const rawValue = e.target.value;
          const formattedValue =
            key === "expiryDate"
              ? rawValue
                .replace(/\D/g, "")
                .replace(/^([0-9]{2})([0-9]*)$/, "$1/$2")
                .slice(0, 7)
              : rawValue;

          if (key === "stripPrice") {
            setStripPriceManual(formattedValue !== "");
          }

          setForm((p) => {
            const next = { ...p, [key]: formattedValue };
            if ((key === "price" || key === "stripsPerBox") && !stripPriceManual) {
              next.stripPrice = calcStripPrice(next.price, next.stripsPerBox);
            }
            return next;
          });
          if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
          if (key === "barcode") setScanStatus("idle");
        }}
        className={`field-input text-end ${errors[key] ? "border-red-500" : ""}`}
        {...extras}
      />
      {errors[key] && (
        <p className="text-red-500 text-xs mt-1 text-end">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="page-title">{isEdit ? t.editDrug : t.addNewDrugTitle}</h1>
        <p className="page-subtitle">{t.formSubtitle}</p>
      </div>

      <div className="panel-pad space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/management")}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          >
            <ArrowRight className={`w-5 h-5 ${isRtl ? '' : 'rotate-180'}`} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? t.editDrug : t.addNewDrugTitle}
          </h1>
        </div>

        {flash && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-end text-sm text-emerald-800">
            {flash}
          </div>
        )}
        {flashErr && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-end text-sm text-rose-800">
            {flashErr}
          </div>
        )}

        {!isEdit && (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 justify-end text-blue-700">
              <span className="font-bold text-sm">{t.catalogSearchTitle}</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <CatalogSearch
              onSelect={fillFromCatalog}
              placeholder={t.catalogSearchPlaceholder}
            />
            {catalogFilled && (
              <p className="text-xs text-blue-600 text-end">{t.catalogFilled}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-end">
              {t.barcodeField}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.barcode}
                dir="ltr"
                onChange={(e) => {
                  setForm((p) => ({ ...p, barcode: e.target.value }));
                  setScanStatus("idle");
                  if (errors.barcode) setErrors((p) => ({ ...p, barcode: "" }));
                }}
                className={`field-input flex-1 font-mono ${errors.barcode ? "border-red-500" : ""}`}
                placeholder={t.barcodePlaceholder}
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="secondary-btn px-3 shrink-0"
                title={t.scanWithCamera}
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleBarcodeLookup}
                className="primary-btn px-4 shrink-0"
              >
                {t.searchBtn}
              </button>
            </div>

            {scanStatus === "looking" && (
              <p className="text-xs text-blue-600 mt-1 text-end animate-pulse">{t.lookingUp}</p>
            )}
            {scanStatus === "found" && (
              <p className="text-xs text-green-600 mt-1 text-end">{t.foundAutoFill}</p>
            )}
            {scanStatus === "notfound" && (
              <p className="text-xs text-amber-600 mt-1 text-end">{t.notFoundManual}</p>
            )}
            {errors.barcode && (
              <p className="text-red-500 text-xs mt-1 text-end">{errors.barcode}</p>
            )}
          </div>

          {field("name", t.nameEn)}
          {field("nameAr", t.nameAr)}
          {field("activeIngredient", t.composition)}
          {field("company", t.manufacturer)}

          <div className="grid grid-cols-2 gap-4">
            {field("price", t.priceField, "number", {
              step: "0.01",
              min: "0",
            })}
            {field("costPrice", t.costPriceField, "number", {
              step: "0.01",
              min: "0",
              placeholder: "0",
            })}
          </div>
          <p className="text-xs text-slate-500 text-end -mt-2">{t.costPriceHint}</p>

          <div className="grid grid-cols-2 gap-4">
            {field("stripsPerBox", t.stripsPerBoxField, "number", { min: "1", step: "1" })}
            {field("stripPrice", t.stripPriceField, "number", {
              step: "0.01",
              min: "0",
              placeholder: "0",
            })}
          </div>
          <p className="text-xs text-slate-500 text-end -mt-2">{t.stripPriceHint}</p>

          <div className="grid grid-cols-2 gap-4">
            {field("stock", t.stockField, "number", { min: "0" })}
            {field("expiryDate", t.expiryField, "text", {
              placeholder: t.expiryPlaceholder,
              inputMode: "numeric",
              maxLength: 7,
            })}
          </div>
          <p className="text-xs text-slate-500 text-end -mt-2">{t.stockInStripsHint}</p>

          <button type="submit" className="primary-btn mt-2 w-full py-3">
            <Save className="w-5 h-5" />
            {isEdit ? t.saveChanges : t.addDrugBtn}
          </button>
        </form>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
