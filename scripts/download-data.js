const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

async function downloadWorldBankData() {
  console.log('🌍 Downloading World Bank data...');
  
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  
  const zipPath = path.join(dataDir, 'WDI_CSV.zip');
  const url = 'https://databank.worldbank.org/data/download/WDI_CSV.zip';
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(zipPath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('📦 Download complete, extracting...');
        
        try {
          // Extract the zip file
          execSync(`cd ${dataDir} && unzip -o WDI_CSV.zip`);
          console.log('✅ Data extraction complete!');
          
          // Check if the main file exists
          const csvPath = path.join(dataDir, 'WDIData.csv');
          if (fs.existsSync(csvPath)) {
            console.log('📊 WDIData.csv is ready for processing');
            resolve();
          } else {
            reject(new Error('WDIData.csv not found after extraction'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

if (require.main === module) {
  downloadWorldBankData()
    .then(() => console.log('🎉 Data download complete!'))
    .catch(error => {
      console.error('❌ Download failed:', error);
      process.exit(1);
    });
}

module.exports = { downloadWorldBankData };
