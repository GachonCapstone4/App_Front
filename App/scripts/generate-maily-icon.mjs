import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const size = 1024;
const outputPath = path.resolve("build/icon.png");
const pixels = new Uint8Array(size * size * 4);

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothAlpha(distance) {
  return clamp(0.5 - distance, 0, 1);
}

function roundedRectDistance(px, py, x, y, width, height, radius) {
  const qx = Math.abs(px - (x + width / 2)) - (width / 2 - radius);
  const qy = Math.abs(py - (y + height / 2)) - (height / 2 - radius);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius;
}

function circleDistance(px, py, cx, cy, radius) {
  return Math.hypot(px - cx, py - cy) - radius;
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function blendPixel(index, color, alpha) {
  if (alpha <= 0) return;

  const existingAlpha = pixels[index + 3] / 255;
  const nextAlpha = alpha + existingAlpha * (1 - alpha);

  for (let channel = 0; channel < 3; channel += 1) {
    const existing = pixels[index + channel] * existingAlpha;
    const incoming = color[channel] * alpha;
    pixels[index + channel] = Math.round((incoming + existing * (1 - alpha)) / nextAlpha);
  }

  pixels[index + 3] = Math.round(nextAlpha * 255);
}

function drawShape(colorHex, distanceFn) {
  const color = hexToRgb(colorHex);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      blendPixel((y * size + x) * 4, color, smoothAlpha(distanceFn(x + 0.5, y + 0.5)));
    }
  }
}

function rotatedRoundedRectDistance(px, py, cx, cy, x, y, width, height, radius, degrees) {
  const radians = (-degrees * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const rotatedX = cx + dx * Math.cos(radians) - dy * Math.sin(radians);
  const rotatedY = cy + dx * Math.sin(radians) + dy * Math.cos(radians);
  return roundedRectDistance(rotatedX, rotatedY, x, y, width, height, radius);
}

drawShape("#102033", (x, y) => roundedRectDistance(x, y, 64, 64, 896, 896, 224));
drawShape("#2DD4BF", (x, y) =>
  rotatedRoundedRectDistance(x, y, 512, 474, 168, 382, 688, 184, 92, -18),
);
drawShape("#38BDF8", (x, y) => circleDistance(x, y, 744, 284, 72));
drawShape("#FFFFFF", (x, y) => {
  const strokeRadius = 38;
  const distances = [
    segmentDistance(x, y, 330, 666, 330, 392),
    segmentDistance(x, y, 330, 392, 512, 548),
    segmentDistance(x, y, 512, 548, 694, 392),
    segmentDistance(x, y, 694, 392, 694, 666),
  ];
  return Math.min(...distances) - strokeRadius;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const payload = Buffer.concat([typeBuffer, data]);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(payload), 8 + data.length);
  return result;
}

const raw = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y += 1) {
  const rowOffset = y * (size * 4 + 1);
  raw[rowOffset] = 0;
  Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, rowOffset + 1);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);

console.log(`Generated ${outputPath}`);
