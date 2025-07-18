DATABASE SCHEMA DOCUMENTATION
Tri-Source Economic Intelligence Platform
Database Overview
Platform: PostgreSQL 13+ on Railway

Total Records: 780,525+

Data Sources: World Bank, OECD, IMF

Countries: 267

Industries: 12

Time Range: 1980-2030

Last Updated: July 2025

1. Core Data Tables
1.1 World Bank Data Table
Table: indicators
Primary data table containing World Bank World Development Indicators. This is the foundational table with 515,565 records.

Column Name	Data Type	Constraints	Description
id	SERIAL	PRIMARY KEY	Auto-incrementing unique identifier
country_code	VARCHAR(3)	NOT NULL	ISO 3-letter country code
country_name	VARCHAR(100)	NOT NULL	Full country name
indicator_code	VARCHAR(50)	NOT NULL	World Bank indicator code
indicator_name	VARCHAR(255)	NOT NULL	Human-readable indicator name
year	INTEGER	NOT NULL	Data year (1980-2030)
value	DECIMAL(15,4)	NULL	Indicator value (nullable for missing data)
industry	VARCHAR(20)	NULL	Industry classification
source	VARCHAR(10)	DEFAULT 'WB'	Data source identifier
data_quality_score	INTEGER	DEFAULT 5	Quality score (1-5, 5 being highest)
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
1.2 OECD Data Table
Table: oecd_indicators
OECD Main Science and Technology Indicators data. Contains 138,086 records focused on innovation and development metrics.

Column Name	Data Type	Constraints	Description
id	SERIAL	PRIMARY KEY	Auto-incrementing unique identifier
dataflow	VARCHAR(50)	NULL	OECD dataflow identifier
country_code	VARCHAR(3)	NOT NULL	ISO 3-letter country code
indicator_code	VARCHAR(50)	NOT NULL	OECD indicator code
time_period	VARCHAR(20)	NOT NULL	Time period (year or quarter)
obs_value	DECIMAL(15,4)	NULL	Observed value
industry	VARCHAR(20)	NULL	Industry classification
source	VARCHAR(10)	DEFAULT 'OECD'	Data source identifier
data_quality_score	INTEGER	DEFAULT 4	Quality score (1-5)
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
1.3 IMF Data Table
Table: imf_indicators
IMF World Economic Outlook data. Contains 126,874 records with macro-financial and fiscal indicators.

Column Name	Data Type	Constraints	Description
id	SERIAL	PRIMARY KEY	Auto-incrementing unique identifier
weo_country_code	VARCHAR(10)	NOT NULL	IMF WEO country code
subject_code	VARCHAR(20)	NOT NULL	IMF subject/indicator code
year	INTEGER	NOT NULL	Data year
value	DECIMAL(15,4)	NULL	Indicator value
units	VARCHAR(50)	NULL	Measurement units
industry	VARCHAR(20)	NULL	Industry classification
source	VARCHAR(10)	DEFAULT 'IMF'	Data source identifier
data_quality_score	INTEGER	DEFAULT 4	Quality score (1-5)
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
2. Mapping Tables
2.1 Country Mappings
Table: country_mappings
Unified country code mappings across all three data sources. Essential for cross-source analysis.

Column Name	Data Type	Constraints	Description
unified_code	VARCHAR(3)	PRIMARY KEY	Unified country code (ISO 3-letter)
country_name	VARCHAR(100)	NOT NULL	Standard country name
wb_code	VARCHAR(3)	NULL	World Bank country code
oecd_code	VARCHAR(3)	NULL	OECD country code
imf_code	VARCHAR(10)	NULL	IMF country code
priority_source	VARCHAR(10)	DEFAULT 'WB'	Preferred data source for this country
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
2.2 Indicator Mappings
Table: indicator_mappings
Cross-source indicator mappings enabling unified analysis across World Bank, OECD, and IMF data.

