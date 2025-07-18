-- ChatGPT-Optimized Database Views (SIMPLIFIED)
-- Migration: 006_chatgpt_optimized_views.sql

-- 1. Country Profile View for ChatGPT
CREATE MATERIALIZED VIEW chatgpt_country_profiles AS
SELECT 
    cm.unified_code as country_code,
    cm.country_name,
    
    -- Latest Economic Indicators (World Bank)
    latest_gdp.value as latest_gdp_growth,
    latest_gdp.year as gdp_year,
    latest_gdp_per_capita.value as gdp_per_capita,
    latest_inflation.value as inflation_rate,
    latest_unemployment.value as unemployment_rate,
    
    -- Innovation Metrics (OECD)
    latest_rd_spending.obs_value as rd_spending_pct_gdp,
    latest_rd_spending.time_period as rd_year,
    latest_patents.obs_value as patent_applications,
    latest_hightech_exports.value as hightech_exports_pct,
    
    -- Trade Indicators (World Bank)
    latest_trade_balance.value as trade_balance,
    latest_exports.value as exports_growth,
    latest_imports.value as imports_growth,
    
    -- IMF Fiscal Data
    latest_imf_debt.value as government_debt_gdp,
    latest_imf_deficit.value as fiscal_deficit_gdp,
    
    -- Data Quality Indicators
    CASE 
        WHEN (COALESCE(wb_stats.wb_data_count, 0) + COALESCE(oecd_stats.oecd_data_count, 0) + COALESCE(imf_stats.imf_data_count, 0)) >= 3 THEN 'high'
        WHEN (COALESCE(wb_stats.wb_data_count, 0) + COALESCE(oecd_stats.oecd_data_count, 0) + COALESCE(imf_stats.imf_data_count, 0)) >= 2 THEN 'medium'
        ELSE 'low'
    END as data_confidence_score,
    
    -- Source Coverage
    TRIM(LEADING ',' FROM 
        CASE WHEN COALESCE(wb_stats.wb_data_count, 0) > 0 THEN 'WB' ELSE '' END ||
        CASE WHEN COALESCE(oecd_stats.oecd_data_count, 0) > 0 THEN ',OECD' ELSE '' END ||
        CASE WHEN COALESCE(imf_stats.imf_data_count, 0) > 0 THEN ',IMF' ELSE '' END
    ) as data_sources,
    
    -- Data counts
    COALESCE(wb_stats.wb_data_count, 0) as wb_data_count,
    COALESCE(oecd_stats.oecd_data_count, 0) as oecd_data_count,
    COALESCE(imf_stats.imf_data_count, 0) as imf_data_count,
    
    -- Last Updated
    GREATEST(
        COALESCE(wb_stats.latest_wb_update, '1900-01-01'),
        COALESCE(oecd_stats.latest_oecd_update, '1900-01-01'),
        COALESCE(imf_stats.latest_imf_update, '1900-01-01')
    ) as last_data_update
    
FROM country_mappings cm

-- Latest GDP Growth Rate
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'NY.GDP.MKTP.KD.ZG' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_gdp ON cm.wb_code = latest_gdp.country_code

-- Latest GDP Per Capita
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'NY.GDP.PCAP.CD' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_gdp_per_capita ON cm.wb_code = latest_gdp_per_capita.country_code

-- Latest Inflation Rate
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'FP.CPI.TOTL.ZG' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_inflation ON cm.wb_code = latest_inflation.country_code

-- Latest Unemployment Rate
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'SL.UEM.TOTL.ZS' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_unemployment ON cm.wb_code = latest_unemployment.country_code

-- Latest R&D Spending (OECD)
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, obs_value, time_period
    FROM oecd_indicators 
    WHERE indicator_code = 'GERD_PC' 
    AND obs_value IS NOT NULL
    ORDER BY country_code, time_period DESC
) latest_rd_spending ON cm.oecd_code = latest_rd_spending.country_code

-- Latest Patent Applications (OECD)
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, obs_value, time_period
    FROM oecd_indicators 
    WHERE indicator_code = 'PAT_APP' 
    AND obs_value IS NOT NULL
    ORDER BY country_code, time_period DESC
) latest_patents ON cm.oecd_code = latest_patents.country_code

