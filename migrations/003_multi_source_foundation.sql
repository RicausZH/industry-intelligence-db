-- Multi-source foundation tables (safe to add alongside existing tables)

-- OECD source table
CREATE TABLE IF NOT EXISTS oecd_indicators (
    id SERIAL PRIMARY KEY,
    dataflow VARCHAR(50),
    country_code VARCHAR(3),
    indicator_code VARCHAR(50),
    time_period VARCHAR(20),
    obs_value DECIMAL(15,4),
    industry VARCHAR(20),
    source VARCHAR(10) DEFAULT 'OECD',
    data_quality_score INTEGER DEFAULT 4,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IMF source table
CREATE TABLE IF NOT EXISTS imf_indicators (
    id SERIAL PRIMARY KEY,
    weo_country_code VARCHAR(10),
    subject_code VARCHAR(20),
    year INTEGER,
    value DECIMAL(15,4),
    units VARCHAR(50),
    industry VARCHAR(20),
    source VARCHAR(10) DEFAULT 'IMF',
    data_quality_score INTEGER DEFAULT 4,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Country mappings (translation between sources)
CREATE TABLE IF NOT EXISTS country_mappings (
    unified_code VARCHAR(3) PRIMARY KEY,
    country_name VARCHAR(100),
    wb_code VARCHAR(3),
    oecd_code VARCHAR(3),
    imf_code VARCHAR(10),
    priority_source VARCHAR(10) DEFAULT 'WB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indicator mappings (translation between sources)
CREATE TABLE IF NOT EXISTS indicator_mappings (
    unified_concept VARCHAR(100) PRIMARY KEY,
    concept_description TEXT,
    wb_code VARCHAR(50),
    oecd_code VARCHAR(50),
    imf_code VARCHAR(50),
    priority_source VARCHAR(10) DEFAULT 'WB',
    industry VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data source metadata
CREATE TABLE IF NOT EXISTS data_sources (
    source_code VARCHAR(10) PRIMARY KEY,
    source_name VARCHAR(100),
    description TEXT,
    base_url VARCHAR(200),
    update_frequency VARCHAR(50),
    data_quality_score INTEGER DEFAULT 5,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oecd_country_indicator ON oecd_indicators(country_code, indicator_code);
CREATE INDEX IF NOT EXISTS idx_imf_country_indicator ON imf_indicators(weo_country_code, subject_code);
CREATE INDEX IF NOT EXISTS idx_country_mappings_wb ON country_mappings(wb_code);
CREATE INDEX IF NOT EXISTS idx_indicator_mappings_wb ON indicator_mappings(wb_code);
CREATE INDEX IF NOT EXISTS idx_indicator_mappings_industry ON indicator_mappings(industry);
