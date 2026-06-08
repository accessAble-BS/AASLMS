import { exchangeOAuthCodeForSession as exchange, hasOAuthCallbackParams } from '@aas/shared-ui';
import { supabase } from '@/lib/supabase';

export { hasOAuthCallbackParams };

export async function exchangeOAuthCodeForSession(): Promise<{ error: string | null }> {
  return exchange(supabase);
}
