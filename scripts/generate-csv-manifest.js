const fs = require('fs');
const path = require('path');

// Generate CSV manifest for production builds
const srcDataDir = path.join(__dirname, '../src/data');
const publicDir = path.join(__dirname, '../public');

try {
  // Read all CSV files from src/data
  const files = fs.readdirSync(srcDataDir)
    .filter(file => file.endsWith('.csv'));
  
  console.log('Found CSV files:', files);
  
  // Copy CSV files to public/data
  const publicDataDir = path.join(publicDir, 'data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  
  files.forEach(file => {
    fs.copyFileSync(
      path.join(srcDataDir, file),
      path.join(publicDataDir, file)
    );
    console.log(`Copied ${file} to public/data/`);
  });
  
  // Create manifest
  const manifest = { files };
  fs.writeFileSync(
    path.join(publicDir, 'csv-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('Generated csv-manifest.json');
} catch (error) {
  console.error('Error generating CSV manifest:', error);
}