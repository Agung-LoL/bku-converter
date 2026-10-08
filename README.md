# Konverter BKU

Aplikasi web untuk mengkonversi file BKU import ke format BKU yang diinginkan, dengan fitur master harga barang untuk auto-fill harga satuan.

## Cara Install & Jalankan

### Kebutuhan
- Node.js versi 18 ke atas — download di https://nodejs.org

### Langkah-langkah

1. Extract file zip ke folder mana saja
2. Buka terminal/Command Prompt di folder tersebut
3. Jalankan: npm install
4. Jalankan: npm run dev
5. Buka browser: http://localhost:5173

## Cara Pakai

Tab "Master Harga" — lakukan ini dulu:
1. Download template → isi di Excel → import kembali
2. Simpan master

Tab "Konversi BKU":
1. Upload BKU_YG_DIIMPORT.xlsx
2. Harga otomatis terisi jika nama uraian cocok dengan master
3. Klik Download BKU untuk unduh hasil


## Fitur Surat Tugas & LPJ

### Setup Data Sekolah (Satu Kali Setup)

**PENTING**: Sebelum membuat Surat Tugas pertama kali, lakukan setup data sekolah terlebih dahulu:

1. Buka tab **LPJ**
2. Pilih salah satu bulan dari daftar
3. Klik tombol **⚙️ Setup Data Sekolah** di pojok kanan atas
4. Isi semua data:
   - Identitas Sekolah (nama, alamat, korwil, dll)
   - Kepala Sekolah (nama & NIP)
   - Bendahara (opsional, kosongkan jika tidak ada)
   - **Logo Kop Surat**: Upload logo kiri dan kanan (PNG/JPG, maks 500KB)
5. Klik **💾 Simpan Data Sekolah**

Data ini akan **tersimpan dan digunakan otomatis** untuk semua Surat Tugas ke depannya, jadi Anda tidak perlu input ulang setiap bulan.

### Membuat Surat Tugas

1. Buka tab **LPJ**
2. Pilih bulan → Pilih Kode Rekening → Pilih No. Bukti
3. Klik **📄 Buat LPJ**
4. Form akan otomatis terisi dengan data sekolah yang sudah disimpan
5. Isi data tambahan (penerima tugas, nomor surat, dll)
6. Klik **Unduh Surat Tugas (.docx)**

Dokumen Word yang dihasilkan akan berisi:
- Halaman 1: Surat Perintah Tugas (SPT)
- Halaman 2: Daftar Hadir & Daftar Penerimaan Honor (digabung dalam 1 lembar)
- Halaman 3: Notula Kegiatan
- Halaman 4: Kwitansi

Logo yang Anda upload akan muncul di kop surat semua halaman.

### Mengubah Data Sekolah

Jika ada perubahan (misalnya ganti Kepala Sekolah atau logo):
1. Klik lagi tombol **⚙️ Setup Data Sekolah**
2. Edit data yang ingin diubah
3. Simpan — data baru akan digunakan untuk Surat Tugas berikutnya
