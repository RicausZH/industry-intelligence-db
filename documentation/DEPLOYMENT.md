DEPLOYMENT.md
Deployment and Environment Setup Guide
Tri-Source Economic Intelligence Platform
Version: 3.0 (Phase 3 Complete)
Last Updated: July 2025

Table of Contents
Overview
Prerequisites
Railway Platform Setup
Environment Configuration
Database Deployment
Application Deployment
Data Processing Setup
Production Configuration
Monitoring and Maintenance
Security Best Practices
Troubleshooting
Scaling Considerations
1. Overview
This document provides comprehensive deployment instructions for the Tri-Source Economic Intelligence Platform, a production-ready system processing 780,525+ records from World Bank, OECD, and IMF data sources across 12 industries and 267 countries.

Platform Specifications
Application: Node.js 18+ with Express.js
Database: PostgreSQL 13+ with Railway hosting
Data Volume: 780,525+ records, ~2GB database size
Memory Requirements: 2GB RAM minimum, 4GB recommended
Storage: 10GB minimum for data processing
2. Prerequisites
System Requirements
Node.js 18.0 or higher
npm 8.0 or higher
Git version control
Railway CLI (for deployment)
PostgreSQL client tools (optional, for local development)
Account Requirements
Railway account with PostgreSQL add-on
GitHub account for code repository
Domain registrar (optional, for custom domain)
Development Environment
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install Railway CLI
npm install -g @railway/cli

# Verify installations
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher
railway --version
    
3. Railway Platform Setup
3.1 Account Creation and Project Setup
Create Railway Account:
Visit https://railway.app
Sign up using GitHub authentication
Complete account verification
Create New Project:
Click "New Project" in Railway dashboard
Select "Empty Project"
Name: "industry-intelligence-db"
Connect GitHub Repository:
# Connect your repository
railway login
railway link
# Select your project from the list
            
3.2 PostgreSQL Database Setup
Add PostgreSQL Service:
In Railway dashboard, click "Add Service"
Select "PostgreSQL"
Choose latest version (13+)
Wait for provisioning (2-3 minutes)
Configure Database Resources:
Set memory limit: 2GB minimum
Set CPU limit: 1 vCPU minimum
Enable automatic backups
Set backup retention: 7 days
Obtain Connection Details:
# Database connection format
DATABASE_URL=postgresql://username:password@host:port/database

# Example
DATABASE_URL=postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway
            
4. Environment Configuration
4.1 Environment Variables
Configure the following environment variables in Railway dashboard:

Variable	Description	Example	Required
DATABASE_URL	PostgreSQL connection string	postgresql://user:pass@host:port/db	Yes
NODE_ENV	Environment mode	production	Yes
PORT	Application port	8080	Yes
MAX_CONNECTIONS	Database connection pool size	20	No
BATCH_SIZE	Data processing batch size	1000	No
LOG_LEVEL	Application logging level	info	No
4.2 Railway Environment Setup
# Set environment variables via CLI
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set MAX_CONNECTIONS=20
railway variables set BATCH_SIZE=1000
railway variables set LOG_LEVEL=info

# Verify environment variables
railway variables
    
4.3 SSL/TLS Configuration
Railway automatically provides SSL/TLS certificates for deployed applications. No additional configuration required for basic HTTPS support.

5. Database Deployment
5.1 Database Initialization
Clone Repository:
git clone https://github.com/RicausZH/industry-intelligence-db.git
cd industry-intelligence-db
npm install
            
Set Database Connection:
# Copy Railway DATABASE_URL to .env file
echo "DATABASE_URL=your_railway_database_url" > .env
echo "NODE_ENV=production" >> .env
            
Initialize Database Schema:
# Run database setup
npm run setup-db

# Run multi-source migrations
npm run migrate

# Verify database structure
npm run verify
            
5.2 Data Mappings Setup
# Initialize country and indicator mappings
npm run setup-mappings

# Setup IMF mappings
npm run setup-imf-mappings

# Verify mappings
npm run analyze
    
5.3 Database Optimization
# Create performance indexes (if not automated)
psql $DATABASE_URL -c "
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indicators_country_year 
ON indicators (country_code, year);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indicators_industry 
ON indicators (industry);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oecd_country_indicator 
ON oecd_indicators (country_code, indicator_code);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imf_country_indicator 
ON imf_indicators (weo_country_code, subject_code);
"
    
6. Application Deployment
6.1 Deployment via Railway CLI
# Deploy from local repository
railway up

# Or deploy specific branch
railway up --branch main

# Monitor deployment
railway logs
    
6.2 Deployment via Git Integration
Enable Auto-Deploy:
In Railway dashboard, go to Settings
Enable "Auto-Deploy" from main branch
Set build command: npm install
Set start command: npm start
Deploy via Git Push:
git add .
git commit -m "Production deployment"
git push origin main
            
6.3 Deployment Verification
# Check deployment status
railway status

# View application logs
railway logs --tail

# Test database connection
railway run npm run verify

# Check application health
curl https://your-app-url.railway.app/health
    
7. Data Processing Setup
7.1 Initial Data Load
Warning: Initial data processing may take 2-4 hours and require significant memory. Schedule during low-traffic periods.
# Process World Bank data (515,565 records)
railway run npm run process-wb -- --url "WORLD_BANK_CSV_URL"

# Process OECD data (138,086 records)
railway run npm run process-oecd -- --url "OECD_CSV_URL"

