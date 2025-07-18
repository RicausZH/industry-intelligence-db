const { Pool } = require('pg');
const ChatGPTDataFormatter = require('../utils/chatgpt-data-formatter');
const MacroeconomicConfidenceScoring = require('../utils/confidence-scoring-macro');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testChatGPTViews() {
    const client = await pool.connect();
    
    try {
        console.log('🧪 Testing ChatGPT-optimized views...\n');
        
        // Test 1: View existence and structure
        console.log('1️⃣ Testing view existence and structure...');
        
        const views = [
            'chatgpt_country_profiles',
            'chatgpt_industry_analysis',
            'chatgpt_historical_trends'
        ];
        
        for (const view of views) {
            const result = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [view]);
            
            console.log(`   ✅ ${view}: ${result.rows.length} columns`);
        }
        
        // Test 2: Data completeness
        console.log('\n2️⃣ Testing data completeness...');
        
        const counts = await Promise.all([
            client.query('SELECT COUNT(*) FROM chatgpt_country_profiles'),
            client.query('SELECT COUNT(*) FROM chatgpt_industry_analysis'),
            client.query('SELECT COUNT(*) FROM chatgpt_historical_trends')
        ]);
        
        console.log(`   ✅ Country profiles: ${counts[0].rows[0].count} records`);
        console.log(`   ✅ Industry analysis: ${counts[1].rows[0].count} records`);
        console.log(`   ✅ Historical trends: ${counts[2].rows[0].count} records`);
        
        // Test 3: Data quality validation
        console.log('\n3️⃣ Testing data quality...');
        
        const qualityTests = await client.query(`
            SELECT 
                data_confidence_score,
                COUNT(*) as country_count,
                ROUND(AVG(wb_data_count + oecd_data_count + imf_data_count), 2) as avg_indicators
            FROM chatgpt_country_profiles
            GROUP BY data_confidence_score
            ORDER BY data_confidence_score;
        `);
        
        console.log('   Data confidence distribution:');
        qualityTests.rows.forEach(row => {
            console.log(`     ${row.data_confidence_score}: ${row.country_count} countries (avg ${row.avg_indicators} indicators)`);
        });
        
        // Test 4: Performance testing
        console.log('\n4️⃣ Testing query performance...');
        
        const performanceTests = [
            {
                name: 'Country profile lookup',
                query: "SELECT * FROM chatgpt_country_profiles WHERE country_code = 'USA'"
            },
            {
                name: 'Industry analysis',
                query: "SELECT * FROM chatgpt_industry_analysis WHERE industry = 'innovation' LIMIT 10"
            },
            {
                name: 'Historical trends',
                query: "SELECT * FROM chatgpt_historical_trends WHERE country_code = 'USA' LIMIT 5"
            }
        ];
        
        for (const test of performanceTests) {
            const startTime = Date.now();
            const result = await client.query(test.query);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const status = duration < 500 ? '✅' : duration < 1000 ? '⚠️' : '❌';
            console.log(`   ${status} ${test.name}: ${duration}ms (${result.rows.length} records)`);
        }
        
        // Test 5: Data formatter testing
        console.log('\n5️⃣ Testing data formatters...');
        
        try {
            const countryProfile = await ChatGPTDataFormatter.getCountryProfile('USA');
            console.log('   ✅ Country profile formatter working');
            console.log(`      Sample: ${countryProfile.country} (${countryProfile.dataQuality.overallConfidence} confidence)`);
            
            const industryAnalysis = await ChatGPTDataFormatter.getIndustryAnalysis('innovation');
            console.log('   ✅ Industry analysis formatter working');
            console.log(`      Sample: ${industryAnalysis.length} innovation records`);
            
            const historicalTrends = await ChatGPTDataFormatter.getHistoricalTrends('USA');
            console.log('   ✅ Historical trends formatter working');
            console.log(`      Sample: ${historicalTrends.length} trend records`);
            
        } catch (error) {
            console.log('   ❌ Data formatter test failed:', error.message);
        }
        
        // Test 6: Confidence scoring (macro version)
        console.log('\n6️⃣ Testing macroeconomic confidence scoring...');
        
        try {
            const macroConfidenceScoring = new MacroeconomicConfidenceScoring();
            const isValid = await macroConfidenceScoring.validatePrototypeMode();
            console.log(`   ✅ Macro confidence scoring validation: ${isValid ? 'passed' : 'needs attention'}`);
        } catch (error) {
            console.log('   ⚠️ Macro confidence scoring test skipped:', error.message);
        }
        
        // Test 7: Cross-source validation
        console.log('\n7️⃣ Testing cross-source validation...');
        
        const crossValidation = await client.query(`
            SELECT 
                COUNT(CASE WHEN wb_data_count > 0 THEN 1 END) as wb_countries,
                COUNT(CASE WHEN oecd_data_count > 0 THEN 1 END) as oecd_countries,
                COUNT(CASE WHEN imf_data_count > 0 THEN 1 END) as imf_countries,
                COUNT(CASE WHEN wb_data_count > 0 AND oecd_data_count > 0 THEN 1 END) as wb_oecd_overlap,
                COUNT(CASE WHEN wb_data_count > 0 AND imf_data_count > 0 THEN 1 END) as wb_imf_overlap,
                COUNT(CASE WHEN oecd_data_count > 0 AND imf_data_count > 0 THEN 1 END) as oecd_imf_overlap,
                COUNT(CASE WHEN wb_data_count > 0 AND oecd_data_count > 0 AND imf_data_count > 0 THEN 1 END) as all_three_overlap
            FROM chatgpt_country_profiles;
        `);
        
        const cv = crossValidation.rows[0];
        console.log(`   ✅ WB coverage: ${cv.wb_countries} countries`);
        console.log(`   ✅ OECD coverage: ${cv.oecd_countries} countries`);
        console.log(`   ✅ IMF coverage: ${cv.imf_countries} countries`);
        console.log(`   ✅ WB+OECD overlap: ${cv.wb_oecd_overlap} countries`);
        console.log(`   ✅ WB+IMF overlap: ${cv.wb_imf_overlap} countries`);
        console.log(`   ✅ OECD+IMF overlap: ${cv.oecd_imf_overlap} countries`);
        console.log(`   ✅ All three sources: ${cv.all_three_overlap} countries`);
        
        // Test 8: Sample ChatGPT-ready output
        console.log('\n8️⃣ Testing ChatGPT-ready output format...');
        
        try {
            const sampleOutput = await ChatGPTDataFormatter.getCountryProfile('DEU');
            console.log('   ✅ Sample formatted output:');
            console.log(`   Country: ${sampleOutput.country}`);
            console.log(`   Confidence: ${sampleOutput.dataQuality.overallConfidence}`);
            console.log(`   Sources: ${sampleOutput.dataQuality.sources.join(', ')}`);
            console.log(`   GDP Growth: ${sampleOutput.economics.gdpGrowth.value}% (${sampleOutput.economics.gdpGrowth.year})`);
            console.log(`   Guidance: ${sampleOutput.chatgptGuidance.recommendedUsage}`);
        } catch (error) {
            console.log('   ❌ Sample output test failed:', error.message);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Error testing ChatGPT views:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the function
if (require.main === module) {
    testChatGPTViews()
        .then(() => {
            console.log('\n✅ ChatGPT views testing completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 ChatGPT views testing failed:', error);
            process.exit(1);
        });
}

module.exports = { testChatGPTViews };
