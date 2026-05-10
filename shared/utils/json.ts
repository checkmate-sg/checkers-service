import { ObjectId } from "mongodb";

export function toJSONSafe(value: any): any {
  if (value instanceof ObjectId) return value.toHexString();

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map(toJSONSafe);

  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toJSONSafe(v);
    }
    return out;
  }

  return value;
}
