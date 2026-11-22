import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  finding,
  telemetry,
  workspace,
  requireValue,
  STATUSES,
} from "../shared/inspection.mjs";

export function openStore(file) {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS findings(
      id TEXT PRIMARY KEY, mode TEXT NOT NULL, time TEXT NOT NULL, meta TEXT NOT NULL,
      status TEXT NOT NULL, image TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS findings_mode_time ON findings(mode,time);
    CREATE TABLE IF NOT EXISTS telemetry(time TEXT PRIMARY KEY, sample TEXT NOT NULL);`);
  const unpack = ({ id, meta, status, ...other }) => ({
    ...JSON.parse(meta),
    id,
    status,
    ...other,
  });
  return {
    ping() {
      db.prepare("SELECT 1 FROM findings LIMIT 1").get();
    },
    save(data) {
      const { image, status, ...meta } = finding(data);
      const id = randomUUID();
      db.prepare("INSERT INTO findings VALUES(?,?,?,?,?,?)").run(
        id,
        meta.mode,
        meta.time,
        JSON.stringify(meta),
        status,
        image,
      );
      return { ...meta, id, status };
    },
    list(mode, evidence = false) {
      workspace(mode);
      return db
        .prepare(
          "SELECT id,meta,status" +
            (evidence ? ",image" : "") +
            " FROM findings WHERE mode=? ORDER BY time DESC,rowid DESC",
        )
        .all(mode)
        .map(unpack);
    },
    get(id) {
      const row = db
        .prepare("SELECT id,meta,status,image FROM findings WHERE id=?")
        .get(id);
      return row ? unpack(row) : null;
    },
    review(id, status) {
      requireValue(STATUSES.includes(status), "Invalid review status.");
      return (
        db.prepare("UPDATE findings SET status=? WHERE id=?").run(status, id)
          .changes > 0
      );
    },
    receive(data) {
      const sample = telemetry(data);
      db.prepare(
        "INSERT INTO telemetry VALUES(?,?) ON CONFLICT(time) DO UPDATE SET sample=excluded.sample",
      ).run(sample.time, JSON.stringify(sample));
      return sample;
    },
    trail() {
      return db
        .prepare("SELECT sample FROM telemetry ORDER BY time DESC LIMIT 120")
        .all()
        .reverse()
        .map((r) => JSON.parse(r.sample));
    },
    close: () => db.close(),
  };
}
export function station() {
  return (globalThis.__railwatchStore ??= openStore(
    process.env.RAILWATCH_DB ||
      resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH || "data", "station.sqlite"),
  ));
}
