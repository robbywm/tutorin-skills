---
name: penyusun-ebook-tutorin
description: Menyusun ebook tutorial Tutorin (StartByte) dari materi atau sumber pengetahuan apa pun (PDF, Word, PowerPoint, URL, catatan, kode) menjadi paket ZIP siap impor di /admin/impor — ebook.yaml + Markdown per bab + folder images/. Membaca dan memahami materi, memeriksa pembaruan dari sumber resmi, mempraktikkan setiap langkah sungguhan di komputer sambil mengambil screenshot nyata, lalu menulis bab berbahasa Indonesia (istilah teknis asing tetap dalam bahasa Inggris) yang runtut dan mudah dipraktikkan. Untuk ebook jual maupun modul les. Pakai saat pengguna mengirim materi dan meminta dijadikan ebook, modul les, tutorial, atau bab Tutorin, atau meminta merevisi/memperbarui ebook di konten/ebook/ — mis. "jadikan materi ini ebook", "buat modul les Explorer dari PDF ini", "susun tutorial Tutorin dari link ini", "perbarui screenshot ebook iot-esp32-dasar".
---

# Penyusun Ebook Tutorin

Ubah materi dari pengguna (berkas, tautan, atau teks yang dikirim bersama permintaan ini) menjadi
ebook Tutorin yang **sudah dipraktikkan sungguhan**.

Hasil akhir: folder sumber `konten/ebook/<slug>/` dan paket `konten/ebook/<slug>/dist/<slug>.zip`
yang lolos validasi dan siap diunggah admin Tutorin di **/admin/impor**.

## Folder skill dan folder kerja

- **Folder skill** adalah folder tempat SKILL.md ini berada: `${CLAUDE_SKILL_DIR}`. Claude Code
  menggantinya dengan path absolut; di agen lain, ganti sendiri dengan path folder ini. Dokumen
  di `referensi/` menulisnya sebagai `<folder-skill>`. Panggil skrip selalu dengan path lengkap,
  mis. `node "${CLAUDE_SKILL_DIR}/scripts/paket-ebook.mjs"`, supaya tidak bergantung pada folder
  aktif terminal.
- **Folder kerja** adalah folder aktif saat skill dipanggil. Di repo Tutorin (ada
  `lib/admin/zip-import.ts`), pakai root repo; `konten/ebook/<slug>/` ikut di-commit bersama kode.
  Di luar repo, folder mana pun boleh (mis. `Documents\ebook-tutorin`); ebook tetap dibuat di
  `konten/ebook/<slug>/` di dalamnya. Semua path relatif di skill ini relatif terhadap folder
  kerja. Bila terminal sempat `cd` ke folder lain, kembali dulu ke folder kerja.
- Perintah yang dijalankan pengguna sendiri di jendela PowerShell baru harus memakai path absolut
  atau diawali `cd` ke folder kerja, karena jendela baru dibuka di folder pengguna.

## Aturan yang tidak boleh dilanggar

1. **Jujur pada praktik.** Setiap perintah, output, label tombol, versi, dan screenshot di ebook
   berasal dari praktik sungguhan di sesi ini. Yang belum bisa dipraktikkan ditulis sebaik
   mungkin lalu ditandai `<!-- CEK: alasan spesifik -->`. Jangan pernah mengarang output atau
   tampilan layar.
2. **Hak cipta.** Tulis ulang dengan kata-kata sendiri. Gambar ebook hanya screenshot, foto, atau
   diagram buatan sendiri; gambar dari materi sumber hanya rujukan, kecuali pengguna menyatakan
   gambar itu miliknya.
3. **Privasi dan keamanan.** Jangan mengetik kata sandi, token, atau data pembayaran — login dan
   CAPTCHA diserahkan ke pengguna. Samarkan email, nama pengguna di path, token, dan data pribadi
   di screenshot. Untuk anak: hanya nama depan, tanpa wajah, seragam, atau nama sekolah.
4. **Minta izin** sebelum memasang software sistem/driver atau mengubah pengaturan komputer.
   Kerjakan praktik di folder terpisah (`_kerja/praktik/` atau `C:\Praktik`).
5. **Format dan gaya.** Sebelum menulis bab pertama, baca
   [referensi/format-tutorin.md](referensi/format-tutorin.md) dan
   [referensi/gaya-penulisan.md](referensi/gaya-penulisan.md). Sebelum praktik, baca
   [referensi/praktik-screenshot.md](referensi/praktik-screenshot.md).

## Struktur folder ebook

```
konten/ebook/<slug>/
  ebook.yaml, 00-pendahuluan.md, 01-....md   isi ZIP (bab terdaftar di ebook.yaml)
  images/BB-LL-nama.png                       gambar final ≤1600px; ikut ZIP bila dirujuk bab
  _kerja/ringkasan-sumber.md, riset.md, kerangka.md, log-praktik.md, CATATAN-ADMIN.md
  _kerja/skenario/                            skenario tangkap-web.mjs + HTML/SVG diagram
  _kerja/sumber/  _kerja/mentah/  _kerja/praktik/  dist/     tidak di-commit
```

