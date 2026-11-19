import React, { useState } from 'react';
import { Package, ArrowLeft } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { PinPad } from '../components/PinPad';
import { isValidPin } from '../utils/permissions';
import { checkRecoveryKey, resetPinWithRecoveryKey, hasRecoveryKey } from '../services/userService';

export const LoginPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const { login } = useAuth();
  const users = useLiveQuery(() => db.users.filter((u) => u.active).toArray(), [], []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forgot PIN state
  const [forgotMode, setForgotMode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [forgotStep, setForgotStep] = useState<'key' | 'selectUser' | 'newPin' | 'confirmPin'>('key');
  const [forgotUserId, setForgotUserId] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  const selectedUser = users?.find((u) => u.id === selectedId);
  const forgotUser = users?.find((u) => u.id === forgotUserId);

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

  const startForgotFlow = async () => {
    const exists = await hasRecoveryKey();
    setHasKey(exists);
    setForgotMode(true);
    setRecoveryInput('');
    setNewPin('');
    setConfirmNewPin('');
    setForgotStep('key');
    setForgotUserId(null);
    setError('');
  };

  const cancelForgot = () => {
    setForgotMode(false);
    setError('');
    setPin('');
  };

  const verifyKey = async () => {
    setSubmitting(true);
    setError('');
    const ok = await checkRecoveryKey(recoveryInput);
    if (ok) {
      // If only one user, skip user selection
      if (users && users.length === 1) {
        setForgotUserId(users[0].id);
        setForgotStep('newPin');
      } else {
        setForgotStep('selectUser');
      }
    } else {
      setError(t.recoveryKeyInvalid);
    }
    setSubmitting(false);
  };

  const saveNewPin = async () => {
    if (newPin !== confirmNewPin) {
      setError(t.setupPinMismatch);
      setConfirmNewPin('');
      setForgotStep('newPin');
      return;
    }
    if (!forgotUserId) return;
    setSubmitting(true);
    setError('');
    const ok = await resetPinWithRecoveryKey(recoveryInput, forgotUserId, newPin);
    if (ok) {
      // Auto-login after reset
      await login(forgotUserId, newPin);
    } else {
      setError(t.recoveryKeyInvalid);
      setSubmitting(false);
    }
  };

  // ── Forgot PIN UI ──────────────────────────────────────────────────────────
  if (forgotMode) {
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
            <h1 className="text-xl font-bold text-slate-900">{t.forgotPinTitle}</h1>
            <p className="text-sm text-slate-500">{t.forgotPinSubtitle}</p>
          </div>

          {hasKey === false ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm text-rose-800 text-center">{t.recoveryKeyNotSet}</p>
              </div>
              <button type="button" onClick={cancelForgot} className="secondary-btn w-full py-3">
                <ArrowLeft className="w-4 h-4" /> {t.recoveryKeyBack}
              </button>
            </div>
          ) : forgotStep === 'key' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.recoveryKeyLabel}
                </label>
                <input
                  type="text"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
                  className="field-input text-center font-mono text-lg tracking-widest"
                  placeholder="XXXX-XXXX-XXXX"
                  autoFocus
                  dir="ltr"
                  onKeyDown={(e) => { if (e.key === 'Enter' && recoveryInput.replace(/[\s-]/g, '').length >= 12) verifyKey(); }}
                />
              </div>
              {error && <p className="text-center text-sm text-rose-600 font-medium">{error}</p>}
              <button
                type="button"
                onClick={verifyKey}
                disabled={submitting || recoveryInput.replace(/[\s-]/g, '').length < 12}
                className="primary-btn w-full py-3 disabled:opacity-50"
              >
                {t.recoveryKeyVerify}
              </button>
              <button type="button" onClick={cancelForgot} className="secondary-btn w-full py-2 text-sm">
                {t.recoveryKeyBack}
              </button>
            </div>
          ) : forgotStep === 'selectUser' ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600 text-center">{t.recoverySelectUser}</p>
              {users?.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setForgotUserId(u.id); setForgotStep('newPin'); setNewPin(''); setError(''); }}
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
          ) : forgotStep === 'newPin' ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-slate-600">
                {t.recoveryNewPinFor(forgotUser?.name ?? '')}
              </p>
              <PinPad
                value={newPin}
                onChange={setNewPin}
                onSubmit={() => { if (isValidPin(newPin)) { setForgotStep('confirmPin'); setConfirmNewPin(''); setError(''); } }}
              />
              {error && <p className="text-center text-sm text-rose-600 font-medium">{error}</p>}
              <button
                type="button"
                disabled={!isValidPin(newPin)}
                onClick={() => { setForgotStep('confirmPin'); setConfirmNewPin(''); setError(''); }}
                className="primary-btn w-full py-3 disabled:opacity-50"
              >
                {t.setupContinue}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-center text-slate-600">{t.setupConfirmPin}</p>
              <PinPad
                value={confirmNewPin}
                onChange={setConfirmNewPin}
                onSubmit={() => { if (isValidPin(confirmNewPin)) saveNewPin(); }}
                disabled={submitting}
              />
              {error && <p className="text-center text-sm text-rose-600 font-medium">{error}</p>}
              <button
                type="button"
                disabled={submitting || !isValidPin(confirmNewPin)}
                onClick={saveNewPin}
                className="primary-btn w-full py-3 disabled:opacity-50"
              >
                {t.recoveryResetPin}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Normal login UI ────────────────────────────────────────────────────────
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
            <button
              type="button"
              onClick={startForgotFlow}
              className="w-full text-center text-sm text-[#0d493a] font-medium hover:underline pt-2"
            >
              {t.forgotPinLink}
            </button>
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
            <PinPad value={pin} onChange={setPin} onSubmit={handleSubmit} disabled={submitting} />

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

            <button
              type="button"
              onClick={startForgotFlow}
              className="w-full text-center text-sm text-slate-500 hover:text-[#0d493a] hover:underline"
            >
              {t.forgotPinLink}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
