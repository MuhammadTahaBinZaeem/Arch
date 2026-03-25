#!/usr/bin/env python3
"""Windows 11-inspired Quick Settings panel for Hyprland.

Features:
- Wi-Fi toggle + detailed network list (connect/disconnect via nmcli)
- Bluetooth toggle (rfkill + bluetoothctl)
- Airplane mode toggle (rfkill all)
- Focus assist / DND toggle (makoctl or dunstctl)
- Accessibility quick action (launch configured command)
- Brightness + volume sliders
- Battery percentage in footer

This script is intentionally standalone so it can be launched from Waybar/Hyprland
without depending on AGS/Eww.
"""

from __future__ import annotations

import json
import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import gi

gi.require_version("Gtk", "3.0")
from gi.repository import GLib, Gtk  # type: ignore


CONFIG_PATH = Path.home() / ".config" / "quickpanel" / "config.json"


DEFAULT_CONFIG = {
    "accent_color": "#0a64bd",
    "settings_command": "xdg-open settings://",
    "accessibility_command": "gsettings set org.gnome.desktop.interface gtk-theme Adwaita:dark",
    "wifi_scan_interval_seconds": 8,
    "poll_interval_ms": 2000,
}


@dataclass
class WifiNetwork:
    ssid: str
    security: str
    signal: int
    connected: bool


class CommandError(RuntimeError):
    pass


