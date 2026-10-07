# Tutorin Skills

Skill AI untuk **Tutorin**, platform ebook dan modul les StartByte. Formatnya mengikuti standar
[Agent Skills](https://agentskills.io), jadi bisa dipakai di Claude Code, claude.ai, dan agen AI
lain.

## Penyusun Ebook Tutorin (`penyusun-ebook-tutorin`)

Mengubah materi atau sumber pengetahuan apa pun (PDF, Word, PowerPoint, URL, catatan, kode) menjadi
ebook Tutorin berbahasa Indonesia yang **sudah dipraktikkan sungguhan**:

1. membaca dan merangkum materi;
2. memeriksa pembaruan dari sumber resmi — versi terbaru, menu yang berganti nama, cara yang lebih
   baik;
3. menyajikan kerangka bab untuk disetujui;
4. mempraktikkan setiap langkah di komputer sambil mengambil screenshot nyata (Playwright lewat
   Edge/Chrome, Claude in Chrome, computer use + PowerShell di Windows);
5. menulis bab yang runtut dan mudah dipraktikkan, dengan istilah teknis asing tetap dalam bahasa
   Inggris;
6. memvalidasi dan mengemas ZIP siap impor di **/admin/impor** Tutorin, plus catatan admin
   (penanda CEK, permintaan foto ke penulis, kuis per bab).

Hasilnya ada di folder kerja: sumber `konten/ebook/<slug>/` dan paket
`konten/ebook/<slug>/dist/<slug>.zip`.

## Pasang

### Claude Code — akun apa pun

Di Claude Code (terminal, atau tab **Code** di aplikasi Claude Desktop):

```text
/plugin marketplace add robbywm/tutorin-skills
/plugin install tutorin@tutorin-skills
```

Dari terminal biasa, perintah yang sama:
`claude plugin marketplace add robbywm/tutorin-skills` lalu
`claude plugin install tutorin@tutorin-skills`. Mulai ulang Claude Code setelah memasang.

Pakai dengan perintah, atau cukup minta dengan kalimat biasa ("jadikan materi ini ebook Tutorin"):

```text
/tutorin:penyusun-ebook-tutorin materi/iot-dasar.pdf — untuk siswa SMK pemula, ebook jual kategori IoT
```

Memperbarui ke versi terbaru:

```text
/plugin marketplace update tutorin-skills
/plugin update tutorin@tutorin-skills
```

### Agen lain (Codex, Cursor, Gemini CLI, GitHub Copilot, dll.) atau tanpa plugin

```bash
npx skills add robbywm/tutorin-skills                     # pilih agennya secara interaktif
npx skills add robbywm/tutorin-skills -g -a claude-code   # langsung ke ~/.claude/skills
```

Cara manual: salin folder [`skills/penyusun-ebook-tutorin/`](skills/penyusun-ebook-tutorin/) ke
folder skill agennya — untuk Claude Code `~/.claude/skills/` (Windows:
`%USERPROFILE%\.claude\skills\`).

### claude.ai dan chat di aplikasi Claude

1. Unduh
   [penyusun-ebook-tutorin.zip](https://github.com/robbywm/tutorin-skills/releases/latest/download/penyusun-ebook-tutorin.zip)
   (dibuat ulang otomatis setiap kali skill berubah).
2. Buka [Customize > Skills](https://claude.ai/customize/skills), klik **+** > **Create skill** >
   **Upload a skill**, lalu pilih ZIP tadi. Code execution harus aktif.

Di chat, Claude tidak bisa mengendalikan komputer, dan biasanya tidak bisa memasang paket npm.
Langkah yang tidak bisa dipraktikkan ditandai CEK, dan ZIP-nya perlu divalidasi ulang di komputer
dengan Claude Code. Untuk ebook dengan screenshot nyata, pakai Claude Code.

## Persiapan sekali di komputer

- **Node.js 20.9 atau lebih baru** (`node --version`).
- **Dependensi npm skill.** Saat dipakai pertama kali, Claude menjalankan cek lingkungan dan
  memasang dependensinya dengan `npm install --prefix "<folder-skill>"` (±100 MB). Pada plugin
  Claude Code, folder plugin diganti setiap kali diperbarui, jadi dependensi dipasang ulang
  otomatis setelah pembaruan.
- **Microsoft Edge atau Google Chrome** untuk screenshot web otomatis (tidak ada browser yang
  diunduh).
- Opsional di Windows: ekstensi **Claude in Chrome** untuk situs yang perlu login, dan **computer
  use** di Claude Desktop untuk aplikasi desktop seperti Arduino IDE. Rinciannya ada di
  [praktik-screenshot.md](skills/penyusun-ebook-tutorin/referensi/praktik-screenshot.md).

## Isi repo

```
.claude-plugin/                 marketplace "tutorin-skills" dan plugin "tutorin" untuk Claude Code
skills/penyusun-ebook-tutorin/
  SKILL.md                      alur kerja dan aturan
  referensi/                    format paket Tutorin, gaya penulisan, cara praktik & screenshot
  templat/                      ebook.yaml, bab, catatan admin, skenario screenshot web
  scripts/                      validator & pengemas ZIP, tangkap layar web/Windows, olah gambar,
                                ekstrak teks Word/PowerPoint, cek lingkungan
  package.json                  dependensi skrip (versi sama dengan aplikasi Tutorin)
.github/workflows/zip-skill.yml ZIP untuk claude.ai
```

## Pemeliharaan

Skill ini dikembangkan bersama aplikasi Tutorin, karena validatornya harus selalu sama dengan
importer di aplikasi. Perubahan format masuk ke sini sebagai commit baru di `main`. Plugin Claude
Code sengaja tidak memakai nomor versi: setiap commit langsung menjadi pembaruan.
