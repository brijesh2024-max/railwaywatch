import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST, PATCH } from "../src/app/api/[...path]/route.js";

test("field inspection API saves, reviews and exports the same evidence", async () => {
  process.env.RAILWATCH_DB = ":memory:";
  const api = (method, path, data) => {
    const url = new URL("/api/" + path, "http://localhost");
    const request = new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    const handler = { GET, POST, PATCH }[method];
    return handler(request, {
      params: Promise.resolve({ path: url.pathname.slice(5).split("/") }),
    });
  };
  const time = new Date().toISOString();
  const position = { lat: 34.01, lng: 74.83 };
  assert.equal(
    (
      await api("POST", "telemetry", {
        gps: position,
        time,
        battery: 77,
        altitude: 22,
      })
    ).status,
    201,
  );
  const [sample] = await (await api("GET", "telemetry")).json();
  assert.deepEqual(sample.gps, position);
  const image = "data:image/jpeg;base64,/9j/2Q==";
  const created = await api("POST", "detections", {
    image,
    time,
    source: "Camera",
    mode: "field",
    gps: position,
    section: "Test A",
    category: "DAMAGED_RAIL",
    note: "Review frame",
    method: "Operator",
  });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  assert.equal(
    (await api("PATCH", "detections/" + id, { status: "Reviewed" })).status,
    200,
  );
  const detail = await (await api("GET", "detections/" + id)).json();
  assert.equal(detail.image, image);
  assert.equal(detail.status, "Reviewed");
  const report = await api("GET", "report?mode=field");
  assert.match(report.headers.get("Content-Disposition"), /attachment/);
  assert.deepEqual((await report.json()).findings, [detail]);
  assert.equal(
    (await (await api("GET", "report?mode=demo")).json()).findings.length,
    0,
  );
  assert.equal(
    (await api("POST", "telemetry", { gps: { lat: 200, lng: 5 } })).status,
    400,
  );
  assert.equal((await api("GET", "detections/missing")).status, 404);
});
