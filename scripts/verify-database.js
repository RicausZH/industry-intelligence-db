const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function verifyDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 VERIFYING INDUSTRY INTELLIGENCE DATABASE');
    console.log('==========================================');
    
    // 1. Check if all tables exist
    console.log('\n📋 1. CHECKING DATABASE SCHEMA...');
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    const tables = await client.query(tableQuery);
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    const expectedTables = ['indicators', 'countries', 'industry_indicators', 'indicator_metadata', 'country_indicator_availability'];
    const missingTables = expectedTables.filter(table => 
      !tables.rows.some(row => row.table_name === table)
    );
    
    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      return false;
    }
    
    // 2. Check data counts
    console.log('\n📊 2. CHECKING DATA COUNTS...');
    
    // Main indicators table
    const indicatorCount = await client.query('SELECT COUNT(*) FROM indicators');
    console.log(`✅ Indicators table: ${indicatorCount.rows[0].count} records`);
    
    // Countries table
    const countryCount = await client.query('SELECT COUNT(*) FROM countries');
    console.log(`✅ Countries table: ${countryCount.rows[0].count} records`);
    
    // Indicator metadata
    const metadataCount = await client.query('SELECT COUNT(*) FROM indicator_metadata');
    console.log(`✅ Indicator metadata: ${metadataCount.rows[0].count} records`);
    
    // Industry mappings
    const mappingCount = await client.query('SELECT COUNT(*) FROM industry_indicators');
    console.log(`✅ Industry mappings: ${mappingCount.rows[0].count} records`);
    
    // 3. Check industry distribution
    console.log('\n🏭 3. CHECKING INDUSTRY DISTRIBUTION...');
    const industryQuery = `
      SELECT industry, COUNT(*) as count
      FROM indicators 
      WHERE industry IS NOT NULL
      GROUP BY industry 
      ORDER BY industry;
    `;
    const industries = await client.query(industryQuery);
    console.log(`✅ Found ${industries.rows.length} industries:`);
    industries.rows.forEach(row => {
      console.log(`   - ${row.industry}: ${row.count} data points`);
    });
    
    // Check for expected industries
    const expectedIndustries = ['food', 'ict', 'infrastructure', 'biotech', 'medtech', 'mem', 'energy', 'climate'];
    const foundIndustries = industries.rows.map(row => row.industry);
    const missingIndustries = expectedIndustries.filter(industry => 
      !foundIndustries.includes(industry)
    );
    
    if (missingIndustries.length > 0) {
      console.log(`⚠️  Missing industries: ${missingIndustries.join(', ')}`);
    }
    
    // 4. Check year coverage
    console.log('\n📅 4. CHECKING YEAR COVERAGE...');
    const yearQuery = `
      SELECT MIN(year) as min_year, MAX(year) as max_year, COUNT(DISTINCT year) as year_count
      FROM indicators;
    `;
    const years = await client.query(yearQuery);
    const yearData = years.rows[0];
    console.log(`✅ Year range: ${yearData.min_year} - ${yearData.max_year} (${yearData.year_count} years)`);
    
    // 5. Check country coverage
    console.log('\n🌍 5. CHECKING COUNTRY COVERAGE...');
    const countryDataQuery = `
      SELECT COUNT(DISTINCT country_code) as countries_with_data
      FROM indicators;
    `;
    const countryData = await client.query(countryDataQuery);
    console.log(`✅ Countries with data: ${countryData.rows[0].countries_with_data}`);
    
    // 6. Check data completeness
    console.log('\n📈 6. CHECKING DATA COMPLETENESS...');
    const completenessQuery = `
      SELECT 
        industry,
        COUNT(DISTINCT indicator_code) as unique_indicators,
        COUNT(DISTINCT country_code) as countries_covered,
        COUNT(*) as total_data_points
      FROM indicators 
      WHERE industry IS NOT NULL
      GROUP BY industry 
      ORDER BY industry;
    `;
    const completeness = await client.query(completenessQuery);
    console.log('Industry completeness:');
    completeness.rows.forEach(row => {
      console.log(`   ${row.industry}: ${row.unique_indicators} indicators, ${row.countries_covered} countries, ${row.total_data_points} data points`);
    });
    
    // 7. Check for data quality issues
    console.log('\n🔍 7. CHECKING DATA QUALITY...');
    
    // Check for null values in critical fields
    const nullCheckQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE country_code IS NULL) as null_country_codes,
        COUNT(*) FILTER (WHERE indicator_code IS NULL) as null_indicator_codes,
        COUNT(*) FILTER (WHERE year IS NULL) as null_years,
        COUNT(*) FILTER (WHERE value IS NULL) as null_values,
        COUNT(*) FILTER (WHERE industry IS NULL) as null_industries
      FROM indicators;
    `;
    const nullCheck = await client.query(nullCheckQuery);
    const nullData = nullCheck.rows[0];
    
    if (parseInt(nullData.null_country_codes) > 0) console.log(`⚠️  Found ${nullData.null_country_codes} records with null country codes`);
    if (parseInt(nullData.null_indicator_codes) > 0) console.log(`⚠️  Found ${nullData.null_indicator_codes} records with null indicator codes`);
    if (parseInt(nullData.null_years) > 0) console.log(`⚠️  Found ${nullData.null_years} records with null years`);
    if (parseInt(nullData.null_values) > 0) console.log(`⚠️  Found ${nullData.null_values} records with null values`);
    if (parseInt(nullData.null_industries) > 0) console.log(`⚠️  Found ${nullData.null_industries} records with null industries`);
    
    if (Object.values(nullData).every(val => parseInt(val) === 0)) {
      console.log('✅ No critical null values found');
    }
    
    // 8. Sample data verification
    console.log('\n🔬 8. SAMPLE DATA VERIFICATION...');
    const sampleQuery = `
      SELECT country_code, indicator_code, industry, year, value
      FROM indicators 
      WHERE industry IN ('energy', 'climate')
      ORDER BY RANDOM()
      LIMIT 5;
    `;
    const samples = await client.query(sampleQuery);
    console.log('Sample records from new industries:');
    samples.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.country_code} | ${row.indicator_code} | ${row.industry} | ${row.year} | ${row.value}`);
    });
    
    // 9. Index verification
    console.log('\n🗂️  9. CHECKING INDEXES...');
    const indexQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;
    const indexes = await client.query(indexQuery);
    console.log(`✅ Found ${indexes.rows.length} custom indexes:`);
    indexes.rows.forEach(row => {
      console.log(`   - ${row.indexname} on ${row.tablename}`);
    });
    
    // 10. Final summary
    console.log('\n🎯 VERIFICATION SUMMARY');
    console.log('======================');
    console.log(`✅ Database Schema: ${expectedTables.length}/${expectedTables.length} tables present`);
    console.log(`✅ Industries: ${industries.rows.length}/8 expected industries`);
    console.log(`✅ Total Data Points: ${indicatorCount.rows[0].count}`);
    console.log(`✅ Countries: ${countryCount.rows[0].count}`);
    console.log(`✅ Indicators: ${metadataCount.rows[0].count}`);
    console.log(`✅ Year Coverage: ${yearData.min_year}-${yearData.max_year}`);
    
    const isHealthy = missingTables.length === 0 && 
                     missingIndustries.length === 0 && 
                     parseInt(indicatorCount.rows[0].count) > 200000;
    
    if (isHealthy) {
      console.log('\n🎉 DATABASE VERIFICATION PASSED! Your database is correctly set up.');
      return true;
    } else {
      console.log('\n❌ DATABASE VERIFICATION FAILED! Some issues were found.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    return false;
  } finally {
    client.release();
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyDatabase()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyDatabase };
