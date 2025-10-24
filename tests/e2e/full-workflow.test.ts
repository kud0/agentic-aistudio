/**
 * End-to-End Workflow Test
 * Tests complete workflow from project creation to analytics
 */

import {
  createTestUser,
  createTestProject,
  cleanupTestData,
  mockGrokAPI,
  generateTestBrief,
  createTestClient,
} from '../helpers/test-setup';

describe('E2E: Complete AI Workflow', () => {
  let testUser: any;
  let testProject: any;
  const startTime = Date.now();

  beforeAll(async () => {
    // Mock Grok API for all requests
    mockGrokAPI({ success: true });

    // Create test user and project
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.user.id);

    console.log('Starting E2E workflow test...');
  });

  afterAll(async () => {
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`E2E workflow completed in ${totalTime.toFixed(2)}s`);

    await cleanupTestData(testUser.user.id);
  });

  it('should complete full AI workflow under 5 minutes', async () => {
    const workflowStart = Date.now();

    // Step 1: Create project (already done in beforeAll)
    expect(testProject).toBeDefined();
    expect(testProject.id).toBeDefined();
    console.log('✓ Step 1: Project created');

    // Step 2: Generate research
    console.log('Starting Step 2: Generate research...');
    const researchStart = Date.now();

    const researchResponse = await fetch('http://localhost:3000/api/ai/research', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: testProject.id,
        brief: generateTestBrief(),
      }),
    });

    expect(researchResponse.ok).toBe(true);
    const researchData = await researchResponse.json();
    expect(researchData.success).toBe(true);
    expect(researchData.data.research).toBeDefined();

    const researchTime = Date.now() - researchStart;
    console.log(`✓ Step 2: Research generated (${researchTime}ms)`);

    // Step 3: Generate strategy
    console.log('Starting Step 3: Generate strategy...');
    const strategyStart = Date.now();

    const strategyResponse = await fetch('http://localhost:3000/api/ai/strategy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: testProject.id,
        research: researchData.data.research,
      }),
    });

    expect(strategyResponse.ok).toBe(true);
    const strategyData = await strategyResponse.json();
    expect(strategyData.success).toBe(true);
    expect(strategyData.data.strategy).toBeDefined();

    const strategyTime = Date.now() - strategyStart;
    console.log(`✓ Step 3: Strategy generated (${strategyTime}ms)`);

    // Step 4: Generate critique
    console.log('Starting Step 4: Generate critique...');
    const critiqueStart = Date.now();

    const critiqueResponse = await fetch('http://localhost:3000/api/ai/critique', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: testProject.id,
        strategy: strategyData.data.strategy,
      }),
    });

    expect(critiqueResponse.ok).toBe(true);
    const critiqueData = await critiqueResponse.json();
    expect(critiqueData.success).toBe(true);
    expect(critiqueData.data.critique).toBeDefined();

    const critiqueTime = Date.now() - critiqueStart;
    console.log(`✓ Step 4: Critique generated (${critiqueTime}ms)`);

    // Step 5: Check analytics
    console.log('Starting Step 5: Check analytics...');
    const analyticsResponse = await fetch(
      `http://localhost:3000/api/analytics/usage?userId=${testUser.user.id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
        },
      }
    );

    expect(analyticsResponse.ok).toBe(true);
    const analyticsData = await analyticsResponse.json();
    expect(analyticsData.success).toBe(true);
    expect(analyticsData.data.totalCost).toBeGreaterThan(0);
    expect(analyticsData.data.totalTokens).toBeGreaterThan(0);

    console.log(`✓ Step 5: Analytics verified`);
    console.log(`  - Total cost: $${analyticsData.data.totalCost.toFixed(4)}`);
    console.log(`  - Total tokens: ${analyticsData.data.totalTokens}`);

    // Step 6: Verify quality scores
    console.log('Starting Step 6: Verify quality scores...');
    const supabase = createTestClient();

    const { data: outputs } = await supabase
      .from('outputs')
      .select('*, quality_score')
      .eq('project_id', testProject.id);

    expect(outputs).toBeDefined();
    expect(outputs!.length).toBeGreaterThan(0);

    outputs!.forEach((output: any) => {
      if (output.quality_score) {
        expect(output.quality_score).toBeGreaterThanOrEqual(0);
        expect(output.quality_score).toBeLessThanOrEqual(100);

        if (output.quality_score < 60) {
          console.log(`  ⚠ Low quality score detected: ${output.quality_score}`);
        }
      }
    });

    console.log(`✓ Step 6: Quality scores verified`);

    // Measure total workflow time
    const totalTime = Date.now() - workflowStart;
    console.log(`\n✓ Complete workflow time: ${(totalTime / 1000).toFixed(2)}s`);

    // Assertions
    expect(totalTime).toBeLessThan(5 * 60 * 1000); // < 5 minutes
    expect(analyticsData.data.totalCost).toBeLessThan(2.0); // < $2

    console.log('\n✓ E2E workflow test PASSED');
  });

  it('should handle concurrent workflow executions', async () => {
    console.log('\nStarting concurrent workflow test...');

    const workflowCount = 3;
    const workflows = Array.from({ length: workflowCount }, async (_, i) => {
      console.log(`Starting workflow ${i + 1}/${workflowCount}...`);

      // Create separate project for each workflow
      const project = await createTestProject(testUser.user.id);

      // Execute research only (for speed)
      const response = await fetch('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          brief: `Concurrent test workflow ${i + 1}`,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);

      console.log(`✓ Workflow ${i + 1} completed`);
      return data;
    });

    const results = await Promise.all(workflows);
    expect(results).toHaveLength(workflowCount);

    console.log(`✓ ${workflowCount} concurrent workflows completed`);
  });

  it('should maintain data consistency across workflow', async () => {
    console.log('\nVerifying data consistency...');

    const supabase = createTestClient();

    // Check project exists
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', testProject.id)
      .single();

    expect(project).toBeDefined();
    expect(project!.user_id).toBe(testUser.user.id);

    // Check outputs exist
    const { data: outputs } = await supabase
      .from('outputs')
      .select('*')
      .eq('project_id', testProject.id);

    expect(outputs).toBeDefined();
    expect(outputs!.length).toBeGreaterThan(0);

    // Check usage logs exist
    const { data: logs } = await supabase
      .from('llm_usage_logs')
      .select('*')
      .eq('project_id', testProject.id)
      .eq('user_id', testUser.user.id);

    expect(logs).toBeDefined();
    expect(logs!.length).toBeGreaterThan(0);

    // Verify all logs have proper metadata
    logs!.forEach((log: any) => {
      expect(log.provider).toBe('grok');
      expect(log.model).toBeDefined();
      expect(log.cost_usd).toBeGreaterThan(0);
      expect(log.total_tokens).toBeGreaterThan(0);
      expect(log.success).toBe(true);
    });

    console.log('✓ Data consistency verified');
  });

  it('should track workflow performance metrics', async () => {
    console.log('\nAnalyzing performance metrics...');

    const supabase = createTestClient();

    const { data: logs } = await supabase
      .from('llm_usage_logs')
      .select('latency_ms, cost_usd, total_tokens, provider, model')
      .eq('project_id', testProject.id)
      .eq('user_id', testUser.user.id);

    expect(logs).toBeDefined();
    expect(logs!.length).toBeGreaterThan(0);

    // Calculate metrics
    const avgLatency = logs!.reduce((sum, log: any) => sum + log.latency_ms, 0) / logs!.length;
    const totalCost = logs!.reduce((sum, log: any) => sum + Number(log.cost_usd), 0);
    const totalTokens = logs!.reduce((sum, log: any) => sum + log.total_tokens, 0);

    console.log('\nPerformance Metrics:');
    console.log(`  - Average latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`  - Total cost: $${totalCost.toFixed(4)}`);
    console.log(`  - Total tokens: ${totalTokens}`);
    console.log(`  - Cost per 1K tokens: $${((totalCost / totalTokens) * 1000).toFixed(4)}`);

    // Verify all using Grok
    logs!.forEach((log: any) => {
      expect(log.provider).toBe('grok');
    });

    console.log('✓ Performance metrics verified');
  });

  it('should handle workflow errors gracefully', async () => {
    console.log('\nTesting error handling...');

    // Test with invalid brief
    const response = await fetch('http://localhost:3000/api/ai/research', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: testProject.id,
        brief: '', // Empty brief
      }),
    });

    expect([400, 500]).toContain(response.status);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();

    console.log('✓ Error handling verified');
  });
});
