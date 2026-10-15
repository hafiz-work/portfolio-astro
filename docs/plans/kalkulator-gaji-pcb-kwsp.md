# Pelan: Kalkulator Gaji - PCB dan KWSP (`/kalkulator-gaji`)

Status: **pelan** (2026-10-11), disemak semula 2026-10-14 - lihat §7 (susunan binaan terkini). Belum dibina.

Matlamat: pekerja masukkan gaji dan status diri, dapat **caruman KWSP** (pekerja + majikan),
**PCB** (potongan cukai bulanan) dan anggaran gaji bersih, dikira **mengikut formula rasmi**
- bukan anggaran sendiri. Setiap angka mesti boleh dikesan ke dokumen rasmi.

Kenapa dulu "tidak dicadangkan": peraturan berubah setiap tahun (Belanjawan). Pelan ini
menangani itu dengan data mengikut tahun, check script daripada contoh rasmi, dan label tahun
spesifikasi yang jelas di halaman.

---

## 1. Sumber rasmi

| Perkara | Dokumen | Status semakan |
|---|---|---|
| Formula PCB | LHDN, *Specification for MTD Calculations Using Computerized Calculation for 2026* (dikemas kini 01/01/2026) - [PDF](https://www.hasil.gov.my/wp-content/uploads/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2026.pdf), disenaraikan di [Jadual PCB dan Spesifikasi Data](https://www.hasil.gov.my/en/majikan/jadual-pcb-dan-spesifikasi-data/) | ✅ dibaca (52 halaman) |
| Dasar undang-undang PCB | Kaedah 3, Kaedah-Kaedah Cukai Pendapatan (Potongan daripada Saraan) 1994 | dirujuk dalam spesifikasi |
| Contoh pengiraan PCB (dengan jawapan) | Exhibit 5 dalam spesifikasi di atas (Kategori 3, 3 anak, RM5,500 + bonus April) | ✅ ada - jadi ujian |
| Semakan silang PCB | Kalkulator PCB rasmi LHDN - [calcpcbplus.hasil.gov.my](https://calcpcbplus.hasil.gov.my/HITS_CE/MainScreen) | untuk semakan manual |
| Soalan ujian MTD 2026 | [mtd-testing-question-2026.pdf](https://www.hasil.gov.my/wp-content/uploads/mtd-testing-question-2026.pdf) | ✅ dibaca - **tiada jawapan**, tak boleh jadi ujian |
| Kadar KWSP | KWSP, *Jadual Ketiga* (Third Schedule, Akta KWSP 1991) berkuat kuasa gaji **Oktober 2025** - muat turun manual oleh pemilik (kwsp.gov.my menyekat akses automatik), disimpan di `docs/sources/kwsp/third-schedule-2025-10-01.pdf` (sha256 `c4904e44…58b1`) | ✅ dibaca (55 halaman) dan diekstrak |
| Ringkasan kadar KWSP | KWSP, [Employer Mandatory Contribution](https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution) - tangkapan skrin 11/10/2026 di `docs/sources/kwsp/kwsp-mandatory-contribution-2026-10-11-*.png` | ✅ sepadan dengan PDF |

---

## 2. KWSP (dibina dahulu - PCB memerlukannya)

**Kategori (input dinamik):**

| Pekerja | Umur | Bahagian Jadual Ketiga | Pekerja | Majikan |
|---|---|---|---|---|
| Warganegara, PR, bukan warganegara berdaftar sebelum 1 Ogos 1998 | < 60 | Bahagian A | 11% | 13% (gaji ≤ RM5,000) / 12% (> RM5,000) |
| Warganegara | ≥ 60 | Bahagian E | 0% | 4% |
| PR / bukan warganegara berdaftar sebelum 1 Ogos 1998 | ≥ 60 | Bahagian C | 5.5% | 6.5% (gaji ≤ RM5,000) / 6% (> RM5,000) |
| Bukan warganegara (berdaftar dari 1 Ogos 1998; wajib mulai gaji Oktober 2025) | semua | Bahagian F | 2% | 2% |

✅ Disahkan dengan PDF dan laman KWSP. Bahagian B dan D telah dipadam (Akta A1760/2025).

**Cara kira (✅ dari PDF):**
- Gaji sehingga RM20,000: amaun RM diambil daripada **jadual julat gaji** - majikan **tidak
  dibenarkan** mengira dengan peratus tepat. Julat RM20 sehingga RM5,000, julat RM100 dari
  RM5,000 hingga RM20,000; RM10.00 ke bawah = tiada caruman.
- Gaji melebihi RM20,000: peratus × gaji; jumlah caruman bersen dibundarkan ke ringgit seterusnya.
- Nota Bahagian A: jika bonus menyebabkan gaji bulan itu melebihi RM5,000 bagi pekerja bergaji
  RM5,000 ke bawah, caruman majikan dikira 13% (bukan 12%).
- Bahagian F: 2% + 2% atas gaji, jumlah dibundarkan ke ringgit seterusnya. ⚠️ PDF tidak menyatakan
  bagaimana pembundaran dibahagi antara majikan dan pekerja - **tanya KWSP atau semak kalkulator
  KWSP** sebelum memaparkan pecahan; v1 paparkan jumlah sahaja jika tidak jelas.

**Data (✅ siap):** `scripts/kwsp/third-schedule.py` (perlukan `pypdf`) mengekstrak Bahagian A,
C dan E ke `src/data/kwsp/2025-10.ts` - 401 julat setiap bahagian; skrip menolak untuk menulis
jika majikan + pekerja ≠ jumlah pada mana-mana baris, julat tidak berterusan, atau SHA-256 PDF
berubah.

**Pelaksanaan:**
1. ✅ PDF Jadual Ketiga dalam `docs/sources/kwsp/`.
2. ✅ `src/data/kwsp/2025-10.ts` dijana (lihat di atas).
3. `src/lib/kwsp.ts`: `caruman({ gaji, kategori, umur60 })` → `{ pekerja, majikan, bahagian }`.
4. Check `scripts/check-kwsp.ts`: baris pertama, terakhir dan sempadan (RM5,000 / RM5,000.01,
   RM20,000 / RM20,000.01) setiap bahagian, terus dari PDF.
5. v2: kadar sukarela lebih tinggi untuk pekerja (pilihan pekerja) - semak syaratnya dahulu.

---

## 3. PCB (Potongan Cukai Bulanan)

**Formula rasmi (saraan biasa, pemastautin):**

```
PCB bulan semasa = [ (P − M) × R + B − (Z + X) ] / (n + 1)
PCB bersih       = PCB bulan semasa − zakat bulan semasa

P = [Σ(Y − K) + (Y1 − K1) + (Y2 − K2) × n + (Yt − Kt)] − [D + S + DU + SU + Q×C + (ΣLP + LP1)]
K2 = min( (4,000 − (K + K1 + Kt)) / n , K1 )      ; jumlah KWSP untuk PCB ≤ RM4,000 setahun
```

**Jadual 1 (2026)** - M, R, B ikut P; B berbeza bagi kategori 2 (rebat pasangan):

| P (RM) | M | R | B Kat. 1 & 3 | B Kat. 2 |
|---|---|---|---|---|
| 5,001 - 20,000 | 5,000 | 1% | −400 | −800 |
| 20,001 - 35,000 | 20,000 | 3% | −250 | −650 |
| 35,001 - 50,000 | 35,000 | 6% | 600 | 600 |
| 50,001 - 70,000 | 50,000 | 11% | 1,500 | 1,500 |
| 70,001 - 100,000 | 70,000 | 19% | 3,700 | 3,700 |
| 100,001 - 400,000 | 100,000 | 25% | 9,400 | 9,400 |
| 400,001 - 600,000 | 400,000 | 26% | 84,400 | 84,400 |
| 600,001 - 2,000,000 | 600,000 | 28% | 136,400 | 136,400 |
| > 2,000,000 | 2,000,000 | 30% | 528,400 | 528,400 |

**Kategori (input dinamik):**
- **Kategori 1** - bujang: D sahaja, S = 0, anak = 0 (medan anak disembunyikan).
- **Kategori 2** - berkahwin, pasangan tidak bekerja: D + S (RM4,000), anak dikira.
- **Kategori 3** - berkahwin dan pasangan bekerja, bercerai/balu, atau bujang dengan anak angkat:
  D, S = 0, anak dikira.
- **Bukan pemastautin:** 30% rata atas saraan (tiada pelepasan).

**Pelepasan (2026):** D individu RM9,000 · S pasangan RM4,000 · DU OKU diri RM7,000 · SU pasangan
OKU RM6,000 · Q RM2,000 setiap anak. Jenis anak dikira sebagai bilangan anak: anak ≥ 18 belajar
diploma ke atas di Malaysia (atau ijazah di luar negara) = 4; anak OKU = 4; anak OKU belajar
diploma ke atas = 8. KWSP untuk PCB dihadkan RM4,000 setahun.

**Peraturan pembundaran (Terma 1-4):** kira hingga 2 titik perpuluhan dan buang selebihnya
(potong, bukan bundar); bundarkan **naik** ke 5 sen terdekat; PCB < RM10 tidak dipotong, tetapi
PCB bersih selepas zakat < RM10 tetap dipotong.

**Skop v1:** pemastautin, saraan biasa sahaja, gaji sama sepanjang tahun (Y2 = Y1), kategori
1/2/3, anak mengikut jenis, OKU diri/pasangan, zakat bulanan, potongan TP1 sebagai satu amaun
tahunan (LP). Bukan pemastautin = 30%.
**v2:** bonus / saraan tambahan (formula 5 langkah), mula kerja pertengahan tahun (data TP3:
Σ(Y−K), X, Z), manfaat berupa barangan (BIK/VOLA).
**Tidak dibuat:** REP, pekerja berpengetahuan di wilayah tertentu, C-Suite (formula khas, terlalu khusus).

**Pelaksanaan:**
1. `src/data/pcb/2026.ts` - Jadual 1, nilai pelepasan, had KWSP, kadar bukan pemastautin, tahun
   dan pautan spesifikasi. Satu fail setiap tahun.
2. `src/lib/pcb.ts` - fungsi tulen `pcbBulanan(input, tahun)` yang mengikut formula dan terma di
   atas, dengan langkah perantaraan (P, M, R, B, K2) dipulangkan untuk dipaparkan.
3. `scripts/check-pcb.ts` - Exhibit 5 (Kategori 3, 3 anak, RM5,500, KWSP RM605 → K2 RM308.63,
   P RM47,000.07, …) mesti sepadan setiap langkah; ditambah 10-15 kes yang disemak secara manual
   dengan kalkulator rasmi LHDN (nilai dan tarikh semakan direkod dalam fail ujian).

**Perubahan tahunan:** Belanjawan 2027 (9 Okt 2026) mencadangkan pelepasan individu naik daripada
RM9,000 ke RM12,000 dan kadar 19%/25% diturunkan bagi YA2027. **Jangan laksanakan sebelum LHDN
menerbitkan spesifikasi PCB 2027** (biasanya Disember-Januari); kemudian tambah `src/data/pcb/2027.ts`,
jalankan semula check dengan Exhibit 5 yang baharu. Halaman sentiasa menyatakan "Mengikut
spesifikasi PCB {tahun} LHDN".

---

## 4. Halaman `/kalkulator-gaji`

- **Input:** gaji bulanan; status (warganegara / PR / bukan warganegara + berdaftar sebelum
  1 Ogos 1998); umur 60 ke atas; pemastautin cukai; taraf perkahwinan → kategori; pasangan bekerja;
  anak mengikut jenis (bawah 18, 18+ belajar, OKU, OKU belajar); OKU diri / pasangan; zakat bulanan;
  potongan TP1 tahunan (pilihan).
- **Dinamik:** medan muncul ikut kategori (bujang → tiada anak/pasangan; bukan pemastautin →
  tiada pelepasan; bukan warganegara → KWSP Bahagian F).
- **Output:** KWSP pekerja, KWSP majikan, PCB, zakat, gaji bersih (sebelum PERKESO/SIP - dilabel
  jelas), dan "Cara dikira" yang boleh dibuka (P, M, R, B, K2, bahagian Jadual Ketiga) dengan
  pautan ke dokumen rasmi.
- Pengiraan dalam pelayar (tiada data gaji dihantar ke pelayan) - nyatakan di halaman.
- `Disclaimer` dengan nota: bukan nasihat cukai; potongan sebenar ikut sistem gaji majikan;
  rujuk LHDN/KWSP; pautan kalkulator rasmi LHDN.

## 5. Selepas v1

- PERKESO (Akta 4) dan SIP (Akta 800) untuk gaji bersih sebenar - perlukan jadual rasmi PERKESO.
- Kalkulator Zakat (#6 dalam IDEA.md) boleh guna semula input pendapatan.

## 6. Tindakan pemilik sebelum mula

1. ✅ PDF Jadual Ketiga KWSP - siap (11/10/2026).
2. Sediakan 10-15 kes ujian dengan kalkulator rasmi LHDN (gaji berbeza × kategori × anak),
   rekod input dan jawapan PCB.
3. Sahkan pembundaran Bahagian F (bukan warganegara) - siapa yang menanggung sen yang dibundarkan.

## 7. Semakan 2026-10-14 dan pelan semula

**Disahkan:**
- SHA-256 PDF Jadual Ketiga = `c4904e44…58b1` (sama dengan skrip).
- `src/data/kwsp/2025-10.ts`: Bahagian A/C/E, 401 julat setiap satu. Sempadan betul: RM10 = tiada;
  A RM5,000 → 650/550 (13%/11%), RM5,000.01 → 612/561 (12%/11%); C RM5,000 → 325/275; E → 4%/0;
  A RM5,500 → pekerja RM605 (sama dengan Exhibit 5).
- Jadual 1: setiap B konsisten dengan cukai terkumpul pada M (−400/−800 = rebat RM400/RM800).
- Exhibit 5, bulan biasa: K2 = (4,000 − 605) / 11 = 308.63 (dipotong), P = 4,895 + 5,191.37 × 11 −
  (9,000 + 3 × 2,000) = 47,000.07 ✓.

**Tidak disahkan:** kandungan PDF spesifikasi PCB 2026 (tiada dalam repo - simpan di
`docs/sources/pcb/` seperti KWSP); dakwaan Belanjawan 2027 dalam §3.

**Masalah dalam pelan asal:**
1. **Bulan tiada dalam input.** PCB bergantung pada bulan (n, Σ(Y−K), X, had KWSP RM4,000 yang
   habis pertengahan tahun). Penyelesaian: input `bulan` (lalai bulan semasa); untuk gaji tetap,
   ulang Jan → bulan itu dan kumpul Σ(Y−K), K dan X sendiri (≤ 12 pusingan, tepat untuk v1).
2. ✅ Skrip KWSP kini menolak julat yang tidak bersambung (dibaiki 2026-10-14; data dijana semula, tiada beza).
3. Exhibit 5 ialah contoh bonus (v2); untuk v1 hanya langkah bulan biasa boleh diuji. Kes LHDN
   (§6.2) masih belum ada - **ini penghalang** sebelum PCB boleh dipaparkan.

**Laluan:** `/kalkulator-gaji` di top level, sama seperti app Showcase lain (folder dalam
`pages` hanya untuk sub-halaman app). Diputuskan 2026-10-14.

**Dipotong daripada v1:** potongan TP1 (LP), pecahan Bahagian F (paparkan jumlah sahaja),
caruman sukarela. Kekal: kategori 1/2/3, anak mengikut jenis, OKU diri/pasangan, zakat,
bukan pemastautin 30% (semuanya hanya menambah D atau satu baris).

**Susunan binaan:**
1. ✅ `src/lib/kwsp.ts` + `scripts/check-kwsp.ts` (2026-10-14). Atas RM20,000 dan Bahagian F, setiap
   bahagian dibundarkan naik ke ringgit - check membuktikan semua 1,203 julat jadual mengikut peraturan
   itu; masih perlu disahkan dengan KWSP untuk Bahagian F (§6.3).
2. ✅ Halaman `/kalkulator-gaji` dengan KWSP sahaja + `Disclaimer` (2026-10-14). Bahagian F: jumlah
   sahaja = 4% dibundarkan naik sekali (`jumlah` dalam `caruman`).
3. ✅ PDF spesifikasi PCB 2026 di `docs/sources/pcb/spesifikasi-pcb-2026.pdf` (sha256 `a1618051…800c`).
   **Masih perlu:** kes LHDN (§6.2).
4. ✅ `src/data/pcb/2026.ts` + `src/lib/pcb.ts` + `scripts/check-pcb.ts` (2026-10-14): Exhibit 5 Jan + Feb
   (Mac/Apr guna TP1 dan bonus - v2), bukan pemastautin, terma pembundaran, jadual zakat. Belum diuji:
   kategori 1/2, anak ikut jenis, OKU, zakat dalam formula penuh. Tafsiran sendiri (bukan dari spesifikasi):
   bukan pemastautin juga dibundarkan ke 5 sen; X = PCB bersih yang dipotong. **Tambah PCB ke halaman
   hanya selepas kes LHDN lulus dalam check.**
5. Spesifikasi PCB 2027 (Dis-Jan): tambah `src/data/pcb/2027.ts`, jalankan semula check.
