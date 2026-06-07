import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeOAuthCodeForSession } from '@/lib/auth-callback';
import { AuthLayout } from '@/components/layout/AuthLayout';
import '@/styles/layout.css';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const { error: exchangeError } = await exchangeOAuthCodeForSession();
      if (cancelled) return;

      if (exchangeError) {
        setError(exchangeError);
        return;
      }

      navigate('/dashboard', { replace: true });
    }

    void handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <AuthLayout>
        <div className="auth-card__body">
          <h2>Sign in</h2>
          <div className="alert alert-error">{error}</div>
          <a href="/" className="btn btn-secondary btn-block">
            Back to sign in
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card__body">
        <h2>Sign in</h2>
        <p>Completing sign-in…</p>
      </div>
    </AuthLayout>
  );
}
