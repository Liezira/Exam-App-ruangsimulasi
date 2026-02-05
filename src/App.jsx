import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Loader2 } from 'lucide-react';

// --- IMPORTS HALAMAN ASLI ---

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth
import Login from './pages/auth/Login';

// Super Admin Pages
import Subjects from './pages/super-admin/Subjects';
import Teachers from './pages/super-admin/Teachers';
import Classes from './pages/super-admin/Classes';
import Students from './pages/super-admin/Students';

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard';
import QuestionBank from './pages/teacher/QuestionBank';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import ExamSession from './pages/student/ExamSession';

// --- PLACEHOLDERS (Hanya untuk halaman yang belum ada filenya) ---

const SuperAdminDashboard = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Super Admin</h1>
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <p className="text-gray-600">Selamat datang di Panel Administrator. Silakan gunakan menu di sebelah kiri untuk mengelola Master Data (Guru, Siswa, Kelas, Mapel).</p>
    </div>
  </div>
);

const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
    <h1 className="text-6xl font-black text-gray-300 mb-4">403</h1>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
    <p className="text-gray-500">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
  </div>
);

// --- APP COMPONENT UTAMA ---

const App = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUser(currentUser);
            setRole(docSnap.data().role);
          } else {
            setRole('guest');
          }
        } catch (error) {
          console.error("Error fetching role:", error);
          setRole('guest');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-gray-500 font-medium animate-pulse">Memuat Sistem...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        {/* Root Redirect Logic */}
        <Route path="/" element={
            role === 'super_admin' ? <Navigate to="/admin" /> :
            role === 'teacher' ? <Navigate to="/teacher" /> :
            role === 'student' ? <Navigate to="/student" /> :
            <Navigate to="/login" />
        } />

        {/* SUPER ADMIN ROUTES */}
        <Route path="/admin" element={<ProtectedRoute user={user} role={role} allowed={['super_admin']}><DashboardLayout role="super_admin" /></ProtectedRoute>}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="classes" element={<Classes />} />
            <Route path="students" element={<Students />} />
            <Route path="settings" element={<div className="p-6">Pengaturan (Coming Soon)</div>} />
        </Route>

        {/* TEACHER ROUTES */}
        <Route path="/teacher" element={<ProtectedRoute user={user} role={role} allowed={['teacher']}><DashboardLayout role="teacher" /></ProtectedRoute>}>
            <Route index element={<TeacherDashboard />} />
            <Route path="questions" element={<QuestionBank />} />
            <Route path="exams" element={<div className="p-6">Manajemen Ujian (Coming Soon)</div>} />
            <Route path="grades" element={<div className="p-6">Hasil Nilai (Coming Soon)</div>} />
        </Route>

        {/* STUDENT ROUTES */}
        <Route path="/student" element={<ProtectedRoute user={user} role={role} allowed={['student']}><DashboardLayout role="student" /></ProtectedRoute>}>
             <Route index element={<StudentDashboard />} />
        </Route>

        {/* STUDENT EXAM SESSION (Fullscreen Mode - No Layout) */}
        <Route path="/student/exam" element={
            <ProtectedRoute user={user} role={role} allowed={['student']}>
                <ExamSession />
            </ProtectedRoute>
        } />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

// Helper Component untuk Proteksi Route
const ProtectedRoute = ({ user, role, allowed, children }) => {
  if (!user) return <Navigate to="/login" />;
  if (!role || !allowed.includes(role)) return <Navigate to="/unauthorized" />;
  return children;
};

export default App;