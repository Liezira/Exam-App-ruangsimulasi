import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { UserPlus, Mail, Lock, User, Loader2, Phone, Hash, BookOpen, Plus, X, ArrowLeft, Save } from 'lucide-react';

const Register = () => {
  // State Form Utama
  const [formData, setFormData] = useState({ 
    displayName: '', email: '', password: '', nip: '', phone: '', schoolName: '' 
  });

  // State Manajemen Mapel (PENTING)
  // Kita simpan objek { id, name, isNew } agar bisa membedakan mapel lama vs baru
  const [mySubjects, setMySubjects] = useState([]); 
  
  // State UI
  const [subjectsOptions, setSubjectsOptions] = useState([]); // Daftar mapel dari DB
  const [selectedSubjectId, setSelectedSubjectId] = useState(''); // Pilihan dropdown
  const [newSubjectName, setNewSubjectName] = useState(''); // Input manual mapel baru
  const [isManualMode, setIsManualMode] = useState(false); // Mode input manual?
  
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  
  const navigate = useNavigate();

  // 1. Load Daftar Mapel dari DB
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const q = query(collection(db, 'subjects'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubjectsOptions(data);
      } catch (error) {
        console.error("Gagal memuat mapel:", error);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Helper: Tambah Mapel ke List Saya
  const handleAddSubject = () => {
    if (isManualMode) {
      // MODE BUAT BARU
      if (!newSubjectName.trim()) return;
      // Cek duplikat di list sendiri
      if (mySubjects.some(s => s.name.toLowerCase() === newSubjectName.toLowerCase())) return alert("Mapel ini sudah Anda pilih.");
      
      setMySubjects([...mySubjects, { id: null, name: newSubjectName, isNew: true }]);
      setNewSubjectName('');
      setIsManualMode(false); // Kembali ke dropdown
    } else {
      // MODE PILIH YG ADA
      if (!selectedSubjectId) return;
      const sub = subjectsOptions.find(s => s.id === selectedSubjectId);
      if (sub && !mySubjects.some(s => s.id === sub.id)) {
        setMySubjects([...mySubjects, { id: sub.id, name: sub.name, isNew: false }]);
      }
      setSelectedSubjectId('');
    }
  };

  // Helper: Hapus Mapel dari List
  const handleRemoveSubject = (indexToRemove) => {
    setMySubjects(mySubjects.filter((_, idx) => idx !== indexToRemove));
  };

  // --- LOGIC REGISTRASI UTAMA ---
  const handleRegister = async (e) => {
    e.preventDefault();
    if (mySubjects.length === 0) return alert("Mohon pilih atau buat minimal satu mata pelajaran!");

    setLoading(true);
    try {
      // 1. Buat User di Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Nama di Auth Profile
      await updateProfile(user, { displayName: formData.displayName });

      // 3. PROSES MAPEL (Logic Cerdas)
      // Kita harus memisahkan mana ID yang sudah ada, dan mana Mapel Baru yang harus dibuat dulu.
      let finalSubjectIds = [];

      for (const item of mySubjects) {
        if (item.isNew) {
          // Jika Mapel Baru: Buat dulu di collection 'subjects', lalu ambil ID-nya
          const newSubRef = await addDoc(collection(db, 'subjects'), {
            name: item.name,
            createdAt: serverTimestamp() // Opsional: track kapan dibuat
          });
          finalSubjectIds.push(newSubRef.id);
        } else {
          // Jika Mapel Lama: Langsung pakai ID-nya
          finalSubjectIds.push(item.id);
        }
      }

      // 4. Simpan Profil Guru Lengkap ke Firestore
      await setDoc(doc(db, 'users', user.uid), {
        role: 'teacher',
        displayName: formData.displayName,
        email: formData.email,
        nip: formData.nip,
        phone: formData.phone,
        schoolName: formData.schoolName,
        subjectIds: finalSubjectIds, // Array ID Mapel (Campuran lama & baru)
        photoURL: '',
        credits: 0,
        createdAt: serverTimestamp()
      });

      alert("Registrasi Berhasil! Mapel baru Anda juga telah disimpan.");
      navigate('/login');

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Email sudah terdaftar!");
      } else {
        alert("Gagal daftar: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-900">Registrasi Guru</h1>
          <p className="text-gray-500 text-sm">Lengkapi data diri & mapel Anda.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Form Input Standar (Sama seperti sebelumnya) */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" required placeholder="Nama Lengkap & Gelar" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.displayName}
              onChange={e => setFormData({...formData, displayName: e.target.value})}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="email" required placeholder="Email Aktif" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Hash className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" required placeholder="NIP / ID Guru" 
                className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.nip}
                onChange={e => setFormData({...formData, nip: e.target.value})}
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" required placeholder="No. WhatsApp" 
                className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="relative">
             <div className="absolute left-3 top-3 text-gray-400 font-bold text-xs">🏫</div>
             <input 
                type="text" required placeholder="Nama Sekolah / Instansi" 
                className="w-full pl-9 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.schoolName}
                onChange={e => setFormData({...formData, schoolName: e.target.value})}
             />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="password" required placeholder="Password (Min. 6 Karakter)" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {/* --- BAGIAN PEMILIHAN MAPEL (LOGIC BARU) --- */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <label className="block text-xs font-bold text-indigo-800 uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1"><BookOpen size={14}/> Mata Pelajaran Diampu</span>
              
              {/* Tombol Switch Mode */}
              {!isManualMode ? (
                 <button type="button" onClick={() => setIsManualMode(true)} className="text-[10px] text-indigo-600 underline hover:text-indigo-800">
                   + Buat Baru
                 </button>
              ) : (
                 <button type="button" onClick={() => setIsManualMode(false)} className="text-[10px] text-gray-500 underline hover:text-gray-700 flex items-center gap-1">
                   <ArrowLeft size={10}/> Kembali ke List
                 </button>
              )}
            </label>
            
            <div className="flex gap-2 mb-3">
                {isManualMode ? (
                  // INPUT MANUAL
                  <input 
                    type="text" 
                    placeholder="Contoh: Muatan Lokal - Membatik"
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    className="flex-1 p-2.5 border border-indigo-300 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none animate-in fade-in"
                    autoFocus
                  />
                ) : (
                  // DROPDOWN SELECT
                  <select 
                    value={selectedSubjectId} 
                    onChange={e=>setSelectedSubjectId(e.target.value)} 
                    disabled={loadingSubjects}
                    className="flex-1 p-2.5 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                      <option value="">{loadingSubjects ? "Memuat..." : "-- Pilih Mapel --"}</option>
                      {subjectsOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}

                <button 
                  type="button" 
                  onClick={handleAddSubject} 
                  className={`px-3 rounded-lg text-white transition shadow-sm flex items-center justify-center ${isManualMode ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  title={isManualMode ? "Simpan Mapel Baru" : "Tambahkan Mapel"}
                >
                  {isManualMode ? <Save size={18}/> : <Plus size={20}/>}
                </button>
            </div>

            {/* List Mapel Terpilih */}
            <div className="flex flex-wrap gap-2 min-h-[30px]">
                {mySubjects.map((sub, idx) => (
                    <span key={idx} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm animate-in zoom-in ${sub.isNew ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-indigo-700 border border-indigo-200'}`}>
                        {sub.name} {sub.isNew && <span className="text-[9px] bg-green-200 px-1 rounded text-green-800">BARU</span>}
                        <button type="button" onClick={()=>handleRemoveSubject(idx)} className="hover:text-red-500 transition rounded-full p-0.5 hover:bg-white/50">
                          <X size={14}/>
                        </button>
                    </span>
                ))}
                {mySubjects.length === 0 && <span className="text-gray-400 text-xs italic p-1">Belum ada mapel dipilih.</span>}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 flex justify-center gap-2 shadow-lg shadow-indigo-200 transition transform active:scale-95">
            {loading ? <Loader2 className="animate-spin"/> : <UserPlus size={20}/>} Daftar Sekarang
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