"use client";
import { useEffect, useRef, useState } from "react";
import { X, ScanLine } from "lucide-react";
import { CATEGORIES, STATUSES } from "../../shared/inspection.mjs";
import type {
  Box,
  Capture,
  Category,
  Finding,
  Suggestion,
} from "../../shared/types";
import { BboxOverlay } from "./bbox-overlay";
import { request } from "../request";
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialogHead">
        <h2>{title}</h2>
        <button className="icon" aria-label="Close dialog" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Evidence({
  image,
  box,
  category,
}: {
  image: string;
  box: Box | null;
  category: Category;
}) {
  return (
    <div className="evidence">
      <img src={image} alt="Captured inspection evidence" />
      <BboxOverlay bbox={box} category={category} />
    </div>
  );
}
export function CaptureReview({
  capture,
  vision,
  onClose,
  onSaved,
}: {
  capture: Capture;
  vision: boolean;
  onClose: () => void;
  onSaved: (item: Finding) => void;
}) {
  const [category, setCategory] = useState<Category>("TRACK_OBSTRUCTION"),
    [section, setSection] = useState(
      capture.mode === "demo" ? "Training section A" : "",
    ),
    [note, setNote] = useState("");
  const [lat, setLat] = useState(capture.gps?.lat.toFixed(6) ?? ""),
    [lng, setLng] = useState(capture.gps?.lng.toFixed(6) ?? "");
  const [options, setOptions] = useState<Suggestion[]>([]),
    [selected, setSelected] = useState<Suggestion | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  async function analyze() {
    setBusy("analyze");
    setError("");
    setInfo("");
    setOptions([]);
    setSelected(null);
    try {
      const r = await request<{ detections: Suggestion[] }>(
        "detect/image",
        "POST",
        { image: capture.image },
      );
      setOptions(r.detections);
      setInfo(
        r.detections.length
          ? "Select a candidate to attach its evidence box."
          : "No visible candidate returned.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (Boolean(lat.trim()) !== Boolean(lng.trim())) {
      setError("Enter both coordinates or leave both blank.");
      return;
    }
    setBusy("save");
    try {
      const result = await request<Finding>("detections", "POST", {
        ...capture,
        section,
        note,
        category,
        gps: lat.trim() ? { lat: Number(lat), lng: Number(lng) } : null,
        bbox: selected?.bbox ?? null,
        method: selected ? "Vision suggestion" : "Operator",
      });
      onSaved(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Dialog
      title="Review captured frame"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="dialogBody">
        <Evidence
          image={capture.image}
          box={selected?.bbox ?? null}
          category={category}
        />
        <div className="metaLine">
          <span>
            {capture.source} · {new Date(capture.time).toLocaleTimeString()}
          </span>
          {capture.mode === "demo" && <span>Demo evidence</span>}
        </div>
        {vision && capture.mode === "field" && (
          <button className="quiet" disabled={!!busy} onClick={analyze}>
            <ScanLine size={15} />
            {busy === "analyze"
              ? "Analyzing…"
              : "Send frame for vision analysis"}
          </button>
        )}
        {info && <p role="status">{info}</p>}
        {options.map((s, i) => (
          <button
            key={i}
            className="quiet candidate"
            aria-pressed={selected === s}
            onClick={() => {
              setCategory(s.category);
              setSelected(s);
            }}
          >
            {CATEGORIES[s.category]} · {Math.round(s.confidence * 100)}%
          </button>
        ))}
        <form onSubmit={save}>
          <div className="fields">
            <label>
              Track section
              <input
                required
                maxLength={100}
                placeholder="Section or chainage"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </label>
            <label>
              Defect category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as Category);
                  setSelected(null);
                }}
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option value={k} key={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Latitude
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                placeholder="Optional"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                placeholder="Optional"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </label>
          </div>
          <label>
            Observation
            <textarea
              maxLength={1000}
              rows={2}
              placeholder="Describe what is visible in the frame"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="dialogActions">
            <button
              type="button"
              className="quiet"
              disabled={!!busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="primary" disabled={!!busy}>
              {busy === "save" ? "Saving…" : "Save finding"}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
export function FindingDetail({
  item,
  onClose,
  onUpdated,
}: {
  item: Finding;
  onClose: () => void;
  onUpdated: (s: string) => void;
}) {
  const [status, setStatus] = useState(item.status),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function update() {
    setBusy(true);
    try {
      await request("detections/" + item.id, "PATCH", { status });
      onUpdated(status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={CATEGORIES[item.category]}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="dialogBody">
        {item.image && (
          <Evidence
            image={item.image}
            box={item.bbox}
            category={item.category}
          />
        )}
        <dl className="details">
          {Object.entries({
            Section: item.section,
            Source: item.source,
            Captured: new Date(item.time).toLocaleString(),
            GPS: item.gps ? item.gps.lat + ", " + item.gps.lng : "Unspecified",
            Method: item.method,
            Observation: item.note || "—",
          }).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <label>
          Review status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialogActions">
          <button className="primary" disabled={busy} onClick={update}>
            Save status
          </button>
        </div>
      </div>
    </Dialog>
  );
}
