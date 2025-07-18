const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class MacroeconomicConfidenceScoring {
    constructor() {
        this.levels = {
            "high": {
                description: "Tri-source validation (WB+OECD+IMF)",
                threshold: 3,
                color: "green",
                reliability: 95
            },
            "medium": {
                description: "Dual-source validation",
                threshold: 2,
                color: "yellow", 
                reliability: 85
            },
            "low": {
                description: "Single-source data",
                threshold: 1,
                color: "orange",
                reliability: 75
            },
            "projection": {
                description: "IMF forecast data",
                threshold: 1,
                color: "blue",
                reliability: 70
            },
            "interpolated": {
                description: "Calculated/estimated values",
                threshold: 0,
                color: "gray",
                reliability: 60
            }
        };
        
        // Publication lag expectations by source
        this.publicationLags = {
            'WB': 2,    // World Bank typically 2 years behind
            'OECD': 1,  // OECD typically 1 year behind
            'IMF': 0    // IMF includes current year forecasts
        };
    }

    calculateConfidence(dataPoint) {
        const sources = [];
        if (dataPoint.wb_value) sources.push('WB');
        if (dataPoint.oecd_value) sources.push('OECD');
        if (dataPoint.imf_value) sources.push('IMF');
        
        const sourceCount = sources.length;
        const isForecast = dataPoint.year > 2024;
        const dataAge = new Date().getFullYear() - dataPoint.year;
        
        // Base confidence from source count
        let baseConfidence = this.getBaseConfidence(sourceCount);
        
        // Adjust for forecasts
        if (isForecast) {
            baseConfidence = 'projection';
        }
        
        // Macroeconomic-appropriate age adjustment
        const ageAdjustment = this.getMacroeconomicAgeAdjustment(dataAge, sources);
        
        return {
            level: baseConfidence,
            sources: sources,
            sourceCount: sourceCount,
            reliability: Math.max(30, this.levels[baseConfidence].reliability - ageAdjustment),
            description: this.levels[baseConfidence].description,
            color: this.levels[baseConfidence].color,
            dataAge: dataAge,
            ageAdjustment: ageAdjustment,
            publicationContext: this.getPublicationContext(dataAge, sources)
        };
    }

    getBaseConfidence(sourceCount) {
        if (sourceCount >= 3) return 'high';
        if (sourceCount === 2) return 'medium';
        if (sourceCount === 1) return 'low';
        return 'interpolated';
    }

    getMacroeconomicAgeAdjustment(dataAge, sources) {
        // Find the most recent source and its expected lag
        const expectedLag = Math.min(...sources.map(s => this.publicationLags[s] || 2));
        
        // Adjust age based on expected publication lag
        const adjustedAge = dataAge - expectedLag;
        
        // No penalty if within expected publication timeframe
        if (adjustedAge <= 0) return 0;
        
        // Gradual penalties for truly old data
        if (adjustedAge <= 2) return 3;   // Minor penalty
        if (adjustedAge <= 5) return 8;   // Moderate penalty
        if (adjustedAge <= 10) return 15; // Higher penalty
        return 20; // Maximum penalty for very old data
    }

    getPublicationContext(dataAge, sources) {
        if (dataAge <= 1) return 'Current/Recent data';
        if (dataAge <= 3) return 'Standard macroeconomic reporting lag';
        if (dataAge <= 5) return 'Slightly dated but still relevant';
        if (dataAge <= 10) return 'Historical data for context';
        return 'Very historical data';
    }

    async addMacroeconomicConfidenceScoring() {
        const client = await pool.connect();
        
        try {
            console.log('🔧 Adding macroeconomic confidence scoring...');
            
            // Add confidence columns to existing tables
            await client.query(`
                ALTER TABLE indicators 
                ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20),
                ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
                ADD COLUMN IF NOT EXISTS data_sources VARCHAR(50),
                ADD COLUMN IF NOT EXISTS reliability_pct INTEGER,
                ADD COLUMN IF NOT EXISTS publication_context VARCHAR(100);
            `);
            
            await client.query(`
                ALTER TABLE oecd_indicators 
                ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20),
                ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
                ADD COLUMN IF NOT EXISTS data_sources VARCHAR(50),
                ADD COLUMN IF NOT EXISTS reliability_pct INTEGER,
                ADD COLUMN IF NOT EXISTS publication_context VARCHAR(100);
            `);
            
            await client.query(`
                ALTER TABLE imf_indicators 
                ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20),
                ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
                ADD COLUMN IF NOT EXISTS data_sources VARCHAR(50),
                ADD COLUMN IF NOT EXISTS reliability_pct INTEGER,
                ADD COLUMN IF NOT EXISTS publication_context VARCHAR(100);
            `);
            
            console.log('✅ Macroeconomic confidence columns added');
            
            // Create macroeconomic confidence scoring function
            await client.query(`
                CREATE OR REPLACE FUNCTION calculate_macro_confidence(
                    wb_val DECIMAL,
                    oecd_val DECIMAL, 
                    imf_val DECIMAL,
                    data_year INTEGER,
                    data_source VARCHAR(10)
                ) RETURNS JSON AS $$
                DECLARE
                    source_count INTEGER := 0;
                    confidence_level VARCHAR(20);
                    reliability INTEGER;
                    data_age INTEGER;
                    expected_lag INTEGER;
                    adjusted_age INTEGER;
                    age_adjustment INTEGER;
                BEGIN
                    -- Count sources
                    IF wb_val IS NOT NULL THEN source_count := source_count + 1; END IF;
                    IF oecd_val IS NOT NULL THEN source_count := source_count + 1; END IF;
                    IF imf_val IS NOT NULL THEN source_count := source_count + 1; END IF;
                    
                    -- Determine base confidence
                    IF source_count >= 3 THEN
                        confidence_level := 'high';
                        reliability := 95;
                    ELSIF source_count = 2 THEN
                        confidence_level := 'medium';
                        reliability := 85;
                    ELSIF source_count = 1 THEN
                        confidence_level := 'low';
                        reliability := 75;
                    ELSE
                        confidence_level := 'interpolated';
                        reliability := 60;
                    END IF;
                    
                    -- Handle forecast data
                    IF data_year > 2024 THEN
                        confidence_level := 'projection';
                        reliability := 70;
                    END IF;
                    
                    -- Macroeconomic age adjustment
                    data_age := EXTRACT(YEAR FROM CURRENT_DATE) - data_year;
                    
                    -- Expected publication lag by source
                    expected_lag := CASE 
                        WHEN data_source = 'WB' THEN 2
                        WHEN data_source = 'OECD' THEN 1
                        WHEN data_source = 'IMF' THEN 0
                        ELSE 2
                    END;
                    
                    -- Adjust age based on expected lag
                    adjusted_age := data_age - expected_lag;
                    
                    -- Age penalty calculation
                    IF adjusted_age <= 0 THEN
                        age_adjustment := 0;
                    ELSIF adjusted_age <= 2 THEN
                        age_adjustment := 3;
                    ELSIF adjusted_age <= 5 THEN
                        age_adjustment := 8;
                    ELSIF adjusted_age <= 10 THEN
                        age_adjustment := 15;
                    ELSE
                        age_adjustment := 20;
                    END IF;
                    
                    -- Apply age adjustment
                    reliability := GREATEST(30, reliability - age_adjustment);
                    
                    RETURN json_build_object(
                        'level', confidence_level,
                        'sources', source_count,
                        'reliability', reliability,
                        'data_age', data_age,
                        'expected_lag', expected_lag,
                        'adjusted_age', adjusted_age,
                        'age_adjustment', age_adjustment
                    );
                END;

                $$ LANGUAGE plpgsql;
            `);
            
            console.log('✅ Macroeconomic confidence function created');
            
            // Update World Bank confidence scores with macro logic
            await client.query(`
                UPDATE indicators 
                SET 
                    confidence_level = 'low',
                    confidence_score = 1,
                    data_sources = 'WB',
                    reliability_pct = CASE 
                        WHEN year >= 2022 THEN 75  -- Recent data: no penalty
                        WHEN year >= 2020 THEN 72  -- Minor penalty
                        WHEN year >= 2017 THEN 67  -- Moderate penalty
                        ELSE 60                    -- Higher penalty
                    END,
                    publication_context = CASE 
                        WHEN year >= 2022 THEN 'Standard macroeconomic reporting lag'
                        WHEN year >= 2020 THEN 'Slightly dated but still relevant'
                        WHEN year >= 2017 THEN 'Historical data for context'
                        ELSE 'Very historical data'
                    END
                WHERE confidence_level IS NULL;
            `);
            
            console.log('✅ World Bank macro confidence scores updated');
            
            // Update OECD confidence scores with macro logic
            await client.query(`
                UPDATE oecd_indicators 
                SET 
                    confidence_level = 'low',
                    confidence_score = 1,
                    data_sources = 'OECD',
                    reliability_pct = CASE 
                        WHEN CAST(time_period AS INTEGER) >= 2023 THEN 75  -- Recent data
                        WHEN CAST(time_period AS INTEGER) >= 2021 THEN 72  -- Minor penalty
                        WHEN CAST(time_period AS INTEGER) >= 2018 THEN 67  -- Moderate penalty
                        ELSE 60                                            -- Higher penalty
                    END,
                    publication_context = CASE 
                        WHEN CAST(time_period AS INTEGER) >= 2023 THEN 'Current/Recent data'
                        WHEN CAST(time_period AS INTEGER) >= 2021 THEN 'Standard macroeconomic reporting lag'
                        WHEN CAST(time_period AS INTEGER) >= 2018 THEN 'Slightly dated but still relevant'
                        ELSE 'Historical data for context'
                    END
                WHERE confidence_level IS NULL
                AND time_period ~ '^\d{4}$';
            `);
            
            console.log('✅ OECD macro confidence scores updated');
            
            // Update IMF confidence scores with macro logic
            await client.query(`
                UPDATE imf_indicators 
                SET 
                    confidence_level = CASE 
                        WHEN year > 2024 THEN 'projection'
                        ELSE 'low'
                    END,
                    confidence_score = 1,
                    data_sources = 'IMF',
                    reliability_pct = CASE 
                        WHEN year > 2024 THEN 70                         -- Forecasts
                        WHEN year >= 2023 THEN 75                        -- Recent data
                        WHEN year >= 2021 THEN 72                        -- Minor penalty
                        WHEN year >= 2018 THEN 67                        -- Moderate penalty
                        ELSE 60                                          -- Higher penalty
                    END,
                    publication_context = CASE 
                        WHEN year > 2024 THEN 'IMF forecast data'
                        WHEN year >= 2023 THEN 'Current/Recent data'
                        WHEN year >= 2021 THEN 'Standard macroeconomic reporting lag'
                        WHEN year >= 2018 THEN 'Slightly dated but still relevant'
                        ELSE 'Historical data for context'
                    END
                WHERE confidence_level IS NULL;
            `);
            
            console.log('✅ IMF macro confidence scores updated');
            
            console.log('\n🎯 MACROECONOMIC CONFIDENCE FEATURES:');
            console.log('   ✅ Publication lag awareness');
            console.log('   ✅ Source-specific aging logic');
            console.log('   ✅ Appropriate penalties for macro data');
            console.log('   ✅ Context-aware reliability scoring');
            
        } catch (error) {
            console.error('❌ Error adding macroeconomic confidence scoring:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = MacroeconomicConfidenceScoring;
