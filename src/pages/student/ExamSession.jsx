import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Clock, ShieldAlert, CheckCircle2, Grid } from 'lucide-react';
import AdvancedSecurityMonitor from '../../components/student/SecurityMonitor';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

const ExamSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Token string & nama dikirim dari dashboard
  const { token, studentName } = location.state || {};

  // --- STATE ---
  const [screen, setScreen] = useState('loading'); // loading, countdown, test, result, blocked
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0); // dalam detik
  const [violationCount, setViolationCount] = useState(0);
  const [blockReason, setBlockReason] = useState('');
  
  // Timer & Security Refs
  const timerRef = useRef(null);

  // 1. Inisialisasi Data (Load Soal dari Struktur Baru)
  useEffect(() => {
    if (!token) { navigate('/student'); return; }

    const initExam = async () => {
      try {
        // A. Ambil Detail Token dulu dari Firestore
        const tokenRef = doc(db, 'tokens', token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
          alert("Token tidak valid atau tidak ditemukan.");
          navigate('/student');
          return;
        }

        const tokenData = tokenSnap.data();

        // Cek Status Token
        if (tokenData.status === 'used') {
          alert("Token ini sudah digunakan!");
          navigate('/student');
          return;
        }

        // B. Ambil Durasi dari Parent Exam Session
        let examDuration = 30; // Default 30 menit
        if (tokenData.examSessionId) {
            const sessionSnap = await getDoc(doc(db, 'exam_sessions', tokenData.examSessionId));
            if (sessionSnap.exists()) {
                examDuration = sessionSnap.data().duration || 30;
            }
        }

        // C. Ambil Soal dari 'teacher_bank_soal' menggunakan ID Referensi
        // ID ini (questionSourceId) sudah kita simpan saat Guru create exam
        const sourceId = tokenData.questionSourceId;
        
        if (!sourceId) {
            throw new Error("Data soal tidak terhubung (Source ID Missing). Hubungi Guru.");
        }

        const questionBankRef = doc(db, 'teacher_bank_soal', sourceId);
        const questionBankSnap = await getDoc(questionBankRef);

        if (!questionBankSnap.exists()) {
            throw new Error("Paket soal tidak ditemukan di database.");
        }

        const qList = questionBankSnap.data().questions || [];
        
        if (qList.length === 0) {
            throw new Error("Belum ada soal dalam paket ujian ini.");
        }
        
        // Acak Soal (Opsional, di sini kita acak)
        const shuffled = [...qList].sort(() => Math.random() - 0.5); 
        setQuestions(shuffled);
        
        // Set Waktu (Menit -> Detik)
        setTimeLeft(examDuration * 60); 
        
        setScreen('countdown');

      } catch (error) {
        console.error(error);
        alert(`Gagal memuat ujian: ${error.message}`);
        navigate('/student');
      }
    };
    initExam();
  }, [token, navigate]);

  // 2. Logic Timer
  useEffect(() => {
    if (screen === 'test' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitExam('Waktu Habis');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, timeLeft]);

  // 3. Logic Pelanggaran (Security Handler)
  const handleViolation = async (type, msg) => {
    if (screen !== 'test') return;

    const newCount = violationCount + 1;
    setViolationCount(newCount);

    // Log ke Server (Silent)
    try {
        await updateDoc(doc(db, 'tokens', token), {
            [`violations.${Date.now()}`]: { type, msg },
            violationCount: newCount
        });
    } catch (e) { console.error("Log error", e); }

    // Logic Hukuman
    if (newCount >= 3) {
        setBlockReason(`Terlalu banyak pelanggaran (${msg}). Sistem mengunci ujian.`);
        handleSubmitExam('Diskualifikasi Security');
        setScreen('blocked');
        if (document.fullscreenElement) document.exitFullscreen();
    } else {
        alert(`PERINGATAN KEAMANAN #${newCount}\n\n${msg}\n\nJika mencapai 3x, ujian otomatis berhenti!`);
    }
  };

  // 4. Logic Submit
  const handleSubmitExam = async (reason = 'Selesai Normal') => {
    if (screen === 'result' || screen === 'blocked') return;
    
    clearInterval(timerRef.current);
    setScreen('loading'); // Sementara loading

    // Hitung Skor Sederhana (Benar +1)
    let score = 0;
    
    // Pastikan questions ada isinya sebelum hitung
    if (questions.length > 0) {
        questions.forEach(q => {
            const userAnswer = answers[q.id];
            // Pastikan correctAnswer ada dan match
            if (q.correctAnswer && userAnswer === q.correctAnswer) {
                score += 1;
            }
        });
    }

    const finalScore = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    try {
        await updateDoc(doc(db, 'tokens', token), {
            status: 'used',
            finishedAt: new Date().toISOString(),
            score: finalScore,
            answers: answers,
            finishReason: reason
        });
        setScreen(reason.includes('Diskualifikasi') ? 'blocked' : 'result');
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan jawaban. Coba lagi.");
        setScreen('test'); // Balikin ke test kalau gagal save
    }
  };

  // 5. Fullscreen Helper
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log(err));
    }
  };

  // --- RENDERERS ---

  if (screen === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  // LAYAR 1: COUNTDOWN
  if (screen === 'countdown') {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center text-white p-4 text-center">
         <h2 className="text-3xl font-bold mb-4">Persiapan Ujian</h2>
         <p className="mb-8 text-indigo-200">Pastikan koneksi internet stabil. Ujian akan berjalan dalam mode layar penuh.</p>
         
         <button 
           onClick={() => {
             enterFullscreen();
             setScreen('test');
           }}
           className="bg-yellow-400 text-yellow-900 px-8 py-4 rounded-xl font-bold text-xl hover:bg-yellow-300 transition shadow-lg animate-pulse"
         >
           MULAI SEKARANG
         </button>
      </div>
    );
  }

  // LAYAR 2: BLOCKED / DISKUALIFIKASI
  if (screen === 'blocked') {
    return (
       <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border-4 border-red-500 max-w-md">
             <ShieldAlert className="w-20 h-20 text-red-600 mx-auto mb-4" />
             <h1 className="text-2xl font-black text-red-700 uppercase mb-2">UJIAN DIHENTIKAN</h1>
             <p className="text-gray-600 font-bold mb-4">{blockReason || "Pelanggaran Keamanan Terdeteksi"}</p>
             <p className="text-sm text-gray-500">Jawaban Anda telah dikirim paksa. Silakan hubungi pengawas.</p>
             <button onClick={() => navigate('/student')} className="mt-6 w-full bg-gray-800 text-white py-3 rounded-lg">Kembali ke Menu</button>
          </div>
       </div>
    );
  }

  // LAYAR 3: RESULT
  if (screen === 'result') {
      return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Ujian Selesai!</h1>
              <p className="text-gray-500 mb-6">Terima kasih {studentName}, jawaban Anda telah tersimpan.</p>
              <button onClick={() => navigate('/student')} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Kembali ke Halaman Utama</button>
           </div>
        </div>
      );
  }

  // LAYAR UTAMA: UJIAN (TEST)
  const currentQ = questions[currentQIndex];
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       {/* Security Logic Aktif Disini */}
       <AdvancedSecurityMonitor isActive={true} onViolation={handleViolation} />

       {/* HEADER */}
       <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white px-3 py-1 rounded font-mono font-bold">
                   {currentQIndex + 1} / {questions.length}
                </div>
                <div className="hidden md:block font-bold text-gray-700 truncate max-w-xs">{studentName}</div>
             </div>

             <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                <Clock size={20} />
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
             </div>
          </div>
       </header>

       {/* CONTENT */}
       <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* MAIN QUESTION AREA */}
          <div className="lg:col-span-3 space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 min-h-[400px]">
                {/* Teks Soal */}
                <div className="prose max-w-none mb-8 text-gray-800 text-lg leading-relaxed">
                   <Latex>{currentQ?.question || "Memuat soal..."}</Latex>
                </div>
                
                {/* Gambar Soal */}
                {currentQ?.image && (
                   <div className="mb-8 flex justify-center">
                      <img src={currentQ.image} alt="Soal" className="max-h-80 rounded-lg border" />
                   </div>
                )}

                {/* Opsi Jawaban */}
                <div className="space-y-3">
                   {currentQ?.type === 'isian' ? (
                      <input 
                        type="text" 
                        className="w-full p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-600 outline-none text-xl font-mono"
                        placeholder="Ketik jawaban Anda..."
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => setAnswers({...answers, [currentQ.id]: e.target.value})}
                      />
                   ) : (
                      (currentQ?.options || []).map((opt, idx) => {
                         const label = ['A','B','C','D','E'][idx];
                         const isSelected = answers[currentQ.id] === label;
                         return (
                            <button 
                               key={idx}
                               onClick={() => setAnswers({...answers, [currentQ.id]: label})}
                               className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-4 group ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}
                            >
                               <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100'}`}>
                                  {label}
                               </div>
                               <div className="flex-1 text-gray-700">
                                  <Latex>{opt}</Latex>
                               </div>
                            </button>
                         )
                      })
                   )}
                </div>
             </div>

             {/* Navigation Buttons */}
             <div className="flex justify-between items-center">
                <button 
                   onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                   disabled={currentQIndex === 0}
                   className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >
                   Sebelumnya
                </button>
                
                {currentQIndex === questions.length - 1 ? (
                   <button 
                      onClick={() => { if(confirm("Yakin ingin mengumpulkan?")) handleSubmitExam(); }}
                      className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200"
                   >
                      Kumpulkan Jawaban
                   </button>
                ) : (
                   <button 
                      onClick={() => setCurrentQIndex(Math.min(questions.length - 1, currentQIndex + 1))}
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                   >
                      Selanjutnya
                   </button>
                )}
             </div>
          </div>

          {/* SIDEBAR NAVIGATION */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sticky top-24">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Grid size={18}/> Nomor Soal</h3>
                <div className="grid grid-cols-5 gap-2">
                   {questions.map((_, idx) => {
                      const isAnswered = !!answers[questions[idx].id];
                      const isCurrent = idx === currentQIndex;
                      return (
                         <button
                            key={idx}
                            onClick={() => setCurrentQIndex(idx)}
                            className={`h-10 rounded-lg font-bold text-sm transition ${
                               isCurrent ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-2' :
                               isAnswered ? 'bg-green-500 text-white' :
                               'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                         >
                            {idx + 1}
                         </button>
                      )
                   })}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                   <div className="text-xs text-gray-500 space-y-2">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded"></div> Sudah Dijawab</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-600 rounded"></div> Sedang Dikerjakan</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-100 rounded"></div> Belum Dijawab</div>
                   </div>
                </div>
             </div>
          </div>

       </main>
    </div>
  );
};

export default ExamSession;