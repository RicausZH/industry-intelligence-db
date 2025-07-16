-- Add missing columns to existing tables
ALTER TABLE countries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE industry_indicators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indicator metadata table
CREATE TABLE IF NOT EXISTS indicator_metadata (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    unit VARCHAR(100),
    source VARCHAR(100),
    topic VARCHAR(100),
    periodicity VARCHAR(50),
    industry VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create country-indicator availability table
CREATE TABLE IF NOT EXISTS country_indicator_availability (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3),
    indicator_code VARCHAR(50),
    last_updated VARCHAR(50),
    industry VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_country_indicator UNIQUE (country_code, indicator_code)
);

-- Add enhanced indexes
CREATE INDEX IF NOT EXISTS idx_indicator_metadata_industry ON indicator_metadata(industry);
CREATE INDEX IF NOT EXISTS idx_availability_country_industry ON country_indicator_availability(country_code, industry);
CREATE INDEX IF NOT EXISTS idx_indicator_metadata_code ON indicator_metadata(code);

-- Create enhanced views
CREATE OR REPLACE VIEW enhanced_indicator_summary AS
SELECT 
    im.code,
    im.name,
    im.description,
    im.unit,
    im.source,
    im.topic,
    im.industry,
    COUNT(DISTINCT i.country_code) as country_count,
    MIN(i.year) as earliest_year,
    MAX(i.year) as latest_year,
    COUNT(*) as total_observations,
    AVG(i.value) as avg_value,
    MIN(i.value) as min_value,
    MAX(i.value) as max_value
FROM indicator_metadata im
LEFT JOIN indicators i ON im.code = i.indicator_code
GROUP BY im.code, im.name, im.description, im.unit, im.source, im.topic, im.industry;

CREATE OR REPLACE VIEW country_data_availability AS
SELECT 
    c.code,
    c.name,
    c.region,
    c.income_group,
    COUNT(DISTINCT i.indicator_code) as indicators_available,
    COUNT(DISTINCT i.industry) as industries_covered,
    MIN(i.year) as earliest_data,
    MAX(i.year) as latest_data,
    COUNT(*) as total_data_points
FROM countries c
LEFT JOIN indicators i ON c.code = i.country_code
GROUP BY c.code, c.name, c.region, c.income_group;

-- Add update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER update_countries_updated_at 
    BEFORE UPDATE ON countries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_indicators_updated_at 
    BEFORE UPDATE ON industry_indicators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indicator_metadata_updated_at 
    BEFORE UPDATE ON indicator_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
