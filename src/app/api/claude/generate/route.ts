import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/apiError';

// Validate the expected request shape for Claude generate
const ClaudeGenerateSchema = z.looseObject({
  prompt: z.string().min(1).max(50000).optional(),
  messages: z.array(z.looseObject({})).optional(),
  systemPrompt: z.string().optional(),
  maxTokens: z.number().int().min(100).max(4096).optional(),
});

export const maxDuration = 60; // seconds — Vercel Pro / self-hosted

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  const parsed = ClaudeGenerateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError('Invalid request body', 400, 'VALIDATION_ERROR');
  }

  const body = parsed.data as Record<string, any>;

  // Support both { messages } and simple { prompt } formats
  const messages = body.messages?.length
    ? body.messages
    : body.prompt
      ? [{ role: 'user', content: body.prompt }]
      : [];

  if (!messages.length) {
    return NextResponse.json({ error: 'messages or prompt required' }, { status: 400 });
  }

  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 55_000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: abort.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // B16-10: Whitelist allowed models to prevent billing abuse
        model: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'].includes(body.model)
          ? body.model
          : 'claude-sonnet-4-6',
        max_tokens: Math.min(body.max_tokens || body.maxTokens || 1024, 4096),
        temperature: body.temperature ?? 0.7,
        // B13-10: Do NOT forward client-supplied system prompt — prevents prompt injection
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return NextResponse.json({ error: `API error ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    // Normalise: expose top-level `text` for callers that do data.text
    const text = data.content?.[0]?.text ?? '';
    return NextResponse.json({ ...data, text });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Generation timed out — try a shorter prompt' }, { status: 504 });
    }
    console.error('Claude proxy error:', error);
    return NextResponse.json({ error: 'Failed to reach Claude API' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
