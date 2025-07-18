const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Validation configuration
const VALIDATION_CONFIG = {
  // Data quality thresholds
  MIN_COMPLETENESS_SCORE: 0.7,      // 70% completeness required
  MAX_VARIANCE_THRESHOLD: 0.15,     // 15% variance between sources
  MIN_COVERAGE_THRESHOLD: 0.8,      // 80% country coverage required
  MAX_OUTLIER_Z_SCORE: 3.0,         // Z-score threshold for outliers
  
  // Expected data ranges
  GDP_GROWTH_RANGE: [-50, 50],      // GDP growth % range
  INFLATION_RANGE: [-20, 100],      // Inflation % range
  POPULATION_MIN: 1000,             // Minimum population
  TRADE_VOLUME_RANGE: [-100, 500], // Trade volume % change range
  
  // Time ranges
  MIN_YEAR: 1980,
  MAX_YEAR: 2030,
  
  // Industry validation
  REQUIRED_INDUSTRIES: [
    'innovation', 'context', 'trade', 'finance', 'biotech',
    'medtech', 'mem', 'ict', 'energy', 'climate', 'infrastructure', 'food'
  ],
  
  // Data sources
  REQUIRED_SOURCES: ['WB', 'OECD', 'IMF'],
  
  // Critical indicators for cross-validation
  CROSS_VALIDATION_INDICATORS: {
    'GDP_GROWTH': ['NGDP_RPCH', 'GDP_GROWTH'],
    'INFLATION': ['PCPIPCH', 'INFLATION_RATE'],
    'POPULATION': ['LP', 'POPULATION'],
    'TRADE_VOLUME': ['TM_RPCH', 'TX_RPCH']
  }
};

// Validation results storage
let validationResults = {
  startTime: null,
  endTime: null,
  totalRecords: 0,
  validRecords: 0,
  invalidRecords: 0,
  warnings: [],
  errors: [],
  qualityScore: 0,
  coverageAnalysis: {},
  crossValidationResults: {},
  anomalies: [],
  performanceMetrics: {}
};

// Logging functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // Store in validation results
  if (level === 'ERROR') {
    validationResults.errors.push({ timestamp, message });
  } else if (level === 'WARN') {
    validationResults.warnings.push({ timestamp, message });
  }
}

function logProgress(current, total, operation) {
  const percent = ((current / total) * 100).toFixed(1);
  const message = `${operation}: ${current}/${total} (${percent}%)`;
  if (current % 10000 === 0 || current === total) {
    log(message);
  }
}

// Data validation functions
function validateValue(value, range, dataType = 'numeric') {
  if (value === null || value === undefined || value === '') {
    return { valid: false, reason: 'null_or_empty' };
  }
  
  if (dataType === 'numeric') {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || !isFinite(numValue)) {
      return { valid: false, reason: 'not_numeric' };
    }
    
    if (range && (numValue < range[0] || numValue > range[1])) {
      return { valid: false, reason: 'out_of_range', value: numValue, range };
    }
    
    return { valid: true, value: numValue };
  }
  
  if (dataType === 'year') {
    const year = parseInt(value);
    if (isNaN(year) || year < VALIDATION_CONFIG.MIN_YEAR || year > VALIDATION_CONFIG.MAX_YEAR) {
      return { valid: false, reason: 'invalid_year', value: year };
    }
    return { valid: true, value: year };
  }
  
  return { valid: true, value };
}

function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return Math.abs((value - mean) / stdDev);
}

