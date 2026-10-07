# Format paket ebook Tutorin

Sumber kebenaran: `lib/admin/zip-import.ts` (importer) dan `lib/tutorin/markdown.ts` (renderer
bab) di repo Tutorin. `scripts/paket-ebook.mjs` di folder skill memeriksa semua aturan di dokumen
ini. Kalau salah satu file itu berubah, perbarui validator dan dokumen ini bersamaan, lalu
terbitkan ulang skill ke repo `robbywm/tutorin-skills`.

## Isi ZIP dan apa yang dilakukan importer

```
<slug>.zip
├── ebook.yaml
├── 00-pendahuluan.md        bab preview
├── 01-instalasi-arduino-ide.md
└── images/
    ├── 01-01-unduh-ide.png
    └── 01-02-pilih-board.png
```

- ZIP diunggah browser ke storage privat (maks. **50 MB**), lalu divalidasi di server. Error yang
  memblokir: `ebook.yaml` tidak ada atau tidak valid, file bab yang terdaftar tidak ada, atau
  gambar yang dirujuk tidak ada. Penanda `<!-- CEK: … -->` hanya menjadi peringatan.
- Setiap gambar yang dirujuk dikompres ke WebP (lebar maks. 1600 px, kualitas 82) dan disimpan di
  bucket privat. Rujukan `images/x.png` di Markdown ditulis ulang menjadi
  `/api/ebook-image/<slug>/x.webp`. Gambar yang tidak dirujuk diabaikan.
- Ebook baru selalu berstatus **draf**. Admin memeriksa pratinjau lalu menekan Terbitkan.
- **Impor ulang dengan slug yang sama** memperbarui metadata dan bab yang slug-nya cocok, serta
  mengatur ulang urutan bab sesuai `ebook.yaml`. Bab yang sudah tidak terdaftar **tidak dihapus**
  (hanya diberi peringatan), karena menghapus bab ikut menghapus progres baca dan kuisnya.

## ebook.yaml

| Field | Wajib | Isi |
| --- | --- | --- |
| `judul` | ya | Judul ebook, mis. `"IoT Dasar dengan ESP32"` |
| `slug` | ya | Huruf kecil, angka, tanda hubung: `iot-esp32-dasar`. **Jangan diubah** setelah impor pertama |
| `jenis` | — | `jual` (default) atau `modul_les` |
| `level_les` | modul les | `explorer`, `builder`, `creator`, `innovator`, atau `null` |
| `kategori` | ebook jual | Persis salah satu: `AI`, `Coding`, `IoT`, `Robotik` (filter katalog dan warna sampul) |
| `level` | — | `Pemula`, `Menengah`, atau `Lanjutan` |
| `harga` | — | Rupiah, angka bulat **tanpa titik**: `49000` (YAML membaca `49.000` sebagai 49). Modul les: `0` |
| `deskripsi` | sangat disarankan | 2–4 kalimat **teks polos** untuk halaman detail ebook. Selama kunci ini ada, impor ulang menimpa deskripsi yang diedit di panel (`deskripsi:` kosong = dihapus); hilangkan kuncinya bila deskripsi dikelola dari panel |
| `alat_bahan` | sangat disarankan | Daftar perangkat dan software, tampil di halaman detail |
| `bab` | ya | Daftar `{ file, preview, lembar_kerja }`, berurutan |

Di dalam `bab`: `preview: true` membuat bab bisa dibaca gratis (ebook jual; minimal satu, biasanya
pendahuluan). `lembar_kerja: true` membuat bab bisa dicetak (untuk modul les). Boolean wajib
`true`/`false` — `yes`/`no` ditolak. Kunci lain, termasuk `judul` di dalam entri bab, diabaikan;
judul bab diambil dari isi file.

## Nama file bab dan slug bab

- Format `NN-judul-singkat.md` di root folder ebook: `00-pendahuluan.md`, `01-instalasi-arduino-ide.md`.
- Slug bab = nama file tanpa `.md` dan tanpa nomor depan: `01-instalasi-arduino-ide.md` →
  `instalasi-arduino-ide`. Dua file yang slug-nya sama (`03-latihan.md` dan `07-latihan.md`)
  akan **saling menimpa diam-diam** saat diimpor — validator menolaknya.
