Development Environment and Guidelines
1. Development Environment Setup
1.1 Prerequisites
Before beginning development on the Tri-Source Economic Intelligence Platform, ensure you have the following prerequisites installed:

Required Software
Node.js: Version 18.0.0 or higher
npm: Version 8.0.0 or higher (included with Node.js)
PostgreSQL: Version 13.0 or higher
Git: Version 2.30 or higher
Development Tools
Code Editor: Visual Studio Code (recommended) or similar
Database Client: pgAdmin, DBeaver, or similar PostgreSQL client
API Testing: Postman or similar (for future API development)
System Requirements
RAM: Minimum 8GB (16GB recommended for processing large datasets)
Storage: At least 50GB available space for data processing
Network: Reliable internet connection for data downloads
1.2 Local Environment Setup
Step 1: Repository Setup
# Clone the repository
git clone https://github.com/RicausZH/industry-intelligence-db.git
cd industry-intelligence-db

# Install dependencies
npm install

# Create environment file
cp .env.example .env
    
Step 2: Database Configuration
# Create local PostgreSQL database
createdb industry_intelligence_dev

# Update .env file with your database connection
DATABASE_URL=postgresql://username:password@localhost:5432/industry_intelligence_dev
NODE_ENV=development
    
Step 3: Database Initialization
# Run database setup
npm run setup-db

# Populate country and indicator mappings
npm run setup-mappings
npm run setup-imf-mappings

# Verify setup
npm run verify
    
Note: The full database setup with all data sources requires approximately 2-3 hours and 10GB of storage space. For development purposes, consider using a subset of data.
1.3 Development Data Setup
For development purposes, you can work with a subset of data to reduce setup time:

Option 1: Full Data Setup (Production Mirror)
# Process all data sources (requires 2-3 hours)
npm run process-wb -- --url "WORLD_BANK_URL"
npm run process-oecd -- --url "OECD_URL"
npm run process-imf -- --url "IMF_URL"
    
Option 2: Development Data Subset
# Process only recent years for faster setup
npm run process-wb -- --url "WORLD_BANK_URL" --years "2020-2024"
npm run process-oecd -- --url "OECD_URL" --years "2020-2024"
npm run process-imf -- --url "IMF_URL" --years "2020-2024"
    
2. Coding Standards and Conventions
2.1 JavaScript Coding Standards
General Principles
Use ES6+ syntax consistently
Follow async/await patterns for asynchronous operations
Implement proper error handling with try-catch blocks
Use meaningful variable and function names
Write self-documenting code with clear logic flow
Naming Conventions
Variables: camelCase (e.g., countryCode, indicatorValue)
Functions: camelCase with descriptive verbs (e.g., processCSVData, validateCountryCode)
Constants: UPPER_SNAKE_CASE (e.g., MAX_BATCH_SIZE, DATABASE_TIMEOUT)
Files: kebab-case (e.g., process-imf-weo.js, validate-data-integrity.js)
Code Structure
// Standard script structure
const { Pool } = require('pg');
const csv = require('csv-parser');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Validation functions
function validateCountryCode(code) {
  // Implementation
}

// Main processing function
async function processData(url) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Processing logic
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Export for testing
module.exports = { processData };
    