// Database validation functions
async function validateRecordCounts() {
  const client = await pool.connect();
  try {
    log('🔍 Validating record counts...');
    
    // Get record counts by source
    const sources = await client.query(`
      SELECT 
        'WB' as source,
        COUNT(*) as count
      FROM indicators
      WHERE source = 'WB' OR source IS NULL
      
      UNION ALL
      
      SELECT 
        'OECD' as source,
        COUNT(*) as count
      FROM oecd_indicators
      WHERE source = 'OECD'
      
      UNION ALL
      
      SELECT 
        'IMF' as source,
        COUNT(*) as count
      FROM imf_indicators
      WHERE source = 'IMF'
    `);
    
    const recordCounts = {};
    sources.rows.forEach(row => {
      recordCounts[row.source] = parseInt(row.count);
    });
    
    // Validate expected counts
    const expectedCounts = {
      'WB': 515565,
      'OECD': 138086,
      'IMF': 126874
    };
    
    let totalRecords = 0;
    for (const [source, count] of Object.entries(recordCounts)) {
      totalRecords += count;
      const expected = expectedCounts[source];
      const variance = Math.abs(count - expected) / expected;
      
      if (variance > 0.05) { // 5% variance threshold
        log(`⚠️  ${source} record count variance: ${count} vs expected ${expected} (${(variance * 100).toFixed(1)}%)`, 'WARN');
      } else {
        log(`✅ ${source} record count: ${count} (within expected range)`);
      }
    }
    
    validationResults.totalRecords = totalRecords;
    validationResults.coverageAnalysis.recordCounts = recordCounts;
    
    return recordCounts;
  } finally {
    client.release();
  }
}

