import React, { useEffect, useState } from 'react';
import { Wifi, CheckCircle, XCircle, RefreshCw, Activity } from 'lucide-react';
import { loadCatalog, LoadProgress } from '../services/catalogLoader';

interface Props { onDone: () => void; }

/* Animated medical cross (matches Layout) */
const MedCross: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="1" width="6" height="22" rx="2.5" fill="currentColor" />
    <rect x="1" y="9" width="22" height="6" rx="2.5" fill="currentColor" />
  </svg>
);

export const CatalogInitializer: React.FC<Props> = ({ onDone }) => {
  const [progress, setProgress] = useState<LoadProgress>({
    stage: 'checking', percent: 0,
    message: 'Starting…', messageAr: 'جاري البدء…',
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
    <div className="flex min-h-screen items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg,#f0f8f5 0%,#e4f2ec 100%)' }}>

      {/* Floating decorative pills in background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-[.06]">
        {[
          { top: '10%', left: '8%',  size: 90,  delay: 0    },
          { top: '65%', left: '85%', size: 130, delay: 300  },
          { top: '80%', left: '15%', size: 70,  delay: 600  },
          { top: '20%', left: '90%', size: 100, delay: 150  },
        ].map((p, i) => (
          <div key={i} className="absolute rounded-full anim-float"
            style={{
              top: p.top, left: p.left, width: p.size, height: p.size / 2.2,
              background: 'linear-gradient(135deg,#0d493a,#00c896)',
              animationDelay: `${p.delay}ms`,
            }} />
        ))}
      </div>

      <div className="panel max-w-md w-full space-y-7 p-8 text-center relative anim-scale"
        style={{ boxShadow: 'var(--shadow-lg)' }}>

        {/* Top accent bar */}
        <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg,#0d493a,#00c896,#c8ff5e)' }} />

        {/* Icon */}
        <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-3xl"
          style={{
            background: isDone
              ? 'linear-gradient(135deg,#0d493a,#00c896)'
              : isError
                ? 'linear-gradient(135deg,#e53e3e,#c53030)'
                : 'linear-gradient(135deg,#0d493a,#1a6b55)',
            boxShadow: isDone
              ? '0 8px 30px rgba(0,200,150,.4)'
              : isError
                ? '0 8px 30px rgba(229,62,62,.35)'
                : '0 8px 30px rgba(13,73,58,.35)',
          }}>
          {isDone ? (
            <CheckCircle className="h-11 w-11 text-white anim-scale" />
          ) : isError ? (
            <XCircle className="h-11 w-11 text-white" />
          ) : (
            <span className="text-[#c8ff5e] anim-heartbeat">
              <MedCross size={40} />
            </span>
          )}
          {/* Pulse ring while loading */}
          {!isDone && !isError && (
            <span className="absolute inset-0 rounded-3xl anim-glow-pulse"
              style={{ boxShadow: '0 0 0 4px rgba(0,200,150,.25)' }} />
          )}
        </div>

        {/* Title */}
        <div className="anim-slide-up d-100">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ph-text)' }}>
            {isDone ? 'جاهز! ✅' : isError ? 'خطأ في التحميل' : 'جاري تحميل قاعدة الأدوية المصرية'}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--ph-sub)' }}>
            {isDone ? 'Pharmacy Management System' : isError ? 'Catalog download failed' : 'Loading Egyptian Drug Database'}
          </p>
        </div>

        {/* Progress bar */}
        {!isError && (
          <div className="space-y-2.5 anim-slide-up d-150">
            <div className="h-3.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--ph-border)' }}>
              <div className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
                style={{
                  width: `${progress.percent}%`,
                  background: isDone
                    ? 'linear-gradient(90deg,#0d493a,#00c896)'
                    : 'linear-gradient(90deg,#0d493a,#1a6b55,#00c896)',
                  backgroundSize: '200% 100%',
                  animation: isDone ? 'none' : 'gradientShift 1.5s linear infinite',
                }}>
                {!isDone && (
                  <div className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)',
                      animation: 'shimmer 1.2s ease-in-out infinite',
                    }} />
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold" style={{ color: 'var(--ph-green)' }}>
                {progress.percent}%
              </span>
              {!isDone && (
                <Activity className="h-3.5 w-3.5 anim-glow-pulse" style={{ color: 'var(--ph-mint)' }} />
              )}
            </div>
          </div>
        )}

        {/* Arabic status message */}
        <p className="text-sm leading-relaxed anim-slide-up d-200" style={{ color: 'var(--ph-sub)' }}>
          {progress.messageAr}
        </p>

        {/* Info box */}
        {!isDone && !isError && (
          <div className="rounded-2xl p-4 text-right space-y-1.5 anim-slide-up d-250"
            style={{ background: 'var(--ph-bg)', border: '1px solid var(--ph-border)' }}>
            <div className="flex items-center justify-end gap-2" style={{ color: 'var(--ph-green)' }}>
              <span className="text-sm font-bold">بيحصل إيه دلوقتي؟</span>
              <Wifi className="h-4 w-4" />
            </div>
            <p className="text-xs" style={{ color: 'var(--ph-sub)' }}>
              بنحمل قاعدة بيانات 26,562 دواء مصري مرة واحدة بس.
            </p>
            <p className="text-xs" style={{ color: 'var(--ph-sub)' }}>
              بعد كده التطبيق هيشتغل offline بالكامل 🔌
            </p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="space-y-4 anim-slide-up d-100">
            <div className="rounded-2xl p-4 text-right"
              style={{ background: '#fff5f5', border: '1px solid #feb2b2' }}>
              <p className="text-sm font-semibold" style={{ color: '#742a2a' }}>
                محتاج إنترنت لأول تشغيل بس
              </p>
              <p className="text-xs mt-1" style={{ color: '#9b2c2c' }}>
                بعد ما يتحمل، التطبيق هيشتغل offline للأبد
              </p>
            </div>
            <button onClick={start} className="primary-btn w-full py-3">
              <RefreshCw className="h-5 w-5" />
              حاول تاني
            </button>
            <button onClick={onDone} className="w-full text-sm underline"
              style={{ color: 'var(--ph-sub)' }}>
              تخطي (هتدخل البيانات يدويًا)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
