import React, { useState, useMemo } from 'react';
import { useNavigate }   from 'react-router-dom';
import { Plus, Edit, Trash2, Download, Upload, AlertTriangle, Search } from 'lucide-react';
import { useLiveQuery }  from 'dexie-react-hooks';
import { db }            from '../db';
import { deleteDrug, exportData, importData, clearAllData } from '../utils/dbOperations';
import { formatEgp }     from '../utils/format';
import { format }        from 'date-fns';
import { formatExpiryDisplay } from '../utils/expiry';
import { useLang }       from '../contexts/LanguageContext';
import { useAuth }       from '../contexts/AuthContext';
import { UsersPanel }    from '../components/UsersPanel';

export const ManagementPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const { can } = useAuth();
  const navigate  = useNavigate();
  const allDrugs  = useLiveQuery(() => db.drugs.toArray()) || [];

  const [searchQuery, setSearchQuery]         = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [drugToDelete, setDrugToDelete]       = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredDrugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allDrugs;
    return allDrugs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.nameAr ?? '').toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        d.barcode.includes(searchQuery.trim()) ||
        d.activeIngredient.toLowerCase().includes(q)
    );
  }, [allDrugs, searchQuery]);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const url  = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `pharmacy-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: t.exportSuccess });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: t.exportFail });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importData(await file.text());
      setMessage({ type: 'success', text: t.importSuccess });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: t.importFail });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllData();
      setShowDeleteConfirm(false);
      setMessage({ type: 'success', text: t.clearSuccess });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: t.clearFail });
    }
  };

  const confirmDeleteDrug = async () => {
    if (!drugToDelete) return;
    try {
      await deleteDrug(drugToDelete.id);
      setDrugToDelete(null);
      setMessage({ type: 'success', text: t.deleteSuccess });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: t.deleteFail });
    }
  };

  return (
    <div className="page-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="page-title">{t.managementTitle}</h1>
        <p className="page-subtitle">{t.managementSubtitle}</p>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium
          ${message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => navigate('/management/add')} className="primary-btn py-4">
          <Plus className="w-5 h-5" /> {t.addNewDrug}
        </button>
        <button onClick={handleExport} className="secondary-btn py-4">
          <Download className="w-5 h-5" /> {t.exportData}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="secondary-btn cursor-pointer py-4">
          <Upload className="w-5 h-5" /> {t.importData}
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button onClick={() => setShowDeleteConfirm(true)} className="danger-btn py-4">
          <Trash2 className="w-5 h-5" /> {t.clearAllData}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h3 className="text-xl font-bold">{t.clearAllTitle}</h3>
            </div>
            <p className="text-gray-600 mb-6">{t.clearAllMsg}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="secondary-btn flex-1">{t.cancel}</button>
              <button onClick={handleClearAll} className="danger-btn flex-1">{t.deleteAll}</button>
            </div>
          </div>
        </div>
      )}

      {drugToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
              <h3 className="text-xl font-bold">{t.deleteDrugTitle}</h3>
            </div>
            <p className="text-gray-600 mb-6">{t.deleteDrugMsg(drugToDelete.name)}</p>
            <div className="flex gap-3">
              <button onClick={() => setDrugToDelete(null)} className="secondary-btn flex-1">{t.cancel}</button>
              <button onClick={confirmDeleteDrug} className="danger-btn flex-1">{t.delete}</button>
            </div>
          </div>
        </div>
      )}

      <div className="panel-pad space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            {t.drugManagementCount(filteredDrugs.length, allDrugs.length)}
          </h2>
          <div className="relative w-72">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.managementSearch}
              className={`field-input bg-slate-50 text-sm ${isRtl ? 'pr-9' : 'pl-9'}`}
            />
          </div>
        </div>

        {allDrugs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>{t.noDrugsDb}</p>
            <button onClick={() => navigate('/management/add')} className="primary-btn mt-4">
              {t.addFirstDrug}
            </button>
          </div>
        ) : filteredDrugs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {t.noDrugsMatch(searchQuery)}
          </div>
        ) : (
          <div className="table-shell divide-y divide-slate-100">
            {filteredDrugs.map((drug) => (
              <div key={drug.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{drug.name}</h3>
                  {drug.nameAr && <p className="text-sm text-slate-400 truncate">{drug.nameAr}</p>}
                  <p className="text-sm text-slate-500 truncate">{drug.activeIngredient}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>{drug.company}</span>
                    <span className={drug.stock <= 10 ? 'text-rose-600 font-semibold' : ''}>
                      {t.stockShort}: {drug.stock}
                    </span>
                    <span className="font-mono text-slate-400">{drug.barcode}</span>
                    <span>{formatEgp(drug.price)}</span>
                    {drug.expiryDate && (
                      <span>{t.expShort}: {formatExpiryDisplay(drug.expiryDate)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ms-3">
                  <button onClick={() => navigate(`/management/edit/${drug.id}`)}
                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                    aria-label={t.editDrugAria(drug.name)}>
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => setDrugToDelete({ id: drug.id, name: drug.name })}
                    className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                    aria-label={t.deleteDrugAria(drug.name)}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {can('users.manage') && (
        <div className="mt-8">
          <UsersPanel />
        </div>
      )}
    </div>
  );
};
