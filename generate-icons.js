// Corre com: node generate-icons.js
// Gera os ícones SVG convertidos para PNG

const { createCanvas } = require('canvas');
const fs = require('fs');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fundo verde
  ctx.fillStyle = '#1a7a3a';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.18);
  ctx.fill();

  // Emoji 🏓
  ctx.font = `${size * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏓', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

fs.writeFileSync('icon-192.png', drawIcon(192));
fs.writeFileSync('icon-512.png', drawIcon(512));
console.log('Ícones gerados!');
