const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class ChatGPTDataFormatter {
    
    static formatCountryData(countryData) {
        return {
            country: countryData.country_name,
            countryCode: countryData.country_code,
            dataQuality: {
                overallConfidence: countryData.data_confidence_score,
                sources: countryData.data_sources ? countryData.data_sources.split(',').filter(s => s.trim()) : [],
                lastUpdated: countryData.last_data_update
            },
            economics: {
                gdpGrowth: {
                    value: countryData.latest_gdp_growth,
                    year: countryData.gdp_year,
                    confidence: countryData.data_confidence_score,
                    unit: 'percent'
                },
                gdpPerCapita: {
                    value: countryData.gdp_per_capita,
                    currency: 'USD',
                    confidence: countryData.data_confidence_score
                },
                inflation: {
                    value: countryData.inflation_rate,
                    unit: 'percent',
                    confidence: countryData.data_confidence_score
                },
                unemployment: {
                    value: countryData.unemployment_rate,
                    unit: 'percent',
                    confidence: countryData.data_confidence_score
                }
            },
            innovation: {
                rdSpending: {
                    value: countryData.rd_spending_pct_gdp,
                    year: countryData.rd_year,
                    unit: 'percent_of_gdp',
                    confidence: countryData.data_confidence_score
                },
                patents: {
                    value: countryData.patent_applications,
                    unit: 'applications',
                    confidence: countryData.data_confidence_score
                },
                hightechExports: {
                    value: countryData.hightech_exports_pct,
                    unit: 'percent_of_total_exports',
                    confidence: countryData.data_confidence_score
                }
            },
            trade: {
                tradeBalance: {
                    value: countryData.trade_balance,
                    currency: 'USD',
                    confidence: countryData.data_confidence_score
                },
                exportsGrowth: {
                    value: countryData.exports_growth,
                    unit: 'percent',
                    confidence: countryData.data_confidence_score
                },
                importsGrowth: {
                    value: countryData.imports_growth,
                    unit: 'percent',
                    confidence: countryData.data_confidence_score
                }
            },
            fiscal: {
                governmentDebt: {
                    value: countryData.government_debt_gdp,
                    unit: 'percent_of_gdp',
                    source: 'IMF',
                    confidence: countryData.data_confidence_score
                },
                fiscalDeficit: {
                    value: countryData.fiscal_deficit_gdp,
                    unit: 'percent_of_gdp',
                    source: 'IMF',
                    confidence: countryData.data_confidence_score
                }
            },
            chatgptGuidance: {
                reliabilityStatement: this.getReliabilityStatement(countryData.data_confidence_score),
                recommendedUsage: this.getUsageRecommendations(countryData.data_confidence_score),
                citationFormat: this.getCitationFormat(countryData.data_sources)
            }
        };
    }

    static formatIndustryData(industryData) {
        return {
            industry: industryData.industry,
            country: industryData.country_name,
            countryCode: industryData.country_code,
            performance: {
                indicatorCount: industryData.industry_indicator_count,
                latestYear: industryData.industry_latest_year,
                earliestYear: industryData.industry_earliest_year,
                dataRichnessRank: industryData.data_richness_rank
            },
            keyIndicators: {
                latest: {
                    name: industryData.latest_indicator_name,
                    value: industryData.latest_indicator_value,
                    year: industryData.latest_indicator_year
                }
            },
            dataQuality: {
                confidence: industryData.industry_confidence_score,
                sourceCount: industryData.data_sources_count,
                lastUpdated: industryData.last_updated
            }
        };
    }

    static formatHistoricalData(historicalData) {
        return {
            country: historicalData.country_name,
            countryCode: historicalData.country_code,
            indicator: {
                code: historicalData.indicator_code,
                name: historicalData.indicator_name,
                industry: historicalData.industry
            },
            timeSeries: {
                years: historicalData.years,
                values: historicalData.values,
                earliestYear: historicalData.earliest_year,
                latestYear: historicalData.latest_year,
                totalRecords: historicalData.total_records
            },
            analysis: {
                trend: historicalData.trend_direction,
                minValue: historicalData.min_value,
                maxValue: historicalData.max_value,
                avgValue: historicalData.avg_value
            },
            dataQuality: {
                confidence: historicalData.trend_confidence_score,
                sourceCount: historicalData.source_count,
                sources: historicalData.data_sources
            }
        };
    }

    static getReliabilityStatement(confidenceLevel) {
        const statements = {
            'high': 'Data validated across multiple authoritative sources with high reliability for policy analysis.',
            'medium': 'Data from reliable sources with good consistency, suitable for comparative analysis.',
            'low': 'Data from authoritative source, suitable for general insights and preliminary analysis.'
        };
        return statements[confidenceLevel] || 'Data reliability assessment pending.';
    }

    static getUsageRecommendations(confidenceLevel) {
        const recommendations = {
            'high': 'Suitable for detailed analysis, benchmarking, and policy recommendations.',
            'medium': 'Good for trend analysis and comparative studies with appropriate caveats.',
            'low': 'Use for general insights and exploratory analysis with additional sources.'
        };
        return recommendations[confidenceLevel] || 'Use with caution and verify with additional sources.';
    }

    static getCitationFormat(sources) {
        if (!sources) return 'Source information not available';
        
        const sourceList = sources.split(',').map(s => s.trim()).filter(s => s);
        const sourceNames = {
            'WB': 'World Bank',
            'OECD': 'Organisation for Economic Co-operation and Development',
            'IMF': 'International Monetary Fund'
        };
        
        const fullNames = sourceList.map(s => sourceNames[s] || s);
        return `Data sources: ${fullNames.join(', ')}`;
    }

    // Main query functions
    static async getCountryProfile(countryCode) {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'SELECT * FROM chatgpt_country_profiles WHERE country_code = $1',
                [countryCode]
            );
            
            if (result.rows.length === 0) {
                throw new Error(`No data found for country code: ${countryCode}`);
            }
            
            return this.formatCountryData(result.rows[0]);
            
        } catch (error) {
            console.error('Error getting country profile:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async getIndustryAnalysis(industry, countryCode = null) {
        const client = await pool.connect();
        
        try {
            let query = 'SELECT * FROM chatgpt_industry_analysis WHERE industry = $1';
            const params = [industry];
            
            if (countryCode) {
                query += ' AND country_code = $2';
                params.push(countryCode);
            }
            
            query += ' ORDER BY data_richness_rank LIMIT 20';
            
            const result = await client.query(query, params);
            
            return result.rows.map(row => this.formatIndustryData(row));
            
        } catch (error) {
            console.error('Error getting industry analysis:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async getHistoricalTrends(countryCode, indicatorCode = null) {
        const client = await pool.connect();
        
        try {
            let query = 'SELECT * FROM chatgpt_historical_trends WHERE country_code = $1';
            const params = [countryCode];
            
            if (indicatorCode) {
                query += ' AND indicator_code = $2';
                params.push(indicatorCode);
            }
            
            query += ' ORDER BY indicator_code LIMIT 50';
            
            const result = await client.query(query, params);
            
            return result.rows.map(row => this.formatHistoricalData(row));
            
        } catch (error) {
            console.error('Error getting historical trends:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = ChatGPTDataFormatter;
