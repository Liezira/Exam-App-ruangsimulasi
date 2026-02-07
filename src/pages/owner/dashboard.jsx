import React, { useState } from 'react';
import { 
  LayoutDashboard, School, Users, CreditCard, Settings, LogOut, 
  Search, Plus, MoreVertical, TrendingUp, AlertCircle, ExternalLink 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const OwnerDashboard = () => {
  // --- MOCK DATA (Nanti diganti dengan data dari Supabase RPC) ---
  const stats = [
    { label: 'Total Sekolah', value: '12', change: '+2 bulan ini', icon: School, color: 'bg-blue-500' },
    { label: 'Total Siswa', value: '2,450', change: '+120 minggu ini', icon: Users, color: 'bg-indigo-500' },
    { label: 'Ujian Selesai', value: '15.2k', change: '+8% dari bulan lalu', icon: LayoutDashboard, color: 'bg-green-500' },
    { label: 'Pending Payment', value: '3', change: 'Perlu tindak lanjut', icon: CreditCard, color: 'bg-orange-500' },
  ];

  const schools = [
    { id: 1, name: 'SMAN 1 Pamulang', plan: 'Enterprise', status: 'Active', students: 850, exams: 120, lastActive: '2 min ago' },
    { id: 2, name: 'SMA Global Jaya', plan: 'Basic', status: 'Active', students: 320, exams: 45, lastActive: '1 hour ago' },
    { id: 3, name: 'SMK Telkom Jakarta', plan: 'Pro', status: 'Warning', students: 500, exams: 80, lastActive: '3 days ago' },
    { id: 4, name: 'SMP 4 Tangsel', plan: 'Basic', status: 'Inactive', students: 0, exams: 0, lastActive: 'Never' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
      
      {/* 1. SIDEBAR (Navigasi Kiri) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-wider text-indigo-400">RUANG SIMULASI</h1>
          <p className="text-xs text-slate-400 mt-1">Super Admin Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={School} label="Manajemen Sekolah" />
          <NavItem icon={Users} label="Global Users" />
          <NavItem icon={CreditCard} label="Langganan & Billing" />
          <NavItem icon={Settings} label="System Settings" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 text-slate-400 hover:text-white transition w-full px-4 py-2">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
            <p className="text-gray-500 text-sm">Selamat datang kembali, Owner.</p>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari sekolah..." 
                className="pl-10 pr-4 py-2.5 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
              />
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition">
              <Plus size={18} /> Tambah Sekolah
            </button>
          </div>
        </header>

        {/* 3. STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 text-opacity-100`}>
                  <stat.icon className={`text-${stat.color.replace('bg-', '')}`} size={24} />
                </div>
                {idx === 3 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">Action Needed</span>}
              </div>
              <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-gray-800">{stat.value}</span>
                <span className={`text-xs font-bold mb-1 ${stat.change.includes('+') ? 'text-green-600' : 'text-orange-500'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 4. SCHOOL LEADERBOARD TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">Daftar Sekolah Aktif</h3>
            <button className="text-indigo-600 font-bold text-sm hover:bg-indigo-50 px-3 py-1 rounded transition">Lihat Semua</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                <tr>
                  <th className="p-5">Nama Sekolah</th>
                  <th className="p-5">Paket</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-center">Total Siswa</th>
                  <th className="p-5 text-center">Total Ujian</th>
                  <th className="p-5">Aktivitas Terakhir</th>
                  <th className="p-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50 transition">
                    <td className="p-5 font-bold text-gray-800">{school.name}</td>
                    <td className="p-5">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold text-xs border border-indigo-100">
                        {school.plan}
                      </span>
                    </td>
                    <td className="p-5">
                      <StatusBadge status={school.status} />
                    </td>
                    <td className="p-5 text-center font-mono">{school.students}</td>
                    <td className="p-5 text-center font-mono">{school.exams}</td>
                    <td className="p-5 text-gray-500">{school.lastActive}</td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1"
                          title="Masuk sebagai Admin Sekolah ini"
                          onClick={() => alert(`Login God Mode ke ${school.name}...`)}
                        >
                          <ExternalLink size={14}/> Akses
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
                          <MoreVertical size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

// Komponen Kecil Helper
const NavItem = ({ icon: Icon, label, active }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    Active: 'bg-green-100 text-green-700 border-green-200',
    Warning: 'bg-orange-100 text-orange-700 border-orange-200',
    Inactive: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit border ${styles[status]}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'Active' ? 'bg-green-500' : status === 'Warning' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
      {status}
    </span>
  );
};

export default OwnerDashboard;