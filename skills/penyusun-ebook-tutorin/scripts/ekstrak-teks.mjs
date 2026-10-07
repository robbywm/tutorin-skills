#!/usr/bin/env node
// Mengubah materi Word (.docx) atau PowerPoint (.pptx) menjadi teks Markdown supaya bisa dibaca
// Claude — bagian dari skill penyusun-ebook-tutorin. PDF tidak perlu skrip ini (pakai tool Read).
//
//   node <folder-skill>/scripts/ekstrak-teks.mjs <materi.docx|materi.pptx> [--keluar ringkas.md] [--gambar folder/]
//
// --gambar  salin gambar di dalam berkas ke folder itu, HANYA sebagai rujukan isi materi. Gambar
//           ebook tetap screenshot/foto/diagram buatan sendiri (aturan hak cipta di SKILL.md).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { muat } from "./_muat.mjs";

const JSZip = (await muat("jszip")).default;

const args = process.argv.slice(2);
const ambil = (nama) => {
  const i = args.indexOf(nama);
  return i >= 0 ? args[i + 1] : undefined;
};
const masuk = args.find((a, i) => !a.startsWith("--") && !["--keluar", "--gambar"].includes(args[i - 1]));
const keluar = ambil("--keluar");
const folderGambar = ambil("--gambar");
if (!masuk) {
  console.error("Pemakaian: node ekstrak-teks.mjs <materi.docx|materi.pptx> [--keluar hasil.md] [--gambar folder/]");
  process.exit(2);
}

const ENTITAS = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const dekode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITAS[e] ?? m
  );
const atribut = (xml, tag, attr) => xml.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]*)"`))?.[1];

let zip;
try {
  zip = await JSZip.loadAsync(await readFile(masuk));
} catch (e) {
  console.error(`Berkas tidak bisa dibuka sebagai .docx/.pptx: ${e.message}`);
  process.exit(2);
}
const teksDari = async (p) => (zip.file(p) ? zip.file(p).async("string") : null);
const ext = path.extname(masuk).toLowerCase();
const hasil = [];

