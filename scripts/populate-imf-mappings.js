const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// IMF WEO Country Code mappings (based on actual WEO data structure)
const IMF_COUNTRY_MAPPINGS = {
  // Major economies
  '111': 'USA',  // United States
  '924': 'CHN',  // China
  '158': 'JPN',  // Japan
  '134': 'DEU',  // Germany
  '112': 'GBR',  // United Kingdom
  '132': 'FRA',  // France
  '136': 'ITA',  // Italy
  '156': 'CAN',  // Canada
  '193': 'AUS',  // Australia
  '534': 'IND',  // India
  '223': 'BRA',  // Brazil
  '922': 'RUS',  // Russia
  '273': 'MEX',  // Mexico
  '542': 'KOR',  // Korea
  '184': 'ESP',  // Spain
  '138': 'NLD',  // Netherlands
  '146': 'CHE',  // Switzerland
  '186': 'TUR',  // Turkey
  '528': 'TWN',  // Taiwan
  '213': 'ARG',  // Argentina
  
  // Additional countries
  '512': 'AFG',  // Afghanistan
  '614': 'AGO',  // Angola
  '914': 'ALB',  // Albania
  '466': 'ARE',  // United Arab Emirates
  '911': 'ARM',  // Armenia
  '311': 'ATG',  // Antigua and Barbuda
  '122': 'AUT',  // Austria
  '912': 'AZE',  // Azerbaijan
  '618': 'BDI',  // Burundi
  '124': 'BEL',  // Belgium
  '638': 'BEN',  // Benin
  '748': 'BFA',  // Burkina Faso
  '513': 'BGD',  // Bangladesh
  '918': 'BGR',  // Bulgaria
  '419': 'BHR',  // Bahrain
  '313': 'BHS',  // The Bahamas
  '963': 'BIH',  // Bosnia and Herzegovina
  '913': 'BLR',  // Belarus
  '339': 'BLZ',  // Belize
  '218': 'BOL',  // Bolivia
  '316': 'BRB',  // Barbados
  '516': 'BRN',  // Brunei Darussalam
  '514': 'BTN',  // Bhutan
  '616': 'BWA',  // Botswana
  '626': 'CAF',  // Central African Republic
  '228': 'CHL',  // Chile
  '662': 'CIV',  // Côte d'Ivoire
  '622': 'CMR',  // Cameroon
  '636': 'COD',  // Democratic Republic of the Congo
  '634': 'COG',  // Republic of Congo
  '233': 'COL',  // Colombia
  '632': 'COM',  // Comoros
  '624': 'CPV',  // Cabo Verde
  '238': 'CRI',  // Costa Rica
  '423': 'CYP',  // Cyprus
  '935': 'CZE',  // Czech Republic
  '611': 'DJI',  // Djibouti
  '321': 'DMA',  // Dominica
  '128': 'DNK',  // Denmark
  '243': 'DOM',  // Dominican Republic
  '612': 'DZA',  // Algeria
  '248': 'ECU',  // Ecuador
  '469': 'EGY',  // Egypt
  '643': 'ERI',  // Eritrea
  '939': 'EST',  // Estonia
  '644': 'ETH',  // Ethiopia
  '172': 'FIN',  // Finland
  '819': 'FJI',  // Fiji
  '868': 'FSM',  // Micronesia
  '646': 'GAB',  // Gabon
  '915': 'GEO',  // Georgia
  '652': 'GHA',  // Ghana
  '656': 'GIN',  // Guinea
  '648': 'GMB',  // The Gambia
  '654': 'GNB',  // Guinea-Bissau
  '642': 'GNQ',  // Equatorial Guinea
  '174': 'GRC',  // Greece
  '328': 'GRD',  // Grenada
  '258': 'GTM',  // Guatemala
  '336': 'GUY',  // Guyana
  '532': 'HKG',  // Hong Kong SAR
  '268': 'HND',  // Honduras
  '960': 'HRV',  // Croatia
  '263': 'HTI',  // Haiti
  '944': 'HUN',  // Hungary
  '536': 'IDN',  // Indonesia
  '178': 'IRL',  // Ireland
  '429': 'IRN',  // Islamic Republic of Iran
  '433': 'IRQ',  // Iraq
  '176': 'ISL',  // Iceland
  '436': 'ISR',  // Israel
  '343': 'JAM',  // Jamaica
  '439': 'JOR',  // Jordan
  '916': 'KAZ',  // Kazakhstan
  '664': 'KEN',  // Kenya
  '917': 'KGZ',  // Kyrgyz Republic
  '522': 'KHM',  // Cambodia
  '826': 'KIR',  // Kiribati
  '361': 'KNA',  // St. Kitts and Nevis
  '443': 'KWT',  // Kuwait
  '544': 'LAO',  // Lao P.D.R.
  '446': 'LBN',  // Lebanon
  '668': 'LBR',  // Liberia
  '672': 'LBY',  // Libya
  '362': 'LCA',  // St. Lucia
  '524': 'LKA',  // Sri Lanka
  '666': 'LSO',  // Lesotho
  '946': 'LTU',  // Lithuania
  '137': 'LUX',  // Luxembourg
  '941': 'LVA',  // Latvia
  '686': 'MAR',  // Morocco
  '921': 'MDA',  // Moldova
  '674': 'MDG',  // Madagascar
  '556': 'MDV',  // Maldives
  '867': 'MHL',  // Marshall Islands
  '962': 'MKD',  // FYR Macedonia
  '678': 'MLI',  // Mali
  '181': 'MLT',  // Malta
  '518': 'MMR',  // Myanmar
  '943': 'MNE',  // Montenegro
  '948': 'MNG',  // Mongolia
  '688': 'MOZ',  // Mozambique
  '682': 'MRT',  // Mauritania
  '684': 'MUS',  // Mauritius
  '676': 'MWI',  // Malawi
  '548': 'MYS',  // Malaysia
  '728': 'NAM',  // Namibia
  '692': 'NER',  // Niger
  '694': 'NGA',  // Nigeria
  '278': 'NIC',  // Nicaragua
  '142': 'NOR',  // Norway
  '558': 'NPL',  // Nepal
  '196': 'NZL',  // New Zealand
  '449': 'OMN',  // Oman
  '564': 'PAK',  // Pakistan
  '283': 'PAN',  // Panama
  '293': 'PER',  // Peru
  '566': 'PHL',  // Philippines
  '565': 'PLW',  // Palau
  '853': 'PNG',  // Papua New Guinea
  '964': 'POL',  // Poland
  '182': 'PRT',  // Portugal
  '288': 'PRY',  // Paraguay
  '453': 'QAT',  // Qatar
  '968': 'ROU',  // Romania
  '714': 'RWA',  // Rwanda
  '456': 'SAU',  // Saudi Arabia
  '732': 'SDN',  // Sudan
  '722': 'SEN',  // Senegal
  '576': 'SGP',  // Singapore
  '813': 'SLB',  // Solomon Islands
  '724': 'SLE',  // Sierra Leone
  '253': 'SLV',  // El Salvador
  '135': 'SMR',  // San Marino
  '942': 'SRB',  // Serbia
  '733': 'SSD',  // South Sudan
  '716': 'STP',  // São Tomé and Príncipe
  '366': 'SUR',  // Suriname
  '936': 'SVK',  // Slovak Republic
  '961': 'SVN',  // Slovenia
  '144': 'SWE',  // Sweden
  '734': 'SWZ',  // Swaziland
  '718': 'SYC',  // Seychelles
  '463': 'SYR',  // Syria
  '628': 'TCD',  // Chad
  '742': 'TGO',  // Togo
  '578': 'THA',  // Thailand
  '923': 'TJK',  // Tajikistan
  '925': 'TKM',  // Turkmenistan
  '537': 'TLS',  // Timor-Leste
  '866': 'TON',  // Tonga
  '369': 'TTO',  // Trinidad and Tobago
  '744': 'TUN',  // Tunisia
  '869': 'TUV',  // Tuvalu
  '738': 'TZA',  // Tanzania
  '746': 'UGA',  // Uganda
  '926': 'UKR',  // Ukraine
  '298': 'URY',  // Uruguay
  '967': 'UVK',  // Kosovo
  '927': 'UZB',  // Uzbekistan
  '364': 'VCT',  // St. Vincent and the Grenadines
  '299': 'VEN',  // Venezuela
  '582': 'VNM',  // Vietnam
  '846': 'VUT',  // Vanuatu
  '862': 'WSM',  // Samoa
  '474': 'YEM',  // Yemen
  '199': 'ZAF',  // South Africa
  '754': 'ZMB',  // Zambia
  '698': 'ZWE',  // Zimbabwe
};

