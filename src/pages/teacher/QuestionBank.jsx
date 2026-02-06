import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit, Save, X, UploadCloud, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, 
  ChevronDown, ChevronUp, Image as ImageIcon, BookOpen, Filter 
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { 
  collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

// Library Matematika (LaTeX)
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const TeacherQuestionBank = () => {
  // --- STATE DATA ---
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- STATE FORM MANUAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'pilihan_ganda', // pilihan_ganda, isian
    question: '',
    options: ['', '', '', '', ''],
    correctAnswer: 'A', // Default A untuk PG
    image: ''
  });

  // --- STATE IMPORT EXCEL ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewImport, setPreviewImport] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // 1. Load Mapel Guru (Saat pertama buka)
  useEffect(() => {
    const fetchSubjects = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Ambil data profil guru untuk melihat subjectIds
        const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          const subjectIds = userData.subjectIds || [];
          
          if (subjectIds.length > 0) {
            // Ambil detail nama mapel dari collection subjects
            // Note: Firestore 'in' query max 10, jika lebih harus di-chunk. 
            // Untuk simpel kita ambil semua subjects lalu filter di client (efisiensi v1)
            const allSubjectsSnap = await getDocs(collection(db, 'subjects'));
            const mySubjects = allSubjectsSnap.docs
              .filter(doc => subjectIds.includes(doc.id))
              .map(doc => ({ id: doc.id, ...doc.data() }));
            
            setSubjects(mySubjects);
            if (mySubjects.length > 0) setSelectedSubject(mySubjects[0].id);
          }
        }
      } catch (error) {
        console.error("Gagal load mapel:", error);
      }
    };
    fetchSubjects();
  }, []);

  // 2. Load Soal (Saat Subject Berubah)
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedSubject) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'questions'), 
          where('subjectId', '==', selectedSubject),
          where('teacherId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Gagal load soal:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [selectedSubject]);

  // --- LOGIC MANUAL INPUT ---
  const handleOpenModal = (question = null) => {
    if (question) {
      setEditingId(question.id);
      setFormData({
        type: question.type,
        question: question.question,
        options: question.options || ['', '', '', '', ''],
        correctAnswer: question.correctAnswer,
        image: question.image || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        type: 'pilihan_ganda',
        question: '',
        options: ['', '', '', '', ''],
        correctAnswer: 'A',
        image: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return alert("Ukuran gambar maks 1MB");
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManual = async () => {
    if (!formData.question) return alert("Pertanyaan wajib diisi!");
    if (formData.type === 'pilihan_ganda' && formData.options.some(opt => !opt)) return alert("Semua opsi A-E wajib diisi!");

    setLoading(true);
    try {
      const payload = {
        ...formData,
        teacherId: auth.currentUser.uid,
        subjectId: selectedSubject,
        createdAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'questions', editingId), payload);
        alert("Soal berhasil diupdate!");
      } else {
        await addDoc(collection(db, 'questions'), payload);
        alert("Soal berhasil dibuat!");
      }
      
      setIsModalOpen(false);
      // Refresh Manual (Simple way)
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan soal.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin hapus soal ini?")) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      setQuestions(questions.filter(q => q.id !== id));
    } catch (error) {
      alert("Gagal hapus.");
    }
  };

  // --- LOGIC IMPORT EXCEL (Adaptasi Kode Referensi) ---
  const handleDownloadTemplate = () => {
    const data = [
      {
        "Tipe (PG/ISIAN)": "PG",
        "Pertanyaan": "Ibu kota Indonesia adalah...",
        "Opsi A": "Jakarta", "Opsi B": "Bandung", "Opsi C": "Surabaya", "Opsi D": "Medan", "Opsi E": "Bali",
        "Kunci Jawaban": "A"
      },
      {
        "Tipe (PG/ISIAN)": "ISIAN",
        "Pertanyaan": "Hasil dari 5 x 5 adalah...",
        "Opsi A": "-", "Opsi B": "-", "Opsi C": "-", "Opsi D": "-", "Opsi E": "-",
        "Kunci Jawaban": "25"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "TEMPLATE_SOAL_GURU.xlsx");
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const parsed = data.map((row, idx) => {
        const type = row["Tipe (PG/ISIAN)"]?.toString().toUpperCase().includes("ISIAN") ? 'isian' : 'pilihan_ganda';
        return {
            id: idx,
            type,
            question: row["Pertanyaan"] || "",
            options: type === 'pilihan_ganda' ? [
                row["Opsi A"] || "", row["Opsi B"] || "", row["Opsi C"] || "", row["Opsi D"] || "", row["Opsi E"] || ""
            ] : [],
            correctAnswer: row["Kunci Jawaban"]?.toString() || "",
            image: "",
            valid: !!row["Pertanyaan"] && !!row["Kunci Jawaban"]
        };
      });
      
      setPreviewImport(parsed);
      setIsImportModalOpen(true);
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const executeBulkImport = async () => {
    const validData = previewImport.filter(p => p.valid);
    if (validData.length === 0) return alert("Tidak ada data valid.");

    setIsImporting(true);
    try {
        const promises = validData.map(item => {
            return addDoc(collection(db, 'questions'), {
                teacherId: auth.currentUser.uid,
                subjectId: selectedSubject,
                type: item.type,
                question: item.question,
                options: item.options,
                correctAnswer: item.correctAnswer,
                image: "",
                createdAt: serverTimestamp()
            });
        });

        await Promise.all(promises);
        alert(`Sukses import ${validData.length} soal!`);
        setIsImportModalOpen(false);
        setPreviewImport([]);
        window.location.reload();
    } catch (error) {
        console.error(error);
        alert("Gagal import data.");
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER & FILTER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bank Soal</h1>
          <p className="text-gray-500 text-sm">Kelola soal untuk ujian siswa.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative">
                <BookOpen className="absolute left-3 top-3 text-gray-400" size={16}/>
                <select 
                    value={selectedSubject} 
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg bg-gray-50 font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {subjects.length === 0 && <option value="">Loading Mapel...</option>}
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-wrap gap-3">
        <button 
            onClick={() => handleOpenModal()} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm"
        >
            <Plus size={18}/> Tambah Manual
        </button>
        
        <div className="relative">
            <input type="file" accept=".xlsx" onChange={handleFileImport} className="absolute inset-0 opacity-0 cursor-pointer"/>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-sm">
                <FileSpreadsheet size={18}/> Import Excel
            </button>
        </div>

        <button 
            onClick={handleDownloadTemplate} 
            className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-50 transition"
        >
            <UploadCloud size={18}/> Download Template
        </button>
      </div>

      {/* QUESTION LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
            <div className="p-10 text-center flex flex-col items-center text-gray-400">
                <Loader2 className="animate-spin mb-2" size={30}/>
                <p>Memuat Soal...</p>
            </div>
        ) : questions.length === 0 ? (
            <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                <Search size={40} className="mb-2 opacity-20"/>
                <p>Belum ada soal untuk mapel ini.</p>
            </div>
        ) : (
            <div className="divide-y divide-gray-100">
                {questions.map((q, idx) => (
                    <div key={q.id} className="p-6 hover:bg-gray-50 transition group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2 items-center">
                                <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded text-xs">#{idx + 1}</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${q.type === 'isian' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {q.type.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => handleOpenModal(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                            </div>
                        </div>

                        {/* Question Content */}
                        <div className="mb-4 text-gray-800">
                            <Latex>{q.question}</Latex>
                        </div>
                        
                        {q.image && (
                            <img src={q.image} alt="Soal" className="max-h-40 rounded border mb-4"/>
                        )}

                        {/* Options / Key */}
                        {q.type === 'pilihan_ganda' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {q.options.map((opt, i) => {
                                    const label = ['A','B','C','D','E'][i];
                                    const isCorrect = q.correctAnswer === label;
                                    return (
                                        <div key={i} className={`p-2 rounded border flex gap-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                            <span className={`font-bold w-6 text-center ${isCorrect ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
                                            <span className={isCorrect ? 'font-bold text-green-700' : 'text-gray-600'}>{opt}</span>
                                            {isCorrect && <CheckCircle2 size={16} className="text-green-500 ml-auto"/>}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="bg-orange-50 p-3 rounded border border-orange-100 text-sm text-orange-800 font-bold">
                                Kunci Jawaban: {q.correctAnswer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- MODAL MANUAL INPUT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold">{editingId ? 'Edit Soal' : 'Buat Soal Baru'}</h2>
                    <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400 hover:text-red-500"/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Tipe Soal */}
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={formData.type === 'pilihan_ganda'} onChange={() => setFormData({...formData, type: 'pilihan_ganda'})} />
                            <span className="font-bold text-sm">Pilihan Ganda</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={formData.type === 'isian'} onChange={() => setFormData({...formData, type: 'isian'})} />
                            <span className="font-bold text-sm">Isian Singkat</span>
                        </label>
                    </div>

                    {/* Editor Soal */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Pertanyaan (Support LaTeX $...$)</label>
                        <textarea 
                            rows={3}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.question}
                            onChange={e => setFormData({...formData, question: e.target.value})}
                            placeholder="Contoh: Berapakah hasil dari $2 + 2$ ?"
                        />
                        <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                            Preview: <Latex>{formData.question || '...'}</Latex>
                        </div>
                    </div>

                    {/* Gambar */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Gambar (Opsional)</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        {formData.image && <img src={formData.image} className="mt-2 max-h-40 rounded border"/>}
                    </div>

                    {/* Opsi / Jawaban */}
                    {formData.type === 'pilihan_ganda' ? (
                        <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                            {formData.options.map((opt, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <span className="font-bold text-gray-500 w-6">{['A','B','C','D','E'][i]}</span>
                                    <input 
                                        type="text" 
                                        className="flex-1 p-2 border rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...formData.options];
                                            newOpts[i] = e.target.value;
                                            setFormData({...formData, options: newOpts});
                                        }}
                                        placeholder={`Pilihan ${['A','B','C','D','E'][i]}`}
                                    />
                                    <input 
                                        type="radio" 
                                        name="correct"
                                        checked={formData.correctAnswer === ['A','B','C','D','E'][i]}
                                        onChange={() => setFormData({...formData, correctAnswer: ['A','B','C','D','E'][i]})}
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                    />
                                </div>
                            ))}
                            <p className="text-xs text-right text-gray-500">*Klik radio button untuk set kunci jawaban</p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Kunci Jawaban Benar</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border-2 border-green-500 rounded-lg font-bold"
                                value={formData.correctAnswer}
                                onChange={e => setFormData({...formData, correctAnswer: e.target.value})}
                                placeholder="Jawaban..."
                            />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 border rounded-lg font-bold text-gray-500">Batal</button>
                    <button onClick={handleSaveManual} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                        {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Simpan Soal
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL IMPORT PREVIEW --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-green-600 text-white rounded-t-2xl">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FileSpreadsheet/> Preview Import</h2>
                    <button onClick={() => setIsImportModalOpen(false)}><X/></button>
                </div>
                
                <div className="p-4 bg-gray-50 border-b flex justify-between text-sm">
                    <span>Total Baris: <b>{previewImport.length}</b></span>
                    <span>Valid: <b className="text-green-600">{previewImport.filter(p=>p.valid).length}</b></span>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2 border">#</th>
                                <th className="p-2 border">Tipe</th>
                                <th className="p-2 border">Pertanyaan</th>
                                <th className="p-2 border">Opsi</th>
                                <th className="p-2 border">Kunci</th>
                                <th className="p-2 border text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewImport.map((row, i) => (
                                <tr key={i} className={row.valid ? 'bg-white' : 'bg-red-50'}>
                                    <td className="p-2 border text-center">{i+1}</td>
                                    <td className="p-2 border uppercase">{row.type}</td>
                                    <td className="p-2 border truncate max-w-xs">{row.question}</td>
                                    <td className="p-2 border text-gray-500 truncate max-w-xs">{row.options.join(', ')}</td>
                                    <td className="p-2 border font-bold text-center">{row.correctAnswer}</td>
                                    <td className="p-2 border text-center">
                                        {row.valid ? <CheckCircle2 size={16} className="text-green-500 mx-auto"/> : <AlertCircle size={16} className="text-red-500 mx-auto"/>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t flex justify-end gap-3">
                    <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2 border rounded-lg">Batal</button>
                    <button onClick={executeBulkImport} disabled={isImporting} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">
                        {isImporting ? <Loader2 className="animate-spin"/> : <UploadCloud size={18}/>} Import Sekarang
                    </button>
                </div>
             </div>
        </div>
      )}

    </div>
  );
};

export default TeacherQuestionBank;