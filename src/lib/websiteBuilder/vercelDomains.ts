// Vercel Domains API — add/remove custom domains from the Vercel project.
//
// Required env vars:
//   VERCEL_API_TOKEN   — a Vercel API token with project write access
//   VERCEL_PROJECT_ID  — the Vercel project ID (found in Project Settings → General)
//
// Vercel docs: https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project

const VERCEL_API = 'https://api.vercel.com';

function headers() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function projectId() {
  return process.env.VERCEL_PROJECT_ID;
}

export interface VercelDomainResult {
  ok: boolean;
  alreadyExists?: boolean;
  error?: string;
}

/**
 * Register a custom domain with the Vercel project so Vercel will route
 * traffic for that hostname to this deployment.
 * Safe to call multiple times — if the domain already exists, returns ok=true.
 */
export async function addDomainToVercel(domain: string): Promise<VercelDomainResult> {
  const pid = projectId();
  if (!pid || !process.env.VERCEL_API_TOKEN) {
    console.warn('[vercelDomains] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set — skipping Vercel domain registration');
    return { ok: true }; // Non-fatal in dev / when env vars not configured
  }

  try {
    const res = await fetch(`${VERCEL_API}/v10/projects/${pid}/domains`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: domain }),
    });

    const data = await res.json();

    if (res.ok) {
      return { ok: true };
    }

    // 409 = domain already added to this project — treat as success
    if (res.status === 409) {
      return { ok: true, alreadyExists: true };
    }

    console.error('[vercelDomains] addDomain failed:', res.status, data);
    return { ok: false, error: data?.error?.message ?? `Vercel API error ${res.status}` };
  } catch (err: any) {
    console.error('[vercelDomains] addDomain threw:', err?.message);
    return { ok: false, error: err?.message };
  }
}

/**
 * Remove a custom domain from the Vercel project.
 * Called when a business domain is deleted or replaced.
 * Non-fatal if the domain was never registered (404 from Vercel → ok).
 */
export async function removeDomainFromVercel(domain: string): Promise<VercelDomainResult> {
  const pid = projectId();
  if (!pid || !process.env.VERCEL_API_TOKEN) {
    return { ok: true };
  }

  try {
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${pid}/domains/${encodeURIComponent(domain)}`,
      { method: 'DELETE', headers: headers() },
    );

    if (res.ok || res.status === 404) {
      return { ok: true };
    }

    const data = await res.json().catch(() => ({}));
    console.error('[vercelDomains] removeDomain failed:', res.status, data);
    return { ok: false, error: data?.error?.message ?? `Vercel API error ${res.status}` };
  } catch (err: any) {
    console.error('[vercelDomains] removeDomain threw:', err?.message);
    return { ok: false, error: err?.message };
  }
}
