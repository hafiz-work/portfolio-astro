# Open API Kerajaan Malaysia — rujukan

Semakan terakhir: **20 Oktober 2026** (§1A, §4 BNM, §7: **21 Oktober 2026**). Semua endpoint di bawah diuji pada tarikh itu
(kecuali yang ditanda "tidak diuji"). Harga, kiraan dan had kadar boleh berubah.

**Disahkan semula 21 Oktober 2026** (bahagian masjid/surau): kiraan SISMIM (25,792 /
6,924 masjid), endpoint `daerah`/`jenis`/senarai/eksport/butiran, `robots.txt`, tiada CORS,
pautan arkib (200) dan lesennya (CC BY), README kedua-dua dataset GitHub. Data.gov.my
semasa masih tiada dataset masjid (`?id=masjid` → 404). Kiraan OSM **tidak disahkan semula**.
Penemuan baharu ditanda **(21 Okt)**.

Ringkasan pantas:

- **API rasmi yang didokumenkan:** data.gov.my (`https://api.data.gov.my`), tanpa kunci,
  had 4 permintaan/minit, CORS `*`.
- **Masjid/surau:** tiada API rasmi yang didokumenkan. Portal SISMIM JAKIM mempunyai
  endpoint dalaman yang boleh digunakan (JSON untuk daerah/jenis, HTML untuk senarai dan
  eksport), tetapi ia bukan kontrak awam dan tiada lesen terbuka. Arkib data.gov.my ada
  CSV/XLSX JAKIM berlesen **CC BY**, tetapi snapshot 2020–2021.
- **Kalau perlu senarai masjid + koordinat:** minta data semasa melalui
  `data.gov.my/data-request`; sementara menunggu, guna arkib CC BY. Jika perlu segera,
  guna eksport SISMIM dan minta kebenaran untuk edaran semula pukal/komersial. Dataset
  betaqwa (40,078 rekod bergeokod) berguna untuk prototaip, tetapi lesennya tidak standard.

---

## 1. data.gov.my — API rasmi kerajaan

Dokumentasi: <https://developer.data.gov.my>

### Asas

| Perkara | Nilai |
|---|---|
| Base URL | `https://api.data.gov.my` |
| Auth | Tiada kunci API |
| Had kadar | 4 permintaan/minit setiap API; lebih → `429 Too Many Requests` |
| CORS | `Access-Control-Allow-Origin: *` (boleh dipanggil dari pelayar) |
| Format | JSON; senarai rekod secara lalai |
| Metadata | Tambah `?meta=true` → `{ "meta": {...}, "data": [...] }` |
| Ralat | `{ "status": <int>, "errors": [...] }` |

Nota redirect: `https://api.data.gov.my/data-catalogue?id=...` membalas **301** ke
`/data-catalogue/?id=...`. Guna slash di hujung atau ikut redirect (`curl -L`).

### Parameter query

| Parameter | Contoh | Maksud |
|---|---|---|
| `filter` | `fuelprice&filter=level@series_type` | Padanan tepat, sensitif huruf |
| `ifilter` | `ifilter=malaysia@country` | Padanan tepat, tidak sensitif huruf |
| `contains` | `contains=Langkawi@location__location_name` | Padanan sebahagian |
| `icontains` | `icontains=hujan@forecast` | Padanan sebahagian, tidak sensitif huruf |
| `range` | `range=temp[20:35]` | Julat nombor |
| `sort` | `sort=-date` | `-` = menurun |
| `date_start` / `date_end` | `date_start=2026-01-01@date` | Julat tarikh |
| `timestamp_start` / `timestamp_end` | `timestamp_start=2026-01-01 00:00:00@issued` | Julat masa |
| `limit` | `limit=100` | Bilangan maksimum rekod |
| `include` / `exclude` | `include=date,price` | Pilih/buang lajur |

Medan bersarang guna double underscore: `location__location_id`, `warning_issue__issued`.

### Endpoint

| Endpoint | Sumber | Nota |
|---|---|---|
| `GET /data-catalogue/?id=<id>` | Pelbagai agensi | Katalog utama; `id` di halaman dataset di data.gov.my |
| `GET /opendosm/?id=<id>` | DOSM | Katalog OpenDOSM sahaja |
| `GET /weather/forecast` | MET Malaysia | Ramalan 7 hari; dikemas kini harian |
| `GET /weather/warning` | MET Malaysia | Amaran aktif; dikemas kini bila perlu |
| `GET /weather/warning/earthquake` | MET Malaysia | Gempa; medan `lat`, `lon`, `depth`, `visible` |
| `GET /gtfs-static/<feed>` | KTMB, Prasarana, BAS.MY | ZIP GTFS statik |
| `GET /gtfs-realtime/vehicle-position/<agency>` | KTMB, Prasarana, BAS.MY | Protobuf `.proto`; dikemas kini 30 saat |

Contoh:

```bash
curl -sL 'https://api.data.gov.my/data-catalogue/?id=fuelprice&limit=3'
curl -s  'https://api.data.gov.my/weather/forecast/?limit=3'
curl -s  'https://api.data.gov.my/weather/warning/earthquake/?limit=3'
```

### Dataset yang repo ini sudah guna

| `id` | Digunakan di | Catatan |
|---|---|---|
| `fuelprice` | `src/lib/harga-minyak.ts` | Fallback CSV: `https://storage.data.gov.my/commodities/fuelprice.csv` |
| `cpi_headline_inflation` | `src/lib/inflasi.ts` | DOSM; 14 bulan × 12 lajur |
| `blood_donations` | `src/lib/derma-darah.ts` | PDN/KKM |
| `weather/forecast` | `src/lib/cuaca.ts`, `src/lib/ramalan-cuaca.ts` | Tapisan `location__location_id` |
| `weather/warning` | `src/lib/amaran-cuaca.ts` | Amaran MET |
| `weather/warning/earthquake` | `src/lib/gempa.ts` | 50 rekod terbaru |
| `gtfs-realtime/vehicle-position/*` | `src/lib/pengangkutan-awam.ts` | 14 feed |
| `api.bnm.gov.my/public/exchange-rate`, `/opr` | `src/lib/kadar-tukaran.ts` | BNM, bukan data.gov.my (§4) |

