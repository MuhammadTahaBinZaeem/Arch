# runcat (Hyprland + Arch Linux)

This is a Hyprland/Waybar adaptation of [win0err/gnome-runcat](https://github.com/win0err/gnome-runcat).
Instead of a GNOME Shell extension, this version provides a lightweight Python script that emits Waybar JSON output with a running cat animation based on CPU load.

## Features

- CPU-driven running cat animation for Waybar.
- No external Python dependencies.
- Color classes by load (`low`, `mid`, `high`).
- Example snippets for Waybar and Hyprland.

## Requirements

- Arch Linux
- Hyprland
- Waybar
- Python 3.10+

## Install

```bash
mkdir -p ~/.local/share/runcat/scripts
cp scripts/runcat.py ~/.local/share/runcat/scripts/
chmod +x ~/.local/share/runcat/scripts/runcat.py
```

Copy module style/config snippets:

```bash
mkdir -p ~/.config/waybar
cp waybar/config-snippet.jsonc ~/.config/waybar/runcat-module.jsonc
cp waybar/style-snippet.css ~/.config/waybar/runcat-style.css
```

Then merge these snippets into your main `~/.config/waybar/config.jsonc` and `~/.config/waybar/style.css`.

## Waybar module example

```jsonc
"custom/runcat": {
  "return-type": "json",
  "format": "{}",
  "exec": "~/.local/share/runcat/scripts/runcat.py --interval 0.4",
  "restart-interval": 1
}
```

Add `"custom/runcat"` to your bar modules list.

## Run manually

```bash
~/.local/share/runcat/scripts/runcat.py --interval 0.4
```

## Optional systemd user service

```bash
mkdir -p ~/.config/systemd/user
cp systemd/runcat-waybar.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now runcat-waybar.service
```

## Credits

- Original GNOME extension idea and implementation: `win0err/gnome-runcat`.
