-- Fix indicator mappings table to handle shared indicators across industries

-- Drop the existing table
DROP TABLE IF EXISTS indicator_mappings CASCADE;

-- Recreate with composite primary key
CREATE TABLE indicator_mappings (
    id SERIAL PRIMARY KEY,
    unified_concept VARCHAR(100) NOT NULL,
    concept_description TEXT,
    wb_code VARCHAR(50),
    oecd_code VARCHAR(50),
    imf_code VARCHAR(50),
    priority_source VARCHAR(10) DEFAULT 'WB',
    industry VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint on wb_code + industry combination
    CONSTRAINT unique_wb_industry UNIQUE (wb_code, industry)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_indicator_mappings_wb_industry ON indicator_mappings(wb_code, industry);
CREATE INDEX IF NOT EXISTS idx_indicator_mappings_unified ON indicator_mappings(unified_concept);
CREATE INDEX IF NOT EXISTS idx_indicator_mappings_industry ON indicator_mappings(industry);

SELECT 'Fixed indicator mappings table structure!' as status;
