import React, { useRef, useEffect } from 'react';
import { Delete } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  disabled?: boolean;
}

export const PinPad: React.FC<Props> = ({
  value,
  onChange,
  onSubmit,
  maxLength = 6,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the hidden input so keyboard works immediately
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const press = (digit: string) => {
    if (disabled || value.length >= maxLength) return;
    onChange(value + digit);
    // Re-focus the hidden input after a button click
    inputRef.current?.focus();
  };

  const backspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleKeyboardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    if (!disabled) onChange(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !disabled) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    } else if (e.key === 'Enter' && onSubmit && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-4" onClick={() => inputRef.current?.focus()}>
      {/* Hidden input to capture physical keyboard typing */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={value}
        onChange={handleKeyboardInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="sr-only"
        aria-label="PIN input"
        tabIndex={0}
      />

      <div className="flex justify-center gap-2">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full border-2 transition-colors
              ${i < value.length ? 'bg-[#0d493a] border-[#0d493a]' : 'border-slate-300'}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => press(d)}
            className="h-14 rounded-xl bg-slate-100 text-xl font-bold text-slate-800
              hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition-all"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => press('0')}
          className="h-14 rounded-xl bg-slate-100 text-xl font-bold text-slate-800
            hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition-all"
        >
          0
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || !value.length}
          onClick={backspace}
          className="h-14 rounded-xl bg-slate-100 flex items-center justify-center
            hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition-all"
          aria-label="Backspace"
        >
          <Delete className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  );
};
