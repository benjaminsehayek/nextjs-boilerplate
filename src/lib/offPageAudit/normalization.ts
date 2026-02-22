/** Normalize business name for comparison: lowercase, remove legal suffixes, strip punctuation */
export function normName(n: string): string {
  if (!n) return '';
  return n
    .toLowerCase()
    .replace(/\b(llc|inc|ltd|corp|co|company|incorporated|limited)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize phone: extract digits only */
export function normPhone(p: string): string {
  if (!p) return '';
  return p.replace(/\D/g, '');
}

/** Normalize address for comparison: lowercase, abbreviate common words, strip punctuation */
export function normAddr(a: string): string {
  if (!a) return '';
  return a
    .toLowerCase()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\broad\b/g, 'rd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bsuite\b/g, 'ste')
    .replace(/\bapartment\b/g, 'apt')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/\beast\b/g, 'e')
    .replace(/\bwest\b/g, 'w')
    .replace(/[,\.#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generate a dedup key for discovered locations */
export function locationDedupKey(name: string, address: string, city: string, state: string): string {
  const normAddress = normAddr(address).replace(/\s/g, '');
  if (normAddress.length > 10) return normAddress;
  return `${normName(name)}_${city.toLowerCase()}_${state.toLowerCase()}`;
}