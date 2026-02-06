import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, Search, Pencil, Trash2, X, Save, Loader2, Mail, Phone, BookOpen 
} from 'lucide-react';
import PageTransition from '../../components/PageTransition';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // PERUBAHAN 1: subjectIds adalah Array [] bukan String ''
  const [formData, setFormData] = useState({ 
    email: '', displayName: '', phone: '', nip: '', subjectIds: [] 
  });
  const [selectedSubject, setSelectedSubject] = useState(''); // State sementara untuk dropdown
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'teacher')); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'subjects'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.subjectIds.length === 0) return alert("Pilih minimal satu mata pelajaran!");
    
    setIsSaving(true);
    try {
      const payload = {
        role: 'teacher',
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        nip: formData.nip,
        subjectIds: formData.subjectIds, // Kita simpan Array
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
      }
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus data guru ini?')) await deleteDoc(doc(db, 'users', id));
  };

  // LOGIC BARU: Tambah Mapel ke List
  const handleAddSubject = () => {
    if (!selectedSubject) return;
    if (!formData.subjectIds.includes(selectedSubject)) {
      setFormData({ ...formData, subjectIds: [...formData.subjectIds, selectedSubject] });
    }
    setSelectedSubject('');
  };

  // LOGIC BARU: Hapus Mapel dari List
  const handleRemoveSubject = (idToRemove) => {
    setFormData({
      ...formData,
      subjectIds: formData.subjectIds.filter(id => id !== idToRemove)
    });
  };

  const openModal = (teacher = null) => {
    if (teacher) {
      setEditingId(teacher.id);
      // Support data lama (kalau dulu pake string, kita ubah jadi array biar ga error)
      let currentSubjects = teacher.subjectIds || [];
      if (!teacher.subjectIds && teacher.subjectId) currentSubjects = [teacher.subjectId];

      setFormData({ 
        email: teacher.email, displayName: teacher.displayName, phone: teacher.phone || '', 
        nip: teacher.nip || '', subjectIds: currentSubjects 
      });
    } else {
      setEditingId(null);
      setFormData({ email: '', displayName: '', phone: '', nip: '', subjectIds: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // Helper untuk menampilkan nama mapel banyak sekaligus
  const getSubjectNames = (ids) => {
    if (!ids || !Array.isArray(ids)) return '-';
    return ids.map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', ');
  };

  const filteredTeachers = teachers.filter(t => 
    (t.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold">Data Guru</h2><p className="text-gray-500 text-sm">Kelola Guru Multi-Mapel</p></div>
        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2"><Plus size={18}/> Tambah Guru</button>
      </div>

      <div className="bg-white p-4 rounded-xl border flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input type="text" placeholder="Cari Guru..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 outline-none"/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeachers.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border p-6 hover:shadow-md relative group">
             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => openModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded"><Pencil size={16}/></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded"><Trash2 size={16}/></button>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">{item.displayName?.[0]}</div>
                <div><h3 className="font-bold">{item.displayName}</h3><div className="text-xs bg-indigo-50 text-indigo-600 px-2 rounded w-fit">{item.nip || '-'}</div></div>
              </div>
              <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                 <div className="flex gap-2"><Mail size={16}/> {item.email}</div>
                 <div className="flex gap-2"><Phone size={16}/> {item.phone || '-'}</div>
                 <div className="flex gap-2 items-start">
                    <BookOpen size={16} className="mt-1 shrink-0"/> 
                    <span className="font-bold text-gray-800">
                      {/* Handle Tampilan Multi ID */}
                      {item.subjectIds ? getSubjectNames(item.subjectIds) : getSubjectNames([item.subjectId])}
                    </span>
                 </div>
              </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold">Form Data Guru</h3>
              <button onClick={closeModal}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input type="text" placeholder="Nama Lengkap" required value={formData.displayName} onChange={e=>setFormData({...formData, displayName: e.target.value})} className="w-full p-3 border rounded-lg"/>
              <input type="email" placeholder="Email" required disabled={!!editingId} value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full p-3 border rounded-lg disabled:bg-gray-100"/>
              <div className="grid grid-cols-2 gap-4">
                 <input type="text" placeholder="NIP" value={formData.nip} onChange={e=>setFormData({...formData, nip: e.target.value})} className="w-full p-3 border rounded-lg"/>
                 <input type="text" placeholder="No HP" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full p-3 border rounded-lg"/>
              </div>

              {/* AREA MULTI MAPEL (Sistem Tagging) */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <label className="block text-xs font-bold uppercase mb-2">Mata Pelajaran Diampu</label>
                <div className="flex gap-2 mb-3">
                    <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="flex-1 p-2 border rounded">
                        <option value="">-- Pilih Mapel --</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" onClick={handleAddSubject} className="bg-indigo-600 text-white px-3 rounded font-bold"><Plus/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.subjectIds.map(id => {
                        const subName = subjects.find(s=>s.id===id)?.name;
                        return (
                            <span key={id} className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                {subName} <button type="button" onClick={()=>handleRemoveSubject(id)} className="hover:text-red-500"><X size={14}/></button>
                            </span>
                        )
                    })}
                    {formData.subjectIds.length === 0 && <span className="text-gray-400 text-xs italic">Belum ada mapel dipilih.</span>}
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex justify-center gap-2">
                 {isSaving ? <Loader2 className="animate-spin"/> : <Save/>} Simpan Data
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
};

export default Teachers;