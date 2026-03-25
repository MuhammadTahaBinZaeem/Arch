const { GLib } = imports.gi;

const App = await Service.import('app');
const Hyprland = await Service.import('hyprland');
const Audio = await Service.import('audio');
const Network = await Service.import('network');
const Battery = await Service.import('battery');
const SystemTray = await Service.import('systemtray');

const MODULE_POLL_MS = 1000;

const ModuleBox = (className, child) =>
  Widget.Box({
    class_name: `module ${className}`,
    child,
  });

const Workspaces = () =>
  ModuleBox(
    'workspaces',
    Widget.Box({
      spacing: 6,
      children: Array.from({ length: 10 }, (_, idx) => {
        const id = idx + 1;

        return Widget.Button({
          class_name: 'workspace-btn',
          on_clicked: () => Hyprland.messageAsync(`dispatch workspace ${id}`),
          child: Widget.Label({
            label: '',
            tooltip_text: `Workspace ${id}`,
          }),
          setup: (self) =>
            self.hook(Hyprland, () => {
              const activeId = Hyprland.active.workspace?.id ?? 1;
              const isActive = activeId === id;
              self.toggleClassName('active', isActive);
              self.child.label = isActive ? '' : '';
            }),
        });
      }),
    }),
  );

const ActiveWindow = () => {
  const label = Widget.Label({
    xalign: 0,
    max_width_chars: 42,
    truncate: 'end',
    label: 'Desktop',
  });

  const update = () => {
    const title = Hyprland.active.client?.title?.trim();
    label.label = title && title.length > 0 ? title : 'Desktop';
  };

  label.hook(Hyprland, update);
  update();

  return ModuleBox('window', label);
};

const Clock = () =>
  ModuleBox(
    'clock',
    Widget.Label({
      setup: (self) =>
        self.poll(MODULE_POLL_MS, (clockLabel) => {
          const now = GLib.DateTime.new_now_local();
          clockLabel.label = now.format('  %a %d %b  %H:%M');
          clockLabel.tooltip_markup = `<big>${now.format('%Y-%m-%d')}</big>`;
        }),
    }),
  );

const NetworkStatus = () => {
  const label = Widget.Label();

  const update = () => {
    if (Network.wifi?.enabled && Network.wifi?.ssid) {
      label.label = `  ${Network.wifi.strength}%`;
      label.tooltip_text = `${Network.wifi.ssid}`;
      label.toggleClassName('warning', false);
      return;
    }

    if (Network.wired?.internet === 'connected') {
      label.label = '󰈁  Wired';
      label.tooltip_text = 'Wired network connected';
      label.toggleClassName('warning', false);
      return;
    }

    label.label = '󰖪  Offline';
    label.tooltip_text = 'Network disconnected';
    label.toggleClassName('warning', true);
  };

  label.hook(Network, update);
  update();

  return ModuleBox('network', label);
};

const Volume = () => {
  const label = Widget.Label();

  const update = () => {
    const muted = Audio.speaker?.is_muted ?? false;
    const volume = Math.round((Audio.speaker?.volume ?? 0) * 100);

    const icon = muted ? '󰝟' : volume > 66 ? '' : volume > 33 ? '' : '';
    label.label = `${icon}  ${volume}%`;
    label.toggleClassName('warning', muted);
  };

  label.hook(Audio.speaker, update);
  update();

  return ModuleBox(
    'volume',
    Widget.Button({
      on_clicked: () => Utils.execAsync('pavucontrol').catch(() => null),
      child: label,
    }),
  );
};

const BatteryStatus = () => {
  const label = Widget.Label();

  const update = () => {
    if (!Battery.available) {
      label.label = '  AC';
      label.toggleClassName('warning', false);
      label.toggleClassName('critical', false);
      return;
    }

    const percent = Math.round((Battery.percent ?? 1) * 100);
    const icons = ['󰂎', '󰁺', '󰁻', '󰁼', '󰁽', '󰁾', '󰁿', '󰂀', '󰂁', '󰂂'];
    const icon = icons[Math.min(icons.length - 1, Math.floor(percent / 10))];

    label.label = `${icon}  ${percent}%`;
    label.tooltip_text = Battery.charging ? 'Charging' : 'Discharging';
    label.toggleClassName('warning', percent <= 25);
    label.toggleClassName('critical', percent <= 12);
  };

  label.hook(Battery, update);
  update();

  return ModuleBox('battery', label);
};

const Tray = () =>
  ModuleBox(
    'tray',
    Widget.Box({
      class_name: 'tray-row',
      spacing: 8,
      setup: (self) =>
        self.hook(SystemTray, (trayBox) => {
          trayBox.children = SystemTray.items.map((item) =>
            Widget.Button({
              class_name: 'tray-item',
              on_primary_click: (_, event) => item.activate(event),
              on_secondary_click: (_, event) => item.openMenu(event),
              tooltip_markup: item.tooltip_markup,
              child: Widget.Icon({
                icon: item.icon,
                size: 16,
              }),
            }),
          );
        }),
    }),
  );

const Section = (name, children) =>
  Widget.Box({
    class_name: `section ${name}`,
    children,
  });

const Bar = (monitor = 0) =>
  Widget.Window({
    name: `liquid-bar-${monitor}`,
    monitor,
    anchor: ['top', 'left', 'right'],
    margins: [10, 10, 0, 10],
    exclusivity: 'exclusive',
    child: Widget.CenterBox({
      class_name: 'bar',
      start_widget: Section('left', [Workspaces(), ActiveWindow()]),
      center_widget: Section('center', [Clock()]),
      end_widget: Section('right', [NetworkStatus(), Volume(), BatteryStatus(), Tray()]),
    }),
  });

App.config({
  style: './style.css',
  windows: [Bar()],
});
