import { Link, Outlet, useNavigate } from 'react-router-dom';
import { signOut, useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BrandLogo } from '@/components/BrandLogo';
import { IconButton } from '@/components/IconButton';
import '@/styles/layout.css';

export function DashboardLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();
  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email ??
    'Signed in';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="page-header-bar">
        <div className="app-header__brand">
          <Link to="/dashboard" aria-label="LMS home">
            <BrandLogo />
          </Link>
        </div>
        <div className="header-context">
          <p className="header-title">{displayName}</p>
          <h1 className="header-course-title">{pageTitle}</h1>
        </div>
        <div className="header-actions">
          <IconButton icon="sign-out" label="Sign out" onClick={() => void handleSignOut()} />
        </div>
      </header>
      <main className="app-main">
        <div className="content-panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
