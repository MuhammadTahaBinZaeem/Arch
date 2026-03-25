#!/usr/bin/env gjs

const { Gtk, GLib } = imports.gi;
const Cairo = imports.cairo;

Gtk.init(null);

const CONFIG = {
    framerate: 60,
    bars: 48,
    lowerCutoff: 50,
    higherCutoff: 10000,
    autosens: 1,
    noiseReduction: 0.77,
    monstercat: 1,
    waves: 1,

    style: 'wave', // bars | wave | blocks
    circleMode: false,
    circleModeSize: 0.38,

    barWidth: 6,
    barGap: 3,
    blockHeight: 6,
    blockSpacing: 3,

    centeredBars: false,
    roundedBars: true,
    fillWave: true,
    drawInactiveBlocks: true,

    idleSeconds: 2,
    asciiMaxRange: 100,
};

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function buildCavaConfig() {
    return `[general]\nframerate=${CONFIG.framerate}\nbars=${CONFIG.bars}\nautosens=${CONFIG.autosens}\nlower_cutoff_freq=${CONFIG.lowerCutoff}\nhigher_cutoff_freq=${CONFIG.higherCutoff}\n\n[input]\nmethod=pulse\n\n[output]\nmethod=raw\nraw_target=/dev/stdout\ndata_format=ascii\nascii_max_range=${CONFIG.asciiMaxRange}\n\n[smoothing]\nnoise_reduction=${CONFIG.noiseReduction}\nmonstercat=${CONFIG.monstercat}\nwaves=${CONFIG.waves}\n`;
}

function addQuadratic(cr, x0, y0, cx, cy, x1, y1) {
    const c1x = x0 + (2 / 3) * (cx - x0);
    const c1y = y0 + (2 / 3) * (cy - y0);
    const c2x = x1 + (2 / 3) * (cx - x1);
    const c2y = y1 + (2 / 3) * (cy - y1);
    cr.curveTo(c1x, c1y, c2x, c2y, x1, y1);
}

class KurveRenderer {
    constructor(values) {
        this.values = values;
    }

    setValues(values) {
        this.values = values;
    }

    strokeGradient(cr, w, h, alpha) {
        const grad = new Cairo.LinearGradient(0, 0, w, h);
        grad.addColorStopRGBA(0, 0.22, 0.57, 1.0, alpha);
        grad.addColorStopRGBA(0.5, 0.56, 0.40, 0.98, alpha);
        grad.addColorStopRGBA(1, 0.84, 0.18, 0.87, alpha);
        cr.setSource(grad);
    }

    inactiveGradient(cr, w, h, alpha) {
        const grad = new Cairo.LinearGradient(0, h, w, 0);
        grad.addColorStopRGBA(0, 1, 1, 1, 0.08 * alpha);
        grad.addColorStopRGBA(1, 1, 1, 1, 0.16 * alpha);
        cr.setSource(grad);
    }

    draw(cr, w, h, alpha) {
        this.strokeGradient(cr, w, h, alpha);

        if (CONFIG.style === 'bars') {
            if (CONFIG.circleMode)
                this.barsCircle(cr, w, h);
            else
                this.barsRect(cr, h);
            return;
        }

        if (CONFIG.style === 'blocks') {
            if (CONFIG.circleMode)
                this.blocksCircle(cr, w, h, alpha);
            else
                this.blocksRect(cr, w, h, alpha);
            return;
        }

        if (CONFIG.circleMode)
            this.waveCircle(cr, w, h);
        else
            this.waveRect(cr, w, h);
    }

    barsRect(cr, canvasHeight) {
        const maxValue = canvasHeight;
        const barCount = this.values.length;
        const roundedBars = CONFIG.roundedBars;
        const barWidth = CONFIG.barWidth;
        const centeredBars = CONFIG.centeredBars;
        const radiusOffset = barWidth / 2;
        const spacing = CONFIG.barGap;

        cr.setLineCap(roundedBars ? Cairo.LineCap.ROUND : Cairo.LineCap.BUTT);
        cr.setLineWidth(barWidth);

        let x = barWidth / 2;
        const centerY = canvasHeight / 2;
        for (let i = 0; i < barCount; i++) {
            const value = clamp(this.values[i], 1, maxValue);
            let barHeight;
            let yBottom;
            let yTop;

            if (centeredBars) {
                if (roundedBars)
                    barHeight = (value / maxValue) * ((canvasHeight - barWidth) / 2);
                else
                    barHeight = (value / maxValue) * (canvasHeight / 2);

                yBottom = centerY - barHeight;
                yTop = yBottom + (barHeight * 2);
            } else {
                if (roundedBars) {
                    barHeight = (value / maxValue) * (canvasHeight - barWidth);
                    yBottom = canvasHeight - radiusOffset;
                } else {
                    barHeight = (value / maxValue) * canvasHeight;
                    yBottom = canvasHeight;
                }
                yTop = yBottom - barHeight;
            }

            cr.newPath();
            cr.moveTo(x, yBottom);
            cr.lineTo(x, yTop);
            cr.stroke();
            x += barWidth + spacing;
        }
    }

