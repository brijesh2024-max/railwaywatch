import { MapPin, Navigation } from "lucide-react";
import type { Sample } from "../../shared/types";
export function FlightPath({ trail }: { trail: Sample[] }) {
  const lat = trail.map((p) => p.gps.lat),
    lon = trail.map((p) => p.gps.lng);
  const minLat = Math.min(...lat),
    maxLat = Math.max(...lat),
    minLon = Math.min(...lon),
    maxLon = Math.max(...lon);
  const scaleX = Math.max(
    0.01,
    Math.cos((((maxLat + minLat) / 2) * Math.PI) / 180),
  );
  const scale = Math.min(
    224 / Math.max((maxLon - minLon) * scaleX, 0.00001),
    105 / Math.max(maxLat - minLat, 0.00001),
  );
  const points = trail.map((p) => [
    150 + (p.gps.lng - (minLon + maxLon) / 2) * scaleX * scale,
    75 - (p.gps.lat - (minLat + maxLat) / 2) * scale,
  ]);
  const end = points.at(-1);
  return (
    <section className="panel pathPanel">
      <div className="panelHead">
        <h2>
          <Navigation size={16} />
          Flight path
        </h2>
        <span className="mono">GPS</span>
      </div>
      <div className="plot">
        <span className="north">↑ N</span>
        {end ? (
          <svg
            viewBox="0 0 300 150"
            role="img"
            aria-label="Relative GPS flight path, north up"
          >
            <polyline
              points={points.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#43816b"
              strokeWidth="3"
            />
            <circle
              cx={points[0][0]}
              cy={points[0][1]}
              r="4"
              fill="white"
              stroke="#43816b"
            />
            <circle
              cx={end[0]}
              cy={end[1]}
              r="10"
              fill="#91c4aa"
              opacity=".5"
            />
            <circle cx={end[0]} cy={end[1]} r="4.5" fill="#164b39" />
          </svg>
        ) : (
          <span>Awaiting GPS position</span>
        )}
      </div>
      <div className="coordinates">
        <MapPin size={13} />
        {trail.length
          ? lat.at(-1)!.toFixed(5) + ", " + lon.at(-1)!.toFixed(5)
          : "No coordinates received"}
      </div>
    </section>
  );
}
