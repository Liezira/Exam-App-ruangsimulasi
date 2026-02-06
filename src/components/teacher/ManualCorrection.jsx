import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Check, X, MessageSquare } from 'lucide-react';

const ManualCorrection = ({ studentName, tokenData, questionData, onClose }) => {
  // Filter hanya soal ISIAN yang belum dikoreksi atau mau diedit
  const essayQuestions = questionData.filter(q => q.type === 'isian');
  const [answers, setAnswers] = useState(tokenData.answers || {});
  const [scores, setScores] = useState(tokenData.score || 0);

  const handleGrade = async (questionId, isCorrect, pointValue = 10) => {
    const currentAns = answers[questionId] || {};
    
    // Logic update lokal
    const newStatus = {
      ...currentAns,
      isCorrect: isCorrect,
      status: 'graded'
    };

    const newAnswers = { ...answers, [questionId]: newStatus };
    setAnswers(newAnswers);

    // Logic update skor Realtime
    // (Sederhana: Jika berubah dari Salah ke Benar, tambah nilai. Sebaliknya kurangi.)
    // Note: Ini logic sederhana, untuk production lebih baik hitung ulang total score dari awal.
    try {
       const tokenRef = doc(db, 'tokens', tokenData.tokenCode);
       await updateDoc(tokenRef, {
          [`answers.${questionId}`]: newStatus
       });
       // Kita hitung ulang total skor biar aman
       let newTotalScore = 0;
       Object.keys(newAnswers).forEach(qid => {
          // Cari soalnya untuk tau bobot nilai (misal PG=5, Isian=10)
          // Disini kita asumsi PG sudah dinilai sistem, kita hanya jumlahkan ulang
          // ... Logic hitung total ...
       });
       
       alert(`Jawaban siswa dinilai: ${isCorrect ? 'BENAR' : 'SALAH'}`);
    } catch (e) {
       console.error(e);
       alert("Gagal menyimpan nilai.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl">
        <div className="p-6 border-b bg-indigo-50 rounded-t-2xl flex justify-between">
           <div>
             <h2 className="text-xl font-bold text-indigo-900">Koreksi Manual: {studentName}</h2>
             <p className="text-sm text-indigo-600">Periksa jawaban isian siswa.</p>
           </div>
           <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {essayQuestions.map((q, idx) => {
             const ans = answers[q.id];
             const studentAnswer = ans?.answer || "- Tidak Dijawab -";
             const isGraded = ans?.status === 'graded';
             const isCorrect = ans?.isCorrect === true;

             return (
               <div key={q.id} className={`border rounded-xl p-4 ${isGraded ? (isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-white'}`}>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-gray-500 text-sm">Soal #{idx+1} (Isian)</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Kunci: <b>{q.correctAnswer}</b></span>
                  </div>
                  <p className="mb-4 font-medium text-gray-800">{q.question}</p>
                  
                  <div className="bg-white border p-3 rounded-lg mb-4 shadow-inner">
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><MessageSquare size={14}/> Jawaban Siswa:</p>
                    <p className="text-lg font-mono text-indigo-900 font-bold">{studentAnswer}</p>
                  </div>

                  <div className="flex gap-3">
                     <button 
                       onClick={() => handleGrade(q.id, true)}
                       className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition ${isCorrect && isGraded ? 'bg-green-600 text-white shadow-lg' : 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50'}`}
                     >
                       <Check size={18}/> BENAR
                     </button>
                     <button 
                       onClick={() => handleGrade(q.id, false)}
                       className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition ${!isCorrect && isGraded ? 'bg-red-600 text-white shadow-lg' : 'bg-white border-2 border-red-500 text-red-600 hover:bg-red-50'}`}
                     >
                       <X size={18}/> SALAH
                     </button>
                  </div>
               </div>
             )
           })}
           {essayQuestions.length === 0 && <div className="text-center text-gray-400 p-10">Tidak ada soal isian di ujian ini.</div>}
        </div>
      </div>
    </div>
  );
};

export default ManualCorrection;