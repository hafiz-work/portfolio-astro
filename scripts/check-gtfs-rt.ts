// bun scripts/check-gtfs-rt.ts - the hand-written protobuf reader against a feed
// encoded here by hand (offline), plus the Malaysia filter.
import { decodeVehiclePositions } from "../src/lib/gtfs-rt";
import { inMalaysia } from "../src/lib/bas";

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
const fail = (m: string) => { throw new Error(m); };
if (v.length !== 1) fail(`expected 1 vehicle, got ${v.length}`);
const [x] = v;
if (x.id !== "WVB4208" || x.routeId !== "U3000" || x.tripId !== "trip_1" || x.plate !== "WVB4208") fail(JSON.stringify(x));
if (Math.abs(x.lat - 3.14) > 1e-5 || Math.abs(x.lng - 101.69) > 1e-4 || x.bearing !== 220) fail("position");
if (x.timestamp !== 1791716559) fail(`timestamp ${x.timestamp}`);
let threw = false;
try { decodeVehiclePositions(new Uint8Array([0x12, 0x05, 0x01])); } catch { threw = true; }
if (!threw) fail("truncated input must throw");
if (inMalaysia(0.0027, 0.0155) || !inMalaysia(3.14, 101.69) || !inMalaysia(1.55, 110.35)) fail("inMalaysia");
console.log("gtfs-rt: ok");
