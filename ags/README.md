# Liquid Glass AGS Bar (Hyprland)

This folder contains an **AGS-only** bar implementation with:

- Left: Hyprland workspaces + active window title
- Center: Clock
- Right: Network, audio, battery, tray

## Files

- `config.js`: AGS bar and module logic
- `style.css`: segmented liquid-glass theme

## Install

```bash
mkdir -p ~/.config/ags
cp /workspace/Arch/ags/config.js ~/.config/ags/config.js
cp /workspace/Arch/ags/style.css ~/.config/ags/style.css
```

## Launch / Reload

```bash
ags -q
ags
```

## Notes

- AGS v1-style setup (`config.js`).
- For stronger frosted blur, enable Hyprland blur in compositor settings.
