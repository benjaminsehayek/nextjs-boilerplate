import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const DFS_BASE = 'https://api.dataforseo.com';
const DFS_AUTH = Buffer.from(
  `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
).toString('base64');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_tier, subscription_status, scan_credits_used, scan_credits_limit')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
  }

  const path = pathArray.join('/');
  const dfsUrl = `${DFS_BASE}/${path}`;
  const body = await request.json();

  try {
    const dfsResponse = await fetch(dfsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DFS_AUTH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await dfsResponse.json();

    const cost = data.tasks?.reduce(
      (sum: number, t: { cost?: number }) => sum + (t.cost || 0), 0
    ) || 0;

    if (cost > 0) {
      await supabase.rpc('increment_scan_credits', { p_user_id: user.id, p_amount: 1 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('DataForSEO proxy error:', error);
    return NextResponse.json({ error: 'Failed to reach DataForSEO' }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = pathArray.join('/');
  const dfsUrl = `${DFS_BASE}/${path}`;

  try {
    const dfsResponse = await fetch(dfsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${DFS_AUTH}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await dfsResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('DataForSEO proxy error:', error);
    return NextResponse.json({ error: 'Failed to reach DataForSEO' }, { status: 502 });
  }
}
