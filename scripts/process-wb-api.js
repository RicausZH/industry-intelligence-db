//just another push

const https = require('https');
const { Pool } = require('pg');
const { INDUSTRY_INDICATORS } = require('./industry-config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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

// Fetch data from World Bank API
async function fetchFromWorldBankAPI(indicator, page = 1) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=1000&page=${page}&date=1990:2024`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', chunk => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.length > 1) {
            resolve(json[1] || []); // API returns [metadata, data]
          } else {
            resolve([]);
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Process all indicators using World Bank API
async function processWorldBankAPI() {
  console.log('🚀 Starting World Bank API data processing...');
  
  const targetIndicators = getAllIndicators();
  console.log(`📊 Target indicators: ${targetIndicators.length} across 6 industries`);
  
  const allData = [];
  let processedIndicators = 0;
  
  for (const indicator of targetIndicators) {
    console.log(`📈 Processing indicator ${processedIndicators + 1}/${targetIndicators.length}: ${indicator}`);
    
    try {
      let page = 1;
      let hasMoreData = true;
      
      while (hasMoreData) {
        const data = await fetchFromWorldBankAPI(indicator, page);
        
        if (data.length === 0) {
          hasMoreData = false;
        } else {
          const industry = getIndicatorIndustry(indicator);
          
          for (const item of data) {
            if (item.value && item.value !== null && item.date) {
              const year = parseInt(item.date);
              const value = parseFloat(item.value);
              
              if (year >= 1990 && year <= 2024 && !isNaN(value)) {
                allData.push({
                  country_code: item.country?.id || 'UNK',
                  country_name: item.country?.value || 'Unknown',
                  indicator_code: indicator,
                  indicator_name: item.indicator?.value || indicator,
                  year: year,
                  value: value,
                  industry: industry,
                  source: 'WB'
                });
              }
            }
          }
          
          // World Bank API has pagination
          if (data.length < 1000) {
            hasMoreData = false;
          } else {
            page++;
          }
        }
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      processedIndicators++;
      console.log(`✅ Completed ${indicator} (${processedIndicators}/${targetIndicators.length})`);
      
    } catch (error) {
      console.error(`❌ Error processing ${indicator}:`, error.message);
      processedIndicators++;
      continue;
    }
  }
  
  console.log(`📊 API processing complete: ${allData.length} data points collected`);
  return allData;
}

// Create database tables
async function createTables() {
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
    
    console.log('✅ Database tables created');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Insert data in batches
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

// Main processing function
async function processWorldBankData() {
  try {
    console.log('🚀 Starting World Bank API data processing...');
    console.log('🌐 Using official World Bank API (more reliable than CSV)');
    
    await createTables();
    
    const data = await processWorldBankAPI();
    
    console.log('💾 Starting database insertion...');
    await insertBatchData(data);
    await insertIndustryMappings();
    
    // Generate final statistics
    const client = await pool.connect();
    try {
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_indicators,
          COUNT(DISTINCT country_code) as total_countries,
          COUNT(DISTINCT indicator_code) as unique_indicators,
          COUNT(DISTINCT industry) as industries_covered,
          MIN(year) as earliest_year,
          MAX(year) as latest_year
        FROM indicators
      `);
      
      const industryStats = await client.query(`
        SELECT industry, COUNT(*) as data_points
        FROM indicators 
        WHERE industry IS NOT NULL
        GROUP BY industry
        ORDER BY data_points DESC
      `);
      
      console.log('🎉 World Bank API processing complete!');
      console.log(`📊 Final statistics:`);
      console.log(`   - Total data points: ${stats.rows[0].total_indicators}`);
      console.log(`   - Countries: ${stats.rows[0].total_countries}`);
      console.log(`   - Unique indicators: ${stats.rows[0].unique_indicators}`);
      console.log(`   - Industries covered: ${stats.rows[0].industries_covered}`);
      console.log(`   - Time range: ${stats.rows[0].earliest_year} - ${stats.rows[0].latest_year}`);
      
      console.log(`📈 Industry breakdown:`);
      industryStats.rows.forEach(row => {
        console.log(`   - ${row.industry}: ${row.data_points} data points`);
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw error;
  }
}

// Command line usage
if (require.main === module) {
  processWorldBankData()
    .then(() => {
      console.log('✅ World Bank API processing complete! Your database is ready.');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processWorldBankData };
