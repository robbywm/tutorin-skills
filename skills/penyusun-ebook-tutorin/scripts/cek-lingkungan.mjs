#!/usr/bin/env node
// Laporan singkat kemampuan komputer ini untuk praktik & tangkap layar — bagian dari skill
// penyusun-ebook-tutorin. Jalankan dari folder kerja (folder tempat konten/ebook/ dibuat):
//
//   node <folder-skill>/scripts/cek-lingkungan.mjs
//
// Folder skill dihitung dari lokasi skrip ini, jadi perintah yang dicetak memakai path absolut dan
// bisa disalin ke jendela terminal mana pun. Skill bisa terpasang di repo Tutorin
// (.claude/skills/), di ~/.claude/skills/, atau di folder plugin — ketiganya didukung.
// Alat MCP (computer-use, claude-in-chrome) tidak terlihat dari skrip — Claude memeriksanya
// sendiri di daftar tool yang tersedia.

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { DIR_SKILL, PERINTAH_PASANG } from "./_muat.mjs";

const win = process.platform === "win32";
const mac = process.platform === "darwin";
const baris = [];
const tulis = (s = "") => baris.push(s);

function cariPerintah(nama) {
  const r = win ? spawnSync("where", [nama], { encoding: "utf8" }) : spawnSync("sh", ["-c", `command -v ${nama}`], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}
async function adaPaket(nama) {
  try {
    await import(nama);
    return true;
  } catch {
    return false;
  }
}
// Repo Tutorin dikenali dari importer-nya; dicari dari folder `dari` ke atas.
function cariRepoTutorin(dari) {
  for (let d = path.resolve(dari); ; d = path.dirname(d)) {
    if (existsSync(path.join(d, "lib", "admin", "zip-import.ts"))) return d;
    if (path.dirname(d) === d) return null;
  }
}

const dirSkrip = path.join(DIR_SKILL, "scripts");
const folderAktif = path.resolve(process.cwd());
const samaPath = (a, b) => (win ? a.toLowerCase() === b.toLowerCase() : a === b);
const repoAktif = cariRepoTutorin(folderAktif);
const repoSkill = cariRepoTutorin(DIR_SKILL); // skill disimpan di dalam repo Tutorin?
const folderKerja = repoAktif ?? folderAktif;
const [nodeMayor, nodeMinor] = process.versions.node.split(".").map(Number);
const nodeCukup = nodeMayor > 20 || (nodeMayor === 20 && nodeMinor >= 9);
const perintahUjiLayar = `powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(dirSkrip, "tangkap-layar.ps1")}" -UjiCoba`;

tulis("Lingkungan praktik — skill penyusun-ebook-tutorin");
tulis(`OS     : ${os.type()} ${os.release()} (${process.platform}/${process.arch})`);
tulis(`Node   : ${process.version}${nodeCukup ? "" : " — TERLALU LAMA, pasang Node.js 20.9 atau lebih baru"}`);
tulis(`Skill  : ${DIR_SKILL}`);
if (!repoAktif) {
  tulis(`Folder : ${folderAktif}`);
  tulis("         folder kerja di luar repo Tutorin — ebook dibuat di konten/ebook/ di folder ini");
} else if (samaPath(repoAktif, folderAktif)) {
  tulis(`Folder : ${folderAktif} (root repo Tutorin — OK)`);
} else {
  tulis(`Folder : ${folderAktif}`);
  tulis(`         subfolder repo Tutorin — path relatif di skill tidak akan ketemu. Pindah dulu: cd "${repoAktif}"`);
}

tulis("\nDependensi npm skill:");
const paket = ["js-yaml", "jszip", "zod", "sharp", "unified", "remark-parse", "remark-gfm", "remark-directive", "unist-util-visit", "shiki", "playwright-core"];
const hilang = [];
for (const p of paket) if (!(await adaPaket(p))) hilang.push(p);
if (!hilang.length) {
  tulis("  lengkap");
} else {
  tulis(`  BELUM LENGKAP: ${hilang.join(", ")}`);
  tulis(`  Jalankan sekali: ${repoSkill ? `npm install --prefix "${repoSkill}"   (root repo Tutorin)` : PERINTAH_PASANG}`);
  if (!repoSkill) tulis("  Ulangi setelah skill diperbarui bila folder skill ikut diganti (mis. plugin Claude Code).");
}

tulis("\nBrowser untuk tangkap-web.mjs:");
const kandidat = [];
if (process.env.PENYUSUN_BROWSER) kandidat.push(["PENYUSUN_BROWSER", process.env.PENYUSUN_BROWSER]);
if (win) {
  const pf = [process.env["ProgramFiles"], process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean);
  for (const base of pf) {
    kandidat.push(["Microsoft Edge", path.join(base, "Microsoft", "Edge", "Application", "msedge.exe")]);
    kandidat.push(["Google Chrome", path.join(base, "Google", "Chrome", "Application", "chrome.exe")]);
  }
} else if (mac) {
  kandidat.push(["Microsoft Edge", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]);
  kandidat.push(["Google Chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]);
} else {
  for (const n of ["microsoft-edge", "google-chrome", "chromium", "chromium-browser"]) {
    const p = cariPerintah(n);
    if (p) kandidat.push([n, p]);
  }
  kandidat.push(["Chromium sesi cloud", "/opt/pw-browsers/chromium"]);
}
const browserAda = [...new Map(kandidat.filter(([, p]) => existsSync(p)).map(([n, p]) => [p, n])).entries()];
if (browserAda.length) for (const [p, n] of browserAda) tulis(`  ${n}: ${p}`);
else tulis("  TIDAK ADA — pasang Microsoft Edge/Google Chrome atau isi PENYUSUN_BROWSER");

tulis("\nAlat lain:");
const alat = win
  ? [["powershell", "tangkap-layar.ps1 (screenshot aplikasi desktop)"], ["pwsh", "PowerShell 7 (opsional)"], ["git"], ["winget", "memasang software untuk praktik"], ["python"], ["arduino-cli", "kompilasi/upload sketch tanpa GUI"]]
  : [["git"], ["python3"], ["arduino-cli", "kompilasi/upload sketch tanpa GUI"], ...(mac ? [["screencapture", "screenshot jendela macOS"]] : [["Xvfb", "layar virtual"], ["xdotool", "klik/ketik di layar virtual"], ["import", "ImageMagick: screenshot layar virtual"]])];
for (const [nama, guna] of alat) {
  const p = cariPerintah(nama);
  tulis(`  ${nama.padEnd(12)} ${p ? "ada" : "tidak ada"}${guna ? ` — ${guna}` : ""}`);
}

tulis(`\nEbook di ${path.join(folderKerja, "konten", "ebook")}:`);
const dirKonten = path.join(folderKerja, "konten", "ebook");
const ebook = existsSync(dirKonten)
  ? readdirSync(dirKonten, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(path.join(dirKonten, d.name, "ebook.yaml"))).map((d) => d.name)
  : [];
tulis(`  ${ebook.length ? ebook.join(", ") : "(belum ada)"}`);

tulis("\nSaran cara praktik:");
tulis(`  - Web & diagram  : tangkap-web.mjs${browserAda.length ? "" : " (butuh browser — lihat di atas)"}`);
tulis("  - Situs perlu login: Claude in Chrome (cek tool claude-in-chrome; aktifkan dengan /chrome)");
if (win) {
  tulis("  - Aplikasi desktop: computer use di Claude Desktop (Settings > This computer > System),");
  tulis("    simpan gambar dengan tangkap-layar.ps1; tanpa computer use, minta pengguna mengklik.");
  tulis("    Uji sekali (bisa disalin ke jendela PowerShell mana pun):");
  tulis(`    ${perintahUjiLayar}`);
} else if (mac) {
  tulis("  - Aplikasi desktop: computer use (/mcp > computer-use), simpan gambar dengan screencapture -l/-R.");
} else {
  tulis("  - Aplikasi desktop: layar virtual Xvfb + xdotool + import (lihat referensi/praktik-screenshot.md).");
}
tulis("  - Terminal & kode : jalankan sungguhan, salin output asli ke blok ```text.");

console.log(baris.join("\n"));
