import { CATEGORIES } from "./inspection.mjs";
export type Category = keyof typeof CATEGORIES;
export type Mode = "demo" | "field";
export type GPS = { lat: number; lng: number };
export type Box = { x: number; y: number; width: number; height: number };
export type Sample = {
  time: string;
  gps: GPS;
  altitude: number | null;
  speed: number | null;
  battery: number | null;
};
export type Source = "Camera" | "Image" | "Video" | "Simulation";
export type Capture = {
  image: string;
  time: string;
  source: Source;
  gps: GPS | null;
  mode: Mode;
};
export type Finding = Omit<Capture, "image"> & {
  id: string;
  status: string;
  note: string;
  section: string;
  category: Category;
  bbox: Box | null;
  method: string;
  image?: string;
};
export type Suggestion = { category: Category; bbox: Box; confidence: number };
