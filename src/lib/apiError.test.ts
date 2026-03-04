import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock next/server since we're in a Node test environment (not Next.js runtime)
vi.mock('next/server', () => {
  class MockNextResponse {
    body: string;
    status: number;
    constructor(body: string, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    async json() {
      return JSON.parse(this.body);
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(JSON.stringify(data), init);
    }
  }
  return { NextResponse: MockNextResponse };
});

describe('apiError', () => {
  let apiError: (message: string, status?: number, code?: string, headers?: Record<string, string>) => any;
  let apiSuccess: <T>(data: T, status?: number) => any;

  beforeAll(async () => {
    const mod = await import('./apiError');
    apiError = mod.apiError;
    apiSuccess = mod.apiSuccess;
  });

  it('apiError with status 400 returns response with status 400 and error message', async () => {
    const res = apiError('Not Found', 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Not Found');
  });

  it('apiError with status 500 and no code omits the code field', async () => {
    const res = apiError('Server Error', 500);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Server Error');
    expect(body.code).toBeUndefined();
  });

  it('apiError with code includes code in the response body', async () => {
    const res = apiError('Forbidden', 403, 'FORBIDDEN');
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
    expect(body.code).toBe('FORBIDDEN');
  });

  it('apiError defaults to status 500 when no status provided', async () => {
    const res = apiError('Oops');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Oops');
  });
});

describe('apiSuccess', () => {
  let apiSuccess: <T>(data: T, status?: number) => any;

  beforeAll(async () => {
    const mod = await import('./apiError');
    apiSuccess = mod.apiSuccess;
  });

  it('apiSuccess returns 200 and passes data directly to JSON body', async () => {
    const res = apiSuccess({ data: 1 });
    expect(res.status).toBe(200);
    const body = await res.json();
    // apiSuccess passes data as-is (no wrapping)
    expect(body).toEqual({ data: 1 });
  });

  it('apiSuccess with custom status returns that status', async () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.created).toBe(true);
  });

  it('apiSuccess with nested data object', async () => {
    const payload = { items: [1, 2, 3], total: 3 };
    const res = apiSuccess(payload);
    const body = await res.json();
    expect(body.items).toEqual([1, 2, 3]);
    expect(body.total).toBe(3);
  });
});
