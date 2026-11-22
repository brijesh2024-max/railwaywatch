import { station } from "../../../../backend/store.mjs";
import { detect } from "../../../../backend/detection/vlm-engine.mjs";
import {
  InputError,
  frame,
  workspace,
} from "../../../../shared/inspection.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
async function readBody(req) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new InputError("Send a JSON request.");
  const reader = req.body?.getReader();
  if (!reader) throw new InputError("Missing request body.");
  const parts = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 3000000) {
      await reader.cancel();
      throw new InputError("Frame is too large.");
    }
    parts.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(parts).toString());
    if (value && typeof value === "object" && !Array.isArray(value))
      return value;
  } catch {}
  throw new InputError("Expected a JSON object.");
}
async function handle(req, ctx) {
  try {
    const { path } = await ctx.params;
    const route = path.join("/");
    const mode = new URL(req.url).searchParams.get("mode") ?? "field";
    if (req.method === "GET") {
      if (route === "health") {
        station().ping();
        return json({ ready: true, vision: Boolean(process.env.GLM_API_KEY) });
      }
      if (route === "telemetry") return json(station().trail());
      if (route === "detections") return json(station().list(mode));
      if (path.length === 2 && path[0] === "detections") {
        const item = station().get(path[1]);
        return item ? json(item) : json({ error: "Finding not found." }, 404);
      }
      if (route === "report") {
        const findings = station().list(workspace(mode), true);
        return new Response(
          JSON.stringify(
            {
              project: "Drone for Railway Track Inspection",
              mode,
              exportedAt: new Date().toISOString(),
              findings,
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "Content-Disposition":
                'attachment; filename="railwatch-' + mode + '-report.json"',
            },
          },
        );
      }
    }
    if (req.method === "POST") {
      const data = await readBody(req);
      if (route === "telemetry") return json(station().receive(data), 201);
      if (route === "detections") return json(station().save(data), 201);
      if (route === "detect/image") {
        frame(data.image);
        if (!process.env.GLM_API_KEY)
          return json({ error: "Vision service is not configured." }, 503);
        try {
          return json({ detections: await detect(data.image) });
        } catch {
          return json(
            {
              error:
                "Vision analysis failed. You can still record a manual finding.",
            },
            502,
          );
        }
      }
    }
    if (
      req.method === "PATCH" &&
      path.length === 2 &&
      path[0] === "detections"
    ) {
      const data = await readBody(req);
      return station().review(path[1], data.status)
        ? json({ ok: true })
        : json({ error: "Finding not found." }, 404);
    }
    return json({ error: "Unknown endpoint." }, 404);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, 400);
    console.error("Station request failed", error.name);
    return json({ error: "Station storage is unavailable." }, 500);
  }
}
export { handle as GET, handle as POST, handle as PATCH };
