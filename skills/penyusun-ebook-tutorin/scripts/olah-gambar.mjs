#!/usr/bin/env node
// Mengolah screenshot/foto untuk ebook — bagian dari skill penyusun-ebook-tutorin.
//
//   node <folder-skill>/scripts/olah-gambar.mjs info <gambar...>
//   node <folder-skill>/scripts/olah-gambar.mjs grid <masuk> <keluar.png> [--jarak 100]
//   node <folder-skill>/scripts/olah-gambar.mjs proses <masuk> <keluar> [--samarkan x,y,l,t]...
//        [--sorot x,y,l,t]... [--potong x,y,l,t] [--lebar-maks 1600] [--lossless]
//
// Semua koordinat dalam piksel gambar MASUK — baca dari versi `grid`. Urutan proses: samarkan →
// sorot → potong → kecilkan → simpan. Format keluar mengikuti ekstensi: .png untuk screenshot dan
// diagram (palet 256 warna, kecuali --lossless), .jpg untuk foto.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { muat } from "./_muat.mjs";

const WARNA_SOROT = "#E5484D"; // sama dengan tangkap-web.mjs
const WARNA_SAMAR = "#5B6573"; // sama dengan maskColor di tangkap-web.mjs
const TEBAL_SOROT = 4; // piksel pada gambar akhir
const LEBAR_MAKS = 1600;

const sharp = (await muat("sharp")).default;

const [perintah, ...sisa] = process.argv.slice(2);

function ambilOpsi(args) {
  const posisi = [];
  const opsi = { samarkan: [], sorot: [], potong: null, jarak: 100, lebarMaks: LEBAR_MAKS, lossless: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const nilai = () => {
      const v = args[++i];
      if (v === undefined) gagal(`${a} butuh nilai`);
      return v;
    };
    if (a === "--samarkan") opsi.samarkan.push(kotak(nilai()));
    else if (a === "--sorot") opsi.sorot.push(kotak(nilai()));
    else if (a === "--potong") opsi.potong = kotak(nilai());
    else if (a === "--jarak") opsi.jarak = Number(nilai());
    else if (a === "--lebar-maks") opsi.lebarMaks = Number(nilai());
    else if (a === "--lossless") opsi.lossless = true;
    else if (a.startsWith("--")) gagal(`Opsi tidak dikenal: ${a}`);
    else posisi.push(a);
  }
  return { posisi, opsi };
}

function kotak(teks) {
  const angka = teks.split(",").map((n) => Math.round(Number(n)));
  if (angka.length !== 4 || angka.some((n) => !Number.isFinite(n)) || angka[2] <= 0 || angka[3] <= 0) {
    gagal(`Kotak harus "x,y,lebar,tinggi" dengan angka positif, bukan "${teks}"`);
  }
  const [x, y, w, h] = angka;
  return { x, y, w, h };
}

function jepit(k, W, H) {
  const x = Math.max(0, Math.min(k.x, W - 1));
  const y = Math.max(0, Math.min(k.y, H - 1));
  return { x, y, w: Math.max(1, Math.min(k.w - (x - k.x), W - x)), h: Math.max(1, Math.min(k.h - (y - k.y), H - y)) };
}

function gagal(pesan) {
  console.error(pesan);
  process.exit(2);
}

