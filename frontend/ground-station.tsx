"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Battery,
  ClipboardList,
  Download,
  Flag,
  Gauge,
  Monitor,
  Mountain,
  Radio,
  Route,
  TrainTrack,
} from "lucide-react";
import { CATEGORIES, STATUSES } from "../shared/inspection.mjs";
import type { Capture, Finding, Mode, Sample } from "../shared/types";
import { CameraFeed } from "./components/camera-feed";
import { FlightPath } from "./components/flight-path";
import { CaptureReview, FindingDetail } from "./components/review";
import { demoTrail } from "./demo";
import { request } from "./request";

function FlightData({ sample }: { sample?: Sample }) {
  return (
    <section className="panel">
      <div className="panelHead">
        <h2>
          <Activity size={17} />
          Flight telemetry
        </h2>
      </div>
      <div className="metrics">
        {[
          [Mountain, "Altitude", sample?.altitude, "m"],
          [Gauge, "Ground speed", sample?.speed, "m/s"],
          [Battery, "Battery", sample?.battery, "%"],
        ].map(([I, label, n, unit]) => {
          const Icon = I as typeof Mountain;
          return (
            <div className="metric" key={String(label)}>
              <span>
                <Icon size={15} />
                {String(label)}
              </span>
              <strong>
                {n == null ? "—" : String(n)}{" "}
                <small>{n == null ? "" : String(unit)}</small>
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function GroundWorkspace({
  mode,
  changeMode,
}: {
  mode: Mode;
  changeMode: (mode: Mode) => void;
}) {
  const [view, setView] = useState<"monitor" | "history">("monitor"),
    [items, setItems] = useState<Finding[]>([]),
    [trail, setTrail] = useState<Sample[]>(mode === "demo" ? demoTrail : []),
    [vision, setVision] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(null),
    [detail, setDetail] = useState<Finding | null>(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [telemetryError, setTelemetryError] = useState(false),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState("All");
  const [now, setNow] = useState(0);
  useEffect(() => {
    let active = true;
    request<Finding[]>("detections?mode=" + mode)
      .then((r) => {
        if (active)
          setItems((existing) => {
            const seen = new Set(existing.map((item) => item.id));
            return [...existing, ...r.filter((item) => !seen.has(item.id))];
          });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    request<{ vision: boolean }>("health")
      .then((r) => {
        if (active) setVision(r.vision);
      })
      .catch(() => {});
    async function poll() {
      if (mode === "field") {
        try {
          const r = await request<Sample[]>("telemetry");
          if (active) {
            setTrail(r);
            setTelemetryError(false);
          }
        } catch {
          if (active) setTelemetryError(true);
        }
      }
      if (active) setNow(Date.now());
    }
    void poll();
    const timer = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [mode]);
  const last = trail.at(-1);
  const link =
    mode === "demo"
      ? "Simulated link"
      : telemetryError
        ? "Link unavailable"
        : !last
          ? "Awaiting telemetry"
          : Math.abs(now - Date.parse(last.time)) > 15000
            ? "Telemetry stale"
            : "Receiving telemetry";
  const recent =
    view === "monitor"
      ? items.slice(0, 4)
      : items.filter((f) => filter === "All" || f.status === filter);
  async function open(id: string) {
    try {
      setDetail(await request<Finding>("detections/" + id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function navigate(page: "monitor" | "history") {
    setView(page);
    setNotice("");
  }
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brandmark">
            <TrainTrack size={23} />
          </span>
          Railwatch
        </div>
        <div className="divider" />
        <span className="groundLabel">Ground station</span>
        <span className="institute">NIT Srinagar</span>
      </header>
      <main>
        <div className="context">
          <span>
            <Radio size={14} />
            Railway UAV programme
          </span>
          <label className="modeLabel">
            Workspace
            <select
              aria-label="Workspace"
              value={mode}
              onChange={(e) => changeMode(e.target.value as Mode)}
            >
              <option value="demo">Demo station</option>
              <option value="field">Field station</option>
            </select>
          </label>
        </div>
        <div className="pageTitle">
          <div>
            <h1>
              {view === "monitor" ? "Track inspection" : "Inspection history"}
            </h1>
            <p>
              {view === "monitor"
                ? "Drone camera, flight telemetry and track observations."
                : "Review captured evidence and update maintenance findings."}
            </p>
          </div>
          <a
            className="quiet export"
            href={"/api/report?mode=" + mode}
            download
          >
            <Download size={16} />
            Export report
          </a>
        </div>
        <nav aria-label="Station views">
          <button
            aria-current={view === "monitor" ? "page" : undefined}
            onClick={() => navigate("monitor")}
          >
            <Monitor size={16} />
            Monitor
          </button>
          <button
            aria-current={view === "history" ? "page" : undefined}
            onClick={() => navigate("history")}
          >
            <ClipboardList size={16} />
            Findings <span>{items.length}</span>
          </button>
        </nav>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {view === "monitor" && (
          <>
            <div className="mission">
              <div className="missionId">
                <span className="missionIcon">
                  <Route size={22} />
                </span>
                <div>
                  <small>INSPECTION WORKSPACE</small>
                  <h2>
                    {mode === "demo"
                      ? "Training section A"
                      : "Field inspection"}
                  </h2>
                </div>
              </div>
              <span
                className={"linkState " + (mode === "demo" ? "sample" : "")}
              >
                <i />
                {link}
              </span>
            </div>
            <div className="console">
              <CameraFeed
                mode={mode}
                sample={telemetryError ? undefined : last}
                onCapture={setCapture}
              />
              <aside>
                <FlightData sample={last} />
                <FlightPath trail={trail} />
              </aside>
            </div>
          </>
        )}
        <section className="panel findings">
          <div className="panelHead">
            <h2>
              <Flag size={16} />
              {view === "monitor" ? "Recent findings" : "All findings"}
            </h2>
            {view === "monitor" ? (
              <button className="textBtn" onClick={() => navigate("history")}>
                View history <ArrowRight size={14} />
              </button>
            ) : (
              <select
                aria-label="Filter by status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["All", ...STATUSES].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
          {recent.length ? (
            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Observation</th>
                    <th>Track section</th>
                    <th>Captured</th>
                    <th>Review status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          className="rowButton"
                          onClick={() => open(item.id)}
                        >
                          {CATEGORIES[item.category]}
                        </button>
                      </td>
                      <td>{item.section}</td>
                      <td>
                        {new Date(item.time).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <span className={"status " + item.status.toLowerCase()}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon"
                          aria-label={"Inspect " + CATEGORIES[item.category]}
                          onClick={() => open(item.id)}
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <span className="emptyIcon">
                <ClipboardList size={20} />
              </span>
              <div>
                <strong>
                  {loading
                    ? "Loading findings…"
                    : filter !== "All" && view === "history"
                      ? "No matching findings"
                      : "No findings recorded"}
                </strong>
                <p>
                  {filter !== "All" && view === "history"
                    ? "Choose another review status."
                    : "Capture a camera frame to record an observation."}
                </p>
              </div>
            </div>
          )}
        </section>
        <footer>
          <span>
            <TrainTrack size={13} />
            Railwatch ground station
          </span>
          <span>
            {mode === "demo" ? "Simulation workspace" : "Field workspace"}
          </span>
        </footer>
      </main>
      {capture && (
        <CaptureReview
          capture={capture}
          vision={vision}
          onClose={() => setCapture(null)}
          onSaved={(item) => {
            setItems((old) => [item, ...old]);
            setCapture(null);
            setNotice("Finding saved to inspection history.");
          }}
        />
      )}
      {detail && (
        <FindingDetail
          item={detail}
          onClose={() => setDetail(null)}
          onUpdated={(status) => {
            setItems((old) =>
              old.map((f) => (f.id === detail.id ? { ...f, status } : f)),
            );
            setDetail(null);
            setNotice("Review status saved.");
          }}
        />
      )}
    </>
  );
}
export function GroundStation() {
  const [mode, setMode] = useState<Mode>("demo");
  return <GroundWorkspace key={mode} mode={mode} changeMode={setMode} />;
}
