# Catatan admin — <Judul ebook> (`<slug>`)

Disusun dengan skill penyusun-ebook-tutorin pada <tanggal>. Paket: `konten/ebook/<slug>/dist/<slug>.zip`.

## Langkah setelah ZIP jadi

1. Buka **/admin/impor** di tutorin.startbyte.id, unggah ZIP, dan baca semua peringatan.
2. Selesaikan setiap CEK di bawah, lalu hapus penandanya di editor bab.
3. Ganti foto atau screenshot yang diminta di bawah (unggah ulang ZIP setelah file ditambahkan ke
   `images/`).
4. Tempel kuis di halaman edit setiap bab.
5. Pratinjau semua bab, lalu **Terbitkan** (ebook jual) atau beri akses (modul les).

## Penanda CEK

| Bab | Baris | Yang perlu dicek | Cara mengecek |
| --- | --- | --- | --- |
| 02-nama-bab.md | 45 | … | … |

## Foto atau screenshot dari penulis

| File | Yang harus terlihat | Catatan |
| --- | --- | --- |
| images/02-04-rangkaian-led.jpg | ESP32 di breadboard, kaki panjang LED ke GPIO2 lewat resistor | Diambil dari atas, cahaya terang, tanpa wajah |

## Kuis per bab

Tempel ke kolom JSON kuis di halaman edit bab. `jawaban_index` dimulai dari 0.

### Bab 1: <judul bab>

Nilai lulus: 70

```json
[
  { "teks": "Pertanyaan yang menguji pemahaman praktik?", "pilihan": ["Jawaban benar", "Pengecoh 1", "Pengecoh 2"], "jawaban_index": 0 }
]
```

## Perubahan dibanding materi asli

| Bagian | Materi asli | Di ebook | Alasan dan sumber |
| --- | --- | --- | --- |
| … | … | … | … |

## Lingkungan uji

- OS: …
- Software dan versi: …
- Perangkat keras: … (atau "tidak tersedia — disimulasikan di Wokwi")
- Tanggal praktik: …

## Sumber riset

- [Judul halaman](https://…) — diakses <tanggal>
