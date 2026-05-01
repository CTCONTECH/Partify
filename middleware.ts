import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES = new Set([
  '/',
  '/welcome',
  '/role-select',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
]);

function isStaticAsset(pathname: string) {
  return pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.');
}

function hasSupabaseEnv(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host')?.toLowerCase();
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isPartifyDomain = host === 'partify.africa' || host === 'www.partify.africa';

  if (isPartifyDomain && (forwardedProto === 'http' || request.nextUrl.protocol === 'http:')) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  if (isStaticAsset(pathname) || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // In mock/no-env deployments, skip auth gating.
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  // Public routes: if already logged in, send to role home.
  if (PUBLIC_ROUTES.has(pathname)) {
    if (!user) return response;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || user.user_metadata?.role;

    let target = role === 'supplier' ? '/supplier/dashboard' : '/client/home';

    // If supplier, check if they have a supplier record yet.
    if (role === 'supplier') {
      const { data: supplierRow } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (!supplierRow) target = '/supplier/onboarding';
    }

    if (pathname !== target) {
      return NextResponse.redirect(new URL(target, request.url));
    }
    return response;
  }

  // Protected routes require auth.
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;

  if (pathname.startsWith('/supplier') && role !== 'supplier' && role !== 'admin') {
    return NextResponse.redirect(new URL('/client/home', request.url));
  }

  if (pathname.startsWith('/client') && role === 'supplier') {
    return NextResponse.redirect(new URL('/supplier/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