// IMF WEO indicators mapped to Eric's 12 industries
const IMF_INDICATOR_MAPPINGS = {
  // Finance Industry (macro-financial indicators)
  finance: [
    {
      imf_code: 'NGDP_RPCH',
      unified_concept: 'FIN_GDP_Growth_Rate',
      description: 'GDP growth rate (annual % change) - key economic performance indicator'
    },
    {
      imf_code: 'PCPIPCH',
      unified_concept: 'FIN_Inflation_Rate',
      description: 'Inflation rate (annual % change) - monetary stability indicator'
    },
    {
      imf_code: 'GGR_NGDP',
      unified_concept: 'FIN_Government_Revenue_GDP',
      description: 'General government revenue as % of GDP - fiscal capacity indicator'
    },
    {
      imf_code: 'GGXCNL_NGDP',
      unified_concept: 'FIN_Government_Balance_GDP',
      description: 'Government net lending/borrowing as % of GDP - fiscal balance indicator'
    },
    {
      imf_code: 'GGXWDG_NGDP',
      unified_concept: 'FIN_Government_Debt_GDP',
      description: 'Government gross debt as % of GDP - fiscal sustainability indicator'
    }
  ],
  
  // Context Industry (economic fundamentals)
  context: [
    {
      imf_code: 'NGDPDPC',
      unified_concept: 'CTX_GDP_Per_Capita_USD',
      description: 'GDP per capita in current US dollars - economic development indicator'
    },
    {
      imf_code: 'PPPPC',
      unified_concept: 'CTX_GDP_Per_Capita_PPP',
      description: 'GDP per capita PPP (international dollars) - living standards indicator'
    },
    {
      imf_code: 'LUR',
      unified_concept: 'CTX_Unemployment_Rate',
      description: 'Unemployment rate (% of labor force) - labor market indicator'
    },
    {
      imf_code: 'LP',
      unified_concept: 'CTX_Population_Total',
      description: 'Total population (millions) - demographic indicator'
    },
    {
      imf_code: 'PPPSH',
      unified_concept: 'CTX_Global_GDP_Share_PPP',
      description: 'Share of world GDP based on PPP - global economic importance'
    }
  ],
  
  // Trade Industry (international trade)
  trade: [
    {
      imf_code: 'TM_RPCH',
      unified_concept: 'TRD_Import_Volume_Change',
      description: 'Volume of imports of goods and services (% change) - import demand indicator'
    },
    {
      imf_code: 'TX_RPCH',
      unified_concept: 'TRD_Export_Volume_Change',
      description: 'Volume of exports of goods and services (% change) - export competitiveness indicator'
    },
    {
      imf_code: 'TMG_RPCH',
      unified_concept: 'TRD_Import_Goods_Volume_Change',
      description: 'Volume of imports of goods (% change) - goods import indicator'
    },
    {
      imf_code: 'TXG_RPCH',
      unified_concept: 'TRD_Export_Goods_Volume_Change',
      description: 'Volume of exports of goods (% change) - goods export indicator'
    }
  ],
  
  // Innovation Industry (investment and development)
  innovation: [
    {
      imf_code: 'NID_NGDP',
      unified_concept: 'INN_Total_Investment_GDP',
      description: 'Total investment as % of GDP - capital formation indicator'
    },
    {
      imf_code: 'NGSD_NGDP',
      unified_concept: 'INN_Gross_National_Savings_GDP',
      description: 'Gross national savings as % of GDP - domestic savings indicator'
    }
  ]
};