async function validateDataTypes() {
  const client = await pool.connect();
  try {
    log('🔍 Validating data types and ranges...');
    
    let invalidCount = 0;
    const batchSize = 50000;
    
    // Validate World Bank data
    const wbCount = await client.query('SELECT COUNT(*) FROM indicators');
    const totalWB = parseInt(wbCount.rows[0].count);
    
    for (let offset = 0; offset < totalWB; offset += batchSize) {
      const batch = await client.query(`
        SELECT id, country_code, indicator_code, year, value, industry
        FROM indicators
        ORDER BY id
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);
      
      for (const row of batch.rows) {
        // Validate year
        const yearValidation = validateValue(row.year, [VALIDATION_CONFIG.MIN_YEAR, VALIDATION_CONFIG.MAX_YEAR], 'year');
        if (!yearValidation.valid) {
          invalidCount++;
          log(`Invalid year in WB data: ${row.year} for ${row.country_code}/${row.indicator_code}`, 'ERROR');
        }
        
        // Validate value based on indicator type
        let range = null;
        if (row.indicator_code.includes('GDP') || row.indicator_code.includes('RPCH')) {
          range = VALIDATION_CONFIG.GDP_GROWTH_RANGE;
        } else if (row.indicator_code.includes('PCPI') || row.indicator_code.includes('INFLATION')) {
          range = VALIDATION_CONFIG.INFLATION_RANGE;
        }
        
        const valueValidation = validateValue(row.value, range);
        if (!valueValidation.valid && row.value !== null) {
          invalidCount++;
          if (valueValidation.reason === 'out_of_range') {
            validationResults.anomalies.push({
              source: 'WB',
              country: row.country_code,
              indicator: row.indicator_code,
              year: row.year,
              value: row.value,
              issue: 'out_of_range',
              range: range
            });
          }
        }
      }
      
      logProgress(offset + batch.rows.length, totalWB, 'WB Data Validation');
    }
    
    // Validate OECD data
    const oecdCount = await client.query('SELECT COUNT(*) FROM oecd_indicators');
    const totalOECD = parseInt(oecdCount.rows[0].count);
    
    for (let offset = 0; offset < totalOECD; offset += batchSize) {
      const batch = await client.query(`
        SELECT id, country_code, indicator_code, time_period, obs_value, industry
        FROM oecd_indicators
        ORDER BY id
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);
      
      for (const row of batch.rows) {
        // Validate time period (year)
        const yearValidation = validateValue(row.time_period, [VALIDATION_CONFIG.MIN_YEAR, VALIDATION_CONFIG.MAX_YEAR], 'year');
        if (!yearValidation.valid) {
          invalidCount++;
          log(`Invalid time period in OECD data: ${row.time_period} for ${row.country_code}/${row.indicator_code}`, 'ERROR');
        }
        
        // Validate observation value
        const valueValidation = validateValue(row.obs_value, null);
        if (!valueValidation.valid && row.obs_value !== null) {
          invalidCount++;
        }
      }
      
      logProgress(offset + batch.rows.length, totalOECD, 'OECD Data Validation');
    }
    
    // Validate IMF data
    const imfCount = await client.query('SELECT COUNT(*) FROM imf_indicators');
    const totalIMF = parseInt(imfCount.rows[0].count);
    
    for (let offset = 0; offset < totalIMF; offset += batchSize) {
      const batch = await client.query(`
        SELECT id, weo_country_code, subject_code, year, value
        FROM imf_indicators
        ORDER BY id
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);
      
      for (const row of batch.rows) {
        // Validate year
        const yearValidation = validateValue(row.year, [VALIDATION_CONFIG.MIN_YEAR, VALIDATION_CONFIG.MAX_YEAR], 'year');
        if (!yearValidation.valid) {
          invalidCount++;
          log(`Invalid year in IMF data: ${row.year} for ${row.weo_country_code}/${row.subject_code}`, 'ERROR');
        }
        
        // Validate value based on subject code
        let range = null;
        if (row.subject_code === 'NGDP_RPCH') {
          range = VALIDATION_CONFIG.GDP_GROWTH_RANGE;
        } else if (row.subject_code === 'PCPIPCH') {
          range = VALIDATION_CONFIG.INFLATION_RANGE;
        }
        
        const valueValidation = validateValue(row.value, range);
        if (!valueValidation.valid && row.value !== null) {
          invalidCount++;
          if (valueValidation.reason === 'out_of_range') {
            validationResults.anomalies.push({
              source: 'IMF',
              country: row.weo_country_code,
              indicator: row.subject_code,
              year: row.year,
              value: row.value,
              issue: 'out_of_range',
              range: range
            });
          }
        }
      }
      
      logProgress(offset + batch.rows.length, totalIMF, 'IMF Data Validation');
    }
    
    validationResults.invalidRecords = invalidCount;
    validationResults.validRecords = validationResults.totalRecords - invalidCount;
    
    log(`✅ Data type validation complete: ${invalidCount} invalid records found`);
    return invalidCount;
    
  } finally {
    client.release();
  }
}

async function validateCrossSourceConsistency() {
  const client = await pool.connect();
  try {
    log('🔍 Validating cross-source consistency...');
    
    const inconsistencies = [];
    
    // Check GDP growth consistency between WB and IMF
    const gdpComparison = await client.query(`
      SELECT 
        wb.country_code,
        wb.year,
        wb.value as wb_gdp_growth,
        imf.value as imf_gdp_growth,
        ABS(wb.value - imf.value) as variance
      FROM indicators wb
      JOIN imf_indicators imf ON wb.country_code = imf.weo_country_code
        AND wb.year = imf.year
      WHERE wb.indicator_code LIKE '%GDP%RPCH%'
        AND imf.subject_code = 'NGDP_RPCH'
        AND wb.value IS NOT NULL
        AND imf.value IS NOT NULL
        AND ABS(wb.value - imf.value) > 2.0
      LIMIT 1000
    `);
    
    gdpComparison.rows.forEach(row => {
      const variancePercent = (row.variance / Math.abs(row.wb_gdp_growth)) * 100;
      if (variancePercent > 15) { // 15% variance threshold
        inconsistencies.push({
          type: 'GDP_GROWTH_VARIANCE',
          country: row.country_code,
          year: row.year,
          wb_value: row.wb_gdp_growth,
          imf_value: row.imf_gdp_growth,
          variance: row.variance,
          variance_percent: variancePercent
        });
      }
    });
    
    // Check inflation consistency between WB and IMF
    const inflationComparison = await client.query(`
      SELECT 
        wb.country_code,
        wb.year,
        wb.value as wb_inflation,
        imf.value as imf_inflation,
        ABS(wb.value - imf.value) as variance
      FROM indicators wb
      JOIN imf_indicators imf ON wb.country_code = imf.weo_country_code
        AND wb.year = imf.year
      WHERE wb.indicator_code LIKE '%PCPI%'
        AND imf.subject_code = 'PCPIPCH'
        AND wb.value IS NOT NULL
        AND imf.value IS NOT NULL
        AND ABS(wb.value - imf.value) > 3.0
      LIMIT 1000
    `);
    
    inflationComparison.rows.forEach(row => {
      const variancePercent = (row.variance / Math.abs(row.wb_inflation)) * 100;
      if (variancePercent > 20) { // 20% variance threshold for inflation
        inconsistencies.push({
          type: 'INFLATION_VARIANCE',
          country: row.country_code,
          year: row.year,
          wb_value: row.wb_inflation,
          imf_value: row.imf_inflation,
          variance: row.variance,
          variance_percent: variancePercent
        });
      }
    });
    
    validationResults.crossValidationResults = {
      gdp_inconsistencies: inconsistencies.filter(i => i.type === 'GDP_GROWTH_VARIANCE').length,
      inflation_inconsistencies: inconsistencies.filter(i => i.type === 'INFLATION_VARIANCE').length,
      total_inconsistencies: inconsistencies.length
    };
    
    log(`✅ Cross-source validation complete: ${inconsistencies.length} inconsistencies found`);
    return inconsistencies;
    
  } finally {
    client.release();
  }
}

async function validateCoverage() {
  const client = await pool.connect();
  try {
    log('🔍 Validating data coverage...');
    
    // Country coverage analysis
    const countryCoverage = await client.query(`
      SELECT 
        unified_code,
        country_name,
        wb_code,
        oecd_code,
        imf_code,
        CASE 
          WHEN wb_code IS NOT NULL THEN 1 ELSE 0 
        END + 
        CASE 
          WHEN oecd_code IS NOT NULL THEN 1 ELSE 0 
        END + 
        CASE 
          WHEN imf_code IS NOT NULL THEN 1 ELSE 0 
        END as source_count
      FROM country_mappings
      ORDER BY source_count DESC, country_name
    `);
    
    const coverageStats = {
      total_countries: countryCoverage.rows.length,
      tri_source_countries: countryCoverage.rows.filter(r => r.source_count === 3).length,
      dual_source_countries: countryCoverage.rows.filter(r => r.source_count === 2).length,
      single_source_countries: countryCoverage.rows.filter(r => r.source_count === 1).length,
      no_source_countries: countryCoverage.rows.filter(r => r.source_count === 0).length
    };
    
    // Industry coverage analysis
    const industryCoverage = await client.query(`
      SELECT 
        industry,
        COUNT(DISTINCT unified_concept) as indicator_count,
        COUNT(DISTINCT wb_code) as wb_indicators,
        COUNT(DISTINCT oecd_code) as oecd_indicators,
        COUNT(DISTINCT imf_code) as imf_indicators
      FROM indicator_mappings
      GROUP BY industry
      ORDER BY indicator_count DESC
    `);
    
    const industryStats = {};
    industryCoverage.rows.forEach(row => {
      industryStats[row.industry] = {
        total_indicators: parseInt(row.indicator_count),
        wb_indicators: parseInt(row.wb_indicators),
        oecd_indicators: parseInt(row.oecd_indicators),
        imf_indicators: parseInt(row.imf_indicators)
      };
    });
    
    // Check for missing required industries
    const missingIndustries = VALIDATION_CONFIG.REQUIRED_INDUSTRIES.filter(
      industry => !industryStats[industry]
    );
    
    if (missingIndustries.length > 0) {
      log(`⚠️  Missing industries: ${missingIndustries.join(', ')}`, 'WARN');
    }
    
    validationResults.coverageAnalysis = {
      ...validationResults.coverageAnalysis,
      country_coverage: coverageStats,
      industry_coverage: industryStats,
      missing_industries: missingIndustries
    };
    
    log(`✅ Coverage validation complete: ${coverageStats.tri_source_countries} tri-source countries`);
    return { coverageStats, industryStats };
    
  } finally {
    client.release();
  }
}

async function detectAnomalies() {
  const client = await pool.connect();
  try {
    log('🔍 Detecting anomalies and outliers...');
    
    // Detect GDP growth outliers
    const gdpOutliers = await client.query(`
      WITH gdp_stats AS (
        SELECT 
          AVG(value) as mean_value,
          STDDEV(value) as std_dev
        FROM indicators
        WHERE indicator_code LIKE '%GDP%RPCH%'
          AND value IS NOT NULL
          AND value BETWEEN -30 AND 30
      )
      SELECT 
        country_code,
        indicator_code,
        year,
        value,
        ABS(value - gdp_stats.mean_value) / gdp_stats.std_dev as z_score
      FROM indicators, gdp_stats
      WHERE indicator_code LIKE '%GDP%RPCH%'
        AND value IS NOT NULL
        AND ABS(value - gdp_stats.mean_value) / gdp_stats.std_dev > 3.0
      ORDER BY z_score DESC
      LIMIT 100
    `);
    
    gdpOutliers.rows.forEach(row => {
      validationResults.anomalies.push({
        source: 'WB',
        type: 'GDP_OUTLIER',
        country: row.country_code,
        indicator: row.indicator_code,
        year: row.year,
        value: row.value,
        z_score: parseFloat(row.z_score),
        issue: 'statistical_outlier'
      });
    });
    
    // Detect inflation outliers
    const inflationOutliers = await client.query(`
      WITH inflation_stats AS (
        SELECT 
          AVG(value) as mean_value,
          STDDEV(value) as std_dev
        FROM indicators
        WHERE indicator_code LIKE '%PCPI%'
          AND value IS NOT NULL
          AND value BETWEEN -10 AND 50
      )
      SELECT 
        country_code,
        indicator_code,
        year,
        value,
        ABS(value - inflation_stats.mean_value) / inflation_stats.std_dev as z_score
      FROM indicators, inflation_stats
      WHERE indicator_code LIKE '%PCPI%'
        AND value IS NOT NULL
        AND ABS(value - inflation_stats.mean_value) / inflation_stats.std_dev > 3.0
      ORDER BY z_score DESC
      LIMIT 100
    `);
    
    inflationOutliers.rows.forEach(row => {
      validationResults.anomalies.push({
        source: 'WB',
        type: 'INFLATION_OUTLIER',
        country: row.country_code,
        indicator: row.indicator_code,
        year: row.year,
        value: row.value,
        z_score: parseFloat(row.z_score),
        issue: 'statistical_outlier'
      });
    });
    
    log(`✅ Anomaly detection complete: ${validationResults.anomalies.length} anomalies found`);
    return validationResults.anomalies;
    
  } finally {
    client.release();
  }
}

async function validateMappings() {
  const client = await pool.connect();
  try {
    log('🔍 Validating mappings integrity...');
    
    // Check for orphaned country mappings
    const orphanedCountries = await client.query(`
      SELECT unified_code, country_name
      FROM country_mappings cm
      WHERE NOT EXISTS (
        SELECT 1 FROM indicators i WHERE i.country_code = cm.unified_code
      )
      AND NOT EXISTS (
        SELECT 1 FROM oecd_indicators o WHERE o.country_code = cm.unified_code
      )
      AND NOT EXISTS (
        SELECT 1 FROM imf_indicators imf WHERE imf.weo_country_code = cm.unified_code
      )
    `);
    
    // Check for unmapped countries in data
    const unmappedCountries = await client.query(`
      SELECT DISTINCT country_code
      FROM indicators
      WHERE NOT EXISTS (
        SELECT 1 FROM country_mappings cm WHERE cm.unified_code = indicators.country_code
      )
      LIMIT 20
    `);
    
    // Check for orphaned indicator mappings
    const orphanedIndicators = await client.query(`
      SELECT unified_concept, industry
      FROM indicator_mappings im
      WHERE wb_code IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM indicators i WHERE i.indicator_code = im.wb_code
        )
    `);
    
    if (orphanedCountries.rows.length > 0) {
      log(`⚠️  Found ${orphanedCountries.rows.length} orphaned country mappings`, 'WARN');
    }
    
    if (unmappedCountries.rows.length > 0) {
      log(`⚠️  Found ${unmappedCountries.rows.length} unmapped countries in data`, 'WARN');
    }
    
    if (orphanedIndicators.rows.length > 0) {
      log(`⚠️  Found ${orphanedIndicators.rows.length} orphaned indicator mappings`, 'WARN');
    }
    
    log(`✅ Mapping validation complete`);
    return {
      orphaned_countries: orphanedCountries.rows.length,
      unmapped_countries: unmappedCountries.rows.length,
      orphaned_indicators: orphanedIndicators.rows.length
    };
    
  } finally {
    client.release();
  }
}

async function calculateDataQualityScore() {
  log('🔍 Calculating data quality score...');
  
  const metrics = {
    completeness: (validationResults.validRecords / validationResults.totalRecords) * 100,
    consistency: 100 - (validationResults.crossValidationResults.total_inconsistencies / 100),
    coverage: (validationResults.coverageAnalysis.country_coverage.tri_source_countries / 
               validationResults.coverageAnalysis.country_coverage.total_countries) * 100,
    accuracy: 100 - (validationResults.anomalies.length / 1000)
  };
  
  // Weighted quality score
  const qualityScore = (
    metrics.completeness * 0.3 +
    metrics.consistency * 0.25 +
    metrics.coverage * 0.25 +
    metrics.accuracy * 0.2
  );
  
  validationResults.qualityScore = Math.max(0, Math.min(100, qualityScore));
  validationResults.qualityMetrics = metrics;
  
  log(`✅ Data quality score calculated: ${validationResults.qualityScore.toFixed(1)}/100`);
  return validationResults.qualityScore;
}

async function generateValidationReport() {
  log('📊 Generating validation report...');
  
  const report = {
    ...validationResults,
    summary: {
      overall_status: validationResults.qualityScore >= 85 ? 'EXCELLENT' : 
                     validationResults.qualityScore >= 70 ? 'GOOD' : 
                     validationResults.qualityScore >= 50 ? 'FAIR' : 'POOR',
      total_records: validationResults.totalRecords,
      valid_records: validationResults.validRecords,
      invalid_records: validationResults.invalidRecords,
      quality_score: validationResults.qualityScore,
      errors: validationResults.errors.length,
      warnings: validationResults.warnings.length,
      anomalies: validationResults.anomalies.length,
      execution_time: (validationResults.endTime - validationResults.startTime) / 1000
    }
  };
  
  // Save report to file
  const reportPath = path.join(__dirname, '..', 'reports', `validation-report-${new Date().toISOString().split('T')[0]}.json`);
  
  try {
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Validation report saved to: ${reportPath}`);
  } catch (error) {
    log(`⚠️  Could not save report to file: ${error.message}`, 'WARN');
  }
  
  return report;
}

