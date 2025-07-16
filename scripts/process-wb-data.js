// scripts/process-wb-enhanced.js
const https = require('https');
const csv = require('csv-parser');
const { Pool } = require('pg');
const { INDUSTRY_INDICATORS } = require('./industry-config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Convert Google Drive share URL to direct download URL
function getGDriveDirectLink(shareUrl) {
  const fileId = shareUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)[1];
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
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

// Process main data file (WDICSV.csv)
async function processMainDataFile(gdriveUrl) {
  console.log('🌍 Processing main World Bank data file (WDICSV.csv)...');
  
  const targetIndicators = getAllIndicators();
  console.log(`📊 Target indicators: ${targetIndicators.length} across 6 industries`);
  
  const results = [];
  const directUrl = getGDriveDirectLink(gdriveUrl);
  
  return new Promise((resolve, reject) => {
    https.get(directUrl, (response) => {
      let rowCount = 0;
      let processedCount = 0;
      let relevantRows = 0;
      
      response
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          if (rowCount % 100000 === 0) {
            console.log(`📈 Processed ${rowCount} rows, found ${processedCount} relevant data points...`);
          }
          
          const indicatorCode = row['Indicator Code'];
          
          if (targetIndicators.includes(indicatorCode)) {
            relevantRows++;
            const industry = getIndicatorIndustry(indicatorCode);
            
            for (let year = 1990; year <= 2024; year++) {
              const value = row[year.toString()];
              if (value && value !== '' && value !== '..' && !isNaN(parseFloat(value))) {
                results.push({
                  country_code: row['Country Code'],
                  country_name: row['Country Name'],
                  indicator_code: indicatorCode,
                  indicator_name: row['Indicator Name'],
                  year: year,
                  value: parseFloat(value),
                  industry: industry,
                  source: 'WB'
                });
                processedCount++;
              }
            }
          }
        })
        .on('end', () => {
          console.log(`📊 Main data processing complete: ${processedCount} data points from ${relevantRows} target indicators`);
          resolve(results);
        })
        .on('error', reject);
    }).on('error', reject);
  });
}

// Process country metadata (WDICountry.csv)
async function processCountryMetadata(gdriveUrl) {
  console.log('🌐 Processing country metadata (WDICountry.csv)...');
  
  const countries = [];
  const directUrl = getGDriveDirectLink(gdriveUrl);
  
  return new Promise((resolve, reject) => {
    https.get(directUrl, (response) => {
      response
        .pipe(csv())
        .on('data', (row) => {
          countries.push({
            code: row['Country Code'],
            name: row['Short Name'],
            region: row['Region'],
            income_group: row['Income Group'],
            wb_name: row['Table Name']
          });
        })
        .on('end', () => {
          console.log(`🌐 Processed ${countries.length} countries`);
          resolve(countries);
        })
        .on('error', reject);
    }).on('error', reject);
  });
}

// Process indicator metadata (WDISeries.csv)
async function processIndicatorMetadata(gdriveUrl) {
  console.log('📋 Processing indicator metadata (WDISeries.csv)...');
  
  const indicators = [];
  const directUrl = getGDriveDirectLink(gdriveUrl);
  const targetIndicators = getAllIndicators();
  
  return new Promise((resolve, reject) => {
    https.get(directUrl, (response) => {
      response
        .pipe(csv())
        .on('data', (row) => {
          const indicatorCode = row['Series Code'];
          
          // Only process indicators we actually use
          if (targetIndicators.includes(indicatorCode)) {
            indicators.push({
              code: indicatorCode,
              name: row['Indicator Name'],
              description: row['Long definition'],
              unit: row['Unit of measure'],
              source: row['Source'],
              topic: row['Topic'],
              periodicity: row['Periodicity'],
              industry: getIndicatorIndustry(indicatorCode)
            });
          }
        })
        .on('end', () => {
          console.log(`📋 Processed ${indicators.length} indicator definitions`);
          resolve(indicators);
        })
        .on('error', reject);
    }).on('error', reject);
  });
}

// Process country-series availability (WDICountry-series.csv)
async function processCountrySeriesAvailability(gdriveUrl) {
  console.log('🔗 Processing country-series availability (WDICountry-series.csv)...');
  
  const availability = [];
  const directUrl = getGDriveDirectLink(gdriveUrl);
  const targetIndicators = getAllIndicators();
  
  return new Promise((resolve, reject) => {
    https.get(directUrl, (response) => {
      response
        .pipe(csv())
        .on('data', (row) => {
          const indicatorCode = row['Series Code'];
          
          // Only process indicators we actually use
          if (targetIndicators.includes(indicatorCode)) {
            availability.push({
              country_code: row['Country Code'],
              indicator_code: indicatorCode,
              last_updated: row['Last Updated Date'],
              industry: getIndicatorIndustry(indicatorCode)
            });
          }
        })
        .on('end', () => {
          console.log(`🔗 Processed ${availability.length} country-indicator availability records`);
          resolve(availability);
        })
        .on('error', reject);
    }).on('error', reject);
  });
}