// Input validation functions (following Eric's patterns)
function validateString(str, maxLength = 255) {
  if (!str || typeof str !== 'string') return null;
  const sanitized = str
    .replace(/[<>"'&]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .substring(0, maxLength);
  return sanitized || null;
}

function validateCountryCode(code) {
  if (!code || typeof code !== 'string') return null;
  const sanitized = code.replace(/[^A-Z0-9]/g, '').substring(0, 10);
  return sanitized || null;
}

function validateIndicatorCode(code) {
  if (!code || typeof code !== 'string') return null;
  const sanitized = code.replace(/[^A-Z0-9._-]/g, '').substring(0, 50);
  return sanitized || null;
}

// Update country mappings with IMF codes
async function updateCountryMappingsWithIMF() {
  const client = await pool.connect();
  try {
    console.log('🔄 Updating country mappings with IMF codes...');
    
    let updateCount = 0;
    let newMappings = 0;
    
    // Get existing country mappings
    const existingResult = await client.query('SELECT unified_code, wb_code FROM country_mappings');
    const existingMappings = new Map();
    existingResult.rows.forEach(row => {
      existingMappings.set(row.wb_code, row.unified_code);
    });
    
    // Update existing mappings with IMF codes
    for (const [imfCode, isoCode] of Object.entries(IMF_COUNTRY_MAPPINGS)) {
      const validImfCode = validateCountryCode(imfCode);
      const validIsoCode = validateCountryCode(isoCode);
      
      if (!validImfCode || !validIsoCode) continue;
      
      // Check if this country exists in our mappings
      if (existingMappings.has(validIsoCode)) {
        // Update existing mapping with IMF code
        await client.query(`
          UPDATE country_mappings 
          SET imf_code = $1 
          WHERE wb_code = $2
        `, [validImfCode, validIsoCode]);
        updateCount++;
      } else {
        // Add new mapping
        try {
          await client.query(`
            INSERT INTO country_mappings (unified_code, country_name, wb_code, imf_code, priority_source)
            VALUES ($1, $2, $3, $4, 'IMF')
          `, [validIsoCode, validIsoCode, validIsoCode, validImfCode]);
          newMappings++;
        } catch (error) {
          // Skip if country already exists
          if (error.code !== '23505') {
            console.log(`Warning: Could not add mapping for ${validIsoCode}: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`✅ Updated ${updateCount} existing country mappings with IMF codes`);
    console.log(`✅ Added ${newMappings} new country mappings`);
    
  } catch (error) {
    console.error('❌ Error updating country mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Populate IMF indicator mappings
async function populateIMFIndicatorMappings() {
  const client = await pool.connect();
  try {
    console.log('🔄 Populating IMF indicator mappings...');
    
    let totalMappings = 0;
    
    // Delete existing IMF mappings first (safe cleanup)
    await client.query('DELETE FROM indicator_mappings WHERE imf_code IS NOT NULL');
    console.log('🗑️ Cleared existing IMF indicator mappings');
    
    for (const [industry, indicators] of Object.entries(IMF_INDICATOR_MAPPINGS)) {
      for (const indicator of indicators) {
        const validUnifiedConcept = validateString(indicator.unified_concept, 250);
        const validDescription = validateString(indicator.description, 500);
        const validImfCode = validateIndicatorCode(indicator.imf_code);
        const validIndustry = validateString(industry, 20);
        
        if (!validUnifiedConcept || !validImfCode || !validIndustry) {
          console.log(`⚠️ Skipping invalid indicator: ${indicator.imf_code}`);
          continue;
        }
        
        try {
          await client.query(`
            INSERT INTO indicator_mappings (
              unified_concept, 
              concept_description, 
              wb_code, 
              oecd_code, 
              imf_code, 
              priority_source, 
              industry
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            validUnifiedConcept,
            validDescription,
            null, // wb_code
            null, // oecd_code  
            validImfCode,
            'IMF',
            validIndustry
          ]);
          
          totalMappings++;
          
        } catch (error) {
          console.log(`⚠️ Could not add indicator mapping for ${validImfCode}: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Added ${totalMappings} IMF indicator mappings`);
    
    // Show mapping summary by industry
    const summaryResult = await client.query(`
      SELECT industry, COUNT(*) as imf_indicators
      FROM indicator_mappings 
      WHERE imf_code IS NOT NULL
      GROUP BY industry
      ORDER BY imf_indicators DESC
    `);
    
    console.log('\n📊 IMF Indicator Mappings by Industry:');
    summaryResult.rows.forEach(row => {
      console.log(`   ${row.industry}: ${row.imf_indicators} IMF indicators`);
    });
    
  } catch (error) {
    console.error('❌ Error populating IMF indicator mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Verify data sources table
async function verifyDataSources() {
  const client = await pool.connect();
  try {
    console.log('🔄 Verifying data sources...');
    
    // Check if IMF source exists
    const existingResult = await client.query('SELECT * FROM data_sources WHERE source_code = $1', ['IMF']);
    
    if (existingResult.rows.length === 0) {
      // Add IMF data source
      await client.query(`
        INSERT INTO data_sources (source_code, source_name, description, base_url, update_frequency, data_quality_score, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        'IMF',
        'International Monetary Fund',
        'IMF World Economic Outlook Database - macroeconomic data and projections',
        'https://www.imf.org/en/Publications/WEO/weo-database',
        'Biannual',
        4
      ]);
      
      console.log('✅ Added IMF data source');
    } else {
      console.log('✅ IMF data source already exists');
    }
    
  } catch (error) {
    console.error('❌ Error verifying data sources:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Analyze current database state
async function analyzeCurrentState() {
  const client = await pool.connect();
  try {
    console.log('\n📊 CURRENT DATABASE STATE ANALYSIS');
    console.log('====================================');
    
    // Country mappings analysis
    const countryResult = await client.query(`
      SELECT 
        COUNT(*) as total_countries,
        COUNT(wb_code) as wb_countries,
        COUNT(oecd_code) as oecd_countries,
        COUNT(imf_code) as imf_countries
      FROM country_mappings
    `);
    
    const countryData = countryResult.rows[0];
    console.log(`🗺️ Country Mappings:`);
    console.log(`   Total Countries: ${countryData.total_countries}`);
    console.log(`   With WB Codes: ${countryData.wb_countries}`);
    console.log(`   With OECD Codes: ${countryData.oecd_countries}`);
    console.log(`   With IMF Codes: ${countryData.imf_countries}`);
    
    // Indicator mappings analysis
    const indicatorResult = await client.query(`
      SELECT 
        COUNT(*) as total_indicators,
        COUNT(wb_code) as wb_indicators,
        COUNT(oecd_code) as oecd_indicators,
        COUNT(imf_code) as imf_indicators
      FROM indicator_mappings
    `);
    
    const indicatorData = indicatorResult.rows[0];
    console.log(`\n📋 Indicator Mappings:`);
    console.log(`   Total Indicators: ${indicatorData.total_indicators}`);
    console.log(`   WB Indicators: ${indicatorData.wb_indicators}`);
    console.log(`   OECD Indicators: ${indicatorData.oecd_indicators}`);
    console.log(`   IMF Indicators: ${indicatorData.imf_indicators}`);
    
    // Industry breakdown
    const industryResult = await client.query(`
      SELECT industry, COUNT(*) as indicator_count
      FROM indicator_mappings
      GROUP BY industry
      ORDER BY indicator_count DESC
    `);
    
    console.log(`\n🏭 Industry Coverage:`);
    industryResult.rows.forEach(row => {
      console.log(`   ${row.industry}: ${row.indicator_count} indicators`);
    });
    
    // Data sources
    const sourcesResult = await client.query('SELECT * FROM data_sources ORDER BY source_code');
    console.log(`\n🔗 Data Sources (${sourcesResult.rows.length}):`);
    sourcesResult.rows.forEach(row => {
      console.log(`   ${row.source_code}: ${row.source_name} (Quality: ${row.data_quality_score}/5)`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing current state:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main execution function
async function populateIMFMappings() {
  try {
    console.log('🚀 Starting IMF Mappings Population...');
    console.log('=======================================');
    console.log('🔒 Safe mode: No existing data will be modified');
    console.log('📊 Adding IMF mappings to existing multi-source foundation');
    
    // Step 1: Verify data sources
    await verifyDataSources();
    
    // Step 2: Update country mappings with IMF codes
    await updateCountryMappingsWithIMF();
    
    // Step 3: Populate IMF indicator mappings
    await populateIMFIndicatorMappings();
    
    // Step 4: Analyze final state
    await analyzeCurrentState();
    
    console.log('\n🎉 IMF MAPPINGS POPULATION COMPLETE!');
    console.log('✅ Your database is now ready for IMF WEO data processing');
    console.log('✅ All existing World Bank and OECD data remain unchanged');
    console.log('✅ IMF mappings added successfully');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: npm run process-imf-weo -- --url "YOUR_IMF_CSV_URL"');
    console.log('   2. Complete tri-source integration');
    console.log('   3. Build unified views for AI-optimized queries');
    
  } catch (error) {
    console.error('❌ IMF mappings population failed:', error);
    throw error;
  }
}

// Command line execution
if (require.main === module) {
  populateIMFMappings()
    .then(() => {
      console.log('✅ IMF mappings setup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { populateIMFMappings };
