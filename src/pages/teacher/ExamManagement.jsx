import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, addDoc, getDocs, query, where, writeBatch, doc, serverTimestamp, orderBy, getDoc 
} from 'firebase/firestore';
import { 
  Plus, Clock, Users, Save, X, Loader2, Ticket, CheckCircle2, FileText, AlertTriangle 
} from 'lucide-react';
import PageTransition from '../../components/PageTransition';

const ExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-Subject State
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    duration: 60, 
    questionCount: 20,
    examType: 'Latihan' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Load Data (Guru, Mapel Guru, Kelas, History Ujian)
  useEffect(() => {
    const initData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // A. Ambil Data Guru & Mapelnya
        let tData = null;
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) tData = docSnap.data();
        else {
          const qUser = query(collection(db, 'users'), where('email', '==', user.email));
          const snap = await getDocs(qUser);
          if (!snap.empty) tData = snap.docs[0].data();
        }

        if (tData) {
          let sIds = [];
          if (Array.isArray(tData.subjectIds)) sIds = tData.subjectIds;
          else if (tData.subjectId) sIds = [tData.subjectId];

          if (sIds.length > 0) {
            const subQuery = query(collection(db, 'subjects'), where('__name__', 'in', sIds));
            const subSnap = await getDocs(subQuery);
            const mySubjects = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            setTeacherSubjects(mySubjects);
            if (mySubjects.length > 0) setActiveSubjectId(mySubjects[0].id);
          }
        }

        // B. Ambil Daftar Kelas
        const classSnap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
        setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // C. Ambil Riwayat Ujian Guru Ini
        const examSnap = await getDocs(query(collection(db, 'exam_sessions'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc')));
        setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Handle Create Exam
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!activeSubjectId) return alert("Pilih mata pelajaran terlebih dahulu.");
    if (!formData.examType.trim()) return alert("Tipe Ujian wajib diisi!");
    
    setIsSubmitting(true);
    try {
      // FIX: Sanitasi ID agar cocok dengan Bank Soal (lowercase + underscore)
      const cleanType = formData.examType.trim().replace(/\s+/g, '_').toLowerCase();
      
      // Generate ID Sumber Soal: IDGuru_IDMapel_TipeUjianBersih
      const questionSourceId = `${auth.currentUser.uid}_${activeSubjectId}_${cleanType}`;

      // A. Buat Sesi Ujian
      const examRef = await addDoc(collection(db, 'exam_sessions'), {
        teacherId: auth.currentUser.uid,
        subjectId: activeSubjectId, 
        name: formData.name,
        classId: formData.classId,
        duration: parseInt(formData.duration),
        examType: formData.examType, // Simpan nama asli (Display)
        cleanExamType: cleanType,    // Simpan ID bersih (Technical)
        questionSourceId: questionSourceId, // Link ke Bank Soal
        createdAt: serverTimestamp(),
        status: 'active'
      });

      // B. Ambil Siswa
      const studentsQuery = query(collection(db, 'users'), where('classId', '==', formData.classId), where('role', '==', 'student'));
      const studentsSnap = await getDocs(studentsQuery);

      if (studentsSnap.empty) {
        alert("Kelas ini kosong! Ujian dibuat tapi tidak ada token.");
        setIsSubmitting(false);
        setIsModalOpen(false);
        return; 
      }

      // C. Generate Tokens
      const batch = writeBatch(db);
      studentsSnap.forEach((studentDoc) => {
        const sData = studentDoc.data();
        const tokenCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const tokenRef = doc(db, 'tokens', tokenCode);
        batch.set(tokenRef, {
          tokenCode: tokenCode,
          examSessionId: examRef.id,
          studentName: sData.displayName,
          studentId: studentDoc.id,
          classId: formData.classId,
          examSubjectId: activeSubjectId, 
          // Simpan info penting di token juga untuk redundansi
          teacherId: auth.currentUser.uid, 
          examType: formData.examType, 
          questionSourceId: questionSourceId, // Critical Data for ExamSession
          status: 'active',
          score: null,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();

      alert(`Sukses! Ujian "${formData.name}" berhasil dibuat.`);
      window.location.reload(); 

    } catch (error) {
      console.error(error);
      alert("Gagal membuat ujian.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubjectName = (id) => teacherSubjects.find(s => s.id === id)?.name || 'Unknown';
  const getClassName = (id) => classes.find(c => c.id === id)?.name || 'Unknown';

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline text-indigo-600"/> Memuat data...</div>;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Ujian</h2>
          <p className="text-gray-500 text-sm">Buat jadwal dan generate token.</p>
        </div>
        
        {/* Tombol Buat Ujian hanya aktif jika punya mapel */}
        {teacherSubjects.length > 0 ? (
           <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition">
             <Plus size={18} /> Buat Ujian Baru
           </button>
        ) : (
           <div className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs border border-red-200 flex items-center gap-1">
             <AlertTriangle size={14}/> Anda belum memiliki Mapel
           </div>
        )}
      </div>

      <div className="grid gap-4">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <FileText className="text-indigo-600" size={20}/> {exam.name}
                </h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold text-xs border border-indigo-100">
                    {getSubjectName(exam.subjectId)}
                  </span>
                  <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded font-bold text-xs border border-yellow-100">
                    {exam.examType || 'Latihan'}
                  </span>
                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Users size={14}/> {getClassName(exam.classId)}</span>
                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><Clock size={14}/> {exam.duration} Menit</span>
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded font-bold"><CheckCircle2 size={14}/> Aktif</span>
                </div>
              </div>
              <button 
                onClick={() => alert(`Token Ujian ini tersimpan di database. \n\nID: ${exam.id}\nMapel: ${getSubjectName(exam.subjectId)}\nTipe: ${exam.examType || 'Latihan'}\nSourceID: ${exam.questionSourceId}`)}
                className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
              >
                <Ticket size={16}/> Cek Token
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
              
              {/* PILIH MAPEL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mata Pelajaran</label>
                <select 
                  required 
                  value={activeSubjectId} 
                  onChange={e => setActiveSubjectId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50 font-bold text-indigo-900"
                >
                  {teacherSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* NAMA UJIAN */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Ujian</label>
                <input 
                  type="text" required placeholder="Contoh: UH 1 Logaritma"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* TARGET KELAS */}
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
              </div>

              {/* FIX: TIPE UJIAN (INPUT FLEXIBLE) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipe Ujian (Bank Soal)</label>
                <input 
                    required
                    list="examTypeOptions"
                    value={formData.examType} 
                    onChange={e => setFormData({...formData, examType: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ketik atau Pilih..."
                />
                <datalist id="examTypeOptions">
                    <option value="Latihan" />
                    <option value="Ulangan" />
                    <option value="UTS" />
                    <option value="UAS" />
                    <option value="Tryout" />
                    <option value="Remedial" />
                </datalist>
                <p className="text-[10px] text-gray-500 mt-1">*Harus sama persis dengan Kategori di Bank Soal.</p>
              </div>

              {/* DURASI & RANDOM PLACEHOLDER */}
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
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Soal</label>
                  <input 
                    type="text" disabled value="Auto (Random)" 
                    className="w-full p-3 border border-gray-300 bg-gray-100 text-gray-500 rounded-lg outline-none cursor-not-allowed text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
};

export default ExamManagement;