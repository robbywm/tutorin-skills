# Praktik sungguhan dan screenshot

Prinsipnya: setiap langkah di ebook pernah benar-benar dikerjakan di sesi ini, hasilnya
diverifikasi, dan gambarnya diambil dari layar sungguhan. Lingkungan utama: **Claude Code di
Windows**. Catatan untuk sesi cloud Linux dan macOS ada di bagian akhir.

`<folder-skill>` di dokumen ini adalah folder skill (`${CLAUDE_SKILL_DIR}` di SKILL.md) — tulis
selalu path absolutnya. Path relatif lain (`konten/ebook/<slug>/…`) relatif terhadap folder kerja.

## Persiapan sekali di Windows

1. Node.js 20.9+ dan dependensi npm skill (`playwright-core`, `sharp`, dan lain-lain): jalankan
   `node "<folder-skill>/scripts/cek-lingkungan.mjs"` dan ikuti perintah `npm install` yang
   dicetaknya. Di repo Tutorin cukup `npm install` di root repo.
2. **Claude in Chrome**: pasang ekstensi Claude di Chrome atau Edge, lalu jalankan `/chrome` di
   Claude Code dan pilih browsernya. Dipakai untuk situs yang perlu login.
3. **Computer use** (paket Pro/Max): jalankan Claude Code dari tab **Code** di aplikasi Claude
   Desktop, lalu aktifkan **Settings > This computer > System > Enable computer use**. Dipakai
   untuk aplikasi desktop. Di CLI Windows, computer use tidak tersedia.
4. Uji penyimpan screenshot:
   `powershell -NoProfile -ExecutionPolicy Bypass -File "<folder-skill>/scripts/tangkap-layar.ps1" -UjiCoba`
   lalu buka gambar `%TEMP%\uji-tangkap-layar.png` dengan Read untuk memastikan ukuran dan
   ketajamannya benar. Error "*-File parameter does not exist*" berarti path-nya salah — pakai
   path absolut. `cek-lingkungan.mjs` mencetak perintah ini dengan path absolut yang siap disalin
   ke jendela PowerShell mana pun; pakai itu saat memberi pengguna perintah untuk jendela mereka
   sendiri.
5. Siapkan layar yang rapi: tema terang, skala tampilan 100–125%, notifikasi dimatikan (Focus
   assist / Do not disturb), jendela aplikasi ±1280×800, dan folder praktik netral seperti
   `C:\Praktik` supaya nama pengguna Windows tidak muncul di path.

## Memilih cara per langkah

