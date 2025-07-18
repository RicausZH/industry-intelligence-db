Copyconst { Pool } = require('pg');
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
                sources: countryData.data_sources ? countryData.data_sources.split(',').filter(s => s) : [],
                lastUpdated: countryData.last_data_update,
                reliabilityStatement: this.getReliabilityStatement(countryData.data_confidence_score)
            },
            economics: {
                gdpGrowth: {
                    value: countryData.latest_gdp_growth,
                    year: countryData.gdp_year,
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                gdpPerCapita: {
                    value: countryData.gdp_per_capita,
                    currency: 'USD',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                inflation: {
                    value: countryData.inflation_rate,
                    unit: 'percent',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                unemployment: {
                    value: countryData.unemployment_rate,
                    unit: 'percent',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                }
            },
            innovation: {
                rdSpending: {
                    value: countryData.rd_spending_pct_gdp,
                    year: countryData.rd_year,
                    unit: 'percent_of_gdp',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                patents: {
                    value: countryData.patent_applications,
                    unit: 'applications',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                hightechExports: {
                    value: countryData.hightech_exports_pct,
                    unit: 'percent_of_total_exports',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                }
            },
            trade: {
                tradeBalance: {
                    value: countryData.trade_balance,
                    currency: 'USD',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                exportsGrowth: {
                    value: countryData.exports_growth,
                    unit: 'percent',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                importsGrowth: {
                    value: countryData.imports_growth,
                    unit: 'percent',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                }
            },
            fiscal: {
                governmentDebt: {
                    value: countryData.government_debt_gdp,
                    unit: 'percent_of_gdp',
                    source: 'IMF',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                },
                fiscalDeficit: {
                    value: countryData.fiscal_deficit_gdp,
                    unit: 'percent_of_gdp',
                    source: 'IMF',
                    confidence: this.getConfidenceLevel(countryData.data_confidence_score)
                }
            },
            chatgptGuidance: {
                reliabilityStatement: this.getReliabilityStatement(countryData.data_confidence_score),
                recommendedUsage: this.getUsageRecommendations(countryData.data_confidence_score),
                limitations: this.getDataLimitations(countryData.data_confidence_score),
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
                completenessScore: industryData.industry_completeness_score,
                latestYear: industryData.industry_latest_year,
                globalRank: industryData.global_rank_in_industry,
                regionalRank: industryData.regional_rank_in_industry,
                percentileScore: industryData.percentile_score
            },
            keyIndicators: [
                {
                    name: industryData.key_indicator_1_name,
                    value: industryData.key_indicator_1_value,
                    year: industryData.key_indicator_1_year
                },
                {
                    name: industryData.key_indicator_2_name,
                    value: industryData.key_indicator_2_value,
                    year: industryData.key_indicator_2_year
                },
                {
                    name: industryData.key_indicator_3_name,
                    value: industryData.key_indicator_3_value,
                    year: industryData.key_indicator_3_year
                }
            ].filter(indicator => indicator.name && indicator.value),
            trends: {
                fiveYear: industryData.five_year_trend,
                tenYear: industryData.ten_year_trend
            },
            dataQuality: {
                confidence: industryData.industry_confidence_score,
                sourceCount: industryData.data_sources_count,
                lastUpdated: industryData.last_updated
            },
            chatgptGuidance: {
                analysisRecommendations: this.getIndustryAnalysisRecommendations(industryData.industry_confidence_score),
                benchmarkingNotes: this.getBenchmarkingNotes(industryData.global_rank_in_industry),
                trendInterpretation: this.getTrendInterpretation(industryData.five_year_trend, industryData.ten_year_trend)
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
                volatility: historicalData.volatility_score,
                minValue: historicalData.min_value,
                maxValue: historicalData.max_value,
                avgValue: historicalData.avg_value,
                latestValue: historicalData.latest_value
            },
            dataQuality: {
                completeness: historicalData.data_completeness_pct,
                sourceConsistency: historicalData.source_consistency_score,
                sources: historicalData.data_sources
            },
            chatgptGuidance: {
                trendAnalysis: this.getTrendAnalysisGuidance(historicalData.trend_direction, historicalData.volatility_score),
                dataReliability: this.getHistoricalDataReliability(historicalData.data_completeness_pct),
                recommendedUse: this.getHistoricalDataUsage(historicalData.source_consistency_score)
            }
        };
    }

    static getReliabilityStatement(confidenceLevel) {
        const statements = {
            'high': 'Data validated across multiple authoritative sources (World Bank, OECD, IMF) with high reliability for policy analysis and academic research.',
            'medium': 'Data from two reliable sources with good consistency, suitable for comparative analysis and trend identification.',
            'low': 'Data from single authoritative source, suitable for general insights and preliminary analysis.',
            'projection': 'Forward-looking data from IMF projections, suitable for scenario planning with appropriate uncertainty margins.'
        };
        return statements[confidenceLevel] || 'Data reliability assessment pending.';
    }

    static getUsageRecommendations(confidenceLevel) {
        const recommendations = {
            'high': 'Suitable for detailed analysis, benchmarking, policy recommendations, and publication-quality reports.',
            'medium': 'Good for trend analysis, comparative studies, and strategic planning with appropriate caveats.',
            'low': 'Use for general insights, exploratory analysis, and as supporting evidence with additional sources.',
            'projection': 'Use for scenario planning, forecasting exercises, and strategic planning with uncertainty ranges.'
        };
        return recommendations[confidenceLevel] || 'Use with caution and verify with additional sources.';
    }

    static getDataLimitations(confidenceLevel) {
        const limitations = {
            'high': 'Minimal limitations. Data is well-validated and suitable for most analytical purposes.',
            'medium': 'Some gaps in cross-source validation. Consider supplementing with additional sources for critical decisions.',
            'low': 'Limited to single-source validation. Use as indicative data and supplement with other sources when possible.',
            'projection': 'Subject to forecast uncertainty. Actual outcomes may vary significantly from projections.'
        };
        return limitations[confidenceLevel] || 'Limitations assessment pending.';
    }

    static getCitationFormat(sources) {
        if (!sources) return 'Source information not available';
        
        const sourceList = sources.split(',').filter(s => s);
        const sourceNames = {
            'WB': 'World Bank',
            'OECD': 'Organisation for Economic Co-operation and Development',
            'IMF': 'International Monetary Fund'
        };
        
        const fullNames = sourceList.map(s => sourceNames[s] || s);
        return `Data sources: ${fullNames.join(', ')}`;
    }

    static getConfidenceLevel(confidenceScore) {
        return {
            level: confidenceScore,
            description: this.getReliabilityStatement(confidenceScore)
        };
    }

    static getIndustryAnalysisRecommendations(confidence) {
        const recommendations = {
            'high': 'Comprehensive industry analysis possible with detailed benchmarking and trend analysis.',
            'medium': 'Good foundation for industry analysis with some supplementary research recommended.',
            'low': 'Basic industry insights available. Consider additional data sources for comprehensive analysis.'
        };
        return recommendations[confidence] || 'Industry analysis guidance pending.';
    }

    static getBenchmarkingNotes(rank) {
        if (!rank) return 'Ranking information not available';
        
        if (rank <= 10) {
            return 'Top performer in this industry globally. Excellent benchmark for best practices.';
        } else if (rank <= 25) {
            return 'Strong performer with good practices to study and emulate.';
        } else if (rank <= 50) {
            return 'Moderate performer with room for improvement based on top performers.';
        } else {
            return 'Opportunity for significant improvement by studying top performers in this industry.';
        }
    }

    static getTrendInterpretation(fiveYear, tenYear) {
        if (fiveYear === 'improving' && tenYear === 'improving') {
            return 'Consistent long-term improvement trajectory with positive momentum.';
        } else if (fiveYear === 'improving' && tenYear === 'declining') {
            return 'Recent improvement after longer-term decline. Monitor for sustainability.';
        } else if (fiveYear === 'declining' && tenYear === 'improving') {
            return 'Recent decline despite longer-term improvement. Investigate recent challenges.';
        } else if (fiveYear === 'declining' && tenYear === 'declining') {
            return 'Concerning long-term decline requiring strategic intervention.';
        } else {
            return 'Insufficient data for comprehensive trend analysis.';
        }
    }

    static getTrendAnalysisGuidance(trend, volatility) {
        let guidance = `Trend direction: ${trend}. `;
        
        if (volatility) {
            if (volatility < 10) {
                guidance += 'Low volatility indicates stable, predictable patterns.';
            } else if (volatility < 25) {
                guidance += 'Moderate volatility suggests some cyclical variation.';
            } else {
                guidance += 'High volatility indicates significant fluctuation and uncertainty.';
            }
        }
        
        return guidance;
    }

    static getHistoricalDataReliability(completeness) {
        if (completeness >= 90) {
            return 'Excellent data completeness with minimal gaps.';
        } else if (completeness >= 70) {
            return 'Good data completeness with some minor gaps.';
        } else if (completeness >= 50) {
            return 'Moderate data completeness with notable gaps.';
        } else {
            return 'Limited data completeness with significant gaps.';
        }
    }

    static getHistoricalDataUsage(sourceConsistency) {
        const usage = {
            'high': 'Consistent single-source data ideal for trend analysis.',
            'medium': 'Multi-source data requires careful interpretation of methodology differences.',
            'low': 'Mixed-source data should be used with caution and appropriate caveats.'
        };
        return usage[sourceConsistency] || 'Source consistency assessment pending.';
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
            
            query += ' ORDER BY global_rank_in_industry LIMIT 20';
            
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
            
            query += ' ORDER BY indicator_code';
            
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
