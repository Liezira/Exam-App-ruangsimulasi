import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase'; // Pastikan path benar
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Mail, Phone, Save, Camera, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TeacherProfile = () => {
  const [profile, setProfile] = useState({ displayName: '', email: '', phone: '', photoURL: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const storage = getStorage();

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({ ...data, photoURL: data.photoURL || '' });
          setPreviewUrl(data.photoURL || '');
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Preview lokal biar cepat
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const user = auth.currentUser;
      let finalPhotoURL = profile.photoURL;

      // 1. Upload Foto jika ada file baru
      if (imageFile) {
        const storageRef = ref(storage, `profiles/${user.uid}_${Date.now()}`);
        await uploadBytes(storageRef, imageFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      // 2. Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        phone: profile.phone,
        photoURL: finalPhotoURL
      });
      
      alert("Profil berhasil diperbarui!");
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline"/></div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex justify-between items-end">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-gray-200 overflow-hidden flex items-center justify-center">
                 {previewUrl ? (
                   <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <User size={48} className="text-gray-400" />
                 )}
              </div>
              <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition transform hover:scale-110">
                <Camera size={20} className="text-indigo-600" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            <div className="mb-2">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Guru</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Profil</h1>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" value={profile.displayName} 
                  onChange={e => setProfile({...profile, displayName: e.target.value})}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email (Tidak bisa diubah)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="text" value={profile.email} disabled className="w-full pl-10 p-3 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nomor WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" value={profile.phone} 
                  onChange={e => setProfile({...profile, phone: e.target.value})}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default TeacherProfile;