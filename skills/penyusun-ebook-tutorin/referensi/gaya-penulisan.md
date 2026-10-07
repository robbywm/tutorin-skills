# Gaya penulisan ebook Tutorin

Pembaca Tutorin: siswa SMK, guru, dan hobiis se-Indonesia, serta orang tua dan siswa les StartByte
(Explorer untuk usia SD sampai Innovator untuk SMA). Kebanyakan membaca di HP sambil mempraktikkan
langsung di laptop.

## Nada

- Bahasa Indonesia **baku tetapi santai**: kalimat utuh dan ejaan PUEBI, tanpa bahasa gaul.
- Sapaan **kamu**. Pakai "Anda" hanya bila pengguna meminta, mis. ebook khusus guru.
- Tanpa emoji. Tanpa basa-basi ("Halo teman-teman!", "Di era digital ini…"). Langsung ke apa yang
  akan dibuat.
- Kalimat pendek, satu gagasan per kalimat. Untuk modul Explorer dan Builder, kalimat lebih pendek
  lagi dan setiap istilah baru dijelaskan dengan perumpamaan sehari-hari.
- Jelaskan *mengapa* hanya bila itu membantu pembaca berhasil atau menghindari kesalahan.

## Istilah teknis

1. Pakai kata Indonesia bila sudah lazim dan jelas: unduh, pasang, pengaturan, tautan, kata sandi.
2. Istilah teknis asing yang tidak punya padanan lazim **tetap dalam bahasa Inggris**: *board*,
   *library*, *upload*, *breadboard*, *driver*, *prompt*. Pada penyebutan pertama di setiap bab,
   cetak miring dan beri penjelasan singkat bila pembaca mungkin belum tahu: "*library* (kumpulan
   kode siap pakai)". Setelah itu boleh ditulis tegak.
3. Kata serapan yang sudah baku ditulis biasa, tidak miring: aplikasi, instalasi, konfigurasi,
   kompilasi, mikrokontroler, sensor, modul, komponen, variabel, fungsi, simulasi.
4. **Label di layar ditulis persis** seperti yang tampak, dicetak tebal, tidak diterjemahkan: klik
   **Upload**, buka **File > Preferences**. Boleh tambahkan arti dalam kurung pada penyebutan
   pertama bila labelnya berbahasa Inggris dan tidak jelas.
5. Nama perintah, kode, file, folder, pin, nilai, dan tombol keyboard memakai backtick:
   `digitalWrite()`, `GPIO2`, `115200`, `C:\Praktik`, `Ctrl+S`.

### Glosarium (pakai konsisten di semua ebook)

| Istilah asing | Tulis | Catatan |
| --- | --- | --- |
| download | unduh | |
| upload (file ke situs) | unggah | |
| upload (program ke board) | *upload* | mengikuti tombol **Upload** di Arduino IDE |
| install | pasang (kerja), instalasi (benda) | "pasang Arduino IDE", "proses instalasi" |
| file / folder | *file* / folder | |
| software / hardware | perangkat lunak / perangkat keras | |
| library | *library* | "*library* (kumpulan kode siap pakai)" |
| board | *board* | "*board* ESP32" |
| breadboard | *breadboard* | "papan percobaan tanpa solder" pada penyebutan pertama |
| jumper wire | kabel *jumper* | |
| compile / verify | kompilasi | tombolnya **Verify** |
| error / bug / debug | *error* / *bug* / *debug* | |
| settings | pengaturan | label UI tetap apa adanya |
| click, double-click, right-click | klik, klik dua kali, klik kanan | |
| drag / scroll | seret / gulir | |
| shortcut | pintasan | `Ctrl+S` |
| browser | *browser* | |
| website / link | situs web / tautan | |
| update | perbarui, pembaruan | |
| login / sign up | masuk / daftar | label UI apa adanya |
| password / account | kata sandi / akun | |
| dashboard | dasbor | |
| command / run | perintah / jalankan | |
| output / input | keluaran / masukan | untuk pin: "pin *output*" |
| port / driver | port / *driver* | "port `COM3`" |
| microcontroller | mikrokontroler | |
| ground / voltage / current | *ground* (GND) / tegangan / arus | |
| wiring | rangkaian | |
| loop (konsep) | perulangan | fungsi `loop()` tetap |
| screenshot | tangkapan layar | |
| cloud / deploy | *cloud* / *deploy* | |
| machine learning / dataset | pembelajaran mesin (*machine learning*) / *dataset* | |

