const https = require('https');
const csv = require('csv-parser');
const { Pool } = require('pg');
const { INDUSTRY_INDICATORS } = require('./industry-config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
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
  if (!value || value === '' || value === '..') return null;
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
  return code.replace(/[^A-Z]/g, '').substring(0, 3);
}

function validateIndicatorCode(code) {
  if (!code || typeof code !== 'string' || code.length > 50) return null;
  return code.replace(/[^A-Z0-9._-]/g, '').substring(0, 50);
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

// Enhanced CSV processing with redirect handling
async function processCSVFromURL(url, processingFunction) {
  const validatedUrl = validateURL(url);
  
  return new Promise((resolve, reject) => {
    console.log(`📡 Downloading from validated URL...`);
    
    const timeout = setTimeout(() => {
      reject(new Error('Download timeout'));
    }, 600000); // 10 minute timeout
    
    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 10) {
        clearTimeout(timeout);
        reject(new Error('Too many redirects'));
        return;
      }
      
      https.get(requestUrl, (response) => {
        console.log(`📡 Response status: ${response.statusCode}`);
        console.log(`📡 Content-Type: ${response.headers['content-type']}`);
        
        // Handle redirects (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;
          if (location) {
            console.log(`📡 Following redirect to: ${location.substring(0, 100)}...`);
            makeRequest(location, redirectCount + 1);
            return;
          } else {
            clearTimeout(timeout);
            reject(new Error(`Redirect without location header`));
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          clearTimeout(timeout);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        // Check if we got HTML instead of CSV
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
          clearTimeout(timeout);
          reject(new Error('Received HTML instead of CSV - file may be too large for direct download'));
          return;
        }
        
        clearTimeout(timeout);
        processingFunction(response, resolve, reject);
      }).on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    };
    
    makeRequest(validatedUrl);
  });
}

// Enhanced main data processing
async function processMainDataFile(url) {
  console.log('🌍 Processing main World Bank data file (WDICSV.csv)...');
  
  const targetIndicators = getAllIndicators();
  console.log(`📊 Target indicators: ${targetIndicators.length} across 6 industries`);
  console.log('🎯 Industries: food, ict, infrastructure, biotech, medtech, mem');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const results = [];
    let rowCount = 0;
    let processedCount = 0;
    let validationErrors = 0;
    let relevantRows = 0;
    
    response
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        if (rowCount % 50000 === 0) {
          console.log(`📈 Processed ${rowCount} rows, found ${processedCount} valid data points, ${validationErrors} validation errors...`);
        }
        
        const indicatorCode = validateIndicatorCode(row['Indicator Code']);
        const countryCode = validateCountryCode(row['Country Code']);
        const countryName = sanitizeString(row['Country Name'], 100);
        const indicatorName = sanitizeString(row['Indicator Name'], 255);
        
        if (!indicatorCode || !countryCode || !countryName || !indicatorName) {
          validationErrors++;
          return;
        }
        
        if (targetIndicators.includes(indicatorCode)) {
          relevantRows++;
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
        console.log(`📊 Enhanced main data processing complete!`);
        console.log(`   - Total CSV rows processed: ${rowCount}`);
        console.log(`   - Target indicator rows found: ${relevantRows}`);
        console.log(`   - Valid data points extracted: ${processedCount}`);
        console.log(`   - Validation errors: ${validationErrors}`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error(`❌ CSV processing error: ${error.message}`);
        reject(error);
      });
  });
}

// Enhanced country metadata processing
async function processCountryMetadata(url) {
  console.log('🌐 Processing country metadata (WDICountry.csv)...');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const countries = [];
    let rowCount = 0;
    let validationErrors = 0;
    
    response
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        
        const code = validateCountryCode(row['Country Code']);
        const name = sanitizeString(row['Short Name'], 100);
        const region = sanitizeString(row['Region'], 50);
        const incomeGroup = sanitizeString(row['Income Group'], 50);
        const wbName = sanitizeString(row['Table Name'], 100);
        
        if (code && name) {
          countries.push({
            code: code,
            name: name,
            region: region,
            income_group: incomeGroup,
            wb_name: wbName
          });
        } else {
          validationErrors++;
        }
      })
      .on('end', () => {
        console.log(`🌐 Processed ${countries.length} countries from ${rowCount} rows`);
        console.log(`   - Validation errors: ${validationErrors}`);
        resolve(countries);
      })
      .on('error', reject);
  });
}