if (ext === ".docx") {
  // Level heading dari styles.xml: nama "heading N"/"Title" atau outlineLvl — styleId bisa
  // berbeda di Word berbahasa Indonesia (mis. "Judul1").
  const gaya = new Map();
  const gayaDaftar = new Map(); // styleId -> { numId, ilvl } untuk style "List Bullet"/"List Number"
  const stylesXml = (await teksDari("word/styles.xml")) ?? "";
  for (const s of stylesXml.match(/<w:style\b[\s\S]*?<\/w:style>/g) ?? []) {
    const id = atribut(s, "w:style", "w:styleId");
    const nama = (atribut(s, "w:name", "w:val") ?? "").toLowerCase();
    const outline = atribut(s, "w:outlineLvl", "w:val");
    const h = nama.match(/^heading (\d)$/);
    if (h) gaya.set(id, Number(h[1]));
    else if (nama === "title") gaya.set(id, 1);
    else if (outline !== undefined) gaya.set(id, Number(outline) + 1);
    if (s.includes("<w:numPr>")) {
      gayaDaftar.set(id, { numId: atribut(s, "w:numId", "w:val"), ilvl: Number(atribut(s, "w:ilvl", "w:val") ?? 0) });
    }
  }

  // Bernomor atau berpoin: numId -> abstractNum -> numFmt per level (numbering.xml).
  const numberingXml = (await teksDari("word/numbering.xml")) ?? "";
  const abstrak = new Map(
    (numberingXml.match(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g) ?? []).map((a) => [
      atribut(a, "w:abstractNum", "w:abstractNumId"),
      a,
    ])
  );
  const formatDaftar = (numId, ilvl) => {
    const num = numberingXml.match(new RegExp(`<w:num\\b[^>]*w:numId="${numId}"[^>]*>[\\s\\S]*?</w:num>`))?.[0];
    const a = num && abstrak.get(atribut(num, "w:abstractNumId", "w:val"));
    const lvl = a?.match(new RegExp(`<w:lvl\\b[^>]*w:ilvl="${ilvl}"[^>]*>[\\s\\S]*?</w:lvl>`))?.[0];
    return lvl ? atribut(lvl, "w:numFmt", "w:val") : undefined;
  };

  const teksParagraf = (p) =>
    dekode(
      (p.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:tab\/>|<w:br\/>|<w:drawing\b/g) ?? [])
        .map((t) => (t === "<w:tab/>" ? "\t" : t === "<w:br/>" ? "\n" : t.startsWith("<w:drawing") ? "[gambar]" : t.replace(/<[^>]+>/g, "")))
        .join("")
    ).trim();

  const body = (await teksDari("word/document.xml")) ?? "";
  const blok = body.match(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  for (const b of blok) {
    if (b.startsWith("<w:tbl>")) {
      const baris = (b.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? []).map((tr) =>
        (tr.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? []).map((tc) =>
          (tc.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? []).map(teksParagraf).filter(Boolean).join(" ").replace(/\|/g, "\\|")
        )
      );
      if (baris.length === 0) continue;
      hasil.push("");
      baris.forEach((sel, i) => {
        hasil.push(`| ${sel.join(" | ")} |`);
        if (i === 0) hasil.push(`| ${sel.map(() => "---").join(" | ")} |`);
      });
      hasil.push("");
      continue;
    }
    const teks = teksParagraf(b);
    if (!teks) continue;
    const styleId = atribut(b, "w:pStyle", "w:val");
    const level = gaya.get(styleId);
    const daftar = b.includes("<w:numPr>")
      ? { numId: atribut(b, "w:numId", "w:val"), ilvl: Number(atribut(b, "w:ilvl", "w:val") ?? 0) }
      : gayaDaftar.get(styleId);
    if (level) {
      hasil.push("", `${"#".repeat(Math.min(level, 6))} ${teks}`, "");
    } else if (daftar) {
      const fmt = formatDaftar(daftar.numId, daftar.ilvl);
      const penanda = fmt && fmt !== "bullet" && fmt !== "none" ? "1." : "-";
      hasil.push(`${"  ".repeat(daftar.ilvl)}${penanda} ${teks}`);
    } else {
      hasil.push(teks, "");
    }
  }
  await salinGambar("word/media/");
} else if (ext === ".pptx") {
  // Urutan slide dari presentation.xml (bisa beda dengan nomor file setelah slide dipindah).
  const presentasi = (await teksDari("ppt/presentation.xml")) ?? "";
  const relasi = (await teksDari("ppt/_rels/presentation.xml.rels")) ?? "";
  const target = new Map(
    [...relasi.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)].map((m) => [m[1], m[2]])
  );
  const urutan = [...presentasi.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)]
    .map((m) => target.get(m[1]))
    .filter(Boolean)
    .map((t) => path.posix.join("ppt", t.replace(/^\/?ppt\//, "")));

  const paragrafSlide = (xml) =>
    (xml.match(/<a:p>[\s\S]*?<\/a:p>|<a:p\b[\s\S]*?<\/a:p>/g) ?? [])
      .map((p) => ({
        level: Number(atribut(p, "a:pPr", "lvl") ?? 0),
        teks: dekode((p.match(/<a:t>[\s\S]*?<\/a:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")).trim(),
      }))
      .filter((p) => p.teks);

  for (const [i, file] of urutan.entries()) {
    const xml = (await teksDari(file)) ?? "";
    const shapes = xml.match(/<p:sp\b[\s\S]*?<\/p:sp>/g) ?? [];
    const judulShape = shapes.find((s) => /<p:ph\b[^>]*type="(title|ctrTitle)"/.test(s));
    const judul = judulShape ? paragrafSlide(judulShape).map((p) => p.teks).join(" ") : "";
    hasil.push("", `## Slide ${i + 1}${judul ? `: ${judul}` : ""}`, "");
    for (const s of shapes) {
      if (s === judulShape) continue;
      for (const p of paragrafSlide(s)) hasil.push(`${"  ".repeat(p.level)}- ${p.teks}`);
    }
    for (const tbl of xml.match(/<a:tbl>[\s\S]*?<\/a:tbl>/g) ?? []) {
      for (const tr of tbl.match(/<a:tr\b[\s\S]*?<\/a:tr>/g) ?? []) {
        const sel = (tr.match(/<a:tc\b[\s\S]*?<\/a:tc>/g) ?? []).map((tc) => paragrafSlide(tc).map((p) => p.teks).join(" "));
        hasil.push(`| ${sel.join(" | ")} |`);
      }
    }
    if (/<p:pic\b/.test(xml)) hasil.push("- [gambar di slide ini]");

    const rel = (await teksDari(file.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels"))) ?? "";
    const notes = rel.match(/Target="([^"]*notesSlide\d+\.xml)"/)?.[1];
    if (notes) {
      const notesXml = (await teksDari(path.posix.normalize(path.posix.join(path.posix.dirname(file), notes)))) ?? "";
      const catatan = (notesXml.match(/<p:sp\b[\s\S]*?<\/p:sp>/g) ?? [])
        .filter((s) => /<p:ph\b[^>]*type="body"/.test(s))
        .flatMap(paragrafSlide)
        .map((p) => p.teks)
        .join(" ");
      if (catatan) hasil.push("", `> Catatan pembicara: ${catatan}`);
    }
  }
  await salinGambar("ppt/media/");
} else {
  console.error("Hanya .docx dan .pptx. Untuk PDF dan gambar pakai tool Read; untuk .doc/.ppt lama, simpan ulang sebagai .docx/.pptx.");
  process.exit(2);
}

const markdown = hasil.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
if (keluar) {
  await mkdir(path.dirname(path.resolve(keluar)), { recursive: true });
  await writeFile(keluar, markdown);
  console.log(`Teks disimpan ke ${keluar} (${markdown.length} karakter).`);
} else {
  process.stdout.write(markdown);
}

async function salinGambar(prefix) {
  if (!folderGambar) return;
  const media = Object.keys(zip.files).filter((f) => f.startsWith(prefix) && !zip.files[f].dir);
  await mkdir(folderGambar, { recursive: true });
  for (const f of media) {
    await writeFile(path.join(folderGambar, path.basename(f)), await zip.file(f).async("nodebuffer"));
  }
  console.error(`${media.length} gambar disalin ke ${folderGambar} (hanya rujukan, jangan dipakai di ebook).`);
}
