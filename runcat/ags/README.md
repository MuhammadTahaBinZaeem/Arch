# RunCat for AGS (1:1 recreation target)

This AGS widget recreates the [win0err/gnome-runcat](https://github.com/win0err/gnome-runcat) behavior as closely as possible:

- Uses the **exact same SVG sprite frames** (copied under `icons/runcat/...`).
- Uses the **same animation pacing formula** from GNOME RunCat:
  - `delay = ceil((25 / sqrt(cpu*100 + 30) - 2) * 1000 / spritesCount)`
- Uses the **same CPU refresh cadence** (`3000ms`) and percentage display style (rounded percent).
- Supports the same display modes conceptually:
  - character + percentage
  - percentage only
  - character only
- Supports idle threshold and invert-speed behavior.

## Usage

Place this folder under your AGS config (or adjust paths).

Example (`~/.config/ags/config.js`):

```js
import RunCat from './runcat/ags/runcat.js';

const bar = Widget.Window({
  name: 'bar',
  anchor: ['top', 'right'],
  child: RunCat({
    idleThreshold: 0,
    invertSpeed: false,
    display: 'character_and_percentage',
    iconSize: 18,
    cssClass: 'runcat',
  }),
});
```

Optional style snippet:

```css
.runcat {
  padding: 0 8px;
}
```

## Note

Sprites are copied from the upstream project for visual parity.
Please keep upstream attribution if you redistribute this widget.
