import React, { useEffect, useRef } from 'react';

const SECURITY_CONFIG = {
  MAX_VIOLATIONS: 3, 
  THRESHOLD_DEVTOOLS: 160
};

const AdvancedSecurityMonitor = ({ isActive, onViolation }) => {
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // 1. INJEKSI CSS ANTI-SELECT (Mencegah blok teks)
    const style = document.createElement('style');
    style.innerHTML = `
      body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } 
      @media print { html, body { display: none !important; } }
    `;
    document.head.appendChild(style);

    // 2. MONITOR INTEGRITAS LAYAR
    const checkIntegrity = () => {
      const now = Date.now();
      
      // A. Deteksi Pindah Tab / Minimize
      if (document.hidden) {
        onViolation('visibility', '⚠️ Terdeteksi pindah tab / minimize!');
      }

      // B. Deteksi Split Screen (Analisis Ukuran Window)
      const screenHeight = window.screen.availHeight || window.screen.height;
      const windowHeight = window.innerHeight;
      
      // Toleransi 20% untuk address bar browser HP
      if (windowHeight < screenHeight * 0.80) {
         // Cek apakah keyboard sedang aktif (input focus) agar tidak false positive
         const activeTag = document.activeElement?.tagName;
         if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
            onViolation('split_screen', '🚫 Dilarang Split Screen! Gunakan Fullscreen.');
         }
      }

      // C. Deteksi DevTools (Inspeksi Elemen)
      if (
        window.outerWidth - window.innerWidth > SECURITY_CONFIG.THRESHOLD_DEVTOOLS || 
        window.outerHeight - window.innerHeight > SECURITY_CONFIG.THRESHOLD_DEVTOOLS
      ) {
        onViolation('devtools', '🚫 Terdeteksi Inspect Element/DevTools!');
      }

      lastActivityRef.current = now;
    };

    checkIntervalRef.current = setInterval(checkIntegrity, 800);

    // 3. EVENT LISTENERS (Blokir Copy Paste Klik Kanan)
    const handleCopy = (e) => { e.preventDefault(); onViolation('copy', '🚫 Copy dinonaktifkan.'); };
    const handlePaste = (e) => { e.preventDefault(); onViolation('paste', '🚫 Paste dinonaktifkan.'); };
    const handleContextMenu = (e) => { e.preventDefault(); onViolation('right_click', '🚫 Klik kanan dinonaktifkan.'); };
    const handleBlur = () => onViolation('blur', '⚠️ Fokus hilang dari ujian.');

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleBlur);

    return () => {
      clearInterval(checkIntervalRef.current);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleBlur);
      if(document.head.contains(style)) document.head.removeChild(style);
    };
  }, [isActive, onViolation]);

  return null; // Komponen ini tidak merender UI, hanya Logic
};

export default AdvancedSecurityMonitor;