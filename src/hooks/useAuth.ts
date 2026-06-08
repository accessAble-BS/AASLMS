import { createInternalAuth } from '@aas/shared-ui';
import { supabase } from '@/lib/supabase';

const internalAuth = createInternalAuth({ supabase });

export const useAuth = internalAuth.useAuth;
export const signInWithMicrosoft = internalAuth.signInWithMicrosoft;
export const signOut = internalAuth.signOut;
