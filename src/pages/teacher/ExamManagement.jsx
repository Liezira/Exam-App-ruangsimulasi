import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, addDoc, getDocs, query, where, writeBatch, doc, serverTimestamp, orderBy, getDoc 
} from 'firebase/firestore';
import { 
  Plus, Calendar, Clock, Users, Save, X, Loader2, Ticket, CheckCircle2, FileText 
} from 'lucide-react';

const ExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    duration: 60, // menit
    questionCount: 20
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Load Data Awal
  useEffect(() => {
    const initData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Ambil Profil Guru (untuk subjectId)
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const tData = userSnap.data();
        setTeacherProfile(tData);

        // Ambil Daftar Kelas
        const classSnap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
        setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Ambil Riwayat Ujian yg dibuat guru ini
        const examSnap = await getDocs(query(collection(db, 'exam_sessions'), where('teacherId', '==', user.uid)));
        setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Handle Create Exam & Generate Tokens
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!teacherProfile?.subjectId) return alert("Anda belum memiliki Mapel aktif.");
    
    setIsSubmitting(true);
    try {
      // A. Buat Dokumen Sesi Ujian
      const examRef = await addDoc(collection(db, 'exam_sessions'), {
        teacherId: auth.currentUser.uid,
        subjectId: teacherProfile.subjectId,
        name: formData.name,
        classId: formData.classId,
        duration: parseInt(formData.duration),
        createdAt: serverTimestamp(),
        status: 'active'
      });

      // B. Ambil Siswa di Kelas Tersebut
      const studentsQuery = query(collection(db, 'users'), where('classId', '==', formData.classId), where('role', '==', 'student'));
      const studentsSnap = await getDocs(studentsQuery);

      if (studentsSnap.empty) {
        alert("Kelas ini tidak memiliki siswa! Ujian dibuat tapi tidak ada token.");
        setIsSubmitting(false);
        setIsModalOpen(false);
        return;
      }

      // C. Batch Generate Tokens
      const batch = writeBatch(db);
      
      studentsSnap.forEach((studentDoc) => {
        const sData = studentDoc.data();
        // Generate Token 6 Digit (Huruf + Angka)
        const tokenCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const tokenRef = doc(db, 'tokens', tokenCode);
        batch.set(tokenRef, {
          tokenCode: tokenCode,
          examSessionId: examRef.id,
          studentName: sData.displayName,
          studentId: studentDoc.id,
          classId: formData.classId,
          status: 'active',
          score: null,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();

      alert(`Sukses! ${studentsSnap.size} Token ujian berhasil digenerate.`);
      window.location.reload(); // Reload simple untuk refresh data

    } catch (error) {
      console.error(error);
      alert("Gagal membuat ujian.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline text-indigo-600"/> Memuat data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Ujian</h2>
          <p className="text-gray-500 text-sm">Buat jadwal dan generate token untuk kelas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} /> Buat Ujian Baru
        </button>
      </div>

      <div className="grid gap-4">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <FileText className="text-indigo-600" size={20}/> {exam.name}
                </h3>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Users size={14}/> Kelas: {classes.find(c=>c.id===exam.classId)?.name || 'Unknown'}</span>
                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Clock size={14}/> {exam.duration} Menit</span>
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded font-bold"><CheckCircle2 size={14}/> Aktif</span>
                </div>
              </div>
              <button 
                onClick={() => alert(`Fitur Cetak Kartu Ujian (PDF) akan hadir di update selanjutnya. \nID Ujian: ${exam.id}`)}
                className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
              >
                <Ticket size={16}/> Lihat Token
              </button>
            </div>
          </div>
        ))}
        
        {exams.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
            Belum ada ujian yang dibuat.
          </div>
        )}
      </div>

      {/* MODAL BUAT UJIAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">Setting Ujian Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Ujian</label>
                <input 
                  type="text" required placeholder="Contoh: Ulangan Harian Bab 1"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target Kelas</label>
                <select 
                  required 
                  value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">*Token akan otomatis dibuat untuk semua siswa di kelas ini.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Durasi (Menit)</label>
                  <input 
                    type="number" required min="10"
                    value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Jumlah Soal</label>
                  <input 
                    type="number" disabled value={20} 
                    className="w-full p-3 border border-gray-300 bg-gray-100 text-gray-500 rounded-lg outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Generate Token & Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;