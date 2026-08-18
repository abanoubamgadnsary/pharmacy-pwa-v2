import React from 'react';
import { Delete } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

export const PinPad: React.FC<Props> = ({
  value,
  onChange,
  maxLength = 6,
  disabled = false,
}) => {
  const press = (digit: string) => {
    if (disabled || value.length >= maxLength) return;
    onChange(value + digit);
  };

  const backspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  return (
    <div className="space-y-4">
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
          disabled={disabled}
          onClick={() => press('0')}
          className="h-14 rounded-xl bg-slate-100 text-xl font-bold text-slate-800
            hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition-all"
        >
          0
        </button>
        <button
          type="button"
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
