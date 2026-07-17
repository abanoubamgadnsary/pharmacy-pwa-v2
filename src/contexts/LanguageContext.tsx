import React, { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'en' | 'ar';

// ── Translations ─────────────────────────────────────────────────────────────

export const translations = {
  en: {
    // Nav
    sales:      'Sales',
    inventory:  'Inventory',
    reports:    'Reports',
    manage:     'Manage',
    help:       'Help',
    logOut:     'Log Out',

    // Header
    searchPlaceholder: 'Search medicine, barcode, ingredient…',
    noResults:         'No matching medicines found.',
    alerts:            'Alerts',
    noAlerts:          'No low-stock or expiry alerts.',
    storeAdmin:        'Store Admin',
    online:            'Online',
    manageInventory:   'Manage inventory',
    viewReports:       'View reports',
    logoutUnavailable: 'Log out unavailable offline',
    lowStock:          'Low stock',
    expiringSoon:      'Expiring soon',
    unitsRemaining:    'units remaining',
    expiry:            'Expiry',

    // Sales page
    salesTitle:       'Sales',
    salesSubtitle:    'Scan, search, and complete pharmacy transactions.',
    scanBarcode:      'Scan Barcode',
    searchInStock:    'Search pharmacy stock by name or barcode…',
    searchCatalogTitle: 'Search Egyptian Drug Database',
    barcodeLabel:     'Barcode',
    catalogLinked:    'Will be linked to this drug automatically',
    activeIngredient: 'Active Ingredient',
    company:          'Company',
    barcode:          'Barcode',
    stockLabel:       'Stock',
    units:            'units',
    quantityLabel:    'Quantity',
    total:            'Total',
    completeSale:     'Complete Sale',
    outOfStock:       '⚠️ Out of stock — add quantity from Management',
    qtyExceedsStock:  'Quantity exceeds available stock!',
    saleError:        'An error occurred recording the sale',
    barcodeNotFound:  'Barcode not found — search drug database',
    drugAdded:        (name: string) => `✅ "${name}" added — update stock & expiry in Management`,
    saleDone:         (qty: number, name: string) => `✅ Sold: ${qty} × ${name}`,

    // Inventory page
    inventoryTitle:    'Inventory',
    inventorySubtitle: 'Monitor product stock, value, and expiry risk.',
    totalProducts:     'Total Products',
    totalStock:        'Total Stock',
    inventoryValue:    'Inventory Value',
    lowStockAlert:     'Low Stock Alert',
    expiringSoonAlert: 'Expiring Soon',
    reorderNow:        'Reorder now',
    allInventory:      'All Inventory',
    noDrugsMsg:        'No drugs in inventory',
    name:              'Name',
    ingredient:        'Ingredient',
    stockCol:          'Stock',
    price:             'Price',
    expiryCol:         'Expiry',

    // Reports page
    reportsTitle:       'Reports',
    reportsSubtitle:    'Track revenue, transaction volume, and recent activity.',
    todaysSales:        "Today's Sales",
    thisWeek:           'This Week',
    thisMonth:          'This Month',
    transactions:       'transactions',
    recentSales:        'Recent Sales',
    noSalesMsg:         'No sales recorded yet',
    dateTime:           'Date & Time',
    drugName:           'Drug Name',
    quantity:           'Quantity',
    unitPrice:          'Unit Price',
    totalCol:           'Total',
    todaySummary:       "Today's Summary",
    monthlySummary:     'Monthly Summary',
    totalTransactions:  'Total Transactions:',
    itemsSold:          'Items Sold:',
    revenue:            'Revenue:',
    avgPerSale:         'Average per Sale:',

    // Management page
    managementTitle:    'Management',
    managementSubtitle: 'Maintain medicines, backups, and local pharmacy data.',
    addNewDrug:         'Add New Drug',
    exportData:         'Export Data (Backup)',
    importData:         'Import Data (Restore)',
    clearAllData:       'Clear All Data',
    clearAllTitle:      'Clear All Data?',
    clearAllMsg:        'This will permanently delete all drugs and sales records. This action cannot be undone.',
    cancel:             'Cancel',
    deleteAll:          'Delete All',
    deleteDrugTitle:    'Delete Drug?',
    deleteDrugMsg:      (name: string) => `Are you sure you want to delete "${name}"? This cannot be undone.`,
    delete:             'Delete',
    drugManagement:     (count: number) => `Drug Management (${count})`,
    noDrugsDb:          'No drugs in database',
    addFirstDrug:       'Add Your First Drug',
    exportSuccess:      'Data exported successfully!',
    exportFail:         'Failed to export data',
    importSuccess:      'Data imported successfully!',
    importFail:         'Failed to import data',
    clearSuccess:       'All data cleared!',
    clearFail:          'Failed to clear data',
    deleteSuccess:      'Drug deleted successfully!',
    deleteFail:         'Failed to delete drug',

    // Drug Form page
    editDrug:           'Edit Drug',
    addNewDrugTitle:    'Add New Drug',
    formSubtitle:       'Keep catalog, barcode, pricing, and stock details accurate.',
    editDrugAr:         'Edit Drug',
    addDrugAr:          'Add New Drug',
    catalogSearchTitle: 'Search Egyptian Drug Database',
    catalogFilled:      '✅ Data filled — review and add stock & expiry date',
    barcodeField:       'Barcode *',
    searchBarcode:      'Search by Barcode',
    barcodeNoResult:    'No catalog match for this barcode',
    barcodeEmpty:       'Enter a barcode to search',
    searchError:        'Error during search',
    nameEn:             'Drug Name (English) *',
    nameAr:             'Drug Name (Arabic)',
    composition:        'Scientific Composition *',
    manufacturer:       'Manufacturer *',
    priceField:         'Price (EGP) *',
    stockField:         'Stock Qty *',
    expiryField:        'Expiry Date *',
    saveChanges:        'Save Changes',
    addDrugBtn:         'Add Drug',
    required:           'Required',
    priceMustBePositive:'Must be greater than 0',
    catalogMatchFound:  '✅ Match found in catalog',
    saveSuccess:        '✅ Updated successfully',
    addSuccess:         '✅ Added successfully',
    saveError:          'Error — please try again',
  },

  ar: {
    // Nav
    sales:      'المبيعات',
    inventory:  'المخزون',
    reports:    'التقارير',
    manage:     'إدارة',
    help:       'مساعدة',
    logOut:     'تسجيل خروج',

    // Header
    searchPlaceholder: 'ابحث بالاسم أو الباركود أو المادة الفعالة…',
    noResults:         'لا توجد أدوية مطابقة.',
    alerts:            'التنبيهات',
    noAlerts:          'لا يوجد تنبيهات نفاد أو انتهاء صلاحية.',
    storeAdmin:        'مدير الصيدلية',
    online:            'متصل',
    manageInventory:   'إدارة المخزون',
    viewReports:       'عرض التقارير',
    logoutUnavailable: 'تسجيل الخروج غير متاح بدون إنترنت',
    lowStock:          'مخزون منخفض',
    expiringSoon:      'ينتهي قريبًا',
    unitsRemaining:    'قطعة متبقية',
    expiry:            'انتهاء الصلاحية',

    // Sales page
    salesTitle:       'المبيعات',
    salesSubtitle:    'امسح، ابحث، وأتم معاملات الصيدلية.',
    scanBarcode:      'مسح الباركود',
    searchInStock:    'بحث في مخزن الصيدلية بالاسم أو الباركود…',
    searchCatalogTitle: 'ابحث في قاعدة الأدوية المصرية',
    barcodeLabel:     'الباركود',
    catalogLinked:    'هيتربط بالدواء تلقائيًا',
    activeIngredient: 'المادة الفعالة',
    company:          'الشركة',
    barcode:          'الباركود',
    stockLabel:       'المخزون',
    units:            'قطعة',
    quantityLabel:    'الكمية',
    total:            'الإجمالي',
    completeSale:     'إتمام البيع',
    outOfStock:       '⚠️ المخزون فاضي — أضف كمية من صفحة الإدارة',
    qtyExceedsStock:  'الكمية أكبر من المتاح في المخزن!',
    saleError:        'حصل خطأ أثناء تسجيل البيع',
    barcodeNotFound:  'الباركود مش موجود — ابحث عن الدواء من قاعدة البيانات',
    drugAdded:        (name: string) => `✅ تم إضافة "${name}" — أضف الكمية والتاريخ من صفحة الإدارة`,
    saleDone:         (qty: number, name: string) => `✅ تم البيع: ${qty} × ${name}`,

    // Inventory page
    inventoryTitle:    'المخزون',
    inventorySubtitle: 'راقب الكميات والقيمة ومخاطر انتهاء الصلاحية.',
    totalProducts:     'إجمالي المنتجات',
    totalStock:        'إجمالي المخزون',
    inventoryValue:    'قيمة المخزون',
    lowStockAlert:     'تنبيه نفاد المخزون',
    expiringSoonAlert: 'تنتهي صلاحيتها قريبًا',
    reorderNow:        'أعد الطلب الآن',
    allInventory:      'كل المخزون',
    noDrugsMsg:        'لا توجد أدوية في المخزون',
    name:              'الاسم',
    ingredient:        'المادة الفعالة',
    stockCol:          'المخزون',
    price:             'السعر',
    expiryCol:         'الصلاحية',

    // Reports page
    reportsTitle:       'التقارير',
    reportsSubtitle:    'تتبع الإيرادات وحجم المعاملات والنشاط الأخير.',
    todaysSales:        'مبيعات اليوم',
    thisWeek:           'هذا الأسبوع',
    thisMonth:          'هذا الشهر',
    transactions:       'معاملة',
    recentSales:        'آخر المبيعات',
    noSalesMsg:         'لم يتم تسجيل أي مبيعات بعد',
    dateTime:           'التاريخ والوقت',
    drugName:           'اسم الدواء',
    quantity:           'الكمية',
    unitPrice:          'سعر الوحدة',
    totalCol:           'الإجمالي',
    todaySummary:       'ملخص اليوم',
    monthlySummary:     'الملخص الشهري',
    totalTransactions:  'إجمالي المعاملات:',
    itemsSold:          'الأصناف المباعة:',
    revenue:            'الإيرادات:',
    avgPerSale:         'متوسط البيع:',

    // Management page
    managementTitle:    'الإدارة',
    managementSubtitle: 'إدارة الأدوية والنسخ الاحتياطي وبيانات الصيدلية.',
    addNewDrug:         'إضافة دواء جديد',
    exportData:         'تصدير البيانات (نسخة احتياطية)',
    importData:         'استيراد البيانات (استعادة)',
    clearAllData:       'حذف كل البيانات',
    clearAllTitle:      'حذف كل البيانات؟',
    clearAllMsg:        'سيتم حذف جميع الأدوية وسجلات المبيعات بشكل دائم. لا يمكن التراجع عن هذا الإجراء.',
    cancel:             'إلغاء',
    deleteAll:          'حذف الكل',
    deleteDrugTitle:    'حذف الدواء؟',
    deleteDrugMsg:      (name: string) => `هل أنت متأكد أنك تريد حذف "${name}"؟ لا يمكن التراجع عن ذلك.`,
    delete:             'حذف',
    drugManagement:     (count: number) => `إدارة الأدوية (${count})`,
    noDrugsDb:          'لا توجد أدوية في قاعدة البيانات',
    addFirstDrug:       'أضف أول دواء',
    exportSuccess:      'تم تصدير البيانات بنجاح!',
    exportFail:         'فشل تصدير البيانات',
    importSuccess:      'تم استيراد البيانات بنجاح!',
    importFail:         'فشل استيراد البيانات',
    clearSuccess:       'تم حذف كل البيانات!',
    clearFail:          'فشل حذف البيانات',
    deleteSuccess:      'تم حذف الدواء بنجاح!',
    deleteFail:         'فشل حذف الدواء',

    // Drug Form page
    editDrug:           'تعديل دواء',
    addNewDrugTitle:    'إضافة دواء جديد',
    formSubtitle:       'احتفظ بتفاصيل الكتالوج والباركود والتسعير والمخزون دقيقة.',
    editDrugAr:         'تعديل دواء',
    addDrugAr:          'إضافة دواء جديد',
    catalogSearchTitle: 'ابحث في قاعدة الأدوية المصرية',
    catalogFilled:      '✅ تم ملء البيانات — راجعها وأضف الكمية وتاريخ الانتهاء',
    barcodeField:       'الباركود *',
    searchBarcode:      'ابحث بالباركود',
    barcodeNoResult:    'ما فيش نتيجة بالباركود ده',
    barcodeEmpty:       'أدخل باركود للبحث',
    searchError:        'حصل خطأ أثناء البحث',
    nameEn:             'اسم الدواء (إنجليزي) *',
    nameAr:             'اسم الدواء (عربي)',
    composition:        'التركيب العلمي *',
    manufacturer:       'الشركة المنتجة *',
    priceField:         'السعر (ج.م) *',
    stockField:         'الكمية *',
    expiryField:        'تاريخ الانتهاء *',
    saveChanges:        'حفظ التعديلات',
    addDrugBtn:         'إضافة الدواء',
    required:           'مطلوب',
    priceMustBePositive:'يجب أن يكون أكبر من 0',
    catalogMatchFound:  '✅ تم إيجاد مطابقة من الكتالوج',
    saveSuccess:        '✅ تم التحديث',
    addSuccess:         '✅ تمت الإضافة',
    saveError:          'حصل خطأ — حاول تاني',
  },
};

export type T = typeof translations.en;

// ── Context ──────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: Lang;
  t: T;
  toggleLang: () => void;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'app_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Lang | null) ?? 'ar';
  });

  const isRtl = lang === 'ar';

  // Apply dir attribute to <html> for proper RTL layout
  useEffect(() => {
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, isRtl]);

  const toggleLang = () => setLang((l) => (l === 'en' ? 'ar' : 'en'));

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useLang = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
};
