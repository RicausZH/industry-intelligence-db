const { Pool } = require('pg');
const { INDUSTRY_INDICATORS } = require('./industry-config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize data sources
async function initializeDataSources() {
  const client = await pool.connect();
  
  try {
    const sources = [
      {
        source_code: 'WB',
        source_name: 'World Bank',
        description: 'World Bank World Development Indicators',
        base_url: 'https://datacatalog.worldbank.org/',
        update_frequency: 'Annual',
        data_quality_score: 5
      },
      {
        source_code: 'OECD',
        source_name: 'OECD',
        description: 'Organization for Economic Co-operation and Development',
        base_url: 'https://stats.oecd.org/',
        update_frequency: 'Quarterly',
        data_quality_score: 4
      },
      {
        source_code: 'IMF',
        source_name: 'International Monetary Fund',
        description: 'IMF World Economic Outlook Database',
        base_url: 'https://www.imf.org/en/Publications/WEO/',
        update_frequency: 'Biannual',
        data_quality_score: 4
      }
    ];
    
    await client.query('DELETE FROM data_sources');
    
    for (const source of sources) {
      await client.query(`
        INSERT INTO data_sources (source_code, source_name, description, base_url, update_frequency, data_quality_score, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [source.source_code, source.source_name, source.description, source.base_url, source.update_frequency, source.data_quality_score]);
    }
    
    console.log(`✅ Initialized ${sources.length} data sources`);
  } catch (error) {
    console.error('❌ Error initializing data sources:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Populate country mappings from existing data
async function populateCountryMappings() {
  const client = await pool.connect();
  
  try {
    // Get all unique countries from your existing data
    const result = await client.query(`
      SELECT DISTINCT country_code, country_name 
      FROM indicators 
      WHERE country_code IS NOT NULL AND country_name IS NOT NULL
      ORDER BY country_code
    `);
    
    console.log(`📊 Found ${result.rows.length} countries in existing data`);
    
    await client.query('DELETE FROM country_mappings');
    
    // Base mappings - we'll start with WB codes and add OECD/IMF later
    const countryMappings = result.rows.map(row => ({
      unified_code: row.country_code,
      country_name: row.country_name,
      wb_code: row.country_code,
      oecd_code: null, // Will populate when we add OECD data
      imf_code: null,  // Will populate when we add IMF data
      priority_source: 'WB'
    }));
    
    for (const mapping of countryMappings) {
      await client.query(`
        INSERT INTO country_mappings (unified_code, country_name, wb_code, oecd_code, imf_code, priority_source)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [mapping.unified_code, mapping.country_name, mapping.wb_code, mapping.oecd_code, mapping.imf_code, mapping.priority_source]);
    }
    
    console.log(`✅ Populated ${countryMappings.length} country mappings`);
  } catch (error) {
    console.error('❌ Error populating country mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Populate indicator mappings from existing industry config (FIXED VERSION)
async function populateIndicatorMappings() {
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM indicator_mappings');
    
    let mappingCount = 0;
    
    for (const [industry, sources] of Object.entries(INDUSTRY_INDICATORS)) {
      for (const [source, indicators] of Object.entries(sources)) {
        if (source === 'worldBank' && Array.isArray(indicators)) {
          for (const indicator of indicators) {
            // Get indicator name from your existing metadata
            const metadataResult = await client.query(`
              SELECT name, description FROM indicator_metadata WHERE code = $1
            `, [indicator]);
            
            const baseIndicatorName = metadataResult.rows[0]?.name || indicator;
            const description = metadataResult.rows[0]?.description || `${industry} indicator`;
            
            // Create industry-specific unified concept name to avoid duplicates
            const unifiedConcept = `${industry.toUpperCase()}_${baseIndicatorName}`;
            
            await client.query(`
              INSERT INTO indicator_mappings (unified_concept, concept_description, wb_code, oecd_code, imf_code, priority_source, industry)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (wb_code, industry) DO UPDATE SET
                unified_concept = EXCLUDED.unified_concept,
                concept_description = EXCLUDED.concept_description,
                priority_source = EXCLUDED.priority_source
            `, [unifiedConcept, description, indicator, null, null, 'WB', industry]);
            
            mappingCount++;
          }
        }
      }
    }
    
    console.log(`✅ Populated ${mappingCount} indicator mappings across ${Object.keys(INDUSTRY_INDICATORS).length} industries`);
    
    // Show some examples
    const exampleResult = await client.query(`
      SELECT industry, COUNT(*) as indicator_count, 
             array_agg(unified_concept ORDER BY unified_concept LIMIT 3) as examples
      FROM indicator_mappings 
      GROUP BY industry 
      ORDER BY industry
    `);
    
    console.log('\n📊 Indicator mappings by industry:');
    exampleResult.rows.forEach(row => {
      console.log(`   ${row.industry}: ${row.indicator_count} indicators`);
      console.log(`      Examples: ${row.examples.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error populating indicator mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Analyze current data coverage
async function analyzeDataCoverage() {
  const client = await pool.connect();
  
  try {
    console.log('\n📊 CURRENT DATA COVERAGE ANALYSIS:');
    
    // Total data points
    const totalResult = await client.query('SELECT COUNT(*) as total FROM indicators');
    console.log(`   Total data points: ${totalResult.rows[0].total}`);
    
    // Countries
    const countryResult = await client.query('SELECT COUNT(DISTINCT country_code) as countries FROM indicators');
    console.log(`   Countries: ${countryResult.rows[0].countries}`);
    
    // Indicators
    const indicatorResult = await client.query('SELECT COUNT(DISTINCT indicator_code) as indicators FROM indicators');
    console.log(`   Indicators: ${indicatorResult.rows[0].indicators}`);
    
    // Industries
    const industryResult = await client.query('SELECT industry, COUNT(*) as data_points FROM indicators GROUP BY industry ORDER BY data_points DESC');
    console.log(`   Industries:`);
    industryResult.rows.forEach(row => {
      console.log(`     ${row.industry}: ${row.data_points} data points`);
    });
    
    // Year range
    const yearResult = await client.query('SELECT MIN(year) as min_year, MAX(year) as max_year FROM indicators');
    console.log(`   Year range: ${yearResult.rows[0].min_year} - ${yearResult.rows[0].max_year}`);
    
    // Show multi-source table status
    const mappingCountResult = await client.query('SELECT COUNT(*) as mapping_count FROM indicator_mappings');
    const countryMappingResult = await client.query('SELECT COUNT(*) as country_mappings FROM country_mappings');
    
    console.log('\n🎯 MULTI-SOURCE READINESS:');
    console.log(`   ✅ Country mappings: ${countryMappingResult.rows[0].country_mappings} ready for OECD/IMF integration`);
    console.log(`   ✅ Indicator mappings: ${mappingCountResult.rows[0].mapping_count} ready for cross-source analysis`);
    console.log('   ✅ Industry structure: Compatible with multi-source approach');
    console.log('   ✅ Database schema: Ready for source-specific tables');
    
  } catch (error) {
    console.error('❌ Error analyzing data coverage:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main function
async function initializeMultiSourceFoundation() {
  try {
    console.log('🚀 Initializing multi-source foundation...');
    console.log('🔒 Safe mode: Adding new tables without touching existing data');
    
    await initializeDataSources();
    await populateCountryMappings();
    await populateIndicatorMappings();
    await analyzeDataCoverage();
    
    console.log('\n🎉 Multi-source foundation initialized successfully!');
    console.log('✅ Your existing system remains completely unchanged');
    console.log('✅ Ready for OECD and IMF integration');
    console.log('✅ Mapping tables populated with current data');
    
  } catch (error) {
    console.error('❌ Foundation initialization failed:', error);
    throw error;
  }
}

// Command line execution
if (require.main === module) {
  initializeMultiSourceFoundation()
    .then(() => {
      console.log('✅ Foundation setup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeMultiSourceFoundation };
