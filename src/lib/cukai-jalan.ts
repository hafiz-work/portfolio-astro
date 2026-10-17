/**
 * Yearly LKM (cukai jalan) from JPJ's guideline tables in src/data/cukai-jalan.ts.
 * Pure, integer sen. Check: bun scripts/check-cukai-jalan.ts
 */
import {
  EV_CAR, EV_MOTOSIKAL, EV_MOTOSIKAL_FLAT_MAX, ISLAND_SMALL_CAR_SEN,
  SABAH_BUKAN_SALOON, SABAH_MOTOSIKAL, SABAH_SALOON,
  SARAWAK_BUKAN_SALOON, SARAWAK_MOTOSIKAL, SARAWAK_SALOON,
  SM_BUKAN_SALOON, SM_MOTOSIKAL, SM_SALOON_INDIVIDU, SM_SALOON_SYARIKAT,
  type Table,
} from "../data/cukai-jalan";
import { rm } from "./money";

export { EV_CAR };

export type Region = "semenanjung" | "langkawi" | "pangkor" | "sabah" | "labuan" | "sarawak";
export type Kind = "motosikal" | "saloon-individu" | "saloon-syarikat" | "bukan-saloon";
export interface Input {
  region: Region;
  kind: Kind;
  ev: boolean;
  /** Engine cc, or motor power in watts for an EV. Whole number. */
  size: number;
  /** Diesel four-wheel drive (only matters for Sabah non-saloon). */
  diesel4wd?: boolean;
}
export type Result =
  | { ok: true; sen: number; steps: string[]; ref: string; rounded: boolean }
  | { ok: false; reason: string };

const num = (n: number) => n.toLocaleString("en-MY");

const NOT_PRINTED = "JPJ hanya menyatakan kadar ini \"dikekalkan pada kadar sedia ada\" tanpa mencetak amaunnya.";

/** Rate from one table, with the working shown. null = JPJ does not print it. */
function fromTable(t: Table, size: number): { sen: number; steps: string[] } | null {
  let prevMax = 0;
  for (const b of t.bands) {
    if (b.max === null || size <= b.max) {
      if (b.sen === null) return null;
      const range = b.max === null ? `Melebihi ${num(prevMax)}${t.unit}` : `${num(prevMax + 1)}${t.unit} hingga ${num(b.max)}${t.unit}`;
      if (!b.per) return { sen: b.sen, steps: [`${range}: kadar tetap ${rm(b.sen)}`] };
      const extra = size - prevMax;
      const sen = b.sen + extra * b.per;
      return {
        sen,
        steps: [
          `${range}: kadar asas ${rm(b.sen)} + ${rm(b.per)} setiap ${t.unit} melebihi ${num(prevMax)}${t.unit}`,
          `${rm(b.sen)} + ${num(extra)} × ${rm(b.per)} = ${rm(sen)}`,
        ],
      };
    }
    prevMax = b.max;
  }
  return null; // unreachable: every table ends with max: null
}

const half = (sen: number) => Math.round(sen / 2);

export function lkm(i: Input): Result {
  if (!Number.isInteger(i.size) || i.size < 1) return { ok: false, reason: "Masukkan nombor bulat lebih daripada 0." };
  const moto = i.kind === "motosikal";

  if (i.ev) {
    if (i.region === "pangkor") return { ok: false, reason: "Garis panduan ZEV JPJ hanya menyebut Pulau Langkawi dan Labuan untuk kadar 50% - Pulau Pangkor tidak dinyatakan." };
    const island = i.region === "langkawi" || i.region === "labuan";
    const t = moto ? EV_MOTOSIKAL : EV_CAR;
    const r = fromTable(t, i.size)!;
    let { sen } = r;
    const steps = [...r.steps];
    if (moto && i.size > EV_MOTOSIKAL_FLAT_MAX) {
      if (island) return { ok: false, reason: "Garis panduan ZEV tidak menyatakan sama ada pengecualian 50% motosikal dan kadar 50% pulau digabungkan." };
      sen = half(sen);
      steps.push(`Pengecualian 50% daripada kadar asas (perenggan 1.3) = ${rm(sen)}`);
    }
    if (island) {
      const before = sen;
      sen = half(sen);
      steps.push(`Pulau Langkawi / Labuan: 50% (perenggan 12) = ${rm(sen)}`);
      return { ok: true, sen, steps, ref: `${t.ref}; ms 7 (12)`, rounded: before % 2 === 1 };
    }
    return { ok: true, sen, steps, ref: t.ref, rounded: false };
  }

  if (i.region === "sabah" && i.kind === "bukan-saloon" && i.diesel4wd)
    return { ok: false, reason: `Kenderaan pacuan empat roda diesel di Sabah: ${NOT_PRINTED} (ms 20)` };

  const sm = { motosikal: SM_MOTOSIKAL, "saloon-individu": SM_SALOON_INDIVIDU, "saloon-syarikat": SM_SALOON_SYARIKAT, "bukan-saloon": SM_BUKAN_SALOON }[i.kind];
  const sabah = { motosikal: SABAH_MOTOSIKAL, "saloon-individu": SABAH_SALOON, "saloon-syarikat": SABAH_SALOON, "bukan-saloon": SABAH_BUKAN_SALOON }[i.kind];
  const sarawak = { motosikal: SARAWAK_MOTOSIKAL, "saloon-individu": SARAWAK_SALOON, "saloon-syarikat": SARAWAK_SALOON, "bukan-saloon": SARAWAK_BUKAN_SALOON }[i.kind];
  const base = { semenanjung: sm, langkawi: sm, pangkor: sm, sabah, labuan: sabah, sarawak }[i.region];
  const island = i.region === "langkawi" || i.region === "pangkor" || i.region === "labuan";
  const islandRef = i.region === "labuan" ? "ms 25 (2.2)" : "ms 14 (1.2)";

  if (island && !moto && i.size <= 1000)
    return { ok: true, sen: ISLAND_SMALL_CAR_SEN, steps: [`1,000cc dan ke bawah: kadar tetap ${rm(ISLAND_SMALL_CAR_SEN)}`], ref: `Garis panduan petrol/diesel, ${islandRef}`, rounded: false };

  const r = fromTable(base, i.size);
  if (!r) return { ok: false, reason: `Motosikal 150cc dan ke bawah: ${NOT_PRINTED}` };
  if (!island) return { ok: true, ...r, ref: base.ref, rounded: false };
  const sen = half(r.sen);
  const where = i.region === "labuan" ? "Labuan: 50% daripada kadar Sabah" : "Pulau Langkawi / Pangkor: 50% daripada kadar Semenanjung";
  return { ok: true, sen, steps: [...r.steps, `${where} = ${rm(sen)}`], ref: `${base.ref}; ${islandRef}`, rounded: r.sen % 2 === 1 };
}