async function simpan(gambar, keluar, lossless) {
  const ext = path.extname(keluar).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") gambar = gambar.jpeg({ quality: 85, mozjpeg: true });
  else if (ext === ".png") gambar = gambar.png(lossless ? { compressionLevel: 9 } : { palette: true, quality: 90, compressionLevel: 9, effort: 8 });
  else gagal(`Ekstensi keluar harus .png atau .jpg: ${keluar}`);
  const { data, info } = await gambar.toBuffer({ resolveWithObject: true });
  await mkdir(path.dirname(path.resolve(keluar)), { recursive: true });
  await writeFile(keluar, data);
  console.log(`${keluar}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
}

// Huruf angka 3×5 piksel untuk label grid — digambar sebagai kotak SVG supaya tidak bergantung
// pada font yang terpasang di komputer.
const DIGIT = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111",
  4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001001001",
  8: "111101111101111", 9: "111101111001111",
};
function teksAngka(angka, x, y, s) {
  let rects = "";
  [...String(angka)].forEach((c, i) => {
    [...DIGIT[c]].forEach((bit, j) => {
      if (bit === "1") rects += `<rect x="${x + (i * 4 + (j % 3)) * s}" y="${y + Math.floor(j / 3) * s}" width="${s}" height="${s}"/>`;
    });
  });
  return { rects, lebar: (String(angka).length * 4 - 1) * s, tinggi: 5 * s };
}

if (perintah === "info") {
  if (sisa.length === 0) gagal("Pemakaian: node olah-gambar.mjs info <gambar...>");
  for (const f of sisa) {
    const buf = await readFile(f);
    const m = await sharp(buf).metadata();
    console.log(`${f}: ${m.width}×${m.height} ${m.format}, ${Math.round(buf.length / 1024)} KB`);
  }
} else if (perintah === "grid") {
  const { posisi, opsi } = ambilOpsi(sisa);
  const [masuk, keluar] = posisi;
  if (!masuk || !keluar) gagal("Pemakaian: node olah-gambar.mjs grid <masuk> <keluar.png> [--jarak 100]");
  const { width: W, height: H } = await sharp(masuk).metadata();
  const s = Math.max(2, Math.round(Math.max(W, H) / 900));
  let garis = "";
  let label = "";
  for (let x = opsi.jarak; x < W; x += opsi.jarak) {
    garis += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
    const t = teksAngka(x, x + 3, 3, s);
    label += `<rect class="b" x="${x + 1}" y="1" width="${t.lebar + 4}" height="${t.tinggi + 4}"/><g>${t.rects}</g>`;
  }
  for (let y = opsi.jarak; y < H; y += opsi.jarak) {
    garis += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
    const t = teksAngka(y, 3, y + 3, s);
    label += `<rect class="b" x="1" y="${y + 1}" width="${t.lebar + 4}" height="${t.tinggi + 4}"/><g>${t.rects}</g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<style>line{stroke:#00B3FF;stroke-width:1;stroke-opacity:.7} .b{fill:#fff;fill-opacity:.85} g{fill:#C2185B}</style>
${garis}${label}</svg>`;
  await simpan(sharp(masuk).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]), keluar, true);
  console.log(`Grid tiap ${opsi.jarak}px — angka di tepi atas = x, di tepi kiri = y (piksel gambar asli).`);
} else if (perintah === "proses") {
  const { posisi, opsi } = ambilOpsi(sisa);
  const [masuk, keluar] = posisi;
  if (!masuk || !keluar) gagal("Pemakaian: node olah-gambar.mjs proses <masuk> <keluar> [opsi]");
  const asli = await readFile(masuk);
  const { width: W, height: H } = await sharp(asli).metadata();

  const potong = opsi.potong ? jepit(opsi.potong, W, H) : { x: 0, y: 0, w: W, h: H };
  const lebarAkhir = Math.min(potong.w, opsi.lebarMaks);
  const skala = lebarAkhir / potong.w; // tebal garis dihitung untuk ukuran akhir

  const lapisan = [];
  // Samarkan = tutup dengan kotak solid (warna sama dengan mask di tangkap-web.mjs). Blur atau
  // pikselasi pada teks kecil seperti email/token bisa dipulihkan dengan alat depixelation.
  if (opsi.samarkan.length > 0) {
    const tutup = opsi.samarkan
      .map((k) => jepit(k, W, H))
      .map((k) => `<rect x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="${3 / skala}" fill="${WARNA_SAMAR}"/>`)
      .join("");
    lapisan.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${tutup}</svg>`), left: 0, top: 0 });
  }
  if (opsi.sorot.length > 0) {
    const t = TEBAL_SOROT / skala;
    const pad = 6 / skala;
    const rx = 6 / skala;
    let rects = "";
    for (const k of opsi.sorot) {
      const x = k.x - pad;
      const y = k.y - pad;
      const w = k.w + pad * 2;
      const h = k.h + pad * 2;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="${t + 4 / skala}"/>`;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${WARNA_SOROT}" stroke-width="${t}"/>`;
    }
    lapisan.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects}</svg>`), left: 0, top: 0 });
  }

  // composite dulu ke buffer, baru dipotong/dikecilkan — sharp menjalankan extract/resize
  // sebelum composite bila digabung dalam satu pipeline.
  const tersusun = lapisan.length ? await sharp(asli).composite(lapisan).png().toBuffer() : asli;
  let gambar = sharp(tersusun).extract({ left: potong.x, top: potong.y, width: potong.w, height: potong.h });
  if (lebarAkhir < potong.w) gambar = gambar.resize({ width: lebarAkhir });
  await simpan(gambar, keluar, opsi.lossless);
} else {
  gagal(
    "Pemakaian:\n  node olah-gambar.mjs info <gambar...>\n  node olah-gambar.mjs grid <masuk> <keluar.png> [--jarak 100]\n" +
      "  node olah-gambar.mjs proses <masuk> <keluar> [--samarkan x,y,l,t]... [--sorot x,y,l,t]... [--potong x,y,l,t] [--lebar-maks 1600] [--lossless]"
  );
}
