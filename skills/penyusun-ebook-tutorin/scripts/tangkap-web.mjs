#!/usr/bin/env node
// Menjalankan skenario browser sungguhan dan menyimpan screenshot untuk ebook — bagian dari skill
// penyusun-ebook-tutorin.
//
//   node <folder-skill>/scripts/tangkap-web.mjs <skenario.json> [--lihat]
//
// --lihat  tampilkan jendela browser dan perlambat aksi (supaya bisa diikuti dengan mata).
//
// Browser yang dicoba berurutan (tidak ada yang diunduh): PENYUSUN_BROWSER (path executable),
// Microsoft Edge, Google Chrome, lalu Chromium bawaan sesi cloud (/opt/pw-browsers/chromium).
// Format skenario: templat/skenario-web.json; penjelasan tiap aksi: referensi/praktik-screenshot.md.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { muat } from "./_muat.mjs";

const LEBAR_MAKS = 1600; // importer mengecilkan gambar ke 1600px — tidak ada gunanya menyimpan lebih
const WARNA_SOROT = "#E5484D";

const args = process.argv.slice(2);
const lihat = args.includes("--lihat");
const fileSkenario = args.find((a) => !a.startsWith("--"));
if (!fileSkenario) {
  console.error("Pemakaian: node tangkap-web.mjs <skenario.json> [--lihat]");
  process.exit(2);
}

const { chromium } = await muat("playwright-core");
const sharp = (await muat("sharp")).default;

const pathSkenario = path.resolve(fileSkenario);
const dirSkenario = path.dirname(pathSkenario);
let skenario;
try {
  skenario = JSON.parse(await readFile(pathSkenario, "utf8"));
} catch (e) {
  console.error(`Skenario tidak bisa dibaca: ${e.message}`);
  process.exit(2);
}

const viewport = skenario.viewport ?? { width: 1280, height: 800 };
const outDir = path.resolve(dirSkenario, skenario.outDir ?? "../../images");
const rawDir = path.resolve(dirSkenario, skenario.rawDir ?? "../mentah");
const steps = skenario.steps ?? [];
const timeoutBawaan = skenario.timeout ?? 15000;

const AKSI = [
  "goto", "click", "dblclick", "fill", "type", "press", "hover", "select", "check", "upload",
  "waitFor", "wait", "scroll", "eval", "viewport", "highlight", "clearHighlight", "screenshot", "note",
];

// --- Browser -------------------------------------------------------------------------------------
const percobaan = [];
if (process.env.PENYUSUN_BROWSER) {
  percobaan.push({ label: `PENYUSUN_BROWSER (${process.env.PENYUSUN_BROWSER})`, opsi: { executablePath: process.env.PENYUSUN_BROWSER } });
}
const chromiumCloud = "/opt/pw-browsers/chromium";
if (process.platform === "linux" && existsSync(chromiumCloud)) {
  percobaan.push({ label: chromiumCloud, opsi: { executablePath: chromiumCloud } });
}
percobaan.push({ label: "Microsoft Edge", opsi: { channel: "msedge" } }, { label: "Google Chrome", opsi: { channel: "chrome" } });

let browser;
const gagalLuncur = [];
for (const { label, opsi } of percobaan) {
  try {
    browser = await chromium.launch({ headless: !lihat, slowMo: lihat ? 250 : 0, ...opsi });
    console.log(`Browser: ${label} ${browser.version()}`);
    break;
  } catch (e) {
    gagalLuncur.push(`${label}: ${e.message.split("\n")[0]}`);
  }
}
if (!browser) {
  console.error(
    "Tidak ada browser yang bisa dijalankan:\n  " +
      gagalLuncur.join("\n  ") +
      "\nPasang Microsoft Edge atau Google Chrome, atau isi PENYUSUN_BROWSER dengan path msedge.exe/chrome.exe."
  );
  process.exit(2);
}

const context = await browser.newContext({
  viewport,
  deviceScaleFactor: skenario.deviceScaleFactor ?? 1.25,
  colorScheme: skenario.colorScheme ?? "light",
  ...(skenario.locale && { locale: skenario.locale }),
  ...(skenario.timezoneId && { timezoneId: skenario.timezoneId }),
  ...(skenario.baseURL && { baseURL: skenario.baseURL }),
});
context.setDefaultTimeout(timeoutBawaan);
const page = await context.newPage();
page.on("dialog", (d) => {
  console.log(`  (dialog "${d.message()}" diterima otomatis)`);
  d.accept().catch(() => {});
});

