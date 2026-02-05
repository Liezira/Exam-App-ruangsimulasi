import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; // Pastikan file firebase.js kamu tetap ada
import { Loader2 } from 'lucide-react';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import Subjects from './pages/super-admin/Subjects';
import Teachers from './pages/super-admin/Teachers';
import Classes from './pages/super-admin/Classes'; 
import Students from './pages/super-admin/Students';
import TeacherDashboard from './pages/teacher/Dashboard'; 
import QuestionBank from './pages/teacher/QuestionBank';

import StudentDashboard from './pages/student/StudentDashboard'; 
import ExamSession from './pages/student/ExamSession';

// Placeholder Pages (Akan kita isi bertahap)
const Login = () => <div className="p-10 text-center">Halaman Login (Next Step)</div>;
const SuperAdminDashboard = () => <div className="p-6">Dashboard Super Admin</div>;
const TeacherDashboard = () => <div className="p-6">Dashboard Guru</div>;
const StudentDashboard = () => <div className="p-6">Dashboard Siswa</div>;
const Unauthorized = () => <div className="p-10 text-center text-red-500">Akses Ditolak</div>;

const App = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ambil data user dari Firestore untuk cek role
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser(currentUser);
          setRole(docSnap.data().role); // 'super_admin', 'teacher', 'student'
        } else {
            // Handle jika user login tapi tidak ada data di firestore
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
        <Loader2 className="animate-spin text-indigo-600 mb-2" size={40} />
        <p className="text-gray-500 font-medium">Memuat Sistem...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* SUPER ADMIN ROUTES */}
        <Route path="/admin" element={<ProtectedRoute user={user} role={role} allowed={['super_admin']}><DashboardLayout role="super_admin" /></ProtectedRoute>}>
            <Route index element={<SuperAdminDashboard />} />
            
            {/* Tambahkan Route Baru di sini 👇 */}
            <Route path="subjects" element={<Subjects />} />
            <Route path="teachers" element={<Teachers />} />
            
            <Route path="classes" element={<Classes />} />
          <Route path="students" element={<Students />} />
          
          <Route path="settings" element={<div className="p-6">Pengaturan</div>} />
        </Route>

        <Route path="/teacher" element={<ProtectedRoute user={user} role={role} allowed={['teacher']}><DashboardLayout role="teacher" /></ProtectedRoute>}>
            <Route index element={<TeacherDashboard />} />
            <Route path="questions" element={<QuestionBank />} />
            
            <Route path="exams" element={<div className="p-6">Manajemen Ujian (Next)</div>} />
            <Route path="grades" element={<div className="p-6">Hasil Nilai (Next)</div>} />
        </Route>

        {/* STUDENT ROUTES */}
        <Route path="/student" element={<ProtectedRoute user={user} role={role} allowed={['student']}><DashboardLayout role="student" /></ProtectedRoute>}>
            <Route index element={<StudentDashboard />} />
        </Route>

        {/* ROUTE UJIAN KHUSUS (Tanpa Layout Dashboard agar Fullscreen lebih bersih) */}
        <Route path="/student/exam" element={
            <ProtectedRoute user={user} role={role} allowed={['student']}>
                <ExamSession />
            </ProtectedRoute>
        } />

        {/* Public Route */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        {/* Protected Routes Handling */}
        <Route path="/" element={
            role === 'super_admin' ? <Navigate to="/admin" /> :
            role === 'teacher' ? <Navigate to="/teacher" /> :
            role === 'student' ? <Navigate to="/student" /> :
            <Navigate to="/login" />
        } />

        {/* SUPER ADMIN ROUTES */}
        <Route path="/admin" element={<ProtectedRoute user={user} role={role} allowed={['super_admin']}><DashboardLayout role="super_admin" /></ProtectedRoute>}>
            <Route index element={<SuperAdminDashboard />} />
            {/* Nanti kita tambah route: management guru, siswa, dll disini */}
        </Route>

        {/* TEACHER ROUTES */}
        <Route path="/teacher" element={<ProtectedRoute user={user} role={role} allowed={['teacher']}><DashboardLayout role="teacher" /></ProtectedRoute>}>
            <Route index element={<TeacherDashboard />} />
             {/* Nanti kita tambah route: bank soal, ujian, dll disini */}
        </Route>

        {/* STUDENT ROUTES */}
        <Route path="/student" element={<ProtectedRoute user={user} role={role} allowed={['student']}><DashboardLayout role="student" /></ProtectedRoute>}>
             <Route index element={<StudentDashboard />} />
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
      </Routes>
    </Router>
  );
};

// Component Helper untuk Proteksi Route
const ProtectedRoute = ({ user, role, allowed, children }) => {
  if (!user) return <Navigate to="/login" />;
  if (!allowed.includes(role)) return <Navigate to="/unauthorized" />;
  return children;
};

export default App;