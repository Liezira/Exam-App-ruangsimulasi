import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 1. Export Excel (Struktur Raport)
export const exportRaportExcel = (examTitle, className, studentData) => {
  // studentData: [{ name: 'Andi', score: 80, answers: {...}, rank: 1 }]
  
  const headers = [
    { header: 'Peringkat', key: 'rank' },
    { header: 'Nama Siswa', key: 'name' },
    { header: 'Nilai Akhir', key: 'score' },
    { header: 'Status', key: 'status' },
    { header: 'Waktu Selesai', key: 'finishedAt' }
  ];

  const data = studentData.map(s => ({
    rank: s.rank,
    name: s.name,
    score: s.score,
    status: s.score >= 75 ? 'LULUS' : 'REMEDIAL', // Contoh KKM 75
    finishedAt: s.finishedAt
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Raport Nilai");
  XLSX.writeFile(wb, `Raport_${className}_${examTitle}.xlsx`);
};

// 2. Export PDF (Raport Resmi)
export const exportRaportPDF = (examTitle, className, teacherName, studentData) => {
  const doc = new jsPDF();

  // Header Raport
  doc.setFontSize(18);
  doc.text("LAPORAN HASIL UJIAN", 105, 20, null, null, "center");
  
  doc.setFontSize(12);
  doc.text(`Mata Ujian : ${examTitle}`, 14, 40);
  doc.text(`Kelas      : ${className}`, 14, 48);
  doc.text(`Guru       : ${teacherName}`, 14, 56);
  doc.text(`Tanggal    : ${new Date().toLocaleDateString('id-ID')}`, 14, 64);

  // Tabel Nilai
  const tableColumn = ["Rank", "Nama Siswa", "Nilai", "Predikat", "Keterangan"];
  const tableRows = [];

  studentData.forEach((student, index) => {
    let predikat = "C";
    if(student.score >= 90) predikat = "A";
    else if(student.score >= 80) predikat = "B";

    const ket = student.score >= 75 ? "Tuntas" : "Belum Tuntas";

    const row = [
      index + 1,
      student.name,
      student.score,
      predikat,
      ket
    ];
    tableRows.push(row);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 75,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo color
  });

  // Footer Tanda Tangan
  const finalY = doc.lastAutoTable.finalY + 30;
  doc.text("Mengetahui,", 140, finalY);
  doc.text("Guru Pengampu", 140, finalY + 25);
  doc.text(`(${teacherName})`, 140, finalY + 30);

  doc.save(`Raport_${className}.pdf`);
};