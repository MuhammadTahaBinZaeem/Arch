#!/usr/bin/env python3
"""Kurve for Hyprland/Waybar.

Adaptation of core Kurve ideas from KDE Plasma widget:
- generates CAVA config dynamically (like Cava.qml)
- parses ASCII output values
- applies optional smoothing/noise floor
- renders a compact text visualizer for Waybar custom modules
"""

from __future__ import annotations

import argparse
import json
import shutil
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    import tomllib  # Python 3.11+
except ModuleNotFoundError:  # pragma: no cover
    import tomli as tomllib  # type: ignore

BARS = "▁▂▃▄▅▆▇█"


@dataclass
class Config:
    bars: int = 24
    framerate: int = 60
    lower_cutoff_freq: int = 50
    higher_cutoff_freq: int = 10000
    sensitivity_enabled: bool = False
    sensitivity: int = 100
    noise_reduction: float = 0.77
    monstercat: float = 1.5
    waves: int = 0
    input_method: str = "pulse"
    input_source: str = "auto"
    sample_rate: int = 44100
    sample_bits: int = 16
    input_channels: int = 2
    autoconnect: int = 1
    active: int = 1
    remix: int = 0
    virtual: int = 1
    output_channels: str = "stereo"
    mono_option: str = "average"
    reverse: int = 0
    ascii_max_range: int = 100
    empty_char: str = "·"
    use_gradient: bool = False
    idle_seconds: float = 1.8
    output_class: str = "kurve"
    tooltip: bool = True


def load_config(path: Path) -> Config:
    if not path.exists():
        return Config()
    with path.open("rb") as f:
        raw = tomllib.load(f)
    data = raw.get("kurve", {})
    cfg = Config()
    for key, value in data.items():
        if hasattr(cfg, key):
            setattr(cfg, key, value)
    return cfg


def build_cava_config(cfg: Config) -> str:
    lines = [
        "[general]",
        f"framerate={cfg.framerate}",
        f"bars={cfg.bars}",
        "autosens=1",
        f"lower_cutoff_freq={cfg.lower_cutoff_freq}",
        f"higher_cutoff_freq={cfg.higher_cutoff_freq}",
    ]
    if cfg.sensitivity_enabled:
        lines.append(f"sensitivity={cfg.sensitivity}")

    lines.extend(
        [
            "[input]",
            f"method={cfg.input_method}",
            f"source={cfg.input_source}",
            f"sample_rate={cfg.sample_rate}",
            f"sample_bits={cfg.sample_bits}",
            f"channels={cfg.input_channels}",
            f"autoconnect={cfg.autoconnect}",
            f"active={cfg.active}",
            f"remix={cfg.remix}",
            f"virtual={cfg.virtual}",
            "[output]",
            f"channels={cfg.output_channels}",
            f"mono_option={cfg.mono_option}",
            f"reverse={cfg.reverse}",
            "method=raw",
            "raw_target=/dev/stdout",
            "data_format=ascii",
            f"ascii_max_range={cfg.ascii_max_range}",
            "[smoothing]",
            f"noise_reduction={cfg.noise_reduction}",
            f"monstercat={cfg.monstercat}",
            f"waves={cfg.waves}",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_frame(line: str, bars: int) -> list[int]:
    data = line.strip().rstrip(";")
    if not data:
        return [0] * bars
    vals = []
    for part in data.split(";"):
        try:
            vals.append(max(0, int(part)))
        except ValueError:
            vals.append(0)
    if len(vals) < bars:
        vals.extend([0] * (bars - len(vals)))
    return vals[:bars]


def ema_smooth(values: list[float], alpha: float = 0.35) -> list[float]:
    out: list[float] = []
    prev = 0.0
    for v in values:
        cur = alpha * v + (1 - alpha) * prev
        out.append(cur)
        prev = cur
    return out


def apply_monstercat(values: list[float], factor: float = 1.25) -> list[float]:
    """Simple adjacent bleed inspired by Kurve/CAVA monstercat behavior."""
    n = len(values)
    out = values[:]
    for i in range(n):
        peak = out[i]
        for j in range(n):
            dist = abs(i - j)
            if dist == 0:
                continue
            propagated = values[j] / (dist * factor)
            peak = max(peak, propagated)
        out[i] = peak
    return out


def render_unicode(values: list[float], max_range: int, empty_char: str) -> str:
    glyph_max = len(BARS) - 1
    chars: list[str] = []
    for v in values:
        if v <= 0:
            chars.append(empty_char)
            continue
        idx = min(glyph_max, int(round((v / max_range) * glyph_max)))
        chars.append(BARS[idx])
    return "".join(chars)


def make_waybar_json(text: str, cfg: Config, active: bool) -> str:
    payload = {
        "text": text,
        "class": [cfg.output_class, "active" if active else "idle"],
        "alt": "kurve",
    }
    if cfg.tooltip:
        payload["tooltip"] = f"Kurve • {'playing' if active else 'idle'}"
    return json.dumps(payload, ensure_ascii=False)


def stream_frames(proc: subprocess.Popen[str]) -> Iterable[str]:
    assert proc.stdout is not None
    while True:
        line = proc.stdout.readline()
        if line == "" and proc.poll() is not None:
            break
        if line:
            yield line


def run(cfg: Config) -> int:
    if shutil.which("cava") is None:
        print("cava not found in PATH", file=sys.stderr)
        return 1

    cmd = ["cava", "-p", "/dev/stdin"]
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )

    def _stop(*_: object) -> None:
        if proc.poll() is None:
            proc.terminate()
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)

    assert proc.stdin is not None
    proc.stdin.write(build_cava_config(cfg))
    proc.stdin.close()

    last_active = time.monotonic()

    for line in stream_frames(proc):
        values = parse_frame(line, cfg.bars)
        normalized = [min(cfg.ascii_max_range, v) for v in values]
        smooth = ema_smooth(normalized)
        if cfg.monstercat > 0:
            smooth = apply_monstercat(smooth, max(0.01, cfg.monstercat))
        active = any(v > 0 for v in values)
        if active:
            last_active = time.monotonic()
        idle = (time.monotonic() - last_active) >= cfg.idle_seconds
        text = render_unicode(smooth, cfg.ascii_max_range, cfg.empty_char)
        print(make_waybar_json(text, cfg, active=not idle), flush=True)

    stderr = proc.stderr.read().strip() if proc.stderr else ""
    if stderr:
        print(stderr, file=sys.stderr)
    return proc.returncode or 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Kurve audio visualizer for Hyprland/Waybar")
    p.add_argument(
        "--config",
        default=str(Path.home() / ".config/kurve/kurve.toml"),
        help="Path to TOML config",
    )
    p.add_argument("--print-cava-config", action="store_true", help="Print generated CAVA config and exit")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    cfg = load_config(Path(args.config).expanduser())
    if args.print_cava_config:
        print(build_cava_config(cfg), end="")
        return 0
    return run(cfg)


if __name__ == "__main__":
    raise SystemExit(main())
