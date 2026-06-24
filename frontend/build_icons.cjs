const sharp = require('sharp');
const fs = require('fs');

const svgBuffer = fs.readFileSync('./public/favicon.svg');

async function buildIcons() {
  // favicon.png (64x64)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile('./public/favicon.png');

  // icon-192-v2.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .flatten({ background: '#ffffff' })
    .png()
    .toFile('./public/icon-192-v2.png');

  // icon-512-v2.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .flatten({ background: '#ffffff' })
    .png()
    .toFile('./public/icon-512-v2.png');

  // apple-touch-icon-v2.png
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .flatten({ background: '#ffffff' })
    .png()
    .toFile('./public/apple-touch-icon-v2.png');

  console.log('Successfully generated all icons with transparent background from SVG');
}

buildIcons().catch(console.error);
