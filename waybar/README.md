# Liquid Glass Waybar (Hyprland)

This folder contains a Waybar setup with a segmented layout and a **Waybar-compatible liquid-glass style** inspired by [`nkzw-tech/liquid-glass`](https://github.com/nkzw-tech/liquid-glass/tree/main).

## Files
- `config.jsonc`: Waybar module layout + Hyprland-focused defaults.
- `style.css`: liquid-glass theme adapted for GTK/Waybar.
- `preview.svg`: visual mockup preview.

## Why this is an adaptation (not a direct import)
The linked project is a React component that relies on SVG displacement filters + shader logic. Waybar uses GTK CSS and does not support importing that runtime shader pipeline directly.

So this theme maps the same ideas into Waybar-friendly styling:
- frosty/translucent slabs,
- chromatic edge tint,
- stronger inner highlights,
- layered depth shadows.

## Install
```bash
mkdir -p ~/.config/waybar
cp /workspace/Arch/waybar/config.jsonc ~/.config/waybar/config.jsonc
cp /workspace/Arch/waybar/style.css ~/.config/waybar/style.css
```

## Reload
```bash
pkill waybar && waybar
```

## Required Hyprland blur (recommended)
For the best "liquid" feel, enable blur behind Waybar surfaces in your Hyprland config (`~/.config/hypr/hyprland.conf`):

```ini
decoration {
    blur {
        enabled = true
        size = 8
        passes = 3
        noise = 0.01
        contrast = 1.0
        brightness = 1.0
        vibrancy = 0.25
        vibrancy_darkness = 0.1
    }
}
```

If you want, next step can be a custom AGS/Eww topbar that gets even closer to the original shader-based distortion.
