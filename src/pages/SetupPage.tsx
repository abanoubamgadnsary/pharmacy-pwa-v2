import React, { useState } from 'react';
import { Package, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { PinPad } from '../components/PinPad';
import { isValidPin } from '../utils/permissions';
import { createRecoveryKey } from '../services/userService';
import { formatRecoveryKey } from '../utils/recovery';

export const SetupPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const { setupManager } = useAuth();

  const [step, setStep] = useState<'name' | 'pin' | 'confirm' | 'recovery'>('name');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [copied, setCopied] = useState(false);

  const finish = async () => {
    if (pin !== confirmPin) {
      setError(t.setupPinMismatch);
      setConfirmPin('');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Generate recovery key first
      const key = await createRecoveryKey();
      setRecoveryKey(key);
      // Create the manager account
      await setupManager(name, pin);
      // Show recovery key step (user is now logged in but we show the key)
      setStep('recovery');
    } catch {
      setError(t.setupError);
      setSubmitting(false);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(formatRecoveryKey(recoveryKey));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
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
          <h1 className="text-xl font-bold text-slate-900">{t.setupTitle}</h1>
          <p className="text-sm text-slate-500">
            {step === 'recovery' ? t.recoveryKeySubtitle : t.setupSubtitle}
          </p>
        </div>

        {step === 'name' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setStep('pin');
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.setupManagerName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-input"
                placeholder={t.setupManagerNamePlaceholder}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="primary-btn w-full py-3 disabled:opacity-50"
            >
              {t.setupContinue}
            </button>
          </form>
        )}

        {step === 'pin' && (
          <div className="space-y-4">
            <p className="text-sm text-center text-slate-600">{t.setupChoosePin}</p>
            <PinPad value={pin} onChange={setPin} onSubmit={() => { if (isValidPin(pin)) { setStep('confirm'); setConfirmPin(''); setError(''); } }} />
            <button
              type="button"
              disabled={!isValidPin(pin)}
              onClick={() => { setStep('confirm'); setConfirmPin(''); setError(''); }}
              className="primary-btn w-full py-3 disabled:opacity-50"
            >
              {t.setupContinue}
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-center text-slate-600">{t.setupConfirmPin}</p>
            <PinPad value={confirmPin} onChange={setConfirmPin} onSubmit={() => { if (isValidPin(confirmPin)) finish(); }} disabled={submitting} />
            {error && <p className="text-center text-sm text-rose-600">{error}</p>}
            <button
              type="button"
              disabled={submitting || !isValidPin(confirmPin)}
              onClick={finish}
              className="primary-btn w-full py-3 disabled:opacity-50"
            >
              {t.setupFinish}
            </button>
          </div>
        )}

        {step === 'recovery' && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800 text-center">
                {t.recoveryKeyWarning}
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-mono font-bold tracking-widest text-slate-900 select-all">
                  {formatRecoveryKey(recoveryKey)}
                </code>
                <button
                  type="button"
                  onClick={copyKey}
                  className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
                  title={t.recoveryKeyCopy}
                >
                  {copied
                    ? <Check className="w-5 h-5 text-emerald-600" />
                    : <Copy className="w-5 h-5 text-amber-700" />}
                </button>
              </div>
              <p className="text-xs text-amber-700 text-center">
                {t.recoveryKeyHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="primary-btn w-full py-3"
            >
              {t.recoveryKeyDone}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