    waveRect(cr, canvasWidth, canvasHeight) {
        const maxValue = canvasHeight;
        const barCount = this.values.length;
        if (barCount < 2)
            return;

        const barWidth = CONFIG.barWidth;
        const roundedBars = CONFIG.roundedBars;
        const centeredBars = CONFIG.centeredBars;
        const fillWave = CONFIG.fillWave;

        cr.setLineCap(roundedBars ? Cairo.LineCap.ROUND : Cairo.LineCap.BUTT);
        cr.setLineWidth(barWidth);

        const step = canvasWidth / (barCount - 1);
        const yBottom = centeredBars ? (canvasHeight / 2) : (canvasHeight - barWidth / 2);

        cr.newPath();
        let prevX = 0;
        let prevY = yBottom - (clamp(this.values[0], 0, maxValue) / maxValue) * yBottom;
        cr.lineTo(prevX - 0.5, prevY);

        for (let i = 1; i < barCount; i++) {
            const norm = clamp(this.values[i], 0, maxValue) / maxValue;
            const x = i * step;
            const y = yBottom - norm * yBottom;
            const midX = (prevX + x) / 2;
            const midY = (prevY + y) / 2;
            addQuadratic(cr, prevX, prevY, prevX, prevY, midX, midY);
            prevX = x;
            prevY = y;
        }

        cr.lineTo(canvasWidth + 0.5, prevY);
        cr.stroke();

        if (fillWave) {
            const fillBottom = centeredBars ? (canvasHeight / 2 + barWidth / 2) : canvasHeight;
            cr.newPath();
            cr.moveTo(0, fillBottom);

            prevX = 0;
            prevY = fillBottom - (clamp(this.values[0], 0, maxValue) / maxValue) * fillBottom;
            cr.lineTo(prevX, prevY);

            for (let i = 1; i < barCount; i++) {
                const norm = clamp(this.values[i], 0, maxValue) / maxValue;
                const x = i * step;
                const y = fillBottom - norm * fillBottom;
                const midX = (prevX + x) / 2;
                const midY = (prevY + y) / 2;
                addQuadratic(cr, prevX, prevY, prevX, prevY, midX, midY);
                prevX = x;
                prevY = y;
            }

            cr.lineTo(canvasWidth, prevY);
            cr.lineTo(canvasWidth, fillBottom);
            cr.closePath();
            cr.fill();
        }
    }

    barsCircle(cr, canvasWidth, canvasHeight) {
        const maxValue = Math.min(canvasWidth, canvasHeight) / 2;
        const barCount = this.values.length;
        const roundedBars = CONFIG.roundedBars;
        const barWidth = CONFIG.barWidth;
        const barRadiusOffset = (barWidth / 2) * 2;
        const circleSize = CONFIG.circleModeSize;

        cr.setLineCap(roundedBars ? Cairo.LineCap.ROUND : Cairo.LineCap.BUTT);
        cr.setLineWidth(barWidth);

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const angleStep = (2 * Math.PI) / barCount;
        const innerRadius = (Math.min(canvasWidth, canvasHeight) / 2) * circleSize - barRadiusOffset;

        for (let i = 0; i < barCount; i++) {
            const value = clamp(this.values[i], 1, maxValue);
            const norm = value / maxValue;
            const barLength = norm * (maxValue - barWidth / 2) * (1 - circleSize);
            const angle = i * angleStep - Math.PI / 2;

            const xStart = centerX + Math.cos(angle) * innerRadius;
            const yStart = centerY + Math.sin(angle) * innerRadius;
            const xEnd = centerX + Math.cos(angle) * (innerRadius + barLength);
            const yEnd = centerY + Math.sin(angle) * (innerRadius + barLength);

            cr.newPath();
            cr.moveTo(xStart, yStart);
            cr.lineTo(xEnd, yEnd);
            cr.stroke();
        }
    }