2.2 Database Standards
SQL Conventions
Use uppercase for SQL keywords (SELECT, FROM, WHERE, etc.)
Use snake_case for table and column names
Always use parameterized queries to prevent SQL injection
Include proper indexes for performance optimization
Transaction Management
// Always use transactions for data modifications
await client.query('BEGIN');
try {
  await client.query('INSERT INTO table_name (column1, column2) VALUES ($1, $2)', [value1, value2]);
  await client.query('UPDATE another_table SET column = $1 WHERE id = $2', [newValue, id]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
    
2.3 Error Handling Standards
Comprehensive Error Handling
async function processWithErrorHandling(data) {
  try {
    // Validate input
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid input data format');
    }
    
    // Process data
    const result = await processData(data);
    
    // Log success
    console.log(`✅ Successfully processed ${result.count} records`);
    
    return result;
  } catch (error) {
    // Log error with context
    console.error(`❌ Processing failed: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
    
    // Re-throw for upstream handling
    throw error;
  }
}
    
Logging Standards
Use emoji prefixes for log levels (✅ success, ❌ error, ⚠️ warning, 🔄 processing)
Include contextual information in log messages
Log progress for long-running operations
Use consistent formatting across all scripts
3. Testing Procedures
3.1 Testing Framework
The project uses a combination of unit tests, integration tests, and data validation tests to ensure reliability.

Test Structure
tests/
├── unit/
│   ├── validation.test.js
│   ├── processing.test.js
│   └── mapping.test.js
├── integration/
│   ├── database.test.js
│   ├── data-flow.test.js
│   └── multi-source.test.js
└── data/
    ├── data-quality.test.js
    ├── completeness.test.js
    └── consistency.test.js
    
Running Tests
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:data

# Run tests with coverage
npm run test:coverage
    
3.2 Data Validation Testing
Required Data Quality Tests
Completeness: Verify expected record counts by source
Consistency: Cross-validate data between sources
Accuracy: Check for impossible values and outliers
Timeliness: Ensure data freshness and update frequency
Test Data Setup
# Create test database
createdb industry_intelligence_test

# Run test data setup
NODE_ENV=test npm run setup-test-data

# Run data validation tests
npm run test:data
    
3.3 Performance Testing
Performance Benchmarks
Operation	Expected Time	Memory Usage	Test Command
Database Query (1000 records)	< 100ms	< 50MB	npm run test:query-performance
CSV Processing (10,000 records)	< 30 seconds	< 200MB	npm run test:processing-performance
Data Validation (full database)	< 5 minutes	< 500MB	npm run test:validation-performance
4. Git Workflow and Version Control
4.1 Branching Strategy
Branch Types
main: Production-ready code
develop: Integration branch for features
feature/: New features (e.g., feature/api-endpoints)
bugfix/: Bug fixes (e.g., bugfix/validation-error)
hotfix/: Critical production fixes
Workflow Process
# Create feature branch
git checkout -b feature/new-validation-system

# Make changes and commit
git add .
git commit -m "feat: add comprehensive data validation system"

# Push branch
git push origin feature/new-validation-system

# Create pull request
# After review and approval, merge to develop
    
4.2 Commit Message Standards
Commit Message Format
type(scope): description

[optional body]

[optional footer]
    
Commit Types
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting, etc.)
refactor: Code refactoring
test: Adding or modifying tests
chore: Maintenance tasks
Examples
feat(processing): add IMF data processing pipeline
fix(validation): correct country code validation logic
docs(api): update API documentation for new endpoints
refactor(database): optimize query performance for large datasets
    
5. Code Review Process
5.1 Review Requirements
Before Submitting Pull Request
Ensure all tests pass locally
Run data validation checks
Update documentation if necessary
Follow coding standards and conventions
Include meaningful commit messages
Pull Request Checklist
Clear description of changes
Link to related issues
Screenshots or examples if applicable
Performance impact assessment
Database migration scripts if needed
5.2 Review Criteria
Code Quality Checks
Functionality: Does the code work as intended?
Security: Are there any security vulnerabilities?
Performance: Is the code efficient and scalable?
Maintainability: Is the code readable and well-structured?
Testing: Are there adequate tests covering the changes?
Data Quality Checks
Validation: Are input validations comprehensive?
Error Handling: Are errors handled gracefully?
Data Integrity: Are database constraints respected?
Performance: Are queries optimized for large datasets?
6. Documentation Standards
6.1 Code Documentation
Function Documentation
/**
 * Validates and processes country code data
 * @param {string} countryCode - ISO 3-letter country code
 * @param {string} source - Data source identifier ('WB', 'OECD', 'IMF')
 * @returns {Object} Validation result with normalized code and metadata
 * @throws {Error} When country code is invalid or unsupported
 */
function validateCountryCode(countryCode, source) {
  // Implementation
}
    
Script Documentation
/**
 * IMF World Economic Outlook Data Processing Script
 * 
 * Processes IMF WEO CSV data and integrates it into the multi-source database.
 * Handles data validation, country/indicator mapping, and batch processing.
 * 
 * Usage: npm run process-imf -- --url "IMF_CSV_URL"
 * 
 * Dependencies:
 * - Pre-populated country and indicator mappings
 * - Active database connection
 * - Valid IMF CSV format
 * 
 * Output:
 * - Processed records in imf_indicators table
 * - Validation report and statistics
 * - Error log for failed records
 */
    
6.2 README Updates
When to Update README
Adding new scripts or commands
Changing installation procedures
Adding new data sources
Updating system requirements
Adding new features or capabilities
Documentation Structure
docs/
├── README.md              # Main project documentation
├── ARCHITECTURE.md        # System architecture
├── DATABASE_SCHEMA.md     # Database documentation
├── API.md                 # API documentation
├── DEPLOYMENT.md          # Deployment guide
├── DEVELOPMENT.md         # This document
└── examples/
    ├── basic-usage.md
    ├── advanced-queries.md
    └── data-analysis.md
    
7. Debugging and Troubleshooting
7.1 Common Issues and Solutions
Database Connection Issues
Issue: "Connection refused" or "Database does not exist"
Solution: Verify PostgreSQL is running and DATABASE_URL is correct
Memory Issues During Processing
Issue: "JavaScript heap out of memory"
Solution: Increase Node.js memory limit: node --max-old-space-size=4096 script.js
Data Validation Failures
Issue: "Invalid data format" or "Constraint violation"
Solution: Check data source format and mapping configurations
7.2 Debugging Tools
Development Commands
# Enable debug logging
DEBUG=* npm run process-imf

# Run with increased verbosity
npm run process-imf -- --verbose

# Dry run (validation only)
npm run process-imf -- --dry-run

# Process subset for testing
npm run process-imf -- --limit 1000
    
Database Debugging
# Check database connection
npm run verify

# Analyze database performance
npm run analyze

# Check data quality
npm run validate
    
8. Contributing Guidelines
8.1 Getting Started
First-Time Contributors
Fork the repository
Set up local development environment
Read through existing code and documentation
Start with small, well-defined issues
Ask questions in issues or discussions
Finding Issues to Work On
Look for issues labeled "good first issue"
Check the project roadmap for planned features
Review open bug reports
Propose improvements to documentation
8.2 Contribution Process
Step-by-Step Process
Create or comment on an issue to discuss the change
Fork the repository and create a feature branch
Make your changes following coding standards
Write or update tests for your changes
Update documentation if necessary
Test your changes thoroughly
Submit a pull request with clear description
Respond to review feedback
Ensure all checks pass before merge
8.3 Quality Assurance
Pre-Submission Checklist
All tests pass locally
Code follows project conventions
Documentation is updated
No console.log statements in production code
Error handling is comprehensive
Performance impact is considered
Important: Never commit sensitive information such as database credentials, API keys, or personal data. Use environment variables for configuration.
9. Development Tools and Extensions
9.1 Recommended VS Code Extensions
Essential Extensions
PostgreSQL: Database management and queries
ESLint: JavaScript linting
Prettier: Code formatting
GitLens: Enhanced Git capabilities
Thunder Client: API testing
Helpful Extensions
CSV Viewer: Better CSV file handling
Rainbow CSV: CSV syntax highlighting
SQL Tools: Database connections
Node.js Modules Intellisense: Better autocomplete
9.2 Development Scripts
Useful Development Commands
# Watch for file changes during development
npm run dev

# Run linting checks
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Generate documentation
npm run docs
    
10. Support and Resources
10.1 Getting Help
Available Resources
Documentation: Check project documentation first
GitHub Issues: Search existing issues or create new ones
GitHub Discussions: Ask questions and share ideas
Code Comments: Review inline documentation
Creating Good Issues
Use clear, descriptive titles
Include system information and versions
Provide steps to reproduce problems
Include relevant code snippets or logs
Tag issues appropriately
10.2 Community Guidelines
Communication Standards
Be respectful and professional
Provide constructive feedback
Help others learn and improve
Follow code of conduct
Share knowledge and best practices
Note: This development guide is a living document. Please help keep it updated as the project evolves by suggesting improvements and corrections.
Last updated: July 2025
Version: 1.0.0