# Process IMF data (126,874 records)
railway run npm run process-imf -- --url "IMF_CSV_URL"

# Verify final database state
railway run npm run analyze
    
7.2 Data Processing Monitoring
# Monitor memory usage during processing
railway ps

# Check processing logs
railway logs --tail

# Verify data integrity after processing
railway run npm run validate
    
7.3 Automated Data Updates
Set up automated data refresh using Railway cron jobs or external schedulers:

# Example cron job for monthly World Bank updates
# Add to Railway cron or external scheduler
0 0 1 * * railway run npm run process-wb -- --url "LATEST_WB_URL"
    
8. Production Configuration
8.1 Performance Optimization
Setting	Production Value	Description
CONNECTION_POOL_SIZE	20	Maximum database connections
BATCH_SIZE	1000	Data processing batch size
MEMORY_LIMIT	4GB	Application memory limit
QUERY_TIMEOUT	30000ms	Database query timeout
8.2 Security Configuration
# Set security headers
railway variables set SECURITY_HEADERS=true

# Configure rate limiting
railway variables set RATE_LIMIT_MAX=1000
railway variables set RATE_LIMIT_WINDOW=900000

# Enable request logging
railway variables set LOG_REQUESTS=true
    
8.3 Error Handling and Logging
# Configure error handling
railway variables set ERROR_HANDLING=production
railway variables set LOG_ERRORS=true

# Set up log rotation
railway variables set LOG_ROTATION=daily
railway variables set LOG_MAX_SIZE=100MB
    
9. Monitoring and Maintenance
9.1 Application Monitoring
Railway Metrics: Built-in CPU, memory, and request monitoring
Database Monitoring: Query performance and connection pool status
Custom Metrics: Data processing success rates and error counts
9.2 Health Check Endpoints
# Add health check routes to server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'connected'
  });
});

app.get('/health/database', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM indicators');
    res.json({
      database: 'connected',
      records: result.rows[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ database: 'error', error: error.message });
  }
});
    
9.3 Backup and Recovery
# Manual database backup
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
railway run psql $DATABASE_URL < backup_20250718.sql

# Verify backup integrity
railway run npm run verify
    
10. Security Best Practices
10.1 Database Security
Connection Security: Use SSL/TLS for all database connections
Access Control: Implement role-based access control
Query Protection: Use parameterized queries to prevent SQL injection
Audit Logging: Enable database audit logging for compliance
10.2 Application Security
# Security middleware configuration
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Request validation
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
10.3 Data Protection
Encryption: Encrypt sensitive data at rest and in transit
Access Logs: Maintain detailed access logs for audit purposes
Data Retention: Implement data retention policies
Privacy Compliance: Ensure GDPR/CCPA compliance for user data
11. Troubleshooting
11.1 Common Issues
Issue	Symptoms	Solution
Database Connection Failure	Cannot connect to database	Check DATABASE_URL, verify Railway service status
Memory Issues	Application crashes during processing	Increase memory limit, optimize batch size
Slow Query Performance	High response times	Check indexes, optimize queries, increase connection pool
Data Processing Errors	CSV processing failures	Verify CSV format, check mappings, review error logs
11.2 Debugging Commands
# Check application status
railway ps

# View detailed logs
railway logs --tail --lines 100

# Check database connectivity
railway run npm run verify

# Test database queries
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM indicators;"

# Monitor memory usage
railway run node -e "console.log(process.memoryUsage())"
    
11.3 Recovery Procedures
# Restart application
railway restart

# Rollback to previous deployment
railway rollback

# Database recovery from backup
railway run psql $DATABASE_URL < backup_latest.sql

# Clear corrupted data and reprocess
railway run npm run verify
railway run npm run process-wb -- --url "BACKUP_URL"
    
12. Scaling Considerations
12.1 Horizontal Scaling
Database Scaling: Implement read replicas for query distribution
Application Scaling: Use Railway's auto-scaling features
Caching: Implement Redis for frequently accessed data
CDN: Use CDN for static assets and API responses
12.2 Performance Optimization
# Database optimization
CREATE INDEX CONCURRENTLY idx_indicators_composite 
ON indicators (country_code, year, industry, indicator_code);

# Query optimization
EXPLAIN ANALYZE SELECT * FROM indicators 
WHERE country_code = 'USA' AND year = 2023;

# Connection pooling optimization
railway variables set MAX_CONNECTIONS=50
railway variables set IDLE_TIMEOUT=30000
    
12.3 Capacity Planning
Metric	Current	Target (1M+ records)	Scaling Strategy
Database Size	2GB	5GB	Increase storage allocation
Memory Usage	2GB	8GB	Upgrade Railway plan
Query Performance	<500ms	<200ms	Optimize indexes, implement caching
Concurrent Users	100	1000	Horizontal scaling, load balancing
Success: Following this deployment guide will establish a production-ready, scalable tri-source economic intelligence platform capable of serving enterprise-grade workloads.
Conclusion
This deployment guide provides comprehensive instructions for deploying the Tri-Source Economic Intelligence Platform to production. The platform is designed to handle enterprise-scale workloads with 780,525+ records and can be scaled to support millions of records with proper infrastructure planning.

For additional support or questions, refer to the project documentation or create an issue in the GitHub repository.

Document Version: 1.0
Last Updated: July 2025
Next Review: October 2025
