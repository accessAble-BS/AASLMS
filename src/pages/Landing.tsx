import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { shouldShowSignedOutNotice, SIGNED_OUT_MESSAGE } from '@aas/shared-core';
import { signInWithMicrosoft, useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { MsSignInButton } from '@/components/MsSignInButton';
import '@/styles/layout.css';

export function Landing() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const signedOutNotice = shouldShowSignedOutNotice(location.search);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, loading, navigate]);

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithMicrosoft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__card">Loading…</div>
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card__body">
        <h1>Sign in</h1>
        <p>Use your organisation Microsoft account to continue.</p>
        {signedOutNotice && <div className="alert alert-error">{SIGNED_OUT_MESSAGE}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <MsSignInButton
          onClick={() => void handleSignIn()}
          disabled={signingIn}
          loading={signingIn}
        />
      </div>
    </AuthLayout>
  );
}
