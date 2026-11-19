# 💊 Pharma Redesign — دليل التطبيق

تصميم جديد بالكامل مستوحى من الهوية البصرية للصناعة الدوائية: أخضر طبي داكن،
لَيم فسفوري (نبضة حياة)، خط ECG متحرك، صليب طبي متحرك، وحركات (animations) في كل مكان.

---

## 🎨 نظام الألوان الجديد

| المتغيّر | اللون | الاستخدام |
|---|---|---|
| `--ph-darkest` `#041510` | أخضر أسود غامق جداً | خلفية الـ Sidebar |
| `--ph-green` `#0d493a` | أخضر طبي أساسي | الأزرار، الشعار |
| `--ph-mint` `#00c896` | أخضر نعناعي مضيء | التمييز، الحالة النشطة |
| `--ph-lime` `#c8ff5e` | ليم فسفوري | النص على الخلفيات الداكنة، اللمعان |
| `--ph-bg` `#f0f8f5` | أخضر فاتح جداً | خلفية الصفحة |

---

## ✨ الحركات (Animations) المضافة

### دخول العناصر
- `.anim-slide-up` / `.anim-slide-down` / `.anim-slide-left` / `.anim-slide-right`
- `.anim-fade` / `.anim-scale`
- Stagger classes: `.d-100` `.d-200` ... `.d-500` (تأخير تدريجي للعناصر المتتالية)

### حركات خاصة بالصيدلية
- **`.anim-heartbeat`** — نبضة قلب على أيقونة الصليب الطبي (Logo)
- **خط ECG** يرسم نفسه تلقائياً عند فتح الـ Sidebar (`EcgLine` component)
- **`.anim-float-pill`** — حبوب دواء صغيرة تطفو وتدور في الخلفية
- **Scan line متحركة** في شاشة الباركود (تتحرك لأعلى ولأسفل مثل الماسحات الحقيقية)
- **Shimmer + gradient shift** على شريط التقدم عند تحميل قاعدة البيانات

### تفاعلات
- الأزرار: `translateY` + `scale` + توهج (`box-shadow`) عند الـ hover
- الكروت (`metric-card`): ترفع لأعلى مع ظل أقوى عند الـ hover
- تنبيه الجرس (Bell): نبضة قلب + حلقة متسعة (`ringPulse`) لما يكون فيه تنبيهات

---

## 📦 الملفات المتغيّرة (3 ملفات فقط)

```
pharma-redesign/
└── src/
    ├── index.css                      ← نظام التصميم الكامل (الأهم)
    └── components/
        ├── Layout.tsx                 ← Sidebar + Header جديد بالكامل
        ├── BarcodeScanner.tsx         ← شاشة مسح بتصميم داكن + scan line
        └── CatalogInitializer.tsx     ← شاشة التحميل الأولى المتحركة
```

### ✅ ملاحظة مهمة
باقي الصفحات (`SalesPage`, `ReportsPage`, `InventoryPage`, `ManagementPage`,
`DrugFormPage`) **لن تحتاج تعديل** — لأنها بالفعل تستخدم نفس الـ CSS classes
المشتركة (`panel`, `metric-card`, `field-input`, `primary-btn`, `secondary-btn`,
`danger-btn`, `data-table`). بمجرد استبدال `index.css` هتتغيّر شكلها كلها
تلقائياً لأنها بتستخدم نفس النظام.

---

## 🚀 طريقة التطبيق

```bash
# انسخ الملفات الثلاثة إلى مشروعك بنفس المسار بالظبط
cp pharma-redesign/src/index.css                       your-project/src/index.css
cp pharma-redesign/src/components/Layout.tsx            your-project/src/components/Layout.tsx
cp pharma-redesign/src/components/BarcodeScanner.tsx     your-project/src/components/BarcodeScanner.tsx
cp pharma-redesign/src/components/CatalogInitializer.tsx your-project/src/components/CatalogInitializer.tsx

npm run dev   # أو npm run build
```

---

## 🔍 قبل / بعد (ملخص)

| العنصر | قبل | بعد |
|---|---|---|
| الشعار | نص ثابت "MEDISOL" | صليب طبي بنبضة قلب + توهج + خط ECG |
| الـ Sidebar | خلفية خضراء مسطحة | تدرّج غامق + عدادات سريعة + حبوب متحركة |
| الأزرار | لون واحد مسطح | تدرّج + رفعة عند الهوفر + توهج |
| شاشة التحميل الأولى | Progress bar بسيط | كرة نابضة + shimmer + حبوب خلفية طافية |
| شاشة الباركود | خلفية سوداء بسيطة | زوايا إطار + خط مسح متحرك حقيقي |
| الجرس (تنبيهات) | ثابت | نبضة قلب + حلقة صوتية متسعة |
| الساعة | غير موجودة | ساعة حية في الـ Sidebar |

---

## 🖨️ متوافق مع الطباعة

أضفت `@media print` rule تُخفي الـ Sidebar والـ Header تلقائياً عند طباعة أي
تقرير أو فاتورة — عشان الطباعة تطلع نضيفة.

---

**كل الحركات مبنية بـ CSS خالص (keyframes) — مفيش أي مكتبة خارجية (Framer
Motion وغيره) فبتفضل خفيفة وسريعة وشغالة offline زي باقي التطبيق.**
