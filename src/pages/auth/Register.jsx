import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { UserPlus, Mail, Lock, User, Loader2, Phone, Hash, BookOpen, Plus, X } from 'lucide-react';

const Register = () => {
  // State Form Utama
  const [formData, setFormData] = useState({ 
    displayName: '', 
    email: '', 
    password: '', 
    nip: '', 
    phone: '', 
    schoolName: '', // Tetap butuh ini untuk konteks sekolah guru
    subjectIds: [] // Array untuk menampung banyak mapel
  });

  // State Pendukung
  const [subjects, setSubjects] = useState([]); // Data mapel dari DB
  const [selectedSubject, setSelectedSubject] = useState(''); // Pilihan dropdown sementara
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  
  const navigate = useNavigate();

  // 1. Load Daftar Mapel saat halaman dibuka
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const q = query(collection(db, 'subjects'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubjects(data);
      } catch (error) {
        console.error("Gagal memuat mapel:", error);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Helper: Tambah Mapel ke List (Sama seperti Admin)
  const handleAddSubject = () => {
    if (!selectedSubject) return;
    if (!formData.subjectIds.includes(selectedSubject)) {
      setFormData({ ...formData, subjectIds: [...formData.subjectIds, selectedSubject] });
    }
    setSelectedSubject('');
  };

  // Helper: Hapus Mapel dari List
  const handleRemoveSubject = (idToRemove) => {
    setFormData({
      ...formData,
      subjectIds: formData.subjectIds.filter(id => id !== idToRemove)
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.subjectIds.length === 0) return alert("Mohon pilih minimal satu mata pelajaran!");

    setLoading(true);
    try {
      // 1. Buat User di Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Nama di Auth Profile
      await updateProfile(user, { displayName: formData.displayName });

      // 3. Simpan Data Lengkap ke Firestore (Sesuai Struktur Admin)
      await setDoc(doc(db, 'users', user.uid), {
        role: 'teacher', // Otomatis jadi Guru
        displayName: formData.displayName,
        email: formData.email,
        nip: formData.nip,
        phone: formData.phone,
        schoolName: formData.schoolName,
        subjectIds: formData.subjectIds, // Simpan Array Mapel
        photoURL: '',
        credits: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert("Registrasi Berhasil! Silakan Login.");
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
          <p className="text-gray-500 text-sm">Lengkapi data diri Anda untuk memulai.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* NAMA LENGKAP */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" required placeholder="Nama Lengkap & Gelar" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.displayName}
              onChange={e => setFormData({...formData, displayName: e.target.value})}
            />
          </div>

          {/* EMAIL */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="email" required placeholder="Email Aktif" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {/* NIP & HP (Grid 2 Kolom) */}
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

          {/* SEKOLAH (Penting untuk konteks Guru Mandiri) */}
          <div className="relative">
             <div className="absolute left-3 top-3 text-gray-400 font-bold text-xs">🏫</div>
             <input 
                type="text" required placeholder="Nama Sekolah / Instansi" 
                className="w-full pl-9 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.schoolName}
                onChange={e => setFormData({...formData, schoolName: e.target.value})}
             />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="password" required placeholder="Password (Min. 6 Karakter)" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {/* MULTI SUBJECT SELECTOR (PERSIS SEPERTI ADMIN) */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
  <label className="block text-xs font-bold text-indigo-800 uppercase mb-2 flex items-center gap-1">
    <BookOpen size={14}/> Mata Pelajaran Diampu
  </label>
  
  <div className="flex gap-2 mb-3">
      <select 
        value={selectedSubject} 
        onChange={e=>setSelectedSubject(e.target.value)} 
        disabled={loadingSubjects}
        className="flex-1 p-2.5 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
      >
          <option value="">{loadingSubjects ? "Memuat Mapel..." : "-- Pilih Mapel --"}</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {/* PERHATIKAN: type="button" SANGAT PENTING DISINI */}
                  <button 
                    type="button" 
                    onClick={handleAddSubject} 
                    className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center shadow-sm"
                    title="Tambahkan Mapel"
                  >
                    <Plus size={20}/>
                  </button>
              </div>

              {/* Area Menampilkan Tags Mapel yang Sudah Dipilih */}
              <div className="flex flex-wrap gap-2 min-h-[30px]">
                  {formData.subjectIds.map(id => {
                      // Cari nama mapel berdasarkan ID
                      const subName = subjects.find(s=>s.id===id)?.name || "Loading...";
                      return (
                          <span key={id} className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm animate-in zoom-in">
                              {subName} 
                              <button 
                                type="button" 
                                onClick={()=>handleRemoveSubject(id)} 
                                className="hover:text-red-500 transition rounded-full p-0.5 hover:bg-red-50"
                              >
                                <X size={14}/>
                              </button>
                          </span>
                      )
                  })}
                  {formData.subjectIds.length === 0 && <span className="text-gray-400 text-xs italic p-1">Belum ada mapel dipilih.</span>}
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