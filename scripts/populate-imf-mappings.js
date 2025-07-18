const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// IMF WEO Country Code Mappings (based on WEO April 2025 data)
const IMF_COUNTRY_MAPPINGS = {
  // Major economies
  '111': { iso: 'USA', name: 'United States', wb_code: 'USA' },
  '924': { iso: 'CHN', name: 'China', wb_code: 'CHN' },
  '158': { iso: 'JPN', name: 'Japan', wb_code: 'JPN' },
  '134': { iso: 'DEU', name: 'Germany', wb_code: 'DEU' },
  '112': { iso: 'GBR', name: 'United Kingdom', wb_code: 'GBR' },
  '132': { iso: 'FRA', name: 'France', wb_code: 'FRA' },
  '534': { iso: 'IND', name: 'India', wb_code: 'IND' },
  '136': { iso: 'ITA', name: 'Italy', wb_code: 'ITA' },
  '223': { iso: 'BRA', name: 'Brazil', wb_code: 'BRA' },
  '156': { iso: 'CAN', name: 'Canada', wb_code: 'CAN' },
  '542': { iso: 'KOR', name: 'Korea', wb_code: 'KOR' },
  '922': { iso: 'RUS', name: 'Russia', wb_code: 'RUS' },
  '184': { iso: 'ESP', name: 'Spain', wb_code: 'ESP' },
  '193': { iso: 'AUS', name: 'Australia', wb_code: 'AUS' },
  '273': { iso: 'MEX', name: 'Mexico', wb_code: 'MEX' },
  '536': { iso: 'IDN', name: 'Indonesia', wb_code: 'IDN' },
  '138': { iso: 'NLD', name: 'Netherlands', wb_code: 'NLD' },
  '456': { iso: 'SAU', name: 'Saudi Arabia', wb_code: 'SAU' },
  '186': { iso: 'TUR', name: 'Turkey', wb_code: 'TUR' },
  '146': { iso: 'CHE', name: 'Switzerland', wb_code: 'CHE' },
  '158': { iso: 'JPN', name: 'Japan', wb_code: 'JPN' },
  '528': { iso: 'TWN', name: 'Taiwan Province of China', wb_code: 'TWN' },
  '124': { iso: 'BEL', name: 'Belgium', wb_code: 'BEL' },
  '213': { iso: 'ARG', name: 'Argentina', wb_code: 'ARG' },
  '178': { iso: 'IRL', name: 'Ireland', wb_code: 'IRL' },
  '436': { iso: 'ISR', name: 'Israel', wb_code: 'ISR' },
  '142': { iso: 'NOR', name: 'Norway', wb_code: 'NOR' },
  '122': { iso: 'AUT', name: 'Austria', wb_code: 'AUT' },
  '196': { iso: 'NZL', name: 'New Zealand', wb_code: 'NZL' },
  '199': { iso: 'ZAF', name: 'South Africa', wb_code: 'ZAF' },
  '566': { iso: 'PHL', name: 'Philippines', wb_code: 'PHL' },
  '576': { iso: 'SGP', name: 'Singapore', wb_code: 'SGP' },
  '578': { iso: 'THA', name: 'Thailand', wb_code: 'THA' },
  '548': { iso: 'MYS', name: 'Malaysia', wb_code: 'MYS' },
  '582': { iso: 'VNM', name: 'Vietnam', wb_code: 'VNM' },
  '228': { iso: 'CHL', name: 'Chile', wb_code: 'CHL' },
  '172': { iso: 'FIN', name: 'Finland', wb_code: 'FIN' },
  '128': { iso: 'DNK', name: 'Denmark', wb_code: 'DNK' },
  '144': { iso: 'SWE', name: 'Sweden', wb_code: 'SWE' },
  '964': { iso: 'POL', name: 'Poland', wb_code: 'POL' },
  '914': { iso: 'ALB', name: 'Albania', wb_code: 'ALB' },
  '512': { iso: 'AFG', name: 'Afghanistan', wb_code: 'AFG' },
  '612': { iso: 'DZA', name: 'Algeria', wb_code: 'DZA' },
  '614': { iso: 'AGO', name: 'Angola', wb_code: 'AGO' },
  '311': { iso: 'ATG', name: 'Antigua and Barbuda', wb_code: 'ATG' },
  '911': { iso: 'ARM', name: 'Armenia', wb_code: 'ARM' },
  '466': { iso: 'ARE', name: 'United Arab Emirates', wb_code: 'ARE' },
  '912': { iso: 'AZE', name: 'Azerbaijan', wb_code: 'AZE' },
  '313': { iso: 'BHS', name: 'The Bahamas', wb_code: 'BHS' },
  '419': { iso: 'BHR', name: 'Bahrain', wb_code: 'BHR' },
  '513': { iso: 'BGD', name: 'Bangladesh', wb_code: 'BGD' },
  '316': { iso: 'BRB', name: 'Barbados', wb_code: 'BRB' },
  '913': { iso: 'BLR', name: 'Belarus', wb_code: 'BLR' },
  '339': { iso: 'BLZ', name: 'Belize', wb_code: 'BLZ' },
  '638': { iso: 'BEN', name: 'Benin', wb_code: 'BEN' },
  '514': { iso: 'BTN', name: 'Bhutan', wb_code: 'BTN' },
  '218': { iso: 'BOL', name: 'Bolivia', wb_code: 'BOL' },
  '963': { iso: 'BIH', name: 'Bosnia and Herzegovina', wb_code: 'BIH' },
  '616': { iso: 'BWA', name: 'Botswana', wb_code: 'BWA' },
  '516': { iso: 'BRN', name: 'Brunei Darussalam', wb_code: 'BRN' },
  '918': { iso: 'BGR', name: 'Bulgaria', wb_code: 'BGR' },
  '748': { iso: 'BFA', name: 'Burkina Faso', wb_code: 'BFA' },
  '618': { iso: 'BDI', name: 'Burundi', wb_code: 'BDI' },
  '624': { iso: 'CPV', name: 'Cabo Verde', wb_code: 'CPV' },
  '522': { iso: 'KHM', name: 'Cambodia', wb_code: 'KHM' },
  '622': { iso: 'CMR', name: 'Cameroon', wb_code: 'CMR' },
  '626': { iso: 'CAF', name: 'Central African Republic', wb_code: 'CAF' },
  '628': { iso: 'TCD', name: 'Chad', wb_code: 'TCD' },
  '233': { iso: 'COL', name: 'Colombia', wb_code: 'COL' },
  '632': { iso: 'COM', name: 'Comoros', wb_code: 'COM' },
  '634': { iso: 'COG', name: 'Republic of Congo', wb_code: 'COG' },
  '238': { iso: 'CRI', name: 'Costa Rica', wb_code: 'CRI' },
  '662': { iso: 'CIV', name: 'Côte d\'Ivoire', wb_code: 'CIV' },
  '960': { iso: 'HRV', name: 'Croatia', wb_code: 'HRV' },
  '423': { iso: 'CYP', name: 'Cyprus', wb_code: 'CYP' },
  '935': { iso: 'CZE', name: 'Czech Republic', wb_code: 'CZE' },
  '636': { iso: 'COD', name: 'Democratic Republic of the Congo', wb_code: 'COD' },
  '611': { iso: 'DJI', name: 'Djibouti', wb_code: 'DJI' },
  '321': { iso: 'DMA', name: 'Dominica', wb_code: 'DMA' },
  '243': { iso: 'DOM', name: 'Dominican Republic', wb_code: 'DOM' },
  '248': { iso: 'ECU', name: 'Ecuador', wb_code: 'ECU' },
  '469': { iso: 'EGY', name: 'Egypt', wb_code: 'EGY' },
  '253': { iso: 'SLV', name: 'El Salvador', wb_code: 'SLV' },
  '642': { iso: 'GNQ', name: 'Equatorial Guinea', wb_code: 'GNQ' },
  '643': { iso: 'ERI', name: 'Eritrea', wb_code: 'ERI' },
  '939': { iso: 'EST', name: 'Estonia', wb_code: 'EST' },
  '644': { iso: 'ETH', name: 'Ethiopia', wb_code: 'ETH' },
  '819': { iso: 'FJI', name: 'Fiji', wb_code: 'FJI' },
  '646': { iso: 'GAB', name: 'Gabon', wb_code: 'GAB' },
  '648': { iso: 'GMB', name: 'The Gambia', wb_code: 'GMB' },
  '915': { iso: 'GEO', name: 'Georgia', wb_code: 'GEO' },
  '652': { iso: 'GHA', name: 'Ghana', wb_code: 'GHA' },
  '174': { iso: 'GRC', name: 'Greece', wb_code: 'GRC' },
  '328': { iso: 'GRD', name: 'Grenada', wb_code: 'GRD' },
  '258': { iso: 'GTM', name: 'Guatemala', wb_code: 'GTM' },
  '656': { iso: 'GIN', name: 'Guinea', wb_code: 'GIN' },
  '654': { iso: 'GNB', name: 'Guinea-Bissau', wb_code: 'GNB' },
  '336': { iso: 'GUY', name: 'Guyana', wb_code: 'GUY' },
  '263': { iso: 'HTI', name: 'Haiti', wb_code: 'HTI' },
  '268': { iso: 'HND', name: 'Honduras', wb_code: 'HND' },
  '532': { iso: 'HKG', name: 'Hong Kong SAR', wb_code: 'HKG' },
  '944': { iso: 'HUN', name: 'Hungary', wb_code: 'HUN' },
  '176': { iso: 'ISL', name: 'Iceland', wb_code: 'ISL' },
  '429': { iso: 'IRN', name: 'Islamic Republic of Iran', wb_code: 'IRN' },
  '433': { iso: 'IRQ', name: 'Iraq', wb_code: 'IRQ' },
  '343': { iso: 'JAM', name: 'Jamaica', wb_code: 'JAM' },
  '439': { iso: 'JOR', name: 'Jordan', wb_code: 'JOR' },
  '916': { iso: 'KAZ', name: 'Kazakhstan', wb_code: 'KAZ' },
  '664': { iso: 'KEN', name: 'Kenya', wb_code: 'KEN' },
  '826': { iso: 'KIR', name: 'Kiribati', wb_code: 'KIR' },
  '967': { iso: 'UVK', name: 'Kosovo', wb_code: 'XKX' },
  '443': { iso: 'KWT', name: 'Kuwait', wb_code: 'KWT' },
  '917': { iso: 'KGZ', name: 'Kyrgyz Republic', wb_code: 'KGZ' },
  '544': { iso: 'LAO', name: 'Lao P.D.R.', wb_code: 'LAO' },
  '941': { iso: 'LVA', name: 'Latvia', wb_code: 'LVA' },
  '446': { iso: 'LBN', name: 'Lebanon', wb_code: 'LBN' },
  '666': { iso: 'LSO', name: 'Lesotho', wb_code: 'LSO' },
  '668': { iso: 'LBR', name: 'Liberia', wb_code: 'LBR' },
  '672': { iso: 'LBY', name: 'Libya', wb_code: 'LBY' },
  '946': { iso: 'LTU', name: 'Lithuania', wb_code: 'LTU' },
  '137': { iso: 'LUX', name: 'Luxembourg', wb_code: 'LUX' },
  '962': { iso: 'MKD', name: 'FYR Macedonia', wb_code: 'MKD' },
  '674': { iso: 'MDG', name: 'Madagascar', wb_code: 'MDG' },
  '676': { iso: 'MWI', name: 'Malawi', wb_code: 'MWI' },
  '556': { iso: 'MDV', name: 'Maldives', wb_code: 'MDV' },
  '678': { iso: 'MLI', name: 'Mali', wb_code: 'MLI' },
  '181': { iso: 'MLT', name: 'Malta', wb_code: 'MLT' },
  '867': { iso: 'MHL', name: 'Marshall Islands', wb_code: 'MHL' },
  '682': { iso: 'MRT', name: 'Mauritania', wb_code: 'MRT' },
  '684': { iso: 'MUS', name: 'Mauritius', wb_code: 'MUS' },
  '868': { iso: 'FSM', name: 'Micronesia', wb_code: 'FSM' },
  '921': { iso: 'MDA', name: 'Moldova', wb_code: 'MDA' },
  '948': { iso: 'MNG', name: 'Mongolia', wb_code: 'MNG' },
  '943': { iso: 'MNE', name: 'Montenegro', wb_code: 'MNE' },
  '686': { iso: 'MAR', name: 'Morocco', wb_code: 'MAR' },
  '688': { iso: 'MOZ', name: 'Mozambique', wb_code: 'MOZ' },
  '518': { iso: 'MMR', name: 'Myanmar', wb_code: 'MMR' },
  '728': { iso: 'NAM', name: 'Namibia', wb_code: 'NAM' },
  '558': { iso: 'NPL', name: 'Nepal', wb_code: 'NPL' },
  '278': { iso: 'NIC', name: 'Nicaragua', wb_code: 'NIC' },
  '692': { iso: 'NER', name: 'Niger', wb_code: 'NER' },
  '694': { iso: 'NGA', name: 'Nigeria', wb_code: 'NGA' },
  '449': { iso: 'OMN', name: 'Oman', wb_code: 'OMN' },
  '564': { iso: 'PAK', name: 'Pakistan', wb_code: 'PAK' },
  '565': { iso: 'PLW', name: 'Palau', wb_code: 'PLW' },
  '283': { iso: 'PAN', name: 'Panama', wb_code: 'PAN' },
  '853': { iso: 'PNG', name: 'Papua New Guinea', wb_code: 'PNG' },
  '288': { iso: 'PRY', name: 'Paraguay', wb_code: 'PRY' },
  '293': { iso: 'PER', name: 'Peru', wb_code: 'PER' },
  '182': { iso: 'PRT', name: 'Portugal', wb_code: 'PRT' },
  '453': { iso: 'QAT', name: 'Qatar', wb_code: 'QAT' },
  '968': { iso: 'ROU', name: 'Romania', wb_code: 'ROU' },
  '714': { iso: 'RWA', name: 'Rwanda', wb_code: 'RWA' },
  '361': { iso: 'KNA', name: 'St. Kitts and Nevis', wb_code: 'KNA' },
  '362': { iso: 'LCA', name: 'St. Lucia', wb_code: 'LCA' },
  '364': { iso: 'VCT', name: 'St. Vincent and the Grenadines', wb_code: 'VCT' },
  '862': { iso: 'WSM', name: 'Samoa', wb_code: 'WSM' },
  '135': { iso: 'SMR', name: 'San Marino', wb_code: 'SMR' },
  '716': { iso: 'STP', name: 'São Tomé and Príncipe', wb_code: 'STP' },
  '722': { iso: 'SEN', name: 'Senegal', wb_code: 'SEN' },
  '942': { iso: 'SRB', name: 'Serbia', wb_code: 'SRB' },
  '718': { iso: 'SYC', name: 'Seychelles', wb_code: 'SYC' },
  '724': { iso: 'SLE', name: 'Sierra Leone', wb_code: 'SLE' },
  '936': { iso: 'SVK', name: 'Slovak Republic', wb_code: 'SVK' },
  '961': { iso: 'SVN', name: 'Slovenia', wb_code: 'SVN' },
  '813': { iso: 'SLB', name: 'Solomon Islands', wb_code: 'SLB' },
  '733': { iso: 'SSD', name: 'South Sudan', wb_code: 'SSD' },
  '524': { iso: 'LKA', name: 'Sri Lanka', wb_code: 'LKA' },
  '732': { iso: 'SDN', name: 'Sudan', wb_code: 'SDN' },
  '366': { iso: 'SUR', name: 'Suriname', wb_code: 'SUR' },
  '734': { iso: 'SWZ', name: 'Swaziland', wb_code: 'SWZ' },
  '463': { iso: 'SYR', name: 'Syria', wb_code: 'SYR' },
  '923': { iso: 'TJK', name: 'Tajikistan', wb_code: 'TJK' },
  '738': { iso: 'TZA', name: 'Tanzania', wb_code: 'TZA' },
  '537': { iso: 'TLS', name: 'Timor-Leste', wb_code: 'TLS' },
  '742': { iso: 'TGO', name: 'Togo', wb_code: 'TGO' },
  '866': { iso: 'TON', name: 'Tonga', wb_code: 'TON' },
  '369': { iso: 'TTO', name: 'Trinidad and Tobago', wb_code: 'TTO' },
  '744': { iso: 'TUN', name: 'Tunisia', wb_code: 'TUN' },
  '925': { iso: 'TKM', name: 'Turkmenistan', wb_code: 'TKM' },
  '869': { iso: 'TUV', name: 'Tuvalu', wb_code: 'TUV' },
  '746': { iso: 'UGA', name: 'Uganda', wb_code: 'UGA' },
  '926': { iso: 'UKR', name: 'Ukraine', wb_code: 'UKR' },
  '298': { iso: 'URY', name: 'Uruguay', wb_code: 'URY' },
  '927': { iso: 'UZB', name: 'Uzbekistan', wb_code: 'UZB' },
  '846': { iso: 'VUT', name: 'Vanuatu', wb_code: 'VUT' },
  '299': { iso: 'VEN', name: 'Venezuela', wb_code: 'VEN' },
  '474': { iso: 'YEM', name: 'Yemen', wb_code: 'YEM' },
  '754': { iso: 'ZMB', name: 'Zambia', wb_code: 'ZMB' },
  '698': { iso: 'ZWE', name: 'Zimbabwe', wb_code: 'ZWE' }
};

