import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit, Save, X, UploadCloud, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, 
  Eye, BookOpen, Filter, LayoutGrid, Calendar 
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

// Library Matematika (LaTeX)
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const TeacherQuestionBank = () => {
  // --- STATE DATA UTAMA ---
  const [subjects, setSubjects] = useState([]); // Data Mapel Guru
  const [classes, setClasses] = useState([]);   // Data Kelas Guru
  const [questions, setQuestions] = useState([]);
  
  // --- STATE FILTER & LOAD ---
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState(''); 
  const [selectedExamType, setSelectedExamType] = useState('Latihan'); 
  const [isLoadingData, setIsLoadingData] = useState(false); 
  const [isMetaLoaded, setIsMetaLoaded] = useState(false); 

  // --- STATE FORM MANUAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'pilihan_ganda', 
    examType: 'Latihan', 
    question: '',
    options: ['', '', '', '', ''],
    correctAnswer: 'A',
    image: ''
  });

  // --- STATE IMPORT EXCEL ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewImport, setPreviewImport] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // --- STATE PREVIEW SISWA ---
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // 1. Load Data Profil Guru (Mapel & Kelas) - HANYA SEKALI
  useEffect(() => {
    const fetchTeacherData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const qUser = query(collection(db, 'users'), where('email', '==', user.email));
        const userSnap = await getDocs(qUser);
        
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
          const subjectIds = userData.subjectIds || [];
          const classIds = userData.classIds || [];

          if (subjectIds.length > 0) {
            const allSubs = await getDocs(collection(db, 'subjects'));
            const mySubs = allSubs.docs
              .filter(d => subjectIds.includes(d.id))
              .map(d => ({ id: d.id, ...d.data() }));
            setSubjects(mySubs);
            if (mySubs.length > 0) setSelectedSubject(mySubs[0].id);
          }

          if (classIds.length > 0) {
            const allCls = await getDocs(collection(db, 'classes'));
            const myCls = allCls.docs
              .filter(d => classIds.includes(d.id))
              .map(d => ({ id: d.id, ...d.data() }));
            setClasses(myCls);
            if (myCls.length > 0) setSelectedClass(myCls[0].id);
          }
        }
      } catch (error) {
        console.error("Gagal load data guru:", error);
      } finally {
        setIsMetaLoaded(true);
      }
    };
    fetchTeacherData();
  }, []);

  // 2. FUNGSI LOAD SOAL (OPTIMASI READS: 1 Dokumen Array)
  const handleLoadQuestions = async () => {
    if (!selectedSubject) return alert("Pilih Mata Pelajaran dulu!");
    
    setIsLoadingData(true);
    setQuestions([]); 

    try {
      // Logic ID: USER_ID + MAPEL_ID + TIPE_UJIAN
      // Ini membuat kita hanya perlu membaca 1 Dokumen saja.
      const docId = `${auth.currentUser.uid}_${selectedSubject}_${selectedExamType}`;
      const docRef = doc(db, 'teacher_bank_soal', docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Data tersimpan dalam array 'questions' di dalam dokumen
        const data = docSnap.data().questions || [];
        // Sort descending by created (optional, krn array biasanya berurutan insert)
        setQuestions(data.sort((a,b) => b.createdAt - a.createdAt));
      } else {
        setQuestions([]); // Belum ada dokumen, berarti kosong
      }

    } catch (error) {
      console.error("Gagal load soal:", error);
      alert("Gagal memuat soal. Pastikan koneksi aman.");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- LOGIC MANUAL INPUT ---
  const handleOpenModal = (question = null) => {
    if (question) {
      setEditingId(question.id);
      setFormData({
        type: question.type,
        examType: question.examType || selectedExamType, // PENTING: Ikuti examType soal atau filter aktif
        question: question.question,
        options: question.options || ['', '', '', '', ''],
        correctAnswer: question.correctAnswer,
        image: question.image || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        type: 'pilihan_ganda',
        examType: selectedExamType, // Default ikut filter yang sedang dibuka
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

    setIsLoadingData(true); 
    try {
      // 1. Tentukan Dokumen Target
      const targetExamType = formData.examType; 
      const docId = `${auth.currentUser.uid}_${selectedSubject}_${targetExamType}`;
      const docRef = doc(db, 'teacher_bank_soal', docId);

      // 2. Ambil Data Lama (Read dulu untuk update array)
      const docSnap = await getDoc(docRef);
      let currentQuestions = docSnap.exists() ? (docSnap.data().questions || []) : [];

      const newQuestionData = {
        id: editingId || Date.now().toString(), // ID unik untuk soal
        ...formData,
        teacherId: auth.currentUser.uid,
        subjectId: selectedSubject,
        createdAt: editingId ? (questions.find(q=>q.id===editingId)?.createdAt || Date.now()) : Date.now()
      };

      if (editingId) {
        // UPDATE: Cari index dan ganti
        // Cek apakah ExamType berubah? Jika berubah, kita harus hapus dari doc lama dan pindah ke doc baru.
        // Untuk simplifikasi: Kita asumsikan edit manual hanya terjadi di examType yang sama.
        // Jika user mengubah examType di modal, logika ini perlu handle deleteDocLama -> setDocBaru.
        // Disini kita update array lokal saja:
        const index = currentQuestions.findIndex(q => q.id === editingId);
        if (index !== -1) {
            currentQuestions[index] = newQuestionData;
        }
      } else {
        // CREATE: Push ke array
        currentQuestions.unshift(newQuestionData); // Taruh paling atas
      }

      // 3. Simpan Kembali (Write 1 Dokumen)
      await setDoc(docRef, { questions: currentQuestions }, { merge: true });

      alert("✅ Soal berhasil disimpan!");
      setIsModalOpen(false);
      
      // Jika tipe ujian yang diedit == tipe ujian yang sedang dilihat, refresh tampilan
      if (targetExamType === selectedExamType) {
          handleLoadQuestions();
      } else {
          // Jika user menyimpan soal UTS padahal sedang lihat Latihan
          alert(`Soal tersimpan di kategori ${targetExamType}. Silakan ganti filter untuk melihatnya.`);
          setIsLoadingData(false);
      }

    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan soal.");
      setIsLoadingData(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin hapus soal ini?")) return;
    setIsLoadingData(true);
    try {
      const docId = `${auth.currentUser.uid}_${selectedSubject}_${selectedExamType}`;
      const docRef = doc(db, 'teacher_bank_soal', docId);
      
      // Filter array client side lalu update
      const newQuestions = questions.filter(q => q.id !== id);
      
      await updateDoc(docRef, { questions: newQuestions });
      setQuestions(newQuestions);
      alert("Terhapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal hapus.");
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- LOGIC IMPORT EXCEL (Batch Grouping) ---
  const handleDownloadTemplate = () => {
    const data = [
      {
        "Tipe (PG/ISIAN)": "PG",
        "Klasifikasi (Latihan/UTS/UAS)": "Latihan",
        "Pertanyaan": "Ibu kota Indonesia adalah...",
        "Opsi A": "Jakarta", "Opsi B": "Bandung", "Opsi C": "Surabaya", "Opsi D": "Medan", "Opsi E": "Bali",
        "Kunci Jawaban": "A"
      },
      {
        "Tipe (PG/ISIAN)": "ISIAN",
        "Klasifikasi (Latihan/UTS/UAS)": "UTS",
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
            id: `import_${Date.now()}_${idx}`, // Generate ID unik sementara
            type,
            examType: row["Klasifikasi (Latihan/UTS/UAS)"] || 'Latihan',
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
        // 1. Grouping Data by Exam Type (Agar hemat writes & reads)
        const groupedData = {};
        validData.forEach(item => {
            if (!groupedData[item.examType]) groupedData[item.examType] = [];
            groupedData[item.examType].push({
                id: item.id,
                type: item.type,
                examType: item.examType,
                question: item.question,
                options: item.options,
                correctAnswer: item.correctAnswer,
                image: "",
                teacherId: auth.currentUser.uid,
                subjectId: selectedSubject,
                createdAt: Date.now()
            });
        });

        // 2. Process per Group (Read -> Merge -> Write)
        const promises = Object.keys(groupedData).map(async (examType) => {
            const docId = `${auth.currentUser.uid}_${selectedSubject}_${examType}`;
            const docRef = doc(db, 'teacher_bank_soal', docId);
            
            const docSnap = await getDoc(docRef);
            let existingQuestions = docSnap.exists() ? (docSnap.data().questions || []) : [];
            
            // Gabungkan data lama + data baru import
            const mergedQuestions = [...existingQuestions, ...groupedData[examType]];
            
            return setDoc(docRef, { questions: mergedQuestions }, { merge: true });
        });

        await Promise.all(promises);
        
        alert(`Sukses import ${validData.length} soal!`);
        setIsImportModalOpen(false);
        setPreviewImport([]);
        handleLoadQuestions(); // Refresh tampilan
    } catch (error) {
        console.error(error);
        alert("Gagal import data.");
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. FILTER BAR & HEADER (Kontrol Utama untuk Optimasi Reads) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bank Soal</h1>
            <p className="text-gray-500 text-sm">Pilih Mapel & Tipe Ujian untuk memuat soal.</p>
          </div>
          
          {/* TOMBOL LOAD DATA (OPTIMASI READS) */}
          <button 
            onClick={handleLoadQuestions}
            disabled={isLoadingData || !selectedSubject}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:bg-gray-300 disabled:shadow-none"
          >
            {isLoadingData ? <Loader2 className="animate-spin"/> : <Search size={18}/>}
            Tampilkan Soal
          </button>
        </div>

        {/* AREA FILTER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Filter Mapel */}
            <div className="relative">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><BookOpen size={12}/> Mata Pelajaran</label>
                <select 
                    value={selectedSubject} 
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-gray-50 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {!isMetaLoaded && <option>Memuat Mapel...</option>}
                    {isMetaLoaded && subjects.length === 0 && <option value="">Tidak ada mapel</option>}
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* Filter Kelas (Opsional, tapi diminta user) */}
            <div className="relative">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><LayoutGrid size={12}/> Kelas Target</label>
                <select 
                    value={selectedClass} 
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-gray-50 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                     {!isMetaLoaded && <option>Memuat Kelas...</option>}
                     <option value="">Semua Kelas</option>
                     {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Filter Tipe Ujian (String Classification) */}
            <div className="relative">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Klasifikasi Soal</label>
                <select 
                    value={selectedExamType} 
                    onChange={e => setSelectedExamType(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-gray-50 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="Latihan">Latihan</option>
                    <option value="Ulangan">Ulangan Harian</option>
                    <option value="UTS">UTS (Tengah Semester)</option>
                    <option value="UAS">UAS (Akhir Semester)</option>
                    <option value="Tryout">Tryout</option>
                </select>
            </div>
        </div>
      </div>

      {/* 2. ACTION BAR (Tambah & Import) */}
      <div className="flex flex-wrap gap-3 items-center">
        <button 
            onClick={() => handleOpenModal()} 
            disabled={!selectedSubject}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm disabled:bg-gray-300"
        >
            <Plus size={18}/> Tambah Manual
        </button>
        
        <div className="relative">
            <input type="file" accept=".xlsx" onChange={handleFileImport} disabled={!selectedSubject} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"/>
            <button disabled={!selectedSubject} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-sm disabled:bg-gray-300">
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

      {/* 3. QUESTION LIST DISPLAY */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
        {questions.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center h-full text-gray-400">
                {isLoadingData ? (
                   <>
                     <Loader2 className="animate-spin mb-3 text-indigo-600" size={40}/>
                     <p className="font-bold text-gray-600">Sedang mengambil soal...</p>
                   </>
                ) : (
                   <>
                     <Search size={48} className="mb-3 opacity-20"/>
                     <p className="font-medium">Belum ada data ditampilkan.</p>
                     <p className="text-sm mt-1">Pilih Klasifikasi lalu Klik "Tampilkan Soal".</p>
                   </>
                )}
            </div>
        ) : (
            <div className="divide-y divide-gray-100">
                {questions.map((q, idx) => (
                    <div key={q.id} className="p-6 hover:bg-gray-50 transition group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2 items-center">
                                <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs">#{idx + 1}</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
                                    q.type === 'isian' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                    {q.type.replace('_', ' ')}
                                </span>
                                <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                                    {q.examType || selectedExamType}
                                </span>
                            </div>
                            
                            {/* ACTION BUTTONS */}
                            <div className="flex gap-2">
                                <button 
                                  onClick={() => setPreviewQuestion(q)} 
                                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                  title="Preview Tampilan Siswa"
                                >
                                    <Eye size={18}/>
                                </button>
                                <button onClick={() => handleOpenModal(q)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(q.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={18}/></button>
                            </div>
                        </div>

                        {/* Question Content */}
                        <div className="mb-4 text-gray-800 text-base">
                            <Latex>{q.question}</Latex>
                        </div>
                        
                        {q.image && (
                            <img src={q.image} alt="Soal" className="max-h-40 rounded border mb-4"/>
                        )}

                        {/* Kunci Jawaban (Teacher View Only) */}
                        <div className="text-sm text-green-700 font-bold flex items-center gap-2 bg-green-50 w-fit px-3 py-1 rounded border border-green-200">
                            <CheckCircle2 size={14}/> Kunci: {q.correctAnswer}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- MODAL 1: MANUAL INPUT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Soal' : 'Buat Soal Baru'}</h2>
                        <p className="text-xs text-gray-500">{subjects.find(s=>s.id===selectedSubject)?.name}</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400 hover:text-red-500"/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Tipe Soal & Klasifikasi */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-500 uppercase">Tipe Jawaban</label>
                             <div className="flex gap-2">
                                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded border ${formData.type === 'pilihan_ganda' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200'}`}>
                                    <input type="radio" className="hidden" checked={formData.type === 'pilihan_ganda'} onChange={() => setFormData({...formData, type: 'pilihan_ganda'})} />
                                    <span className="font-bold text-sm">Pilihan Ganda</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded border ${formData.type === 'isian' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200'}`}>
                                    <input type="radio" className="hidden" checked={formData.type === 'isian'} onChange={() => setFormData({...formData, type: 'isian'})} />
                                    <span className="font-bold text-sm">Isian</span>
                                </label>
                             </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Klasifikasi</label>
                            <select 
                                value={formData.examType} 
                                onChange={e => setFormData({...formData, examType: e.target.value})}
                                className="w-full p-2.5 border rounded-lg font-bold text-gray-700 outline-none"
                            >
                                <option value="Latihan">Latihan</option>
                                <option value="Ulangan">Ulangan</option>
                                <option value="UTS">UTS</option>
                                <option value="UAS">UAS</option>
                                <option value="Tryout">Tryout</option>
                            </select>
                        </div>
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
                        <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                            <span className="text-xs font-bold uppercase text-gray-400 block mb-1">Preview Render:</span>
                            <Latex>{formData.question || '...'}</Latex>
                        </div>
                    </div>

                    {/* Gambar */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Gambar (Opsional)</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        {formData.image && (
                            <div className="relative w-fit mt-2">
                                <img src={formData.image} className="max-h-40 rounded border"/>
                                <button onClick={() => setFormData({...formData, image: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
                            </div>
                        )}
                    </div>

                    {/* Opsi / Jawaban */}
                    {formData.type === 'pilihan_ganda' ? (
                        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Opsi Jawaban & Kunci</p>
                            {formData.options.map((opt, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <div 
                                        className={`w-8 h-8 flex items-center justify-center rounded-full font-bold cursor-pointer transition ${formData.correctAnswer === ['A','B','C','D','E'][i] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                        onClick={() => setFormData({...formData, correctAnswer: ['A','B','C','D','E'][i]})}
                                    >
                                        {['A','B','C','D','E'][i]}
                                    </div>
                                    <input 
                                        type="text" 
                                        className="flex-1 p-2 border rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...formData.options];
                                            newOpts[i] = e.target.value;
                                            setFormData({...formData, options: newOpts});
                                        }}
                                        placeholder={`Jawaban ${['A','B','C','D','E'][i]}`}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Kunci Jawaban Benar</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border-2 border-green-500 rounded-lg font-bold"
                                value={formData.correctAnswer}
                                onChange={e => setFormData({...formData, correctAnswer: e.target.value})}
                                placeholder="Jawaban yang benar..."
                            />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 border rounded-lg font-bold text-gray-500">Batal</button>
                    <button onClick={handleSaveManual} disabled={isLoadingData} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                        {isLoadingData ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Simpan Soal
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL 2: PREVIEW SISWA (NEW) --- */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><Eye size={18}/> Preview Tampilan Siswa</h3>
                    <button onClick={() => setPreviewQuestion(null)} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
                </div>
                
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    {/* Simulasi Card Soal */}
                    <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="mb-4 text-lg text-gray-800 leading-relaxed font-medium">
                            <Latex>{previewQuestion.question}</Latex>
                        </div>
                        
                        {previewQuestion.image && (
                            <img src={previewQuestion.image} className="max-h-60 rounded-lg border mb-6 mx-auto block"/>
                        )}

                        <div className="space-y-3">
                            {previewQuestion.type === 'pilihan_ganda' ? (
                                previewQuestion.options.map((opt, i) => {
                                    const label = ['A','B','C','D','E'][i];
                                    return (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition">
                                            <div className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-600 font-bold group-hover:bg-indigo-200 text-sm">
                                                {label}
                                            </div>
                                            <div className="text-gray-700 text-sm font-medium">
                                                <Latex>{opt}</Latex>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <input disabled type="text" placeholder="Ketik jawaban kamu..." className="w-full bg-transparent outline-none text-gray-500 cursor-not-allowed"/>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-4 text-center text-xs text-gray-400">
                        *Ini adalah simulasi tampilan yang akan dilihat oleh siswa saat ujian.
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* --- MODAL 3: IMPORT EXCEL --- */}
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
                                <th className="p-2 border">Klasifikasi</th>
                                <th className="p-2 border">Tipe</th>
                                <th className="p-2 border">Pertanyaan</th>
                                <th className="p-2 border">Kunci</th>
                                <th className="p-2 border text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewImport.map((row, i) => (
                                <tr key={i} className={row.valid ? 'bg-white' : 'bg-red-50'}>
                                    <td className="p-2 border text-center">{i+1}</td>
                                    <td className="p-2 border font-bold text-indigo-600">{row.examType}</td>
                                    <td className="p-2 border uppercase">{row.type}</td>
                                    <td className="p-2 border truncate max-w-xs">{row.question}</td>
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