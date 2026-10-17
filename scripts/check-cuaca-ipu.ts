// bun scripts/check-cuaca-ipu.ts - MET wording -> sky kind, period by hour, nearest location.
import { expect } from "bun:test";
import { cuacaAt, metDayAt, nearestMet, parseNow, periodAt, skyOf } from "../src/lib/cuaca";

expect(skyOf("Tiada Hujan"), "tiada hujan").toBe("cerah");
expect(skyOf("Ribut petir di beberapa tempat di kawasan pedalaman"), "ribut").toBe("ribut");
expect(skyOf("Hujan di kebanyakan tempat"), "hujan").toBe("hujan");
expect(skyOf("Jerebu"), "jerebu").toBe("jerebu");
expect([3, 6, 11, 12, 18, 19, 23].map(periodAt), "periods").toEqual(["morning", "morning", "morning", "afternoon", "afternoon", "night", "night"]);
expect(nearestMet(1.43, 103.89)?.name, "nearest Pasir Gudang").toBe("Pasir Gudang");
expect(nearestMet(0, 0), "nothing within 50 km").toBeNull();
const pg = nearestMet(1.43, 103.89)!;
const rows = new Map([[pg.id, { afternoon_forecast: "Ribut petir", night_forecast: null }]]) as never;
expect(cuacaAt(rows, 1.43, 103.89, "afternoon"), "cuacaAt").toEqual({ place: "Pasir Gudang", text: "Ribut petir", sky: "ribut" });
expect(cuacaAt(rows, 1.43, 103.89, "night"), "no text for the period").toBeNull();
expect(metDayAt(rows, 1.43, 103.89)?.afternoon, "metDayAt").toBe("Ribut petir");
expect(parseNow({ current: { weather_code: 61, temperature_2m: 26.6, precipitation: 0.4 } }), "parseNow").toEqual({ text: "Hujan ringan", temp: 27, rain: 0.4 });
expect(parseNow({ current: { weather_code: 61 } }), "parseNow incomplete").toBeNull();
console.log("cuaca-ipu: ok");