Column Name	Data Type	Constraints	Description
unified_concept	VARCHAR(255)	PRIMARY KEY	Unified concept identifier
concept_description	TEXT	NULL	Detailed description of the concept
wb_code	VARCHAR(50)	NULL	World Bank indicator code
oecd_code	VARCHAR(50)	NULL	OECD indicator code
imf_code	VARCHAR(50)	NULL	IMF indicator code
priority_source	VARCHAR(10)	DEFAULT 'WB'	Preferred data source for this indicator
industry	VARCHAR(20)	NULL	Industry classification
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
3. Metadata Tables
3.1 Data Sources
Table: data_sources
Metadata about each data source including quality ratings and update frequencies.

Column Name	Data Type	Constraints	Description
source_code	VARCHAR(10)	PRIMARY KEY	Source identifier (WB, OECD, IMF)
source_name	VARCHAR(100)	NOT NULL	Full source name
description	TEXT	NULL	Source description
base_url	VARCHAR(200)	NULL	Base URL for data access
update_frequency	VARCHAR(50)	NULL	How often data is updated
data_quality_score	INTEGER	DEFAULT 5	Overall quality score (1-5)
last_updated	TIMESTAMP	NULL	Last data update timestamp
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
3.2 Countries
Table: countries
Comprehensive country metadata including regional classifications and development status.

Column Name	Data Type	Constraints	Description
country_code	VARCHAR(3)	PRIMARY KEY	ISO 3-letter country code
country_name	VARCHAR(100)	NOT NULL	Official country name
region	VARCHAR(50)	NULL	Geographic region
income_group	VARCHAR(30)	NULL	World Bank income classification
development_status	VARCHAR(30)	NULL	Development status classification
iso_numeric	VARCHAR(3)	NULL	ISO numeric country code
iso_alpha_2	VARCHAR(2)	NULL	ISO 2-letter country code
capital_city	VARCHAR(100)	NULL	Capital city name
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
3.3 Indicator Metadata
Table: indicator_metadata
Detailed metadata for World Bank indicators including units, methodologies, and data sources.

Column Name	Data Type	Constraints	Description
code	VARCHAR(50)	PRIMARY KEY	Indicator code
name	VARCHAR(255)	NOT NULL	Indicator name
description	TEXT	NULL	Detailed description
unit	VARCHAR(50)	NULL	Unit of measurement
source_note	TEXT	NULL	Source methodology notes
source_organization	TEXT	NULL	Source organization
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
4. Supporting Tables
4.1 Country Indicator Availability
Table: country_indicator_availability
Tracks data availability by country and indicator for completeness analysis.

Column Name	Data Type	Constraints	Description
id	SERIAL	PRIMARY KEY	Auto-incrementing identifier
country_code	VARCHAR(3)	NOT NULL	Country code
indicator_code	VARCHAR(50)	NOT NULL	Indicator code
first_year	INTEGER	NULL	First year with data
last_year	INTEGER	NULL	Last year with data
total_years	INTEGER	NULL	Total years with data
completeness_score	DECIMAL(5,2)	NULL	Completeness percentage
created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Record creation timestamp
5. Views and Materialized Views
5.1 Latest Indicators View
View: latest_indicators
Provides the most recent data point for each country-indicator combination across all sources.

CREATE VIEW latest_indicators AS
SELECT DISTINCT ON (country_code, indicator_code)
    country_code,
    indicator_code,
    indicator_name,
    year,
    value,
    industry,
    source,
    data_quality_score
