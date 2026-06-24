const sharp = require('sharp');
const fs = require('fs');

async function processImage() {
  const inputPath = '/Users/paruyrmovsesyan/.gemini/antigravity/brain/95a46147-64cd-44c3-a97e-9385480ac348/media__1782131013082.png';
  
  // Read image, ensure it's RGBA
  const image = sharp(inputPath).ensureAlpha();
  const metadata = await image.metadata();
  
  // Get raw pixels
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  
  // Loop through pixels and make white (or near white) transparent
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // If it's a white-ish background pixel
    if (r > 240 && g > 240 && b > 240) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }
  
  const transparentImage = sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  });

  // favicon.png (64x64)
  await transparentImage.clone()
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('./public/favicon.png');

  // icon-192-v2.png
  await transparentImage.clone()
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('./public/icon-192-v2.png');

  // icon-512-v2.png
  await transparentImage.clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('./public/icon-512-v2.png');

  // apple-touch-icon-v2.png
  await transparentImage.clone()
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('./public/apple-touch-icon-v2.png');

  console.log('Successfully generated all icons with transparent background from the user image');
}

processImage().catch(console.error);
