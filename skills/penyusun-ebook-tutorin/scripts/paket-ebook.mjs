#!/usr/bin/env node
// Validator & pengemas paket ebook Tutorin — bagian dari skill penyusun-ebook-tutorin.
//
// Pemakaian (dari folder kerja; dependensi npm: lihat cek-lingkungan.mjs):
//   node <folder-skill>/scripts/paket-ebook.mjs validasi konten/ebook/<slug>
//   node <folder-skill>/scripts/paket-ebook.mjs kemas konten/ebook/<slug>
//
// Dua lapis aturan:
// - IMPOR: salinan validasi lib/admin/zip-import.ts di repo Tutorin (skema ebook.yaml, file bab,
//   gambar yang dirujuk). Kalau importer berubah, ubah juga bagian bertanda "zip-import.ts" di sini.
// - RENDER: Markdown di-parse dengan paket yang sama dengan lib/tutorin/markdown.ts (remark-parse +
//   remark-gfm + remark-directive), lalu dicari pola yang terbukti merusak tampilan tanpa pesan
//   error: teks hilang karena dianggap directive, HTML dibuang, callout menelan sisa bab, dsb.
//   Penjelasan tiap aturan: referensi/format-tutorin.md.
//
// Kode keluar: 0 = lolos (boleh ada peringatan), 1 = ada error, 2 = salah pakai/dependensi hilang.

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { muat } from "./_muat.mjs";

const KATEGORI = ["AI", "Coding", "IoT", "Robotik"]; // app/tutorin/(reader)/page.tsx
const LEVEL_DISARANKAN = ["Pemula", "Menengah", "Lanjutan"];
const CALLOUT = ["tip", "warning", "note"]; // lib/tutorin/markdown.ts CALLOUT_LABEL
const EMBED = ["youtube", "wokwi"]; // lib/tutorin/markdown.ts remarkEmbeds
const BAHASA_POLOS = ["text", "txt", "plaintext", "plain"];
const BAHASA_GANTI = { arduino: "cpp", ino: "cpp", micropython: "python", env: "dotenv" };
const FORMAT_GAMBAR = [".png", ".jpg", ".jpeg", ".webp"];
const BATAS_ZIP = 50 * 1024 * 1024; // components/admin/ImportZipForm.tsx MAX_ZIP_BYTES
const BAGIAN_BAB = [
  ["tujuan", "## Tujuan"],
  ["langkah", "## Langkah-langkah"],
  ["kalau ada masalah", "## Kalau ada masalah"],
  ["latihan", "## Latihan"],
  ["ringkasan", "## Ringkasan"],
];
const DILEWATI = new Set(["_kerja", "dist", ".git", "node_modules"]);

// --- zip-import.ts (jaga tetap sama) -------------------------------------------------------------
const IMAGE_REF = /!\[[^\]]*\]\(images\/([^)\s]+)(?:\s+"[^"]*")?\)/g;
const IMAGE_REF_TUNGGAL = /^!\[[^\]]*\]\(images\/([^)\s]+)(?:\s+"[^"]*")?\)$/;
const CEK_MARKER = /<!--\s*CEK:\s*(.*?)\s*-->/g;

