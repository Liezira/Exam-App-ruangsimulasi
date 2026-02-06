import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const BulkImportStudents = ({ classId, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dataPreview, setDataPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Baca File Excel
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Validasi sederhana
      if (data.length > 0 && (!data[0].Nama || !data[0].Email || !data[0].NIS)) {
        setError("Format Excel salah! Pastikan header: Nama, Email, NIS");
        setDataPreview([]);
      } else {
        setDataPreview(data);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // 2. Upload ke Firestore (Batch)
  const handleUpload = async () => {
    if (!classId) return alert("Pilih kelas dulu sebelum import!");
    if (dataPreview.length === 0) return;

    setLoading(true);
    const batch = writeBatch(db);

    try {
      dataPreview.forEach((row) => {
        // Gunakan Email atau NIS sebagai ID dokumen agar unik
        const docId = row.Email.replace(/[^a-zA-Z0-9]/g, '_'); 
        const docRef = doc(db, 'users', docId);
        
        batch.set(docRef, {
          role: 'student',
          displayName: row.Nama,
          email: row.Email,
          nis: row.NIS ? String(row.NIS) : '',
          classId: classId,
          createdAt: serverTimestamp(),
          // Default password logic tidak bisa di sini (harus via Auth), 
          // tapi data profil aman.
        });
      });

      await batch.commit();
      alert(`Berhasil mengimport ${dataPreview.length} siswa!`);
      setFile(null);
      setDataPreview([]);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error(err);
      setError("Gagal import: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Download Template
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ Nama: "Contoh Siswa", Email: "siswa@sekolah.sch.id", NIS: "12345" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-green-600"/> Import Siswa (Bulk)
          </h3>
          <p className="text-xs text-gray-500 mt-1">Upload Excel untuk memasukkan banyak siswa sekaligus.</p>
        </div>
        <button onClick={downloadTemplate} className="text-indigo-600 text-xs font-bold hover:underline">Download Template</button>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-white hover:bg-gray-50 transition relative">
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <UploadCloud className="text-gray-400" size={32} />
          <span className="text-sm font-medium text-gray-600">
            {file ? file.name : "Klik atau Geser file Excel ke sini"}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-3 bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2">
           <AlertTriangle size={14}/> {error}
        </div>
      )}

      {dataPreview.length > 0 && !error && (
        <motion.div initial={{opacity:0, height: 0}} animate={{opacity:1, height: 'auto'}} className="mt-4">
           <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-600">Preview ({dataPreview.length} Data):</span>
              <button 
                onClick={handleUpload} 
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>} 
                Proses Import
              </button>
           </div>
           <div className="max-h-32 overflow-y-auto border rounded-lg bg-white text-xs">
              <table className="w-full text-left">
                 <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">Nama</th><th className="p-2">Email</th></tr></thead>
                 <tbody>
                    {dataPreview.map((row, i) => (
                       <tr key={i} className="border-b"><td className="p-2">{row.Nama}</td><td className="p-2">{row.Email}</td></tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </motion.div>
      )}
    </div>
  );
};

export default BulkImportStudents;