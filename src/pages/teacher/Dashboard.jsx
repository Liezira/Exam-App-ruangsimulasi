import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { BookOpen, FileQuestion, GraduationCap, Loader2, AlertTriangle } from 'lucide-react';

const TeacherDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [subjectName, setSubjectName] = useState('...');
  const [stats, setStats] = useState({ questions: 0, exams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Ambil Data Profil Guru
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);

          // 2. Ambil Nama Mapel
          if (data.subjectId) {
            const subRef = doc(db, 'subjects', data.subjectId);
            const subSnap = await getDoc(subRef);
            if (subSnap.exists()) setSubjectName(subSnap.data().name);

            // 3. Hitung Statistik (Jumlah Soal)
            const qSoal = query(collection(db, 'bank_soal'), where('subjectId', '==', data.subjectId));
            const snapSoal = await getCountFromServer(qSoal);
            setStats(prev => ({ ...prev, questions: snapSoal.data().count }));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Halo, {profile?.displayName} 👋</h1>
          <p className="text-indigo-100 text-lg">
            Selamat datang di Panel Guru. Anda terdaftar sebagai pengajar mapel:
          </p>
          <div className="mt-4 inline-block bg-white/20 backdrop-blur-md border border-white/30 px-4 py-2 rounded-lg font-bold text-xl">
            {profile?.subjectId ? <span className="flex items-center gap-2"><BookOpen size={20}/> {subjectName}</span> : <span className="flex items-center gap-2 text-yellow-300"><AlertTriangle/> Belum ada Mapel</span>}
          </div>
        </div>
        {/* Dekorasi */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {!profile?.subjectId && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 text-yellow-700">
          <p className="font-bold">Peringatan Akun</p>
          <p className="text-sm">Akun Anda belum dikaitkan dengan Mata Pelajaran apapun oleh Admin. Anda tidak dapat membuat soal sampai Admin mengaturnya.</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <FileQuestion size={32} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase">Bank Soal</p>
            <p className="text-3xl font-bold text-gray-800">{stats.questions}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-xl">
            <GraduationCap size={32} />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase">Ujian Aktif</p>
            <p className="text-3xl font-bold text-gray-800">0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;