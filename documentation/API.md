API Documentation
Tri-Source Economic Intelligence Platform
1. Overview
The Tri-Source Economic Intelligence Platform API provides programmatic access to over 780,525 economic data records from World Bank, OECD, and IMF sources. This RESTful API enables developers to integrate comprehensive economic intelligence into their applications, supporting 267 countries across 12 specialized industries with historical data from 1980 to 2030.

1.1 Base URL
All API requests should be made to the following base URL:

https://api.industry-intelligence-db.com/v1
1.2 Data Format
All API responses are returned in JSON format. Request payloads should also be sent as JSON with the appropriate Content-Type: application/json header.

1.3 Rate Limiting
API requests are limited to 1000 requests per hour per API key. Rate limit headers are included in all responses:

X-RateLimit-Limit: Request limit per hour
X-RateLimit-Remaining: Remaining requests in current window
X-RateLimit-Reset: Time when rate limit resets (Unix timestamp)
2. Authentication
The API uses API key authentication. All requests must include an API key in the request header:

Authorization: Bearer YOUR_API_KEY
2.1 API Key Tiers
Tier	Rate Limit	Features	Price
Developer	100 requests/hour	Basic data access	Free
Professional	1,000 requests/hour	All endpoints, bulk downloads	$49/month
Enterprise	10,000 requests/hour	All features, priority support	$299/month
2.2 Authentication Errors
Invalid or missing API keys will return a 401 Unauthorized response:

{
  "error": "unauthorized",
  "message": "Invalid API key",
  "code": 401
}
3. Core Data Endpoints
3.1 Country Data
Get All Countries
GET /countries

Returns a list of all available countries with their metadata.

Response:

{
  "countries": [
    {
      "unified_code": "USA",
      "name": "United States",
      "wb_code": "USA",
      "oecd_code": "USA",
      "imf_code": "111",
      "region": "North America",
      "income_group": "High income",
      "data_sources": ["WB", "OECD", "IMF"]
    }
  ],
  "total": 267,
  "page": 1
}
Get Country Details
GET /countries/{country_code}

Returns detailed information about a specific country.

Parameters:

country_code (required): Three-letter country code (e.g., "USA", "DEU")
3.2 Industry Data
Get All Industries
GET /industries

Returns a list of all 12 industries with their indicator counts.

Response:

{
  "industries": [
    {
      "code": "innovation",
      "name": "Innovation",
      "description": "R&D expenditure, patents, high-tech exports",
      "indicator_count": 50,
      "data_sources": ["WB", "OECD", "IMF"]
    }
  ],
  "total": 12
}
Get Industry Details
GET /industries/{industry_code}

Returns detailed information about a specific industry including all available indicators.

3.3 Indicator Data
Get Indicators
GET /indicators

Returns a list of all available indicators with filtering options.

Query Parameters:

industry: Filter by industry code
source: Filter by data source (WB, OECD, IMF)
search: Search indicator names and descriptions
page: Page number (default: 1)
limit: Results per page (default: 50, max: 100)
Get Indicator Data
GET /indicators/{indicator_code}/data

Returns historical data for a specific indicator.

Query Parameters:

countries: Comma-separated list of country codes
start_year: Starting year (default: 1980)
end_year: Ending year (default: 2030)
format: Response format (json, csv) (default: json)
4. Analysis Endpoints
4.1 Country Analysis
Country Profile
GET /analysis/country/{country_code}/profile

Returns a comprehensive country profile with key economic indicators across all industries.

Country Comparison
POST /analysis/countries/compare

Compares multiple countries across specified indicators.

Request Body:

{
  "countries": ["USA", "DEU", "JPN"],
  "indicators": ["NGDP_RPCH", "PCPIPCH"],
  "year": 2023
}
4.2 Industry Analysis
Industry Overview
GET /analysis/industry/{industry_code}/overview

Returns industry-specific analysis including top performers, trends, and key metrics.

Industry Rankings
GET /analysis/industry/{industry_code}/rankings

Returns country rankings for a specific industry based on composite indicators.

