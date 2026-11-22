"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Upload, Video, Square } from "lucide-react";
import { drawDemo } from "../demo";
import type { Capture, Mode, Sample, Source } from "../../shared/types";

export function CameraFeed({
  mode,
  sample,
  onCapture,
}: {
  mode: Mode;
  sample?: Sample;
  onCapture: (frame: Capture) => void;
}) {
  const [source, setSource] = useState<Source | null>(
    mode === "demo" ? "Simulation" : null,
  );
  const [url, setUrl] = useState(""),
    [ready, setReady] = useState(mode === "demo"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    video = useRef<HTMLVideoElement>(null),
    image = useRef<HTMLImageElement>(null),
    file = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null),
    attempt = useRef(0);
  function stop() {
    attempt.current++;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  useEffect(() => {
    if (canvas.current) drawDemo(canvas.current);
    return stop;
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    if (source === "Camera" && video.current)
      video.current.srcObject = stream.current;
  }, [source]);
  async function camera() {
    stop();
    const token = attempt.current;
    setReady(false);
    setSource(null);
    setUrl("");
    setMessage("");
    setBusy(true);
    try {
      if (!navigator.mediaDevices)
        throw Error("Camera access requires localhost or HTTPS.");
      const feed = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (attempt.current !== token) {
        feed.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = feed;
      setSource("Camera");
      feed.getVideoTracks()[0].onended = () => {
        setReady(false);
        setMessage("Camera disconnected.");
      };
    } catch (e) {
      if (attempt.current === token)
        setMessage(e instanceof Error ? e.message : "Camera unavailable.");
    } finally {
      if (attempt.current === token) setBusy(false);
    }
  }
  function importFile(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      setMessage("Select a supported image or video.");
      return;
    }
    stop();
    setBusy(false);
    setMessage("");
    setReady(false);
    setUrl(URL.createObjectURL(f));
    setSource(f.type.startsWith("image/") ? "Image" : "Video");
  }
  function capture() {
    const el =
      source === "Simulation"
        ? canvas.current
        : source === "Image"
          ? image.current
          : video.current;
    if (!el || !source) return;
    const w =
      el instanceof HTMLVideoElement
        ? el.videoWidth
        : el instanceof HTMLImageElement
          ? el.naturalWidth
          : el.width;
    const h =
      el instanceof HTMLVideoElement
        ? el.videoHeight
        : el instanceof HTMLImageElement
          ? el.naturalHeight
          : el.height;
    if (!w || !h) {
      setMessage("The frame is still loading.");
      return;
    }
    const out = document.createElement("canvas"),
      scale = Math.min(1, 1500 / Math.max(w, h));
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    out.getContext("2d")!.drawImage(el, 0, 0, out.width, out.height);
    const fresh =
      sample &&
      (mode === "demo" ||
        (source === "Camera" &&
          Math.abs(Date.now() - Date.parse(sample.time)) < 15000));
    onCapture({
      mode,
      source,
      image: out.toDataURL("image/jpeg", 0.84),
      gps: fresh ? sample.gps : null,
      time: new Date().toISOString(),
    });
  }
  function failed() {
    setReady(false);
    setMessage(
      "This media could not be decoded. Try a JPEG, PNG or browser-supported MP4.",
    );
  }
  return (
    <section className="panel feedPanel">
      <div className="panelHead">
        <h2>
          <Video size={17} />
          Inspection camera
        </h2>
        <span className="mono">
          {mode === "demo" ? "SIM / 01" : "CAM / 01"}
        </span>
      </div>
      <div className="viewport">
        {source === "Simulation" ? (
          <canvas
            aria-label="Simulated aerial view of ballasted rails and fallen timber"
            ref={canvas}
          />
        ) : source === "Image" ? (
          <img
            src={url}
            ref={image}
            alt="Imported inspection frame"
            onLoad={() => setReady(true)}
            onError={failed}
          />
        ) : source === "Video" || source === "Camera" ? (
          <video
            key={source + url}
            ref={video}
            src={url || undefined}
            autoPlay={source === "Camera"}
            muted
            playsInline
            controls={source === "Video"}
            onLoadedData={() => setReady(true)}
            onError={failed}
          />
        ) : (
          <div className="noCamera">
            <Camera size={30} />
            <strong>No camera source</strong>
            <span>Connect a camera or open an inspection file.</span>
          </div>
        )}
        {source && (
          <>
            <span className="feedTag">
              <i />
              {source === "Simulation"
                ? "SIMULATED FRAME"
                : source === "Camera"
                  ? "CAMERA"
                  : source.toUpperCase()}
            </span>
            <div className="reticle" aria-hidden="true">
              +
            </div>
          </>
        )}
      </div>
      <div className="feedActions">
        {mode === "field" ? (
          <>
            <button
              className="quiet"
              onClick={
                source === "Camera"
                  ? () => {
                      stop();
                      setReady(false);
                      setSource(null);
                    }
                  : camera
              }
              disabled={busy}
            >
              {source === "Camera" ? (
                <Square size={15} />
              ) : (
                <Camera size={15} />
              )}{" "}
              {source === "Camera"
                ? "Stop camera"
                : busy
                  ? "Connecting…"
                  : "Camera"}
            </button>
            <button className="quiet" onClick={() => file.current?.click()}>
              <Upload size={15} />
              Open file
            </button>
            <input
              hidden
              ref={file}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        ) : (
          <span className="feedHint">Nadir view · sample track</span>
        )}
        <button className="primary" disabled={!ready} onClick={capture}>
          <ScanLine size={16} />
          Capture frame
        </button>
      </div>
      {message && (
        <p role="alert" className="error">
          {message}
        </p>
      )}
    </section>
  );
}