Templat ada di [templat/](templat/): `ebook.yaml`, `00-pendahuluan.md`, `bab.md`,
`catatan-admin.md`, `skenario-web.json`. Contoh ebook jadi (di repo Tutorin):
`konten/ebook/bab-uji-html-pertama/`.

## Alur kerja

### 0. Persiapan

1. Jalankan `node "${CLAUDE_SKILL_DIR}/scripts/cek-lingkungan.mjs"`. Laporannya memuat folder
   kerja, dependensi npm skill, browser, dan alat lain. Bila dependensi belum lengkap, jalankan
   perintah `npm install` yang dicetaknya — sekali setelah skill dipasang atau diperbarui; di repo
   Tutorin cukup `npm install` di root repo.
2. Periksa juga daftar tool-mu: ada `computer-use` (aplikasi desktop) dan/atau `claude-in-chrome`
   (situs yang perlu login)? Catat kemampuan yang tersedia — itu menentukan cara praktik di
   langkah 4.
3. Bila slug yang dimaksud sudah ada di `konten/ebook/`, ikuti **Mode revisi** di bawah. Bila
   belum, buat folder baru dan salin templat ke dalamnya.

### 1. Pahami materi

- PDF dan gambar: tool Read (PDF besar per rentang halaman). Word/PowerPoint:
  `node "${CLAUDE_SKILL_DIR}/scripts/ekstrak-teks.mjs" <berkas> --keluar _kerja/sumber/<nama>.md`.
  URL: WebFetch. Video: minta transkripnya ke pengguna.
- Simpan salinan materi di `_kerja/sumber/`. Tulis `_kerja/ringkasan-sumber.md`: tujuan materi,
  pembaca sasaran, prasyarat, alat dan bahan, urutan langkah, kode, klaim/versi yang perlu dicek,
  dan bagian yang kurang jelas.
- Tanyakan ke pengguna hanya yang tidak bisa disimpulkan: jenis (`jual`/`modul_les`), level les,
  harga, pembaca sasaran, dan apakah perangkat keras fisik tersedia untuk praktik.

### 2. Riset pembaruan

Untuk setiap software, library, board, layanan, dan langkah penting, cek sumber resmi
(dokumentasi, catatan rilis, halaman unduhan) dengan WebSearch/WebFetch:

- versi stabil terbaru, menu atau tombol yang berganti nama, URL yang berubah;
- langkah atau API yang usang, dan cara yang lebih aman, sederhana, atau ramah pemula.

Tulis `_kerja/riset.md` per temuan: apa yang berubah, sumber (URL + tanggal akses), dan keputusan
(ikuti materi / perbarui / tambahkan). Pakai versi **stabil**, bukan beta. Bila riset dan praktik
berbeda, **hasil praktik** yang ditulis di ebook (itu yang akan dilihat pembaca), dan perbedaannya
dicatat.

### 3. Kerangka dan persetujuan

Tulis `_kerja/kerangka.md`:

- metadata: judul, slug (`a-z0-9-`), jenis, level_les, kategori (AI/Coding/IoT/Robotik), level,
  usulan harga, alat_bahan, draf deskripsi;
- daftar bab dengan **nama file final** (`00-pendahuluan.md`, `01-…md`; slug bab tidak boleh
  kembar setelah nomor dibuang);
- per bab: tujuan, langkah inti, rencana screenshot (nama file + cara menangkapnya), kode yang
  akan diuji, risiko (hardware, login, lisensi berbayar);
- daftar perubahan dan pengembangan dibanding materi asli (dari riset).

Sajikan ringkasannya ke pengguna dan **tunggu persetujuan** sebelum praktik. Lewati jeda ini hanya
bila pengguna meminta mode otomatis; keraguan lalu ditandai CEK, bukan ditanyakan.

### 4. Praktik dan screenshot

Kerjakan bab demi bab, langkah demi langkah, sesuai
[referensi/praktik-screenshot.md](referensi/praktik-screenshot.md):

1. **Kerjakan** langkahnya sungguhan dengan cara yang paling tepat: Bash/PowerShell untuk perintah
   dan kode, `tangkap-web.mjs` untuk web publik dan file HTML lokal, Claude in Chrome untuk situs
   yang perlu login, computer use + `tangkap-layar.ps1` untuk aplikasi desktop Windows.
2. **Verifikasi** hasilnya (output, pesan, tampilan) sebelum lanjut. Bila gagal, cari penyebabnya,
   perbaiki, dan catat — error nyata adalah bahan terbaik untuk bagian "Kalau ada masalah".
3. **Tangkap** layar hanya bila gambar membantu pembaca (lokasi tombol, jendela baru, hasil
   akhir). Langsung ke `images/BB-LL-nama.png` (tangkap-web.mjs) atau lewat `_kerja/mentah/`
   lalu `olah-gambar.mjs proses` untuk menyamarkan, menyorot, memotong, dan mengecilkan.
