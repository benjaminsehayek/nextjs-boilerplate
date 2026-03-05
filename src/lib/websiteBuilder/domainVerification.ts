// Domain verification utilities
// Checks DNS TXT record for the verification token

/**
 * Verify a domain by looking up a TXT DNS record.
 * The business must add a TXT record: _scorchlocal-verify.{domain} = {token}
 * We use Google's public DNS-over-HTTPS API (no key required).
 */
export async function verifyDomainTxt(domain: string, token: string): Promise<boolean> {
  const checkDomain = `_scorchlocal-verify.${domain}`;

  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(checkDomain)}&type=TXT`,
      {
        headers: { Accept: 'application/json' },
        // 10-second timeout
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) return false;

    const data: { Answer?: Array<{ data: string }> } = await res.json();
    const records = data.Answer ?? [];

    return records.some((record) => {
      // TXT records come back with surrounding quotes
      const value = record.data.replace(/^"|"$/g, '').trim();
      return value === token;
    });
  } catch {
    return false;
  }
}

/** Check if a CNAME points to our serving infrastructure */
export async function verifyCname(domain: string, expectedTarget: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) return false;

    const data: { Answer?: Array<{ data: string }> } = await res.json();
    const records = data.Answer ?? [];

    return records.some((record) => {
      const value = record.data.replace(/\.$/, '').toLowerCase();
      return value === expectedTarget.toLowerCase();
    });
  } catch {
    return false;
  }
}

/** Generate a cryptographically random verification token */
export function generateVerificationToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