FROM (
    SELECT country_code, indicator_code, indicator_name, year, value, industry, source, data_quality_score
    FROM indicators
    WHERE value IS NOT NULL
    UNION ALL
    SELECT country_code, indicator_code, 'OECD Indicator', CAST(time_period AS INTEGER), obs_value, industry, source, data_quality_score
    FROM oecd_indicators
    WHERE obs_value IS NOT NULL
    UNION ALL
    SELECT 
        cm.unified_code as country_code,
        subject_code as indicator_code,
        'IMF Indicator',
        year,
        value,
        industry,
        source,
        data_quality_score
    FROM imf_indicators i
    JOIN country_mappings cm ON i.weo_country_code = cm.imf_code
    WHERE value IS NOT NULL
) combined_data
ORDER BY country_code, indicator_code, year DESC;
5.2 Industry Summary View
View: industry_summary
Aggregated statistics by industry across all data sources.

CREATE VIEW industry_summary AS
SELECT 
    industry,
    COUNT(*) as total_records,
    COUNT(DISTINCT country_code) as country_count,
    COUNT(DISTINCT indicator_code) as indicator_count,
    MIN(year) as earliest_year,
    MAX(year) as latest_year,
    AVG(value) as avg_value,
    COUNT(CASE WHEN source = 'WB' THEN 1 END) as wb_records,
    COUNT(CASE WHEN source = 'OECD' THEN 1 END) as oecd_records,
    COUNT(CASE WHEN source = 'IMF' THEN 1 END) as imf_records
FROM (
    SELECT country_code, indicator_code, year, value, industry, source
    FROM indicators
    WHERE industry IS NOT NULL
    UNION ALL
    SELECT country_code, indicator_code, CAST(time_period AS INTEGER), obs_value, industry, source
    FROM oecd_indicators
    WHERE industry IS NOT NULL
    UNION ALL
    SELECT 
        cm.unified_code as country_code,
        subject_code as indicator_code,
        year,
        value,
        industry,
        source
    FROM imf_indicators i
    JOIN country_mappings cm ON i.weo_country_code = cm.imf_code
    WHERE industry IS NOT NULL
) combined_data
GROUP BY industry
ORDER BY total_records DESC;
5.3 Enhanced Indicator Summary View
View: enhanced_indicator_summary
Comprehensive indicator information with cross-source metadata.

CREATE VIEW enhanced_indicator_summary AS
SELECT 
    im.unified_concept,
    im.concept_description,
    im.industry,
    im.priority_source,
    im.wb_code,
    im.oecd_code,
    im.imf_code,
    imd.name as wb_name,
    imd.description as wb_description,
    imd.unit as wb_unit,
    imd.source_organization as wb_source_org,
    COUNT(*) as total_mappings,
    COUNT(CASE WHEN im.wb_code IS NOT NULL THEN 1 END) as wb_available,
    COUNT(CASE WHEN im.oecd_code IS NOT NULL THEN 1 END) as oecd_available,
    COUNT(CASE WHEN im.imf_code IS NOT NULL THEN 1 END) as imf_available
FROM indicator_mappings im
LEFT JOIN indicator_metadata imd ON im.wb_code = imd.code
GROUP BY im.unified_concept, im.concept_description, im.industry, im.priority_source,
         im.wb_code, im.oecd_code, im.imf_code, imd.name, imd.description, imd.unit, imd.source_organization
ORDER BY im.industry, im.unified_concept;
6. Indexes
6.1 Core Table Indexes
World Bank Indicators Table
-- Primary performance indexes
CREATE INDEX idx_indicators_country_year ON indicators(country_code, year);
CREATE INDEX idx_indicators_indicator_year ON indicators(indicator_code, year);
CREATE INDEX idx_indicators_industry_year ON indicators(industry, year);
CREATE INDEX idx_indicators_source_year ON indicators(source, year);
CREATE INDEX idx_indicators_value_not_null ON indicators(value) WHERE value IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_indicators_country_indicator_year ON indicators(country_code, indicator_code, year);
CREATE INDEX idx_indicators_industry_country_year ON indicators(industry, country_code, year);
CREATE INDEX idx_indicators_source_industry_year ON indicators(source, industry, year);
OECD Indicators Table
-- Primary performance indexes
CREATE INDEX idx_oecd_country_indicator ON oecd_indicators(country_code, indicator_code);
CREATE INDEX idx_oecd_time_period ON oecd_indicators(time_period);
CREATE INDEX idx_oecd_industry_time ON oecd_indicators(industry, time_period);
CREATE INDEX idx_oecd_source_time ON oecd_indicators(source, time_period);

