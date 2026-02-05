import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, Search, Pencil, Trash2, School, X, Save, Loader2, Users 
} from 'lucide-react';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', level: '10' });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Classes
  useEffect(() => {
    // Urutkan berdasarkan nama agar rapi (misal 10, 11, 12)
    const q = query(collection(db, 'classes'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'classes', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'classes'), {
          ...formData,
          studentCount: 0, // Inisialisasi jumlah siswa
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (error) {
      console.error("Error:", error);
      alert("Gagal menyimpan data kelas.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id) => {
    if (confirm('Hapus kelas ini? Pastikan tidak ada siswa yang terkait.')) {
      await deleteDoc(doc(db, 'classes', id));
    }
  };

  // Helpers
  const openModal = (cls = null) => {
    if (cls) {
      setEditingId(cls.id);
      setFormData({ name: cls.name, level: cls.level || '10' });
    } else {
      setEditingId(null);
      setFormData({ name: '', level: '10' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Kelas</h2>
          <p className="text-gray-500 text-sm">Buat rombongan belajar (Rombel) untuk pengelompokan siswa.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={18} /> Tambah Kelas
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Cari Nama Kelas (misal: XII IPA 1)..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-sm"
        />
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? <div className="col-span-full text-center py-10"><Loader2 className="animate-spin inline text-indigo-600"/></div> : 
         filteredClasses.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <School size={24} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16}/></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">Tingkat {item.level}</span>
                {/* Nanti ini bisa diupdate otomatis jika ada relasi siswa */}
              </div>
            </div>
          </div>
        ))}
        {!loading && filteredClasses.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            Belum ada kelas dibuat.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">{editingId ? 'Edit Kelas' : 'Tambah Kelas'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tingkat</label>
                <select 
                  value={formData.level} 
                  onChange={(e) => setFormData({...formData, level: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Kelas</label>
                <input 
                  type="text" required placeholder="Contoh: XII MIPA 1"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex justify-center items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Simpan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;