let sorotan = null; // { selectors: string[], padding: number }

function loc(selector) {
  return page.locator(selector).first();
}

/** Kotak sorotan digambar ulang tepat sebelum screenshot, dari posisi elemen saat itu. */
async function gambarSorotan() {
  const kotak = [];
  if (sorotan) {
    for (const s of sorotan.selectors) {
      const box = await loc(s).boundingBox();
      if (!box) throw new Error(`Elemen untuk sorotan tidak terlihat: ${s}`);
      kotak.push(box);
    }
  }
  // Posisi absolut di koordinat dokumen (bukan fixed) supaya tetap sejajar juga pada screenshot
  // fullPage, yang merender halaman di luar viewport.
  await page.evaluate(
    ({ kotak, padding, warna }) => {
      document.getElementById("__sorotan_tutorin")?.remove();
      if (kotak.length === 0) return;
      const wadah = document.createElement("div");
      wadah.id = "__sorotan_tutorin";
      for (const b of kotak) {
        const el = document.createElement("div");
        el.style.cssText =
          `position:absolute;z-index:2147483647;pointer-events:none;box-sizing:border-box;` +
          `left:${b.x + window.scrollX - padding}px;top:${b.y + window.scrollY - padding}px;` +
          `width:${b.width + padding * 2}px;height:${b.height + padding * 2}px;` +
          `border:3px solid ${warna};border-radius:6px;box-shadow:0 0 0 2px rgba(255,255,255,.9);`;
        wadah.appendChild(el);
      }
      document.documentElement.appendChild(wadah);
    },
    { kotak, padding: sorotan?.padding ?? 6, warna: WARNA_SOROT }
  );
}

async function simpanGambar(buffer, keluar, { lossless = false } = {}) {
  let gambar = sharp(buffer);
  const { width } = await gambar.metadata();
  if (width > LEBAR_MAKS) gambar = gambar.resize({ width: LEBAR_MAKS });
  const ext = path.extname(keluar).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") gambar = gambar.jpeg({ quality: 85, mozjpeg: true });
  else if (ext === ".png") gambar = gambar.png(lossless ? { compressionLevel: 9 } : { palette: true, quality: 90, compressionLevel: 9, effort: 8 });
  else throw new Error(`Ekstensi screenshot harus .png atau .jpg: ${keluar}`);
  const hasil = await gambar.toBuffer({ resolveWithObject: true });
  await mkdir(path.dirname(keluar), { recursive: true });
  await writeFile(keluar, hasil.data);
  return hasil.info;
}

function urlDari(nilai) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(nilai)) return nilai;
  if (nilai.startsWith("/") && skenario.baseURL) return nilai; // diselesaikan baseURL context
  return pathToFileURL(path.resolve(dirSkenario, nilai)).href;
}

function ringkas(step, aksi) {
  const v = step[aksi];
  return typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v);
}

