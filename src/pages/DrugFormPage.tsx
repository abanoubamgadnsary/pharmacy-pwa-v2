import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, ArrowRight, Sparkles, Camera } from 'lucide-react';
import { CatalogSearch }       from '../components/CatalogSearch';
import { BarcodeScanner }      from '../components/BarcodeScanner';
import { addDrug, updateDrug, getDrugById } from '../utils/dbOperations';
import { lookupCatalogByBarcode }            from '../services/catalogLoader';  // FIX #3
import { DrugCatalog } from '../db';

type FormState = {
  barcode: string; name: string; nameAr: string;
  activeIngredient: string; company: string;
  price: string; stock: string; expiryDate: string;
};

const EMPTY: FormState = {
  barcode: '', name: '', nameAr: '',
  activeIngredient: '', company: '',
  price: '', stock: '', expiryDate: '',
};

export const DrugFormPage: React.FC = () => {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const location    = useLocation();
  const isEdit      = !!id;
  const initBarcode = location.state?.barcode ?? '';

  const [form, setForm]           = useState<FormState>({ ...EMPTY, barcode: initBarcode });
  const [errors, setErrors]       = useState<Partial<FormState>>({});
  const [flash, setFlash]         = useState('');
  const [flashErr, setFlashErr]   = useState('');
  const [catalogFilled, setCatalogFilled] = useState(false);
  const [showScanner, setShowScanner]     = useState(false);
  const [scanStatus, setScanStatus]       = useState<'idle' | 'looking' | 'found' | 'notfound'>('idle');

  useEffect(() => {
    if (isEdit && id) loadDrug(id);
  }, [id]);

  const loadDrug = async (drugId: string) => {
    const drug = await getDrugById(drugId);
    if (drug)
      setForm({
        barcode: drug.barcode, name: drug.name, nameAr: drug.nameAr ?? '',
        activeIngredient: drug.activeIngredient, company: drug.company,
        price: drug.price.toString(), stock: drug.stock.toString(),
        expiryDate: drug.expiryDate,
      });
  };

  // Shared fill function — called by both name-search and barcode lookup
  const fillFromCatalog = (drug: DrugCatalog) => {
    setForm((prev) => ({
      ...prev,
      name:             drug.commercial_name_en,
      nameAr:           drug.commercial_name_ar,
      activeIngredient: drug.scientific_composition,
      company:          drug.manufacturer,
      price:            drug.price_egp > 0 ? drug.price_egp.toString() : prev.price,
      // Pre-fill barcode from catalog if the field is still empty
      barcode:          prev.barcode || drug.barcode || prev.barcode,
    }));
    setCatalogFilled(true);
    setErrors({});
  };

  // FIX #3 — indexed lookup, not text search
  const handleBarcodeLookup = async () => {
    const code = form.barcode.trim();
    if (!code) {
      setFlashErr('أدخل الباركود أولاً');
      setTimeout(() => setFlashErr(''), 2500);
      return;
    }
    setScanStatus('looking');
    const hit = await lookupCatalogByBarcode(code);   // O(log n) index lookup
    if (hit) {
      fillFromCatalog(hit);
      setScanStatus('found');
      setFlash('✅ تم إيجاد الدواء من الكتالوج');
      setTimeout(() => setFlash(''), 2500);
    } else {
      setScanStatus('notfound');
      setFlashErr('⚠ الباركود غير موجود في قاعدة البيانات');
      setTimeout(() => setFlashErr(''), 3000);
    }
  };

  // Camera scan → barcode → instant catalog lookup
  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    setForm((p) => ({ ...p, barcode }));
    setScanStatus('looking');
    const hit = await lookupCatalogByBarcode(barcode);
    if (hit) {
      fillFromCatalog(hit);
      setScanStatus('found');
    } else {
      setScanStatus('notfound');
    }
  };

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.barcode.trim())         e.barcode = 'مطلوب';
    if (!form.name.trim())            e.name    = 'مطلوب';
    if (!form.activeIngredient.trim())e.activeIngredient = 'مطلوب';
    if (!form.company.trim())         e.company = 'مطلوب';
    if (!form.price || +form.price <= 0) e.price = 'يجب أن يكون أكبر من 0';
    if (form.stock === '' || +form.stock < 0) e.stock = 'مطلوب';
    if (!form.expiryDate)             e.expiryDate = 'مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      barcode: form.barcode.trim(), name: form.name.trim(),
      nameAr: form.nameAr.trim(), activeIngredient: form.activeIngredient.trim(),
      company: form.company.trim(), price: parseFloat(form.price),
      stock: parseInt(form.stock), expiryDate: form.expiryDate,
    };
    try {
      isEdit && id ? await updateDrug(id, payload) : await addDrug(payload);
      setFlash(isEdit ? '✅ تم التحديث' : '✅ تمت الإضافة');
      setTimeout(() => navigate('/management'), 1200);
    } catch {
      setFlashErr('حصل خطأ — حاول تاني');
    }
  };

  const field = (
    key: keyof FormState, label: string, type = 'text',
    extras?: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">{label}</label>
      <input
        type={type} value={form[key]} dir="auto"
        onChange={(e) => {
          setForm((p) => ({ ...p, [key]: e.target.value }));
          if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }));
          if (key === 'barcode') setScanStatus('idle');
        }}
        className={`field-input text-right ${errors[key] ? 'border-red-500' : ''}`}
        {...extras}
      />
      {errors[key] && <p className="text-red-500 text-xs mt-1 text-right">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">{isEdit ? 'Edit Drug' : 'Add New Drug'}</h1>
        <p className="page-subtitle">Keep catalog, barcode, pricing, and stock details accurate.</p>
      </div>

      <div className="panel-pad space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/management')}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'تعديل دواء' : 'إضافة دواء جديد'}
          </h1>
        </div>

        {flash    && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-right text-sm text-emerald-800">{flash}</div>}
        {flashErr && <div className="rounded-lg border border-rose-200   bg-rose-50   p-3 text-right text-sm text-rose-800">{flashErr}</div>}

        {/* Catalog name-search (new drugs only) */}
        {!isEdit && (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 justify-end text-blue-700">
              <span className="font-bold text-sm">ابحث من قاعدة الأدوية المصرية</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <CatalogSearch onSelect={fillFromCatalog}
              placeholder="اكتب اسم الدواء وهيتملى تلقائيًا…" />
            {catalogFilled && (
              <p className="text-xs text-blue-600 text-right">
                ✅ تم ملء البيانات — راجعها وأضف الكمية وتاريخ الانتهاء
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Barcode row — FIX #3: uses indexed lookup, not text search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
              الباركود *
            </label>
            <div className="flex gap-2">
              <input
                type="text" value={form.barcode} dir="ltr"
                onChange={(e) => {
                  setForm((p) => ({ ...p, barcode: e.target.value }));
                  setScanStatus('idle');
                  if (errors.barcode) setErrors((p) => ({ ...p, barcode: '' }));
                }}
                className={`field-input flex-1 font-mono ${errors.barcode ? 'border-red-500' : ''}`}
                placeholder="اكتب أو امسح الباركود…"
              />
              {/* Camera scan button */}
              <button type="button" onClick={() => setShowScanner(true)}
                className="secondary-btn px-3 shrink-0" title="مسح بالكاميرا">
                <Camera className="w-5 h-5" />
              </button>
              {/* Index lookup button (replaces old text search) */}
              <button type="button" onClick={handleBarcodeLookup}
                className="primary-btn px-4 shrink-0">
                بحث
              </button>
            </div>

            {/* Scan status feedback */}
            {scanStatus === 'looking'  && <p className="text-xs text-blue-600  mt-1 text-right animate-pulse">⏳ جاري البحث في قاعدة البيانات…</p>}
            {scanStatus === 'found'    && <p className="text-xs text-green-600 mt-1 text-right">✓ تم إيجاد الدواء — جميع البيانات مملوءة تلقائيًا</p>}
            {scanStatus === 'notfound' && <p className="text-xs text-amber-600 mt-1 text-right">⚠ الباركود غير موجود في القاعدة — أكمل البيانات يدوياً</p>}
            {errors.barcode && <p className="text-red-500 text-xs mt-1 text-right">{errors.barcode}</p>}
          </div>

          {field('name',             'اسم الدواء (إنجليزي) *')}
          {field('nameAr',           'اسم الدواء (عربي)')}
          {field('activeIngredient', 'التركيب العلمي *')}
          {field('company',          'الشركة المنتجة *')}

          <div className="grid grid-cols-2 gap-4">
            {field('price', 'السعر (ج.م) *', 'number', { step: '0.01', min: '0' })}
            {field('stock', 'الكمية *',       'number', { min: '0' })}
          </div>

          {field('expiryDate', 'تاريخ الانتهاء *', 'date')}

          <button type="submit" className="primary-btn mt-2 w-full py-3">
            <Save className="w-5 h-5" />
            {isEdit ? 'حفظ التعديلات' : 'إضافة الدواء'}
          </button>
        </form>
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
};
