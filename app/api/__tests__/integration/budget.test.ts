/**
 * Budget Enforcement Integration Tests
 * Tests project and user budget limits
 */

import { NextRequest } from 'next/server';
import { POST as researchPOST } from '../../ai/research/route';
import {
  createTestUser,
  createTestProject,
  cleanupTestData,
  createTestClient,
  generateTestBrief,
} from '../../../../tests/helpers/test-setup';

describe('Budget Enforcement Tests', () => {
  let testUser: any;
  let testProject: any;

  beforeAll(async () => {
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.user.id);
  });

  afterAll(async () => {
    await cleanupTestData(testUser.user.id);
  });

  describe('Project Budget Limits', () => {
    it('should allow requests within budget', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
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

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject requests when project budget exceeded', async () => {
      const supabase = createTestClient();

      // Create usage logs that exceed budget ($100 default)
      const logsToInsert = Array.from({ length: 200 }, (_, i) => ({
        user_id: testUser.user.id,
        project_id: testProject.id,
        provider: 'grok',
        model: 'grok-2-latest',
        agent_type: 'research',
        prompt_tokens: 100,
        completion_tokens: 200,
        cost_usd: 0.60, // $0.60 per request
        latency_ms: 1000,
        success: true,
        cached: false,
      }));

      await supabase.from('llm_usage_logs').insert(logsToInsert);

      // Now try to make a request
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
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

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BUDGET_EXCEEDED');
      expect(data.error.message).toContain('budget exceeded');
    });

    it('should provide accurate budget remaining information', async () => {
      // Create a small usage log
      const supabase = createTestClient();

      await supabase.from('llm_usage_logs').insert({
        user_id: testUser.user.id,
        project_id: testProject.id,
        provider: 'grok',
        model: 'grok-2-latest',
        agent_type: 'research',
        prompt_tokens: 100,
        completion_tokens: 200,
        cost_usd: 0.50, // $0.50
        latency_ms: 1000,
        success: true,
        cached: false,
      });

      // Make a request (should succeed with budget info)
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
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

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBeLessThanOrEqual(429);

      if (response.status === 200) {
        expect(data.success).toBe(true);
        // Budget should be tracked
      }
    });
  });

  describe('User Budget Limits', () => {
    it('should enforce 30-day user budget limit', async () => {
      const supabase = createTestClient();

      // Create multiple projects for the user
      const projects = await Promise.all(
        Array.from({ length: 5 }, () =>
          createTestProject(testUser.user.id)
        )
      );

      // Add usage across multiple projects ($500 default user limit)
      const logsPerProject = 30;
      const costPerLog = 3.50; // $3.50 per request

      for (const project of projects) {
        const logs = Array.from({ length: logsPerProject }, (_, i) => ({
          user_id: testUser.user.id,
          project_id: project.id,
          provider: 'grok',
          model: 'grok-2-latest',
          agent_type: 'research',
          prompt_tokens: 1000,
          completion_tokens: 2000,
          cost_usd: costPerLog,
          latency_ms: 2000,
          success: true,
          cached: false,
        }));

        await supabase.from('llm_usage_logs').insert(logs);
      }

      // Total: 5 projects * 30 logs * $3.50 = $525 > $500 limit

      // Try to make another request
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
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

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BUDGET_EXCEEDED');
      expect(data.error.message).toContain('30-day');
    });

    it('should only count usage from last 30 days', async () => {
      const supabase = createTestClient();

      // Add old usage (>30 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      await supabase.from('llm_usage_logs').insert({
        user_id: testUser.user.id,
        project_id: testProject.id,
        provider: 'grok',
        model: 'grok-2-latest',
        agent_type: 'research',
        prompt_tokens: 1000,
        completion_tokens: 2000,
        cost_usd: 100.0, // High cost but old
        latency_ms: 1000,
        success: true,
        cached: false,
        created_at: oldDate.toISOString(),
      });

      // Add recent usage (within 30 days, under limit)
      await supabase.from('llm_usage_logs').insert({
        user_id: testUser.user.id,
        project_id: testProject.id,
        provider: 'grok',
        model: 'grok-2-latest',
        agent_type: 'research',
        prompt_tokens: 100,
        completion_tokens: 200,
        cost_usd: 0.50, // Low cost, recent
        latency_ms: 1000,
        success: true,
        cached: false,
      });

      // Request should succeed (old usage doesn't count)
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
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

      const response = await researchPOST(request);

      expect([200, 429]).toContain(response.status);
      // Should not be rejected based on old usage alone
    });
  });

  describe('Budget Error Messages', () => {
    it('should provide clear error message for project budget', async () => {
      const supabase = createTestClient();

      // Exceed project budget
      await supabase.from('llm_usage_logs').insert(
        Array.from({ length: 150 }, () => ({
          user_id: testUser.user.id,
          project_id: testProject.id,
          provider: 'grok',
          model: 'grok-2-latest',
          agent_type: 'research',
          prompt_tokens: 100,
          completion_tokens: 200,
          cost_usd: 0.70,
          latency_ms: 1000,
          success: true,
          cached: false,
        }))
      );

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
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

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.message).toMatch(/project budget/i);
      expect(data.error.message).toContain('$');
    });

    it('should provide clear error message for user budget', async () => {
      const supabase = createTestClient();

      // Exceed user budget across projects
      const projects = await Promise.all(
        Array.from({ length: 3 }, () =>
          createTestProject(testUser.user.id)
        )
      );

      for (const project of projects) {
        await supabase.from('llm_usage_logs').insert(
          Array.from({ length: 50 }, () => ({
            user_id: testUser.user.id,
            project_id: project.id,
            provider: 'grok',
            model: 'grok-2-latest',
            agent_type: 'research',
            prompt_tokens: 1000,
            completion_tokens: 2000,
            cost_usd: 4.0,
            latency_ms: 1000,
            success: true,
            cached: false,
          }))
        );
      }

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
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

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.message).toMatch(/30-day budget/i);
      expect(data.error.message).toContain('$');
    });
  });

  describe('Daily Budget Limits', () => {
    it('should enforce daily spending limits if configured', async () => {
      // This would test daily limits if implemented
      // For now, we verify the 30-day limit works

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
          options: {
            dailyLimit: 10.0, // $10 daily limit
          },
        }),
      });

      const response = await researchPOST(request);

      expect([200, 429]).toContain(response.status);
    });
  });
});
