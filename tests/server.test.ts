import { describe, test, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// ----- shared mock state -----
interface MockTable {
  maybeSingle?: Record<string, unknown> | null;
  single?: Record<string, unknown> | null;
  count?: number;
  insertResult?: Record<string, unknown>;
  list?: Record<string, unknown>[];
}

const mockTables = vi.hoisted(() => new Map<string, MockTable>());
const insertedRows = vi.hoisted(() => new Map<string, Record<string, unknown>[]>());
const updatedCalls = vi.hoisted(() => new Map<string, Record<string, unknown>[]>());

function setMockData(table: string, cfg: MockTable) {
  mockTables.set(table, cfg);
}
function resetMockData() {
  mockTables.clear();
  insertedRows.clear();
  updatedCalls.clear();
}

// ----- supabase mock -----
vi.mock('@supabase/supabase-js', () => {
  function qb(table: string) {
    const resolvers: Array<() => unknown> = [];
    resolvers.push(() => {
      const cfg = mockTables.get(table);
      const data = cfg?.list ?? cfg?.single ?? null;
      const count = cfg?.count;
      return count !== undefined ? { data, count, error: null } : { data, error: null };
    });

    // Thenable — makes `await chain` work
    const self: Record<string, unknown> = {
      then(onfulfilled: (v: unknown) => unknown) {
        return Promise.resolve(resolvers[resolvers.length - 1]()).then(onfulfilled);
      },
      catch(onrejected: (e: unknown) => unknown) {
        return Promise.resolve().then(undefined, onrejected);
      },
    };

    const chainable = ['select', 'eq', 'order', 'limit', 'range', 'from'];
    for (const m of chainable) {
      Object.defineProperty(self, m, { value: (..._args: unknown[]) => self, writable: false });
    }

    // single
    Object.defineProperty(self, 'single', {
      value: () => {
        resolvers.length = 0;
        resolvers.push(() => {
          const cfg = mockTables.get(table);
          const data = cfg?.single ?? null;
          const count = cfg?.count;
          return count !== undefined ? { data, count, error: null } : { data, error: null };
        });
        return self;
      },
      writable: false,
    });

    // maybeSingle
    Object.defineProperty(self, 'maybeSingle', {
      value: () => {
        resolvers.length = 0;
        resolvers.push(() => {
          const cfg = mockTables.get(table);
          return { data: cfg?.maybeSingle ?? null, error: null };
        });
        return self;
      },
      writable: false,
    });

    // insert → { select → { single → Promise } }
    Object.defineProperty(self, 'insert', {
      value: (values: unknown) => {
        const arr = insertedRows.get(table) ?? [];
        arr.push(values as Record<string, unknown>);
        insertedRows.set(table, arr);
        return {
          select: () => ({
            single: () => {
              const cfg = mockTables.get(table);
              return Promise.resolve({ data: cfg?.insertResult ?? values, error: null });
            },
          }),
        };
      },
      writable: false,
    });

    // update — returns self so further .eq() chains work
    Object.defineProperty(self, 'update', {
      value: (values: unknown) => {
        resolvers.length = 0;
        resolvers.push(() => {
          const arr = updatedCalls.get(table) ?? [];
          arr.push(values as Record<string, unknown>);
          updatedCalls.set(table, arr);
          return { data: null, error: null };
        });
        return self;
      },
      writable: false,
    });

    return self;
  }

  return { createClient: () => ({ from: (t: string) => qb(t) }) };
});

// ----- test suite -----
let app: Express;

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://mock.example.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key-0000';
  process.env.DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
  process.env.NODE_ENV = 'test';
  const mod = await import('../server/index.js');
  app = mod.app;
});

beforeEach(() => {
  resetMockData();
  setMockData('profiles', { maybeSingle: { id: process.env.DEMO_USER_ID, display_name: 'Alex' } });
});

afterAll(() => { delete process.env.NODE_ENV; });

// ---- tests ----

describe('GET /api/practice/session', () => {
  test('returns active session + question', async () => {
    setMockData('practice_sessions', {
      maybeSingle: {
        id: 'session-1',
        user_id: process.env.DEMO_USER_ID,
        total_questions: 20, current_index: 5, score: 3,
        time_left_seconds: 600, status: 'active',
      },
    });
    setMockData('questions', {
      count: 4,
      single: {
        id: 'q-1', subject: '数学', title: '第 5 题', body: '题目内容',
        difficulty: '中等', options: [{ id: 'A', value: '1' }, { id: 'B', value: '2' }],
        correct_option: 'A', correct_answer: '1', explanation_steps: ['step1'], tags: ['tag1'],
      },
    });

    const res = await request(app).get('/api/practice/session');
    expect(res.status).toBe(200);
    expect(res.body.session.currentIndex).toBe(5);
    expect(res.body.session.totalQuestions).toBe(20);
    expect(res.body.session.status).toBe('active');
    expect(res.body.question.id).toBe('q-1');
  });
});