4.3 Trend Analysis
Time Series Analysis
GET /analysis/timeseries

Returns time series analysis for specified indicators and countries.

Query Parameters:

indicator: Indicator code (required)
countries: Comma-separated country codes (required)
start_year: Starting year
end_year: Ending year
analysis_type: growth, correlation, volatility
5. Bulk Data Endpoints
5.1 Bulk Downloads
Download Dataset
POST /bulk/download

Creates a bulk download job for specified data criteria.

Request Body:

{
  "countries": ["USA", "DEU", "JPN"],
  "industries": ["innovation", "finance"],
  "years": [2020, 2021, 2022, 2023],
  "format": "csv",
  "email": "user@example.com"
}
Download Status
GET /bulk/download/{job_id}

Returns the status of a bulk download job.

6. Administrative Endpoints
6.1 Data Freshness
Last Updated
GET /admin/last-updated

Returns the last update timestamps for each data source.

Data Coverage
GET /admin/coverage

Returns data coverage statistics by country, industry, and year.

6.2 System Status
Health Check
GET /health

Returns system health status and database connectivity.

Statistics
GET /stats

Returns overall database statistics including record counts and coverage metrics.

7. Error Handling
7.1 Error Response Format
All API errors follow a consistent format:

{
  "error": "error_type",
  "message": "Human-readable error message",
  "code": 400,
  "details": {
    "field": "specific error details"
  }
}
7.2 HTTP Status Codes
Status Code	Description
200	Success
400	Bad Request - Invalid parameters
401	Unauthorized - Invalid API key
403	Forbidden - Insufficient permissions
404	Not Found - Resource not found
429	Too Many Requests - Rate limit exceeded
500	Internal Server Error
8. Data Quality and Validation
8.1 Data Quality Scores
All data points include quality scores based on source reliability and validation:

World Bank: Quality score 5/5 (highest reliability)
OECD: Quality score 4/5 (high reliability)
IMF: Quality score 4/5 (high reliability)
8.2 Data Validation
The API includes cross-source validation indicators:

validation_status: validated, conflicting, single_source
confidence_score: 0-100 confidence level
source_agreement: Level of agreement between sources
9. Usage Examples
9.1 Basic Data Retrieval
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.industry-intelligence-db.com/v1/indicators/NGDP_RPCH/data?countries=USA,DEU&start_year=2020"
9.2 Country Comparison
curl -X POST \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"countries":["USA","DEU","JPN"],"indicators":["NGDP_RPCH"],"year":2023}' \
     "https://api.industry-intelligence-db.com/v1/analysis/countries/compare"
9.3 Industry Analysis
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.industry-intelligence-db.com/v1/analysis/industry/innovation/overview"
10. SDKs and Libraries
10.1 Official SDKs
Official SDKs are planned for the following languages:

Python: pip install industry-intelligence-sdk
R: install.packages("industryintelligence")
JavaScript/Node.js: npm install industry-intelligence-api
Java: Maven/Gradle support
10.2 Third-Party Integrations
The API supports integration with popular data analysis platforms:

Tableau Web Data Connector
Power BI Custom Connector
Excel Add-in
Google Sheets Add-on
11. Versioning and Updates
11.1 API Versioning
The API uses semantic versioning with the version specified in the URL path. The current version is v1. Breaking changes will result in a new version (v2, v3, etc.).

11.2 Deprecation Policy
API versions will be supported for a minimum of 12 months after a new version is released. Deprecation notices will be provided 6 months in advance.

12. Support and Resources
12.1 Developer Resources
Documentation: https://docs.industry-intelligence-db.com
API Explorer: https://api.industry-intelligence-db.com/explorer
Status Page: https://status.industry-intelligence-db.com
GitHub: https://github.com/RicausZH/industry-intelligence-db
12.2 Support Channels
Email: support@industry-intelligence-db.com
Discord: https://discord.gg/industry-intelligence
Stack Overflow: Tag questions with "industry-intelligence-api"
API Version: 1.0.0
Documentation Version: 1.0
Last Updated: July 2025