## Angka dan satuan

- Rupiah tanpa spasi dengan titik ribuan: Rp49.000. Desimal memakai koma: 3,3 V.
- Spasi antara angka dan satuan: 5 V, 20 mA, 220 ohm, 10 detik.
- Jam memakai titik: pukul 10.30 (titik dua di sini juga akan terpotong renderer).
- Nilai yang diketik ke kode atau perintah ditulis dalam backtick dan tanpa pemisah: `115200`.

## Langkah

- **Satu aksi per langkah**, diawali kata kerja perintah: Buka, Klik, Ketik, Pilih, Hubungkan,
  Simpan, Jalankan.
- Sebutkan tempatnya: "Klik **Upload** (ikon panah ke kanan di kiri atas)".
- Tambahkan hasil yang seharusnya terlihat bila itu membantu pembaca memastikan langkahnya
  berhasil: "Jendela Boards Manager terbuka di sisi kiri."
- Maksimal ±7 langkah per sub-bagian `###`. Pecah prosedur panjang menjadi beberapa tahap.
- Gambar diletakkan tepat di bawah langkah yang digambarkannya, bukan dikumpulkan di akhir.
- Hindari "klik di sini", "seperti gambar di atas", dan "dan seterusnya".

Buruk:

> Buka Arduino IDE lalu masuk ke preferences dan tambahkan URL board ESP32 kemudian install
> boardnya di boards manager.

Baik:

> 1. Buka **Arduino IDE**.
> 2. Klik **File > Preferences**. Jendela Preferences terbuka.
> 3. Tempel URL berikut di kolom **Additional boards manager URLs**, lalu klik **OK**.

## Kode

- Kode lengkap dan **sudah dijalankan** (atau dikompilasi) di praktik. Bila hanya cuplikan, katakan
  di file mana cuplikan itu diletakkan.
- Komentar di dalam kode berbahasa Indonesia, singkat. Nama variabel boleh bahasa Inggris bila
  mengikuti konvensi library.
- Setelah blok kode, jelaskan baris-baris penting dalam daftar berpoin: `` `pinMode(2, OUTPUT);` —
  menjadikan pin 2 sebagai keluaran ``.
- Output asli dari praktik ditulis di blok ` ```text `, dipangkas seperlunya (beri tanda `...`
  bila ada yang dipotong). Data pribadi di output diganti, mis. `C:\Users\<nama>` menjadi
  `C:\Users\kamu`.

## Anatomi bab

Ikuti `templat/bab.md`:

1. `# Bab N: Judul yang menyebut hasilnya` ("Bab 2: Menyalakan LED dengan ESP32", bukan "Bab 2:
   Digital Output").
2. Pengantar 2–3 kalimat: apa yang dibuat dan untuk apa.
3. `## Tujuan`: 2–4 butir kemampuan yang bisa diperiksa.
4. `## Alat dan bahan`: tabel perangkat, komponen, dan software beserta versinya.
5. `## Langkah-langkah`: sub-bagian `###` bernomor sesuai tahap.
6. `## Kode program` (bila ada) beserta penjelasannya.
7. `## Uji hasil`: apa yang seharusnya terjadi dan cara memastikannya, dengan gambar hasil akhir.
8. `## Kalau ada masalah`: tabel gejala, penyebab, solusi — utamakan masalah yang benar-benar
   muncul saat praktik.
9. `## Latihan`: 2–3 tugas pengembangan kecil, dari mudah ke menantang.
10. `## Ringkasan`: 3–5 butir.
11. Baris terakhir: `*Diuji dengan: <software> <versi>, <software> <versi>, Windows 11 — <bulan
    tahun>.*` — isi dengan versi yang **benar-benar terpasang** saat praktik (lihat log praktik),
    bukan versi dari materi atau dari riset.
