'use client';

import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  fps?: number;
}

const QrScanner: React.FC<QrScannerProps> = ({ 
  onScan, 
  onError,
  fps = 10 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const scannerContainerId = "qr-scanner-container";

  useEffect(() => {
    // Make sure we're in the browser
    if (typeof window === 'undefined') return;

    let scanner: Html5Qrcode | null = null;
    let mounted = true;

    // Give the DOM time to render
    const initTimeout = setTimeout(() => {
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        const errorMsg = "QR scanner container not found";
        console.error(errorMsg);
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }

      try {
        // Create scanner instance
        scanner = new Html5Qrcode(scannerContainerId);
        setIsInitialized(true);

        // Start camera scan
        const qrCodeSuccessCallback = (decodedText: string) => {
          if (mounted) {
            console.log("QR code scanned:", decodedText);
            onScan(decodedText);
            
            // Stop scanning after successful scan
            if (scanner) {
              scanner.stop().catch(e => {
                console.error("Error stopping scanner after successful scan:", e);
              });
            }
          }
        };

        scanner
          .start(
            { facingMode: "environment" }, // Camera facing mode
            { fps }, // Config
            qrCodeSuccessCallback, // On success function
            undefined // On failure function (optional)
          )
          .catch((err) => {
            const errorMsg = err.message || "Failed to start QR scanner";
            console.error("QR Scanner error:", err);
            setError(errorMsg);
            if (onError) onError(errorMsg);
          });
      } catch (err: any) {
        const errorMsg = err.message || "Could not initialize QR scanner";
        console.error("QR scanner initialization error:", err);
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    }, 500);

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      
      if (scanner) {
        scanner
          .stop()
          .catch((err) => {
            console.error("Error stopping scanner during cleanup:", err);
          });
      }
    };
  }, [fps, onScan, onError]);

  return (
    <div className="relative w-full">
      <div 
        id={scannerContainerId}
        className="w-full min-h-[300px] bg-gray-100"
      ></div>
      {error && (
        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
          {error}
        </div>
      )}
      {!isInitialized && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80">
          <p className="text-gray-500">Initializing camera...</p>
        </div>
      )}
    </div>
  );
};

export default QrScanner;