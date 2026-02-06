import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { LogIn, Lock, Mail, Eye, EyeOff, AlertCircle, School, Loader2, UserPlus } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log("1. Mencoba Login Auth...");
      // 1. Login ke Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("2. Auth Berhasil. UID:", user.uid);

      // 2. Cek Data & Role di Firestore
      let userData = null;
      
      // A. Cek by UID
      console.log("3. Mencari data di Firestore by UID...");
      let docRef = doc(db, 'users', user.uid);
      let docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("4a. Data ketemu by UID");
        userData = docSnap.data();
      } else {
        console.log("4b. UID tidak ketemu. Mencari by Email...");
        // B. Fallback: Cari by Email
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log("5. Data ketemu by Email");
          userData = querySnapshot.docs[0].data();
        } else {
          console.log("6. Data TIDAK KETEMU sama sekali di Firestore.");
        }
      }

      // 3. Validasi & Redirect
      if (userData) {
        console.log("7. Data User:", userData);
        const role = userData.role;

        if (role === 'super_admin') navigate('/admin');
        else if (role === 'teacher') navigate('/teacher');
        else if (role === 'student') navigate('/student');
        else {
          alert(`ERROR: Akun ini tidak punya Role yang valid. Role saat ini: ${role}`);
          await auth.signOut();
        }
      } else {
        alert("CRITICAL ERROR: Login Auth Berhasil, tapi Data Profil di Database KOSONG. \n\nSolusi: Cek Firestore Database, pastikan ada dokumen di collection 'users' dengan email ini.");
        // await auth.signOut(); // Jangan signout dulu biar bisa debug
      }

    } catch (err) {
      console.error("Login Error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Email atau password salah.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan gagal. Tunggu sebentar.');
      } else {
        alert('ERROR SISTEM: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* BAGIAN KIRI */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-900 relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600 to-blue-900 opacity-90"></div>
        <div className="relative z-10 text-center px-10">
          <div className="mb-6 flex justify-center">
             <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20 shadow-2xl">
                <School size={64} className="text-white" />
             </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">DEBUG MODE LOGIN</h2>
          <p className="text-indigo-200 text-lg">Gunakan mode ini untuk mencari penyebab gagal login.</p>
        </div>
      </div>

      {/* BAGIAN KANAN */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Login Debugger</h1>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-xl" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-xl" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-gray-500 mt-1">Lihat Password</button>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">
              {loading ? "Menganalisa..." : "Cek Login"}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-3">Anda Guru dan belum punya akun?</p>
            <Link to="/register" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline">
              <UserPlus size={18} /> Daftar Akun Guru Baru
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;