// --- Jalankan langkah ----------------------------------------------------------------------------
let langkahKe = 0;
try {
  for (const [i, step] of steps.entries()) {
    langkahKe = i + 1;
    const aksi = AKSI.find((a) => a in step);
    if (!aksi) throw new Error(`aksi tidak dikenal (${Object.keys(step).join(", ")}). Pilihan: ${AKSI.join(", ")}`);
    const timeout = step.timeout ?? timeoutBawaan;
    if (aksi !== "note") console.log(`[${langkahKe}/${steps.length}] ${aksi} ${ringkas(step, aksi)}`);

    switch (aksi) {
      case "goto":
        await page.goto(urlDari(step.goto), { waitUntil: step.waitUntil ?? "load", timeout });
        sorotan = null;
        break;
      case "click":
        await loc(step.click).click({ button: step.button ?? "left", timeout });
        break;
      case "dblclick":
        await loc(step.dblclick).dblclick({ timeout });
        break;
      case "fill":
        await loc(step.fill).fill(String(step.value ?? ""), { timeout });
        break;
      case "type":
        await loc(step.type).pressSequentially(String(step.text ?? ""), { delay: step.delay ?? 40, timeout });
        break;
      case "press":
        if (step.selector) await loc(step.selector).press(step.press, { timeout });
        else await page.keyboard.press(step.press);
        break;
      case "hover":
        await loc(step.hover).hover({ timeout });
        break;
      case "select":
        await loc(step.select).selectOption(step.value, { timeout });
        break;
      case "check":
        await loc(step.check).check({ timeout });
        break;
      case "upload":
        await loc(step.upload).setInputFiles((step.files ?? []).map((f) => path.resolve(dirSkenario, f)), { timeout });
        break;
      case "waitFor":
        await loc(step.waitFor).waitFor({ state: step.state ?? "visible", timeout });
        break;
      case "wait":
        await page.waitForTimeout(Number(step.wait));
        break;
      case "scroll":
        if (typeof step.scroll === "string") await loc(step.scroll).scrollIntoViewIfNeeded({ timeout });
        else await page.evaluate(({ x, y }) => window.scrollBy(x ?? 0, y ?? 0), step.scroll);
        break;
      case "eval": {
        // Nilai kembalian dicetak supaya bisa dipakai memverifikasi keadaan halaman.
        const nilai = await page.evaluate(step.eval);
        if (nilai !== undefined) console.log(`  = ${JSON.stringify(nilai)}`);
        break;
      }
      case "viewport":
        await page.setViewportSize(step.viewport);
        break;
      case "highlight":
        sorotan = {
          selectors: Array.isArray(step.highlight) ? step.highlight : [step.highlight],
          padding: step.padding ?? 6,
        };
        break;
      case "clearHighlight":
        sorotan = null;
        await gambarSorotan();
        break;
      case "screenshot": {
        let clip;
        let fullPage = Boolean(step.fullPage);
        if (step.element) {
          // Elemen ditaruh di tengah layar supaya padding di atas/bawahnya ikut tertangkap.
          await loc(step.element).evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
          const box = await loc(step.element).boundingBox();
          if (!box) throw new Error(`Elemen untuk screenshot tidak terlihat: ${step.element}`);
          const pad = step.padding ?? 24;
          const vp = page.viewportSize();
          const area = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
          if (area.x >= 0 && area.y >= 0 && area.x + area.width <= vp.width && area.y + area.height <= vp.height) {
            clip = area; // koordinat viewport
          } else {
            // Lebih besar dari layar: tangkap dari halaman penuh dengan koordinat dokumen.
            const gulir = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
            const x = Math.max(0, area.x + gulir.x);
            const y = Math.max(0, area.y + gulir.y);
            clip = { x, y, width: area.width - (x - (area.x + gulir.x)), height: area.height - (y - (area.y + gulir.y)) };
            fullPage = true;
          }
        } else if (step.clip) {
          clip = step.clip;
        }
        await gambarSorotan();
        const buffer = await page.screenshot({
          clip,
          fullPage,
          // mask tingkat skenario (data pribadi yang muncul di semua halaman) + mask per langkah
          mask: [...(skenario.mask ?? []), ...(step.mask ?? [])].map((s) => page.locator(s)),
          maskColor: "#5B6573",
          animations: "disabled",
        });
        const keluar = path.resolve(step.raw ? rawDir : outDir, step.screenshot);
        const info = await simpanGambar(buffer, keluar, { lossless: step.lossless });
        console.log(`  -> ${path.relative(process.cwd(), keluar)} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB)`);
        break;
      }
      case "note":
        break;
    }
  }
  console.log(`Selesai: ${steps.length} langkah.`);
} catch (e) {
  const debug = path.join(rawDir, `gagal-langkah-${langkahKe}.png`);
  try {
    await mkdir(rawDir, { recursive: true });
    await writeFile(debug, await page.screenshot());
  } catch {
    // halaman mungkin sudah tertutup — pesan error di bawah tetap yang utama
  }
  console.error(`\nGAGAL di langkah ${langkahKe}: ${JSON.stringify(steps[langkahKe - 1])}`);
  console.error(e.message.split("\n").slice(0, 6).join("\n"));
  console.error(`Screenshot keadaan halaman saat gagal: ${path.relative(process.cwd(), debug)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
