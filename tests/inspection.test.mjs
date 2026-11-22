import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../backend/store.mjs";
import { parseSuggestions } from "../backend/detection/vlm-engine.mjs";
import { finding, telemetry } from "../shared/inspection.mjs";

const image = "data:image/jpeg;base64,/9j/2Q==";
const data = {
  mode: "field",
  section: "Test section",
  note: "Visible obstruction",
  time: "2025-01-01T00:00:00Z",
  category: "TRACK_OBSTRUCTION",
  source: "Image",
  method: "Operator",
  image,
};
test("evidence survives restart and demo and field reports are separate", () => {
  const dir = mkdtempSync(join(tmpdir(), "railwatch-")),
    path = join(dir, "test.sqlite");
  let db = openStore(path);
  try {
    const record = db.save(data);
    db.save({ ...data, mode: "demo", source: "Simulation" });
    db.close();
    db = openStore(path);
    assert.equal(db.list("field").length, 1);
    assert.equal(db.list("field")[0].image, undefined);
    assert.equal(db.list("demo", true)[0].source, "Simulation");
    assert.equal(db.list("field", true)[0].image, image);
    assert.equal(db.review(record.id, "Resolved"), true);
    assert.equal(db.get(record.id).status, "Resolved");
    assert.equal(db.review("unknown", "Open"), false);
    assert.throws(() => db.review(record.id, "fake"));
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("coordinates, categories, frame and workspace are validated", () => {
  for (const patch of [
    { gps: { lat: 91, lng: 0 } },
    { source: "Simulation" },
    { category: "TRAFFIC" },
    { image: "data:image/svg+xml,foo" },
    { bbox: { x: 99, y: 0, width: 5, height: 5 } },
    { section: " " },
  ])
    assert.throws(() => finding({ ...data, ...patch }));
  assert.equal(finding(data).gps, null);
});
test("telemetry accepts zero values and preserves order through retries", () => {
  const db = openStore(":memory:");
  try {
    for (const seconds of [2, 1, 2])
      db.receive({
        time: "2025-01-01T00:00:0" + seconds + "Z",
        gps: { lat: 0, lng: 0 },
        speed: 0,
        battery: 0,
      });
    const trail = db.trail();
    assert.equal(trail.length, 2);
    assert.equal(trail[1].battery, 0);
    assert.equal(trail[0].altitude, null);
    assert.throws(() => telemetry({ gps: { lat: 0, lng: 0 }, battery: 101 }));
  } finally {
    db.close();
  }
});
test("model suggestions require an allowed category, credible score and valid image box", () => {
  const good = {
    category: "RAIL_CRACK",
    confidence: 0.87,
    bbox: { x: 10, y: 20, width: 5, height: 4 },
  };
  const detections = [
    { ...good, category: "TRAFFIC" },
    good,
    { ...good, confidence: 0.22 },
    { ...good, bbox: {} },
  ];
  assert.deepEqual(parseSuggestions(JSON.stringify({ detections })), [good]);
  assert.deepEqual(parseSuggestions('{"detections":[]}'), []);
  assert.throws(() => parseSuggestions("{}"));
});