// Enhanced indicator metadata processing
async function processIndicatorMetadata(url) {
  console.log('📋 Processing indicator metadata (WDISeries.csv)...');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const indicators = [];
    const targetIndicators = getAllIndicators();
    let rowCount = 0;
    let relevantRows = 0;
    
    response
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        
        const indicatorCode = validateIndicatorCode(row['Series Code']);
        
        if (indicatorCode && targetIndicators.includes(indicatorCode)) {
          relevantRows++;
          
          indicators.push({
            code: indicatorCode,
            name: sanitizeString(row['Indicator Name'], 255),
            description: sanitizeString(row['Long definition'], 2000),
            unit: sanitizeString(row['Unit of measure'], 100),
            source: sanitizeString(row['Source'], 100),
            topic: sanitizeString(row['Topic'], 100),
            periodicity: sanitizeString(row['Periodicity'], 50),
            industry: getIndicatorIndustry(indicatorCode)
          });
        }
      })
      .on('end', () => {
        console.log(`📋 Processed ${indicators.length} indicator definitions from ${rowCount} rows`);
        console.log(`   - Relevant indicators found: ${relevantRows}`);
        resolve(indicators);
      })
      .on('error', reject);
  });
}

// Enhanced availability processing
async function processCountrySeriesAvailability(url) {
  console.log('🔗 Processing country-series availability (WDICountry-series.csv)...');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const availability = [];
    const targetIndicators = getAllIndicators();
    let rowCount = 0;
    let relevantRows = 0;
    
    response
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        
        const indicatorCode = validateIndicatorCode(row['Series Code']);
        const countryCode = validateCountryCode(row['Country Code']);
        
        if (indicatorCode && countryCode && targetIndicators.includes(indicatorCode)) {
          relevantRows++;
          
          availability.push({
            country_code: countryCode,
            indicator_code: indicatorCode,
            last_updated: sanitizeString(row['Last Updated Date'], 50),
            industry: getIndicatorIndustry(indicatorCode)
          });
        }
      })
      .on('end', () => {
        console.log(`🔗 Processed ${availability.length} availability records from ${rowCount} rows`);
        console.log(`   - Relevant records found: ${relevantRows}`);
        resolve(availability);
      })
      .on('error', reject);
  });
}