-- Composite indexes
CREATE INDEX idx_oecd_country_indicator_time ON oecd_indicators(country_code, indicator_code, time_period);
CREATE INDEX idx_oecd_industry_country_time ON oecd_indicators(industry, country_code, time_period);
IMF Indicators Table
-- Primary performance indexes
CREATE INDEX idx_imf_country_indicator ON imf_indicators(weo_country_code, subject_code);
CREATE INDEX idx_imf_year ON imf_indicators(year);
CREATE INDEX idx_imf_industry_year ON imf_indicators(industry, year);
CREATE INDEX idx_imf_source_year ON imf_indicators(source, year);

-- Composite indexes
CREATE INDEX idx_imf_country_indicator_year ON imf_indicators(weo_country_code, subject_code, year);
CREATE INDEX idx_imf_industry_country_year ON imf_indicators(industry, weo_country_code, year);
6.2 Mapping Table Indexes
-- Country mappings
CREATE INDEX idx_country_mappings_wb ON country_mappings(wb_code);
CREATE INDEX idx_country_mappings_oecd ON country_mappings(oecd_code);
CREATE INDEX idx_country_mappings_imf ON country_mappings(imf_code);

-- Indicator mappings
CREATE INDEX idx_indicator_mappings_wb ON indicator_mappings(wb_code);
CREATE INDEX idx_indicator_mappings_oecd ON indicator_mappings(oecd_code);
CREATE INDEX idx_indicator_mappings_imf ON indicator_mappings(imf_code);
CREATE INDEX idx_indicator_mappings_industry ON indicator_mappings(industry);
CREATE INDEX idx_indicator_mappings_priority ON indicator_mappings(priority_source);
7. Relationships and Constraints
7.1 Foreign Key Relationships
Note: The current schema uses a flexible approach with logical relationships rather than enforced foreign keys to accommodate data quality issues and missing references across sources.
Logical Relationships
indicators.country_code → countries.country_code (logical reference)
indicators.indicator_code → indicator_metadata.code (logical reference)
oecd_indicators.country_code → country_mappings.oecd_code (logical reference)
imf_indicators.weo_country_code → country_mappings.imf_code (logical reference)
indicator_mappings.wb_code → indicator_metadata.code (logical reference)
7.2 Data Integrity Constraints
Check Constraints
-- Year range constraints
ALTER TABLE indicators ADD CONSTRAINT chk_indicators_year 
    CHECK (year >= 1960 AND year <= 2035);

ALTER TABLE oecd_indicators ADD CONSTRAINT chk_oecd_time_period 
    CHECK (time_period ~ '^\d{4}$');

ALTER TABLE imf_indicators ADD CONSTRAINT chk_imf_year 
    CHECK (year >= 1980 AND year <= 2030);

-- Quality score constraints
ALTER TABLE indicators ADD CONSTRAINT chk_indicators_quality 
    CHECK (data_quality_score >= 1 AND data_quality_score <= 5);

ALTER TABLE oecd_indicators ADD CONSTRAINT chk_oecd_quality 
    CHECK (data_quality_score >= 1 AND data_quality_score <= 5);

ALTER TABLE imf_indicators ADD CONSTRAINT chk_imf_quality 
    CHECK (data_quality_score >= 1 AND data_quality_score <= 5);

-- Source constraints
ALTER TABLE indicators ADD CONSTRAINT chk_indicators_source 
    CHECK (source IN ('WB', 'OECD', 'IMF'));

ALTER TABLE oecd_indicators ADD CONSTRAINT chk_oecd_source 
    CHECK (source IN ('OECD'));