// Create enhanced database tables
async function createEnhancedTables() {
  const client = await pool.connect();
  
  try {
    // Add indicator_metadata table
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
    
    // Add country_indicator_availability table
    await client.query(`
      CREATE TABLE IF NOT EXISTS country_indicator_availability (
        id SERIAL PRIMARY KEY,
        country_code VARCHAR(3),
        indicator_code VARCHAR(50),
        last_updated DATE,
        industry VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT unique_country_indicator UNIQUE (country_code, indicator_code)
      )
    `);
    
    // Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_indicator_metadata_industry ON indicator_metadata(industry);
      CREATE INDEX IF NOT EXISTS idx_availability_country_industry ON country_indicator_availability(country_code, industry);
    `);
    
    console.log('✅ Enhanced database tables created');
  } catch (error) {
    console.error('❌ Error creating enhanced tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Insert indicator metadata
async function insertIndicatorMetadata(indicators) {
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM indicator_metadata');
    console.log('🧹 Cleared existing indicator metadata');
    
    for (const indicator of indicators) {
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
    
    console.log(`✅ Inserted ${indicators.length} indicator metadata records`);
  } catch (error) {
    console.error('❌ Error inserting indicator metadata:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Insert country-indicator availability
async function insertCountryIndicatorAvailability(availability) {
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM country_indicator_availability');
    console.log('🧹 Cleared existing availability data');
    
    for (const record of availability) {
      await client.query(`
        INSERT INTO country_indicator_availability (country_code, indicator_code, last_updated, industry)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (country_code, indicator_code) DO UPDATE SET
        last_updated = EXCLUDED.last_updated,
        industry = EXCLUDED.industry
      `, [
        record.country_code,
        record.indicator_code,
        record.last_updated || null,
        record.industry
      ]);
    }
    
    console.log(`✅ Inserted ${availability.length} availability records`);
  } catch (error) {
    console.error('❌ Error inserting availability data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [Keep the existing insertBatchData, insertCountryMetadata, and insertIndustryMappings functions from before]
async function insertBatchData(data) {
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

async function insertCountryMetadata(countries) {
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
            await client.query(`
              INSERT INTO industry_indicators (industry, indicator_code, source, priority)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT DO NOTHING
            `, [industry, indicator, source.toUpperCase(), 1]);
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
    
    // Step 1: Create enhanced tables
    await createEnhancedTables();
    
    // Step 2: Process all files
    const [mainData, countries, indicators, availability] = await Promise.all([
      processMainDataFile(mainDataUrl),
      countryMetadataUrl ? processCountryMetadata(countryMetadataUrl) : Promise.resolve([]),
      seriesMetadataUrl ? processIndicatorMetadata(seriesMetadataUrl) : Promise.resolve([]),
      availabilityUrl ? processCountrySeriesAvailability(availabilityUrl) : Promise.resolve([])
    ]);
    
    // Step 3: Insert all data
    console.log('💾 Starting database insertion...');
    await insertBatchData(mainData);
    
    if (countries.length > 0) {
      await insertCountryMetadata(countries);
    }
    
    if (indicators.length > 0) {
      await insertIndicatorMetadata(indicators);
    }
    
    if (availability.length > 0) {
      await insertCountryIndicatorAvailability(availability);
    }
    
    await insertIndustryMappings();
    
    console.log('🎉 ENHANCED World Bank data processing complete!');
    console.log(`📊 Final stats:`);
    console.log(`   - Data points: ${mainData.length}`);
    console.log(`   - Countries: ${countries.length}`);
    console.log(`   - Indicator definitions: ${indicators.length}`);
    console.log(`   - Availability records: ${availability.length}`);
    console.log(`   - Industries: 6 (food, ict, infrastructure, biotech, medtech, mem)`);
    console.log(`   - Time range: 1990-2024`);
    
  } catch (error) {
    console.error('❌ Enhanced processing failed:', error);
    throw error;
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const mainDataUrl = args[args.indexOf('--main') + 1];
  const countryMetadataUrl = args[args.indexOf('--country') + 1];
  const seriesMetadataUrl = args[args.indexOf('--series') + 1];
  const availabilityUrl = args[args.indexOf('--availability') + 1];
  
  if (!mainDataUrl) {
    console.error('❌ Please provide at least the main data URL');
    console.log('Usage: node scripts/process-wb-enhanced.js --main "MAIN_URL" [--country "COUNTRY_URL"] [--series "SERIES_URL"] [--availability "AVAILABILITY_URL"]');
    process.exit(1);
  }
  
  processEnhancedWorldBankData({
    mainDataUrl,
    countryMetadataUrl,
    seriesMetadataUrl,
    availabilityUrl
  })
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