describe('POST /api/practice/submit', () => {
  const baseQ: Record<string, unknown> = {
    id: 'q-1', subject: '数学', title: '题', body: '内容',
    difficulty: '中等',
    options: [{ id: 'A', value: '正确' }, { id: 'B', value: '错误' }],
    correct_option: 'A', correct_answer: '正确',
    explanation_steps: ['步骤'], tags: ['tag1'],
  };

  test('19 -> 20: advances index, keeps active', async () => {
    setMockData('practice_sessions', {
      maybeSingle: {
        id: 's-19', user_id: process.env.DEMO_USER_ID,
        total_questions: 20, current_index: 19, score: 8,
        time_left_seconds: 300, status: 'active',
      },
    });
    setMockData('questions', { count: 4, single: baseQ });

    const res = await request(app).post('/api/practice/submit')
      .send({ questionId: 'q-1', selectedOption: 'A', scratchpad: '', isMarked: false, timeLeftSeconds: 200 });

    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body.currentIndex).toBe(20);
    expect(res.body.isSetComplete).toBe(false);
    expect(res.body.summary).toBeUndefined();

    const u = updatedCalls.get('practice_sessions');
    expect(u![0]).toMatchObject({ current_index: 20, score: 9, status: 'active' });
  });

  test('20th answer completes set', async () => {
    setMockData('practice_sessions', {
      maybeSingle: {
        id: 's-20', user_id: process.env.DEMO_USER_ID,
        total_questions: 20, current_index: 20, score: 12,
        time_left_seconds: 100, status: 'active',
      },
    });
    setMockData('questions', { count: 4, single: baseQ });

    const res = await request(app).post('/api/practice/submit')
      .send({ questionId: 'q-1', selectedOption: 'A', scratchpad: '', isMarked: false, timeLeftSeconds: 50 });

    expect(res.status).toBe(200);
    expect(res.body.isSetComplete).toBe(true);
    expect(res.body.summary.answeredCount).toBe(20);
    expect(res.body.summary.score).toBe(13);
    expect(res.body.summary.accuracy).toBe(65);

    const u = updatedCalls.get('practice_sessions');
    expect(u![0]).toMatchObject({ status: 'completed', score: 13 });
  });

  test('rejects mismatched questionId', async () => {
    setMockData('practice_sessions', {
      maybeSingle: {
        id: 's-1', user_id: process.env.DEMO_USER_ID,
        total_questions: 20, current_index: 3, score: 1,
        time_left_seconds: 500, status: 'active',
      },
    });
    setMockData('questions', { count: 4, single: { ...baseQ, id: 'q-session-3' } });

    const res = await request(app).post('/api/practice/submit')
      .send({ questionId: 'q-wrong', selectedOption: 'A', scratchpad: '', isMarked: false, timeLeftSeconds: 400 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/不匹配/);
  });
});

describe('POST /api/practice/next-set', () => {
  test('creates new active session at index 1', async () => {
    setMockData('practice_sessions', {
      insertResult: {
        id: 'new-s', user_id: process.env.DEMO_USER_ID,
        total_questions: 20, current_index: 1, score: 0,
        time_left_seconds: 765, status: 'active',
      },
    });
    setMockData('questions', {
      count: 4,
      single: {
        id: 'q-first', subject: '数学', title: '第 1 题', body: '新题',
        difficulty: '中等', options: [{ id: 'A', value: 'X' }, { id: 'B', value: 'Y' }],
        correct_option: 'A', correct_answer: 'X', explanation_steps: [], tags: [],
      },
    });

    const res = await request(app).post('/api/practice/next-set');
    expect(res.status).toBe(200);
    expect(res.body.session.currentIndex).toBe(1);
    expect(res.body.session.totalQuestions).toBe(20);
    expect(res.body.session.status).toBe('active');
    expect(res.body.session.score).toBe(0);
    expect(res.body.question.id).toBe('q-first');
  });
});

describe('GET /api/dashboard', () => {
  test('returns dashboard data', async () => {
    setMockData('activities', {
      list: [{ id: 'act-1', user_id: process.env.DEMO_USER_ID, type: 'quiz', title: '测试', subtitle: '昨天', score: 80 }],
    });
    setMockData('daily_insights', {
      maybeSingle: { id: 'ins-1', user_id: process.env.DEMO_USER_ID, title: '洞察', body: '建议', tags: ['算法'], suggested_action: '开始练习' },
    });
    setMockData('questions', { count: 4 });
    setMockData('answer_attempts', {
      list: [{ is_correct: true }, { is_correct: false }, { is_correct: true }],
    });

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.profile.displayName).toBe('Alex');
    expect(res.body.progress.completion).toBeGreaterThan(0);
    expect(res.body.recentActivities).toHaveLength(1);
    expect(res.body.insight).toBeDefined();
  });
});
