# MEDISOL — Pharmacy PWA

تطبيق ويب تقدّمي (PWA) لإدارة الصيدليات، يعمل **offline-first** على التابلت أو الموبايل أو الكمبيوتر.  
مناسب للصيدليات المصرية: قاعدة أدوية وطنية، مسح باركود، مبيعات، مخزون، وتقارير.

---

## المحتويات

- [الميزات](#الميزات)
- [المتطلبات](#المتطلبات)
- [التثبيت والتشغيل](#التثبيت-والتشغيل)
- [أول تشغيل — قاعدة الأدوية المصرية](#أول-تشغيل--قاعدة-الأدوية-المصرية)
- [صفحات التطبيق](#صفحات-التطبيق)
- [النسخ الاحتياطي والاستعادة](#النسخ-الاحتياطي-والاستعادة)
- [قاعدة البيانات](#قاعدة-البيانات)
- [الاختبارات](#الاختبارات)
- [بناء نسخة الإنتاج](#بناء-نسخة-الإنتاج)
- [هيكل المشروع](#هيكل-المشروع)
- [التقنيات المستخدمة](#التقنيات-المستخدمة)
- [قيود معروفة](#قيود-معروفة)

---

## الميزات

| الميزة | الوصف |
|--------|--------|
| **مبيعات متعددة** | سلة فاتورة — بيع أكثر من دواء في عملية واحدة |
| **مسح باركود** | كاميرا الجهاز + بحث سريع في المخزون والكتالوج |
| **كتالوج مصري** | ~26,000 دواء من [eg-drugs](https://github.com/mahmoudfalous/eg-drugs) |
| **مخزون** | تتبع الكميات، تنبيهات نقص المخزون وانتهاء الصلاحية |
| **تقارير** | إيرادات، مبيعات، أدوية الأكثر مبيعاً |
| **offline** | بعد التحميل الأول، التطبيق يعمل بدون إنترنت |
| **PWA** | يمكن تثبيته على الشاشة الرئيسية مثل تطبيق native |
| **عربي / إنجليزي** | واجهة ثنائية اللغة (جزء من الصفحات لسه قيد الإكمال) |

---

## المتطلبات

- **Node.js** 18 أو أحدث (للتطوير والبناء)
- **npm** 9+
- متصفح حديث يدعم **IndexedDB** و**Service Workers**:
  - Chrome / Edge (موصى به)
  - Firefox
  - Safari (iOS 16.4+ للـ PWA)

---

## التثبيت والتشغيل

```bash
# 1. استنساخ المشروع
git clone <repo-url>
cd pharmacy-pwa-v2

# 2. تثبيت الحزم
npm install

# 3. تشغيل وضع التطوير
npm run dev
```

افتح الرابط الذي يظهر في الطرفية (عادة `http://localhost:5173`).

### أوامر أخرى

| الأمر | الوظيفة |
|-------|---------|
| `npm run dev` | خادم تطوير مع hot reload |
| `npm run build` | فحص TypeScript + بناء الإنتاج |
| `npm run preview` | معاينة نسخة الإنتاج محلياً |
| `npm test` | تشغيل الاختبارات |
| `npm run test:watch` | الاختبارات في وضع المراقبة |

---

## أول تشغيل — قاعدة الأدوية المصرية

عند فتح التطبيق **لأول مرة** (أو بعد تحديث إصدار الكتالوج):

1. يظهر شاشة **Catalog Initializer**
2. يُحمَّل ملف JSON من GitHub (~26,562 دواء)
3. تُحفظ البيانات في **IndexedDB** على الجهاز
4. بعدها التطبيق يعمل **offline** بالكامل

> **يتطلب اتصال إنترنت** في التحميل الأول فقط.  
> يمكن تخطي التحميل مؤقتاً، لكن البحث في الكتالوج الوطني لن يعمل.

**مصدر الكتالوج:**  
`https://raw.githubusercontent.com/mahmoudfalous/eg-drugs/main/data/eg_drugs.json`

**إصدار الكتالوج الحالي:** `2026-07` (يُخزَّن في `localStorage`)

---

## صفحات التطبيق

| المسار | الصفحة | الوظيفة |
|--------|--------|---------|
| `/` | المبيعات | مسح باركود، سلة، إتمام البيع |
| `/inventory` | المخزون | قائمة الأدوية، تنبيهات |
| `/reports` | التقارير | KPIs، تاريخ المبيعات، تصدير |
| `/management` | الإدارة | قائمة الأدوية، backup، حذف |
| `/management/add` | إضافة دواء | نموذج جديد + بحث كتالوج |
| `/management/edit/:id` | تعديل دواء | تعديل بيانات دواء موجود |

### تدفق مسح الباركود في المبيعات

```
1. البحث في مخزون الصيدلية     → موجود؟  → يُضاف للسلة
2. البحث في الكتالوج المصري    → موجود؟  → لوحة إضافة سريعة
3. غير موجود                   → بحث بالاسم في الكتالوج
```

---

## النسخ الاحتياطي والاستعادة

من صفحة **Management**:

### تصدير (Backup)

- زر **Export Data (Backup)**
- يُنزَّل ملف JSON: `pharmacy-backup-YYYY-MM-DD.json`
- **يشمل:** الأدوية + سجل المبيعات
- **لا يشمل:** كتالوج الأدوية المصرية (يُحمَّل منفصلاً)

### استيراد (Restore)

- زر **Import Data (Restore)** → اختر ملف `.json`
- الأدوية والمبيعات تُدمَج في قاعدة البيانات المحلية
- السجلات بنفس `id` تُستبدَل (upsert)

### مسح كل البيانات

- زر **Clear All Data** — يحذف **الأدوية والمبيعات فقط**
- **لا يحذف** الكتالوج المصري
- **لا يمكن التراجع** — اعمل backup قبل المسح

> **نصيحة:** اعمل backup أسبوعياً على الأقل، وقبل أي تحديث للتطبيق.

---

## قاعدة البيانات

التطبيق يستخدم **Dexie.js** (IndexedDB) باسم `PharmacyDB`.

### الجداول

| الجدول | المفتاح | المحتوى |
|--------|---------|---------|
| `drugs` | `id` (UUID string) | مخزون الصيدلية |
| `sales` | `id` (UUID string) | سجل المبيعات |
| `catalog` | `id` (auto-increment) | الكتالوج المصري |

### إصدارات Schema

| الإصدار | التغيير |
|---------|---------|
| v2 | Schema أولي |
| v3 | إعادة بناء index البarcode في الكتالوج |
| v4 | تحويل `drugs` و`sales` إلى UUID string PK |

> عند التحديث من v3 → v4، الترحيل يتم **تلقائياً** مع الحفاظ على البيانات.

### طبقة البيانات

```
src/db/index.ts          ← Schema + Dexie instance
src/utils/dbOperations.ts ← CRUD, sales, import/export
src/utils/id.ts           ← generateId(), ensureStringId()
src/services/catalogLoader.ts ← تحميل الكتالوج المصري
```

---

## الاختبارات

```bash
npm test
```

### ما الذي تُغطيه الاختبارات؟

- إنشاء UUID وتحويل IDs القديمة (`src/utils/id.test.ts`)
- CRUD للأدوية (`addDrug`, `updateDrug`, `deleteDrug`, `getDrugByBarcode`)
- تسجيل المبيعات ونقص المخزون (`recordSale`)
- رفض بيع بمخزون غير كافٍ أو بيانات غير صالحة
- تصدير → استيراد round-trip
- التحقق من schema UUID

**16 اختبار** — تشغَّل في Node.js مع `fake-indexeddb` (بدون متصفح).

---

## بناء نسخة الإنتاج

```bash
npm run build
```

الملفات الناتجة في مجلد `dist/`:

- `index.html` + JS/CSS مُجمَّع
- `sw.js` — Service Worker للعمل offline
- `manifest.webmanifest` — لإعدادات PWA

```bash
npm run preview   # معاينة dist/ محلياً
```

### تثبيت PWA على الجهاز

1. افتح التطبيق في Chrome
2. قائمة المتصفح → **Install app** / **Add to Home Screen**
3. التطبيق يظهر كأيقونة مستقلة

---

## هيكل المشروع

```
pharmacy-pwa-v2/
├── public/                  # أيقونات ثابتة
├── src/
│   ├── main.tsx             # نقطة الدخول
│   ├── App.tsx              # Router + bootstrap الكتالوج
│   ├── components/
│   │   ├── Layout.tsx       # الشريط الجانبي + التنقل
│   │   ├── BarcodeScanner.tsx
│   │   ├── CatalogSearch.tsx
│   │   └── CatalogInitializer.tsx
│   ├── contexts/
│   │   └── LanguageContext.tsx  # i18n EN/AR
│   ├── db/
│   │   └── index.ts         # Dexie schema
│   ├── pages/
│   │   ├── SalesPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── ManagementPage.tsx
│   │   └── DrugFormPage.tsx
│   ├── services/
│   │   └── catalogLoader.ts
│   ├── utils/
│   │   ├── dbOperations.ts
│   │   ├── format.ts
│   │   └── id.ts
│   └── test/
│       ├── setup.ts         # fake-indexeddb للاختبارات
│       └── fixtures.ts      # بيانات تجريبية
├── vite.config.ts           # Vite + PWA plugin + Vitest
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|--------|---------|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | react-router-dom 6 |
| Styling | Tailwind CSS 3 |
| Database | Dexie 3 + dexie-react-hooks |
| PWA | vite-plugin-pwa (Workbox) |
| Barcode | html5-qrcode |
| Dates | date-fns |
| Icons | lucide-react |
| Tests | Vitest + fake-indexeddb |

---

## قيود معروفة

| القيد | التفاصيل |
|-------|----------|
| **لا يوجد تسجيل دخول** | أي شخص يفتح التطبيق له صلاحية كاملة |
| **جهاز واحد** | لا توجد مزامنة سحابية بين أجهزة |
| **الكتالوج خارجي** | التحميل الأول يعتمد على GitHub |
| **Backup جزئي** | لا يشمل الكتالوج المصري |
| **i18n غير مكتمل** | بعض الصفحات (Management, DrugForm) ما زالت بالإنجليزية |
| **لا يوجد طباعة فاتورة** | قيد التخطيط |

---

## التطوير — نصائح سريعة

1. **قبل أي commit مهم:** `npm test && npm run build`
2. **بعد تغيير schema Dexie:** أضف `version(N+1)` مع `.upgrade()` — لا تمسح بيانات المستخدمين
3. **بعد تغيير الكتالوج:** حدّث `CATALOG_VERSION` في `catalogLoader.ts`
4. **لا تُتتبَّع** مجلد `dist/` أو `dev-dist/` في Git

---

## الترخيص

مشروع خاص (`"private": true` في `package.json`).
