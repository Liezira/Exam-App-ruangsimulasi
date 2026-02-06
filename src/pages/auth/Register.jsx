import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { UserPlus, Mail, Lock, User, Loader2, Phone, Hash, BookOpen, Plus, X, ArrowLeft, Save, LayoutGrid } from 'lucide-react';

const Register = () => {
  // State Form Utama
  const [formData, setFormData] = useState({ 
    displayName: '', email: '', password: '', nip: '', phone: '', schoolName: '' 
  });

  // --- STATE MAPEL ---
  const [mySubjects, setMySubjects] = useState([]); 
  const [subjectsOptions, setSubjectsOptions] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isManualSubject, setIsManualSubject] = useState(false);

  // --- STATE KELAS (BARU) ---
  const [myClasses, setMyClasses] = useState([]);
  const [classesOptions, setClassesOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [isManualClass, setIsManualClass] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const navigate = useNavigate();

  // 1. Load Data Mapel & Kelas dari DB
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Subjects
        const qSub = query(collection(db, 'subjects'), orderBy('name', 'asc'));
        const snapSub = await getDocs(qSub);
        setSubjectsOptions(snapSub.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Classes
        const qClass = query(collection(db, 'classes'), orderBy('name', 'asc'));
        const snapClass = await getDocs(qClass);
        setClassesOptions(snapClass.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Gagal memuat data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // --- LOGIC MAPEL ---
  const handleAddSubject = () => {
    if (isManualSubject) {
      if (!newSubjectName.trim()) return;
      if (mySubjects.some(s => s.name.toLowerCase() === newSubjectName.toLowerCase())) return alert("Mapel ini sudah dipilih.");
      setMySubjects([...mySubjects, { id: null, name: newSubjectName, isNew: true }]);
      setNewSubjectName('');
      setIsManualSubject(false);
    } else {
      if (!selectedSubjectId) return;
      const sub = subjectsOptions.find(s => s.id === selectedSubjectId);
      if (sub && !mySubjects.some(s => s.id === sub.id)) {
        setMySubjects([...mySubjects, { id: sub.id, name: sub.name, isNew: false }]);
      }
      setSelectedSubjectId('');
    }
  };

  const handleRemoveSubject = (idx) => setMySubjects(mySubjects.filter((_, i) => i !== idx));

  // --- LOGIC KELAS (BARU) ---
  const handleAddClass = () => {
    if (isManualClass) {
      if (!newClassName.trim()) return;
      if (myClasses.some(c => c.name.toLowerCase() === newClassName.toLowerCase())) return alert("Kelas ini sudah dipilih.");
      setMyClasses([...myClasses, { id: null, name: newClassName, isNew: true }]);
      setNewClassName('');
      setIsManualClass(false);
    } else {
      if (!selectedClassId) return;
      const cls = classesOptions.find(c => c.id === selectedClassId);
      if (cls && !myClasses.some(c => c.id === cls.id)) {
        setMyClasses([...myClasses, { id: cls.id, name: cls.name, isNew: false }]);
      }
      setSelectedClassId('');
    }
  };

  const handleRemoveClass = (idx) => setMyClasses(myClasses.filter((_, i) => i !== idx));

  // --- REGISTER SUBMIT ---
  const handleRegister = async (e) => {
    e.preventDefault();
    if (mySubjects.length === 0) return alert("Pilih minimal satu Mapel!");
    if (myClasses.length === 0) return alert("Pilih minimal satu Kelas!");

    setLoading(true);
    try {
      // 1. Create Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: formData.displayName });

      // 2. Process Subjects (Create New if needed)
      let finalSubjectIds = [];
      for (const item of mySubjects) {
        if (item.isNew) {
          const newRef = await addDoc(collection(db, 'subjects'), { name: item.name, createdAt: serverTimestamp() });
          finalSubjectIds.push(newRef.id);
        } else {
          finalSubjectIds.push(item.id);
        }
      }

      // 3. Process Classes (Create New if needed)
      let finalClassIds = [];
      for (const item of myClasses) {
        if (item.isNew) {
          const newRef = await addDoc(collection(db, 'classes'), { name: item.name, createdAt: serverTimestamp() });
          finalClassIds.push(newRef.id);
        } else {
          finalClassIds.push(item.id);
        }
      }

      // 4. Save User Profile
      await setDoc(doc(db, 'users', user.uid), {
        role: 'teacher',
        displayName: formData.displayName,
        email: formData.email,
        nip: formData.nip,
        phone: formData.phone,
        schoolName: formData.schoolName,
        subjectIds: finalSubjectIds,
        classIds: finalClassIds, // Simpan array kelas
        photoURL: '',
        credits: 0,
        createdAt: serverTimestamp()
      });

      alert("Registrasi Sukses! Mapel & Kelas telah tersimpan.");
      navigate('/login');

    } catch (error) {
      console.error(error);
      alert("Gagal daftar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-900">Registrasi Guru</h1>
          <p className="text-gray-500 text-sm">Lengkapi profil pengajar Anda.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Identitas Diri */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="text" required placeholder="Nama Lengkap & Gelar" className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="email" required placeholder="Email Aktif" className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative"><Hash className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="text" required placeholder="NIP / ID" className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} /></div>
            <div className="relative"><Phone className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="text" required placeholder="WhatsApp" className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
          </div>
          <div className="relative">
             <div className="absolute left-3 top-3 text-gray-400 font-bold text-xs">🏫</div>
             <input type="text" required placeholder="Nama Sekolah / Instansi" className="w-full pl-9 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.schoolName} onChange={e => setFormData({...formData, schoolName: e.target.value})} />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="password" required placeholder="Password (Min. 6 Karakter)" className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          {/* --- BAGIAN 1: MAPEL --- */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1"><BookOpen size={14}/> Mata Pelajaran</label>
              <button type="button" onClick={() => setIsManualSubject(!isManualSubject)} className="text-[10px] text-indigo-600 underline hover:text-indigo-800">
                {isManualSubject ? 'Kembali' : '+ Buat Baru'}
              </button>
            </div>
            <div className="flex gap-2 mb-2">
                {isManualSubject ? (
                  <input type="text" placeholder="Mapel Baru..." value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none" autoFocus />
                ) : (
                  <select value={selectedSubjectId} onChange={e=>setSelectedSubjectId(e.target.value)} disabled={loadingData} className="flex-1 p-2 border rounded text-sm bg-white outline-none">
                      <option value="">-- Pilih Mapel --</option>
                      {subjectsOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <button type="button" onClick={handleAddSubject} className={`px-3 rounded text-white flex items-center ${isManualSubject?'bg-green-600':'bg-indigo-600'}`}>
                  {isManualSubject ? <Save size={16}/> : <Plus size={18}/>}
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {mySubjects.map((s, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${s.isNew?'bg-green-100 text-green-700 border-green-200':'bg-white text-indigo-700 border-indigo-200'}`}>
                        {s.name} <button type="button" onClick={()=>handleRemoveSubject(i)}><X size={12}/></button>
                    </span>
                ))}
            </div>
          </div>

          {/* --- BAGIAN 2: KELAS (NEW) --- */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1"><LayoutGrid size={14}/> Kelas Diampu</label>
              <button type="button" onClick={() => setIsManualClass(!isManualClass)} className="text-[10px] text-orange-600 underline hover:text-orange-800">
                {isManualClass ? 'Kembali' : '+ Buat Baru'}
              </button>
            </div>
            <div className="flex gap-2 mb-2">
                {isManualClass ? (
                  <input type="text" placeholder="Kelas Baru (Contoh: X IPA 1)..." value={newClassName} onChange={e => setNewClassName(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none" autoFocus />
                ) : (
                  <select value={selectedClassId} onChange={e=>setSelectedClassId(e.target.value)} disabled={loadingData} className="flex-1 p-2 border rounded text-sm bg-white outline-none">
                      <option value="">-- Pilih Kelas --</option>
                      {classesOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <button type="button" onClick={handleAddClass} className={`px-3 rounded text-white flex items-center ${isManualClass?'bg-green-600':'bg-orange-600'}`}>
                  {isManualClass ? <Save size={16}/> : <Plus size={18}/>}
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {myClasses.map((c, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${c.isNew?'bg-green-100 text-green-700 border-green-200':'bg-white text-orange-700 border-orange-200'}`}>
                        {c.name} <button type="button" onClick={()=>handleRemoveClass(i)}><X size={12}/></button>
                    </span>
                ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex justify-center gap-2 shadow-lg transition transform active:scale-95">
            {loading ? <Loader2 className="animate-spin"/> : <UserPlus size={20}/>} Selesaikan Pendaftaran
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Sudah punya akun? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Login di sini</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;