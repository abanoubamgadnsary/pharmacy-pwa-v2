import React, { useEffect, useState } from 'react';
import { Database, Wifi, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { loadCatalog, LoadProgress } from '../services/catalogLoader';

interface Props {
  onDone: () => void;
}

export const CatalogInitializer: React.FC<Props> = ({ onDone }) => {
  const [progress, setProgress] = useState<LoadProgress>({
    stage: 'checking',
    percent: 0,
    message: 'Starting…',
    messageAr: 'جاري البدء…',
  });

  const start = () => {
    loadCatalog((p) => {
      setProgress(p);
      if (p.stage === 'done') setTimeout(onDone, 1200);
    }).catch(() => {});
  };

  useEffect(() => { start(); }, []);

  const isError = progress.stage === 'error';
  const isDone  = progress.stage === 'done';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] p-6">
      <div className="panel max-w-md w-full space-y-6 p-8 text-center">

        {/* Icon */}
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center
          ${isDone  ? 'bg-emerald-100' :
            isError ? 'bg-red-100'     : 'bg-[#d8ff64]/30'}`}>
          {isDone  ? <CheckCircle className="w-10 h-10 text-emerald-600" /> :
           isError ? <XCircle     className="w-10 h-10 text-red-600"     /> :
                     <Database    className="w-10 h-10 text-[#0d493a] animate-pulse" />}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isDone  ? 'جاهز! ✅'                       :
             isError ? 'خطأ في التحميل'                  :
                       'جاري تحميل قاعدة الأدوية المصرية'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isDone  ? 'Pharmacy Management System'          :
             isError ? 'Catalog download failed'              :
                       'Loading Egyptian Drug Database'}
          </p>
        </div>

        {/* Progress bar */}
        {!isError && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500
                  ${isDone ? 'bg-emerald-500' : 'bg-[#0d493a]'}`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-sm font-medium text-gray-700">
              {progress.percent}%
            </p>
          </div>
        )}

        {/* Arabic message */}
        <p className="text-gray-600 text-right leading-relaxed">
          {progress.messageAr}
        </p>

        {/* Info box */}
        {!isDone && !isError && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-right space-y-1">
            <div className="flex items-center justify-end gap-2 text-blue-700">
              <span className="text-sm font-semibold">بيحصل إيه دلوقتي؟</span>
              <Wifi className="w-4 h-4" />
            </div>
            <p className="text-xs text-blue-600">
              بنحمل قاعدة بيانات 24,868 دواء مصري مرة واحدة بس.
            </p>
            <p className="text-xs text-blue-600">
              بعد كده التطبيق هيشتغل offline بالكامل 🔌
            </p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-4 text-right">
              <p className="text-sm text-red-700 font-semibold">
                محتاج إنترنت لأول تشغيل بس
              </p>
              <p className="text-xs text-red-600 mt-1">
                بعد ما يتحمل، التطبيق هيشتغل offline للأبد
              </p>
            </div>
            <button
              onClick={start}
              className="w-full flex items-center justify-center gap-2
                bg-[#0d493a] text-white py-3 rounded-lg
                hover:bg-[#0a3b2f] transition-colors font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              حاول تاني
            </button>
            <button
              onClick={onDone}
              className="w-full text-gray-500 text-sm underline"
            >
              تخطي (هتدخل البيانات يدويًا)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
