import React, { useState, useMemo } from 'react';
import { useNavigate }   from 'react-router-dom';
import { Plus, Edit, Trash2, Download, Upload, AlertTriangle, Search } from 'lucide-react';
import { useLiveQuery }  from 'dexie-react-hooks';
import { db }            from '../db';
import { deleteDrug, exportData, importData, clearAllData } from '../utils/dbOperations';
import { formatEgp }     from '../utils/format';
import { format }        from 'date-fns';

export const ManagementPage: React.FC = () => {
  const navigate  = useNavigate();
  const allDrugs  = useLiveQuery(() => db.drugs.toArray()) || [];

  // FIX #9 — search state
  const [searchQuery, setSearchQuery]         = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [drugToDelete, setDrugToDelete]       = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // FIX #9 — filtered list
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
      setMessage({ type: 'success', text: 'Data exported successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to export data' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importData(await file.text());
      setMessage({ type: 'success', text: 'Data imported successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to import data' });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllData();
      setShowDeleteConfirm(false);
      setMessage({ type: 'success', text: 'All data cleared!' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to clear data' });
    }
  };

  const confirmDeleteDrug = async () => {
    if (!drugToDelete) return;
    try {
      await deleteDrug(drugToDelete.id);
      setDrugToDelete(null);
      setMessage({ type: 'success', text: 'Drug deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete drug' });
    }
  };

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">Management</h1>
        <p className="page-subtitle">Maintain medicines, backups, and local pharmacy data.</p>
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
          <Plus className="w-5 h-5" /> Add New Drug
        </button>
        <button onClick={handleExport} className="secondary-btn py-4">
          <Download className="w-5 h-5" /> Export Data (Backup)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="secondary-btn cursor-pointer py-4">
          <Upload className="w-5 h-5" /> Import Data (Restore)
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button onClick={() => setShowDeleteConfirm(true)} className="danger-btn py-4">
          <Trash2 className="w-5 h-5" /> Clear All Data
        </button>
      </div>

      {/* Confirm clear-all modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h3 className="text-xl font-bold">Clear All Data?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will permanently delete all drugs and sales records. Cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="secondary-btn flex-1">Cancel</button>
              <button onClick={handleClearAll} className="danger-btn flex-1">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm single-drug delete */}
      {drugToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
              <h3 className="text-xl font-bold">Delete Drug?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{drugToDelete.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDrugToDelete(null)} className="secondary-btn flex-1">Cancel</button>
              <button onClick={confirmDeleteDrug} className="danger-btn flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Drug list with search */}
      <div className="panel-pad space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            Drug Management ({filteredDrugs.length} / {allDrugs.length})
          </h2>
          {/* FIX #9 — search input */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drugs…"
              className="field-input bg-slate-50 pl-9 text-sm"
            />
          </div>
        </div>

        {allDrugs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No drugs in database</p>
            <button onClick={() => navigate('/management/add')} className="primary-btn mt-4">
              Add Your First Drug
            </button>
          </div>
        ) : filteredDrugs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No drugs match "{searchQuery}"
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
                      Stock: {drug.stock}
                    </span>
                    <span className="font-mono text-slate-400">{drug.barcode}</span>
                    <span>{formatEgp(drug.price)}</span>
                    {drug.expiryDate && (
                      <span>Exp: {format(new Date(drug.expiryDate), 'MMM yyyy')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ms-3">
                  <button onClick={() => navigate(`/management/edit/${drug.id}`)}
                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                    aria-label={`Edit ${drug.name}`}>
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => setDrugToDelete({ id: drug.id!, name: drug.name })}
                    className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                    aria-label={`Delete ${drug.name}`}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
