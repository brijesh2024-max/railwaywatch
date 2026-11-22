"""Forward GPS and flight status from one MAVLink vehicle to the local station."""
import argparse
import json
import math
import sys
import time
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="udpin:127.0.0.1:14551")
    parser.add_argument("--system-id", type=int, default=1)
    parser.add_argument("--station", default="http://127.0.0.1:3000")
    args = parser.parse_args()
    from pymavlink import mavutil
    link = mavutil.mavlink_connection(args.input, autoreconnect=True)
    fix = 0
    fix_time = battery_time = sent = float("-inf")
    battery = None
    while True:
        message = link.recv_match(blocking=True, timeout=1)
        if message is None or message.get_srcSystem() != args.system_id:
            continue
        now = time.monotonic()
        kind = message.get_type()
        if kind == "GPS_RAW_INT":
            fix, fix_time = message.fix_type, now
        elif kind == "SYS_STATUS":
            battery, battery_time = message.battery_remaining, now
        elif kind == "GLOBAL_POSITION_INT" and fix >= 3 and now - fix_time <= 5 and now - sent >= 1:
            sample = {
                "time": datetime.now(timezone.utc).isoformat(),
                "gps": {"lat": message.lat / 1e7, "lng": message.lon / 1e7},
                "altitude": message.relative_alt / 1000,
                "speed": math.hypot(message.vx, message.vy) / 100,
                "battery": battery if now - battery_time <= 10 and 0 <= battery <= 100 else None,
            }
            sent = now
            request = Request(args.station.rstrip("/") + "/api/telemetry",
                              data=json.dumps(sample).encode(),
                              headers={"Content-Type": "application/json"})
            try:
                with urlopen(request, timeout=2):
                    pass
            except (URLError, TimeoutError) as error:
                print(f"Ground station unavailable: {error}", file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
