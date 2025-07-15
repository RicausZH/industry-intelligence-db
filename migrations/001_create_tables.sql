-- Main indicators table - stores all economic indicators
CREATE TABLE IF NOT EXISTS indicators (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    indicator_code VARCHAR(50) NOT NULL,
    indicator_name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    value DECIMAL(15,4),
    unit VARCHAR(50),
    source VARCHAR(10) NOT NULL,
    industry VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_observation UNIQUE (country_code, indicator_code, year, source)
);

-- Industry mapping table
CREATE TABLE IF NOT EXISTS industry_indicators (
    id SERIAL PRIMARY KEY,
    industry VARCHAR(20) NOT NULL,
    indicator_code VARCHAR(50) NOT NULL,
    indicator_name VARCHAR(255) NOT NULL,
    source VARCHAR(10) NOT NULL,
    priority INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Country metadata table
CREATE TABLE IF NOT EXISTS countries (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(50),
    income_group VARCHAR(50),
    wb_name VARCHAR(100),
    oecd_member BOOLEAN DEFAULT FALSE,
    imf_member BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_country_indicator ON indicators(country_code, indicator_code);
CREATE INDEX IF NOT EXISTS idx_industry_year ON indicators(industry, year);
CREATE INDEX IF NOT EXISTS idx_source_indicator ON indicators(source, indicator_code);
CREATE INDEX IF NOT EXISTS idx_year_value ON indicators(year, value);

-- Views for common queries
CREATE OR REPLACE VIEW latest_indicators AS
SELECT DISTINCT ON (country_code, indicator_code, source) 
    country_code, country_name, indicator_code, indicator_name, 
    year, value, unit, source, industry
FROM indicators 
ORDER BY country_code, indicator_code, source, year DESC;

CREATE OR REPLACE VIEW industry_summary AS
SELECT 
    industry,
    COUNT(DISTINCT indicator_code) as indicator_count,
    COUNT(DISTINCT country_code) as country_count,
    MIN(year) as earliest_year,
    MAX(year) as latest_year,
    COUNT(*) as total_observations
FROM indicators 
WHERE industry IS NOT NULL
GROUP BY industry;
