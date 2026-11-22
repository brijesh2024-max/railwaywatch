import type { Sample } from "../shared/types";
export const demoTrail: Sample[] = Array.from({ length: 19 }, (_, i) => ({
  gps: {
    lat: 33.992 + i * 0.00012,
    lng: 74.826 + i * 0.000067 + Math.sin(i / 6) * 0.00021,
  },
  altitude: 24,
  battery: 82,
  speed: 3.2,
  time: "Sample",
}));

// Deterministic plan-view illustration of a ballasted track and fallen timber.
export function drawDemo(canvas: HTMLCanvasElement) {
  canvas.width = 1100;
  canvas.height = 620;
  const c = canvas.getContext("2d")!;
  let seed = 94218;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const xRail = (y: number) => 535 + (310 - y) * 0.6 + 35 * Math.sin(y / 270);
  c.fillStyle = "#666b47";
  c.fillRect(0, 0, 1100, 620);
  for (let i = 0; i < 32000; i++) {
    const x = rnd() * 1100,
      y = rnd() * 620,
      d = Math.abs(x - xRail(y)),
      n = rnd();
    const gravel = d < 175 + 16 * Math.sin(y / 42) + n * 20;
    const v = Math.floor(40 + n * 105);
    c.fillStyle = gravel
      ? "rgb(" + v + "," + (v - 2) + "," + (v - 8) + ")"
      : "rgb(" +
        Math.floor(48 + n * 60) +
        "," +
        Math.floor(58 + n * 60) +
        "," +
        Math.floor(34 + n * 40) +
        ")";
    c.beginPath();
    c.ellipse(
      x,
      y,
      1 + rnd() * (gravel ? 7 : 18),
      1 + rnd() * (gravel ? 4 : 8),
      rnd() * 3,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.save();
  c.transform(1, 0.38, -0.51, 1, 600, -110);
  for (let y = -100; y < 850; y += 35) {
    c.fillStyle = "rgba(19,22,16,.52)";
    c.fillRect(-112, y + 5, 228, 15);
    const n = Math.floor(63 + rnd() * 24);
    c.fillStyle = "rgb(" + n + "," + (n - 8) + "," + (n - 20) + ")";
    c.fillRect(-115, y, 230, 15);
    c.fillStyle = "#a3967a";
    c.fillRect(-112, y, 224, 2);
    for (const x of [-81, 66]) {
      c.fillStyle = "#464439";
      c.fillRect(x, y - 2, 16, 17);
      c.fillStyle = "#272923";
      c.fillRect(x + 2, y + 2, 4, 5);
    }
  }
  for (const x of [-74, 74]) {
    c.fillStyle = "#34372e";
    c.fillRect(x - 4, -120, 13, 1040);
    c.fillStyle = "#b1b0a6";
    c.fillRect(x - 4, -120, 7, 1040);
    c.fillStyle = "#e2dfd1";
    c.fillRect(x - 4, -120, 2, 1040);
  }
  c.translate(10, 330);
  c.rotate(-0.42);
  c.fillStyle = "rgba(15,22,16,.48)";
  c.fillRect(-86, 5, 202, 16);
  c.fillStyle = "#866648";
  c.fillRect(-89, -2, 203, 13);
  c.fillStyle = "#b4956d";
  c.fillRect(-89, -2, 203, 3);
  c.restore();
}
