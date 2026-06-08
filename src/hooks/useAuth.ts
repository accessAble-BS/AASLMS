import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  clearInternalSignedOutMarker,
  clearPkceFlowState,
  redirectToSignedOutLanding,
  signOutInternalAuth,
  subscribeInternalSessionSync,
} from '@aas/shared-core';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeSync = subscribeInternalSessionSync(supabase.auth, {
      onSessionLost: redirectToSignedOutLanding,
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_IN' && nextSession) {
        clearInternalSignedOutMarker();
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeSync();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  };
}

function getAuthCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export async function signInWithMicrosoft(): Promise<void> {
  clearPkceFlowState();
  clearInternalSignedOutMarker();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: getAuthCallbackUrl(),
      scopes: 'email openid profile',
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await signOutInternalAuth(supabase.auth);
}
