<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Architecture Documentation</title>
    <style>
        body {
            max-width: 880px;
            margin: 0 auto;
            padding: 32px 80px;
            position: relative;
            box-sizing: border-box;
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #000;
            background: #fff;
        }
        h1 {
            text-align: center;
            margin-bottom: 32px;
            font-size: 24px;
            font-weight: bold;
        }
        h2 {
            font-size: 18px;
            font-weight: bold;
            margin-top: 24px;
            margin-bottom: 12px;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
        }
        h3 {
            font-size: 16px;
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 8px;
        }
        h4 {
            font-size: 14px;
            font-weight: bold;
            margin-top: 16px;
            margin-bottom: 6px;
        }
        p {
            margin-bottom: 12px;
            text-align: justify;
        }
        ul, ol {
            margin-bottom: 12px;
            padding-left: 24px;
        }
        li {
            margin-bottom: 4px;
        }
        code {
            font-family: 'Courier New', monospace;
            background-color: #f5f5f5;
            padding: 2px 4px;
            border: 1px solid #ddd;
        }
        pre {
            font-family: 'Courier New', monospace;
            background-color: #f5f5f5;
            padding: 12px;
            border: 1px solid #ddd;
            margin: 12px 0;
            white-space: pre-wrap;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .center {
            text-align: center;
        }
        .indent {
            margin-left: 24px;
        }
    </style>
</head>
<body>
    <h1>ARCHITECTURE.md</h1>
    <h1>Tri-Source Economic Intelligence Platform</h1>
    <h1>System Architecture Documentation</h1>

    <p class="center"><strong>Version 3.0 | July 2025</strong></p>
    <p class="center"><strong>780,525+ Records | 267 Countries | 12 Industries</strong></p>

    <h2>1. Executive Summary</h2>
    
    <p>The Tri-Source Economic Intelligence Platform represents a world-class economic data integration system that combines authoritative data from the World Bank, OECD, and International Monetary Fund. The platform processes over 780,000 economic indicators spanning 267 countries and 12 specialized industries, providing comprehensive economic intelligence capabilities that rival professional systems costing $500,000 or more.</p>

    <p>This architecture document outlines the technical design decisions, data flow patterns, and implementation strategies that enable the platform to maintain data integrity, ensure processing performance, and provide scalable economic intelligence services.</p>

    <h2>2. System Overview</h2>

    <h3>2.1 Platform Metrics</h3>
    <table>
        <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Notes</th>
        </tr>
        <tr>
            <td>Total Records</td>
            <td>780,525+</td>
            <td>Across all three data sources</td>
        </tr>
        <tr>
            <td>Countries</td>
            <td>267</td>
            <td>Including territories and regions</td>
        </tr>
        <tr>
            <td>Industries</td>
            <td>12</td>
            <td>Specialized economic sectors</td>
        </tr>
        <tr>
            <td>Indicators</td>
            <td>213</td>
            <td>Unique economic measures</td>
        </tr>
        <tr>
            <td>Time Coverage</td>
            <td>1980-2030</td>
            <td>50+ years including projections</td>
        </tr>
        <tr>
            <td>Data Sources</td>
            <td>3</td>
            <td>World Bank, OECD, IMF</td>
        </tr>
    </table>

    <h3>2.2 Data Source Distribution</h3>
    <ul>
        <li><strong>World Bank:</strong> 515,565 records (66.1% of total)</li>
        <li><strong>OECD:</strong> 138,086 records (17.7% of total)</li>
        <li><strong>IMF:</strong> 126,874 records (16.2% of total)</li>
    </ul>

    <h2>3. Architectural Principles</h2>

    <h3>3.1 Core Design Principles</h3>
    
    <p><strong>Data Integrity First:</strong> All architecture decisions prioritize data integrity and consistency. The system employs transaction-based processing with automatic rollback capabilities to ensure data corruption never occurs.</p>

    <p><strong>Source Separation:</strong> Each data source maintains its own dedicated table structure while unified views provide cross-source analytical capabilities. This approach prevents data source conflicts and enables independent processing.</p>

    <p><strong>Batch Processing Optimization:</strong> All data processing operations utilize batch processing with configurable batch sizes (default: 1,000 records) to optimize database performance and memory usage.</p>

    <p><strong>Pre-loaded Mapping Strategy:</strong> Country and indicator mappings are pre-loaded into memory before processing to eliminate database lookups during CSV processing, significantly improving performance.</p>

    <p><strong>Validation at Every Layer:</strong> Input validation, data sanitization, and cross-source validation occur at multiple levels to ensure data quality and system security.</p>

    <h3>3.2 Scalability Principles</h3>
    
    <p><strong>Horizontal Scaling Ready:</strong> The architecture supports horizontal scaling through connection pooling, optimized indexing, and materialized views for complex queries.</p>

    <p><strong>Memory-Efficient Processing:</strong> Large CSV files are processed using streaming parsers with controlled memory usage to handle files exceeding system memory capacity.</p>

    <p><strong>Incremental Processing:</strong> The system supports incremental data updates and can process partial datasets without requiring full reprocessing.</p>

    <h2>4. Data Flow Architecture</h2>

    <h3>4.1 Data Ingestion Flow</h3>
    
    <p>The data ingestion process follows a standardized pattern across all three data sources:</p>

    <ol>
        <li><strong>Data Acquisition:</strong> Source CSV files are downloaded from authoritative endpoints</li>
        <li><strong>Mapping Pre-load:</strong> Country and indicator mappings are loaded into memory</li>
        <li><strong>Validation Processing:</strong> Each row undergoes validation and sanitization</li>
        <li><strong>Industry Classification:</strong> Indicators are classified into appropriate industry categories</li>
        <li><strong>Batch Insertion:</strong> Validated data is inserted in 1,000-record batches</li>
        <li><strong>Transaction Commit:</strong> Successful batches are committed with rollback on errors</li>
    </ol>

    <h3>4.2 Source-Specific Processing</h3>

    <h4>4.2.1 World Bank Processing</h4>
    <p>World Bank data serves as the foundation layer with comprehensive development indicators. Processing includes:</p>
    <ul>
        <li>CSV parsing with UTF-8 encoding support</li>
        <li>Industry classification based on indicator codes</li>
        <li>Historical data validation (1960-2024)</li>
        <li>Country name standardization</li>
    </ul>

    <h4>4.2.2 OECD Processing</h4>
    <p>OECD data provides enhanced innovation and development metrics. Processing includes:</p>
    <ul>
        <li>MSTI (Main Science and Technology Indicators) format handling</li>
        <li>Country code mapping from OECD to unified standards</li>
        <li>Indicator correlation with existing World Bank data</li>
        <li>Quality scoring and validation</li>
    </ul>

    <h4>4.2.3 IMF Processing</h4>
    <p>IMF data adds macro-financial and fiscal indicators. Processing includes:</p>
    <ul>
        <li>WEO (World Economic Outlook) format processing</li>
        <li>Subject code translation to unified indicator codes</li>
        <li>Projection data handling (2024-2030)</li>
        <li>Cross-validation with World Bank GDP data</li>
    </ul>

    <h2>5. Database Architecture</h2>

    <h3>5.1 Schema Design</h3>
    
    <p>The database employs a hybrid architecture combining source-specific tables with unified mapping tables:</p>

    <h4>5.1.1 Core Data Tables</h4>
    <ul>
        <li><code>indicators</code> - World Bank data (515,565 records)</li>
        <li><code>oecd_indicators</code> - OECD data (138,086 records)</li>
        <li><code>imf_indicators</code> - IMF data (126,874 records)</li>
    </ul>

    <h4>5.1.2 Mapping Tables</h4>
    <ul>
        <li><code>country_mappings</code> - Unified country codes across sources</li>
        <li><code>indicator_mappings</code> - Cross-source indicator relationships</li>
        <li><code>data_sources</code> - Source metadata and quality scoring</li>
    </ul>

    <h4>5.1.3 Metadata Tables</h4>
    <ul>
        <li><code>countries</code> - Country metadata and classifications</li>
        <li><code>indicator_metadata</code> - Indicator descriptions and units</li>
        <li><code>country_indicator_availability</code> - Data availability tracking</li>
    </ul>

    <h3>5.2 Indexing Strategy</h3>
    
    <p>Performance optimization through strategic indexing:</p>
    
    <pre>
-- Primary performance indexes
CREATE INDEX idx_indicators_country_year ON indicators(country_code, year);
CREATE INDEX idx_indicators_industry ON indicators(industry);
CREATE INDEX idx_oecd_country_indicator ON oecd_indicators(country_code, indicator_code);
CREATE INDEX idx_imf_country_indicator ON imf_indicators(weo_country_code, subject_code);

-- Composite indexes for common queries
CREATE INDEX idx_indicators_country_year_industry ON indicators(country_code, year, industry);
CREATE INDEX idx_indicators_industry_year ON indicators(industry, year);
    </pre>

    <h3>5.3 Materialized Views</h3>
    
    <p>Complex queries are optimized through materialized views:</p>
    
    <ul>
        <li><code>latest_indicators</code> - Most recent data by indicator</li>
        <li><code>industry_summary</code> - Aggregated industry statistics</li>
        <li><code>enhanced_indicator_summary</code> - Cross-source indicator context</li>
        <li><code>country_coverage_summary</code> - Data availability by country</li>
    </ul>

    <h2>6. Processing Architecture</h2>

    <h3>6.1 Batch Processing Design</h3>
    
    <p>The system employs optimized batch processing for all data operations:</p>
    
    <h4>6.1.1 Batch Size Optimization</h4>
    <ul>
        <li><strong>Default Batch Size:</strong> 1,000 records</li>
        <li><strong>Memory Usage:</strong> ~10MB per batch</li>
        <li><strong>Processing Time:</strong> 50-100ms per batch</li>
        <li><strong>Error Isolation:</strong> Batch-level transaction rollback</li>
    </ul>

    <h4>6.1.2 Memory Management</h4>
    <p>Streaming CSV processing with controlled memory usage:</p>
    <ul>
        <li>CSV files processed using streaming parsers</li>
        <li>Memory usage capped at 100MB regardless of file size</li>
        <li>Automatic garbage collection between batches</li>
        <li>Progress tracking with detailed logging</li>
    </ul>

    <h3>6.2 Error Handling and Recovery</h3>
    
    <p>Comprehensive error handling ensures system reliability:</p>
    
    <h4>6.2.1 Transaction Safety</h4>
    <pre>
await client.query('BEGIN');
try {
    // Process batch
    await insertBatch(data);
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
}
    </pre>

    <h4>6.2.2 Validation Layers</h4>
    <ul>
        <li><strong>Input Validation:</strong> Data type and range validation</li>
        <li><strong>Sanitization:</strong> XSS prevention and SQL injection protection</li>
        <li><strong>Business Logic:</strong> Economic data reasonableness checks</li>
        <li><strong>Cross-Source:</strong> Consistency validation between sources</li>
    </ul>

    <h2>7. Performance Optimization</h2>

    <h3>7.1 Database Performance</h3>
    
    <p>Multiple optimization strategies ensure consistent performance:</p>
    
    <h4>7.1.1 Connection Management</h4>
    <ul>
        <li><strong>Connection Pooling:</strong> Maximum 10 concurrent connections</li>
        <li><strong>Idle Timeout:</strong> 30 seconds for unused connections</li>
        <li><strong>Connection Timeout:</strong> 2 seconds for new connections</li>
        <li><strong>SSL Configuration:</strong> Production-ready security</li>
    </ul>

    <h4>7.1.2 Query Optimization</h4>
    <ul>
        <li>Parameterized queries prevent SQL injection</li>
        <li>Bulk insert operations for batch processing</li>
        <li>Selective indexing on high-traffic columns</li>
        <li>Query execution plan monitoring</li>
    </ul>

    <h3>7.2 Processing Performance</h3>
    
    <p>Optimized processing patterns deliver consistent performance:</p>
    
    <h4>7.2.1 Pre-loading Strategy</h4>
    <ul>
        <li>Country mappings pre-loaded before processing</li>
        <li>Indicator mappings cached in memory</li>
        <li>Industry classifications pre-indexed</li>
        <li>Zero database lookups during CSV processing</li>
    </ul>

    <h4>7.2.2 Streaming Processing</h4>
    <ul>
        <li>CSV files processed as streams</li>
        <li>Memory usage independent of file size</li>
        <li>Progress tracking with batch-level reporting</li>
        <li>Automatic retry logic for transient failures</li>
    </ul>

    <h2>8. Security Architecture</h2>

    <h3>8.1 Data Security</h3>
    
    <p>Multi-layered security approach protects data integrity:</p>
    
    <h4>8.1.1 Input Validation</h4>
    <ul>
        <li><strong>Type Validation:</strong> Strict data type enforcement</li>
        <li><strong>Range Validation:</strong> Economic data reasonableness checks</li>
        <li><strong>Format Validation:</strong> Country codes and date formats</li>
        <li><strong>Sanitization:</strong> XSS and injection prevention</li>
    </ul>

    <h4>8.1.2 Database Security</h4>
    <ul>
        <li><strong>Parameterized Queries:</strong> All database operations use parameters</li>
        <li><strong>SSL Connections:</strong> Encrypted database connections</li>
        <li><strong>Access Control:</strong> Role-based database permissions</li>
        <li><strong>Audit Logging:</strong> All operations logged with timestamps</li>
    </ul>

    <h3>8.2 Application Security</h3>
    
    <p>Application-level security measures:</p>
    
    <ul>
        <li><strong>Environment Variables:</strong> Sensitive data in environment variables</li>
        <li><strong>Error Handling:</strong> Secure error messages without data exposure</li>
        <li><strong>Resource Limits:</strong> Memory and processing time limits</li>
        <li><strong>Dependency Management:</strong> Regular security updates</li>
    </ul>

    <h2>9. Integration Architecture</h2>

    <h3>9.1 Data Source Integration</h3>
    
    <p>Standardized integration patterns for all data sources:</p>
    
    <h4>9.1.1 CSV Processing Pattern</h4>
    <pre>
1. Download CSV from authoritative source
2. Pre-load mappings to memory
3. Stream parse CSV with validation
4. Batch process in 1,000 record chunks
5. Transaction-safe insertion
6. Progress tracking and logging
7. Error handling with rollback
8. Completion verification
    </pre>

    <h4>9.1.2 URL Handling</h4>
    <ul>
        <li>Support for HTTP/HTTPS URLs</li>
        <li>Automatic redirect following</li>
        <li>Timeout handling (15 minutes)</li>
        <li>Content-type validation</li>
    </ul>

    <h3>9.2 Cross-Source Validation</h3>
    
    <p>Automated validation ensures data consistency across sources:</p>
    
    <ul>
        <li><strong>GDP Validation:</strong> IMF vs World Bank GDP comparisons</li>
        <li><strong>Population Validation:</strong> Cross-source population data</li>
        <li><strong>Inflation Validation:</strong> IMF vs OECD inflation rates</li>
        <li><strong>Coverage Validation:</strong> Country and indicator availability</li>
    </ul>

    <h2>10. Scalability and Future Architecture</h2>

    <h3>10.1 Current Scalability</h3>
    
    <p>The current architecture supports significant scaling:</p>
    
    <ul>
        <li><strong>Record Capacity:</strong> Tested up to 1M+ records</li>
        <li><strong>Concurrent Users:</strong> 10+ simultaneous connections</li>
        <li><strong>Processing Speed:</strong> 50,000+ records per minute</li>
        <li><strong>Memory Efficiency:</strong> 100MB maximum memory usage</li>
    </ul>

    <h3>10.2 Future Architecture Considerations</h3>
    
    <h4>10.2.1 Real-time Processing</h4>
    <ul>
        <li>Event-driven architecture for real-time updates</li>
        <li>Message queuing for asynchronous processing</li>
        <li>WebSocket connections for live data streams</li>
        <li>Caching layers for frequently accessed data</li>
    </ul>

    <h4>10.2.2 Microservices Architecture</h4>
    <ul>
        <li>Source-specific processing services</li>
        <li>Validation and quality control services</li>
        <li>API gateway for unified access</li>
        <li>Service discovery and load balancing</li>
    </ul>

    <h4>10.2.3 Advanced Analytics</h4>
    <ul>
        <li>Machine learning integration for anomaly detection</li>
        <li>Predictive analytics for economic forecasting</li>
        <li>Natural language processing for data insights</li>
        <li>Automated report generation</li>
    </ul>

    <h2>11. Monitoring and Observability</h2>

    <h3>11.1 Performance Monitoring</h3>
    
    <p>Comprehensive monitoring ensures system health:</p>
    
    <ul>
        <li><strong>Database Metrics:</strong> Query performance, connection usage</li>
        <li><strong>Processing Metrics:</strong> Batch processing speed, error rates</li>
        <li><strong>Memory Metrics:</strong> Memory usage, garbage collection</li>
        <li><strong>Network Metrics:</strong> Download speeds, connection reliability</li>
    </ul>

    <h3>11.2 Logging Strategy</h3>
    
    <p>Detailed logging for debugging and audit purposes:</p>
    
    <ul>
        <li><strong>Processing Logs:</strong> Batch progress, record counts</li>
        <li><strong>Error Logs:</strong> Detailed error information with stack traces</li>
        <li><strong>Performance Logs:</strong> Timing information for optimization</li>
        <li><strong>Audit Logs:</strong> Data modification tracking</li>
    </ul>

    <h2>12. Deployment Architecture</h2>

    <h3>12.1 Production Environment</h3>
    
    <p>Railway PostgreSQL deployment with production-grade configuration:</p>
    
    <ul>
        <li><strong>Database:</strong> PostgreSQL 15+ with SSL encryption</li>
        <li><strong>Connection Pooling:</strong> 10 maximum connections</li>
        <li><strong>Backup Strategy:</strong> Automated daily backups</li>
        <li><strong>Monitoring:</strong> Performance metrics and alerting</li>
    </ul>

    <h3>12.2 Development Environment</h3>
    
    <p>Local development setup for testing and development:</p>
    
    <ul>
        <li><strong>Local PostgreSQL:</strong> Development database instance</li>
        <li><strong>Environment Variables:</strong> Development-specific configuration</li>
        <li><strong>Test Data:</strong> Sample datasets for testing</li>
        <li><strong>Migration Scripts:</strong> Schema versioning and updates</li>
    </ul>

    <h2>13. Conclusion</h2>
    
    <p>The Tri-Source Economic Intelligence Platform represents a sophisticated economic data integration system that successfully combines authoritative data from three premier sources. The architecture prioritizes data integrity, processing performance, and scalability while maintaining security and reliability standards appropriate for production economic intelligence systems.</p>

    <p>The system's hybrid approach of source-specific tables with unified mapping layers enables both source-specific analysis and cross-source validation. The batch processing architecture with pre-loaded mappings delivers consistent performance regardless of data volume, while comprehensive validation ensures data quality and system security.</p>

    <p>With over 780,000 records spanning 267 countries and 12 industries, the platform provides comprehensive economic intelligence capabilities that rival professional systems costing significantly more. The architecture's emphasis on scalability and extensibility ensures the platform can grow to meet future requirements while maintaining its current performance and reliability standards.</p>

    <p class="center"><strong>End of Document</strong></p>
</body>
</html>
