import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/marketing/sendgrid';

interface RankDrop {
  keyword: string;
  oldRank: number;
  newRank: number;
}

interface AlertPayload {
  scanId: string;
  businessId: string;
  drops: RankDrop[];
}

/**
 * POST /api/local-grid/alert
 * Called after a scheduled grid scan completes to notify the business owner
 * of any keywords that dropped more than 3 positions.
 *
 * Body: { scanId, businessId, drops: [{ keyword, oldRank, newRank }] }
 */
export async function POST(request: NextRequest) {
  // Auth check — require a valid session OR an internal service call
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Allow internal calls with the service role key in a header
  const serviceKey = request.headers.get('x-service-key');
  const isServiceCall = serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isServiceCall && (!user || authError)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as AlertPayload;
  const { scanId, businessId, drops } = body;

  if (!scanId || !businessId || !drops?.length) {
    return NextResponse.json({ error: 'scanId, businessId, and drops are required' }, { status: 400 });
  }

  // Only alert on drops > 3 positions
  const significantDrops = drops.filter((d) => d.newRank - d.oldRank > 3);
  if (significantDrops.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No drops exceeding 3 positions' });
  }

  // Look up business and owner email
  const { data: business } = await (supabase as any)
    .from('businesses')
    .select('name, user_id')
    .eq('id', businessId)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('email')
    .eq('id', business.user_id)
    .single();

  if (!profile?.email) {
    return NextResponse.json({ error: 'Business owner email not found' }, { status: 404 });
  }

  // Build email content
  const dropLines = significantDrops
    .map((d) => `  • "${d.keyword}": dropped from #${d.oldRank} to #${d.newRank} (−${d.newRank - d.oldRank} positions)`)
    .join('\n');

  const dropHtmlLines = significantDrops
    .map(
      (d) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${d.keyword}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">#${d.oldRank}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#dc2626;font-weight:600;">#${d.newRank}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#dc2626;">−${d.newRank - d.oldRank}</td>
        </tr>`,
    )
    .join('');

  const subject = `Ranking Alert: ${significantDrops.length} keyword${significantDrops.length > 1 ? 's' : ''} dropped for ${business.name}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#111827;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#ea580c;padding:24px 32px;">
      <div style="color:white;font-size:20px;font-weight:700;">${business.name}</div>
      <div style="color:#fed7aa;font-size:14px;margin-top:4px;">Local Grid Ranking Alert</div>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:16px;margin:0 0 24px;">
        Your latest scheduled grid scan detected <strong>${significantDrops.length} keyword${significantDrops.length > 1 ? 's' : ''}</strong> that dropped more than 3 positions compared to your previous scan.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Keyword</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Previous</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Current</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Change</th>
          </tr>
        </thead>
        <tbody>
          ${dropHtmlLines}
        </tbody>
      </table>
      <div style="margin-top:32px;padding:16px;background:#fff7ed;border-radius:6px;border:1px solid #fed7aa;">
        <p style="margin:0;font-size:14px;color:#92400e;">
          <strong>What to do:</strong> Log in to your ScorchLocal dashboard to view your full grid report and identify areas where competitor activity may have impacted your rankings.
        </p>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
        Scan ID: ${scanId} · This alert is sent automatically when rankings drop more than 3 positions.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Local Grid Ranking Alert — ${business.name}

Your latest scheduled grid scan detected ${significantDrops.length} keyword(s) that dropped more than 3 positions:

${dropLines}

Log in to your ScorchLocal dashboard to view your full grid report.

Scan ID: ${scanId}
  `.trim();

  try {
    await sendEmail({
      to: profile.email,
      from: { email: 'alerts@scorchlocal.com', name: 'ScorchLocal Alerts' },
      subject,
      html,
      text,
    });

    return NextResponse.json({ sent: true, recipient: profile.email, drops: significantDrops.length });
  } catch (err: any) {
    console.error('[local-grid/alert] Failed to send alert email:', err.message);
    return NextResponse.json({ error: 'Failed to send alert email', detail: err.message }, { status: 500 });
  }
}
