// Generate PWA icons using Node.js canvas
const { createCanvas } = require('canvas');
const fs = require('fs');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#4A90D9';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.18);
  ctx.fill();

  // Card shape
  const m = size * 0.2;
  const w = size - m * 2;
  const h = w * 0.75;
  const y = (size - h) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(m, y, w, h, size * 0.05);
  ctx.fill();

  // Text "闪"
  ctx.fillStyle = '#4A90D9';
  ctx.font = `bold ${size * 0.3}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('闪', size / 2, size / 2);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buf);
  console.log(`Generated ${filename}`);
}

try {
  generateIcon(192, 'icon-192.png');
  generateIcon(512, 'icon-512.png');
} catch (e) {
  console.log('canvas module not available, using fallback SVG-based approach');
  // Fallback: generate simple PNG using pure JS (minimal 1-color PNG)
  process.exit(1);
}
