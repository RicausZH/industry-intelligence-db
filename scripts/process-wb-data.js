const fs = require('fs');
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

async function processWorldBankData() {
  console.log('🚀 Starting World Bank data processing...');
  
  const targetIndicators = getAllIndicators();
  console.log(`📊 Processing ${targetIndicators.length} indicators across 6 industries`);
  
  const results = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('data/WDIData.csv')
      .pipe(csv())
      .on('data', (row) => {
        const indicatorCode = row['Indicator Code'];
        
        if (targetIndicators.includes(indicatorCode)) {
          const industry = getIndicatorIndustry(indicatorCode);
          
          for (let year = 1990; year <= 2024; year++) {
            const value = row[year.toString()];
            if (value && value !== '' && !isNaN(parseFloat(value))) {
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
            }
          }
        }
      })
      .on('end', async () => {
        console.log(`📊 Processed ${results.length} data points`);
        await insertBatchData(results);
        await insertIndustryMappings();
        resolve();
      })
      .on('error', reject);
  });
}

async function insertBatchData(data) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM indicators WHERE source = $1', ['WB']);
    console.log('🧹 Cleared existing World Bank data');
    
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const values = batch.map(item => 
        `('${item.country_code}', '${item.country_name.replace(/'/g, "''")}', '${item.indicator_code}', '${item.indicator_name.replace(/'/g, "''")}', ${item.year}, ${item.value}, '${item.industry}', '${item.source}')`
      ).join(',');
      
      const query = `
        INSERT INTO indicators (country_code, country_name, indicator_code, indicator_name, year, value, industry, source)
        VALUES ${values}
        ON CONFLICT (country_code, indicator_code, year, source) DO UPDATE SET
        value = EXCLUDED.value,
        country_name = EXCLUDED.country_name,
        indicator_name = EXCLUDED.indicator_name,
        industry = EXCLUDED.industry
      `;
      
      await client.query(query);
      console.log(`✅ Inserted batch ${Math.ceil(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)}`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 World Bank data processing complete!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function insertIndustryMappings() {
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM industry_indicators');
    
    for (const [industry, sources] of Object.entries(INDUSTRY_INDICATORS)) {
      for (const [source, indicators] of Object.entries(sources)) {
        if (Array.isArray(indicators)) {
          for (const indicator of indicators) {
            await client.query(`
              INSERT INTO industry_indicators (industry, indicator_code, source, priority)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT DO NOTHING
            `, [industry, indicator, source.toUpperCase(), 1]);
          }
        }
      }
    }
    
    console.log('✅ Industry mappings inserted');
  } catch (error) {
    console.error('❌ Error inserting industry mappings:', error);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  processWorldBankData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processWorldBankData };