    waveCircle(cr, canvasWidth, canvasHeight) {
        const maxValue = Math.min(canvasWidth, canvasHeight) / 2;
        const barCount = this.values.length;
        if (barCount < 2)
            return;

        const circleSize = CONFIG.circleModeSize;
        const innerRadius = (Math.min(canvasWidth, canvasHeight) / 2) * circleSize;
        const barWidth = CONFIG.barWidth;
        const fillWave = CONFIG.fillWave;

        cr.setLineWidth(barWidth);

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const angleStep = (2 * Math.PI) / barCount;

        const outerPoints = new Array(barCount + 1);
        for (let i = 0; i <= barCount; i++) {
            const idx = i % barCount;
            const val = clamp(this.values[idx], 0, maxValue);
            const radial = val * (1 - circleSize);
            const angle = idx * angleStep - Math.PI / 2;
            outerPoints[i] = {
                x: centerX + Math.cos(angle) * (innerRadius + radial),
                y: centerY + Math.sin(angle) * (innerRadius + radial),
            };
        }

        cr.newPath();
        cr.moveTo(outerPoints[0].x, outerPoints[0].y);
        let prev = outerPoints[0];
        for (let i = 1; i <= barCount; i++) {
            const p = outerPoints[i];
            const mx = (prev.x + p.x) / 2;
            const my = (prev.y + p.y) / 2;
            addQuadratic(cr, prev.x, prev.y, prev.x, prev.y, mx, my);
            prev = p;
        }
        cr.closePath();
        cr.stroke();

        if (fillWave) {
            cr.newPath();
            cr.moveTo(outerPoints[0].x, outerPoints[0].y);
            prev = outerPoints[0];
            for (let i = 1; i <= barCount; i++) {
                const p = outerPoints[i];
                const mx = (prev.x + p.x) / 2;
                const my = (prev.y + p.y) / 2;
                addQuadratic(cr, prev.x, prev.y, prev.x, prev.y, mx, my);
                prev = p;
            }
            cr.closePath();

            cr.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            cr.setFillRule(Cairo.FillRule.EVEN_ODD);
            cr.fill();
            cr.setFillRule(Cairo.FillRule.WINDING);
        }
    }

    blocksRect(cr, canvasWidth, canvasHeight, alpha) {
        const maxValue = canvasHeight;
        const barCount = this.values.length;
        const barWidth = CONFIG.barWidth;
        const blockHeight = CONFIG.blockHeight;
        const blockSpacing = CONFIG.blockSpacing;
        const spacing = CONFIG.barGap;
        const centeredBars = CONFIG.centeredBars;

        const totalBlockHeight = blockHeight + blockSpacing;
        const maxBlocks = Math.floor(canvasHeight / totalBlockHeight);
        const centerY = canvasHeight / 2;
        let x = 0;

        for (let i = 0; i < barCount; i++) {
            const value = clamp(this.values[i], 0, maxValue);
            const normalized = value / maxValue;
            let activeBlocks;
            if (centeredBars)
                activeBlocks = Math.floor(normalized * (maxBlocks / 2));
            else
                activeBlocks = Math.floor(normalized * maxBlocks);

            for (let block = 0; block < maxBlocks; block++) {
                const isActive = centeredBars
                    ? (block >= (maxBlocks / 2 - activeBlocks) && block <= (maxBlocks / 2 + activeBlocks))
                    : (block >= maxBlocks - activeBlocks);

                const y = block * totalBlockHeight;
                if (isActive) {
                    this.strokeGradient(cr, canvasWidth, canvasHeight, alpha);
                    cr.rectangle(x, y, barWidth, blockHeight);
                    cr.fill();
                } else if (CONFIG.drawInactiveBlocks) {
                    this.inactiveGradient(cr, canvasWidth, canvasHeight, alpha);
                    cr.rectangle(x, y, barWidth, blockHeight);
                    cr.fill();
                }
            }

            x += barWidth + spacing;
        }
    }

