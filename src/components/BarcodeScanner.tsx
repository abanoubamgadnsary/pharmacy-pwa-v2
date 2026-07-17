import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');

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
        () => {}   // suppress per-frame errors
      );
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
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      <div className="flex items-center justify-between bg-[#0d493a] p-4">
        <div className="flex items-center gap-2 text-white">
          <Camera className="w-6 h-6" />
          <h2 className="text-lg font-semibold">مسح الباركود</h2>
        </div>
        <button onClick={handleClose} className="text-white hover:text-gray-300">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {error ? (
          <div className="text-center text-red-400 space-y-4">
            <p className="text-lg">{error}</p>
            <button onClick={handleClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              إغلاق
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <div id="reader" className="overflow-hidden rounded-lg" />
            <p className="text-white text-center mt-4 text-sm">
              ضع الباركود داخل الإطار
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