ALTER TABLE imf_indicators ADD CONSTRAINT chk_imf_source 
    CHECK (source IN ('IMF'));
8. Data Types and Validation
8.1 Numeric Data Handling
Precision: All numeric values use DECIMAL(15,4) to maintain precision for both large values (trillions) and small percentages (basis points).
Value Ranges by Data Type
Data Type	Range	Precision	Use Case
DECIMAL(15,4)	±99,999,999,999.9999	4 decimal places	All indicator values
INTEGER	±2,147,483,647	Whole numbers	Years, counts, scores
SERIAL	1 to 2,147,483,647	Auto-increment	Primary keys
8.2 String Data Handling
Field Type	Length	Validation	Example
Country Code	VARCHAR(3)	ISO 3-letter standard	USA, DEU, JPN
Indicator Code	VARCHAR(50)	Source-specific format	NY.GDP.MKTP.CD
Country Name	VARCHAR(100)	Unicode support	United States
Indicator Name	VARCHAR(255)	Full descriptive name	GDP (current US$)
Industry	VARCHAR(20)	Controlled vocabulary	finance, innovation
Description	TEXT	Unlimited length	Detailed methodology
9. Performance Considerations
9.1 Query Optimization
Performance Target: All queries should complete within 500ms for interactive use and 5 seconds for complex analytical queries.
Common Query Patterns
Time series by country: Heavily indexed on (country_code, year)
Cross-country comparison: Optimized with (indicator_code, year) indexes
Industry analysis: Indexed on (industry, year) combinations
Latest data queries: Materialized view for best performance
9.2 Storage Optimization
Table	Records	Estimated Size	Growth Rate
indicators	515,565	~45 MB	~20K/year
oecd_indicators	138,086	~12 MB	~10K/quarter
imf_indicators	126,874	~11 MB	~5K/biannual
Indexes	-	~25 MB	Proportional
Total	780,525	~95 MB	Growing
10. Backup and Recovery
10.1 Backup Strategy
Critical: Regular backups are essential due to the complex multi-source nature of the data and the effort required to reconstruct the database.
Backup Schedule
Full Backup: Daily at 02:00 UTC
Incremental Backup: Every 6 hours
Transaction Log Backup: Every 15 minutes
Cross-region Backup: Weekly
10.2 Recovery Procedures
-- Point-in-time recovery example
pg_restore --host=localhost --port=5432 --username=postgres --dbname=industry_intelligence 
           --verbose --clean --no-owner --no-privileges backup_file.dump

-- Verify data integrity after recovery
SELECT COUNT(*) FROM indicators;
SELECT COUNT(*) FROM oecd_indicators;
SELECT COUNT(*) FROM imf_indicators;
SELECT COUNT(*) FROM country_mappings;
SELECT COUNT(*) FROM indicator_mappings;
11. Maintenance Procedures
11.1 Regular Maintenance Tasks
Daily Tasks
Monitor query performance
Check backup completion
Review error logs
Validate data quality scores
Weekly Tasks
Update table statistics
Reindex fragmented indexes
Clean up old log files
Review storage usage
Monthly Tasks
Comprehensive data quality analysis
Cross-source validation checks
Performance optimization review
Update documentation
11.2 Maintenance Scripts
-- Update table statistics
ANALYZE indicators;
ANALYZE oecd_indicators;
ANALYZE imf_indicators;
ANALYZE country_mappings;
ANALYZE indicator_mappings;

-- Reindex for performance
REINDEX TABLE indicators;
REINDEX TABLE oecd_indicators;
REINDEX TABLE imf_indicators;

-- Vacuum for space reclamation
VACUUM ANALYZE indicators;
VACUUM ANALYZE oecd_indicators;
VACUUM ANALYZE imf_indicators;
Document Version: 1.0
Last Updated: July 2025
Maintainer: Industry Intelligence Database Team
