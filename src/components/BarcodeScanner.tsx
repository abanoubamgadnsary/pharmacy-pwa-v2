import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 }, aspectRatio: 1.3 },
        (decoded) => { onScan(decoded); stopScanner(); },
        () => {}
      );
      setReady(true);
    } catch {
      setError('تعذّر فتح الكاميرا — تحقق من الصلاحيات.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); }
      catch { /* ignore */ }
      scannerRef.current = null;
    }
  };

  const handleClose = async () => { await stopScanner(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col anim-fade"
      style={{ background: 'rgba(4,21,16,.94)', backdropFilter: 'blur(6px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 anim-slide-down"
        style={{ background: 'linear-gradient(135deg,#0d493a,#1a6b55)' }}>
        <div className="flex items-center gap-2.5 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: 'rgba(200,255,94,.15)' }}>
            <Camera className="h-4.5 w-4.5" style={{ color: '#c8ff5e' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-none">مسح الباركود</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(200,255,94,.6)' }}>
              {ready ? '● الكاميرا نشطة' : '○ جاري التشغيل...'}
            </p>
          </div>
        </div>
        <button onClick={handleClose}
          className="grid h-9 w-9 place-items-center rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,.08)', color: 'white' }}>
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Scanner viewport */}
      <div className="flex flex-1 items-center justify-center p-6">
        {error ? (
          <div className="text-center space-y-4 anim-scale">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
              style={{ background: 'rgba(229,62,62,.15)' }}>
              <Camera className="h-7 w-7 text-red-400" />
            </div>
            <p className="text-red-300 text-sm max-w-xs">{error}</p>
            <button onClick={handleClose} className="danger-btn">إغلاق</button>
          </div>
        ) : (
          <div className="w-full max-w-md anim-scale">
            <div className="relative overflow-hidden rounded-3xl"
              style={{ boxShadow: '0 0 0 1px rgba(0,200,150,.25), 0 20px 60px rgba(0,0,0,.5)' }}>
              <div id="reader" className="overflow-hidden" />

              {/* Corner brackets */}
              {ready && (
                <>
                  {[
                    { top: 12, left: 12, rot: 0 },
                    { top: 12, right: 12, rot: 90 },
                    { bottom: 12, left: 12, rot: -90 },
                    { bottom: 12, right: 12, rot: 180 },
                  ].map((pos, i) => (
                    <svg key={i} width="28" height="28" viewBox="0 0 28 28"
                      className="absolute pointer-events-none"
                      style={{ ...pos, transform: `rotate(${pos.rot}deg)`, color: '#c8ff5e' }}>
                      <path d="M2 12V4a2 2 0 012-2h8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ))}
                  {/* Animated scan line */}
                  <div className="absolute inset-x-6 pointer-events-none"
                    style={{
                      top: '10%', height: '2px',
                      background: 'linear-gradient(90deg,transparent,#c8ff5e,transparent)',
                      boxShadow: '0 0 8px #c8ff5e',
                      animation: 'scanMove 2.2s ease-in-out infinite',
                    }} />
                </>
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2">
              <ScanLine className="h-4 w-4" style={{ color: '#00c896' }} />
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,.75)' }}>
                ضع الباركود داخل الإطار
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanMove {
          0%,100% { transform: translateY(0); opacity: .3; }
          50%     { transform: translateY(140px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
