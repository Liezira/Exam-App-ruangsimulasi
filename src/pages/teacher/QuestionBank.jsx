import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, getDoc, getDocs 
} from 'firebase/firestore';
import { 
  Plus, Pencil, Trash2, Save, X, ArrowLeft, Image as ImageIcon, AlertTriangle, ChevronDown, FileSpreadsheet 
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import BulkImportQuestions from '../../components/teacher/BulkImportQuestions';
import PageTransition from '../../components/PageTransition';

const QuestionBank = () => {
  const [viewMode, setViewMode] = useState('list');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-Subject State
  const [teacherSubjects, setTeacherSubjects] = useState([]); 
  const [activeSubjectId, setActiveSubjectId] = useState(''); 

  // Import State
  const [showImport, setShowImport] = useState(false);

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
        let tData = null;
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) tData = docSnap.data();
        else {
          const qUser = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(qUser);
          if (!querySnapshot.empty) tData = querySnapshot.docs[0].data();
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
            setActiveSubjectId(mySubjects[0].id); 
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

  // 2. Load Soal
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

  // Handlers
  const handleImageUpload = (e) => {
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
        subjectId: activeSubjectId,
        teacherId: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      };
      if (editingId) await updateDoc(doc(db, 'bank_soal', editingId), payload);
      else await addDoc(collection(db, 'bank_soal'), { ...payload, createdAt: serverTimestamp() });
      
      setViewMode('list');
      setFormData({ type: 'pilihan_ganda', question: '', image: '', options: ['', '', '', '', ''], correctAnswer: 'A' });
      setEditingId(null);
    } catch (error) { alert("Gagal menyimpan."); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id) => { if (confirm("Hapus soal?")) await deleteDoc(doc(db, 'bank_soal', id)); };
  
  const handleEdit = (item) => {
     setEditingId(item.id);
     setFormData({ type: item.type||'pilihan_ganda', question: item.question, image: item.image||'', options: item.options||['','','','',''], correctAnswer: item.correctAnswer||'A' });
     setViewMode('edit');
  };

  // --- RENDER: LIST VIEW ---
  if (viewMode === 'list') {
    return (
      <PageTransition>
      <div className="space-y-6">
        {/* === HEADER (HANYA MUNCUL SEKALI) === */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Bank Soal</h2>
            <p className="text-gray-500 text-sm">Kelola soal per mata pelajaran.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
             {teacherSubjects.length > 0 && (
                 <div className="relative">
                    <select 
                        value={activeSubjectId} 
                        onChange={(e) => setActiveSubjectId(e.target.value)}
                        className="appearance-none bg-white border border-indigo-200 text-indigo-700 py-2.5 pl-4 pr-10 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm min-w-[150px]"
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
                onClick={() => setShowImport(!showImport)}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition shadow-sm border ${showImport ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'}`}
             >
                <FileSpreadsheet size={18} /> Import Excel
             </button>

             <button 
                disabled={!activeSubjectId}
                onClick={() => setViewMode('create')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition shadow-lg"
             >
                <Plus size={18} /> Buat Manual
             </button>
          </div>
        </div>

        {/* IMPORT COMPONENT */}
        {showImport && activeSubjectId && (
            <BulkImportQuestions 
                subjectId={activeSubjectId} 
                onClose={() => setShowImport(false)}
                onSuccess={() => setShowImport(false)}
            />
        )}

        {/* EMPTY STATE WARNING (Jika Akun Guru Error) */}
        {teacherSubjects.length === 0 && !loading && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 border border-red-200">
            <AlertTriangle /> Akun Anda belum terhubung dengan Mata Pelajaran apapun.
          </div>
        )}

        {/* === LIST QUESTIONS (LOOPING ADA DI SINI) === */}
        <div className="grid gap-4">
            {questions.map((q, idx) => (
                <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                           {activeSubjectId && teacherSubjects.find(s=>s.id===activeSubjectId)?.name} • No. {questions.length - idx} • {q.type === 'isian' ? 'ISIAN' : 'PG'}
                        </span>
                        <div className="flex gap-2">
                           <button onClick={() => handleEdit(q)} className="text-blue-600 bg-blue-50 p-1.5 rounded"><Pencil size={16}/></button>
                           <button onClick={() => handleDelete(q.id)} className="text-red-600 bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <div className="mb-4 text-gray-800 text-sm"><Latex>{q.question}</Latex></div>
                    {q.image && <img src={q.image} alt="Soal" className="h-24 object-contain rounded border mb-3 bg-gray-50" />}
                    
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
                    {q.type === 'isian' && (
                        <div className="bg-green-50 text-green-800 p-2 rounded text-xs font-bold border border-green-200 inline-block">
                           Kunci: {q.correctAnswer}
                        </div>
                    )}
                </div>
            ))}
            
             {/* EMPTY STATE (Hanya muncul jika Soal Kosong) */}
             {questions.length === 0 && !loading && activeSubjectId && !showImport && (
                <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    Belum ada soal. Klik Import Excel atau Buat Manual.
                </div>
            )}
        </div>
      </div>
      </PageTransition>
    );
  }

  // --- RENDER VIEW: CREATE / EDIT ---
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <button onClick={() => setViewMode('list')} className="p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={20}/></button>
                <div>
                    <h2 className="font-bold text-lg text-gray-800 leading-tight">
                        {viewMode === 'create' ? `Buat Soal Baru` : 'Edit Soal'}
                    </h2>
                    <p className="text-xs text-gray-500">{teacherSubjects.find(s=>s.id===activeSubjectId)?.name}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setViewMode('list')} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg">Batal</button>
                <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center gap-2">
                   {isSaving ? 'Menyimpan...' : <><Save size={16}/> Simpan Soal</>}
                </button>
            </div>
        </div>
        
        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Pencil size={18}/> Editor Soal</h3>
                    
                    <div className="flex gap-4 mb-6">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition ${formData.type === 'pilihan_ganda' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-gray-200'}`}>
                            <input type="radio" name="type" value="pilihan_ganda" checked={formData.type === 'pilihan_ganda'} onChange={() => setFormData({...formData, type: 'pilihan_ganda'})} className="hidden"/>
                            <span>Pilihan Ganda</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition ${formData.type === 'isian' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-gray-200'}`}>
                            <input type="radio" name="type" value="isian" checked={formData.type === 'isian'} onChange={() => setFormData({...formData, type: 'isian'})} className="hidden"/>
                            <span>Isian Singkat</span>
                        </label>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Pertanyaan (Support LaTeX)</label>
                        <textarea required rows={5} value={formData.question} onChange={(e) => setFormData({...formData, question: e.target.value})} className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-sans" placeholder="Tulis soal di sini... Gunakan $...$ untuk rumus matematika."/>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Gambar Pendukung (Opsional)</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-gray-50 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition">
                                <ImageIcon size={18} /> Upload Gambar
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                            {formData.image && (
                                <button type="button" onClick={() => setFormData({...formData, image: ''})} className="text-red-500 text-xs font-bold hover:underline">Hapus Gambar</button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4">Pengaturan Jawaban</h3>
                    
                    {formData.type === 'pilihan_ganda' ? (
                        <div className="space-y-4">
                            {formData.options.map((opt, i) => (
                                <div key={i} className="flex gap-3 items-center">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, correctAnswer: ['A','B','C','D','E'][i]})}
                                        className={`w-10 h-10 flex-shrink-0 rounded-lg font-bold border-2 transition flex items-center justify-center ${['A','B','C','D','E'][i] === formData.correctAnswer ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                                        title="Klik untuk set sebagai Kunci Jawaban"
                                    >
                                        {['A','B','C','D','E'][i]}
                                    </button>
                                    <input 
                                        value={opt} 
                                        onChange={(e)=>{const n=[...formData.options];n[i]=e.target.value;setFormData({...formData, options:n})}} 
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm" 
                                        placeholder={`Isi Opsi ${['A','B','C','D','E'][i]}`}
                                    />
                                </div>
                            ))}
                            <p className="text-xs text-gray-400 mt-2">*Klik huruf A/B/C/D/E untuk menentukan kunci jawaban benar.</p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Kunci Jawaban Benar</label>
                            <input 
                                value={formData.correctAnswer} 
                                onChange={e=>setFormData({...formData, correctAnswer:e.target.value})} 
                                className="w-full p-3 border-2 border-green-200 rounded-lg focus:border-green-500 outline-none font-bold text-gray-800" 
                                placeholder="Contoh: Proklamasi"
                            />
                            <p className="text-xs text-gray-400 mt-2">*Siswa harus menjawab persis sama (Case Insensitive).</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:sticky lg:top-24 h-fit">
                <div className="bg-gray-800 rounded-2xl p-4 shadow-2xl border-4 border-gray-700">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Smartphone size={16}/> <span className="text-xs font-bold uppercase tracking-wider">Preview Siswa</span>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                    </div>

                    <div className="bg-gray-100 rounded-xl overflow-hidden min-h-[500px] flex flex-col relative">
                        <div className="bg-white p-3 border-b flex justify-between items-center shadow-sm z-10">
                             <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                             <div className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">Sisa: 59:00</div>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                                <div className="mb-3 flex justify-between">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Soal No. 1</span>
                                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">10 Poin</span>
                                </div>

                                <div className="text-gray-800 text-base leading-relaxed font-medium mb-4">
                                   {formData.question ? <Latex>{formData.question}</Latex> : <span className="text-gray-300 italic">Pertanyaan akan muncul di sini...</span>}
                                </div>

                                {formData.image && (
                                    <div className="mb-4 rounded-lg overflow-hidden border border-gray-100">
                                        <img src={formData.image} className="w-full object-contain max-h-48 bg-gray-50"/>
                                    </div>
                                )}

                                {formData.type === 'pilihan_ganda' ? (
                                    <div className="space-y-3">
                                        {formData.options.map((opt, i) => (
                                            <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 ${['A','B','C','D','E'][i] === formData.correctAnswer ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${['A','B','C','D','E'][i] === formData.correctAnswer ? 'border-green-500' : 'border-gray-300'}`}>
                                                    {['A','B','C','D','E'][i] === formData.correctAnswer && <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>}
                                                </div>
                                                <div className="text-sm text-gray-700 w-full">
                                                    {opt ? <Latex>{opt}</Latex> : <span className="text-gray-300 italic">Opsi {['A','B','C','D','E'][i]}...</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div>
                                        <textarea 
                                            disabled 
                                            className="w-full p-3 bg-gray-50 border rounded-lg text-sm text-gray-500 cursor-not-allowed resize-none" 
                                            rows={3} 
                                            placeholder="Siswa akan mengetik jawaban di sini..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-3 border-t flex justify-between items-center">
                            <div className="w-8 h-8 rounded bg-gray-200"></div>
                            <div className="w-24 h-8 rounded bg-indigo-600"></div>
                        </div>
                    </div>
                </div>
                <p className="text-center text-gray-400 text-xs mt-3">Visualisasi ini mensimulasikan tampilan di perangkat siswa.</p>
            </div>
        </div>
    </div>
  );
};

export default QuestionBank;