function chapterSlugFromFilename(filename) {
  return (
    filename
      .replace(/\.mdx?$/i, "")
      .toLowerCase()
      .replace(/^\d+[-_.]?/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || filename.replace(/\.mdx?$/i, "")
  );
}
// -------------------------------------------------------------------------------------------------

const [perintah, folderArg] = process.argv.slice(2);
if (!["validasi", "kemas"].includes(perintah) || !folderArg) {
  console.error("Pemakaian: node paket-ebook.mjs <validasi|kemas> <folder-ebook>");
  process.exit(2);
}

const { load: loadYaml } = await muat("js-yaml");
const { z } = await muat("zod");
const JSZip = (await muat("jszip")).default;
const sharp = (await muat("sharp")).default;
const { unified } = await muat("unified");
const remarkParse = (await muat("remark-parse")).default;
const remarkGfm = (await muat("remark-gfm")).default;
const remarkDirective = (await muat("remark-directive")).default;
const { visit } = await muat("unist-util-visit");
const { bundledLanguages } = await muat("shiki");

// --- zip-import.ts: skema ebook.yaml -------------------------------------------------------------
const babEntrySchema = z.object({
  file: z.string().min(1),
  preview: z.boolean().optional().default(false),
  lembar_kerja: z.boolean().optional().default(false),
});

const ebookYamlSchema = z.object({
  judul: z.string().min(1, "ebook.yaml: judul wajib diisi"),
  slug: z
    .string()
    .min(1, "ebook.yaml: slug wajib diisi")
    .regex(/^[a-z0-9-]+$/, "ebook.yaml: slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  jenis: z.enum(["jual", "modul_les"]).default("jual"),
  level_les: z.enum(["explorer", "builder", "creator", "innovator"]).nullable().optional(),
  kategori: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  harga: z.number().int().min(0).default(0),
  deskripsi: z.string().trim().nullable().optional(),
  alat_bahan: z.array(z.string()).optional().default([]),
  bab: z.array(babEntrySchema).min(1, "ebook.yaml: minimal satu bab di daftar `bab:`"),
});
// -------------------------------------------------------------------------------------------------

const PETUNJUK_FIELD = {
  preview: "isi true atau false, bukan yes/no",
  lembar_kerja: "isi true atau false, bukan yes/no",
  harga: "angka bulat rupiah tanpa titik dan tanpa tanda kutip, mis. 49000",
  jenis: "jual atau modul_les",
  level_les: "explorer, builder, creator, innovator, atau null",
};

const errors = [];
const peringatan = [];
const daftarCek = [];
const gambarDirujuk = new Map(); // nama file di images/ -> lokasi rujukan pertama
let meta = null;
const tambahError = (lokasi, pesan) => errors.push({ lokasi, pesan });
const tambahPeringatan = (lokasi, pesan) => peringatan.push({ lokasi, pesan });

const folder = path.resolve(folderArg);
const posix = (p) => p.split(path.sep).join("/");

let semuaFile;
try {
  semuaFile = new Set(
    (await readdir(folder, { recursive: true, withFileTypes: true }))
      .filter((d) => d.isFile())
      .map((d) => posix(path.relative(folder, path.join(d.parentPath ?? d.path, d.name))))
      .filter((p) => !DILEWATI.has(p.split("/")[0]))
  );
} catch {
  console.error(`Folder ebook tidak ditemukan: ${folderArg}`);
  process.exit(2);
}

// Pencocokan nama file dibuat peka huruf besar/kecil seperti di dalam ZIP — di Windows,
// "Gambar.PNG" dan "gambar.png" dianggap sama oleh sistem file, tapi tidak oleh importer.
function adaPersis(relPath) {
  return semuaFile.has(relPath);
}
function bedaHurufSaja(relPath) {
  const kecil = relPath.toLowerCase();
  return [...semuaFile].find((f) => f !== relPath && f.toLowerCase() === kecil);
}

// --- ebook.yaml ----------------------------------------------------------------------------------
if (!adaPersis("ebook.yaml")) {
  tambahError("ebook.yaml", "ebook.yaml tidak ditemukan di root folder ebook.");
  laporDanKeluar();
}

const yamlTeks = await readFile(path.join(folder, "ebook.yaml"), "utf8");
if (yamlTeks.charCodeAt(0) === 0xfeff) {
  tambahError("ebook.yaml", "File diawali BOM — simpan sebagai UTF-8 tanpa BOM.");
}
yamlTeks.split(/\r?\n/).forEach((baris, i) => {
  if (/^harga:\s*["']?\d{1,3}([.,]\d{3})+/.test(baris)) {
    tambahError(
      `ebook.yaml:${i + 1}`,
      "Harga ditulis dengan pemisah ribuan. YAML membaca 49.000 sebagai 49 — tulis 49000."
    );
  }
});

let rawYaml;
try {
  rawYaml = loadYaml(yamlTeks);
} catch (e) {
  tambahError("ebook.yaml", `ebook.yaml tidak bisa dibaca: ${e.message.split("\n")[0]}`);
  laporDanKeluar();
}

const parsed = ebookYamlSchema.safeParse(rawYaml);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    const field = issue.path.at(-1);
    const petunjuk = PETUNJUK_FIELD[field] ? ` (${PETUNJUK_FIELD[field]})` : "";
    tambahError(`ebook.yaml${issue.path.length ? ` › ${issue.path.join(".")}` : ""}`, `${issue.message}${petunjuk}`);
  }
  laporDanKeluar();
}
meta = parsed.data;

for (const kunci of Object.keys(rawYaml ?? {})) {
  if (!(kunci in ebookYamlSchema.shape)) {
    tambahPeringatan("ebook.yaml", `Kunci \`${kunci}\` tidak dikenal importer dan akan diabaikan.`);
  }
}
(rawYaml.bab ?? []).forEach((entry, i) => {
  for (const kunci of Object.keys(entry ?? {})) {
    if (!(kunci in babEntrySchema.shape)) {
      tambahPeringatan(
        `ebook.yaml › bab.${i}`,
        `Kunci \`${kunci}\` diabaikan importer${kunci === "judul" ? " — judul bab diambil dari baris `# ` pertama di file bab" : ""}.`
      );
    }
  }
});

if (meta.jenis === "jual" && !KATEGORI.includes(meta.kategori ?? "")) {
  tambahError(
    "ebook.yaml › kategori",
    `Ebook jual wajib berkategori salah satu dari ${KATEGORI.join(", ")} (huruf persis) — selain itu tidak muncul di filter katalog dan sampulnya polos.`
  );
} else if (meta.kategori && !KATEGORI.includes(meta.kategori)) {
  tambahPeringatan("ebook.yaml › kategori", `Kategori di luar ${KATEGORI.join(", ")} — sampul tampil polos.`);
}
if (meta.level && !LEVEL_DISARANKAN.includes(meta.level)) {
  tambahPeringatan("ebook.yaml › level", `Supaya seragam, pakai salah satu: ${LEVEL_DISARANKAN.join(", ")}.`);
}
if (meta.jenis === "modul_les" && !meta.level_les) {
  tambahPeringatan("ebook.yaml › level_les", "Modul les sebaiknya punya level_les (explorer/builder/creator/innovator).");
}
if (meta.jenis === "jual" && meta.harga === 0) {
  tambahPeringatan("ebook.yaml › harga", "Harga 0 — ebook ini akan gratis. Pastikan memang disengaja.");
}
if (meta.jenis === "modul_les" && meta.harga > 0) {
  tambahPeringatan("ebook.yaml › harga", "Modul les tidak dijual — harga sebaiknya 0.");
}
if (!meta.deskripsi) {
  tambahPeringatan("ebook.yaml › deskripsi", "Deskripsi kosong — halaman detail ebook tidak punya penjelasan.");
} else if (/(\*\*|^#|\]\(|`)/m.test(meta.deskripsi)) {
  tambahPeringatan("ebook.yaml › deskripsi", "Deskripsi ditampilkan sebagai teks polos — jangan pakai format Markdown.");
}
if (meta.alat_bahan.length === 0) {
  tambahPeringatan("ebook.yaml › alat_bahan", "alat_bahan kosong — isi perangkat/software yang dibutuhkan pembaca.");
}

// --- Daftar bab ----------------------------------------------------------------------------------
const slugBab = new Map();
const fileBab = new Set();
for (const [i, entry] of meta.bab.entries()) {
  const lokasi = `ebook.yaml › bab.${i}`;
  if (entry.file.includes("..") || path.isAbsolute(entry.file) || entry.file.includes("\\")) {
    tambahError(lokasi, `Path bab tidak valid: ${entry.file} — tulis relatif terhadap folder ebook, pakai "/".`);
    continue;
  }
  if (fileBab.has(entry.file)) tambahError(lokasi, `File ${entry.file} terdaftar dua kali.`);
  fileBab.add(entry.file);
  if (entry.file.includes("/")) tambahPeringatan(lokasi, "Simpan file bab di root folder ebook, bukan di subfolder.");
  if (!/\.md$/.test(entry.file)) tambahPeringatan(lokasi, "File bab sebaiknya berakhiran .md.");

  const slug = chapterSlugFromFilename(entry.file);
  if (slugBab.has(slug)) {
    tambahError(
      lokasi,
      `${entry.file} dan ${slugBab.get(slug)} sama-sama menjadi slug bab "${slug}" — importer akan menimpa bab pertama dengan bab kedua. Ganti salah satu nama file.`
    );
  }
  slugBab.set(slug, entry.file);

  if (entry.lembar_kerja && meta.jenis === "jual") {
    tambahPeringatan(lokasi, "lembar_kerja (bisa dicetak) ditujukan untuk modul les.");
  }
  if (entry.preview && meta.jenis === "modul_les") {
    tambahPeringatan(lokasi, "preview tidak berpengaruh pada modul les (modul les tidak tampil di katalog).");
  }
}
if (meta.jenis === "jual" && !meta.bab.some((b) => b.preview)) {
  tambahPeringatan("ebook.yaml › bab", "Tidak ada bab preview — calon pembeli tidak bisa mencoba membaca.");
}

// --- Isi bab -------------------------------------------------------------------------------------
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);
const EMOJI = /\p{Extended_Pictographic}/u;

for (const entry of meta.bab) {
  if (!fileBab.has(entry.file)) continue;
  if (!adaPersis(entry.file)) {
    const mirip = bedaHurufSaja(entry.file);
    tambahError(
      "ebook.yaml",
      `Bab hilang: ${entry.file} disebut di ebook.yaml tapi tidak ada${mirip ? ` (yang ada: ${mirip} — huruf besar/kecil harus sama persis)` : ""}.`
    );
    continue;
  }
  const isi = await readFile(path.join(folder, entry.file), "utf8");
  periksaBab(entry, isi);
}

function periksaBab(entry, isiAsli) {
  const file = entry.file;
  if (isiAsli.charCodeAt(0) === 0xfeff) {
    tambahError(`${file}:1`, "File diawali BOM — simpan sebagai UTF-8 tanpa BOM.");
  }
  const isi = isiAsli.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const baris = isi.split("\n");
  const sumber = (node) => isi.slice(node.position.start.offset, node.position.end.offset);
  const di = (node) => `${file}:${node.position?.start.line ?? 1}`;

  // zip-import.ts: gambar yang dirujuk & penanda CEK dicari di teks mentah (termasuk blok kode).
  for (const m of isi.matchAll(IMAGE_REF)) {
    const no = isi.slice(0, m.index).split("\n").length;
    if (!gambarDirujuk.has(m[1])) gambarDirujuk.set(m[1], `${file}:${no}`);
  }
  for (const m of isi.matchAll(CEK_MARKER)) {
    const no = isi.slice(0, m.index).split("\n").length;
    daftarCek.push({ lokasi: `${file}:${no}`, pesan: m[1] || "periksa bagian ini" });
  }

  const tree = parser.parse(isi);
  const pertama = tree.children[0];
  if (!pertama || pertama.type !== "heading" || pertama.depth !== 1 || !baris[pertama.position.start.line - 1].startsWith("#")) {
    tambahError(
      `${file}:1`,
      "Baris pertama harus judul bab berbentuk `# Bab N: Judul` — importer mengambil judul dari baris `# ` pertama di file, termasuk komentar `#` di dalam blok kode."
    );
  } else {
    const judul = sumber(pertama).replace(/^#\s+/, "").trim();
    if (judul.length > 70) {
      tambahPeringatan(`${file}:1`, `Judul bab ${judul.length} karakter — terlalu panjang untuk daftar isi di HP (maks. ±70).`);
    }
  }

  let jumlahH1 = 0;
  let levelSebelumnya = 1;
  const judulH2 = [];
  let adaDiujiDengan = false;

  visit(tree, (node, _index, parent) => {
    switch (node.type) {
      case "heading": {
        if (node.depth === 1) jumlahH1++;
        if (node.depth > levelSebelumnya + 1) {
          tambahPeringatan(di(node), `Heading melompat dari level ${levelSebelumnya} ke ${node.depth}.`);
        }
        levelSebelumnya = node.depth;
        if (node.depth === 2) judulH2.push(sumber(node).replace(/^#+\s+/, "").trim().toLowerCase());
        break;
      }
      case "code": {
        const lang = (node.lang ?? "").toLowerCase();
        if (!/^\s*(`{3,}|~{3,})/.test(sumber(node))) {
          tambahError(di(node), "Blok kode berindentasi (4 spasi) — pakai blok berpagar ``` dengan nama bahasa.");
        } else if (!lang) {
          tambahError(
            di(node),
            "Blok kode tanpa nama bahasa tidak mendapat tombol Salin. Tulis bahasanya, mis. ```bash, ```cpp, atau ```text untuk output."
          );
        } else if (BAHASA_GANTI[lang]) {
          tambahError(di(node), `Bahasa \`${lang}\` tidak dikenal Shiki (kode tampil tanpa warna) — pakai \`${BAHASA_GANTI[lang]}\`.`);
        } else if (!BAHASA_POLOS.includes(lang) && !(lang in bundledLanguages)) {
          tambahPeringatan(di(node), `Bahasa \`${lang}\` tidak dikenal Shiki — kode tampil tanpa warna.`);
        }
        const akhir = sumber(node).trimEnd().split("\n").at(-1);
        if (!/^\s*(`{3,}|~{3,})\s*$/.test(akhir ?? "") || sumber(node).trimEnd().split("\n").length < 2) {
          tambahError(di(node), "Blok kode tidak ditutup — sisa bab akan tampil sebagai kode.");
        }
        break;
      }
      case "html": {
        const nilai = node.value.trim();
        if (/^<!--[\s\S]*-->$/.test(nilai)) {
          if (/CEK/.test(nilai) && nilai.includes("\n")) {
            tambahError(di(node), "Komentar CEK harus satu baris — yang terpotong baris tidak terdeteksi importer.");
          } else if (!/^<!--\s*CEK:/.test(nilai)) {
            tambahPeringatan(di(node), "Komentar HTML selain `<!-- CEK: … -->` tidak berguna (dibuang renderer) — hapus.");
          }
        } else {
          tambahError(
            di(node),
            `HTML mentah \`${nilai.slice(0, 40)}\` dibuang renderer beserta efeknya (kata bisa menempel). Tulis tanpa HTML; untuk placeholder pakai backtick, mis. \`<nama-wifi>\`.`
          );
        }
        break;
      }
      case "textDirective": {
        const teksBaris = baris[node.position.start.line - 1].trim();
        tambahError(
          di(node),
          `":${node.name}" akan HILANG dari tampilan (titik dua yang langsung diikuti huruf/angka dianggap directive). Tulis jam dengan titik (10.30), beri spasi setelah titik dua, atau bungkus dengan backtick. Baris: ${teksBaris.slice(0, 80)}`
        );
        break;
      }
      case "leafDirective": {
        if (!EMBED.includes(node.name)) {
          tambahError(di(node), `Sisipan \`::${node.name}\` tidak dikenal (tampil kosong) — hanya ::youtube{id="…"} dan ::wokwi{id="…"}.`);
        } else if (!node.attributes?.id) {
          tambahError(di(node), `::${node.name} wajib punya id, mis. ::${node.name}{id="…"} — tanpa id tampil kosong.`);
        }
        break;
      }
      case "containerDirective": {
        if (!CALLOUT.includes(node.name)) {
          tambahError(di(node), `Callout \`:::${node.name}\` tidak dikenal (tampil tanpa gaya) — hanya :::tip, :::warning, :::note.`);
        }
        if (!sumber(node).trimEnd().endsWith(":::")) {
          tambahError(di(node), `Callout :::${node.name} tidak ditutup — seluruh sisa bab ikut masuk ke kotak callout. Tambahkan baris \`:::\`.`);
        }
        if (/^\s*:{4,}/.test(sumber(node))) {
          tambahError(di(node), "Pakai tepat tiga titik dua (:::) — callout bertingkat tidak didukung.");
        }
        if (parent && parent.type === "containerDirective") {
          tambahError(di(node), "Callout di dalam callout tidak didukung.");
        }
        if (node.children[0]?.data?.directiveLabel) {
          tambahPeringatan(di(node), "Label `[…]` di callout tampil sebagai paragraf biasa — label Tips/Peringatan/Catatan sudah otomatis.");
        }
        break;
      }
      case "image": {
        const src = sumber(node);
        if (!IMAGE_REF_TUNGGAL.test(src)) {
          tambahError(
            di(node),
            `Rujukan gambar harus persis \`![alt](images/nama-file.png)\` — tanpa ./, tanpa spasi, tanpa URL luar. Ditemukan: ${src.slice(0, 80)}`
          );
        }
        if (!node.alt?.trim()) {
          tambahError(di(node), "Gambar tanpa alt text — jelaskan isi gambar dan bagian yang disorot.");
        } else if (node.alt.trim().length < 15) {
          tambahPeringatan(di(node), `Alt text "${node.alt}" terlalu singkat — jelaskan isi gambar dan bagian yang disorot.`);
        }
        break;
      }
      case "imageReference":
        tambahError(di(node), "Gambar gaya referensi `![alt][id]` tidak dikenali importer — tulis `![alt](images/nama.png)`.");
        break;
      case "link":
        if (/\.mdx?(#.*)?$/i.test(node.url) && !/^https?:/i.test(node.url)) {
          tambahError(di(node), `Tautan ke file ${node.url} tidak jalan di reader — tautkan ke /baca/<slug-ebook>/<slug-bab>.`);
        }
        break;
      case "footnoteReference":
        tambahPeringatan(di(node), "Catatan kaki dirender dengan label bahasa Inggris (Footnotes) — ganti dengan kalimat biasa atau bagian Referensi.");
        break;
      case "table": {
        const kolom = node.children[0]?.children.length ?? 0;
        if (kolom > 4) tambahPeringatan(di(node), `Tabel ${kolom} kolom sulit dibaca di HP — maks. 4 kolom.`);
        break;
      }
      case "text": {
        if (EMOJI.test(node.value)) tambahPeringatan(di(node), "Ada emoji — gaya Tutorin tanpa emoji.");
        if (/diuji dengan/i.test(node.value)) adaDiujiDengan = true;
        break;
      }
    }
  });

  if (jumlahH1 > 1) {
    tambahError(`${file}:1`, `Ada ${jumlahH1} heading level 1 — satu bab hanya punya satu \`# Judul\`; bagian lain pakai \`##\`.`);
  }

  const babIsi = !entry.preview && !/pendahuluan/.test(file);
  if (babIsi) {
    for (const [awalan, contoh] of BAGIAN_BAB) {
      if (!judulH2.some((j) => j.startsWith(awalan) || (awalan === "kalau ada masalah" && j.startsWith("troubleshooting")))) {
        tambahPeringatan(file, `Bagian \`${contoh}\` tidak ada (lihat templat/bab.md).`);
      }
    }
    if (!adaDiujiDengan) {
      tambahPeringatan(file, "Baris \"Diuji dengan: …\" (software, versi, OS, bulan) tidak ada.");
    }
  }
}

// --- Gambar --------------------------------------------------------------------------------------
const gambarBelumDirujuk = new Set([...semuaFile].filter((f) => f.startsWith("images/")));
const namaWebp = new Map();
for (const [img, lokasi] of gambarDirujuk) {
  const rel = `images/${img}`;
  gambarBelumDirujuk.delete(rel);

  const webp = img.replace(/\.\w+$/, ".webp");
  if (namaWebp.has(webp)) {
    tambahError(lokasi, `images/${img} dan images/${namaWebp.get(webp)} sama-sama menjadi ${webp} saat diimpor — salah satu akan tertimpa. Ganti nama salah satunya.`);
  }
  namaWebp.set(webp, img);

  if (!adaPersis(rel)) {
    const mirip = bedaHurufSaja(rel);
    tambahError(lokasi, `Gambar dirujuk tapi tidak ada: ${rel}${mirip ? ` (yang ada: ${mirip} — huruf besar/kecil harus sama persis)` : ""}.`);
    continue;
  }

  const ext = path.extname(img).toLowerCase();
  if (ext === ".svg") {
    tambahPeringatan(lokasi, `${rel}: SVG dirender di server tanpa font yang sama — render dulu ke PNG (tangkap-web.mjs).`);
  } else if (!FORMAT_GAMBAR.includes(ext)) {
    tambahError(lokasi, `${rel}: format ${ext || "(tanpa ekstensi)"} tidak didukung — pakai .png (screenshot/diagram) atau .jpg (foto).`);
    continue;
  }
  if (/[A-Z\s]/.test(img)) tambahPeringatan(lokasi, `${rel}: pakai huruf kecil tanpa spasi, mis. 02-01-buka-ide.png.`);

  try {
    const buf = await readFile(path.join(folder, rel));
    const { width = 0, height = 0 } = await sharp(buf).metadata();
    if (width > 1600) tambahPeringatan(lokasi, `${rel}: lebar ${width}px — importer mengecilkan ke 1600px; perkecil dulu agar repo ringan (olah-gambar.mjs).`);
    if (width < 400) tambahPeringatan(lokasi, `${rel}: lebar ${width}px — kemungkinan buram/terlalu kecil.`);
    if (height > width * 2.5) tambahPeringatan(lokasi, `${rel}: ${width}×${height}px terlalu tinggi untuk dibaca di HP — potong atau pecah jadi beberapa gambar.`);
    if (buf.length > 1.5 * 1024 * 1024) tambahPeringatan(lokasi, `${rel}: ${(buf.length / 1024 / 1024).toFixed(1)} MB — kompres dulu (olah-gambar.mjs).`);
  } catch (e) {
    tambahError(lokasi, `${rel} tidak bisa dibaca sebagai gambar: ${e.message}`);
  }
}
for (const sisa of gambarBelumDirujuk) {
  tambahPeringatan(sisa, "Gambar tidak dirujuk bab mana pun — tidak ikut dikemas.");
}

// --- Kemas ---------------------------------------------------------------------------------------
if (perintah === "kemas" && errors.length === 0) {
  const zip = new JSZip();
  zip.file("ebook.yaml", yamlTeks);
  for (const entry of meta.bab) {
    zip.file(entry.file, await readFile(path.join(folder, entry.file)));
  }
  for (const img of gambarDirujuk.keys()) {
    zip.file(`images/${img}`, await readFile(path.join(folder, "images", img)), { compression: "STORE" });
  }
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  if (buffer.length > BATAS_ZIP) {
    tambahError("dist", `ZIP ${(buffer.length / 1024 / 1024).toFixed(1)} MB melebihi batas unggah 50 MB — kecilkan gambar.`);
  } else {
    const keluar = path.join(folder, "dist", `${meta.slug}.zip`);
    await mkdir(path.dirname(keluar), { recursive: true });
    await writeFile(keluar, buffer);
    console.log(
      `ZIP: ${posix(path.relative(process.cwd(), keluar))} (${(buffer.length / 1024 / 1024).toFixed(2)} MB, ${meta.bab.length} bab, ${gambarDirujuk.size} gambar)`
    );
  }
}

laporDanKeluar();

function laporDanKeluar() {
  const judul = meta ? `${meta.judul} (${meta.slug}, ${meta.jenis})` : folderArg;
  console.log(`\nEbook: ${judul}`);
  if (meta) console.log(`Bab: ${meta.bab.length} | gambar dirujuk: ${gambarDirujuk.size}`);
  const cetak = (label, daftar) => {
    if (daftar.length === 0) return;
    console.log(`\n${label} (${daftar.length}):`);
    for (const { lokasi, pesan } of daftar) console.log(`  - ${lokasi}  ${pesan}`);
  };
  cetak("[ERROR] harus diperbaiki", errors);
  cetak("[PERINGATAN]", peringatan);
  cetak("[CEK] muncul sebagai peringatan saat impor — selesaikan sebelum terbit", daftarCek);
  console.log(
    `\nHasil: ${errors.length} error, ${peringatan.length} peringatan, ${daftarCek.length} CEK.` +
      (errors.length ? " Perbaiki error lalu jalankan ulang." : perintah === "validasi" ? " Siap dikemas." : "")
  );
  process.exit(errors.length ? 1 : 0);
}
