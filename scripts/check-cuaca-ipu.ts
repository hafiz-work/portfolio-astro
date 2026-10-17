// bun scripts/check-cuaca-ipu.ts - MET wording -> sky kind, period by hour, nearest location.
import { cuacaAt, metDayAt, nearestMet, parseNow, periodAt, skyOf } from "../src/lib/cuaca";

const eq = (a: unknown, b: unknown, what: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
};
eq(skyOf("Tiada Hujan"), "cerah", "tiada hujan");
eq(skyOf("Ribut petir di beberapa tempat di kawasan pedalaman"), "ribut", "ribut");
eq(skyOf("Hujan di kebanyakan tempat"), "hujan", "hujan");
eq(skyOf("Jerebu"), "jerebu", "jerebu");
eq([3, 6, 11, 12, 18, 19, 23].map(periodAt), ["morning", "morning", "morning", "afternoon", "afternoon", "night", "night"], "periods");
eq(nearestMet(1.43, 103.89)?.name, "Pasir Gudang", "nearest Pasir Gudang");
eq(nearestMet(0, 0), null, "nothing within 50 km");
const pg = nearestMet(1.43, 103.89)!;
const rows = new Map([[pg.id, { afternoon_forecast: "Ribut petir", night_forecast: null }]]) as never;
eq(cuacaAt(rows, 1.43, 103.89, "afternoon"), { place: "Pasir Gudang", text: "Ribut petir", sky: "ribut" }, "cuacaAt");
eq(cuacaAt(rows, 1.43, 103.89, "night"), null, "no text for the period");
eq(metDayAt(rows, 1.43, 103.89)?.afternoon, "Ribut petir", "metDayAt");
eq(parseNow({ current: { weather_code: 61, temperature_2m: 26.6, precipitation: 0.4 } }), { text: "Hujan ringan", temp: 27, rain: 0.4 }, "parseNow");
eq(parseNow({ current: { weather_code: 61 } }), null, "parseNow incomplete");
console.log("cuaca-ipu: ok");
