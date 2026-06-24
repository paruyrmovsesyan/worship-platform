const sharp = require('sharp');

async function buildAppIcons() {
  const inputPath = './public/user_uploaded_logo.png';
  
  // icon-192-v3.png
  await sharp(inputPath)
    .resize(192, 192, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile('./public/icon-192-v3.png');

  // icon-512-v3.png
  await sharp(inputPath)
    .resize(512, 512, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile('./public/icon-512-v3.png');

  // apple-touch-icon-v3.png
  await sharp(inputPath)
    .resize(1024, 1024, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile('./public/apple-touch-icon-v3.png');

  console.log('Successfully generated app icons from user uploaded logo');
}

buildAppIcons().catch(console.error);