- URL bab di reader: `/baca/<slug-ebook>/<slug-bab>`. Tautan antarbab ditulis ke URL itu, bukan
  ke nama file `.md`.

## Isi file bab

- **Baris pertama**: `# Bab N: Judul Bab` (pendahuluan: `# Pendahuluan`). Importer mengambil judul
  dari baris `# ` pertama di file — termasuk komentar `#` di dalam blok kode bila judulnya tidak di
  atas. Judul tampil di daftar isi dan navigasi bab, jadi buat ±70 karakter maksimal. Satu file
  hanya punya satu heading level 1; bagian lain memakai `##` dan `###`.
- Yang didukung: paragraf, **tebal**, *miring*, daftar (bernomor, berpoin, checklist `- [ ]`),
  `kode inline`, blok kode berpagar dengan nama bahasa, tabel GFM (maks. 4 kolom agar terbaca di
  HP), tautan, gambar, callout, dan sisipan video/simulasi.
- **Callout**: hanya tiga jenis, labelnya otomatis (Tips, Peringatan, Catatan). Selalu tutup
  dengan `:::` di baris tersendiri.

  ```markdown
  :::warning
  Cabut kabel USB sebelum mengubah rangkaian.
  :::
  ```

  `:::tip` untuk jalan pintas atau saran, `:::warning` untuk risiko (tegangan, polaritas, arus pin,
  data hilang, biaya), dan `:::note` untuk informasi tambahan.
- **Sisipan** di baris tersendiri: `::youtube{id="ID_VIDEO"}` dan `::wokwi{id="ID_PROYEK"}`. Pakai
  hanya video atau proyek Wokwi milik StartByte atau yang memang boleh disematkan.
- **Blok kode** selalu memakai nama bahasa: `bash`, `powershell`, `cpp` (untuk sketch Arduino),
  `python`, `javascript`, `html`, `css`, `json`, `yaml`, `ini`, dan `text` untuk output. Nama
  bahasa diperiksa terhadap daftar Shiki di repo. Tombol **Salin** muncul otomatis.

## Jebakan renderer (sudah diuji)

Semua ini **tidak memunculkan error** di aplikasi — isinya diam-diam hilang atau rusak. Diuji pada
Oktober 2026 dengan remark-directive 4.0.0, rehype-pretty-code 0.14.5, dan Shiki 4.4.3.

| Ditulis | Yang terjadi di reader | Tulis begini |
| --- | --- | --- |
| `pukul 10:30`, `rasio 16:9`, `Pin D2:LED`, `:D` | Bagian setelah titik dua **hilang** (`pukul 10`). Titik dua yang langsung diikuti huruf/angka dianggap directive, juga di judul, tabel, dan teks tebal | `pukul 10.30` (PUEBI), beri spasi setelah titik dua, atau bungkus dengan backtick: `` `localhost:3000` `` |
| `ganti <nama-wifi>`, `<kbd>Ctrl</kbd>`, `baris<br>baru` | Tag HTML dibuang beserta isinya/efeknya; kata bisa menempel (`barisbaru`) | Placeholder dalam backtick: `` `<nama-wifi>` ``; tombol keyboard `` `Ctrl+S` `` |
| Blok kode tanpa nama bahasa | Tidak mendapat tombol Salin dan tampil beda | ` ```text ` untuk output, bahasa yang sesuai untuk kode |
| ` ```arduino `, ` ```ino `, ` ```micropython `, ` ```env ` | Kode tampil tanpa warna | ` ```cpp `, ` ```python `, ` ```dotenv ` |
| `:::info`, `:::danger` | Kotak polos tanpa gaya | `:::note`, `:::warning` |
| `:::tip` yang lupa ditutup | **Seluruh sisa bab** masuk ke dalam kotak tips | Selalu tutup dengan `:::` |
| `:::tip[Judul]` | Label menjadi paragraf biasa di dalam kotak | `:::tip` saja |
| `::youtube` tanpa id, `::nama-lain{…}` | Tidak tampil apa-apa | `::youtube{id="…"}` atau `::wokwi{id="…"}` |
| Catatan kaki `[^1]` | Dirender dengan label bahasa Inggris "Footnotes" | Kalimat biasa atau bagian Referensi |
| `![](./images/a.png)`, `![alt](images/nama file.png)`, gambar dari URL luar | Gambar tidak ikut diunggah, tampil rusak | `![alt](images/nama-file.png)` persis |
| `[Bab 2](02-bab-dua.md)` | Tautan 404 di reader | `[Bab 2](/baca/<slug-ebook>/bab-dua)` |