| Jenis langkah | Cara mengerjakan | Cara menyimpan gambar |
| --- | --- | --- |
| Perintah, instalasi lewat CLI, menjalankan kode | Bash/PowerShell langsung | Output asli ke blok ` ```text ` — bukan gambar |
| Situs/tools web publik, file HTML lokal, diagram | `tangkap-web.mjs` dengan skenario JSON | Otomatis, termasuk sorotan dan `mask` |
| Situs yang perlu login (Tinkercad, Colab, dasbor) | Claude in Chrome di browser pengguna | Screenshot `save_to_disk`, lalu `olah-gambar.mjs` |
| Aplikasi desktop (Arduino IDE, VS Code, Thonny, installer) | computer use; bila tidak ada, pengguna mengklik sesuai instruksi | `tangkap-layar.ps1`, lalu `olah-gambar.mjs` |
| Board/rangkaian fisik | `arduino-cli` (kompilasi, upload, serial) bila board tersambung; simulasi Wokwi bila tidak | Foto dari penulis (permintaan di CATATAN-ADMIN), screenshot simulator |

Pilih cara yang paling tepat dan bisa diulang. Instalasi boleh dikerjakan lewat CLI (`winget`,
`arduino-cli`) asalkan tampilan yang perlu dilihat pembaca tetap ditangkap dari aplikasinya.

## tangkap-web.mjs — browser yang bisa diulang

```bash
node "<folder-skill>/scripts/tangkap-web.mjs" konten/ebook/<slug>/_kerja/skenario/02-wokwi.json
```

Browser yang dicoba berurutan: `PENYUSUN_BROWSER` (path executable), Microsoft Edge, Google Chrome,
lalu Chromium sesi cloud. Tidak ada yang diunduh. Tambahkan `--lihat` untuk menampilkan jendela
browser. Simpan satu skenario per bab di `_kerja/skenario/` supaya screenshot bisa diperbarui
saat revisi dengan menjalankannya ulang. Contoh lengkap: `templat/skenario-web.json`.

Kunci tingkat atas (path relatif terhadap file skenario):

| Kunci | Default | Isi |
| --- | --- | --- |
| `outDir` | `../../images` | Folder gambar final |
| `rawDir` | `../mentah` | Folder screenshot debug saat gagal dan `"raw": true` |
| `viewport` | `{ "width": 1280, "height": 800 }` | Ukuran halaman |
| `deviceScaleFactor` | `1.25` | 1280 × 1,25 = 1600 px, pas dengan batas importer |
| `colorScheme` | `light` | Tema halaman |
| `locale`, `timezoneId`, `baseURL` | — | Opsional |
| `mask` | `[]` | Selector data pribadi yang ditutup di **semua** screenshot |
| `timeout` | `15000` | ms per aksi |

Langkah di `steps` berisi tepat satu aksi:

| Aksi | Contoh | Catatan |
| --- | --- | --- |
| `goto` | `{ "goto": "https://wokwi.com/projects/new/esp32" }`, `{ "goto": "diagram.html" }` | Path tanpa skema = file lokal relatif skenario |
| `click`, `dblclick`, `hover`, `check` | `{ "click": "role=button[name=\"Start the simulation\"]" }` | Elemen pertama yang cocok; `>> nth=1` untuk yang lain |
| `fill` | `{ "fill": "#ssid", "value": "Wokwi-GUEST" }` | Mengganti isi input |
| `type` | `{ "type": "#cari", "text": "esp32", "delay": 30 }` | Mengetik huruf demi huruf. Di editor kode (Monaco/CodeMirror) auto-indent dan kurung otomatis bisa mengacaukan kode — isi lewat API editornya dengan `eval`, lalu periksa hasilnya di screenshot |
| `press` | `{ "press": "Control+S" }` | Opsional `selector` |
| `select`, `upload` | `{ "select": "#board", "value": "esp32" }` | `upload` memakai `files: [...]` |
| `waitFor` | `{ "waitFor": "text=Simulation started", "timeout": 30000 }` | `state`: visible/hidden/attached |
| `wait` | `{ "wait": 1500 }` | ms; pakai bila tidak ada penanda yang bisa ditunggu |
| `scroll`, `eval`, `viewport` | `{ "eval": "document.compatMode" }` | `eval` menjalankan JavaScript di halaman dan mencetak hasilnya — pakai untuk verifikasi |
| `highlight` | `{ "highlight": ["role=button[name=\"Upload\"]"] }` | Kotak merah di screenshot berikutnya |
| `clearHighlight` | `{ "clearHighlight": true }` | |
| `screenshot` | `{ "screenshot": "02-03-mulai-simulasi.png", "element": "#editor", "padding": 24 }` | Juga `clip`, `fullPage`, `mask`, `lossless`, `raw` |
| `note` | `{ "note": "Langkah 3 di bab 2" }` | Komentar, tidak dijalankan |

Tips:

- Selector paling awet: `role=button[name="…"]`, `text=…`, lalu `#id`. Hindari class acak hasil
  build (`.css-1x2y3z`).
- Selalu `waitFor` penanda bahwa halaman siap sebelum screenshot; `wait` hanya cadangan.
- Pintasan milik browser (`F5`, `Ctrl+L`, `Ctrl+T`) **tidak diproses** saat dikirim lewat `press`
  — halaman tidak dimuat ulang. Pakai `{ "eval": "location.reload()" }` lalu `waitFor`, dan jangan
  menganggap pintasannya sudah teruji.
- `element` + `padding` memotong ke bagian yang relevan. Ini lebih baik daripada layar penuh yang
  tidak terbaca di HP.
- Bila gagal, buka `_kerja/mentah/gagal-langkah-N.png` dengan Read, perbaiki skenarionya, dan
  jalankan ulang.
- Diagram dan skema: tulis HTML/SVG di `_kerja/skenario/`, lalu `goto` file itu dan `screenshot`
  dengan `element`. Font sistem dipakai dengan benar, berbeda dengan SVG mentah di server.
- File lokal yang dibuka skenario (hasil praktik pembaca, diagram) simpan di `_kerja/skenario/`,
  bukan `_kerja/praktik/`, karena hanya folder itu yang di-commit dan skenario harus bisa diulang.

## Claude in Chrome — situs yang perlu login