-- Latest High-tech Exports
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'TX.VAL.TECH.CD' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_hightech_exports ON cm.wb_code = latest_hightech_exports.country_code

-- Latest Trade Balance
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'NE.RSB.GNFS.CD' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_trade_balance ON cm.wb_code = latest_trade_balance.country_code

-- Latest Exports Growth
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'NE.EXP.GNFS.KD.ZG' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_exports ON cm.wb_code = latest_exports.country_code

-- Latest Imports Growth
LEFT JOIN (
    SELECT DISTINCT ON (country_code) 
        country_code, value, year
    FROM indicators 
    WHERE indicator_code = 'NE.IMP.GNFS.KD.ZG' 
    AND value IS NOT NULL
    ORDER BY country_code, year DESC
) latest_imports ON cm.wb_code = latest_imports.country_code

-- Latest IMF Government Debt
LEFT JOIN (
    SELECT DISTINCT ON (weo_country_code) 
        weo_country_code, value, year
    FROM imf_indicators 
    WHERE subject_code = 'GGXWDG_NGDP' 
    AND value IS NOT NULL
    ORDER BY weo_country_code, year DESC
) latest_imf_debt ON cm.imf_code = latest_imf_debt.weo_country_code

-- Latest IMF Fiscal Deficit
LEFT JOIN (
    SELECT DISTINCT ON (weo_country_code) 
        weo_country_code, value, year
    FROM imf_indicators 
    WHERE subject_code = 'GGXCNL_NGDP' 
    AND value IS NOT NULL
    ORDER BY weo_country_code, year DESC
) latest_imf_deficit ON cm.imf_code = latest_imf_deficit.weo_country_code

-- Data source counts
LEFT JOIN (
    SELECT 
        cm.unified_code,
        COUNT(CASE WHEN i.value IS NOT NULL THEN 1 END) as wb_data_count,
        MAX(i.created_at) as latest_wb_update
    FROM country_mappings cm
    LEFT JOIN indicators i ON cm.wb_code = i.country_code
    WHERE i.year >= 2020
    GROUP BY cm.unified_code
) wb_stats ON cm.unified_code = wb_stats.unified_code

LEFT JOIN (
    SELECT 
        cm.unified_code,
        COUNT(CASE WHEN o.obs_value IS NOT NULL THEN 1 END) as oecd_data_count,
        MAX(o.created_at) as latest_oecd_update
    FROM country_mappings cm
    LEFT JOIN oecd_indicators o ON cm.oecd_code = o.country_code
    WHERE o.time_period ~ '^\d{4}$' AND CAST(o.time_period AS INTEGER) >= 2020
    GROUP BY cm.unified_code
) oecd_stats ON cm.unified_code = oecd_stats.unified_code

LEFT JOIN (
    SELECT 
        cm.unified_code,
        COUNT(CASE WHEN imf.value IS NOT NULL THEN 1 END) as imf_data_count,
        MAX(imf.created_at) as latest_imf_update
    FROM country_mappings cm
    LEFT JOIN imf_indicators imf ON cm.imf_code = imf.weo_country_code
    WHERE imf.year >= 2020
    GROUP BY cm.unified_code
) imf_stats ON cm.unified_code = imf_stats.unified_code

ORDER BY cm.country_name;

-- 2. Industry Analysis View for ChatGPT (SIMPLIFIED)
CREATE MATERIALIZED VIEW chatgpt_industry_analysis AS
SELECT 
    i.industry,
    i.country_code,
    i.country_name,
    
    -- Basic Industry Metrics
    COUNT(DISTINCT i.indicator_code) as industry_indicator_count,
    COUNT(CASE WHEN i.value IS NOT NULL THEN 1 END) as non_null_values,
    MAX(i.year) as industry_latest_year,
    MIN(i.year) as industry_earliest_year,
    
    -- Key Indicators (simple approach)
    MAX(CASE WHEN i.year = (SELECT MAX(year) FROM indicators i2 WHERE i2.industry = i.industry AND i2.country_code = i.country_code) THEN i.indicator_name END) as latest_indicator_name,
    MAX(CASE WHEN i.year = (SELECT MAX(year) FROM indicators i2 WHERE i2.industry = i.industry AND i2.country_code = i.country_code) THEN i.value END) as latest_indicator_value,
    MAX(CASE WHEN i.year = (SELECT MAX(year) FROM indicators i2 WHERE i2.industry = i.industry AND i2.country_code = i.country_code) THEN i.year END) as latest_indicator_year,
    
    -- Simple Rankings
    RANK() OVER (PARTITION BY i.industry ORDER BY COUNT(i.value) DESC) as data_richness_rank,
    
    -- Data Quality
    CASE 
        WHEN COUNT(DISTINCT i.source) >= 2 THEN 'high'
        WHEN COUNT(DISTINCT i.source) = 1 THEN 'medium'
        ELSE 'low'
    END as industry_confidence_score,
    
    COUNT(DISTINCT i.source) as data_sources_count,
    MAX(i.created_at) as last_updated
    
