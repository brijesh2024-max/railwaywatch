export const CATEGORIES = {
  RAIL_CRACK: "Rail crack",
  DAMAGED_RAIL: "Damaged rail",
  TRACK_OBSTRUCTION: "Track obstruction",
  FASTENER_DEFECT: "Fastener defect",
  LANDSLIDE: "Landslide or debris",
  OTHER: "Other observation",
};
export const STATUSES = ["Open", "Reviewed", "Resolved"];
export class InputError extends Error {}
export function requireValue(condition, message) {
  if (!condition) throw new InputError(message);
}
export function range(value, min, max) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}
export function gps(value) {
  if (value == null) return null;
  requireValue(
    range(value.lat, -90, 90) && range(value.lng, -180, 180),
    "Invalid latitude or longitude.",
  );
  return { lat: value.lat, lng: value.lng };
}
export function bbox(value) {
  if (value == null) return null;
  const { x, y, width, height } = value;
  requireValue(
    range(x, 0, 100) &&
      range(y, 0, 100) &&
      range(width, 0.01, 100 - x + 0.000001) &&
      range(height, 0.01, 100 - y + 0.000001),
    "Invalid evidence box.",
  );
  return { x, y, width, height };
}
export function frame(value) {
  requireValue(
    typeof value === "string" &&
      value.length <= 2800000 &&
      /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value),
    "A JPEG evidence frame under 2 MB is required.",
  );
  return value;
}
export function timestamp(value) {
  requireValue(
    typeof value === "string" &&
      Number.isFinite(Date.parse(value)) &&
      Date.parse(value) <= Date.now() + 30000,
    "Invalid capture time.",
  );
  return new Date(value).toISOString();
}
export function workspace(value) {
  requireValue(["demo", "field"].includes(value), "Choose a valid workspace.");
  return value;
}
export function telemetry(data) {
  const position = gps(data.gps);
  requireValue(position, "GPS coordinates are required.");
  for (const [key, lo, hi] of [
    ["battery", 0, 100],
    ["altitude", -500, 10000],
    ["speed", 0, 500],
  ]) {
    if (data[key] != null)
      requireValue(range(data[key], lo, hi), "Invalid " + key + ".");
  }
  return {
    gps: position,
    time: timestamp(data.time ?? new Date().toISOString()),
    battery: data.battery ?? null,
    altitude: data.altitude ?? null,
    speed: data.speed ?? null,
  };
}
export function finding(data) {
  requireValue(
    Object.hasOwn(CATEGORIES, data.category),
    "Choose a defect category.",
  );
  requireValue(
    typeof data.section === "string" &&
      data.section.trim().length > 0 &&
      data.section.trim().length <= 100,
    "Enter a track section (1–100 characters).",
  );
  requireValue(
    typeof data.note === "string" && data.note.length <= 1000,
    "Notes may contain up to 1,000 characters.",
  );
  requireValue(
    ["Camera", "Image", "Video", "Simulation"].includes(data.source),
    "Unknown media source.",
  );
  requireValue(
    ["Operator", "Vision suggestion"].includes(data.method),
    "Unknown observation method.",
  );
  requireValue(
    (workspace(data.mode) === "demo") === (data.source === "Simulation"),
    "Media source and workspace must match.",
  );
  return {
    mode: data.mode,
    category: data.category,
    section: data.section.trim(),
    note: data.note.trim(),
    time: timestamp(data.time),
    source: data.source,
    method: data.method,
    gps: gps(data.gps),
    bbox: bbox(data.bbox),
    image: frame(data.image),
    status: "Open",
  };
}