Aman ditulis apa adanya: `a < b`, `File > Preferences`, URL `https://…`, `C:\Users\…`,
`Catatan: teks` (ada spasi), `std::cout` di dalam backtick.

## Penanda CEK

```markdown
Tekan tombol **BOOT** selama 2 detik sampai upload dimulai.
<!-- CEK: belum diuji di board ESP32 fisik — praktik hanya di simulator Wokwi -->
```

- Satu baris, persis `<!-- CEK: alasan -->`, ditaruh tepat setelah bagian yang perlu dicek.
  Komentar yang terpotong baris tidak terdeteksi importer.
- Tidak terlihat pembaca, tetapi muncul sebagai peringatan saat impor (dan bisa muncul di cuplikan
  pencarian dalam ebook). Admin menghapusnya di editor bab setelah memeriksa.
- Alasannya spesifik: apa yang belum dipastikan dan bagaimana mengeceknya.

## Gambar

- `images/BB-LL-deskripsi.png`: BB = nomor bab, LL = urutan gambar di bab itu, deskripsi huruf
  kecil dengan tanda hubung. Contoh: `images/02-03-pilih-port-com.png`.
- PNG untuk screenshot dan diagram, JPG untuk foto. SVG dirender di server tanpa font yang sama,
  jadi render dulu ke PNG.
- Lebar maks. 1600 px. Kebanyakan pembaca memakai HP Android: potong ke area yang relevan supaya
  teks di dalam gambar tetap terbaca di layar ±360 px.
- Nama dasar unik: `a.png` dan `a.jpg` sama-sama menjadi `a.webp` saat impor, sehingga salah satu
  tertimpa. Huruf besar/kecil harus persis sama dengan rujukannya (Windows tidak membedakannya,
  ZIP membedakan).
- Alt text wajib dan bermakna: jelaskan isi gambar dan bagian yang disorot, mis. "Jendela
  Preferences Arduino IDE dengan kolom Additional boards manager URLs diberi kotak merah".
- Di dalam daftar bernomor, gambar diindentasi 3 spasi dan dipisahkan baris kosong supaya tetap
  menjadi bagian langkahnya:

  ```markdown
  1. Klik menu **Tools > Board > Boards Manager**.

     ![Menu Tools Arduino IDE dengan Boards Manager diberi kotak merah](images/02-01-menu-boards-manager.png)

  2. Ketik `esp32` di kotak pencarian.
  ```

## Deskripsi, kuis, dan sertifikat

- `deskripsi` di `ebook.yaml` ikut diimpor sebagai teks polos (tanpa Markdown).
- Kuis **tidak** ikut ZIP. Skill menyiapkan JSON per bab di `CATATAN-ADMIN.md`, lalu admin
  menempelnya di halaman edit bab. Formatnya, sesuai `lib/admin/quiz.ts`:

  ```json
  [
    { "teks": "Pin mana yang terhubung ke LED bawaan ESP32 DevKit V1?", "pilihan": ["GPIO2", "GPIO0", "GND"], "jawaban_index": 0 }
  ]
  ```

  `jawaban_index` dimulai dari 0. Buat 3–5 soal per bab yang menguji pemahaman praktik, bukan
  hafalan. Nilai lulus default 70. Bila sebuah bab punya kuis, pembaca harus lulus kuis itu untuk
  mendapat sertifikat.
