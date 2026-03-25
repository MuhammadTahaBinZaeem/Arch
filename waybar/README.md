# Liquid Glass Waybar (Hyprland)

This folder contains a ready-to-drop Waybar setup with a **segmented / portioned** layout and a **liquid-glass** visual style.

## Files
- `config.jsonc`: Waybar module layout + Hyprland-focused defaults.
- `style.css`: liquid-glass theme with grouped sections.
- `preview.svg`: visual mockup preview of how the bar looks.

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

## Notes
- For true blur/frosted effect, enable blur in your Hyprland compositor config.
- Font assumes Nerd Fonts (JetBrainsMono Nerd Font recommended).
