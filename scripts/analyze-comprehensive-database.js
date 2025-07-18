const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function analyzeComprehensiveDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 COMPREHENSIVE MULTI-SOURCE DATABASE ANALYSIS');
    console.log('===============================================');
    console.log(`📅 Analysis Date: ${new Date().toISOString()}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // 1. COMPLETE SCHEMA ANALYSIS
    console.log('\n📋 1. COMPLETE DATABASE SCHEMA ANALYSIS');
    console.log('========================================');
    
    const schemaQuery = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `;
    const schema = await client.query(schemaQuery);
    
    // Group by table
    const tableStructure = {};
    schema.rows.forEach(row => {
      if (!tableStructure[row.table_name]) {
        tableStructure[row.table_name] = [];
      }
      tableStructure[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
        length: row.character_maximum_length
      });
    });
    
    console.log(`✅ Found ${Object.keys(tableStructure).length} tables:`);
    Object.entries(tableStructure).forEach(([tableName, columns]) => {
      console.log(`\n📊 Table: ${tableName} (${columns.length} columns)`);
      columns.forEach(col => {
        const length = col.length ? `(${col.length})` : '';
        const nullable = col.nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`   - ${col.column}: ${col.type}${length} ${nullable}`);
      });
    });
    
    // 2. MULTI-SOURCE FOUNDATION STATUS
    console.log('\n🏗️ 2. MULTI-SOURCE FOUNDATION STATUS');
    console.log('=====================================');
    
    const multiSourceTables = [
      'oecd_indicators', 'imf_indicators', 'country_mappings', 
      'indicator_mappings', 'data_sources'
    ];
    
    const foundTables = Object.keys(tableStructure);
    const multiSourceStatus = multiSourceTables.map(table => ({
      table,
      exists: foundTables.includes(table)
    }));
    
    console.log('Multi-source table status:');
    multiSourceStatus.forEach(({ table, exists }) => {
      console.log(`   ${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    // 3. WORLD BANK DATA ANALYSIS
    console.log('\n🌍 3. WORLD BANK DATA ANALYSIS');
    console.log('===============================');
    
    if (foundTables.includes('indicators')) {
      const wbAnalysis = await client.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT country_code) as unique_countries,
          COUNT(DISTINCT indicator_code) as unique_indicators,
          COUNT(DISTINCT industry) as unique_industries,
          MIN(year) as min_year,
          MAX(year) as max_year,
          COUNT(DISTINCT year) as year_count,
          COUNT(*) FILTER (WHERE source = 'WB') as wb_records,
          COUNT(*) FILTER (WHERE source IS NULL) as null_source_records
        FROM indicators
      `);
      
      const wbData = wbAnalysis.rows[0];
      console.log(`✅ World Bank Data Summary:`);
      console.log(`   - Total Records: ${wbData.total_records}`);
      console.log(`   - Countries: ${wbData.unique_countries}`);
      console.log(`   - Indicators: ${wbData.unique_indicators}`);
      console.log(`   - Industries: ${wbData.unique_industries}`);
      console.log(`   - Year Range: ${wbData.min_year}-${wbData.max_year} (${wbData.year_count} years)`);
      console.log(`   - WB Source Tagged: ${wbData.wb_records}`);
      console.log(`   - Missing Source Tag: ${wbData.null_source_records}`);
    }
    
    // 4. INDUSTRY BREAKDOWN ANALYSIS
    console.log('\n🏭 4. DETAILED INDUSTRY BREAKDOWN');
    console.log('==================================');
    
    if (foundTables.includes('indicators')) {
      const industryAnalysis = await client.query(`
        SELECT 
          industry,
          COUNT(*) as total_records,
          COUNT(DISTINCT country_code) as countries,
          COUNT(DISTINCT indicator_code) as indicators,
          COUNT(DISTINCT year) as years,
          MIN(year) as earliest_year,
          MAX(year) as latest_year,
          AVG(value) as avg_value,
          COUNT(*) FILTER (WHERE value IS NOT NULL) as non_null_values
        FROM indicators 
        WHERE industry IS NOT NULL
        GROUP BY industry 
        ORDER BY total_records DESC
      `);
      
      console.log(`✅ Industry Distribution (${industryAnalysis.rows.length} industries):`);
      industryAnalysis.rows.forEach(row => {
        const completeness = ((row.non_null_values / row.total_records) * 100).toFixed(1);
        console.log(`\n   🏭 ${row.industry.toUpperCase()}:`);
        console.log(`      - Records: ${row.total_records}`);
        console.log(`      - Countries: ${row.countries}`);
        console.log(`      - Indicators: ${row.indicators}`);
        console.log(`      - Years: ${row.years} (${row.earliest_year}-${row.latest_year})`);
        console.log(`      - Data Completeness: ${completeness}%`);
      });
    }
    
    // 5. COUNTRY MAPPINGS ANALYSIS
    console.log('\n🗺️ 5. COUNTRY MAPPINGS ANALYSIS');
    console.log('================================');
    
    if (foundTables.includes('country_mappings')) {
      const countryMappings = await client.query(`
        SELECT 
          COUNT(*) as total_mappings,
          COUNT(wb_code) as wb_codes,
          COUNT(oecd_code) as oecd_codes,
          COUNT(imf_code) as imf_codes,
          COUNT(*) FILTER (WHERE wb_code IS NOT NULL AND oecd_code IS NOT NULL) as wb_oecd_matches,
          COUNT(*) FILTER (WHERE wb_code IS NOT NULL AND imf_code IS NOT NULL) as wb_imf_matches
        FROM country_mappings
      `);
      
      const mappingData = countryMappings.rows[0];
      console.log(`✅ Country Mappings Status:`);
      console.log(`   - Total Mappings: ${mappingData.total_mappings}`);
      console.log(`   - WB Codes: ${mappingData.wb_codes}`);
      console.log(`   - OECD Codes: ${mappingData.oecd_codes}`);
      console.log(`   - IMF Codes: ${mappingData.imf_codes}`);
      console.log(`   - WB-OECD Matches: ${mappingData.wb_oecd_matches}`);
      console.log(`   - WB-IMF Matches: ${mappingData.wb_imf_matches}`);
      
      // Sample mappings
      const sampleMappings = await client.query(`
        SELECT unified_code, country_name, wb_code, oecd_code, imf_code
        FROM country_mappings 
        WHERE wb_code IS NOT NULL 
        ORDER BY country_name 
        LIMIT 10
      `);
      
      console.log(`\n📊 Sample Country Mappings:`);
      sampleMappings.rows.forEach(row => {
        console.log(`   ${row.unified_code}: ${row.country_name} | WB:${row.wb_code} | OECD:${row.oecd_code || 'NULL'} | IMF:${row.imf_code || 'NULL'}`);
      });
    } else {
      console.log('❌ Country mappings table not found');
    }
    
    // 6. INDICATOR MAPPINGS ANALYSIS
    console.log('\n📋 6. INDICATOR MAPPINGS ANALYSIS');
    console.log('==================================');
    
    if (foundTables.includes('indicator_mappings')) {
      const indicatorMappings = await client.query(`
        SELECT 
          COUNT(*) as total_mappings,
          COUNT(wb_code) as wb_codes,
          COUNT(oecd_code) as oecd_codes,
          COUNT(imf_code) as imf_codes,
          COUNT(DISTINCT industry) as industries,
          priority_source,
          COUNT(*) as count_by_priority
        FROM indicator_mappings
        GROUP BY priority_source
        ORDER BY count_by_priority DESC
      `);
      
      console.log(`✅ Indicator Mappings Status:`);
      indicatorMappings.rows.forEach(row => {
        console.log(`   - ${row.priority_source}: ${row.count_by_priority} indicators`);
      });
      
      // Industry breakdown
      const industryMappings = await client.query(`
        SELECT 
          industry,
          COUNT(*) as total_indicators,
          COUNT(wb_code) as wb_indicators,
          COUNT(oecd_code) as oecd_indicators,
          COUNT(imf_code) as imf_indicators
        FROM indicator_mappings
        WHERE industry IS NOT NULL
        GROUP BY industry
        ORDER BY total_indicators DESC
      `);
      
      console.log(`\n📊 Indicator Mappings by Industry:`);
      industryMappings.rows.forEach(row => {
        console.log(`   ${row.industry}: ${row.total_indicators} total | WB:${row.wb_indicators} | OECD:${row.oecd_indicators} | IMF:${row.imf_indicators}`);
      });
    } else {
      console.log('❌ Indicator mappings table not found');
    }
    
    // 7. DATA SOURCES ANALYSIS
    console.log('\n🔗 7. DATA SOURCES ANALYSIS');
    console.log('============================');
    
    if (foundTables.includes('data_sources')) {
      const dataSources = await client.query(`
        SELECT 
          source_code,
          source_name,
          description,
          update_frequency,
          data_quality_score,
          last_updated
        FROM data_sources
        ORDER BY data_quality_score DESC
      `);
      
      console.log(`✅ Configured Data Sources (${dataSources.rows.length}):`);
      dataSources.rows.forEach(row => {
        console.log(`   ${row.source_code}: ${row.source_name}`);
        console.log(`      - Quality Score: ${row.data_quality_score}/5`);
        console.log(`      - Update Frequency: ${row.update_frequency}`);
        console.log(`      - Last Updated: ${row.last_updated || 'Never'}`);
      });
    } else {
      console.log('❌ Data sources table not found');
    }
    
    // 8. OECD READINESS ASSESSMENT
    console.log('\n🎯 8. OECD INTEGRATION READINESS');
    console.log('==================================');
    
    const oecdReadiness = {
      schema: foundTables.includes('oecd_indicators'),
      countryMappings: foundTables.includes('country_mappings'),
      indicatorMappings: foundTables.includes('indicator_mappings'),
      dataSources: foundTables.includes('data_sources'),
      worldBankData: foundTables.includes('indicators')
    };
    
    const readinessScore = Object.values(oecdReadiness).filter(Boolean).length;
    const totalChecks = Object.keys(oecdReadiness).length;
    
    console.log(`✅ OECD Integration Readiness: ${readinessScore}/${totalChecks} (${((readinessScore/totalChecks)*100).toFixed(1)}%)`);
    
    Object.entries(oecdReadiness).forEach(([check, status]) => {
      console.log(`   ${status ? '✅' : '❌'} ${check}: ${status ? 'READY' : 'MISSING'}`);
    });
    
    // 9. PERFORMANCE METRICS
    console.log('\n⚡ 9. DATABASE PERFORMANCE METRICS');
    console.log('===================================');
    
    const performanceQuery = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;
    
    const performance = await client.query(performanceQuery);
    console.log(`✅ Table Performance Stats:`);
    performance.rows.forEach(row => {
      console.log(`   ${row.tablename}: ${row.live_rows} live rows, ${row.dead_rows} dead rows`);
    });
    
    // 10. INDEX ANALYSIS
    console.log('\n🗂️ 10. INDEX ANALYSIS');
    console.log('=====================');
    
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `;
    
    const indexes = await client.query(indexQuery);
    console.log(`✅ Index Usage Stats (${indexes.rows.length} indexes):`);
    indexes.rows.forEach(row => {
      console.log(`   ${row.indexname}: ${row.idx_scan} scans, ${row.idx_tup_read} tuples read`);
    });
    
    // 11. FINAL RECOMMENDATIONS
    console.log('\n🎯 11. INTEGRATION RECOMMENDATIONS');
    console.log('===================================');
    
    if (readinessScore === totalChecks) {
      console.log('✅ READY FOR OECD INTEGRATION!');
      console.log('   - All multi-source tables are in place');
      console.log('   - Country and indicator mappings are ready');
      console.log('   - World Bank data is properly structured');
      console.log('   - Can proceed with OECD MSTI integration');
    } else {
      console.log('⚠️  PARTIAL READINESS - Some setup required:');
      if (!oecdReadiness.schema) console.log('   - Run migration: npm run migrate-multi-source');
      if (!oecdReadiness.countryMappings) console.log('   - Populate country mappings: npm run setup-multi-source');
      if (!oecdReadiness.indicatorMappings) console.log('   - Populate indicator mappings: npm run setup-multi-source');
    }
    
    // 12. SUMMARY REPORT
    console.log('\n📊 FINAL SUMMARY REPORT');
    console.log('========================');
    
    const summary = {
      totalTables: Object.keys(tableStructure).length,
      multiSourceReady: readinessScore === totalChecks,
      worldBankRecords: foundTables.includes('indicators') ? 
        (await client.query('SELECT COUNT(*) FROM indicators')).rows[0].count : 0,
      industries: foundTables.includes('indicators') ? 
        (await client.query('SELECT COUNT(DISTINCT industry) FROM indicators WHERE industry IS NOT NULL')).rows[0].count : 0,
      countries: foundTables.includes('indicators') ? 
        (await client.query('SELECT COUNT(DISTINCT country_code) FROM indicators')).rows[0].count : 0,
      readinessPercentage: ((readinessScore/totalChecks)*100).toFixed(1)
    };
    
    console.log(`🎉 DATABASE ANALYSIS COMPLETE!`);
    console.log(`   - Database Tables: ${summary.totalTables}`);
    console.log(`   - World Bank Records: ${summary.worldBankRecords}`);
    console.log(`   - Industries: ${summary.industries}`);
    console.log(`   - Countries: ${summary.countries}`);
    console.log(`   - Multi-Source Ready: ${summary.multiSourceReady ? 'YES' : 'NO'} (${summary.readinessPercentage}%)`);
    
    return {
      success: true,
      summary,
      readiness: oecdReadiness,
      tableStructure,
      recommendations: readinessScore === totalChecks ? 
        ['Ready for OECD integration'] : 
        ['Complete multi-source setup', 'Populate mapping tables']
    };
    
  } catch (error) {
    console.error('❌ Database analysis failed:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Run analysis if called directly
if (require.main === module) {
  analyzeComprehensiveDatabase()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Analysis completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Analysis failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Analysis script failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeComprehensiveDatabase };
