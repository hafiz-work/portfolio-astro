// bun scripts/check-bil-elektrik.ts - TNB domestic bill vs TNB's own worked examples.
// Expected figures are copied from the sources in docs/sources/tnb (see SHA256SUMS there).
import { expect } from "bun:test";
import { AMBANG_SEMENTARA } from "../src/data/tarif-elektrik";
import { kiraBil, paramBulan } from "../src/lib/bil-elektrik";

type Want = Partial<Record<"tenaga" | "afa" | "kapasiti" | "rangkaian" | "runcit" | "eei" | "kwtbb" | "cukai" | "jumlah", number>>;
const check = (name: string, b: ReturnType<typeof kiraBil>, want: Want) => {
  const got: Record<string, number> = {
    tenaga: b.tenaga.nonSt + b.tenaga.st,
    afa: b.afa.nonSt + b.afa.st,
    kapasiti: b.kapasiti.nonSt + b.kapasiti.st,
    rangkaian: b.rangkaian.nonSt + b.rangkaian.st,
    runcit: b.runcit.nonSt + b.runcit.st,
    eei: b.eei,
    kwtbb: b.kwtbb,
    cukai: b.cukai,
    jumlah: b.jumlah,
  };
  for (const [k, v] of Object.entries(want)) expect(got[k], `${name} ${k} (sen)`).toBe(v);
};

// "Fahami. Guna. Nikmati." posters (mytnb.com.my/tariff/PDF/fahami-guna-nikmati-penggunaan-*-kwj.pdf,
// one page each), 600 kWh protection threshold. AFA rate is the one the poster's own AFA line implies.
const p600 = { ambang: 600 };
check("300 kWh poster", kiraBil(300, { ...p600, afa: 380 }), {
  tenaga: 8109, afa: 0, kapasiti: 1365, rangkaian: 3855, runcit: 0, eei: -6750, kwtbb: 0, cukai: 0, jumlah: 6579,
});
check("600 kWh poster", kiraBil(600, { ...p600, afa: 380 }), {
  tenaga: 16218, afa: 0, kapasiti: 2730, rangkaian: 7710, runcit: 0, eei: -5400, kwtbb: 340, cukai: 0, jumlah: 21598,
});
// 1,000 kWh poster: AFA line 35.90 = 1000 x 3.59 sen. Its ST line reads 16.06 but its own
// total RM508.24 only adds up with 16.01 - the total is asserted, the misprinted line is not.
check("1000 kWh poster", kiraBil(1000, { ...p600, afa: 359 }), {
  tenaga: 27030, afa: 3590, kapasiti: 4550, rangkaian: 12850, runcit: 1000, eei: -500, kwtbb: 703, jumlah: 50824,
});
// 1,501 kWh poster: whole bill at 37.03 sen once usage passes 1,500 kWh; AFA 57.04 = 1501 x 3.80 sen.
check("1501 kWh poster", kiraBil(1501, { ...p600, afa: 380 }), {
  tenaga: 55582, afa: 5704, kapasiti: 6830, rangkaian: 19288, runcit: 1000, eei: 0, kwtbb: 1307, cukai: 4277, jumlah: 93988,
});

// Guide to Electricity Tariff (guide-to-electricity-tariff.pdf), printed p.29 / PDF p.31: sample bill,
// Domestik Am, 625 kWh, 600 kWh threshold. Its AFA is split over two calendar months (not modelled
// here), so only the AFA-independent lines are asserted: the ST / non-ST split per line and KWTBB.
{
  const b = kiraBil(625, { ...p600, afa: 0 });
  expect(b.kwhSt, "sample bill kWh subject to ST").toBe(25);
  expect(b.tenaga.nonSt, "sample bill energy non-ST").toBe(16218); expect(b.tenaga.st, "sample bill energy ST").toBe(676);
  expect(b.kapasiti.nonSt, "sample bill capacity non-ST").toBe(2730); expect(b.kapasiti.st, "sample bill capacity ST").toBe(114);
  expect(b.rangkaian.nonSt, "sample bill network non-ST").toBe(7710); expect(b.rangkaian.st, "sample bill network ST").toBe(321);
  expect(b.runcit.nonSt, "sample bill retail non-ST").toBe(0); expect(b.runcit.st, "sample bill retail ST").toBe(1000);
  expect(b.eei, "sample bill EE incentive (-0.075 x 625)").toBe(-4688);
  expect(b.kwtbb, "sample bill KWTBB").toBe(369);
}

// Boundaries - rules from the guide (tariff schedule p.38, EEI table p.16, KWTBB/ST p.22) and the
// 18 Sep 2026 TNB press release (800 kWh protection for usage Sep-Dec 2026).
expect(kiraBil(1500, { ...p600, afa: 0 }).kadar.tenaga, "1500 kWh energy rate").toBe(2703);
expect(kiraBil(1501, { ...p600, afa: 0 }).kadar.tenaga, "1501 kWh energy rate").toBe(3703);
expect(kiraBil(200, { ...p600, afa: 0 }).kadar.eei, "200 kWh EEI rate").toBe(-2500);
expect(kiraBil(201, { ...p600, afa: 0 }).kadar.eei, "201 kWh EEI rate").toBe(-2450);
expect(kiraBil(1000, { ...p600, afa: 0 }).kadar.eei, "1000 kWh EEI rate").toBe(-50);
expect(kiraBil(1001, { ...p600, afa: 0 }).kadar.eei, "1001 kWh EEI rate").toBe(0);
expect(kiraBil(300, { ...p600, afa: 0 }).kwtbb, "300 kWh no KWTBB").toBe(0);
expect(kiraBil(301, { ...p600, afa: 0 }).kwtbb, "301 kWh pays KWTBB").toBeGreaterThan(0);
for (const [kwh, ambang, kena] of [[600, 600, false], [601, 600, true], [800, 800, false], [801, 800, true]] as const) {
  const b = kiraBil(kwh, { ambang, afa: 361 });
  expect(b.runcit.st > 0, `${kwh} kWh @${ambang} retail charge`).toBe(kena);
  expect(b.afa.nonSt + b.afa.st > 0, `${kwh} kWh @${ambang} AFA`).toBe(kena);
  expect(b.cukai > 0, `${kwh} kWh @${ambang} service tax`).toBe(kena);
  expect(b.kwhSt, `${kwh} kWh @${ambang} kWh subject to ST`).toBe(kena ? 1 : 0);
}
expect(kiraBil(0, { ...p600, afa: 0 }).jumlah, "0 kWh").toBe(0);

// Month -> threshold + AFA. Press release: 800 kWh for usage Sep-Dec 2026. AFA: Jul/Aug 2026 from the
// posters above, Oct 2026 = +3.61 sen/kWh (Single Buyer AFA page, checked 2026-10-14).
expect(paramBulan("2026-08")?.ambang, "Aug 2026 threshold").toBe(600);
expect(paramBulan("2026-09")?.ambang, "Sep 2026 threshold").toBe(800);
expect(AMBANG_SEMENTARA.hingga, "800 kWh protection ends with Dec 2026 usage").toBe("2026-12");
expect(paramBulan("2026-07")?.afa, "Jul 2026 AFA").toBe(359);
expect(paramBulan("2026-08")?.afa, "Aug 2026 AFA").toBe(380);
expect(paramBulan("2026-10")?.afa, "Oct 2026 AFA").toBe(361);
expect(paramBulan("2027-01"), "AFA not announced yet -> no month").toBeNull();

// Input validation: whole kWh only.
for (const bad of [-1, 1.5, NaN, Infinity, 1_000_000]) expect(() => kiraBil(bad, { ...p600, afa: 0 }), `rejects ${bad} kWh`).toThrow();

const b = kiraBil(1000, { ...p600, afa: 359 });
console.log("check-bil-elektrik: ok", `1000 kWh = RM${(b.jumlah / 100).toFixed(2)}`, `(ST ${(b.cukai / 100).toFixed(2)})`);
