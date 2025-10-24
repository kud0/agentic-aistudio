#!/usr/bin/env node

/**
 * Quality System Verification Script
 * Verifies that all components of the quality & analytics system are working
 *
 * Usage:
 *   npm run verify:quality
 */

import { qualityScorer } from '../lib/ai/quality-scorer';
import { healthMonitor } from '../lib/ai/health-monitor';
import { analyticsQueries } from '../lib/ai/analytics-queries';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * Test quality scorer
 */
async function testQualityScorer(): Promise<TestResult> {
  const start = Date.now();
  console.log('\n🧪 Testing Quality Scorer...');

  try {
    // Test with sample content
    const sampleContent = `
      This is a comprehensive research analysis covering market trends,
      competitive landscape, and strategic recommendations for Q4 2025.
      The analysis includes data-driven insights and actionable next steps.
    `;

    const result = await qualityScorer.scoreOutput(
      sampleContent,
      'research',
      'test-output-id'
    );

    if (!result.success) {
      throw new Error(`Scoring failed: ${result.error}`);
    }

    if (!result.score) {
      throw new Error('No score returned');
    }

    // Validate score structure
    if (
      typeof result.score.completeness !== 'number' ||
      typeof result.score.coherence !== 'number' ||
      typeof result.score.actionability !== 'number' ||
      typeof result.score.overall !== 'number'
    ) {
      throw new Error('Invalid score structure');
    }

    console.log(`  ✓ Overall score: ${result.score.overall}/100`);
    console.log(`  ✓ Completeness: ${result.score.completeness}/100`);
    console.log(`  ✓ Coherence: ${result.score.coherence}/100`);
    console.log(`  ✓ Actionability: ${result.score.actionability}/100`);
    console.log(`  ✓ Flagged: ${result.score.flagged_for_review}`);

    return {
      name: 'Quality Scorer',
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    console.error('  ✗ Quality Scorer failed:', error);
    return {
      name: 'Quality Scorer',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Test health monitor
 */
async function testHealthMonitor(): Promise<TestResult> {
  const start = Date.now();
  console.log('\n🧪 Testing Health Monitor...');

  try {
    // Test single provider check
    const grokResult = await healthMonitor.checkHealth('grok');

    if (!grokResult.success) {
      throw new Error(`Health check failed: ${grokResult.error}`);
    }

    console.log(`  ✓ Grok status: ${grokResult.health?.status || 'unknown'}`);

    // Test all providers check
    const allResults = await healthMonitor.checkAllProviders();
    console.log(`  ✓ Checked ${allResults.length} providers`);

    // Test getting statuses
    const statuses = await healthMonitor.getHealthStatuses();
    console.log(`  ✓ Retrieved ${statuses.length} health statuses`);

    return {
      name: 'Health Monitor',
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    console.error('  ✗ Health Monitor failed:', error);
    return {
      name: 'Health Monitor',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Test analytics queries
 */
async function testAnalyticsQueries(): Promise<TestResult> {
  const start = Date.now();
  console.log('\n🧪 Testing Analytics Queries...');

  try {
    // Test summary
    const summary = await analyticsQueries.getSummary('7d');
    console.log(`  ✓ Summary: $${summary.total_cost} / ${summary.total_requests} requests`);

    // Test breakdown
    const breakdown = await analyticsQueries.getCostBreakdown('7d');
    console.log(
      `  ✓ Breakdown: ${Object.keys(breakdown.by_provider).length} providers, ${
        Object.keys(breakdown.by_model).length
      } models`
    );

    // Test expensive prompts
    const expensive = await analyticsQueries.getExpensivePrompts(5);
    console.log(`  ✓ Found ${expensive.length} expensive prompts`);

    // Test quality distribution
    const quality = await analyticsQueries.getQualityDistribution('7d');
    console.log(
      `  ✓ Quality: ${quality.excellent} excellent, ${quality.good} good, ${quality.fair} fair, ${quality.poor} poor`
    );

    // Test cost trend
    const trend = await analyticsQueries.getCostTrend('7d', 'day');
    console.log(`  ✓ Cost trend: ${trend.length} data points`);

    // Test cache hit rate
    const cacheHitRate = await analyticsQueries.getCacheHitRate('7d');
    console.log(`  ✓ Cache hit rate: ${cacheHitRate}%`);

    return {
      name: 'Analytics Queries',
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    console.error('  ✗ Analytics Queries failed:', error);
    return {
      name: 'Analytics Queries',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Print summary
 */
function printSummary(results: TestResult[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${icon} ${result.name} ${duration}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log('-'.repeat(60));

  if (failed === 0) {
    console.log('\n✅ All tests passed! Quality & Analytics system is working.');
    return 0;
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
    return 1;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Quality & Analytics System Verification');
  console.log('==========================================\n');

  try {
    // Run all tests
    results.push(await testQualityScorer());
    results.push(await testHealthMonitor());
    results.push(await testAnalyticsQueries());

    // Print summary and exit
    const exitCode = printSummary(results);
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ Fatal error during verification:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as runVerification };
