/**
 * TNB domestic bill (Tarif Domestik Am, Peninsular Malaysia) for one calendar month of usage.
 * Integer sen throughout. Rounding and the ST / non-ST split follow TNB's own calculator
 * (mytnb.com.my/tariff, calculator-newDomestic.js): each charge is rounded to the sen separately
 * for the kWh under and over the threshold, half away from zero.
 * shortcut: one calendar month only - TNB splits a bill period that spans two months (AFA and
 * threshold per month), and taxes the whole bill when the period is under 28 days. Upgrade if
 * users ask to enter meter dates.
 */
import { AFA, AMBANG_SEMENTARA, EEI, TARIF } from "../data/tarif-elektrik";

export interface Param {
  /** AFA, 1/100 sen per kWh (negative = rebate). */
  afa: number;
  /** Protection threshold, kWh. */
  ambang: number;
}
export interface Caj {
  /** sen for the kWh at or under the threshold (not subject to ST) */
  nonSt: number;
  /** sen for the kWh over it (subject to ST) */
  st: number;
}
export interface Bil {
  kwh: number;
  kwhSt: number;
  kadar: { tenaga: number; afa: number; eei: number };
  tenaga: Caj;
  afa: Caj;
  kapasiti: Caj;
  rangkaian: Caj;
  runcit: Caj;
  eei: number;
  /** Usage charges before ST and KWTBB (TNB's "Caj Penggunaan Bulan Semasa"). */
  caj: number;
  cukai: number;
  kwtbb: number;
  /** Before TNB's rounding adjustment (penggenapan). */
  jumlah: number;
}

export const MAX_KWH = 99_999;

/** Integer n / d rounded half away from zero (d > 0). */
const bulat = (n: number, d: number) => Math.sign(n) * Math.floor((2 * Math.abs(n) + d) / (2 * d));

/** Threshold + AFA for a usage month "YYYY-MM"; null when TNB has not announced its AFA. */
export function paramBulan(bulan: string): Param | null {
  const afa = AFA[bulan];
  if (afa === undefined) return null;
  const sementara = bulan >= AMBANG_SEMENTARA.dari && bulan <= AMBANG_SEMENTARA.hingga;
  return { afa, ambang: sementara ? AMBANG_SEMENTARA.kwh : TARIF.ambang };
}

export function kiraBil(kwh: number, { afa, ambang }: Param): Bil {
  if (!Number.isInteger(kwh) || kwh < 0 || kwh > MAX_KWH) throw new RangeError(`kWh mesti nombor bulat 0-${MAX_KWH}`);
  const kwhSt = Math.max(0, kwh - ambang);
  const kwhNon = kwh - kwhSt;
  const lebih = kwhSt > 0;
  const per = (kadar: number): Caj => ({ nonSt: bulat(kwhNon * kadar, 100), st: bulat(kwhSt * kadar, 100) });
  const jumlahCaj = (c: Caj) => c.nonSt + c.st;

  const kadarTenaga = kwh > TARIF.hadTenagaTinggi ? TARIF.tenagaTinggi : TARIF.tenaga;
  const kadarEei = EEI.find((t) => kwh <= t.hingga)?.kadar ?? 0;
  const tenaga = per(kadarTenaga);
  const caj = { tenaga, afa: per(lebih ? afa : 0), kapasiti: per(TARIF.kapasiti), rangkaian: per(TARIF.rangkaian) };
  const runcit: Caj = { nonSt: 0, st: lebih ? TARIF.runcit : 0 };
  const eei = bulat(kwh * kadarEei, 100);

  // TNB spreads the incentive over the two parts by kWh, unrounded, then rounds each subtotal.
  const parts = [...Object.values(caj), runcit];
  const sumNon = parts.reduce((s, c) => s + c.nonSt, 0);
  const sumSt = parts.reduce((s, c) => s + c.st, 0);
  const subNon = kwh === 0 ? 0 : bulat(sumNon * kwh + eei * kwhNon, kwh);
  const subSt = kwh === 0 ? 0 : bulat(sumSt * kwh + eei * kwhSt, kwh);
  const cukai = lebih ? bulat(subSt * TARIF.cukaiPeratus, 100) : 0;
  // KWTBB is on energy + capacity + network less the incentive - not AFA or the retail charge.
  const asasKwtbb = jumlahCaj(tenaga) + jumlahCaj(caj.kapasiti) + jumlahCaj(caj.rangkaian) + eei;
  const kwtbb = kwh > TARIF.hadKwtbb ? bulat(asasKwtbb * TARIF.kwtbbPerSeribu, 1000) : 0;

  return {
    kwh,
    kwhSt,
    kadar: { tenaga: kadarTenaga, afa, eei: kadarEei },
    ...caj,
    runcit,
    eei,
    caj: subNon + subSt,
    cukai,
    kwtbb,
    jumlah: subNon + subSt + cukai + kwtbb,
  };
}
