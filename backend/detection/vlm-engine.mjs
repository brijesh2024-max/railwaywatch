import { CATEGORIES, bbox, frame, range } from "../../shared/inspection.mjs";
const PROMPT = `Inspect this UAV camera frame of a railway track. Return only JSON {"detections":[{"category":"RAIL_CRACK","bbox":{"x":0,"y":0,"width":5,"height":5},"confidence":0.9}]}. Use only these categories: RAIL_CRACK, DAMAGED_RAIL, TRACK_OBSTRUCTION, FASTENER_DEFECT, LANDSLIDE. Return an empty detections array if the track is not visible, resolution is insufficient, or there is no visible candidate. Do not infer hidden faults. Coordinates are percentages of image dimensions from top left. Only report visible candidates with a confidence of at least 0.8.`;
export function parseSuggestions(content) {
  const raw = JSON.parse(
    content.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/gi, ""),
  );
  if (!Array.isArray(raw.detections)) throw Error("Invalid model response");
  return raw.detections
    .flatMap((item) => {
      if (
        !item ||
        !Object.hasOwn(CATEGORIES, item.category) ||
        item.category === "OTHER" ||
        !range(item.confidence, 0.8, 1) ||
        !item.bbox
      )
        return [];
      try {
        return [
          {
            category: item.category,
            bbox: bbox(item.bbox),
            confidence: item.confidence,
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);
}
export async function detect(image) {
  frame(image);
  const response = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.GLM_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.GLM_MODEL || "glm-4.5v",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    },
  );
  if (!response.ok) throw Error("Vision service unavailable");
  return parseSuggestions((await response.json()).choices[0].message.content);
}
