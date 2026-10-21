// Offline check for src/lib/masjid.ts (SISMIM list-page parser + snapshot fallback).
// Run: bun scripts/check-masjid.ts
// Fixture: one card as SISMIM prints it (masjid.islam.gov.my/maklumatMasjidSurau, Gombak,
// fetched 2026-10-21), trimmed to the parts the parser reads.
import { expect } from "bun:test";
import { fromSnapshot, parseSismim } from "../src/lib/masjid.ts";

const card = (name: string, address: string, kod: string) => `
<div class="card" style="border: 2px solid #3a9ebf;">
  <div href="" type="button" class="btn text-white p-1 text-uppercase"> <h4>${name}</h4></div>
  <div class="col-md-2"><label for="">Alamat</label></div>
  <div class="col-md-1"><label for="">:</label></div>
  <div class="col-md-9"><h6 class="text-capitalize">
      ${address}
  </h6></div>
  <div class="col-md-2"><label for="">Kod</label></div>
  <div class="col-md-9"><h6>${kod}</h6></div>
  <a href="https://masjid.islam.gov.my/maklumatDetailMS/1/${kod}" type="button">Maklumat Terperinci</a>
</div>`;
const page = (total: number, cards: string[]) =>
  `<div class="col-md-3 pt-3 p-0">Jumlah Rekod: <b>${total}</b> </div>${cards.join("")}`;

const ten = Array.from({ length: 10 }, (_, i) => card(`SURAU ${i}`, "48000 RAWANG,\nSELANGOR", `10010${i}`));
const first = parseSismim(page(349, [card("MASJID JAMEK AL - AMANIAH", "MASJID DAERAH GOMBAK,\n68100 BATU CAVES", "1001018"), ...ten.slice(1)]), 1);
expect(first?.total).toBe(349);
expect(first?.items[0]).toEqual({ name: "Masjid Jamek Al - Amaniah", address: "Masjid Daerah Gombak, 68100 Batu Caves", kod: "1001018" });

// Entities, trailing comma; last page holds the remainder (349 = 34 pages x 10 + 9).
const last = parseSismim(page(349, Array.from({ length: 9 }, () => card("SURAU AL-MU&#039;MININ &amp; ANAK", "JALAN 1/6,", "1"))), 35);
expect(last?.items.length).toBe(9);
expect(last?.items[0].name).toBe("Surau Al-Mu'minin & Anak");
expect(last?.items[0].address).toBe("Jalan 1/6");
expect(parseSismim(page(349, []), 36)).toEqual({ total: 349, items: [] }); // past the end = empty, still valid

// Rejected (never cached): no total, wrong row count (markup changed), card without a code.
expect(parseSismim("<html>403 Forbidden</html>", 1)).toBeNull();
expect(parseSismim(page(349, ten.slice(0, 3)), 1)).toBeNull();
expect(parseSismim(page(349, ten), 35)).toBeNull();
expect(parseSismim(page(1, [card("SURAU X", "", "").replace(/maklumatDetailMS\/1\//, "")]), 1)).toBeNull();

// Snapshot: state code -> its own state names, district matched case-insensitively, paged by 10.
const rows = [
  ...Array.from({ length: 12 }, (_, i) => ({ name: `MASJID ${i}`, address: "JALAN PERDANA", state: "Kuala Lumpur (FT)", district: "Zon 3" })),
  { name: "MASJID LAIN", address: "", state: "Selangor", district: "Zon 3" },
];
const q = { negeri: "14", daerah: { code: "1403", name: "Zon 3" }, jenis: "", page: 2 };
expect(fromSnapshot(rows, q)).toEqual({
  total: 12,
  items: [{ name: "Masjid 10", address: "Jalan Perdana" }, { name: "Masjid 11", address: "Jalan Perdana" }],
});
expect(fromSnapshot(rows, { ...q, negeri: "07" })).toBeNull();

console.log("check-masjid: ok");
