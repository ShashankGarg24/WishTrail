/**
 * Quick Search Performance Test
 * 
 * This script tests the optimized search endpoints to verify they work correctly
 * and measure response times.
 * 
 * Usage:
 * 1. Start your API server: npm run dev
 * 2. Get a valid JWT token from login
 * 3. Update AUTH_TOKEN below
 * 4. Run: node scripts/test-search-performance.js
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_JWT_TOKEN_HERE';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testEndpoint(name, endpoint, params = {}) {
  const start = Date.now();
  try {
    const response = await axios.get(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      params,
      timeout: 10000
    });
    
    const duration = Date.now() - start;
    const resultCount = 
      response.data.data.users?.length || 
      response.data.data.goals?.length || 
      response.data.data?.length || 0;
    
    const fromCache = response.data.fromCache ? ' (cached)' : '';
    const status = duration < 100 ? '🚀' : duration < 500 ? '✅' : '⚠️';
    
    console.log(
      `${status} ${colors.bright}${name}${colors.reset}: ` +
      `${colors.cyan}${duration}ms${colors.reset}${fromCache} - ` +
      `${colors.green}${resultCount} results${colors.reset}`
    );
    
    return { success: true, duration, resultCount };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(
      `${colors.red}❌ ${name}: ${error.message}${colors.reset} ` +
      `(${duration}ms)`
    );
    return { success: false, duration, error: error.message };
  }
}

async function runTests() {
  console.log(`\n${colors.bright}🔍 Search Performance Tests${colors.reset}\n`);
  console.log(`API URL: ${colors.blue}${API_URL}${colors.reset}`);
  console.log(`Auth: ${AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE' ? colors.red + '⚠️  Please set AUTH_TOKEN!' : colors.green + '✅ Token set'}${colors.reset}\n`);

  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log(`${colors.yellow}Please update AUTH_TOKEN in the script or set environment variable.${colors.reset}\n`);
    process.exit(1);
  }

  const results = [];

  // User Search Tests
  console.log(`${colors.bright}📱 User Search Tests${colors.reset}`);
  results.push(await testEndpoint('User search by name', '/users/search', { search: 'john', limit: 20 }));
  results.push(await testEndpoint('User search by username', '/users/search', { search: 'user', limit: 20 }));
  results.push(await testEndpoint('User search by interest', '/users/search', { interest: 'fitness', limit: 20 }));
  results.push(await testEndpoint('User combined search', '/users/search', { search: 'test', interest: 'health', limit: 20 }));
  console.log('');

  // Goal Search Tests
  console.log(`${colors.bright}🎯 Goal Search Tests${colors.reset}`);
  results.push(await testEndpoint('Goal search by title', '/goals/search', { q: 'run', limit: 20 }));
  results.push(await testEndpoint('Goal search by category', '/goals/search', { category: 'Health & Fitness', limit: 20 }));
  results.push(await testEndpoint('Goal search by interest', '/goals/search', { interest: 'fitness', limit: 20 }));
  results.push(await testEndpoint('Goal combined search', '/goals/search', { q: 'learn', category: 'Education & Learning', limit: 20 }));
  console.log('');

  // Community Search Tests
  console.log(`${colors.bright}👥 Community Search Tests${colors.reset}`);
  results.push(await testEndpoint('Community text search', '/communities/discover', { search: 'fitness', limit: 20 }));
  results.push(await testEndpoint('Community by interests', '/communities/discover', { interests: 'fitness,health', limit: 20 }));
  results.push(await testEndpoint('Community combined', '/communities/discover', { search: 'running', interests: 'fitness', limit: 20 }));
  console.log('');

  // Pagination Tests
  console.log(`${colors.bright}📄 Pagination Tests${colors.reset}`);
  results.push(await testEndpoint('Users page 2', '/users/search', { search: 'test', page: 2, limit: 10 }));
  results.push(await testEndpoint('Goals page 3', '/goals/search', { q: 'goal', page: 3, limit: 10 }));
  console.log('');

  // Cache Tests (run same queries again)
  console.log(`${colors.bright}💾 Cache Tests (repeat queries)${colors.reset}`);
  results.push(await testEndpoint('User search (cached)', '/users/search', { interest: 'fitness', limit: 20 }));
  results.push(await testEndpoint('Goal search (cached)', '/goals/search', { interest: 'fitness', limit: 20 }));
  console.log('');

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const fastQueries = results.filter(r => r.success && r.duration < 100).length;
  const slowQueries = results.filter(r => r.success && r.duration >= 500).length;

  console.log(`${colors.bright}📊 Summary${colors.reset}`);
  console.log(`Total tests: ${results.length}`);
  console.log(`${colors.green}✅ Successful: ${successful}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.cyan}Average response time: ${Math.round(avgDuration)}ms${colors.reset}`);
  console.log(`🚀 Fast queries (< 100ms): ${fastQueries}`);
  console.log(`⚠️  Slow queries (>= 500ms): ${slowQueries}`);

  if (slowQueries > 0) {
    console.log(`\n${colors.yellow}⚠️  Some queries are slow. Consider:${colors.reset}`);
    console.log('   1. Running the migration script: node scripts/add-search-indexes.js');
    console.log('   2. Checking database indexes are created');
    console.log('   3. Ensuring database has enough resources');
  }

  if (failed > 0) {
    console.log(`\n${colors.red}❌ Some tests failed. Check:${colors.reset}`);
    console.log('   1. API server is running');
    console.log('   2. AUTH_TOKEN is valid');
    console.log('   3. Database is accessible');
  }

  if (successful === results.length && avgDuration < 100) {
    console.log(`\n${colors.green}${colors.bright}🎉 All tests passed with excellent performance!${colors.reset}\n`);
  }
}

// Run tests
console.log(`${colors.cyan}Starting search optimization tests...${colors.reset}`);
runTests().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
  process.exit(1);
});
