# Kurve AGS Port (GTK/Cairo)

This AGS-focused rebuild ports the same visual modes from upstream Kurve canvas code and keeps CAVA as the audio backend.

## What was fixed

- Corrected CAVA process spawning and pipe handling (stdin/stdout/stderr descriptors are handled explicitly).
- Added cleanup on window exit so the spawned CAVA process is terminated.
- Reworked wave drawing to use quadratic-to-cubic conversion so it follows Kurve's original pathing behavior instead of rough cubic approximations.
- Reworked blocks rendering to keep active and inactive block colors/gradients separate and consistent.

## Dependencies

```bash
sudo pacman -S --needed cava gjs gtk3
```

## Run

```bash
gjs /workspace/Arch/kurve/ags/kurve.js
```

## Fidelity statement

This version intentionally mirrors upstream draw mode structure and formulas from `drawCanvas.js`:

- Bars: rect + circle
- Wave: rect + circle
- Blocks: rect + circle

To match your old setup 1:1, keep the same Kurve-style parameters in `CONFIG` (`bars`, `barWidth`, `barGap`, `style`, `circleMode`, `circleModeSize`, smoothing fields, etc.).


## Preview

A generated frame preview is included at `kurve/ags/preview.svg`.
