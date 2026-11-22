import { CATEGORIES } from "../../shared/inspection.mjs";
import type { Box, Category } from "../../shared/types";
// Adapted from City Vision's BboxOverlay. The wrapper follows the image's intrinsic aspect ratio.
export function BboxOverlay({
  bbox,
  category,
}: {
  bbox: Box | null;
  category: Category;
}) {
  if (!bbox) return null;
  return (
    <span
      className="bbox"
      style={{
        left: bbox.x + "%",
        top: bbox.y + "%",
        width: bbox.width + "%",
        height: bbox.height + "%",
      }}
    >
      <span>{CATEGORIES[category]}</span>
    </span>
  );
}
