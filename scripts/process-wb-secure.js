// scripts/process-wb-secure.js
const https = require('https');
const csv = require('csv-parser');
const { Pool } = require('pg');
const { INDUSTRY_INDICATORS } = require('./industry-config');

// Database connection with security settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Input validation functions
function validateURL(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }
  
  const urlPattern = /^https:\/\/drive\.google\.com\/uc\?export=download&id=[a-zA-Z0-9_-]+$/;
  if (!urlPattern.test(url)) {
    throw new Error('Invalid Google Drive URL format');
  }
  
  return url;
}

function validateCountryCode(code) {
  if (!code || typeof code !== 'string' || code.length !== 3) {
    return null;
  }
  return code.replace(/[^A-Z]/g, '').substring(0, 3);
}

function validateIndicatorCode(code) {
  if (!code || typeof code !== 'string' || code.length > 50) {
    return null;
  }
  return code.replace(/[^A-Z0-9._-]/g, '').substring(0, 50);
}

function validateYear(year) {
  const numYear = parseInt(year);
  if (isNaN(numYear) || numYear < 1960 || numYear > 2030) {
    return null;
  }
  return numYear;
}

function validateValue(value) {
  if (!value || value === '' || value === '..') {
    return null;
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue) || !isFinite(numValue)) {
    return null;
  }
  
  // Reasonable bounds for economic indicators
  if (numValue < -1000000 || numValue > 1000000000) {
    return null;
  }
  
  return numValue;
}