// Create enhanced database tables
async function createEnhancedTables() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS indicator_metadata (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        unit VARCHAR(100),
        source VARCHAR(100),
        topic VARCHAR(100),
        periodicity VARCHAR(50),
        industry VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS country_indicator_availability (
        id SERIAL PRIMARY KEY,
        country_code VARCHAR(3),
        indicator_code VARCHAR(50),
        last_updated VARCHAR(50),
        industry VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT unique_country_indicator UNIQUE (country_code, indicator_code)
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_indicator_metadata_industry ON indicator_metadata(industry);
      CREATE INDEX IF NOT EXISTS idx_availability_country_industry ON country_indicator_availability(country_code, industry);
      CREATE INDEX IF NOT EXISTS idx_indicator_metadata_code ON indicator_metadata(code);
    `);
    
    console.log('✅ Enhanced database tables and views created');
  } catch (error) {
    console.error('❌ Error creating enhanced tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Secure batch data insertion
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

// Insert country metadata
async function insertCountryMetadata(countries) {
  if (countries.length === 0) {
    console.log('⚠️  No country metadata to insert');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM countries');
    console.log('🧹 Cleared existing country metadata');
    
    for (const country of countries) {
      if (country.code && country.name) {
        await client.query(`
          INSERT INTO countries (code, name, region, income_group, wb_name)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          region = EXCLUDED.region,
          income_group = EXCLUDED.income_group,
          wb_name = EXCLUDED.wb_name,
          updated_at = CURRENT_TIMESTAMP
        `, [country.code, country.name, country.region, country.income_group, country.wb_name]);
      }
    }
    
    console.log(`✅ Inserted ${countries.length} country records`);
  } catch (error) {
    console.error('❌ Error inserting country metadata:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Insert indicator metadata
async function insertIndicatorMetadata(indicators) {
  if (indicators.length === 0) {
    console.log('⚠️  No indicator metadata to insert');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM indicator_metadata');
    console.log('🧹 Cleared existing indicator metadata');
    
    for (const indicator of indicators) {
      if (indicator.code && indicator.name) {
        await client.query(`
          INSERT INTO indicator_metadata (code, name, description, unit, source, topic, periodicity, industry)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          unit = EXCLUDED.unit,
          source = EXCLUDED.source,
          topic = EXCLUDED.topic,
          periodicity = EXCLUDED.periodicity,
          industry = EXCLUDED.industry,
          updated_at = CURRENT_TIMESTAMP
        `, [
          indicator.code,
          indicator.name,
          indicator.description,
          indicator.unit,
          indicator.source,
          indicator.topic,
          indicator.periodicity,
          indicator.industry
        ]);
      }
    }
    
    console.log(`✅ Inserted ${indicator.length} indicator metadata records`);
  } catch (error) {
    console.error('❌ Error inserting indicator metadata:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Insert availability data
async function insertCountryIndicatorAvailability(availability) {
  if (availability.length === 0) {
    console.log('⚠️  No availability data to insert');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM country_indicator_availability');
    console.log('🧹 Cleared existing availability data');
    
    for (const record of availability) {
      if (record.country_code && record.indicator_code) {
        await client.query(`
          INSERT INTO country_indicator_availability (country_code, indicator_code, last_updated, industry)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (country_code, indicator_code) DO UPDATE SET
          last_updated = EXCLUDED.last_updated,
          industry = EXCLUDED.industry
        `, [
          record.country_code,
          record.indicator_code,
          record.last_updated,
          record.industry
        ]);
      }
    }
    
    console.log(`✅ Inserted ${availability.length} availability records`);
  } catch (error) {
    console.error('❌ Error inserting availability data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Insert industry mappings
async function insertIndustryMappings() {
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM industry_indicators');
    console.log('🧹 Cleared existing industry mappings');
    
    let mappingCount = 0;
    for (const [industry, sources] of Object.entries(INDUSTRY_INDICATORS)) {
      for (const [source, indicators] of Object.entries(sources)) {
        if (Array.isArray(indicators)) {
          for (const indicator of indicators) {
            const indicatorName = `${industry.toUpperCase()}_${indicator}`;
            
            await client.query(`
              INSERT INTO industry_indicators (industry, indicator_code, indicator_name, source, priority)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT DO NOTHING
            `, [industry, indicator, indicatorName, source.toUpperCase(), 1]);
            mappingCount++;
          }
        }
      }
    }
    
    console.log(`✅ Inserted ${mappingCount} industry mappings`);
  } catch (error) {
    console.error('❌ Error inserting industry mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main enhanced processing function
async function processEnhancedWorldBankData(urls) {
  const { mainDataUrl, countryMetadataUrl, seriesMetadataUrl, availabilityUrl } = urls;
  
  try {
    console.log('🚀 Starting ENHANCED World Bank data processing...');
    console.log('📊 Processing: Main data + Country metadata + Indicator metadata + Availability data');
    console.log('🔒 Security: Input validation, sanitization, and parameterized queries enabled');
    
    // Step 1: Create enhanced tables
    await createEnhancedTables();
    
    // Step 2: Process files sequentially to avoid overwhelming Google Drive
    console.log('📥 Starting sequential file processing...');
    
    const mainData = await processMainDataFile(mainDataUrl);
    console.log('✅ Main data processing complete');
    
    const countries = countryMetadataUrl ? await processCountryMetadata(countryMetadataUrl) : [];
    console.log('✅ Country metadata processing complete');
    
    const indicators = seriesMetadataUrl ? await processIndicatorMetadata(seriesMetadataUrl) : [];
    console.log('✅ Indicator metadata processing complete');
    
    const availability = availabilityUrl ? await processCountrySeriesAvailability(availabilityUrl) : [];
    console.log('✅ Availability data processing complete');
    
    // Step 3: Insert all data securely
    console.log('💾 Starting secure database insertion...');
    await insertBatchData(mainData);
    await insertCountryMetadata(countries);
    await insertIndicatorMetadata(indicators);
    await insertCountryIndicatorAvailability(availability);
    await insertIndustryMappings();
    
    console.log('🎉 ENHANCED World Bank data processing complete!');
    console.log(`📊 Final statistics:`);
    console.log(`   - Total data points: ${mainData.length}`);
    console.log(`   - Countries: ${countries.length}`);
    console.log(`   - Indicator definitions: ${indicators.length}`);
    console.log(`   - Availability records: ${availability.length}`);
    console.log(`   - Industries: 6 (food, ict, infrastructure, biotech, medtech, mem)`);
    
  } catch (error) {
    console.error('❌ Enhanced processing failed:', error);
    throw error;
  }
}

// Command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const config = {};
  
  try {
    const mainIndex = args.indexOf('--main');
    if (mainIndex === -1 || !args[mainIndex + 1]) {
      throw new Error('--main argument is required');
    }
    config.mainDataUrl = validateURL(args[mainIndex + 1]);
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

// Command line usage
if (require.main === module) {
  const config = parseArguments();
  
  processEnhancedWorldBankData(config)
    .then(() => {
      console.log('✅ All enhanced processing complete! Your database is ready with full context.');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Enhanced processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processEnhancedWorldBankData };