async function displayValidationSummary() {
  console.log('\n🎯 TRI-SOURCE DATA VALIDATION SUMMARY');
  console.log('=====================================');
  console.log(`📊 Overall Quality Score: ${validationResults.qualityScore.toFixed(1)}/100`);
  console.log(`📈 Status: ${validationResults.qualityScore >= 85 ? '✅ EXCELLENT' : 
                            validationResults.qualityScore >= 70 ? '✅ GOOD' : 
                            validationResults.qualityScore >= 50 ? '⚠️  FAIR' : '❌ POOR'}`);
  console.log('');
  
  console.log('📋 Data Overview:');
  console.log(`   Total Records: ${validationResults.totalRecords.toLocaleString()}`);
  console.log(`   Valid Records: ${validationResults.validRecords.toLocaleString()}`);
  console.log(`   Invalid Records: ${validationResults.invalidRecords.toLocaleString()}`);
  console.log(`   Data Completeness: ${validationResults.qualityMetrics.completeness.toFixed(1)}%`);
  console.log('');
  
  console.log('🗺️ Coverage Analysis:');
  const coverage = validationResults.coverageAnalysis.country_coverage;
  console.log(`   Total Countries: ${coverage.total_countries}`);
  console.log(`   Tri-source Countries: ${coverage.tri_source_countries}`);
  console.log(`   Dual-source Countries: ${coverage.dual_source_countries}`);
  console.log(`   Single-source Countries: ${coverage.single_source_countries}`);
  console.log('');
  
  console.log('🔍 Validation Results:');
  console.log(`   Cross-source Inconsistencies: ${validationResults.crossValidationResults.total_inconsistencies || 0}`);
  console.log(`   Anomalies Detected: ${validationResults.anomalies.length}`);
  console.log(`   Errors Found: ${validationResults.errors.length}`);
  console.log(`   Warnings Issued: ${validationResults.warnings.length}`);
  console.log('');
  
  if (validationResults.anomalies.length > 0) {
    console.log('⚠️  Top Anomalies:');
    validationResults.anomalies.slice(0, 5).forEach(anomaly => {
      console.log(`   - ${anomaly.country} ${anomaly.indicator} (${anomaly.year}): ${anomaly.value} (${anomaly.issue})`);
    });
    console.log('');
  }
  
  console.log('🏆 Quality Metrics:');
  console.log(`   Completeness: ${validationResults.qualityMetrics.completeness.toFixed(1)}%`);
  console.log(`   Consistency: ${validationResults.qualityMetrics.consistency.toFixed(1)}%`);
  console.log(`   Coverage: ${validationResults.qualityMetrics.coverage.toFixed(1)}%`);
  console.log(`   Accuracy: ${validationResults.qualityMetrics.accuracy.toFixed(1)}%`);
  console.log('');
  
  const executionTime = (validationResults.endTime - validationResults.startTime) / 1000;
  console.log(`⏱️  Total Execution Time: ${executionTime.toFixed(1)} seconds`);
  console.log('');
  
  if (validationResults.qualityScore >= 85) {
    console.log('🎉 VALIDATION COMPLETE: Your database is in excellent condition!');
  } else if (validationResults.qualityScore >= 70) {
    console.log('✅ VALIDATION COMPLETE: Your database is in good condition.');
  } else {
    console.log('⚠️  VALIDATION COMPLETE: Your database needs attention.');
    console.log('📋 Recommendations:');
    if (validationResults.qualityMetrics.completeness < 80) {
      console.log('   - Address data completeness issues');
    }
    if (validationResults.crossValidationResults.total_inconsistencies > 100) {
      console.log('   - Review cross-source inconsistencies');
    }
    if (validationResults.anomalies.length > 500) {
      console.log('   - Investigate and clean anomalous data');
    }
  }
}

