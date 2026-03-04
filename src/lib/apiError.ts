import { NextResponse } from 'next/server';

export function apiError(
  message: string,
  status: number = 500,
  code?: string,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status, ...(headers ? { headers } : {}) }
  );
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}
