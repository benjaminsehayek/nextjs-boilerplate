import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

  const body = await request.json();

  // Support both { messages } and simple { prompt } formats
  const messages = body.messages?.length
    ? body.messages
    : body.prompt
      ? [{ role: 'user', content: body.prompt }]
      : [];

  if (!messages.length) {
    return NextResponse.json({ error: 'messages or prompt required' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-6',
        max_tokens: body.max_tokens || body.maxTokens || 1024,
        temperature: body.temperature ?? 0.7,
        ...(body.system ? { system: body.system } : {}),
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
  } catch (error) {
    console.error('Claude proxy error:', error);
    return NextResponse.json({ error: 'Failed to reach Claude API' }, { status: 502 });
  }
}
