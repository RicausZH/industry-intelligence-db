const https = require('https');
const http = require('http');
const csv = require('csv-parser');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Pre-loaded mappings to avoid database calls during processing
let INDICATOR_MAPPINGS = {};
let COUNTRY_MAPPINGS = {};

// Input validation functions
function validateURL(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }
  return url;
}

function sanitizeString(str, maxLength = 255) {
  if (!str || typeof str !== 'string') return null;
  const sanitized = str
    .replace(/[<>\"'&]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .substring(0, maxLength);
  return sanitized || null;
}

function validateValue(value) {
  if (!value || value === '' || value === '..' || value === 'NaN') return null;
  const numValue = parseFloat(value);
  if (isNaN(numValue) || !isFinite(numValue)) return null;
  if (numValue < -1000000 || numValue > 1000000000) return null;
  return numValue;
}

function validateYear(year) {
  const numYear = parseInt(year);
  if (isNaN(numYear) || numYear < 1960 || numYear > 2030) return null;
  return numYear;
}

function validateCountryCode(code) {
  if (!code || typeof code !== 'string' || code.length !== 3) return null;
  return code.replace(/[^A-Z0-9]/g, '').substring(0, 3);
}

function validateIndicatorCode(code) {
  if (!code || typeof code !== 'string' || code.length > 50) return null;
  return code.replace(/[^A-Z0-9._-]/g, '').substring(0, 50);
}

// Pre-load all mappings once at startup
async function preloadMappings() {
  const client = await pool.connect();
  try {
    console.log('🔄 Pre-loading indicator and country mappings...');
    
    // Load indicator mappings
    const indicatorResult = await client.query(`
      SELECT oecd_code, industry 
      FROM indicator_mappings 
      WHERE oecd_code IS NOT NULL
    `);
    
    indicatorResult.rows.forEach(row => {
      INDICATOR_MAPPINGS[row.oecd_code] = row.industry;
    });
    
    // Load country mappings
    const countryResult = await client.query(`
      SELECT oecd_code, country_name, unified_code
      FROM country_mappings 
      WHERE oecd_code IS NOT NULL
    `);
    
    countryResult.rows.forEach(row => {
      COUNTRY_MAPPINGS[row.oecd_code] = {
        name: row.country_name,
        unified_code: row.unified_code
      };
    });
    
    console.log(`✅ Pre-loaded ${Object.keys(INDICATOR_MAPPINGS).length} indicator mappings`);
    console.log(`✅ Pre-loaded ${Object.keys(COUNTRY_MAPPINGS).length} country mappings`);
    
  } catch (error) {
    console.error('❌ Error pre-loading mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Simple lookup functions - NO DATABASE CALLS
function getIndicatorIndustry(indicatorCode) {
  return INDICATOR_MAPPINGS[indicatorCode] || 'general';
}

function getCountryInfo(countryCode) {
  const mapping = COUNTRY_MAPPINGS[countryCode];
  if (mapping) {
    return {
      name: mapping.name,
      unified_code: mapping.unified_code
    };
  }
  return {
    name: countryCode,
    unified_code: countryCode
  };
}

// CSV processing with URL handling
async function processCSVFromURL(url, processingFunction) {
  const validatedUrl = validateURL(url);
  
  return new Promise((resolve, reject) => {
    console.log(`🚀 Attempting to download from: ${validatedUrl}`);
    
    const timeout = setTimeout(() => {
      reject(new Error('Download timeout'));
    }, 900000); // 15 minute timeout
    
    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 10) {
        clearTimeout(timeout);
        reject(new Error('Too many redirects'));
        return;
      }
      
      const urlObj = new URL(requestUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };
      
      const req = client.request(options, (response) => {
        console.log(`🔄 Response status: ${response.statusCode}`);
        console.log(`📄 Content-Type: ${response.headers['content-type']}`);
        
        if (response.statusCode === 200) {
          console.log(`📊 Processing OECD data...`);
          clearTimeout(timeout);
          processingFunction(response, resolve, reject);
          return;
        }
        
        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;
          if (location) {
            console.log(`↪️ Following redirect ${redirectCount + 1}/10...`);
            makeRequest(location, redirectCount + 1);
            return;
          }
        }
        
        clearTimeout(timeout);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      });
      
      req.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      
      req.end();
    };
    
    makeRequest(validatedUrl);
  });
}

// Main OECD data processing - NO DATABASE CALLS IN LOOP
async function processOECDMSTIData(url) {
  console.log('🔄 Processing OECD MSTI data file...');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const results = [];
    let rowCount = 0;
    let processedCount = 0;
    let validationErrors = 0;
    let skippedRows = 0;
    
    const industryStats = {};
    
    response
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        if (rowCount % 50000 === 0) {
          console.log(`📊 Processed ${rowCount} rows, found ${processedCount} valid data points, ${validationErrors} validation errors...`);
        }
        
        try {
          const countryCode = validateCountryCode(row['REF_AREA']);
          const indicatorCode = validateIndicatorCode(row['MEASURE']);
          const year = validateYear(row['TIME_PERIOD']);
          const value = validateValue(row['OBS_VALUE']);
          
          if (!countryCode || !indicatorCode || !year || value === null) {
            if (!countryCode || !indicatorCode || !year) {
              validationErrors++;
            } else {
              skippedRows++;
            }
            return;
          }
          
          // Simple lookups - NO DATABASE CALLS
          const industry = getIndicatorIndustry(indicatorCode);
          const countryInfo = getCountryInfo(countryCode);
          
          // Track industry statistics
          if (!industryStats[industry]) {
            industryStats[industry] = 0;
          }
          industryStats[industry]++;
          
          results.push({
            country_code: countryInfo.unified_code,
            country_name: countryInfo.name,
            indicator_code: indicatorCode,
            indicator_name: sanitizeString(row['Measure'], 255),
            year: year,
            value: value,
            industry: industry,
            source: 'OECD'
          });
          
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing row ${rowCount}:`, error);
          validationErrors++;
        }
      })
      .on('end', () => {
        console.log(`✅ Enhanced OECD data processing complete!`);
        console.log(`   - Total CSV rows processed: ${rowCount}`);
        console.log(`   - Valid data points extracted: ${processedCount}`);
        console.log(`   - Validation errors: ${validationErrors}`);
        console.log(`   - Skipped rows: ${skippedRows}`);
        
        console.log(`\n📊 Industry distribution:`);
        Object.entries(industryStats).forEach(([industry, count]) => {
          console.log(`   - ${industry}: ${count} data points`);
        });
        
        resolve(results);
      })
      .on('error', (error) => {
        console.error(`❌ CSV processing error: ${error.message}`);
        reject(error);
      });
  });
}

// Batch insertion (same as your WB script)
async function insertBatchOECDData(data) {
  if (data.length === 0) {
    console.log('⚠️  No data to insert');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM oecd_indicators WHERE source = $1', ['OECD']);
    console.log('🗑️ Cleared existing OECD data');
    
    const batchSize = 1000;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const valueStrings = [];
      const values = [];
      let paramIndex = 1;
      
      for (const item of batch) {
        valueStrings.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`);
        values.push(
          null, // dataflow
          item.country_code,
          item.indicator_code,
          item.year.toString(),
          item.value,
          item.industry,
          item.source,
          4, // data_quality_score
          new Date() // created_at
        );
        paramIndex += 9;
      }
      
      const query = `
        INSERT INTO oecd_indicators (dataflow, country_code, indicator_code, time_period, obs_value, industry, source, data_quality_score, created_at)
        VALUES ${valueStrings.join(', ')}
      `;
      
      await client.query(query, values);
      const currentBatch = Math.ceil(i/batchSize) + 1;
      console.log(`✅ Inserted batch ${currentBatch}/${totalBatches} (${batch.length} records)`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 OECD data insertion complete!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Show integration summary
async function showIntegrationSummary() {
  const client = await pool.connect();
  try {
    console.log('\n🎯 MULTI-SOURCE INTEGRATION SUMMARY');
    console.log('====================================');
    
    // Get total counts
    const wbCount = await client.query('SELECT COUNT(*) FROM indicators WHERE source = $1', ['WB']);
    const oecdCount = await client.query('SELECT COUNT(*) FROM oecd_indicators WHERE source = $1', ['OECD']);
    
    console.log(`📊 Database Summary:`);
    console.log(`   World Bank: ${wbCount.rows[0].count} records`);
    console.log(`   OECD: ${oecdCount.rows[0].count} records`);
    console.log(`   Total: ${parseInt(wbCount.rows[0].count) + parseInt(oecdCount.rows[0].count)} records`);
    
    console.log(`\n🎉 MULTI-SOURCE INTEGRATION COMPLETE!`);
    console.log(`✅ Your database is now a multi-source powerhouse!`);
    
  } catch (error) {
    console.error('❌ Error showing summary:', error);
  } finally {
    client.release();
  }
}

// Main processing function
async function processEnhancedOECDData(url) {
  try {
    console.log('🚀 Starting Enhanced OECD MSTI Processing...');
    console.log('============================================');
    console.log('🔒 Zero database calls during CSV processing');
    console.log('📊 Using proven batch processing (1000 records per batch)');
    
    // Step 1: Pre-load mappings ONCE
    await preloadMappings();
    
    // Step 2: Process OECD data (no database calls in loop)
    console.log('\n⏳ Processing OECD MSTI data...');
    const oecdData = await processOECDMSTIData(url);
    
    // Step 3: Insert data in batches
    console.log('\n💾 Starting secure batch insertion...');
    await insertBatchOECDData(oecdData);
    
    // Step 4: Show summary
    await showIntegrationSummary();
    
    console.log('\n🎉 ENHANCED OECD PROCESSING COMPLETE!');
    console.log(`📊 Final statistics:`);
    console.log(`   - Total OECD data points: ${oecdData.length}`);
    console.log(`   - Multi-source database ready`);
    
  } catch (error) {
    console.error('❌ Enhanced processing failed:', error);
    throw error;
  }
}

// Command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  
  const urlIndex = args.indexOf('--url');
  if (urlIndex === -1 || !args[urlIndex + 1]) {
    console.error('❌ Usage: npm run process-oecd -- --url "YOUR_OECD_CSV_URL"');
    process.exit(1);
  }
  
  return { url: args[urlIndex + 1] };
}

// Command line usage
if (require.main === module) {
  const { url } = parseArguments();
  
  processEnhancedOECDData(url)
    .then(() => {
      console.log('✅ All processing complete! Multi-source database ready.');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processEnhancedOECDData };
