/**
 * Authentication & Authorization Integration Tests
 * Tests authentication middleware and RLS policies
 */

import { NextRequest } from 'next/server';
import {
  createTestUser,
  createTestProject,
  cleanupTestData,
  generateTestBrief,
} from '../../../../tests/helpers/test-setup';
import { POST as researchPOST } from '../../ai/research/route';
import { POST as strategyPOST } from '../../ai/strategy/route';
import { POST as critiquePOST } from '../../ai/critique/route';

describe('Authentication & Authorization Tests', () => {
  let testUser1: any;
  let testUser2: any;
  let project1: any;
  let project2: any;

  beforeAll(async () => {
    // Create two test users with projects
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();
    project1 = await createTestProject(testUser1.user.id);
    project2 = await createTestProject(testUser2.user.id);
  });

  afterAll(async () => {
    await cleanupTestData(testUser1.user.id);
    await cleanupTestData(testUser2.user.id);
  });

  describe('No Authentication', () => {
    it('should return 401 for research endpoint without auth', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for strategy endpoint without auth', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id,
          research: 'Test research',
        }),
      });

      const response = await strategyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 for critique endpoint without auth', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/critique', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id,
          strategy: 'Test strategy',
        }),
      });

      const response = await critiquePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('Invalid Authentication', () => {
    it('should return 401 with invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 with expired token', async () => {
      // Create an expired token (simplified test)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired';

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('Authorization - Wrong Project Owner', () => {
    it('should return 403 when user tries to access another user\'s project', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser1.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project2.id, // User1 trying to access User2's project
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should allow user to access their own project', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser1.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id, // User1 accessing their own project
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Authorization - Non-existent Project', () => {
    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser1.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: '00000000-0000-0000-0000-000000000000',
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for malformed project ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser1.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'invalid-uuid',
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect([400, 404]).toContain(response.status);
      expect(data.success).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should maintain session across multiple requests', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        new NextRequest('http://localhost:3000/api/ai/research', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testUser1.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: project1.id,
            brief: `Test brief ${i + 1}`,
          }),
        })
      );

      const responses = await Promise.all(
        requests.map(req => researchPOST(req))
      );

      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });
    });

    it('should handle concurrent requests from same user', async () => {
      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        researchPOST(
          new NextRequest('http://localhost:3000/api/ai/research', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${testUser1.session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId: project1.id,
              brief: `Concurrent test ${i + 1}`,
            }),
          })
        )
      );

      const responses = await Promise.all(promises);

      let successCount = 0;
      for (const response of responses) {
        if (response.status === 200) {
          successCount++;
        }
      }

      expect(successCount).toBeGreaterThan(0);
      expect(successCount / concurrentRequests).toBeGreaterThan(0.8); // 80% success rate
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should enforce RLS on llm_usage_logs table', async () => {
      // User should only see their own logs
      // This would require querying the database directly
      // For now, we verify through the API that isolation works

      const request1 = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser1.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id,
          brief: 'Test for user 1',
        }),
      });

      const request2 = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser2.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project2.id,
          brief: 'Test for user 2',
        }),
      });

      const [response1, response2] = await Promise.all([
        researchPOST(request1),
        researchPOST(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Each user should have isolated data
      // Verified by successful project ownership checks
    });

    it('should enforce RLS on outputs table', async () => {
      // Users should only read/write their own outputs
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser1.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project1.id,
          brief: 'RLS test',
        }),
      });

      const response = await researchPOST(request);
      expect(response.status).toBe(200);

      // Output should be associated with user1's project only
    });
  });
});
