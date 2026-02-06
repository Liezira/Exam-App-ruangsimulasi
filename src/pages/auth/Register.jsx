import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { UserPlus, Mail, Lock, User, Loader2, School } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', schoolName: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Update Profile Name
      await updateProfile(user, { displayName: formData.name });

      // 3. Save to Firestore (Role: Teacher)
      await setDoc(doc(db, 'users', user.uid), {
        displayName: formData.name,
        email: formData.email,
        schoolName: formData.schoolName, // Nama Sekolah Guru
        role: 'teacher',
        photoURL: '',
        createdAt: serverTimestamp(),
        credits: 0 // Jika nanti mau pakai sistem kuota ujian
      });

      alert("Registrasi Berhasil! Silakan Login.");
      navigate('/login');
    } catch (error) {
      console.error(error);
      alert("Gagal daftar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-900">Daftar Akun Guru</h1>
          <p className="text-gray-500 text-sm">Kelola ujian dan siswa Anda sendiri.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="text" required placeholder="Nama Lengkap & Gelar" 
              className="w-full pl-10 p-3 border rounded-lg outline-indigo-500"
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="relative">
            <School className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="text" required placeholder="Nama Sekolah / Instansi" 
              className="w-full pl-10 p-3 border rounded-lg outline-indigo-500"
              onChange={e => setFormData({...formData, schoolName: e.target.value})}
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="email" required placeholder="Email Aktif" 
              className="w-full pl-10 p-3 border rounded-lg outline-indigo-500"
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="password" required placeholder="Password (Min. 6 Karakter)" 
              className="w-full pl-10 p-3 border rounded-lg outline-indigo-500"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex justify-center gap-2">
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