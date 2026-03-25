# Kurve (Hyprland Edition)

This directory ports the **core Kurve pipeline** from the KDE Plasma widget to a **Hyprland + Waybar** workflow on Arch Linux.

Upstream Kurve (`luisbocanegra/kurve`) is a Plasma plasmoid and mixes:
- QML canvas drawing + gradients
- a C++/websocket process monitor fallback stack
- runtime CAVA config generation.

Hyprland does not consume Plasma widgets/QML, so the practical port is:
1. Keep CAVA generation + parsing model from upstream.
2. Replace QML drawing (`drawCanvas.js`) with compact unicode bar rendering for Waybar.
3. Emit Waybar JSON frames continuously.

---

## Deep analysis of what was adapted

### 1) CAVA config strategy (from `Cava.qml`)
Upstream builds config dynamically (framerate, bars, input, smoothing, EQ, etc.).

This port preserves that strategy via `build_cava_config()` in Python with analogous fields:
- `[general]` (`framerate`, `bars`, cutoffs)
- `[input]` (`method`, `source`, sample format)
- `[output]` ASCII raw mode to stdout
- `[smoothing]` (`noise_reduction`, `monstercat`, `waves`)

Result: nearly identical signal acquisition behavior while targeting Hyprland tooling.

### 2) Frame parser semantics
Upstream expects CAVA ASCII frames split by `;` and strips trailing `;`.

`parse_frame()` mirrors this behavior and always normalizes to exactly `bars` values.

### 3) Visualizer engine replacement
Upstream renders Bars/Wave/Blocks on QML Canvas with gradients and circle mode. Waybar cannot draw arbitrary canvas content, so this port uses a text visualizer:
- maps amplitude to `▁▂▃▄▅▆▇█`
- preserves idle behavior and “active vs idle” state classes
- keeps smoothing feel using EMA + monstercat-like cross-bin bleed.

### 4) State + idle model
Upstream includes idle timers to pause visuals when no signal is present.

This port keeps the same concept using `idle_seconds` and emits Waybar classes:
- `kurve active`
- `kurve idle`

This lets CSS styling mimic visual state transitions.

---

## Files

- `kurve_hyprland.py` → main runner (CAVA spawn + parse + render + Waybar JSON output)
- `kurve.toml` → default config
- `examples/waybar-config.jsonc` → Waybar module example
- `examples/waybar-style.css` → CSS styling example
- `systemd/kurve-waybar.service` → optional user service

---

## Arch Linux install

```bash
sudo pacman -S --needed cava python
mkdir -p ~/.config/kurve ~/.local/bin
cp kurve/kurve.toml ~/.config/kurve/kurve.toml
install -m 755 kurve/kurve_hyprland.py ~/.local/bin/kurve_hyprland.py
```

Add module config from `examples/waybar-config.jsonc` into your Waybar config and merge CSS from `examples/waybar-style.css`.

Then restart Waybar:

```bash
pkill waybar && waybar &
```

---

## Quick validation

Generate and inspect the CAVA config:

```bash
~/.local/bin/kurve_hyprland.py --config ~/.config/kurve/kurve.toml --print-cava-config
```

Run directly (prints JSON lines):

```bash
~/.local/bin/kurve_hyprland.py --config ~/.config/kurve/kurve.toml
```

If you see JSON frames while audio is playing, integration is working.

---


## AGS rebuild (new)

If you moved from Plasma/Waybar modules to **AGS**, use `kurve/ags/kurve.js`.
It ports Kurve's core canvas animation modes (bars/wave/blocks + circle mode) using GTK/Cairo and CAVA ASCII frames.

See: `kurve/ags/README.md`

## Notes

- This is intentionally **Hyprland-native deployment** (Waybar module) instead of trying to host KDE QML in Hyprland.
- If you want graphical wave/gradient parity with Plasma, next step is a GTK/SDL layer-shell renderer, but this text-first implementation is robust and lightweight for Arch setups.