1. Buka situsnya lewat tool claude-in-chrome. Bila muncul halaman login atau CAPTCHA, minta
   pengguna menyelesaikannya; jangan mengetik kata sandi.
2. Kerjakan langkahnya dan verifikasi hasilnya di halaman.
3. Untuk sorotan, jalankan JavaScript di halaman sebelum screenshot (ganti selectornya):

   ```javascript
   (() => { const b = document.querySelector("SELECTOR").getBoundingClientRect();
     const d = document.createElement("div"); d.id = "__sorotan_tutorin";
     d.style.cssText = `position:absolute;z-index:2147483647;pointer-events:none;box-sizing:border-box;left:${b.left + scrollX - 6}px;top:${b.top + scrollY - 6}px;width:${b.width + 12}px;height:${b.height + 12}px;border:3px solid #E5484D;border-radius:6px;box-shadow:0 0 0 2px rgba(255,255,255,.9)`;
     document.documentElement.appendChild(d); })();
   ```

   Hapus lagi dengan `document.getElementById("__sorotan_tutorin")?.remove()`.
4. Ambil screenshot dengan opsi `save_to_disk`, pindahkan filenya ke `_kerja/mentah/`, lalu olah
   dengan `olah-gambar.mjs` (samarkan nama/email akun, potong, kecilkan).

## Aplikasi desktop di Windows

Computer use bisa melihat dan mengendalikan layar, tetapi **tidak menyimpan screenshot ke disk**,
dan tingkat izinnya per kategori aplikasi:

- **Browser: hanya melihat.** Pakai tangkap-web.mjs atau Claude in Chrome untuk web.
- **Terminal dan IDE (VS Code, Arduino IDE): hanya klik dan gulir — tidak bisa mengetik atau
  memakai pintasan.** Siapkan teks lewat file atau CLI: tulis sketch ke
  `C:\Praktik\Blink\Blink.ino` lalu buka di IDE (`Start-Process`), pasang board/library lewat
  `arduino-cli` bila tampilan mengetiknya tidak perlu ditunjukkan. Bila pembaca perlu melihat
  langkah mengetik (mis. kotak pencarian Boards Manager), minta pengguna mengetiknya.
- **Aplikasi lain (installer, Serial plotter, Tinkercad desktop): kendali penuh.**

Alur per langkah:

1. Buka aplikasinya (`Start-Process "C:\Program Files\Arduino IDE\Arduino IDE.exe"` atau lewat
   computer use) dan kerjakan aksinya.
2. Simpan screenshot jendela:

   ```bash
   powershell -NoProfile -ExecutionPolicy Bypass -File "<folder-skill>/scripts/tangkap-layar.ps1" -Judul "Arduino IDE" -Keluar konten/ebook/<slug>/_kerja/mentah/02-01.png
   ```

   `-DaftarJendela` menampilkan judul dan proses yang bisa dipilih. `-Proses "Code"` memilih
   berdasarkan nama proses, `-Area x,y,lebar,tinggi` memilih area layar, dan `-LayarPenuh`
   menangkap monitor utama. Hasilnya JSON berisi posisi, ukuran, dan skala DPI.
3. Olah gambarnya. Buat versi bergrid untuk membaca koordinat, lihat dengan Read, lalu proses:

   ```bash
   E=konten/ebook/<slug>
   node "<folder-skill>/scripts/olah-gambar.mjs" grid $E/_kerja/mentah/02-01.png $E/_kerja/mentah/02-01-grid.png
   node "<folder-skill>/scripts/olah-gambar.mjs" proses $E/_kerja/mentah/02-01.png $E/images/02-01-menu-tools.png --sorot 412,96,180,32 --samarkan 40,700,300,24 --potong 0,0,1100,640
   ```

   Koordinat dalam piksel gambar mentah, berbentuk `x,y,lebar,tinggi`. `--sorot` dan
   `--samarkan` boleh diulang. Lihat lagi hasilnya; bila sorotan meleset, perbaiki koordinatnya.
4. **Tanpa computer use**: tulis instruksi aksi yang persis untuk pengguna ("Klik menu Tools, arahkan
   ke Board, lalu klik Boards Manager. Ketik 'selesai' bila sudah."), tunggu konfirmasinya, lalu
   tangkap dengan tangkap-layar.ps1 dan verifikasi gambarnya.

## Terminal dan kode

- Jalankan perintahnya sungguhan. Salin **output asli** ke blok ` ```text `, pangkas yang tidak
  perlu (tandai `...`), dan ganti data pribadi.
