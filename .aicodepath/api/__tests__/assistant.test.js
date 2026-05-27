/**
 * Tests for Assistant API Routes
 *
 * These tests can run with or without a real Anthropic API key.
 * Set ANTHROPIC_API_KEY in environment for integration tests.
 */

// Set up mocks before importing anything else
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-sk-ant-test123';

// Mock logger
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock path-resolver
jest.mock('../../lib/path-resolver', () => ({
  getDbPath: () => '/tmp/test-aicodepath.db',
}));

// Mock better-sqlite3
jest.mock('better-sqlite3');

let mockCreate;

// Mock Anthropic SDK globally before routes are loaded
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: class MockAnthropic {
      constructor() {
        this.messages = {
          create: (...args) => mockCreate(...args),
        };
      }
    },
  };
});

const request = require('supertest');
const express = require('express');

// Create a test app with our routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Import routes after mocking
  const assistantRoutes = require('../routes/assistant');
  app.use('/api/assistant', assistantRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      error: err.message,
    });
  });

  return app;
};

describe('Assistant API Routes', () => {
  let app;

  beforeEach(() => {
    // Reset mock before each test
    mockCreate = jest.fn();
    app = createTestApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/assistant/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/assistant/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('apiConfigured', true);
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should indicate API key is configured', async () => {
      const response = await request(app)
        .get('/api/assistant/health')
        .expect(200);

      expect(response.body.apiKeyPresent).toBe(true);
    });
  });

  describe('GET /api/assistant/context', () => {
    test('should return context for project', async () => {
      const response = await request(app)
        .get('/api/assistant/context?projectName=TestProject')
        .expect(200);

      expect(response.body).toHaveProperty('context');
      expect(response.body).toHaveProperty('projectName', 'TestProject');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.context).toContain('TestProject');
    });

    test('should use default project name', async () => {
      const response = await request(app)
        .get('/api/assistant/context')
        .expect(200);

      expect(response.body.projectName).toBe('AICodePath');
    });
  });

  describe('POST /api/assistant/chat', () => {
    describe('Request validation', () => {
      test('should require message field', async () => {
        const response = await request(app)
          .post('/api/assistant/chat')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Message is required and must be a string');
      });

      test('should reject empty message', async () => {
        const response = await request(app)
          .post('/api/assistant/chat')
          .send({ message: '   ' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Message cannot be empty');
      });

      test('should reject oversize message', async () => {
        const longMessage = 'x'.repeat(10001);

        const response = await request(app)
          .post('/api/assistant/chat')
          .send({ message: longMessage })
          .expect(400);

        expect(response.body.error).toContain('Message too large');
      });

      test('should reject non-string message', async () => {
        const response = await request(app)
          .post('/api/assistant/chat')
          .send({ message: 123 })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Message is required and must be a string');
      });
    });

    describe('With valid request', () => {
      test('should return response structure', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Test response from Claude' }],
          model: 'claude-sonnet-4-5-20250929',
          usage: { input_tokens: 10, output_tokens: 5 },
        });

        const response = await request(app)
          .post('/api/assistant/chat')
          .send({
            message: 'Hello, how are you?',
            projectName: 'TestProject',
          })
          .expect(200);

        expect(response.body).toHaveProperty('response', 'Test response from Claude');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('model');
        expect(response.body).toHaveProperty('usage');
      });

      test('should use default project name', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Default project response' }],
          model: 'claude-sonnet-4-5-20250929',
        });

        const response = await request(app)
          .post('/api/assistant/chat')
          .send({ message: 'Test message' })
          .expect(200);

        expect(response.body).toHaveProperty('response', 'Default project response');
      });

      test('should include conversation history', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Response with history' }],
          model: 'claude-sonnet-4-5-20250929',
        });

        const history = [
          { role: 'user', content: 'First message', timestamp: '2024-01-01T00:00:00.000Z' },
          { role: 'assistant', content: 'First response', timestamp: '2024-01-01T00:00:01.000Z' },
        ];

        await request(app)
          .post('/api/assistant/chat')
          .send({
            message: 'Second message',
            history,
          })
          .expect(200);

        // Verify history was passed to API (last 10 messages)
        expect(mockCreate).toHaveBeenCalled();
        const callArgs = mockCreate.mock.calls[0][0];
        expect(callArgs.messages).toHaveLength(3); // 2 history + 1 new
      });
    });

    describe('Error handling', () => {
      test('should handle Anthropic API errors', async () => {
        mockCreate.mockRejectedValue(new Error('API connection failed'));

        const response = await request(app)
          .post('/api/assistant/chat')
          .send({ message: 'Test error' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Failed to generate response');
        expect(response.body).toHaveProperty('details', 'API connection failed');
      });

      test('should handle authentication errors', async () => {
        const authError = Object.assign(new Error('Invalid API key'), { type: 'authentication_error' });
        mockCreate.mockRejectedValue(authError);

        const response = await request(app)
          .post('/api/assistant/chat')
          .send({ message: 'Test' })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication failed');
      });

      test('should handle rate limit errors', async () => {
        const rateError = Object.assign(new Error('Rate limit exceeded'), { type: 'rate_limit_error' });
        mockCreate.mockRejectedValue(rateError);

        const response = await request(app)
          .post('/api/assistant/chat')
          .send({ message: 'Test' })
          .expect(429);

        expect(response.body).toHaveProperty('error', 'Rate limit exceeded');
      });
    });
  });

  describe('POST /api/assistant/expand', () => {
    describe('Request validation', () => {
      test('should require description field', async () => {
        const response = await request(app)
          .post('/api/assistant/expand')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Description is required and must be a string');
      });

      test('should reject empty description', async () => {
        const response = await request(app)
          .post('/api/assistant/expand')
          .send({ description: '   ' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Description cannot be empty');
      });

      test('should reject oversize description', async () => {
        const longDescription = 'x'.repeat(5001);

        const response = await request(app)
          .post('/api/assistant/expand')
          .send({ description: longDescription })
          .expect(400);

        expect(response.body.error).toContain('Description too large');
      });
    });

    describe('With valid request', () => {
      test('should return feature array', async () => {
        mockCreate.mockResolvedValue({
          content: [{
            text: JSON.stringify({
              features: [
                {
                  title: 'Feature 1',
                  description: 'Description 1',
                  priority: 'high',
                  dependencies: [],
                },
                {
                  title: 'Feature 2',
                  description: 'Description 2',
                  priority: 'medium',
                  dependencies: ['Feature 1'],
                },
              ],
            }),
          }],
          model: 'claude-sonnet-4-5-20250929',
        });

        const response = await request(app)
          .post('/api/assistant/expand')
          .send({
            description: 'Add user authentication with OAuth',
          })
          .expect(200);

        expect(response.body).toHaveProperty('features');
        expect(response.body.features).toBeInstanceOf(Array);
        expect(response.body.features).toHaveLength(2);
        expect(response.body.features[0]).toHaveProperty('title', 'Feature 1');
        expect(response.body.features[0]).toHaveProperty('description');
        expect(response.body.features[0]).toHaveProperty('priority');
        expect(response.body.features[0]).toHaveProperty('dependencies');
      });

      test('should extract JSON from AI response with extra text', async () => {
        mockCreate.mockResolvedValue({
          content: [{
            text: `Here are the suggested features:

\`\`\`json
{
  "features": [
    {
      "title": "Test Feature",
      "description": "Test description",
      "priority": "high",
      "dependencies": []
    }
  ]
}
\`\`\`

These features will help implement your requirements.`,
          }],
          model: 'claude-sonnet-4-5-20250929',
        });

        const response = await request(app)
          .post('/api/assistant/expand')
          .send({ description: 'Test' })
          .expect(200);

        expect(response.body.features).toHaveLength(1);
        expect(response.body.features[0].title).toBe('Test Feature');
      });
    });

    describe('Error handling', () => {
      test('should handle invalid JSON response', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'No JSON here, just plain text' }],
          model: 'claude-sonnet-4-5-20250929',
        });

        const response = await request(app)
          .post('/api/assistant/expand')
          .send({ description: 'Test' })
          .expect(502);

        expect(response.body).toHaveProperty('error', 'Failed to parse AI response');
      });

      test('should handle malformed feature structure', async () => {
        mockCreate.mockResolvedValue({
          content: [{
            text: JSON.stringify({
              features: [
                { title: 'Missing fields' }, // Missing description and priority
              ],
            }),
          }],
          model: 'claude-sonnet-4-5-20250929',
        });

        const response = await request(app)
          .post('/api/assistant/expand')
          .send({ description: 'Test' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Failed to generate features');
      });
    });
  });
});
