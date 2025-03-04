'use client';

import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Html5QrcodePluginProps {
  fps?: number;
  qrCodeSuccessCallback: (decodedText: string) => void;
  disableFlip?: boolean;
}

const QrScanner: React.FC<Html5QrcodePluginProps> = ({
  fps = 10,
  qrCodeSuccessCallback,
  disableFlip = false,
}) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanning = useRef(false);
  const qrCodeScannerDivId = 'html5qrcode-scanner';

  useEffect(() => {
    // Initialize QR scanner
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(qrCodeScannerDivId);
    }

    // Start scanning
    if (html5QrCodeRef.current && !isScanning.current) {
      isScanning.current = true;

      html5QrCodeRef.current
        .start(
          { facingMode: "environment" },
          {
            fps,
            qrCodeSuccessCallback: (decodedText) => {
              qrCodeSuccessCallback(decodedText);
            },
          },
          undefined
        )
        .catch((err) => {
          console.error("Error starting QR scanner:", err);
        });
    }

    // Cleanup
    return () => {
      if (html5QrCodeRef.current && isScanning.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            isScanning.current = false;
          })
          .catch((err) => {
            console.error("Error stopping QR scanner:", err);
          });
      }
    };
  }, [fps, qrCodeSuccessCallback]);

  return (
    <div style={{ width: '100%' }}>
      <div id={qrCodeScannerDivId} style={{ width: '100%', minHeight: '300px' }}></div>
    </div>
  );
};

export default QrScanner;