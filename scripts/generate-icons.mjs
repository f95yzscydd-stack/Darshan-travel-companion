import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const SAMPLES = 3;
const colors = {
  green: [30, 91, 67],
  darkGreen: [18, 62, 46],
  cream: [245, 244, 238],
  coral: [242, 140, 114],
  lime: [221, 237, 158],
  gold: [196, 147, 56]
};

function insideCircle(x, y, cx, cy, radius) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function insideTriangle(x, y, [ax, ay], [bx, by], [cx, cy]) {
  const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  const a = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denominator;
  const b = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denominator;
  const c = 1 - a - b;
  return a >= 0 && b >= 0 && c >= 0;
}

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function blend(base, overlay, alpha) {
  return base.map((channel, index) => Math.round(channel * (1 - alpha) + overlay[index] * alpha));
}

const compass = Array.from({ length: 16 }, (_, index) => {
  const angle = -Math.PI / 2 + (index * Math.PI) / 8;
  const radius = index % 2 === 0 ? 141 : 50;
  return [512 + Math.cos(angle) * radius, 420 + Math.sin(angle) * radius];
});

function colorAt(x, y) {
  let color = colors.green;
  const waveTop = 745 + 56 * Math.sin((x / 1024) * Math.PI * 2 - 0.7);
  if (y >= waveTop) color = blend(color, colors.darkGreen, 0.72);
  if (insideCircle(x, y, 188, 200, 42)) color = colors.lime;
  if (insideCircle(x, y, 836, 814, 64)) color = blend(color, colors.coral, 0.92);

  const inPin =
    insideCircle(x, y, 512, 420, 330) ||
    insideTriangle(x, y, [258, 536], [766, 536], [512, 928]);
  if (inPin) color = colors.cream;
  if (insideCircle(x, y, 512, 420, 202)) color = colors.coral;
  if (insideCircle(x, y, 512, 420, 150)) color = colors.green;
  if (insidePolygon(x, y, compass)) color = colors.lime;
  if (insideCircle(x, y, 512, 420, 35)) color = colors.gold;
  return color;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}

function renderPng(path, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0;
    for (let x = 0; x < size; x += 1) {
      const total = [0, 0, 0];
      for (let sampleY = 0; sampleY < SAMPLES; sampleY += 1) {
        for (let sampleX = 0; sampleX < SAMPLES; sampleX += 1) {
          const sampleXPosition = ((x + (sampleX + 0.5) / SAMPLES) / size) * 1024;
          const sampleYPosition = ((y + (sampleY + 0.5) / SAMPLES) / size) * 1024;
          const color = colorAt(sampleXPosition, sampleYPosition);
          for (let channel = 0; channel < 3; channel += 1) total[channel] += color[channel];
        }
      }
      const offset = rowOffset + 1 + x * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        raw[offset + channel] = Math.round(total[channel] / SAMPLES ** 2);
      }
      raw[offset + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log(`Generated ${path} (${size}x${size})`);
}

for (const [path, size] of [
  ['assets/icon.png', 1024],
  ['assets/favicon.png', 192],
  ['public/favicon.png', 192],
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/icon-maskable-512.png', 512]
]) {
  renderPng(path, size);
}
