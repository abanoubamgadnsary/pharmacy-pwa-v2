import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { PinPad } from '../components/PinPad';
import { isValidPin } from '../utils/permissions';

export const LoginPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const { login } = useAuth();
  const users = useLiveQuery(() => db.users.filter((u) => u.active).toArray(), [], []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedUser = users?.find((u) => u.id === selectedId);

  const handleSubmit = async () => {
    if (!selectedId || !isValidPin(pin)) {
      setError(t.loginInvalidPin);
      return;
    }
    setSubmitting(true);
    setError('');
    const ok = await login(selectedId, pin);
    if (!ok) {
      setError(t.loginWrongPin);
      setPin('');
    }
    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f7f8fb] p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="panel w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#0d493a]">
            <Package className="h-7 w-7 text-[#d8ff64]" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.loginTitle}</h1>
          <p className="text-sm text-slate-500">{t.loginSubtitle}</p>
        </div>

        {!selectedId ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 text-center">{t.loginSelectUser}</p>
            {users?.length === 0 && (
              <p className="text-center text-sm text-slate-400">{t.loginNoUsers}</p>
            )}
            {users?.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => { setSelectedId(u.id); setPin(''); setError(''); }}
                className="w-full flex items-center justify-between rounded-lg border border-slate-200
                  px-4 py-3 hover:border-[#0d493a] hover:bg-emerald-50 transition-colors"
              >
                <span className="font-semibold text-slate-900">{u.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                  ${u.role === 'manager' ? 'bg-[#0d493a] text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {u.role === 'manager' ? t.roleManager : t.roleCashier}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{selectedUser?.name}</p>
                <p className="text-xs text-slate-500">
                  {selectedUser?.role === 'manager' ? t.roleManager : t.roleCashier}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedId(null); setPin(''); setError(''); }}
                className="text-sm text-[#0d493a] font-medium hover:underline"
              >
                {t.loginChangeUser}
              </button>
            </div>

            <p className="text-sm text-center text-slate-600">{t.loginEnterPin}</p>
            <PinPad value={pin} onChange={setPin} disabled={submitting} />

            {error && (
              <p className="text-center text-sm text-rose-600 font-medium">{error}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !isValidPin(pin)}
              className="primary-btn w-full py-3 disabled:opacity-50"
            >
              {t.loginButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
