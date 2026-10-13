# eZPay Kiosk (Public Users) — input untuk admin form

Rujukan: `/admin/projects/new` → `ProjectEditor`. Ikut tab: **Basics → Case Study → Media → Tech Stack → Links & SEO → Publish**.
Cara: isi **Title / Slug / Short description** dulu → tekan **Create draft**. Lepas tu baru tab lain terbuka.

Nota: copy dalam English (ikut gaya projek sedia ada — ayat fakta, "I built…"). Setiap tanda ⚠️ = kena sahkan/ganti dengan fakta sebenar.

---

## 1. Basics

| Field | Isi |
|---|---|
| **Title** (wajib) | `DBKL EzPay - Public Payment Kiosk` |
| **Slug** (wajib) | `dbkl-ezpay-public-kiosk` |
| **Subtitle** | `Walk-in payments without the counter queue` |
| **Project type** | `work` |
| **Short description** (wajib, keluar atas card) | `Walk-in customers pay compound fines and licence fees at a kiosk screen instead of a counter. EzPay Kiosk is the Android app on DBKL's self-service kiosks - the public looks up their reference, pays by card or QR, and takes a printed receipt, with interrupted payments recovered instead of lost.` |
| **Summary** | `The self-service kiosk app the public pays on.` |
| **Project scope** | `Android kiosk app - built from scratch` ⚠️ |
| **Year** | `2026` ⚠️ |
| **Role** | `Mobile Developer` ⚠️ |
| **Card image style** | Ada screenshot kiosk → `Photo / screenshot - fills the card`; guna logo DBKL sahaja → `Device-frame preview (default)` |
| **Client name** | `DBKL` |
| **Public** | ☑ (OFF kalau kiosk belum boleh didedahkan) ⚠️ |
| **Confidential** | ☐ (ON hanya kalau nama klien kena sorok) |
| **Featured** | ☐ (ON kalau nak naik home page) |
| **Featured order** | `0` (kalau Featured ON; makin kecil makin awal) |

---

## 2. Case Study → Narrative

| Field | Isi |
|---|---|
| **Problem** | `Paying in person at DBKL meant queueing at a counter, and the counter was the only channel for cash, card and licence payments.` ⚠️ |
| **Solution** | `A self-service kiosk takes the whole transaction: the customer looks up what they owe, pays by card or QR, and walks away with a printed receipt - no staff at the screen.` ⚠️ |
| **My contribution** | `Built the kiosk app from scratch: the whole screen flow (reference lookup → payment → receipt), card payment driven through the bank terminal, QR confirmation, receipt printing, and recovery for payments interrupted mid-transaction. Payment and printing sit behind an adaptive interface, so another kiosk model is a new adapter rather than changes across every screen.` ⚠️ **WAJIB ganti dengan apa kau betul-betul buat** — senarai di atas cadangan. |
| **Architecture / tech decisions** | `Payment and printing sit behind one adaptive interface, so another kiosk model is a new adapter rather than a rewrite. An idle-reset state machine returns the kiosk to the start screen on timeout, so the next customer never sees the previous session, and an interrupted transaction is treated as recoverable, not failed.` ⚠️ |
| **Results / impact** | ⚠️ Letak angka sebenar kalau ada (cth. "X% bayaran walk-in pindah ke kiosk", "masa urus niaga turun dari A ke B"). Kalau tiada angka: `Payments the public can complete without staff, with receipts and a recoverable path when a transaction is interrupted.` |
| **Full description (HTML)** | Biar kosong (optional) — projek EzPay terminal pun kosong. |

### Custom sections (optional)
Jenis dibenarkan: `problem` · `solution` · `contribution` · `architecture` · `challenges` · `results` · `custom`.

| Section type | Title | Body |
|---|---|---|
| `challenges` | `Kiosk in the real world` | `A kiosk has no operator: nobody to tap "retry", nobody to explain the screen. Every failure path - card declines, jammed printers, a customer who walks away mid-payment - has to resolve itself or be recoverable.` ⚠️ |