Cara cari `id` lain: buka <https://data.gov.my/data-catalogue>, cari dataset, dan lihat
bahagian "Sample OpenAPI query" di bawah halaman dataset. Senarai penuh boleh dibaca tanpa
scrape HTML: halaman katalog ialah Next.js, jadi `<script id="__NEXT_DATA__">` mengandungi
`props.pageProps.collection` (kategori → subkategori → `{ id, title, data_as_of, description,
data_source, link_csv, link_parquet, link_editions }`).

### 1A. OpenDOSM dan data.moh.gov.my (disemak 21 Okt 2026)

Kedua-duanya **portal katalog** di atas API dan storan yang sama dengan data.gov.my - bukan
API berasingan. Lesen sama: **CC BY 4.0**.

| Portal | Dataset | Sumber data | API |
|---|---:|---|---|
| <https://open.dosm.gov.my/data-catalogue> | 225 | 26 agensi (DOSM, BNM, JAS, KPDN, MOH, PDRM, TNB…) | `GET /opendosm/?id=<id>` atau `/data-catalogue/?id=<id>` - **kedua-duanya** berfungsi untuk dataset DOSM (`cpi_headline_inflation` diuji) |
| <https://data.moh.gov.my/data-catalogue> | 25 | MOH, NPRA, NTRC, PDN, PHCorp | `GET /data-catalogue/?id=<id>` |

**Penting: bukan semua dataset ada dalam API.** Dataset besar atau "transactional" hanya ada
sebagai fail di `storage.data.gov.my` / `storage.dosm.gov.my` - API membalas
`404 "The data catalogue (<id>) requested does not exist."`. Diuji:

| `id` | Portal | API? | Fail | Saiz | Data sehingga | Kegunaan |
|---|---|---|---|---:|---|---|
| `cosmetic_notifications_cancelled` | MOH (NPRA) | Tidak | `healthcare/cosmetic_notifications_cancelled.csv` | 14 KB (125 baris) | 1 Okt 2026 | Kosmetik dibatalkan kerana **bahan terlarang** (`notif_no, product, holder, manufacturer, substance_detected` - merkuri, tretinoin…) |
| `pharmaceutical_products_cancelled` | MOH (NPRA) | Tidak | `healthcare/pharmaceutical_products_cancelled.csv` | 223 KB | 1 Okt 2026 | Ubat yang pendaftarannya dibatalkan (`reg_no` MAL…, tarikh) |
| `pharmaceutical_products` | MOH (NPRA) | Tidak | `healthcare/pharmaceutical_products.csv` | 10.7 MB | 1 Okt 2026 | Semua ubat berdaftar (semak no. MAL) |
| `cosmetic_notifications` | MOH (NPRA) | Tidak | `healthcare/cosmetic_notifications.csv` | 23.9 MB | 1 Okt 2026 | Semua kosmetik bernotifikasi (semak no. NOT) |
| `organ_pledges` | MOH (NTRC) | **Ya** | - | - | harian | Ikrar derma organ harian |
| `pekab40_screenings` | MOH (PHCorp) | **Ya** | - | - | harian (lag ~2 minggu) | Saringan PeKa B40 |
| `blood_donations_state` | MOH (PDN) | Ya, tapi **0 baris** | `healthcare/blood_donations_state.parquet` | - | 17 Okt 2026 | Sama seperti sebelum ini - parquet sahaja |
| `pricecatcher` | DOSM (KPDN) | Tidak | `pricecatcher/pricecatcher_YYYY-MM.csv` / `.parquet` | 19.4 MB / 0.96 MB **sebulan** | 20 Okt 2026 | Harga barang setiap premis (>1 juta rekod/bulan); fail **bulanan** - corak `YYYY-MM-DD` dalam metadata katalog 404 |
| `lookup_item` / `lookup_premise` | DOSM (KPDN) | Tidak | `pricecatcher/lookup_item.csv`, `lookup_premise.csv` | 56 KB / 486 KB | Sep / Okt 2026 | Kod barang dan premis (untuk join) |
| `fish_prices` | DOSM (Perikanan) | Ya | `agriculture/fish_prices.csv` | 3.6 MB | Dis 2025 | Harga ikan bulanan mengikut spesies |
| `crime_district` | DOSM (PDRM) | Ya | `publicsafety/crime_district.csv` | 1 MB | 2023 | Jenayah mengikut daerah (data lama) |
| `arc_dosm` | DOSM | - | `storage.dosm.gov.my/meta/arc.csv` | 57 KB | harian | Kalendar keluaran penerbitan DOSM 2026 |

Selainnya (GDP, LFS, gaji, isi rumah, CPI terperinci, PPI, IPI, perdagangan, tenaga, air,
SDG) kebanyakannya data tahunan/suku tahunan untuk penganalisis - kurang sesuai untuk app
harian orang awam. Kategori OpenDOSM: Demography, Households, National Accounts, Education,
Public Safety, Labour Markets, Prices, Economic Sectors, Environment, Statistical Indicators,
Data Dictionaries, Metadata.

### Dataset masjid/surau: tiada di katalog semasa, ada di arkib

