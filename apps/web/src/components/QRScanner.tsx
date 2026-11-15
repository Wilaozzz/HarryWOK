// ========================================
// apps/web/src/components/QRScanner.tsx
// Escáner de códigos QR con cámara para Panel de Caja
// ========================================

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onScan,
  onClose,
  title = 'Escanear Código QR del Cliente',
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-reader-container';

  // Obtener dispositivos de cámara disponibles
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setErrorMessage(null);

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Preferir cámara trasera si existe en las etiquetas
          const backCam = devices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setErrorMessage('No se detectaron cámaras en este dispositivo.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error al solicitar permisos de cámara:', err);
        setErrorMessage(
          'Permiso de cámara denegado o no disponible. Verifica los permisos de tu navegador.'
        );
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  // Iniciar el escáner cuando hay cámara seleccionada
  const startScanner = async (cameraId: string) => {
    if (isScanning || !cameraId) return;
    setErrorMessage(null);
    setIsProcessing(false);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          // Éxito al leer QR: prevenir lecturas duplicadas en ráfaga
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame sin QR detectado (ignorar normalmente)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error al iniciar cámara:', err);
      setErrorMessage(
        err?.message || 'No se pudo iniciar el flujo de video de la cámara.'
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Error al detener escáner:', err);
      }
      setIsScanning(false);
    }
  };

  const handleSuccessfulScan = async (rawText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Limpieza o extracción del código
    let code = rawText.trim();

    // Si viene como JSON {"customer_code": "HW-..."}
    try {
      if (code.startsWith('{') && code.endsWith('}')) {
        const parsed = JSON.parse(code);
        if (parsed.customer_code) {
          code = parsed.customer_code;
        }
      }
    } catch {
      // Ignorar error de parsing si no era JSON
    }

    // Si viene con URL ej: https://.../client/HW-XXXXXX
    if (code.includes('HW-')) {
      const match = code.match(/HW-[A-Za-z0-9]+/);
      if (match) {
        code = match[0];
      }
    }

    // Detener la cámara tras lectura exitosa
    await stopScanner();

    // Notificar al componente padre
    onScan(code.toUpperCase());
    onClose();
  };

  // Iniciar automáticamente cuando se selecciona la cámara
  useEffect(() => {
    if (isOpen && selectedCameraId && !isScanning && !errorMessage) {
      startScanner(selectedCameraId);
    }
  }, [isOpen, selectedCameraId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 440, width: '92%', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📷 {title}</h3>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#888',
            }}
          >
            ✕
          </button>
        </div>

        {errorMessage ? (
          <div className="alert-box alert-error" style={{ marginBottom: 16 }}>
            {errorMessage}
          </div>
        ) : null}

        {/* Selector de cámara si hay más de 1 */}
        {cameras.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-sub)' }}>
              Seleccionar cámara:
            </label>
            <select
              className="input"
              style={{ padding: '6px 10px', fontSize: 13 }}
              value={selectedCameraId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedCameraId(newId);
                stopScanner().then(() => startScanner(newId));
              }}
              disabled={isProcessing}
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Cámara ${c.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Visor de video del escáner */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 270,
            backgroundColor: '#000',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <div
            id={readerElementId}
            style={{
              width: '100%',
              height: '100%',
            }}
          />

          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                zIndex: 10,
              }}
            >
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Procesando QR...</p>
              <p style={{ fontSize: 12, color: '#ccc' }}>Identificando cliente en base de datos</p>
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-sub)', textAlign: 'center', marginBottom: 16 }}>
          Enfoca el código QR de la app móvil dentro del recuadro para identificar al cliente.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          {isScanning ? (
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={stopScanner}
              disabled={isProcessing}
            >
              Pausar Cámara
            </button>
          ) : (
            <button
              className="btn btn-red"
              style={{ flex: 1 }}
              onClick={() => startScanner(selectedCameraId)}
              disabled={isProcessing || !selectedCameraId}
            >
              Reanudar Cámara
            </button>
          )}

          <button
            className="btn btn-ghost"
            onClick={() => {
              stopScanner();
              onClose();
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
