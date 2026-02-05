import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, FileQuestion, 
  LogOut, Menu, X, GraduationCap, Settings, UserCircle,
  School, ClipboardList
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const DashboardLayout = ({ role }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  // Menu Configuration berdasarkan Role
  const getMenus = () => {
    const common = [];
    
    if (role === 'super_admin') {
      return [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'Data Guru', path: '/admin/teachers', icon: <UserCircle size={20} /> },
        { label: 'Data Siswa', path: '/admin/students', icon: <Users size={20} /> },
        { label: 'Manajemen Kelas', path: '/admin/classes', icon: <School size={20} /> },
        { label: 'Mata Pelajaran', path: '/admin/subjects', icon: <BookOpen size={20} /> },
        { label: 'Pengaturan', path: '/admin/settings', icon: <Settings size={20} /> },
      ];
    } else if (role === 'teacher') {
      return [
        { label: 'Dashboard', path: '/teacher', icon: <LayoutDashboard size={20} /> },
        { label: 'Bank Soal', path: '/teacher/questions', icon: <FileQuestion size={20} /> },
        { label: 'Ujian & Tugas', path: '/teacher/exams', icon: <ClipboardList size={20} /> },
        { label: 'Hasil Nilai', path: '/teacher/grades', icon: <GraduationCap size={20} /> },
      ];
    } else if (role === 'student') {
      return [
        { label: 'Beranda', path: '/student', icon: <LayoutDashboard size={20} /> },
        { label: 'Jadwal Ujian', path: '/student/schedules', icon: <ClipboardList size={20} /> },
        { label: 'Riwayat', path: '/student/history', icon: <BookOpen size={20} /> },
      ];
    }
    return common;
  };

  const menus = getMenus();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-300 ease-in-out 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
            {/* Logo Area */}
            <div className="flex items-center gap-2 font-black text-xl text-indigo-600 tracking-tight">
                <School size={28} />
                <span>SCHOOL<span className="text-gray-800 font-normal">EXAM</span></span>
            </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu Utama</p>
          
          {menus.map((menu, index) => {
            const isActive = location.pathname === menu.path;
            return (
              <Link
                key={index}
                to={menu.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'}`}>
                  {menu.icon}
                </span>
                <span className="font-medium text-sm">{menu.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-gray-100">
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
             >
                <LogOut size={20} />
                <span className="font-medium text-sm">Keluar</span>
             </button>
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden text-gray-600"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Breadcrumb / Title */}
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-gray-800 capitalize">
                {role ? role.replace('_', ' ') : 'Portal'} Panel
            </h1>
          </div>

          {/* User Profile Snippet */}
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                 <p className="text-sm font-bold text-gray-800">User Active</p>
                 <p className="text-xs text-gray-500 capitalize">{role?.replace('_', ' ')}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                <UserCircle size={24}/>
             </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50">
           <div className="max-w-7xl mx-auto">
              <Outlet /> {/* Halaman akan dirender di sini */}
           </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;