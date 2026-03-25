#!/usr/bin/env gjs

const GLib = imports.gi.GLib;
const Cairo = imports.cairo;

const width = 1400;
const height = 260;
const bars = 48;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function addQuadratic(cr, x0, y0, cx, cy, x1, y1) {
    const c1x = x0 + (2 / 3) * (cx - x0);
    const c1y = y0 + (2 / 3) * (cy - y0);
    const c2x = x1 + (2 / 3) * (cx - x1);
    const c2y = y1 + (2 / 3) * (cy - y1);
    cr.curveTo(c1x, c1y, c2x, c2y, x1, y1);
}

const values = Array.from({ length: bars }, (_, i) => {
    const s1 = Math.sin(i / bars * Math.PI * 2.5) * 0.5 + 0.5;
    const s2 = Math.sin(i / bars * Math.PI * 7.0 + 0.4) * 0.2 + 0.2;
    return Math.floor((s1 + s2) * 100);
});

const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, width, height);
const cr = new Cairo.Context(surface);

cr.setSourceRGBA(0.06, 0.07, 0.10, 1);
cr.paint();

const grad = new Cairo.LinearGradient(0, 0, width, height);
grad.addColorStopRGBA(0, 0.22, 0.57, 1.0, 1);
grad.addColorStopRGBA(0.5, 0.56, 0.40, 0.98, 1);
grad.addColorStopRGBA(1, 0.84, 0.18, 0.87, 1);
cr.setSource(grad);
cr.setLineCap(Cairo.LineCap.ROUND);
cr.setLineWidth(6);

const maxValue = height;
const step = width / (bars - 1);
const yBottom = height - 3;

cr.newPath();
let prevX = 0;
let prevY = yBottom - (clamp(values[0], 0, maxValue) / maxValue) * yBottom;
cr.lineTo(prevX - 0.5, prevY);

for (let i = 1; i < bars; i++) {
    const norm = clamp(values[i], 0, maxValue) / maxValue;
    const x = i * step;
    const y = yBottom - norm * yBottom;
    const midX = (prevX + x) / 2;
    const midY = (prevY + y) / 2;
    addQuadratic(cr, prevX, prevY, prevX, prevY, midX, midY);
    prevX = x;
    prevY = y;
}
cr.lineTo(width + 0.5, prevY);
cr.stroke();

cr.newPath();
cr.moveTo(0, height);
prevX = 0;
prevY = height - (clamp(values[0], 0, maxValue) / maxValue) * height;
cr.lineTo(prevX, prevY);
for (let i = 1; i < bars; i++) {
    const norm = clamp(values[i], 0, maxValue) / maxValue;
    const x = i * step;
    const y = height - norm * height;
    const midX = (prevX + x) / 2;
    const midY = (prevY + y) / 2;
    addQuadratic(cr, prevX, prevY, prevX, prevY, midX, midY);
    prevX = x;
    prevY = y;
}
cr.lineTo(width, prevY);
cr.lineTo(width, height);
cr.closePath();
cr.fill();

const outPath = '/workspace/Arch/kurve/ags/preview.png';
surface.writeToPNG(outPath);
print(outPath);
