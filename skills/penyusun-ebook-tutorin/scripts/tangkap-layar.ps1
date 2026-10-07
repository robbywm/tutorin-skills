<#
.SYNOPSIS
  Menyimpan screenshot jendela aplikasi, area layar, atau layar penuh ke PNG (Windows).

.DESCRIPTION
  Bagian dari skill penyusun-ebook-tutorin. Computer use di Claude Desktop bisa melihat dan
  mengklik layar, tetapi tidak menyimpan screenshot ke disk - skrip ini yang menyimpannya, per
  jendela, dengan ukuran piksel asli (DPI-aware, tanpa border transparan Windows 10/11).
  Kompatibel dengan Windows PowerShell 5.1 dan PowerShell 7. Mengeluarkan JSON di stdout.

  File ini sengaja hanya berisi karakter ASCII: Windows PowerShell 5.1 membaca .ps1 tanpa BOM
  sebagai ANSI, sehingga karakter seperti tanda pisah panjang bisa berubah menjadi tanda kutip
  dan merusak string.

.NOTES
  Panggil file ini dengan PATH ABSOLUT (folder skill penyusun-ebook-tutorin bisa berada di repo
  Tutorin, di %USERPROFILE%\.claude\skills, atau di folder plugin Claude Code). Perintah uji
  dengan path absolut siap salin dicetak oleh `node <folder-skill>/scripts/cek-lingkungan.mjs`.
  Path -Keluar yang relatif dihitung dari folder aktif, yaitu folder kerja tempat konten\ebook
  berada; jendela PowerShell baru dibuka di folder pengguna, jadi cd dulu ke folder kerja.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File "C:\path\ke\penyusun-ebook-tutorin\scripts\tangkap-layar.ps1" -UjiCoba
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File "C:\path\ke\penyusun-ebook-tutorin\scripts\tangkap-layar.ps1" -DaftarJendela
.EXAMPLE
  cd C:\folder-kerja
  powershell -NoProfile -ExecutionPolicy Bypass -File "C:\path\ke\penyusun-ebook-tutorin\scripts\tangkap-layar.ps1" -Judul "Arduino IDE" -Keluar konten\ebook\iot-esp32-dasar\_kerja\mentah\02-01.png
