#!/usr/bin/env python3
"""RunCat for Hyprland/Waybar on Arch Linux.

Prints a Waybar-compatible JSON payload with a running cat animation
whose speed depends on CPU usage.
"""

from __future__ import annotations

import argparse
import json
import signal
import sys
import time
from dataclasses import dataclass


CAT_FRAMES = [
    "🐈💨", "🐈‍⬛💨", "🐈", "🐈‍⬛",
]


@dataclass
class CpuSnapshot:
    total: int
    idle: int


def read_cpu_snapshot() -> CpuSnapshot:
    """Return total and idle jiffies from /proc/stat."""
    with open('/proc/stat', 'r', encoding='utf-8') as file:
        cpu = file.readline().split()

    values = list(map(int, cpu[1:]))
    idle = values[3] + values[4] if len(values) > 4 else values[3]
    total = sum(values)
    return CpuSnapshot(total=total, idle=idle)


def calculate_cpu_usage(prev: CpuSnapshot, curr: CpuSnapshot) -> float:
    """Calculate CPU usage percent across two snapshots."""
    total_delta = curr.total - prev.total
    idle_delta = curr.idle - prev.idle
    if total_delta <= 0:
        return 0.0
    usage = 100.0 * (1.0 - idle_delta / total_delta)
    return max(0.0, min(100.0, usage))


def frame_step(cpu_usage: float, max_step: int) -> int:
    """Convert CPU usage to animation speed."""
    # Keep animation alive at low usage and scale with load.
    return 1 + int((cpu_usage / 100.0) * max_step)


def build_payload(frame: str, cpu_usage: float) -> str:
    """Build Waybar JSON output."""
    cls = "high" if cpu_usage >= 80 else "mid" if cpu_usage >= 40 else "low"
    payload = {
        "text": frame,
        "alt": f"{cpu_usage:.1f}%",
        "tooltip": f"CPU Usage: {cpu_usage:.1f}%",
        "class": cls,
    }
    return json.dumps(payload, ensure_ascii=False)


def run(interval: float, max_step: int) -> None:
    """Run the continuous animation loop."""
    idx = 0
    prev = read_cpu_snapshot()

    while True:
        time.sleep(interval)
        curr = read_cpu_snapshot()
        usage = calculate_cpu_usage(prev, curr)
        prev = curr

        idx = (idx + frame_step(usage, max_step)) % len(CAT_FRAMES)
        print(build_payload(CAT_FRAMES[idx], usage), flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='RunCat for Hyprland + Waybar')
    parser.add_argument('--interval', type=float, default=0.4, help='refresh interval in seconds')
    parser.add_argument('--max-step', type=int, default=5, help='max animation acceleration at 100%% CPU')
    return parser.parse_args()


if __name__ == '__main__':
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    args = parse_args()
    try:
        run(interval=args.interval, max_step=max(1, args.max_step))
    except (BrokenPipeError, KeyboardInterrupt):
        sys.exit(0)
