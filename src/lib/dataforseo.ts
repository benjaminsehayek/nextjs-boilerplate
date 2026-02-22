export async function dfsCall<T = unknown>(
  endpoint: string,
  body: unknown[]
): Promise<T> {
  const path = endpoint.startsWith('/v3')
    ? endpoint.slice(1)
    : endpoint.startsWith('v3')
    ? endpoint
    : `v3/${endpoint}`;

  const response = await fetch(`/api/dataforseo/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error ${response.status}`);
  }

  const data = await response.json();

  if (data.status_code && data.status_code !== 20000) {
    throw new Error(data.status_message || 'DataForSEO error');
  }

  return data as T;
}

export async function dfsGet<T = unknown>(endpoint: string): Promise<T> {
  const path = endpoint.startsWith('/v3')
    ? endpoint.slice(1)
    : endpoint.startsWith('v3')
    ? endpoint
    : `v3/${endpoint}`;

  const response = await fetch(`/api/dataforseo/${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error ${response.status}`);
  }

  const data = await response.json();

  if (data.status_code && data.status_code !== 20000) {
    throw new Error(data.status_message || 'DataForSEO error');
  }

  return data as T;
}

export function cleanDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
}

export function fmtN(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