Katalog data.gov.my hari ini tidak mempunyai dataset masjid/surau. Arkib lama
`archive.data.gov.my` ada, dan ia **bukan** sekadar muat turun: API CKAN berfungsi di
`https://archive.data.gov.my/data/api/3/action/` (bukan `/api/3/action/`, yang 404).

```bash
curl -s 'https://archive.data.gov.my/data/api/3/action/package_search?q=masjid&rows=50'
curl -s 'https://archive.data.gov.my/data/api/3/action/package_show?id=4c22c771-ba28-4ce8-ae16-e5605675261e'
```

Tiga dataset kebangsaan JAKIM di sana berlesen **Creative Commons Attribution**:

| Dataset | Baris | Dikemas kini | CSV |
|---|---:|---|---|
| SENARAI MASJID DI MALAYSIA | 6,586 | 2021-08-23 | [CSV](https://archive.data.gov.my/data/dataset/4c22c771-ba28-4ce8-ae16-e5605675261e/resource/328a7b33-131c-4bd4-a49f-8b2376a7fb78/download/5senarai-masjid-di-malaysia.csv) |
| SENARAI SURAU DI MALAYSIA | 17,069 | 2021-08-27 | [CSV](https://archive.data.gov.my/data/dataset/b6ba1723-106a-4cd7-ac94-ab5706d62a0a/resource/19f62777-c10f-46b2-be1b-158e9081f17a/download/3senarai-surau-di-malaysia.csv) |
| SURAU SOLAT JUMAAT | 666 | 2021-09-28 | [CSV](https://archive.data.gov.my/data/dataset/bdeb1272-b46d-436e-a263-8a75fad3d817/resource/d3cf6dd2-2edf-4b72-b0cf-67056ac16191/download/4senarai-surau-jumaat-di-malaysia.csv) |

Lajur: `NEGERI, SURAU, ALAMAT, POSKOD, DAERAH, NO. TELEFON, NO. FAKSIMILI` (dalam fail
masjid, lajur `SURAU` sebenarnya menyimpan nama masjid). Tiada koordinat. Data ini
**bukan semasa** — jangan guna sebagai satu-satunya sumber untuk senarai hari ini.
Jangan jumlahkan ketiga-tiga fail: `SURAU SOLAT JUMAAT` ialah subset kepada `SURAU`.

---

## 2. JAKIM e-solat — waktu solat (tidak didokumenkan)

```bash
curl -s 'https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=WLY01'
```

Balasan (dipetik 20 Okt 2026):

```json
{
  "prayerTime": [{
    "hijri": "1448-05-09", "date": "20-Okt-2026", "day": "Tuesday",
    "imsak": "05:39:00", "fajr": "05:49:00", "syuruk": "06:56:00",
    "dhuha": "07:21:00", "dhuhr": "13:01:00", "asr": "16:18:00",
    "maghrib": "19:00:00", "isha": "20:10:00"
  }],
  "status": "OK!", "serverTime": "2026-10-20 14:12:19", "periodType": "today"
}
```

- `period=today|month|year|duration`; `duration` guna POST `datestart`/`dateend`
  (lihat `src/lib/imsakiah.ts`).
- 60 kod zon JAKIM disimpan dalam `src/data/solat-zones.ts`.
- Tiada dokumentasi rasmi dan tiada jaminan bentuk balasan. Mirror tidak rasmi:
  `https://api.waktusolat.app/v2/solat/<zone>` (bukan kerajaan).

---

## 3. Masjid dan surau

### 3.1 Realiti

Tiada API rasmi JAKIM untuk senarai masjid/surau. Portal **SISMIM**
(<https://masjid.islam.gov.my>) ialah pendaftaran kebangsaan, tetapi ia aplikasi Laravel
berasaskan HTML. Endpoint di bawah ialah endpoint dalaman portal, bukan API awam; ia
boleh berubah tanpa notis.

`robots.txt` membenarkan semua (`User-agent: *` / `Disallow:` kosong). Tiada header CORS,
jadi **panggil dari server**, bukan terus dari pelayar.

### 3.2 Endpoint SISMIM yang diuji

| Endpoint | Balasan | Guna |
|---|---|---|
| `GET /maklumatMasjidSurau?jenis=&negeri=&daerah=&page=N` | HTML | Senarai 10 rekod/page; `jenis` menapis; `negeri` sahaja **diabaikan** (perlu `negeri` + `daerah`) |
| `GET /daerah?ids=01` | JSON | Senarai daerah bagi negeri (`01`–`16`) |
| `GET /jenis?ids=1` | JSON | Jenis masjid (`01`–`11`) |
| `GET /jenis?ids=2` | JSON | Jenis surau (`12`, `13`) |
| `GET /excelMS?surOrMas=1` | HTML | **Semua** masjid (4.29 MB, ~12 s) |
| `GET /excelMS?surOrMas=2` | HTML | **Semua** surau (11.58 MB, ~35 s) |
| `GET /maklumatDetailMS/1/<kod>` | HTML | Butiran satu rekod (masjid atau surau) |

Kod negeri: `01` Johor, `02` Kedah, `03` Kelantan, `04` Melaka, `05` N. Sembilan,
`06` Pahang, `07` Pulau Pinang, `08` Perak, `09` Perlis, `10` Selangor, `11` Terengganu,
`12` Sabah, `13` Sarawak, `14` W.P. Kuala Lumpur, `15` W.P. Labuan, `16` W.P. Putrajaya.

Kod jenis: `01` Masjid Kerajaan, `02` Masjid Negeri, `03` Masjid Bandar/Bandaraya,
`04` Masjid Daerah/Jajahan, `05` Masjid Mukim/Kariah, `06` Masjid Institusi,
`07` Masjid Diraja, `08` Masjid Warisan, `09` Masjid Pelancongan, `10` Masjid Luar Negara,
`11` Masjid Ghairu Jamek, `12` Surau, `13` Surau Solat Jumaat.

Contoh:

```bash
# Daerah Johor
curl -s 'https://masjid.islam.gov.my/daerah?ids=01'

# Semua jenis surau
curl -s 'https://masjid.islam.gov.my/jenis?ids=2'

# 10 surau pertama di Gombak, Selangor
curl -s 'https://masjid.islam.gov.my/maklumatMasjidSurau?jenis=12&negeri=10&daerah=1001&page=1'

# Semua masjid / semua surau (HTML, bukan fail Excel sebenar)
curl -s -o masjid.html 'https://masjid.islam.gov.my/excelMS?surOrMas=1'
curl -s -o surau.html  'https://masjid.islam.gov.my/excelMS?surOrMas=2'

# Butiran Masjid Negara
curl -s 'https://masjid.islam.gov.my/maklumatDetailMS/1/1400001'
```

### 3.3 Kiraan (20 Okt 2026)

| Perkara | Bilangan |
|---|---|
| Jumlah rekod portal | **25,792** |
| Masjid (`surOrMas=1`) | **6,924** |
| Surau (`surOrMas=2`) | **18,868** |
| Surau (`jenis=12`) | 17,517 |
| Surau Solat Jumaat (`jenis=13`) | 931 |
| Masjid Kerajaan (`jenis=01`) | 166 |

Jumlah mengikut `jenis` (25,308) tidak sama dengan jumlah portal (25,792): lebih kurang
484 rekod tiada `jenis` yang diklasifikasikan. Untuk jumlah penuh, guna eksport
`/excelMS`, bukan jumlah `jenis`.

### 3.4 Eksport `/excelMS`

Walaupun namanya "excel", balasannya ialah **HTML** (`Content-Type: text/html`), bukan
fail `.xls`. Ia mengandungi satu jadual `id="tbl_exporttable_to_xls"` dengan lajur:

```text
No. | Nama | Alamat | Negeri | Daerah | No. Tel | Fax
```

Penting:

- `surOrMas=1` = semua masjid, `surOrMas=2` = semua surau.
- Semua parameter lain (`negeri`, `daerah`, `jenis`, `carian`) **diabaikan** oleh
  endpoint ini — ia sentiasa memulangkan seluruh negara. Sudah diuji.
- Tiada kod rekod, tiada tarikh dibina, tiada koordinat dalam eksport.

Parser stdlib yang diuji (6,924 baris untuk masjid):

```python
from html.parser import HTMLParser

class Rows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell, self.in_td = [], [], [], False

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th"):
            self.in_td, self.cell = True, []

    def handle_data(self, data):
        if self.in_td:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.in_td:
            self.row.append(" ".join("".join(self.cell).split()))
            self.in_td = False
        elif tag == "tr" and self.row:
            self.rows.append(self.row)
            self.row = []

p = Rows()
p.feed(open("masjid.html", encoding="utf-8", errors="replace").read())
rows = [r for r in p.rows if len(r) == 7 and r[0].isdigit()]
print(len(rows), rows[:2])
```

### 3.5 Halaman butiran

`GET /maklumatDetailMS/1/<kod>` (kod dari pautan di halaman senarai; surau juga guna
segmen `1`) mengandungi nama, negeri, kod, telefon, faks, tarikh dibina, kemudahan dan
sejarah ringkas.

**Tiada latitud/longitud.** Peta Google pada halaman ini hanya `q=<NAMA MASJID>` (carian
nama, bukan koordinat) **(21 Okt)**. Untuk peta, alamat mesti digeokod. Halaman ini juga HTML;
jangan jangka struktur kekal.

### 3.6 Dataset siap (lebih mudah daripada scrape)

| Dataset | Rekod | Koordinat | Lesen | Nota |
|---|---|---|---|---|
| [Rewsyaydee/malaysia-masjid-dataset](https://github.com/Rewsyaydee/malaysia-masjid-dataset) | 6,915 masjid + 19,023 surau + 449 butiran Selangor | Tiada (kecuali 1 rekod JAIS) | CC BY 4.0 | Snapshot SISMIM 2026-04-03; CSV + JSON; CORS `*`. GitHub tunjuk lesen `NOASSERTION`; CC BY 4.0 hanya dalam README, dan README menyebut medan peribadi untuk tujuan **bukan komersial** **(21 Okt)** |
| [betaqwa/mosque-collection](https://github.com/betaqwa/mosque-collection) | 12,545 masjid + 27,533 surau | **Semua** bergeokod | "rujukan dan penyelidikan"; data JAKIM kekal hak kerajaan | 16 medan termasuk `latitude`, `longitude`, `zone`, `has_friday_prayer`. **Kualiti rendah (21 Okt):** 12,545 baris masjid tetapi hanya 8,591 pasangan nama+alamat unik (SISMIM: 6,924 baris, 6,899 unik), jadi ada pendua; 1,209 baris berkongsi titik yang sama dengan ≥5 rekod lain (98 pada satu titik) - geokod centroid, bukan lokasi masjid; `geocode_status` sentiasa `ok` jadi tidak boleh dipercayai; poskod kadang-kadang bercanggah dengan alamat |

Nota penting: pautan asal `abualif120/malaysia-masjid-dataset` yang disebut dalam README
kini **404**. Fail masih boleh dimuat turun dari repo `Rewsyaydee` di atas (diuji).

Skema JSON dataset SISMIM:

```json
{
  "metadata": { "compiled_date": "2026-04-03", "license": "CC BY 4.0", "source": "https://masjid.islam.gov.my" },
  "masjid": [
    { "name": "MASJID NEGARA", "address": "JALAN PERDANA",
      "state": "Kuala Lumpur (FT)", "district": "Zon 3", "phone": "03-26937784", "fax": "03-26913696" }
  ]
}
```

Skema betaqwa:

```json
{ "name": "...", "type": "masjid", "address": "...", "city": "...", "postcode": "...",
  "state": "Johor", "country": "Malaysia", "latitude": 1.925169, "longitude": 102.6952453,
  "zone": null, "phone": "...", "jemaah_capacity": null, "has_friday_prayer": true,
  "is_verified": false, "is_claimed": false, "geocode_status": "ok" }
```

### 3.7 Portal negeri

- **JAIS e-Masjid** (Selangor): <https://e-masjid.jais.gov.my> — HTML, ada butiran
  tambahan (kategori, kapasiti, pengasas, perasmi). Hampir tiada koordinat.
- **JAWI** (W.P. Kuala Lumpur/Putrajaya/Labuan): direktori HTML; permintaan berprogram
  boleh dapat **403**, jadi jangan bergantung padanya.
- **masjid.org.my**: direktori pihak ketiga (3,580+ masjid/surau), bukan sumber kerajaan.
- Jabatan agama negeri lain (JAINJ, JAIPK, MAIPs, dll.) mempunyai direktori masing-masing;
  tiada API seragam.

### 3.8 Pilihan untuk projek ini

| Keperluan | Pilihan |
|---|---|
| Senarai penuh + koordinat segera | betaqwa (40,078) — **jangan**, walaupun untuk prototaip: pendua + geokod centroid (§3.6) |
| Data rasmi terkini tanpa koordinat | SISMIM `/excelMS` (server, cache) atau minta data semasa |
| Perlu butiran satu masjid | `/maklumatDetailMS/1/<kod>` |
| Selangor + koordinat | XLSX arkib (403 baris, CC BY) atau JAIS e-Masjid |
| Senarai sah untuk komersial | Arkib CC BY (2020–2021) atau data request |
| Senarai terkini + koordinat | Arkib/permohonan + geokod sendiri (bukan Nominatim bulk) |

### 3.9 Ranking sumber: mana yang "legit"

| Sumber | Data semasa? | Lesen | Koordinat | Guna untuk |
|---|---|---|---|---|
| **data.gov.my / arkib (JAKIM)** | Tidak (2020–2021) | **CC BY** | Tidak | Kegunaan semula, termasuk komersial, dengan atribusi |
| **Data request data.gov.my → JAKIM** | Ya, bila dipenuhi | Terma Data Terbuka 1.0 | Mungkin | Senarai semasa yang sah untuk projek |
| **SISMIM live** (`masjid.islam.gov.my`) | Ya | **© JAKIM, tiada lesen terbuka** | Tidak | Rujukan/pengesahan; minta kebenaran untuk edaran pukal |
| **JAIS e-Masjid** (Selangor) | Ya | Tiada lesen jelas | Tidak | Selangor sahaja; rujuk, jangan edar pukal tanpa kebenaran |
| **Dataset GitHub CC BY** | Snapshot 2026-04-03 | CC BY 4.0 (kompilasi) | Tidak | Pemprosesan pantas; bukan sumber rasmi |
| **betaqwa/mosque-collection** | Tidak dinyatakan | Tiada lesen standard | Ya, 40,078 | Prototaip/peta; jangan andaikan lesen komersial |
| **OpenStreetMap** | Berterusan | ODbL | Ya, ~6,665 elemen | Peta; liputan lebih rendah, share-alike |
| **Google Places** | Ya | Terma Google | Ya | Carian pengguna sahaja; bukan simpan/edar pukal |

**Terma utama yang perlu tahu:**

- **Terma Penggunaan Data Terbuka Kerajaan 1.0** (Pekeliling Am Bil. 1/2015, Lampiran B)
  membenarkan salin, terbit, edar, adaptasi, guna komersial dan bukan komersial, serta
  gabung dengan data lain. Syarat: nyatakan sumber, pautkan terma, dan sertakan kenyataan
  "Data dan maklumat tertakluk di bawah Terma Penggunaan Data Terbuka Kerajaan Malaysia 1.0".
  Pengecualian: data peribadi, jata/logo/lambang rasmi, hak pihak ketiga dan harta intelek.
- **Dataset semasa data.gov.my** menggunakan **CC BY 4.0** (dinyatakan pada halaman dataset).
- **SISMIM tiada lesen terbuka yang dinyatakan.** Footer hanya "© Hakcipta 2021 JAKIM" +
  penafian. Jangan andaikan akses awam = lesen penggunaan semula. Untuk edaran pukal atau
  komersial, dapatkan kebenaran bertulis daripada JAKIM.
- **PDPA.** Telefon/faks ialah data peribadi dalam sesetengah rekod. Dataset Kelantan juga
  mengandungi nama imam. Jangan terbitkan medan peribadi yang tidak perlu.

### 3.10 Cara dapatkan, ikut keperluan

**A. Minta data semasa (paling sah)**

1. Buka <https://data.gov.my/data-request> (versi BM: `/ms-MY/data-request`) → "Request data".
2. Isi borang mengikut §7 (draf siap ada di sana). JAKIM **tiada** dalam senarai agensi -
   pilih **JPM** (Jabatan Perdana Menteri; JAKIM di bawahnya). Borang tiada medan format;
   sebut CSV/JSON dalam penerangan.
3. Hantar. Tiket awam boleh dijejak (dan diikuti) di halaman yang sama.
4. Panduan rasmi: [Garis Panduan Permohonan Set Data](https://www.malaysia.gov.my/en/my-initiative/government-open-data/policy-strategy-and-governance/garis-panduan-permohonan-set-data)
   (dikemas kini 17/7/2026; buka dalam pelayar — permintaan skrip boleh dapat 403).
5. Hubungi JAKIM jika perlu: `webmaster@islam.gov.my`, 03-8886 4000, No. 23 Jalan Tunku
   Abdul Rahman, Presint 3, 62100 Putrajaya.

**B. Guna arkib CC BY sekarang (data 2020–2021)**

Tiga CSV kebangsaan di §1: 6,586 masjid + 17,069 surau + 666 surau Jumaat. Muat turun,
nyahduplikasi, kemudian sahkan dengan SISMIM. Ini satu-satunya laluan masjid/surau yang
jelas membenarkan kegunaan komersial tanpa permohonan.

**C. SISMIM live (data semasa, tanpa lesen terbuka)**

Butang "Excel" pada portal ialah ciri awam (`/excelMS`), bukan retak keselamatan. Guna
secara berhemah:

1. Panggil dari server, bukan pelayar (tiada CORS).
2. Simpan salinan + tarikh + jumlah rekod sebagai provenance.
3. Cache sekurang-kurangnya sehari.
4. Beri atribusi "Sumber: JAKIM (SISMIM)".
5. Untuk edaran semula pukal/komersial: minta kebenaran JAKIM dahulu.

**D. Negeri (liputan tidak seragam)**

- **Selangor, ada koordinat:** [LOKASI MASJID MENGIKUT DAERAH DI NEGERI SELANGOR](https://archive.data.gov.my/data/dataset/1dac0c48-821f-4879-85f4-6f672b093eb6/resource/7a01ddae-bd77-48c9-a4ac-dc83e5cb86ee/download/21-lokasi-masjid-mengikut-daerah-di-negeri-selangor.xlsx)
  — 403 baris, lajur `DAERAH, MUKIM, NAMA MASJID, Alamat, LATITUD, LONGITUD`, CC BY,
  dikemas kini 27 Ogos 2021.
- **JAIS e-Masjid (semasa, HTML):** [masjid](https://e-masjid.jais.gov.my/dashboard/listmasjid)
  457 rekod; [surau](https://e-masjid.jais.gov.my/dashboard/listsurau) 1,994 rekod
  (20 Okt 2026). Ada kategori/kariah; tiada koordinat.
- **Arkib negeri (CC BY):** Perak 616 masjid, Kelantan 54, Kedah 231 kariah, Pulau Pinang
  (Timur Laut) 34. Semua tanpa koordinat; Kelantan mengandungi nama imam.

**E. OpenStreetMap (koordinat, bukan senarai rasmi)**

- Overpass: 6,665 elemen `amenity=place_of_worship` + `religion=muslim` di Malaysia
  (1,807 node, 4,805 way, 53 relation; elemen tidak dinyahduplikasi).
- Lesen **ODbL**: atribusi + share-alike untuk pangkalan data terbitan.
- **Jangan geokod 25k alamat dengan Nominatim awam.** Polisi: maksimum 1 permintaan/saat,
  tiada bulk, mesti cache; untuk tugasan besar guna instance sendiri atau penyedia komersial.

**F. Dataset pihak ketiga**

- `Rewsyaydee/malaysia-masjid-dataset`: 6,915 masjid + 19,023 surau, CC BY 4.0, snapshot
  3 April 2026. Paling mudah untuk pemprosesan, tetapi bukan sumber rasmi.
- `betaqwa/mosque-collection`: 12,545 masjid + 27,533 surau, semua bergeokod, tetapi
  lesennya hanya "rujukan dan penyelidikan"; data JAKIM kekal hak kerajaan.

**Cadangan untuk projek ini:** mula dengan arkib CC BY (nombor + alamat), tambah koordinat
Selangor dari XLSX, hantar permohonan data semasa, dan gunakan SISMIM hanya untuk
pengesahan/freshness. Jangan bina produk komersial di atas scrape SISMIM tanpa kebenaran.

---

## 4. API agensi lain

| Sumber | Endpoint / status | Nota |
|---|---|---|
| BNM Open API | `https://api.bnm.gov.my/public/*`; katalog di <https://apikijangportal.bnm.gov.my> | `Accept: application/vnd.BNM.API.v1+json`. Diuji 200 tanpa kunci: `/public/opr`, `/public/exchange-rate` (20 Okt 2026), dan **(21 Okt)** `/public/kijang-emas` (harga syiling 1/½/¼ oz), `/public/consumer-alert` (Senarai Amaran Pengguna Kewangan, 53 KB: `name, regisration_number` [sic], `added_date`, `websites`), `/public/base-rate` (Base Rate/BLR setiap bank), `/public/interest-rate`, `/public/islamic-interbank-rate`, `/public/usd-interbank-intraday-rate`. Had kadar dan terma penggunaan semula belum disemak di portal APIKijang |
| MyGeoportal / MyGDI | <https://www.mygeoportal.gov.my> | Katalog metadata geospatial (MyGDI Explorer); tiada REST API awam; data melalui permohonan perkongsian |
| Arkib data.gov.my (MAMPU) | CKAN API: `https://archive.data.gov.my/data/api/3/action/*` | `package_search`, `package_show`; dataset 2020–2021, kebanyakannya CC BY |
| Permohonan data | <https://data.gov.my/data-request> | Borang rasmi; tiket awam; agensi = kementerian sahaja (JAKIM → JPM). Lihat §7 |
| JAKIM | `webmaster@islam.gov.my`, 03-8886 4000 | Pertanyaan data/masjid/surau |
| Storage data.gov.my | `https://storage.data.gov.my/<kategori>/<fail>.csv` | CSV statik; contoh `commodities/fuelprice.csv` |
| JPJ, LHDN, KKM, KPM | — | Tiada API awam umum; data yang diterbitkan biasanya melalui data.gov.my |

---

## 5. Perangkap dan checklist

- **Tiada API masjid rasmi.** Anggap endpoint SISMIM sebagai scrape, bukan kontrak.
  Bungkus dengan cache dan fallback; jangan panggil setiap kali halaman dibuka.
- **Tiada koordinat dalam SISMIM.** Jangan reka lat/lng daripada poskod; geokod alamat
  dan tanda aras `geocode_status`.
- **HTML, bukan Excel.** `/excelMS` memulangkan HTML 4–12 MB. Hadkan masa, simpan
  salinan, dan jangan parse semula setiap permintaan.
- **CORS.** SISMIM tiada `Access-Control-Allow-Origin`; panggil dari server/route API.
- **Kadar dan kesopanan.** Walaupun tiada had rasmi, cache sekurang-kurangnya sehari
  untuk data yang jarang berubah. Data.gov.my had 4/minit.
- **Nama dan alamat kotor.** Huruf besar semua, alamat tidak seragam, `-`/`TIADA` untuk
  kosong. Normalisasi di sisi anda; jangan ubah data sumber.
- **PDPA.** Telefon/faks ialah data peribadi dalam beberapa rekod. Jangan edar secara
  pukal atau hubungi pemilik tanpa asas.
- **Lesen.** Arkib/data.gov.my = CC BY atau Terma Data Terbuka Kerajaan 1.0 (atribusi +
  pautan terma). SISMIM = © JAKIM, tiada lesen terbuka — akses awam bukan lesen edar
  semula. Dataset betaqwa tiada lesen standard. Untuk komersial, guna CC BY atau minta
  kebenaran JAKIM.
- **Semak semula kiraan** sebelum bergantung pada angka dalam dokumen ini:

```bash
curl -s 'https://masjid.islam.gov.my/maklumatMasjidSurau' | grep -o 'Jumlah Rekod: <b>[0-9]*</b>'
curl -s 'https://masjid.islam.gov.my/excelMS?surOrMas=1' -o /tmp/m.html && grep -o 'Jumlah Rekod: <b>[0-9]*</b>' /tmp/m.html
curl -s 'https://masjid.islam.gov.my/excelMS?surOrMas=2' -o /tmp/s.html && grep -o 'Jumlah Rekod: <b>[0-9]*</b>' /tmp/s.html
```

---

## Sumber

Semua diakses 20 Oktober 2026.

- [data.gov.my Open API — dokumentasi](https://developer.data.gov.my/)
- [Data Catalogue API](https://developer.data.gov.my/static-api/data-catalogue)
- [OpenDOSM API](https://developer.data.gov.my/static-api/opendosm)
- [Weather API](https://developer.data.gov.my/realtime-api/weather)
- [GTFS Realtime API](https://developer.data.gov.my/realtime-api/gtfs-realtime)
- [Had kadar](https://developer.data.gov.my/rate-limit)
- [Parameter query](https://developer.data.gov.my/request-query)
- [Format balasan](https://developer.data.gov.my/response-format)
- [Katalog data.gov.my](https://data.gov.my/data-catalogue)
- [Portal SISMIM (JAKIM)](https://masjid.islam.gov.my/maklumatMasjidSurau)
- [Senarai masjid dan surau — JAKIM](https://www.islam.gov.my/ms/solat-masjid/masjid-dan-surau-di-malaysia)
- [JAIS e-Masjid](https://e-masjid.jais.gov.my/)
- [JAWI — direktori masjid](https://jawi.gov.my/index.php/perkhidmatan-masjid-surau)
- [BNM OpenAPI Portal](https://apikijangportal.bnm.gov.my/)
- [MyGeoportal](https://www.mygeoportal.gov.my/)
- [malaysia-masjid-dataset (salinan yang berfungsi)](https://github.com/Rewsyaydee/malaysia-masjid-dataset)
- [mosque-collection (bergeokod)](https://github.com/betaqwa/mosque-collection)
- [Arkib data.gov.my (MAMPU)](https://archive.data.gov.my/data/ms_MY/dataset/senarai-masjid-di-seluruh-malaysia)
- [API CKAN arkib data.gov.my](https://archive.data.gov.my/data/api/3/action/package_search?q=masjid&rows=5)
- [Permohonan Data — data.gov.my](https://data.gov.my/data-request)
- [Katalog OpenDOSM](https://open.dosm.gov.my/data-catalogue) (diakses 21 Okt 2026)
- [Katalog data.moh.gov.my](https://data.moh.gov.my/data-catalogue) (diakses 21 Okt 2026)
- [Garis Panduan Permohonan Set Data — MyGOV](https://www.malaysia.gov.my/en/my-initiative/government-open-data/policy-strategy-and-governance/garis-panduan-permohonan-set-data)
- [Pekeliling Am Bil. 1/2015 — Terma Penggunaan Data Terbuka Kerajaan 1.0](https://dasar.jdn.gov.my/search-g/download-file/25/7f821c650c868d025fb5351d7d45d001)
- [LOKASI MASJID MENGIKUT DAERAH DI NEGERI SELANGOR (XLSX, koordinat)](https://archive.data.gov.my/data/dataset/1dac0c48-821f-4879-85f4-6f672b093eb6/resource/7a01ddae-bd77-48c9-a4ac-dc83e5cb86ee/download/21-lokasi-masjid-mengikut-daerah-di-negeri-selangor.xlsx)
- [JAIS e-Masjid — senarai masjid](https://e-masjid.jais.gov.my/dashboard/listmasjid)
- [JAIS e-Masjid — senarai surau](https://e-masjid.jais.gov.my/dashboard/listsurau)
- [JAKIM — hubungi kami](https://masjid.islam.gov.my/contact)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OpenStreetMap — hak cipta dan lesen ODbL](https://www.openstreetmap.org/copyright)

---

## 6. Untuk Showcase `/waktu-solat` (21 Okt 2026)

"Latest" bermaksud **SISMIM live** - semua sumber lain ialah snapshot (arkib 2021,
GitHub April 2026). Cara paling kecil dan paling selamat dari segi lesen:

- **Jangan simpan atau edar pukal** 25k rekod. Ambil senarai satu daerah bila diminta:
  `maklumatMasjidSurau?jenis=&negeri=NN&daerah=NNNN&page=N` (10 rekod/page, HTML kecil),
  dari server, melalui `withFallback` (`src/lib/fallback.ts`), cache segar 1 hari / stale
  beberapa minggu. Sama seperti app lain: sumber JAKIM, pautan ke halaman butiran SISMIM.
- **Pemilih:** negeri → daerah daripada `/daerah?ids=NN` (JSON). Daerah SISMIM **bukan** zon
  JAKIM e-solat, jadi perlu peta zon → daerah sendiri jika mahu ikut zon solat.
- **Senarai SISMIM tanpa peta** (tiada koordinat); pautan "Buka di Google Maps" dengan
  `nama + alamat`. **Dibina:** "Terdekat dengan saya" guna ekstrak OSM statik
  (`public/data/masjid/osm.json`, `bun scripts/masjid/osm.ts`; 6,665 tempat, ODbL) dengan
  jarak dikira dalam pelayar - Overpass terus terlalu perlahan (16-30 s setiap query).
- **Tunjuk nama + alamat sahaja.** Telefon/faks ialah PDPA (§3.9); pautkan ke SISMIM.
- Atribusi: "Sumber: JAKIM (SISMIM)". Ia © JAKIM tanpa lesen terbuka, jadi ini paparan
  rujukan bukan komersial; untuk edaran pukal tetap perlu kebenaran (§3.10 A).

---

## 7. Borang permohonan data data.gov.my (21 Okt 2026)

Butang **"Request data"** di <https://data.gov.my/data-request> membuka modal "Fill in the
form below". Medan (dari halaman itu sendiri):

| Medan | Isi |
|---|---|
| Name | Nama penuh anda |
| Email | E-mel untuk notifikasi tiket |
| Applicant's Institution | Contoh: "Individu / pembangun bebas (hafizbahtiar.com)" |
| Dataset title | Tajuk pendek dan khusus |
| Dataset description | Apa sebenarnya: medan, liputan, kekerapan, format |
| Data provider agency | Dropdown **kementerian sahaja** (29 pilihan: JPM, KKM, KPKT, MOT…). Agensi di bawah kementerian dipilih melalui kementeriannya |
| Purpose of request | Radio: Research / Learning / Product Development / General Knowledge / Others (nyatakan) + penerangan ringkas cara guna |

**Tiket kita: #212** "Senarai Masjid dan Surau Berdaftar di Malaysia (SISMIM JAKIM)", agensi JPM -
dihantar 21 Okt 2026 10:44, **Under Review** sejak 10:47 (semak di halaman yang sama, cari `id: 212`).

Status tiket: Under Review → In Progress → Data Provided (dihantar kepada pemohon sahaja) →
Data Published (masuk katalog), atau Rejected dengan sebab. Pada 21 Okt 2026: 177 tiket, 90
under review, 46 dipenuhi, 41 ditolak. **Tiada tiket masjid/surau lagi** (dicari).

**Sebab biasa ditolak** (dari tiket awam): permohonan tidak jelas ("Application is unclear",
tahun/bulan tidak dinyatakan), permohonan berulang, agensi salah (dirujuk ke agensi lain),
data sulit/terperingkat, data mikro terlalu terperinci, atau sebenarnya laporan isu teknikal.
Jadi: satu dataset, medan yang jelas, agensi yang betul, tiada data peribadi.

### Draf: senarai masjid dan surau (JAKIM)

- **Dataset title:** Senarai Masjid dan Surau Berdaftar di Malaysia (SISMIM JAKIM)
- **Data provider agency:** JPM (Jabatan Kemajuan Islam Malaysia, JAKIM)
- **Dataset description:**

  > Senarai semasa semua masjid dan surau berdaftar dalam Sistem Maklumat Masjid (SISMIM)
  > JAKIM, satu baris setiap tempat, dengan medan: kod SISMIM, nama, jenis (Masjid Kerajaan /
  > Negeri / Daerah / Mukim / Institusi / Surau / Surau Solat Jumaat, dll.), alamat, poskod,
  > daerah, negeri, latitud dan longitud (jika ada), status solat Jumaat, dan tarikh kemas
  > kini rekod. Tanpa data peribadi (tiada nama pegawai atau nombor telefon peribadi).
  > Format CSV atau JSON, dikemas kini sekurang-kurangnya setiap suku tahun. Senarai di
  > arkib data.gov.my (2021) sudah lama, dan portal SISMIM hanya ada paparan HTML tanpa
  > koordinat dan tanpa lesen data terbuka.

- **Purpose of request:** Product Development

  > Aplikasi web percuma bukan komersial (hafizbahtiar.com/waktu-solat/masjid) untuk orang
  > awam mencari masjid dan surau mengikut daerah dan yang terdekat, bersama waktu solat
  > JAKIM. Data akan dipaparkan dengan atribusi kepada JAKIM di bawah Terma Penggunaan Data
  > Terbuka Kerajaan.

Nota: koordinat ialah bahagian paling berharga - jika JAKIM tidak menyimpannya, senarai rasmi
berlesen tanpa koordinat pun sudah menggantikan scrape SISMIM. Ikuti tiket selepas hantar;
jika ditolak kerana agensi, hubungi JAKIM terus (§3.10 A langkah 5).
