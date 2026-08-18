import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, UserX, KeyRound } from 'lucide-react';
import { db, AppUser } from '../db';
import { createUser, setUserActive, updateUserPin } from '../services/userService';
import { useLang } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { PinPad } from './PinPad';
import { isValidPin, UserRole } from '../utils/permissions';

export const UsersPanel: React.FC = () => {
  const { t, isRtl } = useLang();
  const { user: currentUser } = useAuth();
  const allUsers = useLiveQuery(() => db.users.toArray(), [], [] as AppUser[]);

  const [showAdd, setShowAdd] = useState(false);
  const [changingPinFor, setChangingPinFor] = useState<AppUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'new' | 'confirm'>('new');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAdd = async () => {
    if (!name.trim() || !isValidPin(pin)) {
      notify('error', t.usersInvalid);
      return;
    }
    try {
      await createUser(name, role, pin);
      setShowAdd(false);
      setName('');
      setPin('');
      setRole('cashier');
      notify('success', t.usersAdded);
    } catch {
      notify('error', t.usersAddFail);
    }
  };

  const handleDeactivate = async (u: AppUser) => {
    if (u.id === currentUser?.id) {
      notify('error', t.usersCantDeactivateSelf);
      return;
    }
    try {
      await setUserActive(u.id, false);
      notify('success', t.usersDeactivated);
    } catch {
      notify('error', t.usersDeactivateFail);
    }
  };

  const startChangePin = (u: AppUser) => {
    setShowAdd(false);
    setChangingPinFor(u);
    setNewPin('');
    setConfirmPin('');
    setPinStep('new');
  };

  const cancelChangePin = () => {
    setChangingPinFor(null);
    setNewPin('');
    setConfirmPin('');
    setPinStep('new');
  };

  const handlePinStep = () => {
    if (!isValidPin(newPin)) {
      notify('error', t.loginInvalidPin);
      return;
    }
    if (pinStep === 'new') {
      setPinStep('confirm');
      setConfirmPin('');
      return;
    }
    if (newPin !== confirmPin) {
      notify('error', t.setupPinMismatch);
      setPinStep('new');
      setNewPin('');
      setConfirmPin('');
      return;
    }
    void saveNewPin();
  };

  const saveNewPin = async () => {
    if (!changingPinFor) return;
    try {
      await updateUserPin(changingPinFor.id, newPin);
      notify('success', t.usersPinChanged(changingPinFor.name));
      cancelChangePin();
    } catch {
      notify('error', t.usersPinChangeFail);
    }
  };

  return (
    <div className="panel-pad space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">{t.usersTitle}</h2>
        <button type="button" onClick={() => { setShowAdd((v) => !v); cancelChangePin(); }} className="secondary-btn text-sm">
          <Plus className="w-4 h-4" /> {t.usersAdd}
        </button>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium
          ${message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      {showAdd && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.usersNamePlaceholder}
            className="field-input"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="field-input"
          >
            <option value="cashier">{t.roleCashier}</option>
            <option value="manager">{t.roleManager}</option>
          </select>
          <p className="text-xs text-slate-500">{t.usersPinHint}</p>
          <PinPad value={pin} onChange={setPin} />
          <button type="button" onClick={handleAdd} className="primary-btn w-full py-2">
            {t.usersSave}
          </button>
        </div>
      )}

      {changingPinFor && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">
              {t.usersChangePinFor(changingPinFor.name)}
            </p>
            <button type="button" onClick={cancelChangePin} className="text-xs text-slate-500 hover:text-slate-700">
              {t.cancel}
            </button>
          </div>
          <p className="text-xs text-slate-600">
            {pinStep === 'new' ? t.usersNewPin : t.usersConfirmPin}
          </p>
          <PinPad
            value={pinStep === 'new' ? newPin : confirmPin}
            onChange={pinStep === 'new' ? setNewPin : setConfirmPin}
          />
          <button
            type="button"
            onClick={handlePinStep}
            disabled={pinStep === 'new' ? !isValidPin(newPin) : !isValidPin(confirmPin)}
            className="primary-btn w-full py-2 disabled:opacity-40"
          >
            {pinStep === 'new' ? t.setupContinue : t.usersSavePin}
          </button>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {allUsers?.filter((u) => u.active).map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{u.name}</p>
              <p className="text-xs text-slate-500">
                {u.role === 'manager' ? t.roleManager : t.roleCashier}
                {u.id === currentUser?.id ? ` · ${t.usersYou}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => startChangePin(u)}
                className="text-violet-600 hover:bg-violet-50 rounded-lg p-2"
                title={t.usersChangePin}
              >
                <KeyRound className="w-4 h-4" />
              </button>
              {u.id !== currentUser?.id && (
              <button
                type="button"
                onClick={() => handleDeactivate(u)}
                className="text-rose-600 hover:bg-rose-50 rounded-lg p-2"
                title={t.usersDeactivate}
              >
                <UserX className="w-4 h-4" />
              </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
