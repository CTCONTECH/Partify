import { createClient } from '@/lib/supabase/client';

export type AppRole = 'client' | 'supplier' | 'admin';

export interface AuthContext {
  userId: string | null;
  email: string | null;
  role: AppRole | null;
}

export function getAuthRedirectUrl(path = '/login'): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

  if (configuredUrl) {
    return `${configuredUrl}${path}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  return path;
}

function hasSupabaseEnv(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function getSupabaseClient() {
  if (!hasSupabaseEnv()) return null;
  return createClient();
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { userId: null, email: null, role: null };
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return { userId: null, email: null, role: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    role: (profile?.role as AppRole | undefined) ?? ((user.user_metadata?.role as AppRole | undefined) ?? null),
  };
}

export async function upsertProfileForCurrentUser(profile: {
  role: AppRole;
  name: string;
  phone?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const user = userData.user;
  if (!user || !user.email) {
    throw new Error('No authenticated user found');
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      role: profile.role,
      name: profile.name,
      phone: profile.phone ?? null,
    });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}
