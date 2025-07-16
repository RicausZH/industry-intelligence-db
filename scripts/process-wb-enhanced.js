// scripts/process-wb-simple.js
const https = require('https');
const csv = require('csv-parser');
const { Pool } = require('pg');
const { INDUSTRY_INDICATORS } = require('./industry-config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

// Simple CSV processing for direct download URLs
async function processCSVFromURL(url, processingFunction) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Downloading from: ${url}`);
    
    https.get(url, (response) => {
      console.log(`📡 Response status: ${response.statusCode}`);
      console.log(`📡 Content-Type: ${response.headers['content-type']}`);
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      processingFunction(response, resolve, reject);
    }).on('error', reject);
  });
}

// Process main data file (WDICSV.csv)
async function processMainDataFile(url) {
  console.log('🌍 Processing main World Bank data file (WDICSV.csv)...');
  
  const targetIndicators = getAllIndicators();
  console.log(`📊 Target indicators: ${targetIndicators.length} across 6 industries`);
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const results = [];
    let rowCount = 0;
    let processedCount = 0;
    let relevantRows = 0;
    
    response
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        if (rowCount % 50000 === 0) {
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
        console.log(`📊 Main data processing complete!`);
        console.log(`   - Total CSV rows processed: ${rowCount}`);
        console.log(`   - Target indicator rows found: ${relevantRows}`);
        console.log(`   - Final data points extracted: ${processedCount}`);
        resolve(results);
      })
      .on('error', reject);
  });
}

// Process country metadata
async function processCountryMetadata(url) {
  console.log('🌐 Processing country metadata (WDICountry.csv)...');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const countries = [];
    
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
  });
}

// Process indicator metadata
async function processIndicatorMetadata(url) {
  console.log('📋 Processing indicator metadata (WDISeries.csv)...');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const indicators = [];
    const targetIndicators = getAllIndicators();
    
    response
      .pipe(csv())
      .on('data', (row) => {
        const indicatorCode = row['Series Code'];
        
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
  });
}

// Process country-series availability
async function processCountrySeriesAvailability(url) {
  console.log('🔗 Processing country-series availability (WDICountry-series.csv)...');
  
  return processCSVFromURL(url, (response, resolve, reject) => {
    const availability = [];
    const targetIndicators = getAllIndicators();
    
    response
      .pipe(csv())
      .on('data', (row) => {
        const indicatorCode = row['Series Code'];
        
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
        last_updated DATE,
        industry VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT unique_country_indicator UNIQUE (country_code, indicator_code)
      )
    `);
    
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

// Insert functions (keeping the same logic)
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

// Main processing function
async function processWorldBankData(urls) {
  const { mainDataUrl, countryMetadataUrl, seriesMetadataUrl, availabilityUrl } = urls;
  
  try {
    console.log('🚀 Starting World Bank data processing with direct download URLs...');
    
    await createEnhancedTables();
    
    // Process files
    const mainData = await processMainDataFile(mainDataUrl);
    const countries = countryMetadataUrl ? await processCountryMetadata(countryMetadataUrl) : [];
    const indicators = seriesMetadataUrl ? await processIndicatorMetadata(seriesMetadataUrl) : [];
    const availability = availabilityUrl ? await processCountrySeriesAvailability(availabilityUrl) : [];
    
    // Insert data
    console.log('💾 Starting database insertion...');
    await insertBatchData(mainData);
    await insertCountryMetadata(countries);
    await insertIndicatorMetadata(indicators);
    await insertCountryIndicatorAvailability(availability);
    await insertIndustryMappings();
    
    console.log('🎉 World Bank data processing complete!');
    console.log(`📊 Final stats:`);
    console.log(`   - Data points: ${mainData.length}`);
    console.log(`   - Countries: ${countries.length}`);
    console.log(`   - Indicator definitions: ${indicators.length}`);
    console.log(`   - Availability records: ${availability.length}`);
    
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
  const seriesMetadataUrl = args[args.indexOf('--series') + 1];
  const availabilityUrl = args[args.indexOf('--availability') + 1];
  
  if (!mainDataUrl) {
    console.error('❌ Please provide at least the main data URL');
    process.exit(1);
  }
  
  processWorldBankData({
    mainDataUrl,
    countryMetadataUrl,
    seriesMetadataUrl,
    availabilityUrl
  })
    .then(() => {
      console.log('✅ Processing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processWorldBankData };
