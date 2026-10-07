// Pemuat dependensi npm untuk skrip skill penyusun-ebook-tutorin (bukan untuk dijalankan langsung).
//
// Paket dicari Node mulai dari folder skrip ini ke atas: node_modules di folder skill (hasil
// `npm install --prefix <folder-skill>`), atau node_modules root bila skill berada di repo Tutorin.

import path from "node:path";
import { fileURLToPath } from "node:url";

export const DIR_SKILL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const PERINTAH_PASANG = `npm install --prefix "${DIR_SKILL}"`;

export async function muat(nama) {
  try {
    return await import(nama);
  } catch (e) {
    if (e?.code === "ERR_MODULE_NOT_FOUND") {
      console.error(
        `Paket "${nama}" belum terpasang. Jalankan sekali (butuh Node.js 20.9+):\n  ${PERINTAH_PASANG}\n` +
          "Di repo Tutorin cukup `npm install` di root repo."
      );
      process.exit(2);
    }
    throw e;
  }
}
