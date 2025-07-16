// scripts/process-wb-complete.js
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
  console.log('🎯 Industries: food, ict, infrastructure, biotech, medtech, mem');
  
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
            console.log(`📈 Processed ${rowCount} rows, found ${processedCount} relevant data points from ${relevantRows} target indicators...`);
          }
          
          const indicatorCode = row['Indicator Code'];
          
          if (targetIndicators.includes(indicatorCode)) {
            relevantRows++;
            const industry = getIndicatorIndustry(indicatorCode);
            
            // Process years 1990-2024
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
        .on('end', async () => {
          console.log(`📊 Processing complete!`);
          console.log(`   - Total CSV rows processed: ${rowCount}`);
          console.log(`   - Target indicator rows found: ${relevantRows}`);
          console.log(`   - Final data points extracted: ${processedCount}`);
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
        .on('end', async () => {
          console.log(`🌐 Processed ${countries.length} countries`);
          resolve(countries);
        })
        .on('error', reject);
    }).on('error', reject);
  });
}

// Insert data in batches
async function insertBatchData(data) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear existing data
    await client.query('DELETE FROM indicators WHERE source = $1', ['WB']);
    console.log('🧹 Cleared existing World Bank data');
    
    const batchSize = 1000;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Create parameterized query for safety
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

// Main processing function
async function processCompleteWorldBankData(urls) {
  const { mainDataUrl, countryMetadataUrl } = urls;
  
  try {
    console.log('🚀 Starting complete World Bank data processing...');
    console.log('📅 Processing data from 1990-2024 for 6 industries');
    
    // Step 1: Process main data file
    const mainData = await processMainDataFile(mainDataUrl);
    console.log(`📊 Main data processing complete: ${mainData.length} data points`);
    
    // Step 2: Process country metadata
    let countries = [];
    if (countryMetadataUrl) {
      countries = await processCountryMetadata(countryMetadataUrl);
    }
    
    // Step 3: Insert all data
    console.log('💾 Starting database insertion...');
    await insertBatchData(mainData);
    
    if (countries.length > 0) {
      await insertCountryMetadata(countries);
    }
    
    await insertIndustryMappings();
    
    console.log('🎉 Complete World Bank data processing finished!');
    console.log(`📊 Final stats:`);
    console.log(`   - Data points: ${mainData.length}`);
    console.log(`   - Countries: ${countries.length}`);
    console.log(`   - Industries: 6 (food, ict, infrastructure, biotech, medtech, mem)`);
    console.log(`   - Time range: 1990-2024`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw error;
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const mainDataUrl = args[args.indexOf('--main') + 1];
  const countryMetadataUrl = args[args.indexOf('--country') + 1];
  
  if (!mainDataUrl) {
    console.error('❌ Please provide main data URL');
    console.log('Usage: node scripts/process-wb-complete.js --main "MAIN_CSV_URL" --country "COUNTRY_CSV_URL"');
    process.exit(1);
  }
  
  processCompleteWorldBankData({
    mainDataUrl,
    countryMetadataUrl
  })
    .then(() => {
      console.log('✅ All processing complete! Your database is ready.');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processCompleteWorldBankData };
