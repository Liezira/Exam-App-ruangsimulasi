import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, getDoc, getDocs 
} from 'firebase/firestore'; // Note: getDocs ditambahkan
import { 
  Plus, Search, Pencil, Trash2, Save, X, ArrowLeft, Image as ImageIcon, CheckCircle2, AlertTriangle, Eye 
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const QuestionBank = () => {
  // State Utama
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState(null);
  
  // State Form
  const [formData, setFormData] = useState({
    type: 'pilihan_ganda', // pilihan_ganda, isian
    question: '',
    image: '',
    options: ['', '', '', '', ''],
    correctAnswer: 'A'
  });
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Load Data Guru & Soal (LOGIC SMART LOOKUP)
  useEffect(() => {
    const initData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        let tData = null;

        // A. Cek by UID (Standar)
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          tData = docSnap.data();
        } else {
          // B. Fallback: Cek by Email (Khusus akun buatan Admin)
          const qUser = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(qUser);
          if (!querySnapshot.empty) {
            tData = querySnapshot.docs[0].data();
          }
        }

        if (tData) {
          setTeacherData(tData);

          if (tData.subjectId) {
            // Ambil soal HANYA untuk subjectId guru tersebut
            const q = query(collection(db, 'bank_soal'), where('subjectId', '==', tData.subjectId));
            const unsubscribe = onSnapshot(q, (snapshot) => {
              const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
              // Sort client side
              data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
              setQuestions(data);
              setLoading(false);
            });
            return unsubscribe; // Cleanup listener
          } else {
             setLoading(false);
          }
        } else {
            setLoading(false);
        }

      } catch (err) {
          console.error("Error init data:", err);
          setLoading(false);
      }
    };

    initData();
  }, []);

  // 2. Handle Image Upload (Base64)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("File terlalu besar! Maks 1MB"); return; }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  // 3. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teacherData?.subjectId) return alert("Error: Anda tidak memiliki Mapel.");
    
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        subjectId: teacherData.subjectId,
        teacherId: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'bank_soal', editingId), payload);
      } else {
        await addDoc(collection(db, 'bank_soal'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setViewMode('list');
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan soal.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Hapus soal ini permanen?")) {
      await deleteDoc(doc(db, 'bank_soal', id));
    }
  };

  // Helpers
  const resetForm = () => {
    setFormData({ type: 'pilihan_ganda', question: '', image: '', options: ['', '', '', '', ''], correctAnswer: 'A' });
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      type: item.type || 'pilihan_ganda',
      question: item.question,
      image: item.image || '',
      options: item.options || ['', '', '', '', ''],
      correctAnswer: item.correctAnswer || 'A'
    });
    setViewMode('edit');
  };

  // --- RENDER VIEW: LIST ---
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Bank Soal</h2>
            <p className="text-gray-500 text-sm">
              Mapel: <span className="font-bold text-indigo-600">{teacherData?.subjectId ? 'Aktif' : 'Tidak Ada'}</span> | Total: {questions.length} Soal
            </p>
          </div>
          <button 
            disabled={!teacherData?.subjectId}
            onClick={() => { resetForm(); setViewMode('create'); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:bg-gray-400"
          >
            <Plus size={18} /> Buat Soal
          </button>
        </div>

        {!teacherData?.subjectId && !loading && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 border border-red-200">
            <AlertTriangle /> Akun Anda belum terhubung dengan Mata Pelajaran. Hubungi Admin.
          </div>
        )}

        <div className="grid gap-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">
                  No. {questions.length - idx} • {q.type === 'isian' ? 'ISIAN' : 'PG'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(q)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Pencil size={16}/></button>
                  <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                </div>
              </div>
              
              <div className="mb-4 text-gray-800 text-sm">
                 <Latex>{q.question}</Latex>
              </div>
              
              {q.image && (
                <img src={q.image} alt="Soal" className="h-24 object-contain rounded border mb-3 bg-gray-50" />
              )}

              {q.type === 'pilihan_ganda' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                  {q.options.map((opt, i) => {
                    const label = ['A','B','C','D','E'][i];
                    return (
                      <div key={i} className={`flex gap-2 items-center p-2 rounded border ${label === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-100'}`}>
                        <span className="w-5 h-5 flex items-center justify-center bg-white border rounded text-[10px]">{label}</span>
                        <span className="truncate"><Latex>{opt}</Latex></span>
                      </div>
                    )
                  })}
                </div>
              )}
              {q.type === 'isian' && (
                 <div className="bg-green-50 text-green-800 p-2 rounded text-xs font-bold border border-green-200 inline-block">
                    Kunci: {q.correctAnswer}
                 </div>
              )}
            </div>
          ))}
          {questions.length === 0 && !loading && teacherData?.subjectId && (
            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">Belum ada soal dibuat.</div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER VIEW: CREATE / EDIT ---
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('list')} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft size={20}/></button>
          <h2 className="font-bold text-lg text-gray-800">{viewMode === 'create' ? 'Buat Soal Baru' : 'Edit Soal'}</h2>
        </div>
        <div className="flex gap-2">
           <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {formData.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Isian'}
           </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Tipe Soal */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" name="type" value="pilihan_ganda" 
              checked={formData.type === 'pilihan_ganda'} 
              onChange={() => setFormData({...formData, type: 'pilihan_ganda'})}
            />
            <span className="text-sm font-medium">Pilihan Ganda</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" name="type" value="isian" 
              checked={formData.type === 'isian'} 
              onChange={() => setFormData({...formData, type: 'isian'})}
            />
            <span className="text-sm font-medium">Isian Singkat</span>
          </label>
        </div>

        {/* Pertanyaan */}
        <div>
           <label className="block text-sm font-bold text-gray-700 mb-2">Pertanyaan (Support LaTeX: $...$)</label>
           <textarea 
             required
             rows={4}
             value={formData.question}
             onChange={(e) => setFormData({...formData, question: e.target.value})}
             className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base"
             placeholder="Tulis soal di sini..."
           />
           {/* Preview Pertanyaan */}
           {formData.question && (
             <div className="mt-2 p-3 bg-gray-50 border rounded-lg text-sm text-gray-700">
               <strong className="text-xs text-gray-400 block mb-1 uppercase">Preview:</strong>
               <Latex>{formData.question}</Latex>
             </div>
           )}
        </div>

        {/* Gambar */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Gambar Soal (Opsional)</label>
          <div className="flex items-start gap-4">
            <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition">
              <ImageIcon size={18} /> Upload Gambar
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {formData.image && (
              <div className="relative group">
                <img src={formData.image} alt="Preview" className="h-32 rounded-lg border bg-gray-100 object-contain" />
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, image: ''})}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                >
                  <X size={14}/>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Opsi Jawaban (Jika PG) */}
        {formData.type === 'pilihan_ganda' ? (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-bold text-gray-700">Pilihan Jawaban & Kunci</p>
            {formData.options.map((opt, i) => {
              const label = ['A','B','C','D','E'][i];
              return (
                <div key={i} className="flex gap-3 items-center">
                   <button 
                      type="button"
                      onClick={() => setFormData({...formData, correctAnswer: label})}
                      className={`w-10 h-10 flex-shrink-0 rounded-lg font-bold border-2 transition ${formData.correctAnswer === label ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                   >
                     {label}
                   </button>
                   <div className="flex-1">
                     <input 
                       type="text"
                       required
                       value={opt}
                       onChange={(e) => {
                         const newOpts = [...formData.options];
                         newOpts[i] = e.target.value;
                         setFormData({...formData, options: newOpts});
                       }}
                       className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                       placeholder={`Opsi ${label}`}
                     />
                   </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="border-t pt-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Kunci Jawaban Benar</label>
            <input 
              type="text"
              required
              value={formData.correctAnswer}
              onChange={(e) => setFormData({...formData, correctAnswer: e.target.value})}
              className="w-full p-3 border-2 border-green-200 rounded-lg focus:border-green-500 outline-none font-bold text-gray-800"
              placeholder="Contoh: 45 atau Jakarta"
            />
          </div>
        )}

        {/* Tombol Simpan */}
        <div className="pt-6 border-t flex justify-end gap-3">
          <button 
            type="button" 
            onClick={() => setViewMode('list')} 
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50"
          >
            Batal
          </button>
          <button 
            type="submit" 
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-70 flex items-center gap-2"
          >
            <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Soal'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default QuestionBank;