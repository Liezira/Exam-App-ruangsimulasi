import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ticket, ShieldCheck, PlayCircle, Loader2 } from 'lucide-react';

const StudentDashboard = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!token) return alert("Masukkan kode token!");

    setLoading(true);
    const tokenCode = token.trim().toUpperCase();

    try {
      const docRef = doc(db, 'tokens', tokenCode);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        alert("Token tidak valid!");
        setLoading(false);
        return;
      }

      const data = docSnap.data();

      if (data.status === 'used') {
         // Jika ingin mengizinkan melihat hasil
         alert("Token ini sudah selesai digunakan."); 
         setLoading(false);
         return;
      }
      
      // Cek Expired (Opsional, misal 1 hari)
      const created = new Date(data.createdAt).getTime();
      if (Date.now() - created > 24 * 60 * 60 * 1000) {
          alert("Token kadaluarsa (Expired).");
          setLoading(false);
          return;
      }

      // Mulai Ujian: Set status active jika belum
      // Kita kirim state token ke halaman ujian via Router State
      navigate('/student/exam', { state: { token: tokenCode, studentName: data.studentName } });

    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-center">
          <ShieldCheck className="text-white w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-2xl font-bold text-white">Sistem Ujian Aman</h1>
          <p className="text-indigo-200 text-sm mt-1">Platform Ujian Berbasis Token</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleStart} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Masukkan Token Ujian
              </label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full pl-10 p-4 border-2 border-indigo-100 rounded-xl text-center font-mono text-xl font-bold uppercase tracking-widest focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition"
                  placeholder="UTBK-XXXXXX"
                />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-xs text-yellow-800 space-y-2">
               <p className="font-bold">⚠️ Peraturan Keamanan:</p>
               <ul className="list-disc pl-4 space-y-1">
                 <li>Dilarang pindah tab / minimize browser.</li>
                 <li>Dilarang split screen atau membuka aplikasi lain.</li>
                 <li>Copy-Paste dan Klik Kanan dimatikan.</li>
                 <li>Pelanggaran berulang akan menyebabkan <b>Diskualifikasi</b>.</li>
               </ul>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <PlayCircle />} 
              MULAI UJIAN
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;