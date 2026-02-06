import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { LogIn, Lock, Mail, Eye, EyeOff, Bug } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // STATE KHUSUS DEBUG
  const [debugLog, setDebugLog] = useState([]);

  const addLog = (msg) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} > ${msg}`]);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDebugLog([]); // Reset log
    addLog("1. Memulai proses login...");

    try {
      // 1. AUTH
      addLog(`2. Mencoba Auth ke Firebase dengan email: ${email}`);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      addLog(`3. AUTH SUKSES! UID: ${user.uid}`);

      // 2. FIRESTORE LOOKUP
      let userData = null;
      let source = "";

      // Cek by UID
      addLog("4. Mencari data di Firestore pakai UID...");
      let docRef = doc(db, 'users', user.uid);
      let docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        userData = docSnap.data();
        source = "UID";
        addLog("5. KETEMU via UID!");
      } else {
        addLog("5. Gagal via UID. Mencoba cari via Email...");
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data();
          source = "Email Query";
          addLog(`6. KETEMU via Email! ID Dokumen: ${querySnapshot.docs[0].id}`);
        } else {
          addLog("6. GAGAL TOTAL. Data tidak ada di Firestore.");
        }
      }

      // 3. RESULT ANALYSIS
      if (userData) {
        addLog("7. Menganalisis Data User...");
        addLog(`   - Role: "${userData.role}"`);
        addLog(`   - Email DB: "${userData.email}"`);
        
        // Cek Role (Case Sensitive!)
        if (userData.role === 'super_admin') {
            addLog("8. Redirecting to ADMIN...");
            setTimeout(() => navigate('/admin'), 2000);
        } else if (userData.role === 'teacher') {
            addLog("8. Redirecting to TEACHER...");
            setTimeout(() => navigate('/teacher'), 2000);
        } else if (userData.role === 'student') {
            addLog("8. Redirecting to STUDENT...");
            setTimeout(() => navigate('/student'), 2000);
        } else {
            addLog(`8. ERROR: Role "${userData.role}" tidak dikenali di routing App.jsx!`);
        }
      } else {
        addLog("7. ERROR: User login auth sukses, tapi data profil di database KOSONG.");
      }

    } catch (err) {
      console.error(err);
      addLog(`ERROR FATAL: ${err.message}`);
      if (err.message.includes('offline')) {
        addLog("SARAN: Cek Tab Rules di Firestore Console, pastikan 'allow read, write: if true'");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-xl border border-gray-200 m-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Login Debug Mode 🛠️</h1>
        
        {/* LAYAR DIAGNOSA */}
        {debugLog.length > 0 && (
            <div className="mb-6 bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto border-4 border-gray-800 shadow-inner">
                {debugLog.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-gray-800 pb-1">{log}</div>
                ))}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded"
            placeholder="Email..."
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded"
              placeholder="Password..."
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-500">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded font-bold hover:bg-red-700 flex items-center justify-center gap-2"
          >
            {loading ? 'Menganalisa...' : <><Bug size={18}/> Cek Diagnosa</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;