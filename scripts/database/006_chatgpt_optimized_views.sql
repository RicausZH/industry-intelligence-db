-- 2. Industry Analysis View for ChatGPT (FIXED)
CREATE MATERIALIZED VIEW chatgpt_industry_analysis AS
SELECT 
    industry,
    country_code,
    country_name,
    
    -- Industry Performance Metrics
    industry_indicator_count,
    industry_completeness_score,
    industry_latest_year,
    
    -- Key Industry Indicators
    key_indicator_1_name,
    key_indicator_1_value,
    key_indicator_1_year,
    key_indicator_2_name,
    key_indicator_2_value,
    key_indicator_2_year,
    key_indicator_3_name,
    key_indicator_3_value,
    key_indicator_3_year,
    
    -- Benchmarking
    global_rank_in_industry,
    regional_rank_in_industry,
    percentile_score,
    
    -- Trend Analysis
    five_year_trend,
    ten_year_trend,
    
    -- Confidence Scoring (FIXED)
    industry_confidence_score,
    data_sources_count,
    
    -- Metadata
    last_updated
    
FROM (
    SELECT 
        i.industry,
        i.country_code,
        i.country_name,
        
        -- Count indicators per industry
        COUNT(DISTINCT i.indicator_code) as industry_indicator_count,
        
        -- Calculate completeness
        ROUND(
            (COUNT(CASE WHEN i.value IS NOT NULL THEN 1 END) * 100.0 / 
             COUNT(*)), 2
        ) as industry_completeness_score,
        
        -- Latest year with data
        MAX(i.year) as industry_latest_year,
        
        -- Top 3 indicators by recency and importance
        (array_agg(
            i.indicator_name 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[1] as key_indicator_1_name,
        (array_agg(
            i.value 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[1] as key_indicator_1_value,
        (array_agg(
            i.year 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[1] as key_indicator_1_year,
        
        (array_agg(
            i.indicator_name 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[2] as key_indicator_2_name,
        (array_agg(
            i.value 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[2] as key_indicator_2_value,
        (array_agg(
            i.year 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[2] as key_indicator_2_year,
        
        (array_agg(
            i.indicator_name 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[3] as key_indicator_3_name,
        (array_agg(
            i.value 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[3] as key_indicator_3_value,
        (array_agg(
            i.year 
            ORDER BY i.year DESC, i.indicator_code DESC
        ))[3] as key_indicator_3_year,
        
        -- Ranking within industry
        RANK() OVER (
            PARTITION BY i.industry 
            ORDER BY AVG(i.value) DESC NULLS LAST
        ) as global_rank_in_industry,
        
        -- Regional ranking
        RANK() OVER (
            PARTITION BY i.industry 
            ORDER BY AVG(i.value) DESC NULLS LAST
        ) as regional_rank_in_industry,
        
        -- Percentile score
        ROUND(
            PERCENT_RANK() OVER (
                PARTITION BY i.industry 
                ORDER BY AVG(i.value) ASC NULLS LAST
            ) * 100, 2
        ) as percentile_score,
        
        -- 5-year trend
        CASE 
            WHEN MAX(i.year) - MIN(i.year) >= 5 THEN
                CASE 
                    WHEN AVG(CASE WHEN i.year > MAX(i.year) - 5 THEN i.value END) > 
                         AVG(CASE WHEN i.year <= MAX(i.year) - 5 THEN i.value END)
                    THEN 'improving'
                    ELSE 'declining'
                END
            ELSE 'insufficient_data'
        END as five_year_trend,
        
        -- 10-year trend
        CASE 
            WHEN MAX(i.year) - MIN(i.year) >= 10 THEN
                CASE 
                    WHEN AVG(CASE WHEN i.year > MAX(i.year) - 10 THEN i.value END) > 
                         AVG(CASE WHEN i.year <= MAX(i.year) - 10 THEN i.value END)
                    THEN 'improving'
                    ELSE 'declining'
                END
            ELSE 'insufficient_data'
        END as ten_year_trend,
        
        -- Industry confidence score (FIXED - using source instead of data_quality_score)
        CASE 
            WHEN COUNT(DISTINCT i.source) >= 2 THEN 'high'
            WHEN COUNT(DISTINCT i.source) = 1 THEN 'medium'
            ELSE 'low'
        END as industry_confidence_score,
        
        -- Data sources count
        COUNT(DISTINCT i.source) as data_sources_count,
        
        -- Last updated
        MAX(i.created_at) as last_updated
        
    FROM indicators i
    WHERE i.industry IS NOT NULL
    AND i.value IS NOT NULL
    GROUP BY i.industry, i.country_code, i.country_name
) industry_stats
ORDER BY industry, global_rank_in_industry;