function sanitizeString(str, maxLength = 255) {
  if (!str || typeof str !== 'string') {
    return null;
  }
  
  // Remove potentially dangerous characters
  const sanitized = str
    .replace(/[<>\"'&]/g, '') // Remove HTML/SQL injection chars
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .substring(0, maxLength);
  
  return sanitized || null;
}

function getAllIndicators() {
  const allIndicators = new Set();
  Object.values(INDUSTRY_INDICATORS).forEach(industry => {
    Object.values(industry).forEach(sourceIndicators => {
      if (Array.isArray(sourceIndicators)) {
        sourceIndicators.forEach(indicator => allIndicators.add(indicator));
      }
    });
  });
  return Array.from(allIndicators);
}

function getIndicatorIndustry(indicatorCode) {
  for (const [industry, sources] of Object.entries(INDUSTRY_INDICATORS)) {
    for (const indicators of Object.values(sources)) {
      if (Array.isArray(indicators) && indicators.includes(indicatorCode)) {
        return industry;
      }
    }
  }
  return 'general';
}

// Secure CSV processing with validation
async function processCSVFromURL(url, processingFunction) {
  const validatedUrl = validateURL(url);
  
  return new Promise((resolve, reject) => {
    console.log(`📡 Downloading from validated URL...`);
    
    const timeout = setTimeout(() => {
      reject(new Error('Download timeout'));
    }, 300000); // 5 minute timeout
    
    https.get(validatedUrl, (response) => {
      clearTimeout(timeout);
      
      console.log(`📡 Response status: ${response.statusCode}`);
      console.log(`📡 Content-Type: ${response.headers['content-type']}`);
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      // Validate content type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('text/csv')) {
        reject(new Error('Invalid content type - expected CSV'));
        return;
      }
      
      processingFunction(response, resolve, reject);
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Secure main data processing
async function processMainDataFile(url) {
  console.log('🌍 Processing main World Bank data file (WDICSV.csv)...');
  
  const targetIndicators = getAllIndicators();
  console.log(`📊 Target indicators: ${targetIndicators.length} across 6 industries`);
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const results = [];
    let rowCount = 0;
    let processedCount = 0;
    let validationErrors = 0;
    
    response
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        if (rowCount % 50000 === 0) {
          console.log(`📈 Processed ${rowCount} rows, found ${processedCount} valid data points, ${validationErrors} validation errors...`);
        }
        
        // Validate and sanitize input
        const indicatorCode = validateIndicatorCode(row['Indicator Code']);
        const countryCode = validateCountryCode(row['Country Code']);
        const countryName = sanitizeString(row['Country Name'], 100);
        const indicatorName = sanitizeString(row['Indicator Name'], 255);
        
        if (!indicatorCode || !countryCode || !countryName || !indicatorName) {
          validationErrors++;
          return;
        }
        
        if (targetIndicators.includes(indicatorCode)) {
          const industry = getIndicatorIndustry(indicatorCode);
          
          for (let year = 1990; year <= 2024; year++) {
            const validatedYear = validateYear(year);
            const validatedValue = validateValue(row[year.toString()]);
            
            if (validatedYear && validatedValue !== null) {
              results.push({
                country_code: countryCode,
                country_name: countryName,
                indicator_code: indicatorCode,
                indicator_name: indicatorName,
                year: validatedYear,
                value: validatedValue,
                industry: industry,
                source: 'WB'
              });
              processedCount++;
            }
          }
        }
      })
      .on('end', () => {
        console.log(`📊 Main data processing complete!`);
        console.log(`   - Total CSV rows processed: ${rowCount}`);
        console.log(`   - Valid data points extracted: ${processedCount}`);
        console.log(`   - Validation errors: ${validationErrors}`);
        resolve(results);
      })
      .on('error', reject);
  });
}

// Secure batch insertion with parameterized queries
async function insertBatchData(data) {
  if (data.length === 0) {
    console.log('⚠️  No data to insert');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM indicators WHERE source = $1', ['WB']);
    console.log('🧹 Cleared existing World Bank data');
    
    const batchSize = 1000;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Use parameterized queries to prevent SQL injection
      const valueStrings = [];
      const values = [];
      let paramIndex = 1;
      
      for (const item of batch) {
        valueStrings.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
        values.push(
          item.country_code,
          item.country_name,
          item.indicator_code,
          item.indicator_name,
          item.year,
          item.value,
          item.industry,
          item.source
        );
        paramIndex += 8;
      }
      
      const query = `
        INSERT INTO indicators (country_code, country_name, indicator_code, indicator_name, year, value, industry, source)
        VALUES ${valueStrings.join(', ')}
        ON CONFLICT (country_code, indicator_code, year, source) DO UPDATE SET
        value = EXCLUDED.value,
        country_name = EXCLUDED.country_name,
        indicator_name = EXCLUDED.indicator_name,
        industry = EXCLUDED.industry,
        updated_at = CURRENT_TIMESTAMP
      `;
      
      await client.query(query, values);
      const currentBatch = Math.ceil(i/batchSize) + 1;
      console.log(`✅ Inserted batch ${currentBatch}/${totalBatches} (${batch.length} records)`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 World Bank data insertion complete!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Secure command line argument processing
function parseArguments() {
  const args = process.argv.slice(2);
  const config = {};
  
  try {
    config.mainDataUrl = validateURL(args[args.indexOf('--main') + 1]);
  } catch (error) {
    console.error('❌ Invalid main data URL:', error.message);
    process.exit(1);
  }
  
  // Optional parameters
  const countryIndex = args.indexOf('--country');
  if (countryIndex !== -1 && args[countryIndex + 1]) {
    try {
      config.countryMetadataUrl = validateURL(args[countryIndex + 1]);
    } catch (error) {
      console.warn('⚠️  Invalid country metadata URL, skipping');
    }
  }
  
  const seriesIndex = args.indexOf('--series');
  if (seriesIndex !== -1 && args[seriesIndex + 1]) {
    try {
      config.seriesMetadataUrl = validateURL(args[seriesIndex + 1]);
    } catch (error) {
      console.warn('⚠️  Invalid series metadata URL, skipping');
    }
  }
  
  const availabilityIndex = args.indexOf('--availability');
  if (availabilityIndex !== -1 && args[availabilityIndex + 1]) {
    try {
      config.availabilityUrl = validateURL(args[availabilityIndex + 1]);
    } catch (error) {
      console.warn('⚠️  Invalid availability URL, skipping');
    }
  }
  
  return config;
}

// Main processing function
async function processWorldBankData(urls) {
  try {
    console.log('🚀 Starting SECURE World Bank data processing...');
    
    // Process main data file
    const mainData = await processMainDataFile(urls.mainDataUrl);
    
    // Insert data securely
    console.log('💾 Starting secure database insertion...');
    await insertBatchData(mainData);
    
    console.log('🎉 Secure World Bank data processing complete!');
    console.log(`📊 Final stats: ${mainData.length} data points processed`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw error;
  }
}

// Command line usage
if (require.main === module) {
  const config = parseArguments();
  
  processWorldBankData(config)
    .then(() => {
      console.log('✅ Secure processing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processWorldBankData };