4. **Buka gambar final dengan Read** dan pastikan isinya benar, terbaca di HP, sorotan tepat,
   dan tidak ada data pribadi.
5. **Catat** di `_kerja/log-praktik.md`: langkah, perintah/aksi, output asli, versi, error dan
   solusinya, nama gambar.

Langkah yang tidak bisa dipraktikkan (tidak ada hardware, lisensi berbayar, OS lain): tulis
langkahnya, beri `<!-- CEK: … -->`, dan masukkan ke daftar permintaan ke penulis di
`CATATAN-ADMIN.md` lengkap dengan nama file gambar yang harus dibuat.

### 5. Tulis bab

- Ikuti [templat/bab.md](templat/bab.md): judul `# Bab N: …` di baris pertama, pengantar,
  Tujuan, Alat dan bahan, Langkah-langkah, Kode program (bila ada), Uji hasil, Kalau ada masalah,
  Latihan, Ringkasan, dan baris *Diuji dengan: …*.
- Tulis **dari log praktik**, bukan dari ingatan atau materi asli. Satu aksi per langkah; gambar
  diletakkan tepat di bawah langkah yang digambarkannya, dengan alt text yang menjelaskan isi dan
  sorotannya.
- Tambahkan `:::warning` untuk risiko tegangan, polaritas, arus pin, kehilangan data, dan biaya.
- Tulis `00-pendahuluan.md` terakhir (bab preview, `preview: true`), lalu `ebook.yaml` lengkap
  dengan `deskripsi` dan `alat_bahan`.

### 6. Validasi dan kemas

```bash
node "${CLAUDE_SKILL_DIR}/scripts/paket-ebook.mjs" kemas konten/ebook/<slug>
```

Perbaiki **semua error** lalu ulangi sampai ZIP terbentuk. Baca setiap peringatan dan perbaiki
yang relevan. Error berarti importer menolak paketnya, atau isi bab akan rusak/hilang di reader
tanpa pesan apa pun.

### 7. Serah terima

1. Lengkapi `_kerja/CATATAN-ADMIN.md` dari [templat/catatan-admin.md](templat/catatan-admin.md):
   daftar CEK, permintaan foto/screenshot ke penulis, kuis JSON siap tempel per bab, perubahan
   dibanding materi asli, versi dan lingkungan uji, serta sumber riset.
2. Laporkan ke pengguna: path ZIP, jumlah bab dan gambar, ringkasan pengembangan dari materi asli,
   jumlah CEK dan apa saja, lalu langkah berikutnya — unggah di **/admin/impor**, selesaikan CEK,
   tempel kuis, pratinjau, terbitkan atau beri akses.
3. Jangan commit atau push kecuali diminta. Di repo Tutorin, sarankan commit
   `konten/ebook/<slug>/` supaya sumber dan skenario screenshot tersimpan untuk revisi berikutnya.

## Mode revisi (ebook sudah ada)

- **Jangan ubah slug ebook atau nama file bab.** Impor ulang mencocokkan bab berdasarkan slug;
  file yang diganti namanya menjadi bab baru, dan bab lama tertinggal di database.
- Baca `_kerja/` (riset, log, skenario) untuk konteks. Ulangi langkah 2 untuk mencari perubahan.
- Jalankan ulang skenario di `_kerja/skenario/` untuk memperbarui screenshot web. Praktikkan ulang
  langkah desktop yang tampilannya berubah.
- Perbarui teks, baris *Diuji dengan*, dan `CATATAN-ADMIN.md` (bagian perubahan), lalu kemas ulang.
- Bila pengguna hanya punya ZIP-nya, ekstrak dulu ke `konten/ebook/<slug>/`.

## Bila macet

- Situs atau aplikasi meminta login/CAPTCHA: minta pengguna menyelesaikannya, lalu lanjutkan.
- Aplikasi desktop tanpa computer use: beri pengguna instruksi aksi yang persis, tunggu
  konfirmasinya, lalu tangkap dengan `tangkap-layar.ps1`.
- Materi bertentangan dengan hasil praktik: ikuti hasil praktik, catat di `riset.md` dan
  `CATATAN-ADMIN.md`.
- Skenario web gagal: buka screenshot debug `_kerja/mentah/gagal-langkah-N.png`, perbaiki
  selector atau tambahkan `waitFor`, lalu jalankan ulang.
- Dependensi npm tidak bisa dipasang (mis. lingkungan tanpa akses npm seperti chat claude.ai):
  tetap tulis bab sesuai [referensi/format-tutorin.md](referensi/format-tutorin.md), tandai
  langkah yang tidak bisa dipraktikkan dengan CEK, lalu beri tahu pengguna bahwa paketnya belum
  divalidasi dan minta `paket-ebook.mjs kemas` dijalankan di komputer dengan Node.js 20+.
