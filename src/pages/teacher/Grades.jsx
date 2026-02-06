import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, getDocs, query, where, orderBy, doc, getDoc 
} from 'firebase/firestore';
import { 
  BarChart3, Download, Search, FileSpreadsheet, Eye, X, CheckCircle2 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FileText } from 'lucide-react'; 
import { exportRaportPDF } from '../../utils/ReportGenerator'; 
import PageTransition from '../../components/PageTransition';

const TeacherGrades = () => {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Load Daftar Ujian milik Guru ini
  useEffect(() => {
    const loadExams = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      const q = query(
        collection(db, 'exam_sessions'), 
        where('teacherId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExams(data);
      
      if (data.length > 0) setSelectedExamId(data[0].id); // Auto select yang terbaru
    };
    loadExams();
  }, []);

  // 2. Load Hasil Nilai berdasarkan Ujian yg dipilih
  useEffect(() => {
    if (!selectedExamId) return;

    const loadResults = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'tokens'),
          where('examSessionId', '==', selectedExamId),
          where('status', '==', 'used') // Hanya ambil yang sudah selesai
        );
        
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sortir berdasarkan Nilai Tertinggi
        data.sort((a, b) => b.score - a.score);
        setResults(data);
      } catch (error) {
        console.error("Error loading results:", error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [selectedExamId]);

  // 3. Fungsi Export ke Excel
  const handleExport = () => {
    const examName = exams.find(e => e.id === selectedExamId)?.name || 'Ujian';
    
    const dataToExport = results.map((r, index) => ({
      "Peringkat": index + 1,
      "Nama Siswa": r.studentName,
      "Nilai Akhir": r.score,
      "Waktu Selesai": new Date(r.finishedAt).toLocaleString('id-ID'),
      "Token": r.tokenCode
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nilai Siswa");
    XLSX.writeFile(wb, `Nilai_${examName.replace(/\s+/g, '_')}.xlsx`);
  };

  const filteredResults = results.filter(r => 
    r.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = () => {
    if (results.length === 0) return alert("Belum ada data nilai!");
    
    const examData = exams.find(e => e.id === selectedExamId);
    const examName = examData?.name || 'Ujian';
    const className = "Semua Kelas"; // Nanti bisa disesuaikan jika filter per kelas
    const teacherName = auth.currentUser?.displayName || "Guru Pengampu";

    exportRaportPDF(examName, className, teacherName, results);
  };

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rekap Nilai Siswa</h2>
          <p className="text-gray-500 text-sm">Pantau hasil ujian dan analisis performa siswa.</p>
        </div>
        
        {/* Dropdown Pilih Ujian */}
        <select 
          value={selectedExamId} 
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="p-2 border rounded-lg bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
        >
          {exams.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
          {exams.length === 0 && <option>Belum ada ujian</option>}
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Total Peserta Selesai</p>
          <p className="text-2xl font-bold text-indigo-600">{results.length} Siswa</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Nilai Tertinggi</p>
          <p className="text-2xl font-bold text-green-600">
            {results.length > 0 ? Math.max(...results.map(r => r.score)) : 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Rata-rata Kelas</p>
          <p className="text-2xl font-bold text-blue-600">
            {results.length > 0 
              ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length) 
              : 0}
          </p>
        </div>
      </div>

      {/* Tools Bar */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white px-3 py-2 border rounded-lg">
          <Search size={18} className="text-gray-400"/>
          <input 
            type="text" 
            placeholder="Cari nama siswa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-sm"
          />
        </div>
        <button 
            onClick={handleDownloadPDF}
            disabled={results.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm disabled:opacity-50 transition shadow-sm"
          >
            <FileText size={18}/> Raport PDF
          </button>
        <button 
          onClick={handleExport}
          disabled={results.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm disabled:opacity-50 transition"
        >
          <FileSpreadsheet size={18}/> Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b">
            <tr>
              <th className="p-4 text-center w-16">Rank</th>
              <th className="p-4">Nama Siswa</th>
              <th className="p-4 text-center">Token</th>
              <th className="p-4 text-center">Waktu Selesai</th>
              <th className="p-4 text-center">Nilai Akhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">Memuat data...</td></tr>
            ) : filteredResults.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">Belum ada data nilai masuk.</td></tr>
            ) : (
              filteredResults.map((r, idx) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-4 text-center font-mono font-bold text-gray-500">#{idx + 1}</td>
                  <td className="p-4 font-bold text-gray-800">{r.studentName}</td>
                  <td className="p-4 text-center font-mono text-xs bg-gray-50 text-gray-500 rounded">{r.tokenCode}</td>
                  <td className="p-4 text-center text-gray-500 text-xs">
                    {new Date(r.finishedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full font-bold ${r.score >= 75 ? 'bg-green-100 text-green-700' : r.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {r.score}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </PageTransition>
  );
};

export default TeacherGrades;