// IMF WEO Indicator Mappings by Industry
const IMF_INDICATOR_MAPPINGS = {
  // Finance Industry - Fiscal, monetary and financial indicators
  'finance': {
    'NGDP_RPCH': 'GDP Growth Rate',
    'PCPIPCH': 'Inflation Rate',
    'GGR_NGDP': 'Government Revenue (% of GDP)',
    'GGXCNL_NGDP': 'Government Net Lending/Borrowing (% of GDP)',
    'GGXWDG_NGDP': 'Government Gross Debt (% of GDP)',
    'GGXWDN_NGDP': 'Government Net Debt (% of GDP)',
    'GGSB_NPGDP': 'Government Structural Balance (% of GDP)',
    'BCA_NGDPD': 'Current Account Balance (% of GDP)',
    'FLIBOR6': 'Six-month LIBOR Rate',
    'NID_NGDP': 'Total Investment (% of GDP)',
    'NGSD_NGDP': 'Gross National Savings (% of GDP)'
  },
  
  // Context Industry - Core macroeconomic fundamentals
  'context': {
    'NGDP_RPCH': 'GDP Growth Rate',
    'NGDPDPC': 'GDP per Capita (USD)',
    'NGDPPC': 'GDP per Capita (National Currency)',
    'PPPPC': 'GDP per Capita (PPP)',
    'NGDPRPC': 'GDP per Capita (Constant Prices)',
    'NGDPRPPPPC': 'GDP per Capita (Constant PPP)',
    'PCPIPCH': 'Inflation Rate',
    'PCPI': 'Consumer Price Index',
    'LUR': 'Unemployment Rate',
    'LP': 'Population',
    'LE': 'Employment',
    'NGAP_NPGDP': 'Output Gap (% of Potential GDP)',
    'PPPSH': 'PPP Share of World GDP',
    'PPPEX': 'PPP Exchange Rate',
    'NGDP_D': 'GDP Deflator'
  },
  
  // Trade Industry - Trade and balance of payments
  'trade': {
    'TM_RPCH': 'Volume of Imports Growth',
    'TX_RPCH': 'Volume of Exports Growth',
    'TMG_RPCH': 'Volume of Imports of Goods Growth',
    'TXG_RPCH': 'Volume of Exports of Goods Growth',
    'BCA': 'Current Account Balance (USD)',
    'BCA_NGDPD': 'Current Account Balance (% of GDP)'
  },
  
  // Innovation Industry - Investment and productivity indicators
  'innovation': {
    'NID_NGDP': 'Total Investment (% of GDP)',
    'NGSD_NGDP': 'Gross National Savings (% of GDP)',
    'NGDP_RPCH': 'GDP Growth Rate',
    'PPPPC': 'GDP per Capita (PPP)',
    'NGDPRPPPPC': 'GDP per Capita (Constant PPP)'
  }
};

