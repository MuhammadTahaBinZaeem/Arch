# Liquid Glass AGS Bar (Hyprland) — AGS v2/v3

This folder now targets **modern AGS (v2/v3 generation)** using an `app.tsx` entrypoint.

## Files

- `app.tsx`: AGS v2/v3-style app entry
- `style.css`: segmented liquid-glass theme
- `config.js`: legacy AGS v1 version (kept only for reference)

## Install

```bash
mkdir -p ~/.config/ags
cp /workspace/Arch/ags/app.tsx ~/.config/ags/app.tsx
cp /workspace/Arch/ags/style.css ~/.config/ags/style.css
```

## Run / Reload

```bash
ags run ~/.config/ags/app.tsx
```

## Notes

- AGS v1 and AGS v2/v3 are not API-compatible; this port follows the current entrypoint model (`app.start`).
- This modernized version keeps the same liquid-glass look and core layout (workspaces, active window, clock).
- Right-side system modules from the legacy v1 service API are intentionally reduced in this version to avoid mixing deprecated interfaces.
- Polling/parsing avoids `jq`; JSON fields are decoded with Python so escaped quotes in window titles are handled correctly.
- Workspace state is polled once per monitor and shared across workspace buttons to avoid redundant shell polling.
