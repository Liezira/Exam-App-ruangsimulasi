import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, Search, Pencil, Trash2, User, X, Save, Loader2, AlertCircle, Mail, Phone, BookOpen 
} from 'lucide-react';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form Data Guru
  const [formData, setFormData] = useState({ 
    email: '', displayName: '', phone: '', nip: '', subjectId: '' 
  });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Teachers (Users where role == 'teacher')
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'teacher')); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Subjects (Untuk Dropdown Pilihan)
  useEffect(() => {
    const q = query(collection(db, 'subjects'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(data);
    });
    return () => unsubscribe();
  }, []);

  // 3. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const payload = {
        role: 'teacher',
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        nip: formData.nip,
        subjectId: formData.subjectId, 
        updatedAt: serverTimestamp()
      };

      if (editingId) {
         await setDoc(doc(db, 'users', editingId), payload, { merge: true });
      } else {
         const fakeUid = formData.email.replace(/[^a-zA-Z0-9]/g, '_'); 
         await setDoc(doc(db, 'users', fakeUid), {
           ...payload,
           createdAt: serverTimestamp()
         });
         alert("Data Guru tersimpan!");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving teacher:", error);
      alert("Gagal menyimpan data guru.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus data guru ini?')) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  // Helpers
  const openModal = (teacher = null) => {
    if (teacher) {
      setEditingId(teacher.id);
      setFormData({ 
        email: teacher.email, 
        displayName: teacher.displayName, 
        phone: teacher.phone || '', 
        nip: teacher.nip || '',
        subjectId: teacher.subjectId || ''
      });
    } else {
      setEditingId(null);
      setFormData({ email: '', displayName: '', phone: '', nip: '', subjectId: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); };

  const getSubjectName = (id) => {
    const sub = subjects.find(s => s.id === id);
    return sub ? sub.name : '-';
  };

  const filteredTeachers = teachers.filter(t => 
    (t.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Data Guru</h2>
          <p className="text-gray-500 text-sm">Kelola profil guru dan penugasan mata pelajaran.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={18} /> Tambah Guru
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Cari Nama Guru atau Email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-sm"
        />
      </div>

      {loading ? (
         <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTeachers.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil size={16}/></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {item.displayName ? item.displayName.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 line-clamp-1">{item.displayName}</h3>
                  <div className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded w-fit mt-1">
                     NIP: {item.nip || '-'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span className="truncate">{item.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{item.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-400" />
                  <span className="font-bold text-gray-800">Mapel: {getSubjectName(item.subjectId)}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredTeachers.length === 0 && (
             <div className="col-span-full p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
               Data Guru Kosong
             </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{editingId ? 'Edit Profil Guru' : 'Tambah Guru Baru'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Lengkap</label>
                <input 
                  type="text" required placeholder="Contoh: Budi Santoso, S.Kom"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                <input 
                  type="email" required placeholder="guru@sekolah.sch.id"
                  value={formData.email}
                  disabled={!!editingId} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${editingId ? 'bg-gray-100 text-gray-500' : ''}`}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">NIP / ID</label>
                <input 
                  type="text" placeholder="19823xxx"
                  value={formData.nip}
                  onChange={(e) => setFormData({...formData, nip: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">No HP</label>
                <input 
                  type="text" placeholder="0812xxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mapel</label>
                <select 
                  value={formData.subjectId}
                  onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Pilih Mapel --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50">Batal</button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;