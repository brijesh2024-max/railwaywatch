# Railwatch · Drone for Railway Track Inspection

A local ground station for the NIT Srinagar railway inspection UAV. An operator can watch a camera or recorded file, freeze a frame, attach its location, and record a finding for maintenance review.

## Run on Windows

Install Node.js 22.13 or newer. In PowerShell, open this folder and run:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:3000. The development and production commands listen on loopback. For a production build, run `npm.cmd run build` followed by `npm.cmd start`. Run the backend tests with `npm.cmd test`.

## Try an inspection

1. Start in **Demo station**. The camera illustration and flight path are synthetic. Click **Capture frame**, choose **Track obstruction**, describe the fallen timber, and save.
2. Open the finding in **Findings**, inspect its saved frame, and change its status to **Reviewed** or **Resolved**.
3. Choose **Export report** to download JSON containing the findings, timestamps, status, coordinates and embedded JPEG evidence for the selected workspace. Demo and field records are stored separately.
4. Switch to **Field station**. Select **Camera** and grant access to a browser-visible USB/UVC camera or capture card. Alternatively select **Open file** for a supported image or video. For a recording, seek to the desired frame before capture.
5. Enter the track section or chainage and a defect category. The capture timestamp is the time the operator freezes the frame. Images and recordings accept manually entered GPS. A live camera capture uses the latest flight fix if received within 15 seconds. The operator can edit or clear either location before saving.

Findings support rail cracks, damaged rails, obstructions, fastener defects, landslides or debris, and other observations. Each saved finding appears in the findings log with its review status. Records and flight samples persist in `data/station.sqlite`. Set `RAILWATCH_DB` to override this location.

## Flight controller and camera

The station monitors one UAV. The optional receive-only bridge reads a MAVLink stream forwarded by a ground-control application. Configure that application to forward telemetry to UDP port 14551 on the same computer. With the station running, open a second terminal:

```powershell
python -m pip install pymavlink
python tools/mavlink_bridge.py --input udpin:127.0.0.1:14551 --system-id 1
```

Set the system ID to match the vehicle. The bridge uses GPS_RAW_INT fix status, GLOBAL_POSITION_INT position/relative altitude/horizontal velocity and SYS_STATUS remaining battery. It timestamps samples at receipt, waits for a recent 3D fix and posts at most once per second. Video uses a separate browser camera input. The GPS plot shows up to 120 position samples, north up, on an offline relative-coordinate grid.

A different telemetry adapter can POST JSON directly to `/api/telemetry`. Latitude and longitude are decimal degrees, altitude is metres relative to home, speed is metres per second and battery is a percentage. Unknown optional measurements can be null. This PowerShell example writes one test point to the **field** telemetry database:

```powershell
$sample = @{
  time = [DateTime]::UtcNow.ToString("o")
  gps = @{ lat = 33.994; lng = 74.827 }
  altitude = 24.0
  speed = 3.2
  battery = 82
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/telemetry -ContentType application/json -Body $sample
```

## Optional vision analysis

Copy `.env.example` to `.env.local`, set `GLM_API_KEY` and optionally `GLM_MODEL`, then restart. **Send frame for vision analysis** sends the selected field frame to the GLM vision service. Candidates include a category, a model-reported confidence and an image-relative box. Select a candidate and save to add it to the log. An empty response produces zero candidates. Manual review works offline. Model performance on railway imagery and the physical UAV require field validation.

## Deploy on Railway

Connect the GitHub repository to a Railway service and attach a volume at `/app/data`. Set `RAILWAY_RUN_UID=0` to enable writes to the root-owned volume. The included Dockerfile runs the tests and production build. The service listens on the port supplied by Railway and checks `/api/health` for database availability. Generate an HTTPS domain after the health check passes.

The current station shares its findings and telemetry with everyone who can reach it. Use a restricted deployment for field operations or use synthetic records for a public demonstration.

## Software layout and origin

Adapted from [dipesh097/City_Vision at 9c0babd](https://github.com/dipesh097/City_Vision/tree/9c0babd1093b633279f2d13739c53804b4d57fd1). The adaptation retains Next.js App Router, React, TypeScript, Lucide icons, the GLM image request pattern and percentage-based evidence overlays. It replaces the urban fleet, road taxonomy and mock history with UAV telemetry, railway findings and SQLite evidence storage.

- `frontend/` contains the operator console, camera capture, GPS plot and evidence review.
- `shared/` contains railway categories, types and validation rules.
- `backend/` contains the SQLite store and optional vision adapter.
- `src/app/api/` exposes the monitoring API. GET `/api/health` reports vision availability. GET/POST `/api/telemetry` reads or supplies positions. GET/POST `/api/detections` lists or records findings. GET/PATCH `/api/detections/{id}` reads evidence or changes status. POST `/api/detect/image` analyzes one JPEG data URL. GET `/api/report` exports evidence. List and report requests accept `?mode=field` or `?mode=demo`.
- `tools/mavlink_bridge.py` forwards the flight controller's telemetry to the local API.
