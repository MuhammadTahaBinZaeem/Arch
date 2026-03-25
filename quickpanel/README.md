# Win11-style Quick Settings for Hyprland

A standalone quick panel inspired by Windows 11, designed for Hyprland users who want to control everyday settings without opening full Settings apps.

## Features

- **Wi‑Fi tile + detailed Wi‑Fi page**
  - Toggle Wi‑Fi on/off
  - Scan/list networks
  - Connect/disconnect directly from the panel
- **Bluetooth tile** (power on/off)
- **Airplane mode tile** (rfkill all)
- **Focus assist tile**
  - Uses `makoctl` (preferred) or `dunstctl` fallback for DND
- **Accessibility tile**
  - Runs a customizable command (default is a GTK accessibility-oriented theme switch command)
- **Brightness slider** (`brightnessctl`)
- **Volume slider** (`wpctl` / PipeWire)
- **Battery percentage footer** (`upower`)
- **Settings button** for optional launcher command

## Requirements

Install dependencies on Arch:

```bash
sudo pacman -S --needed python-gobject gtk3 networkmanager bluez bluez-utils rfkill brightnessctl pipewire upower
```

Optional (for focus assist):

```bash
sudo pacman -S --needed mako dunst
```

## Usage

```bash
python3 quickpanel/win11_quick_panel.py
```

## Hyprland binding example

Add to `~/.config/hypr/hyprland.conf`:

```ini
bind = SUPER, A, exec, python3 /path/to/repo/quickpanel/win11_quick_panel.py
```

## Optional config

Create `~/.config/quickpanel/config.json`:

```json
{
  "accent_color": "#0a64bd",
  "settings_command": "xdg-open settings://",
  "accessibility_command": "gsettings set org.gnome.desktop.interface gtk-theme Adwaita:dark",
  "wifi_scan_interval_seconds": 8,
  "poll_interval_ms": 2000
}
```

You can replace `accessibility_command` with tools you prefer (e.g. text scaling scripts, key-repeat helpers, screen keyboard launchers).

## Notes

- Wi‑Fi connection to protected networks may require secrets already saved in NetworkManager keyring, or `nmcli` will prompt in terminal contexts.
- The panel is intentionally scriptable and easy to extend with additional tiles (VPN, night light, mic mute, etc.).
