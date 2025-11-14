const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');

['icon.png', 'icon.ico', 'icon.icns'].forEach(filename => {
  const targetPath = path.join(assetsDir, filename);
  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(svgPath, targetPath);
    console.log(`Created: ${filename}`);
  }
});
