import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Main app hostname (no www prefix). Used to detect custom domains.
const APP_HOSTNAME = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost')
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '');

export async function middleware(request: NextRequest) {
  // ── Custom domain rewrite (BEFORE auth check) ──────────────────────────────
  // Requests on custom business domains → rewrite to /sites/{businessSlug}/*
  const hostname = (request.headers.get('host') ?? '').replace(/^www\./, '').split(':')[0];
  const isMainDomain =
    hostname === APP_HOSTNAME ||
    hostname === 'localhost' ||
    hostname.endsWith('.vercel.app');

  if (!isMainDomain) {
    // Look up verified domain in DB (anon key is fine — domain table is not sensitive)
    const anonSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } },
    );

    const { data: domainRow } = await (anonSupabase as any)
      .from('business_domains')
      .select('business_id')
      .eq('domain', hostname)
      .eq('dns_verified', true)
      .single();

    if (domainRow?.business_id) {
      // Fetch the business slug (stored as business.domain field or fall back to id)
      const { data: biz } = await (anonSupabase as any)
        .from('businesses')
        .select('id, domain')
        .eq('id', domainRow.business_id)
        .single();

      if (biz) {
        const businessSlug = biz.domain
          ? biz.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0]
          : biz.id;
        const pathname = request.nextUrl.pathname;
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/sites/${businessSlug}${pathname === '/' ? '' : pathname}`;
        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes that require authentication
  const protectedPaths = [
    '/dashboard',
    '/site-audit',
    '/content-strategy',
    '/local-grid',
    '/off-page-audit',
    '/lead-intelligence',
    '/lead-database',
    '/settings',
    '/billing',
    '/onboarding',
  ];

  const isProtectedRoute = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );

  // Unauthenticated user on a protected route → send to landing/login page
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Authenticated user visiting root (landing page) → send to dashboard
  if (user && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Authenticated user visiting /login or /signup → send to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
