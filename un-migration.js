const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration(migrationFile) {
  const client = await pool.connect();
  
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`🔄 Running migration: ${migrationFile}`);
    console.log('📊 Adding multi-source foundation tables...');
    
    await client.query(migrationSQL);
    
    console.log(`✅ Migration completed successfully: ${migrationFile}`);
    console.log('🎉 Multi-source tables created:');
    console.log('   - oecd_indicators');
    console.log('   - imf_indicators');
    console.log('   - country_mappings');
    console.log('   - indicator_mappings');
    console.log('   - data_sources');
    
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
if (require.main === module) {
  const migrationFile = process.argv[2] || '003_multi_source_foundation.sql';
  runMigration(migrationFile)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