FROM indicators i
WHERE i.industry IS NOT NULL
AND i.value IS NOT NULL
GROUP BY i.industry, i.country_code, i.country_name
ORDER BY i.industry, data_richness_rank;

-- 3. Historical Trends View for ChatGPT (SIMPLIFIED)
CREATE MATERIALIZED VIEW chatgpt_historical_trends AS
SELECT 
    country_code,
    country_name,
    indicator_code,
    indicator_name,
    industry,
    
    -- Time Series Data
    array_agg(year ORDER BY year) as years,
    array_agg(value ORDER BY year) as values,
    
    -- Simple Trend Analysis
    CASE 
        WHEN COUNT(*) >= 5 THEN
            CASE 
                WHEN (array_agg(value ORDER BY year DESC))[1] > (array_agg(value ORDER BY year DESC))[5]
                THEN 'positive'
                ELSE 'negative'
            END
        ELSE 'insufficient_data'
    END as trend_direction,
    
    -- Basic Statistics
    MIN(value) as min_value,
    MAX(value) as max_value,
    AVG(value) as avg_value,
    
    -- Data Quality
    COUNT(*) as total_records,
    COUNT(DISTINCT source) as source_count,
    
    -- Latest values
    MAX(year) as latest_year,
    MIN(year) as earliest_year,
    
    -- Data sources
    array_agg(DISTINCT source) as data_sources,
    
    -- Simple confidence
    CASE 
        WHEN COUNT(DISTINCT source) >= 2 THEN 'high'
        WHEN COUNT(DISTINCT source) = 1 THEN 'medium'
        ELSE 'low'
    END as trend_confidence_score
    
FROM (
    SELECT country_code, country_name, indicator_code, indicator_name, 
           year, value, industry, source
    FROM indicators
    WHERE value IS NOT NULL
    
    UNION ALL
    
    SELECT country_code, 'Country Name', indicator_code, 'OECD Indicator',
           CAST(time_period AS INTEGER), obs_value, industry, source
    FROM oecd_indicators
    WHERE obs_value IS NOT NULL
    AND time_period ~ '^\d{4}$'
    
    UNION ALL
    
    SELECT 
        cm.unified_code as country_code,
        cm.country_name,
        subject_code as indicator_code,
        'IMF Indicator',
        year,
        value,
        industry,
        source
    FROM imf_indicators i
    JOIN country_mappings cm ON i.weo_country_code = cm.imf_code
    WHERE value IS NOT NULL
) unified_data
GROUP BY country_code, country_name, indicator_code, indicator_name, industry
HAVING COUNT(*) >= 3
ORDER BY country_code, indicator_code;

-- Create indexes for performance
CREATE INDEX idx_chatgpt_country_profiles_code ON chatgpt_country_profiles(country_code);
CREATE INDEX idx_chatgpt_country_profiles_confidence ON chatgpt_country_profiles(data_confidence_score);

CREATE INDEX idx_chatgpt_industry_analysis_industry ON chatgpt_industry_analysis(industry);
CREATE INDEX idx_chatgpt_industry_analysis_country ON chatgpt_industry_analysis(country_code);
CREATE INDEX idx_chatgpt_industry_analysis_rank ON chatgpt_industry_analysis(data_richness_rank);

CREATE INDEX idx_chatgpt_historical_trends_country ON chatgpt_historical_trends(country_code);
CREATE INDEX idx_chatgpt_historical_trends_indicator ON chatgpt_historical_trends(indicator_code);
CREATE INDEX idx_chatgpt_historical_trends_industry ON chatgpt_historical_trends(industry);
