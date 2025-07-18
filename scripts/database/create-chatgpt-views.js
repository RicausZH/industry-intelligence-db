const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createChatGPTViews() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Creating ChatGPT-optimized database views...');
        
        // Read the SQL file
        const sqlFile = path.join(__dirname, '006_chatgpt_optimized_views.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Execute the SQL
        await client.query(sql);
        
        console.log('✅ Successfully created ChatGPT-optimized views:');
        console.log('   - chatgpt_country_profiles');
        console.log('   - chatgpt_industry_analysis');
        console.log('   - chatgpt_historical_trends');
        
        // Verify the views were created
        const result = await client.query(`
            SELECT schemaname, matviewname, hasindexes 
            FROM pg_matviews 
            WHERE matviewname LIKE 'chatgpt_%'
            ORDER BY matviewname;
        `);
        
        console.log('\n📊 View verification:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.matviewname} (indexes: ${row.hasindexes})`);
        });
        
        // Get record counts
        const counts = await Promise.all([
            client.query('SELECT COUNT(*) FROM chatgpt_country_profiles'),
            client.query('SELECT COUNT(*) FROM chatgpt_industry_analysis'),
            client.query('SELECT COUNT(*) FROM chatgpt_historical_trends')
        ]);
        
        console.log('\n📈 Record counts:');
        console.log(`   - Country profiles: ${counts[0].rows[0].count}`);
        console.log(`   - Industry analysis: ${counts[1].rows[0].count}`);
        console.log(`   - Historical trends: ${counts[2].rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error creating ChatGPT views:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the function
if (require.main === module) {
    createChatGPTViews()
        .then(() => {
            console.log('\n🎉 ChatGPT views created successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Failed to create ChatGPT views:', error);
            process.exit(1);
        });
}

module.exports = { createChatGPTViews };