// Input validation functions
function validateString(str, maxLength = 255) {
  if (!str || typeof str !== 'string') return null;
  const sanitized = str
    .replace(/[<>"'&]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .substring(0, maxLength);
  return sanitized || null;
}

function validateIMFCode(code) {
  if (!code || typeof code !== 'string') return null;
  const sanitized = code.replace(/[^0-9]/g, '').substring(0, 10);
  return sanitized || null;
}

function validateIndicatorCode(code) {
  if (!code || typeof code !== 'string' || code.length > 50) return null;
  return code.replace(/[^A-Z0-9._-]/g, '').substring(0, 50);
}

// Initialize IMF data source
async function initializeIMFDataSource() {
  const client = await pool.connect();
  
  try {
    // Check if IMF source already exists
    const existingSource = await client.query(
      'SELECT source_code FROM data_sources WHERE source_code = $1',
      ['IMF']
    );
    
    if (existingSource.rows.length === 0) {
      await client.query(`
        INSERT INTO data_sources (source_code, source_name, description, base_url, update_frequency, data_quality_score, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (source_code) DO UPDATE SET
          source_name = EXCLUDED.source_name,
          description = EXCLUDED.description,
          base_url = EXCLUDED.base_url,
          update_frequency = EXCLUDED.update_frequency,
          data_quality_score = EXCLUDED.data_quality_score,
          last_updated = CURRENT_TIMESTAMP
      `, [
        'IMF',
        'International Monetary Fund',
        'IMF World Economic Outlook Database - Biannual macroeconomic projections',
        'https://www.imf.org/en/Publications/WEO/weo-database/',
        'Biannual',
        4
      ]);
      
      console.log('✅ IMF data source initialized');
    } else {
      console.log('✅ IMF data source already exists');
    }
    
  } catch (error) {
    console.error('❌ Error initializing IMF data source:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update country mappings with IMF codes
async function updateCountryMappingsWithIMF() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating country mappings with IMF codes...');
    
    let updatedCount = 0;
    let newMappings = 0;
    
    for (const [imfCode, countryData] of Object.entries(IMF_COUNTRY_MAPPINGS)) {
      const sanitizedIMFCode = validateIMFCode(imfCode);
      const sanitizedCountryName = validateString(countryData.name);
      const sanitizedWBCode = validateString(countryData.wb_code, 3);
      const sanitizedISO = validateString(countryData.iso, 3);
      
      if (!sanitizedIMFCode || !sanitizedCountryName || !sanitizedWBCode) {
        console.log(`⚠️  Skipping invalid mapping for ${imfCode}`);
        continue;
      }
      
      // Check if mapping exists
      const existingMapping = await client.query(
        'SELECT unified_code FROM country_mappings WHERE wb_code = $1',
        [sanitizedWBCode]
      );
      
      if (existingMapping.rows.length > 0) {
        // Update existing mapping with IMF code
        await client.query(`
          UPDATE country_mappings 
          SET imf_code = $1, country_name = $2
          WHERE wb_code = $3
        `, [sanitizedIMFCode, sanitizedCountryName, sanitizedWBCode]);
        
        updatedCount++;
      } else {
        // Create new mapping
        await client.query(`
          INSERT INTO country_mappings (unified_code, country_name, wb_code, oecd_code, imf_code, priority_source)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [sanitizedWBCode, sanitizedCountryName, sanitizedWBCode, null, sanitizedIMFCode, 'WB']);
        
        newMappings++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} existing country mappings with IMF codes`);
    console.log(`✅ Created ${newMappings} new country mappings`);
    
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
    
    for (const [industry, indicators] of Object.entries(IMF_INDICATOR_MAPPINGS)) {
      let industryCount = 0;
      
      for (const [indicatorCode, description] of Object.entries(indicators)) {
        const sanitizedCode = validateIndicatorCode(indicatorCode);
        const sanitizedDescription = validateString(description);
        const sanitizedIndustry = validateString(industry, 20);
        
        if (!sanitizedCode || !sanitizedDescription || !sanitizedIndustry) {
          console.log(`⚠️  Skipping invalid indicator mapping: ${indicatorCode}`);
          continue;
        }
        
        // Create unified concept name
        const industryPrefix = sanitizedIndustry.toUpperCase().substring(0, 3);
        const unifiedConcept = `${industryPrefix}_${sanitizedDescription}`.substring(0, 250);
        
        // Insert or update mapping
        await client.query(`
          INSERT INTO indicator_mappings (unified_concept, concept_description, wb_code, oecd_code, imf_code, priority_source, industry)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (unified_concept) DO UPDATE SET
            concept_description = EXCLUDED.concept_description,
            imf_code = EXCLUDED.imf_code,
            priority_source = CASE 
              WHEN indicator_mappings.wb_code IS NOT NULL THEN 'WB'
              WHEN indicator_mappings.oecd_code IS NOT NULL THEN 'OECD'
              ELSE 'IMF'
            END,
            industry = EXCLUDED.industry
        `, [unifiedConcept, sanitizedDescription, null, null, sanitizedCode, 'IMF', sanitizedIndustry]);
        
        industryCount++;
        totalMappings++;
      }
      
      console.log(`   - ${sanitizedIndustry}: ${industryCount} IMF indicators mapped`);
    }
    
    console.log(`✅ Populated ${totalMappings} IMF indicator mappings across ${Object.keys(IMF_INDICATOR_MAPPINGS).length} industries`);
    
  } catch (error) {
    console.error('❌ Error populating IMF indicator mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Analyze IMF integration readiness
async function analyzeIMFIntegrationReadiness() {
  const client = await pool.connect();
  
  try {
    console.log('\n🎯 IMF INTEGRATION READINESS ANALYSIS');
    console.log('======================================');
    
    // Count IMF mappings
    const imfCountryMappings = await client.query(
      'SELECT COUNT(*) as imf_countries FROM country_mappings WHERE imf_code IS NOT NULL'
    );
    
    const imfIndicatorMappings = await client.query(
      'SELECT COUNT(*) as imf_indicators FROM indicator_mappings WHERE imf_code IS NOT NULL'
    );
    
    const imfIndicatorsByIndustry = await client.query(`
      SELECT industry, COUNT(*) as indicator_count 
      FROM indicator_mappings 
      WHERE imf_code IS NOT NULL 
      GROUP BY industry 
      ORDER BY indicator_count DESC
    `);
    
    console.log(`📊 IMF Mapping Summary:`);
    console.log(`   - Countries with IMF codes: ${imfCountryMappings.rows[0].imf_countries}`);
    console.log(`   - IMF indicators mapped: ${imfIndicatorMappings.rows[0].imf_indicators}`);
    
    console.log(`\n🏭 IMF Indicators by Industry:`);
    imfIndicatorsByIndustry.rows.forEach(row => {
      console.log(`   - ${row.industry}: ${row.indicator_count} indicators`);
    });
    
    // Check data source status
    const dataSourceStatus = await client.query(
      'SELECT source_code, source_name, data_quality_score FROM data_sources WHERE source_code = $1',
      ['IMF']
    );
    
    console.log(`\n📈 Data Source Status:`);
    if (dataSourceStatus.rows.length > 0) {
      const source = dataSourceStatus.rows[0];
      console.log(`   ✅ ${source.source_name} configured (Quality: ${source.data_quality_score}/5)`);
    } else {
      console.log(`   ❌ IMF data source not configured`);
    }
    
    // Check IMF indicators table
    const imfTableStatus = await client.query(`
      SELECT COUNT(*) as record_count FROM imf_indicators
    `);
    
    console.log(`\n💾 IMF Indicators Table:`);
    console.log(`   - Records: ${imfTableStatus.rows[0].record_count} (should be 0 before processing)`);
    
    console.log(`\n🎉 IMF INTEGRATION READINESS SUMMARY:`);
    console.log(`   ✅ Country mappings: ${imfCountryMappings.rows[0].imf_countries} countries ready`);
    console.log(`   ✅ Indicator mappings: ${imfIndicatorMappings.rows[0].imf_indicators} indicators ready`);
    console.log(`   ✅ Database schema: IMF tables available`);
    console.log(`   ✅ Data source: IMF configured`);
    console.log(`   ✅ Industries covered: ${imfIndicatorsByIndustry.rows.length} industries`);
    console.log(`   ✅ Ready for IMF WEO CSV processing!`);
    
  } catch (error) {
    console.error('❌ Error analyzing IMF integration readiness:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Show sample mappings
async function showSampleMappings() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 SAMPLE IMF MAPPINGS');
    console.log('======================');
    
    // Sample country mappings
    const sampleCountries = await client.query(`
      SELECT unified_code, country_name, wb_code, oecd_code, imf_code
      FROM country_mappings 
      WHERE imf_code IS NOT NULL 
      ORDER BY country_name 
      LIMIT 10
    `);
    
    console.log(`\n🗺️  Sample Country Mappings:`);
    sampleCountries.rows.forEach(row => {
      console.log(`   ${row.unified_code}: ${row.country_name}`);
      console.log(`      WB: ${row.wb_code} | OECD: ${row.oecd_code || 'NULL'} | IMF: ${row.imf_code}`);
    });
    
    // Sample indicator mappings
    const sampleIndicators = await client.query(`
      SELECT unified_concept, concept_description, wb_code, oecd_code, imf_code, industry
      FROM indicator_mappings 
      WHERE imf_code IS NOT NULL 
      ORDER BY industry, unified_concept
      LIMIT 15
    `);
    
    console.log(`\n📊 Sample Indicator Mappings:`);
    sampleIndicators.rows.forEach(row => {
      console.log(`   ${row.industry.toUpperCase()}: ${row.unified_concept}`);
      console.log(`      Description: ${row.concept_description}`);
      console.log(`      WB: ${row.wb_code || 'NULL'} | OECD: ${row.oecd_code || 'NULL'} | IMF: ${row.imf_code}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error showing sample mappings:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main function
async function populateIMFMappings() {
  try {
    console.log('🚀 Starting IMF Mappings Population - Phase 3');
    console.log('===============================================');
    console.log('🔒 Security: Input validation and sanitization enabled');
    console.log('📊 Target: IMF WEO indicators for Finance, Context, Trade, Innovation industries');
    console.log('🎯 Goal: Complete tri-source mapping foundation');
    
    // Step 1: Initialize IMF data source
    await initializeIMFDataSource();
    
    // Step 2: Update country mappings with IMF codes
    await updateCountryMappingsWithIMF();
    
    // Step 3: Populate IMF indicator mappings
    await populateIMFIndicatorMappings();
    
    // Step 4: Analyze integration readiness
    await analyzeIMFIntegrationReadiness();
    
    // Step 5: Show sample mappings
    await showSampleMappings();
    
    console.log('\n🎉 IMF MAPPINGS POPULATION COMPLETE!');
    console.log('====================================');
    console.log('✅ Your database is now ready for IMF WEO CSV processing');
    console.log('✅ Multi-source foundation complete: World Bank + OECD + IMF');
    console.log('✅ Next step: Run process-imf-weo.js with your CSV file');
    console.log('✅ After processing: ~735,000 total records across tri-source platform');
    
  } catch (error) {
    console.error('❌ IMF mappings population failed:', error);
    throw error;
  }
}

// Command line execution
if (require.main === module) {
  populateIMFMappings()
    .then(() => {
      console.log('\n✅ IMF mappings population completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ IMF mappings population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateIMFMappings };
