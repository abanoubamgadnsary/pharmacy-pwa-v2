import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { PinPad } from '../components/PinPad';
import { isValidPin } from '../utils/permissions';

export const SetupPage: React.FC = () => {
  const { t, isRtl } = useLang();
  const { setupManager } = useAuth();

  const [step, setStep] = useState<'name' | 'pin' | 'confirm'>('name');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const finish = async () => {
    if (pin !== confirmPin) {
      setError(t.setupPinMismatch);
      setConfirmPin('');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await setupManager(name, pin);
    } catch {
      setError(t.setupError);
      setSubmitting(false);
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
          <p className="text-sm text-slate-500">{t.setupSubtitle}</p>
        </div>

        {step === 'name' && (
          <div className="space-y-4">
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
              type="button"
              disabled={!name.trim()}
              onClick={() => setStep('pin')}
              className="primary-btn w-full py-3 disabled:opacity-50"
            >
              {t.setupContinue}
            </button>
          </div>
        )}

        {step === 'pin' && (
          <div className="space-y-4">
            <p className="text-sm text-center text-slate-600">{t.setupChoosePin}</p>
            <PinPad value={pin} onChange={setPin} />
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
            <PinPad value={confirmPin} onChange={setConfirmPin} disabled={submitting} />
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
      </div>
    </div>
  );
};