#>
[CmdletBinding()]
param(
  [string]$Judul,          # potongan judul jendela, tidak peka huruf besar/kecil
  [string]$Proses,         # nama proses tanpa .exe, boleh wildcard, mis. "arduino*" atau "Code"
  [string]$Area,           # "x,y,lebar,tinggi" dalam piksel layar fisik
  [switch]$LayarPenuh,     # seluruh monitor utama
  [switch]$Aktif,          # jendela yang sedang di depan (hati-hati: bisa terminal sendiri)
  [string]$Keluar,         # path file .png
  [int]$Jeda = 400,        # ms menunggu setelah jendela dibawa ke depan (animasi selesai)
  [switch]$TanpaFokus,     # jangan bawa jendela ke depan
  [switch]$DaftarJendela,  # cetak daftar jendela yang terlihat (judul, proses, posisi, ukuran)
  [switch]$UjiCoba         # tes cepat: tangkap monitor utama ke %TEMP% dan laporkan skala DPI
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Gagal([string]$pesan, [int]$kode) {
  [Console]::Error.WriteLine($pesan)
  exit $kode
}

if ($env:OS -ne 'Windows_NT') { Gagal 'tangkap-layar.ps1 hanya untuk Windows.' 2 }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class TutorinWin32 {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left, Top, Right, Bottom; }

  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int max);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool altTab);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hWnd);
  [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")] public static extern int DwmGetRect(IntPtr hWnd, int attr, out RECT rect, int size);
  [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")] public static extern int DwmGetInt(IntPtr hWnd, int attr, out int value, int size);
}
'@

# Harus sebelum memuat WinForms/Drawing: tanpa ini, di layar berskala 125%/150% koordinat dan
# ukuran jendela "divirtualkan" sehingga screenshot terpotong atau buram.
$dpiAware = $false
try { $dpiAware = [TutorinWin32]::SetProcessDpiAwarenessContext([IntPtr](-4)) } catch { }  # PER_MONITOR_AWARE_V2
if (-not $dpiAware) { try { $dpiAware = [TutorinWin32]::SetProcessDPIAware() } catch { } }

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

function Get-DaftarJendela {
  $hasil = New-Object System.Collections.Generic.List[object]
  $callback = [TutorinWin32+EnumWindowsProc] {
    param([IntPtr]$h, [IntPtr]$l)
    if ([TutorinWin32]::IsWindowVisible($h)) {
      $panjang = [TutorinWin32]::GetWindowTextLength($h)
      $cloaked = 0
      [void][TutorinWin32]::DwmGetInt($h, 14, [ref]$cloaked, 4)  # DWMWA_CLOAKED: jendela UWP tersembunyi
      if ($panjang -gt 0 -and $cloaked -eq 0) {
        $sb = New-Object System.Text.StringBuilder ($panjang + 1)
        [void][TutorinWin32]::GetWindowText($h, $sb, $sb.Capacity)
        $procId = [uint32]0
        [void][TutorinWin32]::GetWindowThreadProcessId($h, [ref]$procId)
        $namaProses = ''
        try { $namaProses = (Get-Process -Id $procId).ProcessName } catch { }
        $hasil.Add([pscustomobject]@{ Handle = $h; Judul = $sb.ToString(); Proses = $namaProses })
      }
    }
    return $true
  }
  [void][TutorinWin32]::EnumWindows($callback, [IntPtr]::Zero)
  return , $hasil
}

function Get-Batas([IntPtr]$h) {
  $r = New-Object TutorinWin32+RECT
  # DWMWA_EXTENDED_FRAME_BOUNDS = batas yang terlihat, tanpa border transparan untuk resize.
  if ([TutorinWin32]::DwmGetRect($h, 9, [ref]$r, [System.Runtime.InteropServices.Marshal]::SizeOf($r)) -ne 0) {
    [void][TutorinWin32]::GetWindowRect($h, [ref]$r)
  }
  return $r
}

function Get-SkalaDpi([IntPtr]$h) {
  try {
    if ($h -ne [IntPtr]::Zero) { return [Math]::Round([TutorinWin32]::GetDpiForWindow($h) / 96.0, 2) }
  } catch { }
  $g = [System.Drawing.Graphics]::FromHwnd([IntPtr]::Zero)
  try { return [Math]::Round($g.DpiX / 96.0, 2) } finally { $g.Dispose() }
}

function Get-PathPenuh([string]$p) {
  if (-not [System.IO.Path]::IsPathRooted($p)) { $p = Join-Path (Get-Location).ProviderPath $p }
  return [System.IO.Path]::GetFullPath($p)
}

function Save-Area([int]$x, [int]$y, [int]$w, [int]$h, [string]$berkas) {
  $layar = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $kanan = [Math]::Min($x + $w, $layar.Right)
  $bawah = [Math]::Min($y + $h, $layar.Bottom)
  $x = [Math]::Max($x, $layar.Left)
  $y = [Math]::Max($y, $layar.Top)
  $w = $kanan - $x
  $h = $bawah - $y
  if ($w -le 0 -or $h -le 0) { Gagal 'Area yang diminta berada di luar layar.' 1 }

  $folder = Split-Path -Parent $berkas
  if ($folder -and -not (Test-Path -LiteralPath $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }

  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $g.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size $w, $h))
    $bmp.Save($berkas, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $g.Dispose()
    $bmp.Dispose()
  }
  return [ordered]@{ x = $x; y = $y; lebar = $w; tinggi = $h }
}

