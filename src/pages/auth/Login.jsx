import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // <--- JANGAN LUPA IMPORT 'Link'
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
    // ... (Logika login SAMA PERSIS seperti sebelumnya, tidak perlu diubah) ...
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      let userData = null;
      let docRef = doc(db, 'users', user.uid);
      let docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        userData = docSnap.data();
      } else {
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) userData = querySnapshot.docs[0].data();
      }

      if (userData) {
        const role = userData.role;
        if (role === 'super_admin') navigate('/admin');
        else if (role === 'teacher') navigate('/teacher');
        else if (role === 'student') navigate('/student');
        else {
          setError('Role akun tidak valid.');
          await auth.signOut();
        }
      } else {
        setError('Data pengguna tidak ditemukan.');
        await auth.signOut();
      }
    } catch (err) {
      setError('Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Bagian Kiri (Hero) - SAMA */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-900 relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600 to-blue-900 opacity-90"></div>
        <div className="relative z-10 text-center px-10">
          <div className="mb-6 flex justify-center">
             <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20 shadow-2xl">
                <School size={64} className="text-white" />
             </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Sistem Ujian Sekolah</h2>
          <p className="text-indigo-200 text-lg max-w-md mx-auto leading-relaxed">
            Platform manajemen ujian terpadu dengan keamanan tinggi dan analisis nilai real-time.
          </p>
        </div>
      </div>

      {/* Bagian Kanan (Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Selamat Datang</h1>
            <p className="text-gray-500 text-sm mt-2">Silakan masuk untuk melanjutkan</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3 rounded-r">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="nama@sekolah.sch.id"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={18} />} 
              Masuk Sekarang
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-3">Anda Guru dan belum punya akun?</p>
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 hover:underline transition-all"
            >
              <UserPlus size={18} /> Daftar Akun Guru Baru
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-gray-400 font-medium">
             &copy; {new Date().getFullYear()} Sistem Ujian Sekolah.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;