### Features (Title + Description + Icon + Visible)
Satu-satu tekan **Add feature**. Cadangan 4:

| Title | Description |
|---|---|
| `Self-service payments` | `Compound fines, licence fees and other counter payments available directly at the kiosk.` ⚠️ |
| `Reference lookup` | `Find the bill by MyKad, vehicle plate or reference number, without an operator.` ⚠️ (buang kalau kiosk tak scan/lookup) |
| `Card & QR payment` | `Card transactions go to the bank terminal; QR and e-wallet payments are confirmed before the receipt prints.` ⚠️ |
| `Receipt & recovery` | `Receipt prints on completion, and a payment interrupted mid-transaction is recovered instead of lost.` |

Icon: pilih dari senarai dalam CMS (cth. check / credit-card / printer / user) — kosong pun okay.

---

## 3. Media

Satu-satunya tempat yang **block publish kalau gagal**: setiap media `Visible` mesti ada **Alt text**.

| Slot | Isi |
|---|---|
| **Cover image** (Type = `Cover image`) | TODO: screenshot kiosk utama (landscape kalau kiosk mendatar) |
| **Social share (OG)** (Type = `Social share (OG)`) | TODO: boleh guna cover yang sama |
| Screenshot 1 (Type = `screenshot`) | Alt: `EzPay kiosk start screen` |
| Screenshot 2 | Alt: `EzPay kiosk reference lookup screen` |
| Screenshot 3 | Alt: `EzPay kiosk payment screen` |
| Screenshot 4 | Alt: `EzPay kiosk printed receipt` |
| **Device frame** | `No frame` untuk screenshot penuh; `phone` / `tablet` kalau guna mockup |

Jenis media: `screenshot` · `video` · `architecture_diagram` · `logo` · `cover` · `og` · `other`. Boleh upload atau **Add by image URL** (cth. logo DBKL).

---

## 4. Tech Stack

Tekan **Attach** dari library; kalau tiada, create dulu dengan nama + category (`backend` · `mobile` · `database` · `web` · `infra` · `language` · `tooling`).

| Name | Category | Catatan |
|---|---|---|
| `Java` | `language` | ikut stack sebenar kiosk |
| `Android` | `mobile` | |
| `Sunmi POS` | `tooling` | ⚠️ tukar pada nama kiosk sebenar kalau lain |
| TODO | | bank terminal SDK / printer SDK / QR (DuitNow) kalau nak sebut |

---

## 5. Links & SEO

Link types: `source` · `demo` · `app_store` · `play_store` · `case_study` · `contact` · `private` · `other` (ada status + toggle Public per link).

- Kiosk tiada URL awam → **biar kosong** (macam projek EzPay terminal; page auto tunjuk CTA "Request a walkthrough").
- Ada internal doc/demo → tambah satu link `case_study` / `private`, status `active`, Public OFF kalau tak nak semua orang nampak.
- Cover / OG di tab ini status sahaja; imej di-set di **Media**.

---

## 6. Publish

- Status default = **draft** (tak muncul di `/projects` sampai kau tekan Publish).
- Error (merah) = block publish; warning (kuning) boleh jalan.
- Lepas publish, tekan **View public page** untuk semak `/projects/dbkl-ezpay-public-kiosk`.
- URL baru masuk sitemap pada build seterusnya.

---

## ⚠️ Andaian aku (sahkan sebelum publish)

1. Kiosk ni **Android**, dan app kiosk ni kau bangunkan **dari kosong** (repo sendiri, bukan lanjutan app pegawai).
2. Jenis bayaran di kiosk = kompaun + lesen (cadangan — tambah/buang ikut sebenar, cth. cukai taksiran, sewa).
3. Ada bayaran kad melalui bank terminal + mungkin QR/e-wallet, **dan** cetakan resit.
4. Tahun `2026`, Role `Mobile Developer`, Client `DBKL`, Public ON.
5. **"My contribution" tu cadangan** — bahagian ini paling penting untuk kau betulkan, sebab itu yang orang baca.

Kalau mana-mana andaian salah, bagitau — aku kemas balik draf tu.