def run(cmd: str, check: bool = True) -> str:
    proc = subprocess.run(
        shlex.split(cmd),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if check and proc.returncode != 0:
        raise CommandError(proc.stderr.strip() or f"Command failed: {cmd}")
    return proc.stdout.strip()


class QuickPanel(Gtk.Window):
    def __init__(self) -> None:
        super().__init__(title="Quick Settings")
        self.config = self._load_config()

        self.set_default_size(420, 520)
        self.set_resizable(False)
        self.set_border_width(16)
        self.set_type_hint(1)  # Gdk.WindowTypeHint.DIALOG
        self.connect("destroy", Gtk.main_quit)

        self.stack = Gtk.Stack(transition_type=Gtk.StackTransitionType.SLIDE_LEFT_RIGHT)
        self.add(self.stack)

        self.main_page = self._build_main_page()
        self.wifi_page = self._build_wifi_page()

        self.stack.add_named(self.main_page, "main")
        self.stack.add_named(self.wifi_page, "wifi")
        self.stack.set_visible_child_name("main")

        self._apply_css()
        self.refresh_state()
        GLib.timeout_add(self.config["poll_interval_ms"], self._tick)

    def _load_config(self) -> dict:
        cfg = dict(DEFAULT_CONFIG)
        if CONFIG_PATH.exists():
            try:
                cfg.update(json.loads(CONFIG_PATH.read_text()))
            except Exception:
                pass
        return cfg

    def _apply_css(self) -> None:
        css = f"""
        window {{
            background: #202124;
            border-radius: 14px;
            color: #f5f6f7;
        }}
        .tile {{
            background: #2e3137;
            border-radius: 10px;
            padding: 12px;
        }}
        .tile.active {{
            background: {self.config['accent_color']};
        }}
        .title {{ font-weight: 700; }}
        scale slider {{ min-width: 18px; min-height: 18px; }}
        """
        provider = Gtk.CssProvider()
        provider.load_from_data(css.encode())
        Gtk.StyleContext.add_provider_for_screen(
            self.get_screen(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

    def _build_main_page(self) -> Gtk.Box:
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)

        grid = Gtk.Grid(column_spacing=10, row_spacing=10)
        root.pack_start(grid, False, False, 0)

        self.btn_wifi = self._tile_button("Wi‑Fi", self.on_wifi_clicked)
        self.btn_bluetooth = self._tile_button("Bluetooth", self.on_bluetooth_toggled)
        self.btn_airplane = self._tile_button("Airplane mode", self.on_airplane_toggled)
        self.btn_focus = self._tile_button("Focus assist", self.on_focus_toggled)
        self.btn_access = self._tile_button("Accessibility", self.on_accessibility_clicked)

        grid.attach(self.btn_wifi, 0, 0, 1, 1)
        grid.attach(self.btn_bluetooth, 1, 0, 1, 1)
        grid.attach(self.btn_airplane, 2, 0, 1, 1)
        grid.attach(self.btn_focus, 0, 1, 1, 1)
        grid.attach(self.btn_access, 1, 1, 2, 1)

        self.brightness = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 1, 100, 1)
        self.brightness.connect("value-changed", self.on_brightness_changed)
        root.pack_start(Gtk.Label(label="Brightness", xalign=0), False, False, 0)
        root.pack_start(self.brightness, False, False, 0)

        self.volume = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
        self.volume.connect("value-changed", self.on_volume_changed)
        root.pack_start(Gtk.Label(label="Volume", xalign=0), False, False, 0)
        root.pack_start(self.volume, False, False, 0)

        sep = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
        root.pack_start(sep, False, False, 8)

        footer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        self.battery_label = Gtk.Label(label="Battery: --", xalign=0)
        footer.pack_start(self.battery_label, True, True, 0)

        btn_settings = Gtk.Button(label="⚙")
        btn_settings.connect("clicked", self.on_settings_clicked)
        footer.pack_start(btn_settings, False, False, 0)

        root.pack_end(footer, False, False, 0)
        return root

    def _build_wifi_page(self) -> Gtk.Box:
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)

        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        back = Gtk.Button(label="←")
        back.connect("clicked", lambda *_: self.stack.set_visible_child_name("main"))
        top.pack_start(back, False, False, 0)
        top.pack_start(Gtk.Label(label="Wi‑Fi", xalign=0), True, True, 0)

        self.wifi_switch = Gtk.Switch()
        self.wifi_switch.connect("notify::active", self.on_wifi_switch)
        top.pack_end(self.wifi_switch, False, False, 0)
        root.pack_start(top, False, False, 0)

        scroller = Gtk.ScrolledWindow()
        scroller.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.wifi_list = Gtk.ListBox()
        scroller.add(self.wifi_list)
        root.pack_start(scroller, True, True, 0)

        more = Gtk.Button(label="More Wi‑Fi settings")
        more.connect("clicked", lambda *_: self._spawn("nm-connection-editor"))
        root.pack_end(more, False, False, 0)

        return root

    def _tile_button(self, label: str, handler) -> Gtk.Button:
        btn = Gtk.Button(label=label)
        btn.get_style_context().add_class("tile")
        btn.connect("clicked", handler)
        return btn

    def _spawn(self, cmd: str) -> None:
        subprocess.Popen(shlex.split(cmd), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _tick(self) -> bool:
        self.refresh_state()
        return True

    def refresh_state(self) -> None:
        self._set_tile_active(self.btn_wifi, self._wifi_enabled())
        self._set_tile_active(self.btn_bluetooth, self._bluetooth_enabled())
        self._set_tile_active(self.btn_airplane, self._airplane_enabled())
        self._set_tile_active(self.btn_focus, self._focus_enabled())
        self._set_brightness_value()
        self._set_volume_value()
        self.battery_label.set_text(f"Battery: {self._battery_percent()}%")
        self.wifi_switch.handler_block_by_func(self.on_wifi_switch)
        self.wifi_switch.set_active(self._wifi_enabled())
        self.wifi_switch.handler_unblock_by_func(self.on_wifi_switch)
        self._refresh_wifi_list()

    def _set_tile_active(self, button: Gtk.Button, active: bool) -> None:
        ctx = button.get_style_context()
        if active:
            ctx.add_class("active")
        else:
            ctx.remove_class("active")

    def _wifi_enabled(self) -> bool:
        out = run("nmcli radio wifi", check=False).lower()
        return "enabled" in out

    def _bluetooth_enabled(self) -> bool:
        out = run("rfkill list bluetooth", check=False).lower()
        return "soft blocked: yes" not in out

    def _airplane_enabled(self) -> bool:
        out = run("rfkill list all", check=False).lower()
        return "soft blocked: yes" in out

    def _focus_enabled(self) -> bool:
        mako = run("makoctl mode", check=False).lower()
        if mako:
            return "do-not-disturb" in mako
        dunst = run("dunstctl is-paused", check=False).strip().lower()
        return dunst == "true"

    def _battery_percent(self) -> int:
        out = run("upower -i $(upower -e | grep BAT | head -n1)", check=False)
        for line in out.splitlines():
            if "percentage" in line:
                try:
                    return int(line.split(":", 1)[1].strip().replace("%", ""))
                except Exception:
                    pass
        return 0

    def _set_brightness_value(self) -> None:
        out = run("brightnessctl -m", check=False)
        if out:
            try:
                self.brightness.set_value(float(out.split(",")[-1].replace("%", "")))
            except Exception:
                pass

    def _set_volume_value(self) -> None:
        out = run("wpctl get-volume @DEFAULT_AUDIO_SINK@", check=False)
        if out:
            try:
                self.volume.set_value(float(out.split()[1]) * 100)
            except Exception:
                pass

    def _refresh_wifi_list(self) -> None:
        for row in list(self.wifi_list.get_children()):
            self.wifi_list.remove(row)

        for net in self._wifi_networks():
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
            name = f"{net.ssid or '(hidden)'} ({net.signal}%)"
            subtitle = "Connected" if net.connected else net.security
            row.pack_start(Gtk.Label(label=f"{name}\n{subtitle}", xalign=0), True, True, 0)
            action = Gtk.Button(label="Disconnect" if net.connected else "Connect")
            action.connect("clicked", self.on_wifi_action, net)
            row.pack_end(action, False, False, 0)
            self.wifi_list.add(row)

        self.wifi_list.show_all()

    def _wifi_networks(self) -> List[WifiNetwork]:
        run("nmcli dev wifi rescan", check=False)
        out = run("nmcli -f IN-USE,SSID,SECURITY,SIGNAL dev wifi list", check=False)
        nets: List[WifiNetwork] = []
        for line in out.splitlines()[1:]:
            if not line.strip():
                continue
            connected = line.startswith("*")
            cleaned = line[1:].strip() if connected else line.strip()
            parts = cleaned.rsplit(None, 2)
            if len(parts) < 3:
                continue
            ssid, security, signal_s = parts
            try:
                signal = int(signal_s)
            except ValueError:
                signal = 0
            nets.append(WifiNetwork(ssid=ssid.strip(), security=security.strip(), signal=signal, connected=connected))
        return nets

    def on_wifi_clicked(self, *_args) -> None:
        self.stack.set_visible_child_name("wifi")

    def on_wifi_switch(self, switch: Gtk.Switch, _param) -> None:
        run(f"nmcli radio wifi {'on' if switch.get_active() else 'off'}", check=False)

    def on_wifi_action(self, _btn, net: WifiNetwork) -> None:
        if net.connected:
            run(f"nmcli con down id {shlex.quote(net.ssid)}", check=False)
        else:
            run(f"nmcli dev wifi connect {shlex.quote(net.ssid)}", check=False)
        self.refresh_state()

    def on_bluetooth_toggled(self, *_args) -> None:
        if self._bluetooth_enabled():
            run("rfkill block bluetooth", check=False)
            run("bluetoothctl power off", check=False)
        else:
            run("rfkill unblock bluetooth", check=False)
            run("bluetoothctl power on", check=False)
        self.refresh_state()

    def on_airplane_toggled(self, *_args) -> None:
        if self._airplane_enabled():
            run("rfkill unblock all", check=False)
        else:
            run("rfkill block all", check=False)
        self.refresh_state()

    def on_focus_toggled(self, *_args) -> None:
        mode = run("makoctl mode", check=False).strip()
        if mode:
            if "do-not-disturb" in mode:
                run("makoctl mode -r do-not-disturb", check=False)
            else:
                run("makoctl mode -a do-not-disturb", check=False)
        else:
            paused = run("dunstctl is-paused", check=False).strip().lower() == "true"
            run(f"dunstctl set-paused {'false' if paused else 'true'}", check=False)
        self.refresh_state()

    def on_accessibility_clicked(self, *_args) -> None:
        self._spawn(self.config["accessibility_command"])

    def on_brightness_changed(self, slider: Gtk.Scale) -> None:
        run(f"brightnessctl set {int(slider.get_value())}%", check=False)

    def on_volume_changed(self, slider: Gtk.Scale) -> None:
        run(f"wpctl set-volume @DEFAULT_AUDIO_SINK@ {slider.get_value()/100:.2f}", check=False)

    def on_settings_clicked(self, *_args) -> None:
        self._spawn(self.config["settings_command"])


def main() -> None:
    panel = QuickPanel()
    panel.show_all()
    Gtk.main()


if __name__ == "__main__":
    main()