if ($UjiCoba) {
  $berkas = Join-Path $env:TEMP 'uji-tangkap-layar.png'
  $utama = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $hasil = Save-Area $utama.X $utama.Y $utama.Width $utama.Height $berkas
  [ordered]@{
    ok          = $true
    berkas      = $berkas
    monitorUtama = "$($utama.Width)x$($utama.Height)"
    skalaDpi    = (Get-SkalaDpi ([IntPtr]::Zero))
    dpiAware    = $dpiAware
    powershell  = $PSVersionTable.PSVersion.ToString()
    jumlahJendela = (Get-DaftarJendela).Count
  } | ConvertTo-Json -Compress
  exit 0
}

if ($DaftarJendela) {
  $daftar = foreach ($j in (Get-DaftarJendela)) {
    $b = Get-Batas $j.Handle
    [ordered]@{ judul = $j.Judul; proses = $j.Proses; x = $b.Left; y = $b.Top; lebar = $b.Right - $b.Left; tinggi = $b.Bottom - $b.Top }
  }
  ConvertTo-Json -InputObject @($daftar) -Compress
  exit 0
}

if (-not $Keluar) { Gagal '-Keluar wajib diisi, mis. -Keluar konten/ebook/<slug>/_kerja/mentah/02-01.png' 2 }
if ([System.IO.Path]::GetExtension($Keluar).ToLower() -ne '.png') { Gagal '-Keluar harus berakhiran .png' 2 }
$berkas = Get-PathPenuh $Keluar

$jendela = $null
if ($Judul) {
  $cocok = @((Get-DaftarJendela) | Where-Object { $_.Judul.ToLower().Contains($Judul.ToLower()) })
  if ($cocok.Count -eq 0) { Gagal "Tidak ada jendela yang judulnya mengandung '$Judul'. Lihat daftarnya dengan -DaftarJendela." 1 }
  $jendela = $cocok[0]
} elseif ($Proses) {
  $cocok = @((Get-DaftarJendela) | Where-Object { $_.Proses -like $Proses })
  if ($cocok.Count -eq 0) { Gagal "Tidak ada jendela milik proses '$Proses'. Lihat daftarnya dengan -DaftarJendela." 1 }
  $jendela = $cocok[0]
} elseif ($Aktif) {
  $h = [TutorinWin32]::GetForegroundWindow()
  $jendela = [pscustomobject]@{ Handle = $h; Judul = ''; Proses = '' }
}

if ($jendela) {
  $h = $jendela.Handle
  if (-not $TanpaFokus) {
    if ([TutorinWin32]::IsIconic($h)) { [void][TutorinWin32]::ShowWindow($h, 9) }  # SW_RESTORE
    if (-not [TutorinWin32]::SetForegroundWindow($h)) { [TutorinWin32]::SwitchToThisWindow($h, $true) }
  }
  Start-Sleep -Milliseconds $Jeda
  $b = Get-Batas $h
  $hasil = Save-Area $b.Left $b.Top ($b.Right - $b.Left) ($b.Bottom - $b.Top) $berkas
  $hasil['judul'] = $jendela.Judul
  $hasil['proses'] = $jendela.Proses
  $hasil['skalaDpi'] = Get-SkalaDpi $h
} elseif ($Area) {
  $angka = @($Area -split ',' | ForEach-Object { [int]$_.Trim() })
  if ($angka.Count -ne 4) { Gagal '-Area harus "x,y,lebar,tinggi"' 2 }
  Start-Sleep -Milliseconds $Jeda
  $hasil = Save-Area $angka[0] $angka[1] $angka[2] $angka[3] $berkas
  $hasil['skalaDpi'] = Get-SkalaDpi ([IntPtr]::Zero)
} elseif ($LayarPenuh) {
  Start-Sleep -Milliseconds $Jeda
  $utama = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $hasil = Save-Area $utama.X $utama.Y $utama.Width $utama.Height $berkas
  $hasil['skalaDpi'] = Get-SkalaDpi ([IntPtr]::Zero)
} else {
  Gagal 'Pilih salah satu: -Judul, -Proses, -Area, -LayarPenuh, -Aktif, -DaftarJendela, atau -UjiCoba.' 2
}

$hasil['berkas'] = $berkas
$hasil | ConvertTo-Json -Compress