    blocksCircle(cr, canvasWidth, canvasHeight, alpha) {
        const maxValue = Math.min(canvasWidth, canvasHeight) / 2;
        const barCount = this.values.length;
        const barWidth = CONFIG.barWidth;
        const blockHeight = CONFIG.blockHeight;
        const blockSpacing = CONFIG.blockSpacing;
        const circleSize = CONFIG.circleModeSize;

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const angleStep = (2 * Math.PI) / barCount;
        const innerRadius = (Math.min(canvasWidth, canvasHeight) / 2) * circleSize;
        const maxRadial = maxValue * (1 - circleSize);

        const totalBlockHeight = blockHeight + blockSpacing;
        const maxBlocks = Math.floor(maxRadial / totalBlockHeight);
        const anglePerBar = (barWidth / innerRadius);

        for (let i = 0; i < barCount; i++) {
            const value = clamp(this.values[i], 0, maxValue);
            const normalized = value / maxValue;
            const activeBlocks = Math.floor(normalized * maxBlocks);
            const angle = i * angleStep - Math.PI / 2;

            for (let block = 0; block < maxBlocks; block++) {
                const radius = innerRadius + block * totalBlockHeight;
                const isActive = block < activeBlocks;

                if (isActive)
                    this.strokeGradient(cr, canvasWidth, canvasHeight, alpha);
                else if (CONFIG.drawInactiveBlocks)
                    this.inactiveGradient(cr, canvasWidth, canvasHeight, alpha);
                else
                    continue;

                cr.newPath();
                cr.arc(centerX, centerY, radius + blockHeight, angle - anglePerBar / 2, angle + anglePerBar / 2);
                cr.arcNegative(centerX, centerY, radius, angle + anglePerBar / 2, angle - anglePerBar / 2);
                cr.closePath();
                cr.fill();
            }
        }
    }
}

class KurveWindow {
    constructor() {
        this.values = new Array(CONFIG.bars).fill(0);
        this.lastActiveMs = 0;
        this.renderer = new KurveRenderer(this.values);
        this.childPid = 0;

        this.window = new Gtk.Window({ title: 'Kurve (AGS)', decorated: false });
        this.window.set_default_size(1200, 220);
        this.window.connect('destroy', () => {
            this.stopCava();
            Gtk.main_quit();
        });

        this.area = new Gtk.DrawingArea();
        this.area.connect('draw', (_, cr) => this.draw(cr));
        this.window.add(this.area);
        this.window.show_all();

        this.startCava();
    }

    startCava() {
        const cfgPath = GLib.build_filenamev([GLib.get_tmp_dir(), `kurve-ags-${GLib.uuid_string_random()}.conf`]);
        GLib.file_set_contents(cfgPath, buildCavaConfig());

        const [ok, pid, stdinFd, stdoutFd, stderrFd] = GLib.spawn_async_with_pipes(
            null,
            ['bash', '-lc', `cava -p ${cfgPath}`],
            null,
            GLib.SpawnFlags.SEARCH_PATH,
            null,
        );

        if (!ok)
            throw new Error('failed to start cava');

        this.childPid = pid;
        if (stdinFd !== undefined) GLib.close(stdinFd);
        if (stderrFd !== undefined) GLib.close(stderrFd);

        const channel = GLib.IOChannel.unix_new(stdoutFd);
        channel.set_encoding('utf-8');
        channel.set_buffered(false);

        GLib.io_add_watch(channel, GLib.PRIORITY_DEFAULT, GLib.IOCondition.IN, () => {
            try {
                const [status, line] = channel.read_line();
                if (status === GLib.IOStatus.NORMAL && line) {
                    const parsed = line.trim().replace(/;$/, '').split(';').map(v => parseInt(v, 10) || 0);
                    if (parsed.length > 0) {
                        this.values = this.normalize(parsed, CONFIG.bars);
                        this.renderer.setValues(this.values);
                        if (this.values.some(v => v > 0))
                            this.lastActiveMs = Date.now();
                        this.area.queue_draw();
                    }
                }
            } catch (_err) {}
            return true;
        });
    }

    stopCava() {
        if (this.childPid > 0) {
            try {
                GLib.spawn_command_line_async(`kill ${this.childPid}`);
            } catch (_err) {}
            this.childPid = 0;
        }
    }

    normalize(values, bars) {
        if (values.length === bars)
            return values;
        if (values.length > bars)
            return values.slice(0, bars);
        return values.concat(new Array(bars - values.length).fill(0));
    }

    draw(cr) {
        const alloc = this.area.get_allocation();
        const w = alloc.width;
        const h = alloc.height;

        cr.setSourceRGBA(0, 0, 0, 0);
        cr.paint();

        const idle = (Date.now() - this.lastActiveMs) > CONFIG.idleSeconds * 1000;
        const alpha = idle ? 0.25 : 1;
        this.renderer.draw(cr, w, h, alpha);
        return false;
    }
}

new KurveWindow();
Gtk.main();
