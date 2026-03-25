// AGS RunCat widget (GNOME RunCat-compatible animation pacing and sprites).
// Sprites are copied from https://github.com/win0err/gnome-runcat.

const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

const Widget = await import('resource:///com/github/Aylur/ags/widget.js').then(m => m.default);
const App = await import('resource:///com/github/Aylur/ags/app.js').then(m => m.default);

const DEFAULT_OPTIONS = {
  idleThreshold: 0,
  invertSpeed: false,
  display: 'character_and_percentage', // character_and_percentage | percentage_only | character_only
  iconSize: 18,
  cssClass: 'runcat',
};

const SPRITES = {
  active: [0, 1, 2, 3, 4].map(
    i => `${App.configDir}/runcat/ags/icons/runcat/active/sprite-${i}-symbolic.svg`,
  ),
  idle: [
    `${App.configDir}/runcat/ags/icons/runcat/idle/sprite-0-symbolic.svg`,
  ],
};

const MAX_CPU_UTILIZATION = 1.0;

const getAnimationIntervalMs = (cpuUtilization, spritesCount) =>
  Math.ceil((25 / Math.sqrt(cpuUtilization * 100 + 30) - 2) * 1000 / spritesCount);

const readCpuStats = () => {
  const [ok, bytes] = GLib.file_get_contents('/proc/stat');
  if (!ok) return null;

  const line = ByteArray.toString(bytes).split('\n').find(l => l.startsWith('cpu '));
  if (!line) return null;

  const fields = line.trim().split(/\s+/);
  const values = fields.slice(1).map(Number);
  if (values.length < 4 || values.some(v => !Number.isFinite(v))) return null;

  const [user, nice, sys] = values;

  return {
    active: user + nice + sys,
    total: values.reduce((sum, value) => sum + value, 0),
  };
};

const createCpuProvider = () => {
  let prev = readCpuStats();

  return () => {
    const curr = readCpuStats();
    if (!prev || !curr) {
      prev = curr;
      return 0;
    }

    const utilization = (curr.active - prev.active) / Math.max(curr.total - prev.total, MAX_CPU_UTILIZATION);
    prev = curr;

    if (!Number.isFinite(utilization)) return 0;
    return Math.min(Math.max(utilization, 0), 1);
  };
};

export default (opts = {}) => {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const cpuTick = createCpuProvider();

  let cpuUtilization = 0;
  const spriteIndex = { active: 0, idle: 0 };

  const icon = Widget.Icon({
    icon: SPRITES.idle[0],
    size: options.iconSize,
    visible: options.display !== 'percentage_only',
  });

  const label = Widget.Label({
    label: '0%',
    visible: options.display !== 'character_only',
  });

  const box = Widget.Box({
    class_name: options.cssClass,
    spacing: 6,
    children: [icon, label],
  });

  let repaintSource = 0;
  let cpuSource = 0;

  const repaint = () => {
    let effectiveUtilization = cpuUtilization;
    let state = cpuUtilization > options.idleThreshold / 100 ? 'active' : 'idle';

    if (options.invertSpeed) {
      effectiveUtilization = MAX_CPU_UTILIZATION - cpuUtilization;
      state = 'active'; // always active when speed is inverted (same as upstream)
    }

    const sprites = SPRITES[state];
    const idx = spriteIndex[state];

    icon.icon = sprites[idx];
    spriteIndex[state] = (idx + 1) % sprites.length;

    label.label = `${Math.round(cpuUtilization * 100)}%`;

    if (repaintSource) GLib.Source.remove(repaintSource);
    repaintSource = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      getAnimationIntervalMs(effectiveUtilization, sprites.length),
      () => {
        repaint();
        return GLib.SOURCE_REMOVE;
      },
    );
  };

  cpuSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
    cpuUtilization = cpuTick();
    return GLib.SOURCE_CONTINUE;
  });

  cpuUtilization = cpuTick();
  repaint();

  box.connect('destroy', () => {
    if (cpuSource) GLib.Source.remove(cpuSource);
    if (repaintSource) GLib.Source.remove(repaintSource);
  });

  return box;
};
