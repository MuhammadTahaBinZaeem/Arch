# Liquid Glass AGS Bar (Hyprland)

This folder replaces the previous Waybar config with an **AGS** implementation that aims for a 1:1 module layout and styling match:

- Left: Hyprland workspaces + active window title
- Center: Clock
- Right: Network, audio, battery, tray

## What was improved

- Workspace buttons now mirror Waybar's active/default icon behavior (`` vs ``).
- Module rendering is wrapped consistently to avoid class/selector bugs.
- Network, volume, and battery states now update safely and preserve warning/critical styling.
- Tray rendering is rebuilt on service updates to prevent stale icon rows.

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

- This is an AGS v1-style setup (`config.js`).
- The original React liquid-glass shader/refraction effect cannot be reproduced exactly in GTK CSS; this theme matches the look as closely as possible.
- For stronger frosted blur, enable Hyprland blur in compositor settings.
