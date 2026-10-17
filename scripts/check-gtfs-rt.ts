// bun scripts/check-gtfs-rt.ts - the hand-written protobuf reader against a feed
// encoded here by hand (offline), plus the Malaysia filter.
import { expect } from "bun:test";
import { decodeVehiclePositions } from "../src/lib/gtfs-rt";
import { inMalaysia } from "../src/lib/pengangkutan-awam";

const varint = (n: number) => {
  const out: number[] = [];
  do {
    let b = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) b |= 0x80;
    out.push(b);
  } while (n > 0);
  return out;
};
const key = (field: number, type: number) => varint(field * 8 + type);
const bytes = (field: number, b: number[]) => [...key(field, 2), ...varint(b.length), ...b];
const str = (field: number, s: string) => bytes(field, [...new TextEncoder().encode(s)]);
const f32 = (field: number, x: number) => {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setFloat32(0, x, true);
  return [...key(field, 5), ...buf];
};
const u = (field: number, n: number) => [...key(field, 0), ...varint(n)];

const vehiclePosition = [
  ...bytes(1, [...str(1, "trip_1"), ...str(5, "U3000")]), // trip: trip_id, route_id
  ...bytes(2, [...f32(1, 3.14), ...f32(2, 101.69), ...f32(3, 220)]), // position
  ...u(5, 1791716559), // timestamp (> 2^31)
  ...bytes(8, [...str(1, "WVB4208"), ...str(3, "WVB4208")]), // vehicle: id, plate
];
const feed = new Uint8Array([
  ...bytes(1, [...str(1, "2.0")]), // header
  ...bytes(2, [...str(1, "e1"), ...bytes(4, vehiclePosition)]),
  ...bytes(2, [...str(1, "e2"), ...bytes(4, [...bytes(2, [...f32(1, 0), ...f32(2, 0)])])]), // (0,0) dropped
]);
const v = decodeVehiclePositions(feed);
expect(v.length, "vehicles").toBe(1);
const [x] = v;
expect(x, "ids").toMatchObject({ id: "WVB4208", routeId: "U3000", tripId: "trip_1", plate: "WVB4208" });
expect(x.lat, "position lat").toBeWithin(3.14 - 1e-5, 3.14 + 1e-5);
expect(x.lng, "position lng").toBeWithin(101.69 - 1e-4, 101.69 + 1e-4);
expect(x.bearing, "position bearing").toBe(220);
expect(x.timestamp, "timestamp").toBe(1791716559);
expect(() => decodeVehiclePositions(new Uint8Array([0x12, 0x05, 0x01])), "truncated input must throw").toThrow();
expect(inMalaysia(0.0027, 0.0155), "inMalaysia (0,0)").toBe(false);
expect(inMalaysia(3.14, 101.69), "inMalaysia KL").toBe(true);
expect(inMalaysia(1.55, 110.35), "inMalaysia Kuching").toBe(true);
console.log("gtfs-rt: ok");
