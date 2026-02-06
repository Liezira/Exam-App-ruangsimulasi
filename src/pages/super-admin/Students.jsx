import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, Search, Pencil, Trash2, Filter, X, Save, Loader2, User, Mail 
} from 'lucide-react';
import BulkImportStudents from '../../components/admin/BulkImportStudents';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  // Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    nis: '', displayName: '', email: '', classId: '' 
  });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Data (Classes & Students)
  useEffect(() => {
    // Load Classes untuk Dropdown & Filter
    const unsubClasses = onSnapshot(query(collection(db, 'classes'), orderBy('name')), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Students (role == 'student')
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubClasses(); unsubStudents(); };
  }, []);

  // 2. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.classId) return alert("Pilih Kelas terlebih dahulu!");
    
    setIsSaving(true);
    try {
      const payload = {
        role: 'student',
        nis: formData.nis,
        displayName: formData.displayName,
        email: formData.email,
        classId: formData.classId,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await setDoc(doc(db, 'users', editingId), payload, { merge: true });
      } else {
        // Gunakan NIS sebagai ID Dokumen agar unik dan mudah dicari
        // Atau gunakan email yang disanitasi
        const docId = formData.email.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'users', docId), {
          ...payload,
          credits: 0, // Inisialisasi saldo ujian jika perlu
          createdAt: serverTimestamp()
        });
        alert("Data Siswa tersimpan! (Ingat buat akun Auth manual di Console)");
      }
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data siswa.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus data siswa ini?')) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  // Logic Filter
  const filteredStudents = students.filter(s => {
    const matchSearch = (s.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (s.nis || '').includes(searchTerm);
    const matchClass = filterClass === 'all' || s.classId === filterClass;
    return matchSearch && matchClass;
  });

  const getClassName = (id) => {
    const c = classes.find(x => x.id === id);
    return c ? c.name : <span className="text-red-500 italic">Tanpa Kelas</span>;
  };

  // Helpers Modal
  const openModal = (student = null) => {
    if (student) {
      setEditingId(student.id);
      setFormData({ 
        nis: student.nis || '', 
        displayName: student.displayName, 
        email: student.email, 
        classId: student.classId || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ nis: '', displayName: '', email: '', classId: '' });
    }
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Data Siswa</h2>
          <p className="text-gray-500 text-sm">Kelola data siswa dan pembagian kelas.</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition">
          <Plus size={18} /> Tambah Siswa
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center gap-3 bg-gray-50 px-3 rounded-lg border border-gray-200">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" placeholder="Cari Nama atau NIS..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent py-2.5 outline-none text-sm"
          />
        </div>
        <div className="w-full md:w-64 flex items-center gap-2 bg-gray-50 px-3 rounded-lg border border-gray-200">
          <Filter size={18} className="text-gray-500" />
          <select 
            value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
            className="flex-1 bg-transparent py-2.5 outline-none text-sm cursor-pointer"
          >
            <option value="all">Semua Kelas</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Area Import (Hanya muncul jika Kelas dipilih di filter) */}
        {filterClass !== 'all' && (
          <BulkImportStudents 
              classId={filterClass} 
              onSuccess={() => alert("Refresh data untuk melihat hasil.")} 
          />
        )}

      {/* Table Data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">NIS / Email</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {item.displayName ? item.displayName.charAt(0) : 'S'}
                          </div>
                          <span className="font-bold text-gray-800">{item.displayName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-gray-600">{item.nis || '-'}</span>
                          <span className="text-gray-400 text-xs">{item.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                          {getClassName(item.classId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => openModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-400">
                      Tidak ada data siswa yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">{editingId ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label-text">NIS (Nomor Induk)</label>
                <input type="text" required value={formData.nis} onChange={(e)=>setFormData({...formData, nis: e.target.value})} className="input-field" placeholder="123456" />
              </div>
              <div>
                <label className="label-text">Nama Lengkap</label>
                <input type="text" required value={formData.displayName} onChange={(e)=>setFormData({...formData, displayName: e.target.value})} className="input-field" placeholder="Nama Siswa" />
              </div>
              <div>
                <label className="label-text">Email</label>
                <input type="email" required value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} className="input-field" placeholder="siswa@sekolah.sch.id" disabled={!!editingId} />
              </div>
              <div>
                <label className="label-text">Kelas</label>
                <select required value={formData.classId} onChange={(e)=>setFormData({...formData, classId: e.target.value})} className="input-field">
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <button type="submit" disabled={isSaving} className="w-full mt-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex justify-center items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Simpan Data
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`.label-text { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 0.25rem; } .input-field { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; outline: none; transition: all; } .input-field:focus { ring: 2px; ring-color: #6366f1; border-color: transparent; }`}</style>
    </div>
  );
};

export default Students;