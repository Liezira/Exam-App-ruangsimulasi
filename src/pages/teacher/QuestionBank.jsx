import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, getDoc, getDocs 
} from 'firebase/firestore';
import { 
  Plus, Pencil, Trash2, Save, X, ArrowLeft, Image as ImageIcon, AlertTriangle, ChevronDown 
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const QuestionBank = () => {
  const [viewMode, setViewMode] = useState('list');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-Subject State
  const [teacherSubjects, setTeacherSubjects] = useState([]); // List mapel yg dimiliki guru
  const [activeSubjectId, setActiveSubjectId] = useState(''); // Mapel yg sedang dipilih/aktif

  // Form State
  const [formData, setFormData] = useState({
    type: 'pilihan_ganda', question: '', image: '', options: ['', '', '', '', ''], correctAnswer: 'A'
  });
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Load Profile & Subjects
  useEffect(() => {
    const initData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // A. Ambil Data Guru
        let tData = null;
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) tData = docSnap.data();
        else {
          const qUser = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(qUser);
          if (!querySnapshot.empty) tData = querySnapshot.docs[0].data();
        }

        if (tData) {
          // B. Normalisasi Subject IDs (Support legacy string & new array)
          let sIds = [];
          if (Array.isArray(tData.subjectIds)) sIds = tData.subjectIds;
          else if (tData.subjectId) sIds = [tData.subjectId];

          if (sIds.length > 0) {
            // C. Ambil Detail Nama Mapel dari collection 'subjects'
            // Firestore 'in' query max 10 items. Asumsi guru ngajar < 10 mapel.
            const subQuery = query(collection(db, 'subjects'), where('__name__', 'in', sIds));
            const subSnap = await getDocs(subQuery);
            const mySubjects = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            setTeacherSubjects(mySubjects);
            setActiveSubjectId(mySubjects[0].id); // Default pilih yg pertama
          }
        }
      } catch (err) {
        console.error("Error init:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Load Soal ketika ActiveSubjectId berubah
  useEffect(() => {
    if (!activeSubjectId) {
        setQuestions([]);
        return;
    }

    const q = query(collection(db, 'bank_soal'), where('subjectId', '==', activeSubjectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setQuestions(data);
    });
    return unsubscribe;
  }, [activeSubjectId]);

  // Handle Image, Submit, Delete (Sama seperti sebelumnya, cuma pakai activeSubjectId)
  const handleImageUpload = (e) => { /* Code Upload Gambar Sama */ 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData({ ...formData, image: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeSubjectId) return alert("Error: Tidak ada mapel aktif.");
    
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        subjectId: activeSubjectId, // PENTING: Gunakan ID mapel yang sedang dipilih
        teacherId: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      };

      if (editingId) await updateDoc(doc(db, 'bank_soal', editingId), payload);
      else await addDoc(collection(db, 'bank_soal'), { ...payload, createdAt: serverTimestamp() });
      
      setViewMode('list');
      setFormData({ type: 'pilihan_ganda', question: '', image: '', options: ['', '', '', '', ''], correctAnswer: 'A' });
      setEditingId(null);
    } catch (error) {
      alert("Gagal menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Hapus soal?")) await deleteDoc(doc(db, 'bank_soal', id));
  };
  
  const handleEdit = (item) => {
     setEditingId(item.id);
     setFormData({ type: item.type||'pilihan_ganda', question: item.question, image: item.image||'', options: item.options||['','','','',''], correctAnswer: item.correctAnswer||'A' });
     setViewMode('edit');
  };

  // --- RENDER ---
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Bank Soal</h2>
            <p className="text-gray-500 text-sm">Kelola soal per mata pelajaran.</p>
          </div>
          
          {/* SWITCHER MAPEL (Dropdown Pintar) */}
          <div className="flex gap-2">
             {teacherSubjects.length > 0 && (
                 <div className="relative">
                    <select 
                        value={activeSubjectId} 
                        onChange={(e) => setActiveSubjectId(e.target.value)}
                        className="appearance-none bg-white border border-indigo-200 text-indigo-700 py-2.5 pl-4 pr-10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    >
                        {teacherSubjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 text-indigo-500 pointer-events-none" size={16} />
                 </div>
             )}
             
             <button 
                disabled={!activeSubjectId}
                onClick={() => setViewMode('create')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition shadow-lg"
             >
                <Plus size={18} /> Buat Soal
             </button>
          </div>
        </div>

        {teacherSubjects.length === 0 && !loading && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 border border-red-200">
            <AlertTriangle /> Akun Anda belum terhubung dengan Mata Pelajaran apapun.
          </div>
        )}

        {/* LIST SOAL */}
        <div className="grid gap-4">
            {/* ... (Bagian render list soal SAMA PERSIS dengan sebelumnya) ... */}
            {questions.map((q, idx) => (
                <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                           {activeSubjectId && teacherSubjects.find(s=>s.id===activeSubjectId)?.name} • No. {questions.length - idx}
                        </span>
                        <div className="flex gap-2">
                           <button onClick={() => handleEdit(q)} className="text-blue-600 bg-blue-50 p-1.5 rounded"><Pencil size={16}/></button>
                           <button onClick={() => handleDelete(q.id)} className="text-red-600 bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <div className="mb-4 text-gray-800 text-sm"><Latex>{q.question}</Latex></div>
                    {q.image && <img src={q.image} alt="Soal" className="h-24 object-contain rounded border mb-3 bg-gray-50" />}
                    {/* Render Options... (Sama) */}
                    {q.type === 'pilihan_ganda' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                            {q.options.map((opt, i) => (
                                <div key={i} className={`flex gap-2 items-center p-2 rounded border ${['A','B','C','D','E'][i] === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50'}`}>
                                    <span className="w-5 h-5 flex items-center justify-center bg-white border rounded text-[10px]">{['A','B','C','D','E'][i]}</span>
                                    <span className="truncate"><Latex>{opt}</Latex></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
             {questions.length === 0 && !loading && activeSubjectId && (
                <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    Belum ada soal untuk mapel ini.
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- RENDER VIEW: CREATE / EDIT (SAMA PERSIS) ---
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* ... (Isi Form SAMA PERSIS dengan kode sebelumnya, copy paste saja bagian formnya) ... */}
        {/* Header Form */}
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('list')} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft size={20}/></button>
            <h2 className="font-bold text-lg text-gray-800">
                {viewMode === 'create' ? `Buat Soal: ${teacherSubjects.find(s=>s.id===activeSubjectId)?.name}` : 'Edit Soal'}
            </h2>
            </div>
            {/* ... sisa form ... */}
            <div className="flex gap-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    {formData.type === 'pilihan_ganda' ? 'PG' : 'Isian'}
                </span>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* ... Copy Paste isi form dari kode sebelumnya ... */}
            {/* TYPE SOAL */}
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" value="pilihan_ganda" checked={formData.type === 'pilihan_ganda'} onChange={() => setFormData({...formData, type: 'pilihan_ganda'})}/><span className="text-sm font-medium">PG</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" value="isian" checked={formData.type === 'isian'} onChange={() => setFormData({...formData, type: 'isian'})}/><span className="text-sm font-medium">Isian</span></label>
            </div>
            {/* INPUT PERTANYAAN */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Pertanyaan</label>
                <textarea required rows={4} value={formData.question} onChange={(e) => setFormData({...formData, question: e.target.value})} className="w-full p-4 border rounded-xl outline-none" placeholder="Tulis soal..."/>
                {formData.question && <div className="mt-2 p-3 bg-gray-50 border rounded text-sm"><Latex>{formData.question}</Latex></div>}
            </div>
            {/* IMAGE UPLOAD */}
            <div>
                <label className="block text-sm font-bold mb-2">Gambar</label>
                <div className="flex gap-4"><input type="file" onChange={handleImageUpload} />{formData.image && <img src={formData.image} className="h-20"/>}</div>
            </div>
            {/* OPTIONS */}
            {formData.type === 'pilihan_ganda' ? (
                <div className="space-y-3 pt-4 border-t">
                    {formData.options.map((opt, i) => (
                        <div key={i} className="flex gap-2"><div className={`w-8 flex items-center justify-center font-bold border rounded ${['A','B','C','D','E'][i]===formData.correctAnswer?'bg-green-500 text-white':''}`} onClick={()=>setFormData({...formData, correctAnswer: ['A','B','C','D','E'][i]})}>{['A','B','C','D','E'][i]}</div><input value={opt} onChange={(e)=>{const n=[...formData.options];n[i]=e.target.value;setFormData({...formData, options:n})}} className="w-full p-2 border rounded" placeholder={`Opsi ${['A','B','C','D','E'][i]}`}/></div>
                    ))}
                </div>
            ) : (
                <div className="pt-4 border-t"><label>Kunci Jawaban</label><input value={formData.correctAnswer} onChange={e=>setFormData({...formData, correctAnswer:e.target.value})} className="w-full p-2 border rounded" /></div>
            )}
            {/* BUTTONS */}
            <div className="pt-6 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 border rounded font-bold">Batal</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">{isSaving?'Simpan...':'Simpan'}</button>
            </div>
        </form>
    </div>
  );
};

export default QuestionBank;