import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, ArrowRight, Sparkles } from 'lucide-react';
import { CatalogSearch } from '../components/CatalogSearch';
import { addDrug, updateDrug, getDrugById } from '../utils/dbOperations';
import { searchCatalog } from '../services/catalogLoader';
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

  const [form, setForm]       = useState<FormState>({ ...EMPTY, barcode: initBarcode });
  const [errors, setErrors]   = useState<Partial<FormState>>({});
  const [flash, setFlash]     = useState('');
  const [flashErr, setFlashErr] = useState('');
  const [catalogFilled, setCatalogFilled] = useState(false);

  useEffect(() => {
    if (isEdit && id) loadDrug(id);
  }, [id]);

  const loadDrug = async (drugId: string) => {
    const drug = await getDrugById(drugId);
    if (drug)
      setForm({
        barcode: drug.barcode,
        name:    drug.name,
        nameAr:  drug.nameAr ?? '',
        activeIngredient: drug.activeIngredient,
        company: drug.company,
        price:   drug.price.toString(),
        stock:   drug.stock.toString(),
        expiryDate: drug.expiryDate,
      });
  };

  // ── fill form from catalog selection ────────────────────────────────────────

  const handleCatalogSelect = (drug: DrugCatalog) => {
    setForm((prev) => ({
      ...prev,
      name:            drug.commercial_name_en,
      nameAr:          drug.commercial_name_ar,
      activeIngredient: drug.scientific_composition,
      company:         drug.manufacturer,
      price:           drug.price_egp > 0 ? drug.price_egp.toString() : prev.price,
    }));
    setCatalogFilled(true);
    setErrors({});
  };

  // ── validation ───────────────────────────────────────────────────────────────

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
      barcode:          form.barcode.trim(),
      name:             form.name.trim(),
      nameAr:           form.nameAr.trim(),
      activeIngredient: form.activeIngredient.trim(),
      company:          form.company.trim(),
      price:            parseFloat(form.price),
      stock:            parseInt(form.stock),
      expiryDate:       form.expiryDate,
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
    key: keyof FormState,
    label: string,
    type = 'text',
    extras?: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => {
          setForm((p) => ({ ...p, [key]: e.target.value }));
          if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }));
        }}
        dir="auto"
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

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/management')}
            className="rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'تعديل دواء' : 'إضافة دواء جديد'}
          </h1>
        </div>

        {flash    && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-right text-sm text-emerald-800">{flash}</div>}
        {flashErr && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-right text-sm text-rose-800">{flashErr}</div>}

        {/* ── Catalog autocomplete (only for new drugs) ── */}
        {!isEdit && (
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 justify-end text-blue-700">
              <span className="font-bold text-sm">ابحث من قاعدة الأدوية المصرية</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <CatalogSearch
              onSelect={handleCatalogSelect}
              placeholder="اكتب اسم الدواء وهيتملى تلقائيًا…"
            />
            {catalogFilled && (
              <p className="text-xs text-blue-600 text-right">
                ✅ تم ملء البيانات — راجعها وأضف الكمية وتاريخ الانتهاء
              </p>
            )}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الباركود *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => {
                  setForm((p) => ({ ...p, barcode: e.target.value }));
                  if (errors.barcode) setErrors((p) => ({ ...p, barcode: '' }));
                }}
                dir="auto"
                className={`field-input text-right flex-1 ${errors.barcode ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={async () => {
                  const code = form.barcode.trim();
                  if (!code) { setFlashErr('أدخل باركود للبحث'); setTimeout(() => setFlashErr(''), 2500); return; }
                  try {
                    const hits = await searchCatalog(code, 10);
                    if (!hits || hits.length === 0) {
                      setFlashErr('ما فيش نتيجة بالباركود ده');
                      setTimeout(() => setFlashErr(''), 2500);
                      return;
                    }
                    const exact = hits.find(h => (h.barcode || '').toString().trim() === code) ?? hits[0];
                    handleCatalogSelect(exact);
                    setFlash('✅ تم إيجاد مطابقة من الكتالوج');
                    setTimeout(() => setFlash(''), 2500);
                  } catch (err) {
                    setFlashErr('حصل خطأ أثناء البحث');
                    setTimeout(() => setFlashErr(''), 2500);
                  }
                }}
                className="px-3 py-2 rounded-md bg-blue-600 text-white"
              >
                ابحث بالباركود
              </button>
            </div>
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

          <button
            type="submit"
            className="primary-btn mt-2 w-full py-3"
          >
            <Save className="w-5 h-5" />
            {isEdit ? 'حفظ التعديلات' : 'إضافة الدواء'}
          </button>
        </form>
      </div>
    </div>
  );
};
