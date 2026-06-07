import { supabase } from '@/lib/supabase';

export function hasOAuthCallbackParams(search = window.location.search): boolean {
  const params = new URLSearchParams(search);
  return params.has('code') || params.has('error') || params.has('error_description');
}

export async function exchangeOAuthCodeForSession(): Promise<{ error: string | null }> {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('error_description') ?? params.get('error');
  if (authError) return { error: authError };

  const code = params.get('code');
  if (!code) {
    return { error: 'No authorization code in callback URL.' };
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (error.message.toLowerCase().includes('code verifier')) {
      return {
        error:
          'Sign-in must finish on the same URL you started from. Open the site using one hostname only (e.g. the .web.app link or your .internal subdomain), then sign in again.',
      };
    }
    return { error: error.message };
  }

  window.history.replaceState({}, '', '/auth/callback');
  return { error: null };
}
