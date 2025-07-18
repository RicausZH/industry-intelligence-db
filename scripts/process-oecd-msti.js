//push
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

// OECD MSTI Column Mapping (based on your uploaded file structure)
const OECD_COLUMNS = {
  REF_AREA: 'country_code',
  'Reference area': 'country_name',
  MEASURE: 'indicator_code',
  'Measure': 'indicator_description',
  TIME_PERIOD: 'year',
  OBS_VALUE: 'value',
  UNIT_MEASURE: 'unit',
  'Unit of measure': 'unit_description'
};

// Input validation functions (adapted from your process-wb-enhanced.js)
function validateURL(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }
  
  // Support Google Drive URLs, Railway URLs, and GenSpark URLs
  const googleDrivePattern = /^https:\/\/drive\.google\.com\/uc\?export=download&id=[a-zA-Z0-9_-]+$/;
  const railwayPattern = /^https:\/\/railway-file-upload-production-\d+\.up\.railway\.app\/download\/\d+-[a-zA-Z0-9_-]+\.csv$/;
  const gensparkPattern = /^https:\/\/page\.gensparksite\.com\/get_upload_url\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z0-9-]+$/;
  
  if (!googleDrivePattern.test(url) && !railwayPattern.test(url) && !gensparkPattern.test(url)) {
    console.log('⚠️  URL format not recognized, attempting to process anyway...');
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
  if (numValue < -1000000000 || numValue > 1000000000) return null;
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

// Get industry for OECD indicator using your mapping table
async function getIndicatorIndustry(indicatorCode) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT industry 
      FROM indicator_mappings 
      WHERE oecd_code = $1
    `, [indicatorCode]);
    
    if (result.rows.length > 0) {
      return result.rows[0].industry;
    }
    return 'general'; // Default for unmapped indicators
  } catch (error) {
    console.error(`Error mapping indicator ${indicatorCode}:`, error);
    return 'general';
  } finally {
    client.release();
  }
}

// Get country name from mapping table
async function getCountryName(countryCode) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT country_name 
      FROM country_mappings 
      WHERE oecd_code = $1 OR unified_code = $1
    `, [countryCode]);
    
    if (result.rows.length > 0) {
      return result.rows[0].country_name;
    }
    return countryCode; // Fallback to code if no mapping found
  } catch (error) {
    console.error(`Error mapping country ${countryCode}:`, error);
    return countryCode;
  } finally {
    client.release();
  }
}

// Enhanced CSV processing with GenSpark URL support
async function processCSVFromURL(url, processingFunction) {
  const validatedUrl = validateURL(url);
  
  return new Promise((resolve, reject) => {
    console.log(`🚀 Attempting to download OECD MSTI data from: ${validatedUrl}`);
    
    const timeout = setTimeout(() => {
      reject(new Error('Download timeout (10 minutes)'));
    }, 600000); // 10 minute timeout
    
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
          'User-Agent': 'Mozilla/5.0 (Industry-Intelligence-DB/1.0)',
          'Accept': 'text/csv,application/csv,text/plain,*/*'
        }
      };
      
      const req = client.request(options, (response) => {
        console.log(`🔄 Response status: ${response.statusCode}`);
        console.log(`📄 Content-Type: ${response.headers['content-type']}`);
        console.log(`📊 Content-Length: ${response.headers['content-length']}`);
        
        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;
          if (location) {
            console.log(`↪️ Following redirect ${redirectCount + 1}/10...`);
            makeRequest(location, redirectCount + 1);
            return;
          }
        }
        
        if (response.statusCode === 200) {
          const contentType = response.headers['content-type'] || '';
          
          // Accept CSV, text, or octet-stream content
          if (contentType.includes('text/csv') || 
              contentType.includes('application/csv') ||
              contentType.includes('text/plain') ||
              contentType.includes('application/octet-stream') ||
              contentType.includes('charset=UTF-8')) {
            console.log(`📊 Receiving OECD MSTI data (${response.headers['content-length']} bytes)...`);
            clearTimeout(timeout);
            processingFunction(response, resolve, reject);
            return;
          }
          
          // Handle HTML response (potential download page)
          if (contentType.includes('text/html')) {
            console.log(`🌐 Received HTML page, attempting to extract download link...`);
            
            let htmlData = '';
            response.on('data', chunk => {
              htmlData += chunk.toString();
            });
            
            response.on('end', () => {
              // Try to process as CSV anyway (some servers return HTML content-type for CSV)
              console.log(`🔄 Attempting to process HTML response as CSV...`);
              const csvResponse = {
                pipe: (parser) => {
                  parser.write(htmlData);
                  parser.end();
                  return parser;
                },
                on: (event, callback) => {
                  if (event === 'end') {
                    setTimeout(callback, 100);
                  }
                  return this;
                }
              };
              processingFunction(csvResponse, resolve, reject);
            });
            return;
          }
        }
        
        // If we get here, something went wrong
        clearTimeout(timeout);
        reject(new Error(`Unexpected response: ${response.statusCode} ${response.headers['content-type']}`));
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

// Main OECD MSTI data processing
async function processOECDMSTIData(url) {
  console.log('🔄 Processing OECD MSTI data file...');
  
  return processCSVFromURL(url, async (response, resolve, reject) => {
    const results = [];
    let rowCount = 0;
    let processedCount = 0;
    let validationErrors = 0;
    let relevantRows = 0;
    let skippedRows = 0;
    
    const industryStats = {};
    
    response
      .pipe(csv())
      .on('data', async (row) => {
        rowCount++;
        
        if (rowCount % 10000 === 0) {
          console.log(`📊 Processed ${rowCount} rows, found ${processedCount} valid data points, ${validationErrors} validation errors...`);
        }
        
        try {
          // Extract and validate core fields
          const countryCode = validateCountryCode(row['REF_AREA']);
          const indicatorCode = validateIndicatorCode(row['MEASURE']);
          const year = validateYear(row['TIME_PERIOD']);
          const value = validateValue(row['OBS_VALUE']);
          
          if (!countryCode || !indicatorCode || !year) {
            validationErrors++;
            return;
          }
          
          // Skip zero values (many in OECD data)
          if (value === 0) {
            skippedRows++;
            return;
          }
          
          // Skip null values
          if (value === null) {
            skippedRows++;
            return;
          }
          
          relevantRows++;
          
          // Get industry mapping
          const industry = await getIndicatorIndustry(indicatorCode);
          
          // Get country name
          const countryName = await getCountryName(countryCode);
          
          // Track industry statistics
          if (!industryStats[industry]) {
            industryStats[industry] = 0;
          }
          industryStats[industry]++;
          
          results.push({
            country_code: countryCode,
            country_name: countryName,
            indicator_code: indicatorCode,
            indicator_description: sanitizeString(row['Measure'], 255),
            year: year,
            value: value,
            industry: industry,
            unit: sanitizeString(row['Unit of measure'], 50),
            source: 'OECD'
          });
          
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing row ${rowCount}:`, error);
          validationErrors++;
        }
      })
      .on('end', () => {
        console.log(`✅ OECD MSTI data processing complete!`);
        console.log(`   - Total CSV rows processed: ${rowCount}`);
        console.log(`   - Valid data points extracted: ${processedCount}`);
        console.log(`   - Validation errors: ${validationErrors}`);
        console.log(`   - Skipped rows (zero/null values): ${skippedRows}`);
        console.log(`   - Relevant rows: ${relevantRows}`);
        
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

// Secure batch data insertion into oecd_indicators table
async function insertOECDData(data) {
  if (data.length === 0) {
    console.log('⚠️  No OECD data to insert');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear existing OECD data
    const deleteResult = await client.query('DELETE FROM oecd_indicators WHERE source = $1', ['OECD']);
    console.log(`🗑️ Cleared ${deleteResult.rowCount} existing OECD records`);
    
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
          null, // dataflow - not used in our simplified structure
          item.country_code,
          item.indicator_code,
          item.year.toString(),
          item.value,
          item.industry,
          item.source,
          4, // data_quality_score for OECD
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
    
    // Show final statistics
    const statsResult = await client.query(`
      SELECT 
        industry,
        COUNT(*) as records,
        COUNT(DISTINCT country_code) as countries,
        COUNT(DISTINCT indicator_code) as indicators,
        MIN(time_period::integer) as min_year,
        MAX(time_period::integer) as max_year
      FROM oecd_indicators 
      GROUP BY industry 
      ORDER BY records DESC
    `);
    
    console.log('\n📊 Final OECD data statistics by industry:');
    statsResult.rows.forEach(row => {
      console.log(`   ${row.industry}: ${row.records} records, ${row.countries} countries, ${row.indicators} indicators (${row.min_year}-${row.max_year})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting OECD data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update data source last_updated timestamp
async function updateDataSourceTimestamp() {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE data_sources 
      SET last_updated = CURRENT_TIMESTAMP 
      WHERE source_code = 'OECD'
    `);
    console.log('✅ Updated OECD data source timestamp');
  } catch (error) {
    console.error('❌ Error updating data source timestamp:', error);
  } finally {
    client.release();
  }
}

// Show integration success summary
async function showIntegrationSummary() {
  const client = await pool.connect();
  try {
    console.log('\n🎯 MULTI-SOURCE INTEGRATION SUMMARY');
    console.log('====================================');
    
    // Total records by source
    const sourceStats = await client.query(`
      SELECT 
        'World Bank' as source,
        COUNT(*) as records,
        COUNT(DISTINCT country_code) as countries,
        COUNT(DISTINCT indicator_code) as indicators
      FROM indicators
      WHERE source = 'WB'
      UNION ALL
      SELECT 
        'OECD' as source,
        COUNT(*) as records,
        COUNT(DISTINCT country_code) as countries,
        COUNT(DISTINCT indicator_code) as indicators
      FROM oecd_indicators
      WHERE source = 'OECD'
    `);
    
    console.log('📊 Data by source:');
    sourceStats.rows.forEach(row => {
      console.log(`   ${row.source}: ${row.records} records, ${row.countries} countries, ${row.indicators} indicators`);
    });
    
    // Industry enhancement comparison
    const industryComparison = await client.query(`
      SELECT 
        wb.industry,
        wb.wb_records,
        COALESCE(oecd.oecd_records, 0) as oecd_records,
        wb.wb_records + COALESCE(oecd.oecd_records, 0) as total_records
      FROM (
        SELECT industry, COUNT(*) as wb_records
        FROM indicators 
        WHERE source = 'WB'
        GROUP BY industry
      ) wb
      LEFT JOIN (
        SELECT industry, COUNT(*) as oecd_records
        FROM oecd_indicators
        WHERE source = 'OECD'
        GROUP BY industry
      ) oecd ON wb.industry = oecd.industry
      ORDER BY total_records DESC
    `);
    
    console.log('\n🏭 Industry enhancement (WB + OECD):');
    industryComparison.rows.forEach(row => {
      const enhancement = row.oecd_records > 0 ? 
        `+${row.oecd_records} (${((row.oecd_records / row.wb_records) * 100).toFixed(1)}% increase)` :
        'No OECD data';
      console.log(`   ${row.industry}: ${row.wb_records} (WB) + ${row.oecd_records} (OECD) = ${row.total_records} total`);
    });
    
    // Calculate total database size
    const totalResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM indicators WHERE source = 'WB') +
        (SELECT COUNT(*) FROM oecd_indicators WHERE source = 'OECD') as total_records
    `);
    
    console.log(`\n🎉 INTEGRATION COMPLETE!`);
    console.log(`   Total database size: ${totalResult.rows[0].total_records} records`);
    console.log(`   Multi-source platform: World Bank + OECD`);
    console.log(`   Ready for ChatGPT report generation`);
    
  } catch (error) {
    console.error('❌ Error generating integration summary:', error);
  } finally {
    client.release();
  }
}

// Main OECD processing function
async function processOECDIntegration(url) {
  try {
    console.log('🚀 Starting OECD MSTI Integration...');
    console.log('====================================');
    console.log('🔒 Safe mode: Adding OECD data without touching World Bank data');
    console.log('🎯 Target: Transform innovation from weakest to strongest industry');
    
    console.log('\n⏳ Step 1: Processing OECD MSTI CSV file...');
    const oecdData = await processOECDMSTIData(url);
    
    console.log('\n⏳ Step 2: Inserting OECD data into database...');
    await insertOECDData(oecdData);
    
    console.log('\n⏳ Step 3: Updating data source metadata...');
    await updateDataSourceTimestamp();
    
    console.log('\n⏳ Step 4: Generating integration summary...');
    await showIntegrationSummary();
    
    console.log('\n🎉 OECD MSTI INTEGRATION COMPLETE!');
    console.log('✅ OECD data successfully integrated');
    console.log('✅ World Bank data completely preserved');
    console.log('✅ Multi-source database operational');
    console.log('✅ Ready for unified view creation');
    
  } catch (error) {
    console.error('❌ OECD integration failed:', error);
    throw error;
  }
}

// Command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  
  const urlIndex = args.indexOf('--url');
  if (urlIndex === -1 || !args[urlIndex + 1]) {
    console.error('❌ Usage: npm run process-oecd -- --url "YOUR_OECD_CSV_URL"');
    console.error('📁 Example: npm run process-oecd -- --url "https://page.gensparksite.com/get_upload_url/..."');
    process.exit(1);
  }
  
  return {
    url: args[urlIndex + 1]
  };
}

// Command line usage
if (require.main === module) {
  const { url } = parseArguments();
  
  processOECDIntegration(url)
    .then(() => {
      console.log('✅ OECD integration complete! Your multi-source database is ready.');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ OECD integration failed:', error);
      process.exit(1);
    });
}

module.exports = { processOECDIntegration };