// Main validation function
async function validateDataIntegrity() {
  try {
    console.log('🚀 Starting Comprehensive Data Validation...');
    console.log('============================================');
    console.log('🔒 Validating tri-source economic intelligence platform');
    console.log('📊 Checking data integrity across World Bank, OECD, and IMF sources');
    console.log('');
    
    validationResults.startTime = Date.now();
    
    // Run all validation checks
    await validateRecordCounts();
    await validateDataTypes();
    await validateCrossSourceConsistency();
    await validateCoverage();
    await detectAnomalies();
    await validateMappings();
    
    // Calculate quality score
    await calculateDataQualityScore();
    
    validationResults.endTime = Date.now();
    
    // Generate and display results
    await generateValidationReport();
    await displayValidationSummary();
    
    console.log('🎯 Data validation completed successfully!');
    
    return {
      success: true,
      qualityScore: validationResults.qualityScore,
      summary: validationResults
    };
    
  } catch (error) {
    console.error('❌ Data validation failed:', error);
    validationResults.endTime = Date.now();
    validationResults.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message,
      summary: validationResults
    };
  }
}

// Command line execution
if (require.main === module) {
  validateDataIntegrity()
    .then(result => {
      if (result.success) {
        console.log(`✅ Validation completed with quality score: ${result.qualityScore.toFixed(1)}/100`);
        process.exit(0);
      } else {
        console.log(`❌ Validation failed: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = { validateDataIntegrity, VALIDATION_CONFIG };
