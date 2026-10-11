// Minimal GTFS Realtime (protobuf) reader for vehicle positions - just the fields
// /bas shows, no protobuf library. Wire format: each field is a varint key
// (field number << 3 | wire type); types used by GTFS-RT: 0 varint, 1 fixed64,
// 2 length-delimited (strings, nested messages), 5 fixed32 (floats).
// Spec: https://gtfs.org/realtime/reference/  Check: bun scripts/check-gtfs-rt.ts

export interface Vehicle {
  id: string;
  label: string;
  plate: string;
  tripId: string;
  routeId: string;
  lat: number;
  lng: number;
  bearing: number | null;
  /** m/s as sent; null when absent. */
  speed: number | null;
  /** Unix seconds; 0 when absent. */
  timestamp: number;
}

type Fields = Map<number, (number | Uint8Array)[]>;

/** One message level: field number -> raw values (numbers for varint/fixed, bytes for length-delimited). */
function readFields(buf: Uint8Array): Fields {
  const out: Fields = new Map();
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let i = 0;
  const varint = () => {
    let result = 0;
    let mul = 1;
    for (; ;) {
      if (i >= buf.length) throw new Error("truncated varint");
      const b = buf[i++];
      result += (b & 0x7f) * mul; // float maths: safe beyond 32 bits (timestamps)
      if (b < 0x80) return result;
      mul *= 128;
    }
  };
  while (i < buf.length) {
    const key = varint();
    const field = Math.floor(key / 8);
    const type = key % 8;
    let value: number | Uint8Array;
    if (type === 0) value = varint();
    else if (type === 1) {
      value = view.getUint32(i, true) + view.getUint32(i + 4, true) * 2 ** 32;
      i += 8;
    } else if (type === 2) {
      const len = varint();
      if (i + len > buf.length) throw new Error("truncated bytes");
      value = buf.subarray(i, i + len);
      i += len;
    } else if (type === 5) {
      value = view.getFloat32(i, true);
      i += 4;
    } else throw new Error(`unsupported wire type ${type}`);
    const list = out.get(field) ?? [];
    list.push(value);
    out.set(field, list);
  }
  return out;
}

const dec = new TextDecoder();
const msg = (f: Fields, n: number) => {
  const v = f.get(n)?.[0];
  return v instanceof Uint8Array ? readFields(v) : new Map() as Fields;
};
const str = (f: Fields, n: number) => {
  const v = f.get(n)?.[0];
  return v instanceof Uint8Array ? dec.decode(v) : "";
};
const num = (f: Fields, n: number) => {
  const v = f.get(n)?.[0];
  return typeof v === "number" ? v : null;
};

/** FeedMessage bytes -> vehicles with a position. Bad bytes throw. */
export function decodeVehiclePositions(bytes: Uint8Array): Vehicle[] {
  const feed = readFields(bytes);
  const out: Vehicle[] = [];
  for (const e of feed.get(2) ?? []) {
    if (!(e instanceof Uint8Array)) continue;
    const entity = readFields(e);
    const vp = msg(entity, 4); // FeedEntity.vehicle
    const pos = msg(vp, 2); // VehiclePosition.position
    const lat = num(pos, 1);
    const lng = num(pos, 2);
    if (lat == null || lng == null || (lat === 0 && lng === 0)) continue;
    const trip = msg(vp, 1); // TripDescriptor
    const veh = msg(vp, 8); // VehicleDescriptor
    out.push({
      id: str(veh, 1) || str(entity, 1),
      label: str(veh, 2),
      plate: str(veh, 3),
      tripId: str(trip, 1),
      routeId: str(trip, 5),
      lat,
      lng,
      bearing: num(pos, 3),
      speed: num(pos, 5),
      timestamp: num(vp, 5) ?? 0,
    });
  }
  return out;
}
