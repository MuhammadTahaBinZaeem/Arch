# Liquid Glass AGS Bar (Hyprland) — AGS v2/v3

This folder now targets **modern AGS (v2/v3 generation)** using an `app.tsx` entrypoint.

## Files

- `app.tsx`: AGS v2/v3-style app entry
- `style.css`: segmented liquid-glass theme
- `config.js`: legacy AGS v1 version (kept only for reference)

## Install

```bash
# Arch / Hyprland (recommended):
# install AGS v3 from AUR + required runtime libs
paru -S aylurs-gtk-shell-git astal-io astal3 astal4 gtk4-layer-shell

# copy this config
mkdir -p ~/.config/ags
cp /workspace/Arch/ags/app.tsx ~/.config/ags/app.tsx
cp /workspace/Arch/ags/style.css ~/.config/ags/style.css
```

### From source (if you don't use AUR)

```bash
# 1) install build deps (Arch names)
sudo pacman -Syu npm meson ninja go gobject-introspection gtk3 gtk-layer-shell gtk4 gtk4-layer-shell

# 2) install Astal runtime packages first
#    (astal-io, astal3, astal4) from AUR or source

# 3) build/install AGS
git clone https://github.com/Aylur/ags.git
cd ags
npm install
meson setup build
sudo meson install -C build
```

## Run / Reload

```bash
# quick health checks
ags --version
ags list

# run this bar config
ags run ~/.config/ags/app.tsx
```

## Notes

- AGS v1 and AGS v2/v3 are not API-compatible; this port follows the current entrypoint model (`app.start`).
- For AGS v3 configs like this one, `ags run` requires Astal typelibs (`astal-io`, `astal3`, `astal4`) and `gtk4-layer-shell`.
- If you see `Typelib file for namespace 'Astal' not found`, install the missing Astal packages first, then rerun `ags run`.
- This modernized version keeps the same liquid-glass look and core layout (workspaces, active window, clock).
- Right-side system modules from the legacy v1 service API are intentionally reduced in this version to avoid mixing deprecated interfaces.
- Polling/parsing avoids `jq`; JSON fields are decoded with Python so escaped quotes in window titles are handled correctly.
- Workspace state is polled once per monitor and shared across workspace buttons to avoid redundant shell polling.
