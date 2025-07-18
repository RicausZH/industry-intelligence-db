const fs = require('fs');
const https = require('https');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

// Simple ZIP extraction function
function extractZip(zipPath, extractPath) {
  return new Promise((resolve, reject) => {
    const AdmZip = require('adm-zip');
    
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);
      console.log('✅ ZIP extraction complete');
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function downloadWorldBankData() {
  console.log('🌍 Downloading World Bank data...');
  
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const zipPath = path.join(dataDir, 'WDI_CSV.zip');
  const url = 'https://databank.worldbank.org/data/download/WDI_CSV.zip';
  
  try {
    // Download the file
    const response = await new Promise((resolve, reject) => {
      https.get(url, resolve).on('error', reject);
    });
    
    const fileStream = fs.createWriteStream(zipPath);
    await pipelineAsync(response, fileStream);
    
    console.log('📦 Download complete, extracting...');
    
    // Extract the ZIP file
    await extractZip(zipPath, dataDir);
    
    // Check if the main file exists
    const csvPath = path.join(dataDir, 'WDIData.csv');
    if (fs.existsSync(csvPath)) {
      console.log('📊 WDIData.csv is ready for processing');
      
      // Get file size for info
      const stats = fs.statSync(csvPath);
      console.log(`📏 File size: ${Math.round(stats.size / 1024 / 1024)}MB`);
      
      // Clean up ZIP file to save space
      fs.unlinkSync(zipPath);
      console.log('🧹 Cleaned up ZIP file');
      
    } else {
      throw new Error('WDIData.csv not found after extraction');
    }
    
  } catch (error) {
    console.error('❌ Download/extraction failed:', error);
    throw error;
  }
}

if (require.main === module) {
  downloadWorldBankData()
    .then(() => console.log('🎉 Data download complete!'))
    .catch(error => {
      console.error('❌ Process failed:', error);
      process.exit(1);
    });
}

module.exports = { downloadWorldBankData };
