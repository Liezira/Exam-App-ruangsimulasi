import React from 'react';
import { motion } from 'framer-motion';

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}     // Posisi awal: Transparan & agak di bawah
      animate={{ opacity: 1, y: 0 }}      // Posisi akhir: Muncul & di posisi normal
      exit={{ opacity: 0, y: -20 }}       // (Opsional) Saat keluar
      transition={{ duration: 0.4, ease: "easeOut" }} // Durasi animasi
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;