- Untuk pembaca Windows, tulis perintah sebagai ` ```powershell ` (Command Prompt hanya bila
  memang diperlukan). Bila perintahnya sama di semua OS, ` ```bash ` sudah cukup.
- Kode program harus terbukti jalan: jalankan (Python, Node), kompilasi (`arduino-cli compile
  --fqbn esp32:esp32:esp32 <folder-sketch>`), atau simulasikan. Catat versi compiler/core.

## Perangkat keras

- Board tersambung? `arduino-cli board list` menunjukkan port-nya. Upload dan baca serial sungguhan
  (`arduino-cli upload`, `arduino-cli monitor -p COM3 -c baudrate=115200`), lalu salin output
  serialnya.
- Tidak ada board: simulasikan di Wokwi (situs publik, tangkap-web.mjs) dan tandai langkah fisiknya
  dengan CEK.
- Foto rangkaian selalu dari penulis. Tulis permintaannya di CATATAN-ADMIN: nama file, apa yang
  harus terlihat (kaki LED, warna kabel, pin), dan sudut pengambilan. Tanpa wajah anak dan tanpa
  data pribadi.
- Tambahkan `:::warning` untuk tegangan (3,3 V vs 5 V), polaritas (LED, elektrolit, catu daya),
  dan arus pin (pakai resistor; jangan langsung menyalakan motor dari pin).

## Standar screenshot (periksa setiap gambar dengan Read)

- Menunjukkan tepat satu hal yang dibicarakan langkahnya, dipotong ke area yang relevan.
- Teks di dalam gambar terbaca bila gambar dikecilkan ke lebar HP (±330 px). Hitungannya: teks
  16 px dari tangkapan selebar 1280 px CSS tampil ±4 px di HP — tidak terbaca. Untuk detail,
  tangkap area selebar ≤600 px CSS (halaman web: viewport sempit, mis. 480, plus `element`;
  aplikasi desktop: `--potong`). Tangkapan satu jendela penuh hanya untuk orientasi ("seperti
  inilah jendela utamanya"), lalu detailnya ditangkap terpisah.
- Diagram buatan sendiri dirancang sempit (±380 px CSS) dengan teks ≥14 px.
- Sorotan merah `#E5484D` hanya pada elemen yang harus diklik atau diperhatikan, maks. 2–3 per
  gambar.
- Tidak ada data pribadi: email, nama akun, token/API key, nama pengguna di path, nama Wi-Fi rumah,
  nomor telepon.
- Tema terang, tanpa notifikasi, tanpa tab/jendela lain yang tidak relevan.
- Lebar ≤1600 px, PNG (JPG untuk foto), nama `images/BB-LL-deskripsi.png`.

## Log praktik

`_kerja/log-praktik.md` adalah bahan utama penulisan. Format per langkah:

```markdown
### Bab 2 · Langkah 3 — Memasang board ESP32
- Aksi: arduino-cli core install esp32:esp32
- Hasil: berhasil (2 menit 10 detik). Output penting: "Platform esp32:esp32@<versi> installed"
- Versi: arduino-cli <versi>, esp32 core <versi>
- Gambar: images/02-03-boards-manager-esp32.png (computer use + tangkap-layar.ps1)
- Masalah: unduhan sempat timeout; berhasil setelah diulang → masuk "Kalau ada masalah"
```

## Lingkungan lain

- **Sesi cloud Linux (claude.ai/code)**: tangkap-web.mjs memakai `/opt/pw-browsers/chromium`.
  Aplikasi desktop Linux bisa dijalankan di layar virtual (`Xvfb :99 &`, `DISPLAY=:99`), dikendalikan
  dengan `xdotool` (pasang dulu bila belum ada), dan ditangkap dengan `import -window root
  out.png`. Tampilannya berbeda dengan Windows, jadi untuk ebook pembaca Windows lebih baik minta
  screenshot aplikasi desktop dari penulis. Akses internet di sesi cloud bisa dibatasi; laporkan
  bila situs yang dibutuhkan diblokir.
- **macOS**: computer use tersedia di CLI (`/mcp` → `computer-use`). Simpan screenshot jendela dengan
  `screencapture -x -l <windowid> out.png` atau `screencapture -x -R x,y,w,h out.png`.
